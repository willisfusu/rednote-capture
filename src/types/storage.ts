import type { CapturedPost } from '../models/captured-post';
import type { UserSettings } from '../models/user-settings';
import type { AuthState } from '../models/auth-state';
import type { UploadRecord } from '../models/upload-record';
import type { GeneratedPdf } from '../models/generated-pdf';

/**
 * Persistent storage across browser sessions (chrome.storage.local)
 */
export interface LocalStorage {
  /** User preferences */
  settings: UserSettings;

  /** Historical upload records (last 100) */
  uploadHistory: UploadRecord[];

  /** Extension initialization flag */
  initialized: boolean;
}

/**
 * Memory-only storage, cleared on browser restart (chrome.storage.session)
 */
export interface SessionStorage {
  /** Current OAuth state */
  auth: AuthState;

  /** Currently captured post (pending PDF generation) */
  currentCapture: CapturedPost | null;

  /** Generated PDF data (base64-encoded) */
  currentPdf: GeneratedPdf | null;

  /** Posts queued for batch processing */
  postQueue: CapturedPost[];
}

/**
 * Storage keys for type-safe access
 */
export const STORAGE_KEYS = {
  local: {
    settings: 'settings',
    uploadHistory: 'uploadHistory',
    initialized: 'initialized',
  },
  session: {
    auth: 'auth',
    currentCapture: 'currentCapture',
    currentPdf: 'currentPdf',
    postQueue: 'postQueue',
  },
} as const;
