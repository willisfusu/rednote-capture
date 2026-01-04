/**
 * UPLOAD_TO_DRIVE message handler
 * Uploads the generated PDF to Google Drive
 */

import type { Response } from '../../types/messages';
import type { UploadRecord } from '../../models/upload-record';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { getAccessToken, getAuthState, isTokenExpired } from '../../services/google-auth';
import {
  uploadToDrive,
  createUploadRecord,
  updateUploadRecord,
  saveUploadToHistory,
} from '../../services/drive-uploader';
import { base64ToUint8Array } from '../../services/pdf-generator';
import { getCachedPdf } from './generate-pdf';

export interface UploadResponse {
  uploadRecord: UploadRecord;
  webViewLink: string;
}

/**
 * Handle UPLOAD_TO_DRIVE message
 */
export async function handleUploadToDrive(
  payload: unknown,
  requestId?: string
): Promise<Response<UploadResponse>> {
  try {
    // Get PDF from in-memory cache
    const generatedPdf = getCachedPdf();
    const { currentCapture } = await chrome.storage.session.get(['currentCapture']);

    if (!generatedPdf) {
      return createErrorResponse(
        ErrorCode.NO_PDF,
        'No PDF available. Please generate a PDF first.',
        requestId
      );
    }

    // Validate capturedPostId if provided
    const typedPayload = payload as { capturedPostId?: string } | undefined;
    if (typedPayload?.capturedPostId && typedPayload.capturedPostId !== generatedPdf.capturedPostId) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'PDF does not match the specified capture',
        requestId
      );
    }

    // Check authentication
    let authState = await getAuthState();

    if (!authState.isAuthenticated || isTokenExpired(authState)) {
      // Try to get a fresh token
      try {
        await getAccessToken(true);
        authState = await getAuthState();
      } catch (error) {
        return createErrorResponse(
          ErrorCode.NOT_AUTHENTICATED,
          'Please sign in to upload to Google Drive',
          requestId
        );
      }
    }

    if (!authState.accessToken) {
      return createErrorResponse(
        ErrorCode.NOT_AUTHENTICATED,
        'No valid access token',
        requestId
      );
    }

    // Update capture status
    if (currentCapture) {
      await chrome.storage.session.set({
        currentCapture: {
          ...currentCapture,
          status: 'uploading',
        },
      });
    }

    // Create upload record
    let uploadRecord = createUploadRecord(generatedPdf.capturedPostId, generatedPdf.filename);



    // Convert base64 to blob
    const pdfBytes = base64ToUint8Array(generatedPdf.pdfBase64);
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    // Get user settings for folder
    const { settings } = await chrome.storage.local.get('settings');
    const folderId = settings?.defaultDriveFolderId;

    // Upload to Drive
    const result = await uploadToDrive(pdfBlob, generatedPdf.filename, {
      accessToken: authState.accessToken,
      folderId,
    });

    // Update upload record
    uploadRecord = updateUploadRecord(uploadRecord, result);

    // Save to history
    await saveUploadToHistory(uploadRecord);

    // Update capture status
    if (currentCapture) {
      await chrome.storage.session.set({
        currentCapture: {
          ...currentCapture,
          status: result.success ? 'uploaded' : 'error',
        },
      });
    }

    if (!result.success) {
      return createErrorResponse(
        ErrorCode.UPLOAD_FAILED,
        result.error || 'Upload failed',
        requestId
      );
    }



    return {
      success: true,
      data: {
        uploadRecord,
        webViewLink: result.webViewLink || '',
      },
      requestId,
    };
  } catch (error) {
    console.error('[Upload] Error:', error);

    return createErrorResponse(
      ErrorCode.UPLOAD_FAILED,
      error instanceof Error ? error.message : 'Upload failed',
      requestId
    );
  }
}
