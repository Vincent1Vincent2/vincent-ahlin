// ── FLOW ──────────────────────────────────────────────────────────────────────
// Context-driven flow diagram. Reads from api.json.
// Listens for "api:discover-flow" from api.js to set which node to focus.
// On arrival: focal node centered, connected nodes in a ring, first connection
// auto-selected and described. Prev/Next cycles through all connections.
// Back button returns to #api section.

const Flow = (() => {
  // ── STATE ──────────────────────────────────────────────────────────────────

  let allNodes = [];
  let allConnections = [];
  let systemMeta = {};

  let contextNodeId = null;
  let activeConnIdx = 0;
  let activeConns = [];
  let lineEls = {};
  let nodeEls = {};
  let descEl = null;
  let mapWrap = null;
  let svgEl = null;

  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("./data/api.json");
    const data = await res.json();
    allNodes = data.nodes;
    allConnections = data.connections;
    allNodes.forEach((n) => {
      systemMeta[n.id] = n;
    });
  }

  // ── UTILS ──────────────────────────────────────────────────────────────────

  function resolveColor(color) {
    if (!color || !color.startsWith("var(")) return color || "#888";
    const name = color.slice(4, -1);
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || "#888"
    );
  }

  function methodColor(method) {
    switch (method) {
      case "GET":
        return "hsl(150, 60%, 52%)";
      case "POST":
        return "hsl(210, 80%, 62%)";
      case "PUT":
        return "hsl(45,  85%, 58%)";
      case "DELETE":
        return "hsl(0,   70%, 58%)";
      case "SQL":
        return "hsl(280, 60%, 65%)";
      default:
        return "hsl(0, 0%, 60%)";
    }
  }

  // ── CONTEXT ────────────────────────────────────────────────────────────────

  function getContext(nodeId) {
    const conns = allConnections.filter(
      (c) => c.from === nodeId || c.to === nodeId,
    );
    const nodeIds = new Set([nodeId]);
    conns.forEach((c) => {
      nodeIds.add(c.from);
      nodeIds.add(c.to);
    });
    const nodes = allNodes.filter((n) => nodeIds.has(n.id));
    return { conns, nodes };
  }

  // ── LAYOUT ─────────────────────────────────────────────────────────────────

  function layoutNodes(nodes, focalId, w, h) {
    const positions = {};
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.32;
    const others = nodes.filter((n) => n.id !== focalId);

    positions[focalId] = { x: cx, y: cy };

    others.forEach((n, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / others.length;
      positions[n.id] = {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });

    return positions;
  }

  // ── BUILD ──────────────────────────────────────────────────────────────────

  function build(container) {
    container.innerHTML = "";

    const layout = document.createElement("div");
    layout.className = "flow-diagram";

    // Map
    mapWrap = document.createElement("div");
    mapWrap.className = "flow-diagram__map flow-diagram__map--dynamic";
    svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.classList.add("flow-diagram__svg");
    mapWrap.appendChild(svgEl);
    layout.appendChild(mapWrap);

    // Panel
    const panel = document.createElement("div");
    panel.className = "flow-diagram__panel";
    descEl = document.createElement("div");
    descEl.className = "flow-diagram__desc";
    panel.appendChild(descEl);
    layout.appendChild(panel);
    container.appendChild(layout);

    if (!contextNodeId) {
      showPrompt();
      return;
    }

    const { conns, nodes } = getContext(contextNodeId);
    activeConns = conns;
    activeConnIdx = 0;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      drawContext(nodes, conns, width, height);
    });
    ro.observe(mapWrap);
  }

  // ── DRAW CONTEXT ───────────────────────────────────────────────────────────

  function drawContext(nodes, conns, w, h) {
    svgEl.innerHTML = "";
    mapWrap.querySelectorAll(".flow-node").forEach((el) => el.remove());
    nodeEls = {};
    lineEls = {};

    const positions = layoutNodes(nodes, contextNodeId, w, h);

    // ── NODES ────────────────────────────────────────────────────────────────

    nodes.forEach((node) => {
      const pos = positions[node.id];
      const color = resolveColor(node.color);
      const isFocal = node.id === contextNodeId;

      const el = document.createElement("div");
      el.className = `flow-node${isFocal ? " flow-node--focal" : ""}`;
      el.dataset.id = node.id;
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.setProperty("--accent", color);

      el.innerHTML = `
        <div class="flow-node__inner">
          <span class="flow-node__label" style="color:${color}">${node.label}</span>
          <span class="flow-node__title">${node.title}</span>
        </div>
      `;

      mapWrap.appendChild(el);
      nodeEls[node.id] = el;
    });

    // ── LINES ────────────────────────────────────────────────────────────────

    conns.forEach((conn, i) => {
      const fromPos = positions[conn.from];
      const toPos = positions[conn.to];
      if (!fromPos || !toPos) return;

      const color = resolveColor(conn.color);
      const bow = 45 * (i % 2 === 0 ? 1 : -1);
      const mx = (fromPos.x + toPos.x) / 2;
      const my = (fromPos.y + toPos.y) / 2;
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cpx = mx - (dy / len) * bow;
      const cpy = my + (dx / len) * bow;

      const d = `M ${fromPos.x} ${fromPos.y} Q ${cpx} ${cpy} ${toPos.x} ${toPos.y}`;

      // Glow
      const glow = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      glow.setAttribute("d", d);
      glow.setAttribute("stroke", color);
      glow.setAttribute("stroke-width", "6");
      glow.setAttribute("fill", "none");
      glow.setAttribute("opacity", "0");
      glow.style.filter = "blur(4px)";
      glow.style.transition = "opacity 0.2s";
      glow.style.pointerEvents = "none";
      svgEl.appendChild(glow);

      // Line
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "0.2");
      path.style.transition = "opacity 0.2s";
      path.style.pointerEvents = "none";
      svgEl.appendChild(path);

      // Hit
      const hit = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      hit.setAttribute("d", d);
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "40");
      hit.setAttribute("fill", "none");
      hit.style.cursor = "pointer";
      svgEl.appendChild(hit);

      const key = `${conn.from}→${conn.to}`;
      lineEls[key] = { path, glow, hit, conn };

      hit.addEventListener("click", () => {
        const idx = activeConns.indexOf(conn);
        if (idx !== -1) selectConn(idx);
      });
    });

    // Auto-select first connection
    if (activeConns.length) selectConn(0);
  }

  // ── SELECT CONNECTION ──────────────────────────────────────────────────────

  function selectConn(idx) {
    activeConnIdx = idx;
    const conn = activeConns[idx];
    if (!conn) return;

    const key = `${conn.from}→${conn.to}`;

    // Highlight lines
    Object.entries(lineEls).forEach(([k, { path, glow }]) => {
      const active = k === key;
      path.setAttribute("opacity", active ? "1" : "0.06");
      glow.setAttribute("opacity", active ? "0.4" : "0");
    });

    // Highlight nodes
    Object.entries(nodeEls).forEach(([id, el]) => {
      el.classList.remove("is-active", "is-dimmed");
      const connected = id === conn.from || id === conn.to;
      el.classList.toggle("is-active", connected);
      el.classList.toggle("is-dimmed", !connected);
    });

    // Show description
    showConn(idx);
  }

  // ── SHOW DESCRIPTION ───────────────────────────────────────────────────────

  function showConn(idx) {
    if (!descEl) return;
    activeConnIdx = idx;
    const conn = activeConns[idx];
    if (!conn) return;

    const fromNode = systemMeta[conn.from];
    const toNode = systemMeta[conn.to];
    const color = resolveColor(conn.color);
    const total = activeConns.length;

    descEl.innerHTML = "";

    // Wrapper: scrollable content + sticky nav
    const wrapper = document.createElement("div");
    wrapper.className = "flow-diagram__desc-wrapper";

    const content = document.createElement("div");
    content.className = "flow-diagram__desc-content";

    // Route header
    const route = document.createElement("div");
    route.className = "flow-diagram__desc-route";
    route.innerHTML = `
      <span class="flow-node__label" style="color:${resolveColor(fromNode?.color)}">${fromNode?.label || conn.from}</span>
      <span class="flow-node__title" style="color:${resolveColor(fromNode?.color)}">${fromNode?.title || conn.from}</span>
      <span class="flow-diagram__desc-arrow" style="color:${color}">→</span>
      <span class="flow-node__label" style="color:${resolveColor(toNode?.color)}">${toNode?.label || conn.to}</span>
      <span class="flow-node__title" style="color:${resolveColor(toNode?.color)}">${toNode?.title || conn.to}</span>
    `;
    content.appendChild(route);

    // Connection label
    const label = document.createElement("div");
    label.className = "flow-diagram__desc-label";
    label.style.color = color;
    label.textContent = conn.label;
    content.appendChild(label);

    // Description
    if (conn.description) {
      const body = document.createElement("div");
      body.className = "flow-diagram__desc-body";
      body.textContent = conn.description;
      content.appendChild(body);
    }

    // Endpoints
    if (conn.endpoints?.length) {
      const eps = document.createElement("div");
      eps.className = "flow-diagram__endpoints";

      const epsLabel = document.createElement("div");
      epsLabel.className = "flow-diagram__endpoints-label";
      epsLabel.textContent = "Endpoints";
      eps.appendChild(epsLabel);

      conn.endpoints.forEach((ep) => {
        const row = document.createElement("div");
        row.className = "flow-diagram__endpoint";
        row.innerHTML = `
          <span class="flow-diagram__endpoint-method" style="color:${methodColor(ep.method)}">${ep.method}</span>
          <span class="flow-diagram__endpoint-path">${ep.path}</span>
          <span class="flow-diagram__endpoint-meta">${ep.auth} · ${ep.trigger}</span>
        `;
        eps.appendChild(row);
      });

      content.appendChild(eps);
    }

    wrapper.appendChild(content);

    // Prev / Next nav — outside scroll, always visible
    if (total > 1) {
      const nav = document.createElement("div");
      nav.className = "flow-diagram__nav";

      const prevBtn = document.createElement("button");
      prevBtn.className = "flow-diagram__nav-btn";
      prevBtn.textContent = "← Prev";
      prevBtn.disabled = idx === 0;
      prevBtn.addEventListener("click", () =>
        selectConn((activeConnIdx - 1 + total) % total),
      );

      const counter = document.createElement("span");
      counter.className = "flow-diagram__nav-count";
      counter.textContent = `${idx + 1} / ${total}`;

      const nextBtn = document.createElement("button");
      nextBtn.className = "flow-diagram__nav-btn";
      nextBtn.textContent = "Next →";
      nextBtn.disabled = idx === total - 1;
      nextBtn.addEventListener("click", () =>
        selectConn((activeConnIdx + 1) % total),
      );

      nav.appendChild(prevBtn);
      nav.appendChild(counter);
      nav.appendChild(nextBtn);
      wrapper.appendChild(nav);
    }

    descEl.appendChild(wrapper);
  }

  // ── PROMPT (no context yet) ────────────────────────────────────────────────

  function showPrompt() {
    if (!descEl) return;
    descEl.innerHTML = `
      <div class="flow-diagram__desc-empty">
        <span class="flow-diagram__desc-hint">Select a system from the API map above to explore its connections</span>
      </div>
    `;
  }

  // ── EVENT LISTENER ─────────────────────────────────────────────────────────

  function listenForContext() {
    window.addEventListener("api:discover-flow", (e) => {
      contextNodeId = e.detail.nodeId;
      activeConnIdx = 0;
      const container = document.getElementById("detail-card");
      if (container) build(container);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const container = document.getElementById("detail-card");
    if (!container) return;

    await fetchData();
    build(container);
    listenForContext();

    window.addEventListener("resize", () => {
      const c = document.getElementById("detail-card");
      if (c) build(c);
    });
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Flow.init);
