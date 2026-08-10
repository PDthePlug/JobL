import { Opportunity, SourceHealth } from '../../src/types.ts';
import {
  ISourceAdapter,
  SourceQueryParams,
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
import { SourceRegistry } from '../adapters/sourceRegistry.ts';
import { DestinationVerifier } from './destinationVerifier.ts';
import { Deduplicator } from './deduplicator.ts';

export class OpportunityPipeline {
  private adapters: ISourceAdapter[] = [];
  private registry: SourceRegistry;

  constructor() {
    this.registry = SourceRegistry.getInstance();
    this.adapters = [
      new DpsaPublicVacanciesAdapter(),
      new DelLabourVacanciesAdapter(),
      new SayouthMobiAdapter(),
      new CciSouthAfricaAdapter(),
      new RetailCorporateAdapter(),
      new AdzunaAdapter(),
      new JoobleAdapter(),
      new CareerjetAdapter(),
      new PNetAdapter(),
    ];
  }

  /**
   * Get overall health status of all registered sources from SourceRegistry
   */
  async getSourceHealth(): Promise<SourceHealth[]> {
    return this.registry.getSourceHealthList();
  }

  /**
   * Source Query Planner & Pipeline Orchestrator:
   * 1. Planner selects active sources
   * 2. Queries enabled sources in parallel
   * 3. Normalizes & applies freshness / environment checks
   * 4. Runs Destination Verifier
   * 5. Runs Deduplicator across sources
   */
  async fetchAllValidatedOpportunities(params?: SourceQueryParams): Promise<Opportunity[]> {
    let rawList: Opportunity[] = [];

    // 1. Source Query Planner
    const isProduction = process.env.NODE_ENV === 'production';
    const todayStr = new Date().toISOString().split('T')[0];

    const activeAdapters = this.adapters.filter((adapter) => {
      const entry = this.registry.getEntry(adapter.sourceId);
      if (!entry) return true;
      if (entry.status === 'DISABLED' || entry.status === 'PARTNERSHIP_REQUIRED') {
        return false;
      }
      return true;
    });

    // 2. Fetch from active adapters in parallel
    const results = await Promise.allSettled(
      activeAdapters.map((adapter) => adapter.fetchOpportunities(params))
    );

    results.forEach((res, index) => {
      const adapter = activeAdapters[index];
      if (res.status === 'fulfilled') {
        rawList.push(...res.value);
      } else {
        console.error(`Error querying source adapter ${adapter.sourceId}:`, res.reason);
        this.registry.recordRequest(adapter.sourceId, false);
      }
    });

    // 3. Normalization, Geographic Containment & Freshness checks
    const normalized = rawList.filter((item) => {
      // Exclude fixtures in production
      if (isProduction && (item.isFixture || item.sourceProvenance.isFixture || item.sourceProvenance.sourceStatus === 'FIXTURE')) {
        return false;
      }

      // Exclude unverified live sources (fixtures have isRealVerified=false by design)
      if (!item.isFixture && (item.sourceProvenance.verificationStatus === 'UNVERIFIED' || item.sourceProvenance.isRealVerified === false)) {
        return false;
      }

      // Check basic employer & title existence
      if (!item.title || !item.employer) {
        return false;
      }

      // Freshness check: Reject expired jobs
      if (item.expiresAt && item.expiresAt < todayStr) {
        return false;
      }
      if (item.closingDate && item.closingDate < todayStr) {
        return false;
      }
      if (item.sourceProvenance.freshnessStatus === 'EXPIRED') {
        return false;
      }

      // Geographic containment: Enforce South Africa boundary
      const country = (item.location.country || 'South Africa').trim().toLowerCase();
      const isSA = country === 'south africa' || country === 'za';
      const isRemoteSA = item.location.regionType === 'REMOTE_SA' || item.location.remoteStatus === 'REMOTE_SA';
      const isSAEligible = item.location.geographicEligibility?.isSouthAfricaEligible ?? true;

      // Reject non-South Africa jobs unless explicitly marked as SA-eligible remote
      if (!isSA && !isRemoteSA && !isSAEligible) {
        return false;
      }

      return true;
    });

    // 4. Destination Verification
    const verifiedList: Opportunity[] = [];
    for (const opp of normalized) {
      const verified = DestinationVerifier.verifyOpportunity(opp);
      if (
        verified.sourceProvenance.destinationStatus === 'VERIFIED' ||
        verified.sourceProvenance.destinationStatus === 'LISTING_ONLY'
      ) {
        verifiedList.push(verified);
      } else {
        this.registry.recordRequest(opp.sourceProvenance.sourceId, true, 0, 1, 1);
      }
    }

    // 5. Cross-Source Deduplication
    const consolidated = Deduplicator.consolidate(verifiedList);

    return consolidated;
  }

  /**
   * Deterministic Job Matching & Ranking Engine:
   * Scores and filters opportunities based on location, category, experience, freshness, and source tier confidence.
   * Does NOT force an artificial 10-job quota. Returns exact valid matches.
   */
  scoreAndFilterOpportunities(
    opportunities: Opportunity[],
    userCity?: string,
    userProvince?: string,
    userCategory?: string,
    userExperience?: string,
    includeInternational: boolean = false
  ): Opportunity[] {
    const scored = opportunities
      .map((opp) => {
        let score = 50; // base score
        const matchExplanation: string[] = [];

        // Tier Confidence Boost
        if (opp.sourceProvenance.sourceTier === 1) {
          score += 15;
          matchExplanation.push('Official Direct Government / Employer Source');
        } else if (opp.sourceProvenance.sourceTier === 2) {
          score += 10;
          matchExplanation.push('Authorised Licensed Aggregator');
        }

        // Check Remote/International preference
        const isRemoteInt = opp.location.regionType === 'REMOTE_INT' || opp.location.remoteStatus === 'REMOTE_INT';
        const isInternationalRequested = userCity === 'International' || userCategory === 'International' || includeInternational;

        if (isRemoteInt && !isInternationalRequested) {
          // Reject international jobs in standard local searches
          return null;
        }

        // 1. Location Matching
        const oppCity = opp.location.city.toLowerCase();
        const oppProvince = opp.location.province.toLowerCase();
        const oppSub = opp.location.suburbOrTownship ? opp.location.suburbOrTownship.toLowerCase() : '';
        const targetCity = userCity && userCity !== 'All Locations' ? userCity.toLowerCase().trim() : '';
        const targetProvince = userProvince && userProvince !== 'All Provinces' ? userProvince.toLowerCase().trim() : '';

        let locationMatch = false;

        if (!targetCity && !targetProvince) {
          locationMatch = true;
        } else if (targetCity === 'south africa' || targetCity === 'all' || targetCity === 'nationwide') {
          locationMatch = true;
          score += 20;
          matchExplanation.push('South Africa Nationwide Search');
        } else if (targetCity === 'international' || isInternationalRequested) {
          if (isRemoteInt || opp.location.country !== 'South Africa' || opp.location.regionType === 'REMOTE_INT') {
            locationMatch = true;
            score += 25;
            matchExplanation.push('International / Global Remote Opportunity');
          }
        } else {
          // Township / City mapping rules (e.g., Soweto -> Johannesburg, Tembisa -> Gauteng/Ekurhuleni)
          const isSowetoMatch = targetCity === 'soweto' && (oppCity.includes('johannesburg') || oppSub.includes('soweto') || oppCity.includes('soweto') || oppProvince.includes('gauteng'));
          const isCityMatch = targetCity && (oppCity.includes(targetCity) || targetCity.includes(oppCity) || (oppSub && oppSub.includes(targetCity)));

          if (isCityMatch || isSowetoMatch) {
            score += 30;
            matchExplanation.push(`Near you in ${opp.location.city}${opp.location.suburbOrTownship ? ' (' + opp.location.suburbOrTownship + ')' : ''}`);
            locationMatch = true;
          } else if (opp.location.regionType === 'REMOTE_SA' || opp.location.remoteStatus === 'REMOTE_SA') {
            score += 25;
            matchExplanation.push('Nationwide Remote in South Africa');
            locationMatch = true;
          } else if (targetProvince && oppProvince === targetProvince) {
            score += 15;
            matchExplanation.push(`Located in your province (${opp.location.province})`);
            locationMatch = true;
          } else if (isRemoteInt && isInternationalRequested) {
            score += 20;
            matchExplanation.push('International / Global Remote Opportunity');
            locationMatch = true;
          }
        }

        // 2. Job Category Containment & Matching
        let categoryMatch = false;
        if (!userCategory || userCategory === 'All Categories') {
          categoryMatch = true;
        } else {
          const catNorm = userCategory.toLowerCase();
          const oppCatNorm = opp.jobCategory.toLowerCase();

          // Category mapping & strict containment
          if (catNorm.includes('retail') || catNorm.includes('cashier')) {
            categoryMatch = oppCatNorm.includes('retail') || oppCatNorm.includes('cashier') || opp.title.toLowerCase().includes('cashier') || opp.title.toLowerCase().includes('retail');
          } else if (catNorm.includes('warehouse') || catNorm.includes('logistics')) {
            categoryMatch = oppCatNorm.includes('warehouse') || oppCatNorm.includes('logistics') || oppCatNorm.includes('general worker') || opp.title.toLowerCase().includes('warehouse') || opp.title.toLowerCase().includes('stock');
          } else if (catNorm.includes('call centre') || catNorm.includes('customer')) {
            categoryMatch = oppCatNorm.includes('call centre') || oppCatNorm.includes('customer') || opp.title.toLowerCase().includes('customer') || opp.title.toLowerCase().includes('chat');
          } else if (catNorm.includes('admin') || catNorm.includes('clerical')) {
            categoryMatch = oppCatNorm.includes('admin') || oppCatNorm.includes('clerical') || opp.title.toLowerCase().includes('clerk') || opp.title.toLowerCase().includes('assistant');
          } else if (catNorm.includes('general')) {
            categoryMatch = oppCatNorm.includes('general') || opp.title.toLowerCase().includes('general') || opp.title.toLowerCase().includes('grounds');
          } else if (catNorm.includes('sales') || catNorm.includes('promoter')) {
            categoryMatch = oppCatNorm.includes('sales') || oppCatNorm.includes('promoter') || opp.title.toLowerCase().includes('sales');
          } else {
            categoryMatch = oppCatNorm === catNorm || oppCatNorm.includes(catNorm) || catNorm.includes(oppCatNorm);
          }

          if (categoryMatch) {
            score += 20;
            matchExplanation.push(`Matches requested category (${opp.jobCategory})`);
          }
        }

        // 3. Experience Level Matching
        let experienceMatch = false;
        if (!userExperience || userExperience === 'All Experience Levels') {
          experienceMatch = true;
        } else {
          if (opp.experienceLevel === userExperience) {
            score += 10;
            matchExplanation.push(`Matches your experience level (${opp.experienceLevel})`);
            experienceMatch = true;
          } else if (
            userExperience === 'No experience' &&
            (opp.experienceLevel === 'Entry level' || opp.experienceLevel === 'No experience')
          ) {
            score += 10;
            matchExplanation.push('Entry-level / No prior experience required');
            experienceMatch = true;
          }
        }

        if (!locationMatch || !categoryMatch || !experienceMatch) {
          return null;
        }

        // 4. Freshness Signal
        if (opp.sourceProvenance.freshnessStatus === 'NEW') {
          score += 5;
          matchExplanation.push('Verified recent vacancy');
        }

        const finalScore = Math.max(10, Math.min(99, score));

        return {
          ...opp,
          matchScore: finalScore,
          matchExplanation:
            matchExplanation.length > 0 ? matchExplanation : ['Relevant verified job opportunity in South Africa'],
        };
      })
      .filter(Boolean) as Opportunity[];

    // Sort by match score descending
    return scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }
}
