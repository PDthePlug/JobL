import React from 'react';
import { JobMatchAnalysis, OverallMatchStatus } from '../types';
import { AlertCircle, ArrowRight, Check, FileText, HelpCircle } from 'lucide-react';

interface JobMatchDisplayProps {
  analysis: JobMatchAnalysis | null;
  isLoading?: boolean;
  error?: string | null;
  onUploadCvClick?: () => void;
}

const getStatus = (status: OverallMatchStatus) => {
  switch (status) {
    case 'STRONG_MATCH':
      return {
        label: 'Looks like a strong fit',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-100',
      };
    case 'POTENTIAL_MATCH':
      return {
        label: 'Looks promising',
        className: 'bg-blue-50 text-blue-800 border-blue-100',
      };
    case 'PARTIAL_MATCH':
      return {
        label: 'Some things to check',
        className: 'bg-amber-50 text-amber-800 border-amber-100',
      };
    case 'LOW_MATCH':
      return {
        label: 'Probably not your best fit',
        className: 'bg-rose-50 text-rose-800 border-rose-100',
      };
    case 'INSUFFICIENT_INFORMATION':
    default:
      return {
        label: 'We need a little more information',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
};

export const JobMatchDisplay: React.FC<JobMatchDisplayProps> = ({
  analysis,
  isLoading = false,
  error = null,
  onUploadCvClick,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Checking your CV against this job…</p>
            <p className="text-xs text-slate-500 mt-0.5">This should only take a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-950">We couldn’t check your CV right now.</p>
          <p className="text-xs text-amber-800 mt-0.5">You can still read the job and prepare your application.</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-lg">
            <p className="text-sm font-semibold text-slate-950">Want to know if this job suits your CV?</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Add your CV once and JobL will show what you already have and what you may need to check.
            </p>
          </div>
          {onUploadCvClick && (
            <button
              type="button"
              onClick={onUploadCvClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              Add my CV
            </button>
          )}
        </div>
      </div>
    );
  }

  const status = getStatus(analysis.overallStatus);
  const thingsToCheck = [
    ...analysis.partialMatches,
    ...analysis.missingEvidence,
    ...analysis.unknownRequirements,
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Do I fit?</p>
            <h3 className="text-lg font-bold text-slate-950 mt-1">What your CV says</h3>
          </div>
          <span className={`inline-flex self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        </div>
        {analysis.evidenceSummary && (
          <p className="text-sm text-slate-600 leading-relaxed mt-4">{analysis.evidenceSummary}</p>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {analysis.matchedRequirements.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-slate-950 mb-3">You already have</h4>
            <div className="space-y-2.5">
              {analysis.matchedRequirements.map((item) => (
                <div key={item.requirementId} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span>{item.requirement}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {thingsToCheck.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-slate-950 mb-3">Check these</h4>
            <div className="space-y-2.5">
              {thingsToCheck.map((item) => (
                <div key={item.requirementId} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p>{item.requirement}</p>
                    {item.explanation && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.explanation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {analysis.nextPreparationAreas.length > 0 && (
          <section className="rounded-xl bg-blue-50/70 border border-blue-100 p-4">
            <h4 className="text-sm font-semibold text-blue-950">What to highlight</h4>
            <ul className="mt-2.5 space-y-2">
              {analysis.nextPreparationAreas.map((area, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                  <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
