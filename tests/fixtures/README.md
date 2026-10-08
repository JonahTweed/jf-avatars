# Catalogue test fixture

catalogue.json.gz is a gzip-compressed JSON snapshot of the public kalibrado/js-avatars-images images_metadata.json catalogue, retrieved 2026-10-08. It contains all 2,699 entries and keeps searchable name, folder and source URL fields; numeric image sizes and dimensions are omitted. No image bytes are included.

Tests decompress this snapshot in memory. Synthetic fixtures separately cover custom series, franchises, nested character metadata and tags.
