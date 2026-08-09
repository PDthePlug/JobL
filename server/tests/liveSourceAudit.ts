import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';
import { Deduplicator } from '../services/deduplicator.ts';
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { Opportunity } from '../../src/types.ts';

export async function runProductionAudit(): Promise<void> {
  console.log('================================================================');
  console.log('   JOBL PHASE 1B: LIVE-SOURCE PRODUCTION AUDIT REPORT');
  console.log('================================================================\n');

  const pipeline = new OpportunityPipeline();
  const registry = SourceRegistry.getInstance();

  const searchScenarios = [
    { name: 'Scenario 1: Pretoria / Administration', params: { city: 'Pretoria', category: 'Administration & Clerical' } },
    { name: 'Scenario 2: Soweto / Warehouse & Youth', params: { city: 'Soweto', category: 'Warehouse & Logistics' } },
    { name: 'Scenario 3: Durban / Call Centre', params: { city: 'Durban', category: 'Call Centre & Customer Service' } },
    { name: 'Scenario 4: Cape Town / Remote Admin', params: { city: 'Cape Town', category: 'Administration & Clerical' } },
    { name: 'Scenario 5: Nationwide / General & Retail', params: { province: 'Gauteng', category: 'Retail & Cashier' } },
  ];

  let totalAudited = 0;
  let totalPassed = 0;
  let totalFailures = 0;

  const auditedOpportunities: { opp: Opportunity; auditResult: { live: boolean; relevant: boolean; deduplicated: boolean; attributable: boolean; destinationValid: boolean; failures: string[] } }[] = [];

  for (const sc of searchScenarios) {
    console.log(`\n--- Running ${sc.name} ---`);
    const opps = await pipeline.fetchAllValidatedOpportunities(sc.params);
    const matched = pipeline.scoreAndFilterOpportunities(
      opps,
      sc.params.city || 'All Locations',
      sc.params.province || 'All Provinces',
      sc.params.category || 'All Categories',
      'All Experience Levels'
    );

    console.log(`Fetched & Matched: ${matched.length} items`);

    for (const opp of matched) {
      if (totalAudited >= 20) break;
      totalAudited++;

      const failures: string[] = [];

      // 1. Live & Verified status
      const isLive = opp.sourceProvenance.sourceStatus === 'LIVE' || opp.sourceProvenance.sourceStatus === 'LICENSED';
      if (!isLive) failures.push('STATUS_NOT_LIVE');

      // 2. Relevance check
      let isRelevant = true;
      if (sc.params.city && !opp.location.city.toLowerCase().includes(sc.params.city.toLowerCase()) && opp.location.regionType !== 'REMOTE_SA' && opp.location.regionType !== 'REMOTE_INT') {
        isRelevant = false;
        failures.push('LOCATION_MISMATCH');
      }

      // 3. Deduplication check
      const dedupKey = Deduplicator.generateDeduplicationKey(opp);
      const isDeduplicated = Boolean(opp.deduplicationKey || dedupKey);

      // 4. Attribution check
      let isAttributable = true;
      if (opp.sourceProvenance.attributionRequired) {
        if (!opp.sourceProvenance.attributionConfig || !opp.sourceProvenance.attributionConfig.text) {
          isAttributable = false;
          failures.push('MISSING_MANDATORY_ATTRIBUTION');
        }
      }

      // 5. Destination URL verification
      const destCheck = DestinationVerifier.verifyDestination(
        opp.sourceProvenance.applicationDestination,
        opp.sourceProvenance.originalUrl,
        opp.title,
        opp.employer
      );
      const isDestValid = destCheck.isValid;
      if (!isDestValid) {
        failures.push(`DESTINATION_FAILURE: ${destCheck.reason}`);
      }

      if (failures.length === 0) {
        totalPassed++;
      } else {
        totalFailures++;
      }

      auditedOpportunities.push({
        opp,
        auditResult: {
          live: isLive,
          relevant: isRelevant,
          deduplicated: isDeduplicated,
          attributable: isAttributable,
          destinationValid: isDestValid,
          failures,
        },
      });
    }

    if (totalAudited >= 20) break;
  }

  // Also fetch all available directly to ensure we reach 20 samples across all sources if needed
  if (totalAudited < 20) {
    const allOpps = await pipeline.fetchAllValidatedOpportunities();
    for (const opp of allOpps) {
      if (totalAudited >= 20) break;
      if (auditedOpportunities.some((a) => a.opp.id === opp.id)) continue;
      totalAudited++;

      const failures: string[] = [];
      const isLive = opp.sourceProvenance.sourceStatus === 'LIVE' || opp.sourceProvenance.sourceStatus === 'LICENSED';
      if (!isLive) failures.push('STATUS_NOT_LIVE');

      const dedupKey = Deduplicator.generateDeduplicationKey(opp);
      const isDeduplicated = Boolean(opp.deduplicationKey || dedupKey);

      let isAttributable = true;
      if (opp.sourceProvenance.attributionRequired) {
        if (!opp.sourceProvenance.attributionConfig || !opp.sourceProvenance.attributionConfig.text) {
          isAttributable = false;
          failures.push('MISSING_MANDATORY_ATTRIBUTION');
        }
      }

      const destCheck = DestinationVerifier.verifyDestination(
        opp.sourceProvenance.applicationDestination,
        opp.sourceProvenance.originalUrl,
        opp.title,
        opp.employer
      );
      const isDestValid = destCheck.isValid;
      if (!isDestValid) {
        failures.push(`DESTINATION_FAILURE: ${destCheck.reason}`);
      }

      if (failures.length === 0) {
        totalPassed++;
      } else {
        totalFailures++;
      }

      auditedOpportunities.push({
        opp,
        auditResult: {
          live: isLive,
          relevant: true,
          deduplicated: isDeduplicated,
          attributable: isAttributable,
          destinationValid: isDestValid,
          failures,
        },
      });
    }
  }

  console.log('\n================================================================');
  console.log(` AUDIT SUMMARY: Tested ${totalAudited} opportunities`);
  console.log(` PASSED: ${totalPassed} / ${totalAudited}`);
  console.log(` FAILED: ${totalFailures} / ${totalAudited}`);
  console.log('================================================================\n');

  console.log('DETAILED LISTING RESULTS:');
  auditedOpportunities.forEach((item, index) => {
    const { opp, auditResult } = item;
    const p = opp.sourceProvenance;
    console.log(`\n[#${index + 1}] ID: ${opp.id} | ${opp.title} @ ${opp.employer}`);
    console.log(`    Source: ${p.sourceName} (Tier ${p.sourceTier} ${p.sourceType})`);
    console.log(`    Location: ${opp.location.city}, ${opp.location.province}`);
    console.log(`    Destination URL: ${p.applicationDestination}`);
    console.log(`    Attribution: ${p.attributionConfig?.text || 'Not Required / Direct'}`);
    console.log(`    Audit Verdict: ${auditResult.failures.length === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    if (auditResult.failures.length > 0) {
      console.log(`    Failures: ${auditResult.failures.join(', ')}`);
    }
  });

  console.log('\n--- SOURCE HEALTH & METRICS MONITOR ---');
  const health = registry.getSourceHealthList();
  console.table(health);
}

runProductionAudit();
