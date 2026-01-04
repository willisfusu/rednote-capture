/**
 * CHECK_PAGE message handler
 * Checks if the current tab is on a RedNote post page
 */

import type { Response } from '../../types/messages';
import { isRedNoteUrl, isRedNotePostUrl } from '../../content/url-patterns';
import { ErrorCode, createErrorResponse } from '../../types/errors';

export interface CheckPageResponse {
  isRedNote: boolean;
  isPostPage: boolean;
  url: string;
}

/**
 * Handle CHECK_PAGE message
 * Returns information about the current tab's URL
 */
export async function handleCheckPage(requestId?: string): Promise<Response<CheckPageResponse>> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url) {
      return createErrorResponse(
        ErrorCode.TAB_NOT_FOUND,
        'No active tab found',
        requestId
      );
    }

    const url = tab.url;
    const isRedNote = isRedNoteUrl(url);
    const isPostPage = isRedNotePostUrl(url);

    return {
      success: true,
      data: {
        isRedNote,
        isPostPage,
        url,
      },
      requestId,
    };
  } catch (error) {
    console.error('[CheckPage] Error:', error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to check page',
      requestId
    );
  }
}
