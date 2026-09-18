# GRIS / HT-Network-APP — Singapore Truth Layer & Street Heat 升级规范

> 用途：本文件直接交给 coding agent / Codex / Claude Code 等，作为下一阶段修改 `https://github.com/AichardL/HT-Network-APP.git` 的开发指令。
>
> 版本日期：2026-09-18
>
> 核心目标：**暂停继续扩功能，先把新加坡的数据真实性和街道级热点能力做真。**

---

## 0. 执行前必须先读

Coding agent 开工前必须先阅读仓库中的：

1. `AGENTS.md`
2. `HANDOFF.md`
3. `DESIGN.md`
4. 本文件

不要重构既定技术栈，不要为了“更现代”随意替换 Next.js / SQLite / Leaflet / Tailwind / shadcn。

当前技术栈继续保持：

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- `better-sqlite3`
- react-leaflet / Leaflet
- pnpm

---

# 1. 这轮迭代的产品定义

当前产品已经具备较完整的“选址分析产品 Demo”框架：

**城市 / 商圈扫描 → 主题分析 → 地图 → Trade Area → Evidence → Candidate**

下一轮不要继续新增大量功能，而是把产品从：

> 看起来像真实选址系统

升级为：

> 核心数字确实来自真实数据，并且用户能在街道级看到哪里热、为什么热。

本阶段命名建议：

# `GRIS V1 — Singapore Truth Layer / Street Heat MVP`

本阶段只聚焦 **Singapore**。

香港先保留现有 Demo，不继续扩建。

---

# 2. 当前版本中已经修好的问题 —— 不要回退

以下问题已经在当前 `main` 中修正，后续开发必须保留：

## 2.1 Theme 切换后的分数与排名

`src/components/scout-board.tsx` 已通过 `themeInfo()` 按当前主题读取：

- `transit`
- `commercial`
- `young`
- `resident`
- `tourism`

并在市域内重新排序。

不要退回到所有 Theme 都使用 `active_score` / 综合排名。

## 2.2 数据真实性标识

Evidence Card 已开始区分：

- `real`
- `proxy`
- demo

并展示：

- 实际来源
- 未来来源
- 数据日期
- 方法
- 覆盖率
- 置信度

这一方向必须保留并加强。

## 2.3 Trade Area 代理提示

当前系统已经会在中心点模型无法分辨 500m / 1km / 1.5km 时明确提示局限，而不是把代理值伪装成真实 catchment。

这个原则必须继续：

> **算法不真实时，必须明确告诉用户不真实，而不是制造假精确。**

## 2.4 Audit schema

此前 audit log 的 `ip` 字段问题已经修正，后续不要破坏 migration。

---

# 3. 当前最重要的结构性问题

## 3.1 当前核心指标仍然是代理生成，不是真实数据计算

当前 `src/lib/db.ts` 中仍存在：

- `TYPE_BASE`
- `mulberry32`
- `vary()`

当前逻辑本质仍然是：

```text
商圈类型
  ↓
基础分 TYPE_BASE
  ↓
确定性伪随机扰动
  ↓
transit / commercial / young / resident / tourism
  ↓
再反向生成 population / traffic / competitors / commercial
```

生产 / Truth 模式下必须逐步淘汰这条链。

代理数据可以保留为 **Demo fallback**，但不能继续作为 Singapore Truth Layer 的主要输入。

---

## 3.2 当前 Grid 不是实际空间数据网格

`src/lib/scout.ts -> generateGrid()` 当前逻辑是：

```text
25 个左右商圈中心 hub
  ↓
按当前主题读取商圈分数
  ↓
高斯扩散 / 平滑
  ↓
得到视觉连续面
```

所以当前网格的意义是：

> **Analytical / Visual Surface**

而不是：

> **真实空间数据单元**

下一阶段必须让 Heatmap 的输入来自真实的：

- MRT / bus 客流
- Population / Age
- POI / Mall / F&B
- Competitor

而不是商圈分数再扩散。

---

## 3.3 当前 Trade Area 仍是商圈中心点聚合

当前 `getTradeArea()` 仍然是：

```text
目标商圈中心
  ↓
寻找半径内其他商圈中心
  ↓
(1 - d/R)^2 距离衰减
  ↓
聚合 population / traffic / competitor / commercial
```

这比线性放大正确，但空间粒度仍然太粗。

未来 Trade Area 必须改成：

> **真实空间单元 + POI point + 交通 point 的空间聚合**

不能再以“有没有另一个商圈中心落在圆里”决定 500m / 1km / 1.5km 的变化。

---

# 4. 最重要的产品调整：前端目标是 Street Heat，不是 H3 Hexagon

## 4.1 H3 不是产品目标，也不是前端必须展示的东西

不要把本项目理解成：

> “下一步就是把地图铺满 H3 六边形。”

这是错误目标。

用户真正想要的是：

> **打开地图就能看到街道层级哪里热，并且放大后能看出 MRT 出口、Mall、主街、背街之间的热点差异。**

因此：

### 前端应该优先展示

- 连续 Heatmap
- Density Surface
- Hotspot
- 后续可升级成 Street / Pedestrian Heat

### H3 如果使用

只把它作为后台：

- 空间索引
- 统一数据容器
- 预计算单位
- Catchment 快速聚合单位
- 缓存单位

**不要默认把 H3 polygon 直接展示给用户。**

---

# 5. H3 到底怎么用 —— 可选后台方案，不是硬性 UI

## 5.1 H3 的正确定位

不同数据的空间形态不同：

- MRT station = Point
- MRT exit = Point
- Google Places = Point
- Population = Planning Area / Subzone Polygon
- Mall = Point / Polygon
- Road / walkway = Line
- Candidate = Point

需要一个共同的空间分析单元。

H3 可以把新加坡切成很多小 cell，每个 cell 存：

```text
cell_id
population
population_18_34
transit_heat
commercial_heat
competitor_density
mall_count
fnb_count
hotel_count
...
```

这样用户点击任意位置时，可以很快聚合附近 cells。

---

## 5.2 但 H3 不是唯一方案

如果 coding agent 认为普通固定网格更适合，也可以使用：

- 100m × 100m grid
- 150m × 150m grid
- 200m × 200m grid

关键要求不是“必须 H3”，而是：

> 必须存在一个真实、统一、可复算、可聚合的空间单元。

如果采用 H3：

- 推荐先测试 `res 9`
- 但不要把 `res 9` 当宗教要求
- 应根据街道级分析精度、性能、数据粒度测试后决定

---

## 5.3 前后端关系

推荐架构：

```text
真实原始数据
   ↓
空间标准化 / H3 或固定 grid
   ↓
预计算各类 density / score
   ↓
API
   ↓
连续 Heatmap / Street Heat
```

用户看到：

> 街道 + 热点

系统后台看到：

> cell / spatial index

---

# 6. 核心数据源 —— 三套必须全部接，不是三选一

本阶段不要只接其中一个。

以下三套核心数据源都需要进入 Singapore Truth Layer：

1. **LTA DataMall**
2. **OneMap + SingStat / data.gov.sg**
3. **Google Places API (New)**

此外可接：

4. OSM
5. URA
6. STB

其中前三个是第一阶段核心。

---

# 7. 数据源 A：LTA DataMall —— Transit Truth Layer

## 7.1 第一批必须接

### Train Station

用于：

- MRT / LRT station point
- station location

### Train Station Exit Point

用于：

- 真正站口位置
- 街道级可达性
- 距离衰减起点

### Passenger Volume by Train Stations

用于：

- station tap-in
- station tap-out
- weekday / weekend
- monthly refresh

这是 Transit 热度最核心的真实数据之一。

### Passenger Volume by Bus Stops

建议一并接入：

- bus stop boarding / alighting
- weekday / weekend

### Bus Stops

用于空间点位和客流定位。

---

## 7.2 第二批可接

- Passenger Volume by Origin Destination Train Stations
- Passenger Volume by Origin Destination Bus Stops
- Station Crowd Density Forecast
- Station Crowd Density Real Time

OD 数据后续可以支持：

- 通勤流向
- Origin / Destination demand
- 不同商圈之间关联

但不要因为 OD 数据暂时没做而阻塞第一版 Street Heat。

---

# 8. 数据源 B：OneMap + SingStat —— Demographic Truth Layer

## 8.1 OneMap

使用：

- Planning Area / Subzone boundary
- Population Query
- 官方地理空间边界

OneMap Population Query 可获得官方人口统计维度，例如：

- Age group
- Household size
- Economic status
- Dwelling type
- 其他人口属性

注意：OneMap Population API 当前需要 token-based authentication。

---

## 8.2 SingStat / data.gov.sg

第一阶段至少接：

### Resident Population by Planning Area/Subzone × Age Group × Sex

用来替换目前随机 / 代理的：

- population
- young
- age structure

### 可选但建议：Dwelling / Household

用来增加 Residential quality / community profile。

---

## 8.3 人口数据如何落到空间网格

人口通常不是 point，而是 Subzone polygon。

第一版允许使用：

```text
Subzone population
   ↓
polygon × cell overlap
   ↓
按面积比例分配到 cells
```

必须明确记录：

- 原始粒度 = Subzone
- 空间分配方法 = area-weighted interpolation
- source year
- 不等于实时人口

未来可以再加：

- residential building footprint
- land use masking
- dwelling weights

进一步提高精度。

---

# 9. 数据源 C：Google Places API (New) —— Commercial / POI / Competitor Truth Layer

当前项目已有 `src/lib/sources/places.ts` adapter，需要继续使用并升级。

## 9.1 必须采集的 POI 类型

至少包括：

- restaurant
- cafe
- shopping_mall
- store / retail
- lodging / hotel
- tourist_attraction
- university / school（按需要）

---

## 9.2 Competitor 不能只搜索“茶饮”一个关键词

建立品牌字典，例如：

- CHAGEE
- KOI
- CHICHA San Chen
- LiHO
- Gong Cha
- HEYTEA
- Mixue
- Luckin
- Starbucks
- 其他目标品牌

保存至少：

```text
place_id
brand
name
lat
lng
types
business_status
address
source_date
```

用 `place_id` 去重。

不要简单地把“竞品越多 = 越差”。

竞争模块建议后续拆：

- Demand Validation
- Competitive Intensity
- Brand Saturation
- Whitespace

---

# 10. 辅助数据源

## 10.1 OSM

用途：

- pedestrian network
- walkable roads
- walkways
- building / amenity
- 基础城市骨架

OSM 不必替代 Google Places。

建议：

```text
OSM = 城市 / 步行网络骨架
Google Places = 商业 POI / 品牌 / 营业状态
```

---

## 10.2 URA

用于：

- land use
- planning boundary
- Master Plan
- 商业 / 住宅 / 工业用途辅助判断

后续可用于人口空间分配的 land-use mask。

---

## 10.3 STB

Tourism 暂时不要硬做成“绝对真实游客流”。

若无法得到高粒度游客流，使用明确的：

# Visitor Economy Proxy

可由：

- hotels
- attractions
- tourism-oriented malls
- landmarks
- airport / cruise related nodes

构成。

必须显示 `PROXY`，不能伪装成实时游客流。

---

# 11. Street Heat 是这轮真正要做的地图能力

## 11.1 默认地图体验

用户打开 Singapore 后，默认应该优先看到：

# Continuous Heatmap

而不是满屏 hexagon。

现有：

- `grid`
- `heat`

两个模式可以保留，但建议：

- `heat` = 默认业务模式
- `grid` = debug / 数据检查模式，或弱化

---

## 11.2 Transit Heat

MRT station / exit 不应该只显示一个 marker。

应该形成空间影响：

```text
station passenger volume
×
distance decay
```

例如概念上：

```text
0m      → 100%
200m    → high
400m    → medium
600m    → low
800m+   → near zero
```

具体 decay 参数必须可配置，后续用真实门店表现校准。

建议不要在代码里散落 magic number。

统一写进：

```text
src/lib/config/scoring.ts
```

或等价配置文件。

---

## 11.3 Commercial Heat

POI 不应该简单计数后直接着色。

建议：

```text
commercial_heat =
weighted_fnb_density
+ mall_influence
+ retail_density
+ office_proxy
+ hotel_density
```

第一版权重可以是业务假设，但必须与原始数据分开保存。

也就是说：

- `fnb_count` 是事实
- `commercial_score` 是模型

不要混成一个字段。

---

## 11.4 Population / Young Heat

Population 由 Subzone 分配到空间单元后，可以生成：

- population density
- 20–34 / 18–34 share
- residential density

不要继续用 TYPE_BASE 随机生成。

---

## 11.5 Competition Heat

至少提供：

- all tea competitors
- premium tea competitors
- coffee competitors
- HEYTEA existing stores

地图上允许切换。

---

# 12. Heatmap 的技术原则

## 12.1 第一版允许 Euclidean distance decay

先用真实点位 + 距离衰减即可。

不要为了“一步做到极致”而阻塞项目。

## 12.2 第二阶段升级 Pedestrian Heat

普通 heatmap 的问题是：

- 热度会穿河
- 会穿建筑
- 会跨无法步行的道路

因此后续升级：

```text
OSM pedestrian network
  ↓
network distance
  ↓
pedestrian decay
```

例如：

> MRT Exit → walkway → mall entrance → street frontage

这比 straight-line distance 更接近真实步行人流。

但这一阶段可以放在真实数据 Heatmap 跑通之后。

---

# 13. Trade Area 改造

## 13.1 当前圆形 Trade Area 可以先保留 UI

保留：

- 500m
- 1km
- 1.5km

但计算逻辑必须逐步换掉。

---

## 13.2 新计算逻辑

点击任意 location：

```text
lat/lng
  ↓
radius polygon
  ↓
与空间 cells 相交
  ↓
population 按 overlap ratio 聚合
  ↓
POI 按 point-in-polygon 统计
  ↓
transport 按 point / decay 聚合
  ↓
dedupe
```

不再依赖商圈中心点。

---

## 13.3 Population overlap

一个 cell 只有 30% 位于 catchment 内，则：

```text
population_contribution
= cell_population × 0.30
```

至少对于连续型人口数据这样处理。

---

## 13.4 POI 不做面积权重

POI 是 point：

- 在 polygon 内 → count
- 不在 → 0

必须按 `place_id` / source id 去重。

---

# 14. 后续 Trade Area 应升级为 Walk-Time Isochrone

对于街铺和 Mall 点位，500m / 1km 圆不是最终答案。

未来增加：

- 5 min walk
- 10 min walk
- 15 min walk

也就是：

# Walk-Time Catchment / Isochrone

真实消费者不会穿墙、穿河、穿高速。

因此点铺阶段应该最终使用 pedestrian network catchment。

但是本轮不要因为 isochrone 没做完而阻塞真实数据接入。

---

# 15. 数据状态 UI 必须从“页面一个真假状态”升级成“每层状态”

当前系统中 `placesEnabled` 只代表 Google Places 是否接通。

不能因为 Places 为真，就让用户理解为“整页数据实时”。

增加统一 Data Status：

```text
Transit          REAL
Population       REAL / HISTORICAL
Young            REAL / HISTORICAL
Commercial       REAL / MIXED
Competition      REAL
Tourism          PROXY
```

页面顶部可以展示：

```text
DATA STATUS: MIXED
4 REAL / 1 HISTORICAL / 1 PROXY
```

或类似表达。

---

# 16. 每个指标必须有完整 Provenance

统一扩展字段，不要只写 `source`。

建议：

```ts
interface DataProvenance {
  status: 'real' | 'historical' | 'proxy' | 'mixed' | 'unavailable';
  source_name: string;
  source_url?: string;
  source_date?: string;
  data_version?: string;
  ingested_at?: number;
  method: string;
  spatial_granularity: string;
  confidence_score?: number;
  confidence_reason?: string;
  missing_note?: string;
}
```

对于所有 score 必须能回答：

> 这个数字来自哪里？
> 哪一天的数据？
> 原始粒度是什么？
> 怎么变成当前值？

---

# 17. 数据库建议结构

不要只保存最终 score。

必须保存 Raw → Spatial → Aggregate → Score 各层。

推荐：

## 17.1 source_registry

```text
source_key
source_name
provider
status
last_sync_at
source_date
data_version
notes
```

## 17.2 lta_train_stations

```text
station_code
station_name
lat
lng
source_date
```

## 17.3 lta_train_exits

```text
exit_id
station_code
lat
lng
source_date
```

## 17.4 lta_station_volume

```text
station_code
period
weekday_tap_in
weekday_tap_out
weekend_tap_in
weekend_tap_out
```

## 17.5 lta_bus_stops

```text
bus_stop_code
lat
lng
```

## 17.6 lta_bus_volume

```text
bus_stop_code
period
weekday_tap_in
weekday_tap_out
weekend_tap_in
weekend_tap_out
```

## 17.7 population_zones

```text
zone_id
planning_area
subzone
geometry
source_year
population_total
population_20_34
...
```

## 17.8 places

```text
place_id
provider
name
brand
category
lat
lng
business_status
address
raw_json
source_date
updated_at
```

## 17.9 spatial_cells

如果使用 H3：

```text
cell_id
resolution
center_lat
center_lng
geometry
population
population_20_34
transit_heat
commercial_heat
competition_heat
tourism_proxy
updated_at
```

如果不用 H3，则将 `cell_id/resolution` 替换成普通 grid id。

## 17.10 score_snapshots

```text
entity_type
entity_id
theme
score
model_version
source_snapshot
created_at
```

---

# 18. Scoring 需要区分“事实”和“模型”

当前 `composeScore()` 权重：

```text
0.35 transit
0.25 commercial
0.15 young
0.15 resident
0.10 tourism
```

可以先保留作为 V1 模型假设，但：

1. 不要再把它叫绝对“选址评分”
2. 推荐改名：

# `Opportunity Index / 商圈机会指数`

3. 所有 component 必须先来自真实 / 可解释的 raw metrics
4. 权重进入 versioned config
5. 保存 `model_version`

---

# 19. 竞争不是单纯负分

不要用：

```text
competitor_count 越高 → score 越差
```

这种简单逻辑。

茶饮高密度本身可能证明 demand。

后续建议拆成：

```text
Demand Validation
Competitive Intensity
Brand Saturation
Whitespace
```

第一版本可以先展示原始 competitor density，不急着把竞争压成一个最终负权重。

---

# 20. Candidate 暂时不要继续做复杂

当前 Candidate 本质仍接近 Bookmark：

```text
market
area
name
lat
lng
note
```

未来当然应该升级到：

- project
- mall
- unit
- status
- rent
- area
- frontage
- site visit
- photos
- economics

但是：

# 当前不是优先项。

本轮不要让 Candidate workflow 分散资源。

先把 Singapore Truth + Street Heat 做出来。

---

# 21. 暂停香港扩展

本轮：

```text
SG = Truth Layer
HK = 保留 Demo
```

不要同时为香港建立真实数据 pipeline。

代码结构继续保持 multi-market 兼容，但开发资源优先 SG。

---

# 22. 建议代码结构

建议新增：

```text
src/lib/sources/
  lta.ts
  onemap.ts
  singstat.ts
  places.ts
  osm.ts
  ura.ts

src/lib/spatial/
  cells.ts
  heat.ts
  decay.ts
  catchment.ts
  geometry.ts

src/lib/scoring/
  config.ts
  normalize.ts
  opportunity.ts
  provenance.ts

scripts/
  sync-sg-lta.ts
  sync-sg-population.ts
  sync-sg-places.ts
  sync-sg-all.ts
```

不要把所有数据拉取、空间计算、评分继续塞进 `scout.ts`。

`scout.ts` 应逐步变成 service orchestration，而不是所有逻辑的单文件中心。

---

# 23. 建议 API

## 23.1 Heat API

```text
GET /api/scout/heat
  ?market=SG
  &theme=transit
  &bbox=...
  &zoom=...
```

返回当前视野需要的 heat points / tiles / cells。

必须做 bbox / zoom 懒加载，不要每次把全新加坡所有 raw points 全发前端。

---

## 23.2 Point Analysis

```text
GET /api/scout/point
  ?market=SG
  &lat=...
  &lng=...
```

支持用户点击地图任意点，不再只允许点击预设 district。

返回：

- nearest MRT / exit
- local heat values
- nearby POI
- current cell
- district / subzone
- provenance

---

## 23.3 Catchment API

```text
GET /api/scout/catchment
  ?market=SG
  &lat=...
  &lng=...
  &radius=1000
```

后续：

```text
&mode=walk
&minutes=10
```

---

## 23.4 Data Status

```text
GET /api/scout/data-status?market=SG
```

返回每层：

```json
{
  "transit": "real",
  "population": "historical",
  "commercial": "real",
  "competition": "real",
  "tourism": "proxy"
}
```

---

# 24. 地图前端改造

重点文件：

- `src/components/scout-board.tsx`
- `src/components/map/scout-map.tsx`

## 24.1 Heat 设为默认

用户首先看到真实热点，不首先看到数据格子。

## 24.2 Zoom-dependent Heat

城市尺度：

- 更平滑
- 更大 bandwidth

街道尺度：

- 更小 bandwidth
- 显示 station exit / mall / competitor

## 24.3 任意点点击

地图任意位置都应该可以：

- set selected point
- 运行 point analysis
- 运行 catchment

不要继续把“商圈中心点”当唯一入口。

## 24.4 商圈仍然保留

商圈变成：

> aggregation / navigation layer

而不是底层真实数据的最小单位。

---

# 25. 环境变量

建议增加：

```text
LTA_ACCOUNT_KEY=
ONEMAP_EMAIL=
ONEMAP_PASSWORD=
ONEMAP_TOKEN=          # 如果采用运行时 token 缓存，则不要直接长期写死
GOOGLE_PLACES_API_KEY=

# optional
URA_API_KEY=
```

任何 key：

- 不提交 Git
- 进入 `.env.local`
- `.env.example` 只留字段名

---

# 26. Demo fallback 原则

允许保留代理数据作为离线 / demo fallback。

但是必须区分模式：

```text
DATA_MODE=truth
DATA_MODE=demo
```

或等价机制。

Truth mode：

- 不允许 silently fallback 到 TYPE_BASE 后仍显示 REAL
- 数据缺失时显示 unavailable / proxy fallback

Demo mode：

- 可以使用现有 deterministic seed
- 明确展示 Demo

---

# 27. 本轮需要删除 / 避免的误导

## 不要：

- Google Places 接通后显示“整页实时数据”
- 把 proxy population 写得像真实人数
- 把 H3 六边形当产品卖点
- 把商圈中心点衰减叫做真实 Trade Area
- 把竞争密度简单作为负分
- 再增加大量香港功能
- 先做复杂 Candidate CRM
- 先做 AI Recommendation
- 在真实数据之前继续增加大 Dashboard

---

# 28. 实施优先级

## P0 — 保证现有功能不回退

- Theme rank / score
- audit
- data provenance UI
- demo fallback
- existing candidates

## P1 — Truth Data Ingestion

必须全部完成：

- LTA
- OneMap / SingStat
- Google Places

## P2 — Street Heat Engine

- transit heat
- commercial heat
- population / young heat
- competition heat
- opportunity heat

## P3 — Real Catchment

- arbitrary point
- circle polygon
- cell overlap
- point-in-polygon POI
- dedupe

## P4 — Pedestrian / Walk-time

- OSM pedestrian network
- network distance
- walk isochrone

## P5 — Candidate / Mall / Unit

完成 Truth Layer 后再推进。

---

# 29. 验收标准

## 29.1 数据真实性

任选一个地图点，必须可以追溯：

```text
score
↓
raw metric
↓
source record
↓
source name / date / method
```

不能只看到最终 0–100。

---

## 29.2 Transit

至少选 3 个 MRT 区域测试：

- Orchard
- Bugis
- Tampines / Jurong East 任选

地图 Transit Heat 应明显围绕真实 MRT / exit / ridership 变化。

---

## 29.3 Population

Population / young 指标不能再来自 `TYPE_BASE`。

必须能追溯到 OneMap / SingStat 数据。

---

## 29.4 Places

Google Places：

- 有 Place ID
- 有去重
- 有 category
- 有 source date
- API 未配置时明确显示 proxy / unavailable

---

## 29.5 Heatmap

必须做到：

- Heat 不是基于 district score 生成
- 缩放地图不会一次性加载全部不必要数据
- Heat layer 能按 theme 切换

---

## 29.6 Catchment

500m / 1km / 1.5km：

- 不再由“半径内商圈中心点数量”决定
- population 随真实空间 overlap 改变
- POI 随 point-in-polygon 改变
- 半径扩大后结果合理增加，但不要求线性增加

---

## 29.7 Data Status

页面必须明确显示每类数据：

- REAL
- HISTORICAL
- PROXY
- MIXED
- UNAVAILABLE

不能只有一个全局“实时数据”。

---

## 29.8 工程验收

必须至少通过：

```bash
pnpm ts-check
pnpm lint
pnpm build
```

并增加 automated tests，至少覆盖：

- source ingestion parser
- score normalization
- spatial aggregation
- catchment overlap
- provider fallback
- provenance status

不能只用“构建通过”证明功能正确。

必须实际在浏览器走：

```text
Singapore
→ Transit Heat
→ 点击任意街道点
→ 查看真实证据
→ 切换 Commercial / Competition
→ 500m / 1km catchment
→ 查看 provenance
```

---

# 30. Definition of Done

本轮完成时，应该出现以下体验：

用户打开 Singapore：

1. 首先看到连续真实 Heatmap
2. 切 Transit，热点来自 LTA，不来自 TYPE_BASE
3. 切 Young / Resident，来自官方人口数据
4. 切 Commercial / Competition，来自真实 Places
5. 放大到 Orchard / Bugis，可看到街道级热点差异
6. 点击地图任意位置，可以直接分析，而不是只能点预设商圈
7. 点击 500m / 1km / 1.5km，数据随真实空间变化
8. 每个数字都能看到 source / date / method / status
9. H3 即便存在，也只是后台计算机制，用户不需要理解 H3
10. 香港没有抢占本阶段开发资源

当以上成立后，GRIS 才从：

> `Stage 0 Concept Demo`

跨到：

> `Stage 1 Singapore Truth MVP`

---

# 31. Coding Agent 最重要的最终指令

> **不要把这个需求理解成“给现有网页加几个 API”。**
>
> 这轮真正要完成的是：把系统的底层逻辑从“商圈类型生成分数，再生成数据”改为“真实数据进入统一空间层，再生成 Heat / Catchment / Score”。
>
> 产品的地图目标不是展示 H3，而是展示街道级连续热点。H3 可以使用，但只作为后台空间索引、预计算和聚合工具。
>
> LTA、OneMap/SingStat、Google Places 三套核心数据都要接入，不是三选一。
>
> 优先 Singapore Truth Layer；不要继续扩香港，不要先做复杂 Candidate，不要继续以 UI 功能数量作为进度指标。

---

# 32. 开发参考资料

## Current repository

- https://github.com/AichardL/HT-Network-APP

## LTA DataMall

- Dynamic datasets: https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html
- Dataset search: https://datamall.lta.gov.sg/content/datamall/en/search_datasets.html
- API access: https://datamall.lta.gov.sg/content/datamall/en/request-for-api.html

重点数据：

- Train Station
- Train Station Exit Point
- Passenger Volume by Train Stations
- Bus Stops
- Passenger Volume by Bus Stops

## OneMap

- Population Query: https://www.onemap.gov.sg/apidocs/populationquery

## SingStat / data.gov.sg

- Resident Population by Planning Area/Subzone of Residence, Age Group and Sex (Census of Population 2020):
  https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view

## Google Places API (New)

- Overview: https://developers.google.com/maps/documentation/places/web-service
- Nearby Search: https://developers.google.com/maps/documentation/places/web-service/nearby-search

## H3

- https://h3geo.org/docs/

