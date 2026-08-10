import pdfParse from 'pdf-parse-new';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';

async function createPdfBase64(text: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.text(text);
    doc.end();
  });
}

const PRIDE_OLD = `Curriculum Vitae of
PRIDE DUDUZILE MPOFU
FETC: Business Administration Service Level 4
RE5 Regulatory Examination: Representatives in all Categories of FSPs
...`;

async function test() {
  const buffer = await createPdfBase64(PRIDE_OLD);
  const data = await pdfParse(buffer);
  console.log('--- PDF TEXT ---');
  console.log(data.text);
}
test();
