import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncManager } from '../sync-manager';

// Mock dependencies
vi.mock('../db', () => ({
  localDb: {
    addPendingOperation: vi.fn(),
    getPendingOperations: vi.fn().mockResolvedValue([]),
    saveBlocks: vi.fn(),
    getBlocks: vi.fn().mockResolvedValue([]),
  }
}));

// Mock browser globals
globalThis.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

globalThis.BroadcastChannel = class {
  name: string;
  constructor(name: string) { this.name = name; }
  postMessage = vi.fn();
  close = vi.fn();
} as any;

globalThis.EventSource = class {
  url: string;
  constructor(url: string) { this.url = url; }
  close = vi.fn();
} as any;

describe('SyncManager', () => {
  const documentId = 'doc-1';
  const clientId = 'client-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes correctly', () => {
    const onStatus = vi.fn();
    const onRemote = vi.fn();
    const syncManager = new SyncManager(documentId, clientId, onStatus, onRemote);
    expect(syncManager).toBeDefined();
    // It should add event listeners for online/offline
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('triggers offline status when going offline', () => {
    const onStatus = vi.fn();
    const onRemote = vi.fn();
    
    const syncManager = new SyncManager(documentId, clientId, onStatus, onRemote);
    // @ts-ignore
    syncManager.handleOffline();
    
    expect(onStatus).toHaveBeenCalledWith('offline');
  });
});
