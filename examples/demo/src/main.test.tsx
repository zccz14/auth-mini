import type { ReactElement } from 'react';
import { HashRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('demo bootstrap', () => {
  beforeEach(() => {
    renderSpy.mockReset();
    createRootSpy.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('wraps the app in HashRouter', async () => {
    await import('./main');

    expect(createRootSpy).toHaveBeenCalledWith(document.getElementById('root'));

    const tree = renderSpy.mock.calls[0]?.[0] as ReactElement<WithChildren>;
    const strictModeChild = tree.props.children;

    expect(strictModeChild.type).toBe(HashRouter);
  });
});
