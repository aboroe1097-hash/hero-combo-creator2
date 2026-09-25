// Curated map of every user-facing tool in the VTS 1097 toolkit, served to
// Velo through the read-only get_toolkit_map tool so it can explain the app
// and route users to the right tab instead of guessing. Keep entries factual
// and short. A hash is "<tab>" or "<tab>?subtab=<name>" and must be a tab or
// legacy hash the shell (js/shell-v14.js) and app (js/app.js) resolve, with a
// sub-tab its hub controller lists; an href must be a deployed page, with an
// optional #fragment that exists on it. tests/unit/velo-toolkit-map.test.mjs
// checks every route against the source.
export const TOOLKIT_MAP_VERSION = '2026.09.25.1';

const entries = [
  {
    id: 'generator',
    name: 'Combo Generator',
    kind: 'tab',
    hash: 'generator',
    summary:
      'Select owned heroes and generate ranked or non-overlapping Front/Middle/Back combos from the community dataset. The database also carries the X8 catch-up lineups: they only appear when the player owns the X8 heroes (and ticks X8 in the season strip), so they change nothing for anyone without them.',
    answers: [
      'What combos can I build with my heroes?',
      'How do I tell Velo which heroes I own?',
    ],
    keywords: ['combo', 'generator', 'lineup', 'formation', 'owned heroes', 'selection', 'x8', 'catch-up'],
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
    id: 'classDevelopment',
    name: 'Class Development Hub',
    kind: 'tab',
    hash: 'classDevelopment',
    summary:
      'Compare Raider, Farmer, Trader, and Craftsman profession paths; enter a current class level to find the next reset checkpoint and review source-backed priority paths.',
    answers: [
      'When should I reset my class points next?',
      'Which profession class path fits my goal?',
    ],
    keywords: [
      'class development',
      'profession',
      'reset',
      'raider',
      'farmer',
      'trader',
      'craftsman',
      'architect',
      'builder',
    ],
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
      'The Eden hub: the interactive Eden map (layers, guild intel, route planning), Eden Pathing, the Eden Loyalty calculator, the Operations Lab, Royal Bounty, the Eden playbook, the current season, Previous Seasons with the Eden X1 rankings archive, and PDFs.',
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
    id: 'edenPathing',
    name: 'Eden Pathing',
    kind: 'tab',
    hash: 'edenHub?subtab=pathing',
    summary:
      'Draw pathing routes on the Eden map (start, waypoints, destination, gates) and get the tile count and pathers needed. The confirmed rule is 40 tiles per pather, one pather per started block of 40 tiles. Plans save on the device and share as a link.',
    answers: ['How many pathers does this route need?', 'Where do I plan an Eden path?'],
    keywords: [
      'pathing',
      'pather',
      'pathers',
      'path',
      'route',
      'tiles',
      'eden',
      'gate',
      '40 tiles',
    ],
  },
  {
    id: 'edenOperations',
    name: 'Eden Operations Lab',
    kind: 'tab',
    hash: 'edenHub?subtab=operations',
    summary:
      'Eden operations planning: siege staffing per objective (required attackers and support, banner variants) with staffing counters shared by the whole alliance, plus specialty, training, building-upgrade and tiling calculators. Any signed-in visitor reads the counters; only admins change them.',
    answers: [
      'How many attackers and support does this gate need?',
      'How many players are assigned to an objective?',
    ],
    keywords: [
      'operations',
      'ops lab',
      'operations lab',
      'staffing',
      'attackers',
      'support',
      'siege',
      'objective',
      'banner',
      'counters',
    ],
  },
  {
    id: 'buildings',
    name: 'Buildings planner',
    kind: 'tab',
    hash: 'researchTowers?subtab=buildings',
    summary:
      'Research & Towers ▸ Buildings (the same planner is mounted in Planners ▸ Castle and the More menu): Castle 26–30 per-level resource costs and the all-buildings 26–30 lookup with prerequisites and Orichalcum, transcribed from the community Google Sheet. Blank sheet cells stay unknown.',
    answers: [
      'What does Castle 27 to 30 cost?',
      'What are the prerequisites and Orichalcum for a building?',
    ],
    keywords: [
      'buildings',
      'building',
      'castle',
      'castle 26',
      'castle 30',
      'orichalcum',
      'prerequisite',
      'upgrade cost',
      'planner',
    ],
  },
  {
    id: 'hubPdfs',
    name: 'Hub PDF tabs',
    kind: 'tab',
    hash: 'heroesCombos?subtab=pdfs',
    alsoAt: ['researchTowers?subtab=pdfs', 'edenHub?subtab=pdfs', 'classDevelopment'],
    summary:
      'Each hub (Heroes & Combos, Research & Towers, Eden, Class Development) has a PDFs tab that builds its tables on one screen in a dark or light theme, with direct PDF and PNG downloads and no print dialog.',
    answers: ['Can I download this hub as a PDF or PNG?', 'Is there a light-theme PDF?'],
    keywords: [
      'pdf',
      'pdfs',
      'png',
      'download',
      'export',
      'light theme',
      'dark theme',
      'sheet',
      'hub',
    ],
  },
  {
    id: 'vtsScore',
    name: 'VtsScore · Competition #12',
    kind: 'page',
    href: 'vtsscore.html',
    summary:
      'Competition #12 (pre-season prep). Members unlock with the member PIN, register by reading the Lord Info → Power screenshot (checked before saving), choose BoH and Epic Showdown active times, then re-upload in the re-upload window. The phases (registration, final check, waiting, re-upload, results, winners) run on game time (UTC−2), and the growth board ranks Total Castle Power growth from each baseline (the 2026 VtsScore upload or the sign-up).',
    answers: [
      'When does Competition #12 registration or re-upload close?',
      'How do I register for Competition #12?',
      'Where is the growth board?',
    ],
    keywords: [
      'vtsscore',
      'competition',
      'competition #12',
      'registration',
      'register',
      'sign up',
      're-upload',
      'reupload',
      'growth',
      'power screenshot',
      'lord info',
      'baseline',
      'deadline',
    ],
  },
  {
    id: 'edenX2Season',
    name: 'Eden X2 season',
    kind: 'page',
    href: 'eden-x2.html',
    summary:
      'The current Eden X2 season page: leaderboard, contribution and duty scoring, reward flow and Team Players voting. It is also embedded as the Eden hub Season sub-tab (short links #season and #vote).',
    answers: ['Where is the current Eden season ranking?', 'How do I vote this season?'],
    keywords: [
      'eden',
      'x2',
      'season',
      'current season',
      'leaderboard',
      'ranking',
      'vote',
      'voting',
      'rewards',
      'contribution',
    ],
  },
  {
    id: 'complaints',
    name: 'Issue or Complaint form',
    kind: 'page',
    href: 'eden-x2.html#edenX1Complaints',
    summary:
      'The Issue or Complaint form for reporting a problem to the developers and leadership. Every page footer\'s "Contact Devs" link opens it.',
    answers: ['How do I report a problem or complaint?', 'How do I contact the devs?'],
    keywords: [
      'complaint',
      'issue',
      'report',
      'problem',
      'bug',
      'contact',
      'contact devs',
      'feedback',
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
    id: 'edenSiege',
    name: "Velo's Rampart",
    kind: 'page',
    href: 'eden-siege.html',
    summary:
      "Velo's Rampart (formerly Eden Siege): a real-time Ice & Fire arena game. Play Velo, hold the stronghold, raise five-tier towers, beat warlord bosses, try the Daily Siege shared seed or Endless mode.",
    answers: ['Is there a real-time game?', 'What is the Daily War?', "How do I play Velo's Rampart?"],
    keywords: ['eden siege', 'siege', 'game', 'arena', 'tower defense', 'velo', 'daily siege', 'endless', 'warlord', 'play'],
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
    id: 'downloads',
    name: 'Community Downloads',
    kind: 'page',
    href: 'downloads.html',
    summary:
      'Every data breakdown the site holds as a downloadable PDF — research costs, Unit Specialisation medals, Eden tables, Dragon Master costs, and the hero roster by season.',
    answers: [
      'Where can I download the cost tables?',
      'Can I get the research or medal lists as a PDF?',
    ],
    keywords: ['downloads', 'download', 'pdf', 'export', 'print', 'research costs', 'medals', 'eden tables', 'dragon master', 'roster'],
  },
  {
    id: 'velo',
    name: 'Talk with Velo',
    kind: 'drawer',
    summary:
      "This assistant (build Velo 1.0), opened from the floating launcher or the command palette. Velo gives answer-first, read-only help from app data and curated VTS guide knowledge in all twelve Velo languages, shows a Competition #12 deadline line when a phase closes within 48 hours, and ends answers with buttons that open the right tool. With the My Competition #12 permission it can read a signed-in member's own registration.",
    answers: ['What can Velo do?', 'What Velo version is this?'],
    keywords: ['velo', 'assistant', 'ai', 'chat', 'help', 'version', '1.0'],
  },
];

export const TOOLKIT_MAP = Object.freeze(
  entries.map((entry) =>
    Object.freeze({
      ...entry,
      answers: Object.freeze([...entry.answers]),
      keywords: Object.freeze([...entry.keywords]),
      ...(entry.alsoAt ? { alsoAt: Object.freeze([...entry.alsoAt]) } : {}),
    })
  )
);
