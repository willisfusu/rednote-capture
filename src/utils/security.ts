/**
 * Security Utilities
 * Helper functions for input validation and sanitization
 */

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate that a URL is a Google Drive URL
 */
export function isValidGoogleDriveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'drive.google.com' ||
      parsed.hostname.endsWith('.google.com')
    );
  } catch {
    return false;
  }
}

/**
 * Validate that a URL is a valid NotebookLM URL
 */
export function isValidNotebookLMUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'notebooklm.google.com' ||
      parsed.hostname === 'notebook.google.com'
    );
  } catch {
    return false;
  }
}

/**
 * Validate that a URL is a valid RedNote URL
 */
export function isValidRedNoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'www.xiaohongshu.com' ||
      parsed.hostname === 'xiaohongshu.com'
    );
  } catch {
    return false;
  }
}

/**
 * Validate that a URL is a valid image CDN URL
 */
export function isValidImageCdnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes('xhscdn.com') ||
      parsed.hostname.includes('xiaohongshu.com')
    );
  } catch {
    return false;
  }
}

/**
 * Sanitize a URL for safe use in href attributes
 * Returns empty string if URL is not safe
 */
export function sanitizeUrl(url: string, allowedDomains: string[]): string {
  try {
    const parsed = new URL(url);

    // Only allow https
    if (parsed.protocol !== 'https:') {
      return '';
    }

    // Check if domain is allowed
    const isAllowed = allowedDomains.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );

    return isAllowed ? url : '';
  } catch {
    return '';
  }
}

/**
 * Create a safe anchor element with validated URL
 */
export function createSafeLink(
  url: string,
  text: string,
  allowedDomains: string[]
): HTMLAnchorElement {
  const anchor = document.createElement('a');
  const safeUrl = sanitizeUrl(url, allowedDomains);

  if (safeUrl) {
    anchor.href = safeUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  } else {
    anchor.removeAttribute('href');
    anchor.style.cursor = 'not-allowed';
    anchor.title = 'Invalid URL';
  }

  anchor.textContent = text;
  return anchor;
}

/**
 * Truncate text with ellipsis (safe, no HTML)
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Validate message payload structure
 */
export function isValidMessagePayload(
  payload: unknown,
  requiredFields: string[]
): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const obj = payload as Record<string, unknown>;
  return requiredFields.every((field) => field in obj);
}
