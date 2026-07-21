import { X, Plus, Loader2 } from 'lucide-react';
import { Snapshot } from '@/lib/types';

interface SnapshotModalProps {
  currentRole: string;
  isCreatingSnapshot: boolean;
  snapshots: Snapshot[];
  setIsSnapshotModalOpen: (open: boolean) => void;
  createSnapshot: () => void;
  restoreSnapshot: (snap: Snapshot) => void;
}

export function SnapshotModal({
  currentRole,
  isCreatingSnapshot,
  snapshots,
  setIsSnapshotModalOpen,
  createSnapshot,
  restoreSnapshot
}: SnapshotModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-8 shadow-2xl relative max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-300">
        <button 
          onClick={() => setIsSnapshotModalOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
        >
          <X size={20} />
        </button>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Version History</h2>
          {currentRole !== 'VIEWER' && (
            <button 
              onClick={createSnapshot}
              disabled={isCreatingSnapshot}
              className="flex items-center gap-2 bg-primary/20 hover:bg-primary text-primary hover:text-white px-4 py-2 rounded-lg transition-all font-semibold text-sm disabled:opacity-50"
            >
              {isCreatingSnapshot ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Capture Current State
            </button>
          )}
        </div>
        
        <div className="overflow-y-auto pr-2 space-y-3 flex-1 scrollbar-thin">
          {snapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-white/10 rounded-xl">
              No snapshots captured yet.
            </div>
          ) : (
            snapshots.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 transition-colors group">
                <div>
                  <div className="font-semibold text-foreground/90">{snap.name}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1">{new Date(snap.createdAt).toLocaleString()}</div>
                </div>
                {currentRole !== 'VIEWER' && (
                  <button 
                    onClick={() => restoreSnapshot(snap)}
                    className="text-sm bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  >
                    Restore
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
