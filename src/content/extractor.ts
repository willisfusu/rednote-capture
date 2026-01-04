/**
 * Content Extractor for RedNote (Xiaohongshu) posts
 * Extracts post data from the page's __INITIAL_STATE__ JSON
 */

import type { CapturedPost } from '../models/captured-post';
import type { PostImage } from '../models/post-image';
import { generateCaptureId } from '../models/captured-post';

/**
 * Raw note data structure from __INITIAL_STATE__
 */
interface RawNoteData {
  noteId: string;
  title: string;
  desc: string;
  user: {
    userId: string;
    nickname: string;
  };
  imageList: RawImageData[];
  type: 'normal' | 'video';
  video?: {
    thumbnail?: string;
  };
}

/**
 * Raw image data from RedNote's imageList
 */
interface RawImageData {
  urlDefault?: string;
  traceId?: string;
  infoList?: Array<{ url: string }>;
  width?: number;
  height?: number;
}

/**
 * Structure of RedNote's __INITIAL_STATE__
 */
interface InitialState {
  note?: {
    noteDetailMap?: Record<
      string,
      {
        note: RawNoteData;
      }
    >;
    currentNoteId?: string;
  };
}

/**
 * Extract __INITIAL_STATE__ from the window object
 */
export function extractInitialState(win: Window): InitialState | null {
  try {
    if (!win) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (win as any).__INITIAL_STATE__;
    return state || null;
  } catch {
    return null;
  }
}

/**
 * Parse note data from the __INITIAL_STATE__ structure
 */
export function parseNoteData(state: unknown): RawNoteData | null {
  if (!state || typeof state !== 'object') {
    return null;
  }

  const typedState = state as InitialState;

  if (!typedState.note?.noteDetailMap) {
    return null;
  }

  const { noteDetailMap, currentNoteId } = typedState.note;

  // Try to get note by currentNoteId first
  if (currentNoteId && noteDetailMap[currentNoteId]?.note) {
    return noteDetailMap[currentNoteId].note;
  }

  // Fall back to first note in the map
  const noteIds = Object.keys(noteDetailMap);
  if (noteIds.length > 0) {
    const firstNote = noteDetailMap[noteIds[0]]?.note;
    if (firstNote) {
      return firstNote;
    }
  }

  return null;
}

/**
 * Extract and normalize image data from RedNote's imageList
 */
export function extractImages(imageList: unknown): PostImage[] {
  if (!imageList || !Array.isArray(imageList)) {
    return [];
  }

  return imageList.map((img, index): PostImage => {
    const rawImg = img as RawImageData;

    // Try different URL sources in order of preference
    let url = rawImg.urlDefault;

    if (!url && rawImg.infoList && rawImg.infoList.length > 0) {
      url = rawImg.infoList[0].url;
    }

    if (!url && rawImg.traceId) {
      // Construct URL from traceId as fallback
      url = `https://sns-img-bd.xhscdn.com/${rawImg.traceId}`;
    }

    return {
      url: url || '',
      width: rawImg.width ?? null,
      height: rawImg.height ?? null,
      index,
      altText: null,
    };
  }).filter((img) => img.url !== '');
}

/**
 * Create a CapturedPost from raw note data
 */
export function extractPostContent(
  noteData: RawNoteData,
  sourceUrl: string
): CapturedPost {
  const images = extractImages(noteData.imageList);

  // Use title or fall back to first line of description
  let title = noteData.title?.trim() || '';
  if (!title && noteData.desc) {
    const firstLine = noteData.desc.split('\n')[0];
    title = firstLine.trim().substring(0, 100); // Limit title length
  }

  const isVideo = noteData.type === 'video';
  const videoThumbnail = isVideo ? noteData.video?.thumbnail || null : null;

  return {
    id: generateCaptureId(),
    sourceUrl,
    title: title || 'Untitled Post',
    description: noteData.desc || '',
    authorName: noteData.user?.nickname || 'Unknown Author',
    authorId: noteData.user?.userId || '',
    captureTimestamp: Date.now(),
    images,
    isVideo,
    videoThumbnail,
    status: 'captured',
  };
}

/**
 * Main extraction function - extracts post content from the current page
 * This is designed to be injected and run in the content script context
 */
export function extractFromPage(): CapturedPost | null {
  const state = extractInitialState(window);
  if (!state) {
    console.error('[Extractor] Could not find __INITIAL_STATE__');
    return null;
  }

  const noteData = parseNoteData(state);
  if (!noteData) {
    console.error('[Extractor] Could not parse note data from state');
    return null;
  }

  return extractPostContent(noteData, window.location.href);
}
