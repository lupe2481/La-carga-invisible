/* ==========================================================
   La carga invisible — main.js (D3 v7, vanilla)
   Todos los porcentajes se calculan desde los conteos de /data.
   ========================================================== */
(() => {
  'use strict';

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = (ms) => (RM ? 0 : ms);
  const pct = (a, b) => (b ? (a / b) * 100 : 0);
  const f1 = (v) => `${v.toFixed(1)}%`;
  const $ = (s, r = document) => r.querySelector(s);
  const C = {
    black: '#0B0B0B', white: '#FFFFFF', light: '#F4F4F2', yellow: '#F2EF3A', pink: '#F06AB5', blue: '#4C8DF6',
    green: '#3EE05E', pinkD: '#C2347F', blueD: '#1F5FCC', mutedDk: '#8C8C8C', mutedLt: '#6B6B6B',
    noneDk: '#3A3A3A', noneLt: '#C9C9C9', borderDk: '#2E2E2E', borderLt: '#DADADA',
  };
  const TYPE_KEYS = ['estres', 'ansiedad', 'depresivos', 'sin', 'nr'];
  const fillFor = (k, theme = 'dark') => ({
    estres: C.yellow, ansiedad: 'url(#pat-ans)', depresivos: 'url(#pat-dep)',
    sin: theme === 'dark' ? C.noneDk : C.noneLt, nr: 'none',
  })[k];
  const isMobile = () => window.innerWidth < 768;

  let S, E; // survey, eurostudent

  /* ---------------- utilidades ---------------- */
  const tip = $('#tip');
  function showTip(html, x, y, theme) {
    tip.className = `tip tip--${theme} is-on`;
    tip.innerHTML = html;
    const w = tip.offsetWidth / 2 + 8;
    tip.style.left = `${Math.max(w, Math.min(window.innerWidth - w, x))}px`;
    tip.style.top = `${y}px`;
  }
  function hideTip() { tip.classList.remove('is-on'); }
  window.addEventListener('scroll', hideTip, { passive: true });

  /** Tooltips con mouse, toque y teclado. */
  function bindTip(sel, htmlFn, theme) {
    sel
      .on('pointerenter pointermove', (ev, d) => showTip(htmlFn(d), ev.clientX, ev.clientY, theme))
      .on('pointerleave', hideTip)
      .on('focus', function (ev, d) {
        const r = this.getBoundingClientRect();
        showTip(htmlFn(d), r.left + r.width / 2, r.top, theme);
      })
      .on('blur', hideTip);
  }

  /** Tabla oculta visualmente para lectores de pantalla. */
  function srTable(id, caption, headers, rows) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="sr-only"><table><caption>${caption}</caption><thead><tr>${headers
      .map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  }

  function setV(key, val) {
    document.querySelectorAll(`[data-v="${key}"]`).forEach((n) => { n.textContent = val; });
  }

  const debounce = (fn, ms = 150) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  /* ---------------- datos derivados ---------------- */
  function derive() {
    const cat = Object.fromEntries(S.distress.categories.map((c) => [c.key, c.count]));
    const withD = cat.estres + cat.ansiedad + cat.depresivos;
    const facs = S.faculties.map((f) => {
      const d = f.estres + f.ansiedad + f.depresivos;
      return { ...f, distress: d, p: pct(d, f.n) };
    }).sort((a, b) => b.p - a.p);
    const gap = facs[0].p - facs[facs.length - 1].p;
    return { cat, withD, facs, gap };
  }

  /* ---------------- insignias de estrella (componente) ---------------- */
  function buildBadges() {
    document.querySelectorAll('.badge').forEach((el) => {
      if (el.querySelector(':scope > svg')) return;
      const n = +el.dataset.points || 13;
      const pts = d3.range(n * 2).map((i) => {
        const r = i % 2 ? 37 : 50;
        const a = (Math.PI * i) / n - Math.PI / 2;
        return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
      }).join(' ');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.innerHTML = `<polygon points="${pts}"/>`;
      el.prepend(svg);
    });
  }
  function fitBadges() {
    document.querySelectorAll('.badge__t b').forEach((b) => b.classList.toggle('is-long', b.textContent.trim().length > 3));
  }

  /* ---------------- 02 · estrella de 102 picos ---------------- */
  function drawStar(D) {
    const svg = d3.select('#star');
    const seq = [];
    TYPE_KEYS.forEach((k) => { for (let i = 0; i < D.cat[k]; i += 1) seq.push(k); });
    const n = seq.length; // 102
    const r0 = 52;
    // largo visual: variación determinista (no es un dato) para el efecto de destello
    const jitter = (i) => 0.62 + 0.38 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const spikes = seq.map((k, i) => ({
      k, i, a: (i / n) * 360 - 90,
      len: (k === 'sin' || k === 'nr') ? 26 + 8 * jitter(i) : 120 + 125 * jitter(i),
    }));
    const half = 2.1;
    const col = (k) => (k === 'nr' ? 'none' : k === 'sin' ? '#5a5a5a' : k === 'ansiedad' ? C.pink : k === 'depresivos' ? C.blue : C.yellow);
    const path = (d, t) => `M${r0},${-half}L${r0 + d.len * t},0L${r0},${half}Z`;
    // anillos guía
    svg.append('g').selectAll('circle').data([110, 190, 270]).join('circle')
      .attr('r', (r) => r).attr('fill', 'none').attr('stroke', '#232323').attr('stroke-dasharray', '1 5');
    const g = svg.append('g');
    const sp = g.selectAll('g.spike').data(spikes).join('g').attr('class', 'spike')
      .attr('transform', (d) => `rotate(${d.a})`);
    const pth = sp.append('path')
      .attr('fill', (d) => col(d.k))
      .attr('stroke', (d) => (d.k === 'nr' ? C.mutedDk : 'none'))
      .attr('stroke-dasharray', (d) => (d.k === 'nr' ? '2 2' : null))
      .attr('stroke-width', 1)
      .attr('d', (d) => path(d, RM ? 1 : 0));
    const tips = sp.filter((d) => d.k !== 'sin' && d.k !== 'nr').append('circle')
      .attr('cx', (d) => r0 + d.len + 4).attr('r', 1.8).attr('fill', (d) => col(d.k))
      .attr('opacity', RM ? 1 : 0);
    if (!RM) {
      pth.transition().delay((d) => 200 + d.i * 9).duration(700).ease(d3.easeCubicOut)
        .attrTween('d', (d) => (t) => path(d, t));
      tips.transition().delay((d) => 800 + d.i * 9).duration(400).attr('opacity', 1);
    }
    const ctr = svg.append('g').attr('text-anchor', 'middle');
    ctr.append('circle').attr('r', 46).attr('fill', C.black).attr('stroke', C.white).attr('stroke-width', 2);
    ctr.append('text').text(n).attr('dy', '0.36em')
      .attr('fill', C.white).attr('font-family', 'Unbounded, sans-serif').attr('font-weight', 800).attr('font-size', 30);

    srTable('starTable', 'Estudiantes por tipo de malestar principal', ['Tipo', 'Estudiantes'],
      S.distress.categories.map((c) => [c.label, c.count]));
  }

  /* ---------------- 02 · dona ---------------- */
  function drawDonut(D) {
    const svg = d3.select('#donut');
    const W = 660; const H = 560;
    const cx = W / 2; const cy = H / 2;
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
    // en pantallas angostas la dona se escala hacia abajo: compensa el tamaño del texto
    const k = Math.min(1.7, Math.max(1, 520 / ($('#donutBox').clientWidth || 660)));
    const R = k > 1.2 ? 172 : 210; const IR = Math.round(R * 0.63); // deja sitio a las etiquetas en móvil
    const cats = S.distress.categories;
    const labelColor = { estres: C.yellow, ansiedad: C.pink, depresivos: C.blue, sin: C.mutedDk, nr: C.mutedDk };
    const short = { estres: 'Estrés', ansiedad: 'Ansiedad', depresivos: 'Síntomas', sin: 'Sin', nr: 'Sin resp.' };
    let base = 102;
    const values = () => cats.map((c) => ({ ...c, v: base === 102 || ['estres', 'ansiedad', 'depresivos'].includes(c.key) ? c.count : 0 }));
    const pie = d3.pie().sort(null).value((d) => d.v).startAngle(0).padAngle(0.012);
    const arc = d3.arc().innerRadius(IR).outerRadius(R).cornerRadius(2);
    const off = (d) => (d.data.key === 'estres' ? 14 : 0);
    const shift = (d) => { const a = (d.startAngle + d.endAngle) / 2; return [Math.sin(a) * off(d), -Math.cos(a) * off(d)]; };

    const slices = g.append('g').selectAll('path').data(pie(values()), (d) => d.data.key).join('path')
      .attr('fill', (d) => fillFor(d.data.key, 'dark'))
      .attr('stroke', (d) => (d.data.key === 'nr' ? C.mutedDk : C.black))
      .attr('stroke-width', (d) => (d.data.key === 'nr' ? 1.2 : 2))
      .attr('stroke-dasharray', (d) => (d.data.key === 'nr' ? '3 3' : null))
      .attr('tabindex', 0)
      .attr('role', 'img')
      .attr('aria-label', (d) => `${d.data.label}: ${d.data.count}`)
      .style('cursor', 'pointer')
      .each(function (d) { this._cur = { ...d, endAngle: d.startAngle }; });
    const den = () => base;
    bindTip(slices, (d) => `${d.data.label}: ${d.data.v} (${f1(pct(d.data.v, den()))})`, 'dark');

    const labels = g.append('g').attr('class', 'svg-mono');
    function placeLabels(arcs, animate) {
      const sel = labels.selectAll('g').data(arcs, (d) => d.data.key).join((en) => {
        const gg = en.append('g');
        gg.append('polyline').attr('fill', 'none').attr('stroke', '#5a5a5a').attr('stroke-width', 0.8);
        gg.append('text').attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 13 * k).attr('font-weight', 500);
        return gg;
      });
      sel.each(function (d) {
        const a = (d.startAngle + d.endAngle) / 2;
        const right = Math.sin(a) >= 0;
        const p1 = [Math.sin(a) * (R + 4), -Math.cos(a) * (R + 4)];
        const p2 = [Math.sin(a) * (R + 22), -Math.cos(a) * (R + 22)];
        const p3 = [p2[0] + (right ? 12 : -12), p2[1]];
        const [sx, sy] = shift(d);
        const gg = d3.select(this);
        gg.transition().duration(animate ? dur(700) : 0).style('opacity', d.data.v ? 1 : 0);
        gg.select('polyline').attr('points', [p1, p2, p3].map((p) => [p[0] + sx, p[1] + sy]).join(' '));
        gg.select('text')
          .attr('x', p3[0] + sx + (right ? 5 : -5)).attr('y', p3[1] + sy).attr('dy', '0.35em')
          .attr('text-anchor', right ? 'start' : 'end')
          .attr('fill', labelColor[d.data.key])
          .text(`${short[d.data.key]} ${d.data.v}`);
      });
    }

    function render(animate) {
      const arcs = pie(values());
      slices.data(arcs, (d) => d.data.key)
        .transition().duration(animate ? dur(800) : 0).ease(d3.easeCubicInOut)
        .attr('transform', (d) => `translate(${shift(d)})`)
        .attrTween('d', function (d) {
          const i = d3.interpolate(this._cur, d);
          this._cur = i(1);
          return (t) => arc(i(t));
        });
      placeLabels(arcs, animate);
      // lista: número, muestra, nombre, conteo; barra y texto con ambas bases
      const DIST = ['estres', 'ansiedad', 'depresivos'];
      d3.select('#donutLegend').selectAll('li').data(cats).join((en) => {
        const li = en.append('li');
        li.append('span').attr('class', 'lrow__i').attr('aria-hidden', true).text((d, i) => String(i + 1).padStart(2, '0'));
        li.append('svg').attr('class', 'lrow__sw').attr('viewBox', '0 0 14 14').attr('aria-hidden', true)
          .append('rect').attr('x', 0.5).attr('y', 0.5).attr('width', 13).attr('height', 13)
          .attr('fill', (d) => (d.key === 'nr' ? 'none' : d.key === 'sin' ? C.mutedDk : fillFor(d.key)))
          .attr('stroke', (d) => (d.key === 'nr' ? C.mutedDk : 'none'))
          .attr('stroke-dasharray', (d) => (d.key === 'nr' ? '2 2' : null));
        li.append('span').attr('class', 'lrow__l');
        li.append('span').attr('class', (d) => `lrow__n${d.key === 'estres' ? ' is-y' : ''}`);
        li.append('span').attr('class', 'lrow__bar').attr('aria-hidden', true).append('i')
          .style('background', (d) => (d.key === 'estres' ? C.yellow : d.key === 'ansiedad'
            ? `repeating-linear-gradient(45deg, ${C.pink} 0 4px, #9b4475 4px 6px)` : d.key === 'depresivos'
              ? `radial-gradient(circle, rgba(0,0,0,.45) 1.2px, transparent 1.5px) 0 0/6px 6px, ${C.blue}` : C.mutedDk));
        li.append('span').attr('class', 'lrow__t');
        return li;
      }).each(function (d) {
        const li = d3.select(this);
        const isD = DIST.includes(d.key);
        const inBase = base === 102 || isD;
        li.select('.lrow__l').text(d.label);
        li.select('.lrow__n').text(d.count);
        li.select('.lrow__bar i').style('width', `${inBase ? pct(d.count, base) : 0}%`);
        const tot = `${f1(pct(d.count, S.meta.n))} del total`;
        const rep83 = `${f1(pct(d.count, D.withD))} de quienes reportan`;
        li.select('.lrow__t').text(isD ? (base === 102 ? `${tot} · ${rep83}` : `${rep83} · ${tot}`) : (base === 102 ? tot : `fuera de la base 83 · ${tot}`));
        li.style('opacity', inBase ? 1 : 0.45);
      });
      $('#baseNote').textContent = base === 102
        ? 'P: ¿Qué forma de malestar has experimentado más? Base: 102 estudiantes.'
        : 'P: ¿Qué forma de malestar has experimentado más? Base: 83 estudiantes con malestar.';
      svg.attr('aria-label', `Dona del malestar principal, base ${base}: ${arcs.filter((a) => a.data.v)
        .map((a) => `${a.data.label} ${a.data.v} (${f1(pct(a.data.v, base))})`).join(', ')}.`);
    }

    // centro
    const ctr = g.append('g').attr('text-anchor', 'middle');
    ctr.append('text').attr('y', 4).attr('font-size', 64).attr('font-weight', 800).attr('fill', C.white)
      .attr('font-family', 'Unbounded, sans-serif').text(D.withD);
    ctr.append('text').attr('y', 22 + 14 * k).attr('font-size', 13 * k).attr('fill', C.mutedDk)
      .attr('font-family', 'Space Grotesk, sans-serif').text('con malestar');
    ctr.append('text').attr('y', 22 + 32 * k).attr('font-size', 13 * k).attr('fill', C.mutedDk)
      .attr('font-family', 'Space Grotesk, sans-serif').text(`de ${S.meta.n} estudiantes`);

    render(true);
    document.querySelectorAll('[data-base]').forEach((b) => b.addEventListener('click', () => {
      base = +b.dataset.base;
      document.querySelectorAll('[data-base]').forEach((x) => {
        x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b);
      });
      render(true);
    }));
    srTable('donutTable', 'Malestar principal (base 102)', ['Tipo', 'Conteo', '% de 102', '% de 83'],
      cats.map((c) => [c.label, c.count, f1(pct(c.count, 102)),
        ['estres', 'ansiedad', 'depresivos'].includes(c.key) ? f1(pct(c.count, D.withD)) : '—']));
  }

  /* ---------------- 03 · carga ---------------- */
  function drawLoad() {
    const L = S.load;
    const colors = [C.green, C.yellow, C.pink, C.blue];
    const radii = [7, 9, 11, 13];
    const svg = d3.select('#hang');
    const W = 400; const top = 12;
    svg.append('line').attr('x1', 0).attr('x2', W).attr('y1', top).attr('y2', top).attr('stroke', C.black).attr('stroke-width', 1.5);
    const cols = L.levels.map((l, i) => ({ ...l, i, x: (W / 4) * (i + 0.5), r: radii[i], c: colors[i] }));
    const dots = [];
    cols.forEach((c) => {
      for (let j = 0; j < c.count; j += 1) dots.push({ col: c.i, j, x: c.x, y: top + 14 + c.r + j * (c.r * 2 + 4), r: c.r, c: c.c });
    });
    const maxY = d3.max(dots, (d) => d.y + d.r) + 8;
    svg.attr('viewBox', `0 0 ${W} ${maxY}`);
    const colG = svg.selectAll('g.col').data(cols).join('g').attr('class', 'col');
    colG.append('line').attr('x1', (d) => d.x).attr('x2', (d) => d.x).attr('y1', top)
      .attr('y2', (d) => top + 14).attr('stroke', C.black).attr('stroke-width', 1);
    const circ = svg.selectAll('circle.dot').data(dots).join('circle').attr('class', 'dot')
      .attr('cx', (d) => d.x).attr('r', (d) => d.r).attr('fill', (d) => d.c).attr('stroke', C.black).attr('stroke-width', 0.8)
      .attr('cy', (d) => (RM ? d.y : top));
    if (!RM) {
      circ.transition('drop').delay((d) => d.col * 120 + d.j * 60).duration(700).ease(d3.easeBounceOut).attr('cy', (d) => d.y);
    } else circ.attr('cy', (d) => d.y);

    const lab = d3.select('#hangLabels').selectAll('button').data(cols).join('button')
      .attr('type', 'button')
      .html((d) => `<span class="lv">${d.label}</span><span class="pc">${f1(pct(d.count, L.n))}</span><span class="n">n=${d.count}</span>`)
      .on('click', (ev, d) => select(d.i));
    const range = $('#loadRange');
    function select(i) {
      range.value = i;
      const d = cols[i];
      range.setAttribute('aria-valuetext', `${d.label}: ${f1(pct(d.count, L.n))}, n=${d.count}`);
      lab.classed('is-on', (c) => c.i === i).attr('aria-pressed', (c) => c.i === i);
      circ.transition('fade').duration(dur(250)).attr('opacity', (c) => (c.col === i ? 1 : 0.35));
    }
    range.addEventListener('input', () => select(+range.value));
    select(1);
    const mod = L.levels.find((l) => l.key === 'moderada').count;
    const hi = L.levels.filter((l) => l.key === 'alta' || l.key === 'muyalta').reduce((a, l) => a + l.count, 0);
    $('#loadLead').textContent = `${mod} de ${L.n} estudiantes califican su carga de este semestre como moderada; ${hi} la sienten alta o muy alta.`;
    svg.attr('aria-label', `Carga académica percibida, n=${L.n}: ${cols.map((c) => `${c.label} ${c.count} (${f1(pct(c.count, L.n))})`).join(', ')}.`);
    srTable('hangTable', `Carga académica percibida (n=${L.n})`, ['Nivel', 'Respuestas', '%'],
      cols.map((c) => [c.label, c.count, f1(pct(c.count, L.n))]));

    // 18 puntos por frecuencia (luminancia secuencial + leyenda con conteos)
    const F = S.distress2w;
    const shades = ['none', '#5a5a5a', '#8C8C8C', '#CFCFCF', C.white];
    const fd = [];
    F.counts.forEach((n, k) => { for (let j = 0; j < n; j += 1) fd.push(k); });
    d3.select('#freqDots').selectAll('circle').data(fd).join('circle')
      .attr('cx', (d, i) => 7 + i * 14).attr('cy', 10).attr('r', 5.5)
      .attr('fill', (d) => shades[d]).attr('stroke', (d) => (d === 0 ? C.mutedDk : 'none')).attr('stroke-width', 1.2);
    d3.select('#freqDots').attr('aria-label', `Malestar en las últimas 2 semanas, n=${F.n}: ${F.scale.map((s, k) => `${s} ${F.counts[k]}`).join(', ')}.`);
    d3.select('#freqLegend').selectAll('li').data(F.scale).join('li')
      .html((s, k) => `<i style="background:${shades[k] === 'none' ? 'transparent' : shades[k]};${k === 0 ? `border:1px solid ${C.mutedDk}` : ''}"></i>${s} ${F.counts[k]}`);
    srTable('freqTable', `Malestar, últimas 2 semanas (n=${F.n})`, ['Frecuencia', 'Respuestas'], F.scale.map((s, k) => [s, F.counts[k]]));
  }

  /* ---------------- 04 · facultades ---------------- */
  let barsState = null;
  function drawBars(D, animate) {
    const facs = D.facs;
    if (!barsState) barsState = { sel: [facs[0].key, facs[facs.length - 1].key], drawn: false };
    const box = $('#barsBox');
    const W = box.clientWidth;
    const mob = W < 640;
    const labelW = mob ? 0 : Math.min(230, W * 0.2);
    const pctW = mob ? 48 : 64;
    const brW = mob ? 56 : 100;
    const barH = mob ? 22 : 26;
    const rowH = mob ? 58 : 50;
    const topPad = 4;
    const barW = W - labelW - pctW - brW;
    const H = topPad + facs.length * rowH + 30;
    const svg = d3.select('#bars').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    svg.selectAll('*').remove();
    const x = d3.scaleLinear().domain([0, 100]).range([0, barW]);
    const g = svg.append('g').attr('transform', `translate(${labelW},${topPad})`);
    const barY = mob ? 22 : (rowH - barH) / 2;

    // retícula y eje
    const ax = g.append('g').attr('class', 'ax').attr('transform', `translate(0,${facs.length * rowH + 4})`)
      .call(d3.axisBottom(x).tickValues([0, 25, 50, 75, 100]).tickFormat((v) => `${v}%`).tickSize(0).tickPadding(8));
    ax.select('.domain').remove();
    g.append('g').selectAll('line').data([25, 50, 75, 100]).join('line')
      .attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', facs.length * rowH)
      .attr('stroke', C.borderDk).attr('stroke-dasharray', '2 3');

    const rows = g.selectAll('g.bar-row').data(facs, (d) => d.key).join('g')
      .attr('class', 'bar-row').attr('transform', (d, i) => `translate(0,${i * rowH})`)
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (d) => `${d.label}, n=${d.n}: ${f1(d.p)} con malestar. Seleccionar para comparar.`);
    rows.append('rect').attr('class', 'row-focus').attr('x', -labelW).attr('y', 2).attr('width', W).attr('height', rowH - 4)
      .attr('rx', 8).attr('fill', 'transparent').attr('stroke', 'none');
    if (mob) {
      rows.append('text').attr('x', 0).attr('y', 14).attr('fill', C.white).attr('font-size', 13).attr('font-weight', 500)
        .text((d) => d.label);
      rows.append('text').attr('x', barW).attr('y', 14).attr('text-anchor', 'end').attr('class', 'svg-mono')
        .attr('fill', C.mutedDk).attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 10).text((d) => `n = ${d.n}`);
    } else {
      rows.append('text').attr('x', -16).attr('y', barY + barH / 2 - 3).attr('text-anchor', 'end').attr('fill', C.white)
        .attr('font-size', 13.5).attr('font-weight', 500).text((d) => d.label);
      rows.append('text').attr('x', -16).attr('y', barY + barH / 2 + 12).attr('text-anchor', 'end')
        .attr('fill', C.mutedDk).attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 10).text((d) => `n = ${d.n}`);
    }
    rows.append('rect').attr('x', 0).attr('y', barY).attr('width', barW).attr('height', barH).attr('fill', '#232323');
    const segData = (d) => {
      let acc = 0;
      return ['estres', 'ansiedad', 'depresivos'].map((k) => {
        const s = { k, v: d[k], x0: pct(acc, d.n), w: pct(d[k], d.n), f: d };
        acc += d[k];
        return s;
      });
    };
    const anim = animate && !barsState.drawn && !RM;
    const segs = rows.selectAll('g.seg').data(segData).join('g').attr('class', 'seg');
    segs.append('rect').attr('y', barY).attr('height', barH)
      .attr('fill', (s) => fillFor(s.k))
      .attr('x', (s) => x(s.x0)).attr('width', (s) => (anim ? 0 : x(s.w)))
      .transition().delay((s, i) => i * 180).duration(anim ? 800 : 0).ease(d3.easeCubicOut)
      .attr('width', (s) => x(s.w));
    segs.filter((s) => x(s.w) >= 16).append('text')
      .attr('x', (s) => x(s.x0 + s.w / 2)).attr('y', barY + barH / 2).attr('dy', '0.35em').attr('text-anchor', 'middle')
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 11).attr('font-weight', 500)
      .attr('fill', C.black).attr('stroke', (s) => (s.k === 'ansiedad' ? C.pink : s.k === 'depresivos' ? C.blue : 'none'))
      .attr('stroke-width', 3).attr('paint-order', 'stroke')
      .style('opacity', anim ? 0 : 1).text((s) => s.v)
      .transition().delay(900).duration(anim ? 300 : 0).style('opacity', 1);
    bindTip(segs.select('rect'), (s) => `${s.f.short} · ${({ estres: 'Estrés', ansiedad: 'Ansiedad', depresivos: 'Síntomas depresivos' })[s.k]}: ${s.v} de ${s.f.n} (${f1(s.w)})`, 'dark');
    rows.append('text').attr('class', 'pct').attr('x', barW + 10).attr('y', barY + barH / 2).attr('dy', '0.35em')
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', mob ? 11.5 : 13).attr('font-weight', 500)
      .text((d) => f1(d.p));

    const br = g.append('g').attr('class', 'bracket');
    const bx = barW + pctW + 8;
    br.append('path').attr('fill', 'none').attr('stroke', C.yellow).attr('stroke-width', 2);
    const bl = br.append('text').attr('fill', C.yellow).attr('font-weight', 700).attr('font-family', 'Space Grotesk, sans-serif');
    bl.append('tspan').attr('class', 'v').attr('font-size', mob ? 16 : 22);
    bl.append('tspan').attr('class', 'u').attr('font-size', mob ? 11 : 13).attr('font-family', 'JetBrains Mono, monospace');

    function update(a) {
      const [ka, kb] = barsState.sel;
      const ia = facs.findIndex((f) => f.key === ka); const ib = facs.findIndex((f) => f.key === kb);
      const [i1, i2] = [Math.min(ia, ib), Math.max(ia, ib)];
      const y1 = i1 * rowH + barY + barH / 2; const y2 = i2 * rowH + barY + barH / 2;
      const gap = Math.abs(facs[ia].p - facs[ib].p);
      rows.select('text.pct').attr('fill', (d) => (barsState.sel.includes(d.key) ? C.yellow : C.white));
      rows.attr('aria-pressed', (d) => barsState.sel.includes(d.key));
      br.select('path').transition().duration(a ? dur(600) : 0)
        .attr('d', `M${bx - 10},${y1}H${bx}V${y2}H${bx - 10}`);
      const ly = (y1 + y2) / 2;
      bl.transition().duration(a ? dur(600) : 0).attr('transform', `translate(${bx + 8},${ly})`);
      if (mob) {
        bl.select('.v').attr('x', 0).attr('dy', '-0.1em').text(gap.toFixed(1));
        bl.select('.u').attr('x', 0).attr('dy', '1.3em').text('pts');
      } else {
        bl.select('.v').attr('x', 0).attr('dy', '0.35em').text(gap.toFixed(1));
        bl.select('.u').attr('x', 0).attr('dy', '1.6em').text('pts');
      }
      d3.selectAll('#facChips .chip').classed('is-on', (d) => barsState.sel.includes(d.key))
        .attr('aria-pressed', (d) => barsState.sel.includes(d.key));
      $('#gapLive').textContent = `${facs[ia].short} ${f1(facs[ia].p)} frente a ${facs[ib].short} ${f1(facs[ib].p)}: ${gap.toFixed(1)} puntos de diferencia.`;
    }
    function pick(key) {
      if (barsState.sel.includes(key)) return;
      barsState.sel = [barsState.sel[1], key];
      update(true);
    }
    rows.on('click', (ev, d) => pick(d.key))
      .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(d.key); } });

    d3.select('#facChips').selectAll('button').data(facs, (d) => d.key).join('button')
      .attr('class', 'chip').attr('type', 'button').text((d) => d.short)
      .on('click', (ev, d) => pick(d.key));
    update(false);
    barsState.drawn = true;

    svg.attr('aria-label', `Malestar por facultad, ordenado de mayor a menor: ${facs.map((f) => `${f.label} ${f1(f.p)}`).join(', ')}.`);
  }

  function barExtras(D) {
    const lg = d3.select('#barLegend').selectAll('li').data([
      { k: 'estres', l: 'Estrés' }, { k: 'ansiedad', l: 'Ansiedad' }, { k: 'depresivos', l: 'Síntomas depresivos' },
      { k: 'sin', l: 'Sin malestar o sin respuesta' }]).join('li');
    lg.append('svg').attr('viewBox', '0 0 12 12').attr('aria-hidden', true).append('rect').attr('width', 12).attr('height', 12).attr('rx', 2)
      .attr('fill', (d) => (d.k === 'sin' ? '#232323' : fillFor(d.k))).attr('stroke', (d) => (d.k === 'sin' ? '#555' : 'none'));
    lg.append('span').text((d) => d.l);
    srTable('barsTable', 'Malestar por facultad', ['Facultad', 'n', 'Estrés', 'Ansiedad', 'Síntomas depresivos', 'Sin malestar', 'Sin respuesta', '% con malestar'],
      D.facs.map((f) => [f.full, f.n, f.estres, f.ansiedad, f.depresivos, f.sin, f.nr, f1(f.p)]));
  }

  /* ---------------- 05 · Europa ---------------- */
  const COUNTRY = {
    AT: 'Austria', AZ: 'Azerbaiyán', CH: 'Suiza', CZ: 'Chequia', DE: 'Alemania', DK: 'Dinamarca', EE: 'Estonia', FI: 'Finlandia',
    FR: 'Francia', GE: 'Georgia', HR: 'Croacia', HU: 'Hungría', IE: 'Irlanda', IS: 'Islandia', LT: 'Lituania', LV: 'Letonia',
    MT: 'Malta', NL: 'Países Bajos', NO: 'Noruega', PL: 'Polonia', PT: 'Portugal', RO: 'Rumania', SE: 'Suecia', SK: 'Eslovaquia',
  };
  const FAC_ORDER = ['famadyc', 'humanidades', 'quimica', 'ingenieria', 'derecho', 'negocios'];
  let field = 'ingenieria';
  let euDrawn = false;

  function euSetup(D) {
    const facName = (k) => D.facs.find((f) => f.key === k).short;
    const groups = FAC_ORDER.map((fk) => ({ fk, keys: Object.keys(E.fields).filter((k) => E.fields[k].faculty === fk) }))
      .filter((g) => g.keys.length);
    const gsel = d3.select('#fieldChips').selectAll('div.fgroup').data(groups).join((en) => {
      const g = en.append('div').attr('class', 'fgroup').attr('role', 'group').attr('aria-label', (d) => `Campos relacionados con ${facName(d.fk)}`);
      g.append('p').attr('class', 'fgroup__t mono').text((d) => facName(d.fk));
      g.append('div').attr('class', 'chips');
      return g;
    });
    gsel.select('.chips').selectAll('button').data((d) => d.keys).join('button')
      .attr('type', 'button').attr('class', (k) => `chip${E.fields[k].relation === 'afín' ? ' chip--afin' : ''}`)
      .attr('title', (k) => `${E.fields[k].label}${E.fields[k].relation === 'afín' ? ' (campo afín)' : ''}`)
      .text((k) => E.fields[k].chip)
      .on('click', (ev, k) => { field = k; drawEU(D, true); });
    const sel = d3.select('#fieldSelect');
    const og = sel.selectAll('optgroup').data(groups).join('optgroup').attr('label', (d) => facName(d.fk));
    og.selectAll('option').data((d) => d.keys).join('option').attr('value', (k) => k)
      .text((k) => `${E.fields[k].chip}${E.fields[k].relation === 'afín' ? ' (afín)' : ''}`);
    sel.on('change', function () { field = this.value; drawEU(D, true); });
  }

  function drawEU(D, animate) {
    const F = E.fields[field];
    const rows = F.countries;
    const fac = D.facs.find((f) => f.key === F.faculty);
    d3.selectAll('#fieldChips .chip').classed('is-on', (k) => k === field).attr('aria-pressed', (k) => k === field);
    $('#fieldSelect').value = field;
    const ok = rows && rows.length;

    // texto
    const uMin = ok ? d3.min(rows, (r) => r.unhappy) : null;
    const uMax = ok ? d3.max(rows, (r) => r.unhappy) : null;
    $('#euRange').textContent = ok ? `${Math.round(uMin)}–${Math.round(uMax)}%` : '—%';
    $('#fieldMatch').textContent = `${F.label} (EUROSTUDENT: ${F.es8.replace(/ \[.*\]/, '')}) ↔ ${fac.short}. ${F.relation === 'afín'
      ? 'Campo afín: ninguna licenciatura de la muestra está en este campo.'
      : `Incluye: ${F.majors.join(', ')}.`}`;
    $('#euN').textContent = ok ? rows.length : 0;
    $('#lsName').textContent = fac.short;
    $('#lsPct').textContent = f1(fac.p);
    $('#lsTxt').textContent = `${fac.distress} de ${fac.n} reportan malestar emocional académico`;

    const sBox = $('#scatterBox');
    if (!ok) {
      sBox.innerHTML = '<p class="note dark">Datos pendientes para este campo.</p>';
      return;
    }
    const anim = animate && !RM;

    // ---- dispersión
    const W = sBox.clientWidth;
    const H = Math.max(260, Math.min(420, W * 0.62));
    const m = { t: 30, r: 16, b: 42, l: 40 };
    const hMin = d3.min(rows, (r) => r.happy); const hMax = d3.max(rows, (r) => r.happy);
    const xDom = [Math.min(40, Math.floor(hMin / 10) * 10), Math.max(70, Math.ceil(hMax / 10) * 10)];
    const yDom = [0, Math.max(30, Math.ceil(uMax / 10) * 10)];
    const x = d3.scaleLinear().domain(xDom).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain(yDom).range([H - m.b, m.t]);
    const svg = d3.select('#scatter').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    let gx = svg.select('g.x'); let gy = svg.select('g.y');
    if (gx.empty()) {
      gx = svg.append('g').attr('class', 'ax x');
      gy = svg.append('g').attr('class', 'ax y');
      svg.append('text').attr('class', 'xl svg-mono').attr('text-anchor', 'end').attr('fill', C.mutedLt);
      svg.append('text').attr('class', 'yl svg-mono').attr('fill', C.mutedLt);
      svg.append('g').attr('class', 'pts');
      svg.append('g').attr('class', 'lbls');
      svg.append('g').attr('class', 'call');
    }
    const t = svg.transition().duration(anim ? 700 : 0).ease(d3.easeCubicInOut);
    gx.attr('transform', `translate(0,${H - m.b})`).transition(t)
      .call(d3.axisBottom(x).ticks(W < 500 ? 4 : 6).tickFormat((v) => `${v}%`).tickSize(-(H - m.b - m.t)).tickPadding(8));
    gy.attr('transform', `translate(${m.l},0)`).transition(t)
      .call(d3.axisLeft(y).ticks(4).tickFormat((v) => `${v}%`).tickSize(-(W - m.l - m.r)).tickPadding(6));
    svg.selectAll('.ax .tick line').attr('stroke', '#ECECEC');
    svg.select('.xl').attr('x', W - m.r).attr('y', H - 4).text('% muy o bastante felices (1–2) →');
    svg.select('.yl').attr('x', 0).attr('y', 12).text('↑ % poco o nada felices (4–5)');

    const hi = rows.reduce((a, r) => (r.unhappy > a.unhappy ? r : a), rows[0]);
    const byU = [...rows].sort((a, b) => b.unhappy - a.unhappy);
    const labelSet = new Set([byU[1], byU[byU.length - 1], rows.reduce((a, r) => (r.happy > a.happy ? r : a), rows[0]),
      rows.reduce((a, r) => (r.happy < a.happy ? r : a), rows[0])].map((r) => r.country));
    labelSet.delete(hi.country);

    const pts = svg.select('g.pts').selectAll('circle').data(rows, (d) => d.country).join(
      (en) => en.append('circle').attr('cx', (d) => x(d.happy)).attr('cy', (d) => y(d.unhappy)).attr('r', 0)
        .attr('tabindex', 0).attr('role', 'img').style('cursor', 'pointer'),
    );
    pts.attr('aria-label', (d) => `${COUNTRY[d.country] || d.country}: ${f1(d.happy)} felices, ${f1(d.unhappy)} poco o nada felices`)
      .transition(t).delay((d, i) => (euDrawn ? 0 : i * 25))
      .attr('cx', (d) => x(d.happy)).attr('cy', (d) => y(d.unhappy))
      .attr('r', (d) => (d.country === hi.country ? 8 : 5))
      .attr('fill', (d) => (d.country === hi.country ? C.pink : C.black))
      .attr('stroke', (d) => (d.country === hi.country ? C.black : C.white)).attr('stroke-width', (d) => (d.country === hi.country ? 1.5 : 1));
    bindTip(pts, (d) => `${COUNTRY[d.country] || d.country} · ${f1(d.happy)} felices / ${f1(d.unhappy)} poco felices`, 'light');

    svg.select('g.lbls').selectAll('text').data(rows.filter((r) => labelSet.has(r.country)), (d) => d.country).join('text')
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 10.5).attr('font-weight', 500).attr('fill', C.black)
      .text((d) => d.country)
      .transition(t)
      .attr('x', (d) => x(d.happy) + (x(d.happy) > W - 40 ? -9 : 9)).attr('y', (d) => y(d.unhappy) + 4)
      .attr('text-anchor', (d) => (x(d.happy) > W - 40 ? 'end' : 'start'));

    // llamada (píldora) del país resaltado
    const call = svg.select('g.call');
    call.selectAll('*').remove();
    const txt = `${COUNTRY[hi.country] || hi.country} · ${f1(hi.happy)} / ${f1(hi.unhappy)}`;
    const cg = call.append('g').style('opacity', 0);
    const ct = cg.append('text').attr('fill', C.white).attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 11).attr('font-weight', 500).text(txt);
    const tw = ct.node().getComputedTextLength() + 22;
    let cx = x(hi.happy) - 6; let cy = y(hi.unhappy) - 30;
    cx = Math.max(m.l, Math.min(W - tw - 4, cx));
    cy = Math.max(2, cy);
    cg.insert('rect', 'text').attr('x', cx).attr('y', cy).attr('width', tw).attr('height', 22).attr('rx', 11).attr('fill', C.black);
    ct.attr('x', cx + 11).attr('y', cy + 15);
    cg.transition().delay(anim ? 500 : 0).duration(anim ? 300 : 0).style('opacity', 1);
    svg.attr('aria-label', `Dispersión, ${F.label}: ${rows.length} países; % poco o nada felices entre ${f1(uMin)} y ${f1(uMax)}. Valor más alto: ${COUNTRY[hi.country]} ${f1(hi.unhappy)}.`);

    // ---- histograma
    const hBox = $('#histBox');
    const HW = hBox.clientWidth;
    const HH = 170;
    const hm = { t: 18, r: 8, b: 26, l: 26 };
    const lo = Math.min(5, Math.floor(uMin / 5) * 5); const hiB = Math.max(30, Math.ceil(uMax / 5) * 5);
    const edges = d3.range(lo, hiB + 0.001, 5);
    const bins = d3.bin().domain([lo, hiB]).thresholds(edges.slice(1, -1))(rows.map((r) => r.unhappy));
    const maxC = d3.max(bins, (b) => b.length);
    const hx = d3.scaleLinear().domain([lo, hiB]).range([hm.l, HW - hm.r]);
    const hy = d3.scaleLinear().domain([0, Math.max(maxC, 4)]).nice().range([HH - hm.b, hm.t]);
    const hs = d3.select('#hist').attr('width', HW).attr('height', HH).attr('viewBox', `0 0 ${HW} ${HH}`);
    const th = hs.transition().duration(anim ? 700 : 0).ease(d3.easeCubicInOut);
    let hgx = hs.select('g.x');
    if (hgx.empty()) { hgx = hs.append('g').attr('class', 'ax x'); hs.append('g').attr('class', 'ax y'); hs.append('g').attr('class', 'bars'); }
    hgx.attr('transform', `translate(0,${HH - hm.b})`).transition(th).call(d3.axisBottom(hx).tickValues(edges).tickSize(0).tickPadding(8));
    hs.select('g.y').attr('transform', `translate(${hm.l},0)`).transition(th).call(d3.axisLeft(hy).ticks(3).tickSize(0).tickPadding(6));
    const hb = hs.select('g.bars').selectAll('g').data(bins).join((en) => {
      const gg = en.append('g');
      gg.append('rect'); gg.append('text');
      return gg;
    });
    hb.select('rect').attr('fill', (b) => (b.length === maxC ? C.pink : C.black))
      .attr('x', (b) => hx(b.x0) + 1.5).attr('width', (b) => Math.max(0, hx(b.x1) - hx(b.x0) - 3))
      .transition(th).attr('y', (b) => hy(b.length)).attr('height', (b) => hy(0) - hy(b.length));
    hb.select('text').attr('text-anchor', 'middle').attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 10.5)
      .attr('fill', C.black).text((b) => (b.length ? b.length : ''))
      .transition(th).attr('x', (b) => (hx(b.x0) + hx(b.x1)) / 2).attr('y', (b) => hy(b.length) - 5);
    hb.exit().remove();
    hs.attr('aria-label', `Histograma, ${F.label}: ${bins.map((b) => `${b.x0}–${b.x1}%: ${b.length} países`).join('; ')}.`);

    srTable('euTable', `EUROSTUDENT 8 · ${F.label}`, ['País', '% felices (1–2)', '% poco o nada felices (4–5)'],
      rows.map((r) => [COUNTRY[r.country] || r.country, f1(r.happy), f1(r.unhappy)]));
    euDrawn = true;
  }

  /* ---------------- 06 · líneas ---------------- */
  const LINE_STYLE = {
    estres: { c: C.yellow, dash: null, label: 'Estrés' },
    preocupacion: { c: C.pink, dash: '7 5', label: 'Preocupación' },
    desanimo: { c: C.blue, dash: '1.5 5', label: 'Desánimo' },
    abrumado: { c: C.green, dash: '12 4 2 4', label: 'Abrumado/a' },
    desconectar: { c: '#E8E8E8', dash: '4 3', label: 'No poder desconectar' },
    motivacion: { c: '#B4B4B4', dash: '10 6', label: 'Poca motivación' },
  };
  const LINE_ORDER = ['estres', 'preocupacion', 'desanimo', 'abrumado', 'desconectar', 'motivacion'];
  const SYMS = { estres: 'symbolCircle', preocupacion: 'symbolSquare', desanimo: 'symbolDiamond', abrumado: 'symbolTriangle', desconectar: 'symbolCross', motivacion: 'symbolStar' };
  const lineOn = new Set(['estres', 'preocupacion', 'desanimo']);
  let linesDrawn = false;

  function lineSetup() {
    const ch = d3.select('#lineChips').selectAll('button').data(LINE_ORDER).join('button')
      .attr('type', 'button').attr('class', 'chip')
      .html((k) => `<svg width="20" height="8" aria-hidden="true" style="display:inline-block;vertical-align:middle;margin-right:8px"><line x1="0" y1="4" x2="20" y2="4" stroke="currentColor" stroke-width="2" ${LINE_STYLE[k].dash ? `stroke-dasharray="${LINE_STYLE[k].dash.split(' ').map((v) => v * 0.6).join(' ')}"` : ''} stroke-linecap="round"/></svg>${LINE_STYLE[k].label}`)
      .on('click', (ev, k) => {
        if (lineOn.has(k)) { if (lineOn.size > 1) lineOn.delete(k); } else lineOn.add(k);
        drawLines(true);
      });
    return ch;
  }

  function drawLines(animate) {
    const FR = S.frequency;
    const items = FR.items.filter((it) => lineOn.has(it.key)).map((it) => ({
      ...it, vals: it.counts.map((c, i) => ({ i, c, p: pct(c, it.n), key: it.key, label: it.label, n: it.n })),
    }));
    d3.selectAll('#lineChips .chip').classed('is-on', (k) => lineOn.has(k)).attr('aria-pressed', (k) => lineOn.has(k));
    const box = $('#lineBox');
    const W = box.clientWidth;
    const mob = W < 560;
    const H = mob ? 300 : 380;
    const m = { t: 34, r: mob ? 96 : 150, b: 36, l: 36 };
    const x = d3.scalePoint().domain(FR.scale.map((s, i) => i)).range([m.l + 10, W - m.r]);
    const maxP = d3.max(items, (it) => d3.max(it.vals, (v) => v.p)) || 50;
    const y = d3.scaleLinear().domain([0, Math.max(50, Math.ceil(maxP / 10) * 10)]).range([H - m.b, m.t]);
    const svg = d3.select('#lines').attr('width', W).attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    const anim = animate && !RM;
    const t = svg.transition().duration(anim ? 800 : 0).ease(d3.easeCubicInOut);
    const step = x.step();
    if (svg.select('g.band').empty()) {
      svg.append('g').attr('class', 'band');
      svg.append('g').attr('class', 'ax x');
      svg.append('g').attr('class', 'ax y');
      svg.append('g').attr('class', 'ls');
      svg.append('g').attr('class', 'ends');
    }
    const band = svg.select('g.band');
    band.selectAll('*').remove();
    band.append('rect').attr('x', x(3) - step / 2).attr('width', x(4) - x(3) + step).attr('y', m.t - 18).attr('height', H - m.b - m.t + 18)
      .attr('fill', C.green).attr('fill-opacity', 0.09).attr('stroke', C.green).attr('stroke-opacity', 0.25);
    band.append('text').attr('x', x(4) + step / 2 - 6).attr('y', m.t - 6).attr('text-anchor', 'end').attr('fill', C.green)
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', 10.5).text('Alta frecuencia');
    const short = mob ? ['Nunca', 'Casi n.', 'A veces', 'Frec.', 'Siempre'] : FR.scale.map((s) => (s === 'Frecuentemente' ? 'Frecuente' : s));
    svg.select('g.x').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat((i) => short[i]).tickSize(0).tickPadding(12));
    svg.select('g.y').attr('transform', `translate(${m.l},0)`).transition(t)
      .call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v}%`).tickSize(-(W - m.l - m.r + 10)).tickPadding(6));
    svg.selectAll('g.y .tick line').attr('stroke', C.borderDk);

    const line = d3.line().x((d) => x(d.i)).y((d) => y(d.p));
    const grp = svg.select('g.ls').selectAll('g.series').data(items, (d) => d.key).join(
      (en) => {
        const gg = en.append('g').attr('class', 'series');
        gg.append('path').attr('fill', 'none').attr('stroke-width', 2.5).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
        return gg;
      },
      (up) => up,
      (ex) => ex.transition().duration(dur(300)).style('opacity', 0).remove(),
    );
    grp.select('path').attr('stroke', (d) => LINE_STYLE[d.key].c).attr('stroke-dasharray', (d) => LINE_STYLE[d.key].dash)
      .each(function (d) {
        const p = d3.select(this);
        const fresh = !this.getAttribute('d');
        if (fresh && anim) {
          p.attr('d', line(d.vals.map((v) => ({ ...v, p: 0 })))).transition(t).attr('d', line(d.vals));
        } else p.transition(t).attr('d', line(d.vals));
      });
    const pts = grp.selectAll('path.pt').data((d) => d.vals).join('path').attr('class', 'pt')
      .attr('d', (d) => d3.symbol(d3[SYMS[d.key]], 70)())
      .attr('fill', (d) => LINE_STYLE[d.key].c).attr('stroke', C.black).attr('stroke-width', 1.5)
      .attr('tabindex', 0).attr('role', 'img').style('cursor', 'pointer')
      .attr('aria-label', (d) => `${d.label}, ${FR.scale[d.i]}: ${f1(d.p)} (${d.c} de ${d.n})`);
    pts.transition(t).attr('transform', (d) => `translate(${x(d.i)},${y(d.p)})`);
    bindTip(pts, (d) => `${d.label} · ${FR.scale[d.i].toLowerCase()} ${f1(d.p)} (${d.c}/${d.n})`, 'dark');

    // etiquetas al final con anti-colisión
    const ends = items.map((it) => ({ key: it.key, label: `${it.label} (n=${it.n})`, y: y(it.vals[4].p), yy: y(it.vals[4].p) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i += 1) if (ends[i].yy - ends[i - 1].yy < 15) ends[i].yy = ends[i - 1].yy + 15;
    svg.select('g.ends').selectAll('text').data(ends, (d) => d.key).join('text')
      .attr('font-family', 'JetBrains Mono, monospace').attr('font-size', mob ? 9.5 : 11).attr('font-weight', 500)
      .attr('fill', (d) => LINE_STYLE[d.key].c).text((d) => (mob ? LINE_STYLE[d.key].label : d.label))
      .transition(t).attr('x', x(4) + 12).attr('y', (d) => d.yy).attr('dy', '0.35em');

    svg.attr('aria-label', `Frecuencia en las últimas 2 semanas: ${items.map((it) => `${it.label} (n=${it.n}): ${it.vals.map((v) => `${FR.scale[v.i]} ${f1(v.p)}`).join(', ')}`).join('; ')}.`);
    linesDrawn = true;
  }

  function drawLead(D) {
    const keys = ['estres', 'ansiedad', 'depresivos'];
    const v = keys.map((k) => ({ k, c: D.cat[k], p: pct(D.cat[k], D.withD) }));
    const bar = d3.select('#leadBar');
    bar.attr('aria-label', `Entre ${D.withD} con malestar: ${v.map((d) => `${({ estres: 'estrés', ansiedad: 'ansiedad', depresivos: 'síntomas depresivos' })[d.k]} ${f1(d.p)}`).join(', ')}.`);
    bar.selectAll('span').data(v).join('span')
      .style('width', (d) => `${d.p}%`)
      .style('background', (d) => (d.k === 'estres' ? C.yellow : d.k === 'ansiedad'
        ? `repeating-linear-gradient(45deg, ${C.pink} 0 4px, #9b4475 4px 6px)` : `radial-gradient(circle, rgba(0,0,0,.45) 1.2px, transparent 1.5px) 0 0/6px 6px, ${C.blue}`));
    d3.select('#leadLabels').selectAll('span').data(v).join('span').style('width', (d) => `${d.p}%`).text((d) => f1(d.p));
  }

  /* ---------------- 07 · ficha y descarga ---------------- */
  function drawFicha() {
    const g = S.gender; const a = S.age;
    const ageTop = [...a].sort((p, q) => q.count - p.count);
    const others = ageTop.slice(2).reduce((s, x) => s + x.count, 0);
    const rows = [
      ['Muestra', `${S.meta.n} estudiantes · ${S.meta.faculties} facultades`],
      ['Género', `${g[0].count} M · ${g[1].count} H · ${g[2].count} NB · ${g[3].count} n/r`],
      ['Edad', `${ageTop[0].label} (${ageTop[0].count}) · ${ageTop[1].label} (${ageTop[1].count}) · otras (${others})`],
      ['Levantamiento', S.meta.fieldwork],
      ['Comparativo', 'EUROSTUDENT 8 (2021–2024), M1.1'],
    ];
    $('#ficha').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  function toCSV() {
    const out = [['tabla', 'categoria', 'subcategoria', 'conteo', 'base', 'porcentaje']];
    const add = (t, c, s, n, b) => out.push([t, c, s, n, b, b ? pct(n, b).toFixed(1) : '']);
    S.distress.categories.forEach((c) => add('malestar_principal', c.label, '', c.count, S.meta.n));
    S.faculties.forEach((f) => TYPE_KEYS.forEach((k) => add('malestar_por_facultad', f.full, k, f[k], f.n)));
    S.load.levels.forEach((l) => add('carga_percibida', l.label, '', l.count, S.load.n));
    S.distress2w.scale.forEach((s, i) => add('malestar_2_semanas', s, '', S.distress2w.counts[i], S.distress2w.n));
    S.frequency.items.forEach((it) => S.frequency.scale.forEach((s, i) => add('frecuencia_2_semanas', it.label, s, it.counts[i], it.n)));
    S.hours.values.forEach((v, i) => out.push(['horas_fuera_de_clase', `respuesta_${i + 1}`, '', v, S.hours.n, '']));
    S.gender.forEach((x) => add('genero', x.label, '', x.count, S.meta.n));
    S.age.forEach((x) => add('edad', x.label, '', x.count, S.meta.n));
    return out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  }

  /* ---------------- progreso, menú, aparición ---------------- */
  function setupNav() {
    const secs = [...document.querySelectorAll('main > section')];
    const ol = $('#progress');
    secs.forEach((s, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir a la sección ${i + 1}: ${s.dataset.title}`);
      b.addEventListener('click', () => s.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }));
      li.appendChild(b); ol.appendChild(li);
    });
    const btns = [...ol.querySelectorAll('button')];
    const vis = new Map();
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => vis.set(e.target, e.intersectionRatio));
      // sección activa: la que cruza el centro de la ventana
      const mid = window.innerHeight / 2;
      let idx = secs.findIndex((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
      if (idx < 0) idx = 0;
      btns.forEach((b, i) => b.setAttribute('aria-current', i === idx ? 'true' : 'false'));
      document.body.classList.toggle('on-light', secs[idx].dataset.theme === 'light');
    }, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-45% 0px -45% 0px' });
    secs.forEach((s) => io.observe(s));

    const mb = $('#menuBtn'); const menu = $('#menu');
    mb.addEventListener('click', () => {
      const open = mb.getAttribute('aria-expanded') === 'true';
      mb.setAttribute('aria-expanded', !open); menu.hidden = open;
      mb.setAttribute('aria-label', open ? 'Abrir menú de secciones' : 'Cerrar menú de secciones');
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideTip(); if (!menu.hidden) { menu.hidden = true; mb.setAttribute('aria-expanded', 'false'); mb.focus(); } } });
  }

  function onVisible(el, fn) {
    if (RM || !('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((ents) => {
      if (ents.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
    }, { threshold: 0.2 });
    io.observe(el);
  }

  function setupReveal() {
    const els = document.querySelectorAll('.reveal');
    if (RM || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------------- init ---------------- */
  async function init() {
    buildBadges();
    setupNav();
    setupReveal();
    try {
      [S, E] = await Promise.all([
        fetch('data/survey.json').then((r) => r.json()),
        fetch('data/eurostudent.json').then((r) => r.json()),
      ]);
    } catch (err) {
      document.querySelectorAll('.chart-box').forEach((b) => { b.innerHTML = '<p class="note">No se pudieron cargar los datos. Sirve la carpeta con un servidor local (ver README).</p>'; });
      return;
    }
    const D = derive();
    setV('n', S.meta.n);
    setV('withDistress', D.withD);
    setV('pctDistress', f1(pct(D.withD, S.meta.n)));
    setV('faculties', S.meta.faculties);
    setV('stress', D.cat.estres);
    setV('hoursMedian', S.hours.median);
    setV('hoursN', S.hours.n);
    setV('hoursRange', `${S.hours.min}–${S.hours.max}`);
    setV('loadN', S.load.n);
    setV('gap', D.gap.toFixed(1));
    setV('gapMin', f1(D.facs[D.facs.length - 1].p));
    setV('gapMax', f1(D.facs[0].p));
    setV('gapMinName', D.facs[D.facs.length - 1].short);
    setV('gapMaxName', D.facs[0].short);
    $('#maxGap').textContent = Math.round(D.gap);
    fitBadges();

    drawStar(D);
    drawFicha();
    drawLead(D);
    barExtras(D);
    euSetup(D);
    lineSetup();

    let barsOn = false; let euOn = false; let linesOn = false;
    onVisible($('#s2'), () => drawDonut(D));
    onVisible($('#s3'), () => drawLoad());
    onVisible($('#s4'), () => { barsOn = true; drawBars(D, true); });
    onVisible($('#s5'), () => { euOn = true; drawEU(D, true); });
    onVisible($('#s6'), () => { linesOn = true; drawLines(true); });

    let lastW = window.innerWidth;
    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      if (barsOn) drawBars(D, false);
      if (euOn) drawEU(D, false);
      if (linesOn) drawLines(false);
    }));

    $('#downloadBtn').addEventListener('click', () => {
      const blob = new Blob([`﻿${toCSV()}`], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'la-carga-invisible-datos.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  if (window.d3) init();
  else window.addEventListener('DOMContentLoaded', () => (window.d3 ? init() : console.error('D3 no cargó')));
})();
