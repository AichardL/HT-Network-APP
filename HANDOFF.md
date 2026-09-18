# GRIS 选址考察台（Scout）· 交接简报

> 本文件用于把当前项目整体交接给另一名 AI 助手（如 ChatGPT）继绿开发。请先阅读 `AGENTS.md`、`DESIGN.md`、`README.md`，再读本文件；交接时随附 `gris-source.tgz`。
> 若你有《Singapore_Site_Selection_Full_Plan.md》原始方案文档，也一并交给对方作为需求基线。

---

## 0. 一句话定位
香港 / 新加坡**茶饮门店选址考察台**：商圈评级 → 全城网格扫描 → 证据卡 → 候选点沉淀。当前是「阶段 0 概念 Demo（约 85%）」，**尚未达到「阶段 1 新加坡真实数据 MVP」**。

## 1. 技术栈（不许改）
- Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui
- 底层库：`better-sqlite3`（Node 原生嵌入式，运行时 `data/scout.db` 自动建库+灌种子）
- 地图：react-leaflet v5 + OSM 瓦片（无 key）；Leaflet 通过 `dynamic(..., {ssr:false})` 懒加载
- 包管理：**只用 `pnpm`**，严禁 npm/yarn
- 预览/服务端口固定 `5000`，绑定 `0.0.0.0`；`9000` 是系统保留端口**禁用**

## 2. 不可违反的硬约束（接手必读）
- **`next.config.ts` 已设 `serverExternalPackages:["better-sqlite3"]`**。严禁在 `'use client'` 组件里 `import db.ts/scout.ts`，只能 `import type`，且类型走 `scout-types.ts`（否则客户端 bundle 启动即崩）。
- **人群模型**是两组独立互斥维度，各求和=100%、逐项非负：
  - 身份 identity：`resident/office/tourist/student/other`；
  - 年龄 age：`a18_24/a25_34/a35_44/a45_plus`。
  - `makeShares` 用 largest-remainder 归一化。**严禁**用「游客=100%-…」反推混算（历史上这曾造出 -8%/-11%）。
- **数据血缘按市场隔离**：SG 用 SingStat/LTA/URA/STB，HK 用 政府统计处/规划署/运输署/MTR/旅发局；**禁止跨市场串源**（公信 HK 必须用 HK 官方源）。
- **Trade Area 必须是真实空间聚合**：以商圈为圆心、半径内周边商圈按权重 `(1-d/R)²` 核密度聚合，返回人口/客流/竞品/商业 + `sampledDistricts`。**严禁** `1km数据 × 0.5/1.5` 线性外推。
- 前端一律相对路径 `/api/...`，禁止硬编码域名/localhost。
- `data/scout.db` 是运行时生成，**勿提交**；改 schema/种子后删库重建（或升 SCHEMA_VERSION）。
- 各指标为**代理指标 + 来源/日期/方法/覆盖率/置信度**，前端要有醒目「演示/代理」角标，不冒充真实信令。

## 3. 数据层
- `src/lib/db.ts`：连接 + Schema + 确定性种子（mulberry32 + TYPE_BASE，SG 26 商圈 / HK 8 商圈）。
- `src/lib/scout-types.ts`：纯共享类型（District/Market/GridCell/Candidate/TradeAreaStats/IndicatorMeta/Identity/StrucAge）。
- `src/lib/scout.ts`：服务层（listMarkets/listDistricts/getDistrict/generateGrid/listCandidates/saveCandidate/deleteCandidate/composeScore/computeTradeArea）；综合分 `0.35交通+0.25商业+0.15年轻+0.15社区+0.10游客`；高斯平滑网格、SG 按真实陆地多边形（SG_POLY+inPoly）裁剪。
- `src/lib/sources/places.ts`：Google Places adapter（有 key 真数据 / 无 key 演示降级）。
- `src/lib/api.ts`（鉴权+审计）、`src/lib/auth.ts`（令牌签名，Bearer 优先/cookie 兜底）。

district 冗余列（JSON）：components / metrics / identity / age / indicatorMeta / evidence / confidence / rank / active_score / sources。

## 4. API（均需 Bearer 登录令牌，游客直通也签发 demo 令牌）
- `POST /api/auth/login`、`GET /api/auth/me`、`GET /api/auth/demo`（游客直通，`GRIS_DEMO_ANON=0` 关闭）
- `GET /api/scout/boot`、`districts?market=`、`district/[market]/[key]`、`grid?market&theme`、`places?q&lat&lng`、`tradearea?market&key&radius(km)`
- `GET/POST/DELETE /api/scout/candidates`、`GET /api/audits`
- `POST /api/auth/demo` 签发 `role=demo` 令牌，可访问全部业务 API。

## 5. 前端
- `src/app/page.tsx` → `src/components/scout-board.tsx`（三栏考察台，client）。
- `src/components/map/scout-map.tsx`：Leaflet 地图（网格/热力、地铁、竞品、Trade Area 圆、商圈排名点）。
- `src/components/app-shell.tsx`：鉴权门 + 游客直通 + SG/HK 切换 + `useMarket()` 上下文；`login.tsx` 登录页。
- `/audit` 审计页。暗色制图 Token（陶瓷琥珀 #e0a458）在 `globals.css` 的 `.dark` 块，详见 `DESIGN.md`。

## 6. 环境变量（见 `.env.example`）
- `GRIS_AUTH_SECRET`（令牌签名，生产必改；改动使历史令牌失效）
- `GOOGLE_PLACES_API_KEY`（配后 Places 走真实 Nearby Search；未配自动演示降级）
- `GRIS_DEMO_ANON`（`1` 默认开=游客直通，`0`=关闭强制登录）

## 7. 版本/账号
- 默认管理员 `admin / gris-admin-2024`（`auth.ts` 的 ADMIN_PASSWORD_HASH）。正式环境须改。

## 8. 已明确的缺口（下一个迭代目标 = 新加坡数据真实性，按此顺序）
1. 暂停扩展香港。
2. 接入新加坡真实边界 + **H3 res9 连续网格**（当前只是预设商圈周围视觉网格，非真 H3；需 图例/视野版本号/任意点街铺可点分析/平移缩放懒加载）。
3. 数据源管道：SingStat / OneMap（有公开 endpoint 可真实调）/ LTA / OSM，agent + env key；无 key 显式降级。
4. Trade Area 升级为「网格×圆面积交叠 + POI 落点统计 + 客流衰减 + 去重」。
5. 血缘字段补全：`source_date / data_version / method / confidence_score / confidence_reason / spatial_granularity / missing_note`。
6. 竞品：接入真实 Places（待 `GOOGLE_PLACES_API_KEY`），分类/品牌/去重/营业状态/连锁 vs 独立/竞争密度。
7. 候选点完整工作流：项目 / 具体点位类型 / 状态 / 租金面积考察 / 3-5 点横比 / 数据快照 / PDF 摘要。
8. 协作与安全：角色（admin/member/viewer）、Google 邀请制登录、审计真实写入。

## 9. 验收方式
- `pnpm ts-check`、`pnpm lint`、`pnpm build` 通过 + 业务接口 `curl` 冒烟（如：mock 登录→boot/grid/district/tradearea/candidates 均 200、人群无负数、Trade Area 随商圈真实聚合）。
- 前端功能改动要在预览里实际走主路径（登录→选商圈→地图网格→证据卡→存候选），不能用「构建通过」冒充「功能可用」。

## 10. 交接给 ChatGPT 的推荐做法
1. **新建 ChatGPT Project**；在项目「Instructions（指示）」里粘贴第二节「不可违反的硬约束」和第三节起的关键结论（或用 `AGENTS.md` 内容）。
2. 上传 `gris-source.tgz`（整包源码）+ 本文档 `HANDOFF.md` + 你的《Singapore_Site_Selection_Full_Plan.md》方案。
3. 一次给一个任务，从「第 8 节第 1 项」开始，让它先读 `AGENTS.md`/`HANDOFF.md` 再动手，勿让它重排技术栈。