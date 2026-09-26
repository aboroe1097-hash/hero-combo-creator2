// js/competition-board.js
//
// The member-facing Competition #12 growth board.
//
// It renders the consent-filtered projection returned by the vtsScore Function.
// This module never sees raw power values and never adds any.
//
// renderCompetitionBoard() is pure DOM rendering with no Firebase; the page
// supplies a translator t(key, vars) and a locale. Any key the page does not
// translate falls back to COMPETITION_BOARD_COPY for the locale, then English.
// loadCompetitionBoard() is the one read, handed the page's db and Firestore
// API so this module does not pull in the SDK.

import '../css/competition-board.css';

export const COMPETITION_BOARD_PATH = 'boh_allstar_competition/board';
const MAX_ROWS = 200;
const MAX_WINNERS = 20;
// 'vtsscore-prior' comes from the server build (functions/src/competition-board.js)
// when a player's latest earlier upload is from a season other than 2026.
const BASELINE_SOURCES = new Set(['vtsscore-2026', 'vtsscore-prior', 'signup']);
const SOURCE_LABEL_KEYS = Object.freeze({
  'vtsscore-2026': 'competitionBoardSourceVtsScore',
  'vtsscore-prior': 'competitionBoardSourceVtsScorePrior',
  signup: 'competitionBoardSourceSignup',
});

const FIELDS = Object.freeze([
  ['totalCastlePower', 'competitionBoardFieldTotal'],
  ['troopPower', 'competitionBoardFieldTroop'],
  ['buildingPower', 'competitionBoardFieldBuilding'],
  ['technologyPower', 'competitionBoardFieldTechnology'],
  ['heroCombatPower', 'competitionBoardFieldHero'],
  ['dragonPower', 'competitionBoardFieldDragon'],
  ['unitSpecialtyPower', 'competitionBoardFieldUnitSpecialty'],
  ['artifactPower', 'competitionBoardFieldArtifact'],
  ['royalTechPower', 'competitionBoardFieldRoyalTech'],
]);

export const COMPETITION_BOARD_COPY_EN = Object.freeze({
  competitionBoardTitle: 'Competition #12 growth board',
  competitionBoardIntro:
    'Growth from each player’s baseline to their re-upload, ranked by Total Power growth %. Ties are broken by absolute growth.',
  competitionBoardPublished: 'Updated {date}',
  competitionBoardWinnersTitle: 'Winners',
  competitionBoardStandingsTitle: 'Standings',
  competitionBoardRank: 'Rank',
  competitionBoardPlayer: 'Player',
  competitionBoardGrowthPct: 'Growth %',
  competitionBoardGrowthAbs: 'Growth',
  competitionBoardBaseline: 'Baseline',
  competitionBoardSourceVtsScore: '2026 VtsScore',
  competitionBoardSourceVtsScorePrior: 'Earlier VtsScore',
  competitionBoardSourceSignup: 'Sign-up',
  competitionBoardSearch: 'Search players',
  competitionBoardSearchPlaceholder: 'Player name',
  competitionBoardSortBy: 'Sort by',
  competitionBoardSortPct: 'Growth %',
  competitionBoardSortAbs: 'Growth',
  competitionBoardSortName: 'Name',
  competitionBoardShowing: 'Showing {shown} of {total}',
  competitionBoardConsentNote:
    'Only players who agreed to a public comparison appear here. Everyone else stays off the board.',
  competitionBoardNotRanked:
    '{count} players are not ranked: they have no valid re-upload in the window.',
  competitionBoardEmpty: 'The growth board has not been published yet.',
  competitionBoardNoOptInResults: 'No opted-in re-uploads are ready yet.',
  competitionBoardNoResults: 'No player matches your search.',
  competitionBoardValuesPrivate: 'Values private',
  competitionBoardBreakdown: 'Power breakdown',
  competitionBoardTied: 'Tied',
  competitionBoardFieldTotal: 'Total power',
  competitionBoardFieldTroop: 'Troop power',
  competitionBoardFieldBuilding: 'Building power',
  competitionBoardFieldTechnology: 'Technology power',
  competitionBoardFieldHero: 'Hero combat power',
  competitionBoardFieldDragon: 'Dragon power',
  competitionBoardFieldUnitSpecialty: 'Unit specialty power',
  competitionBoardFieldArtifact: 'Artifact power',
  competitionBoardFieldRoyalTech: 'Royal Tech power',
});

export const COMPETITION_BOARD_COPY = Object.freeze({
  en: COMPETITION_BOARD_COPY_EN,
  ar: Object.freeze({
    competitionBoardTitle: 'لوحة نمو المسابقة رقم 12',
    competitionBoardIntro:
      'النمو من خط أساس كل لاعب حتى إعادة الرفع، مرتبًا حسب نسبة نمو القوة الإجمالية. عند التعادل يُحتسب النمو المطلق.',
    competitionBoardPublished: 'آخر تحديث {date}',
    competitionBoardWinnersTitle: 'الفائزون',
    competitionBoardStandingsTitle: 'الترتيب',
    competitionBoardRank: 'المرتبة',
    competitionBoardPlayer: 'اللاعب',
    competitionBoardGrowthPct: 'نسبة النمو',
    competitionBoardGrowthAbs: 'النمو',
    competitionBoardBaseline: 'خط الأساس',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'VtsScore سابق',
    competitionBoardSourceSignup: 'التسجيل',
    competitionBoardSearch: 'ابحث عن لاعب',
    competitionBoardSearchPlaceholder: 'اسم اللاعب',
    competitionBoardSortBy: 'ترتيب حسب',
    competitionBoardSortPct: 'نسبة النمو',
    competitionBoardSortAbs: 'النمو',
    competitionBoardSortName: 'الاسم',
    competitionBoardShowing: 'عرض {shown} من {total}',
    competitionBoardConsentNote:
      'يظهر هنا فقط اللاعبون الذين وافقوا على المقارنة العلنية. ولا تظهر بيانات الآخرين.',
    competitionBoardNotRanked:
      '{count} لاعبين غير مصنَّفين: ليس لديهم إعادة رفع صالحة ضمن النافذة.',
    competitionBoardEmpty: 'لم تُنشر لوحة النمو بعد.',
    competitionBoardNoOptInResults: 'لا توجد بعد عمليات إعادة رفع جاهزة للمشاركة علنًا.',
    competitionBoardNoResults: 'لا يوجد لاعب يطابق بحثك.',
    competitionBoardValuesPrivate: 'القيم خاصة',
    competitionBoardBreakdown: 'تفاصيل القوة',
    competitionBoardTied: 'تعادل',
    competitionBoardFieldTotal: 'القوة الإجمالية',
    competitionBoardFieldTroop: 'قوة القوات',
    competitionBoardFieldBuilding: 'قوة المباني',
    competitionBoardFieldTechnology: 'قوة التقنية',
    competitionBoardFieldHero: 'القوة القتالية للأبطال',
    competitionBoardFieldDragon: 'قوة التنين',
    competitionBoardFieldUnitSpecialty: 'قوة تخصص الوحدات',
    competitionBoardFieldArtifact: 'قوة القطع الأثرية',
    competitionBoardFieldRoyalTech: 'قوة التقنية الملكية',
  }),
  es: Object.freeze({
    competitionBoardTitle: 'Tabla de crecimiento de la Competición #12',
    competitionBoardIntro:
      'Crecimiento desde la base de cada jugador hasta su nueva subida, ordenado por % de crecimiento del Poder Total. Los empates se deciden por el crecimiento absoluto.',
    competitionBoardPublished: 'Actualizada el {date}',
    competitionBoardWinnersTitle: 'Ganadores',
    competitionBoardStandingsTitle: 'Clasificación',
    competitionBoardRank: 'Puesto',
    competitionBoardPlayer: 'Jugador',
    competitionBoardGrowthPct: '% de crecimiento',
    competitionBoardGrowthAbs: 'Crecimiento',
    competitionBoardBaseline: 'Base',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'VtsScore anterior',
    competitionBoardSourceSignup: 'Inscripción',
    competitionBoardSearch: 'Buscar jugadores',
    competitionBoardSearchPlaceholder: 'Nombre del jugador',
    competitionBoardSortBy: 'Ordenar por',
    competitionBoardSortPct: '% de crecimiento',
    competitionBoardSortAbs: 'Crecimiento',
    competitionBoardSortName: 'Nombre',
    competitionBoardShowing: 'Mostrando {shown} de {total}',
    competitionBoardConsentNote:
      'Solo aparecen los jugadores que aceptaron la comparación pública. Los demás no figuran en la tabla.',
    competitionBoardNotRanked:
      '{count} jugadores no están clasificados: no tienen una nueva subida válida dentro del plazo.',
    competitionBoardEmpty: 'La tabla de crecimiento aún no se ha publicado.',
    competitionBoardNoOptInResults: 'Aún no hay nuevas subidas públicas listas.',
    competitionBoardNoResults: 'Ningún jugador coincide con tu búsqueda.',
    competitionBoardValuesPrivate: 'Valores privados',
    competitionBoardBreakdown: 'Desglose de poder',
    competitionBoardTied: 'Empate',
    competitionBoardFieldTotal: 'Poder total',
    competitionBoardFieldTroop: 'Poder de tropas',
    competitionBoardFieldBuilding: 'Poder de edificios',
    competitionBoardFieldTechnology: 'Poder de tecnología',
    competitionBoardFieldHero: 'Poder de combate de héroes',
    competitionBoardFieldDragon: 'Poder del dragón',
    competitionBoardFieldUnitSpecialty: 'Poder de especialidad de unidades',
    competitionBoardFieldArtifact: 'Poder de artefactos',
    competitionBoardFieldRoyalTech: 'Poder de tecnología real',
  }),
  pt: Object.freeze({
    competitionBoardTitle: 'Quadro de crescimento da Competição #12',
    competitionBoardIntro:
      'Crescimento da base de cada jogador até o novo envio, ordenado pelo % de crescimento do Poder Total. Empates são decididos pelo crescimento absoluto.',
    competitionBoardPublished: 'Atualizado em {date}',
    competitionBoardWinnersTitle: 'Vencedores',
    competitionBoardStandingsTitle: 'Classificação',
    competitionBoardRank: 'Posição',
    competitionBoardPlayer: 'Jogador',
    competitionBoardGrowthPct: '% de crescimento',
    competitionBoardGrowthAbs: 'Crescimento',
    competitionBoardBaseline: 'Base',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'VtsScore anterior',
    competitionBoardSourceSignup: 'Inscrição',
    competitionBoardSearch: 'Buscar jogadores',
    competitionBoardSearchPlaceholder: 'Nome do jogador',
    competitionBoardSortBy: 'Ordenar por',
    competitionBoardSortPct: '% de crescimento',
    competitionBoardSortAbs: 'Crescimento',
    competitionBoardSortName: 'Nome',
    competitionBoardShowing: 'Mostrando {shown} de {total}',
    competitionBoardConsentNote:
      'Só aparecem os jogadores que aceitaram a comparação pública. Os demais ficam fora do quadro.',
    competitionBoardNotRanked:
      '{count} jogadores não estão classificados: não têm um novo envio válido dentro da janela.',
    competitionBoardEmpty: 'O quadro de crescimento ainda não foi publicado.',
    competitionBoardNoOptInResults: 'Ainda não há novos envios públicos prontos.',
    competitionBoardNoResults: 'Nenhum jogador corresponde à sua busca.',
    competitionBoardValuesPrivate: 'Valores privados',
    competitionBoardBreakdown: 'Detalhamento de poder',
    competitionBoardTied: 'Empate',
    competitionBoardFieldTotal: 'Poder total',
    competitionBoardFieldTroop: 'Poder das tropas',
    competitionBoardFieldBuilding: 'Poder dos edifícios',
    competitionBoardFieldTechnology: 'Poder de tecnologia',
    competitionBoardFieldHero: 'Poder de combate dos heróis',
    competitionBoardFieldDragon: 'Poder do dragão',
    competitionBoardFieldUnitSpecialty: 'Poder de especialidade de unidades',
    competitionBoardFieldArtifact: 'Poder de artefatos',
    competitionBoardFieldRoyalTech: 'Poder de tecnologia real',
  }),
  fr: Object.freeze({
    competitionBoardTitle: 'Tableau de croissance de la Compétition n°12',
    competitionBoardIntro:
      'Croissance entre la référence de chaque joueur et son nouvel envoi, classée par % de croissance de la Puissance totale. Les égalités sont départagées par la croissance absolue.',
    competitionBoardPublished: 'Mis à jour le {date}',
    competitionBoardWinnersTitle: 'Gagnants',
    competitionBoardStandingsTitle: 'Classement',
    competitionBoardRank: 'Rang',
    competitionBoardPlayer: 'Joueur',
    competitionBoardGrowthPct: 'Croissance %',
    competitionBoardGrowthAbs: 'Croissance',
    competitionBoardBaseline: 'Référence',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'VtsScore précédent',
    competitionBoardSourceSignup: 'Inscription',
    competitionBoardSearch: 'Rechercher des joueurs',
    competitionBoardSearchPlaceholder: 'Nom du joueur',
    competitionBoardSortBy: 'Trier par',
    competitionBoardSortPct: 'Croissance %',
    competitionBoardSortAbs: 'Croissance',
    competitionBoardSortName: 'Nom',
    competitionBoardShowing: '{shown} sur {total} affichés',
    competitionBoardConsentNote:
      'Seuls les joueurs ayant accepté la comparaison publique apparaissent ici. Les autres restent hors du tableau.',
    competitionBoardNotRanked:
      '{count} joueurs ne sont pas classés : ils n’ont pas de nouvel envoi valide dans la fenêtre.',
    competitionBoardEmpty: 'Le tableau de croissance n’a pas encore été publié.',
    competitionBoardNoOptInResults: 'Aucun nouvel envoi public n’est encore prêt.',
    competitionBoardNoResults: 'Aucun joueur ne correspond à votre recherche.',
    competitionBoardValuesPrivate: 'Valeurs privées',
    competitionBoardBreakdown: 'Détail de la puissance',
    competitionBoardTied: 'Égalité',
    competitionBoardFieldTotal: 'Puissance totale',
    competitionBoardFieldTroop: 'Puissance des troupes',
    competitionBoardFieldBuilding: 'Puissance des bâtiments',
    competitionBoardFieldTechnology: 'Puissance technologique',
    competitionBoardFieldHero: 'Puissance de combat des héros',
    competitionBoardFieldDragon: 'Puissance du dragon',
    competitionBoardFieldUnitSpecialty: 'Puissance de spécialité des unités',
    competitionBoardFieldArtifact: 'Puissance des artefacts',
    competitionBoardFieldRoyalTech: 'Puissance de la technologie royale',
  }),
  de: Object.freeze({
    competitionBoardTitle: 'Wachstumstafel Wettbewerb #12',
    competitionBoardIntro:
      'Wachstum vom Ausgangswert jedes Spielers bis zum erneuten Upload, sortiert nach Gesamtmacht-Wachstum in %. Bei Gleichstand entscheidet das absolute Wachstum.',
    competitionBoardPublished: 'Aktualisiert am {date}',
    competitionBoardWinnersTitle: 'Gewinner',
    competitionBoardStandingsTitle: 'Rangliste',
    competitionBoardRank: 'Rang',
    competitionBoardPlayer: 'Spieler',
    competitionBoardGrowthPct: 'Wachstum %',
    competitionBoardGrowthAbs: 'Wachstum',
    competitionBoardBaseline: 'Ausgangswert',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'Früherer VtsScore',
    competitionBoardSourceSignup: 'Anmeldung',
    competitionBoardSearch: 'Spieler suchen',
    competitionBoardSearchPlaceholder: 'Spielername',
    competitionBoardSortBy: 'Sortieren nach',
    competitionBoardSortPct: 'Wachstum %',
    competitionBoardSortAbs: 'Wachstum',
    competitionBoardSortName: 'Name',
    competitionBoardShowing: '{shown} von {total} angezeigt',
    competitionBoardConsentNote:
      'Hier erscheinen nur Spieler, die dem öffentlichen Vergleich zugestimmt haben. Alle anderen bleiben außerhalb der Tafel.',
    competitionBoardNotRanked:
      '{count} Spieler sind nicht gewertet: Sie haben keinen gültigen erneuten Upload im Zeitfenster.',
    competitionBoardEmpty: 'Die Wachstumstafel wurde noch nicht veröffentlicht.',
    competitionBoardNoOptInResults: 'Noch liegen keine öffentlichen erneuten Uploads vor.',
    competitionBoardNoResults: 'Kein Spieler passt zu deiner Suche.',
    competitionBoardValuesPrivate: 'Werte privat',
    competitionBoardBreakdown: 'Machtaufschlüsselung',
    competitionBoardTied: 'Gleichstand',
    competitionBoardFieldTotal: 'Gesamtmacht',
    competitionBoardFieldTroop: 'Truppenmacht',
    competitionBoardFieldBuilding: 'Gebäudemacht',
    competitionBoardFieldTechnology: 'Technologiemacht',
    competitionBoardFieldHero: 'Heldenkampfmacht',
    competitionBoardFieldDragon: 'Drachenmacht',
    competitionBoardFieldUnitSpecialty: 'Einheitenspezialisierungsmacht',
    competitionBoardFieldArtifact: 'Artefaktmacht',
    competitionBoardFieldRoyalTech: 'Königliche Technologiemacht',
  }),
});

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanText(value, max = 160) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .slice(0, max);
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function baseLanguage(locale) {
  return (
    String(locale || 'en')
      .toLowerCase()
      .split(/[-_]/u)[0] || 'en'
  );
}

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/gu, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
  );
}

/** A translator that prefers the page's t(), then the board copy, then English. */
export function createCompetitionBoardTranslator({ t, locale } = {}) {
  const copy = COMPETITION_BOARD_COPY[baseLanguage(locale)] || COMPETITION_BOARD_COPY_EN;
  return (key, vars = {}) => {
    if (typeof t === 'function') {
      const out = t(key, vars);
      if (typeof out === 'string' && out && out !== key) return out;
    }
    return interpolate(copy[key] ?? COMPETITION_BOARD_COPY_EN[key] ?? key, vars);
  };
}

/**
 * Accepts only the published shape, and caps it, so a malformed or oversized
 * document cannot break the page. Returns null when there is nothing to show.
 */
export function normalizeCompetitionBoard(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.rows)) return null;
  const rows = raw.rows
    .slice(0, MAX_ROWS)
    .map((row) => {
      const gameName = cleanText(row?.gameName);
      if (!gameName) return null;
      const fields = {};
      for (const [field] of FIELDS) {
        const entry = row?.fields?.[field];
        if (finite(entry?.abs) === null) continue;
        fields[field] = { abs: entry.abs, pct: finite(entry.pct) };
      }
      return {
        rank: Number.isInteger(row?.rank) && row.rank > 0 ? row.rank : null,
        gameName,
        baselineSource: BASELINE_SOURCES.has(row?.baselineSource) ? row.baselineSource : 'signup',
        growthPct: finite(row?.growthPct),
        growthAbs: finite(row?.growthAbs),
        fields,
      };
    })
    .filter(Boolean);
  const winners = (Array.isArray(raw.winners) ? raw.winners : [])
    .slice(0, MAX_WINNERS)
    .map((winner) => {
      const gameName = cleanText(winner?.gameName);
      if (!gameName || !Number.isInteger(winner?.rank)) return null;
      const out = { rank: winner.rank, gameName };
      if (finite(winner.growthPct) !== null) out.growthPct = winner.growthPct;
      if (finite(winner.growthAbs) !== null) out.growthAbs = winner.growthAbs;
      return out;
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank);
  const published = Date.parse(String(raw.updatedAt || raw.publishedAt || ''));
  return {
    seasonId: cleanText(raw.seasonId, 80),
    publishedAt: Number.isFinite(published) ? new Date(published).toISOString() : '',
    rows,
    winners,
    notRanked: Number.isInteger(raw.notRanked) && raw.notRanked > 0 ? raw.notRanked : 0,
  };
}

/** Filters by name and sorts; pure, for the table and its tests. */
export function filterAndSortBoardRows(rows, { query = '', sort = 'pct', locale = 'en' } = {}) {
  const needle = cleanText(query).toLowerCase();
  const list = (Array.isArray(rows) ? rows : []).filter(
    (row) => !needle || row.gameName.toLowerCase().includes(needle)
  );
  const byName = (left, right) =>
    left.gameName.localeCompare(right.gameName, locale, { sensitivity: 'base' });
  const byRank = (left, right) =>
    (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
  const desc = (key) => (left, right) =>
    (right[key] ?? Number.NEGATIVE_INFINITY) - (left[key] ?? Number.NEGATIVE_INFINITY);
  const compare =
    sort === 'name'
      ? byName
      : sort === 'abs'
        ? (left, right) =>
            desc('growthAbs')(left, right) || byRank(left, right) || byName(left, right)
        : (left, right) =>
            byRank(left, right) || desc('growthPct')(left, right) || byName(left, right);
  return [...list].sort(compare);
}

function formatters(locale) {
  let numberFormat;
  let percentFormat;
  try {
    numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    percentFormat = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
    percentFormat = new Intl.NumberFormat('en', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  const sign = (value) => (value > 0 ? '+' : '');
  return {
    abs: (value) => (value === null ? '—' : `${sign(value)}${numberFormat.format(value)}`),
    pct: (value) => (value === null ? '—' : `${sign(value)}${percentFormat.format(value)}%`),
    date: (iso) => {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return iso;
      }
    },
  };
}

function tone(value) {
  return value === null ? 'none' : value >= 0 ? 'up' : 'down';
}

function winnersHtml(board, text, format) {
  if (!board.winners.length) return '';
  const items = board.winners
    .map((winner) => {
      const hasValues = 'growthPct' in winner || 'growthAbs' in winner;
      const values = hasValues
        ? `<span class="comp-board__winner-pct" data-tone="${tone(winner.growthPct ?? null)}">${esc(format.pct(winner.growthPct ?? null))}</span>
           <span class="comp-board__winner-abs">${esc(format.abs(winner.growthAbs ?? null))}</span>`
        : `<span class="comp-board__winner-private">${esc(text('competitionBoardValuesPrivate'))}</span>`;
      return `<li class="comp-board__winner" data-place="${Math.min(winner.rank, 4)}">
        <span class="comp-board__medal" aria-hidden="true">${esc(winner.rank)}</span>
        <span class="comp-board__winner-name" dir="auto">${esc(winner.gameName)}</span>
        <span class="comp-board__visually-hidden">${esc(text('competitionBoardRank'))} ${esc(winner.rank)}</span>
        ${values}
      </li>`;
    })
    .join('');
  return `<section class="comp-board__podium" aria-labelledby="compBoardWinnersTitle">
    <h3 id="compBoardWinnersTitle">${esc(text('competitionBoardWinnersTitle'))}</h3>
    <ol class="comp-board__winners">${items}</ol>
  </section>`;
}

function breakdownHtml(row, text, format) {
  const entries = FIELDS.filter(([field]) => row.fields[field])
    .map(
      ([field, key]) => `<div class="comp-board__field">
        <dt>${esc(text(key))}</dt>
        <dd data-tone="${tone(row.fields[field].abs)}">${esc(format.abs(row.fields[field].abs))}
          <span>${esc(format.pct(row.fields[field].pct))}</span></dd>
      </div>`
    )
    .join('');
  if (!entries) return '';
  return `<details class="comp-board__breakdown">
    <summary>${esc(text('competitionBoardBreakdown'))}</summary>
    <dl>${entries}</dl>
  </details>`;
}

/** The table body for the current search/sort state. */
export function buildCompetitionBoardRowsHtml(rows, text, format) {
  return rows
    .map(
      (row) => `<tr>
      <td class="comp-board__rank" data-label="${esc(text('competitionBoardRank'))}">${esc(row.rank ?? '—')}</td>
      <th scope="row" class="comp-board__name" data-label="${esc(text('competitionBoardPlayer'))}">
        <span dir="auto">${esc(row.gameName)}</span>
        <span class="comp-board__chip">${esc(
          text(SOURCE_LABEL_KEYS[row.baselineSource] || 'competitionBoardSourceSignup')
        )}</span>
        ${breakdownHtml(row, text, format)}
      </th>
      <td class="comp-board__num" data-label="${esc(text('competitionBoardGrowthPct'))}" data-tone="${tone(row.growthPct)}">${esc(format.pct(row.growthPct))}</td>
      <td class="comp-board__num" data-label="${esc(text('competitionBoardGrowthAbs'))}" data-tone="${tone(row.growthAbs)}">${esc(format.abs(row.growthAbs))}</td>
    </tr>`
    )
    .join('');
}

const SORTS = Object.freeze([
  ['pct', 'competitionBoardSortPct'],
  ['abs', 'competitionBoardSortAbs'],
  ['name', 'competitionBoardSortName'],
]);

/** The whole board as HTML (pure); renderCompetitionBoard() adds behaviour. */
export function buildCompetitionBoardHtml(projection, { t, locale = 'en', state = {} } = {}) {
  const text = createCompetitionBoardTranslator({ t, locale });
  const format = formatters(locale);
  const board = normalizeCompetitionBoard(projection);
  const lang = baseLanguage(locale);
  const dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
  const head = `<header class="comp-board__head">
      <h2>${esc(text('competitionBoardTitle'))}</h2>
      <p>${esc(text('competitionBoardIntro'))}</p>
      ${board?.publishedAt ? `<p class="comp-board__meta">${esc(text('competitionBoardPublished', { date: format.date(board.publishedAt) }))}</p>` : ''}
    </header>`;
  if (!board || (!board.rows.length && !board.winners.length)) {
    const emptyKey = board?.seasonId ? 'competitionBoardNoOptInResults' : 'competitionBoardEmpty';
    return `<div class="comp-board" dir="${dir}" lang="${esc(lang)}">${head}
      <p class="comp-board__empty">${esc(text(emptyKey))}</p></div>`;
  }
  const sort = SORTS.some(([key]) => key === state.sort) ? state.sort : 'pct';
  const query = cleanText(state.query, 80);
  const visible = filterAndSortBoardRows(board.rows, { query, sort, locale });
  const sortButtons = SORTS.map(
    ([key, label]) =>
      `<button type="button" class="comp-board__sort" data-comp-board-sort="${key}" aria-pressed="${key === sort}">${esc(text(label))}</button>`
  ).join('');
  const ariaSort = (key) => (key === sort ? (key === 'name' ? 'ascending' : 'descending') : 'none');
  return `<div class="comp-board" dir="${dir}" lang="${esc(lang)}">
    ${head}
    ${winnersHtml(board, text, format)}
    <section class="comp-board__standings" aria-labelledby="compBoardStandingsTitle">
      <h3 id="compBoardStandingsTitle">${esc(text('competitionBoardStandingsTitle'))}</h3>
      <div class="comp-board__controls">
        <label class="comp-board__search">
          <span>${esc(text('competitionBoardSearch'))}</span>
          <input type="search" data-comp-board-search autocomplete="off" value="${esc(query)}" placeholder="${esc(text('competitionBoardSearchPlaceholder'))}">
        </label>
        <div class="comp-board__sorts" role="group" aria-label="${esc(text('competitionBoardSortBy'))}">${sortButtons}</div>
      </div>
      <p class="comp-board__count" data-comp-board-count aria-live="polite">${esc(
        text('competitionBoardShowing', { shown: visible.length, total: board.rows.length })
      )}</p>
      <div class="comp-board__table-wrap">
        <table class="comp-board__table">
          <thead><tr>
            <th scope="col">${esc(text('competitionBoardRank'))}</th>
            <th scope="col" aria-sort="${ariaSort('name')}">${esc(text('competitionBoardPlayer'))}</th>
            <th scope="col" aria-sort="${ariaSort('pct')}">${esc(text('competitionBoardGrowthPct'))}</th>
            <th scope="col" aria-sort="${ariaSort('abs')}">${esc(text('competitionBoardGrowthAbs'))}</th>
          </tr></thead>
          <tbody data-comp-board-rows>${buildCompetitionBoardRowsHtml(visible, text, format)}</tbody>
        </table>
      </div>
      <p class="comp-board__empty" data-comp-board-no-results ${visible.length ? 'hidden' : ''}>${esc(text('competitionBoardNoResults'))}</p>
    </section>
    <p class="comp-board__note">${esc(text('competitionBoardConsentNote'))}</p>
    ${board.notRanked ? `<p class="comp-board__note">${esc(text('competitionBoardNotRanked', { count: board.notRanked }))}</p>` : ''}
  </div>`;
}

/**
 * Renders the board into `container` and wires search and sorting. Returns an
 * object whose update(projection) re-renders with new data.
 */
export function renderCompetitionBoard(container, projection, { t, locale = 'en' } = {}) {
  if (!container) return null;
  const state = { sort: 'pct', query: '' };
  let current = projection;
  const text = createCompetitionBoardTranslator({ t, locale });
  const format = formatters(locale);

  function refreshRows() {
    const board = normalizeCompetitionBoard(current);
    if (!board) return;
    const visible = filterAndSortBoardRows(board.rows, { ...state, locale });
    const body = container.querySelector('[data-comp-board-rows]');
    if (body) body.innerHTML = buildCompetitionBoardRowsHtml(visible, text, format);
    const count = container.querySelector('[data-comp-board-count]');
    if (count) {
      count.textContent = text('competitionBoardShowing', {
        shown: visible.length,
        total: board.rows.length,
      });
    }
    const none = container.querySelector('[data-comp-board-no-results]');
    if (none) none.hidden = visible.length > 0;
    container.querySelectorAll('[data-comp-board-sort]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.compBoardSort === state.sort));
    });
  }

  function paint() {
    container.innerHTML = buildCompetitionBoardHtml(current, { t, locale, state });
    container.querySelector('[data-comp-board-search]')?.addEventListener('input', (event) => {
      state.query = String(event.target?.value || '');
      refreshRows();
    });
    container.querySelectorAll('[data-comp-board-sort]').forEach((button) => {
      button.addEventListener('click', () => {
        state.sort = button.dataset.compBoardSort;
        refreshRows();
      });
    });
  }

  paint();
  return {
    update(next) {
      current = next;
      paint();
    },
  };
}

/** Reads the published board; null when it does not exist yet. */
export async function loadCompetitionBoard({ db, firestore } = {}) {
  if (!db || typeof firestore?.doc !== 'function' || typeof firestore?.getDoc !== 'function') {
    throw new Error('Firestore is not available for the growth board.');
  }
  const snapshot = await firestore.getDoc(firestore.doc(db, COMPETITION_BOARD_PATH));
  const exists = typeof snapshot?.exists === 'function' ? snapshot.exists() : snapshot?.exists;
  return exists ? normalizeCompetitionBoard(snapshot.data()) : null;
}
