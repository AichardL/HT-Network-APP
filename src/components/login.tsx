'use client';

import { useState } from 'react';
import { CupSoda } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPanel({ onLogin }: { onLogin: (u: { username: string; role: string }) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('gris-admin-2024');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error === 'invalid_credentials' ? '账号或密码错误' : '登录失败');
        return;
      }
      onLogin(d.user);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 gris-canvas opacity-60" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#e0a458] text-[#17120a]">
            <CupSoda className="h-7 w-7" strokeWidth={1.6} />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tracking-tight">GRIS</div>
            <div className="mt-1 text-sm text-muted-foreground">茶饮行业网络规划系统 · 登录</div>
          </div>
        </div>
        <form
          onSubmit={submit}
          className="rounded-xl border border-border bg-card p-6 shadow-2xl shadow-black/40"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u">账号</Label>
              <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">密码</Label>
              <Input
                id="p"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <div className="text-xs text-[#c85a3e]">{error}</div>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? '登录中…' : '进入系统'}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              默认账号 admin / gris-admin-2024（可通过环境变量覆盖）
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}