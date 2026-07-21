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
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;

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
    
    // Setup BroadcastChannel for 0ms same-browser sync
    if (typeof window !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(`doc:${this.documentId}`);
      this.broadcastChannel.onmessage = async (event) => {
        if (event.data.type === 'blocks' && event.data.clientId !== this.clientId) {
          const blocks = event.data.blocks;
          await localDb.saveBlocks(blocks);
          this.onRemoteBlocks(blocks);
        }
      };
    }

    this.startLongPoll();
    // Flush pending operations every 3s
    this.flushTimer = setInterval(() => this.flushOfflineQueue(), 3000);
  }

  public stop() {
    this.stopped = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
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

  private startLongPoll() {
    if (this.polling || this.stopped) return;
    this.polling = true;
    console.log('[SyncManager] Starting SSE stream, rowid:', this.pollRowid);

    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = `/api/sync/stream?documentId=${this.documentId}&clientId=${this.clientId}&afterRowid=${this.pollRowid}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SyncManager] Got SSE data, nextRowid:', data.nextRowid, 'blocks:', data.blocks?.length ?? 0);

        if (typeof data.nextRowid === 'number') {
          this.pollRowid = data.nextRowid;
        }

        if (data.roleUpdates && data.roleUpdates.length > 0 && this.onRoleUpdates) {
          this.onRoleUpdates(data.roleUpdates);
        }

        if (data.blocks && data.blocks.length > 0) {
          const normalizedBlocks = data.blocks.map((block: any) => ({
            ...block,
            clientTimestamp: typeof block.clientTimestamp === 'string'
              ? new Date(block.clientTimestamp).getTime()
              : block.clientTimestamp
          }));
          await localDb.saveBlocks(normalizedBlocks);
          this.onRemoteBlocks(data.blocks);
        }
      } catch (e) {
        console.error('[SyncManager] Failed to parse SSE data', e);
      }
    };

    this.eventSource.onerror = () => {
      console.log('[SyncManager] SSE connection lost, browser will auto-reconnect...');
      if (this.status === 'online' && !navigator.onLine) {
         this.status = 'offline';
         this.onStatusChange(this.status);
      }
    };
  }

  public async queueOperation(action: 'UPDATE_BLOCK', payload: BlockData) {
    // Broadcast instantly to other tabs in the same browser (0ms latency!)
    // We do this BEFORE awaiting IndexedDB to avoid any blocking!
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'blocks',
        clientId: this.clientId,
        blocks: [payload]
      });
    }

    const op: SyncOperation = {
      id: crypto.randomUUID(),
      documentId: this.documentId,
      action,
      payload,
      timestamp: Date.now()
    };
    await localDb.addOperation(op);

    // Flush immediately to the backend for other devices
    this.flushOfflineQueue();
  }

  private isFlushing = false;

  private async flushOfflineQueue() {
    if (this.status === 'offline') return;
    if (!navigator.onLine) return;
    if (this.isFlushing) return;

    this.isFlushing = true;

    try {
      const ops = await localDb.getOperations();
      const docOps = ops.filter(o => o.documentId === this.documentId);
      if (docOps.length === 0) return;

      this.status = 'syncing';
      this.onStatusChange(this.status);

      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: this.documentId, clientId: this.clientId, operations: docOps })
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
      this.isFlushing = false;

      // If more operations queued up while we were flushing, flush them now!
      localDb.getOperations().then(ops => {
        if (ops.some(o => o.documentId === this.documentId)) {
          this.flushOfflineQueue();
        }
      });
    }
  }
}
