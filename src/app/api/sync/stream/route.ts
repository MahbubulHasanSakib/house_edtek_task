import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import { sseEmitter } from '@/lib/server/sse';
import { initPubSub } from '@/lib/server/pubsub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Long-polling: uses SQLite rowid for reliable ordering (avoids timestamp format issues)
export async function GET(request: NextRequest) {
  // Ensure this worker is listening for cross-process pubsub events
  await initPubSub();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const documentId = request.nextUrl.searchParams.get('documentId');
  const clientId = request.nextUrl.searchParams.get('clientId');
  const afterRowid = parseInt(request.nextUrl.searchParams.get('afterRowid') ?? '0', 10);

  if (!documentId || !clientId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // Verify access
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { permissions: { where: { userId: session.userId } } }
  });

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const hasAccess = doc.ownerId === session.userId || doc.permissions.length > 0;
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Seed cursor: if no afterRowid, start from current max sequenceId
  let currentRowid = afterRowid;
  if (currentRowid === 0) {
    const row = await prisma.syncLog.findFirst({
      where: { documentId },
      orderBy: { sequenceId: 'desc' },
      select: { sequenceId: true }
    });
    currentRowid = row?.sequenceId ?? 0;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      request.signal.addEventListener('abort', () => {
        isClosed = true;
      });

      const sendEvent = (data: Record<string, unknown>) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            isClosed = true;
          }
        }
      };

      // 1. In-memory instantly broadcast listener
      const listener = (payload: { type: string, clientId?: string, blocks?: unknown[] }) => {
        if (payload && payload.type === 'sync' && payload.clientId !== clientId && payload.blocks && payload.blocks.length > 0) {
           sendEvent({ blocks: payload.blocks, nextRowid: currentRowid });
        }
      };

      sseEmitter.on(`doc:${documentId}`, listener);
      
      request.signal.addEventListener('abort', () => {
        sseEmitter.off(`doc:${documentId}`, listener);
      });

      // 2. Fallback polling loop (runs while connection is open)
      while (!isClosed) {
        try {
          const logs = await prisma.syncLog.findMany({
            where: {
              documentId,
              clientId: { not: clientId },
              sequenceId: { gt: currentRowid }
            },
            orderBy: { sequenceId: 'asc' },
            take: 50
          });

          if (logs.length > 0) {
            currentRowid = logs[logs.length - 1].sequenceId;

            const blockIds = Array.from(new Set(
              logs.map(l => {
                try { 
                  const op = JSON.parse(l.operation);
                  return op.action ? op.payload?.id : null; 
                } catch { return null; }
              }).filter(Boolean)
            )) as string[];

            const roleUpdates = logs.map(l => {
              try {
                const op = JSON.parse(l.operation);
                return op.type === 'ROLE_UPDATE' ? op : null;
              } catch { return null; }
            }).filter(Boolean);

            const blocks = blockIds.length > 0
              ? await prisma.block.findMany({ where: { id: { in: blockIds } } })
              : [];

            sendEvent({ blocks, roleUpdates, nextRowid: currentRowid });
          }
        } catch (e) {
          // ignore DB polling errors during stream
        }

        // Wait 2 seconds before polling DB again (events are instant via emitter!)
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
