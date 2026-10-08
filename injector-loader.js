(() => {
  if (window.__jfAvatarsLoader || window.__jfAvatarsInitialized) return;
  window.__jfAvatarsLoader = true;
  const urls = [
    "https://cdn.jsdelivr.net/gh/JonahTweed/jf-avatars@a0719327e5527a1a2da14b8f30ce6262f687627a/main.js",
    "https://fastly.jsdelivr.net/gh/JonahTweed/jf-avatars@a0719327e5527a1a2da14b8f30ce6262f687627a/main.js"
  ];
  const load = (index) => {
    if (index >= urls.length) {
      window.__jfAvatarsLoader = false;
      console.error("[JF-AVATARS] Both bundle sources failed. Refresh to retry.");
      return;
    }
    const script = document.createElement("script");
    script.src = urls[index];
    script.integrity = "sha384-wnhnes4lMS8PvT8a6l303hZTgu6NHQ425H9SrP0lws4SecCfuFaGsd60m6c/6w/4";
    script.crossOrigin = "anonymous";
    script.onload = () => console.info("[JF-AVATARS] Built-in search loaded");
    script.onerror = () => { script.remove(); load(index + 1); };
    document.head.appendChild(script);
  };
  if (document.head) load(0);
  else document.addEventListener("DOMContentLoaded", () => load(0), { once: true });
})();
