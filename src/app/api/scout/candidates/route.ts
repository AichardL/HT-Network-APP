import { api, json } from '@/lib/api';
import { listCandidates, saveCandidate, deleteCandidate } from '@/lib/scout';

export const GET = api(
  async (req) => {
    const market = new URL(req.url).searchParams.get('market') || 'SG';
    return json({ candidates: listCandidates(market) });
  },
  { auth: true },
);

export const POST = api(
  async (req, session) => {
    const body = (await req.json()) as {
      market_code: string;
      area_key: string;
      name: string;
      lat: number;
      lng: number;
      note: string;
    };
    if (!body.area_key || !body.name) return json({ error: 'invalid' }, 400);
    const cand = saveCandidate({
      market_code: body.market_code || 'SG',
      area_key: body.area_key,
      name: body.name,
      lat: body.lat,
      lng: body.lng,
      note: body.note || '',
      created_by: session?.u || 'anon',
    });
    return json({ success: true, candidate: cand });
  },
  { auth: true },
);

export const DELETE = api(
  async (req) => {
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!id) return json({ error: 'invalid' }, 400);
    deleteCandidate(id);
    return json({ success: true });
  },
  { auth: true },
);