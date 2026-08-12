import React from 'react';

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
  savedPackagesCount,
}) => {
  const navItems: Array<{
    id: 'search' | 'cv' | 'applications';
    label: string;
    badge?: number;
  }> = [
    { id: 'search', label: 'Jobs' },
    { id: 'cv', label: 'My CV' },
    {
      id: 'applications',
      label: 'My applications',
      badge: savedPackagesCount > 0 ? savedPackagesCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/70 safe-top">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className="text-left cursor-pointer shrink-0"
            aria-label="Go to jobs"
          >
            <span className="text-xl font-black tracking-[-0.04em] text-slate-950">JobL</span>
          </button>

          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 sm:px-4 text-sm font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`min-w-5 h-5 rounded-full px-1.5 inline-flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
