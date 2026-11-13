import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInitialSeedState } from './data/seedData';
import { buildPlanetTelemetryPayload, normalizePlanetPayload } from './lib/planetTelemetry';
import type {
  AppSection,
  CarbonInput,
  CommunityCampaign,
  EcoChallenge,
  EcogenAppState,
  IssueReport,
  LivePlanetPayload,
  UserRole,
} from './types/ecogen';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { PlanetAndIssuesView } from './components/PlanetAndIssuesView';
import { ActionsView } from './components/ActionsView';
import { CarbonCalculatorView } from './components/CarbonCalculatorView';
import { AcademyAndCampusView } from './components/AcademyAndCampusView';
import { WorkspaceView } from './components/WorkspaceView';

export default function App() {
  const [state, setState] = useState<EcogenAppState>(() => createInitialSeedState());
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('ecogen_active_role') as UserRole | null;
      if (saved && ['guest', 'user', 'volunteer', 'organization', 'admin'].includes(saved)) {
        return saved;
      }
    }
    return 'user';
  });
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [subTab, setSubTab] = useState<string | undefined>(undefined);
  const [focusId, setFocusId] = useState<string | undefined>(undefined);

  const telemetrySeedRef = useRef(0);
  const [planetData, setPlanetData] = useState<LivePlanetPayload>(() =>
    buildPlanetTelemetryPayload(Date.now(), 0)
  );
  const [planetLoading, setPlanetLoading] = useState<boolean>(false);
  const [planetError, setPlanetError] = useState<string | null>(null);

  const activePersona = useMemo(
    () => state.personas.find((p) => p.role === activeRole) ?? state.personas[0],
    [state.personas, activeRole]
  );

  const unreadNotifications = useMemo(
    () =>
      state.notifications.filter((n) => n.userId === activePersona.userId && !n.read).length,
    [state.notifications, activePersona.userId]
  );

  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ecogen_active_role', role);
    }
  };

  const handleNavigate = (section: AppSection, nextSubTab?: string, nextFocusId?: string) => {
    setActiveSection(section);
    setSubTab(nextSubTab);
    setFocusId(nextFocusId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data: EcogenAppState = await res.json();
        setState(data);
      }
    } catch {
      // Keep local seed state if bootstrap fails
    }
  }, []);

  const fetchLivePlanet = useCallback(async (force = false) => {
    if (force) {
      setPlanetLoading(true);
    }
    setPlanetError(null);
    telemetrySeedRef.current += 1;
    const seed = telemetrySeedRef.current;

    try {
      const res = await fetch(force ? '/api/planet/live?refresh=1' : '/api/planet/live');
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`Telemetry service returned HTTP ${res.status}`);
      }
      const data: LivePlanetPayload = await res.json();
      setPlanetData(normalizePlanetPayload(data, Date.now(), seed));
    } catch {
      // Fallback seamlessly to dynamic regional telemetry stream after static or offline deployment
      setPlanetData(buildPlanetTelemetryPayload(Date.now(), seed));
    } finally {
      setPlanetLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBootstrap();
    fetchLivePlanet(false);

    const intervalId = window.setInterval(() => {
      fetchLivePlanet(true);
    }, 25_000);

    return () => window.clearInterval(intervalId);
  }, [fetchBootstrap, fetchLivePlanet]);

  async function apiMutate<T = unknown>(
    url: string,
    body?: Record<string, unknown>
  ): Promise<{ ok: boolean; error?: string; data?: T }> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ecogen-role': activeRole,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error || `Request failed (${res.status})` };
      }
      if (json.state) {
        setState(json.state);
      }
      return { ok: true, data: json.data };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Network error occurred.',
      };
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] text-[#14231B]">
      <Navbar
        activeSection={activeSection}
        onNavigate={(sec) => handleNavigate(sec)}
        activePersona={activePersona}
        unreadNotifications={unreadNotifications}
      />

      <main className="flex-1">
        {activeSection === 'home' && (
          <HomeView
            state={state}
            planetData={planetData}
            planetLoading={planetLoading}
            activeRole={activeRole}
            onSelectRole={handleSelectRole}
            onNavigate={handleNavigate}
          />
        )}

        {activeSection === 'planet' && (
          <PlanetAndIssuesView
            key={`${subTab || 'dashboard'}-${focusId || ''}`}
            issues={state.issues}
            planetData={planetData}
            planetLoading={planetLoading}
            planetError={planetError}
            onRefreshPlanet={() => fetchLivePlanet(true)}
            initialTab={subTab}
            initialIssueId={focusId}
            onNavigate={handleNavigate}
          />
        )}

        {activeSection === 'actions' && (
          <ActionsView
            key={`${subTab || 'challenges'}-${focusId || ''}`}
            state={state}
            activePersona={activePersona}
            activeRole={activeRole}
            onSelectRole={handleSelectRole}
            initialTab={subTab}
            initialFocusId={focusId}
            onSubmitChallenge={(challengeId, evidenceNote, photoName, photoDataUrl) =>
              apiMutate(`/api/challenges/${challengeId}/submit`, {
                evidenceNote,
                photoName,
                photoDataUrl,
              })
            }
            onToggleJoinCampaign={(campaignId) => apiMutate(`/api/campaigns/${campaignId}/join`)}
            onCreateCampaign={(payload: {
              title: string;
              category: CommunityCampaign['category'];
              locationName: string;
              lat: number;
              lng: number;
              description: string;
              targetParticipants: number;
              impactMetricLabel: string;
              targetImpactValue: number;
            }) => apiMutate('/api/campaigns', payload)}
            onAddCampaignPhoto={(campaignId, caption, imageUrl, impactDelta) =>
              apiMutate(`/api/campaigns/${campaignId}/photos`, {
                caption,
                imageUrl,
                impactDelta,
              })
            }
            onSubmitReport={(payload: {
              title: string;
              category: IssueReport['category'];
              severity: IssueReport['severity'];
              locationName: string;
              lat: number;
              lng: number;
              description: string;
              photoName?: string;
              photoDataUrl?: string;
            }) => apiMutate('/api/reports', payload)}
          />
        )}

        {activeSection === 'calculator' && (
          <CarbonCalculatorView
            activeRole={activeRole}
            onSelectRole={handleSelectRole}
            onSaveCalculation={(input: CarbonInput) =>
              apiMutate('/api/carbon', input as unknown as Record<string, unknown>)
            }
          />
        )}

        {activeSection === 'academy' && (
          <AcademyAndCampusView
            key={`${subTab || 'modules'}-${focusId || ''}`}
            state={state}
            activePersona={activePersona}
            activeRole={activeRole}
            onSelectRole={handleSelectRole}
            initialTab={subTab}
            initialFocusId={focusId}
            onSubmitQuiz={async (moduleId, answers) => {
              const res = await apiMutate<{
                graded: { correctCount: number; total: number; scorePct: number; passed: boolean };
              }>(`/api/academy/${moduleId}/quiz`, { answers });
              return { ok: res.ok, error: res.error, graded: res.data?.graded };
            }}
          />
        )}

        {activeSection === 'workspace' && (
          <WorkspaceView
            state={state}
            activePersona={activePersona}
            activeRole={activeRole}
            onSelectRole={handleSelectRole}
            onMarkNotificationsRead={async () => {
              await apiMutate('/api/notifications/read');
            }}
            onAdminReviewSubmission={(submissionId, decision) =>
              apiMutate(`/api/admin/submissions/${submissionId}/review`, { decision })
            }
            onAdminUpdateReportStatus={(reportId, status, resolutionNote) =>
              apiMutate(`/api/admin/reports/${reportId}/status`, { status, resolutionNote })
            }
            onAdminApproveCampaign={(campaignId, status) =>
              apiMutate(`/api/admin/campaigns/${campaignId}/approve`, { status })
            }
            onAdminToggleOrgVerify={(userId) => apiMutate(`/api/admin/users/${userId}/verify-org`)}
            onAdminToggleCampusFlag={(campusId) => apiMutate(`/api/admin/campuses/${campusId}/flag`)}
            onAdminCreateChallenge={(payload: {
              title: string;
              description: string;
              cadence: 'Daily' | 'Weekly';
              category: EcoChallenge['category'];
              points: number;
              estimatedCo2SavedKg: number;
            }) => apiMutate('/api/admin/challenges', payload)}
            onAdminCreateArticle={(payload) => apiMutate('/api/admin/articles', payload)}
          />
        )}
      </main>

      <footer className="border-t border-[#DDE3DD] bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#4B5E53]">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-display font-bold text-sm text-[#0F2E1E]">ECOGEN</span>
            <span aria-hidden="true">·</span>
            <span>Small Actions. Measurable Impact. A Greener Future.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => handleNavigate('planet', 'dashboard')}
              className="hover:text-[#0F2E1E] cursor-pointer"
            >
              Planet Data
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('calculator')}
              className="hover:text-[#0F2E1E] cursor-pointer"
            >
              Carbon Methodology
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('academy', 'leaderboard')}
              className="hover:text-[#0F2E1E] cursor-pointer"
            >
              Campus Rankings
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('workspace')}
              className="hover:text-[#0F2E1E] cursor-pointer"
            >
              Role Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
