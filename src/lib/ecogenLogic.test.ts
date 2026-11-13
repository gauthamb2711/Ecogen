import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCarbonFootprint,
  canPerformAction,
  computeCampusFairScore,
  gradeAcademyQuiz,
  hasDuplicateChallengeSubmission,
  rankCampusesFairly,
  validateEvidenceFile,
} from './ecogenLogic';
import {
  buildPlanetTelemetryPayload,
  normalizePlanetPayload,
} from './planetTelemetry';
import type { CampusProfile, ChallengeSubmission, CarbonInput } from '../types/ecogen';

const BASE_INPUT: CarbonInput = {
  weeklyCarKm: 100,
  vehicleType: 'petrol',
  weeklyTransitKm: 20,
  annualShortFlights: 2,
  annualLongFlights: 0,
  monthlyElectricityKwh: 250,
  gridRegion: 'global',
  renewableTariffPct: 0,
  dietType: 'omnivore',
  foodWasteHabit: 'average',
  monthlyGoodsSpendUsd: 200,
  compostingAndRecycling: false,
};

test('carbon calculator computes documented emissions and lowers with renewable tariff and EV', () => {
  const baseResult = calculateCarbonFootprint(BASE_INPUT);
  assert.ok(baseResult.totalKgCo2e > 3000);
  assert.equal(baseResult.assumptions.length >= 4, true);

  const greenerResult = calculateCarbonFootprint({
    ...BASE_INPUT,
    vehicleType: 'electric',
    renewableTariffPct: 100,
    dietType: 'plant_based',
    compostingAndRecycling: true,
  });
  assert.ok(greenerResult.totalKgCo2e < baseResult.totalKgCo2e);
  assert.ok(greenerResult.breakdown.transportKg < baseResult.breakdown.transportKg);
  assert.ok(greenerResult.breakdown.electricityKg < baseResult.breakdown.electricityKg);
});

test('campus fair ranking normalizes by student population so smaller active campuses rank fairly', () => {
  const smallActive: CampusProfile = {
    id: 'c1',
    name: 'Small Green College',
    city: 'Burlington',
    country: 'USA',
    studentPopulation: 1800,
    verifiedActivities: 140,
    campaignParticipationRate: 0.62,
    carbonSavedKg: 14500,
  };
  const giantLowEngagement: CampusProfile = {
    id: 'c2',
    name: 'Mega State University',
    city: 'Austin',
    country: 'USA',
    studentPopulation: 45000,
    verifiedActivities: 140,
    campaignParticipationRate: 0.12,
    carbonSavedKg: 14500,
  };

  assert.ok(computeCampusFairScore(smallActive) > computeCampusFairScore(giantLowEngagement));
  const ranked = rankCampusesFairly([giantLowEngagement, smallActive]);
  assert.equal(ranked[0].id, 'c1');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, 2);
});

test('role-based access control enforces guest restrictions and admin moderation privileges', () => {
  assert.equal(canPerformAction('guest', 'view_public'), true);
  assert.equal(canPerformAction('guest', 'submit_challenge'), false);
  assert.equal(canPerformAction('user', 'submit_challenge'), true);
  assert.equal(canPerformAction('user', 'create_campaign'), false);
  assert.equal(canPerformAction('volunteer', 'create_campaign'), true);
  assert.equal(canPerformAction('organization', 'create_campaign'), true);
  assert.equal(canPerformAction('organization', 'admin_moderate'), false);
  assert.equal(canPerformAction('admin', 'admin_moderate'), true);
});

test('evidence file validation rejects invalid mime types and oversized uploads', () => {
  assert.equal(validateEvidenceFile({ name: 'photo.jpg', type: 'image/jpeg', size: 120_000 }).valid, true);
  assert.equal(validateEvidenceFile({ name: 'script.exe', type: 'application/x-msdownload', size: 1000 }).valid, false);
  assert.equal(validateEvidenceFile({ name: 'huge.png', type: 'image/png', size: 9 * 1024 * 1024 }).valid, false);
});

test('duplicate challenge submission guard blocks repeat pending/approved entries while allowing retry after rejection', () => {
  const existing: ChallengeSubmission[] = [
    {
      id: 'sub-1',
      challengeId: 'ch-1',
      challengeTitle: 'Zero-Plastic Commute',
      userId: 'u-user',
      userName: 'Maya Lin',
      userRole: 'user',
      evidenceNote: 'Photo of reusable mug',
      status: 'pending',
      pointsAwarded: 0,
      submittedAt: '2026-11-12T10:00:00Z',
    },
    {
      id: 'sub-2',
      challengeId: 'ch-2',
      challengeTitle: 'Transit Day',
      userId: 'u-user',
      userName: 'Maya Lin',
      userRole: 'user',
      evidenceNote: 'Blurry photo',
      status: 'rejected',
      pointsAwarded: 0,
      submittedAt: '2026-11-11T10:00:00Z',
    },
  ];

  assert.equal(hasDuplicateChallengeSubmission(existing, 'ch-1', 'u-user'), true);
  assert.equal(hasDuplicateChallengeSubmission(existing, 'ch-2', 'u-user'), false);
});

test('academy quiz grading computes percentage and 70% pass threshold', () => {
  const passResult = gradeAcademyQuiz([1, 2, 0, 1], [1, 2, 0, 3]);
  assert.equal(passResult.correctCount, 3);
  assert.equal(passResult.scorePct, 75);
  assert.equal(passResult.passed, true);

  const failResult = gradeAcademyQuiz([0, 0, 0, 0], [1, 2, 0, 3]);
  assert.equal(failResult.scorePct, 25);
  assert.equal(failResult.passed, false);
});

test('planet telemetry payload provides all 6 stations with dynamic values and hourly forecasts', () => {
  const fixedNow = Date.parse('2026-11-12T14:30:00Z');
  const first = buildPlanetTelemetryPayload(fixedNow, 1);
  const second = buildPlanetTelemetryPayload(fixedNow, 2);

  assert.equal(first.stations.length, 6);
  assert.equal(first.climateBaselines.length, 4);
  for (const st of first.stations) {
    assert.equal(st.status, 'ok');
    assert.equal(typeof st.usAqi, 'number');
    assert.equal(typeof st.pm25, 'number');
    assert.equal(typeof st.temperatureC, 'number');
    assert.equal(st.hourlyForecast?.length, 12);
  }

  // Refresh variation seed produces realistic dynamic fluctuation across stations
  const anyDiff = first.stations.some((s, i) => {
    const next = second.stations[i];
    return (
      s.usAqi !== next.usAqi ||
      s.pm25 !== next.pm25 ||
      s.temperatureC !== next.temperatureC ||
      s.windSpeedKmh !== next.windSpeedKmh
    );
  });
  assert.equal(anyDiff, true);
});

test('normalizePlanetPayload replaces failed stations while keeping valid live stations intact', () => {
  const fixedNow = Date.parse('2026-11-12T14:30:00Z');
  const base = buildPlanetTelemetryPayload(fixedNow, 1);
  const brokenPayload = {
    ...base,
    stations: base.stations.map((s, idx) =>
      idx === 1
        ? {
            id: s.id,
            city: s.city,
            country: s.country,
            lat: s.lat,
            lng: s.lng,
            status: 'error' as const,
            errorMessage: 'Network blocked',
            fetchedAtUtc: s.fetchedAtUtc,
            sourceName: 'Open-Meteo Air Quality & Forecast API',
          }
        : {
            ...s,
            sourceName: 'Open-Meteo Air Quality & Forecast API',
          }
    ),
  };

  const normalized = normalizePlanetPayload(brokenPayload, fixedNow, 3);
  assert.equal(normalized.stations.length, 6);
  assert.equal(normalized.stations[1].status, 'ok');
  assert.equal(normalized.stations[1].hourlyForecast?.length, 12);
  assert.equal(typeof normalized.stations[1].usAqi, 'number');
  assert.equal(normalized.stations[0].sourceName, 'Open-Meteo Air Quality & Forecast API');
});
