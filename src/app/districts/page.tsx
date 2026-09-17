'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PlanCanvas, type CanvasSite, type DistrictBlob } from '@/components/plan-canvas';
import { useMarket } from '@/components/app-shell';

interface District {
  name: string;
  siteCount: number;
  avgPeakFlow: number;
  avgAffinity: number;
  siteIds: number[];
}

export default function DistrictsPage() {
  const { market, api } = useMarket();
  const [sites, setSites] = useState<CanvasSite[]>([]);
  const [flowThreshold, setFlowThreshold] = useState(520);
  const [minSites, setMinSites] = useState(3);
  const [districts, setDistricts] = useState<District[]>([]);
  const [running, setRunning] = useState(false);

  const loadSites = useCallback(async () => {
    const r = await (await api(`/api/sites/${market}`)).json();
    setSites(
      r.sites.map((s: Record<string, unknown>) => ({
        id: s.id as number,
        name_zh: s.name_zh as string,
        site_type: s.site_type as string,
        x: s.x as number,
        y: s.y as number,
        peak_flow: s.peak_flow as number,
        tea_affinity: s.tea_affinity as number,
      })),
    );
  }, [market, api]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const r = await api('/api/districts', {
        method: 'POST',
        body: JSON.stringify({ market_code: market, flowThreshold, minSites }),
      });
      const d = await r.json();
      setDistricts(d.districts ?? []);
    } finally {
      setRunning(false);
    }
  }, [api, market, flowThreshold, minSites]);

  const blobs: DistrictBlob[] = districts.map((d) => ({
    name: d.name,
    siteIds: d.siteIds,
    centroidX: 0,
    centroidY: 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">商圈划定</h1>
        <p className="text-sm text-muted-foreground">
          基于人流密度阈值与空间近邻聚类，自动划分商圈边界并评估服务能力
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">商圈边界划定 · {market === 'HK' ? '香港' : '新加坡'}</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanCanvas sites={sites} districts={blobs} height={420} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">划定参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Label>高峰人流阈值</Label>
                  <span className="font-num text-[#e0a458]">{flowThreshold}</span>
                </div>
                <Slider
                  min={200}
                  max={1000}
                  step={20}
                  value={[flowThreshold]}
                  onValueChange={(v) => setFlowThreshold(v[0])}
                />
                <p className="text-[11px] text-muted-foreground">仅有高峰人流 ≥ 阈值的点位纳入候选</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minSites">最少点位 / 商圈</Label>
                <Input
                  id="minSites"
                  type="number"
                  value={minSites}
                  onChange={(e) => setMinSites(Number(e.target.value))}
                />
              </div>
              <Button className="w-full" onClick={run} disabled={running}>
                {running ? '分析中…' : '开始商圈划定'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">划定结果（{districts.length}）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {districts.length === 0 && (
                <p className="text-xs text-muted-foreground">点击「开始商圈划定」查看结果</p>
              )}
              {districts.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="text-sm">{d.name}</div>
                    <div className="font-num text-[11px] text-muted-foreground">
                      {d.siteCount} 点位 · 峰值 {d.avgPeakFlow} · 偏好 {(d.avgAffinity * 100).toFixed(0)}%
                    </div>
                  </div>
                  <Badge variant="secondary">可服务</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}