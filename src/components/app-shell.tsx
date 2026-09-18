'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  CupSoda,
  Crosshair,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginPanel } from '@/components/login';

export type MarketCode = 'HK' | 'SG';

interface MarketCtx {
  market: MarketCode;
  setMarket: (m: MarketCode) => void;
  user: { username: string; role: string } | null;
  logout: () => Promise<void>;
  api: (path: string, init?: RequestInit) => Promise<Response>;
}

const Ctx = createContext<MarketCtx | null>(null);

export const useMarket = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMarket must be used within AppShell');
  return c;
};

const NAV = [
  { href: '/', label: '选址考察台', icon: Crosshair },
  { href: '/audit', label: '审计日志', icon: ScrollText },
];

const TOKEN_KEY = 'gris_token';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<MarketCode>('SG');
  const [token, setToken] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null;
      if (stored) {
        try {
          const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } });
          const d = await r.json();
          if (d.user) {
            setToken(stored);
            setUser(d.user);
            return;
          }
        } catch {
          /* 旧令牌失效则走游客直通 */
        }
        window.localStorage.removeItem(TOKEN_KEY);
      }
      try {
        const r = await fetch('/api/auth/demo');
        const d = await r.json();
        if (r.ok && d.token && d.user) {
          window.localStorage.setItem(TOKEN_KEY, d.token);
          setToken(d.token);
          setUser(d.user);
          return;
        }
      } catch {
        /* GRIS_DEMO_ANON=0 或网络异常时回退到登录页 */
      }
      setUser(null);
    })()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(path, {
        credentials: 'same-origin',
        ...init,
        headers,
      });
      if (res.status === 401) {
        setToken(null);
        if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      }
      if (!res.ok) throw new Error(`request failed: ${res.status}`);
      return res;
    },
    [token],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/me', { method: 'POST' });
    } catch {
      // 忽略登出接口异常
    }
    setToken(null);
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    router.push('/');
  }, [router]);

  const ctx: MarketCtx = { market, setMarket, user, logout, api };

  return (
    <Ctx.Provider value={ctx}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          载入中…
        </div>
      ) : !user ? (
        <LoginPanel onLogin={(u, t) => { setUser(u); setToken(t); if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, t); }} />
      ) : (
        <div className="flex min-h-screen bg-background">
          <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
            <div className="flex items-center gap-2.5 px-5 py-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#e0a458] text-[#17120a]">
                <CupSoda className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-foreground">GRIS · 选址考察台</div>
                <div className="text-[11px] text-muted-foreground">海外门店选址系统</div>
              </div>
            </div>
            <nav className="mt-2 flex-1 space-y-0.5 px-3">
              {NAV.map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors ${
                      active
                        ? 'bg-sidebar-accent text-[#e0a458]'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border px-4 py-4 text-xs text-muted-foreground">
              <div className="mb-1">GRIS · Geo Retail Intelligence</div>
              <div className="flex items-center justify-between">
                <span>{user.username} ({user.role})</span>
                <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-muted-foreground" onClick={logout}>
                  <LogOut className="h-3.5 w-3.5" /> 退出
                </Button>
              </div>
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center justify-between border-b border-border px-6">
              <div className="text-sm font-medium text-muted-foreground">
                支持市场:{' '}
                <span className="font-num text-foreground">{market === 'HK' ? '香港 HKD' : '新加坡 SGD'}</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                {(['HK', 'SG'] as MarketCode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarket(m)}
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      market === m ? 'bg-[#e0a458] text-[#17120a] font-semibold' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m === 'HK' ? '香港' : '新加坡'}
                  </button>
                ))}
              </div>
            </header>
            <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}