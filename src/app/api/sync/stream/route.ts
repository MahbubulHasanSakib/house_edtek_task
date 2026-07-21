import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/auth';
import prisma from '@/lib/server/db';
import Database from 'better-sqlite3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Long-polling: uses SQLite rowid for reliable ordering (avoids timestamp format issues)
export async function GET(request: NextRequest) {
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

  // Use better-sqlite3 directly for rowid-based queries
  const db = new Database('dev.db', { readonly: true });

  // Seed cursor: if no afterRowid, start from current max rowid
  let currentRowid = afterRowid;
  if (currentRowid === 0) {
    const row = db.prepare(
      `SELECT MAX(rowid) as maxRowid FROM SyncLog WHERE documentId = ?`
    ).get(documentId) as { maxRowid: number | null };
    currentRowid = row?.maxRowid ?? 0;
  }

  const maxWait = 20000;
  const pollInterval = 500;
  const deadline = Date.now() + maxWait;

  try {
    while (Date.now() < deadline) {
      if (request.signal.aborted) break;

      // Query for new logs from OTHER clients with rowid > cursor
      const logs = db.prepare(
        `SELECT rowid, id, clientId, operation FROM SyncLog 
         WHERE documentId = ? AND clientId != ? AND rowid > ?
         ORDER BY rowid ASC LIMIT 50`
      ).all(documentId, clientId, currentRowid) as Array<{
        rowid: number; id: string; clientId: string; operation: string;
      }>;

      if (logs.length > 0) {
        const newRowid = logs[logs.length - 1].rowid;

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

        db.close();
        return NextResponse.json({ blocks, roleUpdates, nextRowid: newRowid });
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  } catch (e) {
    // ignore abort errors
  } finally {
    try { db.close(); } catch {}
  }

  return NextResponse.json({ blocks: [], nextRowid: currentRowid });
}
