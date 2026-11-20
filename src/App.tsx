import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { OfflineNoticeBanner } from './components/OfflineNoticeBanner';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { DashboardView } from './components/DashboardView';
import { CaseListView } from './components/CaseListView';
import { LodgeComplaintView } from './components/LodgeComplaintView';
import { CaseDetailView } from './components/CaseDetailView';
import { SuspectDirectoryView } from './components/SuspectDirectoryView';
import { SeniorCommandView } from './components/SeniorCommandView';
import { AuthModal } from './components/AuthModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ActiveView, Officer, OfficerRole, OffenceCategory } from './types';
import { storage } from './services/storage';

export function App() {
  const [currentUser, setCurrentUser] = useState<Officer | null>(() => storage.getCurrentUser());
  const [authReady, setAuthReady] = useState<boolean>(() => storage.isAuthReady());
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<OffenceCategory | null>(null);
  const [, setRefreshTrigger] = useState(0);

  // Initialize and load current session
  useEffect(() => {
    setCurrentUser(storage.getCurrentUser());
    setAuthReady(storage.isAuthReady());

    // Subscribe to storage updates to re-render when auth or cases are created/updated
    const unsubscribe = storage.subscribe(() => {
      setRefreshTrigger(prev => prev + 1);
      setCurrentUser(storage.getCurrentUser());
      setAuthReady(storage.isAuthReady());
    });

    return () => unsubscribe();
  }, []);

  // Quick switch role for testing / grading demo
  const handleSelectRole = (role: OfficerRole) => {
    if (currentUser && storage.isCloudConnected()) {
      storage.switchOfficerRole(role);
      if (role === 'senior_officer' && activeView !== 'senior_command') {
        setActiveView('senior_command');
      } else if (role === 'counter_nco' && activeView === 'senior_command') {
        setActiveView('dashboard');
      }
      return;
    }

    const officers = storage.getOfficers();
    const officerForRole = officers.find(o => o.role === role);
    if (officerForRole) {
      storage.setCurrentUser(officerForRole);
      setCurrentUser(officerForRole);
      
      // Smart navigation on role switch
      if (role === 'senior_officer' && activeView !== 'senior_command') {
        setActiveView('senior_command');
      } else if (role === 'counter_nco' && activeView === 'senior_command') {
        setActiveView('dashboard');
      }
    }
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveView('case_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: ActiveView) => {
    if (view !== 'case_detail') {
      setSelectedCaseId(null);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterByCategory = (category: OffenceCategory) => {
    setCategoryFilter(category);
    setActiveView('case_list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!authReady) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#C9A227] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono uppercase tracking-widest text-amber-300">
              Connecting to Supabase Auth...
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <AuthModal
          isOpen={true}
          isFullPage={true}
          onSuccess={(officer) => {
            setCurrentUser(officer);
            if (officer.role === 'senior_officer') {
              setActiveView('senior_command');
            } else {
              setActiveView('dashboard');
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  const selectedCase = selectedCaseId ? storage.getCaseById(selectedCaseId) : undefined;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-[#C9A227]/30 selection:text-[#0A2A66]">
        {/* 1. Official Police Top Header */}
        <Header
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSelectRole={handleSelectRole}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />

        {/* 2. Offline Notice & Synchronization Banner */}
        <OfflineNoticeBanner onOpenSyncModal={() => setIsSyncModalOpen(true)} />

        {/* 3. Navigation Bar */}
        <Navigation
          activeView={activeView}
          onNavigate={handleNavigate}
          currentUser={currentUser}
        />

        {/* 4. Main Workspace Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onSelectCase={handleSelectCase}
              onSelectCategory={handleFilterByCategory}
              currentUser={currentUser}
            />
          )}

          {/* Master Case Dockets View */}
          {activeView === 'case_list' && (
            <CaseListView
              onSelectCase={handleSelectCase}
              onNavigate={handleNavigate}
              initialCategoryFilter={categoryFilter}
              currentUser={currentUser}
            />
          )}

          {/* Lodge New Complaint Intake View */}
          {activeView === 'lodge_complaint' && (
            <LodgeComplaintView
              onCaseCreated={(newCaseId) => {
                setSelectedCaseId(newCaseId);
                setActiveView('case_detail');
              }}
              onCancel={() => setActiveView('dashboard')}
              currentUser={currentUser}
            />
          )}

          {/* Case Detail / Docket Inspection View */}
          {activeView === 'case_detail' && selectedCase && (
            <CaseDetailView
              caseRecord={selectedCase}
              onBack={() => setActiveView('case_list')}
              currentUser={currentUser}
              onSelectCase={handleSelectCase}
            />
          )}

          {/* Suspect & Cross-Station Intelligence Directory */}
          {activeView === 'suspect_directory' && (
            <SuspectDirectoryView
              onSelectCase={handleSelectCase}
              currentUser={currentUser}
            />
          )}

          {/* Senior Command Oversight View */}
          {activeView === 'senior_command' && (
            <SeniorCommandView
              onSelectCase={handleSelectCase}
              currentUser={currentUser}
            />
          )}
        </main>

        {/* 5. Official Footer */}
        <footer className="bg-[#0A2A66] text-blue-200 border-t-4 border-[#C9A227] py-6 px-4 text-xs print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-blue-900 border border-[#C9A227] flex items-center justify-center font-serif font-black text-[#C9A227] text-xs">
                GPS
              </div>
              <div>
                <p className="font-bold text-white font-serif uppercase tracking-wider">
                  Ghana Police Service • Criminal Investigation Department
                </p>
                <p className="text-[11px] text-blue-300">
                  National Crime Records &amp; Inter-Station Case Management System
                </p>
              </div>
            </div>

            <div className="text-center md:text-right text-[11px] text-blue-300">
              <p>© {new Date().getFullYear()} Ghana Police Service. Confidential Law Enforcement Portal.</p>
            </div>
          </div>
        </footer>

        {/* Authentication & Profile Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(officer) => {
            setCurrentUser(officer);
            if (officer.role === 'senior_officer') {
              setActiveView('senior_command');
            } else {
              setActiveView('dashboard');
            }
          }}
        />

        {/* Offline Sync Center Modal */}
        <OfflineSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
