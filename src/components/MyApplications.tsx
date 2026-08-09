import React, { useState } from 'react';
import { ApplicationPackage } from '../types';
import { FileCheck, ExternalLink, Copy, Check, ChevronDown, ChevronUp, Calendar, Building2, UserCheck } from 'lucide-react';

interface MyApplicationsProps {
  packages: ApplicationPackage[];
}

export const MyApplications: React.FC<MyApplicationsProps> = ({ packages }) => {
  const [expandedId, setExpandedId] = useState<string | null>(packages.length > 0 ? packages[0].packageId : null);
  const [copiedCvId, setCopiedCvId] = useState<string | null>(null);

  if (packages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
            <FileCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No Prepared Application Packages Yet</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
            When you select an opportunity and prepare your R5 application package, your tailored CV, cover letter, and interview tips will appear here for easy access.
          </p>
        </div>
      </div>
    );
  }

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCvId(id);
    setTimeout(() => setCopiedCvId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Prepared Applications</h1>
          <p className="text-xs sm:text-sm text-slate-600">Review your job-specific tailored CVs, cover letters, and employer referral links.</p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
          {packages.length} Packages Ready
        </span>
      </div>

      <div className="space-y-4">
        {packages.map((pkg) => {
          const isExpanded = expandedId === pkg.packageId;

          return (
            <div key={pkg.packageId} className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all">
              {/* Header Bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : pkg.packageId)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2 text-xs text-amber-700 font-semibold mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{pkg.employerName}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-mono text-[10px]">{pkg.createdAt.split('T')[0]}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{pkg.opportunityTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prepared for {pkg.candidateLead.firstName} {pkg.candidateLead.surname} ({pkg.candidateLead.email})
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                    Match {pkg.cvAnalysis.overallCompatibilityScore}%
                  </span>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {/* Expanded Package Body */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200 bg-slate-50/50 space-y-4">
                  {/* Tailored CV Box */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Tailored CV</span>
                      <button
                        onClick={() => copyText(pkg.packageId + '_cv', pkg.cvAnalysis.tailoredCVText)}
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCvId === pkg.packageId + '_cv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCvId === pkg.packageId + '_cv' ? 'Copied!' : 'Copy Tailored CV'}</span>
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-slate-800 bg-white max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {pkg.cvAnalysis.tailoredCVText}
                    </pre>
                  </div>

                  {/* Cover Letter Box */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cover Letter</span>
                      <button
                        onClick={() => copyText(pkg.packageId + '_cover', pkg.cvAnalysis.coverLetterMessage)}
                        className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCvId === pkg.packageId + '_cover' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCvId === pkg.packageId + '_cover' ? 'Copied!' : 'Copy Cover Letter'}</span>
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-sans text-slate-800 bg-white max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {pkg.cvAnalysis.coverLetterMessage}
                    </pre>
                  </div>

                  {/* Action Handoff */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">Ref Tx: {pkg.paymentTransaction.reference}</span>
                    <a
                      href={pkg.originalApplicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
                    >
                      <span>Re-Open Employer Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
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
