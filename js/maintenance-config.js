// Toggle this before pushing:
// true  = show the maintenance page immediately
// false = run the normal app
window.VTS_MAINTENANCE_MODE = false;

window.VTS_MAINTENANCE_CONFIG = {
  kicker: 'VTS 1097 TOOLKIT',
  title: 'Down for Update',
  message: 'Hero Combo Creator is being upgraded. We are tuning the layout, skins, datasets, and performance.',
  status: 'Maintenance in progress',
};

try {
  const params = new URLSearchParams(window.location.search);
  if (window.VTS_MAINTENANCE_MODE || params.has('maintenancePreview')) {
    document.documentElement.classList.add('maintenance-mode');
  }
} catch {
  if (window.VTS_MAINTENANCE_MODE) {
    document.documentElement.classList.add('maintenance-mode');
  }
}
