import { describe, it, expect } from 'vitest';
import { isProfileUrl } from '../../src/content/url-patterns';

describe('URL Patterns - Profile Detection', () => {
    it('should return true for valid profile URLs', () => {
        expect(isProfileUrl('https://www.xiaohongshu.com/user/profile/56efea6b4775a7043079b390')).toBe(true);
        expect(isProfileUrl('https://www.xiaohongshu.com/user/profile/56efea6b4775a7043079b390?exSource=')).toBe(true);
    });

    it('should return false for non-profile URLs', () => {
        expect(isProfileUrl('https://www.xiaohongshu.com/explore')).toBe(false);
        expect(isProfileUrl('https://www.xiaohongshu.com/explore/65a610c1000000001d027667')).toBe(false);
        expect(isProfileUrl('https://www.google.com')).toBe(false);
    });
});
