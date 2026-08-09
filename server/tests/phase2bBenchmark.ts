import { CvIntelligenceService } from '../services/cvIntelligenceService.ts';
import { JobRequirementService } from '../services/jobRequirementService.ts';
import { BENCHMARK_CV_TEXT } from './testBenchmarkCv.ts';

async function runPhase2bBenchmarkTest() {
  console.log('==================================================');
  console.log('=== JOBL PHASE 2B JOB MATCH BENCHMARK TEST ===');
  console.log('==================================================\n');

  // 1. Extract CV profile using Phase 2A.1 CV Intelligence Service
  const cvService = new CvIntelligenceService();
  const cvBase64 = Buffer.from(BENCHMARK_CV_TEXT, 'utf-8').toString('base64');
  console.log('1. Extracting candidate profile for Pride Duduzile Mpofu...');
  const candidateProfile = await cvService.extractCvContent(cvBase64, 'text/plain', 'PRIDE_MPOFU_CV.txt');
  console.log(`   Candidate: ${candidateProfile.firstName} ${candidateProfile.surname} (${candidateProfile.email})`);

  // 2. Define the controlled Benchmark Test Job Fixture
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

  // 3. Extract structured requirements for job
  const jobReqService = new JobRequirementService();
  console.log('2. Extracting structured job requirements from benchmark job fixture...');
  const jobReqs = await jobReqService.extractJobRequirements(benchmarkJobFixture);
  console.log(`   Extracted ${jobReqs.allRequirements.length} discrete requirements across ${jobReqs.experienceRequirements.length + jobReqs.skillRequirements.length + jobReqs.educationRequirements.length} categories.`);

  // 4. Compare Candidate CV to Job Requirements
  console.log('3. Running deterministic candidate/job comparison engine...');
  const matchAnalysis = jobReqService.compareCandidateToJob(candidateProfile, jobReqs);

  console.log(`\n==================================================`);
  console.log(`OVERALL MATCH STATUS: [${matchAnalysis.overallStatus}]`);
  console.log(`==================================================\n`);

  console.log('EVIDENCE BREAKDOWN:');
  console.log(`- Matched Requirements: ${matchAnalysis.matchedRequirements.length}`);
  matchAnalysis.matchedRequirements.forEach((m) => {
    console.log(`  ✓ [MATCH] ${m.requirement}`);
    console.log(`    Evidence: "${m.candidateEvidence}"`);
  });

  console.log(`\n- Partial Matches: ${matchAnalysis.partialMatches.length}`);
  matchAnalysis.partialMatches.forEach((p) => {
    console.log(`  △ [PARTIAL_MATCH] ${p.requirement}`);
    console.log(`    Evidence/Explanation: "${p.candidateEvidence || p.explanation}"`);
  });

  console.log(`\n- Missing Evidence: ${matchAnalysis.missingEvidence.length}`);
  matchAnalysis.missingEvidence.forEach((m) => {
    console.log(`  ✕ [MISSING] ${m.requirement}`);
  });

  console.log(`\n- Unknown / Unconfirmed Requirements: ${matchAnalysis.unknownRequirements.length}`);
  matchAnalysis.unknownRequirements.forEach((u) => {
    console.log(`  ? [UNKNOWN] ${u.requirement}`);
    console.log(`    Explanation: ${u.explanation}`);
  });

  // 5. Verification Checks
  console.log('\n==================================================');
  console.log('VERIFYING BENCHMARK EXPECTATIONS (SECTION 15 SPEC):');

  const allEval = [
    ...matchAnalysis.matchedRequirements,
    ...matchAnalysis.partialMatches,
    ...matchAnalysis.missingEvidence,
    ...matchAnalysis.unknownRequirements,
  ];

  const findStatus = (keyword: string) => {
    const item = allEval.find((x) => x.requirement.toLowerCase().includes(keyword.toLowerCase()));
    return item ? item.status : 'NOT_FOUND';
  };

  const msStatus = findStatus('microsoft office');
  const commStatus = findStatus('written and verbal communication');
  const csStatus = findStatus('customer service');
  const teamStatus = findStatus('team');
  const adminAbilityStatus = findStatus('administrative ability');
  const detailStatus = findStatus('attention to detail');
  const licenceItem = allEval.find((x) => x.category === 'LICENCE' || x.requirement.toLowerCase().includes('driver'));

  const checks: { name: string; pass: boolean; details: string }[] = [
    {
      name: 'Microsoft Office Proficiency -> MATCH',
      pass: msStatus === 'MATCH',
      details: `Status: ${msStatus}`,
    },
    {
      name: 'Written and Verbal Communication -> MATCH',
      pass: commStatus === 'MATCH',
      details: `Status: ${commStatus}`,
    },
    {
      name: 'Customer Service Experience -> MATCH',
      pass: csStatus === 'MATCH',
      details: `Status: ${csStatus}`,
    },
    {
      name: 'Ability to work in a team -> MATCH',
      pass: teamStatus === 'MATCH',
      details: `Status: ${teamStatus}`,
    },
    {
      name: 'Administrative Ability -> PARTIAL_MATCH or MATCH',
      pass: adminAbilityStatus === 'PARTIAL_MATCH' || adminAbilityStatus === 'MATCH',
      details: `Status: ${adminAbilityStatus}`,
    },
    {
      name: 'Attention to Detail -> PARTIAL_MATCH or MATCH or UNKNOWN',
      pass: ['PARTIAL_MATCH', 'MATCH', 'UNKNOWN'].includes(detailStatus),
      details: `Status: ${detailStatus}`,
    },
    {
      name: "Valid Driver's Licence -> UNKNOWN (Zero-Fabrication Rule: Must NOT infer possession or absence)",
      pass: licenceItem ? licenceItem.status === 'UNKNOWN' : false,
      details: `Status: ${licenceItem?.status} | Evidence: ${licenceItem?.candidateEvidence || 'null'}`,
    },
    {
      name: 'Overall Match Status is Deterministic & Valid',
      pass: ['STRONG_MATCH', 'POTENTIAL_MATCH', 'PARTIAL_MATCH'].includes(matchAnalysis.overallStatus),
      details: `Calculated Status: ${matchAnalysis.overallStatus}`,
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
    console.error(`❌ PHASE 2B BENCHMARK TEST FAILED with ${failCount} errors.`);
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 2B BENCHMARK TEST CHECKS PASSED PERFECTLY!');
  }
}

runPhase2bBenchmarkTest().catch((err) => {
  console.error('❌ Benchmark test exception:', err);
  process.exit(1);
});
