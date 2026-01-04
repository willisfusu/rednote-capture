# Research: RedNote to NotebookLM Chrome Extension

**Date**: 2026-01-03
**Feature**: 001-rednote-notebooklm

## Overview

This document consolidates research findings for building a Chrome extension that captures Xiaohongshu (RedNote) posts and uploads them to Google NotebookLM.

---

## 1. Chrome Extension Architecture (Manifest V3)

### Decision: Event-Driven Service Worker with Programmatic Content Script Injection

### Rationale
- MV3 requires service workers instead of persistent background pages
- Service workers terminate after 30 seconds of inactivity
- Event listeners must be registered synchronously at the top level
- `activeTab` permission minimizes install-time warnings

### Key Patterns

**Service Worker Lifecycle:**
```javascript
// Register listeners synchronously at top level
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ initialized: true });
});

chrome.action.onClicked.addListener((tab) => {
  // Inject content script on demand
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/extractor.js']
  });
});
```

**Content Script Injection:**
- Use `chrome.scripting.executeScript()` with `activeTab` permission
- Inject only when user clicks extension icon
- Use `ISOLATED` world (default) for security

**Storage Strategy:**
| Data Type | Storage | Reason |
|-----------|---------|--------|
| OAuth tokens | `chrome.storage.session` | Memory-only, cleared on restart |
| User preferences | `chrome.storage.local` | Persistent across sessions |
| Captured posts (temp) | `chrome.storage.session` | Clear on browser restart |

### Alternatives Considered
- **Persistent background page**: Deprecated in MV3
- **Broad host permissions**: Triggers scary install warnings
- **`MAIN` world injection**: Exposes script to page JS, security risk

---

## 2. PDF Generation Library

### Decision: pdf-lib with @pdf-lib/fontkit

### Rationale
- Pure TypeScript, works in service workers (no DOM dependencies)
- Native support for custom fonts (Chinese characters via fontkit)
- Image embedding for PNG/JPEG
- Reasonable bundle size (~371 KB gzipped)
- Can create and modify PDFs

### Implementation Notes

**Chinese Font Support:**
```typescript
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const pdfDoc = await PDFDocument.create();
pdfDoc.registerFontkit(fontkit);

// Load bundled Chinese font
const fontBytes = await fetch(chrome.runtime.getURL('fonts/NotoSansSC-Regular.ttf'))
  .then(r => r.arrayBuffer());
const customFont = await pdfDoc.embedFont(fontBytes);
```

**Image Embedding:**
```typescript
// From base64 or ArrayBuffer
const imageBytes = await fetch(imageUrl).then(r => r.arrayBuffer());
const image = await pdfDoc.embedPng(imageBytes); // or embedJpg
```

**Font Bundling Considerations:**
- NotoSansSC-Regular.ttf is ~16MB full
- Use subset font generator to reduce to ~2-3MB for common characters
- Load font lazily when PDF generation is requested

### Alternatives Considered
| Library | Pros | Cons |
|---------|------|------|
| jsPDF | Smallest (~229KB) | Manual Chinese font setup, can't edit PDFs |
| pdfmake | Declarative API | Largest bundle (500KB+), font issues |

---

## 3. NotebookLM Integration

### Decision: Google Drive API as Intermediary

### Rationale
- Consumer NotebookLM has **no public API**
- Enterprise API requires Google Cloud project + Enterprise subscription
- Google Drive API is stable, well-documented, and consumer-accessible
- User manually imports Drive file to NotebookLM (simple workflow)

### Integration Flow
```
1. User captures RedNote post
2. Extension generates PDF
3. Extension uploads PDF to Google Drive (via OAuth)
4. Extension shows success with "Open in NotebookLM" button
5. User clicks button → opens NotebookLM → adds source from Drive
```

### OAuth Configuration

**Manifest.json:**
```json
{
  "permissions": ["identity", "storage"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

**Authentication:**
```typescript
async function getGoogleToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(token);
      }
    });
  });
}
```

**File Upload:**
```typescript
async function uploadToDrive(pdfBlob: Blob, filename: string): Promise<string> {
  const token = await getGoogleToken();

  const metadata = {
    name: filename,
    mimeType: 'application/pdf'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    }
  );

  const result = await response.json();
  return result.id; // Drive file ID
}
```

### Alternatives Considered
| Approach | Viable | Reason |
|----------|--------|--------|
| NotebookLM Enterprise API | No | Requires Enterprise subscription |
| Browser automation | No | Fragile, ToS concerns |
| Direct NotebookLM integration | No | No consumer API exists |

---

## 4. RedNote Page Structure

### Decision: Extract from `window.__INITIAL_STATE__` JSON

### Rationale
- RedNote embeds structured data in initial HTML
- More reliable than parsing dynamic DOM
- Contains all post data: title, description, images, author
- Avoids anti-scraping DOM obfuscation

### Extraction Pattern

**URL Detection:**
```typescript
const REDNOTE_POST_PATTERNS = [
  /^https:\/\/www\.xiaohongshu\.com\/explore\/([a-zA-Z0-9]+)/,
  /^https:\/\/www\.xiaohongshu\.com\/discovery\/item\/([a-zA-Z0-9]+)/,
  /^https:\/\/www\.xiaohongshu\.com\/user\/profile\/[^/]+\/([a-zA-Z0-9]+)/
];

function isRedNotePost(url: string): boolean {
  return REDNOTE_POST_PATTERNS.some(pattern => pattern.test(url));
}
```

**Data Extraction (Content Script):**
```typescript
function extractPostData(): CapturedPost | null {
  // Find embedded JSON
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const content = script.textContent || '';
    const match = content.match(/window\.__INITIAL_STATE__\s*=\s*({.*?})\s*(?:<\/script>|$)/s);
    if (match) {
      const data = JSON.parse(match[1]);
      return parseNoteData(data);
    }
  }
  return null;
}

function parseNoteData(data: any): CapturedPost {
  // Handle both snake_case (API) and camelCase (HTML embedded) formats
  const note = data.note_card || data.noteCard || data;

  return {
    sourceUrl: window.location.href,
    title: note.title || '',
    description: note.desc || note.description || '',
    authorName: note.user?.nickname || note.user?.nickName || '',
    authorId: note.user?.user_id || note.user?.userId || '',
    captureTimestamp: Date.now(),
    images: extractImages(note.image_list || note.imageList || []),
    isVideo: note.type === 'video',
    videoThumbnail: note.type === 'video' ? note.cover?.url_default : null
  };
}

function extractImages(imageList: any[]): PostImage[] {
  return imageList.map((img, index) => ({
    url: img.url_default || img.urlDefault || img.url,
    displayOrder: index,
    width: img.width,
    height: img.height
  }));
}
```

### Anti-Scraping Mitigations
| Challenge | Mitigation |
|-----------|------------|
| Dynamic class names | Use `__INITIAL_STATE__` JSON, not DOM |
| Rate limiting | Single post per user action (no automation) |
| xsec_token | Token is in page URL, not needed for reading |
| Login requirement | User is already logged in via browser |

### Image Downloading
```typescript
async function downloadImages(images: PostImage[]): Promise<ArrayBuffer[]> {
  return Promise.all(
    images.map(img => fetch(img.url).then(r => r.arrayBuffer()))
  );
}
```

**Note**: Images are on `xhscdn.com` CDN, typically accessible without authentication.

---

## 5. Extension Permissions

### Minimal Permission Set

```json
{
  "manifest_version": 3,
  "permissions": [
    "activeTab",      // Access current tab only when user clicks
    "storage",        // chrome.storage.local/session
    "identity",       // Google OAuth
    "downloads"       // Save PDF locally
  ],
  "host_permissions": [
    "https://www.xiaohongshu.com/*",           // RedNote pages
    "https://sns-img-*.xhscdn.com/*",          // RedNote CDN images
    "https://www.googleapis.com/*"              // Google Drive API
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

### Permission Rationale
| Permission | Why Needed |
|------------|------------|
| `activeTab` | Inject content script without broad host access |
| `storage` | Persist settings, cache tokens |
| `identity` | Google OAuth for Drive API |
| `downloads` | Save PDF to local filesystem |
| Host: xiaohongshu.com | Content script execution |
| Host: xhscdn.com | Fetch post images |
| Host: googleapis.com | Drive API calls |

---

## 6. Build & Bundling

### Decision: Vite with Chrome Extension Plugin

### Rationale
- Fast HMR during development
- Built-in TypeScript support
- Tree-shaking for smaller bundles
- `@crxjs/vite-plugin` handles MV3 manifest

### Configuration

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        background: 'src/background/service-worker.ts',
        content: 'src/content/extractor.ts'
      }
    }
  }
});
```

### Bundle Size Targets
| Component | Target Size |
|-----------|-------------|
| Service worker | < 100 KB |
| Content script | < 50 KB |
| Popup | < 200 KB |
| pdf-lib | ~400 KB (loaded on demand) |
| Chinese font | ~3 MB (subset) |

---

## Summary of Key Decisions

| Area | Decision | Key Reason |
|------|----------|------------|
| Architecture | MV3 Service Worker | Chrome requirement |
| Content Extraction | `__INITIAL_STATE__` JSON | Reliable, avoids DOM obfuscation |
| PDF Generation | pdf-lib + fontkit | Chinese support, works in SW |
| NotebookLM Integration | Google Drive API | No consumer API for NotebookLM |
| Auth | chrome.identity.getAuthToken | Chrome-native, cached tokens |
| Bundler | Vite + @crxjs/vite-plugin | Fast dev, MV3 support |
