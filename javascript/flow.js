// ── FLOW ──────────────────────────────────────────────────────────────────────
// Renders the interactive flow diagram in the #flow section of index.html.
// Owns its own data fetch, node layout, SVG lines, and description panel.

const Flow = (() => {
  // ── STATE ──────────────────────────────────────────────────────────────────

  let systems = [];
  let flows = [];
  let selected = null; // locked flow key e.g. "plugin→server"

  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("./data/systems.json");
    const data = await res.json();
    systems = data.systems;
    flows = data.flows;
  }

  // ── NODE POSITIONS ─────────────────────────────────────────────────────────

  const NODE_POSITIONS = {
    plugin: { col: 0, row: 0 },
    server: { col: 1, row: 0 },
    portal: { col: 0, row: 1 },
    site: { col: 1, row: 1 },
  };

  // ── BUILD ──────────────────────────────────────────────────────────────────

  function build(container) {
    container.innerHTML = "";

    const layout = document.createElement("div");
    layout.className = "flow-diagram";

    const diagram = document.createElement("div");
    diagram.className = "flow-diagram__map";

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.classList.add("flow-diagram__svg");
    diagram.appendChild(svgEl);

    const nodeEls = {};
    const sysMap = {};
    systems.forEach((s) => {
      sysMap[s.id] = s;
    });

    systems.forEach((sys) => {
      const pos = NODE_POSITIONS[sys.id];
      if (!pos) return;

      const node = document.createElement("div");
      node.className = "flow-node";
      node.dataset.id = sys.id;
      node.style.setProperty("--accent", sys.color);
      node.style.gridColumn = pos.col + 1;
      node.style.gridRow = pos.row + 1;

      node.innerHTML = `
        <div class="flow-node__inner">
          <span class="flow-node__label" style="color:${sys.color}">${sys.label}</span>
          <span class="flow-node__title">${sys.title}</span>
        </div>
      `;

      diagram.appendChild(node);
      nodeEls[sys.id] = node;
    });

    layout.appendChild(diagram);

    // ── RIGHT PANEL ─────────────────────────────────────────────────────────

    const panel = document.createElement("div");
    panel.className = "flow-diagram__panel";

    const guide = document.createElement("div");
    guide.className = "flow-diagram__guide";
    guide.innerHTML = `
      <ul class="flow-diagram__guide-list">
        <li class="flow-diagram__guide-item">
          <span class="flow-diagram__guide-icon">⬡</span>
          <span>Hover a <strong>node</strong> to see its connections</span>
        </li>
        <li class="flow-diagram__guide-item">
          <span class="flow-diagram__guide-icon">⤳</span>
          <span>Hover a <strong>line</strong> to inspect the data flow</span>
        </li>
        <li class="flow-diagram__guide-item">
          <span class="flow-diagram__guide-icon">↵</span>
          <span>Click a <strong>line</strong> to lock the selection</span>
        </li>
      </ul>
    `;

    const desc = document.createElement("div");
    desc.className = "flow-diagram__desc";
    showEmpty(desc);

    panel.appendChild(guide);
    panel.appendChild(desc);
    layout.appendChild(panel);
    container.appendChild(layout);

    requestAnimationFrame(() => {
      const lineEls = drawLines(svgEl, nodeEls, desc, sysMap);

      // Node hover
      Object.entries(nodeEls).forEach(([id, el]) => {
        el.addEventListener("mouseenter", () => {
          if (selected) return;
          hoverNode(id, nodeEls, lineEls, desc, sysMap);
        });
        el.addEventListener("mouseleave", () => {
          if (selected) return;
          resetAll(nodeEls, lineEls);
          showEmpty(desc);
        });
      });
    });
  }

  // ── DRAW LINES ─────────────────────────────────────────────────────────────

  function drawLines(svgEl, nodeEls, descEl, sysMap) {
    const diagramEl = svgEl.closest(".flow-diagram__map");
    if (!diagramEl) return {};

    svgEl.innerHTML = "";
    const lineEls = {};

    flows.forEach((flow) => {
      const fromNode = nodeEls[flow.from];
      const toNode = nodeEls[flow.to];
      if (!fromNode || !toNode) return;

      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();
      const diagramRect = diagramEl.getBoundingClientRect();

      const ax = fromRect.left - diagramRect.left + fromRect.width / 2;
      const ay = fromRect.top - diagramRect.top + fromRect.height / 2;
      const bx = toRect.left - diagramRect.left + toRect.width / 2;
      const by = toRect.top - diagramRect.top + toRect.height / 2;

      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const cx = mx - (by - ay) * 0.2;
      const cy = my + (bx - ax) * 0.2;

      const d = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;

      // Glow
      const glow = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      glow.setAttribute("d", d);
      glow.setAttribute("stroke", flow.color);
      glow.setAttribute("stroke-width", "6");
      glow.setAttribute("fill", "none");
      glow.setAttribute("opacity", "0");
      glow.style.filter = "blur(4px)";
      glow.style.transition = "opacity 0.15s";
      glow.style.pointerEvents = "none";
      svgEl.appendChild(glow);

      // Visible line
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      path.setAttribute("stroke", flow.color);
      path.setAttribute("class", "flow-path");
      path.style.animationDelay = flow.delay;
      path.style.pointerEvents = "none";
      svgEl.appendChild(path);

      // Label
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", cx);
      text.setAttribute("y", cy - 8);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", flow.color);
      text.setAttribute("font-size", "9");
      text.setAttribute("font-family", "DM Mono, monospace");
      text.setAttribute("opacity", "0.5");
      text.style.pointerEvents = "none";
      svgEl.appendChild(text);

      // Hit area
      const hit = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      hit.setAttribute("d", d);
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "40");
      hit.setAttribute("fill", "none");
      hit.setAttribute("class", "flow-diagram__hit");
      svgEl.appendChild(hit);

      const key = `${flow.from}→${flow.to}`;
      lineEls[key] = { path, glow, text, hit };

      // Line hover
      hit.addEventListener("mouseenter", () => {
        if (selected) return;
        activateLine(key, flow, lineEls, nodeEls, descEl, sysMap, false);
      });

      hit.addEventListener("mouseleave", () => {
        if (selected) return;
        resetAll(nodeEls, lineEls);
        showEmpty(descEl);
      });

      // Line click — lock selection
      hit.addEventListener("click", () => {
        if (selected === key) {
          selected = null;
          resetAll(nodeEls, lineEls);
          showEmpty(descEl);
        } else {
          selected = key;
          activateLine(key, flow, lineEls, nodeEls, descEl, sysMap, true);
        }
      });
    });

    return lineEls;
  }

  // ── ACTIVATE LINE ─────────────────────────────────────────────────────────

  function activateLine(key, flow, lineEls, nodeEls, descEl, sysMap, locked) {
    Object.entries(lineEls).forEach(([k, { path, glow, text }]) => {
      const active = k === key;
      path.style.opacity = active ? "1" : "0.1";
      path.style.animation = active ? "none" : "";
      glow.setAttribute("opacity", active ? "0.4" : "0");
      text.setAttribute("opacity", active ? "0.9" : "0");
    });

    Object.entries(nodeEls).forEach(([id, el]) => {
      el.classList.remove("is-active", "is-dimmed", "is-hover");
      const connected = id === flow.from || id === flow.to;
      el.classList.toggle("is-active", connected);
      el.classList.toggle("is-dimmed", !connected);
    });

    showFlowDesc(descEl, flow, sysMap, locked);
  }

  // ── HOVER NODE ────────────────────────────────────────────────────────────

  function hoverNode(id, nodeEls, lineEls, descEl, sysMap) {
    const connectedFlows = flows.filter((f) => f.from === id || f.to === id);
    const connectedIds = new Set(connectedFlows.flatMap((f) => [f.from, f.to]));

    Object.entries(nodeEls).forEach(([nid, el]) => {
      el.classList.remove("is-active", "is-dimmed", "is-hover");
      if (nid === id) {
        el.classList.add("is-hover");
      } else if (connectedIds.has(nid)) {
        el.classList.add("is-active");
      } else {
        el.classList.add("is-dimmed");
      }
    });

    Object.entries(lineEls).forEach(([key, { path, glow, text }]) => {
      const active = connectedFlows.some((f) => `${f.from}→${f.to}` === key);
      path.style.opacity = active ? "1" : "0.1";
      path.style.animation = active ? "none" : "";
      glow.setAttribute("opacity", active ? "0.3" : "0");
      text.setAttribute("opacity", active ? "0.8" : "0");
    });

    showNodeDesc(descEl, id, connectedFlows, sysMap);
  }

  // ── DESC: FLOW ─────────────────────────────────────────────────────────────

  function showFlowDesc(descEl, flow, sysMap, locked) {
    const fromSys = sysMap[flow.from];
    const toSys = sysMap[flow.to];

    descEl.innerHTML = "";
    const content = document.createElement("div");
    content.className = "flow-diagram__desc-content";
    content.innerHTML = `
      <div class="flow-diagram__desc-route">
        <span class="flow-node__label" style="color:${fromSys.color}">${fromSys.label}</span>
        <span class="flow-node__title" style="color:${fromSys.color}">${fromSys.title}</span>
        <span class="flow-diagram__desc-arrow" style="color:${flow.color}">→</span>
        <span class="flow-node__label" style="color:${toSys.color}">${toSys.label}</span>
        <span class="flow-node__title" style="color:${toSys.color}">${toSys.title}</span>
      </div>
      <div class="flow-diagram__desc-label" style="color:${flow.color}">${flow.label}</div>
      <div class="flow-diagram__desc-body">${flow.description}</div>
      ${locked ? `<div class="flow-diagram__desc-locked">Click again to deselect</div>` : ""}
    `;
    descEl.appendChild(content);
  }

  // ── DESC: NODE ─────────────────────────────────────────────────────────────

  function showNodeDesc(descEl, id, connectedFlows, sysMap) {
    const sys = sysMap[id];

    descEl.innerHTML = "";
    const content = document.createElement("div");
    content.className = "flow-diagram__desc-content";

    const flowList = connectedFlows
      .map((f) => {
        const other = f.from === id ? sysMap[f.to] : sysMap[f.from];
        const dir = f.from === id ? "→" : "←";
        return `
        <div class="flow-diagram__desc-connection">
          <span class="flow-diagram__desc-arrow" style="color:${f.color}">${dir}</span>
          <span class="flow-node__title" style="color:${other.color}">${other.title}</span>
          <span class="flow-diagram__desc-tag" style="color:${f.color}">${f.label}</span>
        </div>
      `;
      })
      .join("");

    content.innerHTML = `
      <div class="flow-diagram__desc-route">
        <span class="flow-node__label" style="color:${sys.color}">${sys.label}</span>
        <span class="flow-node__title" style="color:${sys.color}">${sys.title}</span>
      </div>
      <div class="flow-diagram__desc-connections">${flowList}</div>
    `;

    descEl.appendChild(content);
  }

  // ── RESET ─────────────────────────────────────────────────────────────────

  function resetAll(nodeEls, lineEls) {
    Object.values(nodeEls).forEach((el) => {
      el.classList.remove("is-active", "is-dimmed", "is-hover");
    });
    Object.values(lineEls).forEach(({ path, glow, text }) => {
      path.style.opacity = "";
      path.style.animation = "";
      glow.setAttribute("opacity", "0");
      text.setAttribute("opacity", "0.5");
    });
  }

  function showEmpty(descEl) {
    descEl.innerHTML = `
      <div class="flow-diagram__desc-empty">
        <span class="flow-diagram__desc-hint">Hover or click a connection to explore the data flow</span>
      </div>
    `;
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const container = document.getElementById("flow-detail");
    if (!container) return;

    await fetchData();
    build(container);

    window.addEventListener("resize", () => {
      selected = null;
      build(container);
    });
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Flow.init);
