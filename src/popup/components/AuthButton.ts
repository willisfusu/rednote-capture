/**
 * AuthButton Component
 * Google sign-in/sign-out button
 */

import type { Message, Response } from '../../types/messages';
import type { AuthState } from '../../models/auth-state';

export interface AuthButtonOptions {
  onSignInStart?: () => void;
  onSignInSuccess?: (authState: AuthState) => void;
  onSignInError?: (error: string) => void;
  onSignOutSuccess?: () => void;
}

/**
 * Create an auth button
 */
export function createAuthButton(
  container: HTMLElement,
  options: AuthButtonOptions = {}
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'auth-button-wrapper';
  wrapper.innerHTML = `
    <button id="sign-in-btn" class="btn btn-secondary">
      Sign in with Google
    </button>
  `;

  const button = wrapper.querySelector('#sign-in-btn') as HTMLButtonElement;

  button.addEventListener('click', async () => {
    await handleAuthClick(button, options);
  });

  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Handle auth button click
 */
async function handleAuthClick(
  button: HTMLButtonElement,
  options: AuthButtonOptions
): Promise<void> {
  const isSignedIn = button.dataset.signedIn === 'true';

  if (isSignedIn) {
    await handleSignOut(button, options);
  } else {
    await handleSignIn(button, options);
  }
}

/**
 * Handle sign in
 */
async function handleSignIn(
  button: HTMLButtonElement,
  options: AuthButtonOptions
): Promise<void> {
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = 'Signing in...';
    options.onSignInStart?.();

    const response = await sendMessage<AuthState>('AUTHENTICATE');

    if (response.success && response.data) {
      updateButtonState(button, true, response.data.userEmail);
      options.onSignInSuccess?.(response.data);
    } else {
      options.onSignInError?.(response.error || 'Sign in failed');
    }
  } catch (error) {
    options.onSignInError?.(
      error instanceof Error ? error.message : 'Unknown error'
    );
  } finally {
    button.disabled = false;
    if (button.dataset.signedIn !== 'true') {
      button.textContent = originalText;
    }
  }
}

/**
 * Handle sign out
 */
async function handleSignOut(
  button: HTMLButtonElement,
  options: AuthButtonOptions
): Promise<void> {
  try {
    button.disabled = true;

    const response = await sendMessage('LOGOUT');

    if (response.success) {
      updateButtonState(button, false);
      options.onSignOutSuccess?.();
    }
  } finally {
    button.disabled = false;
  }
}

/**
 * Update button state
 */
export function updateButtonState(
  button: HTMLButtonElement,
  isSignedIn: boolean,
  email?: string | null
): void {
  button.dataset.signedIn = String(isSignedIn);

  if (isSignedIn) {
    button.textContent = email ? `Sign out (${email})` : 'Sign out';
    button.classList.remove('btn-primary');
    button.classList.add('btn-secondary');
  } else {
    button.textContent = 'Sign in with Google';
    button.classList.remove('btn-secondary');
    button.classList.add('btn-primary');
  }
}

/**
 * Send message to service worker
 */
async function sendMessage<T>(action: string, payload?: unknown): Promise<Response<T>> {
  const message: Message = {
    action,
    payload,
    requestId: crypto.randomUUID(),
  };

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: Response<T>) => {
      resolve(response);
    });
  });
}
