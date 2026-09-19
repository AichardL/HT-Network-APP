'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Play, Download, Map as MapIcon, Flame, Train, CupSoda, CircleDot, Search, Save, Trash2,
} from 'lucide-react';
import { useMarket } from '@/components/app-shell';
import type { District, Candidate, TradeAreaStats, PointAnalysis } from '@/lib/scout-types';
import type { Poi } from '@/lib/sources/places';
import type { CatchmentResult } from '@/lib/spatial/catchment';

const ScoutMap = dynamic(() => import('@/components/map/scout-map'), { ssr: false });

const THEMES = [
  { key: 'overall', label: '综合活跃度' },
  { key: 'transit', label: '交通人流' },
  { key: 'commercial', label: '商业密度' },
  { key: 'young', label: '年轻客群' },
  { key: 'resident', label: '社区消费' },
  { key: 'tourism', label: '游客潜力' },
];

const TYPE_COLORS: Record<string, string> = {
  '核心商业': '#111111',
  办公: '#3f3f46',
  社区: '#6b7280',
  旅游: '#9ca3af',
};

// 主题 → 分量：主题分析应使用对应分量的原始强度（0-100），并在市域内重排，而非一直用综合活跃度/全局排名
const THEME_COMP: Record<string, string> = {
  transit: 'transit', commercial: 'commercial', young: 'young', resident: 'resident', tourism: 'tourism',
};

function themeInfo(
  d: District,
  t: string,
  list: District[],
): { score: number; label: string; rank: number } {
  if (t === 'overall') return { score: d.active_score, label: '综合活跃度', rank: d.rank };
  const c = THEME_COMP[t];
  const comp = (d.components[c] ?? 0) * 100;
  const sorted = [...list].sort((a, b) => (b.components[c] ?? 0) - (a.components[c] ?? 0));
  const rank = sorted.findIndex((x) => x.area_key === d.area_key) + 1;
  return { score: Math.round(comp), label: THEMES.find((x) => x.key === t)?.label ?? '', rank };
}

export default function ScoutBoard() {
  const { market, api } = useMarket();
  const [theme, setTheme] = useState('overall');
  const [mode, setMode] = useState<'grid' | 'heat'>('heat');
  const [radius, setRadius] = useState(1000);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showTransit, setShowTransit] = useState(true);
  const [showPois, setShowPois] = useState(true);
  const [showShortlist, setShowShortlist] = useState(true);

  const [districts, setDistricts] = useState<District[]>([]);
  const [cells, setCells] = useState<{ lat: number; lng: number; val: number }[]>([]);
  const [heat, setHeat] = useState<{ lat: number; lng: number; intensity: number }[]>([]);
  const [heatMode, setHeatMode] = useState<'real' | 'demo'>('demo');
  const [view, setView] = useState<{ bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }; zoom: number } | null>(null);
  const [viewNonce, setViewNonce] = useState(0);
  const [selected, setSelected] = useState<District | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const [focusRadius, setFocusRadius] = useState(1);
  const [focusData, setFocusData] = useState<{ point: PointAnalysis; catchment: CatchmentResult } | null>(null);
  const [statusInfo, setStatusInfo] = useState<{ data_mode: string; live_layers: string[] } | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [placesEnabled, setPlacesEnabled] = useState(false);
  const [note, setNote] = useState('');
  const [ta, setTa] = useState<TradeAreaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const reqRef = useRef(0);

  useEffect(() => {
    let alive = true;
    api(`/api/scout/data-status?market=${market}`)
      .then((r) => r.json())
      .then((s) => alive && setStatusInfo(s as { data_mode: string; live_layers: string[] }))
      .catch(() => alive && setStatusInfo(null));
    return () => {
      alive = false;
    };
  }, [market, api]);

  const handlePlainClick = useCallback(
    async (latlng: { lat: number; lng: number }) => {
      setSelected(null);
      setFocus({ lat: latlng.lat, lng: latlng.lng, radius: focusRadius * 1000 });
      setFocusData(null);
      try {
        const [pt, ct] = await Promise.all([
          api(`/api/scout/point?market=${market}&lat=${latlng.lat}&lng=${latlng.lng}`).then((r) => r.json()),
          api(`/api/scout/catchment?market=${market}&lat=${latlng.lat}&lng=${latlng.lng}&radius=${focusRadius}`).then((r) => r.json()),
        ]);
        setFocusData({ point: pt as PointAnalysis, catchment: ct as CatchmentResult });
      } catch {
        setFocusData(null);
      }
    },
    [market, api, focusRadius],
  );

  const refetchFocus = useCallback(async () => {
    if (!focus) return;
    setFocus({ ...focus, radius: focusRadius * 1000 });
    try {
      const ct = await api(`/api/scout/catchment?market=${market}&lat=${focus.lat}&lng=${focus.lng}&radius=${focusRadius}`).then((r) => r.json());
      setFocusData((prev) => (prev ? { ...prev, catchment: ct as CatchmentResult } : prev));
    } catch {
      /* keep last */
    }
  }, [focus, focusRadius, market, api]);

  const loadDistricts = useCallback(async () => {
    setLoading(true);
    try {
      const d = await (await api(`/api/scout/districts?market=${market}`)).json();
      setDistricts((d as { districts: District[] }).districts);
      if (selected) setSelected((d as { districts: District[] }).districts.find((x) => x.area_key === selected.area_key) || null);
      else setSelected(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  useEffect(() => {
    loadDistricts();
    (async () => {
      const s = await (await api('/api/scout/boot')).json();
      setPlacesEnabled((s as { placesEnabled: boolean }).placesEnabled);
      const c = await (await api(`/api/scout/candidates?market=${market}`)).json();
      setCandidates((c as { candidates: Candidate[] }).candidates);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const id = ++reqRef.current;
    api(`/api/scout/grid?market=${market}&theme=${theme}`)
      .then((r) => r.json())
      .then((g) => {
        if (alive && id === reqRef.current) setCells((g as { cells: { lat: number; lng: number; val: number }[] }).cells);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [market, theme, api]);

  const handleView = useCallback((v: { bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }; zoom: number }) => {
    setView(v);
    setViewNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (mode !== 'heat' || !view) return;
    let alive = true;
    const b = view.bbox;
    const t = setTimeout(() => {
      api(
        `/api/scout/heat?market=${market}&zoom=${view.zoom}&theme=${theme}&minLat=${b.minLat}&maxLat=${b.maxLat}&minLng=${b.minLng}&maxLng=${b.maxLng}`,
      )
        .then((r) => r.json())
        .then((d) => {
          if (alive) {
            setHeat((d as { points: { lat: number; lng: number; intensity: number }[]; provider: 'real' | 'demo' }).points);
            setHeatMode((d as { provider: 'real' | 'demo' }).provider);
          }
        })
        .catch(() => alive && setHeat([]));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [mode, view, viewNonce, market, theme, api]);

  useEffect(() => {
    if (!selected) return;
    let alive = true;
    api(`/api/scout/places?q=${encodeURIComponent('茶饮')}&lat=${selected.lat}&lng=${selected.lng}`)
      .then((r) => r.json())
      .then((d) => alive && setPois((d as { pois: Poi[] }).pois));
    return () => {
      alive = false;
    };
  }, [selected, api]);

  useEffect(() => {
    if (!selected) {
      setTa(null);
      return;
    }
    let alive = true;
    api(`/api/scout/tradearea?market=${market}&key=${selected.area_key}&radius=${radius / 1000}`)
      .then((r) => r.json())
      .then((d) => alive && setTa((d as { stats: TradeAreaStats }).stats))
      .catch(() => alive && setTa(null));
    return () => {
      alive = false;
    };
  }, [selected, radius, market, api]);

  const filtered = useMemo(
    () =>
      districts.filter(
        (d) =>
          (typeFilter === 'all' || d.district_type === typeFilter) &&
          (!search || d.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [districts, typeFilter, search],
  );

  const pick = useCallback((d: District) => setSelected(d), []);

  async function saveCandidate() {
    if (!selected) return;
    const res = await api('/api/scout/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        market_code: market,
        area_key: selected.area_key,
        name: `${selected.name} · 候选点`,
        lat: selected.lat,
        lng: selected.lng,
        note,
      }),
    });
    const d = await res.json();
    if (d.success) {
      setNote('');
      setCandidates((c) => [d.candidate, ...c]);
    }
  }

  async function removeCandidate(id: number) {
    await api(`/api/scout/candidates?id=${id}`, { method: 'DELETE' });
    setCandidates((c) => c.filter((x) => x.id !== id));
  }

  function exportCsv(kind: 'shortlist' | 'candidates') {
    const head = kind === 'shortlist' ? '排名,商圈,类型,区域,活跃度\n' : '名称,商圈,备注,创建者\n';
    const body =
      kind === 'shortlist'
        ? filtered.map((d) => [themeInfo(d, theme, districts).rank, d.name, d.district_type, d.region, themeInfo(d, theme, districts).score].join(',')).join('\n')
        : candidates.map((c) => [c.name, c.area_key, c.note, c.created_by].join(',')).join('\n');
    const blob = new Blob(['\ufeff' + head + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gris-${market}-${kind}.csv`;
    a.click();
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(['grid', 'heat'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                mode === m ? 'bg-[#111111] text-[#ffffff] font-semibold' : 'text-muted-foreground'
              }`}
            >
              {m === 'grid' ? <MapIcon className="h-3.5 w-3.5" /> : <Flame className="h-3.5 w-3.5" />}
              {m === 'grid' ? '数据网格' : '热力渐变'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                theme === t.key ? 'bg-[#111111] text-[#ffffff] font-semibold' : 'text-muted-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Trade area</span>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {[500, 1000, 1500].map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`rounded-md px-2 py-1 text-[11px] ${radius === r ? 'bg-[#111111] text-[#ffffff] font-semibold' : 'text-muted-foreground'}`}
              >
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </button>
            ))}
          </div>
          <button onClick={() => exportCsv('shortlist')} className="flex items-center gap-1.5 rounded-md bg-[#111111] px-3 py-1.5 text-xs font-semibold text-[#ffffff]">
            <Download className="h-3.5 w-3.5" /> 导出短名单
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_360px] gap-3 overflow-hidden">
        {/* 左栏：图层 + 短名单 */}
        <aside className="flex min-h-0 flex-col overflow-auto rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">地图图层</div>
            {[
              { k: 'transit', on: showTransit, set: setShowTransit, label: '地铁枢纽', color: '#3f3f46' },
              { k: 'pois', on: showPois, set: setShowPois, label: '茶饮 / 咖啡竞品', color: '#111111' },
              { k: 'shortlist', on: showShortlist, set: setShowShortlist, label: '候选商圈', color: '#111111' },
            ].map((l) => (
              <label key={l.k} className="flex cursor-pointer items-center gap-2 py-1.5 text-[13px]">
                <span className="h-2 w-2 rounded-[3px]" style={{ background: l.color }} />
                <span className="flex-1">{l.label}</span>
                <input type="checkbox" checked={l.on} onChange={(e) => l.set(e.target.checked)} className="h-4 w-4 accent-[#111111]" />
              </label>
            ))}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Train className="h-3.5 w-3.5" />
              {placesEnabled ? <span>· Google Places 实时竞品</span> : <span>· 竞品为演示分级数据（未配置 GOOGLE_PLACES_API_KEY）</span>}
            </div>
          </div>

          <div className="border-b border-border px-4 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">商圈类型</div>
            <div className="flex flex-wrap gap-1.5">
              {['all', '核心商业', '社区', '办公', '旅游'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    typeFilter === t ? 'bg-[#111111] text-white' : 'border border-border text-muted-foreground'
                  }`}
                >
                  {t === 'all' ? '全部' : t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索商圈…"
                className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-2.5 text-xs outline-none focus:border-[#111111]"
              />
            </div>
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="font-semibold">重点商圈</span>
              <span className="text-[11px] text-muted-foreground">{filtered.length} / {districts.length}</span>
            </div>
            <div className="grid gap-1">
              {filtered.map((d) => (
                <button
                  key={d.area_key}
                  onClick={() => pick(d)}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    selected?.area_key === d.area_key ? 'border-[#111111] bg-[#111111]/10' : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: selected?.area_key === d.area_key ? '#111111' : TYPE_COLORS[d.district_type] || '#3f3f46' }}
                  >
                    {themeInfo(d, theme, districts).rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium">{d.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{d.district_type} · {d.region}</span>
                  </span>
                  <span className="font-num text-[13px] font-bold text-[#111111]">{themeInfo(d, theme, districts).score}</span>
                </button>
              ))}
              {!filtered.length && <div className="py-8 text-center text-xs text-muted-foreground">无匹配商圈</div>}
            </div>
          </div>
        </aside>

        {/* 中栏：地图 */}
        <section className="relative min-h-0 overflow-hidden rounded-xl border border-border bg-[#f3f4f6]">
          <ScoutMap
            market={market}
            cells={cells}
            mode={mode}
            heat={heat}
            districts={districts}
            selected={selected}
            focus={
              focus && !selected
                ? focus
                : null
            }
            radius={radius}
            showTransit={showTransit}
            showPois={showPois}
            showShortlist={showShortlist}
            pois={pois}
            onSelect={pick}
            onPlainClick={handlePlainClick}
            onViewChange={handleView}
          />
          <div className="pointer-events-none absolute left-3 bottom-3 z-[600] rounded-lg bg-black/70 px-3 py-2 text-[10px] leading-relaxed text-white">
            <b>{market === 'SG' ? '新加坡 · 全城扫描' : '香港 · 全城扫描'}</b>
            <br />
            {mode === 'grid' ? '数据网格' : '街道热力（按视野懒加载）'} · {THEMES.find((t) => t.key === theme)?.label} ·{' '}
            {heatMode === 'real' ? '真实热流' : statusInfo?.data_mode === 'truth' ? '真实数据' : '🔶 演示/代理数据'}
          </div>
          <div className="pointer-events-none absolute left-3 top-3 z-[600] flex items-center gap-2 rounded-lg bg-white/85 px-3 py-1.5 text-[11px] font-semibold">
            <CircleDot className="h-3.5 w-3.5 text-[#111111]" />
            {selected ? selected.name : focus ? '任意点分析（点击查看）' : '点击商圈点位查看证据卡 · 点击空处任意点分析'}
          </div>
        </section>

        {/* 右栏：证据卡 / 任意点分析 */}
        <aside className="flex min-h-0 flex-col overflow-auto rounded-xl border border-border bg-card">
          {!selected && focus ? (
            <div className="p-4">
              <div className="sticky top-0 z-10 -m-4 mb-3 border-b border-border bg-card p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">任意点分析</span>
                <h2 className="mt-1 text-base font-bold">
                  {focus.lat.toFixed(4)}, {focus.lng.toFixed(4)}
                </h2>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  地图空白处点击任意街铺/坐标，来自 Demo 影响面的代理估值（未接入真实数据）。
                </p>
              </div>

              {/* 分量估值 */}
              {focusData?.point ? (
                <div className="grid grid-cols-2 gap-2">
                  {(['transit', 'commercial', 'young', 'resident', 'tourism'] as const).map((k) => (
                    <div key={k} className="rounded-lg bg-muted/50 p-2.5">
                      <div className="text-[10px] text-muted-foreground">{THEMES.find((t) => t.key === k)?.label}</div>
                      <div className="font-num text-lg font-bold text-[#111111]">{focusData.point.cell?.values?.[k] ?? 0}</div>
                    </div>
                  ))}
                  <div className="col-span-2 rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground">
                    所属商圈：{focusData.point.district_key ?? '—'} · 最近轨道交通：{focusData.point.nearest_transit?.name ?? '未接入 LTA（无 key）'}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">加载中…</div>
              )}

              {/* Catchment */}
              {focusData?.catchment && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[12px] font-semibold">周边 Catchment</span>
                    {([0.5, 1, 1.5] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setFocusRadius(r)}
                        className={`rounded-md border px-2 py-0.5 text-[10px] ${focusRadius === r ? 'border-[#111111] bg-[#111111]/10 text-[#111111]' : 'border-border text-muted-foreground'}`}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {[
                      ['人口', `${(focusData.catchment.population / 1000).toFixed(1)}k`],
                      ['交通量', `${(focusData.catchment.traffic / 1e6).toFixed(2)}M`],
                      ['竞品', `${focusData.catchment.competitors}`],
                      ['商业设施', `${focusData.catchment.commercial}`],
                      ['覆盖商圈', `${focusData.catchment.sampledDistricts}`],
                      ['覆盖网格', `${focusData.catchment.sampledCells}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
                        <span className="text-muted-foreground">{k}</span>
                        <b className="text-foreground">{v}</b>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={refetchFocus}
                    className="mt-2 w-full rounded-md border border-[#111111] py-1.5 text-[11px] font-semibold text-[#111111] hover:bg-[#111111]/5"
                  >
                    按 {focusRadius}km 重新聚合
                  </button>
                  <p className="mt-2 rounded-lg bg-yellow-500/10 p-2 text-[10px] leading-relaxed text-yellow-600">
                    🔶 演示/代理数据：{focusData.catchment.method}
                  </p>
                </div>
              )}
            </div>
          ) : !selected ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-xs text-muted-foreground">
              从左侧短名单或地图点选一个商圈<br />查看综合评分、指标依据与数据来源<br /><br />
              或点击地图空处，对任意街铺/坐标做点位分析
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">商圈证据卡</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      selected.confidence === 'A' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-500'
                    }`}
                  >
                    置信度 {selected.confidence}
                  </span>
                </div>
                <h2 className="mt-1 text-base font-bold">{selected.name}</h2>
                <p className="text-[11px] text-muted-foreground">{selected.district_type} · {selected.region}</p>
              </div>

              <div className="mx-4 mt-3 rounded-xl bg-gradient-to-br from-[#111111] to-[#3f3f46] p-4 text-white">
                <div className="mb-1 text-[11px] text-neutral-300">{THEMES.find((t) => t.key === theme)?.label}</div>
                <div className="font-num text-4xl font-black leading-none">
                  {themeInfo(selected, theme, districts).score}
                  <small className="text-sm font-semibold">/100</small>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-[#111111]">
                    全城 #{themeInfo(selected, theme, districts).rank} · {themeInfo(selected, theme, districts).label}
                  </span>
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px]">{radius / 1000} km Trade area</span>
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px]">茶饮 / 咖啡 / 轻餐</span>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[12px]">
                  <Save className="h-3.5 w-3.5 text-[#111111]" />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="给候选点加备注…"
                    className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-2.5 text-xs outline-none focus:border-[#111111]"
                  />
                  <button onClick={saveCandidate} className="rounded-md bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white">加入候选</button>
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold">
                    Trade area <span className="text-[10px] font-normal text-muted-foreground">{radius / 1000} km</span>
                    {ta?.proxy && <span className="ml-1.5 rounded bg-neutral-200/70 px-1 py-0.5 text-[9px] font-semibold text-neutral-600">代理估算</span>}
                  </h3>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">纳入{ta?.sampledDistricts ?? 0}商圈 · 覆盖{Math.round((ta?.coveredRate ?? 0) * 100)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['覆盖人口', ta ? `${(ta.population / 1000).toFixed(1)}k` : '…'],
                    ['月客流·代理', ta ? `${ta.traffic.toFixed(1)}m` : '…'],
                    ['同类竞品', ta ? `${ta.competitors} 家` : '…'],
                    ['商业设施', ta ? `${ta.commercial} 处` : '…'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border p-2.5">
                      <div className="text-[10px] text-muted-foreground">{k}</div>
                      <div className="font-num text-lg font-bold">{v}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  计算：对半径内周边商圈做距离衰减聚合（权重=(1-d/R)²，非线性），非等比放大。{ta?.method ?? ''}
                </p>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-[12px] font-semibold">评分构成</h3>
                <div className="grid gap-2">
                  {([
                    ['transit', '交通'],
                    ['commercial', '商业'],
                    ['young', '年轻客群'],
                    ['resident', '社区消费'],
                    ['tourism', '游客潜力'],
                  ] as const).map(([ck, lab]) => {
                    const v = selected.components[ck];
                    const pct = Math.round((v as number) * 100);
                    const meta = selected.indicatorMeta[ck];
                    return (
                      <div key={ck}>
                        <div className="grid grid-cols-[64px_1fr_26px] items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{lab}</span>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-[#111111]" style={{ width: `${pct}%` }} />
                          </div>
                          <b className="text-right text-[11px] text-foreground">{pct}</b>
                        </div>
                        {meta && (
                          <div className="mt-1 space-y-0.5 pl-[64px] text-[10px] leading-relaxed text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span
                                className={
                                  meta.status === 'real'
                                    ? 'rounded px-1 font-semibold text-emerald-300'
                                    : 'rounded bg-neutral-200/70 px-1 font-semibold text-neutral-600'
                                }
                              >
                                数据状态：{meta.status === 'real' ? '真实数据' : meta.status === 'proxy' ? '🟡 代理/演示模型' : '演示'}
                              </span>
                              {meta.status === 'real' ? (
                                <>
                                  <span>实际来源 <b className="text-muted-foreground">{meta.actualSource}</b></span>
                                  <span>· {meta.date}</span>
                                  <span>· 覆盖{meta.coverage}</span>
                                  <span>· 置信 {meta.confidence}</span>
                                </>
                              ) : (
                                <>
                                  <span>实际来源：<b>暂无（演示）</b></span>
                                  <span>· 未来来源 {meta.futureSource}</span>
                                </>
                              )}
                            </div>
                            <div>计算方法：{meta.method}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-[12px] font-semibold">人群结构 <span className="text-[10px] font-normal text-muted-foreground">两组互斥占比 · 各和=100%</span></h3>
                <div className="mb-1 text-[11px] font-medium text-muted-foreground">身份 / 到访目的</div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {[
                    ['resident', '#111111'],
                    ['office', '#3f3f46'],
                    ['tourist', '#9ca3af'],
                    ['student', '#6b7280'],
                    ['other', '#d4d4d8'],
                  ].map(([k, c]) => (
                    <div key={k} style={{ width: `${selected.identity[k as keyof typeof selected.identity] || 0}%`, background: c }} />
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  {[
                    ['居民', selected.identity.resident],
                    ['办公', selected.identity.office],
                    ['游客', selected.identity.tourist],
                    ['学生', selected.identity.student],
                    ['其他', selected.identity.other],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span>{k}</span><b className="text-foreground">{v}%</b>
                    </div>
                  ))}
                </div>
                <div className="mt-3 mb-1 text-[11px] font-medium text-muted-foreground">年龄结构</div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {[
                    ['a18_24', '#d4d4d8'],
                    ['a25_34', '#111111'],
                    ['a35_44', '#6b7280'],
                    ['a45_plus', '#3f3f46'],
                  ].map(([k, c]) => (
                    <div key={k} style={{ width: `${selected.age[k as keyof typeof selected.age] || 0}%`, background: c }} />
                  ))}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  {[
                    ['18-24', selected.age.a18_24],
                    ['25-34', selected.age.a25_34],
                    ['35-44', selected.age.a35_44],
                    ['45+', selected.age.a45_plus],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between">
                      <span>{k}</span><b className="text-foreground">{v}%</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-[12px] font-semibold">为什么进入短名单 <span className="text-[10px] font-normal text-muted-foreground">系统解释</span></h3>
                <div className="grid gap-2">
                  {selected.evidence.map((e, i) => (
                    <div key={i} className="flex gap-2 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed">
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[#6b7280]" />
                      {e}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold">数据来源（{market}）</h3>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {placesEnabled ? <Play className="h-3 w-3 text-emerald-500" /> : <CircleDot className="h-3 w-3 text-yellow-500" />}
                    {placesEnabled ? '实时数据' : '代理指标演示'}
                  </span>
                </div>
                <div className="grid gap-2">
                  {Object.entries(selected.indicatorMeta).map(([ck, m]) => {
                    const lab = THEMES.find((x) => x.key === ck)?.label ?? ck;
                    return (
                      <div key={ck} className="flex items-start gap-2 text-[11px]">
                        <span
                          className={`mt-0.5 flex h-5 w-14 flex-none items-center justify-center rounded-md text-[9px] font-bold ${
                            m.status === 'real' ? 'bg-[#111111]/10 text-[#111111]' : 'bg-neutral-200/70 text-neutral-600'
                          }`}
                        >
                          {m.status === 'real' ? 'REAL' : m.status === 'proxy' ? 'PROXY' : 'DEMO'}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium">
                            {lab}
                            <span className="pl-1.5 text-[10px] text-muted-foreground">未来来源 {m.futureSource}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{m.method}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* 候选点抽屉底部条 */}
      {candidates.length > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">已保存候选点（{candidates.length}）</span>
            <button onClick={() => exportCsv('candidates')} className="flex items-center gap-1 text-[11px] text-[#111111]">
              <Download className="h-3 w-3" /> 导出 CSV
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[11px]">
                <CupSoda className="h-3.5 w-3.5 text-[#111111]" />
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground">· {c.note || '无备注'}</span>
                <button onClick={() => removeCandidate(c.id)} className="text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}