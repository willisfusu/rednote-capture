/**
 * DOWNLOAD_PDF message handler
 * Triggers download of the generated PDF
 */

import type { Response } from '../../types/messages';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { getCachedPdf } from './generate-pdf';

export interface DownloadPdfResponse {
  downloadId: number;
  filename: string;
}

/**
 * Handle DOWNLOAD_PDF message
 */
export async function handleDownloadPdf(
  _payload: unknown,
  requestId?: string
): Promise<Response<DownloadPdfResponse>> {
  try {
    // Get PDF from in-memory cache
    const generatedPdf = getCachedPdf();

    if (!generatedPdf) {
      return createErrorResponse(
        ErrorCode.NO_PDF,
        'No PDF available. Please generate a PDF first.',
        requestId
      );
    }

    // Create data URL from base64 (service workers can't use blob URLs)
    const dataUrl = `data:application/pdf;base64,${generatedPdf.pdfBase64}`;

    // Trigger download
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: generatedPdf.filename,
      saveAs: true,
    });

    console.log('[DownloadPdf] Download started:', downloadId);

    return {
      success: true,
      data: {
        downloadId,
        filename: generatedPdf.filename,
      },
      requestId,
    };
  } catch (error) {
    console.error('[DownloadPdf] Error:', error);
    return createErrorResponse(
      ErrorCode.DOWNLOAD_ERROR,
      error instanceof Error ? error.message : 'Failed to download PDF',
      requestId
    );
  }
}
