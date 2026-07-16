import { currentLanguage, undoLastAction } from './state.js';
import { comboToolsText } from './i18n/combo-tools/index.js';

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
    const message = document.createElement('span');
    message.textContent =
      detail.message ||
      comboToolsText(
        'undo.removed',
        { label: detail.label || comboToolsText('state.change', {}, currentLanguage) },
        currentLanguage
      );
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = comboToolsText('undo.action', {}, currentLanguage);
    toast.append(message, button);
    button?.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const undone = await undoLastAction();
        if (undone && typeof window.showToast === 'function')
          window.showToast(comboToolsText('undo.done', {}, currentLanguage), 'success', 1800);
      } catch (err) {
        console.warn('Undo failed:', err);
        if (typeof window.showToast === 'function')
          window.showToast(comboToolsText('undo.failed', {}, currentLanguage), 'error', 2500);
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
