'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Play, Download, Map as MapIcon, Flame, Train, CupSoda, CircleDot, Search, Save, Trash2,
} from 'lucide-react';
import { useMarket } from '@/components/app-shell';
import type { District, Candidate } from '@/lib/scout-types';
import type { Poi } from '@/lib/sources/places';

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
  '核心商业': '#0b6b61',
  办公: '#6f80d4',
  社区: '#119485',
  旅游: '#f1bd42',
};

export default function ScoutBoard() {
  const { market, api } = useMarket();
  const [theme, setTheme] = useState('overall');
  const [mode, setMode] = useState<'grid' | 'heat'>('grid');
  const [radius, setRadius] = useState(1000);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showTransit, setShowTransit] = useState(true);
  const [showPois, setShowPois] = useState(true);
  const [showShortlist, setShowShortlist] = useState(true);

  const [districts, setDistricts] = useState<District[]>([]);
  const [cells, setCells] = useState<{ lat: number; lng: number; val: number }[]>([]);
  const [selected, setSelected] = useState<District | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [placesEnabled, setPlacesEnabled] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const reqRef = useRef(0);

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
        ? filtered.map((d) => [d.rank, d.name, d.district_type, d.region, d.active_score].join(',')).join('\n')
        : candidates.map((c) => [c.name, c.area_key, c.note, c.created_by].join(',')).join('\n');
    const blob = new Blob(['\ufeff' + head + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gris-${market}-${kind}.csv`;
    a.click();
  }

  const f = radius / 1000;

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
                mode === m ? 'bg-[#e0a458] text-[#17120a] font-semibold' : 'text-muted-foreground'
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
                theme === t.key ? 'bg-[#e0a458] text-[#17120a] font-semibold' : 'text-muted-foreground'
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
                className={`rounded-md px-2 py-1 text-[11px] ${radius === r ? 'bg-[#e0a458] text-[#17120a] font-semibold' : 'text-muted-foreground'}`}
              >
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </button>
            ))}
          </div>
          <button onClick={() => exportCsv('shortlist')} className="flex items-center gap-1.5 rounded-md bg-[#e0a458] px-3 py-1.5 text-xs font-semibold text-[#17120a]">
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
              { k: 'transit', on: showTransit, set: setShowTransit, label: '地铁枢纽', color: '#6f80d4' },
              { k: 'pois', on: showPois, set: setShowPois, label: '茶饮 / 咖啡竞品', color: '#20354b' },
              { k: 'shortlist', on: showShortlist, set: setShowShortlist, label: '候选商圈', color: '#0b6b61' },
            ].map((l) => (
              <label key={l.k} className="flex cursor-pointer items-center gap-2 py-1.5 text-[13px]">
                <span className="h-2 w-2 rounded-[3px]" style={{ background: l.color }} />
                <span className="flex-1">{l.label}</span>
                <input type="checkbox" checked={l.on} onChange={(e) => l.set(e.target.checked)} className="h-4 w-4 accent-[#e0a458]" />
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
                    typeFilter === t ? 'bg-[#20354b] text-white' : 'border border-border text-muted-foreground'
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
                className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-2.5 text-xs outline-none focus:border-[#e0a458]"
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
                    selected?.area_key === d.area_key ? 'border-[#e0a458] bg-[#e0a458]/10' : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ background: selected?.area_key === d.area_key ? '#0b6b61' : TYPE_COLORS[d.district_type] || '#6f80d4' }}
                  >
                    {d.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium">{d.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{d.district_type} · {d.region}</span>
                  </span>
                  <span className="font-num text-[13px] font-bold text-[#0b6b61]">{d.active_score}</span>
                </button>
              ))}
              {!filtered.length && <div className="py-8 text-center text-xs text-muted-foreground">无匹配商圈</div>}
            </div>
          </div>
        </aside>

        {/* 中栏：地图 */}
        <section className="relative min-h-0 overflow-hidden rounded-xl border border-border bg-[#dfe9e5]">
          <ScoutMap
            market={market}
            cells={cells}
            mode={mode}
            districts={districts}
            selected={selected}
            radius={radius}
            showTransit={showTransit}
            showPois={showPois}
            showShortlist={showShortlist}
            pois={pois}
            onSelect={pick}
          />
          <div className="pointer-events-none absolute left-3 bottom-3 z-[600] rounded-lg bg-black/70 px-3 py-2 text-[10px] leading-relaxed text-white">
            <b>{market === 'SG' ? '新加坡 · 全城扫描' : '香港 · 全城扫描'}</b>
            <br />
            {mode === 'grid' ? '数据网格' : '热力渐变'} · {THEMES.find((t) => t.key === theme)?.label} · 代理指标
          </div>
          <div className="pointer-events-none absolute left-3 top-3 z-[600] flex items-center gap-2 rounded-lg bg-white/85 px-3 py-1.5 text-[11px] font-semibold">
            <CircleDot className="h-3.5 w-3.5 text-[#0b6b61]" />
            {selected ? selected.name : '点击商圈点位查看证据卡'}
          </div>
        </section>

        {/* 右栏：证据卡 */}
        <aside className="flex min-h-0 flex-col overflow-auto rounded-xl border border-border bg-card">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-xs text-muted-foreground">
              从左侧短名单或地图点选一个商圈<br />查看综合评分、指标依据与数据来源
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

              <div className="mx-4 mt-3 rounded-xl bg-gradient-to-br from-[#0a7468] to-[#119486] p-4 text-white">
                <div className="mb-1 text-[11px] text-[#d3f0eb]">{THEMES.find((t) => t.key === theme)?.label}</div>
                <div className="font-num text-4xl font-black leading-none">{selected.active_score}<small className="text-sm font-semibold">/100</small></div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-[#f1bd42] px-2 py-0.5 text-[10px] font-bold text-[#453000]">全城 #{selected.rank}</span>
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px]">{radius / 1000} km Trade area</span>
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px]">茶饮 / 咖啡 / 轻餐</span>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[12px]">
                  <Save className="h-3.5 w-3.5 text-[#0b6b61]" />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="给候选点加备注…"
                    className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-2.5 text-xs outline-none focus:border-[#e0a458]"
                  />
                  <button onClick={saveCandidate} className="rounded-md bg-[#0b6b61] px-3 py-1.5 text-xs font-semibold text-white">加入候选</button>
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-[12px] font-semibold">Trade area 概览 <span className="text-[10px] font-normal text-muted-foreground">({radius / 1000} km 估算)</span></h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['覆盖人口', `${(selected.metrics.population * f).toFixed(1)}k`],
                    ['月交通量·代理', `${(selected.metrics.traffic * f).toFixed(1)}m`],
                    ['同类竞品', `${Math.round(selected.metrics.competitors * f)}`],
                    ['商业设施', `${Math.round(selected.metrics.commercial * f)}`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border p-2.5">
                      <div className="text-[10px] text-muted-foreground">{k}</div>
                      <div className="font-num text-lg font-bold">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-[12px] font-semibold">评分构成</h3>
                <div className="grid gap-2">
                  {[
                    ['交通', selected.components.transit],
                    ['商业', selected.components.commercial],
                    ['年轻客群', selected.components.young],
                    ['社区消费', selected.components.resident],
                    ['游客潜力', selected.components.tourism],
                  ].map(([lab, v]) => {
                    const pct = Math.round((v as number) * 100);
                    return (
                      <div key={lab as string} className="grid grid-cols-[64px_1fr_26px] items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{lab}</span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[#0b6b61]" style={{ width: `${pct}%` }} />
                        </div>
                        <b className="text-right text-[11px] text-foreground">{pct}</b>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <h3 className="mb-2 text-[12px] font-semibold">客群结构 <span className="text-[10px] font-normal text-muted-foreground">身份代理估算</span></h3>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {['resident', 'office', 'young', 'tourist'].map((k, i) => (
                    <div key={k} style={{ width: `${selected.audience[k] || 0}%`, background: ['#0b6b61', '#6f80d4', '#f1bd42', '#ed6c5c'][i] }} />
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
                  {[
                    ['居民', selected.audience.resident],
                    ['办公', selected.audience.office],
                    ['年轻', selected.audience.young],
                    ['游客', selected.audience.tourist],
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
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[#119485]" />
                      {e}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold">数据来源</h3>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {placesEnabled ? <Play className="h-3 w-3 text-emerald-500" /> : <CircleDot className="h-3 w-3 text-yellow-500" />}
                    {placesEnabled ? '实时数据' : '代理指标演示'}
                  </span>
                </div>
                <div className="grid gap-2">
                  {selected.sources.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]">
                      <span className="mt-0.5 flex h-5 w-8 flex-none items-center justify-center rounded-md bg-muted text-[9px] font-bold text-[#0b6b61]">
                        {s.kind === '官方统计' ? 'STAT' : s.kind === '开放数据' ? 'OSM' : 'API'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium">{s.name} <span className="text-[10px] text-muted-foreground">· {s.date}</span></div>
                        <div className="text-[10px] text-muted-foreground">{s.method}</div>
                      </div>
                    </div>
                  ))}
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
            <button onClick={() => exportCsv('candidates')} className="flex items-center gap-1 text-[11px] text-[#0b6b61]">
              <Download className="h-3 w-3" /> 导出 CSV
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[11px]">
                <CupSoda className="h-3.5 w-3.5 text-[#0b6b61]" />
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