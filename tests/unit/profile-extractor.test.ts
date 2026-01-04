import { describe, it, expect } from 'vitest';
import { parseProfileNotes } from '../../src/content/profile-parser';

describe('Profile Parser', () => {
    it('should extract note items from DOM', () => {
        document.body.innerHTML = `
      <div class="note-item">
        <a href="/user/profile/56efea6b4775a7043079b390/65a610c1000000001d027667" class="cover">
            <img class="cover" src="http://example.com/image1.jpg" />
        </a>
        <div class="footer">
            <a class="title">Test Note 1</a>
        </div>
      </div>
      <div class="note-item">
        <a href="/user/profile/56efea6b4775a7043079b390/65a610c1000000001d027668" class="cover">
            <img class="cover" src="http://example.com/image2.jpg" />
        </a>
        <div class="footer">
            <span class="title">Test Note 2</span>
        </div>
      </div>
    `;

        const notes = parseProfileNotes();

        expect(notes).toHaveLength(2);
        expect(notes[0]).toEqual({
            noteId: '65a610c1000000001d027667',
            title: 'Test Note 1',
            coverUrl: 'http://example.com/image1.jpg',
            noteUrl: 'https://www.xiaohongshu.com/explore/65a610c1000000001d027667'
        });
        expect(notes[1].title).toBe('Test Note 2');
    });

    it('should return empty array if no notes found', () => {
        document.body.innerHTML = '<div>No notes here</div>';

        const notes = parseProfileNotes();
        expect(notes).toEqual([]);
    });
});
