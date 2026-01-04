/**
 * UploadButton Component
 * Button to upload PDF to Google Drive
 */

import type { Message, Response } from '../../types/messages';
import type { UploadRecord } from '../../models/upload-record';

export interface UploadButtonOptions {
  onUploadStart?: () => void;
  onUploadSuccess?: (result: { uploadRecord: UploadRecord; webViewLink: string }) => void;
  onUploadError?: (error: string) => void;
  onAuthRequired?: () => void;
}

/**
 * Create an upload button
 */
export function createUploadButton(
  container: HTMLElement,
  options: UploadButtonOptions = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'upload-btn';
  button.className = 'btn btn-primary';
  button.textContent = 'Upload to Drive';

  button.addEventListener('click', async () => {
    await handleUploadClick(button, options);
  });

  container.appendChild(button);
  return button;
}

/**
 * Handle upload button click
 */
async function handleUploadClick(
  button: HTMLButtonElement,
  options: UploadButtonOptions
): Promise<void> {
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = 'Uploading...';
    options.onUploadStart?.();

    const response = await sendMessage<{
      uploadRecord: UploadRecord;
      webViewLink: string;
    }>('UPLOAD_TO_DRIVE');

    if (response.success && response.data) {
      options.onUploadSuccess?.(response.data);
    } else {
      // Check if auth is required
      if (response.errorCode === 'NOT_AUTHENTICATED') {
        options.onAuthRequired?.();
      } else {
        options.onUploadError?.(response.error || 'Upload failed');
      }
    }
  } catch (error) {
    options.onUploadError?.(
      error instanceof Error ? error.message : 'Unknown error'
    );
  } finally {
    button.disabled = false;
    button.textContent = originalText;
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

/**
 * Update upload button state
 */
export function updateUploadButtonState(
  button: HTMLButtonElement,
  hasPdf: boolean,
  isAuthenticated: boolean
): void {
  button.disabled = !hasPdf;

  if (!hasPdf) {
    button.title = 'Generate a PDF first';
  } else if (!isAuthenticated) {
    button.title = 'Sign in to upload';
  } else {
    button.title = 'Upload PDF to Google Drive';
  }
}
