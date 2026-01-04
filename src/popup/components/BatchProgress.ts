/**
 * BatchProgress Component
 * Shows progress during batch processing
 */

import type { BatchProgress } from '../../services/batch-processor';

/**
 * Props for BatchProgress component
 */
export interface BatchProgressProps {
  progress: BatchProgress;
  onCancel: () => void;
}

/**
 * Create the batch progress element
 */
export function createBatchProgress(props: BatchProgressProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'batch-progress';
  container.id = 'batch-progress';

  updateBatchProgressContent(container, props);

  return container;
}

/**
 * Update batch progress content
 */
export function updateBatchProgressContent(
  container: HTMLElement,
  props: BatchProgressProps
): void {
  const { progress, onCancel } = props;

  const phaseText = getPhaseText(progress.phase);
  const statusClass = progress.cancelled ? 'cancelled' : progress.phase;

  container.innerHTML = `
    <div class="progress-header">
      <span class="progress-title">Batch Processing</span>
      <span class="progress-status ${statusClass}">${phaseText}</span>
    </div>

    <div class="progress-bar-container">
      <div class="progress-bar" style="width: ${progress.percentage}%"></div>
    </div>

    <div class="progress-stats">
      <span class="progress-count">${progress.completed} / ${progress.total}</span>
      <span class="progress-percentage">${progress.percentage}%</span>
    </div>

    ${progress.currentItem ? `
      <div class="progress-current">
        <span class="current-label">Processing:</span>
        <span class="current-item">${escapeHtml(truncateText(progress.currentItem, 40))}</span>
      </div>
    ` : ''}

    <div class="progress-details">
      <span class="detail-success">✓ ${progress.successCount} succeeded</span>
      ${progress.failedCount > 0 ? `<span class="detail-failed">✗ ${progress.failedCount} failed</span>` : ''}
    </div>

    ${progress.phase !== 'complete' && !progress.cancelled ? `
      <button class="btn btn-secondary btn-small cancel-btn">Cancel</button>
    ` : ''}

    ${progress.phase === 'complete' ? `
      <div class="progress-complete">
        ${progress.failedCount === 0 ? '🎉 All items processed successfully!' : `⚠ Completed with ${progress.failedCount} errors`}
      </div>
    ` : ''}
  `;

  // Add cancel button handler
  const cancelBtn = container.querySelector('.cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', onCancel);
  }
}

/**
 * Get human-readable text for processing phase
 */
function getPhaseText(phase: BatchProgress['phase']): string {
  switch (phase) {
    case 'idle':
      return 'Starting...';
    case 'generating_pdf':
      return 'Generating PDF';
    case 'uploading':
      return 'Uploading to Drive';
    case 'complete':
      return 'Complete';
    default:
      return 'Processing';
  }
}

/**
 * Create a compact progress indicator for the header
 */
export function createCompactProgress(progress: BatchProgress): HTMLElement {
  const indicator = document.createElement('div');
  indicator.className = 'compact-progress';
  indicator.id = 'compact-progress';

  if (progress.phase === 'complete') {
    indicator.innerHTML = `
      <span class="compact-icon">✓</span>
      <span class="compact-text">${progress.successCount}/${progress.total} done</span>
    `;
    indicator.classList.add('complete');
  } else {
    indicator.innerHTML = `
      <span class="compact-spinner"></span>
      <span class="compact-text">${progress.completed}/${progress.total}</span>
    `;
    indicator.classList.add('processing');
  }

  return indicator;
}

/**
 * Update compact progress indicator
 */
export function updateCompactProgress(
  indicator: HTMLElement,
  progress: BatchProgress
): void {
  indicator.classList.remove('complete', 'processing');

  if (progress.phase === 'complete') {
    indicator.innerHTML = `
      <span class="compact-icon">✓</span>
      <span class="compact-text">${progress.successCount}/${progress.total} done</span>
    `;
    indicator.classList.add('complete');
  } else {
    indicator.innerHTML = `
      <span class="compact-spinner"></span>
      <span class="compact-text">${progress.completed}/${progress.total}</span>
    `;
    indicator.classList.add('processing');
  }
}

/**
 * Create progress toast notification
 */
export function createProgressToast(
  message: string,
  type: 'info' | 'success' | 'error' = 'info'
): HTMLElement {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);

  return toast;
}

/**
 * Get icon for toast type
 */
function getToastIcon(type: 'info' | 'success' | 'error'): string {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    default:
      return 'ℹ';
  }
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
