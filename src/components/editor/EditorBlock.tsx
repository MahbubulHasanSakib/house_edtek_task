import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';
import { BlockData } from '@/lib/types';
import { AIWandMenu } from './AIWandMenu';

interface EditorBlockProps {
  block: BlockData;
  index: number;
  currentRole: string;
  aiMenuBlockId: string | null;
  aiLoadingBlockId: string | null;
  setAiMenuBlockId: (id: string | null) => void;
  handleAIAssist: (action: string) => void;
  updateBlockContent: (id: string, newContent: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number, blockId: string) => void;
}

export const EditorBlock = memo(function EditorBlock({
  block,
  index,
  currentRole,
  aiMenuBlockId,
  aiLoadingBlockId,
  setAiMenuBlockId,
  handleAIAssist,
  updateBlockContent,
  handleKeyDown
}: EditorBlockProps) {
  return (
    <div className="relative group flex items-start py-1">
      <div className="opacity-0 group-hover:opacity-100 absolute -left-10 top-2 cursor-grab text-muted-foreground hover:text-white transition-colors">
        ⋮⋮
      </div>
      
      {currentRole !== 'VIEWER' && (
        <AIWandMenu 
          block={block}
          aiMenuBlockId={aiMenuBlockId}
          setAiMenuBlockId={setAiMenuBlockId}
          handleAIAssist={handleAIAssist}
        />
      )}

      <div className="w-full flex flex-col">
        <textarea
          id={`block-${block.id}`}
          className={`w-full bg-transparent outline-none resize-none overflow-hidden ${block.type === 'h1' ? 'text-4xl font-bold mb-4 mt-8' : 'text-lg text-foreground/90 leading-relaxed'}`}
          value={block.content}
          onChange={(e) => {
            if (currentRole === 'VIEWER') return;
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
            updateBlockContent(block.id, e.target.value);
          }}
          onKeyDown={(e) => handleKeyDown(e, index, block.id)}
          rows={1}
          readOnly={currentRole === 'VIEWER'}
          placeholder={block.type === 'h1' ? "Heading 1" : "Type '/' for commands..."}
          onFocus={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />
        {aiLoadingBlockId === block.id && (
          <div className="flex items-center gap-2 text-primary text-sm mt-2 font-medium bg-primary/10 px-3 py-1.5 rounded-lg w-fit">
            <Loader2 size={14} className="animate-spin" /> AI is generating...
          </div>
        )}
      </div>
    </div>
  );
});
