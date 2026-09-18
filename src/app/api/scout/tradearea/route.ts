import { api, json } from '@/lib/api';
import { getTradeArea } from '@/lib/scout';

export const GET = api(
  async (req) => {
    const market = new URL(req.url).searchParams.get('market') || 'SG';
    const key = new URL(req.url).searchParams.get('key') || '';
    const radius = Number(new URL(req.url).searchParams.get('radius') || 1);
    if (!key) return json({ error: 'missing key' }, 400);
    const stats = getTradeArea(market, key, radius);
    if (!stats) return json({ error: 'not found' }, 404);
    return json({ stats });
  },
  { auth: true },
);