# Data Model: RedNote to NotebookLM Chrome Extension

**Date**: 2026-01-03
**Feature**: 001-rednote-notebooklm

## Overview

This document defines the data structures used by the Chrome extension for capturing RedNote posts, generating PDFs, and tracking uploads.

---

## Core Entities

### CapturedPost

Represents a single captured RedNote post with all its content.

```typescript
interface CapturedPost {
  /** Unique identifier for this capture (UUID) */
  id: string;

  /** Original RedNote post URL */
  sourceUrl: string;

  /** Post title/caption (first line or explicit title) */
  title: string;

  /** Full post description text */
  description: string;

  /** Author display name */
  authorName: string;

  /** Author's RedNote user ID */
  authorId: string;

  /** Unix timestamp (ms) when capture occurred */
  captureTimestamp: number;

  /** Ordered list of images from the post */
  images: PostImage[];

  /** True if this is a video post */
  isVideo: boolean;

  /** Video thumbnail URL (only for video posts) */
  videoThumbnail: string | null;

  /** Processing status */
  status: CaptureStatus;
}

type CaptureStatus =
  | 'captured'       // Initial capture complete
  | 'pdf_generating' // PDF generation in progress
  | 'pdf_ready'      // PDF generated successfully
  | 'uploading'      // Upload to Drive in progress
  | 'uploaded'       // Upload complete
  | 'error';         // Error occurred
```

### Validation Rules

| Field | Rule |
|-------|------|
| `id` | UUID v4 format |
| `sourceUrl` | Must match RedNote URL patterns |
| `title` | Max 200 characters |
| `description` | Max 5000 characters |
| `authorName` | Max 100 characters |
| `captureTimestamp` | Must be valid Unix timestamp |
| `images` | Max 20 images per post |

---

### PostImage

An image extracted from a RedNote post.

```typescript
interface PostImage {
  /** CDN URL for the image */
  url: string;

  /** Position in carousel (0-indexed) */
  displayOrder: number;

  /** Original image width in pixels */
  width: number;

  /** Original image height in pixels */
  height: number;

  /** Downloaded image data (populated during PDF generation) */
  data?: ArrayBuffer;

  /** Image format (detected from URL or content) */
  format?: 'png' | 'jpeg' | 'webp';
}
```

### Validation Rules

| Field | Rule |
|-------|------|
| `url` | Must be valid HTTPS URL |
| `displayOrder` | Non-negative integer |
| `width` | Positive integer |
| `height` | Positive integer |

---

### GeneratedPDF

A PDF document created from captured content.

```typescript
interface GeneratedPDF {
  /** References the CapturedPost.id */
  capturedPostId: string;

  /** PDF file as Blob */
  blob: Blob;

  /** Generated filename */
  filename: string;

  /** PDF file size in bytes */
  sizeBytes: number;

  /** Unix timestamp (ms) when PDF was created */
  createdAt: number;

  /** Number of pages in the PDF */
  pageCount: number;
}
```

### Filename Convention

```
rednote_{authorName}_{timestamp}_{postIdShort}.pdf

Example: rednote_小红书用户_20260103_abc123.pdf
```

---

### UploadRecord

Tracks upload attempts to Google Drive.

```typescript
interface UploadRecord {
  /** Unique upload attempt ID (UUID) */
  id: string;

  /** References the CapturedPost.id */
  capturedPostId: string;

  /** Google Drive file ID (set on success) */
  driveFileId: string | null;

  /** Google Drive web view link */
  driveWebViewLink: string | null;

  /** Upload status */
  status: UploadStatus;

  /** Unix timestamp (ms) when upload started */
  startedAt: number;

  /** Unix timestamp (ms) when upload completed */
  completedAt: number | null;

  /** Error message if upload failed */
  errorMessage: string | null;

  /** Number of retry attempts */
  retryCount: number;
}

type UploadStatus =
  | 'pending'    // Queued for upload
  | 'uploading'  // Upload in progress
  | 'success'    // Upload completed
  | 'failed';    // Upload failed (may retry)
```

---

### UserSettings

Persistent user preferences.

```typescript
interface UserSettings {
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

const DEFAULT_SETTINGS: UserSettings = {
  defaultDriveFolderId: null,
  autoOpenNotebookLM: true,
  pdfQuality: 'standard',
  includeSourceUrl: true,
  lastNotebookUrl: null
};
```

---

### AuthState

OAuth authentication state (stored in session storage).

```typescript
interface AuthState {
  /** Google OAuth access token */
  accessToken: string | null;

  /** Token expiration timestamp (ms) */
  expiresAt: number | null;

  /** User's Google email */
  userEmail: string | null;

  /** Whether user is authenticated */
  isAuthenticated: boolean;
}
```

---

## Storage Schema

### chrome.storage.local

Persistent storage across browser sessions.

```typescript
interface LocalStorage {
  /** User preferences */
  settings: UserSettings;

  /** Historical upload records (last 100) */
  uploadHistory: UploadRecord[];

  /** Extension initialization flag */
  initialized: boolean;
}
```

### chrome.storage.session

Memory-only storage, cleared on browser restart.

```typescript
interface SessionStorage {
  /** Current OAuth state */
  auth: AuthState;

  /** Currently captured post (pending PDF generation) */
  currentCapture: CapturedPost | null;

  /** Generated PDF blob reference */
  currentPdf: {
    capturedPostId: string;
    blobUrl: string; // Object URL
    filename: string;
    sizeBytes: number;
  } | null;
}
```

---

## State Transitions

### Capture → Upload Flow

```
┌──────────┐     ┌───────────────┐     ┌───────────┐     ┌───────────┐
│ captured │ ──► │ pdf_generating│ ──► │ pdf_ready │ ──► │ uploading │
└──────────┘     └───────────────┘     └───────────┘     └───────────┘
                                              │                  │
                                              ▼                  ▼
                                        ┌──────────┐      ┌──────────┐
                                        │ (user    │      │ uploaded │
                                        │ downloads)│      └──────────┘
                                        └──────────┘

On error at any stage → status = 'error'
```

### Upload Retry Logic

```
┌─────────┐     ┌───────────┐     ┌─────────┐
│ pending │ ──► │ uploading │ ──► │ success │
└─────────┘     └───────────┘     └─────────┘
                     │
                     ▼ (on error)
                ┌─────────┐
                │ failed  │ ──► retry (max 3) ──► pending
                └─────────┘
```

---

## Entity Relationships

```
┌────────────────┐
│  CapturedPost  │
│                │
│ id (PK)        │◄──────────────────────┐
│ sourceUrl      │                       │
│ title          │                       │
│ description    │                       │
│ authorName     │                       │
│ images[]       │──────┐                │
│ status         │      │                │
└────────────────┘      │                │
                        │                │
        ┌───────────────┘                │
        ▼                                │
┌────────────────┐              ┌────────────────┐
│   PostImage    │              │  UploadRecord  │
│                │              │                │
│ url            │              │ id (PK)        │
│ displayOrder   │              │ capturedPostId │──┘
│ width          │              │ driveFileId    │
│ height         │              │ status         │
│ data?          │              │ retryCount     │
└────────────────┘              └────────────────┘
```

---

## Indexes and Queries

### Common Access Patterns

| Query | Storage | Key |
|-------|---------|-----|
| Get current capture | session | `currentCapture` |
| Get all upload history | local | `uploadHistory` |
| Get upload by post ID | local | `uploadHistory.filter(r => r.capturedPostId === id)` |
| Get failed uploads | local | `uploadHistory.filter(r => r.status === 'failed')` |
| Get settings | local | `settings` |

### Data Retention

| Data | Retention |
|------|-----------|
| Current capture | Until next capture or browser close |
| Generated PDF | Until upload success or browser close |
| Upload history | Last 100 records |
| Settings | Permanent |
| Auth tokens | Session only |
