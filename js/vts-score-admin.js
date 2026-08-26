// js/vts-score-admin.js
//
// VtsScore admin model.
//
// VtsScore compares each competitor's sign-up power breakdown against the
// breakdown they upload at the end of the race, and ranks the growth. This code
// used to live inside the All-Star BoH command center as one of its stages;
// when that command center was removed the competition itself was not, so the
// model moved here and kept its behaviour byte for byte.
//
// Everything here is pure except the exemption list, which is per-browser
// leadership scratch state, and the canvas drawing, which takes the canvas it
// is handed. No Firestore, no i18n, no DOM lookups.

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function finiteNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(number) ? number : fallback;
}

function integer(value, fallback = 0) {
  return Math.round(finiteNumber(value, fallback));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function playerName(player) {
  return cleanText(
    player?.displayName ||
      player?.gameName ||
      player?.playerName ||
      player?.accountName ||
      player?.name
  );
}

export const VTS_SCORE_COMPARISON_FIELDS = Object.freeze([
  ['totalCastlePower', 'adminBohStatTotalPower', 'Total power'],
  ['troopPower', 'adminBohStatTroopPower', 'Troop power'],
  ['buildingPower', 'adminBohStatBuildingPower', 'Building power'],
  ['technologyPower', 'adminBohStatTechnologyPower', 'Technology power'],
  ['heroCombatPower', 'adminBohStatHeroPower', 'Hero combat power'],
  ['dragonPower', 'adminBohStatDragonPower', 'Dragon power'],
  ['unitSpecialtyPower', 'adminBohStatUnitSpecialtyPower', 'Unit specialty power'],
  ['artifactPower', 'adminBohStatArtifactPower', 'Artifact power'],
  ['royalTechPower', 'adminBohStatRoyalTechPower', 'Royal Tech power'],
]);
const VTS_SCORE_REQUIRED_COMPARISON_FIELDS = new Set(
  VTS_SCORE_COMPARISON_FIELDS.slice(0, 7).map(([field]) => field)
);

export function buildAdminVtsScoreRows(submissionsInput = [], raceScoresInput = []) {
  const scoreBySubmission = new Map(
    list(raceScoresInput)
      .map((score) => [cleanText(score?.submissionUid), score])
      .filter(([submissionUid]) => submissionUid)
  );
  return list(submissionsInput)
    .filter((submission) => cleanText(submission?.status) === 'submitted')
    .map((submission) => {
      const submissionUid = cleanText(
        submission?.submissionUid || submission?.uid || submission?.playerId || submission?.id
      );
      const score = scoreBySubmission.get(submissionUid) || null;
      const baselineSource =
        submission?.confirmedStats && typeof submission.confirmedStats === 'object'
          ? submission.confirmedStats
          : submission?.stats && typeof submission.stats === 'object'
            ? submission.stats
            : submission;
      const finalSource =
        score?.powerValues && typeof score.powerValues === 'object'
          ? score.powerValues
          : score && Number.isFinite(Number(score.dragonPower))
            ? { dragonPower: Number(score.dragonPower) }
            : {};
      const comparisons = VTS_SCORE_COMPARISON_FIELDS.map(([field]) => {
        const baselineRaw =
          field === 'totalCastlePower'
            ? (baselineSource?.totalCastlePower ?? baselineSource?.totalPower)
            : baselineSource?.[field];
        const baseline =
          baselineRaw !== null &&
          baselineRaw !== undefined &&
          baselineRaw !== '' &&
          Number.isFinite(Number(baselineRaw))
            ? Math.max(0, Number(baselineRaw))
            : null;
        const final =
          finalSource?.[field] !== null &&
          finalSource?.[field] !== undefined &&
          finalSource?.[field] !== '' &&
          Number.isFinite(Number(finalSource[field]))
            ? Math.max(0, Number(finalSource[field]))
            : null;
        const growth = baseline === null || final === null ? null : final - baseline;
        return {
          field,
          baseline,
          final,
          growth,
          growthPercent: growth === null || baseline <= 0 ? null : (growth / baseline) * 100,
        };
      });
      const comparisonByField = Object.fromEntries(
        comparisons.map((comparison) => [comparison.field, comparison])
      );
      const totalComparison = comparisonByField.totalCastlePower;
      const fullBreakdown =
        score?.schemaVersion === 2 &&
        [...VTS_SCORE_REQUIRED_COMPARISON_FIELDS].every(
          (field) => comparisonByField[field]?.final !== null
        );
      const baselineDragonPower = Math.max(
        0,
        finiteNumber(
          submission?.confirmedStats?.dragonPower ??
            submission?.stats?.dragonPower ??
            submission?.dragonPower
        )
      );
      const confidenceValues = Object.values(score?.ocr?.confidence || {}).filter((value) =>
        Number.isFinite(Number(value))
      );
      return {
        submissionUid,
        gameName: playerName(submission) || cleanText(score?.gameName) || submissionUid,
        tier: baselineDragonPower >= 7_000_000 ? 1 : 2,
        comparisons,
        baselineTotalPower: totalComparison.baseline ?? 0,
        finalTotalPower: totalComparison.final,
        growth: totalComparison.growth,
        growthPercent: totalComparison.growthPercent,
        submitted: fullBreakdown,
        hasUpload: Boolean(score),
        legacyUpload: Boolean(score) && !fullBreakdown,
        submittedAt: score?.updatedAt || score?.updatedAtMs || null,
        revision: integer(score?.revision),
        ocrCorrected:
          score?.ocr?.corrected === true || (score?.ocr?.correctedFields?.length || 0) > 0,
        ocrConfidence: confidenceValues.length
          ? confidenceValues.reduce((sum, value) => sum + Number(value), 0) /
            confidenceValues.length
          : typeof score?.ocr?.confidence === 'number'
            ? score.ocr.confidence
            : null,
      };
    })
    .sort(
      (left, right) =>
        left.tier - right.tier ||
        Number(right.submitted) - Number(left.submitted) ||
        (right.growth ?? Number.NEGATIVE_INFINITY) - (left.growth ?? Number.NEGATIVE_INFINITY) ||
        left.gameName.localeCompare(right.gameName, 'en', { sensitivity: 'base' })
    );
}

export const VTS_SCORE_TIERS = Object.freeze([1, 2]);
export const VTS_SCORE_ALL_TIERS = 'all';
const VTS_SCORE_EXEMPT_STORAGE_KEY = 'vts_score_exempt_names';

/** Exact name match, case-insensitive — leadership types the name they see. */
export function vtsScoreExemptKey(value) {
  return cleanText(value).toLocaleLowerCase();
}

export function readVtsScoreExemptions() {
  try {
    const raw = globalThis.localStorage?.getItem(VTS_SCORE_EXEMPT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map((entry) => cleanText(entry))
      .filter((name) => {
        const key = vtsScoreExemptKey(name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

export function writeVtsScoreExemptions(names) {
  try {
    globalThis.localStorage?.setItem(VTS_SCORE_EXEMPT_STORAGE_KEY, JSON.stringify(list(names)));
  } catch {
    // A locked-down browser still shows the current session's exemptions.
  }
}

/**
 * Leaders per power category, ranked two ways at once. Absolute growth favours
 * the biggest accounts, percentage growth favours the smallest, so neither
 * alone tells leadership who actually pushed hardest. Pass VTS_SCORE_ALL_TIERS
 * to rank every tier together.
 */
export function buildVtsScoreTierSummary(rows = [], tier = 1, exemptions = []) {
  const exempt = new Set(list(exemptions).map(vtsScoreExemptKey).filter(Boolean));
  const all = list(rows).filter(
    (row) =>
      (tier === VTS_SCORE_ALL_TIERS || row?.tier === tier) &&
      !exempt.has(vtsScoreExemptKey(row?.gameName))
  );
  const submitted = all.filter((row) => row?.submitted);
  const categories = VTS_SCORE_COMPARISON_FIELDS.map(([field, i18nKey, label]) => {
    let growthRow = null;
    let growthValue = null;
    let percentRow = null;
    let percentValue = null;
    for (const row of submitted) {
      const comparison = row.comparisons?.find((entry) => entry.field === field);
      if (!comparison) continue;
      if (comparison.growth !== null && (growthValue === null || comparison.growth > growthValue)) {
        growthValue = comparison.growth;
        growthRow = row;
      }
      if (
        comparison.growthPercent !== null &&
        (percentValue === null || comparison.growthPercent > percentValue)
      ) {
        percentValue = comparison.growthPercent;
        percentRow = row;
      }
    }
    return {
      field,
      i18nKey,
      label,
      growthPlayer: growthRow?.gameName || '',
      growth: growthValue,
      percentPlayer: percentRow?.gameName || '',
      growthPercent: percentValue,
    };
  });
  const totals = submitted.reduce(
    (accumulator, row) => {
      if (Number.isFinite(row.finalTotalPower)) accumulator.finalTotalPower += row.finalTotalPower;
      if (Number.isFinite(row.baselineTotalPower)) {
        accumulator.baselineTotalPower += row.baselineTotalPower;
      }
      if (Number.isFinite(row.growth)) accumulator.growth += row.growth;
      return accumulator;
    },
    { finalTotalPower: 0, baselineTotalPower: 0, growth: 0 }
  );
  return {
    tier,
    players: all.length,
    submitted: submitted.length,
    missing: all.length - submitted.length,
    categories,
    ...totals,
    growthPercent:
      totals.baselineTotalPower > 0 ? (totals.growth / totals.baselineTotalPower) * 100 : null,
  };
}

/**
 * Draws the combined leader board to a canvas and downloads it. Canvas rather
 * than a screenshot library: no dependency, no CSP exception, and the output is
 * identical regardless of the admin's theme, zoom, or viewport.
 */
export function drawVtsScoreLeaderCanvas(canvas, summary, options = {}) {
  const format = options.formatNumber || ((value) => String(value));
  const labelFor = options.labelFor || ((entry) => entry.label);
  const rowHeight = 46;
  const headerHeight = 132;
  const width = 900;
  const height = headerHeight + summary.categories.length * rowHeight + 58;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = '#0b1726';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(0, 0, width, 4);

  ctx.fillStyle = '#edf6ff';
  ctx.font = 'bold 30px Inter, system-ui, sans-serif';
  ctx.fillText(options.title || 'VtsScore — best growth', 32, 58);
  ctx.fillStyle = '#8fa8bc';
  ctx.font = '16px Inter, system-ui, sans-serif';
  ctx.fillText(options.subtitle || '', 32, 86);

  const columns = [32, 300, 520, 700];
  ctx.fillStyle = '#8fa8bc';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ['CATEGORY', 'PLAYER', 'GROWTH', 'GROWTH %'].forEach((heading, index) => {
    ctx.fillText(heading, columns[index], headerHeight - 14);
  });

  summary.categories.forEach((entry, index) => {
    const y = headerHeight + index * rowHeight;
    if (index % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(24, y - 22, width - 48, rowHeight - 6);
    }
    ctx.fillStyle = '#edf6ff';
    ctx.font = 'bold 17px Inter, system-ui, sans-serif';
    ctx.fillText(labelFor(entry), columns[0], y);
    ctx.font = '17px Inter, system-ui, sans-serif';
    ctx.fillText(entry.growthPlayer || '—', columns[1], y);
    ctx.fillStyle = entry.growth === null || entry.growth < 0 ? '#8fa8bc' : '#34d399';
    ctx.fillText(entry.growth === null ? '—' : `+${format(entry.growth)}`, columns[2], y);
    ctx.fillStyle = entry.growthPercent === null || entry.growthPercent < 0 ? '#8fa8bc' : '#34d399';
    ctx.fillText(
      entry.growthPercent === null ? '—' : `+${format(entry.growthPercent, 2)}%`,
      columns[3],
      y
    );
  });

  ctx.fillStyle = '#587086';
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillText(options.footer || '', 32, height - 22);
  return canvas;
}
