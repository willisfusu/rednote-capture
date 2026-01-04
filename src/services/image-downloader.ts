/**
 * Image Downloader Service
 * Downloads images from URLs and returns them as byte arrays
 */

import type { PostImage } from '../models/post-image';

/**
 * Result of downloading an image
 */
export interface DownloadedImage {
  /** Original image data */
  image: PostImage;

  /** Image bytes (null if download failed) */
  bytes: Uint8Array | null;

  /** Detected image type */
  type: 'jpeg' | 'png' | 'webp' | 'unknown';

  /** Whether download was successful */
  success: boolean;

  /** Error message if download failed */
  error?: string;
}

/**
 * Download options
 */
export interface DownloadOptions {
  /** Maximum retry attempts */
  maxRetries: number;

  /** Timeout in milliseconds */
  timeout: number;

  /** Convert WebP to JPEG for PDF compatibility */
  convertWebP: boolean;
}

const DEFAULT_OPTIONS: DownloadOptions = {
  maxRetries: 3,
  timeout: 30000,
  convertWebP: true,
};

/**
 * Download a single image from URL
 */
export async function downloadImage(
  image: PostImage,
  options: Partial<DownloadOptions> = {}
): Promise<DownloadedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      console.log(`[ImageDownloader] Downloading: ${image.url}`);

      const response = await fetch(image.url, {
        signal: controller.signal,
        headers: {
          // Some CDNs require a user agent
          'User-Agent': 'Mozilla/5.0 (compatible; RedNote Extension)',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      let bytes = new Uint8Array(arrayBuffer);
      let type = detectImageType(bytes);

      console.log(`[ImageDownloader] Downloaded ${bytes.length} bytes, type: ${type}`);

      // Convert WebP to JPEG for PDF compatibility
      if (type === 'webp' && opts.convertWebP) {
        console.log('[ImageDownloader] Converting WebP to JPEG...');
        const converted = await convertWebPToJpeg(bytes);
        if (converted) {
          bytes = converted as Uint8Array<ArrayBuffer>;
          type = 'jpeg';
          console.log(`[ImageDownloader] Converted to JPEG: ${bytes.length} bytes`);
        } else {
          console.warn('[ImageDownloader] WebP conversion failed');
        }
      }

      return {
        image,
        bytes,
        type,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ImageDownloader] Attempt ${attempt} failed:`, errorMessage);

      if (attempt === opts.maxRetries) {
        console.error(`[ImageDownloader] Failed after ${opts.maxRetries} attempts:`, image.url);
        return {
          image,
          bytes: null,
          type: 'unknown',
          success: false,
          error: errorMessage,
        };
      }

      // Wait before retry (exponential backoff)
      await delay(Math.pow(2, attempt) * 500);
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    image,
    bytes: null,
    type: 'unknown',
    success: false,
    error: 'Max retries exceeded',
  };
}

/**
 * Download multiple images in parallel
 */
export async function downloadImages(
  images: PostImage[],
  options: Partial<DownloadOptions> = {}
): Promise<DownloadedImage[]> {
  console.log(`[ImageDownloader] Downloading ${images.length} images`);

  const results = await Promise.all(
    images.map((image) => downloadImage(image, options))
  );

  const successCount = results.filter((r) => r.success).length;
  console.log(`[ImageDownloader] Downloaded ${successCount}/${images.length} images successfully`);

  return results;
}

/**
 * Detect image type from magic bytes
 */
function detectImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | 'unknown' {
  if (bytes.length < 4) {
    return 'unknown';
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length > 11 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return 'unknown';
}

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert WebP image to JPEG using OffscreenCanvas
 * Works in service workers (Chrome MV3)
 */
async function convertWebPToJpeg(webpBytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    // Create blob from WebP bytes
    const blob = new Blob([webpBytes.buffer as ArrayBuffer], { type: 'image/webp' });

    // Use createImageBitmap (available in service workers)
    const imageBitmap = await createImageBitmap(blob);

    // Create OffscreenCanvas (available in service workers)
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error('[ImageDownloader] Failed to get 2d context');
      return null;
    }

    // Draw image to canvas
    ctx.drawImage(imageBitmap, 0, 0);

    // Convert to JPEG blob
    const jpegBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.9,
    });

    // Convert blob to Uint8Array
    const arrayBuffer = await jpegBlob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('[ImageDownloader] WebP conversion error:', error);
    return null;
  }
}
