// 数据源适配器：Google Places（服务端调用，遵守商贸、缓存与归属要求）。
// 环境变量 GOOGLE_PLACES_API_KEY 存在时走真实 Google Places Nearby Search；
// 缺失时返回明确标注的"演示竞品"降级数据，保证开发/预览/部署环境下可运行。
// 接入真实数据只需在部署环境注入对应 key，无需改业务代码。

export interface Poi {
  name: string;
  lat: number;
  lng: number;
  category: string;
  real: boolean; // true=真实 Places 结果；false=演示降级
  source: string;
}

interface PlacesItem {
  name?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  types?: string[];
}

const CATEGORIES = ['茶饮', '咖啡', '轻餐', '烘焙'];

export function placesEnabled(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

export async function nearbyCompetitors(q: string, lat: number, lng: number, radius = 800): Promise<Poi[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY as string | undefined;
  if (!key) return fixture(q, lat, lng);

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat.toFixed(5)},${lng.toFixed(5)}&radius=${radius}&keyword=${encodeURIComponent(q)}&key=${key}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return fixture(q, lat, lng);
    const data = (await res.json()) as { results?: PlacesItem[] };
    const list = data.results ?? [];
    const out: Poi[] = list.slice(0, 24).map((r) => ({
      name: r.name || q,
      lat: r.geometry?.location?.lat ?? lat,
      lng: r.geometry?.location?.lng ?? lng,
      category: q,
      real: true,
      source: 'Google Places',
    }));
    return out.length ? out : fixture(q, lat, lng);
  } catch {
    // 无外网（沙箱预览）时诚实降级为演示；部署到有外网环境后自动走真实
    return fixture(q, lat, lng);
  }
}

// 演示降级：围绕目标点生成周边竞品，明确标注"演示"。
function fixture(q: string, lat: number, lng: number): Poi[] {
  const out: Poi[] = [];
  let seed = (lat * 1000 + lng) >>> 0;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const n = 6 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 120 + rnd() * 560;
    out.push({
      name: `${q} · 演示${i + 1}`,
      lat: lat + (Math.sin(a) * d) / 111000,
      lng: lng + (Math.cos(a) * d) / (111000 * Math.cos((lat * Math.PI) / 180)),
      category: q,
      real: false,
      source: CATEGORIES[i % CATEGORIES.length],
    });
  }
  return out;
}