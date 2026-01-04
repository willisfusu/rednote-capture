# Chrome Extension Message Contracts

This document defines the message-passing contracts between extension components (popup, background service worker, content scripts).

## Overview

The extension uses Chrome's messaging API for inter-component communication:

- **Popup ↔ Background**: `chrome.runtime.sendMessage`
- **Content ↔ Background**: `chrome.runtime.sendMessage`
- **Background → Content**: `chrome.tabs.sendMessage`

---

## Message Format

All messages follow this base structure:

```typescript
interface Message<T = unknown> {
  /** Action identifier */
  action: string;

  /** Action-specific payload */
  payload?: T;

  /** Optional request ID for tracking */
  requestId?: string;
}

interface Response<T = unknown> {
  /** Whether the action succeeded */
  success: boolean;

  /** Response data (on success) */
  data?: T;

  /** Error message (on failure) */
  error?: string;

  /** Matches request ID if provided */
  requestId?: string;
}
```

---

## Popup → Background Messages

### `CAPTURE_POST`

Request the background service worker to trigger content capture.

```typescript
// Request
interface CapturePostRequest {
  action: 'CAPTURE_POST';
  payload: {
    tabId: number;
  };
}

// Response
interface CapturePostResponse {
  success: boolean;
  data?: {
    post: CapturedPost;
  };
  error?: string;
}
```

### `GENERATE_PDF`

Generate PDF from currently captured post.

```typescript
// Request
interface GeneratePdfRequest {
  action: 'GENERATE_PDF';
  payload: {
    capturedPostId: string;
    options?: {
      quality: 'standard' | 'high';
      includeSourceUrl: boolean;
    };
  };
}

// Response
interface GeneratePdfResponse {
  success: boolean;
  data?: {
    blobUrl: string;
    filename: string;
    sizeBytes: number;
    pageCount: number;
  };
  error?: string;
}
```

### `UPLOAD_TO_DRIVE`

Upload generated PDF to Google Drive.

```typescript
// Request
interface UploadToDriveRequest {
  action: 'UPLOAD_TO_DRIVE';
  payload: {
    capturedPostId: string;
    folderId?: string;  // Optional target folder
  };
}

// Response
interface UploadToDriveResponse {
  success: boolean;
  data?: {
    driveFileId: string;
    webViewLink: string;
  };
  error?: string;
}
```

### `DOWNLOAD_PDF`

Save PDF to local filesystem.

```typescript
// Request
interface DownloadPdfRequest {
  action: 'DOWNLOAD_PDF';
  payload: {
    capturedPostId: string;
  };
}

// Response
interface DownloadPdfResponse {
  success: boolean;
  data?: {
    downloadId: number;
    filename: string;
  };
  error?: string;
}
```

### `GET_AUTH_STATE`

Check current authentication status.

```typescript
// Request
interface GetAuthStateRequest {
  action: 'GET_AUTH_STATE';
}

// Response
interface GetAuthStateResponse {
  success: boolean;
  data?: {
    isAuthenticated: boolean;
    userEmail: string | null;
  };
  error?: string;
}
```

### `SIGN_IN`

Initiate Google OAuth sign-in.

```typescript
// Request
interface SignInRequest {
  action: 'SIGN_IN';
  payload?: {
    interactive: boolean;  // Default: true
  };
}

// Response
interface SignInResponse {
  success: boolean;
  data?: {
    userEmail: string;
  };
  error?: string;
}
```

### `SIGN_OUT`

Sign out and clear tokens.

```typescript
// Request
interface SignOutRequest {
  action: 'SIGN_OUT';
}

// Response
interface SignOutResponse {
  success: boolean;
}
```

### `GET_SETTINGS`

Retrieve user settings.

```typescript
// Request
interface GetSettingsRequest {
  action: 'GET_SETTINGS';
}

// Response
interface GetSettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
}
```

### `UPDATE_SETTINGS`

Update user settings.

```typescript
// Request
interface UpdateSettingsRequest {
  action: 'UPDATE_SETTINGS';
  payload: Partial<UserSettings>;
}

// Response
interface UpdateSettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
}
```

### `GET_UPLOAD_HISTORY`

Retrieve upload history.

```typescript
// Request
interface GetUploadHistoryRequest {
  action: 'GET_UPLOAD_HISTORY';
  payload?: {
    limit?: number;  // Default: 20
    status?: UploadStatus;
  };
}

// Response
interface GetUploadHistoryResponse {
  success: boolean;
  data?: {
    records: UploadRecord[];
    total: number;
  };
  error?: string;
}
```

---

## Background → Content Script Messages

### `EXTRACT_POST`

Command content script to extract post data from page.

```typescript
// Request
interface ExtractPostRequest {
  action: 'EXTRACT_POST';
}

// Response
interface ExtractPostResponse {
  success: boolean;
  data?: {
    post: CapturedPost;
    pageUrl: string;
  };
  error?: string;
}
```

### `CHECK_PAGE`

Check if current page is a valid RedNote post.

```typescript
// Request
interface CheckPageRequest {
  action: 'CHECK_PAGE';
}

// Response
interface CheckPageResponse {
  success: boolean;
  data?: {
    isRedNotePost: boolean;
    pageUrl: string;
  };
  error?: string;
}
```

---

## Background → Popup Messages (Events)

### `STATE_CHANGED`

Notify popup of state changes (via storage change listener).

```typescript
// Event (not a direct message, use storage.onChanged)
interface StateChangedEvent {
  type: 'STATE_CHANGED';
  changes: {
    currentCapture?: CapturedPost | null;
    currentPdf?: GeneratedPDF | null;
    auth?: AuthState;
  };
}
```

---

## Error Codes

Standard error codes for response messages:

```typescript
enum ErrorCode {
  // General
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Capture errors
  NOT_REDNOTE_PAGE = 'NOT_REDNOTE_PAGE',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  NO_POST_DATA = 'NO_POST_DATA',

  // PDF errors
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  IMAGE_DOWNLOAD_FAILED = 'IMAGE_DOWNLOAD_FAILED',
  FONT_LOAD_FAILED = 'FONT_LOAD_FAILED',

  // Upload errors
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DRIVE_API_ERROR = 'DRIVE_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Auth errors
  AUTH_CANCELLED = 'AUTH_CANCELLED',
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode: ErrorCode;
  details?: unknown;
}
```

---

## Message Handler Example

Background service worker message handler:

```typescript
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message,
          errorCode: ErrorCode.UNKNOWN_ERROR
        });
      });

    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<Response> {
  switch (message.action) {
    case 'CAPTURE_POST':
      return handleCapturePost(message.payload);
    case 'GENERATE_PDF':
      return handleGeneratePdf(message.payload);
    case 'UPLOAD_TO_DRIVE':
      return handleUploadToDrive(message.payload);
    // ... other handlers
    default:
      return {
        success: false,
        error: `Unknown action: ${message.action}`,
        errorCode: ErrorCode.INVALID_REQUEST
      };
  }
}
```

---

## Type Exports

All types should be exported from a central location:

```typescript
// src/types/messages.ts
export type {
  Message,
  Response,
  CapturePostRequest,
  CapturePostResponse,
  GeneratePdfRequest,
  GeneratePdfResponse,
  UploadToDriveRequest,
  UploadToDriveResponse,
  DownloadPdfRequest,
  DownloadPdfResponse,
  GetAuthStateRequest,
  GetAuthStateResponse,
  SignInRequest,
  SignInResponse,
  SignOutRequest,
  SignOutResponse,
  GetSettingsRequest,
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  GetUploadHistoryRequest,
  GetUploadHistoryResponse,
  ExtractPostRequest,
  ExtractPostResponse,
  CheckPageRequest,
  CheckPageResponse,
  ErrorCode,
  ErrorResponse
};
```
