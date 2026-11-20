import React, { useState } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Layers,
  Database,
  GitMerge,
  Server,
  HardDrive,
} from 'lucide-react';
import { storage } from '../services/storage';
import { OfflineQueueItem } from '../types';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [conflictLogs, setConflictLogs] = useState<any[]>([]);

  if (!isOpen) return null;

  const offlineStatus = storage.getOfflineStatus();
  const queue = storage.getOfflineQueue();
  const pendingItems = queue.filter(q => q.status === 'pending');
  const syncedItems = queue.filter(q => q.status === 'synced');
  const conflictItems = queue.filter(q => q.status === 'conflict_retained_server');
  const isOnline = offlineStatus.isOnline;
  const isSimulated = offlineStatus.isSimulated;
  const isCloudConfigured = storage.isCloudConfigured();
  const isCloudLinked = storage.isCloudConnected();

  const handleToggleSimulation = () => {
    storage.toggleOfflineSimulation();
  };

  const handleSyncNow = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setSyncSuccessMessage(null);
    setConflictLogs([]);

    try {
      const res = await storage.processOfflineQueue();
      setIsSyncing(false);

      if (res.conflicts && res.conflicts.length > 0) {
        setConflictLogs(res.conflicts);
        setSyncSuccessMessage(
          `Sync Completed: ${res.count} record(s) committed to Supabase. ${res.conflicts.length} duplicate/concurrent conflict(s) resolved with Central Server Record retained.`
        );
      } else if (res.count > 0) {
        setSyncSuccessMessage(
          `Successfully pushed ${res.count} queued record(s) to Central Police Supabase Database without conflict.`
        );
      } else {
        setSyncSuccessMessage('All IndexedDB records are already synchronized with Supabase.');
      }
    } catch {
      setIsSyncing(false);
      setSyncSuccessMessage('Sync process finished.');
    }
  };

  const formatActionTitle = (action: OfflineQueueItem['action'], payload: any) => {
    switch (action) {
      case 'create_case':
        return `New Case Lodged: ${payload?.docketNumber || 'GPS Docket'}`;
      case 'update_case_status':
        return `Case Status Progression: ${(payload?.status || '').replace(/_/g, ' ').toUpperCase()}`;
      case 'add_submission':
        return `Docket Submission Entry: ${payload?.submission?.title || 'Statement/Findings'}`;
      case 'add_evidence':
        return `Evidence Exhibit Registered: ${payload?.evidence?.description || 'Physical Evidence'}`;
      case 'add_suspect':
        return `Suspect Profile Attached: ${payload?.suspect?.fullName || 'Person of Interest'}`;
      default:
        return `Docket Update (${action})`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#0A2A66] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#C9A227]">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-400'
                  : 'bg-amber-950/60 border-amber-400/50 text-amber-400'
              }`}
            >
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold font-serif text-base uppercase tracking-wide">
                  IndexedDB &amp; Supabase Sync Engine
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {isOnline
                    ? isCloudLinked
                      ? 'Online (Supabase Linked)'
                      : 'Online (Local Mode)'
                    : 'Offline (IndexedDB Mode)'}
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Service Worker offline cache • IndexedDB storage • Supabase PostgreSQL sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {!isCloudLinked && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-blue-950">
                {isCloudConfigured ? (
                  <>
                    <strong>Supabase Sync Ready:</strong> Sign in with your officer email and password to sync dockets with Supabase PostgreSQL.
                  </>
                ) : (
                  <>
                    <strong>Supabase Env Pending:</strong> Add <code className="font-mono bg-blue-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="font-mono bg-blue-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in environment settings to connect your Supabase project.
                  </>
                )}
              </div>
              {onOpenAuth && isCloudConfigured && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="bg-[#0A2A66] hover:bg-[#071D49] text-white font-bold px-3 py-1.5 rounded-lg text-xs shrink-0 cursor-pointer"
                >
                  Sign In Now
                </button>
              )}
            </div>
          )}

          {/* Architecture Pipeline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <div className="flex items-center space-x-1.5 font-bold text-[#0A2A66] mb-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>1. IndexedDB Cache</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Local browser database stores dockets, depositions, and queue entries offline with zero loss.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900 mb-1">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Background Sync</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Auto-pushes queued operations to Supabase PostgreSQL immediately upon reconnection.
              </p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-900 mb-1">
                <Server className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. Conflict Check</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Checks timestamps on duplicate records: <strong>Server record is retained</strong> on duplicate.
              </p>
            </div>
          </div>

          {/* Connection Status Box */}
          <div
            className={`rounded-xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isOnline
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                  isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isOnline ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {isOnline
                    ? isCloudLinked
                      ? 'Connected to Supabase PostgreSQL'
                      : 'Online (IndexedDB Local Mode)'
                    : 'Operating in IndexedDB Offline Staging'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isOnline
                    ? 'Background synchronization active. Queued IndexedDB operations replicate automatically.'
                    : 'Service Worker handles offline navigation. All dockets are saved into local IndexedDB.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleSimulation}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isSimulated
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
              }`}
              title="Toggle simulated offline mode for field testing"
            >
              {isSimulated ? 'Exit Offline Simulation' : 'Simulate Offline Field Mode'}
            </button>
          </div>

          {syncSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3.5 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{syncSuccessMessage}</span>
            </div>
          )}

          {(conflictLogs.length > 0 || conflictItems.length > 0) && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase">
                <GitMerge className="w-4 h-4 text-amber-700" />
                <span>Timestamp Conflict Resolution Log (Server Record Retained)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Rule Enforced: On duplicate dockets or older client edits, the authoritative Supabase record is retained to prevent state degradation.
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {(conflictLogs.length > 0
                  ? conflictLogs
                  : conflictItems.map(ci => ({
                      docketNumber: ci.payload?.docketNumber || 'Docket',
                      reason:
                        ci.conflictResolution?.reason ||
                        'Duplicate record detected in Supabase database',
                      resolution: 'server_record_retained',
                    }))
                ).map((cfl, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-amber-200 rounded p-2 text-[11px] flex items-start justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0A2A66]">{cfl.docketNumber}</span>
                      <p className="text-slate-600 text-[10px] mt-0.5">{cfl.reason}</p>
                    </div>
                    <span className="bg-amber-100 text-amber-900 font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0 ml-2">
                      Server Retained
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#0A2A66]" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  IndexedDB Queue ({pendingItems.length} awaiting Supabase sync)
                </h4>
              </div>

              {pendingItems.length > 0 && isOnline && (
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="bg-[#0A2A66] hover:bg-[#071D49] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow cursor-pointer border border-[#C9A227]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#C9A227] ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Pushing to Supabase...' : 'Sync to Supabase Now'}</span>
                </button>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center text-slate-500">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1 opacity-80" />
                <p className="text-xs font-bold text-slate-700">IndexedDB Queue Empty</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All local station records match the Central Police Registry.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pendingItems.map(item => (
                  <div
                    key={item.id}
                    className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {formatActionTitle(item.action, item.payload)}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                          <span>
                            Client TS: {new Date(item.clientTimestamp || item.timestamp).toLocaleTimeString()}
                          </span>
                          <span>•</span>
                          <span className="text-amber-700 font-semibold font-mono">IndexedDB Record</span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 bg-amber-200/70 text-amber-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                      Pending Sync
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {syncedItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Committed Supabase Records ({syncedItems.length})
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {syncedItems
                  .slice(-5)
                  .reverse()
                  .map(item => (
                    <div
                      key={item.id}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-slate-700 truncate">
                          {formatActionTitle(item.action, item.payload)}
                        </span>
                      </div>
                      <span className="text-emerald-700 font-semibold text-[10px] shrink-0 ml-2 font-mono">
                        Synced
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-[11px] uppercase">
              <Layers className="w-3.5 h-3.5 text-[#0A2A66]" />
              <span>Offline &amp; Supabase Conflict Guarantees:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
              <li>
                <strong>Service Worker:</strong> App assets are precached, loading instantly without an internet connection.
              </li>
              <li>
                <strong>IndexedDB:</strong> High-capacity client database stores all crime entries and queues securely.
              </li>
              <li>
                <strong>Background Sync:</strong> Automatically detects reconnection and pushes queue batches to Supabase.
              </li>
              <li>
                <strong>Conflict Check:</strong> Evaluates timestamp epoch; retains Central Server record on duplicate.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {pendingItems.length > 0 ? (
              <span className="text-amber-700 font-semibold">
                {pendingItems.length} item(s) awaiting sync
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">
                IndexedDB &amp; Supabase Registry synchronized
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg border border-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
            {pendingItems.length > 0 && isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="bg-[#0A2A66] hover:bg-[#071D49] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow cursor-pointer border-b-2 border-[#C9A227]"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
