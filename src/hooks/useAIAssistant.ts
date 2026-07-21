import { useState, useCallback } from 'react';
import { BlockData } from '@/lib/types';
import { localDb } from '@/lib/client/db';
import { SyncManager } from '@/lib/client/sync-manager';

interface UseAIAssistantProps {
  documentId: string;
  blocks: BlockData[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockData[]>>;
  syncManagerRef: React.MutableRefObject<SyncManager | null>;
  currentRole: string;
}

export function useAIAssistant({ documentId, blocks, setBlocks, syncManagerRef, currentRole }: UseAIAssistantProps) {
  const [aiMenuBlockId, setAiMenuBlockId] = useState<string | null>(null);
  const [aiLoadingBlockId, setAiLoadingBlockId] = useState<string | null>(null);

  const handleAIAssist = useCallback(async (action: string) => {
    if (!aiMenuBlockId || currentRole === 'VIEWER') return;
    const blockIndex = blocks.findIndex(b => b.id === aiMenuBlockId);
    if (blockIndex === -1) return;
    
    const targetBlock = blocks[blockIndex];
    if (!targetBlock.content.trim()) return;

    setAiLoadingBlockId(aiMenuBlockId);
    setAiMenuBlockId(null);
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text: targetBlock.content })
      });
      
      const data = await res.json();
      if (data.result) {
        setBlocks(prev => {
          const newBlocks = [...prev];
          const updatedBlock = {
            ...targetBlock,
            content: action === 'autocomplete' 
              ? targetBlock.content + ' ' + data.result
              : data.result,
            version: targetBlock.version + 1,
            clientTimestamp: Date.now()
          };
          newBlocks[blockIndex] = updatedBlock;
          
          localDb.saveBlock(updatedBlock).then(() => {
            syncManagerRef.current?.queueOperation('UPDATE_BLOCK', updatedBlock);
          });
          
          return newBlocks;
        });
      }
    } catch (e) {
      console.error('AI request failed', e);
    } finally {
      setAiLoadingBlockId(null);
    }
  }, [aiMenuBlockId, currentRole, blocks, setBlocks, syncManagerRef]);

  return {
    aiMenuBlockId,
    setAiMenuBlockId,
    aiLoadingBlockId,
    handleAIAssist
  };
}
