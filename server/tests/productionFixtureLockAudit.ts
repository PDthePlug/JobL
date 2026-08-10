import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';

export async function runProductionFixtureLockAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1A.2: PRODUCTION FIXTURE EXECUTION LOCK AUDIT');
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

  const originalEnv = process.env.NODE_ENV;
  const registry = SourceRegistry.getInstance();
  const pipeline = new OpportunityPipeline();

  function resetCounts() {
    registry.getAllEntries().forEach(entry => {
      entry.requestsCount = 0;
      entry.successfulRequestsCount = 0;
      entry.failedRequestsCount = 0;
    });
  }

  const fixtureAdapterIds = ['dpsa_gov_za', 'labour_gov_za', 'sayouth_mobi', 'cci_sa_careers', 'retail_official_portals'];

  // -------------------------------------------------------------
  // TEST 1 — Production + includeFixtures=true → fixture adapters DO NOT execute
  // -------------------------------------------------------------
  log('--- TEST 1: Production + includeFixtures=true ---');
  process.env.NODE_ENV = 'production';
  resetCounts();
  await pipeline.fetchAllValidatedOpportunities({ includeFixtures: true });
  const t1FixtureExecuted = fixtureAdapterIds.some(id => (registry.getEntry(id)?.requestsCount || 0) > 0);
  assert(!t1FixtureExecuted, 'TEST 1', 'Production + includeFixtures=true → fixture adapters DO NOT execute (all request counts = 0)');

  // -------------------------------------------------------------
  // TEST 2 — Production + includeFixtures=false → fixture adapters DO NOT execute
  // -------------------------------------------------------------
  log('--- TEST 2: Production + includeFixtures=false ---');
  process.env.NODE_ENV = 'production';
  resetCounts();
  await pipeline.fetchAllValidatedOpportunities({ includeFixtures: false });
  const t2FixtureExecuted = fixtureAdapterIds.some(id => (registry.getEntry(id)?.requestsCount || 0) > 0);
  assert(!t2FixtureExecuted, 'TEST 2', 'Production + includeFixtures=false → fixture adapters DO NOT execute');

  // -------------------------------------------------------------
  // TEST 3 — Production + omitted includeFixtures → fixture adapters DO NOT execute
  // -------------------------------------------------------------
  log('--- TEST 3: Production + omitted includeFixtures ---');
  process.env.NODE_ENV = 'production';
  resetCounts();
  await pipeline.fetchAllValidatedOpportunities({});
  const t3FixtureExecuted = fixtureAdapterIds.some(id => (registry.getEntry(id)?.requestsCount || 0) > 0);
  assert(!t3FixtureExecuted, 'TEST 3', 'Production + omitted includeFixtures → fixture adapters DO NOT execute');

  // -------------------------------------------------------------
  // TEST 4 — Development + includeFixtures=true → fixture adapters execute
  // -------------------------------------------------------------
  log('--- TEST 4: Development + includeFixtures=true ---');
  process.env.NODE_ENV = 'development';
  resetCounts();
  await pipeline.fetchAllValidatedOpportunities({ includeFixtures: true });
  const t4FixtureExecuted = fixtureAdapterIds.every(id => (registry.getEntry(id)?.requestsCount || 0) > 0);
  assert(t4FixtureExecuted, 'TEST 4', 'Development + includeFixtures=true → fixture adapters execute (all request counts > 0)');

  // -------------------------------------------------------------
  // TEST 5 — Development + omitted includeFixtures → fixture adapters do not execute
  // -------------------------------------------------------------
  log('--- TEST 5: Development + omitted includeFixtures ---');
  process.env.NODE_ENV = 'development';
  resetCounts();
  await pipeline.fetchAllValidatedOpportunities({});
  const t5FixtureExecuted = fixtureAdapterIds.some(id => (registry.getEntry(id)?.requestsCount || 0) > 0);
  assert(!t5FixtureExecuted, 'TEST 5', 'Development + omitted includeFixtures → fixture adapters do not execute');

  // -------------------------------------------------------------
  // TEST 6 — Careerjet NOT_IMPLEMENTED remains skipped
  // -------------------------------------------------------------
  log('--- TEST 6: Careerjet NOT_IMPLEMENTED remains skipped ---');
  process.env.NODE_ENV = 'production';
  resetCounts();
  await pipeline.fetchAllValidatedOpportunities({});
  const careerjetEntry = registry.getEntry('careerjet_sa');
  assert(
    careerjetEntry?.status === 'NOT_IMPLEMENTED' && careerjetEntry?.requestsCount === 0,
    'TEST 6',
    'Careerjet NOT_IMPLEMENTED remains skipped (requestsCount = 0)'
  );

  // -------------------------------------------------------------
  // TEST 7 — PNet PARTNERSHIP_REQUIRED remains skipped
  // -------------------------------------------------------------
  log('--- TEST 7: PNet PARTNERSHIP_REQUIRED remains skipped ---');
  const pnetEntry = registry.getEntry('pnet_sa_partnership');
  assert(
    pnetEntry?.status === 'PARTNERSHIP_REQUIRED' && pnetEntry?.requestsCount === 0,
    'TEST 7',
    'PNet PARTNERSHIP_REQUIRED remains skipped (requestsCount = 0)'
  );

  // -------------------------------------------------------------
  // TEST 8 — Adzuna LIVE_EXTERNAL remains eligible
  // -------------------------------------------------------------
  log('--- TEST 8: Adzuna LIVE_EXTERNAL remains eligible ---');
  const adzunaEntry = registry.getEntry('adzuna_sa');
  assert(
    adzunaEntry?.status === 'LIVE_EXTERNAL' && (adzunaEntry?.requestsCount || 0) > 0,
    'TEST 8',
    'Adzuna LIVE_EXTERNAL remains eligible (requestsCount > 0)'
  );

  // -------------------------------------------------------------
  // TEST 9 — Jooble LIVE_EXTERNAL remains eligible
  // -------------------------------------------------------------
  log('--- TEST 9: Jooble LIVE_EXTERNAL remains eligible ---');
  const joobleEntry = registry.getEntry('jooble_sa');
  assert(
    joobleEntry?.status === 'LIVE_EXTERNAL' && (joobleEntry?.requestsCount || 0) > 0,
    'TEST 9',
    'Jooble LIVE_EXTERNAL remains eligible (requestsCount > 0)'
  );

  // -------------------------------------------------------------
  // TEST 10 — Skipped fixture sources produce zero source-health failures
  // -------------------------------------------------------------
  log('--- TEST 10: Skipped fixture sources produce zero source-health failures ---');
  const zeroFailuresOnSkippedFixtures = fixtureAdapterIds.every(id => (registry.getEntry(id)?.failedRequestsCount || 0) === 0);
  assert(
    zeroFailuresOnSkippedFixtures,
    'TEST 10',
    'Skipped fixture sources produce zero source-health failures (failedRequestsCount = 0)'
  );

  // Restore NODE_ENV
  process.env.NODE_ENV = originalEnv;

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionFixtureLockAudit().then(result => {
    if (result.failed > 0) {
      process.exit(1);
    }
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
