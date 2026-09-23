// Game copy. English is the source of truth; every other locale is merged over
// it key by key, so a partially translated locale shows English for the keys it
// has not covered yet instead of an empty string.
//
// Added locales at once here: en (complete), plus es, ru, ar and zh as the
// first pass — they also exercise RTL (ar) and long-word layouts (de is the
// worst case, and is deliberately left for the L3 translation lane).
//
// Spanish, Russian, Arabic and Chinese have full page copy. The other supported
// locale IDs explicitly use the English source until reviewed translations are
// available; the page still resolves every language preference safely.

const EN = {
  game: {
    title: 'Eden Siege',
    kicker: 'Ice & Fire Arena · VTS 1097',
    tagline: 'Hold the line. Ice controls, Fire burns, and the wings remember every chain.',
  },
  hud: {
    score: 'Score',
    best: 'Best',
    wave: 'Wave',
    gold: 'Gold',
    core: 'Stronghold',
    combo: 'Chain',
    nova: 'Nova',
    build: 'Build',
    upgrade: 'Upgrade',
    level: 'Lv',
    pause: 'Pause',
    resume: 'Resume',
    mute: 'Sound on',
    unmute: 'Sound off',
    restart: 'Restart',
    backToArcade: 'Arcade',
    swap: 'Swap wing',
    attack: 'Attack',
    controls: 'WASD / arrows move · Space attack · Q E swap wing · F nova · Esc pause',
  },
  elements: { elementIce: 'Ice', elementFire: 'Fire' },
  phases: {
    readyTitle: 'Choose your wing',
    readyBody: 'Waves cross the gates in {seconds}s. Hold the stronghold.',
    readyStart: 'Begin the siege',
    buildTitle: 'Between waves',
    buildBody: 'Spend gold on towers before the next gate opens.',
    waveTitle: 'Wave {n}',
    waveBoss: 'Boss wave',
    pauseTitle: 'Paused',
    pauseBody: 'The siege waits. Visibility changes pause the run automatically.',
    victoryTitle: 'Stronghold held',
    victoryBody: 'Every wave broken. The wings took their fill.',
    defeatTitle: 'The gate fell',
    defeatBody: 'The stronghold is lost — but the record is still standing.',
  },
  results: {
    score: 'Final score',
    best: 'Personal best',
    newBest: 'New best',
    waves: 'Waves cleared',
    kills: 'Kills',
    share: 'Share run',
    copied: 'Copied',
    playAgain: 'Run it again',
  },
  tips: [
    'Alternate Ice and Fire kills — the chain multiplier is where the score lives.',
    'Ice locks a cavalry charge in place. Fire finishes what Ice holds.',
    'Nova charges from kills; hold it for a boss wave rather than a stray ranger.',
    'Towers keep firing while you are down. Build before you need them.',
  ],
  maps: {
    mapKeepName: 'Keep Rampart',
    mapKeepDesc: 'Snowbound ramparts. Three gates, one stronghold, no cover you did not build.',
    mapShipName: 'Transport Ship',
    mapShipDesc: 'Container deck, narrow lanes. Ice and Fire factions boarding from the bow.',
  },
  enemies: {
    enemyRanger: 'Ranger',
    enemyCavalry: 'Cavalry',
    enemyDreadnought: 'Dreadnought',
  },
  towers: {
    towerFrost: 'Frost Spire',
    towerFrostDesc: 'Slows what it hits. Cheap, patient, stacks with Ice wing.',
    towerEmber: 'Ember Ballista',
    towerEmberDesc: 'Splash damage. Made for the moment the lanes fill up.',
  },
  messages: {
    notEnoughGold: 'Not enough gold',
    coreUnderAttack: 'The stronghold is under attack',
    novaReady: 'Nova ready',
    revived: 'Back on the wall',
    bossIncoming: 'Dreadnought approaching',
    waveCleared: 'Wave cleared',
    socketEmpty: 'Empty socket',
    socketBuilt: '{tower} raised',
    socketUpgraded: '{tower} to level {level}',
    playerDown: 'You are down - respawning at the stronghold',
    pausedByContext: 'Graphics context lost - the run is paused',
  },
  challenge: { daily: 'Daily seed', seed: 'Seed' },
  errors: {
    loadingTitle: 'Raising the stronghold',
    loadingBody: 'Loading the siege engine...',
    webglTitle: 'Lite mode',
    webglBody: 'This device cannot run the 3D engine, so the arena is drawn in builder view.',
    failedTitle: 'The engine did not load',
    failedBody: 'Check your connection and try again — nothing was lost.',
    retry: 'Try again',
  },
};

const ES = {
  game: {
    title: 'Asedio de Eden',
    kicker: 'Arena Hielo y Fuego · VTS 1097',
    tagline: 'Aguanta la línea. El Hielo controla, el Fuego quema, y las alas recuerdan cada cadena.',
  },
  hud: {
    score: 'Puntos', best: 'Récord', wave: 'Oleada', gold: 'Oro', core: 'Fortaleza',
    combo: 'Cadena', nova: 'Nova', build: 'Construir', upgrade: 'Mejorar', level: 'Nv',
    pause: 'Pausa', resume: 'Continuar', mute: 'Sonido sí', unmute: 'Sonido no',
    restart: 'Reiniciar', backToArcade: 'Arcade', swap: 'Cambiar ala', attack: 'Atacar',
    controls: 'WASD / flechas mover · Espacio atacar · Q E cambiar ala · F nova · Esc pausa',
  },
  elements: { elementIce: 'Hielo', elementFire: 'Fuego' },
  phases: {
    readyTitle: 'Elige tu ala',
    readyBody: 'Las oleadas cruzan las puertas en {seconds}s. Defiende la fortaleza.',
    readyStart: 'Empezar el asedio',
    buildTitle: 'Entre oleadas',
    buildBody: 'Gasta oro en torres antes de que se abra la siguiente puerta.',
    waveTitle: 'Oleada {n}',
    waveBoss: 'Oleada de jefe',
    pauseTitle: 'En pausa',
    pauseBody: 'El asedio espera. Cambiar de pestaña pausa la partida.',
    victoryTitle: 'Fortaleza en pie',
    victoryBody: 'Todas las oleadas rotas. Las alas quedaron saciadas.',
    defeatTitle: 'La puerta cayó',
    defeatBody: 'La fortaleza se perdió, pero el récord sigue en pie.',
  },
  results: {
    score: 'Puntuación final', best: 'Récord personal', newBest: 'Nuevo récord',
    waves: 'Oleadas superadas', kills: 'Bajas', share: 'Compartir', copied: 'Copiado',
    playAgain: 'Otra vez',
  },
  maps: {
    mapKeepName: 'Muralla del Torreón',
    mapKeepDesc: 'Murallas nevadas. Tres puertas, una fortaleza.',
    mapShipName: 'Buque de transporte',
    mapShipDesc: 'Cubierta de contenedores, pasillos estrechos.',
  },
  tips: [
    'Alterna bajas de Hielo y Fuego: ahí está el multiplicador de la cadena.',
    'El Hielo detiene a la caballería. El Fuego remata lo que el Hielo inmoviliza.',
    'La Nova se carga con bajas; guárdala para un jefe, no para un explorador aislado.',
    'Las torres siguen disparando cuando caes. Construye antes de necesitarlas.',
  ],
  enemies: { enemyRanger: 'Explorador', enemyCavalry: 'Caballería', enemyDreadnought: 'Acorazado' },
  towers: {
    towerFrost: 'Aguja de Escarcha',
    towerFrostDesc: 'Ralentiza al objetivo. Económica y paciente; se combina con el ala de Hielo.',
    towerEmber: 'Ballesta de Ascuas',
    towerEmberDesc: 'Daño de área, perfecta cuando los carriles se llenan.',
  },
  messages: {
    notEnoughGold: 'No hay suficiente oro',
    coreUnderAttack: 'La fortaleza está bajo ataque',
    novaReady: 'Nova lista',
    revived: 'De vuelta en la muralla',
    bossIncoming: 'Se acerca el Acorazado',
    waveCleared: 'Oleada superada',
    socketEmpty: 'Espacio vacío',
    socketBuilt: '{tower} construida',
    socketUpgraded: '{tower} al nivel {level}',
    playerDown: 'Has caído; reaparecerás en la fortaleza',
    pausedByContext: 'Se perdió el contexto gráfico; la partida está en pausa',
  },
  challenge: { daily: 'Semilla diaria', seed: 'Semilla' },
  errors: {
    loadingTitle: 'Preparando la fortaleza',
    loadingBody: 'Cargando el motor de asedio...',
    webglTitle: 'Modo ligero',
    webglBody: 'Este dispositivo no puede ejecutar el motor 3D; la arena se mostrará en modo simple.',
    failedTitle: 'No se pudo cargar el motor',
    failedBody: 'Comprueba la conexión e inténtalo de nuevo. No se perdió nada.',
    retry: 'Intentar de nuevo',
  },
};

const RU = {
  game: {
    title: 'Осада Эдема',
    kicker: 'Арена Льда и Огня · VTS 1097',
    tagline: 'Держи линию. Лёд держит, Огонь жжёт, а крылья помнят каждую цепь.',
  },
  hud: {
    score: 'Очки', best: 'Рекорд', wave: 'Волна', gold: 'Золото', core: 'Крепость',
    combo: 'Цепь', nova: 'Нова', build: 'Строить', upgrade: 'Улучшить', level: 'Ур',
    pause: 'Пауза', resume: 'Продолжить', mute: 'Звук вкл', unmute: 'Звук выкл',
    restart: 'Заново', backToArcade: 'Аркада', swap: 'Сменить крыло', attack: 'Атака',
    controls: 'WASD / стрелки — движение · Пробел — атака · Q E — крыло · F — нова · Esc — пауза',
  },
  elements: { elementIce: 'Лёд', elementFire: 'Огонь' },
  phases: {
    readyTitle: 'Выбери крыло',
    readyBody: 'Волны пройдут через ворота через {seconds} с. Держи крепость.',
    readyStart: 'Начать осаду',
    buildTitle: 'Между волнами',
    buildBody: 'Потрать золото на башни до открытия следующих ворот.',
    waveTitle: 'Волна {n}',
    waveBoss: 'Волна босса',
    pauseTitle: 'Пауза',
    pauseBody: 'Осада ждёт. Смена вкладки ставит игру на паузу.',
    victoryTitle: 'Крепость устояла',
    victoryBody: 'Все волны отбиты.',
    defeatTitle: 'Ворота пали',
    defeatBody: 'Крепость потеряна, но рекорд остался.',
  },
  results: {
    score: 'Итоговый счёт', best: 'Личный рекорд', newBest: 'Новый рекорд',
    waves: 'Волн пройдено', kills: 'Убийств', share: 'Поделиться', copied: 'Скопировано',
    playAgain: 'Ещё раз',
  },
  maps: {
    mapKeepName: 'Стена цитадели',
    mapKeepDesc: 'Снежные стены. Трое ворот, одна крепость.',
    mapShipName: 'Транспортный корабль',
    mapShipDesc: 'Палуба с контейнерами, узкие проходы.',
  },
  tips: [
    'Чередуйте убийства Льдом и Огнём — так растёт множитель серии.',
    'Лёд останавливает кавалерию. Огонь добивает тех, кого сдержал Лёд.',
    'Нова заряжается за убийства; придержите её для босса, а не для одиночного стрелка.',
    'Башни продолжают стрелять, пока вы без сознания. Стройте их заранее.',
  ],
  enemies: { enemyRanger: 'Стрелок', enemyCavalry: 'Кавалерия', enemyDreadnought: 'Дредноут' },
  towers: {
    towerFrost: 'Ледяной шпиль',
    towerFrostDesc: 'Замедляет цель. Дешёвый и надёжный; усиливает крыло Льда.',
    towerEmber: 'Угольная баллиста',
    towerEmberDesc: 'Урон по области для плотных волн на линии.',
  },
  messages: {
    notEnoughGold: 'Недостаточно золота',
    coreUnderAttack: 'Крепость под атакой',
    novaReady: 'Нова готова',
    revived: 'Вы снова на стене',
    bossIncoming: 'Приближается Дредноут',
    waveCleared: 'Волна отбита',
    socketEmpty: 'Свободная площадка',
    socketBuilt: 'Построено: {tower}',
    socketUpgraded: '{tower}: уровень {level}',
    playerDown: 'Вы пали — возрождение у крепости',
    pausedByContext: 'Графический контекст потерян — игра на паузе',
  },
  challenge: { daily: 'Семя дня', seed: 'Семя' },
  errors: {
    loadingTitle: 'Подготовка крепости',
    loadingBody: 'Загрузка осады...',
    webglTitle: 'Лёгкий режим',
    webglBody: 'Это устройство не поддерживает 3D-движок; арена будет показана в упрощённом виде.',
    failedTitle: 'Не удалось загрузить движок',
    failedBody: 'Проверьте подключение и попробуйте снова — прогресс не потерян.',
    retry: 'Повторить',
  },
};

const AR = {
  game: {
    title: 'حصار عدن',
    kicker: 'ساحة الجليد والنار · VTS 1097',
    tagline: 'اثبت على الخط. الجليد يوقف، والنار تحرق، والأجنحة تتذكر كل سلسلة.',
  },
  hud: {
    score: 'النقاط', best: 'الأفضل', wave: 'الموجة', gold: 'الذهب', core: 'الحصن',
    combo: 'السلسلة', nova: 'نوفا', build: 'بناء', upgrade: 'ترقية', level: 'مستوى',
    pause: 'إيقاف', resume: 'متابعة', mute: 'الصوت مفعل', unmute: 'الصوت مغلق',
    restart: 'إعادة', backToArcade: 'الأركيد', swap: 'تبديل الجناح', attack: 'هجوم',
    controls: 'WASD للحركة · مسافة للهجوم · Q E للجناح · F لنوفا · Esc للإيقاف',
  },
  elements: { elementIce: 'جليد', elementFire: 'نار' },
  phases: {
    readyTitle: 'اختر جناحك',
    readyBody: 'تعبر الموجات البوابات خلال {seconds} ثانية. دافع عن الحصن.',
    readyStart: 'ابدأ الحصار',
    buildTitle: 'بين الموجات',
    buildBody: 'أنفق الذهب على الأبراج قبل فتح البوابة التالية.',
    waveTitle: 'الموجة {n}',
    waveBoss: 'موجة الزعيم',
    pauseTitle: 'متوقف',
    pauseBody: 'الحصار ينتظر. تغيير التبويب يوقف الجولة تلقائياً.',
    victoryTitle: 'صمد الحصن',
    victoryBody: 'كُسرت كل الموجات.',
    defeatTitle: 'سقطت البوابة',
    defeatBody: 'ضاع الحصن، لكن الرقم القياسي ما زال قائماً.',
  },
  results: {
    score: 'النتيجة النهائية', best: 'أفضل نتيجة', newBest: 'رقم قياسي جديد',
    waves: 'الموجات المنجزة', kills: 'القتلى', share: 'شارك', copied: 'تم النسخ',
    playAgain: 'العب مرة أخرى',
  },
  maps: {
    mapKeepName: 'سور القلعة',
    mapKeepDesc: 'أسوار مغطاة بالثلج. ثلاث بوابات وحصن واحد.',
    mapShipName: 'سفينة النقل',
    mapShipDesc: 'سطح الحاويات وممرات ضيقة.',
  },
  tips: [
    'بدّل بين قتلى الجليد والنار؛ فمضاعف السلسلة هو سر النقاط.',
    'يوقف الجليد اندفاع الفرسان، وتُنهي النار ما أمسكه الجليد.',
    'تُشحن نوفا بالقتل؛ احتفظ بها للزعيم لا لقنّاص منفرد.',
    'تواصل الأبراج إطلاق النار عند سقوطك. ابنها قبل أن تحتاج إليها.',
  ],
  enemies: { enemyRanger: 'رامٍ', enemyCavalry: 'فرسان', enemyDreadnought: 'مدرّعة' },
  towers: {
    towerFrost: 'برج الصقيع',
    towerFrostDesc: 'يبطئ الهدف. رخيص وصبور، ويتكامل مع جناح الجليد.',
    towerEmber: 'قذّافة الجمر',
    towerEmberDesc: 'ضرر انفجاري للممرات حين تمتلئ بالأعداء.',
  },
  messages: {
    notEnoughGold: 'الذهب لا يكفي',
    coreUnderAttack: 'الحصن يتعرض للهجوم',
    novaReady: 'نوفا جاهزة',
    revived: 'عدت إلى السور',
    bossIncoming: 'المدرّعة تقترب',
    waveCleared: 'تم صد الموجة',
    socketEmpty: 'موضع فارغ',
    socketBuilt: 'تم بناء {tower}',
    socketUpgraded: 'تمت ترقية {tower} إلى المستوى {level}',
    playerDown: 'سقطت — ستُبعث عند الحصن',
    pausedByContext: 'فُقد سياق الرسوم — الجولة متوقفة مؤقتاً',
  },
  challenge: { daily: 'بذرة اليوم', seed: 'البذرة' },
  errors: {
    loadingTitle: 'نجهّز الحصن',
    loadingBody: 'جارٍ تحميل محرك الحصار...',
    webglTitle: 'الوضع الخفيف',
    webglBody: 'لا يستطيع هذا الجهاز تشغيل محرك ثلاثي الأبعاد؛ ستُعرض الساحة بوضع مبسّط.',
    failedTitle: 'تعذّر تحميل المحرك',
    failedBody: 'تحقّق من اتصالك وحاول مجدداً — لم يضع شيء.',
    retry: 'حاول مجدداً',
  },
};

const ZH = {
  game: {
    title: '伊甸围城',
    kicker: '冰火竞技场 · VTS 1097',
    tagline: '守住防线。冰控制，火灼烧，双翼会记住每一次连击。',
  },
  hud: {
    score: '得分', best: '最佳', wave: '波次', gold: '金币', core: '要塞',
    combo: '连击', nova: '新星', build: '建造', upgrade: '升级', level: '等级',
    pause: '暂停', resume: '继续', mute: '音效开', unmute: '音效关',
    restart: '重新开始', backToArcade: '街机', swap: '切换翼', attack: '攻击',
    controls: 'WASD/方向键移动 · 空格攻击 · Q E 切换翼 · F 新星 · Esc 暂停',
  },
  elements: { elementIce: '冰', elementFire: '火' },
  phases: {
    readyTitle: '选择你的翼',
    readyBody: '{seconds} 秒后敌人将通过城门。守住要塞。',
    readyStart: '开始围城',
    buildTitle: '波次间歇',
    buildBody: '在下一道门开启前用金币建造防御塔。',
    waveTitle: '第 {n} 波',
    waveBoss: '首领波次',
    pauseTitle: '已暂停',
    pauseBody: '围城已暂停，切换标签页会自动暂停。',
    victoryTitle: '要塞守住了',
    victoryBody: '所有波次都被击破。',
    defeatTitle: '城门失守',
    defeatBody: '要塞失守，但记录仍在。',
  },
  results: {
    score: '最终得分', best: '个人最佳', newBest: '新纪录',
    waves: '通过波次', kills: '击杀', share: '分享', copied: '已复制',
    playAgain: '再来一局',
  },
  maps: {
    mapKeepName: '堡垒城墙',
    mapKeepDesc: '覆雪的城墙，三道城门，一座要塞。',
    mapShipName: '运输船',
    mapShipDesc: '集装箱甲板，狭窄通道。',
  },
  tips: [
    '交替使用冰与火击杀，连击倍率决定得分。',
    '冰能定住冲锋的骑兵，火焰负责解决被冰控住的敌人。',
    '击杀会为新星充能；留给首领波次，别浪费在落单的游骑兵身上。',
    '倒下时防御塔仍会继续攻击，提前建好它们。',
  ],
  enemies: { enemyRanger: '游骑兵', enemyCavalry: '骑兵', enemyDreadnought: '无畏战舰' },
  towers: {
    towerFrost: '寒霜尖塔',
    towerFrostDesc: '命中后减速。造价低、火力稳定，可与冰翼配合。',
    towerEmber: '余烬弩炮',
    towerEmberDesc: '范围伤害，适合敌人挤满通道时使用。',
  },
  messages: {
    notEnoughGold: '金币不足',
    coreUnderAttack: '要塞正在遭受攻击',
    novaReady: '新星已就绪',
    revived: '已重返城墙',
    bossIncoming: '无畏战舰正在接近',
    waveCleared: '波次已清除',
    socketEmpty: '空置塔位',
    socketBuilt: '已建造{tower}',
    socketUpgraded: '{tower}已升至{level}级',
    playerDown: '你已倒下，将在要塞复活',
    pausedByContext: '图形上下文已丢失，战斗已暂停',
  },
  challenge: { daily: '每日种子', seed: '种子' },
  errors: {
    loadingTitle: '正在加固要塞',
    loadingBody: '正在加载围城引擎...',
    webglTitle: '轻量模式',
    webglBody: '此设备无法运行 3D 引擎，战场将以简化模式绘制。',
    failedTitle: '引擎加载失败',
    failedBody: '请检查网络后重试，进度不会丢失。',
    retry: '重试',
  },
};

export const LOCALES = ['en', 'es', 'pt', 'de', 'fr', 'hr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];
export const COPY = {
  en: EN,
  es: ES,
  pt: EN,
  de: EN,
  fr: EN,
  hr: EN,
  tr: EN,
  ru: RU,
  id: EN,
  zh: ZH,
  ar: AR,
  kr: EN,
  it: EN,
};

function merge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = out[key];
    out[key] =
      baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)
        ? merge(baseValue, value)
        : value;
  }
  return out;
}

export function normalizeLocale(locale) {
  const value = String(locale || 'en').toLowerCase();
  if (value.startsWith('ko')) return 'kr';
  const short = value.split('-')[0];
  return LOCALES.includes(short) ? short : 'en';
}

export function getCopy(locale) {
  const normalized = normalizeLocale(locale);
  return merge(COPY.en, COPY[normalized]);
}

export function formatCopy(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
