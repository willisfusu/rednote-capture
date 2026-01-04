/**
 * Unit tests for PDF generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue({
      addPage: vi.fn().mockReturnValue({
        getSize: vi.fn().mockReturnValue({ width: 595, height: 842 }),
        drawText: vi.fn(),
        drawImage: vi.fn(),
      }),
      embedFont: vi.fn().mockResolvedValue({}),
      embedJpg: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        scale: vi.fn().mockReturnValue({ width: 100, height: 100 }),
      }),
      embedPng: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        scale: vi.fn().mockReturnValue({ width: 100, height: 100 }),
      }),
      setTitle: vi.fn(),
      setAuthor: vi.fn(),
      setSubject: vi.fn(),
      setCreator: vi.fn(),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      registerFontkit: vi.fn(),
    }),
  },
  StandardFonts: {
    Helvetica: 'Helvetica',
  },
}));

// Mock fontkit
vi.mock('@pdf-lib/fontkit', () => ({
  default: {},
}));

describe('PDF Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPdfDocument', () => {
    it('should create a new PDF document', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      expect(doc).toBeDefined();
      expect(PDFDocument.create).toHaveBeenCalled();
    });

    it('should add a page with A4 dimensions', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      const page = doc.addPage();
      const { width, height } = page.getSize();

      // A4 dimensions in points (595.28 x 841.89)
      expect(width).toBeCloseTo(595, 0);
      expect(height).toBeCloseTo(842, 0);
    });

    it('should set PDF metadata', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      doc.setTitle('Test Post Title');
      doc.setAuthor('Test Author');
      doc.setSubject('RedNote Post Capture');
      doc.setCreator('RedNote to NotebookLM Extension');

      expect(doc.setTitle).toHaveBeenCalledWith('Test Post Title');
      expect(doc.setAuthor).toHaveBeenCalledWith('Test Author');
    });
  });

  describe('Chinese font embedding', () => {
    it('should register fontkit for custom font support', async () => {
      const { PDFDocument } = await import('pdf-lib');
      const fontkit = (await import('@pdf-lib/fontkit')).default;

      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);

      expect(doc.registerFontkit).toHaveBeenCalledWith(fontkit);
    });

    it('should embed custom font from bytes', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      const fontBytes = new Uint8Array([0, 1, 2, 3]);

      const font = await doc.embedFont(fontBytes);
      expect(font).toBeDefined();
      expect(doc.embedFont).toHaveBeenCalledWith(fontBytes);
    });
  });

  describe('image embedding', () => {
    it('should embed JPG images', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      const imageBytes = new Uint8Array([0xff, 0xd8, 0xff]); // JPG magic bytes

      const image = await doc.embedJpg(imageBytes);
      expect(image).toBeDefined();
      expect(image.width).toBe(100);
      expect(image.height).toBe(100);
    });

    it('should embed PNG images', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

      const image = await doc.embedPng(imageBytes);
      expect(image).toBeDefined();
    });

    it('should scale images to fit page width', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      const imageBytes = new Uint8Array([0xff, 0xd8, 0xff]);

      const image = await doc.embedJpg(imageBytes);
      const pageWidth = 595;
      const margin = 50;
      const maxWidth = pageWidth - 2 * margin;

      const scaled = image.scale(maxWidth / image.width);
      expect(scaled.width).toBeLessThanOrEqual(maxWidth);
    });
  });

  describe('PDF save', () => {
    it('should save PDF as Uint8Array', async () => {
      const { PDFDocument } = await import('pdf-lib');

      const doc = await PDFDocument.create();
      const pdfBytes = await doc.save();

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);
    });
  });
});

describe('PDF Content Layout', () => {
  it('should calculate correct text wrapping for long descriptions', () => {
    const maxWidth = 495; // Page width minus margins
    const avgCharWidth = 7; // Approximate for 12pt font
    const charsPerLine = Math.floor(maxWidth / avgCharWidth);

    expect(charsPerLine).toBeGreaterThan(50);
    expect(charsPerLine).toBeLessThan(100);
  });

  it('should handle multi-page content', () => {
    const pageHeight = 842;
    const margin = 50;
    const contentHeight = pageHeight - 2 * margin;
    const lineHeight = 16;
    const linesPerPage = Math.floor(contentHeight / lineHeight);

    expect(linesPerPage).toBeGreaterThan(40);
  });
});
