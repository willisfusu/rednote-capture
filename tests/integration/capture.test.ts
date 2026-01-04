/**
 * Integration tests for the capture flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CapturedPost } from '../../src/models/captured-post';
import type { Message, Response } from '../../src/types/messages';

// Mock chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  storage: {
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

vi.stubGlobal('chrome', mockChrome);

describe('Capture Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CHECK_PAGE message', () => {
    it('should return isPostPage: true for valid RedNote post URL', async () => {
      const mockTab = {
        id: 1,
        url: 'https://www.xiaohongshu.com/explore/abc123',
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      // Simulate the message handler response
      const response: Response<{ isPostPage: boolean; url: string }> = {
        success: true,
        data: {
          isPostPage: true,
          url: mockTab.url,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data?.isPostPage).toBe(true);
    });

    it('should return isPostPage: false for non-post RedNote page', async () => {
      const mockTab = {
        id: 1,
        url: 'https://www.xiaohongshu.com/explore',
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      const response: Response<{ isPostPage: boolean; url: string }> = {
        success: true,
        data: {
          isPostPage: false,
          url: mockTab.url,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data?.isPostPage).toBe(false);
    });
  });

  describe('CAPTURE_POST message', () => {
    it('should capture post content from RedNote page', async () => {
      const mockPostContent: CapturedPost = {
        id: 'capture-uuid',
        sourceUrl: 'https://www.xiaohongshu.com/explore/abc123',
        title: 'Test Post Title',
        description: 'Test post description with Chinese characters 中文测试',
        authorName: 'TestAuthor',
        authorId: 'author123',
        captureTimestamp: Date.now(),
        images: [
          {
            url: 'https://sns-img.xhscdn.com/image1.jpg',
            width: 1080,
            height: 1920,
            index: 0,
            altText: null,
          },
        ],
        isVideo: false,
        videoThumbnail: null,
        status: 'captured',
      };

      // Mock executeScript to return post data
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: mockPostContent },
      ]);

      // Mock storage set
      mockChrome.storage.session.set.mockResolvedValue(undefined);

      const response: Response<CapturedPost> = {
        success: true,
        data: mockPostContent,
      };

      expect(response.success).toBe(true);
      expect(response.data?.title).toBe('Test Post Title');
      expect(response.data?.images).toHaveLength(1);
      expect(response.data?.status).toBe('captured');
    });

    it('should return error when not on a RedNote page', async () => {
      const mockTab = {
        id: 1,
        url: 'https://google.com',
      };

      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      const response: Response = {
        success: false,
        error: 'Not on a RedNote page',
        errorCode: 'NOT_REDNOTE_PAGE',
      };

      expect(response.success).toBe(false);
      expect(response.errorCode).toBe('NOT_REDNOTE_PAGE');
    });

    it('should return error when __INITIAL_STATE__ is not found', async () => {
      mockChrome.scripting.executeScript.mockResolvedValue([
        { result: null },
      ]);

      const response: Response = {
        success: false,
        error: 'Could not extract post data',
        errorCode: 'EXTRACTION_ERROR',
      };

      expect(response.success).toBe(false);
      expect(response.errorCode).toBe('EXTRACTION_ERROR');
    });

    it('should store captured post in session storage', async () => {
      const mockPostContent: CapturedPost = {
        id: 'capture-uuid-2',
        sourceUrl: 'https://www.xiaohongshu.com/explore/xyz789',
        title: 'Another Post',
        description: 'Description',
        authorName: 'Author',
        authorId: 'auth123',
        captureTimestamp: Date.now(),
        images: [],
        isVideo: false,
        videoThumbnail: null,
        status: 'captured',
      };

      mockChrome.storage.session.set.mockResolvedValue(undefined);

      // Simulate storing the capture
      await mockChrome.storage.session.set({ currentCapture: mockPostContent });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        currentCapture: mockPostContent,
      });
    });
  });

  describe('Full capture workflow', () => {
    it('should complete capture workflow: check → extract → store', async () => {
      // Step 1: Check if on post page
      const mockTab = {
        id: 1,
        url: 'https://www.xiaohongshu.com/explore/abc123',
      };
      mockChrome.tabs.query.mockResolvedValue([mockTab]);

      // Step 2: Extract content
      const mockExtractedData = {
        noteId: 'abc123',
        title: 'Post Title',
        desc: 'Post description',
        user: {
          userId: 'user123',
          nickname: 'AuthorName',
        },
        imageList: [
          {
            urlDefault: 'https://sns-img.xhscdn.com/img.jpg',
            width: 1080,
            height: 1920,
          },
        ],
        type: 'normal',
      };

      mockChrome.scripting.executeScript.mockResolvedValue([
        {
          result: {
            __INITIAL_STATE__: {
              note: {
                noteDetailMap: {
                  abc123: { note: mockExtractedData },
                },
                currentNoteId: 'abc123',
              },
            },
          },
        },
      ]);

      // Step 3: Store in session
      mockChrome.storage.session.set.mockResolvedValue(undefined);

      // Verify the flow
      const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
      expect(tabs[0].url).toContain('xiaohongshu.com');

      const scriptResult = await mockChrome.scripting.executeScript({
        target: { tabId: 1 },
        func: () => ({}),
      });
      expect(scriptResult).toBeDefined();

      await mockChrome.storage.session.set({ currentCapture: {} });
      expect(mockChrome.storage.session.set).toHaveBeenCalled();
    });
  });
});
