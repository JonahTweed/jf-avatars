import { addImagesToGrid, loadSrcImages } from "./functions.js";
import { props } from "./props.js";
import { adjustResponsive } from "./style.js";
import { buildSearchIndex, searchIndex, debounce } from "./search.js";
import { loadImageWithPriority, resetImageLoads } from "./preload.js";

let indexedImages, index;
let cleanup = () => {};
export const disposeGallery = () => cleanup();
export const observeGalleryImages = (grid) => {
  // Only rendering uses elements. Search never reads image DOM attributes.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      loadImageWithPriority(entry.target, entry.target.dataset.src);
      observer.unobserve(entry.target);
    }
  }, { root: grid, rootMargin: "150px" });
  grid._avatarObserver?.disconnect();
  grid._avatarObserver = observer;
  for (const img of grid.querySelectorAll("img[data-src]")) {
    if (!img.dataset.avatarLoading) observer.observe(img);
  }
};

export const applySearchAndFilters = () => {
  const grid = document.getElementById(`${props.prefix}-grid-container`);
  if (!grid || !index) return;
  const query = document.getElementById(`${props.prefix}-search-input`).value;
  const category = document.getElementById(`${props.prefix}-dropdown-select-filter`).value;
  const results = searchIndex(index, query, category === props.getDefaultOptionLabel() ? "" : category);
  // Retain upstream generated-avatar fallback, clearly identify its purpose.
  const fallback = !results.length;
  addImagesToGrid(fallback ? props.avatarUrls(encodeURIComponent(query)) : results, grid);
  grid.dataset.generatedFallback = String(fallback);
  const status = document.getElementById(`${props.prefix}-search-status`);
  if (status) status.textContent = fallback ? "No catalogue matches. Generated avatars shown below." : `${results.length} avatars`;
};

export const eventListener = async () => {
  disposeGallery();
  const modal = document.getElementById(`${props.prefix}-modal`);
  const grid = document.getElementById(`${props.prefix}-grid-container`);
  const search = document.getElementById(`${props.prefix}-search-input`);
  const dropdown = document.getElementById(`${props.prefix}-dropdown-select-filter`);
  const images = await loadSrcImages();
  if (!modal.isConnected) return;
  if (indexedImages !== images) { indexedImages=images; index=buildSearchIndex(images); }
  const delayed = debounce(applySearchAndFilters);
  const onInput = event => { if (!event.isComposing) delayed(); };
  const onChange = () => { delayed.cancel(); applySearchAndFilters(); };
  search.addEventListener("input", onInput);
  search.addEventListener("compositionend", delayed);
  dropdown.addEventListener("change", onChange);
  window.addEventListener("resize", adjustResponsive);
  const removal = new MutationObserver(() => { if (!modal.isConnected) disposeGallery(); });
  removal.observe(document.body, {childList:true});
  cleanup = () => {
    delayed.cancel(); removal.disconnect(); grid._avatarObserver?.disconnect(); resetImageLoads();
    search.removeEventListener("input",onInput); search.removeEventListener("compositionend",delayed);
    dropdown.removeEventListener("change",onChange); window.removeEventListener("resize",adjustResponsive);
    cleanup = () => {};
  };
  observeGalleryImages(grid);
};
