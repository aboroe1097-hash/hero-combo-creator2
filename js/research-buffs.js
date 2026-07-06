const NUMERIC_TOKEN_RE = /([+-]?\d+(?:\.\d+)?)(\s*[kKmM])?\s*(%)?/g;

function toFiniteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeUnit(unit) {
    return unit === '%' ? '%' : '';
}

function multiplierForSuffix(suffix = '') {
    const s = suffix.trim().toLowerCase();
    if (s === 'k') return 1000;
    if (s === 'm') return 1000000;
    return 1;
}

function formatMagnitude(value) {
    const abs = Math.abs(value);
    if (abs >= 1000000 && abs % 1000000 === 0) return `${abs / 1000000}M`;
    if (abs >= 1000 && abs % 1000 === 0) return `${abs / 1000}k`;
    if (Number.isInteger(abs)) return abs.toLocaleString();
    return Number(abs.toFixed(2)).toLocaleString();
}

function formatSignedValue(value, unit = '') {
    const safeValue = Number(value) || 0;
    const sign = safeValue < 0 ? '-' : '+';
    return `${sign}${formatMagnitude(safeValue)}${unit}`;
}

function cleanEffectLabel(buff, token) {
    if (!buff) return 'Buff';
    const withoutToken = token
        ? buff.replace(token.raw, '').replace(/\bper\s+level\b/ig, '')
        : buff;
    return withoutToken
        .replace(/\s+/g, ' ')
        .replace(/\s+([,.;:])/g, '$1')
        .replace(/^[+\-:\s]+|[+\-:\s]+$/g, '')
        || buff.trim()
        || 'Buff';
}

function isLevelReference(buff, match) {
    const before = buff.slice(Math.max(0, match.index - 8), match.index).toLowerCase();
    const after = buff.slice(match.index + match[0].length, match.index + match[0].length + 6).toLowerCase();
    return /(?:lvl|level|tier|\bt)\s*$/.test(before) || /^\s*(?:-|to)\s*\d/.test(after);
}

function collectNumericTokens(buff) {
    const tokens = [];
    for (const match of buff.matchAll(NUMERIC_TOKEN_RE)) {
        if (isLevelReference(buff, match)) continue;
        const rawNumber = match[1];
        const suffix = match[2] || '';
        const percent = !!match[3];
        const signed = rawNumber.startsWith('+') || rawNumber.startsWith('-');
        const value = toFiniteNumber(rawNumber);
        if (value === null) continue;
        if (!percent && !signed && !suffix.trim()) continue;
        tokens.push({
            raw: match[0],
            index: match.index,
            signed,
            unit: percent ? '%' : '',
            value: value * multiplierForSuffix(suffix),
        });
    }
    return tokens;
}

function normalizeExplicitEffects(node) {
    const source = node.buffStats || node.buffStat;
    if (!source) return [];
    const stats = Array.isArray(source) ? source : [source];
    return stats.map((stat) => {
        const perLevel = toFiniteNumber(stat.perLevel ?? stat.perLevelValue);
        const maxValue = toFiniteNumber(stat.max ?? stat.maxValue ?? stat.value);
        const levels = Math.max(1, Number(node.maxLevel) || 1);
        const resolvedMax = maxValue ?? ((perLevel ?? 0) * levels);
        const resolvedPer = perLevel ?? (resolvedMax / levels);
        return {
            label: stat.label || node.buff || node.name || 'Buff',
            unit: normalizeUnit(stat.unit),
            maxValue: resolvedMax,
            perLevelValue: resolvedPer,
            source: 'explicit',
        };
    }).filter((effect) => Number.isFinite(effect.maxValue) && Number.isFinite(effect.perLevelValue));
}

function deriveEffectFromBuff(node) {
    const buff = String(node.buff || '').trim();
    if (!buff || Number(node.maxLevel) <= 1) return null;
    const tokens = collectNumericTokens(buff);
    if (!tokens.length) return null;

    const perLevelIndex = buff.search(/\bper\s+level\b/i);
    let token = null;
    let perLevelValue = null;
    let maxValue = null;

    if (perLevelIndex >= 0) {
        const beforePerLevel = tokens.filter((t) => t.index < perLevelIndex);
        token = beforePerLevel.at(-1) || tokens.at(-1);
        perLevelValue = token.value;
        maxValue = perLevelValue * (Number(node.maxLevel) || 1);
    } else {
        token = tokens.find((t) => t.signed) || tokens.at(-1);
        maxValue = token.value;
        perLevelValue = maxValue / (Number(node.maxLevel) || 1);
    }

    return {
        label: cleanEffectLabel(buff, token),
        unit: token.unit,
        maxValue,
        perLevelValue,
        source: 'derived',
    };
}

export function getNodeBuffEffects(node) {
    const explicit = normalizeExplicitEffects(node);
    if (explicit.length) return explicit;
    const derived = deriveEffectFromBuff(node);
    return derived ? [derived] : [];
}

export function describeNodeBuffProgress(node, level = 0) {
    const maxLevel = Math.max(1, Number(node.maxLevel) || 1);
    const safeLevel = Math.min(maxLevel, Math.max(0, Number(level) || 0));
    const effects = getNodeBuffEffects(node);

    if (effects.length) {
        const currentParts = [];
        const maxParts = [];
        const remainingParts = [];
        const perLevelParts = [];

        effects.forEach((effect) => {
            const currentValue = effect.perLevelValue * safeLevel;
            const remainingValue = effect.maxValue - currentValue;
            currentParts.push(formatSignedValue(currentValue, effect.unit));
            maxParts.push(formatSignedValue(effect.maxValue, effect.unit));
            remainingParts.push(formatSignedValue(remainingValue, effect.unit));
            perLevelParts.push(`${formatSignedValue(effect.perLevelValue, effect.unit)}/lvl`);
        });

        return {
            status: 'known',
            currentLabel: currentParts.join(' + '),
            maxLabel: maxParts.join(' + '),
            remainingLabel: remainingParts.join(' + '),
            perLevelLabel: perLevelParts.join(' + '),
            detailLabel: `Current ${currentParts.join(' + ')} of ${maxParts.join(' + ')}; left ${remainingParts.join(' + ')}; ${perLevelParts.join(' + ')}`,
        };
    }

    if (maxLevel === 1) {
        return {
            status: 'unlock',
            currentLabel: safeLevel > 0 ? 'Unlocked' : 'Locked',
            maxLabel: 'Lv 1',
            remainingLabel: safeLevel > 0 ? 'Done' : 'Unlock left',
            perLevelLabel: 'Unlock',
            detailLabel: 'Unlocks at level 1',
        };
    }

    return {
        status: 'missing',
        currentLabel: 'Value missing',
        maxLabel: 'Unknown',
        remainingLabel: 'Unknown',
        perLevelLabel: 'Add data',
        detailLabel: 'This node needs exact buff value data.',
    };
}

export function findMissingBuffValueNodes(techDatabase, { seasons = null } = {}) {
    const seasonSet = seasons ? new Set(seasons) : null;
    const missing = [];
    for (const tech of techDatabase) {
        if (seasonSet && !seasonSet.has(tech.season)) continue;
        for (const node of tech.nodes || []) {
            const summary = describeNodeBuffProgress(node, 0);
            if (summary.status === 'missing') {
                missing.push({ tech, node });
            }
        }
    }
    return missing;
}
