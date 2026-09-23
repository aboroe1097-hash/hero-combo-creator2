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

// The revived season registration, which is now the first thing the page asks
// for. Complete in every language this page offers: the form is the member's
// first interaction, so an English fallback there reads as a broken page rather
// than a missing translation.
const SIGNUP_COPY = Object.freeze({
  en: {
    kicker: '2027 SEASON · REGISTER AND FINAL CHECK',
    title: 'Register for the season, then upload your final score',
    intro:
      'Unlock with the VTS member PIN, fill the season registration once, and come back any time registration is open to update it. When leadership calls for the final check, upload one power screenshot and confirm every value against your registration.',
    unlockTitle: 'Unlock the season registration',
    unlockHelp:
      'Use the VTS member PIN leadership shared with you. It opens the registration form and the final score upload.',
    signupForSeason: 'Season {season}',
    signupKicker: '2027 SEASON · MEMBER REGISTRATION',
    signupTitle: 'Fill your season registration',
    signupIntro:
      'Answer once for the new season: your power numbers, the roles you play, and the times you can fight. Leadership builds the teams from these answers.',
    signupStateNone: 'No registration for this season yet. Fill the form once and save.',
    signupStateSaved: 'Your registration is saved (revision {revision}). Saving again replaces it.',
    signupNameHelp: 'Use the exact in-game name leadership sees in the guild list.',
    signupPowerTitle: 'Power numbers',
    signupPowerHint: 'Copy every value from your power breakdown exactly as the game shows it.',
    signupTroopsTitle: 'Troops and heroes',
    signupListHint: 'Separate several values with commas.',
    signupT9TroopTypes: 'T9 troop types',
    signupReadySpeedHeroes: 'Ready speed heroes',
    signupLevel50Heroes: 'Level 50 heroes',
    signupRocLevel: 'ROC level',
    signupRolesTitle: 'Roles, times, and commitment',
    signupPreferredRole: 'Preferred role',
    signupSecondaryRole: 'Second role (optional)',
    signupRoleNone: 'No preference',
    signupRoleFlexible: 'Flexible',
    signupRoleOffensive: 'Offensive team',
    signupRoleRune: 'Rune team',
    signupRoleTop: 'Top side',
    signupRoleBottom: 'Bottom side',
    signupRoleBackup: 'Backup',
    signupAvailability: 'Availability',
    signupAvailabilityAll: 'Every fight',
    signupAvailabilityMost: 'Most fights',
    signupAvailabilityBackup: 'Backup only',
    signupFightingFirst: 'First fighting time',
    signupFightingSecond: 'Second fighting time',
    signupFightingTimesHelp:
      'Pick two different fighting times; leadership uses them to schedule your team.',
    signupMember: 'Signed up for VTS 1097',
    signupYes: 'Yes',
    signupNo: 'No',
    signupContact: 'Contact (optional)',
    signupJoinReason: 'Why you want to join (optional)',
    signupNotes: 'Anything leadership should know (optional)',
    signupSave: 'Save my registration',
    signupSaving: 'Saving your registration…',
    signupSaved: 'Your season registration is saved.',
    signupSavedKicker: 'REGISTRATION SAVED',
    signupSavedPrefix: 'Your season registration is saved. Revision',
    signupSavedSuffix: 'Come back any time registration is open to update it.',
    signupErrorAccess:
      'Registration is closed right now, or your member access expired. Unlock with the PIN again and retry.',
    signupErrorClosed: 'Registration is closed for this season. Ask leadership when it opens.',
    signupErrorInvalid:
      'Some values could not be saved. Check the power numbers and the two fighting times.',
    signupErrorNetwork: 'The registration could not be saved. Check your connection and try again.',
    signupErrorSession:
      'Your member session is not ready. Refresh the page, unlock with the PIN, and retry.',
    signupErrorGeneric: 'The registration could not be saved. Please try again.',
    signupErrorFightingTimes: 'Pick two different fighting times.',
  },
  ar: {
    kicker: 'موسم 2027 · التسجيل والمراجعة النهائية',
    title: 'سجّل في الموسم ثم ارفع نتيجتك النهائية',
    intro:
      'افتح القفل برمز PIN الخاص بأعضاء VTS، واملأ تسجيل الموسم مرة واحدة، ثم عد لتحديثه في أي وقت ما دام التسجيل مفتوحًا. وعندما تطلب القيادة المراجعة النهائية، ارفع صورة القوة وأكد كل قيمة مقابل تسجيلك.',
    unlockTitle: 'فتح تسجيل الموسم',
    unlockHelp:
      'استخدم رمز PIN الخاص بأعضاء VTS الذي شاركته القيادة. يفتح نموذج التسجيل ورفع النتيجة النهائية.',
    signupForSeason: 'موسم {season}',
    signupKicker: 'موسم 2027 · تسجيل الأعضاء',
    signupTitle: 'املأ تسجيل الموسم',
    signupIntro:
      'أجب مرة واحدة للموسم الجديد: قيم قوتك، والأدوار التي تلعبها، والأوقات التي يمكنك القتال فيها. تبني القيادة الفرق من هذه الإجابات.',
    signupStateNone: 'لا يوجد تسجيل لهذا الموسم بعد. املأ النموذج مرة واحدة ثم احفظ.',
    signupStateSaved: 'تم حفظ تسجيلك (النسخة {revision}). الحفظ مرة أخرى يستبدله.',
    signupNameHelp: 'استخدم الاسم داخل اللعبة نفسه الذي تراه القيادة في قائمة التحالف.',
    signupPowerTitle: 'قيم القوة',
    signupPowerHint: 'انسخ كل قيمة من تفاصيل قوتك كما تظهر في اللعبة تمامًا.',
    signupTroopsTitle: 'القوات والأبطال',
    signupListHint: 'افصل بين القيم المتعددة بفواصل.',
    signupT9TroopTypes: 'أنواع قوات T9',
    signupReadySpeedHeroes: 'أبطال السرعة الجاهزون',
    signupLevel50Heroes: 'أبطال المستوى 50',
    signupRocLevel: 'مستوى ROC',
    signupRolesTitle: 'الأدوار والأوقات والالتزام',
    signupPreferredRole: 'الدور المفضل',
    signupSecondaryRole: 'الدور الثاني (اختياري)',
    signupRoleNone: 'لا أفضلية',
    signupRoleFlexible: 'مرن',
    signupRoleOffensive: 'فريق الهجوم',
    signupRoleRune: 'فريق الرون',
    signupRoleTop: 'الجانب العلوي',
    signupRoleBottom: 'الجانب السفلي',
    signupRoleBackup: 'احتياطي',
    signupAvailability: 'التوفر',
    signupAvailabilityAll: 'كل المعارك',
    signupAvailabilityMost: 'معظم المعارك',
    signupAvailabilityBackup: 'احتياطي فقط',
    signupFightingFirst: 'وقت القتال الأول',
    signupFightingSecond: 'وقت القتال الثاني',
    signupFightingTimesHelp: 'اختر وقتين مختلفين للقتال؛ تستخدمهما القيادة لجدولة فريقك.',
    signupMember: 'مسجّل في VTS 1097',
    signupYes: 'نعم',
    signupNo: 'لا',
    signupContact: 'وسيلة تواصل (اختياري)',
    signupJoinReason: 'لماذا تريد الانضمام (اختياري)',
    signupNotes: 'أي شيء يجب أن تعرفه القيادة (اختياري)',
    signupSave: 'احفظ تسجيلي',
    signupSaving: 'جارٍ حفظ تسجيلك…',
    signupSaved: 'تم حفظ تسجيل الموسم.',
    signupSavedKicker: 'تم حفظ التسجيل',
    signupSavedPrefix: 'تم حفظ تسجيل الموسم. النسخة',
    signupSavedSuffix: 'يمكنك تحديثه في أي وقت ما دام التسجيل مفتوحًا.',
    signupErrorAccess:
      'التسجيل مغلق حاليًا أو انتهت صلاحية عضويتك. افتح القفل بالرمز PIN مرة أخرى ثم أعد المحاولة.',
    signupErrorClosed: 'التسجيل مغلق لهذا الموسم. اسأل القيادة عن موعد فتحه.',
    signupErrorInvalid: 'لم يتم حفظ بعض القيم. تحقق من قيم القوة ووقتي القتال.',
    signupErrorNetwork: 'تعذّر حفظ التسجيل. تحقق من الاتصال وأعد المحاولة.',
    signupErrorSession:
      'جلسة العضوية غير جاهزة. حدّث الصفحة وافتح القفل بالرمز PIN ثم أعد المحاولة.',
    signupErrorGeneric: 'تعذّر حفظ التسجيل. يرجى المحاولة مرة أخرى.',
    signupErrorFightingTimes: 'اختر وقتين مختلفين للقتال.',
  },
  es: {
    kicker: 'TEMPORADA 2027 · INSCRIPCIÓN Y REVISIÓN FINAL',
    title: 'Inscríbete en la temporada y luego sube tu puntuación final',
    intro:
      'Desbloquea con el PIN de miembro VTS, rellena la inscripción de la temporada una vez y vuelve cuando quieras mientras siga abierta para actualizarla. Cuando el liderazgo pida la revisión final, sube una captura de poder y confirma cada valor con tu inscripción.',
    unlockTitle: 'Desbloquear la inscripción de la temporada',
    unlockHelp:
      'Usa el PIN de miembro VTS que compartió el liderazgo. Abre el formulario de inscripción y la subida de la puntuación final.',
    signupForSeason: 'Temporada {season}',
    signupKicker: 'TEMPORADA 2027 · INSCRIPCIÓN DE MIEMBROS',
    signupTitle: 'Rellena tu inscripción de temporada',
    signupIntro:
      'Responde una vez para la nueva temporada: tus valores de poder, los roles que juegas y las horas en que puedes luchar. El liderazgo forma los equipos con estas respuestas.',
    signupStateNone:
      'Todavía no hay inscripción para esta temporada. Rellena el formulario una vez y guarda.',
    signupStateSaved:
      'Tu inscripción está guardada (revisión {revision}). Si vuelves a guardar, se reemplaza.',
    signupNameHelp: 'Usa el nombre exacto en el juego que el liderazgo ve en la lista del gremio.',
    signupPowerTitle: 'Valores de poder',
    signupPowerHint: 'Copia cada valor de tu desglose de poder tal como lo muestra el juego.',
    signupTroopsTitle: 'Tropas y héroes',
    signupListHint: 'Separa varios valores con comas.',
    signupT9TroopTypes: 'Tipos de tropa T9',
    signupReadySpeedHeroes: 'Héroes de velocidad listos',
    signupLevel50Heroes: 'Héroes de nivel 50',
    signupRocLevel: 'Nivel ROC',
    signupRolesTitle: 'Roles, horarios y compromiso',
    signupPreferredRole: 'Rol preferido',
    signupSecondaryRole: 'Segundo rol (opcional)',
    signupRoleNone: 'Sin preferencia',
    signupRoleFlexible: 'Flexible',
    signupRoleOffensive: 'Equipo ofensivo',
    signupRoleRune: 'Equipo de runas',
    signupRoleTop: 'Lado superior',
    signupRoleBottom: 'Lado inferior',
    signupRoleBackup: 'Suplente',
    signupAvailability: 'Disponibilidad',
    signupAvailabilityAll: 'Todas las batallas',
    signupAvailabilityMost: 'Casi todas las batallas',
    signupAvailabilityBackup: 'Solo suplente',
    signupFightingFirst: 'Primera hora de lucha',
    signupFightingSecond: 'Segunda hora de lucha',
    signupFightingTimesHelp:
      'Elige dos horas de lucha distintas; el liderazgo las usa para programar tu equipo.',
    signupMember: 'Inscrito en VTS 1097',
    signupYes: 'Sí',
    signupNo: 'No',
    signupContact: 'Contacto (opcional)',
    signupJoinReason: 'Por qué quieres unirte (opcional)',
    signupNotes: 'Algo que el liderazgo deba saber (opcional)',
    signupSave: 'Guardar mi inscripción',
    signupSaving: 'Guardando tu inscripción…',
    signupSaved: 'Tu inscripción de temporada está guardada.',
    signupSavedKicker: 'INSCRIPCIÓN GUARDADA',
    signupSavedPrefix: 'Tu inscripción de temporada está guardada. Revisión',
    signupSavedSuffix: 'Puedes actualizarla cuando quieras mientras siga abierta.',
    signupErrorAccess:
      'La inscripción está cerrada ahora mismo o tu acceso de miembro caducó. Desbloquea otra vez con el PIN e inténtalo de nuevo.',
    signupErrorClosed:
      'La inscripción está cerrada para esta temporada. Pregunta al liderazgo cuándo abre.',
    signupErrorInvalid:
      'Algunos valores no se pudieron guardar. Revisa los valores de poder y las dos horas de lucha.',
    signupErrorNetwork:
      'No se pudo guardar la inscripción. Comprueba la conexión e inténtalo de nuevo.',
    signupErrorSession:
      'Tu sesión de miembro no está lista. Actualiza la página, desbloquea con el PIN e inténtalo de nuevo.',
    signupErrorGeneric: 'No se pudo guardar la inscripción. Inténtalo de nuevo.',
    signupErrorFightingTimes: 'Elige dos horas de lucha distintas.',
  },
  pt: {
    kicker: 'TEMPORADA 2027 · INSCRIÇÃO E REVISÃO FINAL',
    title: 'Inscreva-se na temporada e depois envie sua pontuação final',
    intro:
      'Desbloqueie com o PIN de membro VTS, preencha a inscrição da temporada uma vez e volte quando quiser, enquanto estiver aberta, para atualizá-la. Quando a liderança pedir a revisão final, envie uma captura de poder e confirme cada valor com sua inscrição.',
    unlockTitle: 'Desbloquear a inscrição da temporada',
    unlockHelp:
      'Use o PIN de membro VTS que a liderança compartilhou. Ele abre o formulário de inscrição e o envio da pontuação final.',
    signupForSeason: 'Temporada {season}',
    signupKicker: 'TEMPORADA 2027 · INSCRIÇÃO DE MEMBROS',
    signupTitle: 'Preencha sua inscrição da temporada',
    signupIntro:
      'Responda uma vez para a nova temporada: seus valores de poder, os papéis que você joga e os horários em que pode lutar. A liderança monta os times com essas respostas.',
    signupStateNone:
      'Ainda não há inscrição para esta temporada. Preencha o formulário uma vez e salve.',
    signupStateSaved:
      'Sua inscrição está salva (revisão {revision}). Salvar novamente a substitui.',
    signupNameHelp: 'Use o nome exato no jogo que a liderança vê na lista da guilda.',
    signupPowerTitle: 'Valores de poder',
    signupPowerHint: 'Copie cada valor do seu detalhamento de poder exatamente como o jogo mostra.',
    signupTroopsTitle: 'Tropas e heróis',
    signupListHint: 'Separe vários valores com vírgulas.',
    signupT9TroopTypes: 'Tipos de tropa T9',
    signupReadySpeedHeroes: 'Heróis de velocidade prontos',
    signupLevel50Heroes: 'Heróis de nível 50',
    signupRocLevel: 'Nível ROC',
    signupRolesTitle: 'Papéis, horários e compromisso',
    signupPreferredRole: 'Papel preferido',
    signupSecondaryRole: 'Segundo papel (opcional)',
    signupRoleNone: 'Sem preferência',
    signupRoleFlexible: 'Flexível',
    signupRoleOffensive: 'Time ofensivo',
    signupRoleRune: 'Time de runas',
    signupRoleTop: 'Lado superior',
    signupRoleBottom: 'Lado inferior',
    signupRoleBackup: 'Reserva',
    signupAvailability: 'Disponibilidade',
    signupAvailabilityAll: 'Todas as batalhas',
    signupAvailabilityMost: 'Quase todas as batalhas',
    signupAvailabilityBackup: 'Apenas reserva',
    signupFightingFirst: 'Primeiro horário de luta',
    signupFightingSecond: 'Segundo horário de luta',
    signupFightingTimesHelp:
      'Escolha dois horários de luta diferentes; a liderança os usa para agendar seu time.',
    signupMember: 'Inscrito no VTS 1097',
    signupYes: 'Sim',
    signupNo: 'Não',
    signupContact: 'Contato (opcional)',
    signupJoinReason: 'Por que você quer entrar (opcional)',
    signupNotes: 'Algo que a liderança deve saber (opcional)',
    signupSave: 'Salvar minha inscrição',
    signupSaving: 'Salvando sua inscrição…',
    signupSaved: 'Sua inscrição da temporada está salva.',
    signupSavedKicker: 'INSCRIÇÃO SALVA',
    signupSavedPrefix: 'Sua inscrição da temporada está salva. Revisão',
    signupSavedSuffix: 'Você pode atualizá-la quando quiser enquanto estiver aberta.',
    signupErrorAccess:
      'A inscrição está fechada agora ou seu acesso de membro expirou. Desbloqueie novamente com o PIN e tente de novo.',
    signupErrorClosed:
      'A inscrição está fechada para esta temporada. Pergunte à liderança quando abre.',
    signupErrorInvalid:
      'Alguns valores não puderam ser salvos. Confira os valores de poder e os dois horários de luta.',
    signupErrorNetwork:
      'Não foi possível salvar a inscrição. Verifique a conexão e tente novamente.',
    signupErrorSession:
      'Sua sessão de membro não está pronta. Atualize a página, desbloqueie com o PIN e tente de novo.',
    signupErrorGeneric: 'Não foi possível salvar a inscrição. Tente novamente.',
    signupErrorFightingTimes: 'Escolha dois horários de luta diferentes.',
  },
  fr: {
    kicker: 'SAISON 2027 · INSCRIPTION ET CONTRÔLE FINAL',
    title: 'Inscrivez-vous pour la saison, puis envoyez votre score final',
    intro:
      'Débloquez avec le PIN membre VTS, remplissez l’inscription de la saison une fois, puis revenez quand vous voulez tant qu’elle est ouverte pour la mettre à jour. Quand la direction lance le contrôle final, envoyez une capture de puissance et confirmez chaque valeur avec votre inscription.',
    unlockTitle: 'Débloquer l’inscription de la saison',
    unlockHelp:
      'Utilisez le PIN membre VTS partagé par la direction. Il ouvre le formulaire d’inscription et l’envoi du score final.',
    signupForSeason: 'Saison {season}',
    signupKicker: 'SAISON 2027 · INSCRIPTION DES MEMBRES',
    signupTitle: 'Remplissez votre inscription de saison',
    signupIntro:
      'Répondez une fois pour la nouvelle saison : vos valeurs de puissance, vos rôles et les heures où vous pouvez combattre. La direction compose les équipes à partir de ces réponses.',
    signupStateNone:
      'Aucune inscription pour cette saison. Remplissez le formulaire une fois puis enregistrez.',
    signupStateSaved:
      'Votre inscription est enregistrée (révision {revision}). Un nouvel enregistrement la remplace.',
    signupNameHelp: 'Utilisez le nom en jeu exact que la direction voit dans la liste de guilde.',
    signupPowerTitle: 'Valeurs de puissance',
    signupPowerHint:
      'Recopiez chaque valeur de votre détail de puissance exactement comme le jeu l’affiche.',
    signupTroopsTitle: 'Troupes et héros',
    signupListHint: 'Séparez plusieurs valeurs par des virgules.',
    signupT9TroopTypes: 'Types de troupes T9',
    signupReadySpeedHeroes: 'Héros de vitesse prêts',
    signupLevel50Heroes: 'Héros de niveau 50',
    signupRocLevel: 'Niveau ROC',
    signupRolesTitle: 'Rôles, horaires et engagement',
    signupPreferredRole: 'Rôle préféré',
    signupSecondaryRole: 'Second rôle (facultatif)',
    signupRoleNone: 'Aucune préférence',
    signupRoleFlexible: 'Polyvalent',
    signupRoleOffensive: 'Équipe offensive',
    signupRoleRune: 'Équipe rune',
    signupRoleTop: 'Côté haut',
    signupRoleBottom: 'Côté bas',
    signupRoleBackup: 'Remplaçant',
    signupAvailability: 'Disponibilité',
    signupAvailabilityAll: 'Toutes les batailles',
    signupAvailabilityMost: 'La plupart des batailles',
    signupAvailabilityBackup: 'Remplaçant uniquement',
    signupFightingFirst: 'Première heure de combat',
    signupFightingSecond: 'Deuxième heure de combat',
    signupFightingTimesHelp:
      'Choisissez deux heures de combat différentes ; la direction s’en sert pour planifier votre équipe.',
    signupMember: 'Inscrit à VTS 1097',
    signupYes: 'Oui',
    signupNo: 'Non',
    signupContact: 'Contact (facultatif)',
    signupJoinReason: 'Pourquoi vous voulez rejoindre (facultatif)',
    signupNotes: 'Ce que la direction doit savoir (facultatif)',
    signupSave: 'Enregistrer mon inscription',
    signupSaving: 'Enregistrement de votre inscription…',
    signupSaved: 'Votre inscription de saison est enregistrée.',
    signupSavedKicker: 'INSCRIPTION ENREGISTRÉE',
    signupSavedPrefix: 'Votre inscription de saison est enregistrée. Révision',
    signupSavedSuffix: 'Vous pouvez la mettre à jour tant que l’inscription est ouverte.',
    signupErrorAccess:
      'L’inscription est fermée pour le moment ou votre accès membre a expiré. Débloquez à nouveau avec le PIN puis réessayez.',
    signupErrorClosed:
      'L’inscription est fermée pour cette saison. Demandez à la direction quand elle ouvre.',
    signupErrorInvalid:
      'Certaines valeurs n’ont pas pu être enregistrées. Vérifiez les valeurs de puissance et les deux heures de combat.',
    signupErrorNetwork:
      'L’inscription n’a pas pu être enregistrée. Vérifiez la connexion puis réessayez.',
    signupErrorSession:
      'Votre session membre n’est pas prête. Rechargez la page, débloquez avec le PIN puis réessayez.',
    signupErrorGeneric: 'L’inscription n’a pas pu être enregistrée. Veuillez réessayer.',
    signupErrorFightingTimes: 'Choisissez deux heures de combat différentes.',
  },
  de: {
    kicker: 'SAISON 2027 · ANMELDUNG UND ENDPRÜFUNG',
    title: 'Melde dich für die Saison an und lade danach deinen Endstand hoch',
    intro:
      'Schalte mit der VTS-Mitglieder-PIN frei, fülle die Saison-Anmeldung einmal aus und aktualisiere sie jederzeit, solange die Anmeldung offen ist. Wenn die Leitung zur Endprüfung aufruft, lade einen Stärke-Screenshot hoch und bestätige jeden Wert mit deiner Anmeldung.',
    unlockTitle: 'Saison-Anmeldung freischalten',
    unlockHelp:
      'Nutze die VTS-Mitglieder-PIN, die die Leitung geteilt hat. Sie öffnet das Anmeldeformular und den Upload des Endstands.',
    signupForSeason: 'Saison {season}',
    signupKicker: 'SAISON 2027 · MITGLIEDER-ANMELDUNG',
    signupTitle: 'Fülle deine Saison-Anmeldung',
    signupIntro:
      'Antworte einmal für die neue Saison: deine Stärkewerte, deine Rollen und die Zeiten, zu denen du kämpfen kannst. Die Leitung baut die Teams aus diesen Antworten.',
    signupStateNone:
      'Für diese Saison liegt noch keine Anmeldung vor. Fülle das Formular einmal aus und speichere.',
    signupStateSaved:
      'Deine Anmeldung ist gespeichert (Revision {revision}). Erneutes Speichern ersetzt sie.',
    signupNameHelp: 'Nutze den exakten Ingame-Namen, den die Leitung in der Gildenliste sieht.',
    signupPowerTitle: 'Stärkewerte',
    signupPowerHint:
      'Übernimm jeden Wert aus deiner Stärkeübersicht genau so, wie das Spiel ihn zeigt.',
    signupTroopsTitle: 'Truppen und Helden',
    signupListHint: 'Trenne mehrere Werte mit Kommas.',
    signupT9TroopTypes: 'T9-Truppentypen',
    signupReadySpeedHeroes: 'Einsatzbereite Speed-Helden',
    signupLevel50Heroes: 'Helden auf Level 50',
    signupRocLevel: 'ROC-Level',
    signupRolesTitle: 'Rollen, Zeiten und Einsatz',
    signupPreferredRole: 'Bevorzugte Rolle',
    signupSecondaryRole: 'Zweite Rolle (optional)',
    signupRoleNone: 'Keine Präferenz',
    signupRoleFlexible: 'Flexibel',
    signupRoleOffensive: 'Offensivteam',
    signupRoleRune: 'Runenteam',
    signupRoleTop: 'Obere Seite',
    signupRoleBottom: 'Untere Seite',
    signupRoleBackup: 'Ersatz',
    signupAvailability: 'Verfügbarkeit',
    signupAvailabilityAll: 'Jeder Kampf',
    signupAvailabilityMost: 'Die meisten Kämpfe',
    signupAvailabilityBackup: 'Nur Ersatz',
    signupFightingFirst: 'Erste Kampfzeit',
    signupFightingSecond: 'Zweite Kampfzeit',
    signupFightingTimesHelp:
      'Wähle zwei verschiedene Kampfzeiten; die Leitung plant damit dein Team.',
    signupMember: 'Für VTS 1097 angemeldet',
    signupYes: 'Ja',
    signupNo: 'Nein',
    signupContact: 'Kontakt (optional)',
    signupJoinReason: 'Warum du mitmachen willst (optional)',
    signupNotes: 'Was die Leitung wissen sollte (optional)',
    signupSave: 'Meine Anmeldung speichern',
    signupSaving: 'Anmeldung wird gespeichert…',
    signupSaved: 'Deine Saison-Anmeldung ist gespeichert.',
    signupSavedKicker: 'ANMELDUNG GESPEICHERT',
    signupSavedPrefix: 'Deine Saison-Anmeldung ist gespeichert. Revision',
    signupSavedSuffix: 'Du kannst sie jederzeit aktualisieren, solange die Anmeldung offen ist.',
    signupErrorAccess:
      'Die Anmeldung ist gerade geschlossen oder dein Mitgliederzugang ist abgelaufen. Schalte erneut mit der PIN frei und versuche es noch einmal.',
    signupErrorClosed:
      'Die Anmeldung ist für diese Saison geschlossen. Frag die Leitung, wann sie öffnet.',
    signupErrorInvalid:
      'Einige Werte konnten nicht gespeichert werden. Prüfe die Stärkewerte und die beiden Kampfzeiten.',
    signupErrorNetwork:
      'Die Anmeldung konnte nicht gespeichert werden. Prüfe die Verbindung und versuche es erneut.',
    signupErrorSession:
      'Deine Mitgliedersitzung ist nicht bereit. Lade die Seite neu, schalte mit der PIN frei und versuche es erneut.',
    signupErrorGeneric: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuche es erneut.',
    signupErrorFightingTimes: 'Wähle zwei verschiedene Kampfzeiten.',
  },
});

const COPY = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE_COPY).map(([language, copy]) => [
      language,
      Object.freeze({ ...copy, ...FULL_BREAKDOWN_COPY[language], ...SIGNUP_COPY[language] }),
    ])
  )
);

/** Every key this page can render, for the page-key audit in the unit tests. */
export const VTS_SCORE_COPY_KEYS = Object.freeze(Object.keys(COPY.en));

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
