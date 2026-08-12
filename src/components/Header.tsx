import React from 'react';
import { Briefcase, FileText, FileCheck, LayoutDashboard } from 'lucide-react';

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
  const navItems: Array<{
    id: 'search' | 'cv' | 'applications' | 'operator';
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    badge?: number | boolean;
    badgeTone?: 'brand' | 'success';
  }> = [
    {
      id: 'search',
      label: 'Jobs',
      shortLabel: 'Jobs',
      icon: Briefcase,
      badge: opportunityCount > 0 ? opportunityCount : undefined,
      badgeTone: 'brand',
    },
    {
      id: 'cv',
      label: 'My CV',
      shortLabel: 'CV',
      icon: FileText,
      badge: hasSavedCvProfile ? true : undefined,
      badgeTone: 'success',
    },
    {
      id: 'applications',
      label: 'Applications',
      shortLabel: 'Apps',
      icon: FileCheck,
      badge: savedPackagesCount > 0 ? savedPackagesCount : undefined,
      badgeTone: 'success',
    },
    {
      id: 'operator',
      label: 'Operator',
      shortLabel: 'Ops',
      icon: LayoutDashboard,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 safe-top">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand */}
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2 group cursor-pointer shrink-0 min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight group-hover:bg-slate-800 transition-colors">
              J
            </div>
            <div className="hidden xs:block sm:block text-left">
              <p className="text-sm font-semibold text-slate-900 leading-none tracking-tight">
                JobL
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-none hidden sm:block">
                South Africa
              </p>
            </div>
          </button>

          {/* Nav — scrollable on very small screens */}
          <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar max-w-[70%] sm:max-w-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shrink-0
                    min-h-[40px]
                    ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden text-xs">{item.shortLabel}</span>

                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`
                        ml-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center
                        ${
                          item.badgeTone === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                        }
                      `}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}

                  {item.badge === true && (
                    <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
