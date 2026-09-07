// Curated map of every user-facing tool in the VTS 1097 toolkit, served to
// Velo through the read-only get_toolkit_map tool so it can explain the app
// and route users to the right tab instead of guessing. Keep entries factual
// and short; hashes must match js/shell-v14.js internalHashes and page hrefs
// must be real deployed routes.
export const TOOLKIT_MAP_VERSION = '2026.08.14.1';

const entries = [
  {
    id: 'generator',
    name: 'Combo Generator',
    kind: 'tab',
    hash: 'generator',
    summary:
      'Select owned heroes and generate ranked or non-overlapping Front/Middle/Back combos from the community dataset.',
    answers: [
      'What combos can I build with my heroes?',
      'How do I tell Velo which heroes I own?',
    ],
    keywords: ['combo', 'generator', 'lineup', 'formation', 'owned heroes', 'selection'],
  },
  {
    id: 'manual',
    name: 'Manual Combo Builder',
    kind: 'tab',
    hash: 'manual',
    summary: 'Hand-build a three-hero formation and check it against the community rankings.',
    answers: ['Is this exact three-hero combo any good?'],
    keywords: ['manual', 'builder', 'custom combo', 'check combo'],
  },
  {
    id: 'heroes',
    name: 'Hero Atlas & Skin Atlas',
    kind: 'tab',
    hash: 'heroes',
    summary:
      'Browse every hero with placement, troop, season, and skills. The Heroes/Skins toggle opens the Skin Atlas with the three skin tiers (Mythic, Legendary, Everlasting) and their star-up costs.',
    answers: [
      'What does this hero do?',
      'What skins exist and what does upgrading them cost?',
    ],
    keywords: ['hero', 'atlas', 'skills', 'skin', 'skin atlas', 'tiers', 'mythic', 'legendary', 'everlasting'],
  },
  {
    id: 'research',
    name: 'Research Planner',
    kind: 'tab',
    hash: 'research',
    summary:
      'The full research catalog with known medal costs, deterministic priorities, and saved personal progress.',
    answers: ['What should I research next?', 'How far is my research?'],
    keywords: ['research', 'medals', 'war badges', 'courage', 'priorities', 'progress'],
  },
  {
    id: 'materials',
    name: 'Dragon Master Materials',
    kind: 'tab',
    hash: 'materials',
    summary:
      'Exact Dragon Master gear costs by blue/purple/gold route, plus separate saved campaign progress and per-slot inventory needs with stockpile shortfalls.',
    answers: ['What does a full DM set cost?', 'How much is missing from my DM plan?'],
    keywords: ['dragon master', 'dm', 'materials', 'gear', 'set', 'diamonds', 'gems'],
  },
  {
    id: 'strife',
    name: 'Strife Guide',
    kind: 'tab',
    hash: 'strife',
    summary:
      'Season-by-season Strife monsters (through X2) with their skills and supported counter formations.',
    answers: ['Which combo beats the current Strife boss?'],
    keywords: ['strife', 'boss', 'monster', 'dragon', 'fordogreen', 'counter'],
  },
  {
    id: 'specialization',
    name: 'Specialization Towers',
    kind: 'tab',
    hash: 'specialization',
    summary:
      'The Season 3 / SX1 Specialization Towers: eight columns of researches per troop type, node graphs, medal costs, milestones, Legion Skills, a community medal-cost contribution form, and a Hero Plan Auto-Path that orders researches from the owned heroes selected in the Combo Generator.',
    answers: [
      'Where do I plan my specialization medals?',
      'What unlocks a Legion Skill?',
      'Which research order fits the heroes I own?',
    ],
    keywords: [
      'specialization',
      'spec',
      'towers',
      'legion skill',
      'medals',
      'columns',
      'sx1',
      'auto-path',
      'auto path',
      'hero plan',
    ],
  },
  {
    id: 'edenMap',
    name: 'VTS Eden Hub',
    kind: 'tab',
    hash: 'edenMap',
    summary:
      'The Eden hub with three sub-tabs: the interactive Eden map (layers, guild intel, route planning), the Eden Loyalty calculator, and Previous Seasons with the Eden X1 rankings archive.',
    answers: [
      'Where is a tile or site on the Eden map?',
      'What loyalty do I need for a T-site?',
      'Where is the Eden X1 ranking?',
    ],
    keywords: [
      'eden',
      'hub',
      'map',
      'tiles',
      'planner',
      'routes',
      'loyalty',
      'extraction',
      'bounty',
      'royal bounty',
      'aiding skill',
      'previous seasons',
      'x1',
      'rankings',
    ],
  },
  {
    id: 'arcade',
    name: 'Arcade',
    kind: 'page',
    href: 'arcade.html',
    summary:
      'Community mini-games with a shared leaderboard across all five games and an overall sum ranking.',
    answers: ['Where are the mini-games?', 'Who leads the Arcade leaderboard?'],
    keywords: ['arcade', 'games', 'leaderboard', 'merge rush', 'sort hoard', 'crystal relay', 'set assembly', 'hero rumble', 'high score'],
  },
  {
    id: 'edenX1',
    name: 'Eden X1 Dashboard',
    kind: 'page',
    href: 'eden-x1.html',
    summary:
      'Public Eden X1 leaderboard, scoring, contribution breakdowns, reward flow, and Team Players voting.',
    answers: ['Where is the Eden X1 ranking?', 'How do I vote for Team Players?'],
    keywords: ['eden', 'x1', 'leaderboard', 'ranking', 'voting', 'rewards', 'contribution'],
  },
  {
    id: 'battleSimulator',
    name: 'Battle Simulator',
    kind: 'page',
    href: 'battle-simulator.html',
    summary:
      'Simulates legion stats with per-stat source breakdowns across research and equipment loadouts (set, grade, enhancement).',
    answers: ['How strong is my legion with this research and equipment?'],
    keywords: ['battle', 'simulator', 'sim', 'stats', 'equipment', 'loadout'],
  },
  {
    id: 'velo',
    name: 'Talk with Velo',
    kind: 'drawer',
    summary:
      'This assistant (build Velo b0.4), opened from the floating launcher. Velo gives answer-first, read-only help from app data and curated VTS guide knowledge in all eleven app languages.',
    answers: ['What can Velo do?', 'What Velo version is this?'],
    keywords: ['velo', 'assistant', 'ai', 'chat', 'help', 'version', 'b0.4'],
  },
];

export const TOOLKIT_MAP = Object.freeze(
  entries.map((entry) =>
    Object.freeze({
      ...entry,
      answers: Object.freeze([...entry.answers]),
      keywords: Object.freeze([...entry.keywords]),
    })
  )
);
