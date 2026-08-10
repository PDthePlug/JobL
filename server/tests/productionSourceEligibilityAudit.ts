import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { AdzunaAdapter, JoobleAdapter } from '../adapters/sourceAdapters.ts';

export async function runProductionSourceEligibilityAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1A.1: PRODUCTION ELIGIBILITY AUDIT');
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

  // 1. Force Production Environment for this test suite
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const registry = SourceRegistry.getInstance();
  const pipeline = new OpportunityPipeline();

  // Let's reset request counts to 0 manually for clean tests
  registry.getAllEntries().forEach(entry => {
    entry.requestsCount = 0;
    entry.successfulRequestsCount = 0;
    entry.failedRequestsCount = 0;
  });

  // Execute a production discovery run (no includeFixtures passed)
  const opps = await pipeline.fetchAllValidatedOpportunities({});

  // Collect states
  const entriesAfterRun = registry.getAllEntries();

  const fixtureEntries = entriesAfterRun.filter(e => e.status === 'STATIC_FIXTURE');
  const notImplementedEntries = entriesAfterRun.filter(e => e.status === 'NOT_IMPLEMENTED');
  const partnerEntries = entriesAfterRun.filter(e => e.status === 'PARTNERSHIP_REQUIRED');
  const disabledEntries = entriesAfterRun.filter(e => e.status === 'DISABLED');
  
  const adzuna = registry.getEntry('adzuna_sa');
  const jooble = registry.getEntry('jooble_sa');
  const careerjet = registry.getEntry('careerjet_sa');

  // TEST 1: STATIC_FIXTURE adapters are not executed during production discovery.
  const fixturesExecuted = fixtureEntries.some(e => e.requestsCount > 0);
  assert(!fixturesExecuted, 'TEST 1', 'STATIC_FIXTURE adapters are not executed during production discovery.');

  // TEST 2: NOT_IMPLEMENTED adapters are not executed during production discovery.
  const notImplementedExecuted = notImplementedEntries.some(e => e.requestsCount > 0);
  assert(!notImplementedExecuted, 'TEST 2', 'NOT_IMPLEMENTED adapters are not executed during production discovery.');

  // TEST 3: PARTNERSHIP_REQUIRED adapters are not executed.
  const partnerExecuted = partnerEntries.some(e => e.requestsCount > 0);
  assert(!partnerExecuted, 'TEST 3', 'PARTNERSHIP_REQUIRED adapters are not executed.');

  // TEST 4: DISABLED adapters are not executed.
  const disabledExecuted = disabledEntries.some(e => e.requestsCount > 0);
  assert(!disabledExecuted, 'TEST 4', 'DISABLED adapters are not executed.');

  // TEST 5: Adzuna executes because it is LIVE_EXTERNAL.
  assert(adzuna !== undefined && adzuna.requestsCount > 0, 'TEST 5', 'Adzuna executes because it is LIVE_EXTERNAL.');

  // TEST 6: Jooble executes because it is LIVE_EXTERNAL.
  assert(jooble !== undefined && jooble.requestsCount > 0, 'TEST 6', 'Jooble executes because it is LIVE_EXTERNAL.');

  // TEST 7: Explicit development includeFixtures mode can access STATIC_FIXTURE data.
  // Switch to development to check explicit fixtures
  process.env.NODE_ENV = 'development';
  const oppsDev = await pipeline.fetchAllValidatedOpportunities({ includeFixtures: true });
  const fixtureEntriesAfterDev = registry.getAllEntries().filter(e => e.status === 'STATIC_FIXTURE');
  const fixturesNowExecuted = fixtureEntriesAfterDev.some(e => e.requestsCount > 0);
  assert(fixturesNowExecuted, 'TEST 7', 'Explicit development includeFixtures mode can access STATIC_FIXTURE data.');

  // Restore to what it was
  process.env.NODE_ENV = originalEnv;

  // TEST 8: Skipping Careerjet does not increment failedRequestsCount.
  assert(careerjet !== undefined && careerjet.failedRequestsCount === 0, 'TEST 8', 'Skipping Careerjet does not increment failedRequestsCount.');

  // TEST 9: Skipping fixtures does not increment failedRequestsCount.
  const skippedFixturesDidNotFail = fixtureEntries.every(e => e.failedRequestsCount === 0);
  assert(skippedFixturesDidNotFail, 'TEST 9', 'Skipping fixtures does not increment failedRequestsCount.');

  // TEST 10: A genuine Adzuna/Jooble network failure still registers as a source failure.
  // Test by manually fetching via their adapters without API keys and capturing the registry count
  const savedAdzunaId = process.env.ADZUNA_APP_ID;
  const savedAdzunaKey = process.env.ADZUNA_APP_KEY;
  delete process.env.ADZUNA_APP_ID;
  delete process.env.ADZUNA_APP_KEY;
  
  const savedJoobleKey = process.env.JOOBLE_API_KEY;
  delete process.env.JOOBLE_API_KEY;

  const initialAdzunaFailedCount = adzuna?.failedRequestsCount || 0;
  const initialJoobleFailedCount = jooble?.failedRequestsCount || 0;

  // Just trigger fetch on the pipeline again. Since missing keys causes failure:
  await pipeline.fetchAllValidatedOpportunities({});

  const adzunaNow = registry.getEntry('adzuna_sa');
  const joobleNow = registry.getEntry('jooble_sa');
  
  const adzunaFailedIncreased = adzunaNow && adzunaNow.failedRequestsCount > initialAdzunaFailedCount;
  const joobleFailedIncreased = joobleNow && joobleNow.failedRequestsCount > initialJoobleFailedCount;

  // Restore env vars
  if (savedAdzunaId) process.env.ADZUNA_APP_ID = savedAdzunaId;
  if (savedAdzunaKey) process.env.ADZUNA_APP_KEY = savedAdzunaKey;
  if (savedJoobleKey) process.env.JOOBLE_API_KEY = savedJoobleKey;

  assert(!!(adzunaFailedIncreased && joobleFailedIncreased), 'TEST 10', 'A genuine network failure registers as a source failure.');

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionSourceEligibilityAudit().then(result => {
    if (result.failed > 0) {
      process.exit(1);
    }
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
