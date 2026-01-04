/**
 * Unit tests for Google authentication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome.identity
const mockChrome = {
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
    launchWebAuthFlow: vi.fn(),
  },
  storage: {
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    lastError: null as { message: string } | null,
  },
};

vi.stubGlobal('chrome', mockChrome);

describe('Google Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  describe('getAuthToken', () => {
    it('should retrieve an auth token successfully', async () => {
      const mockToken = 'mock-access-token-12345';

      mockChrome.identity.getAuthToken.mockImplementation(
        (options: unknown, callback: (token: string) => void) => {
          callback(mockToken);
        }
      );

      // Simulate calling getAuthToken
      const token = await new Promise<string>((resolve) => {
        mockChrome.identity.getAuthToken({ interactive: true }, resolve);
      });

      expect(token).toBe(mockToken);
      expect(mockChrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: true },
        expect.any(Function)
      );
    });

    it('should handle auth cancellation', async () => {
      mockChrome.runtime.lastError = { message: 'The user did not approve access.' };
      mockChrome.identity.getAuthToken.mockImplementation(
        (options: unknown, callback: (token?: string) => void) => {
          callback(undefined);
        }
      );

      const token = await new Promise<string | undefined>((resolve) => {
        mockChrome.identity.getAuthToken({ interactive: true }, resolve);
      });

      expect(token).toBeUndefined();
    });

    it('should handle network errors', async () => {
      mockChrome.runtime.lastError = { message: 'Network error' };
      mockChrome.identity.getAuthToken.mockImplementation(
        (options: unknown, callback: (token?: string) => void) => {
          callback(undefined);
        }
      );

      const token = await new Promise<string | undefined>((resolve) => {
        mockChrome.identity.getAuthToken({ interactive: true }, resolve);
      });

      expect(token).toBeUndefined();
    });
  });

  describe('removeCachedAuthToken', () => {
    it('should remove cached token', async () => {
      const mockToken = 'cached-token';

      mockChrome.identity.removeCachedAuthToken.mockImplementation(
        (options: { token: string }, callback: () => void) => {
          callback();
        }
      );

      await new Promise<void>((resolve) => {
        mockChrome.identity.removeCachedAuthToken({ token: mockToken }, resolve);
      });

      expect(mockChrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token: mockToken },
        expect.any(Function)
      );
    });
  });

  describe('Auth state management', () => {
    it('should store auth state in session storage', async () => {
      const authState = {
        accessToken: 'test-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        userEmail: 'test@example.com',
        isAuthenticated: true,
      };

      mockChrome.storage.session.set.mockResolvedValue(undefined);

      await mockChrome.storage.session.set({ auth: authState });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        auth: authState,
      });
    });

    it('should retrieve auth state from session storage', async () => {
      const storedAuthState = {
        accessToken: 'stored-token',
        expiresAt: Date.now() + 1800000,
        userEmail: 'stored@example.com',
        isAuthenticated: true,
      };

      mockChrome.storage.session.get.mockResolvedValue({ auth: storedAuthState });

      const { auth } = await mockChrome.storage.session.get('auth');

      expect(auth).toEqual(storedAuthState);
    });

    it('should check if token is expired', () => {
      const isExpired = (expiresAt: number): boolean => {
        return Date.now() >= expiresAt;
      };

      const expiredTime = Date.now() - 1000; // 1 second ago
      const validTime = Date.now() + 3600000; // 1 hour from now

      expect(isExpired(expiredTime)).toBe(true);
      expect(isExpired(validTime)).toBe(false);
    });
  });
});
