import React, { useMemo, useState } from 'react';
import { Briefcase, ChevronDown, MapPin, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
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
  const [showFilters, setShowFilters] = useState(false);

  const locationsByProvince = useMemo(
    () =>
      SOUTH_AFRICAN_PROVINCES.map((province) => ({
        province,
        locations: PRIMARY_SA_LOCATIONS.filter((location) => location.province === province),
      })).filter((group) => group.locations.length > 0),
    []
  );

  const optionalFilterCount = [
    selectedProvince !== 'All Provinces',
    selectedSector !== 'All Sectors',
    selectedExperience !== 'All Experience Levels',
  ].filter(Boolean).length;

  const handleFindJobs = () => {
    onSearch();
    window.setTimeout(() => {
      document.getElementById('job-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);

    if (selectedCity === 'All Locations') return;
    const currentLocation = PRIMARY_SA_LOCATIONS.find((location) => location.city === selectedCity);
    if (!currentLocation || (province !== 'All Provinces' && currentLocation.province !== province)) {
      setSelectedCity('All Locations');
    }
  };

  return (
    <section className="bg-[#f7f7f3] border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-24">
        <div className="max-w-4xl">
          <p className="text-sm font-bold text-blue-700 tracking-tight mb-4">Jobs across South Africa</p>
          <h1 className="max-w-4xl text-[clamp(3rem,8vw,6.4rem)] leading-[0.94] tracking-[-0.065em] font-black text-slate-950">
            Find a job.<br />
            <span className="text-blue-700">Be ready to apply.</span>
          </h1>
        </div>

        <div className="mt-9 sm:mt-12 max-w-5xl">
          <div className="bg-white rounded-[1.75rem] border border-slate-200 shadow-[0_18px_55px_-32px_rgba(15,23,42,0.35)] p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3">
              <label className="group flex items-center gap-3 rounded-2xl bg-slate-50 border border-transparent focus-within:border-blue-300 focus-within:bg-white px-4 py-3.5 transition-colors">
                <Briefcase className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="sr-only">What job are you looking for?</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-[15px] font-semibold text-slate-900 outline-none cursor-pointer"
                  aria-label="What job are you looking for?"
                >
                  <option value="All Categories">What job are you looking for?</option>
                  {SA_JOB_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="group flex items-center gap-3 rounded-2xl bg-slate-50 border border-transparent focus-within:border-blue-300 focus-within:bg-white px-4 py-3.5 transition-colors">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <span className="sr-only">Where are you?</span>
                <select
                  value={selectedCity}
                  onChange={(event) => {
                    const city = event.target.value;
                    setSelectedCity(city);
                    const location = PRIMARY_SA_LOCATIONS.find((item) => item.city === city);
                    setSelectedProvince(location?.province || 'All Provinces');
                  }}
                  className="w-full min-w-0 bg-transparent text-[15px] font-semibold text-slate-900 outline-none cursor-pointer"
                  aria-label="Where are you?"
                >
                  <option value="All Locations">Where are you?</option>
                  {locationsByProvince.map(({ province, locations }) => (
                    <optgroup key={province} label={province}>
                      {locations.map((location) => (
                        <option key={`${location.city}-${location.province}`} value={location.city}>
                          {location.city}{location.isTownshipOrLocalHub ? ' · local hub' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleFindJobs}
                disabled={isSearching}
                className="min-h-[56px] md:min-w-[150px] rounded-2xl bg-slate-950 hover:bg-blue-700 text-white px-6 font-bold text-[15px] inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Search className="w-5 h-5" />
                {isSearching ? 'Searching…' : 'Find jobs'}
              </button>
            </div>

            <div className="mt-2 border-t border-slate-100 px-1 pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="min-h-[40px] inline-flex items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                aria-expanded={showFilters}
                aria-controls="jobl-search-filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
                More filters
                {optionalFilterCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-50 text-blue-700 text-[11px] inline-flex items-center justify-center">
                    {optionalFilterCount}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showFilters ? (
              <div
                id="jobl-search-filters"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 mt-2 pt-4 px-1 pb-1"
              >
                <label>
                  <span className="block text-xs font-bold text-slate-500 mb-1.5 px-1">Province</span>
                  <select
                    value={selectedProvince}
                    onChange={(event) => handleProvinceChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                  >
                    <option value="All Provinces">All provinces</option>
                    {SOUTH_AFRICAN_PROVINCES.map((province) => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="block text-xs font-bold text-slate-500 mb-1.5 px-1">Sector</span>
                  <select
                    value={selectedSector}
                    onChange={(event) => setSelectedSector(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                  >
                    {SA_SECTORS.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="block text-xs font-bold text-slate-500 mb-1.5 px-1">Experience</span>
                  <select
                    value={selectedExperience}
                    onChange={(event) => setSelectedExperience(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400"
                  >
                    <option value="All Experience Levels">Any experience level</option>
                    {EXPERIENCE_LEVELS.map((experience) => (
                      <option key={experience} value={experience}>{experience}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified jobs
            </span>
            <span>Application help from R5</span>
            {totalResultsCount > 0 && !isSearching ? (
              <span className="font-semibold text-slate-700">{totalResultsCount} jobs found</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};
