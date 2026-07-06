const NUMERIC_TOKEN_RE = /([+-]?\d+(?:\.\d+)?)(\s*[kKmM])?\s*(%)?/g;

function toFiniteNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function normalizeUnit(unit) {
    return unit === '%' ? '%' : '';
}

function normalizeLevelValues(values) {
    if (!Array.isArray(values)) return null;
    const normalized = values
        .map((value) => toFiniteNumber(value))
        .filter((value) => value !== null);
    return normalized.length ? normalized : null;
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

function normalizeEffectLabel(label) {
    return String(label || 'Buff')
        .replace(/\s+/g, ' ')
        .replace(/^[+\-:\s]+|[+\-:\s]+$/g, '')
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
        const levelValues = normalizeLevelValues(stat.levelValues ?? stat.values ?? stat.byLevel);
        const levels = Math.max(1, Number(node.maxLevel) || 1);
        const levelValueMaxIndex = levelValues ? Math.min(levels, levelValues.length) - 1 : -1;
        const levelValueMax = levelValueMaxIndex >= 0 ? levelValues[levelValueMaxIndex] : null;
        const resolvedMax = maxValue ?? levelValueMax ?? ((perLevel ?? 0) * levels);
        const resolvedPer = perLevel ?? (levelValues ? null : resolvedMax / levels);
        return {
            label: normalizeEffectLabel(stat.label || node.buff || node.name || 'Buff'),
            unit: normalizeUnit(stat.unit),
            maxValue: resolvedMax,
            perLevelValue: resolvedPer,
            levelValues,
            source: 'explicit',
        };
    }).filter((effect) => (
        Number.isFinite(effect.maxValue)
        && (Number.isFinite(effect.perLevelValue) || effect.levelValues)
    ));
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
        label: normalizeEffectLabel(cleanEffectLabel(buff, token)),
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
        const effectRows = effects.map((effect) => {
            const hasLevelValues = Array.isArray(effect.levelValues) && effect.levelValues.length > 0;
            const levelValueIndex = hasLevelValues ? Math.min(safeLevel, effect.levelValues.length) - 1 : -1;
            const currentValue = levelValueIndex >= 0
                ? effect.levelValues[levelValueIndex]
                : (Number(effect.perLevelValue) || 0) * safeLevel;
            const remainingValue = effect.maxValue - currentValue;
            const currentLabel = formatSignedValue(currentValue, effect.unit);
            const maxLabel = formatSignedValue(effect.maxValue, effect.unit);
            const remainingLabel = formatSignedValue(remainingValue, effect.unit);
            const perLevelLabel = Number.isFinite(effect.perLevelValue)
                ? `${formatSignedValue(effect.perLevelValue, effect.unit)}/lvl`
                : 'varies/lvl';
            return {
                label: effect.label,
                unit: effect.unit,
                currentValue,
                maxValue: effect.maxValue,
                remainingValue,
                perLevelValue: effect.perLevelValue,
                currentLabel,
                maxLabel,
                remainingLabel,
                perLevelLabel,
                currentWithLabel: `${currentLabel} ${effect.label}`,
                maxWithLabel: `${maxLabel} ${effect.label}`,
            };
        });
        const currentParts = effectRows.map((effect) => effect.currentLabel);
        const maxParts = effectRows.map((effect) => effect.maxLabel);
        const remainingParts = effectRows.map((effect) => effect.remainingLabel);
        const perLevelParts = effectRows.map((effect) => effect.perLevelLabel);
        const labelParts = effectRows.map((effect) => effect.label);
        const currentWithLabelParts = effectRows.map((effect) => effect.currentWithLabel);
        const maxWithLabelParts = effectRows.map((effect) => effect.maxWithLabel);

        return {
            status: 'known',
            effects: effectRows,
            effectLabels: labelParts,
            currentLabel: currentParts.join(' + '),
            maxLabel: maxParts.join(' + '),
            remainingLabel: remainingParts.join(' + '),
            perLevelLabel: perLevelParts.join(' + '),
            currentWithLabel: currentWithLabelParts.join(' + '),
            maxWithLabel: maxWithLabelParts.join(' + '),
            detailLabel: `Current ${currentWithLabelParts.join(' + ')} of ${maxWithLabelParts.join(' + ')}; left ${remainingParts.join(' + ')}; ${perLevelParts.join(' + ')}`,
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

export function summarizeTechBuffs(tech, { getLevel = () => 0 } = {}) {
    const groups = new Map();
    const unlocks = [];
    const missing = [];

    for (const node of tech.nodes || []) {
        const level = Math.min(Number(node.maxLevel) || 0, Math.max(0, Number(getLevel(node)) || 0));
        const summary = describeNodeBuffProgress(node, level);
        if (summary.status === 'known') {
            summary.effects.forEach((effect) => {
                const key = `${effect.label}|${effect.unit}`;
                const group = groups.get(key) || {
                    label: effect.label,
                    unit: effect.unit,
                    currentValue: 0,
                    maxValue: 0,
                    remainingValue: 0,
                    nodeCount: 0,
                    nodes: [],
                };
                group.currentValue += effect.currentValue;
                group.maxValue += effect.maxValue;
                group.remainingValue += effect.remainingValue;
                group.nodeCount += 1;
                group.nodes.push(node.name);
                groups.set(key, group);
            });
        } else if (summary.status === 'unlock') {
            unlocks.push({
                name: node.name,
                label: node.buff || node.name,
                currentLabel: summary.currentLabel,
            });
        } else {
            missing.push({
                name: node.name,
                label: node.buff || node.name,
            });
        }
    }

    const known = Array.from(groups.values())
        .map((group) => {
            const currentLabel = formatSignedValue(group.currentValue, group.unit);
            const maxLabel = formatSignedValue(group.maxValue, group.unit);
            return {
                ...group,
                currentLabel,
                maxLabel,
                remainingLabel: formatSignedValue(group.remainingValue, group.unit),
                currentWithLabel: `${currentLabel} ${group.label}`,
                maxWithLabel: `${maxLabel} ${group.label}`,
            };
        })
        .sort((a, b) => Math.abs(b.maxValue) - Math.abs(a.maxValue) || a.label.localeCompare(b.label));

    return {
        known,
        unlocks,
        missing,
        totals: {
            known: known.length,
            unlocks: unlocks.length,
            missing: missing.length,
        },
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
