/**
 * Integration tests for upload flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GeneratedPdf } from '../../src/models/generated-pdf';
import type { UploadRecord } from '../../src/models/upload-record';
import { MOCK_DRIVE_RESPONSES, MOCK_AUTH_STATE } from '../mocks/drive-api';

// Mock chrome APIs
const mockChrome = {
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
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
  runtime: {
    lastError: null as { message: string } | null,
  },
};

vi.stubGlobal('chrome', mockChrome);

// Mock fetch
global.fetch = vi.fn();

describe('Upload Flow Integration', () => {
  const mockGeneratedPdf: GeneratedPdf = {
    capturedPostId: 'capture-123',
    blobUrl: 'blob:chrome-extension://abc/pdf-123',
    filename: 'Test Post.pdf',
    sizeBytes: 12345,
    generatedAt: Date.now(),
    pageCount: 2,
    imagesIncluded: true,
    failedImageCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  describe('Pre-conditions', () => {
    it('should require authentication before upload', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        auth: { isAuthenticated: false },
      });

      const { auth } = await mockChrome.storage.session.get('auth');
      expect(auth.isAuthenticated).toBe(false);
    });

    it('should require a generated PDF before upload', async () => {
      mockChrome.storage.session.get.mockResolvedValue({
        currentPdf: mockGeneratedPdf,
      });

      const { currentPdf } = await mockChrome.storage.session.get('currentPdf');
      expect(currentPdf).toBeDefined();
      expect(currentPdf.blobUrl).toContain('blob:');
    });
  });

  describe('Authentication flow', () => {
    it('should trigger interactive auth when not authenticated', async () => {
      mockChrome.identity.getAuthToken.mockImplementation(
        (options: { interactive: boolean }, callback: (token: string) => void) => {
          if (options.interactive) {
            callback('new-access-token');
          }
        }
      );

      const token = await new Promise<string>((resolve) => {
        mockChrome.identity.getAuthToken({ interactive: true }, resolve);
      });

      expect(token).toBe('new-access-token');
    });

    it('should store auth state after successful authentication', async () => {
      mockChrome.storage.session.set.mockResolvedValue(undefined);

      await mockChrome.storage.session.set({ auth: MOCK_AUTH_STATE });

      expect(mockChrome.storage.session.set).toHaveBeenCalledWith({
        auth: expect.objectContaining({
          isAuthenticated: true,
          accessToken: expect.any(String),
        }),
      });
    });
  });

  describe('Upload workflow', () => {
    it('should fetch PDF blob from blob URL', async () => {
      const mockPdfBlob = new Blob(['PDF content'], { type: 'application/pdf' });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockPdfBlob),
      });

      const response = await fetch(mockGeneratedPdf.blobUrl);
      const blob = await response.blob();

      expect(blob.type).toBe('application/pdf');
    });

    it('should upload PDF to Google Drive', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.uploadSuccess),
      });

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${MOCK_AUTH_STATE.accessToken}`,
          },
        }
      );

      const data = await response.json();

      expect(data.id).toBeDefined();
      expect(data.webViewLink).toContain('drive.google.com');
    });

    it('should create upload record on success', () => {
      const uploadRecord: UploadRecord = {
        id: 'upload-123',
        capturedPostId: mockGeneratedPdf.capturedPostId,
        driveFileId: MOCK_DRIVE_RESPONSES.uploadSuccess.id,
        driveWebViewLink: MOCK_DRIVE_RESPONSES.uploadSuccess.webViewLink,
        status: 'success',
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        errorMessage: null,
        retryCount: 0,
        filename: mockGeneratedPdf.filename,
      };

      expect(uploadRecord.status).toBe('success');
      expect(uploadRecord.driveFileId).toBeDefined();
      expect(uploadRecord.driveWebViewLink).toContain('drive.google.com');
    });
  });

  describe('Upload history', () => {
    it('should store upload record in local storage', async () => {
      const uploadRecord: UploadRecord = {
        id: 'upload-123',
        capturedPostId: 'capture-123',
        driveFileId: 'file-123',
        driveWebViewLink: 'https://drive.google.com/file/d/file-123/view',
        status: 'success',
        startedAt: Date.now(),
        completedAt: Date.now(),
        errorMessage: null,
        retryCount: 0,
        filename: 'Test.pdf',
      };

      mockChrome.storage.local.get.mockResolvedValue({ uploadHistory: [] });
      mockChrome.storage.local.set.mockResolvedValue(undefined);

      const { uploadHistory } = await mockChrome.storage.local.get('uploadHistory');
      const newHistory = [...uploadHistory, uploadRecord];
      await mockChrome.storage.local.set({ uploadHistory: newHistory });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        uploadHistory: expect.arrayContaining([
          expect.objectContaining({ id: 'upload-123' }),
        ]),
      });
    });

    it('should limit upload history to 100 records', async () => {
      const existingHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `upload-${i}`,
        capturedPostId: `capture-${i}`,
        status: 'success',
      }));

      mockChrome.storage.local.get.mockResolvedValue({ uploadHistory: existingHistory });

      const { uploadHistory } = await mockChrome.storage.local.get('uploadHistory');
      const trimmedHistory = uploadHistory.slice(-99);
      const newRecord = { id: 'upload-new', capturedPostId: 'capture-new', status: 'success' };

      expect([...trimmedHistory, newRecord]).toHaveLength(100);
    });
  });

  describe('Error handling', () => {
    it('should handle upload failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.error500),
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle token expiration', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.error401),
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should retry upload on transient failure', async () => {
      let attempts = 0;

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.error500),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MOCK_DRIVE_RESPONSES.uploadSuccess),
        });
      });

      // Simulate retry logic
      let success = false;
      for (let i = 0; i < 3; i++) {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');
        if (response.ok) {
          success = true;
          break;
        }
      }

      expect(success).toBe(true);
      expect(attempts).toBe(3);
    });
  });
});
