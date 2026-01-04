/**
 * GENERATE_PDF message handler
 * Generates a PDF from the currently captured post
 */

console.log('[GeneratePdf] Module loading...');

import type { Response } from '../../types/messages';
import type { GeneratedPdf } from '../../models/generated-pdf';
import type { CapturedPost } from '../../models/captured-post';
import { ErrorCode, createErrorResponse } from '../../types/errors';

console.log('[GeneratePdf] About to import pdf-generator...');
import { generatePdf } from '../../services/pdf-generator';
console.log('[GeneratePdf] pdf-generator imported successfully');

// In-memory cache for PDF data (session storage has quota limits)
let cachedPdf: GeneratedPdf | null = null;

/**
 * Get cached PDF data (for upload handler)
 */
export function getCachedPdf(): GeneratedPdf | null {
  return cachedPdf;
}

/**
 * Clear cached PDF
 */
export function clearCachedPdf(): void {
  cachedPdf = null;
}

/**
 * Handle GENERATE_PDF message
 */
export async function handleGeneratePdf(
  payload: unknown,
  requestId?: string
): Promise<Response<GeneratedPdf>> {
  try {
    // Get current capture from session storage
    const { currentCapture } = await chrome.storage.session.get(['currentCapture']);

    // Check if there's already a cached PDF for this capture
    const typedPayload = payload as { capturedPostId?: string; forceRegenerate?: boolean } | undefined;

    if (
      cachedPdf &&
      cachedPdf.capturedPostId === typedPayload?.capturedPostId &&
      !typedPayload?.forceRegenerate
    ) {
      console.log('[GeneratePdf] Returning cached PDF');
      return {
        success: true,
        data: cachedPdf,
        requestId,
      };
    }

    // Validate we have a capture
    if (!currentCapture) {
      return createErrorResponse(
        ErrorCode.NO_CAPTURE,
        'No captured post found. Please capture a post first.',
        requestId
      );
    }

    const capturedPost = currentCapture as CapturedPost;

    // Validate capturedPostId if provided
    if (typedPayload?.capturedPostId && typedPayload.capturedPostId !== capturedPost.id) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Captured post ID mismatch',
        requestId
      );
    }

    // Update status to generating
    await chrome.storage.session.set({
      currentCapture: {
        ...capturedPost,
        status: 'pdf_generating',
      },
    });

    // Get user settings for PDF options
    const { settings } = await chrome.storage.local.get('settings');
    const pdfOptions = {
      includeSourceUrl: settings?.includeSourceUrl ?? true,
      quality: settings?.pdfQuality ?? 'standard',
    };

    // Generate PDF
    console.log('[GeneratePdf] Calling generatePdf function...');
    const generatedPdf = await generatePdf(capturedPost, pdfOptions);
    console.log('[GeneratePdf] generatePdf returned successfully');

    // Cache PDF in memory (not session storage - too large)
    cachedPdf = generatedPdf;

    // Store only metadata in session (without pdfBase64)
    await chrome.storage.session.set({
      currentPdfMeta: {
        capturedPostId: generatedPdf.capturedPostId,
        filename: generatedPdf.filename,
        sizeBytes: generatedPdf.sizeBytes,
        generatedAt: generatedPdf.generatedAt,
        pageCount: generatedPdf.pageCount,
      },
      currentCapture: {
        ...capturedPost,
        status: 'pdf_ready',
      },
    });

    console.log('[GeneratePdf] PDF generated successfully:', generatedPdf.filename);

    return {
      success: true,
      data: generatedPdf,
      requestId,
    };
  } catch (error) {
    console.error('[GeneratePdf] Error:', error);

    // Revert status on error
    const { currentCapture } = await chrome.storage.session.get('currentCapture');
    if (currentCapture) {
      await chrome.storage.session.set({
        currentCapture: {
          ...currentCapture,
          status: 'error',
        },
      });
    }

    return createErrorResponse(
      ErrorCode.PDF_GENERATION_ERROR,
      error instanceof Error ? error.message : 'Failed to generate PDF',
      requestId
    );
  }
}
