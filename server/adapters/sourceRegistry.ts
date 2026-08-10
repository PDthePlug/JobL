import { SourceRegistryEntry, SourceHealth, SourceAdapterStatus } from '../../src/types.ts';

export class SourceRegistry {
  private static instance: SourceRegistry;
  private registryMap: Map<string, SourceRegistryEntry> = new Map();

  private constructor() {
    this.initDefaultRegistry();
  }

  public static getInstance(): SourceRegistry {
    if (!SourceRegistry.instance) {
      SourceRegistry.instance = new SourceRegistry();
    }
    return SourceRegistry.instance;
  }

  private initDefaultRegistry() {
    // TIER 1 — OFFICIAL / DIRECT
    this.register({
      sourceId: 'dpsa_gov_za',
      sourceName: 'DPSA Public Service Vacancies',
      tier: 1,
      sourceType: 'GOVERNMENT',
      status: 'LIVE_EXTERNAL',
      authType: 'PUBLIC',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: true,
      attributionRequired: false,
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    this.register({
      sourceId: 'labour_gov_za',
      sourceName: 'Dept of Employment & Labour Portal',
      tier: 1,
      sourceType: 'GOVERNMENT',
      status: 'STATIC_FIXTURE',
      authType: 'PUBLIC',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: true,
      attributionRequired: false,
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    this.register({
      sourceId: 'sayouth_mobi',
      sourceName: 'SA Youth / YES Network Portal',
      tier: 1,
      sourceType: 'OFFICIAL_EMPLOYER',
      status: 'STATIC_FIXTURE',
      authType: 'PUBLIC',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: true,
      attributionRequired: false,
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    this.register({
      sourceId: 'cci_sa_careers',
      sourceName: 'CCI South Africa Career Portal',
      tier: 1,
      sourceType: 'OFFICIAL_EMPLOYER',
      status: 'STATIC_FIXTURE',
      authType: 'PUBLIC',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: true,
      attributionRequired: false,
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    this.register({
      sourceId: 'retail_official_portals',
      sourceName: 'Official Employer Portals (Shoprite, Capitec, Transnet, Vodacom)',
      tier: 1,
      sourceType: 'OFFICIAL_EMPLOYER',
      status: 'STATIC_FIXTURE',
      authType: 'PUBLIC',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: true,
      attributionRequired: false,
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    // TIER 2 — AUTHORISED AGGREGATORS
    this.register({
      sourceId: 'adzuna_sa',
      sourceName: 'Adzuna SA API',
      tier: 2,
      sourceType: 'AUTHORISED_AGGREGATOR',
      status: 'LIVE_EXTERNAL',
      authType: 'API_KEY',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: false,
      attributionRequired: true,
      termsUrl: 'https://www.adzuna.co.za/terms-and-conditions.html',
      attributionConfig: {
        providerName: 'Adzuna',
        text: 'Powered by Adzuna',
        termsUrl: 'https://www.adzuna.co.za/',
      },
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    this.register({
      sourceId: 'jooble_sa',
      sourceName: 'Jooble REST API',
      tier: 2,
      sourceType: 'AUTHORISED_AGGREGATOR',
      status: 'LIVE_EXTERNAL',
      authType: 'API_KEY',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: false,
      attributionRequired: true,
      termsUrl: 'https://za.jooble.org/terms',
      attributionConfig: {
        providerName: 'Jooble',
        text: 'Powered by Jooble',
        termsUrl: 'https://za.jooble.org/',
      },
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    this.register({
      sourceId: 'careerjet_sa',
      sourceName: 'Careerjet Publisher API',
      tier: 2,
      sourceType: 'AUTHORISED_AGGREGATOR',
      status: 'LIVE_EXTERNAL',
      authType: 'API_KEY',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: false,
      attributionRequired: true,
      termsUrl: 'https://www.careerjet.co.za/about/terms_use.html',
      attributionConfig: {
        providerName: 'Careerjet',
        text: 'Powered by Careerjet',
        termsUrl: 'https://www.careerjet.co.za/',
      },
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });

    // TIER 3 — PARTNERSHIPS
    this.register({
      sourceId: 'pnet_sa_partnership',
      sourceName: 'PNet Recruitment Partnership Feed',
      tier: 3,
      sourceType: 'PARTNER',
      status: 'PARTNERSHIP_REQUIRED',
      authType: 'PARTNERSHIP_FEED',
      supportsSearch: true,
      supportsLocation: true,
      supportsPagination: true,
      supportsDirectApplication: true,
      attributionRequired: true,
      termsUrl: 'https://www.pnet.co.za/terms.html',
      attributionConfig: {
        providerName: 'PNet',
        text: 'Provided via PNet Partnership',
        termsUrl: 'https://www.pnet.co.za/',
      },
      requestsCount: 0,
      successfulRequestsCount: 0,
      failedRequestsCount: 0,
      opportunitiesReturnedCount: 0,
      opportunitiesRejectedCount: 0,
      destinationFailuresCount: 0,
    });
  }

  public register(entry: SourceRegistryEntry): void {
    this.registryMap.set(entry.sourceId, entry);
  }

  public getEntry(sourceId: string): SourceRegistryEntry | undefined {
    return this.registryMap.get(sourceId);
  }

  public getAllEntries(): SourceRegistryEntry[] {
    return Array.from(this.registryMap.values());
  }

  public getActiveEntries(): SourceRegistryEntry[] {
    return Array.from(this.registryMap.values()).filter(
      (entry) => entry.status === 'LIVE' || entry.status === 'LIVE_EXTERNAL' || entry.status === 'LICENSED' || entry.status === 'PARTNER'
    );
  }

  public recordRequest(sourceId: string, success: boolean, returnedCount: number = 0, rejectedCount: number = 0, destFailures: number = 0) {
    const entry = this.registryMap.get(sourceId);
    if (!entry) return;

    entry.requestsCount++;
    const now = new Date().toISOString();

    if (success) {
      entry.successfulRequestsCount++;
      entry.lastSuccessfulSync = now;
    } else {
      entry.failedRequestsCount++;
      entry.lastFailure = now;
    }

    entry.opportunitiesReturnedCount += returnedCount;
    entry.opportunitiesRejectedCount += rejectedCount;
    entry.destinationFailuresCount += destFailures;
  }

  public getSourceHealthList(): SourceHealth[] {
    return Array.from(this.registryMap.values()).map((entry) => ({
      sourceId: entry.sourceId,
      sourceName: entry.sourceName,
      sourceType: entry.sourceType,
      status: entry.status,
      totalListingsCount: entry.opportunitiesReturnedCount,
      lastSyncTime: entry.lastSuccessfulSync || 'Never',
      errorMessage: entry.lastFailure ? `Last failed at ${entry.lastFailure}` : undefined,
    }));
  }
}
