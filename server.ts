import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ecogenStore } from './src/server/store.ts';
import {
  CLIMATE_BASELINES,
  MONITORING_STATIONS,
  buildSimulatedStationReading,
  normalizePlanetPayload,
} from './src/lib/planetTelemetry.ts';
import type { LivePlanetPayload, LiveStationReading, UserRole } from './src/types/ecogen.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let planetCache: { expiresAt: number; payload: LivePlanetPayload } | null = null;
let planetRefreshTick = 0;

async function fetchWithTimeout(url: string, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from upstream environmental API`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStationReading(
  station: (typeof MONITORING_STATIONS)[number],
  variationSeed: number
): Promise<LiveStationReading> {
  const nowMs = Date.now();
  const fetchedAtUtc = new Date(nowMs).toISOString();
  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${station.lat}&longitude=${station.lng}&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,uv_index&hourly=pm2_5&forecast_days=1`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lng}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1`;

    const [aqData, wxData] = await Promise.all([fetchWithTimeout(aqUrl), fetchWithTimeout(wxUrl)]);

    const hourlyForecast: { time: string; tempC: number; pm25: number }[] = [];
    const times: string[] = wxData?.hourly?.time ?? [];
    const temps: number[] = wxData?.hourly?.temperature_2m ?? [];
    const pms: number[] = aqData?.hourly?.pm2_5 ?? [];

    for (let i = 0; i < Math.min(12, times.length); i++) {
      hourlyForecast.push({
        time: times[i]?.slice(11, 16) || `${i}:00`,
        tempC: typeof temps[i] === 'number' ? Number(temps[i].toFixed(1)) : 0,
        pm25: typeof pms[i] === 'number' ? Number(pms[i].toFixed(1)) : 0,
      });
    }

    if (typeof aqData?.current?.us_aqi !== 'number' || hourlyForecast.length === 0) {
      return buildSimulatedStationReading(station, nowMs, variationSeed);
    }

    return {
      id: station.id,
      city: station.city,
      country: station.country,
      lat: station.lat,
      lng: station.lng,
      status: 'ok',
      fetchedAtUtc,
      observationTime: aqData?.current?.time || wxData?.current?.time || fetchedAtUtc,
      temperatureC: wxData?.current?.temperature_2m,
      windSpeedKmh: wxData?.current?.wind_speed_10m,
      usAqi: aqData?.current?.us_aqi,
      pm25: aqData?.current?.pm2_5,
      pm10: aqData?.current?.pm10,
      no2: aqData?.current?.nitrogen_dioxide,
      ozone: aqData?.current?.ozone,
      uvIndex: aqData?.current?.uv_index,
      hourlyForecast,
      sourceName: 'Open-Meteo Air Quality & Forecast API',
    };
  } catch {
    return buildSimulatedStationReading(station, nowMs, variationSeed);
  }
}

function getRoleFromReq(req: express.Request): UserRole {
  const raw = String(req.header('x-ecogen-role') || 'guest').toLowerCase();
  if (raw === 'user' || raw === 'volunteer' || raw === 'organization' || raw === 'admin') {
    return raw;
  }
  return 'guest';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/bootstrap', (_req, res) => {
    res.json(ecogenStore.getState());
  });

  app.get('/api/planet/live', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    if (!forceRefresh && planetCache && planetCache.expiresAt > Date.now()) {
      return res.json(planetCache.payload);
    }

    planetRefreshTick += 1;
    const nowMs = Date.now();
    const stations = await Promise.all(
      MONITORING_STATIONS.map((st) => fetchStationReading(st, planetRefreshTick))
    );
    const payload = normalizePlanetPayload(
      {
        stations,
        fetchedAtUtc: new Date(nowMs).toISOString(),
        sourceAttribution: 'Open-Meteo Air Quality & Weather Forecast API (open-meteo.com)',
        climateBaselines: CLIMATE_BASELINES,
      },
      nowMs,
      planetRefreshTick
    );

    planetCache = {
      expiresAt: Date.now() + 30_000,
      payload,
    };

    res.json(payload);
  });

  app.post('/api/challenges/:id/submit', (req, res) => {
    const role = getRoleFromReq(req);
    const { evidenceNote, photoName, photoDataUrl } = req.body ?? {};
    const outcome = ecogenStore.submitChallenge(
      role,
      req.params.id,
      String(evidenceNote || ''),
      photoName ? String(photoName) : undefined,
      photoDataUrl ? String(photoDataUrl) : undefined
    );
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  app.post('/api/campaigns', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.createCampaign(role, req.body ?? {});
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  app.post('/api/campaigns/:id/join', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.toggleJoinCampaign(role, req.params.id);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/campaigns/:id/photos', (req, res) => {
    const role = getRoleFromReq(req);
    const { caption, imageUrl, impactDelta } = req.body ?? {};
    const outcome = ecogenStore.addCampaignPhoto(
      role,
      req.params.id,
      String(caption || ''),
      String(imageUrl || ''),
      Number(impactDelta || 0)
    );
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  app.post('/api/reports', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.submitIssueReport(role, req.body ?? {});
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  app.post('/api/carbon', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.saveCarbonCalculation(role, req.body ?? {});
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  app.post('/api/academy/:id/quiz', (req, res) => {
    const role = getRoleFromReq(req);
    const answers = Array.isArray(req.body?.answers) ? req.body.answers.map(Number) : [];
    const outcome = ecogenStore.submitAcademyQuiz(role, req.params.id, answers);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/notifications/read', (req, res) => {
    const role = getRoleFromReq(req);
    res.json(ecogenStore.markNotificationsRead(role));
  });

  // Admin moderation routes
  app.post('/api/admin/submissions/:id/review', (req, res) => {
    const role = getRoleFromReq(req);
    const decision = req.body?.decision === 'rejected' ? 'rejected' : 'approved';
    const outcome = ecogenStore.reviewSubmission(role, req.params.id, decision);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/admin/reports/:id/status', (req, res) => {
    const role = getRoleFromReq(req);
    const { status, resolutionNote } = req.body ?? {};
    const outcome = ecogenStore.updateReportStatus(role, req.params.id, status, resolutionNote);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/admin/campaigns/:id/approve', (req, res) => {
    const role = getRoleFromReq(req);
    const status = req.body?.status === 'completed' ? 'completed' : 'active';
    const outcome = ecogenStore.approveCampaign(role, req.params.id, status);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/admin/users/:id/verify-org', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.adminToggleOrgVerification(role, req.params.id);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/admin/campuses/:id/flag', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.adminToggleCampusFlag(role, req.params.id);
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.json(outcome);
  });

  app.post('/api/admin/challenges', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.adminCreateChallenge(role, req.body ?? {});
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  app.post('/api/admin/articles', (req, res) => {
    const role = getRoleFromReq(req);
    const outcome = ecogenStore.adminCreateArticle(role, req.body ?? {});
    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }
    res.status(201).json(outcome);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('ECOGEN server running on http://localhost:3000');
  });
}

startServer();
