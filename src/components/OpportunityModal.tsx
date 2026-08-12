import React, { useState, useEffect } from 'react';
import {
  Opportunity,
  JobMatchAnalysis,
  ApplicationReadinessAnalysis,
  ExtractedCVData,
  JobRequirements,
} from '../types';
import {
  X,
  MapPin,
  Building2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { JobMatchDisplay } from './JobMatchDisplay';
import { ApplicationReadinessDisplay } from './ApplicationReadinessDisplay';

interface OpportunityModalProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onStartApplicationReadiness: (
    opportunity: Opportunity,
    jobRequirements?: JobRequirements,
    matchAnalysis?: JobMatchAnalysis,
    readinessAnalysis?: ApplicationReadinessAnalysis,
    confirmations?: Record<string, string>
  ) => void;
}

export const OpportunityModal: React.FC<OpportunityModalProps> = ({
  opportunity,
  onClose,
  onStartApplicationReadiness,
}) => {
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [readinessAnalysis, setReadinessAnalysis] = useState<ApplicationReadinessAnalysis | null>(null);
  const [candidateConfirmations, setCandidateConfirmations] = useState<Record<string, string>>({});
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    if (!opportunity) {
      setMatchAnalysis(null);
      setReadinessAnalysis(null);
      return;
    }

    const loadCandidateMatch = async () => {
      try {
        const stored = localStorage.getItem('jobl_candidate_cv_profile');
        if (!stored) return;

        const parsed = JSON.parse(stored);
        const candidateProfile: ExtractedCVData = parsed.extractedData || parsed;

        if (
          !candidateProfile ||
          (!candidateProfile.firstName &&
            !candidateProfile.rawExtractedText &&
            !candidateProfile.employmentHistory?.length)
        ) {
          return;
        }

        setIsLoadingMatch(true);
        setMatchError(null);

        const [matchRes, readinessRes] = await Promise.all([
          fetch('/api/job-intelligence/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateProfile, opportunity }),
          }),
          fetch('/api/application-readiness/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateProfile,
              opportunity,
              candidateConfirmations,
            }),
          }),
        ]);

        const matchData = await matchRes.json();
        if (matchData.success && matchData.analysis) {
          setMatchAnalysis(matchData.analysis);
        }

        const readinessData = await readinessRes.json();
        if (readinessData.success && readinessData.readinessAnalysis) {
          setReadinessAnalysis(readinessData.readinessAnalysis);
        }
      } catch (err: any) {
        console.warn('Could not load candidate match analysis:', err.message);
      } finally {
        setIsLoadingMatch(false);
      }
    };

    loadCandidateMatch();
  }, [opportunity, candidateConfirmations]);

  const handleAnswerQuestion = (questionId: string, requirementId: string, answer: string) => {
    setCandidateConfirmations((prev) => ({
      ...prev,
      [requirementId]: answer,
      [questionId]: answer,
    }));
  };

  if (!opportunity) return null;

  const prov = opportunity.sourceProvenance;

  const isDestinationValid =
    (prov.destinationStatus === 'VERIFIED' ||
      prov.destinationStatus === 'LISTING_ONLY' ||
      Boolean(prov.applicationInstructions)) &&
    prov.destinationStatus !== 'FAILED_VERIFICATION' &&
    prov.destinationStatus !== 'UNAVAILABLE' &&
    prov.destinationStatus !== 'EXPIRED' &&
    prov.sourceStatus !== 'DISABLED' &&
    Boolean(prov.applicationDestination || prov.originalUrl || prov.applicationInstructions);

  const locationLabel = [opportunity.location.city, opportunity.location.province]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl">
        {/* Header — calm, not loud blue block */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium">{opportunity.employer}</span>
                {prov.verificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-snug">
                {opportunity.title}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {locationLabel}
                </span>
                {opportunity.employmentType && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{opportunity.employmentType}</span>
                  </>
                )}
                {opportunity.experienceLevel && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{opportunity.experienceLevel}</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {/* Match intelligence */}
          <JobMatchDisplay analysis={matchAnalysis} isLoading={isLoadingMatch} error={matchError} />

          {/* Application readiness */}
          {readinessAnalysis && (
            <ApplicationReadinessDisplay
              analysis={readinessAnalysis}
              isLoading={isLoadingMatch}
              error={matchError}
              candidateConfirmations={candidateConfirmations}
              onAnswerQuestion={handleAnswerQuestion}
              onProceedToApplication={() =>
                onStartApplicationReadiness(
                  opportunity,
                  matchAnalysis?.jobRequirements,
                  matchAnalysis || undefined,
                  readinessAnalysis || undefined,
                  candidateConfirmations
                )
              }
            />
          )}

          {/* Notices */}
          {prov.destinationStatus === 'LISTING_ONLY' && (
            <div className="flex gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
              <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Official listing</p>
                <p className="mt-0.5 text-slate-600 leading-relaxed">
                  This vacancy comes from an official source ({prov.sourceName}). JobL will prepare
                  your application and guide you through the official pathway.
                </p>
              </div>
            </div>
          )}

          {!isDestinationValid && (
            <div className="flex gap-3 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Application destination unavailable</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">
                  This vacancy cannot be verified for application right now and is temporarily
                  unavailable for readiness.
                </p>
              </div>
            </div>
          )}

          {/* Salary */}
          {opportunity.salary?.formatted && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/80 border border-emerald-100 px-4 py-3.5">
              <div>
                <p className="text-xs font-medium text-emerald-800 uppercase tracking-wide">
                  Remuneration
                </p>
                <p className="text-lg font-semibold text-emerald-950 mt-0.5">
                  {opportunity.salary.formatted}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-emerald-600/40" />
            </div>
          )}

          {/* Summary */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Summary
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {opportunity.fullDescription}
            </p>
          </section>

          {/* Requirements */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Requirements
            </h3>
            {opportunity.qualificationRequirement && (
              <p className="text-sm font-medium text-slate-900 mb-3">
                {opportunity.qualificationRequirement}
              </p>
            )}
            {opportunity.requirements?.length > 0 && (
              <ul className="space-y-2">
                {opportunity.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Responsibilities */}
          {opportunity.responsibilities?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Responsibilities
              </h3>
              <ul className="space-y-2">
                {opportunity.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Source — collapsed visual weight */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                Source
              </span>
              <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                {prov.verificationStatus}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-400">Primary</dt>
                <dd className="font-medium text-slate-800">{prov.sourceName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Employer</dt>
                <dd className="font-medium text-slate-800">{prov.employerName || opportunity.employer}</dd>
              </div>
              {prov.originalListingId && (
                <div>
                  <dt className="text-slate-400">Listing ref</dt>
                  <dd className="font-medium text-slate-800 font-mono text-[11px]">
                    {prov.originalListingId}
                  </dd>
                </div>
              )}
              {prov.lastVerifiedDate && (
                <div>
                  <dt className="text-slate-400">Verified</dt>
                  <dd className="font-medium text-slate-800">{prov.lastVerifiedDate}</dd>
                </div>
              )}
            </dl>
            {opportunity.sourceProvenanceList && opportunity.sourceProvenanceList.length > 1 && (
              <p className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                Also listed on:{' '}
                {opportunity.sourceProvenanceList.map((p, idx) => (
                  <span key={p.sourceId}>
                    {p.sourceName}
                    {idx < (opportunity.sourceProvenanceList?.length || 1) - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            )}
            {prov.attributionConfig?.text && (
              <p className="mt-2 text-[11px] text-slate-400 italic">{prov.attributionConfig.text}</p>
            )}
          </section>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 sm:px-6 py-4">
          {isDestinationValid ? (
            <button
              type="button"
              onClick={() =>
                onStartApplicationReadiness(
                  opportunity,
                  matchAnalysis?.jobRequirements,
                  matchAnalysis || undefined,
                  readinessAnalysis || undefined,
                  candidateConfirmations
                )
              }
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
            >
              Prepare my application — R5
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-medium text-sm px-6 py-3.5 rounded-xl cursor-not-allowed"
            >
              <AlertCircle className="w-4 h-4" />
              Application destination unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
