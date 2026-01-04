# Quickstart: RedNote to NotebookLM Chrome Extension

This guide walks you through installing, configuring, and using the RedNote to NotebookLM extension.

---

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store page (link TBD)
2. Click "Add to Chrome"
3. Confirm the permissions

### Developer Installation (From Source)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd RedNotes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist/` folder

---

## First-Time Setup

### 1. Sign in with Google

The extension needs Google account access to upload files to Drive.

1. Click the extension icon in Chrome toolbar
2. Click "Sign in with Google"
3. Choose your Google account
4. Grant permission for "See, edit, create, and delete only the specific Google Drive files you use with this app"

### 2. Configure Settings (Optional)

Click the gear icon in the popup to customize:

| Setting | Description | Default |
|---------|-------------|---------|
| PDF Quality | Standard or High resolution | Standard |
| Include Source URL | Add post URL to PDF footer | Yes |
| Auto-open NotebookLM | Open NotebookLM after upload | Yes |
| Default Drive Folder | Where to save PDFs | Root |

---

## Using the Extension

### Capture a RedNote Post

1. Navigate to a RedNote post on `xiaohongshu.com`
   - Example: `https://www.xiaohongshu.com/explore/abc123`

2. Click the extension icon in Chrome toolbar
   - The popup shows "RedNote post detected"

3. Click "Capture Post"
   - Wait for images to download
   - Status shows "Capture complete"

### Generate PDF

1. After capturing, click "Generate PDF"
   - Wait for PDF creation (10-30 seconds depending on images)
   - Status shows "PDF ready"

2. Options:
   - **Download**: Save PDF to your computer
   - **Upload to Drive**: Save to Google Drive

### Upload to NotebookLM

1. Click "Upload to Drive"
   - Wait for upload to complete
   - Status shows "Upload complete"

2. Click "Open in NotebookLM"
   - Opens NotebookLM in a new tab

3. In NotebookLM:
   - Click "Add source"
   - Select "Google Drive"
   - Find your uploaded PDF
   - Click "Insert"

---

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Browse RedNote  →  Click Extension  →  Capture Post               │
│                                                                     │
│                              ↓                                      │
│                                                                     │
│                       Generate PDF                                  │
│                                                                     │
│                     ↓              ↓                                │
│                                                                     │
│              Download PDF    OR    Upload to Drive                  │
│                                                                     │
│                                         ↓                           │
│                                                                     │
│                               Open NotebookLM                       │
│                                                                     │
│                                         ↓                           │
│                                                                     │
│                              Add source from Drive                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Supported Content

### Post Types

| Type | Captured Content |
|------|------------------|
| Image carousel | All images + text description |
| Single image | Image + text description |
| Video post | Thumbnail + text description |
| Text-only | Text description only |

### PDF Contents

Each generated PDF includes:
- Post title (as document title)
- Author name and profile link
- All images (one per page for carousel)
- Full text description
- Capture date and source URL (optional)

---

## Troubleshooting

### "Not a RedNote post"

**Cause**: You're not on a post page.

**Solution**: Navigate to a specific post URL like:
- `https://www.xiaohongshu.com/explore/abc123`
- `https://www.xiaohongshu.com/discovery/item/abc123`

### "Capture failed"

**Cause**: Post might be private or deleted.

**Solutions**:
- Make sure you're logged in to RedNote
- Try refreshing the page
- Check if the post is still accessible

### "PDF generation failed"

**Cause**: Image download failed or font loading issue.

**Solutions**:
- Check your internet connection
- Try capturing again
- If persistent, report the issue

### "Upload failed"

**Cause**: Authentication issue or network error.

**Solutions**:
- Click "Sign out" then "Sign in" again
- Check your internet connection
- Ensure you have Drive storage space

### "Can't find uploaded file in NotebookLM"

**Cause**: File is in Drive but not showing in NotebookLM.

**Solutions**:
- In NotebookLM, click "Add source" → "Google Drive" → "Recent"
- Search for the filename in Drive picker
- Check your default Drive folder setting

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+C` | Capture current post |
| `Alt+P` | Generate PDF |
| `Alt+U` | Upload to Drive |

(Shortcuts can be customized at `chrome://extensions/shortcuts`)

---

## Privacy & Data

### What data is collected?

- **Post content**: Text and images from the page you capture (stored locally)
- **Google account email**: For authentication display only

### What data is sent externally?

- **PDF files**: Uploaded to YOUR Google Drive (only if you click Upload)
- **No analytics**: No tracking or telemetry

### Data storage

- Captured posts: Memory only (cleared on browser close)
- Upload history: Last 100 records (stored locally)
- Auth tokens: Memory only (cleared on browser close)

---

## Uninstallation

1. Right-click the extension icon
2. Select "Remove from Chrome"
3. Confirm removal

To also revoke Google access:
1. Go to [Google Account Security](https://myaccount.google.com/permissions)
2. Find "RedNote to NotebookLM"
3. Click "Remove Access"

---

## Getting Help

- **Bug reports**: [GitHub Issues](link-tbd)
- **Feature requests**: [GitHub Discussions](link-tbd)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | TBD | Initial release |
