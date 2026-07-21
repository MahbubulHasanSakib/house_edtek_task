import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BlockData, ConnectionStatus } from '@/lib/types';
import { SyncManager } from '@/lib/client/sync-manager';
import { localDb } from '@/lib/client/db';
import { generateFractionalIndex } from '@/lib/client/fractional-indexing';

interface UseDocumentSyncProps {
  documentId: string;
  initialTitle: string;
  initialRole: string;
  currentUserEmail: string;
}

export function useDocumentSync({ documentId, initialTitle, initialRole, currentUserEmail }: UseDocumentSyncProps) {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [currentRole, setCurrentRole] = useState(initialRole);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [title, setTitle] = useState(initialTitle);
  
  const syncManagerRef = useRef<SyncManager | null>(null);
  const clientIdRef = useRef(uuidv4());
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reloadBlocks = useCallback(async () => {
    const localBlocks = await localDb.getBlocks(documentId);
    localBlocks.sort((a, b) => {
      if (a.index === b.index) return a.clientTimestamp - b.clientTimestamp;
      return a.index < b.index ? -1 : 1;
    });
    setBlocks(localBlocks.filter(b => !b.deleted));
  }, [documentId]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const response = await fetch(`/api/document/${documentId}`);
        if (response.ok) {
          const data = await response.json();
          for (const b of data.blocks) {
            await localDb.saveBlock({
              ...b,
              clientTimestamp: new Date(b.clientTimestamp).getTime()
            });
          }
        }
      } catch (e) {
        console.log('Offline: loading from IndexedDB');
      }

      if (mounted) {
        await reloadBlocks();
        setIsInitialLoading(false);
      }

      if (!syncManagerRef.current && mounted) {
        syncManagerRef.current = new SyncManager(
          documentId,
          clientIdRef.current,
          (newStatus) => {
            if (mounted) setStatus(newStatus);
          },
          async () => {
            if (mounted) await reloadBlocks();
          },
          (updates) => {
            if (mounted) {
              for (const update of updates) {
                if (update.email === currentUserEmail) {
                  setCurrentRole(update.role);
                }
              }
            }
          }
        );
        syncManagerRef.current.start();
      }
    };

    init();

    return () => {
      mounted = false;
      if (syncManagerRef.current) {
        syncManagerRef.current.stop();
        syncManagerRef.current = null;
      }
    };
  }, [documentId, currentUserEmail, reloadBlocks]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    if (currentRole === 'VIEWER') return;
    
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/document/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });
      } catch (e) {
        console.error('Failed to save title', e);
      }
    }, 500);
  }, [documentId, currentRole]);

  const updateBlockContent = useCallback((id: string, newContent: string) => {
    if (currentRole === 'VIEWER') return;

    setBlocks(prev => prev.map(b => {
      if (b.id === id) {
        const updated = { ...b, content: newContent, version: b.version + 1, clientTimestamp: Date.now() };
        localDb.saveBlock(updated).then(() => {
          syncManagerRef.current?.queueOperation('UPDATE_BLOCK', updated);
        });
        return updated;
      }
      return b;
    }));
  }, [currentRole]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, index: number, blockId: string) => {
    if (currentRole === 'VIEWER') return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const currentBlock = blocks[index];
      const nextBlock = blocks[index + 1];
      
      const newIndex = generateFractionalIndex(
        currentBlock?.index || null,
        nextBlock?.index || null,
        clientIdRef.current
      );

      const newBlock: BlockData = {
        id: uuidv4(),
        documentId,
        type: 'p',
        content: '',
        index: newIndex,
        version: 1,
        clientId: clientIdRef.current,
        clientTimestamp: Date.now(),
        deleted: false
      };

      setBlocks(prev => {
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
      });

      localDb.saveBlock(newBlock).then(() => {
        syncManagerRef.current?.queueOperation('UPDATE_BLOCK', newBlock);
      });

      setTimeout(() => {
        const el = document.getElementById(`block-${newBlock.id}`);
        if (el) el.focus();
      }, 10);
    } else if (e.key === 'Backspace' && blocks[index].content === '') {
      e.preventDefault();
      if (blocks.length > 1) {
        const blockToDel = blocks[index];
        const deletedBlock = { ...blockToDel, deleted: true, version: blockToDel.version + 1, clientTimestamp: Date.now() };
        
        setBlocks(prev => prev.filter((_, i) => i !== index));
        localDb.saveBlock(deletedBlock).then(() => {
          syncManagerRef.current?.queueOperation('UPDATE_BLOCK', deletedBlock);
        });

        if (index > 0) {
          setTimeout(() => {
            const prevEl = document.getElementById(`block-${blocks[index - 1].id}`);
            if (prevEl) {
              prevEl.focus();
              const val = (prevEl as HTMLTextAreaElement).value;
              (prevEl as HTMLTextAreaElement).setSelectionRange(val.length, val.length);
            }
          }, 10);
        }
      }
    }
  }, [blocks, currentRole, documentId]);

  return {
    blocks,
    setBlocks,
    status,
    currentRole,
    isInitialLoading,
    title,
    handleTitleChange,
    updateBlockContent,
    handleKeyDown,
    clientIdRef,
    syncManagerRef,
    reloadBlocks
  };
}
