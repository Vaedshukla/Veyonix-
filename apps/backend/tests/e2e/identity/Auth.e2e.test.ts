import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { createApp } from '../../../../src/app';

describe('Auth E2E', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    email: `test-${randomUUID()}@example.com`,
    password: 'Password123!@#',
    firstName: 'Test',
    lastName: 'User',
    organizationId: randomUUID(),
  };

  let accessToken: string;
  let refreshTokenCookie: string;

  it('should register a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.accessToken).toBeDefined();
  });

  it('should fail login with invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: 'WrongPassword123!',
      },
    });

    // Typically 400 or 401 based on how validation/auth handles it
    expect([400, 401, 404]).toContain(response.statusCode);
    const body = response.json();
    expect(body.success).toBe(false);
  });

  it('should login an existing user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testUser.email,
        password: testUser.password,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe(testUser.email);

    accessToken = body.data.accessToken;

    const cookies = response.headers['set-cookie'];
    if (Array.isArray(cookies)) {
      refreshTokenCookie = cookies.find(c => c.startsWith('veyonix_refresh=')) as string;
    } else if (typeof cookies === 'string') {
      refreshTokenCookie = cookies;
    }

    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toContain('veyonix_refresh=');
  });

  it('should get current user profile using access token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testUser.email);
  });

  it('should fail getting user profile without access token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should refresh token using refresh cookie', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        cookie: refreshTokenCookie,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();

    accessToken = body.data.accessToken;

    const cookies = response.headers['set-cookie'];
    if (Array.isArray(cookies)) {
      refreshTokenCookie = cookies.find(c => c.startsWith('veyonix_refresh=')) as string;
    } else if (typeof cookies === 'string') {
      refreshTokenCookie = cookies;
    }
  });

  it('should fail refresh without refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
    });

    expect(response.statusCode).toBe(401);
  });

  it('should logout user successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
        cookie: refreshTokenCookie,
      },
    });

    expect(response.statusCode).toBe(200);

    const cookies = response.headers['set-cookie'];
    let clearCookieFound = false;
    
    if (Array.isArray(cookies)) {
      clearCookieFound = cookies.some(c => c.includes('veyonix_refresh=;') || c.includes('Max-Age=0') || c.includes('expires=Thu, 01 Jan 1970'));
    } else if (typeof cookies === 'string') {
      clearCookieFound = cookies.includes('veyonix_refresh=;') || cookies.includes('Max-Age=0') || cookies.includes('expires=Thu, 01 Jan 1970');
    }

    expect(clearCookieFound).toBe(true);
  });

  it('should fail user profile access after logout (session revoked)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
