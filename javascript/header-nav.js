// ── HEADER NAV ────────────────────────────────────────────────────────────────
// Renders the fixed center header nav from data/pages.json.
// Requires base-url.js to be loaded first (provides BASE_URL).

const HeaderNav = (() => {
  // ── FETCH ─────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch(`${BASE_URL}data/pages.json`);
    return res.json();
  }

  // ── ACTIVE PAGE DETECTION ─────────────────────────────────────────────────

  function norm(href) {
    // Strip origin + BASE_URL prefix, trailing slash, .html
    return (
      href
        .replace(window.location.origin, "")
        .replace(BASE_URL, "")
        .replace(/^\//, "")
        .replace(/\.html$/, "")
        .replace(/\/$/, "") || "index"
    );
  }

  function isActivePage(href) {
    return norm(window.location.pathname) === norm(resolveHref(href));
  }

  function activeProject(workEntries) {
    return (
      workEntries?.find((w) => w.pages.some((p) => isActivePage(p.href))) ??
      null
    );
  }

  // ── RESOLVE HREF ──────────────────────────────────────────────────────────
  // Stored hrefs use leading-slash absolute paths (/work/multilang/index.html).
  // Prepend BASE_URL (minus trailing slash) so they resolve correctly on
  // GitHub Pages subdirectory deployments.

  function resolveHref(href) {
    if (!href || href === "#") return "#";
    return BASE_URL + href.replace(/^\//, "");
  }

  // ── ARROW SVG ─────────────────────────────────────────────────────────────

  function arrowSVG() {
    return `<svg class="header-nav__group-arrow" viewBox="0 0 10 10" fill="none">
      <path d="M3 2l4 3-4 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  function render(data) {
    const nav = document.getElementById("header-nav");
    if (!nav) return;

    data.pages.forEach((page) => {
      const item = document.createElement("div");
      item.className = "header-nav__item";

      if (page.id !== "work") {
        const a = document.createElement("a");
        a.className = "header-nav__btn";
        a.href = resolveHref(page.href);
        a.style.setProperty("--accent", page.color);
        if (isActivePage(page.href)) a.classList.add("is-active");
        a.innerHTML = `
          <span class="header-nav__dot"></span>
          <span>${page.label}</span>
        `;
        item.appendChild(a);
      } else {
        const btn = document.createElement("div");
        btn.className = "header-nav__btn";
        const active = activeProject(data.work);
        btn.style.setProperty("--accent", page.color);
        if (active) btn.classList.add("is-active");
        btn.setAttribute("role", "button");
        btn.setAttribute("tabindex", "0");
        btn.innerHTML = `
          <span class="header-nav__dot"></span>
          <span>${page.label}</span>
        `;
        item.appendChild(btn);

        const dropdown = document.createElement("div");
        dropdown.className = "header-nav__dropdown";

        (data.work || []).forEach((project) => {
          const hasMultiplePages = project.pages.length > 1;
          const group = document.createElement("div");
          group.className = "header-nav__group";

          if (hasMultiplePages) {
            const groupBtn = document.createElement("div");
            groupBtn.className = "header-nav__group-btn";
            groupBtn.style.setProperty(
              "--accent",
              project.pages[0]?.color || "var(--muted)",
            );
            groupBtn.setAttribute("role", "button");
            groupBtn.setAttribute("tabindex", "0");
            if (active?.id === project.id) groupBtn.classList.add("is-active");
            groupBtn.innerHTML = `
              <span class="header-nav__group-left">
                <span class="header-nav__group-dot"></span>
                <span>${project.label}</span>
              </span>
              ${arrowSVG()}
            `;
            group.appendChild(groupBtn);

            const sub = document.createElement("div");
            sub.className = "header-nav__sub";
            project.pages.forEach((p) => {
              const link = document.createElement("a");
              link.className = "header-nav__sub-link";
              link.href = resolveHref(p.href);
              link.style.setProperty("--accent", p.color);
              if (isActivePage(p.href)) link.classList.add("is-active");
              link.innerHTML = `
                <span class="header-nav__sub-dot"></span>
                <span>${p.label}</span>
              `;
              sub.appendChild(link);
            });
            group.appendChild(sub);
          } else {
            const firstPage = project.pages[0];
            const link = document.createElement("a");
            link.className = "header-nav__group-btn";
            link.href = resolveHref(firstPage?.href);
            link.style.setProperty(
              "--accent",
              firstPage?.color || "var(--muted)",
            );
            if (active?.id === project.id) link.classList.add("is-active");
            link.innerHTML = `
              <span class="header-nav__group-left">
                <span class="header-nav__group-dot"></span>
                <span>${project.label}</span>
              </span>
            `;
            group.appendChild(link);
          }

          dropdown.appendChild(group);
        });

        item.appendChild(dropdown);
      }

      nav.appendChild(item);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const data = await fetchData();
    render(data);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", HeaderNav.init);
