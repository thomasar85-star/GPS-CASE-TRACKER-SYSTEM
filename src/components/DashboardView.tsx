import React, { useState } from 'react';
import {
  FolderLock,
  Scale,
  Users,
  Lock,
  Clock,
  AlertTriangle,
  GitCompare,
  ArrowRight,
  Plus,
  Search,
  Building2,
  Calendar,
  Eye,
  Sliders,
  Filter,
  ShieldCheck,
  MapPin,
  Navigation as NavigationIcon,
  CheckCircle2,
  X,
  RefreshCw
} from 'lucide-react';
import { OffenceCategory, ActiveView, Officer } from '../types';
import { storage } from '../services/storage';
import { getPlaceholderImage, formatOfficerDisplayName } from '../utils/security';
import { CasesMap } from './CasesMap';

interface DashboardViewProps {
  onNavigate: (view: ActiveView) => void;
  onSelectCase: (caseId: string) => void;
  onSelectCategory: (category: OffenceCategory) => void;
  currentUser: Officer | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onSelectCase,
  onSelectCategory,
  currentUser
}) => {
  const cases = storage.getCases();
  const stations = storage.getStations();
  const metrics = storage.getDashboardMetrics();
  const agingCases = storage.getAgingCases();
  const suspectMatches = storage.findCrossStationMatches();
  const [agingThreshold, setAgingThreshold] = useState(storage.getAgingThreshold());
  const [showThresholdEditor, setShowThresholdEditor] = useState(false);

  // Quick Add Case Form States
  const [showQuickAdd, setShowQuickAdd] = useState(true);
  const [victimName, setVictimName] = useState('');
  const [suspectName, setSuspectName] = useState('');
  const [offenceCategory, setOffenceCategory] = useState<OffenceCategory>('theft');
  const [offenceTitle, setOffenceTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [gpsStatus, setGpsStatus] = useState('');
  const [capturingGps, setCapturingGps] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  const [quickAddSuccess, setQuickAddSuccess] = useState<string | null>(null);
  const [mapSelectedCaseId, setMapSelectedCaseId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshCases = async () => {
    setIsRefreshing(true);
    try {
      await storage.refreshFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleThresholdChange = (newVal: number) => {
    setAgingThreshold(newVal);
    storage.setAgingThreshold(newVal);
  };

  const handleCaptureGps = () => {
    setQuickAddError('');
    setGpsStatus('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setQuickAddError('Geolocation is not supported by this browser. Enter latitude and longitude manually.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsStatus(`GPS locked (±${Math.round(pos.coords.accuracy)}m accuracy)`);
        setCapturingGps(false);
      },
      err => {
        setCapturingGps(false);
        setQuickAddError(
          `Unable to read device GPS (${err.message}). You can enter latitude and longitude manually.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleQuickAddCase = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError('');
    setQuickAddSuccess(null);

    if (!victimName.trim()) {
      setQuickAddError('Victim name is required.');
      return;
    }
    if (!offenceTitle.trim()) {
      setQuickAddError('Offence is required.');
      return;
    }
    if (!description.trim()) {
      setQuickAddError('Case description is required.');
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude.trim()) : undefined;
    const parsedLng = longitude.trim() ? Number(longitude.trim()) : undefined;
    if (parsedLat === undefined || !Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setQuickAddError('Please provide a valid GPS latitude (-90 to 90).');
      return;
    }
    if (parsedLng === undefined || !Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      setQuickAddError('Please provide a valid GPS longitude (-180 to 180).');
      return;
    }

    const activeStation =
      (currentUser && stations.find(s => s.id === currentUser.stationId)) || stations[0];
    const stationCode = activeStation?.code || 'ACR';
    const docketNumber = `GPS/${stationCode}/CR-${new Date().getFullYear()}/${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const nowIso = new Date().toISOString();
    const locText =
      locationLandmark.trim() ||
      `GPS Coordinates (${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)})`;

    const officerDisplay = currentUser
      ? formatOfficerDisplayName(currentUser.rank, currentUser.name)
      : 'Duty Officer';

    const created = storage.createCase({
      docketNumber,
      offenceCategory,
      offenceTitle: offenceTitle.trim(),
      incidentDateTime: nowIso,
      lodgedDateTime: nowIso,
      stationId: activeStation.id,
      stationName: activeStation.name,
      locationDescription: locText,
      latitude: parsedLat,
      longitude: parsedLng,
      narrative: description.trim(),
      complainant: {
        id: 'comp_' + Date.now(),
        fullName: victimName.trim(),
        phone: '+233 00 000 0000',
        address: locText,
        gender: 'other',
        photoUrl: getPlaceholderImage('complainant', victimName.trim()),
      },
      suspects: suspectName.trim()
        ? [
            {
              id: 'susp_' + Date.now(),
              fullName: suspectName.trim(),
              gender: 'other',
              arrestStatus: 'wanted',
              photoUrl: getPlaceholderImage('suspect', suspectName.trim()),
              linkedCaseIds: [],
            },
          ]
        : [],
      evidence: [],
      witnessStatements: [],
      submissions: [
        {
          id: 'sub_' + Date.now(),
          caseId: '',
          officerId: currentUser?.id || 'off_temp',
          officerName: currentUser?.name || 'Duty Officer',
          officerBadge: currentUser?.badgeId || 'GPS-001',
          officerRank: currentUser?.rank || 'Officer',
          officerRole: currentUser?.role || 'investigator',
          submissionType: 'initial_intake',
          title: `Case Logged via Dashboard (${docketNumber})`,
          content: `Victim: ${victimName.trim()}. Suspect: ${
            suspectName.trim() || 'Unknown / Unidentified'
          }. Location: ${locText} [Lat: ${parsedLat.toFixed(6)}, Lng: ${parsedLng.toFixed(
            6
          )}]. Logged by ${officerDisplay}.`,
          timestamp: nowIso,
        },
      ],
      officerInChargeId: currentUser?.id,
      officerInChargeName: officerDisplay,
      officerInChargeBadge: currentUser?.badgeId,
      status: 'lodged',
      statusUpdatedAt: nowIso,
      priority: 'standard',
      isSynthetic: false,
    });

    setQuickAddSuccess(
      `Case ${created.docketNumber} saved (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}).`
    );
    setVictimName('');
    setSuspectName('');
    setOffenceTitle('');
    setDescription('');
    setLocationLandmark('');
    setGpsStatus('');
  };

  const categoryLabels: Record<OffenceCategory, { label: string; icon: string; bg: string }> = {
    robbery: { label: 'Armed Robbery', icon: '🚨', bg: 'bg-rose-50 border-rose-200 text-rose-800' },
    theft: { label: 'Theft / Stealing', icon: '🔓', bg: 'bg-orange-50 border-orange-200 text-orange-800' },
    fraud_scam: { label: 'Fraud & Financial Crimes', icon: '💳', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
    cybercrime: { label: 'Cybercrime & Wire Fraud', icon: '💻', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
    assault: { label: 'Assault & Physical Harm', icon: '⚠️', bg: 'bg-red-50 border-red-200 text-red-800' },
    domestic_violence: { label: 'Domestic Violence (DOVVSU)', icon: '🛡️', bg: 'bg-purple-50 border-purple-200 text-purple-800' },
    narcotics: { label: 'Narcotics & Drugs', icon: '🧪', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    homicide: { label: 'Homicide / Murder', icon: '⚖️', bg: 'bg-zinc-100 border-zinc-300 text-zinc-900' },
    traffic_infraction: { label: 'Motor Traffic Offences (MTTD)', icon: '🚦', bg: 'bg-teal-50 border-teal-200 text-teal-800' },
    unlawful_damage: { label: 'Unlawful Damage', icon: '🔨', bg: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    other: { label: 'Other Statutory Offences', icon: '📋', bg: 'bg-slate-50 border-slate-200 text-slate-800' }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lodged':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">Lodged</span>;
      case 'under_investigation':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">Under CID Investigation</span>;
      case 'suspect_arrested':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">Suspect Arrested</span>;
      case 'forwarded_to_court':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-300">Forwarded to Court</span>;
      case 'bail_granted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Bail Granted</span>;
      case 'closed_withdrawn':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">Closed (Withdrawn)</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Command Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
              Command Oversight & Case Intelligence
            </h2>
            <span className="bg-[#0A2A66] text-white text-[11px] font-bold px-2 py-0.5 rounded">
              {currentUser?.stationName || 'National Police Registry'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time docket status, inter-divisional suspect correlations, and aging case detection.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQuickAdd(prev => !prev)}
            className="flex items-center space-x-1.5 bg-[#0A2A66] hover:bg-[#071D49] text-white px-3.5 py-2 rounded-lg font-semibold text-xs shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>{showQuickAdd ? 'Hide Add Case Form' : 'Add New Case'}</span>
          </button>

          <button
            onClick={() => onNavigate('lodge_complaint')}
            className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-[#0A2A66] border border-[#C9A227]/60 px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            <span>Full Act 29/60 Docket</span>
          </button>

          <button
            onClick={() => onNavigate('case_list')}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-slate-600" />
            <span>Search All Dockets</span>
          </button>
        </div>
      </div>

      {/* Add Case Form (Victim, Suspect, Offence, Description, GPS Lat/Lng) */}
      {showQuickAdd && (
        <div className="bg-white rounded-xl border-2 border-[#0A2A66]/20 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0A2A66] text-[#C9A227] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Add New Case (GPS Case Intake)
                </h3>
                <p className="text-xs text-slate-500">
                  Log victim, suspect, offence, description, and exact GPS latitude &amp; longitude to Supabase.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
              title="Collapse form"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {quickAddError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{quickAddError}</span>
            </div>
          )}

          {quickAddSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-lg text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{quickAddSuccess}</span>
            </div>
          )}

          <form onSubmit={handleQuickAddCase} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Victim Name *
                </label>
                <input
                  type="text"
                  value={victimName}
                  onChange={e => setVictimName(e.target.value)}
                  placeholder="e.g. Ama Serwaa"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Suspect Name
                </label>
                <input
                  type="text"
                  value={suspectName}
                  onChange={e => setSuspectName(e.target.value)}
                  placeholder="e.g. Kofi Boateng (or Unknown)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Offence Category *
                </label>
                <select
                  value={offenceCategory}
                  onChange={e => setOffenceCategory(e.target.value as OffenceCategory)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="theft">Theft / Stealing</option>
                  <option value="robbery">Armed Robbery</option>
                  <option value="assault">Assault</option>
                  <option value="fraud_scam">Fraud / Scam</option>
                  <option value="domestic_violence">Domestic Violence</option>
                  <option value="cybercrime">Cybercrime</option>
                  <option value="narcotics">Narcotics</option>
                  <option value="homicide">Homicide</option>
                  <option value="traffic_infraction">Traffic Offence</option>
                  <option value="unlawful_damage">Unlawful Damage</option>
                  <option value="other">Other Offence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Offence Title / Charge *
                </label>
                <input
                  type="text"
                  value={offenceTitle}
                  onChange={e => setOffenceTitle(e.target.value)}
                  placeholder="e.g. Stealing Mobile Phone (Sec. 124)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Case Description *
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened, items involved, and key facts..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#0A2A66]/30 focus:border-[#0A2A66]"
                required
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#0A2A66]" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    GPS Location (Latitude, Longitude) *
                  </span>
                  {gpsStatus && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {gpsStatus}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={capturingGps}
                  className="flex items-center space-x-1.5 bg-white hover:bg-blue-50 text-[#0A2A66] border border-[#0A2A66]/40 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <NavigationIcon className="w-3.5 h-3.5" />
                  <span>{capturingGps ? 'Locating...' : 'Use Current GPS Location'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    placeholder="e.g. 5.603717"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    placeholder="e.g. -0.186964"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Location / Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={locationLandmark}
                    onChange={e => setLocationLandmark(e.target.value)}
                    placeholder="e.g. Circle Overhead, Accra"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#0A2A66] hover:bg-[#071D49] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md cursor-pointer transition-colors flex items-center space-x-2 border-b-2 border-[#C9A227]"
              >
                <Plus className="w-4 h-4 text-[#C9A227]" />
                <span>Save Case &amp; GPS Location</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Cases Map & Supabase Cases List */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7">
          <CasesMap
            cases={cases}
            selectedCaseId={mapSelectedCaseId}
            onSelectCase={onSelectCase}
            onMapClickCoordinates={
              showQuickAdd
                ? (lat, lng) => {
                    setLatitude(lat.toFixed(6));
                    setLongitude(lng.toFixed(6));
                    setGpsStatus('Selected from map click');
                  }
                : undefined
            }
            heightClass="h-[380px] sm:h-[440px]"
          />
        </div>

        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Cases List &amp; GPS Coordinates ({cases.length})
              </h3>
              <p className="text-xs text-slate-500">
                Loaded from your Supabase <code>cases</code> table.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleRefreshCases}
                disabled={isRefreshing}
                className="flex items-center space-x-1 text-xs font-semibold text-[#0A2A66] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-60"
                title="Reload cases from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <button
                onClick={() => onNavigate('case_list')}
                className="text-xs text-[#0A2A66] hover:underline font-semibold cursor-pointer"
              >
                All ({cases.length}) →
              </button>
            </div>
          </div>

          {cases.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
              <MapPin className="w-7 h-7 mx-auto text-slate-400" />
              <p className="text-xs font-bold text-slate-700">No cases returned from Supabase yet</p>
              <p className="text-[11px] text-slate-500">
                Add a case using the form above, or if you inserted rows directly in Supabase (e.g. Margaret / Thomas), ensure your <code>public.cases</code> RLS policy allows <code>SELECT</code> for authenticated users.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {cases.map(c => {
                const isSelected = mapSelectedCaseId === c.id;
                const hasCoords = typeof c.latitude === 'number' && typeof c.longitude === 'number';
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (hasCoords) {
                        setMapSelectedCaseId(c.id);
                      } else {
                        onSelectCase(c.id);
                      }
                    }}
                    className={`border rounded-xl p-3 transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-[#0A2A66] bg-blue-50/60 ring-1 ring-[#0A2A66]/30'
                        : 'border-slate-200 hover:border-[#0A2A66]/50 bg-slate-50/50 hover:bg-blue-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-xs text-[#0A2A66]">
                        {c.docketNumber}
                      </span>
                      {getStatusBadge(c.status)}
                    </div>

                    <div className="text-xs font-bold text-slate-900 line-clamp-1">
                      {c.offenceTitle}
                    </div>

                    {c.narrative && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">{c.narrative}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/70">
                      <div className="truncate">
                        <span className="text-slate-400 font-semibold">Victim: </span>
                        <span className="text-slate-800 font-bold">{c.complainant.fullName}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-400 font-semibold">Suspect: </span>
                        <span className="text-slate-800 font-bold">
                          {c.suspects.length > 0 ? c.suspects.map(s => s.fullName).join(', ') : 'Unidentified'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                      <span className="flex items-center truncate">
                        <MapPin className="w-3 h-3 mr-1 text-[#0A2A66] shrink-0" />
                        {hasCoords ? (
                          <span className="font-mono text-[10px] font-bold text-[#0A2A66]">
                            {(c.latitude as number).toFixed(5)}, {(c.longitude as number).toFixed(5)}
                          </span>
                        ) : (
                          <span className="truncate">{c.locationDescription}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onSelectCase(c.id);
                        }}
                        className="text-[11px] font-bold text-[#0A2A66] hover:underline shrink-0 ml-2 cursor-pointer"
                      >
                        Inspect →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4 Core Summary Metrics (As requested) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Cases */}
        <div
          onClick={() => onNavigate('case_list')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-[#0A2A66]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cases Logged</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0A2A66] flex items-center justify-center">
              <FolderLock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.totalCases}</span>
            <span className="text-xs text-blue-700 font-semibold flex items-center">
              View Dockets <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Active Investigation: <strong>{metrics.underInvestigation}</strong></span>
            <span>Lodged: <strong>{metrics.lodged}</strong></span>
          </div>
        </div>

        {/* Cases Forwarded to Court */}
        <div
          onClick={() => onNavigate('case_list')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-purple-600"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forwarded to Court</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-purple-900 font-mono">{metrics.forwardedToCourt}</span>
            <span className="text-xs text-purple-700 font-semibold">Judicial Action</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Bail / Settlement: <strong>{metrics.bailGranted}</strong></span>
            <span>Withdrawn: <strong>{metrics.closedWithdrawn}</strong></span>
          </div>
        </div>

        {/* Number of Suspects */}
        <div
          onClick={() => onNavigate('suspect_directory')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-amber-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspects Recorded</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-900 font-mono">{metrics.totalSuspects}</span>
            <span className="text-xs text-amber-700 font-semibold flex items-center">
              Dossiers <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Arrested / In Hand: <strong>{metrics.arrestedCount}</strong></span>
            <span>Cross-Station: <strong className="text-amber-600">{metrics.suspectMatchesCount}</strong></span>
          </div>
        </div>

        {/* Number of Remanded Prisoners */}
        <div
          onClick={() => onNavigate('suspect_directory')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-rose-600"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remanded In Custody</span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-900 font-mono">{metrics.remandedPrisoners}</span>
            <span className="text-xs text-rose-700 font-semibold">In Custody</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Police / Prison Cells</span>
            <span className="text-rose-600 font-medium">Secured</span>
          </div>
        </div>
      </div>

      {/* Breakdown by Criminal Offence Category (Clickable to Filter) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-[#0A2A66]" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Registered Cases by Criminal Offence Category
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Click any category card below to immediately filter the master case registry.
            </p>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
            Interactive Filter Grid
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-4">
          {(Object.keys(metrics.categoryCounts) as OffenceCategory[]).map(cat => {
            const count = metrics.categoryCounts[cat] || 0;
            const meta = categoryLabels[cat] || { label: cat, icon: '📄', bg: 'bg-slate-50 border-slate-200 text-slate-800' };

            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`flex flex-col p-3 rounded-lg border text-left transition-all hover:scale-[1.02] hover:shadow-sm cursor-pointer ${meta.bg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{meta.icon}</span>
                  <span className="text-lg font-black font-mono">{count}</span>
                </div>
                <span className="text-xs font-bold mt-1 line-clamp-1">{meta.label}</span>
                <span className="text-[10px] opacity-75 mt-0.5 flex items-center">
                  Click to inspect →
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Aging Cases Panel & Cross-Station Suspect Matches Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Cases Panel (Flagged for Senior Review) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Aging Cases Stalled In Investigation
                  </h3>
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                    {agingCases.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Cases inactive &gt; {agingThreshold} days flagged for Senior Officer intervention.
                </p>
              </div>
            </div>

            {/* Threshold Configuration Toggle */}
            <button
              onClick={() => setShowThresholdEditor(!showThresholdEditor)}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs flex items-center space-x-1 cursor-pointer"
              title="Configure Aging Threshold Days"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[11px] font-medium hidden sm:inline">{agingThreshold}d Limit</span>
            </button>
          </div>

          {/* Threshold slider popdown */}
          {showThresholdEditor && (
            <div className="bg-slate-50 border-b border-slate-200 p-3 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700">Set Aging Alert Threshold:</span>
              <div className="flex items-center space-x-2">
                {[7, 14, 21, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => handleThresholdChange(days)}
                    className={`px-2 py-1 rounded font-bold text-xs ${
                      agingThreshold === days
                        ? 'bg-[#0A2A66] text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* List of Aging Cases */}
          <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-96">
            {agingCases.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700">No Aging Dockets</p>
                <p>All active investigations are progressing within the {agingThreshold}-day threshold.</p>
              </div>
            ) : (
              agingCases.map(({ caseRecord, daysInactive }) => (
                <div
                  key={caseRecord.id}
                  className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-[#0A2A66]">
                        {caseRecord.docketNumber}
                      </span>
                      {getStatusBadge(caseRecord.status)}
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-rose-600" />
                        {daysInactive} days inactive
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {caseRecord.offenceTitle}
                    </p>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-3">
                      <span className="flex items-center">
                        <Building2 className="w-3 h-3 mr-1 text-slate-400" />
                        {caseRecord.stationName.split(' ')[0]}
                      </span>
                      <span>•</span>
                      <span>OIC: {caseRecord.officerInChargeName || 'Unassigned'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCase(caseRecord.id)}
                    className="self-start sm:self-center flex items-center space-x-1 text-xs font-bold text-[#0A2A66] hover:text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review Docket</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Possible Suspect Matches Panel (Cross-Station Correlation) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Cross-Station Suspect Match Alerts
                  </h3>
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                    {suspectMatches.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Automated intelligence correlating Ghana Card IDs, names &amp; aliases across stations.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('suspect_directory')}
              className="text-xs text-[#0A2A66] hover:underline font-semibold"
            >
              Full Directory →
            </button>
          </div>

          {/* List of Suspect Matches */}
          <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-96">
            {suspectMatches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">No Active Duplication Alerts</p>
                <p>Newly logged suspects are automatically scanned against national station dockets.</p>
              </div>
            ) : (
              suspectMatches.map(match => (
                <div
                  key={match.id}
                  className="py-3 first:pt-0 last:pb-0 space-y-2 hover:bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 bg-amber-50/20 mb-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900 flex items-center">
                        👤 {match.suspectName}
                      </span>
                      {match.suspectAlias && (
                        <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 rounded font-mono">
                          alias: "{match.suspectAlias}"
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                      {match.similarityReason}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded border border-amber-200 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Primary Docket:</span>
                      <button
                        onClick={() => onSelectCase(match.currentCaseId)}
                        className="font-mono font-bold text-[#0A2A66] hover:underline text-left"
                      >
                        {match.currentCaseDocket}
                      </button>
                      <span className="text-[11px] text-slate-500 block truncate">{match.currentStationName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Matched In Station:</span>
                      <button
                        onClick={() => onSelectCase(match.matchedCaseId)}
                        className="font-mono font-bold text-rose-800 hover:underline text-left"
                      >
                        {match.matchedCaseDocket}
                      </button>
                      <span className="text-[11px] text-slate-500 block truncate">{match.matchedStationName}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Cases & GPS Locations Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Recent Logged Cases &amp; GPS Locations
            </h3>
            <p className="text-xs text-slate-500">
              Latest cases saved in your Supabase Case Tracker database.
            </p>
          </div>
          <button
            onClick={() => onNavigate('case_list')}
            className="text-xs text-[#0A2A66] hover:underline font-semibold cursor-pointer"
          >
            View All ({cases.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cases.slice(0, 6).map(c => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c.id)}
              className="border border-slate-200 hover:border-[#0A2A66]/50 rounded-xl p-3.5 bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs text-[#0A2A66]">
                  {c.docketNumber}
                </span>
                {getStatusBadge(c.status)}
              </div>

              <div className="text-xs font-bold text-slate-900 line-clamp-1">
                {c.offenceTitle}
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{c.narrative}</p>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/70">
                <div className="truncate">
                  <span className="text-slate-400 font-semibold">Victim: </span>
                  <span className="text-slate-800 font-bold">{c.complainant.fullName}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400 font-semibold">Suspect: </span>
                  <span className="text-slate-800 font-bold">
                    {c.suspects.length > 0 ? c.suspects.map(s => s.fullName).join(', ') : 'Unidentified'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="flex items-center truncate">
                  <MapPin className="w-3 h-3 mr-1 text-[#0A2A66] shrink-0" />
                  <span className="truncate">{c.locationDescription}</span>
                </span>
                {typeof c.latitude === 'number' && typeof c.longitude === 'number' && (
                  <span className="font-mono text-[10px] bg-blue-100 text-[#0A2A66] px-1.5 py-0.5 rounded font-bold shrink-0 ml-2">
                    {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
