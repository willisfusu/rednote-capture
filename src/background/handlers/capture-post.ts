/**
 * CAPTURE_POST message handler
 * Orchestrates the capture workflow: extract → store → return
 */

import type { Response } from '../../types/messages';
import type { CapturedPost } from '../../models/captured-post';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { handleExtractPost } from './extract-post';

/**
 * Handle CAPTURE_POST message
 * Extracts post content and stores it in session storage
 */
export async function handleCapturePost(
  payload: unknown,
  requestId?: string
): Promise<Response<CapturedPost>> {
  try {
    // Step 1: Extract post content from page
    const extractResponse = await handleExtractPost(payload, requestId);

    if (!extractResponse.success || !extractResponse.data) {
      return extractResponse;
    }

    const capturedPost = extractResponse.data;

    // Step 2: Store in session storage
    await chrome.storage.session.set({
      currentCapture: capturedPost,
      // Clear any previous PDF when capturing new post
      currentPdf: null,
    });

    console.log('[CapturePost] Post captured and stored:', capturedPost.id);

    return {
      success: true,
      data: capturedPost,
      requestId,
    };
  } catch (error) {
    console.error('[CapturePost] Error:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to capture post',
      requestId
    );
  }
}

/**
 * Get the currently captured post from session storage
 */
export async function getCurrentCapture(): Promise<CapturedPost | null> {
  const { currentCapture } = await chrome.storage.session.get('currentCapture');
  return currentCapture || null;
}

/**
 * Clear the current capture from session storage
 */
export async function clearCurrentCapture(): Promise<void> {
  await chrome.storage.session.set({
    currentCapture: null,
    currentPdf: null,
  });
}
