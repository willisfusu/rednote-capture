/**
 * Integration tests for batch processing
 * Tests for User Story 4 - Batch Collection Mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CapturedPost } from '../../src/models/captured-post';
import type { PostQueue, QueueItem } from '../../src/models/post-queue';

// Mock chrome APIs
const mockStorageData: Record<string, unknown> = {};
const mockChrome = {
  storage: {
    session: {
      get: vi.fn((keys: string | string[] | null) => {
        if (keys === null || keys === undefined) {
          return Promise.resolve(mockStorageData);
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorageData[keys] });
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStorageData) {
            result[key] = mockStorageData[key];
          }
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorageData, data);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        if (typeof keys === 'string') {
          delete mockStorageData[keys];
        } else {
          for (const key of keys) {
            delete mockStorageData[key];
          }
        }
        return Promise.resolve();
      }),
    },
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    lastError: null,
    sendMessage: vi.fn(),
  },
  identity: {
    getAuthToken: vi.fn(() => Promise.resolve('mock-token')),
  },
  downloads: {
    download: vi.fn(() => Promise.resolve(1)),
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock fetch for Drive API
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { QueueManager } from '../../src/services/queue-manager';
import { BatchProcessor, type BatchProcessorOptions, type BatchProgress } from '../../src/services/batch-processor';

describe('Batch Processing Integration', () => {
  let queueManager: QueueManager;
  let batchProcessor: BatchProcessor;

  const createMockPost = (id: string, title: string): CapturedPost => ({
    id,
    sourceUrl: `https://www.xiaohongshu.com/explore/${id}`,
    title,
    description: `Description for ${title}`,
    authorName: 'TestUser',
    authorId: 'user-123',
    captureTimestamp: Date.now(),
    images: [
      {
        url: `https://sns-img.xhscdn.com/${id}.jpg`,
        displayOrder: 0,
        width: 800,
        height: 600,
      },
    ],
    isVideo: false,
    videoThumbnail: null,
    status: 'captured',
  });

  beforeEach(() => {
    Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
    vi.clearAllMocks();

    queueManager = new QueueManager();
    batchProcessor = new BatchProcessor(queueManager);

    // Default mock responses
    mockFetch.mockImplementation((url: string) => {
      // Mock image download
      if (url.includes('xhscdn.com')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Headers({ 'content-type': 'image/jpeg' }),
        });
      }
      // Mock Drive API upload
      if (url.includes('googleapis.com/upload/drive')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              kind: 'drive#file',
              id: 'drive-file-' + Date.now(),
              name: 'test.pdf',
              mimeType: 'application/pdf',
            }),
        });
      }
      // Mock Drive API get file
      if (url.includes('googleapis.com/drive/v3/files')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              webViewLink: 'https://drive.google.com/file/d/mock/view',
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Queue to PDF to Upload flow', () => {
    it('should add posts to queue and track them', async () => {
      const post1 = createMockPost('post-1', 'First Post');
      const post2 = createMockPost('post-2', 'Second Post');
      const post3 = createMockPost('post-3', 'Third Post');

      await queueManager.addToQueue(post1);
      await queueManager.addToQueue(post2);
      await queueManager.addToQueue(post3);

      const queue = await queueManager.getQueue();

      expect(queue.totalItems).toBe(3);
      expect(queue.pendingItems).toBe(3);
      expect(queue.items.every((item) => item.status === 'pending')).toBe(true);
    });

    it('should process queue items sequentially with progress updates', async () => {
      const post1 = createMockPost('post-1', 'First Post');
      const post2 = createMockPost('post-2', 'Second Post');

      await queueManager.addToQueue(post1);
      await queueManager.addToQueue(post2);

      const progressUpdates: BatchProgress[] = [];

      const options: BatchProcessorOptions = {
        uploadToDrive: false, // Skip upload for this test
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      };

      await batchProcessor.processQueue(options);

      // Should have progress updates for each item
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Final state should show all items processed
      const queue = await queueManager.getQueue();
      expect(queue.completedItems + queue.failedItems).toBe(2);
    });

    it('should handle batch processing with Drive upload', async () => {
      const post = createMockPost('post-1', 'Upload Test Post');

      await queueManager.addToQueue(post);

      const options: BatchProcessorOptions = {
        uploadToDrive: true,
        onProgress: vi.fn(),
      };

      await batchProcessor.processQueue(options);

      const queue = await queueManager.getQueue();

      // Check that the item was processed
      expect(queue.items[0].status).toBe('completed');
      expect(queue.items[0].result?.driveFileId).toBeDefined();
    });

    it('should continue processing after individual item failure', async () => {
      const post1 = createMockPost('post-1', 'First Post');
      const post2 = createMockPost('post-2', 'Second Post');
      const post3 = createMockPost('post-3', 'Third Post');

      await queueManager.addToQueue(post1);
      await queueManager.addToQueue(post2);
      await queueManager.addToQueue(post3);

      // Make the second post fail during image download
      let callCount = 0;
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('xhscdn.com')) {
          callCount++;
          if (callCount === 2) {
            // Fail on second image download (post2)
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
            headers: new Headers({ 'content-type': 'image/jpeg' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const options: BatchProcessorOptions = {
        uploadToDrive: false,
        onProgress: vi.fn(),
        continueOnError: true,
      };

      await batchProcessor.processQueue(options);

      const queue = await queueManager.getQueue();

      // Should have processed all items despite one failure
      expect(queue.completedItems + queue.failedItems).toBe(3);
      expect(queue.failedItems).toBeGreaterThanOrEqual(1);
    });

    it('should stop processing when cancelled', async () => {
      const posts = Array.from({ length: 5 }, (_, i) =>
        createMockPost(`post-${i}`, `Post ${i}`)
      );

      for (const post of posts) {
        await queueManager.addToQueue(post);
      }

      // Slow down processing to allow cancellation
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
                  headers: new Headers({ 'content-type': 'image/jpeg' }),
                }),
              100
            )
          )
      );

      const options: BatchProcessorOptions = {
        uploadToDrive: false,
        onProgress: vi.fn(),
      };

      // Start processing and cancel after a short delay
      const processPromise = batchProcessor.processQueue(options);

      setTimeout(() => {
        batchProcessor.cancel();
      }, 50);

      await processPromise;

      const queue = await queueManager.getQueue();

      // Should have stopped before processing all items
      expect(queue.completedItems + queue.failedItems).toBeLessThan(5);
    });
  });

  describe('Batch progress tracking', () => {
    it('should report accurate progress during batch processing', async () => {
      const posts = Array.from({ length: 3 }, (_, i) =>
        createMockPost(`post-${i}`, `Post ${i}`)
      );

      for (const post of posts) {
        await queueManager.addToQueue(post);
      }

      const progressUpdates: BatchProgress[] = [];

      const options: BatchProcessorOptions = {
        uploadToDrive: false,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      };

      await batchProcessor.processQueue(options);

      // Should have incremental progress
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Final progress should show 100% completion
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.percentage).toBe(100);
      expect(finalProgress.completed).toBe(3);
      expect(finalProgress.total).toBe(3);
    });

    it('should track current item during processing', async () => {
      const post = createMockPost('single-post', 'Single Post');

      await queueManager.addToQueue(post);

      let currentItem: string | null = null;

      const options: BatchProcessorOptions = {
        uploadToDrive: false,
        onProgress: (progress) => {
          if (progress.currentItem) {
            currentItem = progress.currentItem;
          }
        },
      };

      await batchProcessor.processQueue(options);

      expect(currentItem).toBe('Single Post');
    });
  });

  describe('Error handling', () => {
    it('should set error message on failed items', async () => {
      const post = createMockPost('fail-post', 'Will Fail');

      await queueManager.addToQueue(post);

      mockFetch.mockRejectedValue(new Error('PDF generation failed'));

      const options: BatchProcessorOptions = {
        uploadToDrive: false,
        onProgress: vi.fn(),
      };

      await batchProcessor.processQueue(options);

      const queue = await queueManager.getQueue();

      expect(queue.items[0].status).toBe('failed');
      expect(queue.items[0].error).toBeDefined();
    });

    it('should retry failed items when requested', async () => {
      const post = createMockPost('retry-post', 'Retry Test');

      await queueManager.addToQueue(post);

      // Fail first attempt
      let attempts = 0;
      mockFetch.mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Headers({ 'content-type': 'image/jpeg' }),
        });
      });

      const options: BatchProcessorOptions = {
        uploadToDrive: false,
        onProgress: vi.fn(),
        maxRetries: 2,
      };

      await batchProcessor.processQueue(options);

      const queue = await queueManager.getQueue();

      // Should have succeeded on retry
      expect(queue.items[0].status).toBe('completed');
    });
  });
});
