// ── API MAP ───────────────────────────────────────────────────────────────────
// 7 node bubbles connected by curved bezier paths.
// Clicking a bubble locks a floating card. The card has a "Discover flow →"
// button that scrolls to #section-detail and emits a custom event so
// flow.js can highlight the relevant connections.

const ApiMap = (() => {
  // ── STATE ──────────────────────────────────────────────────────────────────

  let nodes = [];
  let connections = [];
  let lockedId = null;
  let activeId = null;

  // ── CONFIG ─────────────────────────────────────────────────────────────────

  const PARENT_R = 52;
  const CARD_W = 320;
  const CARD_MARGIN = 16;
  const LINE_ARC = 22;
  const CONN_ARC = 35;
  const BOW_MIN = 30;
  const BOW_MAX = 110;

  // ── DATA ───────────────────────────────────────────────────────────────────

  async function fetchData() {
    const res = await fetch("./data/api.json");
    const data = await res.json();
    nodes = data.nodes;
    connections = data.connections;
  }

  // ── UTILS ──────────────────────────────────────────────────────────────────

  function resolveColor(color) {
    if (!color.startsWith("var(")) return color;
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

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function edgePoint(cx, cy, angle) {
    return {
      x: cx + Math.cos(angle) * PARENT_R,
      y: cy + Math.sin(angle) * PARENT_R,
    };
  }

  function bezierPath(ax, ay, bx, by, exitAngle, entryAngle, bow) {
    const start = edgePoint(ax, ay, exitAngle);
    const end = edgePoint(bx, by, entryAngle);
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -(dy / len);
    const py = dx / len;
    const cx = mx + px * bow;
    const cy = my + py * bow;
    return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
  }

  // ── DETAIL ─────────────────────────────────────────────────────────────────

  function openDetail() {
    const card = document.getElementById("detail-card");
    const btn = document.getElementById("back-btn");

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
      document.getElementById("api").scrollIntoView({ behavior: "smooth" });
    }, 300);
  }

  // ── DRAW ───────────────────────────────────────────────────────────────────

  function draw(mapWrap, svgEl, card) {
    svgEl.innerHTML = "";
    mapWrap.querySelectorAll(".api-bubble").forEach((el) => el.remove());
    lockedId = null;
    activeId = null;
    hideCard(card);

    const mapW = mapWrap.clientWidth;
    const mapH = mapWrap.clientHeight;
    if (!mapW || !mapH) return;

    const nodeMap = {};
    nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });

    const parentEls = {};
    const connPaths = [];

    // ── PARENT BUBBLES ───────────────────────────────────────────────────────

    nodes.forEach((node) => {
      const cx = node.x * mapW;
      const cy = node.y * mapH;
      const color = resolveColor(node.color);

      const el = document.createElement("div");
      el.className = "api-bubble api-bubble--parent";
      el.dataset.id = node.id;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.setProperty("--r", `${PARENT_R}px`);
      el.style.setProperty("--accent", color);

      const epCount = connections
        .filter((c) => c.from === node.id || c.to === node.id)
        .reduce((sum, c) => sum + c.endpoints.length, 0);

      el.innerHTML = `
        <div class="api-bubble__label" style="color:${color}">${node.label}</div>
        <div class="api-bubble__title">${node.title}</div>
        ${epCount ? `<div class="api-bubble__count" style="color:${color}">${epCount}</div>` : ""}
      `;

      mapWrap.appendChild(el);
      parentEls[node.id] = { el, cx, cy, color, node };
    });

    // ── CONNECTION PATHS ─────────────────────────────────────────────────────

    const outgoing = {};
    connections.forEach((conn) => {
      if (!outgoing[conn.from]) outgoing[conn.from] = [];
      outgoing[conn.from].push(conn);
    });

    Object.entries(outgoing).forEach(([fromId, conns]) => {
      const from = parentEls[fromId];
      if (!from) return;

      const totalLines = conns.reduce((s, c) => s + c.endpoints.length, 0);
      let globalIdx = 0;

      conns.forEach((conn, connIdx) => {
        const to = parentEls[conn.to];
        if (!to) return;

        const color = resolveColor(conn.color);
        const baseAngle = Math.atan2(to.cy - from.cy, to.cx - from.cx);
        const connOffset = toRad(CONN_ARC) * (connIdx - (conns.length - 1) / 2);
        const epCount = conn.endpoints.length;
        const paths = [];

        conn.endpoints.forEach((ep, epIdx) => {
          const lineSpread =
            epCount > 1 ? toRad(LINE_ARC) * (epIdx - (epCount - 1) / 2) : 0;

          const exitAngle = baseAngle + connOffset + lineSpread;
          const entryAngle = baseAngle + Math.PI - connOffset - lineSpread;
          const bowMag =
            BOW_MIN +
            (BOW_MAX - BOW_MIN) * (globalIdx / Math.max(totalLines - 1, 1));
          const bowSign = globalIdx % 2 === 0 ? 1 : -1;
          const bow = bowMag * bowSign;

          globalIdx++;

          const d = bezierPath(
            from.cx,
            from.cy,
            to.cx,
            to.cy,
            exitAngle,
            entryAngle,
            bow,
          );

          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          path.setAttribute("d", d);
          path.setAttribute("stroke", color);
          path.setAttribute("stroke-width", "1.5");
          path.setAttribute("fill", "none");
          path.setAttribute("opacity", "0.22");
          path.style.transition = "opacity 0.2s";
          svgEl.appendChild(path);
          paths.push(path);
        });

        connPaths.push({ paths, conn, fromId: conn.from, toId: conn.to });
      });
    });

    // ── INTERACTIONS ─────────────────────────────────────────────────────────

    nodes.forEach((node) => {
      const { el } = parentEls[node.id];

      el.addEventListener("mouseenter", () => {
        if (lockedId) return;
        activeId = node.id;
        highlight(node.id, parentEls, connPaths);
      });

      el.addEventListener("mouseleave", () => {
        if (lockedId) return;
        activeId = null;
        resetAll(parentEls, connPaths);
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (lockedId === node.id) {
          lockedId = null;
          hideCard(card);
          activeId
            ? highlight(activeId, parentEls, connPaths)
            : resetAll(parentEls, connPaths);
        } else {
          lockedId = node.id;
          highlight(node.id, parentEls, connPaths);
          showCard(
            card,
            node,
            parentEls[node.id],
            mapWrap,
            parentEls,
            connPaths,
          );
        }
      });
    });

    mapWrap.addEventListener("click", () => {
      if (!lockedId) return;
      lockedId = null;
      hideCard(card);
      resetAll(parentEls, connPaths);
    });
  }

  // ── BUILD ──────────────────────────────────────────────────────────────────

  function build(container) {
    container.innerHTML = "";

    const mapWrap = document.createElement("div");
    mapWrap.className = "api-map";

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.classList.add("api-map__svg");
    mapWrap.appendChild(svgEl);

    const card = document.createElement("div");
    card.className = "api-card";
    mapWrap.appendChild(card);

    container.appendChild(mapWrap);

    // Back button
    const btn = document.getElementById("back-btn");
    if (btn) btn.addEventListener("click", closeDetail);

    let hasDrawn = false;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      if (!hasDrawn) {
        hasDrawn = true;
        draw(mapWrap, svgEl, card);
      } else {
        clearTimeout(ro._timer);
        ro._timer = setTimeout(() => draw(mapWrap, svgEl, card), 150);
      }
    });
    ro.observe(mapWrap);
  }

  // ── HIGHLIGHT ──────────────────────────────────────────────────────────────

  function highlight(id, parentEls, connPaths) {
    const activePaths = new Set();
    const connectedIds = new Set();

    connPaths.forEach(({ paths, fromId, toId }) => {
      if (fromId === id || toId === id) {
        paths.forEach((p) => activePaths.add(p));
        connectedIds.add(fromId === id ? toId : fromId);
      }
    });

    const allPaths = new Set();
    connPaths.forEach(({ paths }) => paths.forEach((p) => allPaths.add(p)));

    const totalActive = activePaths.size;
    const STAGGER_TOTAL = 0.13; // fixed window — same as 3 lines at old speed
    let activeIdx = 0;
    allPaths.forEach((p) => {
      if (activePaths.has(p)) {
        const delay =
          totalActive > 1 ? (STAGGER_TOTAL / (totalActive - 1)) * activeIdx : 0;
        p.style.transitionDelay = `${delay.toFixed(3)}s`;
        p.setAttribute("opacity", "0.9");
        activeIdx++;
      } else {
        p.style.transitionDelay = "0s";
        p.setAttribute("opacity", "0.03");
      }
    });

    Object.entries(parentEls).forEach(([nid, { el }]) => {
      el.classList.remove("is-active", "is-dimmed", "is-connected");
      if (nid === id) el.classList.add("is-active");
      else if (connectedIds.has(nid)) el.classList.add("is-connected");
      else el.classList.add("is-dimmed");
    });
  }

  // ── RESET ──────────────────────────────────────────────────────────────────

  function resetAll(parentEls, connPaths) {
    Object.values(parentEls).forEach(({ el }) => {
      el.classList.remove("is-active", "is-dimmed", "is-connected");
    });
    const seen = new Set();
    connPaths.forEach(({ paths }) => {
      paths.forEach((p) => {
        if (seen.has(p)) return;
        seen.add(p);
        p.style.transitionDelay = "0s";
        p.setAttribute("opacity", "0.22");
      });
    });
  }

  // ── FLOATING CARD ──────────────────────────────────────────────────────────

  function showCard(card, node, parentData, mapWrap, parentEls, connPaths) {
    const { cx, cy } = parentData;
    const mapW = mapWrap.clientWidth;
    const mapH = mapWrap.clientHeight;

    card.innerHTML = "";
    card.appendChild(buildCardContent(node));
    card.classList.add("is-visible");

    const closeBtn = card.querySelector(".api-card__close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        lockedId = null;
        hideCard(card);
        resetAll(parentEls, connPaths);
      });
    }

    const discoverBtn = card.querySelector(".api-card__discover");
    if (discoverBtn) {
      discoverBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("api:discover-flow", { detail: { nodeId: node.id } }),
        );
        openDetail();
      });
    }

    requestAnimationFrame(() => {
      const cardH = card.offsetHeight;
      let left = cx + PARENT_R + 16;
      let top = cy - cardH / 2;
      if (left + CARD_W > mapW - CARD_MARGIN)
        left = cx - PARENT_R - 16 - CARD_W;
      top = Math.max(CARD_MARGIN, Math.min(top, mapH - cardH - CARD_MARGIN));
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    });
  }

  function hideCard(card) {
    card.classList.remove("is-visible");
    card.innerHTML = "";
  }

  function buildCardContent(node) {
    const frag = document.createDocumentFragment();
    const color = resolveColor(node.color);

    const header = document.createElement("div");
    header.className = "api-card__header";
    header.innerHTML = `
      <span class="api-card__label" style="color:${color}">${node.label}</span>
      <span class="api-card__title">${node.title}</span>
      <button class="api-card__close" aria-label="Close">✕</button>
    `;
    frag.appendChild(header);

    const nodeConns = connections.filter(
      (c) => c.from === node.id || c.to === node.id,
    );

    if (!nodeConns.length) {
      const empty = document.createElement("div");
      empty.className = "api-card__empty";
      empty.textContent = "No connections defined";
      frag.appendChild(empty);
    } else {
      const list = document.createElement("div");
      list.className = "api-card__list";

      nodeConns.forEach((conn) => {
        const isFrom = conn.from === node.id;
        const otherId = isFrom ? conn.to : conn.from;
        const other = nodes.find((n) => n.id === otherId);
        const connColor = resolveColor(conn.color);

        const groupHeader = document.createElement("div");
        groupHeader.className = "api-card__group-header";
        groupHeader.innerHTML = `
          <span class="api-card__arrow" style="color:${connColor}">${isFrom ? "→" : "←"}</span>
          <span class="api-card__other" style="color:${connColor}">${other ? other.title : otherId}</span>
          <span class="api-card__conn-label">${conn.label}</span>
        `;
        list.appendChild(groupHeader);

        conn.endpoints.forEach((ep) => {
          const row = document.createElement("div");
          row.className = "api-card__endpoint";
          row.innerHTML = `
            <span class="api-card__method" style="color:${methodColor(ep.method)}">${ep.method}</span>
            <span class="api-card__path">${ep.path}</span>
            <span class="api-card__auth">${ep.auth}</span>
            <span class="api-card__trigger">${ep.trigger}</span>
          `;
          list.appendChild(row);
        });
      });

      frag.appendChild(list);
    }

    const footer = document.createElement("div");
    footer.className = "api-card__footer";
    footer.innerHTML = `
      <button class="api-card__discover">
        Discover flow
        <span class="api-card__discover-icon">↓</span>
      </button>
    `;
    frag.appendChild(footer);

    return frag;
  }

  // ── INIT ──────────────────────────────────────────────────────────────────

  async function init() {
    const container = document.getElementById("api-detail");
    if (!container) return;
    await fetchData();
    build(container);
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", ApiMap.init);
