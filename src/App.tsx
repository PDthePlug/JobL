import React, { useState, useEffect } from 'react';
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

  // Candidate CV Profile Persistent State
  const [candidateProfile, setCandidateProfile] = useState<CandidateCVProfile | null>(() => {
    try {
      const stored = localStorage.getItem('jobl_candidate_cv_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Search Filters
  const [selectedCity, setSelectedCity] = useState('All Locations');
  const [selectedProvince, setSelectedProvince] = useState('All Provinces');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSector, setSelectedSector] = useState('All Sectors');
  const [selectedExperience, setSelectedExperience] = useState('All Experience Levels');

  // State Data
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchError, setSearchError] = useState('');

  // Modals
  const [inspectOpportunity, setInspectOpportunity] = useState<Opportunity | null>(null);
  const [readinessOpportunity, setReadinessOpportunity] = useState<Opportunity | null>(null);
  const [flowJobReqs, setFlowJobReqs] = useState<JobRequirements | undefined>(undefined);
  const [flowMatchAnalysis, setFlowMatchAnalysis] = useState<JobMatchAnalysis | undefined>(undefined);
  const [flowReadinessAnalysis, setFlowReadinessAnalysis] = useState<ApplicationReadinessAnalysis | undefined>(undefined);
  const [flowConfirmations, setFlowConfirmations] = useState<Record<string, string> | undefined>(undefined);

  // Saved Packages Persistent Storage
  const [savedPackages, setSavedPackages] = useState<ApplicationPackage[]>(() => {
    try {
      const stored = localStorage.getItem('jobl_application_packages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Fetch Opportunities from API
  const fetchOpportunities = async () => {
    setIsLoading(true);
    setSearchError('');

    try {
      const query = new URLSearchParams({
        city: selectedCity === 'All Locations' ? '' : selectedCity,
        province: selectedProvince === 'All Provinces' ? '' : selectedProvince,
        category: selectedCategory === 'All Categories' ? '' : selectedCategory,
        sector: selectedSector === 'All Sectors' ? '' : selectedSector,
        experience: selectedExperience === 'All Experience Levels' ? '' : selectedExperience,
      });

      const res = await fetch(`/api/opportunities/search?${query.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch opportunities');
      }

      setOpportunities(data.opportunities || []);
      setIsLoading(false);
    } catch (err: any) {
      setSearchError(err.message || 'Error loading job opportunities');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleSearchSubmit = () => {
    fetchOpportunities();
  };

  const handleSavePackage = (pkg: ApplicationPackage) => {
    const updated = [pkg, ...savedPackages];
    setSavedPackages(updated);
    try {
      localStorage.setItem('jobl_application_packages', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save package locally:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Primary Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        opportunityCount={opportunities.length}
        savedPackagesCount={savedPackages.length}
        hasSavedCvProfile={Boolean(candidateProfile)}
      />

      {/* SEARCH TAB VIEW */}
      {activeTab === 'search' && (
        <main className="flex-1">
          {/* Landing Proposition & Search Filters */}
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

          {/* Results Section */}
          <div id="job-results" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
                  Opportunities near you
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Verified vacancies matched to your filters.
                </p>
              </div>

              {selectedCity !== 'All Locations' || selectedCategory !== 'All Categories' || selectedSector !== 'All Sectors' ? (
                <button
                  onClick={() => {
                    setSelectedCity('All Locations');
                    setSelectedProvince('All Provinces');
                    setSelectedCategory('All Categories');
                    setSelectedSector('All Sectors');
                    setSelectedExperience('All Experience Levels');
                    fetchOpportunities();
                  }}
                  className="text-sm text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>

            {/* Error State */}
            {searchError && (
              <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-sm mb-6 flex items-center justify-between gap-4">
                <span>{searchError}</span>
                <button onClick={fetchOpportunities} className="font-medium text-red-700 hover:text-red-900 cursor-pointer shrink-0">
                  Retry
                </button>
              </div>
            )}

            {/* Loading Grid */}
            {isLoading ? (
              <div className="py-20 text-center space-y-4">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Searching verified opportunities…</p>
              </div>
            ) : opportunities.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                  <SearchX className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">No opportunities found</h3>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Try a broader location or category to see more roles across South Africa.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCity('All Locations');
                    setSelectedProvince('All Provinces');
                    setSelectedCategory('All Categories');
                    setSelectedSector('All Sectors');
                    setSelectedExperience('All Experience Levels');
                    fetchOpportunities();
                  }}
                  className="inline-flex items-center justify-center bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Show all opportunities
                </button>
              </div>
            ) : (
              /* Opportunity Cards Grid */
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

      {/* UPLOAD MY CV TAB VIEW */}
      {activeTab === 'cv' && (
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
          <CvUploadManager
            currentProfile={candidateProfile}
            onProfileSaved={(prof) => setCandidateProfile(prof)}
          />
        </main>
      )}

      {/* MY APPLICATIONS TAB VIEW */}
      {activeTab === 'applications' && (
        <main className="flex-1">
          <MyApplications packages={savedPackages} />
        </main>
      )}

      {/* OPERATOR VIEW TAB */}
      {activeTab === 'operator' && (
        <main className="flex-1">
          <OperatorDashboard />
        </main>
      )}

      {/* MODALS */}
      {/* 1. Detail Inspection Modal */}
      {inspectOpportunity && (
        <OpportunityModal
          opportunity={inspectOpportunity}
          onClose={() => setInspectOpportunity(null)}
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

      {/* 2. R5 Application Readiness Workflow Modal */}
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

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="text-sm font-semibold text-slate-900">JobL</p>
            <p className="text-xs text-slate-500 mt-0.5">Employment access & application readiness for South Africa</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>POPIA compliant</span>
            <span className="text-slate-300">·</span>
            <span>Verified sources</span>
            <span className="text-slate-300">·</span>
            <span>R5 readiness</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
