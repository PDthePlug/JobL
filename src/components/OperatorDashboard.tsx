import React, { useEffect, useState } from 'react';
import { OperatorDashboardStats } from '../types';
import {
  LayoutDashboard,
  ShieldCheck,
  Activity,
  MapPin,
  Briefcase,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const [stats, setStats] = useState<OperatorDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/operator/stats');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch operator statistics');
      setStats(data.stats);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-20 px-4 text-center">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading operator metrics…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-red-900">Couldn’t load dashboard</h2>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            type="button"
            onClick={fetchStats}
            className="mt-4 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const funnel = stats.conversionFunnel;

  const kpi = [
    {
      label: 'Total opportunities',
      value: stats.totalOpportunities,
      hint: 'In pipeline',
    },
    {
      label: 'Verified',
      value: stats.verifiedOpportunities,
      hint: 'Source-verified',
      accent: 'text-emerald-600',
    },
    {
      label: 'Source adapters',
      value: stats.sourceHealthList?.length ?? 0,
      hint: 'Connected sources',
    },
    {
      label: 'External handoffs',
      value: funnel?.externalHandoffs ?? 0,
      hint: 'Apply clicks',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-10 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Operator
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            System health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pipeline, sources, and conversion funnel.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="inline-flex items-center gap-2 self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpi.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className={`text-2xl sm:text-3xl font-semibold mt-1 tabular-nums ${item.accent || 'text-slate-900'}`}>
              {item.value}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{item.hint}</p>
          </div>
        ))}
      </div>

      {/* Conversion funnel */}
      {funnel && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Conversion funnel</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Searches', value: funnel.searches },
              { label: 'Views', value: funnel.opportunityViews },
              { label: 'Readiness starts', value: funnel.readinessStarts },
              { label: 'Payments', value: funnel.paymentsCompleted },
              { label: 'Packages', value: funnel.packagesGenerated },
              { label: 'Handoffs', value: funnel.externalHandoffs },
            ].map((step) => (
              <div
                key={step.label}
                className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 text-center"
              >
                <p className="text-lg sm:text-xl font-semibold text-slate-900 tabular-nums">
                  {step.value ?? 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{step.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Source health */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Source health</h2>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-left text-sm min-w-[480px]">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="font-medium py-2 pr-3">Source</th>
                <th className="font-medium py-2 pr-3">Status</th>
                <th className="font-medium py-2 pr-3">Tier</th>
                <th className="font-medium py-2 text-right">Listings</th>
              </tr>
            </thead>
            <tbody>
              {(stats.sourceHealthList || []).map((src: any, idx: number) => (
                <tr key={src.sourceId || idx} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3 font-medium text-slate-800">
                    {src.sourceName || src.name || src.sourceId}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        (src.status || src.healthStatus || '').toString().toUpperCase().includes('ACTIVE') ||
                        (src.status || src.healthStatus || '').toString().toUpperCase().includes('HEALTHY') ||
                        (src.status || src.healthStatus || '').toString().toUpperCase() === 'OK'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {src.status || src.healthStatus || src.sourceStatus || '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-500 tabular-nums">
                    {src.tier ?? src.sourceTier ?? '—'}
                  </td>
                  <td className="py-3 text-right tabular-nums text-slate-700">
                    {src.listingCount ?? src.count ?? src.opportunities ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!stats.sourceHealthList || stats.sourceHealthList.length === 0) && (
          <p className="text-sm text-slate-400 py-4 text-center">No source health data.</p>
        )}
      </section>

      {/* Locations + categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Top locations</h2>
          </div>
          <ul className="space-y-2">
            {(stats.topLocations || []).map((loc: any, idx: number) => (
              <li
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0"
              >
                <span className="font-medium text-slate-800">{loc.city}</span>
                <span className="text-xs text-slate-500 tabular-nums bg-slate-50 px-2 py-0.5 rounded-md">
                  {loc.count}
                </span>
              </li>
            ))}
            {(!stats.topLocations || stats.topLocations.length === 0) && (
              <li className="text-sm text-slate-400 py-2">No location data yet.</li>
            )}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Top categories</h2>
          </div>
          <ul className="space-y-2">
            {(stats.topCategories || []).map((cat: any, idx: number) => (
              <li
                key={idx}
                className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0"
              >
                <span className="font-medium text-slate-800 truncate pr-2">{cat.category}</span>
                <span className="text-xs text-slate-500 tabular-nums bg-slate-50 px-2 py-0.5 rounded-md shrink-0">
                  {cat.count}
                </span>
              </li>
            ))}
            {(!stats.topCategories || stats.topCategories.length === 0) && (
              <li className="text-sm text-slate-400 py-2">No category data yet.</li>
            )}
          </ul>
        </section>
      </div>

      {/* Event stream */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            Recent events
            <span className="text-slate-400 font-normal ml-1.5">
              ({stats.recentAnalyticsEvents?.length ?? 0})
            </span>
          </h2>
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1.5">
          {(stats.recentAnalyticsEvents || []).map((evt: any) => (
            <div
              key={evt.id}
              className="flex items-center justify-between gap-3 text-xs sm:text-sm py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
            >
              <span className="font-medium text-slate-800 truncate">{evt.eventName}</span>
              <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                {evt.timestamp?.includes('T')
                  ? evt.timestamp.split('T')[1]?.split('.')[0]
                  : evt.timestamp}
              </span>
            </div>
          ))}
          {(!stats.recentAnalyticsEvents || stats.recentAnalyticsEvents.length === 0) && (
            <p className="text-sm text-slate-400 py-4 text-center">No recent events.</p>
          )}
        </div>
      </section>
    </div>
  );
};
