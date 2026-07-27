import {
  ALL_STAR_BOH_SIGNUP_WINDOW,
  getAllStarBohCountdownParts,
  getAllStarBohSignupWindowState,
} from './all-star-boh-schedule.js';
import * as BohField from './all-star-boh-field.js';
import { buildBohCommandView } from './all-star-boh-command-view.js';
import {
  BOH_STAGE1_MILESTONES,
  BOH_STAGE1_PHASES,
  bohStage1Timeline,
} from './all-star-boh-plan.js';
import {
  BOH_TROOP_TIERS,
  BOH_TROOP_TYPES,
  buildBohTroopOcrRequest,
  mergeBohTroopOcrRows,
  parseBohTroopInventoryRow,
  parseBohTroopOcrResult,
  serializeBohTroopInventoryRow,
} from './all-star-boh-troop-ocr.js';

const REQUIRED_POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
]);
const OPTIONAL_POWER_FIELDS = Object.freeze(['artifactPower', 'royalTechPower']);
const POWER_FIELDS = Object.freeze([...REQUIRED_POWER_FIELDS, ...OPTIONAL_POWER_FIELDS]);

const SECTION_ORDER = Object.freeze(['signup', 'announcement', 'plan', 'schedule']);
const AVAILABILITY_VALUES = new Set(['all', 'most']);
const ROLE_VALUES = new Set(['flexible', 'offensive', 'rune', 'top', 'bottom']);
const FIGHTING_TIME_IDS = Object.freeze(['+12', '+14', '+16']);
const TROOP_ESTIMATE_FIELDS = Object.freeze([
  ['lofty', 'troopEstimateLofty'],
  ['enhanced-t10', 'troopEstimateEnhancedT10'],
  ['t10', 'troopEstimateT10'],
  ['t9', 'troopEstimateT9'],
]);
const HERO_SEASON_MILESTONES = Object.freeze(['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8']);
const EPIC_LANE_VALUES = Object.freeze(['south', 'center', 'north']);
const DEFAULT_EPIC_TIME_SLOT_IDS = Object.freeze([
  '+6',
  '+8',
  '+10',
  '+12',
  '+14',
  '+16',
  '+18',
  '+20',
]);
const EPIC_FLEXIBILITY_VALUES = Object.freeze(['change-roles', 'change-times', 'fixed']);
const TEAM_NAME_PREFERENCES = Object.freeze([
  'iron-wolves',
  'storm-ravens',
  'ember-lions',
  'frost-bears',
  'night-falcons',
  'thunder-bulls',
]);
const VERIFIED_RESEARCH_ART = Object.freeze({
  'rapid production': 3,
  'town development': 4,
  'basic combat': 5,
  'research legion i': 6,
  'class legion research': 7,
  'improved medical facilities': 8,
  'basic military': 9,
  'research legion ii': 10,
  'research legion iii': 11,
  'zone commemoration': 12,
  'zone conflict': 13,
  'footmen training': 14,
  'archer training': 15,
  'cavalry training': 16,
  'accessory production': 17,
  'master warfare': 18,
  'master city defence': 19,
  'defence legion research': 20,
  'advanced soldier training': 21,
  'imperial guards': 22,
  'guard rally': 23,
  'art of war - raid': 24,
  'art of war - defense': 25,
  'lofty warrior': 26,
  'raider legion': 27,
  'art of war - command': 28,
  'solid tactics': 29,
  'dragon blood blessing': 30,
  'lofty legion': 31,
});
const ALL_STAR_ICON_SPRITE =
  'data:image/webp;base64,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';
const PRIVATE_VALUE_KEY = /(?:imageData|base64|screenshot|dataUrl|file|blob)/iu;
const DEFAULT_ROLE_LABELS = Object.freeze({
  offensive: Object.freeze(['Offensive Team']),
  rune: Object.freeze(['Rune Team']),
  top: Object.freeze(['Top Side']),
  bottom: Object.freeze(['Bottom Side']),
  flexible: Object.freeze(['Flexible', 'Flexible - place me where needed']),
});
const DEFAULT_PHASE_LABELS = Object.freeze({
  'phase-0-5': Object.freeze(['0-5 Minutes', '0-5 min']),
  'phase-5-10': Object.freeze(['5-10 Minutes', '5-10 min']),
  'phase-10-15': Object.freeze(['10-15 Minutes', '10-15 min']),
  'phase-15-30': Object.freeze(['15-30 Minutes', '15-30 min']),
});
const controllers = new WeakMap();
const BOH_MAP_VIEWBOX = Object.freeze({ width: 972, height: 507 });
const OFFICIAL_EVENT_SCHEDULE = Object.freeze({
  status: 'official-fallback',
  eventStartsAt: '2026-07-31',
  milestones: Object.freeze([
    Object.freeze({ id: 'warm-up', label: 'Warm-up match', startsAt: '2026-07-31' }),
    Object.freeze({
      id: 'matchups',
      label: 'Group matchups announced (Aug 1-2)',
      startsAt: '2026-08-01',
    }),
    Object.freeze({ id: 'round-1', label: 'Round 1', startsAt: '2026-08-03' }),
    Object.freeze({ id: 'round-2', label: 'Round 2', startsAt: '2026-08-05' }),
    Object.freeze({ id: 'break', label: 'Tactics break (Aug 7-9)', startsAt: '2026-08-07' }),
    Object.freeze({ id: 'round-3', label: 'Round 3', startsAt: '2026-08-10' }),
    Object.freeze({ id: 'round-4', label: 'Round 4', startsAt: '2026-08-12' }),
    Object.freeze({ id: 'round-5', label: 'Round 5 - final group match', startsAt: '2026-08-14' }),
    Object.freeze({
      id: 'qualification',
      label: 'Qualification list (Aug 15-16)',
      startsAt: '2026-08-15',
    }),
  ]),
  teamGameTimes: Object.freeze([]),
});

const SIGNUP_WINDOW_COPY = Object.freeze({
  en: [
    'SIGNUP WINDOW',
    'Signups open in',
    'Signups close in',
    'Signups are closed',
    'Signup dates will be announced soon',
    'Leadership will publish the opening and closing times here.',
    'Opens {date}',
    'Open {opens} — closes {closes}',
    'Closed {date}',
    'days',
    'hours',
    'minutes',
    'seconds',
  ],
  ar: [
    'فترة التسجيل',
    'يفتح التسجيل خلال',
    'يغلق التسجيل خلال',
    'أُغلق التسجيل',
    'سيتم الإعلان عن مواعيد التسجيل قريبًا',
    'ستنشر القيادة وقتي فتح التسجيل وإغلاقه هنا.',
    'يفتح {date}',
    'مفتوح {opens} — يغلق {closes}',
    'أُغلق {date}',
    'يوم',
    'ساعة',
    'دقيقة',
    'ثانية',
  ],
  de: [
    'ANMELDEZEITRAUM',
    'Anmeldung öffnet in',
    'Anmeldung schließt in',
    'Anmeldung geschlossen',
    'Anmeldedaten werden bald bekannt gegeben',
    'Die Leitung veröffentlicht hier Öffnungs- und Schlusszeit.',
    'Öffnet {date}',
    'Offen {opens} — schließt {closes}',
    'Geschlossen {date}',
    'Tage',
    'Stunden',
    'Minuten',
    'Sekunden',
  ],
  es: [
    'PERÍODO DE INSCRIPCIÓN',
    'Las inscripciones abren en',
    'Las inscripciones cierran en',
    'Inscripciones cerradas',
    'Las fechas se anunciarán pronto',
    'El liderazgo publicará aquí la apertura y el cierre.',
    'Abre {date}',
    'Abre {opens} — cierra {closes}',
    'Cerró {date}',
    'días',
    'horas',
    'minutos',
    'segundos',
  ],
  fr: [
    'PÉRIODE D’INSCRIPTION',
    'Ouverture des inscriptions dans',
    'Clôture des inscriptions dans',
    'Inscriptions closes',
    'Les dates seront bientôt annoncées',
    'L’équipe dirigeante publiera ici les heures d’ouverture et de clôture.',
    'Ouverture {date}',
    'Ouvert {opens} — clôture {closes}',
    'Clôturé {date}',
    'jours',
    'heures',
    'minutes',
    'secondes',
  ],
  id: [
    'JADWAL PENDAFTARAN',
    'Pendaftaran dibuka dalam',
    'Pendaftaran ditutup dalam',
    'Pendaftaran ditutup',
    'Jadwal pendaftaran segera diumumkan',
    'Pimpinan akan menampilkan waktu buka dan tutup di sini.',
    'Buka {date}',
    'Buka {opens} — tutup {closes}',
    'Ditutup {date}',
    'hari',
    'jam',
    'menit',
    'detik',
  ],
  it: [
    'PERIODO DI ISCRIZIONE',
    'Le iscrizioni aprono tra',
    'Le iscrizioni chiudono tra',
    'Le iscrizioni sono chiuse',
    'Le date di iscrizione saranno annunciate a breve',
    'La leadership pubblicherà qui gli orari di apertura e chiusura.',
    'Apertura {date}',
    'Aperto {opens} — chiusura {closes}',
    'Chiuso {date}',
    'giorni',
    'ore',
    'minuti',
    'secondi',
  ],
  kr: [
    '가입 기간',
    '가입 시작까지',
    '가입 마감까지',
    '가입 마감',
    '가입 일정은 곧 안내됩니다',
    '운영진이 시작 및 마감 시간을 여기에 게시합니다.',
    '{date} 시작',
    '{opens} 시작 — {closes} 마감',
    '{date} 마감',
    '일',
    '시간',
    '분',
    '초',
  ],
  pt: [
    'PERÍODO DE INSCRIÇÃO',
    'Inscrições abrem em',
    'Inscrições fecham em',
    'Inscrições encerradas',
    'As datas serão anunciadas em breve',
    'A liderança publicará aqui os horários de abertura e encerramento.',
    'Abre {date}',
    'Abre {opens} — fecha {closes}',
    'Encerrou {date}',
    'dias',
    'horas',
    'minutos',
    'segundos',
  ],
  ru: [
    'ПЕРИОД РЕГИСТРАЦИИ',
    'Регистрация откроется через',
    'Регистрация закроется через',
    'Регистрация закрыта',
    'Даты регистрации скоро объявят',
    'Руководство опубликует здесь время открытия и закрытия.',
    'Откроется {date}',
    'Открытие {opens} — закрытие {closes}',
    'Закрыто {date}',
    'дней',
    'часов',
    'минут',
    'секунд',
  ],
  tr: [
    'KAYIT DÖNEMİ',
    'Kayıtların açılmasına',
    'Kayıtların kapanmasına',
    'Kayıtlar kapandı',
    'Kayıt tarihleri yakında duyurulacak',
    'Liderlik açılış ve kapanış saatlerini burada yayınlayacak.',
    'Açılış {date}',
    'Açılış {opens} — kapanış {closes}',
    'Kapandı {date}',
    'gün',
    'saat',
    'dakika',
    'saniye',
  ],
  zh: [
    '报名时间',
    '距离报名开始',
    '距离报名结束',
    '报名已结束',
    '报名日期即将公布',
    '管理团队将在这里公布开始和结束时间。',
    '{date} 开始',
    '{opens} 开始 — {closes} 结束',
    '{date} 已结束',
    '天',
    '小时',
    '分钟',
    '秒',
  ],
});

const TROOP_OCR_COPY = Object.freeze({
  en: [
    'OPTIONAL TROOP OCR',
    'Upload your Troop Details screens',
    'Up to 4 images',
    'Add overlapping screenshots from the top and lower parts of the list. We will map each visible troop by type, tier, enhanced status, and count.',
    'Top of the troop list',
    'Continue down the list',
    'Choose Troop Details screenshots',
    'Select 1–4 clear images with enough overlap to avoid missing rows.',
    'I understand these images use the same third-party OCR provider and I must review the rows.',
    'Read troop screenshots',
    'Remove all',
    'Review every detected troop row',
    'Correct uncertain type, tier, enhanced badge, or count before confirming.',
    'I compared every troop row with my screenshots.',
    'Reading screenshot {current} of {total}…',
    '{count} troop rows detected. Review them below.',
    'Normal',
    'Enhanced',
    'Uncertain',
    'Count',
    'Type',
    'Tier',
  ],
  ar: [
    'OCR اختياري للقوات',
    'ارفع شاشات تفاصيل القوات',
    'حتى 4 صور',
    'أضف صورًا متداخلة من أعلى القائمة وأسفلها. سنطابق النوع والمستوى والتحسين والعدد.',
    'أعلى قائمة القوات',
    'تابع أسفل القائمة',
    'اختر صور تفاصيل القوات',
    'اختر 1–4 صور واضحة ومتداخلة لتجنب فقد الصفوف.',
    'أفهم أن الصور ستستخدم مزود OCR خارجيًا ويجب أن أراجع الصفوف.',
    'قراءة صور القوات',
    'إزالة الكل',
    'راجع كل صف قوات تم اكتشافه',
    'صحح النوع أو المستوى أو شارة التحسين أو العدد غير المؤكد.',
    'قارنت كل صف قوات بصوري.',
    'جارٍ قراءة الصورة {current} من {total}…',
    'تم اكتشاف {count} صف قوات. راجعها أدناه.',
    'عادي',
    'محسن',
    'غير مؤكد',
    'العدد',
    'النوع',
    'المستوى',
  ],
  de: [
    'OPTIONALE TRUPPEN-OCR',
    'Troppendetails hochladen',
    'Bis zu 4 Bilder',
    'Lade überlappende Bilder vom oberen und unteren Teil der Liste hoch. Typ, Stufe, Verbesserung und Anzahl werden zugeordnet.',
    'Oberer Teil der Truppenliste',
    'Weiter unten in der Liste',
    'Troppendetails auswählen',
    'Wähle 1–4 klare, überlappende Bilder.',
    'Ich verstehe, dass ein externer OCR-Anbieter genutzt wird und ich die Zeilen prüfen muss.',
    'Truppenbilder lesen',
    'Alle entfernen',
    'Jede erkannte Truppenzeile prüfen',
    'Unsicheren Typ, Stufe, Verbesserungsabzeichen oder Anzahl korrigieren.',
    'Ich habe jede Truppenzeile mit meinen Bildern verglichen.',
    'Bild {current} von {total} wird gelesen…',
    '{count} Truppenzeilen erkannt. Bitte unten prüfen.',
    'Normal',
    'Verbessert',
    'Unsicher',
    'Anzahl',
    'Typ',
    'Stufe',
  ],
  es: [
    'OCR DE TROPAS OPCIONAL',
    'Sube tus pantallas de Detalles de tropas',
    'Hasta 4 imágenes',
    'Añade capturas superpuestas de la parte superior e inferior. Mapearemos tipo, nivel, mejora y cantidad.',
    'Parte superior de la lista',
    'Continúa por la lista',
    'Elegir capturas de tropas',
    'Selecciona 1–4 imágenes claras con solapamiento.',
    'Entiendo que estas imágenes usan un proveedor OCR externo y debo revisar las filas.',
    'Leer capturas de tropas',
    'Quitar todo',
    'Revisa cada fila detectada',
    'Corrige cualquier tipo, nivel, mejora o cantidad dudosa.',
    'Comparé cada fila con mis capturas.',
    'Leyendo imagen {current} de {total}…',
    'Se detectaron {count} filas. Revísalas abajo.',
    'Normal',
    'Mejorada',
    'Dudosa',
    'Cantidad',
    'Tipo',
    'Nivel',
  ],
  fr: [
    'OCR DES TROUPES FACULTATIF',
    'Importez les écrans Détails des troupes',
    'Jusqu’à 4 images',
    'Ajoutez des captures qui se chevauchent du haut et du bas de la liste. Nous associerons type, niveau, amélioration et nombre.',
    'Haut de la liste',
    'Suite de la liste',
    'Choisir les captures de troupes',
    'Sélectionnez 1 à 4 images nettes avec chevauchement.',
    'Je comprends que ces images utilisent un fournisseur OCR tiers et que je dois vérifier les lignes.',
    'Lire les captures',
    'Tout retirer',
    'Vérifiez chaque ligne détectée',
    'Corrigez le type, le niveau, le badge amélioré ou le nombre incertain.',
    'J’ai comparé chaque ligne à mes captures.',
    'Lecture de l’image {current} sur {total}…',
    '{count} lignes détectées. Vérifiez-les ci-dessous.',
    'Normal',
    'Amélioré',
    'Incertain',
    'Nombre',
    'Type',
    'Niveau',
  ],
  id: [
    'OCR PASUKAN OPSIONAL',
    'Unggah layar Rincian Pasukan',
    'Maksimal 4 gambar',
    'Tambahkan tangkapan layar yang bertumpuk dari bagian atas dan bawah daftar. Kami akan memetakan jenis, tingkat, peningkatan, dan jumlah.',
    'Bagian atas daftar',
    'Lanjutkan ke bawah',
    'Pilih tangkapan layar pasukan',
    'Pilih 1–4 gambar jelas yang saling tumpang tindih.',
    'Saya memahami gambar memakai penyedia OCR pihak ketiga dan saya harus memeriksa barisnya.',
    'Baca tangkapan pasukan',
    'Hapus semua',
    'Periksa setiap baris yang terdeteksi',
    'Perbaiki jenis, tingkat, lencana peningkatan, atau jumlah yang meragukan.',
    'Saya membandingkan setiap baris dengan gambar saya.',
    'Membaca gambar {current} dari {total}…',
    '{count} baris terdeteksi. Periksa di bawah.',
    'Normal',
    'Ditingkatkan',
    'Tidak pasti',
    'Jumlah',
    'Jenis',
    'Tingkat',
  ],
  it: [
    'OCR TRUPPE FACOLTATIVO',
    'Carica le schermate Dettagli truppe',
    'Fino a 4 immagini',
    'Aggiungi screenshot sovrapposti delle parti superiore e inferiore dell’elenco. Associeremo ogni truppa visibile a tipo, livello, stato potenziato e quantità.',
    'Parte superiore dell’elenco truppe',
    'Continua verso il basso',
    'Scegli gli screenshot dei Dettagli truppe',
    'Seleziona da 1 a 4 immagini nitide e abbastanza sovrapposte da non saltare righe.',
    'Comprendo che queste immagini usano lo stesso fornitore OCR di terze parti e che devo controllare le righe.',
    'Leggi gli screenshot delle truppe',
    'Rimuovi tutto',
    'Controlla ogni riga di truppe rilevata',
    'Correggi tipo, livello, indicatore potenziato o quantità quando non sono certi.',
    'Ho confrontato ogni riga di truppe con i miei screenshot.',
    'Lettura dello screenshot {current} di {total}…',
    'Rilevate {count} righe di truppe. Controllale qui sotto.',
    'Normale',
    'Potenziata',
    'Incerto',
    'Quantità',
    'Tipo',
    'Livello',
  ],
  kr: [
    '선택 병력 OCR',
    '병력 상세 화면 업로드',
    '최대 4장',
    '목록 위아래의 겹치는 스크린샷을 추가하세요. 병종, 티어, 강화 여부, 수량을 매핑합니다.',
    '병력 목록 상단',
    '목록 아래로 계속',
    '병력 상세 스크린샷 선택',
    '행 누락 방지를 위해 겹치는 선명한 이미지 1–4장을 선택하세요.',
    '외부 OCR 제공업체가 이미지를 처리하며 행을 직접 검토해야 함을 이해합니다.',
    '병력 스크린샷 읽기',
    '모두 제거',
    '감지된 모든 병력 행 검토',
    '불확실한 병종, 티어, 강화 배지 또는 수량을 수정하세요.',
    '모든 병력 행을 스크린샷과 비교했습니다.',
    '{total}장 중 {current}장 읽는 중…',
    '병력 행 {count}개를 감지했습니다. 아래에서 검토하세요.',
    '일반',
    '강화',
    '불확실',
    '수량',
    '병종',
    '티어',
  ],
  pt: [
    'OCR DE TROPAS OPCIONAL',
    'Envie as telas de Detalhes das tropas',
    'Até 4 imagens',
    'Adicione capturas sobrepostas do topo e da parte inferior. Mapearemos tipo, nível, aprimoramento e quantidade.',
    'Topo da lista',
    'Continue pela lista',
    'Escolher capturas de tropas',
    'Selecione 1–4 imagens nítidas com sobreposição.',
    'Entendo que estas imagens usam um provedor OCR externo e devo revisar as linhas.',
    'Ler capturas de tropas',
    'Remover tudo',
    'Revise cada linha detectada',
    'Corrija tipo, nível, selo aprimorado ou quantidade incerta.',
    'Comparei cada linha com minhas capturas.',
    'Lendo imagem {current} de {total}…',
    '{count} linhas detectadas. Revise abaixo.',
    'Normal',
    'Aprimorado',
    'Incerto',
    'Quantidade',
    'Tipo',
    'Nível',
  ],
  ru: [
    'НЕОБЯЗАТЕЛЬНОЕ OCR ВОЙСК',
    'Загрузите экраны «Детали войск»',
    'До 4 изображений',
    'Добавьте перекрывающиеся снимки верхней и нижней частей списка. Мы определим тип, уровень, усиление и количество.',
    'Верх списка войск',
    'Продолжение списка',
    'Выбрать снимки войск',
    'Выберите 1–4 чётких снимка с перекрытием.',
    'Я понимаю, что изображения обрабатывает сторонний OCR и строки нужно проверить.',
    'Распознать войска',
    'Удалить всё',
    'Проверьте каждую найденную строку',
    'Исправьте сомнительный тип, уровень, значок усиления или количество.',
    'Я сверил каждую строку со снимками.',
    'Чтение изображения {current} из {total}…',
    'Найдено строк: {count}. Проверьте их ниже.',
    'Обычные',
    'Усиленные',
    'Неясно',
    'Количество',
    'Тип',
    'Уровень',
  ],
  tr: [
    'İSTEĞE BAĞLI BİRLİK OCR',
    'Birlik Ayrıntıları ekranlarını yükle',
    'En fazla 4 görsel',
    'Listenin üst ve alt kısımlarından çakışan ekran görüntüleri ekleyin. Tür, seviye, geliştirme ve sayıyı eşleştireceğiz.',
    'Birlik listesinin üstü',
    'Listede aşağı devam et',
    'Birlik ekran görüntülerini seç',
    'Satır kaçırmamak için çakışan 1–4 net görsel seçin.',
    'Görsellerin üçüncü taraf OCR ile işleneceğini ve satırları kontrol etmem gerektiğini anlıyorum.',
    'Birlik görsellerini oku',
    'Tümünü kaldır',
    'Algılanan her birlik satırını kontrol et',
    'Belirsiz türü, seviyeyi, geliştirme rozetini veya sayıyı düzeltin.',
    'Her satırı ekran görüntülerimle karşılaştırdım.',
    '{total} görselden {current}. okunuyor…',
    '{count} birlik satırı algılandı. Aşağıda kontrol edin.',
    'Normal',
    'Geliştirilmiş',
    'Belirsiz',
    'Sayı',
    'Tür',
    'Seviye',
  ],
  zh: [
    '可选部队 OCR',
    '上传“部队详情”页面',
    '最多 4 张图片',
    '上传列表顶部和下部有重叠的截图。我们会识别兵种、等级、强化状态和数量。',
    '部队列表顶部',
    '继续向下截图',
    '选择部队详情截图',
    '选择 1–4 张清晰且有重叠的图片。',
    '我了解图片会由第三方 OCR 服务处理，并且必须检查识别结果。',
    '读取部队截图',
    '全部移除',
    '检查每一条识别结果',
    '修正不确定的兵种、等级、强化标记或数量。',
    '我已将每一行与截图核对。',
    '正在读取第 {current}/{total} 张图片…',
    '识别到 {count} 条部队记录。请在下方检查。',
    '普通',
    '强化',
    '不确定',
    '数量',
    '兵种',
    '等级',
  ],
});

function textValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim();
}

function comparableLabel(value) {
  return textValue(value)
    .toLocaleLowerCase('en')
    .replace(/[\u2012-\u2015]/gu, '-')
    .replace(/\s+/gu, ' ');
}

function isCanonicalLabel(value, candidates = []) {
  const normalized = comparableLabel(value);
  return (
    Boolean(normalized) && candidates.some((candidate) => comparableLabel(candidate) === normalized)
  );
}

function finiteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : fallback;
}

function booleanValue(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function formatTemplate(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/gu, (_, key) => String(values[key] ?? ''));
}

function makeTranslator(text, language) {
  return (key, fallback, values) => {
    let translated;
    if (typeof text === 'function') {
      try {
        translated = text(key, values || {}, language);
      } catch {
        translated = undefined;
      }
    } else if (text && typeof text === 'object') translated = text[key];
    const output =
      translated === undefined || translated === null || translated === '' || translated === key
        ? fallback
        : translated;
    return formatTemplate(output ?? key, values);
  };
}

function query(root, selector) {
  return root?.querySelector?.(selector) || null;
}

function queryAll(root, selector) {
  return Array.from(root?.querySelectorAll?.(selector) || []);
}

function setHidden(element, hidden) {
  if (element) element.hidden = Boolean(hidden);
}

function setText(element, value) {
  if (element) element.textContent = String(value ?? '');
}

function setBusy(element, busy) {
  if (!element) return;
  element.disabled = Boolean(busy);
  if (busy) element.setAttribute?.('aria-busy', 'true');
  else element.removeAttribute?.('aria-busy');
}

function ownerWindow(root) {
  return root?.ownerDocument?.defaultView || globalThis.window || null;
}

function ownerDocument(root) {
  return root?.ownerDocument || globalThis.document || null;
}

function createElement(root, tag, className, value) {
  const element = ownerDocument(root)?.createElement?.(tag);
  if (!element) return null;
  if (className) element.className = className;
  if (value !== undefined) element.textContent = String(value);
  return element;
}

function createSvgElement(root, tag, attributes = {}) {
  const element = ownerDocument(root)?.createElementNS?.('http://www.w3.org/2000/svg', tag);
  if (!element) return null;
  Object.entries(attributes).forEach(([name, value]) => {
    if (value !== undefined && value !== null) element.setAttribute(name, String(value));
  });
  return element;
}

function append(parent, ...children) {
  const valid = children.filter(Boolean);
  if (parent?.append) parent.append(...valid);
  return parent;
}

function replaceChildren(parent, ...children) {
  if (parent?.replaceChildren) parent.replaceChildren(...children.filter(Boolean));
}

function formValue(source, name) {
  if (typeof source?.get === 'function') return source.get(name);
  return source?.[name];
}

function formValues(source, name) {
  if (typeof source?.getAll === 'function') return source.getAll(name);
  const value = source?.[name];
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
}

function troopEstimateRoster(source) {
  return TROOP_ESTIMATE_FIELDS.flatMap(([key, field]) => {
    const rawValue = normalizeDigits(formValue(source, field)).trim().replace(',', '.');
    if (!rawValue) return [];
    const millions = Number(rawValue);
    if (!Number.isFinite(millions) || millions < 0 || millions > 9999) {
      const error = new RangeError('Troop estimates must be between 0 and 9,999 million.');
      error.field = field;
      throw error;
    }
    const count = Math.round(millions * 1_000_000);
    return count > 0 ? [`estimate|${key}|${count}`] : [];
  });
}

export function troopEstimateTotals(roster) {
  const legacyTotals = new Map(TROOP_ESTIMATE_FIELDS.map(([key]) => [key, 0]));
  const aggregateTotals = new Map();
  for (const value of roster || []) {
    const aggregate = /^estimate\|(lofty|enhanced-t10|t10|t9)\|(\d{1,10})$/u.exec(String(value));
    if (aggregate) {
      aggregateTotals.set(aggregate[1], Number(aggregate[2]));
      continue;
    }
    const row = parseBohTroopInventoryRow(value);
    if (!row?.count) continue;
    if (['S', 'SS', 'SSS'].includes(row.tier))
      legacyTotals.set('lofty', legacyTotals.get('lofty') + row.count);
    else if (row.tier === 'X' && row.enhanced)
      legacyTotals.set('enhanced-t10', legacyTotals.get('enhanced-t10') + row.count);
    else if (row.tier === 'X') legacyTotals.set('t10', legacyTotals.get('t10') + row.count);
    else if (row.tier === 'IX') legacyTotals.set('t9', legacyTotals.get('t9') + row.count);
  }
  return new Map(
    TROOP_ESTIMATE_FIELDS.map(([key]) => [
      key,
      aggregateTotals.has(key) ? aggregateTotals.get(key) : legacyTotals.get(key),
    ])
  );
}

function normalizeDigits(value) {
  const zeroPoints = [
    0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0e50,
    0x0ed0, 0x0f20, 0x1040, 0x17e0, 0xff10,
  ];
  let output = '';
  for (const character of String(value ?? '').normalize('NFKC')) {
    const codePoint = character.codePointAt(0);
    let digit = null;
    for (const zeroPoint of zeroPoints) {
      const offset = codePoint - zeroPoint;
      if (offset >= 0 && offset <= 9) {
        digit = String(offset);
        break;
      }
    }
    output += digit ?? character;
  }
  return output;
}

/** Strictly accepts a full non-negative integer; abbreviations such as 250M are rejected. */
export function parseBohInteger(value, options = {}) {
  const label = options.label || 'Value';
  const minimum = options.minimum ?? 0;
  const maximum = options.maximum ?? Number.MAX_SAFE_INTEGER;
  const required = options.required !== false;
  if ((value === null || value === undefined || value === '') && !required) return 0;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a whole number.`);
    if (value < minimum || value > maximum)
      throw new RangeError(`${label} is outside the accepted range.`);
    return value;
  }
  const normalized = normalizeDigits(value)
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu, '')
    .trim();
  if (!normalized) {
    if (!required) return 0;
    throw new TypeError(`${label} is required.`);
  }
  const plain = /^[0-9]+$/u.test(normalized);
  const grouped = /^[0-9]{1,3}(?:[,.'’\u066b\u066c\u00a0\u2007\u2009\u202f ][0-9]{3})+$/u.test(
    normalized
  );
  if (!plain && !grouped) throw new TypeError(`${label} must use the full whole-number value.`);
  const digits = normalized.replace(/[^0-9]/gu, '');
  const number = Number(digits);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`${label} is outside the accepted range.`);
  }
  return number;
}

function ensureNoPrivateValues(value, path = 'submission', seen = new Set()) {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) throw new TypeError(`${path} contains a circular value.`);
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    if (PRIVATE_VALUE_KEY.test(key)) throw new TypeError(`${path}.${key} is not persistable.`);
    if (typeof nested === 'string' && /^data:image\//iu.test(nested)) {
      throw new TypeError(`${path}.${key} contains private image data.`);
    }
    ensureNoPrivateValues(nested, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

function safeList(values, allowed) {
  const output = [];
  for (const value of values) {
    const normalized = textValue(value).toLowerCase();
    if (!normalized || (allowed && !allowed.has(normalized)) || output.includes(normalized))
      continue;
    output.push(normalized);
  }
  return output;
}

function canonicalCatalogSelection(values, catalog, field) {
  const canonicalValues = Array.isArray(catalog) ? catalog.map(textValue).filter(Boolean) : [];
  const byKey = new Map(canonicalValues.map((value) => [comparableLabel(value), value]));
  const selected = new Set();
  for (const rawValue of values || []) {
    const value = textValue(rawValue);
    if (!value) continue;
    const canonical = byKey.get(comparableLabel(value));
    if (!canonical) {
      const error = new TypeError(`${field} contains an unavailable option.`);
      error.field = field;
      throw error;
    }
    selected.add(canonical);
  }
  return canonicalValues.filter((value) => selected.has(value));
}

function researchProgressFrom(source, researchTreeIds) {
  const progress = {};
  for (const treeId of researchTreeIds || []) {
    const rawValue = formValue(source, `researchProgressPct.${treeId}`);
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') continue;
    try {
      progress[treeId] = parseBohInteger(rawValue, {
        label: 'Research progress',
        minimum: 0,
        maximum: 100,
      });
    } catch (error) {
      error.field = `researchProgressPct.${treeId}`;
      throw error;
    }
  }
  return progress;
}

/** Parses the optional teammate request without silently dropping extra names. */
export function parseBohPreferredTeammates(value, options = {}) {
  const values = Array.isArray(value)
    ? value
    : String(value ?? '')
        .split(/[,;|\n]+/u)
        .filter(Boolean);
  const ownName = comparableLabel(options.gameName);
  const seen = new Set();
  const names = [];
  for (const rawName of values) {
    const name = textValue(rawName).replace(/\s+/gu, ' ');
    const key = comparableLabel(name);
    if (!key || key === ownName || seen.has(key)) continue;
    if (Array.from(name).length > 160) {
      const error = new TypeError('Each preferred teammate name must be 160 characters or fewer.');
      error.field = 'preferredTeammates';
      throw error;
    }
    seen.add(key);
    names.push(name);
  }
  if (names.length > 6) {
    const error = new TypeError('Add no more than six preferred teammate names.');
    error.field = 'preferredTeammates';
    throw error;
  }
  return names;
}

function normalizeEpicTimeSlotIds(value, fallback = DEFAULT_EPIC_TIME_SLOT_IDS) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set();
  const output = [];
  for (const rawValue of source) {
    const timeSlotId = textValue(rawValue);
    const key = comparableLabel(timeSlotId);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(timeSlotId);
    if (output.length === 24) break;
  }
  return output;
}

/** Builds the separate Epic Showdown preference document from multi-select controls. */
export function buildBohEpicPreferencesPayload(source, options = {}) {
  const gameName = textValue(
    formValue(source, 'epicGameName') ?? formValue(source, 'gameName')
  ).replace(/\s+/gu, ' ');
  if (!gameName || Array.from(gameName).length > 160) {
    const error = new TypeError(
      'Current in-game name is required and must be 160 characters or fewer.'
    );
    error.field = 'epicGameName';
    throw error;
  }
  const lanePreferences = safeList(formValues(source, 'epicLanePreferences'));
  if (!lanePreferences.length) {
    const error = new TypeError('Choose at least one position: South, Center, or North.');
    error.field = 'epicLanePreferences';
    error.i18nKey = 'showdown.laneRequired';
    throw error;
  }
  const invalidLane = lanePreferences.find((lane) => !EPIC_LANE_VALUES.includes(lane));
  if (invalidLane) {
    const error = new TypeError('Epic Showdown position is invalid.');
    error.field = 'epicLanePreferences';
    throw error;
  }

  const timeSlotIds = normalizeEpicTimeSlotIds(options.timeSlotIds);
  const configuredTimes = new Map(
    timeSlotIds.map((timeSlotId) => [comparableLabel(timeSlotId), timeSlotId])
  );
  const timePreferences = [];
  for (const rawValue of formValues(source, 'epicTimePreferences')) {
    const timeSlotId = configuredTimes.get(comparableLabel(rawValue));
    if (!timeSlotId) {
      const error = new TypeError('Epic Showdown game time is no longer available.');
      error.field = 'epicTimePreferences';
      throw error;
    }
    if (!timePreferences.includes(timeSlotId)) timePreferences.push(timeSlotId);
  }
  if (!timePreferences.length) {
    const error = new TypeError('Choose at least one available game time.');
    error.field = 'epicTimePreferences';
    error.i18nKey = 'showdown.timeRequired';
    throw error;
  }
  const flexibilityPreference = textValue(
    formValue(source, 'epicFlexibilityPreference')
  ).toLowerCase();
  if (!EPIC_FLEXIBILITY_VALUES.includes(flexibilityPreference)) {
    const error = new TypeError('Choose how flexible you want to be for Epic Showdown.');
    error.field = 'epicFlexibilityPreference';
    error.i18nKey = 'showdown.flexibilityRequired';
    throw error;
  }

  const payload = { gameName, lanePreferences, timePreferences, flexibilityPreference };
  let normalized;
  try {
    normalized = options.model?.normalizeBohEpicShowdownPreferences?.(payload, {
      timeSlotIds,
    });
  } catch (error) {
    if (error?.field === 'gameName') error.field = 'epicGameName';
    throw error;
  }
  if (!normalized) return payload;
  return {
    gameName: normalized.gameName || gameName,
    lanePreferences: [...(normalized.lanePreferences || [])],
    timePreferences: [...(normalized.timePreferences || [])],
    flexibilityPreference: normalized.flexibilityPreference || flexibilityPreference,
  };
}

/** Keeps optimistic concurrency anchored to the revision visible when editing began. */
export function resolveBohEpicExpectedRevision(preferences, editBaseRevision) {
  return Number.isInteger(editBaseRevision)
    ? Math.max(0, editBaseRevision)
    : finiteInteger(preferences?.revision);
}

/** Builds the exact allow-listed document sent to saveSubmission. */
export function buildBohSubmissionPayload(source, options = {}) {
  const gameName = textValue(formValue(source, 'gameName'));
  if (!gameName || Array.from(gameName).length > 64) {
    const error = new TypeError(
      'Current in-game name is required and must be 64 characters or fewer.'
    );
    error.field = 'gameName';
    throw error;
  }

  const stats = {};
  for (const field of REQUIRED_POWER_FIELDS) {
    try {
      stats[field] = parseBohInteger(formValue(source, field), {
        label: field,
        minimum: 0,
        maximum: 100_000_000_000,
      });
    } catch (error) {
      error.field = field;
      throw error;
    }
  }
  for (const field of OPTIONAL_POWER_FIELDS) {
    const rawValue = formValue(source, field);
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') continue;
    try {
      stats[field] = parseBohInteger(rawValue, {
        label: field,
        minimum: 0,
        maximum: 100_000_000_000,
      });
    } catch (error) {
      error.field = field;
      throw error;
    }
  }
  stats.rocLevel = parseBohInteger(formValue(source, 'rocLevel'), {
    label: 'RoC level',
    minimum: 0,
    maximum: 160,
    required: false,
  });

  const requestedT10Types = safeList(
    formValues(source, 't10Types'),
    new Set(['cavalry', 'archers', 'footmen', 'all'])
  );
  stats.t10TroopTypes = requestedT10Types.includes('all')
    ? ['cavalry', 'archers', 'footmen']
    : requestedT10Types;
  stats.readySpeedHeroes = safeList(
    formValues(source, 'speedHeroes'),
    new Set(['lionheart', 'cao-cao', 'al-fatih'])
  );
  const heroNames = Array.isArray(options.heroNames) ? options.heroNames : [];
  const researchTreeIds = Array.isArray(options.researchTreeIds) ? options.researchTreeIds : [];
  stats.usableHeroNames = canonicalCatalogSelection(
    formValues(source, 'usableHeroNames'),
    heroNames,
    'usableHeroNames'
  );
  stats.researchProgressPct = researchProgressFrom(source, researchTreeIds);
  stats.troopRoster = troopEstimateRoster(source);

  const availability = textValue(formValue(source, 'availability')).toLowerCase();
  if (!AVAILABILITY_VALUES.has(availability)) {
    const error = new TypeError('Choose your expected availability.');
    error.field = 'availability';
    throw error;
  }
  const preferredRole = textValue(formValue(source, 'preferredRole')).toLowerCase();
  if (!ROLE_VALUES.has(preferredRole)) {
    const error = new TypeError('Choose your primary role.');
    error.field = 'preferredRole';
    throw error;
  }
  const secondaryRole = textValue(formValue(source, 'secondaryRole')).toLowerCase();
  if (secondaryRole && !ROLE_VALUES.has(secondaryRole)) {
    const error = new TypeError('Secondary role is invalid.');
    error.field = 'secondaryRole';
    throw error;
  }
  if (secondaryRole && secondaryRole === preferredRole) {
    const error = new TypeError('Choose a different secondary role.');
    error.field = 'secondaryRole';
    error.i18nKey = 'signup.secondaryRoleDifferent';
    throw error;
  }
  const leadershipInterest = textValue(formValue(source, 'leadershipInterest')).toLowerCase();
  if (!['yes', 'no'].includes(leadershipInterest)) {
    const error = new TypeError('Choose whether you can help lead or manage this season.');
    error.field = 'leadershipInterest';
    error.i18nKey = 'signup.leadershipInterestRequired';
    throw error;
  }
  const vtsMemberValue = textValue(formValue(source, 'vts1097Member')).toLowerCase();
  if (!['yes', 'no'].includes(vtsMemberValue)) {
    const error = new TypeError('Choose whether you currently play in VTS 1097.');
    error.field = 'vts1097Member';
    throw error;
  }
  const vts1097Member = vtsMemberValue === 'yes';
  const contactNumber = textValue(formValue(source, 'contactNumber')).slice(0, 160);
  const currentState = textValue(formValue(source, 'currentState')).slice(0, 160);
  const joinReason = textValue(formValue(source, 'joinReason')).slice(0, 1000);
  if (!vts1097Member && (!contactNumber || !currentState || !joinReason)) {
    const error = new TypeError(
      'Non-VTS players must provide contact details, current state, and why they want to join.'
    );
    error.field = !contactNumber ? 'contactNumber' : !currentState ? 'currentState' : 'joinReason';
    throw error;
  }
  const fightingTimeIds = canonicalCatalogSelection(
    formValues(source, 'fightingTimeIds'),
    FIGHTING_TIME_IDS,
    'fightingTimeIds'
  );
  if (fightingTimeIds.length !== 2) {
    const error = new TypeError('Choose exactly two All-Star fighting times.');
    error.field = 'fightingTimeIds';
    error.i18nKey = 'signup.fightingTimesRequired';
    throw error;
  }
  const teamNamePreferences = canonicalCatalogSelection(
    formValues(source, 'teamNamePreferences'),
    TEAM_NAME_PREFERENCES,
    'teamNamePreferences'
  );
  const entryMethod = options.entryMethod === 'ocr' ? 'ocr' : 'manual';
  if (entryMethod === 'ocr' && !options.ocrReview) {
    const error = new TypeError('Read a screenshot before submitting OCR values.');
    error.field = 'statsScreenshot';
    throw error;
  }
  const confidence = options.ocrReview?.confidence || {};
  const fieldConfidence = Object.fromEntries(
    POWER_FIELDS.filter((field) => Number.isFinite(confidence[field])).map((field) => [
      field,
      confidence[field],
    ])
  );

  const payload = {
    gameName,
    knownNames: [
      gameName,
      ...(Array.isArray(options.knownNames) ? options.knownNames.map(textValue) : []),
    ].filter((name, index, names) => name && names.indexOf(name) === index),
    preferredTeammates: parseBohPreferredTeammates(formValue(source, 'preferredTeammates'), {
      gameName,
    }),
    locale: textValue(options.language),
    timezone: textValue(formValue(source, 'timezone')).slice(0, 80),
    entryMethod,
    status: 'submitted',
    stats,
    rolePreferences: [preferredRole, secondaryRole].filter(
      (role, index, roles) => role && role !== 'flexible' && roles.indexOf(role) === index
    ),
    eligibleRoleIds: [],
    commitment: {
      availability,
      preferredRole,
      secondaryRole,
      canHelpLead: leadershipInterest === 'yes',
      vts1097Member,
      contactNumber: vts1097Member ? '' : contactNumber,
      currentState: vts1097Member ? '' : currentState,
      joinReason: vts1097Member ? '' : joinReason,
      fightingTimeIds,
      teamNamePreferences,
      notes: textValue(formValue(source, 'playerNotes')).slice(0, 2000),
    },
    ocr: {
      used: entryMethod === 'ocr',
      valuesConfirmed: entryMethod === 'ocr',
      confidence: Number.isFinite(confidence.overall) ? confidence.overall : null,
      warnings: entryMethod === 'ocr' ? [...(options.ocrReview?.warnings || [])].slice(0, 20) : [],
      fieldConfidence: entryMethod === 'ocr' ? fieldConfidence : {},
    },
    submittedAtMs: options.now ?? Date.now(),
  };

  const normalized =
    typeof options.model?.normalizeBohSignup === 'function'
      ? options.model.normalizeBohSignup(payload, {
          heroNames,
          researchTreeIds,
          requireFightingTimeIds: true,
        })
      : null;
  if (normalized) {
    payload.knownNames = normalized.knownNames;
    payload.preferredTeammates = [...(normalized.preferredTeammates || [])];
    payload.stats = { ...payload.stats, ...normalized.stats };
    payload.rolePreferences = [...(normalized.rolePreferences || [])];
    payload.commitment = { ...payload.commitment, ...normalized.commitment };
  }
  ensureNoPrivateValues(payload);
  return payload;
}

function publicationFlag(publication, type) {
  if (!publication) return false;
  if (type === 'announcement') {
    return (
      publication.announcementPublished === true ||
      ['announcement', 'plan', 'live'].includes(publication.status)
    );
  }
  return publication.planPublished === true || ['plan', 'live'].includes(publication.status);
}

/** Selects the four explicit player UI states without inferring backend access. */
export function selectBohPlayerStates(input = {}) {
  if (input.accessGranted !== true) return { announcement: 'locked', plan: 'locked' };
  const assigned = Boolean(input.personalPlan?.teamId);
  return {
    announcement: publicationFlag(input.publication, 'announcement')
      ? assigned
        ? 'assigned'
        : 'unassigned'
      : 'unpublished',
    plan: publicationFlag(input.publication, 'plan')
      ? assigned
        ? 'assigned'
        : 'unassigned'
      : 'unpublished',
  };
}

function phaseKey(entry) {
  return `${entry?.legionId || ''}:${entry?.phaseId || ''}`;
}

/** Chooses one Legion timeline plus the current/next cards from projected domain entries. */
export function selectBohTimelineView(entries = [], options = {}) {
  const list = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const legionIds = [...new Set(list.map((entry) => textValue(entry.legionId)).filter(Boolean))];
  const legionId = legionIds.includes(options.legionId) ? options.legionId : legionIds[0] || '';
  const timeline = list
    .filter((entry) => !legionId || entry.legionId === legionId)
    .sort(
      (left, right) =>
        finiteInteger(left.startMinute) - finiteInteger(right.startMinute) ||
        phaseKey(left).localeCompare(phaseKey(right))
    );
  let index = timeline.findIndex((entry) => entry.phaseId === options.phaseId);
  if (index < 0) index = 0;
  const current = timeline[index] || null;
  return {
    legionId,
    legionIds,
    timeline,
    phaseId: current?.phaseId || '',
    current,
    next: timeline[index + 1] || null,
    index,
    hasRotation: timeline.some((entry) => entry.rotated === true),
  };
}

function teamForProjection(team) {
  if (!team) return null;
  return {
    ...team,
    id: team.id || team.teamId,
    players: (team.seats || team.players || []).map((seat) => ({
      playerId: seat.playerId,
      gameName: seat.displayName || seat.gameName,
      seatNumber: seat.seatNumber,
    })),
  };
}

export function projectBohPlayerPlan(input = {}) {
  if (Array.isArray(input.personalPlan?.timeline)) {
    const playerId = textValue(input.playerId);
    const projectionOwnerId = textValue(input.personalPlan.playerId || input.personalPlan.uid);
    if (playerId && projectionOwnerId && projectionOwnerId !== playerId) return [];
    return input.personalPlan.timeline.filter((entry) => {
      const entryPlayerId = textValue(entry?.playerId);
      if (entryPlayerId) return Boolean(playerId) && entryPlayerId === playerId;
      return !projectionOwnerId || projectionOwnerId === playerId;
    });
  }
  const projector = input.model?.projectBohPlayerTimeline;
  if (typeof projector !== 'function' || !input.personalPlan?.plan || !input.team) return [];
  const seat = (input.team.seats || []).find(
    (entry) => entry.seatNumber === input.personalPlan.seatNumber
  );
  const playerId = input.playerId || seat?.playerId;
  if (!playerId) return [];
  return projector(input.personalPlan.plan, teamForProjection(input.team), playerId, {
    legionId: input.legionId || undefined,
  });
}

function instructionValue(entry, ...keys) {
  const instruction = entry?.instruction || {};
  for (const key of keys) {
    if (instruction[key] !== undefined && instruction[key] !== null && instruction[key] !== '') {
      return textValue(instruction[key]);
    }
  }
  return '';
}

function objectiveFor(plan, value) {
  const key =
    value && typeof value === 'object'
      ? textValue(value.id || value.objectiveId || value.code || value.label)
      : textValue(value);
  return (plan?.objectives || []).find(
    (objective) => objective.id === key || objective.code === key || objective.label === key
  );
}

function pointForObjective(objective) {
  if (!objective || !Number.isFinite(objective.x) || !Number.isFinite(objective.y)) return null;
  return [
    (Math.max(0, Math.min(100, objective.x)) / 100) * BOH_MAP_VIEWBOX.width,
    (Math.max(0, Math.min(100, objective.y)) / 100) * BOH_MAP_VIEWBOX.height,
  ];
}

function fieldKindLabel(state, kind) {
  if (kind === 'arsenal') return state.tr('field.arsenal', 'Arsenal');
  if (kind === 'cc') return state.tr('field.commandCenter', 'Command Center');
  if (kind === 'fort') return state.tr('field.stronghold', 'Stronghold');
  if (kind === 'fortress') return state.tr('field.fortress', 'Fortress of Honor');
  if (kind === 'hospital') return state.tr('field.hospital', 'Hospital');
  if (kind === 'op') return state.tr('field.outpost', 'Outpost');
  if (kind === 'relay') return state.tr('field.relay', 'Relay');
  if (kind === 'sanctuary') return state.tr('field.sanctuary', 'Sanctuary');
  if (kind === 'tower') return state.tr('field.tower', 'Tower');
  return state.tr('plan.objectiveStructure', 'Structure');
}

function objectiveIdentityKeys(objective) {
  return [objective?.id, objective?.code]
    .map((value) => textValue(value).toLocaleLowerCase('en'))
    .filter(Boolean);
}

export function mergeBohFieldObjectives(authored = [], field = []) {
  const authoredKeys = new Set(authored.flatMap(objectiveIdentityKeys));
  return authored.concat(
    field.filter(
      (objective) => !objectiveIdentityKeys(objective).some((key) => authoredKeys.has(key))
    )
  );
}

function fieldObjectivesFor(state) {
  const authored = Array.isArray(state.personalPlan?.plan?.objectives)
    ? state.personalPlan.plan.objectives
    : [];
  if (typeof BohField.bohStage1Objectives !== 'function') return authored;
  const field = BohField.bohStage1Objectives(BohField.BOH_STAGE1_DEFAULT_SIDE).map((objective) => {
    return {
      ...objective,
      label: `${fieldKindLabel(state, objective.type)} ${objective.code}`.trim(),
    };
  });
  return mergeBohFieldObjectives(authored, field);
}

function planWithFieldObjectives(state) {
  return { ...(state.personalPlan?.plan || {}), objectives: fieldObjectivesFor(state) };
}

function isStandbyInstruction(entry) {
  return entry?.instruction?.standby === true;
}

function isMeaningfulTeleport(value) {
  const text = textValue(value).toLowerCase();
  return Boolean(text) && !/^(?:no teleport|no|none|n\/a|—|-)$/iu.test(text);
}

function routeReference(plan, value) {
  if (value === undefined || value === null || value === '') return null;
  const authored = objectiveFor(plan, value);
  if (value && typeof value === 'object') {
    const id = textValue(value.id || value.objectiveId || value.code || value.label);
    return {
      ...(authored || {}),
      id: authored?.id || id,
      code: textValue(value.code || authored?.code),
      label: textValue(value.label || value.name || authored?.label || id),
      type: textValue(value.type || value.kind || authored?.type || 'objective'),
      x:
        value.x !== undefined &&
        value.x !== null &&
        value.x !== '' &&
        Number.isFinite(Number(value.x))
          ? Number(value.x)
          : authored?.x,
      y:
        value.y !== undefined &&
        value.y !== null &&
        value.y !== '' &&
        Number.isFinite(Number(value.y))
          ? Number(value.y)
          : authored?.y,
    };
  }
  if (authored) return authored;
  const label = textValue(value);
  return label ? { id: label, code: '', label, type: 'objective', x: null, y: null } : null;
}

function routeReferences(plan, value) {
  const values = Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];
  return values.map((entry) => routeReference(plan, entry)).filter(Boolean);
}

function authoredRoutePath(instruction, route) {
  const candidates = [
    instruction.pathObjectiveIds,
    instruction.routeObjectiveIds,
    route.pathObjectiveIds,
    route.path,
  ];
  return candidates.find((candidate) => Array.isArray(candidate) && candidate.length) || [];
}

export function buildBohRouteDescriptor(entry, plan = {}, options = {}) {
  const instruction = entry?.instruction || {};
  const route = instruction.route && typeof instruction.route === 'object' ? instruction.route : {};
  const explicitPath = authoredRoutePath(instruction, route);
  let routeNodes = routeReferences(plan, explicitPath);
  if (!routeNodes.length) {
    const inferredSpawn = (plan?.objectives || []).find((objective) =>
      ['spawn', 'start'].includes(textValue(objective.type).toLowerCase())
    );
    const startNode = routeReference(
      plan,
      route.startPoint ||
        route.start ||
        instruction.startObjective ||
        instruction.startObjectiveId ||
        inferredSpawn
    );
    const viaNodes = routeReferences(
      plan,
      route.viaPoints ||
        route.via ||
        instruction.viaObjectives ||
        instruction.viaObjectiveIds ||
        instruction.viaObjectiveId ||
        instruction.tower
    );
    const targetNode = routeReference(
      plan,
      route.targetPoint ||
        route.target ||
        instruction.targetObjective ||
        instruction.targetObjectiveId ||
        instruction.objectiveId ||
        objectiveFor(plan, instruction.target)
    );
    routeNodes = [startNode, ...viaNodes, targetNode].filter(Boolean);
  }
  const startNode = routeNodes.length > 1 ? routeNodes[0] : null;
  const targetNode = routeNodes.at(-1) || null;
  const viaNodes = routeNodes.length > 2 ? routeNodes.slice(1, -1) : [];
  const start = startNode?.label || textValue(route.startLabel) || options.startFallback || 'Start';
  const via =
    viaNodes
      .map((objective) => objective.label)
      .filter(Boolean)
      .join(' → ') ||
    options.viaFallback ||
    'Direct route';
  const target =
    targetNode?.label ||
    textValue(route.targetLabel || instruction.target || instruction.objectiveLabel) ||
    options.targetFallback ||
    'Current target';
  const points = routeNodes.map(pointForObjective);
  const hasCompleteRoute = points.length >= 2 && points.every(Boolean);
  const routeIds = new Set(routeNodes.map((objective) => objective.id).filter(Boolean));
  const allNodes = [...(plan?.objectives || []), ...routeNodes];
  const seenNodes = new Set();
  const nodes = allNodes
    .filter((objective) => {
      const id = textValue(objective?.id || objective?.code || objective?.label);
      const point = pointForObjective(objective);
      if (!id || !point || seenNodes.has(id)) return false;
      seenNodes.add(id);
      return true;
    })
    .map((objective) => {
      const point = pointForObjective(objective);
      const id = textValue(objective.id || objective.code || objective.label);
      return {
        id,
        code: (textValue(objective.code) || textValue(objective.label)).slice(0, 8),
        label: textValue(objective.label || objective.code || objective.id),
        type: textValue(objective.type || 'objective'),
        x: Math.round(point[0]),
        y: Math.round(point[1]),
        onRoute: routeIds.has(id),
        isStart: id === startNode?.id,
        isTarget: id === targetNode?.id,
      };
    });
  return {
    start,
    via,
    target,
    nodes,
    path: hasCompleteRoute
      ? points
          .map(([x, y], index) => `${index ? 'L' : 'M'} ${Math.round(x)} ${Math.round(y)}`)
          .join(' ')
      : '',
    description: `${start} → ${via} → ${target}`,
  };
}

function initialState(options) {
  const registrationClosed = options.registrationClosed === true;
  return {
    options,
    root: options.root,
    store: options.store || null,
    ocr: options.ocrService || {},
    model: options.model || {},
    textSource: options.text,
    language: textValue(options.language || 'en') || 'en',
    tr: makeTranslator(options.text, options.language || 'en'),
    accessGranted: Boolean(options.store && options.store.accessGranted !== false),
    registrationClosed,
    section: registrationClosed ? 'plan' : 'signup',
    entryMethod: 'ocr',
    selectedPhaseId: '',
    selectedCommandMode: 'my-orders',
    selectedCommandPhaseId: 'phase-1',
    selectedLegionId: '',
    selectedTeamId: '',
    submission: null,
    submissionFeedback: null,
    epicPreferences: null,
    publication: null,
    personalPlan: null,
    eventSchedule: null,
    selectedMilestoneId: '',
    selectedMilestoneIsManual: false,
    selectedObjectiveId: '',
    teams: new Map(),
    ocrFile: null,
    ocrPreviewUrl: '',
    ocrReview: null,
    ocrInvalidField: '',
    ocrGeneration: 0,
    ocrPhase: 'idle',
    ocrBusy: false,
    troopOcrFiles: [],
    troopOcrRows: [],
    troopOcrWarnings: [],
    troopOcrBusy: false,
    saving: false,
    dirty: false,
    hydratedRevision: null,
    submissionEditBaseRevision: null,
    epicSaving: false,
    epicDirty: false,
    participationMode: 'allstar',
    epicNameTouched: false,
    epicHydratedRevision: null,
    epicEditBaseRevision: null,
    renderedEpicTimeOptions: '',
    renderedHeroCatalog: '',
    renderedResearchCatalog: '',
    fightingTimeErrorKey: '',
    feedbackRevision: 0,
    signupWindow:
      options.signupWindow ||
      globalThis.VTS_ALL_STAR_BOH_SIGNUP_WINDOW ||
      ALL_STAR_BOH_SIGNUP_WINDOW,
    scheduleTimer: null,
    destroyed: false,
    subscriptions: [],
    teamSubscriptions: new Map(),
    eventsAbort: new AbortController(),
  };
}

function signupWindowLocale(language) {
  const normalized = textValue(language).toLowerCase().replace('_', '-');
  if (normalized === 'ko' || normalized.startsWith('ko-')) return 'kr';
  const base = normalized.split('-')[0];
  return SIGNUP_WINDOW_COPY[base] ? base : 'en';
}

function signupWindowTemplate(value, replacements = {}) {
  return String(value).replace(/\{(\w+)\}/gu, (_match, key) => replacements[key] || '');
}

function formatSignupWindowDate(value, locale) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  const intlLocale = locale === 'kr' ? 'ko' : locale;
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function renderSignupWindow(state) {
  const card = query(state.root, '[data-role="signup-window"]');
  if (!card) return;
  setHidden(card, state.registrationClosed);
  if (state.registrationClosed) return;
  const now = typeof state.options.now === 'function' ? state.options.now() : Date.now();
  const windowState = getAllStarBohSignupWindowState(state.signupWindow, now);
  const locale = signupWindowLocale(state.language);
  const copy = SIGNUP_WINDOW_COPY[locale];
  const [
    kicker,
    upcomingTitle,
    openTitle,
    closedTitle,
    unconfiguredTitle,
    unconfiguredDates,
    upcomingDates,
    openDates,
    closedDates,
    daysLabel,
    hoursLabel,
    minutesLabel,
    secondsLabel,
  ] = copy;
  card.dataset.phase = windowState.phase;
  setText(query(card, '[data-role="signup-window-kicker"]'), kicker);
  const title =
    windowState.phase === 'upcoming'
      ? upcomingTitle
      : windowState.phase === 'open'
        ? openTitle
        : windowState.phase === 'closed'
          ? closedTitle
          : unconfiguredTitle;
  setText(query(card, '[data-role="signup-window-title"]'), title);
  const opens = formatSignupWindowDate(windowState.opensAt, locale);
  const closes = formatSignupWindowDate(windowState.closesAt, locale);
  const dates =
    windowState.phase === 'upcoming'
      ? signupWindowTemplate(upcomingDates, { date: opens })
      : windowState.phase === 'open'
        ? signupWindowTemplate(openDates, { opens, closes })
        : windowState.phase === 'closed'
          ? signupWindowTemplate(closedDates, { date: closes })
          : unconfiguredDates;
  setText(query(card, '[data-role="signup-window-dates"]'), dates);
  const countdown = query(card, '[data-role="signup-window-countdown"]');
  setHidden(countdown, !['upcoming', 'open'].includes(windowState.phase));
  const parts = getAllStarBohCountdownParts(windowState.remainingSeconds);
  for (const [part, label] of [
    ['days', daysLabel],
    ['hours', hoursLabel],
    ['minutes', minutesLabel],
    ['seconds', secondsLabel],
  ]) {
    setText(
      query(card, `[data-role="signup-window-${part}"]`),
      String(parts[part]).padStart(2, '0')
    );
    setText(query(card, `[data-role="signup-window-${part}-label"]`), label);
  }
}

function startSignupWindowTimer(state) {
  const setIntervalImpl =
    state.options.setInterval ||
    ownerWindow(state.root)?.setInterval?.bind(ownerWindow(state.root));
  if (typeof setIntervalImpl !== 'function' || state.scheduleTimer !== null) return;
  state.scheduleTimer = setIntervalImpl(() => {
    renderSignupWindow(state);
    renderEventSchedule(state);
  }, 1000);
}

function stopSignupWindowTimer(state) {
  if (state.scheduleTimer === null) return;
  const clearIntervalImpl =
    state.options.clearInterval ||
    ownerWindow(state.root)?.clearInterval?.bind(ownerWindow(state.root));
  clearIntervalImpl?.(state.scheduleTimer);
  state.scheduleTimer = null;
}

function reportError(state, error, context = {}) {
  state.feedbackRevision += 1;
  state.options.onError?.(error, context);
  const feedback = query(state.root, '[data-role="page-feedback"]');
  if (feedback) {
    feedback.hidden = false;
    feedback.dataset.tone = 'error';
    feedback.textContent = error?.message || String(error);
  }
}

function notice(state, key, fallback, context = {}) {
  state.feedbackRevision += 1;
  const message = state.tr(key, fallback, context);
  state.options.onNotice?.(message, { key, ...context });
  const feedback = query(state.root, '[data-role="page-feedback"]');
  if (feedback) {
    feedback.hidden = false;
    feedback.dataset.tone = context.tone || 'success';
    feedback.textContent = message;
  }
}

function clearNotice(state) {
  state.feedbackRevision += 1;
  const feedback = query(state.root, '[data-role="page-feedback"]');
  if (feedback) {
    feedback.hidden = true;
    feedback.textContent = '';
    delete feedback.dataset.tone;
  }
}

function showSubmissionConfirmation(state, { edited = false, revision = 1 } = {}) {
  const dialog = query(state.root, '[data-role="submission-confirmation"]');
  if (!dialog) return;
  const safeRevision = Math.max(1, finiteInteger(revision) || 1);
  setText(
    query(dialog, '[data-role="submission-confirmation-kicker"]'),
    state.tr('signup.confirmationKicker', 'SIGNUP SAVED')
  );
  setText(
    query(dialog, '[data-role="submission-confirmation-title"]'),
    edited
      ? state.tr('signup.editConfirmationTitle', 'Edits accepted')
      : state.tr('signup.submitConfirmationTitle', 'Signup submitted')
  );
  setText(
    query(dialog, '[data-role="submission-confirmation-description"]'),
    edited
      ? state.tr(
          'signup.editConfirmationDescription',
          'Your updated information is saved and ready for leadership review.'
        )
      : state.tr(
          'signup.submitConfirmationDescription',
          'Your information is ready for leadership review and team balancing.'
        )
  );
  setText(
    query(dialog, '[data-role="submission-confirmation-revision"]'),
    state.tr('signup.confirmationRevision', 'Submission revision {revision}', {
      revision: safeRevision,
    })
  );
  setText(
    query(dialog, '[data-role="submission-confirmation-close"]'),
    state.tr('signup.confirmationContinue', 'Continue')
  );
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute?.('open', '');
  query(dialog, '[data-role="submission-confirmation-close"]')?.focus?.();
}

function closeSubmissionConfirmation(state) {
  const dialog = query(state.root, '[data-role="submission-confirmation"]');
  if (!dialog) return;
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute?.('open');
  query(state.root, '[data-role="signup-submit"]')?.focus?.({ preventScroll: true });
}

function activateSection(state, section, focus = false) {
  if (state.registrationClosed && section === 'signup') section = 'announcement';
  if (!SECTION_ORDER.includes(section)) return false;
  state.section = section;
  let visibleStep = 0;
  for (const tab of queryAll(state.root, '[data-role="section-tab"]')) {
    if (state.registrationClosed && tab.dataset.section === 'signup') {
      tab.hidden = true;
      tab.setAttribute('aria-disabled', 'true');
      tab.tabIndex = -1;
      continue;
    }
    if (state.registrationClosed) {
      setText(query(tab, '.boh-subnav__step'), String(++visibleStep));
    }
    const selected = tab.dataset.section === section;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.classList?.toggle('is-active', selected);
    if (selected && focus) tab.focus?.();
    if (selected && tab.scrollIntoView) {
      const reducedMotion = ownerWindow(state.root)?.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )?.matches;
      tab.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }
  for (const panel of queryAll(state.root, '[data-role="section-panel"]')) {
    panel.hidden =
      panel.dataset.section !== section ||
      (state.registrationClosed && panel.dataset.section === 'signup');
  }
  setHidden(query(state.root, '[data-role="signup-addon"]'), section !== 'signup');
  return true;
}

function setEntryMethod(state, method) {
  state.entryMethod = method === 'ocr' ? 'ocr' : 'manual';
  setHidden(query(state.root, '[data-role="ocr-upload-panel"]'), state.entryMethod !== 'ocr');
  for (const input of queryAll(state.root, '[data-role="entry-method"]')) {
    input.checked = input.value === state.entryMethod;
  }
  renderOcr(state);
}

function updateInput(form, name, value) {
  const control = query(form, `[name="${name}"]`);
  if (control) control.value = value ?? '';
}

function updateChecked(form, name, values) {
  const selected = new Set(Array.isArray(values) ? values : [values]);
  for (const control of queryAll(form, `[name="${name}"]`)) {
    control.checked = selected.has(control.value);
  }
}

export function heroCatalogFor(state) {
  const seen = new Set();
  const heroes = [];
  for (const value of Array.isArray(state.options.heroes) ? state.options.heroes : []) {
    const name = textValue(value?.name);
    const key = comparableLabel(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const releaseSeason = textValue(value?.releaseSeason);
    const season =
      seasonRank(releaseSeason) === null ? textValue(value?.season || '') : releaseSeason;
    if (seasonRank(season) === null) continue;
    heroes.push({
      name,
      troopType: textValue(value?.Type || value?.type || 'All') || 'All',
      season,
      imageUrl: textValue(value?.imageUrl || value?.image || ''),
    });
  }
  return heroes;
}

function seasonRank(value) {
  const normalized = textValue(value).toUpperCase().replace(/^SX/u, 'X');
  const season = /^S([0-4])$/u.exec(normalized);
  if (season) return Number(season[1]);
  const eden = /^X([1-8])$/u.exec(normalized);
  if (eden) return 4 + Number(eden[1]);
  return null;
}

function researchCatalogFor(state) {
  const seen = new Set();
  const trees = [];
  for (const value of Array.isArray(state.options.researchTrees)
    ? state.options.researchTrees
    : []) {
    const id = textValue(value?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    trees.push({ ...value, id, season: textValue(value?.season || 'Other') || 'Other' });
  }
  return trees;
}

function heroTroopLabel(state, troopType) {
  const normalized = comparableLabel(troopType);
  if (normalized === 'cavalry') return state.tr('signup.t9Cavalry', 'Cavalry');
  if (normalized === 'archers') return state.tr('signup.t9Archers', 'Archers');
  if (normalized === 'footmen') return state.tr('signup.t9Footmen', 'Footmen');
  if (normalized === 'all') return state.tr('signup.heroAllTypes', 'All troops');
  return troopType;
}

function renderHeroCatalogStatus(state) {
  const selected = queryAll(state.root, '[name="usableHeroNames"]:checked').length;
  setText(
    query(state.root, '[data-role="hero-selected-count"]'),
    state.tr('signup.usableHeroesSelected', '{count} selected', { count: selected })
  );
  const search = comparableLabel(query(state.root, '[data-role="hero-search"]')?.value);
  const troopType = comparableLabel(query(state.root, '[data-role="hero-troop-filter"]')?.value);
  const season = query(state.root, '[data-role="hero-season-filter"]')?.value || 'X1';
  const selectedSeasonRank = seasonRank(season);
  let shown = 0;
  for (const row of queryAll(state.root, '[data-role="hero-option"]')) {
    const matches =
      (!search || comparableLabel(row.dataset.search).includes(search)) &&
      (!troopType || comparableLabel(row.dataset.troopType) === troopType) &&
      (selectedSeasonRank === null || seasonRank(row.dataset.season) <= selectedSeasonRank);
    row.hidden = !matches;
    if (matches) shown += 1;
  }
  const results = query(state.root, '[data-role="hero-results"]');
  if (shown === 1) {
    setText(results, state.tr('signup.heroResult', '1 hero shown'));
  } else {
    setText(results, state.tr('signup.heroResults', '{count} heroes shown', { count: shown }));
  }
  setHidden(query(state.root, '[data-role="hero-no-results"]'), shown !== 0);
}

function renderHeroCatalog(state) {
  const list = query(state.root, '[data-role="hero-list"]');
  if (!list) return;
  const heroes = heroCatalogFor(state);
  const renderKey = JSON.stringify([
    state.language,
    heroes.map(({ name, troopType, season, imageUrl }) => [name, troopType, season, imageUrl]),
  ]);
  if (state.renderedHeroCatalog !== renderKey) {
    const checked = new Set(
      queryAll(state.root, '[name="usableHeroNames"]:checked').map((input) => input.value)
    );
    const troopFilter = query(state.root, '[data-role="hero-troop-filter"]');
    const seasonFilter = query(state.root, '[data-role="hero-season-filter"]');
    const currentTroop = troopFilter?.value || '';
    const currentSeason = seasonFilter?.value || 'X1';
    const rows = heroes.map((hero) => {
      const row = createElement(state.root, 'label', 'boh-catalog-row');
      row.dataset.role = 'hero-option';
      row.dataset.search = `${hero.name} ${hero.troopType} ${hero.season}`;
      row.dataset.troopType = hero.troopType;
      row.dataset.season = hero.season;
      const input = createElement(state.root, 'input');
      input.type = 'checkbox';
      input.name = 'usableHeroNames';
      input.value = hero.name;
      input.checked = checked.has(hero.name);
      const portrait = createElement(state.root, 'img', 'boh-catalog-row__portrait');
      portrait.src = hero.imageUrl;
      portrait.alt = '';
      portrait.loading = 'lazy';
      portrait.decoding = 'async';
      const copy = createElement(state.root, 'span', 'boh-catalog-row__copy');
      const name = createElement(state.root, 'strong', '', hero.name);
      const metadata = createElement(
        state.root,
        'small',
        'boh-catalog-row__meta',
        [hero.season, heroTroopLabel(state, hero.troopType)].filter(Boolean).join(' · ')
      );
      append(copy, name, metadata);
      append(row, input, portrait, copy);
      return row;
    });
    replaceChildren(list, ...rows);

    if (troopFilter) {
      const troopTypes = [...new Set(heroes.map((hero) => hero.troopType))];
      const all = createElement(
        state.root,
        'option',
        '',
        state.tr('signup.heroAllTroops', 'All troop types')
      );
      all.value = '';
      const options = troopTypes.map((value) => {
        const option = createElement(state.root, 'option', '', heroTroopLabel(state, value));
        option.value = value;
        return option;
      });
      replaceChildren(troopFilter, all, ...options);
      troopFilter.value = troopTypes.includes(currentTroop) ? currentTroop : '';
    }
    if (seasonFilter) {
      const options = HERO_SEASON_MILESTONES.map((value) => {
        const option = createElement(state.root, 'option', '', value);
        option.value = value;
        return option;
      });
      replaceChildren(seasonFilter, ...options);
      seasonFilter.value = HERO_SEASON_MILESTONES.includes(currentSeason) ? currentSeason : 'X1';
    }
    state.renderedHeroCatalog = renderKey;
  }
  renderHeroCatalogStatus(state);
}

function researchTreeLabel(state, tree) {
  if (typeof state.options.researchTreeText === 'function') {
    try {
      return textValue(state.options.researchTreeText(tree, 'name', state.language)) || tree.name;
    } catch {
      // Keep the canonical label when a partial locale pack cannot resolve a tree.
    }
  }
  return textValue(tree.name || tree.id);
}

function verifiedResearchArt(tree) {
  return VERIFIED_RESEARCH_ART[comparableLabel(tree?.name)] ?? null;
}

function renderResearchStatus(state) {
  const inputs = queryAll(state.root, '[data-role="research-progress-input"]');
  const entered = inputs.filter((input) => String(input.value ?? '').trim() !== '').length;
  setText(
    query(state.root, '[data-role="research-entered-count"]'),
    state.tr('signup.researchEntered', '{count} of {total} trees entered', {
      count: entered,
      total: inputs.length,
    })
  );
}

function renderResearchSeasonFilter(state) {
  const filter = query(state.root, '[data-role="research-season-filter"]');
  const selectedSeason = HERO_SEASON_MILESTONES.includes(filter?.value) ? filter.value : 'X1';
  const selectedRank = seasonRank(selectedSeason);
  for (const group of queryAll(state.root, '[data-role="research-season-group"]')) {
    const groupRank = seasonRank(group.dataset.season);
    group.hidden = selectedRank !== null && groupRank !== null && groupRank > selectedRank;
  }
}

function renderResearchCatalog(state) {
  const container = query(state.root, '[data-role="research-groups"]');
  if (!container) return;
  const trees = researchCatalogFor(state);
  const renderKey = JSON.stringify([
    state.language,
    trees.map((tree) => [tree.id, researchTreeLabel(state, tree), tree.season]),
  ]);
  if (state.renderedResearchCatalog !== renderKey) {
    const values = new Map(
      queryAll(state.root, '[data-role="research-progress-input"]').map((input) => [
        input.dataset.treeId,
        input.value,
      ])
    );
    const seasons = new Map();
    for (const tree of trees) {
      if (!seasons.has(tree.season)) seasons.set(tree.season, []);
      seasons.get(tree.season).push(tree);
    }
    const seasonFilter = query(state.root, '[data-role="research-season-filter"]');
    const currentSeason = seasonFilter?.value || 'X1';
    if (seasonFilter) {
      const options = HERO_SEASON_MILESTONES.map((value) => {
        const option = createElement(state.root, 'option', '', value);
        option.value = value;
        return option;
      });
      replaceChildren(seasonFilter, ...options);
      seasonFilter.value = HERO_SEASON_MILESTONES.includes(currentSeason) ? currentSeason : 'X1';
    }
    const orderedSeasons = [...seasons.entries()].sort(([left], [right]) => {
      const leftRank = seasonRank(left) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = seasonRank(right) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.localeCompare(right);
    });
    const groups = orderedSeasons.map(([season, seasonTrees], seasonIndex) => {
      const group = createElement(state.root, 'section', 'boh-research-season');
      group.dataset.role = 'research-season-group';
      group.dataset.season = season;
      const headingId = `bohResearchSeason${seasonIndex}`;
      group.setAttribute('aria-labelledby', headingId);
      const header = createElement(state.root, 'div', 'boh-research-season__header');
      const heading = createElement(
        state.root,
        'h5',
        'boh-research-season__heading',
        state.tr('signup.researchSeason', '{season} research', { season })
      );
      heading.id = headingId;
      const maxAll = createElement(
        state.root,
        'button',
        'boh-research-season__max',
        state.tr('signup.researchMaxAll', 'Max all')
      );
      maxAll.type = 'button';
      maxAll.dataset.role = 'research-season-max';
      maxAll.dataset.season = season;
      maxAll.setAttribute(
        'aria-label',
        state.tr('signup.researchMaxAllLabel', 'Set all {season} research to 100%', { season })
      );
      append(header, heading, maxAll);
      append(group, header);
      for (const [treeIndex, tree] of seasonTrees.entries()) {
        const label = researchTreeLabel(state, tree);
        const inputId = `bohResearchProgress${seasonIndex}_${treeIndex}`;
        const row = createElement(state.root, 'div', 'boh-research-row');
        row.dataset.treeId = tree.id;
        const name = createElement(state.root, 'label', 'boh-research-row__name');
        name.htmlFor = inputId;
        const artIndex = verifiedResearchArt(tree);
        if (artIndex !== null) {
          const art = createElement(state.root, 'span', 'boh-research-row__art');
          art.setAttribute('aria-hidden', 'true');
          art.style.setProperty('--boh-research-art-column', String(artIndex % 6));
          art.style.setProperty('--boh-research-art-row', String(Math.floor(artIndex / 6)));
          art.dataset.verifiedResearchArt = '';
          append(name, art);
        }
        append(name, createElement(state.root, 'span', '', label));
        const input = createElement(state.root, 'input');
        input.id = inputId;
        input.type = 'number';
        input.inputMode = 'numeric';
        input.min = '0';
        input.max = '100';
        input.step = '1';
        input.name = `researchProgressPct.${tree.id}`;
        input.dataset.role = 'research-progress-input';
        input.dataset.treeId = tree.id;
        input.value = values.get(tree.id) ?? '';
        input.setAttribute(
          'aria-label',
          `${label}: ${state.tr('signup.researchPercent', 'Completion percent')}`
        );
        const actions = createElement(state.root, 'div', 'boh-research-quick-actions');
        for (const value of ['25', '50', '75', '100', '']) {
          const buttonLabel =
            value === '100'
              ? state.tr('signup.researchMax', 'Max')
              : value === ''
                ? state.tr('signup.researchClear', 'Clear')
                : `${value}%`;
          const ariaLabel =
            value === '100'
              ? state.tr('signup.researchMaxLabel', 'Set {tree} to 100%', { tree: label })
              : value === ''
                ? state.tr('signup.researchClearLabel', 'Clear {tree}', { tree: label })
                : state.tr('signup.researchQuickSet', 'Set {tree} to {percent}%', {
                    tree: label,
                    percent: value,
                  });
          const button = createElement(state.root, 'button', '', buttonLabel);
          button.type = 'button';
          button.dataset.role = 'research-progress-action';
          button.dataset.treeId = tree.id;
          button.dataset.value = value;
          button.setAttribute('aria-label', ariaLabel);
          append(actions, button);
        }
        append(row, name, input, actions);
        append(group, row);
      }
      return group;
    });
    replaceChildren(container, ...groups);
    state.renderedResearchCatalog = renderKey;
  }
  renderResearchSeasonFilter(state);
  renderResearchStatus(state);
}

function setFightingTimeError(state, key = '') {
  state.fightingTimeErrorKey = key;
  renderFightingTimes(state);
}

function setSignupFormError(state, message = '') {
  const error = query(state.root, '[data-role="signup-form-error"]');
  setText(error, message);
  setHidden(error, !message);
}

function renderFightingTimes(state) {
  const count = queryAll(state.root, '[name="fightingTimeIds"]:checked').length;
  setText(
    query(state.root, '[data-role="fighting-times-count"]'),
    state.tr('signup.fightingTimesCount', '{count} / 2 selected', { count })
  );
  const error = query(state.root, '[data-role="fighting-times-error"]');
  let message = '';
  if (state.fightingTimeErrorKey === 'signup.fightingTimesRequired') {
    message = state.tr(
      'signup.fightingTimesRequired',
      'Choose exactly two All-Star fighting times.'
    );
  } else if (state.fightingTimeErrorKey === 'signup.fightingTimesLimit') {
    message = state.tr(
      'signup.fightingTimesLimit',
      'Only two fighting times can be selected. Remove one before choosing another.'
    );
  }
  setText(error, message);
  setHidden(error, !message);
  query(state.root, '[data-role="fighting-times-fieldset"]')?.setAttribute?.(
    'aria-invalid',
    String(Boolean(message))
  );
}

function renderSignupPlanningControls(state) {
  renderHeroCatalog(state);
  renderResearchCatalog(state);
  renderFightingTimes(state);
}

function renderParticipationMode(state) {
  const allStar = state.participationMode !== 'epic-only';
  for (const element of queryAll(state.root, '[data-allstar-intake]')) setHidden(element, !allStar);
  if (allStar) renderSubmissionFeedback(state);
  else setHidden(query(state.root, '[data-role="submission-feedback"]'), true);
  const submit = query(state.root, '[data-role="signup-submit"]');
  if (submit) {
    setText(
      submit,
      allStar
        ? state.tr('signup.submitAll', 'Submit signup & Epic choices')
        : state.tr('showdown.submitOnly', 'Save Epic Showdown choices')
    );
  }
}

function renderVtsMembership(state) {
  const form = query(state.root, '[data-role="signup-form"]');
  const selected = query(form, '[name="vts1097Member"]:checked')?.value || '';
  const details = query(form, '[data-role="nonmember-fields"]');
  const required = selected === 'no';
  setHidden(details, !required);
  for (const input of queryAll(details, 'input, textarea')) input.required = required;
}

function hydrateForm(state) {
  const submission = state.submission;
  const form = query(state.root, '[data-role="signup-form"]');
  if (!submission || !form || state.dirty) return;
  const revision = finiteInteger(submission.revision);
  if (state.hydratedRevision === revision) return;
  updateInput(form, 'gameName', submission.gameName);
  updateInput(form, 'timezone', submission.timezone);
  for (const field of POWER_FIELDS) updateInput(form, field, submission.stats?.[field]);
  updateInput(form, 'rocLevel', submission.stats?.rocLevel);
  updateChecked(
    form,
    't10Types',
    submission.stats?.t10TroopTypes?.length === 3
      ? ['cavalry', 'archers', 'footmen', 'all']
      : submission.stats?.t10TroopTypes || submission.stats?.t9TroopTypes || []
  );
  updateChecked(form, 'speedHeroes', submission.stats?.readySpeedHeroes || []);
  state.troopOcrRows = (submission.stats?.troopRoster || [])
    .map(parseBohTroopInventoryRow)
    .filter(Boolean);
  const estimateTotals = troopEstimateTotals(submission.stats?.troopRoster || []);
  for (const [key, field] of TROOP_ESTIMATE_FIELDS) {
    const count = estimateTotals.get(key) || 0;
    updateInput(form, field, count ? Number((count / 1_000_000).toFixed(3)) : '');
  }
  const troopConfirmed = query(state.root, '[data-role="troop-ocr-confirmed"]');
  if (troopConfirmed) troopConfirmed.checked = state.troopOcrRows.length > 0;
  updateChecked(form, 'usableHeroNames', submission.stats?.usableHeroNames || []);
  const researchProgress = submission.stats?.researchProgressPct || {};
  for (const input of queryAll(form, '[data-role="research-progress-input"]')) {
    input.value = Object.hasOwn(researchProgress, input.dataset.treeId)
      ? researchProgress[input.dataset.treeId]
      : '';
  }
  updateChecked(form, 'availability', submission.commitment?.availability);
  updateChecked(form, 'fightingTimeIds', submission.commitment?.fightingTimeIds || []);
  updateChecked(form, 'teamNamePreferences', submission.commitment?.teamNamePreferences || []);
  updateInput(form, 'preferredRole', submission.commitment?.preferredRole || '');
  updateInput(form, 'secondaryRole', submission.commitment?.secondaryRole || '');
  updateChecked(
    form,
    'leadershipInterest',
    submission.commitment?.canHelpLead == null
      ? ''
      : submission.commitment.canHelpLead
        ? 'yes'
        : 'no'
  );
  updateInput(form, 'preferredTeammates', (submission.preferredTeammates || []).join('\n'));
  updateInput(form, 'playerNotes', submission.commitment?.notes);
  updateChecked(
    form,
    'vts1097Member',
    submission.commitment?.vts1097Member == null
      ? ''
      : submission.commitment.vts1097Member
        ? 'yes'
        : 'no'
  );
  updateInput(form, 'contactNumber', submission.commitment?.contactNumber);
  updateInput(form, 'currentState', submission.commitment?.currentState);
  updateInput(form, 'joinReason', submission.commitment?.joinReason);
  renderVtsMembership(state);
  setEntryMethod(state, submission.entryMethod);
  if (submission.entryMethod === 'ocr') {
    const values = { ...submission.stats, gameName: submission.gameName };
    state.ocrReview = {
      ocrValues: Object.freeze({ ...values }),
      confirmedValues: { ...values },
      confidence: {
        overall: submission.ocr?.confidence,
        ...(submission.ocr?.fieldConfidence || {}),
      },
      warnings: [...(submission.ocr?.warnings || [])],
      fieldIssues: {},
      isComplete: true,
      correctionAudit: {
        correctedFields: [],
      },
      requestId: '',
    };
  }
  state.hydratedRevision = revision;
  renderOcr(state);
  renderTroopOcr(state);
  renderSignupPlanningControls(state);
}

function renderSubmissionState(state) {
  renderSubmissionControls(state);
  hydrateForm(state);
  renderSubmissionFeedback(state);
}

function renderSubmissionControls(state) {
  const label = query(state.root, '[data-role="signup-save-state"]');
  const submit = query(state.root, '[data-role="signup-submit"]');
  const edit = query(state.root, '[data-role="edit-signup"]');
  setHidden(edit, state.submission?.status !== 'submitted');
  setBusy(submit, state.saving || !state.accessGranted);
  if (state.saving) setText(label, state.tr('signup.saving', 'Saving…'));
  else if (state.submission?.status === 'submitted') {
    setText(
      label,
      state.tr('signup.submitted', 'Submitted · revision {revision}', {
        revision: state.submission.revision || 1,
      })
    );
  } else setText(label, state.tr('signup.notSubmitted', 'Not submitted'));
}

function feedbackCopy(state, status, stale) {
  if (stale) {
    return {
      title: state.tr('feedback.correctionResubmittedTitle', 'Signup updated — review pending'),
      description: state.tr(
        'feedback.correctionResubmittedDescription',
        'Your newer submission is waiting for leadership to review again.'
      ),
      tone: 'pending',
    };
  }
  if (status === 'needs_correction') {
    return {
      title: state.tr('feedback.correctionTitle', 'Leadership requested a correction'),
      description: state.tr(
        'feedback.correctionDescription',
        'Update the requested details below and submit again. For a name or identity issue, use your exact in-game name and contact R5.'
      ),
      tone: 'warning',
    };
  }
  if (status === 'confirmed') {
    return {
      title: state.tr('feedback.confirmedTitle', 'Leadership confirmed your signup'),
      description: state.tr(
        'feedback.confirmedDescription',
        'Your confirmed information is ready for team balancing.'
      ),
      tone: 'success',
    };
  }
  if (status === 'excluded') {
    return {
      title: state.tr('feedback.excludedTitle', 'This signup is not in the current pool'),
      description: state.tr(
        'feedback.excludedDescription',
        'Read the leadership note below. Contact R5 if you need help or believe this should be reviewed.'
      ),
      tone: 'warning',
    };
  }
  return {
    title: state.tr('feedback.pendingTitle', 'Leadership review pending'),
    description: state.tr(
      'feedback.pendingDescription',
      'Your latest signup is waiting for leadership review.'
    ),
    tone: 'pending',
  };
}

export function selectBohSubmissionFeedback(submission, feedback) {
  if (!feedback) return null;
  const submissionRevision = finiteInteger(submission?.revision);
  const reviewedSubmissionRevision = finiteInteger(feedback.submissionRevision);
  return {
    ...feedback,
    stale: Boolean(
      submissionRevision &&
      reviewedSubmissionRevision &&
      submissionRevision !== reviewedSubmissionRevision
    ),
  };
}

function renderSubmissionFeedback(state) {
  const region = query(state.root, '[data-role="submission-feedback"]');
  const feedback = selectBohSubmissionFeedback(state.submission, state.submissionFeedback);
  setHidden(region, !feedback);
  if (!region || !feedback) return;
  const copy = feedbackCopy(state, feedback.status, feedback.stale);
  region.dataset.tone = copy.tone;
  setText(
    query(region, '[data-role="submission-feedback-kicker"]'),
    state.tr('feedback.kicker', 'SIGNUP REVIEW')
  );
  setText(query(region, '[data-role="submission-feedback-title"]'), copy.title);
  setText(query(region, '[data-role="submission-feedback-description"]'), copy.description);
  const note = query(region, '[data-role="submission-feedback-note"]');
  const currentNote = feedback.stale ? '' : feedback.note;
  setHidden(note, !currentNote);
  setText(note, currentNote);
  setText(
    query(region, '[data-role="submission-feedback-revision"]'),
    state.tr(
      'feedback.revision',
      'Submission revision {submissionRevision} · review revision {reviewRevision}',
      {
        submissionRevision: feedback.submissionRevision,
        reviewRevision: feedback.reviewRevision,
      }
    )
  );
}

function ocrIssueText(state, field) {
  if (state.ocrInvalidField === field) {
    return state.tr(
      'signup.powerHint',
      'Enter the full values shown in-game. Do not shorten 250,000,000 to 250M.'
    );
  }
  const corrected = state.ocrReview?.correctionAudit?.correctedFields?.includes(field);
  if (corrected)
    return state.tr('signup.ocrIssueCorrected', 'Corrected manually — verify once more.');
  const issues = state.ocrReview?.fieldIssues?.[field] || [];
  return issues
    .map((issue) => {
      if (issue.code === 'missing') {
        return state.tr('signup.ocrIssueMissing', 'Missing — enter this value.');
      }
      if (issue.code === 'low_confidence') {
        return state.tr(
          'signup.ocrIssueLowConfidence',
          'Low OCR confidence — compare this field with the screenshot.'
        );
      }
      if (issue.code === 'missing_confidence') {
        return state.tr(
          'signup.ocrIssueMissingConfidence',
          'OCR confidence unavailable — verify this field carefully.'
        );
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function renderOcrReviewAlert(state) {
  const alert = query(state.root, '[data-role="ocr-review-alert"]');
  setHidden(alert, !state.ocrReview);
  if (!alert || !state.ocrReview) return;
  const missingCount = REQUIRED_POWER_FIELDS.filter(
    (field) => state.ocrReview.confirmedValues?.[field] === null
  ).length;
  const hasIssues = Object.values(state.ocrReview.fieldIssues || {}).some(
    (issues) => Array.isArray(issues) && issues.length
  );
  const warnings = Array.isArray(state.ocrReview.warnings) ? state.ocrReview.warnings : [];
  alert.dataset.tone = missingCount ? 'warning' : hasIssues || warnings.length ? 'review' : 'ready';
  setText(
    query(alert, '[data-role="ocr-review-alert-title"]'),
    state.tr('signup.ocrCheckTitle', 'Check the highlighted OCR fields')
  );
  setText(
    query(alert, '[data-role="ocr-review-alert-description"]'),
    missingCount
      ? state.tr(
          'signup.ocrMissingSummary',
          'OCR missed {count} required field(s). Enter them before confirming.',
          { count: missingCount }
        )
      : state.tr(
          'signup.ocrCheckDescription',
          'Compare every value with the screenshot before confirming the draft.'
        )
  );
  const list = query(alert, '[data-role="ocr-warning-list"]');
  const items = warnings.map((warning) => createElement(state.root, 'li', '', warning));
  replaceChildren(list, ...items);
  setHidden(list, items.length === 0);
}

function renderOcr(state) {
  const preview = query(state.root, '[data-role="ocr-preview"]');
  const previewImage = query(state.root, '[data-role="ocr-preview-image"]');
  const reviewBadge = query(state.root, '[data-role="ocr-review-badge"]');
  const status = query(state.root, '[data-role="ocr-status"]');
  const process = query(state.root, '[data-role="ocr-process"]');
  const progress = query(state.root, '[data-role="ocr-progress"]');
  const isProcessing = state.ocrPhase === 'processing';
  const statusText = {
    processing: state.tr(
      'signup.ocrProcessing',
      'Reading screenshot—keep this page open. You may continue filling the form.'
    ),
    ready: state.tr(
      'signup.ocrReviewReady',
      'Power values filled automatically. Review the fields below.'
    ),
    error: state.tr(
      'signup.ocrError',
      'Screenshot reading failed. Retry, or enter or correct the values manually—you can still save your update.'
    ),
  }[state.ocrPhase];
  setHidden(preview, !state.ocrFile);
  if (previewImage) {
    if (state.ocrPreviewUrl) previewImage.src = state.ocrPreviewUrl;
    else previewImage.removeAttribute?.('src');
  }
  setText(
    query(state.root, '[data-role="ocr-file-name"]'),
    state.ocrFile?.name || state.tr('signup.ocrSelected', 'Screenshot selected')
  );
  setText(
    query(state.root, '[data-role="ocr-file-meta"]'),
    state.ocrFile
      ? `${Math.max(1, Math.round(state.ocrFile.size / 1024))} KB`
      : state.tr('signup.ocrReady', 'Ready to process')
  );
  setHidden(reviewBadge, !state.ocrReview);
  setHidden(progress, !isProcessing);
  if (progress && isProcessing) progress.removeAttribute?.('value');
  setBusy(process, state.ocrBusy || !state.ocrFile);
  setText(status, statusText || '');
  renderOcrReviewAlert(state);
  for (const input of queryAll(state.root, '[data-stat]')) {
    const confidence = state.ocrReview?.confidence?.[input.dataset.stat];
    const field = input.dataset.stat;
    const parent = input.closest?.('.boh-field') || input.parentElement;
    const output = parent?.querySelector?.('[data-role="ocr-field-confidence"]');
    const issue = parent?.querySelector?.('[data-role="ocr-field-issue"]');
    const issueText = state.ocrReview ? ocrIssueText(state, field) : '';
    setText(
      output,
      Number.isFinite(confidence)
        ? state.tr('signup.ocrConfidence', 'OCR confidence: {percent}%', {
            percent: Math.round(confidence * 100),
          })
        : ''
    );
    setText(issue, issueText);
    if (issue?.id) {
      const describedBy = new Set(
        textValue(input.getAttribute?.('aria-describedby')).split(/\s+/u)
      );
      describedBy.delete('');
      describedBy.add(issue.id);
      input.setAttribute?.('aria-describedby', [...describedBy].join(' '));
    }
    const corrected = state.ocrReview?.correctionAudit?.correctedFields?.includes(field);
    const missing =
      state.ocrReview?.confirmedValues?.[field] === null || state.ocrInvalidField === field;
    if (parent?.dataset) {
      if (!state.ocrReview) delete parent.dataset.ocrState;
      else if (missing) parent.dataset.ocrState = 'missing';
      else if (corrected) parent.dataset.ocrState = 'corrected';
      else if (issueText) parent.dataset.ocrState = 'review';
      else parent.dataset.ocrState = 'ready';
    }
    if (missing) input.setAttribute?.('aria-invalid', 'true');
    else input.removeAttribute?.('aria-invalid');
  }
}

function troopOcrCopy(state) {
  return TROOP_OCR_COPY[signupWindowLocale(state.language)] || TROOP_OCR_COPY.en;
}

function localizeTroopOcr(state) {
  const copy = troopOcrCopy(state);
  const roles = [
    'kicker',
    'title',
    'chip',
    'description',
    'example-top',
    'example-lower',
    'choose',
    'file-hint',
    'consent-label',
    'process',
    'remove',
    'review-title',
    'review-hint',
    'confirm-label',
  ];
  roles.forEach((role, index) =>
    setText(query(state.root, `[data-role="troop-ocr-${role}"]`), copy[index])
  );
}

function troopRowSelect(state, index, field, values, selected, labels = values) {
  const select = createElement(state.root, 'select', 'boh-input');
  if (!select) return null;
  select.dataset.role = 'troop-ocr-row-field';
  select.dataset.index = String(index);
  select.dataset.field = field;
  values.forEach((value, optionIndex) => {
    const option = createElement(state.root, 'option', '', labels[optionIndex]);
    option.value = value;
    option.selected = String(value) === String(selected ?? '');
    select.append(option);
  });
  return select;
}

function renderTroopOcr(state) {
  localizeTroopOcr(state);
  const copy = troopOcrCopy(state);
  const files = query(state.root, '[data-role="troop-ocr-file-list"]');
  setHidden(files, state.troopOcrFiles.length === 0);
  replaceChildren(
    files,
    ...state.troopOcrFiles.map((file, index) =>
      createElement(state.root, 'span', 'boh-chip', `${index + 1}. ${file.name}`)
    )
  );
  setBusy(
    query(state.root, '[data-role="troop-ocr-process"]'),
    state.troopOcrBusy || !state.troopOcrFiles.length
  );
  const review = query(state.root, '[data-role="troop-ocr-review"]');
  setHidden(review, state.troopOcrRows.length === 0);
  const rowsRoot = query(state.root, '[data-role="troop-ocr-rows"]');
  const modeValues = ['', 'normal', 'enhanced'];
  const modeLabels = [copy[18], copy[16], copy[17]];
  const rows = state.troopOcrRows.map((row, index) => {
    const container = createElement(state.root, 'div', 'boh-troop-review__row');
    if (!container) return null;
    if (row.needsReview) container.dataset.review = 'true';
    const type = troopRowSelect(state, index, 'troopType', BOH_TROOP_TYPES, row.troopType, [
      'Footmen',
      'Cavalry',
      'Archers',
    ]);
    const tier = troopRowSelect(state, index, 'tier', BOH_TROOP_TIERS, row.tier);
    const mode = troopRowSelect(
      state,
      index,
      'enhanced',
      modeValues,
      row.enhanced === true ? 'enhanced' : row.enhanced === false ? 'normal' : '',
      modeLabels
    );
    const count = createElement(state.root, 'input', 'boh-input');
    count.type = 'number';
    count.min = '0';
    count.max = '1000000000';
    count.inputMode = 'numeric';
    count.value = row.count ?? '';
    count.placeholder = copy[19];
    count.dataset.role = 'troop-ocr-row-field';
    count.dataset.index = String(index);
    count.dataset.field = 'count';
    const name = createElement(
      state.root,
      'span',
      'boh-troop-review__name',
      row.unitName || `#${index + 1}`
    );
    append(container, name, type, tier, mode, count);
    const serialized = serializeBohTroopInventoryRow(row);
    if (serialized) {
      const hidden = createElement(state.root, 'input');
      hidden.type = 'hidden';
      hidden.name = 'troopRoster';
      hidden.value = serialized;
      container.append(hidden);
    }
    return container;
  });
  replaceChildren(rowsRoot, ...rows);
  const confirmation = query(state.root, '[data-role="troop-ocr-confirmed"]');
  if (confirmation) {
    confirmation.disabled = state.troopOcrRows.some((row) => !serializeBohTroopInventoryRow(row));
    if (confirmation.disabled) confirmation.checked = false;
  }
}

function clearTroopOcr(state) {
  state.troopOcrFiles = [];
  state.troopOcrRows = [];
  state.troopOcrWarnings = [];
  const input = query(state.root, '[data-role="troop-ocr-file-input"]');
  if (input) input.value = '';
  setText(query(state.root, '[data-role="troop-ocr-status"]'), '');
  renderTroopOcr(state);
}

function selectTroopOcrFiles(state, files) {
  const selected = Array.from(files || []).slice(0, 4);
  if (!selected.length) return clearTroopOcr(state);
  for (const file of selected) {
    if (!/^image\/(?:png|jpeg|webp)$/u.test(file.type) || file.size > 10 * 1024 * 1024) {
      throw new TypeError(
        'Use up to four PNG, JPG, or WebP troop screenshots, 10 MB each or smaller.'
      );
    }
  }
  state.troopOcrFiles = selected;
  state.troopOcrRows = [];
  state.troopOcrWarnings = [];
  renderTroopOcr(state);
}

async function processTroopOcr(state) {
  if (!state.troopOcrFiles.length)
    throw new TypeError('Choose at least one Troop Details screenshot.');
  if (!query(state.root, '[data-role="troop-ocr-consent"]')?.checked) {
    throw new TypeError('Confirm the troop OCR processing notice first.');
  }
  const prepare = state.ocr.prepareBohStatsScreenshot || state.ocr.prepareScreenshot;
  const transport = state.ocr.process || state.ocr.recognize || state.ocr.request;
  if (typeof prepare !== 'function' || typeof transport !== 'function')
    throw new TypeError('Troop OCR is not available.');
  state.troopOcrBusy = true;
  renderTroopOcr(state);
  const detected = [];
  const warnings = [];
  try {
    for (let index = 0; index < state.troopOcrFiles.length; index += 1) {
      setText(
        query(state.root, '[data-role="troop-ocr-status"]'),
        signupWindowTemplate(troopOcrCopy(state)[14], {
          current: index + 1,
          total: state.troopOcrFiles.length,
        })
      );
      const prepared = await prepare(state.troopOcrFiles[index]);
      const request = buildBohTroopOcrRequest({
        seasonId: state.store?.seasonId || state.options.seasonId,
        imageData: prepared.imageData,
      });
      const response = await transport(request);
      const parsed = parseBohTroopOcrResult(response?.result || response);
      detected.push(...parsed.rows);
      warnings.push(...parsed.warnings);
    }
    state.troopOcrRows = mergeBohTroopOcrRows(detected);
    state.troopOcrWarnings = warnings;
    const confirmed = query(state.root, '[data-role="troop-ocr-confirmed"]');
    if (confirmed) confirmed.checked = false;
    setText(
      query(state.root, '[data-role="troop-ocr-status"]'),
      signupWindowTemplate(troopOcrCopy(state)[15], { count: state.troopOcrRows.length })
    );
  } finally {
    state.troopOcrBusy = false;
    renderTroopOcr(state);
  }
}

function updateTroopOcrRow(state, target) {
  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  if (!Number.isInteger(index) || !state.troopOcrRows[index]) return;
  const row = { ...state.troopOcrRows[index] };
  if (field === 'enhanced')
    row.enhanced = target.value === 'enhanced' ? true : target.value === 'normal' ? false : null;
  else if (field === 'count') row.count = /^\d+$/u.test(target.value) ? Number(target.value) : null;
  else row[field] = target.value;
  row.needsReview = !serializeBohTroopInventoryRow(row);
  state.troopOcrRows[index] = row;
  renderTroopOcr(state);
}

function currentTeam(state) {
  const teamId = state.personalPlan?.teamId;
  return teamId ? state.teams.get(teamId) || null : null;
}

function renderPublicationStates(state) {
  const publishedTeamCount = finiteInteger(state.publication?.teamCount);
  const teamCount = publishedTeamCount >= 2 && publishedTeamCount <= 6 ? publishedTeamCount : 6;
  setText(
    query(state.root, '[data-role="all-teams-kicker"]'),
    state.tr('announcement.allTeamsKicker', '{teams} TEAMS · {players} PLAYERS', {
      teams: teamCount,
      players: teamCount * 12,
    })
  );
  const selected = selectBohPlayerStates({
    accessGranted: state.accessGranted,
    publication: state.publication,
    personalPlan: state.personalPlan,
    team: currentTeam(state),
  });
  const announcementMap = {
    locked: 'announcement-state-locked',
    unpublished: 'announcement-state-unpublished',
    unassigned: 'announcement-state-unassigned',
    assigned: 'announcement-state-assigned',
  };
  const planMap = {
    locked: 'plan-state-locked',
    unpublished: 'plan-state-unpublished',
    unassigned: 'plan-state-unassigned',
    assigned: 'plan-state-published',
  };
  for (const role of Object.values(announcementMap)) {
    setHidden(
      query(state.root, `[data-role="${role}"]`),
      announcementMap[selected.announcement] !== role
    );
  }
  for (const role of Object.values(planMap)) {
    setHidden(query(state.root, `[data-role="${role}"]`), planMap[selected.plan] !== role);
  }
  setText(
    query(state.root, '[data-role="announcement-version"]'),
    publicationFlag(state.publication, 'announcement')
      ? state.tr('status.publishedRevision', 'Published · revision {revision}', {
          revision: state.publication?.revision || 1,
        })
      : state.tr('status.awaitingPublication', 'Awaiting publication')
  );
  setText(
    query(state.root, '[data-role="plan-version"]'),
    publicationFlag(state.publication, 'plan')
      ? state.tr('status.publishedRevision', 'Published · revision {revision}', {
          revision: state.publication?.activePlanRevision || state.publication?.revision || 1,
        })
      : state.tr('status.awaitingPublication', 'Awaiting publication')
  );
  if (selected.announcement === 'assigned') renderTeam(state);
  if (selected.plan === 'assigned') renderPlan(state);
}

function localizedDefaultRole(state, roleId) {
  if (roleId === 'offensive') return state.tr('role.offensive', 'Offensive team');
  if (roleId === 'rune') return state.tr('role.rune', 'Rune team');
  if (roleId === 'top') return state.tr('role.top', 'Top side');
  if (roleId === 'bottom') return state.tr('role.bottom', 'Bottom side');
  if (roleId === 'backup') return state.tr('role.backup', 'Backup / rotating player');
  if (roleId === 'flexible') {
    return state.tr('role.flexible', 'Flexible — place me where needed');
  }
  return '';
}

function displayRoleLabel(state, roleIdInput, labelInput) {
  const roleId = textValue(roleIdInput).toLowerCase();
  const label = textValue(labelInput);
  const localized = localizedDefaultRole(state, roleId);
  if (localized && (!label || isCanonicalLabel(label, DEFAULT_ROLE_LABELS[roleId]))) {
    return localized;
  }
  return label || localized || state.tr('common.role', 'Role');
}

function displayTeamName(state, team, fallbackNumber) {
  const number = finiteInteger(team?.number, finiteInteger(fallbackNumber));
  const label = textValue(team?.name || team?.label);
  if (!label || (number && isCanonicalLabel(label, [`Team ${number}`]))) {
    return state.tr('common.teamNumber', 'Team {number}', { number: number || '—' });
  }
  return label;
}

function localizedDefaultPhase(state, phaseId) {
  if (phaseId === 'phase-0-5') return state.tr('phase.opening', 'Opening');
  if (phaseId === 'phase-5-10') return state.tr('phase.setup', 'Setup');
  if (phaseId === 'phase-10-15') return state.tr('phase.pressure', 'Pressure');
  if (phaseId === 'phase-15-30') return state.tr('phase.endgame', 'Endgame');
  return '';
}

function displayPhaseLabel(state, entry, index) {
  const phaseId = textValue(entry?.phaseId || entry?.id);
  const label = textValue(entry?.phaseLabel || entry?.label);
  const localized = localizedDefaultPhase(state, phaseId);
  if (localized && (!label || isCanonicalLabel(label, DEFAULT_PHASE_LABELS[phaseId]))) {
    return localized;
  }
  return (
    label ||
    localized ||
    state.tr('phase.number', 'Phase {number}', {
      number: index + 1,
    })
  );
}

function displayLegionLabel(state, legion, index) {
  const number = finiteInteger(legion?.order, index + 1);
  const label = textValue(legion?.label || legion?.name);
  if (!label || isCanonicalLabel(label, [`Legion ${number}`])) {
    return state.tr('common.legionNumber', 'Legion {number}', { number });
  }
  return label;
}

function renderRoster(state, target, team) {
  if (!target) return;
  const seats = [...(team?.seats || [])].sort((left, right) => left.seatNumber - right.seatNumber);
  const children = seats.map((seat) => {
    const item = createElement(state.root, 'li');
    item.dataset.seat = String(seat.seatNumber);
    const number = createElement(state.root, 'span', '', seat.seatNumber);
    const name = createElement(
      state.root,
      'strong',
      '',
      seat.displayName || state.tr('announcement.playerPlaceholder', 'Player assignment')
    );
    const role = createElement(
      state.root,
      'small',
      '',
      displayRoleLabel(state, seat.roleGroupId || seat.roleId, seat.roleLabel)
    );
    append(item, number, name, role);
    return item;
  });
  replaceChildren(target, ...children);
}

function renderTeam(state) {
  const plan = state.personalPlan || {};
  const team = currentTeam(state) || {};
  const seat = (team.seats || []).find((entry) => entry.seatNumber === plan.seatNumber);
  const captain = (team.seats || []).find((entry) => entry.playerId === team.captainId);
  setText(
    query(state.root, '[data-role="my-team-number"]'),
    state.tr('common.teamNumber', 'Team {number}', {
      number: plan.teamNumber || team.number || '—',
    })
  );
  setText(
    query(state.root, '[data-role="my-team-name"]'),
    displayTeamName(state, { ...team, name: plan.teamName || team.name }, plan.teamNumber)
  );
  setText(
    query(state.root, '[data-role="my-team-captain"]'),
    captain?.displayName || state.tr('status.toBeAnnounced', 'To be announced')
  );
  setText(query(state.root, '[data-role="my-seat-number"]'), plan.seatNumber || '—');
  setText(
    query(state.root, '[data-role="my-starting-role"]'),
    displayRoleLabel(
      state,
      plan.roleGroupId || plan.roleId || seat?.roleGroupId || seat?.roleId,
      plan.roleLabel || seat?.roleLabel
    )
  );
  renderRoster(state, query(state.root, '[data-role="my-team-roster"]'), team);
  renderTeamOverview(state);
}

function renderTeamOverview(state) {
  const target = query(state.root, '[data-role="team-overview"]');
  if (!target) return;
  const ids = state.publication?.teamIds?.length
    ? state.publication.teamIds
    : Array.from({ length: 6 }, (_, index) => `team-${index + 1}`);
  const buttons = ids.slice(0, 6).map((teamId, index) => {
    const team = state.teams.get(teamId);
    const button = createElement(state.root, 'button', 'boh-team-summary');
    button.type = 'button';
    button.dataset.teamId = teamId;
    button.setAttribute('aria-controls', 'bohTeamOverviewDetail');
    button.setAttribute('aria-expanded', String(teamId === state.selectedTeamId));
    button.classList.toggle('is-mine', teamId === state.personalPlan?.teamId);
    const number = createElement(
      state.root,
      'span',
      'boh-team-summary__number',
      String(team?.number || index + 1).padStart(2, '0')
    );
    const copy = createElement(state.root, 'span');
    append(
      copy,
      createElement(state.root, 'strong', '', displayTeamName(state, team, index + 1)),
      createElement(
        state.root,
        'small',
        '',
        state.tr('announcement.viewRosterHint', '12 players · View roster')
      )
    );
    append(button, number, copy);
    if (teamId === state.personalPlan?.teamId) {
      append(
        button,
        createElement(
          state.root,
          'span',
          'boh-chip boh-chip--success',
          state.tr('announcement.myTeam', 'My team')
        )
      );
    }
    return button;
  });
  replaceChildren(target, ...buttons);
  if (state.selectedTeamId) renderTeamDetail(state, state.selectedTeamId);
}

function renderTeamDetail(state, teamId) {
  const detail = query(state.root, '[data-role="team-overview-detail"]');
  const team = state.teams.get(teamId);
  for (const button of queryAll(state.root, '[data-role="team-overview"] .boh-team-summary')) {
    button.setAttribute('aria-expanded', String(Boolean(team) && button.dataset.teamId === teamId));
  }
  if (!detail || !team) {
    setHidden(detail, true);
    detail?.removeAttribute?.('aria-labelledby');
    return;
  }
  const title = createElement(state.root, 'h5', '', displayTeamName(state, team));
  title.id = 'bohTeamOverviewDetailTitle';
  detail.setAttribute('aria-labelledby', title.id);
  const list = createElement(state.root, 'ol', 'boh-roster-grid');
  renderRoster(state, list, team);
  replaceChildren(detail, title, list);
  detail.hidden = false;
}

function displayInstruction(state, entry) {
  if (isStandbyInstruction(entry)) {
    return {
      action:
        instructionValue(entry, 'action', 'title') || state.tr('plan.standbyAction', 'Stand by'),
      target:
        instructionValue(entry, 'note', 'leadershipNote') ||
        state.tr('plan.standbyTarget', 'Hold position and wait for call.'),
      loadout: '',
      teleport: '',
      note: instructionValue(entry, 'note', 'leadershipNote'),
      standby: true,
      gatherCrystals: false,
      hasTeleport: false,
    };
  }
  const teleport = instructionValue(entry, 'teleport', 'teleportNote');
  return {
    action: instructionValue(entry, 'action', 'title', 'summary', 'instruction') || '—',
    target:
      instructionValue(
        entry,
        'target',
        'targetRoute',
        'routeText',
        'objectiveLabel',
        'objectiveId'
      ) || '—',
    loadout: instructionValue(entry, 'loadout', 'troopsHeroes', 'troops', 'heroes') || '—',
    teleport: isMeaningfulTeleport(teleport) ? teleport : '',
    note: instructionValue(entry, 'note', 'leadershipNote'),
    standby: false,
    gatherCrystals: entry?.instruction?.gatherCrystals === true,
    hasTeleport: isMeaningfulTeleport(teleport),
  };
}

function phaseTime(state, entry) {
  if (!entry) return '—';
  return state.tr('phase.minuteRange', '{start}–{end} min', {
    start: finiteInteger(entry.startMinute),
    end: finiteInteger(entry.endMinute),
  });
}

function renderNowNext(state, view) {
  const current = displayInstruction(state, view.current);
  const next = displayInstruction(state, view.next);
  const currentCard = query(state.root, '[data-role="current-instruction"]');
  const nextCard = query(state.root, '[data-role="next-instruction"]');
  currentCard?.classList?.toggle('is-standby', current.standby);
  nextCard?.classList?.toggle('is-standby', view.next ? next.standby : false);
  setText(query(state.root, '[data-role="current-phase-time"]'), phaseTime(state, view.current));
  setText(
    query(state.root, '[data-role="current-action"]'),
    current.standby ? state.tr('plan.standbyTitle', 'Standby assignment') : current.action
  );
  setText(query(state.root, '[data-role="current-target"]'), current.target);
  const currentLoadout = query(state.root, '[data-role="current-loadout"]');
  const currentTeleport = query(state.root, '[data-role="current-teleport"]');
  setHidden(currentLoadout, current.standby || !current.loadout || current.loadout === '—');
  setHidden(currentTeleport, current.standby || !current.hasTeleport);
  setText(
    currentLoadout,
    state.tr('plan.loadoutValue', 'Loadout: {value}', { value: current.loadout })
  );
  setText(
    currentTeleport,
    state.tr('plan.teleportValue', 'Teleport: {value}', { value: current.teleport })
  );
  setText(query(state.root, '[data-role="next-phase-time"]'), phaseTime(state, view.next));
  setText(
    query(state.root, '[data-role="next-action"]'),
    view.next
      ? next.standby
        ? state.tr('plan.standbyTitle', 'Standby assignment')
        : next.action
      : state.tr('plan.noNextPhase', 'Final phase')
  );
  setText(
    query(state.root, '[data-role="next-target"]'),
    view.next ? next.target : state.tr('plan.noNextInstruction', 'No later instruction.')
  );
}

function buildPhasePanel(state, entry, index) {
  const display = displayInstruction(state, entry);
  const heading = createElement(state.root, 'div', 'boh-phase-panel__head');
  const headingCopy = createElement(state.root, 'div');
  append(
    headingCopy,
    createElement(
      state.root,
      'span',
      'boh-phase-number',
      state.tr('phase.numberLabel', 'PHASE {number}', {
        number: String(index + 1).padStart(2, '0'),
      })
    ),
    createElement(
      state.root,
      'h5',
      '',
      `${displayPhaseLabel(state, entry, index)} · ${phaseTime(state, entry)}`
    )
  );
  append(
    heading,
    headingCopy,
    createElement(
      state.root,
      'span',
      'boh-role-pill',
      displayRoleLabel(state, entry?.roleGroupId || entry?.roleId, entry?.roleLabel)
    )
  );
  const list = createElement(state.root, 'dl', 'boh-instruction-list');
  const rows = display.standby
    ? [
        [state.tr('plan.action', 'Action'), state.tr('plan.standbyTitle', 'Standby assignment')],
        [state.tr('plan.standbyStatus', 'Standby status'), display.target],
      ]
    : [
        [state.tr('plan.action', 'Action'), display.action],
        [state.tr('plan.targetRoute', 'Target / route'), display.target],
        [state.tr('plan.troopsHeroes', 'Troops & heroes'), display.loadout],
        ...(display.hasTeleport ? [[state.tr('plan.teleport', 'Teleport'), display.teleport]] : []),
      ];
  for (const [label, value] of rows) {
    const row = createElement(state.root, 'div');
    append(
      row,
      createElement(state.root, 'dt', '', label),
      createElement(state.root, 'dd', '', value)
    );
    append(list, row);
  }
  const note = createElement(state.root, 'aside', 'boh-command-note');
  note.hidden = !display.note;
  append(
    note,
    createElement(state.root, 'strong', '', state.tr('plan.leadershipNote', 'Leadership note')),
    createElement(state.root, 'p', '', display.note)
  );
  const cards = [];
  if (display.gatherCrystals) {
    const crystal = createElement(state.root, 'aside', 'boh-action-card boh-action-card--crystal');
    append(
      crystal,
      createElement(state.root, 'strong', '', state.tr('plan.crystalTitle', 'Gather crystals')),
      createElement(
        state.root,
        'p',
        '',
        state.tr(
          'plan.crystalDescription',
          'Use this Legion for Sacred Crystal Mine gathering in this phase.'
        )
      )
    );
    cards.push(crystal);
  }
  if (display.hasTeleport) {
    const teleport = createElement(
      state.root,
      'aside',
      'boh-action-card boh-action-card--teleport'
    );
    append(
      teleport,
      createElement(
        state.root,
        'strong',
        '',
        state.tr('plan.teleportNowTitle', 'Teleport assigned')
      ),
      createElement(state.root, 'p', '', display.teleport)
    );
    cards.push(teleport);
  }
  return [heading, list, note, ...cards];
}

function ensureTimelinePhaseSockets(state, count) {
  const tabList = query(state.root, '[data-role="phase-tabs"]');
  const summary = query(state.root, '[data-role="phase-summary-list"]');
  const firstPanel = query(state.root, '[data-role="phase-panel"]');
  const panelHost = summary?.parentElement || firstPanel?.parentElement;
  const tabs = queryAll(tabList, '[role="tab"]');
  const panels = queryAll(panelHost, '[data-role="phase-panel"]');
  for (let index = tabs.length; index < count; index += 1) {
    const tabId = `bohPhase${index}Tab`;
    const panelId = `bohPhase${index}Panel`;
    const tab = createElement(state.root, 'button');
    tab.type = 'button';
    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    tabList?.append?.(tab);
    tabs.push(tab);

    const panel = createElement(state.root, 'article', 'boh-phase-panel');
    panel.id = panelId;
    panel.dataset.role = 'phase-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.hidden = true;
    if (summary && panelHost?.insertBefore) panelHost.insertBefore(panel, summary);
    else panelHost?.append?.(panel);
    panels.push(panel);
  }
  return { tabs, panels };
}

function renderTimeline(state, view) {
  const { tabs, panels } = ensureTimelinePhaseSockets(state, view.timeline.length);
  setText(
    query(state.root, '[data-boh-i18n="plan.timelineTitle"]'),
    state.tr('plan.timelineTitleDynamic', 'Your {count} phases', {
      count: view.timeline.length,
    })
  );
  view.timeline.forEach((entry, index) => {
    const tab = tabs[index];
    const panel = panels[index];
    if (!tab || !panel) return;
    const selected = entry.phaseId === view.phaseId;
    tab.hidden = false;
    tab.dataset.phaseId = entry.phaseId;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    replaceChildren(
      tab,
      createElement(state.root, 'span', '', String(index + 1).padStart(2, '0')),
      createElement(
        state.root,
        'strong',
        '',
        `${finiteInteger(entry.startMinute)}–${finiteInteger(entry.endMinute)}`
      ),
      createElement(state.root, 'small', '', displayPhaseLabel(state, entry, index))
    );
    panel.dataset.phaseId = entry.phaseId;
    panel.hidden = !selected;
    replaceChildren(panel, ...buildPhasePanel(state, entry, index));
  });
  for (let index = view.timeline.length; index < tabs.length; index += 1) {
    tabs[index].hidden = true;
    if (panels[index]) panels[index].hidden = true;
  }
  const summary = query(state.root, '[data-role="phase-summary-list"]');
  const items = view.timeline.map((entry) => {
    const item = createElement(state.root, 'li');
    item.dataset.phaseId = entry.phaseId;
    item.classList.toggle('is-current', entry.phaseId === view.phaseId);
    item.classList.toggle('has-rotation', entry.rotated === true);
    item.classList.toggle('is-standby', isStandbyInstruction(entry));
    append(
      item,
      createElement(
        state.root,
        'span',
        '',
        `${finiteInteger(entry.startMinute)}–${finiteInteger(entry.endMinute)}`
      ),
      createElement(state.root, 'strong', '', displayInstruction(state, entry).action),
      createElement(
        state.root,
        'small',
        '',
        isStandbyInstruction(entry)
          ? state.tr('plan.standbySummary', 'Standby - wait for call')
          : entry.rotated
            ? `↻ ${displayRoleLabel(state, entry.roleGroupId || entry.roleId, entry.roleLabel)}`
            : displayRoleLabel(state, entry.roleGroupId || entry.roleId, entry.roleLabel)
      )
    );
    return item;
  });
  replaceChildren(summary, ...items);
}

function renderMapObjectives(state, descriptor) {
  const layer = query(state.root, '[data-role="map-objectives"]');
  if (!layer) return;
  const nodes = (descriptor.nodes || []).map((node) => {
    const selected = node.id && node.id === state.selectedObjectiveId;
    const group = createSvgElement(state.root, 'g', {
      class: `boh-map__objective is-${node.type || 'objective'}${node.isTarget ? ' is-target' : ''}${node.onRoute ? ' is-route' : ''}${selected ? ' is-selected' : ''}`,
      transform: `translate(${node.x} ${node.y})`,
      'data-objective-id': node.id,
      'data-role': 'map-objective',
      role: 'button',
      tabindex: '0',
      'aria-label': node.label,
      'aria-pressed': String(selected),
    });
    const title = createSvgElement(state.root, 'title');
    if (title) title.textContent = node.label;
    const hitTarget = createSvgElement(state.root, 'rect', {
      class: 'boh-map__objective-hit',
      // Sized so the smallest rendered scale (390px viewport, where the map
      // projects at ~0.63 CSS px per user unit) still clears the 44 CSS-pixel
      // minimum touch target on both axes.
      x: -36,
      y: -39,
      width: 72,
      height: 76,
      rx: 8,
    });
    const pole = createSvgElement(state.root, 'path', {
      class: 'boh-map__flag-pole',
      d: 'M -8 13 L -8 -30',
    });
    const flag = createSvgElement(state.root, 'path', {
      class: 'boh-map__flag-cloth',
      d: 'M -7 -29 L 21 -23 L 12 -14 L -7 -17 Z',
    });
    const base = createSvgElement(state.root, 'path', {
      class: 'boh-map__flag-base',
      d: 'M -18 16 L 2 16 L 10 22 L -24 22 Z',
    });
    const badge = createSvgElement(state.root, 'rect', {
      class: 'boh-map__flag-code-bg',
      x: -23,
      y: 20,
      width: 46,
      height: 23,
      rx: 7,
    });
    const code = createSvgElement(state.root, 'text', {
      class: 'boh-map__flag-code',
      x: 0,
      y: 37,
      'text-anchor': 'middle',
    });
    if (code) code.textContent = node.code;
    const label = createSvgElement(state.root, 'text', {
      class: 'boh-map__label',
      x: 0,
      y: 58,
      'text-anchor': 'middle',
    });
    if (label) label.textContent = node.label;
    append(group, title, hitTarget, pole, flag, base, badge, code, label);
    return group;
  });
  replaceChildren(layer, ...nodes);
}

function objectiveAssignmentNames(state, node) {
  const isPersonalMatch = node?.onRoute === true || node?.isTarget === true;
  if (!isPersonalMatch) return [];
  const name = textValue(state.personalPlan?.displayName || state.submission?.gameName);
  return name ? [name] : [];
}

function objectiveFieldStructure(node) {
  const code = textValue(node?.code);
  if (!code) return null;
  const structures = [
    ...(BohField.BOH_STAGE1_FIELD || []),
    ...(BohField.bohLaneTowers?.(BohField.BOH_STAGE1_DEFAULT_SIDE) || []),
  ];
  return (
    structures.find(
      (structure) =>
        BohField.bohStructureLabel(structure, BohField.BOH_STAGE1_DEFAULT_SIDE) === code
    ) || null
  );
}

function renderObjectiveDetail(state, descriptor) {
  const panel = query(state.root, '[data-role="map-objective-detail"]');
  if (!panel) return;
  const selected = (descriptor.nodes || []).find((node) => node.id === state.selectedObjectiveId);
  setHidden(panel, !selected);
  if (!selected) return;
  const assignments = objectiveAssignmentNames(state, selected);
  const title = createElement(state.root, 'h5', '', selected.label);
  const meta = createElement(
    state.root,
    'p',
    'boh-map-selection__meta',
    selected.isTarget
      ? state.tr('plan.objectiveCurrentTarget', 'Current target')
      : selected.onRoute
        ? state.tr('plan.objectiveOnRoute', 'On your route')
        : state.tr('plan.objectiveStructure', 'Structure')
  );
  const fieldStructure = objectiveFieldStructure(selected);
  const coordinates =
    Number.isFinite(fieldStructure?.x) && Number.isFinite(fieldStructure?.y)
      ? `${fieldStructure.x}:${fieldStructure.y}`
      : '';
  const structureDetails = createElement(
    state.root,
    'p',
    'boh-map-selection__structure',
    [
      textValue(selected.code),
      fieldKindLabel(state, fieldStructure?.kind || selected.type),
      coordinates,
    ]
      .filter(Boolean)
      .join(' · ')
  );
  const assignmentNodes = assignments.length
    ? [
        createElement(state.root, 'strong', '', state.tr('plan.yourRoute', 'Your route')),
        createElement(state.root, 'p', '', assignments.join(', ')),
      ]
    : [
        createElement(
          state.root,
          'p',
          'boh-map-selection__empty',
          state.tr(
            'plan.objectiveNoAssignments',
            'No personal assignment at this structure in your current plan.'
          )
        ),
      ];
  replaceChildren(panel, title, meta, structureDetails, ...assignmentNodes);
}

function renderTowerNetwork(state) {
  const layer = query(state.root, '[data-role="map-network"]');
  if (!layer) return;
  const network = BohField.bohStage1TerritoryNetwork(BohField.BOH_STAGE1_DEFAULT_SIDE);
  const mapPoint = (point) => [
    (Number(point?.x) / 100) * BOH_MAP_VIEWBOX.width,
    (Number(point?.y) / 100) * BOH_MAP_VIEWBOX.height,
  ];
  const pathFor = (points, className, routeId) => {
    const projected = (points || []).map(mapPoint).filter(([x, y]) => Number.isFinite(x + y));
    if (projected.length < 2) return null;
    return createSvgElement(state.root, 'path', {
      class: className,
      'data-network-route': routeId,
      d: projected
        .map(([x, y], index) => `${index ? 'L' : 'M'} ${Math.round(x)} ${Math.round(y)}`)
        .join(' '),
    });
  };
  const squares = (network.territories || []).map((territory) =>
    createSvgElement(state.root, 'rect', {
      class: 'boh-map__territory-square',
      'data-territory-tower': territory.towerId,
      x: Math.round((territory.x / 100) * BOH_MAP_VIEWBOX.width),
      y: Math.round((territory.y / 100) * BOH_MAP_VIEWBOX.height),
      width: Math.round((territory.width / 100) * BOH_MAP_VIEWBOX.width),
      height: Math.round((territory.height / 100) * BOH_MAP_VIEWBOX.height),
      rx: 6,
    })
  );
  const routes = [
    pathFor(network.routes?.main, 'boh-map__network-path is-main', 'main'),
    ...(network.routes?.branches || []).map((branch) =>
      pathFor(branch.points, 'boh-map__network-path is-branch', branch.id)
    ),
  ].filter(Boolean);
  replaceChildren(layer, ...squares, ...routes);
}

function renderMap(state, entry) {
  const plan = planWithFieldObjectives(state);
  const descriptor = buildBohRouteDescriptor(entry, plan, {
    startFallback: state.tr('plan.routeStartFallback', 'Assigned start'),
    viaFallback: state.tr('plan.directRoute', 'Direct route'),
    targetFallback: state.tr('plan.currentTarget', 'Current target'),
  });
  const route = query(state.root, '[data-role="map-route"]');
  const image = query(state.root, '[data-role="map-image"]');
  image?.setAttribute?.('href', BohField.BOH_STAGE1_MAP_ASSET_PATH || 'assets/boh/stage1-map.webp');
  route?.setAttribute?.('d', descriptor.path);
  setHidden(route, !descriptor.path);
  renderTowerNetwork(state);
  renderMapObjectives(state, descriptor);
  renderObjectiveDetail(state, descriptor);
  setText(query(state.root, '[data-role="route-start"]'), descriptor.start);
  setText(query(state.root, '[data-role="route-via"]'), descriptor.via);
  setText(query(state.root, '[data-role="route-target"]'), descriptor.target);
  const description = query(state.root, '#bohMapSvgDesc');
  setText(
    description,
    state.tr('plan.mapRouteDescription', 'Highlighted personal route: {route}.', {
      route: descriptor.description,
    })
  );
  const svg = query(state.root, '[data-role="personal-map-svg"]');
  svg?.setAttribute?.('aria-label', descriptor.description);
}

function renderCommandWorkspace(state) {
  const team = currentTeam(state);
  const workspace = query(state.root, '[data-role="command-workspace"]');
  if (!team || !workspace) return;
  const view = buildBohCommandView({
    team,
    playerId: state.store?.uid,
    phaseId: state.selectedCommandPhaseId,
    phases: BOH_STAGE1_PHASES,
    milestones: BOH_STAGE1_MILESTONES,
    timelineBuilder: bohStage1Timeline,
    structureCodes: BohField.bohStructureCodes,
    objectives: fieldObjectivesFor(state),
  });
  state.selectedCommandPhaseId = view.phaseId;
  workspace.dataset.commandMode = state.selectedCommandMode;
  workspace.closest?.('.boh-plan')?.setAttribute('data-command-mode', state.selectedCommandMode);
  for (const tab of queryAll(workspace, '[data-role="command-mode-tab"]')) {
    const selected = tab.dataset.commandMode === state.selectedCommandMode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const panel of queryAll(workspace, '[data-role="command-mode-panel"]')) {
    setHidden(panel, panel.dataset.commandMode !== state.selectedCommandMode);
  }
  const commandTabList = query(workspace, '.boh-command-phase-tabs');
  const commandTabs = queryAll(commandTabList, '[data-role="command-phase-tab"]');
  for (let index = commandTabs.length; index < view.phases.length; index += 1) {
    const tab = createElement(state.root, 'button');
    tab.type = 'button';
    tab.dataset.role = 'command-phase-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    append(tab, createElement(state.root, 'strong'), createElement(state.root, 'small'));
    commandTabList?.append?.(tab);
    commandTabs.push(tab);
  }
  commandTabs.forEach((tab, index) => {
    const phase = view.phases[index];
    tab.hidden = !phase;
    if (!phase) return;
    tab.dataset.phaseId = phase.id;
    const selected = phase.id === view.phaseId;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    setText(query(tab, 'strong'), `${phase.startMinute}-${phase.endMinute}`);
    setText(query(tab, 'small'), phase.label || '');
  });
  setText(query(workspace, '[data-role="command-phase-title"]'), view.phase?.label || '');
  setText(query(workspace, '[data-role="command-phase-unlocks"]'), view.milestone?.unlocks || '');
  setText(query(workspace, '[data-role="command-teleport-cue"]'), view.milestone?.teleport || '');
  setText(query(workspace, '[data-role="command-crystal-cue"]'), view.milestone?.crystal || '');
  const rosterItems = view.roster.map((seat) => {
    const item = createElement(state.root, 'li', seat.isCurrentPlayer ? 'is-current' : '');
    const title = createElement(
      state.root,
      'strong',
      '',
      `${seat.seatNumber}. ${seat.displayName}`
    );
    const meta = [seat.isBackup ? 'Backup' : 'Main', seat.side, seat.commandRole]
      .filter(Boolean)
      .join(' / ');
    append(item, title, createElement(state.root, 'small', '', meta));
    return item;
  });
  replaceChildren(query(workspace, '[data-role="command-roster"]'), ...rosterItems);
  const laneCards = view.roleLanes.map((lane) => {
    const card = createElement(state.root, 'article', 'boh-command-lane');
    append(card, createElement(state.root, 'h5', '', lane.label));
    const list = createElement(state.root, 'ul');
    for (const player of lane.players) {
      const item = createElement(state.root, 'li', player.isCurrentPlayer ? 'is-current' : '');
      append(item, createElement(state.root, 'strong', '', player.displayName));
      const duties = player.orders.map((order) => {
        const cue = [order.action, order.target, order.teleport].filter(Boolean).join(' / ');
        return createElement(state.root, 'span', order.standby ? 'is-standby' : '', cue);
      });
      append(item, ...duties);
      append(list, item);
    }
    append(card, list);
    return card;
  });
  replaceChildren(query(workspace, '[data-role="command-role-lanes"]'), ...laneCards);
  const activeAssignments = view.assignments.filter((assignment) =>
    assignment.orders.some((order) => !order.standby)
  );
  const activeIds = new Set(activeAssignments.map((assignment) => assignment.playerId));
  const mapItems = view.mapTargets
    .filter((target) => activeIds.has(target.playerId))
    .map((target) => {
      const item = createElement(state.root, 'li', target.isCurrentPlayer ? 'is-current' : '');
      append(
        item,
        createElement(state.root, 'strong', '', `${target.code} / ${target.label}`),
        createElement(state.root, 'small', '', target.displayName)
      );
      return item;
    });
  replaceChildren(query(workspace, '[data-role="command-map-list"]'), ...mapItems);
}
function renderLegions(state, view) {
  const legions = state.personalPlan?.plan?.legions || [];
  const inputs = queryAll(state.root, '[name="bohLegion"]');
  inputs.forEach((input, index) => {
    const legion = legions[index];
    if (!legion) {
      input.disabled = true;
      return;
    }
    input.disabled = false;
    input.value = legion.id;
    input.checked = legion.id === view.legionId;
    const label = query(state.root, `label[for="${input.id}"]`);
    setText(label, displayLegionLabel(state, legion, index));
  });
}

function formatUpdatedAt(state, timestamp) {
  const milliseconds = finiteInteger(timestamp);
  if (!milliseconds) return state.tr('status.notAvailable', 'Not available');
  try {
    return new Intl.DateTimeFormat(state.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(milliseconds);
  } catch {
    return new Date(milliseconds).toLocaleString();
  }
}

function renderPlan(state) {
  const personal = state.personalPlan || {};
  const team = currentTeam(state);
  if (!team) return;
  let entries = [];
  try {
    entries = projectBohPlayerPlan({
      model: state.model,
      personalPlan: personal,
      team,
      playerId: state.store?.uid,
      legionId: state.selectedLegionId || undefined,
    });
  } catch (error) {
    reportError(state, error, { action: 'project-plan' });
    return;
  }
  const view = selectBohTimelineView(entries, {
    legionId: state.selectedLegionId,
    phaseId: state.selectedPhaseId,
  });
  state.selectedLegionId = view.legionId;
  state.selectedPhaseId = view.phaseId;
  setText(
    query(state.root, '[data-role="plan-team-number"]'),
    state.tr('common.teamNumber', 'Team {number}', {
      number: personal.teamNumber || team.number || '—',
    })
  );
  setText(
    query(state.root, '[data-role="plan-player-name"]'),
    personal.displayName || state.submission?.gameName || '—'
  );
  setText(
    query(state.root, '[data-role="plan-role"]'),
    displayRoleLabel(
      state,
      personal.roleGroupId || personal.roleId || view.timeline[0]?.roleGroupId,
      personal.roleLabel || view.timeline[0]?.roleLabel
    )
  );
  setText(query(state.root, '[data-role="plan-seat"]'), personal.seatNumber || '—');
  setText(
    query(state.root, '[data-role="plan-team-name"]'),
    displayTeamName(state, { ...team, name: personal.teamName || team.name }, personal.teamNumber)
  );
  setHidden(query(state.root, '[data-role="role-rotation-summary"]'), !view.hasRotation);
  setText(
    query(state.root, '[data-role="plan-updated-at"]'),
    formatUpdatedAt(state, personal.updatedAtMs || state.publication?.updatedAtMs)
  );
  renderCommandWorkspace(state);
  renderLegions(state, view);
  renderEventSchedule(state);
  renderNowNext(state, view);
  renderTimeline(state, view);
  renderMap(state, view.current);
}

function epicTimeSlotIdsFor(state) {
  const configured =
    state.options.epicTimeSlotIds ??
    state.options.config?.epicTimeSlotIds ??
    state.store?.epicTimeSlotIds ??
    state.model?.BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS;
  return normalizeEpicTimeSlotIds(configured);
}

function renderEpicTimeOptions(state, timeSlotIds) {
  const target = query(state.root, '[data-role="showdown-time-options"]');
  if (!target) return;
  const optionsKey = JSON.stringify(timeSlotIds);
  if (state.renderedEpicTimeOptions !== optionsKey) {
    const selected = new Set(
      queryAll(target, '[name="epicTimePreferences"]:checked').map((input) => input.value)
    );
    const labels = timeSlotIds.map((timeSlotId) => {
      const label = createElement(state.root, 'label', 'boh-check-card boh-showdown-option');
      const input = createElement(state.root, 'input');
      const text = createElement(state.root, 'span');
      if (!label || !input || !text) return null;
      input.type = 'checkbox';
      input.name = 'epicTimePreferences';
      input.value = timeSlotId;
      input.checked = selected.has(timeSlotId);
      label.dataset.timeSlotId = timeSlotId;
      append(label, input, text);
      return label;
    });
    replaceChildren(target, ...labels);
    state.renderedEpicTimeOptions = optionsKey;
    if (!state.epicDirty) state.epicHydratedRevision = null;
  }
  for (const label of queryAll(target, '[data-time-slot-id]')) {
    setText(
      query(label, 'span'),
      state.tr('showdown.timeOption', 'Game time {time}', { time: label.dataset.timeSlotId })
    );
  }
  setHidden(query(state.root, '[data-role="showdown-no-times"]'), timeSlotIds.length > 0);
}

function hydrateEpicPreferences(state) {
  const form = query(state.root, '[data-role="showdown-form"]');
  if (!form || state.epicDirty) return;
  const revision = state.epicPreferences ? finiteInteger(state.epicPreferences.revision) : -1;
  const gameName = state.epicPreferences?.gameName || state.submission?.gameName || '';
  const hydrationKey = `${revision}:${gameName}`;
  if (state.epicHydratedRevision === hydrationKey) return;
  updateInput(form, 'epicGameName', gameName);
  updateChecked(form, 'epicLanePreferences', state.epicPreferences?.lanePreferences || []);
  updateChecked(form, 'epicTimePreferences', state.epicPreferences?.timePreferences || []);
  updateChecked(
    form,
    'epicFlexibilityPreference',
    state.epicPreferences?.flexibilityPreference || ''
  );
  state.epicHydratedRevision = hydrationKey;
}

function renderEpicSummary(state) {
  const form = query(state.root, '[data-role="showdown-form"]');
  const summary = query(state.root, '[data-role="showdown-summary"]');
  if (!form || !summary) return;
  const lanes = queryAll(form, '[name="epicLanePreferences"]:checked').length;
  const times = queryAll(form, '[name="epicTimePreferences"]:checked').length;
  setText(
    summary,
    lanes || times
      ? state.tr('showdown.summary', '{lanes} positions · {times} game times selected.', {
          lanes,
          times,
        })
      : state.tr('showdown.summaryNone', 'No preferences selected yet.')
  );
}

function renderEpicPreferences(state) {
  const locked = query(state.root, '[data-role="showdown-state-locked"]');
  const form = query(state.root, '[data-role="showdown-form"]');
  const saveState = query(state.root, '[data-role="showdown-save-state"]');
  const submit = query(state.root, '[data-role="signup-submit"]');
  setHidden(locked, state.accessGranted);
  setHidden(form, !state.accessGranted);
  const timeSlotIds = epicTimeSlotIdsFor(state);
  renderEpicTimeOptions(state, timeSlotIds);
  hydrateEpicPreferences(state);
  renderEpicSummary(state);
  setBusy(
    submit,
    state.epicSaving ||
      state.saving ||
      !state.accessGranted ||
      typeof state.store?.saveEpicShowdownPreferences !== 'function'
  );
  if (state.epicSaving) setText(saveState, state.tr('showdown.saving', 'Saving…'));
  else if (state.epicPreferences) {
    setText(
      saveState,
      state.tr('showdown.saved', 'Saved · revision {revision}', {
        revision: state.epicPreferences.revision || 1,
      })
    );
  } else setText(saveState, state.tr('showdown.notSaved', 'Not saved'));
}

function scheduleTimestamp(value) {
  const timestamp = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatScheduleDate(state, value) {
  const timestamp = scheduleTimestamp(value);
  if (!timestamp) return state.tr('status.notAvailable', 'Not available');
  try {
    return new Intl.DateTimeFormat(state.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function formatScheduleDay(state, value) {
  const timestamp = scheduleTimestamp(value);
  if (!timestamp) return state.tr('status.notAvailable', 'Not available');
  try {
    return new Intl.DateTimeFormat(state.language, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}
function countdownLabel(state, timestamp) {
  const remaining = Math.max(0, Math.floor((timestamp - Date.now()) / 1000));
  if (!remaining) return state.tr('schedule.now', 'Now');
  const parts = getAllStarBohCountdownParts(remaining);
  if (parts.days) return state.tr('schedule.countdownDays', '{days}d {hours}h', parts);
  if (parts.hours) return state.tr('schedule.countdownHours', '{hours}h {minutes}m', parts);
  return state.tr('schedule.countdownMinutes', '{minutes}m {seconds}s', parts);
}

function renderEventSchedule(state) {
  const publishedSchedule = state.eventSchedule;
  const publishedMilestones = Array.isArray(publishedSchedule?.milestones)
    ? publishedSchedule.milestones
    : [];
  const publishedTeamTimes = Array.isArray(publishedSchedule?.teamGameTimes)
    ? publishedSchedule.teamGameTimes
    : [];
  const hasPublishedSchedule = Boolean(
    publishedSchedule?.status === 'published' &&
    (publishedMilestones.length || publishedTeamTimes.length || publishedSchedule.eventStartsAt)
  );
  const schedule = hasPublishedSchedule ? publishedSchedule : OFFICIAL_EVENT_SCHEDULE;
  const isOfficialFallback = !hasPublishedSchedule;
  const panel = query(state.root, '[data-role="event-schedule"]');
  if (!panel) return;
  const milestones = Array.isArray(schedule.milestones) ? schedule.milestones : [];
  const teamTimes = Array.isArray(schedule.teamGameTimes) ? schedule.teamGameTimes : [];
  setHidden(panel, false);

  const now = Date.now();
  const ordered = milestones
    .map((milestone, index) => ({
      ...milestone,
      index,
      startsAtMs: scheduleTimestamp(milestone.startsAt),
    }))
    .filter((milestone) => milestone.startsAtMs)
    .sort((a, b) => a.startsAtMs - b.startsAtMs);
  const current =
    [...ordered].reverse().find((milestone) => milestone.startsAtMs <= now) || ordered[0];
  if (
    !state.selectedMilestoneId ||
    !ordered.some((milestone) => milestone.id === state.selectedMilestoneId) ||
    (!state.selectedMilestoneIsManual && state.selectedMilestoneId !== current?.id)
  ) {
    state.selectedMilestoneId = current?.id || '';
    state.selectedMilestoneIsManual = false;
  }
  const selected =
    ordered.find((milestone) => milestone.id === state.selectedMilestoneId) || current;
  const rail = query(state.root, '[data-role="schedule-rail"]');
  const buttons = ordered.map((milestone) => {
    const status =
      milestone.startsAtMs <= now
        ? milestone.id === current?.id
          ? 'current'
          : 'complete'
        : 'upcoming';
    const button = createElement(state.root, 'button', 'boh-schedule-mile');
    button.type = 'button';
    button.dataset.role = 'schedule-milestone';
    button.dataset.milestoneId = milestone.id || `milestone-${milestone.index}`;
    button.dataset.status = status;
    button.setAttribute('aria-current', milestone.id === selected?.id ? 'step' : 'false');
    append(
      button,
      createElement(
        state.root,
        'span',
        '',
        status === 'complete' ? '✓' : String(milestone.index + 1).padStart(2, '0')
      ),
      createElement(state.root, 'strong', '', milestone.label || milestone.id || ''),
      createElement(
        state.root,
        'small',
        '',
        isOfficialFallback
          ? formatScheduleDay(state, milestone.startsAt)
          : formatScheduleDate(state, milestone.startsAtMs)
      )
    );
    return button;
  });
  replaceChildren(rail, ...buttons);
  setText(
    query(state.root, '[data-role="schedule-title"]'),
    selected?.label || state.tr('schedule.title', 'Event schedule')
  );
  setText(
    query(state.root, '[data-role="schedule-date"]'),
    isOfficialFallback
      ? formatScheduleDay(state, selected?.startsAt || schedule.eventStartsAt)
      : formatScheduleDate(state, selected?.startsAtMs || schedule.eventStartsAt)
  );
  setText(
    query(state.root, '[data-role="schedule-countdown"]'),
    isOfficialFallback
      ? state.tr('schedule.matchTimePending', 'Official event date - match time TBA')
      : countdownLabel(state, selected?.startsAtMs || scheduleTimestamp(schedule.eventStartsAt))
  );
  const teamList = query(state.root, '[data-role="schedule-team-times"]');
  const teamItems = teamTimes.map((item) => {
    const teamId = textValue(item.teamId);
    const team = state.teams.get(teamId) || { id: teamId, teamId };
    const row = createElement(state.root, 'li');
    row.className = teamId && teamId === state.personalPlan?.teamId ? 'is-mine' : '';
    append(
      row,
      createElement(state.root, 'strong', '', displayTeamName(state, team)),
      createElement(state.root, 'span', '', formatScheduleDate(state, item.startsAt))
    );
    return row;
  });
  replaceChildren(teamList, ...teamItems);
  setHidden(teamList, !teamItems.length);
}

function render(state) {
  if (state.destroyed) return;
  renderSignupWindow(state);
  activateSection(state, state.section);
  setEntryMethod(state, state.entryMethod);
  renderSignupPlanningControls(state);
  renderVtsMembership(state);
  renderTroopOcr(state);
  renderSubmissionState(state);
  renderParticipationMode(state);
  renderPublicationStates(state);
  renderEpicPreferences(state);
  renderEventSchedule(state);
  const statusLabel = query(state.root, '[data-role="event-status-label"]');
  setText(
    statusLabel,
    state.publication?.eventName ||
      state.publication?.title ||
      state.tr('status.preparing', 'Preparing this season')
  );
}

function revokePreview(state) {
  if (!state.ocrPreviewUrl) return;
  ownerWindow(state.root)?.URL?.revokeObjectURL?.(state.ocrPreviewUrl);
  state.ocrPreviewUrl = '';
}

function clearOcrFile(state) {
  revokePreview(state);
  state.ocrGeneration += 1;
  state.ocrFile = null;
  state.ocrReview = null;
  state.ocrInvalidField = '';
  state.ocrPhase = 'idle';
  const input = query(state.root, '[data-role="ocr-file-input"]');
  if (input) input.value = '';
  renderOcr(state);
}

function selectOcrFile(state, files) {
  const select = state.ocr.getSingleBohStatsScreenshot || ((input) => Array.from(input || [])[0]);
  const file = select(files);
  revokePreview(state);
  state.ocrGeneration += 1;
  state.ocrFile = file;
  state.ocrReview = null;
  state.ocrInvalidField = '';
  state.ocrPhase = 'idle';
  state.ocrPreviewUrl = ownerWindow(state.root)?.URL?.createObjectURL?.(file) || '';
  renderOcr(state);
}

function isCurrentOcrRequest(state, file, generation) {
  return state.ocrGeneration === generation && state.ocrFile === file;
}

async function processOcr(state) {
  if (state.ocrBusy) return;
  const file = state.ocrFile;
  const generation = state.ocrGeneration;
  const consent = query(state.root, '[data-role="ocr-consent"]');
  if (!file)
    throw new TypeError(state.tr('signup.ocrFileRequired', 'Choose one screenshot first.'));
  if (!consent?.checked)
    throw new TypeError(
      state.tr('signup.ocrConsentRequired', 'Confirm the OCR processing notice first.')
    );
  state.ocrBusy = true;
  state.ocrPhase = 'processing';
  renderOcr(state);
  try {
    const prepare = state.ocr.prepareBohStatsScreenshot || state.ocr.prepareScreenshot;
    const buildRequest = state.ocr.buildBohStatsOcrRequest || ((value) => value);
    const transport =
      state.ocr.process || state.ocr.recognize || state.ocr.extractStats || state.ocr.request;
    const buildReview = state.ocr.buildBohStatsReviewModel;
    if (
      typeof prepare !== 'function' ||
      typeof transport !== 'function' ||
      typeof buildReview !== 'function'
    ) {
      throw new TypeError('Stats OCR service is not available.');
    }
    const prepared = await prepare(file);
    if (!isCurrentOcrRequest(state, file, generation)) return;
    const request = buildRequest({
      seasonId: state.store?.seasonId || state.options.seasonId,
      imageData: prepared.imageData,
    });
    const response = await transport(request);
    if (!isCurrentOcrRequest(state, file, generation)) return;
    const review = buildReview(response?.result || response);
    state.ocrReview = review;
    state.ocrInvalidField = '';
    const values = review.confirmedValues || review.ocrValues || {};
    const form = query(state.root, '[data-role="signup-form"]');
    for (const field of POWER_FIELDS) updateInput(form, field, values[field] ?? '');
    if (values.gameName) updateInput(form, 'gameName', values.gameName);
    state.ocrPhase = 'ready';
  } catch (error) {
    if (!isCurrentOcrRequest(state, file, generation)) return;
    state.ocrPhase = 'error';
    throw error;
  } finally {
    state.ocrBusy = false;
    renderOcr(state);
  }
}

function syncOcrReviewFromForm(state) {
  if (state.entryMethod !== 'ocr' || !state.ocrReview) return;
  const form = query(state.root, '[data-role="signup-form"]');
  const apply = state.ocr.applyBohStatsReviewCorrections;
  if (!form || typeof apply !== 'function') return;
  const edits = Object.fromEntries(
    [...POWER_FIELDS, 'gameName'].map((field) => [field, query(form, `[name="${field}"]`)?.value])
  );
  try {
    state.ocrReview = apply(state.ocrReview, edits);
    state.ocrInvalidField = '';
  } catch (error) {
    state.ocrReview = { ...state.ocrReview, isComplete: false };
    state.ocrInvalidField = textValue(error?.field);
  }
  renderOcr(state);
}

function formDataFor(form) {
  const FormDataConstructor = ownerWindow(form)?.FormData || globalThis.FormData;
  if (typeof FormDataConstructor !== 'function')
    throw new TypeError('This browser cannot collect the signup form.');
  return new FormDataConstructor(form);
}

function focusErrorField(state, field) {
  const selectors = {
    troopOcrConfirmed: '[data-role="troop-ocr-confirmed"]',
    t10Types: '[name="t10Types"]',
    fightingTimeIds: '[name="fightingTimeIds"]',
  };
  const target = query(state.root, selectors[field] || `[name="${field}"]`);
  target?.focus?.({ preventScroll: true });
  target?.scrollIntoView?.({
    behavior: ownerWindow(state.root)?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      ? 'auto'
      : 'smooth',
    block: 'center',
  });
}

function isPermissionDeniedError(error) {
  return (
    error?.code === 'permission-denied' ||
    /(?:missing or )?insufficient permissions/iu.test(String(error?.message || ''))
  );
}

function permissionDeniedMessage(state) {
  return state.tr(
    'signup.permissionDeniedError',
    'Your submission could not be saved — your member access may have expired. Unlock with your PIN again, then resubmit. If it keeps failing, contact leadership.'
  );
}

async function submitSignup(state, form) {
  if (!state.store?.saveSubmission)
    throw new TypeError('Member access is required before submitting.');
  form.dataset.validationAttempted = 'true';
  if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
    const firstInvalid = query(form, ':invalid');
    setSignupFormError(
      state,
      state.tr(
        'signup.requiredFieldsMissing',
        'Complete the highlighted required field before submitting.'
      )
    );
    firstInvalid?.focus?.({ preventScroll: true });
    firstInvalid?.scrollIntoView?.({
      behavior: ownerWindow(state.root)?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
        ? 'auto'
        : 'smooth',
      block: 'center',
    });
    return false;
  }
  setSignupFormError(state);
  let data = formDataFor(form);
  if (state.entryMethod === 'ocr' && state.ocrReview) {
    const corrections = Object.fromEntries(
      POWER_FIELDS.map((field) => [field, formValue(data, field)]).concat([
        ['gameName', formValue(data, 'gameName')],
      ])
    );
    const apply = state.ocr.applyBohStatsReviewCorrections;
    if (typeof apply === 'function') state.ocrReview = apply(state.ocrReview, corrections);
  }
  let payload;
  try {
    const effectiveEntryMethod =
      state.entryMethod === 'ocr' && !state.ocrReview && state.submission?.status === 'submitted'
        ? 'manual'
        : state.entryMethod;
    payload = buildBohSubmissionPayload(data, {
      entryMethod: effectiveEntryMethod,
      ocrReview: state.ocrReview,
      language: state.language,
      model: state.model,
      knownNames: state.submission?.knownNames,
      heroNames: heroCatalogFor(state).map((hero) => hero.name),
      researchTreeIds: researchCatalogFor(state).map((tree) => tree.id),
    });
    setFightingTimeError(state);
  } catch (error) {
    if (error?.i18nKey === 'signup.fightingTimesRequired') {
      setFightingTimeError(state, 'signup.fightingTimesRequired');
      error.message = state.tr(
        'signup.fightingTimesRequired',
        'Choose exactly two All-Star fighting times.'
      );
    } else if (error?.i18nKey === 'signup.leadershipInterestRequired') {
      error.message = state.tr(
        'signup.leadershipInterestRequired',
        'Choose whether you can help lead or manage this season.'
      );
    }
    reportError(state, error, { action: 'save-submission' });
    setSignupFormError(state, error?.message || 'Review the highlighted field and try again.');
    focusErrorField(state, error?.field);
    return false;
  }
  state.saving = true;
  let preserveFormOnFailure = false;
  let confirmation = null;
  clearNotice(state);
  renderSubmissionControls(state);
  try {
    const expectedRevision = Number.isInteger(state.submissionEditBaseRevision)
      ? Math.max(0, state.submissionEditBaseRevision)
      : finiteInteger(state.submission?.revision);
    const saved = await state.store.saveSubmission(payload, { expectedRevision });
    if (saved) state.submission = saved;
    setSignupFormError(state);
    state.dirty = false;
    state.hydratedRevision = null;
    state.submissionEditBaseRevision = null;
    notice(state, 'signup.savedNotice', 'Your stats were submitted successfully.', {
      tone: 'success',
    });
    confirmation = {
      edited: expectedRevision > 0,
      revision: finiteInteger(saved?.revision) || expectedRevision + 1,
    };
  } catch (error) {
    if (/conflict/iu.test(error?.name || '') || Number.isInteger(error?.actualRevision)) {
      const latest = await state.store.getSubmission?.().catch(() => undefined);
      if (latest === undefined) {
        reportError(state, error, { action: 'reload-submission' });
      } else {
        state.submission = latest;
        state.dirty = false;
        state.hydratedRevision = null;
        state.submissionEditBaseRevision = null;
        notice(
          state,
          'signup.revisionConflict',
          'Your saved signup changed in another session. Review this form and submit again.',
          { tone: 'warning' }
        );
      }
    } else {
      preserveFormOnFailure = true;
      reportError(state, error, { action: 'save-submission' });
      setSignupFormError(
        state,
        isPermissionDeniedError(error)
          ? permissionDeniedMessage(state)
          : error?.message || 'Submission was not saved. Please try again.'
      );
      focusErrorField(state, error?.field);
    }
  } finally {
    state.saving = false;
    if (preserveFormOnFailure) renderSubmissionControls(state);
    else render(state);
    data = null;
  }
  if (confirmation) showSubmissionConfirmation(state, confirmation);
  return confirmation !== null;
}

async function submitEpicPreferences(state, form) {
  if (typeof state.store?.saveEpicShowdownPreferences !== 'function') {
    throw new TypeError('Member access is required before saving Epic Showdown preferences.');
  }
  if (typeof form.reportValidity === 'function' && !form.reportValidity()) return false;
  const payload = buildBohEpicPreferencesPayload(formDataFor(form), {
    model: state.model,
    timeSlotIds: epicTimeSlotIdsFor(state),
  });
  state.epicSaving = true;
  let savedSuccessfully = false;
  clearNotice(state);
  renderEpicPreferences(state);
  try {
    const expectedRevision = resolveBohEpicExpectedRevision(
      state.epicPreferences,
      state.epicEditBaseRevision
    );
    const saved = await state.store.saveEpicShowdownPreferences(payload, { expectedRevision });
    if (saved) state.epicPreferences = saved;
    state.epicDirty = false;
    state.epicHydratedRevision = null;
    state.epicEditBaseRevision = null;
    notice(state, 'showdown.savedNotice', 'Your Epic Showdown preferences were saved.', {
      tone: 'success',
    });
    savedSuccessfully = true;
  } catch (error) {
    if (/conflict/iu.test(error?.name || '') || Number.isInteger(error?.actualRevision)) {
      const latest = await state.store.getEpicShowdownPreferences?.().catch(() => undefined);
      if (latest === undefined) {
        reportError(state, error, { action: 'reload-epic-preferences' });
      } else {
        state.epicPreferences = latest;
        state.epicDirty = false;
        state.epicHydratedRevision = null;
        state.epicEditBaseRevision = null;
        notice(
          state,
          'showdown.revisionConflict',
          'Latest saved choices loaded—review and change them before saving.',
          { tone: 'warning' }
        );
      }
    } else {
      if (error?.i18nKey === 'showdown.laneRequired') {
        notice(
          state,
          'showdown.laneRequired',
          'Choose at least one position: South, Center, or North.',
          { tone: 'error' }
        );
      } else if (error?.i18nKey === 'showdown.timeRequired') {
        notice(state, 'showdown.timeRequired', 'Choose at least one available game time.', {
          tone: 'error',
        });
      } else if (error?.i18nKey === 'showdown.flexibilityRequired') {
        notice(
          state,
          'showdown.flexibilityRequired',
          'Choose how flexible you want to be for Epic Showdown.',
          { tone: 'error' }
        );
      } else {
        reportError(state, error, { action: 'save-epic-preferences' });
        if (isPermissionDeniedError(error)) {
          notice(
            state,
            'signup.permissionDeniedError',
            'Your submission could not be saved — your member access may have expired. Unlock with your PIN again, then resubmit. If it keeps failing, contact leadership.',
            { tone: 'error' }
          );
        }
      }
      focusErrorField(state, error?.field);
    }
  } finally {
    state.epicSaving = false;
    renderEpicPreferences(state);
  }
  return savedSuccessfully;
}

async function submitCombinedParticipation(state, signupForm, showdownForm) {
  if (!signupForm || !showdownForm) return;
  if (state.participationMode === 'epic-only') {
    await submitEpicPreferences(state, showdownForm);
    return;
  }
  if (typeof signupForm.reportValidity === 'function' && !signupForm.reportValidity()) {
    signupForm.querySelector?.(':invalid')?.focus?.({ preventScroll: true });
    return;
  }
  // The signup is the primary participation record shown in the All-Star admin panel.
  // Save it first so a rejected signup can never leave a misleading Epic-only record.
  const signupSaved = await submitSignup(state, signupForm);
  if (!signupSaved) return;
  if (state.epicDirty) {
    await submitEpicPreferences(state, showdownForm);
  }
}

function tabKeyMove(state, event, tabs, activeIndex, activate) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return false;
  event.preventDefault();
  const direction =
    ownerWindow(state.root)?.getComputedStyle?.(state.root)?.direction === 'rtl' ? -1 : 1;
  let index = activeIndex;
  if (event.key === 'Home') index = 0;
  if (event.key === 'End') index = tabs.length - 1;
  if (event.key === 'ArrowRight') index = (activeIndex + direction + tabs.length) % tabs.length;
  if (event.key === 'ArrowLeft') index = (activeIndex - direction + tabs.length) % tabs.length;
  activate(tabs[index]);
  tabs[index]?.focus?.();
  return true;
}

function handleKeydown(state, event) {
  const mapObjective = event.target?.closest?.('[data-role="map-objective"]');
  if (mapObjective && ['Enter', ' '].includes(event.key)) {
    event.preventDefault();
    state.selectedObjectiveId = mapObjective.dataset.objectiveId;
    renderPlan(state);
    return;
  }
  const sectionTab = event.target?.closest?.('[data-role="section-tab"]');
  if (sectionTab) {
    const tabs = queryAll(state.root, '[data-role="section-tab"]:not([hidden])');
    tabKeyMove(state, event, tabs, tabs.indexOf(sectionTab), (tab) =>
      activateSection(state, tab.dataset.section)
    );
    return;
  }
  const commandModeTab = event.target?.closest?.('[data-role="command-mode-tab"]');
  if (commandModeTab) {
    const tabs = queryAll(state.root, '[data-role="command-mode-tab"]');
    tabKeyMove(state, event, tabs, tabs.indexOf(commandModeTab), (tab) => {
      state.selectedCommandMode = tab.dataset.commandMode;
      renderPlan(state);
    });
    return;
  }
  const commandPhaseTab = event.target?.closest?.('[data-role="command-phase-tab"]');
  if (commandPhaseTab) {
    const tabs = queryAll(state.root, '[data-role="command-phase-tab"]');
    tabKeyMove(state, event, tabs, tabs.indexOf(commandPhaseTab), (tab) => {
      state.selectedCommandPhaseId = tab.dataset.phaseId;
      renderPlan(state);
    });
    return;
  }
  const phaseTab = event.target?.closest?.('[data-role="phase-tabs"] [role="tab"]');
  if (phaseTab) {
    const tabs = queryAll(state.root, '[data-role="phase-tabs"] [role="tab"]:not([hidden])');
    tabKeyMove(state, event, tabs, tabs.indexOf(phaseTab), (tab) => {
      state.selectedPhaseId = tab.dataset.phaseId;
      renderPlan(state);
    });
  }
}

async function handleClick(state, event) {
  const target =
    event.target?.closest?.('button, [role="tab"]') ||
    event.target?.closest?.('[data-role="map-objective"]');
  if (!target || (state.root.contains && !state.root.contains(target))) return;
  if (target.matches?.('[data-role="lock-hub"]')) {
    state.options.onLockHub?.();
    return;
  }
  if (target.matches?.('[data-role="submission-confirmation-close"]')) {
    closeSubmissionConfirmation(state);
    return;
  }
  if (target.matches?.('[data-role="edit-signup"]')) {
    if (state.registrationClosed) return;
    activateSection(state, 'signup');
    const form = query(state.root, '[data-role="signup-form"]');
    form?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    query(form, '[name="gameName"]')?.focus?.({ preventScroll: true });
    return;
  }
  if (target.matches?.('[data-role="research-progress-action"]')) {
    const input = queryAll(state.root, '[data-role="research-progress-input"]').find(
      (control) => control.dataset.treeId === target.dataset.treeId
    );
    if (input) {
      input.value = target.dataset.value ?? '';
      markSubmissionDirty(state);
      renderResearchStatus(state);
      input.focus?.();
    }
    return;
  }
  if (target.matches?.('[data-role="research-season-max"]')) {
    const season = target.dataset.season;
    for (const input of queryAll(state.root, '[data-role="research-progress-input"]')) {
      if (input.closest?.('[data-role="research-season-group"]')?.dataset.season === season) {
        input.value = '100';
      }
    }
    markSubmissionDirty(state);
    renderResearchStatus(state);
    return;
  }
  if (target.matches?.('[data-role="section-tab"]')) {
    activateSection(state, target.dataset.section);
    return;
  }
  if (target.matches?.('[data-role="unlock-request"]')) {
    state.options.onNotice?.(state.tr('access.enterPin', 'Enter member PIN'), {
      action: 'unlock-request',
    });
    return;
  }
  if (target.matches?.('[data-role="open-my-plan"]')) {
    activateSection(state, 'plan', true);
    return;
  }
  if (target.matches?.('[data-role="announcement-help"]')) {
    activateSection(state, 'signup', true);
    return;
  }
  if (target.matches?.('[data-role="ocr-remove"]')) {
    clearOcrFile(state);
    return;
  }
  if (target.matches?.('[data-role="ocr-process"]')) {
    try {
      await processOcr(state);
    } catch (error) {
      reportError(state, error, { action: 'process-ocr' });
    }
    return;
  }
  if (target.matches?.('[data-role="troop-ocr-remove"]')) {
    clearTroopOcr(state);
    return;
  }
  if (target.matches?.('[data-role="troop-ocr-process"]')) {
    try {
      await processTroopOcr(state);
    } catch (error) {
      reportError(state, error, { action: 'process-troop-ocr' });
    }
    return;
  }
  if (target.matches?.('.boh-team-summary')) {
    state.selectedTeamId = target.dataset.teamId;
    renderTeamDetail(state, state.selectedTeamId);
    return;
  }
  if (target.matches?.('[data-role="command-mode-tab"]')) {
    state.selectedCommandMode = target.dataset.commandMode;
    renderPlan(state);
    return;
  }
  if (target.matches?.('[data-role="command-phase-tab"]')) {
    state.selectedCommandPhaseId = target.dataset.phaseId;
    renderPlan(state);
    return;
  }
  if (target.matches?.('[data-role="phase-tabs"] [role="tab"]')) {
    state.selectedPhaseId = target.dataset.phaseId;
    renderPlan(state);
    return;
  }
  if (target.matches?.('[data-role="schedule-milestone"]')) {
    state.selectedMilestoneId = target.dataset.milestoneId;
    state.selectedMilestoneIsManual = true;
    renderEventSchedule(state);
    return;
  }
  if (target.matches?.('[data-role="map-objective"]')) {
    state.selectedObjectiveId = target.dataset.objectiveId;
    renderPlan(state);
  }
}

function handleChange(state, event) {
  const target = event.target;
  if (!target) return;
  if (target.matches?.('[data-role="hero-troop-filter"], [data-role="hero-season-filter"]')) {
    renderHeroCatalogStatus(state);
    return;
  }
  if (target.matches?.('[data-role="research-season-filter"]')) {
    renderResearchSeasonFilter(state);
    return;
  }
  if (target.matches?.('[name="participationMode"]')) {
    state.participationMode = target.value === 'epic-only' ? 'epic-only' : 'allstar';
    renderParticipationMode(state);
    if (state.participationMode === 'epic-only') {
      query(state.root, '[data-role="signup-addon"]')?.scrollIntoView?.({
        behavior: ownerWindow(state.root)?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
    }
    return;
  }
  if (target.matches?.('[name="vts1097Member"]')) renderVtsMembership(state);
  if (target.matches?.('[data-role="field-preferred-role"], [data-role="field-secondary-role"]')) {
    const primary = query(state.root, '[data-role="field-preferred-role"]');
    const secondary = query(state.root, '[data-role="field-secondary-role"]');
    if (primary && secondary) {
      for (const option of secondary.options || []) {
        option.disabled = Boolean(primary.value) && option.value === primary.value;
      }
      secondary.setCustomValidity?.(
        secondary.value && secondary.value === primary.value
          ? state.tr('signup.secondaryRoleDifferent', 'Choose a different secondary role.')
          : ''
      );
    }
  }
  if (target.matches?.('[name="fightingTimeIds"]')) {
    const count = queryAll(state.root, '[name="fightingTimeIds"]:checked').length;
    if (target.checked && count > 2) {
      target.checked = false;
      setFightingTimeError(state, 'signup.fightingTimesLimit');
      target.focus?.();
      return;
    }
    setFightingTimeError(state);
  }
  if (target.matches?.('[data-role="entry-method"]')) {
    setEntryMethod(state, target.value);
  } else if (target.matches?.('[data-role="ocr-file-input"]')) {
    try {
      selectOcrFile(state, target.files);
    } catch (error) {
      clearOcrFile(state);
      reportError(state, error, { action: 'select-ocr-file' });
    }
  } else if (target.matches?.('[data-role="troop-ocr-file-input"]')) {
    try {
      selectTroopOcrFiles(state, target.files);
    } catch (error) {
      clearTroopOcr(state);
      reportError(state, error, { action: 'select-troop-ocr-files' });
    }
  } else if (target.matches?.('[data-role="troop-ocr-row-field"]')) {
    updateTroopOcrRow(state, target);
  } else if (target.matches?.('[data-role="t10-all"]')) {
    for (const input of queryAll(state.root, '[name="t10Types"]')) input.checked = target.checked;
  } else if (target.matches?.('[name="t10Types"]:not([data-role="t10-all"])')) {
    const types = queryAll(state.root, '[name="t10Types"]:not([data-role="t10-all"])');
    const all = query(state.root, '[data-role="t10-all"]');
    if (all) all.checked = types.every((input) => input.checked);
  } else if (target.matches?.('[name="bohLegion"]')) {
    state.selectedLegionId = target.value;
    renderPlan(state);
  }
  if (target.matches?.('[name="usableHeroNames"]')) renderHeroCatalogStatus(state);
  if (target.matches?.('[data-role="research-progress-input"]')) renderResearchStatus(state);
  if (target.closest?.('[data-role="signup-form"]')) markSubmissionDirty(state);
  if (target.closest?.('[data-role="showdown-form"]')) {
    markEpicDirty(state);
    renderEpicSummary(state);
  }
}

function markSubmissionDirty(state) {
  if (!state.dirty) {
    state.submissionEditBaseRevision = finiteInteger(state.submission?.revision);
  }
  state.dirty = true;
}

function markEpicDirty(state) {
  if (!state.epicDirty) {
    state.epicEditBaseRevision = finiteInteger(state.epicPreferences?.revision);
  }
  state.epicDirty = true;
}

function handleSubmit(state, event) {
  const signupForm = event.target?.closest?.('[data-role="signup-form"]');
  const showdownForm = event.target?.closest?.('[data-role="showdown-form"]');
  if (!signupForm && !showdownForm) return;
  event.preventDefault();
  if (state.registrationClosed) return;
  const action = submitCombinedParticipation(
    state,
    signupForm || query(state.root, '[data-role="signup-form"]'),
    showdownForm || query(state.root, '[data-role="showdown-form"]')
  );
  action.catch((error) => reportError(state, error, { action: 'submit' }));
}

function bindEvents(state) {
  const signal = state.eventsAbort.signal;
  state.root.addEventListener?.('click', (event) => void handleClick(state, event), { signal });
  state.root.addEventListener?.('change', (event) => handleChange(state, event), { signal });
  state.root.addEventListener?.(
    'input',
    (event) => {
      if (event.target?.matches?.('[data-role="hero-search"]')) {
        renderHeroCatalogStatus(state);
        return;
      }
      if (event.target?.matches?.('[data-role="research-progress-input"]')) {
        renderResearchStatus(state);
      }
      if (event.target?.matches?.('[name="gameName"]') && !state.epicNameTouched) {
        updateInput(
          query(state.root, '[data-role="showdown-form"]'),
          'epicGameName',
          event.target.value
        );
      }
      if (event.target?.matches?.('[name="epicGameName"]')) state.epicNameTouched = true;
      if (event.target?.closest?.('[data-role="signup-form"]')) markSubmissionDirty(state);
      if (event.target?.closest?.('[data-role="showdown-form"]')) markEpicDirty(state);
      if (event.target?.matches?.('[data-stat]')) syncOcrReviewFromForm(state);
    },
    { signal }
  );
  state.root.addEventListener?.('submit', (event) => handleSubmit(state, event), { signal });
  state.root.addEventListener?.('keydown', (event) => handleKeydown(state, event), { signal });
  ownerWindow(state.root)?.addEventListener?.(
    'vts:language-change',
    (event) => {
      const detail = event.detail || {};
      setLanguage(
        state,
        detail.language || detail.locale || detail.languageCode || detail.lang,
        detail.text
      );
    },
    { signal }
  );
}

function unsubscribeAll(state) {
  for (const unsubscribe of state.subscriptions.splice(0)) unsubscribe?.();
  for (const unsubscribe of state.teamSubscriptions.values()) unsubscribe?.();
  state.teamSubscriptions.clear();
}

function subscriptionError(state, source) {
  const feedbackRevision = state.feedbackRevision;
  return (error) => {
    const context = { action: 'subscribe', source };
    if (state.feedbackRevision === feedbackRevision) {
      reportError(state, error, context);
      return;
    }
    state.options.onError?.(error, context);
  };
}

function reconcileTeamSubscriptions(state) {
  if (!state.store) return;
  const ids = new Set(state.publication?.teamIds || []);
  if (state.personalPlan?.teamId) ids.add(state.personalPlan.teamId);
  for (const [teamId, unsubscribe] of state.teamSubscriptions) {
    if (ids.has(teamId)) continue;
    unsubscribe?.();
    state.teamSubscriptions.delete(teamId);
    state.teams.delete(teamId);
  }
  for (const teamId of ids) {
    if (state.teamSubscriptions.has(teamId)) continue;
    const update = (team) => {
      if (state.destroyed) return;
      if (team) state.teams.set(teamId, { ...team, teamId });
      else state.teams.delete(teamId);
      renderPublicationStates(state);
    };
    if (typeof state.store.subscribePublishedTeam === 'function') {
      const unsubscribe = state.store.subscribePublishedTeam(
        teamId,
        update,
        subscriptionError(state, `team:${teamId}`)
      );
      state.teamSubscriptions.set(teamId, unsubscribe || (() => {}));
    } else if (typeof state.store.getPublishedTeam === 'function') {
      state.teamSubscriptions.set(teamId, () => {});
      Promise.resolve(state.store.getPublishedTeam(teamId))
        .then(update)
        .catch(subscriptionError(state, `team:${teamId}`));
    }
  }
}

function subscribe(state, method, update, source) {
  if (typeof state.store?.[method] !== 'function') return;
  const unsubscribe = state.store[method](
    (value) => {
      if (!state.destroyed) update(value);
    },
    subscriptionError(state, source)
  );
  if (typeof unsubscribe === 'function') state.subscriptions.push(unsubscribe);
}

function startSubscriptions(state) {
  if (!state.store || !state.accessGranted) return;
  subscribe(
    state,
    'subscribeEventSchedule',
    (value) => {
      state.eventSchedule = value;
      renderEventSchedule(state);
    },
    'event-schedule'
  );
  subscribe(
    state,
    'subscribeSubmission',
    (value) => {
      state.submission = value;
      renderSubmissionState(state);
    },
    'submission'
  );
  subscribe(
    state,
    'subscribeSubmissionFeedback',
    (value) => {
      state.submissionFeedback = value;
      renderSubmissionFeedback(state);
    },
    'submission-feedback'
  );
  subscribe(
    state,
    'subscribeEpicShowdownPreferences',
    (value) => {
      state.epicPreferences = value;
      renderEpicPreferences(state);
    },
    'epic-showdown-preferences'
  );
  subscribe(
    state,
    'subscribePublication',
    (value) => {
      state.publication = value;
      reconcileTeamSubscriptions(state);
      renderPublicationStates(state);
    },
    'publication'
  );
  subscribe(
    state,
    'subscribePersonalPlan',
    (value) => {
      state.personalPlan = value;
      reconcileTeamSubscriptions(state);
      renderPublicationStates(state);
    },
    'personal-plan'
  );
}

async function refreshState(state, snapshot) {
  if (snapshot && typeof snapshot === 'object') {
    if ('store' in snapshot && snapshot.store !== state.store) {
      unsubscribeAll(state);
      state.store?.stop?.();
      state.store = snapshot.store || null;
      state.accessGranted = Boolean(state.store && state.store.accessGranted !== false);
      state.renderedEpicTimeOptions = '';
      state.epicHydratedRevision = null;
      state.epicEditBaseRevision = null;
      startSubscriptions(state);
    } else if ('accessGranted' in snapshot) {
      state.accessGranted = snapshot.accessGranted === true && Boolean(state.store);
    }
    if ('submission' in snapshot) state.submission = snapshot.submission;
    if ('submissionFeedback' in snapshot) state.submissionFeedback = snapshot.submissionFeedback;
    if ('epicPreferences' in snapshot) state.epicPreferences = snapshot.epicPreferences;
    if ('publication' in snapshot) state.publication = snapshot.publication;
    if ('personalPlan' in snapshot) state.personalPlan = snapshot.personalPlan;
    if ('eventSchedule' in snapshot) state.eventSchedule = snapshot.eventSchedule;
    if (snapshot.teams) {
      const entries =
        snapshot.teams instanceof Map ? snapshot.teams : Object.entries(snapshot.teams);
      state.teams = new Map(entries);
    }
    reconcileTeamSubscriptions(state);
    render(state);
    return;
  }
  if (!state.store || !state.accessGranted) {
    render(state);
    return;
  }
  const [
    submission,
    submissionFeedback,
    epicPreferences,
    publication,
    personalPlan,
    eventSchedule,
  ] = await Promise.all([
    state.store.getSubmission?.(),
    state.store.getSubmissionFeedback?.(),
    state.store.getEpicShowdownPreferences?.(),
    state.store.getPublication?.(),
    state.store.getPersonalPlan?.(),
    state.store.getEventSchedule?.(),
  ]);
  if (submission !== undefined) state.submission = submission;
  if (submissionFeedback !== undefined) state.submissionFeedback = submissionFeedback;
  if (epicPreferences !== undefined) state.epicPreferences = epicPreferences;
  if (publication !== undefined) state.publication = publication;
  if (personalPlan !== undefined) state.personalPlan = personalPlan;
  if (eventSchedule !== undefined) state.eventSchedule = eventSchedule;
  reconcileTeamSubscriptions(state);
  render(state);
}

function setLanguage(state, language, text) {
  if (text !== undefined) state.textSource = text;
  if (language) state.language = textValue(language) || state.language;
  state.tr = makeTranslator(state.textSource, state.language);
  render(state);
}

/**
 * Mounts the player-facing All-Star hub. Authentication and persistence are
 * injected; this controller only coordinates the existing DOM and contracts.
 */
export function initializeAllStarBoh(options = {}) {
  const root = options.root;
  if (!root || typeof root.addEventListener !== 'function') {
    throw new TypeError('All-Star BoH player root is required.');
  }
  const existing = controllers.get(root);
  if (existing) return existing;
  root.style?.setProperty?.('--boh-all-star-icon-sprite', `url("${ALL_STAR_ICON_SPRITE}")`);
  const state = initialState(options);
  bindEvents(state);
  startSubscriptions(state);
  startSignupWindowTimer(state);
  render(state);
  refreshState(state).catch((error) => reportError(state, error, { action: 'refresh' }));

  const lifecycle = Object.freeze({
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.eventsAbort.abort();
      stopSignupWindowTimer(state);
      unsubscribeAll(state);
      revokePreview(state);
      state.store?.stop?.();
      controllers.delete(root);
    },
    setLanguage(language, text) {
      if (language && typeof language === 'object') {
        setLanguage(state, language.language || language.locale, language.text);
      } else setLanguage(state, language, text);
      return lifecycle;
    },
    async refresh(snapshot) {
      await refreshState(state, snapshot);
      return lifecycle;
    },
  });
  controllers.set(root, lifecycle);
  return lifecycle;
}

export const initAllStarBoh = initializeAllStarBoh;
