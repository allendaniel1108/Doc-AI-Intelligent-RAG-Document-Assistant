import mammoth from 'mammoth';

export interface ParseResult {
  text: string;
  detectedType: 'pdf' | 'docx' | 'text';
  pageCount?: number;
  wordCount: number;
  characterCount: number;
}

// Magic bytes checks
function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.slice(0, 5).toString('ascii') === '%PDF-';
}

function isDocxBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // Zip header: PK\x03\x04
  return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function isLikelyTextBuffer(buffer: Buffer): boolean {
  // Check if buffer contains mostly printable ASCII or UTF-8 characters (no binary null bytes in first 1KB)
  const sample = buffer.slice(0, Math.min(buffer.length, 1024));
  let nullBytes = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) nullBytes++;
  }
  return nullBytes === 0;
}

// Dedicated PDF Parser
async function parsePdf(buffer: Buffer, filename: string): Promise<string> {
  if (!isPdfBuffer(buffer)) {
    throw new Error(`Invalid PDF header: "${filename}" is not a valid PDF file.`);
  }

  try {
    const pdfParseModule: any = await import('pdf-parse');
    
    // Modern v2 PDFParse class
    if (typeof pdfParseModule?.PDFParse === 'function') {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const data = await parser.getText();
      try { await parser.destroy?.(); } catch {}
      if (data && typeof data.text === 'string' && data.text.trim().length > 0) {
        return data.text.trim();
      }
    }

    // Legacy callable v1
    const pdfFn = typeof pdfParseModule === 'function' 
      ? pdfParseModule 
      : typeof pdfParseModule?.default === 'function' 
      ? pdfParseModule.default 
      : null;

    if (pdfFn) {
      const data = await pdfFn(buffer);
      if (data && typeof data.text === 'string' && data.text.trim().length > 0) {
        return data.text.trim();
      }
    }
  } catch (err: any) {
    console.warn(`[PDF Parser] PDFParse error on ${filename}:`, err?.message || err);
  }

  // Stream text recovery
  try {
    const str = buffer.toString('latin1', 0, Math.min(buffer.length, 3000000));
    const textMatches: string[] = [];
    const streamRegex = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = streamRegex.exec(str)) !== null) {
      if (match[1].trim().length > 1) {
        textMatches.push(match[1]);
      }
    }

    if (textMatches.length >= 3) {
      return textMatches.join(' ');
    }
  } catch {}

  // If no text was found, inform the user clearly
  throw new Error(
    `Unable to extract text from "${filename}". This PDF appears to be a scanned image or protected file without an extractable text layer. Please use an OCR-processed or text-based PDF.`
  );
}

// Dedicated DOCX Parser using mammoth
async function parseDocx(buffer: Buffer, filename: string): Promise<string> {
  if (!isDocxBuffer(buffer)) {
    throw new Error(`Invalid DOCX format: "${filename}" does not have valid DOCX zip headers.`);
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : '';

    if (!text || text.length === 0) {
      throw new Error(`The DOCX file "${filename}" is empty or contains only non-text media.`);
    }

    return text;
  } catch (err: any) {
    throw new Error(`Failed to parse DOCX document "${filename}": ${err.message || 'Corrupted DOCX archive'}`);
  }
}

// Dedicated Text Parser (TXT, MD, JSON, CSV)
function parsePlainText(buffer: Buffer, filename: string): string {
  if (!isLikelyTextBuffer(buffer)) {
    throw new Error(`File "${filename}" appears to be a binary file, not valid plain text.`);
  }

  let text = buffer.toString('utf-8');
  // Normalize line breaks and remove null characters
  text = text.replace(/\0/g, '').replace(/\r\n/g, '\n').trim();

  if (!text || text.length === 0) {
    throw new Error(`The text document "${filename}" is empty.`);
  }

  return text;
}

// Unified Document Parser with Validation
export async function parseDocument(buffer: Buffer, originalFilename: string, mimeType?: string): Promise<ParseResult> {
  if (!buffer || buffer.length === 0) {
    throw new Error(`Uploaded file "${originalFilename}" is 0 bytes (empty).`);
  }

  const ext = originalFilename.split('.').pop()?.toLowerCase() || '';
  let text = '';
  let detectedType: 'pdf' | 'docx' | 'text' = 'text';

  if (ext === 'pdf' || mimeType === 'application/pdf' || isPdfBuffer(buffer)) {
    detectedType = 'pdf';
    text = await parsePdf(buffer, originalFilename);
  } else if (ext === 'docx' || mimeType?.includes('wordprocessingml') || isDocxBuffer(buffer)) {
    detectedType = 'docx';
    text = await parseDocx(buffer, originalFilename);
  } else {
    detectedType = 'text';
    text = parsePlainText(buffer, originalFilename);
  }

  // Final validation
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (cleanText.length < 15) {
    throw new Error(
      `Document "${originalFilename}" contains insufficient readable text (${cleanText.length} chars). A minimum of 15 characters of content is required for semantic indexing.`
    );
  }

  const words = cleanText.split(/\s+/).filter(Boolean);

  return {
    text,
    detectedType,
    wordCount: words.length,
    characterCount: text.length,
  };
}
