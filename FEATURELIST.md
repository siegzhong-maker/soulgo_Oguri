# SoulGo 能力清单（负责人 / 路演参考 + 技术对照）

本文档供**负责人**在准备路演或对外讲解时，与团队手中的**路演脚本**搭配使用：脚本负责故事线与节奏，本文档负责**「讲到哪一段时，产品上对应什么、能演示什么、边界在哪里」**，避免口头表述与实现脱节。

---

## 与路演脚本怎么配合

| 路演脚本里常见板块 | 建议用本文档的哪里 |
|---|---|
| 开场 / 痛点 / 我们要做什么 | 下一节「价值主张」+「用户能感知到什么」 |
| 产品 Demo、现场走流程 | 「建议 Demo 动线」+「Demo 彩排清单」 |
| 差异化、技术壁垒、AI 怎么用 | 「可强调的亮点」+ 后文 **RAG + 记忆** 小节（用口语转述即可，不必念接口名） |
| 投资人 / 合作方追问「数据在哪、会不会丢、能不能规模化」 | 「答辩口径提示」+ 文末「关键约束」 |

**口径建议**：对外多用「旅行记忆」「角色一致」「可解释的回忆过程」；接口名、文件名留在答疑或附录式章节即可。

---

## 价值主张（可嵌入路演的 30 秒版）

SoulGo 把「去一个地方打卡」变成**可积累的陪伴体验**：电子宠物会**记住**你去过哪里、写过什么，下次生成内容时会**主动翻旧账**（检索相关记忆），并把「我在想什么」用**思考步骤 + 日记里的记忆提示**露给用户看——不是黑盒生成，而是**带解释的记忆增强互动**。可选的实体硬件（蓝牙挂件）在打卡成功时**震动反馈**，把线上叙事延伸到手里。

---

## 用户能感知到什么（按故事线，少提技术词）

1. **地图上打卡**：输入地点 → 宠物写一篇旅行日记 → 地图上出现图钉、列表里留下足迹。  
2. **回到小屋**：宠物按「计划」做小动作；若连接了蓝牙设备，打卡瞬间会有**震动**（稀有掉落与普通掉落震感不同）。  
3. **看见记忆在工作**：思考过程里会提到**翻到了几条和这次旅行相关的记忆**；日记里也能展开「参考了哪些回忆」。  
4. **收藏与房间**：打卡可能掉落纪念品进**橱柜**，可摆进房间；照片墙等会跟着丰富。  
5. **人格不飘**：应用内有「核心档案」与可编辑的**人格卡片**；后台生成也会用同一份**角色圣经**（`soul.md`）约束口吻与设定，减少「每次像换了一个角色」的感觉。

---

## 可强调的亮点（对照脚本里的「差异化」）

- **记忆闭环**：不是单次 Chat，而是「打卡 → 结构化记忆摘要 →（可选）向量入库 → 下次生成前检索 → 写进 prompt → UI 上可解释」。适合强调**可持续运营的内容资产**（足迹越多，体验越厚）。  
- **可解释 AI**：用户能看到「翻记忆」的步骤与条数，降低「胡编」感，路演时比纯生成更有**信任叙事**。  
- **角色工程化**：`soul.md` = 单一事实来源的角色圣经；应用内档案与 API 共用同一设定逻辑，适合讲**IP 延展、多角色复制时的工程方法**（而非仅靠 prompt 临场发挥）。  
- **软硬结合叙事**：Web 直连蓝牙、无需 App 商店过审即可演示**实体伴游**（需说明浏览器与 HTTPS 限制，见下文答辩口径）。  
- **隐私与数据主权（诚实优势）**：主要旅行记忆与日记在**用户浏览器本地**持久化，不依赖账号体系也能演示完整链路；同时说明**暂不跨设备同步**、向量池当前为**演示级内存实现**等边界。

---

## 建议 Demo 动线（约 3～5 分钟）

1. **地图**：输入一个地点 → 打卡 → 看日记生成、思考步骤、是否提示「参考了 X 条记忆」。  
2. **小屋**：点开日记 / 橱柜，展示掉落与收藏；若有 BLE 设备，提前在地图页连接，再打卡一次看震动差异。  
3. **宠物记忆**：打开「性格 / 核心档案」，展示世界观长文 + 人格卡片；说明「这是角色设定与生成一致性的来源」。  
4. （可选，偏技术听众）记忆面板里向量池调试：展示「写入过多少条、最近写了什么」——用于证明 RAG 链路**真的在跑**，而非文案。

### Demo 彩排清单（现场前勾选）

路演前用本清单过一遍，减少「我电脑上好好的」风险。

| 检查项 | 建议 |
| --- | --- |
| 浏览器 | 固定 **Chrome 或 Edge**（桌面或安卓）；若演示 BLE，**不要用 Safari / iPhone**。 |
| 网络 | 稳定 WiFi 或手机热点；避免会场公共 WiFi 半连接。 |
| 部署 | 确认 `GET /soul.md`、`POST /api/diary` 可用；掉落依赖 `场景/generated/**` 与（国内兜底时）`/api/generate-collectible` 与密钥配置。 |
| 计时 | 完整走一遍上文「建议 Demo 动线」，控制在 **3～5 分钟**。 |
| 第二次打卡 | 准备在同一城市或相邻流程**再打卡一次**，便于展示「翻到 X 条记忆」（避免冷启动叙事过薄）。 |
| 兜底 | 备 **30～60 秒录屏**（含一次成功打卡 + 日记 + 橱柜），应对现场网络或 API 波动。 |

---

## 答辩口径提示（诚实、短句）

- **「记忆存在哪？」** 用户侧主要存在本机浏览器；服务端向量池用于**同一次部署会话内**的相似度检索，**冷启动会空**，正式产品需换持久化向量库——当前是**可演示的 MVP 架构**。  
- **「和 ChatGPT 有啥不同？」** 强调**场景闭环**（旅行 + 宠物 + 收藏）+ **记忆写入与可解释检索** + **角色圣经**，而不是模型本身。  
- **「能规模化吗？」** 生成与抽取已拆成独立 API，角色与记忆格式结构化；规模化主要换**向量存储与同步策略**，产品形态不需推倒重来。  
- **「iPhone 能连蓝牙吗？」** Safari 不支持 Web Bluetooth；路演用 **Chrome / Edge（安卓或桌面）** 或提前录屏兜底。

### 演示边界与话术（边界场景）

| 场景 | 产品上会发生什么 | 建议口头一句 |
| --- | --- | --- |
| 未输入地点就点打卡 | 地图区提示先输入或选城市 | 「需要先选一个目的地」 |
| API 失败或异常 | 日记用本地模板；toast 提示网络忙 | 「离线也能记一笔，联网后记忆会更厚」 |
| 同一地点再次打卡 | 仍生成日记与图钉；**该地名首次已掉落后不再掉新见闻** | 「重复去同一座城市，日记照写，首访那份纪念品只领一次」 |
| 橱柜格子已满（达到 `CABINET_SLOTS`） | 不再收纳新掉落；日记仍生成 | 「格子满了先整理橱柜，新见闻再装进来」 |
| 打卡后自动进入宠物房 | 为播放「思考步骤」会切到小屋 | 「先看它怎么回忆这次旅行」 |

---

## 详细说明（研发对照 · 路演不必逐条念）

以下章节保留**模块表、接口名、数据结构与约束**，便于负责人答技术细节、研发对齐排期；路演现场以**上文叙事 + Demo** 为主即可。

### 文档范围（技术）

- 主体：[`index.html`](index.html) 单页与直接依赖的 [`api/*.js`](api)。  
- 硬件：[`bleConfig.js`](bleConfig.js)、[`esp32BleClient.js`](esp32BleClient.js)（与固件 GATT 对齐）。  
- 静态资源：仓库根 [`soul.md`](soul.md) 与 `index.html` 一并部署到站点根（`GET /soul.md`），供「核心档案」与兜底 JSON。  
- 技术重点：**RAG + 记忆** 的写入→检索→注入生成→可视化解释；**soul.md / 核心档案** 与生成链路分工；可选 **BLE 震动反馈**。

## 产品概览（MVP 当前形态）

### MVP 对外统一口径（主路径 vs 增强）

- **主路径（建议路演只强调这一条）**：地图**打卡**地点 → **AI 旅行日记**（失败时用本地模板兜底）→ **打卡掉落**纪念品进橱柜（同一标准化地名仅首次掉落新见闻，仍可重复打卡写日记与足迹）→ 宠物小屋展示**思考步骤**与日记中的**记忆提示**。  
- **增强 / 可选（点到为止，避免喧宾夺主）**：**日记插图**（本地上传、AIGC 配图）、**制作/家具 API**（`/api/generate-furniture`）、**BLE 震动**（需兼容浏览器）、**服务端 RAG 向量检索**（演示级内存池，冷启动与重启见下文答辩口径）。  
- 与 PRD 中「橱柜本地上传生成配件」的关系：当前实现以**打卡掉落 + 日记侧上传**为主；上传制作为**增强能力**，对外话术与上文「主路径 vs 增强」保持一致，避免听众以为 MVP 只有上传一条链路。

- **核心体验（对用户说）**：地图打卡一个地点 → 生成一篇旅行日记 → 掉落/制作纪念品（橱柜收藏 + 房间摆放）→ 宠物在房间里基于「记忆与计划」行动与互动。  
- **核心体验（对内）**：同上，背后串联日记 API、记忆抽取、可选向量写入与检索、以及 `soul.md` 角色钉扎。  
- **可选硬件伴游**：浏览器通过 **Web Bluetooth** 连接 **ESP32-C3**（设备广播名与 [`bleConfig.js`](bleConfig.js) 中 `DEVICE_NAME` 一致，默认 `ESP32-C3-Tracker`）。打卡时在**掉落档位已定、思考文案已就绪**后立刻下发震动指令（普通款 **C** 短震，**B/A/S** 长震），**不等待**思考动画播完，避免体感滞后。
- **数据形态（研发 / 答疑用；路演可跳过）**：
  - **前端状态（持久化）**：`localStorage` 保存 `appState`（打卡、日记、橱柜、记忆等）。
  - **日记插图（可选 IndexedDB）**：大图可存为 `idb:v1:` 引用以减轻 `localStorage` 配额压力（`soulgo_diary_images`），小图或仍可用 data URL 存在状态中。
  - **RAG 向量记忆池（服务端内存）**：一次打卡写入一条向量记忆，供后续生成日记时检索使用（注意：当前实现是**进程内存**，实例重启会清空）。**不向量化**整份 `soul.md` 或核心档案长文，角色设定靠 prompt 注入。
  - **角色圣经 `soul.md`**：**服务端**通过 [`api/load-soul.js`](api/load-soul.js) 读取部署目录下的 `soul.md` 拼入部分 API 的 system 提示；**前端**通过 `fetch('/soul.md')` 解析 `##` 章节渲染「核心档案」，并解析文末 fenced `json` 代码块中的 `semanticProfileDefaults` 作为结构化人格兜底。
  - **BLE 连接状态**：仅存于当前页面内存（刷新需重连）；无服务端参与。

## Feature 表格（按入口/能力/接口对齐）

> **说明**：按「用户可见入口」罗列，便于彩排时逐项勾选「脚本里有没有讲到」；RAG/记忆相关行 **加粗**，并在「RAG/记忆关联」列标出闭环位置。

| 模块 | 用户入口/触发 | Feature | 产出/状态变化（前端） | 相关接口（后端） | RAG/记忆关联 |
|---|---|---|---|---|---|
| 地图 | 地点输入 + 打卡 | 打卡联动总流程（生成日记/掉落/写入记忆/更新 UI） | `locations` 增加；`mapPins` 增加；日记/橱柜/记忆可能更新 | `POST /api/diary`、`POST /api/memory-summary`、`POST /api/embed-and-store` | **记忆写入起点**：打卡→抽取摘要→写向量池 |
| 地图 | 自动 | 地图图钉（随机位置） | `mapPins: {location,xRatio,yRatio}` | - | - |
| 地图 | 自动 | 已打卡城市列表聚合 | 从 `memories.episodic` 聚合渲染（城市/日期/摘要） | - | 与 episodic 结构绑定（不是单纯 `locations`） |
| 宠物小屋 | 顶部按钮「宠物记忆」 | 记忆总览/编辑（旅行 / 性格 / 习惯；**核心档案**为小粟纸感 UI） | 读写 `memories.episodic / semanticProfile / habit`；核心档案正文来自 `soul.md` 缓存 | `GET /api/debug-memories`（调试页内）；静态 **`GET /soul.md`** | **记忆可视化入口**（含 RAG 调试）；**结构化人格**优先 `semanticProfile`，否则 soul.md 内 JSON 或内嵌默认值 |
| 宠物小屋 | 思考区 | 展示思考步骤 +（第1步）展示“本次翻到的记忆” | 展示 `thinkingSteps`；可展示 `memorySources` | 来自 `POST /api/diary` 的 `thinkingSteps`/`memoryCount` | **可解释链路**：让用户看到“回忆在工作” |
| 宠物小屋 | 热点「日记」 | 打开旅行日记弹窗 | 读取 `diary-list` 渲染 | - | 日记卡片可展示“翻到 X 条记忆” |
| 日记 | 打卡后自动 | **生成日记（统一 JSON）** | 新增日记卡片；可能标记未读 badge | **`POST /api/diary`** | **RAG 注入生成**（retrieve→episodicMemories→prompt） |
| 日记 | 打卡后自动 | 日记卡片“本次翻到 X 条旅行记忆”提示 + 展开来源 | 依赖 `memoryCount`/`memorySources`（前端启发式） | `POST /api/diary`（count） | **可解释链路**（count + sources） |
| 日记 | 点击「插入图片」 | 本地插图上传（文件） | `diaryImages[diaryId]` 写入；`localStorage` 持久化 | - | - |
| 日记 | 生成后异步 | AIGC 日记配图 + 导出图片 | `diaryImages[diaryId]` 写入；UI 同步更新 | `POST /api/generate-image` | - |
| 日记 | 用户触发（插图相关） | 基于插图 + 人格快照的短评/互动文案 | 前端调用后更新日记相关展示 | **`POST /api/diary-image-comment`** | 使用 `getSoulShortBlurb` 钉扎角色，与 `semanticProfileSnapshot` 对齐 |
| 记忆 | 打卡后自动 | **从日记抽取结构化记忆（summary/emotion/key_facts）** | 用于写入 `memories.episodic` 字段 | **`POST /api/memory-summary`** | **记忆结构化/可检索摘要**（为向量写入准备）；可选上下文：`nfc_source`、`checkin_frequency`、`interaction_frequency`；system 侧拼入 **soul.md 短摘要**（`getSoulShortBlurb`） |
| 记忆 | 打卡后自动 | **写入情景记忆（episodic.travel）** | `memories.episodic.unshift(record)`；持久化 | - | **前端记忆池**（非向量）用于气泡/聚合/解释 |
| 记忆 | 打卡后异步 | **向量化写入（RAG store）** | `appState.debug.ragLastError` 可能更新 | **`POST /api/embed-and-store`** | **RAG 写入**（embedding→内存向量库） |
| RAG | 生成日记时自动 | **向量检索召回 topK** | 不直接落前端状态（仅影响生成结果） | **`POST /api/retrieve`** | **RAG 召回**（embedding query → cosine topK）；query 在服务端由地点、性格、爱好及 **`semanticProfileSnapshot` 偏好词**、习惯摘要等拼接 |
| RAG | 记忆面板（调试） | 查看向量记忆池总数/最近 N 条/地点分布 | 仅展示，不持久化 | **`GET /api/debug-memories`** | **RAG 可观测性**（验证写入是否成功） |
| 橱柜 | 热点「橱柜」 | 打开橱柜弹窗（格子数见 `CABINET_SLOTS`，当前为 100） | `cabinetItems` 渲染；打开后清未读 | - | - |
| 橱柜 | 打卡掉落 | 纪念品掉落 → Reward Modal | `cabinetItems` 增加；`cabinetHasNewUnseen=true` | - | 掉落可能绑定 `memoryTag`/`ragUnlockSource` |
| 橱柜 | 打卡时解析 | cabinetPlan 解锁物品/家具主题建议 | `lastFurnitureSuggestion` 写入；用于解释来源 | `POST /api/diary`（返回 `cabinetPlan`） | **RAG 参与“收藏/主题建议”**（生成侧输出） |
| 家具 | 制作流程 | 制作纪念品遮罩（进度/提示） | 仅 UI 过渡；之后可能可摆放 | `POST /api/generate-furniture` | - |
| 房间 | Reward Modal 选择 | 立即摆放/放入橱柜 | `placedFurniture` / `cabinetItems` 更新 | - | - |
| 房间 | 音乐盒 | BGM 选择/音量偏好 | `localStorage` 保存 | - | - |
| 宠物小屋 | 空闲/自主行为（若配置） | 大模型意图决策或回退本地性格决策 | 状态与思考步骤更新 | **`POST /api/pet/decide`**（`window.PET_DECIDE_API_URL`） | 使用 **soul.md 短摘要** 钉扎；失败时走本地 `decidePersonalityBehavior` |
| 硬件 | 地图页 BLE 工具条 | 「连接设备」→ SoulGo 说明弹窗 →「搜索并连接」→ **系统蓝牙选择器**（必选） | GATT 连接 [`esp32BleClient.js`](esp32BleClient.js)；状态「已连接 · 设备名 / 未连接」 | - | - |
| 硬件 | 地图页（已连接） | 「断开设备」直接断开 | `gatt.disconnect`；状态复位 | - | - |
| 硬件 | 打卡成功且已连接 | 按掉落 **tier** 映射发送 `VIB:1`（短）或 `VIB:2`（长） | 在 `thinkingSteps` 计算完成后 **立即** 发送，不等待思考动画 | - | 配置见 [`bleConfig.js`](bleConfig.js) `TIER_TO_VIB` |
| 硬件 | 宠物小屋顶部 | 硬件状态文案 +「去地图连接设备」 | 跳转地图并滚动到 BLE 工具条、聚焦连接按钮 | - | - |
| 全局 | 横竖屏切换按钮 | 布局切换与自适应 | `soulgo_layout_mode` 保存；触发 resize | - | - |

## 主要页面 / 入口（用户可见）

### 地图页（打卡入口）

- **BLE 工具条（可选实体硬件）**
  - **连接设备**：打开 SoulGo 统一弹窗（`openBleConnectModal`），说明需选择广播名与 [`bleConfig.js`](bleConfig.js) 中 `DEVICE_NAME` 一致的设备；点击「搜索并连接」后浏览器会弹出 **系统蓝牙设备列表**（Web Bluetooth 规范要求，无法用纯网页 UI 替代）。
  - **断开设备**：不经过说明弹窗，直接断开 GATT。
  - **状态文案**：未连接 / 已连接 · 设备名；不支持时提示使用 Chrome/Edge（桌面或安卓）等。
- **地点输入 + 打卡按钮**
  - 输入城市/地点后触发“打卡联动”：生成日记、写入记忆、掉落收集物、更新地图图钉与列表。
- **地图图钉（打卡可视化）**
  - 每次打卡会在地图上随机位置生成图钉（坐标以归一化比例存储，适配横竖屏）。
- **已打卡城市列表**
  - 列表不是简单用 `locations` 渲染，而是从 **情景记忆 `episodic.travel` 聚合**得到（城市、最近打卡日期、摘要）。
- **返回宠物小屋**

### 宠物小屋（核心互动场景）

- **顶部状态区**
  - 状态文案（宠物正在做什么）
  - 心情/健康展示（数值映射标签）
  - “人格/称呼你”摘要 + “带我去打卡”快捷入口
  - **硬件状态**（`#ble-status-petroom`）：同步地图页 BLE 连接说明；**「去地图连接设备」** 跳转地图并滚动到 BLE 工具条，便于在地图页完成配对
- **房间热点（可点击交互入口）**
  - **地图**：回到地图页继续打卡
  - **日记**：打开旅行日记（弹窗）
  - **橱柜**：打开旅行见闻柜（弹窗，含“新物品红点”）
  - **床**：休息相关行为（状态切换）
  - **触碰**：让宠物靠近/触碰触发互动
  - **小锅**：吃东西相关行为
  - **音乐盒**：选择 BGM（本地保存偏好）
  - **回到初始位置**：回归发呆点
- **思考区（解释型 UI）**
  - 在播放思考步骤时显示
  - 第 1 步可额外展示“本次翻到的旅行记忆”（让用户理解 RAG/回忆来源）
- **「宠物记忆」弹窗**
  - 分区：**旅行**（情景记忆列表）、**性格**（含「小粟核心档案」纸感 UI：从 `soul.md` 的 `##` 章节渲染完整设定；可点开编辑 **人格卡片** `semanticProfile`）、**习惯**
  - 调试：可查看向量记忆池（`GET /api/debug-memories`）及最近一次 `embed-and-store` 错误提示（`appState.debug.ragLastError`）
- **照片墙**
  - 从橱柜中取最近若干物品，以“拍立得”形式贴在墙上做环境叙事

### 通用弹窗（Modal）

- **旅行日记弹窗**
  - 日记列表卡片（包含：日期、地点、正文、宠物头像/场景缩略）
  - “本次翻到 X 条旅行记忆”提示，可展开查看来源
  - 支持插入本地图片（`<input type="file">`，图片存前端）
  - 支持 AIGC 生图展示与“导出图片”
- **旅行见闻柜（橱柜）弹窗**
  - 网格橱柜，容量见 `CABINET_SLOTS`（当前实现为 100 格；空位提示“去旅行解锁”）
  - 新物品提示（获得后标记未读，用户打开橱柜后清除）
  - 橱柜记忆弹窗布局支持“分区 + 横向滑动卡片”（用于分层展示）
- **获得新物品弹窗（Reward Modal）**
  - 掉落或解锁后即时弹出：展示物品图、名称、徽章
  - 两个操作：**放入橱柜** / **立即摆放**
- **制作纪念品遮罩（Crafting Overlay）**
  - 展示“制作中”的过渡与进度条（用于家具制作流程）
- **连接设备（Web Bluetooth）**
  - 标题「连接设备」；不支持浏览器时仅提示说明 +「知道了」
  - 支持时：步骤说明 +「搜索并连接」（内部调用 `esp32Ble.connect()` → `navigator.bluetooth.requestDevice`）+「取消」；连接失败时在弹窗内显示错误文案

## 硬件与 Web Bluetooth（ESP32-C3）

### 前端依赖与配置

- **[`bleConfig.js`](bleConfig.js)**：导出 `window.ESP32_BLE_CONFIG`  
  - `DEVICE_NAME`：与固件广播/设备名一致（默认 `ESP32-C3-Tracker`）  
  - `SERVICE_UUID` / `CHAR_TX_UUID` / `CHAR_RX_UUID`：与固件 GATT 一致（参考 `esp_gps_blue` 侧服务实现）  
  - `TIER_TO_VIB`：打卡掉落 **tier** → 震动档位（`1` 短震 / `2` 长震）；当前策略为 **仅 C 短震，B/A/S 长震**；未知 tier 时 **C→1，其余→2**
- **[`esp32BleClient.js`](esp32BleClient.js)**：`createEsp32BleClient()`  
  - `connect()`：`requestDevice`（按 `DEVICE_NAME` 过滤）→ `gatt.connect` → 订阅 TX 特征 **notify**（JSON 文本）  
  - `sendCommand(cmd)`：向 RX 特征 **write** 文本命令（如 `VIB:1`）  
  - `disconnect()`：断开并清理状态

### 打卡联动（震动）

- 在打卡流程中，当 **掉落场景 `droppedScene` 与 `thinkingSteps` 已就绪** 时调用 `sendBleVibForCheckin(droppedScene, scene)`：仅当 BLE **已连接** 时发送；tier 取自掉落场景或兜底场景，映射为 `VIB:<mode>`。
- 与 **Reward Modal** 文案中的「小爪子都震了一下」等可形成体验上的一致叙事；硬件未连接时该发送静默跳过，不影响打卡主流程。

### 运行环境与限制

- **浏览器**：需支持 `navigator.bluetooth`（常见为 **Chrome / Edge**，**桌面或安卓**）；**iPhone/iPad 上的 Safari 不支持 Web Bluetooth**，页面会提示。
- **安全上下文**：生产环境需 **HTTPS**（如 Vercel 部署）；本机 `localhost` 亦可用。
- **系统弹窗**：用户每次发起「搜索并连接」都会出现 **操作系统/浏览器提供的蓝牙设备选择器**，属正常行为，不是应用可关闭的“多余弹窗”。

## RAG + 记忆（重点）

**路演可概括**：每次打卡把经历收成「短摘要 + 关键词」，写入可选的向量池；下次生成日记前先做相似度检索，把捞回来的旧记忆和用户人设一起交给模型。思考区 / 日记上的「翻到 X 条记忆」是**产品化的可解释层**，不是装饰文案。

### 记忆类型与前端数据结构（`appState.memories`）

- **情景记忆（episodic）**
  - 主要来自“打卡后生成的一篇日记”
  - 字段包含：`date/location/location_city/time_slot/personality/summary/emotion/diaryId/scene/key_facts/strength/importance/recall_*` 等
  - 支持记忆强度衰减（按周衰减），并在被使用时提升 strength（recall 强化）
- **语义记忆（semantic）**
  - 由当前人格配置生成的“长期特质片段”（用于展示与口吻一致性）
- **人格设定快照（semanticProfile）**
  - identity / preferences / speaking_style / call_user 等
  - **来源优先级（展示与快照）**：用户在「宠物记忆」里保存的 `memories.semanticProfile` **优先**；否则使用 `soul.md` 文末 JSON 中的 `semanticProfileDefaults`；再否则使用 `index.html` 内嵌 `SOUL_DEFAULTS_JSON_EMBEDDED`。
  - 会被裁剪成“轻量快照”（`getSemanticProfileSnapshotForDiary`）用于日记与相关 API，避免长文本干扰；**应用内编辑不会写回**仓库里的 `soul.md` 文件。
- **小习惯（habit）**
  - 记录互动行为形成的习惯摘要（也会被取摘要注入日记生成查询）

### 记忆的生成（写入）链路

1. **打卡触发生成日记**：前端调用 `POST /api/diary` 获取统一 JSON（正文 + 行为计划 + 橱柜计划 + 思考步骤 + memoryCount）。
2. **抽取“可检索摘要”**：前端优先调用 `POST /api/memory-summary`，从日记与上下文抽取：
   - `summary`（30–50 字、一句话可检索）
   - `emotion`（excited/tender/curious/nostalgic/calm）
   - `key_facts`（2–4 关键词，用于检索与掉落/主题判定）
   - 请求体除必填字段外，还可带 **`nfc_source`、同地点 `checkin_frequency`、近 7 天 `interaction_frequency`**、`last_summary` 等，供抽取时丰富 summary/key_facts（仍以日记正文为主）。
   - 失败时回退模板 `buildEpisodicSummary(...)`
3. **写入前端情景记忆**：`appendEpisodicMemory(...)` 写入 `appState.memories.episodic`（带 strength/importance/recall 字段）。
4. **写入向量记忆池（RAG）**：异步调用 `POST /api/embed-and-store`
   - 将 `summary` + `key_facts` 拼成文本，使用 embedding 写入内存向量库（`lib/memory-vector-store.js`）。

### 记忆的检索（召回）链路

#### A. 前端“启发式召回”（非向量）

- `recallRelevantMemories(...)`：
  - 综合考虑：地点匹配、最近地点、时间段、key_facts 命中、strength、importance、recency
  - 用于：
    - 日记卡片“本次参考的记忆来源”展示（用户可展开）
    - 宠物气泡随机引用过去的旅行/日常记忆

#### B. 后端“向量 RAG 检索”（embedding + topK）

- `POST /api/retrieve`：
  - 对 query 文本做 embedding
  - 在 `memory-vector-store` 中做 cosine similarity topK
  - 返回 `memories: [{ content, metadata }]`

### RAG 如何注入日记生成（闭环）

- `POST /api/diary`（**RAG + 统一 JSON 生成**）：
  0. **System 提示**：在可用时拼接 `getSoulTextForPrompt(5500)` 读取的 **磁盘 `soul.md` 节选**（「角色圣经」），与基础日记指令合并；**长文设定以服务端文件为准**，与前端「核心档案」展示同源文件名但可能版本不同步（若仅改本地 `semanticProfile` 未更新部署文件）。
  1. 组装 RAG query（地点 + 性格 + 爱好 + **快照中的偏好/能力/厌恶词** + 习惯摘要等）
  2. 调 `POST /api/retrieve` 召回 `episodicMemories`（字符串摘要列表）
  3. 把 `episodicMemories + semanticTraits + semanticProfileSnapshot + habitSummaries` 注入到 user/上下文提示中
  4. 让模型输出严格 JSON：
     - `content`：旅行日记正文（80–200 字）
     - `behaviorPlan`：宠物房间行为序列（emote/walk/anim/state/wait）
     - `cabinetPlan`：解锁物品建议 `unlockItems` + 家具主题建议 `furnitureSuggestions`
     - `thinkingSteps`：思考过程（可用于可解释 UI）
  5. 响应附带 `memoryCount`（本次注入的记忆条数）

### 可视化与可解释（让用户“看见记忆在工作”）

- **思考区**：播放 `thinkingSteps`，并在第 1 步展示“本次翻到的旅行记忆”列表。
- **日记卡片**：展示“这次我翻到了 X 条旅行记忆”，可展开查看来源。
- **RAG 调试面板**：调用 `GET /api/debug-memories` 展示向量记忆池总数与最近 N 条，并给出“按地点分布”小图。

## 收集物 / 橱柜 / 家具（与记忆联动点）

- **掉落与橱柜**
  - 橱柜容量：12 格
  - 新地点可触发掉落（含分 tier 的掉落逻辑与“新物品红点”）
  - 掉落后弹出 Reward Modal，并写入橱柜数据
- **RAG 参与“解锁来源”**
  - `api/diary` 返回的 `cabinetPlan.unlockItems` / `furnitureSuggestions` 会在前端打卡流程中被提前抽取：
    - 用作“本次掉落/解锁的解释来源”（`ragUnlockSource`）
    - 用作“家具主题推荐”的持久化（`lastFurnitureSuggestion`）
- **家具制作（生成资产）**
  - `POST /api/generate-furniture`：根据地点/日记片段生成一张“单个家具资产”图（isometric 3D 风格）
  - 前端有“制作中遮罩”承接过程，并支持“立即摆放”

## AIGC 能力（除 RAG 外的生成）

- **日记生成（统一入口）**：`POST /api/diary`（推荐路径，包含 RAG）
- **（兼容/旧）通用 Chat 代理**：`POST /api/chat`（OpenRouter 透传）
- **日记配图生成**：`POST /api/generate-image`
  - 前端在日记生成后异步触发
  - 成功后写入 `appState.diaryImages[diaryId]` 并支持导出

## 本地存储与状态持久化

- **`localStorage`**
  - 布局偏好：`soulgo_layout_mode`
  - 主状态：`soulgo_app_state_v1`（包含日记/橱柜/记忆/摆放等）
  - BGM 选择与音量：`soulgo_bgm` 等
  - 处理配额：当图片 data URL 导致 QuotaExceeded，会自动剥离部分 data URL 再重试保存
- **`sessionStorage`**
  - 一次会话内的“提示是否看过”（例如宠物房提示）

## 后端接口清单（与前端关系）

**负责人备忘**：不必在路演中逐条念接口。对外可概括为——**日记与记忆抽取**依赖 OpenRouter（`OPENROUTER_API_KEY`）；**向量写入与检索**依赖 Google Gemini Embedding（`GOOGLE_GENERATIVE_AI_API_KEY`）；缺省时对应链路降级或报错，其中向量化写入在前端为**非阻塞**，避免卡死打卡主流程。

- **`POST /api/diary`**：RAG 检索 + 生成“统一 JSON（日记+行为+橱柜+思考）”；内部读取 `soul.md` 长节选进 system prompt
- **`POST /api/memory-summary`**：从日记与上下文抽取结构化记忆（summary/emotion/key_facts）；system 侧可拼 **soul.md 短摘要**
- **`POST /api/embed-and-store`**：将 summary/key_facts embedding 后写入向量记忆池（需 **`GOOGLE_GENERATIVE_AI_API_KEY`**）
- **`POST /api/retrieve`**：对 query embedding 后从向量记忆池 topK 召回（同上 Google Key）
- **`GET /api/debug-memories`**：调试用：查看向量记忆池最近 N 条
- **`POST /api/generate-image`**：生成日记配图
- **`POST /api/generate-furniture`**：生成家具资产
- **`POST /api/diary-image-comment`**：日记插图相关短评；使用 soul 短摘要 + 可选 `semanticProfileSnapshot`
- **`POST /api/pet/decide`**：宠物自主行为意图（OpenRouter）；使用 soul 短摘要；前端通过 `window.PET_DECIDE_API_URL` 指向（默认 `/api/pet/decide`）
- **`POST /api/chat`**：OpenRouter 透传代理（通用）

内部模块（非独立 HTTP）：[`api/load-soul.js`](api/load-soul.js) 供上述接口 `import` 读取仓库根 `soul.md`。

**环境变量（与当前实现对齐）**：日记/记忆抽取/插图评论/宠物决策等依赖 **`OPENROUTER_API_KEY`**（及可选 `OPENROUTER_MODEL_ID` 等）；向量写入与检索依赖 **`GOOGLE_GENERATIVE_AI_API_KEY`**。缺省时对应接口返回 503，前端对 `embed-and-store` 等非阻塞链路可能仅记录 `appState.debug.ragLastError`。

## 当前实现的关键约束（会影响“记忆”表现）

- **向量记忆池是“进程内存”**：`lib/memory-vector-store.js` 里用数组存储，实例重启/冷启动后会清空。  
  - 这也是前端调试面板提示“可能是刚重启的实例（内存向量库会清空）”的原因。
- **前端记忆是本地持久化**：`appState.memories` 会留在浏览器 `localStorage`，不随服务端重启而消失（但也不跨设备同步）。
- **soul.md 双通道**：服务端只读 **部署目录** 文件；浏览器读 **`/soul.md` 静态 URL**。两者应内容一致；仅在前端修改 `semanticProfile` **不会**更新服务端长文圣经，需自行同步文件或依赖快照字段补足结构化设定。
- **静态托管**：若打开方式导致 `fetch('/soul.md')` 404，前端会提示并回退内嵌 JSON；核心档案长文章节可能显示占位说明。
- **BLE 不经过服务端**：连接、命令、通知均在浏览器与设备之间完成；**无** `/api` 代理或配对记录；刷新页面后需重新连接。

