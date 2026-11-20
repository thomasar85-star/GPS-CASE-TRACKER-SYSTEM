import React, { useState } from 'react';
import { Shield, User, RefreshCw, Wifi, WifiOff, LogOut, CheckCircle2, ChevronDown, RotateCcw } from 'lucide-react';
import { Officer, OfficerRole } from '../types';
import { storage } from '../services/storage';
import { formatOfficerDisplayName } from '../utils/security';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentUser: Officer | null;
  onOpenAuth: () => void;
  onSelectRole: (role: OfficerRole) => void;
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onOpenAuth, onSelectRole, onOpenSyncModal }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const offlineStatus = storage.getOfflineStatus();

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSyncing(true);
    try {
      await storage.processOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset all demo cases to initial state?')) {
      storage.resetToDefaultDemoData();
    }
  };

  const getRoleLabel = (role: OfficerRole) => {
    switch (role) {
      case 'counter_nco':
        return 'Counter NCO';
      case 'station_officer':
        return 'Station Officer';
      case 'investigator':
        return 'Investigator';
      case 'senior_officer':
        return 'Senior Commander';
    }
  };

  return (
    <header className="bg-[#0A2A66] text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Crest & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0F3A8A] border border-[#C9A227]/60 flex items-center justify-center shadow shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#C9A227]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white uppercase font-serif truncate">
                Ghana Police Service
              </h1>
              <span className="hidden sm:inline-block bg-[#C9A227] text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                CASE TRACKER
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-blue-200 truncate">
              {currentUser ? currentUser.stationName : 'Central Docket Management'}
            </p>
          </div>
        </div>

        {/* Right Side Actions: Status, Role & Officer */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Online / Offline Sync indicator */}
          <button
            onClick={onOpenSyncModal}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors cursor-pointer ${
              offlineStatus.isOnline
                ? 'bg-[#061B40] hover:bg-[#0c2f6d] border-blue-900/60'
                : 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/50'
            }`}
            title="Click to open Offline & Sync Center"
          >
            {offlineStatus.isOnline ? (
              <span className="flex items-center text-emerald-400 text-[11px]">
                <Wifi className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center text-amber-400 text-[11px]">
                <WifiOff className="w-3 h-3 mr-1 animate-pulse" />
                <span className="hidden sm:inline">Offline Mode</span>
              </span>
            )}

            {offlineStatus.queueLength > 0 && (
              <span
                onClick={handleManualSync}
                className="ml-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center"
                title="Click to sync pending records"
              >
                <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                {offlineStatus.queueLength} Sync
              </span>
            )}
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Officer & Role Menu */}
          {currentUser ? (
            <div className="relative">
              <div className="flex items-center bg-[#0F3A8A] border border-blue-700/60 rounded-lg p-1 sm:p-1.5 pl-2 text-xs">
                <div className="flex items-center mr-2">
                  <div className="w-6 h-6 rounded-full bg-blue-900 border border-[#C9A227] flex items-center justify-center text-[#C9A227] mr-1.5 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left hidden xs:block">
                    <div className="font-bold text-white leading-tight text-xs truncate max-w-[120px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-blue-200 font-mono">
                      {currentUser.badgeId}
                    </div>
                  </div>
                </div>

                {/* Role Switcher */}
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="bg-blue-950/70 hover:bg-blue-950 text-amber-300 border border-amber-400/30 px-2 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Switch Role"
                >
                  <span className="truncate max-w-[80px] sm:max-w-none">{getRoleLabel(currentUser.role)}</span>
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                </button>

                {showRoleMenu && (
                  <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-full mt-1 w-64 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700 py-1.5 z-50">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-amber-400 border-b border-slate-800">
                      Switch Active Role
                    </div>
                    <button
                      onClick={() => {
                        onSelectRole('counter_nco');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-950 ${currentUser.role === 'counter_nco' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}
                    >
                      Counter NCO (Intake)
                    </button>
                    <button
                      onClick={() => {
                        onSelectRole('station_officer');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-950 ${currentUser.role === 'station_officer' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}
                    >
                      Station Officer (Supervisor)
                    </button>
                    <button
                      onClick={() => {
                        onSelectRole('investigator');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-950 ${currentUser.role === 'investigator' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}
                    >
                      CID Investigator
                    </button>
                    <button
                      onClick={() => {
                        onSelectRole('senior_officer');
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-950 ${currentUser.role === 'senior_officer' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}
                    >
                      Senior Commander
                    </button>

                    <div className="border-t border-slate-800 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setShowRoleMenu(false);
                          handleResetDemo();
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 flex items-center space-x-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Demo Cases</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => storage.signOut()}
                  className="ml-1 text-slate-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-[#C9A227] hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-colors flex items-center space-x-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
