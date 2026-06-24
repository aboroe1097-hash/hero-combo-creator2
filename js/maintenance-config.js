// Toggle this before pushing:
// true  = show the maintenance page immediately
// false = run the normal app
window.VTS_MAINTENANCE_MODE = true;

window.VTS_MAINTENANCE_CONFIG = {
  kicker: 'VTS 1097 TOOLKIT',
  title: 'Maintenance Mode',
  message: 'We are pausing the tools while Firebase sync and OCR stability are checked. The site will reopen after the morning debug pass.',
  status: 'Maintenance in progress',
};

(function applyMaintenanceMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const bypass =
      params.has('maintenanceBypass') ||
      localStorage.getItem('vts_maintenance_bypass') === '1' ||
      sessionStorage.getItem('vts_maintenance_bypass') === '1';
    window.VTS_MAINTENANCE_ACTIVE = Boolean(window.VTS_MAINTENANCE_MODE && !bypass);
  } catch {
    window.VTS_MAINTENANCE_ACTIVE = Boolean(window.VTS_MAINTENANCE_MODE);
  }

  if (window.VTS_MAINTENANCE_ACTIVE) {
    document.documentElement.classList.add('maintenance-mode');
  }
})();
