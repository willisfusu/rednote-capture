import type { CapturedPost } from './captured-post';

/**
 * Status of an individual queue item
 */
export type QueueItemStatus =
  | 'pending' // Waiting to be processed
  | 'processing' // Currently being processed
  | 'completed' // Successfully processed
  | 'failed'; // Processing failed

/**
 * Result of a successfully processed queue item
 */
export interface QueueItemResult {
  /** PDF blob URL (for download) */
  pdfBlobUrl?: string;

  /** PDF filename */
  pdfFilename?: string;

  /** PDF size in bytes */
  pdfSizeBytes?: number;

  /** Google Drive file ID (if uploaded) */
  driveFileId?: string;

  /** Google Drive web view link (if uploaded) */
  webViewLink?: string;

  /** Processing completed timestamp */
  completedAt: number;
}

/**
 * An individual item in the processing queue
 */
export interface QueueItem {
  /** Unique queue item ID (UUID) */
  id: string;

  /** ID of the captured post */
  postId: string;

  /** The full captured post data */
  post: CapturedPost;

  /** Current processing status */
  status: QueueItemStatus;

  /** When the item was added to the queue */
  addedAt: number;

  /** When processing started (null if not started) */
  startedAt: number | null;

  /** Processing result (populated on success) */
  result: QueueItemResult | null;

  /** Error message (populated on failure) */
  error: string | null;

  /** Number of retry attempts */
  retryCount: number;
}

/**
 * The batch processing queue
 */
export interface PostQueue {
  /** All items in the queue */
  items: QueueItem[];

  /** Total number of items */
  totalItems: number;

  /** Number of pending items */
  pendingItems: number;

  /** Number of currently processing items */
  processingItems: number;

  /** Number of completed items */
  completedItems: number;

  /** Number of failed items */
  failedItems: number;

  /** When the queue was created */
  createdAt: number;

  /** When the queue was last updated */
  updatedAt: number;
}

/**
 * Status of the overall queue for display
 */
export type QueueStatus = 'empty' | 'pending' | 'processing' | 'completed' | 'partial_failure';

/**
 * Get the overall status of a queue
 */
export function getQueueStatus(queue: PostQueue): QueueStatus {
  if (queue.totalItems === 0) {
    return 'empty';
  }

  if (queue.processingItems > 0) {
    return 'processing';
  }

  if (queue.pendingItems > 0) {
    return 'pending';
  }

  if (queue.failedItems > 0) {
    return 'partial_failure';
  }

  return 'completed';
}

/**
 * Create an empty queue
 */
export function createEmptyQueue(): PostQueue {
  const now = Date.now();
  return {
    items: [],
    totalItems: 0,
    pendingItems: 0,
    processingItems: 0,
    completedItems: 0,
    failedItems: 0,
    createdAt: now,
    updatedAt: now,
  };
}
