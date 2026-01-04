/**
 * Standard error codes for the extension
 */
export enum ErrorCode {
  // General
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Tab/Page errors
  TAB_NOT_FOUND = 'TAB_NOT_FOUND',
  NOT_REDNOTE_PAGE = 'NOT_REDNOTE_PAGE',

  // Capture errors
  EXTRACTION_ERROR = 'EXTRACTION_ERROR',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  NO_POST_DATA = 'NO_POST_DATA',
  NO_CAPTURE = 'NO_CAPTURE',

  // PDF errors
  PDF_GENERATION_ERROR = 'PDF_GENERATION_ERROR',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  IMAGE_DOWNLOAD_FAILED = 'IMAGE_DOWNLOAD_FAILED',
  FONT_LOAD_FAILED = 'FONT_LOAD_FAILED',
  NO_PDF = 'NO_PDF',
  DOWNLOAD_ERROR = 'DOWNLOAD_ERROR',

  // Upload errors
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DRIVE_API_ERROR = 'DRIVE_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Auth errors
  AUTH_CANCELLED = 'AUTH_CANCELLED',
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Queue errors
  QUEUE_EMPTY = 'QUEUE_EMPTY',
  BATCH_PROCESSING_FAILED = 'BATCH_PROCESSING_FAILED',
  PROCESSING_IN_PROGRESS = 'PROCESSING_IN_PROGRESS',
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: string;
  errorCode: ErrorCode;
  details?: unknown;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  errorCode: ErrorCode,
  message: string,
  requestId?: string,
  details?: unknown
): ErrorResponse & { requestId?: string } {
  return {
    success: false,
    error: message,
    errorCode,
    details,
    requestId,
  };
}
