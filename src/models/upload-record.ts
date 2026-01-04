/**
 * Upload status for tracking upload attempts
 */
export type UploadStatus =
  | 'pending' // Queued for upload
  | 'uploading' // Upload in progress
  | 'success' // Upload completed
  | 'failed'; // Upload failed (may retry)

/**
 * Tracks upload attempts to Google Drive
 */
export interface UploadRecord {
  /** Unique upload attempt ID (UUID) */
  id: string;

  /** References the CapturedPost.id */
  capturedPostId: string;

  /** Google Drive file ID (set on success) */
  driveFileId: string | null;

  /** Google Drive web view link */
  driveWebViewLink: string | null;

  /** Upload status */
  status: UploadStatus;

  /** Unix timestamp (ms) when upload started */
  startedAt: number;

  /** Unix timestamp (ms) when upload completed */
  completedAt: number | null;

  /** Error message if upload failed */
  errorMessage: string | null;

  /** Number of retry attempts */
  retryCount: number;

  /** Original filename uploaded */
  filename: string;
}

/**
 * Generate a unique ID for an upload record
 */
export function generateUploadId(): string {
  return crypto.randomUUID();
}
