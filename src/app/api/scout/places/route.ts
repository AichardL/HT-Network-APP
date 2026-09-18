import { api, json } from '@/lib/api';
import { nearbyCompetitors, placesEnabled } from '@/lib/sources/places';

export const GET = api(
  async (req) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '茶饮';
    const lat = parseFloat(url.searchParams.get('lat') || '1.3521');
    const lng = parseFloat(url.searchParams.get('lng') || '103.8198');
    const pois = await nearbyCompetitors(q, lat, lng);
    return json({ pois, enabled: placesEnabled(), source: pois[0]?.source ?? '' });
  },
  { auth: true },
);