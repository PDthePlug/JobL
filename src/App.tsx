import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { LandingSearch } from './components/LandingSearch';
import { OpportunityCard } from './components/OpportunityCard';
import { OpportunityModal } from './components/OpportunityModal';
import { ApplicationReadinessFlow } from './components/ApplicationReadinessFlow';
import { MyApplications } from './components/MyApplications';
import { OperatorDashboard } from './components/OperatorDashboard';
import { CvUploadManager } from './components/CvUploadManager';
import { Opportunity, ApplicationPackage, CandidateCVProfile, JobRequirements, JobMatchAnalysis, ApplicationReadinessAnalysis } from './types';
import { RefreshCw, SearchX } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'cv' | 'applications' | 'operator'>('search');

  const [candidateProfile, setCandidateProfile] = useState<CandidateCVProfile | null>(() => {
    try {
      const stored = localStorage.getItem('jobl_candidate_cv_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedCity, setSelectedCity] = useState('All Locations');
  const [selectedProvince, setSelectedProvince] = useState('All Provinces');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSector, setSelectedSector] = useState('All Sectors');
  const [selectedExperience, setSelectedExperience] = useState('All Experience Levels');

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchError, setSearchError] = useState('');
  const searchAbortRef = useRef<AbortController | null>(null);

  const [inspectOpportunity, setInspectOpportunity] = useState<Opportunity | null>(null);
  const [readinessOpportunity, setReadinessOpportunity] = useState<Opportunity | null>(null);
  const [flowJobReqs, setFlowJobReqs] = useState<JobRequirements | undefined>(undefined);
  const [flowMatchAnalysis, setFlowMatchAnalysis] = useState<JobMatchAnalysis | undefined>(undefined);
  const [flowReadinessAnalysis, setFlowReadinessAnalysis] = useState<ApplicationReadinessAnalysis | undefined>(undefined);
  const [flowConfirmations, setFlowConfirmations] = useState<Record<string, string> | undefined>(undefined);

  const [savedPackages, setSavedPackages] = useState<ApplicationPackage[]>(() => {
    try {
      const stored = localStorage.getItem('jobl_application_packages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const fetchOpportunities = async (filters?: {
    city?: string;
    province?: string;
    category?: string;
    sector?: string;
    experience?: string;
  }) => {
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setIsLoading(true);
    setSearchError('');

    try {
      const city = filters?.city ?? selectedCity;
      const province = filters?.province ?? selectedProvince;
      const category = filters?.category ?? selectedCategory;
      const sector = filters?.sector ?? selectedSector;
      const experience = filters?.experience ?? selectedExperience;

      const query = new URLSearchParams({
        city: city === 'All Locations' ? '' : city,
        province: province === 'All Provinces' ? '' : province,
        category: category === 'All Categories' ? '' : category,
        sector: sector === 'All Sectors' ? '' : sector,
        experience: experience === 'All Experience Levels' ? '' : experience,
      });

      const res = await fetch(`/api/opportunities/search?${query.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to fetch jobs');
      }

      if (searchAbortRef.current === controller) {
        setOpportunities(data.opportunities || []);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      if (searchAbortRef.current === controller) {
        setSearchError('We couldn’t load jobs right now.');
      }
    } finally {
      if (searchAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchOpportunities();
    return () => searchAbortRef.current?.abort();
  }, []);

  const handleSearchSubmit = () => {
    void fetchOpportunities();
  };

  const handleSavePackage = (pkg: ApplicationPackage) => {
    setSavedPackages((current) => {
      const existingIndex = current.findIndex((item) => item.packageId === pkg.packageId);
      const updated =
        existingIndex >= 0
          ? current.map((item) => (item.packageId === pkg.packageId ? pkg : item))
          : [pkg, ...current];

      try {
        localStorage.setItem('jobl_application_packages', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save package locally:', err);
      }
      return updated;
    });
  };

  const clearFilters = () => {
    setSelectedCity('All Locations');
    setSelectedProvince('All Provinces');
    setSelectedCategory('All Categories');
    setSelectedSector('All Sectors');
    setSelectedExperience('All Experience Levels');
    void fetchOpportunities({
      city: 'All Locations',
      province: 'All Provinces',
      category: 'All Categories',
      sector: 'All Sectors',
      experience: 'All Experience Levels',
    });
  };

  const hasFilters =
    selectedCity !== 'All Locations' ||
    selectedProvince !== 'All Provinces' ||
    selectedCategory !== 'All Categories' ||
    selectedSector !== 'All Sectors' ||
    selectedExperience !== 'All Experience Levels';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        opportunityCount={opportunities.length}
        savedPackagesCount={savedPackages.length}
        hasSavedCvProfile={Boolean(candidateProfile)}
      />

      {activeTab === 'search' && (
        <main className="flex-1">
          <LandingSearch
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            selectedExperience={selectedExperience}
            setSelectedExperience={setSelectedExperience}
            onSearch={handleSearchSubmit}
            isSearching={isLoading}
            totalResultsCount={opportunities.length}
          />

          <div id="job-results" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 sm:mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-[-0.03em]">
                  Jobs for you
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Open a job to see the details and apply.
                </p>
              </div>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-slate-950 font-semibold cursor-pointer"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            {searchError && (
              <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-sm mb-6 flex items-center justify-between gap-4">
                <span>{searchError}</span>
                <button onClick={() => void fetchOpportunities()} className="font-semibold text-red-700 hover:text-red-900 cursor-pointer shrink-0">
                  Try again
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Finding jobs…</p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                  <SearchX className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">No jobs found</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Try another location or type of work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center bg-slate-950 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Show all jobs
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {opportunities.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onSelect={(selected) => setInspectOpportunity(selected)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === 'cv' && (
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
          <CvUploadManager
            currentProfile={candidateProfile}
            onProfileSaved={(prof) => setCandidateProfile(prof)}
          />
        </main>
      )}

      {activeTab === 'applications' && (
        <main className="flex-1">
          <MyApplications
            packages={savedPackages}
            candidateProfile={candidateProfile?.extractedData || null}
            onUpdatePackage={handleSavePackage}
          />
        </main>
      )}

      {activeTab === 'operator' && (
        <main className="flex-1">
          <OperatorDashboard />
        </main>
      )}

      {inspectOpportunity && (
        <OpportunityModal
          opportunity={inspectOpportunity}
          onClose={() => setInspectOpportunity(null)}
          onOpenCv={() => setActiveTab('cv')}
          onStartApplicationReadiness={(opp, reqs, match, readiness, confirmations) => {
            setInspectOpportunity(null);
            setFlowJobReqs(reqs);
            setFlowMatchAnalysis(match);
            setFlowReadinessAnalysis(readiness);
            setFlowConfirmations(confirmations);
            setReadinessOpportunity(opp);
          }}
        />
      )}

      {readinessOpportunity && (
        <ApplicationReadinessFlow
          opportunity={readinessOpportunity}
          jobRequirements={flowJobReqs}
          matchAnalysis={flowMatchAnalysis}
          readinessAnalysis={flowReadinessAnalysis}
          candidateConfirmations={flowConfirmations}
          onClose={() => {
            setReadinessOpportunity(null);
            setFlowJobReqs(undefined);
            setFlowMatchAnalysis(undefined);
            setFlowReadinessAnalysis(undefined);
            setFlowConfirmations(undefined);
          }}
          onCompletePackage={(pkg) => {
            handleSavePackage(pkg);
          }}
        />
      )}

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="text-sm font-bold text-slate-950">JobL</p>
            <p className="text-xs text-slate-500 mt-0.5">Jobs across South Africa</p>
          </div>
          <p className="text-xs text-slate-400">Verified jobs · Application help from R5</p>
        </div>
      </footer>
    </div>
  );
}
