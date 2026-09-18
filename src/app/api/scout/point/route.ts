import { api, json } from '@/lib/api';
import { listDistricts } from '@/lib/scout';
import { gaussianField } from '@/lib/spatial/decay';
import { proxyProvenance } from '@/lib/scoring/provenance';
import type { ComponentKey, DataProvenance, MarketCode, PointAnalysis } from '@/lib/scout-types';
import { distKm } from '@/lib/spatial/geometry';

const KEYS: ComponentKey[] = ['transit', 'commercial', 'young', 'resident', 'tourism'];

export const GET = api(
  async (req) => {
    const url = new URL(req.url);
    const market = (url.searchParams.get('market') || 'SG') as MarketCode;
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: 'lat/lng required' }, 400);

    const districts = listDistricts(market);
    const pt = { lat, lng };

    let nearest = districts[0];
    let nearestD = Infinity;
    for (const d of districts) {
      const dd = distKm(pt, d);
      if (dd < nearestD) {
        nearestD = dd;
        nearest = d;
      }
    }

    // Demo 影响面：任意点五维分量（真实层接入后替换为该点 grid 原始值）
    const values = {} as Record<ComponentKey, number>;
    const provenance = {} as Record<ComponentKey, DataProvenance>;
    for (const k of KEYS) {
      const rankable = Number(nearest.components[k]);
      const f = gaussianField(
        pt,
        districts.map((d) => ({ lat: d.lat, lng: d.lng, value: Number(d.components[k]) })),
        Math.max(0.5, nearestD * 1.5),
      );
      values[k] = Math.round(Math.min(1, f.value) * 100);
      provenance[k] = proxyProvenance(k, market, {
        method: 'Demo 影响面插值（最近商圈高斯扩散）；接入 LTA/OneMap 后填真实 grid 原始值',
        spatial_granularity: '连续点',
      });
      void rankable;
    }

    const analysis: PointAnalysis = {
      market,
      lat,
      lng,
      subzone: null,
      district_key: nearest.area_key,
      nearest_transit: null, // 无 LTA key → 如实置空
      cell: {
        id: `${lat.toFixed(4)}_${lng.toFixed(4)}`,
        values,
      },
      nearby: [],
      provenance,
    };
    return json(analysis);
  },
  { auth: true },
);