# Catalogue enrichment

Search now enriches poorly labelled images before building its in-memory index. No image recognition runs in Jellyfin, no additional metadata request is needed, and searching does not preload images. All original image objects and source URLs are retained.

The audit covers the 2,699-image upstream catalogue at the commit recorded in `src/data/avatar-enrichment.json`. There are 2,257 annotations: 2,014 images were visually reviewed and another 243 received franchise information from descriptive filenames. The remaining 442 retain their existing source metadata. All 210 Disney images have annotations. Star Wars, Darth Vader, Grogu/Baby Yoda, Jon Snow and Spyro now return actual catalogue images.

## Accuracy and evidence

Visual identities are **inferences from artwork**, not publisher-confirmed identifications. Recognisable characters were named; uncertain images received only a franchise when identifiable or literal visual descriptions such as “black cat” or “astronaut”. An annotation is not a guarantee of every character's identity. Fan artwork, obscure characters and generic illustrations may remain searchable by visual description rather than their intended name. Please correct a mistaken label in the data file rather than creating a runtime workaround.

Entries with `evidence: "filename"` recover an explicit franchise from an existing source identifier. Other entries come from visual review. The catalogue commit and review method are recorded once at the top of the data file. The original catalogue has no historical descriptive rename map for the Disney `scale(...)` images.

## Add or correct an annotation

Edit `src/data/avatar-enrichment.json`. Each key is the complete path beneath the upstream `images/` directory, including category and extension:

```json
"Disney +/scale(20).png": {
  "character": "Darth Vader",
  "franchise": "Star Wars"
}
```

Use `character`, `franchise` and/or `tags`. `tags` is a plain string of descriptive search terms. Keep unknown identities out of the character field. Add alternate franchise names and abbreviations in `src/data/search-aliases.json`. Search also derives acronyms from franchise fields automatically.

Matching is restricted to the upstream repository on its raw GitHub/jsDelivr sources. A custom URL that happens to contain `scale(20).png` does not inherit Darth Vader. Existing explicit character and franchise metadata takes precedence. Annotations do not mutate source metadata or localStorage. This also means users with yesterday's cached catalogue get enrichment immediately when they install the new bundle.

## Refresh the audit

Run `node scripts/audit-enrichment.cjs` against the checked-in fixture, or pass a path to fresh upstream `images_metadata.json`. It reports coverage by category, stale annotation keys and remaining opaque source identifiers. Stale keys cause a nonzero exit code; review changed images before retaining their old labels.

`python scripts/review-avatars.py /path/images_metadata.json /path/images /path/review-output` generates numbered contact sheets and a source-key manifest for images needing visual review. It needs Pillow, also used by the upstream indexer. Numbers are only for reviewing the sheets: persist annotations by source path, never by array index.

## Validation and rollback

Run `npm run build`, `npm test`, then `node scripts/audit-enrichment.cjs`. Tests cover source isolation, metadata precedence, index immutability, real catalogue queries and the production bundle's cached metadata/lazy loading behaviour.

The earlier loader remains pinned to `a0719327e5527a1a2da14b8f30ce6262f687627a`, so keep it disabled as a rollback entry. Install the new pinned loader in the same enabled selector entry. Continue keeping the original selector and separate Search Enhancer disabled.
