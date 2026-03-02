// ── SITE NAV ──────────────────────────────────────────────────────────────────
// Renders the fixed center header nav from /data/pages.json.
// Top-level: Home, Work, Contact (pill style, horizontal).
// Work expands on hover → project list.
// Projects with multiple pages expand further on hover → sub-pages.
// No sections shown — sections belong to side-nav and bottom bar only.

const SiteNav = (() => {
  // ── FETCH ─────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("/data/pages.json");
    return res.json();
  }

  // ── ACTIVE PAGE DETECTION ─────────────────────────────────────────────────

  function currentPath() {
    return window.location.pathname;
  }

  function norm(s) {
    return s
      .replace(/^\//, "")
      .replace(/\.html$/, "")
      .replace(/\/$/, "");
  }

  function isActivePage(href) {
    return norm(currentPath()) === norm(href);
  }

  // Returns the active work entry or null
  function activeProject(workEntries) {
    return (
      workEntries?.find((w) => w.pages.some((p) => isActivePage(p.href))) ??
      null
    );
  }

  // ── BUILD ARROW SVG ───────────────────────────────────────────────────────

  function arrowSVG() {
    return `<svg class="header-nav__group-arrow" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
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

      // Pages without sub-content (Home, Contact) → plain link
      if (page.id !== "work") {
        const a = document.createElement("a");
        a.className = "header-nav__btn";
        // Always use absolute href so links work from any depth
        a.href = page.href.startsWith("/") ? page.href : "/" + page.href;
        a.style.setProperty("--accent", page.color);
        if (isActivePage(page.href)) a.classList.add("is-active");

        a.innerHTML = `
          <span class="header-nav__dot"></span>
          <span>${page.label}</span>
        `;
        item.appendChild(a);
      } else {
        // Work → button that opens dropdown of projects
        const btn = document.createElement("div");
        btn.className = "header-nav__btn";

        const active = activeProject(data.work);
        if (active) {
          const activePage = active.pages.find((p) => isActivePage(p.href));
          const activeColor =
            activePage?.color || active.pages[0]?.color || page.color;
          btn.style.setProperty("--accent", activeColor);
          btn.classList.add("is-active");
        } else {
          btn.style.setProperty("--accent", page.color);
        }

        btn.innerHTML = `
          <span class="header-nav__dot"></span>
          <span>${page.label}</span>
        `;

        btn.setAttribute("role", "button");
        btn.setAttribute("tabindex", "0");
        item.appendChild(btn);

        // Dropdown
        const dropdown = document.createElement("div");
        dropdown.className = "header-nav__dropdown";

        (data.work || []).forEach((project) => {
          const hasMultiplePages = project.pages.length > 1;
          const group = document.createElement("div");
          group.className = "header-nav__group";

          if (hasMultiplePages) {
            // Group with flyout sub-pages
            const groupBtn = document.createElement("div");
            groupBtn.className = "header-nav__group-btn";
            groupBtn.style.setProperty(
              "--accent",
              project.pages[0]?.color || "var(--muted)",
            );
            groupBtn.setAttribute("role", "button");
            groupBtn.setAttribute("tabindex", "0");

            groupBtn.innerHTML = `
              <span class="header-nav__group-left">
                <span class="header-nav__group-dot"></span>
                <span>${project.label}</span>
              </span>
              ${arrowSVG()}
            `;
            group.appendChild(groupBtn);

            // Sub-pages flyout
            const sub = document.createElement("div");
            sub.className = "header-nav__sub";

            project.pages.forEach((p) => {
              const link = document.createElement("a");
              link.className = "header-nav__sub-link";
              link.href = p.href;
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
            // Single-page project → direct link, no arrow
            const firstPage = project.pages[0];
            const link = document.createElement("a");
            link.className = "header-nav__group-btn";
            link.href = firstPage?.href || "#";
            link.style.setProperty(
              "--accent",
              firstPage?.color || "var(--muted)",
            );
            if (firstPage && isActivePage(firstPage.href))
              link.classList.add("is-active");

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

document.addEventListener("DOMContentLoaded", SiteNav.init);
