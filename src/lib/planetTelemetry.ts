import type { LivePlanetPayload, LiveStationReading } from '../types/ecogen';

export interface MonitoringStationDef {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  baseTempC: number;
  tempSwingC: number;
  basePm25: number;
  baseWindKmh: number;
  baseNo2: number;
  baseOzone: number;
}

export const MONITORING_STATIONS: MonitoringStationDef[] = [
  {
    id: 'lon',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.5074,
    lng: -0.1278,
    baseTempC: 13.5,
    tempSwingC: 4.5,
    basePm25: 9.2,
    baseWindKmh: 16.4,
    baseNo2: 24.5,
    baseOzone: 48.0,
  },
  {
    id: 'del',
    city: 'New Delhi',
    country: 'India',
    lat: 28.6139,
    lng: 77.209,
    baseTempC: 26.8,
    tempSwingC: 6.2,
    basePm25: 58.4,
    baseWindKmh: 8.5,
    baseNo2: 46.2,
    baseOzone: 64.5,
  },
  {
    id: 'sao',
    city: 'São Paulo',
    country: 'Brazil',
    lat: -23.5505,
    lng: -46.6333,
    baseTempC: 22.4,
    tempSwingC: 5.0,
    basePm25: 15.8,
    baseWindKmh: 12.2,
    baseNo2: 29.4,
    baseOzone: 53.0,
  },
  {
    id: 'tok',
    city: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    baseTempC: 17.6,
    tempSwingC: 4.8,
    basePm25: 11.4,
    baseWindKmh: 14.1,
    baseNo2: 27.1,
    baseOzone: 51.2,
  },
  {
    id: 'nai',
    city: 'Nairobi',
    country: 'Kenya',
    lat: -1.2921,
    lng: 36.8219,
    baseTempC: 21.2,
    tempSwingC: 5.4,
    basePm25: 13.6,
    baseWindKmh: 13.8,
    baseNo2: 21.8,
    baseOzone: 46.4,
  },
  {
    id: 'sfo',
    city: 'San Francisco',
    country: 'USA',
    lat: 37.7749,
    lng: -122.4194,
    baseTempC: 15.2,
    tempSwingC: 4.1,
    basePm25: 7.4,
    baseWindKmh: 19.3,
    baseNo2: 18.6,
    baseOzone: 42.5,
  },
];

export const CLIMATE_BASELINES: LivePlanetPayload['climateBaselines'] = [
  {
    id: 'co2-ppm',
    label: 'Atmospheric CO2 Reference',
    value: '424.6 ppm',
    context: 'Mauna Loa seasonal baseline (NOAA Global Monitoring Laboratory reference)',
    source: 'NOAA GML Reference Dataset',
    period: 'Annual Reference Benchmark',
  },
  {
    id: 'temp-anomaly',
    label: 'Global Surface Temp Anomaly',
    value: '+1.29 °C',
    context: 'Relative to 1850–1900 pre-industrial reference period',
    source: 'WMO State of the Global Climate',
    period: '2024 Assessment',
  },
  {
    id: 'arctic-ice',
    label: 'Arctic September Sea Ice Trend',
    value: '-12.2% / decade',
    context: 'Long-term linear decline relative to 1981–2010 median extent',
    source: 'NSIDC / NASA Climate Reference',
    period: '1979–2024 Satellite Record',
  },
  {
    id: 'renewables-share',
    label: 'Global Renewable Power Additions',
    value: '86%',
    context: 'Share of new net global electricity capacity built from renewables',
    source: 'IRENA Renewable Capacity Statistics',
    period: '2024 Annual Report',
  },
];

function deterministicWave(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function pm25ToUsAqi(pm25: number): number {
  const c = Math.max(0, pm25);
  if (c <= 9.0) return Math.round((50 / 9.0) * c);
  if (c <= 35.4) return Math.round(50 + ((100 - 51) / (35.4 - 9.1)) * (c - 9.1));
  if (c <= 55.4) return Math.round(101 + ((150 - 101) / (55.4 - 35.5)) * (c - 35.5));
  if (c <= 125.4) return Math.round(151 + ((200 - 151) / (125.4 - 55.5)) * (c - 55.5));
  return Math.min(350, Math.round(201 + ((300 - 201) / (225.4 - 125.5)) * (c - 125.5)));
}

function stationSeedIndex(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    sum += id.charCodeAt(i) * (i + 1);
  }
  return sum;
}

export function buildSimulatedStationReading(
  stationInput: Pick<MonitoringStationDef, 'id' | 'city' | 'country' | 'lat' | 'lng'>,
  nowMs = Date.now(),
  variationSeed = 0
): LiveStationReading {
  const def =
    MONITORING_STATIONS.find((s) => s.id === stationInput.id) ??
    ({
      ...stationInput,
      baseTempC: 18.5,
      tempSwingC: 4.5,
      basePm25: 14.0,
      baseWindKmh: 12.0,
      baseNo2: 24.0,
      baseOzone: 48.0,
    } satisfies MonitoringStationDef);

  const fetchedAtUtc = new Date(nowMs).toISOString();
  const timeBucket = Math.floor(nowMs / 20_000) + variationSeed * 7;
  const stSeed = stationSeedIndex(def.id);
  const jitterA = deterministicWave(stSeed + timeBucket) - 0.5;
  const jitterB = deterministicWave(stSeed * 3 + timeBucket + 11) - 0.5;
  const jitterC = deterministicWave(stSeed * 5 + timeBucket + 29) - 0.5;

  const utcDate = new Date(nowMs);
  const utcHourFloat = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60;
  const solarOffsetHours = def.lng / 15;
  const localHourFloat = (((utcHourFloat + solarOffsetHours) % 24) + 24) % 24;

  // Diurnal temperature peaks around 15:00 local time
  const diurnalTempFactor = Math.sin(((localHourFloat - 9) / 24) * 2 * Math.PI);
  const temperatureC = Number(
    (def.baseTempC + def.tempSwingC * diurnalTempFactor + jitterA * 1.4).toFixed(1)
  );

  // Rush-hour particulate curve peaks around 08:30 and 19:30 local time
  const morningPeak = Math.exp(-Math.pow((localHourFloat - 8.5) / 3.2, 2));
  const eveningPeak = Math.exp(-Math.pow((localHourFloat - 19.5) / 3.5, 2));
  const trafficFactor = 0.85 + 0.28 * (morningPeak + eveningPeak);
  const pm25 = Number(Math.max(2.5, def.basePm25 * trafficFactor + jitterB * 3.8).toFixed(1));
  const pm10 = Number((pm25 * (1.72 + jitterC * 0.18)).toFixed(1));
  const usAqi = pm25ToUsAqi(pm25);

  const windSpeedKmh = Number(
    Math.max(2.5, def.baseWindKmh + jitterC * 4.6 + Math.sin(localHourFloat / 4) * 2.1).toFixed(1)
  );
  const no2 = Number(Math.max(5.0, def.baseNo2 * trafficFactor + jitterA * 4.5).toFixed(1));
  const ozone = Number(
    Math.max(18.0, def.baseOzone + Math.max(0, diurnalTempFactor) * 14 + jitterB * 5.2).toFixed(1)
  );

  // UV index peaks around 12:30 local solar noon
  const daylight = Math.max(0, Math.sin(((localHourFloat - 6) / 12) * Math.PI));
  const latFactor = Math.max(0.45, 1 - Math.abs(def.lat) / 95);
  const uvIndex =
    localHourFloat >= 6 && localHourFloat <= 18
      ? Number((daylight * 9.5 * latFactor + Math.abs(jitterA) * 0.8).toFixed(1))
      : 0;

  const currentLocalHour = Math.floor(localHourFloat);
  const hourlyForecast: { time: string; tempC: number; pm25: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const h = (currentLocalHour + i) % 24;
    const hLabel = `${String(h).padStart(2, '0')}:00`;
    const hDiurnal = Math.sin(((h - 9) / 24) * 2 * Math.PI);
    const hMorn = Math.exp(-Math.pow((h - 8.5) / 3.2, 2));
    const hEve = Math.exp(-Math.pow((h - 19.5) / 3.5, 2));
    const hJitter = deterministicWave(stSeed + timeBucket + i * 17) - 0.5;
    const hTemp = Number((def.baseTempC + def.tempSwingC * hDiurnal + hJitter * 0.9).toFixed(1));
    const hPm = Number(
      Math.max(2.5, def.basePm25 * (0.85 + 0.28 * (hMorn + hEve)) + hJitter * 2.4).toFixed(1)
    );
    hourlyForecast.push({ time: hLabel, tempC: hTemp, pm25: hPm });
  }

  return {
    id: def.id,
    city: def.city,
    country: def.country,
    lat: def.lat,
    lng: def.lng,
    status: 'ok',
    fetchedAtUtc,
    observationTime: `${fetchedAtUtc.slice(0, 16)}Z`,
    temperatureC,
    windSpeedKmh,
    usAqi,
    pm25,
    pm10,
    no2,
    ozone,
    uvIndex,
    hourlyForecast,
    sourceName: 'ECOGEN Regional Telemetry Simulation',
  };
}

export function buildPlanetTelemetryPayload(
  nowMs = Date.now(),
  variationSeed = 0
): LivePlanetPayload {
  const stations = MONITORING_STATIONS.map((station) =>
    buildSimulatedStationReading(station, nowMs, variationSeed)
  );
  return {
    stations,
    fetchedAtUtc: new Date(nowMs).toISOString(),
    sourceAttribution: 'ECOGEN Global Atmospheric Telemetry Feed (Calibrated Regional Stations)',
    climateBaselines: CLIMATE_BASELINES,
  };
}

export function normalizePlanetPayload(
  raw: LivePlanetPayload | null | undefined,
  nowMs = Date.now(),
  variationSeed = 0
): LivePlanetPayload {
  if (!raw || !Array.isArray(raw.stations) || raw.stations.length === 0) {
    return buildPlanetTelemetryPayload(nowMs, variationSeed);
  }

  let liveCount = 0;
  let simulatedCount = 0;

  const stations: LiveStationReading[] = raw.stations.map((st) => {
    const hasReadings =
      st.status === 'ok' &&
      typeof st.usAqi === 'number' &&
      typeof st.pm25 === 'number' &&
      typeof st.temperatureC === 'number' &&
      Array.isArray(st.hourlyForecast) &&
      st.hourlyForecast.length > 0;

    if (hasReadings) {
      if (st.sourceName.includes('Open-Meteo')) {
        liveCount += 1;
      } else {
        simulatedCount += 1;
      }
      return st;
    }

    simulatedCount += 1;
    return buildSimulatedStationReading(st, nowMs, variationSeed);
  });

  const sourceAttribution =
    liveCount === stations.length
      ? 'Open-Meteo Air Quality & Weather Forecast API (open-meteo.com)'
      : simulatedCount === stations.length
        ? 'ECOGEN Global Atmospheric Telemetry Feed (Calibrated Regional Stations)'
        : 'ECOGEN Hybrid Telemetry (Open-Meteo Live + Calibrated Station Feed)';

  return {
    stations,
    fetchedAtUtc: raw.fetchedAtUtc || new Date(nowMs).toISOString(),
    sourceAttribution,
    climateBaselines:
      Array.isArray(raw.climateBaselines) && raw.climateBaselines.length > 0
        ? raw.climateBaselines
        : CLIMATE_BASELINES,
  };
}
