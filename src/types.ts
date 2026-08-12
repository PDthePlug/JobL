export type RegionType = 
  | 'LOCAL'
  | 'REGIONAL'
  | 'NATIONAL'
  | 'REMOTE_SA'
  | 'REMOTE_INT'
  | 'INTERNATIONAL'
  | 'UNKNOWN';

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'UNVERIFIED' | 'FLAGGED';
export type FreshnessStatus = 'NEW' | 'FRESH' | 'RECENT' | 'STALE' | 'EXPIRED' | 'UNKNOWN';
export type SourceAdapterStatus = 
  | 'LIVE' 
  | 'LIVE_EXTERNAL' 
  | 'STATIC_FIXTURE' 
  | 'NOT_IMPLEMENTED' 
  | 'PARTNER' 
  | 'LICENSED' 
  | 'FIXTURE' 
  | 'FIXTURE_ONLY' 
  | 'DEVELOPMENT_ONLY' 
  | 'DISABLED' 
  | 'PARTNERSHIP_REQUIRED' 
  | 'ERROR';
export type SourceTier = 1 | 2 | 3;
export type SourceType = 'OFFICIAL_EMPLOYER' | 'GOVERNMENT' | 'AUTHORISED_AGGREGATOR' | 'PARTNER' | 'UNVERIFIED';
export type DestinationStatus = 'VERIFIED' | 'REDIRECTED' | 'LISTING_ONLY' | 'UNAVAILABLE' | 'EXPIRED' | 'FAILED_VERIFICATION';
export type ApplicationMethodType =
  | 'DIRECT_URL'
  | 'SOURCE_LISTING'
  | 'EMAIL'
  | 'POSTAL'
  | 'HAND_DELIVERY'
  | 'MIXED'
  | 'UNKNOWN';

export interface AttributionConfig {
  providerName: string;
  logoUrl?: string;
  termsUrl?: string;
  text?: string;
}

export interface GeographicEligibility {
  isSouthAfricaEligible: boolean;
  isLocalOnly: boolean;
  allowedCountries: string[];
}

export interface JobSourceProvenance {
  sourceId: string;
  sourceName: string;
  sourceTier: SourceTier;
  sourceType: SourceType;
  originalListingId?: string;
  originalUrl: string;
  sourceListingUrl?: string;
  employerName: string;
  publicationDate?: string; // ISO date string or undefined if unparseable/missing
  lastVerifiedDate: string; // ISO date string
  lastSeenAt?: string;
  expiresAt?: string;
  sourceStatus: SourceAdapterStatus;
  verificationStatus: VerificationStatus;
  destinationStatus: DestinationStatus;
  freshnessStatus: FreshnessStatus;
  applicationDestination: string; // Validated external URL
  applicationUrl?: string;
  employerUrl?: string;
  isRealVerified: boolean;
  isFixture: boolean;
  isLive: boolean;
  attributionRequired?: boolean;
  attributionConfig?: AttributionConfig;
  applicationMethodType?: ApplicationMethodType;
  applicationInstructions?: string;
  applicationEmail?: string;
}

export type OpportunitySector =
  | 'Government & Public Service'
  | 'Private Sector'
  | 'Youth & Learnership';

export interface Opportunity {
  id: string;
  title: string;
  employer: string;
  location: {
    rawLocationText?: string;
    city: string;
    province: string;
    suburbOrTownship?: string;
    regionType: RegionType;
    country: string;
    remoteStatus?: 'ON_SITE' | 'HYBRID' | 'REMOTE_SA' | 'REMOTE_INT' | 'NONE' | 'UNKNOWN';
    relocationStatus?: 'NOT_ALLOWED' | 'ALLOWED' | 'PROVIDED';
    geographicEligibility?: GeographicEligibility;
  };
  jobCategory: string;
  sector?: OpportunitySector;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Learnership' | 'Internship' | 'Temporary' | 'Casual' | 'Unknown';
  experienceLevel: 'No experience' | 'Entry level' | 'Some experience' | 'Experienced' | 'Unknown';
  qualificationRequirement: string;
  salary?: {
    formatted: string;
    period: 'Hourly' | 'Monthly' | 'Annual' | 'Stipend' | 'Weekly' | 'Daily' | 'Unknown';
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
  };
  summary: string;
  fullDescription?: string;
  requirements: string[];
  responsibilities: string[];
  skillsRequired: string[];
  closingDate?: string;
  postedAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  sourceProvenance: JobSourceProvenance;
  sourceProvenanceList?: JobSourceProvenance[];
  contentHash?: string;
  deduplicationKey?: string;
  isFixture?: boolean;
  isLive?: boolean;
  matchScore?: number; // 0 - 100
  matchExplanation?: string[];
}

export interface SourceRegistryEntry {
  sourceId: string;
  sourceName: string;
  tier: SourceTier;
  sourceType: SourceType;
  status: SourceAdapterStatus;
  authType: 'PUBLIC' | 'API_KEY' | 'AFFILIATE_ID' | 'PARTNERSHIP_FEED' | 'NONE';
  supportsSearch: boolean;
  supportsLocation: boolean;
  supportsPagination: boolean;
  supportsDirectApplication: boolean;
  attributionRequired: boolean;
  termsUrl?: string;
  attributionConfig?: AttributionConfig;
  lastSuccessfulSync?: string;
  lastFailure?: string;
  requestsCount: number;
  successfulRequestsCount: number;
  failedRequestsCount: number;
  opportunitiesReturnedCount: number;
  opportunitiesRejectedCount: number;
  destinationFailuresCount: number;
}


export interface EmploymentItem {
  employer: string | null;
  jobTitle: string | null;
  employmentDates: string | null;
  startDate?: string | null;
  endDate?: string | null;
  responsibilities: string[] | null;
  achievements: string[] | null;
  milestones?: string[] | null;
  technologiesTools?: string[] | null;
  location?: string | null;
}

export interface EducationItem {
  qualification: string | null;
  institution: string | null;
  level?: string | null;
  year: string | null;
  dates?: string | null;
  details?: string | null;
}

export interface CertificationItem {
  qualification: string | null;
  issuingBody?: string | null;
  categoryDetails?: string | null;
  unitStandard?: string | null;
  issueDate?: string | null;
  validUntil?: string | null;
}

export interface SkillItem {
  skillName: string;
  originalDescription?: string | null;
  normalizedSkillName?: string | null;
}

export interface ReferenceItem {
  name: string | null;
  titleRelationship?: string | null;
  organisation?: string | null;
  contactNumber?: string | null;
  email?: string | null;
}

export interface OtherCvSection {
  title: string;
  originalText: string;
  items?: string[];
}

export interface ExtractedCVData {
  fullName?: string | null;
  firstName: string | null;
  surname: string | null;

  // Contact Information
  phone: string | null;
  phoneNumbers?: string[];
  email: string | null;
  location?: string | null;
  physicalAddress?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;

  // Personal Demographics / Information
  identityNumber?: string | null;
  maritalStatus?: string | null;
  gender?: string | null;
  dependents?: string | null;
  availability?: string | null;
  currentEmploymentStatus?: string | null;

  // Career Target
  desiredPosition?: string | null;
  careerObjective?: string | null;

  // Personal / Professional Statement
  professionalProfile: string | null;
  personalStatementBullets?: string[];

  // Structured Sections
  employmentHistory: EmploymentItem[];
  education: EducationItem[];
  certifications: string[];
  certificationItems?: CertificationItem[];
  skills: string[];
  skillItems?: SkillItem[];
  languages: string[];
  licences: string[];
  references?: ReferenceItem[];
  rawExtractedText?: string | null;
  otherSections?: OtherCvSection[];

  // Lossless Raw Text Preservation
}

export interface CandidateCVProfile {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  extractedData: ExtractedCVData;
  updatedAt: string;
}

export interface CandidateLead {
  firstName: string;
  surname: string;
  phone: string; // South African format e.g. 0821234567
  email: string;
  locationCity: string;
  locationProvince: string;
  popiaConsent: {
    agreed: boolean;
    timestamp: string;
    purpose: string;
    consentVersion: string;
  };
}

export interface PaymentTransaction {
  transactionId: string;
  provider: 'PEACH_PAYMENTS' | 'OZOW_EFT' | 'JOBL_VOUCHER';
  amount: number; // e.g. 5.00 ZAR
  currency: 'ZAR';
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  timestamp: string;
  reference: string;
  candidateEmail: string;
  opportunityId: string;
  paymentMethodDetails?: string;
}

export interface VoucherRedemption {
  code: string;
  valueAmount: number;
  status: 'ISSUED' | 'REDEEMED' | 'EXPIRED' | 'LOCKED';
  issueDate: string;
  expiryDate: string;
  redemptionTimestamp?: string;
  transactionReference?: string;
}

export interface CVAnalysisResult {
  candidateSummary: string;
  jobRequirementAnalysis: {
    matchedRequirements: string[];
    missingRequirements: string[];
    missingKeywords: string[];
  };
  candidateStrengths: string[];
  tailoredCVText: string;
  coverLetterMessage: string;
  applicationChecklist: string[];
  interviewPrepTips: string[];
  overallCompatibilityScore: number;
}

export interface ApplicationPackage {
  packageId: string;
  opportunityId: string;
  opportunityTitle: string;
  employerName: string;
  candidateLead: CandidateLead;
  paymentTransaction: PaymentTransaction;
  cvAnalysis: CVAnalysisResult;
  createdAt: string;
  originalApplicationUrl: string;
  status: 'READY' | 'HANDOFF_COMPLETED';
}

export interface AnalyticsEvent {
  id: string;
  eventName: 
    | 'landing_page_view'
    | 'location_selected'
    | 'category_selected'
    | 'search_started'
    | 'opportunity_impression'
    | 'opportunity_clicked'
    | 'opportunity_saved'
    | 'application_started'
    | 'lead_captured'
    | 'payment_started'
    | 'payment_completed'
    | 'cv_upload_started'
    | 'cv_uploaded'
    | 'cv_extraction_completed'
    | 'cv_extraction_failed'
    | 'cv_analysis_started'
    | 'cv_generated'
    | 'application_package_completed'
    | 'external_application_clicked'
    | 'interview_prep_started'
    | 'interview_prep_completed';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SourceHealth {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  status: SourceAdapterStatus;
  totalListingsCount: number;
  lastSyncTime: string;
  errorMessage?: string;
}

export interface OperatorDashboardStats {
  totalOpportunities: number;
  verifiedOpportunities: number;
  staleOpportunities: number;
  sourceHealthList: SourceHealth[];
  topLocations: { city: string; count: number }[];
  topCategories: { category: string; count: number }[];
  conversionFunnel: {
    searches: number;
    opportunityClicks: number;
    applicationStarts: number;
    leadCaptures: number;
    paymentsCompleted: number;
    externalHandoffs: number;
  };
  recentAnalyticsEvents: AnalyticsEvent[];
}

// Phase 2B: Job Requirements & Candidate Match Intelligence Models

export type RequirementCategory =
  | 'EXPERIENCE'
  | 'EDUCATION'
  | 'CERTIFICATION'
  | 'LICENCE'
  | 'SKILL'
  | 'LANGUAGE'
  | 'RESPONSIBILITY'
  | 'AVAILABILITY'
  | 'LOCATION'
  | 'OTHER';

export type RequirementImportance =
  | 'MANDATORY'
  | 'PREFERRED'
  | 'INFORMATIONAL'
  | 'UNKNOWN';

export type MatchStatus =
  | 'MATCH'
  | 'PARTIAL_MATCH'
  | 'MISSING'
  | 'UNKNOWN';

export type OverallMatchStatus =
  | 'STRONG_MATCH'
  | 'POTENTIAL_MATCH'
  | 'PARTIAL_MATCH'
  | 'LOW_MATCH'
  | 'INSUFFICIENT_INFORMATION';

export interface JobRequirementItem {
  id: string;
  requirement: string;
  category: RequirementCategory;
  importance: RequirementImportance;
  sourceText: string;
  explicitOrInferred: 'EXPLICIT' | 'INFERRED';
}

export interface JobRequirements {
  jobId: string;
  jobTitle: string;
  employer: string;
  location: string | null;
  employmentType: string | null;
  experienceRequirements: JobRequirementItem[];
  educationRequirements: JobRequirementItem[];
  certificationRequirements: JobRequirementItem[];
  licenceRequirements: JobRequirementItem[];
  skillRequirements: JobRequirementItem[];
  languageRequirements: JobRequirementItem[];
  responsibilityRequirements: JobRequirementItem[];
  availabilityRequirements: JobRequirementItem[];
  otherRequirements: JobRequirementItem[];
  salaryInformation: string | null;
  applicationDeadline: string | null;
  allRequirements: JobRequirementItem[];
}

export interface RequirementMatch {
  requirementId: string;
  requirement: string;
  category: RequirementCategory;
  importance: RequirementImportance;
  status: MatchStatus;
  candidateEvidence: string | null;
  sourceEvidence: string | null;
  explanation: string;
}

export interface JobMatchAnalysis {
  jobId: string;
  jobTitle: string;
  employer: string;
  candidateProfileVersion?: string;
  overallStatus: OverallMatchStatus;
  matchedRequirements: RequirementMatch[];
  partialMatches: RequirementMatch[];
  missingEvidence: RequirementMatch[];
  unknownRequirements: RequirementMatch[];
  strengths: string[];
  gaps: string[];
  evidenceSummary: string;
  nextPreparationAreas: string[];
}

// Phase 2C: Application Readiness & Gap Resolution Models

export type ReadinessActionType = 'READY' | 'CONFIRM' | 'STRENGTHEN' | 'CORRECT';

export type ApplicationReadinessState =
  | 'READY_TO_APPLY'
  | 'READY_AFTER_CONFIRMATION'
  | 'NEEDS_STRENGTHENING'
  | 'INSUFFICIENT_INFORMATION';

export type CandidateResponseSource = 'EXTRACTED_CV' | 'CANDIDATE_CONFIRMED';

export interface ReadinessItem {
  id: string;
  requirementId: string;
  title: string;
  actionType: ReadinessActionType;
  explanation: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  source: CandidateResponseSource;
  relatedEvidence: string | null;
  actionRequired: string | null;
}

export interface CandidateQuestion {
  questionId: string;
  relatedRequirementId: string;
  question: string;
  category: RequirementCategory;
  responseType: 'YES_NO' | 'TEXT' | 'SELECT';
  options?: string[];
  response?: string | null;
  responseSource?: CandidateResponseSource;
}

export interface ApplicationReadinessAnalysis {
  jobId: string;
  jobTitle: string;
  employer: string;
  readinessState: ApplicationReadinessState;
  readinessSummary: string;
  readyItems: ReadinessItem[];
  confirmationItems: ReadinessItem[];
  strengtheningItems: ReadinessItem[];
  correctionItems: ReadinessItem[];
  priorityItems: ReadinessItem[];
  candidateQuestions: CandidateQuestion[];
  generatedAt: string;
}

// Phase 2D: Application Document Generation Models

export type GeneratedDocumentType = 'CV' | 'COVER_LETTER';

export interface DocumentMetadata {
  candidateProfileVersion: string;
  opportunityId: string;
  jobTitle: string;
  employer: string;
  generationTimestamp: string;
  sourceProfile: string;
  documentType: GeneratedDocumentType;
  generationStatus: 'SUCCESS' | 'VALIDATION_FAILED';
  version: number;
}

export interface ZeroFabricationValidationResult {
  isValid: boolean;
  detectedUnsupportedClaims: string[];
  validationDetails: string;
}

export interface GeneratedDocumentResponse {
  documentId: string;
  documentType: GeneratedDocumentType;
  version: number;
  title: string;
  contentText: string;
  downloadUrl: string;
  metadata: DocumentMetadata;
  generatedAt: string;
}

