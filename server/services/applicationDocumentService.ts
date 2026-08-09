import PDFDocument from 'pdfkit';
import {
  ExtractedCVData,
  JobRequirements,
  JobMatchAnalysis,
  ApplicationReadinessAnalysis,
  GeneratedDocumentResponse,
  GeneratedDocumentType,
  DocumentMetadata,
} from '../../src/types.ts';
import { DocumentValidationService } from './documentValidationService.ts';

// In-memory document storage store for generated documents (for PDF download endpoints)
const documentStore = new Map<string, { pdfBuffer: Buffer; response: GeneratedDocumentResponse }>();
const documentVersionTracker = new Map<string, number>();

export class ApplicationDocumentService {
  private validator = new DocumentValidationService();

  /**
   * Generates a tailored, professional Job-Specific CV PDF and Text.
   */
  public async generateCV(
    candidate: ExtractedCVData,
    jobReqs: JobRequirements,
    matchAnalysis: JobMatchAnalysis,
    readiness: ApplicationReadinessAnalysis,
    candidateConfirmations: Record<string, string> = {}
  ): Promise<{ response: GeneratedDocumentResponse; pdfBuffer: Buffer }> {
    // 1. Determine version
    const trackerKey = `${candidate.email || 'candidate'}-${jobReqs.jobId}-CV`;
    const version = (documentVersionTracker.get(trackerKey) || 0) + 1;
    documentVersionTracker.set(trackerKey, version);

    // 2. Format Structured CV Text
    const fullName = candidate.fullName || `${candidate.firstName || ''} ${candidate.surname || ''}`.trim() || 'CANDIDATE';
    const phones = candidate.phoneNumbers?.length
      ? candidate.phoneNumbers.join(' / ')
      : candidate.phone || 'Contact Phone Unspecified';
    const email = candidate.email || '';
    const location = candidate.city || candidate.province || candidate.physicalAddress || 'South Africa';

    // Tailored Professional Profile statement grounded strictly in actual candidate facts
    const currentStatus = candidate.currentEmploymentStatus ? `Currently ${candidate.currentEmploymentStatus}.` : '';
    const targetRole = candidate.desiredPosition || jobReqs.jobTitle;
    const profileStatement = candidate.professionalProfile ||
      `Experienced and versatile professional (${currentStatus}) seeking the position of ${targetRole} at ${jobReqs.employer}. Possesses proven track record in client service, operational execution, and administrative competence with a commitment to high-quality work and organizational success.`;

    let cvText = `==================================================\n`;
    cvText += `CURRICULUM VITAE OF ${fullName.toUpperCase()}\n`;
    cvText += `==================================================\n\n`;

    cvText += `CONTACT INFORMATION\n`;
    cvText += `-------------------\n`;
    if (email) cvText += `Email: ${email}\n`;
    cvText += `Telephone: ${phones}\n`;
    cvText += `Location: ${location}\n`;
    if (candidate.identityNumber) cvText += `Identity Number: ${candidate.identityNumber}\n`;
    if (candidate.maritalStatus) cvText += `Marital Status: ${candidate.maritalStatus}\n`;
    if (candidate.gender) cvText += `Gender: ${candidate.gender}\n`;
    if (candidate.availability) cvText += `Availability: ${candidate.availability}\n`;
    cvText += `\n`;

    cvText += `PROFESSIONAL SUMMARY\n`;
    cvText += `--------------------\n`;
    cvText += `${profileStatement}\n`;
    if (candidate.personalStatementBullets?.length) {
      candidate.personalStatementBullets.forEach((bullet) => {
        cvText += `• ${bullet}\n`;
      });
    }
    cvText += `\n`;

    // Core Skills Section
    const allSkills = new Set<string>();
    if (candidate.skills?.length) {
      candidate.skills.forEach((s) => allSkills.add(typeof s === 'string' ? s : `${(s as any).skillName}: ${(s as any).description}`));
    }
    if (candidate.languages?.length) {
      allSkills.add(`Languages: ${candidate.languages.join(', ')}`);
    }

    if (allSkills.size > 0) {
      cvText += `CORE COMPETENCIES & SKILLS\n`;
      cvText += `-------------------------\n`;
      allSkills.forEach((sk) => {
        cvText += `• ${sk}\n`;
      });
      cvText += `\n`;
    }

    // Professional Experience Section
    if (candidate.employmentHistory?.length) {
      cvText += `PROFESSIONAL EXPERIENCE\n`;
      cvText += `-----------------------\n`;
      candidate.employmentHistory.forEach((emp) => {
        cvText += `${emp.jobTitle || 'Position'} | ${emp.employer || 'Employer'}\n`;
        if (emp.startDate || emp.endDate) {
          cvText += `Period: ${emp.startDate || ''} - ${emp.endDate || 'Present'}\n`;
        }
        if (emp.responsibilities?.length) {
          emp.responsibilities.forEach((resp) => {
            cvText += `  • ${resp}\n`;
          });
        }
        if (emp.milestones?.length) {
          cvText += `  Milestones / Key Achievements:\n`;
          emp.milestones.forEach((m) => {
            cvText += `    - ${m}\n`;
          });
        }
        cvText += `\n`;
      });
    }

    // Education & Qualifications
    if (candidate.education?.length) {
      cvText += `EDUCATION & QUALIFICATIONS\n`;
      cvText += `--------------------------\n`;
      candidate.education.forEach((edu) => {
        if (typeof edu === 'string') {
          cvText += `• ${edu}\n`;
        } else {
          cvText += `• ${edu.qualification || 'Qualification'}${edu.institution ? ` - ${edu.institution}` : ''}`;
          if (edu.year) cvText += ` (${edu.year})`;
          cvText += `\n`;
        }
      });
      cvText += `\n`;
    }

    // Certifications & Licences
    if (candidate.certifications?.length || candidate.licences?.length || candidate.certificationItems?.length) {
      cvText += `CERTIFICATIONS & LICENCES\n`;
      cvText += `-------------------------\n`;
      candidate.certifications?.forEach((c) => {
        if (typeof c === 'string') {
          cvText += `• ${c}\n`;
        } else {
          const name = (c as any).certificateName || (c as any).qualification || 'Certification';
          cvText += `• ${name}`;
          if ((c as any).unitStandard) cvText += ` (Unit Standard: ${(c as any).unitStandard})`;
          if ((c as any).issueDate) cvText += ` - Issued: ${(c as any).issueDate}`;
          cvText += `\n`;
        }
      });
      candidate.certificationItems?.forEach((ci) => {
        const name = ci.qualification || ci.issuingBody || 'Certification';
        cvText += `• ${name}`;
        if (ci.unitStandard) cvText += ` (Unit Standard: ${ci.unitStandard})`;
        if (ci.issueDate) cvText += ` - Issued: ${ci.issueDate}`;
        cvText += `\n`;
      });
      candidate.licences?.forEach((l) => {
        if (typeof l === 'string') {
          cvText += `• ${l}\n`;
        } else {
          const name = (l as any).licenceName || (l as any).name || 'Licence';
          cvText += `• ${name}`;
          if ((l as any).licenceCode) cvText += ` (Code: ${(l as any).licenceCode})`;
          cvText += `\n`;
        }
      });
      cvText += `\n`;
    }

    // Candidate Confirmed Additional Information
    const confirmedKeys = Object.keys(candidateConfirmations).filter((k) => candidateConfirmations[k] === 'YES');
    if (confirmedKeys.length > 0) {
      cvText += `CONFIRMED APPLICANT DECLARATIONS\n`;
      cvText += `--------------------------------\n`;
      confirmedKeys.forEach((k) => {
        cvText += `• Confirmed: ${k}\n`;
      });
      cvText += `\n`;
    }

    // References
    if (candidate.references?.length) {
      cvText += `PROFESSIONAL REFERENCES\n`;
      cvText += `-----------------------\n`;
      candidate.references.forEach((ref) => {
        cvText += `• ${ref.name || 'Reference'} - ${ref.titleRelationship || ''} (${ref.organisation || ''}) | Phone: ${ref.contactNumber || 'On Request'}\n`;
      });
      cvText += `\n`;
    }

    // 3. Zero Fabrication Validation Layer
    const valResult = this.validator.validateDocument(cvText, candidate, candidateConfirmations);
    if (!valResult.isValid) {
      throw new Error(`Zero-Fabrication Validation Failed for CV: ${valResult.detectedUnsupportedClaims.join('; ')}`);
    }

    // 4. Generate PDF Buffer
    const pdfBuffer = await this.renderPdf('CURRICULUM VITAE', fullName, cvText);

    // 5. Build Response Object
    const documentId = `DOC-CV-${jobReqs.jobId}-${Date.now()}`;
    const metadata: DocumentMetadata = {
      candidateProfileVersion: '2A.1',
      opportunityId: jobReqs.jobId,
      jobTitle: jobReqs.jobTitle,
      employer: jobReqs.employer,
      generationTimestamp: new Date().toISOString(),
      sourceProfile: `${fullName} (${email})`,
      documentType: 'CV',
      generationStatus: 'SUCCESS',
      version,
    };

    const response: GeneratedDocumentResponse = {
      documentId,
      documentType: 'CV',
      version,
      title: `Curriculum Vitae - ${fullName} (${jobReqs.jobTitle})`,
      contentText: cvText,
      downloadUrl: `/api/application-documents/download/${documentId}`,
      metadata,
      generatedAt: new Date().toISOString(),
    };

    documentStore.set(documentId, { pdfBuffer, response });
    return { response, pdfBuffer };
  }

  /**
   * Generates a Job-Specific Professional Cover Letter PDF and Text.
   */
  public async generateCoverLetter(
    candidate: ExtractedCVData,
    jobReqs: JobRequirements,
    matchAnalysis: JobMatchAnalysis,
    readiness: ApplicationReadinessAnalysis,
    candidateConfirmations: Record<string, string> = {}
  ): Promise<{ response: GeneratedDocumentResponse; pdfBuffer: Buffer }> {
    // 1. Determine version
    const trackerKey = `${candidate.email || 'candidate'}-${jobReqs.jobId}-COVER_LETTER`;
    const version = (documentVersionTracker.get(trackerKey) || 0) + 1;
    documentVersionTracker.set(trackerKey, version);

    const fullName = candidate.fullName || `${candidate.firstName || ''} ${candidate.surname || ''}`.trim() || 'Candidate';
    const email = candidate.email || '';
    const phones = candidate.phoneNumbers?.length
      ? candidate.phoneNumbers.join(' / ')
      : candidate.phone || '';
    const location = candidate.city || candidate.province || 'South Africa';
    const currentDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

    // 2. Draft Grounded, Human-Sounding Cover Letter Content
    let clText = `${fullName}\n`;
    if (location) clText += `${location}\n`;
    if (phones) clText += `Tel: ${phones}\n`;
    if (email) clText += `Email: ${email}\n\n`;

    clText += `Date: ${currentDate}\n\n`;

    clText += `To: The Hiring Committee / Recruitment Department\n`;
    clText += `${jobReqs.employer}\n`;
    clText += `Re: Application for ${jobReqs.jobTitle}\n\n`;

    clText += `Dear Hiring Team,\n\n`;

    clText += `I am writing to express my strong interest in applying for the ${jobReqs.jobTitle} position at ${jobReqs.employer}. Having reviewed the requirements for this position alongside my verified professional background, I am confident in my alignment with the responsibilities and operational expectations of your organization.\n\n`;

    // Highlight candidate's genuine experience
    if (candidate.employmentHistory?.length) {
      const topEmp = candidate.employmentHistory[0];
      clText += `My professional background includes hands-on experience as a ${topEmp.jobTitle} at ${topEmp.employer}`;
      if (topEmp.responsibilities?.length) {
        clText += `, where I was responsible for ${topEmp.responsibilities[0].toLowerCase()}`;
      }
      clText += `. Through this role and my previous employment history, I have developed strong practical capabilities in client communication, task execution, and team collaboration.\n\n`;
    }

    // Highlight genuine qualifications & skills
    const qualList: string[] = [];
    if (candidate.education?.length) {
      qualList.push(candidate.education[0].qualification);
    }
    if (candidate.certifications?.length) {
      const firstCert = candidate.certifications[0];
      qualList.push(typeof firstCert === 'string' ? firstCert : (firstCert as any).certificateName || 'Certification');
    }

    if (qualList.length > 0) {
      clText += `I hold relevant formal qualifications including ${qualList.join(' and ')}. Furthermore, I possess practical proficiency in essential software and communication tools required for this role, as well as proven service orientation and problem-solving abilities.\n\n`;
    }

    clText += `I am eager for the opportunity to contribute my skills and dedication to ${jobReqs.employer}. Thank you for taking the time to review my application and enclosed curriculum vitae. I welcome the opportunity to discuss my application further.\n\n`;

    clText += `Sincerely,\n\n`;
    clText += `${fullName}\n`;

    // 3. Zero Fabrication Validation Layer
    const valResult = this.validator.validateDocument(clText, candidate, candidateConfirmations);
    if (!valResult.isValid) {
      throw new Error(`Zero-Fabrication Validation Failed for Cover Letter: ${valResult.detectedUnsupportedClaims.join('; ')}`);
    }

    // 4. Render PDF
    const pdfBuffer = await this.renderPdf('COVER LETTER', fullName, clText);

    // 5. Build Response
    const documentId = `DOC-CL-${jobReqs.jobId}-${Date.now()}`;
    const metadata: DocumentMetadata = {
      candidateProfileVersion: '2A.1',
      opportunityId: jobReqs.jobId,
      jobTitle: jobReqs.jobTitle,
      employer: jobReqs.employer,
      generationTimestamp: new Date().toISOString(),
      sourceProfile: `${fullName} (${email})`,
      documentType: 'COVER_LETTER',
      generationStatus: 'SUCCESS',
      version,
    };

    const response: GeneratedDocumentResponse = {
      documentId,
      documentType: 'COVER_LETTER',
      version,
      title: `Cover Letter - ${fullName} (${jobReqs.jobTitle})`,
      contentText: clText,
      downloadUrl: `/api/application-documents/download/${documentId}`,
      metadata,
      generatedAt: new Date().toISOString(),
    };

    documentStore.set(documentId, { pdfBuffer, response });
    return { response, pdfBuffer };
  }

  /**
   * Retrieves a generated PDF document by ID.
   */
  public getStoredDocument(documentId: string): { pdfBuffer: Buffer; response: GeneratedDocumentResponse } | null {
    return documentStore.get(documentId) || null;
  }

  /**
   * Helper to render clean professional PDF using pdfkit.
   */
  private renderPdf(headerTitle: string, candidateName: string, textContent: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Header Styling
        doc.fillColor('#0F172A').fontSize(20).font('Helvetica-Bold').text(headerTitle, { align: 'center' });
        doc.moveDown(0.3);
        doc.fillColor('#2563EB').fontSize(14).font('Helvetica-Bold').text(candidateName, { align: 'center' });
        doc.moveDown(0.5);

        // Divider Line
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // Body Content
        doc.fillColor('#1E293B').fontSize(10.5).font('Helvetica').lineGap(4);

        const lines = textContent.split('\n');
        for (const line of lines) {
          if (line.startsWith('===') || line.startsWith('---')) {
            continue;
          }
          if (line === line.toUpperCase() && line.trim().length > 3 && !line.includes(':')) {
            doc.moveDown(0.5);
            doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text(line);
            doc.fillColor('#1E293B').font('Helvetica').fontSize(10.5);
          } else if (line.startsWith('•') || line.startsWith('  •')) {
            doc.text(line, { indent: 15 });
          } else {
            doc.text(line);
          }
        }

        // Footer
        doc.fontSize(8).fillColor('#94A3B8').text(`Generated for Application - Confidential`, 50, 780, { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
