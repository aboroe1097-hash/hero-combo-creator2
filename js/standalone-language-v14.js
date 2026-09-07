(function initStandaloneLanguagePopover() {
  'use strict';

  const shell = document.querySelector('.lang-select-shell');
  const select = shell?.querySelector('select');
  if (!shell || !select || shell.dataset.languagePopoverMounted === '1') return;

  const shortCodes = Object.freeze({
    ar: 'AR', de: 'DE', en: 'EN', es: 'ES', fr: 'FR', id: 'ID', it: 'IT',
    kr: 'KO', pt: 'PT', ru: 'RU', tr: 'TR', zh: 'ZH',
  });
  const originalIcon = shell.querySelector('.lang-select-icon');
  const originalCaret = shell.querySelector('.lang-select-caret');
  const button = document.createElement('button');
  const label = document.createElement('span');
  const menu = document.createElement('div');
  const optionButtons = new Map();

  shell.dataset.languagePopoverMounted = '1';
  shell.classList.add('standalone-language-popover');
  select.classList.add('standalone-native-language');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;

  button.type = 'button';
  button.className = 'standalone-language-button';
  button.id = 'standaloneLanguageButton';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'standaloneLanguageMenu');
  button.setAttribute('aria-label', select.getAttribute('aria-label') || 'Language');
  const i18nAria = select.getAttribute('data-i18n-aria');
  if (i18nAria) button.setAttribute('data-i18n-aria', i18nAria);

  if (originalIcon) button.appendChild(originalIcon);
  label.className = 'standalone-language-label';
  button.appendChild(label);
  if (originalCaret) button.appendChild(originalCaret);

  menu.id = 'standaloneLanguageMenu';
  menu.className = 'standalone-language-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-labelledby', button.id);
  menu.hidden = true;

  function selectedLanguage() {
    return select.value || 'en';
  }

  function visibleOptions() {
    return Array.from(optionButtons.values()).filter((item) => item.getClientRects().length > 0);
  }

  function positionMenu() {
    if (menu.hidden) return;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const rect = button.getBoundingClientRect();
    const width = Math.min(238, viewportWidth - 18);
    const left = Math.min(Math.max(9, rect.right - width), viewportWidth - width - 9);
    const top = Math.min(rect.bottom + 8, Math.max(9, viewportHeight - Math.min(450, viewportHeight - 18) - 9));
    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.right = 'auto';
    menu.style.maxHeight = `${Math.max(180, viewportHeight - top - 9)}px`;
  }

  function focusOption(index) {
    const options = visibleOptions();
    if (!options.length) return;
    const next = options[(index + options.length) % options.length];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest' });
  }

  function sync() {
    const language = selectedLanguage();
    const selected = select.selectedOptions?.[0];
    label.textContent = selected?.textContent?.trim() || language.toUpperCase();
    label.dataset.short = shortCodes[language] || language.toUpperCase();
    optionButtons.forEach((item, code) => {
      const isSelected = code === language;
      item.classList.toggle('is-selected', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
      item.tabIndex = isSelected ? 0 : -1;
    });
  }

  function setOpen(open, { restoreFocus = true } = {}) {
    if (open === !menu.hidden) return;
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    shell.classList.toggle('is-open', open);
    if (open) {
      window.requestAnimationFrame(() => {
        positionMenu();
        optionButtons.get(selectedLanguage())?.focus({ preventScroll: true });
      });
    } else if (restoreFocus && menu.contains(document.activeElement)) {
      button.focus({ preventScroll: true });
    }
  }

  function choose(language) {
    if (!optionButtons.has(language)) return;
    select.value = language;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
    setOpen(false);
  }

  Array.from(select.options).forEach((option) => {
    const item = document.createElement('button');
    const name = document.createElement('span');
    const code = document.createElement('span');
    item.type = 'button';
    item.className = 'standalone-language-option';
    item.setAttribute('role', 'option');
    item.dataset.language = option.value;
    name.textContent = option.textContent?.trim() || option.value.toUpperCase();
    name.className = 'standalone-language-option-name';
    code.textContent = shortCodes[option.value] || option.value.toUpperCase();
    code.className = 'standalone-language-option-code';
    item.append(name, code);
    item.addEventListener('click', () => choose(option.value));
    item.addEventListener('keydown', (event) => {
      const options = visibleOptions();
      const index = options.indexOf(item);
      if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1); }
      else if (event.key === 'Home') { event.preventDefault(); focusOption(0); }
      else if (event.key === 'End') { event.preventDefault(); focusOption(options.length - 1); }
      else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      else if (event.key === 'Tab') setOpen(false, { restoreFocus: false });
    });
    optionButtons.set(option.value, item);
    menu.appendChild(item);
  });

  shell.insertBefore(button, select);
  document.body.appendChild(menu);
  button.addEventListener('click', () => setOpen(menu.hidden));
  button.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
    const options = visibleOptions();
    const index = options.indexOf(optionButtons.get(selectedLanguage()));
    if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(options.length - 1);
    else focusOption(index + (event.key === 'ArrowUp' ? -1 : 1));
  });
  select.addEventListener('change', () => window.setTimeout(sync, 0));
  window.addEventListener('edenLanguageUpdate', sync);
  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !shell.contains(event.target) && !menu.contains(event.target)) {
      setOpen(false, { restoreFocus: false });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!menu.hidden && event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  });
  window.addEventListener('resize', positionMenu);
  window.addEventListener('scroll', positionMenu, true);

  sync();
})();
