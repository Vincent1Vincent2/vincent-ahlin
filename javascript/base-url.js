// ── BASE_URL ──────────────────────────────────────────────────────────────────
// Resolves the site root so all data fetches work regardless of:
//   - page depth  (root vs work/multilang/)
//   - host        (localhost vs username.github.io/repo-name/)
//
// Strategy: this file always lives at javascript/base-url.js.
// Find that script tag, strip everything from "/javascript/" onward,
// and what's left is the site root.

const BASE_URL = (() => {
  const scripts = Array.from(document.querySelectorAll("script[src]"));
  const self = scripts.find((s) => s.src.includes("base-url.js"));
  if (self) {
    const src = self.src;
    const cut = src.indexOf("/javascript/base-url.js");
    if (cut !== -1) return src.slice(0, cut + 1);
  }
  // fallback: assume repo name in path
  return window.location.origin + "/vincent-ahlin/";
})();
