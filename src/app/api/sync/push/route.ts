import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';
import { sseEmitter } from '@/lib/server/sse';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, operations } = await request.json();
    if (!documentId || !Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verify permission (must be OWNER or EDITOR)
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

    const appliedBlocks = [];

    // Apply CRDT LWW Operations sequentially
    for (const op of operations) {
      const b = op.payload;
      
      const existing = await prisma.block.findUnique({ where: { id: b.id } });

      let shouldApply = false;
      if (!existing) {
        shouldApply = true;
      } else {
        // LWW Resolution
        if (b.version > existing.version) {
          shouldApply = true;
        } else if (b.version === existing.version) {
          if (b.clientTimestamp > existing.clientTimestamp.getTime()) {
            shouldApply = true;
          } else if (b.clientTimestamp === existing.clientTimestamp.getTime()) {
            if (b.clientId > existing.clientId) {
              shouldApply = true;
            }
          }
        }
      }

      if (shouldApply) {
        const updated = await prisma.block.upsert({
          where: { id: b.id },
          create: {
            id: b.id,
            documentId: b.documentId,
            type: b.type,
            content: b.content,
            index: b.index,
            version: b.version,
            clientId: b.clientId,
            clientTimestamp: new Date(b.clientTimestamp),
            deleted: b.deleted
          },
          update: {
            type: b.type,
            content: b.content,
            index: b.index,
            version: b.version,
            clientId: b.clientId,
            clientTimestamp: new Date(b.clientTimestamp),
            deleted: b.deleted
          }
        });
        
        appliedBlocks.push(updated);

        await prisma.syncLog.create({
          data: {
            documentId,
            operation: JSON.stringify(op),
            clientId: op.payload.clientId
          }
        });
      }
    }

    if (appliedBlocks.length > 0) {
      sseEmitter.emit(`doc:${documentId}`, {
        type: 'sync',
        blocks: appliedBlocks
      });
    }

    return NextResponse.json({ success: true, appliedCount: appliedBlocks.length });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
