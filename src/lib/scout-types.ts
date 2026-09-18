// GRIS 纯共享类型（client/server 通用；严禁 import better-sqlite3 / db.ts / scout.ts）

export type MarketCode = 'SG' | 'HK';

export interface Market {
  code: MarketCode;
  name: string;
}

export interface TradeAreaStats {
  radius: number;
  population: number;
  traffic: number;
  competitors: number;
  commercial: number;
  method: string;
  sampledDistricts: number;
  coveredRate: number;
  sampledCells: number;
  proxy: boolean;
}

export type DataStatus = 'real' | 'historical' | 'proxy' | 'mixed' | 'unavailable';

/**
 * 每个指标完整数据血缘（Truth Layer 每层必须能回答：
 * 来源 / 日期 / 粒度 / 方法 / 置信度 / 缺失说明 / 数据版本）。
 * status 诚实标识：real/historical/proxy/mixed/unavailable，禁止无 key 时伪装 real。
 */
export interface DataProvenance {
  status: DataStatus;
  source_name: string;
  source_url?: string;
  source_date?: string;
  data_version?: string;
  ingested_at?: number;
  method: string;
  spatial_granularity?: string;
  confidence_score?: number;
  confidence_reason?: string;
  missing_note?: string;
  // ---- 兼容旧 Evidence 渲染字段 ----
  actualSource?: string;
  futureSource?: string;
  date?: string;
  coverage?: string;
  confidence?: string;
}

export type ComponentKey = 'transit' | 'commercial' | 'young' | 'resident' | 'tourism';

export interface District {
  area_key: string;
  name: string;
  district_type: string;
  region: string;
  lat: number;
  lng: number;
  components: Record<string, number>;
  metrics: {
    population: number;
    traffic: number;
    competitors: number;
    commercial: number;
  };
  identity: { resident: number; office: number; tourist: number; student: number; other: number };
  age: { a18_24: number; a25_34: number; a35_44: number; a45_plus: number };
  confidence: string;
  sources: { name: string; status?: DataStatus; kind?: string; date?: string; method?: string; url?: string }[];
  indicatorMeta: Record<ComponentKey, DataProvenance>;
  evidence: string[];
  rank: number;
  active_score: number;
  model_version?: string;
  opportunity_index?: number;
}

export interface GridCell {
  lat: number;
  lng: number;
  val: number;
  near?: string;
}

/** Street Heat 连续热面单元（/api/scout/heat 返回） */
export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
  provider: 'real' | 'demo';
}

/** 任意点分析（/api/scout/point）返回值之一 */
export interface PointAnalysis {
  market: MarketCode;
  lat: number;
  lng: number;
  subzone: string | null;
  district_key: string | null;
  nearest_transit: { name: string; distance_m: number; tap: number | null } | null;
  cell: { id: string; values: Record<ComponentKey, number> } | null;
  nearby: { provider: string; name: string; category: string; distance_m: number }[];
  provenance: Record<ComponentKey, DataProvenance>;
}

export interface Candidate {
  id: number;
  market_code: string;
  area_key: string;
  name: string;
  lat: number;
  lng: number;
  note: string;
  created_by: string;
  saved_at: number;
}