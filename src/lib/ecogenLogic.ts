import type {
  CampusProfile,
  CarbonCalculationResult,
  CarbonInput,
  ChallengeSubmission,
  UserRole,
} from '../types/ecogen';

// Documented emission factors based on UK DEFRA 2024, US EPA 2024, and Our World in Data / IPCC AR6 lifecycle estimates.
export const VEHICLE_FACTORS_KG_PER_KM: Record<CarbonInput['vehicleType'], number> = {
  petrol: 0.171,
  diesel: 0.168,
  hybrid: 0.118,
  electric: 0.047, // includes upstream grid charging lifecycle average
};

export const GRID_INTENSITY_KG_PER_KWH: Record<CarbonInput['gridRegion'], number> = {
  global: 0.475,
  us: 0.386,
  eu: 0.23,
  india: 0.71,
  nordic: 0.045,
};

export const DIET_ANNUAL_KG: Record<CarbonInput['dietType'], number> = {
  plant_based: 1050,
  vegetarian: 1390,
  flexitarian: 1780,
  omnivore: 2350,
  high_meat: 3180,
};

export const FOOD_WASTE_MULTIPLIER: Record<CarbonInput['foodWasteHabit'], number> = {
  low: 0.9,
  average: 1.0,
  high: 1.18,
};

export const GLOBAL_AVERAGE_TONNES = 4.7;
export const PARIS_TARGET_TONNES = 2.3;

export function calculateCarbonFootprint(input: CarbonInput): CarbonCalculationResult {
  const safeWeeklyCarKm = Math.max(0, Number.isFinite(input.weeklyCarKm) ? input.weeklyCarKm : 0);
  const safeWeeklyTransitKm = Math.max(0, Number.isFinite(input.weeklyTransitKm) ? input.weeklyTransitKm : 0);
  const safeShortFlights = Math.max(0, Number.isFinite(input.annualShortFlights) ? input.annualShortFlights : 0);
  const safeLongFlights = Math.max(0, Number.isFinite(input.annualLongFlights) ? input.annualLongFlights : 0);
  const safeMonthlyKwh = Math.max(0, Number.isFinite(input.monthlyElectricityKwh) ? input.monthlyElectricityKwh : 0);
  const safeRenewablePct = Math.min(100, Math.max(0, Number.isFinite(input.renewableTariffPct) ? input.renewableTariffPct : 0));
  const safeMonthlySpend = Math.max(0, Number.isFinite(input.monthlyGoodsSpendUsd) ? input.monthlyGoodsSpendUsd : 0);

  // 1. Transport (52 weeks + flights with radiative forcing multiplier ~1.7x included in DEFRA factor)
  const carKg = safeWeeklyCarKm * 52 * VEHICLE_FACTORS_KG_PER_KM[input.vehicleType];
  const transitKg = safeWeeklyTransitKm * 52 * 0.068; // weighted bus/urban rail factor
  const flightsKg = safeShortFlights * 250 + safeLongFlights * 1150;
  const transportKg = Math.round(carKg + transitKg + flightsKg);

  // 2. Electricity (12 months * grid intensity adjusted by renewable tariff)
  const effectiveGridFactor =
    GRID_INTENSITY_KG_PER_KWH[input.gridRegion] * (1 - (safeRenewablePct / 100) * 0.92);
  const electricityKg = Math.round(safeMonthlyKwh * 12 * effectiveGridFactor);

  // 3. Food (Poore & Nemecek 2018 / IPCC AR6 annualized food chain factors)
  const foodKg = Math.round(
    DIET_ANNUAL_KG[input.dietType] * FOOD_WASTE_MULTIPLIER[input.foodWasteHabit]
  );

  // 4. Lifestyle & goods (~0.24 kgCO2e per USD consumer goods baseline, minus composting/recycling credit)
  const rawLifestyle = safeMonthlySpend * 12 * 0.24;
  const wasteCredit = input.compostingAndRecycling ? 180 : 0;
  const lifestyleKg = Math.round(Math.max(120, rawLifestyle - wasteCredit));

  const totalKgCo2e = transportKg + electricityKg + foodKg + lifestyleKg;
  const totalTonnesCo2e = Number((totalKgCo2e / 1000).toFixed(2));
  const deltaFromGlobalPct = Number(
    (((totalTonnesCo2e - GLOBAL_AVERAGE_TONNES) / GLOBAL_AVERAGE_TONNES) * 100).toFixed(1)
  );

  const assumptions = [
    `Vehicle emission factor (${input.vehicleType}): ${VEHICLE_FACTORS_KG_PER_KM[input.vehicleType]} kgCO2e/km (UK DEFRA 2024 passenger car average).`,
    `Grid carbon intensity (${input.gridRegion.toUpperCase()}): ${GRID_INTENSITY_KG_PER_KWH[input.gridRegion]} kgCO2e/kWh before renewable tariff offset (${safeRenewablePct}%).`,
    `Flight estimates assume ~250 kgCO2e per short-haul round trip (<1,500 km) and ~1,150 kgCO2e per long-haul round trip including non-CO2 altitude effects.`,
    `Dietary lifecycle intensity follows Poore & Nemecek (2018) / Our World in Data food-system averages; consumer goods use 0.24 kgCO2e/USD spend-based estimation.`,
    `These outputs are educational planning estimates—not certified GHG inventory measurements.`,
  ];

  const recommendations: CarbonCalculationResult['recommendations'] = [];

  if (carKg > 900 && input.vehicleType !== 'electric') {
    recommendations.push({
      title: 'Shift 40% of weekly car travel to transit or cycling',
      potentialAnnualSavingKg: Math.round(carKg * 0.35),
      rationale: 'Replacing short single-occupancy petrol/diesel trips yields the fastest transport emissions cut.',
    });
  }
  if (flightsKg >= 500) {
    recommendations.push({
      title: 'Replace one regional flight per year with rail or remote attendance',
      potentialAnnualSavingKg: Math.min(flightsKg, 250),
      rationale: 'Aviation carries high per-passenger-km emissions plus high-altitude radiative forcing.',
    });
  }
  if (electricityKg > 700 && safeRenewablePct < 80) {
    recommendations.push({
      title: 'Switch household power to a verified 100% renewable tariff or rooftop solar',
      potentialAnnualSavingKg: Math.round(electricityKg * 0.7),
      rationale: 'Decarbonizing electricity supply reduces Scope 2 emissions without sacrificing appliance utility.',
    });
  }
  if (input.dietType === 'high_meat' || input.dietType === 'omnivore') {
    recommendations.push({
      title: 'Adopt a flexitarian diet (plant-forward 4+ days/week)',
      potentialAnnualSavingKg: Math.max(350, foodKg - DIET_ANNUAL_KG.flexitarian),
      rationale: 'Ruminant livestock accounts for disproportionate methane and land-use emissions.',
    });
  }
  if (!input.compostingAndRecycling) {
    recommendations.push({
      title: 'Start organic composting and municipal material sorting',
      potentialAnnualSavingKg: 180,
      rationale: 'Diverting organics from landfills prevents anaerobic methane release.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Share low-carbon practices in a local ECOGEN community campaign',
      potentialAnnualSavingKg: 240,
      rationale: 'Your personal baseline is already below the 1.5°C pathway benchmark; community advocacy multiplies impact.',
    });
  }

  return {
    totalKgCo2e,
    totalTonnesCo2e,
    breakdown: {
      transportKg,
      electricityKg,
      foodKg,
      lifestyleKg,
    },
    globalAverageTonnes: GLOBAL_AVERAGE_TONNES,
    parisTargetTonnes: PARIS_TARGET_TONNES,
    deltaFromGlobalPct,
    assumptions,
    recommendations,
    methodologyNote:
      'Calculated using documented DEFRA 2024, US EPA, and IPCC AR6 lifecycle conversion factors. Results represent approximate annual estimates for personal awareness.',
  };
}

export function computeCampusFairScore(campus: CampusProfile): number {
  const sizeNormalizer = Math.log10(Math.max(100, campus.studentPopulation) + 100);
  const rawImpact =
    campus.verifiedActivities * 12 +
    campus.campaignParticipationRate * 100 * 4.5 +
    campus.carbonSavedKg * 0.04;
  return Number((rawImpact / sizeNormalizer).toFixed(1));
}

export function rankCampusesFairly(campuses: CampusProfile[]): Array<CampusProfile & { fairScore: number; rank: number }> {
  return [...campuses]
    .map((campus) => ({
      ...campus,
      fairScore: computeCampusFairScore(campus),
    }))
    .sort((a, b) => b.fairScore - a.fairScore)
    .map((campus, idx) => ({
      ...campus,
      rank: idx + 1,
    }));
}

export type EcogenPermissionAction =
  | 'view_public'
  | 'submit_challenge'
  | 'join_campaign'
  | 'create_campaign'
  | 'submit_report'
  | 'save_carbon'
  | 'complete_quiz'
  | 'admin_moderate';

const ROLE_PERMISSIONS: Record<UserRole, EcogenPermissionAction[]> = {
  guest: ['view_public'],
  user: ['view_public', 'submit_challenge', 'join_campaign', 'submit_report', 'save_carbon', 'complete_quiz'],
  volunteer: [
    'view_public',
    'submit_challenge',
    'join_campaign',
    'create_campaign',
    'submit_report',
    'save_carbon',
    'complete_quiz',
  ],
  organization: [
    'view_public',
    'submit_challenge',
    'join_campaign',
    'create_campaign',
    'submit_report',
    'save_carbon',
    'complete_quiz',
  ],
  admin: [
    'view_public',
    'submit_challenge',
    'join_campaign',
    'create_campaign',
    'submit_report',
    'save_carbon',
    'complete_quiz',
    'admin_moderate',
  ],
};

export function canPerformAction(role: UserRole, action: EcogenPermissionAction): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

export function validateEvidenceFile(file: { name: string; type: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file format. Upload a JPEG, PNG, or WebP photograph.',
    };
  }
  const maxBytes = 5 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    return {
      valid: false,
      error: 'Image size must be between 1 byte and 5 MB.',
    };
  }
  return { valid: true };
}

export function hasDuplicateChallengeSubmission(
  submissions: ChallengeSubmission[],
  challengeId: string,
  userId: string
): boolean {
  return submissions.some(
    (s) => s.challengeId === challengeId && s.userId === userId && s.status !== 'rejected'
  );
}

export function gradeAcademyQuiz(
  answers: number[],
  correctIndices: number[]
): { correctCount: number; total: number; scorePct: number; passed: boolean } {
  const total = correctIndices.length;
  if (total === 0) {
    return { correctCount: 0, total: 0, scorePct: 0, passed: false };
  }
  let correctCount = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] === correctIndices[i]) {
      correctCount += 1;
    }
  }
  const scorePct = Math.round((correctCount / total) * 100);
  return {
    correctCount,
    total,
    scorePct,
    passed: scorePct >= 70,
  };
}
