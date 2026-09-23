// Minimal browser globals so the site's own modules can be imported in Node.
// `js/state.js` reads DOM elements at module scope, and `js/export-branding.js`
// imports it, so PDF generation cannot reach the real branding without this.
// Mirrors the intent of tests/unit/dom-stub.js, widened for the modules the
// generator touches.

function makeElement() {
  const element = {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [],
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    appendChild(child) {
      return child;
    },
    removeChild() {},
    addEventListener() {},
    removeEventListener() {},
    insertAdjacentHTML() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getContext: () => null,
    focus() {},
    click() {},
  };
  return element;
}

export function installDomStub() {
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => makeElement(),
      createElementNS: () => makeElement(),
      createDocumentFragment: () => makeElement(),
      head: makeElement(),
      body: makeElement(),
      documentElement: makeElement(),
      addEventListener() {},
      removeEventListener() {},
      readyState: 'complete',
    };
  }
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      dispatchEvent() {},
      addEventListener() {},
      removeEventListener() {},
      matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
      location: { href: 'https://roc-vts.com/', hash: '', search: '' },
      devicePixelRatio: 1,
    };
  }
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = {
      getItem: () => null,
      setItem() {},
      removeItem() {},
      clear() {},
      key: () => null,
      length: 0,
    };
  }
  if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    };
  }
}

// Site modules are addressed relative to the repository root, so callers pass
// paths like 'js/eden-operations-data.js' regardless of where they live.
const REPO_ROOT = new URL('../../../', import.meta.url);

// Load a site module and return its exports, with the DOM stub in place.
export async function loadSiteModule(relativePath) {
  installDomStub();
  return import(new URL(relativePath, REPO_ROOT).href);
}

export async function loadExportBranding(datasetMeta = {}) {
  const brandingModule = await loadSiteModule('js/export-branding.js');
  return {
    branding: brandingModule.getExportBranding(datasetMeta),
    csvFooterLines: brandingModule.csvFooterLines,
  };
}
