/**
 * Google Drive Uploader Service
 * Uploads files to Google Drive using multipart upload
 */

import type { UploadRecord } from '../models/upload-record';
import { generateUploadId } from '../models/upload-record';

const DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink';

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  /** Target folder ID in Google Drive */
  folderId?: string;

  /** Number of retry attempts */
  maxRetries?: number;

  /** Access token */
  accessToken: string;
}

/**
 * Upload a PDF to Google Drive
 */
export async function uploadToDrive(
  pdfBlob: Blob,
  filename: string,
  options: UploadOptions
): Promise<UploadResult> {
  const { accessToken, folderId, maxRetries = 3 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await performUpload(pdfBlob, filename, accessToken, folderId);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Don't retry on auth errors
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return {
          success: false,
          error: errorMessage,
        };
      }

      if (attempt === maxRetries) {
        return {
          success: false,
          error: `Upload failed after ${maxRetries} attempts: ${errorMessage}`,
        };
      }

      // Exponential backoff
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
  };
}

/**
 * Perform the actual upload
 */
async function performUpload(
  pdfBlob: Blob,
  filename: string,
  accessToken: string,
  folderId?: string
): Promise<UploadResult> {
  const boundary = '-------314159265358979323846';

  // Build metadata
  const metadata: Record<string, unknown> = {
    name: filename,
    mimeType: 'application/pdf',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Build multipart body
  const body = await buildMultipartBody(metadata, pdfBlob, boundary);

  // Make request
  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`${response.status}: ${errorMessage}`);
  }

  const data = await response.json();

  return {
    success: true,
    fileId: data.id,
    webViewLink: data.webViewLink,
    webContentLink: data.webContentLink,
  };
}

/**
 * Build multipart request body
 */
async function buildMultipartBody(
  metadata: Record<string, unknown>,
  fileBlob: Blob,
  boundary: string
): Promise<Blob> {
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataString = JSON.stringify(metadata);

  const parts: BlobPart[] = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataString,
    delimiter,
    'Content-Type: application/pdf\r\n\r\n',
    fileBlob,
    closeDelimiter,
  ];

  return new Blob(parts);
}

/**
 * Create an upload record
 */
export function createUploadRecord(
  capturedPostId: string,
  filename: string
): UploadRecord {
  return {
    id: generateUploadId(),
    capturedPostId,
    driveFileId: null,
    driveWebViewLink: null,
    status: 'pending',
    startedAt: Date.now(),
    completedAt: null,
    errorMessage: null,
    retryCount: 0,
    filename,
  };
}

/**
 * Update upload record with result
 */
export function updateUploadRecord(
  record: UploadRecord,
  result: UploadResult
): UploadRecord {
  if (result.success) {
    return {
      ...record,
      status: 'success',
      driveFileId: result.fileId || null,
      driveWebViewLink: result.webViewLink || null,
      completedAt: Date.now(),
      errorMessage: null,
    };
  }

  return {
    ...record,
    status: 'failed',
    errorMessage: result.error || 'Unknown error',
    completedAt: Date.now(),
    retryCount: record.retryCount + 1,
  };
}

/**
 * Save upload record to history
 */
export async function saveUploadToHistory(record: UploadRecord): Promise<void> {
  const { uploadHistory = [] } = await chrome.storage.local.get('uploadHistory');

  // Add new record and limit to 100 entries
  const updatedHistory = [...uploadHistory, record].slice(-100);

  await chrome.storage.local.set({ uploadHistory: updatedHistory });
}

/**
 * Get upload history
 */
export async function getUploadHistory(): Promise<UploadRecord[]> {
  const { uploadHistory = [] } = await chrome.storage.local.get('uploadHistory');
  return uploadHistory;
}

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
