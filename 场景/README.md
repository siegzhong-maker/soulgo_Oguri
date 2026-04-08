# 场景素材目录

请将以下 PNG/SVG 放入本目录，用于旅行橱柜与地图打卡展示：

**NFC 预设（S-A-B-C 收集物）**
- 星巴克.svg - A级，商家联名（通用咖啡风格占位）
- 麦当劳.svg - A级，商家联名（通用汉堡风格占位）
- labubu.svg - S级，知名IP玩偶（可爱公仔风格占位）
- 兔子.svg - S级，知名IP玩偶（可爱 mascot 风格占位）

**中国地点（固定映射）**
- 北京-糖葫芦.png
- 广州-早茶.png
- 上海—大白兔.png
- 深圳—簕杜鹃.png
- 四川—熊猫.png
- 浙江—雄黄酒.png

**隐藏款（非中国地点打卡时随机展示）**
- 埃及金字塔.png
- 埃菲尔铁塔.png
- 自由女神像.png

若某文件缺失，对应打卡会显示 🧳 占位或裂图 fallback。

---

## AIGC 旅行纪念徽章（批量生成）

目录 **`generated/badges/`** 用于存放脚本生成的手绘徽章风 PNG，并由同目录下的 `manifest.json` 登记后在前端自动并入掉落池与图鉴元数据。

**manifest 路径：** `场景/generated/badges/manifest.json`（JSON 数组；每项至少含 `image`、`label`，建议含 `poolKey`、`collectCategory`、`tier`、`memoryTag`、`regionLabel`）。

- 若填写 **`poolKey`**（如 `深圳`）：该条会进入对应城市的掉落 B 池；若该城市尚无专属池，会先复制当时的全国通用 B 池再追加，避免只剩 AIGC、丢失原有静态款。
- 若不填 **`poolKey`**：只追加进全国通用 B 池（`defaultPool` / `domesticScenePool`）。

**生成脚本：** 仓库 [`scripts/batch-generate-travel-badges.mjs`](../scripts/batch-generate-travel-badges.mjs)（依赖 npm 包 `undici`，克隆后请在仓库根目录执行一次 **`npm install`**。）

- 环境变量：`OPENROUTER_API_KEY`（必填，与 Vercel 一致）；可选 `OPENROUTER_IMAGE_MODEL`（默认 `google/gemini-2.5-flash-image`）。
- 种子列表：默认 [`scripts/badge-seeds.sample.json`](../scripts/badge-seeds.sample.json)，可用 `--seeds /path/to.json` 指定自备约 100 条。
- 每批处理 10 条，批与批之间暂停约 2.5s，降低限流风险；单条失败会重试最多 3 次。
- 可选风格参考图：`--ref 场景/ref/your-style.png`（需自行放入 [`场景/ref/`](ref/)）。
- 若希望走与线上一致的 API 逻辑，可先 `npm run local`（`vercel dev`），再执行：  
  `node scripts/batch-generate-travel-badges.mjs --base-url http://localhost:3000 --seeds scripts/badge-seeds.sample.json`
- 否则直连 OpenRouter：  
  `npm run generate:badges`  
  或  
  `node scripts/batch-generate-travel-badges.mjs --seeds scripts/badge-seeds.sample.json`

**要不要自己输入地点？** 不用交互输入。地点写在种子 JSON 里（`poolKey` / `badge_place_name` / `landmark_hint`）；试跑一张可用 **`--limit 1`**（用 seeds 里第一条），或 **`--place 深圳 --landmark "平安金融中心"`**（忽略 seeds，只生成这一条）。

**前端：** 应用加载时会 `fetch('场景/generated/badges/manifest.json')` 合并进国内池与按 `poolKey` 的地点池。开发抽检可在 URL 加 **`?badge_lab=1`** 打开全屏缩略图网格。

**`--base-url` 报 `fetch failed` / `Connect Timeout`：** 说明连不上 Vercel。国内直连常被墙；需 **HTTP 代理**（如 `export HTTPS_PROXY=http://127.0.0.1:7890`，Clash 的 **HTTP** 端口，不是 mixed 误用成 socks-only）。注意：Node 的 `fetch` **不会自动读** 环境变量里的代理，脚本已用 `undici` 的 **ProxyAgent** 显式走 `HTTPS_PROXY`/`HTTP_PROXY`。若仍超时，检查 Clash「允许局域网连接」、用 `curl -x $HTTPS_PROXY -I https://soulgo-tuzi.vercel.app` 测代理。

---

## 用户打卡导出（ZIP → 场景/generated/exports）

游戏内橱柜仍为 **最多 100 件**（`CABINET_SLOTS`），数据在浏览器 `localStorage` / IndexedDB。若要把某次打卡的**配图与收集物相关文件**落到仓库目录，请用奖励弹窗里的 **「导出本次打卡素材 ZIP」**：

**ZIP 内常见文件**

- `meta.json`：本次 `diaryId`、地点、`droppedScene` 快照、情景记忆与橱柜条目摘要（大段 base64 图在 meta 里会省略，以独立二进制文件为准）。
- `diary-aigc.*`：旅行日记 AIGC 配图（扩展名随格式变化）。
- `collectible.*`：本次解锁的旅行场景收集物图（静态路径或徽章图）。
- `furniture.*`：若本次为「灵感小物」档，家具生成图。

**写入本仓库目录（ingest）**

在仓库根目录执行（需已 `npm install`）：

```bash
npm run ingest:checkin -- ./soulgo-checkin-<diaryId>-<yyyymmdd>.zip
```

文件会解压到 **`场景/generated/exports/<地区或地点>/<diaryId>/`**。

可选 **`--print-manifest`**：在同目录生成 `manifest-entry.json`，并在终端打印一段可**手工合并**进 `场景/generated/badges/manifest.json` 的数组片段（用于把该图纳入掉落池；不合并则仅作本地归档）。

```bash
npm run ingest:checkin -- ./path/to/export.zip --print-manifest
```

脚本实现见 [`scripts/ingest-checkin-export.mjs`](../scripts/ingest-checkin-export.mjs)。
