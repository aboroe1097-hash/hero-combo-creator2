// Toggle this before pushing:
// true  = show the maintenance page immediately
// false = run the normal app
window.VTS_MAINTENANCE_MODE = false;

window.VTS_MAINTENANCE_CONFIG = {
  kicker: 'VTS 1097 TOOLKIT',
  title: 'Maintenance Mode',
  message: 'Be back soon.',
  status: '',
};

(function applyMaintenanceMode() {
  const adminPage = /(?:^|\/)admin(?:\.html)?\/?$/i.test(window.location.pathname);
  try {
    const params = new URLSearchParams(window.location.search);
    const bypass =
      adminPage ||
      params.has('maintenanceBypass') ||
      localStorage.getItem('vts_maintenance_bypass') === '1' ||
      sessionStorage.getItem('vts_maintenance_bypass') === '1';
    window.VTS_MAINTENANCE_ACTIVE = Boolean(window.VTS_MAINTENANCE_MODE && !bypass);
  } catch {
    window.VTS_MAINTENANCE_ACTIVE = Boolean(window.VTS_MAINTENANCE_MODE && !adminPage);
  }

  if (window.VTS_MAINTENANCE_ACTIVE) {
    document.documentElement.classList.add('maintenance-mode');

    const scriptUrl = document.currentScript?.src || window.location.href;
    const maintenanceUrl = new URL('../maintenance.html', scriptUrl);
    if (window.location.href !== maintenanceUrl.href) {
      window.location.replace(maintenanceUrl.href);
    }
  }
})();
