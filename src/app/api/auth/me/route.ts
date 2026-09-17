import { NextResponse } from 'next/server';
import { api, AUTH_COOKIE } from '@/lib/api';

export const POST = api(async () => {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
});

export const GET = api(async (req, session) => {
  if (!session) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: { username: session.u, role: session.r } });
});