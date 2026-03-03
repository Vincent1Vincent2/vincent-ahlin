// ── INTRO ─────────────────────────────────────────────────────────────────────
// Renders all intro sections into the DOM on load.
// Each section is a full <section> element with an id.
// Scroll and nav interaction is handled by nav.js.
// All content comes from intro.json + pages.json (for github link).

const Intro = (() => {
  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const [intro, pages] = await Promise.all([
      fetch("./data/intro.json").then((r) => r.json()),
      fetch(`${BASE_URL}data/pages.json`).then((r) => r.json()),
    ]);

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const workIndex = pathParts.indexOf("work");
    const projectId = workIndex !== -1 ? pathParts[workIndex + 1] : null;
    const project = pages.work?.find((p) => p.id === projectId);

    return { ...intro, github: project?.github || null };
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

    if (data.github) {
      const links = document.createElement("div");
      links.className = "hero__links";

      const link = document.createElement("a");
      link.className = "hero__github";
      link.href = data.github;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub
      `;

      links.appendChild(link);
      statsEl.insertAdjacentElement("afterend", links);
    }
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

    if (d.intro) {
      const introP = document.createElement("p");
      introP.className = "content-body";
      introP.textContent = d.intro;
      inner.appendChild(introP);
    }
    if (d.body) {
      const bodyP = document.createElement("p");
      bodyP.className = "content-body";
      bodyP.textContent = d.body;
      inner.appendChild(bodyP);
    }

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

    const introBlock = document.createElement("div");
    introBlock.className = "challenges-intro";
    introBlock.appendChild(sectionLabel(d.heading));

    if (d.intro) {
      const introP = document.createElement("p");
      introP.className = "content-body";
      introP.textContent = d.intro;
      introBlock.appendChild(introP);
    }
    if (d.description) {
      const descP = document.createElement("p");
      descP.className = "content-body content-body--secondary";
      descP.textContent = d.description;
      introBlock.appendChild(descP);
    }

    inner.appendChild(introBlock);

    const stackWrap = document.createElement("div");
    stackWrap.className = "challenges-stack";

    d.items.forEach((item, i) => {
      const wrapper = document.createElement("div");
      wrapper.className = "challenge-card-parallax";
      wrapper.style.setProperty("--challenge-stack-index", String(i + 1));

      const el = document.createElement("div");
      el.className = "panel panel--card flip-card challenge-card";
      el.style.setProperty("--accent", item.color);
      el.style.animationDelay = `${i * 0.07}s`;
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${item.title} — click to read more`);
      el.dataset.flipped = "false";

      el.innerHTML = `
        <div class="flip-card__inner">
          <div class="flip-card__front panel__content">
            <div class="panel__label" style="color:${item.color}">${item.num}</div>
            <div class="panel__title">${item.title}</div>
            <div class="panel__desc">${item.summary}</div>
            <button type="button" class="challenge-card__read-more" aria-label="Read more">Read more</button>
          </div>
          <div class="flip-card__back panel__content">
            <div class="panel__label" style="color:${item.color}">${item.num}</div>
            <div class="panel__title">${item.title}</div>
            <div class="panel__desc">${item.detail}</div>
            <button type="button" class="challenge-card__back-btn" aria-label="Back">Back</button>
          </div>
        </div>
      `;

      const toggle = () => {
        const flipped = el.dataset.flipped === "true";
        el.dataset.flipped = String(!flipped);
        el.classList.toggle("is-flipped", !flipped);
      };

      const readMoreBtn = el.querySelector(".challenge-card__read-more");
      const backBtn = el.querySelector(".challenge-card__back-btn");
      readMoreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      backBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });

      el.addEventListener("click", (e) => {
        if (e.target === readMoreBtn || e.target === backBtn) return;
        toggle();
      });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });

      wrapper.appendChild(el);
      stackWrap.appendChild(wrapper);
    });

    inner.appendChild(stackWrap);
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

    if (d.intro) {
      const introP = document.createElement("p");
      introP.className = "content-body";
      introP.textContent = d.intro;
      inner.appendChild(introP);
    }

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

    if (d.intro) {
      const introP = document.createElement("p");
      introP.className = "content-body";
      introP.textContent = d.intro;
      inner.appendChild(introP);
    }

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

  // ── DEPLOYMENT ─────────────────────────────────────────────────────────────

  function renderDeployment(data) {
    const d = data.deployment;
    if (!d) return null;

    const section = makeSection("deployment");
    const inner = document.createElement("div");
    inner.className = "intro-section__inner";

    inner.appendChild(sectionLabel(d.heading));

    if (d.intro) {
      const introP = document.createElement("p");
      introP.className = "content-body";
      introP.textContent = d.intro;
      inner.appendChild(introP);
    }

    const grid = document.createElement("div");
    grid.className = "grid grid--2col content-grid";

    d.items.forEach((item, i) => {
      const el = document.createElement("div");
      el.className = "panel panel--card";
      el.style.setProperty("--accent", "var(--muted)");
      el.style.animationDelay = `${i * 0.07}s`;

      el.innerHTML = `
        <div class="panel__content">
          <div class="panel__title">${item.label}</div>
          <div class="panel__desc"><strong>${item.where}</strong>${item.detail ? ` — ${item.detail}` : ""}</div>
        </div>
      `;

      grid.appendChild(el);
    });

    inner.appendChild(grid);
    section.appendChild(inner);
    return section;
  }

  // ── RENDER ALL ─────────────────────────────────────────────────────────────

  function renderAll(data) {
    const container = document.getElementById("scroll-container");
    if (!container) return;

    const renderers = [
      renderOverview,
      renderChallenges,
      renderRole,
      renderStack,
      renderBusiness,
      renderDeployment,
    ];

    renderers.forEach((fn) => {
      const section = fn(data);
      if (section) container.appendChild(section);
    });

    window.dispatchEvent(new CustomEvent("intro:ready"));

    setupChallengesParallax();
  }

  // ── CHALLENGES PARALLAX ────────────────────────────────────────────────────

  function setupChallengesParallax() {
    const container = document.getElementById("scroll-container");
    const section = document.getElementById("challenges");
    if (!container || !section) return;

    const intro = section.querySelector(".challenges-intro");
    const cards = section.querySelectorAll(".challenge-card-parallax");
    const lastCard = cards.length ? cards[cards.length - 1] : null;

    function updateParallax() {
      const containerRect = container.getBoundingClientRect();
      const viewH = containerRect.height;
      const enterOffset = 60;

      cards.forEach((wrapper) => {
        const rect = wrapper.getBoundingClientRect();
        const topInView = rect.top - containerRect.top;
        const progress = Math.max(0, Math.min(1, 1 - topInView / viewH));
        const translateY = (1 - progress) * enterOffset;
        wrapper.style.setProperty("transform", `translateY(${translateY}px)`);
      });

      if (intro && lastCard) {
        const windowCenterY = window.innerHeight / 2;
        const lastCardRect = lastCard.getBoundingClientRect();
        const cardCenterY = lastCardRect.top + lastCardRect.height / 1.65;
        if (cardCenterY < windowCenterY) {
          intro.classList.add("sticky-off");
        } else {
          intro.classList.remove("sticky-off");
        }
      }
    }

    container.addEventListener("scroll", updateParallax);
    window.addEventListener("resize", updateParallax);
    updateParallax();
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
