import { api, json } from '@/lib/api';
import { sourceRegistry, liveLayers } from '@/lib/sources/registry';
import { dataMode } from '@/lib/scoring/provenance';
import { MODEL_VERSION } from '@/lib/scoring/config';
import type { MarketCode } from '@/lib/scout-types';

export const GET = api(
  async (req) => {
    const url = new URL(req.url);
    const market = (url.searchParams.get('market') || 'SG') as MarketCode;
    return json({
      market,
      data_mode: dataMode(),
      model_version: MODEL_VERSION,
      live_layers: liveLayers(market),
      layers: sourceRegistry(market),
    });
  },
  { auth: true },
);