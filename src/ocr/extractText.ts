import { Platform } from 'react-native';

/**
 * OCR: uses expo-text-extractor on native (ML Kit/Apple Vision),
 * or Tesseract.js on web. Returns array of text blocks.
 * Web: multi-PSM (4, 6, 11) for coverage; extraction filters to Nutrition + Ingredients.
 */
export async function extractText(imageUri: string): Promise<string[]> {
  if (Platform.OS === 'web') {
    return extractTextWeb(imageUri);
  }
  return extractTextNative(imageUri);
}

const MAX_PREPROCESS_DIM = 1600;
const MIN_PREPROCESS_DIM = 800;
const CONTRAST_STRENGTH = 1.15;
const MIN_WORD_CONFIDENCE = 18;
const ROW_TOLERANCE_PX = 8;

/**
 * Web-only: Light preprocessing for Tesseract.
 * Grayscale + mild contrast only. Preserve text, do not beautify.
 */
async function preprocessImageForOcrWeb(imageUri: string): Promise<string> {
  if (typeof document === 'undefined' || typeof (globalThis as any).Image === 'undefined') return imageUri;
  return new Promise((resolve) => {
    const img = new (globalThis as any).Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let { width, height } = img;
        const maxDim = Math.max(width, height);

        if (maxDim < MIN_PREPROCESS_DIM) {
          const scale = 2;
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        } else if (maxDim > MAX_PREPROCESS_DIM) {
          if (width >= height) {
            height = Math.round((height * MAX_PREPROCESS_DIM) / width);
            width = MAX_PREPROCESS_DIM;
          } else {
            width = Math.round((width * MAX_PREPROCESS_DIM) / height);
            height = MAX_PREPROCESS_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(imageUri); return; }

        ctx.filter = 'grayscale(1) contrast(' + CONTRAST_STRENGTH + ')';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(URL.createObjectURL(blob));
            else resolve(imageUri);
          },
          'image/png',
          0.92
        );
      } catch {
        resolve(imageUri);
      }
    };
    img.onerror = () => resolve(imageUri);
    img.src = imageUri;
  });
}

/** Extract lines from raw Tesseract text. */
function textToBlocks(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Flatten words from data.blocks or data.words. */
function extractWordsFromData(data: { words?: TesseractWord[]; blocks?: Array<{ lines?: Array<{ words?: TesseractWord[] }> }> }): TesseractWord[] {
  if (data.words && Array.isArray(data.words) && data.words.length > 0) return data.words;
  const out: TesseractWord[] = [];
  if (data.blocks) {
    for (const b of data.blocks) {
      for (const line of b.lines || []) {
        for (const w of line.words || []) {
          if (w && typeof w.text === 'string') out.push(w as TesseractWord);
        }
      }
    }
  }
  return out;
}

/** Build blocks from words: filter out low-confidence words, group by row, rebuild lines. */
function blocksFromWordsWithConfidence(words: TesseractWord[], minConf: number): string[] {
  if (!words || words.length === 0) return [];
  const kept = words.filter((w) => (w.text || '').trim().length > 0 && (w.confidence ?? 0) >= minConf);
  if (kept.length === 0) return [];
  const rows: { y: number; words: TesseractWord[] }[] = [];
  const sorted = [...kept].sort((a, b) => (a.bbox?.y0 ?? 0) - (b.bbox?.y0 ?? 0));
  for (const w of sorted) {
    const y = w.bbox?.y0 ?? 0;
    const txt = (w.text || '').trim();
    if (!txt) continue;
    let row = rows.find((r) => Math.abs(r.y - y) <= ROW_TOLERANCE_PX);
    if (!row) {
      row = { y, words: [] };
      rows.push(row);
    }
    row.words.push(w);
  }
  const lines: string[] = [];
  for (const row of rows) {
    row.words.sort((a, b) => (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0));
    lines.push(row.words.map((w) => w.text.trim()).filter(Boolean).join(' '));
  }
  return lines.filter((s) => s.length > 0);
}

/** Minimal filter: only drop empty lines and pure symbol lines. Capture everything else. */
function filterMinimal(blocks: string[]): string[] {
  return blocks.filter((line) => {
    const t = line.trim();
    if (t.length < 1) return false;
    if (/^[\s\.,;:\-\|=\[\]\\\/\*\+\^\%\!\@\#\$\&\~]+$/.test(t)) return false;
    return true;
  });
}

function dedupeBlocks(blocks: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of blocks) {
    const key = b.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

async function recognizeWithPsm(
  worker: {
    setParameters: (p: object) => Promise<unknown>;
    recognize: (uri: string) => Promise<{ data: Record<string, unknown> & { text: string } }>;
  },
  imageUri: string,
  psm: string
): Promise<string[]> {
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await worker.recognize(imageUri);
  const words = extractWordsFromData(data as { words?: TesseractWord[]; blocks?: Array<{ lines?: Array<{ words?: TesseractWord[] }> }> });
  if (words.length > 0) {
    const blocks = blocksFromWordsWithConfidence(words, MIN_WORD_CONFIDENCE);
    if (blocks.length >= 1) return filterMinimal(blocks);
  }
  return filterMinimal(textToBlocks(data.text || ''));
}

async function runOcrOnImage(uriToUse: string): Promise<string[]> {
  const Tesseract = (await import('tesseract.js')).default;
  const worker = await Tesseract.createWorker('eng', 1, {});
  try {
    const blocks4 = await recognizeWithPsm(worker, uriToUse, '4');
    const blocks6 = await recognizeWithPsm(worker, uriToUse, '6');
    const blocks11 = await recognizeWithPsm(worker, uriToUse, '11');
    return dedupeBlocks([...blocks4, ...blocks6, ...blocks11]);
  } finally {
    await worker.terminate();
  }
}

async function extractTextWeb(imageUri: string): Promise<string[]> {
  let uriToUse = imageUri;
  try {
    uriToUse = await preprocessImageForOcrWeb(imageUri);
    const blocks = await runOcrOnImage(uriToUse);
    return filterMinimal(blocks);
  } finally {
    if (uriToUse !== imageUri && uriToUse.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
      try { URL.revokeObjectURL(uriToUse); } catch { /* ignore */ }
    }
  }
}

async function extractTextNative(imageUri: string): Promise<string[]> {
  const { extractTextFromImage, isSupported } = await import('expo-text-extractor');
  if (!isSupported) {
    throw new Error(
      'Text extraction is not supported on this device. Please use the web version.'
    );
  }
  const textBlocks = await extractTextFromImage(imageUri);
  return textBlocks.filter((t) => t && t.trim().length > 0);
}

export function joinTextBlocks(blocks: string[]): string {
  return blocks.join('\n');
}
