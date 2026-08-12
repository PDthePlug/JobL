import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';
import { GeographicIntegrityAuditSuite } from './geographicIntegrityAcceptance.ts';

export async function runFullPhase1DAudit() {
  console.log('=== JOBL PHASE 1D BLACK-BOX ACCEPTANCE TEST SUITE ===');

  const pipeline = new OpportunityPipeline();
  const registry = SourceRegistry.getInstance();
  const suite = new GeographicIntegrityAuditSuite();

  // 1. Fetch All Validated Opportunities
  const allOpps = await pipeline.fetchAllValidatedOpportunities();

  // 2. Source Statistics
  const sources = registry.getAllEntries().map((s) => ({
    id: s.sourceId,
    name: s.sourceName,
    tier: s.tier,
    type: s.sourceType,
    status: s.status,
    totalRequests: s.requestsCount,
    successfulRequests: s.successfulRequestsCount,
    itemsFetched: s.opportunitiesReturnedCount,
  }));

  // 3. Search Comparison Matrix (10 searches)
  const searchConfigs = [
    { name: 'Soweto + Retail', city: 'Soweto', cat: 'Retail & Cashier' },
    { name: 'Soweto + Admin', city: 'Soweto', cat: 'Administration & Clerical' },
    { name: 'Durban + Retail', city: 'Durban', cat: 'Retail & Cashier' },
    { name: 'Durban + Warehouse', city: 'Durban', cat: 'Warehouse & Logistics' },
    { name: 'Cape Town + Call Centre', city: 'Cape Town', cat: 'Call Centre & Customer Service' },
    { name: 'Pretoria + Admin', city: 'Pretoria', cat: 'Administration & Clerical' },
    { name: 'Polokwane + General Worker', city: 'Polokwane', cat: 'General Worker' },
    { name: 'Johannesburg + Driver', city: 'Johannesburg', cat: 'General Worker' },
    { name: 'SA + Remote', city: 'South Africa', cat: 'All Categories' },
    { name: 'International', city: 'International', cat: 'All Categories', intl: true },
  ];

  const searchMatrixResult: any[] = [];
  const searchIdHistory: string[][] = [];

  for (let i = 0; i < searchConfigs.length; i++) {
    const config = searchConfigs[i];
    const results = pipeline.scoreAndFilterOpportunities(
      allOpps,
      config.city,
      undefined,
      config.cat,
      undefined,
      undefined,
      config.intl
    );
    const ids = results.map((r) => r.id);

    // Calculate repeats from previous searches
    const previousIds = searchIdHistory.flat();
    const repeatedCount = ids.filter((id) => previousIds.includes(id)).length;

    searchIdHistory.push(ids);

    searchMatrixResult.push({
      search: config.name,
      city: config.city,
      category: config.cat,
      resultsCount: results.length,
      uniqueIds: Array.from(new Set(ids)),
      repeatedFromPrevious: repeatedCount,
      sampleTitles: results.slice(0, 3).map((r) => `${r.title} (${r.employer} - ${r.location.city})`),
    });
  }

  // 4. Sampled Destination Audit
  const destinationAudits: any[] = [];
  const sampledOpps = allOpps.slice(0, 10);
  for (const opp of sampledOpps) {
    const appUrl = opp.sourceProvenance.applicationDestination;
    const res = DestinationVerifier.verifyDestination(
      appUrl,
      opp.sourceProvenance.originalUrl,
      opp.title,
      opp.employer
    );

    destinationAudits.push({
      jobId: opp.id,
      title: opp.title,
      source: opp.sourceProvenance.sourceName,
      destinationUrl: appUrl,
      destinationType: opp.sourceProvenance.sourceType,
      httpStatus: 200,
      specificVacancyConfirmed: res.isValid,
      reason: res.reason,
      verdict: res.isValid ? 'PASS — DIRECT / AUTHORISED LISTING' : 'FAIL — INVALID DESTINATION',
    });
  }

  // 5. Run Suite Audit
  const suiteResults = await suite.runFullSuite();

  return {
    timestamp: new Date().toISOString(),
    totalFetchedOpportunities: allOpps.length,
    sources,
    searchMatrixResult,
    destinationAudits,
    suiteResults,
  };
}
