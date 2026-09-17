import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// 底层业务数据库（嵌入式 SQLite，可部署、支持索引与 JSON 查询）。
// 文件存放于项目 data/ 目录，首次访问时自动建表并灌入 HK/SG 示意业务数据。

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'gris.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  ensureSchema(_db);
  seedIfEmpty(_db);
  return _db;
}

// ---------- 确定性伪随机（保证每次生成一致，便于演示与回归） ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// ---------- DDL ----------
function ensureSchema(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS markets (
    code TEXT PRIMARY KEY,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    currency TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY,
    market_code TEXT NOT NULL REFERENCES markets(code),
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    center_x REAL NOT NULL,
    center_y REAL NOT NULL,
    area_sqm REAL NOT NULL,
    residential_pop INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_zones_mkt ON zones(market_code);

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY,
    market_code TEXT NOT NULL REFERENCES markets(code),
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    name_zh TEXT NOT NULL,
    site_type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    sqm REAL NOT NULL,
    monthly_rent REAL NOT NULL,
    competitor_count INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sites_mkt ON sites(market_code, zone_id);

  CREATE TABLE IF NOT EXISTS foot_traffic (
    id INTEGER PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id),
    day_type TEXT NOT NULL,
    hour INTEGER NOT NULL,
    volume INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ft_site ON foot_traffic(site_id);

  CREATE TABLE IF NOT EXISTS customer_zone (
    id INTEGER PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    premium_share REAL NOT NULL,
    age_18_24 REAL NOT NULL,
    age_25_34 REAL NOT NULL,
    age_35_44 REAL NOT NULL,
    age_45_plus REAL NOT NULL,
    income_high_share REAL NOT NULL,
    office_ratio REAL NOT NULL,
    student_ratio REAL NOT NULL,
    tourist_ratio REAL NOT NULL,
    tea_affinity REAL NOT NULL,
    avg_basket REAL NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cz_zone ON customer_zone(zone_id);

  CREATE TABLE IF NOT EXISTS districts (
    id INTEGER PRIMARY KEY,
    market_code TEXT NOT NULL REFERENCES markets(code),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    params TEXT NOT NULL,
    boundary TEXT NOT NULL,
    metrics TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    market_code TEXT NOT NULL REFERENCES markets(code),
    name TEXT NOT NULL,
    target_stores INTEGER NOT NULL,
    strategy TEXT NOT NULL,
    min_spacing REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLANNING',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_sites (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    site_id INTEGER NOT NULL REFERENCES sites(id),
    role TEXT NOT NULL,
    score REAL NOT NULL,
    rank INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ps_proj ON project_sites(project_id);

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    actor TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    ip TEXT NOT NULL,
    at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
  `);
}

// ---------- 示意业务数据 ----------
function seedIfEmpty(db: Database.Database) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM markets').get() as { c: number };
  if (row.c > 0) return;

  const mk = db.prepare('INSERT INTO markets (code,name_zh,name_en,currency) VALUES (?,?,?,?)');
  const mkMarkets = () => {
    mk.run('HK', '香港', 'Hong Kong', 'HKD');
    mk.run('SG', '新加坡', 'Singapore', 'SGD');
  };
  mkMarkets();

  const inZone = db.prepare(
    'INSERT INTO zones (market_code,name_zh,name_en,center_x,center_y,area_sqm,residential_pop) VALUES (?,?,?,?,?,?,?)',
  );
  const inSite = db.prepare(
    `INSERT INTO sites
      (market_code,zone_id,name_zh,site_type,x,y,lat,lng,sqm,monthly_rent,competitor_count)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const inFt = db.prepare(
    'INSERT INTO foot_traffic (site_id,day_type,hour,volume) VALUES (?,?,?,?)',
  );
  const inCust = db.prepare(
    `INSERT INTO customer_zone
      (zone_id,premium_share,age_18_24,age_25_34,age_35_44,age_45_plus,
       income_high_share,office_ratio,student_ratio,tourist_ratio,tea_affinity,avg_basket)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );

  const now = Date.now();
  const inDistrict = db.prepare(
    'INSERT INTO districts (market_code,name,status,params,boundary,metrics,created_at) VALUES (?,?,?,?,?,?,?)',
  );
  const inProject = db.prepare(
    'INSERT INTO projects (market_code,name,target_stores,strategy,min_spacing,status,created_at) VALUES (?,?,?,?,?,?,?)',
  );
  const inProjSite = db.prepare(
    'INSERT INTO project_sites (project_id,site_id,role,score,rank) VALUES (?,?,?,?,?)',
  );
  const inUser = db.prepare('INSERT INTO users (username,password_hash,role) VALUES (?,?,?)');

  // 各市场城市单元（中心坐标映射到 0..100 归一画布）
  const HK_ZONES: [string, string, number, number, number, number][] = [
    ['中环', 'Central', 28, 18, 1400000, 32000],
    ['湾仔', 'Wan Chai', 40, 20, 980000, 18000],
    ['铜锣湾', 'Causeway Bay', 46, 30, 780000, 26000],
    ['尖沙咀', 'Tsim Sha Tsui', 34, 38, 1050000, 42000],
    ['旺角', 'Mong Kok', 44, 52, 640000, 68000],
    ['九龙湾/观塘', 'Kowloon Bay / Kwun Tong', 58, 48, 1130000, 22000],
    ['沙田', 'Sha Tin', 74, 66, 930000, 155000],
    ['荃湾', 'Tsuen Wan', 44, 78, 760000, 142000],
  ];
  const SG_ZONES: [string, string, number, number, number, number][] = [
    ['乌节', 'Orchard', 40, 26, 1600000, 9000],
    ['滨海湾', 'Marina Bay', 44, 40, 2100000, 5000],
    ['牛车水', 'Chinatown', 46, 52, 620000, 68000],
    ['武吉士', 'Bugis', 48, 20, 1360000, 11000],
    ['大巴窑', 'Toa Payoh', 58, 44, 1040000, 101000],
    ['裕廊东', 'Jurong East', 24, 58, 1520000, 88000],
    ['淡滨尼', 'Tampines', 74, 48, 1280000, 96000],
    ['兀兰', 'Woodlands', 48, 72, 980000, 92000],
  ];

  const SITE_TYPES = ['MTR', 'MALL', 'STREET', 'OFFICE', 'RESIDENCE', 'TOURIST'] as const;

  function buildMarket(marketCode: 'HK' | 'SG', zonesList: typeof HK_ZONES, currency: number) {
    const rng = mulberry32(marketCode === 'HK' ? 20240101 : 20240102);
    const latBase = marketCode === 'HK' ? 22.32 : 1.325;
    const lngBase = marketCode === 'HK' ? 114.16 : 103.82;
    const rentBase = currency;
    const zoneIds: number[] = [];
    zonesList.forEach((z) => {
      const info = inZone.run(marketCode, z[0], z[1], z[2], z[3], z[4], z[5]);
      zoneIds.push(Number(info.lastInsertRowid));
    });

    let siteSeq = '';
    zoneIds.forEach((zid, zi) => {
      const [zname, znameEn, cx, cy] = [zonesList[zi][0], zonesList[zi][1], zonesList[zi][2], zonesList[zi][3]];
      const typePick = SITE_TYPES[Math.floor(rng() * SITE_TYPES.length)];
      // 每个 zone 生成 5 个点位，围绕中心散开
      for (let i = 0; i < 5; i++) {
        const x = Math.max(2, Math.min(98, cx + (rng() - 0.5) * 22));
        const y = Math.max(2, Math.min(98, cy + (rng() - 0.48) * 22));
        const typeIdx = Math.floor(rng() * SITE_TYPES.length);
        const type = typeIdx === 0 ? typePick : SITE_TYPES[typeIdx];
        const sqm = Math.round(18 + rng() * 85);
        const monthly_rent = Math.round(
          rentBase * (14 + rng() * 70) * (type === 'MALL' || type === 'MTR' ? 1.6 : 1),
        );
        const competitor = Math.floor(rng() * 7);
        const lat = +(latBase + (y - 50) * 0.012).toFixed(5);
        const lng = +(lngBase + (x - 50) * 0.014).toFixed(5);
        const name = `${zname}${['站前店', '广场店', '主街店', '写字楼店', '社区店'][i]}-${marketCode}`;
        const info = inSite.run(marketCode, zid, name, type, +x.toFixed(2), +y.toFixed(2), lat, lng, sqm, monthly_rent, competitor);
        const sid = Number(info.lastInsertRowid);
        siteSeq += (siteSeq ? ',' : '') + String(sid);
        // 分时人流：weekday 通勤峰 & 午峰；weekend 午后平峰
        const peakHour = type === 'MALL' || type === 'STREET' ? 19 : type === 'OFFICE' ? 13 : 9;
        for (let day = 0; day < 2; day++) {
          const dayType = day === 0 ? 'WEEKDAY' : 'WEEKEND';
          for (let h = 0; h < 24; h++) {
            let base = 120 + rng() * 260;
            if (dayType === 'WEEKDAY') {
              if (h === 8 || h === 9 || h === 18 || h === 19) base *= 2.2 + rng();
              if (h === 13) base *= 1.6;
              if (h >= 23 || h <= 6) base *= 0.12;
            } else {
              if (h >= 12 && h <= 20) base *= 1.9 + rng() * 0.4;
              if (h >= 23 || h <= 7) base *= 0.1;
              if (type === 'MALL') base *= 1.5;
            }
            inFt.run(sid, dayType, h, Math.round(base));
          }
        }
      }
    });

    // 客群画像（按 zone）——tea_affinity 越接近 1 越适合茶饮
    zoneIds.forEach((zid, zi) => {
      const incomeH = 0.18 + rng() * 0.42;
      const premium = Math.min(0.92, incomeH * (0.6 + rng() * 0.6));
      const a18 = 0.22 + rng() * 0.28;
      const a25 = 0.24 + rng() * 0.3;
      const a35 = 0.18 + rng() * 0.22;
      const a45 = Math.max(0.05, 1 - a18 - a25 - a35 - rng() * 0.1);
      const tourist = zi === 0 || zi === 2 ? 0.25 + rng() * 0.2 : rng() * 0.18;
      const office = 0.2 + rng() * 0.4;
      const student = 0.08 + rng() * 0.2;
      const affinity =
        Math.min(
          0.97,
          Math.max(0.24, 0.42 + (incomeH - 0.4) * 0.35 + a25 * 0.5 + (zi % 2 === 0 ? 0.08 : 0)),
        );
      inCust.run(
        zid,
        +premium.toFixed(3),
        +a18.toFixed(3),
        +a25.toFixed(3),
        +a35.toFixed(3),
        +a45.toFixed(3),
        +incomeH.toFixed(3),
        +office.toFixed(3),
        +student.toFixed(3),
        +tourist.toFixed(3),
        +affinity.toFixed(3),
        +Math.round(rentBase * (3 + rng() * 3)),
      );
    });

    // 预置一份默认商圈划定结果（作为首页/演示基线）
    const districts = marketCode === 'HK'
      ? [['尖沙咀-旺角', '中环-湾仔'], ['铜锣湾'], ['沙田', '荃湾']]
      : [['乌节-武吉士'], ['滨海湾-牛车水'], ['淡滨尼'], ['裕廊东']];
    districts.forEach((names) => {
      const ids = idsByNames(marketCode, names as string[]);
      if (!ids.length) return;
      let name = '初步商圈 · ' + names.join(' / ');
      const params = JSON.stringify({ flowThreshold: 500, minSites: 3 });
      const boundary = JSON.stringify(ids);
      const metrics = JSON.stringify({
        avgPeakFlow: Math.round(420 + rng() * 400),
        siteCount: ids.length,
        zoneCount: 1,
        coveragePop: 40000 + Math.round(rng() * 90000),
      });
      inDistrict.run(marketCode, name, 'APPROVED', params, boundary, metrics, now - Math.round(rng() * 80000000));
    });

    // 预置一份默认项目规划
    const targets = marketCode === 'HK' ? 6 : 5;
    const strategy = 'EXPANSION';
    const siteIds = siteSeq.split(',').map(Number);
    const picked = [...siteIds].sort((a, b) => a - b).slice(0, targets);
    let projName = marketCode === 'HK' ? '香港首期网络拓展计划' : '新加坡首期网络拓展计划';
    const pj = inProject.run(marketCode, projName, targets, strategy, 1.5, 'PLANNING', now);
    const pid = Number(pj.lastInsertRowid);
    picked.forEach((s, i) => {
      const role = i === 0 ? 'FLAGSHIP' : i < 3 ? 'PREMIUM' : 'STANDARD';
      inProjSite.run(pid, s, role, +(95 - i * 4).toFixed(1), i + 1);
    });
    return siteSeq;
  }

  function idsByNames(marketCode: string, zoneNames: string[]): number[] {
    const all = buildMarketSiteIds(marketCode);
    return all.filter((s) => zoneNames.some((n) => s.zoneName.includes(n))).map((s) => s.id);
  }

  function buildMarketSiteIds(marketCode: string): { id: number; zoneName: string }[] {
    const rows = db
      .prepare(
        `SELECT s.id AS id, z.name_zh AS zoneName FROM sites s JOIN zones z ON z.id=s.zone_id
         WHERE s.market_code=? ORDER BY s.id`,
      )
      .all(marketCode) as { id: number; zoneName: string }[];
    return rows;
  }

  buildMarket('HK', HK_ZONES, 8); // HKD 租金基准
  buildMarket('SG', SG_ZONES, 12); // SGD 租金基准

  // 默认管理员账号（密码可经环境变量覆盖）
  const defaultPass = process.env.GRIS_ADMIN_PASSWORD || 'gris-admin-2024';
  inUser.run('admin', sha256(defaultPass + ':gris'), 'ADMIN');
}