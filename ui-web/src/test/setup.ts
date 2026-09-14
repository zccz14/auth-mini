import '@testing-library/jest-dom/vitest';

window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
