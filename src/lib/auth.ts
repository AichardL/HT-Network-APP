import crypto from 'node:crypto';
import { getDb } from './db';

const SECRET = process.env.GRIS_AUTH_SECRET || 'gris-default-secret-k3x9';
const TTL = 12 * 60 * 60 * 1000; // 12 小时

export function hashPassword(raw: string): string {
  return crypto.createHash('sha256').update(raw + ':gris').digest('hex');
}

export function verifyPassword(raw: string, stored: string): boolean {
  return crypto.timingSafeEqual(Buffer.from(hashPassword(raw)), Buffer.from(stored));
}

export interface SessionPayload {
  u: string;
  r: string;
  e: number;
}

export function signToken(p: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof p.e !== 'number' || p.e < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export interface AuthUser {
  username: string;
  role: string;
}

// 根据用户名校验密码（服务端）
export function credentialUser(username: string, password: string): AuthUser | null {
  const row = getDb()
    .prepare('SELECT username, password_hash, role FROM users WHERE username=?')
    .get(username) as { username: string; password_hash: string; role: string } | undefined;
  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;
  return { username: row.username, role: row.role };
}