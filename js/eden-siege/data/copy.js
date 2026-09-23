// Game copy. English is the source of truth; every other locale is merged over
// it key by key, so a partially translated locale shows English for the keys it
// has not covered yet instead of an empty string.
//
// Added locales at once here: en (complete), plus es, ru, ar and zh as the
// first pass — they also exercise RTL (ar) and long-word layouts (de is the
// worst case, and is deliberately left for the L3 translation lane).
//
// NOTE: this dictionary is deliberately NOT wired into js/i18n/*.js yet. That
// step (13-locale parity, check-i18n key coverage, standalone-copy keys) is
// lane L3 in docs/plans/arcade-live-arena.md, because `npm run i18n:check`
// requires every locale to carry the same key set as English in the same PR.

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
    playerDown: 'Has caido - reapareces en la fortaleza',
  },
  maps: {
    mapKeepName: 'Muralla del Torreón',
    mapKeepDesc: 'Murallas nevadas. Tres puertas, una fortaleza.',
    mapShipName: 'Buque de transporte',
    mapShipDesc: 'Cubierta de contenedores, pasillos estrechos.',
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
    playerDown: 'Вы пали — возрождение у крепости',
  },
  maps: {
    mapKeepName: 'Стена цитадели',
    mapKeepDesc: 'Снежные стены. Трое ворот, одна крепость.',
    mapShipName: 'Транспортный корабль',
    mapShipDesc: 'Палуба с контейнерами, узкие проходы.',
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
    playerDown: 'سقطت — ستُبعث عند الحصن',
  },
  maps: {
    mapKeepName: 'سور القلعة',
    mapKeepDesc: 'أسوار مغطاة بالثلج. ثلاث بوابات وحصن واحد.',
    mapShipName: 'سفينة النقل',
    mapShipDesc: 'سطح الحاويات وممرات ضيقة.',
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
    playerDown: '你已倒下，将在要塞复活',
  },
  maps: {
    mapKeepName: '堡垒城墙',
    mapKeepDesc: '覆雪的城墙，三道城门，一座要塞。',
    mapShipName: '运输船',
    mapShipDesc: '集装箱甲板，狭窄通道。',
  },
};

export const COPY = { en: EN, es: ES, ru: RU, ar: AR, zh: ZH };
export const LOCALES = ['en', 'es', 'pt', 'de', 'fr', 'hr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];

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
