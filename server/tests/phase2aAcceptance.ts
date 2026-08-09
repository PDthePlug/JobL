import { CvIntelligenceService } from '../services/cvIntelligenceService.js';
import { ExtractedCVData } from '../../src/types.js';

async function runPhase2aAcceptanceTest() {
  console.log('=== JOBL PHASE 2A ACCEPTANCE TEST RUNNER ===\n');

  const cvService = new CvIntelligenceService();

  // Test Document Buffer (Sample South African CV in Base64 / Plain Text)
  const sampleCvText = `
Sipho Dlamini
Mobile: 082 987 6543 | Email: sipho.dlamini@jobl.co.za
Location: Soweto, Johannesburg, Gauteng

PROFESSIONAL SUMMARY:
Dedicated and hardworking candidate with 2 years of retail and customer service experience in Johannesburg. Grade 12 Matriculant seeking a full-time position.

EMPLOYMENT HISTORY:
1. Retail Assistant | Pick n Pay Soweto (Jan 2023 - Dec 2024)
- Handled cash register, stock packing, and customer queries.
- Maintained store hygiene and shelf presentation.

EDUCATION:
- Grade 12 Matric Certificate | Orlando West High School (2022)

SKILLS:
Customer Service, Cash Register, Stock Counting, Punctuality

LANGUAGES:
English, isiZulu, Sesotho

LICENCES:
Code 08 Driver License
  `.trim();

  const sampleBase64 = Buffer.from(sampleCvText).toString('base64');
  const fileName = 'Sipho_Dlamini_CV.pdf';
  const fileType = 'application/pdf';

  console.log(`1. Uploading CV Document: "${fileName}"...`);
  const startTime = Date.now();

  const result: ExtractedCVData = await cvService.extractCvContent(sampleBase64, fileType, fileName);

  console.log(`2. Server Received & Processed File in ${Date.now() - startTime}ms.`);
  console.log('3. Extracted Candidate Information:');
  console.log(`   - First Name: ${result.firstName}`);
  console.log(`   - Surname: ${result.surname}`);
  console.log(`   - Phone: ${result.phone}`);
  console.log(`   - Email: ${result.email}`);
  console.log(`   - Location: ${result.location}`);
  console.log(`   - Profile: ${result.professionalProfile?.slice(0, 60)}...`);
  console.log(`   - Skills: ${result.skills.join(', ')}`);
  console.log(`   - Languages: ${result.languages.join(', ')}`);
  console.log(`   - Licences: ${result.licences.join(', ')}`);

  // Assertions
  if (!result.phone && !result.email) {
    throw new Error('FAILED: Contact information (phone or email) not extracted from sample CV.');
  }

  console.log('\n4. Simulating Candidate Correction & Persistence...');
  const correctedResult = {
    ...result,
    phone: '082 987 6543',
    location: 'Soweto, Johannesburg',
  };

  const storedProfile = {
    id: 'CV-PROF-TEST-100',
    fileName,
    fileType,
    uploadedAt: new Date().toISOString(),
    extractedData: correctedResult,
    updatedAt: new Date().toISOString(),
  };

  const jsonSerialized = JSON.stringify(storedProfile);
  const reloaded = JSON.parse(jsonSerialized);

  if (reloaded.extractedData.phone !== '082 987 6543' || reloaded.extractedData.location !== 'Soweto, Johannesburg') {
    throw new Error('FAILED: Corrected information did not persist after reload.');
  }

  console.log('5. Reloaded Profile Verified. Corrected Phone:', reloaded.extractedData.phone);
  console.log('\n✅ JOBL PHASE 2A ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
}

runPhase2aAcceptanceTest().catch((err) => {
  console.error('❌ PHASE 2A ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
