from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "extension" / "icons"
SIZES = (16, 48, 128)
ARTWORK_SIZE = 512
SAFE_AREA_RATIO = 0.75


def make_artwork() -> Image.Image:
    image = Image.new("RGBA", (ARTWORK_SIZE, ARTWORK_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")

    draw.rounded_rectangle((18, 18, 494, 494), radius=112, fill=(21, 73, 72, 255))
    draw.ellipse((304, -48, 584, 232), fill=(63, 143, 132, 78))
    draw.ellipse((-82, 334, 178, 594), fill=(241, 127, 82, 44))
    draw.rounded_rectangle((18, 18, 494, 494), radius=112, outline=(255, 255, 255, 58), width=6)

    eye = [(94, 258), (139, 195), (207, 159), (256, 153), (305, 159), (373, 195), (418, 258),
           (373, 321), (305, 357), (256, 363), (207, 357), (139, 321)]
    draw.polygon(eye, fill=(249, 247, 239, 245))
    draw.ellipse((194, 196, 318, 320), fill=(241, 127, 82, 255))
    draw.ellipse((224, 226, 288, 290), fill=(20, 61, 61, 255))
    draw.ellipse((243, 238, 264, 259), fill=(255, 255, 255, 225))

    for x, y, radius in ((116, 130, 12), (156, 105, 8), (198, 91, 6), (396, 386, 12), (358, 411, 8)):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(241, 127, 82, 225))

    return image


def icon_for_size(artwork: Image.Image, size: int) -> Image.Image:
    content_size = round(size * SAFE_AREA_RATIO)
    offset = (size - content_size) // 2
    content = artwork.resize((content_size, content_size), Image.Resampling.LANCZOS)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.alpha_composite(content, (offset, offset))
    expected = (offset, offset, offset + content_size, offset + content_size)
    if icon.getbbox() != expected:
        raise RuntimeError(f"icon{size}.png exceeds its {content_size}x{content_size} safe area")
    return icon


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    artwork = make_artwork()
    for size in SIZES:
        icon = icon_for_size(artwork, size)
        icon.save(OUTPUT / f"icon{size}.png", format="PNG", optimize=True)
    print("generated Invisibles icons: " + ", ".join(str(size) for size in SIZES))


if __name__ == "__main__":
    main()
