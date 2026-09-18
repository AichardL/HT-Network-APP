// 纯类型定义（client 与 server 共用，不引入任何 Node 依赖）
export interface IndicatorMeta {
  // 血缘完整性：数据状态 / 实际来源 / 未来来源 / 计算方法 / 数据日期 / 覆盖率 / 置信度
  status: 'real' | 'proxy' | 'demo';
  actualSource: string; // 当前真正参与计算的数据源（代理/演示阶段为空）
  futureSource: string; // 该指标计划接入的真实数据源
  source: string; // 展示用来源名（代理阶段=演示标注，仅作说明）
  date: string;
  method: string; // 当前实际的计算方法（必须如实，禁止装成真实统计）
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
  // 参与积分的密度网格单元数；proxy=true 表示基于代理密度面而非真实 POI 落点
  sampledCells: number;
  proxy: boolean;
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