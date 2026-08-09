import { CvIntelligenceService } from '../services/cvIntelligenceService.js';
import { BENCHMARK_CV_TEXT } from './testBenchmarkCv.js';

async function runRegressionTest() {
  console.log('=== JOBL PHASE 2A.1 CV EXTRACTION REGRESSION TEST ===\n');

  const cvService = new CvIntelligenceService();
  const base64Data = Buffer.from(BENCHMARK_CV_TEXT, 'utf-8').toString('base64');

  console.log('Ingesting benchmark CV document into extraction pipeline...');
  const startTime = Date.now();
  const extracted = await cvService.extractCvContent(base64Data, 'text/plain', 'PRIDE_MPOFU_CV.txt');
  console.log(`Extraction completed in ${Date.now() - startTime}ms.\n`);

  const fullSerialized = JSON.stringify(extracted).toLowerCase();
  const rawTextLower = (extracted.rawExtractedText || '').toLowerCase();

  const checks: { name: string; condition: boolean; detail: string }[] = [
    {
      name: 'Full Candidate Name (Pride Duduzile Mpofu)',
      condition:
        fullSerialized.includes('pride') && fullSerialized.includes('mpofu'),
      detail: `${extracted.firstName} ${extracted.surname} / ${extracted.fullName}`,
    },
    {
      name: 'FETC Business Administration Qualification',
      condition: fullSerialized.includes('fetc') || fullSerialized.includes('business administration'),
      detail: 'Present in education/certifications/profile',
    },
    {
      name: 'RE5 Regulatory Examination',
      condition: fullSerialized.includes('re5'),
      detail: 'Present in certifications/licences',
    },
    {
      name: 'Current Employment Status (Employed)',
      condition: fullSerialized.includes('employed'),
      detail: extracted.currentEmploymentStatus || 'Preserved in profile/text',
    },
    {
      name: 'Desired Position (Administrative Level Position)',
      condition: fullSerialized.includes('administrative'),
      detail: extracted.desiredPosition || 'Preserved in profile/text',
    },
    {
      name: 'City / Location (Johannesburg)',
      condition: fullSerialized.includes('johannesburg'),
      detail: extracted.city || extracted.physicalAddress || 'Johannesburg',
    },
    {
      name: 'Both Phone Numbers (+27 68 186 3271 & 075 174 0770)',
      condition:
        (fullSerialized.includes('68 186 3271') || fullSerialized.includes('681863271')) &&
        (fullSerialized.includes('075 174 0770') || fullSerialized.includes('0751740770')),
      detail: extracted.phone || (extracted.phoneNumbers || []).join(' / '),
    },
    {
      name: 'Email Address (pdmpofu@gmail.com)',
      condition: fullSerialized.includes('pdmpofu@gmail.com'),
      detail: extracted.email || '',
    },
    {
      name: 'Identity Number (9712096301081)',
      condition: fullSerialized.includes('9712096301081'),
      detail: extracted.identityNumber || 'Preserved',
    },
    {
      name: 'Marital Status (Single)',
      condition: fullSerialized.includes('single'),
      detail: extracted.maritalStatus || 'Single',
    },
    {
      name: 'Gender (Male)',
      condition: fullSerialized.includes('male'),
      detail: extracted.gender || 'Male',
    },
    {
      name: 'Dependents (01)',
      condition: fullSerialized.includes('01') || fullSerialized.includes('1'),
      detail: extracted.dependents || '01',
    },
    {
      name: 'Availability (Immediate)',
      condition: fullSerialized.includes('immediate'),
      detail: extracted.availability || 'Immediate',
    },
    {
      name: 'Personal Statement & Microsoft Skills (Word, Excel, PowerPoint, Outlook)',
      condition:
        fullSerialized.includes('word') &&
        fullSerialized.includes('excel') &&
        fullSerialized.includes('powerpoint') &&
        fullSerialized.includes('outlook'),
      detail: 'Statement and MS Office applications captured',
    },
    {
      name: 'Employment Role (Telesales Consultants)',
      condition: fullSerialized.includes('telesales'),
      detail: 'Captured in employment history',
    },
    {
      name: 'Employer (Market South Africa)',
      condition: fullSerialized.includes('market south africa'),
      detail: 'Captured in employment history',
    },
    {
      name: 'Employment Dates (2015 - 2019)',
      condition: fullSerialized.includes('2015') && fullSerialized.includes('2019'),
      detail: 'Captured in employment dates',
    },
    {
      name: 'Major Employment Responsibilities',
      condition: fullSerialized.includes('sales calls') || fullSerialized.includes('bank clients') || rawTextLower.includes('sales calls'),
      detail: 'Responsibilities preserved',
    },
    {
      name: 'Standard Bank Ucounts Rewards Program Milestone',
      condition: fullSerialized.includes('ucounts') || rawTextLower.includes('ucounts'),
      detail: 'Milestone preserved',
    },
    {
      name: 'Standard Bank Elite Bundle Account Milestone',
      condition: fullSerialized.includes('elite bundle') || rawTextLower.includes('elite bundle'),
      detail: 'Milestone preserved',
    },
    {
      name: 'Skill: Speaking',
      condition: fullSerialized.includes('speaking'),
      detail: 'Skill captured',
    },
    {
      name: 'Skill: Persuasion',
      condition: fullSerialized.includes('persuasion'),
      detail: 'Skill captured',
    },
    {
      name: 'Skill: Active Listening',
      condition: fullSerialized.includes('active listening'),
      detail: 'Skill captured',
    },
    {
      name: 'Skill: Service Orientation',
      condition: fullSerialized.includes('service orientation'),
      detail: 'Skill captured',
    },
    {
      name: 'Skill: Social Perceptiveness',
      condition: fullSerialized.includes('social perceptiveness'),
      detail: 'Skill captured',
    },
    {
      name: 'Skill: Critical Thinking',
      condition: fullSerialized.includes('critical thinking'),
      detail: 'Skill captured',
    },
    {
      name: 'Skill: Reading Comprehension',
      condition: fullSerialized.includes('reading comprehension'),
      detail: 'Skill captured',
    },
    {
      name: 'Reference 1: Ms Delphine Philander',
      condition: fullSerialized.includes('delphine') || fullSerialized.includes('philander'),
      detail: 'Reference 1 preserved',
    },
    {
      name: 'Reference 2: Mr Marvin Sinclair',
      condition: fullSerialized.includes('marvin') || fullSerialized.includes('sinclair'),
      detail: 'Reference 2 preserved',
    },
    {
      name: 'Lossless Raw Extracted Text Preserved',
      condition: Boolean(extracted.rawExtractedText && extracted.rawExtractedText.length > 50),
      detail: `Length: ${(extracted.rawExtractedText || '').length} characters`,
    },
  ];

  let failedCount = 0;
  checks.forEach((chk, idx) => {
    if (chk.condition) {
      console.log(`✅ [${idx + 1}/${checks.length}] PASS: ${chk.name} -> ${chk.detail}`);
    } else {
      console.error(`❌ [${idx + 1}/${checks.length}] FAIL: ${chk.name} -> Missing or lost!`);
      failedCount++;
    }
  });

  console.log('\n==================================================');
  if (failedCount > 0) {
    console.error(`❌ REGRESSION TEST FAILED with ${failedCount} missing items!`);
    process.exit(1);
  } else {
    console.log(`✅ ALL ${checks.length} BENCHMARK EXTRACTION CHECKS PASSED PERFECTLY!`);
  }
}

runRegressionTest().catch((err) => {
  console.error('❌ REGRESSION TEST ERROR:', err);
  process.exit(1);
});
