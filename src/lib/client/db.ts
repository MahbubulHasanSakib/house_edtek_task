import { BlockData, SyncOperation } from '../types';

const DB_NAME = 'edtech_local_db';
const DB_VERSION = 3; // bumped to flush desynced state

export class LocalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('blocks')) {
          const blockStore = db.createObjectStore('blocks', { keyPath: 'id' });
          blockStore.createIndex('documentId', 'documentId', { unique: false });
        }
        if (!db.objectStoreNames.contains('operations')) {
          const opsStore = db.createObjectStore('operations', { keyPath: 'id' });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB init error:', event);
        reject('IndexedDB init error');
      };
    });
  }

  async getBlocks(documentId: string): Promise<BlockData[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('blocks', 'readonly');
      const store = transaction.objectStore('blocks');
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBlock(block: BlockData): Promise<boolean> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('blocks', 'readwrite');
      const store = transaction.objectStore('blocks');
      
      const getReq = store.get(block.id);
      getReq.onsuccess = () => {
        const existing = getReq.result as BlockData | undefined;
        let shouldApply = false;
        
        if (!existing) {
          shouldApply = true;
        } else {
          if (block.version > existing.version) {
            shouldApply = true;
          } else if (block.version === existing.version) {
            if (block.clientTimestamp > existing.clientTimestamp) {
              shouldApply = true;
            } else if (block.clientTimestamp === existing.clientTimestamp) {
              if (block.clientId > existing.clientId) {
                shouldApply = true;
              }
            }
          }
        }

        if (shouldApply) {
          const putReq = store.put(block);
          putReq.onsuccess = () => resolve(true);
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve(false); // Ignored because local is newer
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async saveBlocks(blocks: BlockData[]): Promise<void> {
    if (blocks.length === 0) return;
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('blocks', 'readwrite');
      const store = transaction.objectStore('blocks');
      
      let pending = blocks.length;
      let hasError = false;

      for (const block of blocks) {
        if (hasError) break;
        const getReq = store.get(block.id);
        
        getReq.onsuccess = () => {
          const existing = getReq.result as BlockData | undefined;
          let shouldApply = false;
          
          if (!existing) {
            shouldApply = true;
          } else {
            if (block.version > existing.version) {
              shouldApply = true;
            } else if (block.version === existing.version) {
              if (block.clientTimestamp > existing.clientTimestamp) {
                shouldApply = true;
              } else if (block.clientTimestamp === existing.clientTimestamp) {
                if (block.clientId > existing.clientId) {
                  shouldApply = true;
                }
              }
            }
          }

          if (shouldApply) {
            const putReq = store.put(block);
            putReq.onsuccess = () => {
              pending--;
              if (pending === 0 && !hasError) resolve();
            };
            putReq.onerror = () => {
              hasError = true;
              reject(putReq.error);
            };
          } else {
            pending--;
            if (pending === 0 && !hasError) resolve();
          }
        };
        getReq.onerror = () => {
          hasError = true;
          reject(getReq.error);
        };
      }
    });
  }

  async addOperation(operation: SyncOperation): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('operations', 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getOperations(): Promise<SyncOperation[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('operations', 'readonly');
      const store = transaction.objectStore('operations');
      const index = store.index('timestamp');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeOperation(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('operations', 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const localDb = new LocalDB();
