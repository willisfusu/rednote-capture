# Tasks: RedNote to NotebookLM Chrome Extension

**Input**: Design documents from `/specs/001-rednote-notebooklm/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per Constitution III (Test-Driven Development) - tests MUST be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Chrome Extension**: `src/` at repository root
- **Tests**: `tests/` at repository root
- Structure per plan.md:
  - `src/background/` - Service worker
  - `src/content/` - Content scripts
  - `src/popup/` - Extension popup UI
  - `src/services/` - Business logic
  - `src/models/` - TypeScript interfaces
  - `src/types/` - Shared types
  - `src/lib/fonts/` - Bundled Chinese fonts

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, build tooling, and extension manifest

- [x] T001 Create project directory structure per plan.md in repository root
- [x] T002 Initialize npm project with TypeScript 5.x and package.json
- [x] T003 [P] Configure Vite with @crxjs/vite-plugin in vite.config.ts
- [x] T004 [P] Configure TypeScript with tsconfig.json for Chrome extension
- [x] T005 [P] Configure ESLint and Prettier for code quality in .eslintrc.js and .prettierrc
- [x] T006 [P] Configure Vitest for unit testing in vitest.config.ts
- [x] T007 Create Chrome extension manifest.json with MV3 configuration
- [x] T008 [P] Download and add NotoSansSC-Regular subset font to src/lib/fonts/

**Checkpoint**: Build tooling ready, extension can be loaded unpacked in Chrome

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, models, and shared infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create Message and Response base types in src/types/messages.ts
- [x] T010 [P] Create ErrorCode enum and ErrorResponse type in src/types/errors.ts
- [x] T011 [P] Create CapturedPost interface in src/models/captured-post.ts
- [x] T012 [P] Create PostImage interface in src/models/post-image.ts
- [x] T013 [P] Create CaptureStatus type in src/models/captured-post.ts
- [x] T014 [P] Create UserSettings interface and DEFAULT_SETTINGS in src/models/user-settings.ts
- [x] T015 [P] Create AuthState interface in src/models/auth-state.ts
- [x] T016 [P] Create LocalStorage and SessionStorage interfaces in src/types/storage.ts
- [x] T017 Create service worker shell with event listener registration in src/background/service-worker.ts
- [x] T018 [P] Create popup HTML structure in src/popup/popup.html
- [x] T019 [P] Create popup TypeScript entry point in src/popup/popup.ts
- [x] T020 Implement message handler dispatcher in src/background/message-handler.ts

**Checkpoint**: Foundation ready - extension loads, popup opens, service worker runs

---

## Phase 3: User Story 1 - Capture Single Post Content (Priority: P1) 🎯 MVP

**Goal**: User can capture text and images from a RedNote post by clicking the extension icon

**Independent Test**: Load extension, navigate to any RedNote post, click capture button, verify captured data appears in popup

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [P] [US1] Create unit test for URL pattern matching in tests/unit/url-patterns.test.ts
- [x] T022 [P] [US1] Create unit test for __INITIAL_STATE__ parsing in tests/unit/extractor.test.ts
- [x] T023 [P] [US1] Create unit test for image extraction in tests/unit/extractor.test.ts
- [x] T024 [P] [US1] Create integration test for capture flow in tests/integration/capture.test.ts

### Implementation for User Story 1

- [x] T025 [US1] Implement RedNote URL pattern detection in src/content/url-patterns.ts
- [x] T026 [US1] Implement __INITIAL_STATE__ JSON extraction in src/content/extractor.ts
- [x] T027 [US1] Implement parseNoteData function in src/content/extractor.ts
- [x] T028 [US1] Implement extractImages function in src/content/extractor.ts
- [x] T029 [US1] Implement CHECK_PAGE message handler in src/background/handlers/check-page.ts
- [x] T030 [US1] Implement EXTRACT_POST message handler in src/background/handlers/extract-post.ts
- [x] T031 [US1] Implement CAPTURE_POST message handler in src/background/handlers/capture-post.ts
- [x] T032 [US1] Add capture button to popup UI in src/popup/components/CaptureButton.ts
- [x] T033 [US1] Display captured post data in popup in src/popup/components/PostPreview.ts
- [x] T034 [US1] Store captured post in chrome.storage.session in src/background/handlers/capture-post.ts
- [x] T035 [US1] Add loading state and error handling to capture UI in src/popup/popup.ts

**Checkpoint**: User Story 1 complete - capture works independently, data visible in popup

---

## Phase 4: User Story 2 - Generate PDF from Captured Content (Priority: P2)

**Goal**: User can generate a PDF from captured content with Chinese text support

**Independent Test**: After capturing a post, click "Generate PDF", verify PDF downloads with correct content and Chinese characters

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T036 [P] [US2] Create unit test for PDF document creation in tests/unit/pdf-generator.test.ts
- [x] T037 [P] [US2] Create unit test for Chinese font embedding in tests/unit/pdf-generator.test.ts
- [x] T038 [P] [US2] Create unit test for image embedding in tests/unit/pdf-generator.test.ts
- [x] T039 [P] [US2] Create integration test for capture-to-PDF flow in tests/integration/capture-to-pdf.test.ts

### Implementation for User Story 2

- [x] T040 [P] [US2] Create GeneratedPDF interface in src/models/generated-pdf.ts
- [x] T041 [US2] Implement font loading from bundled NotoSansSC in src/services/font-loader.ts
- [x] T042 [US2] Implement image downloading service in src/services/image-downloader.ts
- [x] T043 [US2] Implement PDF document creation with pdf-lib in src/services/pdf-generator.ts
- [x] T044 [US2] Implement Chinese text rendering in PDF in src/services/pdf-generator.ts
- [x] T045 [US2] Implement image embedding in PDF pages in src/services/pdf-generator.ts
- [x] T046 [US2] Implement PDF metadata (title, author, source URL) in src/services/pdf-generator.ts
- [x] T047 [US2] Implement GENERATE_PDF message handler in src/background/handlers/generate-pdf.ts
- [x] T048 [US2] Implement DOWNLOAD_PDF message handler in src/background/handlers/download-pdf.ts
- [x] T049 [US2] Add "Generate PDF" button to popup in src/popup/components/PdfActions.ts
- [x] T050 [US2] Add PDF generation progress indicator in src/popup/components/ProgressBar.ts
- [x] T051 [US2] Store generated PDF blob URL in chrome.storage.session in src/background/handlers/generate-pdf.ts

**Checkpoint**: User Story 2 complete - PDFs generate with Chinese text, downloadable locally

---

## Phase 5: User Story 3 - Upload to NotebookLM (Priority: P3)

**Goal**: User can upload PDF to Google Drive for NotebookLM import

**Independent Test**: Generate PDF, sign in with Google, click upload, verify file appears in Google Drive

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T052 [P] [US3] Create unit test for OAuth token retrieval in tests/unit/google-auth.test.ts
- [x] T053 [P] [US3] Create unit test for Drive API upload in tests/unit/drive-uploader.test.ts
- [x] T054 [P] [US3] Create mock Drive API responses in tests/mocks/drive-api.ts
- [x] T055 [P] [US3] Create integration test for upload flow in tests/integration/upload.test.ts

### Implementation for User Story 3

- [x] T056 [P] [US3] Create UploadRecord interface in src/models/upload-record.ts
- [x] T057 [US3] Implement chrome.identity.getAuthToken wrapper in src/services/google-auth.ts
- [x] T058 [US3] Implement sign in/sign out functions in src/services/google-auth.ts
- [x] T059 [US3] Implement Drive API multipart upload in src/services/drive-uploader.ts
- [x] T060 [US3] Implement web view link retrieval from Drive in src/services/drive-uploader.ts
- [x] T061 [US3] Implement SIGN_IN message handler in src/background/handlers/auth.ts
- [x] T062 [US3] Implement SIGN_OUT message handler in src/background/handlers/auth.ts
- [x] T063 [US3] Implement GET_AUTH_STATE message handler in src/background/handlers/auth.ts
- [x] T064 [US3] Implement UPLOAD_TO_DRIVE message handler in src/background/handlers/upload.ts
- [x] T065 [US3] Add Google sign-in button to popup in src/popup/components/AuthButton.ts
- [x] T066 [US3] Add "Upload to Drive" button to popup in src/popup/components/UploadButton.ts
- [x] T067 [US3] Add upload progress and success state in src/popup/components/UploadStatus.ts
- [x] T068 [US3] Add "Open in NotebookLM" link after upload in src/popup/components/NotebookLMLink.ts
- [x] T069 [US3] Store upload history in chrome.storage.local in src/background/handlers/upload.ts
- [x] T070 [US3] Implement GET_UPLOAD_HISTORY message handler in src/background/handlers/history.ts

**Checkpoint**: User Story 3 complete - full capture → PDF → upload workflow works

---

## Phase 6: User Story 4 - Profile Batch Capture (Priority: P4)

**Goal**: User can select multiple notes from a profile page and process them in batch

**Independent Test**: Navigate to profile, select notes, verify multiple PDFs created

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T071 [P] [US4] Create unit test for profile URL detection in tests/unit/url-patterns.test.ts
- [x] T072 [P] [US4] Create unit test for note list extraction (DOM parsing) in tests/unit/profile-extractor.test.ts
- [ ] T073 [P] [US4] Create integration test for batch execution flow in tests/integration/batch.test.ts

### Implementation for User Story 4

- [x] T074 [US4] Implement `ProfileParser` in src/content/profile-parser.ts (extract `.note-item` data)
- [x] T075 [US4] Implement CHECK_PROFILE message handler in src/background/handlers/check-profile.ts
- [x] T076 [US4] Create `BatchSelection` interface in src/models/batch-selection.ts
- [x] T077 [US4] Create `BatchView` component in src/popup/components/BatchView.ts (List + Checkboxes)
- [x] T078 [US4] Update `popup.ts` to route to correct view (Single Post vs Profile Batch)
- [x] T079 [US4] Implement `BatchManager` service in src/services/batch-manager.ts (orchestrate sequential capture)
- [x] T080 [US4] Add "Load More/Refresh" action in popup to re-scan page content

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T081 [P] Implement GET_SETTINGS message handler in src/background/handlers/settings.ts
- [ ] T082 [P] Implement UPDATE_SETTINGS message handler in src/background/handlers/settings.ts
- [ ] T083 Add settings panel to popup in src/popup/components/SettingsPanel.ts
- [ ] T084 [P] Add keyboard shortcuts (Alt+C, Alt+P, Alt+U) in manifest.json and src/background/shortcuts.ts
- [ ] T085 [P] Create E2E test for full workflow in tests/e2e/full-workflow.test.ts
- [ ] T086 Validate quickstart.md steps work end-to-end
- [ ] T087 [P] Performance optimization: lazy load pdf-lib in src/services/pdf-generator.ts
- [ ] T088 Security review: verify no sensitive data in chrome.storage.local
- [ ] T089 Final linting and formatting pass
- [ ] T090 Build production extension bundle with `npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - captures post data
- **User Story 2 (Phase 4)**: Depends on US1 completion - generates PDF from captured data
- **User Story 3 (Phase 5)**: Depends on US2 completion - uploads generated PDF
- **User Story 4 (Phase 6)**: Depends on US1-3 completion - batch mode uses all prior features
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - can start after Phase 2
- **User Story 2 (P2)**: Requires US1 - needs CapturedPost data to generate PDF
- **User Story 3 (P3)**: Requires US2 - needs GeneratedPDF to upload
- **User Story 4 (P4)**: Requires US1-3 - orchestrates full workflow in batch

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/interfaces before services
- Services before message handlers
- Message handlers before UI components
- Core implementation before polish

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006, T008 can run in parallel
- **Phase 2**: T010-T016 models can run in parallel, T018-T019 popup files parallel
- **Phase 3**: T021-T024 tests parallel, T025-T028 extractor functions parallel
- **Phase 4**: T036-T039 tests parallel, T040 model parallel with implementation
- **Phase 5**: T052-T055 tests parallel, T056 model parallel
- **Phase 6**: T071-T072 tests parallel, T073 model parallel
- **Phase 7**: T081-T082 parallel, T084-T085 parallel

---

## Parallel Example: Phase 2 Setup

```bash
# Launch all model definitions together:
Task: "Create CapturedPost interface in src/models/captured-post.ts"
Task: "Create PostImage interface in src/models/post-image.ts"
Task: "Create UserSettings interface in src/models/user-settings.ts"
Task: "Create AuthState interface in src/models/auth-state.ts"
Task: "Create ErrorCode enum in src/types/errors.ts"
Task: "Create LocalStorage interface in src/types/storage.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Capture)
4. Complete Phase 4: User Story 2 (PDF)
5. **STOP and VALIDATE**: Test capture → PDF flow
6. Deploy/demo if ready - users can capture and download PDFs locally

### Full Feature (User Stories 1-3)

1. Complete MVP (Phases 1-4)
2. Complete Phase 5: User Story 3 (Upload)
3. **VALIDATE**: Test full capture → PDF → upload flow
4. Deploy - users have complete workflow to NotebookLM

### Power User Features (All Stories)

1. Complete Full Feature (Phases 1-5)
2. Complete Phase 6: User Story 4 (Batch)
3. Complete Phase 7: Polish
4. Final testing and release

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable (except sequential dependencies)
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution requires TDD: tests before implementation

---

## Task Summary

| Phase | Description | Task Count |
|-------|-------------|------------|
| 1 | Setup | 8 |
| 2 | Foundational | 12 |
| 3 | User Story 1 (Capture) | 15 |
| 4 | User Story 2 (PDF) | 16 |
| 5 | User Story 3 (Upload) | 19 |
| 6 | User Story 4 (Batch) | 10 |
| 7 | Polish | 10 |
| **Total** | | **90** |

**MVP Scope (P1+P2)**: Tasks T001-T051 (51 tasks)
**Full Feature (P1-P3)**: Tasks T001-T070 (70 tasks)
**Complete (P1-P4)**: All 90 tasks
