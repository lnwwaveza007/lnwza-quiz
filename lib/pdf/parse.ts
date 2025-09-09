import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { type ParsedPdf, type PerPageText } from "@/lib/types";

// Configure worker (Node vs Browser). In Next.js, dynamic import helps.
// No worker setup here; Node/server actions run without a PDF.js worker.

export async function extractPdfText(data: Uint8Array, pdfName: string): Promise<ParsedPdf> {
  const loadingTask = getDocument({ data, disableWorker: true } as { data: Uint8Array; disableWorker: boolean });
  const doc = await loadingTask.promise;
  const pages: PerPageText[] = [];
  const headings: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str: string }>;
    const text = items.map((it) => it.str).join(" \n ");
    pages.push({ pageNumber: i, text });
    // naive heading heuristics
    const lines = text.split(/\n|\r|\u2028/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (isLikelyHeading(line)) headings.push(line);
    }
  }

  return { pdfName, pages, headings: Array.from(new Set(headings)).slice(0, 50) };
}

function isLikelyHeading(line: string): boolean {
  if (line.length > 120) return false;
  const allCaps = /^[A-Z0-9 \-:()]+$/.test(line) && /[A-Z]/.test(line);
  const titleCase = /^(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+)*$/.test(line);
  return allCaps || titleCase;
}

export type InvertedIndex = {
  keywordToPages: Record<string, Set<number>>;
  pageText: Record<number, string>;
  topicTags: string[];
};

export function buildIndex(parsed: ParsedPdf): InvertedIndex {
  const pageText: Record<number, string> = {};
  const keywordToPages: Record<string, Set<number>> = {};

  for (const p of parsed.pages) {
    pageText[p.pageNumber] = p.text;
    const tokens = tokenize(p.text);
    const unique = new Set(tokens);
    for (const tok of unique) {
      if (!keywordToPages[tok]) keywordToPages[tok] = new Set();
      keywordToPages[tok].add(p.pageNumber);
    }
  }

  const topicTags = deriveTopics(parsed.headings);
  return { keywordToPages, pageText, topicTags };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function deriveTopics(headings: string[]): string[] {
  const lower = headings.map((h) => h.toLowerCase());
  const uniq = Array.from(new Set(lower));
  // simple pick top up to 10 distinct headings as tags
  return uniq.slice(0, 10).map((h) => h.replace(/\s+/g, " ").trim());
}


