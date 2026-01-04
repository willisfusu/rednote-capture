/**
 * CaptureButton Component
 * Button to trigger post capture from current RedNote page
 */

import type { Message, Response } from '../../types/messages';
import type { CapturedPost } from '../../models/captured-post';

export interface CaptureButtonOptions {
  onCaptureStart?: () => void;
  onCaptureSuccess?: (post: CapturedPost) => void;
  onCaptureError?: (error: string) => void;
}

/**
 * Create and configure a capture button
 */
export function createCaptureButton(
  container: HTMLElement,
  options: CaptureButtonOptions = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'capture-btn';
  button.className = 'btn btn-primary';
  button.textContent = 'Capture Post';

  button.addEventListener('click', async () => {
    await handleCaptureClick(button, options);
  });

  container.appendChild(button);
  return button;
}

/**
 * Handle capture button click
 */
async function handleCaptureClick(
  button: HTMLButtonElement,
  options: CaptureButtonOptions
): Promise<void> {
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = 'Capturing...';
    options.onCaptureStart?.();

    const response = await sendMessage<CapturedPost>('CAPTURE_POST');

    if (response.success && response.data) {
      options.onCaptureSuccess?.(response.data);
    } else {
      options.onCaptureError?.(response.error || 'Failed to capture post');
    }
  } catch (error) {
    options.onCaptureError?.(
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
 * Update button state based on page context
 */
export function updateCaptureButtonState(
  button: HTMLButtonElement,
  isOnPostPage: boolean
): void {
  button.disabled = !isOnPostPage;

  if (!isOnPostPage) {
    button.title = 'Navigate to a RedNote post to capture';
  } else {
    button.title = 'Click to capture this post';
  }
}
