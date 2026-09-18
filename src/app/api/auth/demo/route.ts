import { json, writeAudit, clientIp } from '@/lib/api';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 游客直通演示会话：首个访客免登录进入。
// 仅用于演示预览；正式环境通过环境变量 GRIS_DEMO_ANON=0 关闭。
export function GET(req: Request) {
  if (process.env.GRIS_DEMO_ANON === '0') {
    return json({ error: 'demo_disabled' }, 403);
  }
  const token = signToken({ u: 'visitor', r: 'demo', e: Date.now() + 12 * 60 * 60 * 1000 });
  writeAudit('visitor', 'GET', '/api/auth/demo', 200, clientIp(req));
  return json({ success: true, user: { username: 'visitor', role: 'demo' }, token });
}