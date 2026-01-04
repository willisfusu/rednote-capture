/**
 * EXTRACT_POST message handler
 * Extracts post content from a RedNote page using content script injection
 */

import type { Response } from '../../types/messages';
import type { CapturedPost } from '../../models/captured-post';
import { ErrorCode, createErrorResponse } from '../../types/errors';
import { isRedNotePostUrl } from '../../content/url-patterns';

/**
 * Handle EXTRACT_POST message
 * Injects content script to extract post data from the page
 */
export async function handleExtractPost(
  payload: unknown,
  requestId?: string
): Promise<Response<CapturedPost>> {
  try {


    let tabId: number | undefined;

    // Check if payload contains tabId (for batch processing)
    if (payload && typeof payload === 'object' && 'tabId' in payload) {
      tabId = (payload as { tabId: number }).tabId;
    }

    let tab;
    if (tabId) {
      tab = await chrome.tabs.get(tabId);
    } else {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }



    if (!tab?.id || !tab.url) {
      console.error('[ExtractPost] No valid tab found');
      return createErrorResponse(
        ErrorCode.TAB_NOT_FOUND,
        'No active tab found',
        requestId
      );
    }

    if (!isRedNotePostUrl(tab.url)) {
      console.error('[ExtractPost] Not a RedNote post URL:', tab.url);
      return createErrorResponse(
        ErrorCode.NOT_REDNOTE_PAGE,
        'Current page is not a RedNote post',
        requestId
      );
    }



    // Inject the extractor function and execute it
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPostFromPage,
      world: 'MAIN', // Access page's window object
    });



    if (!results || results.length === 0) {
      console.error('[ExtractPost] No results from script execution');
      return createErrorResponse(
        ErrorCode.EXTRACTION_ERROR,
        'Failed to execute extraction script',
        requestId
      );
    }

    const extractedData = results[0].result as CapturedPost | null;


    if (!extractedData) {
      console.error('[ExtractPost] Extracted data is null');
      return createErrorResponse(
        ErrorCode.EXTRACTION_ERROR,
        'Could not extract post data from page',
        requestId
      );
    }


    return {
      success: true,
      data: extractedData,
      requestId,
    };
  } catch (error) {
    console.error('[ExtractPost] Error:', error);
    return createErrorResponse(
      ErrorCode.EXTRACTION_ERROR,
      error instanceof Error ? error.message : 'Failed to extract post',
      requestId
    );
  }
}

/**
 * This function is injected into the page and runs in MAIN world
 * to access the page's __INITIAL_STATE__
 */
function extractPostFromPage(): unknown {
  try {


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (window as any).__INITIAL_STATE__;


    if (!state?.note?.noteDetailMap) {
      console.error('[Extractor] __INITIAL_STATE__ not found or invalid');

      return null;
    }

    const { noteDetailMap, currentNoteId } = state.note;
    const noteIds = Object.keys(noteDetailMap);


    // Get the note data
    let noteData = null;
    if (currentNoteId && noteDetailMap[currentNoteId]?.note) {
      noteData = noteDetailMap[currentNoteId].note;
    } else {
      if (noteIds.length > 0) {
        // Filter out 'undefined' key
        const validNoteIds = noteIds.filter(id => id !== 'undefined');
        if (validNoteIds.length > 0) {
          noteData = noteDetailMap[validNoteIds[0]]?.note;
        }
      }
    }



    if (!noteData) {
      console.error('[Extractor] No note data found');
      return null;
    }



    // Extract images
    const images = (noteData.imageList || [])
      .map((img: { urlDefault?: string; traceId?: string; infoList?: Array<{ url: string }>; width?: number; height?: number }, index: number) => {
        let url = img.urlDefault;
        if (!url && img.infoList && img.infoList.length > 0) {
          url = img.infoList[0].url;
        }
        if (!url && img.traceId) {
          url = `https://sns-img-bd.xhscdn.com/${img.traceId}`;
        }
        return {
          url: String(url || ''),
          width: img.width != null ? Number(img.width) : null,
          height: img.height != null ? Number(img.height) : null,
          index: Number(index),
          altText: null,
        };
      })
      .filter((img: { url: string }) => img.url !== '');

    // Determine title
    let title = noteData.title?.trim() || '';
    if (!title && noteData.desc) {
      const firstLine = noteData.desc.split('\n')[0];
      title = firstLine.trim().substring(0, 100);
    }

    const isVideo = noteData.type === 'video';

    const result = {
      id: crypto.randomUUID(),
      sourceUrl: window.location.href,
      title: String(title || 'Untitled Post'),
      description: String(noteData.desc || ''),
      authorName: String(noteData.user?.nickname || 'Unknown Author'),
      authorId: String(noteData.user?.userId || ''),
      captureTimestamp: Date.now(),
      images,
      isVideo: Boolean(isVideo),
      videoThumbnail: isVideo ? String(noteData.video?.thumbnail || '') || null : null,
      status: 'captured',
    };



    // Convert to plain JSON to break Vue reactive proxy chain
    const finalResult = JSON.parse(JSON.stringify(result));


    return finalResult;
  } catch (error) {
    console.error('[Extractor] Error extracting post:', error);
    return null;
  }
}
