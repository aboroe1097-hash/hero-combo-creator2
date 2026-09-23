// Velo — the project mascot, as a real 3D model.
//
// He is the player's avatar in the arena. The old version put the player's RoC
// skin icon above a generic body as a flat billboard, which read as a 2D card
// pasted into a 3D scene; this is the mascot instead, built from primitives at
// runtime so the game still ships zero new art bytes.
//
// Shape notes from `assets/velo/velo-body.webp`: chibi dragon, dark navy hide,
// pale grey belly plates, stone-grey horns, big cyan eyes, patched bat wings,
// a tattered navy scarf and a flame at the tail tip. The wing colour and the
// tail flame take the player's element (ice / fire), which is how you tell at a
// glance which wing you are currently carrying.
//
// Geometry faces +z locally, which matches the simulation's facing convention
// (`atan2(aimX, aimZ)`): the model turns to walk the way it is aimed.

import * as THREE from 'three';

const COLORS = {
  hide: 0x2c3757,
  hideDark: 0x232c46,
  belly: 0x8892a4,
  horn: 0x9a9182,
  scarf: 0x1e2742,
  wing: 0x2a3352,
  eye: 0x49d2f5,
  pupil: 0x101725,
  claw: 0x8d8577,
};

const ELEMENT = {
  ice: { wing: 0x35618f, flame: 0x7dd3fc, glow: 0x9fe4ff },
  fire: { wing: 0x6d3320, flame: 0xfb923c, glow: 0xffcf9e },
};

function part(geometry, material, position, rotation, scale) {
  const mesh = new THREE.Mesh(geometry, material);
  if (position) mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  return mesh;
}

function wingShape() {
  // One bat wing: a swept arm with two scalloped fingers, drawn flat then
  // angled back on the model.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.55, 0.35, 1.0, 0.05);
  shape.quadraticCurveTo(0.86, -0.36, 0.62, -0.3);
  shape.quadraticCurveTo(0.74, -0.62, 0.4, -0.52);
  shape.quadraticCurveTo(0.44, -0.86, 0.12, -0.6);
  shape.lineTo(0, 0);
  return new THREE.ShapeGeometry(shape, 8);
}

export function createVelo({ element = 'ice' } = {}) {
  const group = new THREE.Group();
  const materials = {
    hide: new THREE.MeshStandardMaterial({ color: COLORS.hide, roughness: 0.72, flatShading: true }),
    hideDark: new THREE.MeshStandardMaterial({
      color: COLORS.hideDark,
      roughness: 0.78,
      flatShading: true,
    }),
    belly: new THREE.MeshStandardMaterial({ color: COLORS.belly, roughness: 0.55, flatShading: true }),
    horn: new THREE.MeshStandardMaterial({ color: COLORS.horn, roughness: 0.8, flatShading: true }),
    scarf: new THREE.MeshStandardMaterial({ color: COLORS.scarf, roughness: 0.95 }),
    wing: new THREE.MeshStandardMaterial({
      color: ELEMENT[element].wing,
      roughness: 0.7,
      side: THREE.DoubleSide,
      flatShading: true,
    }),
    eye: new THREE.MeshStandardMaterial({
      color: COLORS.eye,
      emissive: COLORS.eye,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    }),
    pupil: new THREE.MeshStandardMaterial({ color: COLORS.pupil, roughness: 0.3 }),
    flame: new THREE.MeshStandardMaterial({
      color: ELEMENT[element].flame,
      emissive: ELEMENT[element].flame,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    }),
  };

  const body = part(new THREE.SphereGeometry(0.62, 14, 12), materials.hide, [0, 0.74, 0], null, [1, 1.05, 0.95]);
  group.add(body);

  const belly = part(
    new THREE.SphereGeometry(0.44, 12, 10),
    materials.belly,
    [0, 0.62, 0.34],
    null,
    [1, 0.95, 0.62]
  );
  group.add(belly);

  const head = part(new THREE.SphereGeometry(0.54, 16, 14), materials.hide, [0, 1.62, 0.05]);
  group.add(head);

  const muzzle = part(new THREE.SphereGeometry(0.24, 12, 10), materials.hide, [0, 1.48, 0.44], null, [1.1, 0.8, 1]);
  group.add(muzzle);

  for (const side of [-1, 1]) {
    group.add(part(new THREE.SphereGeometry(0.17, 12, 10), materials.eye, [side * 0.23, 1.68, 0.42]));
    group.add(part(new THREE.SphereGeometry(0.075, 8, 8), materials.pupil, [side * 0.23, 1.68, 0.55]));
    // Horns sweep back and out, the way the reference art has them.
    group.add(
      part(new THREE.ConeGeometry(0.13, 0.6, 6), materials.horn, [side * 0.3, 2.06, -0.02], [0.5, 0, side * -0.42])
    );
    group.add(part(new THREE.ConeGeometry(0.1, 0.3, 6), materials.horn, [side * 0.42, 1.94, 0.16], [0.9, 0, side * -0.5]));
  }

  // Crest spikes down the crown.
  for (const [index, z] of [0.1, -0.12, -0.34].entries()) {
    group.add(part(new THREE.ConeGeometry(0.09, 0.26 - index * 0.04, 6), materials.hideDark, [0, 2.02 - index * 0.06, z], [-0.35, 0, 0]));
  }

  const wings = [];
  for (const side of [-1, 1]) {
    const wing = part(wingShape(), materials.wing, [side * 0.42, 1.16, -0.1], [0, side * -0.85, side * 0.25], [side, 1, 1]);
    wing.castShadow = false;
    wings.push(wing);
    group.add(wing);
  }

  const scarf = part(new THREE.TorusGeometry(0.4, 0.13, 8, 16), materials.scarf, [0, 1.2, 0.02], [Math.PI / 2.1, 0, 0]);
  group.add(scarf);
  const scarfTail = part(new THREE.BoxGeometry(0.3, 0.5, 0.1), materials.scarf, [-0.16, 0.98, 0.42], [0.25, 0, 0.2]);
  group.add(scarfTail);

  for (const side of [-1, 1]) {
    group.add(part(new THREE.SphereGeometry(0.22, 10, 8), materials.hide, [side * 0.3, 0.2, 0.08], null, [1, 0.8, 1.15]));
    group.add(part(new THREE.ConeGeometry(0.07, 0.16, 5), materials.claw, [side * 0.3, 0.14, 0.34], [1.4, 0, 0]));
  }

  // Tail: three tapering segments curving up behind him, flame on the tip.
  const tail = new THREE.Group();
  const segments = [
    { length: 0.42, radius: 0.17, at: [0, 0.42, -0.5], rotation: [0.7, 0, 0] },
    { length: 0.44, radius: 0.13, at: [0, 0.66, -0.86], rotation: [1.15, 0, 0] },
    { length: 0.4, radius: 0.09, at: [0, 0.92, -1.12], rotation: [1.5, 0, 0] },
  ];
  for (const segment of segments) {
    tail.add(
      part(
        new THREE.CylinderGeometry(segment.radius * 0.7, segment.radius, segment.length, 8),
        materials.hide,
        segment.at,
        segment.rotation
      )
    );
  }
  const flame = part(new THREE.ConeGeometry(0.16, 0.42, 8), materials.flame, [0, 1.14, -1.24], [-0.35, 0, 0]);
  tail.add(flame);
  group.add(tail);

  // A soft light so Velo reads in a crowd and in the dark scenes.
  const glow = new THREE.PointLight(ELEMENT[element].glow, 0.9, 9, 2);
  glow.position.set(0, 1.4, 0.2);
  group.add(glow);

  let clock = 0;
  let stridePhase = 0;

  return {
    group,
    /** Wing colour and flame follow the element the player is carrying. */
    setElement(next) {
      const palette = ELEMENT[next] || ELEMENT.ice;
      materials.wing.color.setHex(palette.wing);
      materials.flame.color.setHex(palette.flame);
      materials.flame.emissive.setHex(palette.flame);
      glow.color.setHex(palette.glow);
    },
    setHitFlash(active) {
      materials.hide.emissive.setHex(active ? 0x8a2020 : 0x000000);
      materials.hide.emissiveIntensity = active ? 0.9 : 0;
    },
    /**
     * Cosmetic motion only: bob, wing flap and tail sway. Nothing here is read
     * by the simulation, so it cannot affect a run's determinism.
     */
    update(dtMs, { moving = false, reducedMotion = false } = {}) {
      clock += dtMs / 1000;
      stridePhase += (dtMs / 1000) * (moving ? 9 : 2.4);
      const bobAmount = reducedMotion ? 0 : moving ? 0.05 : 0.02;
      body.position.y = 0.74 + Math.sin(stridePhase) * bobAmount;
      head.position.y = 1.62 + Math.sin(stridePhase + 0.5) * bobAmount * 0.7;
      scarf.rotation.z = Math.sin(stridePhase * 0.6) * 0.05;
      tail.rotation.y = Math.sin(clock * 1.3) * (reducedMotion ? 0.02 : 0.16);
      const flap = reducedMotion ? 0.05 : moving ? 0.42 : 0.16;
      wings.forEach((wing, index) => {
        const side = index === 0 ? -1 : 1;
        wing.rotation.z = side * (0.25 + Math.sin(clock * (moving ? 9 : 3.5)) * flap * 0.5);
      });
      materials.flame.emissiveIntensity = 1.3 + Math.sin(clock * 6) * 0.25;
    },
    dispose() {
      group.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
    },
  };
}
