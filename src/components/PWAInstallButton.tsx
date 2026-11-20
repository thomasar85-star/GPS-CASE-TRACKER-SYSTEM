import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-[#C9A227] hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition-colors cursor-pointer"
        title="Install Ghana Police Service Case Tracker as an offline-capable App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1 text-xs font-medium text-white transition-colors cursor-pointer"
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0A2A66] text-[#C9A227] flex items-center justify-center font-bold font-serif text-sm">
                    GPS
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 font-serif">Install GPS Case Tracker</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2.5">
                <p>Install this system on your iPhone or iPad for offline duty station access:</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#0A2A66] text-white flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>Tap the <strong>Share</strong> button in the Safari bottom toolbar.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#0A2A66] text-white flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#0A2A66] text-white flex items-center justify-center font-bold text-[10px]">3</span>
                    <span>Tap <strong>Add</strong> in the top-right corner.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-[#0A2A66] hover:bg-[#071D49] py-2 text-xs font-bold text-white transition-colors"
              >
                Close Instructions
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
