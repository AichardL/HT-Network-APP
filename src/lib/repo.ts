import { getDb } from './db';

export interface Site {
  id: number;
  market_code: string;
  zone_id: number;
  name_zh: string;
  site_type: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  sqm: number;
  monthly_rent: number;
  competitor_count: number;
}

export interface Zone {
  id: number;
  market_code: string;
  name_zh: string;
  name_en: string;
  center_x: number;
  center_y: number;
  area_sqm: number;
  residential_pop: number;
}

export function listMarkets() {
  return getDb().prepare('SELECT code,name_zh,name_en,currency FROM markets ORDER BY code').all();
}

export function listZones(marketCode: string): Zone[] {
  return getDb()
    .prepare('SELECT * FROM zones WHERE market_code=? ORDER BY id')
    .all(marketCode) as unknown as Zone[];
}

export function listSites(marketCode: string): Site[] {
  return getDb()
    .prepare('SELECT * FROM sites WHERE market_code=? ORDER BY id')
    .all(marketCode) as unknown as Site[];
}

export function listAllSites(): Site[] {
  return getDb().prepare('SELECT * FROM sites ORDER BY id').all() as unknown as Site[];
}

export function customerByZone(zoneIds: number[]) {
  if (zoneIds.length === 0) return [];
  const ph = zoneIds.map(() => '?').join(',');
  return getDb()
    .prepare(`SELECT * FROM customer_zone WHERE zone_id IN (${ph})`)
    .all(...zoneIds) as unknown as Record<string, number>[];
}

// 人流分时序列（聚合到小时）——支持查询高效（site 索引）
export function footTrafficSeries(siteIds: number[], dayType: 'WEEKDAY' | 'WEEKEND' = 'WEEKDAY') {
  if (siteIds.length === 0) return [];
  const ph = siteIds.map(() => '?').join(',');
  return getDb()
    .prepare(
      `SELECT hour, ROUND(AVG(volume)) AS volume FROM foot_traffic
       WHERE site_id IN (${ph}) AND day_type=? GROUP BY hour ORDER BY hour`,
    )
    .all(...siteIds, dayType);
}

// 每个点位的日均/高峰人流汇总
export function siteFlowSummary(marketCode: string): Record<number, number> {
  const rows = getDb()
    .prepare(
      `SELECT ft.site_id AS site_id, MAX(ft.volume) AS peak
       FROM foot_traffic ft JOIN sites s ON s.id=ft.site_id
       WHERE s.market_code=? GROUP BY ft.site_id`,
    )
    .all(marketCode) as { site_id: number; peak: number }[];
  const map: Record<number, number> = {};
  for (const r of rows) map[r.site_id] = r.peak;
  return map;
}

export function siteHourlyBySite(siteId: number, dayType: 'WEEKDAY' | 'WEEKEND') {
  return getDb()
    .prepare(
      'SELECT hour, volume FROM foot_traffic WHERE site_id=? AND day_type=? ORDER BY hour',
    )
    .all(siteId, dayType) as { hour: number; volume: number }[];
}

// 客流总量（每日人次，近似）
export function siteDailyFlow(siteId: number, dayType: 'WEEKDAY' | 'WEEKEND') {
  const row = getDb()
    .prepare(
      'SELECT SUM(volume) AS total FROM foot_traffic WHERE site_id=? AND day_type=?',
    )
    .get(siteId, dayType) as { total: number };
  return row.total;
}

// 全市场点位类型分布
export function siteTypeDistribution(marketCode: string) {
  return getDb()
    .prepare(
      `SELECT site_type AS type, COUNT(*) AS count FROM sites WHERE market_code=? GROUP BY site_type`,
    )
    .all(marketCode) as { type: string; count: number }[];
}

export function auditToday() {
  const dayStart = Date.now() - 86400000;
  return getDb()
    .prepare('SELECT COUNT(*) AS c FROM audit_log WHERE at > ?')
    .get(dayStart) as { c: number };
}

export function recentAudits(limit = 30) {
  return getDb()
    .prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?')
    .all(limit);
}

export function listDistricts(marketCode?: string) {
  if (marketCode) {
    return getDb()
      .prepare('SELECT * FROM districts WHERE market_code=? ORDER BY id DESC')
      .all(marketCode) as unknown as Record<string, unknown>[];
  }
  return getDb().prepare('SELECT * FROM districts ORDER BY id DESC').all() as unknown as Record<string, unknown>[];
}

export function listProjects(marketCode?: string) {
  if (marketCode) {
    return getDb()
      .prepare('SELECT * FROM projects WHERE market_code=? ORDER BY id DESC')
      .all(marketCode) as unknown as Record<string, unknown>[];
  }
  return getDb().prepare('SELECT * FROM projects ORDER BY id DESC').all() as unknown as Record<string, unknown>[];
}

export function projectSites(projectId: number) {
  return getDb()
    .prepare(
      `SELECT ps.project_id, ps.site_id, ps.role, ps.score, ps.rank, s.*
       FROM project_sites ps JOIN sites s ON s.id=ps.site_id
       WHERE ps.project_id=? ORDER BY ps.rank`,
    )
    .all(projectId);
}