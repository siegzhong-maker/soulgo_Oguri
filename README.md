# SoulGo（IP 伴游电子宠物）

结合实体 IP 玩偶的旅行陪伴类 Web MVP：**地图打卡** → **AI 旅行日记**（含可选 **RAG 记忆检索**）→ **纪念配件 / 橱柜 / 宠物房间**；可选通过 **Web Bluetooth** 连接 ESP32 类挂件，在打卡时做震动反馈。

## 技术栈与数据流（简述）

- **前端**：入口仅为根目录 [`index.html`](index.html)（单页应用；Vercel 将所有路径重写至此）；主要状态在浏览器 **`localStorage`**（`soulgo_app_state_v1` 等），不依赖账号即可完整演示。
- **生成与对话**：服务端通过 OpenRouter 代理（需 `OPENROUTER_API_KEY`），统一日记入口为 **`POST /api/diary`**（内部可调用检索）；兼容旧路径 **`POST /api/chat`**。
- **向量记忆（演示级）**：**`POST /api/embed-and-store`** / **`POST /api/retrieve`** 使用 Google Gemini **Embedding**（需 `GOOGLE_GENERATIVE_AI_API_KEY`）。向量池当前为**进程内存**（见 [`lib/memory-vector-store.js`](lib/memory-vector-store.js)），实例冷启动或重启后会清空；前端对写入失败多为非阻塞降级。
- **角色一致**：仓库根 [`soul.md`](soul.md) 为角色圣经；部署后需可通过 **`GET /soul.md`** 访问，并与各 API 内加载的节选保持一致（详见 [`api/load-soul.js`](api/load-soul.js)）。

更细的产品能力、接口与路演口径见 [`FEATURELIST.md`](FEATURELIST.md)。

## 本地运行

1. 安装依赖（项目含 `ai`、`@ai-sdk/google`、`sharp` 等，供 Serverless 与脚本使用）：

   ```bash
   npm install
   ```

2. 复制环境变量并填写 Key（**勿提交** `.env.local`）：

   ```bash
   cp .env.example .env.local
   # 编辑 .env.local：
   #   OPENROUTER_API_KEY       — 日记、聊天、宠物决策、生图等
   #   GOOGLE_GENERATIVE_AI_API_KEY — 向量写入与检索（Embedding）
   ```

3. 启动带 `/api/*` 的本地环境（与线上一致）：

   ```bash
   npm run local
   ```

   等价于 `vercel dev`；浏览器打开终端提示的地址（多为 `http://localhost:3000`）。**根路径即唯一前端入口**（`vercel.json` 将所有页面请求重写至 [`index.html`](index.html)）。

### 常用 npm 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run local` | `vercel dev`，本地静态页 + Serverless API |
| `npm run verify:rabbit-assets` | 校验兔子相关静态资源 |
| `npm run validate:pet-home-manifest` | 校验宠物房间资源 manifest |
| `npm run generate:badges` | 批量生成旅行徽章类资源 |
| `npm run ingest:checkin` | 打卡数据导入脚本（见 `scripts/`） |

## 环境变量说明

| 变量 | 用途 |
| --- | --- |
| `OPENROUTER_API_KEY` | **必需**（除纯静态预览外）：`/api/chat`、`/api/diary`、`/api/memory-summary`、`/api/pet/decide`、`/api/generate-image`、`/api/generate-collectible`、`/api/generate-furniture`、`/api/diary-image-comment` 等 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **RAG 链路**：`/api/embed-and-store`、`/api/retrieve`；未配置时对应接口不可用，前端打卡主流程仍可尽量继续 |
| `OPENROUTER_IMAGE_MODEL` | （可选）生图模型，默认 `google/gemini-2.5-flash-image` |
| `OPENROUTER_VISION_MODEL` | （可选）日记配图多模态点评，见 `api/diary-image-comment.js` |
| `OPENROUTER_DIARY_MODEL` / `OPENROUTER_MODEL_ID` / `OPENROUTER_MEMORY_MODEL` | （可选）覆盖各接口默认模型，见对应 `api/*.js` |

示例占位见 [`.env.example`](.env.example)。

### 获取 Key

- **OpenRouter**：[openrouter.ai](https://openrouter.ai/) → [Keys](https://openrouter.ai/keys)。
- **Google Gemini（Embedding）**：[Google AI Studio](https://aistudio.google.com/) 等渠道创建 API Key。

**请勿将真实 Key 写入前端或提交 Git。** 仅放在 Vercel 环境变量或本地 `.env.local`。

## 部署到 Vercel

1. 将仓库推送到 GitHub，在 [Vercel](https://vercel.com) 中 Import 该仓库。
2. 在 **Settings → Environment Variables** 中至少配置：
   - `OPENROUTER_API_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`（若需演示 RAG 检索与记忆写入）
3. 按需添加上表可选模型变量，保存后重新部署。
4. 访问 `https://你的项目.vercel.app/` 即为 **`index.html`**；日记与记忆相关请求由 Serverless 代理，Key 不会暴露到浏览器。

## 项目结构（核心）

| 路径 | 说明 |
| --- | --- |
| `index.html` | 唯一主单页（打卡、日记、橱柜、宠物房、BLE 入口等） |
| `soul.md` | 角色圣经（需与部署根路径静态访问一致） |
| `api/diary.js` | 日记生成主入口（含 RAG 调用等） |
| `api/chat.js` | OpenRouter 通用代理 |
| `api/memory-summary.js` | 结构化记忆抽取 |
| `api/embed-and-store.js` / `api/retrieve.js` | 向量写入与检索 |
| `api/debug-memories.js` | 调试：查看内存向量池 |
| `api/generate-image.js` / `generate-collectible.js` / `generate-furniture.js` | 配图与资产生成 |
| `api/diary-image-comment.js` | 日记插图 Soul 风格点评 |
| `api/pet/decide.js` | 宠物行为决策 |
| `api/load-soul.js` | 供其他 API 读取 `soul.md` |
| `lib/memory-vector-store.js` | 内存向量存储实现 |
| `bleConfig.js` / `esp32BleClient.js` | Web Bluetooth 与设备名等配置 |
| `esp_gps_blue/` | ESP32 固件与对接说明（硬件侧） |
| `场景/`、`assets/` | 静态场景与资源 |
| `vercel.json` | 重写规则：全站 → `index.html`，`/api/*` 走函数 |

## 安全说明

- API Key 仅存放在**服务端环境变量**（Vercel 或本地 `.env.local`），不写入前端源码，不提交仓库。
- 若 Key 曾泄露，请在对应平台撤销并轮换，新 Key 只通过环境变量注入。
