import { AnalyticsEvent, OperatorDashboardStats } from '../../src/types.js';

export class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private eventIdCounter = 1;

  logEvent(eventName: AnalyticsEvent['eventName'], metadata?: Record<string, any>): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: `EVT-${Date.now()}-${this.eventIdCounter++}`,
      eventName,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.events.unshift(event);
    if (this.events.length > 1000) {
      this.events.pop(); // Keep last 1000 events
    }
    return event;
  }

  getRecentEvents(limit = 20): AnalyticsEvent[] {
    return this.events.slice(0, limit);
  }

  getStats(totalOpportunities: number, verifiedOpportunities: number, sourceHealthList: any[]): OperatorDashboardStats {
    const counts = {
      searches: 0,
      opportunityClicks: 0,
      applicationStarts: 0,
      leadCaptures: 0,
      paymentsCompleted: 0,
      externalHandoffs: 0,
    };

    const locationMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();

    for (const evt of this.events) {
      if (evt.eventName === 'search_started') {
        counts.searches++;
        if (evt.metadata?.city && evt.metadata.city !== 'All') {
          const loc = evt.metadata.city;
          locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
        }
        if (evt.metadata?.category && evt.metadata.category !== 'All') {
          const cat = evt.metadata.category;
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        }
      }
      if (evt.eventName === 'opportunity_clicked') {
        counts.opportunityClicks++;
        if (evt.metadata?.title) {
          const cat = evt.metadata.category || 'General';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        }
      }
      if (evt.eventName === 'application_started') counts.applicationStarts++;
      if (evt.eventName === 'lead_captured') counts.leadCaptures++;
      if (evt.eventName === 'payment_completed') counts.paymentsCompleted++;
      if (evt.eventName === 'external_application_clicked') counts.externalHandoffs++;
    }

    const topLocations = Array.from(locationMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOpportunities,
      verifiedOpportunities,
      staleOpportunities: Math.max(0, totalOpportunities - verifiedOpportunities),
      sourceHealthList,
      topLocations,
      topCategories,
      conversionFunnel: {
        searches: counts.searches,
        opportunityClicks: counts.opportunityClicks,
        applicationStarts: counts.applicationStarts,
        leadCaptures: counts.leadCaptures,
        paymentsCompleted: counts.paymentsCompleted,
        externalHandoffs: counts.externalHandoffs,
      },
      recentAnalyticsEvents: this.getRecentEvents(25),
    };
  }
}

