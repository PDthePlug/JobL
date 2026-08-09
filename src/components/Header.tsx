import React from 'react';
import { Briefcase, FileCheck, LayoutDashboard, ShieldCheck, MapPin, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'search' | 'cv' | 'applications' | 'operator';
  setActiveTab: (tab: 'search' | 'cv' | 'applications' | 'operator') => void;
  opportunityCount: number;
  savedPackagesCount: number;
  hasSavedCvProfile?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  opportunityCount,
  savedPackagesCount,
  hasSavedCvProfile,
}) => {
  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('search')}>
            <div className="bg-blue-600 text-white font-black text-2xl px-2.5 py-1 rounded-xl tracking-wider flex items-center gap-1">
              JobL
            </div>
            <div className="hidden sm:block border-l border-slate-300 pl-3">
              <p className="text-xs font-bold text-slate-800">South African Employment & Application Readiness</p>
              <p className="text-[11px] text-slate-500">Find real jobs near you • Get application ready</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Find Opportunities</span>
              {opportunityCount > 0 && (
                <span className="bg-white text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-sm">
                  {opportunityCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('cv')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'cv'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>UPLOAD MY CV</span>
              {hasSavedCvProfile && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'applications'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">My Applications</span>
              <span className="md:hidden">Packages</span>
              {savedPackagesCount > 0 && (
                <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                  {savedPackagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('operator')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'operator'
                  ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span className="hidden lg:inline">Operator View</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
