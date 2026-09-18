// 纯类型定义（client 与 server 共用，不引入任何 Node 依赖）
export interface District {
  area_key: string;
  name: string;
  district_type: string;
  region: string;
  lat: number;
  lng: number;
  components: Record<string, number>;
  metrics: Record<string, number>;
  audience: Record<string, number>;
  confidence: string;
  sources: { name: string; kind: string; date: string; method: string; url: string }[];
  evidence: string[];
  rank: number;
  active_score: number;
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