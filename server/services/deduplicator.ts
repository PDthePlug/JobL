import { JobSourceProvenance, Opportunity } from '../../src/types.ts';

export class Deduplicator {
  /**
   * Normalizes a string for deduplication comparison (lowercased, alphanumeric)
   */
  public static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Generates a unique deduplication key for an opportunity
   */
  public static generateDeduplicationKey(opp: Opportunity): string {
    const employerNorm = this.normalizeString(opp.employer);
    const titleNorm = this.normalizeString(opp.title);
    const cityNorm = this.normalizeString(opp.location.city);

    return `${employerNorm}_${titleNorm}_${cityNorm}`;
  }

  /**
   * Consolidates array of opportunities, merging duplicates into canonical opportunities
   * while preserving source provenance list
   */
  public static consolidate(opportunities: Opportunity[]): Opportunity[] {
    const map = new Map<string, Opportunity>();

    for (const opp of opportunities) {
      const key = this.generateDeduplicationKey(opp);
      opp.deduplicationKey = key;

      if (!map.has(key)) {
        // Initialize sourceProvenanceList with primary provenance
        const copy: Opportunity = {
          ...opp,
          sourceProvenanceList: [opp.sourceProvenance],
        };
        map.set(key, copy);
      } else {
        const existing = map.get(key)!;
        
        // Merge provenance into existing's sourceProvenanceList
        if (!existing.sourceProvenanceList) {
          existing.sourceProvenanceList = [existing.sourceProvenance];
        }
        
        // Check if this provenance is already in the list
        const alreadyInList = existing.sourceProvenanceList.some(
          (p) => p.sourceId === opp.sourceProvenance.sourceId
        );
        if (!alreadyInList) {
          existing.sourceProvenanceList.push(opp.sourceProvenance);
        }

        // If newly incoming opportunity is from a higher Tier (Tier 1 < Tier 2), upgrade primary
        if (opp.sourceProvenance.sourceTier < existing.sourceProvenance.sourceTier) {
          existing.sourceProvenance = opp.sourceProvenance;
          existing.id = opp.id; // prefer Tier 1 ID
          if (opp.salary && !existing.salary) {
            existing.salary = opp.salary;
          }
        }
      }
    }

    return Array.from(map.values());
  }
}
