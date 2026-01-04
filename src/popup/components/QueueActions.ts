/**
 * QueueActions Component
 * Process queue button and add to queue functionality
 */

import type { QueueStatus } from '../../models/post-queue';

/**
 * Props for QueueActions
 */
export interface QueueActionsProps {
  queueStatus: QueueStatus;
  queueLength: number;
  isProcessing: boolean;
  isAuthenticated: boolean;
  onProcessQueue: () => void;
  onAddToQueue: () => void;
  onCancelProcessing: () => void;
}

/**
 * Create the queue actions element
 */
export function createQueueActions(props: QueueActionsProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'queue-actions-bar';

  // Add to Queue button (shown when on a post)
  const addBtn = createAddToQueueButton(props);
  container.appendChild(addBtn);

  // Process Queue button
  const processBtn = createProcessQueueButton(props);
  container.appendChild(processBtn);

  return container;
}

/**
 * Create Add to Queue button
 */
function createAddToQueueButton(props: QueueActionsProps): HTMLElement {
  const btn = document.createElement('button');
  btn.id = 'add-to-queue-btn';
  btn.className = 'btn btn-secondary';
  btn.innerHTML = `
    <span class="btn-icon">+</span>
    <span class="btn-text">Add to Queue</span>
    ${props.queueLength > 0 ? `<span class="queue-badge">${props.queueLength}</span>` : ''}
  `;

  btn.addEventListener('click', props.onAddToQueue);

  return btn;
}

/**
 * Create Process Queue button
 */
function createProcessQueueButton(props: QueueActionsProps): HTMLElement {
  const btn = document.createElement('button');
  btn.id = 'process-queue-btn';

  if (props.isProcessing) {
    // Cancel button when processing
    btn.className = 'btn btn-warning';
    btn.innerHTML = `
      <span class="btn-icon spinner"></span>
      <span class="btn-text">Cancel</span>
    `;
    btn.addEventListener('click', props.onCancelProcessing);
  } else {
    // Process button when not processing
    btn.className = `btn btn-primary ${props.queueLength === 0 ? 'btn-disabled' : ''}`;
    btn.disabled = props.queueLength === 0;
    btn.innerHTML = `
      <span class="btn-icon">▶</span>
      <span class="btn-text">Process Queue</span>
      ${props.queueLength > 0 ? `<span class="queue-badge">${props.queueLength}</span>` : ''}
    `;

    if (!props.isAuthenticated) {
      btn.title = 'Sign in to upload to Drive';
    }

    btn.addEventListener('click', props.onProcessQueue);
  }

  return btn;
}

/**
 * Create a minimal queue indicator for the header
 */
export function createQueueIndicator(queueLength: number): HTMLElement {
  const indicator = document.createElement('div');
  indicator.className = 'queue-indicator';
  indicator.id = 'queue-indicator';

  if (queueLength > 0) {
    indicator.innerHTML = `
      <span class="queue-icon">📋</span>
      <span class="queue-count">${queueLength}</span>
    `;
    indicator.classList.add('has-items');
  } else {
    indicator.innerHTML = `<span class="queue-icon">📋</span>`;
  }

  return indicator;
}

/**
 * Update queue indicator with new count
 */
export function updateQueueIndicator(
  indicator: HTMLElement,
  queueLength: number
): void {
  if (queueLength > 0) {
    indicator.innerHTML = `
      <span class="queue-icon">📋</span>
      <span class="queue-count">${queueLength}</span>
    `;
    indicator.classList.add('has-items');
  } else {
    indicator.innerHTML = `<span class="queue-icon">📋</span>`;
    indicator.classList.remove('has-items');
  }
}

/**
 * Create a floating action button for adding to queue
 */
export function createFloatingAddButton(onClick: () => void): HTMLElement {
  const fab = document.createElement('button');
  fab.className = 'fab fab-add-queue';
  fab.title = 'Add to batch queue';
  fab.innerHTML = '+';
  fab.addEventListener('click', onClick);
  return fab;
}
