import { useState, useCallback } from 'react';
import { Snapshot, BlockData } from '@/lib/types';
import { localDb } from '@/lib/client/db';
import { SyncManager } from '@/lib/client/sync-manager';

interface UseSnapshotsProps {
  documentId: string;
  blocks: BlockData[];
  currentRole: string;
  reloadBlocks: () => Promise<void>;
  syncManagerRef: React.MutableRefObject<SyncManager | null>;
}

export function useSnapshots({ documentId, blocks, currentRole, reloadBlocks, syncManagerRef }: UseSnapshotsProps) {
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch(`/api/document/${documentId}/snapshot`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (e) {
      console.error('Failed to load snapshots', e);
    }
    setIsSnapshotModalOpen(true);
  }, [documentId]);

  const createSnapshot = useCallback(async () => {
    if (currentRole === 'VIEWER') return;
    setIsCreatingSnapshot(true);
    try {
      const res = await fetch(`/api/document/${documentId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Version ${snapshots.length + 1}`,
          data: JSON.stringify(blocks)
        })
      });
      if (res.ok) {
        await loadSnapshots();
      }
    } catch (e) {
      console.error('Failed to create snapshot', e);
    } finally {
      setIsCreatingSnapshot(false);
    }
  }, [currentRole, documentId, blocks, snapshots.length, loadSnapshots]);

  const restoreSnapshot = useCallback(async (snapshot: Snapshot) => {
    if (currentRole === 'VIEWER') return;
    try {
      const snapshotBlocks: BlockData[] = JSON.parse(snapshot.data);
      
      const newVersionBlocks = snapshotBlocks.map(b => ({
        ...b,
        version: b.version + 100, // bump version heavily to force LWW overwrite
        clientTimestamp: Date.now()
      }));

      for (const block of newVersionBlocks) {
        await localDb.saveBlock(block);
        syncManagerRef.current?.queueOperation('UPDATE_BLOCK', block);
      }
      setIsSnapshotModalOpen(false);
      await reloadBlocks();
    } catch (e) {
      console.error('Failed to restore snapshot', e);
    }
  }, [currentRole, syncManagerRef, reloadBlocks]);

  return {
    isSnapshotModalOpen,
    setIsSnapshotModalOpen,
    snapshots,
    isCreatingSnapshot,
    loadSnapshots,
    createSnapshot,
    restoreSnapshot
  };
}
