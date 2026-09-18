import { api, json } from '@/lib/api';
import { generateGrid, type Theme } from '@/lib/scout';

export const GET = api(
  async (req) => {
    const url = new URL(req.url);
    const market = url.searchParams.get('market') || 'SG';
    const theme = (url.searchParams.get('theme') || 'overall') as Theme;
    const cells = generateGrid(market, theme);
    return json({ market, theme, cells });
  },
  { auth: true },
);