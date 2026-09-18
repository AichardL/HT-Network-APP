import { api, json } from '@/lib/api';
import { getDistrict } from '@/lib/scout';

export const GET = api(
  async (_req, _s, ctx) => {
    const market = ctx.market;
    const key = ctx.key;
    const d = getDistrict(market || 'SG', key);
    if (!d) return json({ error: 'not found' }, 404);
    return json({ district: d });
  },
  { auth: true },
);