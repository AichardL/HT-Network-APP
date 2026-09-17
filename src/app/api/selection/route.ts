import { api, json } from '@/lib/api';
import { scoreSites } from '@/lib/services';

interface Req {
  market_code?: string;
  flow?: number;
  customerFit?: number;
  affordability?: number;
  competition?: number;
  minScore?: number;
}

export const POST = api(
  async (req) => {
    const body = (await req.json().catch(() => null)) as Req | null;
    const mk = body?.market_code || 'HK';
    const weights = {
      flow: Number(body?.flow ?? 0.4),
      customerFit: Number(body?.customerFit ?? 0.3),
      affordability: Number(body?.affordability ?? 0.2),
      competition: Number(body?.competition ?? 0.1),
    };
    const minScore = Number(body?.minScore ?? 0);
    const ranked = scoreSites(mk, weights, minScore * 10);
    return json({ success: true, weights, ranked });
  },
  { auth: true },
);