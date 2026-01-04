/**
 * Base message interface for Chrome extension messaging
 */
export interface Message<T = unknown> {
  /** Action identifier */
  action: string;

  /** Action-specific payload */
  payload?: T;

  /** Optional request ID for tracking */
  requestId?: string;
}

/**
 * Base response interface for Chrome extension messaging
 */
export interface Response<T = unknown> {
  /** Whether the action succeeded */
  success: boolean;

  /** Response data (on success) */
  data?: T;

  /** Error message (on failure) */
  error?: string;

  /** Error code (on failure) */
  errorCode?: string;

  /** Matches request ID if provided */
  requestId?: string;
}

// Message action types
export type MessageAction =
  | 'CAPTURE_POST'
  | 'GENERATE_PDF'
  | 'DOWNLOAD_PDF'
  | 'UPLOAD_TO_DRIVE'
  | 'SIGN_IN'
  | 'SIGN_OUT'
  | 'GET_AUTH_STATE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'GET_UPLOAD_HISTORY'
  | 'CHECK_PAGE'
  | 'EXTRACT_POST'
  | 'ADD_TO_QUEUE'
  | 'PROCESS_QUEUE'
  | 'CLEAR_QUEUE';
