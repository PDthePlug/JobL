import { parseDpsaText, DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';
import { OpportunityPipeline } from '../services/opportunityPipeline.ts';

async function runSyntheticTests() {
  console.log('\n==================================================');
  console.log('1. RUNNING 15 SYNTHETIC INTEGRITY & BOUNDARY TESTS');
  console.log('==================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${description}`);
      failed++;
    }
  }

  // Test 1: Normal well-formed vacancy
  const text1 = `
DEPARTMENT OF AGRICULTURE
CLOSING DATE : 15 March 2026
POST 28/01 : CHIEF FINANCIAL OFFICER
REF NO : AGRI/2026/01
SALARY : R1 250 000 - R1 450 000 per annum
CENTRE : Pretoria
REQUIREMENTS : BCom Degree in Accounting. 10 years management experience.
DUTIES : Manage financial services and budget control.
ENQUIRIES : Mr J Smith Tel: 012 345 6789
APPLICATIONS : Pretoria Head Office or via https://agri.gov.za/careers
`;
  const res1 = parseDpsaText(text1, 'http://test.com/a.pdf', { num: 28, year: 2026 });
  assert(res1.opportunities.length === 1, 'Test 1: Single well-formed vacancy parsed');
  assert(res1.opportunities[0].title === 'CHIEF FINANCIAL OFFICER', 'Test 1: Title match');
  assert(res1.opportunities[0].employer === 'DEPARTMENT OF AGRICULTURE', 'Test 1: Department match');
  assert(res1.opportunities[0].sourceProvenance.originalListingId === 'AGRI/2026/01', 'Test 1: Ref No match');
  assert(res1.opportunities[0].salary?.minAmount === 1250000, 'Test 1: Salary min match');
  assert(res1.opportunities[0].salary?.maxAmount === 1450000, 'Test 1: Salary max match');
  assert(res1.opportunities[0].location.city === 'Pretoria', 'Test 1: City match');

  // Test 2: Missing REF NO -> no borrowing, originalListingId uses post number
  const text2 = `
DEPARTMENT OF HEALTH
POST 28/02 : DENTAL ASSISTANT
SALARY : R200 000 per annum
CENTRE : Durban
REQUIREMENTS : Grade 12.
DUTIES : Assist dentist.
`;
  const res2 = parseDpsaText(text2, 'http://test.com/b.pdf', { num: 28, year: 2026 });
  assert(res2.opportunities.length === 1, 'Test 2: Missing REF NO vacancy parsed');
  assert(res2.opportunities[0].sourceProvenance.originalListingId === '28/02', 'Test 2: Listing ID falls back to post number');
  assert(!res2.opportunities[0].fullDescription.includes('Ref No: AGRI'), 'Test 2: No ref no borrowed from previous test');

  // Test 3: Missing SALARY -> salary undefined, no borrowing
  const text3 = `
DEPARTMENT OF WATER
POST 28/03 : HYDROLOGIST
REF NO : WATER/99
CENTRE : Cape Town
REQUIREMENTS : BSc Hydrology.
DUTIES : Measure water levels.
`;
  const res3 = parseDpsaText(text3, 'http://test.com/c.pdf', { num: 28, year: 2026 });
  assert(res3.opportunities.length === 1, 'Test 3: Missing SALARY vacancy parsed');
  assert(res3.opportunities[0].salary === undefined, 'Test 3: Salary is undefined');

  // Test 4: Missing CENTRE -> location city 'Unknown', no borrowing
  const text4 = `
DEPARTMENT OF TRANSPORT
POST 28/04 : ROAD INSPECTOR
REF NO : DOT/44
SALARY : R300 000 per annum
REQUIREMENTS : Driver license.
DUTIES : Inspect roads.
`;
  const res4 = parseDpsaText(text4, 'http://test.com/d.pdf', { num: 28, year: 2026 });
  assert(res4.opportunities.length === 1, 'Test 4: Missing CENTRE vacancy parsed');
  assert(res4.opportunities[0].location.city === 'Unknown', 'Test 4: City is Unknown');

  // Test 5: Multi-department PDF annexure -> Department context resets mid-PDF
  const text5 = `
DEPARTMENT OF BASIC EDUCATION
POST 28/05 : EDUCATION SPECIALIST
REF NO : DBE/01
SALARY : R400 000 per annum
CENTRE : Pretoria

GAUTENG DEPARTMENT OF ROADS AND TRANSPORT
POST 28/06 : TRANSPORT PLANNER
REF NO : GDRT/02
SALARY : R500 000 per annum
CENTRE : Johannesburg
`;
  const res5 = parseDpsaText(text5, 'http://test.com/e.pdf', { num: 28, year: 2026 });
  assert(res5.opportunities.length === 2, 'Test 5: Multi-department vacancies parsed');
  assert(res5.opportunities[0].employer === 'DEPARTMENT OF BASIC EDUCATION', 'Test 5: Post 1 department match');
  assert(res5.opportunities[1].employer === 'GAUTENG DEPARTMENT OF ROADS AND TRANSPORT', 'Test 5: Post 2 department match (reset verified)');

  // Test 6: Wrapped multi-line title -> title preserved without truncation
  const text6 = `
DEPARTMENT OF FINANCE
POST 28/07 : ASSISTANT DIRECTOR:
ASSET MANAGEMENT
REF NO : FIN/77
SALARY : R450 000 per annum
CENTRE : Polokwane
`;
  const res6 = parseDpsaText(text6, 'http://test.com/f.pdf', { num: 28, year: 2026 });
  assert(res6.opportunities.length === 1, 'Test 6: Wrapped title vacancy parsed');
  assert(res6.opportunities[0].title === 'ASSISTANT DIRECTOR: ASSET MANAGEMENT', 'Test 6: Wrapped title normalized correctly');

  // Test 7: Advert boundary isolation (Post 1 salary doesn't bleed into Post 2)
  const text7 = `
DEPARTMENT OF JUSTICE
POST 28/08 : LEGAL ADMINISTRATION OFFICER
REF NO : DOJ/08
SALARY : R600 000 per annum
CENTRE : Bloemfontein

POST 28/09 : COURT CLERK
REF NO : DOJ/09
CENTRE : Bloemfontein
`;
  const res7 = parseDpsaText(text7, 'http://test.com/g.pdf', { num: 28, year: 2026 });
  assert(res7.opportunities.length === 2, 'Test 7: Boundary isolation parsed');
  assert(res7.opportunities[0].salary?.minAmount === 600000, 'Test 7: Post 1 has salary');
  assert(res7.opportunities[1].salary === undefined, 'Test 7: Post 2 salary undefined (no bleed from Post 1)');

  // Test 8: Requirements vs Duties boundary separation
  const text8 = `
DEPARTMENT OF DEFENCE
POST 28/10 : LOGISTICS OFFICER
REF NO : DOD/10
SALARY : R350 000 per annum
REQUIREMENTS : Senior Certificate. Valid driver license.
DUTIES : Manage supply store. Issue equipment.
ENQUIRIES : Capt Molefe 012 000 0000
`;
  const res8 = parseDpsaText(text8, 'http://test.com/h.pdf', { num: 28, year: 2026 });
  assert(res8.opportunities.length === 1, 'Test 8: Requirements/Duties boundary parsed');
  assert(res8.opportunities[0].requirements.length >= 1, 'Test 8: Requirements extracted');
  assert(!res8.opportunities[0].requirements.some(r => r.includes('DUTIES')), 'Test 8: Requirements do not bleed into DUTIES header');
  assert(!res8.opportunities[0].responsibilities.some(d => d.includes('ENQUIRIES')), 'Test 8: Duties do not bleed into ENQUIRIES header');

  // Test 9: Corrupted / Malformed title containing section keyword -> REJECTED
  const text9 = `
DEPARTMENT OF LABOUR
POST 28/11 : REQUIREMENTS: Grade 12 and 5 years experience
REF NO : DOL/11
SALARY : R200 000 per annum
`;
  const res9 = parseDpsaText(text9, 'http://test.com/i.pdf', { num: 28, year: 2026 });
  assert(res9.opportunities.length === 0, 'Test 9: Corrupted section-header title rejected');
  assert(res9.metrics.rejectedCount === 1, 'Test 9: Rejected count incremented');

  // Test 10: Malformed title length < 3 -> REJECTED
  const text10 = `
DEPARTMENT OF ARTS
POST 28/12 : X
REF NO : DAC/12
SALARY : R100 000 per annum
`;
  const res10 = parseDpsaText(text10, 'http://test.com/j.pdf', { num: 28, year: 2026 });
  assert(res10.opportunities.length === 0, 'Test 10: Short title < 3 chars rejected');
  assert(res10.metrics.rejectedCount === 1, 'Test 10: Rejected count incremented');

  // Test 11: Circular closing date vs Post-specific closing date override
  const text11 = `
DEPARTMENT OF TOURISM
CLOSING DATE : 20 March 2026
POST 28/13 : TOURISM OFFICER
REF NO : TOUR/13
SALARY : R300 000 per annum
CLOSING DATE : 30 March 2026
`;
  const res11 = parseDpsaText(text11, 'http://test.com/k.pdf', { num: 28, year: 2026 });
  assert(res11.opportunities.length === 1, 'Test 11: Post closing date override parsed');
  assert(res11.opportunities[0].closingDate === '30 March 2026', 'Test 11: Post closing date takes priority over circular date');

  // Test 12: Application URL extraction from APPLICATIONS block
  const text12 = `
DEPARTMENT OF TRADE
POST 28/14 : ECONOMIST
REF NO : DTI/14
SALARY : R700 000 per annum
APPLICATIONS : Submit online at https://dti.gov.za/apply
`;
  const res12 = parseDpsaText(text12, 'http://test.com/l.pdf', { num: 28, year: 2026 });
  assert(res12.opportunities.length === 1, 'Test 12: Application URL parsed');
  assert(res12.opportunities[0].sourceProvenance.applicationDestination === 'https://dti.gov.za/apply', 'Test 12: App destination extracted');

  // Test 13: Duplicate detection key matching
  const text13 = `
DEPARTMENT OF ENERGY
POST 28/15 : ENERGY ANALYST
REF NO : DOE/15
SALARY : R500 000 per annum

POST 28/16 : ENERGY ANALYST
REF NO : DOE/15
SALARY : R500 000 per annum
`;
  const res13 = parseDpsaText(text13, 'http://test.com/m.pdf', { num: 28, year: 2026 });
  assert(res13.opportunities.length === 2, 'Test 13: Parsed 2 records');
  assert(res13.metrics.duplicateCount === 1, 'Test 13: Duplicate detected and counted');

  // Test 14: Empty PDF text -> 0 opportunities returned safely
  const res14 = parseDpsaText('', 'http://test.com/n.pdf', { num: 28, year: 2026 });
  assert(res14.opportunities.length === 0, 'Test 14: Empty text returns 0 opportunities');
  assert(res14.rawBlocksDetected === 0, 'Test 14: 0 raw blocks detected');

  // Test 15: Monthly salary period parsing
  const text15 = `
DEPARTMENT OF HUMAN SETTLEMENTS
POST 28/17 : COMMUNITY LIAISON
REF NO : DHS/17
SALARY : R15 000 per month
CENTRE : Nelspruit
`;
  const res15 = parseDpsaText(text15, 'http://test.com/o.pdf', { num: 28, year: 2026 });
  assert(res15.opportunities.length === 1, 'Test 15: Monthly salary parsed');
  assert(res15.opportunities[0].salary?.period === 'Monthly', 'Test 15: Salary period is Monthly');
  assert(res15.opportunities[0].location.city === 'Mbombela', 'Test 15: Nelspruit mapped to Mbombela');

  console.log(`\nSynthetic Tests Completed: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
    throw new Error(`${failed} synthetic test(s) failed`);
  }
}

async function runLiveAuditAndRegressions() {
  console.log('\n==================================================');
  console.log('2. RUNNING LIVE DPSA ACQUISITION & PIPELINE AUDIT');
  console.log('==================================================');

  const adapter = new DpsaPublicVacanciesAdapter();
  const startTime = Date.now();
  const liveOpps = await adapter.fetchOpportunities();
  const durationMs = Date.now() - startTime;

  console.log(`Fetched ${liveOpps.length} live opportunities in ${durationMs}ms`);

  // Pipeline integration check
  const pipeline = new OpportunityPipeline();
  const pipelineResults = await pipeline.fetchAllValidatedOpportunities({ limit: 50 });
  const pipelineOpps = pipelineResults;

  console.log(`Pipeline returned ${pipelineOpps.length} opportunities`);

  // Print audit samples table
  console.log('\n==================================================');
  console.log('3. 10 REAL LIVE DPSA VACANCY AUDIT SAMPLES');
  console.log('==================================================');

  const samples = liveOpps.slice(0, 10);
  samples.forEach((o, idx) => {
    console.log(`\nSAMPLE #${idx + 1}:`);
    console.log(`  Title       : ${o.title}`);
    console.log(`  Employer    : ${o.employer}`);
    console.log(`  Ref No      : ${o.sourceProvenance.originalListingId}`);
    console.log(`  City / Prov : ${o.location.city}, ${o.location.province} (${o.location.rawLocationText || 'N/A'})`);
    console.log(`  Salary      : ${o.salary?.formatted || 'Not specified'}`);
    console.log(`  Closing Date: ${o.closingDate || 'Not specified'}`);
    console.log(`  Reqs Count  : ${o.requirements.length}`);
    console.log(`  Duties Count: ${o.responsibilities.length}`);
    console.log(`  PDF URL     : ${o.sourceProvenance.originalUrl}`);
  });
}

async function main() {
  try {
    await runSyntheticTests();
    await runLiveAuditAndRegressions();
    console.log('\n==================================================');
    console.log('PHASE T1B.2A AUDIT EXECUTION COMPLETE');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\nAudit execution failed with error:', err);
    process.exit(1);
  }
}

main();
