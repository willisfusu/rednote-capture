/**
 * OAuth authentication state (stored in session storage)
 */
export interface AuthState {
  /** Google OAuth access token */
  accessToken: string | null;

  /** Token expiration timestamp (ms) */
  expiresAt: number | null;

  /** User's Google email */
  userEmail: string | null;

  /** Whether user is authenticated */
  isAuthenticated: boolean;
}

/**
 * Default auth state for unauthenticated users
 */
export const DEFAULT_AUTH_STATE: AuthState = {
  accessToken: null,
  expiresAt: null,
  userEmail: null,
  isAuthenticated: false,
};
