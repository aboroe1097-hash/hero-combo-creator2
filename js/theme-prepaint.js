function isEnglishOnlyBattleSimulator() {
  var root = document.documentElement;
  if (!root) return false;
  var className = typeof root.className === 'string' ? root.className : '';
  if (!className && typeof root.getAttribute === 'function') {
    className = root.getAttribute('class') || '';
  }
  return /(?:^|\s)battle-simulator-root(?:\s|$)/.test(className);
}

(function installPwaRuntimeCopy(global) {
  'use strict';

  var LOCALES = Object.freeze(['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr']);
  var IDS = Object.freeze([
    'updateAvailable',
    'dismiss',
    'installTitle',
    'installSubtitle',
    'installAction',
    'installing',
    'iosTitle',
    'iosTap',
    'iosShare',
    'iosAddToHome',
    'assetRecoveryMessage',
    'refresh',
  ]);
  var COPY = Object.freeze({
    en: Object.freeze({
      updateAvailable: 'New version available — refresh to update.',
      dismiss: 'Dismiss',
      installTitle: 'Install VTS Combos',
      installSubtitle: 'One-tap access · Works offline',
      installAction: 'Install',
      installing: 'Installing…',
      iosTitle: 'Add to Home Screen',
      iosTap: 'Tap',
      iosShare: 'Share',
      iosAddToHome: 'Add to Home Screen',
      assetRecoveryMessage: 'An updated site file could not load. Refresh when you are ready.',
      refresh: 'Refresh',
    }),
    es: Object.freeze({
      updateAvailable: 'Hay una nueva versión; actualiza la página para aplicarla.',
      dismiss: 'Cerrar',
      installTitle: 'Instalar VTS Combos',
      installSubtitle: 'Acceso con un toque · Funciona sin conexión',
      installAction: 'Instalar',
      installing: 'Instalando…',
      iosTitle: 'Añadir a la pantalla de inicio',
      iosTap: 'Toca',
      iosShare: 'Compartir',
      iosAddToHome: 'Añadir a la pantalla de inicio',
      assetRecoveryMessage:
        'No se pudo cargar un archivo actualizado del sitio. Actualiza cuando quieras.',
      refresh: 'Actualizar',
    }),
    pt: Object.freeze({
      updateAvailable: 'Nova versão disponível — atualize a página para aplicá-la.',
      dismiss: 'Fechar',
      installTitle: 'Instalar VTS Combos',
      installSubtitle: 'Acesso com um toque · Funciona offline',
      installAction: 'Instalar',
      installing: 'Instalando…',
      iosTitle: 'Adicionar à Tela de Início',
      iosTap: 'Toque em',
      iosShare: 'Compartilhar',
      iosAddToHome: 'Adicionar à Tela de Início',
      assetRecoveryMessage:
        'Um arquivo atualizado do site não pôde ser carregado. Atualize quando quiser.',
      refresh: 'Atualizar',
    }),
    de: Object.freeze({
      updateAvailable: 'Neue Version verfügbar – lade die Seite neu, um sie zu nutzen.',
      dismiss: 'Schließen',
      installTitle: 'VTS Combos installieren',
      installSubtitle: 'Direktzugriff · Funktioniert offline',
      installAction: 'Installieren',
      installing: 'Wird installiert…',
      iosTitle: 'Zum Home-Bildschirm hinzufügen',
      iosTap: 'Tippe auf',
      iosShare: 'Teilen',
      iosAddToHome: 'Zum Home-Bildschirm',
      assetRecoveryMessage:
        'Eine aktualisierte Website-Datei konnte nicht geladen werden. Lade die Seite neu, wenn du bereit bist.',
      refresh: 'Neu laden',
    }),
    fr: Object.freeze({
      updateAvailable: 'Une nouvelle version est disponible — actualisez pour l’appliquer.',
      dismiss: 'Fermer',
      installTitle: 'Installer VTS Combos',
      installSubtitle: 'Accès en un geste · Fonctionne hors connexion',
      installAction: 'Installer',
      installing: 'Installation…',
      iosTitle: 'Ajouter à l’écran d’accueil',
      iosTap: 'Touchez',
      iosShare: 'Partager',
      iosAddToHome: 'Ajouter à l’écran d’accueil',
      assetRecoveryMessage:
        'Un fichier mis à jour du site n’a pas pu être chargé. Actualisez quand vous êtes prêt.',
      refresh: 'Actualiser',
    }),
    tr: Object.freeze({
      updateAvailable: 'Yeni sürüm hazır — uygulamak için sayfayı yenile.',
      dismiss: 'Kapat',
      installTitle: "VTS Combos'u yükle",
      installSubtitle: 'Tek dokunuşla erişim · Çevrimdışı çalışır',
      installAction: 'Yükle',
      installing: 'Yükleniyor…',
      iosTitle: 'Ana Ekrana Ekle',
      iosTap: 'Dokun',
      iosShare: 'Paylaş',
      iosAddToHome: 'Ana Ekrana Ekle',
      assetRecoveryMessage:
        'Güncellenen bir site dosyası yüklenemedi. Hazır olduğunda sayfayı yenile.',
      refresh: 'Yenile',
    }),
    ru: Object.freeze({
      updateAvailable: 'Доступна новая версия — обновите страницу, чтобы применить её.',
      dismiss: 'Закрыть',
      installTitle: 'Установить VTS Combos',
      installSubtitle: 'Быстрый запуск · Работает без интернета',
      installAction: 'Установить',
      installing: 'Установка…',
      iosTitle: 'Добавить на главный экран',
      iosTap: 'Нажмите',
      iosShare: 'Поделиться',
      iosAddToHome: 'На экран «Домой»',
      assetRecoveryMessage:
        'Не удалось загрузить обновлённый файл сайта. Обновите страницу, когда будете готовы.',
      refresh: 'Обновить',
    }),
    id: Object.freeze({
      updateAvailable: 'Versi baru tersedia — muat ulang untuk memperbarui.',
      dismiss: 'Tutup',
      installTitle: 'Pasang VTS Combos',
      installSubtitle: 'Akses sekali ketuk · Bisa digunakan offline',
      installAction: 'Pasang',
      installing: 'Memasang…',
      iosTitle: 'Tambahkan ke Layar Utama',
      iosTap: 'Ketuk',
      iosShare: 'Bagikan',
      iosAddToHome: 'Tambahkan ke Layar Utama',
      assetRecoveryMessage: 'File situs terbaru gagal dimuat. Muat ulang saat kamu siap.',
      refresh: 'Muat ulang',
    }),
    zh: Object.freeze({
      updateAvailable: '新版本已上线，请刷新页面完成更新。',
      dismiss: '关闭',
      installTitle: '安装 VTS Combos',
      installSubtitle: '一键打开 · 离线也能用',
      installAction: '安装',
      installing: '正在安装…',
      iosTitle: '添加到主屏幕',
      iosTap: '轻点',
      iosShare: '共享',
      iosAddToHome: '添加到主屏幕',
      assetRecoveryMessage: '新版网站文件加载失败，请在方便时刷新页面。',
      refresh: '刷新',
    }),
    ar: Object.freeze({
      updateAvailable: 'يتوفر إصدار جديد — حدّث الصفحة لتطبيقه.',
      dismiss: 'إغلاق',
      installTitle: 'تثبيت VTS Combos',
      installSubtitle: 'وصول بلمسة واحدة · يعمل دون اتصال',
      installAction: 'تثبيت',
      installing: 'جارٍ التثبيت…',
      iosTitle: 'إضافة إلى الشاشة الرئيسية',
      iosTap: 'اضغط',
      iosShare: 'مشاركة',
      iosAddToHome: 'إضافة إلى الشاشة الرئيسية',
      assetRecoveryMessage: 'تعذّر تحميل ملف محدّث للموقع. حدّث الصفحة عندما تكون جاهزًا.',
      refresh: 'تحديث الصفحة',
    }),
    kr: Object.freeze({
      updateAvailable: '새 버전을 사용할 수 있습니다. 새로고침하여 업데이트하세요.',
      dismiss: '닫기',
      installTitle: 'VTS Combos 설치',
      installSubtitle: '한 번에 실행 · 오프라인에서도 사용 가능',
      installAction: '설치',
      installing: '설치 중…',
      iosTitle: '홈 화면에 추가',
      iosTap: '다음 순서로 누르세요:',
      iosShare: '공유',
      iosAddToHome: '홈 화면에 추가',
      assetRecoveryMessage:
        '업데이트된 사이트 파일을 불러오지 못했습니다. 준비가 되면 새로고침하세요.',
      refresh: '새로고침',
    }),
  });

  function normalizeLocale(value) {
    var primary = String(value || 'en')
      .trim()
      .toLowerCase()
      .split('-')[0];
    if (primary === 'ko') return 'kr';
    return LOCALES.indexOf(primary) !== -1 ? primary : 'en';
  }

  function documentLocale(value) {
    var locale = normalizeLocale(value);
    var localeMap = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      de: 'de-DE',
      fr: 'fr-FR',
      tr: 'tr-TR',
      ru: 'ru-RU',
      id: 'id-ID',
      zh: 'zh-CN',
      ar: 'ar',
      kr: 'ko-KR',
    };
    return localeMap[locale];
  }

  function detectLocale() {
    var stored = '';
    try {
      stored = global.localStorage && global.localStorage.getItem('vts_hero_lang');
    } catch (e) {
      // Browser preferences remain available when storage is restricted.
    }
    var detected = normalizeLocale(
      stored || (global.navigator && (global.navigator.language || global.navigator.userLanguage))
    );
    if (stored && String(stored).trim().toLowerCase() !== detected) {
      try {
        global.localStorage.setItem('vts_hero_lang', detected);
      } catch (e) {
        // Normalization still applies to this document when storage is read-only.
      }
    }
    return detected;
  }

  function text(id, locale) {
    var normalized = normalizeLocale(locale || detectLocale());
    return COPY[normalized][id] || COPY.en[id] || id;
  }

  function audit() {
    var missing = [];
    var unexpected = [];
    LOCALES.forEach(function (locale) {
      var pack = COPY[locale] || {};
      IDS.forEach(function (id) {
        if (typeof pack[id] !== 'string' || !pack[id].trim()) missing.push(locale + ':' + id);
      });
      Object.keys(pack).forEach(function (id) {
        if (IDS.indexOf(id) === -1) unexpected.push(locale + ':' + id);
      });
    });
    return Object.freeze({
      ok: missing.length === 0 && unexpected.length === 0,
      missing: Object.freeze(missing),
      unexpected: Object.freeze(unexpected),
    });
  }

  global.VTS_PWA_I18N = Object.freeze({
    locales: LOCALES,
    ids: IDS,
    normalizeLocale: normalizeLocale,
    documentLocale: documentLocale,
    detectLocale: detectLocale,
    text: text,
    audit: audit,
  });
})(window);

(function applyStoredLanguageBeforePaint() {
  try {
    if (isEnglishOnlyBattleSimulator()) {
      window.VTS_INITIAL_LANGUAGE = 'en';
      document.documentElement.setAttribute('lang', 'en');
      document.documentElement.setAttribute('dir', 'ltr');
      return;
    }
    var runtime = window.VTS_PWA_I18N;
    var language = runtime.detectLocale();
    window.VTS_INITIAL_LANGUAGE = language;
    document.documentElement.setAttribute('lang', runtime.documentLocale(language));
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  } catch (e) {
    // English LTR from the document remains the safe fallback.
  }
})();

(function applyStoredThemeBeforePaint() {
  try {
    var themeColors = { light: '#f8fafc', dark: '#0f172a' };
    var manifests = { light: 'site-light.webmanifest', dark: 'site.webmanifest' };
    var stored = localStorage.getItem('vts_theme') || localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    window.VTS_INITIAL_THEME = theme;
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    var meta =
      document.getElementById('themeColorMeta') ||
      document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColors[theme]);
    var link =
      document.getElementById('manifestLink') || document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute('href', manifests[theme]);
  } catch (e) {
    // Ignore sandboxed localStorage or restricted DOM access.
  }
})();

(function prepareInitialTabBeforePaint() {
  try {
    var tab = window.location.hash.slice(1).split('?')[0];
    var deferredTabs = [
      'manual',
      'arcade',
      'edenMap',
      'materials',
      'research',
      'heroes',
      'strife',
      'loyalty',
      'youtube',
    ];
    if (deferredTabs.indexOf(tab) !== -1) {
      document.documentElement.setAttribute('data-initial-tab-pending', tab);
    }
  } catch (e) {
    // Invalid or restricted locations fall back to the default Generator tab.
  }
})();

(function installHashedAssetRecovery() {
  var currentScript = document.currentScript;
  var buildId = 'dev';
  try {
    buildId =
      new URL(currentScript && currentScript.src, window.location.href).searchParams.get('v') ||
      'dev';
  } catch (e) {
    // The build id only scopes the reload guard; recovery still works without it.
  }

  var bootComplete = false;
  var inMemoryReloadGuard = false;
  var prompt = null;
  var promptMessage = null;
  var promptButton = null;
  var key = 'vts_asset_recovery:' + window.location.pathname + ':' + buildId;

  function recoveryText(id, locale) {
    var runtime = window.VTS_PWA_I18N;
    return runtime
      ? runtime.text(id, isEnglishOnlyBattleSimulator() ? 'en' : locale)
      : id === 'refresh'
        ? 'Refresh'
        : 'Asset load error.';
  }

  function refreshPromptCopy(locale) {
    if (promptMessage) promptMessage.textContent = recoveryText('assetRecoveryMessage', locale);
    if (promptButton) promptButton.textContent = recoveryText('refresh', locale);
  }

  function isHashedAssetUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin) return false;
      return /\/assets\/[a-z0-9._-]+-[a-z0-9_-]{6,}\.(?:css|js)(?:$|[?#])/i.test(url.href);
    } catch (e) {
      return false;
    }
  }

  function isDynamicImportFailure(reason) {
    var message = String((reason && (reason.message || reason.reason)) || reason || '');
    return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload/i.test(
      message
    );
  }

  function addCacheBuster() {
    var url = new URL(window.location.href);
    url.searchParams.set('asset-reload', buildId + '-' + Date.now());
    window.location.replace(url.href);
  }

  function hasReloaded() {
    try {
      return sessionStorage.getItem(key) === '1';
    } catch (e) {
      return inMemoryReloadGuard;
    }
  }

  function rememberReload() {
    inMemoryReloadGuard = true;
    try {
      sessionStorage.setItem(key, '1');
    } catch (e) {
      // The in-memory guard still prevents a loop while this document is alive.
    }
  }

  function showRefreshPrompt() {
    if (prompt || !document.body) return;
    prompt = document.createElement('div');
    prompt.setAttribute('role', 'alert');
    prompt.setAttribute('aria-live', 'assertive');
    prompt.style.cssText =
      'position:fixed;inset:auto 1rem 1rem auto;z-index:2147483647;max-width:min(28rem,calc(100vw - 2rem));padding:1rem;border:1px solid #f59e0b;border-radius:.75rem;background:#111827;color:#f9fafb;box-shadow:0 1rem 3rem rgba(0,0,0,.45);font:600 .9rem/1.4 system-ui,sans-serif';
    promptMessage = document.createElement('span');
    promptButton = document.createElement('button');
    promptButton.type = 'button';
    promptButton.style.cssText =
      'display:block;margin-top:.75rem;min-height:44px;padding:.55rem 1rem;border:0;border-radius:.55rem;background:#f59e0b;color:#111827;font:800 .9rem system-ui,sans-serif;cursor:pointer';
    promptButton.addEventListener('click', function () {
      window.location.reload();
    });
    refreshPromptCopy();
    prompt.append(promptMessage, promptButton);
    document.body.appendChild(prompt);
  }

  function reportFailure(reason, url, options) {
    options = options || {};
    if (url && !isHashedAssetUrl(url)) return false;
    if (!url && !isDynamicImportFailure(reason)) return false;
    if (!navigator.onLine) return false;
    if ((!bootComplete || options.autoReload === true) && !hasReloaded()) {
      rememberReload();
      console.warn('[assets] reloading once after a startup asset failure:', reason || url);
      addCacheBuster();
      return true;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showRefreshPrompt, { once: true });
    } else {
      showRefreshPrompt();
    }
    return false;
  }

  window.VTS_ASSET_RECOVERY = {
    reportFailure: reportFailure,
    markBootComplete: function () {
      bootComplete = true;
    },
    isHashedAssetUrl: isHashedAssetUrl,
  };

  window.addEventListener(
    'error',
    function (event) {
      var target = event.target;
      if (!target || (target.tagName !== 'SCRIPT' && target.tagName !== 'LINK')) return;
      reportFailure('resource load error', target.src || target.href || '');
    },
    true
  );

  window.addEventListener('vts:language-change', function (event) {
    refreshPromptCopy(event && event.detail && event.detail.lang);
  });

  window.addEventListener('load', function () {
    window.setTimeout(function () {
      bootComplete = true;
    }, 1000);
  });
})();
