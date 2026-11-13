import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Search, X } from 'lucide-react';
import { HERO_IMAGE_PATH } from '../data/seedData';
import { calculateCarbonFootprint, rankCampusesFairly } from '../lib/ecogenLogic';
import type {
  AppSection,
  EcogenAppState,
  LivePlanetPayload,
  NewsArticle,
  UserRole,
} from '../types/ecogen';
import { ResilientImage } from './ResilientImage';
import { RoleSelectorBar } from './RoleSelectorBar';

interface HomeViewProps {
  state: EcogenAppState;
  planetData: LivePlanetPayload | null;
  planetLoading: boolean;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onNavigate: (section: AppSection, subTab?: string, focusId?: string) => void;
}

export function HomeView({
  state,
  planetData,
  planetLoading,
  activeRole,
  onSelectRole,
  onNavigate,
}: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCarKm, setPreviewCarKm] = useState(90);
  const [previewDiet, setPreviewDiet] = useState<'plant_based' | 'flexitarian' | 'omnivore'>('flexitarian');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  const previewResult = useMemo(
    () =>
      calculateCarbonFootprint({
        weeklyCarKm: previewCarKm,
        vehicleType: 'petrol',
        weeklyTransitKm: 20,
        annualShortFlights: 1,
        annualLongFlights: 0,
        monthlyElectricityKwh: 220,
        gridRegion: 'global',
        renewableTariffPct: 20,
        dietType: previewDiet,
        foodWasteHabit: 'average',
        monthlyGoodsSpendUsd: 160,
        compostingAndRecycling: true,
      }),
    [previewCarKm, previewDiet]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { type: string; title: string; subtitle: string; section: AppSection; subTab?: string; id?: string }[] = [];

    state.issues.forEach((i) => {
      if (i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)) {
        results.push({ type: 'Issue', title: i.title, subtitle: `${i.headlineMetric} ${i.metricUnit}`, section: 'planet', subTab: 'issues', id: i.id });
      }
    });
    state.campaigns.forEach((c) => {
      if (c.title.toLowerCase().includes(q) || c.locationName.toLowerCase().includes(q)) {
        results.push({ type: 'Campaign', title: c.title, subtitle: c.locationName, section: 'actions', subTab: 'campaigns', id: c.id });
      }
    });
    state.challenges.forEach((ch) => {
      if (ch.title.toLowerCase().includes(q) || ch.category.toLowerCase().includes(q)) {
        results.push({ type: 'Challenge', title: ch.title, subtitle: `${ch.cadence} · +${ch.points} pts`, section: 'actions', subTab: 'challenges', id: ch.id });
      }
    });
    state.academyModules.forEach((m) => {
      if (m.title.toLowerCase().includes(q) || m.topic.toLowerCase().includes(q)) {
        results.push({ type: 'Academy', title: m.title, subtitle: m.topic, section: 'academy', subTab: 'modules', id: m.id });
      }
    });
    return results.slice(0, 6);
  }, [searchQuery, state]);

  const topCampuses = useMemo(() => rankCampusesFairly(state.campuses).slice(0, 3), [state.campuses]);
  const activeStation = planetData?.stations.find((s) => s.status === 'ok');

  const totalVerifiedActions = useMemo(
    () =>
      state.submissions.filter((s) => s.status === 'approved').length +
      state.campuses.reduce((acc, c) => acc + c.verifiedActivities, 0),
    [state]
  );

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Cinematic Hero */}
      <section className="relative overflow-hidden bg-[#0F2E1E] text-[#F8F7F2]">
        <div className="absolute inset-0">
          <ResilientImage
            src={HERO_IMAGE_PATH}
            alt="Aerial view of sunlit temperate rainforest canopy and winding river valley"
            className="w-full h-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F2E1E] via-[#0F2E1E]/70 to-[#0F2E1E]/40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl space-y-6"
          >
            <p className="text-sm font-medium text-[#A3E635] tracking-wide">
              Small Actions. Measurable Impact. A Greener Future.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-balance">
              The Future of Our Planet Starts With Us.
            </h1>
            <p className="text-base sm:text-lg text-[#D8E5DA] max-w-2xl leading-relaxed">
              Monitor live regional air quality, estimate your annual carbon footprint with documented
              IPCC and DEFRA factors, report local ecological issues with photo proof, and coordinate
              verified campus and community campaigns.
            </p>

            {/* Environmental Search Bar */}
            <div className="relative max-w-xl pt-2">
              <label htmlFor="hero-env-search" className="sr-only">
                Search environmental issues, campaigns, challenges, or academy modules
              </label>
              <div className="flex items-center bg-[#F8F7F2] text-[#14231B] rounded-xl p-1.5 border border-white/20">
                <Search className="w-5 h-5 text-[#4B5E53] ml-3 shrink-0" aria-hidden="true" />
                <input
                  id="hero-env-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search climate, PM2.5, mangroves, solar campaigns..."
                  className="w-full bg-transparent px-3 py-2 text-sm text-[#14231B] placeholder:text-[#5B6D62] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (searchResults[0]) {
                      onNavigate(searchResults[0].section, searchResults[0].subTab, searchResults[0].id);
                    } else {
                      onNavigate('planet', 'issues');
                    }
                  }}
                  className="px-4 py-2 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore
                </button>
              </div>

              {searchQuery.trim() && (
                <div
                  role="region"
                  aria-label="Environmental search results"
                  className="mt-2 bg-white text-[#14231B] rounded-xl border border-[#DDE3DD] divide-y divide-[#EAECE7] shadow-lg"
                >
                  {searchResults.length === 0 ? (
                    <p className="p-4 text-sm text-[#4B5E53]">
                      No matching issues, campaigns, or modules found for &ldquo;{searchQuery}&rdquo;.
                    </p>
                  ) : (
                    searchResults.map((res, idx) => (
                      <button
                        key={`${res.type}-${idx}`}
                        type="button"
                        onClick={() => onNavigate(res.section, res.subTab, res.id)}
                        className="w-full text-left px-4 py-3 hover:bg-[#F8F7F2] flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div>
                          <div className="text-xs text-[#4B5E53]">{res.type} · {res.subtitle}</div>
                          <div className="text-sm font-semibold text-[#0F2E1E]">{res.title}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#15803D] shrink-0" aria-hidden="true" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('actions', 'challenges')}
                className="px-5 py-3 bg-[#A3E635] text-[#0F2E1E] text-sm font-semibold rounded-lg hover:bg-[#BEF264] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Eco Challenges
              </button>
              <button
                type="button"
                onClick={() => onNavigate('planet', 'dashboard')}
                className="px-5 py-3 border border-white/30 text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Live Planet Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Instant Role Selector Strip */}
        <RoleSelectorBar
          personas={state.personas}
          activeRole={activeRole}
          onSelectRole={onSelectRole}
        />

        {/* 2. Planet Statistics (4-column KPI strip) */}
        <section aria-labelledby="planet-stats-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 id="planet-stats-heading" className="text-2xl font-bold text-[#0F2E1E]">
                Planet Indicators &amp; Platform Activity
              </h2>
              <p className="text-sm text-[#4B5E53]">
                Live atmospheric telemetry from Open-Meteo paired with documented global baselines and audited community logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('planet', 'dashboard')}
              className="text-sm font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View 6 Live Stations →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">
                Live Sample · {activeStation ? `${activeStation.city} Air Quality` : 'Open-Meteo Feed'}
              </div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-2">
                {planetLoading
                  ? 'Loading...'
                  : activeStation?.usAqi != null
                    ? `${activeStation.usAqi} AQI`
                    : 'Unavailable'}
              </div>
              <div className="text-xs text-[#4B5E53] mt-2">
                {activeStation?.pm25 != null
                  ? `PM2.5: ${activeStation.pm25} µg/m³ · ${
                      activeStation.sourceName.includes('Open-Meteo')
                        ? 'Open-Meteo'
                        : 'Regional Stream'
                    }`
                  : 'Connect to live feed in Planet Data'}
              </div>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">Global Warming Anomaly · WMO 2024</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-2">
                +1.29 °C
              </div>
              <div className="text-xs text-[#4B5E53] mt-2">Above 1850–1900 baseline</div>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">Atmospheric CO2 · NOAA Reference</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-2">
                424.6 ppm
              </div>
              <div className="text-xs text-[#4B5E53] mt-2">Mauna Loa global reference</div>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">Verified Campus &amp; User Actions</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-2">
                {totalVerifiedActions.toLocaleString()}
              </div>
              <div className="text-xs text-[#4B5E53] mt-2">
                {state.campaigns.filter((c) => c.status === 'active').length} active campaigns ·{' '}
                {state.reports.length} issue reports
              </div>
            </div>
          </div>
        </section>

        {/* 3. Explore Environmental Issues */}
        <section aria-labelledby="issues-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 id="issues-heading" className="text-2xl sm:text-3xl font-bold text-[#0F2E1E]">
                Explore Environmental Issues
              </h2>
              <p className="text-sm text-[#4B5E53] mt-1">
                Six critical planetary systems—documented causes, evidence-based solutions, and direct actions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('planet', 'issues')}
              className="text-sm font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Issues Explorer →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.issues.map((issue) => (
              <article
                key={issue.id}
                className="bg-white border border-[#DDE3DD] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 overflow-hidden bg-[#14231B]">
                    <ResilientImage src={issue.imageUrl} alt={issue.title} />
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="text-xs text-[#4B5E53]">
                      {issue.severity} Priority · {issue.sourceName} ({issue.sourceYear})
                    </div>
                    <h3 className="text-lg font-bold text-[#0F2E1E]">{issue.title}</h3>
                    <p className="text-sm text-[#4B5E53] leading-relaxed">{issue.summary}</p>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-[#EAECE7] flex items-center justify-between gap-3">
                  <div className="text-sm font-mono tabular-nums font-semibold text-[#0F2E1E]">
                    {issue.headlineMetric}{' '}
                    <span className="font-sans text-xs font-normal text-[#4B5E53]">
                      {issue.metricUnit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('planet', 'issues', issue.id)}
                    className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 4. Featured Campaigns & Daily Eco Challenges */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#0F2E1E]">Featured Community Campaigns</h2>
                <p className="text-sm text-[#4B5E53]">
                  Verified field restoration and campus decarbonization drives.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('actions', 'campaigns')}
                className="text-sm font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                All Campaigns →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {state.campaigns
                .filter((c) => c.status === 'active')
                .slice(0, 2)
                .map((camp) => {
                  const pct = Math.min(
                    100,
                    Math.round((camp.verifiedImpactValue / camp.targetImpactValue) * 100)
                  );
                  return (
                    <article
                      key={camp.id}
                      className="bg-white border border-[#DDE3DD] rounded-xl overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-40 overflow-hidden">
                          <ResilientImage src={camp.imageUrl} alt={camp.title} />
                        </div>
                        <div className="p-5 space-y-2.5">
                          <div className="text-xs text-[#4B5E53]">
                            {camp.category} · {camp.locationName}
                          </div>
                          <h3 className="text-base font-bold text-[#0F2E1E]">{camp.title}</h3>
                          <p className="text-xs text-[#4B5E53] line-clamp-2">{camp.description}</p>
                        </div>
                      </div>
                      <div className="px-5 pb-5 space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono tabular-nums text-[#394B40]">
                            <span>{camp.impactMetricLabel}</span>
                            <span>
                              {camp.verifiedImpactValue.toLocaleString()} /{' '}
                              {camp.targetImpactValue.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-[#EAECE7] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#15803D]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate('actions', 'campaigns', camp.id)}
                          className="w-full py-2 text-xs font-semibold bg-[#0F2E1E] text-[#F8F7F2] rounded-lg hover:bg-[#17422B] cursor-pointer"
                        >
                          View &amp; Join Campaign ({camp.participantIds.length} joined)
                        </button>
                      </div>
                    </article>
                  );
                })}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#0F2E1E]">Daily Eco Challenges</h2>
                <p className="text-sm text-[#4B5E53]">
                  Submit evidence for moderator verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('actions', 'challenges')}
                className="text-sm font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                All Missions →
              </button>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl divide-y divide-[#EAECE7]">
              {state.challenges.slice(0, 4).map((ch) => (
                <div key={ch.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#4B5E53]">
                      {ch.cadence} · {ch.category} · +{ch.points} pts · ~{ch.estimatedCo2SavedKg} kgCO2e
                    </div>
                    <h3 className="text-sm font-semibold text-[#0F2E1E]">{ch.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('actions', 'challenges', ch.id)}
                    className="px-3 py-1.5 text-xs font-semibold border border-[#0F2E1E] text-[#0F2E1E] rounded-lg hover:bg-[#0F2E1E] hover:text-[#F8F7F2] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Log Action
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Carbon Footprint Calculator Preview */}
        <section className="bg-[#0F2E1E] text-[#F8F7F2] rounded-2xl p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-medium text-[#A3E635]">
                Documented Emission Factors · DEFRA 2024 &amp; IPCC AR6
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-balance">
                Interactive Carbon Footprint Estimator
              </h2>
              <p className="text-sm text-[#D8E5DA] leading-relaxed">
                Test how weekly driving distance and dietary habits shift your annual CO2-equivalent
                estimate. Full methodology, grid assumptions, and personalized reduction steps are
                visible inside the calculator.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label htmlFor="preview-car-km">Weekly Petrol Car Travel</label>
                    <span className="font-mono tabular-nums text-[#A3E635]">{previewCarKm} km/wk</span>
                  </div>
                  <input
                    id="preview-car-km"
                    type="range"
                    min={0}
                    max={400}
                    step={10}
                    value={previewCarKm}
                    onChange={(e) => setPreviewCarKm(Number(e.target.value))}
                    className="w-full accent-[#A3E635]"
                  />
                </div>

                <div>
                  <span className="block text-xs mb-2">Primary Diet Pattern</span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'plant_based', label: 'Plant-Based' },
                        { id: 'flexitarian', label: 'Flexitarian' },
                        { id: 'omnivore', label: 'Omnivore' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPreviewDiet(opt.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
                          previewDiet === opt.id
                            ? 'bg-[#A3E635] text-[#0F2E1E]'
                            : 'bg-white/10 text-[#F8F7F2] hover:bg-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#17422B] border border-white/15 rounded-xl p-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-xs text-[#D8E5DA]">Estimated Annual Footprint</span>
                <span className="text-xs font-mono text-[#A3E635]">
                  Global avg: {previewResult.globalAverageTonnes} tCO2e/yr
                </span>
              </div>
              <div className="text-4xl font-bold font-mono tabular-nums">
                {previewResult.totalTonnesCo2e}{' '}
                <span className="text-base font-normal text-[#D8E5DA]">tonnes CO2e / year</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/15 text-xs">
                <div>
                  <div className="text-[#B6CBB9]">Transport</div>
                  <div className="font-mono tabular-nums font-semibold mt-0.5">
                    {previewResult.breakdown.transportKg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[#B6CBB9]">Electricity</div>
                  <div className="font-mono tabular-nums font-semibold mt-0.5">
                    {previewResult.breakdown.electricityKg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[#B6CBB9]">Food</div>
                  <div className="font-mono tabular-nums font-semibold mt-0.5">
                    {previewResult.breakdown.foodKg} kg
                  </div>
                </div>
                <div>
                  <div className="text-[#B6CBB9]">Lifestyle</div>
                  <div className="font-mono tabular-nums font-semibold mt-0.5">
                    {previewResult.breakdown.lifestyleKg} kg
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('calculator')}
                className="w-full py-2.5 bg-[#A3E635] text-[#0F2E1E] text-sm font-semibold rounded-lg hover:bg-[#BEF264] cursor-pointer"
              >
                Open Full 4-Category Calculator &amp; Assumptions
              </button>
            </div>
          </div>
        </section>

        {/* 6. Green Campus Leaderboard Preview & News */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#0F2E1E]">Green Campus Leaders</h2>
                <p className="text-xs text-[#4B5E53]">
                  Fairly normalized by student population size.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('academy', 'leaderboard')}
                className="text-sm font-semibold text-[#15803D] hover:underline cursor-pointer"
              >
                Full Rankings →
              </button>
            </div>
            <div className="bg-white border border-[#DDE3DD] rounded-xl divide-y divide-[#EAECE7]">
              {topCampuses.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#4B5E53]">
                      Rank #{c.rank} · {c.city}, {c.country}
                    </div>
                    <div className="text-sm font-bold text-[#0F2E1E]">{c.name}</div>
                    <div className="text-xs text-[#4B5E53] mt-0.5">
                      {c.verifiedActivities} verified activities ·{' '}
                      {Math.round(c.campaignParticipationRate * 100)}% participation
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-lg font-bold text-[#15803D]">{c.fairScore}</div>
                    <div className="text-[11px] text-[#4B5E53]">Fair Index</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#0F2E1E]">
                  Environmental Research &amp; Dispatches
                </h2>
                <p className="text-xs text-[#4B5E53]">
                  Briefings on methodology, air quality, and verified field action.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('academy', 'modules')}
                className="text-sm font-semibold text-[#15803D] hover:underline cursor-pointer"
              >
                Learning Academy →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {state.articles.slice(0, 3).map((art) => (
                <article
                  key={art.id}
                  className="bg-white border border-[#DDE3DD] rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="text-xs text-[#4B5E53]">
                      {art.category} · {art.publishedDate}
                    </div>
                    <h3 className="text-base font-bold text-[#0F2E1E] leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-xs text-[#4B5E53] leading-relaxed">{art.excerpt}</p>
                  </div>
                  <div className="pt-2 border-t border-[#EAECE7] flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#4B5E53]">
                      {art.author} · {art.readMinutes} min
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveArticle(art)}
                      className="text-xs font-semibold text-[#15803D] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Read Dispatch →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Testimonials */}
        <section aria-labelledby="testimonials-heading" className="space-y-5">
          <div>
            <h2 id="testimonials-heading" className="text-2xl font-bold text-[#0F2E1E]">
              Verified Community Outcomes
            </h2>
            <p className="text-sm text-[#4B5E53]">
              How campuses, field coordinators, and watershed teams use ECOGEN.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {state.testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="bg-white border border-[#DDE3DD] rounded-xl p-6 flex flex-col justify-between space-y-4"
              >
                <p className="text-sm text-[#14231B] leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="pt-4 border-t border-[#EAECE7] space-y-1">
                  <div className="text-sm font-bold text-[#0F2E1E]">{t.name}</div>
                  <div className="text-xs text-[#4B5E53]">
                    {t.role} · {t.organization}
                  </div>
                  <div className="text-xs font-medium text-[#15803D] pt-1">
                    {t.verifiedOutcome}
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* 8. Join the Movement CTA */}
        <section className="bg-[#EAECE7] border border-[#DDE3DD] rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2E1E]">
              Join the Movement With Your Role
            </h2>
            <p className="text-sm text-[#4B5E53]">
              Switch between User, Volunteer, Organization, or Admin in one click inside your Workspace
              to log challenges, launch campaigns, or verify ecological issue reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('workspace')}
              className="px-5 py-3 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] cursor-pointer"
            >
              Open Role Workspace
            </button>
            <button
              type="button"
              onClick={() => onNavigate('actions', 'map')}
              className="px-5 py-3 bg-white border border-[#0F2E1E] text-[#0F2E1E] text-sm font-semibold rounded-lg hover:bg-[#F8F7F2] cursor-pointer"
            >
              Report an Issue
            </button>
          </div>
        </section>
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-reader-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2E1E]/70 p-4"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="bg-white border border-[#DDE3DD] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EAECE7] pb-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-[#15803D]">
                  {activeArticle.category} · {activeArticle.publishedDate} · {activeArticle.readMinutes} min read
                </div>
                <h2 id="article-reader-title" className="text-xl sm:text-2xl font-bold text-[#0F2E1E]">
                  {activeArticle.title}
                </h2>
                <p className="text-xs text-[#4B5E53]">By {activeArticle.author}</p>
              </div>
              <button
                type="button"
                aria-label="Close dispatch"
                onClick={() => setActiveArticle(null)}
                className="p-2 rounded-lg text-[#4B5E53] hover:bg-[#F8F7F2] hover:text-[#0F2E1E] cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#14231B] leading-relaxed">
              <p className="font-medium text-[#394B40]">{activeArticle.excerpt}</p>
              {activeArticle.body.split('\n\n').map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            <div className="pt-4 border-t border-[#EAECE7] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveArticle(null);
                  onNavigate('academy', 'modules');
                }}
                className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
              >
                Explore Eco Learning Academy →
              </button>
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="px-4 py-2 bg-[#0F2E1E] text-[#F8F7F2] text-xs font-semibold rounded-lg hover:bg-[#17422B] cursor-pointer"
              >
                Close Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
