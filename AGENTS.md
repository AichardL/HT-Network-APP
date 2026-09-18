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

## 本项目 GRIS：香港/新加坡茶饮门店选址考察台（Scout）

### 项目概述
以《Singapore_Site_Selection_Full_Plan.md》方案为准整体重建的商业级门店选址系统
（GRIS Scout），跑通「商圈评级 → 全城网格扫描 → 证据卡 → 候选点沉淀」的考察工作流。
主力市场新加坡（SG，可扩展 HK/BKK/KUL），左栏短名单 + 中栏 Leaflet 地图（网格/热力层）+
右栏证据卡的三栏考察台。

### 技术栈补充
- **底层数据库**：`better-sqlite3`（Node 原生嵌入式数据库），运行时于 `data/scout.db`
  自动建库 + 灌入 SG/HK 种子（首次访问时生成）。`next.config.ts` 的
  `serverExternalPackages: ["better-sqlite3"]` 已把原生模块 external 化，避免被打入客户端 bundle，
  **严禁在 `'use client'` 组件里 import db.ts / scout.ts**（只能 `import type`）。
- **数据访问分层**：
  - `src/lib/db.ts`：连接 + Schema + 种子（确定性种子：mulberry32 + TYPE_BASE，重建可复现）。
  - `src/lib/scout.ts`：服务层（listMarkets / listDistricts / getDistrict / generateGrid /
    listCandidates / saveCandidate / deleteCandidate / composeScore），高斯平滑网格、主题打分。
  - `src/lib/scout-types.ts`：纯共享类型（District/Market/GridCell/Candidate），client/server 共用。
  - `src/lib/sources/places.ts`：Google Places adapter（见「数据源接入」）。
  - `src/lib/api.ts`（鉴权+审计）、`src/lib/auth.ts`（登录令牌，Bearer 优先 / cookie 兜底）。

### 数据库 Schema（data/scout.db，均为运行时生成，勿提交）
markets / scout_districts（商圈，含冗余 JSON：components/metrics/identity/age/sources/
indicatorMeta/evidence、confidence、rank、active_score）/ candidates / users / audit_log。

### 人群结构模型（P0，勿退化）
- 身份/到访目的（identity：resident/office/tourist/student/other）与 年龄（age：a18_24/a25_34/
  a35_44/a45_plus）是**两组独立互斥维度**，各自求和=100%、逐项非负（`makeShares` largest-remainder
  归一化）。
- **严禁**用「游客=100%-居民-办公-年轻」之类的反推混算——身份与年龄维度不同，会算出负数。

### 打分与网格
- 综合分 `composeScore`：0.35 交通 + 0.25 商业 + 0.15 年轻 + 0.15 社区 + 0.10 游客。
- `generateGrid`：以商圈为影响源做高斯平滑（sigma≈5km），按主题输出全城得分面；
  SG 按真实陆地多边形（SG_POLY + inPoly）裁剪。GridCell.val ∈ [28,98]。

### 城市数据血缘（来源按市场切换，诚实优先）
- `indicatorMeta[component]` 逐指标含 status(real/proxy)/actualSource(当前实际来源)/futureSource(计划接入的
  真实来源)/source/date/method/coverage/confidence。**当前全为 status=proxy**：actualSource 为空、
  method 如实标注「商圈类型预设值 + 确定性扰动」，绝不在 excuse 上假装是官方统计算出来的。
- SG 指标未来来源=SingStat/LTA/URA/STB，HK=政府统计处/规划署/运输署/MTR/旅发局，**禁止跨市场串源**。
- 前端按 status 显示「数据状态/实际来源/未来来源/计算方法」证据块；「数据来源」段展示的是**接入蓝图**
  (PROXY/DEMO + 计划真实源)，不是用真实数据算出的声明。
- 所有数值为代理/演示 → 不可据此投资；接入真实源后把 status 改 real 并填 actualSource。

### 主题分析（Theme 真切换，非只渲染地图）
- 主题切换后，右侧大数字与短名单榜单必须用**对应分量**（transit/commercial/young/resident/tourism）在市域内
  重新排名 —— 用 `themeInfo(d, theme, districts)`（排名对标全量 districts，非被筛选的 filtered）；overall 才用
  active_score/全局 rank。**禁止**主题下仍显示综合活跃度。

### API（全部需 Bearer 登录令牌；见 src/app/api/**/route.ts）
POST /api/auth/login、GET /api/auth/me、GET /api/auth/demo（游客直通，GRIS_DEMO_ANON=0 关闭）、GET /api/scout/boot、
GET /api/scout/districts?market=、GET /api/scout/district/[market]/[key]、
GET /api/scout/grid?market=&theme=、GET /api/scout/places?q=&lat=&lng=、
GET /api/scout/tradearea?market=&key=&radius=(km)、GET/POST/DELETE /api/scout/candidates、GET /api/audits。

### Trade Area（真实空间聚合，禁止线性乘法；当前如实标注局限）
- `scout.getTradeArea`：以商圈为圆心、半径内周边商圈按权重 (1-d/R)² 做核密度聚合，返回 population/
  traffic/competitors/commercial + sampledDistricts/coveredRate + proxy。值随地理分布非线性变化；
  **严禁**用 `1km 数据 × 0.5/1.5` 线性外推。
- **已知局限**：底层仅 25 个商圈中心点，当半径内仅覆盖单一中心时（Orchard 500m–1.5km）无法区分周边差异，
  method 会如实注明需接入 H3 网格（GRIS V1）。不要用更细的伪合成面假装解决——那仍是假数据。

### 审计（audit_log 必须含 ip 列，否则写入静默失败）
- `audit_log` schema 含 `ip TEXT NOT NULL DEFAULT ''`（老库用 ALTER 迁移），`writeAudit` 写 actor/method/
  path/status/ip/at 六列。**缺 ip 列时 INSERT 抛错被 catch，审计从不上库**——改 schema 后需删 `data/scout.db`
  重建，或确认 ALTER 已生效。

### 默认登录账号
管理员：`admin` / `gris-admin-2024`（位于 src/lib/auth.ts ADMIN_PASSWORD_HASH，可改）。

### 前端
- `src/app/page.tsx` → `src/components/scout-board.tsx`（三栏考察台，客户端组件）；
  地图 `src/components/map/scout-map.tsx` 通过 `dynamic(..., {ssr:false})` 懒加载
  （react-leaflet v5 + OSM 瓦片，无需 key，`preferCanvas`）。
- `/audit` 审计日志；`src/components/app-shell.tsx`（鉴权门 + 侧边栏 HK/SG 切换 + useMarket 上下文），
  `login.tsx` 登录页。
- 暗色制图风格 Token 定义在 `src/app/globals.css` 的 `.dark` 块（陶瓷琥珀 #e0a458 点缀）；详见 `DESIGN.md`。

### 数据源接入（真实数据需配置 key，未配置则走明确标记的演示分级数据）
- `GOOGLE_PLACES_API_KEY`：配了 → `/api/scout/places` 走真实 Google Nearby Search 竞品；
  未配 → `fixture()` 返回 `real:false` 的演示分级 POI，前端会展示「演示数据」角标。
- 地图底图用开源 OSM 瓦片，无 key 依赖；Firestore / Cloud Run / LTA 等新加坡官方数据源为后续升级位
  （参考方案文档中的 roadmap），当前以 adapter + fixture 隐式降级，不阻塞演示。

### Stage 1 — Truth/Street-Heat 真相层（GRIS_Singapore_Truth_Street_Heat_Upgrade_Spec）
核心目标：地图任意点的「数字」都能回答来源/方法/日期/置信度；诚实优先，无 key 一律标
`unavailable/proxy`，绝不把「商圈类型预设值 + 确定性扰动」冒充官方统计。
- **打分**：`src/lib/scoring/config.ts` 唯一权重来源（O=0.35T+0.25C+0.15Y+0.15R+0.10T），
  `MODEL_VERSION='gris-oi-v1'`；改变即递增并记 AGENTS。`scout.parseRow` 现已填
  `district.model_version` + `opportunity_index`（=旧 composeScore 同构，保留 alias）。
- **血缘**：`src/lib/scoring/provenance.ts` → `proxyProvenance()` 构造各分量诚实 DataProvenance；
  `src/lib/sources/registry.ts` 声明每层 real/unavailable + future_source + env_key；
  `DATA_MODE`(truth/demo) 环境变量，`dataMode()` 读取。**禁止无 key 时标 real。**
- **空间层** `src/lib/spatial/`：`geometry`(haversine≈104/111、inPoly、round×网格交叠 sample)、
  `decay`(gauss 平滑 + thresholdKernel (1-d/R)²)、`cells`(固定网格，H3 前来替代，SG_POLY 裁剪)、
  `heat`(bbox+zoom 懒加载连续热面，`bandwidthForZoom` 缩放带宽，provider real/demo)、
  `catchment`(任意点圆×网格交叠 pop/traffic/comp/commercial + cells 高亮 + proxy)。用固定网格而非真 H3。
- **新 API（均需 Bearer）**：`/api/scout/data-status?market=`、`/api/scout/heat?bbox&zoom&theme`、
  `/api/scout/point?lat&lng`、`/api/scout/catchment?lat&lng&radius`。
- **前端**：scout-board 默认走 `数据状态`(data-status pill) + 地图空白处点击 → 任意点分析面板
  （point 分量估值 + catchment 半径 0.5/1/1.5km 切换 + 诚实 method 提示）；map 新增
  `onPlainClick` + `focus` 圆环、`onViewChange`（scout-map ClickCatcher + ViewReporter）。
  **街道热力已接线**：mode 默认 `heat`，`ViewReporter` 上报 bbox+zoom（防抖 250ms）→
  `/api/scout/heat` 懒加载，带宽随 zoom（`bandwidthForZoom`）缩放；`provider`(real/demo) 显示在左下角。
- **Places 网络降级**：`GOOGLE_PLACES_API_KEY` 配了且外网可达 → 真实 Nearby Search（real:true）；
  若 `fetch` 抛错（如沙箱无外网 egress）会 **catch 后回退演示**（real:false），不再 500。
  即：key 必须部署在有外网访问 Google 的环境才生效，沙箱预览只能得到演示分级竞品。
- **数据源 key**：`GOOGLE_PLACES_API_KEY`（用户将提供）、`GRIS_LTA_ACCOUNT_KEY`、`GRIS_ONEMAP_TOKEN`
  ≈ LTA/OneMap/SingStat 接入位；未配则全部 unavailable + honest note。**禁止跨城市串源。**

### 常见问题与预防
- 改 schema/种子后删 `data/scout.db`（或升 SCHEMA_VERSION）触发重建+重种子；DB 文件勿提交。
  重建后旧库的 audience 字段（旧 flat 人群）需同步升级为 identity/age 双组，否则 parseRow 解析会错。
- 前端调用一律相对路径 `/api/...`，禁止硬编码域名/localhost。
- 令牌由模块级 SECRET 常量签名（auth.ts），改动会使历史令牌失效（正常）。
- 严禁在 `'use client'`（scout-board / scout-map）import better-sqlite3 或 db.ts/scout.ts；
  类型一律走 `scout-types.ts` 的 `import type`（否则客户端 bundle 启动即崩）。
- 网格/证据卡数据来自确定性种子；如需真实客流/客群，按「数据源接入」配置 key 或换官方数据源 adapter。

### Tailwind v4 常见坑
- 在 `globals.css` 里通过 `@import url(...)` 引入 Google Fonts 时，必须把它放在**文件第一行、`@import 'tailwindcss'` 之前**；否则 Tailwind v4 就地展开 `tailwindcss` 后会把字体 `@import` 顶到编译产物中段，触发 `@import rules must precede all rules` 编译失败、页面全部 500。
### 会话鉴权（重要）
- 登录成功返回 `{success,user,token}`；前端把 token 存 `localStorage['gris_token']`，后续请求通过
  `Authorization: Bearer <token>` 携带（兼容 iframe 预览，浏览器会屏蔽第三方 iframe 的 cookie，Cookie 已弃为主方案，仅作兜底）。
- 前端 `api()` 助手：401 时清 token 并回登录页；非 200 时抛错（各页面依赖此行为，勿改成静默放行错误体，否则会出现
  `Cannot read properties of undefined (reading 'siteCount')` 类崩溃）。
- **游客直通演示会话**（`GET /api/auth/demo`）：无有效会话时前端自动拉起，签发 role=`demo` 的免密 token 直通进入，跳过登录页。
  仅用于演示预览；`GRIS_DEMO_ANON=0` 环境变量可关闭（此时回落 LoginPanel）。正式产品应关闭游客直通、改用邀请制。
- **环境变量**：`GRIS_AUTH_SECRET`(令牌签名，改动使历史令牌失效) / `GOOGLE_PLACES_API_KEY`(配后 Places 走真实数据，未配自动演示降级) /
  `GRIS_DEMO_ANON`(1 默认开=游客直通，0=关闭强制登录)。清单见 `.env.example`。
