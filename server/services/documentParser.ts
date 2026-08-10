
import pdfParse from 'pdf-parse-new';
import * as mammoth from 'mammoth';

export type FileType = 'pdf' | 'docx' | 'doc' | 'txt' | 'rtf' | 'unknown';

export function detectFileType(buffer: Buffer): FileType {
  // Check magic numbers
  if (buffer.length > 4) {
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'pdf';
    }
    if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
      return 'docx';
    }
    if (buffer.length > 8) {
      const docMagic = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];
      let isDoc = true;
      for (let i = 0; i < 8; i++) {
        if (buffer[i] !== docMagic[i]) {
          isDoc = false;
          break;
        }
      }
      if (isDoc) return 'doc';
    }
    if (buffer[0] === 0x7B && buffer[1] === 0x5C && buffer[2] === 0x72 && buffer[3] === 0x74 && buffer[4] === 0x66) {
      return 'rtf';
    }
  }
  
  // Basic heuristic for text: if > 90% of bytes are printable ASCII or common whitespace
  let printableCount = 0;
  const checkLen = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLen; i++) {
    const b = buffer[i];
    if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) {
      printableCount++;
    }
  }
  if (checkLen > 0 && printableCount / checkLen > 0.9) {
    return 'txt';
  }
  
  return 'unknown';
}

export async function extractTextFromBuffer(buffer: Buffer, fileType: FileType): Promise<{text: string, isScanned?: boolean}> {
  if (fileType === 'pdf') {
    const data = await pdfParse(buffer);
    const text = data.text;
    // Check if scanned (very little text compared to page count)
    const isScanned = text.trim().length < (data.numpages * 50);
    return { text, isScanned };
  } else if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  } else if (fileType === 'txt') {
    return { text: buffer.toString('utf-8') };
  } else if (fileType === 'doc') {
    throw new Error('Legacy .DOC files cannot currently be read reliably. Please save the document as PDF or DOCX and upload again.');
  } else {
    throw new Error('Unsupported file format.');
  }
}

export type TextQuality = 'CLEAN' | 'ACCEPTABLE' | 'LOW_QUALITY' | 'CORRUPTED' | 'EMPTY';

export function assessTextQuality(text: string): TextQuality {
  if (!text || text.trim().length === 0) return 'EMPTY';
  
  const totalChars = text.length;
  if (totalChars < 50) return 'LOW_QUALITY'; // Too short to be a valid CV
  
  let invalidChars = 0;
  for (let i = 0; i < totalChars; i++) {
    const code = text.charCodeAt(i);
    // Replacement character or control character (excluding newline, carriage return, tab)
    if (code === 0xFFFD || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      invalidChars++;
    }
  }
  
  const invalidRatio = invalidChars / totalChars;
  
  if (invalidRatio > 0.1) return 'CORRUPTED';
  if (invalidRatio > 0.05) return 'LOW_QUALITY';
  
  // Word boundaries check: looking for sequences of valid letters
  const words = text.match(/\b\w+\b/g) || [];
  if (words.length < 10) return 'LOW_QUALITY';
  
  return invalidRatio === 0 ? 'CLEAN' : 'ACCEPTABLE';
}
