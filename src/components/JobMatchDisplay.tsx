import React from 'react';
import { JobMatchAnalysis, OverallMatchStatus } from '../types';
import { CheckCircle2, AlertTriangle, HelpCircle, Sparkles, ShieldAlert, FileText, ArrowRight } from 'lucide-react';

interface JobMatchDisplayProps {
  analysis: JobMatchAnalysis | null;
  isLoading?: boolean;
  error?: string | null;
  onUploadCvClick?: () => void;
}

export const JobMatchDisplay: React.FC<JobMatchDisplayProps> = ({
  analysis,
  isLoading = false,
  error = null,
  onUploadCvClick,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-pulse space-y-3">
        <div className="w-8 h-8 rounded-full bg-blue-200 mx-auto"></div>
        <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
        <div className="h-3 bg-slate-200 rounded w-2/3 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Match Intelligence Notice</p>
          <p className="mt-1 text-amber-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 sm:p-6 text-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-extrabold text-blue-950 uppercase tracking-wider">YOUR CANDIDATE MATCH</h4>
            <p className="text-xs text-slate-600 mt-1">
              Upload your CV or profile to instantly compare your real experience against this job's requirements.
            </p>
          </div>
        </div>
        {onUploadCvClick && (
          <button
            onClick={onUploadCvClick}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Upload CV to Match</span>
          </button>
        )}
      </div>
    );
  }

  const getStatusBadge = (status: OverallMatchStatus) => {
    switch (status) {
      case 'STRONG_MATCH':
        return {
          label: 'Strong Match',
          bg: 'bg-emerald-100 text-emerald-950 border-emerald-300',
          dot: 'bg-emerald-600',
        };
      case 'POTENTIAL_MATCH':
        return {
          label: 'Potential Match',
          bg: 'bg-blue-100 text-blue-950 border-blue-300',
          dot: 'bg-blue-600',
        };
      case 'PARTIAL_MATCH':
        return {
          label: 'Partial Match',
          bg: 'bg-amber-100 text-amber-950 border-amber-300',
          dot: 'bg-amber-600',
        };
      case 'LOW_MATCH':
        return {
          label: 'Low Match',
          bg: 'bg-rose-100 text-rose-950 border-rose-300',
          dot: 'bg-rose-600',
        };
      case 'INSUFFICIENT_INFORMATION':
      default:
        return {
          label: 'Insufficient Information',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-slate-500',
        };
    }
  };

  const statusBadge = getStatusBadge(analysis.overallStatus);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden my-4">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">YOUR MATCH</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
            {analysis.jobTitle}
          </h3>
        </div>

        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border ${statusBadge.bg}`}>
          <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`}></span>
          <span>{statusBadge.label}</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6 text-slate-800 text-xs sm:text-sm">
        {/* Summary Statement */}
        <p className="text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-medium">
          {analysis.evidenceSummary}
        </p>

        {/* 1. MATCHED REQUIREMENTS */}
        {analysis.matchedRequirements.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Matched Requirements ({analysis.matchedRequirements.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.matchedRequirements.map((m) => (
                <div key={m.requirementId} className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-emerald-700 font-extrabold text-sm shrink-0">✓</span>
                  <div>
                    <p className="font-bold text-emerald-950">{m.requirement}</p>
                    {m.candidateEvidence && (
                      <p className="text-[11px] text-emerald-900 mt-1 italic bg-white/60 p-2 rounded border border-emerald-200/60 font-mono">
                        Evidence: "{m.candidateEvidence}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. NEEDS ATTENTION (PARTIAL MATCHES & MISSING EVIDENCE) */}
        {(analysis.partialMatches.length > 0 || analysis.missingEvidence.length > 0) && (
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Needs Attention ({analysis.partialMatches.length + analysis.missingEvidence.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.partialMatches.map((p) => (
                <div key={p.requirementId} className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-amber-700 font-extrabold text-sm shrink-0">△</span>
                  <div>
                    <p className="font-bold text-amber-950">{p.requirement}</p>
                    <p className="text-[11px] text-amber-900 mt-0.5">{p.explanation}</p>
                    {p.candidateEvidence && (
                      <p className="text-[11px] text-amber-900 mt-1 font-medium">
                        Candidate history: "{p.candidateEvidence}"
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {analysis.missingEvidence.map((m) => (
                <div key={m.requirementId} className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-rose-700 font-extrabold text-sm shrink-0">✕</span>
                  <div>
                    <p className="font-bold text-rose-950">{m.requirement}</p>
                    <p className="text-[11px] text-rose-900 mt-0.5">
                      Explicit requirement with no supporting evidence found in candidate profile.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. INFORMATION WE COULDN'T CONFIRM */}
        {analysis.unknownRequirements.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Information We Couldn't Confirm ({analysis.unknownRequirements.length})</span>
            </h4>
            <div className="space-y-2">
              {analysis.unknownRequirements.map((u) => (
                <div key={u.requirementId} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-slate-500 font-extrabold text-sm shrink-0">?</span>
                  <div>
                    <p className="font-bold text-slate-900">{u.requirement}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {u.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preparation Focus Areas */}
        {analysis.nextPreparationAreas.length > 0 && (
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-1">Recommended Application Focus</p>
            <ul className="space-y-1 text-xs text-blue-900">
              {analysis.nextPreparationAreas.map((area, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
