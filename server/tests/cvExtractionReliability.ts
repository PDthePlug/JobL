import { CvIntelligenceService } from '../services/cvIntelligenceService.js';
import { validateExtraction } from '../services/cvExtractionValidator.js';
import PDFDocument from 'pdfkit';

async function createMockPdf(text: string): Promise<string> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData.toString('base64'));
    });
    doc.text(text);
    doc.end();
  });
}

async function runTests() {
  console.log('=== JOBL PHASE 2A.2 CV EXTRACTION RELIABILITY TEST ===\n');
  const cvService = new CvIntelligenceService();
  
  const tests = [
    {
      name: '1. Known-good text PDF',
      type: 'application/pdf',
      filename: 'good_cv.pdf',
      content: `John Doe\nPhone: 082 111 2222\nEmail: john@example.com\nProfessional Profile: I am a hard worker.\nExperience: Pick n Pay, Cashier, 2021-2023.\nEducation: Matric, 2020.`,
      expectSuccess: true
    },
    {
      name: '2. Corrupted gibberish text (should fail)',
      type: 'text/plain',
      filename: 'corrupted.txt',
      content: Buffer.from('\xFF\xFE\x00\x01\x02\x03\x04\x05\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD').toString('base64'),
      isBase64: true,
      expectSuccess: false
    },
    {
      name: '3. Empty file (should fail)',
      type: 'application/pdf',
      filename: 'empty.pdf',
      content: Buffer.from('').toString('base64'),
      isBase64: true,
      expectSuccess: false
    },
    {
      name: '4. Scanned PDF (simulated short text)',
      type: 'application/pdf',
      filename: 'scanned.pdf',
      content: 'A', // Too short, will be flagged as scanned or low quality
      expectSuccess: false
    }
  ];

  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    let base64 = test.content;
    
    if (!test.isBase64 && test.type === 'application/pdf') {
      base64 = await createMockPdf(test.content);
    } else if (!test.isBase64) {
      base64 = Buffer.from(test.content).toString('base64');
    }

    try {
      const extracted = await cvService.extractCvContent(base64, test.type, test.filename);
      const validation = validateExtraction(extracted.rawExtractedText || '', extracted);
      
      console.log(`Result Status: ${validation.status}`);
      if (validation.reasons.length > 0) {
        console.log(`Reasons: ${validation.reasons.join(', ')}`);
      }

      if (test.expectSuccess && validation.status !== 'COMPLETE' && validation.status !== 'NEEDS_REVIEW') {
        console.error(`❌ FAILED: Expected success but got ${validation.status}`);
      } else if (!test.expectSuccess && (validation.status === 'COMPLETE')) {
        console.error(`❌ FAILED: Expected failure/review but got ${validation.status}`);
      } else {
        console.log(`✅ PASS: Handled as expected.`);
      }

    } catch (e: any) {
      console.log(`Exception thrown: ${e.message}`);
      if (!test.expectSuccess) {
        console.log(`✅ PASS: Handled as expected by throwing exception.`);
      } else {
        console.error(`❌ FAILED: Expected success but threw exception.`);
      }
    }
  }

  console.log('\n=== ALL RELIABILITY TESTS COMPLETED ===');
}

runTests().catch(console.error);
