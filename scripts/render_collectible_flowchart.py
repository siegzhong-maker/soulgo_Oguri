#!/usr/bin/env python3
"""Render SoulGo 收集物与记忆闭环流程图（合作门闸上移、静态优先、动静分支；与 docs/soulgo-collectibles-memory-loop.mmd 一致）。"""
import os

os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl-cache")

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib import rcParams
from matplotlib.patches import FancyBboxPatch, Polygon, FancyArrowPatch

rcParams["font.sans-serif"] = [
    "Arial Unicode MS",
    "PingFang SC",
    "Hiragino Sans GB",
    "Heiti TC",
    "STHeiti",
    "Microsoft YaHei",
    "SimHei",
    "DejaVu Sans",
]
rcParams["axes.unicode_minus"] = False

# 可读性：宽画布 + 高 DPI + 双列蛇形压缩中段高度
FIG_W = 16.5
FIG_H = 34.0
DPI = 240
CX_L = 5.05
CX_R = 11.45
CX = (CX_L + CX_R) / 2
BW = 5.35
BH = 1.22
STEP = 1.38
EDGE = 1.45
ARROW_MS = 17
FS_TITLE = 19
FS_BODY = 13.0
FS_BRANCH = 12.0
FS_NOTE = 11.0


def main():
    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H), dpi=DPI)
    ax.set_xlim(0, FIG_W)
    ax.set_ylim(0, FIG_H)
    ax.axis("off")

    purple = "#E6DCF5"
    edge = "#141414"

    def rounded_box(cx, cy, w, h, text, fs=FS_BODY):
        x, y = cx - w / 2, cy - h / 2
        ax.add_patch(
            FancyBboxPatch(
                (x, y),
                w,
                h,
                boxstyle="round,pad=0.045,rounding_size=0.24",
                facecolor=purple,
                edgecolor=edge,
                linewidth=EDGE,
            )
        )
        ax.text(cx, cy, text, ha="center", va="center", fontsize=fs, linespacing=1.08)

    def arrow(x0, y0, x1, y1, rad=0):
        kw = dict(
            arrowstyle="-|>",
            color=edge,
            linewidth=EDGE,
            mutation_scale=ARROW_MS,
        )
        if rad:
            kw["connectionstyle"] = f"arc3,rad={rad}"
        ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), **kw))

    def diamond(cx, cy, s, text, fs=FS_BRANCH):
        pts = [(cx, cy + s), (cx + s * 1.22, cy), (cx, cy - s), (cx - s * 1.22, cy)]
        ax.add_patch(
            Polygon(pts, closed=True, facecolor="#EDE4FA", edgecolor=edge, linewidth=EDGE)
        )
        ax.text(cx, cy, text, ha="center", va="center", fontsize=fs, linespacing=1.02)

    y = FIG_H - 1.55
    ax.text(
        CX,
        y,
        "SoulGo 收集物与记忆闭环（流程约定）",
        ha="center",
        va="top",
        fontsize=FS_TITLE,
        fontweight="bold",
    )
    y -= 1.65

    # 入口
    y -= 0.95
    rounded_box(CX_L - 0.35, y, 3.15, BH, "用户打卡")
    rounded_box(CX_R + 0.35, y, 3.15, BH, "核心档案")
    y_in = y
    y -= STEP + 0.1
    rounded_box(CX, y, BW + 1.85, BH, "日记生成服务")
    arrow(CX_L - 0.35, y_in - BH / 2, CX - 1.1, y + BH / 2, rad=0.08)
    arrow(CX_R + 0.35, y_in - BH / 2, CX + 1.1, y + BH / 2, rad=-0.08)

    chain = [
        "生成日记与计划",
        "记忆摘要服务",
        "情景记忆存储",
        "向量化存储服务",
        "向量记忆库",
        "记忆检索",
        "领取并解锁",
        "合作限定判断（上海）",
        "收集物意图构建",
    ]

    y_prev, cx_prev = y, CX
    for i, t in enumerate(chain):
        y -= STEP
        cx = CX_L if i % 2 == 0 else CX_R
        rounded_box(cx, y, BW, BH, t)
        ax0, ay0 = cx_prev, y_prev - BH / 2
        ax1, ay1 = cx, y + BH / 2
        rad = 0.22 if cx != cx_prev else 0
        arrow(ax0, ay0, ax1, ay1, rad=rad)
        y_prev, cx_prev = y, cx

    # 回到中列：静态池
    y -= STEP
    rounded_box(CX, y, BW + 1.85, BH, "静态池挑选")
    arrow(cx_prev, y_prev - BH / 2, CX, y + BH / 2, rad=0.2 if cx_prev != CX else 0)

    y_prev = y
    y -= STEP * 0.92
    ds = 0.62
    diamond(CX, y, ds, "静态池\n满足？", fs=FS_BRANCH)
    arrow(CX, y_prev - BH / 2, CX, y + ds)

    y_dyn = y - STEP * 1.08
    y_main = y_dyn - STEP * 1.12
    rounded_box(CX_R + 0.55, y_dyn, 4.95, BH, "动态生成尝试")
    rounded_box(CX, y_main, BW + 2.35, BH, "日记主收集物入柜")

    arrow(CX - ds * 1.08, y - 0.48, CX - BW / 2 - 0.2, y_main + BH / 2 + 0.05, rad=0.32)
    ax.text(CX_L - 0.85, (y + y_main) / 2 + 0.42, "是", fontsize=FS_BRANCH + 1.2, fontweight="bold")

    arrow(CX + ds * 1.08, y - 0.1, CX_R + 0.55, y_dyn + BH / 2)
    ax.text(CX + 1.85, y - 0.78, "否", fontsize=FS_BRANCH + 1.2, fontweight="bold")

    arrow(CX_R + 0.55, y_dyn - BH / 2, CX + 1.45, y_main + BH / 2)

    # 合作追加入柜：仅在主入柜后按上游 CJ 缓存资格执行（菱形为执行分叉，非再次完整裁决）
    y_prev_pe = y_main
    y_pe = y_main - STEP * 0.95
    ds_pe = 0.52
    diamond(CX, y_pe, ds_pe, "须合作\n追加入柜？", fs=FS_BRANCH)
    arrow(CX, y_prev_pe - BH / 2, CX, y_pe + ds_pe)

    y_bo = y_pe - STEP * 1.22
    rounded_box(CX_L - 0.15, y_bo, 4.55, BH, "合作追加收集物入柜")

    arrow(
        CX - ds_pe * 1.06,
        y_pe - 0.52,
        CX_L - 0.15 + 1.85,
        y_bo + BH / 2 + 0.06,
        rad=0.18,
    )
    ax.text(CX_L + 1.72, y_pe + 0.72, "是", fontsize=FS_BRANCH + 1.2, fontweight="bold")

    y_prev = y_bo
    y = y_bo - STEP * 1.02
    rounded_box(CX, y, BW + 2.35, BH, "更新日记奖励（main/bonus）")
    arrow(CX_L - 0.15, y_bo - BH / 2, CX - 0.92, y + BH / 2, rad=-0.2)
    arrow(CX + ds_pe * 1.12, y_pe - 0.15, CX + 0.22, y + BH / 2 + 0.02, rad=-0.5)
    ax.text(CX_R + 0.95, y_pe + 2.62, "否", fontsize=FS_BRANCH + 1.2, fontweight="bold")

    y_prev = y
    y -= STEP
    rounded_box(CX, y, BW + 2.1, BH, "橱柜入库与奖励弹窗")
    arrow(CX, y_prev - BH / 2, CX, y + BH / 2)

    note = (
        "注：领取并解锁指旅行日记内「获取收集物」。合作限定判断仅在上游执行一次；主入柜后菱形仅决定是否执行合作追加。\n"
        "收集物：LU→合作门闸→意图→静态池；「静态池满足？」为否则动态生成后主入柜，再按需追加合作款。"
    )
    ax.text(
        CX,
        y - BH / 2 - STEP * 1.58,
        note,
        ha="center",
        va="top",
        fontsize=FS_NOTE,
        color="#222",
        linespacing=1.52,
    )

    repo_root = os.path.dirname(os.path.dirname(__file__))
    paths = [
        os.path.join(repo_root, "docs", "soulgo-collectibles-memory-loop.png"),
        os.path.join(repo_root, "未命名图表-2026-05-08T01-28-33.png"),
        os.path.join(repo_root, "20260422-120626-corrected.png"),
    ]
    for outp in paths:
        fig.savefig(outp, bbox_inches="tight", pad_inches=0.6, facecolor="white", dpi=DPI)
        print(outp)


if __name__ == "__main__":
    main()
