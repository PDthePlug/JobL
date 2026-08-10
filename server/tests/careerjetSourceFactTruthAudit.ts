import { CareerjetAdapter, AdzunaAdapter, JoobleAdapter, PNetAdapter, DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';

export async function runCareerjetSourceFactTruthAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1B.1A: CAREERJET SOURCE-FACT TRUTH AUDIT');
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

  process.env.CAREERJET_API_KEY = 'test_cj_key_truth';
  const adapter = new CareerjetAdapter();
  const baseContext = {
    userIp: '197.229.1.50',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
  };

  // Mock server responses based on contract
  let currentMockResponse: any = {};

  globalThis.fetch = (async (): Promise<Response> => {
    return {
      ok: true,
      status: 200,
      json: async () => currentMockResponse,
    } as Response;
  }) as typeof fetch;

  // 1. Mandatory Normalization Tests (1 - 16)
  currentMockResponse = {
    type: 'JOBS',
    jobs: [
      {
        title: ' Python Developer ',
        company: 'NBC',
        date: 'Wed, 15 Nov 2025 19:13:43 GMT',
        description: 'Job description excerpt text',
        locations: 'Johannesburg, Gauteng',
        salary: '$30000 - 33000',
        salary_currency_code: 'USD',
        salary_min: 30000,
        salary_max: 33000,
        salary_type: 'Y',
        url: 'https://jobviewtrack.com/v2/unique_link_1',
      },
      {
        title: 'Office Manager',
        company: '', // Missing company
        date: '',
        description: 'Managing office operations.',
        locations: '', // Missing location
        url: 'https://jobviewtrack.com/v2/unique_link_2',
      }
    ]
  };

  const opps1 = await adapter.fetchOpportunities({
    ...baseContext,
    city: 'Cape Town',
    province: 'Western Cape',
    category: 'Administration',
    experience: 'Entry level',
  });

  // TEST 1: Careerjet title is preserved exactly
  assert(opps1[0]?.title === 'Python Developer', 'TEST 1', 'Title preserved exactly and trimmed.');

  // TEST 2: Careerjet company is preserved exactly
  assert(opps1[0]?.employer === 'NBC', 'TEST 2', 'Company preserved exactly.');

  // TEST 3: Missing company does not become "Verified Company" or "Verified Employer"
  assert(opps1[1]?.employer === 'Unspecified Employer', 'TEST 3', 'Missing company becomes Unspecified Employer, never "Verified Employer".');

  // TEST 4: Description treated as excerpt (fullDescription is undefined)
  assert(opps1[0]?.summary === 'Job description excerpt text' && opps1[0]?.fullDescription === undefined, 'TEST 4', 'Description treated as excerpt; fullDescription is undefined.');

  // TEST 5: Careerjet locations preserved
  assert(opps1[0]?.location.rawLocationText === 'Johannesburg, Gauteng', 'TEST 5', 'Careerjet locations preserved.');

  // TEST 6: Search city does NOT become vacancy city when Careerjet location missing
  assert(opps1[1]?.location.city === 'Unknown' && (opps1[1]?.location.city as string) !== 'Cape Town', 'TEST 6', 'Search city Cape Town NOT copied to missing vacancy location.');

  // TEST 7: Search province does NOT become vacancy province
  assert(opps1[1]?.location.province === 'Unknown' && (opps1[1]?.location.province as string) !== 'Western Cape', 'TEST 7', 'Search province Western Cape NOT copied to missing vacancy location.');

  // TEST 8: Search category does NOT become vacancy category
  assert(opps1[0]?.jobCategory === 'Unclassified' && (opps1[0]?.jobCategory as string) !== 'Administration', 'TEST 8', 'Search category Administration NOT copied to vacancy jobCategory.');

  // TEST 9: Search experience does NOT become vacancy experienceLevel
  assert(opps1[0]?.experienceLevel === 'Unknown' && (opps1[0]?.experienceLevel as string) !== 'Entry level', 'TEST 9', 'Search experience NOT copied to vacancy experienceLevel.');

  // TEST 10: Missing employment type does NOT become Full-time
  assert(opps1[0]?.employmentType === 'Unknown' && (opps1[0]?.employmentType as string) !== 'Full-time', 'TEST 10', 'Missing employment type becomes Unknown, not Full-time.');

  // TEST 11: Missing experience level does NOT become Entry level
  assert(opps1[0]?.experienceLevel === 'Unknown' && (opps1[0]?.experienceLevel as string) !== 'Entry level', 'TEST 11', 'Missing experience level becomes Unknown, not Entry level.');

  // TEST 12: Missing category becomes Unclassified
  assert(opps1[0]?.jobCategory === 'Unclassified', 'TEST 12', 'Missing category becomes Unclassified.');

  // TEST 13: No qualification is fabricated
  assert(opps1[0]?.qualificationRequirement === 'NOT_SPECIFIED', 'TEST 13', 'qualificationRequirement set to NOT_SPECIFIED without fabrication.');

  // TEST 14: No requirements are fabricated
  assert(opps1[0]?.requirements.length === 0, 'TEST 14', 'requirements is empty array [].');

  // TEST 15: No responsibilities are fabricated
  assert(opps1[0]?.responsibilities.length === 0, 'TEST 15', 'responsibilities is empty array [].');

  // TEST 16: No skills are fabricated
  assert(opps1[0]?.skillsRequired.length === 0, 'TEST 16', 'skillsRequired is empty array [].');

  // 2. Date Tests (17 - 22)
  currentMockResponse = {
    type: 'JOBS',
    jobs: [
      {
        title: 'Role With Standard Date',
        url: 'https://jobviewtrack.com/v2/link_date_1',
        date: 'Wed, 15 Nov 2025 19:13:43 GMT',
      },
      {
        title: 'Role With Invalid Date',
        url: 'https://jobviewtrack.com/v2/link_date_2',
        date: 'INVALID_DATE_STRING_123',
      },
      {
        title: 'Role With Missing Date',
        url: 'https://jobviewtrack.com/v2/link_date_3',
      }
    ]
  };

  const oppsDates = await adapter.fetchOpportunities(baseContext);

  // TEST 17: Standards-capable date parsing
  assert(oppsDates[0]?.postedAt === '2025-11-15', 'TEST 17', 'Wed, 15 Nov 2025 parsed to ISO date 2025-11-15.');

  // TEST 18: Valid Careerjet date preserved
  assert(oppsDates[0]?.sourceProvenance.publicationDate === '2025-11-15', 'TEST 18', 'publicationDate set to 2025-11-15.');

  // TEST 19: Invalid date -> publicationDate undefined
  assert(oppsDates[1]?.postedAt === undefined && oppsDates[1]?.sourceProvenance.publicationDate === undefined, 'TEST 19', 'Invalid date yields undefined publicationDate.');

  // TEST 20: Missing date -> publicationDate undefined
  assert(oppsDates[2]?.postedAt === undefined && oppsDates[2]?.sourceProvenance.publicationDate === undefined, 'TEST 20', 'Missing date yields undefined publicationDate.');

  // TEST 21: Missing/invalid date does not create freshness NEW
  assert(oppsDates[1]?.sourceProvenance.freshnessStatus === 'UNKNOWN', 'TEST 21', 'Invalid/missing date results in freshnessStatus UNKNOWN.');

  // TEST 22: Processing timestamp is separate from publicationDate
  assert(oppsDates[1]?.sourceProvenance.lastVerifiedDate !== undefined && oppsDates[1]?.sourceProvenance.publicationDate === undefined, 'TEST 22', 'lastVerifiedDate exists while publicationDate is undefined.');

  // 3. Salary Type Tests (23 - 29)
  const salaryTypesMock = ['Y', 'M', 'W', 'D', 'H', 'UNKNOWN_TYPE', ''];
  const salaryTypeJobs = salaryTypesMock.map((st, i) => ({
    title: `Salary Job ${i}`,
    url: `https://jobviewtrack.com/v2/sal_${i}`,
    salary_min: 100,
    salary_type: st,
  }));
  currentMockResponse = { type: 'JOBS', jobs: salaryTypeJobs };
  const oppsSalTypes = await adapter.fetchOpportunities(baseContext);

  assert(oppsSalTypes[0]?.salary?.period === 'Annual', 'TEST 23', 'salary_type Y -> Annual');
  assert(oppsSalTypes[1]?.salary?.period === 'Monthly', 'TEST 24', 'salary_type M -> Monthly');
  assert(oppsSalTypes[2]?.salary?.period === 'Weekly', 'TEST 25', 'salary_type W -> Weekly');
  assert(oppsSalTypes[3]?.salary?.period === 'Daily', 'TEST 26', 'salary_type D -> Daily');
  assert(oppsSalTypes[4]?.salary?.period === 'Hourly', 'TEST 27', 'salary_type H -> Hourly');
  assert(oppsSalTypes[5]?.salary?.period === 'Unknown', 'TEST 28', 'Unknown salary_type -> Unknown period');
  assert(oppsSalTypes[6]?.salary?.period === 'Unknown', 'TEST 29', 'Missing salary_type -> Unknown period');

  // 4. Currency Tests (30 - 35)
  const currenciesMock = ['ZAR', 'USD', 'GBP', 'EUR', ''];
  const currencyJobs = currenciesMock.map((curr, i) => ({
    title: `Currency Job ${i}`,
    url: `https://jobviewtrack.com/v2/curr_${i}`,
    salary_min: 500,
    salary_currency_code: curr,
  }));
  currentMockResponse = { type: 'JOBS', jobs: currencyJobs };
  const oppsCurr = await adapter.fetchOpportunities(baseContext);

  assert(oppsCurr[0]?.salary?.currency === 'ZAR', 'TEST 30', 'ZAR remains ZAR');
  assert(oppsCurr[1]?.salary?.currency === 'USD', 'TEST 31', 'USD remains USD');
  assert(oppsCurr[2]?.salary?.currency === 'GBP', 'TEST 32', 'GBP remains GBP');
  assert(oppsCurr[3]?.salary?.currency === 'EUR', 'TEST 33', 'EUR remains EUR');
  assert(oppsCurr[1]?.salary?.currency === 'USD', 'TEST 34', 'No FX conversion occurred');
  assert(oppsCurr[4]?.salary?.currency === undefined, 'TEST 35', 'Missing currency code yields undefined currency without default ZAR assumption');

  // 5. Salary Value Tests (36 - 41)
  currentMockResponse = {
    type: 'JOBS',
    jobs: [
      {
        title: 'Formatted Salary Job',
        url: 'https://jobviewtrack.com/v2/salval_1',
        salary: 'R20 000 - R25 000 per month',
        salary_min: 20000,
        salary_max: 25000,
      },
      {
        title: 'Min Only Salary Job',
        url: 'https://jobviewtrack.com/v2/salval_2',
        salary_min: 15000,
      },
      {
        title: 'No Salary Job',
        url: 'https://jobviewtrack.com/v2/salval_3',
      }
    ]
  };
  const oppsSalVal = await adapter.fetchOpportunities(baseContext);

  assert(oppsSalVal[0]?.salary?.formatted === 'R20 000 - R25 000 per month', 'TEST 36', 'Careerjet salary display string preserved');
  assert(oppsSalVal[0]?.salary?.minAmount === 20000, 'TEST 37', 'salary_min preserved');
  assert(oppsSalVal[0]?.salary?.maxAmount === 25000, 'TEST 38', 'salary_max preserved');
  assert(oppsSalVal[1]?.salary?.minAmount === 15000 && oppsSalVal[1]?.salary?.maxAmount === undefined, 'TEST 39', 'Missing salary_max is NOT estimated');
  assert(oppsSalVal[1]?.salary?.maxAmount === undefined, 'TEST 40', 'Missing salary_min/max not artificially calculated');
  assert(oppsSalVal[2]?.salary === undefined, 'TEST 41', 'No salary data -> salary undefined');

  // 6. URL / Destination Tests (42 - 45)
  currentMockResponse = {
    type: 'JOBS',
    jobs: [
      {
        title: 'URL Test Job',
        url: 'https://jobviewtrack.com/v2/exact_tracking_url_123.html',
      }
    ]
  };
  const oppsUrl = await adapter.fetchOpportunities(baseContext);

  assert(oppsUrl[0]?.sourceProvenance.sourceListingUrl === 'https://jobviewtrack.com/v2/exact_tracking_url_123.html', 'TEST 42', 'Careerjet URL preserved exactly');
  assert(!oppsUrl[0]?.sourceProvenance.applicationDestination.endsWith('/apply'), 'TEST 43', 'No /apply URL manufactured');
  assert(!oppsUrl[0]?.sourceProvenance.applicationDestination.includes('/details/'), 'TEST 44', 'No /details/{id} URL manufactured');
  assert(oppsUrl[0]?.sourceProvenance.destinationStatus === 'LISTING_ONLY', 'TEST 45', 'Destination status remains LISTING_ONLY');

  // 7. Remote / Region Tests (46 - 49)
  assert(oppsUrl[0]?.location.remoteStatus === 'UNKNOWN', 'TEST 46', 'Missing remote evidence does NOT become ON_SITE');
  assert(oppsUrl[0]?.location.remoteStatus === 'UNKNOWN', 'TEST 47', 'Missing remote evidence becomes UNKNOWN');
  assert(oppsUrl[0]?.location.regionType === 'UNKNOWN', 'TEST 48', 'Missing region evidence does NOT become NATIONAL');
  assert(oppsUrl[0]?.location.regionType === 'UNKNOWN', 'TEST 49', 'Missing region evidence becomes UNKNOWN');

  // 8. Source Provenance & Regression Tests (50 - 57)
  assert(oppsUrl[0]?.sourceProvenance.sourceStatus === 'LIVE_EXTERNAL', 'TEST 50', 'Careerjet remains LIVE_EXTERNAL');
  assert(oppsUrl[0]?.sourceProvenance.isFixture === false, 'TEST 51', 'Careerjet item remains isFixture=false');
  assert(oppsUrl[0]?.sourceProvenance.isLive === true, 'TEST 52', 'Careerjet item remains isLive=true');
  assert(oppsUrl[0]?.sourceProvenance.attributionConfig?.text === 'Powered by Careerjet', 'TEST 53', 'Attribution text remains intact');

  const pnet = new PNetAdapter();
  assert((await pnet.getStatus()) === 'PARTNERSHIP_REQUIRED', 'TEST 54', 'PNet remains PARTNERSHIP_REQUIRED');

  const dpsa = new DpsaPublicVacanciesAdapter();
  assert((await dpsa.getStatus()) === 'STATIC_FIXTURE', 'TEST 55', 'Tier-1 static data remains STATIC_FIXTURE');

  const adzuna = new AdzunaAdapter();
  assert((await adzuna.getStatus()) === 'LIVE_EXTERNAL', 'TEST 56', 'Adzuna behavior is not modified');

  const jooble = new JoobleAdapter();
  assert((await jooble.getStatus()) === 'LIVE_EXTERNAL', 'TEST 57', 'Jooble behavior is not modified');

  // Restore global fetch and env
  globalThis.fetch = originalFetch;
  if (originalApiKey) process.env.CAREERJET_API_KEY = originalApiKey;
  else delete process.env.CAREERJET_API_KEY;

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCareerjetSourceFactTruthAudit().then(result => {
    if (result.failed > 0) {
      process.exit(1);
    }
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
