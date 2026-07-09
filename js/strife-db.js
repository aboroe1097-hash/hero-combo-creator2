// js/strife-db.js
// Strife over Dragon manual recommendation data.
// Hero order is always [Front, Middle, Back].

export const STRIFE_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];

const STRIFE_DISCUSSION_URL = 'https://www.riseofcastles.net/en/feedrocbook/strife-over-dragon/discussion';

export const STRIFE_MONSTERS = [
  {
    id: "rabbit",
    name: "Rabbit",
    accent: "#f87171",
    imageUrl: "images/strife/monsters/rabbit.jpg",
    skills: [
      {
        name: "Playful Leap",
        timing: "Rounds 1-3",
        target: "Random squad",
        effect: "Launches a sudden leap dealing high physical damage.",
        answer: "Use strong front-row defenders or damage prevention.",
        tags: [
          "Early Burst",
          "Physical"
        ]
      },
      {
        name: "Carrot Shield",
        timing: "Ongoing",
        target: "Spring Rabbit",
        effect: "Gains a shield that blocks a portion of skill damage.",
        answer: "Bring strong basic attack physical damage dealers.",
        tags: [
          "Shield",
          "Skill Reduction"
        ]
      }
    ]
  },
  {
    id: "gambosate",
    name: "Gambosate",
    accent: "#fb7185",
    imageUrl: "images/strife/monsters/gambosate.jpg",
    skills: [
      {
        name: "Outrage",
        timing: "Round 4 onward",
        target: "2 random squads",
        effect: "Repeated random hits create the main late-fight wipe risk and ignore Resistance.",
        answer: "Front-load damage before round 4 or use tanky supports that keep squads alive through repeated hits.",
        tags: [
          "Late Spike",
          "Random Hits"
        ]
      },
      {
        name: "Legion's Will",
        timing: "All 8 rounds",
        target: "Gambosate",
        effect: "Immune to silence, disarm, suppression, and confusion.",
        answer: "Do not spend hero slots on crowd-control plans. Build for raw damage, mitigation, and uptime.",
        tags: [
          "Control Immune"
        ]
      },
      {
        name: "Ferocious Roar",
        timing: "During battle",
        target: "All player squads",
        effect: "Can silence all squads and block healing for several rounds.",
        answer: "Use damage reduction and prevention, not heal-only recovery, as the main survival layer.",
        tags: [
          "Silence",
          "Anti-Heal"
        ]
      },
      {
        name: "Power of the Legion",
        timing: "Passive",
        target: "Gambosate army",
        effect: "Large Might, damage, and troop-cap bonuses make the boss stat-heavy.",
        answer: "Expect a long stat check if you miss the early burst window.",
        tags: [
          "Stat Boss"
        ]
      }
    ],
    guideNotes: [
      "The guide frames Gambosate as a high-difficulty boss because it is control-immune and becomes much more dangerous from round 4 onward.",
      "Best plans either burst hard before round 4 or bring enough HP, defense, and damage reduction to survive Outrage.",
      "Control picks lose value here. Favor direct damage, defensive supports, and damage prevention over silence/disarm plans."
    ]
  },
  {
    id: "pivana",
    name: "Pilvana",
    accent: "#f97316",
    imageUrl: "images/strife/monsters/pivana.jpg",
    skills: [
      {
        name: "Furious Strike",
        timing: "Rounds 1-3",
        target: "All Pilvana squads",
        effect: "Pilvana doubles normal attacks early, which makes rounds 1-3 the most dangerous burst window.",
        answer: "Use sturdy front rows and teams that keep outputting damage while they absorb the opening hits.",
        tags: [
          "Early Burst",
          "Survival"
        ]
      },
      {
        name: "Dirty Tricks",
        timing: "After normal attacks",
        target: "Random squads",
        effect: "Adds bonus damage after normal attacks and can disarm multiple squads at once.",
        answer: "Favor skill damage, cleanse or resistance value, and reliable sustain instead of normal-attack-only teams.",
        tags: [
          "Disarm",
          "Skill Damage"
        ]
      },
      {
        name: "Uncontrolled Rage",
        timing: "Rounds 1-3",
        target: "Pilvana squad",
        effect: "Pilvana starts with control immunity, so silence, disarm, suppression, and confusion are unreliable early.",
        answer: "Do not spend the opening plan on control. Push damage, buffs, and survival until the immunity window ends.",
        tags: [
          "Control Immune",
          "DPS Race"
        ]
      }
    ],
    guideNotes: [
      "Pilvana opens with heavy normal-attack pressure, so the first three rounds are mostly a survival and damage-race check.",
      "Because Pilvana can disarm several squads, counters should not rely only on normal attacks. Skill damage, cleanse/resistance, sustain, and steady buffs are safer."
    ]
  },
  {
    id: "titanus",
    name: "Titanus",
    accent: "#f59e0b",
    imageUrl: "images/strife/monsters/titanus.jpg",
    skills: [
      {
        name: "Deadly Blade",
        timing: "Rounds 1 and 4",
        target: "All player squads",
        effect: "After preparation, Titanus launches multiple heavy attacks into every squad.",
        answer: "Bring shields, damage reduction, or prevention for the scripted burst rounds.",
        tags: [
          "Timed Burst",
          "All Squads"
        ]
      },
      {
        name: "Colossal Figure",
        timing: "Rounds 1-2",
        target: "Titanus",
        effect: "Titanus takes sharply reduced damage in the opening rounds.",
        answer: "Survive early, then push the main damage window after the reduction expires.",
        tags: [
          "Damage Reduction"
        ]
      },
      {
        name: "Butcher in the Wild",
        timing: "Ongoing",
        target: "All player squads",
        effect: "Bleed and disarm pressure drains squads while limiting normal-attack plans.",
        answer: "Favor skill damage, sustain, and defensive utility over basic-attack-only output.",
        tags: [
          "Bleed",
          "Disarm"
        ]
      },
      {
        name: "Power of the Legion",
        timing: "Passive",
        target: "Titanus army",
        effect: "Large Legion Power, damage, and troop-cap bonuses make the fight a durability check.",
        answer: "Use sturdy front rows and avoid fragile glass-cannon setups.",
        tags: [
          "Stat Boss"
        ]
      }
    ],
    guideNotes: [
      "Titanus pressure comes from timed all-squad attacks, early damage reduction, and a long bleed/disarm package.",
      "Do not unload all damage into the early 80% reduction window. Keep enough damage for the rounds after Colossal Figure falls off."
    ]
  },
  {
    id: "fordogreen",
    name: "Fordogreen",
    accent: "#60a5fa",
    imageUrl: "https://static.wixstatic.com/media/43ee96_f79fc279fb154b399924710b153725d9~mv2.png",
    skills: [
      {
        name: "Forest Call",
        timing: "Rounds 1-3",
        target: "Fordogreen",
        effect: "Immune to normal attacks during the first three rounds.",
        answer: "Focus on skill damage or deploy cleansing supports.",
        tags: [
          "Early Shield",
          "Normal Immune"
        ]
      },
      {
        name: "Thorn Backlash",
        timing: "Ongoing",
        target: "Attacking squad",
        effect: "Reflects a percentage of incoming physical damage back to the attacker.",
        answer: "Use healing sustain and skill damage over physical attacks.",
        tags: [
          "Reflect",
          "Anti-Physical"
        ]
      }
    ]
  },
  {
    id: "savage-swordsman",
    name: "Savage Swordsman",
    accent: "#a78bfa",
    imageUrl: "https://static.wixstatic.com/media/43ee96_3dd208020c854c30bc302cd85acd0034~mv2.png",
    skills: [
      {
        name: "Ferocious Roar",
        timing: "Ongoing",
        target: "1 random squad",
        effect: "Reduces damage from the squad by 50% for 8 rounds and deals heavy damage.",
        answer: "Bring clean/cure status effects or high baseline damage.",
        tags: [
          "Damage Reduction",
          "De-buff"
        ]
      },
      {
        name: "Top Swordsman",
        timing: "Rounds 1-4",
        target: "All squads",
        effect: "Disarms all enemy squads for the first 4 rounds.",
        answer: "Favor skill damage or crowd control protection.",
        tags: [
          "Disarm",
          "Control"
        ]
      },
      {
        name: "Savage in Nature",
        timing: "Passive",
        target: "Savage Swordsman",
        effect: "Takes 80% less Skill Damage but 50% more Physical Damage.",
        answer: "Build setups focused entirely on physical basic attacks.",
        tags: [
          "Physical Weakness",
          "Skill Reduction"
        ]
      }
    ]
  },
  {
    id: "sasha",
    name: "Sasha",
    accent: "#38bdf8",
    imageUrl: "https://static.wixstatic.com/media/43ee96_70a6f6af6a4244f4830784109d5bf807~mv2.png",
    skills: [
      {
        name: "Storm Shield",
        timing: "Rounds 1, 3, 5, 7",
        target: "All squads",
        effect: "Disarms squads in odd-numbered rounds, preventing normal attacks.",
        answer: "Rely on skill damage output and control immunity.",
        tags: [
          "Disarm",
          "Silence"
        ]
      },
      {
        name: "Sasha's Curse",
        timing: "Preparation",
        target: "2 random squads",
        effect: "Suppresses 2 squads for 1 round, blocking actions.",
        answer: "Deploy heroes with cleanse or control resistance.",
        tags: [
          "Suppression",
          "Control"
        ]
      },
      {
        name: "Legion's Strength",
        timing: "Passive",
        target: "Sasha army",
        effect: "Gains massive buffs, including +500% attack and +70% damage.",
        answer: "Coordinate high damage quickly before buffs scale too high.",
        tags: [
          "Stat Boss",
          "Late Spike"
        ]
      }
    ]
  },
  {
    id: "noisy-noel",
    name: "Noisy Noel",
    accent: "#ef4444",
    imageUrl: "images/strife/monsters/noisy-noel.jpg",
    skills: [
      {
        name: "Invisible",
        timing: "All 8 rounds",
        target: "Noisy Noel",
        effect: "Immune to silence, disarm, suppression, and confusion.",
        answer: "Skip control comps and use direct damage, burn pressure, and defensive uptime.",
        tags: [
          "Control Immune"
        ]
      },
      {
        name: "Clown Makeup",
        timing: "Passive",
        target: "Noisy Noel",
        effect: "Normal damage is heavily reduced while burn damage is greatly amplified.",
        answer: "Prefer burn and skill-damage routes over normal-attack damage checks.",
        tags: [
          "Burn Weakness",
          "Normal Reduction"
        ]
      },
      {
        name: "Pickpocket",
        timing: "After 2-round prep",
        target: "1 random squad",
        effect: "A high-scaling random hit can delete a weak squad.",
        answer: "Bring damage prevention, durable backlines, or enough sustain to absorb random targeting.",
        tags: [
          "Random Burst"
        ]
      },
      {
        name: "Power of the Legion",
        timing: "Passive",
        target: "Noisy Noel army",
        effect: "Large Might, damage, and troop-cap bonuses raise the baseline damage check.",
        answer: "Treat the fight as a full eight-round DPS race unless your team can exploit burn.",
        tags: [
          "Stat Boss"
        ]
      }
    ],
    guideNotes: [
      "Noisy Noel is control-immune for the full fight, so silence, disarm, suppression, and confusion should not be the plan.",
      "The guide calls out burn vulnerability and pure damage as the cleanest answers, with Warden-style survival helping against random burst."
    ]
  },
  {
    id: "trident-north-sea",
    name: "Trident of the North Sea",
    accent: "#c4b5fd",
    imageUrl: "images/strife/monsters/trident-north-sea.jpg",
    skills: [
      {
        name: "Trident Swing",
        timing: "During battle",
        target: "All squads in range",
        effect: "100% chance to launch 10 attacks against all squads, including friendly squads, dealing 30% Damage each attack.",
        answer: "Use a durable lineup that can absorb repeated multi-target hits without relying on fragile burst only.",
        tags: [
          "All Squads",
          "Repeated Hits"
        ]
      },
      {
        name: "Lasting Stamina",
        timing: "Rounds 1-3",
        target: "Trident",
        effect: "The boss takes 80% less Damage during the first three rounds.",
        answer: "Do not judge the lineup only by early damage. Survive the opener and keep damage ready after round 3.",
        tags: [
          "Damage Reduction",
          "Early Survival"
        ]
      },
      {
        name: "Backlash",
        timing: "When damaged",
        target: "3 random enemy squads",
        effect: "When the hero squad takes damage, 100% chance to deal 100% Skill Damage to 3 random enemy squads.",
        answer: "Expect retaliation whenever you pressure the boss. Sustain and archer durability help stabilize the fight.",
        tags: [
          "Counter Damage",
          "Skill Damage"
        ]
      },
      {
        name: "Power of the Legion",
        timing: "Passive",
        target: "Trident army",
        effect: "The hero legion gains 500% more Might and 70% more Damage, with marching soldier cap increased by 487,570.",
        answer: "Treat this as a high-stat endurance fight. Favor strong cores over gimmick control plans.",
        tags: [
          "Stat Boss",
          "Endurance"
        ]
      }
    ],
    guideNotes: [
      "Trident hits every squad, including friendly squads, so durable archer cores and strong round-to-round sustain matter more than fragile burst.",
      "The opening damage-reduction window means the team must survive first, then keep enough damage online after the first three rounds."
    ]
  },
  {
    id: "black-annis",
    name: "Black Annis",
    accent: "#f472b6",
    imageUrl: "https://static.wixstatic.com/media/43ee96_0ca0ba5089f74918b1aeab3b39495604~mv2.png",
    skills: [
      {
        name: "Hag's Claw",
        timing: "Preparation",
        target: "1 random squad",
        effect: "Suppresses the target squad and drains their Might for 2 rounds.",
        answer: "Use control immune heroes or clean mechanics.",
        tags: [
          "Suppression",
          "Might Drain"
        ]
      },
      {
        name: "Devourer's Feast",
        timing: "Round 4 onward",
        target: "Drained squad",
        effect: "Deals massive damage to squads with reduced stats.",
        answer: "Stabilize stats with active buffs and defensive healing.",
        tags: [
          "Stat Check",
          "Late Burst"
        ]
      }
    ]
  },
  {
    id: "frost-queen",
    name: "Frost Queen",
    accent: "#38bdf8",
    imageUrl: "https://static.wixstatic.com/media/43ee96_3a567a080584448bad35a78883cc3e7f~mv2.png",
    skills: [
      {
        name: "Frozen Tomb",
        timing: "Rounds 1, 4",
        target: "1 random squad",
        effect: "Freezes one squad, preventing action and healing for 1 round.",
        answer: "Use support heroes that offer block or cleanse.",
        tags: [
          "Freeze",
          "Anti-Heal"
        ]
      },
      {
        name: "Glacial Armor",
        timing: "Passive",
        target: "Frost Queen",
        effect: "Takes 60% reduced physical normal attack damage.",
        answer: "Favor heavy skill damage and burns.",
        tags: [
          "Physical Reduction",
          "Skill Weakness"
        ]
      }
    ]
  }
];

export const STRIFE_TIERS = {
  F2P: 'f2p',
  P2W: 'p2w',
};

export const STRIFE_REFERENCE = {
  label: 'Rise of Castles Strife reference table',
  url: 'https://www.riseofcastles.net/en/origemdosdrag%C3%B5es',
  imageUrl: 'images/strife/roc-strife-reference.png',
};

export const STRIFE_MONSTER_COMBOS = {
  "rabbit": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Bjorn / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Frederick I",
        "Nicolas Flamel"
      ],
      note: "Recommended P2W formation: Ramses II / Frederick I / Nicolas Flamel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "El Cid",
        "Eselfred",
        "The Avalanche"
      ],
      note: "Recommended F2P formation: El Cid / Eselfred / The Avalanche."
    },
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Ramses II",
        "Sakura"
      ],
      note: "Recommended P2W formation: Boudica / Ramses II / Sakura."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Gustav",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: Gustav / Bjorn / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Poison Master",
        "Lilith"
      ],
      note: "Recommended P2W formation: Darius / Poison Master / Lilith."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Eselfred",
        "ELK",
        "El Cid"
      ],
      note: "Recommended F2P formation: Eselfred / ELK / El Cid."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Bjorn / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Rozen Blade",
        "Sundiata",
        "Farah"
      ],
      note: "Recommended P2W formation: Rozen Blade / Sundiata / Farah."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "El Cid",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Boudica / El Cid / Eselfred."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Al-Hawra",
        "Ramses II"
      ],
      note: "Recommended P2W formation: Robin Hood / Al-Hawra / Ramses II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Sakura"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Sakura."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Bjorn / Henry II."
    },
    {
      stage: "S3",
      tier: "f2p",
      heroes: [
        "Sky Breaker",
        "Edward the Confessor",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Sky Breaker / Edward the Confessor / Cao Cao."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Charles the Great",
        "El Cid",
        "Eselfred"
      ],
      note: "Recommended F2P formation: Charles the Great / El Cid / Eselfred."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Belisarius",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Belisarius / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Robin Hood",
        "Ramses II"
      ],
      note: "Recommended P2W formation: Boudica / Robin Hood / Ramses II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "El Cid",
        "Eselfred"
      ],
      note: "Recommended F2P formation: Arslan / El Cid / Eselfred."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Robin Hood",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Robin Hood / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Tura Cartel",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Tura Cartel / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Harald",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Harald / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Harald",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Harald / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Al-Hawra / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Spectral Reaper"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Spectral Reaper."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Poison Master",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Poison Master / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Healer",
        "Charles the Great"
      ],
      note: "Recommended P2W formation: Boudica / Healer / Charles the Great."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Warden",
        "Poison Master",
        "Spectral Reaper"
      ],
      note: "Recommended F2P formation: Warden / Poison Master / Spectral Reaper."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Roland",
        "El Cid",
        "The Avalanche"
      ],
      note: "Recommended P2W formation: Roland / El Cid / The Avalanche."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Sakura",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Robin Hood / Sakura / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Roland",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Don Quixote / Roland / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Arslan",
        "Charles the Great",
        "Boudica"
      ],
      note: "Recommended P2W formation: Arslan / Charles the Great / Boudica."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Darius / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Cyrus",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Cyrus / Al-Hawra / Oliver."
    },
    {
      stage: "S3",
      tier: "p2w",
      heroes: [
        "Octavius",
        "Edward the Confessor",
        "Caesar"
      ],
      note: "Recommended P2W formation: Octavius / Edward the Confessor / Caesar."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Galahad",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Galahad / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Al-Hawra",
        "Hector"
      ],
      note: "Recommended P2W formation: Robin Hood / Al-Hawra / Hector."
    }
  ],
  "fordogreen": [
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Ramses II",
        "Edward the Confessor"
      ],
      note: "Recommended P2W formation: Boudica / Ramses II / Edward the Confessor."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Nicolas Flamel",
        "Ramses II"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Nicolas Flamel / Ramses II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Robin Hood / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Witch Hunter",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Witch Hunter / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Robin Hood",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: Robin Hood / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Boudica",
        "Healer"
      ],
      note: "Recommended P2W formation: Alexander / Boudica / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Zhuge Liang",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Zhuge Liang / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Zhuge Liang",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Boudica / Zhuge Liang / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Percival",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Darius / Percival / Belisarius."
    },
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Charles the Great",
        "Boudica"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Charles the Great / Boudica."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Charles the Great",
        "Ramses II",
        "Nicolas Flamel"
      ],
      note: "Recommended P2W formation: Charles the Great / Ramses II / Nicolas Flamel."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Percival",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Witch Hunter / Percival / Frederick I."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Harald",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: Harald / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Edward the Confessor",
        "Healer"
      ],
      note: "Recommended P2W formation: Boudica / Edward the Confessor / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Darius",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Alexander / Darius / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Tura Cartel",
        "El Cid",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Tura Cartel / El Cid / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Eselfred",
        "El Cid",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Eselfred / El Cid / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Nicolas Flamel",
        "Ramses II"
      ],
      note: "Recommended P2W formation: Boudica / Nicolas Flamel / Ramses II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Galahad",
        "Percival",
        "Robin Hood"
      ],
      note: "Recommended F2P formation: Galahad / Percival / Robin Hood."
    },
    {
      stage: "S4",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Ramses II",
        "Al Fatih"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Ramses II / Al Fatih."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Nicolas Flamel",
        "Healer"
      ],
      note: "Recommended P2W formation: Boudica / Nicolas Flamel / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Roland",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Roland / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Rozen Blade",
        "Boudica",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Rozen Blade / Boudica / Eselfred."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Harald",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Harald / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Percival",
        "Alexander"
      ],
      note: "Recommended P2W formation: Darius / Percival / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alberich",
        "Darius",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Alberich / Darius / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Bjorn",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Bjorn / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Robin Hood",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Boudica / Robin Hood / Frederick I."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Rozen Blade",
        "Nicolas Flamel",
        "Eselfred"
      ],
      note: "Recommended F2P formation: Rozen Blade / Nicolas Flamel / Eselfred."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "El Cid",
        "Charles the Great",
        "Eselfred"
      ],
      note: "Recommended F2P formation: El Cid / Charles the Great / Eselfred."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Don Quixote",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: Don Quixote / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "El Cid",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Don Quixote / El Cid / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alberich",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Alberich / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Harald",
        "Percival",
        "Alexander"
      ],
      note: "Recommended P2W formation: Harald / Percival / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alberich",
        "Darius",
        "Alexander"
      ],
      note: "Recommended P2W formation: Alberich / Darius / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "King Arthur",
        "Alberich",
        "Alexander"
      ],
      note: "Recommended P2W formation: King Arthur / Alberich / Alexander."
    }
  ],
  "savage-swordsman": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Hellfire",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Hellfire / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Charles the Great",
        "Warden",
        "Caesar"
      ],
      note: "Recommended P2W formation: Charles the Great / Warden / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Hellfire",
        "Charles the Great",
        "Caesar"
      ],
      note: "Recommended P2W formation: Hellfire / Charles the Great / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Harald",
        "Henry II",
        "Healer"
      ],
      note: "Recommended P2W formation: Harald / Henry II / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Eselfred",
        "Ramses II"
      ],
      note: "Recommended P2W formation: Boudica / Eselfred / Ramses II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Charles the Great",
        "Caesar"
      ],
      note: "Recommended P2W formation: El Cid / Charles the Great / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sundiata",
        "Charles the Great",
        "Caesar"
      ],
      note: "Recommended P2W formation: Sundiata / Charles the Great / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Charles the Great",
        "Healer",
        "Caesar"
      ],
      note: "Recommended P2W formation: Charles the Great / Healer / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Hellfire",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Hellfire / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "El Cid",
        "Sundiata"
      ],
      note: "Recommended P2W formation: Warden / El Cid / Sundiata."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Bjorn / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Bleeding Steed",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Bleeding Steed / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Bjorn",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Bjorn / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Jade Eagle",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Jade Eagle / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Rozen Blade",
        "Sundiata"
      ],
      note: "Recommended P2W formation: El Cid / Rozen Blade / Sundiata."
    },
    {
      stage: "X2",
      tier: "p2w",
      heroes: [
        "Lawman",
        "Charles the Great",
        "Caesar"
      ],
      note: "Recommended P2W formation: Lawman / Charles the Great / Caesar."
    },
    {
      stage: "X2",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Charles the Great",
        "Caesar"
      ],
      note: "Recommended P2W formation: Alexander / Charles the Great / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Zhuge Liang",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Zhuge Liang / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Nevsky",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Nevsky / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Nevsky",
        "Geraint",
        "Henry II"
      ],
      note: "Recommended P2W formation: Nevsky / Geraint / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Alberich",
        "Nevsky",
        "Geraint"
      ],
      note: "Recommended F2P formation: Alberich / Nevsky / Geraint."
    }
  ],
  "noisy-noel": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "La Hire",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / La Hire / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Warden",
        "Sundiata"
      ],
      note: "Recommended P2W formation: La Hire / Warden / Sundiata."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Roland",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Roland / Henry II."
    },
    {
      stage: "S1",
      tier: "f2p",
      heroes: [
        "Edward the Confessor",
        "Cao Cao",
        "Isabella I"
      ],
      note: "Recommended F2P formation: Edward the Confessor / Cao Cao / Isabella I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Gustav",
        "Warden",
        "Caesar"
      ],
      note: "Recommended P2W formation: Gustav / Warden / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Charles the Great",
        "Ramses II",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Charles the Great / Ramses II / Frederick I."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Percival",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Witch Hunter / Percival / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Edward the Confessor",
        "Warden",
        "Sundiata"
      ],
      note: "Recommended P2W formation: Edward the Confessor / Warden / Sundiata."
    },
    {
      stage: "S3",
      tier: "p2w",
      heroes: [
        "Charles the Great",
        "Ramses II",
        "Caesar"
      ],
      note: "Recommended P2W formation: Charles the Great / Ramses II / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Nicolas Flamel",
        "Zhuge Liang",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Nicolas Flamel / Zhuge Liang / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Farah",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Farah / Henry II."
    },
    {
      stage: "S3",
      tier: "f2p",
      heroes: [
        "Sky Breaker",
        "Edward the Confessor",
        "Isabella I"
      ],
      note: "Recommended F2P formation: Sky Breaker / Edward the Confessor / Isabella I."
    },
    {
      stage: "X1",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Isabella I",
        "ELK"
      ],
      note: "Recommended F2P formation: Witch Hunter / Isabella I / ELK."
    },
    {
      stage: "S2",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Isabella I",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Witch Hunter / Isabella I / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Oliver",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Oliver / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Edward the Confessor",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Edward the Confessor / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Percival",
        "Sundiata"
      ],
      note: "Recommended P2W formation: Don Quixote / Percival / Sundiata."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Alberich",
        "Percival",
        "Lagertha"
      ],
      note: "Recommended F2P formation: Alberich / Percival / Lagertha."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Don Quixote",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: Don Quixote / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Farah",
        "Rozen Blade",
        "Sundiata"
      ],
      note: "Recommended P2W formation: Farah / Rozen Blade / Sundiata."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Eselfred",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Eselfred / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Edward the Confessor",
        "Warden",
        "Caesar"
      ],
      note: "Recommended P2W formation: Edward the Confessor / Warden / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Frederick I",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Frederick I / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Nicolas Flamel",
        "Cyrus"
      ],
      note: "Recommended P2W formation: Don Quixote / Nicolas Flamel / Cyrus."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Octavius",
        "Warden",
        "Caesar"
      ],
      note: "Recommended P2W formation: Octavius / Warden / Caesar."
    },
    {
      stage: "X1",
      tier: "f2p",
      heroes: [
        "Sky Breaker",
        "Sakura",
        "Isabella I"
      ],
      note: "Recommended F2P formation: Sky Breaker / Sakura / Isabella I."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Edward the Confessor",
        "Warden",
        "Rainforest Ranger"
      ],
      note: "Recommended F2P formation: Edward the Confessor / Warden / Rainforest Ranger."
    },
    {
      stage: "S2",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Edward the Confessor",
        "Isabella I"
      ],
      note: "Recommended F2P formation: Witch Hunter / Edward the Confessor / Isabella I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Henry II / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: La Hire / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Don Quixote",
        "El Cid",
        "Oliver"
      ],
      note: "Recommended F2P formation: Don Quixote / El Cid / Oliver."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Sakura",
        "Warden",
        "Rainforest Ranger"
      ],
      note: "Recommended F2P formation: Sakura / Warden / Rainforest Ranger."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Nicolas Flamel",
        "Robin Hood",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Nicolas Flamel / Robin Hood / Frederick I."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Robin Hood",
        "Edward the Confessor",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Robin Hood / Edward the Confessor / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Sakura / Henry II."
    },
    {
      stage: "S2",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Isabella I",
        "William the Conqueror"
      ],
      note: "Recommended F2P formation: Witch Hunter / Isabella I / William the Conqueror."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Alberich",
        "El Cid",
        "Lagertha"
      ],
      note: "Recommended F2P formation: Alberich / El Cid / Lagertha."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Desert Storm",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Desert Storm / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Zhuge Liang",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Zhuge Liang / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Nicolas Flamel",
        "Percival",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Nicolas Flamel / Percival / Frederick I."
    },
    {
      stage: "S3",
      tier: "p2w",
      heroes: [
        "Charles the Great",
        "Edward the Confessor",
        "Caesar"
      ],
      note: "Recommended P2W formation: Charles the Great / Edward the Confessor / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Frederick I",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Frederick I / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Darius / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Zhuge Liang",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Zhuge Liang / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Witch Hunter",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Witch Hunter / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Roland",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Roland / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Don Quixote / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sundiata",
        "Warden",
        "Caesar"
      ],
      note: "Recommended P2W formation: Sundiata / Warden / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Al-Hawra / Nicolas Flamel / Frederick I."
    }
  ],
  "sasha": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Witch Hunter",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Witch Hunter / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "The Brave",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: The Brave / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Frederick I",
        "Belisarius",
        "Henry II"
      ],
      note: "Recommended P2W formation: Frederick I / Belisarius / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "Boudica",
        "El Cid"
      ],
      note: "Recommended P2W formation: Henry II / Boudica / El Cid."
    },
    {
      stage: "X1",
      tier: "f2p",
      heroes: [
        "Sakura",
        "Inquisitor",
        "Witch Hunter"
      ],
      note: "Recommended F2P formation: Sakura / Inquisitor / Witch Hunter."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Oliver",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Oliver / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Roland",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Roland / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Belisarius",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Belisarius / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Harald",
        "El Cid",
        "Oliver"
      ],
      note: "Recommended F2P formation: Harald / El Cid / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Frederick I",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Frederick I / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "Charles the Great",
        "Boudica"
      ],
      note: "Recommended P2W formation: Henry II / Charles the Great / Boudica."
    },
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Witch Hunter",
        "Boudica",
        "Sakura"
      ],
      note: "Recommended P2W formation: Witch Hunter / Boudica / Sakura."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "El Cid",
        "Scarlet Reaver",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: El Cid / Scarlet Reaver / Cao Cao."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Harald",
        "El Cid",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Harald / El Cid / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Gustav",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Gustav / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Boudica",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Don Quixote / Boudica / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry V",
        "Boudica",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Henry V / Boudica / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Warden",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: Warden / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "El Cid",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: El Cid / Percival / Oliver."
    },
    {
      stage: "S3",
      tier: "f2p",
      heroes: [
        "Sky Breaker",
        "Witch Hunter",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Sky Breaker / Witch Hunter / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "Sakura",
        "Boudica"
      ],
      note: "Recommended P2W formation: Henry II / Sakura / Boudica."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Farah",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Farah / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "El Cid",
        "Alexander"
      ],
      note: "Recommended P2W formation: Henry II / El Cid / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: El Cid / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Sakura / Henry II."
    }
  ],
  "gambosate": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Warden",
        "Defender",
        "Rainforest Ranger"
      ],
      note: "Recommended F2P formation: Warden / Defender / Rainforest Ranger."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "Cao Cao",
        "Healer"
      ],
      note: "Recommended F2P formation: Arslan / Cao Cao / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Jade Eagle"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Jade Eagle."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Achilles",
        "Zhao Yun",
        "Alexander"
      ],
      note: "Recommended P2W formation: Achilles / Zhao Yun / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Rozen Blade",
        "Warden",
        "Henry II"
      ],
      note: "Recommended P2W formation: Rozen Blade / Warden / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "Sakura",
        "Jade Eagle"
      ],
      note: "Recommended P2W formation: Henry II / Sakura / Jade Eagle."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "Charles the Great",
        "Healer"
      ],
      note: "Recommended F2P formation: Arslan / Charles the Great / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Farah",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Farah / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Arslan",
        "Sundiata",
        "Healer"
      ],
      note: "Recommended P2W formation: Arslan / Sundiata / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Ramses II",
        "Beowulf"
      ],
      note: "Recommended P2W formation: Al-Hawra / Ramses II / Beowulf."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Cyrus",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Cyrus / Al-Hawra / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Alexander / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Oliver",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Oliver / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Cyrus",
        "Ragnar",
        "Zhao Yun"
      ],
      note: "Recommended P2W formation: Cyrus / Ragnar / Zhao Yun."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Zhuge Liang",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Zhuge Liang / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Oliver."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "Scarlet Reaver",
        "Healer"
      ],
      note: "Recommended F2P formation: Arslan / Scarlet Reaver / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Boudica",
        "Healer"
      ],
      note: "Recommended P2W formation: Alexander / Boudica / Healer."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "Eselfred",
        "Healer"
      ],
      note: "Recommended F2P formation: Arslan / Eselfred / Healer."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "El Cid",
        "Healer"
      ],
      note: "Recommended F2P formation: Arslan / El Cid / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Immortal Guardian",
        "Healer"
      ],
      note: "Recommended P2W formation: Alexander / Immortal Guardian / Healer."
    }
  ],
  "pivana": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Bjorn",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Bjorn / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Hector"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Hector."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Immortal Guardian",
        "Healer"
      ],
      note: "Recommended P2W formation: Boudica / Immortal Guardian / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Hector"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Hector."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Hellfire",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Hellfire / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Ragnar",
        "Alberich"
      ],
      note: "Recommended P2W formation: Alexander / Ragnar / Alberich."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "El Cid",
        "Oliver"
      ],
      note: "Recommended P2W formation: Al-Hawra / El Cid / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Boudica",
        "Alexander"
      ],
      note: "Recommended P2W formation: Al-Hawra / Boudica / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Zhuge Liang",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Zhuge Liang / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Arslan",
        "El Cid",
        "Immortal Guardian"
      ],
      note: "Recommended F2P formation: Arslan / El Cid / Immortal Guardian."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Liberator",
        "El Cid",
        "Boudica"
      ],
      note: "Recommended P2W formation: Liberator / El Cid / Boudica."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Warden",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Warden / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Harald",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Harald / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Arslan",
        "Boudica",
        "Healer"
      ],
      note: "Recommended P2W formation: Arslan / Boudica / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Gustav",
        "Darius",
        "Alexander"
      ],
      note: "Recommended P2W formation: Gustav / Darius / Alexander."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "El Cid",
        "Immortal Guardian"
      ],
      note: "Recommended P2W formation: Boudica / El Cid / Immortal Guardian."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Inquisitor",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Inquisitor / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "El Cid",
        "Vikram"
      ],
      note: "Recommended P2W formation: Boudica / El Cid / Vikram."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Immortal Guardian",
        "Vikram"
      ],
      note: "Recommended P2W formation: Boudica / Immortal Guardian / Vikram."
    }
  ],
  "titanus": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Alexander / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Sakura",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Sakura / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Al-Hawra",
        "Caesar"
      ],
      note: "Recommended P2W formation: Robin Hood / Al-Hawra / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Nicolas Flamel",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Nicolas Flamel / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Farah",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Farah / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sky Breaker",
        "Al-Hawra",
        "Sakura"
      ],
      note: "Recommended P2W formation: Sky Breaker / Al-Hawra / Sakura."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Achilles",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Achilles / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Al-Hawra / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Al-Hawra",
        "Healer"
      ],
      note: "Recommended P2W formation: Robin Hood / Al-Hawra / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Nicolas Flamel",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Darius / Nicolas Flamel / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Oliver."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Robin Hood",
        "El Cid",
        "Oliver"
      ],
      note: "Recommended F2P formation: Robin Hood / El Cid / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Al-Hawra",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Darius / Al-Hawra / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Don Quixote / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Zhao Yun",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Zhao Yun / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Zhao Yun",
        "Alberich"
      ],
      note: "Recommended P2W formation: Al-Hawra / Zhao Yun / Alberich."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Rozen Blade",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Rozen Blade / Al-Hawra / Henry II."
    }
  ],
  "frost-queen": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Roland",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Roland / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Jeanne d'Arc",
        "The Avalanche"
      ],
      note: "Recommended P2W formation: El Cid / Jeanne d'Arc / The Avalanche."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Poison Master",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Darius / Poison Master / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Achilles",
        "Ragnar",
        "Alberich"
      ],
      note: "Recommended P2W formation: Achilles / Ragnar / Alberich."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "King Arthur",
        "La Hire",
        "Alexander"
      ],
      note: "Recommended P2W formation: King Arthur / La Hire / Alexander."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Achilles",
        "Gustav",
        "Healer"
      ],
      note: "Recommended F2P formation: Achilles / Gustav / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Sakura",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Boudica / Sakura / Eselfred."
    },
    {
      stage: "S4",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Edward the Confessor",
        "Jade Eagle"
      ],
      note: "Recommended P2W formation: Ramses II / Edward the Confessor / Jade Eagle."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Edward the Confessor",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Ramses II / Edward the Confessor / Frederick I."
    },
    {
      stage: "S1",
      tier: "f2p",
      heroes: [
        "Edward the Confessor",
        "Charles the Great",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Edward the Confessor / Charles the Great / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Penthesilea",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Penthesilea / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Oliver",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Oliver / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "El Cid",
        "Scarlet Reaver",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: El Cid / Scarlet Reaver / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Julian",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Julian / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: El Cid / Percival / Tura Cartel."
    },
    {
      stage: "S3",
      tier: "p2w",
      heroes: [
        "Octavius",
        "Cleopatra VII",
        "Caesar"
      ],
      note: "Recommended P2W formation: Octavius / Cleopatra VII / Caesar."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Achilles",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Achilles / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Zhuge Liang",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Zhuge Liang / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Achilles",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Achilles / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Frederick I",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Frederick I / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Cyrus",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Cyrus / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Hector",
        "Oliver"
      ],
      note: "Recommended P2W formation: Al-Hawra / Hector / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Gustav",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Gustav / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Hasdrubal",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Hasdrubal / Al-Hawra / Henry II."
    },
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Sky Breaker",
        "Boudica",
        "Sakura"
      ],
      note: "Recommended P2W formation: Sky Breaker / Boudica / Sakura."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Galahad",
        "Hector",
        "Frederick I"
      ],
      note: "Recommended F2P formation: Galahad / Hector / Frederick I."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Warden",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: Warden / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Harald",
        "El Cid",
        "Oliver"
      ],
      note: "Recommended F2P formation: Harald / El Cid / Oliver."
    },
    {
      stage: "X1",
      tier: "f2p",
      heroes: [
        "Sakura",
        "Edward the Confessor",
        "William the Conqueror"
      ],
      note: "Recommended F2P formation: Sakura / Edward the Confessor / William the Conqueror."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Alberich"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Alberich."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Hunk",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Hunk / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Achilles",
        "Percival",
        "Jeanne d'Arc"
      ],
      note: "Recommended P2W formation: Achilles / Percival / Jeanne d'Arc."
    },
    {
      stage: "X1",
      tier: "f2p",
      heroes: [
        "Sakura",
        "Edward the Confessor",
        "Jade Eagle"
      ],
      note: "Recommended F2P formation: Sakura / Edward the Confessor / Jade Eagle."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Hector"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Hector."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "The Brave",
        "Percival",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: The Brave / Percival / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Roland",
        "Percival",
        "Henry II"
      ],
      note: "Recommended P2W formation: Roland / Percival / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Frederick I",
        "Belisarius",
        "Henry II"
      ],
      note: "Recommended P2W formation: Frederick I / Belisarius / Henry II."
    },
    {
      stage: "S1",
      tier: "f2p",
      heroes: [
        "Edward the Confessor",
        "Cao Cao",
        "William the Conqueror"
      ],
      note: "Recommended F2P formation: Edward the Confessor / Cao Cao / William the Conqueror."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Belisarius",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Belisarius / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Darius",
        "Belisarius",
        "Frederick I"
      ],
      note: "Recommended P2W formation: Darius / Belisarius / Frederick I."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Eselfred."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "King Arthur",
        "Poison Master",
        "Belisarius"
      ],
      note: "Recommended P2W formation: King Arthur / Poison Master / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Penthesilea",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Penthesilea / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Galahad",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Galahad / Al-Hawra / Henry II."
    },
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Ramses II",
        "Sakura"
      ],
      note: "Recommended P2W formation: Boudica / Ramses II / Sakura."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Eselfred."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Harald",
        "Percival",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Harald / Percival / Cao Cao."
    },
    {
      stage: "S4",
      tier: "p2w",
      heroes: [
        "King Arthur",
        "Edward the Confessor",
        "Cao Cao"
      ],
      note: "Recommended P2W formation: King Arthur / Edward the Confessor / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Percival",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: Percival / Bjorn / Henry II."
    },
    {
      stage: "S4",
      tier: "p2w",
      heroes: [
        "King Arthur",
        "Edward the Confessor",
        "Jade Eagle"
      ],
      note: "Recommended P2W formation: King Arthur / Edward the Confessor / Jade Eagle."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Julian",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Julian / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Hector"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Hector."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "El Cid",
        "Percival",
        "Oliver"
      ],
      note: "Recommended F2P formation: El Cid / Percival / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Octavius",
        "Percival",
        "Caesar"
      ],
      note: "Recommended P2W formation: Octavius / Percival / Caesar."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Achilles",
        "Percival",
        "Healer"
      ],
      note: "Recommended F2P formation: Achilles / Percival / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Edward the Confessor",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Ramses II / Edward the Confessor / Eselfred."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Harald",
        "El Cid",
        "Cao Cao"
      ],
      note: "Recommended F2P formation: Harald / El Cid / Cao Cao."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Henry II."
    }
  ],
  "black-annis": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Scarlet Reaver",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Scarlet Reaver / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Ramses II",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Ramses II / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Farah",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Farah / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Ramses II / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Edward the Confessor",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Edward the Confessor / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Robin Hood",
        "Healer"
      ],
      note: "Recommended P2W formation: Boudica / Robin Hood / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Henry II",
        "Sakura",
        "Healer"
      ],
      note: "Recommended P2W formation: Henry II / Sakura / Healer."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Liberator",
        "Warden",
        "Henry II"
      ],
      note: "Recommended P2W formation: Liberator / Warden / Henry II."
    },
    {
      stage: "X8",
      tier: "f2p",
      heroes: [
        "Warden",
        "Sakura",
        "Eselfred"
      ],
      note: "Recommended F2P formation: Warden / Sakura / Eselfred."
    },
    {
      stage: "X1",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Sakura",
        "Jade Eagle"
      ],
      note: "Recommended P2W formation: Boudica / Sakura / Jade Eagle."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Farah",
        "Sakura",
        "Henry II"
      ],
      note: "Recommended P2W formation: Farah / Sakura / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Gustav",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Gustav / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Warden",
        "Eselfred",
        "Henry II"
      ],
      note: "Recommended P2W formation: Warden / Eselfred / Henry II."
    }
  ],
  "trident-north-sea": [
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Bleeding Steed",
        "La Hire",
        "Henry II"
      ],
      note: "Recommended P2W formation: Bleeding Steed / La Hire / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Robin Hood",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Robin Hood / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "El Cid",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: El Cid / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Poison Master",
        "Henry II"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Poison Master / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Immortal Guardian",
        "Sundiata"
      ],
      note: "Recommended P2W formation: Don Quixote / Immortal Guardian / Sundiata."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Bleeding Steed",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Bleeding Steed / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Robin Hood",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Robin Hood / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Farah",
        "Sundiata"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Farah / Sundiata."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "El Cid",
        "Henry II"
      ],
      note: "Recommended P2W formation: Immortal Guardian / El Cid / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Darius",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Darius / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Bleeding Steed",
        "Henry II"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Bleeding Steed / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Poison Master",
        "Belisarius"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Poison Master / Belisarius."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Immortal Guardian",
        "Tura Cartel"
      ],
      note: "Recommended P2W formation: Don Quixote / Immortal Guardian / Tura Cartel."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Zhuge Liang",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Zhuge Liang / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Bleeding Steed",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Bleeding Steed / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "King Arthur",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: King Arthur / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Sakura",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Sakura / Al-Hawra."
    },
    {
      stage: "X2",
      tier: "p2w",
      heroes: [
        "Alexander",
        "Bleeding Steed",
        "Immortal Guardian"
      ],
      note: "Recommended P2W formation: Alexander / Bleeding Steed / Immortal Guardian."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Immortal Guardian",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Immortal Guardian / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Oliver"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Oliver."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Sakura",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Sakura / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Al-Hawra",
        "Eselfred"
      ],
      note: "Recommended P2W formation: Boudica / Al-Hawra / Eselfred."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Boudica",
        "Ramses II",
        "Al-Hawra"
      ],
      note: "Recommended P2W formation: Boudica / Ramses II / Al-Hawra."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Don Quixote",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Don Quixote / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "La Hire",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: La Hire / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Al-Hawra",
        "Bjorn",
        "Henry II"
      ],
      note: "Recommended P2W formation: Al-Hawra / Bjorn / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Bleeding Steed",
        "Al-Hawra",
        "Henry II"
      ],
      note: "Recommended P2W formation: Bleeding Steed / Al-Hawra / Henry II."
    },
    {
      stage: "X8",
      tier: "p2w",
      heroes: [
        "Ramses II",
        "Al-Hawra",
        "Caesar"
      ],
      note: "Recommended P2W formation: Ramses II / Al-Hawra / Caesar."
    }
  ]
};
