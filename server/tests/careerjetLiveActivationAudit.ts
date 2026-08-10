import { CareerjetAdapter, AdzunaAdapter, JoobleAdapter, PNetAdapter, DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';

export async function runCareerjetLiveActivationAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1B.1: CAREERJET LIVE ACTIVATION AUDIT');
  log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    if (condition) {
      log(`[PASS] ${testName}: ${detail}`);
      passed++;
    } else {
      log(`[FAIL] ${testName}: ${detail}`);
      failed++;
    }
  }

  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.CAREERJET_API_KEY;
  const originalAffId = process.env.CAREERJET_AFFILIATE_ID;

  // Setup test environment credentials
  process.env.CAREERJET_API_KEY = 'test_cj_key_123';
  delete process.env.CAREERJET_AFFILIATE_ID;

  let lastUrl = '';
  let lastHeaders: Record<string, string> = {};

  const mockJobsResponse = {
    type: 'JOBS',
    hits: 2,
    pages: 1,
    jobs: [
      {
        title: 'Junior Admin Clerk',
        company: 'Apex Logistics',
        date: 'Mon, 10 Aug 2026 08:00:00 GMT',
        description: 'Perform filing and basic clerical duties in office.',
        locations: 'Johannesburg, Gauteng',
        salary: 'R15 000 per month',
        salary_currency_code: 'ZAR',
        salary_min: 15000,
        salary_max: 15000,
        salary_type: 'month',
        site: 'careerjet.co.za',
        url: 'https://www.careerjet.co.za/job/spec_12345.html',
      },
      {
        title: 'Call Centre Agent',
        company: '', // Missing company
        date: '',
        description: 'Handle customer inquiries.',
        locations: 'Durban, KwaZulu-Natal',
        // Missing salary
        site: 'careerjet.co.za',
        url: 'https://www.careerjet.co.za/job/spec_67890.html',
      },
    ],
  };

  // Setup mock fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    lastUrl = typeof input === 'string' ? input : input.toString();
    lastHeaders = (init?.headers as Record<string, string>) || {};

    return {
      ok: true,
      status: 200,
      json: async () => mockJobsResponse,
    } as Response;
  }) as typeof fetch;

  const adapter = new CareerjetAdapter();
  const testParams = {
    keywords: 'Administration',
    city: 'Johannesburg',
    province: 'Gauteng',
    page: 2,
    limit: 15,
    userIp: '197.229.1.50',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
  };

  const opportunities = await adapter.fetchOpportunities(testParams);
  const parsedUrl = new URL(lastUrl);

  // TEST 1: Real HTTP request attempted
  assert(lastUrl.length > 0, 'TEST 1', 'Careerjet adapter performs an HTTP request when required parameters exist.');

  // TEST 2: Correct API endpoint
  assert(parsedUrl.origin + parsedUrl.pathname === 'https://search.api.careerjet.net/v4/query', 'TEST 2', `Correct endpoint used: ${parsedUrl.origin + parsedUrl.pathname}`);

  // TEST 3: Basic Auth header format
  const expectedAuth = `Basic ${Buffer.from('test_cj_key_123:').toString('base64')}`;
  assert(lastHeaders['Authorization'] === expectedAuth, 'TEST 3', `Basic Auth header constructed correctly (${lastHeaders['Authorization']})`);

  // TEST 4: locale_code=en_ZA
  assert(parsedUrl.searchParams.get('locale_code') === 'en_ZA', 'TEST 4', 'locale_code=en_ZA is sent in query params.');

  // TEST 5: keywords mapping
  assert(parsedUrl.searchParams.get('keywords') === 'Administration', 'TEST 5', `keywords parameter correctly mapped (${parsedUrl.searchParams.get('keywords')})`);

  // TEST 6: location mapping
  assert(parsedUrl.searchParams.get('location') === 'Johannesburg, Gauteng', 'TEST 6', `location parameter correctly mapped (${parsedUrl.searchParams.get('location')})`);

  // TEST 7: page parameter
  assert(parsedUrl.searchParams.get('page') === '2', 'TEST 7', `page parameter respected (${parsedUrl.searchParams.get('page')})`);

  // TEST 8: page_size / limit parameter
  assert(parsedUrl.searchParams.get('page_size') === '15', 'TEST 8', `page_size parameter respected (${parsedUrl.searchParams.get('page_size')})`);

  // TEST 9: user_ip passed
  assert(parsedUrl.searchParams.get('user_ip') === '197.229.1.50', 'TEST 9', `user_ip passed (${parsedUrl.searchParams.get('user_ip')})`);

  // TEST 10: user_agent passed
  assert(parsedUrl.searchParams.get('user_agent') === 'Mozilla/5.0 (X11; Linux x86_64)', 'TEST 10', `user_agent passed (${parsedUrl.searchParams.get('user_agent')})`);

  // TEST 11: Response normalized into Opportunity objects
  assert(opportunities.length === 2, 'TEST 11', `Careerjet JOBS response normalized into ${opportunities.length} Opportunity objects.`);

  // TEST 12: Careerjet returned URL preserved exactly
  assert(opportunities[0]?.sourceProvenance.sourceListingUrl === 'https://www.careerjet.co.za/job/spec_12345.html', 'TEST 12', 'Careerjet returned URL preserved exactly.');

  // TEST 13: No fabricated application URL created
  assert(opportunities[0]?.sourceProvenance.applicationDestination === 'https://www.careerjet.co.za/job/spec_12345.html', 'TEST 13', 'No fake application destination created; uses exact source URL.');

  // TEST 14: No fabricated qualification
  assert(opportunities[0]?.qualificationRequirement === 'NOT_SPECIFIED', 'TEST 14', 'qualificationRequirement set to NOT_SPECIFIED without fabrication.');

  // TEST 15: No fabricated requirements
  assert(Array.isArray(opportunities[0]?.requirements) && opportunities[0].requirements.length === 0, 'TEST 15', 'requirements is empty array []; zero fabrication.');

  // TEST 16: No fabricated responsibilities
  assert(Array.isArray(opportunities[0]?.responsibilities) && opportunities[0].responsibilities.length === 0, 'TEST 16', 'responsibilities is empty array []; zero fabrication.');

  // TEST 17: No fabricated skills
  assert(Array.isArray(opportunities[0]?.skillsRequired) && opportunities[0].skillsRequired.length === 0, 'TEST 17', 'skillsRequired is empty array []; zero fabrication.');

  // TEST 18: No fabricated salary when source salary is absent
  assert(opportunities[1]?.salary === undefined, 'TEST 18', 'Salary is undefined when not supplied by source.');

  // TEST 19: No fabricated closing date
  assert(opportunities[0]?.closingDate === undefined, 'TEST 19', 'closingDate is undefined when not supplied by source.');

  // TEST 20: Missing credential returns []
  delete process.env.CAREERJET_API_KEY;
  delete process.env.CAREERJET_AFFILIATE_ID;
  const noKeyResult = await adapter.fetchOpportunities(testParams);
  assert(noKeyResult.length === 0, 'TEST 20', 'Missing API key credential returns [].');
  process.env.CAREERJET_API_KEY = 'test_cj_key_123';

  // TEST 21: Missing user request context returns []
  const noContextResult = await adapter.fetchOpportunities({ keywords: 'Admin' }); // missing userIp / userAgent
  assert(noContextResult.length === 0, 'TEST 21', 'Missing user request context (userIp/userAgent) returns [].');

  // TEST 22: API failure returns [] with no fallback opportunity
  globalThis.fetch = (async (): Promise<Response> => {
    return {
      ok: false,
      status: 500,
    } as Response;
  }) as typeof fetch;

  const failResult = await adapter.fetchOpportunities(testParams);
  assert(failResult.length === 0, 'TEST 22', 'API 500 failure returns [] with zero fallback opportunities.');

  // Restore fetch
  globalThis.fetch = originalFetch;

  // TEST 23: PNet remains PARTNERSHIP_REQUIRED
  const pnet = new PNetAdapter();
  assert((await pnet.getStatus()) === 'PARTNERSHIP_REQUIRED', 'TEST 23', 'PNet status remains PARTNERSHIP_REQUIRED.');

  // TEST 24: Tier-1 fixtures remain STATIC_FIXTURE
  const dpsa = new DpsaPublicVacanciesAdapter();
  assert((await dpsa.getStatus()) === 'STATIC_FIXTURE', 'TEST 24', 'DPSA status remains STATIC_FIXTURE.');

  // TEST 25: Adzuna remains unchanged
  const adzuna = new AdzunaAdapter();
  assert((await adzuna.getStatus()) === 'LIVE_EXTERNAL', 'TEST 25', 'Adzuna status remains LIVE_EXTERNAL.');

  // TEST 26: Jooble remains unchanged
  const jooble = new JoobleAdapter();
  assert((await jooble.getStatus()) === 'LIVE_EXTERNAL', 'TEST 26', 'Jooble status remains LIVE_EXTERNAL.');

  // -------------------------------------------------------------
  // LIVE ACCEPTANCE TEST
  // -------------------------------------------------------------
  log('\n--- LIVE ACCEPTANCE TEST ---');
  if (originalApiKey || originalAffId) {
    process.env.CAREERJET_API_KEY = originalApiKey || originalAffId;
    try {
      const liveOpps = await adapter.fetchOpportunities({
        keywords: 'Administration',
        city: 'Johannesburg',
        userIp: '197.229.1.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      if (liveOpps.length > 0) {
        log(`Live Careerjet Call Succeeded! Returned ${liveOpps.length} jobs.`);
        liveOpps.slice(0, 3).forEach((job, index) => {
          log(`  [${index + 1}] Title: ${job.title} | Employer: ${job.employer} | Location: ${job.location.city} | URL: ${job.sourceProvenance.sourceListingUrl}`);
        });
      } else {
        log('LIVE CAREERJET REQUEST EXECUTED (Returned 0 items or auth error).');
      }
    } catch (err: any) {
      log(`LIVE CAREERJET REQUEST FAILED: ${err.message}`);
    }
  } else {
    log('LIVE CAREERJET REQUEST NOT EXECUTED (No CAREERJET_API_KEY present in environment).');
  }

  // Restore env
  if (originalApiKey) process.env.CAREERJET_API_KEY = originalApiKey;
  else delete process.env.CAREERJET_API_KEY;

  if (originalAffId) process.env.CAREERJET_AFFILIATE_ID = originalAffId;
  else delete process.env.CAREERJET_AFFILIATE_ID;

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCareerjetLiveActivationAudit().then(result => {
    if (result.failed > 0) {
      process.exit(1);
    }
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
