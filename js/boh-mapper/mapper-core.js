(function(){
const ASSET_BASE = "images/boh-mapper/";
const IS_VIEW = document.body.dataset.bohMapperMode === "view";

      const initialTeams = [
  {
    "id": "team-1",
    "name": "Team 1",
    "color": "teal",
    "fightTime": "+14",
    "players": [
      ["MalakAbo", 230670, 1093060662, "Yes", "en", "lock"],
      ["Malika Zena", 61272, 340000000, "Yes", "en", ""],
      ["TazzBoy", 57836, 265019439, "Yes", "en", ""],
      ["** Loony **", 122837, 760849605, "Yes", "en", ""],
      ["Jasper", 128899, 627847337, "Yes", "zh", ""],
      ["BiG BOiiE", 74499, 466587329, "Yes", "en", ""],
      ["MasterVj", 70079, 419982129, "Yes", "en", ""],
      ["Maximusss", 76285, 198994000, "Yes", "en", ""],
      ["\u303d\ufe0f Anne\u303d\ufe0f", 63000, 323114129, "Yes", "en", ""],
      ["!!\ufe0fUzumaki !!\ufe0f", 82338, 270835394, "Yes", "en", ""],
      ["Pink", 82021, 394999775, "Yes", "en", "backup"],
      ["La Scimmia", 80668, 425743796, "Yes", "en", "backup"]
    ]
  },
  {
    "id": "team-2",
    "name": "Team 2",
    "color": "violet",
    "fightTime": "+14",
    "players": [
      ["Dr Thund\u20acr", 105068, 284617358, "Yes", "en", "lock"],
      ["Bil.", 73868, 602384465, "Yes", "en", ""],
      ["BoneSmoker", 76353, 273313026, "Yes", "en", ""],
      ["Sarafino", 145295, 834387770, "Yes", "de", ""],
      ["ImRipper", 96186, 578895181, "No", "de", ""],
      ["\ud0a4\ubbf8kimmy", 86987, 551569492, "Yes", "kr", ""],
      ["AMG-63", 136562, 533507320, "Yes", "de", ""],
      ["Lord_IKR_", 150817, 514533301, "Yes", "en", ""],
      ["AE2050!", 120604, 460482780, "No", "en", ""],
      ["ImRyker", 77973, 356000000, "No", "de", ""],
      ["BL&23", 83302, 463138781, "Yes", "en", "backup"],
      ["\u2b50\ufe0fMariska\u2b50\ufe0f", 82429, 395848068, "Yes", "en", "backup"]
    ]
  },
  {
    "id": "team-3",
    "name": "Team 3",
    "color": "amber",
    "fightTime": "+14",
    "players": [
      ["ANGEL", 107326, 640304873, "Yes", "en", "lock"],
      ["Moldo1313", 78282, 456668761, "Yes", "en", ""],
      ["RedBull\u00a7", 114321, 418815337, "Yes", "es", ""],
      ["\u00d0obby", 107386, 439215286, "Yes", "en", ""],
      ["Blacki X", 76795, 437899910, "No", "ru", ""],
      ["Rudzaks", 79229, 427354229, "No", "en", ""],
      ["Kirin", 71369, 340112246, "Yes", "en", ""],
      ["\u771f\u5ead\u9053\u4e3b", 93307, 338904980, "Yes", "zh", ""],
      ["TetheR\u201d", 71609, 310000000, "No", "tr", ""],
      ["q. Immortal", 65060, 277746166, "Yes", "en", ""],
      ["jJamaica pete", 256441, 1225596152, "Yes", "en", "backup"],
      ["PeraIgi olman", 86176, 846736381, "Yes", "en", "backup"]
    ]
  },
  {
    "id": "team-4",
    "name": "Team 4",
    "color": "violet",
    "fightTime": "+14",
    "players": [
      ["Kika", 52376, 283929597, "Yes", "ru", "lock"],
      ["Peaceful Warrior", 74900, 400000000, "Yes", "ru", ""],
      ["\u2022Lisavetka\u2022", 75369, 365835338, "Yes", "ru", ""],
      ["Goodnes", 308347, 1820507378, "Yes", "en", ""],
      ["AK \u0427\u0430\u043f\u0430\u0439", 101490, 543000000, "Yes", "ru", ""],
      ["~Roha~", 114593, 461643456, "Yes", "de", ""],
      ["AK 47", 73494, 344708205, "No", "en", ""],
      ["Spoilage", 77308, 323964474, "Yes", "ru", ""],
      ["UNDEAD", 58828, 311526426, "Yes", "en", ""],
      ["JamboJango", 76303, 287066340, "Yes", "ru", ""],
      ["\u0422\u0438\u0445\u0438\u043958", 83308, 354068001, "Yes", "ru", "backup"],
      ["Take Ur Shin", 74425, 340929106, "Yes", "en", "backup"]
    ]
  },
  {
    "id": "team-5",
    "name": "Team 5",
    "color": "blue",
    "fightTime": "+14",
    "players": [
      ["Neutrino10", 64522, 209411485, "Yes", "en", "lock"],
      ["\u0452\u0e22\u0e20t\u0454\u0433 \ua018iller.", 64409, 404000000, "Yes", "ar", ""],
      ["DvD18", 65916, 388965483, "Yes", "en", ""],
      ["Dizz.", 81258, 770890992, "Yes", "en", ""],
      ["Dr Zubbs", 85110, 614033123, "Yes", "en", ""],
      ["Ligmaballs@", 70920, 437774248, "Yes", "en", ""],
      ["MIAOUU", 66819, 437801457, "Yes", "fr", ""],
      ["Footloos", 84112, 408996654, "Yes", "en", ""],
      ["old man war", 66755, 342678451, "Yes", "en", ""],
      ["Arsenal", 61733, 251748286, "Yes", "ru", ""],
      ["\u0421\u043e\u0431\u043e\u0420", 62741, 434184918, "Yes", "ru", "backup"],
      ["lillybet", 84835, 352947952, "Yes", "en", "backup"]
    ]
  },
  {
    "id": "team-6",
    "name": "Team 6",
    "color": "coral",
    "fightTime": "+14",
    "players": [
      ["RedBull#2", 76184, 581075581, "Yes", "es", "lock"],
      ["ylli90", 55311, 317681584, "Yes", "en", ""],
      ["WAEL", 34582, 214945294, "Yes", "en", ""],
      ["Loppu", 48080, 369000000, "Yes", "id", ""],
      ["Surtii", 50601, 332242203, "Yes", "en", ""],
      ["Mooooo", 52664, 266071533, "Yes", "en", ""],
      ["terribile ivan", 47296, 389651317, "Yes", "pt", ""],
      ["MarcMCrack", 31561, 228300718, "Yes", "es", ""],
      ["\u196b\u1b61unny\u0fd0 )", 41487, 203366343, "No", "es", ""],
      ["ZEROk*", 40807, 186692749, "Yes", "es", ""],
      ["Neo 1.1", 41048, 287398241, "Yes", "es", "backup"],
      ["Humera", 42693, 146061661, "Yes", "ru", "backup"]
    ]
  }
];
      const allInitialTeams = initialTeams;
      const enrichment = {};
      const enrichmentAliases = {};

      // ── schema / persistence ──────────────────────────────────────────
      const schemaVersion = 2;
      const rosterRevision = 3;
      const storageKey = "all-star-boh-mapper-state-v50";
      const expectedInventoryCount = 72;

      // ── canonical-pool structures ──────────────────────────────────────
      const stableIdByInitialSlot = new Map();
      const stableIdByReserveSlot = new Map();
      const canonicalInitialById = new Map();
      const initialIdsByPower = new Map();
      const initialIdsByName = new Map();

      const unmappedWatchPlayers = [];
      const rankWatchPlayers = [];
      const preferred = [];

      const languageOverrides = {
        "AMG-63": "de",
        "Sarafino": "de",
        "~Roha~": "de",
        "imRyker": "de",
      };

      const legacyScoreOverridesByPower = new Map();
      const powerBreakdownsByPower = new Map();
      const commitmentOverridesByPower = new Map([]);
      const rosterNameFixesByPower = new Map([]);
      const canonicalRosterName = (power, name) => rosterNameFixesByPower.get(Number(power)) || name;

      const defaultCommandOverrides = {
        "team-1": { leaderPower: 1093060662, coleaderPowers: [340000000, 265019439] },
        "team-2": { leaderPower: 284617358, coleaderPowers: [602384465, 273313026] },
        "team-3": { leaderPower: 640304873, coleaderPowers: [456668761, 418815337] },
        "team-4": { leaderPower: 283929597, coleaderPowers: [400000000, 365835338] },
        "team-5": { leaderPower: 209411485, coleaderPowers: [404000000, 388965483] },
        "team-6": { leaderPower: 581075581, coleaderPowers: [317681584, 214945294] },
      };
      const defaultTeamMemberPowers = {};
      const defaultBuddyPowerGroups = [];
      const defaultTierConfig = { tier1Count: 4, tier2Count: 1, tier3Count: 1 };
      const defaultBenchedPowers = [];
      const top4InPowers = [];
      const top4OutPowers = [];

      const preferredSoftLeaderNames = new Set();
      const preferredSoftColeaderNames = new Set();

      seedStableIds();

      const top4InIds = top4InPowers.map((power) => resolveInitialPower(power, "Tier1-in rule"));
      const top4OutIds = top4OutPowers.map((power) => resolveInitialPower(power, "Tier1-out rule"));
      const defaultBenchedIds = [];
      const defaultCommandOverridesById = resolveDefaultCommandOverrides();

      let commandOverrides = cloneCommandOverrides(defaultCommandOverridesById);
      let disabledOverrideRules = new Set();
      let tierConfig = { ...defaultTierConfig };
      let solverConflicts = [];
      let scoreUndoSnapshot = null;
      let manualSwapSelectionId = "";
      let reserveSwapSourceId = "";
      let activePopoverPlayerId = "";
      let rolePlanTeamId = "";
      let rolePlanReturnFocus = null;
      const vtsTeamLabels = {
        "team-1": "V5S · VTS5",
        "team-2": "V3S · VTS3",
        "team-3": "V1S · VTS1",
        "team-4": "V4S · VTS4",
        "team-5": "V5S · VTS5",
        "team-6": "V6S · VTS6",
      };
      const displayTeamName = (team) => `${vtsTeamLabels[team.id] || "VTS"} (${team.name})`;
      Object.assign(vtsTeamLabels, {
        "team-1": "V1S - VTS1", "team-2": "V2S - VTS2", "team-3": "V3S - VTS3",
        "team-4": "V4S - VTS4", "team-5": "V5S - VTS5", "team-6": "V6S - VTS6",
      });
      const teamIdentities = {
        "team-1": {
          label: "Team 1 · Wolves",
          shortName: "Wolves",
          icon: ASSET_BASE + "boh-team-icons/team-1-wolves.png",
          accent: "#18a8bc",
        },
        "team-2": {
          label: "Team 2 · Tigers",
          shortName: "Tigers",
          icon: ASSET_BASE + "boh-team-icons/team-2-tigers.png",
          accent: "#7b4bd1",
        },
        "team-3": {
          label: "Team 3 · Falcons",
          shortName: "Falcons",
          icon: ASSET_BASE + "boh-team-icons/team-3-falcons.png",
          accent: "#4269d5",
        },
        "team-4": {
          label: "Team 4 · Phoenix",
          shortName: "Phoenix",
          icon: ASSET_BASE + "boh-team-icons/team-4-phoenix.png",
          accent: "#ef4d2f",
        },
        "team-5": {
          label: "Team 5 · Bulls",
          shortName: "Bulls",
          icon: ASSET_BASE + "boh-team-icons/team-5-bulls.png",
          accent: "#d99a09",
        },
        "team-6": {
          label: "Team 6 · Lions",
          shortName: "Lions",
          icon: ASSET_BASE + "boh-team-icons/team-6-lions.png",
          accent: "#d8472f",
        },
      };
      // Official Battle of Honor mechanics (riseofcastles.net). Drives the timeline band,
// the teleport ledger row, and the crystal row on the role-plan sheet.
      const PLAN_ICON_PATHS = {
        teleport: ASSET_BASE + "boh-plan-assets/teleport-scroll.png",
        crystal: ASSET_BASE + "boh-plan-assets/sacred-crystal-mine.png",
      };
      function planAssetIcon(kind, size = 28, label = "") {
        const src = PLAN_ICON_PATHS[kind] || PLAN_ICON_PATHS.teleport;
        return '<img class="plan-icon-img" src="' + src + '" width="' + size + '" height="' + size + '" alt="' + escapeAttribute(label) + '" />';
      }
      const PLAN_ICONS = {
        teleport: planAssetIcon("teleport", 20, "Teleport"),
        crystal: planAssetIcon("crystal", 20, "Crystals"),
      };
      // Configurable per-player Battlefield Skills. Shared alliance teleports remain separate.
      const battlefieldSkillCatalog = Object.freeze([
        Object.freeze({ id: "battlefield-teleport", label: "Battlefield Teleport", battleMeritCost: 1000, effect: "Adds one personal battlefield teleport." }),
        Object.freeze({ id: "emergency-treatment", label: "Emergency Treatment", battleMeritCost: 1000, effect: null }),
        Object.freeze({ id: "rapid-freeze", label: "Rapid Freeze", battleMeritCost: 3000, effect: null }),
        Object.freeze({ id: "meteor-fall", label: "Meteor Fall", battleMeritCost: 6000, effect: null }),
      ]);
      const battlefieldMeritConversionRate = null;
      const provisionalBuildingBuffs = Object.freeze({ exactStructureMapping: null, known: ["march-speed", "occupation-speed", "four-march-queues"] });

      // What unlocks when, and the shared-alliance teleport economy per phase.
      const eventMilestones = [
        { time: "0-5 Minutes", unlocks: "Stronghold · Watch Post · Command Center open", teleport: "Alliance starts with 5 shared teleports. First Command Center capture = +5.", teleportTag: "Hold teleports" },
        { time: "5-10 Minutes", unlocks: "Hospital · Armory · Fortress of Honor unlock", teleport: "Occupied Command Center generates +1 teleport every 5 min. Repeat capture = +2.", teleportTag: "Bank +1 / 5 min" },
        { time: "10-15 Minutes", unlocks: "Fortress of Honor pays large periodic Alliance Points", teleport: "Spend teleports to contest Fortress of Honor. You may only teleport into your own territory.", teleportTag: "Spend on FoH" },
        { time: "15-30 Minutes", unlocks: "Sanctuary opens and spawns the Divine Rune", teleport: "Reserve remaining teleports for Rune escort and Relay defense.", teleportTag: "Reserve for Rune" },
        { time: "30-60 Minutes", unlocks: "Editable late-match leadership phase", teleport: "Use the shared alliance pool only on the active leadership call.", teleportTag: "Leadership call" },
      ];

      // Pulls the teleport instruction out of the generic note line and badges it, so a
      // movement order is never buried in small grey text.
      function planNoteMarkup(note, locale) {
        const text = localizedStageText(note, locale) || "";
        if (!text) return "";
        const isTeleport = /teleport|телепорт|传送|teleporte|t\u00e9l\u00e9port/i.test(text);
        const holding = /^\s*no teleport/i.test(text);
        const cls = isTeleport ? (holding ? "note-hold" : "note-tp") : "";
        const icon = isTeleport ? PLAN_ICONS.teleport : "";
        return '<span class="plan-note ' + cls + '">' + icon + escapeHtml(text) + '</span>';
      }

      const stage1Flow = [
        {
          time: "0-5 Minutes",
          rows: {
            1: { stageRole: "Offensive Team", l1: "Capture & Defend Our Command Center [CC1]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            2: { stageRole: "Offensive Team", l1: "Capture & Defend Our Bot Outposts [OP1]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            3: { stageRole: "Offensive Team", l1: "Capture Enemy Command Center [CC2]", l2: "Gather Crystals - T1s", note: "No Teleport" },
            4: { stageRole: "Rune Team", l1: "Capture Enemy Outpost [OP2]", l2: "Gather Crystals - T1s", note: "No Teleport" },
            5: { stageRole: "Rune Team", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "No Teleport" },
            6: { stageRole: "Rune Team", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "No Teleport" },
            7: { stageRole: "Defensive Team - Top", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map" },
            8: { stageRole: "Defensive Team - Top", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map" },
            9: { stageRole: "Defensive Team - Top", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map" },
            10: { stageRole: "Defensive Team - Bot", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map" },
            11: { stageRole: "Defensive Team - Bot", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map" },
            12: { stageRole: "Defensive Team - Bot", l1: "Build Towers - T1s & Speed Heroes", l2: "Gather Crystals - T1s", note: "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map" },
          },
        },
        {
          time: "5-10 Minutes",
          rows: {
            1: { stageRole: "Offensive Team", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Capture & Defend Our Command Center [CC1]", note: "No Teleport" },
            2: { stageRole: "Offensive Team", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Capture & Defend Our Bot Outposts [OP1]", note: "No Teleport" },
            3: { stageRole: "Rune Team", l1: "Capture & Defend Our Hospital [H1]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            4: { stageRole: "Rune Team", l1: "Capture & Defend Our Arsenal [A1]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            5: { stageRole: "Joker Team", l1: "Attack Enemy Towers", l2: "Build Towers - T1s & Speed Heroes", note: "Teleport to Relay1 [RP1] - Tower 5 [T5]" },
            6: { stageRole: "Joker Team", l1: "Attack Enemy Towers", l2: "Build Towers - T1s & Speed Heroes", note: "Teleport to Relay1 [RP1] - Tower 5 [T5]" },
            7: { stageRole: "Defensive Team - Top", l1: "Attack Enemy Arsenal [A2]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            8: { stageRole: "Defensive Team - Top", l1: "Capture Enemy Hospital [H2]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            9: { stageRole: "Defensive Team - Bot", l1: "Capture Enemy Command Center [CC2]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
            10: { stageRole: "Defensive Team - Bot", l1: "Capture Enemy Outpost [OP2]", l2: "Build Towers - T1s & Speed Heroes", note: "No Teleport" },
          },
        },
        {
          time: "10-15 Minutes",
          rows: {
            1: { stageRole: "Offensive Team", l1: "Build Towers - T9s", l2: "Attack Enemy Towers / Enemy Castles", note: "Teleport to Relay2 [RP2] - Tower 7 [T7]" },
            2: { stageRole: "Offensive Team", l1: "Build Towers - T9s", l2: "Attack Enemy Towers / Enemy Castles", note: "Teleport to Relay2 [RP2] - Tower 7 [T7]" },
            3: { stageRole: "Rune Team", l1: "Build Towers - T9s", l2: "Attack Enemy Towers / Enemy Castles", note: "Teleport to Relay2 [RP2] - Tower 7 [T7]" },
            4: { stageRole: "Rune Team", l1: "Build Towers - T9s", l2: "Attack Enemy Towers / Enemy Castles", note: "Teleport to Relay2 [RP2] - Tower 7 [T7]" },
            5: { stageRole: "Joker Team", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Build Towers - T9s", note: "No Teleport" },
            6: { stageRole: "Joker Team", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Build Towers - T9s", note: "No Teleport" },
            7: { stageRole: "Defensive Team - Top", l1: "Capture & Defend Our Command Center [CC1]", l2: "Capture Enemy Command Center [CC2]", note: "No Teleport" },
            8: { stageRole: "Defensive Team - Top", l1: "Capture & Defend Our Bot Outposts [OP1]", l2: "Capture Enemy Outpost [OP2]", note: "No Teleport" },
            9: { stageRole: "Defensive Team - Bot", l1: "Capture & Defend Our Hospital [H1]", l2: "Attack Enemy Arsenal [A2]", note: "No Teleport" },
            10: { stageRole: "Defensive Team - Bot", l1: "Capture & Defend Our Arsenal [A1]", l2: "Capture Enemy Hospital [H2]", note: "No Teleport" },
          },
        },
        {
          time: "15-30 Minutes",
          rows: {
            1: { stageRole: "Offensive Team", l1: "Protect Rune at Relay (or attack enemy Rune path)", l2: "Protect Rune at Relay (or attack enemy Rune path)", note: "Teleport to Center Building [S] - Tower 8/9 [T8/T9]" },
            2: { stageRole: "Offensive Team", l1: "Protect Rune at Relay (or attack enemy Rune path)", l2: "Protect Rune at Relay (or attack enemy Rune path)", note: "Teleport to Center Building [S] - Tower 8/9 [T8/T9]" },
            3: { stageRole: "Rune Team", l1: "Protect Rune at Relay (Garrison/Defend Rune)", l2: "TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes", note: "No Teleport" },
            4: { stageRole: "Rune Team", l1: "Protect Rune at Relay (Garrison/Defend Rune)", l2: "TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes", note: "No Teleport" },
            5: { stageRole: "Joker Team", l1: "Protect Rune at Relay (Garrison/Defend Rune)", l2: "Attack Enemy Towers", note: "No Teleport" },
            6: { stageRole: "Joker Team", l1: "Protect Rune at Relay (Garrison/Defend Rune)", l2: "Attack Enemy Towers", note: "No Teleport" },
            7: { stageRole: "Defensive Team - Top", l1: "Protect Rune at Relay (Reinforce as needed)", l2: "Capture & Defend Our Command Center [CC1]", note: "No Teleport" },
            8: { stageRole: "Defensive Team - Top", l1: "Protect Rune at Relay (Reinforce as needed)", l2: "Capture & Defend Our Bot Outposts [OP1]", note: "No Teleport" },
            9: { stageRole: "Defensive Team - Bot", l1: "Protect Rune at Relay (Reinforce as needed)", l2: "Capture & Defend Our Hospital [H1]", note: "No Teleport" },
            10: { stageRole: "Defensive Team - Bot", l1: "Protect Rune at Relay (Reinforce as needed)", l2: "Capture & Defend Our Arsenal [A1]", note: "No Teleport" },
          },
        },
      ];
      stage1Flow.push({ time: "30-60 Minutes", rows: structuredClone(stage1Flow[3].rows) });
      const titleRoles = {
        kills: {
          label: "Kills Player",
          badge: "Kills",
          description: "Optional title push. Team supports this player in maximizing kill score without breaking the match plan.",
        },
        tower: {
          label: "Tower Destroyer",
          badge: "Tower",
          description: "Focuses enemy towers to slow their progress and compete for the tower destruction title.",
        },
        escort: {
          label: "Escort Player",
          badge: "Escort",
          description: "Carries the rune through the match and plays for the escort score title.",
        },
        gathering: {
          label: "Gathering Player",
          badge: "Gather",
          description: "Spends roughly 75% of the match gathering to compete for the gathering title.",
        },
        tainted: {
          label: "Tainted Touch Champion",
          badge: "Tainted",
          description: "Special ability title role if BoH v2 mechanics go live and the team commits to that objective.",
        },
      };
      const planRoles = {
        offensive: {
          label: "Offensive",
          badge: "Offense",
          className: "plan-offensive",
          capacity: 3,
          description: "Castle-pressure group. Takes command centers and outposts early, then shifts into tower pressure and rune protection.",
          phases: [
            {
              time: "0-5",
              note: "No teleport.",
              slots: [
                { name: "Bot CC/OP", l1: "Capture and defend our Bot Command Center [CC2]", l2: "Capture and defend our Bot Outpost [OP2]" },
                { name: "Top CC/OP", l1: "Capture and defend our Top Command Center [CC1]", l2: "Capture and defend our Top Outpost [OP1]" },
                { name: "Enemy Bot", l1: "Capture enemy Bot Command Center [CC4]", l2: "Capture enemy Bot Outpost [OP4]" },
                { name: "Enemy Top", l1: "Capture enemy Top Command Center [CC3]", l2: "Capture enemy Top Outpost [OP3]" },
              ],
            },
            {
              time: "5-10",
              note: "No teleport.",
              slots: [
                { name: "Bot CC/OP", l1: "Hold our Bot Command Center [CC2]", l2: "Hold our Bot Outpost [OP2]" },
                { name: "Top CC/OP", l1: "Hold our Top Command Center [CC1]", l2: "Hold our Top Outpost [OP1]" },
                { name: "Enemy Bot", l1: "Keep enemy Bot Command Center [CC4] pressured", l2: "Keep enemy Bot Outpost [OP4] pressured" },
                { name: "Enemy Top", l1: "Keep enemy Top Command Center [CC3] pressured", l2: "Keep enemy Top Outpost [OP3] pressured" },
              ],
            },
            {
              time: "10-15",
              note: "Teleport to Relay2 [RP2] / Tower 6.",
              slots: [
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
              ],
            },
            {
              time: "15-30",
              note: "Teleport to Center Tower 8 [T8].",
              slots: [
                { name: "Rune shield", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Protect rune at relay, or attack the enemy rune path" },
                { name: "Rune shield", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Protect rune at relay, or attack the enemy rune path" },
                { name: "Rune shield", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Protect rune at relay, or attack the enemy rune path" },
                { name: "Rune shield", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Protect rune at relay, or attack the enemy rune path" },
              ],
            },
          ],
        },
        rune: {
          label: "Rune",
          badge: "Rune",
          className: "plan-rune",
          capacity: 3,
          description: "Rune relay group. Opens with fast towers and crystal economy, secures Fortresses of Honor, then becomes rune runner/support.",
          phases: [
            {
              time: "0-5",
              note: "No teleport.",
              slots: [
                { name: "Speed towers", l1: "Build towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Tower build", l1: "Build towers with T1s", l2: "Gather crystals with T1s" },
                { name: "Tower build", l1: "Build towers with T1s", l2: "Gather crystals with T1s" },
              ],
            },
            {
              time: "5-10",
              note: "No teleport.",
              slots: [
                { name: "Top FoH", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Secure TOP Fortress of Honor [FH1]" },
                { name: "Bot FoH", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Secure BOT Fortress of Honor [FH2]" },
                { name: "Enemy hospital", l1: "Capture enemy Hospital [H2]", l2: "Build center towers with T1s and speed heroes" },
              ],
            },
            {
              time: "10-15",
              note: "Teleport to Relay1 [RP1] / Tower 5 [T5].",
              slots: [
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
                { name: "T9 push", l1: "Build towers with T9s", l2: "Attack enemy towers / enemy castles" },
              ],
            },
            {
              time: "15-30",
              note: "No teleport.",
              slots: [
                { name: "Relay guard", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Protect rune at relay, or attack the enemy rune path" },
                { name: "Primary runner", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Take the rune with T1s and speed heroes" },
                { name: "Secondary runner", l1: "Protect rune at relay, or attack the enemy rune path", l2: "Backup rune carry with T1s and speed heroes" },
              ],
            },
          ],
        },
        top: {
          label: "Top Side",
          badge: "Top",
          className: "plan-top",
          capacity: 3,
          description: "Top-side building group. Builds early, teleports opposite top side at 5-10, then defends or pressures the top lane.",
          phases: [
            {
              time: "0-5",
              note: "No teleport.",
              slots: [
                { name: "Speed towers", l1: "Build towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Speed towers", l1: "Build towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Tower build", l1: "Build towers with T1s", l2: "Gather crystals with T1s" },
                { name: "Tower build", l1: "Build towers with T1s", l2: "Gather crystals with T1s" },
              ],
            },
            {
              time: "5-10",
              note: "Teleport to Tower 3 [T3], opposite top map side.",
              slots: [
                { name: "Hospital hold", l1: "Capture and defend our Hospital [H1]", l2: "Build center towers with T1s and speed heroes" },
                { name: "Enemy arsenal", l1: "Capture enemy Arsenal [A2]", l2: "Build center towers with T1s and speed heroes" },
                { name: "Top towers", l1: "Build top towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Top towers", l1: "Build top towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
              ],
            },
            {
              time: "10-15",
              note: "No teleport.",
              slots: [
                { name: "Top defense", l1: "Defend our TOP buildings", l2: "Build top towers with T1s and speed heroes" },
                { name: "Top defense", l1: "Defend our TOP buildings", l2: "Build top towers with T1s and speed heroes" },
                { name: "Top attack", l1: "Attack enemy TOP buildings with T1s and speed heroes", l2: "Build top towers with T1s and speed heroes" },
                { name: "Top attack", l1: "Attack enemy TOP buildings with T1s and speed heroes", l2: "Build top towers with T1s and speed heroes" },
              ],
            },
            {
              time: "15-30",
              note: "No teleport.",
              slots: [
                { name: "Top FoH hold", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Secure our TOP buildings" },
                { name: "Backline hit", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Attack enemy backline towers with T9s and speed heroes" },
                { name: "Top pressure", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Attack enemy TOP buildings with T1s and speed heroes" },
                { name: "Top pressure", l1: "Secure TOP Fortress of Honor [FH1]", l2: "Attack enemy TOP buildings with T1s and speed heroes" },
              ],
            },
          ],
        },
        bottom: {
          label: "Bottom Side",
          badge: "Bottom",
          className: "plan-bottom",
          capacity: 3,
          description: "Bottom-side building group. Mirrors top side with bottom-lane objectives, Arsenal/Hospital coverage, and late FoH control.",
          phases: [
            {
              time: "0-5",
              note: "No teleport.",
              slots: [
                { name: "Speed towers", l1: "Build towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Speed towers", l1: "Build towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Tower build", l1: "Build towers with T1s", l2: "Gather crystals with T1s" },
                { name: "Tower build", l1: "Build towers with T1s", l2: "Gather crystals with T1s" },
              ],
            },
            {
              time: "5-10",
              note: "Teleport to Tower 3 [T3], opposite bottom map side.",
              slots: [
                { name: "Arsenal hold", l1: "Capture and defend our Arsenal [A1]", l2: "Build center towers with T1s and speed heroes" },
                { name: "Enemy hospital", l1: "Capture enemy Hospital [H2]", l2: "Build center towers with T1s and speed heroes" },
                { name: "Bot towers", l1: "Build bot towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
                { name: "Bot towers", l1: "Build bot towers with T1s and speed heroes", l2: "Gather crystals with T1s" },
              ],
            },
            {
              time: "10-15",
              note: "No teleport.",
              slots: [
                { name: "Bot defense", l1: "Defend our BOT buildings", l2: "Build bot towers with T1s and speed heroes" },
                { name: "Bot defense", l1: "Defend our BOT buildings", l2: "Build bot towers with T1s and speed heroes" },
                { name: "Bot attack", l1: "Attack enemy BOT buildings with T1s and speed heroes", l2: "Build bot towers with T1s and speed heroes" },
                { name: "Bot attack", l1: "Attack enemy BOT buildings with T1s and speed heroes", l2: "Build bot towers with T1s and speed heroes" },
              ],
            },
            {
              time: "15-30",
              note: "No teleport.",
              slots: [
                { name: "Bot FoH hold", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Secure our BOT buildings" },
                { name: "Backline hit", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Attack enemy backline towers with T9s and speed heroes" },
                { name: "Bot pressure", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Attack enemy BOT buildings with T1s and speed heroes" },
                { name: "Bot pressure", l1: "Secure BOT Fortress of Honor [FH2]", l2: "Attack enemy BOT buildings with T1s and speed heroes" },
              ],
            },
          ],
        },
        flexible: {
          label: "Flexible",
          badge: "Flex",
          className: "",
          capacity: 0,
          description: "No fixed playbook. Assign Offensive, Rune, Top, or Bottom when this player is committed to a lane.",
          phases: [],
        },
      };
      const titleRoleOptions = Object.entries(titleRoles);
      const planRoleOptions = Object.entries(planRoles);
      const scoreRankRoleMap = {
        1: "offensive",
        2: "offensive",
        8: "offensive",
        3: "top",
        5: "top",
        12: "top",
        4: "bottom",
        6: "bottom",
        11: "bottom",
        7: "rune",
        9: "rune",
        10: "rune",
      };
      const uiCopy = {
        en: {
          appTitle: 'All-Star BoH - Team Command', appSubtitle: 'Balance formations, assign command roles, and publish battle-ready plans.',
          viewList: 'Team List', viewBoard: 'Board', viewPlans: 'Team Plans',
          reviewSwaps: 'Review swaps', plannerTools: 'Planner tools',
          applyBest: 'Apply best', rebalance: 'Rebalance unlocked',
          importCsv: 'Import CSV', undo: 'Undo', exportJson: 'Export JSON',
          restoreJson: 'Restore JSON', saveView: 'Save Exact View', loadView: 'Load Exact View',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG all',
          moveTeamLeft: '← Team', moveTeamRight: 'Team →', reset: 'Reset',
          checkingBalance: 'Checking team balance…', rulesUpdate: 'Rules and constraints update after every move.',
          viewChecks: 'View detailed balancing checks',
          benchTitle: 'Bench / Backup', benchDesc: 'Unassigned players remain available for a reserve swap.',
          controls: 'Controls', benchedPlayers: 'Benched players', overrides: 'Overrides',
          adjustPlayer: 'Adjust selected player', rolePlaybook: 'Role playbook',
          swapSuggestions: 'Swap suggestions', lowerTier: 'Lower-tier draft',
          rankWatch: 'Ranks 49–59 watch', unmappedWatch: 'Unmapped watch',
          searchLang: 'Search and language', findCastle: 'Find castle',
          searchPlaceholder: 'Search names, badges, languages', languageGroup: 'Language group',
          prefNotes: 'Preferred teammate notes',
          planTitle: 'All-Star BoH - Team Plans', planSubtitle: 'Score-rank assignments with timeline and Legion duties.',
          shareExport: 'Export', slideshow: 'Slideshow', fullGrid: 'Full Grid',
          compactGrid: 'Compact grid', downloadPng: 'Download PNG',
          exportAllPlans: 'Export all team plans', close: 'Close',
          myOrders: 'My Orders', teamPlan: 'Team Plan', mapBriefing: 'Map Briefing',
          skipToContent: 'Skip to content',
          subEntersReplacing: "Backup — enters {time}, replacing {name}",
          subEnters: "Backup — enters {time}",
          subOutReplacedBy: "Out from {time} — replaced by {name}",
          subOut: "Out from {time}",
          subActiveNow: "In play — covering {name}",
          subOutTitle: "Substituted off",
          subOutBody: "{name} took over your slot at {time}. You are off the battlefield for the rest of the match.",
          subOutBodyPlain: "You left the battlefield at {time}.",
          subWaitTitle: "Not in play yet",
          subWaitBody: "You come on at {time}, taking over from {name}. Stay off the battlefield until then.",
          subWaitBodyPlain: "You come on at {time}. No replacement target is set yet — ask your leader.",
        },
        ru: {
          appTitle: 'All-Star BoH - Командование', appSubtitle: 'Балансируйте составы, назначайте роли и публикуйте боевые планы.',
          viewList: 'Список команд', viewBoard: 'Доска', viewPlans: 'Планы команд',
          reviewSwaps: 'Проверить обмены', plannerTools: 'Инструменты',
          applyBest: 'Применить лучший', rebalance: 'Перебалансировать',
          importCsv: 'Импорт CSV', undo: 'Отменить', exportJson: 'Экспорт JSON',
          restoreJson: 'Восстановить JSON', saveView: 'Сохранить вид', loadView: 'Загрузить вид',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG все',
          moveTeamLeft: '← Команда', moveTeamRight: 'Команда →', reset: 'Сброс',
          checkingBalance: 'Проверка баланса…', rulesUpdate: 'Правила обновляются после каждого действия.',
          viewChecks: 'Подробные проверки баланса',
          benchTitle: 'Скамейка / Резерв', benchDesc: 'Неназначенные игроки доступны для замены.',
          controls: 'Управление', benchedPlayers: 'Игроки на скамейке', overrides: 'Переопределения',
          adjustPlayer: 'Настроить игрока', rolePlaybook: 'Справочник ролей',
          swapSuggestions: 'Предложения обменов', lowerTier: 'Черновик нижних тиров',
          rankWatch: 'Наблюдение рангов 49–59', unmappedWatch: 'Несопоставленные',
          searchLang: 'Поиск и язык', findCastle: 'Найти замок',
          searchPlaceholder: 'Поиск по именам, значкам, языкам', languageGroup: 'Языковая группа',
          prefNotes: 'Предпочтения тиммейтов',
          planTitle: 'All-Star BoH - Планы команд', planSubtitle: 'Назначения по рангу с таймлайном и задачами легионов.',
          shareExport: 'Поделиться / Экспорт', slideshow: 'Слайдшоу', fullGrid: 'Полная сетка',
          compactGrid: 'Компактная сетка', downloadPng: 'Скачать PNG',
          exportAllPlans: 'Экспорт всех планов', close: 'Закрыть',
          myOrders: 'Мои приказы', teamPlan: 'План команды', mapBriefing: 'Брифинг карты',
          skipToContent: 'Перейти к содержимому',
          subEntersReplacing: "Запасной — входит в {time}, заменяет {name}",
          subEnters: "Запасной — входит в {time}",
          subOutReplacedBy: "Вышел с {time} — заменён на {name}",
          subOut: "Вышел с {time}",
          subActiveNow: "В бою — прикрывает {name}",
          subOutTitle: "Заменён",
          subOutBody: "{name} занял ваше место в {time}. Вы вне поля боя до конца матча.",
          subOutBodyPlain: "Вы покинули поле боя в {time}.",
          subWaitTitle: "Ещё не в бою",
          subWaitBody: "Вы входите в {time}, заменяя {name}. Не выходите на поле боя до этого.",
          subWaitBodyPlain: "Вы входите в {time}. Цель замены ещё не установлена — спросите лидера.",
        },
        es: {
          appTitle: 'All-Star BoH - Mando de Equipo', appSubtitle: 'Equilibra formaciones, asigna roles y publica planes de batalla.',
          viewList: 'Lista de equipos', viewBoard: 'Tablero', viewPlans: 'Planes de equipo',
          reviewSwaps: 'Revisar cambios', plannerTools: 'Herramientas',
          applyBest: 'Aplicar mejor', rebalance: 'Reequilibrar',
          importCsv: 'Importar CSV', undo: 'Deshacer', exportJson: 'Exportar JSON',
          restoreJson: 'Restaurar JSON', saveView: 'Guardar vista', loadView: 'Cargar vista',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG todo',
          moveTeamLeft: '← Equipo', moveTeamRight: 'Equipo →', reset: 'Reiniciar',
          checkingBalance: 'Comprobando equilibrio…', rulesUpdate: 'Las reglas se actualizan tras cada movimiento.',
          viewChecks: 'Verificaciones de balance detalladas',
          benchTitle: 'Banca / Reserva', benchDesc: 'Jugadores sin asignar disponibles para intercambio.',
          controls: 'Controles', benchedPlayers: 'Jugadores en banca', overrides: 'Anulaciones',
          adjustPlayer: 'Ajustar jugador', rolePlaybook: 'Guía de roles',
          swapSuggestions: 'Sugerencias de cambio', lowerTier: 'Borrador de tier inferior',
          rankWatch: 'Vigilancia rangos 49–59', unmappedWatch: 'Sin mapear',
          searchLang: 'Buscar e idioma', findCastle: 'Buscar castillo',
          searchPlaceholder: 'Buscar nombres, badges, idiomas', languageGroup: 'Grupo de idioma',
          prefNotes: 'Notas de compañeros preferidos',
          planTitle: 'All-Star BoH - Planes de Equipo', planSubtitle: 'Asignaciones por rango con línea de tiempo y tareas de Legión.',
          shareExport: 'Compartir / Exportar', slideshow: 'Presentación', fullGrid: 'Cuadrícula completa',
          compactGrid: 'Cuadrícula compacta', downloadPng: 'Descargar PNG',
          exportAllPlans: 'Exportar todos los planes', close: 'Cerrar',
          myOrders: 'Mis órdenes', teamPlan: 'Plan de equipo', mapBriefing: 'Briefing de mapa',
          skipToContent: 'Ir al contenido',
          subEntersReplacing: "Reserva — entra a las {time}, reemplazando a {name}",
          subEnters: "Reserva — entra a las {time}",
          subOutReplacedBy: "Fuera desde {time} — reemplazado por {name}",
          subOut: "Fuera desde {time}",
          subActiveNow: "En juego — cubriendo a {name}",
          subOutTitle: "Sustituido",
          subOutBody: "{name} tomó tu lugar a las {time}. Estás fuera del campo de batalla el resto de la partida.",
          subOutBodyPlain: "Saliste del campo de batalla a las {time}.",
          subWaitTitle: "Aún no en juego",
          subWaitBody: "Entras a las {time}, reemplazando a {name}. No entres al campo hasta entonces.",
          subWaitBodyPlain: "Entras a las {time}. Aún no hay objetivo de reemplazo — pregunta a tu líder.",
        },
        zh: {
          appTitle: 'All-Star BoH - 团队指挥', appSubtitle: '平衡阵容，分配指挥角色，发布战斗计划。',
          viewList: '团队列表', viewBoard: '面板', viewPlans: '团队计划',
          reviewSwaps: '审查交换', plannerTools: '规划工具',
          applyBest: '应用最佳', rebalance: '重新平衡',
          importCsv: '导入CSV', undo: '撤销', exportJson: '导出JSON',
          restoreJson: '恢复JSON', saveView: '保存视图', loadView: '加载视图',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG全部',
          moveTeamLeft: '← 队伍', moveTeamRight: '队伍 →', reset: '重置',
          checkingBalance: '检查平衡中…', rulesUpdate: '规则在每次移动后更新。',
          viewChecks: '查看详细平衡检查',
          benchTitle: '替补 / 后备', benchDesc: '未分配的玩家可用于替补交换。',
          controls: '控制', benchedPlayers: '替补玩家', overrides: '覆盖设置',
          adjustPlayer: '调整玩家', rolePlaybook: '角色手册',
          swapSuggestions: '交换建议', lowerTier: '低层级选秀',
          rankWatch: '排名49-59监视', unmappedWatch: '未映射监视',
          searchLang: '搜索和语言', findCastle: '查找城堡',
          searchPlaceholder: '搜索名字、徽章、语言', languageGroup: '语言组',
          prefNotes: '偏好队友备注',
          planTitle: 'All-Star BoH - 团队计划', planSubtitle: '按分数排名分配，含时间线和军团任务。',
          shareExport: '分享 / 导出', slideshow: '幻灯片', fullGrid: '完整网格',
          compactGrid: '紧凑网格', downloadPng: '下载PNG',
          exportAllPlans: '导出所有团队计划', close: '关闭',
          myOrders: '我的命令', teamPlan: '团队计划', mapBriefing: '地图简报',
          skipToContent: '跳到内容',
          subEntersReplacing: "替补 — 在 {time} 进场，替换 {name}",
          subEnters: "替补 — 在 {time} 进场",
          subOutReplacedBy: "从 {time} 退场 — 被 {name} 替换",
          subOut: "从 {time} 退场",
          subActiveNow: "已参战 — 接替 {name}",
          subOutTitle: "已被替换",
          subOutBody: "{name} 在 {time} 接替了你的位置。你在剩余比赛中离开战场。",
          subOutBodyPlain: "你在 {time} 离开了战场。",
          subWaitTitle: "尚未参战",
          subWaitBody: "你将在 {time} 进场，接替 {name}。在此之前不要进入战场。",
          subWaitBodyPlain: "你将在 {time} 进场。尚未设置替换目标 — 请询问队长。",
        },
        tr: {
          appTitle: 'All-Star BoH - Takım Komutası', appSubtitle: 'Formasyonları dengele, komuta rolleri ata ve savaş planları yayınla.',
          viewList: 'Takım Listesi', viewBoard: 'Pano', viewPlans: 'Takım Planları',
          reviewSwaps: 'Değişimleri incele', plannerTools: 'Planlama araçları',
          applyBest: 'En iyisini uygula', rebalance: 'Yeniden dengele',
          importCsv: 'CSV İçe Aktar', undo: 'Geri Al', exportJson: 'JSON Dışa Aktar',
          restoreJson: 'JSON Geri Yükle', saveView: 'Görünümü Kaydet', loadView: 'Görünümü Yükle',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG tümü',
          moveTeamLeft: '← Takım', moveTeamRight: 'Takım →', reset: 'Sıfırla',
          checkingBalance: 'Denge kontrol ediliyor…', rulesUpdate: 'Kurallar her hareketten sonra güncellenir.',
          viewChecks: 'Detaylı denge kontrollerini görüntüle',
          benchTitle: 'Yedek / Rezerv', benchDesc: 'Atanmamış oyuncular yedek değişimi için hazır.',
          controls: 'Kontroller', benchedPlayers: 'Yedek oyuncular', overrides: 'Geçersiz kılmalar',
          adjustPlayer: 'Oyuncuyu ayarla', rolePlaybook: 'Rol kılavuzu',
          swapSuggestions: 'Değişim önerileri', lowerTier: 'Alt kademe taslağı',
          rankWatch: 'Sıralama 49-59 izleme', unmappedWatch: 'Eşleştirilmemiş izleme',
          searchLang: 'Arama ve dil', findCastle: 'Kale bul',
          searchPlaceholder: 'İsim, rozet, dil ara', languageGroup: 'Dil grubu',
          prefNotes: 'Tercih edilen takım arkadaşı notları',
          planTitle: 'All-Star BoH - Takım Planları', planSubtitle: 'Zaman çizelgesi ve Lejyon görevleriyle puan-sıralama atamaları.',
          shareExport: 'Paylaş / Dışa Aktar', slideshow: 'Slayt gösterisi', fullGrid: 'Tam ızgara',
          compactGrid: 'Kompakt ızgara', downloadPng: 'PNG İndir',
          exportAllPlans: 'Tüm planları dışa aktar', close: 'Kapat',
          myOrders: 'Emirlerim', teamPlan: 'Takım Planı', mapBriefing: 'Harita Brifingi',
          skipToContent: 'İçeriğe atla',
          subEntersReplacing: "Yedek — {time}'de giriyor, {name} yerine geçiyor",
          subEnters: "Yedek — {time}'de giriyor",
          subOutReplacedBy: "{time}'den beri dışarıda — {name} tarafından değiştirildi",
          subOut: "{time}'den beri dışarıda",
          subActiveNow: "Oyunda — {name}'i koruyor",
          subOutTitle: "Oyun dışı",
          subOutBody: "{name} {time}'de yerinizi aldı. Maçın geri kalanında savaş alanındasınız.",
          subOutBodyPlain: "{time}'de savaş alanını terk ettiniz.",
          subWaitTitle: "Henüz oyunda değil",
          subWaitBody: "{time}'de giriyorsunuz, {name}'in yerine geçiyorsunuz. O zamana kadar savaş alanına girmeyin.",
          subWaitBodyPlain: "{time}'de giriyorsunuz. Henüz değiştirme hedefi yok — liderinize sorun.",
        },
        de: {
          appTitle: 'All-Star BoH - Teamkommando', appSubtitle: 'Balanciere Formationen, weise Rollen zu und veröffentliche Kampfpläne.',
          viewList: 'Teamliste', viewBoard: 'Board', viewPlans: 'Teampläne',
          reviewSwaps: 'Tausch prüfen', plannerTools: 'Planer-Tools',
          applyBest: 'Beste anwenden', rebalance: 'Neu balancieren',
          importCsv: 'CSV importieren', undo: 'Rückgängig', exportJson: 'JSON exportieren',
          restoreJson: 'JSON wiederherstellen', saveView: 'Ansicht speichern', loadView: 'Ansicht laden',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG alle',
          moveTeamLeft: '← Team', moveTeamRight: 'Team →', reset: 'Zurücksetzen',
          checkingBalance: 'Balanceprüfung…', rulesUpdate: 'Regeln aktualisieren sich nach jedem Zug.',
          viewChecks: 'Detaillierte Balanceprüfungen anzeigen',
          benchTitle: 'Bank / Reserve', benchDesc: 'Nicht zugewiesene Spieler sind für Reserve-Tausch verfügbar.',
          controls: 'Steuerung', benchedPlayers: 'Spieler auf der Bank', overrides: 'Überschreibungen',
          adjustPlayer: 'Spieler anpassen', rolePlaybook: 'Rollenspielbuch',
          swapSuggestions: 'Tauschvorschläge', lowerTier: 'Niedrigere-Klasse Entwurf',
          rankWatch: 'Ränge 49–59 Beobachtung', unmappedWatch: 'Nicht zugeordnete Beobachtung',
          searchLang: 'Suche und Sprache', findCastle: 'Burg finden',
          searchPlaceholder: 'Namen, Abzeichen, Sprachen suchen', languageGroup: 'Sprachgruppe',
          prefNotes: 'Bevorzugte Mitspieler-Notizen',
          planTitle: 'All-Star BoH - Teampläne', planSubtitle: 'Punkte-Rang-Zuweisungen mit Zeitlinie und Legionsaufgaben.',
          shareExport: 'Teilen / Exportieren', slideshow: 'Diashow', fullGrid: 'Vollständiges Raster',
          compactGrid: 'Kompaktes Raster', downloadPng: 'PNG herunterladen',
          exportAllPlans: 'Alle Teampläne exportieren', close: 'Schliessen',
          myOrders: 'Meine Befehle', teamPlan: 'Teamplan', mapBriefing: 'Karten-Briefing',
          skipToContent: 'Zum Inhalt springen',
          subEntersReplacing: "Ersatz — tritt um {time} ein, ersetzt {name}",
          subEnters: "Ersatz — tritt um {time} ein",
          subOutReplacedBy: "Raus ab {time} — ersetzt durch {name}",
          subOut: "Raus ab {time}",
          subActiveNow: "Im Einsatz — deckt {name}",
          subOutTitle: "Ausgewechselt",
          subOutBody: "{name} hat deinen Platz um {time} übernommen. Du bist für den Rest des Kampfes raus.",
          subOutBodyPlain: "Du hast das Schlachtfeld um {time} verlassen.",
          subWaitTitle: "Noch nicht im Einsatz",
          subWaitBody: "Du trittst um {time} ein und ersetzt {name}. Bleib bis dahin vom Schlachtfeld fern.",
          subWaitBodyPlain: "Du trittst um {time} ein. Noch kein Ersatzziel festgelegt — frag deinen Anführer.",
        },
        fr: {
          appTitle: 'All-Star BoH - Commandement', appSubtitle: 'Équilibrez les formations, assignez les rôles et publiez des plans de bataille.',
          viewList: 'Liste des équipes', viewBoard: 'Tableau', viewPlans: "Plans d'équipe",
          reviewSwaps: "Vérifier les échanges", plannerTools: 'Outils de planification',
          applyBest: 'Appliquer le meilleur', rebalance: 'Rééquilibrer',
          importCsv: 'Importer CSV', undo: 'Annuler', exportJson: 'Exporter JSON',
          restoreJson: 'Restaurer JSON', saveView: 'Sauvegarder la vue', loadView: 'Charger la vue',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG tout',
          moveTeamLeft: '← Équipe', moveTeamRight: 'Équipe →', reset: 'Réinitialiser',
          checkingBalance: "Vérification de l'équilibre…", rulesUpdate: 'Les règles se mettent à jour après chaque mouvement.',
          viewChecks: "Vérifications d'équilibre détaillées",
          benchTitle: 'Banc / Réserve', benchDesc: 'Les joueurs non assignés sont disponibles pour un échange de réserve.',
          controls: 'Commandes', benchedPlayers: 'Joueurs sur le banc', overrides: 'Remplacements',
          adjustPlayer: 'Ajuster le joueur', rolePlaybook: 'Guide des rôles',
          swapSuggestions: "Suggestions d'échange", lowerTier: 'Brouillon de tier inférieur',
          rankWatch: 'Surveillance rangs 49–59', unmappedWatch: 'Non mappés',
          searchLang: 'Recherche et langue', findCastle: 'Trouver un château',
          searchPlaceholder: 'Rechercher noms, badges, langues', languageGroup: 'Groupe de langue',
          prefNotes: 'Notes de coéquipiers préférés',
          planTitle: "All-Star BoH - Plans d'équipe", planSubtitle: 'Assignations par rang avec chronologie et devoirs de Légion.',
          shareExport: 'Partager / Exporter', slideshow: 'Diaporama', fullGrid: 'Grille complète',
          compactGrid: 'Grille compacte', downloadPng: 'Télécharger PNG',
          exportAllPlans: 'Exporter tous les plans', close: 'Fermer',
          myOrders: 'Mes ordres', teamPlan: "Plan d'équipe", mapBriefing: 'Briefing de carte',
          skipToContent: 'Aller au contenu',
          subEntersReplacing: "Remplaçant — entre à {time}, remplace {name}",
          subEnters: "Remplaçant — entre à {time}",
          subOutReplacedBy: "Sorti depuis {time} — remplacé par {name}",
          subOut: "Sorti depuis {time}",
          subActiveNow: "En jeu — couvre {name}",
          subOutTitle: "Remplacé",
          subOutBody: "{name} a pris votre place à {time}. Vous êtes hors du champ de bataille pour le reste de la partie.",
          subOutBodyPlain: "Vous avez quitté le champ de bataille à {time}.",
          subWaitTitle: "Pas encore en jeu",
          subWaitBody: "Vous entrez à {time}, en remplacement de {name}. Restez hors du champ de bataille jusqu'alors.",
          subWaitBodyPlain: "Vous entrez à {time}. Aucune cible de remplacement définie — demandez à votre chef.",
        },
        hr: {
          appTitle: 'All-Star BoH - Zapovjedništvo tima', appSubtitle: 'Uravnotežite formacije, dodijelite zapovjedne uloge i objavite borbene planove.',
          viewList: 'Popis timova', viewBoard: 'Ploča', viewPlans: 'Timski planovi',
          reviewSwaps: 'Pregledaj zamjene', plannerTools: 'Alati za planiranje',
          applyBest: 'Primijeni najbolje', rebalance: 'Ponovno uravnoteži',
          importCsv: 'Uvezi CSV', undo: 'Poništi', exportJson: 'Izvoz JSON',
          restoreJson: 'Vrati JSON', saveView: 'Spremi prikaz', loadView: 'Učitaj prikaz',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG sve',
          moveTeamLeft: '← Tim', moveTeamRight: 'Tim →', reset: 'Resetiraj',
          checkingBalance: 'Provjera ravnoteže…', rulesUpdate: 'Pravila se ažuriraju nakon svakog poteza.',
          viewChecks: 'Prikaži detaljne provjere ravnoteže',
          benchTitle: 'Klupa / Rezerva', benchDesc: 'Nedodijeljeni igrači dostupni za rezervnu zamjenu.',
          controls: 'Kontrole', benchedPlayers: 'Igrači na klupi', overrides: 'Prilagodbe',
          adjustPlayer: 'Prilagodi igrača', rolePlaybook: 'Priručnik uloga',
          swapSuggestions: 'Prijedlozi zamjena', lowerTier: 'Nacrt nižeg ranga',
          rankWatch: 'Praćenje rangova 49-59', unmappedWatch: 'Nepreslikano praćenje',
          searchLang: 'Pretraživanje i jezik', findCastle: 'Pronađi dvorac',
          searchPlaceholder: 'Pretraži imena, značke, jezike', languageGroup: 'Jezična grupa',
          prefNotes: 'Bilješke o preferiranim suigračima',
          planTitle: 'All-Star BoH - Timski planovi', planSubtitle: 'Rangiranje prema bodovima s vremenskom crtom i legijskim zadacima.',
          shareExport: 'Podijeli / Izvezi', slideshow: 'Prezentacija', fullGrid: 'Puna mreža',
          compactGrid: 'Kompaktna mreža', downloadPng: 'Preuzmi PNG',
          exportAllPlans: 'Izvezi sve timske planove', close: 'Zatvori',
          myOrders: 'Moje naredbe', teamPlan: 'Timski plan', mapBriefing: 'Brífing karte',
          skipToContent: 'Preskoči na sadržaj',
          subEntersReplacing: "Zamjena — ulazi u {time}, zamjenjuje {name}",
          subEnters: "Zamjena — ulazi u {time}",
          subOutReplacedBy: "Van od {time} — zamijenjen od {name}",
          subOut: "Van od {time}",
          subActiveNow: "U igri — pokriva {name}",
          subOutTitle: "Zamijenjen",
          subOutBody: "{name} je preuzeo tvoje mjesto u {time}. Nisi na bojnom polju do kraja meča.",
          subOutBodyPlain: "Napustio si bojno polje u {time}.",
          subWaitTitle: "Još nije u igri",
          subWaitBody: "Ulaziš u {time}, zamjenjuješ {name}. Ne ulazi na bojno polje do tada.",
          subWaitBodyPlain: "Ulaziš u {time}. Zamjena još nije postavljena — pitaj vođu.",
        },
        it: {
          appTitle: 'All-Star BoH - Comando Squadra', appSubtitle: 'Bilancia le formazioni, assegna i ruoli di comando e pubblica piani pronti per la battaglia.',
          viewList: 'Elenco squadre', viewBoard: 'Tabellone', viewPlans: 'Piani squadra',
          reviewSwaps: 'Revisiona scambi', plannerTools: 'Strumenti di pianificazione',
          applyBest: 'Applica il meglio', rebalance: 'Riequilibra',
          importCsv: 'Importa CSV', undo: 'Annulla', exportJson: 'Esporta JSON',
          restoreJson: 'Ripristina JSON', saveView: 'Salva vista', loadView: 'Carica vista',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG tutto',
          moveTeamLeft: '← Squadra', moveTeamRight: 'Squadra →', reset: 'Reimposta',
          checkingBalance: 'Controllo equilibrio…', rulesUpdate: 'Le regole si aggiornano dopo ogni mossa.',
          viewChecks: 'Controlli di equilibrio dettagliati',
          benchTitle: 'Panchina / Riserva', benchDesc: 'I giocatori non assegnati sono disponibili per scambio riserva.',
          controls: 'Controlli', benchedPlayers: 'Giocatori in panchina', overrides: 'Sostituzioni',
          adjustPlayer: 'Regola giocatore', rolePlaybook: 'Manuale dei ruoli',
          swapSuggestions: 'Suggerimenti scambio', lowerTier: 'Bozza livello inferiore',
          rankWatch: 'Monitoraggio ranghi 49-59', unmappedWatch: 'Non mappati',
          searchLang: 'Ricerca e lingua', findCastle: 'Trova castello',
          searchPlaceholder: 'Cerca nomi, distintivi, lingue', languageGroup: 'Gruppo lingua',
          prefNotes: 'Note compagni preferiti',
          planTitle: 'All-Star BoH - Piani Squadra', planSubtitle: 'Assegnazioni per punteggio con cronologia e compiti della Legione.',
          shareExport: 'Condividi / Esporta', slideshow: 'Presentazione', fullGrid: 'Griglia completa',
          compactGrid: 'Griglia compatta', downloadPng: 'Scarica PNG',
          exportAllPlans: 'Esporta tutti i piani', close: 'Chiudi',
          myOrders: 'I miei ordini', teamPlan: 'Piano squadra', mapBriefing: 'Briefing mappa',
          skipToContent: 'Salta al contenuto',
          subEntersReplacing: "Riserva — entra alle {time}, sostituisce {name}",
          subEnters: "Riserva — entra alle {time}",
          subOutReplacedBy: "Fuori dalle {time} — sostituito da {name}",
          subOut: "Fuori dalle {time}",
          subActiveNow: "In gioco — copre {name}",
          subOutTitle: "Sostituito",
          subOutBody: "{name} ha preso il tuo posto alle {time}. Sei fuori dal campo di battaglia per il resto della partita.",
          subOutBodyPlain: "Hai lasciato il campo di battaglia alle {time}.",
          subWaitTitle: "Non ancora in gioco",
          subWaitBody: "Entri alle {time}, sostituendo {name}. Non entrare in campo fino ad allora.",
          subWaitBodyPlain: "Entri alle {time}. Nessun obiettivo di sostituzione impostato — chiedi al leader.",
        },
        pt: {
          appTitle: 'All-Star BoH - Comando de Equipe', appSubtitle: 'Equilibre formações, atribua funções e publique planos de batalha.',
          viewList: 'Lista de equipes', viewBoard: 'Painel', viewPlans: 'Planos de equipe',
          reviewSwaps: 'Revisar trocas', plannerTools: 'Ferramentas de planejamento',
          applyBest: 'Aplicar melhor', rebalance: 'Reequilibrar',
          importCsv: 'Importar CSV', undo: 'Desfazer', exportJson: 'Exportar JSON',
          restoreJson: 'Restaurar JSON', saveView: 'Salvar visualização', loadView: 'Carregar visualização',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG tudo',
          moveTeamLeft: '← Equipe', moveTeamRight: 'Equipe →', reset: 'Redefinir',
          checkingBalance: 'Verificando equilíbrio…', rulesUpdate: 'As regras atualizam após cada movimento.',
          viewChecks: 'Verificações de equilíbrio detalhadas',
          benchTitle: 'Banco / Reserva', benchDesc: 'Jogadores não atribuídos disponíveis para troca de reserva.',
          controls: 'Controles', benchedPlayers: 'Jogadores no banco', overrides: 'Substituições',
          adjustPlayer: 'Ajustar jogador', rolePlaybook: 'Guia de funções',
          swapSuggestions: 'Sugestões de troca', lowerTier: 'Rascunho de tier inferior',
          rankWatch: 'Vigilância ranks 49–59', unmappedWatch: 'Não mapeados',
          searchLang: 'Busca e idioma', findCastle: 'Encontrar castelo',
          searchPlaceholder: 'Buscar nomes, emblemas, idiomas', languageGroup: 'Grupo de idioma',
          prefNotes: 'Notas de companheiros preferidos',
          planTitle: 'All-Star BoH - Planos de Equipe', planSubtitle: 'Atribuições por rank com linha do tempo e tarefas de Legião.',
          shareExport: 'Compartilhar / Exportar', slideshow: 'Apresentação', fullGrid: 'Grade completa',
          compactGrid: 'Grade compacta', downloadPng: 'Baixar PNG',
          exportAllPlans: 'Exportar todos os planos', close: 'Fechar',
          myOrders: 'Minhas ordens', teamPlan: 'Plano de equipe', mapBriefing: 'Briefing de mapa',
          skipToContent: 'Ir para o conteúdo',
          subEntersReplacing: "Reserva — entra às {time}, substituindo {name}",
          subEnters: "Reserva — entra às {time}",
          subOutReplacedBy: "Fora desde {time} — substituído por {name}",
          subOut: "Fora desde {time}",
          subActiveNow: "Em jogo — cobrindo {name}",
          subOutTitle: "Substituído",
          subOutBody: "{name} assumiu seu lugar às {time}. Você está fora do campo de batalha pelo resto da partida.",
          subOutBodyPlain: "Você saiu do campo de batalha às {time}.",
          subWaitTitle: "Ainda não em jogo",
          subWaitBody: "Você entra às {time}, substituindo {name}. Não entre no campo até lá.",
          subWaitBodyPlain: "Você entra às {time}. Nenhum alvo de substituição definido — pergunte ao líder.",
        },
        ar: {
          appTitle: 'All-Star BoH - قيادة الفريق', appSubtitle: 'وازن التشكيلات وعيّن الأدوار وانشر خطط المعركة.',
          viewList: 'قائمة الفرق', viewBoard: 'اللوحة', viewPlans: 'خطط الفريق',
          reviewSwaps: 'مراجعة التبديلات', plannerTools: 'أدوات التخطيط',
          applyBest: 'تطبيق الأفضل', rebalance: 'إعادة التوازن',
          importCsv: 'استيراد CSV', undo: 'تراجع', exportJson: 'تصدير JSON',
          restoreJson: 'استعادة JSON', saveView: 'حفظ العرض', loadView: 'تحميل العرض',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG الكل',
          moveTeamLeft: '← فريق', moveTeamRight: 'فريق →', reset: 'إعادة تعيين',
          checkingBalance: 'جارٍ التحقق من التوازن…', rulesUpdate: 'تُحدَّث القواعد بعد كل حركة.',
          viewChecks: 'عرض فحوصات التوازن التفصيلية',
          benchTitle: 'الاحتياطي / البدلاء', benchDesc: 'اللاعبون غير المعينين متاحون للتبديل الاحتياطي.',
          controls: 'عناصر التحكم', benchedPlayers: 'اللاعبون على مقاعد البدلاء', overrides: 'التجاوزات',
          adjustPlayer: 'ضبط اللاعب', rolePlaybook: 'دليل الأدوار',
          swapSuggestions: 'اقتراحات التبديل', lowerTier: 'مسودة الطبقة السفلى',
          rankWatch: 'مراقبة الرتب 49-59', unmappedWatch: 'مراقبة غير المعينة',
          searchLang: 'البحث واللغة', findCastle: 'البحث عن قلعة',
          searchPlaceholder: 'البحث بالأسماء والشارات واللغات', languageGroup: 'مجموعة اللغة',
          prefNotes: 'ملاحظات زملاء الفريق المفضلين',
          planTitle: 'All-Star BoH - خطط الفريق', planSubtitle: 'تعيينات مرتبة حسب النقاط مع جدول زمني ومهام الفيلق.',
          shareExport: 'مشاركة / تصدير', slideshow: 'عرض تقديمي', fullGrid: 'شبكة كاملة',
          compactGrid: 'شبكة مدمجة', downloadPng: 'تحميل PNG',
          exportAllPlans: 'تصدير جميع الخطط', close: 'إغلاق',
          myOrders: 'أوامري', teamPlan: 'خطة الفريق', mapBriefing: 'إحاطة الخريطة',
          skipToContent: 'انتقل إلى المحتوى',
          subEntersReplacing: "احتياطي — يدخل في {time}، ليحل محل {name}",
          subEnters: "احتياطي — يدخل في {time}",
          subOutReplacedBy: "خارج منذ {time} — استبدله {name}",
          subOut: "خارج منذ {time}",
          subActiveNow: "في المعركة — يغطي {name}",
          subOutTitle: "تم استبداله",
          subOutBody: "تولى {name} مكانك في {time}. أنت خارج ساحة المعركة لبقية المباراة.",
          subOutBodyPlain: "غادرت ساحة المعركة في {time}.",
          subWaitTitle: "ليس في المعركة بعد",
          subWaitBody: "تدخل في {time}، لتحل محل {name}. لا تدخل ساحة المعركة حتى ذلك الحين.",
          subWaitBodyPlain: "تدخل في {time}. لم يتم تحديد هدف استبدال بعد — اسأل قائدك.",
        },
        kr: {
          appTitle: 'All-Star BoH - 팀 지휘', appSubtitle: '편성을 균형있게 하고, 지휘 역할을 할당하고, 전투 계획을 게시하세요.',
          viewList: '팀 목록', viewBoard: '보드', viewPlans: '팀 계획',
          reviewSwaps: '교체 검토', plannerTools: '기획 도구',
          applyBest: '최적 적용', rebalance: '재균형',
          importCsv: 'CSV 가져오기', undo: '실행 취소', exportJson: 'JSON 내보내기',
          restoreJson: 'JSON 복원', saveView: '보기 저장', loadView: '보기 로드',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG 전체',
          moveTeamLeft: '← 팀', moveTeamRight: '팀 →', reset: '초기화',
          checkingBalance: '균형 확인 중…', rulesUpdate: '규칙은 모든 이동 후에 업데이트됩니다.',
          viewChecks: '상세 균형 확인 보기',
          benchTitle: '벤치 / 예비', benchDesc: '미배정 플레이어가 예비 교체에 사용 가능합니다.',
          controls: '컨트롤', benchedPlayers: '벤치 플레이어', overrides: '재정의',
          adjustPlayer: '플레이어 조정', rolePlaybook: '역할 핸드북',
          swapSuggestions: '교체 제안', lowerTier: '하위 티어 드래프트',
          rankWatch: '랭크 49-59 감시', unmappedWatch: '미매핑 감시',
          searchLang: '검색 및 언어', findCastle: '성 찾기',
          searchPlaceholder: '이름, 배지, 언어 검색', languageGroup: '언어 그룹',
          prefNotes: '선호 팀원 메모',
          planTitle: 'All-Star BoH - 팀 계획', planSubtitle: '타임라인과 군단 임무가 포함된 점수 순위 할당.',
          shareExport: '공유 / 내보내기', slideshow: '슬라이드쇼', fullGrid: '전체 그리드',
          compactGrid: '컴팩트 그리드', downloadPng: 'PNG 다운로드',
          exportAllPlans: '모든 팀 계획 내보내기', close: '닫기',
          myOrders: '내 명령', teamPlan: '팀 계획', mapBriefing: '맵 브리핑',
          skipToContent: '콘텐츠로 건너뛰기',
          subEntersReplacing: "예비 — {time}에 입장, {name} 대체",
          subEnters: "예비 — {time}에 입장",
          subOutReplacedBy: "{time}부터 퇴장 — {name}에게 대체됨",
          subOut: "{time}부터 퇴장",
          subActiveNow: "전투 중 — {name} 커버",
          subOutTitle: "교체됨",
          subOutBody: "{name}이(가) {time}에 당신의 자리를 차지했습니다. 경기 남은 시간 동안 전투에서 이탈합니다.",
          subOutBodyPlain: "{time}에 전투에서 이탈했습니다.",
          subWaitTitle: "아직 전투 미참여",
          subWaitBody: "{time}에 입장하여 {name}을(를) 대체합니다. 그때까지 전투에 진입하지 마세요.",
          subWaitBodyPlain: "{time}에 입장합니다. 대체 대상이 아직 설정되지 않았습니다 — 리더에게 문의하세요.",
        },
        id: {
          appTitle: 'All-Star BoH - Komando Tim', appSubtitle: 'Seimbangkan formasi, tetapkan peran komando, dan terbitkan rencana pertempuran.',
          viewList: 'Daftar Tim', viewBoard: 'Papan', viewPlans: 'Rencana Tim',
          reviewSwaps: 'Tinjau pertukaran', plannerTools: 'Alat perencana',
          applyBest: 'Terapkan terbaik', rebalance: 'Seimbangkan ulang',
          importCsv: 'Impor CSV', undo: 'Batalkan', exportJson: 'Ekspor JSON',
          restoreJson: 'Pulihkan JSON', saveView: 'Simpan tampilan', loadView: 'Muat tampilan',
          pngT14: 'PNG T1-4', pngT2: 'PNG T2', pngT3: 'PNG T3', pngAll: 'PNG semua',
          moveTeamLeft: '← Tim', moveTeamRight: 'Tim →', reset: 'Reset',
          checkingBalance: 'Memeriksa keseimbangan…', rulesUpdate: 'Aturan diperbarui setelah setiap langkah.',
          viewChecks: 'Lihat pemeriksaan keseimbangan detail',
          benchTitle: 'Cadangan / Reserve', benchDesc: 'Pemain yang belum ditetapkan tersedia untuk pertukaran cadangan.',
          controls: 'Kontrol', benchedPlayers: 'Pemain cadangan', overrides: 'Override',
          adjustPlayer: 'Sesuaikan pemain', rolePlaybook: 'Buku panduan peran',
          swapSuggestions: 'Saran pertukaran', lowerTier: 'Draf tier bawah',
          rankWatch: 'Pantauan rank 49-59', unmappedWatch: 'Pantauan belum dipetakan',
          searchLang: 'Cari dan bahasa', findCastle: 'Cari kastil',
          searchPlaceholder: 'Cari nama, lencana, bahasa', languageGroup: 'Grup bahasa',
          prefNotes: 'Catatan rekan tim pilihan',
          planTitle: 'All-Star BoH - Rencana Tim', planSubtitle: 'Penugasan berdasarkan peringkat dengan timeline dan tugas Legiun.',
          shareExport: 'Bagikan / Ekspor', slideshow: 'Slideshow', fullGrid: 'Grid penuh',
          compactGrid: 'Grid kompak', downloadPng: 'Unduh PNG',
          exportAllPlans: 'Ekspor semua rencana tim', close: 'Tutup',
          myOrders: 'Perintah saya', teamPlan: 'Rencana Tim', mapBriefing: 'Briefing Peta',
          skipToContent: 'Loncat ke konten',
          subEntersReplacing: "Cadangan — masuk pukul {time}, menggantikan {name}",
          subEnters: "Cadangan — masuk pukul {time}",
          subOutReplacedBy: "Keluar sejak {time} — diganti oleh {name}",
          subOut: "Keluar sejak {time}",
          subActiveNow: "Bermain — menggantikan {name}",
          subOutTitle: "Diganti",
          subOutBody: "{name} mengambil alih slot kamu pukul {time}. Kamu keluar dari medan perang sisa pertandingan.",
          subOutBodyPlain: "Kamu meninggalkan medan perang pukul {time}.",
          subWaitTitle: "Belum bermain",
          subWaitBody: "Kamu masuk pukul {time}, menggantikan {name}. Jangan masuk medan perang sampai saat itu.",
          subWaitBodyPlain: "Kamu masuk pukul {time}. Target pengganti belum diatur — tanya leader kamu.",
        },
      };

      function detectBrowserLocale() {
        const supported = ['en','ru','es','zh','tr','de','fr','pt','ar','kr','id'];
        const langs = navigator.languages || [navigator.language || 'en'];
        for (const lang of langs) {
          const code = String(lang || '').slice(0, 2).toLowerCase();
          if (code === 'zh') return 'zh';
          if (code === 'ko') return 'kr';
          if (supported.includes(code)) return code;
        }
        return 'en';
      }

      let uiLocale = detectBrowserLocale();

      function applyUITranslations(locale) {
        const copy = uiCopy[locale] || uiCopy.en;
        document.querySelectorAll('[data-i18n]').forEach((el) => {
          const key = el.getAttribute('data-i18n');
          if (copy[key]) el.textContent = copy[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
          const key = el.getAttribute('data-i18n-placeholder');
          if (copy[key]) el.placeholder = copy[key];
        });
        const htmlEl = document.documentElement;
        htmlEl.setAttribute('lang', locale === 'kr' ? 'ko' : locale);
        if (locale === 'ar') {
          htmlEl.setAttribute('dir', 'rtl');
        } else {
          htmlEl.setAttribute('dir', 'ltr');
        }
      }

      function initTheme() {
        const saved = localStorage.getItem('boh-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = saved || (prefersDark ? 'dark' : 'light');
        applyTheme(theme);
      }

      function applyTheme(theme) {
        const htmlEl = document.documentElement;
        // Both toggles — the planner topbar is hidden behind the plan dialog, so the
        // dialog carries its own.
        const btns = [document.getElementById('themeToggleBtn'), document.getElementById('rolePlanThemeBtn')];
        if (theme === 'light') {
          htmlEl.setAttribute('data-theme', 'light');
          btns.forEach((b) => { if (b) b.textContent = '☾'; });
        } else {
          htmlEl.removeAttribute('data-theme');
          btns.forEach((b) => { if (b) b.textContent = '☀'; });
        }
        localStorage.setItem('boh-theme', theme);
      }

      function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        applyTheme(current === 'light' ? 'dark' : 'light');
      }

      const planLocaleCopy = {
        en: {
          nobodyHere: "nobody assigned this phase",
          fortressOfHonor: "Fortress of Honor",
          tower: "Tower",
          sanctuary: "Sanctuary",
          relay: "Relay",
          arsenal: "Arsenal",
          hospital: "Hospital",
          outpost: "Outpost",
          commandCenter: "Command Center",
          stronghold: "Stronghold",
          nextWord: "Next",
          backWord: "Back",
          comingSoon: "Stage 2 map — coming soon",
          stage2Tab: "Stage 2 · full map",
          stage1Tab: "Stage 1 · reduced map",
          enemy: "Enemy",
          ours: "Ours",
          startRed: "We start RED",
          startBlue: "We start BLUE",
          rosterRoles: "Roster & roles",
          hideCodes: "Hide codes",
          showCodes: "Show codes",
          fullGrid: "Full grid",
          slideshow: "Slideshow",
          teamBoard: "Team board",
          myPlan: "My plan",
          backupsWord: "backups",
          makeBackup: "Make backup",
          backup: "Backup",
          entersAt5: "Enters at 30:00 — no action this phase",
          standbyNote: "Default no play — enter only through a paired substitution at minute 30 or later.",
          standby: "Standby",
          gathering: "Gathering",
          crystals: "Sacred crystals",
          teleportNow: "Teleport now",
          bothLegions: "Both legions",
          legion2Sub: "Build · gather · support",
          legion1Sub: "Strike · capture · hold",
          legion2: "Legion 2",
          legion1: "Legion 1",
          rolePlan: "Role plan",
          powerDistribution: "Power distribution",
          scoreRank: "Score rank",
          player: "Player",
          power: "Power",
          score: "Score",
          role: "Role",
          description: "Description",
          slot: "Slot",
          l1: "Legion 1",
          l2: "Legion 2",
          downloadPng: "Download PNG",
          exportJson: "Export JSON",
          close: "Close",
          scoringRule: "Score-rank rule: 1/2/8 Offensive, 3/5/12 Top, 4/6/11 Bottom, 7/9/10 Rune.",
          auto: "Auto",
          noTeleport: "No teleport.",
          offensive: ["Offensive", "Pressure command centers, outposts, towers, and the rune path."],
          rune: ["Rune", "Build early, secure Fortress of Honor targets, then carry or protect the rune."],
          top: ["Top Side", "Control top-side buildings, towers, and late Fortress of Honor pressure."],
          bottom: ["Bottom Side", "Control bottom-side buildings, towers, and late Fortress of Honor pressure."],
        },
        es: {
          nobodyHere: "nadie asignado en esta fase",
          fortressOfHonor: "Fortaleza de Honor",
          tower: "Torre",
          sanctuary: "Santuario",
          relay: "Relevo",
          arsenal: "Arsenal",
          hospital: "Hospital",
          outpost: "Puesto",
          commandCenter: "Centro de mando",
          stronghold: "Fortaleza",
          nextWord: "Siguiente",
          backWord: "Atrás",
          comingSoon: "Mapa de fase 2 — próximamente",
          stage2Tab: "Fase 2 · mapa completo",
          stage1Tab: "Fase 1 · mapa reducido",
          enemy: "Enemigo",
          ours: "Nuestro",
          startRed: "Empezamos ROJO",
          startBlue: "Empezamos AZUL",
          rosterRoles: "Plantilla y roles",
          hideCodes: "Ocultar códigos",
          showCodes: "Ver códigos",
          fullGrid: "Cuadrícula",
          slideshow: "Presentación",
          teamBoard: "Panel del equipo",
          myPlan: "Mi plan",
          backupsWord: "reservas",
          makeBackup: "Marcar reserva",
          backup: "Reserva",
          entersAt5: "Entra a las 30:00 — sin acción esta fase",
          standbyNote: "Sin desplegar — entras a las 30:00. Ambas legiones inactivas.",
          standby: "En espera",
          gathering: "Recolectando",
          crystals: "Cristales sagrados",
          teleportNow: "Teletransporte ya",
          bothLegions: "Ambas legiones",
          legion2Sub: "Construir · recolectar · apoyar",
          legion1Sub: "Atacar · capturar · mantener",
          legion2: "Legión 2",
          legion1: "Legión 1",
          rolePlan: "Plan de roles", powerDistribution: "Distribucion de poder", scoreRank: "Rango por puntaje", player: "Jugador", power: "Poder", score: "Puntaje", role: "Rol", description: "Descripcion", slot: "Puesto", l1: "Legion 1", l2: "Legion 2", downloadPng: "Descargar PNG", exportJson: "Exportar JSON", close: "Cerrar", scoringRule: "Regla por puntaje: 1/2/8 Ofensiva, 3/5/12 Arriba, 4/6/11 Abajo, 7/9/10 Runa.", auto: "Auto", noTeleport: "Sin teletransporte.", offensive: ["Ofensiva", "Presiona centros de mando, puestos, torres y la ruta de la runa."], rune: ["Runa", "Construye al inicio, asegura Fortalezas de Honor y luego lleva o protege la runa."], top: ["Lado superior", "Controla edificios superiores, torres y presion final sobre Fortaleza de Honor."], bottom: ["Lado inferior", "Controla edificios inferiores, torres y presion final sobre Fortaleza de Honor."],
        },
        pt: {
          nobodyHere: "ninguém nesta fase",
          fortressOfHonor: "Fortaleza de Honra",
          tower: "Torre",
          sanctuary: "Santuário",
          relay: "Revezamento",
          arsenal: "Arsenal",
          hospital: "Hospital",
          outpost: "Posto avançado",
          commandCenter: "Centro de comando",
          stronghold: "Fortaleza",
          nextWord: "Próximo",
          backWord: "Voltar",
          comingSoon: "Mapa da fase 2 — em breve",
          stage2Tab: "Fase 2 · mapa completo",
          stage1Tab: "Fase 1 · mapa reduzido",
          enemy: "Inimigo",
          ours: "Nosso",
          startRed: "Começamos VERMELHO",
          startBlue: "Começamos AZUL",
          rosterRoles: "Elenco e funções",
          hideCodes: "Ocultar códigos",
          showCodes: "Ver códigos",
          fullGrid: "Grade completa",
          slideshow: "Apresentação",
          teamBoard: "Painel da equipe",
          myPlan: "Meu plano",
          backupsWord: "reservas",
          makeBackup: "Tornar reserva",
          backup: "Reserva",
          entersAt5: "Entra às 30:00 — sem ação nesta fase",
          standbyNote: "Não implantado — você entra às 30:00. Ambas as legiões paradas.",
          standby: "Em espera",
          gathering: "Coletando",
          crystals: "Cristais sagrados",
          teleportNow: "Teleporte agora",
          bothLegions: "Ambas legiões",
          legion2Sub: "Construir · coletar · apoiar",
          legion1Sub: "Atacar · capturar · manter",
          legion2: "Legião 2",
          legion1: "Legião 1",
          rolePlan: "Plano de funcoes", powerDistribution: "Distribuicao de poder", scoreRank: "Classificacao por pontos", player: "Jogador", power: "Poder", score: "Pontuacao", role: "Funcao", description: "Descricao", slot: "Vaga", l1: "Legiao 1", l2: "Legiao 2", downloadPng: "Baixar PNG", exportJson: "Exportar JSON", close: "Fechar", scoringRule: "Regra por pontuacao: 1/2/8 Ofensiva, 3/5/12 Topo, 4/6/11 Baixo, 7/9/10 Runa.", auto: "Auto", noTeleport: "Sem teleporte.", offensive: ["Ofensiva", "Pressiona centros de comando, postos, torres e a rota da runa."], rune: ["Runa", "Construa cedo, proteja Fortalezas de Honra e depois carregue ou proteja a runa."], top: ["Lado superior", "Controle edificios superiores, torres e pressao final na Fortaleza de Honra."], bottom: ["Lado inferior", "Controle edificios inferiores, torres e pressao final na Fortaleza de Honra."],
        },
        de: {
          nobodyHere: "niemand in dieser Phase",
          fortressOfHonor: "Festung der Ehre",
          tower: "Turm",
          sanctuary: "Heiligtum",
          relay: "Staffel",
          arsenal: "Arsenal",
          hospital: "Lazarett",
          outpost: "Aussenposten",
          commandCenter: "Kommandozentrale",
          stronghold: "Festung",
          nextWord: "Weiter",
          backWord: "Zurück",
          comingSoon: "Karte Phase 2 — bald",
          stage2Tab: "Phase 2 · volle Karte",
          stage1Tab: "Phase 1 · kleine Karte",
          enemy: "Feind",
          ours: "Unser",
          startRed: "Wir starten ROT",
          startBlue: "Wir starten BLAU",
          rosterRoles: "Kader & Rollen",
          hideCodes: "Codes verbergen",
          showCodes: "Codes zeigen",
          fullGrid: "Volle Tabelle",
          slideshow: "Präsentation",
          teamBoard: "Team-Tafel",
          myPlan: "Mein Plan",
          backupsWord: "Ersatz",
          makeBackup: "Als Ersatz",
          backup: "Ersatz",
          entersAt5: "Tritt um 30:00 ein — keine Aktion",
          standbyNote: "Nicht im Einsatz — du trittst um 30:00 ein. Beide Legionen warten.",
          standby: "Bereitschaft",
          gathering: "Sammeln",
          crystals: "Heilige Kristalle",
          teleportNow: "Jetzt teleportieren",
          bothLegions: "Beide Legionen",
          legion2Sub: "Bauen · sammeln · stutzen",
          legion1Sub: "Angriff · erobern · halten",
          legion2: "Legion 2",
          legion1: "Legion 1",
          rolePlan: "Rollenplan", powerDistribution: "Machtverteilung", scoreRank: "Punkterang", player: "Spieler", power: "Macht", score: "Punkte", role: "Rolle", description: "Beschreibung", slot: "Platz", l1: "Legion 1", l2: "Legion 2", downloadPng: "PNG herunterladen", exportJson: "JSON exportieren", close: "Schliessen", scoringRule: "Punkteregel: 1/2/8 Offensive, 3/5/12 Oben, 4/6/11 Unten, 7/9/10 Rune.", auto: "Auto", noTeleport: "Kein Teleport.", offensive: ["Offensive", "Druck auf Kommandozentren, Aussenposten, Turme und Runenweg."], rune: ["Rune", "Fruh bauen, Ehrenfestungen sichern, dann Rune tragen oder schutzen."], top: ["Obere Seite", "Kontrolliert obere Gebaude, Turme und spaten Druck auf Ehrenfestung."], bottom: ["Untere Seite", "Kontrolliert untere Gebaude, Turme und spaten Druck auf Ehrenfestung."],
        },
        fr: {
          nobodyHere: "personne à cette phase",
          fortressOfHonor: "Forteresse d'Honneur",
          tower: "Tour",
          sanctuary: "Sanctuaire",
          relay: "Relais",
          arsenal: "Arsenal",
          hospital: "Hôpital",
          outpost: "Avant-poste",
          commandCenter: "Centre de commande",
          stronghold: "Forteresse",
          nextWord: "Suivant",
          backWord: "Retour",
          comingSoon: "Carte étape 2 — bientôt",
          stage2Tab: "Étape 2 · carte complète",
          stage1Tab: "Étape 1 · carte réduite",
          enemy: "Ennemi",
          ours: "À nous",
          startRed: "On commence ROUGE",
          startBlue: "On commence BLEU",
          rosterRoles: "Effectif & rôles",
          hideCodes: "Masquer les codes",
          showCodes: "Voir les codes",
          fullGrid: "Grille complète",
          slideshow: "Diaporama",
          teamBoard: "Tableau équipe",
          myPlan: "Mon plan",
          backupsWord: "remplaçants",
          makeBackup: "Mettre remplaçant",
          backup: "Remplaçant",
          entersAt5: "Entre à 30:00 — aucune action",
          standbyNote: "Non déployé — vous entrez à 30:00. Les deux légions inactives.",
          standby: "En attente",
          gathering: "Récolte",
          crystals: "Cristaux sacrés",
          teleportNow: "Téléporter maintenant",
          bothLegions: "Deux légions",
          legion2Sub: "Construire · recolter · soutenir",
          legion1Sub: "Frapper · capturer · tenir",
          legion2: "Légion 2",
          legion1: "Légion 1",
          rolePlan: "Plan des roles", powerDistribution: "Repartition de puissance", scoreRank: "Rang au score", player: "Joueur", power: "Puissance", score: "Score", role: "Role", description: "Description", slot: "Place", l1: "Legion 1", l2: "Legion 2", downloadPng: "Telecharger PNG", exportJson: "Exporter JSON", close: "Fermer", scoringRule: "Regle score: 1/2/8 Offensive, 3/5/12 Haut, 4/6/11 Bas, 7/9/10 Rune.", auto: "Auto", noTeleport: "Pas de teleportation.", offensive: ["Offensive", "Met la pression sur centres de commandement, avant-postes, tours et route de rune."], rune: ["Rune", "Construit au depart, securise les Forteresses d'Honneur, puis porte ou protege la rune."], top: ["Cote haut", "Controle les batiments hauts, tours et pression finale sur la Forteresse d'Honneur."], bottom: ["Cote bas", "Controle les batiments bas, tours et pression finale sur la Forteresse d'Honneur."],
        },
        hr: {
          nobodyHere: "nitko u ovoj fazi",
          fortressOfHonor: "Utvrda casti",
          tower: "Toranj",
          sanctuary: "Svetiste",
          relay: "Stafeta",
          arsenal: "Arsenal",
          hospital: "Bolnica",
          outpost: "Ispostava",
          commandCenter: "Zapovjedni centar",
          stronghold: "Utvrda",
          nextWord: "Dalje",
          backWord: "Natrag",
          comingSoon: "Karta faze 2 — uskoro",
          stage2Tab: "Faza 2 · puna karta",
          stage1Tab: "Faza 1 · smanjena karta",
          enemy: "Neprijatelj",
          ours: "Nase",
          startRed: "Krecemo CRVENI",
          startBlue: "Krecemo PLAVI",
          rosterRoles: "Sastav i uloge",
          hideCodes: "Sakrij kodove",
          showCodes: "Prikazi kodove",
          fullGrid: "Puna mreza",
          slideshow: "Prezentacija",
          teamBoard: "Ploca tima",
          myPlan: "Moj plan",
          backupsWord: "zamjene",
          makeBackup: "Postavi zamjenu",
          backup: "Zamjena",
          entersAt5: "Ulazi u 30:00 — bez akcije",
          standbyNote: "Nisi na terenu — ulazis u 30:00. Obje legije miruju.",
          standby: "Pripravnost",
          gathering: "Skupljanje",
          crystals: "Sveti kristali",
          teleportNow: "Teleportiraj sada",
          bothLegions: "Obje legije",
          legion2Sub: "Gradi · skupljaj · podrzi",
          legion1Sub: "Napad · zauzmi · drzi",
          legion2: "Legija 2",
          legion1: "Legija 1",
          rolePlan: "Plan uloga", powerDistribution: "Raspodjela moci", scoreRank: "Poredak po bodovima", player: "Igrac", power: "Moc", score: "Bodovi", role: "Uloga", description: "Opis", slot: "Mjesto", l1: "Legija 1", l2: "Legija 2", downloadPng: "Preuzmi PNG", exportJson: "Izvezi JSON", close: "Zatvori", scoringRule: "Pravilo bodova: 1/2/8 Ofenziva, 3/5/12 Gore, 4/6/11 Dolje, 7/9/10 Runa.", auto: "Auto", noTeleport: "Bez teleportacije.", offensive: ["Ofenziva", "Pritisak na zapovjedne centre, predstraze, tornjeve i put rune."], rune: ["Runa", "Rano gradi, osigurava Tvrdave casti, zatim nosi ili cuva runu."], top: ["Gornja strana", "Kontrola gornjih zgrada, tornjeva i zavrsni pritisak na Tvrdavu casti."], bottom: ["Donja strana", "Kontrola donjih zgrada, tornjeva i zavrsni pritisak na Tvrdavu casti."],
        },
        tr: {
          nobodyHere: "bu evrede kimse yok",
          fortressOfHonor: "Onur Kalesi",
          tower: "Kule",
          sanctuary: "Tapinak",
          relay: "Role",
          arsenal: "Cephanelik",
          hospital: "Hastane",
          outpost: "Karakol",
          commandCenter: "Komuta merkezi",
          stronghold: "Kale",
          nextWord: "Ileri",
          backWord: "Geri",
          comingSoon: "Asama 2 haritasi — yakinda",
          stage2Tab: "Asama 2 · tam harita",
          stage1Tab: "Asama 1 · kucuk harita",
          enemy: "Dusman",
          ours: "Bizim",
          startRed: "KIRMIZI basliyoruz",
          startBlue: "MAVI basliyoruz",
          rosterRoles: "Kadro ve roller",
          hideCodes: "Kodlari gizle",
          showCodes: "Kodlari goster",
          fullGrid: "Tam tablo",
          slideshow: "Slayt",
          teamBoard: "Takim panosu",
          myPlan: "Planim",
          backupsWord: "yedek",
          makeBackup: "Yedek yap",
          backup: "Yedek",
          entersAt5: "30:00'da giriyor — bu evrede yok",
          standbyNote: "Sahada degilsin — 30:00'da giriyorsun. Iki lejyon da bekliyor.",
          standby: "Beklemede",
          gathering: "Toplama",
          crystals: "Kutsal kristaller",
          teleportNow: "Simdi isinlan",
          bothLegions: "Iki lejyon",
          legion2Sub: "Insa · topla · destekle",
          legion1Sub: "Vur · ele gecir · tut",
          legion2: "Lejyon 2",
          legion1: "Lejyon 1",
          rolePlan: "Rol plani", powerDistribution: "Guc dagilimi", scoreRank: "Skor sirasi", player: "Oyuncu", power: "Guc", score: "Skor", role: "Rol", description: "Aciklama", slot: "Yer", l1: "Lejyon 1", l2: "Lejyon 2", downloadPng: "PNG indir", exportJson: "JSON disa aktar", close: "Kapat", scoringRule: "Skor kurali: 1/2/8 Ofansif, 3/5/12 Ust, 4/6/11 Alt, 7/9/10 Rune.", auto: "Oto", noTeleport: "Teleport yok.", offensive: ["Ofansif", "Komuta merkezleri, karakollar, kuleler ve rune yolu uzerinde baski kurar."], rune: ["Rune", "Erken insa eder, Honor Fortress hedeflerini alir, sonra runeyi tasir veya korur."], top: ["Ust taraf", "Ust binalari, kuleleri ve gec Honor Fortress baskisini kontrol eder."], bottom: ["Alt taraf", "Alt binalari, kuleleri ve gec Honor Fortress baskisini kontrol eder."],
        },
        ru: {
          nobodyHere: "никого в этой фазе",
          fortressOfHonor: "Крепость чести",
          tower: "Башня",
          sanctuary: "Святилище",
          relay: "Реле",
          arsenal: "Арсенал",
          hospital: "Госпиталь",
          outpost: "Аванпост",
          commandCenter: "Командный центр",
          stronghold: "Крепость",
          nextWord: "Далее",
          backWord: "Назад",
          comingSoon: "Карта этапа 2 — скоро",
          stage2Tab: "Этап 2 · полная карта",
          stage1Tab: "Этап 1 · малая карта",
          enemy: "Врага",
          ours: "Наше",
          startRed: "Мы за КРАСНЫХ",
          startBlue: "Мы за СИНИХ",
          rosterRoles: "Состав и роли",
          hideCodes: "Скрыть коды",
          showCodes: "Показать коды",
          fullGrid: "Полная сетка",
          slideshow: "Слайды",
          teamBoard: "Доска команды",
          myPlan: "Мой план",
          backupsWord: "запасных",
          makeBackup: "Сделать запасным",
          backup: "Запасной",
          entersAt5: "Входит в 30:00 — без действий",
          standbyNote: "Не развёрнут — вы входите в 30:00. Оба легиона ждут.",
          standby: "В резерве",
          gathering: "Сбор",
          crystals: "Священные кристаллы",
          teleportNow: "Телепорт сейчас",
          bothLegions: "Оба легиона",
          legion2Sub: "Стройка · сбор · поддержка",
          legion1Sub: "Удар · захват · удержание",
          legion2: "Легион 2",
          legion1: "Легион 1",
          rolePlan: "План ролей", powerDistribution: "Распределение силы", scoreRank: "Ранг по очкам", player: "Игрок", power: "Сила", score: "Очки", role: "Роль", description: "Описание", slot: "Слот", l1: "Легион 1", l2: "Легион 2", downloadPng: "Скачать PNG", exportJson: "Экспорт JSON", close: "Закрыть", scoringRule: "Правило по очкам: 1/2/8 Атака, 3/5/12 Верх, 4/6/11 Низ, 7/9/10 Руна.", auto: "Авто", noTeleport: "Без телепорта.", offensive: ["Атака", "Давит командные центры, аванпосты, башни и путь руны."], rune: ["Руна", "Строит в начале, берет Крепости Чести, затем несет или защищает руну."], top: ["Верх", "Контроль верхних зданий, башен и позднее давление на Крепость Чести."], bottom: ["Низ", "Контроль нижних зданий, башен и позднее давление на Крепость Чести."],
        },
        id: {
          nobodyHere: "tidak ada di fase ini",
          fortressOfHonor: "Benteng Kehormatan",
          tower: "Menara",
          sanctuary: "Suaka",
          relay: "Estafet",
          arsenal: "Gudang senjata",
          hospital: "Rumah sakit",
          outpost: "Pos jaga",
          commandCenter: "Pusat komando",
          stronghold: "Benteng",
          nextWord: "Berikutnya",
          backWord: "Kembali",
          comingSoon: "Peta tahap 2 — segera",
          stage2Tab: "Tahap 2 · peta penuh",
          stage1Tab: "Tahap 1 · peta kecil",
          enemy: "Musuh",
          ours: "Milik kita",
          startRed: "Kita mulai MERAH",
          startBlue: "Kita mulai BIRU",
          rosterRoles: "Daftar & peran",
          hideCodes: "Sembunyikan kode",
          showCodes: "Tampilkan kode",
          fullGrid: "Grid penuh",
          slideshow: "Slideshow",
          teamBoard: "Papan tim",
          myPlan: "Rencanaku",
          backupsWord: "cadangan",
          makeBackup: "Jadikan cadangan",
          backup: "Cadangan",
          entersAt5: "Masuk pukul 30:00 — tanpa aksi",
          standbyNote: "Belum turun — kamu masuk pukul 30:00. Kedua legiun diam.",
          standby: "Siaga",
          gathering: "Mengumpulkan",
          crystals: "Kristal suci",
          teleportNow: "Teleport sekarang",
          bothLegions: "Kedua legiun",
          legion2Sub: "Bangun · kumpulkan · dukung",
          legion1Sub: "Serang · rebut · tahan",
          legion2: "Legiun 2",
          legion1: "Legiun 1",
          rolePlan: "Rencana peran", powerDistribution: "Distribusi power", scoreRank: "Peringkat skor", player: "Pemain", power: "Power", score: "Skor", role: "Peran", description: "Deskripsi", slot: "Slot", l1: "Legion 1", l2: "Legion 2", downloadPng: "Unduh PNG", exportJson: "Ekspor JSON", close: "Tutup", scoringRule: "Aturan skor: 1/2/8 Ofensif, 3/5/12 Atas, 4/6/11 Bawah, 7/9/10 Rune.", auto: "Auto", noTeleport: "Tanpa teleport.", offensive: ["Ofensif", "Menekan command center, outpost, tower, dan jalur rune."], rune: ["Rune", "Build awal, amankan Fortress of Honor, lalu bawa atau lindungi rune."], top: ["Sisi atas", "Kontrol bangunan atas, tower, dan tekanan akhir Fortress of Honor."], bottom: ["Sisi bawah", "Kontrol bangunan bawah, tower, dan tekanan akhir Fortress of Honor."],
        },
        ar: {
          nobodyHere: "لم يتم تعيين أحد في هذه المرحلة",
          fortressOfHonor: "قلعة الشرف",
          tower: "برج",
          sanctuary: "ملاذ",
          relay: "مرحل",
          arsenal: "ترسانة",
          hospital: "مستشفى",
          outpost: "موقع أمامي",
          commandCenter: "مركز القيادة",
          stronghold: "معقل",
          nextWord: "التالي",
          backWord: "السابق",
          comingSoon: "خريطة المرحلة 2 — قريباً",
          stage2Tab: "المرحلة 2 · الخريطة الكاملة",
          stage1Tab: "المرحلة 1 · خريطة مصغرة",
          enemy: "العدو",
          ours: "لنا",
          startRed: "نبدأ أحمر",
          startBlue: "نبدأ أزرق",
          rosterRoles: "القائمة والأدوار",
          hideCodes: "إخفاء الرموز",
          showCodes: "إظهار الرموز",
          fullGrid: "شبكة كاملة",
          slideshow: "عرض شرائح",
          teamBoard: "لوحة الفريق",
          myPlan: "خطتي",
          backupsWord: "احتياط",
          makeBackup: "تعيين احتياط",
          backup: "احتياط",
          entersAt5: "يدخل في 30:00 — لا إجراء في هذه المرحلة",
          standbyNote: "غير منتشر — تدخل في 30:00. كلا الفيلقين في انتظار.",
          standby: "استعداد",
          gathering: "تجميع",
          crystals: "بلورات مقدسة",
          teleportNow: "انتقال فوري الآن",
          bothLegions: "كلا الفيلقين",
          legion2Sub: "بناء · تجميع · دعم",
          legion1Sub: "ضرب · أسر · إمساك",
          legion2: "الفيلق 2",
          legion1: "الفيلق 1",
          rolePlan: "خطة الدور", powerDistribution: "توزيع القوة", scoreRank: "ترتيب النقاط", player: "لاعب", power: "قوة", score: "نقاط", role: "دور", description: "وصف", slot: "فتحة", l1: "فيلق 1", l2: "فيلق 2", downloadPng: "تحميل PNG", exportJson: "تصدير JSON", close: "إغلاق", scoringRule: "قاعدة النقاط: 1/2/8 هجوم، 3/5/12 أعلى، 4/6/11 أسفل، 7/9/10 رون.", auto: "تلقائي", noTeleport: "لا انتقال فوري.", offensive: ["هجوم", "الضغط على مراكز القيادة والمواقع الأمامية والأبراج ومسار الرون."], rune: ["رون", "ابنِ مبكراً، تأمين قلعة الشرف، ثم احمل أو احم الرون."], top: ["الجانب العلوي", "السيطرة على المباني العلوية والأبراج والضغط المتأخر على قلعة الشرف."], bottom: ["الجانب السفلي", "السيطرة على المباني السفلية والأبراج والضغط المتأخر على قلعة الشرف."],
        },
        zh: {
          nobodyHere: "本阶段无人",
          fortressOfHonor: "荣耀堡",
          tower: "箭塔",
          sanctuary: "圣所",
          relay: "中继点",
          arsenal: "军械库",
          hospital: "医院",
          outpost: "哨站",
          commandCenter: "指挥中心",
          stronghold: "要塞",
          nextWord: "下一页",
          backWord: "上一页",
          comingSoon: "第二阶段地图 — 敬请期待",
          stage2Tab: "第二阶段 · 完整地图",
          stage1Tab: "第一阶段 · 精简地图",
          enemy: "敌方",
          ours: "我方",
          startRed: "我方红方",
          startBlue: "我方蓝方",
          rosterRoles: "阵容与角色",
          hideCodes: "隐藏代号",
          showCodes: "显示代号",
          fullGrid: "完整表格",
          slideshow: "幻灯片",
          teamBoard: "团队面板",
          myPlan: "我的计划",
          backupsWord: "替补",
          makeBackup: "设为替补",
          backup: "替补",
          entersAt5: "30:00 进场 — 本阶段无行动",
          standbyNote: "未参战 — 你在 30:00 进场。两个军团待命。",
          standby: "待命",
          gathering: "采集",
          crystals: "圣水晶",
          teleportNow: "立即传送",
          bothLegions: "两个军团",
          legion2Sub: "建造 · 采集 · 支援",
          legion1Sub: "进攻 · 占领 · 防守",
          legion2: "军团 2",
          legion1: "军团 1",
          rolePlan: "角色计划", powerDistribution: "战力分布", scoreRank: "积分排名", player: "玩家", power: "战力", score: "积分", role: "角色", description: "说明", slot: "位置", l1: "军团1", l2: "军团2", downloadPng: "下载 PNG", exportJson: "导出 JSON", close: "关闭", scoringRule: "积分规则：1/2/8 进攻，3/5/12 上路，4/6/11 下路，7/9/10 符文。", auto: "自动", noTeleport: "不传送。", offensive: ["进攻", "压制指挥中心、哨站、塔和符文路线。"], rune: ["符文", "前期建塔，控制荣耀堡垒，然后搬运或保护符文。"], top: ["上路", "控制上路建筑、塔，并在后期压制荣耀堡垒。"], bottom: ["下路", "控制下路建筑、塔，并在后期压制荣耀堡垒。"],
        },
        kr: {
          nobodyHere: "이 단계 배정 없음",
          fortressOfHonor: "명예의 요새",
          tower: "타워",
          sanctuary: "성소",
          relay: "중계소",
          arsenal: "병기고",
          hospital: "병원",
          outpost: "전초기지",
          commandCenter: "지휘 본부",
          stronghold: "요새",
          nextWord: "다음",
          backWord: "이전",
          comingSoon: "2단계 맵 — 준비 중",
          stage2Tab: "2단계 · 전체 맵",
          stage1Tab: "1단계 · 축소 맵",
          enemy: "적군",
          ours: "아군",
          startRed: "우리는 레드",
          startBlue: "우리는 블루",
          rosterRoles: "로스터 및 역할",
          hideCodes: "코드 숨기기",
          showCodes: "코드 표시",
          fullGrid: "전체 표",
          slideshow: "슬라이드",
          teamBoard: "팀 보드",
          myPlan: "내 계획",
          backupsWord: "예비",
          makeBackup: "예비로 지정",
          backup: "예비",
          entersAt5: "30:00 입장 — 이번 단계 행동 없음",
          standbyNote: "미배치 — 30:00에 입장합니다. 두 군단 모두 대기.",
          standby: "대기",
          gathering: "채집",
          crystals: "신성한 수정",
          teleportNow: "지금 이동",
          bothLegions: "두 군단",
          legion2Sub: "건설 · 채집 · 지원",
          legion1Sub: "공격 · 점령 · 방어",
          legion2: "군단 2",
          legion1: "군단 1",
          rolePlan: "역할 계획", powerDistribution: "전투력 분배", scoreRank: "점수 순위", player: "플레이어", power: "전투력", score: "점수", role: "역할", description: "설명", slot: "슬롯", l1: "군단 1", l2: "군단 2", downloadPng: "PNG 다운로드", exportJson: "JSON 내보내기", close: "닫기", scoringRule: "점수 규칙: 1/2/8 공격, 3/5/12 상단, 4/6/11 하단, 7/9/10 룬.", auto: "자동", noTeleport: "텔레포트 없음.", offensive: ["공격", "지휘 센터, 전초기지, 타워, 룬 경로를 압박합니다."], rune: ["룬", "초반 건설, 명예 요새 확보, 이후 룬 운반 또는 보호."], top: ["상단", "상단 건물과 타워를 통제하고 후반 명예 요새를 압박합니다."], bottom: ["하단", "하단 건물과 타워를 통제하고 후반 명예 요새를 압박합니다."],
        },
        it: {
          nobodyHere: "nessuno in questa fase",
          fortressOfHonor: "Fortezza dell'Onore",
          tower: "Torre",
          sanctuary: "Santuario",
          relay: "Staffetta",
          arsenal: "Arsenale",
          hospital: "Ospedale",
          outpost: "Avamposto",
          commandCenter: "Centro di comando",
          stronghold: "Roccaforte",
          nextWord: "Avanti",
          backWord: "Indietro",
          comingSoon: "Mappa fase 2 — presto",
          stage2Tab: "Fase 2 · mappa completa",
          stage1Tab: "Fase 1 · mappa ridotta",
          enemy: "Nemico",
          ours: "Nostro",
          startRed: "Iniziamo ROSSO",
          startBlue: "Iniziamo BLU",
          rosterRoles: "Rosa e ruoli",
          hideCodes: "Nascondi codici",
          showCodes: "Mostra codici",
          fullGrid: "Griglia completa",
          slideshow: "Presentazione",
          teamBoard: "Bacheca squadra",
          myPlan: "Il mio piano",
          backupsWord: "riserve",
          makeBackup: "Rendi riserva",
          backup: "Riserva",
          entersAt5: "Entra alle 30:00 — nessuna azione",
          standbyNote: "Non schierato — entri alle 30:00. Entrambe le legioni ferme.",
          standby: "In attesa",
          gathering: "Raccolta",
          crystals: "Cristalli sacri",
          teleportNow: "Teletrasporta ora",
          bothLegions: "Entrambe le legioni",
          legion2Sub: "Costruisci · raccogli · supporta",
          legion1Sub: "Attacco · cattura · tieni",
          legion2: "Legione 2",
          legion1: "Legione 1",
          rolePlan: "Piano ruoli", powerDistribution: "Distribuzione potere", scoreRank: "Classifica punteggio", player: "Giocatore", power: "Potere", score: "Punteggio", role: "Ruolo", description: "Descrizione", slot: "Slot", l1: "Legione 1", l2: "Legione 2", downloadPng: "Scarica PNG", exportJson: "Esporta JSON", close: "Chiudi", scoringRule: "Regola punteggio: 1/2/8 Offensiva, 3/5/12 Alto, 4/6/11 Basso, 7/9/10 Runa.", auto: "Auto", noTeleport: "Nessun teletrasporto.", offensive: ["Offensiva", "Pressa centri di comando, avamposti, torri e percorso della runa."], rune: ["Runa", "Costruisce presto, assicura le Fortezze d'Onore, poi porta o protegge la runa."], top: ["Lato alto", "Controlla edifici alti, torri e pressione finale sulla Fortezza d'Onore."], bottom: ["Lato basso", "Controlla edifici bassi, torri e pressione finale sulla Fortezza d'Onore."],
        },
      };
      let rolePlanDisplayLocale = uiLocale || "en";
      // "auto" renders each player's row in their own language; any locale code renders the
      // whole sheet in that single language (a shared battle plan should be readable by all).
      let rolePlanLocaleMode = uiLocale || "en";
      let rolePlanCompact = false;
      function planLocaleFor(player) {
        return rolePlanLocaleMode === "auto" ? normalizeLocale(player?.locale || "en") : rolePlanLocaleMode;
      }
      let ignoreLeadership = false;
      let teams = hydrate(allInitialTeams);
      let viewMode = "list";
      try {
        viewMode = localStorage.getItem("boh-view-mode") || "list";
      } catch (error) {
        viewMode = "list";
      }
      let reservePlayers = hydrateReserve(unmappedWatchPlayers);
      // Backup substitutions: { [backupPlayerId]: { replacesId, fromPhase } }. See
      // substitutionFor()/isStandbyForPhase(). Serialized with the rest of the state.
      let substitutions = {};
      let benchedPlayerIds = new Set(defaultBenchedIds);
      let selectedId = teams[0].players[0].id;
      let draggedId = null;
      let suggestions = [];
      let manualMode = true;
      let whaleCurve = 1.35;
      let curveMedian = 1;
      let overridesEnabled = true;
      let preferredNotes = preferred.slice();
      const undoStack = [];

      const canonicalFormationState = {
        schemaVersion,
        rosterRevision,
        teams: teams.map(function (team, index) {
          return { ...team, tier: tierForIndex(index), players: team.players.map(function (player) { return { ...player }; }) };
        }),
        reservePlayers: reservePlayers.map(function (player) { return { ...player }; }),
        tierConfig: { ...tierConfig },
        disabledOverrideRules: [],
        benchedPlayerIds: [...benchedPlayerIds],
        selectedId,
        manualMode: true,
        whaleCurve: 1.35,
        overridesEnabled: true,
        preferredNotes: preferredNotes.map(function (entry) { return entry.slice(); }),
        solverConflicts: [],
      };

      function normalizeLocale(value) {
        const locale = String(value || "en").trim().toLowerCase();
        if (!locale || locale === "english") return "en";
        if (locale === "german") return "de";
        if (locale === "spanish") return "es";
        if (locale === "turkish") return "tr";
        
        if (locale === "french" || locale === "fra" || locale === "fre") return "fr";
        if (locale === "portuguese" || locale === "por") return "pt";
        if (locale === "russian" || locale === "rus") return "ru";
        if (locale === "chinese" || locale === "zho" || locale === "chi") return "zh";
        if (locale === "arabic" || locale === "ara") return "ar";
        if (locale === "korean" || locale === "kor" || locale === "ko") return "kr";
        if (locale === "croatian" || locale === "hrv") return "hr";
        if (locale === "italian" || locale === "ita") return "it";
        if (locale === "indonesian" || locale === "ind") return "id";
return locale.slice(0, 8);
      }

      function makeStableId(rank, name, occurrence = 1) {
        const suffix = occurrence > 1 ? `-${occurrence}` : "";
        return `p-${String(rank).padStart(3, "0")}-${slug(name)}${suffix}`;
      }

      function rememberInitialPlayer(id, player) {
        const record = { ...player, id };
        canonicalInitialById.set(id, record);
        if (!initialIdsByPower.has(player.power)) initialIdsByPower.set(player.power, []);
        initialIdsByPower.get(player.power).push(id);
        const nameKey = normalizeName(player.name);
        if (!initialIdsByName.has(nameKey)) initialIdsByName.set(nameKey, []);
        initialIdsByName.get(nameKey).push(id);
      }

      function scoreFromPowerBreakdown(breakdown) {
        if (!breakdown) return null;
        return recomputeV3({
          "Troop Power": breakdown.troopPower,
          "Building Power": breakdown.buildingPower,
          "Technology Power": breakdown.technologyPower,
          "Hero Combat Power": breakdown.heroCombatPower,
          "Dragon Power": breakdown.dragonPower,
          "Unit Specialty Power": breakdown.unitSpecialtyPower,
        });
      }

      function scoreOverrideForPower(power, fallbackScore, breakdown = null) {
        const byBreakdown = scoreFromPowerBreakdown(breakdown || powerBreakdownsByPower.get(Number(power)));
        if (Number.isFinite(byBreakdown)) return byBreakdown;
        const byPower = legacyScoreOverridesByPower.get(Number(power));
        if (Number.isFinite(byPower)) return byPower;
        return Number(fallbackScore || 0);
      }

      function commitmentOverrideForPower(power, fallbackCommitment = 0) {
        const byPower = commitmentOverridesByPower.get(Number(power));
        return Number.isFinite(byPower) ? byPower : Number(fallbackCommitment || 0);
      }

      function seedStableIds() {
        const used = new Map();
        let rank = 1;
        allInitialTeams.forEach((team) => {
          team.players.forEach((player, index) => {
            const name = canonicalRosterName(player[2], player[0]);
            const stableIdName = Number(player[2]) === 344708205 ? player[0] : name;
            const key = `${String(rank).padStart(3, "0")}-${slug(stableIdName)}`;
            const occurrence = (used.get(key) || 0) + 1;
            used.set(key, occurrence);
            const id = makeStableId(rank, stableIdName, occurrence);
            const score = scoreOverrideForPower(player[2], player[1]);
            stableIdByInitialSlot.set(`${team.id}:${index}`, id);
            rememberInitialPlayer(id, {
              rank,
              name,
              originalName: name,
              score,
              baseScore: score,
              power: player[2],
              vts: player[3],
              locale: normalizeLocale(languageOverrides[name] || player[4]),
              defaultTeamId: team.id,
              defaultLocked: player[5].includes("lock"),
              backup: player[5].includes("backup"),
              main: player[5].includes("main"),
              tier: team.tier || "tier1",
              commitment: commitmentOverrideForPower(player[2]),
            });
            rank += 1;
          });
        });
        unmappedWatchPlayers.forEach((player, index) => {
          const playerRank = Number(player.rank || rank);
          const key = `${String(playerRank).padStart(3, "0")}-${slug(player.name)}`;
          const occurrence = (used.get(key) || 0) + 1;
          used.set(key, occurrence);
          const id = makeStableId(playerRank, player.name, occurrence);
          const score = scoreOverrideForPower(player.power, player.baseScore || player.score, player.powerBreakdown);
          stableIdByReserveSlot.set(index, id);
          rememberInitialPlayer(id, {
            rank: playerRank,
            name: player.name,
            originalName: player.name,
            score,
            baseScore: score,
            power: player.power,
            vts: player.vts,
            locale: normalizeLocale(languageOverrides[player.name] || player.locale),
            defaultTeamId: "reserve",
            defaultLocked: false,
            backup: false,
            main: false,
            tier: "reserve",
            commitment: commitmentOverrideForPower(player.power, player.commitment),
            state: player.state,
            lordId: player.lordId,
            unitsDefeated: player.unitsDefeated,
            powerBreakdown: player.powerBreakdown ? { ...player.powerBreakdown } : undefined,
          });
          rank = Math.max(rank, playerRank + 1);
        });
        if (canonicalInitialById.size !== expectedInventoryCount) {
          throw new Error(`Canonical pool must contain ${expectedInventoryCount} players; found ${canonicalInitialById.size}.`);
        }
      }

      function resolveInitialPower(power, context, teamId = "") {
        let ids = (initialIdsByPower.get(power) || []).slice();
        if (teamId) ids = ids.filter((id) => canonicalInitialById.get(id)?.defaultTeamId === teamId);
        if (ids.length !== 1) throw new Error(`${context} power ${power} resolved to ${ids.length} players.`);
        return ids[0];
      }

      function resolveDefaultCommandOverrides() {
        return Object.fromEntries(
          Object.entries(defaultCommandOverrides).map(([teamId, override]) => {
            const next = {};
            if (override.leaderPower) {
              next.leaderId = resolveInitialPower(override.leaderPower, `${teamId} leader`, override.leaderHomeTeamId || teamId);
            }
            const coleaderIds = (override.coleaderPowers || []).map((power, index) => {
              const homeTeamId = Array.isArray(override.coleaderHomeTeamIds) && index in override.coleaderHomeTeamIds ? override.coleaderHomeTeamIds[index] : teamId;
              return resolveInitialPower(power, `${teamId} co-leader`, homeTeamId);
            });
            if (coleaderIds.length) next.coleaderIds = coleaderIds;
            return [teamId, next];
          })
        );
      }

      function hydrate(source) {
        return source.map((team) => {
          const players = team.players.map((p, index) => {
            const meta = enrichmentAliases[p[0]] || enrichment[p[0]] || {};
            const defaultLocked = p[5].includes("lock");
            const id = stableIdByInitialSlot.get(`${team.id}:${index}`);
            const initial = canonicalInitialById.get(id) || {};
            const score = scoreOverrideForPower(p[2], initial.score || p[1], initial.powerBreakdown);
            return {
              id,
              name: canonicalRosterName(p[2], p[0]),
              originalName: initial.originalName || p[0],
              rank: initial.rank,
              score,
              baseScore: score,
              power: p[2],
              vts: p[3],
              locale: normalizeLocale(languageOverrides[p[0]] || p[4]),
              leadVolunteer: Boolean(meta.lead),
              times: parseTimes(meta.times),
              availability: meta.availability || "unknown",
              roles: meta.roles || "flexible",
              defaultTeamId: team.id,
              defaultLocked,
              lockRuleId: defaultLocked ? lockRuleId(id) : "",
              locked: defaultLocked,
              backup: p[5].includes("backup"),
              main: p[5].includes("main"),
              planRole: "",
              titleRole: "",
              titleRoleNote: "",
              commitment: commitmentOverrideForPower(p[2]),
            };
          });
          return {
            ...team,
            fightTime: team.fightTime || bestFightSlot({ players }),
            players,
          };
        });
      }

      function hydrateReserve(source) {
        return source.map((player, index) => {
          const meta = enrichmentAliases[player.name] || enrichment[player.name] || {};
          const id = stableIdByReserveSlot.get(index);
          const initial = canonicalInitialById.get(id) || {};
          const score = scoreOverrideForPower(player.power, initial.score || player.baseScore || player.score, initial.powerBreakdown || player.powerBreakdown);
          return {
            id,
            name: canonicalRosterName(player.power, player.name),
            originalName: initial.originalName || player.name,
            rank: player.rank,
            score,
            baseScore: score,
            power: player.power,
            vts: player.vts,
            locale: normalizeLocale(languageOverrides[player.name] || player.locale),
            leadVolunteer: meta.lead ?? player.lead === "Yes",
            times: parseTimes(meta.times || player.times),
            availability: meta.availability || "unknown",
            roles: meta.roles || "flexible",
            defaultTeamId: "reserve",
            defaultLocked: false,
            lockRuleId: "",
            locked: false,
            backup: false,
            main: false,
            planRole: "",
            titleRole: "",
            titleRoleNote: "",
            commitment: commitmentOverrideForPower(player.power, player.commitment),
            state: player.state,
            lordId: player.lordId,
            unitsDefeated: player.unitsDefeated,
            powerBreakdown: player.powerBreakdown ? { ...player.powerBreakdown } : undefined,
          };
        });
      }

      function parseTimes(value = "") {
        return value
          .split("|")
          .map((slot) => slot.trim())
          .filter(Boolean);
      }

      function normalizePlanRole(value = "") {
        const key = String(value || "").trim().toLowerCase().replace(/[^a-z]+/g, "");
        if (!key) return "";
        if (key === "bot" || key === "botside" || key === "bottomside") return "bottom";
        if (key === "topside") return "top";
        if (key === "offense" || key === "attack") return "offensive";
        return planRoles[key] ? key : "";
      }

      function rolePreferenceKeys(value = "") {
        const seen = new Set();
        return String(value || "")
          .split(/[|,/]+/)
          .map(normalizePlanRole)
          .filter((key) => key && !seen.has(key) && seen.add(key));
      }

      function defaultPlanRole(player) {
        const position = scoreRankPosition(player?.id);
        return scoreRankRoleMap[position] || rolePreferenceKeys(player?.roles).find((key) => key !== "flexible") || "";
      }

      function assignedPlanRole(player) {
        return normalizePlanRole(player?.planRole) || defaultPlanRole(player);
      }

      function scoreRankedTeamPlayers(team) {
        return (team?.players || []).slice().sort((a, b) => b.score - a.score || b.power - a.power || a.name.localeCompare(b.name));
      }

      function scoreRankPosition(playerId) {
        const located = locate(teams, playerId);
        if (!located) return 0;
        return scoreRankedTeamPlayers(teams[located.teamIndex]).findIndex((player) => player.id === playerId) + 1;
      }

      function planRoleSlot(playerId) {
        const located = locate(teams, playerId);
        if (!located) return null;
        const player = located.player;
        const roleKey = assignedPlanRole(player);
        const role = planRoles[roleKey];
        if (!role || !role.capacity) return null;
        const rolePlayers = scoreRankedTeamPlayers(teams[located.teamIndex]).filter((candidate) => assignedPlanRole(candidate) === roleKey);
        const sequence = Math.max(0, rolePlayers.findIndex((candidate) => candidate.id === playerId));
        return {
          roleKey,
          role,
          sequence: sequence + 1,
          index: (sequence % role.capacity) + 1,
          count: rolePlayers.length,
        };
      }

      function roleSlotTask(phase, slotIndex) {
        if (!phase?.slots?.length) return null;
        return phase.slots[(Math.max(1, Number(slotIndex) || 1) - 1) % phase.slots.length];
      }

      function planRolePill(roleKey, text = "") {
        const role = planRoles[roleKey];
        if (!role || !role.capacity) return "";
        return `<span class="pill plan-role ${role.className}">${escapeHtml(text || role.badge)}</span>`;
      }

      function renderPlanPreview(player, compactView = false) {
        const slot = planRoleSlot(player.id);
        if (!slot) {
          const fallback = defaultPlanRole(player);
          return `
            <div class="plan-preview">
              <div class="plan-preview-head">
                <strong>No fixed match-plan role</strong>
                ${fallback ? planRolePill(fallback, "Auto") : ""}
              </div>
              <small>Assign Offensive, Rune, Top, or Bottom to map this current player to the timeline and Legion duties.</small>
            </div>
          `;
        }
        const phases = compactView ? slot.role.phases.slice(0, 2) : slot.role.phases;
        return `
          <div class="plan-preview">
            <div class="plan-preview-head">
              <strong>${escapeHtml(slot.role.label)} slot ${slot.index}/${slot.role.capacity}</strong>
              ${planRolePill(slot.roleKey, slot.role.badge)}
            </div>
            <small>${escapeHtml(slot.role.description)} ${slot.count > slot.role.capacity ? `Slot pattern repeats for ${slot.count} assigned players.` : ""}</small>
            <div class="plan-phases">
              ${phases
                .map((phase) => {
                  const task = roleSlotTask(phase, slot.index);
                  return `
                    <div class="plan-phase">
                      <strong>${escapeHtml(phase.time)} - ${escapeHtml(task?.name || slot.role.label)}</strong>
                      <div class="plan-legions">
                        <span><b>L1:</b> ${escapeHtml(task?.l1 || "")}</span>
                        <span><b>L2:</b> ${escapeHtml(task?.l2 || "")}</span>
                        <span>${escapeHtml(phase.note || "")}</span>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        `;
      }

      // Plan-chrome lookup. Falls back English -> supplied text, so a missing translation
      // degrades to readable copy rather than "undefined".
      function tr(locale, key, fallback) {
        const c = localeCopy(locale);
        const v = c && c[key];
        if (typeof v === "string" && v) return v;
        const e = planLocaleCopy.en[key];
        return typeof e === "string" && e ? e : (fallback || key);
      }

      function localeCopy(locale) {
        return planLocaleCopy[normalizeLocale(locale)] || planLocaleCopy.en;
      }

      function localizedRole(roleKey, locale) {
        const copy = localeCopy(locale);
        const value = copy[roleKey] || planLocaleCopy.en[roleKey] || [planRoles[roleKey]?.label || "Role", planRoles[roleKey]?.description || ""];
        return { label: value[0], description: value[1] };
      }

      const stage1Labels = {
        en: "Stage 1",
        es: "Etapa 1",
        pt: "Etapa 1",
        de: "Phase 1",
        fr: "Phase 1",
        hr: "Faza 1",
        tr: "Asama 1",
        ru: "Этап 1",
        id: "Tahap 1",
        zh: "阶段 1",
        kr: "1단계",
        it: "Fase 1",
        ar: "المرحلة 1",
      };

      const stageRoleTranslations = {
        "Offensive Team": {
          es: "Equipo ofensivo", pt: "Equipe ofensiva", de: "Offensivteam", fr: "Equipe offensive", hr: "Ofenzivni tim", tr: "Ofansif takim", ru: "Атакующая команда", id: "Tim ofensif", zh: "进攻队", kr: "공격팀", it: "Squadra offensiva",
        },
        "Rune Team": {
          es: "Equipo de runa", pt: "Equipe de runa", de: "Runenteam", fr: "Equipe rune", hr: "Tim rune", tr: "Rune takimi", ru: "Команда руны", id: "Tim rune", zh: "符文队", kr: "룬 팀", it: "Squadra runa",
        },
        "Joker Team": {
          es: "Equipo comodin", pt: "Equipe coringa", de: "Jokerteam", fr: "Equipe joker", hr: "Joker tim", tr: "Joker takimi", ru: "Команда джокер", id: "Tim joker", zh: "机动队", kr: "조커 팀", it: "Squadra jolly",
        },
        "Defensive Team - Top": {
          es: "Defensa - arriba", pt: "Defesa - superior", de: "Verteidigung - oben", fr: "Defense - haut", hr: "Obrana - gore", tr: "Savunma - ust", ru: "Защита - верх", id: "Pertahanan - atas", zh: "防守队 - 上路", kr: "방어팀 - 상단", it: "Difesa - alto",
        },
        "Defensive Team - Bot": {
          es: "Defensa - abajo", pt: "Defesa - inferior", de: "Verteidigung - unten", fr: "Defense - bas", hr: "Obrana - dolje", tr: "Savunma - alt", ru: "Защита - низ", id: "Pertahanan - bawah", zh: "防守队 - 下路", kr: "방어팀 - 하단", it: "Difesa - basso",
        },
        Support: {
          es: "Apoyo", pt: "Apoio", de: "Unterstützung", fr: "Soutien", hr: "Podrska", tr: "Destek", ru: "Поддержка", id: "Dukungan", zh: "支援", kr: "지원", it: "Supporto",
        },
      };

      const stageTaskTranslations = {
        "No Teleport": {
          es: "Sin teletransporte", pt: "Sem teletransporte", de: "Kein Teleport", fr: "Pas de teleportation", hr: "Bez teleportacije", tr: "Teleport yok", ru: "Без телепорта", id: "Tanpa teleport", zh: "不传送", kr: "텔레포트 없음", it: "Nessun teletrasporto",
        },
        "Flex support": {
          es: "Apoyo flexible", pt: "Apoio flexivel", de: "Flexible Unterstützung", fr: "Soutien flexible", hr: "Fleksibilna podrska", tr: "Esnek destek", ru: "Гибкая поддержка", id: "Dukungan fleksibel", zh: "机动支援", kr: "유연 지원", it: "Supporto flessibile",
        },
        "Capture & Defend Our Command Center [CC1]": {
          es: "Capturar y defender nuestro Centro de Mando [CC1]", pt: "Capturar e defender nosso Centro de Comando [CC1]", de: "Unser Kommandozentrum [CC1] einnehmen und verteidigen", fr: "Capturer et defendre notre Centre de commandement [CC1]", hr: "Zauzmi i brani nas zapovjedni centar [CC1]", tr: "Komuta Merkezimizi [CC1] ele gecir ve savun", ru: "Захватить и защищать наш командный центр [CC1]", id: "Rebut dan pertahankan Command Center kita [CC1]", zh: "占领并防守我方指挥中心 [CC1]", kr: "우리 지휘 센터 [CC1] 점령 및 방어", it: "Cattura e difendi il nostro Centro di Comando [CC1]",
        },
        "Capture & Defend Our Bot Outposts [OP1]": {
          es: "Capturar y defender nuestros puestos inferiores [OP1]", pt: "Capturar e defender nossos postos inferiores [OP1]", de: "Unsere unteren Aussenposten [OP1] einnehmen und verteidigen", fr: "Capturer et defendre nos avant-postes du bas [OP1]", hr: "Zauzmi i brani nase donje predstraze [OP1]", tr: "Alt karakollarimizi [OP1] ele gecir ve savun", ru: "Захватить и защищать наши нижние аванпосты [OP1]", id: "Rebut dan pertahankan outpost bawah kita [OP1]", zh: "占领并防守我方下路哨站 [OP1]", kr: "우리 하단 전초기지 [OP1] 점령 및 방어", it: "Cattura e difendi i nostri avamposti bassi [OP1]",
        },
        "Capture Enemy Command Center [CC2]": {
          es: "Capturar el Centro de Mando enemigo [CC2]", pt: "Capturar o Centro de Comando inimigo [CC2]", de: "Feindliches Kommandozentrum [CC2] einnehmen", fr: "Capturer le Centre de commandement ennemi [CC2]", hr: "Zauzmi neprijateljski zapovjedni centar [CC2]", tr: "Dusman Komuta Merkezini [CC2] ele gecir", ru: "Захватить вражеский командный центр [CC2]", id: "Rebut Command Center musuh [CC2]", zh: "占领敌方指挥中心 [CC2]", kr: "적 지휘 센터 [CC2] 점령", it: "Cattura il Centro di Comando nemico [CC2]",
        },
        "Capture Enemy Outpost [OP2]": {
          es: "Capturar el puesto enemigo [OP2]", pt: "Capturar o posto inimigo [OP2]", de: "Feindlichen Aussenposten [OP2] einnehmen", fr: "Capturer l'avant-poste ennemi [OP2]", hr: "Zauzmi neprijateljsku predstrazu [OP2]", tr: "Dusman karakolunu [OP2] ele gecir", ru: "Захватить вражеский аванпост [OP2]", id: "Rebut outpost musuh [OP2]", zh: "占领敌方哨站 [OP2]", kr: "적 전초기지 [OP2] 점령", it: "Cattura l'avamposto nemico [OP2]",
        },
        "Build Towers - T1s & Speed Heroes": {
          es: "Construir torres - T1 y heroes de velocidad", pt: "Construir torres - T1 e herois de velocidade", de: "Turme bauen - T1 und Speed-Helden", fr: "Construire des tours - T1 et heros de vitesse", hr: "Gradi tornjeve - T1 i speed heroji", tr: "Kule insa et - T1 ve hiz kahramanlari", ru: "Строить башни - T1 и герои скорости", id: "Bangun tower - T1 dan hero speed", zh: "建造塔 - T1 与速度英雄", kr: "타워 건설 - T1 및 속도 영웅", it: "Costruisci torri - T1 ed eroi velocita",
        },
        "Gather Crystals - T1s": {
          es: "Recolectar cristales - T1", pt: "Coletar cristais - T1", de: "Kristalle sammeln - T1", fr: "Recueillir des cristaux - T1", hr: "Skupljaj kristale - T1", tr: "Kristal topla - T1", ru: "Собирать кристаллы - T1", id: "Kumpulkan kristal - T1", zh: "采集水晶 - T1", kr: "수정 채집 - T1", it: "Raccogli cristalli - T1",
        },
        "Secure TOP Fortress of Honor [FH1]": {
          es: "Asegurar la Fortaleza de Honor superior [FH1]", pt: "Proteger a Fortaleza de Honra superior [FH1]", de: "Obere Ehrenfestung [FH1] sichern", fr: "Securiser la Forteresse d'Honneur superieure [FH1]", hr: "Osiguraj gornju Tvrdavu casti [FH1]", tr: "Ust Honor Fortress [FH1] guvenceye al", ru: "Закрепить верхнюю Крепость Чести [FH1]", id: "Amankan Fortress of Honor atas [FH1]", zh: "控制上方荣耀堡垒 [FH1]", kr: "상단 명예 요새 [FH1] 확보", it: "Assicura la Fortezza d'Onore alta [FH1]",
        },
        "Secure BOT Fortress of Honor [FH2]": {
          es: "Asegurar la Fortaleza de Honor inferior [FH2]", pt: "Proteger a Fortaleza de Honra inferior [FH2]", de: "Untere Ehrenfestung [FH2] sichern", fr: "Securiser la Forteresse d'Honneur inferieure [FH2]", hr: "Osiguraj donju Tvrdavu casti [FH2]", tr: "Alt Honor Fortress [FH2] guvenceye al", ru: "Закрепить нижнюю Крепость Чести [FH2]", id: "Amankan Fortress of Honor bawah [FH2]", zh: "控制下方荣耀堡垒 [FH2]", kr: "하단 명예 요새 [FH2] 확보", it: "Assicura la Fortezza d'Onore bassa [FH2]",
        },
        "Capture & Defend Our Hospital [H1]": {
          es: "Capturar y defender nuestro Hospital [H1]", pt: "Capturar e defender nosso Hospital [H1]", de: "Unser Hospital [H1] einnehmen und verteidigen", fr: "Capturer et defendre notre Hopital [H1]", hr: "Zauzmi i brani nasu bolnicu [H1]", tr: "Hastanemizi [H1] ele gecir ve savun", ru: "Захватить и защищать наш госпиталь [H1]", id: "Rebut dan pertahankan Hospital kita [H1]", zh: "占领并防守我方医院 [H1]", kr: "우리 병원 [H1] 점령 및 방어", it: "Cattura e difendi il nostro Ospedale [H1]",
        },
        "Capture & Defend Our Arsenal [A1]": {
          es: "Capturar y defender nuestro Arsenal [A1]", pt: "Capturar e defender nosso Arsenal [A1]", de: "Unser Arsenal [A1] einnehmen und verteidigen", fr: "Capturer et defendre notre Arsenal [A1]", hr: "Zauzmi i brani nas arsenal [A1]", tr: "Cephaneligimizi [A1] ele gecir ve savun", ru: "Захватить и защищать наш арсенал [A1]", id: "Rebut dan pertahankan Arsenal kita [A1]", zh: "占领并防守我方军械库 [A1]", kr: "우리 무기고 [A1] 점령 및 방어", it: "Cattura e difendi il nostro Arsenale [A1]",
        },
        "Attack Enemy Towers": {
          es: "Atacar torres enemigas", pt: "Atacar torres inimigas", de: "Feindliche Turme angreifen", fr: "Attaquer les tours ennemies", hr: "Napadaj neprijateljske tornjeve", tr: "Dusman kulelerine saldir", ru: "Атаковать вражеские башни", id: "Serang tower musuh", zh: "攻击敌方塔", kr: "적 타워 공격", it: "Attacca le torri nemiche",
        },
        "Attack Enemy Arsenal [A2]": {
          es: "Atacar el Arsenal enemigo [A2]", pt: "Atacar o Arsenal inimigo [A2]", de: "Feindliches Arsenal [A2] angreifen", fr: "Attaquer l'Arsenal ennemi [A2]", hr: "Napadni neprijateljski arsenal [A2]", tr: "Dusman Cephaneligine [A2] saldir", ru: "Атаковать вражеский арсенал [A2]", id: "Serang Arsenal musuh [A2]", zh: "攻击敌方军械库 [A2]", kr: "적 무기고 [A2] 공격", it: "Attacca l'Arsenale nemico [A2]",
        },
        "Capture Enemy Hospital [H2]": {
          es: "Capturar el Hospital enemigo [H2]", pt: "Capturar o Hospital inimigo [H2]", de: "Feindliches Hospital [H2] einnehmen", fr: "Capturer l'Hopital ennemi [H2]", hr: "Zauzmi neprijateljsku bolnicu [H2]", tr: "Dusman Hastanesini [H2] ele gecir", ru: "Захватить вражеский госпиталь [H2]", id: "Rebut Hospital musuh [H2]", zh: "占领敌方医院 [H2]", kr: "적 병원 [H2] 점령", it: "Cattura l'Ospedale nemico [H2]",
        },
        "Build Towers - T9s": {
          es: "Construir torres - T9", pt: "Construir torres - T9", de: "Turme bauen - T9", fr: "Construire des tours - T9", hr: "Gradi tornjeve - T9", tr: "Kule insa et - T9", ru: "Строить башни - T9", id: "Bangun tower - T9", zh: "建造塔 - T9", kr: "타워 건설 - T9", it: "Costruisci torri - T9",
        },
        "Attack Enemy Towers / Enemy Castles": {
          es: "Atacar torres enemigas / castillos enemigos", pt: "Atacar torres inimigas / castelos inimigos", de: "Feindliche Turme / feindliche Burgen angreifen", fr: "Attaquer les tours ennemies / chateaux ennemis", hr: "Napadaj neprijateljske tornjeve / dvorce", tr: "Dusman kulelerine / kalelerine saldir", ru: "Атаковать вражеские башни / замки", id: "Serang tower musuh / kastel musuh", zh: "攻击敌方塔 / 敌方城堡", kr: "적 타워 / 적 성 공격", it: "Attacca torri nemiche / castelli nemici",
        },
        "Protect Rune at Relay (or attack enemy Rune path)": {
          es: "Proteger la runa en el relevo (o atacar la ruta de runa enemiga)", pt: "Proteger a runa no revezamento (ou atacar a rota da runa inimiga)", de: "Rune am Relay schutzen (oder feindlichen Runenweg angreifen)", fr: "Proteger la rune au relais (ou attaquer le chemin de rune ennemi)", hr: "Stiti runu na relayu (ili napadaj neprijateljski put rune)", tr: "Rune'u relayde koru (veya dusman rune yoluna saldir)", ru: "Защищать руну на реле (или атаковать путь руны врага)", id: "Lindungi rune di relay (atau serang jalur rune musuh)", zh: "在中继点保护符文（或攻击敌方符文路线）", kr: "릴레이에서 룬 보호(또는 적 룬 경로 공격)", it: "Proteggi la runa al relay (o attacca il percorso runa nemico)",
        },
        "Protect Rune at Relay (Garrison/Defend Rune)": {
          es: "Proteger la runa en el relevo (guarnecer/defender)", pt: "Proteger a runa no revezamento (guarnecer/defender)", de: "Rune am Relay schutzen (garnisonieren/verteidigen)", fr: "Proteger la rune au relais (garnir/defendre)", hr: "Stiti runu na relayu (garnizon/obrana)", tr: "Rune'u relayde koru (garnizon/savun)", ru: "Защищать руну на реле (гарнизон/оборона)", id: "Lindungi rune di relay (garnisun/bertahan)", zh: "在中继点保护符文（驻防/防守）", kr: "릴레이에서 룬 보호(주둔/방어)", it: "Proteggi la runa al relay (presidio/difesa)",
        },
        "TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes": {
          es: "TOMAR LA RUNA (corredor principal) - T1 y heroes de velocidad", pt: "PEGAR A RUNA (corredor principal) - T1 e herois de velocidade", de: "RUNE NEHMEN (primarer Runentrager) - T1 und Speed-Helden", fr: "PRENDRE LA RUNE (coureur principal) - T1 et heros de vitesse", hr: "UZMI RUNU (glavni nosac) - T1 i speed heroji", tr: "RUNE'U AL (ana tasiyici) - T1 ve hiz kahramanlari", ru: "ВЗЯТЬ РУНУ (основной бегун) - T1 и герои скорости", id: "AMBIL RUNE (runner utama) - T1 dan hero speed", zh: "拿取符文（主跑者）- T1 与速度英雄", kr: "룬 획득(주 룬 러너) - T1 및 속도 영웅", it: "PRENDI LA RUNA (runner principale) - T1 ed eroi velocita",
        },
        "Protect Rune at Relay (Reinforce as needed)": {
          es: "Proteger la runa en el relevo (reforzar si hace falta)", pt: "Proteger a runa no revezamento (reforcar se necessario)", de: "Rune am Relay schutzen (bei Bedarf verstarken)", fr: "Proteger la rune au relais (renforcer si besoin)", hr: "Stiti runu na relayu (po potrebi pojacaj)", tr: "Rune'u relayde koru (gerekirse takviye et)", ru: "Защищать руну на реле (усиливать при необходимости)", id: "Lindungi rune di relay (perkuat jika perlu)", zh: "在中继点保护符文（需要时增援）", kr: "릴레이에서 룬 보호(필요 시 지원)", it: "Proteggi la runa al relay (rinforza se necessario)",
        },
        "Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map": {
          es: "Teletransportarse a Torre 3 [T3] - estar en el lado opuesto al mapa inferior", pt: "Teletransporte para Torre 3 [T3] - fique no lado oposto ao mapa inferior", de: "Teleport zu Turm 3 [T3] - auf der Gegenseite der unteren Karte sein", fr: "Teleportation vers Tour 3 [T3] - etre du cote oppose a la carte bas", hr: "Teleport na toranj 3 [T3] - budi na suprotnoj strani donje mape", tr: "Kule 3'e [T3] teleport ol - alt haritanin karsi tarafinda ol", ru: "Телепорт к башне 3 [T3] - быть на стороне напротив нижней карты", id: "Teleport ke Tower 3 [T3] - berada di sisi berlawanan map bawah", zh: "传送到塔 3 [T3] - 站在下路地图对侧", kr: "타워 3 [T3]로 텔레포트 - 하단 맵 반대편에 위치", it: "Teletrasporto alla Torre 3 [T3] - lato opposto alla mappa bassa",
        },
        "Teleport to Relay1 [RP1] - Tower 5 [T5]": {
          es: "Teletransportarse a Relevo1 [RP1] - Torre 5 [T5]", pt: "Teletransporte para Revezamento1 [RP1] - Torre 5 [T5]", de: "Teleport zu Relay1 [RP1] - Turm 5 [T5]", fr: "Teleportation vers Relais1 [RP1] - Tour 5 [T5]", hr: "Teleport na Relay1 [RP1] - toranj 5 [T5]", tr: "Relay1'e [RP1] teleport ol - Kule 5 [T5]", ru: "Телепорт к Relay1 [RP1] - башня 5 [T5]", id: "Teleport ke Relay1 [RP1] - Tower 5 [T5]", zh: "传送到 Relay1 [RP1] - 塔 5 [T5]", kr: "Relay1 [RP1]로 텔레포트 - 타워 5 [T5]", it: "Teletrasporto a Relay1 [RP1] - Torre 5 [T5]",
        },
        "Teleport to Relay2 [RP2] - Tower 7 [T7]": {
          es: "Teletransportarse a Relevo2 [RP2] - Torre 7 [T7]", pt: "Teletransporte para Revezamento2 [RP2] - Torre 7 [T7]", de: "Teleport zu Relay2 [RP2] - Turm 7 [T7]", fr: "Teleportation vers Relais2 [RP2] - Tour 7 [T7]", hr: "Teleport na Relay2 [RP2] - toranj 7 [T7]", tr: "Relay2'ye [RP2] teleport ol - Kule 7 [T7]", ru: "Телепорт к Relay2 [RP2] - башня 7 [T7]", id: "Teleport ke Relay2 [RP2] - Tower 7 [T7]", zh: "传送到 Relay2 [RP2] - 塔 7 [T7]", kr: "Relay2 [RP2]로 텔레포트 - 타워 7 [T7]", it: "Teletrasporto a Relay2 [RP2] - Torre 7 [T7]",
        },
        "Teleport to Center Building [S] - Tower 8/9 [T8/T9]": {
          es: "Teletransportarse al edificio central [S] - Torre 8/9 [T8/T9]", pt: "Teletransporte para o edificio central [S] - Torre 8/9 [T8/T9]", de: "Teleport zum Zentralgebaude [S] - Turm 8/9 [T8/T9]", fr: "Teleportation au batiment central [S] - Tour 8/9 [T8/T9]", hr: "Teleport na sredisnju zgradu [S] - toranj 8/9 [T8/T9]", tr: "Merkez binaya [S] teleport ol - Kule 8/9 [T8/T9]", ru: "Телепорт к центральному зданию [S] - башня 8/9 [T8/T9]", id: "Teleport ke bangunan tengah [S] - Tower 8/9 [T8/T9]", zh: "传送到中央建筑 [S] - 塔 8/9 [T8/T9]", kr: "중앙 건물 [S]로 텔레포트 - 타워 8/9 [T8/T9]", it: "Teletrasporto all'edificio centrale [S] - Torre 8/9 [T8/T9]",
        },
        "Understand every role and be ready to replace anyone if needed": {
          es: "Entender todos los roles y estar listo para reemplazar a cualquiera si hace falta", pt: "Entender todos os papeis e estar pronto para substituir qualquer um se necessario", de: "Alle Rollen verstehen und bei Bedarf jeden ersetzen konnen", fr: "Comprendre tous les roles et etre pret a remplacer n'importe qui si besoin", hr: "Razumij sve uloge i budi spreman zamijeniti bilo koga", tr: "Tum rolleri anla ve gerekirse herkesi degistirmeye hazir ol", ru: "Понимать все роли и быть готовым заменить любого при необходимости", id: "Pahami semua peran dan siap mengganti siapa pun jika diperlukan", zh: "理解所有角色，并在需要时准备替补任何人", kr: "모든 역할을 이해하고 필요 시 누구든 대체할 준비", it: "Comprendi tutti i ruoli e sii pronto a sostituire chiunque se serve",
        },
        "Stay available for connection issues, tower help, or rune defense": {
          es: "Mantente disponible por desconexiones, apoyo en torres o defensa de runa", pt: "Fique disponivel para problemas de conexao, ajuda em torres ou defesa da runa", de: "Bereit bleiben fur Verbindungsprobleme, Turmhilfe oder Runenverteidigung", fr: "Rester disponible pour problemes de connexion, aide aux tours ou defense de rune", hr: "Budi dostupan za probleme veze, pomoc oko tornjeva ili obranu rune", tr: "Baglanti sorunlari, kule yardimi veya rune savunmasi icin hazir kal", ru: "Оставаться доступным при проблемах связи, помощи башням или защите руны", id: "Siap untuk masalah koneksi, bantuan tower, atau pertahanan rune", zh: "随时处理掉线、支援建塔或防守符文", kr: "접속 문제, 타워 지원 또는 룬 방어에 대비", it: "Resta disponibile per problemi di connessione, aiuto torri o difesa runa",
        },
      };

      function stage1Label(locale) {
        return stage1Labels[normalizeLocale(locale)] || stage1Labels.en;
      }

      function localizedStageRole(value, locale) {
        const normalizedLocale = normalizeLocale(locale);
        return stageRoleTranslations[value]?.[normalizedLocale] || stageRoleTranslations[value]?.en || value;
      }

      function localizedStageText(value, locale) {
        const cleaned = String(value || "").replace(/\.$/, "");
        const normalizedLocale = normalizeLocale(locale);
        return stageTaskTranslations[cleaned]?.[normalizedLocale] || stageTaskTranslations[cleaned]?.en || value;
      }

      function localizedTimeLabel(value, locale) {
        const normalizedLocale = normalizeLocale(locale);
        const suffix = {
          en: "Minutes",
          es: "Minutos",
          pt: "Minutos",
          de: "Minuten",
          fr: "Minutes",
          hr: "Minuta",
          tr: "Dakika",
          ru: "минут",
          id: "Menit",
          zh: "分钟",
          kr: "분",
          it: "Minuti",
        }[normalizedLocale] || "Minutes";
        return String(value || "").replace(/Minutes/i, suffix);
      }

      function dominantTeamLocale(team) {
        const counts = (team?.players || []).reduce((next, player) => {
          const locale = normalizeLocale(player.locale);
          next[locale] = (next[locale] || 0) + 1;
          return next;
        }, {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "en";
      }

      function rolePlanSummaryCopy(locale) {
        const copies = {
          en: { buildFocus: "Build focus", center: "Center builders", top: "Top builders", bottom: "Bot builders", rune: "Rune / support", titleBadges: "Title badge players", available: "Available", none: "None assigned" },
          es: { buildFocus: "Enfoque de construccion", center: "Constructores centro", top: "Constructores arriba", bottom: "Constructores abajo", rune: "Runa / apoyo", titleBadges: "Jugadores de insignias", available: "Disponible", none: "Sin asignar" },
          pt: { buildFocus: "Foco de construcao", center: "Construtores centro", top: "Construtores topo", bottom: "Construtores baixo", rune: "Runa / apoio", titleBadges: "Jogadores de emblemas", available: "Disponivel", none: "Nao atribuido" },
          de: { buildFocus: "Bau-Fokus", center: "Mitte-Bauer", top: "Oben-Bauer", bottom: "Unten-Bauer", rune: "Rune / Support", titleBadges: "Titelabzeichen-Spieler", available: "Verfugbar", none: "Nicht zugewiesen" },
          fr: { buildFocus: "Focus construction", center: "Batisseurs centre", top: "Batisseurs haut", bottom: "Batisseurs bas", rune: "Rune / soutien", titleBadges: "Joueurs badges titre", available: "Disponible", none: "Non assigne" },
          hr: { buildFocus: "Fokus gradnje", center: "Graditelji centra", top: "Graditelji gore", bottom: "Graditelji dolje", rune: "Runa / podrska", titleBadges: "Igraci naslovnih znacki", available: "Dostupno", none: "Nije dodijeljeno" },
          tr: { buildFocus: "Insaat odagi", center: "Merkez kuruculari", top: "Ust kurucular", bottom: "Alt kurucular", rune: "Rune / destek", titleBadges: "Unvan rozeti oyunculari", available: "Musait", none: "Atanmadi" },
          ru: { buildFocus: "Фокус строительства", center: "Строители центра", top: "Строители верха", bottom: "Строители низа", rune: "Руна / поддержка", titleBadges: "Игроки титульных значков", available: "Доступно", none: "Не назначено" },
          id: { buildFocus: "Fokus build", center: "Builder tengah", top: "Builder atas", bottom: "Builder bawah", rune: "Rune / dukungan", titleBadges: "Pemain badge titel", available: "Tersedia", none: "Belum ditetapkan" },
          zh: { buildFocus: "建造重点", center: "中路建造者", top: "上路建造者", bottom: "下路建造者", rune: "符文 / 支援", titleBadges: "称号徽章玩家", available: "可用", none: "未分配" },
          kr: { buildFocus: "건설 담당", center: "중앙 건설", top: "상단 건설", bottom: "하단 건설", rune: "룬 / 지원", titleBadges: "칭호 배지 플레이어", available: "가능", none: "미지정" },
          it: { buildFocus: "Focus costruzione", center: "Costruttori centro", top: "Costruttori alto", bottom: "Costruttori basso", rune: "Runa / supporto", titleBadges: "Giocatori badge titolo", available: "Disponibile", none: "Non assegnato" },
        };
        return copies[normalizeLocale(locale)] || copies.en;
      }

      function namesForRole(rows, roleKey) {
        return rows.filter((row) => row.roleKey === roleKey).map((row) => row.player.name).join(", ");
      }

      function stage1Assignment(position, phase) {
        const row = phase.rows[position];
        if (row) return row;
        return {
          stageRole: "Support",
          l1: "Understand every role and be ready to replace anyone if needed",
          l2: "Stay available for connection issues, tower help, or rune defense",
          note: "Flex support",
        };
      }

      function teamRolePlanRows(team) {
        const ranked = scoreRankedTeamPlayers(team).slice(0, 12);
        const positionById = new Map(ranked.map((p, i) => [String(p.id), i + 1]));
        return ranked.map((player, index) => {
          const position = index + 1;
          const sub = player.backup ? substitutionFor(player.id) : null;
          // A substituted-in backup inherits the replaced player's slot, and the plan is
          // position-driven, so borrowing the position borrows the role and the orders.
          const inheritedPosition = sub?.replacesId ? positionById.get(sub.replacesId) || position : position;
          const activeFrom = player.backup ? subEntryPhase(player) : 0;
          const effectivePosition = (i) => (player.backup && i >= activeFrom ? inheritedPosition : position);
          const roleKey =
            (player.backup && sub?.replacesId
              ? assignedPlanRole(ranked[inheritedPosition - 1]) || scoreRankRoleMap[inheritedPosition]
              : assignedPlanRole(player) || scoreRankRoleMap[position]) || "flexible";
          return {
            player,
            position,
            roleKey,
            inheritedPosition,
            substitution: sub,
            role: localizedRole(roleKey, player.locale),
            phases: stage1Flow.map((phase, i) => ({
              ...phase,
              assignment: stage1Assignment(effectivePosition(i), phase),
            })),
          };
        });
      }

      function cloneCommandOverrides(source = defaultCommandOverridesById) {
        return JSON.parse(JSON.stringify(source || {}));
      }

      function lockRuleId(playerId) {
        return `lock:${playerId}`;
      }

      function userLockRuleId(playerId, teamId) {
        return `user-lock:${playerId}:${teamId}`;
      }

      function commandRuleId(teamId, role, playerId) {
        return `command:${teamId}:${role}:${playerId}`;
      }

      function top4RuleId(kind, playerId) {
        return `top4:${kind}:${playerId}`;
      }

      function teamPinRuleId(teamId, power) {
        return `team-pin:${teamId}:${power}`;
      }

      function buddyRuleId(index) {
        return `buddy:${index}`;
      }

      function ruleActive(ruleId) {
        return overridesEnabled && !disabledOverrideRules.has(ruleId);
      }

      function teamTier(team) {
        return team.tier || "tier1";
      }

      function totalConfiguredTeams(config = tierConfig) {
        return Number(config.tier1Count || 0) + Number(config.tier2Count || 0) + Number(config.tier3Count || 0);
      }

      function tierForIndex(index, config = tierConfig) {
        if (index < Number(config.tier1Count || 0)) return "tier1";
        if (index < Number(config.tier1Count || 0) + Number(config.tier2Count || 0)) return "tier2";
        return "tier3";
      }

      function tierIndexForTeamIndex(index, config = tierConfig) {
        const tier = tierForIndex(index, config);
        if (tier === "tier1") return index;
        if (tier === "tier2") return index - Number(config.tier1Count || 0);
        return index - Number(config.tier1Count || 0) - Number(config.tier2Count || 0);
      }

      function initialPlayerRecords() {
        return allInitialTeams.flatMap((team) =>
          team.players.map((player, index) => ({
            id: stableIdByInitialSlot.get(`${team.id}:${index}`),
            teamId: team.id,
            teamName: team.name,
            tier: team.tier || "tier1",
            name: player[0],
            power: player[2],
            locked: player[5].includes("lock"),
          }))
        );
      }

      function allPlayers() {
        return teams.flatMap((team) => team.players).concat(reservePlayers);
      }

      function playerNameById(playerId) {
        return (
          allPlayers().find((player) => player.id === playerId)?.name ||
          canonicalInitialById.get(playerId)?.name ||
          playerId
        );
      }

      function overrideRules() {
        const rules = [
          {
            id: "tier:separate",
            group: "Movement",
            label: "Keep tiers separate",
            detail: "Suggestions only swap inside the same tier.",
          },
          {
            id: "core:top4",
            group: "Movement",
            label: "Keep every team at 12 castles",
            detail: "Suggestions keep team sizes stable; Non-VTS count is informational now.",
          },
        ];

        top4InPowers.forEach((power) => {
          const id = resolveInitialPower(power, "Tier1 safeguard");
          rules.push({
            id: top4RuleId("in", id),
            group: "Roster safeguards",
            label: `${playerNameById(id)} stays in Tier1`,
            detail: "Keeps this player in the Tier1 team pool.",
          });
        });
        top4OutPowers.forEach((power) => {
          const id = resolveInitialPower(power, "Tier1 safeguard");
          rules.push({
            id: top4RuleId("out", id),
            group: "Roster safeguards",
            label: `${playerNameById(id)} stays out of Tier1`,
            detail: "Keeps this player outside the Tier1 team pool.",
          });
        });

        Object.entries(defaultTeamMemberPowers).forEach(([teamId, entries]) => {
          const teamName = teams.find((team) => team.id === teamId)?.name || teamId;
          entries.forEach((entry) => {
            const power = Number(typeof entry === "object" ? entry.power : entry);
            const homeTeamId = typeof entry === "object" ? entry.homeTeamId || "" : "";
            const id = resolveInitialPower(power, `${teamName} pin`, homeTeamId);
            rules.push({
              id: teamPinRuleId(teamId, power),
              group: "Team pins",
              label: `${playerNameById(id)} fixed in ${teamName}`,
              detail: "Keeps this player on the selected team and protects them from swaps.",
            });
          });
        });

        defaultBuddyPowerGroups.forEach((powers, index) => {
          const names = powers.map((power) => playerNameById(resolveInitialPower(power, "Buddy rule"))).join(" + ");
          rules.push({
            id: buddyRuleId(index),
            group: "Team pins",
            label: `${names} stay together`,
            detail: "Keeps this pair on the same team and protects both from swaps.",
          });
        });

        Object.entries(commandOverrides).forEach(([teamId, override]) => {
          const teamName = teams.find((team) => team.id === teamId)?.name || teamId;
          if (override.leaderId) {
            rules.push({
              id: commandRuleId(teamId, "leader", override.leaderId),
              group: "Command",
              label: `${playerNameById(override.leaderId)} leader for ${teamName}`,
              detail: "Turn off to let the board auto-pick that team's leader.",
            });
          }
          (override.coleaderIds || []).forEach((playerId) => {
            rules.push({
              id: commandRuleId(teamId, "coleader", playerId),
              group: "Command",
              label: `${playerNameById(playerId)} co-leader for ${teamName}`,
              detail: "Turn off to let the board auto-pick this co-leader.",
            });
          });
        });

        return rules;
      }

      function renderOverridesPanel() {
        const panel = document.getElementById("overridePanel");
        if (!panel) return;
        const grouped = overrideRules().reduce((groups, rule) => {
          groups[rule.group] = groups[rule.group] || [];
          groups[rule.group].push(rule);
          return groups;
        }, {});
        panel.innerHTML = `
          <div class="tier-counts">
            <div class="field">
              <label for="tier1Count">Tier1 teams</label>
              <select id="tier1Count">
                ${[3, 4, 5, 6].map((count) => `<option value="${count}" ${tierConfig.tier1Count === count ? "selected" : ""}>${count}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="tier2Count">Tier2 teams</label>
              <select id="tier2Count">
                ${[1, 2, 3, 4].map((count) => `<option value="${count}" ${tierConfig.tier2Count === count ? "selected" : ""}>${count}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="tier3Count">Tier3 teams</label>
              <select id="tier3Count">
                ${[0, 1, 2].map((count) => `<option value="${count}" ${Number(tierConfig.tier3Count || 0) === count ? "selected" : ""}>${count}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="mode-row">
            <div>
              <strong>Current overrides</strong><br />
              <small>Master switch for all pins and rules here. Language overrides stay active.</small>
            </div>
            <button class="toggle ${overridesEnabled ? "on" : ""}" id="overrideToggle" type="button" title="Toggle all listed overrides" aria-label="Toggle all listed overrides" aria-pressed="${overridesEnabled}"></button>
          </div>
          <div class="override-list">
            ${Object.entries(grouped)
              .map(
                ([group, items]) => `
                  <div class="override-group">
                    <div class="override-group-head">
                      <h3>${group}</h3>
                      <div class="override-group-actions">
                        <button class="mini-btn" data-rule-group="${group}" data-group-action="on" type="button">All</button>
                        <button class="mini-btn" data-rule-group="${group}" data-group-action="off" type="button">None</button>
                      </div>
                    </div>
                    ${items
                      .map((rule) => {
                        const checked = !disabledOverrideRules.has(rule.id);
                        const active = overridesEnabled && checked;
                        return `
                          <label class="override-item ${active ? "" : "off"}">
                            <input type="checkbox" data-rule-id="${rule.id}" ${checked ? "checked" : ""} />
                            <span><strong>${rule.label}</strong><small>${rule.detail}</small></span>
                          </label>
                        `;
                      })
                      .join("")}
                  </div>
                `
              )
              .join("")}
          </div>
        `;

        panel.querySelector("#overrideToggle").addEventListener("click", () => {
          withUndo(() => {
            overridesEnabled = !overridesEnabled;
          });
          toast(`Overrides ${overridesEnabled ? "on" : "off"} — layout unchanged. Press Rebalance to apply.`);
        });
        panel.querySelector("#tier1Count").addEventListener("change", (event) => {
          setTierCounts(Number(event.target.value), tierConfig.tier2Count, tierConfig.tier3Count);
        });
        panel.querySelector("#tier2Count").addEventListener("change", (event) => {
          setTierCounts(tierConfig.tier1Count, Number(event.target.value), tierConfig.tier3Count);
        });
        panel.querySelector("#tier3Count").addEventListener("change", (event) => {
          setTierCounts(tierConfig.tier1Count, tierConfig.tier2Count, Number(event.target.value));
        });
        panel.querySelectorAll("[data-rule-id]").forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            withUndo(() => {
              if (checkbox.checked) {
                disabledOverrideRules.delete(checkbox.dataset.ruleId);
              } else {
                disabledOverrideRules.add(checkbox.dataset.ruleId);
              }
            });
            toast("Rule updated — layout unchanged. Press Rebalance to apply.");
          });
        });
        panel.querySelectorAll("[data-rule-group]").forEach((button) => {
          button.addEventListener("click", () => {
            const groupRules = overrideRules().filter((rule) => rule.group === button.dataset.ruleGroup);
            withUndo(() => {
              groupRules.forEach((rule) => {
                if (button.dataset.groupAction === "on") {
                  disabledOverrideRules.delete(rule.id);
                } else {
                  disabledOverrideRules.add(rule.id);
                }
              });
            });
            toast("Rules updated — layout unchanged. Press Rebalance to apply.");
          });
        });
      }

      function activeLockTarget(player) {
        if (!player) return "";
        // Explicit per-player lock set by the admin.
        if (player.userLockTeamId && ruleActive(userLockRuleId(player.id, player.userLockTeamId))) {
          return player.userLockTeamId;
        }
        // Seed-data default lock pins the player to whichever team they currently sit on.
        if (player.defaultLocked && ruleActive(player.lockRuleId || lockRuleId(player.id))) {
          return findTeamIdByPlayer(player.id) || "";
        }
        return "";
      }

      function applyOverrideRules(source = teams) {
        source.forEach((team) => {
          team.players.forEach((player) => {
            if (typeof player.defaultLocked === "undefined") player.defaultLocked = Boolean(player.lockRuleId || player.locked);
            if (!player.lockRuleId && player.defaultLocked) player.lockRuleId = lockRuleId(player.id);
            player.userLockTeamId = typeof player.userLockTeamId === "string" ? player.userLockTeamId : "";
            player.locked = Boolean(activeLockTarget(player));
          });
        });
      }

      function tierTeamIds(tier) {
        return teams.filter((team) => teamTier(team) === tier).map((team) => team.id);
      }

      function visibleCapacity() {
        return teams.reduce((sum, _team, index) => sum + fullTeamFirstSize(index), 0);
      }

      function fullTeamFirstSize(index) {
        return Math.min(12, Math.max(0, expectedInventoryCount - index * 12));
      }

      function teamTargetSize(index) {
        return fullTeamFirstSize(index);
      }

      function capacityReport() {
        const visiblePlayers = teams.flatMap((team) => team.players).length;
        const requiredPlayers = Math.min(expectedInventoryCount, visibleCapacity());
        return {
          visiblePlayers,
          requiredPlayers,
          partialTeams: teams.filter((team, index) => team.players.length < teamTargetSize(index)).length,
        };
      }

      function updatePngButtons() {
        const tier1Button = document.getElementById("pngTier1Btn");
        const tier2Button = document.getElementById("pngTier2Btn");
        const tier3Button = document.getElementById("pngTier3Btn");
        const allButton = document.getElementById("pngAllBtn");
        if (tier1Button) tier1Button.textContent = `PNG T1 (${tierConfig.tier1Count})`;
        if (tier2Button) tier2Button.textContent = `PNG T2 (${tierConfig.tier2Count})`;
        if (tier3Button) tier3Button.textContent = `PNG T3 (${Number(tierConfig.tier3Count || 0)})`;
        if (allButton) allButton.textContent = `PNG all (${teams.length})`;
      }

      function clonePlayer(player) {
        return { ...player, times: Array.isArray(player.times) ? player.times.slice() : parseTimes(player.times) };
      }

      function uniquePlayers(players) {
        const seen = new Set();
        return players.filter((player) => {
          if (!player || !player.id || seen.has(player.id)) return false;
          seen.add(player.id);
          return true;
        });
      }

      function teamColor(index, tier) {
        const tier1Colors = ["teal", "coral", "amber", "violet", "green", "slate"];
        const tier2Colors = ["blue", "green", "violet", "amber", "rose", "slate", "gold"];
        const tier3Colors = ["slate", "rose", "gold", "blue"];
        if (tier === "tier1") return tier1Colors[index % tier1Colors.length];
        if (tier === "tier2") return tier2Colors[index % tier2Colors.length];
        return tier3Colors[index % tier3Colors.length];
      }

      function teamShell(index, tier, previousTeams = teams) {
        const old = previousTeams.find((team) => team.id === `team-${index + 1}`);
        return {
          id: `team-${index + 1}`,
          name: `Team ${index + 1}`,
          color: teamColor(tierIndexForTeamIndex(index), tier),
          tier,
          fightTime: old?.fightTime || "+14",
          players: [],
          targetSize: teamTargetSize(index),
        };
      }

      function canonicalPlayerClone(id) {
        const initial = canonicalInitialById.get(id);
        if (!initial) return null;
        const meta = enrichmentAliases[initial.name] || enrichment[initial.name] || {};
        const score = scoreOverrideForPower(initial.power, initial.score || initial.baseScore, initial.powerBreakdown);
        return {
          ...initial,
          score,
          baseScore: score,
          locale: normalizeLocale(initial.locale),
          leadVolunteer: Boolean(meta.lead),
          times: parseTimes(meta.times),
          availability: meta.availability || "unknown",
          roles: meta.roles || "flexible",
          defaultTeamId: initial.defaultTeamId,
          defaultLocked: Boolean(initial.defaultLocked),
          lockRuleId: initial.defaultLocked ? lockRuleId(id) : "",
          userLockTeamId: "",
          locked: Boolean(initial.defaultLocked),
          backup: Boolean(initial.backup),
          main: Boolean(initial.main),
          planRole: normalizePlanRole(initial.planRole),
          titleRole: titleRoles[initial.titleRole] ? initial.titleRole : "",
          titleRoleNote: typeof initial.titleRoleNote === "string" ? initial.titleRoleNote : "",
          commitment: commitmentOverrideForPower(initial.power, initial.commitment),
        };
      }

      function currentPlayerPool() {
        const byId = new Map();
        teams.flatMap((team) => team.players).concat(reservePlayers).forEach((player) => {
          if (player?.id && canonicalInitialById.has(player.id) && !byId.has(player.id)) byId.set(player.id, clonePlayer(player));
        });
        canonicalInitialById.forEach((_player, id) => {
          if (!byId.has(id)) byId.set(id, canonicalPlayerClone(id));
        });
        return [...byId.values()].filter(Boolean);
      }

      function isBenchedPlayer(playerId) {
        return benchedPlayerIds.has(playerId);
      }

      function rankedPlayers(players) {
        return uniquePlayers(players)
          .slice()
          .sort((a, b) => b.score - a.score || (a.rank || 999) - (b.rank || 999) || a.id.localeCompare(b.id));
      }

      function reshapeFromPool(pool) {
        const allocation = buildConstrainedAllocation(pool);
        solverConflicts = allocation.conflicts;
        // Never commit a conflicted allocation over the current board — it may leave pinned
        // players misplaced or teams partially filled. Surface the conflict and keep the board.
        if (allocation.conflicts.length) {
          toast(`Reshape blocked: ${allocation.conflicts[0]}`);
          return false;
        }
        teams = allocation.teams;
        reservePlayers = allocation.reservePlayers;
        selectedId = teams.find((team) => team.players.length)?.players[0]?.id || reservePlayers[0]?.id || "";
        return true;
      }

      function buildConstrainedAllocation(pool) {
        const conflicts = [];
        const rankedPool = rankedPlayers(pool);
        const byId = new Map(rankedPool.map((player) => [player.id, player]));
        canonicalInitialById.forEach((_player, id) => {
          if (!byId.has(id)) byId.set(id, canonicalPlayerClone(id));
        });
        const allRanked = rankedPlayers([...byId.values()].filter(Boolean));
        const nextTeams = [];
        const teamCaps = new Map();
        const placed = new Set();
        const forcedTierById = new Map();
        for (let index = 0; index < totalConfiguredTeams(); index += 1) {
          const tier = tierForIndex(index);
          const team = teamShell(index, tier);
          nextTeams.push(team);
          teamCaps.set(team.id, team.targetSize);
        }

        const teamById = new Map(nextTeams.map((team) => [team.id, team]));
        const targetByPlayer = new Map();
        const addConflict = (message) => conflicts.push(message);
        const queueExact = (playerId, targetTeamId, reason, expectedTier = "") => {
          const player = byId.get(playerId);
          const target = teamById.get(targetTeamId);
          if (!player) return addConflict(`${reason}: ${playerNameById(playerId)} is not in the canonical 76-player pool.`);
          if (!target) return addConflict(`${reason}: target ${targetTeamId} does not exist in this shape.`);
          const forcedTier = forcedTierById.get(playerId) || expectedTier;
          if (forcedTier && teamTier(target) !== forcedTier) {
            addConflict(`${reason}: ${player.name} cannot be placed in ${target.name} because it is ${teamTier(target).toUpperCase()} after the Tier1 boundary.`);
            return;
          }
          if (targetByPlayer.has(playerId) && targetByPlayer.get(playerId) !== targetTeamId) {
            addConflict(`${reason}: ${player.name} has conflicting active targets ${targetByPlayer.get(playerId)} and ${targetTeamId}.`);
            return;
          }
          targetByPlayer.set(playerId, targetTeamId);
        };

        Object.entries(defaultTeamMemberPowers).forEach(([teamId, powers]) => {
          const numericTeam = Number(String(teamId).match(/\d+/)?.[0] || 0);
          const defaultTarget = numericTeam > 0 ? tierForIndex(numericTeam - 1) : "";
          powers.forEach((entry) => {
            const power = typeof entry === "object" ? entry.power : entry;
            const homeTeamId = typeof entry === "object" ? entry.homeTeamId || "" : teamId;
            if (!ruleActive(teamPinRuleId(teamId, power))) return;
            const id = resolveInitialPower(power, `${teamId} member`, homeTeamId);
            queueExact(id, teamId, "Team member rule", defaultTarget);
          });
        });

        defaultBuddyPowerGroups.forEach((powers, index) => {
          if (!ruleActive(buddyRuleId(index))) return;
          const ids = powers.map((power) => resolveInitialPower(power, "Buddy rule"));
          const existingTarget = ids.map((id) => targetByPlayer.get(id)).find(Boolean);
          const queuedCount = (teamId) => [...targetByPlayer.values()].filter((value) => value === teamId).length;
          const target =
            (existingTarget && teamById.get(existingTarget)) ||
            nextTeams
              .filter((team) => teamTier(team) === "tier1" && teamCaps.get(team.id) - queuedCount(team.id) >= ids.length)
              .sort((a, b) => queuedCount(a.id) - queuedCount(b.id) || a.id.localeCompare(b.id))[0];
          if (!target) {
            addConflict(`Buddy rule: ${ids.map(playerNameById).join(" + ")} have no shared team with enough room.`);
            return;
          }
          ids.forEach((id) => queueExact(id, target.id, "Buddy rule", teamTier(target)));
        });

        Object.entries(commandOverrides).forEach(([teamId, override]) => {
          const ids = [override.leaderId].filter(Boolean);
          ids.forEach((id) => {
            if (isBenchedPlayer(id)) return;
            const defaultOverride = defaultCommandOverridesById[teamId] || {};
            const isDefaultCommand = defaultOverride.leaderId === id;
            const numericTeam = Number(String(teamId).match(/\d+/)?.[0] || 0);
            const defaultTarget = isDefaultCommand && numericTeam > 0 ? tierForIndex(numericTeam - 1) : "";
            if (!ruleActive(commandRuleId(teamId, "leader", id))) return;
            queueExact(id, teamId, "Leader rule", defaultTarget);
          });
        });

        targetByPlayer.forEach((targetTeamId, playerId) => {
          const target = teamById.get(targetTeamId);
          const player = byId.get(playerId);
          if (!target || !player) return;
          if (target.players.length >= teamCaps.get(target.id)) {
            addConflict(`Exact placement: ${target.name} is already at capacity ${teamCaps.get(target.id)} before placing ${player.name}.`);
            return;
          }
          target.players.push(clonePlayer(player));
          placed.add(playerId);
        });

        const fillTier = (tier) => {
          allRanked
            .slice()
            .sort((a, b) => {
              const aForced = forcedTierById.get(a.id) === tier ? 1 : 0;
              const bForced = forcedTierById.get(b.id) === tier ? 1 : 0;
              return bForced - aForced || b.score - a.score || (a.rank || 999) - (b.rank || 999) || a.id.localeCompare(b.id);
            })
            .forEach((player) => {
              if (placed.has(player.id) || isBenchedPlayer(player.id)) return;
              const forcedTier = forcedTierById.get(player.id);
              if (forcedTier && forcedTier !== tier) return;
              const candidates = nextTeams
                .filter((team) => teamTier(team) === tier && team.players.length < teamCaps.get(team.id))
                .sort((a, b) => normalizedTeamLoad(a) - normalizedTeamLoad(b) || a.players.length - b.players.length || a.id.localeCompare(b.id));
              const target = candidates[0];
              if (!target) return;
              target.players.push(clonePlayer(player));
              placed.add(player.id);
            });
        };
        fillTier("tier1");
        fillTier("tier2");
        fillTier("tier3");
        balanceTier2TeamSizes(nextTeams, conflicts);
        optimizeTierBalance(nextTeams);

        const reserve = allRanked.filter((player) => !placed.has(player.id)).map(clonePlayer);
        const ids = nextTeams.flatMap((team) => team.players.map((player) => player.id)).concat(reserve.map((player) => player.id));
        if (ids.length !== expectedInventoryCount) conflicts.push(`Allocator produced ${ids.length}/${expectedInventoryCount} player slots.`);
        if (new Set(ids).size !== expectedInventoryCount) conflicts.push("Allocator produced duplicate stable IDs.");
        nextTeams.forEach((team) => {
          const cap = teamCaps.get(team.id);
          if (team.players.length > cap) conflicts.push(`${team.name} exceeds full-team-first capacity ${cap}.`);
        });
        return { teams: nextTeams, reservePlayers: reserve, conflicts };
      }

      function optimizeTierBalance(source) {
        const tierCost = (tier) => metrics(source.filter((team) => teamTier(team) === tier)).cost;
        ["tier1", "tier2", "tier3"].forEach((tier) => {
          let currentCost = tierCost(tier);
          for (let pass = 0; pass < 80; pass += 1) {
            let best = null;
            source.forEach((leftTeam, leftTeamIndex) => {
              if (teamTier(leftTeam) !== tier) return;
              source.forEach((rightTeam, rightTeamIndex) => {
                if (rightTeamIndex <= leftTeamIndex || teamTier(rightTeam) !== tier) return;
                leftTeam.players.forEach((leftPlayer) => {
                  if (isAllocationProtected(leftPlayer, leftTeam.id)) return;
                  rightTeam.players.forEach((rightPlayer) => {
                    if (isAllocationProtected(rightPlayer, rightTeam.id)) return;
                    const clone = source.map((team) => ({ ...team, players: team.players.map(clonePlayer) }));
                    if (!swapById(clone, leftPlayer.id, rightPlayer.id)) return;
                    if (!validQuota(clone)) return;
                    const nextCost = metrics(clone.filter((team) => teamTier(team) === tier)).cost;
                    if (nextCost + 1e-9 < currentCost && (!best || nextCost < best.cost)) {
                      best = { leftId: leftPlayer.id, rightId: rightPlayer.id, cost: nextCost };
                    }
                  });
                });
              });
            });
            if (!best) break;
            if (!swapById(source, best.leftId, best.rightId)) break;
            currentCost = best.cost;
          }
        });
      }

      function isAllocationProtected(player, teamId) {
        const override = commandOverrides[teamId] || {};
        return Boolean(
          (override.leaderId === player.id && ruleActive(commandRuleId(teamId, "leader", player.id))) ||
            isDefaultTeamMember(player, teamId) ||
            isDefaultBuddyMember(player)
        );
      }

      function isDefaultTeamMember(player, teamId) {
        return Boolean(
          player &&
            (defaultTeamMemberPowers[teamId] || []).some((entry) => {
              const power = Number(typeof entry === "object" ? entry.power : entry);
              return power === Number(player.power) && ruleActive(teamPinRuleId(teamId, power));
            })
        );
      }

      function isDefaultBuddyMember(player) {
        return Boolean(player && defaultBuddyPowerGroups.some((powers, index) => ruleActive(buddyRuleId(index)) && powers.includes(Number(player.power))));
      }

      function balanceTier2TeamSizes(source, conflicts) {
        const tier2 = source.filter((team) => teamTier(team) === "tier2");
        if (tier2.length < 2) return;
        const totalPlayers = tier2.reduce((sum, team) => sum + team.players.length, 0);
        const minimum = Math.floor(totalPlayers / tier2.length);
        const maximum = Math.ceil(totalPlayers / tier2.length);
        let rebalanceComplete = false;
        while (!rebalanceComplete) {
          const donor = tier2.slice().sort((a, b) => b.players.length - a.players.length || a.id.localeCompare(b.id))[0];
          const recipient = tier2.slice().sort((a, b) => a.players.length - b.players.length || a.id.localeCompare(b.id))[0];
          if (!donor || !recipient || donor.players.length <= maximum || recipient.players.length >= minimum) {
            rebalanceComplete = true;
            break;
          }
          const candidateIndex = donor.players.findIndex((player) => !isAllocationProtected(player, donor.id));
          if (candidateIndex === -1) {
            conflicts.push(`Tier2 size balance blocked: ${donor.name} has ${donor.players.length} players and no unlocked player can move to ${recipient.name}.`);
            break;
          }
          recipient.players.push(donor.players.splice(candidateIndex, 1)[0]);
        }
        const sizes = tier2.map((team) => team.players.length);
        if (Math.max(...sizes) - Math.min(...sizes) > 1 && !conflicts.some((message) => message.startsWith("Tier2 size balance blocked:"))) {
          conflicts.push(`Tier2 size balance blocked: locked or explicit command placements leave sizes ${sizes.join("+")}.`);
        }
      }

      function fairBalanceTeams(source) {
        ["tier1", "tier2", "tier3"].forEach((tier) => {
          const tierTeams = source.filter((team) => teamTier(team) === tier);
          const players = tierTeams.flatMap((team) => team.players).sort((a, b) => b.score - a.score || b.power - a.power || a.id.localeCompare(b.id));
          tierTeams.forEach((team) => (team.players = []));
          players.forEach((player) => {
            const target = tierTeams
              .filter((team) => team.players.length < 12)
              .sort((a, b) => normalizedTeamLoad(a) - normalizedTeamLoad(b) || a.players.length - b.players.length || a.id.localeCompare(b.id))[0];
            if (target) target.players.push(player);
          });
        });
      }

      function normalizedTeamLoad(team) {
        return team.players.reduce((sum, player) => sum + player.score / 100000 + player.power / 1000000000, 0);
      }

      function movePlayerToTeam(source, playerId, targetTeamId, reason) {
        const located = locate(source, playerId);
        const targetIndex = source.findIndex((team) => team.id === targetTeamId);
        if (!located) return solverConflicts.push(`${reason}: ${playerNameById(playerId)} is not visible in the current shape.`), false;
        if (targetIndex < 0) return solverConflicts.push(`${reason}: target ${targetTeamId} does not exist in this shape.`), false;
        const fromTeam = source[located.teamIndex];
        const targetTeam = source[targetIndex];
        if (teamTier(fromTeam) !== teamTier(targetTeam)) return solverConflicts.push(`${reason}: ${located.player.name} is ${teamTier(fromTeam)} but ${targetTeam.name} is ${teamTier(targetTeam)}.`), false;
        if (located.teamIndex === targetIndex) return true;
        const cap = typeof targetTeam.targetSize === "number" ? targetTeam.targetSize : 12;
        if (targetTeam.players.length >= cap) return solverConflicts.push(`${reason}: ${targetTeam.name} already has ${cap} players.`), false;
        fromTeam.players.splice(located.playerIndex, 1);
        targetTeam.players.push(located.player);
        return true;
      }

      function placeActiveExactRules(source = teams) {
        const allocation = buildConstrainedAllocation(currentPlayerPool());
        solverConflicts = allocation.conflicts;
        if (source === teams) {
          teams = allocation.teams;
          reservePlayers = allocation.reservePlayers;
        }
      }

      function rebalanceUnlocked() {
        const before = snapshotState();
        const allocation = buildConstrainedAllocation(currentPlayerPool());
        if (allocation.conflicts.length) {
          restoreState(before);
          solverConflicts = allocation.conflicts;
          render();
          toast(`Rebalance blocked: ${allocation.conflicts[0]}`);
          return;
        }
        undoStack.push(before);
        if (undoStack.length > 40) undoStack.shift();
        teams = allocation.teams;
        reservePlayers = allocation.reservePlayers;
        selectedId = teams.find((team) => team.players.length)?.players[0]?.id || reservePlayers[0]?.id || "";
        suggestions = [];
        solverConflicts = [];
        saveState();
        render();
        toast("Players rebalanced around leader anchors only.");
      }
      function setTierCounts(tier1Count, tier2Count, tier3Count = tierConfig.tier3Count || 0) {
        withUndo(() => {
          tierConfig = { tier1Count, tier2Count, tier3Count };
          reshapeFromPool(currentPlayerPool());
        });
        const needed = Math.min(expectedInventoryCount, visibleCapacity());
        const available = teams.flatMap((team) => team.players).length + reservePlayers.length;
        toast(available < needed ? `${available}/${needed} players available; last teams are partial.` : `Tier shape set: ${tier1Count} Tier1 + ${tier2Count} Tier2 + ${tier3Count} Tier3.`);
      }

      function slug(value) {
        return value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-");
      }

      function fmt(value) {
        return Math.round(value).toLocaleString("en-US");
      }

      function total(team, field) {
        if (field === "score") return team.players.reduce((sum, player) => sum + curveScore(player.score), 0);
        return team.players.reduce((sum, player) => sum + player[field], 0);
      }

      // Whale curve: a convex transform on the linear v3 score so top-end strength is worth
      // superlinearly more (1 whale can outweigh 3 heavy fighters). whaleCurve = 1 is a no-op.
      // Normalised by the roster median so the numbers stay in a readable range.
      function refreshCurveMedian() {
        const s = allPlayers().map((p) => Number(p.score)).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
        curveMedian = s.length ? s[Math.floor(s.length / 2)] : 1;
      }
      function curveScore(linearScore) {
        const s = Number(linearScore) || 0;
        if (!(whaleCurve > 1) || s <= 0 || !(curveMedian > 0)) return s;
        return curveMedian * Math.pow(s / curveMedian, whaleCurve);
      }
      function updateCurveReadout() {
        const slider = document.getElementById("curveSlider");
        if (slider) slider.value = Math.round(whaleCurve * 100);
        const val = document.getElementById("curveVal");
        if (val) val.textContent = whaleCurve.toFixed(2);
        const hint = document.getElementById("curveHint");
        if (!hint) return;
        if (!(whaleCurve > 1)) { hint.textContent = "Off — linear v3 score."; return; }
        const ranked = allPlayers().slice().sort((a, b) => b.score - a.score);
        const whale = ranked[0], heavy = ranked[5];
        const ratio = whale && heavy && curveScore(heavy.score) > 0 ? curveScore(whale.score) / curveScore(heavy.score) : 0;
        hint.textContent = `Top whale = ${ratio.toFixed(1)}× a heavy fighter (linear: ${(whale && heavy ? whale.score / heavy.score : 0).toFixed(1)}×).`;
      }

      function metrics(source = teams) {
        const comparable = comparableTeams(source);
        const scoreTotals = comparable.map((team) => total(team, "score") / Math.max(1, team.players.length));
        const powerTotals = comparable.map((team) => total(team, "power") / Math.max(1, team.players.length));
        const meanScore = scoreTotals.reduce((sum, value) => sum + value, 0) / Math.max(1, comparable.length);
        const meanPower = powerTotals.reduce((sum, value) => sum + value, 0) / Math.max(1, comparable.length);
        return {
          scoreTotals,
          powerTotals,
          meanScore,
          meanPower,
          scoreSpread: Math.max(...scoreTotals) - Math.min(...scoreTotals),
          powerSpread: Math.max(...powerTotals) - Math.min(...powerTotals),
          nonVts: source.flatMap((team) => team.players).filter((player) => player.vts === "No").length,
          backups: source.flatMap((team) => team.players).filter((player) => player.backup).length,
          cost: scoreTotals.reduce((sum, score, index) => {
            const power = powerTotals[index];
            // Score is the official balance metric. Castle power is weight 0 in v3 scoring, so it
            // is kept only as a light tiebreaker (0.05) rather than an equal-weight objective.
            return sum + ((score - meanScore) / meanScore) ** 2 + 0.05 * ((power - meanPower) / meanPower) ** 2;
          }, 0),
        };
      }

      function mainsMetrics(source = teams) {
        // Compare only within-tier teams; mains = all but the two lowest-scoring (positional bench).
        const comparable = comparableTeams(source);
        const scoreTotals = comparable.map((team) => {
          const ranked = [...team.players].sort((a, b) => b.score - a.score);
          const mains = ranked.slice(0, Math.max(1, team.players.length - 2));
          return mains.reduce((sum, player) => sum + curveScore(player.score), 0) / Math.max(1, mains.length);
        });
        const meanScore = scoreTotals.reduce((sum, value) => sum + value, 0) / Math.max(1, comparable.length);
        return {
          scoreTotals,
          meanScore,
          scoreSpread: Math.max(...scoreTotals) - Math.min(...scoreTotals),
        };
      }

      function comparableTeams(source) {
        // Only compare teams within the same tier — tier2/tier3 are separate divisions, so
        // spanning them makes a strong primary tier look "unbalanced" against smaller backup tiers.
        const byTier = new Map();
        source.forEach((team) => {
          const tier = teamTier(team);
          if (!byTier.has(tier)) byTier.set(tier, []);
          byTier.get(tier).push(team);
        });
        let best = [];
        byTier.forEach((group) => {
          if (group.length >= 2 && group.length > best.length) best = group;
        });
        return best.length >= 2 ? best : source;
      }

      function applyDefaultBoardState() {
        restoreState(canonicalFormationState);
        selectedId = teams[0]?.players[0]?.id || "";
        solverConflicts = [];
        suggestions = [];
        manualSwapSelectionId = "";
        reserveSwapSourceId = "";
        activePopoverPlayerId = "";
      }

      function render() {
        refreshCurveMedian();
        applyOverrideRules();
        assignLeadership();
        updateCurveReadout();
        updateUndoButton();
        updatePngButtons();
        renderOverridesPanel();
        document.getElementById("manualToggle")?.classList.toggle("on", manualMode);
        document.getElementById("manualToggle")?.setAttribute("aria-pressed", String(manualMode));
        document.getElementById("overrideToggle")?.classList.toggle("on", overridesEnabled);
        document.getElementById("overrideToggle")?.setAttribute("aria-pressed", String(overridesEnabled));
        renderStats();
        renderConstraints();
        renderRolePlaybook();
        renderBoard();
        renderTeamListView();
        renderInspector();
        renderSuggestions();
        renderTier2Draft();
        renderRankWatch();
        renderUnmappedWatch();
        renderBench();
        renderBenchedPlayers();
        bindReserveSwapActions();
        renderFilters();
        renderPrefs();
      }

      function applyReferenceCommandBaseline() {
        const baseline = {
          "team-1": ["MalakAbo", "MalikaZena", "TazzBoy"],
          "team-2": ["Dr Thund€r", "Bil.", "BoneSmoker"],
          "team-3": ["ANGEL", "Moldo1313", "REDBULLS"],
          "team-4": ["Kika", "Peaceful Warrior", "\u2022Lisavetka\u2022"],
          "team-5": ["Neutrino10", "Hunter killer.", "DvD18"],
          "team-6": ["RedBull#2", "ylli90", "WAEL"],
        };
        teams.forEach((team) => team.players.forEach((player) => { player.commandRole = ""; }));
        Object.entries(baseline).forEach(([teamId, names]) => {
          const team = teams.find((entry) => entry.id === teamId);
          if (!team) return;
          const matches = names.map((name) => team.players.find((player) => normalizeName(player.name) === normalizeName(name))).filter(Boolean);
          if (matches[0]) matches[0].commandRole = "leader";
          matches.slice(1).forEach((player) => { player.commandRole = "coleader"; });
        });
      }

      function applyExactReferenceBaseline() {
        const reference = {
          "team-1": ["RedBull", "BiG BOiiE", "Uzumaki", "Goodnes", "PeraIgi olman", "MIAOUU", "Ligmaballs", "old man war", "q Immortal", "Arsenal", "Surtii", "Neutrino10"],
          "team-2": ["ANGEL", "Bil", "MasterVj", "jJamaica pete", "AE2050", "@93307", "Mariska", "Maximusss", "ylli90", "Akk 47", "Tazzboy", "EightBall"],
          "team-3": ["MalakAbo", "Loony", "Malika Zena", "AK", "BL23", "Pink", "TetheR", "MALAK ANDURIL", "UNDEAD", "BoneSmoker", "@54409", "Anne"],
          "team-4": ["@85068", "classic", "Moldo1313", "Lord IKR", "Jasper", "Roha", "La Scimmia", "@71987", "Blacki X", "JamboJango", "Take Ur Shin", "DvD18"],
          "team-5": ["@52376", "Peaceful Warrior", "Lisavetka", "AMG63", "Sarafino", "@107386", "Footloos", "lillybet", "imRyker", "Spoilage", "@63308", "@62741"],
          "team-6": ["ZEROK", "@57121", "MarcMCrack", "Loppu", "Liskoo", "Humera", "Jagmears", "unny", "Neo 11", "@40285", "@38688", "WAEL"],
        };
        const loose = (value) => String(value || "").normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase();
        const pool = currentPlayerPool();
        const used = new Set();
        const resolve = (token) => {
          const score = token.startsWith("@") ? Number(token.slice(1)) : 0;
          const key = loose(token);
          if (score) return pool.find((player) => !used.has(player.id) && Math.round(player.score) === score);
          return pool.find((player) => !used.has(player.id) && loose(player.name) === key)
            || pool.find((player) => !used.has(player.id) && loose(player.name).includes(key));
        };
        Object.entries(reference).forEach(([teamId, tokens]) => {
          const team = teams.find((entry) => entry.id === teamId);
          if (!team) return;
          team.players = [];
          tokens.forEach((token) => {
            const player = resolve(token);
            if (!player) return;
            used.add(player.id);
            player.commandRole = "";
            team.players.push(player);
          });
          if (team.players[0]) team.players[0].commandRole = "leader";
          team.players.slice(1, 3).forEach((player) => { player.commandRole = "coleader"; });
          commandOverrides[teamId] = { leaderId: team.players[0]?.id || "", coleaderIds: team.players.slice(1, 3).map((player) => player.id) };
        });
        reservePlayers = pool.filter((player) => !used.has(player.id));
      }

      function renderStats() {
        const m = metrics();
        const mains = mainsMetrics();
        const best = Math.min(...m.scoreTotals);
        const worst = Math.max(...m.scoreTotals);
        document.getElementById("stats").innerHTML = [
          stat("Mains spread", fmt(mains.scoreSpread), `${((mains.scoreSpread / mains.meanScore) * 100).toFixed(3)}% per-main average`),
          stat("Power spread", compact(m.powerSpread), `${((m.powerSpread / m.meanPower) * 100).toFixed(3)}% per-player normalized`),
          stat("Score range", `${fmt(best)} – ${fmt(worst)}`, "Lower spread means fairer teams"),
        ].join("");
      }

      function renderConstraints() {
        const report = constraintReport();
        const capacity = capacityReport();
        document.getElementById("constraints").innerHTML = [
          constraintCard(
            "Solver conflicts",
            solverConflicts.length === 0,
            solverConflicts.length === 0 ? "No active exact-rule conflicts." : solverConflicts.join(" · ")
          ),
          constraintCard(
            "Tier capacity",
            capacity.partialTeams === 0,
            capacity.partialTeams === 0
              ? `${tierConfig.tier1Count} Tier1 + ${tierConfig.tier2Count} Tier2 + ${Number(tierConfig.tier3Count || 0)} Tier3 teams are full.`
              : `${capacity.visiblePlayers}/${capacity.requiredPlayers} visible slots filled; ${capacity.partialTeams} team(s) partial.`
          ),
          constraintCard(
            "Common fighting time",
            report.timeWarnings.length === 0,
            report.timeWarnings.length === 0
              ? "Every selected fighting slot covers the actual team size."
              : report.timeWarnings
                  .map(
                    (item) =>
                      `${item.team} ${item.slot}: ${item.count}/${item.total}${
                        item.lockedBlockers.length ? `, locked out: ${item.lockedBlockers.join(", ")}` : ""
                      }`
                  )
                  .join(" · ")
          ),
          constraintCard(
            "No language islands",
            report.languageIslands.length === 0,
            report.languageIslands.length === 0
              ? "No paired language is stranded alone."
              : report.languageIslands.map((item) => `${item.team}: ${item.locale}`).join(" · ")
          ),
          constraintCard(
            "Leadership spread",
            report.leadWarnings.length === 0,
            report.leadWarnings.length === 0
              ? "Each team has 1 leader + 2 co-leaders."
              : report.leadWarnings.join(" · ")
          ),
          constraintCard(
            "Placement",
            true,
            manualMode
              ? "Manual placement on — drag or click to move players. The solver only runs when you press Rebalance."
              : "Board locked. Turn Manual placement on to edit."
          ),
        ].join("");

        const warningCount =
          solverConflicts.length +
          capacity.partialTeams +
          report.timeWarnings.length +
          report.languageIslands.length +
          report.leadWarnings.length;
        const healthStatus = document.getElementById("healthStatus");
        const healthLabel = document.getElementById("healthStatusLabel");
        const healthDetail = document.getElementById("healthStatusDetail");
        healthStatus?.classList.toggle("warn", warningCount > 0);
        if (healthLabel) {
          healthLabel.textContent =
            warningCount === 0 ? "All teams are balanced and ready." : `${warningCount} balance check${warningCount === 1 ? "" : "s"} need attention.`;
        }
        if (healthDetail) {
          healthDetail.textContent = manualMode
            ? "Manual placement on. Rules and rebalancing apply only when you press Rebalance."
            : "Board is locked for editing.";
        }
      }

      function constraintCard(title, ok, body) {
        return `<article class="constraint ${ok ? "ok" : "warn"}"><strong>${ok ? "OK" : "!"} ${title}</strong><span>${body}</span></article>`;
      }

      function renderRolePlaybook() {
        const target = document.getElementById("rolePlaybook");
        if (!target) return;
        const counts = teams.flatMap((team) => team.players).reduce((next, player) => {
          const roleKey = assignedPlanRole(player);
          if (planRoles[roleKey]?.capacity) next[roleKey] = (next[roleKey] || 0) + 1;
          return next;
        }, {});
        target.innerHTML = `
          <div class="role-playbook-list">
            ${Object.entries(planRoles)
              .filter(([, role]) => role.capacity)
              .map(
                ([roleKey, role]) => `
                  <article class="role-playbook-card">
                    <div class="role-playbook-head">
                      <strong>${escapeHtml(role.label)}</strong>
                      ${planRolePill(roleKey, `${counts[roleKey] || 0} active`)}
                    </div>
                    <small>${escapeHtml(role.description)} Base pattern: ${role.capacity} slots.</small>
                    <div class="plan-phases">
                      ${role.phases
                        .map(
                          (phase) => `
                            <div class="plan-phase">
                              <strong>${escapeHtml(phase.time)}</strong>
                              <div class="plan-legions">
                                <span>${escapeHtml(phase.note)}</span>
                              </div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  </article>
                `
              )
              .join("")}
          </div>
        `;
      }

      function rolePlanTeam() {
        if (!rolePlanTeamId || !teams.some((team) => team.id === rolePlanTeamId)) rolePlanTeamId = teams[0]?.id || "";
        return teams.find((team) => team.id === rolePlanTeamId) || teams[0];
      }

      function openRolePlanDialog(teamId = "") {
        if (teamId) rolePlanTeamId = teamId;
        if (selectedId) planFocusPlayerId = selectedId;
        rolePlanReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const dialog = document.getElementById("rolePlanDialog");
        if (!dialog) return;
        dialog.hidden = false;
        
        // Set inert on everything outside the dialog
        document.querySelectorAll('body > *:not(#rolePlanDialog)').forEach(el => {
          if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
            el.setAttribute('inert', '');
            el.setAttribute('aria-hidden', 'true');
          }
        });
        
        // Lock body scroll
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        
        // Setup focus trap
        removeFocusTrap = trapFocus(dialog);
        
        renderRolePlanDialog();
        window.setTimeout(() => {
          const target = document.getElementById("planModePlayer") || dialog;
          target.focus?.();
        }, 0);
      }

      function closeRolePlanDialog() {
        const dialog = document.getElementById("rolePlanDialog");
        if (dialog) dialog.hidden = true;
        
        // Remove inert from everything outside the dialog
        document.querySelectorAll('body > *:not(#rolePlanDialog)').forEach(el => {
          el.removeAttribute('inert');
          el.removeAttribute('aria-hidden');
        });
        
        // Restore body scroll
        if (previousBodyOverflow !== null) {
          document.body.style.overflow = previousBodyOverflow;
          previousBodyOverflow = null;
        }
        
        // Remove focus trap
        if (removeFocusTrap) {
          removeFocusTrap();
          removeFocusTrap = null;
        }
        
        if (rolePlanReturnFocus && document.contains(rolePlanReturnFocus)) rolePlanReturnFocus.focus?.();
        rolePlanReturnFocus = null;
      }

      function exportRolePlanJson() {
        const team = rolePlanTeam();
        downloadBlob(new Blob([JSON.stringify(rolePlanExportPayload(team), null, 2)], { type: "application/json" }), team.id + "-stage1-role-plan.json");
        toast("Role plan JSON export started.");
      }

      function exportAllRolePlansJson() {
        if (teams.length !== 6) {
          toast("All-team role-plan export requires exactly six teams.");
          return;
        }
        const payload = {
          format: "all-star-boh-stage1-role-plan-bundle",
          version: 1,
          savedAt: new Date().toISOString(),
          plans: teams.map((team) => rolePlanExportPayload(team)),
        };
        downloadBlob(
          new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
          "all-team-stage1-role-plans.json"
        );
        toast("All-team role plan JSON export started.");
      }

      // ══════════════════ REAL BATTLEFIELD MAP ══════════════════
      // Uses the actual in-game map art. Player markers are placed with the isometric
      // projection fitted from the labelled screenshots, expressed as percentages so the
      // overlay scales with the image at any size.
      //   left% = 46.84 + 0.5935*(u - v)      top% = 46.55 + 0.5347*(u + v)
      //   u = X-600, v = Y-600
      const MAP_IMAGES = {
        clean: ASSET_BASE + "boh-map/stage1-background-clean-final-v2.png",
        labeled: ASSET_BASE + "boh-map/stage1-labeled.png",
      };
      // Least-squares fit against 13 building centroids measured from the real map art
      // via canvas blob detection. Mean error 2.7px, worst 5.2px on the 972x507 original.
      function mapLeftPct(X, Y) { return 46.863 + 0.5890 * ((X - 600) - (Y - 600)); }
      function mapTopPct(X, Y) { return 49.227 + 0.5449 * ((X - 600) + (Y - 600)); }

      // Which building noun and which side-qualifier each code maps to. Codes ending "1"
      // are ours, "2" the enemy's — the same convention the plan text uses.
      const STRUCT_NAME_PARTS = {
        HOME: ["stronghold", "ours"], ENEMY: ["stronghold", "enemy"],
        CC1: ["commandCenter", "ours"], CC2: ["commandCenter", "enemy"],
        CC3: ["commandCenter", "", "3"], CC4: ["commandCenter", "", "4"],
        OP1: ["outpost", "ours"], OP2: ["outpost", "enemy"],
        OP3: ["outpost", "", "3"], OP4: ["outpost", "", "4"],
        H1: ["hospital", "ours"], H2: ["hospital", "enemy"],
        A1: ["arsenal", "ours"], A2: ["arsenal", "enemy"],
        RP1: ["relay", "", "1"], RP2: ["relay", "", "2"],
        RP3: ["relay", "", "3"], RP4: ["relay", "", "4"],
        FH1: ["fortressOfHonor", "", "", "top"], FH2: ["fortressOfHonor", "", "", "bottom"],
        S: ["sanctuary"],
      };
      // Towers the plan text actually names. Only these keep a permanent label on the map —
      // the other 16 would bury the building names. Hover or focus reveals any of them.
      const PLAN_TOWER_CODES = new Set(["T3", "T5", "T7", "T8", "T9"]);

      // Relay codes carry a trailing "r" for the mirrored copy — same building, same name.
      // Built from the existing locale nouns, so the name follows the plan language.
      function structName(code, locale) {
        const key = String(code || "").replace(/r$/, "");
        const parts = STRUCT_NAME_PARTS[key];
        if (!parts) return key;
        const loc = locale || mapLocale();
        // Some locale entries are [label, description] pairs — take the label.
        const word = (k) => { const v = localeCopy(loc)?.[k] ?? planLocaleCopy.en[k];
          return Array.isArray(v) ? v[0] : (typeof v === "string" ? v : k); };
        const [noun, side, index, half] = parts;
        // Qualifier goes in parentheses, never as a prefix — "ours"/"enemy" are standalone
        // pronouns in most of these languages, so "Ours Stronghold" / "Наше Крепость" is
        // ungrammatical. "Stronghold (Ours)" reads correctly everywhere.
        let out = word(noun);
        if (index) out += " " + index;
        const qual = side ? word(side) : half ? word(half) : "";
        if (qual) out += " (" + qual + ")";
        return out;
      }

      // Stage 1 field. "1" is always OURS, "2" the enemy's — swapping side swaps every pair.
      const STAGE1_FIELD = [
        { k: "fort",  blue: "HOME",  red: "ENEMY", X: 600, Y: 661 },
        { k: "fort",  blue: "ENEMY", red: "HOME",  X: 600, Y: 539 },
        { k: "cc",    blue: "CC1",   red: "CC2",   X: 635, Y: 635 },
        { k: "cc",    blue: "CC2",   red: "CC1",   X: 564, Y: 564 },
        { k: "op",    blue: "OP1",   red: "OP2",   X: 585, Y: 649 },
        { k: "op",    blue: "OP2",   red: "OP1",   X: 614, Y: 550 },
        { k: "hosp",  blue: "H1",    red: "H2",    X: 575, Y: 620 },
        { k: "hosp",  blue: "H2",    red: "H1",    X: 626, Y: 580 },
        { k: "ars",   blue: "A1",    red: "A2",    X: 626, Y: 620 },
        { k: "ars",   blue: "A2",    red: "A1",    X: 575, Y: 580 },
        { k: "relay", blue: "RP1",   red: "RP1r",  X: 600, Y: 623 },
        { k: "relay", blue: "RP2",   red: "RP2r",  X: 600, Y: 611 },
        { k: "relay", blue: "RP2r",  red: "RP2",   X: 599, Y: 588 },
        { k: "relay", blue: "RP1r",  red: "RP1",   X: 599, Y: 576 },
        { k: "fh",    blue: "FH1",   red: "FH1",   X: 555, Y: 600 },
        { k: "fh",    blue: "FH2",   red: "FH2",   X: 646, Y: 600 },
        { k: "shrine",blue: "S",     red: "S",     X: 600, Y: 600 },
      ];
      // Towers grow out of your own stronghold up your lane toward the Sanctuary.
      function laneTowers(side) {
        return schematicTowerStructures(side).filter((tower) => tower.type === "tower").map((tower) => ({ k: "tower", id: tower.id, X: tower.x, Y: tower.y, side, parentId: tower.parentId, pinNudge: tower.pinNudge, coverageSize: 5 }));
      }

      function mapLocale() {
        return typeof rolePlanLocaleMode !== "undefined" && rolePlanLocaleMode !== "auto"
          ? rolePlanLocaleMode : "en";
      }
      let mapSideSel = "blue";
      let mapPhaseSel = 0;
      let mapStage = 1;
      let mapArt = "clean";
      let mapShowFlags = true; // tower flags on/off — buildings always stay visible

      function structLabel(f) { return mapSideSel === "blue" ? f.blue : f.red; }
      function structDisplayLabel(f) {
        const label = structLabel(f);
        return f.k === "relay" ? label.replace(/r$/, "") : label;
      }
      function structSide(f) {
        if (f.k === "shrine" || f.k === "fh") return "neutral";
        const half = f.Y > 600 ? "blue" : "red";
        return half === mapSideSel ? "ours" : "theirs";
      }
      function targetsFor(row, phaseIndex) {
        const entry = row.phases[phaseIndex];
        if (!entry) return [];
        const a = entry.assignment || {};
        const codes = new Set();
        [a.l1, a.l2, a.note].forEach((t) => {
          String(t || "").replace(/\[([A-Z]{1,3}\d{0,2})\]/g, (m, c) => { codes.add(c); return m; });
        });
        return [...codes];
      }

      function renderRealMap(rows, opts) {
        if (mapStage === 2) {
          return (
            '<div class="rm-wrap locked"><div class="rm-locked">' +
            '<div class="rm-lock-icon">&#128274;</div>' +
            "<h3>" + escapeHtml(tr(mapLocale(), "comingSoon")) + "</h3>" +
            "<p>The full-size field with all buildings unlocks for the knockout rounds. " +
            "Stage 1 uses the reduced map shown here.</p>" +
            '<button type="button" class="btn" data-map-stage="1">Back to Stage 1</button>' +
            "</div>" + stageTabs() + "</div>"
          );
        }

        const marks = new Map();
        (rows || []).forEach((row) => {
          if (isStandbyForPhase(row.player, mapPhaseSel)) return;
          targetsFor(row, mapPhaseSel).forEach((code) => {
            if (!marks.has(code)) marks.set(code, []);
            marks.get(code).push(row);
          });
        });

        // Only our own lane of towers is shown — you build out from your own stronghold.
        const pins = STAGE1_FIELD.concat(mapShowFlags ? laneTowers(mapSideSel) : [])
          .map((f) => {
            const id = f.k === "tower" ? f.id : structLabel(f);
            const code = f.k === "tower" ? f.id : structDisplayLabel(f);
            // Visible text is the plan code only — short, and it matches the order text
            // verbatim. The readable name still rides along in the tooltip/click/aria.
            // Mirrored enemy relays carry a trailing "r" internally; without a suffix the
            // map would show two identical "RP1" pins. "e" marks the enemy copy.
            const label = f.k === "relay" && /r$/.test(String(id)) ? code + "e" : code;
            const nameFull = f.k === "tower" ? f.id : structName(code);
            const here = marks.get(id) || [];
            const side = f.k === "tower" ? "ours" : structSide(f);
            const L = mapLeftPct(f.X, f.Y), T = mapTopPct(f.X, f.Y);
            // Cosmetic only — lets the centre lane read as passing just below the relays.
            const nudge = f.pinNudge || [0, 0];
            const pinL = L + nudge[0], pinT = T + nudge[1];
            const title = f.k === "tower" ? nameFull : nameFull + " [" + code + "]";
            const aria = (f.k === "tower" ? nameFull : nameFull + ", code " + code) + (here.length ? ", " + here.length + " assigned" : ", nobody assigned");
            return (
              '<button type="button" class="rm-pin ' + side + " k-" + f.k +
              (here.length ? " active" : "") + (f.k === "tower" ? " tower" : "") +
              (f.k === "tower" && PLAN_TOWER_CODES.has(f.id) ? " keyed" : "") +
              (mapFocusCode && (id === mapFocusCode || code === mapFocusCode) ? " focused" : "") +
              (mapSelectedCode && (id === mapSelectedCode || code === mapSelectedCode) ? " selected" : "") +
              '" style="left:' + pinL.toFixed(2) + "%;top:" + pinT.toFixed(2) + '%" data-rm="' +
              escapeAttribute(id) + '" data-rm-own="' + side + '" data-rm-label="' + escapeAttribute(nameFull) +
              '" aria-label="' + escapeAttribute(aria) +
              '" title="' + escapeAttribute(title) + '">' +
              // Name first so it always sits ABOVE the marker, clear of the ground point.
              '<span class="rm-name">' + escapeHtml(label) + "</span>" +
              (f.k === "tower"
                ? '<span class="rm-flag">' + mapFlagIcon(f.k) + "</span>"
                : '<span class="rm-dot">' + mapBuildingIcon(f.k) + "</span>") +
              "</button>"
            );
          })
          .join("");

        const phaseTabs = stage1Flow
          .map((p, i) =>
            '<button type="button" data-rm-phase="' + i + '"' + (i === mapPhaseSel ? ' class="on p' + i + '"' : "") +
            ">" + escapeHtml(p.time.replace(" Minutes", "m")) + "</button>"
          )
          .join("");

        const m = eventMilestones[mapPhaseSel] || {};
        return (
          '<div class="rm-wrap">' + stageTabs() +
          '<div class="rm-bar">' +
          '<div class="rm-seg">' +
          '<button type="button" data-rm-side="blue"' + (mapSideSel === "blue" ? ' class="on blue"' : "") + ">" + escapeHtml(tr(mapLocale(), "startBlue")) + "</button>" +
          '<button type="button" data-rm-side="red"' + (mapSideSel === "red" ? ' class="on red"' : "") + ">" + escapeHtml(tr(mapLocale(), "startRed")) + "</button>" +
          "</div>" +
          '<div class="rm-seg rm-phases">' + phaseTabs + "</div>" +
          '<button type="button" class="rm-art" data-rm-flags="1" aria-pressed="' + String(mapShowFlags) + '">' +
          (mapShowFlags ? "Hide flags" : "Show flags") + "</button>" +
          '<button type="button" class="rm-art" data-rm-art="1">' +
          escapeHtml(tr(mapLocale(), mapArt === "clean" ? "showCodes" : "hideCodes")) + "</button>" +
          "</div>" +
          '<div class="rm-stage">' +
          '<img class="rm-img" src="' + MAP_IMAGES[mapArt] +
          '" width="972" height="507" alt="Battle of Honor stage 1 map" />' +
          '<div class="rm-overlay"><svg class="rm-leaders" aria-hidden="true"></svg>' + pins + "</div>" +
          "</div>" +
          '<div class="rm-note"><b>' + escapeHtml(stage1Flow[mapPhaseSel].time) + "</b> — " +
          escapeHtml(m.unlocks || "") + "</div>" +
          "</div>"
        );
      }

      const MAP_KIND_TINT = {
        fort: "var(--coral)", cc: "#8a63e8", op: "#d47ab8", hosp: "#22b57c",
        ars: "#3f8fdd", relay: "#ef6a5c", fh: "#e8a91c", shrine: "#f2d264", tower: "#7f8db3",
      };

      // A little planted flag reads better than a dot and gives a bigger tap target.
      function mapFlagIcon(kind) {
        const tint = MAP_KIND_TINT[kind] || "#f2d264";
        return (
          '<svg viewBox="-2 0 28 31" width="100%" height="100%" aria-hidden="true">' +
          '<path d="M6 29V2" stroke="#1b1206" stroke-width="2.6" stroke-linecap="round"/>' +
          '<path d="M7 3h13l-3.2 4.6L20 12H7z" fill="' + tint + '" stroke="#1b1206" stroke-width="1.6" stroke-linejoin="round"/>' +
          // Blue base plate marks the ground point where the flag actually stands.
          '<ellipse cx="6" cy="29" rx="7" ry="2.2" fill="rgba(0,0,0,0.5)"/>' +
          '<rect x="-1.4" y="23.4" width="14.8" height="6.6" rx="2" fill="rgba(45,125,210,0.96)" ' +
          'stroke="#7dd3fc" stroke-width="1.5"/></svg>'
        );
      }

      // Buildings read as circles so they are instantly distinguishable from tower flags.
      function mapBuildingIcon(kind) {
        const tint = MAP_KIND_TINT[kind] || "#f2d264";
        return (
          '<svg viewBox="0 0 26 26" width="100%" height="100%" aria-hidden="true">' +
          '<circle cx="13" cy="13" r="10" fill="' + tint + '" stroke="#141a28" stroke-width="2.4"/>' +
          '<circle cx="13" cy="13" r="4.4" fill="rgba(0,0,0,0.34)"/></svg>'
        );
      }

      function stageTabs() {
        return (
          '<div class="rm-stages">' +
          '<button type="button" data-map-stage="1"' + (mapStage === 1 ? ' class="on"' : "") + ">" + escapeHtml(tr(mapLocale(), "stage1Tab")) + "</button>" +
          '<button type="button" data-map-stage="2"' + (mapStage === 2 ? ' class="on"' : "") +
          ' class="locked">Stage 2 · full map &#128274;</button>' +
          "</div>"
        );
      }

      // Label priority — the ones people actually navigate by get first pick of open space.
      const LABEL_RANK = { shrine: 0, fh: 1, fort: 2, cc: 3, ars: 4, hosp: 4, op: 5, relay: 6, tower: 7 };
      // Candidate offsets in px from the default slot (centred just above the marker),
      // ordered nearest-first so a label only drifts as far as it actually has to.
      const LABEL_SLOTS = [
        [0, 0], [0, -14], [0, 26], [-30, -4], [30, -4], [0, -28], [-28, 20], [28, 20],
        [-42, -20], [42, -20], [0, 40], [-44, 12], [44, 12],
      ];
      // Past this gap a label no longer reads as belonging to its marker, so draw a leader.
      // The default slot already sits ~24px above the marker, so the threshold has to clear
      // that or every single label sprouts a line.
      const LABEL_LEADER_MIN = 33;

      // Code the map should spotlight, set by clicking a [CODE] inside an order.
      let mapFocusCode = "";
      let mapSelectedCode = "";

      // Turn every "[CC1]" in an already-escaped order string into a chip that jumps to the
      // map and spotlights that building. This is what ties the orders to the map.
      // `inButton` MUST be true when the text is rendered inside another <button> (the team
      // plan rows are buttons). Nested <button> is invalid HTML — the parser auto-closes the
      // outer one and everything after the chip gets ejected from the row. A span still
      // works: the click handler is delegated off [data-goto], not the element type.
      function linkifyCodes(escapedText, inButton = false) {
        const tag = inButton ? "span" : "button";
        const attrs = inButton ? "" : ' type="button"';
        return String(escapedText || "").replace(/\[([A-Z]{1,3}\d{0,2})\]/g, (m, code) =>
          "<" + tag + attrs + ' class="code-chip" data-goto="' + code + '" title="Show ' + code +
          ' on the map">' + code + "</" + tag + ">"
        );
      }

      // Spotlight `code` on whichever map is already on screen. Deliberately does NOT
      // change view — My Orders shows its own map panel, so yanking the user to Map
      // Briefing loses the orders they were reading.
      function focusMapCode(code) {
        mapFocusCode = mapFocusCode === code ? "" : code;
        renderRolePlanDialog();
        requestAnimationFrame(() => {
          if (!mapFocusCode) return;
          const pin = document.querySelector('.rm-pin[data-rm="' + code + '"]') ||
            document.querySelector('.rm-pin[data-rm="' + code + 'r"]');
          if (!pin) return;
          // Only scroll if the marker is actually off-screen, and never move the page.
          const stage = pin.closest(".rm-stage");
          const r = pin.getBoundingClientRect();
          if (stage && (r.top < 0 || r.bottom > innerHeight)) {
            stage.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        });
      }

      document.addEventListener("click", (event) => {
        const chip = event.target.closest?.("[data-goto]");
        if (!chip) return;
        event.preventDefault();
        // Chips sit inside clickable rows — don't also trigger the row's own handler.
        event.stopPropagation();
        focusMapCode(chip.dataset.goto);
      }, true);

      // Greedy de-collision: walk labels in priority order and drop each into the first
      // candidate slot that clears every marker and every label already placed.
      function layoutMapLabels(container) {
        const stageEl = container.querySelector(".rm-stage");
        if (!stageEl) return;
        const stage = stageEl.getBoundingClientRect();
        if (!stage.width) return;

        const grow = (r, m) => ({ left: r.left - m, right: r.right + m, top: r.top - m, bottom: r.bottom + m });
        const hits = (a, b) => !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
        const inside = (r) =>
          r.left >= stage.left && r.right <= stage.right && r.top >= stage.top && r.bottom <= stage.bottom;

        // Tower pins are deliberately NOT repositioned. The three lanes are collinear in
        // map coordinates and the projection is linear, so they render as straight lines —
        // any per-pin nudge, however small, visibly bends them. Only labels move.
        container.querySelectorAll(".rm-pin.tower").forEach((p) => {
          p.style.marginLeft = ""; p.style.marginTop = "";
        });

        // ── place each visible label in the first slot that is clear AND on-map ──
        const placed = [];
        const pins = [...container.querySelectorAll(".rm-pin")].filter((p) => {
          const n = p.querySelector(".rm-name");
          return n && parseFloat(getComputedStyle(n).opacity) > 0.05;
        });
        if (!pins.length) return;

        const blockers = [...container.querySelectorAll(".rm-flag, .rm-dot")].map((el) =>
          grow(el.getBoundingClientRect(), 1)
        );

        pins
          .map((p) => ({ p, rank: LABEL_RANK[(p.className.match(/k-(\w+)/) || [])[1]] ?? 9 }))
          .sort((a, b) => a.rank - b.rank)
          .forEach(({ p }) => {
            const label = p.querySelector(".rm-name");
            const put = (dx, dy) => {
              label.style.transform = "translate(-50%, -100%) translate(" + dx + "px," + dy + "px)";
              return grow(label.getBoundingClientRect(), 1);
            };
            let best = LABEL_SLOTS[0], bestScore = Infinity;
            for (const [dx, dy] of LABEL_SLOTS) {
              const box = put(dx, dy);
              // Off-map is worse than any overlap — a clipped label is unreadable.
              const score = blockers.filter((b) => hits(box, b)).length + (inside(box) ? 0 : 100);
              if (score === 0) { best = [dx, dy]; bestScore = 0; break; }
              if (score < bestScore) { bestScore = score; best = [dx, dy]; }
            }
            let box = put(best[0], best[1]);
            // Last resort: slide it back inside the map edges.
            if (!inside(box)) {
              let sx = best[0], sy = best[1];
              if (box.left < stage.left) sx += stage.left - box.left;
              if (box.right > stage.right) sx -= box.right - stage.right;
              if (box.top < stage.top) sy += stage.top - box.top;
              if (box.bottom > stage.bottom) sy -= box.bottom - stage.bottom;
              box = put(sx, sy);
            }
            blockers.push(box);
            placed.push({ pin: p, box });
          });

        // ── pass 3: leader lines for labels that had to sit far from their marker ──
        const svg = container.querySelector(".rm-leaders");
        if (!svg) return;
        svg.setAttribute("viewBox", "0 0 " + stage.width + " " + stage.height);
        const seg = placed.map(({ pin, box }) => {
          const m = pin.querySelector(".rm-flag, .rm-dot");
          if (!m) return "";
          const mr = m.getBoundingClientRect();
          // Tower flags are anchored at the base plate, buildings at the circle centre.
          const ax = mr.left + mr.width / 2 - stage.left;
          const ay = (pin.classList.contains("tower") ? mr.bottom - mr.height * 0.1 : mr.top + mr.height / 2) - stage.top;
          const lx = box.left + (box.right - box.left) / 2 - stage.left;
          const ly = box.top + (box.bottom - box.top) / 2 - stage.top;
          if (Math.hypot(lx - ax, ly - ay) < LABEL_LEADER_MIN) return "";
          return '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + lx.toFixed(1) +
            '" y2="' + ly.toFixed(1) + '"/>';
        }).join("");
        svg.innerHTML = seg;
      }

      // Label slots are measured in pixels, so a resize invalidates them. One listener for
      // the life of the page, debounced — re-render already re-runs the pass on its own.
      let mapLabelResizeTimer = 0;
      window.addEventListener("resize", () => {
        clearTimeout(mapLabelResizeTimer);
        mapLabelResizeTimer = setTimeout(() => {
          const host = document.getElementById("rolePlanContent");
          if (host && host.querySelector(".rm-pin")) layoutMapLabels(host);
        }, 140);
      });

      function bindRealMap(rows) {
        const c = document.getElementById("rolePlanContent");
        if (!c) return;
        // Run after layout settles so getBoundingClientRect sees final positions.
        requestAnimationFrame(() => layoutMapLabels(c));
        c.querySelectorAll("[data-rm-side]").forEach((b) =>
          b.addEventListener("click", () => { mapSideSel = b.dataset.rmSide; renderRolePlanDialog(); }));
        c.querySelectorAll("[data-rm-phase]").forEach((b) =>
          b.addEventListener("click", () => {
            mapPhaseSel = Number(b.dataset.rmPhase) || 0;
            boardPhaseIndex = mapPhaseSel;
            mapSelectedCode = "";
            renderRolePlanDialog();
          }));
        c.querySelectorAll("[data-map-stage]").forEach((b) =>
          b.addEventListener("click", () => { mapStage = Number(b.dataset.mapStage) || 1; renderRolePlanDialog(); }));
        c.querySelectorAll("[data-rm-art]").forEach((b) =>
          b.addEventListener("click", () => { mapArt = mapArt === "clean" ? "labeled" : "clean"; renderRolePlanDialog(); }));
        c.querySelectorAll("[data-rm-flags]").forEach((b) =>
          b.addEventListener("click", () => { mapShowFlags = !mapShowFlags; renderRolePlanDialog(); }));
        c.querySelectorAll("[data-rm]").forEach((b) =>
          b.addEventListener("click", () => {
            const code = b.dataset.rm;
            const label = b.dataset.rmLabel || code;
            const head = label === code ? label : label + " [" + code + "]";
            const own = b.dataset.rmOwn;
            const owner = own === "ours" ? " · OURS" : own === "theirs" ? " · ENEMY" : own === "neutral" ? " · contested" : "";
            const here = (rows || []).filter((r) => targetsFor(r, mapPhaseSel).includes(code));
            // Toggle selected highlight — clicking the same pin deselects it.
            if (mapSelectedCode === code) {
              mapSelectedCode = "";
              c.querySelectorAll(".rm-pin.selected").forEach((p) => p.classList.remove("selected"));
            } else {
              mapSelectedCode = code;
              c.querySelectorAll(".rm-pin.selected").forEach((p) => p.classList.remove("selected"));
              b.classList.add("selected");
            }
            toast(head + owner + (here.length ? " — " + here.map((r) => "#" + r.position + " " + r.player.name).join(", ")
                                      : " — " + tr(mapLocale(), "nobodyHere")));
          }));
      }

      // ══════════════════ GAME-PLAN SLIDESHOW ══════════════════
      let slideIndex = 0;
      function slideDeck(team, rows, locale) {
        const deck = [{ kind: "intro" }];
        stage1Flow.forEach((p, i) => deck.push({ kind: "phase", i }));
        deck.push({ kind: "roster" });
        return deck;
      }
      function renderSlideshow(team, rows, locale) {
        const deck = slideDeck(team, rows, locale);
        if (slideIndex >= deck.length) slideIndex = 0;
        if (slideIndex < 0) slideIndex = deck.length - 1;
        const slide = deck[slideIndex];
        const identity = teamIdentities[team.id] || { label: team.name };
        let body = "";

        if (slide.kind === "intro") {
          body =
            '<div class="ss-hero"><div class="ss-kicker">All-Star BoH · Stage 1</div>' +
            "<h2>" + escapeHtml(identity.label) + "</h2>" +
            '<p class="ss-lead">10-player active cap · backups enter only by paired substitution at 3:00+ · 60 minute match</p>' +
            '<div class="ss-tl">' +
            eventMilestones.map((m, i) =>
              '<div class="ss-tl-step s' + i + '"><b>' + escapeHtml(stage1Flow[i].time.replace(" Minutes", " min")) +
              "</b><span>" + escapeHtml(m.unlocks || "") + "</span></div>").join("") +
            "</div></div>";
        } else if (slide.kind === "phase") {
          const i = slide.i;
          const m = eventMilestones[i] || {};
          mapPhaseSel = i;
          const assignments = rows
            .map((row) => {
              const st = isStandbyForPhase(row.player, i);
              const a = row.phases[i] ? row.phases[i].assignment : null;
              if (st) return '<li class="ss-standby"><b>#' + row.position + " " + escapeHtml(row.player.name) + "</b> — enters at 30:00</li>";
              if (!a) return "";
              return '<li><b>#' + row.position + " " + escapeHtml(row.player.name) + "</b>" +
                '<span class="ss-l1">L1 ' + escapeHtml(localizedStageText(a.l1, locale)) + "</span>" +
                '<span class="ss-l2">L2 ' + escapeHtml(localizedStageText(a.l2, locale)) + "</span></li>";
            }).join("");
          body =
            '<div class="ss-phase p' + i + '">' +
            '<div class="ss-phase-head"><span class="ss-time">' + escapeHtml(stage1Flow[i].time) + "</span>" +
            "<span class=\"ss-unlock\">" + escapeHtml(m.unlocks || "") + "</span></div>" +
            '<div class="ss-cols">' +
            '<div class="ss-map">' + renderRealMap(rows) + "</div>" +
            '<div class="ss-side"><div class="ss-ops">' +
            '<div class="ss-op tp">' + planIconBig("teleport", 26) + "<div><b>" + escapeHtml(m.teleportTag || "") +
            "</b><span>" + escapeHtml(m.teleport || "") + "</span></div></div>" +
            '</div>' +
            '<ul class="ss-list">' + assignments + "</ul></div></div></div>";
        } else {
          body =
            '<div class="ss-hero"><h2>Roster &amp; roles</h2>' +
            '<div class="ss-roster">' +
            rows.map((row) =>
              '<div class="ss-rcard' + (row.player.backup ? " bk" : "") + '"><span class="ss-rk">#' + row.position + "</span>" +
              "<b>" + escapeHtml(row.player.name) + "</b>" +
              "<span>" + escapeHtml(localizedRole(row.roleKey, locale).label) +
              (row.player.backup ? " · backup" : "") + "</span></div>").join("") +
            "</div></div>";
        }

        const dots = deck.map((s, i) =>
          '<button type="button" class="ss-dot' + (i === slideIndex ? " on" : "") + '" data-slide="' + i +
          '" aria-label="Slide ' + (i + 1) + '"></button>').join("");

        return (
          '<div class="ss-wrap">' + body +
          '<div class="ss-nav"><button type="button" class="btn" data-slide-step="-1">&#8249; Back</button>' +
          '<div class="ss-dots">' + dots + "</div>" +
          '<button type="button" class="btn" data-slide-step="1">" + escapeHtml(tr(locale, "nextWord")) + " &#8250;</button></div></div>'
        );
      }
      function bindSlideshow(team, rows, locale) {
        const c = document.getElementById("rolePlanContent");
        if (!c) return;
        bindRealMap(rows);
        c.querySelectorAll("[data-slide-step]").forEach((b) =>
          b.addEventListener("click", () => { slideIndex += Number(b.dataset.slideStep); renderRolePlanDialog(); }));
        c.querySelectorAll("[data-slide]").forEach((b) =>
          b.addEventListener("click", () => { slideIndex = Number(b.dataset.slide) || 0; renderRolePlanDialog(); }));
      }

      // ══════════════════ ISOMETRIC BATTLEFIELD ENGINE (superseded by the real map) ══════════════════
      // Reproduces the real Battle-of-Honor field. Fitted from the in-game map screenshots:
      //   px = (u - v) * K          py = (u + v) * K * 0.5        u = X-600, v = Y-600
      // i.e. a classic 2:1 isometric projection (measured squash ratio 0.496).
      // Blue stronghold (600,661) lands lower-left, red (600,539) upper-right — exactly as
      // the game draws it.
      const ISO_K = 5.77;
      function isoX(X, Y) { return (X - 600 - (Y - 600)) * ISO_K; }
      function isoY(X, Y) { return (X - 600 + (Y - 600)) * ISO_K * 0.5; }

      // Stage 1 removes four buildings (two command centers + two outposts). They are drawn
      // as ghosts so the shape of the full map still reads.
      const STAGE1_REMOVED = ["CCx1", "CCx2", "OPx1", "OPx2"];

      // Naming is RELATIVE to the side you start on: "1" is always yours, "2" the enemy's.
      // Playing Red rotates the field 180 degrees, so every pair swaps.
      const FIELD = [
        { k: "fort",  blue: "HOME",  red: "ENEMY", X: 600, Y: 661, side: "blue", h: 20, w: 17 },
        { k: "fort",  blue: "ENEMY", red: "HOME",  X: 600, Y: 539, side: "red",  h: 20, w: 17 },
        { k: "cc",    blue: "CC1",   red: "CC2",   X: 635, Y: 635, side: "blue", h: 15, w: 13 },
        { k: "cc",    blue: "CC2",   red: "CC1",   X: 564, Y: 564, side: "red",  h: 15, w: 13 },
        { k: "op",    blue: "OP1",   red: "OP2",   X: 585, Y: 649, side: "blue", h: 11, w: 10 },
        { k: "op",    blue: "OP2",   red: "OP1",   X: 614, Y: 550, side: "red",  h: 11, w: 10 },
        { k: "hosp",  blue: "H1",    red: "H2",    X: 575, Y: 620, side: "blue", h: 10, w: 11 },
        { k: "hosp",  blue: "H2",    red: "H1",    X: 626, Y: 580, side: "red",  h: 10, w: 11 },
        { k: "ars",   blue: "A1",    red: "A2",    X: 626, Y: 620, side: "blue", h: 10, w: 11 },
        { k: "ars",   blue: "A2",    red: "A1",    X: 575, Y: 580, side: "red",  h: 10, w: 11 },
        { k: "relay", blue: "RP1",   red: "RP2r",  X: 600, Y: 623, side: "blue", h: 8,  w: 8 },
        { k: "relay", blue: "RP2",   red: "RP1r",  X: 600, Y: 611, side: "blue", h: 8,  w: 8 },
        { k: "relay", blue: "RP2r",  red: "RP2",   X: 599, Y: 588, side: "red",  h: 8,  w: 8 },
        { k: "relay", blue: "RP1r",  red: "RP1",   X: 599, Y: 576, side: "red",  h: 8,  w: 8 },
        { k: "fh",    blue: "FH1",   red: "FH1",   X: 555, Y: 600, side: "neutral", h: 16, w: 14 },
        { k: "fh",    blue: "FH2",   red: "FH2",   X: 646, Y: 600, side: "neutral", h: 16, w: 14 },
        { k: "shrine",blue: "S",     red: "S",     X: 600, Y: 600, side: "neutral", h: 18, w: 15 },
        // removed in stage 1 — kept as ghosts
        { k: "cc", blue: "CCx1", red: "CCx1", X: 564, Y: 635, side: "blue", h: 15, w: 13, ghost: true },
        { k: "cc", blue: "CCx2", red: "CCx2", X: 635, Y: 564, side: "red",  h: 15, w: 13, ghost: true },
        { k: "op", blue: "OPx1", red: "OPx1", X: 585, Y: 550, side: "red",  h: 11, w: 10, ghost: true },
        { k: "op", blue: "OPx2", red: "OPx2", X: 614, Y: 649, side: "blue", h: 11, w: 10, ghost: true },
      ];

      // Towers are BUILT OUT FROM YOUR OWN STRONGHOLD toward the sanctuary — each side grows
      // its own chain up its lane. Blue climbs from (600,661); red mirrors from (600,539).
      function towerChain(side) {
        return schematicTowerStructures(side).filter((tower) => tower.type === "tower").map((tower) => ({ k: "tower", id: tower.id, X: tower.x, Y: tower.y, side, parentId: tower.parentId, pinNudge: tower.pinNudge, coverageSize: 5, h: 7, w: 6 }));
      }

      const ISO_STYLE = {
        fort:   { roof: "#b83f36", wall: "#7d2a22", lit: "#d4564a" },
        cc:     { roof: "#8a63e8", wall: "#5b3fa8", lit: "#a684f5" },
        op:     { roof: "#d47ab8", wall: "#9a4f83", lit: "#e79ccd" },
        hosp:   { roof: "#22b57c", wall: "#137a52", lit: "#45d19a" },
        ars:    { roof: "#3f8fdd", wall: "#25609b", lit: "#63aaf0" },
        relay:  { roof: "#ef6a5c", wall: "#a83f34", lit: "#ff8a7d" },
        fh:     { roof: "#e8a91c", wall: "#9c6f08", lit: "#f7c454" },
        shrine: { roof: "#f2d264", wall: "#a8862a", lit: "#ffe89b" },
        tower:  { roof: "#5d6c92", wall: "#38445f", lit: "#8494bb" },
      };

      // An isometric block: top face + two side faces, so it reads as a 3D building.
      function isoBlock(X, Y, w, h, style, opts) {
        const o = opts || {};
        const cx = isoX(X, Y), cy = isoY(X, Y);
        const hw = w * ISO_K * 0.5, hh = w * ISO_K * 0.25, rise = h * ISO_K * 0.42;
        const top = [
          [cx, cy - hh - rise], [cx + hw, cy - rise], [cx, cy + hh - rise], [cx - hw, cy - rise],
        ].map((p) => p.join(",")).join(" ");
        const left = [
          [cx - hw, cy - rise], [cx, cy + hh - rise], [cx, cy + hh], [cx - hw, cy],
        ].map((p) => p.join(",")).join(" ");
        const right = [
          [cx + hw, cy - rise], [cx, cy + hh - rise], [cx, cy + hh], [cx + hw, cy],
        ].map((p) => p.join(",")).join(" ");
        const op = o.ghost ? 0.22 : 1;
        return (
          '<polygon points="' + left + '" fill="' + style.wall + '" opacity="' + op + '"/>' +
          '<polygon points="' + right + '" fill="' + style.lit + '" opacity="' + (op * 0.85) + '"/>' +
          '<polygon points="' + top + '" fill="' + style.roof + '" opacity="' + op +
          '" stroke="rgba(255,255,255,0.5)" stroke-width="0.7"/>'
        );
      }

      let isoSide = "blue";      // which side we start on
      let isoPhase = 0;          // timeline position
      let isoShowGhosts = true;
      let isoSelectedCode = "";

      function fieldLabel(f) { return isoSide === "blue" ? f.blue : f.red; }
      function fieldAllegiance(f) {
        if (f.side === "neutral") return "neutral";
        return f.side === isoSide ? "ours" : "theirs";
      }

      // Which structures a player is sent to in a given phase.
      function playerTargets(row, phaseIndex) {
        const entry = row.phases[phaseIndex];
        if (!entry) return [];
        const a = entry.assignment || {};
        const codes = new Set();
        [a.l1, a.l2, a.note].forEach((t) => {
          String(t || "").replace(/\[([A-Z]{1,3}\d{0,2})\]/g, (m, c) => { codes.add(c); return m; });
        });
        return [...codes];
      }

      function renderIsoField(rows, opts) {
        const towers = towerChain("blue").concat(towerChain("red"));
        const all = FIELD.filter((f) => isoShowGhosts || !f.ghost);

        // depth sort: things further "back" (smaller X+Y) draw first
        const drawable = all
          .map((f) => ({ ...f, id: fieldLabel(f), depth: f.X + f.Y }))
          .concat(towers.map((t) => ({ ...t, depth: t.X + t.Y })))
          .sort((a, b) => a.depth - b.depth);

        // where is each player this phase
        const marks = new Map();
        (rows || []).forEach((row) => {
          if (isStandbyForPhase(row.player, isoPhase)) return;
          playerTargets(row, isoPhase).forEach((code) => {
            if (!marks.has(code)) marks.set(code, []);
            marks.get(code).push(row);
          });
        });

        const ground =
          '<polygon points="' +
          [[600, 520], [680, 600], [600, 680], [520, 600]]
            .map(([X, Y]) => isoX(X, Y) + "," + isoY(X, Y)).join(" ") +
          '" fill="#a8763f" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>' +
          // side tint halves
          '<polygon points="' +
          [[600, 600], [680, 600], [600, 680], [520, 600]]
            .map(([X, Y]) => isoX(X, Y) + "," + isoY(X, Y)).join(" ") +
          '" fill="' + (isoSide === "blue" ? "rgba(45,125,210,0.22)" : "rgba(224,86,74,0.22)") + '"/>' +
          '<polygon points="' +
          [[600, 520], [680, 600], [600, 600], [520, 600]]
            .map(([X, Y]) => isoX(X, Y) + "," + isoY(X, Y)).join(" ") +
          '" fill="' + (isoSide === "blue" ? "rgba(224,86,74,0.22)" : "rgba(45,125,210,0.22)") + '"/>';

        const lanes =
          '<path d="M' + isoX(600, 661) + "," + isoY(600, 661) + " L" + isoX(600, 600) + "," + isoY(600, 600) +
          '" stroke="rgba(255,255,255,0.3)" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/>' +
          '<path d="M' + isoX(600, 539) + "," + isoY(600, 539) + " L" + isoX(600, 600) + "," + isoY(600, 600) +
          '" stroke="rgba(255,255,255,0.3)" stroke-width="1.4" stroke-dasharray="4 3" fill="none"/>';

        const nodes = drawable
          .map((f) => {
            const st = ISO_STYLE[f.k] || ISO_STYLE.tower;
            const here = marks.get(f.id) || [];
            const alg = f.k === "tower" ? (f.side === isoSide ? "ours" : "theirs") : fieldAllegiance(f);
            const cx = isoX(f.X, f.Y), cy = isoY(f.X, f.Y);
            const rise = f.h * ISO_K * 0.42;
            const active = here.length > 0;
            const ringColor = alg === "ours" ? "#4da3ff" : alg === "theirs" ? "#ff6a5c" : "#f2d264";

            const pad =
              '<ellipse cx="' + cx + '" cy="' + (cy + f.w * ISO_K * 0.25) + '" rx="' + (f.w * ISO_K * 0.62) +
              '" ry="' + (f.w * ISO_K * 0.31) + '" fill="none" stroke="' + ringColor +
              '" stroke-width="' + (active ? 2.4 : 1) + '" opacity="' + (f.ghost ? 0.25 : active ? 0.95 : 0.5) + '"/>';

            const block = isoBlock(f.X, f.Y, f.w, f.h, st, { ghost: f.ghost });

            const showName = f.k !== "tower" || f.id === "T1" || f.id === "T9";
            const label = showName
              ? '<text class="iso-label" x="' + cx + '" y="' + (cy - rise - f.w * ISO_K * 0.3) +
                '" text-anchor="middle">' +
                escapeHtml(f.ghost ? "removed" : f.k === "tower" ? f.id : structName(f.id)) + "</text>"
              : "";

            // player tokens stacked over the building
            const tokens = here
              .slice(0, 4)
              .map((row, i) => {
                const tx = cx + (i - (Math.min(here.length, 4) - 1) / 2) * 11;
                const ty = cy - rise - f.w * ISO_K * 0.3 - 13;
                return (
                  '<g class="iso-token"><circle cx="' + tx + '" cy="' + ty +
                  '" r="6.6" fill="var(--text)" stroke="' + ringColor + '" stroke-width="2"/>' +
                  '<text class="iso-token-t" x="' + tx + '" y="' + (ty + 2.6) + '" text-anchor="middle">' +
                  escapeHtml(String(row.position)) + "</text></g>"
                );
              })
              .join("") +
              (here.length > 4
                ? '<text class="iso-more" x="' + (cx + 30) + '" y="' + (cy - rise - 24) + '">+' + (here.length - 4) + "</text>"
                : "");

            return (
              '<g class="iso-node' + (active ? " active" : "") + (f.ghost ? " ghost" : "") +
              (isoSelectedCode && f.id === isoSelectedCode ? " selected" : "") +
              '" data-iso="' + escapeAttribute(f.id) + '" tabindex="0" role="button" aria-label="' +
              escapeAttribute(f.k === "tower" ? f.id : structName(f.id) + ", code " + f.id) + '">' +
              pad + block + label + tokens + "</g>"
            );
          })
          .join("");

        const phaseTabs = stage1Flow
          .map((p, i) =>
            '<button type="button" data-iso-phase="' + i + '"' + (i === isoPhase ? ' class="on p' + i + '"' : "") +
            ">" + escapeHtml(p.time.replace(" Minutes", "m")) + "</button>"
          )
          .join("");

        return (
          '<div class="iso-wrap">' +
          '<div class="iso-bar">' +
          '<div class="iso-sides">' +
          '<button type="button" data-iso-side="blue"' + (isoSide === "blue" ? ' class="on blue"' : "") + ">Start BLUE</button>" +
          '<button type="button" data-iso-side="red"' + (isoSide === "red" ? ' class="on red"' : "") + ">Start RED</button>" +
          "</div>" +
          '<div class="iso-phases">' + phaseTabs + "</div>" +
          '<button type="button" class="iso-ghost-btn' + (isoShowGhosts ? " on" : "") +
          '" data-iso-ghosts="1">Stage-1 removed</button>' +
          "</div>" +
          '<div class="iso-stage"><svg class="iso-svg" viewBox="-430 -230 860 470" role="img" aria-label="Battlefield">' +
          ground + lanes + nodes + "</svg></div>" +
          '<div class="iso-legend">' +
          [["fort", "Stronghold"], ["cc", "Command Center"], ["op", "Outpost"], ["fh", "Fortress of Honor"],
           ["hosp", "Hospital"], ["ars", "Arsenal"], ["relay", "Relay"], ["shrine", "Sanctuary"], ["tower", "Tower"]]
            .map(([k, l]) => '<span class="iso-key"><i style="background:' + ISO_STYLE[k].roof + '"></i>' + l + "</span>")
            .join("") +
          '<span class="iso-key"><i class="ring ours"></i>Ours</span>' +
          '<span class="iso-key"><i class="ring theirs"></i>Enemy</span>' +
          '<span class="iso-key">Numbered tokens = player rank at that objective</span>' +
          "</div></div>"
        );
      }

      function bindIsoField(rows) {
        const content = document.getElementById("rolePlanContent");
        if (!content) return;
        content.querySelectorAll("[data-iso-side]").forEach((b) =>
          b.addEventListener("click", () => { isoSide = b.dataset.isoSide; renderRolePlanDialog(); })
        );
        content.querySelectorAll("[data-iso-phase]").forEach((b) =>
          b.addEventListener("click", () => {
            isoPhase = Number(b.dataset.isoPhase) || 0;
            boardPhaseIndex = isoPhase;
            isoSelectedCode = "";
            renderRolePlanDialog();
          })
        );
        content.querySelectorAll("[data-iso-ghosts]").forEach((b) =>
          b.addEventListener("click", () => { isoShowGhosts = !isoShowGhosts; renderRolePlanDialog(); })
        );
        content.querySelectorAll("[data-iso]").forEach((node) => {
          const activate = () => {
            const code = node.dataset.iso;
            const f = FIELD.find((x) => fieldLabel(x) === code);
            const here = (rows || []).filter((r) => playerTargets(r, isoPhase).includes(code));
            const alg = f ? fieldAllegiance(f) : "";
            const named = structName(code);
            // Toggle selected highlight
            if (isoSelectedCode === code) {
              isoSelectedCode = "";
            } else {
              isoSelectedCode = code;
            }
            renderRolePlanDialog();
            toast(
              (named === code ? code : named + " [" + code + "]") +
              (f ? " · " + (alg === "ours" ? "OURS" : alg === "theirs" ? "ENEMY" : "contested") : "") +
              (here.length ? " — " + here.map((r) => "#" + r.position + " " + r.player.name).join(", ")
                           : " — " + tr(mapLocale(), "nobodyHere"))
            );
          };
          node.addEventListener("click", activate);
          node.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
          });
        });
      }

      // ══════════ BATTLEFIELD MAP ══════════
      // Battlefield reference. Structure markers use the legacy field scale; tower coordinates are real map coordinates on a 5x5 coverage footprint.
      // Red tower coordinates are an exact 180-degree rotation of Blue about the centre.
      const MAP_CENTER = 600;
      const BOH_STRUCTURES = [
        { id: "CC1", x: 564, y: 635, type: "cc", name: "Command Center 1" },
        { id: "CC2", x: 635, y: 635, type: "cc", name: "Command Center 2" },
        { id: "CC3", x: 564, y: 564, type: "cc", name: "Command Center 3" },
        { id: "CC4", x: 635, y: 564, type: "cc", name: "Command Center 4" },
        { id: "OP1", x: 585, y: 649, type: "op", name: "Outpost 1" },
        { id: "OP2", x: 614, y: 649, type: "op", name: "Outpost 2" },
        { id: "OP3", x: 585, y: 550, type: "op", name: "Outpost 3" },
        { id: "OP4", x: 614, y: 550, type: "op", name: "Outpost 4" },
        { id: "FH1", x: 555, y: 600, type: "fh", name: "Fortress of Honor 1" },
        { id: "FH2", x: 646, y: 600, type: "fh", name: "Fortress of Honor 2" },
        { id: "H1", x: 575, y: 620, type: "hosp", name: "Hospital 1" },
        { id: "H2", x: 626, y: 580, type: "hosp", name: "Hospital 2" },
        { id: "A1", x: 626, y: 620, type: "ars", name: "Arsenal 1" },
        { id: "A2", x: 575, y: 580, type: "ars", name: "Arsenal 2" },
        { id: "RP1", x: 600, y: 623, type: "relay", name: "Relay 1" },
        { id: "RP2", x: 600, y: 611, type: "relay", name: "Relay 2" },
        { id: "RP3", x: 599, y: 588, type: "relay", name: "Relay 3" },
        { id: "RP4", x: 599, y: 576, type: "relay", name: "Relay 4" },
        { id: "S", x: 600, y: 600, type: "shrine", name: "Sanctuary / Rune spawn" },
      ];
      // Real tower coordinates. Towers cover 5x5 centred on themselves and are planted
      // one after another out from your own stronghold. Numbering is fixed by the plan
      // text: T5 lands on Relay 1, T7 on Relay 2, T8/T9 straddle the Sanctuary, and T3 is
      // the early defensive teleport anchor. Trunk runs up the centre lane; TL*/TR* branch
      // out to the two Fortresses of Honor. Nothing crosses the centre line (Y >= 600).
      const TOWER_COVERAGE = 5;
      const BOH_TOWER_LAYOUT = [
        // TRUNK — dead straight up the centre lane, X constant at 600.
        ["HOME", "home",  600, 661, null],
        ["T1",   "tower", 600, 656, "HOME"],
        ["T2",   "tower", 600, 650, "T1"],
        ["T3",   "tower", 600, 645, "T2"],   // fork point for both branches
        ["T4",   "tower", 600, 634, "T3"],
        ["T5",   "tower", 600, 624, "T4"],   // covers Relay 1 (600,623)
        ["T6",   "tower", 600, 618, "T5"],
        ["T7",   "tower", 600, 612, "T6"],   // covers Relay 2 (600,611)
        ["T8",   "tower", 600, 606, "T7"],
        ["T9",   "tower", 600, 601, "T8"],   // covers the Sanctuary (600,600)
        // LEFT BRANCH — exact 45 degrees from T3 (600,645) to (557,602): every point
        // satisfies dX === dY, which is what makes it render as a straight diagonal.
        // The line passes through the Hospital at (575,620); that slot is left empty.
        ["TL1",  "tower", 592, 637, "T3"],
        ["TL2",  "tower", 584, 629, "TL1"],
        ["TL3",  "tower", 573, 618, "TL2"],
        ["TL4",  "tower", 566, 611, "TL3"],
        ["TL5",  "tower", 557, 602, "TL4"],  // covers FH1 (555,600)
        // RIGHT BRANCH — exact 45 degrees from T3 (600,645) to (645,600).
        ["TR1",  "tower", 608, 637, "T3"],
        ["TR2",  "tower", 616, 629, "TR1"],
        ["TR3",  "tower", 622, 623, "TR2"],
        ["TR4",  "tower", 632, 613, "TR3"],
        ["TR5",  "tower", 640, 605, "TR4"],
        ["TR6",  "tower", 645, 600, "TR5"],  // covers FH2 (646,600)
      ];
      const BOH_TOWER_LINKS = BOH_TOWER_LAYOUT.filter((node) => node[4])
        .map((node) => ({ from: node[4], to: node[0], kind: "territory" }))
        .concat([
          { from: "T9", to: "S", kind: "objective" },
          { from: "TL5", to: "FH1", kind: "objective" },
          { from: "TR6", to: "FH2", kind: "objective" },
        ]);
      // Red is an exact 180-degree rotation about the centre of the map.
      function schematicTowerStructures(side) {
        return BOH_TOWER_LAYOUT.map(([id, type, bx, by, parentId, pinNudge]) => ({
          id,
          type,
          parentId,
          pinNudge: pinNudge || null,
          x: side === "red" ? 2 * MAP_CENTER - bx : bx,
          y: side === "red" ? 2 * MAP_CENTER - by : by,
          side,
          coverageSize: TOWER_COVERAGE,
          schematic: true,
          name: id === "HOME" ? side.toUpperCase() + " home" : "Tower " + id.replace(/^T/, ""),
        }));
      }
      BOH_STRUCTURES.push(...schematicTowerStructures("blue"));
      const STRUCT_STYLE = {
        cc:     { fill: "#7c5cd6", label: "CC" },
        op:     { fill: "#c96fb0", label: "OP" },
        fh:     { fill: "var(--boh-amber)", label: "FH" },
        hosp:   { fill: "var(--good)", label: "H" },
        ars:    { fill: "var(--blue)", label: "A" },
        relay:  { fill: "var(--coral)", label: "RP" },
        shrine: { fill: "#f0c05a", label: "S" },
        tower:  { fill: "#4a5878", label: "T" },
        home:   { fill: "var(--text)", label: "" },
      };

      let mapSide = "blue"; // which side WE are starting on
      let bmSelectedCode = "";

      // A structure belongs to whoever's half it sits in. Playing Red flips every allegiance.
      function structureOwner(s) {
        if (s.type === "home") return s.id === "BLUE" ? "blue" : "red";
        if (s.y === MAP_CENTER) return "neutral";
        const half = s.y > MAP_CENTER ? "blue" : "red";
        return half;
      }
      function structureAllegiance(s) {
        const owner = structureOwner(s);
        if (owner === "neutral") return "neutral";
        return owner === mapSide ? "ours" : "theirs";
      }
      // The twin a structure becomes after a 180-degree rotation (i.e. the Red-side equivalent).
      function structureTwin(s) {
        return BOH_STRUCTURES.find(
          (o) => Math.abs(o.x - (1200 - s.x)) <= 2 && Math.abs(o.y - (1200 - s.y)) <= 2 && o.type === s.type
        );
      }

      // Structure codes referenced in a task line, e.g. "Capture Enemy Command Center [CC2]".
      function structureRefs(text) {
        const out = [];
        String(text || "").replace(/\[([A-Z]{1,2}\d{0,2})\]/g, (m, code) => {
          if (BOH_STRUCTURES.some((s) => s.id === code)) out.push(code);
          return m;
        });
        return out;
      }
      function focusStructureCodes(focus, phaseIndex) {
        if (!focus) return [];
        const codes = new Set();
        const phases = phaseIndex === null || phaseIndex === undefined ? focus.phases : [focus.phases[phaseIndex]];
        phases.filter(Boolean).forEach((entry) => {
          const a = entry.assignment || {};
          [a.l1, a.l2, a.note].forEach((t) => structureRefs(t).forEach((c) => codes.add(c)));
        });
        return [...codes];
      }

      function renderBattleMap(highlight, options) {
        const opts = options || {};
        const hi = new Set(highlight || []);
        const pad = 14;
        const minX = 548, maxX = 653, minY = 532, maxY = 668;
        const w = maxX - minX, h = maxY - minY;

        const halves =
          '<rect x="' + minX + '" y="' + MAP_CENTER + '" width="' + w + '" height="' + (maxY - MAP_CENTER) +
          '" fill="' + (mapSide === "blue" ? "rgba(45,125,210,0.13)" : "rgba(224,86,74,0.13)") + '"/>' +
          '<rect x="' + minX + '" y="' + minY + '" width="' + w + '" height="' + (MAP_CENTER - minY) +
          '" fill="' + (mapSide === "blue" ? "rgba(224,86,74,0.13)" : "rgba(45,125,210,0.13)") + '"/>' +
          '<line x1="' + minX + '" y1="' + MAP_CENTER + '" x2="' + maxX + '" y2="' + MAP_CENTER +
          '" stroke="rgba(23,32,51,0.35)" stroke-width="0.6" stroke-dasharray="3 2"/>';

        const towerNodes = schematicTowerStructures(mapSide);
        const displayStructures = BOH_STRUCTURES.filter((structure) => !structure.schematic).concat(towerNodes);
        const towerById = new Map(towerNodes.map((tower) => [tower.id, tower]));
        const coverage = towerNodes.map((tower) =>
          '<rect x="' + (tower.x - 2.5) + '" y="' + (tower.y - 2.5) + '" width="5" height="5" rx="0.8" fill="' +
          (mapSide === "blue" ? "rgba(45,125,210,0.10)" : "rgba(224,86,74,0.10)") + '" stroke="rgba(74,88,120,0.22)" stroke-width="0.35"/>'
        ).join("");
        const chain = BOH_TOWER_LINKS.map((link) => {
          const from = towerById.get(link.from);
          const mappedTarget = mapSide === "red" && link.kind === "objective" ? (link.to === "FH1" ? "FH2" : "FH1") : link.to;
          const to = towerById.get(link.to) || displayStructures.find((structure) => structure.id === mappedTarget);
          return from && to ? '<line x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '" stroke="rgba(74,88,120,0.58)" stroke-width="0.8" stroke-dasharray="2 1.5"/>' : "";
        }).join("");
        const nodes = displayStructures.map((s) => {
          const st = STRUCT_STYLE[s.type] || STRUCT_STYLE.tower;
          const alg = structureAllegiance(s);
          const isHi = hi.has(s.id);
          const r = s.type === "home" ? 5.2 : s.type === "tower" ? 2.6 : s.type === "shrine" ? 4.4 : 3.6;
          const ring =
            alg === "ours" ? "var(--blue)" : alg === "theirs" ? "var(--coral)" : "rgba(23,32,51,0.4)";
            return (
              '<g class="bm-node' + (isHi ? " hi" : "") + (bmSelectedCode === s.id ? " selected" : "") + '" data-struct="' + s.id +
            '" tabindex="0" role="button" aria-label="' + escapeAttribute(s.name || structName(s.id)) + '">' +
            (isHi
              ? '<circle cx="' + s.x + '" cy="' + s.y + '" r="' + (r + 3.4) +
                '" fill="none" stroke="var(--boh-amber)" stroke-width="1.5"><animate attributeName="r" values="' +
                (r + 2.4) + ";" + (r + 4.6) + ";" + (r + 2.4) +
                '" dur="1.6s" repeatCount="indefinite"/></circle>'
              : "") +
            '<circle cx="' + s.x + '" cy="' + s.y + '" r="' + r + '" fill="' + st.fill +
            '" stroke="' + ring + '" stroke-width="' + (s.type === "home" ? 1.6 : 1.1) + '"/>' +
            '<text class="bm-label" x="' + s.x + '" y="' + (s.y - r - 1.4) + '" text-anchor="middle">' +
            escapeHtml(
              s.type === "home" ? (s.id === "BLUE" ? "BLUE HOME" : "RED HOME")
                : s.type === "tower" ? s.id
                : s.name || structName(s.id)
            ) +
            "</text></g>"
          );
        }).join("");

        const legend = [
          ["cc", "Command Center"], ["op", "Outpost"], ["fh", "Fortress of Honor"],
          ["hosp", "Hospital"], ["ars", "Arsenal"], ["relay", "Relay"],
          ["shrine", "Sanctuary"], ["tower", "Tower"],
        ]
          .map(
            ([k, label]) =>
              '<span class="bm-key"><i style="background:' + STRUCT_STYLE[k].fill + '"></i>' + label + "</span>"
          )
          .join("");

        return (
          '<div class="bm-wrap">' +
          '<div class="bm-bar">' +
          '<div class="bm-side">' +
          '<button type="button" data-map-side="blue"' + (mapSide === "blue" ? ' class="on blue"' : "") + ">We are BLUE</button>" +
          '<button type="button" data-map-side="red"' + (mapSide === "red" ? ' class="on red"' : "") + ">We are RED</button>" +
          "</div>" +
          '<div class="bm-hint">' +
          (mapSide === "blue"
            ? "Blue home is bottom. Our buildings are the lower half."
            : "Playing Red flips the field 180&deg; — our buildings are the upper half (CC1&#8596;CC4, H1&#8596;H2, A1&#8596;A2, FH1&#8596;FH2).") +
          "</div></div>" +
          '<svg class="bm-svg" viewBox="' + (minX - pad / 2) + " " + (minY - pad / 2) + " " + (w + pad) + " " + (h + pad) +
          '" role="img" aria-label="Battlefield map">' +
          halves + coverage + chain + nodes + "</svg>" +
          '<div class="bm-legend"><span class="bm-key">Tower grid: schematic coordinates · 5x5 coverage</span>' + legend +
          '<span class="bm-key"><i class="ring ours"></i>Ours</span>' +
          '<span class="bm-key"><i class="ring theirs"></i>Enemy</span>' +
          "</div>" +
          (opts.footer || "") +
          "</div>"
        );
      }

      function bindBattleMap(rows) {
        const content = document.getElementById("rolePlanContent");
        if (!content) return;
        content.querySelectorAll("[data-map-side]").forEach((button) => {
          button.addEventListener("click", () => {
            mapSide = button.dataset.mapSide;
            renderRolePlanDialog();
          });
        });
        content.querySelectorAll("[data-struct]").forEach((node) => {
          const activate = () => {
            const code = node.dataset.struct;
            if (bmSelectedCode === code) {
              bmSelectedCode = "";
            } else {
              bmSelectedCode = code;
            }
            renderRolePlanDialog();
            showStructureInfo(code, rows);
          };
          node.addEventListener("click", activate);
          node.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
          });
        });
      }

      function showStructureInfo(code, rows) {
        const s = BOH_STRUCTURES.find((x) => x.id === code);
        if (!s) return;
        const twin = structureTwin(s);
        const alg = structureAllegiance(s);
        const who = [];
        (rows || []).forEach((row) => {
          row.phases.forEach((entry, i) => {
            const a = entry.assignment || {};
            const hit = [a.l1, a.l2, a.note].some((t) => structureRefs(t).includes(code));
            if (hit) who.push(row.player.name + " (" + stage1Flow[i].time.replace(" Minutes", "m") + ")");
          });
        });
        const owner = alg === "ours" ? "OURS" : alg === "theirs" ? "ENEMY" : "neutral";
        toast(
          s.name + " [" + code + "] · " + owner +
          (twin ? " · flips to " + twin.id + " on the other side" : "") +
          (who.length ? " — " + [...new Set(who)].slice(0, 6).join(", ") : " — no assignments reference it")
        );
      }

      // Larger icon variants for the action strips: use the approved standalone PNG assets.
      function planIconBig(kind, size) {
        const s = size || 30;
        return planAssetIcon(kind === "crystal" ? "crystal" : "teleport", s, kind === "crystal" ? "Crystals" : "Teleport");
      }

      // ══════════ TWO-TRACK LEGION TIMELINE ══════════
      // Legion 1 and Legion 2 run as separate vertical tracks on a shared time spine, so each
      // legion's job reads as one continuous flow instead of being interleaved phase by phase.
      let legionFilter = "both"; // both | l1 | l2

      function legionMeta(locale) {
        const copy = localeCopy(locale);
        return {
          l1: { label: copy.l1 || "Legion 1", sub: tr(locale, "legion1Sub") },
          l2: { label: copy.l2 || "Legion 2", sub: tr(locale, "legion2Sub") },
        };
      }

      // Crystals belong to whichever legion is actually gathering in that phase — never a
      // blanket strip under every row.
      function isGatherTask(text) {
        return /gather|crystal|кристалл|собирать|采集|水晶|recolect|coleta|toplama|sammeln/i.test(String(text || ""));
      }

      function renderLegionTracks(focus, locale) {
        const meta = legionMeta(locale);
        const showL1 = legionFilter !== "l2";
        const showL2 = legionFilter !== "l1";
        const cols = showL1 && showL2 ? "132px 1fr 1fr" : "132px 1fr";

        const head =
          '<div class="lt-head" style="grid-template-columns:' + cols + '">' +
          '<div class="lt-head-spacer"></div>' +
          (showL1
            ? '<div class="lt-legion-head l1"><span class="lt-legion-badge">L1</span>' +
              '<div><div class="lt-legion-title">' + escapeHtml(meta.l1.label) + "</div>" +
              '<div class="lt-legion-sub">' + escapeHtml(meta.l1.sub) + "</div></div></div>"
            : "") +
          (showL2
            ? '<div class="lt-legion-head l2"><span class="lt-legion-badge">L2</span>' +
              '<div><div class="lt-legion-title">' + escapeHtml(meta.l2.label) + "</div>" +
              '<div class="lt-legion-sub">' + escapeHtml(meta.l2.sub) + "</div></div></div>"
            : "") +
          "</div>";

        const rows = focus.phases
          .map((entry, i) => {
            const a = entry.assignment;
            const m = eventMilestones[i] || {};
            const standby = isStandbyForPhase(focus.player, i);
            const spine =
              '<div class="lt-spine"><div class="lt-dot">' +
              escapeHtml(localizedTimeLabel(entry.time, locale)) + "</div>" +
              '<div class="lt-unlock">' + escapeHtml(m.unlocks || "") + "</div></div>";

            if (standby) {
              return (
                '<div class="lt-row p' + i + '" style="grid-template-columns:' + cols + '">' + spine +
                '<div class="lt-strip standby" style="grid-column:2 / -1">' +
                '<span class="lt-strip-icon">' + planIconBig("teleport", 30) + "</span>" +
                '<div class="lt-strip-body"><div class="lt-strip-label">' + escapeHtml(tr(locale, "standby")) + '</div>' +
                '<div class="lt-strip-text">' + escapeHtml(tr(locale, "standbyNote")) + "</div>" +
                "</div></div></div>"
              );
            }

            const task = (which, text) => {
              const gathering = isGatherTask(text);
              return (
                '<div class="lt-task ' + which + (gathering ? " gathering" : "") + '">' +
                '<div class="lt-task-top"><span class="lt-stagerole">' +
                escapeHtml(localizedStageRole(a.stageRole, locale)) + "</span>" +
                (gathering
                  ? '<span class="lt-gather">' + planIconBig("crystal", 26) + "<span>" + escapeHtml(tr(locale, "gathering")) + "</span></span>"
                  : "") +
                "</div>" +
                '<div class="lt-text">' + escapeHtml(text) + "</div>" +
                "</div>"
              );
            };

            const note = localizedStageText(a.note, locale) || "";
            const moving = pvIsTeleportMove(note);
            // A real move gets a loud full-width strip; "no teleport" is just a quiet chip.
            const strip = !note
              ? ""
              : moving
              ? '<div class="lt-strip move" style="grid-column:2 / -1">' +
                '<span class="lt-strip-icon">' + planIconBig("teleport", 38) + "</span>" +
                '<div class="lt-strip-body"><div class="lt-strip-label">' + escapeHtml(tr(locale, "teleportNow")) + '</div>' +
                '<div class="lt-strip-text">' + escapeHtml(note) + "</div></div></div>"
              : '<div class="lt-chip-hold" style="grid-column:2 / -1">' +
                planIconBig("teleport", 18) + "<span>" + escapeHtml(note) + "</span></div>";

            return (
              '<div class="lt-row p' + i + '" style="grid-template-columns:' + cols + '">' +
              spine +
              (showL1 ? task("l1", localizedStageText(a.l1, locale)) : "") +
              (showL2 ? task("l2", localizedStageText(a.l2, locale)) : "") +
              strip +
              "</div>"
            );
          })
          .join("");

        return '<div class="lt-wrap">' + head + rows + "</div>";
      }

      function legionFilterMarkup(lc) {
        const opt = (key, label) =>
          '<button type="button" data-legion-filter="' + key + '"' +
          (legionFilter === key ? ' class="on"' : "") + ">" + label + "</button>";
        return '<div class="lt-filter">' + opt("both", tr(lc, "bothLegions")) + opt("l1", tr(lc, "legion1")) + opt("l2", tr(lc, "legion2")) + "</div>";
      }

      function bindLegionFilter() {
        const content = document.getElementById("rolePlanContent");
        if (!content) return;
        content.querySelectorAll("[data-legion-filter]").forEach((button) => {
          button.addEventListener("click", () => {
            legionFilter = button.dataset.legionFilter;
            renderRolePlanDialog();
          });
        });
      }

      // ══════════ BACKUP LATE-START ══════════
      // Stage 1 allows at most 10 active players. Backups default to no play and enter only through a paired substitution at minute 3 or later.
      const BACKUPS_PER_TEAM = 2;

      // ══════════ SUBSTITUTIONS ══════════
      // Explicit, configurable swaps: a backup enters at a chosen phase and takes over a
      // named player's slot (position → role → orders). Shape, keyed by backup player id:
      //   substitutions[backupId] = { replacesId, fromPhase }
      // A backup with no entry falls back to DEFAULT_SUB_PHASE and no named target, which
      // reproduces the old "everyone enters at 30:00" behaviour.
      const DEFAULT_SUB_PHASE = 4;

      function substitutionFor(playerId) {
        if (!playerId) return null;
        const entry = substitutions[String(playerId)];
        if (!entry) return null;
        const fromPhase = Number.isInteger(entry.fromPhase) ? entry.fromPhase : DEFAULT_SUB_PHASE;
        return { replacesId: entry.replacesId ? String(entry.replacesId) : "", fromPhase };
      }

      // The phase a backup actually enters play.
      function subEntryPhase(player) {
        return substitutionFor(player?.id)?.fromPhase ?? DEFAULT_SUB_PHASE;
      }

      // If this player is substituted OUT, returns { backupId, fromPhase }.
      function subbedOutBy(playerId) {
        if (!playerId) return null;
        const key = String(playerId);
        for (const [backupId, entry] of Object.entries(substitutions)) {
          if (!entry?.replacesId || String(entry.replacesId) !== key) continue;
          return { backupId, fromPhase: Number.isInteger(entry.fromPhase) ? entry.fromPhase : DEFAULT_SUB_PHASE };
        }
        return null;
      }

      // Human-readable reason a player is off the field this phase. Returns "" when active.
      function standbyNotice(player, phaseIndex, locale) {
        if (!player) return "";
        const phaseTime = (i) => localizedTimeLabel(stage1Flow[i]?.time || "", locale);
        if (player.backup) {
          const entry = subEntryPhase(player);
          if (phaseIndex >= entry) return "";
          const target = substitutionFor(player.id)?.replacesId;
          const name = target ? playerNameById(target) : "";
          return name
            ? tr(locale, "subEntersReplacing", "Backup — enters {time}, replacing {name}")
                .replace("{time}", phaseTime(entry)).replace("{name}", name)
            : tr(locale, "subEnters", "Backup — enters {time}").replace("{time}", phaseTime(entry));
        }
        const out = subbedOutBy(player.id);
        if (!out || phaseIndex < out.fromPhase) return "";
        const name = playerNameById(out.backupId);
        return name
          ? tr(locale, "subOutReplacedBy", "Out from {time} — replaced by {name}")
              .replace("{time}", phaseTime(out.fromPhase)).replace("{name}", name)
          : tr(locale, "subOut", "Out from {time}").replace("{time}", phaseTime(out.fromPhase));
      }

      function isStandbyForPhase(player, phaseIndex) {
        if (!player) return false;
        // Backup: off the field until their configured entry phase.
        if (player.backup) return phaseIndex < subEntryPhase(player);
        // Active player who gets replaced: off the field from the swap onward.
        const out = subbedOutBy(player.id);
        return Boolean(out) && phaseIndex >= out.fromPhase;
      }

      // Find which active player a backup replaces at phase 4 (30-60 min)
      // Backup #1 (top role) replaces 3rd Top player, Backup #2 (bottom role) replaces 3rd Bottom player
      function backupReplacementTarget(backupPlayer, rows) {
        if (!backupPlayer?.backup) return null;
        const backupRole = assignedPlanRole(backupPlayer);
        if (backupRole !== "top" && backupRole !== "bottom") return null;

        // Find active (non-backup) players in the same role, sorted by position
        const activeInRole = rows
          .filter((row) => row.roleKey === backupRole && !row.player.backup)
          .sort((a, b) => a.position - b.position);

        // Take the last active player in that role (3rd if exists, otherwise 2nd)
        return activeInRole.length > 0 ? activeInRole[activeInRole.length - 1] : null;
      }

      // Check if a player is replaced by a backup at phase 4
      function isReplacedByBackup(player, rows) {
        if (player?.backup) return false;
        const role = assignedPlanRole(player);
        if (role !== "top" && role !== "bottom") return false;

        // Find active players in this role
        const activeInRole = rows
          .filter((row) => row.roleKey === role && !row.player.backup)
          .sort((a, b) => a.position - b.position);

        // This player is replaced if they're the last in their role and there's a backup for that role
        const isLastInRole = activeInRole.length > 0 && activeInRole[activeInRole.length - 1].player.id === player.id;
        const hasBackupForRole = rows.some((row) => row.player.backup && assignedPlanRole(row.player) === role);

        return isLastInRole && hasBackupForRole;
      }
      function teamBackupCount(team) {
        return (team?.players || []).filter((p) => p.backup).length;
      }
      function togglePlayerBackup(playerId) {
        const located = locate(teams, playerId);
        if (!located) return toast("Backup change failed: player not visible.");
        const team = teams[located.teamIndex];
        const player = located.player;
        if (!player.backup && teamBackupCount(team) >= BACKUPS_PER_TEAM) {
          return toast(`${team.name} already has ${BACKUPS_PER_TEAM} backups. Clear one first.`);
        }
        if (player.main) return toast(`${player.name} is pinned as main by rule.`);
        withUndo(() => {
          const current = locate(teams, playerId)?.player;
          if (current) {
            current.backup = !current.backup;
            if (!current.backup) delete substitutions[String(current.id)];
          }
        });
        renderRolePlanDialog();
      }

      // Command-workspace plan views.
      let boardPhaseIndex = 0;
      let planViewMode = "player"; // land on My Orders
      let planFocusPlayerId = "";

      function planRowsForTeam(team) {
        return teamRolePlanRows(team);
      }

      function clampPlanPhase(index) {
        const value = Number(index) || 0;
        return Math.max(0, Math.min(stage1Flow.length - 1, value));
      }

      function activePlanPhaseIndex() {
        boardPhaseIndex = clampPlanPhase(boardPhaseIndex);
        mapPhaseSel = boardPhaseIndex;
        return boardPhaseIndex;
      }

      function setPlanPhase(index) {
        boardPhaseIndex = clampPlanPhase(index);
        mapPhaseSel = boardPhaseIndex;
      }

      function planFocusRow(rows) {
        return rows.find((row) => row.player.id === planFocusPlayerId) || rows[0] || null;
      }

      function pvIsTeleportMove(text) {
        if (!text) return false;
        const isTp = /teleport|телепорт|传送|传送到|teleporte|téléport/i.test(text);
        const holding = /^\s*(no teleport|без телепорта|不传送|sin teleport)/i.test(text);
        return isTp && !holding;
      }

      function renderPlanPhaseSelector(locale, label = "Battle phase") {
        const current = activePlanPhaseIndex();
        return (
          '<div class="role-plan-phase-block" aria-label="' + escapeAttribute(label) + '">' +
          '<div class="role-plan-kicker">Current phase</div>' +
          // Progress rail: the fill animates to the active phase, so the battle reads as a
          // timeline you move along rather than five separate buttons.
          '<div class="pbar">' +
          '<div class="pbar-rail" aria-hidden="true"><div class="pbar-fill" style="width:' +
          (stage1Flow.length > 1 ? (current / (stage1Flow.length - 1)) * 100 : 100).toFixed(2) +
          '%"></div></div>' +
          '<div class="pbar-steps">' +
          stage1Flow
            .map((phase, i) => {
              const state = i < current ? " done" : i === current ? " on" : "";
              const m = eventMilestones[i] || {};
              return (
                '<button class="pbar-step p' + i + state +
                '" type="button" data-plan-phase="' + i + '" aria-pressed="' + String(i === current) + '">' +
                '<span class="pbar-node" aria-hidden="true"></span>' +
                '<b>' + escapeHtml(localizedTimeLabel(phase.time, locale).replace(" Minutes", "m")) + '</b>' +
                '<span class="pbar-note">' + escapeHtml(m.unlocks || "") + '</span>' +
                '</button>'
              );
            })
            .join("") +
          '</div></div></div>'
        );
      }

      function bindPlanPhaseControls() {
        const content = document.getElementById("rolePlanContent");
        if (!content) return;
        content.querySelectorAll("[data-plan-phase]").forEach((button) => {
          button.addEventListener("click", () => {
            setPlanPhase(button.dataset.planPhase);
            renderRolePlanDialog();
          });
        });
      }

      function teleportOrderMarkup(note, locale) {
        const text = localizedStageText(note, locale) || localeCopy(locale).noTeleport || "No teleport.";
        const moving = pvIsTeleportMove(text);
        return (
          '<article class="role-plan-action-row ' + (moving ? "move" : "hold") + '">' +
          '<span>' + planIconBig("teleport", 36) + '</span>' +
          '<div><div class="role-plan-label">' + (moving ? "Teleport now" : "Teleport") + '</div>' +
          '<p>' + escapeHtml(text) + '</p></div></article>'
        );
      }

      function crystalInstruction(assignment, locale) {
        const l1 = localizedStageText(assignment?.l1, locale);
        const l2 = localizedStageText(assignment?.l2, locale);
        const gather = [];
        if (isGatherTask(l1)) gather.push("L1: " + l1);
        if (isGatherTask(l2)) gather.push("L2: " + l2);
        return gather.join(" / ");
      }

      function renderRosterRail(rows, focus) {
        return (
          '<aside class="role-plan-rail" aria-label="Team roster">' +
          '<div class="role-plan-kicker">Roster</div>' +
          rows
            .map((row) =>
              '<button class="role-plan-roster-btn' + (row === focus ? " on" : "") + '" type="button" data-pv-player="' +
              escapeAttribute(row.player.id) + '">' +
              '<span class="role-plan-rank">#' + row.position + '</span>' +
              '<span><span class="role-plan-name">' + escapeHtml(row.player.name) + '</span>' +
              '<span class="role-plan-subtle">' + escapeHtml(row.player.backup ? "Backup" : planRoles[row.roleKey]?.label || row.roleKey) +
              ' - ' + compact(row.player.power) + '</span></span></button>'
            )
            .join("") +
          '</aside>'
        );
      }

      function renderPlayerPlanView(team, rows, locale) {
        const phaseIndex = activePlanPhaseIndex();
        const milestone = eventMilestones[phaseIndex] || {};
        const focus = planFocusRow(rows);
        if (!focus) return '<div class="empty">No players on this team yet.</div>';
        const copy = localeCopy(locale);
        const role = localizedRole(focus.roleKey, locale);
        let assignment = focus.phases[phaseIndex]?.assignment || stage1Assignment(focus.position, stage1Flow[phaseIndex]);
        const standby = isStandbyForPhase(focus.player, phaseIndex);
        const nextIndex = Math.min(stage1Flow.length - 1, phaseIndex + 1);
        const nextAssignment = focus.phases[nextIndex]?.assignment;
        const backupCount = teamBackupCount(team);
        const titleRole = focus.player.titleRole
          ? '<span class="role-plan-mini-pill">' + escapeHtml(localizedTitleRoleLabel(focus.player.titleRole, locale)) + '</span>'
          : "";
        mapPhaseSel = phaseIndex;

        // The inherited slot is already resolved in teamRolePlanRows(), so `assignment`
        // is correct for every phase without special-casing.
        const replacedByBackup = Boolean(subbedOutBy(focus.player.id)) && standby;

        const identity =
          '<section class="role-plan-player-head" aria-label="Selected player" tabindex="-1">' +
          '<span class="role-plan-rank">#' + focus.position + '</span>' +
          // While standby, the role is not yet theirs — showing it reads as an active
          // assignment with no orders, which is exactly the confusion this replaced.
          '<div><h3>' + escapeHtml(focus.player.name) + '</h3>' +
          '<span class="role-plan-subtle">' + (standby ? "" : escapeHtml(role.label) + ' - ') +
          fmt(curveScore(focus.player.score)) +
          ' score - ' + compact(focus.player.power) + ' power</span></div>' +
          '<span class="role-plan-role-pill">' + escapeHtml(
            standby
              ? standbyNotice(focus.player, phaseIndex, locale)
              : focus.player.backup
              ? tr(locale, "subActiveNow", "In play — covering {name}")
                  .replace("{name}", playerNameById(substitutionFor(focus.player.id)?.replacesId) || role.label)
              : role.description
          ) + '</span>' +
          titleRole +
          '</section>';

        // Two distinct standby cases, and they must NOT share copy: a backup waiting to
        // come on, versus an active player who has already been substituted off.
        const standbyPanel = () => {
          const out = subbedOutBy(focus.player.id);
          const phaseTime = (i) => localizedTimeLabel(stage1Flow[i]?.time || "", locale);
          if (out && phaseIndex >= out.fromPhase) {
            const who = playerNameById(out.backupId);
            return '<section class="role-plan-panel" style="padding:12px"><div class="role-plan-kicker">Current orders</div>' +
              '<h3>' + escapeHtml(tr(locale, "subOutTitle", "Substituted off")) + '</h3>' +
              '<p class="role-plan-subtle">' + escapeHtml(
                who
                  ? tr(locale, "subOutBody", "{name} took over your slot at {time}. You are off the battlefield for the rest of the match.")
                      .replace("{name}", who).replace("{time}", phaseTime(out.fromPhase))
                  : tr(locale, "subOutBodyPlain", "You left the battlefield at {time}.").replace("{time}", phaseTime(out.fromPhase))
              ) + '</p></section>';
          }
          const sub = substitutionFor(focus.player.id);
          const entry = subEntryPhase(focus.player);
          const target = sub?.replacesId ? playerNameById(sub.replacesId) : "";
          return '<section class="role-plan-panel" style="padding:12px"><div class="role-plan-kicker">Current orders</div>' +
            '<h3>' + escapeHtml(tr(locale, "subWaitTitle", "Not in play yet")) + '</h3>' +
            '<p class="role-plan-subtle">' + escapeHtml(
              target
                ? tr(locale, "subWaitBody", "You come on at {time}, taking over from {name}. Stay off the battlefield until then.")
                    .replace("{time}", phaseTime(entry)).replace("{name}", target)
                : tr(locale, "subWaitBodyPlain", "You come on at {time}. No replacement target is set yet — ask your leader.")
                    .replace("{time}", phaseTime(entry))
            ) + '</p></section>';
        };

        const orders = standby
          ? standbyPanel()
          : '<section class="role-plan-orders-grid" aria-label="Current legion orders">' +
            '<article class="role-plan-order-card l1"><span class="role-plan-legion-badge">L1</span><div>' +
            '<div class="role-plan-label">' + escapeHtml(copy.l1 || "Legion 1") + '</div>' +
            '<strong>' + linkifyCodes(escapeHtml(localizedStageText(assignment.l1, locale))) + '</strong>' +
            '<p>' + escapeHtml(localizedStageRole(assignment.stageRole, locale)) + '</p></div></article>' +
            '<article class="role-plan-order-card l2"><span class="role-plan-legion-badge">L2</span><div>' +
            '<div class="role-plan-label">' + escapeHtml(copy.l2 || "Legion 2") + '</div>' +
            '<strong>' + linkifyCodes(escapeHtml(localizedStageText(assignment.l2, locale))) + '</strong>' +
            '<p>' + escapeHtml(localizedStageRole(assignment.stageRole, locale)) + '</p></div></article>' +
            // L3/L4 are placeholders until the third and fourth legions are rostered.
            '<article class="role-plan-order-card l3 soon" aria-disabled="true"><span class="role-plan-legion-badge">L3</span><div>' +
            '<div class="role-plan-label">Legion 3</div>' +
            '<strong>Soon</strong>' +
            '<p>Not yet assigned</p></div></article>' +
            '<article class="role-plan-order-card l4 soon" aria-disabled="true"><span class="role-plan-legion-badge">L4</span><div>' +
            '<div class="role-plan-label">Legion 4</div>' +
            '<strong>Soon</strong>' +
            '<p>Not yet assigned</p></div></article>' +
            '</section>';

        const nextPreview =
          '<article class="role-plan-next"><div class="role-plan-next-label">Next phase</div>' +
          (phaseIndex === stage1Flow.length - 1
            ? '<p>Final phase remains active through match end.</p>'
            : '<p><b>' + escapeHtml(localizedTimeLabel(stage1Flow[nextIndex].time, locale)) + '</b>: ' +
              escapeHtml(localizedStageText(nextAssignment?.l1 || "", locale)) + ' / ' +
              escapeHtml(localizedStageText(nextAssignment?.l2 || "", locale)) + '</p>') +
          '</article>';

        const edit =
          '<section class="role-plan-edit" aria-label="Plan edit controls">' +
          '<span class="role-plan-label">Plan edit</span>' +
          '<select id="pvRoleSelect" aria-label="Match plan role">' +
          planRoleOptions
            .map(([key]) => '<option value="' + key + '"' + (focus.roleKey === key ? " selected" : "") + '>' +
              escapeHtml(localizedRole(key, locale).label) + '</option>')
            .join("") +
          '</select>' +
          '<button class="pv-backup-btn' + (focus.player.backup ? " on" : "") + '" type="button" id="pvBackupBtn">' +
          (focus.player.backup
            ? "Backup - enters " + escapeHtml(localizedTimeLabel(stage1Flow[subEntryPhase(focus.player)].time, locale))
            : "Make backup") + '</button>' +
          '<span class="role-plan-subtle">' + backupCount + '/' + BACKUPS_PER_TEAM + ' backups</span>' +
          (focus.player.backup
            ? '<span class="role-plan-subtle">Replaces</span>' +
              '<select id="pvSubTarget" aria-label="Player this backup replaces">' +
              '<option value="">— nobody —</option>' +
              teamRolePlanRows(rolePlanTeam())
                .filter((row) => !row.player.backup && row.player.id !== focus.player.id)
                .map((row) => '<option value="' + row.player.id + '"' +
                  (substitutionFor(focus.player.id)?.replacesId === row.player.id ? " selected" : "") + '>' +
                  '#' + escapeHtml(String(row.position)) + ' ' + escapeHtml(row.player.name) + '</option>')
                .join("") +
              '</select>' +
              '<span class="role-plan-subtle">from</span>' +
              '<select id="pvSubPhase" aria-label="Substitution phase">' +
              stage1Flow
                .map((phase, i) => '<option value="' + i + '"' +
                  (subEntryPhase(focus.player) === i ? " selected" : "") + '>' +
                  escapeHtml(localizedTimeLabel(phase.time, locale)) + '</option>')
                .join("") +
              '</select>'
            : '') +
          '<button type="button" data-pv-step="-1" aria-label="Previous player">Prev</button>' +
          '<button type="button" data-pv-step="1" aria-label="Next player">Next</button>' +
          '</section>';

        const crystalOrder = !replacedByBackup && !standby ? crystalInstruction(assignment, locale) : "";
        const main =
          '<main class="role-plan-main">' +
          '<section class="role-plan-brief-list"><span>Context</span><p><b>' + escapeHtml(localizedTimeLabel(stage1Flow[phaseIndex].time, locale)) +
          '</b> - ' + escapeHtml(milestone.unlocks || "") + '</p></section>' +
          renderPlanPhaseSelector(locale) + identity + orders +
          (!replacedByBackup && !standby ? teleportOrderMarkup(assignment.note, locale) : "") +
          (crystalOrder
            ? '<article class="role-plan-action-row crystal"><span>' + planIconBig("crystal", 36) + '</span><div><div class="role-plan-label">Crystals</div><p>' + escapeHtml(crystalOrder) + '</p></div></article>'
            : '') +
          nextPreview + edit + '</main>';

        const map =
          '<aside class="role-plan-map-panel" aria-label="Tactical map preview">' +
          renderRealMap(rows) +
          '<button class="role-plan-map-open" type="button" data-open-map-briefing="1">Open Map Briefing</button>' +
          '</aside>';

        return '<div class="role-plan-command">' + renderRosterRail(rows, focus) + main + map + '</div>';
      }

      function bindPlayerPlanEvents(rows) {
        const content = document.getElementById("rolePlanContent");
        if (!content) return;
        bindPlanPhaseControls();
        content.querySelectorAll("[data-pv-player]").forEach((button) => {
          button.addEventListener("click", () => {
            planFocusPlayerId = button.dataset.pvPlayer;
            selectedId = planFocusPlayerId;
            renderRolePlanDialog();
          });
        });
        bindRealMap(rows);
        document.getElementById("pvRoleSelect")?.addEventListener("change", (event) => {
          const focus = planFocusRow(rows);
          if (focus) setPlanRole(focus.player.id, event.target.value);
          renderRolePlanDialog();
        });
        document.getElementById("pvBackupBtn")?.addEventListener("click", () => {
          const focus = planFocusRow(rows);
          if (focus) togglePlayerBackup(focus.player.id);
        });
        document.getElementById("pvSubTarget")?.addEventListener("change", (event) => {
          const focus = planFocusRow(rows);
          if (!focus) return;
          const backupId = String(focus.player.id);
          withUndo(() => {
            const current = substitutionFor(backupId) || { replacesId: "", fromPhase: DEFAULT_SUB_PHASE };
            substitutions[backupId] = { replacesId: event.target.value || "", fromPhase: current.fromPhase };
          });
          renderRolePlanDialog();
        });
        document.getElementById("pvSubPhase")?.addEventListener("change", (event) => {
          const focus = planFocusRow(rows);
          if (!focus) return;
          const backupId = String(focus.player.id);
          withUndo(() => {
            const current = substitutionFor(backupId) || { replacesId: "", fromPhase: DEFAULT_SUB_PHASE };
            substitutions[backupId] = { replacesId: current.replacesId, fromPhase: Number(event.target.value) };
          });
          renderRolePlanDialog();
        });
        content.querySelectorAll("[data-pv-step]").forEach((button) => {
          button.addEventListener("click", () => {
            const focus = planFocusRow(rows);
            const at = rows.indexOf(focus);
            const next = rows[(at + Number(button.dataset.pvStep) + rows.length) % rows.length];
            if (next) {
              planFocusPlayerId = next.player.id;
              selectedId = next.player.id;
              renderRolePlanDialog();
            }
          });
        });
        content.querySelector("[data-open-map-briefing]")?.addEventListener("click", () => {
          planViewMode = "map";
          renderRolePlanDialog();
        });
      }

      function roleLaneOrder(roleKey) {
        return { offensive: 0, top: 1, bottom: 2, rune: 3 }[roleKey] ?? 4;
      }

      function renderTeamPlanView(team, rows, locale) {
        const phaseIndex = activePlanPhaseIndex();
        const milestone = eventMilestones[phaseIndex] || {};
        const phase = stage1Flow[phaseIndex] || stage1Flow[0];
        const laneDefs = [
          ["offensive", "Offensive"],
          ["top", "Top"],
          ["bottom", "Bottom"],
          ["rune", "Rune / Support"],
        ];
        const laneMarkup = laneDefs
          .map(([roleKey, fallback]) => {
            const laneRows = rows.filter((row) => row.roleKey === roleKey && !row.player.backup);
            return (
              '<section class="role-plan-lane lane-' + roleKey + '">' +
              '<div class="role-plan-lane-title"><b>' + escapeHtml(localizedRole(roleKey, locale).label || fallback) + '</b><span>' + laneRows.length + ' active</span></div>' +
              (laneRows.length
                ? laneRows.map((row) => renderTeamPlanRow(row, phaseIndex, locale, false, rows)).join("")
                : '<p class="role-plan-subtle">No active players assigned.</p>') +
              '</section>'
            );
          })
          .join("");
        const backups = rows.filter((row) => row.player.backup).sort((a, b) => roleLaneOrder(a.roleKey) - roleLaneOrder(b.roleKey));
        const backupMarkup =
          '<section class="role-plan-lane lane-backup"><div class="role-plan-lane-title"><b>Backup / standby</b><span>' +
          backups.length + '/' + BACKUPS_PER_TEAM + '</span></div>' +
          (backups.length ? backups.map((row) => renderTeamPlanRow(row, phaseIndex, locale, true, rows)).join("") : '<p class="role-plan-subtle">No backups selected.</p>') +
          '</section>';
        mapPhaseSel = phaseIndex;
        return (
          '<div class="role-plan-team">' +
          '<div class="role-plan-team-phases">' + renderPlanPhaseSelector(locale, "Team phase") + '</div>' +
          '<section class="role-plan-map-panel">' + renderRealMap(rows) + '</section>' +
          '<main class="role-plan-main">' +
          '<section class="role-plan-brief-list"><span>Commander brief</span><p><b>' + escapeHtml(localizedTimeLabel(phase.time, locale)) +
          '</b> - ' + escapeHtml(milestone.unlocks || "") + '</p><p>' + escapeHtml(milestone.teleport || "") + '</p></section>' +
          '<div class="role-plan-lanes">' + laneMarkup + backupMarkup + '</div></main></div>'
        );
      }

      function renderTeamPlanRow(row, phaseIndex, locale, backup = false, allRows = []) {
        let entry = row.phases[phaseIndex];
        let a = entry?.assignment;
        const standby = isStandbyForPhase(row.player, phaseIndex);
        const role = localizedRole(row.roleKey, locale);

        // For backups at phase 4, use the assignment of the player they replace
        // teamRolePlanRows() already resolved the inherited slot for a substituted-in
        // backup, so the row's own assignment is correct for every phase.
        const replacedByBackup = Boolean(subbedOutBy(row.player.id)) && standby;
        const displayAssignment = a;

        const note = displayAssignment ? localizedStageText(displayAssignment.note, locale) : "";
        const tasks = standby
          ? '<div class="role-plan-subtle">' + escapeHtml(standbyNotice(row.player, phaseIndex, locale)) + '</div>'
          : replacedByBackup
          ? '<div class="role-plan-subtle">' + escapeHtml(standbyNotice(row.player, phaseIndex, locale)) + '</div>'
          : '<div class="role-plan-team-tasks">' +
            '<span class="role-plan-task-line"><b>L1</b><span>' + linkifyCodes(escapeHtml(localizedStageText(displayAssignment?.l1 || "", locale)), true) + '</span></span>' +
            '<span class="role-plan-task-line"><b>L2</b><span>' + linkifyCodes(escapeHtml(localizedStageText(displayAssignment?.l2 || "", locale)), true) + '</span></span>' +
            // L3/L4 are deliberately NOT repeated per player here — 12 rows x 2 "Soon" lines
            // is 24 lines of noise in a dense list. The placeholder lives in My Orders.
            (note ? '<span class="role-plan-task-line"><b>TP</b><span>' + escapeHtml(note) + '</span></span>' : "") +
            '</div>';
        return (
          '<button class="role-plan-team-row' + (backup || row.player.backup ? " backup" : "") + (standby ? " standby" : "") + (replacedByBackup ? " replaced" : "") +
          '" type="button" data-tb-player="' + escapeAttribute(row.player.id) + '">' +
          '<span class="role-plan-rank">#' + row.position + '</span>' +
          '<span><span class="role-plan-name">' + escapeHtml(row.player.name) + '</span>' +
          '<span class="role-plan-subtle">' + (standby ? "" : escapeHtml(role.label) + ' - ') +
          row.player.locale.toUpperCase() + ' - ' + compact(row.player.power) + '</span>' +
          tasks + '</span></button>'
        );
      }

      function bindTeamBoardEvents() {
        const content = document.getElementById("rolePlanContent");
        if (!content) return;
        bindPlanPhaseControls();
        bindRealMap(planRowsForTeam(rolePlanTeam()));
        content.querySelectorAll("[data-tb-player]").forEach((button) => {
          button.addEventListener("click", () => {
            planFocusPlayerId = button.dataset.tbPlayer;
            selectedId = planFocusPlayerId;
            planViewMode = "player";
            renderRolePlanDialog();
            document.querySelector(".role-plan-player-head")?.focus?.();
          });
        });
      }

      function renderMapBriefingView(team, rows, locale) {
        const phaseIndex = activePlanPhaseIndex();
        const milestone = eventMilestones[phaseIndex] || {};
        const phase = stage1Flow[phaseIndex] || stage1Flow[0];
        const focus = planFocusRow(rows);
        const objectives = rows
          .filter((row) => !isStandbyForPhase(row.player, phaseIndex))
          .map((row) => {
            const a = row.phases[phaseIndex]?.assignment;
            const codes = targetsFor(row, phaseIndex).join(", ") || "no map code";
            return '<article class="role-plan-objective"><div class="role-plan-label">#' + row.position + ' ' + escapeHtml(row.player.name) + '</div>' +
              '<p>' + escapeHtml(localizedStageText(a?.l1 || "", locale)) + ' / ' + escapeHtml(localizedStageText(a?.l2 || "", locale)) + '</p>' +
              '<p class="role-plan-subtle">Targets: ' + escapeHtml(codes) + '</p></article>';
          })
          .join("");
        mapPhaseSel = phaseIndex;
        return (
          '<div class="role-plan-map">' +
          '<section class="role-plan-map-panel">' + renderPlanPhaseSelector(locale, "Map phase") + renderRealMap(rows) + '</section>' +
          '<aside class="role-plan-map-side">' +
          '<section class="role-plan-brief-list"><span>Map briefing</span><h3>' + escapeHtml(localizedTimeLabel(phase.time, locale)) + '</h3>' +
          '<p>' + escapeHtml(milestone.unlocks || "") + '</p><p>' + escapeHtml(milestone.teleport || "") + '</p><p>' + escapeHtml(milestone.crystal || "") + '</p></section>' +
          '<section class="role-plan-brief-list"><span>Selected player</span><p>' +
          escapeHtml(focus ? '#' + focus.position + ' ' + focus.player.name + ' - ' + localizedRole(focus.roleKey, locale).label : 'No player selected') +
          '</p></section>' +
          '<section class="role-plan-brief-list"><span>Phase objectives</span>' + objectives + '</section>' +
          '</aside></div>'
        );
      }

      function bindMapBriefingEvents(rows) {
        bindPlanPhaseControls();
        bindRealMap(rows);
      }
      function renderRolePlanDialog() {
        const dialog = document.getElementById("rolePlanDialog");
        const content = document.getElementById("rolePlanContent");
        const select = document.getElementById("rolePlanTeamSwitch");
        if (!dialog || !content || !select || dialog.hidden) return;
        const team = rolePlanTeam();
        const identity = teamIdentities[team.id] || { label: displayTeamName(team), shortName: team.name };
        const rows = teamRolePlanRows(team);
        const displayLocale = rolePlanDisplayLocale;
        const copy = localeCopy(displayLocale);
        const summaryCopy = rolePlanSummaryCopy(displayLocale);
        const titleBadges = titleBadgeSummary(team, displayLocale);
        // Every team is one click away — emblem + short name, active one highlighted.
        select.innerHTML = teams.map((candidate, i) => {
          const on = candidate.id === team.id;
          const ident = teamIdentities[candidate.id] || { label: displayTeamName(candidate), shortName: candidate.name, icon: "" };
          return '<button type="button" role="tab" class="team-switch-btn' + (on ? " on" : "") +
            '" data-team-pick="' + escapeAttribute(candidate.id) + '"' +
            ' aria-selected="' + String(on) + '" tabindex="' + (on ? "0" : "-1") + '"' +
            ' title="' + escapeAttribute(ident.label || candidate.name) + '">' +
            (ident.icon ? '<img src="' + escapeAttribute(ident.icon) + '" alt="" width="22" height="22" />' : "") +
            "<span>" + escapeHtml(ident.shortName || candidate.name) + "</span></button>";
        }).join("");
        const title = document.getElementById("rolePlanTitle");
        const subtitle = document.getElementById("rolePlanSubtitle");
        const phaseIndex = activePlanPhaseIndex();
        if (title) title.textContent = "All-Star BoH - Team Plans";
        if (subtitle) subtitle.textContent = `${identity.label} - ${stage1Label(displayLocale)} - ${localizedTimeLabel(stage1Flow[phaseIndex].time, displayLocale)}`;
        [
          ["planModePlayer", "player"],
          ["planModeBoard", "board"],
          ["planModeMap", "map"],
          ["planModeGrid", "grid"],
          ["planModeSlides", "slides"],
        ].forEach(([id, mode]) => {
          const button = document.getElementById(id);
          if (!button) return;
          const selected = planViewMode === mode;
          button.classList.toggle("on", selected);
          if (button.getAttribute("role") === "tab") {
            button.setAttribute("aria-selected", String(selected));
            button.tabIndex = selected ? 0 : -1;
          }
        });
        document.querySelectorAll("[data-tr]").forEach((el) => {
          el.textContent = tr(displayLocale, el.dataset.tr, el.textContent);
        });
        const localeSelect = document.getElementById("rolePlanLocaleSelect");
        if (localeSelect && localeSelect.value !== rolePlanLocaleMode) localeSelect.value = rolePlanLocaleMode;
        const densityBtn = document.getElementById("rolePlanDensityBtn");
        if (densityBtn) {
          densityBtn.textContent = rolePlanCompact ? "Comfortable grid" : "Compact grid";
          densityBtn.setAttribute("aria-pressed", String(rolePlanCompact));
        }
        const pngButton = document.getElementById("rolePlanPngBtn");
        const jsonButton = document.getElementById("rolePlanJsonBtn");
        const closeButton = document.getElementById("rolePlanCloseBtn");
        if (pngButton) pngButton.textContent = copy.downloadPng;
        if (jsonButton) jsonButton.textContent = copy.exportJson;
        if (closeButton) closeButton.textContent = copy.close;
        if (planViewMode === "player") {
          content.innerHTML = renderPlayerPlanView(team, rows, displayLocale);
          bindPlayerPlanEvents(rows);
          return;
        }
        if (planViewMode === "slides") {
          content.innerHTML = renderSlideshow(team, rows, displayLocale);
          bindSlideshow(team, rows, displayLocale);
          return;
        }
        if (planViewMode === "board") {
          content.innerHTML = renderTeamPlanView(team, rows, displayLocale);
          bindTeamBoardEvents();
          return;
        }
        if (planViewMode === "map") {
          content.innerHTML = renderMapBriefingView(team, rows, displayLocale);
          bindMapBriefingEvents(rows);
          return;
        }
        content.innerHTML = `
          <section class="role-plan-sheet${rolePlanCompact ? " compact" : ""}" id="rolePlanSheet">
            <div class="role-plan-summary">
              <div class="role-plan-card">
                <h3>${escapeHtml(identity.label)} - ${escapeHtml(stage1Label(displayLocale))}</h3>
                <small>${escapeHtml(copy.scoringRule)}</small>
                <div class="meta">
                  ${Object.entries(scoreRankRoleMap)
                    .slice(0, 12)
                    .filter(([position]) => Number(position) <= rows.length)
                    .map(([, roleKey]) => planRolePill(roleKey, localizedRole(roleKey, displayLocale).label))
                    .join("")}
                </div>
              </div>
              <div class="role-plan-card">
                <strong>${escapeHtml(summaryCopy.buildFocus)}</strong>
                <div class="build-focus-grid">
                  <div class="build-focus-item"><strong>${escapeHtml(summaryCopy.center)}</strong><span>${escapeHtml(namesForRole(rows, "offensive") || summaryCopy.none)}</span></div>
                  <div class="build-focus-item"><strong>${escapeHtml(summaryCopy.top)}</strong><span>${escapeHtml(namesForRole(rows, "top") || summaryCopy.none)}</span></div>
                  <div class="build-focus-item"><strong>${escapeHtml(summaryCopy.bottom)}</strong><span>${escapeHtml(namesForRole(rows, "bottom") || summaryCopy.none)}</span></div>
                  <div class="build-focus-item"><strong>${escapeHtml(summaryCopy.rune)}</strong><span>${escapeHtml(namesForRole(rows, "rune") || summaryCopy.none)}</span></div>
                </div>
                <small>${escapeHtml(summaryCopy.titleBadges)}: ${escapeHtml(titleBadges.map((badge) => `${badge.label}: ${badge.value}`).join(" · "))}</small>
              </div>
            </div>
            <div class="plan-timeline" aria-label="Match timeline">
              ${eventMilestones
                .map(
                  (m, i) => `
                    <div class="plan-tl-step tl-${i}">
                      <div class="plan-tl-time">${escapeHtml(m.time)}</div>
                      <div class="plan-tl-unlock">${escapeHtml(m.unlocks)}</div>
                    </div>`
                )
                .join("")}
            </div>
            <div class="role-plan-table">
              <div class="role-plan-row header">
                <div>#</div>
                <div>${escapeHtml(copy.player)}</div>
                <div>${escapeHtml(copy.role)}</div>
                ${stage1Flow.map((phase) => `<div>${escapeHtml(localizedTimeLabel(phase.time, displayLocale))}</div>`).join("")}
              </div>
              <div class="role-plan-row ops-row ops-teleport">
                <div class="role-plan-cell ops-label" style="grid-column: span 3">
                  <strong>${PLAN_ICONS.teleport} Teleports</strong>
                  <small>Shared alliance pool — not per player</small>
                </div>
                ${eventMilestones
                  .map(
                    (m) => `
                      <div class="role-plan-cell ops-cell">
                        <span class="ops-tag">${escapeHtml(m.teleportTag)}</span>
                        <small>${escapeHtml(m.teleport)}</small>
                      </div>`
                  )
                  .join("")}
              </div>
              ${rows
                .map((row) => {
                  const rowLocale = planLocaleFor(row.player);
                  const playerCopy = localeCopy(rowLocale);
                  const role = localizedRole(row.roleKey, rowLocale);
                  return `
                    <div class="role-plan-row">
                      <div class="role-plan-cell"><strong>#${row.position}</strong><small>${escapeHtml(playerCopy.scoreRank)}</small></div>
                      <div class="role-plan-cell"><strong>${escapeHtml(row.player.name)}</strong><small>${row.player.locale.toUpperCase()} · ${fmt(row.player.score)} · ${compact(row.player.power)}</small></div>
                      <div class="role-plan-cell">
                        ${planRolePill(row.roleKey, role.label)}
                        <small>${escapeHtml(role.description)}</small>
                      </div>
                      ${row.phases
                        .map(({ time, assignment }, phaseIndex) => `
                          <div class="role-plan-cell role-plan-phase phase-${phaseIndex}">
                            <div class="phase-heading">
                              <strong>${escapeHtml(localizedStageRole(assignment.stageRole, rowLocale))}</strong>
                              <span class="event-chip">${escapeHtml(localizedTimeLabel(time, rowLocale))}</span>
                            </div>
                            <span class="legion-line l1"><b class="legion-tag">L1</b> ${escapeHtml(localizedStageText(assignment.l1, rowLocale))}</span>
                            <span class="legion-line l2"><b class="legion-tag">L2</b> ${escapeHtml(localizedStageText(assignment.l2, rowLocale))}</span>
                            ${planNoteMarkup(assignment.note, rowLocale)}
                          </div>
                        `)
                        .join("")}
                    </div>
                  `;
                })
                .join("")}
            </div>
          </section>
        `;
      }

      function localizedTitleRoleLabel(roleKey, locale) {
        const labels = {
          kills: { en: "Kills Player", es: "Jugador de bajas", pt: "Jogador de abates", de: "Kills-Spieler", fr: "Joueur kills", hr: "Igrac za killove", tr: "Kill oyuncusu", ru: "Игрок на убийства", id: "Pemain kills", zh: "击杀玩家", ko: "킬 담당", it: "Giocatore uccisioni" },
          tower: { en: "Tower Destroyer", es: "Destructor de torres", pt: "Destruidor de torres", de: "Turmzerstorer", fr: "Destructeur de tours", hr: "Rusitelj tornjeva", tr: "Kule yikici", ru: "Разрушитель башен", id: "Penghancur tower", zh: "拆塔玩家", ko: "타워 파괴 담당", it: "Distruttore torri" },
          escort: { en: "Escort Player", es: "Jugador escolta", pt: "Jogador de escolta", de: "Eskort-Spieler", fr: "Joueur escorte", hr: "Igrac pratnje", tr: "Eskort oyuncusu", ru: "Игрок сопровождения", id: "Pemain escort", zh: "护送玩家", ko: "호송 담당", it: "Giocatore scorta" },
          gathering: { en: "Gathering Player", es: "Jugador recolector", pt: "Jogador coletor", de: "Sammler", fr: "Joueur recolte", hr: "Sakupljac", tr: "Toplama oyuncusu", ru: "Игрок сбора", id: "Pemain gather", zh: "采集玩家", ko: "채집 담당", it: "Giocatore raccolta" },
        };
        const normalizedLocale = normalizeLocale(locale);
        return labels[roleKey]?.[normalizedLocale] || labels[roleKey]?.en || titleRoles[roleKey]?.label || roleKey;
      }

      function titleBadgeSummary(team, locale) {
        const labels = rolePlanSummaryCopy(locale);
        return ["kills", "tower", "escort", "gathering"].map((roleKey) => {
          const assigned = team.players.filter((player) => player.titleRole === roleKey).map((player) => player.name).join(", ");
          return {
            label: localizedTitleRoleLabel(roleKey, locale),
            value: assigned || labels.available,
          };
        });
      }

      function stat(label, value, note) {
        return `<article class="stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
      }

      function compact(value) {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        return fmt(value);
      }

      function escapeHtml(value = "") {
        return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
      }

      function escapeAttribute(value = "") {
        return escapeHtml(value).replace(/`/g, "&#96;");
      }

      function renderTeamLanguageSummary(team) {
        const counts = languageCounts(team);
        return `
          <div class="language-summary">
            <strong>Languages</strong>
            ${Object.entries(counts)
              .map(([locale, count]) => `<span class="pill">${locale.toUpperCase()} ${count}</span>`)
              .join("")}
          </div>
        `;
      }

      function renderTeamCommandSummary(team) {
        const leaders = team.players.filter((player) => player.commandRole === "leader");
        const coleaders = team.players.filter((player) => player.commandRole === "coleader");
        const chips = leaders
          .map((player) => `<span class="pill leader">Leader: ${player.name}</span>`)
          .concat(coleaders.map((player) => `<span class="pill coleader">Co: ${player.name}</span>`));
        return `
          <div class="command-summary">
            <strong>Command</strong>
            ${chips.join("") || `<span class="pill">No command assigned</span>`}
          </div>
        `;
      }

      function orderedTeamPlayers(team) {
        if (ignoreLeadership) return team.players.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        const roleRank = (player) => (player.commandRole === "leader" ? 0 : player.commandRole === "coleader" ? 1 : 2);
        return team.players.slice().sort((a, b) => roleRank(a) - roleRank(b) || b.score - a.score || a.name.localeCompare(b.name));
      }

      function setViewMode(mode) {
        viewMode = mode === "board" ? "board" : "list";
        try {
          localStorage.setItem("boh-view-mode", viewMode);
        } catch (error) {
          /* storage unavailable, ignore */
        }
        applyViewMode();
      }

      function applyViewMode() {
        const isList = viewMode === "list";
        document.getElementById("teamListView")?.toggleAttribute("hidden", !isList);
        document.getElementById("workspaceSection")?.toggleAttribute("hidden", isList);
        document.getElementById("sidebarShell")?.toggleAttribute("hidden", isList);
        const listBtn = document.getElementById("viewListBtn");
        const boardBtn = document.getElementById("viewBoardBtn");
        listBtn?.setAttribute("aria-selected", String(isList));
        boardBtn?.setAttribute("aria-selected", String(!isList));
        if (isList) renderTeamListView();
      }

      function renderTeamListView() {
        const container = document.getElementById("teamListView");
        if (!container || container.hidden) return;
        const cards = teams
          .map((team) => {
            const identity = teamIdentities[team.id] || {
              label: displayTeamName(team),
              shortName: team.name,
              icon: "",
              accent: "#4b82c3",
            };
            const teamScore = total(team, "score");
            const teamPower = total(team, "power");
            const leaders = team.players.filter((player) => player.commandRole === "leader");
            const coleaders = team.players.filter((player) => player.commandRole === "coleader");
            const commandChips =
              leaders
                .map((player) => `<span class="pill leader">Leader: ${escapeHtml(player.name)}</span>`)
                .concat(coleaders.map((player) => `<span class="pill coleader">Co: ${escapeHtml(player.name)}</span>`))
                .join("") || `<span class="pill">No command assigned</span>`;
            const roster = orderedTeamPlayers(team)
              .map((player) => {
                const roleTag =
                  player.commandRole === "leader"
                    ? `<span class="tl-role-tag leader">Leader</span>`
                    : player.commandRole === "coleader"
                    ? `<span class="tl-role-tag coleader">Co</span>`
                    : "";
                return `
                  <li>
                    <span class="tl-name">${roleTag}${escapeHtml(player.name)}</span>
                    <span class="tl-score">${fmt(curveScore(player.score))}</span>
                  </li>
                `;
              })
              .join("");
            return `
              <article class="tl-card" style="--team-accent: ${identity.accent}">
                <div class="tl-card-head">
                  <img src="${identity.icon}" alt="" width="40" height="40" />
                  <div class="tl-card-title">
                    <strong>${escapeHtml(identity.label)}</strong>
                    <small>${team.players.length} castles · ${vtsTeamLabels[team.id] || "VTS"}</small>
                  </div>
                  <div class="tl-card-score">
                    <strong>${fmt(teamScore)}</strong>
                    <small>${compact(teamPower)} power</small>
                  </div>
                  <button class="tl-plan-btn" data-team-plan="${team.id}" type="button">Open plan</button>
                </div>
                <div class="tl-command">${commandChips}</div>
                <ul class="tl-roster">${roster}</ul>
              </article>
            `;
          })
          .join("");
        container.innerHTML = `
          <p class="tl-hint">Quick roster overview for all teams. Tap "Open plan" to see a team's full battle plan.</p>
          <div class="tl-grid">${cards}</div>
        `;
        container.querySelectorAll("[data-team-plan]").forEach((button) => {
          button.addEventListener("click", () => openRolePlanDialog(button.dataset.teamPlan));
        });
      }

      function renderBoard() {
        const query = document.getElementById("search")?.value?.trim().toLowerCase() || "";
        const board = document.getElementById("board");
        board.innerHTML = teams
          .map((team, teamIndex) => {
            const teamScore = total(team, "score");
            const teamPower = total(team, "power");
            const nonVtsCount = team.players.filter((player) => player.vts === "No").length;
            const slots = slotCounts(team);
            const selectedCount = slots[team.fightTime] || 0;
            const commandSummary = renderTeamCommandSummary(team);
            const languageSummary = renderTeamLanguageSummary(team);
            const nonVtsLabel = `${nonVtsCount} Non-VTS`;
            const identity = teamIdentities[team.id] || {
              label: displayTeamName(team),
              shortName: team.name,
              icon: "",
              accent: "#4b82c3",
            };
            const body = orderedTeamPlayers(team)
              .filter((player) => {
                if (!query) return true;
                return `${player.name} ${player.locale} ${player.vts === "No" ? "non-vts" : "vts"} ${
                  player.backup ? "backup" : "main"
                } ${planRoles[assignedPlanRole(player)]?.label || ""} ${player.roles || ""}`
                  .toLowerCase()
                  .includes(query);
              })
              .map((player) => playerCard(player))
              .join("");
            return `
              <div class="team-stack">
              <section class="team" data-team="${team.id}" data-color="${team.color}" style="--team-accent: ${identity.accent}">
                <div class="team-head">
                  <div class="team-head-main">
                    <img class="team-emblem" src="${identity.icon}" alt="" width="52" height="52" />
                    <div class="team-head-copy">
                  <div class="team-title">
                    <span class="team-identity"><span class="team-name">${identity.label}</span><span class="team-vts-label">${vtsTeamLabels[team.id] || "VTS"} · ${nonVtsLabel}</span></span>
                    <span class="team-title-actions"><span>${nonVtsLabel}</span><button class="team-download" data-capture-hidden data-download-team="${team.id}" type="button">PNG</button></span>
                  </div>
                  <div class="team-score">
                    <strong>${fmt(teamScore)}</strong>
                    <small>${compact(teamPower)} Power<br />best ${bestFightSlot(team)} ${slots[bestFightSlot(team)] || 0}/${team.players.length}</small>
                  </div>
                  <div class="team-controls">
                    <select class="fight-select" data-fight-team="${team.id}" aria-label="${team.name} fighting time">
                      ${["+12", "+14", "+16"]
                        .map(
                          (slot) =>
                            `<option value="${slot}" ${team.fightTime === slot ? "selected" : ""}>Fight ${slot}</option>`
                        )
                        .join("")}
                    </select>
                    <div class="attendance ${selectedCount === team.players.length ? "" : "warn"}">${selectedCount}/${team.players.length}</div>
                  </div>
                    </div>
                  </div>
                </div>
                <div class="team-card-actions" data-capture-hidden>
                  <button class="team-order-btn" data-team-move="left" data-team-id="${team.id}" type="button" title="Move team left" aria-label="Move ${displayTeamName(team)} left">&larr;</button>
                  <button class="team-order-btn" data-team-move="right" data-team-id="${team.id}" type="button" title="Move team right" aria-label="Move ${displayTeamName(team)} right">&rarr;</button>
                </div>
                <div class="team-body">
                  ${commandSummary}
                  ${languageSummary}
                  ${body || `<div class="empty">No matching castles</div>`}
                </div>
              </section>
              </div>
            `;
          })
          .join("");

        board.querySelectorAll("[data-team-move]").forEach((button) => {
          button.addEventListener("click", () => {
            const index = teams.findIndex((team) => team.id === button.dataset.teamId);
            const delta = button.dataset.teamMove === "left" ? -1 : 1;
            moveTeamColumn(index, index + delta);
          });
        });
        board.querySelectorAll(".team").forEach((teamEl) => {
          teamEl.addEventListener("dragover", (event) => {
            event.preventDefault();
            teamEl.classList.add("drag-over");
          });
          teamEl.addEventListener("dragleave", () => teamEl.classList.remove("drag-over"));
          teamEl.addEventListener("drop", (event) => {
            event.preventDefault();
            teamEl.classList.remove("drag-over");
            movePlayer(draggedId, teamEl.dataset.team);
          });
        });

        board.querySelectorAll("[data-fight-team]").forEach((select) => {
          select.addEventListener("change", () => {
            const team = teams.find((candidate) => candidate.id === select.dataset.fightTeam);
            if (!team) return;
            withUndo(() => {
              team.fightTime = select.value;
            });
          });
        });

        board.querySelectorAll("[data-download-team]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            downloadPng([button.dataset.downloadTeam], `${button.dataset.downloadTeam}.png`);
          });
        });

        board.querySelectorAll("[data-score-step]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            event.preventDefault();
            quickAdjustScore(button.dataset.scorePlayer, Number(button.dataset.scoreStep));
          });
        });

        board.querySelectorAll("[data-score-direct]").forEach((input) => {
          input.addEventListener("click", (event) => event.stopPropagation());
          input.addEventListener("keydown", (event) => event.stopPropagation());
          input.addEventListener("change", (event) => {
            event.stopPropagation();
            quickSetScore(input.dataset.scoreDirect, Number(input.value));
          });
        });

        board.querySelectorAll(".player").forEach((card) => {
          card.addEventListener("click", (event) => {
            event.stopPropagation();
            activatePlayerCard(card.dataset.id);
          });
          card.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            activatePlayerCard(card.dataset.id);
          });
          card.addEventListener("dragover", (event) => {
            if (!manualMode) return;
            event.preventDefault();
          });
          card.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            performAtomicSwap(draggedId, card.dataset.id, "drag");
          });
          card.addEventListener("dragstart", () => {
            draggedId = card.dataset.id;
            card.classList.add("dragging");
          });
          card.addEventListener("dragend", () => {
            draggedId = null;
            card.classList.remove("dragging");
          });
        });
      }

      function playerCard(player) {
        const roleClass = player.commandRole ? ` role-${player.commandRole}` : "";
        const titleRole = titleRoles[player.titleRole] || null;
        const titleClass = titleRole ? ` title-${player.titleRole}` : "";
        const swapClass = player.id === manualSwapSelectionId ? " swap-source" : "";
        const planSlot = planRoleSlot(player.id);
        const roleSource = player.commandRoleSource === "explicit" ? " rule" : player.commandRoleSource === "auto" ? " auto" : "";
        const priorityBadges = [];
        if (player.commandRole === "leader") priorityBadges.push({ label: `Leader${roleSource}`, className: "leader" });
        else if (player.commandRole === "coleader") priorityBadges.push({ label: `Co-leader${roleSource}`, className: "coleader" });
        else priorityBadges.push({ label: player.vts === "No" ? "Non-VTS" : "VTS", className: player.vts === "No" ? "non-vts" : "" });
        if (player.locked) priorityBadges.push({ label: "Lock", className: "lock" });
        else if (player.backup) priorityBadges.push({ label: "Backup", className: "backup" });
        else priorityBadges.push({ label: "Main", className: "main" });
        const statusBadges = priorityBadges
          .slice(0, 2)
          .map((badge) => `<span class="pill ${badge.className}" title="${escapeAttribute(badge.title || badge.label)}">${escapeHtml(badge.label)}</span>`)
          .join("");
        const titleBanner = titleRole
          ? `<div class="title-banner" title="${escapeAttribute(player.titleRoleNote || titleRole.description)}"><span class="title-banner-text">${escapeHtml(titleRole.label)}</span></div>`
          : "";
        const planStrip = planSlot
          ? `<div class="plan-strip ${planSlot.role.className}" title="${escapeAttribute(planSlot.role.description)}"><strong>${escapeHtml(planSlot.role.label)}</strong><span>Slot ${planSlot.index}/${planSlot.role.capacity}</span></div>`
          : "";
        return `
          <article class="player ${player.id === selectedId ? "selected" : ""}${roleClass}${titleClass}${swapClass}" draggable="${manualMode && !isProtectedPlayer(player)}" data-id="${player.id}" tabindex="0" role="button" aria-haspopup="dialog" aria-expanded="${activePopoverPlayerId === player.id}" aria-pressed="${player.id === selectedId}" aria-label="${player.name}, ${Math.round(player.score)} score">
            ${titleBanner}
            <div class="name">${player.name}</div>
            <div class="score">${fmt(curveScore(player.score))}</div>
            <div class="quick-score" data-capture-hidden aria-label="Quick score edit for ${escapeAttribute(player.name)}">
              <button type="button" data-score-player="${player.id}" data-score-step="-10000" title="-10,000">-10</button>
              <button type="button" data-score-player="${player.id}" data-score-step="-1000" title="-1,000">-1</button>
              <input type="number" min="0" step="1000" value="${Math.round(player.score)}" data-score-direct="${player.id}" aria-label="Set ${escapeAttribute(player.name)} score" />
              <button type="button" data-score-player="${player.id}" data-score-step="1000" title="+1,000">+1</button>
              <button type="button" data-score-player="${player.id}" data-score-step="10000" title="+10,000">+10</button>
            </div>
            <div class="meta">
              ${statusBadges}
              ${planSlot ? planRolePill(planSlot.roleKey, planSlot.role.badge) : ""}
            </div>
            ${planStrip}
          </article>
        `;
      }

      function quickAdjustScore(playerId, amount) {
        const player = findPlayer(playerId);
        if (!player || !Number.isFinite(amount)) return;
        const nextScore = Math.max(0, Math.round(player.score + amount));
        quickSetScore(playerId, nextScore);
      }

      function quickSetScore(playerId, nextScore) {
        const player = findPlayer(playerId);
        if (!player || !Number.isFinite(nextScore)) return;
        withUndo(() => {
          const current = findPlayer(playerId);
          if (!current) return;
          // Adjust score only. The true adjustment is always baseScore vs score; do NOT also
          // accumulate into commitment (a separate roster attribute) — that made the two ledgers
          // diverge because only this one of four score-edit paths touched it.
          current.score = Math.max(0, Number(nextScore) || 0);
          selectedId = current.id;
        });
      }

      function renderInspector() {
        const player = findPlayer(selectedId);
        const inspector = document.getElementById("inspector");
        if (!player) {
          inspector.innerHTML = `<div class="empty">Select a castle to adjust it.</div>`;
          return;
        }
        const delta = Math.round(player.score - player.baseScore);
        const selectedTitleRole = titleRoles[player.titleRole] || null;
        const inferredPlanRole = defaultPlanRole(player);
        const selectedPlanRole = normalizePlanRole(player.planRole) || inferredPlanRole;
        const roleDescription = player.titleRoleNote || selectedTitleRole?.description || "Assign a championship title role to show its badge on this castle.";
        inspector.innerHTML = `
          <div class="field">
            <label>Selected castle</label>
            <strong>${player.name}</strong>
            <small>${player.locale.toUpperCase()} · ${player.vts === "No" ? "Non-VTS" : "VTS"} · ${
              player.backup ? "Backup" : "Main"
            } · ${player.times.join(", ") || "No time"} · ${player.leadVolunteer ? "lead volunteer" : "not lead volunteer"}</small>
          </div>
          <div class="field">
            <label for="scoreInput">Direct score</label>
            <input id="scoreInput" type="number" min="0" step="1" value="${Math.round(player.score)}" />
          </div>
          <div class="field">
            <label for="scoreRange">Fast adjustment</label>
            <input id="scoreRange" type="range" min="-25000" max="25000" step="250" value="${delta}" />
            <small>Delta from baseline: ${delta >= 0 ? "+" : ""}${fmt(delta)}</small>
          </div>
          <div class="adjust-buttons">
            ${[-1000, -250, 250, 1000].map((amount) => `<button class="btn" data-delta="${amount}">${amount > 0 ? "+" : ""}${amount}</button>`).join("")}
          </div>
          <div class="field" style="margin-top: 12px">
            <label>Badges</label>
            <button class="btn" id="backupBtn" type="button">${player.backup ? "Make main" : "Make backup"}</button>
          </div>
          <div class="field" style="margin-top: 12px">
            <label for="planRoleSelect">Match plan role</label>
            <select id="planRoleSelect">
              <option value="">Auto from signup${inferredPlanRole ? `: ${escapeHtml(planRoles[inferredPlanRole].label)}` : ""}</option>
              ${planRoleOptions
                .map(([key, role]) => `<option value="${key}" ${normalizePlanRole(player.planRole) === key ? "selected" : ""}>${role.label}</option>`)
                .join("")}
            </select>
            ${renderPlanPreview({ ...player, planRole: selectedPlanRole })}
          </div>
          <div class="field" style="margin-top: 12px">
            <label for="titleRoleSelect">Title role badge</label>
            <select id="titleRoleSelect">
              <option value="">No title role</option>
              ${titleRoleOptions
                .map(([key, role]) => `<option value="${key}" ${player.titleRole === key ? "selected" : ""}>${role.label}</option>`)
                .join("")}
            </select>
            <div class="role-preview" id="titleRolePreview">
              <strong>${selectedTitleRole ? `<span class="pill title-role">${escapeHtml(selectedTitleRole.badge)}</span>${escapeHtml(selectedTitleRole.label)}` : "No title role assigned"}</strong>
              <small>${escapeHtml(roleDescription)}</small>
            </div>
          </div>
          <div class="field">
            <label for="titleRoleNote">Role description</label>
            <textarea id="titleRoleNote" rows="3" placeholder="Optional player-specific role note">${escapeHtml(player.titleRoleNote || "")}</textarea>
          </div>
          <div class="field" style="margin-top: 12px">
            <label>Command role</label>
            <div class="adjust-buttons">
              <button class="btn" id="leaderBtn" type="button">Set leader</button>
              <button class="btn" id="coleaderBtn" type="button">Set co-leader</button>
              <button class="btn" id="clearCommandBtn" type="button">Clear</button>
            </div>
          </div>
        `;

        const scoreInput = document.getElementById("scoreInput");
        const scoreRange = document.getElementById("scoreRange");
        const startScoreEdit = () => beginScoreUndo();
        const finishScoreEdit = () => finishScoreUndo();
        [scoreInput, scoreRange].forEach((input) => {
          input.addEventListener("focus", startScoreEdit);
          input.addEventListener("pointerdown", startScoreEdit);
          input.addEventListener("keydown", startScoreEdit);
          input.addEventListener("change", finishScoreEdit);
          input.addEventListener("blur", finishScoreEdit);
        });
        scoreInput.addEventListener("input", (event) => {
          beginScoreUndo();
          const current = findPlayer(player.id);
          if (!current) return;
          current.score = Math.max(0, Number(event.target.value) || 0);
          suggestions = [];
          renderStats();
          renderConstraints();
        });
        scoreRange.addEventListener("input", (event) => {
          beginScoreUndo();
          const current = findPlayer(player.id);
          if (!current) return;
          current.score = Math.max(0, current.baseScore + Number(event.target.value));
          suggestions = [];
          renderStats();
          renderConstraints();
        });
        inspector.querySelectorAll("[data-delta]").forEach((button) => {
          button.addEventListener("click", () => {
            withUndo(() => {
              player.score = Math.max(0, player.score + Number(button.dataset.delta));
            });
          });
        });
        document.getElementById("backupBtn").addEventListener("click", () => {
          if (player.main) return toast("Kika is pinned as main by rule.");
          withUndo(() => {
            player.backup = !player.backup;
          });
        });
        document.getElementById("planRoleSelect").addEventListener("change", (event) => {
          setPlanRole(player.id, event.target.value);
        });
        document.getElementById("titleRoleSelect").addEventListener("change", (event) => {
          setTitleRole(player.id, event.target.value, findPlayer(player.id)?.titleRoleNote || "");
        });
        document.getElementById("titleRoleNote").addEventListener("change", (event) => {
          setTitleRole(player.id, findPlayer(player.id)?.titleRole || "", event.target.value);
        });
        document.getElementById("leaderBtn").addEventListener("click", () => setCommandRole(player.id, "leader"));
        document.getElementById("coleaderBtn").addEventListener("click", () => setCommandRole(player.id, "coleader"));
        document.getElementById("clearCommandBtn").addEventListener("click", () => setCommandRole(player.id, ""));
      }

      function renderSuggestions() {
        const box = document.getElementById("suggestions");
        if (!suggestions.length) suggestions = getSuggestions();
        box.innerHTML =
          suggestions.length === 0
            ? `<div class="empty">No improving swap found. Try adjusting a score first.</div>`
            : suggestions
                .map(
                  (item, index) => `
                    <div class="suggestion">
                      <div>
                        <strong>${index + 1}. ${item.a.name} ⇄ ${item.b.name}</strong>
                      <small>${item.from.name} &lt;-&gt; ${item.to.name}<br />${suggestionLabel(item)}</small>
                      </div>
                      <button class="btn" data-swap="${index}" type="button"><span class="${item.objectiveGain >= 0 ? "gain" : "warning"}">${signed(item.objectiveGain, 4)}</span></button>
                    </div>
                  `
                )
                .join("");
        box.querySelectorAll("[data-swap]").forEach((button) => {
          button.addEventListener("click", () => applySuggestion(suggestions[Number(button.dataset.swap)]));
        });
      }

      function renderFilters() {
        const language = document.getElementById("language");
        const current = language.value || "all";
        const locales = [...new Set(teams.flatMap((team) => team.players.map((player) => player.locale)))].sort();
        language.innerHTML = [`<option value="all">All languages</option>`]
          .concat(locales.map((locale) => `<option value="${locale}">${locale.toUpperCase()}</option>`))
          .join("");
        language.value = locales.includes(current) ? current : "all";
        renderLanguageList();
      }

      function renderLanguageList() {
        const selected = document.getElementById("language").value || "all";
        const list = document.getElementById("languageList");
        const players = teams
          .flatMap((team) => team.players.map((player) => ({ ...player, team: team.name })))
          .filter((player) => selected === "all" || player.locale === selected)
          .sort((a, b) => a.locale.localeCompare(b.locale) || a.team.localeCompare(b.team) || b.score - a.score);
        list.innerHTML = players
          .map(
            (player) =>
              `<div class="mini-row"><strong>${player.locale.toUpperCase()}</strong> · ${player.name}<br /><span>${player.team} · ${fmt(
                player.score
              )}</span></div>`
          )
          .join("");
      }

      function reserveRow(player) {
        const live = livePlayerFor(player) || player;
        const location = liveLocation(live.id);
        const isReserve = reservePlayers.some((candidate) => candidate.id === live.id);
        const isBenched = isBenchedPlayer(live.id);
        const swapButton = isReserve
          ? isBenched
            ? `<button class="mini-btn" type="button" data-restore-benched-id="${live.id}">Restore to active pool</button>`
            : `<button class="mini-btn" type="button" data-reserve-swap-id="${live.id}">Swap here</button>`
          : "";
        return `<div class="mini-row"><strong>#${live.rank || player.rank || "?"} ${live.name}</strong><br /><span>${normalizeLocale(live.locale).toUpperCase()} · ${
          live.vts === "No" ? "Non-VTS" : "VTS"
        } · ${fmt(live.score)} score · ${location}${live.commitment ? ` · commit ${signed(live.commitment || 0, 0)}` : ""} · ${
          Array.isArray(live.times) ? live.times.join("/") || "no time" : live.times || "no time"
        }</span>${swapButton}</div>`;
      }

      function bindReserveSwapActions() {
        document.querySelectorAll("[data-reserve-swap-id]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            if (!reserveSwapSourceId) return toast("Choose Swap with unassigned from an active player first.");
            swapWithReserve(reserveSwapSourceId, button.dataset.reserveSwapId);
          });
        });
        document.querySelectorAll("[data-restore-benched-id]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            restoreBenchedPlayer(button.dataset.restoreBenchedId);
          });
        });
      }

      function livePlayerFor(player) {
        if (player.id) return allPlayers().find((candidate) => candidate.id === player.id);
        const ids = (initialIdsByPower.get(player.power) || []).filter((id) => normalizeName(canonicalInitialById.get(id)?.originalName) === normalizeName(player.name));
        if (ids.length === 1) return allPlayers().find((candidate) => candidate.id === ids[0]) || canonicalInitialById.get(ids[0]);
        const nameIds = initialIdsByName.get(normalizeName(player.name)) || [];
        if (nameIds.length === 1) return allPlayers().find((candidate) => candidate.id === nameIds[0]) || canonicalInitialById.get(nameIds[0]);
        return null;
      }

      function liveLocation(playerId) {
        const located = locate(teams, playerId);
        if (located) return `${teams[located.teamIndex].name} · ${teamTier(teams[located.teamIndex]).toUpperCase()}`;
        if (reservePlayers.some((player) => player.id === playerId)) return "Reserve";
        return "Not visible";
      }

      function renderTier2Draft() {
        const target = document.getElementById("tier2Draft");
        if (!target) return;
        target.innerHTML = teams
          .filter((team) => teamTier(team) !== "tier1")
          .map((team) => {
            const score = team.players.reduce((sum, player) => sum + player.score, 0);
            const locales = team.players.reduce((counts, player) => {
              counts[player.locale] = (counts[player.locale] || 0) + 1;
              return counts;
            }, {});
            return `<div class="mini-row"><strong>${team.name}</strong><br /><span>${team.players.length}/12 · ${fmt(score)} score · ${Object.entries(
              locales
            )
              .map(([locale, count]) => `${locale.toUpperCase()} ${count}`)
              .join(" · ")}</span></div>${team.players.map(reserveRow).join("")}`;
          })
          .join("");
      }

      function renderRankWatch() {
        const target = document.getElementById("rankWatch");
        if (!target) return;
        target.innerHTML = rankWatchPlayers.map(reserveRow).join("");
      }

      function renderUnmappedWatch() {
        const target = document.getElementById("unmappedWatch");
        if (!target) return;
        target.innerHTML = unmappedWatchPlayers.length
          ? unmappedWatchPlayers.map(reserveRow).join("")
          : `<div class="empty">Every CSV player is mapped to Team1-6.</div>`;
      }

      function renderBench() {
        const target = document.getElementById("bench");
        if (!target) return;
        const visibleReserve = reservePlayers.filter((player) => !isBenchedPlayer(player.id)).slice(0, 6);
        target.innerHTML = visibleReserve.length
          ? visibleReserve.map(reserveRow).join("")
          : `<div class="empty">No unassigned reserve players.</div>`;
      }

      function renderBenchedPlayers() {
        const target = document.getElementById("benchedPlayers");
        if (!target) return;
        const benched = reservePlayers
          .filter((player) => isBenchedPlayer(player.id))
          .sort((a, b) => (a.rank || 9999) - (b.rank || 9999) || a.name.localeCompare(b.name));
        const activeReserveCount = reservePlayers.filter((player) => !isBenchedPlayer(player.id)).length;
        target.innerHTML = `
          <div class="mini-row">
            <strong>${benched.length} benched</strong><br />
            <span>${activeReserveCount} unassigned reserve players still available for swaps.</span>
          </div>
          ${
            benched.length
              ? benched.map(reserveRow).join("")
              : `<div class="empty">No players are benched right now.</div>`
          }
        `;
      }

      function renderPrefs() {
        document.getElementById("prefs").innerHTML = preferredNotes
          .map(([name, note]) => `<div class="mini-row"><strong>${name}</strong><br />${note}</div>`)
          .join("");
      }

      function captureColumns(count) {
        if (count === 1) return 1;
        if (count === 2) return 2;
        if (count === 4) return 4;
        return 3;
      }

      function captureWidth(count) {
        return captureColumns(count) * 330 + (captureColumns(count) - 1) * 12 + 28;
      }

      function buildCaptureSheet(teamIds) {
        render();
        const sheet = document.createElement("div");
        sheet.className = "capture-sheet board";
        sheet.style.cssText = `
          width: ${captureWidth(teamIds.length)}px;
          padding: 14px;
          display: grid;
          grid-template-columns: repeat(${captureColumns(teamIds.length)}, minmax(300px, 1fr));
          gap: 12px;
          background: #eef2f7;
        `;
        teamIds.forEach((teamId) => {
          const teamEl = document.querySelector(`.team[data-team="${teamId}"]`);
          if (!teamEl) return;
          const clone = teamEl.cloneNode(true);
          clone.querySelectorAll("[data-capture-hidden]").forEach((node) => node.remove());
          sheet.appendChild(clone);
        });
        return sheet;
      }

      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("PNG sheet image could not be rendered."));
          image.src = src;
        });
      }

      function teamHex(color) {
        return {
          teal: "#2f8f89",
          coral: "#dc564f",
          amber: "#e6ae18",
          violet: "#7654b8",
          green: "#318c6b",
          blue: "#3f75c6",
          rose: "#c5567f",
          slate: "#5f7188",
          gold: "#c98d11",
        }[color] || "#2f8f89";
      }

      function roundedRect(ctx, x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
      }

      function fillRound(ctx, x, y, width, height, radius, fill, stroke = "") {
        roundedRect(ctx, x, y, width, height, radius);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      function drawText(ctx, text, x, y, maxWidth, options = {}) {
        ctx.fillStyle = options.color || "var(--text)";
        ctx.font = `${options.weight || 800} ${options.size || 12}px Inter, Arial, sans-serif`;
        ctx.textAlign = options.align || "left";
        ctx.textBaseline = "top";
        const value = String(text || "");
        if (ctx.measureText(value).width <= maxWidth) {
          ctx.fillText(value, x, y);
          return;
        }
        let clipped = value;
        while (clipped.length > 1 && ctx.measureText(`${clipped}...`).width > maxWidth) clipped = clipped.slice(0, -1);
        ctx.fillText(`${clipped}...`, x, y);
      }

      function drawPill(ctx, text, x, y, color = "#546179", fill = "#eef3f7") {
        ctx.font = "800 9px Inter, Arial, sans-serif";
        const width = Math.ceil(ctx.measureText(text).width) + 10;
        fillRound(ctx, x, y, width, 16, 8, fill);
        drawText(ctx, text, x + 5, y + 3, width - 10, { size: 9, color, weight: 800 });
        return width;
      }

      function drawPanel(ctx, title, pills, x, y, width) {
        fillRound(ctx, x, y, width, 38, 6, "#f8fafc", "#d6e0ea");
        drawText(ctx, title, x + 8, y + 7, 70, { size: 9, color: "#5f6d82", weight: 900 });
        let pillX = x + 72;
        pills.forEach((pill) => {
          if (pillX > x + width - 34) return;
          ctx.font = "800 9px Inter, Arial, sans-serif";
          const available = x + width - pillX - 6;
          const text = ctx.measureText(pill.text).width + 10 > available ? clipText(ctx, pill.text, Math.max(20, available - 10)) : pill.text;
          const pillWidth = drawPill(ctx, text, pillX, y + 11, pill.color, pill.fill);
          pillX += Math.min(pillWidth, available) + 4;
        });
      }

      function clipText(ctx, text, maxWidth) {
        let clipped = String(text || "");
        while (clipped.length > 1 && ctx.measureText(`${clipped}...`).width > maxWidth) clipped = clipped.slice(0, -1);
        return `${clipped}...`;
      }

      function drawTeamCanvas(ctx, team, x, y, width, height) {
        const headerColor = teamHex(team.color);
        const darkHeaderText = team.color === "amber";
        fillRound(ctx, x, y, width, height, 8, "#ffffff", "#d6e0ea");
        fillRound(ctx, x, y, width, 86, 8, headerColor);
        ctx.fillStyle = headerColor;
        ctx.fillRect(x, y + 72, width, 16);

        const headerText = darkHeaderText ? "var(--text)" : "#ffffff";
        const teamScore = total(team, "score");
        const teamPower = total(team, "power");
        const nonVtsCount = team.players.filter((player) => player.vts === "No").length;
        const slots = slotCounts(team);
            drawText(ctx, displayTeamName(team), x + 12, y + 10, 180, { size: 13, color: headerText, weight: 900 });
        drawText(ctx, `${nonVtsCount} Non-VTS`, x + width - 92, y + 10, 78, { size: 11, color: headerText, weight: 900, align: "right" });
        drawText(ctx, fmt(teamScore), x + 12, y + 34, 150, { size: 20, color: headerText, weight: 900 });
        drawText(ctx, `${compact(teamPower)} Power`, x + width - 96, y + 34, 82, { size: 9, color: headerText, weight: 900, align: "right" });
        drawText(ctx, `best ${bestFightSlot(team)} ${slots[bestFightSlot(team)] || 0}/${team.players.length}`, x + width - 96, y + 48, 82, {
          size: 9,
          color: headerText,
          weight: 900,
          align: "right",
        });
        fillRound(ctx, x + 12, y + 64, width - 88, 24, 5, "rgba(255,255,255,0.22)", "rgba(255,255,255,0.7)");
        drawText(ctx, `Fight ${team.fightTime}`, x + 22, y + 70, 120, { size: 10, color: headerText, weight: 900 });
        fillRound(ctx, x + width - 66, y + 64, 50, 24, 12, "rgba(255,255,255,0.18)");
        drawText(ctx, `${slots[team.fightTime] || 0}/${team.players.length}`, x + width - 41, y + 70, 34, { size: 10, color: headerText, weight: 900, align: "center" });

        const leaders = team.players.filter((player) => player.commandRole === "leader");
        const coleaders = team.players.filter((player) => player.commandRole === "coleader");
        drawPanel(
          ctx,
          "COMMAND",
          leaders
            .map((player) => ({ text: `Leader: ${player.name}`, color: "#be3c34", fill: "#fdeceb" }))
            .concat(coleaders.map((player) => ({ text: `Co: ${player.name}`, color: "#6747a6", fill: "#efeafd" }))),
          x + 10,
          y + 96,
          width - 20
        );
        drawPanel(
          ctx,
          "LANGUAGES",
          Object.entries(languageCounts(team)).map(([locale, count]) => ({ text: `${locale.toUpperCase()} ${count}` })),
          x + 10,
          y + 142,
          width - 20
        );

        let cardY = y + 190;
        orderedTeamPlayers(team).forEach((player) => {
          const isLeader = player.commandRole === "leader";
          const isCo = player.commandRole === "coleader";
          const fill = isLeader ? "#fff6f5" : isCo ? "#f8f5ff" : "#ffffff";
          const stroke = isLeader ? "#ee6156" : isCo ? "#9b7ad7" : "#d6e0ea";
          fillRound(ctx, x + 10, cardY, width - 20, 42, 6, fill, stroke);
          drawText(ctx, player.name, x + 20, cardY + 7, width - 120, { size: 11, weight: 900, color: isLeader ? "#9f2f29" : isCo ? "#543b95" : "var(--text)" });
          drawText(ctx, fmt(player.score), x + width - 20, cardY + 7, 80, {
            size: 11,
            weight: 900,
            color: isLeader ? "#9f2f29" : isCo ? "#543b95" : "var(--text)",
            align: "right",
          });
          let pillX = x + 20;
          [
            player.locale,
            player.times.join("/") || "no time",
            player.vts === "No" ? "Non-VTS" : "",
            player.backup ? "Backup" : "Main",
            isLeader ? "Leader" : isCo ? "Co-leader" : "",
            player.locked ? "Lock" : "",
          ]
            .filter(Boolean)
            .forEach((pill) => {
              if (pillX > x + width - 34) return;
              ctx.font = "800 9px Inter, Arial, sans-serif";
              const available = x + width - pillX - 16;
              const text = ctx.measureText(pill).width + 10 > available ? clipText(ctx, pill, Math.max(20, available - 10)) : pill;
              const pillWidth = drawPill(ctx, text, pillX, cardY + 23);
              pillX += Math.min(pillWidth, available) + 4;
            });
          cardY += 48;
        });
      }

      async function downloadPng(teamIds, fileName) {
        if (!teamIds.length) return toast("No teams available for PNG export.");
        try {
          const scale = 2;
          const selectedTeams = teamIds.map((teamId) => teams.find((team) => team.id === teamId)).filter(Boolean);
          const columns = captureColumns(selectedTeams.length);
          const cardWidth = 330;
          const gap = 12;
          const padding = 14;
          const cardHeight = Math.max(...selectedTeams.map((team) => 202 + orderedTeamPlayers(team).length * 48));
          const rows = Math.ceil(selectedTeams.length / columns);
          const width = padding * 2 + columns * cardWidth + (columns - 1) * gap;
          const height = padding * 2 + rows * cardHeight + (rows - 1) * gap;
          const canvas = document.createElement("canvas");
          canvas.width = width * scale;
          canvas.height = height * scale;
          const context = canvas.getContext("2d");
          context.setTransform(scale, 0, 0, scale, 0, 0);
          context.fillStyle = "#eef2f7";
          context.fillRect(0, 0, width, height);
          selectedTeams.forEach((team, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);
            drawTeamCanvas(context, team, padding + col * (cardWidth + gap), padding + row * (cardHeight + gap), cardWidth, cardHeight);
          });
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
          if (!blob) throw new Error("PNG canvas export failed.");
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
          toast(`Downloaded ${fileName}.`);
        } catch (error) {
          toast(`PNG export failed: ${error.message}`);
          throw error;
        }
      }

      function downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      function rolePlanExportPayload(team = rolePlanTeam()) {
        const displayLocale = rolePlanDisplayLocale;
        const teamLocale = dominantTeamLocale(team);
        const rows = teamRolePlanRows(team);
        return {
          format: "all-star-boh-stage1-role-plan",
          version: 2,
          savedAt: new Date().toISOString(),
          team: {
            id: team.id,
            name: teamIdentities[team.id]?.label || team.name,
            score: total(team, "score"),
            power: total(team, "power"),
            displayLocale,
            dominantPlayerLocale: teamLocale,
          },
          rule: localeCopy(displayLocale).scoringRule,
          buildFocus: {
            center: namesForRole(rows, "offensive"),
            top: namesForRole(rows, "top"),
            bottom: namesForRole(rows, "bottom"),
            rune: namesForRole(rows, "rune"),
          },
          titleBadges: titleBadgeSummary(team, displayLocale),
          players: rows.map((row) => ({
            scoreRank: row.position,
            name: row.player.name,
            locale: row.player.locale,
            score: row.player.score,
            power: row.player.power,
            roleKey: row.roleKey,
            role: localizedRole(row.roleKey, row.player.locale),
            phases: row.phases.map(({ time, assignment }) => ({
              time: localizedTimeLabel(time, row.player.locale),
              stageRole: localizedStageRole(assignment.stageRole, row.player.locale),
              legion1: localizedStageText(assignment.l1, row.player.locale),
              legion2: localizedStageText(assignment.l2, row.player.locale),
              note: localizedStageText(assignment.note, row.player.locale),
            })),
          })),
        };
      }

      async function downloadRolePlanPng() {
        const team = rolePlanTeam();
        const rows = teamRolePlanRows(team);
        const displayLocale = rolePlanDisplayLocale;
        const copy = localeCopy(displayLocale);
        const summaryCopy = rolePlanSummaryCopy(displayLocale);
        const scale = 2;
        const width = 1800;
        const rowHeight = 140;
        const headerHeight = 250;
        const height = headerHeight + rows.length * rowHeight + 32;
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.fillStyle = "#f4f7fb";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(16, 16, width - 32, height - 32);
        ctx.strokeStyle = "#d8e0ea";
        ctx.strokeRect(16, 16, width - 32, height - 32);
        drawText(ctx, `${teamIdentities[team.id]?.label || team.name} - ${stage1Label(displayLocale)}`, 34, 34, 720, { size: 24, weight: 900, color: "#152238" });
        drawText(ctx, copy.scoringRule, 34, 68, 1000, { size: 13, weight: 800, color: "#68758a" });
        const focus = [
          [summaryCopy.center, namesForRole(rows, "offensive") || summaryCopy.none],
          [summaryCopy.top, namesForRole(rows, "top") || summaryCopy.none],
          [summaryCopy.bottom, namesForRole(rows, "bottom") || summaryCopy.none],
          [summaryCopy.rune, namesForRole(rows, "rune") || summaryCopy.none],
        ];
        focus.forEach(([label, value], index) => {
          const x = 34 + (index % 2) * 430;
          const y = 100 + Math.floor(index / 2) * 48;
          fillRound(ctx, x, y, 410, 38, 7, "#f8fafc", "#d8e0ea");
          drawText(ctx, label, x + 10, y + 7, 140, { size: 10, weight: 900, color: "#152238" });
          drawText(ctx, value, x + 150, y + 7, 240, { size: 10, weight: 800, color: "#68758a" });
        });
        drawText(ctx, `${summaryCopy.titleBadges}: ${titleBadgeSummary(team, displayLocale).map((badge) => `${badge.label}: ${badge.value}`).join(" · ")}`, 34, 206, 1260, { size: 11, weight: 800, color: "#68758a" });
        const columns = [
          { x: 34, w: 52, label: "#" },
          { x: 94, w: 190, label: copy.player },
          { x: 294, w: 190, label: copy.role },
          { x: 494, w: 310, label: localizedTimeLabel("0-5 Minutes", displayLocale) },
          { x: 814, w: 310, label: localizedTimeLabel("5-10 Minutes", displayLocale) },
          { x: 1134, w: 310, label: localizedTimeLabel("10-15 Minutes", displayLocale) },
          { x: 1454, w: 310, label: localizedTimeLabel("15-30 Minutes", displayLocale) },
        ];
        columns.forEach((col) => drawText(ctx, col.label, col.x, headerHeight - 28, col.w, { size: 11, weight: 900, color: "#68758a" }));
        rows.forEach((row, index) => {
          const y = headerHeight + index * rowHeight;
          ctx.fillStyle = index % 2 ? "#ffffff" : "#f8fafc";
          ctx.fillRect(28, y - 8, width - 56, rowHeight - 8);
          ctx.strokeStyle = "#d8e0ea";
          ctx.strokeRect(28, y - 8, width - 56, rowHeight - 8);
          drawText(ctx, `#${row.position}`, columns[0].x, y, columns[0].w, { size: 15, weight: 900, color: "#152238" });
          drawText(ctx, row.player.name, columns[1].x, y, columns[1].w, { size: 13, weight: 900, color: "#152238" });
          drawText(ctx, `${row.player.locale.toUpperCase()} · ${fmt(row.player.score)} · ${compact(row.player.power)}`, columns[1].x, y + 20, columns[1].w, { size: 10, weight: 800, color: "#68758a" });
          const role = localizedRole(row.roleKey, row.player.locale);
          drawText(ctx, role.label, columns[2].x, y, columns[2].w, { size: 12, weight: 900, color: "#152238" });
          drawText(ctx, role.description, columns[2].x, y + 18, columns[2].w, { size: 9, weight: 700, color: "#68758a" });
          row.phases.forEach(({ time, assignment }, phaseIndex) => {
            const col = columns[3 + phaseIndex];
            const border = ["var(--blue)", "var(--good)", "var(--boh-amber)", "#7857b8"][phaseIndex];
            fillRound(ctx, col.x - 6, y - 1, col.w, 112, 7, "#ffffff", border);
            drawText(ctx, localizedStageRole(assignment.stageRole, row.player.locale), col.x, y + 7, col.w - 14, { size: 10, weight: 900, color: "#152238" });
            drawText(ctx, `${localeCopy(row.player.locale).l1}: ${localizedStageText(assignment.l1, row.player.locale)}`, col.x, y + 28, col.w - 14, { size: 9, weight: 800, color: "#152238" });
            drawText(ctx, `${localeCopy(row.player.locale).l2}: ${localizedStageText(assignment.l2, row.player.locale)}`, col.x, y + 58, col.w - 14, { size: 9, weight: 800, color: "#152238" });
            drawText(ctx, localizedStageText(assignment.note, row.player.locale), col.x, y + 88, col.w - 14, { size: 9, weight: 700, color: "#68758a" });
          });
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Role plan PNG canvas export failed.");
        downloadBlob(blob, `${team.id}-stage1-role-plan.png`);
        toast("Role plan PNG export started.");
      }

      function signed(value, digits = 3) {
        const rounded = Number(value).toFixed(digits);
        return value > 0 ? `+${rounded}` : rounded;
      }

      function suggestionLabel(item) {
        const parts = [`objective ${signed(item.objectiveGain, 4)}`, `balance ${signed(item.balanceGain, 4)}`];
        if (item.timeFixes) parts.push(`fixes ${item.timeFixes} time warning${item.timeFixes === 1 ? "" : "s"}`);
        if (item.languageFixes) parts.push(`fixes ${item.languageFixes} language island${item.languageFixes === 1 ? "" : "s"}`);
        if (!item.timeFixes && !item.languageFixes && item.objectiveGain <= 0) parts.push("trade-off");
        return parts.join(" · ");
      }

      function getSuggestions() {
        applyOverrideRules();
        const baseObjective = objective(teams);
        const baseBalance = metrics().cost;
        const baseReport = constraintReport(teams);
        const found = [];
        for (let i = 0; i < teams.length; i += 1) {
          for (let j = i + 1; j < teams.length; j += 1) {
            if (ruleActive("tier:separate") && teamTier(teams[i]) !== teamTier(teams[j])) continue;
            for (const a of teams[i].players) {
              for (const b of teams[j].players) {
                if (teamTier(teams[i]) !== teamTier(teams[j])) continue;
                if (isProtectedPlayer(a, teams[i].id) || isProtectedPlayer(b, teams[j].id)) continue;
                const clone = cloneTeams();
                swapById(clone, a.id, b.id);
                const nextObjective = objective(clone);
                const nextBalance = metrics(clone).cost;
                const nextReport = constraintReport(clone);
                if (!validQuota(clone, nextReport)) continue;
                const objectiveGain = baseObjective - nextObjective;
                const balanceGain = baseBalance - nextBalance;
                const timeFixes = baseReport.timeWarnings.length - nextReport.timeWarnings.length;
                const languageFixes = baseReport.languageIslands.length - nextReport.languageIslands.length;
                if (objectiveGain > 0) {
                  found.push({
                    a,
                    b,
                    from: teams[i],
                    to: teams[j],
                    objectiveGain,
                    balanceGain,
                    timeFixes,
                    languageFixes,
                  });
                }
              }
            }
          }
        }
        return found.sort((a, b) => b.objectiveGain - a.objectiveGain || b.balanceGain - a.balanceGain).slice(0, 6);
      }

      function healthScore(source) {
        const report = constraintReport(source);
        return -(report.timeWarnings.length * 4 + report.languageIslands.length * 2 + report.leadWarnings.length);
      }

      function objective(source) {
        assignLeadership(source);
        const report = constraintReport(source);
        return (
          metrics(source).cost +
          report.timeDeficit * 0.05 +
          report.languageIslands.length * 0.015 +
          report.leadWarnings.length * 0.008
        );
      }

      function constraintReport(source = teams) {
        const globalLocales = {};
        source.flatMap((team) => team.players).forEach((player) => {
          globalLocales[player.locale] = (globalLocales[player.locale] || 0) + 1;
        });
        const timeWarnings = [];
        const languageIslands = [];
        const leadWarnings = [];
        let timeDeficit = 0;
        source.forEach((team) => {
          const slots = slotCounts(team);
          const selectedSlot = team.fightTime || bestFightSlot(team);
          const selectedCount = slots[selectedSlot] || 0;
          if (selectedCount !== team.players.length) {
            const blockers = team.players.filter((player) => !player.times.includes(selectedSlot));
            timeDeficit += Math.max(0, team.players.length - selectedCount);
            timeWarnings.push({
              team: team.name,
              slot: selectedSlot,
              count: selectedCount,
              total: team.players.length,
              blockers: blockers.map((player) => player.name),
              lockedBlockers: blockers.filter((player) => player.locked).map((player) => player.name),
            });
          }
          const localCounts = languageCounts(team);
          Object.entries(localCounts).forEach(([locale, count]) => {
            if (locale !== "en" && count === 1 && globalLocales[locale] > 1) {
              languageIslands.push({ team: team.name, locale: locale.toUpperCase() });
            }
          });
          const leaders = team.players.filter((player) => player.commandRole === "leader").length;
          const coLeaders = team.players.filter((player) => player.commandRole === "coleader").length;
          if (!ignoreLeadership && (leaders !== 1 || coLeaders !== 2)) leadWarnings.push(`${team.name}: ${leaders}L/${coLeaders}C`);
        });
        return { timeWarnings, languageIslands, leadWarnings, timeDeficit };
      }

      function languageCounts(team) {
        return team.players
          .slice()
          .sort((a, b) => a.locale.localeCompare(b.locale))
          .reduce((counts, player) => {
            counts[player.locale] = (counts[player.locale] || 0) + 1;
            return counts;
          }, {});
      }

      function slotCounts(team) {
        return team.players.reduce(
          (counts, player) => {
            player.times.forEach((slot) => {
              counts[slot] = (counts[slot] || 0) + 1;
            });
            return counts;
          },
          { "+12": 0, "+14": 0, "+16": 0 }
        );
      }

      function bestFightSlot(team) {
        const slots = slotCounts(team);
        return Object.entries(slots).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "+12";
      }

      function assignLeadership(source = teams) {
        source.forEach((team) => {
          team.players.forEach((player) => {
            player.commandRole = "";
            player.commandRoleSource = "";
          });

          const override = overridesEnabled ? commandOverrides[team.id] || {} : {};
          const setRole = (identifier, role, sourceName = "explicit") => {
            const player = team.players.find((candidate) => candidate.id === identifier || candidate.name === identifier);
            if (player) {
              player.commandRole = role;
              player.commandRoleSource = sourceName;
            }
          };

          if (override.leaderId && ruleActive(commandRuleId(team.id, "leader", override.leaderId))) {
            setRole(override.leaderId, "leader");
          }
          if (override.leader) setRole(override.leader, "leader");
          (override.coleaderIds || []).forEach((id) => {
            if (ruleActive(commandRuleId(team.id, "coleader", id))) setRole(id, "coleader");
          });
          (override.coleaders || []).forEach((name) => setRole(name, "coleader"));

          if (override.manualRoles) return;

          const preferredScore = (player, role) => {
            const key = normalizeName(player.name);
            if (role === "leader" && preferredSoftLeaderNames.has(key)) return 2;
            if (role === "coleader" && preferredSoftColeaderNames.has(key)) return 2;
            if (player.leadVolunteer) return 1;
            return 0;
          };
          const bestAvailable = (role) =>
            team.players
              .filter((player) => !player.commandRole)
              .sort((a, b) => preferredScore(b, role) - preferredScore(a, role) || b.score - a.score)[0];

          if (!team.players.some((player) => player.commandRole === "leader")) {
            const leader = bestAvailable("leader");
            if (leader) {
              leader.commandRole = "leader";
              leader.commandRoleSource = "auto";
            }
          }

          while (team.players.filter((player) => player.commandRole === "coleader").length < 2) {
            const coleader = bestAvailable("coleader");
            if (!coleader) break;
            coleader.commandRole = "coleader";
            coleader.commandRoleSource = "auto";
          }
        });
      }
      function validQuota(source, report = constraintReport(source)) {
        if (!source.every((team, index) => team.players.length <= teamTargetSize(index))) return false;
        if (!source.every((team) => team.players.every((player) => player && player.id))) return false;
        if (ruleActive("core:top4") && !source.every((team, index) => team.players.length === teamTargetSize(index))) {
          return false;
        }
        const coreIds = new Set(source.filter((team) => teamTier(team) === "tier1").flatMap((team) => team.players.map((player) => player.id)));
        if (top4InIds.some((id) => ruleActive(top4RuleId("in", id)) && !coreIds.has(id))) return false;
        if (top4OutIds.some((id) => ruleActive(top4RuleId("out", id)) && coreIds.has(id))) return false;
        if (!buddyGroupsTogether(source)) return false;
        if (report.leadWarnings.some((warning) => warning.includes("0L"))) return false;
        return true;
      }

      function buddyGroupsTogether(source = teams) {
        return defaultBuddyPowerGroups.every((powers, index) => {
          if (!ruleActive(buddyRuleId(index))) return true;
          const ids = powers.map((power) => resolveInitialPower(power, "Buddy rule"));
          const locations = ids.map((id) => locate(source, id)?.teamIndex).filter((index) => Number.isInteger(index));
          return locations.length === ids.length && new Set(locations).size === 1;
        });
      }

      function applySuggestion(item) {
        if (!item) return;
        performAtomicSwap(item.a.id, item.b.id, "suggestion");
      }

      function swapById(source, leftId, rightId) {
        const left = locate(source, leftId);
        const right = locate(source, rightId);
        if (!left || !right) return false;
        source[left.teamIndex].players[left.playerIndex] = right.player;
        source[right.teamIndex].players[right.playerIndex] = left.player;
        return true;
      }

      function movePlayer(playerId, targetTeamId) {
        if (!manualMode) return toast("Turn on manual override before dragging.");
        const located = locate(teams, playerId);
        const targetIndex = teams.findIndex((team) => team.id === targetTeamId);
        if (!located || targetIndex < 0 || located.teamIndex === targetIndex) return;
        const sourceTeam = teams[located.teamIndex];
        const targetTeam = teams[targetIndex];
        const counterpart = targetTeam.players.find((player) => !isProtectedPlayer(player, targetTeam.id));
        if (!counterpart) return toast("Drop onto an unlocked player; post-fill placement into a team is disabled.");
        performAtomicSwap(playerId, counterpart.id, "drag");
      }

      function activatePlayerCard(playerId) {
        if (manualSwapSelectionId && manualSwapSelectionId !== playerId) {
          performAtomicSwap(manualSwapSelectionId, playerId, "manual swap");
          return;
        }
        selectedId = playerId;
        activePopoverPlayerId = playerId;
        render();
        window.requestAnimationFrame(() => openPlayerPopover(playerId));
      }

      function handlePlayerSelection(playerId) {
        activatePlayerCard(playerId);
      }

      function openPlayerPopover(playerId) {
        const popover = document.getElementById("playerPopover");
        const card = document.querySelector(`.player[data-id="${playerId}"]`);
        const located = locate(teams, playerId);
        if (!popover || !card || !located) return;
        const player = located.player;
        const team = teams[located.teamIndex];
        const lockTarget = activeLockTarget(player);
        const lockLabel = lockTarget ? "Unlock" : `Lock in ${team.name}`;
        const selectedTitleRole = titleRoles[player.titleRole] || null;
        const roleDescription = player.titleRoleNote || selectedTitleRole?.description || "";
        const inferredPlanRole = defaultPlanRole(player);
        const selectedPlanRole = normalizePlanRole(player.planRole);
        const planSummary = selectedPlanRole ? planRoles[selectedPlanRole]?.label || "Custom" : `Auto${inferredPlanRole ? `: ${planRoles[inferredPlanRole].label}` : ""}`;
        const titleSummary = selectedTitleRole ? selectedTitleRole.label : "No title role";
        popover.innerHTML = `
          <strong id="playerPopoverTitle">${player.name}</strong>
          <small>${team.name} · ${teamTier(team).toUpperCase()} · ${fmt(player.score)} score</small>
          <details class="popover-role" ${selectedPlanRole ? "open" : ""}>
            <summary>
              <span class="popover-role-title">Match plan role</span>
              <span class="popover-role-current">${escapeHtml(planSummary)}</span>
            </summary>
            <div class="popover-role-body">
            <label for="popoverPlanRole">Role assignment</label>
            <select id="popoverPlanRole">
              <option value="">Auto from signup${inferredPlanRole ? `: ${escapeHtml(planRoles[inferredPlanRole].label)}` : ""}</option>
              ${planRoleOptions
                .map(([key, role]) => `<option value="${key}" ${selectedPlanRole === key ? "selected" : ""}>${role.label}</option>`)
                .join("")}
            </select>
            ${renderPlanPreview(player, true)}
            </div>
          </details>
          <details class="popover-role" ${selectedTitleRole || roleDescription ? "open" : ""}>
            <summary>
              <span class="popover-role-title">Title role badge</span>
              <span class="popover-role-current">${escapeHtml(titleSummary)}</span>
            </summary>
            <div class="popover-role-body">
            <label for="popoverTitleRole">Badge assignment</label>
            <select id="popoverTitleRole">
              <option value="">No title role</option>
              ${titleRoleOptions
                .map(([key, role]) => `<option value="${key}" ${player.titleRole === key ? "selected" : ""}>${role.label}</option>`)
                .join("")}
            </select>
            <textarea id="popoverTitleRoleNote" rows="3" placeholder="Optional role description">${escapeHtml(roleDescription)}</textarea>
            </div>
          </details>
          <div class="popover-actions">
            <button class="btn" data-popover-action="leader" type="button">Make leader</button>
            <button class="btn" data-popover-action="coleader" type="button">Make co-leader</button>
            <button class="btn" data-popover-action="clear-command" type="button">Clear command role</button>
            <button class="btn" data-popover-action="toggle-lock" type="button">${lockLabel}</button>
            <button class="btn" data-popover-action="start-swap" type="button">Start swap</button>
            <button class="btn" data-popover-action="swap-reserve" type="button">Swap with unassigned</button>
            <button class="btn" data-popover-action="bench" type="button">Bench / remove from active</button>
            <button class="btn" data-popover-action="cancel" type="button">Cancel</button>
          </div>
        `;
        popover.hidden = false;
        const rect = card.getBoundingClientRect();
        const width = Math.min(320, document.documentElement.clientWidth - 24);
        const left = Math.min(document.documentElement.clientWidth - width - 12, Math.max(12, rect.left));
        const height = Math.min(popover.offsetHeight || 300, window.innerHeight - 24);
        const belowTop = rect.bottom + 8;
        const top = belowTop + height <= window.innerHeight - 12 ? belowTop : Math.max(12, rect.top - height - 8);
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
        popover.querySelectorAll("[data-popover-action]").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            const action = button.dataset.popoverAction;
            if (action === "leader") setCommandRole(playerId, "leader");
            if (action === "coleader") setCommandRole(playerId, "coleader");
            if (action === "clear-command") setCommandRole(playerId, "");
            if (action === "toggle-lock") setPlayerLock(playerId, !activeLockTarget(findPlayer(playerId)));
            if (action === "start-swap") startManualSwap(playerId);
            if (action === "swap-reserve") startReserveSwap(playerId);
            if (action === "bench") benchPlayer(playerId);
            if (action === "cancel") cancelPlayerAction();
          });
        });
        popover.querySelector("#popoverPlanRole")?.addEventListener("change", (event) => {
          event.stopPropagation();
          setPlanRole(playerId, event.target.value);
        });
        popover.querySelector("#popoverTitleRole")?.addEventListener("change", (event) => {
          event.stopPropagation();
          setTitleRole(playerId, event.target.value, popover.querySelector("#popoverTitleRoleNote")?.value || "");
        });
        popover.querySelector("#popoverTitleRoleNote")?.addEventListener("change", (event) => {
          event.stopPropagation();
          setTitleRole(playerId, popover.querySelector("#popoverTitleRole")?.value || "", event.target.value);
        });
        popover.querySelector("button")?.focus({ preventScroll: true });
      }

      function closePlayerPopover() {
        activePopoverPlayerId = "";
        const popover = document.getElementById("playerPopover");
        if (popover) popover.hidden = true;
      }

      function startManualSwap(playerId) {
        const located = locate(teams, playerId);
        if (!located) return toast("Start swap failed: player is not visible.");
        if (isProtectedPlayer(located.player, teams[located.teamIndex].id)) return toast("Start swap failed: leaders are pinned for this plan.");
        manualSwapSelectionId = playerId;
        closePlayerPopover();
        render();
        toast(`Swap started from ${located.player.name}. Activate a second unlocked player in either tier.`);
      }

      function startReserveSwap(playerId) {
        const located = locate(teams, playerId);
        if (!located) return toast("Swap failed: player is not visible.");
        if (isProtectedPlayer(located.player, teams[located.teamIndex].id)) return toast("Swap failed: leaders are pinned for this plan.");
        if (!reservePlayers.some((player) => !isBenchedPlayer(player.id))) return toast("Swap failed: no unassigned reserve player is available.");
        reserveSwapSourceId = playerId;
        manualSwapSelectionId = "";
        closePlayerPopover();
        render();
        toast(`Choose an unassigned reserve player for ${located.player.name}.`);
      }

      function benchPlayer(playerId) {
        const located = locate(teams, playerId);
        if (!located) return toast("Bench failed: player is not visible.");
        const team = teams[located.teamIndex];
        if (isProtectedPlayer(located.player, team.id)) return toast("Bench failed: leaders are pinned for this plan.");
        const playerName = located.player.name;
        withUndo(() => {
          const current = locate(teams, playerId);
          if (!current) return;
          reservePlayers.push(current.player);
          teams[current.teamIndex].players.splice(current.playerIndex, 1);
          benchedPlayerIds.add(playerId);
          selectedId = teams.flatMap((candidate) => candidate.players).find(Boolean)?.id || reservePlayers[0]?.id || "";
          manualSwapSelectionId = "";
          reserveSwapSourceId = "";
          activePopoverPlayerId = "";
        });
        closePlayerPopover();
        toast(`${playerName} moved to the bench and will be excluded from allocation.`);
      }

      function restoreBenchedPlayer(playerId) {
        if (!isBenchedPlayer(playerId)) return toast("Restore failed: player is not benched.");
        const playerName = playerNameById(playerId);
        withUndo(() => {
          benchedPlayerIds.delete(playerId);
          reshapeFromPool(currentPlayerPool());
          reserveSwapSourceId = "";
        });
        toast(`${playerName} restored to the active allocation pool.`);
      }

      function cancelPlayerAction() {
        manualSwapSelectionId = "";
        reserveSwapSourceId = "";
        closePlayerPopover();
        render();
        toast("Player action cancelled.");
      }

      function setPlayerLock(playerId, shouldLock) {
        const located = locate(teams, playerId);
        if (!located) return toast("Lock failed: player is not visible.");
        const team = teams[located.teamIndex];
        const playerName = located.player.name;
        withUndo(() => {
          overridesEnabled = true;
          const current = locate(teams, playerId)?.player;
          if (!current) return;
          if (shouldLock) {
            current.userLockTeamId = team.id;
            disabledOverrideRules.delete(userLockRuleId(current.id, team.id));
          } else {
            if (current.userLockTeamId) disabledOverrideRules.add(userLockRuleId(current.id, current.userLockTeamId));
            current.userLockTeamId = "";
            if (current.defaultLocked) disabledOverrideRules.add(lockRuleId(current.id));
          }
          current.locked = Boolean(activeLockTarget(current));
        });
        toast(shouldLock ? `${playerName} locked in ${team.name}.` : `${playerName} unlocked.`);
      }

      function isProtectedPlayer(player, teamId = findTeamIdByPlayer(player?.id)) {
        if (!player) return true;
        if (activeLockTarget(player)) return true;
        const override = commandOverrides[teamId] || {};
        if (override.leaderId === player.id && ruleActive(commandRuleId(teamId, "leader", player.id))) return true;
        if (isDefaultTeamMember(player, teamId) || isDefaultBuddyMember(player)) return true;
        return false;
      }

      function findTeamIdByPlayer(playerId) {
        const located = locate(teams, playerId);
        return located ? teams[located.teamIndex].id : "";
      }

      function canAtomicSwap(leftId, rightId) {
        if (!leftId || !rightId || leftId === rightId) return { ok: false, message: "Choose two different visible players." };
        const left = locate(teams, leftId);
        const right = locate(teams, rightId);
        if (!left || !right) return { ok: false, message: "Both swap targets must be visible players." };
        const leftTeam = teams[left.teamIndex];
        const rightTeam = teams[right.teamIndex];
        if (isProtectedPlayer(left.player, leftTeam.id) || isProtectedPlayer(right.player, rightTeam.id)) return { ok: false, message: "Rejected: leaders are pinned for this plan." };
        return { ok: true, left, right, leftTeam, rightTeam };
      }

      function performAtomicSwap(leftId, rightId, reason = "swap") {
        if (!manualMode) return toast("Turn on manual override before swapping."), false;
        const check = canAtomicSwap(leftId, rightId);
        if (!check.ok) {
          toast(check.message);
          return false;
        }
        const leftName = check.left.player.name;
        const rightName = check.right.player.name;
        withUndo(() => {
          swapById(teams, leftId, rightId);
          manualSwapSelectionId = "";
          activePopoverPlayerId = "";
          selectedId = rightId;
        });
        toast(`${reason === "suggestion" ? "Applied suggestion" : "Swapped"}: ${leftName} and ${rightName}.`);
        return true;
      }

      function swapWithReserve(activeId, reserveId) {
        const active = locate(teams, activeId);
        const reserveIndex = reservePlayers.findIndex((player) => player.id === reserveId);
        if (!active || reserveIndex < 0) {
          toast("Swap failed: choose one visible player and one reserve player.");
          return false;
        }
        const team = teams[active.teamIndex];
        const incoming = reservePlayers[reserveIndex];
        if (isBenchedPlayer(incoming.id)) return toast("Swap failed: the selected reserve player is benched.");
        if (isProtectedPlayer(active.player, team.id)) return toast("Swap failed: leaders are pinned for this plan.");
        const outgoingName = active.player.name;
        const incomingName = incoming.name;
        withUndo(() => {
          const source = locate(teams, activeId);
          const incomingIndex = reservePlayers.findIndex((player) => player.id === reserveId);
          if (!source || incomingIndex < 0) throw new Error("Swap targets changed before the swap completed.");
          const outgoing = source.player;
          teams[source.teamIndex].players[source.playerIndex] = reservePlayers[incomingIndex];
          reservePlayers.splice(incomingIndex, 1, outgoing);
          selectedId = reserveId;
          reserveSwapSourceId = "";
          manualSwapSelectionId = "";
          activePopoverPlayerId = "";
        });
        toast(`Swapped ${outgoingName} with unassigned ${incomingName}.`);
        return true;
      }

      function swapPlayers(leftId, rightId) {
        return performAtomicSwap(leftId, rightId, "manual swap");
      }

      function locate(source, playerId) {
        for (let teamIndex = 0; teamIndex < source.length; teamIndex += 1) {
          const playerIndex = source[teamIndex].players.findIndex((player) => player.id === playerId);
          if (playerIndex !== -1) return { teamIndex, playerIndex, player: source[teamIndex].players[playerIndex] };
        }
        return null;
      }

      function findPlayer(playerId) {
        return locate(teams, playerId)?.player;
      }

      function removeIdFromAllCommand(playerId) {
        Object.values(commandOverrides).forEach((override) => {
          if (override.leaderId === playerId) delete override.leaderId;
          override.coleaderIds = (override.coleaderIds || []).filter((candidate) => candidate !== playerId);
        });
      }

      function setPlanRole(playerId, roleKey) {
        const player = findPlayer(playerId);
        if (!player) return;
        const nextRole = normalizePlanRole(roleKey);
        withUndo(() => {
          const current = findPlayer(playerId);
          if (!current) return;
          current.planRole = nextRole;
        });
        const resolved = nextRole || defaultPlanRole(player);
        toast(resolved ? `${player.name} mapped to ${planRoles[resolved].label}.` : `${player.name} match-plan role cleared.`);
      }

      function setTitleRole(playerId, roleKey, note = "") {
        const player = findPlayer(playerId);
        if (!player) return;
        const nextRole = titleRoles[roleKey] ? roleKey : "";
        const nextNote = String(note || "").trim();
        withUndo(() => {
          const current = findPlayer(playerId);
          if (!current) return;
          current.titleRole = nextRole;
          current.titleRoleNote = nextNote;
        });
        toast(nextRole ? `${player.name} assigned ${titleRoles[nextRole].label}.` : `${player.name} title role cleared.`);
      }

      function setCommandRole(playerId, role) {
        const located = locate(teams, playerId);
        if (!located) return;
        const { player } = located;
        const team = teams[located.teamIndex];
        let nextLeaderId = team.players.find((candidate) => candidate.commandRole === "leader" && candidate.id !== player.id)?.id || "";
        let nextColeaderIds = team.players
          .filter((candidate) => candidate.commandRole === "coleader" && candidate.id !== player.id)
          .map((candidate) => candidate.id);
        let replacedColeader = "";
        if (role === "leader") nextLeaderId = player.id;
        if (role === "coleader" && nextColeaderIds.length >= 2) {
          const replaceId = nextColeaderIds
            .map((id) => team.players.find((candidate) => candidate.id === id))
            .filter(Boolean)
            .sort((a, b) => a.score - b.score)[0]?.id;
          if (replaceId) {
            replacedColeader = playerNameById(replaceId);
            nextColeaderIds = nextColeaderIds.filter((id) => id !== replaceId);
          }
        }
        if (role === "coleader") nextColeaderIds.push(player.id);
        withUndo(() => {
          overridesEnabled = true;
          const currentTeam = teams[located.teamIndex];
          const nextOverride = commandOverrides[currentTeam.id] || {};
          commandOverrides[currentTeam.id] = nextOverride;
          removeIdFromAllCommand(player.id);
          nextOverride.manualRoles = true;
          if (nextLeaderId) nextOverride.leaderId = nextLeaderId;
          else delete nextOverride.leaderId;
          nextOverride.coleaderIds = nextColeaderIds;
          if (role) disabledOverrideRules.delete(commandRuleId(currentTeam.id, role, player.id));
          solverConflicts = [];
        });
        toast(role ? `${player.name} set as ${role === "leader" ? "leader" : "co-leader"}${replacedColeader ? `, replacing ${replacedColeader}` : ""}.` : `${player.name} command role cleared.`);
      }
      function cloneTeams() {
        return teams.map((team) => ({ ...team, players: team.players.map(clonePlayer) }));
      }

      function cloneDisabledRules() {
        return [...disabledOverrideRules];
      }

      // Drops malformed entries rather than trusting them — this is restored from user
      // JSON and, later, from a published Firestore doc.
      function normalizeSubstitutions(source = {}) {
        const next = {};
        Object.entries(source || {}).forEach(([backupId, entry]) => {
          if (!backupId || !entry || typeof entry !== "object") return;
          const fromPhase = Number(entry.fromPhase);
          next[String(backupId)] = {
            replacesId: entry.replacesId ? String(entry.replacesId) : "",
            fromPhase: Number.isInteger(fromPhase) && fromPhase >= 0 && fromPhase < stage1Flow.length
              ? fromPhase
              : DEFAULT_SUB_PHASE,
          };
        });
        return next;
      }

      function cloneSubstitutions() {
        return normalizeSubstitutions(substitutions);
      }

      function snapshotState() {
        return {
          schemaVersion,
          rosterRevision,
          teams: cloneTeams().map((team, index) => ({
            ...team,
            tier: tierForIndex(index),
          })),
          reservePlayers: reservePlayers.map(clonePlayer),
          tierConfig: { ...tierConfig },
          commandOverrides: cloneCommandOverrides(commandOverrides),
          substitutions: cloneSubstitutions(),
          disabledOverrideRules: cloneDisabledRules(),
          benchedPlayerIds: [...benchedPlayerIds],
          selectedId,
          manualMode,
          whaleCurve,
          overridesEnabled,
          preferredNotes: preferredNotes.map((entry) => entry.slice()),
          solverConflicts: solverConflicts.slice(),
        };
      }

      function exactViewPackage() {
        const state = snapshotState();
        state.teams = state.teams.map((team, index) => ({
          ...team,
          tier: tierForIndex(index, state.tierConfig),
        }));
        state.commandOverrides = Object.fromEntries(
          state.teams.map((team) => {
            // Only pin EXPLICIT (admin-chosen) roles. Auto-assigned leaders are deterministic and
            // will be reproduced by assignLeadership on restore, so freezing them as manual pins
            // only immobilizes players and collapses the optimizer's search space.
            const leader = team.players.find((player) => player.commandRole === "leader" && player.commandRoleSource === "explicit");
            const coleaders = team.players.filter((player) => player.commandRole === "coleader" && player.commandRoleSource === "explicit");
            return [team.id, {
              leaderId: leader?.id || "",
              coleaderIds: coleaders.map((player) => player.id),
              manualRoles: Boolean(leader || coleaders.length),
            }];
          })
        );
        state.disabledOverrideRules = state.disabledOverrideRules.filter((ruleId) => !String(ruleId).startsWith("command:"));
        state.overridesEnabled = true;
        return {
          format: "all-star-boh-exact-view",
          version: 1,
          savedAt: new Date().toISOString(),
          state,
          view: {
            ignoreLeadership,
            search: document.getElementById("search")?.value || "",
            language: document.getElementById("language")?.value || "all",
          },
        };
      }

      function restoreExactViewPackage(payload) {
        if (payload?.format !== "all-star-boh-exact-view" || payload?.version !== 1 || !payload?.state) {
          throw new Error("This is not an All-Star BoH exact-view backup.");
        }
        withUndo(() => restoreState(payload.state));
        ignoreLeadership = Boolean(payload.view?.ignoreLeadership);
        const leadershipToggle = document.getElementById("leadershipToggle");
        if (leadershipToggle) {
          leadershipToggle.textContent = ignoreLeadership ? "ON" : "OFF";
          leadershipToggle.classList.toggle("on", ignoreLeadership);
          leadershipToggle.setAttribute("aria-pressed", String(ignoreLeadership));
        }
        const search = document.getElementById("search");
        const language = document.getElementById("language");
        if (search) search.value = payload.view?.search || "";
        if (language && [...language.options].some((option) => option.value === payload.view?.language)) {
          language.value = payload.view.language;
        }
        render();
        saveState();
      }

      function restoreState(state) {
        const validated = validateState(state);
        teams = validated.teams;
        reservePlayers = validated.reservePlayers;
        tierConfig = validated.tierConfig;
        commandOverrides = cloneCommandOverrides(validated.commandOverrides);
        substitutions = normalizeSubstitutions(state.substitutions);
        disabledOverrideRules = new Set(state.disabledOverrideRules || []);
        benchedPlayerIds = new Set((state.benchedPlayerIds || []).map(String));
        selectedId = state.selectedId || teams[0]?.players[0]?.id;
        // Editing is the default; a saved board never loads locked (the toggle is an in-session lock).
        manualMode = true;
        whaleCurve = Number.isFinite(Number(state.whaleCurve)) ? Number(state.whaleCurve) : 1.35;
        overridesEnabled = state.overridesEnabled !== false;
        preferredNotes = Array.isArray(state.preferredNotes) ? state.preferredNotes.map((entry) => entry.slice()) : preferred.slice();
        solverConflicts = Array.isArray(state.solverConflicts) ? state.solverConflicts.slice() : [];
        suggestions = [];
        const manualToggle = document.getElementById("manualToggle");
        if (manualToggle) manualToggle.classList.toggle("on", manualMode);
        const overrideToggle = document.getElementById("overrideToggle");
        if (overrideToggle) overrideToggle.classList.toggle("on", overridesEnabled);
      }

      function normalizeCommandState(source = {}) {
        const normalized = {};
        Object.entries(source).forEach(([teamId, override]) => {
          const next = {};
          if (override.leaderId) next.leaderId = override.leaderId;
          else if (override.leaderPower) next.leaderId = resolveInitialPower(Number(override.leaderPower), `${teamId} saved leader`, teamId);
          const ids = override.coleaderIds || (override.coleaderPowers || []).map((power) => resolveInitialPower(Number(power), `${teamId} saved co-leader`, teamId));
          if (ids.length) next.coleaderIds = ids;
          if (override.manualRoles) next.manualRoles = true;
          normalized[teamId] = next;
        });
        return normalized;
      }

      function validateState(state) {
        if (!state || state.schemaVersion !== schemaVersion) throw new Error("Unsupported or missing JSON schema version.");
        const hasTierConfig = state.tierConfig && [3, 4, 5, 6].includes(Number(state.tierConfig.tier1Count)) && [1, 2, 3, 4].includes(Number(state.tierConfig.tier2Count));
        const tier3Count = Number(state.tierConfig?.tier3Count || 0);
        if (!hasTierConfig || ![0, 1, 2].includes(tier3Count)) throw new Error("Invalid team shape.");
        const nextTierConfig = { tier1Count: Number(state.tierConfig.tier1Count), tier2Count: Number(state.tierConfig.tier2Count), tier3Count };
        const expectedTeams = totalConfiguredTeams(nextTierConfig);
        if (!Array.isArray(state.teams) || state.teams.length !== expectedTeams) throw new Error("JSON team count does not match tier shape.");
        if (!Array.isArray(state.reservePlayers)) throw new Error("JSON reserve list is missing.");
        const teamsCopy = state.teams.map((team, index) => {
          const expectedTier = tierForIndex(index, nextTierConfig);
          if (team.id !== `team-${index + 1}` || teamTier(team) !== expectedTier) throw new Error(`Invalid structure for team ${index + 1}.`);
          if (!Array.isArray(team.players) || team.players.length > 12) throw new Error(`${team.name || team.id} exceeds max capacity.`);
          return { ...team, color: team.color || teamColor(tierIndexForTeamIndex(index, nextTierConfig), expectedTier), tier: expectedTier, fightTime: team.fightTime || "+14", players: team.players.map(validatePlayer) };
        });
        const reserveCopy = state.reservePlayers.map(validatePlayer);
        if (Number(state.rosterRevision || 0) < rosterRevision) {
          const canonicalDizz = [...canonicalInitialById.values()].find((player) => player.name === "Dizz");
          const savedDizz = teamsCopy.flatMap((team) => team.players).concat(reserveCopy).find((player) => player.name === "Dizz");
          if (canonicalDizz && savedDizz) {
            Object.assign(savedDizz, {
              power: canonicalDizz.power,
              score: canonicalDizz.score,
              baseScore: canonicalDizz.baseScore,
              powerBreakdown: canonicalDizz.powerBreakdown ? { ...canonicalDizz.powerBreakdown } : undefined,
            });
          }
        }
        let ids = teamsCopy.flatMap((team) => team.players.map((player) => player.id)).concat(reserveCopy.map((player) => player.id));
        canonicalInitialById.forEach((_player, id) => {
          if (!ids.includes(id)) reserveCopy.push(canonicalPlayerClone(id));
        });
        ids = teamsCopy.flatMap((team) => team.players.map((player) => player.id)).concat(reserveCopy.map((player) => player.id));
        if (ids.length !== expectedInventoryCount) throw new Error(`JSON must contain exactly ${expectedInventoryCount} players.`);
        if (new Set(ids).size !== expectedInventoryCount) throw new Error("JSON contains duplicate player IDs.");
        ids.forEach((id) => {
          if (!canonicalInitialById.has(id)) throw new Error(`Unknown player ID ${id}.`);
        });
        const commands = normalizeCommandState(state.commandOverrides || defaultCommandOverridesById);
        const benchedIds = Array.isArray(state.benchedPlayerIds) ? state.benchedPlayerIds.map(String) : [];
        if (new Set(benchedIds).size !== benchedIds.length) throw new Error("JSON bench contains duplicate player IDs.");
        benchedIds.forEach((id) => {
          if (!canonicalInitialById.has(id)) throw new Error(`Unknown benched player ID ${id}.`);
          if (!reserveCopy.some((player) => player.id === id)) throw new Error(`Benched player ${id} must be in reserve.`);
        });
        Object.entries(commands).forEach(([teamId, override]) => {
          if (!teamsCopy.some((team) => team.id === teamId)) throw new Error(`Command target ${teamId} is not in this shape.`);
          [override.leaderId].concat(override.coleaderIds || []).filter(Boolean).forEach((id) => {
            if (!canonicalInitialById.has(id)) throw new Error(`Command target player ${id} is not canonical.`);
          });
        });
        return { teams: teamsCopy, reservePlayers: reserveCopy, tierConfig: nextTierConfig, commandOverrides: commands };
      }

      function validatePlayer(player) {
        if (!player || !canonicalInitialById.has(player.id)) throw new Error("Player ID is missing or not canonical.");
        ["score", "baseScore", "power"].forEach((field) => {
          if (!Number.isFinite(Number(player[field])) || (field === "power" && Number(player[field]) < 0)) throw new Error(`${player.name || player.id} has invalid ${field}.`);
        });
        // Re-derive the baseline from the authoritative in-file roster so a corrected score
        // propagates to existing sessions; preserve any manual adjustment layered on top.
        const canonicalBase = Number(canonicalInitialById.get(player.id).baseScore);
        const savedDelta = (Number(player.score) - Number(player.baseScore)) || 0;
        return {
          ...player,
          name: canonicalRosterName(Number(player.power), player.name),
          score: canonicalBase + savedDelta,
          baseScore: canonicalBase,
          power: Number(player.power),
          locale: normalizeLocale(player.locale),
          times: Array.isArray(player.times) ? player.times.slice() : parseTimes(player.times),
          commitment: commitmentOverrideForPower(player.power, player.commitment),
          userLockTeamId: typeof player.userLockTeamId === "string" ? player.userLockTeamId : "",
          planRole: normalizePlanRole(player.planRole),
          titleRole: titleRoles[player.titleRole] ? player.titleRole : "",
          titleRoleNote: typeof player.titleRoleNote === "string" ? player.titleRoleNote : "",
        };
      }

      function withUndo(mutator) {
        const before = snapshotState();
        undoStack.push(before);
        if (undoStack.length > 40) undoStack.shift();
        try {
          mutator();
        } catch (error) {
          restoreState(before);
          undoStack.pop();
          throw error;
        }
        suggestions = [];
        saveState();
        render();
      }

      function beginScoreUndo() {
        if (scoreUndoSnapshot) return;
        scoreUndoSnapshot = snapshotState();
      }

      function finishScoreUndo() {
        if (!scoreUndoSnapshot) return;
        // Only record an undo step if the score field actually changed something. Focusing and
        // blurring the input (a pure read) must not evict real history from the 40-deep stack.
        const snapshot = scoreUndoSnapshot;
        scoreUndoSnapshot = null;
        if (JSON.stringify(snapshot) === JSON.stringify(snapshotState())) return;
        undoStack.push(snapshot);
        if (undoStack.length > 40) undoStack.shift();
        saveState();
        render();
      }

      function saveState() {
        if (IS_VIEW) return;
        try {
          localStorage.setItem(storageKey, JSON.stringify(snapshotState()));
        } catch (error) {
          toast(`Save skipped: ${error.message}`);
        }
      }

      function loadSavedState() {
        if (IS_VIEW) return false;
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
          if (saved) {
            restoreState(saved);
            return true;
          }
        } catch (error) {
          try {
            localStorage.removeItem(storageKey);
          } catch (_) {}
          toast(`Saved state ignored: ${error.message}`);
        }
        return false;
      }

      function updateUndoButton() {
        const button = document.getElementById("undoBtn");
        if (button) button.disabled = undoStack.length === 0;
      }

      function parseCsv(text) {
        const rows = [];
        let row = [];
        let field = "";
        let quoted = false;
        for (let index = 0; index < text.length; index += 1) {
          const char = text[index];
          const next = text[index + 1];
          if (quoted) {
            if (char === '"' && next === '"') {
              field += '"';
              index += 1;
            } else if (char === '"') {
              quoted = false;
            } else {
              field += char;
            }
          } else if (char === '"') {
            quoted = true;
          } else if (char === ",") {
            row.push(field);
            field = "";
          } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
          } else if (char !== "\r") {
            field += char;
          }
        }
        if (field.length || row.length) {
          row.push(field);
          rows.push(row);
        }
        return rows.filter((candidate) => candidate.length > 1 || candidate[0]);
      }

      function recordsFromCsv(text) {
        const rows = parseCsv(text.replace(/^\uFEFF/, ""));
        if (!rows.length) throw new Error("CSV is empty.");
        const headers = rows[0] || [];
        const seen = new Set();
        headers.forEach((header) => {
          const key = header.trim();
          if (!key) throw new Error("CSV contains an empty header.");
          if (seen.has(key)) throw new Error(`CSV header '${key}' appears more than once.`);
          seen.add(key);
        });
        if (!seen.has("Effective Name")) throw new Error("CSV must include Effective Name.");
        rows.slice(1).forEach((row, index) => {
          if (row.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${row.length} columns; expected ${headers.length}.`);
        });
        return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
      }

      function recomputeV3(record) {
        // Live v3 scoring profile. All weights POSITIVE; totalCastlePower is not scored.
        const weights = {
          "Troop Power": 0.04,
          "Building Power": 0.5,
          "Technology Power": 0.9,
          "Hero Combat Power": 0.7,
          "Dragon Power": 3,
          "Unit Specialty Power": 4,
        };
        const available = Object.keys(weights).filter((field) => record[field] !== undefined && String(record[field]).trim() !== "");
        if (available.length !== Object.keys(weights).length) return null;
        const total = Object.entries(weights).reduce((sum, [field, weight]) => {
          const value = Number(record[field]);
          if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a finite nonnegative number.`);
          return sum + value * weight;
        }, 0);
        // No Math.abs(): with correct positive weights the total is always >= 0, so abs()
        // could only ever mask a future sign error like the one it previously hid.
        return Math.round(total) / 1000;
      }

      function normalizeName(value) {
        return String(value || "")
          .normalize("NFKD")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "");
      }

      function importCsv(text) {
        const records = recordsFromCsv(text);
        const headers = new Set(Object.keys(records[0] || {}));
        const idHeader = headers.has("Stable ID") ? "Stable ID" : headers.has("Player ID") ? "Player ID" : "";
        const byId = new Map();
        const byName = new Map();
        const duplicateNames = new Set();
        records.forEach((record, index) => {
          const name = String(record["Effective Name"] || "").trim();
          if (!name) throw new Error(`CSV row ${index + 2} is missing Effective Name.`);
          if (record["Total Power"] !== undefined && String(record["Total Power"]).trim() !== "") {
            const power = Number(record["Total Power"]);
            if (!Number.isFinite(power) || power < 0) throw new Error(`CSV row ${index + 2} has invalid Total Power.`);
          }
          if (idHeader && record[idHeader]) {
            if (byId.has(record[idHeader])) throw new Error(`CSV has duplicate stable ID ${record[idHeader]}.`);
            byId.set(record[idHeader], record);
          }
          const key = normalizeName(name);
          if (byName.has(key)) duplicateNames.add(key);
          byName.set(key, record);
        });
        if (duplicateNames.size) throw new Error("CSV has ambiguous duplicate Effective Name records.");
        const roster = allPlayers();
        const rosterNameCounts = roster.reduce((counts, player) => {
          const keys = [normalizeName(player.name), normalizeName(player.originalName)].filter(Boolean);
          keys.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
          return counts;
        }, new Map());
        const staged = [];
        const unmatched = [];
        const powerCollisions = new Map();
        records.forEach((record) => {
          if (!record["Total Power"]) return;
          const power = Number(record["Total Power"]);
          const matches = roster.filter((player) => player.power === power);
          if (matches.length > 1) powerCollisions.set(power, matches.map((player) => player.name));
        });
        if (powerCollisions.size) throw new Error(`CSV power collision(s) cannot be used for identity: ${[...powerCollisions.keys()].join(", ")}.`);
        let updated = 0;
        roster.forEach((player) => {
          let record = idHeader ? byId.get(player.id) : null;
          if (!record) {
            const keys = [normalizeName(player.name), normalizeName(player.originalName)].filter(Boolean);
            const key = keys.find((candidate) => byName.has(candidate));
            if (key && rosterNameCounts.get(key) === 1) record = byName.get(key);
            else if (key) throw new Error(`${player.name} has an ambiguous normalized name match.`);
          }
          if (!record) return;
          const nextScore = recomputeV3(record);
          staged.push({ player, record, nextScore });
        });
        records.forEach((record) => {
          const name = normalizeName(record["Effective Name"]);
          if (!staged.some((item) => item.record === record)) unmatched.push(record["Effective Name"]);
        });
        if (!staged.length) throw new Error("CSV matched zero canonical players; no changes applied.");
        withUndo(() => {
          staged.forEach(({ player, record, nextScore }) => {
            player.name = record["Effective Name"] || player.name;
            if (nextScore !== null) {
              player.score = nextScore;
              player.baseScore = nextScore;
            }
            if (record["Total Power"]) player.power = Number(record["Total Power"]);
            if (record["VTS Member"]) player.vts = record["VTS Member"];
            if (record.Locale) player.locale = normalizeLocale(languageOverrides[player.name] || record.Locale);
            else player.locale = normalizeLocale(languageOverrides[player.name] || player.locale);
            if (record["Leadership Support"]) player.leadVolunteer = record["Leadership Support"] === "Yes";
            if (record["Fighting Times"]) player.times = parseTimes(record["Fighting Times"].replace(/'/g, ""));
            if (record.Availability) player.availability = record.Availability;
            if (record["Role Preferences"]) player.roles = record["Role Preferences"];
            updated += 1;
          });
          teams.forEach((team) => (team.fightTime = team.fightTime || "+14"));
          if (headers.has("Preferred Teammates")) {
            preferredNotes = records
              .filter((record) => record["Preferred Teammates"]?.trim())
              .map((record) => [record["Effective Name"], record["Preferred Teammates"]]);
          }
        });
        toast(`Imported CSV: ${updated} updated, ${unmatched.length} unmatched.`);
      }

      function toast(message) {
        const el = document.getElementById("toast");
        el.textContent = message;
        el.classList.add("show");
        window.clearTimeout(toast.timer);
        toast.timer = window.setTimeout(() => el.classList.remove("show"), 1800);
      }

      function trapFocus(dialog) {
        const focusable = dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        function handler(e) {
          if (e.key !== 'Tab') return;
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
        
        dialog.addEventListener('keydown', handler);
        return () => dialog.removeEventListener('keydown', handler);
      }

      let removeFocusTrap = null;
      let previousBodyOverflow = null;

      document.getElementById("suggestBtn").addEventListener("click", () => {
        suggestions = getSuggestions();
        renderSuggestions();
        toast(suggestions.length ? "Fresh swap suggestions ready." : "No improving swap found.");
      });

      document.getElementById("autoBtn").addEventListener("click", () => {
        suggestions = getSuggestions();
        if (!suggestions.length) return toast("No improving swap found.");
        applySuggestion(suggestions[0]);
      });

      document.getElementById("rebalanceBtn").addEventListener("click", rebalanceUnlocked);

      document.getElementById("resetBtn").addEventListener("click", () => {
        withUndo(() => {
          applyDefaultBoardState();
        });
        toast("Board reset.");
      });

      document.getElementById("undoBtn").addEventListener("click", () => {
        const previous = undoStack.pop();
        if (!previous) return;
        restoreState(previous);
        saveState();
        render();
        toast("Undone.");
      });

      document.getElementById("exportBtn").addEventListener("click", async () => {
        const payload = JSON.stringify(snapshotState(), null, 2);
        const outcomes = [];
        try {
          const blob = new Blob([payload], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "all-star-boh-mapper-backup.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          outcomes.push("download started");
        } catch (error) {
          outcomes.push(`download failed: ${error.message}`);
        }
        try {
          await navigator.clipboard.writeText(payload);
          outcomes.push("clipboard copied");
        } catch (error) {
          outcomes.push(`clipboard failed: ${error.message}`);
        }
        toast(`Export JSON: ${outcomes.join("; ")}.`);
      });

      document.getElementById("restoreBtn").addEventListener("click", () => {
        document.getElementById("jsonInput").click();
      });

      document.getElementById("saveExactViewBtn").addEventListener("click", () => {
        const payload = JSON.stringify(exactViewPackage(), null, 2);
        const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `all-star-boh-exact-view-${teams.length}-teams.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Exact view saved. This file restores the visible roster and command roles exactly.");
      });

      document.getElementById("loadExactViewBtn").addEventListener("click", () => {
        document.getElementById("exactViewInput").click();
      });

      document.getElementById("pngTier1Btn").addEventListener("click", () => {
        const ids = tierTeamIds("tier1");
        downloadPng(ids, `all-star-boh-tier1-${ids.length}-teams.png`);
      });

      document.getElementById("pngTier2Btn").addEventListener("click", () => {
        const ids = tierTeamIds("tier2");
        downloadPng(ids, `all-star-boh-tier2-${ids.length}-teams.png`);
      });

      document.getElementById("pngTier3Btn").addEventListener("click", () => {
        const ids = tierTeamIds("tier3");
        downloadPng(ids, `all-star-boh-tier3-${ids.length}-teams.png`);
      });

      document.getElementById("pngAllBtn").addEventListener("click", () => {
        const ids = teams.map((team) => team.id);
        downloadPng(ids, `all-star-boh-all-${ids.length}-teams.png`);
      });

      document.getElementById("importBtn").addEventListener("click", () => {
        document.getElementById("csvInput").click();
      });

      document.getElementById("csvInput").addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          importCsv(await file.text());
        } catch (error) {
          toast(`CSV import failed: ${error.message}`);
        }
        event.target.value = "";
      });

      document.getElementById("jsonInput").addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const nextState = JSON.parse(await file.text());
          withUndo(() => restoreState(nextState));
          toast("JSON restore applied.");
        } catch (error) {
          toast(`JSON restore failed: ${error.message}`);
        }
        event.target.value = "";
      });

      document.getElementById("exactViewInput").addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          restoreExactViewPackage(JSON.parse(await file.text()));
          toast("Exact view restored.");
        } catch (error) {
          toast(`Exact view restore failed: ${error.message}`);
        }
        event.target.value = "";
      });

      document.getElementById("search").addEventListener("input", renderBoard);
      document.getElementById("language").addEventListener("change", renderLanguageList);
      document.getElementById("rolePlanBtn")?.addEventListener("click", () => openRolePlanDialog(selectedId ? findTeamIdByPlayer(selectedId) : ""));
      document.getElementById("viewListBtn")?.addEventListener("click", () => setViewMode("list"));
      document.getElementById("viewBoardBtn")?.addEventListener("click", () => setViewMode("board"));
      document.getElementById("rolePlanCloseBtn")?.addEventListener("click", closeRolePlanDialog);
      // Top-level nav: Team List <-> Team Plans, instead of a modal "Close".
      document.getElementById("rolePlanNavList")?.addEventListener("click", () => {
        try { localStorage.setItem("boh-last-section", "list"); } catch (error) { /* ignore */ }
        closeRolePlanDialog();
        setViewMode("list");
      });
      document.getElementById("rolePlanNavPlans")?.addEventListener("click", () => {
        try { localStorage.setItem("boh-last-section", "plans"); } catch (error) { /* ignore */ }
        if (document.getElementById("rolePlanDialog")?.hidden) openRolePlanDialog();
      });
      // The planner's own "Team Plans" button is the other way into this section.
      document.getElementById("rolePlanBtn")?.addEventListener("click", () => {
        try { localStorage.setItem("boh-last-section", "plans"); } catch (error) { /* ignore */ }
      });
      function setRolePlanMode(mode) {
        planViewMode = mode;
        document.querySelector(".role-plan-share")?.removeAttribute("open");
        renderRolePlanDialog();
      }
      document.getElementById("planModePlayer")?.addEventListener("click", () => setRolePlanMode("player"));
      document.getElementById("planModeBoard")?.addEventListener("click", () => setRolePlanMode("board"));
      document.getElementById("planModeMap")?.addEventListener("click", () => setRolePlanMode("map"));
      document.getElementById("planModeSlides")?.addEventListener("click", () => setRolePlanMode("slides"));
      document.getElementById("planModeGrid")?.addEventListener("click", () => setRolePlanMode("grid"));
      document.querySelector(".plan-modes")?.addEventListener("keydown", (event) => {
        const tabs = Array.from(document.querySelectorAll('.plan-modes [role="tab"]'));
        const current = tabs.indexOf(document.activeElement);
        if (current < 0) return;
        let next = current;
        if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      });
      document.getElementById("rolePlanLocaleSelect")?.addEventListener("change", (event) => {
        rolePlanLocaleMode = event.target.value || "en";
        if (rolePlanLocaleMode !== "auto") {
          rolePlanDisplayLocale = rolePlanLocaleMode;
          uiLocale = rolePlanLocaleMode;
          applyUITranslations(uiLocale);
        }
        renderRolePlanDialog();
      });
      document.getElementById("rolePlanDensityBtn")?.addEventListener("click", () => {
        rolePlanCompact = !rolePlanCompact;
        renderRolePlanDialog();
      });
      // Team switcher: click any team, or arrow left/right along the strip.
      document.getElementById("rolePlanTeamSwitch")?.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-team-pick]");
        if (!btn) return;
        rolePlanTeamId = btn.dataset.teamPick;
        renderRolePlanDialog();
      });
      document.getElementById("rolePlanTeamSwitch")?.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const i = teams.findIndex((t) => t.id === rolePlanTeam().id);
        const next = (i + (event.key === "ArrowRight" ? 1 : teams.length - 1)) % teams.length;
        rolePlanTeamId = teams[next].id;
        renderRolePlanDialog();
        document.querySelector("#rolePlanTeamSwitch .team-switch-btn.on")?.focus();
      });
      document.getElementById("rolePlanJsonBtn")?.addEventListener("click", exportRolePlanJson);
      document.getElementById("rolePlanAllJsonBtn")?.addEventListener("click", exportAllRolePlansJson);
      document.getElementById("rolePlanPngBtn")?.addEventListener("click", () => {
        downloadRolePlanPng().catch((error) => toast(`Role plan PNG failed: ${error.message}`));
      });
      document.addEventListener("click", (event) => {
        const popover = document.getElementById("playerPopover");
        if (!popover || popover.hidden) return;
        if (popover.contains(event.target) || event.target.closest(".player")) return;
        closePlayerPopover();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        if (!document.getElementById("rolePlanDialog")?.hidden) {
          closeRolePlanDialog();
          return;
        }
        if (activePopoverPlayerId || manualSwapSelectionId) {
          manualSwapSelectionId = "";
          closePlayerPopover();
          render();
          toast("Player action cancelled.");
        }
      });

      const manualToggle = document.createElement("button");
      manualToggle.id = "manualToggle";
      manualToggle.className = "toggle";
      manualToggle.type = "button";
      manualToggle.title = "Lock or unlock board editing";
      manualToggle.setAttribute("aria-label", "Lock or unlock board editing");
      manualToggle.setAttribute("aria-pressed", "false");
      const modeRow = document.createElement("div");
      modeRow.className = "mode-row";
      modeRow.innerHTML = `<div><strong>Manual placement</strong><br /><small>On by default — drag or click to move players anywhere. Turn off to lock the board.</small></div>`;
      modeRow.appendChild(manualToggle);
      document.querySelector(".sidebar").prepend(modeRow);

      const curveRow = document.createElement("div");
      curveRow.className = "mode-row curve-row";
      curveRow.innerHTML = `
        <div style="flex:1">
          <strong>Whale curve · <span id="curveVal">${whaleCurve.toFixed(2)}</span></strong>
          <br /><small id="curveHint">Superlinear scoring — top-end strength worth exponentially more.</small>
          <input id="curveSlider" type="range" min="100" max="160" step="5" value="${Math.round(whaleCurve * 100)}" style="width:100%;margin-top:8px" aria-label="Whale curve exponent" />
          <div style="display:flex;justify-content:space-between"><small>1.0 linear</small><small>1.6 steep</small></div>
        </div>`;
      document.querySelector(".sidebar").prepend(curveRow);
      const curveSlider = document.getElementById("curveSlider");
      curveSlider.addEventListener("input", () => {
        whaleCurve = Number(curveSlider.value) / 100;
        render();
      });
      curveSlider.addEventListener("change", () => saveState());
      manualToggle.addEventListener("click", () => {
        withUndo(() => {
          manualMode = !manualMode;
          manualSwapSelectionId = "";
          manualToggle.classList.toggle("on", manualMode);
          manualToggle.setAttribute("aria-pressed", String(manualMode));
        });
      });
      const leadershipToggle = document.createElement("button");
      leadershipToggle.id = "leadershipToggle";
      leadershipToggle.className = "toggle";
      leadershipToggle.type = "button";
      leadershipToggle.textContent = "OFF";
      leadershipToggle.setAttribute("aria-pressed", "false");
      leadershipToggle.title = "Temporarily ignore leader and co-leader ordering and checks";
      const leadershipRow = document.createElement("div");
      leadershipRow.className = "mode-row";
      leadershipRow.innerHTML = `<div><strong>Leadership rules</strong><br /><small>Keep roles saved while temporarily ignoring them.</small></div>`;
      leadershipRow.appendChild(leadershipToggle);
      document.querySelector(".sidebar").prepend(leadershipRow);
      leadershipToggle.addEventListener("click", () => {
        ignoreLeadership = !ignoreLeadership;
        leadershipToggle.textContent = ignoreLeadership ? "ON" : "OFF";
        leadershipToggle.setAttribute("aria-label", `Ignore leadership roles: ${ignoreLeadership ? "on" : "off"}`);
        leadershipToggle.classList.toggle("on", ignoreLeadership);
        leadershipToggle.setAttribute("aria-pressed", String(ignoreLeadership));
        render();
      });
      function moveTeamColumn(fromIndex, toIndex) {
        if (toIndex < 0 || toIndex >= teams.length || fromIndex < 0 || fromIndex >= teams.length) return;
        withUndo(() => {
          const fromTeam = teams[fromIndex];
          const toTeam = teams[toIndex];
          const fromPlayers = fromTeam.players;
          const fromFightTime = fromTeam.fightTime;
          fromTeam.players = toTeam.players;
          fromTeam.fightTime = toTeam.fightTime;
          toTeam.players = fromPlayers;
          toTeam.fightTime = fromFightTime;

          const fromCommand = commandOverrides[fromTeam.id];
          commandOverrides[fromTeam.id] = commandOverrides[toTeam.id];
          commandOverrides[toTeam.id] = fromCommand;
          [[fromTeam, fromTeam.id], [toTeam, toTeam.id]].forEach(([team, teamId]) => {
            team.players.filter((player) => player.locked).forEach((player) => {
              disabledOverrideRules.add(lockRuleId(player.id));
              player.userLockTeamId = teamId;
              disabledOverrideRules.delete(userLockRuleId(player.id, teamId));
            });
          });
        });
        toast(`Team moved to ${displayTeamName(teams[toIndex])}.`);
      }
      document.getElementById("moveTeamLeftBtn")?.addEventListener("click", () => moveTeamColumn(teams.length - 1, teams.length - 2));
      document.getElementById("moveTeamRightBtn")?.addEventListener("click", () => moveTeamColumn(0, 1));

      // Build the real default board whenever load returns false (no saved state OR a load that
      // failed validation) — never fall through to the un-solved raw hydrate board.
      if (!loadSavedState()) {
        applyDefaultBoardState();
        saveState();
      }
      applyViewMode();
      initTheme();
      applyUITranslations(uiLocale);
      document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
      document.getElementById('rolePlanThemeBtn')?.addEventListener('click', toggleTheme);
      const rolePlanLocaleSelect = document.getElementById('rolePlanLocaleSelect');
      if (rolePlanLocaleSelect) {
        rolePlanLocaleSelect.value = uiLocale;
      }
      render();

      // Team Plans is the landing section. Skipped if the user explicitly navigated to the
      // Team List last session, so the nav choice survives a reload.
      try {
        if (!IS_VIEW && localStorage.getItem("boh-last-section") !== "list") openRolePlanDialog();
      } catch (error) {
        if (!IS_VIEW) openRolePlanDialog();
      }

      function cloneForTest(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
      }

      function deepFreezeForTest(value) {
        if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
        Object.freeze(value);
        Object.values(value).forEach(deepFreezeForTest);
        return value;
      }

      function readonlyForTest(value) {
        return deepFreezeForTest(cloneForTest(value));
      }

      function suggestionForTest(item) {
        if (!item) return null;
        return {
          aId: item.a?.id || "",
          bId: item.b?.id || "",
          fromTeamId: item.from?.id || "",
          toTeamId: item.to?.id || "",
          fromName: item.from?.name || "",
          toName: item.to?.name || "",
          objectiveGain: item.objectiveGain,
          balanceGain: item.balanceGain,
          timeFixes: item.timeFixes,
          languageFixes: item.languageFixes,
        };
      }

      function testSourceTeams(state) {
        return state ? validateState(cloneForTest(state)).teams : cloneTeams();
      }

      function testStateView() {
        const teamsCopy = cloneTeams();
        return readonlyForTest({
          ...snapshotState(),
          undoDepth: undoStack.length,
          players: allPlayers(),
          rules: overrideRules().map((rule) => ({ ...rule, active: ruleActive(rule.id) })),
          suggestions: suggestions.map(suggestionForTest),
          metrics: metrics(teamsCopy),
          objective: objective(teamsCopy),
          constraints: constraintReport(teamsCopy),
          capacity: capacityReport(),
        });
      }

      function testResetBoard() {
        withUndo(() => {
          applyDefaultBoardState();
        });
        toast("Board reset.");
        return testStateView();
      }

      function testUndo() {
        const previous = undoStack.pop();
        if (!previous) return false;
        restoreState(previous);
        saveState();
        render();
        toast("Undone.");
        return true;
      }

      function testPlayerLocation(playerId) {
        const located = locate(teams, playerId);
        if (!located) return null;
        return readonlyForTest({
          teamIndex: located.teamIndex,
          playerIndex: located.playerIndex,
          team: teams[located.teamIndex],
          player: located.player,
        });
      }

      const bohMapperTestHook = {
        get state() {
          return testStateView();
        },
        getState: testStateView,
        players: () => readonlyForTest(allPlayers()),
        teams: () => readonlyForTest(teams),
        reserves: () => readonlyForTest(reservePlayers),
        snapshot: () => readonlyForTest(snapshotState()),
        snapshotState: () => readonlyForTest(snapshotState()),
        exactView: () => readonlyForTest(exactViewPackage()),
        restoreExactView(payload) {
          restoreExactViewPackage(cloneForTest(payload));
          return testStateView();
        },
        restore(state) {
          restoreState(cloneForTest(state));
          saveState();
          render();
          return testStateView();
        },
        restoreState(state) {
          return this.restore(state);
        },
        undo: testUndo,
        reset: testResetBoard,
        setTierCounts(tier1Count, tier2Count, tier3Count = tierConfig.tier3Count) {
          setTierCounts(Number(tier1Count), Number(tier2Count), Number(tier3Count));
          return testStateView();
        },
        reshape(tier1Count = tierConfig.tier1Count, tier2Count = tierConfig.tier2Count, tier3Count = tierConfig.tier3Count) {
          setTierCounts(Number(tier1Count), Number(tier2Count), Number(tier3Count));
          return testStateView();
        },
        rebalance() {
          rebalanceUnlocked();
          return testStateView();
        },
        rebalanceUnlocked() {
          return this.rebalance();
        },
        setManualOverride(enabled) {
          withUndo(() => {
            manualMode = Boolean(enabled);
            manualSwapSelectionId = "";
            const toggle = document.getElementById("manualToggle");
            if (toggle) {
              toggle.classList.toggle("on", manualMode);
              toggle.setAttribute("aria-pressed", String(manualMode));
            }
          });
          return manualMode;
        },
        setOverridesEnabled(enabled) {
          withUndo(() => {
            overridesEnabled = Boolean(enabled);
            solverConflicts = [];
          });
          return overridesEnabled;
        },
        toggleOverrides() {
          return this.setOverridesEnabled(!overridesEnabled);
        },
        rules() {
          return readonlyForTest(overrideRules().map((rule) => ({ ...rule, active: ruleActive(rule.id) })));
        },
        setRule(ruleId, enabled) {
          withUndo(() => {
            if (enabled) disabledOverrideRules.delete(String(ruleId));
            else disabledOverrideRules.add(String(ruleId));
            solverConflicts = [];
          });
          return ruleActive(String(ruleId));
        },
        toggleRule(ruleId) {
          return this.setRule(ruleId, disabledOverrideRules.has(String(ruleId)));
        },
        applyOverrides() {
          withUndo(() => applyOverrideRules());
          return testStateView();
        },
        getSuggestions() {
          suggestions = getSuggestions();
          renderSuggestions();
          return readonlyForTest(suggestions.map(suggestionForTest));
        },
        applySuggestion(target = 0) {
          const list = suggestions.length ? suggestions : getSuggestions();
          const item = typeof target === "number" ? list[target] : target;
          const leftId = item?.a?.id || item?.aId || item?.leftId;
          const rightId = item?.b?.id || item?.bId || item?.rightId;
          if (!leftId || !rightId) return false;
          return performAtomicSwap(leftId, rightId, "suggestion");
        },
        metrics(state) {
          return readonlyForTest(metrics(testSourceTeams(state)));
        },
        objective(state) {
          return objective(testSourceTeams(state));
        },
        constraints(state) {
          return readonlyForTest(constraintReport(testSourceTeams(state)));
        },
        constraintReport(state) {
          return this.constraints(state);
        },
        importCsv(text) {
          importCsv(String(text));
          return testStateView();
        },
        lookup(playerId) {
          return testPlayerLocation(String(playerId));
        },
        swap(leftId, rightId) {
          return performAtomicSwap(String(leftId), String(rightId), "manual swap");
        },
        swapPlayers(leftId, rightId) {
          return this.swap(leftId, rightId);
        },
        bench(playerId) {
          benchPlayer(String(playerId));
          return testStateView();
        },
        swapWithReserve(activeId, reserveId) {
          return swapWithReserve(String(activeId), String(reserveId));
        },
        lock(playerId, shouldLock = true) {
          setPlayerLock(String(playerId), Boolean(shouldLock));
          return testPlayerLocation(String(playerId));
        },
        setPlayerLock(playerId, shouldLock = true) {
          return this.lock(playerId, shouldLock);
        },
        role(playerId, role) {
          const nextRole = role === "leader" || role === "coleader" ? role : "";
          setCommandRole(String(playerId), nextRole);
          return testPlayerLocation(String(playerId));
        },
        setCommandRole(playerId, role) {
          return this.role(playerId, role);
        },
      };

      Object.defineProperty(globalThis, "__BOH_MAPPER_TEST__", {
        configurable: true,
        value: Object.freeze(bohMapperTestHook),
      });
    
// Public API for external page modules
      window.BohMapper = {
        hydrate: function(state) { restoreState(state); },
        render: function() { render(); },
        snapshotState: function() { return JSON.parse(JSON.stringify({ schemaVersion, tierConfig, teams, reservePlayers, commandOverrides, disabledOverrideRules: [...disabledOverrideRules], benchedPlayerIds: [...benchedPlayerIds], selectedId, manualMode, whaleCurve, overridesEnabled, preferredNotes, solverConflicts })); },
        openRolePlanDialog: openRolePlanDialog,
        focusPlayerOrders: function(playerId) { planFocusPlayerId = playerId; openRolePlanDialog(); },
        listPlayers: function() { const pool = currentPlayerPool(); return pool.map(function(p) { return { id: p.id, name: p.name, score: p.score, locale: p.locale }; }); },
      };
})();
