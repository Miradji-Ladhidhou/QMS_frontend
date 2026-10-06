"""Generate the brand pack from the supplied 768 x 768 logo (requires Pillow)."""

import argparse
import math
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image, ImageDraw


PUBLIC = Path(__file__).resolve().parents[1] / "public"
BRAND = PUBLIC / "brand"


def square_icon(symbol, size):
    canvas = Image.new("RGB", (size, size), "white")
    fitted = symbol.copy()
    fitted.thumbnail((round(size * 0.9), round(size * 0.9)), Image.Resampling.LANCZOS)
    canvas.paste(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
    return canvas


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    with Image.open(args.source) as source:
        if source.size != (768, 768):
            raise ValueError("Expected the supplied 768 x 768 source logo.")
        original = Image.new("RGB", source.size, "white")
        original.paste(source.convert("RGB"))

    BRAND.mkdir(parents=True, exist_ok=True)
    original.save(BRAND / "logo-complet.png", optimize=True)
    symbol = original.crop((169, 100, 590, 447))
    wordmark = original.crop((116, 454, 649, 583))
    square_icon(symbol, 512).save(BRAND / "logo-appli-512.png", optimize=True)
    square_icon(symbol, 192).save(BRAND / "logo-appli-192.png", optimize=True)
    square_icon(symbol, 180).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    horizontal = Image.new("RGB", (1200, 360), "white")
    symbol.thumbnail((340, 300), Image.Resampling.LANCZOS)
    horizontal.paste(symbol, (24, (360 - symbol.height) // 2))
    wordmark = wordmark.resize((780, 189), Image.Resampling.LANCZOS)
    horizontal.paste(wordmark, (396, (360 - wordmark.height) // 2))
    horizontal.save(BRAND / "logo-horizontal.png", optimize=True)
    horizontal.resize((600, 180), Image.Resampling.LANCZOS).save(
        BRAND / "logo-signature.png", optimize=True
    )

    points = []
    for tooth in range(12):
        for offset, radius in [(0, 23), (0.18, 27), (0.68, 27), (0.86, 23)]:
            angle = (tooth + offset) * math.tau / 12
            points.append((28 + radius * math.cos(angle), 28 + radius * math.sin(angle)))
    polygon = " ".join(f"{x:.2f},{y:.2f}" for x, y in points)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<rect width="64" height="64" rx="12" fill="#fff"/>'
        f'<polygon points="{polygon}" fill="#1F3864"/>'
        '<circle cx="28" cy="28" r="18" fill="#fff" stroke="#3C9296" stroke-width="4"/>'
        '<path d="M19 28 L26 35 L39 21" fill="none" stroke="#3C9296" '
        'stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
        '<path d="M36 36 L55 53 L48 57 L31 41 Z" fill="#1F3864"/>'
        '</svg>\n'
    )
    (PUBLIC / "favicon.svg").write_text(svg, encoding="utf-8")
    scale = 8
    favicon = Image.new("RGB", (64 * scale, 64 * scale), "white")
    draw = ImageDraw.Draw(favicon)
    draw.polygon([(round(x * scale), round(y * scale)) for x, y in points], fill="#1F3864")
    draw.ellipse((8 * scale, 8 * scale, 48 * scale, 48 * scale), fill="#3C9296")
    draw.ellipse((12 * scale, 12 * scale, 44 * scale, 44 * scale), fill="white")
    check = [(19 * scale, 28 * scale), (26 * scale, 35 * scale), (39 * scale, 21 * scale)]
    draw.line(check, fill="#3C9296", width=5 * scale, joint="curve")
    for x, y in check:
        r = 2.5 * scale
        draw.ellipse((x - r, y - r, x + r, y + r), fill="#3C9296")
    draw.polygon([(x * scale, y * scale) for x, y in [(36, 36), (55, 53), (48, 57), (31, 41)]], fill="#1F3864")
    for size in (16, 32, 48):
        favicon.resize((size, size), Image.Resampling.LANCZOS).save(
            PUBLIC / f"favicon-{size}.png", optimize=True
        )
    favicon.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    with ZipFile(BRAND / "qms-saas-brand-pack.zip", "w", ZIP_DEFLATED) as archive:
        for file in sorted(BRAND.iterdir()):
            if file.suffix != ".zip":
                archive.write(file, file.name)
        for name in ["favicon.svg", "favicon.ico", "favicon-16.png", "favicon-32.png",
                     "favicon-48.png", "apple-touch-icon.png"]:
            archive.write(PUBLIC / name, name)
    print(f"Brand pack generated in {BRAND}")


if __name__ == "__main__":
    main()
