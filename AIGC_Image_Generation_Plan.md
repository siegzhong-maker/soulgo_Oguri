# AIGC 生图功能规划文档

## 1. 目标
在生成旅行日记的同时，同步生成一张与当前场景、记忆及“皮卡丘”相关的图片，增强日记的表现力。

## 2. 技术方案

### 2.1 核心思路
利用 OpenRouter 的 API 能力，调用支持生图的模型（如 Google Gemini 系列或专门的生图模型）。
由于 OpenRouter 大部分模型通过 `/api/v1/chat/completions` 接口进行统一调用，我们将采用“文生图”的模式。

### 2.2 架构设计

#### 后端 (Vercel Serverless Functions)
新增一个 API 接口 `/api/generate-image`，专门处理生图请求。
*   **输入**：`prompt`（描述词）、`model`（可选，默认配置在环境变量）。
*   **处理**：构建 OpenRouter 请求，设置 `modalities: ["image"]` 或调用特定的生图模型格式。
*   **输出**：返回图片的 URL（通常是 Base64 或临时链接）。

#### 前端 (index.html)
在 `generateDiaryWithAIGC` 函数中增加生图逻辑。
1.  **第一步**：先调用 `/api/chat` 生成日记文本（保持现有逻辑）。
2.  **第二步**：根据生成的日记内容 + 地点 + 天气 + “皮卡丘”元素，构建一个简短的生图 Prompt。
3.  **第三步**：调用 `/api/generate-image`。
4.  **第四步**：将生成的图片展示在日记卡片中。

### 2.3 Prompt 策略
为了保证图片质量和相关性，我们将使用 LLM 先总结出一个英文的生图 Prompt，再传给生图模型。
*   **Prompt 模板**：
    > "A cute Pikachu [doing specific action from diary] at [location], [weather/time], [art style keywords like: digital art, bright colors, travel photography style, high quality]."

---

## 3. 详细实现步骤

### 第一阶段：后端开发
1.  创建 `api/generate-image.js`。
2.  配置环境变量 `OPENROUTER_IMAGE_MODEL`（推荐尝试 `google/gemini-2.0-flash-exp` 或 `google/gemini-2.5-flash-image-preview`，若 OpenRouter 支持）。
3.  实现对 OpenRouter 的调用逻辑，处理 Base64 图片返回。

### 第二阶段：前端开发
1.  修改 `index.html` 中的 `generateDiaryWithAIGC`。
2.  **异步处理优化**：
    *   **第一步**：生成日记文本并渲染日记卡片。此时在卡片中预留一个图片区域，显示“皮卡丘正在绘图中...”的状态（Loading）。
    *   **第二步**：**异步**调用 `/api/generate-image`。
    *   **第三步**：图片生成成功后，通过 DOM 操作将图片插入到预留区域，并移除 Loading 状态。
    *   **异常处理**：若生成失败，显示“重试”按钮或隐藏区域。
3.  构建生图 Prompt（可以使用简单的规则拼接，或者再调一次 LLM 优化 Prompt）。
    *   *优化建议*：直接用规则拼接即可，例如 `Pikachu at ${location}, ${weather}, ${activity summary}`。
4.  在 UI 上渲染图片（插入到日记文本下方或作为卡片封面）。

### 第三阶段：测试与优化
1.  测试不同模型的生图效果和速度。
2.  优化 Prompt 关键词，确保“皮卡丘”形象稳定。
3.  处理生成失败的情况（显示默认图或隐藏图片区域）。

## 4. 接口定义 (Draft)

**POST /api/generate-image**

**Request Body:**
```json
{
  "prompt": "A cute Pikachu standing in front of the Eiffel Tower, sunny day, travel photography style",
  "model": "google/gemini-2.0-flash-exp" // Optional
}
```

**Response:**
```json
{
  "image_url": "data:image/png;base64,..." // 或者 http 链接
}
```

## 5. 依赖检查
*   需要确认 `OPENROUTER_API_KEY` 是否有权限调用生图模型。
*   OpenRouter 的生图模型通常按次计费或 token 计费，需注意成本。
