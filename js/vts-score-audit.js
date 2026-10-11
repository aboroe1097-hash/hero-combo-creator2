import {
  buildAdminVtsScoreRows,
  VTS_SCORE_COMPARISON_FIELDS,
  readVtsScoreExemptions,
} from './vts-score-admin.js';
import { buildCompetitionGrowthRows, rankCompetitionGrowth } from './competition-growth.js';
import { normalizeVtsScoreSettings } from './vts-score-settings.js';

const list = (value) => (Array.isArray(value) ? value : []);
const uid = (row) =>
  String(row?.documentId || row?.submissionUid || row?.uid || row?.id || '').trim();
const name = (row) =>
  String(row?.gameName || row?.displayName || row?.playerName || '')
    .normalize('NFC')
    .trim()
    .toLowerCase();
const safeValue = (value) =>
  value !== '' &&
  value !== null &&
  value !== undefined &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) >= 0;

export function buildVtsScoreAudit(
  snapshot = {},
  { now = Date.now(), includeCompetition = false } = {}
) {
  const submissions = list(snapshot.submissions || snapshot.signups);
  const raceScores = list(snapshot.raceScores);
  const issues = [];
  const add = (code, record, detail) =>
    issues.push({
      code,
      documentId: uid(record),
      documentPath: record?.documentPath || '',
      detail,
    });
  const scan = (records, kind) => {
    const ids = new Set();
    const names = new Map();
    for (const record of records) {
      const id = uid(record);
      if (!id) add('missing-id', record, kind);
      if (ids.has(id)) add('duplicate-id', record, kind);
      ids.add(id);
      if (record.storedSubmissionUid && record.storedSubmissionUid !== id)
        add('identity-mismatch', record, `${kind}: stored UID differs from document ID`);
      const key = name(record);
      if (key && names.has(key) && names.get(key) !== id)
        add('duplicate-name', record, `${kind}: also ${names.get(key)}`);
      names.set(key, id);
      const values =
        kind === 'signup' ? record.confirmedStats || record.stats || record : record.powerValues;
      for (const [field] of VTS_SCORE_COMPARISON_FIELDS.slice(0, 7)) {
        const raw =
          field === 'totalCastlePower'
            ? (values?.totalCastlePower ?? values?.totalPower)
            : values?.[field];
        if (!safeValue(raw))
          add(
            raw === null || raw === undefined || raw === '' ? 'missing-power' : 'invalid-power',
            record,
            `${kind}.${field}`
          );
      }
    }
    return ids;
  };
  const signupIds = scan(submissions, 'signup');
  const scoreIds = scan(raceScores, 'final');
  for (const record of submissions) {
    if (record?.status === 'submitted' && !scoreIds.has(uid(record)))
      add('missing-final-upload', record, 'No current final upload');
    if (record?.status !== 'submitted')
      add('not-submitted', record, String(record?.status || 'missing status'));
  }
  for (const record of raceScores)
    if (!signupIds.has(uid(record)))
      add('orphan-final-upload', record, 'No signup with this document ID');
  const signupNames = new Set(submissions.map(name).filter(Boolean));
  for (const match of list(snapshot.matchResults)) {
    const names = new Set();
    let total = 0;
    for (const entry of list(match?.entries)) {
      const key = name(entry);
      if (!key || !signupNames.has(key))
        add('unmatched-match-player', match, String(entry?.playerName || 'Missing player name'));
      if (names.has(key)) add('duplicate-match-player', match, String(entry?.playerName || key));
      names.add(key);
      if (!safeValue(entry?.score))
        add('invalid-match-score', match, String(entry?.playerName || key));
      else total += Number(entry.score);
    }
    if (match?.totalScore !== undefined && Number(match.totalScore) !== total)
      add('match-total-mismatch', match, `Stored ${match.totalScore}; entry total ${total}`);
    if (match?.memberCount !== undefined && match.memberCount !== list(match.entries).length)
      add('match-count-mismatch', match, 'Stored member count differs from raw entries');
  }
  if (snapshot.historyScope === 'baseline-fallback')
    issues.push({
      code: 'incomplete-history',
      documentId: '',
      documentPath: '',
      detail: 'Collection-group history unavailable; only baseline season was read',
    });
  const settings = normalizeVtsScoreSettings(snapshot.settings);
  const standings = buildAdminVtsScoreRows(submissions, raceScores, settings);
  for (const row of standings) {
    const source = raceScores.find((record) => uid(record) === row.submissionUid);
    for (const comparison of row.comparisons) {
      if (
        comparison.growth !== null &&
        (Math.abs(comparison.growth) > settings.growthWarningAbsolute ||
          (comparison.growthPercent !== null &&
            Math.abs(comparison.growthPercent) > settings.growthWarningPercent))
      ) {
        issues.push({
          code: 'extreme-growth-review',
          documentId: row.submissionUid,
          documentPath: source?.documentPath || '',
          field: comparison.field,
          before: comparison.baseline,
          after: comparison.final,
          growth: comparison.growth,
          growthPercent: comparison.growthPercent,
          detail: `${comparison.field}: ${comparison.baseline} → ${comparison.final} (${comparison.growthPercent === null ? 'no percentage baseline' : `${comparison.growthPercent.toFixed(2)}%`}). Review OCR and source records; ranking unchanged.`,
        });
      }
    }
  }
  const competition = includeCompetition
    ? rankCompetitionGrowth(
        buildCompetitionGrowthRows({
          ...snapshot,
          submissions,
          window: snapshot.schedule,
          seasonId: snapshot.season,
        })
      )
    : null;
  if (competition)
    for (const row of competition.notRanked)
      add(
        'competition-not-ranked',
        row,
        row.notRankedReason ||
          row.reason ||
          row.match?.status ||
          'Review baseline and upload window'
      );
  return {
    schemaVersion: 1,
    provenance: {
      exportedAt: new Date(now).toISOString(),
      season: snapshot.season || '',
      source: 'authenticated-admin-firestore-snapshot',
      scope: 'all loaded records; no display filters',
      historyScope: snapshot.historyScope || 'not-requested',
      private: true,
    },
    settings,
    counts: {
      signups: submissions.length,
      finalUploads: raceScores.length,
      historicalUploads: list(snapshot.baselineRaceScores).length,
      issues: issues.length,
    },
    reconciliation: issues,
    standings,
    competition,
    localExemptions: readVtsScoreExemptions(),
    records: {
      submissions,
      raceScores,
      baselineRaceScores: list(snapshot.baselineRaceScores),
      schedule: snapshot.schedule || null,
      config: snapshot.config || null,
      settings: snapshot.settings || null,
      matchResults: list(snapshot.matchResults),
    },
  };
}

function flatten(value, prefix = '', output = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (!entries.length && prefix) output[prefix] = '{}';
    for (const [key, child] of entries) flatten(child, prefix ? `${prefix}.${key}` : key, output);
  } else output[prefix] = Array.isArray(value) ? JSON.stringify(value) : value;
  return output;
}

export function vtsScoreAuditCsv(audit) {
  const rows = [];
  for (const [recordType, values] of Object.entries(audit.records)) {
    for (const record of Array.isArray(values) ? values : values ? [values] : [])
      rows.push({ recordType, ...flatten(record) });
  }
  for (const record of audit.reconciliation)
    rows.push({ recordType: 'reconciliation', ...flatten(record) });
  for (const record of audit.standings) rows.push({ recordType: 'standings', ...flatten(record) });
  for (const record of [
    ...(audit.competition?.ranked || []),
    ...(audit.competition?.notRanked || []),
  ])
    rows.push({ recordType: 'competition', ...flatten(record) });
  rows.unshift({
    recordType: 'provenance',
    ...flatten(audit.provenance),
    ...flatten(audit.settings, 'effectiveSettings'),
    localExemptions: JSON.stringify(audit.localExemptions),
  });
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].sort();
  const cell = (value) => {
    let text = value === null || value === undefined ? '' : String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/u.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      columns.map(cell).join(','),
      ...rows.map((row) => columns.map((column) => cell(row[column])).join(',')),
    ].join('\r\n')
  );
}

export function downloadVtsScoreAudit(snapshot, format = 'json', options = {}) {
  const audit = buildVtsScoreAudit(snapshot, options);
  const text = format === 'csv' ? vtsScoreAuditCsv(audit) : JSON.stringify(audit, null, 2);
  const blob = new Blob([text], {
    type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vts-private-${String(snapshot.season || 'signups').replace(/[^a-z0-9_-]/gi, '-')}-${Date.now()}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return audit;
}
