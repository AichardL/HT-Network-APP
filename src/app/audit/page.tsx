'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useMarket } from '@/components/app-shell';

interface Audit {
  id: number;
  actor: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  at: number;
}

export default function AuditPage() {
  const { api } = useMarket();
  const [rows, setRows] = useState<Audit[]>([]);

  const load = useCallback(async () => {
    const r = await (await api('/api/audits')).json();
    setRows(r.audits ?? []);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (at: number) =>
    new Date(at).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">审计日志</h1>
        <p className="text-sm text-muted-foreground">
          数据安全与合规 · 记录全部 API 访问，追踪操作者、来源与结果状态
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">最近访问记录（{rows.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>方法</TableHead>
                <TableHead>路径</TableHead>
                <TableHead className="text-right">状态</TableHead>
                <TableHead>来源</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-num text-[11px] text-muted-foreground">{fmt(a.at)}</TableCell>
                  <TableCell>{a.actor}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.method}</Badge>
                  </TableCell>
                  <TableCell className="font-num text-xs">{a.path}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-num ${a.status < 400 ? 'text-[#93b27b]' : 'text-[#c85a3e]'}`}>
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-num text-xs text-muted-foreground">{a.ip}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">暂无记录</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}