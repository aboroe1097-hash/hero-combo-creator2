import { resolveRuntimeLocale } from '../../locale-format.js';

export const ALL_STAR_BOH_EN = Object.freeze({
  'access.enterPin': 'Enter member PIN',
  'access.membersOnly': 'MEMBERS ONLY',
  'action.remove': 'Remove',
  'announcement.allTeamsKicker': '6 TEAMS · 72 PLAYERS',
  'announcement.allTeamsTitle': 'All team overview',
  'announcement.captain': 'Captain:',
  'announcement.description':
    'See your personal assignment first, then explore all six balanced teams.',
  'announcement.highlightHint': 'Your team is highlighted',
  'announcement.kicker': 'TEAM ANNOUNCEMENT',
  'announcement.lockedDescription':
    'Enter the current VTS member PIN before viewing private roster information.',
  'announcement.lockedTitle': 'Unlock the All-Star hub to see team announcements',
  'announcement.myAssignment': 'YOUR ASSIGNMENT',
  'announcement.myRoster': 'Your team roster',
  'announcement.myTeam': 'My team',
  'announcement.openPlan': 'Open my team plan',
  'announcement.playerPlaceholder': 'Player assignment',
  'announcement.reviewSignup': 'Review my signup',
  'announcement.rosterStatus': 'Roster status',
  'announcement.startingRole': 'Starting role',
  'announcement.title': 'Your All-Star roster',
  'announcement.twelvePlayers': '12 PLAYERS',
  'announcement.unassignedDescription':
    'Check that your current game name matches your signup, or contact leadership.',
  'announcement.unassignedKicker': 'NO ASSIGNMENT FOUND',
  'announcement.unassignedTitle': 'Your name is not on a published roster yet',
  'announcement.unpublishedBadge': 'We will announce when ready',
  'announcement.unpublishedDescription':
    'Your signup is safe. Return here when the announcement is released.',
  'announcement.unpublishedKicker': 'NOT PUBLISHED YET',
  'announcement.unpublishedTitle': 'Leadership is balancing the teams',
  'announcement.viewRosterHint': '12 players · View roster',
  'announcement.yourSeat': 'Your seat',
  'common.player': 'Player',
  'common.legionNumber': 'Legion {number}',
  'common.required': 'Required',
  'common.role': 'Role',
  'common.seat': 'Seat',
  'common.team1': 'Team 1',
  'common.team2': 'Team 2',
  'common.team3': 'Team 3',
  'common.team4': 'Team 4',
  'common.team5': 'Team 5',
  'common.team6': 'Team 6',
  'common.teamName': 'Team name',
  'feedback.confirmedDescription': 'Your confirmed information is ready for team balancing.',
  'feedback.confirmedTitle': 'Leadership confirmed your signup',
  'feedback.correctionDescription':
    'Update the requested details below and submit again. For a name or identity issue, use your exact in-game name and contact R5.',
  'feedback.correctionResubmittedDescription':
    'Your newer submission is waiting for leadership to review again.',
  'feedback.correctionResubmittedTitle': 'Signup updated — review pending',
  'feedback.correctionTitle': 'Leadership requested a correction',
  'feedback.excludedDescription':
    'Read the leadership note below. Contact R5 if you need help or believe this should be reviewed.',
  'feedback.excludedTitle': 'This signup is not in the current pool',
  'feedback.kicker': 'SIGNUP REVIEW',
  'feedback.pendingDescription': 'Your latest signup is waiting for leadership review.',
  'feedback.pendingTitle': 'Leadership review pending',
  'feedback.revision':
    'Submission revision {submissionRevision} · review revision {reviewRevision}',
  'hero.description':
    'Share your current combat stats, check your team assignment, and follow your personal match plan from one private hub.',
  'hero.eyebrow': 'VTS MEMBERS · ALL-STAR BOH',
  'hero.title': 'Build your strongest team',
  'nav.announcement': 'Team Announcement',
  'nav.announcementHint': 'Meet your roster',
  'nav.ariaLabel': 'All-Star BoH sections',
  'nav.plan': 'My Team Plan',
  'nav.planHint': 'Know every move',
  'nav.signup': 'Signup',
  'nav.signupHint': 'Share your stats',
  'nav.showdown': 'Epic Showdown',
  'nav.showdownHint': 'Choose lanes & times',
  'phase.continueRole': 'Continue role',
  'phase.endgame': 'Endgame',
  'phase.endgameAssignment': 'Endgame assignment',
  'phase.finalObjective': 'Final objective',
  'phase.newRole': '↻ New role',
  'phase.minuteRange': '{start}–{end} min',
  'phase.number': 'Phase {number}',
  'phase.numberLabel': 'PHASE {number}',
  'phase.opening': 'Opening',
  'phase.openingAssignment': 'Opening assignment',
  'phase.openingTitle': 'Opening · 0–5 minutes',
  'phase.phaseOne': 'PHASE 01',
  'phase.pressure': 'Pressure',
  'phase.roleRotation': 'Role rotation',
  'phase.secondAssignment': 'Second assignment',
  'phase.setup': 'Setup',
  'phase.startingRole': 'Starting role',
  'plan.action': 'Action',
  'plan.actionPlaceholder': 'Your published action will appear here.',
  'plan.currentTarget': 'Current target',
  'plan.description': 'Your role, route, loadout, and next move for every phase of the match.',
  'plan.directRoute': 'Direct route',
  'plan.kicker': 'PERSONAL MATCH GUIDE',
  'plan.leadershipNote': 'Leadership note',
  'plan.legion1': 'Legion 1',
  'plan.legion2': 'Legion 2',
  'plan.legionHint': 'Choose the Legion shown for your current matchup.',
  'plan.liveCallDescription':
    'If leadership changes the plan during the match, follow the live instruction first.',
  'plan.liveCallTitle': 'The live call wins.',
  'plan.loadoutPlaceholder': 'Loadout: —',
  'plan.lockedDescription': 'Private strategy is only visible after member access is confirmed.',
  'plan.lockedTitle': 'Unlock the All-Star hub to see your plan',
  'plan.mapLegend': 'Map legend',
  'plan.mapScaleHint': 'Schematic · not to scale',
  'plan.mapSvgDescription':
    'A schematic arena map showing leadership-authored objectives and, when coordinates are available, your assigned start, route, and target. The same route is written below the map.',
  'plan.mapSvgTitle': 'Personal match route schematic',
  'plan.mapTitle': 'Personal map',
  'plan.matchTimeHint': 'Times are match time',
  'plan.next': 'NEXT',
  'plan.nextMove': 'Next move',
  'plan.nextPlaceholder': 'Your upcoming instruction will appear here.',
  'plan.now': 'NOW',
  'plan.nowNextTitle': 'Current and next instructions',
  'plan.opponentSide': 'Opponent side',
  'plan.otherObjective': 'Other objective',
  'plan.phaseTabsAria': 'Match phases',
  'plan.rotationHint': 'Follow the rotation marker in the timeline.',
  'plan.rotationTitle': 'Your role changes later.',
  'plan.routeFinish': 'Finish:',
  'plan.routeKicker': 'YOUR ROUTE',
  'plan.routeStart': 'Start:',
  'plan.routeStartFallback': 'Assigned start',
  'plan.routeTextTitle': 'Your route in text',
  'plan.routeVia': 'Move through:',
  'plan.spawnPlaceholder': 'Your spawn',
  'plan.startingAssignment': 'YOUR STARTING ASSIGNMENT',
  'plan.targetPlaceholder': 'Your target and route will appear here.',
  'plan.targetRoute': 'Target / route',
  'plan.teleport': 'Teleport',
  'plan.teleportPlaceholder': 'Teleport: —',
  'plan.timelineKicker': 'MATCH TIMELINE',
  'plan.timelineTitle': 'Your four phases',
  'plan.title': 'My Team Plan',
  'plan.towerPlaceholder': 'Assigned tower',
  'plan.troopsHeroes': 'Troops & heroes',
  'plan.unassignedDescription':
    'Check the Team Announcement or ask leadership to confirm your game name.',
  'plan.unassignedKicker': 'ASSIGNMENT NEEDED',
  'plan.unassignedTitle': 'No personal plan is connected to your account',
  'plan.unpublishedDescription':
    'Once released, this page will show only the instructions relevant to you.',
  'plan.unpublishedKicker': 'PLAN IN PROGRESS',
  'plan.unpublishedTitle': 'Leadership has not published your match plan yet',
  'plan.updated': 'Plan updated',
  'plan.waitPublished': 'Wait for the published plan',
  'plan.yourRoute': 'Your route',
  'role.backup': 'Backup / rotating player',
  'role.bottom': 'Bottom side',
  'role.flexible': 'Flexible — place me where needed',
  'role.offensive': 'Offensive team',
  'role.rune': 'Rune team',
  'role.top': 'Top side',
  'signup.accountTitle': 'Your account',
  'signup.availabilityAll': 'All matches',
  'signup.availabilityAllHint': 'I expect to be fully available.',
  'signup.availabilityBackup': 'Backup',
  'signup.availabilityBackupHint': 'Use me when a roster needs cover.',
  'signup.availabilityLegend': 'Your expected availability',
  'signup.availabilityMost': 'Most matches',
  'signup.availabilityMostHint': 'I may miss a limited number.',
  'signup.buildingPower': 'Building Power',
  'signup.commitLiveCalls': 'I can follow live leadership calls during matches.',
  'signup.commitPlan': 'I will review my assignment and follow the published team plan.',
  'signup.commitTeleport': 'I can follow teleport calls when my plan requires them.',
  'signup.commitmentHint':
    'Power is only one part of selection. Honest availability helps us form dependable teams and backups.',
  'signup.commitmentKicker': 'COMMITMENT',
  'signup.commitmentTitle': 'Availability and team fit',
  'signup.description':
    'Accurate stats help leadership build six balanced 12-player teams. You can enter the values yourself or let screenshot OCR prepare an editable draft.',
  'signup.dragonPower': 'Dragons Power',
  'signup.deviceIdentityDescription':
    'This signup is tied to this browser profile, not a password. If you change device or browser, or clear site data, submit again using the exact same in-game name, then contact R5 to merge or confirm the entries.',
  'signup.deviceIdentityTitle': 'Keep your signup connected',
  'signup.gameName': 'Current in-game name',
  'signup.gameNameHint': 'Use the exact name leadership knows you by.',
  'signup.heroAlFatih': 'Al Fatih',
  'signup.heroCaoCao': 'Cao Cao',
  'signup.heroLionheart': 'LionHeart',
  'signup.heroPower': 'Hero Combat Power',
  'signup.kicker': 'PLAYER INTAKE',
  'signup.level50Heroes': 'Number of level 50 heroes',
  'signup.methodLegend': 'How do you want to add your stats?',
  'signup.methodManual': 'Enter values manually',
  'signup.methodManualHint': 'Best when you already have the numbers ready.',
  'signup.methodOcr': 'Read a screenshot with OCR',
  'signup.methodOcrHint': 'Upload one clear account-stat screenshot, then review the draft.',
  'signup.notSubmitted': 'Not submitted',
  'signup.ocrChecklist': 'Screenshot checklist',
  'signup.ocrChoose': 'Choose a screenshot',
  'signup.ocrCheckDescription':
    'Compare every value with the screenshot before confirming the draft.',
  'signup.ocrCheckTitle': 'Check the highlighted OCR fields',
  'signup.ocrConfirmValues':
    'I compared every extracted value with my screenshot and corrected any mistakes.',
  'signup.ocrConsent':
    'I understand this screenshot will be processed by a third-party AI provider and that I must verify its output.',
  'signup.ocrFileHint': 'PNG, JPG, or WebP. Use a clear, recent image.',
  'signup.ocrKicker': 'OPTIONAL OCR',
  'signup.ocrIssueCorrected': 'Corrected manually — verify once more.',
  'signup.ocrIssueLowConfidence': 'Low OCR confidence — compare this field with the screenshot.',
  'signup.ocrIssueMissing': 'Missing — enter this value.',
  'signup.ocrIssueMissingConfidence': 'OCR confidence unavailable — verify this field carefully.',
  'signup.ocrMissingSummary': 'OCR missed {count} required field(s). Enter them before confirming.',
  'signup.ocrOneImage': 'One image',
  'signup.ocrPreviewAlt': 'Selected account-stat screenshot preview',
  'signup.ocrProcess': 'Read screenshot',
  'signup.ocrReady': 'Ready to process',
  'signup.ocrReviewBadge': 'OCR draft · review',
  'signup.ocrSelected': 'Screenshot selected',
  'signup.ocrStep1':
    'Open the in-game profile or account-stat page that shows the full power breakdown.',
  'signup.ocrStep2': 'Keep every number sharp, uncropped, and free from chat bubbles or overlays.',
  'signup.ocrStep3':
    'After processing, compare the OCR draft with the screenshot before confirming.',
  'signup.ocrTitle': 'Upload your account-stat screen',
  'signup.playerKicker': 'PLAYER',
  'signup.playerNotes': 'Anything leadership should know?',
  'signup.playerNotesPlaceholder':
    'Optional context about your account, availability, or role experience',
  'signup.powerHint': 'Enter the full values shown in-game. Do not shorten 250,000,000 to 250M.',
  'signup.powerKicker': 'POWER BREAKDOWN',
  'signup.powerTitle': 'Current combat stats',
  'signup.preferredTeammates': 'Preferred teammates',
  'signup.preferredTeammatesHint':
    'Optional — add up to six names, separated by commas or new lines. Leadership will consider the request, but balanced teams come first.',
  'signup.preferredTeammatesPlaceholder': 'Example: PlayerOne, PlayerTwo',
  'signup.privacyDescription':
    'If you use OCR, your screenshot is sent to a third-party AI service only to read the visible numbers. OCR can make mistakes. Review and correct every value before you submit; no extracted value is accepted automatically.',
  'signup.privacyTitle': 'Your screenshot requires your confirmation',
  'signup.readinessKicker': 'READINESS',
  'signup.readinessTitle': 'Troops, heroes, and RoC',
  'signup.reviewHint': 'Your latest confirmed submission will be used for team balancing.',
  'signup.reviewTitle': 'Review before submitting',
  'signup.rocLevel': 'RoC level',
  'signup.speedHeroesHint': 'Select every hero you expect to have match-ready.',
  'signup.speedHeroesLegend': 'Which speed heroes will be ready in 2–4 weeks?',
  'signup.submit': 'Submit my stats',
  'signup.t9Archers': 'Archers',
  'signup.t9Cavalry': 'Cavalry',
  'signup.t9Footmen': 'Footmen',
  'signup.t9Hint': 'Select every type that is ready now.',
  'signup.t9Legend': 'Which T9 troop types can you field?',
  'signup.t9None': 'None yet / T8',
  'signup.technologyPower': 'Technology Power',
  'signup.timezone': 'Timezone',
  'signup.timezonePlaceholder': 'Example: UTC+2',
  'signup.title': 'Tell us where your account stands',
  'signup.totalPower': 'Total Castle Power',
  'signup.troopPower': 'Troop Power',
  'signup.unavailableTimes': 'Known unavailable times',
  'signup.unavailableTimesPlaceholder': 'Dates, match times, or none',
  'common.teamNumber': 'Team {number}',
  'plan.loadoutValue': 'Loadout: {value}',
  'plan.mapRouteDescription': 'Highlighted personal route: {route}.',
  'plan.noNextInstruction': 'No later instruction.',
  'plan.noNextPhase': 'Final phase',
  'plan.teleportValue': 'Teleport: {value}',
  'signup.ocrConfidence': 'OCR confidence: {percent}%',
  'signup.ocrConsentRequired': 'Confirm the OCR processing notice first.',
  'signup.ocrFileRequired': 'Choose one screenshot first.',
  'signup.ocrProcessing': 'Reading screenshot…',
  'signup.ocrReviewReady': 'OCR draft ready. Review every value before submitting.',
  'signup.revisionConflict':
    'Your saved signup changed in another session. Review this form and submit again.',
  'signup.savedNotice': 'Your stats were submitted successfully.',
  'signup.saving': 'Saving…',
  'signup.submitted': 'Submitted · revision {revision}',
  'status.publishedRevision': 'Published · revision {revision}',
  'status.assigned': 'Assigned',
  'status.awaitingPublication': 'Awaiting publication',
  'status.notAvailable': 'Not available',
  'status.preparing': 'Preparing this season',
  'status.toBeAnnounced': 'To be announced',
  'showdown.kicker': 'EPIC SHOWDOWN',
  'showdown.title': 'Where and when do you want to play?',
  'showdown.description':
    'Select every battlefield position and game time that works for you. You can update these preferences later.',
  'showdown.gameName': 'Current in-game name',
  'showdown.gameNameHint':
    'This lets leadership identify your Epic Showdown preferences even if you did not submit All-Star stats.',
  'showdown.gameNamePlaceholder': 'Enter your exact in-game name',
  'showdown.laneLegend': 'Preferred battlefield positions',
  'showdown.laneHint': 'Choose one or more positions.',
  'showdown.laneRequired': 'Choose at least one position: South, Center, or North.',
  'showdown.laneSouth': 'South',
  'showdown.laneCenter': 'Center',
  'showdown.laneNorth': 'North',
  'showdown.timeLegend': 'Preferred game times',
  'showdown.timeHint': 'Choose every game time you can play.',
  'showdown.timeRequired': 'Choose at least one available game time.',
  'showdown.timeOption': 'Game time {time}',
  'showdown.notSaved': 'Not saved',
  'showdown.saved': 'Saved · revision {revision}',
  'showdown.saving': 'Saving…',
  'showdown.revisionConflict': 'Latest saved choices loaded—review and change them before saving.',
  'showdown.save': 'Save Epic preferences',
  'showdown.savedNotice': 'Your Epic Showdown preferences were saved.',
  'showdown.lockedTitle': 'Unlock the member hub to save Epic Showdown preferences',
  'showdown.lockedDescription':
    'Enter the current VTS member PIN before saving private availability.',
  'showdown.noTimeOptions': 'No game times are currently available. Please check again later.',
  'showdown.summaryNone': 'No preferences selected yet.',
  'showdown.summary': '{lanes} positions · {times} game times selected.',
  'signup.usableHeroesTitle': 'Usable heroes',
  'signup.usableHeroesHint':
    'Select heroes you own in enough copies to field in battle. They do not need to be maxed.',
  'signup.usableHeroesSelected': '{count} selected',
  'signup.heroSearch': 'Search heroes',
  'signup.heroSearchPlaceholder': 'Search by hero name',
  'signup.heroTroopFilter': 'Troop type',
  'signup.heroSeasonFilter': 'Season',
  'signup.heroAllTroops': 'All troop types',
  'signup.heroAllSeasons': 'All seasons',
  'signup.heroAllTypes': 'All troops',
  'signup.heroResults': '{count} heroes shown',
  'signup.heroResult': '1 hero shown',
  'signup.heroNoResults': 'No heroes match these filters.',
  'signup.researchTitle': 'Research progress',
  'signup.researchHint':
    'Optional. Enter an estimated completion percentage for any research tree you know.',
  'signup.researchEntered': '{count} of {total} trees entered',
  'signup.researchPercent': 'Completion percent',
  'signup.researchSeason': '{season} research',
  'signup.researchQuickSet': 'Set {tree} to {percent}%',
  'signup.researchMax': 'Max',
  'signup.researchClear': 'Clear',
  'signup.researchMaxLabel': 'Set {tree} to 100%',
  'signup.researchClearLabel': 'Clear {tree}',
  'signup.fightingTimesLegend': 'Choose exactly two All-Star fighting times',
  'signup.fightingTimesHint': 'Select the two game times when you are most available to fight.',
  'signup.fightingTime8': 'Game time +8',
  'signup.fightingTime12': 'Game time +12',
  'signup.fightingTime14': 'Game time +14',
  'signup.fightingTime20': 'Game time +20',
  'signup.fightingTimesCount': '{count} / 2 selected',
  'signup.fightingTimesRequired': 'Choose exactly two All-Star fighting times.',
  'signup.fightingTimesLimit':
    'Only two fighting times can be selected. Remove one before choosing another.',
  'signup.favoriteRole': 'Favorite role (optional)',
  'role.noPreference': 'No preference',
});

const LOCALE_LOADERS = Object.freeze({
  ar: () => import('./ar.js'),
  de: () => import('./de.js'),
  es: () => import('./es.js'),
  fr: () => import('./fr.js'),
  id: () => import('./id.js'),
  kr: () => import('./kr.js'),
  pt: () => import('./pt.js'),
  ru: () => import('./ru.js'),
  tr: () => import('./tr.js'),
  zh: () => import('./zh.js'),
});

const packs = new Map([['en', ALL_STAR_BOH_EN]]);
const inFlight = new Map();

export const ALL_STAR_BOH_LOCALES = Object.freeze(['en', ...Object.keys(LOCALE_LOADERS)]);

export function resolveAllStarBohLocale(locale) {
  const normalized = resolveRuntimeLocale(locale);
  return ALL_STAR_BOH_LOCALES.includes(normalized) ? normalized : 'en';
}

function normalizePack(module) {
  const candidate = module?.default ?? module?.ALL_STAR_BOH_TRANSLATIONS ?? module?.translations;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  return Object.freeze({ ...candidate });
}

function format(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (placeholder, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : placeholder
  );
}

export async function loadAllStarBohLocale(locale) {
  const normalized = resolveAllStarBohLocale(locale);
  if (packs.has(normalized)) return packs.get(normalized);

  if (!inFlight.has(normalized)) {
    inFlight.set(
      normalized,
      LOCALE_LOADERS[normalized]()
        .then((module) => {
          const pack = normalizePack(module);
          if (!pack) throw new TypeError(`Invalid All-Star BoH locale pack: ${normalized}`);
          packs.set(normalized, pack);
          return pack;
        })
        .catch((error) => {
          console.warn(
            `[all-star-boh-i18n] Failed to load ${normalized}; using canonical English.`,
            error
          );
          return ALL_STAR_BOH_EN;
        })
        .finally(() => inFlight.delete(normalized))
    );
  }

  return inFlight.get(normalized);
}

export function allStarBohText(key, vars = {}, locale) {
  const normalized = resolveAllStarBohLocale(locale);
  const pack = packs.get(normalized);
  return format(pack?.[key] ?? ALL_STAR_BOH_EN[key] ?? key, vars);
}

const DOM_ROUTES = Object.freeze([
  Object.freeze({ selector: '[data-boh-i18n]', datasetKey: 'bohI18n', attribute: null }),
  Object.freeze({
    selector: '[data-boh-i18n-aria]',
    datasetKey: 'bohI18nAria',
    attribute: 'aria-label',
  }),
  Object.freeze({
    selector: '[data-boh-i18n-alt]',
    datasetKey: 'bohI18nAlt',
    attribute: 'alt',
  }),
  Object.freeze({
    selector: '[data-boh-i18n-placeholder]',
    datasetKey: 'bohI18nPlaceholder',
    attribute: 'placeholder',
  }),
]);

export function applyAllStarBohTranslations(root = globalThis.document, locale) {
  if (!root?.querySelectorAll) return root;

  for (const route of DOM_ROUTES) {
    root.querySelectorAll(route.selector).forEach((element) => {
      const key = element.dataset?.[route.datasetKey];
      if (!key) return;
      const translated = allStarBohText(key, {}, locale);
      if (route.attribute) element.setAttribute(route.attribute, translated);
      else element.textContent = translated;
    });
  }

  return root;
}
