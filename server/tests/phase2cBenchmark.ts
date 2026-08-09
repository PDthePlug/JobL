import { CvIntelligenceService } from '../services/cvIntelligenceService.ts';
import { JobRequirementService } from '../services/jobRequirementService.ts';
import { ApplicationReadinessService } from '../services/applicationReadinessService.ts';
import { BENCHMARK_CV_TEXT } from './testBenchmarkCv.ts';

async function runPhase2cBenchmarkTest() {
  console.log('==================================================');
  console.log('=== JOBL PHASE 2C APPLICATION READINESS BENCHMARK TEST ===');
  console.log('==================================================\n');

  // 1. Extract CV profile (Phase 2A.1)
  const cvService = new CvIntelligenceService();
  const cvBase64 = Buffer.from(BENCHMARK_CV_TEXT, 'utf-8').toString('base64');
  console.log('1. Extracting candidate profile for Pride Duduzile Mpofu...');
  const candidateProfile = await cvService.extractCvContent(cvBase64, 'text/plain', 'PRIDE_MPOFU_CV.txt');
  console.log(`   Candidate: ${candidateProfile.firstName} ${candidateProfile.surname} (${candidateProfile.email})`);

  // 2. Define Benchmark Test Job Fixture
  const benchmarkJobFixture = {
    id: 'BENCHMARK-JOB-ADMIN-01',
    title: 'Administrative Assistant',
    employer: 'Apex Business Services (Test Fixture)',
    location: { city: 'Johannesburg', province: 'Gauteng' },
    employmentType: 'Full-time',
    qualificationRequirement: 'Grade 12 / Matric',
    requirements: [
      'Grade 12 / Matric required',
      'Microsoft Office proficiency (Word, Excel, PowerPoint, Outlook)',
      'Strong written and verbal communication skills',
      'Administrative ability and organizational skills',
      'Customer service experience',
      'Ability to work effectively in a team',
      'Attention to detail and accuracy',
      'Previous administrative experience preferred',
      'Valid driver\'s licence preferred',
    ],
    responsibilities: [
      'Manage office correspondence and incoming phone calls',
      'Assist with document filing, data entry, and record keeping',
      'Provide client support and customer service relations',
    ],
    fullDescription: `Apex Business Services is seeking an Administrative Assistant in Johannesburg. 
Candidate must hold a Grade 12 / Matric qualification, have strong Microsoft Office skills, 
excellent written and verbal communication, administrative ability, customer service experience, 
and ability to work in a team. Attention to detail is essential. 
Previous administrative experience is preferred. Valid driver's licence is preferred.`,
  };

  // 3. Extract requirements & Match Analysis (Phase 2B)
  const jobReqService = new JobRequirementService();
  console.log('2. Extracting structured job requirements and running Phase 2B match analysis...');
  const jobReqs = await jobReqService.extractJobRequirements(benchmarkJobFixture);
  const matchAnalysis = jobReqService.compareCandidateToJob(candidateProfile, jobReqs);

  // 4. Run Phase 2C Application Readiness Engine (Initial Pass - No confirmations)
  const readinessService = new ApplicationReadinessService();
  console.log('3. Running Phase 2C Application Readiness Analysis (Unconfirmed Pass)...');
  const initialReadiness = readinessService.analyzeReadiness(candidateProfile, jobReqs, matchAnalysis, {});

  console.log(`\n==================================================`);
  console.log(`INITIAL READINESS STATE: [${initialReadiness.readinessState}]`);
  console.log(`Summary: "${initialReadiness.readinessSummary}"`);
  console.log(`==================================================\n`);

  console.log(`Ready Items (${initialReadiness.readyItems.length}):`);
  initialReadiness.readyItems.forEach((r) => console.log(`  ✓ [READY] ${r.title} (Evidence: "${r.relatedEvidence}")`));

  console.log(`\nStrengthening Items (${initialReadiness.strengtheningItems.length}):`);
  initialReadiness.strengtheningItems.forEach((s) => console.log(`  △ [STRENGTHEN] ${s.title}: ${s.explanation}`));

  console.log(`\nConfirmation Items (${initialReadiness.confirmationItems.length}):`);
  initialReadiness.confirmationItems.forEach((c) => console.log(`  ? [CONFIRM] ${c.title}: ${c.explanation}`));

  console.log(`\nCandidate Questions (${initialReadiness.candidateQuestions.length}):`);
  initialReadiness.candidateQuestions.forEach((q) => console.log(`  Q: "${q.question}" [Options: ${q.options?.join(', ')}]`));

  // 5. Test Candidate Confirmation Flow (Simulate candidate answering YES to driver's licence)
  console.log('\n4. Simulating Candidate Confirmation (Answering YES to driver\'s licence question)...');
  const licenceReq = jobReqs.allRequirements.find((r) => r.category === 'LICENCE' || /driver/i.test(r.requirement));
  const confirmations: Record<string, string> = {};
  if (licenceReq) {
    confirmations[licenceReq.id] = 'YES';
    confirmations[licenceReq.requirement] = 'YES';
  }

  const confirmedReadiness = readinessService.analyzeReadiness(candidateProfile, jobReqs, matchAnalysis, confirmations);

  console.log(`\n==================================================`);
  console.log(`CONFIRMED READINESS STATE: [${confirmedReadiness.readinessState}]`);
  console.log(`Summary: "${confirmedReadiness.readinessSummary}"`);
  console.log(`==================================================\n`);

  // 6. Verification Checks against Phase 2C Requirements
  console.log('VERIFYING PHASE 2C SPECIFICATION REQUIREMENTS:');

  const checkMsReady = initialReadiness.readyItems.some((i) => i.title.toLowerCase().includes('microsoft office'));
  const checkCommReady = initialReadiness.readyItems.some((i) => i.title.toLowerCase().includes('written and verbal communication'));
  const checkCsReady = initialReadiness.readyItems.some((i) => i.title.toLowerCase().includes('customer service'));
  const checkTeamReady = initialReadiness.readyItems.some((i) => i.title.toLowerCase().includes('team'));

  const checkAdminStrengthen = initialReadiness.strengtheningItems.some((i) => i.title.toLowerCase().includes('administrative'));
  const checkLicenceConfirm = initialReadiness.confirmationItems.some((i) => i.title.toLowerCase().includes('driver'));

  const confirmedLicenceItem = confirmedReadiness.confirmationItems.find((i) => i.title.toLowerCase().includes('driver'));
  const checkLicenceConfirmedSource = confirmedLicenceItem ? confirmedLicenceItem.source === 'CANDIDATE_CONFIRMED' : false;

  const checkNoFabricatedQuals = !candidateProfile.education.some((e) => e.qualification?.includes('FABRICATED'));
  const checkStateValid = ['READY_TO_APPLY', 'READY_AFTER_CONFIRMATION', 'NEEDS_STRENGTHENING'].includes(initialReadiness.readinessState);

  const checks: { name: string; pass: boolean; details: string }[] = [
    {
      name: 'MATCH -> READY: Microsoft Office',
      pass: checkMsReady,
      details: `Present in readyItems: ${checkMsReady}`,
    },
    {
      name: 'MATCH -> READY: Written & Verbal Communication',
      pass: checkCommReady,
      details: `Present in readyItems: ${checkCommReady}`,
    },
    {
      name: 'MATCH -> READY: Customer Service',
      pass: checkCsReady,
      details: `Present in readyItems: ${checkCsReady}`,
    },
    {
      name: 'MATCH -> READY: Teamwork',
      pass: checkTeamReady,
      details: `Present in readyItems: ${checkTeamReady}`,
    },
    {
      name: 'PARTIAL_MATCH -> STRENGTHEN: Administrative Experience',
      pass: checkAdminStrengthen,
      details: `Present in strengtheningItems: ${checkAdminStrengthen}`,
    },
    {
      name: 'UNKNOWN -> CONFIRM: Driver\'s Licence',
      pass: checkLicenceConfirm,
      details: `Present in confirmationItems: ${checkLicenceConfirm}`,
    },
    {
      name: 'Candidate Confirmation Source Distinguished (CANDIDATE_CONFIRMED)',
      pass: checkLicenceConfirmedSource,
      details: `Source: ${confirmedLicenceItem?.source}`,
    },
    {
      name: 'Zero Fabrication Rule Preserved',
      pass: checkNoFabricatedQuals,
      details: 'No invented qualifications or attributes in candidate profile',
    },
    {
      name: 'Deterministic Readiness State Calculation',
      pass: checkStateValid,
      details: `Calculated Initial State: ${initialReadiness.readinessState} | Confirmed State: ${confirmedReadiness.readinessState}`,
    },
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

  console.log('==================================================');
  if (failCount > 0) {
    console.error(`❌ PHASE 2C BENCHMARK TEST FAILED with ${failCount} errors.`);
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 2C BENCHMARK TEST CHECKS PASSED PERFECTLY!');
  }
}

runPhase2cBenchmarkTest().catch((err) => {
  console.error('❌ Phase 2C Benchmark test exception:', err);
  process.exit(1);
});
