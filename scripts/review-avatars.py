"""Generate contact sheets for opaque or unannotated avatar sources; no recognition API."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse
from PIL import Image, ImageDraw

if len(sys.argv) != 4:
    raise SystemExit("Usage: python scripts/review-avatars.py metadata.json images-directory output-directory")
metadata_path, images_directory, output_directory = map(Path, sys.argv[1:])
annotations = json.loads((Path(__file__).parent.parent / "src/data/avatar-enrichment.json").read_text())["entries"]
output_directory.mkdir(parents=True, exist_ok=True)
items = []
for image in json.loads(metadata_path.read_text()):
    source = unquote(urlparse(image.get("url", image.get("src", ""))).path)
    if "/images/" not in source:
        continue
    key = source.split("/images/", 1)[1]
    labels = annotations.get(key, {})
    opaque = re.search(r"^(scale\(\d+\)|\d+|(?:steam-)?[a-f\d]{30,})$|^(Netflix|Pop Culture|Playstation|Steam|Xbox)", image.get("name", ""), re.I)
    if not labels.get("character") and (opaque or not labels):
        items.append({"key": key, "name": image.get("name", ""), "annotations": labels})
(output_directory / "review-manifest.json").write_text(json.dumps(items, ensure_ascii=False, indent=2))
for page in range((len(items) + 63) // 64):
    canvas = Image.new("RGB", (1200, 1280), "#eeeeee")
    draw = ImageDraw.Draw(canvas)
    for cell, item in enumerate(items[page * 64:(page + 1) * 64]):
        x, y = (cell % 8) * 150, (cell // 8) * 160
        try:
            with Image.open(images_directory / item["key"]) as original:
                thumb = original.convert("RGBA")
                thumb.thumbnail((140, 130))
                canvas.paste(thumb, (x + (150 - thumb.width) // 2, y), thumb)
        except (OSError, ValueError):
            draw.text((x + 3, y + 40), "Missing/unreadable", fill="black")
        draw.text((x + 3, y + 132), str(page * 64 + cell), fill="black")
        draw.text((x + 3, y + 145), item["name"][:23], fill="black")
    canvas.save(output_directory / f"sheet-{page:03d}.jpg")
print(f"Prepared {len(items)} review entries in {output_directory}")
