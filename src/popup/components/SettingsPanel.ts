/**
 * SettingsPanel Component
 * User settings configuration panel
 */

import type { UserSettings } from '../../models/user-settings';

/**
 * Props for SettingsPanel
 */
export interface SettingsPanelProps {
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Partial<UserSettings>) => void;
  onReset: () => void;
}

/**
 * Create the settings panel element
 */
export function createSettingsPanel(props: SettingsPanelProps): HTMLElement {
  const panel = document.createElement('div');
  panel.className = `settings-panel ${props.isOpen ? 'open' : ''}`;
  panel.id = 'settings-panel';

  panel.innerHTML = `
    <div class="settings-overlay"></div>
    <div class="settings-content">
      <header class="settings-header">
        <h2 class="settings-title">Settings</h2>
        <button class="settings-close" aria-label="Close">&times;</button>
      </header>

      <div class="settings-body">
        <div class="setting-group">
          <label class="setting-label">
            <span class="setting-name">PDF Quality</span>
            <select id="setting-pdf-quality" class="setting-input">
              <option value="standard" ${props.settings.pdfQuality === 'standard' ? 'selected' : ''}>Standard</option>
              <option value="high" ${props.settings.pdfQuality === 'high' ? 'selected' : ''}>High</option>
            </select>
          </label>
          <p class="setting-hint">Higher quality increases file size</p>
        </div>

        <div class="setting-group">
          <label class="setting-label setting-toggle">
            <span class="setting-name">Include Source URL</span>
            <input type="checkbox" id="setting-include-url" class="toggle-input"
              ${props.settings.includeSourceUrl ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">Add original post URL to PDF footer</p>
        </div>

        <div class="setting-group">
          <label class="setting-label setting-toggle">
            <span class="setting-name">Auto-open NotebookLM</span>
            <input type="checkbox" id="setting-auto-open" class="toggle-input"
              ${props.settings.autoOpenNotebookLM ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <p class="setting-hint">Open NotebookLM after uploading to Drive</p>
        </div>

        <div class="setting-group">
          <label class="setting-label">
            <span class="setting-name">Default Drive Folder</span>
            <input type="text" id="setting-folder-id" class="setting-input"
              value="${props.settings.defaultDriveFolderId || ''}"
              placeholder="Leave empty for root folder">
          </label>
          <p class="setting-hint">Google Drive folder ID for uploads</p>
        </div>
      </div>

      <footer class="settings-footer">
        <button id="settings-reset" class="btn btn-secondary">Reset to Defaults</button>
        <button id="settings-save" class="btn btn-primary">Save</button>
      </footer>
    </div>
  `;

  // Add event listeners
  const overlay = panel.querySelector('.settings-overlay');
  const closeBtn = panel.querySelector('.settings-close');
  const saveBtn = panel.querySelector('#settings-save');
  const resetBtn = panel.querySelector('#settings-reset');

  overlay?.addEventListener('click', props.onClose);
  closeBtn?.addEventListener('click', props.onClose);

  saveBtn?.addEventListener('click', () => {
    const newSettings = collectSettings(panel);
    props.onSave(newSettings);
    props.onClose();
  });

  resetBtn?.addEventListener('click', () => {
    props.onReset();
    props.onClose();
  });

  return panel;
}

/**
 * Collect settings from the panel form
 */
function collectSettings(panel: HTMLElement): Partial<UserSettings> {
  const pdfQuality = (panel.querySelector('#setting-pdf-quality') as HTMLSelectElement)?.value as 'standard' | 'high';
  const includeSourceUrl = (panel.querySelector('#setting-include-url') as HTMLInputElement)?.checked;
  const autoOpenNotebookLM = (panel.querySelector('#setting-auto-open') as HTMLInputElement)?.checked;
  const defaultDriveFolderId = (panel.querySelector('#setting-folder-id') as HTMLInputElement)?.value || null;

  return {
    pdfQuality,
    includeSourceUrl,
    autoOpenNotebookLM,
    defaultDriveFolderId,
  };
}

/**
 * Show the settings panel
 */
export function showSettingsPanel(panel: HTMLElement): void {
  panel.classList.add('open');
  document.body.classList.add('settings-open');
}

/**
 * Hide the settings panel
 */
export function hideSettingsPanel(panel: HTMLElement): void {
  panel.classList.remove('open');
  document.body.classList.remove('settings-open');
}

/**
 * Update settings panel with new settings
 */
export function updateSettingsPanelValues(
  panel: HTMLElement,
  settings: UserSettings
): void {
  const pdfQuality = panel.querySelector('#setting-pdf-quality') as HTMLSelectElement;
  const includeUrl = panel.querySelector('#setting-include-url') as HTMLInputElement;
  const autoOpen = panel.querySelector('#setting-auto-open') as HTMLInputElement;
  const folderId = panel.querySelector('#setting-folder-id') as HTMLInputElement;

  if (pdfQuality) pdfQuality.value = settings.pdfQuality;
  if (includeUrl) includeUrl.checked = settings.includeSourceUrl;
  if (autoOpen) autoOpen.checked = settings.autoOpenNotebookLM;
  if (folderId) folderId.value = settings.defaultDriveFolderId || '';
}
