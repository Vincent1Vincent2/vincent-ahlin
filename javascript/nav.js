// ── NAV ───────────────────────────────────────────────────────────────────────
// Standalone navigation module.
// Responsibilities:
//   - Fetch pages + sections from pages.json
//   - Render fixed left sidebar (all pages) — page-level navigation
//   - Render hero pills (intro.html only)
//   - Render persistent bottom bar (all pages) — section-level navigation
//   - Collapse pills → bar on scroll past hero OR first click
//   - Scroll to section on nav item click (same page only)
//   - Update active section via scroll position polling after snap settles
//   - Highlight active page in sidebar based on current page

const Nav = (() => {
  // ── STATE ──────────────────────────────────────────────────────────────────

  let pages = [];
  let sections = [];
  let collapsed = false;
  let activeId = null;
  let scrolling = false;
  let scrollTimer = null;

  // ── PAGE DETECTION ─────────────────────────────────────────────────────────

  function currentPage() {
    const p = window.location.pathname;
    if (p.endsWith("index.html")) return "ecosystem";
    if (p.endsWith("capability.html")) return "capability";
    return "intro";
  }

  const isIntro = () => currentPage() === "intro";

  // ── DOM REFS ───────────────────────────────────────────────────────────────

  let heroEl = null;
  let pillsEl = null;
  let barEl = null;
  let sidebarEl = null;
  let containerEl = null;
  let heroObserver = null;

  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("./data/pages.json");
    const data = await res.json();
    pages = data.pages || [];
    sections = data.sections[currentPage()] || [];
  }

  // ── RENDER: SIDEBAR ────────────────────────────────────────────────────────

  function renderSidebar() {
    if (!sidebarEl) return;
    sidebarEl.innerHTML = "";

    const activePage = currentPage();

    pages.forEach((page) => {
      const btn = document.createElement("a");
      btn.className = "site-nav__item";
      btn.href = page.href;
      btn.dataset.id = page.id;
      btn.style.setProperty("--accent", page.color);

      if (page.id === activePage) btn.classList.add("is-active");

      btn.innerHTML = `
        <span class="site-nav__dot"></span>
        <span class="site-nav__label">${page.label}</span>
      `;

      sidebarEl.appendChild(btn);
    });
  }

  // ── RENDER: HERO PILLS ─────────────────────────────────────────────────────

  function renderPills() {
    if (!pillsEl) return;
    pillsEl.innerHTML = "";

    sections.forEach((section, i) => {
      const btn = document.createElement("button");
      btn.className = "nav-pill";
      btn.dataset.id = section.id;
      btn.style.setProperty("--accent", section.color);
      btn.style.animationDelay = `${0.1 + i * 0.07}s`;

      btn.innerHTML = `
        <span class="nav-pill__dot"></span>
        <span class="nav-pill__label">${section.label}</span>
      `;

      btn.addEventListener("click", () => handleSectionSelect(section));
      pillsEl.appendChild(btn);
    });

    setTimeout(
      () => {
        if (pillsEl) pillsEl.classList.add("is-ready");
      },
      600 + sections.length * 70 + 100,
    );
  }

  // ── RENDER: BOTTOM BAR ────────────────────────────────────────────────────

  function renderBar() {
    if (!barEl) return;
    barEl.innerHTML = "";

    const wordmark = document.createElement("div");
    wordmark.className = "nav-bar__wordmark";
    wordmark.innerHTML = "<span>ML</span>";
    barEl.appendChild(wordmark);

    const list = document.createElement("div");
    list.className = "nav-bar__items";

    sections.forEach((section) => {
      const btn = document.createElement("button");
      btn.className = "nav-bar__item";
      btn.dataset.id = section.id;
      btn.style.setProperty("--accent", section.color);

      btn.innerHTML = `
        <span class="nav-bar__dot"></span>
        <span class="nav-bar__label">${section.label}</span>
      `;

      btn.addEventListener("click", () => handleSectionSelect(section));
      list.appendChild(btn);
    });

    barEl.appendChild(list);
    updateActiveBar();
  }

  // ── ACTIVE STATE ──────────────────────────────────────────────────────────

  function setActive(id) {
    if (activeId === id) return;
    activeId = id;
    updateActiveBar();
    updateActivePills();
  }

  function updateActiveBar() {
    if (!barEl) return;
    barEl.querySelectorAll(".nav-bar__item").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.id === activeId);
    });
  }

  function updateActivePills() {
    if (!pillsEl) return;
    pillsEl.querySelectorAll(".nav-pill").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.id === activeId);
    });
  }

  // ── COLLAPSE / UNCOLLAPSE ─────────────────────────────────────────────────

  function collapse() {
    if (collapsed || !isIntro()) return;
    collapsed = true;

    if (pillsEl) {
      pillsEl.classList.remove("is-returning");
      pillsEl.classList.add("is-collapsed");
    }
    if (barEl) barEl.classList.add("is-visible");

    if (heroObserver) heroObserver.disconnect();
  }

  function uncollapse() {
    if (!collapsed || !isIntro()) return;
    collapsed = false;

    if (pillsEl) {
      pillsEl.classList.remove("is-collapsed");
      pillsEl.classList.add("is-returning");
    }
    if (barEl) barEl.classList.remove("is-visible");

    watchHeroScroll();
  }

  // ── SCROLL POSITION → ACTIVE SECTION ─────────────────────────────────────

  function resolveActiveFromScroll() {
    if (!containerEl) return;

    const scrollTop = containerEl.scrollTop;
    const containerH = containerEl.clientHeight;

    if (scrollTop < containerH * 0.25) {
      setActive(null);
      uncollapse();
      return;
    }

    const sections = containerEl.querySelectorAll(
      ".intro-section, .scroll-section",
    );
    let best = null;
    let bestDist = Infinity;

    sections.forEach((section) => {
      const dist = Math.abs(section.offsetTop - scrollTop);
      if (dist < bestDist) {
        bestDist = dist;
        best = section;
      }
    });

    if (best) setActive(best.id);
  }

  // ── WATCH SCROLL ──────────────────────────────────────────────────────────

  function watchScroll() {
    if (!containerEl) return;

    containerEl.addEventListener("scroll", () => {
      if (scrolling) return;

      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        resolveActiveFromScroll();
      }, 150);
    });
  }

  // ── SCROLL TO SECTION ─────────────────────────────────────────────────────

  function scrollToSection(id) {
    if (!containerEl) return;

    const target = id === "hero" ? heroEl : document.getElementById(id);
    if (!target) return;

    scrolling = true;
    setActive(id === "hero" ? null : id);

    containerEl.scrollTo({ top: target.offsetTop, behavior: "smooth" });

    setTimeout(() => {
      scrolling = false;
    }, 800);
  }

  // ── SELECT ────────────────────────────────────────────────────────────────

  function handleSectionSelect(section) {
    collapse();
    scrollToSection(section.id);
  }

  // ── HERO SCROLL OBSERVER ──────────────────────────────────────────────────

  function watchHeroScroll() {
    if (!heroEl || !isIntro()) return;

    heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) collapse();
      },
      { root: containerEl, threshold: 0.1 },
    );

    heroObserver.observe(heroEl);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    await fetchData();

    heroEl = document.getElementById("hero");
    pillsEl = document.getElementById("nav-pills");
    barEl = document.getElementById("nav-bar");
    sidebarEl = document.getElementById("site-nav");
    containerEl = document.getElementById("scroll-container");

    renderSidebar();
    renderBar();

    if (isIntro()) {
      renderPills();
      watchHeroScroll();

      window.addEventListener(
        "intro:ready",
        () => {
          watchScroll();
        },
        { once: true },
      );
    } else {
      if (barEl) barEl.classList.add("is-visible");
      collapsed = true;

      // Set first section as active on non-intro pages
      if (sections.length > 0) setActive(sections[0].id);

      // Watch scroll on non-intro pages too
      if (containerEl) watchScroll();
    }
  }

  return { init, collapse };
})();

document.addEventListener("DOMContentLoaded", Nav.init);
