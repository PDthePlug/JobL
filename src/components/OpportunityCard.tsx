import React from 'react';
import { Opportunity } from '../types';
import { MapPin, Building2, Calendar, Award, CheckCircle2, ChevronRight, ShieldCheck, DollarSign } from 'lucide-react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onSelect: (opportunity: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onSelect }) => {
  const isVerified = opportunity.sourceProvenance.verificationStatus === 'VERIFIED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group">
      <div>
        {/* Header: Employer & Badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 mb-1">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="truncate max-w-[200px]">{opportunity.employer}</span>
              {isVerified && (
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 inline ml-0.5" title="Verified Source" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
              {opportunity.title}
            </h3>
          </div>
        </div>

        {/* Location & Employment Type Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
            <MapPin className="w-3 h-3 text-slate-600" />
            <span>
              {opportunity.location.city}
              {opportunity.location.suburbOrTownship ? ` (${opportunity.location.suburbOrTownship})` : ''}
            </span>
          </span>

          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold border border-slate-200">
            <BriefcaseIcon className="w-3 h-3 text-slate-600" />
            <span>{opportunity.employmentType}</span>
          </span>

          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-bold border border-blue-200">
            <Award className="w-3 h-3 text-blue-700" />
            <span>{opportunity.experienceLevel}</span>
          </span>
        </div>

        {/* Salary Information */}
        {opportunity.salary && (
          <div className="mb-3 flex items-center space-x-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
            <span>{opportunity.salary.formatted}</span>
          </div>
        )}

        {/* Short Summary */}
        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
          {opportunity.summary}
        </p>

        {/* Match Explanation Badges */}
        {opportunity.matchExplanation && opportunity.matchExplanation.length > 0 && (
          <div className="mb-4 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 space-y-1">
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Why this match?</p>
            <div className="flex flex-wrap gap-1.5">
              {opportunity.matchExplanation.map((exp, i) => (
                <span key={i} className="text-[11px] text-slate-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                  {exp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500 font-medium">
            Source: {opportunity.sourceProvenance.sourceName}
          </span>
          {opportunity.sourceProvenance.attributionConfig?.text && (
            <span className="text-[10px] text-slate-400 italic">
              {opportunity.sourceProvenance.attributionConfig.text}
            </span>
          )}
        </div>

        <button
          onClick={() => onSelect(opportunity)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center space-x-1 cursor-pointer border border-blue-700 shadow-sm"
        >
          <span>View Job Details</span>
          <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
        </button>
      </div>
    </div>
  );
};

function BriefcaseIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
