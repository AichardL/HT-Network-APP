import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { AppShell } from '@/components/app-shell';

export const metadata: Metadata = {
  title: {
    default: 'GRIS · 茶饮行业网络规划系统',
    template: '%s · GRIS',
  },
  description:
    'GRIS（Geo Retail Intelligence Suite）——面向香港与新加坡市场的商业级茶饮行业网络规划系统，辅助商圈划定、门店网络布局与精准选址决策。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
