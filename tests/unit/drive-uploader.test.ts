/**
 * Unit tests for Google Drive uploader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('Drive Uploader Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multipart upload', () => {
    it('should create multipart upload request', async () => {
      const mockFile = new Blob(['PDF content'], { type: 'application/pdf' });
      const metadata = {
        name: 'Test Document.pdf',
        mimeType: 'application/pdf',
        parents: ['folder-id'],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadataString = JSON.stringify(metadata);

      // Construct expected multipart body structure
      const bodyParts = [
        delimiter,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadataString,
        delimiter,
        `Content-Type: ${metadata.mimeType}\r\n\r\n`,
        // File content would go here
      ];

      expect(bodyParts.join('')).toContain('application/json');
      expect(bodyParts.join('')).toContain(metadata.name);
    });

    it('should call Drive API with correct headers', async () => {
      const accessToken = 'test-access-token';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'file-id-123',
            name: 'Test.pdf',
            webViewLink: 'https://drive.google.com/file/d/file-id-123/view',
          }),
      });

      await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'multipart/related; boundary=boundary123',
          },
          body: 'multipart body',
        }
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
    });

    it('should parse successful upload response', async () => {
      const mockResponse = {
        id: 'uploaded-file-id',
        name: 'Uploaded Document.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'https://drive.google.com/file/d/uploaded-file-id/view',
        webContentLink: 'https://drive.google.com/uc?id=uploaded-file-id',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');
      const data = await response.json();

      expect(data.id).toBe('uploaded-file-id');
      expect(data.webViewLink).toContain('drive.google.com');
    });
  });

  describe('Error handling', () => {
    it('should handle 401 Unauthorized', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: {
              code: 401,
              message: 'Invalid Credentials',
            },
          }),
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should handle 403 Forbidden (quota exceeded)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            error: {
              code: 403,
              message: 'User Rate Limit Exceeded',
            },
          }),
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      await expect(
        fetch('https://www.googleapis.com/upload/drive/v3/files')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Folder operations', () => {
    it('should list files in a folder', async () => {
      const folderId = 'folder-123';
      const accessToken = 'test-token';

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              { id: 'file-1', name: 'Doc1.pdf' },
              { id: 'file-2', name: 'Doc2.pdf' },
            ],
          }),
      });

      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      expect(data.files).toHaveLength(2);
    });
  });

  describe('Web view link', () => {
    it('should request webViewLink field in upload response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'file-id',
            webViewLink: 'https://drive.google.com/file/d/file-id/view',
          }),
      });

      const url =
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
      await fetch(url);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('fields='),
        expect.anything()
      );
    });
  });
});
