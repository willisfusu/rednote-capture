/**
 * PDF Generator Service
 * Creates PDFs from captured RedNote posts with Chinese text and emoji support
 */

import type { CapturedPost } from '../models/captured-post';
import type { GeneratedPdf, PdfGenerationOptions } from '../models/generated-pdf';
import { DEFAULT_PDF_OPTIONS } from '../models/generated-pdf';
import { loadChineseFont, loadEmojiFont } from './font-loader';
import { downloadImages, type DownloadedImage } from './image-downloader';

// Static imports for pdf-lib (dynamic import() not allowed in service workers)
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

console.log('[PdfGenerator] Module loaded with static imports');


// A4 dimensions in points
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

// Font sizes
const TITLE_FONT_SIZE = 18;
const AUTHOR_FONT_SIZE = 12;
const BODY_FONT_SIZE = 11;
const FOOTER_FONT_SIZE = 9;

// Line heights
const TITLE_LINE_HEIGHT = 24;
const BODY_LINE_HEIGHT = 16;

// Emoji detection ranges
const EMOJI_RANGES: [number, number][] = [
  [0x1F600, 0x1F64F], // Emoticons
  [0x1F300, 0x1F5FF], // Misc Symbols and Pictographs
  [0x1F680, 0x1F6FF], // Transport and Map
  [0x1F1E0, 0x1F1FF], // Flags
  [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
  [0x1FA00, 0x1FA6F], // Chess Symbols
  [0x1FA70, 0x1FAFF], // Symbols and Pictographs Extended-A
  [0x2600, 0x26FF],   // Misc symbols
  [0x2700, 0x27BF],   // Dingbats
  [0x231A, 0x231B],   // Watch, Hourglass
  [0x23E9, 0x23F3],   // Various symbols
  [0x23F8, 0x23FA],   // Various symbols
  [0x25AA, 0x25AB],   // Squares
  [0x25B6, 0x25C0],   // Triangles
  [0x25FB, 0x25FE],   // Squares
  [0x2614, 0x2615],   // Umbrella, Hot Beverage
  [0x2648, 0x2653],   // Zodiac
  [0x2702, 0x2702],   // Scissors
  [0x2705, 0x2705],   // Check Mark
  [0x2708, 0x270D],   // Airplane to Writing Hand
  [0x270F, 0x270F],   // Pencil
  [0x2714, 0x2714],   // Check Mark
  [0x2716, 0x2716],   // X Mark
  [0x2728, 0x2728],   // Sparkles
  [0x274C, 0x274C],   // Cross Mark
  [0x2753, 0x2755],   // Question Marks
  [0x2757, 0x2757],   // Exclamation Mark
  [0x2763, 0x2764],   // Heart Exclamation, Heart
  [0x2795, 0x2797],   // Plus, Minus, Division
  [0x27A1, 0x27A1],   // Right Arrow
  [0x2934, 0x2935],   // Arrows
  [0x2B05, 0x2B07],   // Arrows
  [0x2B1B, 0x2B1C],   // Squares
  [0x2B50, 0x2B50],   // Star
  [0x2B55, 0x2B55],   // Circle
  [0x3030, 0x3030],   // Wavy Dash
  [0x303D, 0x303D],   // Part Alternation Mark
];

/**
 * Check if a character is an emoji
 */
function isEmoji(codePoint: number): boolean {
  for (const [start, end] of EMOJI_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return true;
    }
  }
  return false;
}

/**
 * Text segment with font type
 */
interface TextSegment {
  text: string;
  isEmoji: boolean;
}

/**
 * Split text into emoji and non-emoji segments
 */
function splitTextByEmoji(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let currentIsEmoji = false;

  for (const char of text) {
    const codePoint = char.codePointAt(0) || 0;
    const charIsEmoji = isEmoji(codePoint);

    // Skip variation selectors (they follow emojis)
    if (codePoint >= 0xFE00 && codePoint <= 0xFE0F) {
      continue;
    }

    if (currentSegment === '') {
      currentIsEmoji = charIsEmoji;
      currentSegment = char;
    } else if (charIsEmoji === currentIsEmoji) {
      currentSegment += char;
    } else {
      segments.push({ text: currentSegment, isEmoji: currentIsEmoji });
      currentSegment = char;
      currentIsEmoji = charIsEmoji;
    }
  }

  if (currentSegment) {
    segments.push({ text: currentSegment, isEmoji: currentIsEmoji });
  }

  return segments;
}

/**
 * Generate a PDF from a captured post
 */
export async function generatePdf(
  post: CapturedPost,
  options: Partial<PdfGenerationOptions> = {}
): Promise<GeneratedPdf> {
  const opts = { ...DEFAULT_PDF_OPTIONS, ...options };

  console.log('[PdfGenerator] Starting PDF generation for:', post.id);

  // Create PDF document
  console.log('[PdfGenerator] Creating PDF document...');
  const pdfDoc = await PDFDocument.create();

  // Register fontkit for custom font support
  console.log('[PdfGenerator] Registering fontkit...');
  pdfDoc.registerFontkit(fontkit);

  // Load and embed fonts
  const chineseFontBytes = await loadChineseFont();
  const emojiFontBytes = await loadEmojiFont();
  console.log(`[PdfGenerator] Loaded fonts - Chinese: ${chineseFontBytes.length} bytes, Emoji: ${emojiFontBytes.length} bytes`);
  const chineseFont = await pdfDoc.embedFont(chineseFontBytes);
  const emojiFont = await pdfDoc.embedFont(emojiFontBytes);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Set metadata
  pdfDoc.setTitle(post.title);
  pdfDoc.setAuthor(post.authorName);
  pdfDoc.setSubject('RedNote Post Capture');
  pdfDoc.setCreator('RedNote to NotebookLM Extension');
  pdfDoc.setProducer('pdf-lib');
  pdfDoc.setCreationDate(new Date(post.captureTimestamp));

  // Download images
  console.log(`[PdfGenerator] Downloading ${post.images.length} images...`);
  const downloadedImages = await downloadImages(post.images);
  const successfulImages = downloadedImages.filter((img) => img.success && img.bytes);
  console.log(`[PdfGenerator] Successfully downloaded ${successfulImages.length}/${post.images.length} images`);

  // Create pages
  let currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let yPosition = A4_HEIGHT - opts.margin;
  let pageCount = 1;

  // Draw title
  yPosition = drawText(
    currentPage,
    post.title,
    chineseFont,
    emojiFont,
    TITLE_FONT_SIZE,
    opts.margin,
    yPosition,
    opts.maxImageWidth,
    TITLE_LINE_HEIGHT,
    rgb(0, 0, 0)
  );

  yPosition -= 10; // Spacing after title

  // Draw author
  yPosition = drawText(
    currentPage,
    `by ${post.authorName}`,
    chineseFont,
    emojiFont,
    AUTHOR_FONT_SIZE,
    opts.margin,
    yPosition,
    opts.maxImageWidth,
    BODY_LINE_HEIGHT,
    rgb(0.4, 0.4, 0.4)
  );

  yPosition -= 20; // Spacing after author

  // Draw description
  if (post.description) {
    const descriptionLines = wrapText(post.description, chineseFont, BODY_FONT_SIZE, opts.maxImageWidth);

    for (const line of descriptionLines) {
      // Check if we need a new page
      if (yPosition < opts.margin + BODY_LINE_HEIGHT) {
        currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        pageCount++;
        yPosition = A4_HEIGHT - opts.margin;
      }

      // Draw line with mixed fonts (emoji support)
      const segments = splitTextByEmoji(line);
      let xPos = opts.margin;

      for (const segment of segments) {
        const font = segment.isEmoji ? emojiFont : chineseFont;
        try {
          currentPage.drawText(segment.text, {
            x: xPos,
            y: yPosition,
            size: BODY_FONT_SIZE,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
          xPos += font.widthOfTextAtSize(segment.text, BODY_FONT_SIZE);
        } catch (error) {
          console.warn(`[PdfGenerator] Failed to render segment: ${segment.text}`);
        }
      }

      yPosition -= BODY_LINE_HEIGHT;
    }
  }

  yPosition -= 30; // Spacing before images

  // Embed and draw images
  for (const downloadedImage of successfulImages) {
    try {
      const embeddedImage = await embedImage(pdfDoc, downloadedImage);

      if (!embeddedImage) {
        continue;
      }

      // Calculate scaled dimensions to fit page width
      const scale = Math.min(1, opts.maxImageWidth / embeddedImage.width);
      const scaledWidth = embeddedImage.width * scale;
      const scaledHeight = embeddedImage.height * scale;

      // Check if we need a new page
      if (yPosition - scaledHeight < opts.margin) {
        currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        pageCount++;
        yPosition = A4_HEIGHT - opts.margin;
      }

      // Draw image
      currentPage.drawImage(embeddedImage, {
        x: opts.margin,
        y: yPosition - scaledHeight,
        width: scaledWidth,
        height: scaledHeight,
      });

      yPosition -= scaledHeight + 15; // Image plus spacing
    } catch (error) {
      console.error('[PdfGenerator] Error embedding image:', error);
    }
  }

  // Add footer with source URL
  if (opts.includeSourceUrl) {
    // Add footer to last page
    currentPage.drawText(`Source: ${post.sourceUrl}`, {
      x: opts.margin,
      y: opts.margin - 20,
      size: FOOTER_FONT_SIZE,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    currentPage.drawText(`Captured: ${new Date(post.captureTimestamp).toLocaleString()}`, {
      x: opts.margin,
      y: opts.margin - 32,
      size: FOOTER_FONT_SIZE,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Save PDF
  const pdfBytes = await pdfDoc.save();

  // Convert to base64 (service workers can't use URL.createObjectURL)
  const pdfBase64 = uint8ArrayToBase64(pdfBytes);

  // Generate filename
  const filename = generateFilename(post.title);

  const failedImageCount = downloadedImages.filter((img) => !img.success).length;

  console.log('[PdfGenerator] PDF generated successfully:', {
    pages: pageCount,
    size: pdfBytes.length,
    imagesIncluded: successfulImages.length,
    failedImages: failedImageCount,
  });

  return {
    capturedPostId: post.id,
    pdfBase64,
    filename,
    sizeBytes: pdfBytes.length,
    generatedAt: Date.now(),
    pageCount,
    imagesIncluded: successfulImages.length > 0,
    failedImageCount,
  };
}

/**
 * Draw text with word wrapping and emoji support
 */
function drawText(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mainFont: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emojiFont: any,
  fontSize: number,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  color: any
): number {
  const lines = wrapText(text, mainFont, fontSize, maxWidth);

  for (const line of lines) {
    // Split line into emoji and non-emoji segments
    const segments = splitTextByEmoji(line);
    let xPos = x;

    for (const segment of segments) {
      const font = segment.isEmoji ? emojiFont : mainFont;
      try {
        page.drawText(segment.text, {
          x: xPos,
          y,
          size: fontSize,
          font,
          color,
        });
        xPos += font.widthOfTextAtSize(segment.text, fontSize);
      } catch (error) {
        // If emoji font fails, skip the segment
        console.warn(`[PdfGenerator] Failed to render: ${segment.text}`, error);
      }
    }
    y -= lineHeight;
  }

  return y;
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    let currentLine = '';

    // Handle character by character for mixed Chinese/English text
    for (const char of paragraph) {
      const testLine = currentLine + char;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Embed an image into the PDF document
 */
async function embedImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfDoc: any,
  downloadedImage: DownloadedImage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  if (!downloadedImage.bytes) {
    return null;
  }

  try {
    switch (downloadedImage.type) {
      case 'jpeg':
        return await pdfDoc.embedJpg(downloadedImage.bytes);
      case 'png':
        return await pdfDoc.embedPng(downloadedImage.bytes);
      case 'webp':
        // WebP is not directly supported, skip
        console.warn('[PdfGenerator] WebP images not supported, skipping');
        return null;
      default:
        // Try JPEG first, then PNG
        try {
          return await pdfDoc.embedJpg(downloadedImage.bytes);
        } catch {
          return await pdfDoc.embedPng(downloadedImage.bytes);
        }
    }
  } catch (error) {
    console.error('[PdfGenerator] Failed to embed image:', error);
    return null;
  }
}

/**
 * Generate a safe filename from the post title
 */
function generateFilename(title: string): string {
  // Remove invalid filename characters and normalize whitespace
  const sanitized = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate if too long (max 200 chars to be safe)
  const truncated = sanitized.substring(0, 200);

  // Default if empty
  const finalName = truncated || 'RedNote_Post';

  // Ensure it ends with .pdf
  return finalName.toLowerCase().endsWith('.pdf')
    ? finalName
    : `${finalName}.pdf`;
}

/**
 * Revoke a blob URL to free memory
 */
export function revokePdfBlobUrl(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
}

/**
 * Convert Uint8Array to base64 string
 * Uses chunking to avoid stack overflow on huge files
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to Uint8Array (for use in popup context)
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Create a blob URL from base64 PDF data (call from popup context, not service worker)
 */
export function createPdfBlobUrl(pdfBase64: string): string {
  const bytes = base64ToUint8Array(pdfBase64);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
