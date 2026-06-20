const TAB_ORDER = ['manual', 'generator', 'heroes', 'research', 'edenMap', 'loyalty', 'youtube', 'ocrDashboard'];

function isTypingTarget(el) {
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName) || el?.isContentEditable;
}

function closeTopModal() {
  const messageBox = document.getElementById('messageBox');
  if (messageBox && !messageBox.classList.contains('hidden')) {
    messageBox.classList.add('hidden');
    return true;
  }
  const dashModal = document.getElementById('dashModal');
  if (dashModal?.classList.contains('active')) {
    dashModal.classList.remove('active');
    document.body.style.overflow = '';
    return true;
  }
  document.querySelector('.quick-tour-overlay:not(.hidden) .quick-tour-skip')?.click();
  return false;
}

function focusVisibleSearch() {
  const selectors = [
    '#manualSection:not(.hidden) #manualHeroSearch',
    '#generatorSection:not(.hidden) #generatorHeroSearch',
    '#heroesSection:not(.hidden) #heroesTabSearch',
    '#researchSection:not(.hidden) #techSearchInput',
    '#edenMapSection:not(.hidden) #edenStructSearch',
    '#ocrDashboardSection:not(.hidden) input[type="search"]',
  ];
  const input = selectors.map((s) => document.querySelector(s)).find(Boolean);
  if (input) {
    input.focus();
    input.select?.();
  }
}

export function initKeyboardShortcuts({ switchTab }) {
  if (document.documentElement.dataset.globalShortcutsWired === '1') return;
  document.documentElement.dataset.globalShortcutsWired = '1';

  document.addEventListener('keydown', (event) => {
    const key = event.key;
    if (event.defaultPrevented) return;

    if (key === 'Escape') {
      if (closeTopModal()) event.preventDefault();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && /^[1-8]$/.test(key)) {
      event.preventDefault();
      switchTab?.(TAB_ORDER[Number(key) - 1]);
      return;
    }

    if (key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(document.activeElement)) {
      event.preventDefault();
      focusVisibleSearch();
    }
  });
}
