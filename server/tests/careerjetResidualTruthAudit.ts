import { CareerjetAdapter } from '../adapters/sourceAdapters.ts';
import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';
import { Opportunity } from '../../src/types.ts';

export async function runCareerjetResidualTruthAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1B.1A.2: CAREERJET RESIDUAL TRUTH AUDIT');
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

  const adapter = new CareerjetAdapter();
  const baseContext = {
    apiKey: 'test_cj_key_123',
    userIp: '197.229.1.50',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
  };

  let currentMockResponse: any = { type: 'JOBS', jobs: [] };

  const originalFetch = global.fetch;
  global.fetch = (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    return new Response(JSON.stringify(currentMockResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof global.fetch;

  try {
    // ----------------------------------------------------------------
    // SECTION 18 — CURRENCY TESTS (TEST 1 - TEST 8)
    // ----------------------------------------------------------------

    // TEST 1: salary_currency_code = 'ZAR' -> currency = ZAR
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Job ZAR', url: 'https://jobviewtrack.com/v2/zar', salary_currency_code: 'ZAR', salary_min: 10000 },
      ],
    };
    const opps1 = await adapter.fetchOpportunities(baseContext);
    assert(opps1[0]?.salary?.currency === 'ZAR', 'TEST 1', 'salary_currency_code = ZAR -> currency = ZAR');

    // TEST 2: salary_currency_code = 'USD' -> currency = USD
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Job USD', url: 'https://jobviewtrack.com/v2/usd', salary_currency_code: 'USD', salary_min: 10000 },
      ],
    };
    const opps2 = await adapter.fetchOpportunities(baseContext);
    assert(opps2[0]?.salary?.currency === 'USD', 'TEST 2', 'salary_currency_code = USD -> currency = USD');

    // TEST 3: salary_currency_code = 'GBP' -> currency = GBP
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Job GBP', url: 'https://jobviewtrack.com/v2/gbp', salary_currency_code: 'GBP', salary_min: 10000 },
      ],
    };
    const opps3 = await adapter.fetchOpportunities(baseContext);
    assert(opps3[0]?.salary?.currency === 'GBP', 'TEST 3', 'salary_currency_code = GBP -> currency = GBP');

    // TEST 4: salary_currency_code = 'EUR' -> currency = EUR
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Job EUR', url: 'https://jobviewtrack.com/v2/eur', salary_currency_code: 'EUR', salary_min: 10000 },
      ],
    };
    const opps4 = await adapter.fetchOpportunities(baseContext);
    assert(opps4[0]?.salary?.currency === 'EUR', 'TEST 4', 'salary_currency_code = EUR -> currency = EUR');

    // TEST 5: salary_currency_code missing -> currency undefined
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Job No Currency', url: 'https://jobviewtrack.com/v2/nocurr', salary_min: 10000 },
      ],
    };
    const opps5 = await adapter.fetchOpportunities(baseContext);
    assert(opps5[0]?.salary?.currency === undefined, 'TEST 5', 'salary_currency_code missing -> currency undefined');

    // TEST 6: missing currency does NOT become ZAR
    assert((opps5[0]?.salary?.currency as any) !== 'ZAR', 'TEST 6', 'missing currency code does NOT default to ZAR');

    // TEST 7: South African locale does NOT imply normalized salary currency ZAR
    assert(opps5[0]?.salary?.currency === undefined, 'TEST 7', 'South African locale context does NOT imply normalized currency ZAR');

    // TEST 8: formatted Careerjet salary remains preserved even when normalized currency is undefined
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Formatted Job', url: 'https://jobviewtrack.com/v2/fmt', salary: 'R20 000 - R25 000 per month', salary_min: 20000 },
      ],
    };
    const opps8 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps8[0]?.salary?.formatted === 'R20 000 - R25 000 per month' && opps8[0]?.salary?.currency === undefined,
      'TEST 8',
      'formatted Careerjet salary string preserved when normalized currency is undefined'
    );

    // ----------------------------------------------------------------
    // SECTION 19 — LOCATION TESTS (TEST 9 - TEST 14)
    // ----------------------------------------------------------------

    // TEST 9: locations = 'Johannesburg, Gauteng' -> rawLocationText preserved, city/province parsed
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Multi Loc', url: 'https://jobviewtrack.com/v2/loc1', locations: 'Johannesburg, Gauteng' },
      ],
    };
    const opps9 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps9[0]?.location.rawLocationText === 'Johannesburg, Gauteng' &&
      opps9[0]?.location.city === 'Johannesburg' &&
      opps9[0]?.location.province === 'Gauteng',
      'TEST 9',
      'locations="Johannesburg, Gauteng" -> rawLocationText preserved, city=Johannesburg, province=Gauteng'
    );

    // TEST 10: locations = 'Gauteng' -> rawLocationText = Gauteng, city must NOT become Gauteng
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Single Prov Loc', url: 'https://jobviewtrack.com/v2/loc2', locations: 'Gauteng' },
      ],
    };
    const opps10 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps10[0]?.location.rawLocationText === 'Gauteng' &&
      opps10[0]?.location.city === 'Unknown' &&
      (opps10[0]?.location.city as string) !== 'Gauteng',
      'TEST 10',
      'locations="Gauteng" -> rawLocationText="Gauteng", city is Unknown (not Gauteng)'
    );

    // TEST 11: locations = 'Johannesburg' -> rawLocationText preserved, city/province Unknown for single-part
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Single Token Loc', url: 'https://jobviewtrack.com/v2/loc3', locations: 'Johannesburg' },
      ],
    };
    const opps11 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps11[0]?.location.rawLocationText === 'Johannesburg' &&
      opps11[0]?.location.city === 'Unknown' &&
      opps11[0]?.location.province === 'Unknown',
      'TEST 11',
      'locations="Johannesburg" -> single-part location does not force city/province classification without multi-part evidence'
    );

    // TEST 12: locations missing -> city Unknown, province Unknown, rawLocationText undefined
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'No Loc Job', url: 'https://jobviewtrack.com/v2/loc4', locations: '' },
      ],
    };
    const opps12 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps12[0]?.location.rawLocationText === undefined &&
      opps12[0]?.location.city === 'Unknown' &&
      opps12[0]?.location.province === 'Unknown',
      'TEST 12',
      'locations missing -> rawLocationText undefined, city Unknown, province Unknown'
    );

    // TEST 13: params.city = Johannesburg, Careerjet location missing -> vacancy city does NOT become Johannesburg
    const opps13 = await adapter.fetchOpportunities({ ...baseContext, city: 'Johannesburg' });
    assert(
      opps13[0]?.location.city === 'Unknown' && (opps13[0]?.location.city as string) !== 'Johannesburg',
      'TEST 13',
      'search param city=Johannesburg does NOT populate missing vacancy location city'
    );

    // TEST 14: params.province = Gauteng, Careerjet location missing -> vacancy province does NOT become Gauteng
    const opps14 = await adapter.fetchOpportunities({ ...baseContext, province: 'Gauteng' });
    assert(
      opps14[0]?.location.province === 'Unknown' && (opps14[0]?.location.province as string) !== 'Gauteng',
      'TEST 14',
      'search param province=Gauteng does NOT populate missing vacancy location province'
    );

    // ----------------------------------------------------------------
    // SECTION 20 — COUNTRY / MARKET TESTS (TEST 15 - TEST 19)
    // ----------------------------------------------------------------

    // TEST 15: locale_code=en_ZA alone does NOT create source-reported country = South Africa
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Market Job', url: 'https://jobviewtrack.com/v2/mkt1', locations: 'Johannesburg, Gauteng' },
      ],
    };
    const opps15 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps15[0]?.location.country === 'Unknown',
      'TEST 15',
      'en_ZA search context alone does NOT create source-reported country="South Africa"'
    );

    // TEST 16: South African provider/search market remains identifiable internally
    assert(
      opps15[0]?.sourceProvenance.attributionConfig?.termsUrl?.includes('careerjet.co.za') === true,
      'TEST 16',
      'South African query market remains identifiable internally via provider attribution'
    );

    // TEST 17: Search market metadata does not overwrite vacancy location fields
    assert(
      opps15[0]?.location.country === 'Unknown',
      'TEST 17',
      'Search market metadata does not overwrite vacancy country field'
    );

    // TEST 18: A clearly source-reported South Africa location establishes country = South Africa
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'SA Explicit Job', url: 'https://jobviewtrack.com/v2/mkt2', locations: 'Johannesburg, Gauteng, South Africa' },
      ],
    };
    const opps18 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps18[0]?.location.country === 'South Africa',
      'TEST 18',
      'Explicit source location "Johannesburg, Gauteng, South Africa" establishes country="South Africa"'
    );

    // TEST 19: Unknown source country remains unknown
    currentMockResponse = {
      type: 'JOBS',
      jobs: [
        { title: 'Unknown Country Job', url: 'https://jobviewtrack.com/v2/mkt3', locations: 'Pretoria' },
      ],
    };
    const opps19 = await adapter.fetchOpportunities(baseContext);
    assert(
      opps19[0]?.location.country === 'Unknown',
      'TEST 19',
      'Unknown source country remains "Unknown"'
    );

    // ----------------------------------------------------------------
    // SECTION 21 & 22 — PIPELINE COMPATIBILITY & FIXTURE SAFETY (TEST 20 - TEST 22)
    // ----------------------------------------------------------------

    // TEST 20: Genuine Careerjet LIVE_EXTERNAL opportunity with location.country = 'Unknown' travels through OpportunityPipeline to DestinationVerifier
    let verifierCalled: boolean | null = false;
    const originalVerify = DestinationVerifier.verifyOpportunity;
    DestinationVerifier.verifyOpportunity = (opp: Opportunity) => {
      if (opp.id === opps15[0]?.id) verifierCalled = true;
      return originalVerify.call(DestinationVerifier, opp);
    };

    const pipeline = new OpportunityPipeline();
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'LIVE_EXTERNAL' as const,
      fetchOpportunities: async () => [opps15[0]],
    }];

    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const pipelineResult = await pipeline.fetchAllValidatedOpportunities({});
    process.env.NODE_ENV = originalEnv;
    DestinationVerifier.verifyOpportunity = originalVerify;

    assert(
      Boolean(verifierCalled) && pipelineResult.some(o => o.id === opps15[0]?.id),
      'TEST 20',
      'Genuine Careerjet LIVE_EXTERNAL opp with location.country="Unknown" survived OpportunityPipeline to DestinationVerifier'
    );

    // TEST 21: STATIC_FIXTURE remains excluded from production
    const fixtureOpp: Opportunity = { ...opps15[0], isFixture: true, sourceProvenance: { ...opps15[0].sourceProvenance, isFixture: true, sourceStatus: 'STATIC_FIXTURE' } };
    (pipeline as any).adapters = [{
      sourceId: 'dpsa_gov_za',
      sourceTier: 1 as const,
      getStatus: async () => 'STATIC_FIXTURE' as const,
      fetchOpportunities: async () => [fixtureOpp],
    }];
    process.env.NODE_ENV = 'production';
    const fixtureResult = await pipeline.fetchAllValidatedOpportunities({});
    process.env.NODE_ENV = originalEnv;
    assert(fixtureResult.length === 0, 'TEST 21', 'STATIC_FIXTURE remains excluded from production');

    // TEST 22: PNet remains PARTNERSHIP_REQUIRED and skipped
    (pipeline as any).adapters = [{
      sourceId: 'pnet_sa_partnership',
      sourceTier: 3 as const,
      getStatus: async () => 'PARTNERSHIP_REQUIRED' as const,
      fetchOpportunities: async () => [fixtureOpp],
    }];
    process.env.NODE_ENV = 'production';
    const pnetResult = await pipeline.fetchAllValidatedOpportunities({});
    process.env.NODE_ENV = originalEnv;
    assert(pnetResult.length === 0, 'TEST 22', 'PNet PARTNERSHIP_REQUIRED remains skipped');

  } finally {
    global.fetch = originalFetch;
  }

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCareerjetResidualTruthAudit().then((result) => {
    if (result.failed > 0) {
      process.exit(1);
    }
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
