/**
 * Generated PDF model
 */

/**
 * Represents a generated PDF ready for download or upload
 */
export interface GeneratedPdf {
  /** Reference to the source captured post */
  capturedPostId: string;

  /** Base64-encoded PDF data (service workers can't use blob URLs) */
  pdfBase64: string;

  /** Suggested filename for the PDF */
  filename: string;

  /** Size of the PDF in bytes */
  sizeBytes: number;

  /** Unix timestamp (ms) when PDF was generated */
  generatedAt: number;

  /** Number of pages in the PDF */
  pageCount: number;

  /** Whether images were successfully included */
  imagesIncluded: boolean;

  /** Number of images that failed to load */
  failedImageCount: number;
}

/**
 * PDF generation options
 */
export interface PdfGenerationOptions {
  /** Include source URL in footer */
  includeSourceUrl: boolean;

  /** PDF quality setting */
  quality: 'standard' | 'high';

  /** Maximum image width in points */
  maxImageWidth: number;

  /** Page margins in points */
  margin: number;
}

/**
 * Default PDF generation options
 */
export const DEFAULT_PDF_OPTIONS: PdfGenerationOptions = {
  includeSourceUrl: true,
  quality: 'standard',
  maxImageWidth: 495, // A4 width (595) minus margins (50 each side)
  margin: 50,
};
