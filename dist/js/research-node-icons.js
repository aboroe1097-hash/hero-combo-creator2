/**
 * Smart tech-node icon resolver for Rise of Empires / Rise of Castles: Ice & Fire
 * research trees (same studio lineage as Last Shelter: Survival — Eden & academy
 * mechanics are closely related). Matches node name + buff (+ troop) to custom
 * inline SVG icons — no in-game asset imports.
 */

const ICON_SVGS = {
    food: '<path d="M12 3c-1.5 2.5-4 4.2-4 7.2a4 4 0 0 0 8 0c0-3-2.5-4.7-4-7.2Z" fill="currentColor" opacity=".25"/><path d="M8 14h8M10 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    ale: '<path d="M8 8h8l-1.2 9.5a2 2 0 0 1-2 1.7H11.2a2 2 0 0 1-2-1.7L8 8Z" stroke="currentColor" stroke-width="1.6"/><path d="M7 8h10M9 5.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    lumber: '<path d="M7 18 13 6l4 4-6 12H7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 10 7 18h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    fire: '<path d="M12 4c2 3 4 4.5 4 7.5a4 4 0 1 1-8 0C8 8.5 10 7 12 4Z" stroke="currentColor" stroke-width="1.6"/><path d="M12 14.5v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    stone: '<rect x="6" y="8" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M8 8V6.5A2.5 2.5 0 0 1 12 4v0a2.5 2.5 0 0 1 4 2.5V8" stroke="currentColor" stroke-width="1.6"/>',
    iron: '<path d="M6 16h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8.5 16 11 7h2l2.5 9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 11h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    gold: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 8.5v7M9.2 10.2h5.6M9.4 13.8h5.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    gem: '<path d="M12 5 16.5 9 12 19 7.5 9 12 5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.5 9h9" stroke="currentColor" stroke-width="1.6"/>',
    gather: '<path d="M8 17 14 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 7h-4M14 7v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 19h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    storage: '<path d="M5 9h14v9H5z" stroke="currentColor" stroke-width="1.6"/><path d="M8 9V7.5A4 4 0 0 1 16 7.5V9M8 13h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    build: '<path d="M5 18h14M7 18V9l5-4 5 4v9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    production: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    stability: '<path d="M12 4v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M6 9h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 14h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    hero: '<circle cx="12" cy="8.5" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 18c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    heroes: '<circle cx="8.5" cy="9" r="2.3" stroke="currentColor" stroke-width="1.4"/><circle cx="15.5" cy="9" r="2.3" stroke="currentColor" stroke-width="1.4"/><path d="M5 17c.6-2.2 2-3.3 3.5-3.3M19 17c-.6-2.2-2-3.3-3.5-3.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    banner: '<path d="M7 5v14M7 5h8l-2 3 2 3H7" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    recall: '<path d="M7 8H5v5h2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 11h6a3 3 0 1 0 0-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    supply: '<rect x="6" y="7" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M9 7V5.5h6V7M9 12h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    march: '<path d="M6 14c2-4 4-6 6-6s4 2 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="9" r="1.5" fill="currentColor"/><circle cx="16" cy="9" r="1.5" fill="currentColor"/>',
    load: '<path d="M8 9h8l-1.5 8H9.5L8 9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 9V7a2 2 0 0 1 4 0v2" stroke="currentColor" stroke-width="1.6"/>',
    shield: '<path d="M12 4 6 7v5c0 4 2.6 6.5 6 8 3.4-1.5 6-4 6-8V7l-6-3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    sword: '<path d="M8 16 16 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M11 13 8 16l-1.5 1.5M15 9l2-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 7l3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    assault: '<path d="M5 14h14M12 6v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9 9l3-3 3 3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    promotion: '<path d="M12 16V8M8.5 10.5 12 7l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 18h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    recruit: '<path d="M12 5v4M9 8h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 18c.8-3.5 2.8-5 5-5s4.2 1.5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    training: '<circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 6.5V5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    heal: '<path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="7.5" stroke="currentColor" stroke-width="1.6"/>',
    hospital: '<path d="M6 9h12v9H6z" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v5M9.5 13.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 9V7h4v2" stroke="currentColor" stroke-width="1.6"/>',
    bed: '<path d="M5 14h14v3H5z" stroke="currentColor" stroke-width="1.6"/><path d="M7 14V11a2 2 0 0 1 2-2h1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    courage: '<circle cx="12" cy="12" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 8.5v5M9.5 11h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    rebel: '<circle cx="9" cy="10" r="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 17c.8-2.5 2-3.8 3.5-3.8M14.5 8l3.5 3.5M14.5 11.5 18 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    defender: '<path d="M12 4 5 7.5V13c0 3.8 2.8 6.2 7 7.5 4.2-1.3 7-3.7 7-7.5V7.5L12 4Z" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 12.5 11.5 14.5 15 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
    unlock: '<path d="M8 11V8.5a4 4 0 1 1 8 0V11" stroke="currentColor" stroke-width="1.6"/><rect x="6.5" y="11" width="11" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="14.5" r="1" fill="currentColor"/>',
    counter: '<path d="M7 16 13 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11 16 17 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    siege: '<path d="M6 16V10l6-4 6 4v6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 16v-4h4v4" stroke="currentColor" stroke-width="1.6"/>',
    archer: '<path d="M6 16c4-8 8-10 12-10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14 6l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 13l2-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    cavalry: '<path d="M7 15c1.5-4 3.5-6 5-6s3.5 2 5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><path d="M6 17h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    footmen: '<path d="M12 5v3M9 8h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 18c.7-3.5 2.5-5 4-5s3.3 1.5 4 5" stroke="currentColor" stroke-width="1.6"/><path d="M10 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    might: '<path d="M12 5 8 10h3l-1 9 5-7h-3l0-7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    resistance: '<path d="M12 4 6 7v5.5c0 3.8 2.5 6.2 6 7.5 3.5-1.3 6-3.7 6-7.5V7l-6-3Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 11h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    death: '<circle cx="12" cy="10" r="3.5" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 14.5h7M10 17h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    research: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    generic: '<circle cx="12" cy="12" r="5.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>',
};

/** @type {{ icon: string, score: number, test: (ctx: { text: string, name: string, buff: string, troop: string }) => boolean }[]} */
const MATCH_RULES = [
    { icon: 'unlock', score: 120, test: ({ text }) => /unlock|tier 9|\bt9\b|enhancement|enhance\b/i.test(text) },
    { icon: 'promotion', score: 115, test: ({ text }) => /promotion|promote/i.test(text) },
    { icon: 'courage', score: 114, test: ({ text }) => /courage medal|courage approval/i.test(text) },
    { icon: 'hospital', score: 112, test: ({ text }) => /hospital|sanctuary|medical facilities|medical tent/i.test(text) },
    { icon: 'bed', score: 111, test: ({ text }) => /temp bed|wounded capacity|overflow wounded/i.test(text) },
    { icon: 'heal', score: 110, test: ({ text }) => /first-?aid|healing|treatment|veterinarian|super healing|battlefield first aid/i.test(text) },
    { icon: 'rebel', score: 108, test: ({ text }) => /rebel slayer|marauder|for the people/i.test(text) },
    { icon: 'defender', score: 107, test: ({ text }) => /empire defender|siege defense/i.test(text) },
    { icon: 'siege', score: 106, test: ({ text }) => /siege|claymore|arrow hail|single player siege/i.test(text) },
    { icon: 'death', score: 105, test: ({ text }) => /deadly|death rate|death ratio/i.test(text) },
    { icon: 'counter', score: 104, test: ({ text }) => /counter vs/i.test(text) },
    { icon: 'heroes', score: 103, test: ({ text }) => /deploy 3 heroes|hero command|hero cooperation/i.test(text) },
    { icon: 'hero', score: 102, test: ({ text }) => /hero appointment|hero training|deploy \d hero|hero exp/i.test(text) },
    { icon: 'banner', score: 101, test: ({ text }) => /commanding banner|speed up/i.test(text) },
    { icon: 'recall', score: 100, test: ({ text }) => /recall/i.test(text) },
    { icon: 'supply', score: 99, test: ({ text }) => /supply unit|stamina recovery|durability recovery/i.test(text) },
    { icon: 'march', score: 98, test: ({ text }) => /marching speed|horseshoe|purebred|stand your ground|ferocious|fervious|charge|onslaught/i.test(text) },
    { icon: 'load', score: 97, test: ({ text }) => /march load|transport cart|enhanced physique|\bload\b/i.test(text) },
    { icon: 'gather', score: 96, test: ({ text }) => /gathering speed|high-speed gathering|effective mining|distribution/i.test(text) },
    { icon: 'gold', score: 95, test: ({ text }) => /midas|gold income|\bgold\b/i.test(text) },
    { icon: 'gem', score: 94, test: ({ text }) => /gem refining|\bgem\b/i.test(text) },
    { icon: 'food', score: 93, test: ({ text }) => /fertilizer|food income|rapid growth|farm|frenzy growth/i.test(text) },
    { icon: 'ale', score: 92, test: ({ text }) => /moonshine|ale income|distillery|yeast|sugar|high-grade sugar/i.test(text) },
    { icon: 'lumber', score: 91, test: ({ text }) => /lumber|logging|deforestation|clear cutting|sharp lumber axe/i.test(text) },
    { icon: 'fire', score: 90, test: ({ text }) => /charcoal|quick burn|dry storage/i.test(text) },
    { icon: 'stone', score: 89, test: ({ text }) => /masonry|marble|quarry|ground breaking|whole-stone/i.test(text) },
    { icon: 'iron', score: 88, test: ({ text }) => /smelting|metallurgy|iron mine|heated furnace|alloy refining|full-metal|chain armor|armou?r/i.test(text) },
    { icon: 'storage', score: 87, test: ({ text }) => /storage expansion|\bstorage\b/i.test(text) },
    { icon: 'build', score: 86, test: ({ text }) => /civil engineering|building speed|worker mobilization|encampment|barracks|archer camp|boot camp|conscription/i.test(text) },
    { icon: 'production', score: 85, test: ({ text }) => /rapid production|production income|production success/i.test(text) },
    { icon: 'stability', score: 84, test: ({ text }) => /stability|will and way/i.test(text) },
    { icon: 'recruit', score: 83, test: ({ text }) => /recruitment|conscription/i.test(text) },
    { icon: 'training', score: 82, test: ({ text }) => /training speed|training count|training cost/i.test(text) },
    { icon: 'assault', score: 81, test: ({ text }) => /\bassault\b|power strike|deadly aim|focus fire|hunt\b/i.test(text) },
    { icon: 'sword', score: 80, test: ({ text }) => /claymore|deadly arms|poisoned|enhanced arrow|target weakness/i.test(text) },
    { icon: 'shield', score: 79, test: ({ text }) => /mastercraft shield|royal shield|fortified shield|stand your ground/i.test(text) },
    { icon: 'might', score: 78, test: ({ text }) => /\bmight\b|power strike/i.test(text) },
    { icon: 'resistance', score: 77, test: ({ text }) => /\bresistance\b|immunity|mastercraft armour/i.test(text) },
    { icon: 'archer', score: 70, test: ({ name, troop }) => /archer/i.test(name) || /archer/i.test(troop) },
    { icon: 'cavalry', score: 69, test: ({ name, troop }) => /cavalry/i.test(name) || /cav/i.test(troop) },
    { icon: 'footmen', score: 68, test: ({ name, troop }) => /footmen/i.test(name) || /footmen/i.test(troop) },
    { icon: 'research', score: 50, test: ({ text }) => /research|legion/i.test(text) },
];

const TINT_BY_ICON = {
    food: '#86efac',
    ale: '#fcd34d',
    lumber: '#a3e635',
    fire: '#fb923c',
    stone: '#cbd5e1',
    iron: '#94a3b8',
    gold: '#fbbf24',
    gem: '#c084fc',
    gather: '#4ade80',
    storage: '#f59e0b',
    build: '#f97316',
    production: '#38bdf8',
    stability: '#67e8f9',
    hero: '#f472b6',
    heroes: '#e879f9',
    banner: '#f87171',
    recall: '#60a5fa',
    supply: '#34d399',
    march: '#22d3ee',
    load: '#a78bfa',
    shield: '#93c5fd',
    sword: '#fca5a5',
    assault: '#ef4444',
    promotion: '#4ade80',
    recruit: '#fdba74',
    training: '#facc15',
    heal: '#6ee7b7',
    hospital: '#5eead4',
    bed: '#99f6e4',
    courage: '#60a5fa',
    rebel: '#f87171',
    defender: '#93c5fd',
    unlock: '#fde047',
    counter: '#fb7185',
    siege: '#f97316',
    archer: '#4ade80',
    cavalry: '#f87171',
    footmen: '#94a3b8',
    might: '#f87171',
    resistance: '#60a5fa',
    death: '#cbd5e1',
    research: '#38bdf8',
    generic: '#e2e8f0',
};

const iconCache = new Map();

function normalizeTechText(node) {
    const name = (node?.name || '').trim();
    const buff = (node?.buff || '').trim();
    const troop = (node?.troop || '').trim();
    return {
        name,
        buff,
        troop,
        text: `${name} ${buff} ${troop}`.toLowerCase(),
    };
}

/**
 * Resolve the best icon id for a tech node using name, buff, and troop context.
 * @param {{ name?: string, buff?: string, troop?: string }} node
 * @returns {{ id: string, tint: string, score: number }}
 */
export function resolveTechNodeIcon(node) {
    const cacheKey = `${node?.name || ''}|${node?.buff || ''}|${node?.troop || ''}`;
    if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);

    const ctx = normalizeTechText(node);
    let best = { id: 'generic', tint: TINT_BY_ICON.generic, score: 0 };

    for (const rule of MATCH_RULES) {
        if (rule.test(ctx) && rule.score > best.score) {
            best = {
                id: rule.icon,
                tint: TINT_BY_ICON[rule.icon] || TINT_BY_ICON.generic,
                score: rule.score,
            };
        }
    }

    if (best.score === 0) {
        const troop = ctx.troop.toLowerCase();
        if (troop.includes('arch')) best = { id: 'archer', tint: TINT_BY_ICON.archer, score: 10 };
        else if (troop.includes('cav')) best = { id: 'cavalry', tint: TINT_BY_ICON.cavalry, score: 10 };
        else if (troop.includes('foot')) best = { id: 'footmen', tint: TINT_BY_ICON.footmen, score: 10 };
    }

    iconCache.set(cacheKey, best);
    return best;
}

/**
 * Render inline SVG markup for a tech node icon.
 * @param {{ name?: string, buff?: string, troop?: string }} node
 * @param {{ size?: number }} [opts]
 */
export function renderTechNodeIconSvg(node, opts = {}) {
    const size = opts.size || 26;
    const { id, tint } = resolveTechNodeIcon(node);
    const body = ICON_SVGS[id] || ICON_SVGS.generic;
    return `<svg class="game-tech-icon-svg" data-icon-id="${id}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" aria-hidden="true" style="color:${tint}">${body}</svg>`;
}