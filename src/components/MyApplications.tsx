import React, { useState } from 'react';
import { ApplicationPackage } from '../types';
import {
  FileCheck,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
} from 'lucide-react';

interface MyApplicationsProps {
  packages: ApplicationPackage[];
}

export const MyApplications: React.FC<MyApplicationsProps> = ({ packages }) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    packages.length > 0 ? packages[0].packageId : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (packages.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 sm:py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
          <FileCheck className="w-5 h-5 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">No applications yet</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          When you prepare an R5 application package for a job, your tailored CV, cover letter,
          and employer link will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your prepared packages — CV, cover letter, and apply link.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
          {packages.length} ready
        </span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {packages.map((pkg) => {
          const isExpanded = expandedId === pkg.packageId;
          const dateLabel = pkg.createdAt?.split('T')[0] || '';

          return (
            <div
              key={pkg.packageId}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Row header */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : pkg.packageId)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">{pkg.employerName}</span>
                    {dateLabel && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="shrink-0">{dateLabel}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {pkg.opportunityTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    For {pkg.candidateLead.firstName} {pkg.candidateLead.surname}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {typeof pkg.cvAnalysis?.overallCompatibilityScore === 'number' && (
                    <span className="hidden sm:inline-flex text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                      {pkg.cvAnalysis.overallCompatibilityScore}% match
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 space-y-4 pt-4">
                  {/* Tailored CV */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <span className="text-xs font-medium text-slate-700">Tailored CV</span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(pkg.packageId + '_cv', pkg.cvAnalysis.tailoredCVText)
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        {copiedId === pkg.packageId + '_cv' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-700 bg-white max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {pkg.cvAnalysis.tailoredCVText}
                    </pre>
                  </div>

                  {/* Cover letter */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <span className="text-xs font-medium text-slate-700">Cover letter</span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(pkg.packageId + '_cover', pkg.cvAnalysis.coverLetterMessage)
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        {copiedId === pkg.packageId + '_cover' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs text-slate-700 bg-white max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {pkg.cvAnalysis.coverLetterMessage}
                    </pre>
                  </div>

                  {/* Footer actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                    <span className="text-xs text-slate-400 font-mono">
                      {pkg.paymentTransaction?.reference
                        ? `Ref ${pkg.paymentTransaction.reference}`
                        : ''}
                    </span>
                    {pkg.originalApplicationUrl && (
                      <a
                        href={pkg.originalApplicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                      >
                        Open employer portal
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
