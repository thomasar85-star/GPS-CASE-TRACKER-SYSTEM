export type OfficerRole = 'counter_nco' | 'station_officer' | 'investigator' | 'senior_officer';

export type CaseStatus =
  | 'lodged'
  | 'under_investigation'
  | 'suspect_arrested'
  | 'forwarded_to_court'
  | 'bail_granted'
  | 'closed_withdrawn';

export type OffenceCategory =
  | 'theft'
  | 'robbery'
  | 'assault'
  | 'fraud_scam'
  | 'domestic_violence'
  | 'narcotics'
  | 'cybercrime'
  | 'homicide'
  | 'traffic_infraction'
  | 'unlawful_damage'
  | 'other';

export interface Station {
  id: string;
  name: string;
  code: string;
  region: string;
  division: string;
  phone: string;
  commander: string;
}

export interface Officer {
  id: string;
  name: string;
  badgeId: string;
  rank: string;
  stationId: string;
  stationName: string;
  role: OfficerRole;
  email: string;
  passwordHash: string; // Simulated SHA-256 hash
  phone: string;
  avatarUrl?: string;
}

export interface Complainant {
  id: string;
  fullName: string;
  ghanaCardId?: string;
  phone: string;
  email?: string;
  address: string;
  gender: 'male' | 'female' | 'other';
  occupation?: string;
  photoUrl?: string;
  ghanaCardScanUrl?: string;
  relationshipToVictim?: string;
}

export interface Suspect {
  id: string;
  fullName: string;
  alias?: string;
  ghanaCardId?: string;
  gender: 'male' | 'female' | 'other';
  approximateAge?: number;
  phone?: string;
  address?: string;
  photoUrl?: string;
  ghanaCardScanUrl?: string;
  cautionStatement?: string;
  cautionStatementTimestamp?: string;
  cautionStatementOfficerId?: string;
  arrestStatus: 'wanted' | 'arrested' | 'remanded' | 'bail_granted' | 'discharged';
  arrestDate?: string;
  remandFacility?: string;
  bailDetails?: {
    grantedDate: string;
    amountGHS?: number;
    suretiesCount?: number;
    suretyDetails?: string;
  };
  linkedCaseIds: string[];
}

export interface EvidenceItem {
  id: string;
  caseId: string;
  itemNumber: string;
  category: 'physical' | 'digital' | 'document' | 'forensic' | 'biological';
  description: string;
  photoUrl?: string;
  dateCollected: string;
  collectedByOfficerName: string;
  storageLocker: string;
  chainOfCustodyLog: Array<{
    date: string;
    action: string;
    officer: string;
    reason: string;
  }>;
}

export interface WitnessStatement {
  id: string;
  caseId: string;
  witnessName: string;
  contact: string;
  ghanaCardId?: string;
  statementText: string;
  witnessPhotoUrl?: string;
  documentScanUrl?: string;
  dateRecorded: string;
  recordedByOfficerName: string;
  verified: boolean;
}

export type SubmissionType =
  | 'initial_intake'
  | 'station_supervision'
  | 'investigation_finding'
  | 'senior_endorsement'
  | 'directive';

export interface CaseSubmission {
  id: string;
  caseId: string;
  officerId: string;
  officerName: string;
  officerBadge: string;
  officerRank: string;
  officerRole: OfficerRole;
  submissionType: SubmissionType;
  title: string;
  content: string;
  mediaUrls?: string[];
  timestamp: string;
  isEndorsed?: boolean;
  endorsedBy?: {
    officerName: string;
    officerBadge: string;
    timestamp: string;
    comments: string;
  };
}

export interface CourtProceedingEntry {
  id: string;
  date: string;
  presidingJudge: string;
  courtName: string;
  proceedingsSummary: string;
  nextAdjournmentDate?: string;
  adjournmentReason?: string;
}

export interface CourtRecord {
  courtName: string;
  suitNumber: string;
  prosecutingOfficer: string;
  firstHearingDate: string;
  presidingJudge?: string;
  proceedings: CourtProceedingEntry[];
  finalOutcome?: 'convicted' | 'acquitted' | 'dismissed' | 'settled_out_of_court' | 'pending_trial';
  verdictDate?: string;
  sentenceSummary?: string;
}

export interface CaseRecord {
  id: string;
  docketNumber: string; // e.g. GPS/ACR/CR-2026/0042
  offenceCategory: OffenceCategory;
  offenceTitle: string;
  act29OffenceCode?: string;
  act29Section?: string; // e.g. "Section 124" or "Section 149"
  statuteCitation?: string; // e.g. "Criminal Offences Act, 1960 (Act 29), Section 124"
  incidentDateTime: string;
  lodgedDateTime: string;
  stationId: string;
  stationName: string;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
  narrative: string;
  complainant: Complainant;
  suspects: Suspect[];
  evidence: EvidenceItem[];
  witnessStatements: WitnessStatement[];
  submissions: CaseSubmission[];
  officerInChargeId?: string;
  officerInChargeName?: string;
  officerInChargeBadge?: string;
  status: CaseStatus;
  statusUpdatedAt: string;
  priority: 'low' | 'standard' | 'urgent' | 'critical';
  courtRecord?: CourtRecord;
  dispositionNotes?: string;
  dispositionDate?: string;
  flaggedForSeniorReview?: boolean;
  flagReason?: string;
  crimeScenePhotos?: string[];
  stolenPropertyPhotos?: string[];
  isSynthetic: boolean;
  isOfflineStaged?: boolean;
  syncedAt?: string;
  createdByUid?: string; // Supabase Auth user UUID
  updatedTimestamp?: number; // Epoch timestamp for replication conflict check
  serverTimestamp?: number;  // Server recorded timestamp on Supabase database
  syncConflictNote?: string; // Information on duplicate conflict resolution
}

export interface SuspectMatchAlert {
  id: string;
  suspectId: string;
  suspectName: string;
  suspectAlias?: string;
  ghanaCardId?: string;
  currentCaseId: string;
  currentCaseDocket: string;
  currentStationName: string;
  matchedCaseId: string;
  matchedCaseDocket: string;
  matchedStationName: string;
  matchedOffence: string;
  similarityReason: string;
  detectedAt: string;
}

export interface OfflineQueueItem {
  id: string;
  action: 'create_case' | 'update_case_status' | 'add_submission' | 'add_evidence' | 'add_suspect';
  payload: any;
  timestamp: string;
  clientTimestamp?: number;
  status: 'pending' | 'synced' | 'failed' | 'conflict_retained_server';
  conflictResolution?: {
    type: 'server_retained' | 'client_accepted' | 'merged';
    reason: string;
    resolvedAt: string;
    serverTimestamp?: number;
    clientTimestamp?: number;
  };
  errorMessage?: string;
}

export type ActiveView =
  | 'dashboard'
  | 'case_list'
  | 'cases_list'
  | 'lodge_complaint'
  | 'case_detail'
  | 'suspect_directory'
  | 'suspects_directory'
  | 'senior_command';
