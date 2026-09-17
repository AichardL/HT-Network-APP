import { api, json } from '@/lib/api';
import { recentAudits } from '@/lib/repo';

export const GET = api(
  async () => {
    return json({ audits: recentAudits(50) });
  },
  { auth: true },
);