import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CaseRecord, Station, Officer, OfflineQueueItem } from '../types';

interface GPSDatabaseSchema extends DBSchema {
  cases: {
    key: string;
    value: CaseRecord;
    indexes: {
      'by-docket': string;
      'by-station': string;
      'by-status': string;
      'by-updated': number;
    };
  };
  stations: {
    key: string;
    value: Station;
  };
  officers: {
    key: string;
    value: Officer;
    indexes: {
      'by-badge': string;
      'by-role': string;
    };
  };
  offline_queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: {
      'by-status': string;
      'by-timestamp': string;
    };
  };
  cloud_server_state: {
    key: string;
    value: {
      id: string;
      docketNumber: string;
      data: CaseRecord;
      serverTimestamp: number;
      lastSyncedAt: string;
    };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'GhanaPoliceService_IDB';
const DB_VERSION = 3;

class IndexedDBStorage {
  private dbPromise: Promise<IDBPDatabase<GPSDatabaseSchema>> | null = null;
  private isSupported: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.isSupported) {
      this.initDB();
    }
  }

  private async getDB(): Promise<IDBPDatabase<GPSDatabaseSchema> | null> {
    if (!this.isSupported) return null;
    if (!this.dbPromise) {
      this.initDB();
    }
    return this.dbPromise;
  }

  private initDB() {
    this.dbPromise = openDB<GPSDatabaseSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cases')) {
          const caseStore = db.createObjectStore('cases', { keyPath: 'id' });
          caseStore.createIndex('by-docket', 'docketNumber', { unique: false });
          caseStore.createIndex('by-station', 'stationId', { unique: false });
          caseStore.createIndex('by-status', 'status', { unique: false });
          caseStore.createIndex('by-updated', 'updatedTimestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('stations')) {
          db.createObjectStore('stations', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('officers')) {
          const officerStore = db.createObjectStore('officers', { keyPath: 'id' });
          officerStore.createIndex('by-badge', 'badgeId', { unique: false });
          officerStore.createIndex('by-role', 'role', { unique: false });
        }

        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'status', { unique: false });
          queueStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('cloud_server_state')) {
          db.createObjectStore('cloud_server_state', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  // --- Cases Operations in IndexedDB ---
  public async getAllCases(): Promise<CaseRecord[]> {
    const db = await this.getDB();
    if (!db) return [];
    try {
      return await db.getAll('cases');
    } catch (e) {
      console.warn('IDB: getAllCases error', e);
      return [];
    }
  }

  public async putCase(caseRec: CaseRecord): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const record = {
        ...caseRec,
        updatedTimestamp: caseRec.updatedTimestamp || Date.now(),
      };
      await db.put('cases', record);
    } catch (e) {
      console.warn('IDB: putCase error', e);
    }
  }

  public async putCasesBatch(cases: CaseRecord[]): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction('cases', 'readwrite');
      for (const c of cases) {
        const record = {
          ...c,
          updatedTimestamp: c.updatedTimestamp || Date.now(),
        };
        await tx.store.put(record);
      }
      await tx.done;
    } catch (e) {
      console.warn('IDB: putCasesBatch error', e);
    }
  }

  public async getCase(id: string): Promise<CaseRecord | undefined> {
    const db = await this.getDB();
    if (!db) return undefined;
    try {
      return await db.get('cases', id);
    } catch (e) {
      console.warn('IDB: getCase error', e);
      return undefined;
    }
  }

  public async deleteCase(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      await db.delete('cases', id);
    } catch (e) {
      console.warn('IDB: deleteCase error', e);
    }
  }

  // --- Offline Queue in IndexedDB ---
  public async getQueueItems(): Promise<OfflineQueueItem[]> {
    const db = await this.getDB();
    if (!db) return [];
    try {
      return await db.getAll('offline_queue');
    } catch (e) {
      console.warn('IDB: getQueueItems error', e);
      return [];
    }
  }

  public async putQueueItem(item: OfflineQueueItem): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      await db.put('offline_queue', item);
    } catch (e) {
      console.warn('IDB: putQueueItem error', e);
    }
  }

  public async putQueueItemsBatch(items: OfflineQueueItem[]): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      const tx = db.transaction('offline_queue', 'readwrite');
      for (const it of items) {
        await tx.store.put(it);
      }
      await tx.done;
    } catch (e) {
      console.warn('IDB: putQueueItemsBatch error', e);
    }
  }

  public async deleteQueueItem(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      await db.delete('offline_queue', id);
    } catch (e) {
      console.warn('IDB: deleteQueueItem error', e);
    }
  }

  public async clearQueue(): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      await db.clear('offline_queue');
    } catch (e) {
      console.warn('IDB: clearQueue error', e);
    }
  }

  // --- Central Cloud Server Mirror Store (For offline conflict detection) ---
  public async getCloudServerRecord(id: string): Promise<{ id: string; docketNumber: string; data: CaseRecord; serverTimestamp: number; lastSyncedAt: string } | undefined> {
    const db = await this.getDB();
    if (!db) return undefined;
    try {
      return await db.get('cloud_server_state', id);
    } catch {
      return undefined;
    }
  }

  public async putCloudServerRecord(id: string, docketNumber: string, data: CaseRecord, serverTimestamp: number): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      await db.put('cloud_server_state', {
        id,
        docketNumber,
        data,
        serverTimestamp,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('IDB: putCloudServerRecord error', e);
    }
  }

  public async getAllCloudServerRecords(): Promise<Array<{ id: string; docketNumber: string; data: CaseRecord; serverTimestamp: number; lastSyncedAt: string }>> {
    const db = await this.getDB();
    if (!db) return [];
    try {
      return await db.getAll('cloud_server_state');
    } catch {
      return [];
    }
  }

  public async clearAllStores(): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    try {
      await db.clear('cases');
      await db.clear('offline_queue');
      await db.clear('cloud_server_state');
    } catch (e) {
      console.warn('IDB: clearAllStores error', e);
    }
  }
}

export const idbStorage = new IndexedDBStorage();
