// Exact-match account aliases for VTS admin name reconciliation.
//
// CONFIRMED_GROUPS is active and holds three kinds of entry:
//   - variants that differ by decoration, whitespace or case alone;
//   - owner-confirmed merges, where the letters differ and only the alliance
//     owner could say the spellings are one game account. These were confirmed
//     on 2026-09-03;
//   - separations: groups that exist to keep accounts APART, so that
//     decoration-stripping elsewhere cannot fold an alt or a banner account
//     into its owner.
//
// PENDING_GROUPS is the holding area for candidates the owner has not ruled on.
// It is empty today, and the mechanism stays because OCR keeps producing new
// spellings: a new candidate goes here, not into CONFIRMED_GROUPS, until it is
// confirmed. Nothing resolves through it, and two tests enforce that.
//
// Why the distinction exists: these names feed weighted contribution scoring.
// Fold two real accounts together and their demolition points collapse into one
// player's score; leave one account split and its points vanish from the
// leaderboard. Both are silent, and both change standings people care about.
//
// Matching is exact after normalisation on purpose. No fuzzy or confusable
// matching lives here — that is exactly what turns separate alts into one
// account.

export const CONFIRMED_GROUPS = [
  // --- decoration / whitespace / case variants -----------------------------
  ['** Loony **', '**Loony**', '**Loony **', 'Loony 1'],
  ['• IU •', '· IU ·', '•IU•', '. IU .', 'IU'],
  ['=EstimatoR=', '==EstimatoR==', '=-EstimatoR=-', '==-EstimatoR=-', '-=EstimatoR=-'],
  ['Anne', '↑Anne ↑', 'ˆ Anne ˆ', '^ Anne ^', '^Anne^', '^Anne ^', '∧nne∧', '∧Anne∧', '†Anne†'],
  ['!!WAEL!!', '!!WAEL !!', '!! WAEL !!'],
  ['=THOR=', '__=THOR=__', '___=THOR=___'],
  ['BiG BOiiE', 'BIG BOiiE'],
  ['Victoria', '~Victoria~'],
  [
    'IDN Dragon.Gold',
    "IDN'Dragon.Gold",
    'IDNÓDragon.Gold',
    'IDN/Dragon.Gold',
    'IDN°/Dragon.Gold',
    '⋎I D N Ø|Dragon.Gold',
  ],
  ['Nosferatu', '~Nosferatu~', '✨Nosferatu✨'],

  // --- aliases the previous rules already carried --------------------------
  ['Moldo1313', 'Moldo'],
  ['D O F F Y', 'D offy.', 'D off y.', 'Doffy.', 'D off.y.', 'D o f f y.', 'D off f y.'],
  ['Molly', '*Molly*'],
  ['Jjamaica pete', 'jJamaica pete'],
  ['terrible ivan', 'terribile ivan'],
  ['CoBoP', 'СоБоР', 'СоBoР', 'Co6oP', 'SoBor'],
  ['REDBULLS', 'REDBULL§', 'REDBULL$', 'Rebull', 'Red'],
  ['IKIGAI', 'ɪᴋɪɢᴀɪ'],
  ['DEAD END', 'ØDEAD ENDØ', 'O DEAD ENDOO'],
  ['ANGEL', 'ΛNGEL', 'ΛNGƎL', 'ANGƎL', 'ANGΞL'],

  // --- owner-confirmed merges (2026-09-03) ---------------------------------
  // Letters differ across these spellings, so they are identity calls rather
  // than decoration stripping. Confirmed by the alliance owner.
  ['Dobby', 'Дobby', 'Đobby'],
  [
    'FALLEN',
    'FAllEN',
    'FAILΞN',
    'FAIΛN',
    'FAIŁËN',
    'FAIⅡΞN',
    'FAIΛEN',
    'FAIℓΞN',
    'FAIŁN',
    'FAIIΛN',
    'FAIIΞN',
    'FAILÆN',
    'FAIÎN',
    'FAIΞN',
    'FAIⅡEN',
    'FALLΞN',
    'FAll£N',
  ],
  [
    'Made3110',
    'Ind.)Made3110',
    '↣ I n d ø |Made3110',
    'i N d ø /Made3110',
    'i N d o/Made3110',
    '∞ x N d ∞|Made3110',
    '♀iNd♂/Made3110',
    'iNd°/Made3110',
    '«I N d»/Made3110',
    "I N d '/Made3110",
    'x N d ∅Made3110',
    '~i N d o~/Made3110',
    '⇝i N d ø/|Made3110',
    '⋎ I N d ◡/Made3110',
    '⋎I N d Ø|Made3110',
    '⋎N d¢/Made3110',
    '♀️i N d ♡|Made3110',
    '♡ i n d ♡/Made3110',
  ],
  [
    '乃ㄥ口毛',
    '乃亖口毛',
    '乃ム口毛',
    '乃ㄥ毛',
    '乃口毛',
    '乃⊂口毛',
    '乃毛',
    '乃∠U毛',
    '乃ㄥロ毛',
    '乃ㄥ凵乇',
    '乃乚口毛',
    '乃厶口毛',
    '乃艸口毛',
  ],
  ['пупОк', 'πηnOk', 'ηηOk', 'пynOk', 'πυπΟκ', 'ηηnOk', 'ηπnOk', 'пynОк'],
  ['Kika2.0', '~Kika2.0~', '°Kika2.0°', 'Kika2.0²'],
  ['Shabir', '□Shabir□', '□○Shabir□', '□oShabiro□'],
  ['Moshieee', 'Moshiieee', 'Moshieeee'],
  ['Dr Thund€r', 'Dr Thundër'],
  ['MasterVj', '∾~MasterVjpe∾', 'MasterVjv', 'MasterVje', 'MasterV', '✨MasterVj✨', '~MasterVj~'],
  ['!!! Юляша !!!', '!!! Юлляша !!!'],
  ['Орша 2025', 'Opwa 2025', 'Opsha 2025', 'Opua 2025', 'Opwâ 2025'],
  ['$OL€MAST€R', '$OL€MASTER'],
  [
    'Ar Ran ★_YG+62',
    'Ar Ran Dil☆+62',
    'Ar Ran Dil⭐+62',
    'Ar Ran Dil +62',
    'Ar Ran Dil+62',
    'Ar Ran Dil★+62',
  ],
  ['Hunter killer.', 'һаттер killer.'],
  [
    'M@$T€€~BANNER',
    'M@S$€₹~BANNER',
    'M@$€₹~BANNER',
    'M@ST€€7~BANNER',
    'M@$$€~BANNER',
    'M@ST€₹~BANNER',
    'Master Banner',
    'MasterBanner',
  ],

  // --- Eden X2 audit (2026-09-15) ------------------------------------------
  // Read from the X2 admin debug bundle. Each group passed a co-occurrence
  // check: no two spellings ever appear in the same contribution list, and where
  // two appear in one attack they sit on adjacent ranks with identical values —
  // one row OCR'd twice, not two players. Splits here were dropping real
  // demolition from weighted scores (a contribution row under one spelling never
  // met the demolition rows under the others).
  ['NATASHA', 'NATAcHA', 'NATAvsHA', 'NATAwHA', 'NATAωHA'],
  ['EightBall _V/_', 'EightBall', 'EightBall _\\/_', 'EightBall _/_', 'EightBall _W/_'],
  ['EviltwinII', 'EviltwinlI'],
  ['Кутузовф', 'Кутузовφ'],
  [
    'AK Чапай',
    'АК Чапай',
    'AK',
    'AK Чанаǐ',
    'AK Чанаý',
    'AK Чанай',
    'AK Чапаń',
    'AK Чапа́й',
    'AK Чапаи',
    'АК Чанай',
  ],
  ['ZEROk*', 'ZEROOk*'],
  [
    '키미 kimmy',
    'кимi kimmy',
    'кими kimmy',
    'كيمي kimmy',
    'كي미 kimmy',
    'キミ kimmy',
    '키키 kimmy',
  ],
  ['BONEfastBANNER', 'iBONEfastBANNER'],
  // Duty lists are typed by hand, so a shortened name is still one account when
  // it is the only account it could be.
  // She selkie is her Viber name (owner-confirmed 2026-09-17).
  ['La Scimmia', 'Scimmia', 'She selkie', 'Sheselkie', '@She selkie', '@Sheselkie'],
  ['Neutrino10', 'Neutrino'],

  // --- owner-confirmed duty names (2026-09-15) -----------------------------
  // Short names typed into X2 duty lists, each confirmed by the alliance owner.
  ['BoneSmoker', 'Bone'],
  ['MalakaKiji', 'Kiji'],

  // --- separations: accounts that must never be folded together ------------
  // Common ownership is not aliasing. Each of these is its own game account,
  // and several were being merged into their owner before this file existed.
  ['꧁ Kika ꧂', '꧁Kika꧂'],
  ['꧁༺ Kika ༻꧂', '꧁༺Kika༻꧂', '༺ Kika ༻', '༺Kika༻', '≪Kika≫'],
  ['꧁ Kika-banner ꧂', 'Kika-banner', '꧁Kika-banner꧂'],
  ['꧁Kika-banner2꧂', 'Kika-banner2', '꧁ Kika-banner2 ꧂'],
  // DVD181 and DVD are duty-list spellings of the main account, not the x2 alt.
  ['DvD18', 'DVD181', 'DVD'],
  ['DvD18 x2'],
  ['BOiiE'],
  ['BOiiE BANNER'],
  ['Angel Banner'],
  ['Angel v2'],
  ['Loony Banner'],
  ['Little Loony'],
  ['RedBull#2'],
  ['RedBull#3'],
  ['~Sarafino~', 'Sarafino', 'Sarafino~'],
  ['~Sarafina~', 'Sarafina', 'Sarafina~'],
  // q. Immortal was renamed blaze banner 2 (owner-confirmed 2026-09-15). The data
  // agrees: the old name leaves the X2 lists exactly as the new one arrives, and
  // the two never share a contribution list or an attack. "Immortal" in banner
  // duty lists is the same account. "q.Immortal" (no space) is the spelling the
  // duty review confirmed three rows under; it is the same name without its
  // space, and without it those duties scored to a phantom account (16.5.9).
  ['blaze banner 2', 'q. Immortal', 'q. Immortalis', 'Immortal', 'q.Immortal'],
  ['qImmortal.Banner', 'qmmortal.Banner'],
  ['Liskylli banner'],
  ['AK Чапай-baner'],
  ['Blaze banner 1'],
  ['Undead_Banner'],
];

// Candidate merges awaiting owner confirmation. Nothing resolves through this.
// Shape: [...unresolvedSpellings, question]; the question names the candidates.
// New OCR spellings belong here first — promoting one into CONFIRMED_GROUPS is an
// identity decision, not a formatting one.
//
// Empty: the last Eden X2 questions (the decorated Kika spellings and Take Ur
// Shin) were answered on 2026-09-17 as family links, which live in
// contribution-weighting.js rather than here.
export const PENDING_GROUPS = Object.freeze([]);

// Pure and hot (every name lookup), so memoised; capped against free-text input.
const aliasKeyCache = new Map();

function aliasKey(name) {
  const input = String(name || '');
  const cached = aliasKeyCache.get(input);
  if (cached !== undefined) return cached;
  const result = input
    .normalize('NFC')
    .replace(/^(?:\s*(?:\((?:vts|vet|s)\)|(?:vts|vet|s)\)))+\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (aliasKeyCache.size >= 5000) aliasKeyCache.clear();
  aliasKeyCache.set(input, result);
  return result;
}

const confirmedAliases = new Map(
  CONFIRMED_GROUPS.flatMap(([canonical, ...aliases]) =>
    [canonical, ...aliases].map((alias) => [aliasKey(alias), canonical])
  )
);

// Aliases the admin teaches from the Accounts tab. They are stored in the player
// registry (`registry.playerAliases`) rather than in this file, so the alliance
// owner can say "we call Lady Zubbs just zubs" without a code change or a rules
// change, and so all names still resolve through this one authority.
//
// They are consulted BEFORE CONFIRMED_GROUPS, because that is the whole point of
// teaching one: a taught entry is a deliberate correction, and an entry that
// loses to a list compiled months earlier could not correct anything.
//
// The seeds are the abbreviations the owner gave in words, as a habit rather
// than a code change. Both also already hold in the shipped lists (MalakaKiji
// is a confirmed group), so they document the feature and give the admin list a
// starting point instead of an empty state.
export const SEEDED_PLAYER_ALIASES = Object.freeze([
  // The abbreviation the owner uses out loud, and the spelling the lists and the
  // OCR actually carry ("(Zubbs)" operates the Zubbs family account, whose X2
  // name is Lady Zubbs). Teaching one without the other would leave the
  // abbreviation resolving and the roster spelling not.
  Object.freeze({ alias: 'zubs', canonical: 'Lady Zubbs' }),
  Object.freeze({ alias: 'Zubbs', canonical: 'Lady Zubbs' }),
  Object.freeze({ alias: 'kiji', canonical: 'MalakaKiji' }),
]);
export const MAX_PLAYER_ALIASES = 200;

// Taught spellings arrive from an admin-edited document, so they get the same
// treatment as every other stored list: trimmed, length-capped, deduped by
// alias, and self-aliases dropped (teaching "kiji → kiji" would be a no-op that
// only makes the list longer).
export function normalizeTaughtPlayerAliases(values) {
  const seen = new Set();
  const out = [];
  (Array.isArray(values) ? values : []).forEach((entry) => {
    if (out.length >= MAX_PLAYER_ALIASES) return;
    const alias = String(entry?.alias ?? entry?.name ?? '')
      .normalize('NFC')
      .trim()
      .slice(0, 80);
    const canonical = String(entry?.canonical ?? entry?.canonicalName ?? '')
      .normalize('NFC')
      .trim()
      .slice(0, 80);
    const key = aliasKey(alias);
    if (!key || !canonical || key === aliasKey(canonical)) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ alias, canonical, createdAt: String(entry?.createdAt || '') });
  });
  return out;
}

const taughtAliases = new Map();

// Replaces the taught list with the seeded defaults plus whatever the current
// registry carries. Called by player-registry.js whenever a registry becomes
// current, so the taught entries always describe the registry in force and
// every caller resolves through this one map.
export function setTaughtPlayerAliases(values) {
  taughtAliases.clear();
  [...SEEDED_PLAYER_ALIASES, ...normalizeTaughtPlayerAliases(values)].forEach((entry) => {
    taughtAliases.set(aliasKey(entry.alias), entry.canonical);
  });
  return taughtAliases.size;
}

setTaughtPlayerAliases([]);

// Resolution order: a taught alias, then the confirmed groups. A taught entry
// wins over the confirmed list on purpose — see the note above.
export function resolveConfirmedPlayerAlias(name) {
  const key = aliasKey(name);
  if (!key) return '';
  const taught = taughtAliases.get(key);
  if (taught) return taught;
  return confirmedAliases.get(key) || '';
}

// Most account keys ignore decorations, but these two accounts differ only by them.
export function protectedVtsAccountKey(name, fallbackKey) {
  return resolveConfirmedPlayerAlias(name) === '꧁༺ Kika ༻꧂' ? 'kikaalt' : fallbackKey;
}
