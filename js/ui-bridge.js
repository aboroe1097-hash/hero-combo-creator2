// js/ui-bridge.js
// Shared UI function bridge — breaks the app.js ↔ app-builder/generator import cycle
// by providing a service-locator pattern via the __ui registry in state.js.
import { __ui } from './state.js';

export function getUiFunction(name) {
  if (typeof __ui[name] === 'function') return __ui[name];
  if (typeof window !== 'undefined' && typeof window[name] === 'function') return window[name];
  return null;
}

export function callUi(name, ...args) {
  const fn = getUiFunction(name);
  if (fn) return fn(...args);
  return undefined;
}
