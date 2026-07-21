import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET as string;
const key = new TextEncoder().encode(secretKey);

export default async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (!isAuthRoute && isApiRoute) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      await jwtVerify(session, key, { algorithms: ['HS256'] });
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
