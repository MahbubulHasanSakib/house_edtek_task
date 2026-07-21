import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';
import { publishSyncEvent } from '@/lib/server/pubsub';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId, clientId, operations } = await request.json();
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

    // 1. Instantly broadcast to ALL worker processes via Postgres NOTIFY!
    await publishSyncEvent(documentId, {
      type: 'sync',
      clientId, // The sender's ID
      blocks: operations.map((op: any) => op.payload)
    });

    // 2. Offload all CRDT resolution and database writes to a background task
    (async () => {
      try {
        const blockIds = operations.map((op: any) => op.payload.id);
        const existingBlocks = await prisma.block.findMany({ where: { id: { in: blockIds } } });
        const existingMap = new Map(existingBlocks.map(b => [b.id, b]));

        const blockUpdates = new Map();
        const logsData: any[] = [];

        for (const op of operations) {
          const b = op.payload;
          const existing = blockUpdates.get(b.id) || existingMap.get(b.id);

          let shouldApply = false;
          if (!existing) {
            shouldApply = true;
          } else {
            if (b.version > existing.version) {
              shouldApply = true;
            } else if (b.version === existing.version) {
              const bTime = typeof b.clientTimestamp === 'string' ? new Date(b.clientTimestamp).getTime() : b.clientTimestamp;
              const eTime = existing.clientTimestamp instanceof Date ? existing.clientTimestamp.getTime() : existing.clientTimestamp;
              
              if (bTime > eTime) {
                shouldApply = true;
              } else if (bTime === eTime) {
                if (b.clientId > existing.clientId) {
                  shouldApply = true;
                }
              }
            }
          }

          if (shouldApply) {
            blockUpdates.set(b.id, b);
            logsData.push({
              documentId,
              operation: JSON.stringify(op),
              clientId: clientId // Use the sender's ID, not the block creator's ID
            });
          }
        }

        let txs: any[] = [];

        if (logsData.length > 0) {
          for (const b of blockUpdates.values()) {
            txs.push(prisma.block.upsert({
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
            }));
          }

          txs.push(prisma.syncLog.createMany({ data: logsData }));
        }

        if (txs.length > 0) {
          await prisma.$transaction(txs, { timeout: 15000 });
        }
      } catch (error) {
        console.error('Background sync error:', error);
      }
    })();

    // 3. Return instantly to unblock the client!
    return NextResponse.json({ success: true, appliedCount: operations.length });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
