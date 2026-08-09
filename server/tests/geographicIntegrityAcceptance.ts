import { OpportunityPipeline } from '../services/opportunityPipeline.ts';
import { DestinationVerifier } from '../services/destinationVerifier.ts';

export interface GeographicIntegrityTestResult {
  scenarioName: string;
  query: {
    city?: string;
    province?: string;
    category?: string;
    includeInternational?: boolean;
  };
  passed: boolean;
  totalReturned: number;
  matchingCount: number;
  violationsCount: number;
  violations: string[];
  sampleTitles: string[];
}

export class GeographicIntegrityAuditSuite {
  private pipeline: OpportunityPipeline;

  constructor() {
    this.pipeline = new OpportunityPipeline();
  }

  public async runFullSuite(): Promise<{
    timestamp: string;
    allPassed: boolean;
    scenarios: GeographicIntegrityTestResult[];
    summary: {
      totalScenarios: number;
      passedScenarios: number;
      failedScenarios: number;
    };
  }> {
    const allOpportunities = await this.pipeline.fetchAllValidatedOpportunities();

    const scenarios: GeographicIntegrityTestResult[] = [];

    // 1. Soweto + Retail
    const sowetoRetail = this.runScenario(
      'Soweto + Retail Search',
      { city: 'Soweto', category: 'Retail & Cashier' },
      allOpportunities,
      (opp) => {
        const isRetail = opp.jobCategory.toLowerCase().includes('retail') || opp.title.toLowerCase().includes('cashier') || opp.title.toLowerCase().includes('retail');
        const isNear = opp.location.city.toLowerCase().includes('soweto') ||
                       opp.location.city.toLowerCase().includes('johannesburg') ||
                       opp.location.province.toLowerCase().includes('gauteng') ||
                       opp.location.regionType === 'REMOTE_SA';
        return isRetail && isNear;
      }
    );
    scenarios.push(sowetoRetail);

    // 2. Durban + Warehouse
    const durbanWarehouse = this.runScenario(
      'Durban + Warehouse Search',
      { city: 'Durban', category: 'Warehouse & Logistics' },
      allOpportunities,
      (opp) => {
        const isWarehouse = opp.jobCategory.toLowerCase().includes('warehouse') || opp.jobCategory.toLowerCase().includes('general') || opp.title.toLowerCase().includes('warehouse') || opp.title.toLowerCase().includes('stock') || opp.title.toLowerCase().includes('logistics');
        const isDurbanKZN = opp.location.city.toLowerCase().includes('durban') || opp.location.province.toLowerCase().includes('kwazulu') || opp.location.regionType === 'REMOTE_SA';
        return isWarehouse && isDurbanKZN;
      }
    );
    scenarios.push(durbanWarehouse);

    // 3. Cape Town + Call Centre
    const capeTownCallCentre = this.runScenario(
      'Cape Town + Call Centre Search',
      { city: 'Cape Town', category: 'Call Centre & Customer Service' },
      allOpportunities,
      (opp) => {
        const isCallCentre = opp.jobCategory.toLowerCase().includes('call centre') || opp.jobCategory.toLowerCase().includes('customer') || opp.title.toLowerCase().includes('customer') || opp.title.toLowerCase().includes('chat') || opp.title.toLowerCase().includes('assistant');
        const isCapeTownWA = opp.location.city.toLowerCase().includes('cape town') || opp.location.province.toLowerCase().includes('western cape') || opp.location.regionType === 'REMOTE_SA';
        return isCallCentre && isCapeTownWA;
      }
    );
    scenarios.push(capeTownCallCentre);

    // 4. Pretoria + Administration
    const pretoriaAdmin = this.runScenario(
      'Pretoria + Administration Search',
      { city: 'Pretoria', category: 'Administration & Clerical' },
      allOpportunities,
      (opp) => {
        const isAdmin = opp.jobCategory.toLowerCase().includes('admin') || opp.title.toLowerCase().includes('clerk') || opp.title.toLowerCase().includes('assistant');
        const isPretoriaGauteng = opp.location.city.toLowerCase().includes('pretoria') || opp.location.province.toLowerCase().includes('gauteng') || opp.location.regionType === 'REMOTE_SA';
        return isAdmin && isPretoriaGauteng;
      }
    );
    scenarios.push(pretoriaAdmin);

    // 5. South Africa + Remote
    const saRemote = this.runScenario(
      'South Africa + Remote Search',
      { city: 'South Africa', category: 'All Categories' },
      allOpportunities,
      (opp) => opp.location.regionType === 'REMOTE_SA' || opp.location.remoteStatus === 'REMOTE_SA' || opp.location.country === 'South Africa'
    );
    scenarios.push(saRemote);

    // 6. South Africa + International
    const saInternational = this.runScenario(
      'South Africa + International Search',
      { city: 'International', category: 'All Categories', includeInternational: true },
      allOpportunities,
      (opp) => opp.location.regionType === 'REMOTE_INT' || opp.location.remoteStatus === 'REMOTE_INT' || opp.salary?.currency === 'USD'
    );
    scenarios.push(saInternational);

    // 7. Geographic Containment Boundary Audit
    const geoContainmentViolations: string[] = [];
    for (const opp of allOpportunities) {
      const country = (opp.location.country || '').trim().toLowerCase();
      const isSA = country === 'south africa' || country === 'za';
      const isRemoteSA = opp.location.regionType === 'REMOTE_SA' || opp.location.remoteStatus === 'REMOTE_SA';
      const isSAEligible = opp.location.geographicEligibility?.isSouthAfricaEligible ?? true;

      if (!isSA && !isRemoteSA && !isSAEligible) {
        geoContainmentViolations.push(`Opportunity ${opp.id} (${opp.title}) in country '${opp.location.country}' is not eligible for South Africa boundary.`);
      }
    }
    scenarios.push({
      scenarioName: 'Geographic Containment Boundary Audit',
      query: { city: 'South Africa Boundary' },
      passed: geoContainmentViolations.length === 0,
      totalReturned: allOpportunities.length,
      matchingCount: allOpportunities.length - geoContainmentViolations.length,
      violationsCount: geoContainmentViolations.length,
      violations: geoContainmentViolations,
      sampleTitles: allOpportunities.slice(0, 3).map((o) => o.title),
    });

    // 8. Freshness Audit
    const todayStr = new Date().toISOString().split('T')[0];
    const freshnessViolations: string[] = [];
    for (const opp of allOpportunities) {
      if (opp.expiresAt && opp.expiresAt < todayStr) {
        freshnessViolations.push(`Opportunity ${opp.id} (${opp.title}) expired on ${opp.expiresAt}`);
      }
      if (opp.closingDate && opp.closingDate < todayStr) {
        freshnessViolations.push(`Opportunity ${opp.id} (${opp.title}) closed on ${opp.closingDate}`);
      }
    }
    scenarios.push({
      scenarioName: 'Freshness & Expiry Audit',
      query: { city: 'Freshness Check' },
      passed: freshnessViolations.length === 0,
      totalReturned: allOpportunities.length,
      matchingCount: allOpportunities.length - freshnessViolations.length,
      violationsCount: freshnessViolations.length,
      violations: freshnessViolations,
      sampleTitles: allOpportunities.slice(0, 3).map((o) => o.title),
    });

    // 9. Destination Integrity Audit
    const destinationViolations: string[] = [];
    for (const opp of allOpportunities) {
      const appUrl = opp.sourceProvenance.applicationDestination;
      const res = DestinationVerifier.verifyDestination(
        appUrl,
        opp.sourceProvenance.originalUrl,
        opp.title,
        opp.employer
      );
      if (!res.isValid) {
        destinationViolations.push(`Opportunity ${opp.id} (${opp.title}) has invalid destination URL '${appUrl}': ${res.reason}`);
      }
    }
    scenarios.push({
      scenarioName: 'Destination Integrity Audit',
      query: { city: 'Destination Check' },
      passed: destinationViolations.length === 0,
      totalReturned: allOpportunities.length,
      matchingCount: allOpportunities.length - destinationViolations.length,
      violationsCount: destinationViolations.length,
      violations: destinationViolations,
      sampleTitles: allOpportunities.slice(0, 3).map((o) => o.title),
    });

    const passedCount = scenarios.filter((s) => s.passed).length;

    return {
      timestamp: new Date().toISOString(),
      allPassed: passedCount === scenarios.length,
      scenarios,
      summary: {
        totalScenarios: scenarios.length,
        passedScenarios: passedCount,
        failedScenarios: scenarios.length - passedCount,
      },
    };
  }

  private runScenario(
    scenarioName: string,
    query: { city?: string; province?: string; category?: string; includeInternational?: boolean },
    allOpportunities: any[],
    validator: (opp: any) => boolean
  ): GeographicIntegrityTestResult {
    const filtered = this.pipeline.scoreAndFilterOpportunities(
      allOpportunities,
      query.city,
      query.province,
      query.category,
      undefined,
      query.includeInternational
    );

    const violations: string[] = [];
    filtered.forEach((opp) => {
      if (!validator(opp)) {
        violations.push(`Opportunity ${opp.id} (${opp.title} - ${opp.jobCategory} in ${opp.location.city}) does not strictly satisfy criteria for scenario '${scenarioName}'.`);
      }
    });

    return {
      scenarioName,
      query,
      passed: filtered.length > 0 && violations.length === 0,
      totalReturned: filtered.length,
      matchingCount: filtered.length - violations.length,
      violationsCount: violations.length,
      violations,
      sampleTitles: filtered.map((o) => `${o.title} (${o.employer} - ${o.location.city})`),
    };
  }
}
