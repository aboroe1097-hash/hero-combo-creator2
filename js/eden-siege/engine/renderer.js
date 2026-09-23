// three.js renderer for the siege arena.
//
// It is a reader: it never touches the simulation, it only draws whatever
// world.state currently holds. All animation that is purely cosmetic (sprite
// bobbing, camera smoothing, shake) lives here, which is why none of it can
// affect a run's determinism.
//
// Everything is pooled. Entities are reused sprites, not per-frame allocations,
// so a wave of forty units does not churn the garbage collector mid-fight.

import * as THREE from 'three';
import { createTextures } from './textures.js';
import { createVelo } from './velo.js';
import { ASSETS, FACTIONS, TOWER_ART } from '../data/theme.js';

const POOL = { units: 150, bolts: 120, pickups: 64, fx: 56 };

const QUALITY = {
  low: { pixelRatio: 1, shadows: false, ringFx: 24, shadowMap: 512, banners: false },
  medium: { pixelRatio: 1.5, shadows: true, ringFx: 40, shadowMap: 1024, banners: true },
  high: { pixelRatio: 2, shadows: true, ringFx: 56, shadowMap: 2048, banners: true },
};

export function createRenderer({ canvas, map, themeName = 'dark', quality = 'medium' }) {
  const settings = QUALITY[quality] || QUALITY.medium;
  const textures = createTextures();
  const loader = new THREE.TextureLoader();
  const iconCache = new Map();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality !== 'low',
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = settings.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, 16 / 9, 0.5, 160);

  const hemi = new THREE.HemisphereLight(0x8fbcff, 0x1b2436, 0.75);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xdfeaff, 1.15);
  key.position.set(-16, 26, 12);
  key.castShadow = settings.shadows;
  if (settings.shadows) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -30;
    key.shadow.camera.right = 30;
    key.shadow.camera.top = 30;
    key.shadow.camera.bottom = -30;
    key.shadow.camera.far = 90;
  }
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.4);
  rimLight.position.set(18, 12, -20);
  scene.add(rimLight);

  // ── static world ──────────────────────────────────────────────────────────
  const groundMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(map.size.w, map.size.d), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = settings.shadows;
  scene.add(ground);

  const staticGroup = new THREE.Group();
  scene.add(staticGroup);

  function addObstacle(box) {
    const material =
      box.texture === 'container'
        ? new THREE.MeshStandardMaterial({
            map: textures.container(box.label || 'VTS 1097'),
            roughness: 0.7,
            metalness: 0.35,
          })
        : new THREE.MeshStandardMaterial({
            map: textures[box.texture] || textures.stone,
            roughness: 0.9,
            metalness: 0.1,
          });
    const geometry = new THREE.BoxGeometry(box.w, box.h, box.d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(box.x, box.h / 2, box.z);
    mesh.castShadow = settings.shadows;
    mesh.receiveShadow = settings.shadows;
    staticGroup.add(mesh);
    // A darker cap makes height readable from the fixed camera angle.
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(box.w * 0.96, 0.14, box.d * 0.96),
      new THREE.MeshStandardMaterial({ color: 0x111a26, roughness: 1 })
    );
    cap.position.set(box.x, box.h + 0.07, box.z);
    staticGroup.add(cap);
  }

  const perimeter = new THREE.Group();
  staticGroup.add(perimeter);
  function buildPerimeter() {
    const thickness = 1.1;
    const height = 1.5;
    const wallTexture = map.id === 'ship' ? textures.deckWall : textures.stone;
    const material = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.9 });
    const halfW = map.size.w / 2;
    const halfD = map.size.d / 2;
    const specs = [
      { x: 0, z: -halfD, w: map.size.w + thickness * 2, d: thickness },
      { x: 0, z: halfD, w: map.size.w + thickness * 2, d: thickness },
      { x: -halfW, z: 0, w: thickness, d: map.size.d },
      { x: halfW, z: 0, w: thickness, d: map.size.d },
    ];
    for (const spec of specs) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.w, height, spec.d), material);
      mesh.position.set(spec.x, height / 2, spec.z);
      mesh.receiveShadow = settings.shadows;
      perimeter.add(mesh);
    }
  }

  function buildDecor() {
    for (const item of map.decor) {
      if (item.kind === 'crystal') {
        const geometry = new THREE.OctahedronGeometry(0.9 * (item.scale || 1), 0);
        const material = new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          emissive: 0x2b6f96,
          emissiveIntensity: 0.9,
          roughness: 0.25,
          metalness: 0.1,
          transparent: true,
          opacity: 0.92,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(item.x, 1.1 * (item.scale || 1), item.z);
        mesh.rotation.y = (item.x + item.z) * 0.35;
        staticGroup.add(mesh);
      } else if (item.kind === 'brazier') {
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.5, 1.1, 10),
          new THREE.MeshStandardMaterial({ color: 0x2a3546, roughness: 0.8 })
        );
        base.position.set(item.x, 0.55, item.z);
        staticGroup.add(base);
        const flame = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: textures.glowWhite,
            color: 0xfb923c,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        flame.position.set(item.x, 1.5, item.z);
        flame.scale.set(1.3, 1.3, 1);
        staticGroup.add(flame);
      } else if (item.kind === 'banner') {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x2c3648, roughness: 0.6, metalness: 0.4 })
        );
        pole.position.set(item.x, 2.1, item.z);
        staticGroup.add(pole);
        const cloth = new THREE.Mesh(
          new THREE.PlaneGeometry(1.4, 2.9),
          new THREE.MeshStandardMaterial({
            map: textures.banner(item.element),
            side: THREE.DoubleSide,
            roughness: 0.95,
          })
        );
        cloth.position.set(item.x + 0.75, 2.5, item.z);
        staticGroup.add(cloth);
      } else if (item.kind === 'pipe') {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(item.w / 2, item.w / 2, item.len, 12),
          new THREE.MeshStandardMaterial({ color: 0x5b6673, roughness: 0.6, metalness: 0.5 })
        );
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(item.x, 0.6, item.z);
        staticGroup.add(pipe);
      } else if (item.kind === 'railing') {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(item.w, 0.12, 0.12),
          new THREE.MeshStandardMaterial({ color: 0x8b98a6, roughness: 0.5, metalness: 0.6 })
        );
        rail.position.set(item.x, 1.05, item.z);
        if (item.rot) rail.rotation.y = item.rot;
        staticGroup.add(rail);
      } else if (item.kind === 'mast' || item.kind === 'lifeboat' || item.kind === 'ruin') {
        const shapes = {
          mast: { color: 0x6b5a45, radius: [0.16, 0.2], height: 8.5 },
          lifeboat: { color: 0x7fb3c9, radius: [0.9, 0.6], height: 0.9 },
          ruin: { color: 0x3d4a5e, radius: [1.1, 1.35], height: 2.6 },
        };
        const shape = shapes[item.kind];
        const scale = item.scale || 1;
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(shape.radius[0], shape.radius[1], shape.height * scale, 10),
          new THREE.MeshStandardMaterial({ color: shape.color, roughness: 0.75, metalness: 0.2 })
        );
        mesh.position.set(item.x, (shape.height * scale) / 2, item.z);
        staticGroup.add(mesh);
      }
    }
  }

  buildPerimeter();
  for (const box of map.obstacles) addObstacle(box);
  buildDecor();

  // ── the stronghold ────────────────────────────────────────────────────────
  const core = new THREE.Group();
  core.position.set(map.core.x, 0, map.core.z);
  scene.add(core);
  const coreRing = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.ringNeutral,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    })
  );
  coreRing.scale.set(map.core.radius * 2.1, map.core.radius * 2.1, 1);
  coreRing.position.y = 0.08;
  core.add(coreRing);

  // The stronghold is deliberately a low plinth with a floating ward crystal.
  // A tall keep would sit between the camera and the arena — the camera trails
  // the player, and the stronghold is behind them — and hide the fight.
  const coreStone = new THREE.MeshStandardMaterial({ color: 0x44536a, roughness: 0.85 });
  const coreGlowMaterial = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x7dd3fc,
    emissiveIntensity: 1.3,
    roughness: 0.3,
  });
  const coreBody =
    map.core.kind === 'bridge'
      ? new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.9, 4.6), coreStone)
      : new THREE.Mesh(new THREE.CylinderGeometry(map.core.radius, map.core.radius * 1.18, 1.0, 16), coreStone);
  coreBody.position.y = map.core.kind === 'bridge' ? 0.45 : 0.5;
  coreBody.castShadow = settings.shadows;
  coreBody.receiveShadow = settings.shadows;
  core.add(coreBody);

  // Four pillars define the warding circle, so the plinth still reads as a
  // structure with height without becoming a wall in front of the lens.
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.1, 0.42), coreStone);
    pillar.position.set(px * (map.core.radius * 0.78), 1.05, pz * (map.core.radius * 0.78));
    pillar.castShadow = settings.shadows;
    core.add(pillar);
  }

  const coreCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), coreGlowMaterial);
  coreCrystal.position.y = 2.6;
  core.add(coreCrystal);

  // Two banners, one per wing, on the flanks of the stronghold so they state
  // the theme without standing in the player's sight line.
  for (const [index, element] of ['ice', 'fire'].entries()) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x2c3648, roughness: 0.6, metalness: 0.4 })
    );
    pole.position.set(index ? 4.6 : -4.6, 2.3, 0);
    core.add(pole);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 3.1),
      new THREE.MeshStandardMaterial({
        map: textures.banner(element),
        side: THREE.DoubleSide,
        roughness: 0.9,
      })
    );
    banner.position.set(index ? 5.35 : -5.35, 2.6, 0);
    core.add(banner);
  }

  // ── sockets ───────────────────────────────────────────────────────────────
  // Flat ring geometry, not a billboard: a real ring keeps its shape from the
  // camera angle and reads as a place on the ground you can build on.
  const socketGeometry = new THREE.RingGeometry(0.95, 1.2, 28);
  const socketMaterial = new THREE.MeshBasicMaterial({
    color: 0xbfe9ff,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const socketRings = map.sockets.map((socket) => {
    const ring = new THREE.Mesh(socketGeometry, socketMaterial.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(socket.x, 0.05, socket.z);
    scene.add(ring);
    return ring;
  });

  // ── pooled sprites ────────────────────────────────────────────────────────
  function createPool(count) {
    const sprites = [];
    for (let index = 0; index < count; index += 1) {
      const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      scene.add(sprite);
      sprites.push(sprite);
    }
    return { sprites, used: 0 };
  }

  const unitIcons = createPool(POOL.units);
  const unitRings = createPool(POOL.units);
  const bolts = createPool(POOL.bolts);
  const pickups = createPool(POOL.pickups);
  const fxPool = createPool(POOL.fx);

  function resetPool(pool) {
    pool.used = 0;
  }

  function take(pool, { texture, color, position, scale, rotation = 0, opacity = 1, additive = false }) {
    if (pool.used >= pool.sprites.length) return null;
    const sprite = pool.sprites[pool.used];
    pool.used += 1;
    sprite.visible = true;
    if (texture && sprite.material.map !== texture) {
      sprite.material.map = texture;
      sprite.material.needsUpdate = true;
    }
    sprite.material.color.set(color);
    sprite.material.opacity = opacity;
    sprite.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    sprite.material.rotation = rotation;
    sprite.position.set(position.x, position.y, position.z);
    sprite.scale.set(scale.x, scale.y, 1);
    return sprite;
  }

  function hideTail(pool) {
    for (let index = pool.used; index < pool.sprites.length; index += 1) {
      pool.sprites[index].visible = false;
    }
  }

  function icon(url) {
    if (!url) return textures.glowWhite;
    if (iconCache.has(url)) return iconCache.get(url);
    const texture = loader.load(url, (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.minFilter = THREE.LinearFilter;
      loaded.generateMipmaps = false;
    });
    iconCache.set(url, texture);
    return texture;
  }

  // Preload the art the wave table can ask for, so a run does not pop in.
  for (const color of ['blue', 'purple']) {
    for (const kind of ['ranger', 'cavalry', 'dreadnought']) {
      for (let tier = 1; tier <= 4; tier += 1) icon(ASSETS.unitIcon(color, kind, tier));
    }
  }
  for (const color of ['blue', 'gold', 'purple']) {
    for (const type of ASSETS.dropTypes) icon(ASSETS.materialIcon(color, type));
  }
  // The hero's own art is no longer drawn in the arena — Velo is the avatar —
  // so the hero skin is identified in the HUD instead of loaded as a texture.

  // ── actors: real 3D bodies, drawn with instanced meshes ───────────────────
  //
  // Units used to be flat billboards, which made a WebGL arena read as a 2D
  // board. Each unit is now a small low-poly body — torso, head and a
  // kind-specific mount or shoulder plate — built once per part type and drawn
  // as a single instanced mesh, so a wave of forty units costs four draw calls
  // and still turns to face where it is walking.
  //
  // The part offsets are baked into the geometry, so every part of one unit
  // shares that unit's instance matrix: position at its feet, rotation = its
  // facing, uniform scale = its kind.
  const TIER_TRIM = [0x9aa7b8, 0x74c69d, 0x7dd3fc, 0xf5c451, 0xa78bfa];
  const FACTION_BODY = { ice: 0x3f6f9c, fire: 0x9c4a2a };

  function translated(geometry, y) {
    geometry.translate(0, y, 0);
    return geometry;
  }

  const actorParts = {
    torso: translated(new THREE.CylinderGeometry(0.3, 0.44, 0.92, 8), 0.5),
    head: translated(new THREE.SphereGeometry(0.24, 10, 8), 1.12),
    mount: translated(new THREE.BoxGeometry(0.5, 0.46, 1.15), 0.26),
    shoulders: translated(new THREE.BoxGeometry(1.0, 0.2, 0.6), 1.0),
  };

  function createInstanced(geometry, count) {
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.62,
      metalness: 0.28,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = settings.shadows;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.count = 0;
    scene.add(mesh);
    return mesh;
  }

  const actorTorso = createInstanced(actorParts.torso, POOL.units);
  const actorHead = createInstanced(actorParts.head, POOL.units);
  const actorMount = createInstanced(actorParts.mount, POOL.units);
  const actorShoulders = createInstanced(actorParts.shoulders, POOL.units);

  const actorMatrix = new THREE.Matrix4();
  const actorPosition = new THREE.Vector3();
  const actorQuaternion = new THREE.Quaternion();
  const actorScale = new THREE.Vector3();
  const ACTOR_UP = new THREE.Vector3(0, 1, 0);
  const actorColor = new THREE.Color();

  function actorScaleFor(kind) {
    if (kind === 'dreadnought') return 1.5;
    if (kind === 'cavalry') return 1.12;
    return 1;
  }

  // ── particles: drifting snow on the ramparts, spray on the deck ───────────
  const particleCount = quality === 'low' ? 120 : 320;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleDrift = new Float32Array(particleCount);
  for (let index = 0; index < particleCount; index += 1) {
    particlePositions[index * 3] = (Math.random() - 0.5) * 70;
    particlePositions[index * 3 + 1] = Math.random() * 26;
    particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 70;
    particleDrift[index] = 1.2 + Math.random() * 1.8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.19,
    color: map.id === 'ship' ? 0xbfe0ff : 0xe6f2ff,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  scene.add(particles);

  // ── player rig ────────────────────────────────────────────────────────────
  const playerShadow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textures.shadow, transparent: true, depthWrite: false, opacity: 0.7 })
  );
  playerShadow.scale.set(2.1, 1.1, 1);
  playerShadow.position.y = 0.03;
  scene.add(playerShadow);
  const playerRing = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: textures.ringIce,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    })
  );
  playerRing.scale.set(3.1, 3.1, 1);
  playerRing.position.y = 0.05;
  scene.add(playerRing);

  // The hero is Velo — the project's own mascot, modelled from primitives in
  // engine/velo.js — instead of a flat skin portrait pasted above a body.
  const velo = createVelo({ element: 'ice' });
  velo.group.scale.setScalar(1.15);
  scene.add(velo.group);

  // ── tower rigs ────────────────────────────────────────────────────────────
  const towerRigs = new Map();

  function buildTowerRig(kind) {
    const art = TOWER_ART[kind] || TOWER_ART.frost;
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 1.05, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: art.body, roughness: 0.8 })
    );
    base.position.y = 0.35;
    base.castShadow = settings.shadows;
    group.add(base);

    if (art.shape === 'spire') {
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.72, 2.5, 8),
        new THREE.MeshStandardMaterial({
          color: art.trim,
          emissive: art.emissive,
          emissiveIntensity: 0.6,
          roughness: 0.4,
        })
      );
      spire.position.y = 1.9;
      group.add(spire);
    } else {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.5, 0.3),
        new THREE.MeshStandardMaterial({ color: art.body, roughness: 0.7 })
      );
      post.position.y = 1.1;
      group.add(post);
      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.52, 12, 10),
        new THREE.MeshStandardMaterial({
          color: art.trim,
          emissive: art.emissive,
          emissiveIntensity: 0.9,
          roughness: 0.35,
        })
      );
      bowl.position.y = 2;
      group.add(bowl);
    }
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: kind === 'frost' ? textures.ringIce : textures.ringFire,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55,
      })
    );
    halo.position.y = 0.07;
    halo.scale.set(3.4, 3.4, 1);
    group.add(halo);
    return group;
  }

  function syncTowers(state) {
    for (const tower of state.towers) {
      let rig = towerRigs.get(tower.socket);
      if (!rig) {
        rig = { group: buildTowerRig(tower.kind), pips: new THREE.Group() };
        rig.group.add(rig.pips);
        rig.group.position.set(tower.x, 0, tower.z);
        scene.add(rig.group);
        towerRigs.set(tower.socket, rig);
      }
      rig.group.children.forEach((child) => {
        if (child.isMesh) child.rotation.y = tower.angle;
      });
      const pipCount = rig.pips.children.length;
      for (let level = pipCount; level < tower.level - 1; level += 1) {
        const pip = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.22, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xf5c451, emissive: 0x8a6a1f, emissiveIntensity: 0.7 })
        );
        pip.position.set(0.9 + level * 0.34, 0.5, 0);
        rig.pips.add(pip);
      }
    }
    for (const [socketIndex, rig] of towerRigs) {
      const alive = state.towers.some((tower) => tower.socket === socketIndex);
      if (!alive) {
        scene.remove(rig.group);
        towerRigs.delete(socketIndex);
      }
    }
  }

  // ── camera ────────────────────────────────────────────────────────────────
  const cameraTarget = new THREE.Vector3();
  const desired = new THREE.Vector3();
  // Three-quarter view: steep enough to see over the stronghold, shallow enough
  // that bodies, walls and pillars show their height and the sky sits at the
  // top of the frame. A top-down camera flattens a WebGL scene into a 2D board.
  const CAM = { height: 10.5, back: 10.5, lookY: 1.45 };
  let shakeMs = 0;
  let shakeAmount = 0;
  let reducedMotion = false;
  let clockMs = 0;

  function cameraShake(amount, ms) {
    if (reducedMotion) return;
    shakeAmount = Math.max(shakeAmount, amount);
    shakeMs = Math.max(shakeMs, ms);
  }

  function applyTheme(name) {
    const palette = map.palette[name] || map.palette.dark;
    scene.background = new THREE.Color(palette.sky);
    scene.fog = new THREE.Fog(palette.fog, palette.fogNear, palette.fogFar);
    groundMaterial.map = textures[palette.groundTexture] || textures.snowstone;
    groundMaterial.needsUpdate = true;
    hemi.color.set(palette.hemiSky);
    hemi.groundColor.set(palette.hemiGround);
    key.color.set(palette.key);
    rimLight.color.set(name === 'light' ? 0x9fd0ff : 0x7dd3fc);
  }

  applyTheme(themeName);

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function elementColor(element) {
    return element === 'fire' ? 0xfb923c : 0x7dd3fc;
  }

  function render(state, dtMs) {
    clockMs += dtMs;
    resetPool(unitIcons);
    resetPool(unitRings);
    resetPool(bolts);
    resetPool(pickups);
    resetPool(fxPool);

    const bob = reducedMotion ? 0 : 1;

    // Enemies: a 3D body per unit, drawn with four instanced meshes, plus the
    // wing ring on the ground and (at sane quality levels) their RoC troop icon
    // as a small banner so the unit type is recognisable at a glance.
    let torsoCount = 0;
    let mountCount = 0;
    let shoulderCount = 0;
    for (const unit of state.units) {
      const faction = FACTIONS[unit.element] || FACTIONS.ice;
      const scale = actorScaleFor(unit.kind);
      const facing = unit.facing || 0;
      actorMatrix.compose(
        actorPosition.set(unit.x, 0, unit.z),
        actorQuaternion.setFromAxisAngle(ACTOR_UP, facing),
        actorScale.set(scale, scale, scale)
      );
      const flash = unit.hitFlashMs > 0;
      actorTorso.setMatrixAt(torsoCount, actorMatrix);
      actorTorso.setColorAt(
        torsoCount,
        actorColor.setHex(flash ? 0xffffff : FACTION_BODY[unit.element] || FACTION_BODY.ice)
      );
      actorHead.setMatrixAt(torsoCount, actorMatrix);
      actorHead.setColorAt(torsoCount, actorColor.setHex(flash ? 0xffd9d9 : 0xd8c7ad));
      torsoCount += 1;

      const trim = TIER_TRIM[Math.min(TIER_TRIM.length - 1, unit.tier)];
      if (unit.kind === 'cavalry') {
        actorMount.setMatrixAt(mountCount, actorMatrix);
        actorMount.setColorAt(mountCount, actorColor.setHex(flash ? 0xffffff : trim));
        mountCount += 1;
      } else if (unit.kind === 'dreadnought') {
        actorShoulders.setMatrixAt(shoulderCount, actorMatrix);
        actorShoulders.setColorAt(shoulderCount, actorColor.setHex(flash ? 0xffffff : trim));
        shoulderCount += 1;
      }

      const ringScale = unit.radius * 3.4;
      take(unitRings, {
        texture: unit.element === 'fire' ? textures.ringFire : textures.ringIce,
        color: 0xffffff,
        position: { x: unit.x, y: 0.04, z: unit.z },
        scale: { x: ringScale * 1.45, y: ringScale * 1.45 },
        opacity: unit.slowMs > 0 ? 0.95 : 0.5,
        additive: true,
      });
      if (settings.banners) {
        const bannerScale = unit.radius * 1.9;
        take(unitIcons, {
          texture: icon(ASSETS.unitIcon(faction.unitColor, unit.kind, unit.tier)),
          color: flash ? 0xffd9d9 : 0xffffff,
          position: {
            x: unit.x,
            y: 1.85 * actorScaleFor(unit.kind) + Math.sin(clockMs / 420 + unit.id) * 0.05 * bob,
            z: unit.z,
          },
          scale: { x: bannerScale, y: bannerScale },
          opacity: 0.92,
        });
      }
    }
    hideTail(unitIcons);
    hideTail(unitRings);
    actorTorso.count = torsoCount;
    actorHead.count = torsoCount;
    actorMount.count = mountCount;
    actorShoulders.count = shoulderCount;
    actorTorso.instanceMatrix.needsUpdate = true;
    actorHead.instanceMatrix.needsUpdate = true;
    actorMount.instanceMatrix.needsUpdate = true;
    actorShoulders.instanceMatrix.needsUpdate = true;
    if (actorTorso.instanceColor) actorTorso.instanceColor.needsUpdate = true;
    if (actorHead.instanceColor) actorHead.instanceColor.needsUpdate = true;
    if (actorMount.instanceColor) actorMount.instanceColor.needsUpdate = true;
    if (actorShoulders.instanceColor) actorShoulders.instanceColor.needsUpdate = true;

    // Projectiles
    for (const bolt of state.projectiles) {
      const boost = bolt.owner === 'player' ? 1.35 : 1;
      take(bolts, {
        texture: textures.glowWhite,
        color: elementColor(bolt.element),
        position: { x: bolt.x, y: 0.85, z: bolt.z },
        scale: { x: 1.15 * boost + bolt.splash * 0.4, y: 1.15 * boost + bolt.splash * 0.4 },
        opacity: 0.95,
        additive: true,
      });
    }
    hideTail(bolts);

    // Loot
    for (const pickup of state.pickups) {
      const fade = pickup.ttlMs < 2500 ? Math.max(0.25, pickup.ttlMs / 2500) : 1;
      take(pickups, {
        texture: icon(ASSETS.materialIcon(pickup.color, pickup.type)),
        color: 0xffffff,
        position: { x: pickup.x, y: 0.75 + Math.sin(clockMs / 320 + pickup.id) * 0.12 * bob, z: pickup.z },
        scale: { x: 0.95, y: 0.95 },
        opacity: fade,
      });
    }
    hideTail(pickups);

    // Effects
    let fxUsed = 0;
    for (const effect of state.fx) {
      const life = 1 - effect.ttlMs / effect.maxTtlMs;
      if (effect.kind !== 'nova' && fxUsed >= settings.ringFx) continue;
      fxUsed += 1;
      const size =
        effect.kind === 'nova'
          ? effect.scale * (0.5 + life * 0.55)
          : effect.scale * (0.7 + life * 0.9);
      take(fxPool, {
        texture: effect.element === 'fire' ? textures.ringFire : textures.ringIce,
        color: 0xffffff,
        position: { x: effect.x, y: effect.kind === 'nova' ? 1.1 : 0.5 + life * 0.9, z: effect.z },
        scale: { x: size * 2, y: size * 2 },
        opacity: Math.max(0, 1 - life),
        additive: true,
      });
    }
    hideTail(fxPool);

    // Player
    const player = state.player;
    const alive = player.alive;
    const playerColor = elementColor(player.element);
    playerShadow.visible = alive;
    playerShadow.position.set(player.x, 0.03, player.z);
    playerRing.visible = alive;
    playerRing.material.map = player.element === 'fire' ? textures.ringFire : textures.ringIce;
    playerRing.material.needsUpdate = true;
    playerRing.position.set(player.x, 0.06, player.z);
    playerRing.material.opacity = player.slowMs > 0 ? 0.55 : 0.95;

    velo.group.visible = alive;
    velo.group.position.set(player.x, 0, player.z);
    velo.group.rotation.y = player.facing || 0;
    velo.setElement(player.element);
    velo.setHitFlash(player.hitFlashMs > 0);
    const moving = Math.hypot(player.vx || 0, player.vz || 0) > 0.6;
    velo.update(dtMs, { moving, reducedMotion });

    // Weather: drifting snow on the ramparts, spray on the deck. Purely
    // cosmetic, so it never touches the simulation.
    const drift = dtMs / 1000;
    const positions = particleGeometry.attributes.position.array;
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3 + 1] -= particleDrift[index] * drift;
      positions[index * 3] += Math.sin(clockMs / 1400 + index) * 0.01;
      if (positions[index * 3 + 1] < 0) {
        positions[index * 3 + 1] = 26;
        positions[index * 3] = player.x + (Math.random() - 0.5) * 44;
        positions[index * 3 + 2] = player.z + (Math.random() - 0.5) * 44;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;

    // The hero carries their wing colour as rim light, so they read as the
    // player even in a crowd of units.
    rimLight.color.set(playerColor);

    // Sockets: a free socket pulses as an invitation, an occupied one goes
    // quiet because the tower itself now marks the spot.
    socketRings.forEach((sprite, index) => {
      const socketData = state.sockets[index];
      if (!socketData) {
        sprite.visible = false;
        return;
      }
      sprite.visible = true;
      if (socketData.occupant) {
        sprite.material.opacity = 0.07;
        return;
      }
      sprite.material.opacity = 0.3 + Math.sin(clockMs / 520 + index) * 0.13 * bob;
    });

    // Stronghold damage state
    const hpRatio = Math.max(0, state.core.hp / state.core.maxHp);
    coreCrystal.rotation.y += (dtMs / 1000) * 0.6;
    coreGlowMaterial.color.setHex(hpRatio > 0.5 ? 0x7dd3fc : hpRatio > 0.25 ? 0xf5c451 : 0xef4444);
    coreGlowMaterial.emissive.setHex(hpRatio > 0.5 ? 0x7dd3fc : hpRatio > 0.25 ? 0xf5c451 : 0xef4444);
    coreRing.material.opacity = state.core.flashMs > 0 ? 1 : 0.55 + hpRatio * 0.3;
    core.position.y = state.core.flashMs > 0 && !reducedMotion ? Math.sin(clockMs / 40) * 0.06 : 0;

    syncTowers(state);

    // Camera: follows the player, never the other way round.
    if (shakeMs > 0) {
      shakeMs -= dtMs;
      if (shakeMs <= 0) shakeAmount = 0;
    }
    const shakeX = shakeAmount * Math.sin(clockMs / 26) * Math.min(1, shakeMs / 160);
    const shakeZ = shakeAmount * Math.cos(clockMs / 31) * Math.min(1, shakeMs / 160);
    const focusX = state.player.x;
    const focusZ = state.player.z;
    desired.set(focusX + shakeX, CAM.height, focusZ + CAM.back + shakeZ);
    const smoothing = 1 - Math.pow(0.0015, dtMs / 1000);
    camera.position.lerp(desired, smoothing);
    cameraTarget.set(focusX + shakeX * 0.5, CAM.lookY, focusZ + shakeZ * 0.5);
    camera.lookAt(cameraTarget);

    renderer.render(scene, camera);
  }

  // Screen-space pick for the tower sockets: project each socket to normalised
  // device coordinates and take the nearest within a thumb-sized radius. A real
  // Raycaster would fight the sprite billboards for no benefit here.
  const pickPoint = new THREE.Vector3();
  function socketAtScreen(clientX, clientY, rect, state) {
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    let bestIndex = null;
    let bestDistance = 0.085;
    for (const socket of state.sockets) {
      pickPoint.set(socket.x, 0.1, socket.z).project(camera);
      const distance = Math.hypot(pickPoint.x - ndcX, pickPoint.y - ndcY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = socket.index;
      }
    }
    return bestIndex;
  }

  return {
    kind: 'webgl',
    render,
    socketAtScreen,
    resize,
    setTheme: applyTheme,
    setReducedMotion: (value) => {
      reducedMotion = Boolean(value);
      if (reducedMotion) {
        shakeMs = 0;
        shakeAmount = 0;
      }
    },
    shake: cameraShake,
    dispose() {
      for (const texture of Object.values(textures)) {
        if (texture && texture.dispose) texture.dispose();
      }
      for (const texture of iconCache.values()) texture.dispose?.();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            material.map?.dispose?.();
            material.dispose();
          });
        }
      });
      renderer.dispose();
    },
  };
}
