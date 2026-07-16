export const BATTLE_EXPORT_SCHEMA_VERSION = 1;

const EVENT_CSV_COLUMNS = [
  'run_index',
  'run_seed',
  'round',
  'action_group',
  'combat_speed',
  'attacker',
  'target',
  'troops_before',
  'casualties',
  'troops_after',
  'strike_multiplier',
  'casualty_rate',
  'status',
];

const SUMMARY_CSV_COLUMNS = [
  'schema_version',
  'generated_at',
  'model_version',
  'run_mode',
  'seed',
  'variance',
  'simulations',
  'side_a_wins',
  'side_a_win_rate',
  'side_b_wins',
  'side_b_win_rate',
  'draws',
  'draw_rate',
  'stalemates',
  'stalemate_rate',
  'average_rounds',
  'average_side_a_survivors',
  'average_side_b_survivors',
  'average_total_survivors',
  'average_side_a_casualties',
  'average_side_b_casualties',
  'average_total_casualties',
  'config_json',
];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSensitiveKey(key) {
  const words = String(key)
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = words.join('');
  if (compact.includes('localstorage') || compact.includes('sessionstorage')) return true;
  if (
    words.some(
      (word) =>
        word.startsWith('password') ||
        word.startsWith('passcode') ||
        word.startsWith('secret') ||
        word.startsWith('credential')
    )
  ) {
    return true;
  }
  if (
    words.includes('auth') ||
    words.includes('authorization') ||
    words.includes('authentication') ||
    words.includes('authenticator')
  ) {
    return true;
  }
  if (words.includes('pin') || compact.endsWith('pinhash') || compact.endsWith('pincode'))
    return true;
  if ((words.includes('api') || words.includes('private')) && words.includes('key')) return true;
  return words.includes('token') && !words.includes('troop');
}

function sanitizeForExport(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return undefined;
  if (ancestors.has(value)) throw new TypeError('Battle export data must not contain cycles.');

  ancestors.add(value);
  if (Array.isArray(value)) {
    const output = value.map((item) => sanitizeForExport(item, ancestors) ?? null);
    ancestors.delete(value);
    return output;
  }

  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (isSensitiveKey(key)) continue;
    const cleanValue = sanitizeForExport(value[key], ancestors);
    if (cleanValue !== undefined) output[key] = cleanValue;
  }
  ancestors.delete(value);
  return output;
}

function stableJson(value, space = 0) {
  return JSON.stringify(sanitizeForExport(value), null, space);
}

function normalizeGeneratedAt(value) {
  const supplied = typeof value === 'function' ? value() : value;
  const date = supplied === undefined ? new Date() : new Date(supplied);
  if (Number.isNaN(date.getTime())) throw new TypeError('generatedAt must be a valid date.');
  return date.toISOString();
}

function readPath(value, path) {
  let current = value;
  for (const key of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function firstDefined(values) {
  return values.find((value) => value !== undefined && value !== null);
}

function finiteNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function numberAt(sources, paths) {
  for (const source of sources) {
    for (const path of paths) {
      const number = finiteNumber(readPath(source, path));
      if (number !== undefined) return number;
    }
  }
  return undefined;
}

function inferRunMode(result, explicitMode) {
  const supplied = String(explicitMode ?? result?.runMode ?? '').toLowerCase();
  if (supplied === 'batch' || supplied === 'single') return supplied;
  if (Array.isArray(result)) return result.length > 1 ? 'batch' : 'single';
  if (!isObject(result)) return 'single';
  if (
    result.batch ||
    result.outcomes ||
    finiteNumber(result.iterations) > 1 ||
    (Array.isArray(result.runs) && result.runs.length > 1) ||
    (Array.isArray(result.results) && result.results.length > 1)
  ) {
    return 'batch';
  }
  return 'single';
}

function extractRuns(result, runMode) {
  if (Array.isArray(result)) return result;
  if (!isObject(result)) return [];
  for (const value of [result.runs, result.results, result.batch?.runs, result.batch?.results]) {
    if (Array.isArray(value)) return value;
  }
  return runMode === 'single' ? [result] : [];
}

function normalizeModel(model) {
  const safeModel = isObject(sanitizeForExport(model)) ? sanitizeForExport(model) : {};
  const version = String(model?.version ?? model?.modelVersion ?? 'unknown');
  const rawAssumptions = model?.assumptions;
  const assumptions =
    rawAssumptions === undefined || rawAssumptions === null
      ? []
      : sanitizeForExport(rawAssumptions);
  delete safeModel.version;
  delete safeModel.modelVersion;
  delete safeModel.assumptions;
  return { version, assumptions, ...safeModel };
}

function createContext(input = {}) {
  const result = input.result ?? null;
  const runMode = inferRunMode(result, input.runMode);
  const model = normalizeModel(input.model ?? {});
  const config = sanitizeForExport(input.config ?? {});
  const generatedAt = normalizeGeneratedAt(input.generatedAt);
  const seed = sanitizeForExport(
    firstDefined([
      input.seed,
      result?.seed,
      result?.randomSeed,
      result?.batch?.seed,
      input.config?.seed,
    ]) ?? null
  );
  const variance = sanitizeForExport(
    firstDefined([
      input.variance,
      result?.variance,
      result?.randomness,
      result?.strikeVariancePct,
      result?.batch?.variance,
      input.config?.variance,
      input.config?.strikeVariancePct,
    ]) ?? null
  );
  return { generatedAt, model, config, runMode, seed, variance, result };
}

function normalizeOutcome(run) {
  const status = String(run?.status ?? run?.result?.status ?? '').toLowerCase();
  if (
    status.includes('stalemate') ||
    status.includes('max_round') ||
    status.includes('max-round')
  ) {
    return 'stalemate';
  }
  let value = run?.winner ?? run?.outcome ?? run?.result?.winner ?? run?.result?.outcome;
  if (isObject(value)) value = value.side ?? value.id ?? value.name;
  const normalized = String(value ?? 'draw')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (['a', 'sidea', 'attacker', 'left', 'team1'].includes(normalized)) return 'sideA';
  if (['b', 'sideb', 'defender', 'right', 'team2'].includes(normalized)) return 'sideB';
  if (normalized.includes('stalemate')) return 'stalemate';
  return 'draw';
}

function roundCount(run) {
  if (Array.isArray(run?.rounds)) return run.rounds.length;
  return finiteNumber(run?.rounds ?? run?.roundCount ?? run?.summary?.rounds);
}

function sideSources(root, side) {
  const suffixes = side === 'A' ? ['sideA', 'a', 'A', 'left'] : ['sideB', 'b', 'B', 'right'];
  const values = [];
  for (const suffix of suffixes) {
    values.push(
      root?.[suffix],
      root?.sides?.[suffix],
      root?.summary?.[suffix],
      root?.final?.[suffix],
      root?.finalState?.[suffix]
    );
  }
  return values.filter((value) => value !== null && value !== undefined);
}

function sumRows(container, fields) {
  const rows = Array.isArray(container)
    ? container
    : (container?.rows ?? container?.squads ?? container?.formations);
  if (!Array.isArray(rows)) return undefined;
  const values = rows
    .map((row) => firstDefined(fields.map((field) => finiteNumber(row?.[field]))))
    .filter((value) => value !== undefined);
  return values.length ? values.reduce((total, value) => total + value, 0) : undefined;
}

function sideMetric(run, config, side, metric) {
  const fields =
    metric === 'survivors'
      ? [
          'survivors',
          'survivingTroops',
          'remainingTroops',
          'troopsRemaining',
          'aliveTroops',
          'troops',
        ]
      : ['casualties', 'losses', 'lostTroops'];
  for (const source of sideSources(run, side)) {
    const direct = firstDefined(fields.map((field) => finiteNumber(source?.[field])));
    if (direct !== undefined) return direct;
    const fromRows = sumRows(source, fields);
    if (fromRows !== undefined) return fromRows;
  }

  const topLevel = run?.[metric];
  if (isObject(topLevel)) {
    const direct = firstDefined(
      (side === 'A' ? ['sideA', 'a', 'A'] : ['sideB', 'b', 'B']).map((key) =>
        finiteNumber(topLevel[key])
      )
    );
    if (direct !== undefined) return direct;
  }

  const initial = initialTroops(config, side);
  if (initial === undefined) return undefined;
  const oppositeMetric = metric === 'survivors' ? 'casualties' : 'survivors';
  for (const source of sideSources(run, side)) {
    const opposite = firstDefined(
      (oppositeMetric === 'survivors'
        ? [
            'survivors',
            'survivingTroops',
            'remainingTroops',
            'troopsRemaining',
            'aliveTroops',
            'troops',
          ]
        : ['casualties', 'losses', 'lostTroops']
      ).map((field) => finiteNumber(source?.[field]))
    );
    if (opposite !== undefined) return Math.max(0, initial - opposite);
  }
  return undefined;
}

function initialTroops(config, side) {
  for (const source of sideSources(config, side)) {
    const direct = firstDefined(
      ['initialTroops', 'totalTroops', 'troops'].map((field) => finiteNumber(source?.[field]))
    );
    if (direct !== undefined) return direct;
    const fromRows = sumRows(source, ['initialTroops', 'troops', 'troopCount', 'count']);
    if (fromRows !== undefined) return fromRows;
  }
  return undefined;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length ? finite.reduce((total, value) => total + value, 0) / finite.length : null;
}

function computedRunSummary(runs, config) {
  const outcomes = { sideA: 0, sideB: 0, draw: 0, stalemate: 0 };
  for (const run of runs) outcomes[normalizeOutcome(run)] += 1;
  return {
    outcomes,
    averageRounds: average(runs.map(roundCount)),
    averageSideASurvivors: average(runs.map((run) => sideMetric(run, config, 'A', 'survivors'))),
    averageSideBSurvivors: average(runs.map((run) => sideMetric(run, config, 'B', 'survivors'))),
    averageSideACasualties: average(runs.map((run) => sideMetric(run, config, 'A', 'casualties'))),
    averageSideBCasualties: average(runs.map((run) => sideMetric(run, config, 'B', 'casualties'))),
  };
}

function aggregateSources(result) {
  return [result, result?.summary, result?.aggregate, result?.batch].filter(isObject);
}

function summarize(context) {
  const { result, runMode, config } = context;
  const runs = extractRuns(result, runMode);
  const computed = computedRunSummary(runs, config);
  const sources = aggregateSources(result);
  const simulations = Math.max(
    0,
    Math.round(
      numberAt(sources, [
        'iterations',
        'simulations',
        'simulationCount',
        'runCount',
        'totalRuns',
      ]) ??
        runs.length ??
        0
    )
  );

  function outcomeCount(kind, paths) {
    const supplied = numberAt(sources, paths);
    if (supplied !== undefined) return Math.max(0, Math.round(supplied));
    const rate = numberAt(sources, [
      `rates.${kind}`,
      `outcomeRates.${kind}`,
      `outcomes.${kind}.rate`,
    ]);
    if (rate !== undefined && simulations) return Math.max(0, Math.round(rate * simulations));
    return computed.outcomes[kind];
  }

  const sideAWins = outcomeCount('sideA', [
    'sideAWins',
    'sideAWinCount',
    'outcomes.sideA',
    'outcomes.sideA.count',
    'outcomes.A',
    'outcomes.A.count',
    'outcomeCounts.sideA',
    'outcomeCounts.A',
    'counts.sideA',
    'winCounts.A',
  ]);
  const sideBWins = outcomeCount('sideB', [
    'sideBWins',
    'sideBWinCount',
    'outcomes.sideB',
    'outcomes.sideB.count',
    'outcomes.B',
    'outcomes.B.count',
    'outcomeCounts.sideB',
    'outcomeCounts.B',
    'counts.sideB',
    'winCounts.B',
  ]);
  const draws = outcomeCount('draw', [
    'draws',
    'drawCount',
    'outcomes.draw',
    'outcomes.draw.count',
    'outcomeCounts.draw',
    'counts.draw',
  ]);
  const stalemates = outcomeCount('stalemate', [
    'stalemates',
    'stalemateCount',
    'outcomes.stalemate',
    'outcomes.stalemate.count',
    'outcomeCounts.stalemate',
    'counts.stalemate',
  ]);

  const averagePaths = {
    averageRounds: ['averageRounds', 'avgRounds', 'averages.rounds'],
    averageSideASurvivors: [
      'averageSideASurvivors',
      'averages.sideA.survivors',
      'averages.survivors.sideA',
      'sideAverages.survivors',
      'averageTotalSurvivors.A',
    ],
    averageSideBSurvivors: [
      'averageSideBSurvivors',
      'averages.sideB.survivors',
      'averages.survivors.sideB',
      'sideBAverages.survivors',
      'averageTotalSurvivors.B',
    ],
    averageSideACasualties: [
      'averageSideACasualties',
      'averages.sideA.casualties',
      'averages.casualties.sideA',
      'sideAverages.casualties',
      'averageTotalCasualties.A',
    ],
    averageSideBCasualties: [
      'averageSideBCasualties',
      'averages.sideB.casualties',
      'averages.casualties.sideB',
      'sideBAverages.casualties',
      'averageTotalCasualties.B',
    ],
  };
  const metrics = {};
  for (const [key, paths] of Object.entries(averagePaths)) {
    metrics[key] = numberAt(sources, paths) ?? computed[key];
  }

  const divisor = simulations || 0;
  return {
    simulations,
    sideAWins,
    sideAWinRate: divisor ? sideAWins / divisor : 0,
    sideBWins,
    sideBWinRate: divisor ? sideBWins / divisor : 0,
    draws,
    drawRate: divisor ? draws / divisor : 0,
    stalemates,
    stalemateRate: divisor ? stalemates / divisor : 0,
    ...metrics,
    averageTotalSurvivors:
      metrics.averageSideASurvivors === null || metrics.averageSideBSurvivors === null
        ? null
        : metrics.averageSideASurvivors + metrics.averageSideBSurvivors,
    averageTotalCasualties:
      metrics.averageSideACasualties === null || metrics.averageSideBCasualties === null
        ? null
        : metrics.averageSideACasualties + metrics.averageSideBCasualties,
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const string = String(value);
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function csvLine(values) {
  return values.map(csvCell).join(',');
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(6)).toString();
}

function displayEntity(value) {
  if (!isObject(value)) return value ?? '';
  if (value.label || value.name || value.id) return value.label ?? value.name ?? value.id;
  const side = value.side ?? value.team;
  const row = value.row ?? value.rowId ?? value.position;
  return [side, row].filter((part) => part !== undefined && part !== null).join('/');
}

function eventsFromRoundLog(roundLog) {
  if (!Array.isArray(roundLog)) return [];
  const output = [];
  roundLog.forEach((roundEntry, roundIndex) => {
    const round = roundEntry?.round ?? roundEntry?.roundNumber ?? roundIndex + 1;
    const directActions = roundEntry?.actions ?? roundEntry?.events;
    if (Array.isArray(directActions)) {
      for (const event of directActions) output.push({ event, round });
      return;
    }
    const groups = roundEntry?.speedGroups ?? roundEntry?.groups;
    if (Array.isArray(groups)) {
      groups.forEach((group, groupIndex) => {
        const actionGroup = group?.group ?? group?.actionGroup ?? group?.id ?? groupIndex + 1;
        const combatSpeed = group?.combatSpeed ?? group?.speed ?? '';
        for (const event of group?.actions ?? group?.events ?? []) {
          output.push({ event, round, actionGroup, combatSpeed });
        }
      });
      return;
    }
    output.push({ event: roundEntry, round });
  });
  return output;
}

function eventsFromRun(run) {
  for (const events of [
    run?.events,
    run?.eventLog,
    run?.actionLog,
    run?.actions,
    run?.log?.events,
  ]) {
    if (Array.isArray(events)) return events.map((event) => ({ event }));
  }
  return eventsFromRoundLog(run?.roundLog ?? run?.roundsLog ?? run?.log?.rounds);
}

function eventEntries(result, runMode) {
  const runs = extractRuns(result, runMode);
  if (runs.length) {
    return runs.flatMap((run, index) =>
      eventsFromRun(run).map((entry) => ({
        ...entry,
        runIndex: finiteNumber(run?.runNumber) ?? index + 1,
        runSeed: firstDefined([run?.seed, run?.runSeed]),
      }))
    );
  }
  const logs = result?.eventLogs ?? result?.batch?.eventLogs;
  if (!Array.isArray(logs)) return [];
  if (logs.every(Array.isArray)) {
    return logs.flatMap((events, index) => events.map((event) => ({ event, runIndex: index + 1 })));
  }
  return logs.map((entry, index) => ({
    event: entry?.event ?? entry,
    runIndex: finiteNumber(entry?.runIndex) ?? index + 1,
    runSeed: firstDefined([entry?.runSeed, entry?.seed]),
  }));
}

export function buildBattleJsonExport(input = {}) {
  const context = createContext(input);
  const document = {
    schemaVersion: BATTLE_EXPORT_SCHEMA_VERSION,
    generatedAt: context.generatedAt,
    model: context.model,
    config: context.config,
    runMode: context.runMode,
    seed: context.seed,
    variance: context.variance,
    results: sanitizeForExport(context.result),
  };
  return JSON.stringify(document, null, 2);
}

export function buildBattleSummaryCsv(input = {}) {
  const context = createContext(input);
  const summary = summarize(context);
  const row = [
    BATTLE_EXPORT_SCHEMA_VERSION,
    context.generatedAt,
    context.model.version,
    context.runMode,
    isObject(context.seed) || Array.isArray(context.seed) ? stableJson(context.seed) : context.seed,
    isObject(context.variance) || Array.isArray(context.variance)
      ? stableJson(context.variance)
      : context.variance,
    summary.simulations,
    summary.sideAWins,
    formatNumber(summary.sideAWinRate),
    summary.sideBWins,
    formatNumber(summary.sideBWinRate),
    summary.draws,
    formatNumber(summary.drawRate),
    summary.stalemates,
    formatNumber(summary.stalemateRate),
    formatNumber(summary.averageRounds),
    formatNumber(summary.averageSideASurvivors),
    formatNumber(summary.averageSideBSurvivors),
    formatNumber(summary.averageTotalSurvivors),
    formatNumber(summary.averageSideACasualties),
    formatNumber(summary.averageSideBCasualties),
    formatNumber(summary.averageTotalCasualties),
    stableJson(context.config),
  ];
  return `${csvLine(SUMMARY_CSV_COLUMNS)}\n${csvLine(row)}`;
}

export function buildBattleEventLogCsv(input = {}) {
  const context = createContext(input);
  const rows = eventEntries(context.result, context.runMode).map(
    ({ event = {}, runIndex, runSeed, round, actionGroup, combatSpeed }) => [
      runIndex,
      event.runSeed ?? event.seed ?? runSeed ?? '',
      event.round ?? event.roundNumber ?? round ?? '',
      event.group ?? event.actionGroup ?? event.groupOrdinal ?? actionGroup ?? '',
      event.actorCombatSpeed ?? event.combatSpeed ?? combatSpeed ?? '',
      displayEntity(
        event.attacker ??
          event.source ??
          (event.attackerSide
            ? {
                side: event.attackerSide,
                row: event.attackerRowLabel ?? event.attackerRowId,
              }
            : '')
      ),
      displayEntity(
        event.target ??
          event.defender ??
          (event.defenderSide
            ? {
                side: event.defenderSide,
                row: event.targetRowLabel ?? event.targetRowId,
              }
            : '')
      ),
      event.targetTroopsBefore ?? event.troopsBefore ?? event.before ?? '',
      event.casualties ?? event.losses ?? '',
      event.targetTroopsAfter ?? event.troopsAfter ?? event.after ?? '',
      event.strikeMultiplier ?? '',
      event.casualtyRate ?? '',
      event.status ??
        (event.targetEliminated || event.eliminated || event.targetTroopsAfter === 0
          ? 'eliminated'
          : 'resolved'),
    ]
  );
  return [csvLine(EVENT_CSV_COLUMNS), ...rows.map(csvLine)].join('\n');
}

function percent(value) {
  return `${formatNumber(value * 100)}%`;
}

function textNumber(value) {
  return Number.isFinite(value) ? formatNumber(value) : 'n/a';
}

export function buildBattleDebugSnapshot(input = {}) {
  const context = createContext(input);
  const summary = summarize(context);
  const assumptions = Array.isArray(context.model.assumptions)
    ? context.model.assumptions.length
      ? context.model.assumptions.map((assumption) => String(assumption)).join(' | ')
      : 'None recorded'
    : isObject(context.model.assumptions)
      ? stableJson(context.model.assumptions)
      : String(context.model.assumptions || 'None recorded');
  const seed = context.seed === null ? 'none' : stableJson(context.seed);
  const variance = context.variance === null ? 'none' : stableJson(context.variance);
  return [
    'Battle Simulator debug snapshot',
    `Generated: ${context.generatedAt}`,
    `Schema / model: ${BATTLE_EXPORT_SCHEMA_VERSION} / ${context.model.version}`,
    `Run: ${context.runMode} · ${summary.simulations} simulation${summary.simulations === 1 ? '' : 's'} · seed ${seed} · variance ${variance}`,
    `Outcomes: Side A ${summary.sideAWins} (${percent(summary.sideAWinRate)}) · Side B ${summary.sideBWins} (${percent(summary.sideBWinRate)}) · Draw ${summary.draws} (${percent(summary.drawRate)}) · Stalemate ${summary.stalemates} (${percent(summary.stalemateRate)})`,
    `Averages: ${textNumber(summary.averageRounds)} rounds · survivors A/B ${textNumber(summary.averageSideASurvivors)}/${textNumber(summary.averageSideBSurvivors)} · casualties A/B ${textNumber(summary.averageSideACasualties)}/${textNumber(summary.averageSideBCasualties)}`,
    `Assumptions: ${assumptions}`,
    `Config: ${stableJson(context.config)}`,
  ].join('\n');
}

export function makeBattleExportFilename({
  kind = 'full',
  mode = 'single',
  extension,
  generatedAt,
} = {}) {
  const kindMap = {
    full: ['full', 'json'],
    json: ['full', 'json'],
    summary: ['summary', 'csv'],
    events: ['event-log', 'csv'],
    'event-log': ['event-log', 'csv'],
    debug: ['debug', 'txt'],
    text: ['debug', 'txt'],
  };
  const normalizedKind = String(kind).toLowerCase();
  const [label, defaultExtension] = kindMap[normalizedKind] ?? [normalizedKind, 'txt'];
  const safePart = (value, fallback) =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || fallback;
  const stamp = normalizeGeneratedAt(generatedAt).replace(/[:.]/g, '-');
  const safeExtension = safePart(String(extension ?? defaultExtension).replace(/^\./, ''), 'txt');
  return `vts-battle-simulator-${safePart(label, 'export')}-${safePart(mode, 'single')}-${stamp}.${safeExtension}`;
}

export const __testing__ = Object.freeze({
  sanitizeForExport,
  summarize: (input) => summarize(createContext(input)),
});
