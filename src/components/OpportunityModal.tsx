import React, { useState, useEffect } from 'react';
import { Opportunity, JobMatchAnalysis, ApplicationReadinessAnalysis, ExtractedCVData, JobRequirements } from '../types';
import { X, MapPin, Building2, ExternalLink, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, ArrowRight, DollarSign, Calendar } from 'lucide-react';
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

        if (!candidateProfile || (!candidateProfile.firstName && !candidateProfile.rawExtractedText && !candidateProfile.employmentHistory?.length)) {
          return;
        }

        setIsLoadingMatch(true);
        setMatchError(null);

        // Fetch candidate match comparison & readiness analysis in parallel
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-blue-600 text-white p-5 sm:p-6 flex items-start justify-between relative">
          <div>
            <div className="flex items-center space-x-2 text-xs text-blue-100 font-semibold mb-1">
              <Building2 className="w-4 h-4 text-white" />
              <span>{opportunity.employer}</span>
              <span className="text-blue-200">•</span>
              <span className="bg-blue-700 text-white px-2 py-0.5 rounded text-[10px] border border-blue-500 font-medium">
                {prov.sourceName}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {opportunity.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-blue-100">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-white" />
                {opportunity.location.city}, {opportunity.location.province}
              </span>
              <span>•</span>
              <span className="text-white font-medium">{opportunity.employmentType}</span>
              <span>•</span>
              <span className="bg-blue-700/80 text-blue-50 px-2 py-0.5 rounded text-[10px] font-mono font-medium">{opportunity.experienceLevel}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white hover:text-white p-2 rounded-lg bg-blue-700 hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Candidate Match Intelligence Display (Phase 2B) */}
          <JobMatchDisplay
            analysis={matchAnalysis}
            isLoading={isLoadingMatch}
            error={matchError}
          />

          {/* Application Readiness Display (Phase 2C) */}
          {readinessAnalysis && (
            <ApplicationReadinessDisplay
              analysis={readinessAnalysis}
              isLoading={isLoadingMatch}
              error={matchError}
              candidateConfirmations={candidateConfirmations}
              onAnswerQuestion={handleAnswerQuestion}
              onProceedToApplication={() => onStartApplicationReadiness(opportunity, matchAnalysis?.jobRequirements, matchAnalysis || undefined, readinessAnalysis || undefined, candidateConfirmations)}
            />
          )}

          {/* LISTING_ONLY Official Vacancy Reassurance Notice */}
          {prov.destinationStatus === 'LISTING_ONLY' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-xs text-blue-900">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-bold text-blue-900">Official Vacancy Listing & Application Instructions Available</p>
                <p className="mt-0.5 text-blue-800">
                  This vacancy originates from an official source document ({prov.sourceName}). JobL will prepare your tailored application package and guide you to submit your application via the official application pathway.
                </p>
              </div>
            </div>
          )}

          {/* Destination Failure Notice if invalid */}
          {!isDestinationValid && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-xs text-red-900">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-red-900">Application Destination Currently Unavailable</p>
                <p className="mt-0.5 text-red-700">This vacancy's direct destination URL cannot be verified at present. It has been temporarily removed from the application-readiness pathway.</p>
              </div>
            </div>
          )}

          {/* Salary Banner */}
          {opportunity.salary && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Salary / Remuneration</p>
                <p className="text-lg font-black text-emerald-950 mt-0.5">{opportunity.salary.formatted}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-700/50" />
            </div>
          )}

          {/* Full Description */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-2">Job Summary</h3>
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
              {opportunity.fullDescription}
            </p>
          </div>

          {/* Key Requirements */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-2">Key Requirements & Qualification</h3>
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 mb-3">
              <p className="text-xs font-bold text-blue-950 mb-1">Required Education / Qualification:</p>
              <p className="text-sm font-extrabold text-blue-950">{opportunity.qualificationRequirement}</p>
            </div>
            <ul className="space-y-2">
              {opportunity.requirements.map((req, i) => (
                <li key={i} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Responsibilities */}
          {opportunity.responsibilities.length > 0 && (
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-2">Responsibilities</h3>
              <ul className="space-y-2">
                {opportunity.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-800 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 mt-2"></span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Provenance Box */}
          <div className="bg-blue-50 text-blue-900 p-4 rounded-xl border border-blue-200 text-xs space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2">
              <span className="font-bold text-blue-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Verified Opportunity (Tier {prov.sourceTier || 1})
              </span>
              <span className="bg-white text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                {prov.verificationStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-blue-700 font-medium">Primary Source:</span> {prov.sourceName}</div>
              <div><span className="text-blue-700 font-medium">Employer:</span> {prov.employerName}</div>
              <div><span className="text-blue-700 font-medium">Listing Ref:</span> {prov.originalListingId || 'VERIFIED-REF'}</div>
              <div><span className="text-blue-700 font-medium">Verified Date:</span> {prov.lastVerifiedDate}</div>
            </div>

            {opportunity.sourceProvenanceList && opportunity.sourceProvenanceList.length > 1 && (
              <div className="mt-2 pt-2 border-t border-blue-200/80 text-[11px]">
                <span className="font-bold text-blue-900">Also available on: </span>
                {opportunity.sourceProvenanceList.map((p, idx) => (
                  <span key={p.sourceId} className="text-blue-800">
                    {p.sourceName}{idx < (opportunity.sourceProvenanceList?.length || 1) - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}

            {prov.attributionConfig?.text && (
              <div className="mt-1 text-[10px] text-slate-500 italic">
                {prov.attributionConfig.text}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-end gap-3">
          {isDestinationValid ? (
            <button
              onClick={() => onStartApplicationReadiness(opportunity, matchAnalysis?.jobRequirements, matchAnalysis || undefined, readinessAnalysis || undefined, candidateConfirmations)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-md text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>GET MY APPLICATION READY — R5</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto bg-slate-200 text-slate-500 font-bold px-8 py-3.5 rounded-xl text-sm flex items-center justify-center space-x-2 cursor-not-allowed border border-slate-300"
            >
              <AlertCircle className="w-4 h-4 text-slate-400" />
              <span>Application destination currently unavailable</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
