import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

describe('server cors', () => {
  it('returns wildcard allow-origin headers on normal responses from arbitrary origins', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/jwks', {
        headers: { origin: 'https://app.example.com' },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('returns wildcard allow-origin headers for origins outside the stored origin policy list', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/jwks', {
        headers: { origin: 'https://admin.example.com' },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-methods')).toBeNull();
      expect(response.headers.get('access-control-allow-headers')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('does not depend on stored origin policy updates to answer with wildcard origins', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const beforeResponse = await testApp.app.request('/jwks', {
        headers: { origin: 'https://admin.example.com' },
      });

      expect(beforeResponse.status).toBe(200);
      expect(beforeResponse.headers.get('access-control-allow-origin')).toBe('*');

      testApp.db
        .prepare('INSERT INTO allowed_origins (origin) VALUES (?)')
        .run('https://admin.example.com');

      const afterResponse = await testApp.app.request('/jwks', {
        headers: { origin: 'https://admin.example.com' },
      });

      expect(afterResponse.status).toBe(200);
      expect(afterResponse.headers.get('access-control-allow-origin')).toBe('*');
      expect(afterResponse.headers.get('vary')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('handles global preflight with wildcard allow-origin headers', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/email/start', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://app.example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Authorization, Content-Type',
        },
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-methods')).toBe(
        'GET, POST, PATCH, DELETE, OPTIONS',
      );
      expect(response.headers.get('access-control-allow-headers')).toBe(
        'Authorization, Content-Type',
      );
    } finally {
      testApp.close();
    }
  });

  it('handles global preflight with wildcard headers for arbitrary origins', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/email/start', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://admin.example.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Authorization, Content-Type',
        },
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-methods')).toBe(
        'GET, POST, PATCH, DELETE, OPTIONS',
      );
      expect(response.headers.get('access-control-allow-headers')).toBe(
        'Authorization, Content-Type',
      );
    } finally {
      testApp.close();
    }
  });

  it('keeps wildcard cors headers on validation error responses', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/email/start', {
        method: 'POST',
        headers: {
          origin: 'https://app.example.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('keeps wildcard cors headers on auth error responses', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/me', {
        headers: {
          origin: 'https://app.example.com',
        },
      });

      expect(response.status).toBe(401);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('keeps normal behavior when origin header is absent', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/jwks');

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('keeps normal options behavior when origin header is absent', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/email/start', {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(404);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-methods')).toBeNull();
      expect(response.headers.get('access-control-allow-headers')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('keeps normal options behavior when access-control-request-method is absent', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/email/start', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://app.example.com',
        },
      });

      expect(response.status).toBe(404);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('vary')).toBeNull();
      expect(response.headers.get('access-control-allow-methods')).toBeNull();
      expect(response.headers.get('access-control-allow-headers')).toBeNull();
    } finally {
      testApp.close();
    }
  });
});
