# Google Drive API Contract

This document defines the Google Drive API integration patterns for uploading PDFs.

## Overview

The extension uses Google Drive API v3 for file uploads. Authentication is handled via `chrome.identity.getAuthToken()`.

---

## OAuth Scopes

### Required Scope

```
https://www.googleapis.com/auth/drive.file
```

This scope grants:
- Create new files
- View and modify files created by this app
- Does NOT grant access to user's other Drive files

### Why Not Broader Scopes

| Scope | Reason Not Used |
|-------|-----------------|
| `drive` | Full access - too broad, security risk |
| `drive.readonly` | Can't upload files |
| `drive.appdata` | Hidden folder - user can't see files |

---

## API Endpoints

### Base URL

```
https://www.googleapis.com/upload/drive/v3
```

---

## Upload File (Multipart)

Upload PDF file with metadata in a single request.

### Request

```http
POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart
Authorization: Bearer {access_token}
Content-Type: multipart/related; boundary=boundary_string
```

### Request Body

```
--boundary_string
Content-Type: application/json; charset=UTF-8

{
  "name": "rednote_author_20260103_abc123.pdf",
  "mimeType": "application/pdf",
  "parents": ["folder_id"],  // Optional
  "description": "Captured from RedNote: https://www.xiaohongshu.com/explore/abc123"
}
--boundary_string
Content-Type: application/pdf

<PDF binary data>
--boundary_string--
```

### Success Response (200 OK)

```typescript
interface DriveFileResponse {
  kind: 'drive#file';
  id: string;           // Unique file ID
  name: string;         // File name
  mimeType: string;     // 'application/pdf'
  webViewLink?: string; // Browser view URL
  webContentLink?: string; // Download URL
}
```

### Example Response

```json
{
  "kind": "drive#file",
  "id": "1ABC123xyz",
  "name": "rednote_author_20260103_abc123.pdf",
  "mimeType": "application/pdf"
}
```

---

## Get Web View Link

After upload, request the web view link for sharing.

### Request

```http
GET https://www.googleapis.com/drive/v3/files/{fileId}?fields=webViewLink
Authorization: Bearer {access_token}
```

### Success Response (200 OK)

```json
{
  "webViewLink": "https://drive.google.com/file/d/1ABC123xyz/view"
}
```

---

## List User's Folders

For folder picker functionality.

### Request

```http
GET https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'&fields=files(id,name)
Authorization: Bearer {access_token}
```

### Success Response (200 OK)

```typescript
interface FolderListResponse {
  kind: 'drive#fileList';
  files: Array<{
    id: string;
    name: string;
  }>;
}
```

---

## Error Responses

### 401 Unauthorized

Token expired or invalid.

```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials.",
    "status": "UNAUTHENTICATED"
  }
}
```

**Action**: Re-authenticate with `chrome.identity.getAuthToken({ interactive: true })`

### 403 Forbidden

Insufficient permissions or rate limit.

```json
{
  "error": {
    "code": 403,
    "message": "The user does not have sufficient permissions for this file.",
    "status": "PERMISSION_DENIED"
  }
}
```

**Action**: Check OAuth scope, verify file ownership

### 404 Not Found

File or folder not found.

```json
{
  "error": {
    "code": 404,
    "message": "File not found: {fileId}",
    "status": "NOT_FOUND"
  }
}
```

**Action**: Verify file/folder ID exists

### 429 Rate Limit

Too many requests.

```json
{
  "error": {
    "code": 429,
    "message": "Rate Limit Exceeded",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**Action**: Implement exponential backoff

---

## Implementation Pattern

```typescript
interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

async function uploadToDrive(
  pdfBlob: Blob,
  filename: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const token = await getAuthToken();

  const metadata: Record<string, unknown> = {
    name: filename,
    mimeType: 'application/pdf'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Build multipart request
  const boundary = 'rednote_boundary_' + Date.now();
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelimiter = '\r\n--' + boundary + '--';

  const metadataBlob = new Blob(
    [JSON.stringify(metadata)],
    { type: 'application/json' }
  );

  const body = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataBlob,
    delimiter,
    'Content-Type: application/pdf\r\n\r\n',
    pdfBlob,
    closeDelimiter
  ]);

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(`Drive upload failed: ${error.error?.message}`);
  }

  const file = await uploadResponse.json();

  // Get web view link
  const linkResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?fields=webViewLink`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const linkData = await linkResponse.json();

  return {
    fileId: file.id,
    webViewLink: linkData.webViewLink
  };
}
```

---

## Rate Limits

| Limit Type | Value |
|------------|-------|
| Queries per 100 seconds | 1,000 |
| Uploads per 100 seconds per user | 100 |
| Maximum file size | 5 TB |

For this extension's use case (single-user, occasional uploads), rate limits are unlikely to be hit.

---

## Testing

### Mock Responses for Tests

```typescript
// tests/mocks/drive-api.ts
export const mockUploadResponse: DriveFileResponse = {
  kind: 'drive#file',
  id: 'mock-file-id-123',
  name: 'test.pdf',
  mimeType: 'application/pdf'
};

export const mockWebViewResponse = {
  webViewLink: 'https://drive.google.com/file/d/mock-file-id-123/view'
};

export const mockErrorResponse = {
  error: {
    code: 401,
    message: 'Request had invalid authentication credentials.',
    status: 'UNAUTHENTICATED'
  }
};
```
