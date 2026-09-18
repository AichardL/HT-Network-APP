import { api, json } from '@/lib/api';
import { getDb } from '@/lib/db';

export const GET = api(
  async () => {
    const audits = getDb()
      .prepare('SELECT id, actor, method, path, status, at FROM audit_log ORDER BY id DESC LIMIT 80')
      .all() as unknown as {
      id: number;
      actor: string;
      method: string;
      path: string;
      status: number;
      at: number;
    }[];
    return json({ audits });
  },
  { auth: true },
);