import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = (await context.params).id;
    const { email, role } = await request.json();

    if (!email || !['EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Verify ownership
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find target user by email
    const targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === session.userId) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
    }

    // Upsert permission
    await prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUser.id
        }
      },
      update: { role },
      create: {
        documentId,
        userId: targetUser.id,
        role
      }
    });

    await prisma.syncLog.create({
      data: {
        documentId,
        clientId: 'server',
        operation: JSON.stringify({ type: 'ROLE_UPDATE', email, role })
      }
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');

    return NextResponse.json({ success: true, message: `Shared with ${email} as ${role}` });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
