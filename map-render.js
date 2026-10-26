/* ============================================================
   VAPE CYCLE · RENDER COMPARTIDO DEL JOURNEY MAP
   ------------------------------------------------------------
   Única fuente de verdad de etapas, filas y curva de emociones.
   La usa la página de llenado (app.js) y el panel (panel.js),
   así el mapa se ve IGUAL al llenarlo y al revisarlo.
   - ≥1160 px → tabla (filas × etapas)
   - <1160 px → tarjetas apiladas (celular)
   ============================================================ */
(function () {
    'use strict';

    const STAGES = [
        { name: 'Tengo el vape', icon: '💨', color: 'var(--pink)' },
        { name: 'Se me acaba', icon: '🔋', color: 'var(--orange)' },
        { name: '¿Y ahora qué?', icon: '🤔', color: 'var(--lime)' },
        { name: 'Encontrar el punto', icon: '📍', color: 'var(--teal)' },
        { name: 'Libre del vape', icon: '✅', color: 'var(--lav)' }
    ];

    const ROWS = {
        needs: {
            label: 'Necesidades', icon: '🎯', hint: '¿Qué necesita saber o sentir el usuario?',
            ph: 'Escribe aquí…'
        },
        touchpoints: {
            label: 'Puntos de contacto', icon: '📍', hint: '¿Dónde interactúa con el proyecto?',
            ph: 'Escribe aquí…'
        },
        thoughts: {
            label: 'Pensamientos', icon: '💭', hint: '¿Qué se dice o se piensa en esta etapa?',
            ph: 'Escribe aquí…'
        },
        solutions: {
            label: 'Soluciones posibles', icon: '✅', hint: '¿Cómo responde el proyecto en esta etapa?',
            ph: 'Escribe aquí…'
        }
    };
    const TEXT_ORDER = ['needs', 'touchpoints', 'thoughts', 'solutions'];

    /* Orden visual = el del diseño original (emociones entre pensamientos y soluciones) */
    const BOARD_ORDER = ['needs', 'touchpoints', 'thoughts', 'EMOTIONS', 'solutions'];

    const BANDS = [
        { max: 16, emoji: '😫', label: 'Frustrado' },
        { max: 33, emoji: '😕', label: 'Confundido' },
        { max: 50, emoji: '😐', label: 'Neutral' },
        { max: 66, emoji: '🙂', label: 'Conforme' },
        { max: 83, emoji: '😃', label: 'Feliz' },
        { max: 100, emoji: '🤩', label: 'Encantado' }
    ];
    const emoOf = level => BANDS.find(b => level <= b.max) || BANDS[BANDS.length - 1];

    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const cellVal = (cells, key, i) => String(((cells || {})[key] || [])[i] || '');
    const lvlOf = (emotions, i) => {
        const v = (emotions || [])[i];
        return typeof v === 'number' ? v : 50;
    };

    /* ---------- curva de emociones ---------- */
    function curve(emotions) {
        const pts = STAGES.map((_, i) => [50 + i * 100, 88 - (lvlOf(emotions, i) / 100) * 76]);
        const p0 = pts[0], pn = pts[pts.length - 1];
        let d = `M ${p0[0]},${p0[1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i - 1] || pts[i], b = pts[i], c = pts[i + 1], e = pts[i + 2] || c;
            const c1x = b[0] + (c[0] - a[0]) / 6, c1y = b[1] + (c[1] - a[1]) / 6;
            const c2x = c[0] - (e[0] - b[0]) / 6, c2y = c[1] - (e[1] - b[1]) / 6;
            d += ` C ${c1x},${c1y} ${c2x},${c2y} ${c[0]},${c[1]}`;
        }
        let svg = `<svg viewBox="0 0 500 100" preserveAspectRatio="none">
            <path d="${d}" fill="none" stroke="var(--ink)" stroke-width="2" opacity=".55" vector-effect="non-scaling-stroke"/>`;
        pts.forEach((p, i) => {
            svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="${STAGES[i].color}" stroke="var(--ink)" stroke-width="1.4"/>`;
        });
        return svg + '</svg>';
    }

    function emoNode(i, emotions, readOnly) {
        const lvl = lvlOf(emotions, i);
        const e = emoOf(lvl);
        return `<div class="emo-node" data-i="${i}">
            <div class="emo-face">${e.emoji}</div>
            <span class="lvl">${e.label} · ${lvl}</span>
            <input type="range" min="0" max="100" step="5" value="${lvl}" data-em="${i}"
                aria-label="Nivel de ánimo en ${esc(STAGES[i].name)}" ${readOnly ? 'disabled' : ''}>
        </div>`;
    }

    function ta(key, i, cells, readOnly) {
        return `<textarea data-row="${key}" data-i="${i}" placeholder="${esc(ROWS[key].ph)}"
            ${readOnly ? 'disabled' : ''}>${esc(cellVal(cells, key, i))}</textarea>`;
    }

    /* ---------- tabla (escritorio) ---------- */
    function table(data, opts) {
        const cells = data.cells, emotions = data.emotions, ro = !!opts.readOnly;
        let h = `<div class="corner-cell">Filas ↓ / Etapas →</div>`;
        STAGES.forEach(s => {
            h += `<div class="stage-head" style="--a:${s.color}"><span class="ic">${s.icon}</span>${s.name}</div>`;
        });

        BOARD_ORDER.forEach(part => {
            if (part === 'EMOTIONS') {
                h += `<div class="row-label"><span class="ic">🙂</span>Emociones
                        <small>¿Cómo se siente en cada etapa? (0–100)</small></div>
                    <div class="emo-row">
                        <div class="emo-curve">${curve(emotions)}</div>
                        <div class="emo-faces">${STAGES.map((_, i) => emoNode(i, emotions, ro)).join('')}</div>
                    </div>`;
                return;
            }
            const r = ROWS[part];
            h += `<div class="row-label"><span class="ic">${r.icon}</span>${r.label}<small>${r.hint}</small></div>`;
            STAGES.forEach((s, i) => {
                h += `<div class="cell" style="--a:${s.color}">${ta(part, i, cells, ro)}</div>`;
            });
        });
        return h;
    }

    /* ---------- tarjetas (celular) ---------- */
    function cards(data, opts) {
        const cells = data.cells, emotions = data.emotions, ro = !!opts.readOnly;
        return STAGES.map((s, i) => {
            let h = `<section class="stage-card">
                <div class="stage-head" style="--a:${s.color}">
                    <span class="ic">${s.icon}</span>Etapa ${i + 1} · ${s.name}</div>
                <div class="fields">`;
            TEXT_ORDER.forEach(key => {
                const r = ROWS[key];
                h += `<div class="f">
                    <label for="">${r.icon} ${r.label} <small>${r.hint}</small></label>
                    ${ta(key, i, cells, ro)}
                </div>`;
            });
            h += `</div>
                <div class="emo-block">
                    <div class="lbl">🙂 Emociones <small>¿Cómo se siente en esta etapa? (0–100)</small></div>
                    ${emoNode(i, emotions, ro)}
                </div>
            </section>`;
            return h;
        }).join('');
    }

    /* ---------- ajuste de altura de las casillas ----------
       No hay límite de caracteres: el texto se puede escribir todo lo largo que
       se quiera. La casilla crece con el contenido hasta MAX_H px; si lo supera,
       queda fija y muestra un scroll sutil en su interior en vez de alargar
       todavía más la página. */
    const MAX_H = 154;

    function fit(t) {
        t.style.height = 'auto';
        const h = t.scrollHeight + 2;
        t.style.height = Math.min(h, MAX_H) + 'px';
        t.style.overflowY = h > MAX_H ? 'auto' : 'hidden';
    }

    /* ---------- render principal ---------- */
    function render(container, data, opts) {
        opts = opts || {};
        const wide = opts.force ? opts.force === 'table' : window.innerWidth >= 1160;
        container.innerHTML = wide ? table(data, opts) : cards(data, opts);
        container.querySelectorAll('textarea').forEach(fit);
        /* red de seguridad: si el contenedor estaba oculto al medir (altura 0),
           se vuelve a ajustar en el siguiente cuadro, cuando ya es visible */
        requestAnimationFrame(() => container.querySelectorAll('textarea').forEach(fit));
        return wide ? 'table' : 'cards';
    }

    window.VapeMap = {
        STAGES: STAGES, ROWS: ROWS, TEXT_ORDER: TEXT_ORDER, BOARD_ORDER: BOARD_ORDER,
        BANDS: BANDS, emoOf: emoOf, curve: curve, emoNode: emoNode,
        table: table, cards: cards, render: render, fit: fit
    };
})();
