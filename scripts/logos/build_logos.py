"""Build the partner logos ARAW ships, from the raw files in ``logos/`` (git-ignored).

Run with any Python that has Pillow and numpy, from the app folder:
    python scripts/logos/build_logos.py
(TALA's virtualenv has both: ../../TALA/.venv/Scripts/python scripts/logos/build_logos.py)

The raw folder holds 1-2 MB source images next to the project's private paperwork (proposal, notarized MOA), none of
which belongs in a public repository. What ships is ``src/assets/logos/NN_<slug>.webp``: trimmed to the ink, cleaned for a
white panel, scaled to one height and saved as WebP, plus ``logos.json`` with each file's size (for width/height
attributes and optical sizing). Outputs are committed; re-run only when a logo changes.

The per-logo fixes are the ones TALA uses (TALA/tools/build_logos.py), because the raw files look wrong on white:

* **DOST** is a JPEG with a fake transparency checkerboard (and a faint stock-site watermark) baked into the pixels.
  Neutral light pixels become transparent and grey anti-aliasing becomes black at partial alpha, so edges stay smooth.
* **NICER RDC-NLPHA** draws its map in pale, semi-transparent grey with tiny text; small, it all but vanishes next to the
  solid marks. Its alpha is lifted and its neutral greys deepened (coloured accents untouched).
* **DOST-PCHRD** sits on a white card with a faint grey frame and shadow; it is cropped to its ink, inside the card,
  so the frame does not draw a hairline above the mark.
* **National University** has a *white* wordmark under the shield, made for dark backgrounds. The wordmark band (below
  the shield) is recoloured to NU navy; the shield itself is left untouched.

Order is fixed by the project: DOST, DOST-PCHRD, National University, NICER-DOST, NICER (RDC-NLPHA), AIKasalig.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "logos"
OUT = ROOT / "src" / "assets" / "logos"
HEIGHT = 128  # px; 2x the largest on-screen height (the About wall), so high-DPI screens stay crisp
NU_NAVY = (53, 64, 142)

# (output slug, raw filename)
LOGOS = [
    ("01_dost", "DOST.jpg"),
    ("02_dost_pchrd", "DOST-PCHRD.png"),
    ("03_national_university", "National University.png"),
    ("04_nicer_dost", "NICER-DOST.png"),
    ("05_nicer_rdc_nlpha", "NICER LOGO 1.png"),
    ("06_aikasalig", "AIKasalig 1.png"),
]


def _dost(im: Image.Image) -> Image.Image:
    """Drop the baked-in checkerboard: neutral light pixels -> transparent."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    sat = a.max(axis=2) - a.min(axis=2)
    v = a.mean(axis=2)
    neutral = sat < 18
    alpha = np.full(v.shape, 255.0)
    # Black ink anti-aliased over a ~231 grey/255 white square: alpha = 1 - v/231.
    alpha[neutral] = np.clip(1.0 - v[neutral] / 228.0, 0, 1) * 255
    rgb = a.copy()
    rgb[neutral] = 0  # neutral ink is black; partial alpha carries the edge
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")


def _nu(im: Image.Image) -> Image.Image:
    """Recolour the white wordmark below the shield to NU navy."""
    a = np.asarray(im.convert("RGBA")).copy()
    opaque = a[..., 3] > 0
    coloured = opaque & (a[..., :3].min(axis=2) < 200)
    shield_bottom = int(np.where(coloured.any(axis=1))[0].max())
    band = np.zeros(a.shape[0], dtype=bool)
    band[shield_bottom + 1:] = True
    white = opaque & (a[..., :3].min(axis=2) > 200) & band[:, None]
    a[white, 0], a[white, 1], a[white, 2] = NU_NAVY
    return Image.fromarray(a, "RGBA")


def _pchrd(im: Image.Image) -> Image.Image:
    """Crop to the ink, inside the white card, so its faint frame and shadow fall outside."""
    a = np.asarray(im.convert("RGBA"))
    rgb = a[..., :3].astype(np.int16)
    ink = (a[..., 3] > 8) & ((rgb.min(axis=2) < 200) | ((rgb.max(axis=2) - rgb.min(axis=2)) > 40))
    ys, xs = np.where(ink)
    pad = 8
    return im.convert("RGBA").crop((xs.min() - pad, ys.min() - pad, xs.max() + pad + 1, ys.max() + pad + 1))


def _rdc(im: Image.Image) -> Image.Image:
    """Make the pale, semi-transparent map and its tiny text hold up when small."""
    a = np.asarray(im.convert("RGBA")).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) < 20
    a[..., 3] = np.clip(alpha * 2.4, 0, 255)
    rgb[neutral] = rgb[neutral] * 0.62  # ~160 grey -> ~100: still grey, now legible
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def _trim(im: Image.Image) -> Image.Image:
    alpha = np.asarray(im.getchannel("A"))
    ys, xs = np.where(alpha > 8)
    pad = 4
    box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
           min(xs.max() + pad + 1, im.width), min(ys.max() + pad + 1, im.height))
    return im.crop(box)


FIXES = {"01_dost": _dost, "02_dost_pchrd": _pchrd, "03_national_university": _nu, "05_nicer_rdc_nlpha": _rdc}


def build() -> dict[str, dict[str, int]]:
    OUT.mkdir(parents=True, exist_ok=True)
    sizes: dict[str, dict[str, int]] = {}
    for slug, raw in LOGOS:
        im = Image.open(RAW / raw)
        if slug in FIXES:
            im = FIXES[slug](im)
        im = _trim(im.convert("RGBA"))
        w = round(im.width * HEIGHT / im.height)
        path = OUT / f"{slug}.webp"
        im.resize((w, HEIGHT), Image.LANCZOS).save(path, "WEBP", quality=88, method=6)
        sizes[slug] = {"w": w, "h": HEIGHT, "bytes": path.stat().st_size}
    (OUT / "logos.json").write_text(json.dumps(sizes, indent=1) + "\n", encoding="utf-8")
    return sizes


if __name__ == "__main__":
    for slug, s in build().items():
        print(f"{slug:26s} {s['w']:4d}x{s['h']}  {s['bytes'] / 1024:5.1f} KB")
