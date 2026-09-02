import '@testing-library/jest-dom/vitest';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}
