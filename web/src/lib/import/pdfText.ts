"use client";

import * as pdfjsLib from "pdfjs-dist";

let workerConfigured = false;
function ensureWorker() {
  if (workerConfigured) return;
  // Standard bundler-friendly worker setup for pdf.js - see its own docs for
  // non-Vite bundlers. Runs client-side only (this module is "use client").
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  workerConfigured = true;
}

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
}

export interface PdfPage {
  items: PdfTextItem[];
}

/** Extracts every text run and its position from a PDF, page by page.
 *  Table-specific row/column reconstruction is the caller's job (see
 *  parseAcademicBalance.ts) since that depends on the specific report's own
 *  layout - this module only does generic PDF text extraction. */
export async function extractPdfPages(file: File): Promise<PdfPage[]> {
  ensureWorker();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: PdfPage[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const raw of content.items as Array<{ str?: string; transform: number[] }>) {
      if (!raw.str || !raw.str.trim()) continue;
      items.push({ text: raw.str, x: raw.transform[4], y: raw.transform[5] });
    }
    pages.push({ items });
  }
  return pages;
}
