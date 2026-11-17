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

    ink = (28, 22, 18, 255)
    copper = (196, 83, 42, 255)
    paper = (255, 253, 248, 255)
    draw.rounded_rectangle((0, 0, 511, 511), radius=116, fill=ink)
    draw.rounded_rectangle((28, 28, 484, 484), radius=96, outline=(232, 148, 106, 110), width=10)
    eye = [(88, 256), (140, 182), (210, 148), (256, 142), (302, 148), (372, 182), (424, 256),
           (372, 336), (302, 370), (256, 376), (210, 370), (140, 336)]
    draw.polygon(eye, fill=paper)
    draw.ellipse((188, 194, 324, 330), fill=copper)
    draw.ellipse((226, 232, 286, 292), fill=ink)
    draw.ellipse((246, 240, 268, 262), fill=(255, 253, 248, 230))
    # A small reveal mark, the same rectangle the panel uses for hidden characters.
    draw.rounded_rectangle((236, 392, 276, 408), radius=4, fill=copper)

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
