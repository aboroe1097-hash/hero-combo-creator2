import { undoLastAction } from './state.js';

let undoToastTimer = 0;

export function initUndoToasts() {
  if (document.documentElement.dataset.undoToastsWired === '1') return;
  document.documentElement.dataset.undoToastsWired = '1';

  window.addEventListener('vts:undo-available', (event) => {
    const detail = event.detail || {};
    const container = document.getElementById('toastContainer');
    if (!container) return;

    container.querySelectorAll('.toast.undo-toast').forEach((el) => el.remove());
    const toast = document.createElement('div');
    toast.className = 'toast info undo-toast';
    toast.innerHTML = `<span>${detail.message || `${detail.label || 'Change'} removed.`}</span><button type="button">Undo</button>`;
    const button = toast.querySelector('button');
    button?.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const undone = await undoLastAction();
        if (undone && typeof window.showToast === 'function') window.showToast('Undone.', 'success', 1800);
      } catch (err) {
        console.warn('Undo failed:', err);
        if (typeof window.showToast === 'function') window.showToast('Undo failed.', 'error', 2500);
      } finally {
        toast.remove();
      }
    });
    container.appendChild(toast);
    clearTimeout(undoToastTimer);
    undoToastTimer = window.setTimeout(() => {
      toast.style.animation = 'toast-in 0.3s ease reverse both';
      window.setTimeout(() => toast.remove(), 300);
    }, 8000);
  });
}
