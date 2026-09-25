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

const POOL = { units: 150, bolts: 120, pickups: 64, fx: 56, sparks: 160, shields: 48, telegraphs: 4 };

const QUALITY = {
  low: { pixelRatio: 1, shadows: false, ringFx: 24, shadowMap: 512, banners: false, sparks: 60 },
  medium: { pixelRatio: 1.5, shadows: true, ringFx: 40, shadowMap: 1024, banners: true, sparks: 120 },
  high: { pixelRatio: 2, shadows: true, ringFx: 56, shadowMap: 2048, banners: true, sparks: 160 },
};

const MODIFIER_RING = { swift: 0xd9f99d, armored: 0xcbd5e1, shielded: 0xe0f2fe };

export function createRenderer({ canvas, map, themeName = 'dark', quality = 'medium' }) {
  const settings = { ...(QUALITY[quality] || QUALITY.medium) };
  const textures = createTextures();
  const loader = new THREE.TextureLoader();
  const iconCache = new Map();

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality !== 'low',
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
  const shieldPool = createPool(POOL.shields);

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
    // Armoured units wear a flat-topped helm, readable from the camera angle.
    helm: translated(new THREE.CylinderGeometry(0.27, 0.3, 0.26, 8), 1.24),
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
  const actorHelm = createInstanced(actorParts.helm, POOL.units);

  const actorMatrix = new THREE.Matrix4();
  const actorPosition = new THREE.Vector3();
  const actorQuaternion = new THREE.Quaternion();
  const actorScale = new THREE.Vector3();
  const ACTOR_UP = new THREE.Vector3(0, 1, 0);
  const actorColor = new THREE.Color();

  function actorScaleFor(kind) {
    if (kind === 'warlord') return 2.3;
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

  // ── hit sparks: cosmetic particles that never touch the simulation ─────────
  // Ice throws pale shards that fall; fire throws embers that rise. A crit
  // throws more of them, whiter.
  const sparkPool = createPool(POOL.sparks);
  const sparks = [];
  function spark(x, z, element, { count = 5, crit = false, y = 0.9, speed = 4.5 } = {}) {
    const budget = Math.max(0, settings.sparks - sparks.length);
    const total = Math.min(budget, crit ? count * 2 : count);
    for (let index = 0; index < total; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.45 + Math.random() * 0.7);
      const fire = element === 'fire';
      sparks.push({
        x,
        y,
        z,
        vx: Math.cos(angle) * velocity,
        vy: fire ? 1.5 + Math.random() * 2.5 : 2.5 + Math.random() * 2,
        vz: Math.sin(angle) * velocity,
        gravity: fire ? -1.5 : 12,
        life: 0,
        max: 260 + Math.random() * 220,
        color: crit ? 0xffffff : fire ? (Math.random() < 0.5 ? 0xfb923c : 0xf5c451) : Math.random() < 0.5 ? 0x7dd3fc : 0xe0f2fe,
        size: (crit ? 0.42 : 0.3) * (0.7 + Math.random() * 0.6),
      });
    }
  }

  // ── boss telegraph: a flat ring plus a disc that fills as the slam nears ───
  const telegraphRingGeometry = new THREE.RingGeometry(0.93, 1, 48);
  const telegraphDiscGeometry = new THREE.CircleGeometry(1, 48);
  const telegraphs = [];
  for (let index = 0; index < POOL.telegraphs; index += 1) {
    const ring = new THREE.Mesh(
      telegraphRingGeometry,
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })
    );
    const disc = new THREE.Mesh(
      telegraphDiscGeometry,
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
    );
    for (const mesh of [ring, disc]) {
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
    }
    telegraphs.push({ ring, disc });
  }

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
  const towerGeometryCache = new Map();

  function towerGeometry(resources, key, create) {
    let entry = towerGeometryCache.get(key);
    if (!entry) {
      entry = { key, geometry: create(), references: 0 };
      towerGeometryCache.set(key, entry);
    }
    if (!resources.geometries.has(entry)) {
      resources.geometries.add(entry);
      entry.references += 1;
    }
    return entry.geometry;
  }

  function towerMaterial(resources, options) {
    const material = new THREE.MeshStandardMaterial(options);
    resources.materials.add(material);
    return material;
  }

  function disposeTowerRig(rig) {
    scene.remove(rig.group);
    for (const entry of rig.resources.geometries) {
      entry.references -= 1;
      if (entry.references === 0) {
        entry.geometry.dispose();
        towerGeometryCache.delete(entry.key);
      }
    }
    for (const material of rig.resources.materials) material.dispose();
  }

  // Every tier changes the silhouette: L2 adds a trim collar, L3 raises the
  // crown and crenellates the base, L4 adds orbiting shards, L5 turns gold and
  // grows a crown jewel. The lane tells you how far a tower has been pushed.
  function buildTowerTiers(group, kind, level, resources, art) {
    const tall = level >= 3 ? 1.25 : 1;
    if (level >= 2) {
      const collar = new THREE.Mesh(
        towerGeometry(resources, 'collar', () => new THREE.TorusGeometry(0.8, 0.09, 8, 20)),
        towerMaterial(resources, { color: level >= 5 ? 0xf5c451 : art.trim, emissive: art.emissive, emissiveIntensity: 0.4, roughness: 0.4, metalness: 0.5 })
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.78;
      group.add(collar);
    }
    if (level >= 3) {
      for (let index = 0; index < 6; index += 1) {
        const merlon = new THREE.Mesh(
          towerGeometry(resources, 'merlon', () => new THREE.BoxGeometry(0.26, 0.3, 0.26)),
          towerMaterial(resources, { color: art.body, roughness: 0.8 })
        );
        const angle = (index / 6) * Math.PI * 2;
        merlon.position.set(Math.cos(angle) * 0.92, 0.82, Math.sin(angle) * 0.92);
        group.add(merlon);
      }
    }
    if (level >= 4) {
      const orbit = new THREE.Group();
      orbit.name = 'orbit';
      orbit.position.y = 2.2 * tall;
      for (let index = 0; index < 3; index += 1) {
        const shard = new THREE.Mesh(
          towerGeometry(resources, 'shard', () => new THREE.OctahedronGeometry(0.2, 0)),
          towerMaterial(resources, { color: art.trim, emissive: art.emissive, emissiveIntensity: 1.2, roughness: 0.25 })
        );
        const angle = (index / 3) * Math.PI * 2;
        shard.position.set(Math.cos(angle) * 1.05, 0, Math.sin(angle) * 1.05);
        orbit.add(shard);
      }
      group.add(orbit);
    }
    if (level >= 5) {
      const jewel = new THREE.Mesh(
        towerGeometry(resources, 'jewel', () => new THREE.OctahedronGeometry(0.34, 0)),
        towerMaterial(resources, { color: 0xfff1c1, emissive: 0xf5c451, emissiveIntensity: 1.6, roughness: 0.2 })
      );
      jewel.name = 'jewel';
      jewel.position.y = kind === 'frost' ? 3.55 : 2.95;
      group.add(jewel);
    }
    return tall;
  }

  function buildTowerRig(kind, resources, level = 1) {
    const art = TOWER_ART[kind] || TOWER_ART.frost;
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      towerGeometry(resources, 'base', () => new THREE.CylinderGeometry(0.86, 1.05, 0.7, 10)),
      towerMaterial(resources, { color: art.body, roughness: 0.8 })
    );
    base.position.y = 0.35;
    base.castShadow = settings.shadows;
    group.add(base);

    if (art.shape === 'spire') {
      const spire = new THREE.Mesh(
        towerGeometry(resources, 'spire', () => new THREE.ConeGeometry(0.72, 2.5, 8)),
        towerMaterial(resources, {
          color: art.trim,
          emissive: art.emissive,
          emissiveIntensity: 0.6,
          roughness: 0.4,
        })
      );
      spire.position.y = 1.9;
      if (level >= 3) {
        spire.scale.y = 1.25;
        spire.position.y = 2.2;
      }
      if (level >= 5) spire.material.color.setHex(0xf5c451);
      group.add(spire);
    } else {
      const post = new THREE.Mesh(
        towerGeometry(resources, 'post', () => new THREE.BoxGeometry(0.3, 1.5, 0.3)),
        towerMaterial(resources, { color: art.body, roughness: 0.7 })
      );
      post.position.y = 1.1;
      group.add(post);
      const bowl = new THREE.Mesh(
        towerGeometry(resources, 'bowl', () => new THREE.SphereGeometry(0.52, 12, 10)),
        towerMaterial(resources, {
          color: art.trim,
          emissive: art.emissive,
          emissiveIntensity: 0.9,
          roughness: 0.35,
        })
      );
      bowl.position.y = 2;
      if (level >= 3) {
        bowl.scale.setScalar(1.25);
        post.scale.y = 1.2;
        bowl.position.y = 2.2;
      }
      if (level >= 5) bowl.material.color.setHex(0xf5c451);
      group.add(bowl);
    }
    buildTowerTiers(group, kind, level, resources, art);
    const haloMaterial = new THREE.SpriteMaterial({
        map: kind === 'frost' ? textures.ringIce : textures.ringFire,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55,
      });
    resources.materials.add(haloMaterial);
    const halo = new THREE.Sprite(haloMaterial);
    halo.position.y = 0.07;
    halo.scale.set(3.4 + (level - 1) * 0.35, 3.4 + (level - 1) * 0.35, 1);
    group.add(halo);
    if (level >= 5) group.scale.setScalar(1.12);
    return group;
  }

  function syncTowers(state, dtMs) {
    for (const tower of state.towers) {
      let rig = towerRigs.get(tower.socket);
      if (rig && rig.level !== tower.level) {
        // A new tier is a new model: rebuild it and pop it into place.
        disposeTowerRig(rig);
        towerRigs.delete(tower.socket);
        rig = null;
      }
      if (!rig) {
        const resources = { geometries: new Set(), materials: new Set() };
        rig = {
          group: buildTowerRig(tower.kind, resources, tower.level),
          pips: new THREE.Group(),
          resources,
          level: tower.level,
          popMs: reducedMotion ? 0 : 420,
          baseScale: tower.level >= 5 ? 1.12 : 1,
        };
        rig.orbit = rig.group.getObjectByName('orbit') || null;
        rig.jewel = rig.group.getObjectByName('jewel') || null;
        rig.group.add(rig.pips);
        rig.group.position.set(tower.x, 0, tower.z);
        scene.add(rig.group);
        towerRigs.set(tower.socket, rig);
      }
      rig.group.children.forEach((child) => {
        if (child.isMesh && child.name !== 'jewel') child.rotation.y = tower.angle;
      });
      if (rig.orbit) rig.orbit.rotation.y += (dtMs / 1000) * (reducedMotion ? 0.3 : 1.6);
      if (rig.jewel) rig.jewel.rotation.y += (dtMs / 1000) * 1.2;
      if (rig.popMs > 0) {
        rig.popMs = Math.max(0, rig.popMs - dtMs);
        const t = 1 - rig.popMs / 420;
        // Overshoot then settle: a quick elastic pop.
        const pop = t < 0.55 ? 0.35 + (t / 0.55) * 0.85 : 1.2 - ((t - 0.55) / 0.45) * 0.2;
        rig.group.scale.setScalar(rig.baseScale * pop);
      } else {
        rig.group.scale.setScalar(rig.baseScale);
      }
      const pipCount = rig.pips.children.length;
      for (let level = pipCount; level < tower.level - 1; level += 1) {
        const pip = new THREE.Mesh(
          towerGeometry(
            rig.resources,
            'pip',
            () => new THREE.BoxGeometry(0.22, 0.22, 0.22)
          ),
          towerMaterial(rig.resources, {
            color: 0xf5c451,
            emissive: 0x8a6a1f,
            emissiveIntensity: 0.7,
          })
        );
        pip.position.set(0.9 + level * 0.34, 0.5, 0);
        rig.pips.add(pip);
      }
    }
    for (const [socketIndex, rig] of towerRigs) {
      const alive = state.towers.some((tower) => tower.socket === socketIndex);
      if (!alive) {
        disposeTowerRig(rig);
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
    let helmCount = 0;
    let telegraphCount = 0;
    resetPool(shieldPool);
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
      } else if (unit.kind === 'dreadnought' || unit.boss) {
        actorShoulders.setMatrixAt(shoulderCount, actorMatrix);
        actorShoulders.setColorAt(
          shoulderCount,
          actorColor.setHex(flash ? 0xffffff : unit.boss ? 0xf5c451 : trim)
        );
        shoulderCount += 1;
      }
      if (unit.modifier === 'armored' || unit.boss) {
        actorHelm.setMatrixAt(helmCount, actorMatrix);
        actorHelm.setColorAt(helmCount, actorColor.setHex(flash ? 0xffffff : unit.boss ? 0x7f1d1d : 0x94a3b8));
        helmCount += 1;
      }
      if (unit.shield > 0) {
        const bubble = unit.radius * actorScaleFor(unit.kind) * 2.6;
        take(shieldPool, {
          texture: textures.glowWhite,
          color: 0xbae6fd,
          position: { x: unit.x, y: 0.9 * actorScaleFor(unit.kind), z: unit.z },
          scale: { x: bubble, y: bubble * 1.15 },
          opacity: 0.18 + 0.3 * (unit.shield / (unit.maxShield || 1)),
          additive: true,
        });
      }
      if (unit.telegraph && telegraphCount < telegraphs.length) {
        const slot = telegraphs[telegraphCount];
        telegraphCount += 1;
        const progress = 1 - unit.telegraph.ms / unit.telegraph.maxMs;
        const radius = unit.telegraph.radius;
        slot.ring.visible = true;
        slot.disc.visible = true;
        slot.ring.position.set(unit.telegraph.x, 0.07, unit.telegraph.z);
        slot.disc.position.set(unit.telegraph.x, 0.06, unit.telegraph.z);
        slot.ring.scale.setScalar(radius);
        slot.disc.scale.setScalar(Math.max(0.05, radius * progress));
        const pulse = reducedMotion ? 0.8 : 0.6 + Math.sin(clockMs / 60) * 0.3;
        slot.ring.material.opacity = pulse;
        slot.disc.material.opacity = 0.18 + progress * 0.32;
      }

      const ringScale = unit.radius * 3.4;
      take(unitRings, {
        texture: unit.element === 'fire' ? textures.ringFire : textures.ringIce,
        color: 0xffffff,
        position: { x: unit.x, y: 0.04, z: unit.z },
        scale: { x: ringScale * 1.45, y: ringScale * 1.45 },
        opacity: unit.slowMs > 0 ? 0.95 : unit.modifier ? 0.85 : 0.5,
        additive: true,
      });
      if (unit.modifier && MODIFIER_RING[unit.modifier]) {
        take(unitRings, {
          texture: textures.ringNeutral,
          color: MODIFIER_RING[unit.modifier],
          position: { x: unit.x, y: 0.05, z: unit.z },
          scale: { x: ringScale * 1.05, y: ringScale * 1.05 },
          opacity: 0.9,
          additive: true,
        });
      }
      if (settings.banners) {
        const bannerScale = unit.radius * 1.9;
        take(unitIcons, {
          texture: icon(ASSETS.unitIcon(faction.unitColor, unit.art || unit.kind, unit.tier)),
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
    actorHelm.count = helmCount;
    actorHelm.instanceMatrix.needsUpdate = true;
    if (actorHelm.instanceColor) actorHelm.instanceColor.needsUpdate = true;
    hideTail(shieldPool);
    for (let index = telegraphCount; index < telegraphs.length; index += 1) {
      telegraphs[index].ring.visible = false;
      telegraphs[index].disc.visible = false;
    }
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
        color: effect.kind === 'slam' ? 0xff6b6b : 0xffffff,
        position: { x: effect.x, y: effect.kind === 'nova' ? 1.1 : 0.5 + life * 0.9, z: effect.z },
        scale: { x: size * 2, y: size * 2 },
        opacity: Math.max(0, 1 - life),
        additive: true,
      });
    }
    hideTail(fxPool);

    // Sparks
    resetPool(sparkPool);
    const sparkStep = dtMs / 1000;
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const item = sparks[index];
      item.life += dtMs;
      if (item.life >= item.max) {
        sparks.splice(index, 1);
        continue;
      }
      item.vy -= item.gravity * sparkStep;
      item.x += item.vx * sparkStep;
      item.y = Math.max(0.05, item.y + item.vy * sparkStep);
      item.z += item.vz * sparkStep;
      item.vx *= 0.94;
      item.vz *= 0.94;
      const fade = 1 - item.life / item.max;
      take(sparkPool, {
        texture: textures.glowWhite,
        color: item.color,
        position: item,
        scale: { x: item.size * (0.6 + fade * 0.6), y: item.size * (0.6 + fade * 0.6) },
        opacity: fade,
        additive: true,
      });
    }
    hideTail(sparkPool);

    // Player
    const player = state.player;
    const alive = player.alive;
    if (alive && player.dashMs > 0 && !reducedMotion) {
      spark(player.x, player.z, player.element, { count: 2, y: 0.8, speed: 1.2 });
    }
    const playerColor = elementColor(player.element);
    playerShadow.visible = alive;
    playerShadow.position.set(player.x, 0.03, player.z);
    playerRing.visible = alive;
    playerRing.material.map = player.element === 'fire' ? textures.ringFire : textures.ringIce;
    playerRing.material.needsUpdate = true;
    playerRing.position.set(player.x, 0.06, player.z);
    playerRing.material.opacity = player.slowMs > 0 ? 0.55 : 0.95;
    const ultOn = state.ult?.activeMs > 0;
    const ringSize = ultOn ? 4.2 + (reducedMotion ? 0 : Math.sin(clockMs / 90) * 0.35) : 3.1;
    playerRing.scale.set(ringSize, ringSize, 1);
    velo.setPower?.(ultOn);

    velo.group.visible = alive;
    velo.group.position.set(player.x, 0, player.z);
    velo.group.rotation.y = player.facing || 0;
    velo.setElement(player.element);
    velo.setHitFlash(player.hitFlashMs > 0 && !(player.iframeMs > 0));
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

    syncTowers(state, dtMs);

    // Camera: follows the player, never the other way round. On the ready
    // screen it becomes the title scene instead — a slow arc around the
    // stronghold, or one static wide shot when motion is reduced.
    if (shakeMs > 0) {
      shakeMs -= dtMs;
      if (shakeMs <= 0) shakeAmount = 0;
    }
    const shakeX = shakeAmount * Math.sin(clockMs / 26) * Math.min(1, shakeMs / 160);
    const shakeZ = shakeAmount * Math.cos(clockMs / 31) * Math.min(1, shakeMs / 160);
    const smoothing = 1 - Math.pow(0.0015, dtMs / 1000);
    if (state.phase === 'ready') {
      const midX = (state.core.x + state.player.x) / 2;
      const midZ = (state.core.z + state.player.z) / 2;
      const orbit = reducedMotion ? 0.85 : clockMs / 8500 + 0.85;
      desired.set(
        midX + Math.sin(orbit) * 13 + shakeX,
        CAM.height + 3.5,
        midZ + Math.cos(orbit) * 13 + shakeZ
      );
      camera.position.lerp(desired, reducedMotion ? smoothing : smoothing * 0.5);
      cameraTarget.set(midX + shakeX * 0.5, CAM.lookY + 1, midZ + shakeZ * 0.5);
      camera.lookAt(cameraTarget);
    } else {
      const focusX = state.player.x;
      const focusZ = state.player.z;
      desired.set(focusX + shakeX, CAM.height, focusZ + CAM.back + shakeZ);
      camera.position.lerp(desired, smoothing);
      cameraTarget.set(focusX + shakeX * 0.5, CAM.lookY, focusZ + shakeZ * 0.5);
      camera.lookAt(cameraTarget);
    }

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

  // World point -> CSS pixels inside the canvas, for the HUD's floating
  // numbers. Returns null when the point is behind the camera.
  const projectPoint = new THREE.Vector3();
  function project(x, y, z, width, height) {
    projectPoint.set(x, y, z).project(camera);
    if (projectPoint.z > 1) return null;
    return {
      x: ((projectPoint.x + 1) / 2) * width,
      y: ((1 - projectPoint.y) / 2) * height,
    };
  }

  // Auto-quality: drop shadows, trim particles and the pixel ratio when the
  // game loop reports sustained slow frames. One way only; never flaps.
  let degraded = false;
  function setQuality(next) {
    if (next !== 'low' || degraded) return false;
    degraded = true;
    Object.assign(settings, QUALITY.low);
    renderer.shadowMap.enabled = false;
    key.castShadow = false;
    renderer.setPixelRatio(1);
    particleGeometry.setDrawRange(0, Math.min(particleCount, 80));
    sparks.length = Math.min(sparks.length, settings.sparks);
    return true;
  }

  return {
    kind: 'webgl',
    render,
    socketAtScreen,
    project,
    spark,
    setQuality,
    quality: () => (degraded ? 'low' : quality),
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
