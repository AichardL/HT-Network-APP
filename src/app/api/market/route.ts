import { api, json } from '@/lib/api';
import { listMarkets } from '@/lib/scout';

export const GET = api(
  async () => {
    return json({ markets: listMarkets() });
  },
  { auth: true },
);