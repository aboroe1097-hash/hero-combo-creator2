if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => null,
  };
}
