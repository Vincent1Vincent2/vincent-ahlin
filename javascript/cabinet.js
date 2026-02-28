// ── CABINET ───────────────────────────────────────────────────────────────────
// Renders the interactive 3D filing cabinet in the #cabinet section.
// Owns its own data fetch, drawer build, file card placement, and detail panel.

const Cabinet = (() => {
  // ── STATE ──────────────────────────────────────────────────────────────────

  let systems = [];

  const PULL = 340; // px — how far drawer slides out toward viewer
  const FILE_SPACING = 28; // px — Z gap between stacked file cards

  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("./data/cabinet.json");
    const data = await res.json();
    systems = data.systems;
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────

  function alpha(color, a) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${a})`);
  }

  // ── DETAIL ─────────────────────────────────────────────────────────────────

  function openDetail(sys, cap) {
    const card = document.getElementById("detail-card");
    const btn = document.getElementById("back-btn");

    card.style.setProperty("--detail-color", sys.color);

    card.innerHTML = `
      <div class="detail-card__label">${sys.label}</div>
      <div class="detail-card__title">${cap.name}</div>
      <div class="detail-card__desc">${cap.desc}</div>
      <div class="detail-card__files">
        ${cap.files.map((f) => `<span class="detail-card__file">${f}</span>`).join("")}
      </div>
    `;

    document
      .getElementById("section-detail")
      .scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      card.classList.add("is-visible");
      btn.classList.add("is-visible");
    }, 400);
  }

  function closeDetail() {
    const card = document.getElementById("detail-card");
    const btn = document.getElementById("back-btn");

    card.classList.remove("is-visible");
    btn.classList.remove("is-visible");
    setTimeout(() => {
      document
        .getElementById("section-cabinet")
        .scrollIntoView({ behavior: "smooth" });
    }, 300);
  }

  // ── FILE CARD ───────────────────────────────────────────────────────────────

  function buildFile(sys, cap, index) {
    const file = document.createElement("div");
    file.className = "file";
    file.style.setProperty("--file-bg", alpha(sys.color, 0.08));
    file.style.setProperty("--file-border", alpha(sys.color, 0.28));
    file.style.setProperty("--file-color", sys.color);
    file.style.setProperty("--file-line", alpha(sys.color, 0.5));

    const zOffset = -(index * FILE_SPACING + 10);
    file.style.setProperty("--file-z", `${zOffset}px`);
    file.style.transform = `translateY(-50%) translateZ(${zOffset}px)`;

    file.innerHTML = `
      <div class="file__card">
        <div class="file__tab">${cap.name}</div>
        <div class="file__body"></div>
      </div>
    `;

    file.addEventListener("click", (e) => {
      e.stopPropagation();
      openDetail(sys, cap);
    });

    return file;
  }

  // ── DRAWER ─────────────────────────────────────────────────────────────────

  function buildDrawer(sys) {
    const drawer = document.createElement("div");
    drawer.className = "drawer";
    drawer.style.setProperty("--accent", sys.color);

    const box = document.createElement("div");
    box.className = "drawer__box";

    // Walls
    const bottom = document.createElement("div");
    bottom.className = "drawer__bottom";
    const wallLeft = document.createElement("div");
    wallLeft.className = "drawer__wall-left";
    const wallRight = document.createElement("div");
    wallRight.className = "drawer__wall-right";

    // File cards stacked along Z axis
    sys.capabilities.forEach((cap, i) => {
      box.appendChild(buildFile(sys, cap, i));
    });

    // Face — sits at Z=0, in front of all file cards
    const face = document.createElement("div");
    face.className = "drawer__face";
    face.innerHTML = `
      <span class="drawer__label">${sys.label}</span>
      <span class="drawer__title">${sys.title}</span>
      <span class="drawer__count">${sys.capabilities.length} capabilities</span>
      <div class="drawer__handle"></div>
    `;

    box.appendChild(bottom);
    box.appendChild(wallLeft);
    box.appendChild(wallRight);
    box.appendChild(face);
    drawer.appendChild(box);

    face.addEventListener("click", () => {
      const isOpen = drawer.classList.contains("is-open");
      document
        .querySelectorAll(".drawer.is-open")
        .forEach((d) => d.classList.remove("is-open"));
      if (!isOpen) drawer.classList.add("is-open");
    });

    return drawer;
  }

  // ── BUILD ──────────────────────────────────────────────────────────────────

  function build() {
    const front = document.getElementById("cabinet-front");
    if (!front) return;

    front.innerHTML = "";
    systems.forEach((sys) => front.appendChild(buildDrawer(sys)));

    // Back button
    const btn = document.getElementById("back-btn");
    if (btn) btn.addEventListener("click", closeDetail);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const front = document.getElementById("cabinet-front");
    if (!front) return;

    await fetchData();
    build();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Cabinet.init);
