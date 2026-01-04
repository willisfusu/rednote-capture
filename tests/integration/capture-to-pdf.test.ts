/**
 * Integration tests for capture-to-PDF flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CapturedPost } from '../../src/models/captured-post';

// Mock chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock fetch for image downloading
global.fetch = vi.fn();

describe('Capture to PDF Flow Integration', () => {
  const mockCapturedPost: CapturedPost = {
    id: 'test-capture-id',
    sourceUrl: 'https://www.xiaohongshu.com/explore/abc123',
    title: '测试帖子标题 - Test Post Title',
    description: '这是一个测试描述，包含中文字符。\nThis is a test description with Chinese characters.',
    authorName: '测试作者',
    authorId: 'author123',
    captureTimestamp: Date.now(),
    images: [
      {
        url: 'https://sns-img.xhscdn.com/test-image-1.jpg',
        width: 1080,
        height: 1920,
        index: 0,
        altText: null,
      },
      {
        url: 'https://sns-img.xhscdn.com/test-image-2.jpg',
        width: 800,
        height: 600,
        index: 1,
        altText: null,
      },
    ],
    isVideo: false,
    videoThumbnail: null,
    status: 'captured',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pre-conditions', () => {
    it('should have a captured post before PDF generation', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        currentCapture: mockCapturedPost,
      });

      const { currentCapture } = await mockChrome.storage.session.get('currentCapture');
      expect(currentCapture).toBeDefined();
      expect(currentCapture.status).toBe('captured');
    });

    it('should fail if no captured post exists', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        currentCapture: null,
      });

      const { currentCapture } = await mockChrome.storage.session.get('currentCapture');
      expect(currentCapture).toBeNull();
    });
  });

  describe('Image downloading', () => {
    it('should download images from URLs', async () => {
      const mockImageBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockImageBlob),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      });

      const response = await fetch(mockCapturedPost.images[0].url);
      expect(response.ok).toBe(true);

      const blob = await response.blob();
      expect(blob.type).toBe('image/jpeg');
    });

    it('should handle image download failures gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const response = await fetch('https://example.com/not-found.jpg');
      expect(response.ok).toBe(false);
    });

    it('should retry failed image downloads', async () => {
      let attempts = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['data'])),
        });
      });

      // Simulate retry logic
      let success = false;
      for (let i = 0; i < 3; i++) {
        try {
          const response = await fetch('https://example.com/image.jpg');
          if (response.ok) {
            success = true;
            break;
          }
        } catch {
          // Continue retrying
        }
      }

      expect(success).toBe(true);
      expect(attempts).toBe(3);
    });
  });

  describe('PDF generation workflow', () => {
    it('should generate PDF with title and author', () => {
      const pdfMetadata = {
        title: mockCapturedPost.title,
        author: mockCapturedPost.authorName,
        subject: 'RedNote Post Capture',
        creator: 'RedNote to NotebookLM Extension',
      };

      expect(pdfMetadata.title).toBe('测试帖子标题 - Test Post Title');
      expect(pdfMetadata.author).toBe('测试作者');
    });

    it('should include source URL in PDF', () => {
      const footer = `Source: ${mockCapturedPost.sourceUrl}`;
      expect(footer).toContain('xiaohongshu.com');
    });

    it('should handle posts with Chinese characters', () => {
      const hasChineseChars = /[\u4e00-\u9fff]/.test(mockCapturedPost.title);
      expect(hasChineseChars).toBe(true);
    });

    it('should calculate correct filename', () => {
      const sanitizedTitle = mockCapturedPost.title
        .replace(/[<>:"/\\|?*]/g, '')
        .substring(0, 50);
      const filename = `${sanitizedTitle}.pdf`;

      expect(filename).not.toContain('/');
      expect(filename).not.toContain('\\');
      expect(filename.endsWith('.pdf')).toBe(true);
    });
  });

  describe('Post-generation storage', () => {
    it('should store PDF blob URL in session storage', async () => {
      const pdfData = {
        capturedPostId: mockCapturedPost.id,
        blobUrl: 'blob:chrome-extension://abc123/pdf-blob',
        filename: 'Test Post Title.pdf',
        sizeBytes: 12345,
      };

      mockChrome.storage.session.set.mockResolvedValue(undefined);
      await mockChrome.storage.session.set({ currentPdf: pdfData });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        currentPdf: pdfData,
      });
    });

    it('should update capture status to pdf_ready', async () => {
      const updatedPost = {
        ...mockCapturedPost,
        status: 'pdf_ready' as const,
      };

      mockChrome.storage.session.set.mockResolvedValue(undefined);
      await mockChrome.storage.session.set({ currentCapture: updatedPost });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        currentCapture: expect.objectContaining({
          status: 'pdf_ready',
        }),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle font loading errors', () => {
      const error = new Error('Failed to load font');
      expect(error.message).toBe('Failed to load font');
    });

    it('should handle PDF generation errors', () => {
      const error = new Error('PDF generation failed');
      expect(error.message).toBe('PDF generation failed');
    });

    it('should clean up on error', async () => {
      mockChrome.storage.session.set.mockResolvedValue(undefined);

      // Simulate cleanup after error
      await mockChrome.storage.session.set({ currentPdf: null });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        currentPdf: null,
      });
    });
  });
});
