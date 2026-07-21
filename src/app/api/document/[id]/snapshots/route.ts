import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = (await context.params).id;

    // Verify access
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { permissions: { where: { userId: session.userId } } }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const hasAccess = doc.ownerId === session.userId || doc.permissions.length > 0;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshots = await prisma.snapshot.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Fetch snapshots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = (await context.params).id;
    const { name } = await request.json();

    // Verify access (must be OWNER or EDITOR)
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { permissions: { where: { userId: session.userId } } }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const isOwner = doc.ownerId === session.userId;
    const hasPermission = doc.permissions.length > 0 && doc.permissions[0].role === 'EDITOR';
    
    if (!isOwner && !hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch current blocks to save in the snapshot
    const blocks = await prisma.block.findMany({
      where: { documentId, deleted: false },
      orderBy: [
        { index: 'asc' },
        { clientTimestamp: 'asc' },
        { id: 'asc' }
      ]
    });

    const snapshot = await prisma.snapshot.create({
      data: {
        documentId,
        name: name || `Snapshot ${new Date().toLocaleString()}`,
        data: JSON.stringify(blocks)
      }
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Create snapshot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
