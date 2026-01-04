import { CapturedPost } from '../models/captured-post';

export interface BatchProgress {
    total: number;
    current: number;
    succeeded: number;
    failed: number;
    results: Array<{ noteId: string; status: 'success' | 'error'; error?: string; pdfBase64?: string; filename?: string }>;
}

export type ProgressCallback = (progress: BatchProgress) => void;

export class BatchManager {
    private isRunning = false;
    private shouldStop = false;

    async processBatch(
        notes: Array<{ noteId: string; noteUrl: string }>,
        onProgress: ProgressCallback
    ): Promise<Array<{ noteId: string; pdfBase64: string; filename: string }>> {
        if (this.isRunning) return [];
        this.isRunning = true;
        this.shouldStop = false;

        const progress: BatchProgress = {
            total: notes.length,
            current: 0,
            succeeded: 0,
            failed: 0,
            results: []
        };

        onProgress(progress);

        for (const note of notes) {
            if (this.shouldStop) break;

            progress.current++;
            onProgress(progress);

            let tabId: number | undefined;

            try {
                // 1. Open Tab
                const tab = await chrome.tabs.create({ url: note.noteUrl, active: false });
                tabId = tab.id;

                if (!tabId) throw new Error('Failed to create tab');

                // 2. Wait for load
                await this.waitForTabLoad(tabId);

                // 3. Capture
                // We need to inject content scripts first if they are not auto-injected? 
                // Manifest takes care of that for matches.
                // But we need to make sure the script is ready.
                await new Promise(r => setTimeout(r, 2000)); // Grace period for dynamic content

                // We can't reuse handlers that depend on 'activeTab' directly if we are in background.
                // We need handlers that accept tabId or we make the tab active.
                // `handleCapturePost` uses `chrome.tabs.sendMessage(tab.id, ...)` if we pass it?
                // Let's modify handlers or send message manually.

                // 4. Capture & Store
                const captureResponse = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'CAPTURE_POST',
                        payload: { tabId }, // Pass tabId to Capture Handler
                        requestId: crypto.randomUUID()
                    }, resolve);
                });

                if (!captureResponse?.success) {
                    throw new Error(captureResponse?.error || 'Capture failed');
                }

                const capturedPost = captureResponse.data as CapturedPost;

                // 5. Generate PDF
                const pdfResponse = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        action: 'GENERATE_PDF',
                        payload: { capturedPostId: capturedPost.id },
                        requestId: crypto.randomUUID()
                    }, resolve);
                });

                if (!pdfResponse?.success) {
                    throw new Error(pdfResponse?.error || 'PDF Generation failed');
                }

                const stats = pdfResponse.data;

                // 6. Upload (if needed? US4 says generate PDF. Upload might be separate step? 
                // Spec says "convert to PDF". Upload depends on user preference or if "Upload All" is clicked?
                // Acceptance Scenario 3 says "choose to upload to NotebookLM... upload all".
                // So generation and upload might be separate. 
                // But for "Process", let's assume we at least Generate.
                // Let's stop at generation for now as per current BatchView "Generate IDs".

                progress.succeeded++;
                progress.results.push({
                    noteId: note.noteId,
                    status: 'success',
                    pdfBase64: stats.pdfBase64,
                    filename: stats.filename
                });

            } catch (err: any) {
                progress.failed++;
                progress.results.push({ noteId: note.noteId, status: 'error', error: err.message });
            } finally {
                if (tabId) {
                    await chrome.tabs.remove(tabId);
                }
            }
        }

        this.isRunning = false;

        return progress.results
            .filter(r => r.status === 'success' && r.pdfBase64)
            .map(r => ({ noteId: r.noteId, pdfBase64: r.pdfBase64!, filename: r.filename! }));
    }

    async mergePdfs(pdfDataList: Array<{ pdfBase64: string }>): Promise<string> {
        const pdfLib = await import('pdf-lib');
        const PDFDocument = pdfLib.PDFDocument;
        const { uint8ArrayToBase64, base64ToUint8Array } = await import('./pdf-generator');

        const mergedPdf = await PDFDocument.create();

        // Load all PDFs in parallel to speed up processing
        const pdfDocs = await Promise.all(
            pdfDataList.map(async (pdfData) => {
                try {
                    const bytes = base64ToUint8Array(pdfData.pdfBase64);
                    return await PDFDocument.load(bytes);
                } catch (e) {
                    console.error('Failed to load PDF for merging:', e);
                    return null;
                }
            })
        );

        // Merge pages sequentially to maintain order
        for (const pdf of pdfDocs) {
            if (!pdf) continue;
            try {
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            } catch (e) {
                console.error('Failed to copy pages:', e);
            }
        }

        const mergedBytes = await mergedPdf.save();
        return uint8ArrayToBase64(mergedBytes);
    }

    private waitForTabLoad(tabId: number): Promise<void> {
        return new Promise((resolve) => {
            const listener = (tid: number, changeInfo: any) => {
                if (tid === tabId && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    }
}
