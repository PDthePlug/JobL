import React, { useEffect, useState } from 'react';
import { OperatorDashboardStats } from '../types';
import { LayoutDashboard, ShieldCheck, Activity, MapPin, Briefcase, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';

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
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading JobL Operational Metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold">Operator Dashboard Load Error</h2>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const funnel = stats.conversionFunnel;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span>JobL Internal Operator Diagnostics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Performance & Source Health</h1>
        </div>

        <button
          onClick={fetchStats}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span>Refresh Real Metrics</span>
        </button>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Opportunities</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalOpportunities}</p>
          <span className="inline-block mt-2 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
            Live Pipeline Total
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Verified Opportunities</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{stats.verifiedOpportunities}</p>
          <span className="inline-block mt-2 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
            100% Provenance Checked
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Source Adapter Count</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{stats.sourceHealthList.length}</p>
          <span className="inline-block mt-2 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
            Active Feed Adapters
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">External Handoffs</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{funnel.externalHandoffs}</p>
          <span className="inline-block mt-2 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
            Employer Referrals
          </span>
        </div>
      </div>

      {/* Source Health Diagnostics */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Source Health Status & Feed Ingestion
          </h2>
          <span className="text-xs text-slate-400 font-mono">Live Adapter Registry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.sourceHealthList.map((source) => (
            <div key={source.sourceId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{source.sourceName}</h3>
                  <p className="text-[11px] text-slate-400">{source.sourceType}</p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${
                  source.status === 'LIVE' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                  source.status === 'PARTNER' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                  'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {source.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-900">
                <span>Active Listings: <strong>{source.totalListingsCount}</strong></span>
                <span className="text-[10px] text-slate-500 font-mono">Synced: {source.lastSyncTime.split('T')[1].split('.')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Funnel Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-600" />
          Job Seeker Conversion Funnel
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Searches</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{funnel.searches}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Job Clicks</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{funnel.opportunityClicks}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">App Starts</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{funnel.applicationStarts}</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Leads Captured</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{funnel.leadCaptures}</p>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-[10px] font-semibold text-amber-900 uppercase">R5 Payments</span>
            <p className="text-xl font-bold text-amber-950 mt-1">{funnel.paymentsCompleted}</p>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-semibold text-emerald-900 uppercase">Handoffs</span>
            <p className="text-xl font-bold text-emerald-950 mt-1">{funnel.externalHandoffs}</p>
          </div>
        </div>
      </div>

      {/* Top Locations & Job Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-600" />
            Top South African Job Seeker Locations
          </h3>
          <div className="space-y-2">
            {stats.topLocations.map((loc, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-semibold text-slate-800">{loc.city}</span>
                <span className="bg-slate-100 text-slate-700 font-mono text-[11px] px-2 py-0.5 rounded font-bold">
                  {loc.count} searches
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-amber-600" />
            Top In-Demand Job Categories
          </h3>
          <div className="space-y-2">
            {stats.topCategories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-semibold text-slate-800">{cat.category}</span>
                <span className="bg-amber-50 text-amber-900 font-mono text-[11px] px-2 py-0.5 rounded font-bold border border-amber-200/60">
                  {cat.count} views
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Event Stream */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Recent Product Event Audit Log ({stats.recentAnalyticsEvents.length})
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {stats.recentAnalyticsEvents.map((evt) => (
            <div key={evt.id} className="text-xs flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-100 font-mono">
              <span className="font-bold text-slate-800">{evt.eventName}</span>
              <span className="text-[10px] text-slate-500">{evt.timestamp.split('T')[1].split('.')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
