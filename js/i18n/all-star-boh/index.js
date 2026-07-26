import { resolveRuntimeLocale } from '../../locale-format.js';
import { ALL_STAR_BOH_SHARED_ADDITIONS } from './shared-additions.js';

export const ALL_STAR_BOH_EN = Object.freeze({
  'access.enterPin': 'Enter member PIN',
  'access.membersOnly': 'MEMBERS ONLY',
  'action.remove': 'Remove',
  'announcement.allTeamsKicker': '{teams} TEAMS · {players} PLAYERS',
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
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.role': 'Role',
  'common.seat': 'Seat',
  'common.team1': 'Team 1',
  'common.team2': 'Team 2',
  'common.team3': 'Team 3',
  'common.team4': 'Team 4',
  'common.team5': 'Team 5',
  'common.team6': 'Team 6',
  'common.teamName': 'Team name',
  'field.arsenal': 'Arsenal',
  'field.commandCenter': 'Command Center',
  'field.fortress': 'Fortress of Honor',
  'field.hospital': 'Hospital',
  'field.outpost': 'Outpost',
  'field.relay': 'Relay',
  'field.sanctuary': 'Sanctuary',
  'field.stronghold': 'Stronghold',
  'field.tower': 'Tower',
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
  'hero.title': 'All-Star BoH Hub',
  'nav.announcement': 'Team Formation',
  'nav.announcementHint': 'See all six teams',
  'nav.ariaLabel': 'All-Star BoH sections',
  'nav.plan': 'Battle Map & Plans',
  'nav.planHint': 'Follow your route',
  'nav.signup': 'Signup',
  'nav.signupHint': 'Share your stats',
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
  'plan.mapScaleHint': 'Projected from battlefield coordinates',
  'plan.mapSvgDescription':
    'A projected battlefield map showing clickable objectives, tower territory, and your assigned route. The same route is written below the map.',
  'plan.mapSvgTitle': 'Personal battlefield route',
  'plan.mapTitle': 'Personal map',
  'plan.matchTimeHint': 'Times are match time',
  'plan.next': 'NEXT',
  'plan.nextMove': 'Next move',
  'plan.nextPlaceholder': 'Your upcoming instruction will appear here.',
  'plan.now': 'NOW',
  'plan.nowNextTitle': 'Current and next instructions',
  'plan.opponentSide': 'Opponent side',
  'plan.otherObjective': 'Other objective',
  'plan.objectiveCurrentTarget': 'Current target',
  'plan.objectiveNoAssignments': 'No personal assignment at this structure in your current plan.',
  'plan.objectiveOnRoute': 'On your route',
  'plan.objectiveStructure': 'Structure',
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
  'plan.standbyAction': 'Stand by',
  'plan.standbyStatus': 'Standby status',
  'plan.standbySummary': 'Standby - wait for call',
  'plan.standbyTarget': 'Hold position and wait for call.',
  'plan.standbyTitle': 'Standby assignment',
  'plan.startingAssignment': 'YOUR STARTING ASSIGNMENT',
  'plan.targetPlaceholder': 'Your target and route will appear here.',
  'plan.targetRoute': 'Target / route',
  'plan.teleport': 'Teleport',
  'plan.teleportNowTitle': 'Teleport assigned',
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
  'plan.crystalDescription': 'Use this Legion for Sacred Crystal Mine gathering in this phase.',
  'plan.crystalTitle': 'Gather crystals',
  'schedule.countdownDays': '{days}d {hours}h',
  'schedule.countdownHours': '{hours}h {minutes}m',
  'schedule.countdownMinutes': '{minutes}m {seconds}s',
  'schedule.kicker': 'EVENT CLOCK',
  'schedule.now': 'Now',
  'schedule.railAria': 'Event milestones',
  'schedule.teamTimesAria': 'Team game times',
  'schedule.title': 'Event schedule',
  'schedule.waiting': 'Waiting',
  'role.backup': 'Backup / rotating player',
  'role.bottom': 'Bottom side',
  'role.flexible': 'Flexible — place me where needed',
  'role.offensive': 'Offensive team',
  'role.rune': 'Rune team',
  'role.top': 'Top side',
  'signup.accountNoteDescription':
    'Signing up another account? Use a different browser, private/incognito window, or a different device. This browser only keeps one local signup draft at a time, so switching accounts here may replace the saved draft for the previous account.',
  'signup.accountNoteTitle': 'Using multiple accounts?',
  'signup.accountTitle': 'Your account',
  'signup.availabilityAll': 'All matches',
  'signup.availabilityAllHint': 'I expect to be fully available.',
  'signup.availabilityLegend': 'Your expected availability',
  'signup.availabilityMost': 'Most matches',
  'signup.availabilityMostHint': 'I may miss a limited number.',
  'signup.buildingPower': 'Building Power',
  'signup.commitmentHint':
    'Power is only one part of selection. Full attendance and a clear role preference help us form dependable teams.',
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
  'signup.participationLegend': 'Do you want to play All-Star BoH?',
  'signup.participationAllStar': 'Yes, join All-Star BoH',
  'signup.participationAllStarHint': 'Complete the signup and Epic Showdown choices.',
  'signup.participationEpicOnly': 'No, Epic Showdown only',
  'signup.participationEpicOnlyHint': 'Skip the All-Star intake and choose your Epic availability.',
  'signup.vtsMemberLegend': 'Do you currently play in VTS 1097?',
  'signup.contactNumber': 'Viber or WhatsApp number',
  'signup.currentState': 'Current state',
  'signup.joinReason': 'Why do you want to play with VTS?',
  'signup.troopEstimateTitle': 'Estimated troop counts',
  'signup.troopEstimateDescription': 'Optionally estimate each troop category in millions.',
  'signup.troopEstimateMillionsHint': 'Example: if you have 7,000,000 troops, enter only 7.',
  'signup.troopEstimateLofty': 'S (Lofty) T10 troops',
  'signup.troopEstimateEnhancedT10': 'Enhanced T10 troops',
  'signup.troopEstimateT10': 'T10 troops',
  'signup.troopEstimateT9': 'T9 troops',
  'signup.heroAlFatih': 'Al Fatih',
  'signup.heroCaoCao': 'Cao Cao',
  'signup.heroLionheart': 'LionHeart',
  'signup.heroPower': 'Hero Combat Power',
  'signup.kicker': 'PLAYER INTAKE',
  'signup.methodLegend': 'How do you want to add your stats?',
  'signup.methodManual': 'Enter values manually',
  'signup.methodManualHint': 'Best when you already have the numbers ready.',
  'signup.methodOcr': 'Read a screenshot with OCR',
  'signup.methodOcrHint': 'Upload one clear account-stat screenshot, then review the draft.',
  'signup.notSubmitted': 'Not submitted',
  'signup.editSignup': 'Edit my signup',
  'signup.ocrChecklist': 'Screenshot checklist',
  'signup.ocrChoose': 'Choose a screenshot',
  'signup.ocrCheckDescription':
    'Compare every value with the screenshot before confirming the draft.',
  'signup.ocrCheckTitle': 'Check the highlighted OCR fields',
  'signup.ocrConsent':
    'I understand this screenshot will be processed by a third-party AI provider and the extracted values will be placed into my power fields.',
  'signup.ocrFileHint': 'PNG, JPG, or WebP. Use a clear, recent image.',
  'signup.ocrKicker': 'OPTIONAL OCR',
  'signup.ocrIssueCorrected': 'Corrected manually — verify once more.',
  'signup.ocrIssueLowConfidence': 'Low OCR confidence — compare this field with the screenshot.',
  'signup.ocrIssueMissing': 'Missing — enter this value.',
  'signup.ocrIssueMissingConfidence': 'OCR confidence unavailable — verify this field carefully.',
  'signup.ocrMissingSummary': 'OCR missed {count} required field(s). Enter them before confirming.',
  'signup.ocrOneImage': 'One image',
  'signup.ocrPreviewAlt': 'Selected account-stat screenshot preview',
  'signup.ocrExampleAlt': 'Example in-game power breakdown screenshot',
  'signup.ocrExampleTitle': 'Example screenshot',
  'signup.ocrExampleHint':
    'Your language may differ. Keep the full list and its top-to-bottom order visible.',
  'signup.unitSpecialtyPower': 'Unit Specialty Power',
  'signup.artifactPower': 'Artifact Power (optional)',
  'signup.royalTechPower': 'Royal Tech Power (optional)',
  'signup.rocExampleAlt': 'Red RoC specialization tree example',
  'signup.rocAllStarHint':
    'All members are expected to be on the Red specialization tree during All-Star BoH.',
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
    'If you use OCR, your screenshot is sent to a third-party AI service only to read the visible numbers. The extracted power values are placed directly into the fields below. Edit any incorrect or missing number before submitting.',
  'signup.privacyTitle': 'OCR fills the power fields for you',
  'signup.readinessKicker': 'READINESS',
  'signup.readinessTitle': 'Troops, heroes, and RoC',
  'signup.reviewHint': 'Your latest confirmed submission will be used for team balancing.',
  'signup.reviewTitle': 'Review before submitting',
  'signup.rocLevel': 'RoC level',
  'signup.speedHeroesHint': 'Select every speed hero currently available on your account.',
  'signup.speedHeroesLegend': 'Which speed heroes do you have?',
  'signup.submitAll': 'Submit signup & Epic choices',
  'showdown.submitOnly': 'Save Epic Showdown choices',
  'signup.t9Archers': 'Archers',
  'signup.t9Cavalry': 'Cavalry',
  'signup.t9Footmen': 'Footmen',
  'signup.t9Hint': 'Select every type that is ready now.',
  'signup.t9Legend': 'Which T10 troop types can you field?',
  'signup.t9None': 'All T10 troop types',
  'signup.technologyPower': 'Technology Power',
  'signup.title': 'Tell us where your account stands',
  'signup.totalPower': 'Total Castle Power',
  'signup.troopPower': 'Troop Power',
  'common.teamNumber': 'Team {number}',
  'plan.loadoutValue': 'Loadout: {value}',
  'plan.mapRouteDescription': 'Highlighted personal route: {route}.',
  'plan.noNextInstruction': 'No later instruction.',
  'plan.noNextPhase': 'Final phase',
  'plan.teleportValue': 'Teleport: {value}',
  'signup.ocrConfidence': 'OCR confidence: {percent}%',
  'signup.ocrConsentRequired': 'Confirm the OCR processing notice first.',
  'signup.ocrFileRequired': 'Choose one screenshot first.',
  'signup.ocrProcessing':
    'Reading screenshot—keep this page open. You may continue filling the form.',
  'signup.ocrReviewReady': 'Power values filled automatically. Review the fields below.',
  'signup.ocrError':
    'Screenshot reading failed. Retry, or enter or correct the values manually—you can still save your update.',
  'signup.revisionConflict':
    'Your saved signup changed in another session. Review this form and submit again.',
  'signup.savedNotice': 'Your stats were submitted successfully.',
  'signup.confirmationKicker': 'SIGNUP SAVED',
  'signup.submitConfirmationTitle': 'Signup submitted',
  'signup.submitConfirmationDescription':
    'Your information is ready for leadership review and team balancing.',
  'signup.editConfirmationTitle': 'Edits accepted',
  'signup.editConfirmationDescription':
    'Your updated information is saved and ready for leadership review.',
  'signup.confirmationRevision': 'Submission revision {revision}',
  'signup.confirmationContinue': 'Continue',
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
    'Optional for VTS 1097 players only. Select every battlefield position and game time that works for you; you can update these preferences later.',
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
  'showdown.flexibilityLegend': 'How do you prefer to stay flexible?',
  'showdown.flexibilityHint': 'Choose the one approach that suits you best.',
  'showdown.flexibilityRoles': 'Change roles, keep my fight time',
  'showdown.flexibilityTimes': 'Change fight time, keep my role',
  'showdown.flexibilityFixed': 'One fixed role and fight time',
  'showdown.flexibilityRequired': 'Choose how flexible you want to be for Epic Showdown.',
  'showdown.timeOption': 'Game time {time}',
  'showdown.notSaved': 'Not saved',
  'showdown.saved': 'Saved · revision {revision}',
  'showdown.saving': 'Saving…',
  'showdown.revisionConflict': 'Latest saved choices loaded—review and change them before saving.',
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
  'signup.researchMaxAll': 'Max all',
  'signup.researchMaxAllLabel': 'Set all {season} research to 100%',
  'signup.researchClear': 'Clear',
  'signup.researchMaxLabel': 'Set {tree} to 100%',
  'signup.researchClearLabel': 'Clear {tree}',
  'signup.fightingTimesLegend': 'Choose exactly two All-Star fighting times',
  'signup.fightingTimesHint':
    'The game requires two preferred time choices. Final fighting times are decided by the majority vote across all participating teams.',
  'signup.fightingTime12': 'Game time +12',
  'signup.fightingTime14': 'Game time +14',
  'signup.fightingTime16': 'Game time +16',
  'signup.fightingTimesCount': '{count} / 2 selected',
  'signup.fightingTimesRequired': 'Choose exactly two All-Star fighting times.',
  'signup.fightingTimesLimit':
    'Only two fighting times can be selected. Remove one before choosing another.',
  'signup.roleGuideTitle': 'All-Star team roles',
  'signup.roleGuideHint':
    'Choose where you contribute best. Leadership may adjust assignments to balance the final teams.',
  'signup.roleFlexibleDescription': 'Comfortable adapting to any team or lane.',
  'signup.roleOffensiveDescription': 'Prioritizes pressure, rallies, and direct fighting.',
  'signup.roleRuneDescription': 'Secures runes and responds quickly to objective calls.',
  'signup.roleTopDescription': 'Holds and contests objectives on the top route.',
  'signup.roleBottomDescription': 'Holds and contests objectives on the bottom route.',
  'signup.primaryRole': 'Primary role',
  'signup.leadershipInterest': 'Would you be willing to lead a team or help with management?',
  'signup.leadershipInterestHint':
    'This is a planning signal only; leadership will contact you before assigning anything.',
  'signup.leadershipInterestYes': 'Yes, I can help lead',
  'signup.leadershipInterestNo': 'No, not this season',
  'signup.leadershipInterestRequired': 'Choose whether you can help lead or manage this season.',
  'signup.secondaryRole': 'Secondary role (optional)',
  'signup.selectRole': 'Choose a role',
  'signup.secondaryRoleDifferent': 'Choose a different secondary role.',
  'nav.lockHub': 'Lock hub',
  'signup.requiredFieldsMissing': 'Complete the highlighted required field before submitting.',
  'signup.permissionDeniedError':
    'Your submission could not be saved — your member access may have expired. Unlock with your PIN again, then resubmit. If it keeps failing, contact leadership.',
  'signup.teamNameTitle': 'Which team names do you like?',
  'signup.teamNameDescription': 'Pick every animal team identity you would be happy to join.',
  'signup.teamNameHint':
    'Optional and just for fun; leadership makes the final team-name decision.',
  'role.noPreference': 'No preference',
  ...ALL_STAR_BOH_SHARED_ADDITIONS,
});

const LOCALE_LOADERS = Object.freeze({
  ar: () => import('./ar.js'),
  de: () => import('./de.js'),
  es: () => import('./es.js'),
  fr: () => import('./fr.js'),
  hr: () => import('./hr.js'),
  id: () => import('./id.js'),
  it: () => import('./it.js'),
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
  return Object.freeze({ ...ALL_STAR_BOH_EN, ...candidate });
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
