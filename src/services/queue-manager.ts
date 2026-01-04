import type { CapturedPost } from '../models/captured-post';
import type {
  PostQueue,
  QueueItem,
  QueueItemStatus,
  QueueItemResult,
} from '../models/post-queue';
import { createEmptyQueue } from '../models/post-queue';

const QUEUE_STORAGE_KEY = 'postQueue';

/**
 * Progress information for the queue
 */
export interface QueueProgress {
  /** Completion percentage (0-100) */
  percentage: number;

  /** Number of completed items (including failed) */
  completed: number;

  /** Total number of items */
  total: number;

  /** Number of successfully completed items */
  successCount: number;

  /** Number of failed items */
  failedCount: number;
}

/**
 * Create a new queue item from a captured post
 */
export function createQueueItem(post: CapturedPost): QueueItem {
  return {
    id: crypto.randomUUID(),
    postId: post.id,
    post,
    status: 'pending',
    addedAt: Date.now(),
    startedAt: null,
    result: null,
    error: null,
    retryCount: 0,
  };
}

/**
 * Calculate queue progress
 */
export function calculateQueueProgress(queue: PostQueue): QueueProgress {
  const total = queue.totalItems;
  const completed = queue.completedItems + queue.failedItems;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    percentage,
    completed,
    total,
    successCount: queue.completedItems,
    failedCount: queue.failedItems,
  };
}

/**
 * Recalculate queue totals from items
 */
function recalculateTotals(queue: PostQueue): void {
  queue.totalItems = queue.items.length;
  queue.pendingItems = queue.items.filter((i) => i.status === 'pending').length;
  queue.processingItems = queue.items.filter((i) => i.status === 'processing').length;
  queue.completedItems = queue.items.filter((i) => i.status === 'completed').length;
  queue.failedItems = queue.items.filter((i) => i.status === 'failed').length;
  queue.updatedAt = Date.now();
}

/**
 * Queue manager for handling batch post processing
 */
export class QueueManager {
  /**
   * Get the current queue from storage
   */
  async getQueue(): Promise<PostQueue> {
    const result = await chrome.storage.session.get(QUEUE_STORAGE_KEY);
    return (result[QUEUE_STORAGE_KEY] as PostQueue) ?? createEmptyQueue();
  }

  /**
   * Save the queue to storage
   */
  private async saveQueue(queue: PostQueue): Promise<void> {
    await chrome.storage.session.set({ [QUEUE_STORAGE_KEY]: queue });
  }

  /**
   * Add a captured post to the queue
   * Returns the created queue item, or existing item if already queued
   */
  async addToQueue(post: CapturedPost): Promise<QueueItem> {
    const queue = await this.getQueue();

    // Check if post is already in queue
    const existingItem = queue.items.find((item) => item.postId === post.id);
    if (existingItem) {
      return existingItem;
    }

    // Create new queue item
    const item = createQueueItem(post);
    queue.items.push(item);
    recalculateTotals(queue);

    await this.saveQueue(queue);
    return item;
  }

  /**
   * Remove an item from the queue by item ID
   */
  async removeFromQueue(itemId: string): Promise<void> {
    const queue = await this.getQueue();
    queue.items = queue.items.filter((item) => item.id !== itemId);
    recalculateTotals(queue);
    await this.saveQueue(queue);
  }

  /**
   * Update the status of a queue item
   */
  async updateItemStatus(
    itemId: string,
    status: QueueItemStatus,
    result?: Partial<QueueItemResult>,
    error?: string
  ): Promise<void> {
    const queue = await this.getQueue();
    const item = queue.items.find((i) => i.id === itemId);

    if (!item) {
      return;
    }

    item.status = status;

    if (status === 'processing' && item.startedAt === null) {
      item.startedAt = Date.now();
    }

    if (result) {
      item.result = {
        ...item.result,
        ...result,
        completedAt: Date.now(),
      };
    }

    if (error !== undefined) {
      item.error = error;
    }

    recalculateTotals(queue);
    await this.saveQueue(queue);
  }

  /**
   * Clear all items from the queue
   */
  async clearQueue(): Promise<void> {
    await this.saveQueue(createEmptyQueue());
  }

  /**
   * Clear only completed items from the queue
   */
  async clearCompletedItems(): Promise<void> {
    const queue = await this.getQueue();
    queue.items = queue.items.filter((item) => item.status !== 'completed');
    recalculateTotals(queue);
    await this.saveQueue(queue);
  }

  /**
   * Get all pending items (for batch processing)
   */
  async getPendingItems(): Promise<QueueItem[]> {
    const queue = await this.getQueue();
    return queue.items.filter((item) => item.status === 'pending');
  }

  /**
   * Get a specific queue item by ID
   */
  async getItem(itemId: string): Promise<QueueItem | null> {
    const queue = await this.getQueue();
    return queue.items.find((item) => item.id === itemId) ?? null;
  }

  /**
   * Retry failed items by resetting their status to pending
   */
  async retryFailedItems(): Promise<number> {
    const queue = await this.getQueue();
    let retriedCount = 0;

    for (const item of queue.items) {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.error = null;
        item.retryCount++;
        retriedCount++;
      }
    }

    if (retriedCount > 0) {
      recalculateTotals(queue);
      await this.saveQueue(queue);
    }

    return retriedCount;
  }

  /**
   * Get queue item count
   */
  async getItemCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.totalItems;
  }

  /**
   * Check if a post is already in the queue
   */
  async isPostInQueue(postId: string): Promise<boolean> {
    const queue = await this.getQueue();
    return queue.items.some((item) => item.postId === postId);
  }
}

// Singleton instance for use across the extension
let queueManagerInstance: QueueManager | null = null;

export function getQueueManager(): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager();
  }
  return queueManagerInstance;
}
