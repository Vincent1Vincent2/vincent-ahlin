// ── INTRO ─────────────────────────────────────────────────────────────────────
// Renders all intro sections into the DOM on load.
// Each section is a full <section> element with an id.
// Scroll and nav interaction is handled by nav.js.
// All content comes from data.json.

const Intro = (() => {
  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("./data/data.json");
    return res.json();
  }

  // ── HERO BOOTSTRAP ─────────────────────────────────────────────────────────

  function renderHero(data) {
    const taglineEl = document.getElementById("hero-tagline");
    const statsEl = document.getElementById("hero-stats");
    if (!taglineEl || !statsEl || !data.meta) return;

    taglineEl.textContent = data.meta.tagline;

    data.meta.stats.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = "hero__stat";
      el.style.animationDelay = `${0.3 + i * 0.08}s`;
      el.innerHTML = `
        <span class="hero__stat-value">${s.value}</span>
        <span class="hero__stat-label">${s.label}</span>
      `;
      statsEl.appendChild(el);
    });
  }

  // ── SECTION WRAPPER ────────────────────────────────────────────────────────

  function makeSection(id) {
    const section = document.createElement("section");
    section.className = "intro-section";
    section.id = id;
    return section;
  }

  // ── SECTION LABEL ──────────────────────────────────────────────────────────

  function sectionLabel(text) {
    const el = document.createElement("div");
    el.className = "section-label";
    el.textContent = text;
    return el;
  }

  // ── OVERVIEW ───────────────────────────────────────────────────────────────

  function renderOverview(data) {
    const d = data.overview;
    if (!d) return null;

    const section = makeSection("overview");
    const inner = document.createElement("div");
    inner.className = "intro-section__inner";

    inner.appendChild(sectionLabel(d.heading));

    const intro = document.createElement("p");
    intro.className = "content-body";
    intro.textContent = d.body;
    inner.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "grid grid--2col content-grid";

    d.systems.forEach((sys, i) => {
      const card = document.createElement("div");
      card.className = "panel panel--card flip-card";
      card.style.setProperty("--accent", sys.color);
      card.style.animationDelay = `${i * 0.07}s`;
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${sys.title} — click to flip`);
      card.dataset.flipped = "false";

      card.innerHTML = `
        <div class="flip-card__inner">
          <div class="flip-card__front panel__content">
            <div class="panel__label" style="color:${sys.color}">${sys.num}</div>
            <div class="panel__title">${sys.title}</div>
            <div class="panel__desc">${sys.summary}</div>
            <div class="flip-card__hint">Click for more</div>
          </div>
          <div class="flip-card__back panel__content">
            <div class="panel__label" style="color:${sys.color}">Detail</div>
            <div class="panel__desc">${sys.detail}</div>
            <div class="flip-card__hint">Click to flip back</div>
          </div>
        </div>
      `;

      const toggle = () => {
        const flipped = card.dataset.flipped === "true";
        card.dataset.flipped = String(!flipped);
        card.classList.toggle("is-flipped", !flipped);
      };

      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") toggle();
      });

      grid.appendChild(card);
    });

    inner.appendChild(grid);
    section.appendChild(inner);
    return section;
  }

  // ── STACK ──────────────────────────────────────────────────────────────────

  function renderStack(data) {
    const d = data.stack;
    if (!d) return null;

    const section = makeSection("stack");
    const inner = document.createElement("div");
    inner.className = "intro-section__inner";

    inner.appendChild(sectionLabel(d.heading));

    const grid = document.createElement("div");
    grid.className = "grid grid--stack content-grid";

    d.cards.forEach((card, i) => {
      const el = document.createElement("div");
      el.className = "panel panel--card flip-card";
      el.style.setProperty("--accent", card.color);
      el.style.animationDelay = `${i * 0.07}s`;
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${card.system} stack — click to flip`);
      el.dataset.flipped = "false";

      el.innerHTML = `
        <div class="flip-card__inner">
          <div class="flip-card__front panel__content">
            <div class="panel__label" style="color:${card.color}">${card.system}</div>
            <div class="panel__title">${card.front}</div>
            <div class="flip-card__hint">Click for detail</div>
          </div>
          <div class="flip-card__back panel__content">
            <div class="panel__label" style="color:${card.color}">${card.system}</div>
            <div class="panel__desc">${card.back}</div>
            <div class="flip-card__hint">Click to flip back</div>
          </div>
        </div>
      `;

      const toggle = () => {
        const flipped = el.dataset.flipped === "true";
        el.dataset.flipped = String(!flipped);
        el.classList.toggle("is-flipped", !flipped);
      };

      el.addEventListener("click", toggle);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") toggle();
      });

      grid.appendChild(el);
    });

    inner.appendChild(grid);
    section.appendChild(inner);
    return section;
  }

  // ── CHALLENGES ─────────────────────────────────────────────────────────────

  function renderChallenges(data) {
    const d = data.challenges;
    if (!d) return null;

    const section = makeSection("challenges");
    const inner = document.createElement("div");
    inner.className = "intro-section__inner";

    inner.appendChild(sectionLabel(d.heading));

    const grid = document.createElement("div");
    grid.className = "grid grid--2col content-grid";

    d.items.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "panel panel--card expand-card";
      el.style.setProperty("--accent", item.color);
      el.style.animationDelay = `${i * 0.07}s`;
      el.dataset.expanded = "false";

      el.innerHTML = `
        <div class="panel__content">
          <div class="panel__label" style="color:${item.color}">${item.num}</div>
          <div class="panel__title">${item.title}</div>
          <div class="panel__desc">${item.summary}</div>
          <div class="expand-card__detail panel__desc">${item.detail}</div>
          <button class="expand-card__toggle" aria-expanded="false">
            <span class="expand-card__toggle-label">Read more</span>
            <span class="expand-card__toggle-icon">↓</span>
          </button>
        </div>
      `;

      const btn = el.querySelector(".expand-card__toggle");
      const label = el.querySelector(".expand-card__toggle-label");
      const icon = el.querySelector(".expand-card__toggle-icon");
      const detail = el.querySelector(".expand-card__detail");

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const expanded = el.dataset.expanded === "true";
        el.dataset.expanded = String(!expanded);
        detail.classList.toggle("is-visible", !expanded);
        btn.setAttribute("aria-expanded", String(!expanded));
        label.textContent = expanded ? "Read more" : "Read less";
        icon.textContent = expanded ? "↓" : "↑";
      });

      grid.appendChild(el);
    });

    inner.appendChild(grid);
    section.appendChild(inner);
    return section;
  }

  // ── BUSINESS ───────────────────────────────────────────────────────────────

  function renderBusiness(data) {
    const d = data.business;
    if (!d) return null;

    const section = makeSection("business");
    const inner = document.createElement("div");
    inner.className = "intro-section__inner";

    inner.appendChild(sectionLabel(d.heading));

    const grid = document.createElement("div");
    grid.className = "grid grid--biz content-grid";

    d.items.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "panel panel--card";
      el.style.setProperty("--accent", item.color);
      el.style.animationDelay = `${i * 0.07}s`;

      el.innerHTML = `
        <div class="panel__content">
          <div class="panel__title">${item.title}</div>
          <div class="panel__desc">${item.desc}</div>
        </div>
      `;

      grid.appendChild(el);
    });

    inner.appendChild(grid);
    section.appendChild(inner);
    return section;
  }

  // ── ROLE ───────────────────────────────────────────────────────────────────

  function renderRole(data) {
    const d = data.role;
    if (!d) return null;

    const section = makeSection("role");
    const inner = document.createElement("div");
    inner.className = "intro-section__inner";

    inner.appendChild(sectionLabel(d.heading));

    const card = document.createElement("div");
    card.className = "panel panel--card role-card";
    card.style.setProperty("--accent", "var(--site)");
    card.style.animationDelay = "0.05s";

    const lines = d.lines
      .map(
        (l) => `
      <div class="evidence__row">
        <span class="evidence__tag">${l}</span>
      </div>
    `,
      )
      .join("");

    card.innerHTML = `
      <div class="panel__content">
        <div class="panel__title">${d.title}</div>
        <div class="panel__desc">${d.body}</div>
        <div class="panel__evidence">${lines}</div>
      </div>
    `;

    inner.appendChild(card);
    section.appendChild(inner);
    return section;
  }

  // ── RENDER ALL ─────────────────────────────────────────────────────────────

  function renderAll(data) {
    const container = document.getElementById("scroll-container");
    if (!container) return;

    const renderers = [
      renderOverview,
      renderStack,
      renderChallenges,
      renderBusiness,
      renderRole,
    ];

    renderers.forEach((fn) => {
      const section = fn(data);
      if (section) container.appendChild(section);
    });

    // Notify nav.js that sections are in the DOM
    window.dispatchEvent(new CustomEvent("intro:ready"));
  }

  // ── INIT ───────────────────────────────────────────────────────────────────

  async function init() {
    const data = await fetchData();
    renderHero(data);
    renderAll(data);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Intro.init);
