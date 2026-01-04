/**
 * PdfActions Component
 * Buttons for PDF generation and download
 */

import type { Message, Response } from '../../types/messages';
import type { GeneratedPdf } from '../../models/generated-pdf';

export interface PdfActionsOptions {
  onGenerateStart?: () => void;
  onGenerateSuccess?: (pdf: GeneratedPdf) => void;
  onGenerateError?: (error: string) => void;
  onDownloadStart?: () => void;
  onDownloadError?: (error: string) => void;
}

/**
 * Create PDF action buttons
 */
export function createPdfActions(
  container: HTMLElement,
  capturedPostId: string,
  options: PdfActionsOptions = {}
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'pdf-actions';
  wrapper.innerHTML = `
    <button id="generate-pdf-btn" class="btn btn-primary">Generate PDF</button>
    <button id="download-pdf-btn" class="btn btn-secondary" disabled>Download</button>
  `;

  const generateBtn = wrapper.querySelector('#generate-pdf-btn') as HTMLButtonElement;
  const downloadBtn = wrapper.querySelector('#download-pdf-btn') as HTMLButtonElement;

  generateBtn.addEventListener('click', async () => {
    await handleGenerateClick(generateBtn, downloadBtn, capturedPostId, options);
  });

  downloadBtn.addEventListener('click', async () => {
    await handleDownloadClick(downloadBtn, options);
  });

  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Handle generate PDF click
 */
async function handleGenerateClick(
  generateBtn: HTMLButtonElement,
  downloadBtn: HTMLButtonElement,
  capturedPostId: string,
  options: PdfActionsOptions
): Promise<void> {
  const originalText = generateBtn.textContent;

  try {
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    options.onGenerateStart?.();

    const response = await sendMessage<GeneratedPdf>('GENERATE_PDF', {
      capturedPostId,
    });

    if (response.success && response.data) {
      downloadBtn.disabled = false;
      options.onGenerateSuccess?.(response.data);
    } else {
      options.onGenerateError?.(response.error || 'Failed to generate PDF');
    }
  } catch (error) {
    options.onGenerateError?.(
      error instanceof Error ? error.message : 'Unknown error'
    );
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = originalText;
  }
}

/**
 * Handle download PDF click
 */
async function handleDownloadClick(
  downloadBtn: HTMLButtonElement,
  options: PdfActionsOptions
): Promise<void> {
  try {
    downloadBtn.disabled = true;
    options.onDownloadStart?.();

    const response = await sendMessage<{ downloadId: number }>('DOWNLOAD_PDF');

    if (!response.success) {
      options.onDownloadError?.(response.error || 'Failed to download PDF');
    }
  } catch (error) {
    options.onDownloadError?.(
      error instanceof Error ? error.message : 'Unknown error'
    );
  } finally {
    downloadBtn.disabled = false;
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
 * Update PDF actions state
 */
export function updatePdfActionsState(
  container: HTMLElement,
  hasPdf: boolean
): void {
  const downloadBtn = container.querySelector('#download-pdf-btn') as HTMLButtonElement;
  if (downloadBtn) {
    downloadBtn.disabled = !hasPdf;
  }
}
