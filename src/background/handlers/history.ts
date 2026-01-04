/**
 * History message handler
 * Handles GET_UPLOAD_HISTORY message
 */

import type { Response } from '../../types/messages';
import type { UploadRecord } from '../../models/upload-record';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { getUploadHistory } from '../../services/drive-uploader';

/**
 * Handle GET_UPLOAD_HISTORY message
 */
export async function handleGetUploadHistory(
  requestId?: string
): Promise<Response<UploadRecord[]>> {
  try {
    const history = await getUploadHistory();

    // Return in reverse chronological order
    const sortedHistory = [...history].reverse();

    return {
      success: true,
      data: sortedHistory,
      requestId,
    };
  } catch (error) {
    console.error('[History] Error getting upload history:', error);

    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Failed to get upload history',
      requestId
    );
  }
}
