/**
 * Unit tests for RedNote post content extraction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractInitialState,
  parseNoteData,
  extractImages,
  extractPostContent,
} from '../../src/content/extractor';
import type { CapturedPost } from '../../src/models/captured-post';
import type { PostImage } from '../../src/models/post-image';

describe('Content Extractor', () => {
  describe('extractInitialState', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('should extract __INITIAL_STATE__ from window object', () => {
      const mockState = {
        note: {
          noteDetailMap: {
            abc123: {
              note: {
                noteId: 'abc123',
                title: 'Test Post',
                desc: 'Test description',
                user: {
                  userId: 'user123',
                  nickname: 'TestUser',
                },
                imageList: [],
              },
            },
          },
        },
      };

      // Create a mock window
      const mockWindow = {
        __INITIAL_STATE__: mockState,
      };

      const result = extractInitialState(mockWindow as unknown as Window);
      expect(result).toEqual(mockState);
    });

    it('should return null when __INITIAL_STATE__ is not present', () => {
      const mockWindow = {} as Window;
      const result = extractInitialState(mockWindow);
      expect(result).toBeNull();
    });

    it('should handle undefined window gracefully', () => {
      const result = extractInitialState(undefined as unknown as Window);
      expect(result).toBeNull();
    });
  });

  describe('parseNoteData', () => {
    it('should parse note data from __INITIAL_STATE__ structure', () => {
      const mockState = {
        note: {
          noteDetailMap: {
            abc123: {
              note: {
                noteId: 'abc123',
                title: 'My Test Post',
                desc: 'This is a test description',
                user: {
                  userId: 'user456',
                  nickname: 'TestAuthor',
                },
                imageList: [
                  {
                    urlDefault: 'https://example.com/image1.jpg',
                    width: 800,
                    height: 600,
                  },
                ],
                type: 'normal',
              },
            },
          },
          currentNoteId: 'abc123',
        },
      };

      const result = parseNoteData(mockState);

      expect(result).not.toBeNull();
      expect(result?.noteId).toBe('abc123');
      expect(result?.title).toBe('My Test Post');
      expect(result?.desc).toBe('This is a test description');
      expect(result?.user.userId).toBe('user456');
      expect(result?.user.nickname).toBe('TestAuthor');
    });

    it('should find note data when currentNoteId is not set', () => {
      const mockState = {
        note: {
          noteDetailMap: {
            xyz789: {
              note: {
                noteId: 'xyz789',
                title: 'Another Post',
                desc: 'Description',
                user: {
                  userId: 'user789',
                  nickname: 'AnotherUser',
                },
                imageList: [],
                type: 'normal',
              },
            },
          },
        },
      };

      const result = parseNoteData(mockState);
      expect(result).not.toBeNull();
      expect(result?.noteId).toBe('xyz789');
    });

    it('should return null for invalid state structure', () => {
      expect(parseNoteData(null)).toBeNull();
      expect(parseNoteData(undefined)).toBeNull();
      expect(parseNoteData({})).toBeNull();
      expect(parseNoteData({ note: {} })).toBeNull();
      expect(parseNoteData({ note: { noteDetailMap: {} } })).toBeNull();
    });

    it('should handle video posts', () => {
      const mockState = {
        note: {
          noteDetailMap: {
            vid123: {
              note: {
                noteId: 'vid123',
                title: 'Video Post',
                desc: 'Video description',
                user: {
                  userId: 'user123',
                  nickname: 'VideoUser',
                },
                imageList: [],
                type: 'video',
                video: {
                  thumbnail: 'https://example.com/thumb.jpg',
                },
              },
            },
          },
          currentNoteId: 'vid123',
        },
      };

      const result = parseNoteData(mockState);
      expect(result?.type).toBe('video');
    });
  });

  describe('extractImages', () => {
    it('should extract images with correct properties', () => {
      const imageList = [
        {
          urlDefault: 'https://sns-img.xhscdn.com/image1.jpg',
          width: 1080,
          height: 1920,
        },
        {
          urlDefault: 'https://sns-img.xhscdn.com/image2.jpg',
          width: 800,
          height: 600,
        },
      ];

      const result = extractImages(imageList);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        url: 'https://sns-img.xhscdn.com/image1.jpg',
        width: 1080,
        height: 1920,
        index: 0,
      });
      expect(result[1]).toMatchObject({
        url: 'https://sns-img.xhscdn.com/image2.jpg',
        width: 800,
        height: 600,
        index: 1,
      });
    });

    it('should handle images with missing dimensions', () => {
      const imageList = [
        { urlDefault: 'https://example.com/image.jpg' },
      ];

      const result = extractImages(imageList);

      expect(result).toHaveLength(1);
      expect(result[0].width).toBeNull();
      expect(result[0].height).toBeNull();
    });

    it('should return empty array for empty or null input', () => {
      expect(extractImages([])).toEqual([]);
      expect(extractImages(null as unknown as unknown[])).toEqual([]);
      expect(extractImages(undefined as unknown as unknown[])).toEqual([]);
    });

    it('should use traceId for url if urlDefault is missing', () => {
      const imageList = [
        {
          traceId: 'trace123',
          infoList: [
            { url: 'https://example.com/info-url.jpg' }
          ],
        },
      ];

      const result = extractImages(imageList);
      expect(result).toHaveLength(1);
      // Should fall back to infoList url or construct from traceId
      expect(result[0].url).toBeDefined();
    });
  });

  describe('extractPostContent', () => {
    it('should create a complete CapturedPost from note data', () => {
      const noteData = {
        noteId: 'post123',
        title: 'Amazing Post Title',
        desc: 'This is the full description of the post with multiple lines.\nLine 2 here.',
        user: {
          userId: 'author456',
          nickname: 'CoolAuthor',
        },
        imageList: [
          {
            urlDefault: 'https://sns-img.xhscdn.com/img1.jpg',
            width: 1080,
            height: 1920,
          },
        ],
        type: 'normal',
      };

      const sourceUrl = 'https://www.xiaohongshu.com/explore/post123';
      const result = extractPostContent(noteData, sourceUrl);

      expect(result.sourceUrl).toBe(sourceUrl);
      expect(result.title).toBe('Amazing Post Title');
      expect(result.description).toBe(noteData.desc);
      expect(result.authorName).toBe('CoolAuthor');
      expect(result.authorId).toBe('author456');
      expect(result.isVideo).toBe(false);
      expect(result.images).toHaveLength(1);
      expect(result.status).toBe('captured');
      expect(result.id).toBeDefined();
      expect(result.captureTimestamp).toBeGreaterThan(0);
    });

    it('should handle posts with no title', () => {
      const noteData = {
        noteId: 'post123',
        title: '',
        desc: 'First line of description\nSecond line',
        user: {
          userId: 'author456',
          nickname: 'Author',
        },
        imageList: [],
        type: 'normal',
      };

      const result = extractPostContent(noteData, 'https://www.xiaohongshu.com/explore/post123');

      // Should use first line of description as title
      expect(result.title).toBe('First line of description');
    });

    it('should identify video posts', () => {
      const noteData = {
        noteId: 'vid123',
        title: 'Video Post',
        desc: 'Video description',
        user: {
          userId: 'author456',
          nickname: 'Author',
        },
        imageList: [],
        type: 'video',
        video: {
          thumbnail: 'https://example.com/thumb.jpg',
        },
      };

      const result = extractPostContent(noteData, 'https://www.xiaohongshu.com/explore/vid123');

      expect(result.isVideo).toBe(true);
      expect(result.videoThumbnail).toBe('https://example.com/thumb.jpg');
    });
  });
});
