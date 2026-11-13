import { createInitialSeedState } from '../data/seedData.ts';
import {
  calculateCarbonFootprint,
  canPerformAction,
  gradeAcademyQuiz,
  hasDuplicateChallengeSubmission,
} from '../lib/ecogenLogic.ts';
import type {
  AuditLogEntry,
  CarbonInput,
  CommunityCampaign,
  EcogenAppState,
  IssueReport,
  UserRole,
} from '../types/ecogen.ts';

class EcogenStore {
  private state: EcogenAppState;

  constructor() {
    this.state = createInitialSeedState();
  }

  public getState(): EcogenAppState {
    return this.state;
  }

  public getPersona(role: UserRole) {
    return this.state.personas.find((p) => p.role === role) ?? this.state.personas[0];
  }

  private addAudit(
    actorRole: UserRole,
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetId: string,
    details: string
  ) {
    const actor = this.getPersona(actorRole);
    this.state.auditLogs.unshift({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.userId,
      actorName: actor.name,
      actorRole,
      action,
      targetType,
      targetId,
      details,
    });
  }

  public submitChallenge(
    role: UserRole,
    challengeId: string,
    evidenceNote: string,
    photoName?: string,
    photoDataUrl?: string
  ) {
    if (!canPerformAction(role, 'submit_challenge')) {
      return { ok: false as const, status: 403, error: 'Guest role cannot submit challenge evidence. Switch to User, Volunteer, or Organization.' };
    }
    const trimmed = evidenceNote.trim();
    if (trimmed.length < 8) {
      return { ok: false as const, status: 400, error: 'Please provide an evidence description of at least 8 characters.' };
    }
    const challenge = this.state.challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return { ok: false as const, status: 404, error: 'Challenge not found.' };
    }
    const actor = this.getPersona(role);
    if (hasDuplicateChallengeSubmission(this.state.submissions, challengeId, actor.userId)) {
      return {
        ok: false as const,
        status: 409,
        error: 'Duplicate submission blocked: you already have a pending or approved submission for this challenge.',
      };
    }

    const submission = {
      id: `sub-${Date.now()}`,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      userId: actor.userId,
      userName: actor.name,
      userRole: role,
      evidenceNote: trimmed,
      photoName,
      photoDataUrl,
      status: 'pending' as const,
      pointsAwarded: 0,
      submittedAt: new Date().toISOString(),
    };
    this.state.submissions.unshift(submission);
    this.addAudit(role, 'SUBMITTED_CHALLENGE_EVIDENCE', 'challenge', submission.id, `${actor.name} submitted evidence for ${challenge.title}.`);

    return { ok: true as const, data: submission, state: this.state };
  }

  public reviewSubmission(role: UserRole, submissionId: string, decision: 'approved' | 'rejected') {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required to verify challenge submissions.' };
    }
    const submission = this.state.submissions.find((s) => s.id === submissionId);
    if (!submission) {
      return { ok: false as const, status: 404, error: 'Submission not found.' };
    }
    if (submission.status !== 'pending') {
      return { ok: false as const, status: 409, error: 'This submission has already been reviewed.' };
    }
    const challenge = this.state.challenges.find((c) => c.id === submission.challengeId);
    const adminPersona = this.getPersona(role);
    const points = decision === 'approved' ? (challenge?.points ?? 50) : 0;

    submission.status = decision;
    submission.pointsAwarded = points;
    submission.reviewedBy = adminPersona.name;
    submission.reviewedAt = new Date().toISOString();

    if (decision === 'approved') {
      const targetUser = this.state.personas.find((p) => p.userId === submission.userId);
      if (targetUser) {
        targetUser.ecoScore += points;
        if (targetUser.campusId) {
          const campus = this.state.campuses.find((c) => c.id === targetUser.campusId);
          if (campus) {
            campus.verifiedActivities += 1;
            campus.carbonSavedKg += Math.round(challenge?.estimatedCo2SavedKg ?? 2);
          }
        }
      }
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: submission.userId,
        title: 'Challenge Evidence Approved',
        message: `${adminPersona.name} approved "${submission.challengeTitle}" (+${points} Eco Points).`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    } else {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: submission.userId,
        title: 'Challenge Evidence Needs Resubmission',
        message: `"${submission.challengeTitle}" was not verified. You may resubmit clearer evidence.`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    this.addAudit(
      role,
      decision === 'approved' ? 'APPROVED_CHALLENGE_SUBMISSION' : 'REJECTED_CHALLENGE_SUBMISSION',
      'challenge',
      submission.id,
      `${adminPersona.name} marked ${submission.userName}'s submission as ${decision}.`
    );

    return { ok: true as const, data: submission, state: this.state };
  }

  public createCampaign(
    role: UserRole,
    payload: {
      title: string;
      category: CommunityCampaign['category'];
      locationName: string;
      lat: number;
      lng: number;
      description: string;
      targetParticipants: number;
      impactMetricLabel: string;
      targetImpactValue: number;
    }
  ) {
    if (!canPerformAction(role, 'create_campaign')) {
      return {
        ok: false as const,
        status: 403,
        error: 'Only Volunteers, Organizations, or Admins can launch new campaigns.',
      };
    }
    if (!payload.title.trim() || !payload.locationName.trim() || payload.description.trim().length < 12) {
      return {
        ok: false as const,
        status: 400,
        error: 'Campaign title, location, and description (min 12 chars) are required.',
      };
    }

    const actor = this.getPersona(role);
    const campaign: CommunityCampaign = {
      id: `camp-${Date.now()}`,
      title: payload.title.trim(),
      organizerName: actor.organizationName || actor.name,
      organizerRole: role,
      category: payload.category,
      locationName: payload.locationName.trim(),
      lat: Number(payload.lat) || 37.77,
      lng: Number(payload.lng) || -122.41,
      description: payload.description.trim(),
      targetParticipants: Math.max(10, Number(payload.targetParticipants) || 50),
      participantIds: [actor.userId],
      impactMetricLabel: payload.impactMetricLabel.trim() || 'Verified eco actions',
      verifiedImpactValue: 0,
      targetImpactValue: Math.max(10, Number(payload.targetImpactValue) || 100),
      status: role === 'admin' || actor.verifiedOrg ? 'active' : 'pending_approval',
      imageUrl: '/src/assets/images/hero_forest_canopy_1794547641078.jpg',
      photos: [],
      createdAt: new Date().toISOString(),
    };

    this.state.campaigns.unshift(campaign);
    this.addAudit(
      role,
      'CREATED_CAMPAIGN',
      'campaign',
      campaign.id,
      `${actor.name} created campaign "${campaign.title}" (${campaign.status}).`
    );

    return { ok: true as const, data: campaign, state: this.state };
  }

  public toggleJoinCampaign(role: UserRole, campaignId: string) {
    if (!canPerformAction(role, 'join_campaign')) {
      return { ok: false as const, status: 403, error: 'Switch from Guest to User, Volunteer, or Organization to join campaigns.' };
    }
    const campaign = this.state.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return { ok: false as const, status: 404, error: 'Campaign not found.' };
    }
    const actor = this.getPersona(role);
    const alreadyJoined = campaign.participantIds.includes(actor.userId);
    if (alreadyJoined) {
      campaign.participantIds = campaign.participantIds.filter((id) => id !== actor.userId);
    } else {
      campaign.participantIds.push(actor.userId);
      actor.ecoScore += 20;
    }

    this.addAudit(
      role,
      alreadyJoined ? 'LEFT_CAMPAIGN' : 'JOINED_CAMPAIGN',
      'campaign',
      campaign.id,
      `${actor.name} ${alreadyJoined ? 'left' : 'joined'} "${campaign.title}".`
    );

    return { ok: true as const, joined: !alreadyJoined, data: campaign, state: this.state };
  }

  public addCampaignPhoto(
    role: UserRole,
    campaignId: string,
    caption: string,
    imageUrl: string,
    impactDelta: number
  ) {
    if (!canPerformAction(role, 'join_campaign')) {
      return { ok: false as const, status: 403, error: 'Authenticated role required to log campaign photos.' };
    }
    const campaign = this.state.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return { ok: false as const, status: 404, error: 'Campaign not found.' };
    }
    if (!caption.trim()) {
      return { ok: false as const, status: 400, error: 'Photo caption is required.' };
    }

    const actor = this.getPersona(role);
    campaign.photos.unshift({
      id: `ph-${Date.now()}`,
      caption: caption.trim(),
      uploadedBy: actor.name,
      uploadedAt: new Date().toISOString(),
      imageUrl: imageUrl || campaign.imageUrl,
    });
    if (impactDelta > 0) {
      campaign.verifiedImpactValue += Math.min(500, Math.round(impactDelta));
    }

    this.addAudit(role, 'LOGGED_CAMPAIGN_ACTIVITY', 'campaign', campaign.id, `${actor.name} uploaded campaign progress photo.`);
    return { ok: true as const, data: campaign, state: this.state };
  }

  public approveCampaign(role: UserRole, campaignId: string, status: 'active' | 'completed') {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required to approve campaigns.' };
    }
    const campaign = this.state.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return { ok: false as const, status: 404, error: 'Campaign not found.' };
    }
    campaign.status = status;
    this.addAudit(role, 'MODERATED_CAMPAIGN', 'campaign', campaign.id, `Updated "${campaign.title}" status to ${status}.`);
    return { ok: true as const, data: campaign, state: this.state };
  }

  public submitIssueReport(
    role: UserRole,
    payload: {
      title: string;
      category: IssueReport['category'];
      severity: IssueReport['severity'];
      locationName: string;
      lat: number;
      lng: number;
      description: string;
      photoName?: string;
      photoDataUrl?: string;
    }
  ) {
    if (!canPerformAction(role, 'submit_report')) {
      return { ok: false as const, status: 403, error: 'Switch from Guest to User, Volunteer, or Organization to submit environmental issue reports.' };
    }
    if (!payload.title.trim() || !payload.locationName.trim() || payload.description.trim().length < 10) {
      return { ok: false as const, status: 400, error: 'Title, location, and description (min 10 chars) are required.' };
    }

    const actor = this.getPersona(role);
    const duplicate = this.state.reports.some(
      (r) =>
        r.reporterId === actor.userId &&
        r.title.toLowerCase() === payload.title.trim().toLowerCase() &&
        r.status !== 'resolved'
    );
    if (duplicate) {
      return { ok: false as const, status: 409, error: 'Duplicate report detected for this active location.' };
    }

    const now = new Date().toISOString();
    const report: IssueReport = {
      id: `rep-${Date.now()}`,
      title: payload.title.trim(),
      category: payload.category,
      severity: payload.severity,
      locationName: payload.locationName.trim(),
      lat: Number(payload.lat) || 20,
      lng: Number(payload.lng) || 0,
      description: payload.description.trim(),
      photoName: payload.photoName,
      photoDataUrl: payload.photoDataUrl,
      reporterId: actor.userId,
      reporterName: actor.name,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    this.state.reports.unshift(report);
    actor.ecoScore += 15;
    this.addAudit(role, 'SUBMITTED_ISSUE_REPORT', 'report', report.id, `${actor.name} filed ${report.category} report at ${report.locationName}.`);

    return { ok: true as const, data: report, state: this.state };
  }

  public updateReportStatus(
    role: UserRole,
    reportId: string,
    status: IssueReport['status'],
    resolutionNote?: string
  ) {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required to update report verification status.' };
    }
    const report = this.state.reports.find((r) => r.id === reportId);
    if (!report) {
      return { ok: false as const, status: 404, error: 'Issue report not found.' };
    }
    report.status = status;
    if (resolutionNote?.trim()) {
      report.resolutionNote = resolutionNote.trim();
    }
    report.updatedAt = new Date().toISOString();

    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: report.reporterId,
      title: `Issue Report ${status.replace('_', ' ')}`,
      message: `Your report "${report.title}" is now marked ${status.replace('_', ' ')}.`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    this.addAudit(role, 'UPDATED_REPORT_STATUS', 'report', report.id, `Set report "${report.title}" to ${status}.`);
    return { ok: true as const, data: report, state: this.state };
  }

  public saveCarbonCalculation(role: UserRole, input: CarbonInput) {
    if (!canPerformAction(role, 'save_carbon')) {
      return { ok: false as const, status: 403, error: 'Switch from Guest to a member role to save carbon calculations to your dashboard.' };
    }
    const actor = this.getPersona(role);
    const result = calculateCarbonFootprint(input);
    const record = {
      id: `carb-${Date.now()}`,
      userId: actor.userId,
      createdAt: new Date().toISOString(),
      input,
      result,
    };
    this.state.carbonHistory.unshift(record);
    this.addAudit(role, 'SAVED_CARBON_LOG', 'user', actor.userId, `${actor.name} logged ${result.totalTonnesCo2e} tCO2e annual estimate.`);
    return { ok: true as const, data: record, state: this.state };
  }

  public submitAcademyQuiz(role: UserRole, moduleId: string, answers: number[]) {
    if (!canPerformAction(role, 'complete_quiz')) {
      return { ok: false as const, status: 403, error: 'Switch from Guest to earn academy progress and certificates.' };
    }
    const mod = this.state.academyModules.find((m) => m.id === moduleId);
    if (!mod) {
      return { ok: false as const, status: 404, error: 'Academy module not found.' };
    }
    const graded = gradeAcademyQuiz(
      answers,
      mod.questions.map((q) => q.correctIndex)
    );
    const actor = this.getPersona(role);
    const existingIdx = this.state.academyProgress.findIndex(
      (p) => p.moduleId === moduleId && p.userId === actor.userId
    );
    const certId = graded.passed
      ? `CERT-ECO-2026-${Math.floor(100 + Math.random() * 899)}`
      : undefined;

    const record = {
      moduleId,
      userId: actor.userId,
      scorePct: graded.scorePct,
      passed: graded.passed,
      certificateId: certId,
      completedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      const prevPassed = this.state.academyProgress[existingIdx].passed;
      this.state.academyProgress[existingIdx] = {
        ...record,
        certificateId: this.state.academyProgress[existingIdx].certificateId || certId,
      };
      if (!prevPassed && graded.passed) {
        actor.ecoScore += 60;
      }
    } else {
      this.state.academyProgress.unshift(record);
      if (graded.passed) {
        actor.ecoScore += 60;
      }
    }

    if (graded.passed) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: actor.userId,
        title: `Badge Unlocked: ${mod.badgeTitle}`,
        message: `Scored ${graded.scorePct}% on "${mod.title}".`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    this.addAudit(role, 'COMPLETED_ACADEMY_QUIZ', 'content', moduleId, `${actor.name} scored ${graded.scorePct}% on ${mod.title}.`);
    return { ok: true as const, data: { graded, record }, state: this.state };
  }

  public adminToggleOrgVerification(role: UserRole, targetUserId: string) {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required.' };
    }
    const persona = this.state.personas.find((p) => p.userId === targetUserId);
    if (!persona) {
      return { ok: false as const, status: 404, error: 'User profile not found.' };
    }
    persona.verifiedOrg = !persona.verifiedOrg;
    this.addAudit(role, 'TOGGLED_ORG_VERIFICATION', 'user', persona.userId, `Set verifiedOrg=${persona.verifiedOrg} for ${persona.name}.`);
    return { ok: true as const, data: persona, state: this.state };
  }

  public adminToggleCampusFlag(role: UserRole, campusId: string) {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required.' };
    }
    const campus = this.state.campuses.find((c) => c.id === campusId);
    if (!campus) {
      return { ok: false as const, status: 404, error: 'Campus not found.' };
    }
    campus.flaggedForReview = !campus.flaggedForReview;
    this.addAudit(role, 'MODERATED_CAMPUS', 'campus', campus.id, `Set audit flag=${campus.flaggedForReview} for ${campus.name}.`);
    return { ok: true as const, data: campus, state: this.state };
  }

  public adminCreateChallenge(
    role: UserRole,
    payload: {
      title: string;
      description: string;
      cadence: 'Daily' | 'Weekly';
      category: 'Energy' | 'Waste' | 'Mobility' | 'Biodiversity' | 'Water';
      points: number;
      estimatedCo2SavedKg: number;
    }
  ) {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required.' };
    }
    if (!payload.title.trim() || !payload.description.trim()) {
      return { ok: false as const, status: 400, error: 'Title and description are required.' };
    }
    const challenge = {
      id: `ch-${Date.now()}`,
      title: payload.title.trim(),
      description: payload.description.trim(),
      cadence: payload.cadence,
      category: payload.category,
      points: Math.max(10, Math.min(500, Number(payload.points) || 50)),
      estimatedCo2SavedKg: Math.max(0.1, Number(payload.estimatedCo2SavedKg) || 1.5),
      verificationHint: 'Provide a concise action log or supporting field photograph.',
    };
    this.state.challenges.unshift(challenge);
    this.addAudit(role, 'CREATED_CHALLENGE', 'content', challenge.id, `Published new ${challenge.cadence} challenge: ${challenge.title}.`);
    return { ok: true as const, data: challenge, state: this.state };
  }

  public adminCreateArticle(
    role: UserRole,
    payload: { title: string; category: string; excerpt: string; body: string }
  ) {
    if (!canPerformAction(role, 'admin_moderate')) {
      return { ok: false as const, status: 403, error: 'Admin role required.' };
    }
    if (!payload.title.trim() || !payload.excerpt.trim()) {
      return { ok: false as const, status: 400, error: 'Article title and excerpt are required.' };
    }
    const admin = this.getPersona(role);
    const article = {
      id: `art-${Date.now()}`,
      title: payload.title.trim(),
      category: payload.category.trim() || 'Sustainability',
      publishedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      readMinutes: Math.max(2, Math.ceil((payload.body || payload.excerpt).split(/\s+/).length / 180)),
      author: admin.name,
      excerpt: payload.excerpt.trim(),
      body: (payload.body || payload.excerpt).trim(),
    };
    this.state.articles.unshift(article);
    this.addAudit(role, 'PUBLISHED_ARTICLE', 'content', article.id, `Published article: ${article.title}.`);
    return { ok: true as const, data: article, state: this.state };
  }

  public markNotificationsRead(role: UserRole) {
    const actor = this.getPersona(role);
    this.state.notifications.forEach((n) => {
      if (n.userId === actor.userId) {
        n.read = true;
      }
    });
    return { ok: true as const, state: this.state };
  }
}

export const ecogenStore = new EcogenStore();
