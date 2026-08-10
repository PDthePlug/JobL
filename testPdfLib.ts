import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import pdfParse from 'pdf-parse-new';

async function createPdf(text: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 50, y: 700, font, size: 12 });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function run() {
  const buf = await createPdf("Hello world this is a test. Email: test@example.com");
  const data = await pdfParse(buf);
  console.log(data.text);
}
run();
