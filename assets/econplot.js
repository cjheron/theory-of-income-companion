/* EconPlot — tiny dependency-free SVG plotting for economics diagrams.
   Shared component for Theory of Income companion lessons.

   const P = EconPlot.create('#fig1', {
     x: [0, 1], y: [0, 1],            // data domain
     width: 520, height: 380,         // SVG viewBox size (scales responsively)
     xlabel: 'c_y', ylabel: 'c_o',    // mini-markup: a_b, a_{bc}, a^b, a^{bc}
     xticks: 5, yticks: 5,            // number of ticks, or an explicit array
     grid: true, equal: false,         // equal: same px per unit on both axes
     frame: false                      // close the plot box (Edgeworth boxes)
   });

   Drawing (all return the created SVG element; coordinates are data units):
     P.fn(f, opts)                    y = f(x);  opts.domain=[a,b], opts.n
     P.param(fx, fy, [t0,t1], opts)   parametric curve
     P.path(points, opts)             [[x,y], …]; opts.close, opts.fill
     P.contour(F, level, opts)        {(x,y): F(x,y)=level} via marching squares
     P.region(test, opts)             shade {(x,y): test(x,y)} (grid of cells)
     P.segment(x1,y1,x2,y2, opts)     P.hline(y,opts)  P.vline(x,opts)
     P.arrow(x1,y1,x2,y2, opts)
     P.point(x, y, opts)              opts.r, opts.label, opts.hollow
     P.text(x, y, str, opts)          opts.anchor ('start'|'middle'|'end'), opts.dx, opts.dy
     P.drag(x, y, onMove, opts)       draggable handle; onMove(x,y) -> optional [x,y] clamp;
                                      returns handle h with h.move(x,y)
     P.clear()                        wipe the data layer (axes stay)
   Common opts: color, width (stroke px), dash ('6 4'), opacity, fill, label,
                labelAt (x or t where the direct label sits), labelDx, labelDy.

   Colours: EconPlot.C = {blue, orange, aqua, violet, ink, muted, grid}

   Sliders:
     const S = EconPlot.sliders('#ctrl1', [
       {id:'alpha', label:'α', min:0.05, max:0.95, step:0.01, value:0.3, fmt: v => v.toFixed(2)}
     ], values => redraw(values));     // calls redraw once immediately
     S.set('alpha', 0.4);  S.values
*/
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', violet: '#4a3aa7',
    ink: '#1a1a1a', muted: '#8c8a84', grid: '#e6e3dc', accent: '#1a3a5c',
    fillBlue: 'rgba(42,120,214,0.13)', fillOrange: 'rgba(235,104,52,0.13)',
    fillAqua: 'rgba(27,175,122,0.14)', fillViolet: 'rgba(74,58,167,0.12)', fillGray: 'rgba(120,120,120,0.12)'
  };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // mini-markup: "c_y", "x^{1}_2", "K^*", "p_{t+1}" -> tspans
  function setRich(textEl, str) {
    str = String(str);
    textEl.textContent = '';
    let i = 0, buf = '';
    function flush(cls) {
      if (!buf) return;
      const t = el('tspan', {}, textEl); t.textContent = buf; buf = '';
    }
    while (i < str.length) {
      const ch = str[i];
      if ((ch === '_' || ch === '^') && i + 1 < str.length) {
        flush();
        let content;
        if (str[i + 1] === '{') {
          const j = str.indexOf('}', i + 2);
          content = str.slice(i + 2, j < 0 ? str.length : j);
          i = j < 0 ? str.length : j + 1;
        } else { content = str[i + 1]; i += 2; }
        const sub = ch === '_';
        const t = el('tspan', { 'font-size': '72%', dy: sub ? '0.35em' : '-0.55em' }, textEl);
        t.textContent = content;
        // reset baseline
        const r = el('tspan', { dy: sub ? '-0.35em' : '0.55em' }, textEl); r.textContent = '​';
      } else { buf += ch; i++; }
    }
    flush();
  }

  function niceTicks(a, b, n) {
    const span = b - a;
    if (span <= 0) return [a];
    const raw = span / Math.max(1, n);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const steps = [1, 2, 2.5, 5, 10];
    let step = mag;
    for (const s of steps) { if (s * mag >= raw) { step = s * mag; break; } }
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function fmtTick(v) {
    if (Math.abs(v) < 1e-12) return '0';
    const s = Math.abs(v) >= 100 ? v.toFixed(0) : +v.toPrecision(3);
    return String(s);
  }

  function create(target, o) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    o = Object.assign({ x: [0, 1], y: [0, 1], width: 520, height: 380, grid: true,
                        xticks: 5, yticks: 5, margin: { l: 52, r: 18, t: 16, b: 44 } }, o || {});
    const m = Object.assign({ l: 52, r: 18, t: 16, b: 44 }, o.margin);
    let W = o.width, H = o.height;
    let pw = W - m.l - m.r, ph = H - m.t - m.b;
    let [x0, x1] = o.x, [y0, y1] = o.y;
    if (o.equal) {
      const sx = pw / (x1 - x0), sy = ph / (y1 - y0), s = Math.min(sx, sy);
      pw = s * (x1 - x0); ph = s * (y1 - y0);
      W = pw + m.l + m.r; H = ph + m.t + m.b;
    }
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }, host);
    if (o.title) { const t = el('title', {}, svg); t.textContent = o.title; }
    const X = v => m.l + (v - x0) / (x1 - x0) * pw;
    const Y = v => m.t + ph - (v - y0) / (y1 - y0) * ph;
    const invX = px => x0 + (px - m.l) / pw * (x1 - x0);
    const invY = py => y0 + (m.t + ph - py) / ph * (y1 - y0);

    const clipId = 'epclip' + Math.random().toString(36).slice(2, 8);
    const defs = el('defs', {}, svg);
    const cp = el('clipPath', { id: clipId }, defs);
    el('rect', { x: m.l, y: m.t, width: pw, height: ph }, cp);
    const mk = el('marker', { id: clipId + 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'context-stroke' }, mk);

    const gGrid = el('g', { class: 'ep-grid' }, svg);
    const gAxis = el('g', { class: 'ep-axis' }, svg);
    const gData = el('g', { 'clip-path': `url(#${clipId})` }, svg);
    const gTop = el('g', {}, svg); // labels & handles (unclipped)

    const xt = Array.isArray(o.xticks) ? o.xticks : niceTicks(x0, x1, o.xticks);
    const yt = Array.isArray(o.yticks) ? o.yticks : niceTicks(y0, y1, o.yticks);
    xt.forEach(v => {
      if (o.grid) el('line', { x1: X(v), x2: X(v), y1: m.t, y2: m.t + ph }, gGrid);
      el('line', { x1: X(v), x2: X(v), y1: m.t + ph, y2: m.t + ph + 4 }, gAxis);
      const t = el('text', { x: X(v), y: m.t + ph + 16, 'text-anchor': 'middle', class: 'ep-tick' }, gAxis);
      t.textContent = o.xtickfmt ? o.xtickfmt(v) : fmtTick(v);
    });
    yt.forEach(v => {
      if (o.grid) el('line', { y1: Y(v), y2: Y(v), x1: m.l, x2: m.l + pw }, gGrid);
      el('line', { y1: Y(v), y2: Y(v), x1: m.l - 4, x2: m.l }, gAxis);
      const t = el('text', { x: m.l - 7, y: Y(v) + 4, 'text-anchor': 'end', class: 'ep-tick' }, gAxis);
      t.textContent = o.ytickfmt ? o.ytickfmt(v) : fmtTick(v);
    });
    // axes at the frame edges
    el('path', { d: o.frame ? `M${m.l},${m.t} V${m.t + ph} H${m.l + pw} V${m.t} Z` : `M${m.l},${m.t} V${m.t + ph} H${m.l + pw}`, fill: 'none' }, gAxis);
    // zero lines if inside domain
    if (o.zeroLines !== false) {
      if (y0 < 0 && y1 > 0) el('line', { x1: m.l, x2: m.l + pw, y1: Y(0), y2: Y(0), stroke: '#b9b6ae' }, gAxis);
      if (x0 < 0 && x1 > 0) el('line', { y1: m.t, y2: m.t + ph, x1: X(0), x2: X(0), stroke: '#b9b6ae' }, gAxis);
    }
    if (o.xlabel) {
      const t = el('text', { x: m.l + pw, y: m.t + ph + 36, 'text-anchor': 'end', class: 'ep-label' }, gAxis);
      setRich(t, o.xlabel);
    }
    if (o.ylabel) {
      const t = el('text', { x: m.l - 40, y: m.t + 4, 'text-anchor': 'start', class: 'ep-label',
        transform: `rotate(-90 ${m.l - 40} ${m.t + 4})` }, gAxis);
      t.setAttribute('text-anchor', 'end');
      setRich(t, o.ylabel);
    }

    function stroke(opts, def) {
      return { stroke: opts.color || def || C.ink, 'stroke-width': opts.width || 2,
               'stroke-dasharray': opts.dash, opacity: opts.opacity, fill: opts.fill || 'none',
               'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    }
    function pathD(pts) {
      let d = '', pen = false;
      for (const p of pts) {
        if (!p || !isFinite(p[0]) || !isFinite(p[1])) { pen = false; continue; }
        const px = X(p[0]), py = Y(p[1]);
        // avoid absurd coordinates (asymptotes)
        if (Math.abs(py) > 1e5 || Math.abs(px) > 1e5) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + px.toFixed(2) + ',' + py.toFixed(2);
        pen = true;
      }
      return d;
    }
    function label(xd, yd, str, opts) {
      if (!str) return;
      const t = el('text', { x: X(xd) + (opts.labelDx || 6), y: Y(yd) + (opts.labelDy || -6),
        'text-anchor': opts.labelAnchor || 'start', class: 'ep-text',
        fill: opts.labelColor || C.ink, 'font-style': opts.labelItalic === false ? 'normal' : 'italic' }, gTop);
      setRich(t, str);
      return t;
    }

    const api = {
      svg, X, Y, invX, invY, C,
      domain: { x: [x0, x1], y: [y0, y1] },
      clear() { gData.innerHTML = ''; gTop.innerHTML = ''; },
      path(pts, opts = {}) {
        let d = pathD(pts);
        if (opts.close) d += 'Z';
        const e = el('path', Object.assign({ d }, stroke(opts)), gData);
        if (opts.label) {
          let k = pts.length - 1;
          if (opts.labelAt !== undefined) {
            let best = Infinity;
            pts.forEach((p, i) => { const dd = Math.abs(p[0] - opts.labelAt); if (dd < best && isFinite(p[1])) { best = dd; k = i; } });
          }
          if (pts[k]) label(pts[k][0], pts[k][1], opts.label, Object.assign({ labelColor: C.ink }, opts));
        }
        return e;
      },
      fn(f, opts = {}) {
        const [a, b] = opts.domain || [x0, x1];
        const n = opts.n || 300, pts = [];
        for (let i = 0; i <= n; i++) {
          const x = a + (b - a) * i / n; let y;
          try { y = f(x); } catch (e) { y = NaN; }
          if (opts.ymax !== undefined && y > opts.ymax) y = NaN;
          pts.push([x, y]);
        }
        return api.path(pts, opts);
      },
      param(fx, fy, range, opts = {}) {
        const [t0, t1] = range, n = opts.n || 300, pts = [];
        for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; pts.push([fx(t), fy(t)]); }
        return api.path(pts, opts);
      },
      contour(F, level, opts = {}) {
        const nx = opts.res || 90, ny = opts.res || 90;
        const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;
        const v = [];
        for (let i = 0; i <= nx; i++) {
          v[i] = [];
          for (let j = 0; j <= ny; j++) { let z; try { z = F(x0 + i * dx, y0 + j * dy) - level; } catch (e) { z = NaN; } v[i][j] = z; }
        }
        let d = '';
        const interp = (xa, ya, za, xb, yb, zb) => { const t = za / (za - zb); return [xa + t * (xb - xa), ya + t * (yb - ya)]; };
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const xa = x0 + i * dx, ya = y0 + j * dy, xb = xa + dx, yb = ya + dy;
          const z = [v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1]];
          if (z.some(q => !isFinite(q))) continue;
          const P = [];
          const corners = [[xa, ya], [xb, ya], [xb, yb], [xa, yb]];
          for (let k = 0; k < 4; k++) {
            const a = k, b = (k + 1) % 4;
            if ((z[a] < 0) !== (z[b] < 0)) P.push(interp(corners[a][0], corners[a][1], z[a], corners[b][0], corners[b][1], z[b]));
          }
          for (let k = 0; k + 1 < P.length; k += 2)
            d += `M${X(P[k][0]).toFixed(2)},${Y(P[k][1]).toFixed(2)}L${X(P[k + 1][0]).toFixed(2)},${Y(P[k + 1][1]).toFixed(2)}`;
        }
        const e = el('path', Object.assign({ d }, stroke(opts)), gData);
        if (opts.label && opts.labelPos) label(opts.labelPos[0], opts.labelPos[1], opts.label, opts);
        return e;
      },
      region(test, opts = {}) {
        const n = opts.res || 120, dx = (x1 - x0) / n, dy = (y1 - y0) / n;
        let d = '';
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const x = x0 + (i + 0.5) * dx, y = y0 + (j + 0.5) * dy;
          if (test(x, y)) d += `M${X(x - dx / 2).toFixed(1)},${Y(y + dy / 2).toFixed(1)}h${(pw / n + 0.6).toFixed(2)}v${(ph / n + 0.6).toFixed(2)}h${(-(pw / n + 0.6)).toFixed(2)}z`;
        }
        return el('path', { d, fill: opts.fill || C.fillBlue, stroke: 'none' }, gData);
      },
      segment(xa, ya, xb, yb, opts = {}) {
        const e = el('line', Object.assign({ x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb) }, stroke(opts)), gData);
        if (opts.label) label(xb, yb, opts.label, opts);
        return e;
      },
      hline(y, opts = {}) { return api.segment(x0, y, x1, y, Object.assign({ width: 1.2, color: C.muted, dash: '5 4' }, opts)); },
      vline(x, opts = {}) { return api.segment(x, y0, x, y1, Object.assign({ width: 1.2, color: C.muted, dash: '5 4' }, opts)); },
      arrow(xa, ya, xb, yb, opts = {}) {
        const e = el('line', Object.assign({ x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb),
          'marker-end': `url(#${clipId}arr)` }, stroke(Object.assign({ width: 1.5 }, opts))), opts.unclipped ? gTop : gData);
        return e;
      },
      point(x, y, opts = {}) {
        const e = el('circle', { cx: X(x), cy: Y(y), r: opts.r || 4.5,
          fill: opts.hollow ? 'white' : (opts.color || C.ink), stroke: opts.hollow ? (opts.color || C.ink) : 'white',
          'stroke-width': opts.hollow ? 2 : 1.5 }, gTop);
        if (opts.label) label(x, y, opts.label, opts);
        return e;
      },
      text(x, y, str, opts = {}) {
        const t = el('text', { x: X(x) + (opts.dx || 0), y: Y(y) + (opts.dy || 0), 'text-anchor': opts.anchor || 'start',
          class: 'ep-text', fill: opts.color || C.ink, 'font-size': opts.size, 'font-style': opts.italic ? 'italic' : 'normal',
          'font-family': opts.sans ? 'Helvetica Neue, Helvetica, Arial, sans-serif' : undefined }, gTop);
        setRich(t, str);
        return t;
      },
      drag(x, y, onMove, opts = {}) {
        const g = el('g', { class: 'ep-drag' }, svg);
        const halo = el('circle', { cx: X(x), cy: Y(y), r: 14, fill: 'transparent' }, g);
        const dot = el('circle', { cx: X(x), cy: Y(y), r: opts.r || 7, fill: opts.color || C.accent, stroke: 'white', 'stroke-width': 2 }, g);
        let active = false;
        function toData(evt) {
          const pt = svg.createSVGPoint();
          const src = evt.touches ? evt.touches[0] : evt;
          pt.x = src.clientX; pt.y = src.clientY;
          const q = pt.matrixTransform(svg.getScreenCTM().inverse());
          return [invX(q.x), invY(q.y)];
        }
        function move(evt) {
          if (!active) return;
          evt.preventDefault();
          let [nx, ny] = toData(evt);
          nx = Math.min(x1, Math.max(x0, nx)); ny = Math.min(y1, Math.max(y0, ny));
          const r = onMove(nx, ny);
          if (Array.isArray(r)) { nx = r[0]; ny = r[1]; }
          g.move(nx, ny);
        }
        g.move = function (nx, ny) {
          [halo, dot].forEach(c => { c.setAttribute('cx', X(nx)); c.setAttribute('cy', Y(ny)); });
        };
        g.addEventListener('pointerdown', e => { active = true; g.setPointerCapture && g.setPointerCapture(e.pointerId); });
        g.addEventListener('pointermove', move);
        g.addEventListener('pointerup', () => { active = false; });
        g.addEventListener('pointercancel', () => { active = false; });
        svg.appendChild(g); // keep on top
        return g;
      },
      raiseHandles() { svg.querySelectorAll('.ep-drag').forEach(g => svg.appendChild(g)); }
    };
    return api;
  }

  function sliders(target, specs, onChange) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.classList.add('controls');
    const values = {}, inputs = {}, outs = {};
    specs.forEach(s => {
      const lab = document.createElement('label');
      const name = document.createElement('span'); name.className = 'name'; name.textContent = s.label || s.id;
      const inp = document.createElement('input');
      Object.assign(inp, { type: 'range', min: s.min, max: s.max, step: s.step || (s.max - s.min) / 100, value: s.value });
      const out = document.createElement('span'); out.className = 'val';
      const fmt = s.fmt || (v => (+v).toFixed(2));
      lab.append(name, inp, out); host.appendChild(lab);
      values[s.id] = +s.value; inputs[s.id] = inp; outs[s.id] = [out, fmt];
      out.textContent = fmt(+s.value);
      inp.addEventListener('input', () => {
        values[s.id] = +inp.value; out.textContent = fmt(+inp.value); onChange(values, s.id);
      });
    });
    onChange(values, null);
    return {
      values,
      set(id, v) { inputs[id].value = v; values[id] = +v; outs[id][0].textContent = outs[id][1](+v); onChange(values, id); },
      button(text, fn) { const b = document.createElement('button'); b.textContent = text; b.addEventListener('click', fn); host.appendChild(b); return b; }
    };
  }

  // readout helper: EconPlot.readout('#r1', [['r̄', '0.12'], …])
  function readout(target, rows) {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    host.classList.add('readout');
    host.innerHTML = rows.map(([k, v, cls]) => `<div><span class="k">${k}</span> <span class="v ${cls || ''}">${v}</span></div>`).join('');
  }

  // numerics
  function bisect(f, a, b, tol = 1e-10, it = 200) {
    let fa = f(a), fb = f(b);
    if (!isFinite(fa) || !isFinite(fb) || fa * fb > 0) return NaN;
    for (let k = 0; k < it; k++) {
      const c = 0.5 * (a + b), fc = f(c);
      if (Math.abs(fc) < tol || (b - a) < tol) return c;
      if (fa * fc <= 0) { b = c; fb = fc; } else { a = c; fa = fc; }
    }
    return 0.5 * (a + b);
  }
  // RK4 for systems: f(t, y[]) -> dy[]; returns array of states
  function rk4(f, y0, t0, t1, n, stop) {
    const h = (t1 - t0) / n, out = [y0.slice()];
    let y = y0.slice(), t = t0;
    for (let i = 0; i < n; i++) {
      const k1 = f(t, y);
      const k2 = f(t + h / 2, y.map((v, j) => v + h / 2 * k1[j]));
      const k3 = f(t + h / 2, y.map((v, j) => v + h / 2 * k2[j]));
      const k4 = f(t + h, y.map((v, j) => v + h * k3[j]));
      y = y.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      t += h; out.push(y.slice());
      if (stop && stop(y)) break;
    }
    return out;
  }

  global.EconPlot = { create, sliders, readout, bisect, rk4, C, setRich };
})(window);
