# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 本项目 GRIS：香港/新加坡茶饮网络规划系统

### 项目概述
商业级茶饮行业网络规划系统（GRIS），面向香港(HK)与新加坡(SG)市场，提供：
商圈划定分析、门店网络项目规划、精准选址推荐、人流/客群数据查询、商业化安全与审计。

### 技术栈补充
- **底层数据库**：`better-sqlite3`（Node 原生嵌入式数据库），运行时于 `data/gris.db`
  自动建库 + 灌入 HK/SG 种子示意数据（首次访问时生成）。`next.config.ts` 已用
  `serverExternalPackages: ["better-sqlite3"]` 将原生模块 external 化，避免被 Next 打入构建产物。
- **数据访问**：`src/lib/db.ts`（连接+Schema+种子）、`src/lib/repo.ts`（仓储查询）、
  `src/lib/services.ts`（商圈/选址/规划算法）、`src/lib/api.ts`（统一 API 封装+鉴权+审计）、`src/lib/auth.ts`（Salted 登录+HMAC Cookie 会话）。

### 数据库 Schema（data/gris.db，均为运行时生成，勿提交）
markets / zones(商圈区域) / sites(候选点位) / foot_traffic(分时人流) /
customer_zone(客群画像) / districts(商圈划定结果) / projects(项目) /
project_sites(项目点位) / users(登录用户) / audit_log(审计)。

### API（全部需 Bearer 登录 Cookie；见 src/app/api/**/route.ts）
POST /api/auth/login、GET /api/auth/me、GET /api/market、GET /api/overview/[market]、
GET /api/sites/[market]、GET /api/customers/[market]、GET /api/foottraffic/[id]、
POST/GET /api/districts（商圈划定/查询）、POST /api/selection（选址）、
POST/GET /api/planning（项目规划）、GET /api/audits（审计日志）。

### 默认登录账号
管理员：`admin` / `gris-admin-2024`（位于 src/lib/auth.ts ADMIN_PASSWORD_HASH，可改）。

### 前端
- `src/app/page.tsx` 总览；`/districts` 商圈划定；`/planning` 项目规划；`/selection` 选址；
  `/data` 数据查询；`/audit` 审计。
- `src/components/app-shell.tsx`（鉴权门+侧边栏）、`login.tsx`、`plan-canvas.tsx`（归一化 SVG 制图画布，无外部地图依赖）。
- 暗色制图风格 Token 定义在 `src/app/globals.css` 的 `.dark` 块（陶瓷琥珀 #e0a458 点缀）；`design` 详见 `DESIGN.md`。

### 运行与验证
- 预览/部署入口见 `.coze [dev]/[deploy]`（scripts/build.sh 构建，start.sh 以 5000 启动 `node dist/server.js`）。
- **只能 pnpm**；容器内临时排障可 `pnpm exec tsx -e "..."` 直接调 lib 层算法。
- 验收只认 `test_run`：接口带鉴权，且各 curl 需**各自独立登录**（test_run 各命令并发执行，
  共用 cookie jar 会因读写竞态产生随机 401）。正确姿势：`J=/tmp/g_$$.jar; curl login -c $J; curl -b $J <endpoint>`。

### 常见问题与预防
- 改 schema/算法后，删 `data/gris.db` 或改版本号即可触发重建+重种子；DB 文件勿提交。
- 前端调用一律相对路径 `/api/...`，禁止硬编码域名/localhost。
- 登录/会话依赖模块级 SECRET 常量，改 auth.ts 会使历史 Cookie 失效（属正常）。
- 地图为 SVG 归一画布（0..100 坐标），未接第三方地图 key；如需真实底图再引入 map 服务。
### Tailwind v4 常见坑
- 在 `globals.css` 里通过 `@import url(...)` 引入 Google Fonts 时，必须把它放在**文件第一行、`@import 'tailwindcss'` 之前**；否则 Tailwind v4 就地展开 `tailwindcss` 后会把字体 `@import` 顶到编译产物中段，触发 `@import rules must precede all rules` 编译失败、页面全部 500。
### 会话鉴权（重要）
- 登录成功返回 `{success,user,token}`；前端把 token 存 `localStorage['gris_token']`，后续请求通过
  `Authorization: Bearer <token>` 携带（兼容 iframe 预览，浏览器会屏蔽第三方 iframe 的 cookie，Cookie 已弃为主方案，仅作兜底）。
- 前端 `api()` 助手：401 时清 token 并回登录页；非 200 时抛错（各页面依赖此行为，勿改成静默放行错误体，否则会出现
  `Cannot read properties of undefined (reading 'siteCount')` 类崩溃）。
