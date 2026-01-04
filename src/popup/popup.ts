/**
 * Popup Script - Main UI controller for the extension popup
 */

import type { Message, Response } from '../types/messages';
import type { AuthState } from '../models/auth-state';
import type { CapturedPost } from '../models/captured-post';
import type { GeneratedPdf } from '../models/generated-pdf';
import { createPdfBlobUrl, revokePdfBlobUrl } from '../services/pdf-generator';
import { BatchView } from './components/BatchView';
import { DetectedNote } from '../models/batch-selection';
import { BatchManager } from '../services/batch-manager';

// UI State
interface UIState {
  isOnRedNote: boolean;
  isOnProfile: boolean;
  isAuthenticated: boolean;
  currentCapture: CapturedPost | null;
  currentPdf: GeneratedPdf | null;
  currentPdfBlobUrl: string | null; // Blob URL created in popup context
  driveFileUrl: string | null;
  isLoading: boolean;
  error: string | null;
  detectedNotes: DetectedNote[];
  showBatchResults: boolean; // Track if batch results should be shown
}

let state: UIState = {
  isOnRedNote: false,
  isOnProfile: false,
  isAuthenticated: false,
  currentCapture: null,
  currentPdf: null,
  currentPdfBlobUrl: null,
  driveFileUrl: null,
  isLoading: false,
  error: null,
  detectedNotes: [],
  showBatchResults: false,
};

// DOM Elements
const elements = {
  // Sections
  notRedNote: document.getElementById('not-rednote')!,
  captureSection: document.getElementById('capture-section')!,
  batchSection: document.getElementById('batch-section')!,
  batchResultsSection: document.getElementById('batch-results-section')!,
  previewSection: document.getElementById('preview-section')!,
  pdfSection: document.getElementById('pdf-section')!,
  successSection: document.getElementById('success-section')!,
  loadingSection: document.getElementById('loading-section')!,
  errorSection: document.getElementById('error-section')!,

  // Auth
  authStatus: document.getElementById('auth-status')!,

  // Buttons
  captureBtn: document.getElementById('capture-btn') as HTMLButtonElement,
  generatePdfBtn: document.getElementById('generate-pdf-btn') as HTMLButtonElement,
  clearCaptureBtn: document.getElementById('clear-capture-btn') as HTMLButtonElement,
  uploadBtn: document.getElementById('upload-btn') as HTMLButtonElement,
  downloadBtn: document.getElementById('download-btn') as HTMLButtonElement,
  driveLink: document.getElementById('drive-link') as HTMLAnchorElement,
  newCaptureBtn: document.getElementById('new-capture-btn') as HTMLButtonElement,
  retryBtn: document.getElementById('retry-btn') as HTMLButtonElement,

  // Preview
  previewTitle: document.getElementById('preview-title')!,
  previewAuthor: document.getElementById('preview-author')!,
  previewImages: document.getElementById('preview-images')!,

  // PDF
  pdfFilename: document.getElementById('pdf-filename')!,
  pdfSize: document.getElementById('pdf-size')!,

  // Loading/Error
  loadingMessage: document.getElementById('loading-message')!,
  errorMessage: document.getElementById('error-message')!,
};

// Initialize Batch View
let batchView: BatchView;
const batchManager = new BatchManager();

/**
 * Send message to service worker
 */
async function sendMessage<T>(action: string, payload?: unknown): Promise<Response<T>> {
  const message: Message = {
    action,
    payload,
    requestId: crypto.randomUUID(),
  };



  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: Response<T>) => {

      if (chrome.runtime.lastError) {
        console.error('[Popup] Runtime error:', chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
}

/**
 * Check if current tab is on RedNote
 */
async function checkCurrentTab(): Promise<{ isRedNote: boolean, isProfile: boolean }> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url || '';
      const isRedNote = url.includes('xiaohongshu.com');

      if (isRedNote) {
        // Check if it's a profile page using our message handler
        const response = await sendMessage<{ isProfile: boolean; url: string }>('CHECK_PROFILE');
        resolve({
          isRedNote,
          isProfile: response.success && !!response.data?.isProfile
        });
      } else {
        resolve({ isRedNote: false, isProfile: false });
      }
    });
  });
}

/**
 * Update UI based on current state
 */
function updateUI(): void {
  // Hide all sections first
  const sections = [
    elements.notRedNote,
    elements.captureSection,
    elements.batchSection,
    elements.batchResultsSection,
    elements.previewSection,
    elements.pdfSection,
    elements.successSection,
    elements.loadingSection,
    elements.errorSection,
  ];
  sections.forEach((s) => s.classList.add('hidden'));

  // Update auth status
  const statusIndicator = elements.authStatus.querySelector('.status-indicator')!;
  const statusText = elements.authStatus.querySelector('.status-text')!;
  if (state.isAuthenticated) {
    statusIndicator.classList.add('authenticated');
    statusText.textContent = 'Signed in';
  } else {
    statusIndicator.classList.remove('authenticated');
    statusText.textContent = 'Not signed in';
  }

  // Show appropriate section
  if (state.isLoading) {
    elements.loadingSection.classList.remove('hidden');
    return;
  }

  if (state.error) {
    elements.errorSection.classList.remove('hidden');
    elements.errorMessage.textContent = state.error;
    return;
  }

  if (!state.isOnRedNote) {
    elements.notRedNote.classList.remove('hidden');
    return;
  }

  if (state.driveFileUrl) {
    elements.successSection.classList.remove('hidden');
    elements.driveLink.href = state.driveFileUrl;
    return;
  }

  if (state.currentPdf) {
    elements.pdfSection.classList.remove('hidden');
    elements.pdfFilename.textContent = state.currentPdf.filename;
    elements.pdfSize.textContent = formatBytes(state.currentPdf.sizeBytes);
    return;
  }

  if (state.currentCapture) {
    elements.previewSection.classList.remove('hidden');
    elements.previewTitle.textContent = state.currentCapture.title || 'Untitled Post';
    elements.previewAuthor.textContent = `by ${state.currentCapture.authorName}`;
    elements.previewImages.textContent = `${state.currentCapture.images.length} image(s)`;
    return;
  }

  // Batch Results View
  if (state.showBatchResults) {
    elements.batchResultsSection.classList.remove('hidden');
    return;
  }

  // Profile Batch View
  if (state.isOnProfile) {
    elements.batchSection.classList.remove('hidden');
    return;
  }

  elements.captureSection.classList.remove('hidden');
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Set loading state
 */
/**
 * Set loading state
 */
function setLoading(loading: boolean, message = 'Processing...', progress?: number): void {
  state.isLoading = loading;
  state.error = null;
  elements.loadingMessage.textContent = message;

  const progressBar = document.getElementById('progress-bar') as HTMLElement;
  if (progressBar) {
    if (!loading) {
      // Always reset progress bar when loading is turned off
      progressBar.style.width = '0%';
    } else if (progress !== undefined) {
      progressBar.style.width = `${Math.max(5, progress)}%`; // Min 5% so icon shows
    }
  }

  updateUI();
}

/**
 * Set error state
 */
function setError(error: string): void {
  state.isLoading = false;
  state.error = error;
  updateUI();
}

/**
 * Clear error and refresh UI
 */
function clearError(): void {
  state.error = null;
  updateUI();
}

// Event Handlers

async function handleCapture(): Promise<void> {

  setLoading(true, 'Capturing post...');

  const response = await sendMessage<CapturedPost>('CAPTURE_POST');


  if (response.success && response.data) {

    state.currentCapture = response.data;
    state.isLoading = false;
    updateUI();
  } else {
    console.error('[Popup] Capture failed:', response.error);
    setError(response.error || 'Failed to capture post');
  }
}

async function handleGeneratePdf(): Promise<void> {
  if (!state.currentCapture) return;

  setLoading(true, 'Generating PDF...');

  const response = await sendMessage<GeneratedPdf>('GENERATE_PDF', {
    capturedPostId: state.currentCapture.id,
  });

  if (response.success && response.data) {
    state.currentPdf = response.data;
    // Create blob URL in popup context (service workers can't do this)
    state.currentPdfBlobUrl = createPdfBlobUrl(response.data.pdfBase64);
    state.isLoading = false;
    updateUI();
  } else {
    setError(response.error || 'Failed to generate PDF');
  }
}

async function handleClearCapture(): Promise<void> {
  // Clean up blob URL if exists
  if (state.currentPdfBlobUrl) {
    revokePdfBlobUrl(state.currentPdfBlobUrl);
  }
  await sendMessage('CLEAR_CURRENT_CAPTURE');
  state.currentCapture = null;
  state.currentPdf = null;
  state.currentPdfBlobUrl = null;
  updateUI();
}

async function handleUpload(): Promise<void> {
  if (!state.currentPdf) return;

  if (!state.isAuthenticated) {
    setLoading(true, 'Authenticating...');
    const authResponse = await sendMessage<AuthState>('AUTHENTICATE');
    if (!authResponse.success) {
      setError(authResponse.error || 'Authentication failed');
      return;
    }
    state.isAuthenticated = true;
  }

  setLoading(true, 'Uploading to Drive...');

  const response = await sendMessage<{ webViewLink: string }>('UPLOAD_TO_DRIVE', {
    capturedPostId: state.currentPdf.capturedPostId,
  });

  if (response.success && response.data) {
    state.driveFileUrl = response.data.webViewLink;
    state.isLoading = false;
    updateUI();
  } else {
    setError(response.error || 'Failed to upload');
  }
}

function handleDownload(): void {
  if (!state.currentPdf || !state.currentPdfBlobUrl) return;

  // Use anchor tag download for better compatibility
  const link = document.createElement('a');
  link.href = state.currentPdfBlobUrl;
  link.download = state.currentPdf.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleNewCapture(): void {
  // Clean up blob URL if exists
  if (state.currentPdfBlobUrl) {
    revokePdfBlobUrl(state.currentPdfBlobUrl);
  }
  state.currentCapture = null;
  state.currentPdf = null;
  state.currentPdfBlobUrl = null;
  state.driveFileUrl = null;
  state.error = null;
  updateUI();
}

function handleRetry(): void {
  clearError();
}



async function loadProfileNotes() {
  // Execute script to parse notes
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const notes: any[] = [];
        document.querySelectorAll('.note-item').forEach(el => {
          const linkEl = el.querySelector('a.cover') as HTMLAnchorElement;
          const imgEl = el.querySelector('a.cover img') as HTMLImageElement; // Selector update
          const titleEl = el.querySelector('.title') || el.querySelector('.footer span');

          if (linkEl && imgEl) {
            const href = linkEl.getAttribute('href')!;
            const segments = href.split('/');
            const noteId = segments[segments.length - 1];
            notes.push({
              noteId,
              title: titleEl?.textContent?.trim() || '',
              coverUrl: imgEl.src,
              noteUrl: linkEl.href
            });
          }
        });
        return notes;
      }
    });

    if (results && results[0] && results[0].result) {
      const notes = results[0].result as DetectedNote[];
      state.detectedNotes = notes;
      batchView.setNotes(notes);
    }
  }
}

// Initialize popup
async function init(): Promise<void> {
  const tabStatus = await checkCurrentTab();
  state.isOnRedNote = tabStatus.isRedNote;
  state.isOnProfile = tabStatus.isProfile;

  // Get auth status
  const authResponse = await sendMessage<AuthState>('GET_AUTH_STATUS');
  if (authResponse.success && authResponse.data) {
    state.isAuthenticated = authResponse.data.isAuthenticated;
  }

  // Get current capture state from session storage
  const sessionData = await chrome.storage.session.get(['currentCapture', 'currentPdfMeta']);
  if (sessionData.currentCapture) {
    state.currentCapture = sessionData.currentCapture;
  }
  if (sessionData.currentPdfMeta) {

  }

  // Bind event listeners
  elements.captureBtn.addEventListener('click', handleCapture);
  elements.generatePdfBtn.addEventListener('click', handleGeneratePdf);
  elements.clearCaptureBtn.addEventListener('click', handleClearCapture);
  elements.uploadBtn.addEventListener('click', handleUpload);
  elements.downloadBtn.addEventListener('click', handleDownload);
  elements.newCaptureBtn.addEventListener('click', handleNewCapture);
  elements.retryBtn.addEventListener('click', handleRetry);
  elements.retryBtn.addEventListener('click', handleRetry);

  // Setup Batch View if on profile
  if (state.isOnProfile) {
    batchView = new BatchView('batch-section');

    batchView.onRefresh = async () => {
      loadProfileNotes();
    };

    batchView.onProcess = async (ids, merge) => {


      const notesToProcess = state.detectedNotes.filter(n => ids.includes(n.noteId))
        .map(n => ({ noteId: n.noteId, noteUrl: n.noteUrl }));

      if (notesToProcess.length === 0) return;

      setLoading(true, `Processing ${notesToProcess.length} notes...`);

      // Run Batch
      const results = await batchManager.processBatch(notesToProcess, props => {
        const pct = Math.round((props.current / props.total) * 100);
        setLoading(true, `Processing ${props.current}/${props.total}`, pct);
      });

      setLoading(true, 'Finalizing...');

      // Handle Results
      const filesList = document.getElementById('batch-files-list')!;
      const downloadBtn = document.getElementById('btn-batch-download-all')!;
      const backBtn = document.getElementById('btn-batch-back')!;

      filesList.innerHTML = '';

      // Helper to download blob
      const downloadBlob = (base64: string, filename: string) => {
        const blobUrl = createPdfBlobUrl(base64);
        chrome.downloads.download({
          url: blobUrl,
          filename: filename,
          saveAs: false // Auto download
        }, () => {
          // Should revoke blobUrl later or keep track of it
        });
      };

      const createListItem = (filename: string, meta: string, onDownload: () => void) => {
        const item = document.createElement('div');
        item.className = 'batch-file-item';
        item.innerHTML = `
            <div class="file-icon-wrapper">
                <span class="file-icon-text">📄</span>
            </div>
            <div class="file-info">
                <div class="file-name" title="${filename}">${filename}</div>
                <div class="file-meta">${meta}</div>
            </div>
            <button class="action-btn-sm">Save</button>
          `;
        item.querySelector('button')?.addEventListener('click', onDownload);
        return item;
      };

      if (merge) {
        if (results.length > 0) {
          setLoading(true, 'Merging PDFs...', 90);
          const mergedBase64 = await batchManager.mergePdfs(results);
          const filename = `RedNote_Batch_${new Date().toISOString().slice(0, 10)}.pdf`;

          setLoading(true, 'Done!', 100);

          filesList.appendChild(createListItem(filename, `Merged ${results.length} posts`, () => downloadBlob(mergedBase64, filename)));

          downloadBtn.textContent = 'Download Merged PDF';
          downloadBtn.onclick = () => downloadBlob(mergedBase64, filename);
        }
      } else {
        // List individual files
        setLoading(true, 'Finalizing...', 100);
        results.forEach(r => {
          filesList.appendChild(createListItem(r.filename, formatBytes(r.sizeBytes), () => downloadBlob(r.pdfBase64, r.filename)));
        });

        downloadBtn.textContent = `Download All (${results.length})`;
        downloadBtn.onclick = () => {
          // Download all sequentially
          results.forEach((r, i) => {
            setTimeout(() => downloadBlob(r.pdfBase64, r.filename), i * 500);
          });
        };
      }

      setLoading(false);
      state.showBatchResults = true;
      updateUI();

      backBtn.onclick = () => {
        state.showBatchResults = false;
        updateUI();
      };
    };

    loadProfileNotes();
  }

  // Initial UI render
  updateUI();
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
