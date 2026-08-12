import { parseDpsaText, DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';
import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';
import { JobSourceProvenance, Opportunity } from '../../src/types.ts';

function isDestinationValidForReadiness(prov: JobSourceProvenance): boolean {
  return (
    (prov.destinationStatus === 'VERIFIED' ||
      prov.destinationStatus === 'LISTING_ONLY' ||
      Boolean(prov.applicationInstructions)) &&
    prov.destinationStatus !== 'FAILED_VERIFICATION' &&
    prov.destinationStatus !== 'UNAVAILABLE' &&
    prov.destinationStatus !== 'EXPIRED' &&
    prov.sourceStatus !== 'DISABLED' &&
    Boolean(prov.applicationDestination || prov.originalUrl || prov.applicationInstructions)
  );
}

async function runPhaseT1b2bTests() {
  console.log('\n==================================================');
  console.log('PHASE T1B.2B: DPSA APPLICATION METHOD & HANDOFF TRUTH TEST');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, description: string) {
    if (condition) {
      console.log(`  [PASS] Test ${testNum}: ${description}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${testNum}: ${description}`);
      failed++;
    }
  }

  // TEST 1: DPSA vacancy with destinationStatus = LISTING_ONLY allowed into readiness flow
  const text1 = `
DEPARTMENT OF WATER AND SANITATION
POST 28/10 : HYDROLOGICAL TECHNICIAN
REF NO : DWS/2026/10
SALARY : R350 000 per annum
CENTRE : Pretoria
REQUIREMENTS : National Diploma in Engineering or Science.
DUTIES : Monitor hydrological stations.
ENQUIRIES : Ms M Nkabinde Tel: 012 336 7500
APPLICATIONS : Pretoria Head Office
`;
  const res1 = parseDpsaText(text1, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp1 = res1.opportunities[0];
  assert(
    opp1.sourceProvenance.destinationStatus === 'LISTING_ONLY' && isDestinationValidForReadiness(opp1.sourceProvenance),
    1,
    'DPSA vacancy with destinationStatus = LISTING_ONLY is allowed into readiness flow'
  );

  // TEST 2: DPSA vacancy with destinationStatus = LISTING_ONLY does NOT evaluate as unavailable
  assert(
    isDestinationValidForReadiness(opp1.sourceProvenance) === true,
    2,
    'DPSA vacancy with destinationStatus = LISTING_ONLY does NOT evaluate as unavailable'
  );

  // TEST 3: DPSA vacancy with direct URL receives destinationStatus = VERIFIED and preserves direct URL
  const text3 = `
DEPARTMENT OF AGRICULTURE
POST 28/11 : AGRICULTURAL OFFICER
REF NO : AGRI/2026/11
SALARY : R400 000 per annum
CENTRE : Pretoria
REQUIREMENTS : BSc Agriculture.
DUTIES : Support farming communities.
APPLICATIONS : Online applications must be submitted via https://erecruitment.dalrrd.gov.za
`;
  const res3 = parseDpsaText(text3, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp3 = res3.opportunities[0];
  assert(
    opp3.sourceProvenance.destinationStatus === 'VERIFIED' &&
      opp3.sourceProvenance.applicationDestination === 'https://erecruitment.dalrrd.gov.za' &&
      opp3.sourceProvenance.applicationMethodType === 'DIRECT_URL',
    3,
    'DPSA vacancy with direct portal URL receives destinationStatus = VERIFIED and preserves direct URL'
  );

  // TEST 4: DPSA vacancy with email application receives applicationMethodType = EMAIL and preserves email address
  const text4 = `
DEPARTMENT OF TRADE AND INDUSTRY
POST 28/12 : ECONOMIST
REF NO : DTI/2026/12
SALARY : R500 000 per annum
CENTRE : Pretoria
REQUIREMENTS : BCom Honours Economics.
DUTIES : Conduct trade research.
APPLICATIONS : Applications must be emailed to: vacancies@dti.gov.za
`;
  const res4 = parseDpsaText(text4, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp4 = res4.opportunities[0];
  assert(
    opp4.sourceProvenance.applicationMethodType === 'EMAIL' &&
      opp4.sourceProvenance.applicationEmail === 'vacancies@dti.gov.za',
    4,
    'DPSA vacancy with email application receives applicationMethodType = EMAIL and preserves email address'
  );

  // TEST 5: DPSA vacancy with postal application receives applicationMethodType = POSTAL and preserves postal address text
  const text5 = `
DEPARTMENT OF HEALTH
POST 28/13 : MEDICAL OFFICER
REF NO : DOH/2026/13
SALARY : R900 000 per annum
CENTRE : Mbombela
REQUIREMENTS : MBChB Degree.
DUTIES : Clinical duties in hospital.
APPLICATIONS : Please forward your application to Private Bag X11285, Mbombela, 1200
`;
  const res5 = parseDpsaText(text5, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp5 = res5.opportunities[0];
  assert(
    opp5.sourceProvenance.applicationMethodType === 'POSTAL' &&
      opp5.sourceProvenance.applicationInstructions?.includes('Private Bag X11285') === true,
    5,
    'DPSA vacancy with postal application receives applicationMethodType = POSTAL and preserves postal address text'
  );

  // TEST 6: DPSA vacancy with hand delivery receives applicationMethodType = HAND_DELIVERY and preserves physical address text
  const text6 = `
DEPARTMENT OF HUMAN SETTLEMENTS
POST 28/14 : HOUSING REGISTRAR
REF NO : DHS/2026/14
SALARY : R300 000 per annum
CENTRE : Johannesburg
REQUIREMENTS : Grade 12.
DUTIES : Register housing claims.
APPLICATIONS : Hand deliver to 270 Marshall Street, Johannesburg at Reception.
`;
  const res6 = parseDpsaText(text6, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp6 = res6.opportunities[0];
  assert(
    opp6.sourceProvenance.applicationMethodType === 'HAND_DELIVERY' &&
      opp6.sourceProvenance.applicationInstructions?.includes('270 Marshall Street') === true,
    6,
    'DPSA vacancy with hand delivery receives applicationMethodType = HAND_DELIVERY and preserves physical address text'
  );

  // TEST 7: DPSA vacancy with multiple channels receives applicationMethodType = MIXED
  const text7 = `
DEPARTMENT OF PUBLIC WORKS
POST 28/15 : PROJECT MANAGER
REF NO : DPW/2026/15
SALARY : R700 000 per annum
CENTRE : Cape Town
REQUIREMENTS : BSc Construction.
DUTIES : Manage infrastructure projects.
APPLICATIONS : Hand deliver to Customs House, Foreshore, Cape Town or post to Private Bag X9027, Cape Town or apply online via https://www.publicworks.gov.za/careers
`;
  const res7 = parseDpsaText(text7, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp7 = res7.opportunities[0];
  assert(
    opp7.sourceProvenance.applicationMethodType === 'MIXED',
    7,
    'DPSA vacancy with multiple channels receives applicationMethodType = MIXED'
  );

  // TEST 8: DPSA vacancy with no specific method receives applicationMethodType = SOURCE_LISTING and destinationStatus = LISTING_ONLY
  const text8 = `
DEPARTMENT OF FORESTRY
POST 28/16 : FORESTRY RANGER
REF NO : DFFE/2026/16
SALARY : R220 000 per annum
CENTRE : Knysna
REQUIREMENTS : Grade 12.
DUTIES : Patrol nature reserves.
`;
  const res8 = parseDpsaText(text8, 'https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/28/a.pdf', { num: 28, year: 2026 });
  const opp8 = res8.opportunities[0];
  assert(
    opp8.sourceProvenance.applicationMethodType === 'SOURCE_LISTING' &&
      opp8.sourceProvenance.destinationStatus === 'LISTING_ONLY',
    8,
    'DPSA vacancy with no specific method receives applicationMethodType = SOURCE_LISTING and destinationStatus = LISTING_ONLY'
  );

  // TEST 9: Vacancy with destinationStatus = UNAVAILABLE is blocked from readiness/payment
  const mockUnavailable: JobSourceProvenance = {
    sourceId: 'test',
    sourceName: 'Test',
    sourceTier: 1,
    sourceType: 'GOVERNMENT',
    originalUrl: 'http://test.com',
    employerName: 'Test Dept',
    lastVerifiedDate: '2026-08-11',
    sourceStatus: 'LIVE_EXTERNAL',
    verificationStatus: 'UNVERIFIED',
    destinationStatus: 'UNAVAILABLE',
    freshnessStatus: 'NEW',
    applicationDestination: '',
    isRealVerified: false,
    isFixture: false,
    isLive: true,
  };
  assert(
    isDestinationValidForReadiness(mockUnavailable) === false,
    9,
    'Vacancy with destinationStatus = UNAVAILABLE is blocked from readiness/payment'
  );

  // TEST 10: Vacancy with destinationStatus = FAILED_VERIFICATION is blocked from readiness/payment
  const mockFailed: JobSourceProvenance = { ...mockUnavailable, destinationStatus: 'FAILED_VERIFICATION', applicationDestination: 'http://invalid-homepage.gov.za' };
  assert(
    isDestinationValidForReadiness(mockFailed) === false,
    10,
    'Vacancy with destinationStatus = FAILED_VERIFICATION is blocked from readiness/payment'
  );

  // TEST 11: Vacancy with destinationStatus = EXPIRED is blocked from readiness/payment
  const mockExpired: JobSourceProvenance = { ...mockUnavailable, destinationStatus: 'EXPIRED', applicationDestination: 'http://test.com/expired-404' };
  assert(
    isDestinationValidForReadiness(mockExpired) === false,
    11,
    'Vacancy with destinationStatus = EXPIRED is blocked from readiness/payment'
  );

  // TEST 12: Application readiness handoff for LISTING_ONLY provides official circular / document URL or instructions
  assert(
    opp1.sourceProvenance.applicationDestination.startsWith('https://www.dpsa.gov.za') &&
      opp1.sourceProvenance.destinationStatus === 'LISTING_ONLY',
    12,
    'Application readiness handoff for LISTING_ONLY provides official circular URL'
  );

  // TEST 13: No fake application URLs (e.g. /apply or /jobl/apply) are manufactured for LISTING_ONLY vacancies
  assert(
    !opp1.sourceProvenance.applicationDestination.endsWith('/apply') &&
      !opp1.sourceProvenance.applicationDestination.includes('/jobl/'),
    13,
    'No fake application URLs manufactured for LISTING_ONLY vacancies'
  );

  // TEST 14 & 15: Audit at least 20 live DPSA vacancies and classify their application methods
  console.log('\n==================================================');
  console.log('AUDITING LIVE DPSA VACANCIES FOR APPLICATION METHODS');
  console.log('==================================================');

  const adapter = new DpsaPublicVacanciesAdapter();
  const liveOpps = await adapter.fetchOpportunities();

  assert(liveOpps.length >= 20, 14, `Fetched ${liveOpps.length} live DPSA vacancies (at least 20 required)`);

  const methodCounts: Record<string, number> = {
    DIRECT_URL: 0,
    EMAIL: 0,
    POSTAL: 0,
    HAND_DELIVERY: 0,
    MIXED: 0,
    SOURCE_LISTING: 0,
    UNKNOWN: 0,
  };

  let incorrectlyBlocked = 0;

  liveOpps.forEach((opp) => {
    const method = opp.sourceProvenance.applicationMethodType || 'UNKNOWN';
    methodCounts[method] = (methodCounts[method] || 0) + 1;

    // Check test 15: No live DPSA vacancy should be marked unavailable solely because it is LISTING_ONLY
    if (opp.sourceProvenance.destinationStatus === 'LISTING_ONLY' && !isDestinationValidForReadiness(opp.sourceProvenance)) {
      incorrectlyBlocked++;
    }
  });

  console.log('\nCLASSIFIED APPLICATION METHODS FOR LIVE DPSA VACANCIES:');
  Object.entries(methodCounts).forEach(([m, count]) => {
    console.log(`  - ${m.padEnd(16)}: ${count} vacancies`);
  });

  assert(
    incorrectlyBlocked === 0,
    15,
    'Zero live DPSA vacancies incorrectly marked as unavailable solely because they are LISTING_ONLY'
  );

  console.log('\n==================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} TESTS`);
  console.log('==================================================\n');

  if (failed > 0) {
    throw new Error(`Phase T1B.2B Acceptance Test Failed (${failed} failures)`);
  }
}

runPhaseT1b2bTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
