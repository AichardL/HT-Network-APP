'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlanCanvas, type CanvasSite } from '@/components/plan-canvas';
import { useMarket } from '@/components/app-shell';

interface Ranked extends CanvasSite {
  score: number;
  monthly_rent: number;
  competitor_count: number;
  reasons: string[];
}

const TYPE_LABEL: Record<string, string> = {
  MTR: '地铁/枢纽',
  MALL: '商场',
  STREET: '主街',
  OFFICE: '写字楼',
  RESIDENCE: '社区',
  TOURIST: '旅游',
};

export default function SelectionPage() {
  const { market, api } = useMarket();
  const [w, setW] = useState({ flow: 40, customerFit: 30, affordability: 20, competition: 10 });
  const [top, setTop] = useState<Ranked[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const r = await api('/api/selection', {
        method: 'POST',
        body: JSON.stringify({
          market_code: market,
          flow: w.flow / 100,
          customerFit: w.customerFit / 100,
          affordability: w.affordability / 100,
          competition: w.competition / 100,
        }),
      });
      const d = await r.json();
      setTop((d.ranked ?? []).slice(0, 10));
    } finally {
      setRunning(false);
    }
  }, [api, market, w]);

  useEffect(() => {
    run();
  }, [run]);

  const canvasSites: CanvasSite[] = top.map((t) => ({ ...t, selected: true, score: t.score }));

  const weightRow = (
    key: keyof typeof w,
    label: string,
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <Label>{label}</Label>
        <span className="font-num text-[#e0a458]">{w[key]}</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={5}
        value={[w[key]]}
        onValueChange={(v) => setW((p) => ({ ...p, [key]: v[0] }))}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">精准选址</h1>
        <p className="text-sm text-muted-foreground">
          综合人流密度、目标客群特征、租金可承受度与竞争密度，推荐最优门店位置
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">候选点位综合评分 · {market === 'HK' ? '香港' : '新加坡'}</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanCanvas sites={canvasSites} mode="score" height={420} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">评分权重</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {weightRow('flow', '人流密度')}
              {weightRow('customerFit', '目标客群匹配')}
              {weightRow('affordability', '租金可承受')}
              {weightRow('competition', '竞争密度')}
              <Button className="w-full" onClick={run} disabled={running}>
                {running ? '评估中…' : '重新评估'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 10 推荐点位</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {top.map((t, i) => (
            <div key={t.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="font-num text-sm text-[#e0a458]">#{(t.score ?? 0).toFixed(1)}</div>
                <Badge variant="secondary">{TYPE_LABEL[t.site_type] || t.site_type}</Badge>
              </div>
              <div className="mt-1 text-sm font-medium">{t.name_zh}</div>
              <div className="font-num mt-0.5 text-[11px] text-muted-foreground">
                峰值人流 {t.peak_flow} · 月租 {t.monthly_rent} · 竞争 {t.competitor_count}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {t.reasons.map((r) => (
                  <span key={r} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {top.length === 0 && <p className="text-xs text-muted-foreground">暂无评估结果</p>}
        </CardContent>
      </Card>
    </div>
  );
}