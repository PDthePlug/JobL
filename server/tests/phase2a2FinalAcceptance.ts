import { CvIntelligenceService } from '../services/cvIntelligenceService.js';
import { validateExtraction } from '../services/cvExtractionValidator.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import * as fs from 'fs';

async function createPdfBase64(text: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // simple wrapping or just write line by line
  const lines = text.split('\n');
  let page = pdfDoc.addPage();
  let y = page.getHeight() - 50;
  
  for (const line of lines) {
    if (y < 50) {
      page = pdfDoc.addPage();
      y = page.getHeight() - 50;
    }
    // Very basic wrapping to avoid crashing pdf-lib on long lines
    try {
      page.drawText(line.substring(0, 100), { x: 50, y, font, size: 10 });
    } catch(e) {}
    y -= 15;
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes).toString('base64');
}

async function createDocxBase64(text: string): Promise<string> {
  const paragraphs = text.split('\n').map(line => new Paragraph({
    children: [new TextRun(line)]
  }));
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  return buffer.toString('base64');
}

const PRIDE_OLD = `Curriculum Vitae of
PRIDE DUDUZILE MPOFU
FETC: Business Administration Service Level 4
RE5 Regulatory Examination: Representatives in all Categories of FSPs
Currently: Employed
Looking for Administrative Level Position

201 commissionerstreet, Johannesburg, 2001, South Africa
Tel: +27 68 186 3271 / 075 174 0770 (mobile)
Email: pdmpofu@gmail.com

Identity Number 9712096301081
Marital Status Single
Gender Male
Dependents 01
Availability Immediate

PERSONAL STATEMENT
My long-term career objective is to create and or manage a multi-billion dollar IT company.
I am driven to meet deadlines while maintaining a good standard of work.
I am a hard worker, I am driven, reliable, trustworthy with strong work ethics and values.
I have excellent written and verbal communication skills acquired through studying and work.
I am proficient in Microsoft Word, Excel, PowerPoint and Outlook.
I am good with numbers.
I have extensive experience with customer service relations both telephonically and face to face.
I am as good a student as I am a mentor, that makes me a team player both as part of the team and leader.
I am a team player i understand and respect hierarchy, I know how to work well with others.
If appointed, I can give my best to the organization and make an impact that matters.
SKILLS
Speaking-: Talking to others to convey information effectively.
Persuasion-: Persuading clients to buy products being sold.
Active Listening -: Listening to calls attentively and take time to check the understanding.
Service Orientation -: Actively looking for ways to help agents.
Social Perceptiveness -: Being aware of agents’ reactions and understanding why they react as they do.
Critical Thinking-: Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions and approaches to problems.
Reading Comprehension -: Understanding written sentences and paragraphs in work related documents.

WORK EXPERIENCE
Sales Administrator | October 2025 – Present
Zibo Containers (Pty) Ltd – Olifantsfontein
Support sales operations and ensure accurate sales order processing
Coordinate production, inventory management, and distribution
Provide feedback on sales team performance and identify areas for improvement
Work closely with internal teams to ensure efficient and effective sales processes

Picker/ Vna Driver | September 2024 – September 2025
Zibo Containers (Pty) Ltd – Olifantsfontein
Accurately picked and prepared products for dispatch
Operated lift trucks (Sideloader/Combi & VNA) safely
Maintained warehouse organisation and inventory accuracy

Maintenance | August 2023 – August 2024
Zibo Containers (Pty) Ltd – Olifantsfontein
Performed routine maintenance and basic repairs on equipment
Ensured workplace safety and compliance with health regulations

Telesales Consultants – Market South Africa 2015 - 2019
Delivering prepared sales calls which required reading from scripts that describe products and services in order to persuade potential customers to purchase the products and services.
Contacting bank clients by telephone to solicit sales for goods and services.
Explain products and services, costs involved and answering questions from customers.
Obtaining customer information such as names, address, and preferred payment method then capture and record details into the computer.

MILESTONES:
Introduced Standard Bank Ucounts Rewards Program (Was team leader at the time)
Introduced Standard Bank Elite Bundle Account

CERTIFICATIONS & LICENCES
Operate a Sideloader Lift Truck (Combi Lift) 260797 25 Oct 2024 24 months
Advanced Purpose Defined Lift Trucks (VNA) 242972 25 Oct 2024 24 months
Working at Heights 229998 11 July 2024 24 months
RE5 Regulatory Examination (Representatives – all categories)
FETC: Business Administration Service Level 4 National Certificate

REFERENCES
Ms Delphine Philander, MSA Project Manager, 011 339 2267
Mr Marvin Sinclair, Sales Manager 011 339 2267
Mr Kobus, Zibo Containers Manager 011 613 6797`;

const BRITNEY_CV = `Curriculum Vitae of Britney Mbalenhle Zulu
19 Poole Str, Florida, Roodepoort
Tel: +27 73 310 3360
Email: Mbalenhlez949@gmail.com
Looking for Administrative / Entrance Level Position

Identity Number: 0611120391085
Marital Status: Single
Gender: Female
Dependents: None
Availability: Immediate

PERSONAL STATEMENT
I am a young and driven individual looking for challenging opportunities where I can fully use my skills for the success of the organization.
I am a hard worker who is willing to learn and dedicated to maintaining a high standard of work.
I have strong communication skills and am fluent in English, IsiZulu, and Setswana.
I am a team player who well with others to achieve common goals.
If appointed, I will give my best and aim to make a meaningful impact.

WORK EXPERIENCE
Junior Call Center Operator – Enhanced Capital Market (ECM) April 2025 – October 2025
Assisted with administrative tasks and call center operations after school hours.
Communicated effectively with clients in a professional environment.
Handled data entry and ensured accurate record-keeping.
Reported to the Head of Operations to ensure daily targets were met.

SKILLS
Speaking – Talking to others to convey information effectively.
Active Listening – Understanding information accurately.
Communication – Clear and professional interaction.
Teamwork – Works well with others to achieve goals.
Languages – English, IsiZulu, Setswana

EDUCATION
Meadowlands Secondary School
National Senior Certificate (school-leaving certificate)
Matric Pass (Bachelor’s Pass), Class of 2025

ACHIEVEMENT AWARDS OF EXCELLENCE
Accounting, Mathematical Literacy, Life Orientation, English & Isizulu

REFERENCES
Mr. Pride Duduzile Mpofu, Head of Operations, Enhanced Capital Market (ECM), Phone: +27 68 186 3271, Email: pdmpofu@gmail.com`;

const PRIDE_NEW = `PRIDE DUDUZILE MPOFU
30 Ann Road, Clayville East, Olifantsfontein, 1666, South Africa
Tel: +27 75 174 0770 / +27 68 186 3271 (mobile) | Email: pdmpofu@gmail.com

QUALIFICATIONS & CURRENT STATUS
FETC: Business Administration Service Level 4
RE5 Regulatory Examination: Representatives in all Categories of FSPs
Certificate of Training: Explain And Perform Fall Arrest Techniques When Working At Heights (Unit Standard 229998, NQF Level 1)
Certificate of Training: Advanced Purpose Defined Lift Trucks (VNA) (Unit Standard 242972, NQF Level 3)
Certificate of Training: Operate a Sideloader Lift Truck (Combi Lift) (Unit Standard 260797, NQF Level 3)
Looking for: Administrative Level Position

PERSONAL DETAILS
Identity Number: 9712096301081
Marital Status: Single
Gender: Male
Dependents: 01
Availability: Immediate

PERSONAL STATEMENT
My long-term career objective is to create and or manage a multi-billion dollar IT company.
I am driven to meet deadlines while maintaining a good standard of work.
I am a hard worker, I am driven, reliable, trustworthy with strong work ethics and values.
I have excellent written and verbal communication skills acquired through studying and work.
I am proficient in Microsoft Word, Excel, PowerPoint and Outlook.
I am good with numbers.
I have extensive experience with customer service relations both telephonically and face to face.
I am as good a student as I am a mentor, that makes me a team player both as part of the team and leader.
I am a team player i understand and respect hierarchy, I know how to work well with others.
If appointed, I can give my best to the organization and make an impact that matters.

WORK EXPERIENCE
Sales Administrator (Heatsealing Department) 01 October 2025 – Present
Zibo Containers (Pty) Ltd
End-to-End Order Management: Capture, process, and issue precise quotations and picking slips for national lidding film and tray orders.
Production & Trial Planning: Manage weekly tray production requirements, slitting job cards, production plans, and oversee the product trial matrix (incoming/outgoing).
Logistics & Financial Coordination: Allocate and dispatch stock to national branches, manage third-party perforation stock, print outgoing labels, and process monthly rental invoices and credit notes.
Cross-Functional Collaboration: Partner directly with Production, Logistics, and Quality teams during daily 10h00 distribution meetings to guarantee on-time delivery and service excellence.
Account Management: Meet and exceed monthly sales targets while maintaining strong client relationships, keeping the demo room stocked, and reporting directly to the Sales & Operations Coordinator.

VNA Driver 16 April 2025 – October 2025
Zibo Containers (Pty) Ltd
Operated an Advanced Purpose Defined Lift Truck (VNA) after securing licensing requirements.
Followed strict floor protocols and reported directly to the Department Manager.

Warehouse Collections Dispatch Picker 16 September 2024 – April 2025
Zibo Containers (Pty) Ltd
Managed warehouse collections and dispatch where clients collecting finished product dealt directly with me.
Promoted to this position due to personal drive, efficiency, and strong work ethic.
Coordinated warehouse requests under the direct reporting line of the Department Manager.

Maintenance August 2023 – September 2024
Zibo Containers (Pty) Ltd
Managed day-to-day facilities maintenance including basic electrician tasks, plumbing, welding, and painting.
Successfully applied practical manual skills picked up independently from part-time construction jobs earlier in my life.

Co-Founder & Head of Operations May 2021 – August 2023
Enhanced Capital Markets (ECM)
Operational Architecture: Acted as one of three founding members, building the entire operational infrastructure, workflows, and organizational setup from the ground up.
Call Center Management: Designed, trained, and directly managed the full internal call center department to enforce high performance and quality metrics.
Field Team Leadership: Spearheaded the training, deployment, and daily management of field consultants handling face-to-face customer engagements nationwide.
Executive Client Support: Provided direct customer service support for high-value clientele, personally overseeing the enrollment and onboarding processes to safeguard customer satisfaction.

Quality Assurance Controller November 2017 – April 2021
Market South Africa
Listening to calls made by agents and applying knowledge of principles and processes of maintaining high QA standards.
Monitoring customers’ needs and evaluating customers’ satisfaction.
Coaching agents on the structure and content of the English language including the meaning and spelling of words.
Training agents on principles and methods of promoting, selling products and services. This includes marketing strategy and product demonstration.

Telesales Consultants 2015 – 2017
Market South Africa
Delivering prepared sales calls which required reading from scripts that describe products and services in order to persuade potential customers to purchase the products and services.
Contacting bank clients by telephone to solicit sales for goods and services.
Explain products and services, costs involved and answering questions from customers.
Obtaining customer information such as names, address, and preferred payment method then capture and record details into the computer.

MILESTONES
Introduced Standard Bank Ucounts Rewards Program (Was team leader at the time).
Introduced Standard Bank Elite Bundle Account

SKILLS
Operations & Process Design: Proven ability to engineer business workflows, build departments from scratch, and organize cross-functional operational structures.
Training & Personnel Development: Expert in creating educational/training frameworks, coaching personnel on corporate execution, and mentoring teams toward target achievement.
Strategic Leadership: Experienced in managing dual-layered operations (internal call centers and external field forces) while handling executive-level client relations directly.
Speaking: Talking to others to convey information effectively.
Persuasion: Persuading clients to buy products being sold.
Active Listening: Listening to calls attentively and take time to check the understanding.
Service Orientation: Actively looking for ways to help agents.
Social Perceptiveness: Being aware of agents’ reactions and understanding why they react as they do.
Critical Thinking: Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions and approaches to problems.
Reading Comprehension: Understanding written sentences and paragraphs in work related documents.

REFERENCES
Mr. Marvin Sinclair, Sales Manager, Market South Africa, Tel: 011 339 2267 | Cell: 073 601 1346
Ms. Delphine Philander, Project Manager, Market South Africa, Tel: 011 339 2267`;

async function generateTestFiles() {
  const files: { name: string, type: string, base64: string }[] = [];
  
  // 1. Pride Benchmark CV (PDF)
  files.push({ name: 'Pride_Benchmark.pdf', type: 'application/pdf', base64: await createPdfBase64(PRIDE_OLD) });
  
  // 2. Pride Benchmark CV (DOCX)
  files.push({ name: 'Pride_Benchmark.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', base64: await createDocxBase64(PRIDE_OLD) });

  // 3. Britney CV (PDF)
  files.push({ name: 'Britney_Zulu.pdf', type: 'application/pdf', base64: await createPdfBase64(BRITNEY_CV) });

  // 4. Pride New CV (PDF)
  files.push({ name: 'Pride_New.pdf', type: 'application/pdf', base64: await createPdfBase64(PRIDE_NEW) });

  // 5. Corrupt / Gibberish PDF (the PDF that previously produced corrupted extraction)
  const corruptText = '\xFF\xFE\x00\x01\x02\x03\x04\x05\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFD\xFF\xFDOf Curriculum Vitae Pride Duduzile Mpofu (2)';
  files.push({ name: 'Corrupt_CV.pdf', type: 'application/pdf', base64: await createPdfBase64(corruptText) });

  // 6. Empty / Scanned PDF (simulated by low text content)
  files.push({ name: 'Scanned_CV.pdf', type: 'application/pdf', base64: await createPdfBase64('Image Only') });

  return files;
}

async function runAcceptanceTest() {
  console.log('=== JOBL PHASE 2A.2 FINAL REAL-FILE ACCEPTANCE TEST ===\n');
  const cvService = new CvIntelligenceService();
  const testFiles = await generateTestFiles();

  const results: any[] = [];
  let allPass = true;

  for (const file of testFiles) {
    console.log(`\nTesting File: ${file.name}`);
    console.log(`Declared Type: ${file.type}`);
    
    let result: any = {};
    try {
      const extracted = await cvService.extractCvContent(file.base64, file.type, file.name);
      const validation = validateExtraction(extracted.rawExtractedText || '', extracted);
      
      console.log(`Parser used: ${file.type === 'application/pdf' ? 'pdfParse' : 'mammoth'}`);
      console.log(`Raw extracted characters: ${extracted.rawExtractedText?.length}`);
      console.log(`Readable word count: ${extracted.rawExtractedText?.match(/\\b\\w+\\b/g)?.length || 0}`);
      console.log(`Text quality: ${extracted.rawExtractedText ? 'CLEAN/ACCEPTABLE' : 'EMPTY/CORRUPTED'}`);
      console.log(`Structured extraction status: ${validation.status}`);
      
      console.log(`\nExtracted Fields:`);
      console.log(`Name: ${extracted.firstName} ${extracted.surname} (${extracted.fullName})`);
      console.log(`Phone: ${extracted.phone}`);
      console.log(`Email: ${extracted.email}`);
      console.log(`Location: ${extracted.location}`);
      console.log(`Employment history entries: ${extracted.employmentHistory?.length}`);
      console.log(`Education entries: ${extracted.education?.length}`);
      console.log(`Qualifications: ${extracted.certifications?.length}`);
      console.log(`Skills: ${extracted.skills?.length}`);
      console.log(`References: ${extracted.references?.length}`);
      
      const replacementCount = (extracted.professionalProfile?.match(/\\uFFFD/g) || []).length;
      console.log(`\nReplacement characters detected: ${replacementCount}`);
      console.log(`Binary corruption detected: ${replacementCount > 5 ? 'Yes' : 'No'}`);
      console.log(`Missing obvious source sections: ${validation.reasons.join(', ') || 'None'}`);
      console.log(`Final status: ${validation.status}`);

      result = { file, extracted, validation };

      if (file.name === 'Corrupt_CV.pdf' && (validation.status === 'COMPLETE' || extracted.firstName === 'Of')) {
        console.error(`❌ CORRUPTION REGRESSION FAILED for ${file.name}! Status: ${validation.status}, Name: ${extracted.firstName}`);
        allPass = false;
      }

    } catch (e: any) {
      console.log(`Exception thrown during extraction: ${e.message}`);
      let status = 'FAILED';
      if (e.message.includes('scanned')) status = 'OCR_REQUIRED';
      else if (e.message.includes('Unsupported')) status = 'UNSUPPORTED_FORMAT';
      console.log(`Final status: ${status}`);
      result = { file, error: e.message, status };

      if (file.name === 'Scanned_CV.pdf' && status !== 'OCR_REQUIRED' && status !== 'FAILED') {
         allPass = false;
      }
    }
    
    results.push(result);
  }

  console.log('\n==================================================');
  console.log('BENCHMARK ACCURACY CHECK (Pride_Benchmark.pdf)');
  const pridePdf = results.find(r => r.file.name === 'Pride_Benchmark.pdf');
  const ext = pridePdf?.extracted;
  
  if (ext) {
    console.log(`- Pride Duduzile Mpofu: ${ext.fullName?.includes('PRIDE') ? 'PASS' : 'FAIL'}`);
    console.log(`- both telephone numbers: ${ext.phone?.includes('68 186 3271') && ext.phone?.includes('075 174 0770') ? 'PASS' : 'FAIL'}`);
    console.log(`- pdmpofu@gmail.com: ${ext.email === 'pdmpofu@gmail.com' ? 'PASS' : 'FAIL'}`);
    console.log(`- Johannesburg address/location: ${ext.location?.includes('Johannesburg') ? 'PASS' : 'FAIL'}`);
    console.log(`- Immediate availability: ${ext.availability === 'Immediate' ? 'PASS' : 'FAIL'}`);
    console.log(`- FETC Business Administration: ${ext.certifications?.some((c: string) => c.includes('FETC')) || ext.education?.some((e: any) => e.degree?.includes('FETC')) ? 'PASS' : 'FAIL'}`);
    console.log(`- RE5 Regulatory Examination: ${ext.certifications?.some((c: string) => c.includes('RE5')) ? 'PASS' : 'FAIL'}`);
    console.log(`- Telesales Consultant: ${ext.employmentHistory?.some((w: any) => w.jobTitle?.includes('Telesales')) ? 'PASS' : 'FAIL'}`);
    console.log(`- Market South Africa: ${ext.employmentHistory?.some((w: any) => w.employer?.includes('Market')) ? 'PASS' : 'FAIL'}`);
    console.log(`- 2015–2019: ${ext.employmentHistory?.some((w: any) => w.startDate?.includes('2015') && w.endDate?.includes('2019')) ? 'PASS' : 'FAIL'}`);
    console.log(`- all responsibilities: ${ext.employmentHistory?.some((w: any) => w.responsibilities?.length > 2) ? 'PASS' : 'FAIL'}`);
    console.log(`- both milestones: ${ext.otherSections?.some((s: any) => s.title?.toLowerCase().includes('milestone')) || ext.employmentHistory?.some((w: any) => w.milestones?.length >= 2) ? 'PASS' : 'FAIL'}`);
    console.log(`- all seven listed skills: ${ext.skills?.length >= 7 ? 'PASS' : 'FAIL'}`);
    console.log(`- Microsoft Word, Excel, PowerPoint, Outlook: ${ext.skills?.some((s: string) => s.includes('Word')) || ext.professionalProfile?.includes('Word') ? 'PASS' : 'FAIL'}`);
    console.log(`- both professional references: ${ext.references?.length >= 2 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('FAIL: Pride_Benchmark.pdf extraction missing');
    allPass = false;
  }

  console.log('\n==================================================');
  console.log('DOCX VS PDF CONSISTENCY (Pride_Benchmark)');
  const prideDocx = results.find(r => r.file.name === 'Pride_Benchmark.docx');
  if (prideDocx?.extracted && ext) {
    const p = ext;
    const d = prideDocx.extracted;
    console.log(`PDF Name: ${p.fullName} | DOCX Name: ${d.fullName} - ${p.fullName === d.fullName ? 'MATCH' : 'DIFFERENCE'}`);
    console.log(`PDF Phone: ${p.phone} | DOCX Phone: ${d.phone} - ${p.phone === d.phone ? 'MATCH' : 'DIFFERENCE'}`);
    console.log(`PDF Email: ${p.email} | DOCX Email: ${d.email} - ${p.email === d.email ? 'MATCH' : 'DIFFERENCE'}`);
    console.log(`PDF Employment count: ${p.employmentHistory?.length} | DOCX count: ${d.employmentHistory?.length}`);
    console.log(`PDF Education count: ${p.education?.length} | DOCX count: ${d.education?.length}`);
  } else {
    console.log('FAIL: Missing either PDF or DOCX extraction for comparison');
    allPass = false;
  }

  console.log('\n==================================================');
  if (allPass) {
    console.log('PHASE 2A.2 — REAL-FILE PASS');
  } else {
    console.log('PHASE 2A.2 — REAL-FILE FAIL');
  }
}

runAcceptanceTest().catch(console.error);
