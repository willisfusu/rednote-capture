# Feature Specification: RedNote to NotebookLM Chrome Extension

**Feature Branch**: `001-rednote-notebooklm`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "build a Chrome extension which can be used to collect RedNote (https://www.xiaohongshu.com) posts including text and images and convert it to pdf then save to google notebooklm as a source in a notebook."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Single Post Content (Priority: P1)

A user is browsing Xiaohongshu (RedNote) and finds a post with valuable information they want to save for research. They click the extension icon while viewing the post, and the extension captures all the post content including text and images.

**Why this priority**: This is the foundational capability. Without content capture, no other features work. This delivers immediate value by letting users extract post content they would otherwise have to manually copy.

**Independent Test**: Can be tested by viewing any RedNote post and triggering the capture action. Delivers a local PDF file the user can review.

**Acceptance Scenarios**:

1. **Given** a user is viewing a RedNote image-carousel post, **When** they click the extension capture button, **Then** the extension captures the post title, all carousel images, text description, and author name.
2. **Given** a user is viewing a RedNote video post, **When** they click the extension capture button, **Then** the extension captures the post title, video thumbnail, text description, and author name (video itself is not captured).
3. **Given** a post contains multiple images in a carousel, **When** the capture completes, **Then** all images are included in the captured content in their original order.

---

### User Story 2 - Generate PDF from Captured Content (Priority: P2)

After capturing a post, the user wants to convert it to a well-formatted PDF document that preserves the visual layout and is suitable for archival or sharing.

**Why this priority**: PDF generation transforms raw captured data into a portable, shareable format. This is required before NotebookLM upload but also provides standalone value.

**Independent Test**: Can be tested by capturing a post and generating a PDF. User can open and verify the PDF locally without needing NotebookLM access.

**Acceptance Scenarios**:

1. **Given** a post has been captured successfully, **When** the user triggers PDF generation, **Then** a PDF file is created containing all captured text and images.
2. **Given** a post contains multiple carousel images, **When** the PDF is generated, **Then** each image appears on its own page or arranged in a readable layout.
3. **Given** a captured post includes Chinese text, **When** the PDF is generated, **Then** all Chinese characters render correctly without missing glyphs.
4. **Given** PDF generation completes, **When** the user views the result, **Then** the PDF includes post title as document title, author attribution, capture date, and source URL.

---

### User Story 3 - Upload to NotebookLM (Priority: P3)

A researcher wants to add captured RedNote content directly to their Google NotebookLM notebook for AI-assisted analysis and note-taking.

**Why this priority**: This completes the end-to-end workflow but depends on P1 and P2. Requires Google authentication, making it more complex to set up and test.

**Independent Test**: Can be tested with a sample PDF and a NotebookLM notebook. User can verify the source appears in their notebook.

**Acceptance Scenarios**:

1. **Given** a PDF has been generated and the user is authenticated with Google, **When** they select a target notebook and click upload, **Then** the PDF is uploaded as a source to the selected notebook.
2. **Given** the user has multiple NotebookLM notebooks, **When** they initiate upload, **Then** they can select which notebook to add the source to.
3. **Given** the upload completes successfully, **When** the user opens NotebookLM, **Then** the uploaded source appears in the selected notebook's source list.
4. **Given** the user is not authenticated with Google, **When** they attempt to upload, **Then** they are prompted to sign in with their Google account.

---

### User Story 4 - Profile Batch Capture (Priority: P4)

A user wants to quickly select multiple notes from a creator's profile page and convert them to PDFs in bulk, without opening each note individually.

**Why this priority**: Enhances productivity for research on specific creators.

**Independent Test**: Navigate to a user profile, open extension, see list of notes, select multiple, generate PDFs.

**Acceptance Scenarios**:

1. **Given** a user is on a RedNote profile page, **When** they open the extension, **Then** the extension works in "Batch Mode", listing all currently loaded notes (title + cover image).
2. **Given** the user scrolls down the page to load more notes, **When** they refresh the extension view, **Then** the newly loaded notes are added to the list.
3. **Given** a list of detected notes, **When** the user selects multiple notes and clicks "Process", **Then** the extension sequentially captures and generates a PDF for each selected note.
4. **Given** the batch process is running, **When** one note fails (e.g., network error), **Then** the process continues to the next note and reports the failure at the end.

---

### Edge Cases

- What happens when a post is deleted or becomes private while being captured? Display error message indicating the post is no longer accessible.
- How does the system handle posts with no images (text-only)? Generate PDF with text content only; this is valid content.
- What happens if the user loses internet connection during PDF upload? Retry upload when connection is restored; preserve local PDF copy.
- How does the system handle very long posts (1000+ characters)? Text is paginated appropriately in the PDF without truncation.
- What happens if NotebookLM API is unavailable? Display error message and preserve local PDF; user can retry upload later.
- How does the system handle posts with embedded videos? Capture video thumbnail and include link to video; video files are not downloaded.
- What happens when the user's NotebookLM notebook reaches the 50-source limit? Display warning before upload; allow user to choose a different notebook.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST detect when user is viewing a RedNote post page (URL pattern matching).
- **FR-002**: Extension MUST extract post title/caption text from the current post.
- **FR-003**: Extension MUST extract all images from carousel posts in their display order.
- **FR-004**: Extension MUST extract author name and profile information.
- **FR-005**: Extension MUST capture the source URL of the post.
- **FR-006**: Extension MUST generate a PDF document from captured content.
- **FR-007**: PDF MUST include all captured images in readable resolution.
- **FR-008**: PDF MUST render Chinese characters correctly.
- **FR-009**: Extension MUST allow users to authenticate with their Google account.
- **FR-010**: Extension MUST upload generated PDFs to Google NotebookLM as sources.
- **FR-011**: Extension MUST allow users to select which NotebookLM notebook to use.
- **FR-012**: Extension MUST provide visual feedback during capture, PDF generation, and upload operations.
- **FR-013**: Extension MUST store credentials securely following Chrome extension security guidelines.
- **FR-014**: Extension MUST allow users to download the generated PDF locally.
- **FR-015**: Extension MUST handle video posts by capturing thumbnail and metadata (not the video file).
- **FR-016**: Extension MUST detect when user is viewing a Profile page (`/user/profile/`).
- **FR-017**: Extension MUST parse currently visible `.note-item` elements from the profile page DOM to extract title, link, and cover image.
- **FR-018**: Extension MUST provide a UI to select multiple detected notes for batch processing.
- **FR-019**: Extension MUST support "Refresh" to re-scan the DOM for newly loaded notes after user scrolls.
- **FR-020**: Extension MUST sequentially process selected notes (Capture -> PDF) without opening new tabs if possible, or managing background tabs efficiently.

### Key Entities

- **CapturedPost**: Represents a single captured RedNote post. Attributes: source URL, title, description text, author name, capture timestamp, list of image references.
- **PostImage**: An image from a post. Attributes: image data or URL, display order, alt text if available.
- **GeneratedPDF**: A PDF document created from captured content. Attributes: file reference, creation timestamp, associated CapturedPost, file size.
- **NotebookLMTarget**: A destination notebook for uploads. Attributes: notebook identifier, notebook name, user's Google account association.
- **UploadRecord**: Tracks upload attempts to NotebookLM. Attributes: PDF reference, target notebook, upload status, timestamp, source ID if successful.

## Assumptions

- Users have a Google account and access to NotebookLM (either consumer or Enterprise version).
- RedNote posts are publicly accessible or the user is logged in to view them.
- The Chrome extension will run in Manifest V3 format (current Chrome extension standard).
- Users accept that video content is not downloaded, only thumbnails and metadata.
- PDF generation will happen client-side within the extension (no external service required).
- For NotebookLM Enterprise API access, users will need to configure their own Google Cloud project credentials.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can capture a RedNote post and generate a PDF in under 30 seconds for posts with up to 9 images.
- **SC-002**: Generated PDFs are under 10MB for typical posts (up to 9 images), meeting NotebookLM upload limits.
- **SC-003**: 95% of capture attempts succeed for publicly accessible posts.
- **SC-004**: Chinese text renders correctly in 100% of generated PDFs.
- **SC-005**: Users can complete the full workflow (capture → PDF → upload) in under 2 minutes.
- **SC-006**: The extension loads and initializes in under 1 second when clicking the icon.
- **SC-007**: Upload to NotebookLM succeeds on first attempt 90% of the time when user is authenticated and has network connectivity.
