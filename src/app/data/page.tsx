'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMarket } from '@/components/app-shell';

const TYPE_LABEL: Record<string, string> = {
  MTR: '地铁/枢纽',
  MALL: '商场',
  STREET: '主街',
  OFFICE: '写字楼',
  RESIDENCE: '社区',
  TOURIST: '旅游',
};

export default function DataPage() {
  const { market, api } = useMarket();
  const [sites, setSites] = useState<Record<string, unknown>[]>([]);
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    const sres = await (await api(`/api/sites/${market}`)).json();
    setSites(sres.sites ?? []);
    const cres = await (await api(`/api/customers/${market}`)).json();
    setCustomers(cres.customers ?? []);
  }, [market, api]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">数据中心</h1>
        <p className="text-sm text-muted-foreground">
          底层商业数据库查询 · {market === 'HK' ? '香港（HKD）' : '新加坡（SGD）'}
        </p>
      </div>

      <Tabs defaultValue="flow">
        <TabsList>
          <TabsTrigger value="flow">人流数据</TabsTrigger>
          <TabsTrigger value="customer">客群画像</TabsTrigger>
          <TabsTrigger value="site">点位清单</TabsTrigger>
        </TabsList>

        <TabsContent value="flow">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">点位人流汇总 · 高峰值</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>点位</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>分区</TableHead>
                    <TableHead className="text-right">高峰人流</TableHead>
                    <TableHead className="text-right">茶饮偏好</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((s) => (
                    <TableRow key={s.id as number}>
                      <TableCell className="font-medium">{s.name_zh as string}</TableCell>
                      <TableCell>{TYPE_LABEL[s.site_type as string] || (s.site_type as string)}</TableCell>
                      <TableCell>{s.zone_id as number}</TableCell>
                      <TableCell className="font-num text-right">{s.peak_flow as number}</TableCell>
                      <TableCell className="font-num text-right">{((s.tea_affinity as number) * 100).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">客群画像（按商圈单元）</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商圈单元</TableHead>
                    <TableHead className="text-right">高消费占比</TableHead>
                    <TableHead className="text-right">25-34岁</TableHead>
                    <TableHead className="text-right">办公族</TableHead>
                    <TableHead className="text-right">游客</TableHead>
                    <TableHead className="text-right">茶饮偏好</TableHead>
                    <TableHead className="text-right">客单价</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((row) => {
                    const zone = row.zone as Record<string, unknown>;
                    const p = row.profile as Record<string, unknown> | null;
                    return (
                      <TableRow key={zone.id as number}>
                        <TableCell className="font-medium">{zone.name_zh as string}</TableCell>
                        <TableCell className="font-num text-right">
                          {p ? ((p.premium_share as number) * 100).toFixed(0) + '%' : '—'}
                        </TableCell>
                        <TableCell className="font-num text-right">
                          {p ? ((p.age_25_34 as number) * 100).toFixed(0) + '%' : '—'}
                        </TableCell>
                        <TableCell className="font-num text-right">
                          {p ? ((p.office_ratio as number) * 100).toFixed(0) + '%' : '—'}
                        </TableCell>
                        <TableCell className="font-num text-right">
                          {p ? ((p.tourist_ratio as number) * 100).toFixed(0) + '%' : '—'}
                        </TableCell>
                        <TableCell className="font-num text-right">
                          {p ? ((p.tea_affinity as number) * 100).toFixed(0) + '%' : '—'}
                        </TableCell>
                        <TableCell className="font-num text-right">{p ? (p.avg_basket as number) : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">候选点位清单</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>点位</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">面积(㎡)</TableHead>
                    <TableHead className="text-right">月租金</TableHead>
                    <TableHead className="text-right">周边竞争</TableHead>
                    <TableHead className="text-right">坐标(lat,lng)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((s) => (
                    <TableRow key={s.id as number}>
                      <TableCell className="font-medium">{s.name_zh as string}</TableCell>
                      <TableCell>{TYPE_LABEL[s.site_type as string] || (s.site_type as string)}</TableCell>
                      <TableCell className="font-num text-right">{s.sqm as number}</TableCell>
                      <TableCell className="font-num text-right">{s.monthly_rent as number}</TableCell>
                      <TableCell className="font-num text-right">{s.competitor_count as number}</TableCell>
                      <TableCell className="font-num text-right text-[11px]">
                        {s.lat as number}, {s.lng as number}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}