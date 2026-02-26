// js/heroes-info.js

export const heroesExtendedData = {
    "Immortal": {
        placement: "Back Row",
        minCopies: 14,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Additional Attack",
                range: 5,
                target: "1 Random Enemy",
                desc: "After a normal attack, <b>40%</b> chance to attack 1 random enemy squad within the valid range at a time for 2 times, with <b>348% damage</b> dealt each time."
            },
            {
                id: 5,
                type: "Additional Attack",
                range: 5,
                target: "1 Random Enemy",
                desc: "After a normal attack: there is <b>34%</b> chance do <b>465% damage</b> to 1 random enemy squad within the range and give the <u><b>Silence</b></u> status to the enemy squad, <b>unable use combat skill</b> for 1 turn."
            },
            {
                id: 8,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "<b>Increase 80% damage</b> for the legion the hero is in."
            }
        ]
    },
    "Wind-Walker": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Status Skill",
                range: 1,
                target: "1 Random Ally",
                desc: "Whenever the squad takes basic attacks, the <b>First-Aid</b> status will be entered, recover troops each turn (<b>20%</b> recovery rate), Lasts 2 turns, the first-aid status can <b>stack 8</b> times."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 3,
                target: "2 Random Enemy",
                desc: "<b>60%</b> chance to deal <b>331% damage</b> to 2 enemy squads within range, and deal <b>331% damage to self squad</b>."
            },
            {
                id: 8,
                type: "Combat Skill",
                range: 4,
                target: "2 Random Enemy",
                desc: "<b>50%</b> chance to taunt 2 random enemy squads within range, lasting 2 turns, and make the squad enter <b>counter-attack</b> status, and return <b>150% damage</b> when basic attacked, <b>increase 100% resistance</b>, lasts 2 turns."
            }
        ]
    },
    "Hunk": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Status Skill",
                range: 1,
                target: "1 Random Ally",
                desc: "When the squad takes damage, <b>25%</b> chance to <b>evade</b> (immune this damage), <b>50%</b> chance each turn to <b>increase squad damage by 50%</b>."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 4,
                target: "2 Random Enemy",
                desc: "<b>30%</b> chance to make 2 random enemy squads to enter status <u><b>Confuse</b></u> (skill and basic attacks target random targets) and <u><b>Flammable</b></u> (Take 50% additional burning damage), lasts 2 turns."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 4,
                target: "2 Random Ally",
                desc: "First 6 turns, All frindly squads have <b>37 increased combat speed</b>, <b>50% of the damage taken will be tallied on turn 7</b>, pre battle round deal <b>469% damage</b> to 2 random enemy."
            }
        ]
    },
    "Sakura": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 4,
                target: "2 Random Ally",
                desc: "First 2 turns, 2 random enemy will move first, on the second turn, deal <b>687% damage</b> to 2 random to 2 random enemy squads."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 4,
                target: "2 Random Enemy",
                desc: "First 3 turns, 2 random enemy squads take <b>50% additional damage</b>."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "2 Random Ally",
                desc: "First 3 turns, 2 random friendly archers squads deal <b>50% additional damage</b>."
            }
        ]
    },
    "ELK": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 2,
                target: "1 Random Ally",
                desc: "First 3 turns, the front row Archer squad has <b>70%</b> chance to enter <b>counterattack</b> state, which deals <b>250% return damage</b> to the source when basic attacked."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 5,
                target: "3 Random Enemy",
                desc: "In round 1/3/5, <b>100%</b> chance to deal <b>220% Damage</b> to 3 random enemy squads within the valid range and apply the <b>Vulnerable</b> status to the target, making the target take <b>15% more Damage</b> than the previus round, lasting 1 round."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "2 Random Ally",
                desc: "The first three turns, 2 random friendly squads have <b>70%</b> chance to be <b>sober</b>(immune to Silence, Disarm, Suppress, Confuse) and 55% increased might."
            }
        ]
    },
    "Cicero": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Additional Attack",
                range: 3,
                target: "2 Random Enemy",
                desc: "After basic attacks, <b>30%</b> chance to deal <b>310% damage</b> to 2 random enemy squads within range, making them take <b>20% additional damage</b> for 2 turns."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 3,
                target: "2 Random Enemy",
                desc: "<b>60%</b> chance to have 2 random enemy squads enter the <b>armor break</b> status, Lower <b>-200% defense</b>, Lasting 2 turns."
            },
            {
                id: 8,
                type: "Combat Skill",
                range: 2,
                target: "1 Random Ally",
                desc: "<b>50%</b> chance to have the front row to have <b>100%</b> chance of <b>evasion</b> on the next <b>3 damage taken</b>, lasting 2 turns."
            }
        ]
    },
    "Beowulf": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 1,
                target: "1 Random Ally",
                desc: "After every normal attack, the damage caused by the hero's normal attack will be magnified by <b>20%</b>, stackable for up to <b>5</b> layers; after reaching the stackable limit, the hero enters the <b>Mass Attack</b> status, dealing some damage equal to <b>260%</b> + layer count of the \"Feverish\" effect *<b>50%</b> to the two enemy squads other than the target in normal attack; the effect can cause Crit Damage; meanwhile, <b>100%</b> chance to ignore the enemy's Dodging status when dealing damage."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 5,
                target: "1 Random Enemy",
                desc: "For every <b>2</b> normal attacks launched, restores some troop power for the hero's and <b>1</b> random friendly squad(s) (recovery rate: <b>75%</b>), and deals <b>350%</b> Physical Damage to <b>1</b> random enemy squad(s) (could trigger the Fatal Blow), subjecting the target enemy squad(s) to the Disarmed status for <b>1</b> round(s)."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 1,
                target: "1 Random Ally",
                desc: "Gains a <b>20%</b> chance of Fatal Blow. After every healing effect received, gains the Feverish effect and an additional <b>10%</b> chance of Fatal Blow (the Feverish effect can be stacked for up to <b>8</b> times), lasting till the battle ends; meanwhile, <b>90%</b> chance for the hero to clear all negative statuses on the hero and enter the <b>Sober</b> status, immune to control effects and lasting till the next move."
            }
        ]
    },
    "Theodora": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 3,
                target: "1 Random Ally",
                desc: "<b>60%</b> chance to deal <b>20% skill damage</b> to <u>1 random friendly</u> squads, excluding the heros squad, making the target squads <b>deal 50% more damage</b>, lasting 2 rounds."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 5,
                target: "3 Random Enemy",
                desc: "When the hero takes damage, <b>40%</b> chance to <b>deal 160% Skill Damage</b> to all enemy squads, with <b>40%</b> chance to subject them to 1 random status out of <u><b>Suppressed/Silenced/Sisarmed/Confused</b></u>, Lasting 2 rounds."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "1 Random Ally",
                desc: "When the front-low squad deals damage, <b>restore some troop</b> power for the squad to <b>60% of the damage dealt</b>, lasting <b>6</b> rounds; the effect can take effect for up to <b>2 times</b> in a round. When the front-row squad is dead, the hero will fight for 1 more rounds (<u>the effect does not apply to battles against the Territory Guardians</u>)."
            }
        ]
    },
    "Caesar": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 3,
                target: "3 Random Ally",
                desc: "Starting round <b>3</b>, Caesar has <b>40%</b> chance to <u>cast a skill every round</u>, which <b>increases the Might and Resistance</b> of all your Cavalry squads by <b>200% and Damage by 60%</b>. Meanwhile, Caesar has 20% more chance to launch additional attacks, lasting till the battles ends (this skill can only be cast once). Every round, the chance of casting this <b>skill increases by 20%</b>."
            },
            {
                id: 5,
                type: "Additional Attack",
                range: 5,
                target: "2 Random Enemy",
                desc: "After a normal attack, <b>60%</b> chance to deal <b>Physical damage</b> (damage rate: <b>480%</b>) to 2 random enemy squads. <b>50%</b> of the damage will be used to <b>restore the troop power</b> for <b>2</b> random squads on your side. The skill will have a cooldown of 1 round adter being cast. The first time you <b>dodge</b> damage in each round, <b>100%</b> chance to <b>cast the skill</b>, with no cooldown period triggered this time."
            },
            {
                id: 8,
                type: "Additional Attack",
                range: 5,
                target: "3 Random Enemy",
                desc: "After a normal attack, <b>50%</b> chance to deal <b>Physical Damage</b> to <b>2-3</b> squads (<b>damage rate: 310%</b>); the Dictating Ruler's damage rate will be <b>increased by 1 time</b> each time the skill is cast; this effect can be stacked and lasts until the end of the battle (this skill can only be triggered once per round)."
            }
        ]
    },
    "Octavius": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Status Skill",
                range: 1,
                target: "1 Random Ally",
                desc: "Octavius has a <b>80%</b> chance to gain the <u><b>Taunting</b></u> effect every round. When a random squad is to be chasen by the enemy's active skill or additional attack, Octavius will be chosen first. The chance of casting this skill <b>decreases by 5%</b> every round."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 3,
                target: "1 Random Ally",
                desc: "Octavius <b>takes -25% damage</b>; at the beginning of the battle, applies a <u><b>dodging</b></u> status to your mid and back-row squads, allowing them to be immune to the next 3 times of icoming damage, lasting 2 rounds; each time taking damage, <b>100%</b> chance to <b>increase the might</b> of 1 random friendly Cavalry squad by <b>30%[300% max]</b>. This effect can be stacked up to 10 layers for each squad."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 5,
                target: "3 Random Ally",
                desc: "When the HP drops below <b>85%</b> for the first time, all your squads will take <b>-50% skill damage</b>, lasting 3 round(s); When the HP drops below <b>50%</b> for the first time, all enemy squads will immediately take some <b>physical damage (damage rate: 350%)</b>; When the HP drops below <b>25%</b> for the first time, all enemy squads will immediately take some <b>physical damage (damage rate: 350%)</b>. Every time the skill is triggered, it will <b>increase its own Resistance by 150%</b>."
            }
        ]
    },
    "Boudica": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 3,
                target: "1 Random Enemy",
                desc: "Boudica charges forward. <b>70%</b> chance to deal <b>200% Damage</b> to 1 mid-row or back-row enemy squads within the valid range for 3 consecutive times; <b>40%</b> of the Damage will be used to <b>restore the power</b> of 2 random squads of your side."
            },
            {
                id: 5,
                type: "Status Skill",
                range: 3,
                target: "1 Random Ally",
                desc: "Boudica has natural protection permanently. When dealing Skill Damage, <b>30%</b> chance to cause <b>Destructive Strike</b> to the target; if Boudica acts before all enemy squads do, <b>increases her chance to cast skills</b> and <b>Destructive Strike by 20%</b> at the price of stopping her from lauch normal attacks."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 3,
                target: "1 Random Enemy",
                desc: "Before the battle, <b>marks 2</b> random enemy squads within the valid range with <b>5</b> spear marks; each layer of mark will increase the skill damage the target takes by <b>10%</b>; meanwhile, the delaying effect on all the Damage the target takes will be ignored; the marks will be reduced by 1 layer each round; in battles <b>60%</b> chance each round to deal <b>500% Massive Damage</b> to the enemy squad with the lowest troop power."
            }
        ]
    },
    "Jeanne d'Arc": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 4,
                target: "2 Random Enemy",
                desc: "<b>1 round of prep</b>. <b>50%</b> chance to deal <b>477% damage</b> to 2 random enemy squads within the valid range and make the squads take <b>30% more SKill Damage</b>."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 2,
                target: "2 Random Ally",
                desc: "<b>1 round of prep</b>. <b>65%</b> chance to make <b>2</b> random squads of your to enter the \"<u><b>Revived</b></u>\" status, with <b>50%</b> chance to <b>restore some troop</b> power (<u>recovery rate: 101%</u>) when taking damage, lasting 2 rounds."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "3 Random Ally",
                desc: "In battles, your Cavalry squads will have <b>60%</b> chance to <u><b>skip 1 round of prep</b></u> when casting prep skills (can be triggered up to 1 time by each squad in each round); Meanwhile, <b>80%</b> chance to <b>increase the Skill Damage dealt</b> by the Hero's squad by <b>86%</b>, lasting 1 round. The result of each effect will be determined independently."
            }
        ]
    },
    "Alfred": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 4,
                target: "2 Random Enemy",
                desc: "<b>35%</b> chance to deal <b>335% Damage</b> to 2 enemy squads within the valid range and make the target's troop power <b>restoring effect -40%</b>. If the target is already subjected to a status that stops it from restoring troop power or curbs its power restoration, the target will take <b>30% more Skill Damage</b> for <b>2</b> round."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 4,
                target: "3 Random Enemy",
                desc: "<b>30%</b> chance to deal <b>492% Massive Damage</b> to <u>all enemy</u> squads, at the price making <u>all your squads take 95% damage</u>."
            },
            {
                id: 8,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "Alfred takes the mission in an emergency. When the troop powerm of his squad drops below <u><b>90%/70%/50%/30%</b></u> for the first time, Alfred will have <b>50%</b> more <u><b>chance to cast combat skill</b></u> and his squad deals <b>40% more skill damage</b> and <b>takes -35% damage</b>, lasting 1 round."
            }
        ]
    },
    "Ramses II": {
        placement: "Any Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 6,
                target: "3 Random Ally",
                desc: "For the first <b>2</b> rounds, <u>all enemy</u> and your squads take <b>-45% Physical Damage</b>; in round <b>3-6</b>, all your squads have <b>80%</b> chance to <u><b>cast normal attacks</b></u> <b>2</b> times each rounds."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 2,
                target: "3 Random Ally",
                desc: "In battles, all your Archers squads gains <b>40%</b> chance of \"<u><b>Fatal Blow</b></u>\"; the skill could <u>increase the chance of \"Fatal Blow\"</u> to up to <b>60%</b>; the portion that exceeds the upper limit od \"Faltal Blow\" will be multiplied by 3 times and converted into the damage rate of \"Faltal Blow\"."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "3 Random Ally",
                desc: "Every time you squad triggers the \"<u><b>Fatal Blow</b></u>\", restores some troop power for the squad (<b>recovery rate: 238%</b>) and <b>increases the damage rate of its Fatal Blow by 80%[560% max]</b> (<u>stackable for up to 7 times</u>), lasting till the battle ends."
            }
        ]
    },
    "Cleopatra VII": {
        placement: "Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 5,
                target: "1 Random Ally",
                desc: "For the first <b>4</b> rounds, the friendly squad with the lowest troop power has <b>40%</b> chance to <u><b>dodge</b></u> the incoming damage when being attacked; starting round 4 your squad with the lowest troop power will restore some troop power (<b>recovery rate: 150%</b>)."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 5,
                target: "3 Random Enemy",
                desc: "Cleopatra mesmerizes the enemy, as a result, for every <b>2</b> normal attacks by each enemy squad, the squad has a <b>50%</b> chance to be <u><b>confused</b></u> and end up choosing a random target for its skill/normal attack, last 1 round(s)."
            },
            {
                id: 8,
                type: "Combat Skill",
                range: 5,
                target: "3 Random Enemy",
                desc: "When the Hero takes actions, <b>100%</b> chance to make the <u><b>confused</b></u> enemy squad stay in a <u><b>vulnerable</b></u> status, which means, every time it takes damage, it will take <b>15% more damage</b> at the subsequent time, lasting 2 round(s); meanwhile, it has a <b>50%</b> chance to take <b>225% damage</b> immediately."
            }
        ]
    },
    "King Arthur": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "The Damage the Hero takes <b>-80%</b> at the start of the battle. Each time the Hero take Damage, the Damage mitigation effect will be <b>reduced by 8%</b>, with <b>Resistance increased by 20%</b> and <b>Damage dealt increased by 10%</b> (<u>stackable up to 16 layers</u>), effective until the end of the battle."
            },
            {
                id: 5,
                type: "Additional Attack",
                range: 3,
                target: "1 Random Enemy",
                desc: "Arthur wields his sacred sword; after a normal attack, <b>50%</b> chance to deal <b>700% Physical Damage</b> to 1 random enemy squads within the valid range. <b>40%</b> of this damage will be used to <b>restore the troop power</b> of <b>2</b> random friendly squads. After casting the Sword in the Stone, <b>50%</b> chance to apply it to the enemy's mid or back-row squad once additionally."
            },
            {
                id: 8,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "Arthur is blessings, permanently magnifying the healing effects he receives by <b>15%</b>. For every <b>6</b> times of damage dealt by your squads, the casting chance of Sword in the Stone increases by <b>4%</b>, stackable for up to <b>5</b> layers, lasting until the battle ends. When the stacking limit is reached, <b>100%</b> chance to ignore the enemy's Dodging status when dealing damage, lasting <b>2</b> rounds."
            }
        ]
    },
    "Leonidas": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Additional Attack",
                range: 4,
                target: "2 Random Enemy",
                desc: "After launching a normal attack , <b>40%</b> chance to make the <u><b>Might</b></u> <b>-50%</b> and <u><b>Resistance</b></u> <b>-50%</b> for 2 random enemy squads within the valid range and <u><b>Silence</b></u> the squads for 1 turn."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 4,
                target: "3 Random Enemy",
                desc: "<b>50%</b> chance to deal <b>220% Damage</b> to <b>2-3</b> random enemy squads within the valid range."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 3,
                target: "3 Random Ally",
                desc: "In the first 2 rounds, all your Archer squads restore some HP each round (<b>recovery rate: 55%</b>); starting round 3, all your Archer squads <b>take -30% damage</b> and gain <b>5% life-steal</b> effect, lasting till the battle ends."
            }
        ]
    },
    "Isabella I": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 4,
                target: "1 Random Enemy",
                desc: "<b>70%</b> chance each round to breathe dragon's fire onto 1 random enemy squad at a time for 6 time(s), dealing 83% <u><b>burning</b></u> Damage; if all enemy squads are hit in round, 1 random friendly squad received <u><b>Clarity</b></u> (immune to the Suppressing/Silenceing/Disarming/Confusing effects) for 1 round."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 4,
                target: "2 Random Enemy",
                desc: "Starting from round 3, at the price of remaining on fire permanently, the hero's squad has <b>70%</b> chance each round to deal 236% <u><b>burning</b></u> Damage to 2 random enemy squad(s), whose combat skill damage will then -20%."
            },
            {
                id: 8,
                type: "Status Skill",
                range: 4,
                target: "1 Random Ally",
                desc: "Bestows a shield to your squad(s) that stay(s) sober due to the skill 2 and the damage the squad(s) take(s) -50% for subsequent 2 time(s); when being on fire for the first time, the hero will <u><b>recover</b></u> a large amount of troop power for you front-row squad (recovery rate: 304) and <u><b>suppress</b></u> 1-2 random enemy squads within the valid range in the subsequent 1 round."
            }
        ]
    },
    "Desert Storm": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 5,
                target: "3 Random Enemy",
                desc: "On turn 1, 3 and 5, have all enemy squads enter <u><b>Cursed</b></u>, <u><b>Burning</b></u> and <u><b>Poisoned</b></u>, and <b>dealing 24%, 29% and 34% damage</b> on correspoding turns, lasting till the end of the battle."
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 3,
                target: "2 Random Enemy",
                desc: "On the beginning of turn 5, 2 random friendly squads will <b>Recover units</b> each turn (Recovery rate: <b>60%</b>)."
            },
            {
                id: 8,
                type: "Combat Skill",
                range: 5,
                target: "1 Random Enemy",
                desc: "<b>100%</b> chance to deal <b>243% damage</b> to an enemy squad within range, <u><b>Interrupting</b></u> channeling skills."
            }
        ]
    },
    "Soaring Hawk": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 3,
                target: "2 Random Enemy",
                desc: "<b>40%</b> chance to deal <b>179% damage</b> to 2 random enemy squads within range, making their <b>Might -38%</b>, lasting 2 turns."
            },
            {
                id: 5,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "Heroes squad have <b>100%</b> chance to <u><b>counterattack</b></u> when basic attacked, dealing <b>120% damage</b> to attacking source."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "3 Random Ally",
                desc: "First 2 turns, All friendly squads take <b>-30% damage</b>, after turn 3, heroes squad <b>Recover 30%</b> units when dealing damage."
            }
        ]
    },
    "The Brave": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Pre-Battle Skills",
                range: 4,
                target: "2 Random Enemy",
                desc: "First 3 turns of the battle, <b>80%</b> chance each turn to <u><b>Disarm</b></u> 2 enemy squads within range."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 5,
                target: "2 Random Enemy",
                desc: "<u><b>1 Turn prep</b></u>, <b>30%</b> to <u><b>Silence</b></u> 2 random enemy squads within range, lasting 2 turns."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 4,
                target: "3 Random Enemy",
                desc: "In battle, all enemy squads lose <b>-60% Might and Resistance</b>, combat speed <b>-100</b>, damage taken increases by <b>5%</b> and damage dealt <b>-5%</b> from round 5, all your <b>cavalry</b> squads deal <b>40% more damage</b>."
            }
        ]
    },
    "Jade Eagle": {
        placement: "Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 5,
                target: "2 Random Enemy",
                desc: "<b>40%</b> chance to lauch <u><b>2 attacks</b></u>, each dealing <b>142% Damage</b> to 2 random enemy squads within the valid range, with a <b>25%</b> chance to <u><b>Silence</b></u> the targets for <b>1</b> round."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 5,
                target: "3 Random Enemy",
                desc: "<u><b>1 turn prep</b></u>. <b>50%</b> chance to deal <b>310% damage</b> to all enemy squads, making enemy Footmen (<b>Cannot recover units</b>) enemy Cavalry (Combat Skill Damage <b>-50%</b>), enemy Archers are (<u><b>Disarmed</b></u>), lasting 1 turn."
            },
            {
                id: 8,
                type: "Combat Skill",
                range: 5,
                target: "2 Random Enemy",
                desc: "<u><b>In round 2 and 4</b></u>, 100% chance to deal <b>863% Massive damage</b> to 3 random enemy squads within range; <u>if the target id Disarmed or Suppressed</u>, it'll take <b>40% more Damage</b>. lasting 2 rounds."
            }
        ]
    },
    "Immortal Guardian": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "Hero's squad <b>Damage Taken -30%</b>"
            },
            {
                id: 5,
                type: "Pre-Battle Skills",
                range: 5,
                target: "2 Random Enemy",
                desc: "In battle, when 2 random enemy squads within range cast combat skilss or basic attack, <b>deal -5% damage</b> to them this effects stacks a maximum of 8 times."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "3 Random Ally",
                desc: "First 3 turns. All friedly units <b>damage taken -20%</b>, <b>50%</b> chance to <b>Recover</b> units when taking damage (Recovery rate: <b>45%</b>)."
            }
        ]
    },
    "Divine Arrow": {
        placement: "Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Combat Skill",
                range: 4,
                target: "2 Random Enemy",
                desc: "<b>25%</b> chance to deal <b>211% damage</b> to 2 random enemy, <u><b>Disarming</b></u> them for 1 turn."
            },
            {
                id: 5,
                type: "Combat Skill",
                range: 3,
                target: "2 Random Enemy",
                desc: "<b>30%</b> chance to cause <u><b>Chain</b></u> status, linking 2 random enemies, when one squad takes damage, the other will also take <b>25% damage</b>, lasting 2 turns."
            },
            {
                id: 8,
                type: "Pre-Battle Skills",
                range: 2,
                target: "3 Random Ally",
                desc: "In battle, All friendly Archers have <b>Splash</b> status, basic attacking can also deal <b>40% damage</b> to 2 back row enemy squads."
            }
        ]
    }
};
