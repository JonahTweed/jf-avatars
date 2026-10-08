import enrichment from "../data/avatar-enrichment.json";

// Match complete upstream source paths, never array positions or bare filenames.
// Custom catalogues with similarly named images must not inherit these labels.
export const sourceKey = (source) => {
  if (typeof source !== "string") return null;
  try {
    const url = new URL(source);
    const path = decodeURIComponent(url.pathname);
    if (url.hostname === "raw.githubusercontent.com") {
      const match = path.match(/^\/kalibrado\/js-avatars-images\/(?:refs\/heads\/[^/]+|[^/]+)\/images\/(.+)$/);
      return match ? match[1] : null;
    }
    if (["cdn.jsdelivr.net", "fastly.jsdelivr.net"].includes(url.hostname)) {
      const match = path.match(/^\/gh\/kalibrado\/js-avatars-images(?:@[^/]+)?\/images\/(.+)$/);
      return match ? match[1] : null;
    }
  } catch (_) { /* Local and malformed custom sources remain untouched. */ }
  return null;
};

export const enrichAvatar = (image) => {
  const key = sourceKey(image.url || image.src || image.imageUrl);
  const labels = key && enrichment.entries[key];
  if (!labels) return image;
  // Publisher/custom fields take precedence over our visual annotations.
  return {
    ...image,
    character: image.character || image.characterName || image.displayName || labels.character,
    franchise: image.franchise || image.series || labels.franchise,
    searchTags: [image.searchTags, labels.tags].filter(Boolean),
  };
};
