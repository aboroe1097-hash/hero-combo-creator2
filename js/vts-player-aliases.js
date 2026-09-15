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
  ['** Loony **', '**Loony**', '**Loony **'],
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
  ['REDBULLS', 'REDBULL§', 'REDBULL$', 'Rebull'],
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
  ['La Scimmia', 'Scimmia'],
  ['Neutrino10', 'Neutrino'],

  // --- separations: accounts that must never be folded together ------------
  // Common ownership is not aliasing. Each of these is its own game account,
  // and several were being merged into their owner before this file existed.
  ['꧁ Kika ꧂', '꧁Kika꧂'],
  ['꧁༺ Kika ༻꧂', '꧁༺Kika༻꧂', '༺ Kika ༻', '༺Kika༻', '≪Kika≫'],
  ['꧁ Kika-banner ꧂', 'Kika-banner', '꧁Kika-banner꧂'],
  ['꧁Kika-banner2꧂', 'Kika-banner2', '꧁ Kika-banner2 ꧂'],
  ['DvD18'],
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
  ['q. Immortal', 'q. Immortalis'],
  ['qImmortal.Banner', 'qmmortal.Banner'],
  ['Liskylli banner'],
  ['AK Чапай-baner'],
  ['Blaze banner 1'],
  ['blaze banner 2'],
  ['Undead_Banner'],
];

// Candidate merges awaiting owner confirmation. Nothing resolves through this.
// Shape: [...unresolvedSpellings, question]; the question names the candidates.
// New OCR spellings belong here first — promoting one into CONFIRMED_GROUPS is an
// identity decision, not a formatting one.
//
// Eden X2 audit (2026-09-15): each of these currently earns its credit for nobody,
// and each has more than one plausible owner, so guessing would move real points
// into the wrong player's score.
export const PENDING_GROUPS = Object.freeze([
  ['Immortal', 'Banner duty name (3 banners): q. Immortal, or qImmortal.Banner?'],
  [
    'Red',
    'Banner duty name (3 banners, and "Boii & red"): REDBULLS, RedBull#2, RedBull#3, or someone else?',
  ],
  ['DVD181', 'DVD', 'Banner and pather duty names ("Kika + DVD181"): DvD18, or DvD18 x2?'],
  ['AK', 'Pather and shield wall duty name: AK Чапай, as "@Ivan (АК Чапай)" suggests?'],
  ['Loony 1', 'Pather duty name: ** Loony **, Little Loony, or Loony Banner?'],
  ['Bone', 'Pather duty name: BoneSmoker, or BONEfastBANNER?'],
  ['Blaze', 'Pather and shield wall duty name: Blaze banner 1, or blaze banner 2?'],
  ['Kiji', 'Pather duty name: MalakaKiji?'],
  ['Zubbs', 'Operator in "(Zubbs)" duty notes: is this the account Lady Zubbs?'],
  [
    '𝒮𝒽𝒶𝓇𝒶 Kika 𝒮',
    '𝔖𝔖 Kika 𝔖𝔖',
    'Demolition names (78k): which Kika account, or a separate player?',
  ],
  [
    'MALAK ANDURIL',
    'The X1 registry maps this to MalakAdo, but it appears beside MalakAbo in the same X2 contribution lists, so they are two accounts. Which is which?',
  ],
]);

function aliasKey(name) {
  return String(name || '')
    .normalize('NFC')
    .replace(/^(?:\s*(?:\((?:vts|vet|s)\)|(?:vts|vet|s)\)))+\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const confirmedAliases = new Map(
  CONFIRMED_GROUPS.flatMap(([canonical, ...aliases]) =>
    [canonical, ...aliases].map((alias) => [aliasKey(alias), canonical])
  )
);

export function resolveConfirmedPlayerAlias(name) {
  return confirmedAliases.get(aliasKey(name)) || '';
}

// Most account keys ignore decorations, but these two accounts differ only by them.
export function protectedVtsAccountKey(name, fallbackKey) {
  return resolveConfirmedPlayerAlias(name) === '꧁༺ Kika ༻꧂' ? 'kikaalt' : fallbackKey;
}
