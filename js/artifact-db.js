// js/artifact-db.js
// Rise of Castles Artifact Database
// Sourced from official community sheets: Artifact One - Redemption Grail

/**
 * @typedef {Object} ArtifactResource
 * @property {string} id
 * @property {string} name
 * @property {string} shortName
 * @property {number} dailyReward
 * @property {string} source
 */

/**
 * @typedef {Object} ArtifactNode
 * @property {string} id - Unique identifier (e.g. "rg_1_0")
 * @property {string} code - Display code / index from sheet (e.g. "1", "1.1a", "-")
 * @property {string} name - Display name of the node
 * @property {'RGE' | 'AS'} resource - Resource type needed for upgrades
 * @property {number} maxLevel - Maximum level (10, 20, 25, 50)
 * @property {number[]} costs - Costs per level (1-indexed progression)
 * @property {string} buff - Base buff description
 * @property {string|null} permanentAttribute - Permanent attribute activated when node is maxed
 * @property {'root' | 'a' | 'b' | 'shared'} branch - Branch orientation: root (main skill), a (offensive/might), b (defensive/resistance), shared
 * @property {number} tier - Tier/Stage level (1 to 4)
 * @property {string} [category] - Optional category tag: skill, might, resistance, hp, speed, amp, utility
 * @property {string} [statType] - Stat identifier for dynamic accumulation
 * @property {number} [statPerLevel] - Numerical value per level if linear
 * @property {string} [statUnit] - Unit (%, flat)
 */

/**
 * @typedef {Object} ArtifactTier
 * @property {number} tier
 * @property {string} name
 * @property {string} subtitle
 * @property {string} description
 * @property {ArtifactNode[]} nodes
 */

/**
 * @typedef {Object} ArtifactItem
 * @property {string} id
 * @property {number} number
 * @property {string} name
 * @property {string} title
 * @property {string} subtitle
 * @property {string} description
 * @property {string} icon
 * @property {Record<string, ArtifactResource>} resources
 * @property {ArtifactTier[]} tiers
 */

export const ARTIFACT_RESOURCES = Object.freeze({
  RGE: Object.freeze({
    id: 'RGE',
    name: 'Redemption Grail Emblem',
    shortName: 'RGE',
    dailyReward: 4,
    source: 'Daily CoP Chests (4/day)',
    color: '#f59e0b',
    icon: 'emblem',
  }),
  AS: Object.freeze({
    id: 'AS',
    name: 'Artifact Soulstone',
    shortName: 'AS',
    dailyReward: 80,
    source: 'Daily CoP Chests (80/day)',
    color: '#38bdf8',
    icon: 'soulstone',
  }),
});

export const ARTIFACT_PROGRESS_STORAGE_KEY = 'vts_artifact_progress_redemption-grail_v1';

export const ARTIFACT_DATABASE = Object.freeze([
  {
    id: 'redemption-grail',
    number: 1,
    name: 'Redemption Grail',
    title: 'Artifact One: Redemption Grail',
    subtitle: 'Sacred Light & Flame Artifact System',
    description:
      'In even rounds, chance to remove the buffs provided by dead enemy heroes to all enemy squads (including undispellable buffs).',
    farmingNote:
      'Permanent Attributes activate when their respective node reaches maximum level. Daily rewards from CoP Chests grant 4 RGE and 80 AS.',
    icon: 'grail',
    resources: ARTIFACT_RESOURCES,
    tiers: Object.freeze([
      {
        tier: 1,
        name: 'Tier 1: Sacred Light',
        subtitle: 'Initial blessing and tactical foundation',
        description:
          'Unlock the Redemption Grail core power with front-row might/resistance amplifications and balanced survivability.',
        nodes: Object.freeze([
          {
            id: 'rg_1_0',
            code: '1',
            name: 'Redemption - Sacred Light',
            resource: 'RGE',
            maxLevel: 10,
            costs: Object.freeze([4, 8, 12, 20, 28, 40, 52, 68, 84, 100]),
            buff: 'In even rounds, 50% chance to remove the buffs provided by dead enemy heroes to all enemy squads (including the undispellable buffs)',
            permanentAttribute: "Artifact's Damage Boost +10%",
            branch: 'root',
            tier: 1,
            category: 'skill',
            statType: 'artifact_damage_boost',
            statUnit: '%',
          },
          {
            id: 'rg_1_1a',
            code: '1.1a',
            name: 'Might Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]),
            buff: 'Might +10%',
            permanentAttribute: null,
            branch: 'a',
            tier: 1,
            category: 'might',
            statType: 'might',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_1_2a',
            code: '1.2a',
            name: 'Damage Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]),
            buff: 'Damage +5%',
            permanentAttribute: null,
            branch: 'a',
            tier: 1,
            category: 'damage',
            statType: 'damage',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_1_amp_a',
            code: '1.amp_a',
            name: 'Impact Amplification',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([30, 60, 90, 120, 165, 210, 255, 315, 375, 750]),
            buff: 'Basic Sacred Might +50',
            permanentAttribute: "Front-row squad's Might +10%",
            branch: 'a',
            tier: 1,
            category: 'amp',
            statType: 'sacred_might',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_1_3a',
            code: '1.3a',
            name: 'Higher HP',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]),
            buff: 'HP +5%',
            permanentAttribute: null,
            branch: 'a',
            tier: 1,
            category: 'hp',
            statType: 'hp',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_1_1b',
            code: '1.1b',
            name: 'Resistance Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]),
            buff: 'Resistance +10%',
            permanentAttribute: null,
            branch: 'b',
            tier: 1,
            category: 'resistance',
            statType: 'resistance',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_1_2b',
            code: '1.2b',
            name: 'Immunity Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]),
            buff: 'Damage Taken -5%',
            permanentAttribute: null,
            branch: 'b',
            tier: 1,
            category: 'immunity',
            statType: 'damage_taken',
            statPerLevel: -0.5,
            statUnit: '%',
          },
          {
            id: 'rg_1_amp_b',
            code: '1.amp_b',
            name: 'Dispelling Amplification',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([30, 60, 90, 120, 165, 210, 255, 315, 375, 750]),
            buff: 'Basic Sacred Resistance +50',
            permanentAttribute: "Front-row squad's Resistance +10%",
            branch: 'b',
            tier: 1,
            category: 'amp',
            statType: 'sacred_resistance',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_1_3b',
            code: '1.3b',
            name: 'Higher HP',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([20, 40, 60, 80, 100, 120, 140, 160, 180, 200]),
            buff: 'HP +5%',
            permanentAttribute: null,
            branch: 'b',
            tier: 1,
            category: 'hp',
            statType: 'hp',
            statPerLevel: 0.5,
            statUnit: '%',
          },
        ]),
      },
      {
        tier: 2,
        name: 'Tier 2: Sacred Flame',
        subtitle: 'Advanced prowess and mid-tier specialization',
        description:
          'Deepen artifact mastery with mid-row amplifications, speed, fatal blow & destructive strike immunities, leading to Holy & Enhanced Grail apexes.',
        nodes: Object.freeze([
          {
            id: 'rg_2_0',
            code: '2',
            name: 'Redemption - Sacred Flame',
            resource: 'RGE',
            maxLevel: 20,
            costs: Object.freeze([
              8, 12, 16, 24, 32, 40, 52, 64, 76, 88, 100, 100, 100, 100, 100, 100, 100, 100, 100,
              100,
            ]),
            buff: 'In even rounds, 50% chance to remove the buffs provided by dead enemy heroes to all enemy squads',
            permanentAttribute: "Artifact's Damage Mitigation +10%",
            branch: 'root',
            tier: 2,
            category: 'skill',
            statType: 'artifact_damage_mitigation',
            statUnit: '%',
          },
          {
            id: 'rg_2_1a',
            code: '2.1a',
            name: 'Might Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Might +10%',
            permanentAttribute: null,
            branch: 'a',
            tier: 2,
            category: 'might',
            statType: 'might',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_2_amp_a1',
            code: '2.amp_a1',
            name: 'Assault Amplification',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([50, 100, 150, 200, 275, 350, 425, 525, 625, 1250]),
            buff: 'Basic Sacred Might +50',
            permanentAttribute: "Mid-row squad's Might +10%",
            branch: 'a',
            tier: 2,
            category: 'amp',
            statType: 'sacred_might',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_2_2a',
            code: '2.2a',
            name: 'Higher HP',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'HP +5%',
            permanentAttribute: null,
            branch: 'a',
            tier: 2,
            category: 'hp',
            statType: 'hp',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_2_amp_a2',
            code: '2.amp_a2',
            name: 'Penetration Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([50, 100, 150, 200, 275, 350, 425, 525, 625, 1250]),
            buff: 'Basic Sacred Might +50',
            permanentAttribute: 'Siege Attacker HP +10%',
            branch: 'a',
            tier: 2,
            category: 'amp',
            statType: 'sacred_might',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_2_3a',
            code: '2.3a',
            name: 'Quick Enhancement',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Combat Speed +10',
            permanentAttribute: null,
            branch: 'a',
            tier: 2,
            category: 'speed',
            statType: 'speed',
            statPerLevel: 1,
            statUnit: '',
          },
          {
            id: 'rg_2_4a',
            code: '2.4a',
            name: 'Weapon Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Tactical Might +10%',
            permanentAttribute: null,
            branch: 'a',
            tier: 2,
            category: 'might',
            statType: 'tactical_might',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_2_5a',
            code: '2.5a',
            name: 'Chest Armor Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Fatal Blow Immunity',
            permanentAttribute: null,
            branch: 'a',
            tier: 2,
            category: 'utility',
            statType: 'fatal_blow_immunity',
            statUnit: '',
          },
          {
            id: 'rg_3_0a',
            code: '3.0a',
            name: 'Redemption - Holy Grail',
            resource: 'RGE',
            maxLevel: 25,
            costs: Object.freeze([
              16, 20, 24, 28, 32, 40, 48, 56, 64, 76, 88, 100, 112, 125, 125, 125, 125, 125, 125,
              125, 125, 125, 125, 125, 125,
            ]),
            buff: 'When using the Redemption Grail, your Artifacts Sacred Might -25%, Sacred Resistance -25%',
            permanentAttribute: 'Basic Sacred Might +100',
            branch: 'a',
            tier: 2,
            category: 'apex',
            statType: 'sacred_might',
            statUnit: '',
          },
          {
            id: 'rg_2_1b',
            code: '2.1b',
            name: 'Resistance Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Resistance +10%',
            permanentAttribute: null,
            branch: 'b',
            tier: 2,
            category: 'resistance',
            statType: 'resistance',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_2_amp_b1',
            code: '2.amp_b1',
            name: 'Guard Amplification',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([50, 100, 150, 200, 275, 350, 425, 525, 625, 1250]),
            buff: 'Basic Sacred Resistance +50',
            permanentAttribute: "Mid row squad's Resistance +10%",
            branch: 'b',
            tier: 2,
            category: 'amp',
            statType: 'sacred_resistance',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_2_2b',
            code: '2.2b',
            name: 'Higher HP',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'HP +5%',
            permanentAttribute: null,
            branch: 'b',
            tier: 2,
            category: 'hp',
            statType: 'hp',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_2_amp_b2',
            code: '2.amp_b2',
            name: 'Armor Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([50, 100, 150, 200, 275, 350, 425, 525, 625, 1250]),
            buff: 'Basic Sacred Resistance +50',
            permanentAttribute: 'Siege Defender HP +10%',
            branch: 'b',
            tier: 2,
            category: 'amp',
            statType: 'sacred_resistance',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_2_3b',
            code: '2.3b',
            name: 'Quick Enhancement',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Combat Speed +10',
            permanentAttribute: null,
            branch: 'b',
            tier: 2,
            category: 'speed',
            statType: 'speed',
            statPerLevel: 1,
            statUnit: '',
          },
          {
            id: 'rg_2_4b',
            code: '2.4b',
            name: 'Stronger Prowess',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Tactical Resistance +10%',
            permanentAttribute: null,
            branch: 'b',
            tier: 2,
            category: 'resistance',
            statType: 'tactical_resistance',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_2_5b',
            code: '2.5b',
            name: 'Parrying Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([40, 80, 120, 160, 200, 240, 280, 320, 360, 400]),
            buff: 'Destructive Strike Immunity +10%',
            permanentAttribute: null,
            branch: 'b',
            tier: 2,
            category: 'utility',
            statType: 'destructive_strike_immunity',
            statPerLevel: 1,
            statUnit: '%',
          },
          {
            id: 'rg_3_0b',
            code: '3.0b',
            name: 'Redemption - Enhanced Grail',
            resource: 'RGE',
            maxLevel: 25,
            costs: Object.freeze([
              16, 20, 24, 28, 32, 40, 48, 56, 64, 76, 88, 100, 112, 125, 125, 125, 125, 125, 125,
              125, 125, 125, 125, 125, 125,
            ]),
            buff: 'When using the Redemption Grail, your Artifacts crit rate +25%, combo rate +25%',
            permanentAttribute: 'Basic Sacred Resistance +100',
            branch: 'b',
            tier: 2,
            category: 'apex',
            statType: 'sacred_resistance',
            statUnit: '',
          },
        ]),
      },
      {
        tier: 3,
        name: 'Tier 3: Holy Transcendence',
        subtitle: 'Deep combat enhancements and back-row amplifications',
        description:
          'Ascend through high-tier might, resistance, back-row buffs, Reign of Chaos HP, and battlefield endurance.',
        nodes: Object.freeze([
          {
            id: 'rg_3_1a',
            code: '3.1a',
            name: 'Tougher Assault',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Might +15%',
            permanentAttribute: null,
            branch: 'a',
            tier: 3,
            category: 'might',
            statType: 'might',
            statPerLevel: 1.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_amp_a1',
            code: '3.amp_a1',
            name: 'Wrath Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([90, 180, 270, 360, 495, 630, 765, 945, 1125, 2250]),
            buff: 'Basic Sacred Might +50',
            permanentAttribute: "Back row squad's Might +10%",
            branch: 'a',
            tier: 3,
            category: 'amp',
            statType: 'sacred_might',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_3_2a',
            code: '3.2a',
            name: 'Higher HP',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'HP +5%',
            permanentAttribute: null,
            branch: 'a',
            tier: 3,
            category: 'hp',
            statType: 'hp',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_3a',
            code: '3.3a',
            name: 'Morale Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Tactical Might +15%',
            permanentAttribute: null,
            branch: 'a',
            tier: 3,
            category: 'might',
            statType: 'tactical_might',
            statPerLevel: 1.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_amp_a2',
            code: '3.amp_a2',
            name: 'Divine Punishment Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([90, 180, 270, 360, 495, 630, 765, 945, 1125, 2250]),
            buff: 'Basic Sacred Might +50',
            permanentAttribute: 'HP in non-siege battles +10%',
            branch: 'a',
            tier: 3,
            category: 'amp',
            statType: 'sacred_might',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_3_4a',
            code: '3.4a',
            name: 'Damage Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Damage +5%',
            permanentAttribute: null,
            branch: 'a',
            tier: 3,
            category: 'damage',
            statType: 'damage',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_1b',
            code: '3.1b',
            name: 'Protection Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Resistance +15%',
            permanentAttribute: null,
            branch: 'b',
            tier: 3,
            category: 'resistance',
            statType: 'resistance',
            statPerLevel: 1.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_amp_b1',
            code: '3.amp_b1',
            name: 'Divine Grace Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([90, 180, 270, 360, 495, 630, 765, 945, 1125, 2250]),
            buff: 'Basic Sacred Resistance +50',
            permanentAttribute: "Back row squad's Resistance +10%",
            branch: 'b',
            tier: 3,
            category: 'amp',
            statType: 'sacred_resistance',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_3_2b',
            code: '3.2b',
            name: 'Higher HP',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'HP +5%',
            permanentAttribute: null,
            branch: 'b',
            tier: 3,
            category: 'hp',
            statType: 'hp',
            statPerLevel: 0.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_3b',
            code: '3.3b',
            name: 'Bigger Military Influence',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Tactical Resistance +15%',
            permanentAttribute: null,
            branch: 'b',
            tier: 3,
            category: 'resistance',
            statType: 'tactical_resistance',
            statPerLevel: 1.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_amp_b2',
            code: '3.amp_b2',
            name: 'Divine Forgiveness Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([90, 180, 270, 360, 495, 630, 765, 945, 1125, 2250]),
            buff: 'Basic Sacred Resistance +50',
            permanentAttribute: 'Reign of Chaos HP +10%',
            branch: 'b',
            tier: 3,
            category: 'amp',
            statType: 'sacred_resistance',
            statPerLevel: 5,
            statUnit: '',
          },
          {
            id: 'rg_3_4b',
            code: '3.4b',
            name: 'Immunity Boost',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Damage Taken -5%',
            permanentAttribute: null,
            branch: 'b',
            tier: 3,
            category: 'immunity',
            statType: 'damage_taken',
            statPerLevel: -0.5,
            statUnit: '%',
          },
          {
            id: 'rg_3_5ab',
            code: '3.5ab',
            name: 'Quick Enhancement',
            resource: 'AS',
            maxLevel: 10,
            costs: Object.freeze([60, 120, 180, 240, 300, 360, 420, 480, 540, 600]),
            buff: 'Combat Speed +10',
            permanentAttribute: null,
            branch: 'shared',
            tier: 3,
            category: 'speed',
            statType: 'speed',
            statPerLevel: 1,
            statUnit: '',
          },
        ]),
      },
      {
        tier: 4,
        name: 'Tier 4: Divine Radiance',
        subtitle: 'Pinnacle artifact radiance and supreme crit synergy',
        description:
          'The ultimate 50-level mastery of the Redemption Grail, boosting Round 2 buff removal and unlocking artifact crit synergy.',
        nodes: Object.freeze([
          {
            id: 'rg_4_0',
            code: '4',
            name: 'Redemption - Divine Radiance',
            resource: 'RGE',
            maxLevel: 50,
            costs: Object.freeze([
              32, 36, 40, 44, 48, 52, 60, 68, 76, 84, 92, 102, 112, 125, 125, 125, 125, 125, 125,
              125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125,
              125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125, 125,
            ]),
            buff: 'In round 2, +30% chance to remove the buffs provided by dead enemy heroes to all enemy squads',
            permanentAttribute:
              'All your Arifacts crit rate +5%; chance of taking crit damage from enemy Artifacts -5%',
            branch: 'root',
            tier: 4,
            category: 'skill',
            statType: 'artifact_crit_rate',
            statUnit: '%',
          },
        ]),
      },
    ]),
  },
]);

/**
 * Returns all nodes across all tiers for a given artifact.
 * @param {ArtifactItem} artifact
 * @returns {ArtifactNode[]}
 */
export function getAllArtifactNodes(artifact = ARTIFACT_DATABASE[0]) {
  if (!artifact?.tiers) return [];
  return artifact.tiers.flatMap((t) => t.nodes);
}

/**
 * Finds a node by id.
 * @param {string} nodeId
 * @param {ArtifactItem} artifact
 * @returns {ArtifactNode|undefined}
 */
export function getArtifactNodeById(nodeId, artifact = ARTIFACT_DATABASE[0]) {
  return getAllArtifactNodes(artifact).find((n) => n.id === nodeId);
}

/**
 * Keeps persisted progress bounded to the canonical node catalog. Unknown keys,
 * fractions, negative values and levels beyond the node maximum are discarded
 * or clamped before they can enter calculations or account sync.
 */
export function normalizeArtifactProgress(value, artifact = ARTIFACT_DATABASE[0]) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const normalized = {};

  for (const node of getAllArtifactNodes(artifact)) {
    const rawLevel = Number(source[node.id]);
    if (!Number.isFinite(rawLevel)) continue;
    const level = Math.max(0, Math.min(node.maxLevel, Math.trunc(rawLevel)));
    if (level > 0) normalized[node.id] = level;
  }

  return Object.freeze(normalized);
}

export function parseArtifactProgress(value, artifact = ARTIFACT_DATABASE[0]) {
  if (typeof value !== 'string') return normalizeArtifactProgress(value, artifact);
  try {
    return normalizeArtifactProgress(JSON.parse(value), artifact);
  } catch {
    return normalizeArtifactProgress({}, artifact);
  }
}

/**
 * Calculates total costs and completion metrics for an artifact.
 * @param {ArtifactItem} artifact
 * @param {Record<string, number>} [currentLevels] - Map of nodeId -> current level (0..maxLevel)
 * @param {Record<string, number>} [targetLevels] - Map of nodeId -> target level
 */
export function calculateArtifactMetrics(
  artifact = ARTIFACT_DATABASE[0],
  currentLevels = {},
  targetLevels = null
) {
  let totalRGE = 0;
  let totalAS = 0;
  let investedRGE = 0;
  let investedAS = 0;
  let remainingRGE = 0;
  let remainingAS = 0;
  let targetNeededRGE = 0;
  let targetNeededAS = 0;

  let totalNodes = 0;
  let maxedNodes = 0;
  let totalLevelPoints = 0;
  let investedLevelPoints = 0;

  const allNodes = getAllArtifactNodes(artifact);

  for (const node of allNodes) {
    totalNodes += 1;
    totalLevelPoints += node.maxLevel;

    const curLvl = Math.max(0, Math.min(node.maxLevel, Number(currentLevels[node.id]) || 0));
    investedLevelPoints += curLvl;
    if (curLvl >= node.maxLevel) maxedNodes += 1;

    const tgtLvl = targetLevels
      ? Math.max(curLvl, Math.min(node.maxLevel, Number(targetLevels[node.id]) || curLvl))
      : node.maxLevel;

    const isRGE = node.resource === 'RGE';

    // Total cost for node
    const nodeTotalCost = node.costs.reduce((sum, c) => sum + c, 0);
    // Invested cost
    const nodeInvestedCost = node.costs.slice(0, curLvl).reduce((sum, c) => sum + c, 0);
    // Remaining cost to max
    const nodeRemainingCost = node.costs.slice(curLvl).reduce((sum, c) => sum + c, 0);
    // Needed to reach target
    const nodeTargetCost = node.costs.slice(curLvl, tgtLvl).reduce((sum, c) => sum + c, 0);

    if (isRGE) {
      totalRGE += nodeTotalCost;
      investedRGE += nodeInvestedCost;
      remainingRGE += nodeRemainingCost;
      targetNeededRGE += nodeTargetCost;
    } else {
      totalAS += nodeTotalCost;
      investedAS += nodeInvestedCost;
      remainingAS += nodeRemainingCost;
      targetNeededAS += nodeTargetCost;
    }
  }

  const completionPercent =
    totalLevelPoints > 0 ? (investedLevelPoints / totalLevelPoints) * 100 : 0;
  return {
    totalRGE,
    totalAS,
    investedRGE,
    investedAS,
    remainingRGE,
    remainingAS,
    targetNeededRGE,
    targetNeededAS,
    totalNodes,
    maxedNodes,
    totalLevelPoints,
    investedLevelPoints,
    completionPercent,
  };
}

/**
 * Computes active cumulative stats from invested levels.
 * @param {ArtifactItem} artifact
 * @param {Record<string, number>} currentLevels
 */
export function calculateArtifactActiveBuffs(artifact = ARTIFACT_DATABASE[0], currentLevels = {}) {
  const stats = {
    might: 0,
    resistance: 0,
    hp: 0,
    damage: 0,
    damageTaken: 0,
    tacticalMight: 0,
    tacticalResistance: 0,
    combatSpeed: 0,
    sacredMight: 0,
    sacredResistance: 0,
    destructiveStrikeImmunity: 0,
    fatalBlowImmunity: false,
    artifactDamageBoost: 0,
    artifactDamageMitigation: 0,
    artifactCritRate: 0,
    permanentAttributes: [],
    specialSkills: [],
  };

  const allNodes = getAllArtifactNodes(artifact);

  for (const node of allNodes) {
    const lvl = Math.max(0, Math.min(node.maxLevel, Number(currentLevels[node.id]) || 0));
    if (lvl <= 0) continue;

    // Linear stat calculations based on level
    if (node.statPerLevel && node.statType) {
      const val = node.statPerLevel * lvl;
      if (node.statType === 'might') stats.might += val;
      else if (node.statType === 'resistance') stats.resistance += val;
      else if (node.statType === 'hp') stats.hp += val;
      else if (node.statType === 'damage') stats.damage += val;
      else if (node.statType === 'damage_taken') stats.damageTaken += val;
      else if (node.statType === 'tactical_might') stats.tacticalMight += val;
      else if (node.statType === 'tactical_resistance') stats.tacticalResistance += val;
      else if (node.statType === 'speed') stats.combatSpeed += val;
      else if (node.statType === 'sacred_might') stats.sacredMight += val;
      else if (node.statType === 'sacred_resistance') stats.sacredResistance += val;
      else if (node.statType === 'destructive_strike_immunity')
        stats.destructiveStrikeImmunity += val;
    }

    if (node.id === 'rg_2_5a' && lvl >= 1) {
      stats.fatalBlowImmunity = true;
    }

    // Permanent attributes only activate when node is at MAX level
    if (lvl >= node.maxLevel && node.permanentAttribute) {
      stats.permanentAttributes.push({
        nodeId: node.id,
        nodeName: node.name,
        attribute: node.permanentAttribute,
        tier: node.tier,
      });

      if (node.statType === 'artifact_damage_boost') stats.artifactDamageBoost += 10;
      if (node.statType === 'artifact_damage_mitigation') stats.artifactDamageMitigation += 10;
      if (node.statType === 'artifact_crit_rate') stats.artifactCritRate += 5;
      if (node.id === 'rg_3_0a') stats.sacredMight += 100;
      if (node.id === 'rg_3_0b') stats.sacredResistance += 100;
    }

    // Special root skills active state
    if (node.branch === 'root' || node.category === 'apex') {
      stats.specialSkills.push({
        nodeId: node.id,
        nodeName: node.name,
        currentLevel: lvl,
        maxLevel: node.maxLevel,
        buff: node.buff,
        isMaxed: lvl >= node.maxLevel,
      });
    }
  }

  return stats;
}
