import { api, json } from '@/lib/api';
import {
  listSites,
  listZones,
  siteFlowSummary,
  siteTypeDistribution,
  footTrafficSeries,
  customerByZone,
  listDistricts,
} from '@/lib/repo';

interface Cust {
  zone_id: number;
  premium_share: number;
  tea_affinity: number;
  income_high_share: number;
  age_18_24: number;
  age_25_34: number;
  age_35_44: number;
  age_45_plus: number;
}

export const GET = api(
  async (_req, _session, ctx) => {
    const mk = ctx.market as string;
    const sites = listSites(mk);
    const zones = listZones(mk);
    const flow = siteFlowSummary(mk);
    const peaks = sites.map((s) => flow[s.id] ?? 0);
    const avgPeak = peaks.length ? Math.round(peaks.reduce((a, b) => a + b, 0) / peaks.length) : 0;
    const rents = sites.map((s) => s.monthly_rent);
    const avgRent = rents.length ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : 0;
    const cust = customerByZone(zones.map((z) => z.id)) as unknown as Cust[];
    const avgAffinity = cust.length
      ? +(cust.reduce((a, c) => a + c.tea_affinity, 0) / cust.length).toFixed(2)
      : 0;
    const avgPremium = cust.length
      ? +(cust.reduce((a, c) => a + c.premium_share, 0) / cust.length).toFixed(2)
      : 0;
    const districts = listDistricts(mk);
    const weekSeries = footTrafficSeries(sites.map((s) => s.id), 'WEEKDAY');
    const weekendSeries = footTrafficSeries(sites.map((s) => s.id), 'WEEKEND');
    const avgAges = cust.length
      ? {
          age18_24: +(cust.reduce((a, c) => a + c.age_18_24, 0) / cust.length).toFixed(2),
          age25_34: +(cust.reduce((a, c) => a + c.age_25_34, 0) / cust.length).toFixed(2),
          age35_44: +(cust.reduce((a, c) => a + c.age_35_44, 0) / cust.length).toFixed(2),
          age45_plus: +(cust.reduce((a, c) => a + c.age_45_plus, 0) / cust.length).toFixed(2),
        }
      : { age18_24: 0, age25_34: 0, age35_44: 0, age45_plus: 0 };

    return json({
      market: mk,
      kpi: {
        siteCount: sites.length,
        avgPeak,
        avgRent,
        avgAffinity,
        avgPremium,
        districtCount: districts.length,
        zoneCount: zones.length,
      },
      charts: {
        weekday: weekSeries,
        weekend: weekendSeries,
        siteTypes: siteTypeDistribution(mk),
        ages: avgAges,
      },
    });
  },
  { auth: true },
);