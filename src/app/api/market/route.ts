import { api, json } from '@/lib/api';
import { listMarkets } from '@/lib/repo';

export const GET = api(
  async () => {
    return json({ markets: listMarkets() });
  },
  { auth: true },
);