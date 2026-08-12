import React from 'react';
import { Opportunity } from '../types';
import { MapPin, Building2, ShieldCheck, ChevronRight } from 'lucide-react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onSelect: (opportunity: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onSelect }) => {
  const isVerified = opportunity.sourceProvenance.verificationStatus === 'VERIFIED';
  const locationLabel = [
    opportunity.location.city,
    opportunity.location.suburbOrTownship,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onSelect(opportunity)}
      className="group w-full text-left bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6
                 shadow-sm hover:shadow-md hover:border-slate-300
                 transition-all duration-200 cursor-pointer
                 flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      {/* Top meta */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0 text-sm text-slate-500">
          <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate font-medium">{opportunity.employer}</span>
        </div>
        {isVerified && (
          <span
            className="inline-flex items-center gap-1 shrink-0 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"
            title="Verified source"
          >
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      {/* Title — primary hierarchy */}
      <h3 className="text-base sm:text-[17px] font-semibold text-slate-900 leading-snug tracking-tight group-hover:text-blue-700 transition-colors">
        {opportunity.title}
      </h3>

      {/* Location + type — single quiet line */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {locationLabel || opportunity.location.province}
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

      {/* Salary — only if present, calm */}
      {opportunity.salary?.formatted && (
        <p className="mt-3 text-sm font-medium text-slate-800">
          {opportunity.salary.formatted}
        </p>
      )}

      {/* Summary — two lines max */}
      {opportunity.summary && (
        <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
          {opportunity.summary}
        </p>
      )}

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 truncate max-w-[55%]">
          {opportunity.sourceProvenance.sourceName}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700">
          View
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
};
