import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_ORIGIN_KEY,
  clearStoredAuthOrigin,
  setStoredAuthOrigin,
} from './demo-storage';

describe('demo storage writes', () => {
  it('ignores setItem failures', () => {
    const storage = {
      setItem: vi.fn(() => {
        throw new Error('quota exceeded');
      }),
    };

    expect(() => {
      setStoredAuthOrigin('https://auth.example.com', storage);
    }).not.toThrow();
    expect(storage.setItem).toHaveBeenCalledWith(
      AUTH_ORIGIN_KEY,
      'https://auth.example.com',
    );
  });

  it('ignores removeItem failures', () => {
    const storage = {
      removeItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };

    expect(() => {
      clearStoredAuthOrigin(storage);
    }).not.toThrow();
    expect(storage.removeItem).toHaveBeenCalledWith(AUTH_ORIGIN_KEY);
  });
});
