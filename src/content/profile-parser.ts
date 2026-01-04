/**
 * Profile Parser for RedNote
 * Extracts note information from the profile page feed
 */

interface ProfileNote {
    noteId: string;
    title: string;
    coverUrl: string;
    noteUrl: string;
}

export function parseProfileNotes(): ProfileNote[] {
    const notes: ProfileNote[] = [];

    try {
        const noteElements = document.querySelectorAll('.note-item');

        noteElements.forEach(element => {
            // Find link to get Note ID
            const linkEl = element.querySelector('a.cover') as HTMLAnchorElement;
            if (!linkEl) return;

            const href = linkEl.getAttribute('href');
            if (!href) return;

            // Extract ID from href (usually ends with ID)
            const segments = href.split('/');
            const noteId = segments[segments.length - 1];

            // Find Title
            // Title can be in .title or sometimes different structure depending on A/B tests
            // We look for the main text element
            const titleEl = element.querySelector('.title') || element.querySelector('.footer span');
            const title = titleEl?.textContent?.trim() || '';

            // Find Cover Image
            const imgEl = linkEl.querySelector('img') as HTMLImageElement;
            // Use standard rednote image URL format handling if needed, but src is usually fine
            // Sometimes src might be empty if lazy loaded, logic might need to handle 'data-src' but let's start with src
            const coverUrl = imgEl?.src || '';

            if (noteId && title) {
                notes.push({
                    noteId,
                    title,
                    coverUrl,
                    noteUrl: `https://www.xiaohongshu.com/explore/${noteId}`
                });
            }
        });
    } catch (error) {
        console.error('Error parsing profile notes:', error);
    }

    return notes;
}
