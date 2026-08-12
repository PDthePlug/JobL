import React, { useEffect, useRef, useState } from 'react';
import {
  ApplicationReadinessAnalysis,
  ExtractedCVData,
  JobMatchAnalysis,
  JobRequirements,
  Opportunity,
} from '../types';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';
import { JobMatchDisplay } from './JobMatchDisplay';
import { ApplicationReadinessDisplay } from './ApplicationReadinessDisplay';

interface OpportunityModalProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onOpenCv?: () => void;
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
  onOpenCv,
  onStartApplicationReadiness,
}) => {
  const [candidateProfile, setCandidateProfile] = useState<ExtractedCVData | null>(null);
  const [jobRequirements, setJobRequirements] = useState<JobRequirements | undefined>(undefined);
  const [matchAnalysis, setMatchAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [readinessAnalysis, setReadinessAnalysis] = useState<ApplicationReadinessAnalysis | null>(null);
  const [candidateConfirmations, setCandidateConfirmations] = useState<Record<string, string>>({});
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [isRefreshingReadiness, setIsRefreshingReadiness] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const refreshSequence = useRef(0);

  useEffect(() => {
    let cancelled = false;

    if (!opportunity) {
      setCandidateProfile(null);
      setJobRequirements(undefined);
      setMatchAnalysis(null);
      setReadinessAnalysis(null);
      setCandidateConfirmations({});
      setMatchError(null);
      setReadinessError(null);
      return;
    }

    setCandidateConfirmations({});
    setJobRequirements(undefined);
    setMatchAnalysis(null);
    setReadinessAnalysis(null);
    setMatchError(null);
    setReadinessError(null);

    const loadCandidateMatch = async () => {
      try {
        const stored = localStorage.getItem('jobl_candidate_cv_profile');
        if (!stored) return;

        const parsed = JSON.parse(stored);
        const profile: ExtractedCVData = parsed.extractedData || parsed;

        if (
          !profile ||
          (!profile.firstName && !profile.rawExtractedText && !profile.employmentHistory?.length)
        ) {
          return;
        }

        setCandidateProfile(profile);
        setIsLoadingMatch(true);

        const [matchRes, readinessRes] = await Promise.all([
          fetch('/api/job-intelligence/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateProfile: profile, opportunity }),
          }),
          fetch('/api/application-readiness/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidateProfile: profile,
              opportunity,
              candidateConfirmations: {},
            }),
          }),
        ]);

        const [matchData, readinessData] = await Promise.all([matchRes.json(), readinessRes.json()]);
        if (cancelled) return;

        if (matchData.success && matchData.analysis) {
          setMatchAnalysis(matchData.analysis);
          if (matchData.jobRequirements) setJobRequirements(matchData.jobRequirements);
        }

        if (readinessData.success && readinessData.readinessAnalysis) {
          setReadinessAnalysis(readinessData.readinessAnalysis);
          if (readinessData.jobRequirements) setJobRequirements(readinessData.jobRequirements);
          if (readinessData.matchAnalysis) setMatchAnalysis(readinessData.matchAnalysis);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.warn('Could not check candidate fit:', error?.message);
          setMatchError('Could not check your CV right now.');
        }
      } finally {
        if (!cancelled) setIsLoadingMatch(false);
      }
    };

    void loadCandidateMatch();
    return () => {
      cancelled = true;
    };
  }, [opportunity]);

  const refreshReadiness = async (nextConfirmations: Record<string, string>) => {
    if (!opportunity || !candidateProfile) return;

    const sequence = ++refreshSequence.current;
    setIsRefreshingReadiness(true);
    setReadinessError(null);

    try {
      const response = await fetch('/api/application-readiness/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateProfile,
          opportunity,
          jobRequirements,
          matchAnalysis,
          candidateConfirmations: nextConfirmations,
        }),
      });
      const data = await response.json();
      if (sequence !== refreshSequence.current) return;
      if (!data.success) throw new Error(data.error || 'Could not update your answers.');

      if (data.readinessAnalysis) setReadinessAnalysis(data.readinessAnalysis);
      if (data.jobRequirements) setJobRequirements(data.jobRequirements);
      if (data.matchAnalysis) setMatchAnalysis(data.matchAnalysis);
    } catch (error: any) {
      if (sequence === refreshSequence.current) {
        setReadinessError(error?.message || 'Could not update your answers.');
      }
    } finally {
      if (sequence === refreshSequence.current) setIsRefreshingReadiness(false);
    }
  };

  const handleAnswerQuestion = (questionId: string, requirementId: string, answer: string) => {
    const nextConfirmations = {
      ...candidateConfirmations,
      [requirementId]: answer,
      [questionId]: answer,
    };
    setCandidateConfirmations(nextConfirmations);
    void refreshReadiness(nextConfirmations);
  };

  if (!opportunity) return null;

  const provenance = opportunity.sourceProvenance;
  const isDestinationValid =
    (provenance.destinationStatus === 'VERIFIED' ||
      provenance.destinationStatus === 'LISTING_ONLY' ||
      Boolean(provenance.applicationInstructions)) &&
    provenance.destinationStatus !== 'FAILED_VERIFICATION' &&
    provenance.destinationStatus !== 'UNAVAILABLE' &&
    provenance.destinationStatus !== 'EXPIRED' &&
    provenance.sourceStatus !== 'DISABLED' &&
    Boolean(
      provenance.applicationDestination ||
      provenance.originalUrl ||
      provenance.applicationInstructions
    );

  const locationLabel = [
    opportunity.location.suburbOrTownship,
    opportunity.location.city,
    opportunity.location.province,
  ]
    .filter(Boolean)
    .join(', ');

  const openCv = () => {
    onClose();
    onOpenCv?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] rounded-t-3xl">
        <header className="shrink-0 px-5 sm:px-7 pt-5 sm:pt-6 pb-5 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-2">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="font-medium text-slate-700">{opportunity.employer}</span>
                {provenance.verificationStatus === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-[-0.035em] leading-tight">
                {opportunity.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {locationLabel || 'South Africa'}
                </span>
                {opportunity.employmentType && opportunity.employmentType !== 'Unknown' && (
                  <><span className="text-slate-300">·</span><span>{opportunity.employmentType}</span></>
                )}
                {opportunity.experienceLevel && opportunity.experienceLevel !== 'Unknown' && (
                  <><span className="text-slate-300">·</span><span>{opportunity.experienceLevel}</span></>
                )}
              </div>
            </div>

            <button type="button" onClick={onClose} className="shrink-0 p-2.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Close job">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 space-y-8">
          {(opportunity.salary?.formatted || opportunity.closingDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {opportunity.salary?.formatted && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500">Pay</p>
                  <p className="text-base font-bold text-slate-950 mt-1">{opportunity.salary.formatted}</p>
                </div>
              )}
              {opportunity.closingDate && (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Closing date</p>
                  <p className="text-base font-bold text-slate-950 mt-1">{opportunity.closingDate}</p>
                </div>
              )}
            </div>
          )}

          <section>
            <h3 className="text-lg font-bold text-slate-950">About the job</h3>
            <p className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-7 whitespace-pre-wrap">{opportunity.fullDescription || opportunity.summary}</p>
          </section>

          {(opportunity.qualificationRequirement || opportunity.requirements?.length > 0) && (
            <section>
              <h3 className="text-lg font-bold text-slate-950">What you need</h3>
              {opportunity.qualificationRequirement && <p className="mt-3 text-sm font-semibold text-slate-800">{opportunity.qualificationRequirement}</p>}
              {opportunity.requirements?.length > 0 && (
                <ul className="mt-3 space-y-2.5">
                  {opportunity.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></span>
                      <span>{requirement}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {opportunity.responsibilities?.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-slate-950">What you’ll do</h3>
              <ul className="mt-3 space-y-2.5">
                {opportunity.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2.5" />
                    <span>{responsibility}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Job source: <strong className="font-semibold text-slate-700">{provenance.sourceName}</strong>{provenance.lastVerifiedDate ? ` · Checked ${provenance.lastVerifiedDate}` : ''}</span>
          </div>

          {!isDestinationValid && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-950">Applications are unavailable for this job right now.</p>
                <p className="text-xs text-red-700 mt-0.5">JobL could not confirm a working application route.</p>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-8 space-y-4">
            <JobMatchDisplay analysis={matchAnalysis} isLoading={isLoadingMatch} error={matchError} onUploadCvClick={onOpenCv ? openCv : undefined} />

            {(readinessAnalysis || isLoadingMatch) && (
              <ApplicationReadinessDisplay
                analysis={readinessAnalysis}
                isLoading={isLoadingMatch}
                isRefreshing={isRefreshingReadiness}
                error={readinessError}
                candidateConfirmations={candidateConfirmations}
                onAnswerQuestion={handleAnswerQuestion}
              />
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur px-5 sm:px-7 py-4">
          {isDestinationValid ? (
            <button
              type="button"
              onClick={() => onStartApplicationReadiness(opportunity, jobRequirements, matchAnalysis || undefined, readinessAnalysis || undefined, candidateConfirmations)}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base px-6 py-4 rounded-2xl transition-colors cursor-pointer"
            >
              Get this application ready — R5 <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" disabled className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold text-sm px-6 py-4 rounded-2xl cursor-not-allowed">
              <AlertCircle className="w-4 h-4" /> Applications unavailable
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
