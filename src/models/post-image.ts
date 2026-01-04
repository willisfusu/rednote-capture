/**
 * An image extracted from a RedNote post
 */
export interface PostImage {
  /** CDN URL for the image */
  url: string;

  /** Position in carousel (0-indexed) */
  index: number;

  /** Original image width in pixels (null if unknown) */
  width: number | null;

  /** Original image height in pixels (null if unknown) */
  height: number | null;

  /** Alt text for accessibility */
  altText: string | null;

  /** Downloaded image data (populated during PDF generation) */
  data?: ArrayBuffer;

  /** Image format (detected from URL or content) */
  format?: 'png' | 'jpeg' | 'webp';
}
