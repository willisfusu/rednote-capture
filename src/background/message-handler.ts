/**
 * Message Handler - Dispatches incoming messages to appropriate handlers
 */



import type { Message, Response } from '../types/messages';
import { ErrorCode, createErrorResponse } from '../types/errors';
import { handleCapturePost } from './handlers/capture-post';
import { handleCheckPage } from './handlers/check-page';
import { handleCheckProfile } from './handlers/check-profile';
import { handleGeneratePdf } from './handlers/generate-pdf';
import { handleDownloadPdf } from './handlers/download-pdf';
import { handleSignIn, handleSignOut, handleGetAuthState } from './handlers/auth';
import { handleUploadToDrive } from './handlers/upload';
import { handleGetUploadHistory } from './handlers/history';
import {
  handleAddToQueue,
  handleProcessQueue,
  handleGetQueueStatus,
  handleRemoveFromQueue,
  handleClearQueue,
  handleClearCompletedItems,
  handleRetryFailedItems,
  handleCancelProcessing,
} from './handlers/queue';
import {
  handleGetSettings,
  handleUpdateSettings,
  handleResetSettings,
} from './handlers/settings';

/**
 * Handle incoming messages and route to appropriate handler
 */
export async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<Response> {
  const { action, payload, requestId } = message;



  try {
    switch (action) {
      case 'CHECK_PAGE':
        return await handleCheckPage(requestId);

      case 'CHECK_PROFILE':
        // adaptable call since check-profile was written to take (message, sender)
        return await handleCheckProfile(message, sender);

      case 'CAPTURE_POST':
        return await handleCapturePost(payload, requestId);

      case 'GENERATE_PDF':
        return await handleGeneratePdf(payload, requestId);

      case 'DOWNLOAD_PDF':
        return await handleDownloadPdf(payload, requestId);

      case 'UPLOAD_TO_DRIVE':
        return await handleUploadToDrive(payload, requestId);

      case 'GET_AUTH_STATUS':
        return await handleGetAuthState(requestId);

      case 'AUTHENTICATE':
        return await handleSignIn(requestId);

      case 'LOGOUT':
        return await handleSignOut(requestId);

      case 'GET_SETTINGS':
        return await handleGetSettings(requestId);

      case 'UPDATE_SETTINGS':
        return await handleUpdateSettings(payload, requestId);

      case 'RESET_SETTINGS':
        return await handleResetSettings(requestId);

      case 'GET_UPLOAD_HISTORY':
        return await handleGetUploadHistory(requestId);

      case 'CLEAR_CURRENT_CAPTURE':
        return await handleClearCurrentCapture(requestId);

      case 'ADD_TO_QUEUE':
        return await handleAddToQueue(payload, requestId);

      case 'REMOVE_FROM_QUEUE':
        return await handleRemoveFromQueue(payload, requestId);

      case 'PROCESS_QUEUE':
        return await handleProcessQueue(payload, requestId);

      case 'CANCEL_PROCESSING':
        return await handleCancelProcessing(requestId);

      case 'GET_QUEUE_STATUS':
        return await handleGetQueueStatus(requestId);

      case 'CLEAR_QUEUE':
        return await handleClearQueue(requestId);

      case 'CLEAR_COMPLETED_ITEMS':
        return await handleClearCompletedItems(requestId);

      case 'RETRY_FAILED_ITEMS':
        return await handleRetryFailedItems(requestId);

      default:
        return createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Unknown action: ${action}`,
          requestId
        );
    }
  } catch (error) {
    console.error(`[MessageHandler] Error handling ${action}:`, error);
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Unknown error',
      requestId
    );
  }
}

async function handleClearCurrentCapture(requestId?: string): Promise<Response> {
  await chrome.storage.session.set({
    currentCapture: null,
    currentPdf: null,
  });
  return { success: true, requestId };
}
