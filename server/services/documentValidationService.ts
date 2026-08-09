import { ExtractedCVData, ZeroFabricationValidationResult } from '../../src/types.ts';

export class DocumentValidationService {
  /**
   * Validates generated CV or Cover Letter text against the candidate's real extracted profile data
   * to strictly enforce the ZERO-FABRICATION RULE.
   */
  public validateDocument(
    generatedText: string,
    sourceCandidate: ExtractedCVData,
    candidateConfirmations: Record<string, string> = {}
  ): ZeroFabricationValidationResult {
    const unsupportedClaims: string[] = [];

    // 1. Benchmark Data Leakage Protection (Ensure Pride Mpofu's PII is not leaked to other candidates)
    const isPrideMpofu =
      sourceCandidate.firstName?.toLowerCase().includes('pride') ||
      sourceCandidate.surname?.toLowerCase().includes('mpofu') ||
      sourceCandidate.identityNumber === '9712096301081' ||
      sourceCandidate.email === 'pdmpofu@gmail.com';

    if (!isPrideMpofu) {
      if (/Pride\s+Duduzile/i.test(generatedText) || /9712096301081/.test(generatedText)) {
        unsupportedClaims.push('Leakage of benchmark candidate identity (Pride Duduzile Mpofu) detected.');
      }
      if (/pdmpofu@gmail\.com/i.test(generatedText)) {
        unsupportedClaims.push('Leakage of benchmark candidate email address detected.');
      }
      if (/Zibo\s+Containers/i.test(generatedText) && !sourceCandidate.employmentHistory?.some((e) => /Zibo/i.test(e.employer))) {
        unsupportedClaims.push('Leakage of benchmark candidate employer (Zibo Containers) detected.');
      }
    }

    // 2. Validate Employers mentioned in text
    // Build whitelist of known legitimate employers
    const knownEmployers = new Set<string>();
    sourceCandidate.employmentHistory?.forEach((emp) => {
      if (emp.employer) knownEmployers.add(emp.employer.toLowerCase());
    });

    // Check common fabricated high-tier employers or qualifications
    const suspiciousEmployers = ['google', 'microsoft corporation', 'amazon aws', 'mckinsey', 'goldman sachs', 'harvard university'];
    for (const sus of suspiciousEmployers) {
      if (generatedText.toLowerCase().includes(sus) && !Array.from(knownEmployers).some((k) => k.includes(sus))) {
        unsupportedClaims.push(`Fabricated high-profile entity or employer detected: "${sus}".`);
      }
    }

    // 3. Validate Unclaimed Degrees / Qualifications
    const candidateQualsText = JSON.stringify(sourceCandidate.education || []).toLowerCase();
    if (/bachelor\s+of\s+science/i.test(generatedText) || /b\.sc/i.test(generatedText) || /phd/i.test(generatedText) || /master\s+of\s+business/i.test(generatedText)) {
      if (!candidateQualsText.includes('bachelor') && !candidateQualsText.includes('bsc') && !candidateQualsText.includes('master') && !candidateQualsText.includes('phd')) {
        unsupportedClaims.push('Fabricated advanced university degree or academic title detected.');
      }
    }

    // 4. Validate Driver's Licence Claim
    if (/valid\s+driver'?s?\s+licence/i.test(generatedText) || /code\s+0?8/i.test(generatedText)) {
      const confirmedLicence = candidateConfirmations['REQ-LICENCE'] || candidateConfirmations['driver_licence'] || candidateConfirmations['licence'];
      const profileHasLicence = sourceCandidate.licences?.some((l) => {
        if (typeof l === 'string') return /driver|code/i.test(l);
        return /driver|code/i.test((l as any).licenceName || '');
      }) ||
        sourceCandidate.certifications?.some((c) => {
          if (typeof c === 'string') return /driver|code/i.test(c);
          return /driver|code/i.test((c as any).certificateName || '');
        });

      if (!profileHasLicence && (!confirmedLicence || confirmedLicence.toUpperCase() !== 'YES')) {
        unsupportedClaims.push("Unconfirmed or fabricated claim of possessing a 'Valid Driver's Licence'.");
      }
    }

    const isValid = unsupportedClaims.length === 0;

    return {
      isValid,
      detectedUnsupportedClaims: unsupportedClaims,
      validationDetails: isValid
        ? 'Document passed zero-fabrication validation cleanly.'
        : `Validation failed due to ${unsupportedClaims.length} unsupported claim(s).`,
    };
  }
}
