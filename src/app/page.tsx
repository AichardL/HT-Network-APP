'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
  PieChart,
  Pie,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanCanvas, type CanvasSite } from '@/components/plan-canvas';
import { useMarket } from '@/components/app-shell';

interface Overview {
  kpi: {
    siteCount: number;
    avgPeak: number;
    avgRent: number;
    avgAffinity: number;
    avgPremium: number;
    districtCount: number;
    zoneCount: number;
  };
  charts: {
    weekday: { hour: number; volume: number }[];
    weekend: { hour: number; volume: number }[];
    siteTypes: { type: string; count: number }[];
    ages: { age18_24: number; age25_34: number; age35_44: number; age45_plus: number };
  };
}

const TYPE_LABEL: Record<string, string> = {
  MTR: '地铁/枢纽',
  MALL: '商场',
  STREET: '主街',
  OFFICE: '写字楼',
  RESIDENCE: '社区',
  TOURIST: '旅游',
};

export default function DashboardPage() {
  const { market, api } = useMarket();
  const [data, setData] = useState<Overview | null>(null);
  const [sites, setSites] = useState<CanvasSite[]>([]);

  const load = useCallback(async () => {
    const ov = await (await api(`/api/overview/${market}`)).json();
    setData(ov);
    const sres = await (await api(`/api/sites/${market}`)).json();
    setSites(
      sres.sites.map((s: Record<string, unknown>) => ({
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
    load();
  }, [load]);

  if (!data)
    return (
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );

  const k = data.kpi;
  const kpis = [
    { label: '候选点位', value: k.siteCount, sub: `${k.zoneCount} 个商圈单元` },
    { label: '平均高峰人流', value: k.avgPeak.toLocaleString(), sub: '人次/时' },
    { label: '平均月租金', value: k.avgRent.toLocaleString(), sub: '本地货币' },
    { label: '已划定商圈', value: k.districtCount, sub: 'serviceable districts' },
    { label: '客群茶饮偏好', value: (k.avgAffinity * 100).toFixed(0) + '%', sub: 'tea affinity' },
    { label: '高消费客群占比', value: (k.avgPremium * 100).toFixed(0) + '%', sub: 'premium share' },
  ];
  const ageRows = [
    { name: '18-24', v: data.charts.ages.age18_24 * 100 },
    { name: '25-34', v: data.charts.ages.age25_34 * 100 },
    { name: '35-44', v: data.charts.ages.age35_44 * 100 },
    { name: '45+', v: data.charts.ages.age45_plus * 100 },
  ];
  const lineData = data.charts.weekday.map((w, i) => ({
    hour: `${String(w.hour).padStart(2, '0')}:00`,
    工作日: w.volume,
    周末: data.charts.weekend[i]?.volume ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">市场总览</h1>
        <p className="text-sm text-muted-foreground">
          {market === 'HK' ? '香港（HKD）' : '新加坡（SGD）'} · 人流与客群核心数据概览
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
              <div className="font-num mt-1.5 text-2xl font-semibold">{kpi.value}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{kpi.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">人流时段分布（小时均值）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,244,224,0.08)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#a7a29a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#a7a29a' }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a20', border: '1px solid rgba(255,244,224,0.15)', borderRadius: 8 }}
                  labelStyle={{ color: '#f2efe8' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="工作日" stroke="#e0a458" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="周末" stroke="#7f9db9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">客群年龄构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ageRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,244,224,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a7a29a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#a7a29a' }} unit="%" />
                <Tooltip
                  formatter={(v) => [`${v}%`, '占比']}
                  contentStyle={{ background: '#1a1a20', border: '1px solid rgba(255,244,224,0.15)' }}
                />
                <Bar dataKey="v" radius={[4, 4, 0, 0]}>
                  {ageRows.map((_, i) => (
                    <Cell key={i} fill={i === 1 ? '#e0a458' : '#7f9db9'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">点位类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.charts.siteTypes.map((t) => ({ name: TYPE_LABEL[t.type] || t.type, value: t.count }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {data.charts.siteTypes.map((_, i) => (
                    <Cell key={i} fill={['#e0a458', '#93b27b', '#7f9db9', '#cab381', '#c85a3e', '#a87b5a'][i % 6]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a20', border: '1px solid rgba(255,244,224,0.15)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">点位离乱度热力 · 人流密度</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanCanvas sites={sites} height={300} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}