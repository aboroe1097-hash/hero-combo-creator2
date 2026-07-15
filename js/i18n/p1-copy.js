export const P1_COPY_KEYS = [
  'edenOwnershipFilterLabel',
  'edenTypeFilterLabel',
  'edenSortSelectLabel',
  'skipToCurrentTool',
  'edenX1RewardTieScoreContext',
  'edenX1HeatmapScrollHint',
];

export function p1Copy(values) {
  return Object.fromEntries(P1_COPY_KEYS.map((key, index) => [key, values[index]]));
}
