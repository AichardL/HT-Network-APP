import { NextResponse } from 'next/server';
import { api, AUTH_COOKIE } from '@/lib/api';
import { credentialUser, signToken } from '@/lib/auth';

export const POST = api(async (req) => {
  const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username || '';
  const password = body?.password || '';
  const user = credentialUser(username, password);
  if (!user) return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  const token = signToken({ u: user.username, r: user.role, e: Date.now() + 12 * 60 * 60 * 1000 });
  const res = NextResponse.json({ success: true, user, token }, { status: 200 });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 12 * 60 * 60,
  });
  return res;
});