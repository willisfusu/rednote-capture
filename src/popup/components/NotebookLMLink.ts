/**
 * NotebookLMLink Component
 * Shows link to open file in NotebookLM after upload
 */

const NOTEBOOKLM_URL = 'https://notebooklm.google.com';

export interface NotebookLMLinkOptions {
  onOpenNotebook?: () => void;
}

/**
 * Create a NotebookLM link element
 */
export function createNotebookLMLink(
  container: HTMLElement,
  _driveFileId: string,
  options: NotebookLMLinkOptions = {}
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'notebooklm-link';
  wrapper.innerHTML = `
    <div class="notebooklm-info">
      <p class="notebooklm-text">
        Your PDF is ready in Google Drive. Open NotebookLM to add it as a source.
      </p>
    </div>
    <div class="notebooklm-actions">
      <a href="${NOTEBOOKLM_URL}" target="_blank" class="btn btn-primary" id="open-notebooklm-btn">
        Open NotebookLM
      </a>
    </div>
    <p class="notebooklm-hint">
      In NotebookLM, click "Add source" and select your PDF from Google Drive.
    </p>
  `;

  const openBtn = wrapper.querySelector('#open-notebooklm-btn');
  if (openBtn && options.onOpenNotebook) {
    openBtn.addEventListener('click', () => {
      options.onOpenNotebook?.();
    });
  }

  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Create a success view with Drive and NotebookLM links
 */
export function createSuccessView(
  container: HTMLElement,
  webViewLink: string,
  options: NotebookLMLinkOptions = {}
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'success-view';
  wrapper.innerHTML = `
    <div class="success-icon-large">✓</div>
    <h3 class="success-title">Upload Complete!</h3>
    <p class="success-text">Your PDF has been uploaded to Google Drive.</p>

    <div class="success-actions">
      <a href="${webViewLink}" target="_blank" class="btn btn-secondary">
        View in Drive
      </a>
      <a href="${NOTEBOOKLM_URL}" target="_blank" class="btn btn-primary" id="notebooklm-btn">
        Open NotebookLM
      </a>
    </div>

    <p class="success-hint">
      Add your PDF as a source in NotebookLM to start chatting with it.
    </p>
  `;

  const notebookBtn = wrapper.querySelector('#notebooklm-btn');
  if (notebookBtn && options.onOpenNotebook) {
    notebookBtn.addEventListener('click', () => {
      options.onOpenNotebook?.();
    });
  }

  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Store the last used notebook URL
 */
export async function saveLastNotebookUrl(url: string): Promise<void> {
  const { settings } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({
    settings: {
      ...settings,
      lastNotebookUrl: url,
    },
  });
}

/**
 * Get the last used notebook URL
 */
export async function getLastNotebookUrl(): Promise<string | null> {
  const { settings } = await chrome.storage.local.get('settings');
  return settings?.lastNotebookUrl || null;
}
