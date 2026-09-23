// Two arenas, as data. Adding a third map means adding an object here — the
// simulation and the renderer both read this shape and nothing else.
//
// Coordinates are the horizontal plane only: x is width, z is depth, and the
// origin is the arena centre. The keep/bridge always sits at positive z (near
// the camera) so enemy waves walk toward the viewer.
//
// Every map declares:
//   size       arena extents in world units (entities are clamped inside)
//   core       the structure the player defends
//   spawn      where the player starts each run
//   gates      enemy spawn points, each with an elemental flavour
//   sockets    fixed tower positions (tap a free one to build)
//   obstacles  solid axis-aligned boxes; ground units path around them
//   decor      non-colliding props (crystals, braziers, containers, railings)
//   palette    { dark, light } scene presets, so the page theme reaches the 3D

export const MAPS = {
  keep: {
    id: 'keep',
    nameKey: 'mapKeepName',
    descKey: 'mapKeepDesc',
    size: { w: 46, d: 34 },
    core: { x: 0, z: 12.4, radius: 3.05, kind: 'keep' },
    spawn: { x: 0, z: 4.6 },
    gates: [
      { x: -17, z: -15, element: 'ice' },
      { x: 0, z: -16.2, element: 'fire' },
      { x: 17, z: -15, element: 'ice' },
    ],
    sockets: [
      { x: -8.5, z: 1.5 },
      { x: 8.5, z: 1.5 },
      { x: -13, z: -2.5 },
      { x: 13, z: -2.5 },
      { x: -3.5, z: 6.5 },
      { x: 3.5, z: 6.5 },
    ],
    obstacles: [
      { x: -13.5, z: -8.5, w: 7, d: 2.2, h: 3.2, texture: 'stone' },
      { x: 13.5, z: -8.5, w: 7, d: 2.2, h: 3.2, texture: 'stone' },
      { x: -6.4, z: -10.5, w: 2.2, d: 5.4, h: 2.6, texture: 'stone' },
      { x: 6.4, z: -10.5, w: 2.2, d: 5.4, h: 2.6, texture: 'stone' },
      // Low walls sit on the flanks on purpose: the corridor between them is
      // the player's firing lane from spawn, and a wall across it would eat
      // every bolt before it reached the lanes.
      { x: -7.4, z: 5.2, w: 4.6, d: 1.8, h: 2.2, texture: 'stone' },
      { x: 7.4, z: 5.2, w: 4.6, d: 1.8, h: 2.2, texture: 'stone' },
    ],
    decor: [
      { kind: 'crystal', x: -19, z: 4, scale: 1.6 },
      { kind: 'crystal', x: 19, z: 4, scale: 1.3 },
      { kind: 'crystal', x: -16, z: 14, scale: 1.1 },
      { kind: 'brazier', x: -5.6, z: 9.4 },
      { kind: 'brazier', x: 5.6, z: 9.4 },
      { kind: 'banner', x: -9.4, z: 11.2, element: 'ice' },
      { kind: 'banner', x: 9.4, z: 11.2, element: 'fire' },
      { kind: 'ruin', x: -19.5, z: -3, scale: 1.6 },
      { kind: 'ruin', x: 19.5, z: -3, scale: 1.4 },
      { kind: 'crystal', x: 0, z: 15.6, scale: 1.4 },
    ],
    palette: {
      dark: {
        sky: 0x070d16,
        fog: 0x0b1523,
        fogNear: 34,
        fogFar: 74,
        groundTop: 0x27364a,
        groundBottom: 0x0d1622,
        groundTexture: 'snowstone',
        hemiSky: 0x8fbcff,
        hemiGround: 0x1b2436,
        key: 0xdfeaff,
      },
      light: {
        sky: 0xa9c3dd,
        fog: 0xc2d4e6,
        fogNear: 36,
        fogFar: 86,
        groundTop: 0xe8eef6,
        groundBottom: 0xbfcfe0,
        groundTexture: 'snowstoneLight',
        hemiSky: 0xffffff,
        hemiGround: 0x9fb0c4,
        key: 0xfff6e2,
      },
    },
  },

  ship: {
    id: 'ship',
    nameKey: 'mapShipName',
    descKey: 'mapShipDesc',
    size: { w: 40, d: 30 },
    core: { x: 0, z: 11, radius: 3.05, kind: 'bridge' },
    spawn: { x: 0, z: 4.0 },
    gates: [
      { x: -15, z: -13, element: 'fire' },
      { x: 0, z: -14.2, element: 'ice' },
      { x: 15, z: -13, element: 'fire' },
    ],
    sockets: [
      { x: -7.5, z: 0.5 },
      { x: 7.5, z: 0.5 },
      { x: -11.5, z: -3.5 },
      { x: 11.5, z: -3.5 },
      { x: -3.2, z: 5.8 },
      { x: 3.2, z: 5.8 },
    ],
    obstacles: [
      // Container stacks, the shape the reference deck map is built from.
      { x: -10.5, z: -6.5, w: 4.4, d: 2.4, h: 3.4, texture: 'container', label: 'VTS 1097' },
      { x: 10.5, z: -6.5, w: 4.4, d: 2.4, h: 3.4, texture: 'container', label: 'S-1097' },
      { x: -4.6, z: -9.2, w: 2.6, d: 4.6, h: 3.1, texture: 'container', label: 'ICE' },
      { x: 4.6, z: -9.2, w: 2.6, d: 4.6, h: 3.1, texture: 'container', label: 'FIRE' },
      // A deckhouse to one side, never across the centre line: the middle of
      // the deck is the lane the player shoots down from the bridge.
      { x: -9.8, z: 4.4, w: 5.2, d: 1.9, h: 1.6, texture: 'deck' },
      { x: -13.4, z: 6.4, w: 3.2, d: 3.2, h: 1.4, texture: 'crate' },
      { x: 13.4, z: 6.4, w: 3.2, d: 3.2, h: 1.4, texture: 'crate' },
    ],
    decor: [
      { kind: 'pipe', x: -17.6, z: 0, w: 1.1, len: 26 },
      { kind: 'pipe', x: 17.6, z: 0, w: 1.1, len: 26 },
      { kind: 'railing', x: 0, z: -15.4, w: 38 },
      { kind: 'railing', x: -19.6, z: 0, w: 28, rot: Math.PI / 2 },
      { kind: 'railing', x: 19.6, z: 0, w: 28, rot: Math.PI / 2 },
      { kind: 'mast', x: 0, z: 8.2, scale: 1.3 },
      { kind: 'ruin', x: -17.5, z: 8.5, scale: 1.3 },
      { kind: 'ruin', x: 17.5, z: 8.5, scale: 1.3 },
      { kind: 'lifeboat', x: -12.5, z: 3.2 },
      { kind: 'lifeboat', x: 12.5, z: 3.2 },
    ],
    palette: {
      dark: {
        sky: 0x08111a,
        fog: 0x0d1a26,
        fogNear: 30,
        fogFar: 70,
        groundTop: 0x39434f,
        groundBottom: 0x121922,
        groundTexture: 'deck',
        hemiSky: 0x9fc9ff,
        hemiGround: 0x202833,
        key: 0xe6f0ff,
      },
      light: {
        sky: 0x9fb6cc,
        fog: 0xbdd0e0,
        fogNear: 32,
        fogFar: 80,
        groundTop: 0xcdd6e0,
        groundBottom: 0xa8b6c4,
        groundTexture: 'deckLight',
        hemiSky: 0xffffff,
        hemiGround: 0x9aa8b6,
        key: 0xfff2dd,
      },
    },
  },
};

export const MAP_ORDER = ['keep', 'ship'];

export function mapById(id) {
  return MAPS[id] || MAPS.keep;
}
