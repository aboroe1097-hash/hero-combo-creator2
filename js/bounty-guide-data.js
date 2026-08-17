// js/bounty-guide-data.js
// Royal Bounty Eden X2 — structured guide content.
//
// Single source of truth for the Royal Bounty explainer inside the VTS Eden
// Hub. Transcribed from the community guide PDFs:
//   - Royal_Bounty_Updated_4-Oct-2024.pdf (10 pages, credited to
//     Ruby Sniper / ~MARSMAN~ OTA s90)
//   - Updated_Bounty_Heroes.pdf (Sept 5 2024 roster reference)
//
// The Updated_Bounty_Heroes.pdf roster screen carries the full Aiding Skill
// panel for every hero — type, effective range, troop it works on, target, the
// effect text, and the in-game unlock countdown. Those are transcribed here
// verbatim; nothing is inferred beyond them. Bump BOUNTY_GUIDE_VERSION when the
// roster or rules change.
//
// Figures in assets/bounty/ are cropped from the same PDFs.

export const BOUNTY_GUIDE_VERSION = '2024.10.04';
export const BOUNTY_GUIDE_SOURCE_DATE = '2026-08-14';
export const BOUNTY_GUIDE_ROSTER_DATE = '2024-09-05';
export const BOUNTY_GUIDE_CREDITS = ['Ruby Sniper', '~MARSMAN~ OTA s90'];

export const BOUNTY_STATS = [
  { value: '9', label: 'Bounty Heroes' },
  { value: '10', label: 'Commission Levels per hero' },
  { value: '6', label: 'Level needed to unlock an Aiding Skill' },
  { value: '10', label: 'Missions available per day' },
];

export const BOUNTY_LOOP = [
  {
    title: 'Mission Lobby',
    detail: 'Each bounty hero has a lobby that hands out hero-specific missions.',
  },
  { title: 'Accept Missions', detail: 'Pick up to 3 missions at a time from the mission pool.' },
  { title: 'Complete Activities', detail: 'Train troops, occupy territory, run quests, and more.' },
  { title: 'Earn Commission Points', detail: 'Every completed mission pays Commission Points.' },
  {
    title: 'Raise Commission Level',
    detail: "Points fill the hero's commission bar, level 1 to 10.",
  },
  {
    title: 'Unlock Attributes',
    detail: 'Each level improves attributes like Processing Speed, Might, and Resistance.',
  },
  { title: 'Reach Level 6', detail: "The milestone: the hero's Aiding Skill becomes available." },
  { title: 'Unlock Aiding Skill', detail: "A copy of the hero's skill that any legion can use." },
  { title: 'Assign to Legion', detail: 'Attach it to a legion slot and the skill becomes usable.' },
];

export const BOUNTY_MISSION_EXAMPLES = [
  'Complete common quest',
  'Train soldiers',
  'Occupy enemy territory',
  'Occupy territory multiple times',
  'Purchase items',
];

export const BOUNTY_DAILY_RULES = [
  { value: '10', label: 'missions per day' },
  { value: '3', label: 'active at once' },
  { value: 'Daily', label: 'reset refreshes the mission pool' },
  { value: 'Reroll', label: 'passes can be purchased for extra refreshes' },
];

export const BOUNTY_COMMISSION_LEVELS = [
  { level: 1, note: null },
  { level: 2, note: null },
  { level: 3, note: null },
  { level: 4, note: null },
  { level: 5, note: null },
  { level: 6, note: 'Aiding Skill unlocked' },
  { level: 7, note: null },
  { level: 8, note: null },
  { level: 9, note: null },
  { level: 10, note: null },
];

export const BOUNTY_COMMISSION_ATTRIBUTES = ['Processing Speed', 'Might', 'Resistance'];

export const BOUNTY_AIDING_RULES = [
  "Reach Commission Level 6 on a bounty hero to unlock a copy of that hero's skill for your legions.",
  'The relevant hero skill must be unlocked and maxed appropriately for the Aiding Skill to function.',
  'An Aiding Skill cannot be added to a legion that already contains that bounty hero.',
  'Only one Aiding Skill can be added to a legion.',
];

export const BOUNTY_SETUP_STEPS = [
  {
    step: 1,
    title: 'Open Legions',
    detail: 'Open your legion screen and tap the + slot to add a skill.',
  },
  {
    step: 2,
    title: 'Choose Aiding Skill',
    detail: "Pick the bounty hero's Aiding Skill from the skill-selection interface.",
  },
  {
    step: 3,
    title: 'Assign',
    detail: 'Attach it to the open slot — remember, only one Aiding Skill per legion.',
  },
  {
    step: 4,
    title: 'Confirm',
    detail: 'Confirm the legion and the Aiding Skill becomes usable in battle.',
  },
];

// Sept 5 2024 roster, transcribed from the Updated_Bounty_Heroes.pdf roster
// screen. `appName` maps the PDF name to the app roster for portraits,
// troop/season metadata, and Hero Atlas deep links. `unlockLabel` is the
// countdown shown under each portrait in that capture — relative to the season
// start, which is why the guide still tells you to confirm it in game.
//
// `wave` groups the heroes by the faction crest colour on the roster screen,
// which is also the order they open in.
export const BOUNTY_HEROES = [
  {
    id: 'cao-cao',
    pdfName: 'Cao Cao',
    appName: 'Cao Cao',
    tier: 'S',
    wave: 1,
    unlock: 'day1',
    unlockLabel: 'Day 1',
    skillName: 'Rampage',
    skillType: 'Leadership Skill (Active)',
    range: null,
    worksOn: null,
    target: "Hero's Legion",
    effect:
      "After using the skill, Hero's formation has 100% bonus marching speed and 70% bonus Footmen Might for 20min, on a 15hr cooldown. When not active, 50% of the effect is in use during combat.",
  },
  {
    id: 'the-brave',
    pdfName: 'The Brave',
    appName: 'The Brave',
    tier: 'S4',
    wave: 1,
    unlock: 'later',
    unlockLabel: '2d',
    skillName: 'Freezing Gaze',
    skillType: 'Pre-Battle Skills',
    range: 4,
    worksOn: 'Cavalry',
    target: '2 random enemy squad(s) within effective range',
    effect:
      'First 3 turns of the battle, 80% chance each turn to disarm 2 enemy squads within range.',
  },
  {
    id: 'cicero',
    pdfName: 'Cicero',
    appName: 'Cicero',
    tier: 'X',
    wave: 1,
    unlock: 'later',
    unlockLabel: '2d',
    skillName: 'Intermission',
    skillType: 'Combat Skill',
    range: 3,
    worksOn: 'Footmen',
    target: '2 random enemy squad(s) within effective range',
    effect:
      '60% chance to have 2 random enemy squads enter the armor break status, lowering defense by -200%, lasting 2 turns.',
  },
  {
    id: 'dach-tengri',
    pdfName: 'Dach Tengri',
    appName: 'Dach Tengri',
    tier: 'X',
    wave: 2,
    unlock: 'later',
    unlockLabel: '5d',
    skillName: 'The Gods Smite',
    skillType: 'Pre-Battle Skills',
    range: 5,
    worksOn: 'Footmen',
    target: '2 random enemy squad(s) within effective range',
    effect:
      'Starting turn 4, each turn there is a 70% chance to stop 2 random enemy squads within range from recovering troops, and to reduce the damage taken by 2 random friendly squads by -25%.',
  },
  {
    id: 'charles-the-great',
    pdfName: 'Charles the Great',
    appName: 'Charles the Great',
    tier: 'S',
    wave: 2,
    unlock: 'later',
    unlockLabel: '5d',
    skillName: 'Legend of Europe',
    skillType: 'Pre-Battle Skills',
    range: 3,
    worksOn: 'Archer',
    target: '2 random friendly squad(s) within effective range',
    effect:
      'For the first 4 rounds, increases the damage dealt by 2 random squads of your side by 20%, stackable up to 4 times till the battle ends.',
  },
  {
    id: 'avalanche',
    pdfName: 'Avalanche',
    appName: 'The Avalanche',
    tier: 'X',
    wave: 2,
    unlock: 'later',
    unlockLabel: '9d',
    skillName: 'Cavalry Awakened',
    skillType: 'Leadership Skill',
    range: null,
    worksOn: null,
    target: "Hero's Squad",
    effect:
      'Hero’s squad gains 20% increased Cavalry Might and Resistance, 10% increased Cavalry Damage, 300 increased Demolition Value, and a 250% increased effect for the skill "Dictator".',
  },
  {
    id: 'the-elk',
    pdfName: 'The Elk',
    appName: 'ELK',
    tier: 'X',
    wave: 3,
    unlock: 'later',
    unlockLabel: '16d',
    skillName: 'Fix Bayonets!',
    skillType: 'Pre-Battle Skills',
    range: 2,
    worksOn: 'Archer',
    target: '2 random friendly squad(s) within effective range',
    effect:
      'The first three turns, 2 random friendly squads have a 70% chance to be sober — immune to Silence, Disarm, Suppress and Confuse — and gain 55% increased Might.',
  },
  {
    id: 'sakura-blossom',
    pdfName: 'Sakura Blossom',
    appName: 'Sakura',
    tier: 'X',
    wave: 3,
    unlock: 'later',
    unlockLabel: '16d',
    skillName: 'Sannrennsoukatui',
    skillType: 'Pre-Battle Skills',
    range: 4,
    worksOn: 'Archer',
    target: '2 random enemy squad(s) within effective range',
    effect: 'First 3 turns, 2 random enemy squads take 50% additional damage.',
  },
  {
    id: 'rozen-blade',
    pdfName: 'Rozen Blade',
    appName: 'Rozen Blade',
    tier: 'S3',
    wave: 3,
    unlock: 'later',
    unlockLabel: '23d',
    skillName: 'Swarming Attack',
    skillType: 'Pre-Battle Skills',
    range: 3,
    worksOn: 'Cavalry',
    target: '3 random friendly squad(s) within effective range',
    effect:
      'During the first 3 turns, all friendly squads gain 100 Combat Speed and a 70% chance to deal 2 basic attacks each turn. Effects of the same type cannot be stacked.',
  },
];

// The roster screen groups the nine heroes into three unlock waves.
export const BOUNTY_WAVES = [
  { wave: 1, label: 'Opens first', detail: 'Cao Cao on day 1, the other two shortly after.' },
  { wave: 2, label: 'Mid season', detail: 'Opens around the first week.' },
  { wave: 3, label: 'Late season', detail: 'The last three, from roughly two weeks in.' },
];

// Figures cropped from the guide PDFs. Each renders as a <figure> with a
// caption, so it explains what it shows rather than sitting there decoratively.
export const BOUNTY_FIGURES = Object.freeze({
  lobbyMap: {
    src: 'assets/bounty/lobby-map.webp',
    width: 833,
    height: 1100,
    alt: 'A Mission Lobby on the Eden map showing its loyalty bar, coordinates and owning faction.',
    caption: 'A lobby on the map: capture it like a stronghold, then tile off it.',
  },
  lobbyPanel: {
    src: 'assets/bounty/lobby-panel.webp',
    width: 556,
    height: 1100,
    alt: "A bounty hero's lobby panel showing the Aiding Skill unlock banner, commission level bar and three accepted missions.",
    caption:
      'Inside a lobby: the Aiding Skill unlock banner, your commission level, and the mission list.',
  },
  missionExamples: {
    src: 'assets/bounty/mission-examples.webp',
    width: 1100,
    height: 399,
    alt: 'Six example bounty missions, each showing its Commission Point value and a timer.',
    caption: 'Missions vary in both the activity and the Commission Points they pay.',
  },
  rewards: {
    src: 'assets/bounty/rewards.webp',
    width: 1042,
    height: 420,
    alt: 'Commission Master reward items including a profile frame, chat bubble, Mark of Fall and gold.',
    caption:
      'Clear every Commission Master reward and the perfect-completion mail lands at season end.',
  },
});

export const BOUNTY_QUICK_RULES = [
  'Lobbies work like Eden strongholds: capture and connect them, then hold them for the +10% Commission Point buff.',
  "Cao Cao's lobby opens on day 1; the rest unlock later in the season — always read the in-game timer under each hero portrait.",
  'Level 6 is the payoff: attributes from every level, plus a usable Aiding Skill from level 6.',
  'Never trust the printed dates blindly — confirm lobby timers in-game each Eden season.',
];
