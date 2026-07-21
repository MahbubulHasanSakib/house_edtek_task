import { Wand2 } from 'lucide-react';
import { BlockData } from '@/lib/types';

interface AIWandMenuProps {
  block: BlockData;
  aiMenuBlockId: string | null;
  setAiMenuBlockId: (id: string | null) => void;
  handleAIAssist: (action: string) => void;
}

export function AIWandMenu({ block, aiMenuBlockId, setAiMenuBlockId, handleAIAssist }: AIWandMenuProps) {
  return (
    <div 
      className={`absolute -left-20 top-0.5 transition-opacity ${aiMenuBlockId === block.id ? 'opacity-100 z-50' : 'opacity-50 group-hover:opacity-100'}`}
      onMouseLeave={() => { if (aiMenuBlockId === block.id) setAiMenuBlockId(null) }}
    >
      <button
        onClick={() => setAiMenuBlockId(aiMenuBlockId === block.id ? null : block.id)}
        className="p-1.5 text-primary hover:text-white bg-primary/10 hover:bg-primary/80 rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:scale-110"
        title="AI Assist"
      >
        <Wand2 size={16} />
      </button>
      {aiMenuBlockId === block.id && (
        <div className="absolute z-50 top-full left-0 pt-2">
          <div className="w-56 glass-panel rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/10 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => handleAIAssist('summarize')} className="px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors font-medium border-b border-white/5">✨ Summarize</button>
            <button onClick={() => handleAIAssist('improve')} className="px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors font-medium border-b border-white/5">💡 Improve Writing</button>
            <button onClick={() => handleAIAssist('autocomplete')} className="px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors font-medium">✍️ Autocomplete</button>
          </div>
        </div>
      )}
    </div>
  );
}
