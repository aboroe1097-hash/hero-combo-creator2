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
