import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = (await context.params).id;

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        blocks: {
          where: { deleted: false },
          orderBy: [
            { index: 'asc' },
            { clientTimestamp: 'asc' },
            { id: 'asc' }
          ]
        },
        permissions: { where: { userId: session.userId } }
      }
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const hasAccess = doc.ownerId === session.userId || doc.permissions.length > 0;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = doc.ownerId === session.userId ? 'OWNER' : doc.permissions[0].role;

    return NextResponse.json({
      document: {
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      role,
      blocks: doc.blocks
    });
  } catch (error) {
    console.error('Fetch document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = (await context.params).id;
    const { title } = await request.json();

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

    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: { title }
    });

    return NextResponse.json({ document: updatedDoc });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
