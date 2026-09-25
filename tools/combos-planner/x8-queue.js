// tools/combos-planner/x8-queue.js
//
// Combos to rank and add. List X8 lineups here — three heroes in Front / Middle /
// Back order — and the planner shows each one in its "To place" list until the
// same three heroes and skin code are in js/combos-db.js. The planner only reads
// this file, so it is safe to keep as your working list; a lineup that is already
// in the database is skipped, and the planner says which lines it skipped.
//
// skin: three digits, one per hero in that order — 3 the skin must be owned,
// 2 the skin is recommended, 1 the skin is optional (e.g. '222'), or leave it out.
//
// source: free text, shown nowhere yet; use it to remember where a lineup came from.
export const lanes = [
  // { heroes: ['Warden', 'Ramses II', 'Beowulf'], skin: '222', source: 'screenshot 2026-09-25' },
];
