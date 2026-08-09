import { DestinationStatus, JobSourceProvenance, Opportunity } from '../../src/types.ts';

export interface VerificationResult {
  destinationStatus: DestinationStatus;
  isValid: boolean;
  reason?: string;
  verifiedDestinationUrl: string;
}

export class DestinationVerifier {
  /**
   * Verifies the destination URL of an opportunity
   */
  public static verifyDestination(
    applicationUrl: string,
    originalListingUrl: string,
    title: string,
    employer: string
  ): VerificationResult {
    if (!applicationUrl || typeof applicationUrl !== 'string') {
      return {
        destinationStatus: 'UNAVAILABLE',
        isValid: false,
        reason: 'Missing application URL',
        verifiedDestinationUrl: applicationUrl || '',
      };
    }

    const trimmed = applicationUrl.trim();

    // 1. Check HTTP/HTTPS scheme
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return {
        destinationStatus: 'FAILED_VERIFICATION',
        isValid: false,
        reason: 'Invalid protocol - must start with http or https',
        verifiedDestinationUrl: trimmed,
      };
    }

    // 2. Reject generic homepages and generic careers/vacancies landing pages
    // e.g. https://www.dpsa.gov.za/
    // e.g. https://company.co.za/careers
    // e.g. https://company.co.za/vacancies.php
    if (trimmed.match(/^https?:\/\/[^\/]+\/?$/i)) {
      return {
        destinationStatus: 'FAILED_VERIFICATION',
        isValid: false,
        reason: 'Generic domain homepage is not a direct vacancy page',
        verifiedDestinationUrl: trimmed,
      };
    }

    if (trimmed.match(/^https?:\/\/[^\/]+\/careers(\.html|\.php|\/?)$/i)) {
      return {
        destinationStatus: 'FAILED_VERIFICATION',
        isValid: false,
        reason: 'Generic careers homepage is not a direct vacancy page',
        verifiedDestinationUrl: trimmed,
      };
    }

    if (trimmed.match(/^https?:\/\/[^\/]+\/vacancies(\.asp|\.php|\/?)$/i)) {
      return {
        destinationStatus: 'FAILED_VERIFICATION',
        isValid: false,
        reason: 'Generic vacancies page is not a direct vacancy page',
        verifiedDestinationUrl: trimmed,
      };
    }

    // 3. Reject known dead/error paths or test placeholders
    if (trimmed.includes('404') || trimmed.includes('expired') || trimmed.includes('dead-link')) {
      return {
        destinationStatus: 'EXPIRED',
        isValid: false,
        reason: 'URL indicates an expired or 404 vacancy page',
        verifiedDestinationUrl: trimmed,
      };
    }

    // 4. Distinguish LISTING_ONLY vs VERIFIED direct application destination
    let destinationStatus: DestinationStatus = 'VERIFIED';
    if (trimmed.includes('/apply') || trimmed.includes('application') || trimmed.includes('/job/')) {
      destinationStatus = 'VERIFIED';
    } else if (trimmed === originalListingUrl) {
      destinationStatus = 'LISTING_ONLY';
    }

    return {
      destinationStatus,
      isValid: true,
      verifiedDestinationUrl: trimmed,
    };
  }

  /**
   * Verifies opportunity in-place and updates provenance destinationStatus
   */
  public static verifyOpportunity(opp: Opportunity): Opportunity {
    const res = this.verifyDestination(
      opp.sourceProvenance.applicationDestination,
      opp.sourceProvenance.originalUrl,
      opp.title,
      opp.employer
    );

    opp.sourceProvenance.destinationStatus = res.destinationStatus;
    opp.sourceProvenance.isRealVerified = res.isValid;
    opp.sourceProvenance.sourceListingUrl = opp.sourceProvenance.sourceListingUrl || opp.sourceProvenance.originalUrl;
    opp.sourceProvenance.applicationUrl = opp.sourceProvenance.applicationUrl || res.verifiedDestinationUrl;

    if (!res.isValid) {
      opp.sourceProvenance.verificationStatus = 'UNVERIFIED';
    }

    return opp;
  }
}
