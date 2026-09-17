import { api, json } from '@/lib/api';
import { delineateDistricts } from '@/lib/services';
import { getDb } from '@/lib/db';
import { listDistricts } from '@/lib/repo';

export const GET = api(
  async () => {
    return json({ districts: listDistricts() });
  },
  { auth: true },
);

export const POST = api(
  async (req) => {
    const body = (await req.json().catch(() => null)) as {
      market_code?: string;
      flowThreshold?: number;
      minSites?: number;
    } | null;
    const mk = body?.market_code || 'HK';
    const flowThreshold = Number(body?.flowThreshold ?? 500);
    const minSites = Math.max(2, Number(body?.minSites ?? 3));
    const results = delineateDistricts(mk, { flowThreshold, minSites });
    const db = getDb();
    const now = Date.now();
    const ins = db.prepare(
      'INSERT INTO districts (market_code,name,status,params,boundary,metrics,created_at) VALUES (?,?,?,?,?,?,?)',
    );
    for (const r of results) {
      ins.run(
        mk,
        r.name,
        'APPROVED',
        JSON.stringify({ flowThreshold, minSites }),
        JSON.stringify(r.siteIds),
        JSON.stringify({
          avgPeakFlow: r.avgPeakFlow,
          siteCount: r.siteCount,
          avgAffinity: r.avgAffinity,
        }),
        now,
      );
    }
    return json({ success: true, districts: results });
  },
  { auth: true },
);