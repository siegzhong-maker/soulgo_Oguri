# 家具生成功能规划 (Furniture Generation Plan)

## 1. 概述
在现有的旅行打卡循环中增加一个自动化的“家具制作”系统。当用户在某个地点打卡后，宠物会根据该地点或生成的旅行日记“制作”一件独特的家具。这将“记忆系统”与“宠物之家”的装饰玩法结合起来，让每一次旅行都转化为可视化的家装奖励。

## 2. 用户体验 (UX) 流程

### 1. 触发：旅行打卡
- 用户完成地点打卡（例如：“上海 Blue Bottle Coffee”）。
- 系统生成“旅行日记”（现有功能）。

### 2. 动作：宠物制作中 (Visuals & Animation)
- **触发时机**：日记生成并展示完毕后，用户点击“关闭日记”或自动进入制作环节。
- **宠物动态**：
    - 宠物头顶出现**“工匠帽”**或手持**“小锤子”**图标。
    - 宠物周围出现**“烟尘/星星”**粒子特效，表示正在努力工作中。
    - 宠物会有**“敲打”**或**“施法”**的逐帧动画（CSS/JS 动画）。
- **界面反馈**：
    - 屏幕下方或宠物头顶出现气泡进度条：“正在通过记忆碎片制作纪念品...”
    - 伴随轻微的敲击声效（可选）。

### 3. 生成（后台处理）
- 系统分析**地点名称**、**城市**和**日记内容**。
- 生成符合主题的家具提示词（例如：“一张具有 Blue Bottle 风格的现代咖啡桌”或“公园里的竹椅”）。
- 调用 AI 图像生成 API。

### 4. 奖励：获得新家具（日常灵感 · 低门槛）
产品定位遵循「低门槛 + 高上限」：**AI 家具 = 可规模化、低摩擦的日常装扮**，不占用「典藏 / 联名 / 在地限定」的心理账户；后者才使用强烈稀有感动效与陈列位。

- **揭晓**：制作结束后弹出轻量「收到灵感小物」模态（弱化边框与标题色，与场景级收集区分）。
- **展示**：等距 3D 风格图 + 名称；**不使用**典藏向的「稀有度炸光」主视觉；角标为「日常灵感」类文案。
- **震动**：使用较短、较轻的 `item_obtained_soft` 模式，与高稀有场景收集的 `item_obtained` 区分。
- **操作**：用户点击「放入橱柜」或「立即摆放」。

**典藏件**（联名、线下 NFC / 地理围栏、活动码等）由独立入口写入橱柜，**不经过** `generate-furniture`；前端在「典藏与限定」分区展示，与「日常灵感收纳」分区隔离。

### 5. 家具摆放与存储 (Storage & Placement)
- **存储位置**：所有生成的家具自动存入**“家具橱柜 (Furniture Cabinet)”**。
- **摆放逻辑**：
    - 用户点击主界面的“橱柜”按钮打开面板。
    - 在橱柜中点击某个家具，选择**“摆放”**。
    - **摆放模式**：
        - 家具将以**贴纸/图层**的形式出现在宠物房间的中心。
        - 用户可以**拖拽**家具调整位置，**缩放**调整大小（简易版装修）。
        - 点击“保存”后，家具位置被锁定并持久化存储。

## 3. 技术实现

### 前端 (`index.html`)
- **状态管理**：
    - 更新 `appState.cabinetItems` 以存储家具对象，至少包含：`{ id, type: 'furniture', image, name, source_location, date, tier: 'C', ai_generated, collectCategory, assetSource: 'ai_daily', scarcity: 'soft_capped' }`（`assetSource` / `scarcity` 与旅行场景、典藏件统一建模，便于 UI 分支与运营扩展）。
- **UI 组件**：
    - **制作动画**：新增 `.pet-anim-crafting` CSS 动画类，包含位移和旋转关键帧。
    - **装修模式**：新增一个图层 `furniture-layer` 在宠物下方/上方，支持 Touch 事件进行拖拽。
- **逻辑挂钩**：
    - 在 `generateDiaryWithAIGC` 内部或之后触发制作流程。

### 后端 (`api/generate-furniture.js`)
- **接口**：`POST /api/generate-furniture`
- **输入**：`{ location: string, diary_excerpt: string, city: string }`
- **逻辑**：
    - **提示词构建**：
        - 分析输入以确定家具类型（桌子、椅子、灯具、装饰品）。
        - 应用**等距 3D 风格**提示词模板。
    - **模型**：`google/gemini-2.5-flash-image`。
    - **响应**：`{ image_url: string, item_name: string, assetSource: 'ai_daily', scarcity: 'soft_capped', source_location: string }`（`assetSource` 固定为日常灵感线，供前端弹窗与橱柜分区使用。）

## 4. 提示词工程策略

### 上下文提取规则（记忆系统）
系统需要将地点映射到家具类型以确保多样性。
- **咖啡馆/餐厅** -> 桌子、椅子、马克杯、食物装饰。
- **公园/自然** -> 长椅、盆栽、石灯笼、花坛。
- **城市/市区** -> 路灯、路牌、微缩建筑。
- **家/酒店** -> 床、沙发、灯具、地毯。

### 主提示词模板 (英文 Prompt 以保证生成质量)
> "Generate an isometric 3D game asset of a piece of furniture.
> **Subject**: A [Furniture Type] themed around [Location Name/Context].
> **Style**: Cute, casual mobile game art style. Bright colors, smooth textures.
> **View**: Isometric projection.
> **Background**: Pure white (hex #FFFFFF).
> **Constraint**: Single object, no text, no background scenery.
> **Details**: Include subtle elements representing [City/Location] (e.g., cherry blossoms for Japan, red lantern for Beijing)."

## 5. 开发步骤
1.  **后端**：创建 `api/generate-furniture.js`。
2.  **前端 - 动画与弹窗**：实现宠物制作动画和获得物品弹窗。
3.  **前端 - 装修系统**：实现家具从橱柜到房间的拖拽摆放逻辑。
4.  **联调**：串联打卡 -> 制作 -> 生成 -> 摆放的全流程。
