// ── LANDING ───────────────────────────────────────────────────────────────────
// Renders project cards from pages.json.
// Each card has a left info column and a right live-preview column.
// Preview cycles through stages on a timer — stage set is per-project.

const Landing = (() => {
  // ── FETCH ─────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch(`${BASE_URL}data/pages.json`);
    return res.json();
  }

  async function fetchIntro(projectId) {
    try {
      const res = await fetch(`${BASE_URL}work/${projectId}/data/intro.json`);
      return res.json();
    } catch {
      return null;
    }
  }

  // ── PREVIEW STAGES ────────────────────────────────────────────────────────

  const PROJECT_STAGES = {
    multilang: ["ticker", "api", "cabinet"],
    spotipod: ["ticker"],
    "booking-system-frame": ["ticker"],
  };

  const STAGE_DURATION = 3500; // ms per stage
  const STAGE_LABELS = {
    ticker: "Stats",
    api: "API Surface",
    cabinet: "Capability Cabinet",
  };

  // ── MINI API NODES ────────────────────────────────────────────────────────

  const API_NODES = [
    { id: "plugin", label: "Plugin", x: 0.15, y: 0.28, color: "var(--plugin)" },
    { id: "server", label: "Server", x: 0.5, y: 0.2, color: "var(--server)" },
    { id: "portal", label: "Portal", x: 0.15, y: 0.72, color: "var(--portal)" },
    { id: "site", label: "Site", x: 0.82, y: 0.35, color: "var(--site)" },
    { id: "db", label: "DB", x: 0.82, y: 0.72, color: "var(--muted)" },
    { id: "stripe", label: "Stripe", x: 0.5, y: 0.78, color: "var(--muted)" },
  ];

  const API_CONNECTIONS = [
    ["plugin", "server"],
    ["site", "server"],
    ["portal", "server"],
    ["server", "db"],
    ["portal", "stripe"],
    ["site", "stripe"],
  ];

  function buildApiPreview(accentColor) {
    const wrap = document.createElement("div");
    wrap.className = "preview-api";

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "preview-api__svg");
    svg.setAttribute("viewBox", "0 0 300 220");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    let activeIndex = 0;
    const lineEls = API_CONNECTIONS.map(([fromId, toId]) => {
      const from = API_NODES.find((n) => n.id === fromId);
      const to = API_NODES.find((n) => n.id === toId);
      const x1 = from.x * 300,
        y1 = from.y * 220;
      const x2 = to.x * 300,
        y2 = to.y * 220;
      const mx = (x1 + x2) / 2,
        my = (y1 + y2) / 2 - 20;

      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", "preview-api__line");
      path.setAttribute("d", `M${x1},${y1} Q${mx},${my} ${x2},${y2}`);
      path.setAttribute("stroke", accentColor);
      svg.appendChild(path);
      return path;
    });

    API_NODES.forEach((node) => {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "preview-api__node");
      g.setAttribute(
        "transform",
        `translate(${node.x * 300}, ${node.y * 220})`,
      );

      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("r", "16");
      circle.setAttribute("stroke", node.color);

      const text = document.createElementNS(ns, "text");
      text.setAttribute("y", "1");
      text.textContent = node.label;

      g.appendChild(circle);
      g.appendChild(text);
      svg.appendChild(g);
    });

    wrap.appendChild(svg);

    function pulseNext() {
      lineEls.forEach((l, i) => {
        l.classList.toggle("preview-api__line--active", i === activeIndex);
      });
      activeIndex = (activeIndex + 1) % lineEls.length;
    }

    pulseNext();
    const interval = setInterval(pulseNext, 600);
    wrap._cleanup = () => clearInterval(interval);

    return wrap;
  }

  // ── CABINET PREVIEW ───────────────────────────────────────────────────────

  const CABINET_DRAWERS = [
    { label: "Core Plugin", color: "var(--plugin)" },
    { label: "License Server", color: "var(--server)" },
    { label: "Portal", color: "var(--portal)" },
    { label: "Marketing Site", color: "var(--site)" },
  ];

  function buildCabinetPreview() {
    const wrap = document.createElement("div");
    wrap.className = "preview-cabinet";

    CABINET_DRAWERS.forEach((drawer, i) => {
      const el = document.createElement("div");
      el.className = "preview-drawer";
      el.style.setProperty("--accent", drawer.color);
      el.innerHTML = `
        <div class="preview-drawer__label">${drawer.label}</div>
        <div class="preview-drawer__body">
          <div class="preview-drawer__row"></div>
          <div class="preview-drawer__row"></div>
          <div class="preview-drawer__row"></div>
        </div>
        <div class="preview-drawer__handle"></div>
      `;
      setTimeout(() => el.classList.add("is-visible"), 80 * i);
      wrap.appendChild(el);
    });

    return wrap;
  }

  // ── TICKER PREVIEW ────────────────────────────────────────────────────────

  function buildTickerPreview(stats, accentColor) {
    const wrap = document.createElement("div");
    wrap.className = "preview-ticker";

    const grid = document.createElement("div");
    grid.style.cssText =
      "display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%";

    stats.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "ticker-stat";
      el.style.setProperty("--accent", accentColor);
      el.innerHTML = `
        <span class="ticker-stat__value">${s.value}</span>
        <span class="ticker-stat__label">${s.label}</span>
      `;
      el._staggerDelay = 60 * i;
      grid.appendChild(el);
    });

    wrap.appendChild(grid);

    wrap._onActivate = () => {
      grid.querySelectorAll(".ticker-stat").forEach((el) => {
        setTimeout(() => el.classList.add("is-visible"), el._staggerDelay);
      });
    };

    wrap._onDeactivate = () => {
      grid.querySelectorAll(".ticker-stat").forEach((el) => {
        el.classList.remove("is-visible");
      });
    };

    return wrap;
  }

  // ── BUILD PREVIEW COLUMN ──────────────────────────────────────────────────

  function buildPreview(projectId, introData, accentColor) {
    const wrap = document.createElement("div");
    wrap.className = "project-card__preview";

    const stages = PROJECT_STAGES[projectId] || ["ticker"];
    const stageEls = {};

    stages.forEach((stage) => {
      let el;
      if (stage === "ticker") {
        el = buildTickerPreview(introData?.meta?.stats || [], accentColor);
      } else if (stage === "api") {
        el = buildApiPreview(accentColor);
      } else if (stage === "cabinet") {
        el = buildCabinetPreview();
      }
      if (el) {
        stageEls[stage] = el;
        wrap.appendChild(el);
      }
    });

    const label = document.createElement("div");
    label.className = "preview-stage-label";
    wrap.appendChild(label);

    let current = 0;
    let timer = null;

    function showStage(index) {
      const stageName = stages[index];
      const prev = stages[(index - 1 + stages.length) % stages.length];

      const prevEl = stageEls[prev];
      if (prevEl) {
        prevEl.classList.remove("is-active");
        if (prevEl._onDeactivate) prevEl._onDeactivate();
        if (prevEl._cleanup) prevEl._cleanup();
      }

      const el = stageEls[stageName];
      if (el) {
        el.classList.add("is-active");
        if (el._onActivate) el._onActivate();
      }

      label.textContent = STAGE_LABELS[stageName] || stageName;
    }

    function next() {
      current = (current + 1) % stages.length;
      showStage(current);
    }

    function start() {
      showStage(0);
      if (stages.length > 1) timer = setInterval(next, STAGE_DURATION);
    }

    function stop() {
      clearInterval(timer);
      stages.forEach((s) => {
        const el = stageEls[s];
        if (el?._cleanup) el._cleanup();
      });
    }

    wrap._start = start;
    wrap._stop = stop;

    return wrap;
  }

  // ── RESOLVE HREF ──────────────────────────────────────────────────────────
  // All card links need BASE_URL applied just like header nav

  function resolveHref(href) {
    if (!href || href === "#") return "#";
    return BASE_URL + href.replace(/^\//, "");
  }

  // ── BUILD PROJECT CARD ────────────────────────────────────────────────────

  function buildCard(project, introData) {
    const firstPage = project.pages[0];
    const href = resolveHref(firstPage?.href || "#");
    const accentColor = firstPage?.color || "var(--muted)";

    const card = document.createElement("a");
    card.className = "project-card";
    card.href = href;
    card.style.setProperty("--accent", accentColor);

    const stats = introData?.meta?.stats || [];
    const statsHTML = stats
      .slice(0, 4)
      .map(
        (s) => `
        <div class="project-card__stat">
          <span class="project-card__stat-value">${s.value}</span>
          <span>${s.label}</span>
        </div>
      `,
      )
      .join("");

    const githubHTML = project.github
      ? `<a class="project-card__github" href="${project.github}" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
             <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
           </svg>
           GitHub
         </a>`
      : "";

    const info = document.createElement("div");
    info.className = "project-card__info";
    info.innerHTML = `
      <div class="project-card__meta">
        <div class="project-card__eyebrow">Solo Project · ${
          project.pages.length > 1 ? project.pages.length + " pages" : "1 page"
        }</div>
        <div class="project-card__title">${project.label}</div>
        <div class="project-card__tagline">${introData?.meta?.tagline || ""}</div>
      </div>
      <div class="project-card__stats">${statsHTML}</div>
      <div class="project-card__cta">
        View project <span class="project-card__cta-arrow">→</span>
        ${githubHTML}
      </div>
    `;

    // Prevent github link from triggering card navigation
    const githubLink = info.querySelector(".project-card__github");
    if (githubLink) {
      githubLink.addEventListener("click", (e) => e.stopPropagation());
    }

    const preview = buildPreview(project.id, introData, accentColor);

    card.appendChild(info);
    card.appendChild(preview);
    card._preview = preview;

    return card;
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  async function render(data) {
    const container = document.getElementById("landing-projects");
    if (!container) return;

    const work = data.work || [];
    const intros = await Promise.all(work.map((p) => fetchIntro(p.id)));

    work.forEach((project, i) => {
      const card = buildCard(project, intros[i]);
      container.appendChild(card);
      setTimeout(() => card._preview._start(), 400 + i * 200);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const data = await fetchData();
    await render(data);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Landing.init);
