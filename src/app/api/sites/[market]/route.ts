import { api, json } from '@/lib/api';
import { listSites, siteFlowSummary, customerByZone } from '@/lib/repo';

export const GET = api(
  async (_req, _session, ctx) => {
    const mk = ctx.market as string;
    const sites = listSites(mk);
    const flow = siteFlowSummary(mk);
    const zoneIds = [...new Set(sites.map((s) => s.zone_id))];
    const custOf = new Map<number, { tea_affinity: number }>();
    for (const c of customerByZone(zoneIds) as unknown as { zone_id: number; tea_affinity: number }[])
      custOf.set(c.zone_id, c);
    const data = sites.map((s) => ({
      ...s,
      peak_flow: flow[s.id] ?? 0,
      tea_affinity: custOf.get(s.zone_id)?.tea_affinity ?? 0.4,
    }));
    return json({ sites: data });
  },
  { auth: true },
);