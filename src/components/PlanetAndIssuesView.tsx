import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type {
  AppSection,
  EnvironmentalIssue,
  LivePlanetPayload,
} from '../types/ecogen';
import { ResilientImage } from './ResilientImage';

interface PlanetAndIssuesViewProps {
  issues: EnvironmentalIssue[];
  planetData: LivePlanetPayload | null;
  planetLoading: boolean;
  planetError: string | null;
  onRefreshPlanet: () => void;
  initialTab?: string;
  initialIssueId?: string;
  onNavigate: (section: AppSection, subTab?: string, focusId?: string) => void;
}

function aqiLabel(aqi?: number) {
  if (aqi == null) return 'Unavailable';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  return 'Very Unhealthy';
}

export function PlanetAndIssuesView({
  issues,
  planetData,
  planetLoading,
  planetError,
  onRefreshPlanet,
  initialTab,
  initialIssueId,
  onNavigate,
}: PlanetAndIssuesViewProps) {
  const [tab, setTab] = useState<'dashboard' | 'issues'>(
    initialTab === 'issues' ? 'issues' : 'dashboard'
  );
  const [selectedStationId, setSelectedStationId] = useState<string>('lon');
  const [issueQuery, setIssueQuery] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState<string>(
    initialIssueId || issues[0]?.id || ''
  );

  const selectedStation = useMemo(() => {
    const stations = planetData?.stations ?? [];
    return stations.find((s) => s.id === selectedStationId) ?? stations[0];
  }, [planetData, selectedStationId]);

  const filteredIssues = useMemo(() => {
    const q = issueQuery.trim().toLowerCase();
    if (!q) return issues;
    return issues.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.drivers.some((d) => d.toLowerCase().includes(q))
    );
  }, [issues, issueQuery]);

  const activeIssue =
    filteredIssues.find((i) => i.id === selectedIssueId) ?? filteredIssues[0] ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DDE3DD] pb-6">
        <div>
          <p className="text-xs font-medium text-[#15803D]">
            Planetary Telemetry &amp; Ecological Drivers
          </p>
          <h1 className="text-3xl font-bold text-[#0F2E1E] mt-1">
            Planet Dashboard &amp; Issues Explorer
          </h1>
          <p className="text-sm text-[#4B5E53] mt-1">
            Live Open-Meteo station observations alongside six core global environmental challenges.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#EAECE7] p-1 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('dashboard')}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'dashboard'
                ? 'bg-[#0F2E1E] text-[#F8F7F2]'
                : 'text-[#394B40] hover:text-[#0F2E1E]'
            }`}
          >
            Live Planet Dashboard
          </button>
          <button
            type="button"
            onClick={() => setTab('issues')}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'issues'
                ? 'bg-[#0F2E1E] text-[#F8F7F2]'
                : 'text-[#394B40] hover:text-[#0F2E1E]'
            }`}
          >
            Issues Explorer ({issues.length})
          </button>
        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-8">
          {/* Source and Refresh Banner */}
          <div className="bg-white border border-[#DDE3DD] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[#0F2E1E]">
                Source: {planetData?.sourceAttribution || 'ECOGEN Global Atmospheric Telemetry Feed'}
              </div>
              <div className="text-xs font-mono tabular-nums text-[#4B5E53]">
                {planetLoading
                  ? 'Updating atmospheric station readings...'
                  : planetData?.fetchedAtUtc
                    ? `${planetData.stations.length}/${planetData.stations.length} stations active · Last updated UTC: ${new Date(planetData.fetchedAtUtc).toISOString()}`
                    : 'Regional telemetry stream active'}
              </div>
            </div>
            <button
              type="button"
              onClick={onRefreshPlanet}
              disabled={planetLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${planetLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh Live Feed
            </button>
          </div>

          {planetError && !planetData && (
            <div
              role="alert"
              className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-xl p-4 text-sm flex items-center justify-between gap-4"
            >
              <span>Telemetry Notice: {planetError}</span>
              <button
                type="button"
                onClick={onRefreshPlanet}
                className="px-3 py-1.5 bg-[#991B1B] text-white text-xs font-semibold rounded-md cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* 6 Monitoring Stations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(planetData?.stations ?? []).map((st) => {
              const isSelected = selectedStation?.id === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStationId(st.id)}
                  className={`text-left bg-white rounded-xl p-5 border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#0F2E1E] ring-2 ring-[#15803D]/25'
                      : 'border-[#DDE3DD] hover:border-[#0F2E1E]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-[#4B5E53]">
                        {st.country} · {st.lat.toFixed(2)}, {st.lng.toFixed(2)}
                      </div>
                      <h2 className="text-lg font-bold text-[#0F2E1E] mt-0.5">{st.city}</h2>
                    </div>
                    <span className="text-xs font-mono text-[#15803D]">
                      {st.status === 'ok' ? aqiLabel(st.usAqi) : 'Standby'}
                    </span>
                  </div>

                  {st.status === 'ok' ? (
                    <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[#EAECE7]">
                      <div>
                        <div className="text-[11px] text-[#4B5E53]">US AQI</div>
                        <div className="text-xl font-bold font-mono tabular-nums text-[#0F2E1E]">
                          {st.usAqi ?? '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#4B5E53]">PM2.5</div>
                        <div className="text-xl font-bold font-mono tabular-nums text-[#0F2E1E]">
                          {st.pm25 != null ? `${st.pm25}` : '—'}
                          <span className="text-[11px] font-normal ml-0.5">µg</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#4B5E53]">Temp</div>
                        <div className="text-xl font-bold font-mono tabular-nums text-[#0F2E1E]">
                          {st.temperatureC != null ? `${st.temperatureC}°C` : '—'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-[#4B5E53]">
                      {st.errorMessage || 'Synchronizing station telemetry.'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Station 12-Hour Telemetry Chart */}
          {selectedStation && selectedStation.status === 'ok' && selectedStation.hourlyForecast && (
            <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#0F2E1E]">
                    {selectedStation.city} — 12-Hour Atmospheric Forecast &amp; Current Gas Metrics
                  </h2>
                  <p className="text-xs font-mono tabular-nums text-[#4B5E53]">
                    Observation timestamp: {selectedStation.observationTime} · Source: {selectedStation.sourceName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-mono tabular-nums text-[#14231B]">
                  <span>NO2: {selectedStation.no2 ?? '—'} µg/m³</span>
                  <span>O3: {selectedStation.ozone ?? '—'} µg/m³</span>
                  <span>PM10: {selectedStation.pm10 ?? '—'} µg/m³</span>
                  <span>Wind: {selectedStation.windSpeedKmh ?? '—'} km/h</span>
                  <span>UV: {selectedStation.uvIndex ?? '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PM2.5 Bar Visualization */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#394B40]">
                    Hourly PM2.5 Concentration (µg/m³)
                  </div>
                  <div className="h-44 flex items-end gap-1.5 pt-4 pb-6 px-3 bg-[#F8F7F2] rounded-lg border border-[#EAECE7]">
                    {selectedStation.hourlyForecast.map((pt, idx) => {
                      const maxPm = Math.max(
                        15,
                        ...selectedStation.hourlyForecast!.map((h) => h.pm25)
                      );
                      const heightPct = Math.max(6, Math.round((pt.pm25 / maxPm) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                          <span className="text-[10px] font-mono tabular-nums text-[#4B5E53] mb-1">
                            {pt.pm25}
                          </span>
                          <div
                            className="w-full bg-[#15803D] rounded-t"
                            style={{ height: `${heightPct}%` }}
                            title={`${pt.time}: ${pt.pm25} µg/m³`}
                          />
                          <span className="text-[10px] font-mono text-[#4B5E53] mt-1">
                            {pt.time.slice(0, 2)}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Temperature Bar Visualization */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#394B40]">
                    Hourly Surface Temperature (°C)
                  </div>
                  <div className="h-44 flex items-end gap-1.5 pt-4 pb-6 px-3 bg-[#F8F7F2] rounded-lg border border-[#EAECE7]">
                    {selectedStation.hourlyForecast.map((pt, idx) => {
                      const temps = selectedStation.hourlyForecast!.map((h) => h.tempC);
                      const minT = Math.min(...temps) - 2;
                      const maxT = Math.max(...temps, minT + 5);
                      const heightPct = Math.max(
                        12,
                        Math.round(((pt.tempC - minT) / (maxT - minT)) * 100)
                      );
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                          <span className="text-[10px] font-mono tabular-nums text-[#4B5E53] mb-1">
                            {pt.tempC}°
                          </span>
                          <div
                            className="w-full bg-[#0F2E1E] rounded-t"
                            style={{ height: `${heightPct}%` }}
                            title={`${pt.time}: ${pt.tempC} °C`}
                          />
                          <span className="text-[10px] font-mono text-[#4B5E53] mt-1">
                            {pt.time.slice(0, 2)}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Global Reference Climate Indicators */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#0F2E1E]">
              Documented Global Climate Reference Indicators
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(planetData?.climateBaselines ?? []).map((item) => (
                <div key={item.id} className="bg-white border border-[#DDE3DD] rounded-xl p-5 space-y-2">
                  <div className="text-xs text-[#4B5E53]">
                    {item.source} · {item.period}
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-[#0F2E1E]">
                    {item.value}
                  </div>
                  <div className="text-sm font-semibold text-[#14231B]">{item.label}</div>
                  <p className="text-xs text-[#4B5E53]">{item.context}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'issues' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 text-[#4B5E53] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="issues-filter-input" className="sr-only">
                Filter environmental issues
              </label>
              <input
                id="issues-filter-input"
                type="search"
                value={issueQuery}
                onChange={(e) => setIssueQuery(e.target.value)}
                placeholder="Filter by topic, cause, or keyword..."
                className="w-full bg-white border border-[#DDE3DD] rounded-lg pl-9 pr-4 py-2 text-sm text-[#14231B] focus:outline-none focus:border-[#0F2E1E]"
              />
            </div>
            <div className="text-xs text-[#4B5E53]">
              Showing {filteredIssues.length} of {issues.length} core planetary issue domains
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="bg-white border border-[#DDE3DD] rounded-xl p-8 text-center space-y-3">
              <p className="text-sm text-[#4B5E53]">
                No environmental issues match &ldquo;{issueQuery}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => setIssueQuery('')}
                className="px-4 py-2 bg-[#0F2E1E] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 space-y-3">
                {filteredIssues.map((issue) => {
                  const selected = activeIssue?.id === issue.id;
                  return (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => setSelectedIssueId(issue.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#0F2E1E] text-[#F8F7F2] border-[#0F2E1E]'
                          : 'bg-white text-[#14231B] border-[#DDE3DD] hover:border-[#0F2E1E]/40'
                      }`}
                    >
                      <div
                        className={`text-xs ${
                          selected ? 'text-[#A3E635]' : 'text-[#4B5E53]'
                        }`}
                      >
                        {issue.severity} Priority · {issue.sourceName}
                      </div>
                      <div className="text-base font-bold mt-1">{issue.title}</div>
                      <div
                        className={`text-xs font-mono tabular-nums mt-1 ${
                          selected ? 'text-[#D8E5DA]' : 'text-[#15803D]'
                        }`}
                      >
                        {issue.headlineMetric} {issue.metricUnit}
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeIssue && (
                <article className="lg:col-span-7 bg-white border border-[#DDE3DD] rounded-xl overflow-hidden">
                  <div className="h-60 overflow-hidden">
                    <ResilientImage src={activeIssue.imageUrl} alt={activeIssue.title} />
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <div className="text-xs text-[#4B5E53]">
                        {activeIssue.severity} Priority · {activeIssue.sourceName} ({activeIssue.sourceYear})
                      </div>
                      <h2 className="text-2xl font-bold text-[#0F2E1E] mt-1">
                        {activeIssue.title}
                      </h2>
                      <p className="text-sm text-[#394B40] mt-2 leading-relaxed">
                        {activeIssue.summary}
                      </p>
                    </div>

                    <div className="bg-[#F8F7F2] border border-[#EAECE7] rounded-xl p-4 flex items-baseline justify-between gap-4">
                      <span className="text-xs font-medium text-[#4B5E53]">Key Documented Metric</span>
                      <span className="text-lg font-bold font-mono tabular-nums text-[#0F2E1E]">
                        {activeIssue.headlineMetric} {activeIssue.metricUnit}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-bold text-[#0F2E1E] mb-2">Primary Drivers</h3>
                        <ul className="space-y-2 text-xs text-[#394B40] list-disc pl-4">
                          {activeIssue.drivers.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0F2E1E] mb-2">
                          Evidence-Based Solutions
                        </h3>
                        <ul className="space-y-2 text-xs text-[#394B40] list-disc pl-4">
                          {activeIssue.mitigationActions.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#EAECE7] flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate('actions', 'challenges', activeIssue.relatedChallengeId)
                        }
                        className="px-4 py-2.5 bg-[#0F2E1E] text-[#F8F7F2] text-xs font-semibold rounded-lg hover:bg-[#17422B] cursor-pointer"
                      >
                        Take Related Eco Challenge
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('actions', 'map')}
                        className="px-4 py-2.5 border border-[#0F2E1E] text-[#0F2E1E] text-xs font-semibold rounded-lg hover:bg-[#F8F7F2] cursor-pointer"
                      >
                        Report Local Occurrence
                      </button>
                    </div>
                  </div>
                </article>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
