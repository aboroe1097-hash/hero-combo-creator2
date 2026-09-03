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

  // --- owner-confirmed merges (2026-09-03) ---------------------------------
  // Letters differ across these spellings, so they are identity calls rather
  // than decoration stripping. Confirmed by the alliance owner.
  ['Dobby', 'Дobby', 'Đobby'],
  ['FALLEN', 'FAllEN', 'FAILΞN', 'FAIΛN', 'FAIŁËN', 'FAIⅡΞN', 'FAIΛEN', 'FAIℓΞN', 'FAIŁN'],
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
  ],
  ['乃ㄥ口毛', '乃亖口毛', '乃ム口毛', '乃ㄥ毛', '乃口毛', '乃⊂口毛', '乃毛'],
  ['пупОк', 'πηnOk', 'ηηOk', 'пynOk', 'πυπΟκ'],
  ['Kika2.0', '~Kika2.0~', '°Kika2.0°', 'Kika2.0²'],
  ['Shabir', '□Shabir□', '□○Shabir□', '□oShabiro□'],
  ['Moshieee', 'Moshiieee', 'Moshieeee'],
  ['Dr Thund€r', 'Dr Thundër'],
  ['MasterVj', '∾~MasterVjpe∾'],
  ['!!! Юляша !!!', '!!! Юлляша !!!'],
  ['Орша 2025', 'Opwa 2025', 'Opsha 2025', 'Opua 2025'],
  ['$OL€MAST€R', '$OL€MASTER'],
  ['Ar Ran ★_YG+62', 'Ar Ran Dil☆+62', 'Ar Ran Dil⭐+62'],
  ['Hunter killer.', 'һаттер killer.'],
  ['M@$T€€~BANNER', 'M@S$€₹~BANNER', 'M@$€₹~BANNER'],

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
// Empty because the 2026-09-03 batch was confirmed in full. New OCR spellings
// belong here first — promoting one into CONFIRMED_GROUPS is an identity
// decision, not a formatting one.
export const PENDING_GROUPS = Object.freeze([]);

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
