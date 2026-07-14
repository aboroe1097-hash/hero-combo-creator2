import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  availableLanguages,
  loadTranslationsForLanguage,
  translations,
  translationCoverage,
} from '../js/translations.js';

await Promise.all(availableLanguages.map((lang) => loadTranslationsForLanguage(lang)));

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlFiles = [
  'index.html',
  'admin.html',
  'eden-x1.html',
  ...fs
    .readdirSync(path.join(rootDir, 'tabs'))
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join('tabs', name)),
];

const NON_FALLBACK_KEYS = [
  'adminContributionRewardGuildMaster',
  'adminContributionRewardCore',
  'adminContributionRewardPowerHouse',
  'adminContributionRewardMembers',
  'adminContributionRewardPremium',
  'adminContributionRewardStandard',
  'adminContributionRewardReview',
  'adminContributionRewardNone',
  'adminContributionRewardAuto',
  'edenX1Kicker',
  'edenX1Intro',
  'edenX1DeckLabel',
  'edenX1AdminDashboard',
  'edenX1ExploreWebsite',
  'edenX1ExploreWebsiteTitle',
  'edenX1NoticeTitle',
  'edenX1NoticeCopy',
  'edenX1RewardFlowEyebrow',
  'edenX1RewardFlowTitle',
  'edenX1RewardFlowSubtitle',
  'edenX1RewardLeaderboardTitle',
  'edenX1RewardLeaderboardCopy',
  'edenX1RewardSupportTitle',
  'edenX1RewardSupportCopy',
  'edenX1RewardManagementTitle',
  'edenX1RewardManagementCopy',
  'edenX1RewardTeamTitle',
  'edenX1RewardTeamCopy',
  'edenX1RewardCardAction',
  'edenX1RewardContributionMeta',
  'edenX1RewardSupportMeta',
  'edenX1RewardManagementMeta',
  'edenX1RewardTeamMeta',
  'edenX1RewardSlotGroup',
  'edenX1RewardAssigned',
  'edenX1RewardManagementVotePending',
  'edenX1RewardVotePending',
  'edenX1Tba',
  'edenX1Loading',
  'edenX1WeightedTitle',
  'edenX1ViewOnly',
  'edenX1NoFirebase',
  'edenX1NoData',
  'edenX1NoRows',
  'edenX1LoadFailed',
  'edenX1ThShieldWalls',
  'edenX1ThExGuild',
  'edenX1ThPathers',
  'edenX1ThConduct',
  'edenX1ThWeightedScore',
  'edenX1ViewLink',
  'edenX1CompactView',
  'edenX1FullView',
  'edenX1WeightedBreakdownTitle',
  'edenX1WeightedBreakdownAria',
  'edenX1BreakdownExGuild',
  'edenX1BreakdownDuty',
  'edenX1BreakdownConductPoints',
  'edenX1DutyFormula',
  'edenX1ConductFormula',
  'edenX1ConductPrivateNotice',
  'edenX1ConductAria',
  'edenX1RankReasonTitle',
  'edenX1RankReasonAria',
  'edenX1RankedBy',
  'edenX1RankMovement',
  'edenX1RankUp',
  'edenX1RankDown',
  'edenX1RankSame',
  'edenX1RewardReasonTitle',
  'edenX1RewardReasonAria',
  'edenX1RewardReasonRank',
  'edenX1RewardReasonGrant',
  'edenX1RewardReasonForfeit',
  'adminAnalyticsTrends',
  'adminAnalyticsHeatmap',
  'adminAnalyticsDistribution',
  'adminAnalyticsConsistency',
  'adminAnalyticsStreaks',
  'edenX1AdvancedPublicHint',
  'edenX1HeatmapCardHint',
  'edenX1DistributionCardHint',
  'edenX1ConsistencyCardHint',
  'edenX1StreaksCardHint',
  'adminModalPlayerBreakdown',
  'adminModalActiveHours',
  'adminModalThDemolition',
  'adminModalThTarget',
  'adminModalThValue',
  'adminShowMore',
  'adminDeleteAttackTitle',
  'adminActivityTargets',
  'adminVoteCandidateTotals',
  'adminVoteBallots',
  'edenX1VoteTitle',
  'edenX1VoteSubtitle',
  'edenX1VoteYourName',
  'edenX1VoteYourVote',
  'edenX1VoteYourVoteSecond',
  'edenX1VoteYourVoteThird',
  'edenX1VoteYourVoteFourth',
  'edenX1VotePhSelf',
  'edenX1VotePhTeammate',
  'edenX1VotePhTeammateSecond',
  'edenX1VotePhTeammateThird',
  'edenX1VotePhTeammateFourth',
  'edenX1VoteSelfConfirmed',
  'edenX1VoteClearPicked',
  'edenX1VoteCast',
  'edenX1VoteInspectEmpty',
  'edenX1VoteInspectNamed',
  'edenX1VoteSavedDevice',
  'edenX1VoteErrUnknownSelf',
  'edenX1VoteErrPickBoth',
  'edenX1VoteErrDuplicate',
  'edenX1VoteErrCloud',
  'edenX1VoteStatusSaving',
  'edenX1VoteSaved',
  'edenX1VoteResultsNote',
  'edenX1VoteGuidanceTitle',
  'edenX1VoteGuidanceCopy',
  'edenX1VoteHelperEmpty',
  'edenX1VoteTopBanner',
  'edenX1VoteTopShield',
  'edenX1VoteTopPath',
  'edenX1VoteTopStructure',
  'edenX1VoteTopBuildingMvp',
  'edenX1VoteBuildingMvpValue',
  'edenX1VoteTopR5Bonus',
  'edenX1VoteR5BonusValue',
  'edenX1VoteTopConsistent',
  'edenX1VoteDetailSubtitle',
  'edenX1VoteOpenDetail',
  'edenX1VoteNoTrend',
  'edenX1VoteTrendLabel',
  'edenX1VoteMatchBest',
  'edenX1VoteMatchSimilar',
  'edenX1VoteSupportTotal',
  'edenX1VoteBannerPathShield',
  'edenX1VoteContributionTotal',
  'edenX1VoteConductBonus',
  'edenX1VoteStructureConsistency',
  'edenX1VoteMovementDelta',
  'edenX1VoteNoSimilarMember',
  'edenX1VoteSavingShort',
  'edenX1VoteSyncFailed',
  'edenX1VoteOpen',
  'edenX1VoteClosingSoon',
  'edenX1VoteStatus',
  'edenX1VoteTimeRemaining',
  'edenX1VoteRule',
  'edenX1VoteSelectionCount',
  'edenX1MarqueeKicker',
  'edenX1MarqueeMembers',
  'edenX1MarqueeTop20Cutoff',
  'edenX1MarqueeWeighted',
  'edenX1MarqueeTopPerformer',
  'edenX1ProgressionStart',
  'edenX1ProgressionNow',
  'edenX1ProgressionVoteDeadline',
  'researchGameHint',
  'manualBuilderSelectHeroAria',
  'manualBuilderHeroInfoAria',
  'manualBuilderHeroSelectedAnnouncement',
  'manualBuilderDeleteComboAria',
  'strifeAvailableHeroesAtStage',
  'strifeBattleNotesPendingBody',
  'strifeBattleNotesPendingTitle',
  'strifeBestRosterMatch',
  'strifeChooseTarget',
  'strifeDatabaseRank',
  'strifeEmptyLineupBody',
  'strifeEmptyLineupTitle',
  'strifeEyebrow',
  'strifeFormationOrder',
  'strifeFreeCombos',
  'strifeIntro',
  'strifeManualScore',
  'strifeMetricAvailableStages',
  'strifeMetricRepeat',
  'strifeMetricSelected',
  'strifeMetricsAria',
  'strifeMonsterGroupAria',
  'strifeMonsterHeading',
  'strifeMonsterIntel',
  'strifeMonsterIntelPendingBody',
  'strifeMonsterIntelPendingTitle',
  'strifeMonsterSkillFallback',
  'strifeNotesCount',
  'strifePaidCombos',
  'strifePending',
  'strifeRecommendedFormation',
  'strifeReusableRank',
  'strifeSeasonStageGroupAria',
  'strifeSelectedMonster',
  'strifeSkillCounter',
  'strifeSkillNumber',
  'strifeSourceGuide',
  'strifeTagArcherCore',
  'strifeTagComboDb',
  'strifeTagF2PRow',
  'strifeTagP2WRow',
  'strifeTagPressure',
  'strifeTagRanked',
  'strifeTagSkillSpam',
  'strifeTagSustain',
  'strifeTapToPlan',
  'strifeTierRank',
  'strifeTroopMixed',
  'strifeVerifiedLineup',
  'tabStrife',
];

const I18N_ATTRS = [
  'data-i18n',
  'data-i18n-ph',
  'data-i18n-title',
  'data-i18n-aria',
  'data-i18n-label',
];

const referencedKeys = new Map();

function addKey(key, location) {
  if (!referencedKeys.has(key)) referencedKeys.set(key, []);
  referencedKeys.get(key).push(location);
}

for (const relPath of htmlFiles) {
  const absolutePath = path.join(rootDir, relPath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  for (const attr of I18N_ATTRS) {
    const re = new RegExp(`${attr}=["']([^"']+)["']`, 'g');
    let match;
    while ((match = re.exec(source))) {
      addKey(match[1], `${relPath}:${attr}`);
    }
  }
}

function walkJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) walkJsFiles(absolutePath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) out.push(absolutePath);
  }
  return out;
}

const jsKeyRe = /\b(?:adminT|dashT|t)\(\s*['"]([a-zA-Z][a-zA-Z0-9_]*)['"]/g;
const RUNTIME_KEY_PREFIXES =
  /^(admin|eden|tab|game|dash|message|toast|hero|combo|research|loyalty|bug|footer|lang|seo|step|upgrade|cost|lvl|next|after|loading)/;
for (const absolutePath of walkJsFiles(path.join(rootDir, 'js'))) {
  const relPath = path.relative(rootDir, absolutePath).replace(/\\/g, '/');
  const source = fs.readFileSync(absolutePath, 'utf8');
  let match;
  while ((match = jsKeyRe.exec(source))) {
    const key = match[1];
    if (!RUNTIME_KEY_PREFIXES.test(key) && (!/[A-Z]/.test(key) || key.length < 6)) continue;
    addKey(key, `${relPath}:runtime`);
  }
}

const englishKeys = Object.keys(translations.en || {});
const errors = [];

for (const [key, locations] of referencedKeys.entries()) {
  if (!(key in translations.en)) {
    errors.push(`Missing English translation key "${key}" used at ${locations.join(', ')}`);
  }
}

for (const [lang, dict] of Object.entries(translations)) {
  const missing = englishKeys.filter((key) => !(key in dict));
  if (missing.length) {
    errors.push(
      `${lang} is missing ${missing.length} runtime keys: ${missing.slice(0, 20).join(', ')}`
    );
  }
}

function placeholderSignature(value) {
  return [...String(value || '').matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join('|');
}

for (const [lang, dict] of Object.entries(translations)) {
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== 'string') {
      errors.push(`${lang}.${key} must be a string translation value`);
    } else if (
      value.includes('??') ||
      value.includes('\uFFFD') ||
      /[\p{L}]\?[\p{L}]/u.test(value)
    ) {
      errors.push(
        `${lang}.${key} contains a broken placeholder translation: ${JSON.stringify(value)}`
      );
    }
  }
}

for (const [lang, dict] of Object.entries(translations)) {
  if (lang === 'en') continue;
  for (const key of englishKeys) {
    if (!(key in dict)) continue;
    const englishPlaceholders = placeholderSignature(translations.en[key]);
    const translatedPlaceholders = placeholderSignature(dict[key]);
    if (translatedPlaceholders !== englishPlaceholders) {
      errors.push(
        `${lang}.${key} placeholders ${translatedPlaceholders || '(none)'} do not match English ${englishPlaceholders || '(none)'}`
      );
    }
  }
}

for (const [lang, dict] of Object.entries(translations)) {
  if (lang === 'en') continue;
  for (const key of NON_FALLBACK_KEYS) {
    if (key in dict && dict[key] === translations.en[key]) {
      const enVal = translations.en[key];
      // Allow identical values for shared brand terms, proper nouns, and placeholder-heavy text
      if (
        key === 'tabStrife' ||
        key === 'strifeDatabaseRank' ||
        key === 'strifeTierRank' ||
        key === 'strifeReusableRank' ||
        key === 'strifeSkillNumber' ||
        key === 'strifeNotesCount' ||
        key === 'strifeMetricAvailableStages' ||
        key === 'strifeMetricSelected' ||
        key === 'strifeAvailableHeroesAtStage' ||
        enVal === 'F2P row' ||
        enVal === 'P2W row' ||
        enVal === 'Combo DB' ||
        enVal === 'Strife over Dragon'
      ) continue;
      errors.push(`${lang}.${key} still matches the English text`);
    }
  }
}

if (errors.length) {
  console.error('i18n check failed:');
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log(
  `i18n check passed: ${referencedKeys.size} template keys, ${englishKeys.length} runtime keys, ${Object.keys(translations).length} languages.`
);
for (const [lang, coverage] of Object.entries(translationCoverage)) {
  const fallbackCount = coverage.missingBeforeFallback.length;
  if (fallbackCount) {
    console.log(
      `i18n coverage: ${lang} uses English fallback for ${fallbackCount}/${coverage.total} keys.`
    );
  }
}
