export const CONSISTENCY_CONFIDENT_HITS = 5;

function numericValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function scoreConsistencyValues(values = []) {
  const activeValues = (Array.isArray(values) ? values : [])
    .map(numericValue)
    .filter((value) => value > 0);
  if (activeValues.length < 2) return null;

  const avg = average(activeValues);
  const variance = average(activeValues.map((value) => Math.pow(value - avg, 2)));
  const coeff = avg ? Math.sqrt(variance) / avg : 99;
  const basePercent = Math.max(0, Math.round((1 - Math.min(coeff, 1)) * 100));
  const activityConfidence = Math.min(1, activeValues.length / CONSISTENCY_CONFIDENT_HITS);
  const percent = Math.max(0, Math.round(basePercent * activityConfidence));

  return {
    activeHits: activeValues.length,
    activeValues,
    basePercent,
    coeff,
    percent,
    total: activeValues.reduce((sum, value) => sum + value, 0),
  };
}

export function compareConsistencyScores(a, b) {
  return (
    b.percent - a.percent || a.coeff - b.coeff || b.activeHits - a.activeHits || b.total - a.total
  );
}
