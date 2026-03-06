# 皮卡丘智能交互规划方案：精准定位与行为优化

## 1. 核心问题
目前皮卡丘在房间内的交互存在以下痛点：
1.  **定位模糊**：移动目标点通常只是一个大概的区域（如“床的附近”），导致皮卡丘有时会“穿模”或者站在奇怪的位置进行交互。
2.  **朝向缺失**：皮卡丘到达目标后没有正确的朝向控制（例如床在左边，它应该面朝左躺下，但目前可能面朝右）。
3.  **动作生硬**：缺乏“移动 -> 调整 -> 交互”的连贯性，到达后直接切换状态，略显突兀。

## 2. 解决方案：智能交互锚点系统 (Smart Interaction Anchors)

我们将引入一套基于**锚点 (Anchors)** 的定位系统，明确定义每个家具的**入口点**、**交互点**和**朝向**。

### 2.1 坐标系定义
沿用现有的 CSS 百分比坐标系（`bottom` / `left`），确保在不同屏幕尺寸下的自适应能力。
*   **X轴**：`left: 0%` (左) -> `100%` (右)
*   **Y轴**：`bottom: 0%` (下) -> `100%` (上)

### 2.2 数据结构设计
在 `index.html` (或独立的配置 js) 中扩展 `HOTSPOT_BEHAVIOR_PRESETS`，增加精确的锚点信息。

```javascript
const INTERACTION_ANCHORS = {
    // 床：睡觉/休息
    bed: {
        // 1. 移动目标点：走到床边
        entryPoint: { bottom: '30%', left: '55%' }, 
        // 2. 交互位置：跳到床上（视觉修正）
        interactionPoint: { bottom: '35%', left: '50%' },
        // 3. 交互朝向：'left' | 'right' | 'front' | 'back'
        facing: 'left',
        // 4. 交互动画序列
        actionSequence: [
            { type: 'move', target: 'entryPoint' },
            { type: 'face', direction: 'left' },
            { type: 'jump', target: 'interactionPoint' }, // 可选：跳跃上床
            { type: 'anim', name: 'rest', duration: 5000 } // 使用映射名 'rest' (对应 flog_xiuxi_*.png)
        ],
        resultingState: 'rest'
    },
    
    // 橱柜：欣赏收藏品
    cabinet: {
        entryPoint: { bottom: '25%', left: '20%' },
        facing: 'left', // 橱柜在左墙
        actionSequence: [
            { type: 'move', target: 'entryPoint' },
            { type: 'face', direction: 'left' },
            { type: 'anim', name: 'observe', duration: 3000 } // 使用映射名 'observe' (对应 flog_guancha_*.png)
        ],
        resultingState: 'idle_observe'
    },
    
    // 门口：期待出门
    door: {
        entryPoint: { bottom: '28%', left: '80%' },
        facing: 'right',
        actionSequence: [
            { type: 'move', target: 'entryPoint' },
            { type: 'face', direction: 'right' },
            { type: 'anim', name: 'wait', duration: 2000 } // 使用映射名 'wait' (对应 flog_dengdai_*.png)
        ],
        resultingState: 'interact'
    }
};
```

### 2.3 关键逻辑改造

#### A. 增强移动函数 `smartMoveTo(targetKey)`
不再直接调用底层的 `walkPetAlongPath`，而是封装一个高级指令函数。

1.  **获取锚点配置**：根据 `targetKey` (如 'bed') 获取 `INTERACTION_ANCHORS` 配置。
2.  **执行移动**：调用 `walkPetAlongPath` 走到 `entryPoint`。
3.  **朝向修正**：
    *   在 CSS 中增加 `.face-left` 类：`transform: scaleX(-1);`
    *   到达后根据 `facing` 字段添加或移除该类。
4.  **位置微调 (Jump/Offset)**：如果定义了 `interactionPoint`，在到达 `entryPoint` 后通过 CSS 动画平滑过渡到 `interactionPoint`（模拟跳上床的效果）。
5.  **播放交互动画**：根据 `name` 查找对应的图片序列（如 `rest` -> `flog_xiuxi_*.png`）并播放。

#### B. 视觉朝向控制
目前皮卡丘默认朝向可能未统一定义。我们需要约定：
*   **默认素材朝向**：假设素材默认**面朝左**（根据观察 `flog_guancha_002.png` 似乎是侧面，需确认默认朝向）。
*   **翻转逻辑**：
    ```css
    .pet-face-right { transform: translateX(-50%) scaleX(-1); } /* 假设默认朝左 */
    .pet-face-left { transform: translateX(-50%) scaleX(1); }
    ```
    *注意：因为使用了 `translateX(-50%)` 进行居中，翻转时要小心 `transform-origin`。*

### 2.4 动画资源映射 (Animation Mapping)
基于 `/比卡丘动画导出` 目录下的资源，建立如下状态映射表：

| 动作名称 (Action Name) | 对应状态 (State) | 资源前缀 (Prefix) | 用途说明 |
| :--- | :--- | :--- | :--- |
| **idle / breathe** | IDLE_BREATH | `frog_idle_` | 默认待机呼吸 |
| **interact** | INTERACT | `flog_hudong_` | 与用户点击互动、开心 |
| **rest** | REST | `flog_xiuxi_` | 在床上睡觉、休息 |
| **wait** | IDLE_WAIT | `flog_dengdai_` | 在门口等待、期待出门 |
| **observe** | IDLE_OBSERVE | `flog_guancha_` | 查看橱柜、阅读日记 |

> **注意**：文件名存在 `frog` (青蛙?) 和 `flog` 的拼写混用（可能是 typo），代码中需做兼容处理或统一重命名。

### 2.5 交互流程图 (State Flow)

```mermaid
graph TD
    A[Idle] -->|AI决策/用户点击| B(获取目标 Bed 配置)
    B --> C[Move: 走到 Bed.entryPoint]
    C --> D{到达?}
    D -->|Yes| E[Face: 转身朝向 left]
    E --> F[Jump: 跳到 Bed.interactionPoint]
    F --> G[Anim: 播放 rest (flog_xiuxi) 动画]
    G --> H[State: 保持 REST 状态]
```

## 3. 实施步骤

1.  **CSS 准备**：
    *   添加 `.pet-face-left` / `.pet-face-right` 类。
    *   确认并调整 `transform-origin` 以确保转身时不会发生位移突变。
2.  **坐标测绘**：
    *   使用浏览器控制台，手动调整皮卡丘位置，找到 Bed, Cabinet, Door 的最佳 `entryPoint` 和 `interactionPoint` 坐标（百分比）。
3.  **JS 逻辑实现**：
    *   实现 `smartMoveTo` 函数。
    *   改造 `decidePersonalityBehavior`，使其返回结构化的 `targetKey` 而不是模糊指令。
4.  **测试与微调**：
    *   逐个测试家具的交互效果，确保没有穿模。

## 4. 确认项 (Confirmed)
*   [x] **皮卡丘默认朝向**：**左 (Left)**。
    *   这意味着 `transform: scaleX(1)` 时面朝左。
    *   若要面朝右，需应用 `transform: scaleX(-1)`。
*   [x] **橱柜位置**：**左侧墙面 (Left Wall)**。
    *   交互时皮卡丘应走到房间左侧，并面朝左（即面朝墙壁/橱柜）。
*   [x] **交互简化**：
    *   不需要复杂的“下床/反向动作”。
    *   交互结束后，皮卡丘可以直接恢复到 `IDLE` 状态，或走回房间中央，或直接开始下一个动作序列。

---

## 5. 震动功能联调与硬件搭配

### 5.1 目标
为皮卡丘的关键行为增加震动反馈：前期在 Web 内用视觉/声音模拟，后期预留真实硬件（蓝牙/串口或 App 震动）的扩展接口，便于与实体设备联调。

### 5.2 抽象震动接口层
在前端统一封装震动能力，业务代码只调用抽象接口，不关心具体实现。

*   **统一入口**：`triggerVibration(patternKey)`。
*   **实现方式**（按优先级 fallback）：
    1.  **浏览器模拟**：CSS 轻微抖动动画 + 可选短音效，作为无硬件时的默认效果。
    2.  **标准 Web API**：在支持 [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) 的环境（如部分 Android 浏览器）中使用 `navigator.vibrate(pattern)`。
    3.  **硬件桥接**：预留 `customVibrationAdapter(patternKey)` 钩子，由蓝牙/串口/原生壳注入，用于真实马达控制。

### 5.3 震动模式配置
在配置中定义 `VIBRATION_PATTERNS`，与行为锚点挂钩：

```javascript
const VIBRATION_PATTERNS = {
    happy_short:   [50, 30, 50],      // 开心互动：短促两下
    sleep_soft:    [100],             // 上床休息：单次轻柔
    alert_strong:  [80, 40, 80, 40],  // 惊讶/紧张：连续提醒
    wait_mild:     [40]               // 门口等待：轻微一下
};
```

*   **与锚点联动**：在 `INTERACTION_ANCHORS` 的每个锚点中增加可选字段 `vibrationPattern`，在 `smartMoveTo` 执行完对应 `actionSequence` 后调用 `triggerVibration(anchor.vibrationPattern)`。
*   **与心情/决策联动**：大模型决策或心情变化触发的行为也可传入 `vibrationPattern`，由统一执行器在适当时机触发。

### 5.4 硬件联调扩展点
*   **协议约定**：前端通过统一桥接层发送结构化指令，例如 `{ type: 'vibration', pattern: 'happy_short' }`。具体传输方式由桥接层实现（如 `postMessage`、WebSocket、Web Serial、Web Bluetooth 或原生 App 注入的 JS 接口）。
*   **封装**：所有对外硬件调用收敛到单一模块（如 `hardwareBridge.sendVibration(patternKey)`），便于切换实现和调试。
*   **调试开关**：在全局配置中提供“仅模拟 / 模拟+真实硬件”开关，开发阶段可关闭真实输出，仅用模拟效果验证逻辑。

### 5.5 实施要点
1.  在 `index.html` 中实现 `triggerVibration(patternKey)` 及上述三种实现的 fallback 逻辑。
2.  在 `INTERACTION_ANCHORS` 中为 bed、cabinet、door 等补充 `vibrationPattern`，并在 `smartMoveTo` 或统一行为执行器中调用。
3.  硬件联调时实现并注入 `customVibrationAdapter`，将 `patternKey` 映射为设备支持的震动序列或指令。

---

## 6. 心情/健康系统与展示

### 6.1 目标
建立轻量的心情与健康数值模型，并在宠物旁边直观展示当前状态（如心情图标 + 简短文案），为后续大模型决策提供结构化输入。

### 6.2 状态模型
*   **心情 (mood)**：数值范围建议 `-100 ~ 100`，可离散为档位：沮丧 / 一般 / 开心 / 兴奋。
*   **健康 (health)**：数值范围 `0 ~ 100`，表示精力与身体状态，影响是否容易“疲劳”、是否需要休息等。
*   **衍生量（可选）**：如 `energyLevel`（高/中/低）、`affinity`（对玩家的好感度），用于提示词或规则分支。

### 6.3 更新规则（示例）
与现有锚点行为、用户操作挂钩，在行为结束或定时 tick 中更新：

| 事件 | mood 变化 | health 变化 |
| :--- | :--- | :--- |
| 完成床上休息 | 小幅增加 | 中幅增加 |
| 与用户开心互动 | 中幅增加 | 不变或小幅增加 |
| 长时间无人互动 | 缓慢下降 | 不变 |
| 频繁奔跑/跳跃 | 小幅增加 | 小幅下降 |
| 到达门口等待 | 小幅增加 | 不变 |

*   **自然衰减/恢复**：每 N 秒对 mood 做缓慢向中性值（如 0）的回归，避免长期极端值；health 可缓慢自然恢复上限。

### 6.4 UI 展示
*   **位置**：在宠物容器旁增加一个小面板（如宠物右侧或下方），不遮挡主视觉。
*   **内容**：
    *   心情：图标（如表情） + 一行文案（如“心情：开心”）。
    *   健康：简短文案（如“健康：良好”）或小进度条/圆点。
*   **风格**：与房间整体风格一致，尽量简洁，避免信息过载。
*   **可选**：根据 mood/health 微调待机表现（如心情差时待机更“蔫”，心情好时偶尔更活泼）。

### 6.5 与现有逻辑的衔接
*   **数据结构**：在全局状态中维护 `petState.mood`、`petState.health`（及可选衍生字段）。
*   **行为返回值扩展**：`decidePersonalityBehavior` 或大模型决策结果中可带 `moodDelta`、`healthDelta`；行为执行器在完成 `actionSequence` 后调用 `updateMoodAndHealth(moodDelta, healthDelta)`，再刷新 `renderMoodHealthPanel()`。
*   **锚点配置**：可在 `INTERACTION_ANCHORS` 的 `resultingState` 旁增加可选的 `moodDelta` / `healthDelta`，由执行器统一应用。

---

## 7. 大模型行为决策

### 7.1 目标
将宠物行为决策从纯前端规则升级为“大模型给出高层意图，前端根据锚点系统落地为具体移动与动画序列”，并可与心情/健康、震动联动。

### 7.2 架构角色划分
*   **大模型**：作为“高层意图生成器”，输入为结构化上下文（时间、最近行为、用户操作、当前 mood/health 等），输出为单一意图标识 + 可选原因。
*   **前端**：负责将意图映射到 `INTERACTION_ANCHORS` 的 `targetKey` 与 `actionSequence`，执行 `smartMoveTo`、更新心情/健康、触发震动。

### 7.3 意图集合与映射
预先定义有限意图枚举，便于解析与安全过滤：

| 意图 (intent) | 说明 | 映射锚点 (targetKey) |
| :--- | :--- | :--- |
| go_to_bed_and_rest | 去床上休息 | bed |
| check_cabinet | 去橱柜观察 | cabinet |
| wait_at_door | 到门口等待 | door |
| play_with_user | 靠近玩家互动 | 需结合点击位置或固定“互动点” |
| walk_randomly | 在房间闲逛 | 随机选点或固定 idle 点 |

*   大模型仅从上述意图中选一，并返回结构化 JSON，例如：`{ "intent": "go_to_bed_and_rest", "reason": "pet_is_tired", "priority": 0.8 }`。
*   前端根据 `intent` 查表得到 `targetKey`，再交给现有 `smartMoveTo(targetKey)` 与锚点逻辑执行。

### 7.4 提示词与上下文
*   **输入**：将当前 `mood`、`health`、最近 N 次行为、用户最近一次点击/操作、时间段等整理成简短自然语言 + 关键字段 JSON，作为 prompt 的一部分。
*   **输出**：明确要求模型只返回指定 JSON 结构，便于前端 `JSON.parse` 后直接使用，减少幻觉与格式错误。
*   **安全层**：前端对返回的 `intent` 做白名单校验；若不在枚举内或请求失败，则 fallback 到本地规则决策（如随机选锚点或按 mood/health 选休息/门口等）。

### 7.5 前端与后端边界
*   **接口**：定义 `requestPetDecision(context) -> Promise<Decision>`，内部将 `context` 发往后端（如 `POST /api/pet/decide`）。后端负责调用大模型并返回 `{ intent, reason?, priority? }`。
*   **调用时机**：在主循环或事件驱动中，当宠物处于空闲且非关键动画时触发决策请求；收到结果后映射到锚点并执行行为，同时可传入 `moodDelta`/`healthDelta` 与 `vibrationPattern`，由统一执行器完成移动、动画、心情更新与震动。

### 7.6 与心情/健康、震动的联动
*   发送给大模型的 `context` 中包含当前 `mood`、`health`，便于模型做出“需要休息”“可以玩耍”等判断。
*   可在执行层统一封装：`executeBehavior({ targetKey, intent, moodDelta, healthDelta, vibrationPattern })`，内部依次执行移动与动画、更新心情/健康、刷新心情面板、触发震动。
*   可选：健康过低时前端强制将意图 override 为休息（如 `go_to_bed_and_rest`），保证体验与安全。

### 7.7 实施顺序建议
1.  先实现并稳定锚点系统与 `smartMoveTo`、心情/健康 UI 及震动模拟。
2.  再在后端实现 `/api/pet/decide` 与意图枚举、提示词和 JSON 输出格式。
3.  前端将原规则决策改为“优先请求大模型决策，失败则本地规则 fallback”，并接入 `executeBehavior` 统一流程。
4.  根据实际效果迭代提示词与意图集合，并可增加简单调试面板（显示最近一次 intent/reason、当前 mood/health、最近行为历史）便于联调。
