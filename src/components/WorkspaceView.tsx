import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import type {
  EcoChallenge,
  EcogenAppState,
  IssueReport,
  RolePersona,
  UserRole,
} from '../types/ecogen';
import { RoleSelectorBar } from './RoleSelectorBar';

interface WorkspaceViewProps {
  state: EcogenAppState;
  activePersona: RolePersona;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onMarkNotificationsRead: () => Promise<void>;
  onAdminReviewSubmission: (
    submissionId: string,
    decision: 'approved' | 'rejected'
  ) => Promise<{ ok: boolean; error?: string }>;
  onAdminUpdateReportStatus: (
    reportId: string,
    status: IssueReport['status'],
    resolutionNote?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onAdminApproveCampaign: (
    campaignId: string,
    status: 'active' | 'completed'
  ) => Promise<{ ok: boolean; error?: string }>;
  onAdminToggleOrgVerify: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  onAdminToggleCampusFlag: (campusId: string) => Promise<{ ok: boolean; error?: string }>;
  onAdminCreateChallenge: (payload: {
    title: string;
    description: string;
    cadence: 'Daily' | 'Weekly';
    category: EcoChallenge['category'];
    points: number;
    estimatedCo2SavedKg: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  onAdminCreateArticle: (payload: {
    title: string;
    category: string;
    excerpt: string;
    body: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function WorkspaceView({
  state,
  activePersona,
  activeRole,
  onSelectRole,
  onMarkNotificationsRead,
  onAdminReviewSubmission,
  onAdminUpdateReportStatus,
  onAdminApproveCampaign,
  onAdminToggleOrgVerify,
  onAdminToggleCampusFlag,
  onAdminCreateChallenge,
  onAdminCreateArticle,
}: WorkspaceViewProps) {
  const [workspaceMode, setWorkspaceMode] = useState<'user' | 'admin'>(
    activeRole === 'admin' ? 'admin' : 'user'
  );
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const [newChTitle, setNewChTitle] = useState('');
  const [newChDesc, setNewChDesc] = useState('');
  const [newChCadence, setNewChCadence] = useState<'Daily' | 'Weekly'>('Daily');
  const [newChCategory, setNewChCategory] = useState<EcoChallenge['category']>('Energy');
  const [newChPoints, setNewChPoints] = useState(60);

  const [newArtTitle, setNewArtTitle] = useState('');
  const [newArtCat, setNewArtCat] = useState('Climate Data');
  const [newArtExcerpt, setNewArtExcerpt] = useState('');

  const mySubmissions = useMemo(
    () => state.submissions.filter((s) => s.userId === activePersona.userId),
    [state.submissions, activePersona.userId]
  );
  const myCampaigns = useMemo(
    () => state.campaigns.filter((c) => c.participantIds.includes(activePersona.userId)),
    [state.campaigns, activePersona.userId]
  );
  const myReports = useMemo(
    () => state.reports.filter((r) => r.reporterId === activePersona.userId),
    [state.reports, activePersona.userId]
  );
  const myProgress = useMemo(
    () => state.academyProgress.filter((p) => p.userId === activePersona.userId),
    [state.academyProgress, activePersona.userId]
  );
  const myCarbon = useMemo(
    () => state.carbonHistory.filter((c) => c.userId === activePersona.userId),
    [state.carbonHistory, activePersona.userId]
  );
  const myNotifications = useMemo(
    () => state.notifications.filter((n) => n.userId === activePersona.userId),
    [state.notifications, activePersona.userId]
  );

  const handleRoleChange = (role: UserRole) => {
    onSelectRole(role);
    if (role === 'admin') {
      setWorkspaceMode('admin');
    } else if (workspaceMode === 'admin') {
      setWorkspaceMode('user');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#15803D]">
            Instant Role-Based Workspace
          </p>
          <h1 className="text-3xl font-bold text-[#0F2E1E] mt-1">
            User &amp; Admin Impact Dashboard
          </h1>
          <p className="text-sm text-[#4B5E53] mt-1">
            Switch between Guest, User, Volunteer, Organization, or Admin seamlessly to operate every permission tier.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#EAECE7] p-1 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setWorkspaceMode('user')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md cursor-pointer ${
              workspaceMode === 'user' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Personal Dashboard
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceMode('admin')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md cursor-pointer ${
              workspaceMode === 'admin' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Admin Console
          </button>
        </div>
      </div>

      <RoleSelectorBar
        personas={state.personas}
        activeRole={activeRole}
        onSelectRole={handleRoleChange}
      />

      {workspaceMode === 'user' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">My Verified Eco Score</div>
              <div
                data-testid="user-eco-score"
                className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1"
              >
                {activePersona.ecoScore} pts
              </div>
              <div className="text-xs text-[#15803D] mt-1">{activePersona.title}</div>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">Challenge Submissions</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                {mySubmissions.length}
              </div>
              <div className="text-xs text-[#4B5E53] mt-1">
                {mySubmissions.filter((s) => s.status === 'approved').length} verified ·{' '}
                {mySubmissions.filter((s) => s.status === 'pending').length} pending
              </div>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">Joined Campaigns</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                {myCampaigns.length}
              </div>
              <div className="text-xs text-[#4B5E53] mt-1">
                {myReports.length} issue reports filed
              </div>
            </div>

            <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
              <div className="text-xs text-[#4B5E53]">Academy Certificates</div>
              <div className="text-3xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                {myProgress.filter((p) => p.passed).length}
              </div>
              <div className="text-xs text-[#4B5E53] mt-1">
                {myCarbon.length} saved carbon logs
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2E1E]">My Challenge Evidence Log</h2>
                {mySubmissions.length === 0 ? (
                  <p className="text-sm text-[#4B5E53]">
                    No challenge submissions yet for {activePersona.name}. Visit Actions &amp; Map to submit evidence.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EAECE7]">
                    {mySubmissions.map((s) => (
                      <div key={s.id} className="py-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[#0F2E1E]">
                            {s.challengeTitle}
                          </div>
                          <p className="text-xs text-[#4B5E53] mt-0.5">{s.evidenceNote}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-semibold text-[#15803D]">
                            {s.status.toUpperCase()}
                          </div>
                          {s.pointsAwarded > 0 && (
                            <div className="text-xs font-mono text-[#0F2E1E]">
                              +{s.pointsAwarded} pts
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2E1E]">Joined Campaigns &amp; Reports</h2>
                {myCampaigns.length === 0 && myReports.length === 0 ? (
                  <p className="text-sm text-[#4B5E53]">
                    No joined campaigns or uploaded reports for this persona yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myCampaigns.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 bg-[#F8F7F2] border border-[#EAECE7] rounded-lg flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs text-[#4B5E53]">Campaign · {c.locationName}</div>
                          <div className="text-sm font-semibold text-[#0F2E1E]">{c.title}</div>
                        </div>
                        <span className="text-xs font-mono text-[#15803D]">
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {myReports.map((r) => (
                      <div
                        key={r.id}
                        className="p-3.5 bg-[#F8F7F2] border border-[#EAECE7] rounded-lg flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs text-[#4B5E53]">
                            Issue Report · {r.category}
                          </div>
                          <div className="text-sm font-semibold text-[#0F2E1E]">{r.title}</div>
                        </div>
                        <span className="text-xs font-mono text-[#0F2E1E]">
                          {r.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#0F2E1E] flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
                    Notifications
                  </h2>
                  {myNotifications.some((n) => !n.read) && (
                    <button
                      type="button"
                      onClick={onMarkNotificationsRead}
                      className="text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {myNotifications.length === 0 ? (
                  <p className="text-xs text-[#4B5E53]">No notifications for this role yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {myNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-lg border text-xs ${
                          n.read
                            ? 'bg-white border-[#EAECE7] text-[#4B5E53]'
                            : 'bg-[#F1F5F0] border-[#15803D]/30 text-[#0F2E1E]'
                        }`}
                      >
                        <div className="font-semibold">{n.title}</div>
                        <p className="mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2E1E]">Saved Carbon History</h2>
                {myCarbon.length === 0 ? (
                  <p className="text-xs text-[#4B5E53]">
                    No saved calculations yet. Save an estimate in the Carbon Calculator.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {myCarbon.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 bg-[#F8F7F2] border border-[#EAECE7] rounded-lg flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-[#0F2E1E]">
                            {rec.result.totalTonnesCo2e} tCO2e / yr
                          </div>
                          <div className="text-[#4B5E53]">
                            {new Date(rec.createdAt).toLocaleDateString()} · {rec.input.dietType}
                          </div>
                        </div>
                        <span className="font-mono text-[#15803D]">
                          {rec.result.deltaFromGlobalPct > 0 ? '+' : ''}
                          {rec.result.deltaFromGlobalPct}% avg
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {workspaceMode === 'admin' && (
        <>
          {activeRole !== 'admin' ? (
            <div className="bg-white border border-[#DDE3DD] rounded-xl p-8 text-center space-y-4">
              <ShieldAlert className="w-8 h-8 text-[#D97706] mx-auto" aria-hidden="true" />
              <h2 className="text-xl font-bold text-[#0F2E1E]">
                Admin Role Required for Moderation Console
              </h2>
              <p className="text-sm text-[#4B5E53] max-w-lg mx-auto">
                Server-side access control protects verification queues, campaign approvals, and
                audit logs. Switch to the Admin role in one click to operate the console.
              </p>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className="px-5 py-2.5 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] cursor-pointer"
              >
                Switch to Admin Role (Dr. Elena Vance)
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {adminMessage && (
                <div
                  role="status"
                  className="bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] rounded-xl px-4 py-3 text-xs font-medium"
                >
                  {adminMessage}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
                  <div className="text-xs text-[#4B5E53]">Pending Challenge Reviews</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                    {state.submissions.filter((s) => s.status === 'pending').length}
                  </div>
                </div>
                <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
                  <div className="text-xs text-[#4B5E53]">Open Issue Reports</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                    {state.reports.filter((r) => r.status !== 'resolved').length}
                  </div>
                </div>
                <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
                  <div className="text-xs text-[#4B5E53]">Campaigns Pending Approval</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                    {state.campaigns.filter((c) => c.status === 'pending_approval').length}
                  </div>
                </div>
                <div className="bg-white border border-[#DDE3DD] rounded-xl p-5">
                  <div className="text-xs text-[#4B5E53]">Recorded Audit Events</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-[#0F2E1E] mt-1">
                    {state.auditLogs.length}
                  </div>
                </div>
              </div>

              <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2E1E]">
                  Challenge Evidence Verification Queue
                </h2>
                <div className="divide-y divide-[#EAECE7]">
                  {state.submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-[#4B5E53]">
                          {sub.userName} ({sub.userRole}) · Status:{' '}
                          <span className="font-mono font-semibold text-[#0F2E1E]">
                            {sub.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[#0F2E1E]">{sub.challengeTitle}</div>
                        <p className="text-xs text-[#394B40]">{sub.evidenceNote}</p>
                      </div>

                      {sub.status === 'pending' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAdminReviewSubmission(sub.id, 'approved');
                              setAdminMessage(
                                res.ok
                                  ? `Approved ${sub.userName}'s challenge evidence.`
                                  : res.error || 'Failed to approve.'
                              );
                            }}
                            className="px-3.5 py-2 bg-[#15803D] text-white text-xs font-semibold rounded-lg hover:bg-[#166534] cursor-pointer"
                          >
                            Approve &amp; Award Points
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAdminReviewSubmission(sub.id, 'rejected');
                              setAdminMessage(
                                res.ok
                                  ? `Rejected ${sub.userName}'s submission.`
                                  : res.error || 'Failed to reject.'
                              );
                            }}
                            className="px-3.5 py-2 border border-[#DC2626] text-[#DC2626] text-xs font-semibold rounded-lg hover:bg-[#FEF2F2] cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          Reviewed by {sub.reviewedBy || 'Moderator'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F2E1E]">
                  Environmental Issue Report Verification &amp; Resolution
                </h2>
                <div className="space-y-4">
                  {state.reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-4 bg-[#F8F7F2] border border-[#EAECE7] rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-[#4B5E53]">
                          {rep.category} · {rep.locationName} · Current:{' '}
                          <span className="font-mono font-semibold text-[#0F2E1E]">
                            {rep.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[#0F2E1E]">{rep.title}</div>
                        <p className="text-xs text-[#394B40]">{rep.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <input
                          type="text"
                          value={resolutionNotes[rep.id] ?? rep.resolutionNote ?? ''}
                          onChange={(e) =>
                            setResolutionNotes((prev) => ({
                              ...prev,
                              [rep.id]: e.target.value,
                            }))
                          }
                          placeholder="Resolution / inspection note..."
                          className="border border-[#DDE3DD] bg-white rounded-lg px-2.5 py-1.5 text-xs w-52"
                        />
                        {(['under_review', 'verified', 'resolved'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={async () => {
                              const res = await onAdminUpdateReportStatus(
                                rep.id,
                                st,
                                resolutionNotes[rep.id]
                              );
                              setAdminMessage(
                                res.ok
                                  ? `Updated report "${rep.title}" to ${st.replace('_', ' ')}.`
                                  : res.error || 'Update failed.'
                              );
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                              rep.status === st
                                ? 'bg-[#0F2E1E] text-white'
                                : 'bg-white border border-[#DDE3DD] text-[#0F2E1E] hover:bg-[#EAECE7]'
                            }`}
                          >
                            {st.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                  <h2 className="text-lg font-bold text-[#0F2E1E]">Campaign Approvals</h2>
                  <div className="space-y-3">
                    {state.campaigns.map((camp) => (
                      <div
                        key={camp.id}
                        className="p-3.5 border border-[#EAECE7] rounded-lg flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#0F2E1E]">{camp.title}</div>
                          <div className="text-xs text-[#4B5E53]">
                            {camp.organizerName} · Status: {camp.status.replace('_', ' ')}
                          </div>
                        </div>
                        {camp.status === 'pending_approval' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAdminApproveCampaign(camp.id, 'active');
                              setAdminMessage(
                                res.ok
                                  ? `Approved campaign "${camp.title}".`
                                  : res.error || 'Approval failed.'
                              );
                            }}
                            className="px-3 py-1.5 bg-[#15803D] text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                          >
                            Approve Active
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAdminApproveCampaign(camp.id, 'completed');
                              setAdminMessage(
                                res.ok
                                  ? `Marked "${camp.title}" completed.`
                                  : res.error || 'Update failed.'
                              );
                            }}
                            className="px-3 py-1.5 border border-[#DDE3DD] text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
                  <h2 className="text-lg font-bold text-[#0F2E1E]">
                    Organizations &amp; Campus Moderation
                  </h2>
                  <div className="space-y-3">
                    {state.personas
                      .filter((p) => p.role !== 'guest')
                      .map((p) => (
                        <div
                          key={p.userId}
                          className="p-3 border border-[#EAECE7] rounded-lg flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#0F2E1E]">
                              {p.name} ({p.role})
                            </div>
                            <div className="text-[#4B5E53]">
                              {p.email} · {p.ecoScore} pts
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAdminToggleOrgVerify(p.userId);
                              setAdminMessage(
                                res.ok
                                  ? `Updated verification status for ${p.name}.`
                                  : res.error || 'Failed.'
                              );
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                              p.verifiedOrg
                                ? 'bg-[#DCFCE7] text-[#14532D]'
                                : 'border border-[#DDE3DD] text-[#394B40]'
                            }`}
                          >
                            {p.verifiedOrg ? 'Verified Partner' : 'Verify Partner'}
                          </button>
                        </div>
                      ))}

                    <div className="pt-2 border-t border-[#EAECE7] space-y-2">
                      <div className="text-xs font-semibold text-[#4B5E53]">
                        Campus Leaderboard Audit Flags
                      </div>
                      {state.campuses.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="text-[#0F2E1E] font-medium">{c.name}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAdminToggleCampusFlag(c.id);
                              setAdminMessage(
                                res.ok
                                  ? `Toggled leaderboard audit flag for ${c.name}.`
                                  : res.error || 'Failed.'
                              );
                            }}
                            className="px-2.5 py-1 border border-[#DDE3DD] rounded text-[#394B40] hover:bg-[#F8F7F2] cursor-pointer"
                          >
                            {c.flaggedForReview ? 'Clear Audit Flag' : 'Flag for Audit'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await onAdminCreateChallenge({
                      title: newChTitle,
                      description: newChDesc,
                      cadence: newChCadence,
                      category: newChCategory,
                      points: newChPoints,
                      estimatedCo2SavedKg: 2.5,
                    });
                    if (res.ok) {
                      setNewChTitle('');
                      setNewChDesc('');
                      setAdminMessage('Published new Eco Challenge.');
                    } else {
                      setAdminMessage(res.error || 'Could not create challenge.');
                    }
                  }}
                  className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-3"
                >
                  <h2 className="text-lg font-bold text-[#0F2E1E]">Publish New Eco Challenge</h2>
                  <input
                    type="text"
                    required
                    value={newChTitle}
                    onChange={(e) => setNewChTitle(e.target.value)}
                    placeholder="Challenge title"
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={newChCadence}
                      onChange={(e) => setNewChCadence(e.target.value as 'Daily' | 'Weekly')}
                      className="border border-[#DDE3DD] rounded-lg px-2 py-2 text-xs bg-white"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                    <select
                      value={newChCategory}
                      onChange={(e) => setNewChCategory(e.target.value as EcoChallenge['category'])}
                      className="border border-[#DDE3DD] rounded-lg px-2 py-2 text-xs bg-white"
                    >
                      <option value="Energy">Energy</option>
                      <option value="Waste">Waste</option>
                      <option value="Mobility">Mobility</option>
                      <option value="Biodiversity">Biodiversity</option>
                      <option value="Water">Water</option>
                    </select>
                    <input
                      type="number"
                      min={10}
                      max={500}
                      value={newChPoints}
                      onChange={(e) => setNewChPoints(Number(e.target.value))}
                      className="border border-[#DDE3DD] rounded-lg px-2 py-2 text-xs font-mono"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={newChDesc}
                    onChange={(e) => setNewChDesc(e.target.value)}
                    placeholder="Challenge instructions and verification goal..."
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F2E1E] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Create Challenge
                  </button>
                </form>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await onAdminCreateArticle({
                      title: newArtTitle,
                      category: newArtCat,
                      excerpt: newArtExcerpt,
                      body: newArtExcerpt,
                    });
                    if (res.ok) {
                      setNewArtTitle('');
                      setNewArtExcerpt('');
                      setAdminMessage('Published new research dispatch.');
                    } else {
                      setAdminMessage(res.error || 'Could not publish article.');
                    }
                  }}
                  className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-3"
                >
                  <h2 className="text-lg font-bold text-[#0F2E1E]">Publish Research Dispatch</h2>
                  <input
                    type="text"
                    required
                    value={newArtTitle}
                    onChange={(e) => setNewArtTitle(e.target.value)}
                    placeholder="Article headline"
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={newArtCat}
                    onChange={(e) => setNewArtCat(e.target.value)}
                    placeholder="Topic category"
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    required
                    value={newArtExcerpt}
                    onChange={(e) => setNewArtExcerpt(e.target.value)}
                    placeholder="Summary & key environmental takeaways..."
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F2E1E] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Publish Article
                  </button>
                </form>
              </div>

              <section className="bg-white border border-[#DDE3DD] rounded-xl overflow-hidden">
                <div className="p-5 border-b border-[#EAECE7] flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#0F2E1E]">Platform Audit Logs</h2>
                  <span className="text-xs font-mono text-[#4B5E53]">
                    {state.auditLogs.length} events
                  </span>
                </div>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F7F2] text-[#4B5E53] border-b border-[#EAECE7]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Timestamp (UTC)</th>
                        <th className="py-2.5 px-4 font-semibold">Actor</th>
                        <th className="py-2.5 px-4 font-semibold">Action</th>
                        <th className="py-2.5 px-4 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAECE7]">
                      {state.auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-[#4B5E53] whitespace-nowrap">
                            {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-[#0F2E1E]">
                            {log.actorName} ({log.actorRole})
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[#15803D]">{log.action}</td>
                          <td className="py-2.5 px-4 text-[#394B40]">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
