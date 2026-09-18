import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// 底层业务数据库（嵌入式 SQLite，可部署、支持索引与 JSON 查询）。
// 存放位置：项目 data/scout.db，首次访问时自动建表并灌入新加坡/香港选址领域数据。
// 注意：新加坡数据为面向选址工作的"代理指标 + 已标注来源/置信度"种子（生产环境接入
// 真实数据源后替换，见 src/lib/sources/* 与 AGENTS.md）。

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'scout.db');

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

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

// ---------- DDL ----------
function ensureSchema(db: Database.Database) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS markets (
    code TEXT PRIMARY KEY,
    name_zh TEXT NOT NULL,
    name_en TEXT NOT NULL,
    currency TEXT NOT NULL,
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scout_districts (
    id INTEGER PRIMARY KEY,
    market_code TEXT NOT NULL REFERENCES markets(code),
    area_key TEXT NOT NULL,
    name TEXT NOT NULL,
    district_type TEXT NOT NULL,
    region TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    components TEXT NOT NULL,   -- json {transit,commercial,young,resident,tourism} 0..1
    metrics TEXT NOT NULL,      -- json {population,traffic,competitors,commercial}
    audience TEXT NOT NULL,     -- json {resident,office,young,tourist} %
    confidence TEXT NOT NULL,   -- A/B/C/D
    sources TEXT NOT NULL,      -- json [{name,kind,date,method,url}]
    evidence TEXT NOT NULL,     -- json [string]
    rank INTEGER NOT NULL,
    active_score REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scout_mkt ON scout_districts(market_code, rank);

  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY,
    market_code TEXT NOT NULL,
    area_key TEXT NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    note TEXT NOT NULL,
    created_by TEXT NOT NULL,
    saved_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cand_mkt ON candidates(market_code);

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
    at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
  `);
}

// ---------- 来源（数据溯源，供证据卡展示） ----------
const SRC = {
  lta: { name: 'LTA 轨道交通客运量', kind: '官方统计', date: '近月', method: '站点进出站量月度数据', url: 'https://www.lta.gov.sg/' },
  singstat: { name: 'SingStat 人口与年龄', kind: '官方统计', date: '低频更新', method: '规划区/子区人口结构', url: 'https://www.singstat.gov.sg/' },
  osm: { name: 'OpenStreetMap 设施/道路', kind: '开放数据', date: '持续更新', method: 'POI 与道路网格', url: 'https://www.openstreetmap.org/' },
  places: { name: 'Google Places 竞品核验', kind: '地点 API', date: '按需缓存', method: '服务端查询 + 归属展示', url: 'https://maps.google.com/' },
};

// 商圈类型的基础成分锚点（0..1 代理强度），再叠加确定性扰动
const TYPE_BASE: Record<string, { transit: number; commercial: number; young: number; resident: number; tourism: number }> = {
  '核心商业': { transit: 0.9, commercial: 0.92, young: 0.8, resident: 0.4, tourism: 0.72 },
  办公: { transit: 0.8, commercial: 0.6, young: 0.5, resident: 0.3, tourism: 0.4 },
  社区: { transit: 0.55, commercial: 0.58, young: 0.5, resident: 0.92, tourism: 0.22 },
  旅游: { transit: 0.62, commercial: 0.72, young: 0.6, resident: 0.25, tourism: 1 },
};

// 评分公式（方案原文）：综合活跃度 = 0.35*交通 + 0.25*商业 + 0.15*办公教育 + 0.15*居民年轻 + 0.10*游客
function activeScore(c: { transit: number; commercial: number; young: number; resident: number; tourism: number }) {
  return Math.round((0.35 * c.transit + 0.25 * c.commercial + 0.15 * c.young + 0.15 * c.resident + 0.1 * c.tourism) * 100);
}

type RawDistrict = [string, string, string, number, number, string]; // key, name, region, lat, lng, part

const SG_DISTRICTS: RawDistrict[] = [
  ['orchard', 'Orchard / Somerset', '中央区', 1.3039, 103.8318, '核心商业'],
  ['bugis', 'Bugis / City Hall', '中央区', 1.2988, 103.8552, '核心商业'],
  ['raffles', 'Raffles Place', '中央区', 1.2837, 103.8515, '办公'],
  ['marina', 'Marina Bay', '中央区', 1.2827, 103.8608, '旅游'],
  ['tanjong', 'Tanjong Pagar', '中央区', 1.2764, 103.8464, '办公'],
  ['payalebar', 'Paya Lebar', '东部', 1.3182, 103.8929, '核心商业'],
  ['jurong', 'Jurong East', '西部', 1.3332, 103.7422, '核心商业'],
  ['tampines', 'Tampines Central', '东部', 1.3532, 103.9451, '社区'],
  ['harbour', 'HarbourFront', '南部', 1.2644, 103.8221, '旅游'],
  ['chinatown', 'Chinatown', '中央区', 1.2837, 103.8434, '旅游'],
  ['novena', 'Novena', '中央区', 1.3203, 103.8439, '社区'],
  ['holland', 'Holland Village', '西南部', 1.3112, 103.7962, '社区'],
  ['katong', 'Katong / Marine Parade', '东南部', 1.3021, 103.9046, '社区'],
  ['serangoon', 'Serangoon Central', '东北部', 1.3508, 103.8722, '社区'],
  ['clarkequay', 'Clarke Quay', '中央区', 1.2897, 103.8464, '旅游'],
  ['bishan', 'Bishan', '中部', 1.3509, 103.8485, '社区'],
  ['buona', 'Buona Vista', '西南部', 1.3073, 103.79, '办公'],
  ['littleindia', 'Little India', '中央区', 1.3066, 103.8494, '旅游'],
  ['toapayoh', 'Toa Payoh', '中部', 1.3326, 103.8474, '社区'],
  ['bedok', 'Bedok Central', '东部', 1.324, 103.9297, '社区'],
  ['clementi', 'Clementi', '西部', 1.315, 103.7652, '社区'],
  ['angmokio', 'Ang Mo Kio', '北部', 1.3697, 103.849, '社区'],
  ['changi', 'Jewel / Changi', '东部', 1.3602, 103.9895, '旅游'],
  ['woodlands', 'Woodlands Regional Centre', '北部', 1.436, 103.7865, '社区'],
  ['sentosa', 'Sentosa', '南部', 1.2517, 103.8238, '旅游'],
];

const HK_DISTRICTS: RawDistrict[] = [
  ['central', '中环 Central', '香港岛', 22.2819, 114.158, '核心商业'],
  ['wanchai', '湾仔 Wan Chai', '香港岛', 22.2763, 114.1727, '办公'],
  ['cwb', '铜锣湾 Causeway Bay', '香港岛', 22.2802, 114.1836, '核心商业'],
  ['tsimshatsui', '尖沙咀 Tsim Sha Tsui', '九龙', 22.2977, 114.1723, '旅游'],
  ['mongkok', '旺角 Mong Kok', '九龙', 22.3214, 114.17, '核心商业'],
  ['kwuntong', '观塘 Kwun Tong', '九龙东', 22.3126, 114.2257, '社区'],
  ['shatin', '沙田 Sha Tin', '新界', 22.3823, 114.198, '社区'],
  ['tsuenwan', '荃湾 Tsuen Wan', '新界', 22.3707, 114.1135, '社区'],
];

function buildDistrict(d: RawDistrict): DistrictSeed {
  const [key, name, region, lat, lng, type] = d;
  const rnd = mulberry32(key.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0));
  const base = TYPE_BASE[type] || TYPE_BASE['社区'];
  const vary = (v: number, amp = 0.14) => Math.max(0.15, Math.min(1, v * (1 - amp / 2) + rnd() * amp));
  const components = {
    transit: vary(base.transit),
    commercial: vary(base.commercial),
    young: vary(base.young),
    resident: vary(base.resident),
    tourism: vary(base.tourism, 0.1),
  };
  const score = activeScore(components);
  const r2 = mulberry32(score * 31 + key.length);
  const mult = 1 + key.length * 0.001;
  const population = (18 + score * 0.22 + r2() * 14) * mult;
  const traffic = (1.1 + score * 0.045 + r2() * 1.1) * mult;
  const competitors = Math.round(8 + score * 0.4 + r2() * 14);
  const commercial = Math.round(46 + score * 1.5 + r2() * 30);
  const metrics = { population, traffic, competitors, commercial };
  const office = Math.min(52, 18 + components.young * 22 + r2() * 14);
  const young = Math.min(48, 16 + components.young * 20 + r2() * 12);
  const resident0 = Math.min(55, 20 + components.resident * 30);
  let tourist = Math.max(0, 100 - office - young - resident0);
  let resident = resident0;
  if (tourist < 6) {
    resident -= 6 - tourist;
    tourist = 6;
  }
  const audience = {
    resident: Math.round(resident),
    office: Math.round(office),
    young: Math.round(young),
    tourist: Math.round(100 - resident - office - young - (100 - resident - office - young) + tourist),
  };
  audience.tourist = Math.round(100 - audience.resident - audience.office - audience.young);
  const reasons: string[] = [];
  if (components.transit >= 0.75) reasons.push('轨道交通与换乘客流强，适合高频即饮消费');
  else reasons.push('交通条件中等，需核验步行路径与入口可见度');
  if (components.commercial >= 0.75) reasons.push('商业设施与消费场景密集，全天候需求较稳定');
  else reasons.push('商业密度非主要优势，应更关注社区复购');
  if (components.tourism >= 0.6) reasons.push('旅游吸引点明显，但淡旺季波动需现场验证');
  else reasons.push('游客贡献有限，主要依赖居民与办公客群');
  return {
    area_key: key,
    name,
    district_type: type,
    region,
    lat,
    lng,
    components,
    metrics,
    audience,
    confidence: type === '旅游' ? 'C' : 'B',
    sources: [SRC.singstat, SRC.lta, SRC.osm, SRC.places],
    evidence: reasons,
    active_score: score,
  };
}

interface DistrictSeed {
  area_key: string;
  name: string;
  district_type: string;
  region: string;
  lat: number;
  lng: number;
  components: { transit: number; commercial: number; young: number; resident: number; tourism: number };
  metrics: { population: number; traffic: number; competitors: number; commercial: number };
  audience: { resident: number; office: number; young: number; tourist: number };
  confidence: string;
  sources: { name: string; kind: string; date: string; method: string; url: string }[];
  evidence: string[];
  active_score: number;
}

function seedIfEmpty(db: Database.Database) {
  const cnt = (db.prepare('SELECT COUNT(*) c FROM markets').get() as { c: number }).c;
  if (cnt > 0) return;

  const now = Date.now();
  const insMarket = db.prepare('INSERT INTO markets (code,name_zh,name_en,currency,center_lat,center_lng) VALUES (?,?,?,?,?,?)');
  insMarket.run('SG', '新加坡', 'Singapore', 'SGD', 1.3521, 103.8198);
  insMarket.run('HK', '香港', 'Hong Kong', 'HKD', 22.3193, 114.1694);

  const insDistrict = db.prepare(
    `INSERT INTO scout_districts
      (market_code,area_key,name,district_type,region,lat,lng,components,metrics,audience,confidence,sources,evidence,rank,active_score,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insCandidate = db.prepare(
    'INSERT INTO candidates (market_code,area_key,name,lat,lng,note,created_by,saved_at) VALUES (?,?,?,?,?,?,?,?)'
  );

  const sg = SG_DISTRICTS.map(buildDistrict);
  sg.sort((a, b) => b.active_score - a.active_score);
  sg.forEach((d, i) => {
    insDistrict.run(
      'SG', d.area_key, d.name, d.district_type, d.region, d.lat, d.lng,
      JSON.stringify(d.components), JSON.stringify(d.metrics), JSON.stringify(d.audience),
      d.confidence, JSON.stringify(d.sources), JSON.stringify(d.evidence), i + 1, d.active_score, now
    );
  });

  const hk = HK_DISTRICTS.map(buildDistrict);
  hk.sort((a, b) => b.active_score - a.active_score);
  hk.forEach((d, i) => {
    insDistrict.run(
      'HK', d.area_key, d.name, d.district_type, d.region, d.lat, d.lng,
      JSON.stringify(d.components), JSON.stringify(d.metrics), JSON.stringify(d.audience),
      d.confidence, JSON.stringify(d.sources), JSON.stringify(d.evidence), i + 1, d.active_score, now
    );
  });

  // 预置 1-2 个已保存候选（演示候选工作流）
  const demoCand = sg[1];
  insCandidate.run('SG', demoCand.area_key, demoCand.name + ' · 建议点位', demoCand.lat, demoCand.lng, '高客流交汇口，适合标准店首铺', 'admin', now);

  // 管理员（与 auth.cjs 使用同一定位：sha256(raw + ':gris')）
  db.prepare('INSERT INTO users (username,password_hash,role) VALUES (?,?,?)').run(
    'admin',
    sha256('gris-admin-2024' + ':gris'),
    'ADMIN'
  );
}