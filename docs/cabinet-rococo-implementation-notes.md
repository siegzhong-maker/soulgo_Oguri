# 见闻柜洛克风改版 — 实现说明

**已落地**：变更直接写入根目录 [`index.html`](../index.html)。大段 CSS 正文备份在 [`rocco_css_inject.md`](rocco_css_inject.md)（`BEGIN_ROCCO_CSS` … `END_ROCCO_CSS`），便于以后微调或复用。

若需在本机重放相同替换，可对仓库根目录执行：`python3` 读取该 MD 中的 CSS 块并对 `index.html` 做等价替换（或从历史提交对比）。

## 1. CSS（替换从 `#modal-panel[data-modal-variant="cabinet"] #modal-title` 到 `.cabinet-modal .text-gray-400` 整段，并追加布局/详情类）

将 `index.html` 中原有的：

- `#modal-panel[data-modal-variant="cabinet"] #modal-title { color: #5c4a3a; }`
- 物品详情 catalog 居中规则（两段 `#modal-body .cabinet-item-catalog`）
- `.cabinet-modal { background-color: #e6dccf; ... }` 及 `.text-gray-800` / `.text-gray-400` 覆盖

替换为计划中「洛克式外框 + 羊皮纸内衬」完整样式块，包括：

- `#modal-panel[data-modal-variant="cabinet"]` 多层 `box-shadow`、渐变背景
- `data-cabinet-subview="detail"` 下列表/详情 catalog 对齐差异
- `.cabinet-layout`、`.cabinet-chrome-bar`、`.cabinet-progress-row`、`.cabinet-progress-meter`、`.cabinet-segment-wrap`、`.cabinet-segment-btn--active/--idle`
- `.cabinet-suggestion-banner`、`.cabinet-main-panel`、`.cabinet-footer-hint`
- `.cabinet-matrix-toolbar*`、`.cabinet-hobby-chip`、`.cabinet-matrix-layout-btn--active`
- `.cabinet-item-detail.cabinet-detail-grid`、`.cabinet-detail-artframe`、`.cabinet-detail-primary-btn`、`.cabinet-detail-back-btn`

## 2. 矩阵表头/品类行/格子（在现有 `.cabinet-modal .collect-matrix-*` 上增量改）

- `thead th` 背景改为羊皮纸渐变；`td.collect-matrix-cat` 与斑马纹行同步改为渐变
- `.collect-matrix-tier-head` 增加内高光 `box-shadow`
- `.cabinet-slot`、`.collect-matrix-cell--empty` 增强展台/凹槽感

## 3. 删除或替代旧 `.cabinet-matrix-top` 专用布局（若新 toolbar 接管）

新结构使用 `.cabinet-matrix-toolbar`，可删除原 `.cabinet-matrix-top__filters` 的 `grid` 规则或改为仅兼容旧类名（若保留类名则不必删）。

## 4. `openCabinetModal` 内 `bodyHTML`

- 外层：`<div class="cabinet-layout ...">`
- 进度 + 分段：`.cabinet-chrome-bar` > `.cabinet-progress-row` > `.cabinet-progress-block`（含 `cabinet-progress-meter` + `__fill` style 宽度 `${progressPct}%`）+ `.cabinet-segment-wrap` 内两个 `cabinet-segment-btn`（`cabinet-segment-btn--active` / `--idle`）
- `suggestionHtml`：class `cabinet-suggestion-banner`（去掉内联 violet tailwind）
- `emptyHint`：仍在主面板内或外按视觉定
- `.cabinet-main-panel` 包裹 `#cabinet-view-tier` 与 `#cabinet-view-matrix`
- 图鉴：`cabinet-matrix-toolbar` → `__meta`（hint + 说明 + hobby chip 用 `cabinet-hobby-chip`）→ `__filters`（三个下拉）→ `__actions`（重置 + `__views` 内表格/紧凑）
- 底栏：`cabinet-footer-hint`

## 5. `applyCabinetModalSegment`

用 `classList.toggle('cabinet-segment-btn--active', ...)` / `--idle` 替代整串 `className = active : idle`。

## 6. 矩阵布局按钮点击处理

用 `cabinet-matrix-layout-btn--active` 替代 `ring-2 ring-[#ff8fab]/40` 与 `opacity-70`。

## 7. `openModal` / `closeModal`

- `variant === 'cabinet'`：`modalPanel.removeAttribute('data-cabinet-subview')` 或设为 `list`；`modalBody.className` 可改为 `flex flex-col min-h-0`（去掉 `space-y-3` 以免与 layout 冲突）
- `closeModal`：`modalPanel.removeAttribute('data-cabinet-subview')`

## 8. `openCabinetItemDetail`

- `modalPanel.setAttribute('data-cabinet-subview', 'detail')`
- `detailHTML`：`cabinet-item-detail cabinet-detail-grid` 根节点
  - 左列 `cabinet-detail-art-column` > `cabinet-detail-artframe` > `img`
  - 右列 `cabinet-detail-info-column`：标题、地点、hint、`.cabinet-detail-badges`、`catalogExtraHtml`、`unlockReasonHtml`、`cabinet-detail-primary-btn`、`cabinet-detail-back-btn`
- `catalogExtraHtml` 内 `max-w` 在宽屏可改为 `max-w-none`；`border-t` 可保留
- `onBack` 里 `openModal(..., 'cabinet')` 后确保清除 `data-cabinet-subview`（在 openModal 内统一处理即可）

## 9. `openCabinetMatrixCellPicker` 返回后

`openModal('旅行见闻柜', ...)` 同样走 `openModal` 的 cabinet 分支以清除 subview。

---

完整 CSS + HTML 字符串以 Agent 模式一次性写入 `index.html` 最稳妥。
