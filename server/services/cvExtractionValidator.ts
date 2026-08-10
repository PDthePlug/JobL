import { ExtractedCVData } from '../../src/types.js';

export type ExtractionStatus = 'COMPLETE' | 'NEEDS_REVIEW' | 'FAILED' | 'OCR_REQUIRED' | 'UNSUPPORTED_FORMAT';

export interface ValidationResult {
  status: ExtractionStatus;
  reasons: string[];
}

export function validateExtraction(rawText: string, structuredData: ExtractedCVData): ValidationResult {
  const reasons: string[] = [];
  let status: ExtractionStatus = 'COMPLETE';

  // Basic sanity check
  if (!structuredData) {
    return { status: 'FAILED', reasons: ['Structured data is null'] };
  }

  const rawLower = rawText.toLowerCase();

  // 1. Email check
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailsInRaw = rawText.match(emailRegex);
  if (emailsInRaw && emailsInRaw.length > 0) {
    if (!structuredData.email) {
      status = 'NEEDS_REVIEW';
      reasons.push('Email found in source document but not extracted');
    }
  }

  // 2. Name check
  if (structuredData.firstName === 'Of' || structuredData.firstName === 'CV' || structuredData.firstName === 'Curriculum') {
    status = 'NEEDS_REVIEW';
    reasons.push('First name appears to be a document heading rather than a real name');
  }

  // 3. Gibberish check in fields
  const gibberishCheck = (text?: string | null) => {
    if (!text) return false;
    const replacementCount = (text.match(/\uFFFD/g) || []).length;
    return replacementCount > 5;
  };

  if (gibberishCheck(structuredData.professionalProfile)) {
    status = 'FAILED';
    reasons.push('Professional profile contains excessive replacement characters');
  }

  // 4. Missing major sections
  const hasWorkKeywords = /work experience|employment history|career history|experience/i.test(rawText);
  if (hasWorkKeywords && (!structuredData.employmentHistory || structuredData.employmentHistory.length === 0)) {
    status = 'NEEDS_REVIEW';
    reasons.push('Employment history section found in source but missing in structured data');
  }

  const hasEducationKeywords = /education|qualifications|academic/i.test(rawText);
  if (hasEducationKeywords && (!structuredData.education || structuredData.education.length === 0)) {
    status = 'NEEDS_REVIEW';
    reasons.push('Education section found in source but missing in structured data');
  }

  if (!structuredData.fullName) {
    if (structuredData.firstName && structuredData.surname) {
      structuredData.fullName = `${structuredData.firstName} ${structuredData.surname}`;
    } else {
      status = 'NEEDS_REVIEW';
      reasons.push('Candidate name could not be confidently determined');
    }
  }

  if (status === 'FAILED') {
    return { status, reasons };
  }

  return { status, reasons };
}
