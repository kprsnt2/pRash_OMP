import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  createTokenForPassword,
  getExpectedPassword,
  safeEqual,
  verifyAuthToken,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, action } = body;

    if (action === 'logout') {
      const res = NextResponse.json({ ok: true, authenticated: false });
      res.cookies.set(AUTH_COOKIE, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return res;
    }

    const expected = getExpectedPassword();
    if (!password || !safeEqual(String(password).trim(), expected.trim())) {
      return NextResponse.json(
        { ok: false, error: 'Incorrect password. Access denied.' },
        { status: 401 }
      );
    }

    const token = await createTokenForPassword(expected);
    const res = NextResponse.json({ ok: true, authenticated: true, token });
    res.cookies.set(AUTH_COOKIE, token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid request';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const cookieToken = req.cookies.get(AUTH_COOKIE)?.value;
  const authHeader = req.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = cookieToken || headerToken;

  const valid = await verifyAuthToken(token);
  return NextResponse.json({ authenticated: valid });
}
