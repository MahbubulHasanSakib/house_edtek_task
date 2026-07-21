import { useState } from 'react';
import { X } from 'lucide-react';

interface ShareModalProps {
  documentId: string;
  allUsers: any[];
  currentUserEmail: string;
  setIsShareModalOpen: (open: boolean) => void;
}

export function ShareModal({ documentId, allUsers, currentUserEmail, setIsShareModalOpen }: ShareModalProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('VIEWER');

  const handleShare = async () => {
    if (!shareEmail) return;
    try {
      const res = await fetch(`/api/document/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: shareEmail, role: shareRole })
      });
      if (res.ok) {
        setIsShareModalOpen(false);
        setShareEmail('');
      } else {
        alert('Failed to share document');
      }
    } catch (e) {
      console.error('Share error', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button 
          onClick={() => setIsShareModalOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"
        >
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-foreground">Share Document</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">User Email</label>
            <select 
              value={shareEmail}
              onChange={e => setShareEmail(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white"
            >
              <option value="" disabled>Select a user</option>
              {allUsers.filter(u => u.email !== currentUserEmail).map(u => (
                <option key={u.id} value={u.email} className="bg-popover text-foreground">{u.name ? `${u.name} (${u.email})` : u.email}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Role</label>
            <select 
              value={shareRole} 
              onChange={(e) => setShareRole(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white"
            >
              <option value="VIEWER" className="bg-popover text-foreground">Viewer</option>
              <option value="EDITOR" className="bg-popover text-foreground">Editor</option>
            </select>
          </div>
          <button 
            onClick={handleShare}
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-3 font-semibold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
