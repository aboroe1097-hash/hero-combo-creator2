// js/heroes-info.js

export const heroesExtendedData = {
    "Immortal": {
        placement: "Back Row", // Front Row, Middle Row, Back Row, etc.
        minCopies: 14,
        maxCopies: 34,
        skills: [
            {
                id: 2,
                type: "Additional Attack",
                range: 5,
                target: "1 Random Enemy",
                desc: "After a normal attack, 40% chance to attack 1 random enemy squad within the valid range at a time for 2 times, with 348% damage dealt each time."
            },
            {
                id: 5,
                type: "Additional Attack",
                range: 5,
                target: "1 Random Enemy",
                desc: "After a normal attack: there is 34% chance do 465% damage to 1 random enemy squad within the range and give the Silence status to the enemy squad, unable use combat skill for 1 turn."
            },
            {
                id: 8,
                type: "Status Skill",
                range: 0,
                target: "1 Random Ally",
                desc: "Increase 80% damage for the legion the hero is in."
            }
        ]
    }
    // Add more heroes here easily:
    // "Hero Name": { placement: "...", minCopies: 34, maxCopies: 34, skills: [ ... ] }
};
