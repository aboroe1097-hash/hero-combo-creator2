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
    'Growth from each player’s baseline to their final upload, ranked by Total Power growth %. Until the final upload lands, the sign-up record is compared instead. Ties are broken by absolute growth.',
  competitionBoardPublished: 'Updated {date}',
  competitionBoardWinnersTitle: 'The Standing',
  competitionBoardStandingsTitle: 'Standings',
  competitionBoardRank: 'Rank',
  competitionBoardPlayer: 'Player',
  competitionBoardGrowthPct: 'Growth %',
  competitionBoardGrowthAbs: 'Growth',
  competitionBoardBaseline: 'Baseline',
  competitionBoardLastSeason: 'Last season data',
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
    '{count} players are not ranked: they have no valid final upload in the window.',
  competitionBoardEmpty: 'The growth board will appear after the final upload window closes.',
  competitionBoardNoOptInResults: 'No opted-in final uploads are ready yet.',
  competitionBoardNoResults: 'No player matches your search.',
  competitionBoardValuesPrivate: 'Values private',
  competitionBoardDetail: 'Full comparison',
  competitionBoardCategory: 'Category',
  competitionBoardNow: 'Final upload',
  competitionBoardChange: 'Change',
  competitionBoardChangePct: 'Change %',
  competitionBoardTotalChange: 'Total power change',
  competitionBoardNoTroopChange: 'Without troops',
  competitionBoardBiggestDriver: 'Biggest driver',
  competitionBoardBaselineNoteSignup: 'Baseline: the Competition #12 sign-up record.',
  competitionBoardBaselineNoteVtsScore: 'Last season data: an earlier VtsScore upload.',
  competitionBoardBaselineNoteAliveOnly:
    'Last season data: an earlier record without a dead-troop split. Later records include dead troops in Troop and Total power.',
  competitionBoardFinalNoteSignup:
    'Now: the Competition #12 sign-up record; the final upload replaces it when its window opens.',
  competitionBoardStepBaselineSignup: 'Last season → Sign-up',
  competitionBoardStepSignupReupload: 'Sign-up → Final upload',
  competitionBoardStepBaselineReupload: 'Last season → Final upload',
  competitionBoardHistory: 'Upload history',
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
      'النمو من خط الأساس لكل لاعب إلى رفعه النهائي، مرتبًا بنسبة نمو القوة الكلية. حتى وصول الرفع النهائي، يُقارَن سجل التسجيل بدلًا منه. تُكسر التعادلات بالنمو المطلق.',
    competitionBoardPublished: 'آخر تحديث {date}',
    competitionBoardWinnersTitle: 'الترتيب',
    competitionBoardStandingsTitle: 'الترتيب',
    competitionBoardRank: 'المرتبة',
    competitionBoardPlayer: 'اللاعب',
    competitionBoardGrowthPct: 'نسبة النمو',
    competitionBoardGrowthAbs: 'النمو',
    competitionBoardBaseline: 'خط الأساس',
    competitionBoardLastSeason: 'بيانات الموسم الماضي',
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
      '{count} لاعبين غير مصنَّفين: ليس لديهم رفع نهائي صالح في النافذة.',
    competitionBoardEmpty: 'ستظهر لوحة النمو بعد إغلاق نافذة الرفع النهائي.',
    competitionBoardNoOptInResults: 'لا توجد رفعات نهائية مُختارة بعد.',
    competitionBoardNoResults: 'لا يوجد لاعب يطابق بحثك.',
    competitionBoardValuesPrivate: 'القيم خاصة',
    competitionBoardDetail: 'المقارنة الكاملة',
    competitionBoardCategory: 'الفئة',
    competitionBoardNow: 'الرفع النهائي',
    competitionBoardChange: 'التغيير',
    competitionBoardChangePct: 'نسبة التغيير',
    competitionBoardTotalChange: 'تغيير القوة الإجمالية',
    competitionBoardNoTroopChange: 'بدون القوات',
    competitionBoardBiggestDriver: 'أكبر محرّك',
    competitionBoardBaselineNoteSignup: 'خط الأساس: سجل التسجيل في المسابقة رقم 12.',
    competitionBoardBaselineNoteVtsScore: 'بيانات الموسم الماضي: رفع VtsScore سابق.',
    competitionBoardBaselineNoteAliveOnly:
      'بيانات الموسم الماضي: سجل سابق بدون تفصيل القوات المفقودة. السجلات اللاحقة تشمل القوات المفقودة في قوة القوات والقوة الكلية.',
    competitionBoardFinalNoteSignup:
      'الآن: سجل التسجيل في المسابقة رقم 12؛ ويحل الرفع النهائي محله عند فتح نافذته.',
    competitionBoardStepBaselineSignup: 'الموسم الماضي → التسجيل',
    competitionBoardStepSignupReupload: 'التسجيل → الرفع النهائي',
    competitionBoardStepBaselineReupload: 'الموسم الماضي → الرفع النهائي',
    competitionBoardHistory: 'سجل الرفع',
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
      'Crecimiento desde la base de cada jugador hasta su subida final, ordenado por el % de crecimiento de la Poder total. Hasta que llegue la subida final, se compara en su lugar el registro de inscripción. Los empates se rompen por crecimiento absoluto.',
    competitionBoardPublished: 'Actualizada el {date}',
    competitionBoardWinnersTitle: 'La clasificación',
    competitionBoardStandingsTitle: 'Clasificación',
    competitionBoardRank: 'Puesto',
    competitionBoardPlayer: 'Jugador',
    competitionBoardGrowthPct: '% de crecimiento',
    competitionBoardGrowthAbs: 'Crecimiento',
    competitionBoardBaseline: 'Base',
    competitionBoardLastSeason: 'Datos de la temporada pasada',
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
      '{count} jugadores no están clasificados: no tienen una subida final válida en la ventana.',
    competitionBoardEmpty:
      'La tabla de crecimiento aparecerá cuando se cierre la ventana de la subida final.',
    competitionBoardNoOptInResults: 'Aún no hay subidas finales autorizadas.',
    competitionBoardNoResults: 'Ningún jugador coincide con tu búsqueda.',
    competitionBoardValuesPrivate: 'Valores privados',
    competitionBoardDetail: 'Comparación completa',
    competitionBoardCategory: 'Categoría',
    competitionBoardNow: 'Subida final',
    competitionBoardChange: 'Cambio',
    competitionBoardChangePct: '% de cambio',
    competitionBoardTotalChange: 'Cambio del poder total',
    competitionBoardNoTroopChange: 'Sin tropas',
    competitionBoardBiggestDriver: 'Mayor impulsor',
    competitionBoardBaselineNoteSignup: 'Base: el registro de inscripción de la Competición #12.',
    competitionBoardBaselineNoteVtsScore:
      'Datos de la temporada pasada: una subida anterior de VtsScore.',
    competitionBoardBaselineNoteAliveOnly:
      'Datos de la temporada pasada: un registro anterior sin desglose de tropas muertas. Los registros posteriores incluyen tropas muertas en Poder de tropas y Poder total.',
    competitionBoardFinalNoteSignup:
      'Ahora: el registro de inscripción de la Competición #12; la subida final lo reemplaza cuando se abre su ventana.',
    competitionBoardStepBaselineSignup: 'Temporada pasada → Inscripción',
    competitionBoardStepSignupReupload: 'Inscripción → Subida final',
    competitionBoardStepBaselineReupload: 'Temporada pasada → Subida final',
    competitionBoardHistory: 'Historial de subidas',
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
      'Crescimento da base de cada jogador até ao seu envio final, ordenada pela % de crescimento do Poder Total. Até o envio final chegar, compara-se o registo de inscrição. Os empates decidem-se pelo crescimento absoluto.',
    competitionBoardPublished: 'Atualizado em {date}',
    competitionBoardWinnersTitle: 'A classificação',
    competitionBoardStandingsTitle: 'Classificação',
    competitionBoardRank: 'Posição',
    competitionBoardPlayer: 'Jogador',
    competitionBoardGrowthPct: '% de crescimento',
    competitionBoardGrowthAbs: 'Crescimento',
    competitionBoardBaseline: 'Base',
    competitionBoardLastSeason: 'Dados da temporada passada',
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
      '{count} jogadores não estão classificados: não têm um envio final válido na janela.',
    competitionBoardEmpty:
      'O quadro de crescimento aparecerá quando a janela do envio final fechar.',
    competitionBoardNoOptInResults: 'Ainda não há envios finais aprovados.',
    competitionBoardNoResults: 'Nenhum jogador corresponde à sua busca.',
    competitionBoardValuesPrivate: 'Valores privados',
    competitionBoardDetail: 'Comparação completa',
    competitionBoardCategory: 'Categoria',
    competitionBoardNow: 'Envio final',
    competitionBoardChange: 'Mudança',
    competitionBoardChangePct: '% de mudança',
    competitionBoardTotalChange: 'Mudança do poder total',
    competitionBoardNoTroopChange: 'Sem tropas',
    competitionBoardBiggestDriver: 'Maior impulsionador',
    competitionBoardBaselineNoteSignup: 'Base: o registo de inscrição da Competição #12.',
    competitionBoardBaselineNoteVtsScore: 'Dados da temporada passada: um envio anterior do VtsScore.',
    competitionBoardBaselineNoteAliveOnly:
      'Dados da temporada passada: um registo anterior sem detalhe de tropas mortas. Os registos seguintes incluem tropas mortas no Poder de tropas e no Poder Total.',
    competitionBoardFinalNoteSignup:
      'Agora: o registo de inscrição da Competição #12; o envio final substitui-o quando a sua janela abrir.',
    competitionBoardStepBaselineSignup: 'Temporada passada → Inscrição',
    competitionBoardStepSignupReupload: 'Inscrição → Envio final',
    competitionBoardStepBaselineReupload: 'Temporada passada → Envio final',
    competitionBoardHistory: 'Histórico de envios',
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
      'Croissance de la base de chaque joueur jusqu’à son envoi final, classée par le % de croissance de la Puissance totale. Tant que l’envoi final n’est pas là, c’est le bulletin d’inscription qui est comparé. Les égalités sont départagées par la croissance absolue.',
    competitionBoardPublished: 'Mis à jour le {date}',
    competitionBoardWinnersTitle: 'Le classement',
    competitionBoardStandingsTitle: 'Classement',
    competitionBoardRank: 'Rang',
    competitionBoardPlayer: 'Joueur',
    competitionBoardGrowthPct: 'Croissance %',
    competitionBoardGrowthAbs: 'Croissance',
    competitionBoardBaseline: 'Référence',
    competitionBoardLastSeason: 'Données de la saison dernière',
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
      '{count} joueurs ne sont pas classés : ils n’ont pas d’envoi final valide dans la fenêtre.',
    competitionBoardEmpty:
      'Le tableau de croissance apparaîtra à la fermeture de la fenêtre de l’envoi final.',
    competitionBoardNoOptInResults: 'Aucun envoi final autorisé pour le moment.',
    competitionBoardNoResults: 'Aucun joueur ne correspond à votre recherche.',
    competitionBoardValuesPrivate: 'Valeurs privées',
    competitionBoardDetail: 'Comparaison complète',
    competitionBoardCategory: 'Catégorie',
    competitionBoardNow: 'Envoi final',
    competitionBoardChange: 'Variation',
    competitionBoardChangePct: '% de variation',
    competitionBoardTotalChange: 'Variation de la puissance totale',
    competitionBoardNoTroopChange: 'Sans troupes',
    competitionBoardBiggestDriver: 'Principal moteur',
    competitionBoardBaselineNoteSignup: 'Base : le bulletin d’inscription à la Compétition #12.',
    competitionBoardBaselineNoteVtsScore: 'Données de la saison dernière : un envoi VtsScore antérieur.',
    competitionBoardBaselineNoteAliveOnly:
      'Données de la saison dernière : un enregistrement antérieur sans détail des troupes mortes. Les enregistrements suivants incluent les troupes mortes dans la Puissance de troupes et la Puissance totale.',
    competitionBoardFinalNoteSignup:
      'Maintenant : le bulletin d’inscription à la Compétition #12 ; l’envoi final le remplacera à l’ouverture de sa fenêtre.',
    competitionBoardStepBaselineSignup: 'Saison dernière → Inscription',
    competitionBoardStepSignupReupload: 'Inscription → Envoi final',
    competitionBoardStepBaselineReupload: 'Saison dernière → Envoi final',
    competitionBoardHistory: 'Historique des envois',
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
      'Wachstum von der Basis jedes Spielers bis zu seinem finalen Upload, sortiert nach dem Wachstum der Gesamtkampfkraft in %. Bis der finale Upload vorliegt, wird stattdessen der Anmeldedatensatz verglichen. Gleichstand wird nach absolutem Wachstum aufgelöst.',
    competitionBoardPublished: 'Aktualisiert am {date}',
    competitionBoardWinnersTitle: 'Die Platzierung',
    competitionBoardStandingsTitle: 'Rangliste',
    competitionBoardRank: 'Rang',
    competitionBoardPlayer: 'Spieler',
    competitionBoardGrowthPct: 'Wachstum %',
    competitionBoardGrowthAbs: 'Wachstum',
    competitionBoardBaseline: 'Ausgangswert',
    competitionBoardLastSeason: 'Daten der letzten Saison',
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
      '{count} Spieler sind nicht platziert: Sie haben keinen gültigen finalen Upload im Fenster.',
    competitionBoardEmpty:
      'Die Wachstumstafel erscheint, sobald das Fenster für den finalen Upload geschlossen ist.',
    competitionBoardNoOptInResults: 'Noch keine freigegebenen finalen Uploads vorhanden.',
    competitionBoardNoResults: 'Kein Spieler passt zu deiner Suche.',
    competitionBoardValuesPrivate: 'Werte privat',
    competitionBoardDetail: 'Vollständiger Vergleich',
    competitionBoardCategory: 'Kategorie',
    competitionBoardNow: 'Finaler Upload',
    competitionBoardChange: 'Veränderung',
    competitionBoardChangePct: 'Veränderung %',
    competitionBoardTotalChange: 'Veränderung der Gesamtmacht',
    competitionBoardNoTroopChange: 'Ohne Truppen',
    competitionBoardBiggestDriver: 'Größter Treiber',
    competitionBoardBaselineNoteSignup: 'Basis: der Anmeldedatensatz der Competition #12.',
    competitionBoardBaselineNoteVtsScore: 'Daten der letzten Saison: ein früherer VtsScore-Upload.',
    competitionBoardBaselineNoteAliveOnly:
      'Daten der letzten Saison: ein früherer Datensatz ohne Aufteilung der toten Truppen. Spätere Datensätze enthalten tote Truppen in Truppenstärke und Gesamtkampfkraft.',
    competitionBoardFinalNoteSignup:
      'Jetzt: der Anmeldedatensatz der Competition #12; der finale Upload ersetzt ihn, sobald sein Fenster öffnet.',
    competitionBoardStepBaselineSignup: 'Letzte Saison → Anmeldung',
    competitionBoardStepSignupReupload: 'Anmeldung → Finaler Upload',
    competitionBoardStepBaselineReupload: 'Letzte Saison → Finaler Upload',
    competitionBoardHistory: 'Upload-Verlauf',
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
  hr: Object.freeze({
    competitionBoardTitle: 'Ploča rasta Natjecanja #12',
    competitionBoardIntro:
      'Rast od osnovice svakog igrača do njegovog završnog unosa, rangirano po postotku rasta Ukupne snage. Dok završni unos ne stigne, uspoređuje se zapis prijave. Izjednačeni rezultati rješavaju se apsolutnim rastom.',
    competitionBoardPublished: 'Ažurirano {date}',
    competitionBoardWinnersTitle: 'Poredak',
    competitionBoardStandingsTitle: 'Poredak',
    competitionBoardRank: 'Mjesto',
    competitionBoardPlayer: 'Igrač',
    competitionBoardGrowthPct: 'Rast %',
    competitionBoardGrowthAbs: 'Rast',
    competitionBoardBaseline: 'Osnovica',
    competitionBoardLastSeason: 'Podaci prošle sezone',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'Raniji VtsScore',
    competitionBoardSourceSignup: 'Prijava',
    competitionBoardSearch: 'Pretraži igrače',
    competitionBoardSearchPlaceholder: 'Ime igrača',
    competitionBoardSortBy: 'Sortiraj po',
    competitionBoardSortPct: 'Rast %',
    competitionBoardSortAbs: 'Rast',
    competitionBoardSortName: 'Ime',
    competitionBoardShowing: 'Prikazano {shown} od {total}',
    competitionBoardConsentNote:
      'Ovdje se pojavljuju samo igrači koji su pristali na javnu usporedbu. Svi ostali ostaju izvan ploče.',
    competitionBoardNotRanked:
      '{count} igrača nije rangirano: nemaju valjan završni unos u razdoblju.',
    competitionBoardEmpty:
      'Tablica rasta pojavit će se nakon zatvaranja razdoblja završnog unosa.',
    competitionBoardNoOptInResults: 'Još nema odobrenih završnih unosa.',
    competitionBoardNoResults: 'Nijedan igrač ne odgovara tvojoj pretrazi.',
    competitionBoardValuesPrivate: 'Vrijednosti privatne',
    competitionBoardDetail: 'Potpuna usporedba',
    competitionBoardCategory: 'Kategorija',
    competitionBoardNow: 'Završni unos',
    competitionBoardChange: 'Promjena',
    competitionBoardChangePct: 'Promjena %',
    competitionBoardTotalChange: 'Promjena ukupne moći',
    competitionBoardNoTroopChange: 'Bez postrojbi',
    competitionBoardBiggestDriver: 'Najveći pokretač',
    competitionBoardBaselineNoteSignup: 'Osnovica: zapis prijave za Natjecanje #12.',
    competitionBoardBaselineNoteVtsScore: 'Podaci prošle sezone: raniji VtsScore unos.',
    competitionBoardBaselineNoteAliveOnly:
      'Podaci prošle sezone: raniji zapis bez podjele mrtvih postrojbi. Kasniji zapisi uključuju mrtve postrojbe u Snagu postrojbi i Ukupnu snagu.',
    competitionBoardFinalNoteSignup:
      'Sada: zapis prijave za natjecanje #12; završni unos ga zamjenjuje kad se njegovo razdoblje otvori.',
    competitionBoardStepBaselineSignup: 'Prošla sezona → Prijava',
    competitionBoardStepSignupReupload: 'Prijava → Završni unos',
    competitionBoardStepBaselineReupload: 'Prošla sezona → Završni unos',
    competitionBoardHistory: 'Povijest unosa',
    competitionBoardTied: 'Izjednačeno',
    competitionBoardFieldTotal: 'Ukupna moć',
    competitionBoardFieldTroop: 'Moć postrojbi',
    competitionBoardFieldBuilding: 'Moć zgrada',
    competitionBoardFieldTechnology: 'Moć tehnologije',
    competitionBoardFieldHero: 'Borbena moć heroja',
    competitionBoardFieldDragon: 'Moć zmaja',
    competitionBoardFieldUnitSpecialty: 'Moć specijalizacije jedinica',
    competitionBoardFieldArtifact: 'Moć artefakata',
    competitionBoardFieldRoyalTech: 'Moć kraljevske tehnologije',
  }),
  id: Object.freeze({
    competitionBoardTitle: 'Papan pertumbuhan Kompetisi #12',
    competitionBoardIntro:
      'Pertumbuhan dari baseline setiap pemain hingga unggahan final, diurutkan berdasarkan % pertumbuhan Total Power. Sampai unggahan final tiba, catatan pendaftaran yang dibandingkan. Peringkat seri diputus dengan pertumbuhan absolut.',
    competitionBoardPublished: 'Diperbarui {date}',
    competitionBoardWinnersTitle: 'Klasemen',
    competitionBoardStandingsTitle: 'Klasemen',
    competitionBoardRank: 'Peringkat',
    competitionBoardPlayer: 'Pemain',
    competitionBoardGrowthPct: 'Pertumbuhan %',
    competitionBoardGrowthAbs: 'Pertumbuhan',
    competitionBoardBaseline: 'Baseline',
    competitionBoardLastSeason: 'Data musim lalu',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'VtsScore sebelumnya',
    competitionBoardSourceSignup: 'Pendaftaran',
    competitionBoardSearch: 'Cari pemain',
    competitionBoardSearchPlaceholder: 'Nama pemain',
    competitionBoardSortBy: 'Urutkan berdasarkan',
    competitionBoardSortPct: 'Pertumbuhan %',
    competitionBoardSortAbs: 'Pertumbuhan',
    competitionBoardSortName: 'Nama',
    competitionBoardShowing: 'Menampilkan {shown} dari {total}',
    competitionBoardConsentNote:
      'Hanya pemain yang menyetujui perbandingan publik yang muncul di sini. Semua pemain lain tetap berada di luar papan.',
    competitionBoardNotRanked:
      '{count} pemain tidak berperingkat: tidak punya unggahan final yang sah di jendela waktu.',
    competitionBoardEmpty:
      'Papan pertumbuhan akan muncul setelah jendela unggahan final ditutup.',
    competitionBoardNoOptInResults: 'Belum ada unggahan final yang disetujui.',
    competitionBoardNoResults: 'Tidak ada pemain yang cocok dengan pencarianmu.',
    competitionBoardValuesPrivate: 'Nilai pribadi',
    competitionBoardDetail: 'Perbandingan lengkap',
    competitionBoardCategory: 'Kategori',
    competitionBoardNow: 'Unggahan final',
    competitionBoardChange: 'Perubahan',
    competitionBoardChangePct: 'Perubahan %',
    competitionBoardTotalChange: 'Perubahan Total Power',
    competitionBoardNoTroopChange: 'Tanpa pasukan',
    competitionBoardBiggestDriver: 'Pendorong terbesar',
    competitionBoardBaselineNoteSignup: 'Baseline: catatan pendaftaran Kompetisi #12.',
    competitionBoardBaselineNoteVtsScore: 'Data musim lalu: unggahan VtsScore sebelumnya.',
    competitionBoardBaselineNoteAliveOnly:
      'Data musim lalu: catatan sebelumnya tanpa rincian pasukan mati. Catatan berikutnya menyertakan pasukan mati pada Kekuatan pasukan dan Total Power.',
    competitionBoardFinalNoteSignup:
      'Sekarang: catatan pendaftaran Kompetisi #12; unggahan final menggantikannya saat jendelanya dibuka.',
    competitionBoardStepBaselineSignup: 'Musim lalu → Pendaftaran',
    competitionBoardStepSignupReupload: 'Pendaftaran → Unggahan final',
    competitionBoardStepBaselineReupload: 'Musim lalu → Unggahan final',
    competitionBoardHistory: 'Riwayat unggahan',
    competitionBoardTied: 'Seri',
    competitionBoardFieldTotal: 'Total Power',
    competitionBoardFieldTroop: 'Troop Power',
    competitionBoardFieldBuilding: 'Building Power',
    competitionBoardFieldTechnology: 'Technology Power',
    competitionBoardFieldHero: 'Hero Combat Power',
    competitionBoardFieldDragon: 'Dragon Power',
    competitionBoardFieldUnitSpecialty: 'Unit Specialty Power',
    competitionBoardFieldArtifact: 'Artifact Power',
    competitionBoardFieldRoyalTech: 'Royal Tech Power',
  }),
  it: Object.freeze({
    competitionBoardTitle: 'Classifica di crescita della Competizione #12',
    competitionBoardIntro:
      'Crescita dalla base di ogni giocatore fino al suo caricamento finale, ordinata per la % di crescita della Potenza totale. Finché non arriva il caricamento finale, si confronta il registro di iscrizione. I pareggi si sciolgono con la crescita assoluta.',
    competitionBoardPublished: 'Aggiornata il {date}',
    competitionBoardWinnersTitle: 'La classifica',
    competitionBoardStandingsTitle: 'Classifica',
    competitionBoardRank: 'Posizione',
    competitionBoardPlayer: 'Giocatore',
    competitionBoardGrowthPct: 'Crescita %',
    competitionBoardGrowthAbs: 'Crescita',
    competitionBoardBaseline: 'Base',
    competitionBoardLastSeason: 'Dati della scorsa stagione',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'VtsScore precedente',
    competitionBoardSourceSignup: 'Iscrizione',
    competitionBoardSearch: 'Cerca giocatori',
    competitionBoardSearchPlaceholder: 'Nome del giocatore',
    competitionBoardSortBy: 'Ordina per',
    competitionBoardSortPct: 'Crescita %',
    competitionBoardSortAbs: 'Crescita',
    competitionBoardSortName: 'Nome',
    competitionBoardShowing: 'Mostrati {shown} di {total}',
    competitionBoardConsentNote:
      'Qui compaiono solo i giocatori che hanno accettato il confronto pubblico. Tutti gli altri restano fuori dalla classifica.',
    competitionBoardNotRanked:
      '{count} giocatori non sono classificati: non hanno un caricamento finale valido nella finestra.',
    competitionBoardEmpty:
      'La tabella della crescita apparirà alla chiusura della finestra del caricamento finale.',
    competitionBoardNoOptInResults: 'Nessun caricamento finale approvato al momento.',
    competitionBoardNoResults: 'Nessun giocatore corrisponde alla tua ricerca.',
    competitionBoardValuesPrivate: 'Valori privati',
    competitionBoardDetail: 'Confronto completo',
    competitionBoardCategory: 'Categoria',
    competitionBoardNow: 'Caricamento finale',
    competitionBoardChange: 'Variazione',
    competitionBoardChangePct: 'Variazione %',
    competitionBoardTotalChange: 'Variazione della potenza totale',
    competitionBoardNoTroopChange: 'Senza truppe',
    competitionBoardBiggestDriver: 'Fattore principale',
    competitionBoardBaselineNoteSignup: 'Base: il record di iscrizione alla Competizione #12.',
    competitionBoardBaselineNoteVtsScore:
      'Dati della scorsa stagione: un caricamento VtsScore precedente.',
    competitionBoardBaselineNoteAliveOnly:
      'Dati della scorsa stagione: un record precedente senza distinzione di truppe morte. I record successivi includono le truppe morte nella Potenza delle truppe e nella Potenza totale.',
    competitionBoardFinalNoteSignup:
      'Ora: il registro di iscrizione della Competizione #12; il caricamento finale lo sostituisce quando si apre la sua finestra.',
    competitionBoardStepBaselineSignup: 'Scorsa stagione → Iscrizione',
    competitionBoardStepSignupReupload: 'Iscrizione → Caricamento finale',
    competitionBoardStepBaselineReupload: 'Scorsa stagione → Caricamento finale',
    competitionBoardHistory: 'Cronologia caricamenti',
    competitionBoardTied: 'Parità',
    competitionBoardFieldTotal: 'Potere totale',
    competitionBoardFieldTroop: 'Potere delle truppe',
    competitionBoardFieldBuilding: 'Potere degli edifici',
    competitionBoardFieldTechnology: 'Potere della tecnologia',
    competitionBoardFieldHero: 'Potere di combattimento degli eroi',
    competitionBoardFieldDragon: 'Potere del drago',
    competitionBoardFieldUnitSpecialty: 'Potere della specialità delle unità',
    competitionBoardFieldArtifact: 'Potere degli artefatti',
    competitionBoardFieldRoyalTech: 'Potere della Tecnologia Reale',
  }),
  kr: Object.freeze({
    competitionBoardTitle: '대회 #12 성장 보드',
    competitionBoardIntro:
      '각 플레이어의 기준값부터 최종 업로드까지의 성장을 총 전투력 성장률 %로 순위 매깁니다. 최종 업로드가 들어올 때까지는 등록 기록을 대신 비교합니다. 동률은 절대 성장으로 가릅니다.',
    competitionBoardPublished: '업데이트: {date}',
    competitionBoardWinnersTitle: '순위',
    competitionBoardStandingsTitle: '순위',
    competitionBoardRank: '순위',
    competitionBoardPlayer: '플레이어',
    competitionBoardGrowthPct: '성장률',
    competitionBoardGrowthAbs: '성장',
    competitionBoardBaseline: '기준',
    competitionBoardLastSeason: '지난 시즌 데이터',
    competitionBoardSourceVtsScore: '2026 VtsScore',
    competitionBoardSourceVtsScorePrior: '이전 VtsScore',
    competitionBoardSourceSignup: '등록',
    competitionBoardSearch: '플레이어 검색',
    competitionBoardSearchPlaceholder: '플레이어 이름',
    competitionBoardSortBy: '정렬 기준',
    competitionBoardSortPct: '성장률',
    competitionBoardSortAbs: '성장',
    competitionBoardSortName: '이름',
    competitionBoardShowing: '전체 {total}명 중 {shown}명 표시',
    competitionBoardConsentNote:
      '공개 비교에 동의한 플레이어만 여기에 표시됩니다. 다른 모든 플레이어는 보드에서 제외됩니다.',
    competitionBoardNotRanked: '{count}명의 플레이어가 순위에 오르지 못했습니다: 해당 기간에 유효한 최종 업로드가 없습니다.',
    competitionBoardEmpty: '최종 업로드 기간이 끝나면 성장 보드가 표시됩니다.',
    competitionBoardNoOptInResults: '아직 동의한 최종 업로드가 없습니다.',
    competitionBoardNoResults: '검색과 일치하는 플레이어가 없습니다.',
    competitionBoardValuesPrivate: '값 비공개',
    competitionBoardDetail: '전체 비교',
    competitionBoardCategory: '카테고리',
    competitionBoardNow: '최종 업로드',
    competitionBoardChange: '변화',
    competitionBoardChangePct: '변화율',
    competitionBoardTotalChange: '총 전투력 변화',
    competitionBoardNoTroopChange: '병력 제외',
    competitionBoardBiggestDriver: '최대 요인',
    competitionBoardBaselineNoteSignup: '기준: 대회 #12 등록 기록.',
    competitionBoardBaselineNoteVtsScore: '지난 시즌 데이터: 이전 VtsScore 업로드입니다.',
    competitionBoardBaselineNoteAliveOnly:
      '지난 시즌 데이터: 전사 병력 구분이 없는 이전 기록입니다. 이후 기록에는 전투력과 총 전투력에 전사 병력이 포함됩니다.',
    competitionBoardFinalNoteSignup: '현재: 제12회 대회 등록 기록입니다. 최종 업로드가 해당 기간에 열리면 이를 대체합니다.',
    competitionBoardStepBaselineSignup: '지난 시즌 → 등록',
    competitionBoardStepSignupReupload: '등록 → 최종 업로드',
    competitionBoardStepBaselineReupload: '지난 시즌 → 최종 업로드',
    competitionBoardHistory: '업로드 내역',
    competitionBoardTied: '동점',
    competitionBoardFieldTotal: '총 전투력',
    competitionBoardFieldTroop: '병력 전투력',
    competitionBoardFieldBuilding: '건물 전투력',
    competitionBoardFieldTechnology: '기술 전투력',
    competitionBoardFieldHero: '영웅 전투력',
    competitionBoardFieldDragon: '드래곤 전투력',
    competitionBoardFieldUnitSpecialty: '병종 특화 전투력',
    competitionBoardFieldArtifact: '유물 전투력',
    competitionBoardFieldRoyalTech: '로열 테크 전투력',
  }),
  ru: Object.freeze({
    competitionBoardTitle: 'Таблица роста соревнования №12',
    competitionBoardIntro:
      'Рост от базы каждого игрока до финальной загрузки, ранжируется по % роста Общей силы. Пока финальная загрузка не загружена, сравнивается запись регистрации. При равенстве сравнивается абсолютный рост.',
    competitionBoardPublished: 'Обновлено {date}',
    competitionBoardWinnersTitle: 'Рейтинг',
    competitionBoardStandingsTitle: 'Рейтинг',
    competitionBoardRank: 'Место',
    competitionBoardPlayer: 'Игрок',
    competitionBoardGrowthPct: 'Рост %',
    competitionBoardGrowthAbs: 'Рост',
    competitionBoardBaseline: 'База',
    competitionBoardLastSeason: 'Данные прошлого сезона',
    competitionBoardSourceVtsScore: 'VtsScore 2026',
    competitionBoardSourceVtsScorePrior: 'Прежний VtsScore',
    competitionBoardSourceSignup: 'Регистрация',
    competitionBoardSearch: 'Найти игроков',
    competitionBoardSearchPlaceholder: 'Имя игрока',
    competitionBoardSortBy: 'Сортировать по',
    competitionBoardSortPct: 'Рост %',
    competitionBoardSortAbs: 'Рост',
    competitionBoardSortName: 'Имя',
    competitionBoardShowing: 'Показано {shown} из {total}',
    competitionBoardConsentNote:
      'Здесь отображаются только игроки, согласившиеся на публичное сравнение. Все остальные остаются за пределами таблицы.',
    competitionBoardNotRanked:
      '{count} игроков вне рейтинга: у них нет действительной финальной загрузки в окне.',
    competitionBoardEmpty:
      'Таблица роста появится после закрытия окна финальной загрузки.',
    competitionBoardNoOptInResults: 'Одобренных финальных загрузок пока нет.',
    competitionBoardNoResults: 'Ни один игрок не соответствует вашему поиску.',
    competitionBoardValuesPrivate: 'Значения скрыты',
    competitionBoardDetail: 'Полное сравнение',
    competitionBoardCategory: 'Категория',
    competitionBoardNow: 'Финальная загрузка',
    competitionBoardChange: 'Изменение',
    competitionBoardChangePct: 'Изменение %',
    competitionBoardTotalChange: 'Изменение общей силы',
    competitionBoardNoTroopChange: 'Без войск',
    competitionBoardBiggestDriver: 'Главный фактор',
    competitionBoardBaselineNoteSignup: 'База: запись регистрации на соревнование №12.',
    competitionBoardBaselineNoteVtsScore: 'Данные прошлого сезона: более ранняя загрузка VtsScore.',
    competitionBoardBaselineNoteAliveOnly:
      'Данные прошлого сезона: более ранняя запись без разделения погибших войск. В более поздних записях погибшие войска учтены в Силе войск и Общей силе.',
    competitionBoardFinalNoteSignup:
      'Сейчас: запись регистрации соревнования №12; финальная загрузка заменит её, когда откроется окно.',
    competitionBoardStepBaselineSignup: 'Прошлый сезон → Регистрация',
    competitionBoardStepSignupReupload: 'Регистрация → Финальная загрузка',
    competitionBoardStepBaselineReupload: 'Прошлый сезон → Финальная загрузка',
    competitionBoardHistory: 'История загрузок',
    competitionBoardTied: 'Ничья',
    competitionBoardFieldTotal: 'Общая сила',
    competitionBoardFieldTroop: 'Сила войск',
    competitionBoardFieldBuilding: 'Сила строений',
    competitionBoardFieldTechnology: 'Сила технологий',
    competitionBoardFieldHero: 'Боевая сила героев',
    competitionBoardFieldDragon: 'Сила дракона',
    competitionBoardFieldUnitSpecialty: 'Сила специализации войск',
    competitionBoardFieldArtifact: 'Сила артефактов',
    competitionBoardFieldRoyalTech: 'Сила королевских технологий',
  }),
  tr: Object.freeze({
    competitionBoardTitle: 'Yarışma #12 büyüme tablosu',
    competitionBoardIntro:
      'Her oyuncunun başlangıç değerinden nihai yüklemesine kadar büyüme, Toplam Güç büyüme yüzdesine göre sıralanır. Nihai yükleme gelene kadar kayıt kaydı karşılaştırılır. Eşitlikler mutlak büyümeyle çözülür.',
    competitionBoardPublished: '{date} tarihinde güncellendi',
    competitionBoardWinnersTitle: 'Sıralama',
    competitionBoardStandingsTitle: 'Sıralama',
    competitionBoardRank: 'Sıra',
    competitionBoardPlayer: 'Oyuncu',
    competitionBoardGrowthPct: 'Büyüme %',
    competitionBoardGrowthAbs: 'Büyüme',
    competitionBoardBaseline: 'Başlangıç',
    competitionBoardLastSeason: 'Geçen sezon verileri',
    competitionBoardSourceVtsScore: '2026 VtsScore',
    competitionBoardSourceVtsScorePrior: 'Önceki VtsScore',
    competitionBoardSourceSignup: 'Kayıt',
    competitionBoardSearch: 'Oyuncu ara',
    competitionBoardSearchPlaceholder: 'Oyuncu adı',
    competitionBoardSortBy: 'Şuna göre sırala',
    competitionBoardSortPct: 'Büyüme %',
    competitionBoardSortAbs: 'Büyüme',
    competitionBoardSortName: 'Ad',
    competitionBoardShowing: '{total} oyuncudan {shown} gösteriliyor',
    competitionBoardConsentNote:
      'Burada yalnızca herkese açık karşılaştırmayı kabul eden oyuncular görünür. Diğerleri tablonun dışında kalır.',
    competitionBoardNotRanked:
      '{count} oyuncu sıralamada değil: zaman aralığında geçerli nihai yüklemeleri yok.',
    competitionBoardEmpty:
      'Büyüme tablosu, nihai yükleme penceresi kapandıktan sonra görünecek.',
    competitionBoardNoOptInResults: 'Henüz onaylı nihai yükleme yok.',
    competitionBoardNoResults: 'Aramanızla eşleşen oyuncu yok.',
    competitionBoardValuesPrivate: 'Değerler gizli',
    competitionBoardDetail: 'Tam karşılaştırma',
    competitionBoardCategory: 'Kategori',
    competitionBoardNow: 'Nihai yükleme',
    competitionBoardChange: 'Değişim',
    competitionBoardChangePct: 'Değişim %',
    competitionBoardTotalChange: 'Toplam güç değişimi',
    competitionBoardNoTroopChange: 'Birlikler hariç',
    competitionBoardBiggestDriver: 'En büyük etken',
    competitionBoardBaselineNoteSignup: 'Başlangıç: Yarışma #12 kayıt kaydı.',
    competitionBoardBaselineNoteVtsScore: 'Geçen sezon verileri: daha eski bir VtsScore yüklemesi.',
    competitionBoardBaselineNoteAliveOnly:
      'Geçen sezon verileri: ölü asker ayrımı olmayan eski bir kayıt. Sonraki kayıtlarda ölü askerler Asker Gücü ve Toplam Güç içinde yer alır.',
    competitionBoardFinalNoteSignup:
      'Şimdi: 12. Yarışma kayıt kaydı; nihai yükleme, penceresi açıldığında onun yerini alır.',
    competitionBoardStepBaselineSignup: 'Geçen sezon → Kayıt',
    competitionBoardStepSignupReupload: 'Kayıt → Nihai yükleme',
    competitionBoardStepBaselineReupload: 'Geçen sezon → Nihai yükleme',
    competitionBoardHistory: 'Yükleme geçmişi',
    competitionBoardTied: 'Berabere',
    competitionBoardFieldTotal: 'Toplam güç',
    competitionBoardFieldTroop: 'Birlik gücü',
    competitionBoardFieldBuilding: 'Bina gücü',
    competitionBoardFieldTechnology: 'Teknoloji gücü',
    competitionBoardFieldHero: 'Kahraman savaş gücü',
    competitionBoardFieldDragon: 'Dragon gücü',
    competitionBoardFieldUnitSpecialty: 'Birim uzmanlık gücü',
    competitionBoardFieldArtifact: 'Eser gücü',
    competitionBoardFieldRoyalTech: 'Kraliyet Teknoloji gücü',
  }),
  zh: Object.freeze({
    competitionBoardTitle: '第12届比赛成长榜',
    competitionBoardIntro: '从每位玩家的基准值到最终上传的成长，按总战力成长率%排名。在最终上传到达之前，改为比较报名记录。平局以绝对成长决出。',
    competitionBoardPublished: '更新于 {date}',
    competitionBoardWinnersTitle: '排名',
    competitionBoardStandingsTitle: '排名',
    competitionBoardRank: '名次',
    competitionBoardPlayer: '玩家',
    competitionBoardGrowthPct: '成长率',
    competitionBoardGrowthAbs: '成长',
    competitionBoardBaseline: '基准',
    competitionBoardLastSeason: '上赛季数据',
    competitionBoardSourceVtsScore: '2026 VtsScore',
    competitionBoardSourceVtsScorePrior: '以往 VtsScore',
    competitionBoardSourceSignup: '报名',
    competitionBoardSearch: '搜索玩家',
    competitionBoardSearchPlaceholder: '玩家名称',
    competitionBoardSortBy: '排序方式',
    competitionBoardSortPct: '成长率',
    competitionBoardSortAbs: '成长',
    competitionBoardSortName: '名称',
    competitionBoardShowing: '显示 {shown} / {total}',
    competitionBoardConsentNote: '此处仅显示同意公开比较的玩家。其他玩家不会出现在榜单中。',
    competitionBoardNotRanked: '{count} 名玩家未排名：他们在窗口期内没有有效的最终上传。',
    competitionBoardEmpty: '最终上传窗口关闭后将显示成长榜。',
    competitionBoardNoOptInResults: '暂无已同意的最终上传。',
    competitionBoardNoResults: '没有玩家与你的搜索匹配。',
    competitionBoardValuesPrivate: '数值保密',
    competitionBoardDetail: '完整比较',
    competitionBoardCategory: '类别',
    competitionBoardNow: '最终上传',
    competitionBoardChange: '变化',
    competitionBoardChangePct: '变化率',
    competitionBoardTotalChange: '总战力变化',
    competitionBoardNoTroopChange: '不含部队',
    competitionBoardBiggestDriver: '最大驱动因素',
    competitionBoardBaselineNoteSignup: '基准：第12届比赛报名记录。',
    competitionBoardBaselineNoteVtsScore: '上赛季数据：较早的 VtsScore 上传。',
    competitionBoardBaselineNoteAliveOnly: '上赛季数据：较早的记录没有阵亡部队区分。后续记录在部队战力和总战力中包含阵亡部队。',
    competitionBoardFinalNoteSignup: '当前：第12届比赛报名记录；最终上传在其窗口开启时取代它。',
    competitionBoardStepBaselineSignup: '上赛季 → 报名',
    competitionBoardStepSignupReupload: '报名 → 最终上传',
    competitionBoardStepBaselineReupload: '上赛季 → 最终上传',
    competitionBoardHistory: '上传历史',
    competitionBoardTied: '平局',
    competitionBoardFieldTotal: '总战力',
    competitionBoardFieldTroop: '部队战力',
    competitionBoardFieldBuilding: '建筑战力',
    competitionBoardFieldTechnology: '科技战力',
    competitionBoardFieldHero: '英雄战力',
    competitionBoardFieldDragon: '龙战力',
    competitionBoardFieldUnitSpecialty: '兵种专精战力',
    competitionBoardFieldArtifact: '神器战力',
    competitionBoardFieldRoyalTech: '皇家科技战力',
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
        const baseline = finite(entry?.baseline);
        const final = finite(entry?.final);
        if (baseline === null && final === null) continue;
        fields[field] = {
          baseline,
          final,
          abs: finite(entry?.abs),
          pct: finite(entry?.pct),
        };
      }
      const uploads = (Array.isArray(row?.uploads) ? row.uploads : [])
        .slice(0, 12)
        .map((upload) => {
          const uploadedAt = finite(upload?.uploadedAt);
          const values = {};
          for (const [field] of FIELDS) {
            const value = finite(upload?.values?.[field]);
            if (value === null) continue;
            values[field] = value;
          }
          return {
            seasonId: cleanText(upload?.seasonId, 40),
            uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : 0,
            values,
          };
        })
        .filter((upload) => Object.keys(upload.values).length > 0);
      const normalizeValues = (values) => {
        if (!values || typeof values !== 'object') return null;
        const out = {};
        for (const [field] of FIELDS) {
          const value = finite(values[field]);
          if (value !== null) out[field] = value;
        }
        return Object.keys(out).length ? out : null;
      };
      const normalizeStep = (step) => {
        if (!step || typeof step !== 'object') return null;
        const fields = {};
        for (const [field] of FIELDS) {
          const entry = step.fields?.[field];
          if (!entry) continue;
          fields[field] = { abs: finite(entry.abs), pct: finite(entry.pct) };
        }
        return {
          growthAbs: finite(step.growthAbs),
          growthPct: finite(step.growthPct),
          fields,
        };
      };
      return {
        rank: Number.isInteger(row?.rank) && row.rank > 0 ? row.rank : null,
        gameName,
        baselineSource: BASELINE_SOURCES.has(row?.baselineSource) ? row.baselineSource : 'signup',
        baselineAliveOnly: row?.baselineAliveOnly === true,
        finalSource:
          row?.finalSource === 'signup' || row?.finalSource === 'reupload'
            ? row.finalSource
            : null,
        waypoints: {
          signup: normalizeValues(row?.waypoints?.signup),
          reupload: normalizeValues(row?.waypoints?.reupload),
        },
        steps: {
          baselineToSignup: normalizeStep(row?.steps?.baselineToSignup),
          signupToReupload: normalizeStep(row?.steps?.signupToReupload),
          baselineToReupload: normalizeStep(row?.steps?.baselineToReupload),
        },
        growthPct: finite(row?.growthPct),
        growthAbs: finite(row?.growthAbs),
        fields,
        uploads,
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
    num: (value) => (value === null || value === undefined ? '—' : numberFormat.format(value)),
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

/**
 * The full comparison for one player: where each category started, where it is
 * now, and how far it moved. Rendered as a <details> so the standings stay
 * scannable, and as a summary + table so a member without a re-upload yet can
 * still see the baseline they will be measured from.
 */
function detailHtml(row, text, format) {
  const entries = FIELDS.filter(([field]) => row.fields[field]).map(([field, key]) => [
    field,
    key,
    row.fields[field],
  ]);
  if (!entries.length) return '';
  const hasGrowth = Number.isFinite(row.growthAbs);
  const nonTroopAbs = entries
    .filter(([field]) => field !== 'troopPower' && field !== 'totalCastlePower')
    .reduce((sum, [, , entry]) => sum + (Number.isFinite(entry.abs) ? entry.abs : 0), 0);
  const driver = entries
    .filter(([field, , entry]) => field !== 'totalCastlePower' && Number.isFinite(entry.abs))
    .reduce(
      (best, candidate) =>
        Math.abs(candidate[2].abs) > Math.abs(best?.[2].abs ?? 0) ? candidate : best,
      null
    );
  const cards = hasGrowth
    ? `<div class="comp-board__cards">
        <article class="comp-board__card" data-tone="${tone(row.growthAbs)}">
          <span>${esc(text('competitionBoardTotalChange'))}</span>
          <strong>${esc(format.abs(row.growthAbs))}</strong>
          <small>${esc(format.pct(row.growthPct))}</small>
        </article>
        <article class="comp-board__card" data-tone="${tone(nonTroopAbs)}">
          <span>${esc(text('competitionBoardNoTroopChange'))}</span>
          <strong>${esc(format.abs(nonTroopAbs))}</strong>
        </article>
        ${
          driver
            ? `<article class="comp-board__card">
                <span>${esc(text('competitionBoardBiggestDriver'))}</span>
                <strong>${esc(text(driver[1]))}</strong>
                <small>${esc(format.abs(driver[2].abs))}</small>
              </article>`
            : ''
        }
      </div>`
    : '';
  // Value columns: last season's upload (or the sign-up when there is no
  // earlier record), then today's sign-up and the final upload when each
  // exists. One change column per pair of waypoints, so a player with all
  // three sees last season to sign-up, sign-up to final upload and last season
  // to final upload.
  const signup = row.waypoints?.signup || null;
  const reupload = row.waypoints?.reupload || null;
  const baselineKey =
    row.baselineSource === 'signup' ? 'competitionBoardSourceSignup' : 'competitionBoardLastSeason';
  const valueColumns = [{ key: baselineKey, get: (entry) => entry.baseline }];
  if (signup) {
    valueColumns.push({
      key: 'competitionBoardSourceSignup',
      get: (entry, field) => signup[field] ?? null,
    });
  }
  if (reupload) {
    valueColumns.push({
      key: 'competitionBoardNow',
      get: (entry, field) => reupload[field] ?? null,
    });
  } else if (!signup) {
    valueColumns.push({ key: 'competitionBoardNow', get: (entry) => entry.final });
  }
  const steps = [
    ['baselineToSignup', 'competitionBoardStepBaselineSignup'],
    ['signupToReupload', 'competitionBoardStepSignupReupload'],
    [
      'baselineToReupload',
      row.baselineSource === 'signup'
        ? 'competitionBoardStepSignupReupload'
        : 'competitionBoardStepBaselineReupload',
    ],
  ]
    .map(([key, labelKey]) => ({ labelKey, step: row.steps?.[key] || null }))
    .filter((item) => item.step);
  const body = entries
    .map(([field, key, entry]) => {
      const valueCells = valueColumns
        .map((column) => `<td>${esc(format.num(column.get(entry, field)))}</td>`)
        .join('');
      const stepCells = steps
        .map(({ step }) => {
          const stepEntry = step.fields?.[field];
          return `<td data-tone="${tone(stepEntry?.abs ?? null)}">${esc(
            format.abs(stepEntry?.abs ?? null)
          )}<br><small>${esc(format.pct(stepEntry?.pct ?? null))}</small></td>`;
        })
        .join('');
      return `<tr>
        <th scope="row">${esc(text(key))}</th>
        ${valueCells}${stepCells}
      </tr>`;
    })
    .join('');
  const noteKey = row.baselineAliveOnly
    ? 'competitionBoardBaselineNoteAliveOnly'
    : row.baselineSource === 'signup'
      ? 'competitionBoardBaselineNoteSignup'
      : 'competitionBoardBaselineNoteVtsScore';
  const finalNote =
    row.finalSource === 'signup'
      ? `<p class="comp-board__detail-note">${esc(text('competitionBoardFinalNoteSignup'))}</p>`
      : '';
  return `<details class="comp-board__detail">
    <summary>${esc(text('competitionBoardDetail'))}</summary>
    ${cards}
    <div class="comp-board__detail-scroll">
      <table class="comp-board__detail-table">
        <thead><tr>
          <th scope="col">${esc(text('competitionBoardCategory'))}</th>
          ${valueColumns
            .map((column) => `<th scope="col">${esc(text(column.key))}</th>`)
            .join('')}
          ${steps
            .map(({ labelKey }) => `<th scope="col">${esc(text(labelKey))}</th>`)
            .join('')}
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <p class="comp-board__detail-note">${esc(text(noteKey))}</p>
    ${finalNote}
  </details>`;
}

/** Every upload this name ever had, newest first. */
function historyHtml(row, text, format) {
  const uploads = Array.isArray(row.uploads) ? row.uploads : [];
  if (!uploads.length) return '';
  const items = uploads
    .map((upload) => {
      const iso =
        Number.isFinite(upload.uploadedAt) && upload.uploadedAt > 0
          ? new Date(upload.uploadedAt).toISOString()
          : '';
      const total = upload.values?.totalCastlePower ?? null;
      const when = iso
        ? `<time datetime="${esc(iso)}">${esc(format.date(iso))}</time>`
        : esc(upload.seasonId || text('competitionBoardSourceVtsScorePrior'));
      return `<li>${when} — ${esc(format.abs(total))}</li>`;
    })
    .join('');
  return `<details class="comp-board__history">
    <summary>${esc(text('competitionBoardHistory'))}</summary>
    <ul>${items}</ul>
  </details>`;
}

/** The table body for the current search/sort state. */
export function buildCompetitionBoardRowsHtml(rows, text, format) {
  return rows
    .map((row) => {
      // The comparison is a seven-column table of its own, so it opens as a
      // full-width row under the player instead of squeezing into the name
      // cell (where it forced the whole standings to scroll sideways).
      const expandable = `${detailHtml(row, text, format)}${historyHtml(row, text, format)}`;
      return `<tr class="comp-board__player-row">
      <td class="comp-board__rank" data-label="${esc(text('competitionBoardRank'))}">${esc(row.rank ?? '—')}</td>
      <th scope="row" class="comp-board__name" data-label="${esc(text('competitionBoardPlayer'))}">
        <span dir="auto">${esc(row.gameName)}</span>
        <span class="comp-board__chip">${esc(
          text(SOURCE_LABEL_KEYS[row.baselineSource] || 'competitionBoardSourceSignup')
        )}</span>
      </th>
      <td class="comp-board__num" data-label="${esc(text('competitionBoardGrowthPct'))}" data-tone="${tone(row.growthPct)}">${esc(format.pct(row.growthPct))}</td>
      <td class="comp-board__num" data-label="${esc(text('competitionBoardGrowthAbs'))}" data-tone="${tone(row.growthAbs)}">${esc(format.abs(row.growthAbs))}</td>
    </tr>${
      expandable
        ? `<tr class="comp-board__detail-row"><td colspan="4">${expandable}</td></tr>`
        : ''
    }`;
    })
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
