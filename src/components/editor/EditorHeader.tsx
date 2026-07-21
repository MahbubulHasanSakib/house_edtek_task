import Link from 'next/link';
import { ChevronLeft, Wifi, Loader2, WifiOff, Share2, History } from 'lucide-react';
import { ConnectionStatus } from '@/lib/types';

interface EditorHeaderProps {
  title: string;
  handleTitleChange: (newTitle: string) => void;
  status: ConnectionStatus;
  currentRole: string;
  currentUserEmail: string;
  setIsShareModalOpen: (open: boolean) => void;
  loadSnapshots: () => void;
}

export function EditorHeader({
  title,
  handleTitleChange,
  status,
  currentRole,
  currentUserEmail,
  setIsShareModalOpen,
  loadSnapshots
}: EditorHeaderProps) {
  return (
    <div className="sticky top-6 z-40 flex justify-between w-full max-w-5xl mx-auto items-center mb-16 p-4 glass-panel rounded-2xl transition-all">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-muted-foreground hover:text-white transition-all p-2.5 bg-secondary/50 hover:bg-secondary rounded-xl backdrop-blur-sm group">
          <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </Link>
        <div className="flex flex-col">
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-bold bg-transparent outline-none border-b border-transparent focus:border-border transition-colors text-foreground"
            readOnly={currentRole === 'VIEWER'}
          />
          <span className="text-xs text-muted-foreground mt-1">Logged in as: {currentUserEmail}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status === 'online' && <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]"><Wifi size={14}/> Online</div>}
        {status === 'syncing' && <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-blue-500/20 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.1)]"><Loader2 size={14} className="animate-spin"/> Syncing</div>}
        {status === 'offline' && <div className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-red-500/20"><WifiOff size={14}/> Offline</div>}

        <div className="w-px h-8 bg-white/10 mx-1"></div>

        {currentRole === 'OWNER' && (
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl transition-colors font-medium border border-primary/20"
          >
            <Share2 size={16} /> Share
          </button>
        )}

        <button 
          onClick={loadSnapshots}
          className="flex items-center gap-2 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground px-4 py-2 rounded-xl transition-colors font-medium border border-white/5"
        >
          <History size={16} /> Snapshots
        </button>
      </div>
    </div>
  );
}
