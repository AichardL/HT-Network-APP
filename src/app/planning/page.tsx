'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlanCanvas, type CanvasSite } from '@/components/plan-canvas';
import { useMarket } from '@/components/app-shell';

interface Chosen extends CanvasSite {
  role: string;
  rank: number;
  score: number;
  monthly_rent: number;
  competitor_count: number;
}

export default function PlanningPage() {
  const { market, api } = useMarket();
  const [target, setTarget] = useState(6);
  const [strategy, setStrategy] = useState('EXPANSION');
  const [spacing, setSpacing] = useState(12);
  const [chosen, setChosen] = useState<Chosen[]>([]);
  const [rejected, setRejected] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState<number>(0);

  const loadSaved = useCallback(async () => {
    const r = await (await api('/api/planning')).json();
    setSaved(r.projects?.length ?? 0);
  }, [api]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const r = await api('/api/planning', {
        method: 'POST',
        body: JSON.stringify({ market_code: market, target_stores: target, strategy, min_spacing: spacing }),
      });
      const d = await r.json();
      setChosen(d.plan?.chosen ?? []);
      setRejected(d.plan?.rejected?.length ?? 0);
      setCoverage(d.plan?.coverage ?? 0);
      loadSaved();
    } finally {
      setRunning(false);
    }
  }, [api, market, target, strategy, spacing, loadSaved]);

  const canvasSites: CanvasSite[] = chosen.map((c) => ({ ...c, selected: true }));
  const roleBadge = (role: string) =>
    role === 'FLAGSHIP' ? '旗舰店' : role === 'PREMIUM' ? '优选店' : '标准店';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">项目规划 · 门店网络布局</h1>
        <p className="text-sm text-muted-foreground">
          依据市场规模与目标门店数，在最小间距约束下推荐覆盖最优的网络布点
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              网络布局方案 · {market === 'HK' ? '香港' : '新加坡'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PlanCanvas sites={canvasSites} mode="score" height={420} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">规划策略</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="target">目标门店数</Label>
                <Input id="target" type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>拓展策略</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择策略" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPANSION">规模扩张 EXPANSION</SelectItem>
                    <SelectItem value="PENETRATION">密度渗透 PENETRATION</SelectItem>
                    <SelectItem value="PREMIUM">高端优选 PREMIUM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label>门店最小间距（防同店重合）</Label>
                  <span className="font-num text-[#e0a458]">{spacing}</span>
                </div>
                <Slider min={4} max={24} step={1} value={[spacing]} onValueChange={(v) => setSpacing(v[0])} />
              </div>
              <Button className="w-full" onClick={run} disabled={running}>
                {running ? '规划中…' : '生成网络布局方案'}
              </Button>
              {chosen.length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary p-2">
                    <div className="font-num text-lg">{chosen.length}</div>
                    <div className="text-[11px] text-muted-foreground">建议门店</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <div className="font-num text-lg">{rejected}</div>
                    <div className="text-[11px] text-muted-foreground">间距规避</div>
                  </div>
                  <div className="rounded-lg bg-secondary p-2">
                    <div className="font-num text-lg">{(coverage * 100).toFixed(0)}%</div>
                    <div className="text-[11px] text-muted-foreground">目标覆盖率</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">已保存方案（{saved}）</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 space-y-2 overflow-auto">
              {chosen.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm">
                      <span className="font-num text-muted-foreground">#{c.rank}</span> {c.name_zh}
                    </div>
                    <div className="font-num text-[11px] text-muted-foreground">
                      月租 {c.monthly_rent} · 竞争 {c.competitor_count} · 评分 {c.score}
                    </div>
                  </div>
                  <Badge variant={c.role === 'FLAGSHIP' ? 'default' : 'secondary'}>{roleBadge(c.role)}</Badge>
                </div>
              ))}
              {chosen.length === 0 && <p className="text-xs text-muted-foreground">生成方案后在此展示门店明细</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}