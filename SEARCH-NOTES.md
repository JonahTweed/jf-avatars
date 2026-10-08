# Built-in avatar search

Based on kalibrado/jf-avatars commit 2b09e8449235bd8ee0cfa61da808c603bf22c443 (2.4.0).
Original MIT licence and attribution are retained. No image assets are copied or changed.

## Behaviour

- Every metadata entry is indexed once per source/metadata array in memory.
- Decode URL filenames; split camel case and acronyms; fold accents, apostrophes, punctuation and spacing.
- Index character/name, folder/category, filename/source URL path, series/franchise/show/title, and nested string metadata/tags.
- Prefer character matches over series matches, then category, then general metadata. Stable source order breaks ties.
- Match complete terms, prefixes and partial words. If no literal results exist, use bounded edit distance (one edit for 4–6 letter query terms, two for longer terms). Short terms are never fuzzy matched.
- Explicit series titles also contribute automatically derived acronyms.
- Known source codes and alternate titles are expanded via src/data/search-aliases.json. Edit that file then rebuild; no event-handler changes are needed.
- Search waits 180 ms after typing; dropdown changes are immediate. IME composition is respected.
- Start with All categories; an explicitly chosen category scopes search.
- Metadata is fetched/parsed once per source in a session, retaining upstream one-day localStorage caching. Sources remain configurable through existing CSS properties.
- Only changed results render. Identical URL result lists reuse the gallery nodes.
- Render 120 avatars at a time; Load more makes every result accessible. Random selection covers the full filtered result list, including undisplayed pages.
- IntersectionObserver is rooted in the scrollable grid. Images load near the viewport, six at a time. Removed generations discard queued work and ignore stale completions. No eager image preloading.
- Modal disposal clears debounce timers, lazy observers, queued loads and resize listeners. Navigation observation ignores internal gallery changes.
- Selection, upload, random choice, languages, custom sources/styles and generated-avatar fallback remain available. The fallback is explicitly labelled to distinguish generated images from matching characters.

## Metadata limitation

The index now applies source-specific catalogue enrichment from `src/data/avatar-enrichment.json`. See [ENRICHMENT-NOTES.md](ENRICHMENT-NOTES.md) for coverage, visual inference limitations and correction instructions. Unknown characters are searchable by descriptive tags rather than guessed identities.

## Build and verify

Requires Node 22.12+ (jsdom test dependency).

    npm ci
    npm run build
    npm test

The build emits dist/main.js and copies the identical production artifact to main.js. Runtime dependencies remain zero; jsdom is only used by tests. Tests exercise the real 2,699-entry metadata snapshot (retrieved 2026-10-08) and the production bundle in a simulated Jellyfin page, including selected-user uploads. They do not replace validation on your actual Jellyfin installation.

## Install immediately without a hosted bundle

1. Keep your existing JF-AVATARS entry as a disabled rollback backup.
2. Disable Avatar Search Enhancer.
3. Create a new JavaScript Injector entry named JF-AVATARS Built-in Search.
4. Paste the contents of injector-loader.js into its Script field and enable it. Tick Requires authentication.
5. Save, run JavaScript Injector Startup in Scheduled Tasks, then fully refresh Jellyfin.
6. Open avatar selection and try Billy Butcher, The Boys, LOTR, ROP, Fallout, The Expanse, and Good Omens. Also try Star Wars, Darth Vader, Grogu, Jon Snow and Spyro; those now have enriched catalogue matches.

Keep exactly one avatar-selector entry enabled. Do not retain the separate enhancer alongside this version.

## Hosted loader (after publishing)

Once a fork is created and main.js is published, use a commit-pinned jsDelivr URL, with a second commit-pinned jsDelivr host as fallback. Verify both URLs serve the built main.js bytes before enabling the new entry. Avoid @latest for the modified loader so rollback is deterministic. The fork is JonahTweed/jf-avatars. Use the verified commit-pinned loader in injector-loader.js once published.

## Rollback

Disable the Built-in Search entry, re-enable your original JF-AVATARS entry, run JavaScript Injector Startup, then fully refresh. Leave Avatar Search Enhancer disabled. Your saved user avatars are not altered by switching scripts. rollback-main.js is an exact copy of the upstream root main.js at the base commit above.
