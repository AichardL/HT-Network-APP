# 海外门店选址系统全套方案

> 文档用途：本文件是一份可以直接交给其他 AI、产品经理、设计师或开发团队继续执行的产品与技术规格书。
>
> 当前交互 Demo：<https://singapore-market-scout.heytea-9828.chatgpt.site>
>
> Demo 中的分数、热力、人口、客群和竞品均为演示代理数据，不是实测人流或正式投资依据。

---

## 1. 项目概述

### 1.1 产品目标

建设一套供小团队内部使用的海外门店选址决策系统，帮助团队完成：

1. 从城市全局筛选值得研究的商圈；
2. 从商圈下钻到商场、街区或具体铺位；
3. 查看人流潜力、客群、交通、商业设施和竞品；
4. 保存候选位置并进行横向比较；
5. 输出有来源、有置信度、可解释的选址证据；
6. 未来接入历史门店销售数据，增加新店销售预估。

系统不是大型 GIS 平台，也不面向公众商业化。重点是低维护成本、小团队协作和真实可用的数据分析流程。

### 1.2 城市范围

- 新加坡：第一优先级，先完成真实数据版本；
- 香港：第二优先级；
- 曼谷：第二阶段；
- 吉隆坡：第二阶段。

### 1.3 业态范围

第一版的默认模板为：

- 茶饮；
- 咖啡；
- 烘焙；
- 轻餐。

底层系统应支持多业态配置，但第一版不同时建设多个行业模型。每种业态通过配置目标客群、竞品集合和评分权重实现扩展。

### 1.4 已确认的产品取舍

- 销售预测不进入第一版；
- 不建设专门的手机考察模式；
- 网页需要基本响应式，但不做离线、拍照、断网同步和移动端专项工作流；
- 数据网格是主要分析表达；
- 平滑热力渐变是可选视觉模式；
- 不把代理指标称为真实客流；
- 第一版允许少量、可控的地图和地点 API 成本；
- 不在第一阶段采购大型移动位置或客流数据 vendor。

---

## 2. 用户与核心场景

### 2.1 目标用户

- 选址团队；
- 市场研究人员；
- 品牌及运营负责人；
- 管理层决策者；
- 受邀请的项目协作者。

### 2.2 核心流程

#### 流程 A：全城扫描

1. 用户选择城市和业态模板；
2. 地图展示覆盖全城的数据网格；
3. 用户切换综合活跃度、交通、年轻客群、游客潜力、社区消费等主题；
4. 系统对网格或商圈进行排名；
5. 用户筛选并保存约 25 个重点商圈。

#### 流程 B：Trade area 分析

1. 用户点击网格、商圈或具体坐标；
2. 选择 500 米、1 公里或 1.5 公里半径；
3. 系统聚合人口、年轻客群、交通、商业设施、旅游代理指标和竞品；
4. 右侧显示评分、证据、风险、数据日期和置信度。

#### 流程 C：候选点比较

1. 将商圈、商场或街铺保存为候选点；
2. 最多同时比较 3–5 个候选点；
3. 比较综合评分、分项指标、trade area 和竞品结构；
4. 添加文字备注、租金、面积和实地考察结果；
5. 导出 PDF 或 CSV。

---

## 3. 第一版功能范围

### 3.1 地图

- 城市切换；
- 地址、商场、商圈和地标搜索；
- 地图自由平移和缩放；
- 当前视野自动加载数据网格；
- 网格模式与热力渐变模式切换；
- 候选商圈标记；
- 交通节点图层；
- 竞品图层；
- Trade area 圆形范围；
- 点击网格或标记打开证据卡。

### 3.2 分析主题

- 综合活跃度；
- 交通人流；
- 年轻客群；
- 游客潜力；
- 社区消费；
- 办公人群；
- 商业设施密度；
- 竞争格局。

### 3.3 客群指标

- 居民人口；
- 18–34 岁人口；
- 学生代理指标；
- 办公人群代理指标；
- 游客代理指标；
- 日间活动人口代理指标；
- 住宅类型或消费能力代理指标。

必须将“身份构成”和“年龄结构”分开表达，避免把年轻人同时当作独立身份后造成比例重复。

### 3.4 竞品

- 茶饮、咖啡、烘焙和轻餐分类；
- 品牌关键词过滤；
- 当前视野与 trade area 内竞品数量；
- 竞品距离与密度；
- 连锁品牌与独立门店区分；
- 营业状态；
- 用户手工核验和修正；
- 商场主力店和周边流量吸引点。

### 3.5 证据卡

每个选中区域必须展示：

- 综合评分；
- 分项评分；
- 全城排名；
- Trade area 半径；
- 覆盖人口；
- 交通客流代理；
- 商业设施数量；
- 竞品数量；
- 客群结构；
- 进入短名单的原因；
- 主要风险；
- 数据来源；
- 数据日期；
- 数据置信度。

### 3.6 协作与输出

- Google 账号邀请制登录；
- 项目保存；
- 候选点收藏；
- 项目成员备注；
- 候选点状态；
- 3–5 点对比；
- CSV 导出；
- PDF 选址摘要。

---

## 4. 明确不做的内容

第一版不实现：

- 销售预测；
- 实时逐街段手机人流；
- 自动开店/不开店结论；
- 黑箱 AI 选址；
- 专门的手机考察模式；
- 离线地图、断网同步和现场拍照；
- 对外注册、付费订阅和客户计费；
- 大型数据仓库；
- 复杂审批流程；
- 大规模 vendor 定制采购。

---

## 5. 地图与热力图方案

### 5.1 三层结构

地图功能必须拆成三个概念：

1. **底图**：道路、建筑、商场、行政区和地名；
2. **分析数据**：人口、交通、商业设施、学校、办公、旅游和竞品；
3. **渲染方式**：网格、颜色分级、热力渐变和标记点。

地图系统本身不会自动产生真实人流。Google Maps、Mapbox、ArcGIS 或 deck.gl 只能显示已经准备好的数据。

### 5.2 主要表达：数据网格

- 使用 H3 Resolution 9 作为默认空间单元；
- 每个网格保留原始指标、标准化分数、来源日期和置信度；
- 低缩放级别显示聚合网格；
- 高缩放级别显示更细网格和具体设施；
- 点击网格必须能够解释颜色来源。

网格优先于模糊热力图，因为它能显示具体数值，适合比较并减少虚假精确感。

### 5.3 可选表达：热力渐变

- 数据源仍然是同一套网格指标；
- 只改变可视化方式，不改变数据；
- 使用 deck.gl `HeatmapLayer` 或 `GeoJsonLayer` 叠加在 Google Maps 上；
- 如果第一版时间紧，可以只做 Google Maps Polygon/Data Layer，不引入 deck.gl。

Google Maps 原生 Heatmap Layer 已停止支持，Google 官方建议使用 deck.gl 等替代方案：<https://developers.google.com/maps/deprecations>

---

## 6. 指标体系

### 6.1 综合活跃度指数

第一版默认权重：

| 指标 | 权重 | 主要数据 |
|---|---:|---|
| 轨道及公交客流 | 35% | 车站客流、站点密度、换乘等级 |
| 商业及餐饮设施 | 25% | 商场、餐饮、零售、营业密度 |
| 办公与教育 | 15% | 办公楼、就业区、学校及高校 |
| 居民与年轻人口 | 15% | 居住人口、年龄结构、住宅类型 |
| 酒店与旅游吸引点 | 10% | 酒店、景点、旅游商业区 |

公式：

```text
activity_score =
    0.35 * transit_score
  + 0.25 * commercial_score
  + 0.15 * work_study_score
  + 0.15 * resident_young_score
  + 0.10 * tourism_score
```

### 6.2 候选点综合评分

```text
site_score =
    0.35 * activity_score
  + 0.25 * audience_fit_score
  + 0.20 * accessibility_score
  + 0.10 * commercial_anchor_score
  + 0.10 * competition_opportunity_score
```

置信度不加入综合分，必须单独显示，避免“数据完整”被误解为“位置更好”。

### 6.3 竞争指标

竞争不能简单理解为越少越好：

- 没有竞品可能意味着需求不足；
- 适度聚集通常证明市场存在；
- 过度密集可能代表饱和；
- 竞品影响应结合品牌级别、门店类型、距离和商场容量。

系统至少拆分为：

- 需求验证指数；
- 竞争密度；
- 品牌饱和度；
- 空白机会指数。

### 6.4 标准化

- 原始指标按城市分别计算；
- 使用城市内百分位进行 0–100 标准化；
- 对极端值进行 P5/P95 Winsorization；
- 不直接比较不同城市的原始人口或客流数；
- 跨城市比较时只比较标准化指数，并显示城市基准。

### 6.5 置信度

```text
confidence_score =
    0.35 * source_recency
  + 0.30 * spatial_granularity
  + 0.20 * data_completeness
  + 0.15 * method_reliability
```

等级：

- A：85–100；
- B：70–84；
- C：50–69；
- D：低于 50。

所有估算值必须同时返回 `method`、`source_date`、`confidence_score` 和 `confidence_reason`。

---

## 7. Trade area 计算

### 7.1 支持半径

- 500 米；
- 1 公里；
- 1.5 公里。

### 7.2 聚合方法

- POI、竞品、车站：使用坐标是否落入圆形范围统计；
- 人口和客群：按网格与 trade area 的面积交叠比例加权；
- 交通：按站点距离和站点客流进行衰减加权；
- 商业设施：同时返回总数、密度和类别结构；
- 不把同一设施通过多个来源重复计数；
- 保存聚合时使用数据版本号，便于后续重算。

### 7.3 输出结构

```json
{
  "center": {"lat": 1.304, "lng": 103.832},
  "radius_m": 1000,
  "population": 38600,
  "young_population_ratio": 0.31,
  "transit_score": 92,
  "commercial_poi_count": 186,
  "competitor_count": 42,
  "tourism_proxy_score": 81,
  "activity_score": 91,
  "confidence": 78,
  "sources": ["lta_station_volume", "singstat_population", "osm_poi"]
}
```

---

## 8. 数据源策略

### 8.1 通用数据源

- OpenStreetMap：道路、建筑、设施与基础 POI；
- Google Maps/Places：地址搜索、地点检索和竞品实时核验；
- 各城市政府开放数据；
- 交通运营方或政府发布的客运量；
- 团队手工核验数据；
- 未来可选的付费客流或商业地产数据。

### 8.2 新加坡

| 类型 | 建议来源 | 用途 |
|---|---|---|
| 人口及年龄 | [SingStat / data.gov.sg](https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view) | 居民、年龄和子区人口 |
| 交通客流 | [LTA DataMall](https://datamall.lta.gov.sg/content/datamall/en/search_datasets.html) | 地铁站、公交站工作日/周末客流 |
| 边界与地址 | [OneMap API](https://www.onemap.gov.sg/apidocs/) | 55 个规划区、地址、人口查询和主题数据 |
| 商业物业 | [URA Commercial Properties](https://www.ura.gov.sg/property-data/commercial-properties/) | 租金、空置和商业物业概况 |
| 设施与竞品 | OSM + Google Places | 稳定设施层与实时核验 |

### 8.3 香港

| 类型 | 建议来源 | 用途 |
|---|---|---|
| 人口 | [香港 2021 人口普查](https://data.gov.hk/en-data/dataset/hk-censtatd-census21c-b1120106) | 区域人口、年龄和住户结构 |
| 道路交通 | [Traffic Flow Census](https://data.gov.hk/en-data/dataset/hk-td-tis_7-traffic-flow-census) | 道路车辆流量和空间调查点 |
| 交通与地理 | DATA.GOV.HK、CSDI、运输署 | 道路、公交、交通节点和地理边界 |
| 设施与竞品 | OSM + Google Places | 商场、餐饮、零售及竞品 |

香港道路交通流量不等于步行客流；地铁站级人流需要继续核查 MTR 可用数据或未来采购。

### 8.4 曼谷

| 类型 | 建议来源 | 用途 |
|---|---|---|
| 人口 | [泰国政府开放数据：曼谷人口](https://data.go.th/en/dataset/101) | 行政区人口基线 |
| 轨道客流 | [泰国轨道交通站点客流](https://data.go.th/en/dataset/drt2566_02) | BTS/MRT/ARL 站点级月度客流 |
| 交通 | BMA 交通与运输部门开放数据 | 公共交通和交通统计 |
| 设施与竞品 | OSM + Google Places | 商场、餐饮、旅游和竞品 |

### 8.5 吉隆坡

| 类型 | 建议来源 | 用途 |
|---|---|---|
| 人口 | [OpenDOSM](https://open.dosm.gov.my/data-catalogue?source=DOSM) | 州、行政区人口和年龄结构 |
| 公共交通 | [data.gov.my 交通客流目录](https://data.gov.my/data-catalogue) | Rapid Rail、KTMB 和公交客流 |
| 轨道 OD | [Rapid Rail Explorer](https://data.gov.my/dashboard/rapid-explorer) | 巴生谷站点间日客流 |
| 设施与竞品 | OSM + Google Places | 商业设施、商场和竞品 |

### 8.6 Google Places 合规

- 地图上展示 Google Places 数据时使用 Google Maps；
- 长期保存 `place_id`，其他受限字段按政策实时获取或在允许范围内临时缓存；
- 用户自己填写的品牌分类、考察备注和核验状态作为团队自有数据保存；
- 不用 Google Places 结果批量构建可永久保存的商业数据库；
- 显示必要的 Google 与第三方归属信息。

参考：<https://developers.google.com/maps/documentation/places/web-service/policies>

---

## 9. 技术架构

### 9.1 前端

- React；
- TypeScript；
- Vite；
- Google Maps JavaScript API；
- Google Maps Polygon/Data Layer 作为主要网格渲染；
- deck.gl 仅用于可选平滑热力或大量 GeoJSON 渲染；
- 基本响应式网页；
- 不建设独立移动 App。

### 9.2 后端

- Firebase Authentication：Google 登录；
- Firestore：项目、候选点、配置、备注和快照；
- Cloud Storage：原始数据、处理结果、GeoJSON、Parquet 和报告；
- Cloud Run：地图查询、trade area 聚合和 Places 代理；
- Cloud Run Jobs：定时数据清洗与空间计算；
- Cloud Scheduler：按数据源频率触发更新；
- Secret Manager：API Key 与服务凭据；
- Firebase Hosting：前端部署。

第一版不使用 Cloud SQL、PostGIS 和 BigQuery。只有在网格、历史版本或查询量明显增长后再引入。

### 9.3 数据流

```text
政府开放数据 / OSM / 交通数据
            ↓
      Cloud Run Jobs
            ↓
清洗、坐标统一、去重、H3 网格聚合
            ↓
Cloud Storage 版本化数据 + Firestore 元数据
            ↓
      Cloud Run API
            ↓
React Web App + Google Maps

Google Places ──实时查询──> Cloud Run API ──> 地图竞品图层
```

### 9.4 坐标与城市配置

- 内部统一使用 WGS84；
- 每个城市保存边界、默认中心点、缩放级别、时区和货币；
- 网格 ID 使用 H3；
- 城市配置不得写死在 UI 组件内。

---

## 10. 核心数据模型

### 10.1 `projects`

```ts
type Project = {
  id: string;
  name: string;
  cityCode: "SG" | "HK" | "BKK" | "KUL";
  formatPreset: "tea_coffee_lightmeal" | string;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

### 10.2 `market_configs`

```ts
type MarketConfig = {
  cityCode: string;
  timezone: string;
  currency: string;
  center: { lat: number; lng: number };
  boundaryVersion: string;
  h3Resolution: number;
  dataVersion: string;
  enabledThemes: string[];
};
```

### 10.3 `grid_cells`

```ts
type GridCell = {
  cityCode: string;
  h3Index: string;
  geometry: GeoJSON.Polygon;
  metrics: Record<string, number | null>;
  scores: Record<string, number | null>;
  confidenceScore: number;
  confidenceLevel: "A" | "B" | "C" | "D";
  sourceIds: string[];
  dataVersion: string;
  calculatedAt: string;
};
```

大批量 `grid_cells` 建议保存为按城市和版本分区的 GeoJSON/Parquet，而不是每个网格都写入 Firestore 文档。

### 10.4 `candidate_sites`

```ts
type CandidateSite = {
  id: string;
  projectId: string;
  name: string;
  siteType: "trade_area" | "mall" | "street_shop";
  location: { lat: number; lng: number };
  radiusM: 500 | 1000 | 1500;
  status: "researching" | "shortlisted" | "visited" | "hold" | "rejected";
  placeId?: string;
  rent?: number;
  floorArea?: number;
  userFields: Record<string, unknown>;
  analysisSnapshotId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
```

### 10.5 `analysis_snapshots`

保存候选点在某一数据版本下的分析结果，确保报告可以复现。

```ts
type AnalysisSnapshot = {
  id: string;
  candidateSiteId: string;
  cityCode: string;
  dataVersion: string;
  radiusM: number;
  scores: Record<string, number>;
  metrics: Record<string, number | null>;
  confidence: number;
  evidence: string[];
  risks: string[];
  sourceIds: string[];
  createdAt: string;
};
```

### 10.6 `data_sources` 与 `ingestion_runs`

必须记录：

- 来源名称；
- 来源 URL；
- 许可证；
- 数据日期；
- 更新频率；
- 空间粒度；
- 上次成功更新时间；
- 记录数；
- 校验结果；
- 失败信息。

---

## 11. API 设计

### 11.1 当前视野网格

```http
GET /v1/map/cells
  ?city=SG
  &bbox=103.70,1.25,103.95,1.42
  &theme=overall
  &zoom=12
  &data_version=latest
```

返回：

- 网格 ID；
- GeoJSON geometry；
- 当前主题分数；
- 主要分项指标；
- 置信度；
- 数据版本。

### 11.2 Trade area

```http
GET /v1/trade-area
  ?city=SG
  &lat=1.304
  &lng=103.832
  &radius_m=1000
  &format=tea_coffee_lightmeal
```

### 11.3 竞品查询

```http
GET /v1/competitors
  ?city=SG
  &lat=1.304
  &lng=103.832
  &radius_m=1000
  &categories=tea,coffee,bakery,light_meal
```

要求：

- 服务端调用 Places API；
- API Key 不暴露给客户端；
- 支持品牌关键词、类别过滤、分页和去重；
- 返回团队核验状态；
- 遵守 Places 缓存和展示政策。

### 11.4 项目与候选点

```http
POST   /v1/projects
GET    /v1/projects/:projectId
POST   /v1/projects/:projectId/candidates
PATCH  /v1/projects/:projectId/candidates/:candidateId
DELETE /v1/projects/:projectId/candidates/:candidateId
POST   /v1/projects/:projectId/compare
POST   /v1/projects/:projectId/reports
```

### 11.5 错误返回

```json
{
  "error": {
    "code": "SOURCE_UNAVAILABLE",
    "message": "交通数据暂时不可用",
    "retryable": true,
    "source_id": "lta_station_volume"
  }
}
```

数据缺失时不能返回虚构的零值。必须返回 `null`、缺失原因和对置信度的影响。

---

## 12. 页面结构

### 12.1 桌面端第一屏

#### 顶栏

- 产品名称；
- 项目选择；
- 全局地点搜索；
- 数据状态；
- 导出按钮；
- 用户菜单。

#### 左栏

- 城市选择；
- 网格/热力模式；
- 分析主题；
- 图层开关；
- Trade area 半径；
- 商圈类型筛选；
- 25 个重点商圈列表。

#### 地图

- 分值网格；
- 候选商圈排名；
- 交通节点；
- 竞品；
- Trade area；
- 图例与数据版本。

#### 右栏

- 当前商圈或店位；
- 综合评分；
- 置信度；
- Trade area 指标；
- 评分构成；
- 客群结构；
- 正向因素；
- 风险因素；
- 数据来源；
- 加入短名单。

### 12.2 手机端

- 允许打开网页、浏览地图和查看证据卡；
- 控件可以折叠；
- 不承诺离线；
- 不做拍照、定位导航和断网同步；
- 主要分析仍以桌面端为准。

---

## 13. 权限与安全

### 13.1 角色

- `admin`：管理成员、模板、数据源和项目；
- `member`：创建项目、候选点、备注和报告；
- `viewer`：只读查看和导出。

### 13.2 安全要求

- Firebase Authentication 邀请制登录；
- Firestore Rules 按项目成员校验；
- Places、OneMap、LTA 等服务凭据只保存在服务端；
- Google API Key 限制域名、API 和每日配额；
- 开启 Google Cloud Budget Alert；
- 审计项目成员、候选点和备注变更；
- 报告中不输出用户敏感信息；
- 用户定位功能如果未来加入，必须事先征得同意。

---

## 14. 数据更新与质量

### 14.1 更新频率

| 数据 | 建议频率 |
|---|---|
| Places 竞品 | 用户查询时实时获取 |
| OSM POI | 每月或每季度 |
| 交通客流 | 按官方发布频率，通常月度 |
| 人口普查 | 数据源更新时 |
| 商业物业 | 月度或季度 |
| 团队核验 | 用户修改时实时 |

### 14.2 自动校验

- 文件或 API 是否可访问；
- 字段是否变化；
- 坐标是否落在城市边界；
- 记录数是否异常下降；
- 重复设施比例；
- 空值比例；
- 日期是否晚于上一个版本；
- 指标分布是否异常漂移。

失败的数据源不得覆盖上一个有效版本。

---

## 15. 实施阶段

### 阶段 0：现有概念 Demo

状态：已完成。

内容：

- 新加坡全城网格；
- 网格与热力两种表达；
- 25 个商圈短名单；
- 分析主题切换；
- Trade area；
- 证据卡；
- 响应式查看。

Demo：<https://singapore-market-scout.heytea-9828.chatgpt.site>

### 阶段 1：新加坡可用 MVP，预计 2–4 周

#### 第 1 周

- 建立 React、Firebase 和 Google Maps 项目；
- 完成登录、项目和候选点数据结构；
- 接入新加坡边界和 H3 网格；
- 建立数据源登记与版本机制。

#### 第 2 周

- 接入 SingStat、LTA、OneMap 和 OSM；
- 完成清洗、坐标转换、网格聚合和置信度；
- 建立综合活跃度和主题指标。

#### 第 3 周

- 完成地图、Trade area、竞品实时查询和证据卡；
- 完成 25 个商圈排名、筛选和候选点保存；
- 完成 3–5 点对比。

#### 第 4 周

- PDF/CSV 导出；
- 权限和安全检查；
- 数据质量校验；
- 性能、响应式和验收测试；
- 内部试用和指标修正。

### 阶段 2：香港

- 复用系统和指标接口；
- 接入香港人口、交通和地理数据；
- 单独校准城市内标准化；
- 核验 MTR 站点客流可得性；
- 形成香港商圈短名单。

### 阶段 3：曼谷与吉隆坡

- 按城市分别接入官方人口及轨道客流；
- 处理泰文、马来文与英文地名；
- 建立各自城市基准；
- 不直接套用新加坡绝对分值；
- 分别输出城市数据覆盖与可信度报告。

### 阶段 4：销售预测

在积累和清洗历史门店数据后实施。

已知条件：

- 约 10–30 家门店；
- 主要覆盖香港、新加坡；
- 至少一年日销售；
- 地址、开业日期、面积、业态和营业时间较完整。

建议模型：

```text
相似门店基准
+ 商圈与店位特征
+ 城市与季节修正
+ 开业爬坡曲线
= 开业期 / 爬坡期 / 成熟期日均销售区间
```

第一版预测使用分层统计模型、正则化回归和相似门店参照，不使用复杂黑箱模型。输出保守、基准和乐观区间，并进行留一门店回测。

曼谷、吉隆坡在没有本地历史门店前只能输出跨城市迁移预测，必须使用更宽区间和更低置信度。

---

## 16. 验收标准

### 16.1 地图

- 新加坡全岛有连续数据网格；
- 地图平移或缩放后在 2 秒内更新当前视野；
- 网格、热力、交通、竞品和候选点可独立开关；
- 点击网格能打开证据卡；
- 低缩放级别不会出现严重标记拥挤。

### 16.2 数据

- 每个分数可以追溯到数据源、日期和版本；
- 缺失数据不显示为 0；
- 同一设施不会因多个来源重复计数；
- 500 米、1 公里、1.5 公里聚合结果通过固定测试样本验证；
- 数据更新失败时保留上一有效版本。

### 16.3 竞品

- 支持茶饮、咖啡、烘焙和轻餐筛选；
- Place ID 去重；
- 服务端保护 API Key；
- 显示正确归属；
- Google Places 不可用时，不影响人口和交通图层。

### 16.4 项目与协作

- 未邀请用户不能访问项目；
- 成员可以保存候选点和备注；
- 最多比较 5 个候选点；
- 分析快照可以复现；
- PDF/CSV 与系统显示一致。

### 16.5 响应式

- 桌面 1280px 以上为主要工作界面；
- 平板与手机无横向溢出；
- 手机可以查看地图和证据卡；
- 不把手机离线考察作为验收条件。

---

## 17. 成本控制

- Google Maps 与 Places 设置每日配额；
- Places 只请求实际展示所需字段；
- 地图停止移动后再发起查询，避免拖动过程重复请求；
- 使用会话缓存减少重复查询，但遵守 Places 政策；
- 政府和 OSM 数据离线预处理；
- 网格数据使用静态压缩 GeoJSON 或分区文件；
- 第一版不启用 BigQuery、Cloud SQL 和昂贵 GIS 服务；
- Cloud Run 设置最小实例为 0；
- 建立 Google Cloud 月度预算提醒。

---

## 18. 主要风险与处理

| 风险 | 处理方式 |
|---|---|
| 把活跃度误解为真实客流 | 使用“代理指标”命名，并显示来源和置信度 |
| 不同城市指标不可比 | 城市内标准化，跨城市只比较标准化指数 |
| 游客/办公身份无法精确识别 | 表达为代理指数，不给虚假的精确人数 |
| Places 结果不完整或受条款限制 | OSM/官方数据做基础层，Places 只做实时核验 |
| 小样本销售模型过拟合 | 销售预测延期，未来使用简单模型和留一回测 |
| 地图过度拥挤 | 低缩放只显示 Top 10–12，放大后显示更多 |
| 数据更新导致评分变化 | 保留数据版本和分析快照 |
| API 费用不可控 | 配额、字段最小化、预算提醒和查询防抖 |

---

## 19. 交给其他 AI 的执行指令

可以将下面内容连同本文件直接发送给新的 AI：

```text
请按照《海外门店选址系统全套方案》实施项目。

优先完成阶段 1：新加坡可用 MVP。不要实现销售预测、专门的手机考察模式、离线功能或大型 GIS 架构。

实施原则：
1. 数据网格是主要表达，热力渐变只是可选视图。
2. 所有指标必须包含来源、日期、方法和置信度。
3. 不允许用随机数或模拟数据代替正式数据；开发期 fixture 必须明确标记。
4. 不得把交通、人口和 POI 代理指标称为真实人流。
5. Google Places 只通过服务端调用，并遵守缓存、展示和归属要求。
6. 第一版使用 React + TypeScript + Google Maps + Firebase + Cloud Run。
7. 第一版只接入新加坡真实数据，但城市配置和 API 必须能够扩展到 HK、BKK、KUL。
8. 每完成一个阶段，提供数据质量报告、自动测试结果和可操作的预览。
9. 不自行增加销售预测、审批、付费订阅、离线考察等范围外功能。

开始前先审查当前代码、环境变量和现有 Demo，然后给出分阶段变更计划。实施完成后按照本文验收标准逐项验证。
```

---

## 20. 最终交付物

新加坡第一版完成时应交付：

1. 可登录的内部 Web App；
2. 新加坡全城数据网格；
3. 综合活跃度及主题图层；
4. 25 个重点商圈短名单；
5. Trade area 分析；
6. 竞品实时搜索；
7. 数据来源和置信度；
8. 候选点保存、备注与比较；
9. PDF/CSV 导出；
10. 数据字典；
11. 数据更新说明；
12. 部署说明；
13. 自动测试与验收报告；
14. 香港、曼谷和吉隆坡的数据接入待办清单；
15. 未来销售预测模块的数据模板。

