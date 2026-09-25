// Shared chrome for the standalone tool pages.
//
// Every tool that lives on its own page (Eden X1/X2, VtsScore, Arcade, Eden
// Siege, Downloads, Specialization Towers, Battle Simulator) should read as
// part of one site: the same brand, the same way back to the tools, and the
// same footer. Pages that already carry the command-deck header keep it; this
// module adds a compact branded bar with "Back to tools" to the pages that have
// no header of their own, and gives every page one footer with one link set.
//
// Strings live here rather than in the main packs because these pages load
// different i18n systems (or none). The module follows <html lang>, which each
// page's own language switcher already maintains.
//
// This module carries no CSS on purpose: Eden, Arcade and Eden Siege already
// link css/standalone-footer-v14.css, and importing it here duplicated it on
// every one of them. Pages that need the footer or bar styles import
// css/standalone-footer-v14.css and css/tool-shell.css in their own entry.

const STRINGS = {
  en: {
    back: 'Back to tools',
    tagline: 'Community toolkit',
    toolsNav: 'Toolkit pages',
    tools: 'All tools',
    downloads: 'PDF downloads',
    admin: 'VTS Admin',
    contact: 'Contact devs',
    disclaimer:
      'Not affiliated with Camel Games or Rise of Castles. Game assets belong to their respective owners. This is a free fan-made community tool.',
  },
  ar: {
    back: 'العودة إلى الأدوات',
    tagline: 'أدوات المجتمع',
    toolsNav: 'صفحات الأدوات',
    tools: 'كل الأدوات',
    downloads: 'تنزيلات PDF',
    admin: 'إدارة VTS',
    contact: 'تواصل مع المطورين',
    disclaimer:
      'غير تابع لـ Camel Games أو Rise of Castles. أصول اللعبة ملك لأصحابها. هذه أداة مجتمعية مجانية من صنع المعجبين.',
  },
  de: {
    back: 'Zurück zu den Tools',
    tagline: 'Community-Toolkit',
    toolsNav: 'Toolkit-Seiten',
    tools: 'Alle Tools',
    downloads: 'PDF-Downloads',
    admin: 'VTS Admin',
    contact: 'Entwickler kontaktieren',
    disclaimer:
      'Nicht mit Camel Games oder Rise of Castles verbunden. Spielinhalte gehören ihren jeweiligen Eigentümern. Dies ist ein kostenloses Community-Tool von Fans.',
  },
  es: {
    back: 'Volver a las herramientas',
    tagline: 'Herramientas de la comunidad',
    toolsNav: 'Páginas del kit',
    tools: 'Todas las herramientas',
    downloads: 'Descargas PDF',
    admin: 'Admin VTS',
    contact: 'Contactar a los desarrolladores',
    disclaimer:
      'Sin afiliación con Camel Games ni Rise of Castles. Los recursos del juego pertenecen a sus respectivos dueños. Es una herramienta comunitaria gratuita hecha por fans.',
  },
  fr: {
    back: 'Retour aux outils',
    tagline: 'Boîte à outils communautaire',
    toolsNav: 'Pages de la boîte à outils',
    tools: 'Tous les outils',
    downloads: 'Téléchargements PDF',
    admin: 'Admin VTS',
    contact: 'Contacter les développeurs',
    disclaimer:
      'Non affilié à Camel Games ni à Rise of Castles. Les éléments du jeu appartiennent à leurs propriétaires. Outil communautaire gratuit créé par des fans.',
  },
  hr: {
    back: 'Natrag na alate',
    tagline: 'Alati zajednice',
    toolsNav: 'Stranice alata',
    tools: 'Svi alati',
    downloads: 'PDF preuzimanja',
    admin: 'VTS Admin',
    contact: 'Kontaktiraj developere',
    disclaimer:
      'Nije povezano s Camel Games ni Rise of Castles. Sadržaj igre pripada njegovim vlasnicima. Ovo je besplatan alat zajednice koji su izradili fanovi.',
  },
  id: {
    back: 'Kembali ke alat',
    tagline: 'Toolkit komunitas',
    toolsNav: 'Halaman toolkit',
    tools: 'Semua alat',
    downloads: 'Unduhan PDF',
    admin: 'Admin VTS',
    contact: 'Hubungi pengembang',
    disclaimer:
      'Tidak berafiliasi dengan Camel Games atau Rise of Castles. Aset game milik pemiliknya masing-masing. Ini alat komunitas gratis buatan penggemar.',
  },
  it: {
    back: 'Torna agli strumenti',
    tagline: 'Toolkit della community',
    toolsNav: 'Pagine del toolkit',
    tools: 'Tutti gli strumenti',
    downloads: 'Download PDF',
    admin: 'Admin VTS',
    contact: 'Contatta gli sviluppatori',
    disclaimer:
      'Non affiliato con Camel Games o Rise of Castles. Le risorse del gioco appartengono ai rispettivi proprietari. Strumento gratuito creato dai fan per la community.',
  },
  kr: {
    back: '도구로 돌아가기',
    tagline: '커뮤니티 툴킷',
    toolsNav: '툴킷 페이지',
    tools: '모든 도구',
    downloads: 'PDF 다운로드',
    admin: 'VTS 관리자',
    contact: '개발자에게 문의',
    disclaimer:
      'Camel Games 및 Rise of Castles와 관련이 없습니다. 게임 에셋의 권리는 각 소유자에게 있습니다. 팬이 만든 무료 커뮤니티 도구입니다.',
  },
  pt: {
    back: 'Voltar às ferramentas',
    tagline: 'Kit da comunidade',
    toolsNav: 'Páginas do kit',
    tools: 'Todas as ferramentas',
    downloads: 'Downloads em PDF',
    admin: 'Admin VTS',
    contact: 'Falar com os desenvolvedores',
    disclaimer:
      'Sem afiliação com a Camel Games ou Rise of Castles. Os recursos do jogo pertencem aos seus donos. Esta é uma ferramenta gratuita feita por fãs para a comunidade.',
  },
  ru: {
    back: 'Назад к инструментам',
    tagline: 'Инструменты сообщества',
    toolsNav: 'Страницы инструментов',
    tools: 'Все инструменты',
    downloads: 'PDF-файлы',
    admin: 'Админка VTS',
    contact: 'Связаться с разработчиками',
    disclaimer:
      'Не связано с Camel Games или Rise of Castles. Игровые материалы принадлежат их владельцам. Это бесплатный фанатский инструмент для сообщества.',
  },
  tr: {
    back: 'Araçlara dön',
    tagline: 'Topluluk araç seti',
    toolsNav: 'Araç sayfaları',
    tools: 'Tüm araçlar',
    downloads: 'PDF indirmeleri',
    admin: 'VTS Yönetim',
    contact: 'Geliştiricilere ulaş',
    disclaimer:
      'Camel Games veya Rise of Castles ile bağlantılı değildir. Oyun varlıkları sahiplerine aittir. Bu, hayranların yaptığı ücretsiz bir topluluk aracıdır.',
  },
  zh: {
    back: '返回工具',
    tagline: '社区工具箱',
    toolsNav: '工具页面',
    tools: '全部工具',
    downloads: 'PDF 下载',
    admin: 'VTS 管理',
    contact: '联系开发者',
    disclaimer:
      '与 Camel Games 或 Rise of Castles 无关。游戏素材归其各自所有者所有。这是一个由玩家制作的免费社区工具。',
  },
};

export const TOOL_SHELL_LOCALES = Object.freeze(Object.keys(STRINGS));

// One link set for every standalone footer. Labels that are product names stay
// untranslated, as they do everywhere else on the site.
const FOOTER_LINKS = [
  { href: 'index.html', key: 'tools' },
  { href: 'eden-x2.html', label: 'Eden X2' },
  { href: 'vtsscore.html', label: 'VtsScore' },
  { href: 'arcade.html', label: 'Arcade' },
  { href: 'downloads.html', key: 'downloads' },
  { href: 'admin.html', key: 'admin' },
];

export function toolShellLocale(lang) {
  const base = String(lang || '')
    .toLowerCase()
    .split('-')[0];
  if (base === 'ko') return 'kr';
  return Object.hasOwn(STRINGS, base) ? base : 'en';
}

export function toolShellText(key, lang) {
  const pack = STRINGS[toolShellLocale(lang)];
  return pack[key] ?? STRINGS.en[key] ?? key;
}

function appVersion() {
  const meta = document.querySelector('meta[name="vts-app-version"]');
  return meta?.getAttribute('content') || '';
}

function samePage(href) {
  const here = (globalThis.location?.pathname || '').split('/').pop() || 'index.html';
  return here === href;
}

function logo(size) {
  const picture = document.createElement('picture');
  const source = document.createElement('source');
  source.srcset = size > 40 ? 'images/logo-120.webp' : 'images/logo-40.webp';
  source.type = 'image/webp';
  const img = document.createElement('img');
  img.src = 'images/logo.png';
  img.alt = '';
  img.width = size;
  img.height = size;
  img.decoding = 'async';
  picture.append(source, img);
  return picture;
}

function buildBar() {
  const bar = document.createElement('nav');
  bar.className = 'tool-shell-bar';
  bar.dataset.toolShell = 'bar';

  const brand = document.createElement('a');
  brand.className = 'tool-shell-brand';
  brand.href = 'index.html';
  brand.append(logo(40));
  const words = document.createElement('span');
  words.className = 'tool-shell-words';
  const name = document.createElement('strong');
  name.textContent = 'RoC VTS Toolkit';
  const tagline = document.createElement('small');
  tagline.dataset.toolShellText = 'tagline';
  words.append(name, tagline);
  brand.append(words);

  const back = document.createElement('a');
  back.className = 'tool-shell-back';
  back.href = 'index.html';
  const arrow = document.createElement('span');
  arrow.className = 'tool-shell-back-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.dataset.toolShellText = 'back';
  back.append(arrow, label);

  // The shared account chip mounts here instead of floating over the page
  // (js/account-chip.js takes the first [data-account-chip] it finds).
  const actions = document.createElement('div');
  actions.className = 'tool-shell-actions';
  if (!document.querySelector('[data-account-chip]')) {
    const slot = document.createElement('span');
    slot.className = 'tool-shell-account';
    slot.dataset.accountChip = '';
    actions.append(slot);
  }
  actions.append(back);

  bar.append(brand, actions);
  return bar;
}

function fillFooterLinks(nav) {
  nav.replaceChildren(
    ...FOOTER_LINKS.map((link) => {
      const a = document.createElement('a');
      a.href = link.href;
      if (link.key) a.dataset.toolShellText = link.key;
      else a.textContent = link.label;
      if (samePage(link.href)) a.setAttribute('aria-current', 'page');
      return a;
    })
  );
  nav.dataset.toolShellAria = 'toolsNav';
}

function buildFooter() {
  const footer = document.createElement('footer');
  footer.className = 'roc-footer standalone-footer-v14 tool-shell-footer';
  footer.dataset.toolShell = 'footer';

  const main = document.createElement('div');
  main.className = 'standalone-footer-main';
  const brand = document.createElement('a');
  brand.className = 'standalone-footer-brand';
  brand.href = 'index.html';
  brand.append(logo(40));
  const words = document.createElement('span');
  const strong = document.createElement('strong');
  strong.textContent = 'VTS 1097';
  const small = document.createElement('small');
  small.textContent = 'RoC VTS Toolkit';
  words.append(strong, small);
  brand.append(words);

  const nav = document.createElement('nav');
  nav.className = 'standalone-footer-links';
  fillFooterLinks(nav);

  const actions = document.createElement('div');
  actions.className = 'standalone-footer-actions';
  const contact = document.createElement('a');
  // Contact Devs opens the feedback/complaint form rather than a mail client.
  contact.href = 'eden-x2.html#edenX1Complaints';
  contact.dataset.toolShellText = 'contact';
  const site = document.createElement('a');
  site.href = 'https://roc-vts.com/';
  site.textContent = 'roc-vts.com';
  actions.append(contact, site);
  main.append(brand, nav, actions);

  const legal = document.createElement('div');
  legal.className = 'standalone-footer-legal';
  const disclaimer = document.createElement('p');
  disclaimer.className = 'disclaimer';
  disclaimer.dataset.toolShellText = 'disclaimer';
  const copy = document.createElement('p');
  const version = appVersion();
  copy.textContent = `© ${new Date().getFullYear()} VTS 1097${version ? ` · v${version}` : ''}`;
  legal.append(disclaimer, copy);

  footer.append(main, legal);
  return footer;
}

function applyText(root = document) {
  const lang = document.documentElement.lang;
  root.querySelectorAll('[data-tool-shell-text]').forEach((element) => {
    const key = element.dataset.toolShellText;
    if (key) element.textContent = toolShellText(key, lang);
  });
  root.querySelectorAll('[data-tool-shell-aria]').forEach((element) => {
    element.setAttribute('aria-label', toolShellText(element.dataset.toolShellAria, lang));
  });
}

/**
 * Mount the shared chrome. `bar: true` adds the branded "Back to tools" bar
 * (only for pages without a header of their own); the footer is always unified.
 */
export function mountToolShell({ bar = false, barHost = null } = {}) {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.body.dataset.toolShellMounted === '1') return;
  document.body.dataset.toolShellMounted = '1';

  if (bar) {
    const host = barHost || document.body;
    host.prepend(buildBar());
  }

  const existing = document.querySelector('footer.standalone-footer-v14');
  if (existing) {
    const nav = existing.querySelector('.standalone-footer-links');
    if (nav) fillFooterLinks(nav);
  } else {
    const footer = buildFooter();
    const scripts = document.body.querySelector(':scope > script');
    if (scripts) document.body.insertBefore(footer, scripts);
    else document.body.append(footer);
  }

  applyText();
  // Each page runs its own language switcher; follow whatever it sets.
  new MutationObserver(() => applyText()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });
}
