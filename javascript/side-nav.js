// ── SIDE NAV ──────────────────────────────────────────────
// Project-specific sidebar using global pages.json
// Behaves like original Nav but scoped to project pages only

const SideNav = (() => {
  let pages = [];
  let sections = [];
  let collapsed = false;
  let activeId = null;
  let scrolling = false;
  let scrollTimer = null;

  // ── PAGE DETECTION ───────────────────────────────────────
  function currentPage() {
    const p = window.location.pathname;
    const file = p.substring(p.lastIndexOf("/") + 1) || "index.html";
    return file.replace(".html", "");
  }

  function currentProject() {
    const parts = window.location.pathname.split("/");
    const workIndex = parts.indexOf("work");
    if (workIndex >= 0 && parts.length > workIndex + 1) {
      return parts[workIndex + 1];
    }
    return null;
  }

  const isIntro = () => currentPage() === "index";

  // ── DOM REFS ─────────────────────────────────────────────
  let heroEl, pillsEl, barEl, sidebarEl, containerEl, heroObserver;

  // ── FETCH DATA ──────────────────────────────────────────
  async function fetchData() {
    const res = await fetch("/data/pages.json");
    const data = await res.json();

    const project = currentProject();
    if (project) {
      const projectData = data.work.find((p) => p.id === project);
      if (!projectData) return;

      pages = projectData.pages || [];
      const pageObj = pages.find((p) => p.id === currentPage());
      sections = pageObj?.sections || [];
    } else {
      // Root pages
      pages = data.pages || [];
      sections = [];
    }
  }

  // ── HELPERS ──────────────────────────────────────────────
  function resolveHref(page) {
    if (page.href.startsWith("work/")) return page.href;
    return page.href;
  }

  // ── RENDER SIDEBAR ──────────────────────────────────────
  function renderSidebar() {
    if (!sidebarEl) return;
    sidebarEl.innerHTML = "";

    pages.forEach((page) => {
      const btn = document.createElement("a");
      btn.className = "site-nav__item";
      btn.href = resolveHref(page);
      btn.dataset.id = page.id;
      btn.style.setProperty("--accent", page.color);

      if (page.id === currentPage()) btn.classList.add("is-active");

      btn.innerHTML = `
        <span class="site-nav__dot"></span>
        <span class="site-nav__label">${page.label}</span>
      `;
      sidebarEl.appendChild(btn);
    });
  }

  // ── RENDER HERO PILLS ───────────────────────────────────
  function renderPills() {
    if (!pillsEl || sections.length === 0) return;
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
      () => pillsEl.classList.add("is-ready"),
      600 + sections.length * 70 + 100,
    );
  }

  // ── RENDER BOTTOM BAR ───────────────────────────────────
  function renderBar() {
    if (!barEl || sections.length === 0) return;
    barEl.innerHTML = "";

    const wordmark = document.createElement("div");
    wordmark.className = "nav-bar__wordmark";
    wordmark.innerHTML = `<span>${currentProject()?.substring(0, 2).toUpperCase() || "RT"}</span>`;
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

  // ── ACTIVE STATE ────────────────────────────────────────
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

  // ── COLLAPSE / UNCOLLAPSE ──────────────────────────────
  function collapse() {
    if (collapsed) return;
    collapsed = true;

    if (pillsEl) {
      pillsEl.classList.remove("is-returning");
      pillsEl.classList.add("is-collapsed");
    }
    if (barEl) barEl.classList.add("is-visible");

    if (heroObserver) heroObserver.disconnect();
  }

  function uncollapse() {
    if (!collapsed) return;
    collapsed = false;

    if (pillsEl) {
      pillsEl.classList.remove("is-collapsed");
      pillsEl.classList.add("is-returning");
    }
    if (barEl) barEl.classList.remove("is-visible");

    watchHeroScroll();
  }

  // ── SCROLL → ACTIVE SECTION ─────────────────────────────
  function resolveActiveFromScroll() {
    if (!containerEl) return;
    const scrollTop = containerEl.scrollTop;
    const containerH = containerEl.clientHeight;

    if (scrollTop < containerH * 0.25) {
      setActive(null);
      uncollapse();
      return;
    }

    const sectionsEls = containerEl.querySelectorAll(
      ".intro-section, .scroll-section",
    );
    let best = null,
      bestDist = Infinity;

    sectionsEls.forEach((section) => {
      const dist = Math.abs(section.offsetTop - scrollTop);
      if (dist < bestDist) {
        bestDist = dist;
        best = section;
      }
    });

    if (best) setActive(best.id);
  }

  function watchScroll() {
    if (!containerEl) return;
    containerEl.addEventListener("scroll", () => {
      if (scrolling) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(resolveActiveFromScroll, 150);
    });
  }

  function scrollToSection(id) {
    if (!containerEl) return;
    const target = id === "hero" ? heroEl : document.getElementById(id);
    if (!target) return;

    scrolling = true;
    setActive(id === "hero" ? null : id);
    containerEl.scrollTo({ top: target.offsetTop, behavior: "smooth" });

    setTimeout(() => (scrolling = false), 800);
  }

  function handleSectionSelect(section) {
    collapse();
    scrollToSection(section.id);
  }

  function watchHeroScroll() {
    if (!heroEl) return;
    heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) collapse();
      },
      { root: containerEl, threshold: 0.1 },
    );
    heroObserver.observe(heroEl);
  }

  // ── INIT ────────────────────────────────────────────────
  async function init() {
    await fetchData();
    heroEl = document.getElementById("hero");
    pillsEl = document.getElementById("nav-pills");
    barEl = document.getElementById("nav-bar");
    sidebarEl = document.getElementById("site-nav");
    containerEl = document.getElementById("scroll-container");

    renderSidebar();
    renderBar();
    renderPills();
    watchHeroScroll();
    watchScroll();
  }

  return { init, collapse };
})();

document.addEventListener("DOMContentLoaded", SideNav.init);
