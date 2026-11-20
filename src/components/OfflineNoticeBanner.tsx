import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, UploadCloud, ArrowRight } from 'lucide-react';
import { storage } from '../services/storage';

interface OfflineNoticeBannerProps {
  onOpenSyncModal: () => void;
}

export const OfflineNoticeBanner: React.FC<OfflineNoticeBannerProps> = ({ onOpenSyncModal }) => {
  const [offlineStatus, setOfflineStatus] = useState(storage.getOfflineStatus());
  const [syncToast, setSyncToast] = useState<{ count: number; time: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const update = () => {
      setOfflineStatus(storage.getOfflineStatus());
    };

    const handleSynced = (e: any) => {
      update();
      if (e.detail && e.detail.count > 0) {
        setSyncToast({
          count: e.detail.count,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        setTimeout(() => {
          setSyncToast(null);
        }, 5000);
      }
    };

    const unsubscribe = storage.subscribe(update);
    window.addEventListener('gps_offline_synced', handleSynced);

    return () => {
      unsubscribe();
      window.removeEventListener('gps_offline_synced', handleSynced);
    };
  }, []);

  const handleQuickSync = async () => {
    if (!offlineStatus.isOnline) return;
    setIsSyncing(true);
    try {
      await storage.processOfflineQueue();
    } catch (e) {
      console.warn('Quick sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toast for newly completed automatic or manual sync
  if (syncToast) {
    return (
      <div className="bg-emerald-600 text-white py-2 px-4 shadow-md text-xs flex items-center justify-between animate-in slide-in-from-top duration-200 sticky top-[49px] sm:top-[57px] z-35">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span className="font-bold">Central Cloud Sync Complete:</span>
            <span>
              {syncToast.count} offline case(s) and docket updates successfully uploaded to Central Police Headquarters CID Registry at {syncToast.time}.
            </span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-emerald-100 hover:text-white font-bold ml-3 text-xs"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Active Offline Staging Notice Banner
  if (!offlineStatus.isOnline) {
    return (
      <div className="bg-amber-600 text-white py-2 px-4 shadow-sm text-xs sticky top-[49px] sm:top-[57px] z-35 border-b border-amber-700/60">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 rounded bg-amber-700/60 shrink-0">
              <WifiOff className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <span className="font-bold">Offline Staging Mode Active:</span>{' '}
              <span className="text-amber-100">
                You can lodge complaints, register evidence, and record statements without internet. All records are cached locally and queued for automatic upload upon reconnection.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {offlineStatus.queueLength > 0 && (
              <span className="bg-amber-800 text-amber-100 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                {offlineStatus.queueLength} Staged
              </span>
            )}
            <button
              onClick={onOpenSyncModal}
              className="bg-white hover:bg-amber-50 text-amber-950 font-bold px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>Sync Center</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Online with pending items waiting for sync
  if (offlineStatus.isOnline && offlineStatus.queueLength > 0) {
    return (
      <div className="bg-blue-900 text-white py-2 px-4 shadow-sm text-xs sticky top-[49px] sm:top-[57px] z-35 border-b border-blue-950">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-[#C9A227]" />
            <span className="font-bold">Network Connected:</span>
            <span className="text-blue-200">
              You have {offlineStatus.queueLength} case record(s) staged offline ready to upload to the National Registry.
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="bg-[#C9A227] hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center space-x-1 cursor-pointer shadow"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Uploading...' : 'Upload & Sync Now'}</span>
            </button>
            <button
              onClick={onOpenSyncModal}
              className="text-blue-300 hover:text-white underline text-xs ml-1"
            >
              View Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
