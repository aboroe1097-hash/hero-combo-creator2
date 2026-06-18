/** Eden map feature flags — flip underConstruction when the live map is ready. */
export const EDEN_MAP_CONFIG = {
  /** When true, tab shows construction screen; full planner does not boot. */
  underConstruction: true,
  /** Use screenshot tile pyramid instead of single reference PNG. */
  liveMapEnabled: true,
  manifestUrl: 'assets/eden-live/manifest.json',
  /** World size — must match MAP_BOUNDS in eden-map-terrain.js */
  worldWidth: 1700,
  worldHeight: 1600,
};