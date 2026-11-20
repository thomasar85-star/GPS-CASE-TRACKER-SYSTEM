import { CaseRecord, Station, Officer, OfficerRole, OfflineQueueItem, SuspectMatchAlert, CaseStatus, OffenceCategory, CaseSubmission, EvidenceItem, WitnessStatement, Suspect } from '../types';
import { SEED_CASES, SEED_OFFICERS, SEED_STATIONS } from '../data/seedData';
import { sanitizeText, cleanOfficerName, formatOfficerDisplayName, isSeniorOfficerRank } from '../utils/security';
import { idbStorage } from './indexedDb';
import { supabaseSync } from './supabaseSync';
import {
  ensureSupabaseInitialized,
  supabase,
  isSupabaseConfigured,
  signOutSupabase,
} from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const STORAGE_KEYS = {
  CASES: 'gps_cases_v3',
  STATIONS: 'gps_stations_v3',
  OFFICERS: 'gps_officers_v3',
  CURRENT_USER: 'gps_current_user_v3',
  OFFLINE_QUEUE: 'gps_offline_queue_v3',
  AGING_THRESHOLD_DAYS: 'gps_aging_threshold_v3'
};

class StorageService {
  private cases: CaseRecord[] = [];
  private stations: Station[] = [];
  private officers: Officer[] = [];
  private currentUser: Officer | null = null;
  private offlineQueue: OfflineQueueItem[] = [];
  private agingDaysThreshold: number = 14;
  private isNativeOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatedOffline: boolean = false;
  private listeners: Set<() => void> = new Set();
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private supabaseUserId: string | null = null;
  private authInitialized: boolean = false;
  private pendingProfileOverride: Partial<Officer> | null = null;

  constructor() {
    this.init();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isNativeOnline = true;
        if (!this.isSimulatedOffline) {
          this.processOfflineQueue();
        }
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isNativeOnline = false;
        this.notify();
      });

      this.autoSyncInterval = setInterval(() => {
        if (this.isOnline() && this.getQueuedCasesCount() > 0) {
          this.processOfflineQueue();
        }
      }, 8000);

      this.setupSupabaseAuthListener();
    }
  }

  private async handleSignedInUser(sbUser: NonNullable<Parameters<typeof supabaseSync.loadOrCreateOfficerProfile>[0]>) {
    this.supabaseUserId = sbUser.id;

    if (this.realtimeChannel && supabase) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    try {
      const override = this.pendingProfileOverride || undefined;
      this.pendingProfileOverride = null;

      const officer = await supabaseSync.loadOrCreateOfficerProfile(sbUser, override);
      if (!this.officers.some(o => o.id === officer.id || o.email.toLowerCase() === officer.email.toLowerCase())) {
        this.officers.push(officer);
        this.saveOfficers();
      }
      this.currentUser = officer;
      this.saveCurrentUser();

      this.realtimeChannel = supabaseSync.subscribeToUserCases(sbUser.id, remoteCases => {
        const mergedMap = new Map<string, CaseRecord>();
        this.cases
          .filter(c => c.isOfflineStaged)
          .forEach(c => mergedMap.set(c.id, c));
        remoteCases.forEach(rc => mergedMap.set(rc.id, rc));

        this.cases = Array.from(mergedMap.values()).sort(
          (a, b) => (b.updatedTimestamp || 0) - (a.updatedTimestamp || 0)
        );
        this.sanitizeLoadedData();
        this.saveCases();
        this.notify();
      });

      if (this.isOnline() && this.getQueuedCasesCount() > 0) {
        await this.processOfflineQueue();
      }
      this.notify();
    } catch (err) {
      console.error('Supabase auth hydration error:', err);
    }
  }

  public async refreshFromSupabase(): Promise<void> {
    if (!this.supabaseUserId) return;
    const remoteCases = await supabaseSync.fetchUserCases(this.supabaseUserId);
    const mergedMap = new Map<string, CaseRecord>();
    this.cases
      .filter(c => c.isOfflineStaged)
      .forEach(c => mergedMap.set(c.id, c));
    remoteCases.forEach(rc => mergedMap.set(rc.id, rc));
    this.cases = Array.from(mergedMap.values()).sort(
      (a, b) => (b.updatedTimestamp || 0) - (a.updatedTimestamp || 0)
    );
    this.sanitizeLoadedData();
    this.saveCases();
    this.notify();
  }

  private async setupSupabaseAuthListener() {
    await ensureSupabaseInitialized();

    if (!supabase) {
      this.authInitialized = true;
      this.notify();
      return;
    }

    const { data } = await supabase.auth.getSession();
    this.authInitialized = true;
    if (data.session?.user) {
      await this.handleSignedInUser(data.session.user);
    } else {
      this.supabaseUserId = null;
      this.currentUser = null;
      this.saveCurrentUser();
      this.notify();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      this.authInitialized = true;
      if (session?.user) {
        await this.handleSignedInUser(session.user);
      } else {
        this.supabaseUserId = null;
        this.currentUser = null;
        this.saveCurrentUser();
        if (this.realtimeChannel && supabase) {
          await supabase.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
        this.notify();
      }
    });
  }

  public setPendingProfileOverride(profile: Partial<Officer> | null) {
    this.pendingProfileOverride = profile;
  }

  public isAuthReady(): boolean {
    return this.authInitialized;
  }

  public isCloudConfigured(): boolean {
    return isSupabaseConfigured;
  }

  public isCloudConnected(): boolean {
    return Boolean(isSupabaseConfigured && this.supabaseUserId);
  }

  public isOnline(): boolean {
    return this.isNativeOnline && !this.isSimulatedOffline;
  }

  public isSimulatedOfflineMode(): boolean {
    return this.isSimulatedOffline;
  }

  public toggleOfflineSimulation(): boolean {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    if (this.isOnline() && this.getQueuedCasesCount() > 0) {
      this.processOfflineQueue();
    }
    this.notify();
    return this.isSimulatedOffline;
  }

  public setOfflineSimulation(simulated: boolean) {
    this.isSimulatedOffline = simulated;
    if (this.isOnline() && this.getQueuedCasesCount() > 0) {
      this.processOfflineQueue();
    }
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('gps_storage_updated'));
    }
  }

  private sanitizeLoadedData() {
    this.officers = this.officers.map(o => ({
      ...o,
      name: cleanOfficerName(o.name)
    }));

    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        name: cleanOfficerName(this.currentUser.name)
      };
    }

    this.cases = this.cases.map(c => ({
      ...c,
      officerInChargeName: c.officerInChargeName ? formatOfficerDisplayName(undefined, c.officerInChargeName) : undefined,
      submissions: c.submissions?.map(sub => ({
        ...sub,
        officerName: cleanOfficerName(sub.officerName)
      })) || [],
      witnessStatements: c.witnessStatements?.map(wit => ({
        ...wit,
        recordedByOfficerName: wit.recordedByOfficerName ? cleanOfficerName(wit.recordedByOfficerName) : undefined
      })) || [],
      evidence: c.evidence?.map(ev => ({
        ...ev,
        collectedByOfficerName: ev.collectedByOfficerName ? cleanOfficerName(ev.collectedByOfficerName) : undefined,
        chainOfCustodyLog: ev.chainOfCustodyLog?.map(log => ({
          ...log,
          officer: cleanOfficerName(log.officer)
        })) || []
      })) || []
    }));
  }

  private init() {
    try {
      const savedStations = localStorage.getItem(STORAGE_KEYS.STATIONS);
      if (savedStations) {
        this.stations = JSON.parse(savedStations);
      } else {
        this.stations = SEED_STATIONS;
        this.saveStations();
      }

      const savedOfficers = localStorage.getItem(STORAGE_KEYS.OFFICERS);
      if (savedOfficers) {
        this.officers = JSON.parse(savedOfficers);
      } else {
        this.officers = SEED_OFFICERS;
        this.saveOfficers();
      }

      this.currentUser = null;

      const savedCases = localStorage.getItem(STORAGE_KEYS.CASES);
      if (savedCases) {
        this.cases = JSON.parse(savedCases);
      } else {
        this.cases = isSupabaseConfigured ? [] : SEED_CASES;
        if (this.cases.length > 0) this.saveCases();
      }

      const savedQueue = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (savedQueue) {
        this.offlineQueue = JSON.parse(savedQueue);
      }

      const savedThreshold = localStorage.getItem(STORAGE_KEYS.AGING_THRESHOLD_DAYS);
      if (savedThreshold) {
        this.agingDaysThreshold = parseInt(savedThreshold, 10) || 14;
      }

      this.sanitizeLoadedData();

      idbStorage.getAllCases().then(idbCases => {
        if (idbCases && idbCases.length > 0 && (!this.cases || this.cases.length === 0)) {
          this.cases = idbCases;
          this.sanitizeLoadedData();
          this.notify();
        } else if (this.cases && this.cases.length > 0) {
          idbStorage.putCasesBatch(this.cases);
          supabaseSync.seedLocalCloudMirror(this.cases);
        }
      }).catch(err => {
        console.warn('IDB startup hydration error:', err);
      });

      idbStorage.getQueueItems().then(idbQueue => {
        if (idbQueue && idbQueue.length > 0 && (!this.offlineQueue || this.offlineQueue.length === 0)) {
          this.offlineQueue = idbQueue;
          this.notify();
        }
      }).catch(console.warn);
    } catch (e) {
      console.error('Failed to initialize GPS storage:', e);
      this.cases = SEED_CASES;
      this.stations = SEED_STATIONS;
      this.officers = SEED_OFFICERS;
      this.currentUser = null;
      this.sanitizeLoadedData();
    }
  }

  private saveCases() {
    try {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(this.cases));
      idbStorage.putCasesBatch(this.cases).catch(err => {
        console.warn('IDB background case persistence error:', err);
      });
    } catch (e) {
      console.error('Storage quota exceeded for cases:', e);
      idbStorage.putCasesBatch(this.cases).catch(console.warn);
    }
  }

  private saveOfficers() {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(this.officers));
    } catch (e) {
      console.error('Failed to save officers:', e);
    }
  }

  private saveStations() {
    try {
      localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(this.stations));
    } catch (e) {
      console.error('Failed to save stations:', e);
    }
  }

  private saveCurrentUser() {
    try {
      if (this.currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error('Failed to save current user:', e);
    }
  }

  private saveOfflineQueue() {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
      idbStorage.clearQueue().then(() => {
        idbStorage.putQueueItemsBatch(this.offlineQueue);
      }).catch(err => {
        console.warn('IDB background queue persistence error:', err);
      });
    } catch (e) {
      console.error('Failed to save queue:', e);
      idbStorage.putQueueItemsBatch(this.offlineQueue).catch(console.warn);
    }
  }

  // --- Auth & Users ---
  public getCurrentUser(): Officer | null {
    return this.currentUser;
  }

  public getOfficers(): Officer[] {
    return [...this.officers];
  }

  public getSeniorOfficers(): Officer[] {
    return this.officers.filter(o => o.role === 'senior_officer' || isSeniorOfficerRank(o.rank));
  }

  public getStations(): Station[] {
    return [...this.stations];
  }

  public setCurrentUser(officer: Officer | null) {
    this.currentUser = officer;
    this.saveCurrentUser();
    this.notify();
  }

  public async signOut(): Promise<void> {
    if (this.realtimeChannel && supabase) {
      await supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.supabaseUserId = null;
    try {
      await signOutSupabase();
    } catch (err) {
      console.warn('Supabase sign out notice:', err);
    }
    this.setCurrentUser(null);
  }

  public switchOfficerRole(role: OfficerRole) {
    if (this.currentUser && this.supabaseUserId && supabase) {
      const updatedUser: Officer = {
        ...this.currentUser,
        role,
      };
      this.setCurrentUser(updatedUser);
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabaseSync.loadOrCreateOfficerProfile(data.user, updatedUser).catch(console.warn);
        }
      });
      return;
    }

    const target = this.officers.find(o => o.role === role);
    if (target) {
      this.setCurrentUser(target);
    }
  }

  public addOfficer(officer: Officer) {
    this.officers.push(officer);
    this.saveOfficers();
    this.notify();
  }

  // --- Cases CRUD ---
  public getCases(): CaseRecord[] {
    return [...this.cases];
  }

  public getCaseById(id: string): CaseRecord | undefined {
    return this.cases.find(c => c.id === id);
  }

  public getCaseByDocket(docket: string): CaseRecord | undefined {
    return this.cases.find(c => c.docketNumber.toLowerCase() === docket.toLowerCase());
  }

  public createCase(newCase: Omit<CaseRecord, 'id'>): CaseRecord {
    const id = 'case_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const online = this.isOnline();
    const nowTs = Date.now();
    const uid = this.supabaseUserId || undefined;
    const sanitizedCase: CaseRecord = {
      ...newCase,
      id,
      createdByUid: uid,
      offenceTitle: sanitizeText(newCase.offenceTitle),
      narrative: sanitizeText(newCase.narrative),
      locationDescription: sanitizeText(newCase.locationDescription),
      latitude:
        typeof newCase.latitude === 'number' && Number.isFinite(newCase.latitude)
          ? Number(newCase.latitude.toFixed(6))
          : undefined,
      longitude:
        typeof newCase.longitude === 'number' && Number.isFinite(newCase.longitude)
          ? Number(newCase.longitude.toFixed(6))
          : undefined,
      isOfflineStaged: !online,
      syncedAt: online ? new Date().toISOString() : undefined,
      updatedTimestamp: nowTs,
      serverTimestamp: online ? nowTs : undefined,
      complainant: {
        ...newCase.complainant,
        fullName: sanitizeText(newCase.complainant.fullName),
        address: sanitizeText(newCase.complainant.address),
        occupation: sanitizeText(newCase.complainant.occupation)
      }
    };

    if (!online) {
      this.offlineQueue.push({
        id: 'q_' + Date.now(),
        action: 'create_case',
        payload: sanitizedCase,
        timestamp: new Date().toISOString(),
        clientTimestamp: nowTs,
        status: 'pending'
      });
      this.saveOfflineQueue();
    } else {
      idbStorage.putCloudServerRecord(sanitizedCase.id, sanitizedCase.docketNumber, sanitizedCase, nowTs);
      if (this.supabaseUserId) {
        supabaseSync.createCaseInSupabase(sanitizedCase, this.supabaseUserId).then(res => {
          if (!res.ok) {
            console.error('Supabase createCase error:', res.error);
          } else if (res.savedCase) {
            const idx = this.cases.findIndex(c => c.id === sanitizedCase.id);
            if (idx !== -1) {
              this.cases[idx] = res.savedCase;
              this.saveCases();
              this.notify();
            }
          }
        }).catch(err => {
          console.error('Supabase createCase error:', err);
        });
      }
    }

    this.cases.unshift(sanitizedCase);
    this.saveCases();
    this.notify();
    return sanitizedCase;
  }

  public updateCaseStatus(caseId: string, status: CaseStatus, note?: string): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    c.status = status;
    c.statusUpdatedAt = new Date().toISOString();

    if (note && this.currentUser) {
      c.submissions.push({
        id: 'sub_' + Date.now(),
        caseId,
        officerId: this.currentUser.id,
        officerName: this.currentUser.name,
        officerBadge: this.currentUser.badgeId,
        officerRank: this.currentUser.rank,
        officerRole: this.currentUser.role,
        submissionType: this.currentUser.role === 'senior_officer' ? 'senior_endorsement' : 'investigation_finding',
        title: `Status Progression: ${status.replace(/_/g, ' ').toUpperCase()}`,
        content: sanitizeText(note),
        timestamp: new Date().toISOString()
      });
    }

    const nowTs = Date.now();
    c.updatedTimestamp = nowTs;

    if (!this.isOnline()) {
      this.offlineQueue.push({
        id: 'q_' + Date.now(),
        action: 'update_case_status',
        payload: { caseId, status, note },
        timestamp: new Date().toISOString(),
        clientTimestamp: nowTs,
        status: 'pending'
      });
      this.saveOfflineQueue();
    } else {
      c.serverTimestamp = nowTs;
      idbStorage.putCloudServerRecord(c.id, c.docketNumber, c, nowTs);
      if (this.supabaseUserId) {
        supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
          status: c.status,
          status_updated_at: c.statusUpdatedAt,
          submissions: c.submissions,
        }).catch(err => console.error('Supabase updateCaseStatus error:', err));
      }
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public addSubmission(caseId: string, submission: Omit<CaseSubmission, 'id'>): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    const nowTs = Date.now();
    const newSub: CaseSubmission = {
      ...submission,
      id: 'sub_' + Date.now(),
      title: sanitizeText(submission.title),
      content: sanitizeText(submission.content)
    };

    c.submissions.push(newSub);
    c.statusUpdatedAt = new Date().toISOString();
    c.updatedTimestamp = nowTs;

    if (!this.isOnline()) {
      this.offlineQueue.push({
        id: 'q_' + Date.now(),
        action: 'add_submission',
        payload: { caseId, submission: newSub },
        timestamp: new Date().toISOString(),
        clientTimestamp: nowTs,
        status: 'pending'
      });
      this.saveOfflineQueue();
    } else {
      c.serverTimestamp = nowTs;
      idbStorage.putCloudServerRecord(c.id, c.docketNumber, c, nowTs);
      if (this.supabaseUserId) {
        supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
          submissions: c.submissions,
          status_updated_at: c.statusUpdatedAt,
        }).catch(err => console.error('Supabase addSubmission error:', err));
      }
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public addEvidence(caseId: string, evidence: Omit<EvidenceItem, 'id'>): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    const nowTs = Date.now();
    const newEv: EvidenceItem = {
      ...evidence,
      id: 'ev_' + Date.now(),
      description: sanitizeText(evidence.description),
      storageLocker: sanitizeText(evidence.storageLocker)
    };

    c.evidence.push(newEv);
    c.updatedTimestamp = nowTs;

    if (!this.isOnline()) {
      this.offlineQueue.push({
        id: 'q_' + Date.now(),
        action: 'add_evidence',
        payload: { caseId, evidence: newEv },
        timestamp: new Date().toISOString(),
        clientTimestamp: nowTs,
        status: 'pending'
      });
      this.saveOfflineQueue();
    } else {
      c.serverTimestamp = nowTs;
      idbStorage.putCloudServerRecord(c.id, c.docketNumber, c, nowTs);
      if (this.supabaseUserId) {
        supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
          evidence: c.evidence,
        }).catch(err => console.error('Supabase addEvidence error:', err));
      }
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public addWitnessStatement(caseId: string, statement: Omit<WitnessStatement, 'id'>): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    const nowTs = Date.now();
    const newStmt: WitnessStatement = {
      ...statement,
      id: 'wit_' + Date.now(),
      witnessName: sanitizeText(statement.witnessName),
      statementText: sanitizeText(statement.statementText)
    };

    c.witnessStatements.push(newStmt);
    c.updatedTimestamp = nowTs;

    if (!this.isOnline()) {
      this.offlineQueue.push({
        id: 'q_' + Date.now(),
        action: 'add_submission',
        payload: { caseId, witnessStatement: newStmt },
        timestamp: new Date().toISOString(),
        clientTimestamp: nowTs,
        status: 'pending'
      });
      this.saveOfflineQueue();
    } else {
      c.serverTimestamp = nowTs;
      idbStorage.putCloudServerRecord(c.id, c.docketNumber, c, nowTs);
      if (this.supabaseUserId) {
        supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
          witness_statements: c.witnessStatements,
        }).catch(err => console.error('Supabase addWitnessStatement error:', err));
      }
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public addSuspect(caseId: string, suspect: Omit<Suspect, 'id'>): Suspect | null {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return null;

    const newSuspect: Suspect = {
      ...suspect,
      id: 'susp_' + Date.now(),
      fullName: sanitizeText(suspect.fullName),
      alias: sanitizeText(suspect.alias),
      address: sanitizeText(suspect.address),
      cautionStatement: sanitizeText(suspect.cautionStatement),
      linkedCaseIds: [caseId]
    };

    const nowTs = Date.now();
    c.suspects.push(newSuspect);
    c.statusUpdatedAt = new Date().toISOString();
    c.updatedTimestamp = nowTs;

    if (!this.isOnline()) {
      this.offlineQueue.push({
        id: 'q_' + Date.now(),
        action: 'add_suspect',
        payload: { caseId, suspect: newSuspect },
        timestamp: new Date().toISOString(),
        clientTimestamp: nowTs,
        status: 'pending'
      });
      this.saveOfflineQueue();
    } else {
      c.serverTimestamp = nowTs;
      idbStorage.putCloudServerRecord(c.id, c.docketNumber, c, nowTs);
      if (this.supabaseUserId) {
        supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
          suspects: c.suspects,
          status_updated_at: c.statusUpdatedAt,
        }).catch(err => console.error('Supabase addSuspect error:', err));
      }
    }

    this.saveCases();
    this.notify();
    return newSuspect;
  }

  public updateSuspectCaution(caseId: string, suspectId: string, statement: string): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    const susp = c.suspects.find(s => s.id === suspectId);
    if (!susp) return false;

    susp.cautionStatement = sanitizeText(statement);
    susp.cautionStatementTimestamp = new Date().toISOString();
    if (this.currentUser) {
      susp.cautionStatementOfficerId = this.currentUser.id;
    }

    if (this.isOnline() && this.supabaseUserId) {
      supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
        suspects: c.suspects,
      }).catch(err => console.error('Supabase updateSuspectCaution error:', err));
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public setCourtRecord(caseId: string, record: any): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    c.courtRecord = record;
    c.status = 'forwarded_to_court';
    c.statusUpdatedAt = new Date().toISOString();

    if (this.isOnline() && this.supabaseUserId) {
      supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
        court_record: c.courtRecord,
        status: c.status,
        status_updated_at: c.statusUpdatedAt,
      }).catch(err => console.error('Supabase setCourtRecord error:', err));
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public setBailDisposition(caseId: string, notes: string): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    c.status = 'bail_granted';
    c.dispositionNotes = sanitizeText(notes);
    c.dispositionDate = new Date().toISOString();
    c.statusUpdatedAt = new Date().toISOString();

    if (this.isOnline() && this.supabaseUserId) {
      supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
        status: c.status,
        disposition_notes: c.dispositionNotes,
        disposition_date: c.dispositionDate,
        status_updated_at: c.statusUpdatedAt,
      }).catch(err => console.error('Supabase setBailDisposition error:', err));
    }

    this.saveCases();
    this.notify();
    return true;
  }

  public setClosedDisposition(caseId: string, notes: string): boolean {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return false;

    c.status = 'closed_withdrawn';
    c.dispositionNotes = sanitizeText(notes);
    c.dispositionDate = new Date().toISOString();
    c.statusUpdatedAt = new Date().toISOString();

    if (this.isOnline() && this.supabaseUserId) {
      supabaseSync.updateCaseInSupabase(caseId, this.supabaseUserId, {
        status: c.status,
        disposition_notes: c.dispositionNotes,
        disposition_date: c.dispositionDate,
        status_updated_at: c.statusUpdatedAt,
      }).catch(err => console.error('Supabase setClosedDisposition error:', err));
    }

    this.saveCases();
    this.notify();
    return true;
  }

  // --- Cross-Station Intelligence & Matches ---
  public findCrossStationMatches(targetCaseId?: string): SuspectMatchAlert[] {
    const alerts: SuspectMatchAlert[] = [];
    const allCases = this.cases;

    const suspectPool: Array<{ suspect: Suspect; caseRec: CaseRecord }> = [];
    allCases.forEach(c => {
      c.suspects.forEach(s => {
        suspectPool.push({ suspect: s, caseRec: c });
      });
    });

    for (let i = 0; i < suspectPool.length; i++) {
      for (let j = i + 1; j < suspectPool.length; j++) {
        const a = suspectPool[i];
        const b = suspectPool[j];

        if (a.caseRec.id === b.caseRec.id) continue;

        if (targetCaseId && a.caseRec.id !== targetCaseId && b.caseRec.id !== targetCaseId) {
          continue;
        }

        let isMatch = false;
        let reason = '';

        if (
          a.suspect.ghanaCardId &&
          b.suspect.ghanaCardId &&
          a.suspect.ghanaCardId.trim().toUpperCase() === b.suspect.ghanaCardId.trim().toUpperCase()
        ) {
          isMatch = true;
          reason = `Exact Ghana Card ID match (${a.suspect.ghanaCardId})`;
        } else if (
          a.suspect.fullName &&
          b.suspect.fullName &&
          a.suspect.fullName.trim().toLowerCase() === b.suspect.fullName.trim().toLowerCase() &&
          a.suspect.fullName.length > 4
        ) {
          isMatch = true;
          reason = `Identical Full Name across stations ("${a.suspect.fullName}")`;
        } else if (
          a.suspect.alias &&
          b.suspect.alias &&
          a.suspect.alias.trim().toLowerCase() === b.suspect.alias.trim().toLowerCase() &&
          a.suspect.alias.length > 3
        ) {
          isMatch = true;
          reason = `Identical Street Alias ("${a.suspect.alias}")`;
        }

        if (isMatch) {
          alerts.push({
            id: `match_${a.suspect.id}_${b.suspect.id}`,
            suspectId: a.suspect.id,
            suspectName: a.suspect.fullName,
            suspectAlias: a.suspect.alias,
            ghanaCardId: a.suspect.ghanaCardId,
            currentCaseId: a.caseRec.id,
            currentCaseDocket: a.caseRec.docketNumber,
            currentStationName: a.caseRec.stationName,
            matchedCaseId: b.caseRec.id,
            matchedCaseDocket: b.caseRec.docketNumber,
            matchedStationName: b.caseRec.stationName,
            matchedOffence: b.caseRec.offenceCategory.replace(/_/g, ' '),
            similarityReason: reason,
            detectedAt: new Date().toISOString()
          });
        }
      }
    }

    return alerts;
  }

  // --- Aging Cases Analytics ---
  public getAgingCases(): Array<{ caseRecord: CaseRecord; daysInactive: number; threshold: number }> {
    const now = new Date().getTime();

    return this.cases
      .filter(c => c.status === 'lodged' || c.status === 'under_investigation' || c.flaggedForSeniorReview)
      .map(c => {
        const lastUpdated = new Date(c.statusUpdatedAt || c.lodgedDateTime).getTime();
        const diffMs = Math.max(0, now - lastUpdated);
        const daysInactive = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        return {
          caseRecord: c,
          daysInactive,
          threshold: this.agingDaysThreshold
        };
      })
      .filter(item => item.daysInactive >= this.agingDaysThreshold || item.caseRecord.flaggedForSeniorReview)
      .sort((a, b) => b.daysInactive - a.daysInactive);
  }

  public getAgingThreshold(): number {
    return this.agingDaysThreshold;
  }

  public setAgingThreshold(days: number) {
    this.agingDaysThreshold = Math.max(1, days);
    localStorage.setItem(STORAGE_KEYS.AGING_THRESHOLD_DAYS, this.agingDaysThreshold.toString());
    this.notify();
  }

  // --- Summary Metrics ---
  public getDashboardMetrics() {
    const all = this.cases;
    const totalCases = all.length;
    const forwardedToCourt = all.filter(c => c.status === 'forwarded_to_court').length;
    const lodged = all.filter(c => c.status === 'lodged').length;
    const underInvestigation = all.filter(c => c.status === 'under_investigation').length;
    const bailGranted = all.filter(c => c.status === 'bail_granted').length;
    const closedWithdrawn = all.filter(c => c.status === 'closed_withdrawn').length;

    const allSuspects: Suspect[] = [];
    all.forEach(c => allSuspects.push(...c.suspects));
    const totalSuspects = allSuspects.length;
    const remandedPrisoners = allSuspects.filter(s => s.arrestStatus === 'remanded').length;
    const arrestedCount = allSuspects.filter(s => s.arrestStatus === 'arrested' || s.arrestStatus === 'remanded').length;

    const categoryCounts: Record<OffenceCategory, number> = {
      theft: 0,
      robbery: 0,
      assault: 0,
      fraud_scam: 0,
      domestic_violence: 0,
      narcotics: 0,
      cybercrime: 0,
      homicide: 0,
      traffic_infraction: 0,
      unlawful_damage: 0,
      other: 0
    };

    all.forEach(c => {
      if (categoryCounts[c.offenceCategory] !== undefined) {
        categoryCounts[c.offenceCategory]++;
      } else {
        categoryCounts.other++;
      }
    });

    const agingCases = this.getAgingCases();
    const suspectMatches = this.findCrossStationMatches();

    return {
      totalCases,
      forwardedToCourt,
      lodged,
      underInvestigation,
      bailGranted,
      closedWithdrawn,
      totalSuspects,
      remandedPrisoners,
      arrestedCount,
      categoryCounts,
      agingCasesCount: agingCases.length,
      suspectMatchesCount: suspectMatches.length
    };
  }

  // --- Offline Management ---
  public isAppOnline(): boolean {
    return this.isOnline();
  }

  public getQueuedCasesCount(): number {
    return this.offlineQueue.filter(q => q.status === 'pending').length;
  }

  public async syncOfflineQueue(): Promise<{
    count: number;
    conflicts: any[];
    recordsSynced: string[];
  }> {
    return await this.processOfflineQueue();
  }

  public getOfflineStatus(): { isOnline: boolean; isSimulated: boolean; queueLength: number; pendingItems: OfflineQueueItem[] } {
    const pendingItems = this.offlineQueue.filter(q => q.status === 'pending');
    return {
      isOnline: this.isOnline(),
      isSimulated: this.isSimulatedOffline,
      queueLength: pendingItems.length,
      pendingItems
    };
  }

  public getOfflineQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  public async processOfflineQueue(): Promise<{
    count: number;
    conflicts: any[];
    recordsSynced: string[];
  }> {
    if (!this.isOnline()) return { count: 0, conflicts: [], recordsSynced: [] };
    const pendingItems = this.offlineQueue.filter(q => q.status === 'pending');
    if (pendingItems.length === 0) return { count: 0, conflicts: [], recordsSynced: [] };

    const nowIso = new Date().toISOString();

    try {
      const result = await supabaseSync.pushBatchToSupabase(
        this.offlineQueue,
        this.cases,
        this.supabaseUserId
      );

      this.cases = result.updatedCases;
      this.offlineQueue = result.updatedQueue;

      this.saveCases();
      this.saveOfflineQueue();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('gps_offline_synced', {
            detail: {
              count: result.syncResult.syncedCount,
              conflictsCount: result.syncResult.conflictServerRetainedCount,
              conflicts: result.syncResult.conflicts,
              syncedAt: nowIso
            }
          })
        );
      }

      this.notify();

      return {
        count: result.syncResult.syncedCount,
        conflicts: result.syncResult.conflicts,
        recordsSynced: result.syncResult.recordsSynced
      };
    } catch (err) {
      console.error('Supabase background push error:', err);
      return { count: 0, conflicts: [], recordsSynced: [] };
    }
  }

  public clearOfflineQueue() {
    this.offlineQueue = [];
    this.saveOfflineQueue();
    this.notify();
  }

  public resetToDefaultDemoData() {
    this.cases = SEED_CASES;
    this.stations = SEED_STATIONS;
    this.officers = SEED_OFFICERS;
    this.currentUser = SEED_OFFICERS[0];
    this.offlineQueue = [];
    this.agingDaysThreshold = 14;
    this.saveCases();
    this.saveStations();
    this.saveOfficers();
    this.saveCurrentUser();
    this.saveOfflineQueue();
    localStorage.removeItem(STORAGE_KEYS.AGING_THRESHOLD_DAYS);
    this.notify();
  }
}

export const storage = new StorageService();
