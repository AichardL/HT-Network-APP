import { api, json } from '@/lib/api';
import { catchment } from '@/lib/spatial/catchment';
import type { MarketCode } from '@/lib/scout-types';

export const GET = api(
  async (req) => {
    const url = new URL(req.url);
    const market = (url.searchParams.get('market') || 'SG') as MarketCode;
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const radius = Math.min(5, Math.max(0.3, Number(url.searchParams.get('radius')) || 1));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: 'lat/lng required' }, 400);
    return json(catchment(market, { lat, lng }, radius));
  },
  { auth: true },
);