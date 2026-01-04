/**
 * Settings Handlers - Manages user settings
 */

import type { Response } from '../../types/messages';
import type { UserSettings } from '../../models/user-settings';
import { ErrorCode, createErrorResponse } from '../../types/errors';

const SETTINGS_KEY = 'settings';

/**
 * Default user settings
 */
const defaultSettings: UserSettings = {
  defaultDriveFolderId: null,
  autoOpenNotebookLM: true,
  pdfQuality: 'standard',
  includeSourceUrl: true,
  lastNotebookUrl: null,
};

/**
 * Handle getting user settings
 */
export async function handleGetSettings(
  requestId?: string
): Promise<Response> {
  const { settings } = await chrome.storage.local.get(SETTINGS_KEY);

  // Merge with defaults to ensure all keys exist
  const mergedSettings: UserSettings = {
    ...defaultSettings,
    ...(settings || {}),
  };

  return {
    success: true,
    data: mergedSettings,
    requestId,
  };
}

/**
 * Handle updating user settings
 */
export async function handleUpdateSettings(
  payload: unknown,
  requestId?: string
): Promise<Response> {
  if (!payload || typeof payload !== 'object') {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Invalid settings payload',
      requestId
    );
  }

  // Validate payload has only known keys
  const updates = payload as Partial<UserSettings>;
  const validKeys: (keyof UserSettings)[] = [
    'defaultDriveFolderId',
    'autoOpenNotebookLM',
    'pdfQuality',
    'includeSourceUrl',
    'lastNotebookUrl',
  ];

  const invalidKeys = Object.keys(updates).filter(
    (key) => !validKeys.includes(key as keyof UserSettings)
  );

  if (invalidKeys.length > 0) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      `Invalid settings keys: ${invalidKeys.join(', ')}`,
      requestId
    );
  }

  // Validate specific fields
  if (updates.pdfQuality !== undefined) {
    if (!['standard', 'high'].includes(updates.pdfQuality)) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'pdfQuality must be "standard" or "high"',
        requestId
      );
    }
  }

  if (updates.autoOpenNotebookLM !== undefined) {
    if (typeof updates.autoOpenNotebookLM !== 'boolean') {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'autoOpenNotebookLM must be a boolean',
        requestId
      );
    }
  }

  if (updates.includeSourceUrl !== undefined) {
    if (typeof updates.includeSourceUrl !== 'boolean') {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'includeSourceUrl must be a boolean',
        requestId
      );
    }
  }

  // Get current settings and merge with updates
  const { settings: currentSettings } = await chrome.storage.local.get(SETTINGS_KEY);
  const updatedSettings: UserSettings = {
    ...defaultSettings,
    ...(currentSettings || {}),
    ...updates,
  };

  // Save updated settings
  await chrome.storage.local.set({ [SETTINGS_KEY]: updatedSettings });

  return {
    success: true,
    data: updatedSettings,
    requestId,
  };
}

/**
 * Handle resetting settings to defaults
 */
export async function handleResetSettings(
  requestId?: string
): Promise<Response> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: defaultSettings });

  return {
    success: true,
    data: defaultSettings,
    requestId,
  };
}

/**
 * Get settings synchronously (for use within service worker)
 */
export async function getSettings(): Promise<UserSettings> {
  const { settings } = await chrome.storage.local.get(SETTINGS_KEY);
  return {
    ...defaultSettings,
    ...(settings || {}),
  };
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  const current = await getSettings();
  current[key] = value;
  await chrome.storage.local.set({ [SETTINGS_KEY]: current });
}
