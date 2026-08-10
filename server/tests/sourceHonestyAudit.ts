import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import {
  DpsaPublicVacanciesAdapter,
  DelLabourVacanciesAdapter,
  SayouthMobiAdapter,
  CciSouthAfricaAdapter,
  RetailCorporateAdapter,
  AdzunaAdapter,
  JoobleAdapter,
  CareerjetAdapter,
  PNetAdapter,
} from '../adapters/sourceAdapters.ts';
import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { SourceAdapterStatus } from '../../src/types.ts';

export async function runSourceHonestyAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1A: SOURCE HONESTY GATE - ACCEPTANCE TEST SUITE');
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

  const registry = SourceRegistry.getInstance();

  // -------------------------------------------------------------
  // TEST 1 — REGISTRY REGISTRATION
  // -------------------------------------------------------------
  log('\n--- TEST 1: REGISTRY REGISTRATION ---');
  const expectedAdapters = [
    'dpsa_gov_za',
    'labour_gov_za',
    'sayouth_mobi',
    'cci_sa_careers',
    'retail_official_portals',
    'adzuna_sa',
    'jooble_sa',
    'careerjet_sa',
    'pnet_sa_partnership',
  ];

  let allRegistered = true;
  for (const id of expectedAdapters) {
    const entry = registry.getEntry(id);
    if (!entry) {
      allRegistered = false;
      log(`Missing entry in registry: ${id}`);
    } else {
      log(`  Registered in registry: ${id} (${entry.sourceName})`);
    }
  }
  assert(allRegistered, 'TEST 1 (Registry Registration)', 'All 9 source entries are registered in SourceRegistry');

  // -------------------------------------------------------------
  // TEST 2 — STATUS TRUTH
  // -------------------------------------------------------------
  log('\n--- TEST 2: STATUS TRUTH ---');
  const adaptersMap: Record<string, any> = {
    dpsa_gov_za: new DpsaPublicVacanciesAdapter(),
    labour_gov_za: new DelLabourVacanciesAdapter(),
    sayouth_mobi: new SayouthMobiAdapter(),
    cci_sa_careers: new CciSouthAfricaAdapter(),
    retail_official_portals: new RetailCorporateAdapter(),
    adzuna_sa: new AdzunaAdapter(),
    jooble_sa: new JoobleAdapter(),
    careerjet_sa: new CareerjetAdapter(),
    pnet_sa_partnership: new PNetAdapter(),
  };

  const expectedStatuses: Record<string, SourceAdapterStatus> = {
    dpsa_gov_za: 'LIVE_EXTERNAL',
    labour_gov_za: 'STATIC_FIXTURE',
    sayouth_mobi: 'STATIC_FIXTURE',
    cci_sa_careers: 'STATIC_FIXTURE',
    retail_official_portals: 'STATIC_FIXTURE',
    adzuna_sa: 'LIVE_EXTERNAL',
    jooble_sa: 'LIVE_EXTERNAL',
    careerjet_sa: 'LIVE_EXTERNAL',
    pnet_sa_partnership: 'PARTNERSHIP_REQUIRED',
  };

  let statusMatch = true;
  for (const [id, expectedStatus] of Object.entries(expectedStatuses)) {
    const adapter = adaptersMap[id];
    const registryEntry = registry.getEntry(id);

    if (!adapter) {
      statusMatch = false;
      log(`Adapter instance for ${id} not found`);
      continue;
    }
    const adapterStatus = await adapter.getStatus();
    const registryStatus = registryEntry?.status;

    if (adapterStatus !== expectedStatus) {
      statusMatch = false;
      log(`Adapter status mismatch for ${id}: expected ${expectedStatus}, got ${adapterStatus}`);
    }
    if (registryStatus !== expectedStatus) {
      statusMatch = false;
      log(`Registry status mismatch for ${id}: expected ${expectedStatus}, got ${registryStatus}`);
    }

    if (adapterStatus === expectedStatus && registryStatus === expectedStatus) {
      log(`  Source ${id}: ${adapterStatus} (Adapter & Registry Match)`);
    }
  }
  assert(statusMatch, 'TEST 2 (Status Truth)', 'All adapters and registry entries return accurate SourceAdapterStatus');

  // -------------------------------------------------------------
  // TEST 3 — FIXTURE PROVENANCE
  // -------------------------------------------------------------
  log('\n--- TEST 3: FIXTURE PROVENANCE ---');
  const fixtureAdapters = [
    adaptersMap.labour_gov_za,
    adaptersMap.sayouth_mobi,
    adaptersMap.cci_sa_careers,
    adaptersMap.retail_official_portals,
  ];

  let allFixtureProvenanceValid = true;
  let totalFixtureCount = 0;

  for (const adapter of fixtureAdapters) {
    const opps = await adapter.fetchOpportunities();
    totalFixtureCount += opps.length;
    for (const opp of opps) {
      const isFixtureValid =
        opp.isFixture === true &&
        opp.isLive === false &&
        opp.sourceProvenance.isFixture === true &&
        opp.sourceProvenance.isLive === false &&
        opp.sourceProvenance.sourceStatus === 'STATIC_FIXTURE' &&
        opp.sourceProvenance.isRealVerified === false;

      if (!isFixtureValid) {
        allFixtureProvenanceValid = false;
        log(`Invalid fixture provenance in ${adapter.sourceId} for item ${opp.id}:
          isFixture=${opp.isFixture}, isLive=${opp.isLive}, sourceStatus=${opp.sourceProvenance.sourceStatus}`);
      }
    }
  }
  assert(
    allFixtureProvenanceValid && totalFixtureCount > 0,
    'TEST 3 (Fixture Provenance)',
    `All ${totalFixtureCount} items from static Tier 1 adapters have isFixture=true, isLive=false, sourceStatus=STATIC_FIXTURE`
  );

  // -------------------------------------------------------------
  // TEST 4 — NO FAKE LIVE OPP
  // -------------------------------------------------------------
  log('\n--- TEST 4: NO FAKE LIVE OPP ---');
  let noFakeLiveOpps = true;
  for (const adapter of fixtureAdapters) {
    const opps = await adapter.fetchOpportunities();
    for (const opp of opps) {
      if (opp.isLive === true || opp.sourceProvenance.sourceStatus === 'LIVE' || opp.sourceProvenance.sourceStatus === 'LIVE_EXTERNAL') {
        noFakeLiveOpps = false;
        log(`Fake live opportunity detected in ${adapter.sourceId}: ${opp.id}`);
      }
    }
  }
  assert(noFakeLiveOpps, 'TEST 4 (No Fake Live Opp)', 'No static fixture opportunities claim to be live external data');

  // -------------------------------------------------------------
  // TEST 5 — ADZUNA FALLBACK HONESTY
  // -------------------------------------------------------------
  log('\n--- TEST 5: ADZUNA FALLBACK HONESTY ---');
  const adzunaAdapter = adaptersMap.adzuna_sa;

  // Temporarily clear env vars to simulate missing credentials
  const savedAdzunaId = process.env.ADZUNA_APP_ID;
  const savedAdzunaKey = process.env.ADZUNA_APP_KEY;
  delete process.env.ADZUNA_APP_ID;
  delete process.env.ADZUNA_APP_KEY;

  const adzunaOppsNoKey = await adzunaAdapter.fetchOpportunities();
  let adzunaHonest = adzunaOppsNoKey.length === 0;

  // Restore env vars if they existed
  if (savedAdzunaId) process.env.ADZUNA_APP_ID = savedAdzunaId;
  if (savedAdzunaKey) process.env.ADZUNA_APP_KEY = savedAdzunaKey;

  assert(adzunaHonest, 'TEST 5 (Adzuna Fallback Honesty)', `Adzuna returns empty array ([]) when credentials are missing (got ${adzunaOppsNoKey.length} items)`);

  // -------------------------------------------------------------
  // TEST 6 — JOOBLE FALLBACK HONESTY
  // -------------------------------------------------------------
  log('\n--- TEST 6: JOOBLE FALLBACK HONESTY ---');
  const joobleAdapter = adaptersMap.jooble_sa;

  const savedJoobleKey = process.env.JOOBLE_API_KEY;
  delete process.env.JOOBLE_API_KEY;

  const joobleOppsNoKey = await joobleAdapter.fetchOpportunities();
  let joobleHonest = joobleOppsNoKey.length === 0;

  if (savedJoobleKey) process.env.JOOBLE_API_KEY = savedJoobleKey;

  assert(joobleHonest, 'TEST 6 (Jooble Fallback Honesty)', `Jooble returns empty array ([]) when credentials are missing (got ${joobleOppsNoKey.length} items)`);

  // -------------------------------------------------------------
  // TEST 7 — PNET SAFETY
  // -------------------------------------------------------------
  log('\n--- TEST 7: PNET SAFETY ---');
  const pnetAdapter = adaptersMap.pnet_sa_partnership;
  const pnetStatus = await pnetAdapter.getStatus();
  const pnetOpps = await pnetAdapter.fetchOpportunities();

  const pnetSafe = pnetStatus === 'PARTNERSHIP_REQUIRED' && pnetOpps.length === 0;
  assert(pnetSafe, 'TEST 7 (PNet Safety)', `PNet status is PARTNERSHIP_REQUIRED and returns 0 items without scraping`);

  // -------------------------------------------------------------
  // TEST 8 — CAREERJET HONESTY
  // -------------------------------------------------------------
  log('\n--- TEST 8: CAREERJET HONESTY ---');
  const careerjetAdapter = adaptersMap.careerjet_sa;
  const careerjetStatus = await careerjetAdapter.getStatus();

  const savedCjKey = process.env.CAREERJET_API_KEY;
  const savedCjAff = process.env.CAREERJET_AFFILIATE_ID;
  delete process.env.CAREERJET_API_KEY;
  delete process.env.CAREERJET_AFFILIATE_ID;

  const careerjetOppsNoKey = await careerjetAdapter.fetchOpportunities();
  const careerjetHonest = careerjetStatus === 'LIVE_EXTERNAL' && careerjetOppsNoKey.length === 0;

  if (savedCjKey) process.env.CAREERJET_API_KEY = savedCjKey;
  if (savedCjAff) process.env.CAREERJET_AFFILIATE_ID = savedCjAff;

  assert(careerjetHonest, 'TEST 8 (Careerjet Honesty)', `Careerjet status is LIVE_EXTERNAL and returns 0 items when credentials/context are missing`);

  // -------------------------------------------------------------
  // TEST 9 — INGESTION SUMMARY HONESTY
  // -------------------------------------------------------------
  log('\n--- TEST 9: INGESTION SUMMARY HONESTY ---');
  const pipeline = new OpportunityPipeline();
  const allOpps = await pipeline.fetchAllValidatedOpportunities({ includeFixtures: true });

  const liveOpps = allOpps.filter((o) => o.isLive);
  const fixtureOpps = allOpps.filter((o) => o.isFixture);

  log(`  Pipeline total items fetched: ${allOpps.length}`);
  log(`  Live items: ${liveOpps.length}`);
  log(`  Fixture items: ${fixtureOpps.length}`);

  const ingestionHonest =
    allOpps.every((o) => (o.isLive && !o.isFixture) || (o.isFixture && !o.isLive)) &&
    fixtureOpps.length === totalFixtureCount;

  assert(ingestionHonest, 'TEST 9 (Ingestion Summary Honesty)', `Pipeline cleanly partitions live (${liveOpps.length}) and fixture (${fixtureOpps.length}) opportunities with zero overlap`);

  // -------------------------------------------------------------
  // TEST 10 — UI PROVENANCE HONESTY
  // -------------------------------------------------------------
  log('\n--- TEST 10: UI PROVENANCE HONESTY ---');
  const uiHonest = allOpps.every((o) => {
    if (o.isFixture) {
      return (
        o.sourceProvenance.sourceStatus === 'STATIC_FIXTURE' &&
        o.sourceProvenance.isFixture === true &&
        o.sourceProvenance.isLive === false
      );
    }
    return (
      o.sourceProvenance.sourceStatus === 'LIVE_EXTERNAL' ||
      o.sourceProvenance.sourceStatus === 'LIVE' ||
      o.sourceProvenance.sourceStatus === 'LICENSED'
    );
  });

  assert(uiHonest, 'TEST 10 (UI Provenance Honesty)', 'All opportunities pass provenance audit for UI rendering without misleading labels');

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}
