#!/usr/bin/env python3
"""
Export rabbit action GIFs from tuzi.psd layers.

Usage:
  python3 scripts/export-rabbit-gifs.py
"""

from pathlib import Path
from typing import Dict, List

from PIL import Image
from psd_tools import PSDImage


ROOT = Path(__file__).resolve().parents[1]
PSD_PATH = ROOT / "比卡丘动画导出" / "tuzi.psd"
OUT_DIR = ROOT / "兔子动画导出"

# NOTE:
# Layer indices are discovered from current PSD and grouped into action-like loops.
# If PSD structure changes later, update these lists.
ACTION_LAYERS: Dict[str, List[int]] = {
    "呼吸演示.gif": [6, 5, 7, 5],
    "等待演示.gif": [2, 13, 2],
    "观察演示.gif": [2, 8, 2],
    "互动演示.gif": [9, 8, 9],
    "休息演示.gif": [4, 4],  # static hold, repeated to make valid loop
    "吃演示.gif": [8, 9, 8],
    "摸演示.gif": [6, 7, 6],
}

# Per-action frame duration in milliseconds.
ACTION_DURATION_MS: Dict[str, int] = {
    "呼吸演示.gif": 140,
    "等待演示.gif": 180,
    "观察演示.gif": 140,
    "互动演示.gif": 120,
    "休息演示.gif": 240,
    "吃演示.gif": 120,
    "摸演示.gif": 120,
}


def layer_to_rgba(psd: PSDImage, layer_idx: int) -> Image.Image:
    layer = psd[layer_idx]
    im = layer.composite().convert("RGBA")
    return im


def center_pad(frames: List[Image.Image], canvas_size=(720, 1100)) -> List[Image.Image]:
    cw, ch = canvas_size
    padded: List[Image.Image] = []
    for frame in frames:
        fw, fh = frame.size
        # Keep each frame within common canvas while preserving aspect.
        if fw > cw or fh > ch:
            ratio = min(cw / fw, ch / fh)
            frame = frame.resize((max(1, int(fw * ratio)), max(1, int(fh * ratio))), Image.LANCZOS)
            fw, fh = frame.size
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        x = (cw - fw) // 2
        y = (ch - fh) // 2
        canvas.alpha_composite(frame, (x, y))
        padded.append(canvas)
    return padded


def save_gif(frames: List[Image.Image], out_path: Path, duration_ms: int) -> None:
    if not frames:
        raise ValueError(f"No frames for {out_path.name}")
    # Save with transparency preserved.
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        disposal=2,
        optimize=False,
    )


def main() -> None:
    if not PSD_PATH.exists():
        raise FileNotFoundError(f"PSD not found: {PSD_PATH}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    psd = PSDImage.open(PSD_PATH)

    for filename, layer_indices in ACTION_LAYERS.items():
        raw_frames = [layer_to_rgba(psd, idx) for idx in layer_indices]
        frames = center_pad(raw_frames)
        out_path = OUT_DIR / filename
        duration_ms = ACTION_DURATION_MS.get(filename, 140)
        save_gif(frames, out_path, duration_ms)
        print(f"Exported {out_path}")

    print("Rabbit GIF export finished.")


if __name__ == "__main__":
    main()
