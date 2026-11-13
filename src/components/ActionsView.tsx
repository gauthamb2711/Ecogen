import { useMemo, useState } from 'react';
import { LocateFixed, MapPin, Upload } from 'lucide-react';
import { canPerformAction, validateEvidenceFile } from '../lib/ecogenLogic';
import type {
  CommunityCampaign,
  EcogenAppState,
  IssueReport,
  RolePersona,
  UserRole,
} from '../types/ecogen';
import { RealImpactMap, type MapPinItem } from './RealImpactMap';
import { ResilientImage } from './ResilientImage';

interface ActionsViewProps {
  state: EcogenAppState;
  activePersona: RolePersona;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  initialTab?: string;
  initialFocusId?: string;
  onSubmitChallenge: (
    challengeId: string,
    evidenceNote: string,
    photoName?: string,
    photoDataUrl?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onToggleJoinCampaign: (campaignId: string) => Promise<{ ok: boolean; error?: string }>;
  onCreateCampaign: (payload: {
    title: string;
    category: CommunityCampaign['category'];
    locationName: string;
    lat: number;
    lng: number;
    description: string;
    targetParticipants: number;
    impactMetricLabel: string;
    targetImpactValue: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  onAddCampaignPhoto: (
    campaignId: string,
    caption: string,
    imageUrl: string,
    impactDelta: number
  ) => Promise<{ ok: boolean; error?: string }>;
  onSubmitReport: (payload: {
    title: string;
    category: IssueReport['category'];
    severity: IssueReport['severity'];
    locationName: string;
    lat: number;
    lng: number;
    description: string;
    photoName?: string;
    photoDataUrl?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

const LOCATION_PRESETS = [
  { name: 'San Francisco Bay Wetlands, USA', lat: 37.77, lng: -122.41 },
  { name: 'Thamesmead Marsh, London, UK', lat: 51.5, lng: 0.12 },
  { name: 'Vrishabhavathi Basin, Bengaluru, India', lat: 12.97, lng: 77.59 },
  { name: 'Nairobi River Corridor, Kenya', lat: -1.29, lng: 36.82 },
  { name: 'Tietê Watershed, São Paulo, Brazil', lat: -23.55, lng: -46.63 },
];

export function ActionsView({
  state,
  activePersona,
  activeRole,
  onSelectRole,
  initialTab,
  initialFocusId,
  onSubmitChallenge,
  onToggleJoinCampaign,
  onCreateCampaign,
  onAddCampaignPhoto,
  onSubmitReport,
}: ActionsViewProps) {
  const [tab, setTab] = useState<'challenges' | 'campaigns' | 'map'>(
    initialTab === 'campaigns' ? 'campaigns' : initialTab === 'map' ? 'map' : 'challenges'
  );

  // Challenges state
  const [cadenceFilter, setCadenceFilter] = useState<'All' | 'Daily' | 'Weekly'>('All');
  const [activeChallengeId, setActiveChallengeId] = useState<string>(
    initialFocusId && state.challenges.some((c) => c.id === initialFocusId)
      ? initialFocusId
      : state.challenges[0]?.id || ''
  );
  const [evidenceNote, setEvidenceNote] = useState('');
  const [challengePhoto, setChallengePhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);

  // Campaigns state
  const [campaignCategory, setCampaignCategory] = useState<string>('All');
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campTitle, setCampTitle] = useState('');
  const [campCategory, setCampCategory] = useState<CommunityCampaign['category']>('Reforestation');
  const [campLocation, setCampLocation] = useState(LOCATION_PRESETS[0].name);
  const [campLat, setCampLat] = useState(LOCATION_PRESETS[0].lat);
  const [campLng, setCampLng] = useState(LOCATION_PRESETS[0].lng);
  const [campDesc, setCampDesc] = useState('');
  const [campTargetPart, setCampTargetPart] = useState(80);
  const [campMetricLabel, setCampMetricLabel] = useState('Trees or units restored');
  const [campTargetVal, setCampTargetVal] = useState(500);
  const [campFeedback, setCampFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photoLogTargetId, setPhotoLogTargetId] = useState<string | null>(null);
  const [photoLogCaption, setPhotoLogCaption] = useState('');
  const [photoLogImpact, setPhotoLogImpact] = useState(10);

  // Map & Reports state
  const [mapFilter, setMapFilter] = useState<'all' | 'campaigns' | 'reports' | 'verified'>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [mapFocusCoords, setMapFocusCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [repTitle, setRepTitle] = useState('');
  const [repCategory, setRepCategory] = useState<IssueReport['category']>('Water Contamination');
  const [repSeverity, setRepSeverity] = useState<IssueReport['severity']>('High');
  const [repLocation, setRepLocation] = useState(LOCATION_PRESETS[2].name);
  const [repLat, setRepLat] = useState(LOCATION_PRESETS[2].lat);
  const [repLng, setRepLng] = useState(LOCATION_PRESETS[2].lng);
  const [repDesc, setRepDesc] = useState('');
  const [repPhoto, setRepPhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [repFeedback, setRepFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [repSubmitting, setRepSubmitting] = useState(false);

  const filteredChallenges = useMemo(() => {
    if (cadenceFilter === 'All') return state.challenges;
    return state.challenges.filter((c) => c.cadence === cadenceFilter);
  }, [state.challenges, cadenceFilter]);

  const filteredCampaigns = useMemo(() => {
    if (campaignCategory === 'All') return state.campaigns;
    return state.campaigns.filter((c) => c.category === campaignCategory);
  }, [state.campaigns, campaignCategory]);

  const handleFileRead = (
    file: File | undefined,
    onDone: (res: { name: string; dataUrl: string }) => void,
    onErr: (msg: string) => void
  ) => {
    if (!file) return;
    const check = validateEvidenceFile({ name: file.name, type: file.type, size: file.size });
    if (!check.valid) {
      onErr(check.error || 'Invalid file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onDone({ name: file.name, dataUrl: String(reader.result || '') });
    };
    reader.readAsDataURL(file);
  };

  const submitChallengeHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChallengeId) return;
    setChallengeSubmitting(true);
    setChallengeFeedback(null);
    const res = await onSubmitChallenge(
      activeChallengeId,
      evidenceNote,
      challengePhoto?.name,
      challengePhoto?.dataUrl
    );
    setChallengeSubmitting(false);
    if (res.ok) {
      setEvidenceNote('');
      setChallengePhoto(null);
      setChallengeFeedback({
        type: 'success',
        text: 'Evidence submitted for Admin verification. Track status in your Workspace.',
      });
    } else {
      setChallengeFeedback({
        type: 'error',
        text: res.error || 'Submission failed.',
      });
    }
  };

  const createCampaignHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampFeedback(null);
    const res = await onCreateCampaign({
      title: campTitle,
      category: campCategory,
      locationName: campLocation,
      lat: campLat,
      lng: campLng,
      description: campDesc,
      targetParticipants: campTargetPart,
      impactMetricLabel: campMetricLabel,
      targetImpactValue: campTargetVal,
    });
    if (res.ok) {
      setCampTitle('');
      setCampDesc('');
      setShowCreateCampaign(false);
      setCampFeedback({
        type: 'success',
        text: 'Campaign created and added to the community directory.',
      });
    } else {
      setCampFeedback({
        type: 'error',
        text: res.error || 'Unable to create campaign.',
      });
    }
  };

  const submitReportHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepSubmitting(true);
    setRepFeedback(null);
    const res = await onSubmitReport({
      title: repTitle,
      category: repCategory,
      severity: repSeverity,
      locationName: repLocation,
      lat: repLat,
      lng: repLng,
      description: repDesc,
      photoName: repPhoto?.name,
      photoDataUrl: repPhoto?.dataUrl,
    });
    setRepSubmitting(false);
    if (res.ok) {
      setRepTitle('');
      setRepDesc('');
      setRepPhoto(null);
      setRepFeedback({
        type: 'success',
        text: 'Environmental issue report logged and pinned on the Impact Map.',
      });
    } else {
      setRepFeedback({
        type: 'error',
        text: res.error || 'Report submission failed.',
      });
    }
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('Browser geolocation is unavailable; click the map or enter coordinates.');
      return;
    }
    setGeoStatus('Locating device coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        setRepLat(lat);
        setRepLng(lng);
        setRepLocation(`GPS Pin (${lat}, ${lng})`);
        setMapFocusCoords({ lat, lng });
        setGeoStatus(`Locked GPS coordinates (${lat}, ${lng}).`);
      },
      () => {
        setGeoStatus('Location permission denied; click anywhere on the map to pick coordinates.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const mapPins = useMemo(() => {
    const pins: MapPinItem[] = [];

    if (mapFilter === 'all' || mapFilter === 'campaigns' || mapFilter === 'verified') {
      state.campaigns.forEach((c) => {
        const isVer = c.status === 'active' || c.status === 'completed';
        if (mapFilter === 'verified' && !isVer) return;
        pins.push({
          id: c.id,
          kind: 'campaign',
          title: c.title,
          subtitle: `${c.category} · ${c.locationName}`,
          status: c.status,
          lat: c.lat,
          lng: c.lng,
          verified: isVer,
        });
      });
    }

    if (mapFilter === 'all' || mapFilter === 'reports' || mapFilter === 'verified') {
      state.reports.forEach((r) => {
        const isVer = r.status === 'verified' || r.status === 'resolved';
        if (mapFilter === 'verified' && !isVer) return;
        pins.push({
          id: r.id,
          kind: 'report',
          title: r.title,
          subtitle: `${r.category} · ${r.locationName}`,
          status: r.status,
          lat: r.lat,
          lng: r.lng,
          verified: isVer,
        });
      });
    }

    return pins;
  }, [state.campaigns, state.reports, mapFilter]);

  const activePin = mapPins.find((p) => p.id === selectedPinId) ?? mapPins[0] ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#DDE3DD] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#15803D]">
            Verified Community Participation · Role: {activePersona.name}
          </p>
          <h1 className="text-3xl font-bold text-[#0F2E1E] mt-1">
            Challenges, Campaigns &amp; Issue Impact Map
          </h1>
          <p className="text-sm text-[#4B5E53] mt-1">
            Complete verified eco missions, join or launch field campaigns, and log local ecological reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#EAECE7] p-1 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('challenges')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'challenges' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Eco Challenges
          </button>
          <button
            type="button"
            onClick={() => setTab('campaigns')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'campaigns' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Community Campaigns
          </button>
          <button
            type="button"
            onClick={() => setTab('map')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'map' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Impact Map &amp; Reports
          </button>
        </div>
      </div>

      {/* TAB 1: ECO CHALLENGES */}
      {tab === 'challenges' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#0F2E1E]">Active Missions</h2>
              <div className="flex items-center gap-1 bg-[#EAECE7] p-1 rounded-lg">
                {(['All', 'Daily', 'Weekly'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCadenceFilter(c)}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      cadenceFilter === c ? 'bg-white text-[#0F2E1E] shadow-xs' : 'text-[#4B5E53]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredChallenges.map((ch) => {
                const userSub = state.submissions.find(
                  (s) => s.challengeId === ch.id && s.userId === activePersona.userId
                );
                const isSelected = activeChallengeId === ch.id;
                return (
                  <div
                    key={ch.id}
                    className={`bg-white rounded-xl p-5 border transition-colors ${
                      isSelected ? 'border-[#0F2E1E] ring-2 ring-[#15803D]/20' : 'border-[#DDE3DD]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="text-xs text-[#4B5E53]">
                          {ch.cadence} · {ch.category} · +{ch.points} pts · ~{ch.estimatedCo2SavedKg} kgCO2e
                        </div>
                        <h3 className="text-base font-bold text-[#0F2E1E]">{ch.title}</h3>
                        <p className="text-sm text-[#4B5E53]">{ch.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {userSub && (
                          <span className="text-xs font-mono font-semibold text-[#15803D]">
                            Status: {userSub.status.toUpperCase()}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChallengeId(ch.id);
                            setChallengeFeedback(null);
                          }}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                            isSelected
                              ? 'bg-[#0F2E1E] text-[#F8F7F2]'
                              : 'border border-[#0F2E1E] text-[#0F2E1E] hover:bg-[#F8F7F2]'
                          }`}
                        >
                          {isSelected ? 'Selected for Evidence' : 'Select Mission'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Submission Panel */}
          {(() => {
            const selectedSubmission = state.submissions.find(
              (s) => s.challengeId === activeChallengeId && s.userId === activePersona.userId
            );
            const isLockedDuplicate = Boolean(
              selectedSubmission && selectedSubmission.status !== 'rejected'
            );

            return (
              <div className="lg:col-span-5 bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0F2E1E]">Submit Challenge Evidence</h2>
                  <p className="text-xs text-[#4B5E53] mt-1">
                    {state.challenges.find((c) => c.id === activeChallengeId)?.verificationHint}
                  </p>
                </div>

                {!canPerformAction(activeRole, 'submit_challenge') ? (
                  <div className="bg-[#F8F7F2] border border-[#DDE3DD] rounded-lg p-4 space-y-3 text-sm">
                    <p className="text-[#394B40]">
                      You are currently browsing as <strong>Guest</strong>. Choose a member role to submit challenge evidence and earn verified points.
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectRole('user')}
                      className="px-4 py-2 bg-[#0F2E1E] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Switch to User Role (Maya Lin)
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitChallengeHandler} className="space-y-4">
                    <div>
                      <label htmlFor="challenge-select" className="block text-xs font-medium text-[#394B40] mb-1">
                        Selected Challenge
                      </label>
                      <select
                        id="challenge-select"
                        value={activeChallengeId}
                        onChange={(e) => {
                          setActiveChallengeId(e.target.value);
                          setChallengeFeedback(null);
                        }}
                        className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        {state.challenges.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.title} (+{ch.points} pts)
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedSubmission && (
                      <div
                        role="status"
                        className={`p-3 rounded-lg text-xs border ${
                          selectedSubmission.status === 'approved'
                            ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#14532D]'
                            : selectedSubmission.status === 'pending'
                              ? 'bg-[#FEF9C3] border-[#FDE047] text-[#713F12]'
                              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                        }`}
                      >
                        {selectedSubmission.status === 'approved' && (
                          <>
                            <strong>Verified &amp; Points Awarded:</strong> You already completed this mission
                            (+{selectedSubmission.pointsAwarded} pts).
                          </>
                        )}
                        {selectedSubmission.status === 'pending' && (
                          <>
                            <strong>Pending Admin Review:</strong> Your evidence is queued for moderator verification.
                            Select another mission to log new evidence.
                          </>
                        )}
                        {selectedSubmission.status === 'rejected' && (
                          <>
                            <strong>Revision Requested:</strong> Your previous submission was rejected. Update your evidence
                            and re-submit below.
                          </>
                        )}
                      </div>
                    )}

                    <div>
                      <label htmlFor="challenge-evidence-note" className="block text-xs font-medium text-[#394B40] mb-1">
                        Action Evidence Description
                      </label>
                      <textarea
                        id="challenge-evidence-note"
                        rows={3}
                        required
                        minLength={8}
                        disabled={isLockedDuplicate}
                        value={evidenceNote}
                        onChange={(e) => setEvidenceNote(e.target.value)}
                        placeholder="Describe what you completed, metrics saved, or location..."
                        className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm disabled:bg-[#F8F7F2] disabled:text-[#5B6D62]"
                      />
                    </div>

                    <div>
                      <label htmlFor="challenge-photo-input" className="block text-xs font-medium text-[#394B40] mb-1">
                        Optional Supporting Photograph (JPEG/PNG/WebP, max 5 MB)
                      </label>
                      <input
                        id="challenge-photo-input"
                        type="file"
                        disabled={isLockedDuplicate}
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          handleFileRead(
                            e.target.files?.[0],
                            (res) => setChallengePhoto(res),
                            (err) => setChallengeFeedback({ type: 'error', text: err })
                          )
                        }
                        className="w-full text-xs text-[#4B5E53] disabled:opacity-50"
                      />
                      {challengePhoto && (
                        <p className="text-xs text-[#15803D] mt-1">
                          Attached: {challengePhoto.name}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={challengeSubmitting || isLockedDuplicate}
                      className="w-full py-2.5 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {challengeSubmitting
                        ? 'Submitting...'
                        : isLockedDuplicate
                          ? 'Already Submitted'
                          : selectedSubmission?.status === 'rejected'
                            ? 'Re-submit Evidence'
                            : 'Submit Evidence for Review'}
                    </button>
                  </form>
                )}

                {challengeFeedback && (
                  <div
                    role="status"
                    className={`p-3 rounded-lg text-xs ${
                      challengeFeedback.type === 'success'
                        ? 'bg-[#DCFCE7] text-[#14532D]'
                        : 'bg-[#FEF2F2] text-[#991B1B]'
                    }`}
                  >
                    {challengeFeedback.text}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: COMMUNITY CAMPAIGNS */}
      {tab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5 bg-[#EAECE7] p-1 rounded-lg">
              {['All', 'Reforestation', 'Clean Water', 'Clean Energy', 'Biodiversity', 'Zero Waste'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCampaignCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                    campaignCategory === cat ? 'bg-white text-[#0F2E1E]' : 'text-[#4B5E53]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {canPerformAction(activeRole, 'create_campaign') ? (
              <button
                type="button"
                onClick={() => setShowCreateCampaign((prev) => !prev)}
                className="px-4 py-2 bg-[#0F2E1E] text-[#F8F7F2] text-xs font-semibold rounded-lg hover:bg-[#17422B] whitespace-nowrap cursor-pointer"
              >
                {showCreateCampaign ? 'Close Campaign Form' : 'Launch New Campaign'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectRole('volunteer')}
                className="px-4 py-2 border border-[#0F2E1E] text-[#0F2E1E] text-xs font-semibold rounded-lg hover:bg-white whitespace-nowrap cursor-pointer"
              >
                Switch to Volunteer/Org to Launch Campaign
              </button>
            )}
          </div>

          {campFeedback && (
            <div
              role="status"
              className={`p-3.5 rounded-xl text-xs font-medium ${
                campFeedback.type === 'success'
                  ? 'bg-[#DCFCE7] text-[#14532D]'
                  : 'bg-[#FEF2F2] text-[#991B1B]'
              }`}
            >
              {campFeedback.text}
            </div>
          )}

          {showCreateCampaign && (
            <form
              onSubmit={createCampaignHandler}
              className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-[#0F2E1E]">Create Community Campaign</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="camp-title" className="block text-xs font-medium text-[#394B40] mb-1">
                    Campaign Title
                  </label>
                  <input
                    id="camp-title"
                    type="text"
                    required
                    value={campTitle}
                    onChange={(e) => setCampTitle(e.target.value)}
                    placeholder="e.g. Riverbend Riparian Replanting"
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="camp-cat" className="block text-xs font-medium text-[#394B40] mb-1">
                    Category
                  </label>
                  <select
                    id="camp-cat"
                    value={campCategory}
                    onChange={(e) => setCampCategory(e.target.value as CommunityCampaign['category'])}
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="Reforestation">Reforestation</option>
                    <option value="Clean Water">Clean Water</option>
                    <option value="Clean Energy">Clean Energy</option>
                    <option value="Biodiversity">Biodiversity</option>
                    <option value="Zero Waste">Zero Waste</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="camp-loc-preset" className="block text-xs font-medium text-[#394B40] mb-1">
                    Location Preset
                  </label>
                  <select
                    id="camp-loc-preset"
                    value={campLocation}
                    onChange={(e) => {
                      const preset = LOCATION_PRESETS.find((p) => p.name === e.target.value);
                      setCampLocation(e.target.value);
                      if (preset) {
                        setCampLat(preset.lat);
                        setCampLng(preset.lng);
                      }
                    }}
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {LOCATION_PRESETS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="camp-metric" className="block text-xs font-medium text-[#394B40] mb-1">
                    Impact Metric Label
                  </label>
                  <input
                    id="camp-metric"
                    type="text"
                    required
                    value={campMetricLabel}
                    onChange={(e) => setCampMetricLabel(e.target.value)}
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="camp-target-val" className="block text-xs font-medium text-[#394B40] mb-1">
                    Target Impact Goal
                  </label>
                  <input
                    id="camp-target-val"
                    type="number"
                    min={10}
                    value={campTargetVal}
                    onChange={(e) => setCampTargetVal(Number(e.target.value))}
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="camp-target-part" className="block text-xs font-medium text-[#394B40] mb-1">
                    Target Volunteers
                  </label>
                  <input
                    id="camp-target-part"
                    type="number"
                    min={10}
                    value={campTargetPart}
                    onChange={(e) => setCampTargetPart(Number(e.target.value))}
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="camp-desc" className="block text-xs font-medium text-[#394B40] mb-1">
                  Campaign Objective &amp; Field Plan
                </label>
                <textarea
                  id="camp-desc"
                  rows={2}
                  required
                  minLength={12}
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  placeholder="Outline field methodology, safety guidelines, and measurable targets..."
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0F2E1E] text-[#F8F7F2] text-xs font-semibold rounded-lg hover:bg-[#17422B] cursor-pointer"
              >
                Publish Campaign
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCampaigns.map((camp) => {
              const joined = camp.participantIds.includes(activePersona.userId);
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
                    <div className="h-48 overflow-hidden">
                      <ResilientImage src={camp.imageUrl} alt={camp.title} />
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="text-xs text-[#4B5E53]">
                        {camp.category} · {camp.locationName} · Status: {camp.status.replace('_', ' ')}
                      </div>
                      <h3 className="text-xl font-bold text-[#0F2E1E]">{camp.title}</h3>
                      <p className="text-sm text-[#4B5E53] leading-relaxed">{camp.description}</p>
                      <div className="text-xs text-[#394B40]">
                        Lead: {camp.organizerName} · {camp.participantIds.length} / {camp.targetParticipants} participants
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono tabular-nums text-[#0F2E1E]">
                        <span>{camp.impactMetricLabel}</span>
                        <span>
                          {camp.verifiedImpactValue.toLocaleString()} /{' '}
                          {camp.targetImpactValue.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-[#EAECE7] rounded-full overflow-hidden">
                        <div className="h-full bg-[#15803D]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await onToggleJoinCampaign(camp.id);
                          if (!res.ok) {
                            setCampFeedback({ type: 'error', text: res.error || 'Action failed.' });
                          } else {
                            setCampFeedback({
                              type: 'success',
                              text: joined
                                ? `Left "${camp.title}".`
                                : `Joined "${camp.title}" (+20 Eco Points).`,
                            });
                          }
                        }}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg cursor-pointer ${
                          joined
                            ? 'bg-[#EAECE7] text-[#0F2E1E] hover:bg-[#DDE3DD]'
                            : 'bg-[#0F2E1E] text-[#F8F7F2] hover:bg-[#17422B]'
                        }`}
                      >
                        {joined ? 'Joined (Leave)' : 'Join Campaign'}
                      </button>

                      {canPerformAction(activeRole, 'join_campaign') && (
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoLogTargetId((prev) => (prev === camp.id ? null : camp.id))
                          }
                          className="py-2 px-3 text-xs font-semibold border border-[#DDE3DD] text-[#0F2E1E] rounded-lg hover:bg-[#F8F7F2] cursor-pointer"
                        >
                          Log Activity ({camp.photos.length})
                        </button>
                      )}
                    </div>

                    {photoLogTargetId === camp.id && (
                      <div className="p-3 bg-[#F8F7F2] border border-[#EAECE7] rounded-lg space-y-2.5">
                        <input
                          type="text"
                          value={photoLogCaption}
                          onChange={(e) => setPhotoLogCaption(e.target.value)}
                          placeholder="Activity update caption..."
                          className="w-full border border-[#DDE3DD] rounded-md px-2.5 py-1.5 text-xs bg-white"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-[#4B5E53]">
                            Impact added:
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={photoLogImpact}
                              onChange={(e) => setPhotoLogImpact(Number(e.target.value))}
                              className="ml-2 w-16 border border-[#DDE3DD] rounded px-2 py-1 text-xs font-mono bg-white"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await onAddCampaignPhoto(
                                camp.id,
                                photoLogCaption,
                                camp.imageUrl,
                                photoLogImpact
                              );
                              if (res.ok) {
                                setPhotoLogCaption('');
                                setPhotoLogTargetId(null);
                                setCampFeedback({
                                  type: 'success',
                                  text: 'Campaign activity logged.',
                                });
                              } else {
                                setCampFeedback({
                                  type: 'error',
                                  text: res.error || 'Could not log activity.',
                                });
                              }
                            }}
                            className="ml-auto px-3 py-1.5 bg-[#15803D] text-white text-xs font-semibold rounded-md cursor-pointer"
                          >
                            Post Update
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ENVIRONMENTAL IMPACT MAP & ISSUE REPORTING */}
      {tab === 'map' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Interactive Impact Map */}
            <section className="lg:col-span-7 bg-white border border-[#DDE3DD] rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0F2E1E]">
                    Global Environmental Impact Map
                  </h2>
                  <p className="text-xs text-[#4B5E53]">
                    Click any marker to inspect details, or click anywhere on the map to set report coordinates.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 bg-[#EAECE7] p-1 rounded-lg">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'campaigns', label: 'Campaigns' },
                      { id: 'reports', label: 'Issues' },
                      { id: 'verified', label: 'Verified' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMapFilter(f.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer ${
                        mapFilter === f.id ? 'bg-white text-[#0F2E1E]' : 'text-[#4B5E53]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <RealImpactMap
                pins={mapPins}
                selectedPinId={activePin?.id ?? null}
                onSelectPin={(id) => {
                  setSelectedPinId(id);
                  const found = mapPins.find((p) => p.id === id);
                  if (found) {
                    setMapFocusCoords({ lat: found.lat, lng: found.lng });
                  }
                }}
                draftReportCoords={{ lat: repLat, lng: repLng }}
                onPickReportCoords={(lat, lng) => {
                  setRepLat(lat);
                  setRepLng(lng);
                  setRepLocation(`Map Pin (${lat}, ${lng})`);
                  setGeoStatus(`Selected coordinates from map: ${lat}, ${lng}`);
                }}
                focusCoords={mapFocusCoords}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4B5E53]">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#A3E635] border border-[#0F2E1E]" />
                    Community Campaign
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#0F2E1E]" />
                    Issue Report
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444] border border-[#991B1B]" />
                    Draft Report Pin
                  </span>
                </div>
                <span className="font-mono tabular-nums">{mapPins.length} pins visible</span>
              </div>

              {activePin && (
                <div className="p-4 bg-[#F8F7F2] border border-[#DDE3DD] rounded-xl flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-[#4B5E53]">
                      {activePin.kind === 'campaign' ? 'Campaign' : 'Issue Report'} · Status:{' '}
                      {activePin.status.replace('_', ' ')}
                    </div>
                    <h3 className="text-sm font-bold text-[#0F2E1E]">{activePin.title}</h3>
                    <div className="text-xs text-[#4B5E53] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                      {activePin.subtitle} ({activePin.lat.toFixed(2)}, {activePin.lng.toFixed(2)})
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Report Environmental Issue Form */}
            <section className="lg:col-span-5 bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0F2E1E]">Report an Environmental Issue</h2>
              <p className="text-xs text-[#4B5E53]">
                Document local air, water, dumping, or deforestation incidents with coordinates and photo proof.
              </p>

              {!canPerformAction(activeRole, 'submit_report') ? (
                <div className="p-4 bg-[#F8F7F2] border border-[#DDE3DD] rounded-lg space-y-3 text-xs">
                  <p className="text-[#394B40]">
                    Switch out of Guest mode to submit geotagged issue reports.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectRole('user')}
                    className="px-3.5 py-2 bg-[#0F2E1E] text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Switch to User Role
                  </button>
                </div>
              ) : (
                <form onSubmit={submitReportHandler} className="space-y-3.5">
                  <div>
                    <label htmlFor="rep-title" className="block text-xs font-medium text-[#394B40] mb-1">
                      Issue Summary Title
                    </label>
                    <input
                      id="rep-title"
                      type="text"
                      required
                      value={repTitle}
                      onChange={(e) => setRepTitle(e.target.value)}
                      placeholder="e.g. Storm drain oil sheen near marina"
                      className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rep-category" className="block text-xs font-medium text-[#394B40] mb-1">
                        Category
                      </label>
                      <select
                        id="rep-category"
                        value={repCategory}
                        onChange={(e) => setRepCategory(e.target.value as IssueReport['category'])}
                        className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="Water Contamination">Water Contamination</option>
                        <option value="Air Quality">Air Quality</option>
                        <option value="Illegal Dumping">Illegal Dumping</option>
                        <option value="Deforestation">Deforestation</option>
                        <option value="Habitat Threat">Habitat Threat</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="rep-severity" className="block text-xs font-medium text-[#394B40] mb-1">
                        Severity
                      </label>
                      <select
                        id="rep-severity"
                        value={repSeverity}
                        onChange={(e) => setRepSeverity(e.target.value as IssueReport['severity'])}
                        className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="rep-location-preset" className="block text-xs font-medium text-[#394B40]">
                        Quick Region Preset or Pick on Map
                      </label>
                      <button
                        type="button"
                        onClick={handleUseMyLocation}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D] hover:underline cursor-pointer"
                      >
                        <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
                        Use My GPS
                      </button>
                    </div>
                    <select
                      id="rep-location-preset"
                      value={
                        LOCATION_PRESETS.some((p) => p.name === repLocation) ? repLocation : ''
                      }
                      onChange={(e) => {
                        const preset = LOCATION_PRESETS.find((p) => p.name === e.target.value);
                        if (preset) {
                          setRepLocation(preset.name);
                          setRepLat(preset.lat);
                          setRepLng(preset.lng);
                          setMapFocusCoords({ lat: preset.lat, lng: preset.lng });
                          setGeoStatus(null);
                        }
                      }}
                      className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Custom Map / GPS Location</option>
                      {LOCATION_PRESETS.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <div>
                      <label htmlFor="rep-location" className="block text-xs font-medium text-[#394B40] mb-1">
                        Location Name / Landmark
                      </label>
                      <input
                        id="rep-location"
                        type="text"
                        required
                        value={repLocation}
                        onChange={(e) => setRepLocation(e.target.value)}
                        placeholder="Click map or enter street / watershed name"
                        className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="rep-lat" className="block text-xs font-medium text-[#394B40] mb-1">
                          Latitude
                        </label>
                        <input
                          id="rep-lat"
                          type="number"
                          step="0.0001"
                          min={-90}
                          max={90}
                          required
                          value={repLat}
                          onChange={(e) => setRepLat(Number(e.target.value))}
                          className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-xs font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label htmlFor="rep-lng" className="block text-xs font-medium text-[#394B40] mb-1">
                          Longitude
                        </label>
                        <input
                          id="rep-lng"
                          type="number"
                          step="0.0001"
                          min={-180}
                          max={180}
                          required
                          value={repLng}
                          onChange={(e) => setRepLng(Number(e.target.value))}
                          className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-xs font-mono tabular-nums"
                        />
                      </div>
                    </div>

                    {geoStatus && (
                      <p className="text-[11px] text-[#15803D]">{geoStatus}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="rep-desc" className="block text-xs font-medium text-[#394B40] mb-1">
                      Field Observation Description
                    </label>
                    <textarea
                      id="rep-desc"
                      rows={3}
                      required
                      minLength={10}
                      value={repDesc}
                      onChange={(e) => setRepDesc(e.target.value)}
                      placeholder="Describe observed impact, extent, and nearby landmarks..."
                      className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="rep-photo"
                      className="inline-flex items-center gap-2 text-xs font-medium text-[#394B40] mb-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      Upload Evidence Photograph (JPEG/PNG/WebP, max 5 MB)
                    </label>
                    <input
                      id="rep-photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        handleFileRead(
                          e.target.files?.[0],
                          (res) => setRepPhoto(res),
                          (err) => setRepFeedback({ type: 'error', text: err })
                        )
                      }
                      className="w-full text-xs text-[#4B5E53]"
                    />
                    {repPhoto && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={repPhoto.dataUrl}
                          alt="Uploaded report preview"
                          className="w-16 h-12 object-cover rounded border border-[#DDE3DD]"
                        />
                        <span className="text-xs text-[#15803D]">{repPhoto.name}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={repSubmitting}
                    className="w-full py-2.5 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] disabled:opacity-60 cursor-pointer"
                  >
                    {repSubmitting ? 'Submitting Report...' : 'Submit Issue Report'}
                  </button>
                </form>
              )}

              {repFeedback && (
                <div
                  role="status"
                  className={`p-3 rounded-lg text-xs ${
                    repFeedback.type === 'success'
                      ? 'bg-[#DCFCE7] text-[#14532D]'
                      : 'bg-[#FEF2F2] text-[#991B1B]'
                  }`}
                >
                  {repFeedback.text}
                </div>
              )}
            </section>
          </div>

          {/* Issue Reports Resolution Tracker Table */}
          <section className="bg-white border border-[#DDE3DD] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#EAECE7] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F2E1E]">
                Community Issue Reports &amp; Resolution Tracker
              </h2>
              <span className="text-xs font-mono tabular-nums text-[#4B5E53]">
                {state.reports.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F7F2] text-xs text-[#4B5E53] border-b border-[#EAECE7]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Report</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Location</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Resolution Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECE7]">
                  {state.reports.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F8F7F2]/60">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0F2E1E]">{r.title}</div>
                        <div className="text-xs text-[#4B5E53]">
                          By {r.reporterName} · Severity: {r.severity}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#394B40]">{r.category}</td>
                      <td className="py-3 px-4 text-xs text-[#394B40]">{r.locationName}</td>
                      <td className="py-3 px-4 text-xs font-mono font-semibold text-[#15803D]">
                        {r.status.replace('_', ' ').toUpperCase()}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#4B5E53]">
                        {r.resolutionNote || 'Awaiting field verification'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
