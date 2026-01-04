/**
 * Auth message handlers
 * Handles SIGN_IN, SIGN_OUT, GET_AUTH_STATE messages
 */

import type { Response } from '../../types/messages';
import type { AuthState } from '../../models/auth-state';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { signIn, signOut, getAuthState } from '../../services/google-auth';

/**
 * Handle SIGN_IN (AUTHENTICATE) message
 */
export async function handleSignIn(requestId?: string): Promise<Response<AuthState>> {
  try {

    const authState = await signIn();



    return {
      success: true,
      data: authState,
      requestId,
    };
  } catch (error) {
    console.error('[Auth] Sign in error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    if (errorMessage === 'AUTH_CANCELLED') {
      return createErrorResponse(
        ErrorCode.AUTH_CANCELLED,
        'Authentication was cancelled by user',
        requestId
      );
    }

    return createErrorResponse(
      ErrorCode.AUTH_FAILED,
      errorMessage,
      requestId
    );
  }
}

/**
 * Handle SIGN_OUT (LOGOUT) message
 */
export async function handleSignOut(requestId?: string): Promise<Response<void>> {
  try {

    await signOut();



    return {
      success: true,
      requestId,
    };
  } catch (error) {
    console.error('[Auth] Sign out error:', error);

    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Sign out failed',
      requestId
    );
  }
}

/**
 * Handle GET_AUTH_STATE (GET_AUTH_STATUS) message
 */
export async function handleGetAuthState(requestId?: string): Promise<Response<AuthState>> {
  try {
    const authState = await getAuthState();

    return {
      success: true,
      data: authState,
      requestId,
    };
  } catch (error) {
    console.error('[Auth] Get auth state error:', error);

    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to get auth state',
      requestId
    );
  }
}
