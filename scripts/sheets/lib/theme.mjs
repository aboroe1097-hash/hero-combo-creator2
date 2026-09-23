// Reference-sheet design system (plan §2): midnight surfaces, bold condensed
// headings, gold highlights with teal/purple accents, game icons, compact cards,
// prominent totals.
//
// Everything here is local. Fonts are system faces (no @font-face, no network);
// icons are inline SVG strings rather than image files, so a sheet renders the
// same with the network unplugged and every mark stays vector in the PDF.

export const TOKENS = Object.freeze({
  bg: '#081120',
  bgLift: '#0d1a30',
  panel: '#101d34',
  panelSoft: 'rgba(18, 32, 58, 0.72)',
  panelStrong: '#152542',
  border: 'rgba(146, 178, 220, 0.18)',
  borderStrong: 'rgba(146, 178, 220, 0.34)',
  ink: '#eef4ff',
  inkSoft: '#c3d2e6',
  muted: '#93a7c2',
  gold: '#f2b23c',
  goldSoft: 'rgba(242, 178, 60, 0.14)',
  teal: '#35d6c4',
  tealSoft: 'rgba(53, 214, 196, 0.14)',
  purple: '#a98bfa',
  purpleSoft: 'rgba(169, 139, 250, 0.16)',
  danger: '#fb923c',
  dangerSoft: 'rgba(251, 146, 60, 0.14)',
});

// Bold condensed for headings and figures. The stack only ever names faces that
// ship with an OS (Windows/Linux/macOS), and `font-stretch` plus the weight and
// tracking get the condensed look even when only a regular-width face is present.
export const FONT_DISPLAY =
  "'Archivo Narrow', 'Roboto Condensed', 'Arial Narrow', 'Liberation Sans Narrow', 'DejaVu Sans Condensed', 'Helvetica Neue Condensed', 'Helvetica Neue', Arial, sans-serif";
export const FONT_BODY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif";
export const FONT_MONO = "'DejaVu Sans Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

// ---------------------------------------------------------------------------
// Icons. One family per concept; every path is drawn on a 24x24 grid and inherits
// currentColor so a card can tint it with its own accent.
// ---------------------------------------------------------------------------

const PATHS = {
  orichalcum: '<path d="M12 3l8 6-8 12L4 9l8-6Z"/><path d="M4 9h16M9 9l3 12 3-12M9 9l3-6 3 6"/>',
  gold: '<circle cx="12" cy="12" r="7"/><path d="M12 8v8M9 10.2h6M9.2 13.8h5.6"/>',
  food: '<path d="M12 21V8m0 6c-4 0-6-2.4-6-5.6 4 0 6 2.4 6 5.6Zm0 4c4 0 6-2.4 6-5.6-4 0-6 2.4-6 5.6Zm0-9c-3 0-4.6-1.8-4.6-4.2 3 0 4.6 1.8 4.6 4.2Z"/>',
  lumber: '<path d="M5 9h12l3 3-3 3H5l-2-3 2-3Zm3 0v6"/><path d="M6 15h12l3 3-3 3H6l-2-3 2-3Z"/>',
  charcoal:
    '<path d="M13 3c1 6-4 7-3 11 .8-1.6 2.4-2.6 4-3.4 4 3.4 5.6 6.8 3.2 11-3.2 5-11.2 3.4-12.8-1.6C2.8 14.6 7 11.4 9.4 9c0 3.4.8 5.2 1.6 6C12.6 11.6 13.6 8 13 3Z"/>',
  marble: '<path d="M4 10l4-5h12l4 5-3 4H6l-2-4Z"/><path d="M7 14h14l3 4-3 4H7l-3-4 3-4Z"/>',
  iron: '<path d="M4 9l3-5h13l3 5-3 5H7L4 9Z"/><path d="M7 14v6h13v-6M10 20v-6M14 20v-6"/>',
  archer: '<path d="M5 19 19 5"/><path d="M13 5h6v6"/><path d="M5 19a11 11 0 0 1 11-11"/>',
  cavalry:
    '<path d="M6 21c0-5 2.5-8 6-8.5L14 6l-2-1 1-2 4 1.5L19 8l-2 1-1.5 3.5C17.5 14 19 16.5 19 21"/><path d="M6 21h13"/>',
  footman: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="M12 8v8"/>',
  medal:
    '<path d="M12 3v9"/><circle cx="12" cy="15.5" r="5.5"/><path d="m9.5 15.5 1.8 1.8 3.4-3.6"/>',
  research:
    '<path d="M9 3v6.2L4.6 18A2 2 0 0 0 6.4 21h11.2a2 2 0 0 0 1.8-3L15 9.2V3"/><path d="M8 3h8M7.5 14h9"/>',
  hero: '<circle cx="12" cy="8.5" r="3.4"/><path d="M5 20c1-4 3.6-6 7-6s6 2 7 6"/>',
  combo:
    '<circle cx="6.5" cy="7" r="2.6"/><circle cx="17.5" cy="7" r="2.6"/><circle cx="12" cy="17.5" r="2.6"/><path d="M8.4 9 10.6 15M15.6 9 13.4 15M9 7h6"/>',
  skin: '<path d="M12 3 4 6.5v5.2c0 4.6 3.3 7.8 8 9.3 4.7-1.5 8-4.7 8-9.3V6.5L12 3Z"/><path d="M12 7.5 13.6 11l3.4.4-2.5 2.4.7 3.4-3.2-1.7-3.2 1.7.7-3.4L7 11.4l3.4-.4L12 7.5Z"/>',
  artifact: '<path d="M12 3 5 6v6c0 5 3 8 7 9 4-1 7-4 7-9V6l-7-3Z"/><path d="M12 8v6M9.5 10h5"/>',
  map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"/><path d="M9 4v13.5M15 6.5V20"/>',
  tile: '<path d="M12 3 4 7.5 12 12l8-4.5L12 3Z"/><path d="m4 12 8 4.5L20 12M4 16.5 12 21l8-4.5"/>',
  game: '<rect x="3" y="7" width="18" height="11" rx="3"/><path d="M8 10.5v4M6 12.5h4M15 11.5h.01M17.5 14h.01"/>',
  battle: '<path d="M14.5 3.5 20.5 9.5 9 21H3v-6L14.5 3.5Z"/><path d="m12 6 6 6M5.5 18.5 18 6"/>',
  building: '<path d="M3 21h18M5 9l7-6 7 6v11H5V9Z"/><path d="M9 21v-5h6v5M9 11h.01M15 11h.01"/>',
  class: '<path d="M7 20v-6m5 6V9m5 11V4M4 20h16"/>',
  loyalty:
    '<path d="M12 20s-7-4.4-7-9.4A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.6c0 5-7 9.4-7 9.4Z"/>',
  strife:
    '<path d="M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10Z"/><path d="M9.5 13.5c0 1.4 1.1 2.5 2.5 2.5"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 8h.01"/>',
  warning: '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  people:
    '<circle cx="9" cy="9" r="2.6"/><circle cx="16.5" cy="10" r="2.2"/><path d="M4 19c.8-3 2.8-4.6 5-4.6S13.2 16 14 19M15 19c.2-2 1-3.4 2.4-4.2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  dash: '<path d="M6 12h12"/>',
  download: '<path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M4 18h16"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5H5V6h5"/>',
};

export function icon(name, { size = '5mm', className = '', title = '' } = {}) {
  const body = PATHS[name] || PATHS.info;
  const label = title
    ? ` role="img" aria-label="${escapeAttribute(title)}"`
    : ' aria-hidden="true"';
  return `<svg class="sh-icon${className ? ` ${className}` : ''}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${label}>${body}</svg>`;
}

export function hasIcon(name) {
  return Object.prototype.hasOwnProperty.call(PATHS, name);
}

export function escapeAttribute(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

// Resource keys used across the toolkit (Dragon Master, buildings, Eden) mapped to
// the sprite above, so a sheet does not have to know which name a dataset used.
const RESOURCE_ALIASES = Object.freeze({
  orichalcum: 'orichalcum',
  gold: 'gold',
  food: 'food',
  lumber: 'lumber',
  wood: 'lumber',
  charcoal: 'charcoal',
  coal: 'charcoal',
  marble: 'marble',
  stone: 'marble',
  iron: 'iron',
  gem: 'orichalcum',
  gems: 'orichalcum',
  diamond: 'orichalcum',
  diamonds: 'orichalcum',
  crystal: 'orichalcum',
  crystals: 'orichalcum',
});

export function resourceIconName(key) {
  return RESOURCE_ALIASES[String(key || '').toLowerCase()] || 'orichalcum';
}
