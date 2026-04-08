# 硬件震动模拟功能规划文档

## 1. 项目背景
目前用户在“打卡”后会获得不同等级（S/A/B/C）的物品（纪念品/场景）。为了增强用户体验，拟增加“硬件震动模拟”功能，根据物品等级提供不同强度的震动反馈。由于是 Web 环境，主要通过视觉效果（UI 震动动画）和文本提示来模拟震动感知。

## 2. 需求说明
- **触发时机**：用户打卡（Punch-in）成功，并展示物品预览（Check-in Preview）时。
- **震动规则**：
    - **S 级**：强烈震动（大幅度摇晃 + 醒目提示词）。
    - **A 级**：中等震动（明显摇晃 + 提示词）。
    - **B 级**：轻微震动（轻微摇晃 + 提示词）。
    - **C 级**：微弱震动或无震动（几乎不动）。
- **表现形式**：
    - **视觉动画**：物品卡片或图片进行 CSS 动画摇晃。
    - **文本提示**：界面上显示如“收到强烈震动反馈！”的文本。
    - **物理震动（可选）**：尝试调用 `navigator.vibrate` API（在支持的移动设备上生效）。

## 3. 技术方案

### 3.1 数据来源
在 `index.html` 的打卡逻辑中，`getDroppedScene` 函数已经返回了包含 `tier` 属性（S/A/B/C）的 `droppedScene` 对象。
该对象随后被传递给 `showCheckinPreview` 函数。

### 3.2 逻辑注入点
修改 `showCheckinPreview` 函数：
1. 从 `scene` 对象中获取 `tier` 属性。
2. 根据 `tier` 添加对应的 CSS 动画类名。
3. 插入对应的文本提示 HTML。
4. 调用 `navigator.vibrate`（如果支持）。

### 3.3 震动模式定义
| 等级 | CSS 动画类名 | 动画描述 | 文本提示示例 | 物理震动 (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **S** | `shake-hard` | 剧烈摇晃，持续时间稍长 | 📳 稀有信号接入！强力震动！ | `[200, 100, 200, 100, 200]` |
| **A** | `shake-medium` | 明显摇晃 | 📳 发现优质信号，震动提示 | `[200, 100, 200]` |
| **B** | `shake-soft` | 轻微晃动 | 📳 获取普通信号 | `[200]` |
| **C** | `shake-tiny` | 极微小抖动 | (无或微弱提示) | `[50]` |

### 3.4 CSS 动画设计
需要新增 CSS `@keyframes` 定义：
- `@keyframes shake-hard`: 大幅度的 translate/rotate。
- `@keyframes shake-medium`: 中等幅度的 translate。
- `@keyframes shake-soft`: 小幅度的 translate。

## 4. 实施步骤
1. **编写 CSS**：在 `<style>` 标签或 CSS 文件中添加 `.shake-hard`, `.shake-medium`, `.shake-soft` 等类定义。
2. **修改 JS 逻辑**：
    - 在 `showCheckinPreview` 中解析 `scene.tier`。
    - 根据 tier 动态生成 HTML 文本。
    - 为图片或容器元素添加对应的 shake class。
    - 调用 `navigator.vibrate`。
3. **验证**：
    - 模拟打卡，通过修改代码强制命中 S/A/B/C 级，观察效果。

## 5. 预期效果
用户打卡获得 S 级物品时，预览卡片剧烈摇晃，并显示“📳 稀有信号接入！强力震动！”，给用户强烈的惊喜感。
