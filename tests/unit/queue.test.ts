/**
 * Unit tests for post queue management
 * Tests for User Story 4 - Batch Collection Mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CapturedPost } from '../../src/models/captured-post';
import type { PostQueue, QueueItem, QueueStatus } from '../../src/models/post-queue';

// Mock chrome.storage.session
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
  },
  runtime: {
    lastError: null,
  },
};

vi.stubGlobal('chrome', mockChrome);

// Import after mocking chrome
import {
  QueueManager,
  createQueueItem,
  calculateQueueProgress,
} from '../../src/services/queue-manager';

describe('Queue Management', () => {
  let queueManager: QueueManager;

  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
    vi.clearAllMocks();
    queueManager = new QueueManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createQueueItem', () => {
    it('should create a queue item from a captured post', () => {
      const post: CapturedPost = {
        id: 'post-123',
        sourceUrl: 'https://www.xiaohongshu.com/explore/abc123',
        title: 'Test Post',
        description: 'Test description',
        authorName: 'TestUser',
        authorId: 'user-123',
        captureTimestamp: Date.now(),
        images: [],
        isVideo: false,
        videoThumbnail: null,
        status: 'captured',
      };

      const item = createQueueItem(post);

      expect(item.id).toBeDefined();
      expect(item.postId).toBe('post-123');
      expect(item.post).toEqual(post);
      expect(item.status).toBe('pending');
      expect(item.addedAt).toBeGreaterThan(0);
      expect(item.error).toBeNull();
    });
  });

  describe('QueueManager', () => {
    const mockPost: CapturedPost = {
      id: 'post-123',
      sourceUrl: 'https://www.xiaohongshu.com/explore/abc123',
      title: 'Test Post',
      description: 'Test description',
      authorName: 'TestUser',
      authorId: 'user-123',
      captureTimestamp: Date.now(),
      images: [],
      isVideo: false,
      videoThumbnail: null,
      status: 'captured',
    };

    describe('addToQueue', () => {
      it('should add a post to the queue', async () => {
        const item = await queueManager.addToQueue(mockPost);

        expect(item.postId).toBe('post-123');
        expect(item.status).toBe('pending');

        const queue = await queueManager.getQueue();
        expect(queue.items).toHaveLength(1);
        expect(queue.items[0].postId).toBe('post-123');
      });

      it('should not add duplicate posts to the queue', async () => {
        await queueManager.addToQueue(mockPost);
        await queueManager.addToQueue(mockPost);

        const queue = await queueManager.getQueue();
        expect(queue.items).toHaveLength(1);
      });

      it('should add multiple different posts to the queue', async () => {
        const post2: CapturedPost = { ...mockPost, id: 'post-456' };
        const post3: CapturedPost = { ...mockPost, id: 'post-789' };

        await queueManager.addToQueue(mockPost);
        await queueManager.addToQueue(post2);
        await queueManager.addToQueue(post3);

        const queue = await queueManager.getQueue();
        expect(queue.items).toHaveLength(3);
      });

      it('should update queue totals when adding items', async () => {
        await queueManager.addToQueue(mockPost);

        const queue = await queueManager.getQueue();
        expect(queue.totalItems).toBe(1);
        expect(queue.pendingItems).toBe(1);
        expect(queue.completedItems).toBe(0);
        expect(queue.failedItems).toBe(0);
      });
    });

    describe('removeFromQueue', () => {
      it('should remove an item from the queue', async () => {
        const item = await queueManager.addToQueue(mockPost);
        await queueManager.removeFromQueue(item.id);

        const queue = await queueManager.getQueue();
        expect(queue.items).toHaveLength(0);
      });

      it('should handle removing non-existent item gracefully', async () => {
        await expect(queueManager.removeFromQueue('non-existent')).resolves.not.toThrow();
      });
    });

    describe('updateItemStatus', () => {
      it('should update item status to processing', async () => {
        const item = await queueManager.addToQueue(mockPost);
        await queueManager.updateItemStatus(item.id, 'processing');

        const queue = await queueManager.getQueue();
        expect(queue.items[0].status).toBe('processing');
      });

      it('should update item status to completed', async () => {
        const item = await queueManager.addToQueue(mockPost);
        await queueManager.updateItemStatus(item.id, 'completed', {
          driveFileId: 'drive-123',
          webViewLink: 'https://drive.google.com/file/d/123/view',
        });

        const queue = await queueManager.getQueue();
        expect(queue.items[0].status).toBe('completed');
        expect(queue.items[0].result?.driveFileId).toBe('drive-123');
        expect(queue.completedItems).toBe(1);
      });

      it('should update item status to failed with error', async () => {
        const item = await queueManager.addToQueue(mockPost);
        await queueManager.updateItemStatus(item.id, 'failed', undefined, 'Upload failed');

        const queue = await queueManager.getQueue();
        expect(queue.items[0].status).toBe('failed');
        expect(queue.items[0].error).toBe('Upload failed');
        expect(queue.failedItems).toBe(1);
      });
    });

    describe('clearQueue', () => {
      it('should clear all items from the queue', async () => {
        await queueManager.addToQueue(mockPost);
        await queueManager.addToQueue({ ...mockPost, id: 'post-456' });

        await queueManager.clearQueue();

        const queue = await queueManager.getQueue();
        expect(queue.items).toHaveLength(0);
        expect(queue.totalItems).toBe(0);
      });
    });

    describe('clearCompletedItems', () => {
      it('should remove only completed items from the queue', async () => {
        const item1 = await queueManager.addToQueue(mockPost);
        const item2 = await queueManager.addToQueue({ ...mockPost, id: 'post-456' });

        await queueManager.updateItemStatus(item1.id, 'completed');

        await queueManager.clearCompletedItems();

        const queue = await queueManager.getQueue();
        expect(queue.items).toHaveLength(1);
        expect(queue.items[0].postId).toBe('post-456');
      });
    });

    describe('getPendingItems', () => {
      it('should return only pending items', async () => {
        const item1 = await queueManager.addToQueue(mockPost);
        await queueManager.addToQueue({ ...mockPost, id: 'post-456' });
        await queueManager.addToQueue({ ...mockPost, id: 'post-789' });

        await queueManager.updateItemStatus(item1.id, 'completed');

        const pending = await queueManager.getPendingItems();
        expect(pending).toHaveLength(2);
        expect(pending.every((item) => item.status === 'pending')).toBe(true);
      });
    });
  });

  describe('calculateQueueProgress', () => {
    it('should calculate progress for empty queue', () => {
      const queue: PostQueue = {
        items: [],
        totalItems: 0,
        pendingItems: 0,
        processingItems: 0,
        completedItems: 0,
        failedItems: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const progress = calculateQueueProgress(queue);

      expect(progress.percentage).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
    });

    it('should calculate progress for partially completed queue', () => {
      const queue: PostQueue = {
        items: [],
        totalItems: 10,
        pendingItems: 3,
        processingItems: 2,
        completedItems: 4,
        failedItems: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const progress = calculateQueueProgress(queue);

      expect(progress.percentage).toBe(50); // (4 completed + 1 failed) / 10
      expect(progress.completed).toBe(5); // completed + failed = done
      expect(progress.total).toBe(10);
      expect(progress.successCount).toBe(4);
      expect(progress.failedCount).toBe(1);
    });

    it('should calculate progress for fully completed queue', () => {
      const queue: PostQueue = {
        items: [],
        totalItems: 5,
        pendingItems: 0,
        processingItems: 0,
        completedItems: 5,
        failedItems: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const progress = calculateQueueProgress(queue);

      expect(progress.percentage).toBe(100);
      expect(progress.completed).toBe(5);
      expect(progress.total).toBe(5);
    });
  });
});
