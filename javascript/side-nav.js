// ── SIDE NAV ──────────────────────────────────────────────────────────────────
// Renders the project-level left sidebar (#site-nav), bottom nav bar (#nav-bar),
// and hero pills (#nav-pills). Handles scroll tracking and section-active state.
// Requires base-url.js to be loaded first (provides BASE_URL).

const SideNav = (() => {
  // ── FETCH ─────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch(`${BASE_URL}data/pages.json`);
    return res.json();
  }

  // ── CURRENT PROJECT DETECTION ─────────────────────────────────────────────
  // Figures out which project we're in and which page within it.

  function detectContext(data) {
    const path = window.location.pathname;

    for (const project of data.work || []) {
      for (const page of project.pages) {
        // Resolve href the same way header-nav does
        const resolved = BASE_URL + page.href.replace(/^\//, "");
        const resolvedNorm = norm(resolved);
        const pathNorm = norm(path);

        if (pathNorm === resolvedNorm) {
          return { project, page };
        }
      }
    }
    return null;
  }

  function norm(s) {
    return (
      s
        .replace(window.location.origin, "")
        .replace(BASE_URL, "")
        .replace(/^\//, "")
        .replace(/\.html$/, "")
        .replace(/\/$/, "") || "index"
    );
  }

  function resolveHref(href) {
    if (!href || href === "#") return "#";
    return BASE_URL + href.replace(/^\//, "");
  }

  // ── SIDEBAR ───────────────────────────────────────────────────────────────
  // Shows the other pages within the current project.

  function renderSidebar(project, currentPage) {
    const nav = document.getElementById("site-nav");
    if (!nav) return;

    project.pages.forEach((page) => {
      const a = document.createElement("a");
      a.className = "site-nav__item";
      a.href = resolveHref(page.href);
      a.style.setProperty("--accent", page.color);
      if (page.id === currentPage.id) a.classList.add("is-active");

      a.innerHTML = `
        <span class="site-nav__dot"></span>
        <span class="site-nav__label">${page.label}</span>
      `;
      nav.appendChild(a);
    });
  }

  // ── HERO PILLS ────────────────────────────────────────────────────────────
  // Shows sections of the current page inside the hero.

  function renderHeroPills(sections) {
    const nav = document.getElementById("nav-pills");
    if (!nav || !sections?.length) return;

    sections.forEach((section, i) => {
      const btn = document.createElement("button");
      btn.className = "nav-pill";
      btn.dataset.section = section.id;
      btn.style.setProperty("--accent", section.color);
      if (i === 0) btn.classList.add("is-active");

      btn.innerHTML = `
        <span class="nav-pill__dot"></span>
        <span class="nav-pill__label">${section.label}</span>
      `;

      btn.addEventListener("click", () => scrollToSection(section.id));
      nav.appendChild(btn);
    });
  }

  // ── BOTTOM BAR ────────────────────────────────────────────────────────────
  // Same sections as hero pills but in the sticky bottom bar.

  function renderBottomBar(sections) {
    const bar = document.getElementById("nav-bar");
    if (!bar || !sections?.length) return;

    sections.forEach((section, i) => {
      const btn = document.createElement("button");
      btn.className = "nav-bar__item";
      btn.dataset.section = section.id;
      btn.style.setProperty("--accent", section.color);
      if (i === 0) btn.classList.add("is-active");

      btn.innerHTML = `
        <span class="nav-bar__dot"></span>
        <span class="nav-bar__label">${section.label}</span>
      `;

      btn.addEventListener("click", () => scrollToSection(section.id));
      bar.appendChild(btn);
    });
  }

  // ── SCROLL TO SECTION ─────────────────────────────────────────────────────

  function scrollToSection(id) {
    const container = document.getElementById("scroll-container");
    const target = document.getElementById(id);
    if (!container || !target) return;
    target.scrollIntoView({ behavior: "smooth" });
  }

  // ── SCROLL TRACKING ───────────────────────────────────────────────────────

  function setupScrollTracking(sections) {
    const container = document.getElementById("scroll-container");
    const hero = document.getElementById("hero");
    const bar = document.getElementById("nav-bar");
    if (!container || !sections?.length) return;

    function getActiveSection() {
      const containerTop = container.getBoundingClientRect().top;
      let active = sections[0].id;

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const relTop = rect.top - containerTop;
        if (relTop <= container.clientHeight * 0.4) {
          active = section.id;
        }
      }
      return active;
    }

    function update() {
      const activeId = getActiveSection();

      // Update pills
      document.querySelectorAll(".nav-pill, .nav-bar__btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.section === activeId);
      });

      // Show/hide bottom bar based on hero visibility
      if (hero && bar) {
        const heroBottom = hero.getBoundingClientRect().bottom;
        const containerTop = container.getBoundingClientRect().top;
        bar.classList.toggle("is-visible", heroBottom - containerTop < 80);
      }
    }

    container.addEventListener("scroll", update, { passive: true });
    update();
  }

  // ── WAIT FOR SECTIONS ─────────────────────────────────────────────────────
  // intro.js fires "intro:ready" when it's done appending sections.

  function waitForIntro(sections) {
    window.addEventListener(
      "intro:ready",
      () => {
        setupScrollTracking(sections);
      },
      { once: true },
    );

    // Fallback in case intro:ready already fired or isn't coming
    setTimeout(() => setupScrollTracking(sections), 1200);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const data = await fetchData();
    const ctx = detectContext(data);
    if (!ctx) return; // Not on a project page

    const { project, page } = ctx;
    const sections = page.sections || [];

    renderSidebar(project, page);
    renderHeroPills(sections);
    renderBottomBar(sections);
    waitForIntro(sections);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", SideNav.init);
