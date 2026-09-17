import { api, json } from '@/lib/api';
import { planNetwork } from '@/lib/services';
import { getDb } from '@/lib/db';
import { listProjects, projectSites } from '@/lib/repo';

export const GET = api(
  async () => {
    const projects = listProjects();
    const withSites = projects.map((p) => {
      const sites = projectSites(p.id as number);
      return { ...p, sites };
    });
    return json({ projects: withSites });
  },
  { auth: true },
);

export const POST = api(
  async (req) => {
    const body = (await req.json().catch(() => null)) as {
      market_code?: string;
      target_stores?: number;
      strategy?: string;
      min_spacing?: number;
    } | null;
    const mk = body?.market_code || 'HK';
    const target = Math.max(1, Number(body?.target_stores ?? 6));
    const strategy = (body?.strategy || 'EXPANSION') as 'EXPANSION' | 'PENETRATION' | 'PREMIUM';
    const minSpacing = Math.max(1, Number(body?.min_spacing ?? 12));
    const plan = planNetwork(mk, { targetStores: target, strategy, minSpacing });
    const db = getDb();
    const now = Date.now();
    const ins = db
      .prepare(
        'INSERT INTO projects (market_code,name,target_stores,strategy,min_spacing,status,created_at) VALUES (?,?,?,?,?,?,?)',
      )
      .run(mk, `${plan.projectName} · ${now}`, target, strategy, minSpacing, 'PLANNING', now);
    const pid = Number(ins.lastInsertRowid);
    const insPs = db.prepare(
      'INSERT INTO project_sites (project_id,site_id,role,score,rank) VALUES (?,?,?,?,?)',
    );
    for (const c of plan.chosen) insPs.run(pid, c.id, c.role, c.score, c.rank);
    return json({ success: true, plan, projectId: pid });
  },
  { auth: true },
);