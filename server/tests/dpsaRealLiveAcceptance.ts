import { DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { OpportunityPipeline } from '../services/opportunityPipeline.ts';

export async function runDpsaRealLiveAcceptanceTest(): Promise<{
  passed: number;
  failed: number;
  results: { testName: string; success: boolean; details: string }[];
}> {
  const results: { testName: string; success: boolean; details: string }[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details: string) {
    if (condition) {
      passed++;
      results.push({ testName, success: true, details: `[PASS] ${details}` });
      console.log(`[PASS] ${testName}: ${details}`);
    } else {
      failed++;
      results.push({ testName, success: false, details: `[FAIL] ${details}` });
      console.error(`[FAIL] ${testName}: ${details}`);
    }
  }

  console.log('==================================================');
  console.log('JOBL — PHASE T1B.2 — DPSA GENUINE SOURCE ACCEPTANCE');
  console.log('==================================================\n');

  const registry = SourceRegistry.getInstance();
  const adapter = new DpsaPublicVacanciesAdapter();

  // 1. Adapter Status Check
  const status = await adapter.getStatus();
  assert(
    status === 'LIVE_EXTERNAL',
    'TEST 1: DpsaPublicVacanciesAdapter Status',
    `DPSA Adapter status is ${status} (expected LIVE_EXTERNAL)`
  );

  // 2. Fetch Live Opportunities
  console.log('Fetching live DPSA opportunities from official government circulars...');
  const startTime = Date.now();
  let items: any[] = [];
  try {
    items = await adapter.fetchOpportunities();
    const duration = Date.now() - startTime;
    assert(
      items.length > 0,
      'TEST 2: Genuine DPSA Acquisition',
      `Acquired ${items.length} live government vacancies in ${duration}ms`
    );
  } catch (err: any) {
    assert(
      false,
      'TEST 2: Genuine DPSA Acquisition',
      `Failed to acquire live DPSA opportunities: ${err.message}`
    );
  }

  if (items.length > 0) {
    const first = items[0];

    // 3. Provenance Verification
    assert(
      first.sourceProvenance.sourceId === 'dpsa_gov_za' &&
        first.sourceProvenance.sourceTier === 1 &&
        first.sourceProvenance.sourceType === 'GOVERNMENT' &&
        first.sourceProvenance.sourceStatus === 'LIVE_EXTERNAL' &&
        first.isFixture === false &&
        first.isLive === true,
      'TEST 3: Source Provenance Honesty',
      `Provenance verified: sourceId=${first.sourceProvenance.sourceId}, tier=${first.sourceProvenance.sourceTier}, type=${first.sourceProvenance.sourceType}, status=${first.sourceProvenance.sourceStatus}, isFixture=${first.isFixture}, isLive=${first.isLive}`
    );

    // 4. Source Facts Integrity (Title & Department)
    assert(
      Boolean(first.title) && Boolean(first.employer) && first.employer.toLowerCase().includes('department'),
      'TEST 4: Official Department & Title',
      `Title: "${first.title}", Employer: "${first.employer}"`
    );

    // 5. Requirements & Duties Preservation
    const hasReqs = Array.isArray(first.requirements) && first.requirements.length > 0;
    const hasDuties = Array.isArray(first.responsibilities) && first.responsibilities.length > 0;
    assert(
      hasReqs && hasDuties,
      'TEST 5: Source Duties & Requirements Preservation',
      `Extracted ${first.requirements?.length || 0} requirement items and ${first.responsibilities?.length || 0} duty items directly from source text`
    );

    // 6. Salary & Currency Accuracy
    if (first.salary) {
      assert(
        first.salary.currency === 'ZAR' && Boolean(first.salary.formatted),
        'TEST 6: Salary Fact Integrity',
        `Salary formatted: "${first.salary.formatted}", currency: ${first.salary.currency}`
      );
    } else {
      assert(
        true,
        'TEST 6: Salary Fact Integrity',
        `No salary specified in source text for listing ${first.id} — preserved as undefined (no fabrication)`
      );
    }

    // 7. Location Accuracy
    assert(
      Boolean(first.location.country === 'South Africa') &&
        Boolean(first.location.city) &&
        Boolean(first.location.province),
      'TEST 7: Location Facts',
      `City: ${first.location.city}, Province: ${first.location.province}, Raw: "${first.location.rawLocationText}"`
    );
  }

  // 8. Pipeline Integration Check (Production Mode)
  console.log('\nTesting full OpportunityPipeline production path...');
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const pipeline = new OpportunityPipeline();
    const pipelineOpps = await pipeline.fetchAllValidatedOpportunities({ includeFixtures: false });
    const dpsaOpps = pipelineOpps.filter(o => o.sourceProvenance.sourceId === 'dpsa_gov_za');

    assert(
      dpsaOpps.length > 0,
      'TEST 8: Production Pipeline Integration',
      `OpportunityPipeline returned ${pipelineOpps.length} total opportunities, including ${dpsaOpps.length} genuine DPSA vacancies.`
    );
  } catch (err: any) {
    assert(
      false,
      'TEST 8: Production Pipeline Integration',
      `Pipeline integration error: ${err.message}`
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  // 9. Registry Request Recording Check
  const regEntry = registry.getEntry('dpsa_gov_za');
  assert(
    Boolean(regEntry) && regEntry!.requestsCount > 0 && regEntry!.successfulRequestsCount > 0,
    'TEST 9: Source Registry Metrics',
    `Registry entry dpsa_gov_za metrics: requests=${regEntry?.requestsCount}, success=${regEntry?.successfulRequestsCount}, returned=${regEntry?.opportunitiesReturnedCount}`
  );

  console.log(`\nFinal result: Passed=${passed}, Failed=${failed}`);
  return { passed, failed, results };
}

// Auto-run if invoked directly
if (import.meta.url.endsWith('dpsaRealLiveAcceptance.ts') || process.argv[1]?.includes('dpsaRealLiveAcceptance')) {
  runDpsaRealLiveAcceptanceTest().then(({ passed, failed }) => {
    if (failed > 0) {
      console.error(`\nPHASE T1B.2 — BLOCKED (${failed} test failures)`);
      process.exit(1);
    } else {
      console.log(`\nPHASE T1B.2 — PASS (${passed} tests passed)`);
      process.exit(0);
    }
  });
}
