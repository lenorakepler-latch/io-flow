/* engine/regions.js — visual regions (grouping WITHOUT containment).
 *
 * A `~region` in the YAML lists members that stay top-level (parent unchanged),
 * so the layout engine places them by their real connectivity — no bounding box
 * confining them. This module draws each region *afterwards* as a translucent
 * backdrop around wherever its members landed, read straight from `state.pos`.
 *
 * Purely presentational: it adds nothing to the layout and holds no state. It is
 * re-run on every edge refresh (edges.js renderAll / updateFor) so backdrops
 * track drags. MVP shape is a padded rounded rectangle; a convex hull would read
 * as less box-like and is the obvious upgrade.
 *
 * Caveat: members are laid out freely, so a stray member stretches the backdrop
 * and it may overlap a neighbouring region. Soft cohesion (pulling a region's
 * members loosely together in the layout) is the planned follow-up — see
 * LAYOUT.md.
 */
window.IOFlow = window.IOFlow || {};
(function (IOF) {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const PAD = 18; // breathing room around the member bounding box
  const LABEL_H = 18; // strip above the box for the region label

  function mk(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, String(attrs[k]));
    return el;
  }

  // Bounding box of a region's members in canvas coordinates. Members are
  // top-level (no parent), so state.pos already holds absolute positions.
  function memberBox(state, members) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let any = false;
    (members || []).forEach((id) => {
      const p = state.pos[id];
      if (!p) return;
      any = true;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w);
      maxY = Math.max(maxY, p.y + p.h);
    });
    return any ? { minX, minY, maxX, maxY } : null;
  }

  function renderAll(state) {
    const regions = (state.graph && state.graph.regions) || [];
    // One <g class="regions"> kept as the first child of the edge <svg>, so
    // backdrops sit behind both edges and (HTML) nodes. edges.renderAll only
    // clears path.edge, so this group survives its passes.
    let layer = state.svg.querySelector("g.regions");
    if (!layer) {
      layer = mk("g", { class: "regions" });
      state.svg.insertBefore(layer, state.svg.firstChild);
    }
    if (!regions.length) {
      layer.textContent = "";
      return;
    }
    layer.textContent = "";
    regions.forEach((r) => {
      const box = memberBox(state, r.members);
      if (!box) return;
      const x = box.minX - PAD;
      const y = box.minY - PAD - LABEL_H;
      const w = box.maxX - box.minX + 2 * PAD;
      const h = box.maxY - box.minY + 2 * PAD + LABEL_H;
      const g = mk("g", {
        class: "region" + (r.class ? " region--" + IOF.esc(r.class) : ""),
        "data-region": r.id,
      });
      g.appendChild(mk("rect", { class: "region__box", x, y, width: w, height: h, rx: 14, ry: 14 }));
      const label = mk("text", { class: "region__label", x: x + 14, y: y + LABEL_H - 3 });
      label.textContent = r.label || r.id;
      g.appendChild(label);
      layer.appendChild(g);
    });
  }

  IOF.regions = { renderAll };
})(window.IOFlow);
