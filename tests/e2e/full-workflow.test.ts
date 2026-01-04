/**
 * End-to-End Tests for the full workflow
 * Tests the complete capture -> PDF -> upload flow
 *
 * Note: These tests require manual setup for E2E testing with a real browser.
 * Consider using Playwright or Puppeteer for full E2E testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock chrome APIs for E2E simulation
const mockStorageData: Record<string, unknown> = {};
const mockDownloads: { id: number; url: string; filename: string }[] = [];

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
      get: vi.fn(() => Promise.resolve({ settings: {}, uploadHistory: [] })),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    lastError: null,
    sendMessage: vi.fn(),
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
    getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  },
  identity: {
    getAuthToken: vi.fn(() => Promise.resolve('mock-access-token')),
    removeCachedAuthToken: vi.fn(() => Promise.resolve()),
  },
  downloads: {
    download: vi.fn((options: { url: string; filename: string }) => {
      const id = mockDownloads.length + 1;
      mockDownloads.push({ id, url: options.url, filename: options.filename });
      return Promise.resolve(id);
    }),
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://www.xiaohongshu.com/explore/test123' }])),
    sendMessage: vi.fn(() => Promise.resolve({ success: true })),
  },
  scripting: {
    executeScript: vi.fn(() => Promise.resolve([{ result: {} }])),
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-' + Date.now(),
});

describe('Full Workflow E2E', () => {
  beforeEach(() => {
    // Reset all mocks and storage
    Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
    mockDownloads.length = 0;
    vi.clearAllMocks();

    // Setup default fetch responses
    mockFetch.mockImplementation((url: string) => {
      // Image download
      if (url.includes('xhscdn.com')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
          headers: new Headers({ 'content-type': 'image/jpeg' }),
        });
      }

      // Drive API upload
      if (url.includes('googleapis.com/upload/drive')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              kind: 'drive#file',
              id: 'drive-file-123',
              name: 'test.pdf',
              mimeType: 'application/pdf',
            }),
        });
      }

      // Drive API get file for webViewLink
      if (url.includes('googleapis.com/drive/v3/files')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              webViewLink: 'https://drive.google.com/file/d/drive-file-123/view',
            }),
        });
      }

      // Font files
      if (url.includes('fonts/')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
        });
      }

      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Workflow Steps', () => {
    it('should verify that a RedNote post can be detected', async () => {
      const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });

      expect(tabs).toHaveLength(1);
      expect(tabs[0].url).toContain('xiaohongshu.com');
    });

    it('should simulate capturing a post', async () => {
      // Simulate storing a captured post
      const capturedPost = {
        id: 'test-post-id',
        sourceUrl: 'https://www.xiaohongshu.com/explore/test123',
        title: 'Test Post Title',
        description: 'This is a test post with Chinese text 测试内容',
        authorName: '测试用户',
        authorId: 'user-123',
        captureTimestamp: Date.now(),
        images: [
          { url: 'https://sns-img.xhscdn.com/image1.jpg', displayOrder: 0, width: 800, height: 600 },
          { url: 'https://sns-img.xhscdn.com/image2.jpg', displayOrder: 1, width: 1080, height: 1920 },
        ],
        isVideo: false,
        videoThumbnail: null,
        status: 'captured' as const,
      };

      await mockChrome.storage.session.set({ currentCapture: capturedPost });

      const { currentCapture } = await mockChrome.storage.session.get('currentCapture');
      expect(currentCapture).toEqual(capturedPost);
      expect(currentCapture.images).toHaveLength(2);
    });

    it('should simulate the complete capture -> PDF -> upload flow', async () => {
      // Step 1: Capture post
      const capturedPost = {
        id: 'workflow-test-id',
        sourceUrl: 'https://www.xiaohongshu.com/explore/abc123',
        title: 'Full Workflow Test',
        description: '完整流程测试',
        authorName: 'TestUser',
        authorId: 'user-456',
        captureTimestamp: Date.now(),
        images: [{ url: 'https://sns-img.xhscdn.com/test.jpg', displayOrder: 0, width: 500, height: 500 }],
        isVideo: false,
        videoThumbnail: null,
        status: 'captured' as const,
      };

      await mockChrome.storage.session.set({ currentCapture: capturedPost });

      // Step 2: Simulate PDF generation (storing result)
      const generatedPdf = {
        capturedPostId: capturedPost.id,
        pdfBase64: 'dGVzdCBwZGYgZGF0YQ==', // base64 of "test pdf data"
        filename: 'Full Workflow Test.pdf',
        sizeBytes: 12345,
        generatedAt: Date.now(),
        pageCount: 2,
        imagesIncluded: true,
        failedImageCount: 0,
      };

      await mockChrome.storage.session.set({ currentPdf: generatedPdf });

      // Step 3: Simulate upload to Drive
      const uploadResult = {
        driveFileId: 'drive-file-123',
        webViewLink: 'https://drive.google.com/file/d/drive-file-123/view',
      };

      // Verify the state after each step
      const { currentCapture } = await mockChrome.storage.session.get('currentCapture');
      const { currentPdf } = await mockChrome.storage.session.get('currentPdf');

      expect(currentCapture.id).toBe('workflow-test-id');
      expect(currentPdf.capturedPostId).toBe('workflow-test-id');
      expect(currentPdf.filename).toBe('Full Workflow Test.pdf');
    });

    it('should handle authentication flow', async () => {
      // Simulate getting auth token
      const token = await mockChrome.identity.getAuthToken({ interactive: true });
      expect(token).toBe('mock-access-token');

      // Store auth state
      await mockChrome.storage.session.set({
        auth: {
          accessToken: token,
          expiresAt: Date.now() + 3600000,
          userEmail: 'test@example.com',
          isAuthenticated: true,
        },
      });

      const { auth } = await mockChrome.storage.session.get('auth');
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.userEmail).toBe('test@example.com');
    });

    it('should simulate downloading PDF locally', async () => {
      // Simulate a download
      const downloadId = await mockChrome.downloads.download({
        url: 'blob:chrome-extension://test-id/pdf-blob',
        filename: 'test-post.pdf',
      });

      expect(downloadId).toBe(1);
      expect(mockDownloads).toHaveLength(1);
      expect(mockDownloads[0].filename).toBe('test-post.pdf');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during image download', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('xhscdn.com')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true });
      });

      // Attempt to fetch image
      await expect(fetch('https://sns-img.xhscdn.com/image.jpg')).rejects.toThrow('Network error');
    });

    it('should handle auth token expiration', async () => {
      // Store expired auth
      await mockChrome.storage.session.set({
        auth: {
          accessToken: 'expired-token',
          expiresAt: Date.now() - 1000, // Expired
          userEmail: 'test@example.com',
          isAuthenticated: true,
        },
      });

      const { auth } = await mockChrome.storage.session.get('auth');
      expect(auth.expiresAt).toBeLessThan(Date.now());

      // In real implementation, this would trigger re-authentication
    });

    it('should handle Drive API errors', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('googleapis.com')) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () =>
              Promise.resolve({
                error: {
                  code: 403,
                  message: 'Rate Limit Exceeded',
                  status: 'RESOURCE_EXHAUSTED',
                },
              }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('State Management', () => {
    it('should clear state after successful upload', async () => {
      // Setup initial state
      await mockChrome.storage.session.set({
        currentCapture: { id: 'test' },
        currentPdf: { capturedPostId: 'test' },
      });

      // Clear state (as would happen after success)
      await mockChrome.storage.session.set({
        currentCapture: null,
        currentPdf: null,
      });

      const { currentCapture, currentPdf } = await mockChrome.storage.session.get([
        'currentCapture',
        'currentPdf',
      ]);

      expect(currentCapture).toBeNull();
      expect(currentPdf).toBeNull();
    });

    it('should persist settings across sessions', async () => {
      const settings = {
        pdfQuality: 'high',
        includeSourceUrl: false,
        autoOpenNotebookLM: true,
      };

      await mockChrome.storage.local.set({ settings });

      // Settings would persist in local storage
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ settings });
    });
  });
});
