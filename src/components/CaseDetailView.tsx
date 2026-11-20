import React, { useState } from 'react';
import {
  FileText,
  Shield,
  User,
  Users,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Plus,
  Lock,
  ArrowLeft,
  Printer,
  ChevronRight,
  GitCompare,
  Upload,
  Camera,
  Award,
  MessageSquare,
  ShieldCheck,
  Send,
  Building,
  Check,
  Phone,
  Mail,
  Edit3,
  Eye,
  Image as ImageIcon,
  BookOpen,
  WifiOff,
  Wifi
} from 'lucide-react';
import { CaseRecord, Officer, CaseStatus, CaseSubmission, SubmissionType, Suspect } from '../types';
import { storage } from '../services/storage';
import { RBAC, getPlaceholderImage, formatOfficerDisplayName, isSeniorOfficer, isSeniorOfficerRank, GPS_SENIOR_OFFICER_RANKS } from '../utils/security';
import { PrintDocketModal } from './PrintDocketModal';
import { getAct29OffenceByCode } from '../data/ghanaAct29Offences';
import { ImageUploadDropzone } from './ImageUploadDropzone';

interface CaseDetailViewProps {
  caseRecord: CaseRecord;
  currentUser: Officer | null;
  onBack: () => void;
  onSelectCase: (caseId: string) => void;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseRecord,
  currentUser,
  onBack,
  onSelectCase
}) => {
  const [currentCase, setCurrentCase] = useState<CaseRecord>(caseRecord);
  const [activeTab, setActiveTab] = useState<'submissions' | 'suspects' | 'evidence' | 'witnesses' | 'court'>('submissions');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; title: string; category?: string } | null>(null);

  // Status Progression Modal & Disposition States
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CaseStatus>('under_investigation');
  const [statusNote, setStatusNote] = useState('');

  // Disposition Specific Modals
  const [courtName, setCourtName] = useState('Kumasi Circuit Court 2');
  const [suitNumber, setSuitNumber] = useState('KCC/CR-2026/092');
  const [courtDate, setCourtDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16));
  const [prosecutingOfficer, setProsecutingOfficer] = useState(currentUser?.name || 'Chief Inspector Legal CID');
  const [presidingJudge, setPresidingJudge] = useState('His Honour Justice K. Boateng');
  const [courtOutcome, setCourtOutcome] = useState<'pending_trial' | 'convicted' | 'acquitted' | 'dismissed' | 'settled_out_of_court'>('pending_trial');
  const [proceedingsNote, setProceedingsNote] = useState('');

  // Bail / Settlement States
  const [bailAmount, setBailAmount] = useState('10000');
  const [bailSureties, setBailSureties] = useState('Two justified civil servants');
  const [settlementNotes, setSettlementNotes] = useState('');

  // New Submission Form
  const [showAddSubmission, setShowAddSubmission] = useState(false);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionPhotos, setSubmissionPhotos] = useState<string[]>([]);
  const [submissionType, setSubmissionType] = useState<SubmissionType>(
    currentUser?.role === 'senior_officer'
      ? 'senior_endorsement'
      : currentUser?.role === 'investigator'
      ? 'investigation_finding'
      : 'initial_intake'
  );
  const seniorOfficers = storage.getSeniorOfficers();
  const [selectedSeniorReviewerId, setSelectedSeniorReviewerId] = useState<string>(
    seniorOfficers[0]?.id || 'off_004'
  );

  // Add Evidence Form
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evidenceCategory, setEvidenceCategory] = useState<'physical' | 'digital' | 'document' | 'forensic'>('physical');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceLocker, setEvidenceLocker] = useState('Exhibit Locker Vault 1, Shelf C');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);

  // Suspect Caution Statement Modal
  const [selectedSuspectForCaution, setSelectedSuspectForCaution] = useState<Suspect | null>(null);
  const [cautionStatementText, setCautionStatementText] = useState('');

  // Cross-Station Matches
  const suspectMatches = storage.findCrossStationMatches(currentCase.id);

  // Refresh case helper
  const reloadCase = () => {
    const updated = storage.getCaseById(currentCase.id);
    if (updated) setCurrentCase({ ...updated });
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetStatus === 'forwarded_to_court') {
      storage.setCourtRecord(currentCase.id, {
        courtName,
        suitNumber,
        prosecutingOfficer,
        firstHearingDate: new Date(courtDate).toISOString(),
        presidingJudge,
        proceedings: [
          {
            id: 'proc_' + Date.now(),
            date: new Date().toISOString(),
            courtName,
            presidingJudge,
            proceedingsSummary: statusNote || 'Case formally registered and submitted to court registry.',
            nextAdjournmentDate: new Date(courtDate).toISOString()
          }
        ],
        finalOutcome: courtOutcome
      });
    } else if (targetStatus === 'bail_granted') {
      storage.setBailDisposition(
        currentCase.id,
        `Bail Bond GHS ${bailAmount}. Sureties: ${bailSureties}. Notes: ${settlementNotes || statusNote}`
      );
    } else if (targetStatus === 'closed_withdrawn') {
      storage.setClosedDisposition(
        currentCase.id,
        statusNote || 'Complainant formal withdrawal affidavit accepted by DOVVSU / Station Command.'
      );
    } else {
      storage.updateCaseStatus(currentCase.id, targetStatus, statusNote);
    }

    setShowStatusModal(false);
    setStatusNote('');
    reloadCase();
  };

  const handleAddSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionTitle.trim() || !submissionContent.trim() || !currentUser) return;

    const isSeniorSubmission = submissionType === 'senior_endorsement' || submissionType === 'directive';
    const isCurrentSenior = isSeniorOfficer(currentUser);

    const seniorReviewer = isSeniorSubmission && !isCurrentSenior
      ? (seniorOfficers.find(o => o.id === selectedSeniorReviewerId) || seniorOfficers[0])
      : null;

    const subOfficerId = seniorReviewer ? seniorReviewer.id : currentUser.id;
    const subOfficerName = seniorReviewer ? seniorReviewer.name : currentUser.name;
    const subOfficerBadge = seniorReviewer ? seniorReviewer.badgeId : currentUser.badgeId;
    const subOfficerRank = seniorReviewer ? seniorReviewer.rank : currentUser.rank;
    const subOfficerRole = isSeniorSubmission ? 'senior_officer' : currentUser.role;

    let subContent = submissionContent.trim();
    if (isSeniorSubmission && !isCurrentSenior && seniorReviewer) {
      subContent += `\n\n[Supervisory Authority]: Endorsed under the statutory authority of Gazetted Senior Officer ${formatOfficerDisplayName(seniorReviewer.rank, seniorReviewer.name)} (${seniorReviewer.rank}). Dispatched and logged by ${formatOfficerDisplayName(currentUser.rank, currentUser.name)}.`;
    }

    storage.addSubmission(currentCase.id, {
      caseId: currentCase.id,
      officerId: subOfficerId,
      officerName: subOfficerName,
      officerBadge: subOfficerBadge,
      officerRank: subOfficerRank,
      officerRole: subOfficerRole,
      submissionType,
      title: submissionTitle.trim(),
      content: subContent,
      timestamp: new Date().toISOString(),
      mediaUrls: submissionPhotos.length > 0 ? submissionPhotos : undefined,
      isEndorsed: isSeniorSubmission || isCurrentSenior
    });

    setSubmissionTitle('');
    setSubmissionContent('');
    setSubmissionPhotos([]);
    setShowAddSubmission(false);
    reloadCase();
  };

  const handleAddEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceDesc.trim()) return;

    storage.addEvidence(currentCase.id, {
      caseId: currentCase.id,
      itemNumber: `EX-${currentCase.stationName.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      category: evidenceCategory,
      description: evidenceDesc.trim(),
      photoUrl: evidencePhotos.length > 0 ? evidencePhotos[0] : getPlaceholderImage('evidence', evidenceDesc),
      dateCollected: new Date().toISOString(),
      collectedByOfficerName: currentUser ? currentUser.name : 'CID Officer',
      storageLocker: evidenceLocker,
      chainOfCustodyLog: [
        {
          date: new Date().toISOString(),
          action: 'Item Registered in Exhibit Log with Photo Verification',
          officer: currentUser ? formatOfficerDisplayName(currentUser.rank, currentUser.name) : 'CID Investigator',
          reason: 'Initial Evidence Booking'
        }
      ]
    });

    setEvidenceDesc('');
    setEvidencePhotos([]);
    setShowAddEvidence(false);
    reloadCase();
  };

  const handleSaveCautionStatement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuspectForCaution) return;

    storage.updateSuspectCaution(currentCase.id, selectedSuspectForCaution.id, cautionStatementText);
    setSelectedSuspectForCaution(null);
    setCautionStatementText('');
    reloadCase();
  };

  // Stepper calculations
  const steps: Array<{ key: CaseStatus; label: string; sub: string }> = [
    { key: 'lodged', label: '1. Lodged', sub: 'Counter intake registered' },
    { key: 'under_investigation', label: '2. Under Investigation', sub: 'CID analysis & evidence' },
    { key: 'suspect_arrested', label: '3. Suspect Arrested', sub: 'In custody or caution' },
    {
      key: currentCase.status === 'forwarded_to_court'
        ? 'forwarded_to_court'
        : currentCase.status === 'bail_granted'
        ? 'bail_granted'
        : currentCase.status === 'closed_withdrawn'
        ? 'closed_withdrawn'
        : 'forwarded_to_court',
      label: '4. Final Disposition',
      sub: currentCase.status === 'forwarded_to_court'
        ? 'Forwarded to Court'
        : currentCase.status === 'bail_granted'
        ? 'Bail Granted'
        : currentCase.status === 'closed_withdrawn'
        ? 'Closed (Withdrawn)'
        : 'Court / Bail / Close'
    }
  ];

  const getStepIndex = (status: CaseStatus): number => {
    switch (status) {
      case 'lodged':
        return 0;
      case 'under_investigation':
        return 1;
      case 'suspect_arrested':
        return 2;
      case 'forwarded_to_court':
      case 'bail_granted':
      case 'closed_withdrawn':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(currentCase.status);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 hover:text-[#0A2A66] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Master Docket List</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Official Case Jacket</span>
          </button>

          {/* Role-based Status Update Button */}
          {currentUser && RBAC.canSetFinalDisposition(currentUser.role) && (
            <button
              onClick={() => {
                setTargetStatus(currentCase.status);
                setShowStatusModal(true);
              }}
              className="flex items-center space-x-1.5 text-xs font-bold text-white bg-[#0A2A66] hover:bg-[#071D49] px-3.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer border-b border-[#C9A227]"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Update Case Lifecycle State</span>
            </button>
          )}
        </div>
      </div>

      {/* Cross-Station Suspect Match Warning Banner (Prominent Alert) */}
      {suspectMatches.length > 0 && (
        <div className="bg-amber-500/15 border-2 border-amber-500 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-lg flex-shrink-0">
              <GitCompare className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">
                  ⚠️ Inter-Station Intelligence Alert: Suspect Match Correlated
                </h4>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {suspectMatches.length} Cross-Jurisdiction Matches
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                A suspect recorded on this docket matches identity records at another Ghana Police Divisional Command. Review correlation notes to prevent duplicate aliases and assist regional warrants.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {suspectMatches.map(m => (
                  <div
                    key={m.id}
                    className="bg-white/90 border border-amber-300 rounded-lg p-2.5 text-xs flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">
                        👤 {m.suspectName} {m.suspectAlias ? `("${m.suspectAlias}")` : ''}
                      </span>
                      <span className="text-[11px] text-amber-800 font-mono block">
                        {m.similarityReason}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Linked at: {m.matchedStationName}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectCase(m.matchedCaseId)}
                      className="ml-2 bg-[#0A2A66] hover:bg-blue-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded cursor-pointer transition-colors whitespace-nowrap"
                    >
                      View Docket →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-[#0A2A66] text-white p-5 border-b-4 border-[#C9A227] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-[#C9A227] bg-[#071D49] px-2.5 py-0.5 rounded border border-blue-900">
                {currentCase.docketNumber}
              </span>
              <span className="text-xs text-blue-200 font-medium">
                {currentCase.stationName}
              </span>
              {currentCase.isOfflineStaged ? (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded font-mono flex items-center shadow-xs">
                  <WifiOff className="w-3 h-3 mr-1" />
                  IndexedDB Staged (Pending Supabase Sync)
                </span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded font-mono flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                  Supabase Synced
                </span>
              )}
              {currentCase.syncConflictNote && (
                <span className="bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  Server Record Retained (Duplicate Conflict)
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-serif mt-1 text-white">
              {currentCase.offenceTitle}
            </h2>
            {currentCase.syncConflictNote && (
              <p className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded px-2.5 py-1 mt-1 font-mono">
                {currentCase.syncConflictNote}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              currentCase.priority === 'critical'
                ? 'bg-rose-600 text-white'
                : currentCase.priority === 'urgent'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-blue-800 text-blue-100'
            }`}>
              {currentCase.priority} Priority
            </span>

            <span className="bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded text-xs font-mono">
              Lodged: {new Date(currentCase.lodgedDateTime).toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* Visual Lifecycle Stepper (As requested) */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Official Case Lifecycle Progression
            </span>
            <span className="text-xs font-bold text-[#0A2A66] bg-blue-100 px-2.5 py-0.5 rounded-full">
              Current: {currentCase.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            {steps.map((st, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={st.key}
                  className={`p-3 rounded-lg border flex items-start space-x-2.5 transition-all ${
                    isCurrent
                      ? 'bg-[#0A2A66] text-white border-[#C9A227] shadow-sm'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full bg-[#C9A227] text-slate-950 text-[10px] font-extrabold flex items-center justify-center font-mono">
                        {idx + 1}
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className={`text-xs font-bold block ${isCurrent ? 'text-[#C9A227]' : ''}`}>
                      {st.label}
                    </span>
                    <span className={`text-[11px] block mt-0.5 ${isCurrent ? 'text-blue-100' : isPast ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {st.sub}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Criminal Offences Act, 1960 (Act 29) Statutory Citation Banner */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-[#C9A227] text-slate-950 rounded-lg flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-[#C9A227] uppercase tracking-wider font-mono">
                  Statutory Offence Reference: Criminal Offences Act, 1960 (Act 29)
                </span>
                {currentCase.act29Section && (
                  <span className="bg-blue-900/80 border border-blue-400 text-blue-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {currentCase.act29Section}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 font-semibold mt-0.5">
                {currentCase.statuteCitation || `Offence under Act 29/60 of the Laws of Ghana`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="text-slate-400 font-mono">Offence Code:</span>
            <span className="font-mono font-bold text-[#C9A227] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {currentCase.act29OffenceCode || 'ACT29-OFFENCE'}
            </span>
          </div>
        </div>

        {/* Key Summary Grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-slate-100 bg-white">
          <div>
            <span className="text-slate-400 uppercase font-bold block text-[10px]">Offence Category</span>
            <span className="font-bold text-slate-800 capitalize text-sm">
              {currentCase.offenceCategory.replace(/_/g, ' ')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold block text-[10px]">Incident Location</span>
            <span className="font-semibold text-slate-800 flex items-center mt-0.5">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
              {currentCase.locationDescription}
            </span>
            {typeof currentCase.latitude === 'number' && typeof currentCase.longitude === 'number' && (
              <span className="inline-block mt-1 font-mono text-[10px] font-bold bg-blue-50 text-[#0A2A66] border border-blue-200 px-2 py-0.5 rounded">
                GPS: {currentCase.latitude.toFixed(6)}, {currentCase.longitude.toFixed(6)}
              </span>
            )}
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold block text-[10px]">Officer In Charge (CID)</span>
            <span className="font-semibold text-slate-800 flex items-center mt-0.5">
              <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {currentCase.officerInChargeName ? formatOfficerDisplayName(undefined, currentCase.officerInChargeName) : 'Station Pool Officer'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase font-bold block text-[10px]">Incident Date / Time</span>
            <span className="font-mono text-slate-800 flex items-center mt-0.5">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {new Date(currentCase.incidentDateTime).toLocaleString('en-GB')}
            </span>
          </div>
        </div>

        {/* Incident Narrative */}
        <div className="p-5 bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1">
            Official Charge Sheet Statement of Facts
          </span>
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
            {currentCase.narrative}
          </p>
        </div>

        {/* Crime Scene Stills & Uploaded Intake Media */}
        {((currentCase.crimeScenePhotos && currentCase.crimeScenePhotos.length > 0) ||
          (currentCase.stolenPropertyPhotos && currentCase.stolenPropertyPhotos.length > 0)) && (
          <div className="p-5 bg-slate-100/70 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center">
                <Camera className="w-4 h-4 mr-1.5 text-[#0A2A66]" />
                Uploaded Crime Scene &amp; Property Photographs ({ (currentCase.crimeScenePhotos?.length || 0) + (currentCase.stolenPropertyPhotos?.length || 0) })
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Click photo to view high-resolution</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {currentCase.crimeScenePhotos?.map((photoUrl, idx) => (
                <div
                  key={`scene-${idx}`}
                  onClick={() => setSelectedImageModal({ url: photoUrl, title: `Crime Scene Photo #${idx + 1}`, category: 'Crime Scene Evidence' })}
                  className="group relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-300 shadow-xs cursor-pointer hover:border-[#0A2A66] transition-all"
                >
                  <img src={photoUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-1 left-1 text-[9px] bg-slate-950/80 text-white font-mono px-1 rounded">
                    Scene #{idx + 1}
                  </span>
                </div>
              ))}

              {currentCase.stolenPropertyPhotos?.map((photoUrl, idx) => (
                <div
                  key={`prop-${idx}`}
                  onClick={() => setSelectedImageModal({ url: photoUrl, title: `Stolen Property Exhibit #${idx + 1}`, category: 'Stolen Goods / Exhibits' })}
                  className="group relative aspect-video bg-amber-950 rounded-lg overflow-hidden border border-amber-400/50 shadow-xs cursor-pointer hover:border-amber-600 transition-all"
                >
                  <img src={photoUrl} alt={`Property ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    <Eye className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-1 left-1 text-[9px] bg-amber-900/90 text-amber-100 font-mono px-1 rounded">
                    Property #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Complainant Demographics Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-[#0A2A66]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Complainant Demographics &amp; Identity Record
            </h3>
          </div>

          {currentCase.complainant.ghanaCardScanUrl && (
            <button
              onClick={() => setSelectedImageModal({
                url: currentCase.complainant.ghanaCardScanUrl!,
                title: `Complainant Ghana Card Scan - ${currentCase.complainant.fullName}`,
                category: 'Complainant National ID Document Scan'
              })}
              className="flex items-center space-x-1.5 text-xs font-bold text-[#0A2A66] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#0A2A66]" />
              <span>View Ghana Card Scan</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            onClick={() => setSelectedImageModal({
              url: currentCase.complainant.photoUrl || getPlaceholderImage('complainant', currentCase.complainant.fullName),
              title: `Complainant Portrait - ${currentCase.complainant.fullName}`,
              category: 'Complainant Portrait Photo'
            })}
            className="w-16 h-16 rounded-lg bg-blue-900 border border-[#C9A227] flex-shrink-0 overflow-hidden shadow-xs cursor-pointer group relative"
          >
            <img
              src={currentCase.complainant.photoUrl || getPlaceholderImage('complainant', currentCase.complainant.fullName)}
              alt="Complainant"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <Eye className="w-4 h-4" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 flex-1 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
              <span className="font-bold text-slate-900 text-sm">{currentCase.complainant.fullName}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Ghana Card PIN</span>
              <span className="font-mono font-semibold text-slate-800">
                {currentCase.complainant.ghanaCardId || 'Not Recorded'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Telephone</span>
              <span className="font-mono text-slate-800 flex items-center">
                <Phone className="w-3 h-3 mr-1 text-slate-400" />
                {currentCase.complainant.phone}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Occupation</span>
              <span className="text-slate-800">{currentCase.complainant.occupation || 'Civilian'}</span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Residential Address</span>
              <span className="text-slate-800">{currentCase.complainant.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs for Case Sections */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'submissions'
                ? 'border-[#0A2A66] text-[#0A2A66] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Submissions &amp; Findings ({currentCase.submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suspects')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'suspects'
                ? 'border-[#0A2A66] text-[#0A2A66] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Suspects &amp; Caution Statements ({currentCase.suspects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'evidence'
                ? 'border-[#0A2A66] text-[#0A2A66] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Evidential Items &amp; Custody ({currentCase.evidence.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('witnesses')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'witnesses'
                ? 'border-[#0A2A66] text-[#0A2A66] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Witness Statements ({currentCase.witnessStatements.length})</span>
          </button>

          {currentCase.courtRecord && (
            <button
              onClick={() => setActiveTab('court')}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'court'
                  ? 'border-[#0A2A66] text-[#0A2A66] bg-white'
                  : 'border-transparent text-purple-700 hover:text-purple-900'
              }`}
            >
              <Scale className="w-4 h-4 text-purple-700" />
              <span>Court Proceedings &amp; Verdicts</span>
            </button>
          )}
        </div>

        {/* Tab 1: Three-Tier Submissions Log (Station Officer / Investigator / Senior Officer) */}
        {activeTab === 'submissions' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Role-Attributed Case Submissions &amp; Findings
                </h4>
                <p className="text-xs text-slate-500">
                  Chronological notes logged by Station Officers, CID Investigators, and Senior Officers.
                </p>
              </div>

              {currentUser && (
                <button
                  onClick={() => setShowAddSubmission(true)}
                  className="bg-[#0A2A66] hover:bg-[#071D49] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Log {currentUser.role === 'senior_officer' ? 'Command Directive' : 'Investigation Note'}</span>
                </button>
              )}
            </div>

            {/* Form to Add Submission */}
            {showAddSubmission && (
              <form onSubmit={handleAddSubmission} className="bg-slate-50 border border-slate-300 rounded-lg p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A2A66] uppercase">
                    New Submission ({formatOfficerDisplayName(currentUser?.rank, currentUser?.name)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddSubmission(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    ✕ Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Submission Type</label>
                    <select
                      value={submissionType}
                      onChange={e => setSubmissionType(e.target.value as SubmissionType)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value="initial_intake">Counter NCO / Station Officer Initial Intake Log</option>
                      <option value="investigation_finding">CID Investigator Finding &amp; Evidence Note</option>
                      <option value="senior_endorsement">Senior Commander Review / Endorsement</option>
                      <option value="directive">Supervisory Directive / Court Order</option>
                    </select>
                  </div>

                  {(submissionType === 'senior_endorsement' || submissionType === 'directive') && !isSeniorOfficer(currentUser) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Authorizing Senior Officer Rank (Reviewing Authority)
                      </label>
                      <select
                        value={selectedSeniorReviewerId}
                        onChange={e => setSelectedSeniorReviewerId(e.target.value)}
                        className="w-full bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-[#0A2A66]"
                      >
                        {seniorOfficers.map(spo => (
                          <option key={spo.id} value={spo.id}>
                            {formatOfficerDisplayName(spo.rank, spo.name)} — {spo.rank} ({spo.badgeId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Submission Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Crime Scene Reconstruction Findings"
                      value={submissionTitle}
                      onChange={e => setSubmissionTitle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Findings &amp; Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Enter formal findings, suspect remarks, witness verification details..."
                    value={submissionContent}
                    onChange={e => setSubmissionContent(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
                    required
                  />
                </div>

                <ImageUploadDropzone
                  label="Attach Investigation Scene / Document Photos (Optional)"
                  uploadedUrls={submissionPhotos}
                  onImagesChange={setSubmissionPhotos}
                  maxImages={3}
                  helpText="Upload CID field snapshots, recovery receipts, or crime scene stills (JPG, PNG)"
                />

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddSubmission(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0A2A66] hover:bg-[#071D49] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                  >
                    Save to Docket File
                  </button>
                </div>
              </form>
            )}

            {/* List of Submissions */}
            <div className="space-y-3">
              {currentCase.submissions.map(sub => {
                const isSenior = sub.officerRole === 'senior_officer' || sub.submissionType === 'senior_endorsement';
                const isInvestigator = sub.officerRole === 'investigator';

                return (
                  <div
                    key={sub.id}
                    className={`rounded-lg p-4 border transition-all ${
                      isSenior
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                        : isInvestigator
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200/60 pb-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isSenior
                            ? 'bg-emerald-700 text-white'
                            : isInvestigator
                            ? 'bg-amber-700 text-white'
                            : 'bg-[#0A2A66] text-white'
                        }`}>
                          {sub.submissionType.replace(/_/g, ' ')}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">{sub.title}</h5>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(sub.timestamp).toLocaleString('en-GB')}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {sub.content}
                    </p>

                    {/* Attached Submission Photos */}
                    {sub.mediaUrls && sub.mediaUrls.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
                          Attached Submission Evidence Photos ({sub.mediaUrls.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {sub.mediaUrls.map((url, uidx) => (
                            <div
                              key={uidx}
                              onClick={() => setSelectedImageModal({ url, title: `${sub.title} - Photo #${uidx + 1}`, category: 'Submission Attachment' })}
                              className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300 relative group cursor-pointer"
                            >
                              <img src={url} alt="Attached" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 flex items-center">
                        <User className="w-3 h-3 mr-1 text-[#0A2A66]" />
                        {formatOfficerDisplayName(sub.officerRank, sub.officerName)} ({sub.officerBadge})
                      </span>

                      {sub.isEndorsed && (
                        <span className="flex items-center text-emerald-700 font-bold">
                          <Award className="w-3 h-3 mr-1 text-emerald-600" />
                          Officially Endorsed by Command
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Suspects & Caution Statements */}
        {activeTab === 'suspects' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Suspect Roster &amp; Formal Caution Statements
                </h4>
                <p className="text-xs text-slate-500">
                  Arrest details, detention status, and Caution Statements recorded under police caution.
                </p>
              </div>
            </div>

            {currentCase.suspects.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No Suspects Yet Attached</p>
                <p>The CID investigator can attach suspects once identified during field inquiries.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentCase.suspects.map(susp => (
                  <div
                    key={susp.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          onClick={() => setSelectedImageModal({
                            url: susp.photoUrl || getPlaceholderImage('suspect', susp.fullName),
                            title: `Suspect Mugshot - ${susp.fullName}`,
                            category: 'Suspect Photographic Identity'
                          })}
                          className="w-14 h-14 rounded-lg bg-rose-950 border border-rose-800 overflow-hidden shadow-xs cursor-pointer relative group flex-shrink-0"
                        >
                          <img
                            src={susp.photoUrl || getPlaceholderImage('suspect', susp.fullName)}
                            alt={susp.fullName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="text-sm font-bold text-slate-900">{susp.fullName}</h5>
                            {susp.alias && (
                              <span className="text-[10px] bg-slate-200 text-slate-800 font-mono px-1.5 py-0.2 rounded font-bold">
                                alias "{susp.alias}"
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 space-x-2 mt-0.5">
                            <span>Ghana Card: <strong>{susp.ghanaCardId || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Age: <strong>{susp.approximateAge || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          susp.arrestStatus === 'remanded'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : susp.arrestStatus === 'arrested'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : susp.arrestStatus === 'bail_granted'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          Status: {susp.arrestStatus.replace(/_/g, ' ')}
                        </span>

                        {currentUser && RBAC.canRecordCautionStatement(currentUser.role) && (
                          <button
                            onClick={() => {
                              setSelectedSuspectForCaution(susp);
                              setCautionStatementText(susp.cautionStatement || '');
                            }}
                            className="bg-[#0A2A66] hover:bg-[#071D49] text-white text-xs font-bold px-3 py-1 rounded cursor-pointer transition-colors"
                          >
                            {susp.cautionStatement ? 'Edit Caution Statement' : '+ Record Caution Statement'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Caution Statement Box */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-700 uppercase flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-1 text-[#0A2A66]" />
                          Formal Caution Statement
                        </span>
                        {susp.cautionStatementTimestamp && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Recorded: {new Date(susp.cautionStatementTimestamp).toLocaleString('en-GB')}
                          </span>
                        )}
                      </div>

                      {susp.cautionStatement ? (
                        <p className="text-xs text-slate-800 leading-relaxed italic bg-slate-50 p-2.5 rounded border border-slate-200">
                          "{susp.cautionStatement}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No formal caution statement recorded yet for this suspect.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Caution Statement Edit Modal */}
            {selectedSuspectForCaution && (
              <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
                <form
                  onSubmit={handleSaveCautionStatement}
                  className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-300 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-[#0A2A66] uppercase">
                      Record Caution Statement: {selectedSuspectForCaution.fullName}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedSuspectForCaution(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900">
                    <strong>Statutory Caution Warning:</strong> "You are not obliged to say anything unless you wish to do so, but whatever you say will be taken down in writing and may be given in evidence."
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Suspect's Verbatim Statement / Remarks
                    </label>
                    <textarea
                      rows={5}
                      value={cautionStatementText}
                      onChange={e => setCautionStatementText(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs"
                      placeholder="Type verbatim statement given by suspect in presence of independent witness..."
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSuspectForCaution(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-[#0A2A66] hover:bg-[#071D49] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow"
                    >
                      Save Caution Statement
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Evidential Items Vault */}
        {activeTab === 'evidence' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Evidential Exhibits &amp; Chain of Custody
                </h4>
                <p className="text-xs text-slate-500">
                  Physical, digital, and documentary exhibits logged in the police evidence vault with photographic cataloging.
                </p>
              </div>

              {currentUser && RBAC.canAddEvidence(currentUser.role) && (
                <button
                  onClick={() => setShowAddEvidence(true)}
                  className="bg-[#0A2A66] hover:bg-[#071D49] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Add Exhibit Item</span>
                </button>
              )}
            </div>

            {/* Add Evidence Form Modal */}
            {showAddEvidence && (
              <form onSubmit={handleAddEvidenceSubmit} className="bg-slate-50 border border-slate-300 rounded-lg p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0A2A66] uppercase">Register New Exhibit</span>
                  <button type="button" onClick={() => setShowAddEvidence(false)} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Exhibit Category</label>
                    <select
                      value={evidenceCategory}
                      onChange={e => setEvidenceCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value="physical">Physical Exhibit (Weapon, Appliance, Cash)</option>
                      <option value="digital">Digital Media (CCTV, Phone Dump, USB)</option>
                      <option value="document">Documentary Evidence (Bank slip, Invoice, Contract)</option>
                      <option value="forensic">Forensic / Biological (Fingerprints, Ballistics)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Evidence Storage Vault Locker</label>
                    <input
                      type="text"
                      value={evidenceLocker}
                      onChange={e => setEvidenceLocker(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Exhibit Item Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide serial numbers, physical description, marks of identification..."
                    value={evidenceDesc}
                    onChange={e => setEvidenceDesc(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
                    required
                  />
                </div>

                <ImageUploadDropzone
                  label="Upload Exhibit Photo / Evidence Scan"
                  uploadedUrls={evidencePhotos}
                  onImagesChange={setEvidencePhotos}
                  maxImages={1}
                  helpText="Upload a crisp photograph of the exhibit item showing identifying markings"
                />

                <div className="flex justify-end space-x-2 pt-1">
                  <button type="button" onClick={() => setShowAddEvidence(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs">Cancel</button>
                  <button type="submit" className="bg-[#0A2A66] hover:bg-[#071D49] text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow">Save Exhibit</button>
                </div>
              </form>
            )}

            {currentCase.evidence.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Lock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No Exhibits Logged</p>
                <p>Attach physical or digital exhibits to maintain verified chain of custody.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentCase.evidence.map(ev => (
                  <div key={ev.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
                    <div className="flex items-start space-x-3">
                      <div
                        onClick={() => setSelectedImageModal({
                          url: ev.photoUrl || getPlaceholderImage('evidence', ev.description),
                          title: `Exhibit ${ev.itemNumber} - ${ev.description}`,
                          category: `Vault Exhibit (${ev.category.toUpperCase()})`
                        })}
                        className="w-16 h-16 rounded-lg bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden cursor-pointer relative group"
                      >
                        <img
                          src={ev.photoUrl || getPlaceholderImage('evidence', ev.description)}
                          alt="Evidence preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#0A2A66]">
                            {ev.itemNumber}
                          </span>
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded capitalize">
                            {ev.category}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                          {ev.description}
                        </p>
                        <span className="text-[11px] text-slate-500 block">
                          Locker: <strong>{ev.storageLocker}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Chain of custody logs */}
                    {ev.chainOfCustodyLog && ev.chainOfCustodyLog.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1">
                        <span className="font-bold text-slate-600 block text-[10px] uppercase font-mono">Chain of Custody History:</span>
                        {ev.chainOfCustodyLog.map((log, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-600">
                            <span>• {log.action} ({log.officer})</span>
                            <span className="text-[10px] font-mono text-slate-400">{new Date(log.date).toLocaleDateString('en-GB')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Witness Statements */}
        {activeTab === 'witnesses' && (
          <div className="p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">
                Verified Witness Statements
              </h4>
              <p className="text-xs text-slate-500">
                Formal eyewitness testimonies taken down by investigating officers.
              </p>
            </div>

            {currentCase.witnessStatements.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No Witness Statements Logged</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentCase.witnessStatements.map(wit => (
                  <div key={wit.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-bold text-xs text-slate-900">{wit.witnessName}</span>
                        <span className="text-[11px] text-slate-500 ml-2 font-mono">Contact: {wit.contact}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Recorded: {new Date(wit.dateRecorded).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 italic bg-white p-3 rounded border border-slate-200 leading-relaxed">
                      "{wit.statementText}"
                    </p>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span>Attesting Officer: <strong>{wit.recordedByOfficerName}</strong></span>
                      <span className="text-emerald-700 font-semibold flex items-center">
                        <Check className="w-3 h-3 mr-1" />
                        Verified Eyewitness
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Court Record */}
        {activeTab === 'court' && currentCase.courtRecord && (
          <div className="p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-purple-900 flex items-center">
                <Scale className="w-4 h-4 mr-1.5 text-purple-700" />
                Judicial Proceedings &amp; Court Trial Record
              </h4>
              <p className="text-xs text-slate-500">
                Official docket transcript filed with the Judicial Service of Ghana.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-purple-50/60 border border-purple-200 rounded-xl p-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Court / Division</span>
                <span className="font-bold text-purple-950 text-sm">{currentCase.courtRecord.courtName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Suit / Case File Number</span>
                <span className="font-mono font-bold text-purple-900">{currentCase.courtRecord.suitNumber}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Presiding Judge / Magistrate</span>
                <span className="font-semibold text-slate-800">{currentCase.courtRecord.presidingJudge || 'Circuit Court Magistrate'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Prosecuting Police Officer</span>
                <span className="text-slate-800">{currentCase.courtRecord.prosecutingOfficer}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">First Hearing Date</span>
                <span className="font-mono text-slate-800">
                  {new Date(currentCase.courtRecord.firstHearingDate).toLocaleDateString('en-GB')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Trial Verdict / Status</span>
                <span className="font-bold text-purple-800 uppercase">
                  {currentCase.courtRecord.finalOutcome?.replace(/_/g, ' ') || 'Pending Trial'}
                </span>
              </div>
            </div>

            {/* Proceedings History Log */}
            <div className="space-y-3 mt-4">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Court Proceedings Log</h5>
              {currentCase.courtRecord.proceedings.map(proc => (
                <div key={proc.id} className="bg-white border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-900">{proc.courtName}</span>
                    <span className="text-[11px] font-mono text-slate-500">{new Date(proc.date).toLocaleDateString('en-GB')}</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed">{proc.proceedingsSummary}</p>
                  {proc.nextAdjournmentDate && (
                    <div className="text-[11px] text-purple-800 font-semibold bg-purple-50 px-2 py-1 rounded border border-purple-200 inline-block mt-1">
                      📅 Next Adjournment Date: {new Date(proc.nextAdjournmentDate).toLocaleDateString('en-GB')} ({proc.adjournmentReason || 'Hearing'})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lifecycle Status Progression & Disposition Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleUpdateStatus}
            className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0A2A66] font-serif">
                  Advance Case Lifecycle State
                </h3>
                <p className="text-xs text-slate-500">
                  Docket: <span className="font-mono font-bold">{currentCase.docketNumber}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Target Lifecycle State:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'lodged', label: '1. Lodged (Counter Intake)' },
                  { key: 'under_investigation', label: '2. Under Investigation (CID)' },
                  { key: 'suspect_arrested', label: '3. Suspect Arrested' },
                  { key: 'forwarded_to_court', label: '4a. Forwarded to Court' },
                  { key: 'bail_granted', label: '4b. Bail Granted (Settlement)' },
                  { key: 'closed_withdrawn', label: '4c. Closed (Complainant Withdrawal)' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTargetStatus(opt.key as CaseStatus)}
                    className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all cursor-pointer ${
                      targetStatus === opt.key
                        ? 'bg-[#0A2A66] text-white border-[#C9A227] shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Final Disposition Details */}
            {targetStatus === 'forwarded_to_court' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3 animate-in fade-in">
                <span className="text-xs font-bold text-purple-950 uppercase block">
                  Judicial Court Forwarding Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Designated Court</label>
                    <input
                      type="text"
                      value={courtName}
                      onChange={e => setCourtName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Suit / Case Number</label>
                    <input
                      type="text"
                      value={suitNumber}
                      onChange={e => setSuitNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">First Hearing Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={courtDate}
                      onChange={e => setCourtDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Presiding Judge</label>
                    <input
                      type="text"
                      value={presidingJudge}
                      onChange={e => setPresidingJudge(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {targetStatus === 'bail_granted' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3 animate-in fade-in">
                <span className="text-xs font-bold text-emerald-950 uppercase block">
                  Police / Settlement Bail Bond Parameters
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bail Bond Amount (GHS)</label>
                    <input
                      type="number"
                      value={bailAmount}
                      onChange={e => setBailAmount(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Sureties Requirement</label>
                    <input
                      type="text"
                      value={bailSureties}
                      onChange={e => setBailSureties(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {targetStatus === 'closed_withdrawn' && (
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 space-y-2 animate-in fade-in">
                <span className="text-xs font-bold text-slate-900 uppercase block">
                  Complainant Formal Withdrawal Notice
                </span>
                <p className="text-[11px] text-slate-600">
                  Ensure the complainant has signed a formal withdrawal affidavit or DOVVSU peace bond before closing this docket.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Status Transition Note / Endorsement Remarks
              </label>
              <textarea
                rows={3}
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder="State the official grounds for this status progression..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#0A2A66] hover:bg-[#071D49] text-white px-5 py-2 rounded-lg text-xs font-bold shadow cursor-pointer border-b-2 border-[#C9A227]"
              >
                Confirm &amp; Update Docket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official Case Jacket Printable Modal */}
      {showPrintModal && (
        <PrintDocketModal
          caseRecord={currentCase}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* High-Resolution Media Lightbox Modal */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedImageModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-0 text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#0A2A66] p-4 border-b border-[#C9A227] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227] font-mono block">
                  {selectedImageModal.category || 'Police Evidential Image Asset'}
                </span>
                <h4 className="text-sm font-bold text-white">{selectedImageModal.title}</h4>
              </div>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={selectedImageModal.url}
                alt={selectedImageModal.title}
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain border border-slate-800 shadow-lg"
              />
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[11px]">
                Docket: {currentCase.docketNumber}
              </span>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="bg-[#C9A227] hover:bg-amber-500 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
