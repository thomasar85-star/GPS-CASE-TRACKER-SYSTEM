import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Calendar,
  User,
  Eye,
  AlertTriangle,
  GitCompare,
  Download,
  Plus,
  RefreshCw,
  Scale,
  WifiOff,
  CheckCircle2,
  UploadCloud,
  MapPin
} from 'lucide-react';
import { CaseRecord, CaseStatus, OffenceCategory, ActiveView, Officer } from '../types';
import { storage } from '../services/storage';
import { CasesMap } from './CasesMap';

interface CaseListViewProps {
  onSelectCase: (caseId: string) => void;
  onNavigate: (view: ActiveView) => void;
  initialCategoryFilter?: OffenceCategory | null;
  currentUser: Officer | null;
}

export const CaseListView: React.FC<CaseListViewProps> = ({
  onSelectCase,
  onNavigate,
  initialCategoryFilter = null,
  currentUser
}) => {
  const cases = storage.getCases();
  const stations = storage.getStations();
  const suspectMatches = storage.findCrossStationMatches();
  const agingCases = storage.getAgingCases();
  const offlineStatus = storage.getOfflineStatus();

  // Filter and Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'offline_only' | 'synced_only'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter || 'all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'docket' | 'priority'>('newest');
  const [mapSelectedCaseId, setMapSelectedCaseId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await storage.refreshFromSupabase();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Matched case IDs helper
  const matchedCaseIds = useMemo(() => {
    const ids = new Set<string>();
    suspectMatches.forEach(m => {
      ids.add(m.currentCaseId);
      ids.add(m.matchedCaseId);
    });
    return ids;
  }, [suspectMatches]);

  // Aging case IDs helper
  const agingCaseIds = useMemo(() => {
    const ids = new Set<string>();
    agingCases.forEach(a => ids.add(a.caseRecord.id));
    return ids;
  }, [agingCases]);

  // Filtered and Sorted Cases
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const docketMatch = c.docketNumber.toLowerCase().includes(q);
        const titleMatch = c.offenceTitle.toLowerCase().includes(q);
        const compMatch = c.complainant.fullName.toLowerCase().includes(q);
        const suspMatch = c.suspects.some(s => s.fullName.toLowerCase().includes(q) || s.alias?.toLowerCase().includes(q));
        const locMatch = c.locationDescription.toLowerCase().includes(q);
        const officerMatch = c.officerInChargeName?.toLowerCase().includes(q) || c.officerInChargeBadge?.toLowerCase().includes(q);
        const statuteMatch = c.act29Section?.toLowerCase().includes(q) || c.act29OffenceCode?.toLowerCase().includes(q);
        if (!docketMatch && !titleMatch && !compMatch && !suspMatch && !locMatch && !officerMatch && !statuteMatch) {
          return false;
        }
      }

      // 2. Status
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }

      // 2b. Sync Filter
      if (syncFilter === 'offline_only' && !c.isOfflineStaged) {
        return false;
      }
      if (syncFilter === 'synced_only' && c.isOfflineStaged) {
        return false;
      }

      // 3. Category
      if (categoryFilter !== 'all' && c.offenceCategory !== categoryFilter) {
        return false;
      }

      // 4. Station
      if (stationFilter !== 'all' && c.stationId !== stationFilter) {
        return false;
      }

      // 5. Priority
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.lodgedDateTime).getTime() - new Date(a.lodgedDateTime).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.lodgedDateTime).getTime() - new Date(b.lodgedDateTime).getTime();
      }
      if (sortBy === 'docket') {
        return a.docketNumber.localeCompare(b.docketNumber);
      }
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { critical: 4, urgent: 3, standard: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return 0;
    });
  }, [cases, searchQuery, statusFilter, syncFilter, categoryFilter, stationFilter, priorityFilter, sortBy]);

  const handleExportCSV = () => {
    const headers = ['Docket Number', 'Offence Category', 'Title', 'Station', 'Status', 'Priority', 'Complainant', 'Suspects Count', 'Lodged Date'];
    const rows = filteredCases.map(c => [
      `"${c.docketNumber}"`,
      `"${c.offenceCategory}"`,
      `"${c.offenceTitle.replace(/"/g, '""')}"`,
      `"${c.stationName}"`,
      `"${c.status}"`,
      `"${c.priority}"`,
      `"${c.complainant.fullName}"`,
      c.suspects.length,
      `"${new Date(c.lodgedDateTime).toLocaleDateString('en-GB')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GPS_Case_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'lodged':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Lodged</span>;
      case 'under_investigation':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Under CID Investigation</span>;
      case 'suspect_arrested':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">Suspect Arrested</span>;
      case 'forwarded_to_court':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center"><Scale className="w-3 h-3 mr-1" />Court Docket</span>;
      case 'bail_granted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Bail Granted</span>;
      case 'closed_withdrawn':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Closed (Withdrawn)</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Quick Action */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
            Master Case Dockets &amp; Registry
          </h2>
          <p className="text-xs text-slate-500">
            Comprehensive national police crime registry with multi-parameter filtering and cross-station lookup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-[#0A2A66] border border-blue-200 px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Supabase'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigate('lodge_complaint')}
            className="flex items-center space-x-1.5 bg-[#0A2A66] hover:bg-[#071D49] text-white px-3.5 py-2 rounded-lg font-bold text-xs shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C9A227]" />
            <span>Lodge Complaint</span>
          </button>
        </div>
      </div>

      {/* Interactive Cases Map */}
      <CasesMap
        cases={filteredCases}
        selectedCaseId={mapSelectedCaseId}
        onSelectCase={onSelectCase}
        heightClass="h-[340px]"
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        {/* Full Text Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Docket Number (e.g. GPS/ACR/CR-2026/0042), complainant, suspect name, alias, or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2A66]/30"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="all">All Statuses ({cases.length})</option>
              <option value="lodged">Lodged</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="suspect_arrested">Suspect Arrested</option>
              <option value="forwarded_to_court">Forwarded to Court</option>
              <option value="bail_granted">Bail Granted</option>
              <option value="closed_withdrawn">Closed (Withdrawn)</option>
            </select>
          </div>

          {/* Sync Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sync State</label>
            <select
              value={syncFilter}
              onChange={e => setSyncFilter(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="all">All Sync States</option>
              <option value="offline_only">Pending Sync ({offlineStatus.queueLength})</option>
              <option value="synced_only">Cloud Synced</option>
            </select>
          </div>

          {/* Offence Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Offence Category</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="all">All Categories</option>
              <option value="theft">Theft / Stealing</option>
              <option value="robbery">Armed Robbery</option>
              <option value="assault">Assault &amp; Harm</option>
              <option value="fraud_scam">Fraud &amp; Scam</option>
              <option value="cybercrime">Cybercrime</option>
              <option value="domestic_violence">Domestic Violence (DOVVSU)</option>
              <option value="narcotics">Narcotics</option>
              <option value="homicide">Homicide / Murder</option>
              <option value="traffic_infraction">Traffic Infraction</option>
              <option value="unlawful_damage">Unlawful Damage</option>
            </select>
          </div>

          {/* Station Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Police Station</label>
            <select
              value={stationFilter}
              onChange={e => setStationFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="all">All Police Stations</option>
              {stations.map(stn => (
                <option key={stn.id} value={stn.id}>
                  {stn.name.split(' ')[0]} ({stn.code})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Urgency Priority</label>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="standard">Standard</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sort Order</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800"
            >
              <option value="newest">Newest Lodged First</option>
              <option value="oldest">Oldest Lodged First</option>
              <option value="docket">Docket Number A-Z</option>
              <option value="priority">Priority (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips / Reset */}
        {(statusFilter !== 'all' || syncFilter !== 'all' || categoryFilter !== 'all' || stationFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-600 font-semibold">
              Showing <strong>{filteredCases.length}</strong> of {cases.length} dockets matching filters
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSyncFilter('all');
                setCategoryFilter('all');
                setStationFilter('all');
                setPriorityFilter('all');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {filteredCases.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <p className="font-semibold text-slate-600">No case dockets found.</p>
            <p className="text-[11px] mt-1">Try resetting your search filters.</p>
          </div>
        ) : (
          filteredCases.map(c => {
            const isCrossStationMatched = matchedCaseIds.has(c.id);
            const isAging = agingCaseIds.has(c.id);

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 cursor-pointer hover:border-[#0A2A66] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#0A2A66]">
                      {c.docketNumber}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                      {c.offenceTitle}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {c.isOfflineStaged ? (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center">
                        <WifiOff className="w-2.5 h-2.5 mr-1" />
                        Pending Sync
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        Synced
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {getStatusBadge(c.status)}
                  {isCrossStationMatched && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center">
                      <GitCompare className="w-2.5 h-2.5 mr-1" /> Cross-Match
                    </span>
                  )}
                  {isAging && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center">
                      <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Aging
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Complainant:</span>
                    <span className="font-medium text-slate-800 truncate block">{c.complainant.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Station:</span>
                    <span className="font-medium text-slate-800 truncate block">{c.stationName.split(' ')[0]} Command</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span>Lodged: {new Date(c.lodgedDateTime).toLocaleDateString('en-GB')}</span>
                    {typeof c.latitude === 'number' && typeof c.longitude === 'number' && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setMapSelectedCaseId(c.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="font-mono text-[10px] bg-blue-50 hover:bg-blue-100 text-[#0A2A66] border border-blue-200 px-1.5 py-0.5 rounded font-bold inline-flex items-center cursor-pointer"
                        title="Focus pin on map"
                      >
                        <MapPin className="w-2.5 h-2.5 mr-0.5" />
                        {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                      </button>
                    )}
                  </div>
                  <span className="text-[#0A2A66] font-bold flex items-center">
                    Inspect Docket <Eye className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Case Table for Desktop (md:) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A2A66] text-white uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Docket Number</th>
                <th className="py-3 px-4">Offence Particulars</th>
                <th className="py-3 px-4">Station Division</th>
                <th className="py-3 px-4">Complainant / Suspects</th>
                <th className="py-3 px-4">Status &amp; Cloud Sync</th>
                <th className="py-3 px-4">Lodged Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No case dockets found matching current filters.</p>
                    <p className="text-[11px] mt-1">Try clearing search terms or selecting 'All' in the filters above.</p>
                  </td>
                </tr>
              ) : (
                filteredCases.map(c => {
                  const isCrossStationMatched = matchedCaseIds.has(c.id);
                  const isAging = agingCaseIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectCase(c.id)}
                    >
                      {/* Docket & Priority */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#0A2A66] block">
                          {c.docketNumber}
                        </span>
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                          c.priority === 'critical'
                            ? 'bg-rose-100 text-rose-800'
                            : c.priority === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.priority}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="font-bold text-slate-900 line-clamp-1 block">
                          {c.offenceTitle}
                        </span>
                        <span className="text-[11px] text-slate-500 capitalize">
                          {c.offenceCategory.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Station & GPS */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 block">
                          {c.stationName.split(' ')[0]} Command
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {c.stationName.includes('Ashanti') ? 'Ashanti Reg.' : c.stationName.includes('Western') ? 'Western Reg.' : 'Greater Accra'}
                        </span>
                        {typeof c.latitude === 'number' && typeof c.longitude === 'number' && (
                          <span className="inline-block mt-1 font-mono text-[10px] bg-blue-50 text-[#0A2A66] border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                            GPS: {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                          </span>
                        )}
                      </td>

                      {/* Complainant / Suspects */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-700">
                          <span className="text-slate-400">Comp: </span>
                          <span className="font-semibold">{c.complainant.fullName}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          <span className="text-slate-400">Suspects: </span>
                          <span className="font-medium">
                            {c.suspects.length > 0 ? (
                              <span>{c.suspects.map(s => s.fullName).join(', ')}</span>
                            ) : (
                              <em className="text-slate-400">None attached</em>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Status & Sync Badges */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            {getStatusBadge(c.status)}
                          </div>

                          {c.isOfflineStaged ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center w-max">
                              <WifiOff className="w-2.5 h-2.5 mr-1" />
                              Pending Cloud Sync
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold px-1.5 py-0.2 rounded flex items-center w-max">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                              Cloud Synced
                            </span>
                          )}

                          {isCrossStationMatched && (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center w-max">
                              <GitCompare className="w-2.5 h-2.5 mr-1" />
                              Cross-Station Match
                            </span>
                          )}

                          {isAging && (
                            <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center w-max">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              Aging Docket Flag
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lodged Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(c.lodgedDateTime).toLocaleDateString('en-GB')}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          {typeof c.latitude === 'number' && typeof c.longitude === 'number' && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setMapSelectedCaseId(c.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-[#0A2A66] border border-blue-200 font-bold px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
                              title="Focus case pin on map"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Map</span>
                            </button>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onSelectCase(c.id);
                            }}
                            className="bg-slate-100 group-hover:bg-[#0A2A66] group-hover:text-white text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
