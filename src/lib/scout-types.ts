// 纯类型定义（client 与 server 共用，不引入任何 Node 依赖）
export interface IndicatorMeta {
  source: string;
  date: string;
  method: string;
  coverage: string;
  confidence: string;
}

export interface District {
  area_key: string;
  name: string;
  district_type: string;
  region: string;
  lat: number;
  lng: number;
  components: Record<string, number>;
  metrics: Record<string, number>;
  // 两组独立的人群结构，各自求和=100%，均非负
  identity: { resident: number; office: number; tourist: number; student: number; other: number };
  age: { a18_24: number; a25_34: number; a35_44: number; a45_plus: number };
  confidence: string;
  sources: { name: string; kind: string; date: string; method: string; url: string }[];
  indicatorMeta: Record<string, IndicatorMeta>;
  evidence: string[];
  rank: number;
  active_score: number;
}

export interface TradeAreaStats {
  radius: number;
  population: number;
  traffic: number;
  competitors: number;
  commercial: number;
  method: string;
  // 半径内实际纳入聚合的周边商圈（体现空间非均匀，而非线性缩放）
  sampledDistricts: number;
  coveredRate: number; // 0..1 该半径覆盖的商圈密度
}

export interface Market {
  code: string;
  name_zh: string;
  name_en: string;
  currency: string;
  center_lat: number;
  center_lng: number;
}

export interface GridCell {
  lat: number;
  lng: number;
  val: number;
  near?: string;
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