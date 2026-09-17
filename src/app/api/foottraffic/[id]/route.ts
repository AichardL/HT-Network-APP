import { api, json } from '@/lib/api';
import { siteHourlyBySite } from '@/lib/repo';

export const GET = api(
  async (_req, _session, ctx) => {
    const id = Number(ctx.id);
    const weekday = siteHourlyBySite(id, 'WEEKDAY');
    const weekend = siteHourlyBySite(id, 'WEEKEND');
    return json({ siteId: id, weekday, weekend });
  },
  { auth: true },
);