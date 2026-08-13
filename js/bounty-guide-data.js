// js/bounty-guide-data.js
// Royal Bounty Alliance — structured guide content.
//
// Single source of truth for the Royal Bounty explainer inside the VTS Eden
// Hub. Transcribed from the community guide PDFs:
//   - Royal_Bounty_Updated_4-Oct-2024.pdf (10 pages, credited to
//     Ruby Sniper / ~MARSMAN~ OTA s90)
//   - Updated_Bounty_Heroes.pdf (Sept 5 2024 roster reference)
//
// Facts that are NOT present in the source (exact skill effects, ranges,
// targets, and per-hero unlock days beyond Cao Cao) are intentionally left
// out rather than inferred. Bump BOUNTY_GUIDE_VERSION when the roster or
// rules change.

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

// Sept 5 2024 roster. `appName` maps the PDF name to the app roster for
// portraits, troop/season metadata, and Hero Atlas deep links.
export const BOUNTY_HEROES = [
  {
    id: 'cao-cao',
    pdfName: 'Cao Cao',
    appName: 'Cao Cao',
    tier: 'S',
    skillName: 'Rampage',
    unlock: 'day1',
  },
  {
    id: 'the-brave',
    pdfName: 'The Brave',
    appName: 'The Brave',
    tier: 'S4',
    skillName: 'Freezing Gaze',
    unlock: 'later',
  },
  {
    id: 'cicero',
    pdfName: 'Cicero',
    appName: 'Cicero',
    tier: 'X',
    skillName: 'Intermission',
    unlock: 'later',
  },
  {
    id: 'dach-tengri',
    pdfName: 'Dach Tengri',
    appName: 'Dach Tengri',
    tier: 'X',
    skillName: 'The Gods Smite',
    unlock: 'later',
  },
  {
    id: 'charles-the-great',
    pdfName: 'Charles the Great',
    appName: 'Charles the Great',
    tier: 'S',
    skillName: 'Legend of Europe',
    unlock: 'later',
  },
  {
    id: 'avalanche',
    pdfName: 'Avalanche',
    appName: 'The Avalanche',
    tier: 'X',
    skillName: 'Cavalry Awakened',
    unlock: 'later',
  },
  {
    id: 'sakura-blossom',
    pdfName: 'Sakura Blossom',
    appName: 'Sakura',
    tier: 'X',
    skillName: 'Sannrennsoukatui',
    unlock: 'later',
  },
  {
    id: 'rozen-blade',
    pdfName: 'Rozen Blade',
    appName: 'Rozen Blade',
    tier: 'S3',
    skillName: 'Swarming Attack',
    unlock: 'later',
  },
  {
    id: 'the-elk',
    pdfName: 'The Elk',
    appName: 'ELK',
    tier: 'X',
    skillName: 'Fix Bayonets!',
    unlock: 'later',
  },
];

export const BOUNTY_QUICK_RULES = [
  'Lobbies work like Eden strongholds: capture and connect them, then hold them for the +10% Commission Point buff.',
  "Cao Cao's lobby opens on day 1; the rest unlock later in the season — always read the in-game timer under each hero portrait.",
  'Level 6 is the payoff: attributes from every level, plus a usable Aiding Skill from level 6.',
  'Never trust the printed dates blindly — confirm lobby timers in-game each Eden season.',
];
