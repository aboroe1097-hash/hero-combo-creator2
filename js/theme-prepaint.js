(function applyStoredThemeBeforePaint() {
  try {
    var themeColors = { light: '#f8fafc', dark: '#0f172a' };
    var manifests = { light: 'site-light.webmanifest', dark: 'site.webmanifest' };
    var stored = localStorage.getItem('vts_theme') || localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    window.VTS_INITIAL_THEME = theme;
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    var meta =
      document.getElementById('themeColorMeta') || document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColors[theme]);
    var link = document.getElementById('manifestLink') || document.querySelector('link[rel="manifest"]');
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
    buildId = new URL(currentScript && currentScript.src, window.location.href).searchParams.get('v') || 'dev';
  } catch (e) {
    // The build id only scopes the reload guard; recovery still works without it.
  }

  var bootComplete = false;
  var inMemoryReloadGuard = false;
  var prompt = null;
  var key = 'vts_asset_recovery:' + window.location.pathname + ':' + buildId;

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
    var message = document.createElement('span');
    message.textContent = 'An updated site file could not load. Refresh when you are ready.';
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Refresh';
    button.style.cssText =
      'display:block;margin-top:.75rem;min-height:44px;padding:.55rem 1rem;border:0;border-radius:.55rem;background:#f59e0b;color:#111827;font:800 .9rem system-ui,sans-serif;cursor:pointer';
    button.addEventListener('click', function () {
      window.location.reload();
    });
    prompt.append(message, button);
    document.body.appendChild(prompt);
  }

  function reportFailure(reason, url) {
    if (url && !isHashedAssetUrl(url)) return false;
    if (!url && !isDynamicImportFailure(reason)) return false;
    if (!navigator.onLine) return false;
    if (!bootComplete && !hasReloaded()) {
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

  window.addEventListener('load', function () {
    window.setTimeout(function () {
      bootComplete = true;
    }, 1000);
  });
})();
