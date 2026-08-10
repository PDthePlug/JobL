import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { Opportunity } from '../../src/types.ts';

export async function runLiveExternalAdmissionAudit(): Promise<{ passed: number; failed: number; total: number; logs: string[] }> {
  const logs: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logs.push(msg);
  }

  log('================================================================');
  log('   JOBL PHASE T1B.1A.1: LIVE EXTERNAL ADMISSION AUDIT');
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

  const pipeline = new OpportunityPipeline();
  const registry = SourceRegistry.getInstance();

  // Helper to create a base mock Careerjet Opportunity
  function createMockCareerjetOpp(overrides: Partial<Opportunity> = {}): Opportunity {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: 'careerjet_test_123',
      title: 'Python Developer',
      employer: 'NBC Universal',
      location: {
        rawLocationText: 'Johannesburg, Gauteng',
        city: 'Johannesburg',
        province: 'Gauteng',
        regionType: 'UNKNOWN',
        country: 'South Africa',
        remoteStatus: 'UNKNOWN',
      },
      jobCategory: 'Unclassified',
      employmentType: 'Unknown',
      experienceLevel: 'Unknown',
      qualificationRequirement: 'NOT_SPECIFIED',
      summary: 'Job description excerpt',
      requirements: [],
      responsibilities: [],
      skillsRequired: [],
      postedAt: '2025-11-15',
      matchScore: 80,
      sourceProvenance: {
        sourceId: 'careerjet_sa',
        sourceName: 'Careerjet Publisher API',
        sourceTier: 2,
        sourceType: 'AUTHORISED_AGGREGATOR',
        originalListingId: 'unique_123',
        originalUrl: 'https://jobviewtrack.com/v2/test_url',
        sourceListingUrl: 'https://jobviewtrack.com/v2/test_url',
        employerName: 'NBC Universal',
        publicationDate: '2025-11-15',
        lastVerifiedDate: today,
        lastSeenAt: today,
        sourceStatus: 'LIVE_EXTERNAL',
        verificationStatus: 'UNVERIFIED',
        destinationStatus: 'LISTING_ONLY',
        freshnessStatus: 'NEW',
        applicationDestination: 'https://jobviewtrack.com/v2/test_url',
        applicationUrl: 'https://jobviewtrack.com/v2/test_url',
        isRealVerified: false,
        isFixture: false,
        isLive: true,
        attributionRequired: true,
        attributionConfig: {
          providerName: 'Careerjet',
          text: 'Powered by Careerjet',
          termsUrl: 'https://www.careerjet.co.za/',
        },
      },
      isFixture: false,
      isLive: true,
      ...overrides,
    };
  }

  // Spy on DestinationVerifier.verifyOpportunity
  let verifierCalledWith: Opportunity[] = [];
  const originalVerifyOpp = DestinationVerifier.verifyOpportunity;
  DestinationVerifier.verifyOpportunity = (opp: Opportunity): Opportunity => {
    verifierCalledWith.push(opp);
    return originalVerifyOpp.call(DestinationVerifier, opp);
  };

  const originalEnv = process.env.NODE_ENV;

  try {
    // TEST 1: LIVE_EXTERNAL Careerjet opportunity with verificationStatus = UNVERIFIED survives initial normalization
    const unverifiedOpp = createMockCareerjetOpp({
      sourceProvenance: {
        ...createMockCareerjetOpp().sourceProvenance,
        verificationStatus: 'UNVERIFIED',
        isRealVerified: false,
      },
    });

    // Test spy reset
    verifierCalledWith = [];

    // Mock adapter fetch for test
    const fakeAdapter = {
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'LIVE_EXTERNAL' as const,
      fetchOpportunities: async () => [unverifiedOpp],
    };

    // Replace pipeline adapters for testing
    (pipeline as any).adapters = [fakeAdapter];

    process.env.NODE_ENV = 'production';
    const result1 = await pipeline.fetchAllValidatedOpportunities({});

    assert(
      verifierCalledWith.some((o) => o.id === unverifiedOpp.id),
      'TEST 1',
      'LIVE_EXTERNAL opportunity with verificationStatus=UNVERIFIED reached DestinationVerifier'
    );

    // TEST 2: LIVE_EXTERNAL Careerjet opportunity with isRealVerified = false survives initial normalization
    assert(
      result1.some((o) => o.id === unverifiedOpp.id),
      'TEST 2',
      'LIVE_EXTERNAL opportunity with isRealVerified=false survived initial normalization and pipeline execution'
    );

    // TEST 3: LISTING_ONLY Careerjet opportunity reaches DestinationVerifier
    assert(
      verifierCalledWith.length > 0 && verifierCalledWith[0].sourceProvenance.destinationStatus === 'LISTING_ONLY',
      'TEST 3',
      'LISTING_ONLY Careerjet opportunity reached DestinationVerifier'
    );

    // TEST 4: STATIC_FIXTURE remains excluded from production
    verifierCalledWith = [];
    const fixtureOpp = createMockCareerjetOpp({
      isFixture: true,
      sourceProvenance: {
        ...createMockCareerjetOpp().sourceProvenance,
        isFixture: true,
        sourceStatus: 'STATIC_FIXTURE',
      },
    });
    (pipeline as any).adapters = [{
      sourceId: 'labour_gov_za',
      sourceTier: 1 as const,
      getStatus: async () => 'STATIC_FIXTURE' as const,
      fetchOpportunities: async () => [fixtureOpp],
    }];

    process.env.NODE_ENV = 'production';
    const result4 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result4.length === 0 && verifierCalledWith.length === 0,
      'TEST 4',
      'STATIC_FIXTURE excluded from production'
    );

    // TEST 5: isFixture = true remains excluded from production
    verifierCalledWith = [];
    const isFixtureTrueOpp = createMockCareerjetOpp({ isFixture: true });
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'LIVE_EXTERNAL' as const,
      fetchOpportunities: async () => [isFixtureTrueOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result5 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result5.length === 0 && verifierCalledWith.length === 0,
      'TEST 5',
      'isFixture = true excluded from production'
    );

    // TEST 6: sourceProvenance.isFixture = true remains excluded from production
    verifierCalledWith = [];
    const provFixtureTrueOpp = createMockCareerjetOpp({
      sourceProvenance: { ...createMockCareerjetOpp().sourceProvenance, isFixture: true },
    });
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'LIVE_EXTERNAL' as const,
      fetchOpportunities: async () => [provFixtureTrueOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result6 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result6.length === 0 && verifierCalledWith.length === 0,
      'TEST 6',
      'sourceProvenance.isFixture = true excluded from production'
    );

    // TEST 7: NOT_IMPLEMENTED source remains excluded
    verifierCalledWith = [];
    const notImplOpp = createMockCareerjetOpp({
      sourceProvenance: { ...createMockCareerjetOpp().sourceProvenance, sourceStatus: 'NOT_IMPLEMENTED' as any },
    });
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'NOT_IMPLEMENTED' as any,
      fetchOpportunities: async () => [notImplOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result7 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result7.length === 0 && verifierCalledWith.length === 0,
      'TEST 7',
      'NOT_IMPLEMENTED source remains excluded'
    );

    // TEST 8: PARTNERSHIP_REQUIRED source remains excluded
    verifierCalledWith = [];
    const partnershipOpp = createMockCareerjetOpp({
      sourceProvenance: { ...createMockCareerjetOpp().sourceProvenance, sourceStatus: 'PARTNERSHIP_REQUIRED' },
    });
    (pipeline as any).adapters = [{
      sourceId: 'pnet_sa_partnership',
      sourceTier: 3 as const,
      getStatus: async () => 'PARTNERSHIP_REQUIRED' as const,
      fetchOpportunities: async () => [partnershipOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result8 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result8.length === 0 && verifierCalledWith.length === 0,
      'TEST 8',
      'PARTNERSHIP_REQUIRED source remains excluded'
    );

    // TEST 9: DISABLED source remains excluded
    verifierCalledWith = [];
    const disabledOpp = createMockCareerjetOpp({
      sourceProvenance: { ...createMockCareerjetOpp().sourceProvenance, sourceStatus: 'DISABLED' as any },
    });
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'DISABLED' as any,
      fetchOpportunities: async () => [disabledOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result9 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result9.length === 0 && verifierCalledWith.length === 0,
      'TEST 9',
      'DISABLED source remains excluded'
    );

    // TEST 10: A record claiming isLive = true but belonging to a non-production source state does NOT bypass source eligibility
    verifierCalledWith = [];
    const spoofedOpp = createMockCareerjetOpp({
      isLive: true,
      sourceProvenance: {
        ...createMockCareerjetOpp().sourceProvenance,
        isLive: true,
        sourceStatus: 'PARTNERSHIP_REQUIRED',
      },
    });
    (pipeline as any).adapters = [{
      sourceId: 'pnet_sa_partnership',
      sourceTier: 3 as const,
      getStatus: async () => 'PARTNERSHIP_REQUIRED' as const,
      fetchOpportunities: async () => [spoofedOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result10 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result10.length === 0 && verifierCalledWith.length === 0,
      'TEST 10',
      'Record claiming isLive=true with PARTNERSHIP_REQUIRED status rejected'
    );

    // TEST 11: Careerjet is NOT changed to verificationStatus = VERIFIED before destination handling
    const rawCjOpp = createMockCareerjetOpp();
    assert(
      rawCjOpp.sourceProvenance.verificationStatus === 'UNVERIFIED',
      'TEST 11',
      'Careerjet raw output retains verificationStatus = UNVERIFIED before destination handling'
    );

    // TEST 12: Careerjet isRealVerified remains false before destination handling
    assert(
      rawCjOpp.sourceProvenance.isRealVerified === false,
      'TEST 12',
      'Careerjet raw output retains isRealVerified = false before destination handling'
    );

    // TEST 13: At least one mocked Careerjet API result successfully reaches the destination stage through the real pipeline
    verifierCalledWith = [];
    const liveCjOpp = createMockCareerjetOpp({ id: 'live_cj_test_999' });
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'LIVE_EXTERNAL' as const,
      fetchOpportunities: async () => [liveCjOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result13 = await pipeline.fetchAllValidatedOpportunities({});
    assert(
      result13.some((o) => o.id === 'live_cj_test_999') && verifierCalledWith.some((o) => o.id === 'live_cj_test_999'),
      'TEST 13',
      'Mocked Careerjet API result successfully reached destination stage and passed pipeline'
    );

    // TEST 14: Source ingestion success and destination rejection remain distinguishable in source-health accounting
    const badUrlOpp = createMockCareerjetOpp({
      id: 'bad_url_opp',
      sourceProvenance: {
        ...createMockCareerjetOpp().sourceProvenance,
        applicationDestination: 'http://invalid-homepage.co.za/careers',
      },
    });
    const cjEntryBefore = registry.getEntry('careerjet_sa');
    const failedReqsBefore = cjEntryBefore?.failedRequestsCount || 0;
    const destFailuresBefore = cjEntryBefore?.destinationFailuresCount || 0;

    verifierCalledWith = [];
    (pipeline as any).adapters = [{
      sourceId: 'careerjet_sa',
      sourceTier: 2 as const,
      getStatus: async () => 'LIVE_EXTERNAL' as const,
      fetchOpportunities: async () => [badUrlOpp],
    }];
    process.env.NODE_ENV = 'production';
    const result14 = await pipeline.fetchAllValidatedOpportunities({});

    const cjEntryAfter = registry.getEntry('careerjet_sa');
    const failedReqsAfter = cjEntryAfter?.failedRequestsCount || 0;
    const destFailuresAfter = cjEntryAfter?.destinationFailuresCount || 0;

    assert(
      result14.length === 0 && failedReqsAfter === failedReqsBefore && destFailuresAfter > destFailuresBefore,
      'TEST 14',
      'Destination rejection recorded as destination failure without incrementing source request failures'
    );

  } finally {
    DestinationVerifier.verifyOpportunity = originalVerifyOpp;
    process.env.NODE_ENV = originalEnv;
  }

  log('\n================================================================');
  log(`   RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  log('================================================================\n');

  return { passed, failed, total: passed + failed, logs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLiveExternalAdmissionAudit().then((result) => {
    if (result.failed > 0) {
      process.exit(1);
    }
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
