/**
 * PostPreview Component
 * Displays captured post data in the popup
 */

import type { CapturedPost } from '../../models/captured-post';

export interface PostPreviewOptions {
  onGeneratePdf?: () => void;
  onClear?: () => void;
}

/**
 * Create a post preview element
 */
export function createPostPreview(
  container: HTMLElement,
  post: CapturedPost,
  options: PostPreviewOptions = {}
): HTMLElement {
  const preview = document.createElement('div');
  preview.className = 'post-preview';
  preview.innerHTML = `
    <div class="preview-card">
      <h3 class="preview-title">${escapeHtml(post.title)}</h3>
      <p class="preview-author">by ${escapeHtml(post.authorName)}</p>
      <p class="preview-meta">${post.images.length} image(s)${post.isVideo ? ' • Video post' : ''}</p>
      ${post.description ? `<p class="preview-description">${escapeHtml(truncate(post.description, 150))}</p>` : ''}
    </div>
    <div class="actions">
      <button id="generate-pdf-btn" class="btn btn-primary">Generate PDF</button>
      <button id="clear-capture-btn" class="btn btn-secondary">Clear</button>
    </div>
  `;

  // Bind event listeners
  const generateBtn = preview.querySelector('#generate-pdf-btn') as HTMLButtonElement;
  const clearBtn = preview.querySelector('#clear-capture-btn') as HTMLButtonElement;

  if (generateBtn && options.onGeneratePdf) {
    generateBtn.addEventListener('click', options.onGeneratePdf);
  }

  if (clearBtn && options.onClear) {
    clearBtn.addEventListener('click', options.onClear);
  }

  container.appendChild(preview);
  return preview;
}

/**
 * Update an existing post preview with new data
 */
export function updatePostPreview(
  container: HTMLElement,
  post: CapturedPost
): void {
  const titleEl = container.querySelector('.preview-title');
  const authorEl = container.querySelector('.preview-author');
  const metaEl = container.querySelector('.preview-meta');
  const descEl = container.querySelector('.preview-description');

  if (titleEl) {
    titleEl.textContent = post.title;
  }

  if (authorEl) {
    authorEl.textContent = `by ${post.authorName}`;
  }

  if (metaEl) {
    metaEl.textContent = `${post.images.length} image(s)${post.isVideo ? ' • Video post' : ''}`;
  }

  if (descEl && post.description) {
    descEl.textContent = truncate(post.description, 150);
  }
}

/**
 * Render post preview into existing DOM elements
 */
export function renderPostPreview(
  titleEl: HTMLElement,
  authorEl: HTMLElement,
  metaEl: HTMLElement,
  post: CapturedPost
): void {
  titleEl.textContent = post.title || 'Untitled Post';
  authorEl.textContent = `by ${post.authorName}`;
  metaEl.textContent = `${post.images.length} image(s)${post.isVideo ? ' • Video post' : ''}`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text to a maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format capture timestamp for display
 */
export function formatCaptureTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Get status display text
 */
export function getStatusText(status: CapturedPost['status']): string {
  const statusMap: Record<CapturedPost['status'], string> = {
    captured: 'Captured',
    pdf_generating: 'Generating PDF...',
    pdf_ready: 'PDF Ready',
    uploading: 'Uploading...',
    uploaded: 'Uploaded',
    error: 'Error',
  };
  return statusMap[status] || status;
}
