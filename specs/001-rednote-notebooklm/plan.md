# Implementation Plan: RedNote to NotebookLM Chrome Extension

**Branch**: `001-rednote-notebooklm` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rednote-notebooklm/spec.md`

## Summary

Build a Chrome extension (Manifest V3) that captures text and images from Xiaohongshu (RedNote) posts, generates PDFs with proper Chinese character support, and uploads them to Google NotebookLM. The extension uses content scripts for DOM extraction, pdf-lib for client-side PDF generation, and Google Drive API as an intermediary for NotebookLM integration (since consumer NotebookLM has no public API).

## Technical Context

**Language/Version**: TypeScript 5.x, Chrome Extension Manifest V3
**Primary Dependencies**: pdf-lib (PDF generation), @pdf-lib/fontkit (Chinese fonts), Chrome APIs (identity, storage, scripting, downloads)
**Storage**: chrome.storage.local (persistent), chrome.storage.session (tokens)
**Testing**: Vitest (unit), Playwright (E2E extension testing)
**Target Platform**: Chrome browser (Chromium-based browsers)
**Project Type**: Chrome extension (single package)
**Performance Goals**: Capture + PDF in <30 seconds for 9 images, extension load <1 second
**Constraints**: <10MB PDF output, works offline for capture/PDF, requires network for upload
**Scale/Scope**: Single user, personal use extension

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality Standards
- [x] Clear naming conventions enforced via ESLint + TypeScript
- [x] Consistent style via Prettier + ESLint config
- [x] No dead code policy enforced via linting rules
- [x] Error handling at all Chrome API and external boundaries

### II. User Experience Consistency
- [x] Extension popup follows Chrome extension UI patterns
- [x] Loading states for capture, PDF generation, upload (FR-012)
- [x] User-facing errors are actionable (edge cases defined)
- [x] Keyboard navigation for popup UI
- [x] 100ms feedback threshold (SC-006)

### III. Test-Driven Development
- [x] Tests written before implementation
- [x] Edge cases from spec have dedicated tests
- [x] Contract tests for Chrome API mocking
- [x] Integration tests for capture → PDF → upload flow

### IV. Documentation Standards
- [x] API documentation for all exported functions
- [x] Architecture decisions recorded in research.md
- [x] User guide in quickstart.md

### V. Simplicity First
- [x] Single extension package (no backend server)
- [x] pdf-lib chosen for minimal dependencies
- [x] Google Drive API as intermediary (simplest working approach)
- [x] No premature abstractions

**Gate Status**: PASS - No violations requiring justification

**Post-Design Re-evaluation** (2026-01-03): All gates still pass after Phase 1 design:
- Code structure follows clear separation of concerns
- Data model is simple and direct (no over-engineering)
- Contracts are minimal and focused
- Google Drive intermediary is the simplest working solution

## Project Structure

### Documentation (this feature)

```text
specs/001-rednote-notebooklm/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Chrome message contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── background/
│   └── service-worker.ts    # MV3 service worker (event handlers)
├── content/
│   └── extractor.ts         # RedNote DOM extraction logic
├── popup/
│   ├── popup.html           # Extension popup UI
│   ├── popup.ts             # Popup controller
│   └── components/          # UI components
├── services/
│   ├── pdf-generator.ts     # PDF creation with pdf-lib
│   ├── google-auth.ts       # OAuth via chrome.identity
│   └── drive-uploader.ts    # Google Drive API integration
├── models/
│   ├── captured-post.ts     # Post data structures
│   └── upload-record.ts     # Upload tracking
├── lib/
│   └── fonts/               # Bundled Chinese fonts (NotoSansSC subset)
└── manifest.json            # Chrome extension manifest

tests/
├── unit/
│   ├── extractor.test.ts
│   ├── pdf-generator.test.ts
│   └── drive-uploader.test.ts
├── integration/
│   └── capture-to-pdf.test.ts
└── e2e/
    └── full-workflow.test.ts
```

**Structure Decision**: Single Chrome extension package with clear separation between background (service worker), content scripts, and popup UI. Services layer handles business logic independent of Chrome API specifics.

## Complexity Tracking

> **No violations - table intentionally empty**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |
