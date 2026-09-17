import { api, json } from '@/lib/api';
import { listZones, customerByZone } from '@/lib/repo';

export const GET = api(
  async (_req, _session, ctx) => {
    const mk = ctx.market as string;
    const zones = listZones(mk);
    const cust = customerByZone(zones.map((z) => z.id)) as unknown as {
      zone_id: number;
      premium_share: number;
      income_high_share: number;
      tea_affinity: number;
      age_18_24: number;
      age_25_34: number;
      age_35_44: number;
      age_45_plus: number;
      avg_basket: number;
    }[];
    const rows = zones.map((z) => {
      const c = cust.find((x) => x.zone_id === z.id);
      return { zone: z, profile: c ?? null };
    });
    return json({ customers: rows });
  },
  { auth: true },
);