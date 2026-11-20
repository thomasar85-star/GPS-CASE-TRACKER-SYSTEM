import React, { useState } from 'react';
import {
  ShieldAlert,
  Award,
  AlertTriangle,
  GitCompare,
  Clock,
  CheckCircle,
  Eye,
  Send,
  Building2,
  Sliders,
  FileText,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { Officer, CaseRecord } from '../types';
import { storage } from '../services/storage';
import { formatOfficerDisplayName, isSeniorOfficer, isSeniorOfficerRank, GPS_SENIOR_OFFICER_RANKS } from '../utils/security';

interface SeniorCommandViewProps {
  onSelectCase: (caseId: string) => void;
  currentUser: Officer | null;
}

export const SeniorCommandView: React.FC<SeniorCommandViewProps> = ({
  onSelectCase,
  currentUser
}) => {
  const agingCases = storage.getAgingCases();
  const suspectMatches = storage.findCrossStationMatches();
  const allCases = storage.getCases();
  const seniorOfficers = storage.getSeniorOfficers();

  // Find submissions awaiting senior officer review / endorsement
  const pendingEndorsements = allCases.flatMap(c => {
    return c.submissions
      .filter(s => s.submissionType === 'investigation_finding' && !s.isEndorsed)
      .map(s => ({ submission: s, caseRecord: c }));
  });

  const [selectedCaseForDirective, setSelectedCaseForDirective] = useState<CaseRecord | null>(null);
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [directiveContent, setDirectiveContent] = useState('');
  const [agingThreshold, setAgingThreshold] = useState(storage.getAgingThreshold());

  // Determine Gazetted Senior Officer Reviewing Authority
  const isCurrentOfficerSenior = isSeniorOfficer(currentUser);
  const defaultSeniorOfficer = isCurrentOfficerSenior && currentUser
    ? currentUser
    : (seniorOfficers.find(o => o.id === 'off_004') || seniorOfficers[0] || {
        id: 'off_004',
        name: 'Nana Kwabena Osei',
        rank: 'Chief Superintendent of Police',
        badgeId: 'GPS-CSUPT-0104',
        stationId: 'stn_accra_central',
        stationName: 'Accra Central Divisional Police Headquarters',
        role: 'senior_officer' as const
      });

  const [selectedReviewingOfficerId, setSelectedReviewingOfficerId] = useState<string>(
    defaultSeniorOfficer.id
  );

  const activeReviewingAuthority: Officer =
    seniorOfficers.find(o => o.id === selectedReviewingOfficerId) ||
    (isCurrentOfficerSenior && currentUser ? currentUser : defaultSeniorOfficer);

  const handleIssueDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForDirective || !directiveTitle.trim() || !directiveContent.trim()) return;

    const reviewingName = activeReviewingAuthority.name;
    const reviewingRank = activeReviewingAuthority.rank;
    const reviewingBadge = activeReviewingAuthority.badgeId;

    let contentText = directiveContent.trim();
    if (!isCurrentOfficerSenior && currentUser) {
      contentText += `\n\n[Supervisory Note]: Recorded and logged by ${formatOfficerDisplayName(currentUser.rank, currentUser.name)} (${currentUser.badgeId}) on behalf of Senior Reviewing Authority ${formatOfficerDisplayName(reviewingRank, reviewingName)}.`;
    }

    storage.addSubmission(selectedCaseForDirective.id, {
      caseId: selectedCaseForDirective.id,
      officerId: activeReviewingAuthority.id,
      officerName: reviewingName,
      officerBadge: reviewingBadge,
      officerRank: reviewingRank,
      officerRole: 'senior_officer',
      submissionType: 'directive',
      title: `Senior Command Directive (${reviewingRank}): ${directiveTitle.trim()}`,
      content: contentText,
      timestamp: new Date().toISOString(),
      isEndorsed: true
    });

    setSelectedCaseForDirective(null);
    setDirectiveTitle('');
    setDirectiveContent('');
  };

  const handleEndorseSubmission = (caseId: string, submissionId: string) => {
    const c = storage.getCaseById(caseId);
    if (!c) return;

    const sub = c.submissions.find(s => s.id === submissionId);
    if (sub) {
      const reviewingName = activeReviewingAuthority.name;
      const reviewingRank = activeReviewingAuthority.rank;
      const reviewingBadge = activeReviewingAuthority.badgeId;

      sub.isEndorsed = true;
      sub.endorsedBy = {
        officerName: reviewingName,
        officerBadge: reviewingBadge,
        timestamp: new Date().toISOString(),
        comments: `Endorsed upon supervisory review by Gazetted Senior Officer ${formatOfficerDisplayName(reviewingRank, reviewingName)} (${activeReviewingAuthority.stationName}).`
      };

      storage.addSubmission(caseId, {
        caseId,
        officerId: activeReviewingAuthority.id,
        officerName: reviewingName,
        officerBadge: reviewingBadge,
        officerRank: reviewingRank,
        officerRole: 'senior_officer',
        submissionType: 'senior_endorsement',
        title: `Senior Command Endorsement: ${sub.title}`,
        content: `Supervisory endorsement approved by ${formatOfficerDisplayName(reviewingRank, reviewingName)} (${reviewingRank}). Findings reviewed and affirmed for prosecution docket compilation.`,
        timestamp: new Date().toISOString(),
        isEndorsed: true
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Command Room Banner with Senior Officer Reviewing Authority */}
      <div className="bg-[#0A2A66] text-white rounded-xl p-5 border-b-4 border-[#C9A227] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-900/90 border border-[#C9A227] flex items-center justify-center text-[#C9A227] shrink-0 shadow-inner">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold font-serif uppercase tracking-wide">
                Senior Officer &amp; Command Oversight Room
              </h2>
              <span className="hidden sm:inline-block bg-[#C9A227] text-slate-950 font-bold text-[9px] uppercase px-2 py-0.5 rounded tracking-wider">
                Gazetted Command
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              Supervisory review, stalled case audits, inter-station syndicate detection &amp; statutory docket endorsements.
            </p>
          </div>
        </div>

        {/* Reviewing Authority Card (Always Senior Officer Rank) */}
        <div className="bg-[#071D49] border border-blue-700/80 rounded-xl p-3 text-left md:text-right shadow-sm shrink-0 min-w-[280px]">
          <div className="flex items-center justify-between md:justify-end md:space-x-2 mb-1">
            <span className="text-[10px] text-blue-300 uppercase font-mono tracking-wider font-semibold flex items-center">
              <UserCheck className="w-3 h-3 mr-1 text-[#C9A227]" />
              Reviewing Authority (Senior Officer Rank)
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="text-xs sm:text-sm font-bold text-[#C9A227] leading-tight flex items-center md:justify-end">
              <span>{formatOfficerDisplayName(activeReviewingAuthority.rank, activeReviewingAuthority.name)}</span>
            </div>
            <div className="text-[11px] text-slate-200 font-medium flex items-center md:justify-end space-x-1.5">
              <span className="bg-emerald-900/80 text-emerald-300 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/40">
                {activeReviewingAuthority.rank}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">({activeReviewingAuthority.badgeId})</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[280px] md:ml-auto">
              {activeReviewingAuthority.stationName.split(' ')[0]} Command Division
            </div>
          </div>

          {/* Select Reviewing Senior Officer if multiple available */}
          {seniorOfficers.length > 1 && (
            <div className="mt-2 pt-2 border-t border-blue-900/80 flex items-center justify-between text-[10px]">
              <span className="text-blue-300 text-[9px]">Select Senior Commander:</span>
              <select
                value={activeReviewingAuthority.id}
                onChange={e => setSelectedReviewingOfficerId(e.target.value)}
                className="bg-blue-950/90 text-amber-200 border border-blue-700 rounded px-2 py-0.5 text-[10px] font-semibold focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
              >
                {seniorOfficers.map(spo => (
                  <option key={spo.id} value={spo.id}>
                    {formatOfficerDisplayName(spo.rank, spo.name)} ({spo.rank.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Role Context Notification if user is subordinate rank */}
      {!isCurrentOfficerSenior && currentUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0A2A66] flex items-center justify-center font-bold">
              ℹ
            </div>
            <div>
              <p className="font-semibold text-blue-900">
                Operating under Senior Command Oversight Authority:
              </p>
              <p className="text-blue-800 text-[11px]">
                You are currently logged in as <strong className="font-semibold">{formatOfficerDisplayName(currentUser.rank, currentUser.name)}</strong> ({currentUser.rank}). Directives and endorsements issued in this room will be formally ratified and recorded under the statutory authority of Gazetted Senior Officer <strong className="font-semibold text-[#0A2A66]">{formatOfficerDisplayName(activeReviewingAuthority.rank, activeReviewingAuthority.name)}</strong> ({activeReviewingAuthority.rank}).
              </p>
            </div>
          </div>
          <span className="bg-blue-200 text-blue-900 font-mono text-[10px] font-bold px-2 py-1 rounded shrink-0 hidden sm:inline-block">
            SPO Supervision Active
          </span>
        </div>
      )}

      {/* 3 Executive Command Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Section 1: Aging Cases Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Aging Case Directives</h3>
                <span className="text-[11px] text-slate-500">&gt; {agingThreshold} days without progress</span>
              </div>
            </div>
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {agingCases.length}
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-96 divide-y divide-slate-100">
            {agingCases.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700">No Stalled Cases</p>
                <p>All active dockets have recent investigator submissions.</p>
              </div>
            ) : (
              agingCases.map(({ caseRecord, daysInactive }) => (
                <div key={caseRecord.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#0A2A66]">
                      {caseRecord.docketNumber}
                    </span>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                      {daysInactive}d Stalled
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                    {caseRecord.offenceTitle}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                      {caseRecord.stationName.split(' ')[0]}
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setSelectedCaseForDirective(caseRecord)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                      >
                        + Issue Directive
                      </button>
                      <button
                        onClick={() => onSelectCase(caseRecord.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Pending Investigation Endorsements */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">CID Findings to Endorse</h3>
                <span className="text-[11px] text-slate-500">Awaiting commander sign-off</span>
              </div>
            </div>
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {pendingEndorsements.length}
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-96 divide-y divide-slate-100">
            {pendingEndorsements.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700">All Findings Endorsed</p>
                <p>No investigator findings currently pending senior review.</p>
              </div>
            ) : (
              pendingEndorsements.map(({ submission, caseRecord }) => (
                <div key={submission.id} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#0A2A66]">
                      {caseRecord.docketNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(submission.timestamp).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">{submission.title}</h5>
                  <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded">
                    "{submission.content}"
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">
                      By: {formatOfficerDisplayName(submission.officerRank, submission.officerName)}
                    </span>
                    <button
                      onClick={() => handleEndorseSubmission(caseRecord.id, submission.id)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] px-2.5 py-1 rounded cursor-pointer flex items-center space-x-1"
                    >
                      <Award className="w-3 h-3" />
                      <span>Endorse Finding</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 3: Cross-Station Match Correlator */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Inter-Station Syndicate Alerts</h3>
                <span className="text-[11px] text-slate-500">Cross-border suspect matches</span>
              </div>
            </div>
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {suspectMatches.length}
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-96">
            {suspectMatches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <p className="font-semibold text-slate-700">No Inter-Station Duplications</p>
              </div>
            ) : (
              suspectMatches.map(m => (
                <div key={m.id} className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">👤 {m.suspectName}</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 rounded">
                      Matched
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-900 font-mono block">
                    {m.similarityReason}
                  </span>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[10px]">
                    <span className="text-slate-600 truncate">{m.currentStationName.split(' ')[0]} ⇄ {m.matchedStationName.split(' ')[0]}</span>
                    <button
                      onClick={() => onSelectCase(m.currentCaseId)}
                      className="text-[#0A2A66] font-bold hover:underline"
                    >
                      Open Case →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Directive Issue Modal */}
      {selectedCaseForDirective && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleIssueDirective}
            className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-300 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="text-sm font-bold text-[#0A2A66] uppercase">
                  Issue Senior Command Directive
                </h4>
                <span className="text-xs text-slate-500 font-mono">{selectedCaseForDirective.docketNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForDirective(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Authorizing Senior Officer Rank Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 uppercase font-mono text-[10px] font-bold">Authorizing Reviewing Authority:</span>
                <span className="bg-[#0A2A66] text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                  Gazetted SPO
                </span>
              </div>
              <p className="font-bold text-slate-900">
                {formatOfficerDisplayName(activeReviewingAuthority.rank, activeReviewingAuthority.name)} ({activeReviewingAuthority.rank})
              </p>
              <p className="text-[10px] text-slate-500">
                {activeReviewingAuthority.stationName} • Badge ID: {activeReviewingAuthority.badgeId}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Directive Subject</label>
              <input
                type="text"
                placeholder="e.g. Expedite Ballistics Clearance & Re-interrogate Suspect"
                value={directiveTitle}
                onChange={e => setDirectiveTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mandatory Directives for CID Team</label>
              <textarea
                rows={4}
                placeholder="Specify exact investigative actions, target deadlines, forensic instructions..."
                value={directiveContent}
                onChange={e => setDirectiveContent(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCaseForDirective(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#0A2A66] hover:bg-[#071D49] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow flex items-center space-x-1.5"
              >
                <Send className="w-3 h-3 text-[#C9A227]" />
                <span>Dispatch Supervisory Directive</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
