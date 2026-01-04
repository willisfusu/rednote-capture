/**
 * Batch Processor Service
 * Handles batch processing of queued posts into PDFs and optional upload to Drive
 */

import type { QueueItem } from '../models/post-queue';
import { QueueManager } from './queue-manager';
import { generatePdf, base64ToUint8Array } from './pdf-generator';
import { uploadToDrive } from './drive-uploader';
import { getAccessToken } from './google-auth';

/**
 * Progress information during batch processing
 */
export interface BatchProgress {
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

  /** Current item being processed (title) */
  currentItem: string | null;

  /** Current processing phase */
  phase: 'idle' | 'generating_pdf' | 'uploading' | 'complete';

  /** Is processing cancelled */
  cancelled: boolean;
}

/**
 * Options for batch processing
 */
export interface BatchProcessorOptions {
  /** Whether to upload PDFs to Google Drive */
  uploadToDrive: boolean;

  /** Target folder ID for uploads */
  folderId?: string;

  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void;

  /** Continue processing even if some items fail */
  continueOnError?: boolean;

  /** Maximum retry attempts per item */
  maxRetries?: number;
}

/**
 * Batch processor for handling multiple posts
 */
export class BatchProcessor {
  private queueManager: QueueManager;
  private cancelled = false;
  private processing = false;

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
  }

  /**
   * Process all pending items in the queue
   */
  async processQueue(options: BatchProcessorOptions): Promise<BatchProgress> {
    const {
      uploadToDrive: shouldUpload,
      folderId,
      onProgress,
      continueOnError = true,
      maxRetries = 1,
    } = options;

    this.cancelled = false;
    this.processing = true;

    const pendingItems = await this.queueManager.getPendingItems();
    const total = pendingItems.length;

    const progress: BatchProgress = {
      percentage: 0,
      completed: 0,
      total,
      successCount: 0,
      failedCount: 0,
      currentItem: null,
      phase: 'idle',
      cancelled: false,
    };

    if (total === 0) {
      progress.phase = 'complete';
      progress.percentage = 100;
      onProgress?.(progress);
      this.processing = false;
      return progress;
    }

    for (const item of pendingItems) {
      // Check if cancelled
      if (this.cancelled) {
        progress.cancelled = true;
        progress.phase = 'complete';
        onProgress?.(progress);
        break;
      }

      progress.currentItem = item.post.title;

      // Process with retries
      let success = false;
      let lastError: string | undefined;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          success = await this.processItem(item, shouldUpload, folderId, progress, onProgress);
          if (success) break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
          if (attempt < maxRetries - 1) {
            // Wait before retry
            await this.delay(1000 * (attempt + 1));
          }
        }
      }

      if (success) {
        progress.successCount++;
        await this.queueManager.updateItemStatus(item.id, 'completed', {
          completedAt: Date.now(),
        });
      } else {
        progress.failedCount++;
        await this.queueManager.updateItemStatus(item.id, 'failed', undefined, lastError);
      }

      progress.completed++;
      progress.percentage = Math.round((progress.completed / total) * 100);
      onProgress?.(progress);

      // Stop if not continuing on error
      if (!success && !continueOnError) {
        break;
      }
    }

    progress.phase = 'complete';
    progress.currentItem = null;
    onProgress?.(progress);

    this.processing = false;
    return progress;
  }

  /**
   * Process a single queue item
   */
  private async processItem(
    item: QueueItem,
    shouldUpload: boolean,
    folderId: string | undefined,
    progress: BatchProgress,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<boolean> {
    // Update status to processing
    await this.queueManager.updateItemStatus(item.id, 'processing');

    // Generate PDF
    progress.phase = 'generating_pdf';
    onProgress?.(progress);

    const pdfResult = await generatePdf(item.post);

    // Convert base64 to Uint8Array for creating blob
    const pdfBytes = base64ToUint8Array(pdfResult.pdfBase64);
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    // Store PDF result
    await this.queueManager.updateItemStatus(item.id, 'processing', {
      pdfFilename: pdfResult.filename,
      pdfSizeBytes: pdfResult.sizeBytes,
    });

    // Upload to Drive if requested
    if (shouldUpload) {
      progress.phase = 'uploading';
      onProgress?.(progress);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const uploadResult = await uploadToDrive(pdfBlob, pdfResult.filename, {
        accessToken,
        folderId,
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      await this.queueManager.updateItemStatus(item.id, 'processing', {
        driveFileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
      });
    }

    return true;
  }

  /**
   * Cancel the current batch processing
   */
  cancel(): void {
    if (this.processing) {
      this.cancelled = true;
    }
  }

  /**
   * Check if batch processing is in progress
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Check if batch processing was cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
let batchProcessorInstance: BatchProcessor | null = null;

export function getBatchProcessor(queueManager: QueueManager): BatchProcessor {
  if (!batchProcessorInstance) {
    batchProcessorInstance = new BatchProcessor(queueManager);
  }
  return batchProcessorInstance;
}
