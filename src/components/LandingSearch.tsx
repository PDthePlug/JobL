import React from 'react';
import { MapPin, Search, Briefcase, Award, CheckCircle2, Building2 } from 'lucide-react';
import { PRIMARY_SA_LOCATIONS, SOUTH_AFRICAN_PROVINCES } from '../data/saLocations';
import { SA_JOB_CATEGORIES, EXPERIENCE_LEVELS, SA_SECTORS } from '../data/jobCategories';

interface LandingSearchProps {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedProvince: string;
  setSelectedProvince: (province: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedSector: string;
  setSelectedSector: (sector: string) => void;
  selectedExperience: string;
  setSelectedExperience: (exp: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  totalResultsCount: number;
}

export const LandingSearch: React.FC<LandingSearchProps> = ({
  selectedCity,
  setSelectedCity,
  selectedProvince,
  setSelectedProvince,
  selectedCategory,
  setSelectedCategory,
  selectedSector,
  setSelectedSector,
  selectedExperience,
  setSelectedExperience,
  onSearch,
  isSearching,
  totalResultsCount,
}) => {
  return (
    <div className="bg-blue-600 text-white pt-10 pb-12 px-4 sm:px-6 lg:px-8 border-b border-blue-700">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Proposition & Discovery Filters */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Find a job you can actually apply for.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-2xl leading-relaxed">
                Tell us where you are and what kind of work you're looking for. We'll show you relevant opportunities and help you prepare your application for R5.
              </p>
            </div>

            {/* Filter Form Box */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl space-y-4 text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location Filter */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    Location
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      const loc = PRIMARY_SA_LOCATIONS.find(l => l.city === e.target.value);
                      if (loc) setSelectedProvince(loc.province);
                      else setSelectedProvince('All Provinces');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All Locations">All South African Locations</option>
                    {PRIMARY_SA_LOCATIONS.map((loc, idx) => (
                      <option key={idx} value={loc.city}>
                        {loc.city} ({loc.province})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sector / Employer Type Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Sector / Opportunity Type
                  </label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    {SA_SECTORS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    Type of work (Category)
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All Categories">All Job Categories</option>
                    {SA_JOB_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Level */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-blue-500" />
                    Experience Level (Optional)
                  </label>
                  <select
                    value={selectedExperience}
                    onChange={(e) => setSelectedExperience(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="All Experience Levels">Any Experience Level</option>
                    {EXPERIENCE_LEVELS.map((exp) => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={onSearch}
                  disabled={isSearching}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>FIND JOBS</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Trust Points (Simplified) */}
          <div className="lg:col-span-5 hidden lg:block space-y-4 pt-16">
            <div className="bg-blue-700/50 border border-blue-500 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-white text-lg mb-4">How it works</h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-200 shrink-0" />
                  <span className="text-sm text-blue-50">Search for jobs in your area and find opportunities that match your skills.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-200 shrink-0" />
                  <span className="text-sm text-blue-50">Pay R5 to get your application ready with a job-specific CV and cover letter.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-200 shrink-0" />
                  <span className="text-sm text-blue-50">Apply directly to the employer with your tailored application package.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
