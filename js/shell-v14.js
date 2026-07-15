(function initV14Shell() {
  'use strict';

  const moreButton = document.getElementById('shellMoreButton');
  const morePanel = document.getElementById('shellMorePanel');
  const moreBackdrop = document.getElementById('shellMoreBackdrop');
  const moreClose = document.getElementById('shellMoreClose');
  const moreTools = document.getElementById('shellMoreTools');
  const tabNavScroll = document.getElementById('tabNavScroll');
  const languageSelect = document.getElementById('languageSelect');
  const languageShell = document.querySelector('.lang-select-shell');
  const languageMenuButton = document.getElementById('languageMenuButton');
  const languageMenu = document.getElementById('languageMenu');
  const languageMenuLabel = document.getElementById('languageMenuLabel');
  const skipCurrentTool = document.getElementById('skipCurrentTool');

  if (!moreButton || !morePanel || !moreBackdrop || !moreClose || !moreTools || !tabNavScroll)
    return;

  const mobileQuery = window.matchMedia('(max-width: 640px)');
  const wideDesktopQuery = window.matchMedia('(min-width: 1440px)');
  const sourceIds = [
    'tabArcade',
    'tabManual',
    'tabGenerator',
    'tabHeroes',
    'tabResearch',
    'tabMaterials',
    'tabEdenMap',
    'tabStrife',
    'tabLoyalty',
    'tabEdenX1',
    'tabYouTube',
    'tabOcrDashboard',
  ];
  const desktopPrimaryIds = [
    'tabArcade',
    'tabManual',
    'tabGenerator',
    'tabHeroes',
    'tabResearch',
    'tabMaterials',
  ];
  const wideDesktopPrimaryIds = [...desktopPrimaryIds, 'tabStrife', 'tabLoyalty', 'tabYouTube'];
  const mobilePrimaryIds = ['tabGenerator', 'tabResearch', 'tabYouTube', 'tabArcade'];
  const internalHashes = new Map([
    ['tabArcade', 'arcade'],
    ['tabManual', 'manual'],
    ['tabGenerator', 'generator'],
    ['tabHeroes', 'heroes'],
    ['tabResearch', 'research'],
    ['tabMaterials', 'materials'],
    ['tabEdenMap', 'edenMap'],
    ['tabStrife', 'strife'],
    ['tabLoyalty', 'loyalty'],
    ['tabYouTube', 'youtube'],
  ]);
  const moreHistoryKey = 'vtsShellMoreOpen';

  const shellCopy = {
    en: { more: 'More', moreTools: 'More tools', close: 'Close' },
    es: { more: 'Más', moreTools: 'Más herramientas', close: 'Cerrar' },
    pt: { more: 'Mais', moreTools: 'Mais ferramentas', close: 'Fechar' },
    de: { more: 'Mehr', moreTools: 'Weitere Werkzeuge', close: 'Schließen' },
    fr: { more: 'Plus', moreTools: 'Plus d’outils', close: 'Fermer' },
    tr: { more: 'Diğer', moreTools: 'Diğer araçlar', close: 'Kapat' },
    ru: { more: 'Ещё', moreTools: 'Другие инструменты', close: 'Закрыть' },
    id: { more: 'Lainnya', moreTools: 'Alat lainnya', close: 'Tutup' },
    zh: { more: '更多', moreTools: '更多工具', close: '关闭' },
    ar: { more: 'المزيد', moreTools: 'أدوات إضافية', close: 'إغلاق' },
    kr: { more: '더보기', moreTools: '더 많은 도구', close: '닫기' },
  };

  const shortLanguageCodes = {
    ar: 'AR',
    de: 'DE',
    en: 'EN',
    es: 'ES',
    fr: 'FR',
    id: 'ID',
    kr: 'KO',
    pt: 'PT',
    ru: 'RU',
    tr: 'TR',
    zh: 'ZH',
  };

  let returnFocusTarget = null;
  let previousBodyOverflow = '';
  let bodyScrollLocked = false;
  const sourceItems = new Map();
  const languageButtons = new Map();
  const inertedByMore = new Set();

  function currentLanguage() {
    const selected = languageSelect?.value;
    if (selected && shellCopy[selected]) return selected;
    const htmlLanguage = document.documentElement.lang?.toLowerCase().split('-')[0];
    if (htmlLanguage === 'ko') return 'kr';
    return shellCopy[htmlLanguage] ? htmlLanguage : 'en';
  }

  function sourceFor(id) {
    return document.getElementById(id);
  }

  function activeTabName() {
    const validTabNames = new Set(internalHashes.values());
    const hashTabName = window.location.hash.replace(/^#/, '').split('?')[0];
    if (validTabNames.has(hashTabName)) return hashTabName;

    const bodyTabName = document.body.dataset.activeTab || '';
    if (validTabNames.has(bodyTabName)) return bodyTabName;

    const activeSource = sourceIds
      .map(sourceFor)
      .find((source) => source?.classList.contains('tab-pill-active'));
    return internalHashes.get(activeSource?.id) || 'generator';
  }

  function syncSkipDestination() {
    if (!skipCurrentTool) return;
    const tabName = activeTabName();
    skipCurrentTool.setAttribute('href', `#${tabName}Section`);
  }

  function buildLanguageMenu() {
    if (!languageSelect || !languageMenu || languageMenu.childElementCount) return;

    Array.from(languageSelect.options).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shell-language-option';
      button.dataset.language = option.value;
      button.setAttribute('role', 'option');

      const name = document.createElement('span');
      name.className = 'shell-language-option-name';
      name.textContent = option.textContent?.trim() || option.value.toUpperCase();

      const code = document.createElement('span');
      code.className = 'shell-language-option-code';
      code.textContent = shortLanguageCodes[option.value] || option.value.toUpperCase();

      button.append(name, code);
      button.addEventListener('click', () => selectLanguage(option.value));
      button.addEventListener('keydown', handleLanguageOptionKeydown);
      languageButtons.set(option.value, button);
      languageMenu.appendChild(button);
    });
    document.getElementById('app')?.appendChild(languageMenu);
  }

  function positionLanguageMenu() {
    if (!languageMenu || !languageMenuButton || languageMenu.hidden) return;
    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width || window.innerWidth;
    const viewportHeight = visualViewport?.height || window.innerHeight;
    const viewportLeft = visualViewport?.offsetLeft || 0;
    const viewportTop = visualViewport?.offsetTop || 0;
    const rootStyles = window.getComputedStyle(document.documentElement);
    const safeLeft = Math.max(
      9,
      Number.parseFloat(rootStyles.getPropertyValue('--ff-safe-left')) || 0
    );
    const safeRight = Math.max(
      9,
      Number.parseFloat(rootStyles.getPropertyValue('--ff-safe-right')) || 0
    );
    const safeTop = Math.max(
      9,
      Number.parseFloat(rootStyles.getPropertyValue('--ff-safe-top')) || 0
    );
    const safeBottom = Math.max(
      9,
      Number.parseFloat(rootStyles.getPropertyValue('--ff-safe-bottom')) || 0
    );
    const rect = languageMenuButton.getBoundingClientRect();
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const width = Math.min(238, viewportWidth - safeLeft - safeRight);
    const left = Math.min(
      Math.max(viewportLeft + safeLeft, rect.right - width),
      viewportRight - width - safeRight
    );
    const menuHeight = Math.min(
      450,
      languageMenu.scrollHeight,
      viewportHeight - safeTop - safeBottom
    );
    const below = rect.bottom + 8;
    const top =
      below + menuHeight <= viewportBottom - safeBottom
        ? below
        : Math.max(viewportTop + safeTop, rect.top - menuHeight - 8);
    languageMenu.style.width = `${width}px`;
    languageMenu.style.left = `${left}px`;
    languageMenu.style.top = `${top}px`;
    languageMenu.style.right = 'auto';
    languageMenu.style.maxHeight = `${Math.max(180, viewportBottom - top - safeBottom)}px`;
  }

  function visibleLanguageButtons() {
    return Array.from(languageButtons.values()).filter(
      (button) => button.getClientRects().length > 0
    );
  }

  function focusLanguageButton(index) {
    const buttons = visibleLanguageButtons();
    if (!buttons.length) return;
    const targetIndex = (index + buttons.length) % buttons.length;
    buttons[targetIndex].focus({ preventScroll: true });
    buttons[targetIndex].scrollIntoView({ block: 'nearest' });
  }

  function focusAdjacentToLanguageTrigger(backward) {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const controls = Array.from(document.querySelectorAll(selector)).filter((element) => {
      return (
        !languageMenu?.contains(element) &&
        element.getAttribute('aria-hidden') !== 'true' &&
        element.tabIndex >= 0 &&
        element.getClientRects().length > 0 &&
        !element.closest('[inert]')
      );
    });
    const triggerIndex = controls.indexOf(languageMenuButton);
    if (triggerIndex < 0) return;
    const targetIndex = triggerIndex + (backward ? -1 : 1);
    (controls[targetIndex] || languageMenuButton)?.focus({ preventScroll: true });
  }

  function setLanguageMenuOpen(open, { focusSelected = true, restoreFocus = true } = {}) {
    if (!languageMenu || !languageMenuButton) return;
    const isOpen = !languageMenu.hidden;
    if (open === isOpen) return;

    languageMenu.hidden = !open;
    languageMenuButton.setAttribute('aria-expanded', String(open));
    languageShell?.classList.toggle('is-open', open);

    if (open) {
      replaceMoreHistoryState();
      setOpen(false, { restoreFocus: false });
      window.requestAnimationFrame(() => {
        positionLanguageMenu();
        if (focusSelected) languageButtons.get(currentLanguage())?.focus({ preventScroll: true });
      });
    } else if (restoreFocus && languageMenu.contains(document.activeElement)) {
      languageMenuButton.focus({ preventScroll: true });
    }
  }

  function selectLanguage(language) {
    if (!languageSelect || !languageButtons.has(language)) return;
    languageSelect.value = language;
    languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
    setLanguageMenuOpen(false);
    window.setTimeout(applyLocale, 0);
  }

  function handleLanguageOptionKeydown(event) {
    const buttons = visibleLanguageButtons();
    const currentIndex = buttons.indexOf(event.currentTarget);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusLanguageButton(currentIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusLanguageButton(currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusLanguageButton(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusLanguageButton(buttons.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setLanguageMenuOpen(false);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      setLanguageMenuOpen(false, { restoreFocus: false });
      focusAdjacentToLanguageTrigger(event.shiftKey);
    }
  }

  function setAttributeIfChanged(element, name, value) {
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function syncSourceSemantics(source) {
    const tabName = internalHashes.get(source.id);
    if (!tabName) return;

    const selected = source.classList.contains('tab-pill-active');
    setAttributeIfChanged(source, 'aria-pressed', String(selected));
    ['role', 'aria-selected'].forEach((attribute) => {
      if (source.hasAttribute(attribute)) source.removeAttribute(attribute);
    });
    const panel = document.getElementById(`${tabName}Section`);
    if (panel) {
      setAttributeIfChanged(source, 'aria-controls', panel.id);
      setAttributeIfChanged(panel, 'role', 'region');
    }
  }

  function syncAllSourceSemantics() {
    for (const id of sourceItems.keys()) {
      const source = sourceFor(id);
      if (source) syncSourceSemantics(source);
    }
  }

  function moveSourceItem(id, container) {
    const source = sourceFor(id);
    const item = sourceItems.get(id);
    if (!source || !item) return;
    const inMore = container === moreTools;

    item.toggleAttribute('data-shell-in-more', inMore);
    source.classList.toggle('shell-more-tool', inMore);
    source.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    container.appendChild(item);
    syncSourceSemantics(source);
  }

  function layoutNavigation({ preserveFocus = document.activeElement } = {}) {
    const focusedSource = sourceIds
      .map(sourceFor)
      .find((source) => source?.contains(preserveFocus));
    const focusWasInMore = morePanel.contains(preserveFocus);
    const primaryIds = mobileQuery.matches
      ? mobilePrimaryIds
      : wideDesktopQuery.matches
        ? wideDesktopPrimaryIds
        : desktopPrimaryIds;
    const primarySet = new Set(primaryIds);

    primaryIds.forEach((id) => moveSourceItem(id, tabNavScroll));
    sourceIds.filter((id) => !primarySet.has(id)).forEach((id) => moveSourceItem(id, moreTools));
    syncActiveState();
    if (focusedSource) {
      const remainsVisible = primarySet.has(focusedSource.id) || !morePanel.hidden;
      (remainsVisible ? focusedSource : moreButton).focus({ preventScroll: true });
    } else if (focusWasInMore && morePanel.hidden) {
      moreButton.focus({ preventScroll: true });
    }
  }

  function syncActiveState() {
    const hiddenActive = Array.from(moreTools.querySelectorAll('.tab-pill')).some((source) => {
      return source.classList.contains('tab-pill-active');
    });
    moreButton.classList.toggle('is-active', hiddenActive);
    syncSkipDestination();
  }

  function applyLocale() {
    const language = currentLanguage();
    const copy = shellCopy[language] || shellCopy.en;
    const moreLabel = moreButton.querySelector('[data-shell-more-label]');
    const moreTitle = morePanel.querySelector('[data-shell-more-title]');

    if (moreLabel) moreLabel.textContent = copy.more;
    if (moreTitle) moreTitle.textContent = copy.moreTools;
    moreButton.setAttribute('aria-label', copy.moreTools);
    morePanel.setAttribute('aria-label', copy.moreTools);
    moreClose.setAttribute('aria-label', copy.close);
    moreClose.setAttribute('title', copy.close);
    if (languageShell)
      languageShell.dataset.shellLang = shortLanguageCodes[language] || language.toUpperCase();
    const selectedOption = languageSelect?.selectedOptions?.[0];
    if (languageMenuLabel && selectedOption) {
      languageMenuLabel.textContent = selectedOption.textContent?.trim() || language;
      languageMenuLabel.dataset.short = shortLanguageCodes[language] || language.toUpperCase();
    }
    languageButtons.forEach((button, code) => {
      const isSelected = code === language;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-selected', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });
    syncActiveState();
  }

  function hasMoreHistoryState() {
    return Boolean(window.history.state?.[moreHistoryKey]);
  }

  function cleanMoreHistoryState() {
    const nextState = { ...(window.history.state || {}) };
    delete nextState[moreHistoryKey];
    return Object.keys(nextState).length ? nextState : null;
  }

  function pushMoreHistoryState() {
    if (hasMoreHistoryState()) return;
    try {
      window.history.pushState(
        { ...(window.history.state || {}), [moreHistoryKey]: true },
        '',
        window.location.href
      );
    } catch {}
  }

  function replaceMoreHistoryState() {
    if (!hasMoreHistoryState()) return;
    try {
      window.history.replaceState(cleanMoreHistoryState(), '', window.location.href);
    } catch {}
  }

  function setOpen(open, { restoreFocus = true, returnTarget = null } = {}) {
    const isOpen = !morePanel.hidden;
    if (open === isOpen) {
      if (open) morePanel.setAttribute('aria-modal', mobileQuery.matches ? 'true' : 'false');
      return;
    }

    if (open) {
      returnFocusTarget =
        returnTarget ||
        (document.activeElement instanceof HTMLElement ? document.activeElement : moreButton);
      morePanel.hidden = false;
      moreBackdrop.hidden = false;
      moreButton.setAttribute('aria-expanded', 'true');
      morePanel.setAttribute('aria-modal', mobileQuery.matches ? 'true' : 'false');
      document.body.classList.add('shell-more-open');
      if (mobileQuery.matches) {
        setModalBackgroundInert(true);
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        bodyScrollLocked = true;
      } else {
        setModalBackgroundInert(false);
      }
      window.requestAnimationFrame(() => moreClose.focus({ preventScroll: true }));
      return;
    }

    morePanel.hidden = true;
    moreBackdrop.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
    morePanel.setAttribute('aria-modal', 'false');
    document.body.classList.remove('shell-more-open');
    setModalBackgroundInert(false);
    if (bodyScrollLocked) {
      document.body.style.overflow = previousBodyOverflow;
      bodyScrollLocked = false;
    }
    if (restoreFocus && returnFocusTarget?.isConnected) {
      returnFocusTarget.focus({ preventScroll: true });
    }
  }

  function setModalBackgroundInert(inert) {
    if (!inert) {
      inertedByMore.forEach((element) => {
        if (element.isConnected) element.inert = false;
      });
      inertedByMore.clear();
      return;
    }

    const selector = [
      'body > :not(#app):not(script)',
      '#app > :not(#mainContent)',
      '#mainContent > :not(.tool-nav-shell)',
      '.tool-nav-inner > :not(#shellMoreBackdrop):not(#shellMorePanel)',
    ].join(',');
    document.querySelectorAll(selector).forEach((element) => {
      if (element.inert) return;
      element.inert = true;
      inertedByMore.add(element);
    });
  }

  function openMore({ fromHistory = false } = {}) {
    setLanguageMenuOpen(false, { restoreFocus: false });
    setOpen(true, { returnTarget: fromHistory ? moreButton : null });
    if (!fromHistory) pushMoreHistoryState();
  }

  function dismissMore({ restoreFocus = true, consumeHistory = true } = {}) {
    const shouldGoBack = consumeHistory && hasMoreHistoryState();
    setOpen(false, { restoreFocus });
    if (shouldGoBack) window.history.back();
    else if (!consumeHistory) replaceMoreHistoryState();
  }

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function focusTabDestination(tabName, { scroll = false } = {}) {
    if (!tabName) return;
    window.requestAnimationFrame(() => {
      const section = document.getElementById(`${tabName}Section`);
      if (!section || section.classList.contains('hidden')) return;
      const target = scroll ? section : section.querySelector('h1, h2, h3') || section;
      const hadTabIndex = target.hasAttribute('tabindex');
      if (!hadTabIndex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (scroll) {
        target.scrollIntoView({
          block: 'start',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
      if (!hadTabIndex) {
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    });
  }

  function closeMoreForNavigation(source) {
    const tabName = internalHashes.get(source.id);
    const activeHash = window.location.hash.replace(/^#/, '').split('?')[0];

    setOpen(false, { restoreFocus: false });
    focusTabDestination(tabName);
    if (!hasMoreHistoryState()) return;
    if (tabName && tabName === activeHash) {
      window.history.back();
      return;
    }
    replaceMoreHistoryState();
  }

  function visiblePanelControls() {
    return Array.from(morePanel.querySelectorAll('button, a[href]')).filter((element) => {
      return !element.disabled && element.getClientRects().length > 0;
    });
  }

  buildLanguageMenu();

  sourceIds.forEach((id) => {
    const source = sourceFor(id);
    const item = source?.closest('.tab-item');
    if (!source || !item) return;
    sourceItems.set(id, item);
    source.addEventListener('click', () => {
      if (!moreTools.contains(item)) return;
      closeMoreForNavigation(source);
    });
  });
  skipCurrentTool?.addEventListener('click', (event) => {
    event.preventDefault();
    focusTabDestination(activeTabName(), { scroll: true });
  });
  layoutNavigation();
  document.documentElement.dataset.shellNavReady = '1';

  let sourceSyncQueued = false;
  const sourceObserver = new MutationObserver(() => {
    if (sourceSyncQueued) return;
    sourceSyncQueued = true;
    window.requestAnimationFrame(() => {
      sourceSyncQueued = false;
      syncAllSourceSemantics();
      syncActiveState();
    });
  });
  sourceIds.forEach((id) => {
    const source = sourceFor(id);
    if (source) {
      sourceObserver.observe(source, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
        attributeFilter: [
          'aria-label',
          'aria-controls',
          'aria-pressed',
          'aria-selected',
          'class',
          'role',
        ],
      });
      const panel = document.getElementById(`${internalHashes.get(id)}Section`);
      if (panel) sourceObserver.observe(panel, { attributes: true, attributeFilter: ['role'] });
    }
  });

  moreButton.addEventListener('click', () => {
    if (morePanel.hidden) openMore();
    else dismissMore();
  });
  moreClose.addEventListener('click', () => dismissMore());
  moreBackdrop.addEventListener('click', () => dismissMore());

  languageMenuButton?.addEventListener('click', () =>
    setLanguageMenuOpen(languageMenu?.hidden ?? false)
  );
  languageMenuButton?.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setLanguageMenuOpen(true, { focusSelected: false });
    const selectedIndex = visibleLanguageButtons().indexOf(languageButtons.get(currentLanguage()));
    if (event.key === 'Home') focusLanguageButton(0);
    else if (event.key === 'End') focusLanguageButton(visibleLanguageButtons().length - 1);
    else focusLanguageButton(selectedIndex + (event.key === 'ArrowUp' ? -1 : 1));
  });

  document.addEventListener('pointerdown', (event) => {
    if (
      !languageMenu?.hidden &&
      !languageShell?.contains(event.target) &&
      !languageMenu.contains(event.target)
    ) {
      setLanguageMenuOpen(false, { restoreFocus: false });
    }
  });
  window.addEventListener('resize', positionLanguageMenu);
  window.addEventListener('scroll', positionLanguageMenu, true);

  document.addEventListener('keydown', (event) => {
    if (!languageMenu?.hidden && event.key === 'Escape') {
      event.preventDefault();
      setLanguageMenuOpen(false);
      return;
    }
    if (morePanel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissMore();
      return;
    }
    if (!mobileQuery.matches || event.key !== 'Tab') return;

    const controls = visiblePanelControls();
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  languageSelect?.addEventListener('change', () => window.setTimeout(applyLocale, 0));
  window.addEventListener('edenLanguageUpdate', applyLocale);
  window.addEventListener('hashchange', syncActiveState);
  window.addEventListener('popstate', () => {
    if (hasMoreHistoryState()) openMore({ fromHistory: true });
    else setOpen(false);
    syncActiveState();
  });
  window.addEventListener('pageshow', () => {
    layoutNavigation();
    if (hasMoreHistoryState()) openMore({ fromHistory: true });
    else setOpen(false, { restoreFocus: false });
    syncActiveState();
  });
  mobileQuery.addEventListener('change', () => {
    const preserveFocus = document.activeElement;
    if (!morePanel.hidden) dismissMore({ restoreFocus: false });
    else replaceMoreHistoryState();
    setLanguageMenuOpen(false, { restoreFocus: false });
    layoutNavigation({ preserveFocus });
  });
  wideDesktopQuery.addEventListener('change', () => layoutNavigation());

  window.vtsShellOpenMore = () => openMore();
  window.vtsShellCloseMore = (options) => dismissMore(options);

  applyLocale();
})();
