/**
 * Unit tests for URL pattern matching
 */

import { describe, it, expect } from 'vitest';
import {
  isRedNoteUrl,
  isRedNotePostUrl,
  extractPostIdFromUrl,
} from '../../src/content/url-patterns';

describe('URL Pattern Matching', () => {
  describe('isRedNoteUrl', () => {
    it('should return true for xiaohongshu.com URLs', () => {
      expect(isRedNoteUrl('https://www.xiaohongshu.com')).toBe(true);
      expect(isRedNoteUrl('https://www.xiaohongshu.com/')).toBe(true);
      expect(isRedNoteUrl('https://www.xiaohongshu.com/explore')).toBe(true);
    });

    it('should return true for xiaohongshu.com without www', () => {
      expect(isRedNoteUrl('https://xiaohongshu.com')).toBe(true);
      expect(isRedNoteUrl('https://xiaohongshu.com/explore')).toBe(true);
    });

    it('should return false for non-xiaohongshu URLs', () => {
      expect(isRedNoteUrl('https://google.com')).toBe(false);
      expect(isRedNoteUrl('https://example.com/xiaohongshu')).toBe(false);
      expect(isRedNoteUrl('')).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(isRedNoteUrl('not-a-url')).toBe(false);
      expect(isRedNoteUrl('javascript:void(0)')).toBe(false);
    });
  });

  describe('isRedNotePostUrl', () => {
    it('should return true for note explore URLs', () => {
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/explore/abc123')).toBe(true);
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/explore/6789def')).toBe(true);
    });

    it('should return true for discovery item URLs', () => {
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/discovery/item/abc123')).toBe(true);
    });

    it('should return true for user note URLs', () => {
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/user/profile/userid/note123')).toBe(true);
    });

    it('should return false for non-post pages', () => {
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/explore')).toBe(false);
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/')).toBe(false);
      expect(isRedNotePostUrl('https://www.xiaohongshu.com/user/profile/userid')).toBe(false);
    });

    it('should return false for non-xiaohongshu URLs', () => {
      expect(isRedNotePostUrl('https://google.com/explore/abc123')).toBe(false);
    });
  });

  describe('extractPostIdFromUrl', () => {
    it('should extract post ID from explore URLs', () => {
      expect(extractPostIdFromUrl('https://www.xiaohongshu.com/explore/abc123')).toBe('abc123');
      expect(extractPostIdFromUrl('https://www.xiaohongshu.com/explore/6789def')).toBe('6789def');
    });

    it('should extract post ID from discovery item URLs', () => {
      expect(extractPostIdFromUrl('https://www.xiaohongshu.com/discovery/item/abc123')).toBe('abc123');
    });

    it('should extract post ID from URLs with query params', () => {
      expect(
        extractPostIdFromUrl('https://www.xiaohongshu.com/explore/abc123?source=search')
      ).toBe('abc123');
    });

    it('should return null for non-post URLs', () => {
      expect(extractPostIdFromUrl('https://www.xiaohongshu.com/explore')).toBeNull();
      expect(extractPostIdFromUrl('https://www.xiaohongshu.com/')).toBeNull();
      expect(extractPostIdFromUrl('https://google.com')).toBeNull();
    });
  });
});
