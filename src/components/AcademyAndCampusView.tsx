import { useMemo, useState } from 'react';
import { Award, BookOpen, CheckCircle2 } from 'lucide-react';
import { canPerformAction, rankCampusesFairly } from '../lib/ecogenLogic';
import type {
  EcogenAppState,
  RolePersona,
  UserRole,
} from '../types/ecogen';
import { ResilientImage } from './ResilientImage';

interface AcademyAndCampusViewProps {
  state: EcogenAppState;
  activePersona: RolePersona;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  initialTab?: string;
  initialFocusId?: string;
  onSubmitQuiz: (
    moduleId: string,
    answers: number[]
  ) => Promise<{
    ok: boolean;
    error?: string;
    graded?: { correctCount: number; total: number; scorePct: number; passed: boolean };
  }>;
}

export function AcademyAndCampusView({
  state,
  activePersona,
  activeRole,
  onSelectRole,
  initialTab,
  initialFocusId,
  onSubmitQuiz,
}: AcademyAndCampusViewProps) {
  const [tab, setTab] = useState<'modules' | 'leaderboard'>(
    initialTab === 'leaderboard' ? 'leaderboard' : 'modules'
  );
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    initialFocusId && state.academyModules.some((m) => m.id === initialFocusId)
      ? initialFocusId
      : state.academyModules[0]?.id || ''
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const activeModule =
    state.academyModules.find((m) => m.id === selectedModuleId) ?? state.academyModules[0];

  const userProgressMap = useMemo(() => {
    const map = new Map<string, (typeof state.academyProgress)[number]>();
    state.academyProgress
      .filter((p) => p.userId === activePersona.userId)
      .forEach((p) => map.set(p.moduleId, p));
    return map;
  }, [state.academyProgress, activePersona.userId]);

  const earnedBadges = useMemo(() => {
    return state.academyModules.filter((m) => userProgressMap.get(m.id)?.passed);
  }, [state.academyModules, userProgressMap]);

  const rankedCampuses = useMemo(() => rankCampusesFairly(state.campuses), [state.campuses]);

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModule) return;
    const answerList = activeModule.questions.map((q) => answers[q.id] ?? -1);
    if (answerList.some((a) => a < 0)) {
      setQuizFeedback({
        type: 'error',
        text: 'Please answer all quiz questions before submitting.',
      });
      return;
    }

    setSubmittingQuiz(true);
    setQuizFeedback(null);
    const res = await onSubmitQuiz(activeModule.id, answerList);
    setSubmittingQuiz(false);

    if (res.ok && res.graded) {
      setQuizFeedback({
        type: res.graded.passed ? 'success' : 'error',
        text: res.graded.passed
          ? `Passed with ${res.graded.scorePct}% (${res.graded.correctCount}/${res.graded.total}). Certificate & "${activeModule.badgeTitle}" badge unlocked.`
          : `Scored ${res.graded.scorePct}% (${res.graded.correctCount}/${res.graded.total}). 70% required to unlock badge—review the facts and retry.`,
      });
    } else {
      setQuizFeedback({
        type: 'error',
        text: res.error || 'Could not submit quiz.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#DDE3DD] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#15803D]">
            Environmental Literacy &amp; Fair Campus Benchmarking
          </p>
          <h1 className="text-3xl font-bold text-[#0F2E1E] mt-1">
            Eco Learning Academy &amp; Campus Leaderboard
          </h1>
          <p className="text-sm text-[#4B5E53] mt-1">
            Complete peer-reviewed sustainability lessons, earn verifiable certificates, and compare normalized campus impact.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#EAECE7] p-1 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('modules')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'modules' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Learning Academy
          </button>
          <button
            type="button"
            onClick={() => setTab('leaderboard')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === 'leaderboard' ? 'bg-[#0F2E1E] text-[#F8F7F2]' : 'text-[#394B40]'
            }`}
          >
            Green Campus Leaderboard
          </button>
        </div>
      </div>

      {/* TAB 1: ECO LEARNING ACADEMY */}
      {tab === 'modules' && activeModule && (
        <div className="space-y-8">
          {/* Learning Progress & Certificates Strip */}
          <div className="bg-white border border-[#DDE3DD] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-[#15803D] shrink-0" aria-hidden="true" />
              <div>
                <div className="text-sm font-bold text-[#0F2E1E]">
                  Progress for {activePersona.name}: {earnedBadges.length} /{' '}
                  {state.academyModules.length} Modules Certified
                </div>
                <div className="text-xs text-[#4B5E53]">
                  {earnedBadges.length > 0
                    ? `Earned Badges: ${earnedBadges.map((b) => b.badgeTitle).join(' · ')}`
                    : 'Pass any module quiz (70%+) to earn your first Eco Certificate.'}
                </div>
              </div>
            </div>
            <div className="text-xs font-mono tabular-nums text-[#0F2E1E]">
              {Math.round((earnedBadges.length / state.academyModules.length) * 100)}% Complete
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Module Selector */}
            <div className="lg:col-span-4 space-y-3">
              {state.academyModules.map((mod) => {
                const prog = userProgressMap.get(mod.id);
                const isSelected = mod.id === activeModule.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setSelectedModuleId(mod.id);
                      setQuizFeedback(null);
                    }}
                    className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F2E1E] text-[#F8F7F2] border-[#0F2E1E]'
                        : 'bg-white text-[#14231B] border-[#DDE3DD] hover:border-[#0F2E1E]/40'
                    }`}
                  >
                    <div
                      className={`text-xs ${
                        isSelected ? 'text-[#A3E635]' : 'text-[#4B5E53]'
                      }`}
                    >
                      {mod.topic} · {mod.readMinutes} min · {mod.questions.length} quiz items
                    </div>
                    <div className="text-sm font-bold mt-1">{mod.title}</div>
                    {prog?.passed && (
                      <div
                        className={`text-xs mt-2 inline-flex items-center gap-1 ${
                          isSelected ? 'text-[#A3E635]' : 'text-[#15803D]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Certified ({prog.scorePct}%) · {prog.certificateId}
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Earned Certificates List */}
              {earnedBadges.length > 0 && (
                <div className="bg-[#EAECE7] border border-[#DDE3DD] rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F2E1E]">
                    <Award className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
                    Issued Certificates
                  </div>
                  {earnedBadges.map((b) => {
                    const prog = userProgressMap.get(b.id);
                    return (
                      <div key={b.id} className="bg-white border border-[#DDE3DD] rounded-lg p-3 text-xs">
                        <div className="font-bold text-[#0F2E1E]">{b.badgeTitle}</div>
                        <div className="text-[#4B5E53] mt-0.5">{b.title}</div>
                        <div className="font-mono text-[11px] text-[#15803D] mt-1">
                          {prog?.certificateId} · Score {prog?.scorePct}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active Article + Environmental Facts + Quiz */}
            <div className="lg:col-span-8 bg-white border border-[#DDE3DD] rounded-xl overflow-hidden">
              <div className="h-52 overflow-hidden">
                <ResilientImage src={activeModule.imageUrl} alt={activeModule.title} />
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="text-xs text-[#4B5E53]">
                    {activeModule.topic} · {activeModule.readMinutes} min study · Badge:{' '}
                    {activeModule.badgeTitle}
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F2E1E] mt-1">
                    {activeModule.title}
                  </h2>
                  <p className="text-sm font-medium text-[#394B40] mt-2">
                    {activeModule.summary}
                  </p>
                </div>

                <div className="space-y-3 text-sm text-[#14231B] leading-relaxed">
                  {activeModule.articleParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>

                <div className="bg-[#F8F7F2] border border-[#EAECE7] rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-bold text-[#0F2E1E] uppercase tracking-wider">
                    Verified Environmental Facts
                  </h3>
                  <ul className="space-y-1.5 text-xs text-[#394B40] list-disc pl-4">
                    {activeModule.environmentalFacts.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>

                {/* Interactive Quiz */}
                <form
                  onSubmit={handleQuizSubmit}
                  className="pt-5 border-t border-[#EAECE7] space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-bold text-[#0F2E1E]">
                      Knowledge Check Quiz
                    </h3>
                    <p className="text-xs text-[#4B5E53]">
                      Score 70% or higher to earn the {activeModule.badgeTitle} certificate and +60 Eco Points.
                    </p>
                  </div>

                  {activeModule.questions.map((q, qIdx) => (
                    <fieldset key={q.id} className="space-y-2">
                      <legend className="text-sm font-semibold text-[#0F2E1E]">
                        {qIdx + 1}. {q.prompt}
                      </legend>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const checked = answers[q.id] === oIdx;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer ${
                                checked
                                  ? 'border-[#0F2E1E] bg-[#F1F5F0] font-medium text-[#0F2E1E]'
                                  : 'border-[#DDE3DD] hover:bg-[#F8F7F2] text-[#394B40]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={checked}
                                onChange={() =>
                                  setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                                }
                                className="accent-[#15803D]"
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}

                  {!canPerformAction(activeRole, 'complete_quiz') ? (
                    <div className="p-4 bg-[#F8F7F2] border border-[#DDE3DD] rounded-lg flex items-center justify-between gap-4 text-xs">
                      <span>Switch to a member role to grade your quiz and issue a certificate.</span>
                      <button
                        type="button"
                        onClick={() => onSelectRole('user')}
                        className="px-3.5 py-2 bg-[#0F2E1E] text-white font-semibold rounded-lg shrink-0 cursor-pointer"
                      >
                        Switch to User Role
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={submittingQuiz}
                      className="px-5 py-2.5 bg-[#0F2E1E] text-[#F8F7F2] text-sm font-semibold rounded-lg hover:bg-[#17422B] disabled:opacity-60 cursor-pointer"
                    >
                      {submittingQuiz ? 'Grading Quiz...' : 'Submit Quiz & Grade'}
                    </button>
                  )}

                  {quizFeedback && (
                    <div
                      role="status"
                      className={`p-3.5 rounded-lg text-xs font-medium ${
                        quizFeedback.type === 'success'
                          ? 'bg-[#DCFCE7] text-[#14532D]'
                          : 'bg-[#FEF2F2] text-[#991B1B]'
                      }`}
                    >
                      {quizFeedback.text}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GREEN CAMPUS LEADERBOARD */}
      {tab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="bg-[#0F2E1E] text-[#F8F7F2] rounded-xl p-6 space-y-2">
            <h2 className="text-lg font-bold">Fair Ranking Methodology (Population-Normalized)</h2>
            <p className="text-xs text-[#D8E5DA] leading-relaxed max-w-4xl">
              To ensure 2,500-student colleges compete fairly with 40,000-student research universities,
              ECOGEN normalizes raw verified activities, campaign participation rate, and verified carbon
              savings by <code className="font-mono text-[#A3E635]">log10(studentPopulation + 100)</code>.
              Only moderator-verified activities and audited campaigns count toward the Fair Impact Index.
            </p>
          </div>

          <div className="bg-white border border-[#DDE3DD] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F8F7F2] text-xs text-[#4B5E53] border-b border-[#EAECE7]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Rank</th>
                    <th className="py-3.5 px-4 font-semibold">Campus</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Students</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Verified Activities</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Participation</th>
                    <th className="py-3.5 px-4 font-semibold text-right">CO2 Saved</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Fair Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAECE7]">
                  {rankedCampuses.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8F7F2]/60">
                      <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-[#0F2E1E]">
                        #{c.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F2E1E]">{c.name}</div>
                        <div className="text-xs text-[#4B5E53]">
                          {c.city}, {c.country}
                          {c.flaggedForReview ? ' · Under Moderator Audit' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#394B40]">
                        {c.studentPopulation.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#0F2E1E]">
                        {c.verifiedActivities}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#15803D]">
                        {Math.round(c.campaignParticipationRate * 100)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#394B40]">
                        {c.carbonSavedKg.toLocaleString()} kg
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#15803D]">
                        {c.fairScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
