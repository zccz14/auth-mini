import type { ReactElement } from 'react';
import { HashRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const appRouterSpy = vi.fn(() => null);

type WithChildren = {
  children: ReactElement;
};

const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy }));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: createRootSpy,
  },
}));

vi.mock('./app/router', () => ({
  AppRouter: appRouterSpy,
}));

describe('demo bootstrap', () => {
  beforeEach(() => {
    renderSpy.mockReset();
    createRootSpy.mockClear();
    appRouterSpy.mockClear();
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('wraps the app in HashRouter', async () => {
    await import('./main');

    expect(createRootSpy).toHaveBeenCalledWith(document.getElementById('root'));

    const tree = renderSpy.mock.calls[0]?.[0] as ReactElement<WithChildren>;
    const strictModeChild = tree.props.children as ReactElement<WithChildren>;

    expect(strictModeChild.type).toBe(HashRouter);
    expect(strictModeChild.props.children.type).toBe(appRouterSpy);
  });
});
