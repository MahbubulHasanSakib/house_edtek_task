import Link from 'next/link';
import { getSession } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import { redirect } from 'next/navigation';
import { FileText, Plus } from 'lucide-react';

export default async function Dashboard() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: session.userId },
        { permissions: { some: { userId: session.userId } } }
      ]
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12 min-h-screen">
      <header className="flex justify-between items-end mb-16 relative z-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 mb-2">
            My Documents
          </h1>
          <p className="text-muted-foreground font-medium">Logged in as <span className="text-foreground">{session.email}</span></p>
        </div>
        <form action="/api/document/create" method="POST">
          <button 
            type="submit" 
            className="group relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full transition-all duration-300 font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            <Plus size={20} className="transition-transform group-hover:rotate-90 duration-300" />
            New Document
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
        {documents.map(doc => (
          <Link key={doc.id} href={`/document/${doc.id}`} className="group block h-full">
            <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/40 transition-all duration-500 cursor-pointer h-48 flex flex-col justify-between relative overflow-hidden group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:-translate-y-1">
              
              {/* Subtle hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform duration-300">
                    <FileText size={24} />
                  </div>
                  <div className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider ${doc.ownerId === session.userId ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {doc.ownerId === session.userId ? 'Owner' : 'Shared'}
                  </div>
                </div>
                <h2 className="font-bold text-xl text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2 leading-tight">
                  {doc.title}
                </h2>
              </div>
              
              <div className="relative z-10 mt-4">
                <p className="text-xs font-medium text-muted-foreground/70">
                  Last updated {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </Link>
        ))}
        {documents.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-center glass rounded-2xl border-dashed border-white/10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 animate-pulse-slow">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No documents yet</h3>
            <p className="text-muted-foreground max-w-sm">Create your first beautiful document by clicking the button in the top right corner.</p>
          </div>
        )}
      </div>
    </div>
  );
}
