import { NextResponse } from 'next/server';
import prisma from '@/lib/server/db';
import { getSession } from '@/lib/server/auth';
import { generateFractionalIndex } from '@/lib/client/fractional-indexing';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url), 303);
    }

    const doc = await prisma.document.create({
      data: {
        title: 'Untitled Document',
        ownerId: session.userId,
      }
    });

    // Create an initial empty block
    const initialBlockId = crypto.randomUUID();
    await prisma.block.create({
      data: {
        id: initialBlockId,
        documentId: doc.id,
        type: 'h1',
        content: '',
        index: generateFractionalIndex(null, null, session.userId),
        version: 1,
        clientId: session.userId,
        clientTimestamp: new Date(),
        deleted: false
      }
    });

    return NextResponse.redirect(new URL(`/document/${doc.id}`, request.url), 303);
  } catch (error) {
    console.error('Document creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
