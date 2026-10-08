import aliases from "../data/search-aliases.json";
import { enrichAvatar } from "./enrichment.js";

// Decode filenames, split camel case/acronyms, fold accents and punctuation.
export const normalize = (value) => {
  let text = String(value ?? "");
  try { text = decodeURIComponent(text); } catch (_) { /* malformed custom URL */ }
  return text.replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/['’]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
};
const compact = (text) => text.replace(/\s/g, "");
const words = (text) => text.split(" ").filter(Boolean);
const field = (text) => ({ text, compact: compact(text), words: words(text) });
const containsPhrase = (text, phrase) => (` ${text} `).includes(` ${phrase} `);
const groups = (data) => data.map(group => group.map(normalize));
const franchiseGroups = groups(aliases.groups);
const characterGroups = groups(aliases.characterGroups);
const expand = (text, data) => data.filter(group => group.some(term => containsPhrase(text, term))).flat();

const collectText = (value, key = "") => {
  if (typeof value === "string") {
    if (/^(url|imageurl|link|src)$/i.test(key)) {
      // Index the source path, not the common CDN host/query parameters.
      try { return [new URL(value).pathname]; } catch (_) { return [value.split("?")[0]]; }
    }
    return [value];
  }
  if (Array.isArray(value)) return value.flatMap(item => collectText(item, key));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k,v]) => collectText(v,k));
  return [];
};
const nameOf = (image) => {
  const explicit = image.character || image.characterName || image.displayName;
  if (typeof explicit === "string") return explicit;
  const source = image.name || image.filename || image.fileName || image.url || image.src || "";
  const prime = String(source).match(/PVProfileImageCircle_\d+x\d+_([^_]+)/i);
  return prime ? prime[1] : source;
};

// One index per metadata array; caller retains it for the browser session.
export const buildSearchIndex = (images) => images.map((image, order) => {
  const enriched = enrichAvatar(image);
  const name = normalize(nameOf(enriched));
  const metadata = normalize(collectText(enriched).join(" "));
  const category = normalize([image.folder, image.category].filter(Boolean).join(" "));
  const series = collectText({ franchise:enriched.franchise, series:image.series, show:image.show, title:image.title }).map(normalize);
  const acronyms = series.flatMap(text => {
    const parts = words(text);
    return parts.length > 1 ? [parts.map(word => word[0]).join(""), parts.filter(word => !["the","of","a","and"].includes(word)).map(word => word[0]).join("")] : [];
  }).filter(term => term.length >= 2);
  return { image, order, category, fields: [
    field([name, ...expand(name, characterGroups)].join(" ")),
    field([...series, ...acronyms,
      ...expand(metadata, franchiseGroups)].join(" ")),
    field(category), field(metadata)
  ] };
});

// Bounded edit distance; long terms allow two edits, short terms one.
export const nearWord = (a, b) => {
  const limit = a.length >= 7 ? 2 : 1;
  if (a.length < 4 || Math.abs(a.length-b.length) > limit) return false;
  let previous = Array.from({length:b.length+1}, (_,i) => i);
  for (let i=1; i<=a.length; i++) {
    const row = [i];
    for (let j=1; j<=b.length; j++) row[j] = Math.min(row[j-1]+1, previous[j]+1, previous[j-1]+(a[i-1]===b[j-1]?0:1));
    if (Math.min(...row) > limit) return false;
    previous = row;
  }
  return previous[b.length] <= limit;
};
const match = (term, f, fuzzy) => {
  if (f.words.includes(term)) return 4;
  if (f.words.some(word => word.startsWith(term))) return 3;
  if (f.text.includes(term)) return 2;
  if (fuzzy && f.words.some(word => nearWord(term,word))) return 1;
  return 0;
};
export const searchIndex = (index, query = "", category = "") => {
  let normalized = normalize(query);
  // Resolve known aliases as complete phrases so ROP does not match rope.
  for (const group of franchiseGroups) {
    for (const alias of [...group].sort((a,b) => b.length-a.length)) {
      if (containsPhrase(normalized, alias)) {
        normalized = (` ${normalized} `).split(` ${alias} `).join(` ${group[0]} `).trim();
        break;
      }
    }
  }
  const terms = words(normalized);
  const selected = normalize(category);
  const candidates = selected ? index.filter(entry => entry.category.includes(selected)) : index;
  if (!normalized) return candidates.map(entry => entry.image);
  const run = (fuzzy) => candidates.flatMap(entry => {
    let score=0;
    for (const term of terms) {
      const best = Math.max(...entry.fields.map((f,i) => match(term,f,fuzzy)*[1000,100,50,10][i]));
      if (!best) {
        // BillyButcher and billybutcher work as well as Billy Butcher.
        if (entry.fields[0].compact.includes(compact(normalized))) { score += 1000; break; }
        return [];
      }
      score += best;
    }
    if (entry.fields[0].text === normalized) score += 2000;
    else if (entry.fields[0].compact.includes(compact(normalized))) score += 1000;
    return [{...entry, score}];
  });
  // Avoid fuzzy noise when literal matches exist. Fuzzy work is fallback only.
  const exact = run(false);
  return (exact.length ? exact : run(true)).sort((a,b) => b.score-a.score || a.order-b.order).map(entry => entry.image);
};

export const debounce = (callback, delay = 180) => {
  let timer;
  const handler = (...args) => { clearTimeout(timer); timer=setTimeout(() => callback(...args),delay); };
  handler.cancel = () => clearTimeout(timer);
  return handler;
};
