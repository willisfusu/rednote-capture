/**
 * QueueView Component
 * Displays the current batch processing queue
 */

import type { PostQueue, QueueItem, QueueStatus } from '../../models/post-queue';
import type { QueueProgress } from '../../services/queue-manager';

/**
 * Props for the QueueView component
 */
export interface QueueViewProps {
  queue: PostQueue;
  progress: QueueProgress;
  status: QueueStatus;
  isProcessing: boolean;
  onRemoveItem: (itemId: string) => void;
  onClearQueue: () => void;
  onClearCompleted: () => void;
  onRetryFailed: () => void;
}

/**
 * Create the QueueView element
 */
export function createQueueView(props: QueueViewProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'queue-view';

  // Header with count
  const header = document.createElement('div');
  header.className = 'queue-header';
  header.innerHTML = `
    <h3 class="queue-title">Batch Queue</h3>
    <span class="queue-count">${props.queue.totalItems} items</span>
  `;

  // Status summary
  const summary = createStatusSummary(props.queue, props.status);

  // Item list
  const itemList = createItemList(props.queue.items, props.onRemoveItem);

  // Actions
  const actions = createQueueActions(props);

  container.appendChild(header);
  container.appendChild(summary);
  container.appendChild(itemList);
  container.appendChild(actions);

  return container;
}

/**
 * Create status summary section
 */
function createStatusSummary(queue: PostQueue, status: QueueStatus): HTMLElement {
  const summary = document.createElement('div');
  summary.className = 'queue-summary';

  const statusClass = getStatusClass(status);
  const statusText = getStatusText(status);

  summary.innerHTML = `
    <div class="status-badge ${statusClass}">
      ${statusText}
    </div>
    <div class="status-counts">
      <span class="count-pending">${queue.pendingItems} pending</span>
      <span class="count-completed">${queue.completedItems} done</span>
      ${queue.failedItems > 0 ? `<span class="count-failed">${queue.failedItems} failed</span>` : ''}
    </div>
  `;

  return summary;
}

/**
 * Create the list of queue items
 */
function createItemList(
  items: QueueItem[],
  onRemove: (itemId: string) => void
): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'queue-list';

  if (items.length === 0) {
    list.innerHTML = '<li class="queue-empty">No items in queue</li>';
    return list;
  }

  for (const item of items) {
    const li = createQueueItemElement(item, onRemove);
    list.appendChild(li);
  }

  return list;
}

/**
 * Create a single queue item element
 */
function createQueueItemElement(
  item: QueueItem,
  onRemove: (itemId: string) => void
): HTMLElement {
  const li = document.createElement('li');
  li.className = `queue-item status-${item.status}`;
  li.dataset.itemId = item.id;

  const statusIcon = getStatusIcon(item.status);
  const truncatedTitle = truncateText(item.post.title, 30);

  li.innerHTML = `
    <span class="item-status-icon">${statusIcon}</span>
    <span class="item-title" title="${escapeHtml(item.post.title)}">${escapeHtml(truncatedTitle)}</span>
    <span class="item-images">${item.post.images.length} img</span>
    ${item.status === 'pending' ? '<button class="item-remove" title="Remove">×</button>' : ''}
    ${item.error ? `<span class="item-error" title="${escapeHtml(item.error)}">⚠</span>` : ''}
  `;

  // Add remove button handler
  const removeBtn = li.querySelector('.item-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove(item.id);
    });
  }

  return li;
}

/**
 * Create queue action buttons
 */
function createQueueActions(props: QueueViewProps): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'queue-actions';

  // Clear all button
  if (props.queue.totalItems > 0 && !props.isProcessing) {
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'btn btn-secondary btn-small';
    clearAllBtn.textContent = 'Clear All';
    clearAllBtn.addEventListener('click', props.onClearQueue);
    actions.appendChild(clearAllBtn);
  }

  // Clear completed button
  if (props.queue.completedItems > 0) {
    const clearCompletedBtn = document.createElement('button');
    clearCompletedBtn.className = 'btn btn-secondary btn-small';
    clearCompletedBtn.textContent = 'Clear Completed';
    clearCompletedBtn.addEventListener('click', props.onClearCompleted);
    actions.appendChild(clearCompletedBtn);
  }

  // Retry failed button
  if (props.queue.failedItems > 0 && !props.isProcessing) {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-warning btn-small';
    retryBtn.textContent = 'Retry Failed';
    retryBtn.addEventListener('click', props.onRetryFailed);
    actions.appendChild(retryBtn);
  }

  return actions;
}

/**
 * Get CSS class for status
 */
function getStatusClass(status: QueueStatus): string {
  switch (status) {
    case 'empty':
      return 'status-empty';
    case 'pending':
      return 'status-pending';
    case 'processing':
      return 'status-processing';
    case 'completed':
      return 'status-completed';
    case 'partial_failure':
      return 'status-partial-failure';
    default:
      return '';
  }
}

/**
 * Get text for status
 */
function getStatusText(status: QueueStatus): string {
  switch (status) {
    case 'empty':
      return 'Empty';
    case 'pending':
      return 'Ready to Process';
    case 'processing':
      return 'Processing...';
    case 'completed':
      return 'Complete';
    case 'partial_failure':
      return 'Completed with Errors';
    default:
      return 'Unknown';
  }
}

/**
 * Get icon for item status
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending':
      return '○';
    case 'processing':
      return '◐';
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    default:
      return '?';
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

/**
 * Update an existing queue view with new data
 */
export function updateQueueView(
  container: HTMLElement,
  props: QueueViewProps
): void {
  // Clear and recreate
  container.innerHTML = '';
  const newView = createQueueView(props);
  while (newView.firstChild) {
    container.appendChild(newView.firstChild);
  }
}
