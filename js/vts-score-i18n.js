const STORAGE_KEY = 'vts_hero_lang';

export const VTS_SCORE_LANGUAGES = Object.freeze(['en', 'ar', 'es', 'pt', 'fr', 'de']);

const BASE_COPY = Object.freeze({
  en: {
    language: 'Language',
    theme: 'Theme',
    kicker: 'DEVELOPMENT RACE · FINAL CHECK',
    title: 'Upload tonight’s Total Power',
    intro:
      'Choose the same game name used for the All-Star sign-up, upload one current power screenshot, review your Total Power, and submit it for comparison with your sign-up baseline.',
    deadlineLabel: 'Final deadline',
    deadline: 'Wednesday, 29 July · 20:00 Game Time',
    members: 'VTS MEMBERS',
    unlockTitle: 'Unlock final score upload',
    unlockHelp: 'Use the same VTS member PIN as the All-Star sign-up hub.',
    pin: 'Member PIN',
    unlock: 'Unlock',
    gameName: 'Your game name',
    gameNameHelp: 'Search all signed-up players, then choose your exact name.',
    gameNamePlaceholder: 'Start typing your game name',
    searchHint: 'Type part of the name; the closest sign-up matches will appear.',
    noMatch: 'No sign-up found with that name. Check the spelling, or contact leadership.',
    screenshot: 'Current power screenshot',
    screenshotHelp:
      'Upload one clear account power-breakdown image. PNG, JPEG, or WebP; max 10 MB.',
    consent:
      'I understand the image is sent to the secured OCR service to read visible numbers. The image itself is not saved.',
    readPower: 'Read Total Power',
    confirmedPower: 'Confirmed Total Power',
    confirmedHelp: 'Check this number against the screenshot and correct it if OCR made a mistake.',
    submit: 'Submit final Total Power',
    saved: 'FINAL SCORE SAVED',
    thankYou: 'Thank you,',
    successPrefix: 'Your final Total Power is',
    successSuffix: 'Leadership can now compare it with your sign-up value.',
    back: 'Back to toolkit',
    closestNames: 'Closest signed-up player names',
  },
  ar: {
    language: 'اللغة',
    theme: 'المظهر',
    kicker: 'سباق التطوير · المراجعة النهائية',
    title: 'ارفع إجمالي القوة الليلة',
    intro:
      'اختر اسم اللعبة نفسه المستخدم في تسجيل All-Star، وارفع صورة حديثة للقوة، وراجع إجمالي القوة ثم أرسله لمقارنته بقيمة التسجيل.',
    deadlineLabel: 'الموعد النهائي',
    deadline: 'الأربعاء، 29 يوليو · 20:00 بتوقيت اللعبة',
    members: 'أعضاء VTS',
    unlockTitle: 'فتح رفع النتيجة النهائية',
    unlockHelp: 'استخدم رمز PIN نفسه الخاص بأعضاء VTS في مركز تسجيل All-Star.',
    pin: 'رمز PIN للعضو',
    unlock: 'فتح',
    gameName: 'اسمك في اللعبة',
    gameNameHelp: 'ابحث في جميع اللاعبين المسجلين ثم اختر اسمك الصحيح.',
    gameNamePlaceholder: 'ابدأ بكتابة اسمك في اللعبة',
    searchHint: 'اكتب جزءًا من الاسم وستظهر أقرب نتائج التسجيل.',
    noMatch: 'لا يوجد تسجيل بهذا الاسم. تحقق من الإملاء أو تواصل مع القيادة.',
    screenshot: 'صورة القوة الحالية',
    screenshotHelp: 'ارفع صورة واضحة لتفاصيل قوة الحساب. PNG أو JPEG أو WebP؛ بحد أقصى 10 MB.',
    consent:
      'أفهم أن الصورة تُرسل إلى خدمة OCR الآمنة لقراءة الأرقام الظاهرة، وأن الصورة نفسها لا تُحفظ.',
    readPower: 'قراءة إجمالي القوة',
    confirmedPower: 'إجمالي القوة المؤكد',
    confirmedHelp: 'قارن الرقم بالصورة وصححه إذا أخطأت قراءة OCR.',
    submit: 'إرسال إجمالي القوة النهائي',
    saved: 'تم حفظ النتيجة النهائية',
    thankYou: 'شكرًا،',
    successPrefix: 'إجمالي قوتك النهائي هو',
    successSuffix: 'يمكن للقيادة الآن مقارنته بقيمة التسجيل.',
    back: 'العودة إلى الأدوات',
    closestNames: 'أقرب أسماء اللاعبين المسجلين',
  },
  es: {
    language: 'Idioma',
    theme: 'Tema',
    kicker: 'CARRERA DE DESARROLLO · REVISIÓN FINAL',
    title: 'Sube tu Poder Total de esta noche',
    intro:
      'Elige el mismo nombre usado en la inscripción All-Star, sube una captura actual, revisa tu Poder Total y envíalo para compararlo con tu valor inicial.',
    deadlineLabel: 'Fecha límite',
    deadline: 'Miércoles, 29 de julio · 20:00 hora del juego',
    members: 'MIEMBROS VTS',
    unlockTitle: 'Desbloquear la carga final',
    unlockHelp: 'Usa el mismo PIN de miembro VTS del registro All-Star.',
    pin: 'PIN de miembro',
    unlock: 'Desbloquear',
    gameName: 'Tu nombre en el juego',
    gameNameHelp: 'Busca entre todos los inscritos y elige tu nombre exacto.',
    gameNamePlaceholder: 'Empieza a escribir tu nombre',
    searchHint: 'Escribe parte del nombre para ver las coincidencias más cercanas.',
    noMatch:
      'No hay ninguna inscripción con ese nombre. Revisa la ortografía o contacta con el liderazgo.',
    screenshot: 'Captura de poder actual',
    screenshotHelp: 'Sube una imagen clara del desglose de poder. PNG, JPEG o WebP; máximo 10 MB.',
    consent:
      'Entiendo que la imagen se envía al OCR seguro para leer los números visibles y que no se guarda.',
    readPower: 'Leer Poder Total',
    confirmedPower: 'Poder Total confirmado',
    confirmedHelp: 'Compara el número con la captura y corrígelo si el OCR se equivocó.',
    submit: 'Enviar Poder Total final',
    saved: 'PUNTUACIÓN FINAL GUARDADA',
    thankYou: 'Gracias,',
    successPrefix: 'Tu Poder Total final es',
    successSuffix: 'El liderazgo ya puede compararlo con tu valor de inscripción.',
    back: 'Volver a las herramientas',
    closestNames: 'Nombres inscritos más cercanos',
  },
  pt: {
    language: 'Idioma',
    theme: 'Tema',
    kicker: 'CORRIDA DE DESENVOLVIMENTO · REVISÃO FINAL',
    title: 'Envie seu Poder Total de hoje',
    intro:
      'Escolha o mesmo nome da inscrição All-Star, envie uma captura atual, revise seu Poder Total e confirme para comparar com o valor inicial.',
    deadlineLabel: 'Prazo final',
    deadline: 'Quarta-feira, 29 de julho · 20:00 no jogo',
    members: 'MEMBROS VTS',
    unlockTitle: 'Desbloquear envio final',
    unlockHelp: 'Use o mesmo PIN de membro VTS da inscrição All-Star.',
    pin: 'PIN de membro',
    unlock: 'Desbloquear',
    gameName: 'Seu nome no jogo',
    gameNameHelp: 'Pesquise todos os inscritos e escolha seu nome exato.',
    gameNamePlaceholder: 'Comece a digitar seu nome',
    searchHint: 'Digite parte do nome para ver as correspondências mais próximas.',
    noMatch:
      'Nenhuma inscrição encontrada com esse nome. Verifique a grafia ou fale com a liderança.',
    screenshot: 'Captura do poder atual',
    screenshotHelp:
      'Envie uma imagem clara do detalhamento de poder. PNG, JPEG ou WebP; até 10 MB.',
    consent:
      'Entendo que a imagem é enviada ao OCR seguro para ler os números visíveis e não é salva.',
    readPower: 'Ler Poder Total',
    confirmedPower: 'Poder Total confirmado',
    confirmedHelp: 'Confira o número na captura e corrija se o OCR tiver errado.',
    submit: 'Enviar Poder Total final',
    saved: 'PONTUAÇÃO FINAL SALVA',
    thankYou: 'Obrigado,',
    successPrefix: 'Seu Poder Total final é',
    successSuffix: 'A liderança já pode compará-lo com o valor da inscrição.',
    back: 'Voltar às ferramentas',
    closestNames: 'Nomes inscritos mais próximos',
  },
  fr: {
    language: 'Langue',
    theme: 'Thème',
    kicker: 'COURSE AU DÉVELOPPEMENT · CONTRÔLE FINAL',
    title: 'Envoyez votre Puissance totale',
    intro:
      'Choisissez le nom utilisé lors de l’inscription All-Star, ajoutez une capture actuelle, vérifiez votre Puissance totale et envoyez-la pour comparaison.',
    deadlineLabel: 'Date limite',
    deadline: 'Mercredi 29 juillet · 20:00 heure du jeu',
    members: 'MEMBRES VTS',
    unlockTitle: 'Déverrouiller l’envoi final',
    unlockHelp: 'Utilisez le même code PIN VTS que pour l’inscription All-Star.',
    pin: 'Code PIN membre',
    unlock: 'Déverrouiller',
    gameName: 'Votre nom en jeu',
    gameNameHelp: 'Recherchez tous les inscrits, puis choisissez votre nom exact.',
    gameNamePlaceholder: 'Commencez à saisir votre nom',
    searchHint: 'Saisissez une partie du nom pour afficher les correspondances les plus proches.',
    noMatch:
      'Aucune inscription trouvée à ce nom. Vérifiez l’orthographe ou contactez la direction.',
    screenshot: 'Capture de puissance actuelle',
    screenshotHelp:
      'Ajoutez une image nette du détail de puissance. PNG, JPEG ou WebP ; 10 Mo max.',
    consent:
      'Je comprends que l’image est envoyée au service OCR sécurisé pour lire les nombres visibles et qu’elle n’est pas conservée.',
    readPower: 'Lire la Puissance totale',
    confirmedPower: 'Puissance totale confirmée',
    confirmedHelp: 'Comparez ce nombre à la capture et corrigez-le si l’OCR s’est trompé.',
    submit: 'Envoyer la Puissance totale',
    saved: 'SCORE FINAL ENREGISTRÉ',
    thankYou: 'Merci,',
    successPrefix: 'Votre Puissance totale finale est',
    successSuffix: 'Le commandement peut maintenant la comparer à votre inscription.',
    back: 'Retour aux outils',
    closestNames: 'Noms d’inscrits les plus proches',
  },
  de: {
    language: 'Sprache',
    theme: 'Design',
    kicker: 'ENTWICKLUNGSRENNEN · LETZTE PRÜFUNG',
    title: 'Lade deine heutige Gesamtstärke hoch',
    intro:
      'Wähle denselben Namen wie bei der All-Star-Anmeldung, lade einen aktuellen Screenshot hoch, prüfe deine Gesamtstärke und sende sie zum Vergleich.',
    deadlineLabel: 'Letzte Frist',
    deadline: 'Mittwoch, 29. Juli · 20:00 Spielzeit',
    members: 'VTS-MITGLIEDER',
    unlockTitle: 'Finalen Upload freischalten',
    unlockHelp: 'Nutze dieselbe VTS-Mitglieder-PIN wie bei der All-Star-Anmeldung.',
    pin: 'Mitglieder-PIN',
    unlock: 'Freischalten',
    gameName: 'Dein Name im Spiel',
    gameNameHelp: 'Durchsuche alle Anmeldungen und wähle deinen exakten Namen.',
    gameNamePlaceholder: 'Beginne deinen Namen einzugeben',
    searchHint: 'Gib einen Teil des Namens ein, um die ähnlichsten Treffer zu sehen.',
    noMatch:
      'Keine Anmeldung mit diesem Namen gefunden. Prüfe die Schreibweise oder wende dich an die Leitung.',
    screenshot: 'Aktueller Stärke-Screenshot',
    screenshotHelp:
      'Lade ein klares Bild der Stärkeübersicht hoch. PNG, JPEG oder WebP; max. 10 MB.',
    consent:
      'Ich verstehe, dass das Bild zum sicheren OCR-Dienst gesendet wird, um sichtbare Zahlen zu lesen, und nicht gespeichert wird.',
    readPower: 'Gesamtstärke lesen',
    confirmedPower: 'Bestätigte Gesamtstärke',
    confirmedHelp: 'Vergleiche die Zahl mit dem Screenshot und korrigiere mögliche OCR-Fehler.',
    submit: 'Finale Gesamtstärke senden',
    saved: 'ENDSTAND GESPEICHERT',
    thankYou: 'Danke,',
    successPrefix: 'Deine finale Gesamtstärke ist',
    successSuffix: 'Die Leitung kann sie jetzt mit deiner Anmeldung vergleichen.',
    back: 'Zurück zu den Werkzeugen',
    closestNames: 'Ähnlichste angemeldete Spielernamen',
  },
});

const FULL_BREAKDOWN_COPY = Object.freeze({
  en: {
    title: 'Upload tonight’s power breakdown',
    intro:
      'Choose your All-Star sign-up name, upload one current power screenshot, review every value, and submit the full breakdown for comparison.',
    readPower: 'Read all power values',
    confirmedPower: 'Confirm every power value',
    confirmedHelp: 'Check every number against the screenshot and correct any OCR mistakes.',
    submit: 'Submit full power breakdown',
    successPrefix: 'Your full breakdown was saved. Total Power:',
    successSuffix: 'Leadership can now compare every value with your sign-up baseline.',
    fieldTotalCastlePower: 'Total Combat Power',
    fieldTroopPower: 'Troop Power',
    fieldBuildingPower: 'Building Power',
    fieldTechnologyPower: 'Technology Power',
    fieldHeroCombatPower: 'Hero Combat Power',
    fieldDragonPower: 'Dragons Power',
    fieldUnitSpecialtyPower: 'Unit Specialty Power',
    fieldArtifactPower: 'Artifact Power',
    fieldRoyalTechPower: 'Royal Tech Power',
    optional: 'Optional',
    ocrRead: 'OCR read',
    notDetected: 'Not detected',
    confidence: 'confidence',
    reviewRequired: 'Review required',
    readingProgress: 'Reading power values from your screenshot\u2026',
  },
  ar: {
    title: 'ارفع تفاصيل القوة الليلة',
    intro: 'اختر اسم تسجيل All-Star وارفع صورة القوة الحالية وراجع كل القيم قبل الإرسال.',
    readPower: 'قراءة جميع قيم القوة',
    confirmedPower: 'تأكيد جميع قيم القوة',
    confirmedHelp: 'راجع كل رقم مع الصورة وصحح أي خطأ في القراءة.',
    submit: 'إرسال تفاصيل القوة كاملة',
    successPrefix: 'تم حفظ التفاصيل كاملة. إجمالي القوة:',
    successSuffix: 'يمكن للقيادة الآن مقارنة كل قيمة بقيم التسجيل.',
    fieldTotalCastlePower: 'إجمالي القوة القتالية',
    fieldTroopPower: 'قوة القوات',
    fieldBuildingPower: 'قوة المباني',
    fieldTechnologyPower: 'قوة التقنية',
    fieldHeroCombatPower: 'قوة الأبطال',
    fieldDragonPower: 'قوة التنانين',
    fieldUnitSpecialtyPower: 'قوة تخصص الوحدات',
    fieldArtifactPower: 'قوة القطع الأثرية',
    fieldRoyalTechPower: 'قوة التقنية الملكية',
    optional: 'اختياري',
    ocrRead: 'قراءة OCR',
    notDetected: 'لم يتم اكتشافه',
    confidence: 'ثقة',
    reviewRequired: 'تحتاج مراجعة',
    readingProgress: 'جارٍ قراءة قيم القوة من صورتك\u2026',
  },
  es: {
    title: 'Sube el desglose de poder de esta noche',
    intro:
      'Elige tu nombre de registro All-Star, sube la captura actual y revisa todos los valores.',
    readPower: 'Leer todos los valores',
    confirmedPower: 'Confirma cada valor de poder',
    confirmedHelp: 'Compara cada número con la captura y corrige cualquier error del OCR.',
    submit: 'Enviar desglose completo',
    successPrefix: 'Se guardó el desglose completo. Poder total:',
    successSuffix: 'El liderazgo ya puede comparar cada valor con tu registro.',
    fieldTotalCastlePower: 'Poder de combate total',
    fieldTroopPower: 'Poder de tropas',
    fieldBuildingPower: 'Poder de edificios',
    fieldTechnologyPower: 'Poder tecnológico',
    fieldHeroCombatPower: 'Poder de héroes',
    fieldDragonPower: 'Poder de dragones',
    fieldUnitSpecialtyPower: 'Poder de especialidad',
    fieldArtifactPower: 'Poder de artefactos',
    fieldRoyalTechPower: 'Poder tecnológico real',
    optional: 'Opcional',
    ocrRead: 'OCR leyó',
    notDetected: 'No detectado',
    confidence: 'confianza',
    reviewRequired: 'Revisión necesaria',
    readingProgress: 'Leyendo valores de poder de tu captura\u2026',
  },
  pt: {
    title: 'Envie o detalhamento de poder de hoje',
    intro: 'Escolha seu nome do All-Star, envie a captura atual e revise todos os valores.',
    readPower: 'Ler todos os valores',
    confirmedPower: 'Confirme cada valor de poder',
    confirmedHelp: 'Compare cada número com a captura e corrija qualquer erro do OCR.',
    submit: 'Enviar detalhamento completo',
    successPrefix: 'O detalhamento foi salvo. Poder total:',
    successSuffix: 'A liderança já pode comparar cada valor com sua inscrição.',
    fieldTotalCastlePower: 'Poder de combate total',
    fieldTroopPower: 'Poder das tropas',
    fieldBuildingPower: 'Poder de construção',
    fieldTechnologyPower: 'Poder de tecnologia',
    fieldHeroCombatPower: 'Poder dos heróis',
    fieldDragonPower: 'Poder dos dragões',
    fieldUnitSpecialtyPower: 'Poder de especialidade',
    fieldArtifactPower: 'Poder de artefato',
    fieldRoyalTechPower: 'Poder de tecnologia real',
    optional: 'Opcional',
    ocrRead: 'OCR leu',
    notDetected: 'Não detectado',
    confidence: 'confiança',
    reviewRequired: 'Revisão necessária',
    readingProgress: 'Lendo valores de poder da sua captura\u2026',
  },
  fr: {
    title: 'Envoyez le détail de puissance',
    intro: 'Choisissez votre nom All-Star, ajoutez la capture actuelle et vérifiez chaque valeur.',
    readPower: 'Lire toutes les valeurs',
    confirmedPower: 'Confirmez chaque valeur',
    confirmedHelp: 'Comparez chaque nombre à la capture et corrigez toute erreur OCR.',
    submit: 'Envoyer le détail complet',
    successPrefix: 'Le détail complet est enregistré. Puissance totale :',
    successSuffix: 'Le commandement peut comparer chaque valeur à votre inscription.',
    fieldTotalCastlePower: 'Puissance de combat totale',
    fieldTroopPower: 'Puissance des troupes',
    fieldBuildingPower: 'Puissance des bâtiments',
    fieldTechnologyPower: 'Puissance technologique',
    fieldHeroCombatPower: 'Puissance des héros',
    fieldDragonPower: 'Puissance des dragons',
    fieldUnitSpecialtyPower: 'Puissance de spécialité',
    fieldArtifactPower: 'Puissance des artefacts',
    fieldRoyalTechPower: 'Puissance technologique royale',
    optional: 'Facultatif',
    ocrRead: 'Lecture OCR',
    notDetected: 'Non détecté',
    confidence: 'confiance',
    reviewRequired: 'Vérification requise',
    readingProgress: 'Lecture des valeurs de puissance depuis votre capture\u2026',
  },
  de: {
    title: 'Lade die heutige Stärkeübersicht hoch',
    intro: 'Wähle deinen All-Star-Namen, lade den aktuellen Screenshot hoch und prüfe jeden Wert.',
    readPower: 'Alle Stärkewerte lesen',
    confirmedPower: 'Jeden Stärkewert bestätigen',
    confirmedHelp: 'Vergleiche jede Zahl mit dem Screenshot und korrigiere OCR-Fehler.',
    submit: 'Vollständige Übersicht senden',
    successPrefix: 'Die Übersicht wurde gespeichert. Gesamtstärke:',
    successSuffix: 'Die Leitung kann jeden Wert mit deiner Anmeldung vergleichen.',
    fieldTotalCastlePower: 'Gesamtkampfstärke',
    fieldTroopPower: 'Truppenstärke',
    fieldBuildingPower: 'Gebäudestärke',
    fieldTechnologyPower: 'Technologiestärke',
    fieldHeroCombatPower: 'Heldenstärke',
    fieldDragonPower: 'Drachenstärke',
    fieldUnitSpecialtyPower: 'Spezialitätsstärke',
    fieldArtifactPower: 'Artefaktstärke',
    fieldRoyalTechPower: 'Königliche Technologiestärke',
    optional: 'Optional',
    ocrRead: 'OCR gelesen',
    notDetected: 'Nicht erkannt',
    confidence: 'Sicherheit',
    reviewRequired: 'Prüfung erforderlich',
    readingProgress: 'Stärkewerte werden aus Ihrem Screenshot gelesen\u2026',
  },
});

const COPY = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_COPY).map(([language, copy]) => [
      language,
      Object.freeze({ ...copy, ...FULL_BREAKDOWN_COPY[language] }),
    ])
  )
);

function normalizeLanguage(value) {
  const language = String(value || '')
    .trim()
    .toLowerCase()
    .split('-')[0];
  return VTS_SCORE_LANGUAGES.includes(language) ? language : 'en';
}

function interpolate(message, values = {}) {
  return String(message).replace(/\{(\w+)\}/gu, (_, key) =>
    Object.hasOwn(values, key) ? String(values[key]) : `{${key}}`
  );
}

export function auditVtsScoreI18n() {
  const keys = Object.keys(COPY.en);
  const missing = [];
  for (const language of VTS_SCORE_LANGUAGES) {
    for (const key of keys) {
      if (!String(COPY[language]?.[key] || '').trim()) missing.push(`${language}:${key}`);
    }
  }
  return Object.freeze({ ok: missing.length === 0, missing: Object.freeze(missing) });
}

export function createVtsScoreI18n(root = document) {
  let storedLanguage = '';
  try {
    storedLanguage = localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    // Browser language remains available when storage is restricted.
  }
  let language = normalizeLanguage(
    window.VTS_INITIAL_LANGUAGE ||
      storedLanguage ||
      navigator.language ||
      document.documentElement.lang
  );

  function text(key, values) {
    return interpolate(COPY[language]?.[key] || COPY.en[key] || key, values);
  }

  function apply(nextLanguage = language) {
    language = normalizeLanguage(nextLanguage);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Keep the selected language for the active document.
    }
    document.documentElement.lang = language === 'ar' ? 'ar' : language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.querySelectorAll('[data-vts-i18n]').forEach((node) => {
      node.textContent = text(node.dataset.vtsI18n);
    });
    root.querySelectorAll('[data-vts-i18n-placeholder]').forEach((node) => {
      node.placeholder = text(node.dataset.vtsI18nPlaceholder);
    });
    const select =
      root.getElementById?.('vtsScoreLanguage') || root.querySelector('#vtsScoreLanguage');
    if (select) select.value = language;
    const results = root.getElementById?.('vtsScorePlayerResults');
    if (results) results.setAttribute('aria-label', text('closestNames'));
    window.dispatchEvent(new CustomEvent('vts:language-change', { detail: { lang: language } }));
  }

  return Object.freeze({
    apply,
    text,
    get language() {
      return language;
    },
    formatNumber(value) {
      return new Intl.NumberFormat(language === 'ar' ? 'ar' : language).format(value);
    },
  });
}
