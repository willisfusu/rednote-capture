# RedNote Capture

A Chrome extension to capture posts from RedNote (小红书/Xiaohongshu) and save them as PDF files for Google NotebookLM or local storage.

## Features

- **Single Post Capture**: Capture individual RedNote posts with images and text
- **Batch Processing**: On profile pages, select multiple posts to generate PDFs in batch
- **PDF Generation**: Convert captured posts to beautifully formatted PDFs
- **Merge Option**: Combine multiple posts into a single PDF document
- **Google Drive Integration**: Upload PDFs directly to Google Drive
- **Local Download**: Save PDFs locally to your computer

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/willisfusu/rednote-capture.git
   cd rednote-capture
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Usage

### Single Post Capture
1. Navigate to any RedNote post
2. Click the extension icon
3. Click "Capture Post"
4. Generate PDF and download or upload to Drive

### Batch Processing
1. Navigate to a RedNote user's profile page
2. Click the extension icon
3. Select posts you want to capture
4. Optionally check "Merge into single PDF"
5. Click "Generate PDFs"

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+R` | Open extension popup |
| `Alt+C` | Capture current post |
| `Alt+P` | Generate PDF |
| `Alt+U` | Upload to Google Drive |

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Tech Stack

- TypeScript
- Vite + CRXJS (Chrome Extension bundling)
- pdf-lib (PDF generation)
- Chrome Extensions Manifest V3

## License

MIT
