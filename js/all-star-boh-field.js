/**
 * All-Star BoH — Stage 1 battlefield model.
 *
 * Pure data + geometry. No DOM, no store access, so it can be unit tested directly.
 *
 * Coordinates are the real in-game map coordinates (X:Y as shown on the battlefield).
 * The field is 180-degree rotationally symmetric about (600, 600): rotating any structure
 * yields its opposite-side twin, which is exactly what happens when a team starts on Red
 * instead of Blue. CC1<->CC4, CC2<->CC3, H1<->H2, A1<->A2, FH1<->FH2.
 *
 * Naming is relative to the side you start on: "1" is always ours, "2" the enemy's.
 */

export const BOH_FIELD_CENTER = 600;

/** Stage 1 removes four buildings from the full field (two command centers, two outposts). */
export const BOH_STAGE1_REMOVED = Object.freeze([
  Object.freeze({ kind: 'cc', x: 564, y: 635 }),
  Object.freeze({ kind: 'cc', x: 635, y: 564 }),
  Object.freeze({ kind: 'op', x: 585, y: 550 }),
  Object.freeze({ kind: 'op', x: 614, y: 649 }),
]);

/**
 * Structures active in Stage 1. `blue` / `red` give the label used when we start on that side.
 */
export const BOH_STAGE1_FIELD = Object.freeze([
  Object.freeze({ kind: 'fort', blue: 'HOME', red: 'ENEMY', x: 600, y: 661 }),
  Object.freeze({ kind: 'fort', blue: 'ENEMY', red: 'HOME', x: 600, y: 539 }),
  Object.freeze({ kind: 'cc', blue: 'CC1', red: 'CC2', x: 635, y: 635 }),
  Object.freeze({ kind: 'cc', blue: 'CC2', red: 'CC1', x: 564, y: 564 }),
  Object.freeze({ kind: 'op', blue: 'OP1', red: 'OP2', x: 585, y: 649 }),
  Object.freeze({ kind: 'op', blue: 'OP2', red: 'OP1', x: 614, y: 550 }),
  Object.freeze({ kind: 'hospital', blue: 'H1', red: 'H2', x: 575, y: 620 }),
  Object.freeze({ kind: 'hospital', blue: 'H2', red: 'H1', x: 626, y: 580 }),
  Object.freeze({ kind: 'arsenal', blue: 'A1', red: 'A2', x: 626, y: 620 }),
  Object.freeze({ kind: 'arsenal', blue: 'A2', red: 'A1', x: 575, y: 580 }),
  Object.freeze({ kind: 'relay', blue: 'RP1', red: 'RP1r', x: 600, y: 623 }),
  Object.freeze({ kind: 'relay', blue: 'RP2', red: 'RP2r', x: 600, y: 611 }),
  Object.freeze({ kind: 'relay', blue: 'RP2r', red: 'RP2', x: 599, y: 588 }),
  Object.freeze({ kind: 'relay', blue: 'RP1r', red: 'RP1', x: 599, y: 576 }),
  Object.freeze({ kind: 'fortress', blue: 'FH1', red: 'FH1', x: 555, y: 600 }),
  Object.freeze({ kind: 'fortress', blue: 'FH2', red: 'FH2', x: 646, y: 600 }),
  Object.freeze({ kind: 'sanctuary', blue: 'S', red: 'S', x: 600, y: 600 }),
]);

/**
 * Isometric projection fitted by least squares against 13 building centroids measured from the
 * in-game map art (972x507). Mean error 2.7px, worst 5.2px. Returned as percentages so an
 * overlay scales with the image at any size.
 */
export function bohFieldPoint(x, y) {
  const u = Number(x) - BOH_FIELD_CENTER;
  const v = Number(y) - BOH_FIELD_CENTER;
  if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
  return Object.freeze({
    left: 46.863 + 0.589 * (u - v),
    top: 49.227 + 0.5449 * (u + v),
  });
}

/** Towers are built outward from your own stronghold up your lane toward the Sanctuary. */
export function bohLaneTowers(side = 'blue', count = 8) {
  const total = Math.max(1, Math.min(12, Number(count) || 8));
  const startY = side === 'red' ? 550 : 650;
  const endY = side === 'red' ? 594 : 606;
  const laneX = side === 'red' ? 612 : 588;
  const towers = [];
  for (let index = 0; index < total; index += 1) {
    const ratio = total === 1 ? 0 : index / (total - 1);
    towers.push(
      Object.freeze({
        kind: 'tower',
        id: `T${index + 1}`,
        side,
        x: laneX + (BOH_FIELD_CENTER - laneX) * ratio * 0.6,
        y: startY + (endY - startY) * ratio,
      })
    );
  }
  return Object.freeze(towers);
}

/** Label a structure for the side we start on. */
export function bohStructureLabel(structure, side = 'blue') {
  if (!structure) return '';
  if (structure.kind === 'tower') return structure.id || '';
  return side === 'red' ? structure.red : structure.blue;
}

/**
 * Who a structure belongs to. Anything on the centre line (Sanctuary, both Fortresses of
 * Honor) is contested rather than owned.
 */
export function bohStructureAllegiance(structure, side = 'blue') {
  if (!structure) return 'neutral';
  if (structure.kind === 'tower') return structure.side === side ? 'ours' : 'theirs';
  if (structure.kind === 'sanctuary' || structure.kind === 'fortress') return 'neutral';
  if (structure.y === BOH_FIELD_CENTER) return 'neutral';
  const half = structure.y > BOH_FIELD_CENTER ? 'blue' : 'red';
  return half === side ? 'ours' : 'theirs';
}

/** The twin a structure becomes after the 180-degree flip to the other side. */
export function bohStructureTwin(structure) {
  if (!structure) return null;
  const targetX = 2 * BOH_FIELD_CENTER - structure.x;
  const targetY = 2 * BOH_FIELD_CENTER - structure.y;
  return (
    BOH_STAGE1_FIELD.find(
      (candidate) =>
        candidate.kind === structure.kind &&
        Math.abs(candidate.x - targetX) <= 2 &&
        Math.abs(candidate.y - targetY) <= 2
    ) || null
  );
}

const STRUCTURE_CODE_PATTERN = /\[([A-Z]{1,3}\d{0,2})\]/gu;

/** Structure codes referenced in an order line, e.g. "Capture Enemy Command Center [CC2]". */
export function bohStructureCodes(text) {
  const codes = [];
  String(text || '').replace(STRUCTURE_CODE_PATTERN, (match, code) => {
    if (!codes.includes(code)) codes.push(code);
    return match;
  });
  return codes;
}

/** Every structure a player is sent to in one phase, across both legions and the note. */
export function bohPhaseTargets(assignment) {
  if (!assignment) return [];
  const codes = [];
  [assignment.l1, assignment.l2, assignment.note].forEach((line) => {
    bohStructureCodes(line).forEach((code) => {
      if (!codes.includes(code)) codes.push(code);
    });
  });
  return codes;
}

/** i18n key for a structure kind, so map labels translate with the rest of the hub. */
const STRUCTURE_LABEL_KEYS = Object.freeze({
  fort: 'field.stronghold',
  cc: 'field.commandCenter',
  op: 'field.outpost',
  hospital: 'field.hospital',
  arsenal: 'field.arsenal',
  relay: 'field.relay',
  sanctuary: 'field.sanctuary',
  fortress: 'field.fortress',
  tower: 'field.tower',
});

export function bohStructureLabelKey(kind) {
  return STRUCTURE_LABEL_KEYS[kind] || 'field.tower';
}

/**
 * The Stage 1 objective catalogue in the shape the published plan already accepts: id, code,
 * label, type and 0-100 coordinates. Positions come from the real battlefield rather than a
 * schematic guess, so a member's route is drawn where the buildings actually stand.
 *
 * `translate(key, fallback)` lets the caller localise the type labels; it defaults to English.
 */
export function bohStage1Objectives(side = 'blue', translate = null) {
  const label = (kind, fallback) => {
    const key = bohStructureLabelKey(kind);
    if (typeof translate !== 'function') return fallback;
    return translate(key, fallback) || fallback;
  };
  const kindFallback = {
    fort: 'Stronghold',
    cc: 'Command Center',
    op: 'Outpost',
    hospital: 'Hospital',
    arsenal: 'Arsenal',
    relay: 'Relay',
    sanctuary: 'Sanctuary',
    fortress: 'Fortress of Honor',
    tower: 'Tower',
  };
  const entries = BOH_STAGE1_FIELD.concat(bohLaneTowers(side));
  return entries.map((structure, index) => {
    const code = bohStructureLabel(structure, side);
    const point = bohFieldPoint(structure.x, structure.y);
    return {
      id: `objective-${String(code)
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '-')}`,
      code,
      label: `${label(structure.kind, kindFallback[structure.kind])} ${code}`.trim(),
      type: structure.kind,
      x: Number(point.left.toFixed(2)),
      y: Number(point.top.toFixed(2)),
      order: index + 1,
    };
  });
}
