import { api, json } from '@/lib/api';
import { listMarkets, themeLabel } from '@/lib/scout';

const THEMES = [
  { key: 'overall', label: '综合活跃度' },
  { key: 'transit', label: '交通人流' },
  { key: 'commercial', label: '商业密度' },
  { key: 'young', label: '年轻客群' },
  { key: 'resident', label: '社区消费' },
  { key: 'tourism', label: '游客潜力' },
].map((t) => ({ ...t, label: themeLabel(t.key as never) }));

export const GET = api(
  async () => {
    return json({
      markets: listMarkets(),
      themes: THEMES,
      districtTypes: ['核心商业', '社区', '办公', '旅游'],
      placesEnabled: !!process.env.GOOGLE_PLACES_API_KEY,
    });
  },
  { auth: true },
);