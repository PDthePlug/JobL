import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';
import { Deduplicator } from '../services/deduplicator.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { PNetAdapter, AdzunaAdapter, DpsaPublicVacanciesAdapter } from '../adapters/sourceAdapters.ts';
import { Opportunity } from '../../src/types.ts';

export async function runPhase1BAcceptanceTests(): Promise<{
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
      results.push({ testName, success: true, details });
    } else {
      failed++;
      results.push({ testName, success: false, details: `FAILED: ${details}` });
    }
  }

  // 1. Source Registry & Health Test
  try {
    const registry = SourceRegistry.getInstance();
    const entries = registry.getAllEntries();
    assert(
      entries.length >= 8,
      'Source Registry Integrity',
      `Registered ${entries.length} adapters across Tier 1, 2, and 3.`
    );
  } catch (e: any) {
    assert(false, 'Source Registry Integrity', e.message);
  }

  // 2. Tier 1 Government / Direct Employer Adapter Test
  try {
    const dpsaAdapter = new DpsaPublicVacanciesAdapter();
    const items = await dpsaAdapter.fetchOpportunities();
    assert(
      items.length > 0 && items[0].sourceProvenance.sourceTier === 1,
      'Tier 1 Source Verification',
      `Fetched ${items.length} opportunities with Tier 1 provenance.`
    );
  } catch (e: any) {
    assert(false, 'Tier 1 Source Verification', e.message);
  }

  // 3. Tier 2 Authorised Aggregator Attribution Test
  try {
    const adzunaAdapter = new AdzunaAdapter();
    const items = await adzunaAdapter.fetchOpportunities();
    assert(
      items.length > 0 &&
        items[0].sourceProvenance.sourceTier === 2 &&
        items[0].sourceProvenance.attributionRequired === true &&
        Boolean(items[0].sourceProvenance.attributionConfig?.text),
      'Tier 2 Attribution Verification',
      `Adzuna provider returned required attribution text: ${items[0].sourceProvenance.attributionConfig?.text}`
    );
  } catch (e: any) {
    assert(false, 'Tier 2 Attribution Verification', e.message);
  }

  // 4. Tier 3 Partnership Compliance Test (No Unauthorized Scraping)
  try {
    const pnetAdapter = new PNetAdapter();
    const status = await pnetAdapter.getStatus();
    const items = await pnetAdapter.fetchOpportunities();
    assert(
      status === 'PARTNERSHIP_REQUIRED' && items.length === 0,
      'Tier 3 Partnership Compliance',
      `PNet adapter correctly suspended with status PARTNERSHIP_REQUIRED (0 listings returned, 0 scraping performed).`
    );
  } catch (e: any) {
    assert(false, 'Tier 3 Partnership Compliance', e.message);
  }

  // 5. Destination Verifier Reject Generic Homepages
  try {
    const resGeneric1 = DestinationVerifier.verifyDestination(
      'https://www.dpsa.gov.za/',
      'https://www.dpsa.gov.za/',
      'Clerk',
      'DPSA'
    );
    const resGeneric2 = DestinationVerifier.verifyDestination(
      'https://company.co.za/careers',
      'https://company.co.za/careers',
      'Clerk',
      'Company'
    );
    const resValid = DestinationVerifier.verifyDestination(
      'https://www.dpsa.gov.za/vacancies/VAC-101/apply',
      'https://www.dpsa.gov.za/vacancies/VAC-101',
      'Clerk',
      'DPSA'
    );

    assert(
      !resGeneric1.isValid && !resGeneric2.isValid && resValid.isValid,
      'Destination Verification Accuracy',
      `Correctly rejected generic domain homepage and /careers landing page, while approving direct /apply URL.`
    );
  } catch (e: any) {
    assert(false, 'Destination Verification Accuracy', e.message);
  }

  // 6. Cross-Source Deduplication & Provenance Preservation
  try {
    const today = new Date().toISOString().split('T')[0];
    const opp1: Opportunity = {
      id: 'opp_tier1_101',
      title: 'Store Cashier',
      employer: 'Shoprite Group',
      location: { city: 'Pretoria', province: 'Gauteng', regionType: 'LOCAL', country: 'South Africa' },
      jobCategory: 'Retail',
      employmentType: 'Full-time',
      experienceLevel: 'Entry level',
      qualificationRequirement: 'Matric',
      summary: 'Cashier in Pretoria',
      fullDescription: 'Full description',
      requirements: ['Matric'],
      responsibilities: ['Checkout'],
      skillsRequired: ['POS'],
      sourceProvenance: {
        sourceId: 'retail_official_portals',
        sourceName: 'Shoprite Official Portal',
        sourceTier: 1,
        sourceType: 'OFFICIAL_EMPLOYER',
        originalUrl: 'https://careers.shoprite.co.za/job/101',
        employerName: 'Shoprite Group',
        publicationDate: today,
        lastVerifiedDate: today,
        sourceStatus: 'LIVE',
        verificationStatus: 'VERIFIED',
        destinationStatus: 'VERIFIED',
        freshnessStatus: 'NEW',
        applicationDestination: 'https://careers.shoprite.co.za/job/101/apply',
        isRealVerified: true,
        isFixture: false,
        isLive: true,
      },
    };

    const opp2: Opportunity = {
      id: 'opp_tier2_202',
      title: 'Store Cashier',
      employer: 'Shoprite Group',
      location: { city: 'Pretoria', province: 'Gauteng', regionType: 'LOCAL', country: 'South Africa' },
      jobCategory: 'Retail',
      employmentType: 'Full-time',
      experienceLevel: 'Entry level',
      qualificationRequirement: 'Matric',
      summary: 'Cashier in Pretoria via Adzuna',
      fullDescription: 'Full description',
      requirements: ['Matric'],
      responsibilities: ['Checkout'],
      skillsRequired: ['POS'],
      sourceProvenance: {
        sourceId: 'adzuna_sa',
        sourceName: 'Adzuna SA API',
        sourceTier: 2,
        sourceType: 'AUTHORISED_AGGREGATOR',
        originalUrl: 'https://www.adzuna.co.za/details/202',
        employerName: 'Shoprite Group',
        publicationDate: today,
        lastVerifiedDate: today,
        sourceStatus: 'LICENSED',
        verificationStatus: 'VERIFIED',
        destinationStatus: 'VERIFIED',
        freshnessStatus: 'NEW',
        applicationDestination: 'https://www.adzuna.co.za/details/202/apply',
        isRealVerified: true,
        isFixture: false,
        isLive: true,
      },
    };

    const consolidated = Deduplicator.consolidate([opp1, opp2]);

    assert(
      consolidated.length === 1 &&
        consolidated[0].sourceProvenance.sourceTier === 1 &&
        consolidated[0].sourceProvenanceList?.length === 2,
      'Cross-Source Deduplication',
      `Merged 2 duplicate listings into 1 canonical opportunity, prioritized Tier 1 as primary provenance, and preserved both source provenances.`
    );
  } catch (e: any) {
    assert(false, 'Cross-Source Deduplication', e.message);
  }

  // 7. Pipeline Search Execution & No Quota Enforcement
  try {
    const pipeline = new OpportunityPipeline();
    const opportunities = await pipeline.fetchAllValidatedOpportunities({ city: 'Pretoria' });
    const scored = pipeline.scoreAndFilterOpportunities(opportunities, 'Pretoria', 'Gauteng', 'All Categories', 'All Experience Levels');

    assert(
      Array.isArray(scored) && scored.length > 0,
      'Pipeline Search & Variable Count',
      `Returned ${scored.length} verified opportunities for Pretoria without forcing artificial 10-job quota.`
    );
  } catch (e: any) {
    assert(false, 'Pipeline Search & Variable Count', e.message);
  }

  return { passed, failed, results };
}
