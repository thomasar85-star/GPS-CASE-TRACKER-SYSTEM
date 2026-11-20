import { RealtimeChannel } from '@supabase/supabase-js';
import {
  ensureSupabaseInitialized,
  getSupabaseCredentials,
  isSupabaseConfigured,
  supabase,
  SupabaseUser,
} from '../lib/supabase';
import { CaseRecord, OffenceCategory, Officer, OfflineQueueItem, Station } from '../types';
import { idbStorage } from './indexedDb';
import { SEED_STATIONS } from '../data/seedData';
import { getPlaceholderImage, quickHash } from '../utils/security';

export interface SupabaseSyncResult {
  totalProcessed: number;
  syncedCount: number;
  conflictServerRetainedCount: number;
  conflicts: Array<{
    docketNumber: string;
    caseId: string;
    action: string;
    clientTimestamp: number;
    serverTimestamp: number;
    reason: string;
    resolution: 'server_record_retained';
  }>;
  recordsSynced: string[];
}

interface TableSchemaMeta {
  casesColumns: Set<string>;
  casesIdType: string;
  hasStationsTable: boolean;
  hasProfilesTable: boolean;
}

function toFiniteNumber(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function inferCategoryFromText(text: string): OffenceCategory {
  const t = text.toLowerCase();
  if (t.includes('rob')) return 'robbery';
  if (t.includes('steal') || t.includes('theft') || t.includes('burgl')) return 'theft';
  if (t.includes('assault') || t.includes('harm') || t.includes('battery')) return 'assault';
  if (t.includes('fraud') || t.includes('scam') || t.includes('forgery')) return 'fraud_scam';
  if (t.includes('domestic') || t.includes('dovvsu')) return 'domestic_violence';
  if (t.includes('cyber') || t.includes('momo') || t.includes('wire')) return 'cybercrime';
  if (t.includes('narcotic') || t.includes('drug')) return 'narcotics';
  if (t.includes('homicide') || t.includes('murder')) return 'homicide';
  if (t.includes('traffic') || t.includes('motor') || t.includes('accident')) return 'traffic_infraction';
  if (t.includes('damage')) return 'unlawful_damage';
  return 'other';
}

function normalizeDocketNumber(docket: string): string {
  const cleaned = docket
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9/\-]/g, '-');
  return (cleaned.length >= 3 ? cleaned : `GPS-${cleaned || 'DOCKET'}`).slice(0, 64);
}

function normalizeBadgeId(badge: string): string {
  const cleaned = badge
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '-');
  return (cleaned.length >= 2 ? cleaned : 'GPS-000').slice(0, 64);
}

function toDbCaseRow(c: CaseRecord, userId: string): Record<string, unknown> {
  const nowTs = Date.now();
  const hasLat = typeof c.latitude === 'number' && Number.isFinite(c.latitude);
  const hasLng = typeof c.longitude === 'number' && Number.isFinite(c.longitude);
  const complainantPayload: Record<string, unknown> = {
    ...(c.complainant || {}),
  };
  if (hasLat && hasLng) {
    complainantPayload.gpsLocation = {
      latitude: c.latitude,
      longitude: c.longitude,
    };
  }

  return {
    id: c.id,
    user_id: userId,
    docket_number: normalizeDocketNumber(c.docketNumber),
    offence_category: c.offenceCategory,
    offence_title: c.offenceTitle,
    act29_offence_code: c.act29OffenceCode || null,
    act29_section: c.act29Section || null,
    statute_citation: c.statuteCitation || null,
    incident_date_time: c.incidentDateTime,
    lodged_date_time: c.lodgedDateTime,
    station_id: c.stationId,
    station_name: c.stationName,
    location_description: c.locationDescription,
    latitude: hasLat ? c.latitude : null,
    longitude: hasLng ? c.longitude : null,
    narrative: c.narrative,
    complainant: complainantPayload,
    suspects: c.suspects || [],
    evidence: c.evidence || [],
    witness_statements: c.witnessStatements || [],
    submissions: c.submissions || [],
    officer_in_charge_id: c.officerInChargeId || null,
    officer_in_charge_name: c.officerInChargeName || null,
    officer_in_charge_badge: c.officerInChargeBadge || null,
    status: c.status,
    status_updated_at: c.statusUpdatedAt || new Date().toISOString(),
    priority: c.priority,
    court_record: c.courtRecord || null,
    disposition_notes: c.dispositionNotes || null,
    disposition_date: c.dispositionDate || null,
    flagged_for_senior_review: Boolean(c.flaggedForSeniorReview),
    flag_reason: c.flagReason || null,
    crime_scene_photos: c.crimeScenePhotos || null,
    stolen_property_photos: c.stolenPropertyPhotos || null,
    is_synthetic: Boolean(c.isSynthetic),
    is_offline_staged: false,
    synced_at: new Date().toISOString(),
    updated_timestamp: c.updatedTimestamp || nowTs,
    server_timestamp: c.serverTimestamp || nowTs,
    sync_conflict_note: c.syncConflictNote || null,
    updated_at: new Date().toISOString(),
  };
}

function fromDbCaseRow(row: any): CaseRecord {
  const idStr = String(row.id ?? `case_${Date.now()}`);
  const gpsLoc = row.complainant?.gpsLocation;
  const lat = toFiniteNumber(
    row.latitude ?? row.lat ?? row.gps_latitude ?? row.gps_lat ?? gpsLoc?.latitude
  );
  const lng = toFiniteNumber(
    row.longitude ?? row.lng ?? row.lon ?? row.long ?? row.gps_longitude ?? row.gps_lng ?? gpsLoc?.longitude
  );

  const offenceTitle = String(
    row.offence_title ?? row.offence ?? row.crime ?? row.title ?? 'Reported Case'
  );
  const offenceCategory: OffenceCategory =
    row.offence_category || inferCategoryFromText(offenceTitle);

  const victimName = String(
    row.complainant?.fullName ??
      row.victim_name ??
      row.victim ??
      row.complainant_name ??
      'Unknown Victim'
  );

  const suspectNameRaw = row.suspect_name ?? row.suspect ?? '';
  const suspects = Array.isArray(row.suspects)
    ? row.suspects
    : typeof suspectNameRaw === 'string' && suspectNameRaw.trim()
    ? [
        {
          id: `susp_${idStr}`,
          fullName: suspectNameRaw.trim(),
          gender: 'other' as const,
          arrestStatus: 'wanted' as const,
          photoUrl: getPlaceholderImage('suspect', suspectNameRaw.trim()),
          linkedCaseIds: [idStr],
        },
      ]
    : [];

  const narrative = String(
    row.narrative ?? row.description ?? row.case_description ?? row.details ?? ''
  );

  const fallbackCreated =
    row.lodged_date_time || row.created_at || new Date().toISOString();

  const locationDescription = String(
    row.location_description ??
      row.location ??
      row.address ??
      (lat !== undefined && lng !== undefined
        ? `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`
        : 'GPS Location Recorded')
  );

  const docketNumber = String(
    row.docket_number ??
      row.case_number ??
      `GPS-CASE-${idStr.slice(0, 8).toUpperCase()}`
  );

  const updatedTs =
    Number(row.updated_timestamp) ||
    (row.updated_at ? new Date(row.updated_at).getTime() : 0) ||
    (row.created_at ? new Date(row.created_at).getTime() : Date.now());

  return {
    id: idStr,
    createdByUid: row.user_id ? String(row.user_id) : undefined,
    docketNumber,
    offenceCategory,
    offenceTitle,
    act29OffenceCode: row.act29_offence_code || undefined,
    act29Section: row.act29_section || undefined,
    statuteCitation: row.statute_citation || undefined,
    incidentDateTime: String(row.incident_date_time || fallbackCreated),
    lodgedDateTime: String(fallbackCreated),
    stationId: String(row.station_id || SEED_STATIONS[0].id),
    stationName: String(row.station_name || SEED_STATIONS[0].name),
    locationDescription,
    latitude: lat,
    longitude: lng,
    narrative,
    complainant:
      row.complainant && typeof row.complainant === 'object'
        ? {
            id: row.complainant.id || `comp_${idStr}`,
            fullName: victimName,
            phone: row.complainant.phone || '',
            address: row.complainant.address || locationDescription,
            gender: row.complainant.gender || 'other',
            ...row.complainant,
          }
        : {
            id: `comp_${idStr}`,
            fullName: victimName,
            phone: '',
            address: locationDescription,
            gender: 'other',
            photoUrl: getPlaceholderImage('complainant', victimName),
          },
    suspects,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    witnessStatements: Array.isArray(row.witness_statements) ? row.witness_statements : [],
    submissions: Array.isArray(row.submissions) ? row.submissions : [],
    officerInChargeId: row.officer_in_charge_id || undefined,
    officerInChargeName: row.officer_in_charge_name || row.officer_name || undefined,
    officerInChargeBadge: row.officer_in_charge_badge || undefined,
    status: row.status || 'lodged',
    statusUpdatedAt: String(row.status_updated_at || fallbackCreated),
    priority: row.priority || 'standard',
    courtRecord: row.court_record || undefined,
    dispositionNotes: row.disposition_notes || undefined,
    dispositionDate: row.disposition_date || undefined,
    flaggedForSeniorReview: Boolean(row.flagged_for_senior_review),
    flagReason: row.flag_reason || undefined,
    crimeScenePhotos: Array.isArray(row.crime_scene_photos) ? row.crime_scene_photos : undefined,
    stolenPropertyPhotos: Array.isArray(row.stolen_property_photos)
      ? row.stolen_property_photos
      : undefined,
    isSynthetic: Boolean(row.is_synthetic),
    isOfflineStaged: false,
    syncedAt: row.synced_at || fallbackCreated,
    updatedTimestamp: updatedTs,
    serverTimestamp: Number(row.server_timestamp) || updatedTs,
    syncConflictNote: row.sync_conflict_note || undefined,
  };
}

class SupabaseSyncService {
  private stationsSeeded = false;
  private schemaMeta: TableSchemaMeta | null = null;

  public isConfigured(): boolean {
    return isSupabaseConfigured && Boolean(supabase);
  }

  private async discoverSchema(): Promise<TableSchemaMeta | null> {
    if (this.schemaMeta) return this.schemaMeta;
    await ensureSupabaseInitialized();
    const { url, anonKey } = getSupabaseCredentials();
    if (!url || !anonKey) return null;

    try {
      const sessionRes = supabase ? await supabase.auth.getSession() : null;
      const bearer = sessionRes?.data?.session?.access_token || anonKey;
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${bearer}`,
        },
      });
      if (!res.ok) return null;
      const doc = await res.json();
      const defs = doc?.definitions || {};
      const casesDef = defs.cases;
      const casesProps = casesDef?.properties || {};
      const casesColumns = new Set<string>(Object.keys(casesProps));
      const idDef = casesProps.id || {};
      const casesIdType = String(idDef.format || idDef.type || 'text');

      this.schemaMeta = {
        casesColumns,
        casesIdType,
        hasStationsTable: Boolean(defs.stations),
        hasProfilesTable: Boolean(defs.profiles),
      };
      return this.schemaMeta;
    } catch {
      return null;
    }
  }

  public async getAuthenticatedUserId(): Promise<string | null> {
    await ensureSupabaseInitialized();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }

  public async ensureStationsSeeded(stationsList: Station[] = SEED_STATIONS): Promise<void> {
    await ensureSupabaseInitialized();
    if (!supabase || this.stationsSeeded) return;
    const schema = await this.discoverSchema();
    if (schema && !schema.hasStationsTable) {
      this.stationsSeeded = true;
      return;
    }

    const rows = stationsList.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      region: s.region,
      division: s.division,
      phone: s.phone || null,
      commander: s.commander,
    }));

    const { error } = await supabase.from('stations').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase ensureStationsSeeded notice:', error.message);
      return;
    }
    this.stationsSeeded = true;
  }

  public async loadOrCreateOfficerProfile(
    sbUser: SupabaseUser,
    overrideProfile?: Partial<Officer>
  ): Promise<Officer> {
    await ensureSupabaseInitialized();
    const defaultStation = SEED_STATIONS[0];
    const meta = sbUser.user_metadata || {};

    const fallbackOfficer: Officer = {
      id: sbUser.id,
      name:
        overrideProfile?.name ||
        meta.name ||
        meta.full_name ||
        sbUser.email?.split('@')[0] ||
        'Police Officer',
      badgeId: normalizeBadgeId(
        overrideProfile?.badgeId || meta.badge_id || `GPS-${sbUser.id.slice(0, 6)}`
      ),
      rank: overrideProfile?.rank || meta.rank || 'Inspector (CID)',
      stationId: overrideProfile?.stationId || meta.station_id || defaultStation.id,
      stationName: overrideProfile?.stationName || meta.station_name || defaultStation.name,
      role: (overrideProfile?.role || meta.role || 'investigator') as Officer['role'],
      email: sbUser.email || overrideProfile?.email || '',
      passwordHash: quickHash(sbUser.id),
      phone: overrideProfile?.phone || meta.phone || '+233 24 000 0000',
      avatarUrl: meta.avatar_url || getPlaceholderImage('officer', meta.name || 'GPS'),
    };

    if (!supabase) return fallbackOfficer;

    const schema = await this.discoverSchema();
    if (schema && !schema.hasProfilesTable) {
      return fallbackOfficer;
    }

    await this.ensureStationsSeeded();

    const { data: existing, error: selectErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sbUser.id)
      .maybeSingle();

    if (selectErr) {
      console.warn('Supabase profile select warning:', selectErr.message);
      return fallbackOfficer;
    }

    if (existing && !overrideProfile) {
      return {
        id: existing.id,
        name: existing.name,
        badgeId: existing.badge_id,
        rank: existing.rank,
        stationId: existing.station_id,
        stationName: existing.station_name,
        role: existing.role as Officer['role'],
        email: existing.email || sbUser.email || '',
        passwordHash: quickHash(sbUser.id),
        phone: existing.phone || '+233 24 000 0000',
        avatarUrl:
          existing.avatar_url ||
          meta.avatar_url ||
          getPlaceholderImage('officer', existing.name),
      };
    }

    const selectedStation =
      SEED_STATIONS.find(s => s.id === (overrideProfile?.stationId || meta.station_id)) ||
      defaultStation;

    const profileRow = {
      id: sbUser.id,
      name:
        overrideProfile?.name ||
        meta.name ||
        meta.full_name ||
        sbUser.email?.split('@')[0] ||
        'Police Officer',
      badge_id: normalizeBadgeId(
        overrideProfile?.badgeId || meta.badge_id || `GPS-${sbUser.id.slice(0, 6).toUpperCase()}`
      ),
      rank: overrideProfile?.rank || meta.rank || 'Inspector (CID)',
      station_id: selectedStation.id,
      station_name: selectedStation.name,
      role: overrideProfile?.role || meta.role || 'investigator',
      email: sbUser.email || overrideProfile?.email || '',
      phone: overrideProfile?.phone || meta.phone || '+233 24 000 0000',
      avatar_url:
        overrideProfile?.avatarUrl ||
        meta.avatar_url ||
        getPlaceholderImage('officer', overrideProfile?.name || meta.name || 'GPS'),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'id' });

    if (upsertErr) {
      console.warn('Supabase profile upsert warning:', upsertErr.message);
      return fallbackOfficer;
    }

    return {
      id: profileRow.id,
      name: profileRow.name,
      badgeId: profileRow.badge_id,
      rank: profileRow.rank,
      stationId: profileRow.station_id,
      stationName: profileRow.station_name,
      role: profileRow.role as Officer['role'],
      email: profileRow.email,
      passwordHash: quickHash(sbUser.id),
      phone: profileRow.phone,
      avatarUrl: profileRow.avatar_url,
    };
  }

  public async fetchUserCases(_userId?: string): Promise<CaseRecord[]> {
    await ensureSupabaseInitialized();
    if (!supabase) return [];

    const schema = await this.discoverSchema();
    const cols = schema?.casesColumns;

    let query = supabase.from('cases').select('*');
    if (cols?.has('updated_timestamp')) {
      query = query.order('updated_timestamp', { ascending: false });
    } else if (cols?.has('created_at')) {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetchUserCases error:', error.message);
      return [];
    }

    return (data || [])
      .map(fromDbCaseRow)
      .sort((a, b) => (b.updatedTimestamp || 0) - (a.updatedTimestamp || 0));
  }

  public subscribeToUserCases(
    userId: string,
    onCasesReceived: (cases: CaseRecord[]) => void
  ): RealtimeChannel | null {
    if (!supabase) return null;

    // Initial load from Supabase cases table
    this.fetchUserCases(userId).then(cases => {
      onCasesReceived(cases);
    });

    const channel = supabase
      .channel(`gps_cases_live_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
        },
        async () => {
          const latest = await this.fetchUserCases(userId);
          onCasesReceived(latest);
        }
      )
      .subscribe();

    return channel;
  }

  private buildAdaptiveInsertPayload(
    c: CaseRecord,
    userId: string,
    schema: TableSchemaMeta | null
  ): { payload: Record<string, unknown>; canUpsertById: boolean } {
    const cols = schema?.casesColumns;
    if (!cols || cols.size === 0 || (cols.has('docket_number') && cols.has('complainant'))) {
      return {
        payload: toDbCaseRow(c, userId),
        canUpsertById: true,
      };
    }

    // Simplified / custom cases table mapping
    const payload: Record<string, unknown> = {};
    const suspectJoined = c.suspects.map(s => s.fullName).join(', ');
    const hasLat = typeof c.latitude === 'number' && Number.isFinite(c.latitude);
    const hasLng = typeof c.longitude === 'number' && Number.isFinite(c.longitude);

    if (cols.has('id') && schema?.casesIdType === 'text') payload.id = c.id;
    if (cols.has('user_id')) payload.user_id = userId;
    if (cols.has('docket_number')) payload.docket_number = normalizeDocketNumber(c.docketNumber);
    if (cols.has('case_number')) payload.case_number = normalizeDocketNumber(c.docketNumber);
    if (cols.has('victim_name')) payload.victim_name = c.complainant.fullName;
    if (cols.has('victim')) payload.victim = c.complainant.fullName;
    if (cols.has('complainant_name')) payload.complainant_name = c.complainant.fullName;
    if (cols.has('suspect_name')) payload.suspect_name = suspectJoined || 'Unknown';
    if (cols.has('suspect')) payload.suspect = suspectJoined || 'Unknown';
    if (cols.has('offence')) payload.offence = c.offenceTitle;
    if (cols.has('offence_title')) payload.offence_title = c.offenceTitle;
    if (cols.has('offence_category')) payload.offence_category = c.offenceCategory;
    if (cols.has('title')) payload.title = c.offenceTitle;
    if (cols.has('description')) payload.description = c.narrative;
    if (cols.has('narrative')) payload.narrative = c.narrative;
    if (cols.has('details')) payload.details = c.narrative;
    if (cols.has('location')) payload.location = c.locationDescription;
    if (cols.has('location_description')) payload.location_description = c.locationDescription;
    if (cols.has('latitude') && hasLat) payload.latitude = c.latitude;
    if (cols.has('lat') && hasLat) payload.lat = c.latitude;
    if (cols.has('longitude') && hasLng) payload.longitude = c.longitude;
    if (cols.has('lng') && hasLng) payload.lng = c.longitude;
    if (cols.has('status')) payload.status = c.status;
    if (cols.has('priority')) payload.priority = c.priority;
    if (cols.has('station_id')) payload.station_id = c.stationId;
    if (cols.has('station_name')) payload.station_name = c.stationName;
    if (cols.has('complainant')) payload.complainant = c.complainant;
    if (cols.has('suspects')) payload.suspects = c.suspects;

    return {
      payload,
      canUpsertById: schema?.casesIdType === 'text' && cols.has('id'),
    };
  }

  public async createCaseInSupabase(
    caseRecord: CaseRecord,
    userId: string
  ): Promise<{ ok: boolean; error?: string; savedCase?: CaseRecord }> {
    await ensureSupabaseInitialized();
    if (!supabase) return { ok: false, error: 'Supabase client is not configured.' };

    const schema = await this.discoverSchema();
    if (!schema || schema.hasStationsTable) {
      await this.ensureStationsSeeded();
    }

    const { payload, canUpsertById } = this.buildAdaptiveInsertPayload(
      caseRecord,
      userId,
      schema
    );

    if (canUpsertById) {
      let { data, error } = await supabase
        .from('cases')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error && /latitude|longitude/i.test(error.message || '')) {
        const { latitude: _lat, longitude: _lng, ...rowWithoutCoords } = payload;
        const retry = await supabase
          .from('cases')
          .upsert(rowWithoutCoords, { onConflict: 'id' })
          .select()
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Supabase createCase error:', error.message);
        return { ok: false, error: error.message };
      }
      return { ok: true, savedCase: data ? fromDbCaseRow(data) : undefined };
    }

    const { data, error } = await supabase
      .from('cases')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase insertCase error:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, savedCase: data ? fromDbCaseRow(data) : undefined };
  }

  public async updateCaseInSupabase(
    caseId: string,
    userId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    await ensureSupabaseInitialized();
    if (!supabase) return;
    const schema = await this.discoverSchema();
    const cols = schema?.casesColumns;
    const nowTs = Date.now();

    const filtered: Record<string, unknown> = {};
    const candidates: Record<string, unknown> = {
      ...updates,
      is_offline_staged: false,
      synced_at: new Date().toISOString(),
      updated_timestamp: nowTs,
      server_timestamp: nowTs,
      updated_at: new Date().toISOString(),
    };

    for (const [k, v] of Object.entries(candidates)) {
      if (!cols || cols.size === 0 || cols.has(k)) {
        filtered[k] = v;
      }
    }

    if (Object.keys(filtered).length === 0) return;

    let query = supabase.from('cases').update(filtered).eq('id', caseId);
    if (!cols || cols.has('user_id')) {
      query = query.eq('user_id', userId);
    }
    const { error } = await query;

    if (error) {
      console.error('Supabase updateCase error:', error.message);
    }
  }

  public async pushBatchToSupabase(
    queueItems: OfflineQueueItem[],
    currentCases: CaseRecord[],
    userId: string | null
  ): Promise<{
    syncResult: SupabaseSyncResult;
    updatedCases: CaseRecord[];
    updatedQueue: OfflineQueueItem[];
  }> {
    const pendingItems = queueItems.filter(q => q.status === 'pending');
    if (pendingItems.length === 0) {
      return {
        syncResult: {
          totalProcessed: 0,
          syncedCount: 0,
          conflictServerRetainedCount: 0,
          conflicts: [],
          recordsSynced: [],
        },
        updatedCases: currentCases,
        updatedQueue: queueItems,
      };
    }

    if (supabase && userId) {
      return this.pushBatchOnlineSupabase(queueItems, currentCases, userId);
    }

    return this.pushBatchLocally(queueItems, currentCases);
  }

  private async pushBatchOnlineSupabase(
    queueItems: OfflineQueueItem[],
    currentCases: CaseRecord[],
    userId: string
  ): Promise<{
    syncResult: SupabaseSyncResult;
    updatedCases: CaseRecord[];
    updatedQueue: OfflineQueueItem[];
  }> {
    await this.ensureStationsSeeded();

    const conflicts: SupabaseSyncResult['conflicts'] = [];
    const recordsSynced: string[] = [];
    let syncedCount = 0;
    let conflictServerRetainedCount = 0;
    const serverNow = Date.now();

    const workingCasesMap = new Map<string, CaseRecord>();
    currentCases.forEach(c => workingCasesMap.set(c.id, { ...c }));

    const remoteCases = await this.fetchUserCases(userId);
    const updatedQueue: OfflineQueueItem[] = [];

    for (const item of queueItems) {
      if (item.status !== 'pending') {
        updatedQueue.push(item);
        continue;
      }

      const clientTs = Number(item.clientTimestamp) || new Date(item.timestamp).getTime();
      const action = item.action;

      if (action === 'create_case') {
        const payload = item.payload as CaseRecord;
        const normalizedDocket = normalizeDocketNumber(payload.docketNumber);
        const existingServer = remoteCases.find(
          r => r.id === payload.id || normalizeDocketNumber(r.docketNumber) === normalizedDocket
        );

        if (existingServer) {
          conflictServerRetainedCount++;
          const reason =
            'Duplicate docket record already committed in Supabase PostgreSQL. Server record retained.';
          conflicts.push({
            docketNumber: payload.docketNumber,
            caseId: payload.id,
            action,
            clientTimestamp: clientTs,
            serverTimestamp: Number(existingServer.serverTimestamp || serverNow),
            reason,
            resolution: 'server_record_retained',
          });

          const retained: CaseRecord = {
            ...existingServer,
            isOfflineStaged: false,
            syncedAt: new Date().toISOString(),
            syncConflictNote: `Supabase Sync Conflict: Server record retained (${new Date().toLocaleTimeString()}).`,
          };
          workingCasesMap.set(retained.id, retained);
          await idbStorage.putCase(retained);

          updatedQueue.push({
            ...item,
            status: 'conflict_retained_server',
            conflictResolution: {
              type: 'server_retained',
              reason,
              resolvedAt: new Date().toISOString(),
              serverTimestamp: Number(existingServer.serverTimestamp || serverNow),
              clientTimestamp: clientTs,
            },
          });
        } else {
          const syncedCase: CaseRecord = {
            ...payload,
            createdByUid: userId,
            docketNumber: normalizedDocket,
            isOfflineStaged: false,
            syncedAt: new Date().toISOString(),
            updatedTimestamp: clientTs,
            serverTimestamp: serverNow,
          };

          const createRes = await this.createCaseInSupabase(syncedCase, userId);
          const committedCase = createRes.savedCase || syncedCase;
          remoteCases.push(committedCase);
          workingCasesMap.set(committedCase.id, committedCase);
          await idbStorage.putCase(committedCase);
          await idbStorage.putCloudServerRecord(
            committedCase.id,
            committedCase.docketNumber,
            committedCase,
            serverNow
          );

          syncedCount++;
          recordsSynced.push(committedCase.docketNumber);

          updatedQueue.push({
            ...item,
            status: 'synced',
            conflictResolution: {
              type: 'client_accepted',
              reason: 'Committed to Supabase PostgreSQL database.',
              resolvedAt: new Date().toISOString(),
              serverTimestamp: serverNow,
              clientTimestamp: clientTs,
            },
          });
        }
      } else {
        const caseId = String(item.payload?.caseId || '');
        const existingRemote = remoteCases.find(r => r.id === caseId);
        const localCase = workingCasesMap.get(caseId);

        if (existingRemote && Number(existingRemote.serverTimestamp || 0) > clientTs + 1000) {
          conflictServerRetainedCount++;
          const reason =
            'Supabase server record has newer updates. Server version retained.';
          conflicts.push({
            docketNumber: existingRemote.docketNumber,
            caseId,
            action,
            clientTimestamp: clientTs,
            serverTimestamp: Number(existingRemote.serverTimestamp || serverNow),
            reason,
            resolution: 'server_record_retained',
          });
          workingCasesMap.set(existingRemote.id, { ...existingRemote, isOfflineStaged: false });
          updatedQueue.push({
            ...item,
            status: 'conflict_retained_server',
            conflictResolution: {
              type: 'server_retained',
              reason,
              resolvedAt: new Date().toISOString(),
              serverTimestamp: Number(existingRemote.serverTimestamp || serverNow),
              clientTimestamp: clientTs,
            },
          });
        } else if (localCase) {
          if (existingRemote) {
            const dbUpdates: Record<string, unknown> = {
              status: localCase.status,
              status_updated_at: localCase.statusUpdatedAt,
            };
            if (action === 'update_case_status' || action === 'add_submission') {
              dbUpdates.submissions = localCase.submissions;
              dbUpdates.witness_statements = localCase.witnessStatements;
            } else if (action === 'add_evidence') {
              dbUpdates.evidence = localCase.evidence;
            } else if (action === 'add_suspect') {
              dbUpdates.suspects = localCase.suspects;
            }
            await this.updateCaseInSupabase(caseId, userId, dbUpdates);
          }

          syncedCount++;
          recordsSynced.push(`${localCase.docketNumber} (${action})`);
          updatedQueue.push({
            ...item,
            status: 'synced',
            conflictResolution: {
              type: 'client_accepted',
              reason: 'Committed to Supabase PostgreSQL database.',
              resolvedAt: new Date().toISOString(),
              serverTimestamp: serverNow,
              clientTimestamp: clientTs,
            },
          });
        } else {
          updatedQueue.push({ ...item, status: 'synced' });
        }
      }
    }

    const mergedCases = Array.from(workingCasesMap.values());
    await idbStorage.putCasesBatch(mergedCases);

    return {
      syncResult: {
        totalProcessed: queueItems.filter(q => q.status === 'pending').length,
        syncedCount,
        conflictServerRetainedCount,
        conflicts,
        recordsSynced,
      },
      updatedCases: mergedCases,
      updatedQueue,
    };
  }

  private async pushBatchLocally(
    queueItems: OfflineQueueItem[],
    currentCases: CaseRecord[]
  ): Promise<{
    syncResult: SupabaseSyncResult;
    updatedCases: CaseRecord[];
    updatedQueue: OfflineQueueItem[];
  }> {
    const conflicts: SupabaseSyncResult['conflicts'] = [];
    const recordsSynced: string[] = [];
    let syncedCount = 0;
    let conflictServerRetainedCount = 0;

    const workingCasesMap = new Map<string, CaseRecord>();
    currentCases.forEach(c => workingCasesMap.set(c.id, { ...c }));

    const updatedQueue: OfflineQueueItem[] = [];

    for (const item of queueItems) {
      if (item.status !== 'pending') {
        updatedQueue.push(item);
        continue;
      }

      const clientTs = item.clientTimestamp || new Date(item.timestamp).getTime();
      const action = item.action;

      if (action === 'create_case') {
        const casePayload: CaseRecord = item.payload;
        const caseId = casePayload.id;
        const docket = casePayload.docketNumber;

        const existingServerRecord = await idbStorage.getCloudServerRecord(caseId);
        const allServerRecords = await idbStorage.getAllCloudServerRecords();
        const duplicateDocketServerRecord = allServerRecords.find(
          r => r.docketNumber.toLowerCase() === docket.toLowerCase() && r.id !== caseId
        );

        const conflictingServer = existingServerRecord || duplicateDocketServerRecord;

        if (conflictingServer) {
          conflictServerRetainedCount++;
          const conflictInfo = {
            docketNumber: docket,
            caseId,
            action,
            clientTimestamp: clientTs,
            serverTimestamp: conflictingServer.serverTimestamp,
            reason: `Duplicate docket record already committed in local registry. Server record retained.`,
            resolution: 'server_record_retained' as const,
          };
          conflicts.push(conflictInfo);

          const retainedServerCase: CaseRecord = {
            ...conflictingServer.data,
            isOfflineStaged: false,
            syncedAt: new Date().toISOString(),
            syncConflictNote: `Registry Conflict: Server record retained (${new Date().toLocaleTimeString()}). Local offline duplicate superseded.`,
          };
          workingCasesMap.set(retainedServerCase.id, retainedServerCase);
          await idbStorage.putCase(retainedServerCase);

          updatedQueue.push({
            ...item,
            status: 'conflict_retained_server',
            conflictResolution: {
              type: 'server_retained',
              reason: conflictInfo.reason,
              resolvedAt: new Date().toISOString(),
              serverTimestamp: conflictingServer.serverTimestamp,
              clientTimestamp: clientTs,
            },
          });
        } else {
          const newServerTs = Date.now();
          const syncedCase: CaseRecord = {
            ...casePayload,
            isOfflineStaged: false,
            syncedAt: new Date().toISOString(),
            serverTimestamp: newServerTs,
            updatedTimestamp: clientTs,
          };

          workingCasesMap.set(syncedCase.id, syncedCase);
          await idbStorage.putCase(syncedCase);
          await idbStorage.putCloudServerRecord(
            syncedCase.id,
            syncedCase.docketNumber,
            syncedCase,
            newServerTs
          );

          syncedCount++;
          recordsSynced.push(syncedCase.docketNumber);

          updatedQueue.push({
            ...item,
            status: 'synced',
            conflictResolution: {
              type: 'client_accepted',
              reason: 'Committed to local IndexedDB registry (sign in with Supabase to sync to cloud).',
              resolvedAt: new Date().toISOString(),
              serverTimestamp: newServerTs,
              clientTimestamp: clientTs,
            },
          });
        }
      } else {
        updatedQueue.push({
          ...item,
          status: 'synced',
        });
      }
    }

    return {
      syncResult: {
        totalProcessed: queueItems.filter(q => q.status === 'pending').length,
        syncedCount,
        conflictServerRetainedCount,
        conflicts,
        recordsSynced,
      },
      updatedCases: Array.from(workingCasesMap.values()),
      updatedQueue,
    };
  }

  public async seedLocalCloudMirror(cases: CaseRecord[]): Promise<void> {
    for (const c of cases) {
      const existing = await idbStorage.getCloudServerRecord(c.id);
      if (!existing) {
        const seedTs = new Date(c.statusUpdatedAt || c.lodgedDateTime).getTime();
        await idbStorage.putCloudServerRecord(c.id, c.docketNumber, c, seedTs);
      }
    }
  }
}

export const supabaseSync = new SupabaseSyncService();
