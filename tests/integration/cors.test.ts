import { describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/app.js';

describe('server cors', () => {
  it('returns allow-origin and vary headers for allowed origins on normal responses', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/jwks', {
        headers: { origin: 'https://app.example.com' },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.example.com',
      );
      expect(response.headers.get('vary')).toBe('Origin');
    } finally {
      testApp.close();
    }
  });

  it('omits allow headers for disallowed origins on normal responses', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const response = await testApp.app.request('/jwks', {
        headers: { origin: 'https://admin.example.com' },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(response.headers.get('vary')).toBe('Origin');
      expect(response.headers.get('access-control-allow-methods')).toBeNull();
      expect(response.headers.get('access-control-allow-headers')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('applies newly added allowed origins without restarting the server', async () => {
    const testApp = await createTestApp({
      origins: ['https://app.example.com'],
    });

    try {
      const beforeResponse = await testApp.app.request('/jwks', {
        headers: { origin: 'https://admin.example.com' },
      });

      expect(beforeResponse.status).toBe(200);
      expect(
        beforeResponse.headers.get('access-control-allow-origin'),
      ).toBeNull();

      testApp.db
        .prepare('INSERT INTO allowed_origins (origin) VALUES (?)')
        .run('https://admin.example.com');

      const afterResponse = await testApp.app.request('/jwks', {
        headers: { origin: 'https://admin.example.com' },
      });

      expect(afterResponse.status).toBe(200);
      expect(afterResponse.headers.get('access-control-allow-origin')).toBe(
        'https://admin.example.com',
      );
      expect(afterResponse.headers.get('vary')).toBe('Origin');
    } finally {
      testApp.close();
    }
  });

  it('handles global preflight for allowed origins', async () => {
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
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.example.com',
      );
      expect(response.headers.get('vary')).toBe('Origin');
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

  it('omits allow headers for disallowed-origin preflight requests', async () => {
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
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
      expect(response.headers.get('vary')).toBe('Origin');
      expect(response.headers.get('access-control-allow-methods')).toBeNull();
      expect(response.headers.get('access-control-allow-headers')).toBeNull();
    } finally {
      testApp.close();
    }
  });

  it('keeps cors headers on error responses for allowed origins', async () => {
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
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.example.com',
      );
      expect(response.headers.get('vary')).toBe('Origin');
    } finally {
      testApp.close();
    }
  });

  it('keeps cors headers on auth error responses for allowed origins', async () => {
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
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.example.com',
      );
      expect(response.headers.get('vary')).toBe('Origin');
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
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'https://app.example.com',
      );
      expect(response.headers.get('vary')).toBe('Origin');
      expect(response.headers.get('access-control-allow-methods')).toBeNull();
      expect(response.headers.get('access-control-allow-headers')).toBeNull();
    } finally {
      testApp.close();
    }
  });
});
