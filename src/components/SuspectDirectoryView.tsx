import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  User,
  Shield,
  Lock,
  GitCompare,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Eye,
  FileText,
  Filter
} from 'lucide-react';
import { Suspect, Complainant, CaseRecord, Officer } from '../types';
import { storage } from '../services/storage';
import { getPlaceholderImage } from '../utils/security';

interface SuspectDirectoryViewProps {
  onSelectCase: (caseId: string) => void;
  currentUser: Officer | null;
}

export const SuspectDirectoryView: React.FC<SuspectDirectoryViewProps> = ({
  onSelectCase,
  currentUser
}) => {
  const cases = storage.getCases();
  const [activeTab, setActiveTab] = useState<'suspects' | 'complainants'>('suspects');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Aggregated Suspects across all stations
  const aggregatedSuspects = useMemo(() => {
    const map = new Map<string, { suspect: Suspect; linkedCases: CaseRecord[] }>();

    cases.forEach(c => {
      c.suspects.forEach(s => {
        // Group by Ghana Card if available, or unique composite key
        const key = s.ghanaCardId
          ? s.ghanaCardId.trim().toUpperCase()
          : s.fullName.trim().toLowerCase();

        if (map.has(key)) {
          const existing = map.get(key)!;
          // Avoid duplicate case entry
          if (!existing.linkedCases.some(item => item.id === c.id)) {
            existing.linkedCases.push(c);
          }
          // Merge details
          if (!existing.suspect.cautionStatement && s.cautionStatement) {
            existing.suspect.cautionStatement = s.cautionStatement;
          }
          if (s.arrestStatus === 'wanted' || s.arrestStatus === 'remanded') {
            existing.suspect.arrestStatus = s.arrestStatus;
          }
        } else {
          map.set(key, {
            suspect: { ...s },
            linkedCases: [c]
          });
        }
      });
    });

    return Array.from(map.values());
  }, [cases]);

  // Aggregated Complainants across all stations
  const aggregatedComplainants = useMemo(() => {
    const list: Array<{ complainant: Complainant; caseRecord: CaseRecord }> = [];
    cases.forEach(c => {
      list.push({
        complainant: c.complainant,
        caseRecord: c
      });
    });
    return list;
  }, [cases]);

  // Filtered Suspects
  const filteredSuspects = useMemo(() => {
    return aggregatedSuspects.filter(({ suspect, linkedCases }) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = suspect.fullName.toLowerCase().includes(q);
        const aliasMatch = suspect.alias?.toLowerCase().includes(q);
        const cardMatch = suspect.ghanaCardId?.toLowerCase().includes(q);
        const caseMatch = linkedCases.some(c => c.docketNumber.toLowerCase().includes(q) || c.stationName.toLowerCase().includes(q));
        if (!nameMatch && !aliasMatch && !cardMatch && !caseMatch) {
          return false;
        }
      }

      if (statusFilter !== 'all' && suspect.arrestStatus !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [aggregatedSuspects, searchQuery, statusFilter]);

  // Filtered Complainants
  const filteredComplainants = useMemo(() => {
    return aggregatedComplainants.filter(({ complainant, caseRecord }) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = complainant.fullName.toLowerCase().includes(q);
        const phoneMatch = complainant.phone.toLowerCase().includes(q);
        const cardMatch = complainant.ghanaCardId?.toLowerCase().includes(q);
        const docketMatch = caseRecord.docketNumber.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !cardMatch && !docketMatch) {
          return false;
        }
      }
      return true;
    });
  }, [aggregatedComplainants, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0A2A66] text-white rounded-xl p-5 border-b-4 border-[#C9A227] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#C9A227]" />
            <h2 className="text-lg sm:text-xl font-bold font-serif uppercase">
              Cross-Station Criminal Biometric Directory
            </h2>
          </div>
          <p className="text-xs text-blue-200 mt-0.5">
            Inter-divisional repository mapping suspects and complainants across all Ghana Police Commands.
          </p>
        </div>

        <div className="flex bg-[#071D49] p-1 rounded-lg border border-blue-900">
          <button
            onClick={() => setActiveTab('suspects')}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'suspects'
                ? 'bg-[#C9A227] text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Suspect Dossiers ({aggregatedSuspects.length})
          </button>
          <button
            onClick={() => setActiveTab('complainants')}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'complainants'
                ? 'bg-[#C9A227] text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Complainant Registry ({aggregatedComplainants.length})
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Suspect/Complainant name, Ghana Card PIN (e.g. GHA-661209381-0), alias, or docket..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2A66]/30"
            />
          </div>

          {activeTab === 'suspects' && (
            <div className="sm:w-56">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-800"
              >
                <option value="all">All Custody Statuses</option>
                <option value="wanted">Wanted by Police</option>
                <option value="arrested">Arrested / In Custody</option>
                <option value="remanded">Remanded in Custody</option>
                <option value="bail_granted">Police / Court Bail</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab 1: Suspect Dossiers Grid */}
      {activeTab === 'suspects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSuspects.length === 0 ? (
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No suspect records found matching query.</p>
            </div>
          ) : (
            filteredSuspects.map(({ suspect, linkedCases }) => {
              const isMultiStation = linkedCases.length > 1;

              return (
                <div
                  key={suspect.id + (suspect.ghanaCardId || '')}
                  className={`bg-white rounded-xl border shadow-sm p-5 space-y-4 transition-all ${
                    isMultiStation
                      ? 'border-amber-400 bg-amber-50/10 ring-1 ring-amber-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Top Profile Header */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-16 h-16 rounded-xl bg-rose-950 border-2 border-rose-800 flex-shrink-0 overflow-hidden shadow-sm">
                      <img
                        src={suspect.photoUrl || getPlaceholderImage('suspect', suspect.fullName)}
                        alt={suspect.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-bold text-slate-900 truncate">
                          {suspect.fullName}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          suspect.arrestStatus === 'remanded'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : suspect.arrestStatus === 'wanted'
                            ? 'bg-red-600 text-white animate-pulse'
                            : suspect.arrestStatus === 'arrested'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {suspect.arrestStatus}
                        </span>
                      </div>

                      {suspect.alias && (
                        <span className="text-xs font-mono font-bold text-[#0A2A66] block mt-0.5">
                          alias: "{suspect.alias}"
                        </span>
                      )}

                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 mt-1">
                        <span>Ghana Card: <strong className="font-mono text-slate-800">{suspect.ghanaCardId || 'N/A'}</strong></span>
                        <span>Known Town: <strong>{suspect.address || 'Various'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Station Correlation Tag (Key feature!) */}
                  {isMultiStation && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-950 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <GitCompare className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="font-bold">
                          Cross-Station Correlation: Linked to {linkedCases.length} Dockets across different police commands!
                        </span>
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                        Syndicate Link
                      </span>
                    </div>
                  )}

                  {/* Caution Statement Preview */}
                  {suspect.cautionStatement && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
                      <span className="font-bold text-[10px] text-slate-500 uppercase block">Caution Statement on File:</span>
                      <p className="italic line-clamp-2 mt-0.5">"{suspect.cautionStatement}"</p>
                    </div>
                  )}

                  {/* Cross-Station Linked Dockets List */}
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1 text-[#0A2A66]" />
                      Connected Police Dockets Across Stations ({linkedCases.length})
                    </span>

                    <div className="space-y-1.5">
                      {linkedCases.map(c => (
                        <div
                          key={c.id}
                          className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs hover:border-[#0A2A66] transition-colors"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-[#0A2A66]">{c.docketNumber}</span>
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 rounded capitalize">
                                {c.offenceCategory.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs mt-0.5">
                              {c.stationName} • {c.offenceTitle}
                            </span>
                          </div>

                          <button
                            onClick={() => onSelectCase(c.id)}
                            className="bg-slate-100 hover:bg-[#0A2A66] hover:text-white text-slate-700 font-bold text-xs px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <span>Open File</span>
                            <ChevronRightIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Complainants Registry Table */}
      {activeTab === 'complainants' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A2A66] text-white uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Complainant</th>
                  <th className="py-3 px-4">Ghana Card PIN</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Residential Address</th>
                  <th className="py-3 px-4">Originating Case Docket</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredComplainants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No complainant records found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredComplainants.map(({ complainant, caseRecord }) => (
                    <tr key={complainant.id + caseRecord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {complainant.fullName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {complainant.ghanaCardId || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {complainant.phone}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {complainant.address}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-[#0A2A66] block">{caseRecord.docketNumber}</span>
                        <span className="text-[10px] text-slate-400">{caseRecord.stationName.split(' ')[0]} Command</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectCase(caseRecord.id)}
                          className="bg-slate-100 hover:bg-[#0A2A66] hover:text-white text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          View Docket
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
