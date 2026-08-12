import React, { useRef } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Search,
  Briefcase,
  Award,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Zap,
  ArrowDown,
  Users,
  Lock,
  Sparkles,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { PRIMARY_SA_LOCATIONS } from '../data/saLocations';
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
  const searchRef = useRef<HTMLDivElement>(null);

  const scrollToSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFindJobs = () => {
    onSearch();
    setTimeout(() => {
      document.getElementById('job-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  return (
    <div className="bg-slate-50">
      {/* ═══════════════════════════════════════════════
          1. HERO — full-viewport scroll stopper
      ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[85vh] sm:min-h-[92vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute top-1/4 -right-32 w-[480px] h-[480px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-indigo-600/15 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            <div className="lg:col-span-7 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/30 text-blue-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                  <Sparkles className="w-3.5 h-3.5" />
                  Built for South African job seekers
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                  Find a job you can{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                    actually apply for
                  </span>
                </h1>

                <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed">
                  Real vacancies from verified sources. Tell us where you are —
                  we help you prepare a job-ready application for only{' '}
                  <strong className="text-white">R5</strong>.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <button
                  onClick={scrollToSearch}
                  className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <Search className="w-5 h-5" />
                  Find jobs near me
                </button>
                <button
                  onClick={scrollToSearch}
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all cursor-pointer"
                >
                  <FileText className="w-5 h-5" />
                  How it works
                  <ArrowDown className="w-4 h-4 opacity-70" />
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400 pt-2"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified sources
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" /> POPIA compliant
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> R5 application readiness
                </span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5 hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/30 to-cyan-400/20 rounded-3xl blur-2xl" />
                <div className="relative bg-slate-900/80 backdrop-blur border border-white/10 rounded-3xl p-7 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                      Live pipeline
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  {[
                    { title: 'General Worker', loc: 'Johannesburg', tag: 'Verified' },
                    { title: 'Warehouse & Logistics', loc: 'Durban', tag: 'New' },
                    { title: 'Call Centre Agent', loc: 'Cape Town', tag: 'Verified' },
                    { title: 'Security Officer', loc: 'Pretoria', tag: 'Verified' },
                  ].map((job, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/5 hover:bg-white/8 border border-white/5 rounded-xl px-4 py-3 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-sm text-white">{job.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {job.loc}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 text-blue-200 px-2 py-1 rounded-md">
                        {job.tag}
                      </span>
                    </div>
                  ))}
                  <p className="text-center text-xs text-slate-500 pt-1">
                    Real vacancies • Updated continuously
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-500">
          <span className="text-[11px] font-medium tracking-wide uppercase">Scroll</span>
          <ArrowDown className="w-4 h-4 animate-bounce" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          2. HOW IT WORKS
      ═══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Three steps. Real applications.
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg">
              No fake listings. No endless forms. Just jobs you can actually apply for.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Search real jobs',
                desc: 'Filter by location, sector, category and experience. We only show verified South African vacancies from trusted sources.',
              },
              {
                step: '02',
                icon: FileText,
                title: 'Get application-ready for R5',
                desc: 'Upload your CV once. We generate a job-specific CV and cover letter tailored to the role you choose.',
              },
              {
                step: '03',
                icon: CheckCircle2,
                title: 'Apply with confidence',
                desc: 'Download your complete application package and submit directly to the employer. You’re ready.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative bg-slate-50 border border-slate-200 rounded-2xl p-7 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-4xl font-black text-slate-200">{item.step}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          3. WHY JOBL / TRUST
      ═══════════════════════════════════════════════ */}
      <section className="py-20 sm:py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Built for people who need the job — not another job board.
              </h2>
              <p className="mt-5 text-slate-400 text-base leading-relaxed">
                Most platforms show you hundreds of listings and leave you alone with a blank CV.
                JobL closes the gap between “I found a job” and “I can actually apply”.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  icon: ShieldCheck,
                  title: 'Verified sources',
                  text: 'We pull from legitimate SA job sources and filter noise.',
                },
                {
                  icon: Zap,
                  title: 'R5 readiness',
                  text: 'One low fee. Job-specific CV + cover letter ready to send.',
                },
                {
                  icon: Lock,
                  title: 'POPIA first',
                  text: 'Your documents stay private. We don’t sell your data.',
                },
                {
                  icon: Users,
                  title: 'Local focus',
                  text: 'Locations and categories that matter across South Africa.',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <item.icon className="w-6 h-6 text-blue-400 mb-3" />
                  <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          4. SEARCH — the conversion section
      ═══════════════════════════════════════════════ */}
      <section
        ref={searchRef}
        id="search-section"
        className="py-16 sm:py-20 bg-gradient-to-b from-blue-600 to-blue-700 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start with where you are
            </h2>
            <p className="mt-3 text-blue-100 text-base sm:text-lg max-w-xl mx-auto">
              Choose your location, sector and the kind of work you want. We’ll show you matching
              opportunities.
            </p>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl shadow-blue-900/30 p-6 sm:p-8 text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Location */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Location
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    const loc = PRIMARY_SA_LOCATIONS.find((l) => l.city === e.target.value);
                    if (loc) setSelectedProvince(loc.province);
                    else setSelectedProvince('All Provinces');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                >
                  <option value="All Locations">All South African Locations</option>
                  {PRIMARY_SA_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={loc.city}>
                      {loc.city} ({loc.province})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Sector / Opportunity Type
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                >
                  {SA_SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Type of work
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                >
                  <option value="All Categories">All Job Categories</option>
                  {SA_JOB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Experience */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-500" />
                  Experience (optional)
                </label>
                <select
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
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

            <button
              onClick={handleFindJobs}
              disabled={isSearching}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-base disabled:opacity-50 cursor-pointer"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Searching verified jobs…</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>FIND JOBS</span>
                  <ChevronRight className="w-5 h-5 opacity-80" />
                </>
              )}
            </button>

            {totalResultsCount > 0 && !isSearching && (
              <p className="mt-4 text-center text-sm text-slate-500">
                Currently showing <strong className="text-slate-800">{totalResultsCount}</strong>{' '}
                opportunities
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
