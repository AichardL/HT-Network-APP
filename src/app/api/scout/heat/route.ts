import { api, json } from '@/lib/api';
import { heatFor } from '@/lib/spatial/heat';
import type { MarketCode } from '@/lib/scout-types';

export const GET = api(
  async (req) => {
    const url = new URL(req.url);
    const market = (url.searchParams.get('market') || 'SG') as MarketCode;
    const zoom = Math.min(18, Math.max(3, Number(url.searchParams.get('zoom')) || 11));
    const theme = url.searchParams.get('theme') || 'overall';
    const minLat = Number(url.searchParams.get('minLat')) || 1.16;
    const maxLat = Number(url.searchParams.get('maxLat')) || 1.49;
    const minLng = Number(url.searchParams.get('minLng')) || 103.58;
    const maxLng = Number(url.searchParams.get('maxLng')) || 104.1;
    const bbox = { minLat, maxLat, minLng, maxLng };
    const { points, provider, bandwidth, count } = heatFor(market, bbox, zoom, theme);
    return json({ market, theme, zoom, provider, bandwidth, count, points });
  },
  { auth: true },
);