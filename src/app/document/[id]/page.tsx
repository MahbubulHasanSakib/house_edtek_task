import { getSession } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import { redirect } from 'next/navigation';
import EditorClient from '@/components/editor-client';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const documentId = (await params).id;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { permissions: { where: { userId: session.userId } } }
  });

  if (!doc) {
    return <div className="p-8 text-center text-muted-foreground">Document not found</div>;
  }

  const isOwner = doc.ownerId === session.userId;
  const hasAccess = isOwner || doc.permissions.length > 0;

  if (!hasAccess) {
    return <div className="p-8 text-center text-destructive">You do not have permission to view this document.</div>;
  }

  const role = isOwner ? 'OWNER' : doc.permissions[0].role;

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      <EditorClient documentId={documentId} initialTitle={doc.title} role={role} currentUserEmail={session.email} />
    </div>
  );
}
