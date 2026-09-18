import { api, json, param } from '@/lib/api';
import { listDistricts } from '@/lib/scout';

export const GET = api(
  async (req, _s, ctx) => {
    const market = new URL(req.url).searchParams.get('market') || 'SG';
    return json({ districts: listDistricts(market) });
  },
  { auth: true },
);