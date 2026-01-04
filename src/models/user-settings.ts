/**
 * Persistent user preferences
 */
export interface UserSettings {
  /** Default Google Drive folder ID for uploads */
  defaultDriveFolderId: string | null;

  /** Whether to auto-open NotebookLM after upload */
  autoOpenNotebookLM: boolean;

  /** PDF quality setting */
  pdfQuality: 'standard' | 'high';

  /** Whether to include source URL in PDF footer */
  includeSourceUrl: boolean;

  /** Last used NotebookLM notebook URL (for quick access) */
  lastNotebookUrl: string | null;
}

/**
 * Default settings for new users
 */
export const DEFAULT_SETTINGS: UserSettings = {
  defaultDriveFolderId: null,
  autoOpenNotebookLM: true,
  pdfQuality: 'standard',
  includeSourceUrl: true,
  lastNotebookUrl: null,
};
