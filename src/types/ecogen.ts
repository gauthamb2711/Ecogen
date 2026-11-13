export type UserRole = 'guest' | 'user' | 'volunteer' | 'organization' | 'admin';

export type AppSection =
  | 'home'
  | 'planet'
  | 'actions'
  | 'calculator'
  | 'academy'
  | 'workspace';

export interface RolePersona {
  role: UserRole;
  userId: string;
  name: string;
  email: string;
  organizationName?: string;
  ecoScore: number;
  verifiedOrg: boolean;
  campusId?: string;
  title: string;
  capabilities: string[];
}

export interface EnvironmentalIssue {
  id: string;
  slug: string;
  title: string;
  summary: string;
  headlineMetric: string;
  metricUnit: string;
  sourceName: string;
  sourceYear: string;
  severity: 'Critical' | 'High' | 'Elevated';
  drivers: string[];
  mitigationActions: string[];
  imageUrl: string;
  relatedChallengeId: string;
}

export interface EcoChallenge {
  id: string;
  title: string;
  description: string;
  cadence: 'Daily' | 'Weekly';
  category: 'Energy' | 'Waste' | 'Mobility' | 'Biodiversity' | 'Water';
  points: number;
  estimatedCo2SavedKg: number;
  verificationHint: string;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  challengeTitle: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  evidenceNote: string;
  photoName?: string;
  photoDataUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface CampaignPhoto {
  id: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
  imageUrl: string;
}

export interface CommunityCampaign {
  id: string;
  title: string;
  organizerName: string;
  organizerRole: UserRole;
  category: 'Reforestation' | 'Clean Water' | 'Zero Waste' | 'Clean Energy' | 'Biodiversity';
  locationName: string;
  lat: number;
  lng: number;
  description: string;
  targetParticipants: number;
  participantIds: string[];
  impactMetricLabel: string;
  verifiedImpactValue: number;
  targetImpactValue: number;
  status: 'active' | 'pending_approval' | 'completed';
  imageUrl: string;
  photos: CampaignPhoto[];
  createdAt: string;
}

export interface IssueReport {
  id: string;
  title: string;
  category: 'Air Quality' | 'Water Contamination' | 'Illegal Dumping' | 'Deforestation' | 'Habitat Threat';
  severity: 'High' | 'Medium' | 'Low';
  locationName: string;
  lat: number;
  lng: number;
  description: string;
  photoName?: string;
  photoDataUrl?: string;
  reporterId: string;
  reporterName: string;
  status: 'submitted' | 'under_review' | 'verified' | 'resolved';
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarbonInput {
  weeklyCarKm: number;
  vehicleType: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  weeklyTransitKm: number;
  annualShortFlights: number;
  annualLongFlights: number;
  monthlyElectricityKwh: number;
  gridRegion: 'global' | 'us' | 'eu' | 'india' | 'nordic';
  renewableTariffPct: number;
  dietType: 'plant_based' | 'vegetarian' | 'flexitarian' | 'omnivore' | 'high_meat';
  foodWasteHabit: 'low' | 'average' | 'high';
  monthlyGoodsSpendUsd: number;
  compostingAndRecycling: boolean;
}

export interface CarbonCalculationResult {
  totalKgCo2e: number;
  totalTonnesCo2e: number;
  breakdown: {
    transportKg: number;
    electricityKg: number;
    foodKg: number;
    lifestyleKg: number;
  };
  globalAverageTonnes: number;
  parisTargetTonnes: number;
  deltaFromGlobalPct: number;
  assumptions: string[];
  recommendations: {
    title: string;
    potentialAnnualSavingKg: number;
    rationale: string;
  }[];
  methodologyNote: string;
}

export interface SavedCarbonRecord {
  id: string;
  userId: string;
  createdAt: string;
  input: CarbonInput;
  result: CarbonCalculationResult;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AcademyModule {
  id: string;
  title: string;
  topic: string;
  readMinutes: number;
  summary: string;
  articleParagraphs: string[];
  environmentalFacts: string[];
  imageUrl: string;
  badgeTitle: string;
  questions: QuizQuestion[];
}

export interface AcademyProgressRecord {
  moduleId: string;
  userId: string;
  scorePct: number;
  passed: boolean;
  certificateId?: string;
  completedAt: string;
}

export interface CampusProfile {
  id: string;
  name: string;
  city: string;
  country: string;
  studentPopulation: number;
  verifiedActivities: number;
  campaignParticipationRate: number;
  carbonSavedKg: number;
  flaggedForReview?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  publishedDate: string;
  readMinutes: number;
  author: string;
  excerpt: string;
  body: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  quote: string;
  verifiedOutcome: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: 'challenge' | 'campaign' | 'report' | 'user' | 'campus' | 'content';
  targetId: string;
  details: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface LiveStationReading {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  status: 'ok' | 'error';
  errorMessage?: string;
  fetchedAtUtc: string;
  observationTime?: string;
  temperatureC?: number;
  windSpeedKmh?: number;
  usAqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  ozone?: number;
  uvIndex?: number;
  hourlyForecast?: {
    time: string;
    tempC: number;
    pm25: number;
  }[];
  sourceName: string;
}

export interface LivePlanetPayload {
  stations: LiveStationReading[];
  fetchedAtUtc: string;
  sourceAttribution: string;
  climateBaselines: {
    id: string;
    label: string;
    value: string;
    context: string;
    source: string;
    period: string;
  }[];
}

export interface EcogenAppState {
  personas: RolePersona[];
  issues: EnvironmentalIssue[];
  challenges: EcoChallenge[];
  submissions: ChallengeSubmission[];
  campaigns: CommunityCampaign[];
  reports: IssueReport[];
  academyModules: AcademyModule[];
  academyProgress: AcademyProgressRecord[];
  campuses: CampusProfile[];
  articles: NewsArticle[];
  testimonials: Testimonial[];
  carbonHistory: SavedCarbonRecord[];
  auditLogs: AuditLogEntry[];
  notifications: UserNotification[];
}
