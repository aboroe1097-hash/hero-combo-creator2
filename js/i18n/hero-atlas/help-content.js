export const HERO_SKILL_TYPE_HELP = Object.freeze({
  'Active Skill':
    'A skill that can trigger during battle when its conditions and chance roll are met.',
  'Additional Attack':
    'Adds or modifies normal attacks, often creating extra hits or effects after attacks.',
  'Combat Skill':
    'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.',
  'Leadership Skill':
    'A commander-style passive effect that usually applies as long as the hero is in the legion.',
  'Pre-Battle Skills':
    'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.',
  'Status Skill':
    'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.',
});

export const HERO_SKILL_TERM_HELP = Object.freeze({
  'Armor break': 'Reduces defensive value, making affected squads take more damage.',
  Bleeding: 'A damage-over-time style status that keeps hurting the affected squad while active.',
  Chain: 'Damage or effects can jump from one squad to another.',
  Clarity: 'A cleansing or control-resistance state that helps remove or avoid negative effects.',
  'Combat Skill Damage': 'Damage dealt specifically by combat skills, not normal attacks.',
  Confuse: 'Affected squad may attack or cast skills on random targets.',
  Confused: 'Affected squad may attack or cast skills on random targets.',
  'Control Debuff': 'A disabling status such as Silence, Disarm, Suppress, or Confuse.',
  'Counter-attack': 'Deals damage back after being attacked or after a matching trigger.',
  Counterattack: 'Deals damage back after being attacked or after a matching trigger.',
  Cursed: 'Punishes the affected squad when it performs certain actions, often skill casting.',
  'Destructive Strike':
    'A special damage effect that can bypass or punish defenses depending on the skill.',
  Disarm: 'Prevents normal attacks while active.',
  Disarmed: 'Prevents normal attacks while active.',
  Dodge: 'Avoids an incoming damage instance or attack while active.',
  Dodging: 'Avoids an incoming damage instance or attack while active.',
  'Fatal Blow':
    'A special strike effect with its own chance and damage rate, often scaling with buffs.',
  Faltering: 'A weakening status that reduces effectiveness while active.',
  Feverish:
    'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.',
  'First-Aid': 'Healing or recovery effect that restores troop power.',
  'First to Attack':
    'Acts before enemy squads, which can unlock extra skill effects for some heroes.',
  Flammable: 'A status that makes the target vulnerable to fire-related effects.',
  Healing: 'Restores troop power to one or more squads.',
  Interrupting: 'Stops a channeling or prep skill before it completes.',
  'Mass Attack': 'A normal attack state that hits additional enemy squads beyond the main target.',
  'Normal Attack': 'The basic attack a squad performs without casting a combat skill.',
  'Physical Damage': 'Damage type usually tied to normal or physical strikes.',
  Poisoned: 'A damage-over-time status that keeps hurting the affected squad while active.',
  'Prep Skills': 'Skills that need one or more rounds of preparation before firing.',
  Recovery: 'Restores troop power; usually shown as a recovery rate.',
  Revived: 'Returns or restores a defeated or heavily damaged squad effect depending on the skill.',
  Silence: 'Prevents combat skill casting while active.',
  Silenced: 'Prevents combat skill casting while active.',
  'Skill Damage': 'Damage dealt by a skill rather than a normal attack.',
  Sober:
    'A control-immunity or cleansing state; usually protects from disabling effects for its duration.',
  Splash: 'Damage spills onto nearby or additional squads.',
  Suppress: 'Prevents the squad from acting or casting depending on the skill wording.',
  Suppressed: 'Prevents the squad from acting or casting depending on the skill wording.',
  Taunt: 'Forces or redirects enemy attacks toward the taunting squad.',
  Taunting: 'Forces or redirects enemy attacks toward the taunting squad.',
  'Troop Recovery Block': 'Prevents affected squads from recovering troop power while active.',
  Vulnerable: 'Affected squad takes more damage or loses protection while active.',
});

export const HERO_SKILL_HELP_STRINGS = Object.freeze([
  ...Object.keys(HERO_SKILL_TYPE_HELP),
  ...Object.values(HERO_SKILL_TYPE_HELP),
  ...Object.keys(HERO_SKILL_TERM_HELP),
  ...Object.values(HERO_SKILL_TERM_HELP),
]);
