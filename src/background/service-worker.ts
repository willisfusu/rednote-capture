/**
 * Service Worker - Main background script for the extension
 * Handles message routing, authentication, and coordinates all operations
 */

// Polyfill for libraries that expect window/document to exist (like pdf-lib/fontkit)
// Service workers don't have window or document, but some libraries check for them
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).window = self;
}

if (typeof document === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas' && typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(300, 150);
      }
      return {
        getContext: () => ({}),
        style: {},
        setAttribute: () => { },
        appendChild: () => { },
      };
    },
    getElementsByTagName: () => [],
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElementNS: () => ({
      style: {},
      setAttribute: () => { },
      appendChild: () => { },
    }),
    head: { appendChild: () => { }, removeChild: () => { } },
    body: { appendChild: () => { }, removeChild: () => { } },
    documentElement: { style: {} },
  };
}

import { handleMessage } from './message-handler';
import { initializeShortcuts } from './shortcuts';

// Initialize keyboard shortcuts
initializeShortcuts();

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async responses
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('[ServiceWorker] Message handling error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'INTERNAL_ERROR',
      });
    });

  // Return true to indicate async response
  return true;
});

// Extension install/update handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {

    await initializeStorage();
  } else if (details.reason === 'update') {

  }
});

// Extension startup handler
chrome.runtime.onStartup.addListener(() => {

});

/**
 * Initialize storage with default values on first install
 */
async function initializeStorage(): Promise<void> {
  const { initialized } = await chrome.storage.local.get('initialized');

  if (!initialized) {
    await chrome.storage.local.set({
      initialized: true,
      settings: {
        defaultDriveFolderId: null,
        autoOpenNotebookLM: true,
        pdfQuality: 'standard',
        includeSourceUrl: true,
        lastNotebookUrl: null,
      },
      uploadHistory: [],
    });

    await chrome.storage.session.set({
      auth: {
        accessToken: null,
        expiresAt: null,
        userEmail: null,
        isAuthenticated: false,
      },
      currentCapture: null,
      currentPdf: null,
      postQueue: [],
    });


  }
}
