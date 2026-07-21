import { localDb } from './db';
import { BlockData, SyncOperation, ConnectionStatus } from '../types';

export class SyncManager {
  private documentId: string;
  private clientId: string;
  private status: ConnectionStatus = 'online';
  private pollRowid: number = 0;
  private polling = false;
  private stopped = false;
  private flushTimer: any = null;
  private onStatusChange: (status: ConnectionStatus) => void;
  private onRemoteBlocks: (blocks: BlockData[]) => void;
  private onRoleUpdates?: (updates: any[]) => void;
  private onlineHandler = () => this.handleOnline();
  private offlineHandler = () => this.handleOffline();

  constructor(
    documentId: string,
    clientId: string,
    onStatusChange: (status: ConnectionStatus) => void,
    onRemoteBlocks: (blocks: BlockData[]) => void,
    onRoleUpdates?: (updates: any[]) => void
  ) {
    this.documentId = documentId;
    this.clientId = clientId;
    this.onStatusChange = onStatusChange;
    this.onRemoteBlocks = onRemoteBlocks;
    this.onRoleUpdates = onRoleUpdates;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }
  }

  public start() {
    this.stopped = false;
    this.startLongPoll();
    // Flush pending operations every 3s
    this.flushTimer = setInterval(() => this.flushOfflineQueue(), 3000);
  }

  public stop() {
    this.stopped = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
    }
  }

  private handleOnline() {
    this.status = 'online';
    this.onStatusChange(this.status);
    if (!this.polling) this.startLongPoll();
    this.flushOfflineQueue();
  }

  private handleOffline() {
    this.status = 'offline';
    this.onStatusChange(this.status);
    this.polling = false; // stop polling loop
  }

  private async startLongPoll() {
    if (this.polling || this.stopped) return;
    this.polling = true;
    console.log('[SyncManager] Starting long-poll loop, rowid:', this.pollRowid);

    while (!this.stopped && this.status !== 'offline') {
      try {
        const url = `/api/sync/stream?documentId=${this.documentId}&clientId=${this.clientId}&afterRowid=${this.pollRowid}`;
        console.log('[SyncManager] Polling:', url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('[SyncManager] Got response, nextRowid:', data.nextRowid, 'blocks:', data.blocks?.length ?? 0);

          if (typeof data.nextRowid === 'number') {
            this.pollRowid = data.nextRowid;
          }

          if (data.roleUpdates && data.roleUpdates.length > 0 && this.onRoleUpdates) {
            this.onRoleUpdates(data.roleUpdates);
          }

          if (data.blocks && data.blocks.length > 0) {
            for (const block of data.blocks) {
              const normalized: BlockData = {
                ...block,
                clientTimestamp: typeof block.clientTimestamp === 'string'
                  ? new Date(block.clientTimestamp).getTime()
                  : block.clientTimestamp
              };
              await localDb.saveBlock(normalized);
            }
            this.onRemoteBlocks(data.blocks);
          }
        } else if (response.status === 401) {
          console.log('[SyncManager] Auth error, stopping');
          this.polling = false;
          return;
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          // If it's a standard network fetch failure (like offline or server restart), don't throw a noisy error
          if (e instanceof TypeError && (e.message.includes('Failed to fetch') || e.message.includes('Load failed'))) {
            console.log('[SyncManager] Connection temporarily lost, retrying...');
          } else {
            console.error('[SyncManager] Long-poll error:', e.message);
          }
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.log('[SyncManager] Request timed out, reconnecting...');
        }
      }
    }

    this.polling = false;
    console.log('[SyncManager] Poll loop stopped');
  }

  public async queueOperation(action: 'UPDATE_BLOCK', payload: BlockData) {
    const op: SyncOperation = {
      id: crypto.randomUUID(),
      documentId: this.documentId,
      action,
      payload,
      timestamp: Date.now()
    };
    await localDb.addOperation(op);
    // Flush immediately for snappy experience
    this.flushOfflineQueue();
  }

  private async flushOfflineQueue() {
    if (this.status === 'offline') return;
    if (!navigator.onLine) return;

    const ops = await localDb.getOperations();
    const docOps = ops.filter(o => o.documentId === this.documentId);
    if (docOps.length === 0) return;

    this.status = 'syncing';
    this.onStatusChange(this.status);

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: this.documentId, operations: docOps })
      });

      if (response.ok) {
        for (const op of docOps) {
          await localDb.removeOperation(op.id);
        }
      }
    } catch (e) {
      console.error('Flush error:', e);
    } finally {
      this.status = navigator.onLine ? 'online' : 'offline';
      this.onStatusChange(this.status);
    }
  }
}
