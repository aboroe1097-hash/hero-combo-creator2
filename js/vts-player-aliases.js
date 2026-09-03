// Exact-match account aliases for VTS admin name reconciliation.
//
// Two lists, and the distinction is the whole point of this file.
//
// CONFIRMED_GROUPS is active. It holds only two kinds of entry:
//   - variants that differ by decoration, whitespace or case alone, where the
//     letters are identical and no identity judgement is involved;
//   - separations: groups that exist to keep accounts APART, so that
//     decoration-stripping elsewhere cannot fold an alt or a banner account
//     into its owner.
//
// PENDING_GROUPS is inert. It holds candidate merges where the letters differ,
// so deciding they are one account is a judgement only the alliance owner can
// make. They are recorded here rather than in a side document so the question
// travels with the code, but nothing resolves through them.
//
// Why the split matters: these names feed weighted contribution scoring. Fold
// two real accounts together and their demolition points collapse into one
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
  ['Anne', '↑Anne ↑', 'ˆ Anne ˆ', '^ Anne ^', '^Anne^', '^Anne ^'],
  ['!!WAEL!!', '!!WAEL !!', '!! WAEL !!'],
  ['=THOR=', '__=THOR=__', '___=THOR=___'],
  ['BiG BOiiE', 'BIG BOiiE'],
  ['Victoria', '~Victoria~'],
  ['IDN Dragon.Gold', "IDN'Dragon.Gold", 'IDNÓDragon.Gold'],
  ['Nosferatu', '~Nosferatu~', '✨Nosferatu✨'],

  // --- aliases the previous rules already carried --------------------------
  ['Moldo1313', 'Moldo'],
  ['D O F F Y', 'D offy.', 'D off y.', 'Doffy.', 'D off.y.', 'D o f f y.', 'D off f y.'],
  ['Molly', '*Molly*'],
  ['Jjamaica pete', 'jJamaica pete'],
  ['terrible ivan', 'terribile ivan'],
  ['CoBoP', 'СоБоР'],
  ['REDBULLS', 'REDBULL§'],
  ['IKIGAI', 'ɪᴋɪɢᴀɪ'],
  ['DEAD END', 'ØDEAD ENDØ'],
  ['ANGEL', 'ΛNGEL', 'ΛNGƎL', 'ANGƎL'],

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
  ['qmmortal.Banner'],
  ['Undead_Banner'],
];

// Candidate merges awaiting owner confirmation. Nothing resolves through this.
// Shape: [suggestedCanonical, ...variants, question].
export const PENDING_GROUPS = Object.freeze([
  ['Dobby', 'Дobby', 'Đobby', 'One account across Latin D, Cyrillic Д and Đ?'],
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
    'Eight homoglyph spellings — one account? Two of them scored an identical 21,586 in the same Aug 30 06:19 city attack, so that screenshot needs checking before either row counts.',
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
    'Shared Made3110 suffix but the prefixes differ entirely — one account or several?',
  ],
  [
    '乃ㄥ口毛',
    '乃亖口毛',
    '乃ム口毛',
    '乃ㄥ毛',
    '乃口毛',
    '乃⊂口毛',
    '乃毛',
    'OCR errors for one account? The two-character fragments are the risky ones.',
  ],
  ['пупОк', 'πηnOk', 'ηηOk', 'пynOk', 'πυπΟκ', 'Greek/Cyrillic mixes — all one account?'],
  ['Kika2.0', '~Kika2.0~', '°Kika2.0°', 'Kika2.0²', 'Is Kika2.0² this account or a separate alt?'],
  [
    'Shabir',
    '□Shabir□',
    '□○Shabir□',
    '□oShabiro□',
    'Which spelling is canonical? □oShabiro□ came from a bad extraction.',
  ],
  ['Moshieee', 'Moshiieee', 'Moshieeee', 'OCR letter-count variants, or different accounts?'],
  ['Dr Thund€r', 'Dr Thundër', 'Same account?'],
  ['MasterVj', '∾~MasterVjpe∾', 'Same account?'],
  ['!!! Юляша !!!', '!!! Юлляша !!!', 'Doubled-letter OCR error?'],
  ['Орша 2025', 'Opwa 2025', 'Opsha 2025', 'Opua 2025', 'All one account?'],
  ['$OL€MAST€R', '$OL€MASTER', 'Same account?'],
  [
    'Ar Ran ★_YG+62',
    'Ar Ran Dil☆+62',
    'Ar Ran Dil⭐+62',
    'A renamed account — which name is canonical?',
  ],
  ['Hunter killer.', 'һаттер killer.', 'OCR error for this player?'],
  ['M@$T€€~BANNER', 'M@S$€₹~BANNER', 'M@$€₹~BANNER', 'Same banner account? Full name still needed.'],
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
