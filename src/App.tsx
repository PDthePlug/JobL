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
import { RefreshCw, SearchX, Briefcase, Sparkles, MapPin, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
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
            selectedExperience={selectedExperience}
            setSelectedExperience={setSelectedExperience}
            onSearch={handleSearchSubmit}
            isSearching={isLoading}
            totalResultsCount={opportunities.length}
          />

          {/* Results Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Verified Opportunities Near You
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Showing real vacancies matched to your location and work preferences.
                </p>
              </div>

              {selectedCity !== 'All Locations' || selectedCategory !== 'All Categories' ? (
                <button
                  onClick={() => {
                    setSelectedCity('All Locations');
                    setSelectedProvince('All Provinces');
                    setSelectedCategory('All Categories');
                    setSelectedExperience('All Experience Levels');
                    fetchOpportunities();
                  }}
                  className="text-xs text-blue-700 hover:text-blue-800 font-semibold underline cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : null}
            </div>

            {/* Error State */}
            {searchError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs mb-6 flex items-center justify-between">
                <span>{searchError}</span>
                <button onClick={fetchOpportunities} className="font-bold underline cursor-pointer">
                  Retry
                </button>
              </div>
            )}

            {/* Loading Grid */}
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Searching verified South African opportunities...</p>
              </div>
            ) : opportunities.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-3">
                <SearchX className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">No qualifying opportunities found</h3>
                <p className="text-xs text-slate-600">
                  Try adjusting your location or selecting 'All Categories' to explore available roles across South Africa.
                </p>
                <button
                  onClick={() => {
                    setSelectedCity('All Locations');
                    setSelectedProvince('All Provinces');
                    setSelectedCategory('All Categories');
                    setSelectedExperience('All Experience Levels');
                    fetchOpportunities();
                  }}
                  className="bg-blue-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer hover:bg-blue-700"
                >
                  Show All Opportunities
                </button>
              </div>
            ) : (
              /* Opportunity Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 px-4 text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-extrabold text-white text-sm">JobL — South Africa</p>
            <p className="text-slate-400 mt-0.5">Empowering employment discovery & application readiness.</p>
          </div>
          <div className="flex items-center space-x-4 text-slate-300">
            <span>POPIA Compliant</span>
            <span>•</span>
            <span>Verified Sources</span>
            <span>•</span>
            <span>R5 Service Readiness</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
