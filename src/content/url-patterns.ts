/**
 * URL Pattern Detection for RedNote (Xiaohongshu) pages
 */

const REDNOTE_DOMAINS = ['xiaohongshu.com', 'www.xiaohongshu.com'];

/**
 * Post URL patterns:
 * - /explore/{postId} - Main post view
 * - /discovery/item/{postId} - Discovery item view
 * - /user/profile/{userId}/{postId} - User profile post view (some older links)
 */
const POST_PATTERNS = [
  /^\/explore\/([a-zA-Z0-9]+)/,
  /^\/discovery\/item\/([a-zA-Z0-9]+)/,
  /^\/user\/profile\/[^/]+\/([a-zA-Z0-9]+)/,
];

/**
 * Check if a URL is from RedNote (xiaohongshu.com)
 */
export function isRedNoteUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return REDNOTE_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a RedNote post page (not just any page on the site)
 */
// ... existing code ...

/**
 * Check if a URL is a RedNote post page (not just any page on the site)
 */
export function isRedNotePostUrl(url: string): boolean {
  if (!isRedNoteUrl(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return POST_PATTERNS.some((pattern) => pattern.test(parsed.pathname));
  } catch {
    return false;
  }
}

const PROFILE_PATTERN = /^\/user\/profile\/([a-zA-Z0-9]+)/;

/**
 * Check if a URL is a RedNote profile page
 */
export function isProfileUrl(url: string): boolean {
  if (!isRedNoteUrl(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return PROFILE_PATTERN.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Extract the post ID from a RedNote post URL
 * Returns null if the URL is not a valid post URL
 */
export function extractPostIdFromUrl(url: string): string | null {
  if (!isRedNoteUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);

    for (const pattern of POST_PATTERNS) {
      const match = parsed.pathname.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}
