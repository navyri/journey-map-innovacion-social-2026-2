/* ============================================================
   VAPE CYCLE · JOURNEY MAP  —  lógica de la página pública
   Login de equipo → mapa editable (5 etapas) → envío único
   ============================================================ */
(function () {
    'use strict';

    const CFG = window.VAPE_CONFIG || {};
    const TABLE = CFG.TABLE || 'journey_maps';
    const LS_KEY = 'vapecycle_maps_v1';

    /* ---------- conexión (Supabase) o modo local ---------- */
    let client = null;
    if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase &&
        typeof window.supabase.createClient === 'function') {
        try { client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
        catch (e) { client = null; }
    }
    const isRemote = !!client;

    const DB = {
        async list() {
            if (isRemote) {
                const { data, error } = await client.from(TABLE)
                    .select('*').order('created_at', { ascending: true });
                if (error) throw error;
                return data || [];
            }
            try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
            catch (e) { return []; }
        },
        async insert(rec) {
            if (isRemote) {
                const { error } = await client.from(TABLE).insert([rec]);
                if (error) throw error;
                return rec;
            }
            const all = await this.list();
            all.push(Object.assign({ id: 'local-' + Date.now(), created_at: new Date().toISOString() }, rec));
            localStorage.setItem(LS_KEY, JSON.stringify(all));
            return rec;
        }
    };

    /* ---------- contenido del mapa ---------- */
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
    function emoOf(level) {
        return BANDS.find(b => level <= b.max) || BANDS[BANDS.length - 1];
    }

    /* ---------- estado ---------- */
    function blankState() {
        const cells = {};
        TEXT_ORDER.forEach(k => { cells[k] = ['', '', '', '', '']; });
        /* Arco típico con el prototipo: uso normal → se agota → no sabe qué hacer → encuentra el punto → queda libre */
        return { mode: 'equipo', project: '', members: '', author: '', cells: cells, emotions: [70, 45, 25, 60, 90] };
    }
    let state = blankState();
    let readOnly = false;
    let savedRecord = null;

    /* ---------- utilidades ---------- */
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

    let toastTimer = null;
    function toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
    }

    /* ---------- avisos modales (misma estética del proyecto) ---------- */
    let modalResolve = null;
    function closeModal(value) {
        const m = $('modal');
        if (m.hidden) return;
        m.hidden = true;
        document.body.style.overflow = '';
        if (modalResolve) { const r = modalResolve; modalResolve = null; r(value); }
    }
    function modalAsk(opt) {
        return new Promise(resolve => {
            const m = $('modal');
            modalResolve = resolve;
            $('modal-tag').textContent = opt.tag || 'Aviso';
            $('modal-ic').textContent = opt.icon || '⚠️';
            $('modal-title').textContent = opt.title || '';
            $('modal-msg').textContent = opt.message || '';
            $('modal-yes').textContent = opt.ok || 'Aceptar';
            $('modal-no').textContent = opt.cancel || 'Cancelar';
            $('modal-no').hidden = opt.cancel === false;
            m.hidden = false;
            document.body.style.overflow = 'hidden';
            $('modal-yes').focus();
        });
    }
    $('modal-yes').addEventListener('click', () => closeModal(true));
    $('modal-no').addEventListener('click', () => closeModal(false));
    $('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(false); });

    function showView(name) {
        $('view-login').hidden = name !== 'login';
        $('view-map').hidden = name !== 'map';
        $('view-done').hidden = name !== 'done';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function grow(ta) {
        ta.style.height = 'auto';
        ta.style.height = (ta.scrollHeight + 2) + 'px';
    }

    /* ---------- render del mapa ---------- */
    let mode = null;
    const computeMode = () => (window.innerWidth >= 1160 ? 'table' : 'cards');

    function curSvg() {
        const pts = state.emotions.map((lvl, i) => [50 + i * 100, 88 - (lvl / 100) * 76]);
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

    function emoNode(i, blockMode) {
        const lvl = state.emotions[i];
        const e = emoOf(lvl);
        return `<div class="emo-node" data-i="${i}">
            <div class="emo-face">${e.emoji}</div>
            <span class="lvl">${e.label} · ${lvl}</span>
            <input type="range" min="0" max="100" step="5" value="${lvl}" data-em="${i}"
                aria-label="Nivel de ánimo en ${esc(STAGES[i].name)}" ${readOnly ? 'disabled' : ''}>
        </div>`;
    }

    function ta(key, i) {
        const val = esc(state.cells[key][i]);
        return `<textarea data-row="${key}" data-i="${i}" placeholder="${esc(ROWS[key].ph)}"
            ${readOnly ? 'disabled' : ''}>${val}</textarea>`;
    }

    function renderTable() {
        let h = `<div class="corner-cell">Filas ↓ / Etapas →</div>`;
        STAGES.forEach(s => {
            h += `<div class="stage-head" style="--a:${s.color}"><span class="ic">${s.icon}</span>${s.name}</div>`;
        });

        BOARD_ORDER.forEach(part => {
            if (part === 'EMOTIONS') {
                h += `<div class="row-label"><span class="ic">🙂</span>Emociones
                        <small>¿Cómo se siente en cada etapa? (0–100)</small></div>
                    <div class="emo-row">
                        <div class="emo-curve">${curSvg()}</div>
                        <div class="emo-faces">${state.emotions.map((_, i) => emoNode(i, false)).join('')}</div>
                    </div>`;
                return;
            }
            const r = ROWS[part];
            h += `<div class="row-label"><span class="ic">${r.icon}</span>${r.label}<small>${r.hint}</small></div>`;
            STAGES.forEach((s, i) => {
                h += `<div class="cell" style="--a:${s.color}">${ta(part, i)}</div>`;
            });
        });
        return h;
    }

    function renderCards() {
        return STAGES.map((s, i) => {
            let h = `<section class="stage-card">
                <div class="stage-head" style="--a:${s.color}">
                    <span class="ic">${s.icon}</span>Etapa ${i + 1} · ${s.name}</div>
                <div class="fields">`;
            TEXT_ORDER.forEach(key => {
                const r = ROWS[key];
                h += `<div class="f">
                    <label for="">${r.icon} ${r.label} <small>${r.hint}</small></label>
                    ${ta(key, i)}
                </div>`;
            });
            h += `</div>
                <div class="emo-block">
                    <div class="lbl">🙂 Emociones <small>¿Cómo se siente en esta etapa? (0–100)</small></div>
                    ${emoNode(i, true)}
                </div>
            </section>`;
            return h;
        }).join('');
    }

    function renderMap() {
        mode = computeMode();
        if (mode === 'table') {
            $('board-wrap').hidden = false;
            $('stages').hidden = true;
            $('board').innerHTML = renderTable();
            $('board').querySelectorAll('textarea').forEach(grow);
        } else {
            $('board-wrap').hidden = true;
            $('stages').hidden = false;
            $('stages').innerHTML = renderCards();
            $('stages').querySelectorAll('textarea').forEach(grow);
        }
        updateStatus();
    }

    function updateCurve() {
        const cur = document.querySelector('.emo-curve');
        if (cur) cur.innerHTML = curSvg();
    }

    function missingFields() {
        let n = 0;
        TEXT_ORDER.forEach(k => state.cells[k].forEach(v => { if (!String(v).trim()) n++; }));
        return n;
    }

    function updateStatus() {
        const bar = $('fill-status');
        if (!bar) return;
        if (readOnly) { bar.textContent = 'Vista de solo lectura · este mapa ya fue enviado'; return; }
        const n = missingFields();
        bar.textContent = n === 0
            ? '✅ Todos los campos completos. ¡Listo para guardar!'
            : `Faltan ${n} campo${n === 1 ? '' : 's'} por completar`;
    }

    function refreshEmoNode(i) {
        const lvl = state.emotions[i];
        const e = emoOf(lvl);
        document.querySelectorAll('.emo-node[data-i="' + i + '"]').forEach(node => {
            const face = node.querySelector('.emo-face');
            const lvlEl = node.querySelector('.lvl');
            if (face) face.textContent = e.emoji;
            if (lvlEl) lvlEl.textContent = e.label + ' · ' + lvl;
            const rng = node.querySelector('input[type=range]');
            if (rng && +rng.value !== lvl) rng.value = lvl;
        });
        updateCurve();
    }

    /* ---------- eventos del mapa ---------- */
    function bindBoard(container) {
        container.addEventListener('input', ev => {
            const t = ev.target;
            if (t.tagName === 'TEXTAREA') {
                state.cells[t.dataset.row][+t.dataset.i] = t.value;
                grow(t);
                updateStatus();
            } else if (t.type === 'range') {
                state.emotions[+t.dataset.em] = +t.value;
                refreshEmoNode(+t.dataset.em);
                updateStatus();
            }
        });
    }
    bindBoard($('board'));
    bindBoard($('stages'));

    /* ---------- login ---------- */
    function loginError(msg) {
        const e = $('login-err');
        e.hidden = !msg;
        e.textContent = msg || '';
    }

    /* ---------- modalidad: individual o en equipo ---------- */
    function applyMode() {
        const mode = $('f-mode').value;
        const team = mode === 'equipo';
        $('grp-team').hidden = !team;
        $('grp-solo').hidden = team;
        $('mode-hint').textContent = team
            ? 'Se guarda el proyecto con todos sus miembros (no se pide nombre personal).'
            : 'Se guarda el proyecto llenado por una sola persona.';
        $('f-members').value = team ? $('f-members').value : '';
        if (team) $('f-author').value = '';
        loginError('');
    }
    $('f-mode').addEventListener('change', applyMode);
    applyMode();

    $('login-form').addEventListener('submit', async ev => {
        ev.preventDefault();
        loginError('');

        const mode = $('f-mode').value;
        const project = $('f-project').value.trim();
        const members = mode === 'equipo' ? $('f-members').value.trim() : '';
        const author = mode === 'individual' ? $('f-author').value.trim() : '';

        if (!project) return loginError('Escribe el nombre de tu proyecto.');
        if (mode === 'equipo' && !members) return loginError('Agrega al menos un miembro del equipo.');
        if (mode === 'individual' && !author) return loginError('Escribe tu nombre individual.');

        const btn = $('btn-enter');
        btn.disabled = true;
        btn.textContent = 'Verificando…';

        try {
            const all = await DB.list();
            const dup = all.find(r => norm(r.project) === norm(project));

            state = blankState();
            state.mode = mode;
            state.project = project;
            state.members = members.replace(/\s*\n\s*/g, ', ');
            state.author = author;
            savedRecord = null;
            readOnly = false;

            if (dup) {
                // Envío único: se muestra el mapa ya registrado (solo lectura)
                state.mode = dup.mode || (dup.members ? 'equipo' : 'individual');
                state.project = dup.project;
                state.members = dup.members || '';
                state.author = dup.author || '';
                TEXT_ORDER.forEach(k => {
                    state.cells[k] = (dup.cells && dup.cells[k] ? dup.cells[k] : []).slice(0, 5);
                    while (state.cells[k].length < 5) state.cells[k].push('');
                });
                state.emotions = (dup.emotions || []).slice(0, 5);
                while (state.emotions.length < 5) state.emotions.push(50);
                readOnly = true;
                savedRecord = dup;

                $('map-notice').hidden = false;
                $('map-notice').innerHTML = `<b>⚠️ El proyecto “${esc(dup.project)}” ya envió su mapa.</b>
                    Solo se permite un envío por proyecto, así que aquí puedes consultar lo que registraron
                    ${dup.author ? `(persona que lo llenó: ${esc(dup.author)})` : '(todo el equipo)'}.
                    `;
                $('save-bar').hidden = true;
                toast('Este proyecto ya tiene un mapa guardado');
            } else {
                $('map-notice').hidden = true;
                $('save-bar').hidden = false;
            }

            fillHead();
            showView('map');
            renderMap();
        } catch (err) {
            console.error(err);
            loginError(isRemote
                ? 'No pudimos cargar los datos. Revisa tu conexión e inténtalo de nuevo.'
                : 'Ocurrió un error al leer los datos. Inténtalo de nuevo.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Entrar al mapa →';
        }
    });

    function fillHead() {
        const team = state.mode === 'equipo';
        $('mh-project').textContent = state.project;
        $('mh-members').textContent = team
            ? 'Modalidad: En equipo · ' + state.members
            : 'Modalidad: Individual';
        $('mh-author').textContent = team ? 'Llenado por: todo el equipo' : 'Llenado por: ' + state.author;
    }

    $('btn-exit').addEventListener('click', () => {
        showView('login');
        loginError('');
    });

    /* ---------- guardar ---------- */
    $('btn-save').addEventListener('click', async () => {
        const miss = missingFields();
        const err = $('save-err');
        err.hidden = true;

        if (miss > 0) {
            err.hidden = false;
            err.textContent = `Aún faltan ${miss} campo${miss === 1 ? '' : 's'}. Completa todas las casillas
                del mapa antes de guardar (cada etapa tiene 4 preguntas).`;
            toast('Mapa incompleto');
            const first = Array.from(document.querySelectorAll('textarea'))
                .find(t => !t.value.trim() && !t.disabled);
            if (first) {
                first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => first.focus(), 350);
            }
            return;
        }

        const isTeam = state.mode === 'equipo';
        const ok = await modalAsk({
            tag: 'Confirmar envío',
            icon: isTeam ? '👥' : '🙋',
            title: isTeam ? `¿Guardar el mapa de “${state.project}”?` : `¿Guardar tu mapa, ${state.author}?`,
            message: 'Recuerda: es un ENVÍO ÚNICO y después no podrás modificarlo.',
            ok: 'Sí, guardar',
            cancel: 'Revisar otra vez'
        });
        if (!ok) return;

        const btn = $('btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando…';

        const rec = {
            mode: state.mode,
            project: state.project,
            members: state.members,
            author: state.author,
            cells: state.cells,
            emotions: state.emotions
        };

        try {
            savedRecord = await DB.insert(rec);
            readOnly = true;
            $('done-summary').innerHTML = `
                <div><b>Modalidad</b><span>${isTeam ? '👥 En equipo' : '🙋 Individual'}</span></div>
                <div><b>Proyecto</b><span>${esc(state.project)}</span></div>
                ${isTeam ? `<div><b>Miembros</b><span>${esc(state.members)}</span></div>` : ''}
                <div><b>Llenado por</b><span>${isTeam ? 'Todo el equipo' : esc(state.author)}</span></div>
                <div><b>Fecha</b><span>${new Date().toLocaleString('es-CO')}</span></div>
                <div><b>Estado</b><span>✅ Enviado correctamente${isRemote ? '' : ' (guardado solo en este dispositivo)'}</span></div>`;
            showView('done');
            toast('Mapa guardado ✅');
        } catch (e) {
            console.error(e);
            err.hidden = false;
            err.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
            toast('Error al guardar');
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Guardar mi mapa (envío único)';
        }
    });

    $('btn-view-saved').addEventListener('click', () => {
        readOnly = true;
        $('map-notice').hidden = false;
        $('map-notice').innerHTML = '<b>🔒 Solo lectura:</b> este mapa ya fue enviado y no se puede editar.';
        $('save-bar').hidden = true;
        fillHead();
        showView('map');
        renderMap();
    });

    $('btn-again').addEventListener('click', () => {
        state = blankState();
        readOnly = false;
        savedRecord = null;
        $('login-form').reset();
        loginError('');
        showView('login');
    });

    /* ---------- responsive ---------- */
    let rt = null;
    window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
            const m = computeMode();
            if (m !== mode && !$('view-map').hidden) renderMap();
        }, 150);
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (!$('view-map').hidden) renderMap(); });
    }

    showView('login');
})();
