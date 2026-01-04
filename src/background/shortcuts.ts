/**
 * Keyboard Shortcuts Handler
 * Handles chrome.commands for keyboard shortcuts
 */

import { handleCapturePost } from './handlers/capture-post';
import { handleGeneratePdf } from './handlers/generate-pdf';
import { handleUploadToDrive } from './handlers/upload';
import type { CapturedPost } from '../models/captured-post';
import type { GeneratedPdf } from '../models/generated-pdf';

/**
 * Initialize keyboard shortcut listeners
 * Must be called from service worker on startup
 */
export function initializeShortcuts(): void {
  chrome.commands.onCommand.addListener(handleCommand);

}

/**
 * Handle keyboard command
 */
async function handleCommand(command: string, tab?: chrome.tabs.Tab): Promise<void> {


  if (!tab?.id) {
    console.warn('[Shortcuts] No active tab');
    return;
  }

  try {
    switch (command) {
      case 'capture-post':
        await handleCaptureCommand(tab.id);
        break;
      case 'generate-pdf':
        await handleGeneratePdfCommand();
        break;
      case 'upload-to-drive':
        await handleUploadCommand();
        break;
      default:

    }
  } catch (error) {
    console.error(`[Shortcuts] Error handling command ${command}:`, error);
    showNotification(
      'Command Failed',
      error instanceof Error ? error.message : 'An error occurred'
    );
  }
}

/**
 * Handle capture-post shortcut (Alt+C)
 */
async function handleCaptureCommand(tabId: number): Promise<void> {
  const response = await handleCapturePost({ tabId }, crypto.randomUUID());

  if (response.success) {
    showNotification('Post Captured', 'Post captured successfully. Press Alt+P to generate PDF.');
  } else {
    showNotification('Capture Failed', response.error || 'Failed to capture post');
  }
}

/**
 * Handle generate-pdf shortcut (Alt+P)
 */
async function handleGeneratePdfCommand(): Promise<void> {
  // Get current capture from storage
  const { currentCapture } = await chrome.storage.session.get('currentCapture');

  if (!currentCapture) {
    showNotification('No Capture', 'Capture a post first with Alt+C');
    return;
  }

  const capturedPost = currentCapture as CapturedPost;
  const response = await handleGeneratePdf(
    { capturedPostId: capturedPost.id },
    crypto.randomUUID()
  );

  if (response.success) {
    showNotification('PDF Generated', 'PDF ready. Press Alt+U to upload to Drive.');
  } else {
    showNotification('PDF Generation Failed', response.error || 'Failed to generate PDF');
  }
}

/**
 * Handle upload-to-drive shortcut (Alt+U)
 */
async function handleUploadCommand(): Promise<void> {
  // Get current PDF from storage
  const { currentPdf } = await chrome.storage.session.get('currentPdf');

  if (!currentPdf) {
    showNotification('No PDF', 'Generate a PDF first with Alt+P');
    return;
  }

  const pdf = currentPdf as GeneratedPdf;
  const response = await handleUploadToDrive(
    { capturedPostId: pdf.capturedPostId },
    crypto.randomUUID()
  );

  if (response.success) {
    const data = response.data as { webViewLink?: string };
    showNotification(
      'Upload Complete',
      'PDF uploaded to Google Drive successfully!'
    );

    // Open Drive link if available
    if (data?.webViewLink) {
      await chrome.tabs.create({ url: data.webViewLink });
    }
  } else {
    showNotification('Upload Failed', response.error || 'Failed to upload to Drive');
  }
}

/**
 * Show a notification to the user
 */
function showNotification(title: string, message: string): void {
  // Store notification for popup to display
  void chrome.storage.session.set({
    lastNotification: {
      title,
      message,
      timestamp: Date.now(),
    },
  });

  // Log for debugging

}

/**
 * Get all registered shortcuts
 */
export async function getShortcuts(): Promise<chrome.commands.Command[]> {
  return new Promise((resolve) => {
    chrome.commands.getAll((commands) => {
      resolve(commands);
    });
  });
}
