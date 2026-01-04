/**
 * Font Loader Service
 * Loads and caches fonts for PDF generation
 */

let cachedChineseFontBytes: Uint8Array | null = null;
let cachedEmojiFontBytes: Uint8Array | null = null;

/**
 * Load the bundled SmileySans Chinese font
 * Returns cached font if already loaded
 */
export async function loadChineseFont(): Promise<Uint8Array> {
  if (cachedChineseFontBytes) {
    return cachedChineseFontBytes;
  }

  try {
    // Load SmileySans font from extension's bundled assets
    const fontUrl = chrome.runtime.getURL('lib/fonts/SmileySans.ttf');
    const response = await fetch(fontUrl);

    if (!response.ok) {
      throw new Error(`Failed to load font: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    cachedChineseFontBytes = new Uint8Array(arrayBuffer);


    return cachedChineseFontBytes;
  } catch (error) {
    console.error('[FontLoader] Error loading Chinese font:', error);
    throw new Error('Failed to load Chinese font for PDF generation');
  }
}

/**
 * Load the bundled Noto Emoji font
 * Returns cached font if already loaded
 */
export async function loadEmojiFont(): Promise<Uint8Array> {
  if (cachedEmojiFontBytes) {
    return cachedEmojiFontBytes;
  }

  try {
    // Load Noto Emoji font from extension's bundled assets
    const fontUrl = chrome.runtime.getURL('lib/fonts/NotoEmoji.ttf');
    const response = await fetch(fontUrl);

    if (!response.ok) {
      throw new Error(`Failed to load emoji font: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    cachedEmojiFontBytes = new Uint8Array(arrayBuffer);


    return cachedEmojiFontBytes;
  } catch (error) {
    console.error('[FontLoader] Error loading emoji font:', error);
    throw new Error('Failed to load emoji font for PDF generation');
  }
}

/**
 * Check if Chinese font is already cached
 */
export function isChineseFontCached(): boolean {
  return cachedChineseFontBytes !== null;
}

/**
 * Check if emoji font is already cached
 */
export function isEmojiFontCached(): boolean {
  return cachedEmojiFontBytes !== null;
}

/**
 * Clear all font caches (useful for testing)
 */
export function clearFontCache(): void {
  cachedChineseFontBytes = null;
  cachedEmojiFontBytes = null;
}
