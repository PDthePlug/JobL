import React from 'react';
import { Opportunity } from '../types';
import { ArrowUpRight, MapPin, ShieldCheck } from 'lucide-react';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onSelect: (opportunity: Opportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onSelect }) => {
  const isVerified = opportunity.sourceProvenance.verificationStatus === 'VERIFIED';
  const locationLabel = [opportunity.location.city, opportunity.location.suburbOrTownship]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onSelect(opportunity)}
      className="group w-full h-full text-left bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-slate-300 hover:shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      <div className="h-full flex flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500 truncate">{opportunity.employer}</p>
            <h3 className="mt-1.5 text-lg font-bold text-slate-950 leading-snug tracking-[-0.02em] group-hover:text-blue-700 transition-colors">
              {opportunity.title}
            </h3>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 shrink-0 transition-colors" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {locationLabel || opportunity.location.province}
          </span>
          {opportunity.employmentType ? <span>· {opportunity.employmentType}</span> : null}
          {opportunity.experienceLevel ? <span>· {opportunity.experienceLevel}</span> : null}
        </div>

        {opportunity.salary?.formatted ? (
          <p className="mt-4 text-sm font-bold text-slate-900">{opportunity.salary.formatted}</p>
        ) : null}

        {opportunity.summary ? (
          <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
            {opportunity.summary}
          </p>
        ) : <div className="flex-1" />}

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-blue-700">View job</span>
          {isVerified ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
};
