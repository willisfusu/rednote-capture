/**
 * Google Auth Service
 * Handles OAuth authentication using chrome.identity
 */

import type { AuthState } from '../models/auth-state';
import { DEFAULT_AUTH_STATE } from '../models/auth-state';

// Token expiration buffer (5 minutes before actual expiry)
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

/**
 * Get a valid access token, prompting for auth if needed
 */
export async function getAccessToken(interactive = true): Promise<string> {
  // Check for existing valid token
  const authState = await getAuthState();

  if (authState.isAuthenticated && authState.accessToken && !isTokenExpired(authState)) {
    return authState.accessToken;
  }

  // Get new token
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, async (token) => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError.message || 'Authentication failed';

        if (error.includes('not approve') || error.includes('cancel')) {
          reject(new Error('AUTH_CANCELLED'));
        } else {
          reject(new Error(error));
        }
        return;
      }

      if (!token) {
        reject(new Error('No token received'));
        return;
      }

      // Store the new auth state
      const newAuthState: AuthState = {
        accessToken: token,
        expiresAt: Date.now() + 3600000, // Tokens typically last 1 hour
        userEmail: null, // Will be fetched separately if needed
        isAuthenticated: true,
      };

      await saveAuthState(newAuthState);
      resolve(token);
    });
  });
}

/**
 * Sign in interactively
 */
export async function signIn(): Promise<AuthState> {
  const token = await getAccessToken(true);

  // Optionally fetch user email
  let email: string | null = null;
  try {
    email = await fetchUserEmail(token);
  } catch (error) {
    console.warn('[GoogleAuth] Could not fetch user email:', error);
  }

  const authState: AuthState = {
    accessToken: token,
    expiresAt: Date.now() + 3600000,
    userEmail: email,
    isAuthenticated: true,
  };

  await saveAuthState(authState);
  return authState;
}

/**
 * Sign out and revoke token
 */
export async function signOut(): Promise<void> {
  const authState = await getAuthState();

  if (authState.accessToken) {
    await removeCachedToken(authState.accessToken);
  }

  await saveAuthState(DEFAULT_AUTH_STATE);
}

/**
 * Get current auth state from session storage
 */
export async function getAuthState(): Promise<AuthState> {
  const { auth } = await chrome.storage.session.get('auth');
  return auth || DEFAULT_AUTH_STATE;
}

/**
 * Save auth state to session storage
 */
export async function saveAuthState(authState: AuthState): Promise<void> {
  await chrome.storage.session.set({ auth: authState });
}

/**
 * Check if the current token is expired
 */
export function isTokenExpired(authState: AuthState): boolean {
  if (!authState.expiresAt) {
    return true;
  }
  return Date.now() >= authState.expiresAt - EXPIRATION_BUFFER_MS;
}

/**
 * Remove a cached token
 */
async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
}

/**
 * Fetch the user's email from Google userinfo endpoint
 */
async function fetchUserEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.email || null;
  } catch {
    return null;
  }
}

/**
 * Refresh the access token if expired
 */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  const authState = await getAuthState();

  if (!authState.isAuthenticated) {
    return null;
  }

  if (isTokenExpired(authState)) {
    try {
      // Remove the old token and get a new one
      if (authState.accessToken) {
        await removeCachedToken(authState.accessToken);
      }
      return await getAccessToken(false); // Try silent refresh first
    } catch {
      // Silent refresh failed, need interactive auth
      return null;
    }
  }

  return authState.accessToken;
}
