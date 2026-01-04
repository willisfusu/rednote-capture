/**
 * Queue Handlers - Manages batch processing queue operations
 */

import type { Response } from '../../types/messages';
import type { CapturedPost } from '../../models/captured-post';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { getQueueManager, calculateQueueProgress } from '../../services/queue-manager';
import { getBatchProcessor, type BatchProgress } from '../../services/batch-processor';
import { getQueueStatus } from '../../models/post-queue';

/**
 * Add a post to the queue payload
 */
interface AddToQueuePayload {
  post?: CapturedPost;
  useCurrentCapture?: boolean;
}

/**
 * Process queue payload
 */
interface ProcessQueuePayload {
  uploadToDrive?: boolean;
  folderId?: string;
}

/**
 * Handle adding a post to the queue
 */
export async function handleAddToQueue(
  payload: unknown,
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();

  // Parse payload
  const { post, useCurrentCapture } = (payload as AddToQueuePayload) || {};

  let postToAdd: CapturedPost | null = null;

  if (post) {
    postToAdd = post;
  } else if (useCurrentCapture) {
    // Get current capture from session storage
    const { currentCapture } = await chrome.storage.session.get('currentCapture');
    if (!currentCapture) {
      return createErrorResponse(
        ErrorCode.NO_CAPTURE,
        'No current capture to add to queue',
        requestId
      );
    }
    postToAdd = currentCapture as CapturedPost;
  }

  if (!postToAdd) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'No post provided to add to queue',
      requestId
    );
  }

  // Check if already in queue
  const isInQueue = await queueManager.isPostInQueue(postToAdd.id);
  if (isInQueue) {
    return {
      success: true,
      data: {
        message: 'Post already in queue',
        alreadyQueued: true,
      },
      requestId,
    };
  }

  // Add to queue
  const queueItem = await queueManager.addToQueue(postToAdd);

  // Get updated queue info
  const queue = await queueManager.getQueue();

  return {
    success: true,
    data: {
      queueItem,
      queueLength: queue.totalItems,
      message: 'Post added to queue',
    },
    requestId,
  };
}

/**
 * Handle processing the queue
 */
export async function handleProcessQueue(
  payload: unknown,
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();
  const batchProcessor = getBatchProcessor(queueManager);

  // Check if already processing
  if (batchProcessor.isProcessing()) {
    return createErrorResponse(
      ErrorCode.PROCESSING_IN_PROGRESS,
      'Batch processing already in progress',
      requestId
    );
  }

  // Parse options
  const { uploadToDrive = true, folderId } = (payload as ProcessQueuePayload) || {};

  // Check if there are items to process
  const pendingItems = await queueManager.getPendingItems();
  if (pendingItems.length === 0) {
    return {
      success: true,
      data: {
        message: 'No items to process',
        progress: {
          percentage: 100,
          completed: 0,
          total: 0,
          successCount: 0,
          failedCount: 0,
        },
      },
      requestId,
    };
  }

  // Start processing (this returns immediately, processing happens async)
  const progressPromise = batchProcessor.processQueue({
    uploadToDrive,
    folderId,
    continueOnError: true,
    maxRetries: 2,
    onProgress: (progress: BatchProgress) => {
      // Store progress in session for popup to read
      void chrome.storage.session.set({ batchProgress: progress });
    },
  });

  // Don't await - return immediately with initial status
  void progressPromise.then(async (finalProgress) => {
    // Store final progress
    await chrome.storage.session.set({
      batchProgress: finalProgress,
      batchComplete: true,
    });
  });

  return {
    success: true,
    data: {
      message: 'Processing started',
      itemCount: pendingItems.length,
    },
    requestId,
  };
}

/**
 * Handle getting queue status
 */
export async function handleGetQueueStatus(
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();
  const batchProcessor = getBatchProcessor(queueManager);

  const queue = await queueManager.getQueue();
  const progress = calculateQueueProgress(queue);
  const status = getQueueStatus(queue);

  // Get batch progress if processing
  const { batchProgress, batchComplete } = await chrome.storage.session.get([
    'batchProgress',
    'batchComplete',
  ]);

  return {
    success: true,
    data: {
      queue,
      progress,
      status,
      isProcessing: batchProcessor.isProcessing(),
      batchProgress: batchProgress || null,
      batchComplete: batchComplete || false,
    },
    requestId,
  };
}

/**
 * Handle removing an item from the queue
 */
export async function handleRemoveFromQueue(
  payload: unknown,
  requestId?: string
): Promise<Response> {
  const { itemId } = (payload as { itemId?: string }) || {};

  if (!itemId) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Item ID is required',
      requestId
    );
  }

  const queueManager = getQueueManager();
  await queueManager.removeFromQueue(itemId);

  const queue = await queueManager.getQueue();

  return {
    success: true,
    data: {
      message: 'Item removed from queue',
      queueLength: queue.totalItems,
    },
    requestId,
  };
}

/**
 * Handle clearing the queue
 */
export async function handleClearQueue(
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();
  await queueManager.clearQueue();

  // Clear batch progress
  await chrome.storage.session.remove(['batchProgress', 'batchComplete']);

  return {
    success: true,
    data: {
      message: 'Queue cleared',
    },
    requestId,
  };
}

/**
 * Handle clearing completed items
 */
export async function handleClearCompletedItems(
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();
  await queueManager.clearCompletedItems();

  const queue = await queueManager.getQueue();

  return {
    success: true,
    data: {
      message: 'Completed items cleared',
      remainingItems: queue.totalItems,
    },
    requestId,
  };
}

/**
 * Handle retrying failed items
 */
export async function handleRetryFailedItems(
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();
  const retriedCount = await queueManager.retryFailedItems();

  return {
    success: true,
    data: {
      message: `${retriedCount} items reset for retry`,
      retriedCount,
    },
    requestId,
  };
}

/**
 * Handle cancelling batch processing
 */
export async function handleCancelProcessing(
  requestId?: string
): Promise<Response> {
  const queueManager = getQueueManager();
  const batchProcessor = getBatchProcessor(queueManager);

  if (!batchProcessor.isProcessing()) {
    return {
      success: true,
      data: {
        message: 'No processing in progress',
      },
      requestId,
    };
  }

  batchProcessor.cancel();

  return {
    success: true,
    data: {
      message: 'Processing cancelled',
    },
    requestId,
  };
}
