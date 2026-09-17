import { NextResponse } from 'next/server';
import { getDb } from './db';
import { verifyToken, type SessionPayload } from './auth';

export const AUTH_COOKIE = 'gris_token';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.get('cookie') || '';
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

export function requireAuth(req: Request): SessionPayload | null {
  const token = parseCookies(req)[AUTH_COOKIE];
  if (!token) return null;
  return verifyToken(token);
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

export function writeAudit(
  actor: string,
  method: string,
  path: string,
  status: number,
  ip: string,
) {
  try {
    getDb()
      .prepare(
        'INSERT INTO audit_log (actor,method,path,status,ip,at) VALUES (?,?,?,?,?,?)',
      )
      .run(actor || 'anon', method, path, status, ip, Date.now());
  } catch {
    // 审计失败不应阻断业务
  }
}

type Handler = (req: Request, session: SessionPayload | null, ctx: Record<string, string>) => Promise<Response> | Response;

// 统一 API 封装：鉴权（可选）、审计、异常兜底
export function api(handler: Handler, opts?: { auth?: boolean }) {
  return async (req: Request, ctxArg?: { params: Promise<Record<string, string>> }) => {
    const ctx = (await ctxArg?.params) || {};
    const method = req.method;
    const path = new URL(req.url).pathname;
    const ip = clientIp(req);
    const session = requireAuth(req);
    let status = 200;
    try {
      if (opts?.auth && session == null) {
        status = 401;
        writeAudit('anon', method, path, status, ip);
        return json({ error: 'unauthorized' }, 401);
      }
      const res = await handler(req, session, ctx);
      status = res instanceof NextResponse ? res.status : res.status || 200;
      writeAudit(session?.u || 'anon', method, path, status, ip);
      return res;
    } catch (e) {
      status = 500;
      writeAudit(session?.u || 'anon', method, path, status, ip);
      const msg = e instanceof Error ? e.message : 'internal error';
      return json({ error: msg }, 500);
    }
  };
}

export function param(ctx: Record<string, string>, key: string): string | undefined {
  return ctx[key];
}