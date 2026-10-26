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

    /* ---------- contenido del mapa (definido en map-render.js) ---------- */
    const M = window.VapeMap;
    const STAGES = M.STAGES;
    const TEXT_ORDER = M.TEXT_ORDER;
    const emoOf = M.emoOf;

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
    let demo = false;

    /* ---------- borrador automático ----------
       Se guarda el avance en este dispositivo mientras se escribe, por si se
       cierra la pestaña o se pierde la conexión. Al reingresar con el MISMO
       nombre de proyecto se retoma donde quedó. El orden de los miembros no
       importa: la llave es solo el nombre del proyecto. */
    const draftKey = p => 'vapecycle_draft_' + norm(p);
    function writeDraft() {
        if (demo || readOnly || !state.project) return;
        try {
            localStorage.setItem(draftKey(state.project), JSON.stringify({
                mode: state.mode, project: state.project, members: state.members, author: state.author,
                cells: state.cells, emotions: state.emotions, t: new Date().toISOString()
            }));
        } catch (e) { /* sin espacio de almacenamiento */ }
    }
    function readDraft(p) {
        try { const s = localStorage.getItem(draftKey(p)); return s ? JSON.parse(s) : null; }
        catch (e) { return null; }
    }
    function dropDraft(p) { try { localStorage.removeItem(draftKey(p || state.project)); } catch (e) { } }
    let draftTimer = null;
    function scheduleDraft() {
        clearTimeout(draftTimer);
        draftTimer = setTimeout(writeDraft, 400);
    }
    window.addEventListener('beforeunload', writeDraft);
    document.addEventListener('visibilitychange', () => { if (document.hidden) writeDraft(); });

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
            if (opt.html) { $('modal-msg').innerHTML = opt.html; }
            else { $('modal-msg').textContent = opt.message || ''; }
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

    /* la casilla crece con el texto, pero con un tope: si es muy larga
       muestra un scroll sutil en su interior (sin límite de caracteres) */
    function grow(ta) {
        M.fit(ta);
    }

    /* ---------- render del mapa (usa el render compartido map-render.js) ---------- */
    let mode = null;
    const computeMode = () => (window.innerWidth >= 1160 ? 'table' : 'cards');

    function renderMap() {
        mode = computeMode();
        $('board-wrap').hidden = mode !== 'table';
        $('stages').hidden = mode === 'table';
        M.render(mode === 'table' ? $('board') : $('stages'),
            { cells: state.cells, emotions: state.emotions },
            { readOnly: readOnly, force: mode });
        updateStatus();
    }

    function updateCurve() {
        const cur = document.querySelector('.emo-curve');
        if (cur) cur.innerHTML = M.curve(state.emotions);
    }

    function missingFields() {
        let n = 0;
        TEXT_ORDER.forEach(k => state.cells[k].forEach(v => { if (!String(v).trim()) n++; }));
        return n;
    }

    function updateStatus() {
        const bar = $('fill-status');
        updateDots();
        if (!bar) return;
        if (readOnly) { bar.textContent = 'Vista de solo lectura · este mapa ya fue enviado'; return; }
        const n = missingFields();
        bar.textContent = n === 0
            ? '✅ Todos los campos completos. ¡Listo para guardar!'
            : `Faltan ${n} campo${n === 1 ? '' : 's'} por completar (${20 - n}/20)`;
    }

    /* barra de progreso: un punto por cada una de las 20 casillas */
    function buildDots() {
        const box = $('dots');
        if (!box) return;
        let h = '';
        STAGES.forEach((s, i) => {
            TEXT_ORDER.forEach(k => {
                h += `<span class="dot" style="--a:${s.color}" data-k="${k}" data-i="${i}"></span>`;
            });
        });
        box.innerHTML = h;
    }

    function updateDots() {
        const box = $('dots');
        if (!box) return;
        box.hidden = readOnly;
        if (readOnly) return;
        box.querySelectorAll('.dot').forEach(d => {
            const v = state.cells[d.dataset.k][+d.dataset.i];
            d.classList.toggle('on', !!String(v || '').trim());
        });
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
            scheduleDraft();
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
                $('map-notice').innerHTML = `<b>👋 ¡Hola de nuevo! El proyecto “${esc(dup.project)}” ya registró su mapa.</b>
                    Aquí está lo que enviaron ${dup.author ? `(lo llenó ${esc(dup.author)})` : '(todo el equipo)'}
                    y, como el envío es único, se abre en <b>solo lectura</b>.
                    `;
                $('save-bar').hidden = true;
                toast('Ya tenían mapa guardado · lo abrimos en solo lectura');
            } else {
                $('map-notice').hidden = true;
                $('save-bar').hidden = false;

                /* ¿Hay un borrador sin enviar en este dispositivo? Se retoma el avance */
                const dr = readDraft(project);
                if (dr && dr.cells) {
                    TEXT_ORDER.forEach(k => {
                        state.cells[k] = (dr.cells[k] || []).slice(0, 5);
                        while (state.cells[k].length < 5) state.cells[k].push('');
                    });
                    state.emotions = (dr.emotions || []).slice(0, 5);
                    while (state.emotions.length < 5) state.emotions.push(50);
                    $('map-notice').hidden = false;
                    $('map-notice').innerHTML = `<b>✍️ Retomamos tu avance.</b>
                        Había un borrador de “${esc(project)}” guardado en este dispositivo
                        ${dr.t ? '(' + esc(new Date(dr.t).toLocaleString('es-CO')) + ')' : ''}:
                        sigue desde donde quedaste.`;
                    toast('Borrador recuperado ✍️');
                }
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
        if (demo) { exitDemo(); return; }
        writeDraft();
        showView('login');
        loginError('');
    });

    /* ---------- MODO DEMO: se ve completo pero NO se guarda nada ---------- */
    const SAVE_LABEL = '✅ Guardar mi mapa (envío único)';
    const DEMO_CELLS = {
        needs: [
            'Saber que el vape le da su dosis y que dura lo que promete; sentir que es práctico para llevar.',
            'Entender cuándo ya se acabó: sabor flojo, vapor menos denso y la luz que parpadea.',
            'Conocer el lugar exacto donde puede botarlo sin dañar nada ni que lo regañen.',
            'Ver un punto cercano, visible y claro: qué depositar y cómo hacerlo.',
            'Sentir que se deshizo del residuo de forma responsable y sin esfuerzo.'
        ],
        touchpoints: [
            'La tienda o las máquinas del campus, el envase y el vape en el bolsillo.',
            'El dispositivo en la mano, la luz de alerta y el sabor que va bajando.',
            'El contenedor ordinario del salón (el error de siempre), el celular y los carteles del pasillo.',
            'El contenedor Vape Cycle en accesos y zonas comunes, con su adhesivo e instructivo.',
            'El gesto de depositar, la confirmación visual y la charla con sus compañeros.'
        ],
        thoughts: [
            '«Es cómodo y no deja olor», «no necesito encendedores ni recargas».',
            '«¿Se acabó o está fallando?», «otra vez tengo que gastar».',
            '«¿Lo tiro con la basura?», «¿esto se recicla?», «ojalá no se prenda algo».',
            '«¡Aquí sí lo puedo dejar!», «es sencillo, solo lo dejo ahí».',
            '«Ya quedé con esto», «le aviso a mis compañeros que también lo usen».'
        ],
        solutions: [
            'Producto ya conocido; Vape Cycle se ubica como la opción para cuando el vape termine.',
            'Guía rápida de señales de agotamiento y recordatorio de que ya no debe seguir usándose.',
            'Señalización clara, mapa de puntos Vape Cycle en el campus y explicación de por qué no va a la basura.',
            'Contenedor identificado con la marca, instrucciones de 3 pasos y apertura frontal fácil.',
            'Retroalimentación inmediata («¡Gracias! Tu vape va a ser separado») y comunicación de qué pasa después.'
        ]
    };
    const DEMO_EMOTIONS = [70, 45, 25, 60, 90];

    function startDemo() {
        demo = true;
        state = blankState();
        state.mode = 'equipo';
        state.project = 'Demo · Journey Map';
        state.members = 'Así se ve un equipo llenando el mapa';
        state.author = 'Demostración';
        TEXT_ORDER.forEach(k => { state.cells[k] = DEMO_CELLS[k].slice(); });
        state.emotions = DEMO_EMOTIONS.slice();
        readOnly = false;
        savedRecord = null;
        $('map-notice').hidden = false;
        $('map-notice').innerHTML = '<b>🧪 Modo demo:</b> escribe y mueve los deslizadores para ver cómo funciona. ' +
            '<b>Esto no se guarda</b> ni aparece en los resultados reales.';
        $('save-bar').hidden = false;
        $('btn-save').textContent = '🧪 Probar el botón de guardar (no se guarda)';
        loginError('');
        fillHead();
        showView('map');
        renderMap();
        updateStatus();
        toast('Modo demo activo 🧪');
    }

    function exitDemo() {
        demo = false;
        state = blankState();
        readOnly = false;
        savedRecord = null;
        $('btn-save').textContent = SAVE_LABEL;
        $('map-notice').hidden = true;
        showView('login');
        toast('Saliste de la demo');
    }

    const demoBtn = $('btn-demo');
    if (demoBtn) demoBtn.addEventListener('click', startDemo);
    if (/[?&]demo=1\b/.test(location.search)) startDemo();

    /* ---------- guardar ---------- */
    /* ---------- vista previa del mapa (dentro del modal de confirmación) ---------- */
    /* Sin recorte de texto: se muestra el contenido completo de cada casilla
       (no hay límite de caracteres) y el desbordamiento lo resuelve el
       scroll propio del modal. */
    function previewHTML() {
        const steps = STAGES.map((s, i) => {
            const e = emoOf(state.emotions[i]);
            return `<span class="pv-step" style="--a:${s.color}">
                <b>${e.emoji}</b><i>${esc(s.name)}</i><u>${state.emotions[i]}</u></span>`;
        }).join('');

        const stages = STAGES.map((s, i) => {
            const rows = TEXT_ORDER.map(k => {
                const r = M.ROWS[k];
                const v = esc(String(state.cells[k][i] == null ? '' : state.cells[k][i]).trim())
                    .replace(/\n/g, '<br>');
                return `<div class="pv-row"><b>${r.icon} ${r.label}</b><span>${v || '<em>—</em>'}</span></div>`;
            }).join('');
            return `<div class="pv-stage" style="--a:${s.color}">
                <h5><span>${s.icon}</span> Etapa ${i + 1} · ${s.name}</h5>${rows}</div>`;
        }).join('');

        return `<div class="prev">
            <div class="prev-warn">⚠️ Al enviar este mapa <b>ya no podrás editarlo</b>. Revisa que todo esté bien.</div>
            <div class="prev-curve">${M.curve(state.emotions)}</div>
            <div class="prev-steps">${steps}</div>
            <div class="prev-body">${stages}</div>
        </div>`;
    }

    $('btn-save').addEventListener('click', async () => {
        const err = $('save-err');
        err.hidden = true;

        /* Modo demo: nada se guarda ni se envía */
        if (demo) {
            const stay = await modalAsk({
                tag: 'Modo demo', icon: '🧪',
                title: 'Esto es solo una demostración',
                message: 'Aquí se ve cómo se llena el journey map, pero nada de lo que escribas se guarda ni aparece en los resultados reales.',
                ok: 'Seguir explorando', cancel: 'Salir de la demo'
            });
            if (!stay) exitDemo();
            return;
        }

        const miss = missingFields();

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
            tag: 'Vista previa',
            icon: isTeam ? '👥' : '🙋',
            title: isTeam ? `¿Enviar el mapa de “${state.project}”?` : `¿Enviar tu mapa, ${state.author}?`,
            html: previewHTML(),
            ok: '✅ Enviar definitivamente',
            cancel: '← Seguir editando'
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
            dropDraft(state.project);
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
            const dupErr = e && (e.code === '23505' || /duplicate|unique/i.test(String(e.message || '')));
            err.hidden = false;
            err.textContent = dupErr
                ? 'Ese nombre de proyecto ya está registrado por otro equipo. Revisa el nombre exacto de TU proyecto.'
                : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
            toast(dupErr ? 'Ese proyecto ya existe' : 'Error al guardar');
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

    buildDots();                 // 20 casillas de progreso, una por campo del mapa
    if (demo) updateStatus();    // la demo ya abrió la vista del mapa: pinta los puntos
    else showView('login');
})();
