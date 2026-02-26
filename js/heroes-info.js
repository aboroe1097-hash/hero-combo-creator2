// js/heroes-info.js

export const heroesExtendedData = {
    "Immortal": {
        placement: "Back Row",
        minCopies: 14,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Additional Attack", range: 5, target: "1 Random Enemy", desc: "After a normal attack, 40% chance to attack 1 random enemy squad within the valid range at a time for 2 times, with 348% damage dealt each time." },
            { id: 5, type: "Additional Attack", range: 5, target: "1 Random Enemy", desc: "After a normal attack: there is 34% chance do 465% damage to 1 random enemy squad within the range and give the Silence status to the enemy squad, unable use combat skill for 1 turn." },
            { id: 8, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "Increase 80% damage for the legion the hero is in." }
        ]
    },
    "Wind-Walker": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 1, target: "1 Random Ally", desc: "Whenever the squad takes basic attacks, the First-Aid status will be entered, recover troops each turn (20% recovery rate), Lasts 2 turns, the first-aid status can stack 8 times." },
            { id: 5, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "60% chance to deal 331% damage to 2 enemy squads within range, and deal 331% damage to self squad." },
            { id: 8, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "50% chance to taunt 2 random enemy squads within range, lasting 2 turns, and make the squad enter counter-attack status, and return 150% damage when basic attacked, increase 100% resistance, lasts 2 turns." }
        ]
    },
    "Hunk": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 1, target: "1 Random Ally", desc: "When the squad takes damage, 25% chance to evade (immune this damage), 50% chance each turn to increase squad damage by 50%." },
            { id: 5, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "30% chance to make 2 random enemy squads to enter status Confuse (skill and basic attacks target random targets) and Flammable (Take 50% additional burning damage), lasts 2 turns." },
            { id: 8, type: "Pre-Battle Skills", range: 4, target: "2 Random Ally", desc: "First 6 turns, All frindly squads have 37 increased combat speed, 50% of the damage taken will be tallied on turn 7, pre battle round deal 469% damage to 2 random enemy." }
        ]
    },
    "Sakura": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 4, target: "2 Random Ally", desc: "First 2 turns, 2 random enemy will move first, on the second turn, deal 687% damage to 2 random to 2 random enemy squads." },
            { id: 5, type: "Pre-Battle Skills", range: 4, target: "2 Random Enemy", desc: "First 3 turns, 2 random enemy squads take 50% additional damage." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "2 Random Ally", desc: "First 3 turns, 2 random friendly archers squads deal 50% additional damage." }
        ]
    },
    "ELK": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 2, target: "1 Random Ally", desc: "First 3 turns, the front row Archer squad has 70% chance to enter counterattack state, which deals 250% return damage to the source when basic attacked." },
            { id: 5, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "In round 1/3/5, 100% chance to deal 220% Damage to 3 random enemy squads within the valid range and apply the Vulnerable status to the target, making the target take 15% more Damage than the previus round, lasting 1 round." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "2 Random Ally", desc: "The first three turns, 2 random friendly squads have 70% chance to be sober(immune to Silence, Disarm, Suppress, Confuse) and 55% increased might." }
        ]
    },
    "Cicero": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Additional Attack", range: 3, target: "2 Random Enemy", desc: "After basic attacks, 30% chance to deal 310% damage to 2 random enemy squads within range, making them take 20% additional damage for 2 turns." },
            { id: 5, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "60% chance to have 2 random enemy squads enter the armor break status, Lower -200% defense, Lasting 2 turns." },
            { id: 8, type: "Combat Skill", range: 2, target: "1 Random Ally", desc: "50% chance to have the front row to have 100% chance of evasion on the next 3 damage taken, lasting 2 turns." }
        ]
    },
    "Beowulf": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 1, target: "1 Random Ally", desc: "After every normal attack, the damage caused by the hero's normal attack will be magnified by 20%, stackable for up to 5 layers; after reaching the stackable limit, the hero enters the Mass Attack status, dealing some damage equal to 260% + layer count of the \"Feverish\" effect *50% to the two enemy squads other than the target in normal attack; the effect can cause Crit Damage; meanwhile, 100% chance to ignore the enemy's Dodging status when dealing damage." },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "1 Random Enemy", desc: "For every 2 normal attacks launched, restores some troop power for the hero's and 1 random friendly squad(s) (recovery rate: 75%), and deals 350% Physical Damage to 1 random enemy squad(s) (could trigger the Fatal Blow), subjecting the target enemy squad(s) to the Disarmed status for 1 round(s)." },
            { id: 8, type: "Pre-Battle Skills", range: 1, target: "1 Random Ally", desc: "Gains a 20% chance of Fatal Blow. After every healing effect received, gains the Feverish effect and an additional 10% chance of Fatal Blow (the Feverish effect can be stacked for up to 8 times), lasting till the battle ends; meanwhile, 90% chance for the hero to clear all negative statuses on the hero and enter the Sober status, immune to control effects and lasting till the next move." }
        ]
    },
    "Theodora": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 3, target: "1 Random Ally", desc: "60% chance to deal 20% skill damage to 1 random friendly squads, excluding the heros squad, making the target squads deal 50% more damage, lasting 2 rounds." },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "3 Random Enemy", desc: "When the hero takes damage, 40% chance to deal 160% Skill Damage to all enemy squads, with 40% chance to subject them to 1 random status out of Suppressed/Silenced/Disarmed/Confused, Lasting 2 rounds." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "1 Random Ally", desc: "When the front-low squad deals damage, restore some troop power for the squad to 60% of the damage dealt, lasting 6 rounds; the effect can take effect for up to 2 times in a round. When the front-row squad is dead, the hero will fight for 1 more rounds (the effect does not apply to battles against the Territory Guardians)." }
        ]
    },
    "Caesar": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 3, target: "3 Random Ally", desc: "Starting round 3, Caesar has 40% chance to cast a skill every round, which increases the Might and Resistance of all your Cavalry squads by 200% and Damage by 60%. Meanwhile, Caesar has 20% more chance to launch additional attacks, lasting till the battles ends (this skill can only be cast once). Every round, the chance of casting this skill increases by 20%." },
            { id: 5, type: "Additional Attack", range: 5, target: "2 Random Enemy", desc: "After a normal attack, 60% chance to deal Physical damage (damage rate: 480%) to 2 random enemy squads. 50% of the damage will be used to restore the troop power for 2 random squads on your side. The skill will have a cooldown of 1 round adter being cast. The first time you dodge damage in each round, 100% chance to cast the skill, with no cooldown period triggered this time." },
            { id: 8, type: "Additional Attack", range: 5, target: "3 Random Enemy", desc: "After a normal attack, 50% chance to deal Physical Damage to 2-3 squads (damage rate: 310%); the Dictating Ruler's damage rate will be increased by 1 time each time the skill is cast; this effect can be stacked and lasts until the end of the battle (this skill can only be triggered once per round)." }
        ]
    },
    "Octavius": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 1, target: "1 Random Ally", desc: "Octavius has a 80% chance to gain the Taunting effect every round. When a random squad is to be chasen by the enemy's active skill or additional attack, Octavius will be chosen first. The chance of casting this skill decreases by 5% every round." },
            { id: 5, type: "Pre-Battle Skills", range: 3, target: "1 Random Ally", desc: "Octavius takes -25% damage; at the beginning of the battle, applies a dodging status to your mid and back-row squads, allowing them to be immune to the next 3 times of icoming damage, lasting 2 rounds; each time taking damage, 100% chance to increase the might of 1 random friendly Cavalry squad by 30%[300% max]. This effect can be stacked up to 10 layers for each squad." },
            { id: 8, type: "Pre-Battle Skills", range: 5, target: "3 Random Ally", desc: "When the HP drops below 85% for the first time, all your squads will take -50% skill damage, lasting 3 round(s); When the HP drops below 50% for the first time, all enemy squads will immediately take some physical damage (damage rate: 350%); When the HP drops below 25% for the first time, all enemy squads will immediately take some physical damage (damage rate: 350%). Every time the skill is triggered, it will increase its own Resistance by 150%." }
        ]
    },
    "Boudica": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 3, target: "1 Random Enemy", desc: "Boudica charges forward. 70% chance to deal 200% Damage to 1 mid-row or back-row enemy squads within the valid range for 3 consecutive times; 40% of the Damage will be used to restore the power of 2 random squads of your side." },
            { id: 5, type: "Status Skill", range: 3, target: "1 Random Ally", desc: "Boudica has natural protection permanently. When dealing Skill Damage, 30% chance to cause Destructive Strike to the target; if Boudica acts before all enemy squads do, increases her chance to cast skills and Destructive Strike by 20% at the price of stopping her from lauch normal attacks." },
            { id: 8, type: "Pre-Battle Skills", range: 3, target: "1 Random Enemy", desc: "Before the battle, marks 2 random enemy squads within the valid range with 5 spear marks; each layer of mark will increase the skill damage the target takes by 10%; meanwhile, the delaying effect on all the Damage the target takes will be ignored; the marks will be reduced by 1 layer each round; in battles 60% chance each round to deal 500% Massive Damage to the enemy squad with the lowest troop power." }
        ]
    },
    "Jeanne d'Arc": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "1 round of prep. 50% chance to deal 477% damage to 2 random enemy squads within the valid range and make the squads take 30% more SKill Damage." },
            { id: 5, type: "Combat Skill", range: 2, target: "2 Random Ally", desc: "1 round of prep. 65% chance to make 2 random squads of your to enter the \"Revived\" status, with 50% chance to restore some troop power (recovery rate: 101%) when taking damage, lasting 2 rounds." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "In battles, your Cavalry squads will have 60% chance to skip 1 round of prep when casting prep skills (can be triggered up to 1 time by each squad in each round); Meanwhile, 80% chance to increase the Skill Damage dealt by the Hero's squad by 86%, lasting 1 round. The result of each effect will be determined independently." }
        ]
    },
    "Alfred": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "35% chance to deal 335% Damage to 2 enemy squads within the valid range and make the target's troop power restoring effect -40%. If the target is already subjected to a status that stops it from restoring troop power or curbs its power restoration, the target will take 30% more Skill Damage for 2 round." },
            { id: 5, type: "Combat Skill", range: 4, target: "3 Random Enemy", desc: "30% chance to deal 492% Massive Damage to all enemy squads, at the price making all your squads take 95% damage." },
            { id: 8, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "Alfred takes the mission in an emergency. When the troop powerm of his squad drops below 90%/70%/50%/30% for the first time, Alfred will have 50% more chance to cast combat skill and his squad deals 40% more skill damage and takes -35% damage, lasting 1 round." }
        ]
    },
    "Ramses II": {
        placement: "Any Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 6, target: "3 Random Ally", desc: "For the first 2 rounds, all enemy and your squads take -45% Physical Damage; in round 3-6, all your squads have 80% chance to cast normal attacks 2 times each rounds." },
            { id: 5, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "In battles, all your Archers squads gains 40% chance of \"Fatal Blow\"; the skill could increase the chance of \"Fatal Blow\" to up to 60%; the portion that exceeds the upper limit od \"Faltal Blow\" will be multiplied by 3 times and converted into the damage rate of \"Faltal Blow\"." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "Every time you squad triggers the \"Fatal Blow\", restores some troop power for the squad (recovery rate: 238%) and increases the damage rate of its Fatal Blow by 80%[560% max] (stackable for up to 7 times), lasting till the battle ends." }
        ]
    },
    "Cleopatra VII": {
        placement: "Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 5, target: "1 Random Ally", desc: "For the first 4 rounds, the friendly squad with the lowest troop power has 40% chance to dodge the incoming damage when being attacked; starting round 4 your squad with the lowest troop power will restore some troop power (recovery rate: 150%)." },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "3 Random Enemy", desc: "Cleopatra mesmerizes the enemy, as a result, for every 2 normal attacks by each enemy squad, the squad has a 50% chance to be confused and end up choosing a random target for its skill/normal attack, last 1 round(s)." },
            { id: 8, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "When the Hero takes actions, 100% chance to make the confused enemy squad stay in a vulnerable status, which means, every time it takes damage, it will take 15% more damage at the subsequent time, lasting 2 round(s); meanwhile, it has a 50% chance to take 225% damage immediately." }
        ]
    },
    "King Arthur": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "The Damage the Hero takes -80% at the start of the battle. Each time the Hero take Damage, the Damage mitigation effect will be reduced by 8%, with Resistance increased by 20% and Damage dealt increased by 10% (stackable up to 16 layers), effective until the end of the battle." },
            { id: 5, type: "Additional Attack", range: 3, target: "1 Random Enemy", desc: "Arthur wields his sacred sword; after a normal attack, 50% chance to deal 700% Physical Damage to 1 random enemy squads within the valid range. 40% of this damage will be used to restore the troop power of 2 random friendly squads. After casting the Sword in the Stone, 50% chance to apply it to the enemy's mid or back-row squad once additionally." },
            { id: 8, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "Arthur is blessings, permanently magnifying the healing effects he receives by 15%. For every 6 times of damage dealt by your squads, the casting chance of Sword in the Stone increases by 4%, stackable for up to 5 layers, lasting until the battle ends. When the stacking limit is reached, 100% chance to ignore the enemy's Dodging status when dealing damage, lasting 2 rounds." }
        ]
    },
    "Leonidas": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Additional Attack", range: 4, target: "2 Random Enemy", desc: "After launching a normal attack , 40% chance to make the Might -50% and Resistance -50% for 2 random enemy squads within the valid range and Silence the squads for 1 turn." },
            { id: 5, type: "Combat Skill", range: 4, target: "3 Random Enemy", desc: "50% chance to deal 220% Damage to 2-3 random enemy squads within the valid range." },
            { id: 8, type: "Pre-Battle Skills", range: 3, target: "3 Random Ally", desc: "In the first 2 rounds, all your Archer squads restore some HP each round (recovery rate: 55%); starting round 3, all your Archer squads take -30% damage and gain 5% life-steal effect, lasting till the battle ends." }
        ]
    },
    "Isabella I": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "1 Random Enemy", desc: "70% chance each round to breathe dragon's fire onto 1 random enemy squad at a time for 6 time(s), dealing 83% burning Damage; if all enemy squads are hit in round, 1 random friendly squad received Clarity (immune to the Suppressing/Silenceing/Disarming/Confusing effects) for 1 round." },
            { id: 5, type: "Pre-Battle Skills", range: 4, target: "2 Random Enemy", desc: "Starting from round 3, at the price of remaining on fire permanently, the hero's squad has 70% chance each round to deal 236% burning Damage to 2 random enemy squad(s), whose combat skill damage will then -20%." },
            { id: 8, type: "Status Skill", range: 4, target: "1 Random Ally", desc: "Bestows a shield to your squad(s) that stay(s) sober due to the skill 2 and the damage the squad(s) take(s) -50% for subsequent 2 time(s); when being on fire for the first time, the hero will recover a large amount of troop power for you front-row squad (recovery rate: 304) and suppress 1-2 random enemy squads within the valid range in the subsequent 1 round." }
        ]
    },
    "Desert Storm": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 5, target: "3 Random Enemy", desc: "On turn 1, 3 and 5, have all enemy squads enter Cursed, Burning and Poisoned, and dealing 24%, 29% and 34% damage on correspoding turns, lasting till the end of the battle." },
            { id: 5, type: "Pre-Battle Skills", range: 3, target: "2 Random Enemy", desc: "On the beginning of turn 5, 2 random friendly squads will Recover units each turn (Recovery rate: 60%)." },
            { id: 8, type: "Combat Skill", range: 5, target: "1 Random Enemy", desc: "100% chance to deal 243% damage to an enemy squad within range, Interrupting channeling skills." }
        ]
    },
    "Soaring Hawk": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "40% chance to deal 179% damage to 2 random enemy squads within range, making their Might -38%, lasting 2 turns." },
            { id: 5, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "Heroes squad have 100% chance to counterattack when basic attacked, dealing 120% damage to attacking source." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "First 2 turns, All friendly squads take -30% damage, after turn 3, heroes squad Recover 30% units when dealing damage." }
        ]
    },
    "The Brave": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 4, target: "2 Random Enemy", desc: "First 3 turns of the battle, 80% chance each turn to Disarm 2 enemy squads within range." },
            { id: 5, type: "Combat Skill", range: 5, target: "2 Random Enemy", desc: "1 Turn prep, 30% to Silence 2 random enemy squads within range, lasting 2 turns." },
            { id: 8, type: "Pre-Battle Skills", range: 4, target: "3 Random Enemy", desc: "In battle, all enemy squads lose -60% Might and Resistance, combat speed -100, damage taken increases by 5% and damage dealt -5% from round 5, all your cavalry squads deal 40% more damage." }
        ]
    },
    "Jade Eagle": {
        placement: "Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 5, target: "2 Random Enemy", desc: "40% chance to lauch 2 attacks, each dealing 142% Damage to 2 random enemy squads within the valid range, with a 25% chance to Silence the targets for 1 round." },
            { id: 5, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "1 turn prep. 50% chance to deal 310% damage to all enemy squads, making enemy Footmen (Cannot recover units) enemy Cavalry (Combat Skill Damage -50%), enemy Archers are (Disarmed), lasting 1 turn." },
            { id: 8, type: "Combat Skill", range: 5, target: "2 Random Enemy", desc: "In round 2 and 4, 100% chance to deal 863% Massive damage to 3 random enemy squads within range; if the target id Disarmed or Suppressed, it'll take 40% more Damage. lasting 2 rounds." }
        ]
    },
    "Immortal Guardian": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "Hero's squad Damage Taken -30%" },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "2 Random Enemy", desc: "In battle, when 2 random enemy squads within range cast combat skilss or basic attack, deal -5% damage to them this effects stacks a maximum of 8 times." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "First 3 turns. All friedly units damage taken -20%, 50% chance to Recover units when taking damage (Recovery rate: 45%)." }
        ]
    },
    "Divine Arrow": {
        placement: "Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "25% chance to deal 211% damage to 2 random enemy, Disarming them for 1 turn." },
            { id: 5, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "30% chance to cause Chain status, linking 2 random enemies, when one squad takes damage, the other will also take 25% damage, lasting 2 turns." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "In battle, All friendly Archers have Splash status, basic attacking can also deal 40% damage to 2 back row enemy squads." }
        ]
    },
    "Che Liu": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 1, target: "1 Random Ally", desc: "50% Increased damage for the squad. When the current troop is halved, Gain 100% additional Might and Resistance" },
            { id: 5, type: "Additional Attack", range: 2, target: "1 Random Enemy", desc: "After Basic Attacks, 100% chance to deal 247% damage to an enemy squad within range" },
            { id: 8, type: "Status Skill", range: 1, target: "1 Random Ally", desc: "100% chance to perform two normal attacks when current troop power drops below 50% of the amount at the start of battle. When this hero's squad is defeated or has broken morale, this Hero will continue to fight for one more turn (When attacking territories, if the Legion's loyalty is lower than Rebel Zeal, then the Hero will be unable to continue fighting)." }
        ]
    },
    "War Lord": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 3, target: "3 Random Ally", desc: "During battle, all friendly Cavalry squads has -20% basic attack damage, 45% increase combat skill damage." },
            { id: 5, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "On the first 2 turns, whenever the hero's squad takes damage, 70% chance to evade(Dodging) and avoid this damage." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "1 Random Ally", desc: "100% chance to increase the final combat skill casting chance of 1 random friendly squad to 100% in round 1, 3, 5 and 7. If the skill requires prep. 60% chance to skip 1 round of prepping." }
        ]
    },
    "Jane": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "1 turn prep 35% chance to deal 334.5% damage to all enemy squads within range." },
            { id: 5, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "30% chance to deal 255% damage to all enemy squads within range, making them unable to recover units, lasting 2 turn." },
            { id: 8, type: "Combat Skill", range: 4, target: "1 Random Ally", desc: "During battle, the hero squad cannot launch basic attack in exchange for increasing combat skill damage by 35% and also deals 301% skill damage to a random enemy squad within range." }
        ]
    },
    "Sky Breaker": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "40% chance to deal 325% damage to 2 random enemy and make the skill damage deal -20% for 2 turns." },
            { id: 5, type: "Pre-Battle Skills", range: 4, target: "3 Random Enemy", desc: "First 2 turns, Disarm 2 random enemy squads, making them unable to basic attack, on the 2nd turn, deal 267.5% damage to all enemy squads." },
            { id: 8, type: "Combat Skill", range: 3, target: "2 Random Enemy", desc: "1 turn prep. 50% chance to deal 260% damage to 2 random enemy and heal self and a random friendly squad (Recovery rate: 142%)." }
        ]
    },
    "Rokuboshuten": {
        placement: "Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "40% chance to deal 255% damage to 2 random enemy, making their Might and Resistance -55%, lasting 2 turns." },
            { id: 5, type: "Status Skill", range: 1, target: "2 Random Ally", desc: "During battle, whenever casting a skill that requires prepping, 100% chance for the heros squad to enter the status Clarity (Immune to silence, disarm, suppression and confusion) lasting 2 turns, after casting a combat skill, 100% chance to increase the might and resistance by 100% to two random friendly squads, lasting 2 turns." },
            { id: 8, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "1 turn prep 40% chance to deal 196.5% damage to all enemy, silencing them, making them unable to use combat skills, lasting 1 turn." }
        ]
    },
    "Bleeding Steed": {
        placement: "Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 2, target: "2 Random Ally", desc: "First 3 turns, 2 friendly squads have 60% bonus damage." },
            { id: 5, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "1 turn prep. 50% chance to Confuse 2 random enemy , skills and basic attack targets become random, lasting 2 turns." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "During battle, when all friendly squads receive damage, 50% chance to recover some units (Recovery Rate: 33%)." }
        ]
    },
    "Rozen Blade": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "3 Random Enemy", desc: "30% chance to remove the debuff of ally Cavalry and archers (excluding Debuffs from pre-battle skills), give their Basic Attacks 25% chance to cause 1 turn Suppression, lasting 1 turn." },
            { id: 5, type: "Pre-Battle Skills", range: 3, target: "3 Random Ally", desc: "During the first 3 turns, all friendly squads gain 100 Cambat Speed and a 70% chance to deal 2 basic attacks on each turn(effects of the same type cannot be stacked)." },
            { id: 8, type: "Pre-Battle Skills", range: 4, target: "2 Random Enemy", desc: "During Battle, Whenever 2 random enemy squads take damage, they take 12% extra damage, maximum 5 stacks." }
        ]
    },
    "Jade": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 5, target: "1 Random Enemy", desc: "1 Turn prep. 40% chance to attack 6 times, each attack randomly selects an enemy squad within range dealing 162% Damage." },
            { id: 5, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "The Squad with hero increase 10% damage. this effect stack once everu turn." },
            { id: 8, type: "Combat Skill", range: 5, target: "2 Random Enemy", desc: "40% chance to deal 160% damage to 2 random squads within the effective range and give the Curse status to an enemy squad, who will suffer 80% damage whenever they use combat skills, for 2 turns." }
        ]
    },
    "Witch Hunter": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "30% chance to deal 237% damage to all enemy squads within the valid range and inflict the Flammable status on them, increasing the Burning damage they take by 35% lasting 2 turns." },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "2 Random Enemy", desc: "For the first three rounds, 2 random enemy squads combat skill damage -75%, with 90% chance to silence them, stopping them from casting comnat skills in the 1 turn." },
            { id: 8, type: "Combat Skill", range: 5, target: "3 Random Enemy", desc: "40% chance to attack all squad for 135% damage within the range and give the burning status to the squad, receive 142% damage, last for 2 turn." }
        ]
    },
    "Peace Bringer": {
        placement: "Front Row / Middle Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Status Skill", range: 0, target: "1 Random Ally", desc: "Hero's squad has 50% chance to be buffed every turn, taking -50% fewer damage these turns. hero's squad has a 35% chance to counterattack when basic attacked, dealing 190% damage to the damage source." },
            { id: 5, type: "Pre-Battle Skills", range: 5, target: "3 Random Ally", desc: "The first three turns reduce the damage dealt by -45% for all squads, our entire squad reduce damage taken by -20%, starting at the fourth turn, increase our combat skill damage by 20%, unto the end of the battle." },
            { id: 8, type: "Combat Skill", range: 4, target: "3 Random Enemy", desc: "30% chance to deal 203% damage to the all enemy squads within the range and give the Vulnerable status to the squad, each time enemy is being attacked causing extra 20% damage , last 1 turn." }
        ]
    },
    "Inquisitor": {
        placement: "Middle Row / Back Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Combat Skill", range: 4, target: "3 Random Enemy", desc: "1 turns prep, 35% chance to attack all squad for 246% damage within the range and give the Disarm status to the enemy squad, enemy unable to perform a normal attack, last for 2 turns." },
            { id: 5, type: "Pre-Battle Skills", range: 4, target: "3 Random Enemy", desc: "Increase damage taken from archers by 50% to all enemy squads." },
            { id: 8, type: "Combat Skill", range: 4, target: "2 Random Enemy", desc: "35% chance to deal 342% damage to 2 random squads within range, if the target is in Flammable status there is 50% chance put it into Suppress status, unable to move." }
        ]
    },
    "BeastQueen": {
        placement: "Front Row",
        minCopies: 34,
        maxCopies: 34,
        skills: [
            { id: 2, type: "Pre-Battle Skills", range: 2, target: "3 Random Ally", desc: "In the first turn, all our squads normal attack and pursuit skill damage increased by 80%, the effect reduced by 1/4 er round." },
            { id: 5, type: "Pre-Battle Skills", range: 2, target: "2 Random Ally", desc: "The first 3 turns, 2 random friendly squads have 70% chance to enter the Sputtering status, normal attack deal 160% damage to 2 enemy squads behind the target." },
            { id: 8, type: "Pre-Battle Skills", range: 2, target: "1 Random Ally", desc: "First 3 turn of the battle, the front row cavalry squad has 70% chance to enter counterattack status, which deals 250% return damage to the source when basic attacked." }
        ]
    }
};
