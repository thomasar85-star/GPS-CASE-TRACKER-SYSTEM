import React, { useState } from 'react';
import {
  FilePlus,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Camera,
  Upload,
  CheckCircle,
  FileCheck,
  Shield,
  Clock,
  Printer,
  Scale,
  BookOpen,
  Image as ImageIcon,
  Check,
  Sparkles,
  Info,
  UserCheck,
  ShieldCheck,
  Search,
  WifiOff,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { OffenceCategory, Officer, CaseStatus } from '../types';
import { storage } from '../services/storage';
import { getPlaceholderImage, RBAC, formatOfficerDisplayName, cleanOfficerName } from '../utils/security';
import {
  GHANA_ACT_29_OFFENCES,
  getAct29OffenceByCode,
  Act29OffenceDefinition
} from '../data/ghanaAct29Offences';
import { ImageUploadDropzone } from './ImageUploadDropzone';

interface LodgeComplaintViewProps {
  currentUser: Officer | null;
  onCaseCreated: (caseId: string) => void;
  onCancel: () => void;
}

export const LodgeComplaintView: React.FC<LodgeComplaintViewProps> = ({
  currentUser,
  onCaseCreated,
  onCancel
}) => {
  const stations = storage.getStations();
  const allOfficers = storage.getOfficers();
  const activeStation = currentUser
    ? stations.find(s => s.id === currentUser.stationId) || stations[0]
    : stations[0];

  // Auto-generate next docket number format
  const year = new Date().getFullYear();
  const stationCode = activeStation?.code || 'ACR';
  const randomDocketSeq = Math.floor(1000 + Math.random() * 9000);
  const autoDocketNumber = `GPS/${stationCode}/CR-${year}/${randomDocketSeq}`;

  // Form states
  const [docketNumber, setDocketNumber] = useState(autoDocketNumber);
  const [stationId, setStationId] = useState(activeStation.id);

  // Investigator Assignment State
  const defaultInvestigatorId = currentUser?.role === 'investigator'
    ? currentUser.id
    : (allOfficers.find(o => o.stationId === activeStation.id && o.role === 'investigator')?.id ||
       allOfficers.find(o => o.role === 'investigator')?.id ||
       'unassigned');

  const [assignedInvestigatorId, setAssignedInvestigatorId] = useState<string>(defaultInvestigatorId);
  const [isCustomInvestigator, setIsCustomInvestigator] = useState<boolean>(false);
  const [customInvestigatorName, setCustomInvestigatorName] = useState<string>('');
  const [customInvestigatorRank, setCustomInvestigatorRank] = useState<string>('Detective Inspector');
  const [customInvestigatorBadge, setCustomInvestigatorBadge] = useState<string>('');
  
  // Act 29/60 Statutory Selection
  const [selectedAct29Code, setSelectedAct29Code] = useState<string>('ACT29_SEC124');
  const activeAct29Offence = getAct29OffenceByCode(selectedAct29Code) || GHANA_ACT_29_OFFENCES[0];
  const [offenceCategory, setOffenceCategory] = useState<OffenceCategory>(activeAct29Offence.category);
  const [offenceTitle, setOffenceTitle] = useState('Stealing (Theft) contrary to Section 124 of Act 29/60');
  
  const [incidentDateTime, setIncidentDateTime] = useState(
    new Date(Date.now() - 3600000 * 2).toISOString().slice(0, 16)
  );
  const [locationDescription, setLocationDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [capturingGps, setCapturingGps] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [priority, setPriority] = useState<'low' | 'standard' | 'urgent' | 'critical'>('standard');

  // Complainant Details & Uploads
  const [complainantName, setComplainantName] = useState('');
  const [complainantGhanaCard, setComplainantGhanaCard] = useState('');
  const [complainantPhone, setComplainantPhone] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [complainantAddress, setComplainantAddress] = useState('');
  const [complainantGender, setComplainantGender] = useState<'male' | 'female' | 'other'>('male');
  const [complainantOccupation, setComplainantOccupation] = useState('');
  const [complainantPhotos, setComplainantPhotos] = useState<string[]>([]);
  const [complainantGhanaCardDocs, setComplainantGhanaCardDocs] = useState<string[]>([]);

  // Optional Suspect (if known at intake) & Uploads
  const [hasSuspect, setHasSuspect] = useState(false);
  const [suspectName, setSuspectName] = useState('');
  const [suspectAlias, setSuspectAlias] = useState('');
  const [suspectGhanaCard, setSuspectGhanaCard] = useState('');
  const [suspectAddress, setSuspectAddress] = useState('');
  const [suspectGender, setSuspectGender] = useState<'male' | 'female' | 'other'>('male');
  const [suspectApproxAge, setSuspectApproxAge] = useState<string>('');
  const [suspectPhotos, setSuspectPhotos] = useState<string[]>([]);
  const [suspectGhanaCardDocs, setSuspectGhanaCardDocs] = useState<string[]>([]);

  // Optional Witness & Uploads
  const [hasWitness, setHasWitness] = useState(false);
  const [witnessName, setWitnessName] = useState('');
  const [witnessContact, setWitnessContact] = useState('');
  const [witnessGhanaCard, setWitnessGhanaCard] = useState('');
  const [witnessStatement, setWitnessStatement] = useState('');
  const [witnessDocScans, setWitnessDocScans] = useState<string[]>([]);

  // Crime Scene & Exhibits Media Uploads
  const [crimeScenePhotos, setCrimeScenePhotos] = useState<string[]>([]);
  const [stolenPropertyPhotos, setStolenPropertyPhotos] = useState<string[]>([]);

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successCaseId, setSuccessCaseId] = useState<string | null>(null);

  // Handle Act 29 offence change
  const handleAct29Change = (code: string) => {
    setSelectedAct29Code(code);
    const offence = getAct29OffenceByCode(code);
    if (offence) {
      setOffenceCategory(offence.category);
      setOffenceTitle(`${offence.title} - ${offence.section} of Act 29/60`);
    }
  };

  const handleApplyChargeSheetTemplate = () => {
    if (!narrative) {
      setNarrative(
        `${activeAct29Offence.statementOfOffence}\n\nParticulars of Offence:\n${activeAct29Offence.particularsTemplate.replace('[Date]', new Date(incidentDateTime).toLocaleDateString('en-GB')).replace('[Location]', locationDescription || '[Incident Location]').replace('[Complainant Name]', complainantName || '[Complainant Name]')}`
      );
    } else {
      setNarrative(prev => `${activeAct29Offence.statementOfOffence}\n\n${prev}`);
    }
  };

  const handleCaptureGps = () => {
    setErrorMsg('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by this browser. Please enter coordinates manually.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setCapturingGps(false);
      },
      err => {
        setCapturingGps(false);
        setErrorMsg(`GPS capture failed (${err.message}). Enter latitude and longitude manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!complainantName.trim()) {
      setErrorMsg('Please enter complainant full name.');
      return;
    }
    if (!complainantPhone.trim()) {
      setErrorMsg('Please enter complainant contact phone number.');
      return;
    }
    if (!offenceTitle.trim()) {
      setErrorMsg('Please specify the offence title / charge summary under Act 29/60.');
      return;
    }
    if (!locationDescription.trim()) {
      setErrorMsg('Please provide the location of the incident.');
      return;
    }
    if (!narrative.trim()) {
      setErrorMsg('Please enter detailed incident statement / charge narrative.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedStation = stations.find(s => s.id === stationId) || activeStation;

      // Prepare Complainant with uploaded photos
      const complainant = {
        id: 'comp_' + Date.now(),
        fullName: complainantName.trim(),
        ghanaCardId: complainantGhanaCard.trim() || undefined,
        phone: complainantPhone.trim(),
        email: complainantEmail.trim() || undefined,
        address: complainantAddress.trim() || 'Not specified',
        gender: complainantGender,
        occupation: complainantOccupation.trim() || 'Unspecified',
        photoUrl: complainantPhotos.length > 0
          ? complainantPhotos[0]
          : getPlaceholderImage('complainant', complainantName || 'Complainant'),
        ghanaCardScanUrl: complainantGhanaCardDocs.length > 0 ? complainantGhanaCardDocs[0] : undefined
      };

      // Prepare Suspects if provided
      const suspects = [];
      if (hasSuspect && suspectName.trim()) {
        suspects.push({
          id: 'susp_' + Date.now(),
          fullName: suspectName.trim(),
          alias: suspectAlias.trim() || undefined,
          ghanaCardId: suspectGhanaCard.trim() || undefined,
          gender: suspectGender,
          approximateAge: suspectApproxAge ? parseInt(suspectApproxAge, 10) : undefined,
          address: suspectAddress.trim() || undefined,
          photoUrl: suspectPhotos.length > 0
            ? suspectPhotos[0]
            : getPlaceholderImage('suspect', suspectName),
          ghanaCardScanUrl: suspectGhanaCardDocs.length > 0 ? suspectGhanaCardDocs[0] : undefined,
          arrestStatus: 'wanted' as const,
          linkedCaseIds: []
        });
      }

      // Prepare Witness Statements if provided
      const witnessStatements = [];
      if (hasWitness && witnessName.trim() && witnessStatement.trim()) {
        witnessStatements.push({
          id: 'wit_' + Date.now(),
          caseId: '',
          witnessName: witnessName.trim(),
          contact: witnessContact.trim() || 'N/A',
          ghanaCardId: witnessGhanaCard.trim() || undefined,
          statementText: witnessStatement.trim(),
          documentScanUrl: witnessDocScans.length > 0 ? witnessDocScans[0] : undefined,
          dateRecorded: new Date().toISOString(),
          recordedByOfficerName: currentUser ? formatOfficerDisplayName(currentUser.rank, currentUser.name) : 'Counter Duty NCO',
          verified: true
        });
      }

      // Combine media URLs for initial intake
      const allIntakeMedia = [
        ...crimeScenePhotos,
        ...stolenPropertyPhotos,
        ...complainantPhotos,
        ...suspectPhotos
      ];

      // Resolve assigned investigator
      let invId: string | undefined = undefined;
      let invName: string | undefined = undefined;
      let invBadge: string | undefined = undefined;

      if (isCustomInvestigator && customInvestigatorName.trim()) {
        invId = 'off_ext_' + Date.now();
        invName = formatOfficerDisplayName(customInvestigatorRank, customInvestigatorName.trim());
        invBadge = customInvestigatorBadge.trim() || 'GPS-CID-EXT';
      } else if (assignedInvestigatorId && assignedInvestigatorId !== 'unassigned') {
        const selectedOff = allOfficers.find(o => o.id === assignedInvestigatorId);
        if (selectedOff) {
          invId = selectedOff.id;
          invName = formatOfficerDisplayName(selectedOff.rank, selectedOff.name);
          invBadge = selectedOff.badgeId;
        }
      }

      const assignmentSummary = invName
        ? ` Case assigned to Lead CID Investigator: ${invName} (${invBadge || 'Badge Pending'}).`
        : ' Case placed in Station Pool for Station Officer investigator allocation.';

      // Initial Intake Submission
      const initialSubmission = {
        id: 'sub_' + Date.now(),
        caseId: '',
        officerId: currentUser?.id || 'off_temp',
        officerName: currentUser?.name || 'Counter Duty NCO',
        officerBadge: currentUser?.badgeId || 'GPS-NCO-01',
        officerRank: currentUser?.rank || 'General Constable',
        officerRole: (currentUser?.role || 'counter_nco'),
        submissionType: 'initial_intake' as const,
        title: `Initial Counter Complaint Lodged (${activeAct29Offence.section} of Act 29/60)`,
        content: `Complaint registered in Counter Diary & Station Charge Book by ${currentUser ? formatOfficerDisplayName(currentUser.rank, currentUser.name) : 'Counter Duty NCO'}. Incident classified under Criminal Offences Act, 1960 (Act 29/60), ${activeAct29Offence.section} (${activeAct29Offence.title}). Location: ${locationDescription.trim()}.${assignmentSummary} Complainant statement and uploaded photographic exhibits recorded.`,
        timestamp: new Date().toISOString(),
        mediaUrls: allIntakeMedia
      };

      const initialStatus: CaseStatus = invName ? 'under_investigation' : 'lodged';

      const parsedLat = latitude.trim() ? Number(latitude.trim()) : undefined;
      const parsedLng = longitude.trim() ? Number(longitude.trim()) : undefined;

      const created = storage.createCase({
        docketNumber: docketNumber.trim(),
        offenceCategory,
        offenceTitle: offenceTitle.trim(),
        act29OffenceCode: activeAct29Offence.code,
        act29Section: activeAct29Offence.section,
        statuteCitation: activeAct29Offence.statementOfOffence,
        incidentDateTime: new Date(incidentDateTime).toISOString(),
        lodgedDateTime: new Date().toISOString(),
        stationId: selectedStation.id,
        stationName: selectedStation.name,
        locationDescription: locationDescription.trim(),
        latitude: parsedLat !== undefined && Number.isFinite(parsedLat) ? parsedLat : undefined,
        longitude: parsedLng !== undefined && Number.isFinite(parsedLng) ? parsedLng : undefined,
        narrative: narrative.trim(),
        complainant,
        suspects,
        evidence: [],
        witnessStatements,
        submissions: [initialSubmission],
        status: initialStatus,
        statusUpdatedAt: new Date().toISOString(),
        priority,
        officerInChargeId: invId,
        officerInChargeName: invName,
        officerInChargeBadge: invBadge,
        crimeScenePhotos,
        stolenPropertyPhotos,
        isSynthetic: true
      });

      setSuccessCaseId(created.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lodge complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedInvestigator = allOfficers.find(o => o.id === assignedInvestigatorId);
  const stationInvestigators = allOfficers.filter(o => o.stationId === stationId && o.role === 'investigator');
  const otherInvestigators = allOfficers.filter(o => o.stationId !== stationId && o.role === 'investigator');
  const stationSupervisors = allOfficers.filter(o => o.stationId === stationId && o.role !== 'investigator');
  const otherOfficers = allOfficers.filter(o => o.stationId !== stationId && o.role !== 'investigator');

  if (successCaseId) {
    const createdCase = storage.getCaseById(successCaseId);
    const isOffline = createdCase?.isOfflineStaged;

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm max-w-2xl mx-auto text-center space-y-5">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
          isOffline ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
        }`}>
          {isOffline ? <WifiOff className="w-9 h-9" /> : <CheckCircle className="w-10 h-10" />}
        </div>

        <div>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            isOffline
              ? 'text-amber-800 bg-amber-50 border-amber-200'
              : 'text-emerald-800 bg-emerald-50 border-emerald-200'
          }`}>
            {isOffline ? 'Case Staged Locally (Offline Mode)' : 'Case Successfully Lodged Under Act 29/60 of 1960'}
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 font-serif mt-2">
            Ghana Police Docket {isOffline ? 'Saved Offline' : 'Registered'}
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-sm mx-auto mt-3 space-y-1.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Official Docket Number:</span>
            <span className="text-xl font-mono font-black text-[#0A2A66]">{docketNumber}</span>
            {createdCase?.officerInChargeName && (
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-1.5 flex-shrink-0" />
                <span className="text-slate-500 mr-1">Assigned Investigator:</span>
                <span className="font-bold text-[#0A2A66]">{createdCase.officerInChargeName}</span>
                {createdCase.officerInChargeBadge && (
                  <span className="ml-1.5 font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">
                    {createdCase.officerInChargeBadge}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-700">
            <span className="text-[#0A2A66] font-bold">Statute:</span> {activeAct29Offence.actTitle} • {activeAct29Offence.section} ({activeAct29Offence.classification})
          </div>
        </div>

        <p className="text-sm text-slate-600">
          {isOffline ? (
            <>This case docket, complainant statement, and uploaded photo exhibits have been <strong>securely saved in offline storage</strong> on this device. It is queued in the sync manifest and will <strong>automatically upload to the Central Police HQ CID Server</strong> when connectivity is established.</>
          ) : createdCase?.officerInChargeName ? (
            <>The case docket and all uploaded photographic evidence have been assigned to <strong>{createdCase.officerInChargeName}</strong> and placed in <strong>"Under Investigation"</strong> status.</>
          ) : (
            <>The case docket and all uploaded photographic evidence have been securely filed in the <strong>"Lodged"</strong> state and staged for CID investigator assignment.</>
          )}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-3">
          <button
            onClick={() => onCaseCreated(successCaseId)}
            className="bg-[#0A2A66] hover:bg-[#071D49] text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow cursor-pointer transition-colors flex items-center justify-center space-x-2 border-b-2 border-[#C9A227]"
          >
            <FileCheck className="w-4 h-4 text-[#C9A227]" />
            <span>Open Case Lifecycle Docket</span>
          </button>

          <button
            onClick={() => {
              setSuccessCaseId(null);
              setOffenceTitle('Stealing (Theft) contrary to Section 124 of Act 29/60');
              setNarrative('');
              setComplainantName('');
              setComplainantPhone('');
              setComplainantPhotos([]);
              setComplainantGhanaCardDocs([]);
              setSuspectPhotos([]);
              setCrimeScenePhotos([]);
              setStolenPropertyPhotos([]);
              setDocketNumber(`GPS/${stationCode}/CR-${year}/${Math.floor(1000 + Math.random() * 9000)}`);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            Lodge Another Complaint
          </button>
        </div>
      </div>
    );
  }

  const isCurrentOnline = storage.isAppOnline();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Offline Mode Alert in Lodge Form */}
      {!isCurrentOnline && (
        <div className="bg-amber-50 border-2 border-amber-400/80 rounded-xl p-4 text-xs text-amber-950 flex items-start space-x-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-200 text-amber-900 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-amber-900 flex items-center space-x-2">
              <span>Offline-First Staging Mode Active</span>
              <span className="bg-amber-200/80 text-amber-900 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                Zero Data Loss Guaranteed
              </span>
            </div>
            <p className="text-amber-800 mt-1">
              You can proceed to fill out all complainant particulars, capture statements, and upload photographic exhibits. Everything is saved in encrypted local station storage and will automatically upload and sync with Central CID HQ as soon as network connection is restored.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0A2A66] text-white rounded-xl p-5 border-b-4 border-[#C9A227] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900 border border-[#C9A227] flex items-center justify-center text-[#C9A227]">
            <FilePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold font-serif uppercase">Lodge Official Police Complaint</h2>
              {currentUser?.role === 'counter_nco' && (
                <span className="bg-amber-400/20 text-[#C9A227] border border-[#C9A227]/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Counter NCO Desk
                </span>
              )}
              {currentUser?.role === 'station_officer' && (
                <span className="bg-blue-400/20 text-blue-200 border border-blue-400/40 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Station Officer Supervision
                </span>
              )}
            </div>
            <p className="text-xs text-blue-200">
              Criminal Code Registry • Criminal Offences Act, 1960 (Act 29/60 of 1960 of Ghana)
            </p>
          </div>
        </div>

        <div className="bg-[#071D49] border border-blue-800 rounded-lg px-3 py-1.5 text-right">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Intake Officer / Station:</span>
          <span className="text-xs font-bold text-[#C9A227]">
            {currentUser ? `${currentUser.rank} ${currentUser.name}` : activeStation.name}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded-lg text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Docket & Station Allocation & Investigator Assignment */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#0A2A66]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Docket, Station Allocation &amp; CID Investigator Assignment
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-[#0A2A66] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              GPS Command Registry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Docket Number (Auto-Generated)
              </label>
              <input
                type="text"
                value={docketNumber}
                onChange={e => setDocketNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#0A2A66]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Police Station / Divisional Command
              </label>
              <select
                value={stationId}
                onChange={e => setStationId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800"
              >
                {stations.map(stn => (
                  <option key={stn.id} value={stn.id}>
                    {stn.name} ({stn.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Case Priority / Urgency
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800"
              >
                <option value="standard">Standard Priority</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical / Armed Felony</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Assigned Lead Investigator / CID Detective Field */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-[#0A2A66]" />
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Assign Case to Lead CID Investigator / Detective
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Designate the investigator in charge of docket progression and caution statements.
                  </p>
                </div>
              </div>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomInvestigator(false);
                    setAssignedInvestigatorId(currentUser.id);
                  }}
                  className="self-start sm:self-auto bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded shadow-xs cursor-pointer flex items-center space-x-1 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0A2A66]" />
                  <span>Assign to Myself ({currentUser.rank})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Lead Investigator / Officer in Charge
                </label>
                <select
                  value={isCustomInvestigator ? 'custom' : assignedInvestigatorId}
                  onChange={e => {
                    if (e.target.value === 'custom') {
                      setIsCustomInvestigator(true);
                    } else {
                      setIsCustomInvestigator(false);
                      setAssignedInvestigatorId(e.target.value);
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-900 focus:border-[#0A2A66] focus:outline-hidden shadow-xs"
                >
                  <option value="unassigned">-- Unassigned (Station Pool / Pending Allocation) --</option>
                  
                  {stationInvestigators.length > 0 && (
                    <optgroup label="📍 Station CID Detectives (Recommended)">
                      {stationInvestigators.map(off => (
                        <option key={off.id} value={off.id}>
                          {formatOfficerDisplayName(off.rank, off.name)} • {off.badgeId} (CID)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {otherInvestigators.length > 0 && (
                    <optgroup label="🛡️ Other Divisional CID Investigators">
                      {otherInvestigators.map(off => (
                        <option key={off.id} value={off.id}>
                          {formatOfficerDisplayName(off.rank, off.name)} • {off.badgeId} ({off.stationName.split(' ')[0]})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {stationSupervisors.length > 0 && (
                    <optgroup label="🏢 Station Supervisory &amp; Desk Officers">
                      {stationSupervisors.map(off => (
                        <option key={off.id} value={off.id}>
                          {formatOfficerDisplayName(off.rank, off.name)} • {off.badgeId}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {otherOfficers.length > 0 && (
                    <optgroup label="👥 Other General Police Officers">
                      {otherOfficers.map(off => (
                        <option key={off.id} value={off.id}>
                          {formatOfficerDisplayName(off.rank, off.name)} • {off.badgeId}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="✏️ Custom Assignment">
                    <option value="custom">+ Enter External Detective / Strike Force Officer...</option>
                  </optgroup>
                </select>
              </div>

              {/* Investigator Preview or Custom Inputs */}
              {isCustomInvestigator ? (
                <div className="bg-white border border-slate-300 rounded-lg p-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">
                    Custom External Detective Particulars
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block">Rank</label>
                      <input
                        type="text"
                        value={customInvestigatorRank}
                        onChange={e => setCustomInvestigatorRank(e.target.value)}
                        placeholder="e.g. Det. Inspector"
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 block">Full Name</label>
                      <input
                        type="text"
                        value={customInvestigatorName}
                        onChange={e => setCustomInvestigatorName(e.target.value)}
                        placeholder="e.g. Kofi Mensah Darko"
                        className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block">Service Badge / CID PIN</label>
                    <input
                      type="text"
                      value={customInvestigatorBadge}
                      onChange={e => setCustomInvestigatorBadge(e.target.value)}
                      placeholder="e.g. GPS-CID-9912"
                      className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              ) : selectedInvestigator ? (
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center space-x-3 shadow-xs">
                  <div className="w-10 h-10 rounded-lg bg-[#0A2A66] text-[#C9A227] flex items-center justify-center font-black font-mono text-xs flex-shrink-0 border border-blue-900">
                    {selectedInvestigator.rank.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {formatOfficerDisplayName(selectedInvestigator.rank, selectedInvestigator.name)}
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {selectedInvestigator.badgeId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {selectedInvestigator.role === 'investigator' ? 'Criminal Investigation Dept. (CID)' : 'General Police Duties'} • {selectedInvestigator.phone}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                      Station: {selectedInvestigator.stationName}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div className="text-xs text-amber-900">
                    <span className="font-bold block">Case Pending Investigator Assignment</span>
                    <p className="text-[11px] text-amber-800">
                      Docket will be lodged into the station pool for CID allocation by the Station Officer.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Statutory Offence under Act 29/60 of 1960 */}
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4 border-l-4 border-l-[#0A2A66]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#0A2A66]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Offence Classification: Criminal Offences Act, 1960 (Act 29/60 of Ghana)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-[#C9A227] bg-[#0A2A66] px-2.5 py-0.5 rounded font-mono">
              Ghana Legal Statute
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Select Act 29/60 Offence &amp; Statutory Section *
              </label>
              <select
                value={selectedAct29Code}
                onChange={e => handleAct29Change(e.target.value)}
                className="w-full bg-blue-50/50 border-2 border-[#0A2A66] rounded-lg px-3 py-2.5 text-xs font-bold text-[#0A2A66] focus:outline-hidden"
              >
                {GHANA_ACT_29_OFFENCES.map(off => (
                  <option key={off.code} value={off.code}>
                    {off.section}: {off.title} ({off.classification})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Offence Summary Header / Charge Title *
              </label>
              <input
                type="text"
                value={offenceTitle}
                onChange={e => setOffenceTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                required
              />
            </div>
          </div>

          {/* Statutory Offence Legal Card Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="text-xs font-black text-[#0A2A66]">
                  {activeAct29Offence.actTitle} • {activeAct29Offence.section}
                </span>
                <p className="text-[11px] text-slate-600">{activeAct29Offence.title}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  activeAct29Offence.classification === 'First Degree Felony'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : activeAct29Offence.classification === 'Second Degree Felony'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {activeAct29Offence.classification}
                </span>

                <button
                  type="button"
                  onClick={handleApplyChargeSheetTemplate}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <BookOpen className="w-3 h-3 text-[#0A2A66]" />
                  <span>Insert Charge Sheet Template</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
                  Formal Statement of Offence (Ghana Charge Sheet):
                </span>
                <p className="text-xs text-slate-800 font-semibold mt-0.5 italic">
                  "{activeAct29Offence.statementOfOffence}"
                </p>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block font-mono">
                  Statutory Punishment Guideline:
                </span>
                <p className="text-xs text-slate-700 mt-0.5">
                  {activeAct29Offence.punishmentSummary}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block font-mono mb-1">
                Statutory Legal Elements Required for CID Docket Proof:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeAct29Offence.elements.map((el, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium"
                  >
                    <Check className="w-2.5 h-2.5 text-emerald-600 mr-1" />
                    {el}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Complainant Identification & Uploads */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-[#0A2A66]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              3. Complainant Identification &amp; Photo / ID Upload
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Complainant Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Kwame Mensah Adom"
                value={complainantName}
                onChange={e => setComplainantName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghana Card PIN
              </label>
              <input
                type="text"
                placeholder="GHA-XXXXXXXXX-X"
                value={complainantGhanaCard}
                onChange={e => setComplainantGhanaCard(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Telephone *
              </label>
              <input
                type="tel"
                placeholder="+233 24 123 4567"
                value={complainantPhone}
                onChange={e => setComplainantPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="complainant@example.com"
                value={complainantEmail}
                onChange={e => setComplainantEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={complainantGender}
                onChange={e => setComplainantGender(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Occupation
              </label>
              <input
                type="text"
                placeholder="e.g. Civil Servant / Trader / Teacher"
                value={complainantOccupation}
                onChange={e => setComplainantOccupation(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Residential / Business Address
            </label>
            <input
              type="text"
              placeholder="e.g. House No. B24/11, Adabraka, Accra"
              value={complainantAddress}
              onChange={e => setComplainantAddress(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          {/* Complainant Image Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <ImageUploadDropzone
              id="complainant_photo_upload"
              label="Complainant Facial Photo Upload"
              sublabel="Upload direct portrait photo or capture via camera"
              helperText="Click or drag portrait photo file here."
              currentImages={complainantPhotos}
              onImagesChange={setComplainantPhotos}
              singleMode={true}
              presetCategory="complainant"
              presetLabel="Complainant Portrait"
              previewHeightClass="h-28"
            />

            <ImageUploadDropzone
              id="complainant_id_doc_upload"
              label="Ghana Card / National ID Document Scan"
              sublabel="Upload photo of physical Ghana Card / Passport"
              helperText="Click or drag ID document scan file here."
              currentImages={complainantGhanaCardDocs}
              onImagesChange={setComplainantGhanaCardDocs}
              singleMode={true}
              presetCategory="document"
              presetLabel="Ghana Card Document"
              previewHeightClass="h-28"
            />
          </div>
        </div>

        {/* Section 4: Incident Details & Narrative */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <MapPin className="w-4 h-4 text-[#0A2A66]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              4. Incident Location, Timing &amp; Statement of Facts
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Incident Date &amp; Time *
              </label>
              <input
                type="datetime-local"
                value={incidentDateTime}
                onChange={e => setIncidentDateTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Exact Incident Location &amp; Landmark *
              </label>
              <input
                type="text"
                placeholder="e.g. Behind Kaneshie Main Market, near Station 3 Loading Bay"
                value={locationDescription}
                onChange={e => setLocationDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                required
              />
            </div>
          </div>

          {/* GPS Coordinates Row */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-[#0A2A66]" />
                GPS Location Coordinates (Latitude, Longitude)
              </span>
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={capturingGps}
                className="text-[11px] font-bold text-[#0A2A66] bg-white hover:bg-blue-50 border border-[#0A2A66]/40 px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                {capturingGps ? 'Capturing GPS...' : 'Use Current GPS Location'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="e.g. 5.603717"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="e.g. -0.186964"
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Full Incident Statement / Charge Narrative *
              </label>
              <button
                type="button"
                onClick={handleApplyChargeSheetTemplate}
                className="text-[11px] text-[#0A2A66] hover:underline font-semibold"
              >
                + Insert Act 29/60 Statement of Offence Header
              </button>
            </div>
            <textarea
              rows={5}
              placeholder="Describe what occurred in detail as narrated by the complainant, including damaged property, value involved, and actions taken..."
              value={narrative}
              onChange={e => setNarrative(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-sans"
              required
            />
          </div>
        </div>

        {/* Section 5: Suspect Information & Uploads (Optional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                5. Suspect Information &amp; Mugshot Upload (If Known)
              </h3>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-[#0A2A66]">
              <input
                type="checkbox"
                checked={hasSuspect}
                onChange={e => setHasSuspect(e.target.checked)}
                className="w-4 h-4 text-[#0A2A66] rounded cursor-pointer"
              />
              <span>Suspect Identified at Intake</span>
            </label>
          </div>

          {hasSuspect ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Suspect Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kwadwo Mensah"
                    value={suspectName}
                    onChange={e => setSuspectName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    required={hasSuspect}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alias / Street Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Red Scorpion / Spider"
                    value={suspectAlias}
                    onChange={e => setSuspectAlias(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghana Card PIN</label>
                  <input
                    type="text"
                    placeholder="GHA-XXXXXXXXX-X"
                    value={suspectGhanaCard}
                    onChange={e => setSuspectGhanaCard(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approximate Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={suspectApproxAge}
                    onChange={e => setSuspectApproxAge(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Known Address / Hideout / Town</label>
                <input
                  type="text"
                  placeholder="e.g. Near Agbogbloshie timber market, Accra"
                  value={suspectAddress}
                  onChange={e => setSuspectAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              {/* Suspect Photo Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <ImageUploadDropzone
                  id="suspect_photo_upload"
                  label="Suspect Mugshot / Photo Upload"
                  sublabel="Upload suspect photo or surveillance still"
                  helperText="Click or drag suspect photo file here."
                  currentImages={suspectPhotos}
                  onImagesChange={setSuspectPhotos}
                  singleMode={true}
                  presetCategory="suspect"
                  presetLabel="Suspect Mugshot"
                  previewHeightClass="h-28"
                />

                <ImageUploadDropzone
                  id="suspect_id_doc_upload"
                  label="Suspect ID / Document Scan"
                  sublabel="Upload photo of recovered ID or docket card"
                  helperText="Click or drag ID document scan here."
                  currentImages={suspectGhanaCardDocs}
                  onImagesChange={setSuspectGhanaCardDocs}
                  singleMode={true}
                  presetCategory="document"
                  presetLabel="Suspect ID Card"
                  previewHeightClass="h-28"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No suspect identified at initial counter intake. Suspect details can be logged later by the CID Investigator.
            </p>
          )}
        </div>

        {/* Section 6: Crime Scene Photos & Physical Evidence / Exhibit Stills Uploads */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Camera className="w-4 h-4 text-[#0A2A66]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              6. Crime Scene Photos &amp; Physical Evidence Upload (Officer Image Lodging)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ImageUploadDropzone
              id="crime_scene_photos_upload"
              label="Crime Scene Photos &amp; Incident Stills"
              sublabel="Upload point of entry, structural damages, or scene overviews"
              helperText="Upload multiple crime scene photos (JPG, PNG, WEBP)."
              currentImages={crimeScenePhotos}
              onImagesChange={setCrimeScenePhotos}
              singleMode={false}
              maxFiles={8}
              presetCategory="scene"
              presetLabel="Scene Point of Entry"
              previewHeightClass="h-24"
            />

            <ImageUploadDropzone
              id="stolen_property_evidence_upload"
              label="Stolen Goods / Recovered Exhibit Photos"
              sublabel="Upload photos of recovered weapons, cash, receipts, damaged locks"
              helperText="Upload multiple exhibit photos (JPG, PNG, WEBP)."
              currentImages={stolenPropertyPhotos}
              onImagesChange={setStolenPropertyPhotos}
              singleMode={false}
              maxFiles={8}
              presetCategory="evidence"
              presetLabel="Recovered Physical Exhibit"
              previewHeightClass="h-24"
            />
          </div>
        </div>

        {/* Section 7: Witness Statement & Document Scan (Optional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-[#0A2A66]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                7. Witness Statement &amp; Signed Document Upload (Optional)
              </h3>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-[#0A2A66]">
              <input
                type="checkbox"
                checked={hasWitness}
                onChange={e => setHasWitness(e.target.checked)}
                className="w-4 h-4 text-[#0A2A66] rounded cursor-pointer"
              />
              <span>Witness Present at Counter</span>
            </label>
          </div>

          {hasWitness ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Witness Full Name *</label>
                  <input
                    type="text"
                    placeholder="Witness Full Name"
                    value={witnessName}
                    onChange={e => setWitnessName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    required={hasWitness}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Witness Telephone</label>
                  <input
                    type="tel"
                    placeholder="+233 20 000 0000"
                    value={witnessContact}
                    onChange={e => setWitnessContact(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghana Card PIN</label>
                  <input
                    type="text"
                    placeholder="GHA-XXXXXXXXX-X"
                    value={witnessGhanaCard}
                    onChange={e => setWitnessGhanaCard(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Witness Statement Summary</label>
                <textarea
                  rows={3}
                  placeholder="Record brief initial witness testimony as narrated to the counter officer..."
                  value={witnessStatement}
                  onChange={e => setWitnessStatement(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
                  required={hasWitness}
                />
              </div>

              <ImageUploadDropzone
                id="witness_doc_scan_upload"
                label="Witness Handwritten Statement Scan / Photo"
                sublabel="Upload photo of handwritten witness statement form"
                helperText="Upload image of signed statement sheet."
                currentImages={witnessDocScans}
                onImagesChange={setWitnessDocScans}
                singleMode={true}
                presetCategory="document"
                presetLabel="Handwritten Witness Statement"
                previewHeightClass="h-24"
              />
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No witness present at initial intake. Witness depositions can be recorded during CID investigation.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel &amp; Return to Dashboard
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto font-bold text-xs px-6 py-2.5 rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 border-b-2 ${
                isCurrentOnline
                  ? 'bg-[#0A2A66] hover:bg-[#071D49] text-white border-[#C9A227]'
                  : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-900'
              }`}
            >
              {isCurrentOnline ? (
                <FileCheck className="w-4 h-4 text-[#C9A227]" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-200" />
              )}
              <span>
                {isSubmitting
                  ? isCurrentOnline
                    ? 'Registering Docket under Act 29/60...'
                    : 'Staging Docket Locally...'
                  : isCurrentOnline
                  ? 'Submit & Lodge Case Docket'
                  : 'Stage & Save Docket Offline (Ready for Sync)'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
