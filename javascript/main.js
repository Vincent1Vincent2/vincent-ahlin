// ── MAIN ──────────────────────────────────────────────────────────────────────
// Renders treemap quadrants (index.html) and capability/architecture grids
// (capability.html). Flow detail is handled by flow.js.

function currentPage() {
  const p = window.location.pathname;
  if (p.endsWith("capability.html")) return "capability";
  return "ecosystem";
}

// ── TREEMAP LAYOUT ────────────────────────────────────────────────────────────

function layoutFolders(folders, W, H) {
  const PAD = 3;
  const rects = [];
  const sorted = [...folders].sort((a, b) => b.files.length - a.files.length);
  let remaining = [...sorted];
  let remainX = 0,
    remainY = 0,
    remainW = W,
    remainH = H;

  while (remaining.length > 0) {
    const rowTotal = remaining.reduce((s, f) => s + f.files.length, 0);
    const horizontal = remainW >= remainH;

    if (remaining.length === 1) {
      const f = remaining[0];
      rects.push({
        folder: f,
        x: remainX + PAD,
        y: remainY + PAD,
        w: remainW - PAD * 2,
        h: remainH - PAD * 2,
      });
      break;
    }

    let rowItems = [],
      rowCount = 0;
    let threshold =
      rowTotal *
      (horizontal
        ? remainH / (remainW + remainH)
        : remainW / (remainW + remainH));
    threshold = Math.max(threshold, remaining[0].files.length);

    for (const f of remaining) {
      rowItems.push(f);
      rowCount += f.files.length;
      if (rowCount >= threshold) break;
    }

    const rowFrac = rowCount / rowTotal;

    if (horizontal) {
      const sliceW = Math.round(remainW * rowFrac);
      let cy = remainY;
      for (const f of rowItems) {
        const fh = Math.round(remainH * (f.files.length / rowCount));
        rects.push({
          folder: f,
          x: remainX + PAD,
          y: cy + PAD,
          w: sliceW - PAD * 2,
          h: fh - PAD * 2,
        });
        cy += fh;
      }
      remainX += sliceW;
      remainW -= sliceW;
    } else {
      const sliceH = Math.round(remainH * rowFrac);
      let cx = remainX;
      for (const f of rowItems) {
        const fw = Math.round(remainW * (f.files.length / rowCount));
        rects.push({
          folder: f,
          x: cx + PAD,
          y: remainY + PAD,
          w: fw - PAD * 2,
          h: sliceH - PAD * 2,
        });
        cx += fw;
      }
      remainY += sliceH;
      remainH -= sliceH;
    }

    remaining = remaining.filter((f) => !rowItems.includes(f));
  }

  return rects;
}

// ── TOOLTIP ───────────────────────────────────────────────────────────────────

const tooltipEl = document.getElementById("tooltip");
const ttPath = document.getElementById("tt-path");
const ttName = document.getElementById("tt-name");
const ttFiles = document.getElementById("tt-files");

function showTooltip(e, sys, folder) {
  if (!tooltipEl) return;
  ttPath.textContent = sys.title + folder.path;
  ttName.textContent = folder.name;
  ttName.style.color = sys.color;
  ttFiles.textContent = folder.files.length;
  tooltipEl.classList.add("show");
  tooltipEl.style.left =
    Math.min(e.clientX + 16, window.innerWidth - 210) + "px";
  tooltipEl.style.top =
    Math.min(e.clientY + 12, window.innerHeight - 100) + "px";
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove("show");
}

// ── QUADRANT BUILDER ──────────────────────────────────────────────────────────

const canvas = document.getElementById("canvas");
const panelEls = {};

function buildQuadrants(systems) {
  if (!canvas) return;

  systems.forEach((sys) => {
    const fileCount = sys.folders.reduce((s, f) => s + f.files.length, 0);

    const panel = document.createElement("div");
    panel.className = "panel panel--quadrant";
    panel.id = `panel-${sys.id}`;

    const bg = document.createElement("div");
    bg.className = "panel__bg";
    bg.style.background = sys.bgGradient;

    const header = document.createElement("div");
    header.className = "panel__header";
    header.innerHTML = `
      <span class="panel__label" style="color:${sys.color}">${sys.label}</span>
      <span class="panel__title">${sys.title}</span>
      <span class="panel__meta">${sys.folders.length} dirs · ${fileCount} files</span>
    `;

    const body = document.createElement("div");
    body.className = "panel__body";
    const inner = document.createElement("div");
    inner.className = "panel__body-inner";
    body.appendChild(inner);

    panel.appendChild(bg);
    panel.appendChild(header);
    panel.appendChild(body);
    canvas.appendChild(panel);

    panelEls[sys.id] = { panel, inner, sys };
  });
}

// ── TREEMAP RENDER ────────────────────────────────────────────────────────────

function renderTreemaps(flows) {
  Object.values(panelEls).forEach(({ inner, sys }) => {
    const W = inner.clientWidth || inner.offsetWidth;
    const H = inner.clientHeight || inner.offsetHeight;
    if (!W || !H) return;

    layoutFolders(sys.folders, W, H).forEach(({ folder, x, y, w, h }) => {
      if (w < 10 || h < 10) return;

      const div = document.createElement("div");
      div.className = "folder";
      div.style.cssText = `
        left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;
        background: ${sys.dimColor};
        border: 1px solid ${sys.color}22;
        z-index: ${folder.files.length};
      `;

      const fHeader = document.createElement("div");
      fHeader.className = "folder__header";
      fHeader.style.color = sys.color;
      fHeader.innerHTML = `
        <span>${folder.name}</span>
        <span style="opacity:0.5">${folder.files.length}</span>
      `;

      const fFiles = document.createElement("div");
      fFiles.className = "folder__files";
      folder.files.forEach((name) => {
        const pill = document.createElement("div");
        pill.className = "folder__pill";
        pill.textContent = name;
        fFiles.appendChild(pill);
      });

      div.appendChild(fHeader);
      div.appendChild(fFiles);
      inner.appendChild(div);

      div.addEventListener("mousemove", (e) => showTooltip(e, sys, folder));
      div.addEventListener("mouseleave", hideTooltip);
    });
  });

  drawFlowLines(flows);
}

// ── FLOW LINES ────────────────────────────────────────────────────────────────

function getPanelCenter(id) {
  const el = document.getElementById(`panel-${id}`);
  const section = document.getElementById("ecosystem");
  if (!el || !section) return { x: 0, y: 0 };

  const elRect = el.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();

  return {
    x: elRect.left - sectionRect.left + elRect.width / 2,
    y: elRect.top - sectionRect.top + elRect.height / 2,
  };
}

function drawFlowLines(flows) {
  const svg = document.getElementById("flow-svg");
  if (!svg) return;
  svg.innerHTML = "";

  flows.forEach(({ from, to, color, delay, label }) => {
    const a = getPanelCenter(from);
    const b = getPanelCenter(to);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const cx = mx - (b.y - a.y) * 0.15;
    const cy = my + (b.x - a.x) * 0.15;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`);
    path.setAttribute("stroke", color);
    path.setAttribute("class", "flow-path");
    path.style.animationDelay = delay;
    svg.appendChild(path);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", cy);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", color);
    text.setAttribute("font-size", "9");
    text.setAttribute("font-family", "DM Mono, monospace");
    text.setAttribute("opacity", "0.5");
    text.textContent = label;
    svg.appendChild(text);
  });
}

// ── CAPABILITIES GRID ─────────────────────────────────────────────────────────

function buildCapabilities(capabilities) {
  const grid = document.getElementById("cap-grid");
  if (!grid) return;

  capabilities.forEach((cap, i) => {
    const panel = document.createElement("div");
    panel.className = "panel panel--card";
    panel.style.setProperty("--accent", cap.accent);
    panel.style.setProperty("--accent-alpha", cap.accentAlpha);
    panel.style.animationDelay = `${0.05 + i * 0.07}s`;
    panel.innerHTML = `
      <div class="panel__content">
        <div class="panel__label">${cap.num}</div>
        <div class="panel__title">${cap.title}</div>
        <div class="panel__desc">${cap.desc}</div>
        <div class="panel__evidence">
          ${cap.evidence
            .map(
              (e) => `
            <div class="evidence__row">
              <span class="evidence__tag">${e.tag}</span>
              <span class="evidence__src">${e.src}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
    grid.appendChild(panel);
  });
}

// ── ARCHITECTURE GRID ─────────────────────────────────────────────────────────

function buildArchitecture(architecture) {
  const grid = document.getElementById("arch-grid");
  if (!grid) return;

  architecture.forEach((col, i) => {
    const panel = document.createElement("div");
    panel.className = "panel panel--col";
    panel.style.animationDelay = `${0.4 + i * 0.07}s`;
    panel.innerHTML = `
      <div class="panel__header">
        <div class="panel__dot" style="background:${col.color}"></div>
        <div class="panel__title" style="color:${col.color}">${col.title}</div>
      </div>
      <div class="panel__items">
        ${col.items.map((item) => `<div class="panel__item">${item}</div>`).join("")}
      </div>
    `;
    grid.appendChild(panel);
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────

async function init() {
  const page = currentPage();

  if (page === "ecosystem") {
    const res = await fetch("./data/systems.json");
    const data = await res.json();

    buildQuadrants(data.systems);
    setTimeout(() => renderTreemaps(data.flows), 100);

    window.addEventListener("resize", () => {
      Object.values(panelEls).forEach(({ inner }) => (inner.innerHTML = ""));
      renderTreemaps(data.flows);
    });
  }

  if (page === "capability") {
    const res = await fetch("./data/capabilities.json");
    const data = await res.json();

    buildCapabilities(data.capabilities);
    buildArchitecture(data.architecture);
  }
}

init();
