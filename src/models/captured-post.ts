import type { PostImage } from './post-image';

/**
 * Processing status for a captured post
 */
export type CaptureStatus =
  | 'captured' // Initial capture complete
  | 'pdf_generating' // PDF generation in progress
  | 'pdf_ready' // PDF generated successfully
  | 'uploading' // Upload to Drive in progress
  | 'uploaded' // Upload complete
  | 'error'; // Error occurred

/**
 * Represents a single captured RedNote post with all its content
 */
export interface CapturedPost {
  /** Unique identifier for this capture (UUID) */
  id: string;

  /** Original RedNote post URL */
  sourceUrl: string;

  /** Post title/caption (first line or explicit title) */
  title: string;

  /** Full post description text */
  description: string;

  /** Author display name */
  authorName: string;

  /** Author's RedNote user ID */
  authorId: string;

  /** Unix timestamp (ms) when capture occurred */
  captureTimestamp: number;

  /** Ordered list of images from the post */
  images: PostImage[];

  /** True if this is a video post */
  isVideo: boolean;

  /** Video thumbnail URL (only for video posts) */
  videoThumbnail: string | null;

  /** Processing status */
  status: CaptureStatus;
}

/**
 * Generate a unique ID for a captured post
 */
export function generateCaptureId(): string {
  return crypto.randomUUID();
}
