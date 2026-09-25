// The ?v= cache-busting stamp that scripts/update-build-metadata.mjs rewrites.
//
// A stamp is word characters and dashes, optionally in dot-separated groups.
// The dotted form matters: vtsscore.html once carried "?v=14.3.5", and a
// pattern without dots replaced only the "14", so every later build stamped
// "?v=<build>.3.5" — a URL the service worker never precached.
export const STAMP_SOURCE = String.raw`[0-9A-Za-z_-]+(?:\.[0-9A-Za-z_-]+)*`;

/** Every `?v=<stamp>` in `text` → `?v=<buildVersion>`. */
export function restampAll(text, buildVersion) {
  return String(text).replace(
    new RegExp(String.raw`\?v=${STAMP_SOURCE}`, 'g'),
    `?v=${buildVersion}`
  );
}

/** `(?:\?v=<stamp>)?`, for patterns that add a stamp where one is missing. */
export const OPTIONAL_STAMP_SOURCE = String.raw`(?:\?v=${STAMP_SOURCE})?`;
