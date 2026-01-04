/**
 * UploadStatus Component
 * Shows upload progress and status
 */

import type { UploadRecord } from '../../models/upload-record';

export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadStatusOptions {
  onRetry?: () => void;
}

/**
 * Create an upload status element
 */
export function createUploadStatus(
  container: HTMLElement,
  options: UploadStatusOptions = {}
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'upload-status';
  wrapper.innerHTML = `
    <div class="upload-status-content hidden">
      <div class="status-icon"></div>
      <div class="status-text"></div>
    </div>
    <button id="retry-upload-btn" class="btn btn-secondary hidden">Retry</button>
  `;

  const retryBtn = wrapper.querySelector('#retry-upload-btn') as HTMLButtonElement;
  if (retryBtn && options.onRetry) {
    retryBtn.addEventListener('click', options.onRetry);
  }

  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Update upload status display
 */
export function updateUploadStatus(
  wrapper: HTMLElement,
  state: UploadState,
  message?: string
): void {
  const content = wrapper.querySelector('.upload-status-content') as HTMLElement;
  const icon = wrapper.querySelector('.status-icon') as HTMLElement;
  const text = wrapper.querySelector('.status-text') as HTMLElement;
  const retryBtn = wrapper.querySelector('#retry-upload-btn') as HTMLElement;

  content.classList.remove('hidden');

  // Reset classes
  icon.className = 'status-icon';
  text.className = 'status-text';

  switch (state) {
    case 'uploading':
      icon.innerHTML = '<div class="spinner"></div>';
      text.textContent = message || 'Uploading to Google Drive...';
      retryBtn.classList.add('hidden');
      break;

    case 'success':
      icon.innerHTML = '✓';
      icon.classList.add('success');
      text.textContent = message || 'Upload complete!';
      text.classList.add('success');
      retryBtn.classList.add('hidden');
      break;

    case 'error':
      icon.innerHTML = '✗';
      icon.classList.add('error');
      text.textContent = message || 'Upload failed';
      text.classList.add('error');
      retryBtn.classList.remove('hidden');
      break;

    case 'idle':
    default:
      content.classList.add('hidden');
      retryBtn.classList.add('hidden');
      break;
  }
}

/**
 * Show upload success with link
 */
export function showUploadSuccess(
  wrapper: HTMLElement,
  _uploadRecord: UploadRecord,
  webViewLink: string
): void {
  const content = wrapper.querySelector('.upload-status-content') as HTMLElement;

  content.classList.remove('hidden');
  content.innerHTML = `
    <div class="status-icon success">✓</div>
    <div class="status-details">
      <p class="status-text success">Uploaded successfully!</p>
      <a href="${webViewLink}" target="_blank" class="drive-link">
        Open in Google Drive
      </a>
    </div>
  `;
}

/**
 * Hide upload status
 */
export function hideUploadStatus(wrapper: HTMLElement): void {
  const content = wrapper.querySelector('.upload-status-content') as HTMLElement;
  const retryBtn = wrapper.querySelector('#retry-upload-btn') as HTMLElement;

  content.classList.add('hidden');
  retryBtn.classList.add('hidden');
}
