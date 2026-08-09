import { CvIntelligenceService } from '../services/cvIntelligenceService.ts';
import { JobRequirementService } from '../services/jobRequirementService.ts';
import { ApplicationReadinessService } from '../services/applicationReadinessService.ts';
import { ApplicationDocumentService } from '../services/applicationDocumentService.ts';
import { DocumentValidationService } from '../services/documentValidationService.ts';
import { BENCHMARK_CV_TEXT } from './testBenchmarkCv.ts';
import { ExtractedCVData } from '../../src/types.ts';

async function runPhase2dBenchmarkTest() {
  console.log('==================================================');
  console.log('=== JOBL PHASE 2D APPLICATION DOCUMENT ENGINE BENCHMARK TEST ===');
  console.log('==================================================\n');

  // 1. Extract CV profile for Pride Duduzile Mpofu
  const cvService = new CvIntelligenceService();
  const cvBase64 = Buffer.from(BENCHMARK_CV_TEXT, 'utf-8').toString('base64');
  console.log('1. Ingesting benchmark candidate CV profile for Pride Duduzile Mpofu...');
  const candidateProfile = await cvService.extractCvContent(cvBase64, 'text/plain', 'PRIDE_MPOFU_CV.txt');
  console.log(`   Candidate: ${candidateProfile.firstName} ${candidateProfile.surname} (${candidateProfile.email})`);

  // 2. Define Benchmark Job Fixture
  const benchmarkJobFixture = {
    id: 'BENCHMARK-JOB-ADMIN-01',
    title: 'Administrative Assistant',
    employer: 'Apex Business Services',
    location: { city: 'Johannesburg', province: 'Gauteng' },
    employmentType: 'Full-time',
    requirements: [
      'Grade 12 / Matric required',
      'Microsoft Office proficiency (Word, Excel, PowerPoint, Outlook)',
      'Strong written and verbal communication skills',
      'Administrative ability and organizational skills',
      'Customer service experience',
      'Ability to work effectively in a team',
      'Valid driver\'s licence preferred',
    ],
    responsibilities: [
      'Manage office correspondence and incoming phone calls',
      'Assist with document filing and client administration',
    ],
    fullDescription: 'Apex Business Services is seeking an Administrative Assistant in Johannesburg.',
  };

  // 3. Run Phase 2B Match & Phase 2C Readiness Services
  const jobReqService = new JobRequirementService();
  const readinessService = new ApplicationReadinessService();
  const docService = new ApplicationDocumentService();

  console.log('2. Running Requirement Extraction, Match Engine, and Readiness Analysis...');
  const jobReqs = await jobReqService.extractJobRequirements(benchmarkJobFixture);
  const matchAnalysis = jobReqService.compareCandidateToJob(candidateProfile, jobReqs);

  // Candidate confirms Driver's licence
  const candidateConfirmations = {
    [jobReqs.allRequirements.find((r) => /driver/i.test(r.requirement))?.id || 'REQ-LICENCE']: 'YES',
  };
  const readiness = readinessService.analyzeReadiness(candidateProfile, jobReqs, matchAnalysis, candidateConfirmations);

  // 4. Generate Job-Specific CV PDF & Text
  console.log('\n3. Generating Tailored Professional CV (PDF & Text)...');
  const cvResult = await docService.generateCV(
    candidateProfile,
    jobReqs,
    matchAnalysis,
    readiness,
    candidateConfirmations
  );

  console.log(`   CV Document ID: ${cvResult.response.documentId}`);
  console.log(`   CV Download URL: ${cvResult.response.downloadUrl}`);
  console.log(`   PDF Buffer Size: ${cvResult.pdfBuffer.length} bytes`);

  // 5. Generate Job-Specific Cover Letter PDF & Text
  console.log('\n4. Generating Tailored Professional Cover Letter (PDF & Text)...');
  const clResult = await docService.generateCoverLetter(
    candidateProfile,
    jobReqs,
    matchAnalysis,
    readiness,
    candidateConfirmations
  );

  console.log(`   Cover Letter Document ID: ${clResult.response.documentId}`);
  console.log(`   Cover Letter Download URL: ${clResult.response.downloadUrl}`);
  console.log(`   PDF Buffer Size: ${clResult.pdfBuffer.length} bytes`);

  // 6. Verify Benchmark Candidate Profile Integrity Preservation in Generated Documents
  console.log('\n5. Verifying Benchmark Candidate Data Integrity in Generated CV...');
  const cvText = cvResult.response.contentText;

  const checkName = /Pride\s+Duduzile\s+Mpofu/i.test(cvText);
  const checkPhones = /68\s*186\s*3271/.test(cvText) && /075\s*174\s*0770/.test(cvText);
  const checkEmail = /pdmpofu@gmail\.com/i.test(cvText);
  const checkLocation = /Johannesburg/i.test(cvText);
  const checkFetc = /FETC/i.test(cvText) && /Business\s+Administration/i.test(cvText);
  const checkRe5 = /RE5/i.test(cvText);
  const checkMarketSa = /Market\s+South\s+Africa/i.test(cvText);
  const checkEmploymentHistory = /Market\s+South\s+Africa/i.test(cvText) || /Zibo/i.test(cvText);
  const checkMsOffice = /Microsoft/i.test(cvText) && (/Word/i.test(cvText) || /Excel/i.test(cvText));
  const checkUcounts = /Standard\s+Bank\s+Ucounts/i.test(cvText);
  const checkRefDelphine = /Delphine\s+Philander/i.test(cvText);

  // PDF Validity Checks
  const checkCvPdfValid = cvResult.pdfBuffer.toString('utf-8', 0, 5) === '%PDF-';
  const checkClPdfValid = clResult.pdfBuffer.toString('utf-8', 0, 5) === '%PDF-';

  // 7. Negative Tests: Leakage & Zero Fabrication Verification
  console.log('\n6. Running Zero-Fabrication & Anti-Leakage Negative Tests...');
  const validator = new DocumentValidationService();

  // Test 7a: Anti-Leakage Test (Other candidate must NOT receive Pride Mpofu's data)
  const otherCandidate: ExtractedCVData = {
    firstName: 'John',
    surname: 'Doe',
    email: 'johndoe@example.com',
    phone: '0821234567',
    professionalProfile: null,
    certifications: [],
    languages: [],
    licences: [],
    employmentHistory: [
      {
        employer: 'ABC Logistics',
        jobTitle: 'Warehouse Assistant',
        employmentDates: '2021 - 2023',
        startDate: '2021',
        endDate: '2023',
        responsibilities: ['Stock count', 'Dispatch'],
        achievements: [],
      },
    ],
    education: [{ qualification: 'Matric', institution: 'High School', year: '2020' }],
    skills: ['Forklift', 'Inventory'],
  };

  const leakedTextWithPride = cvText; // contains Pride Mpofu's data
  const leakageVal = validator.validateDocument(leakedTextWithPride, otherCandidate);
  const checkLeakageBlocked = !leakageVal.isValid;

  // Test 7b: Fake Degree Detection
  const fakeDegreeText = cvText + '\nAlso completed PhD in Artificial Intelligence at Harvard University.';
  const fakeDegreeVal = validator.validateDocument(fakeDegreeText, candidateProfile);
  const checkFakeDegreeBlocked = !fakeDegreeVal.isValid;

  const checks: { name: string; pass: boolean; details: string }[] = [
    { name: 'Full Name Preserved in CV', pass: checkName, details: `Pride Duduzile Mpofu found: ${checkName}` },
    { name: 'Both Phone Numbers Preserved in CV', pass: checkPhones, details: `Both phone numbers found: ${checkPhones}` },
    { name: 'Email Address Preserved in CV', pass: checkEmail, details: `pdmpofu@gmail.com found: ${checkEmail}` },
    { name: 'Johannesburg Location Preserved', pass: checkLocation, details: `Location found: ${checkLocation}` },
    { name: 'FETC Business Administration Level 4 Preserved', pass: checkFetc, details: `FETC found: ${checkFetc}` },
    { name: 'RE5 Regulatory Examination Preserved', pass: checkRe5, details: `RE5 found: ${checkRe5}` },
    { name: 'Market South Africa History Preserved', pass: checkMarketSa, details: `Market SA found: ${checkMarketSa}` },
    { name: 'Employment History Preserved', pass: checkEmploymentHistory, details: `Employment history found: ${checkEmploymentHistory}` },
    { name: 'MS Office Proficiency Preserved', pass: checkMsOffice, details: `MS Office suite found: ${checkMsOffice}` },
    { name: 'Standard Bank Milestone Preserved', pass: checkUcounts, details: `Ucounts milestone found: ${checkUcounts}` },
    { name: 'Reference (Delphine Philander) Preserved', pass: checkRefDelphine, details: `Reference found: ${checkRefDelphine}` },
    { name: 'Server-Side CV PDF Stream Binary Valid (%PDF-)', pass: checkCvPdfValid, details: `Header: ${cvResult.pdfBuffer.toString('utf-8', 0, 5)}` },
    { name: 'Server-Side Cover Letter PDF Stream Binary Valid (%PDF-)', pass: checkClPdfValid, details: `Header: ${clResult.pdfBuffer.toString('utf-8', 0, 5)}` },
    { name: 'Anti-Leakage Negative Test (Pride PII blocked from John Doe)', pass: checkLeakageBlocked, details: `Blocked: ${checkLeakageBlocked}` },
    { name: 'Zero-Fabrication Negative Test (Unclaimed PhD blocked)', pass: checkFakeDegreeBlocked, details: `Blocked: ${checkFakeDegreeBlocked}` },
  ];

  let failCount = 0;
  checks.forEach((chk, idx) => {
    if (chk.pass) {
      console.log(`✅ [${idx + 1}/${checks.length}] PASS: ${chk.name} (${chk.details})`);
    } else {
      console.error(`❌ [${idx + 1}/${checks.length}] FAIL: ${chk.name} (${chk.details})`);
      failCount++;
    }
  });

  console.log('\n==================================================');
  if (failCount > 0) {
    console.error(`❌ PHASE 2D BENCHMARK TEST FAILED with ${failCount} errors.`);
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 2D BENCHMARK & NEGATIVE TEST CHECKS PASSED PERFECTLY!');
  }
}

runPhase2dBenchmarkTest().catch((err) => {
  console.error('❌ Phase 2D Benchmark test exception:', err);
  process.exit(1);
});
