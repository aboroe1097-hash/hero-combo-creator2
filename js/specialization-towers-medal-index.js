/**
 * Workbook evidence index for the Specialization contribution surfaces.
 *
 * `SPECIALIZATION_TROOP_MEDAL_EVIDENCE` transcribes the community workbook once per
 * troop tab, so one canonical research node owns up to three evidence rows — and the
 * medal costs genuinely differ between them. Two key shapes keep those apart:
 *
 * - `contributionNodeKey` is the canonical node identity. Contributions, the community
 *   panel and the `data-contribution-key` deep link all use it, so stored contributions
 *   and existing deep links keep working.
 * - `evidenceNodeKey` adds the troop. Keying the index on the canonical identity alone
 *   collapses the three tabs onto one key and whichever section is indexed last
 *   (footman) answers for all of them, which is how archer and cavalry nodes ended up
 *   displaying footman medal costs.
 *
 * Kept free of DOM access so the index can be unit-tested directly.
 */

import { SPECIALIZATION_TROOP_MEDAL_EVIDENCE } from './specialization-towers-medal-evidence.js';

export function contributionNodeKey(researchId, nodeId) {
  return `${researchId}:${nodeId}`;
}

export function evidenceNodeKey(troop, researchId, nodeId) {
  return `${troop}:${researchId}:${nodeId}`;
}

function normalizedEvidenceName(value) {
  return String(value || '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

let workbookNodeCosts = null;

/**
 * Per-level workbook medal costs for one troop's canonical node, or null when the
 * workbook has no row the build could place on it. Costs are returned exactly as the
 * workbook states them (one entry per level); an unknown node never becomes 0.
 */
export function getWorkbookNodeMedalCosts(troop, researchId, nodeId) {
  if (!workbookNodeCosts) {
    workbookNodeCosts = new Map();
    for (const section of SPECIALIZATION_TROOP_MEDAL_EVIDENCE) {
      if (!section.researchId) continue;
      for (const row of section.rows) {
        if (row.nodeId == null || row.costs.length === 0) continue;
        workbookNodeCosts.set(evidenceNodeKey(section.troop, section.researchId, row.nodeId), row);
      }
    }
  }
  const row = workbookNodeCosts.get(evidenceNodeKey(troop, researchId, Number(nodeId)));
  return row ? row.costs : null;
}

export function buildWorkbookEvidenceIndex(rows) {
  const byNodeKey = new Map();
  const nodeKeys = new Set();
  const unmapped = [];
  for (const section of SPECIALIZATION_TROOP_MEDAL_EVIDENCE) {
    if (!section.researchId) {
      section.rows.forEach((row) => unmapped.push({ section, row }));
      continue;
    }
    const candidates = rows.filter((row) => row[3] === section.researchId);
    const used = new Set();
    for (const evidenceRow of section.rows) {
      const wanted = normalizedEvidenceName(evidenceRow.name);
      // The workbook sometimes names a node differently per troop (Energetic, Tough
      // Armor, …). Those rows carry the canonical node id, so match on it first and
      // fall back to the name for rows the corpus cannot place.
      const byId =
        evidenceRow.nodeId == null
          ? undefined
          : candidates.find((row) => !used.has(row[6]) && row[6] === evidenceRow.nodeId);
      const match =
        byId ??
        candidates.find((row) => !used.has(row[6]) && normalizedEvidenceName(row[7]) === wanted);
      if (!match) {
        unmapped.push({ section, row: evidenceRow });
        continue;
      }
      used.add(match[6]);
      byNodeKey.set(evidenceNodeKey(section.troop, section.researchId, match[6]), {
        section,
        row: evidenceRow,
      });
      nodeKeys.add(contributionNodeKey(section.researchId, match[6]));
    }
  }
  return { byNodeKey, nodeKeys, unmapped };
}

export function displayedContributionCount(data, evidenceIndex) {
  // The transcribed rows are not a node count: every troop tab repeats the same
  // canonical nodes, so summing rows roughly triples the number this label promises.
  // Count the distinct nodes the index can actually place instead.
  const localOnlyCount = Object.entries(data.nodes).filter(
    ([key, node]) =>
      !evidenceIndex.nodeKeys.has(key) &&
      (node?.medalCost != null || node?.reviewedMedalCost != null)
  ).length;
  return evidenceIndex.nodeKeys.size + localOnlyCount;
}
