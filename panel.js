/* ============================================================
   VAPE CYCLE · PANEL PRIVADO — ver, buscar y exportar respuestas
   ============================================================ */
(function () {
    'use strict';

    const CFG = window.VAPE_CONFIG || {};
    const TABLE = CFG.TABLE || 'journey_maps';
    const LS_KEY = 'vapecycle_maps_v1';

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
                    .select('*').order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            }
            try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]').reverse(); }
            catch (e) { return []; }
        }
    };

    /* etapas, filas y curva vienen del render compartido (map-render.js) */
    const M = window.VapeMap;
    const STAGES = M.STAGES;
    const emoOf = M.emoOf;

    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

    let records = [];
    let currentGroups = [];
    let unlocked = false;

    let toastTimer = null;
    function toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
    }

    /* ---------- ojito: previsualizar u ocultar la contraseña ---------- */
    function eyeIcon(visible) {
        const eye = $('btn-eye');
        eye.classList.toggle('is-on', !!visible);   // muestra el icono de "ojo tachado"
        eye.setAttribute('aria-pressed', String(!!visible));
        eye.setAttribute('aria-label', visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña');
    }
    function resetEye() { $('pw').type = 'password'; eyeIcon(false); }
    $('btn-eye').addEventListener('click', () => {
        const inp = $('pw');
        const nowVisible = inp.type === 'password';
        inp.type = nowVisible ? 'text' : 'password';
        eyeIcon(nowVisible);
        inp.focus();
    });

    /* ---------- acceso ---------- */
    function tryUnlock() {
        const val = $('pw').value;
        if (val === (CFG.ADMIN_PASSWORD || '')) {
            unlocked = true;
            sessionStorage.setItem('vc_panel', '1');
            $('view-gate').hidden = true;
            $('view-panel').hidden = false;
            $('pw-err').hidden = true;
            load();
            startAuto();
        } else {
            $('pw-err').hidden = false;
            $('pw').value = '';
            $('pw').focus();
        }
    }
    $('btn-unlock').addEventListener('click', tryUnlock);
    $('pw').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

    /* ---------- carga ---------- */
    async function load(silent) {
        const box = $('teams');
        const antes = records.length;
        if (!silent) box.innerHTML = '<div class="box"><p class="empty">Cargando respuestas…</p></div>';
        try {
            records = await DB.list();
            $('panel-updated').textContent =
                (isRemote ? 'Actualizado ' : 'Solo en este dispositivo · ') +
                new Date().toLocaleString('es-CO');
            render();
            if (silent && records.length > antes && antes > 0) {
                toast(`Llegaron ${records.length - antes} respuesta${records.length - antes === 1 ? '' : 's'} nueva${records.length - antes === 1 ? '' : 's'} 🎉`);
            }
        } catch (e) {
            console.error(e);
            if (silent) return;   // en segundo plano no se tumba lo que se está viendo
            box.innerHTML = '<div class="box"><p class="empty">⚠️ No se pudo cargar la información. ' +
                'Revisa tu conexión y pulsa “Actualizar”.</p></div>';
            $('stats').innerHTML = '';
            $('avg').hidden = true;
        }
    }
    $('btn-refresh').addEventListener('click', () => load());

    /* ---------- actualización automática cada 45 s ---------- */
    let autoTimer = null;
    function startAuto() {
        stopAuto();
        autoTimer = setInterval(() => {
            if (!unlocked || document.hidden) return;
            if (detailIndex !== null) return;               // no interrumpir la vista detalle
            if (($('search').value || '').trim()) return;   // no pisar una búsqueda activa
            load(true);
        }, 45000);
    }
    function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    /* ---------- cerrar sesión ---------- */
    $('btn-logout').addEventListener('click', () => {
        sessionStorage.removeItem('vc_panel');
        unlocked = false;
        stopAuto();
        records = [];
        $('pw').value = '';
        resetEye();
        $('pw-err').hidden = true;
        $('teams').innerHTML = '';
        $('stats').innerHTML = '';
        detailIndex = null;
        $('dt-resp').innerHTML = '';
        $('view-detail').hidden = true;
        $('view-panel').hidden = true;
        $('view-gate').hidden = false;
        $('pw').focus();
        toast('Sesión cerrada 🔒');
    });

    /* ---------- agrupar por equipo ---------- */
    function groups() {
        const map = new Map();
        records.forEach(r => {
            const k = norm(r.project) || '(sin registro)';
            const mode = r.mode || (r.members ? 'equipo' : 'individual');
            if (!map.has(k)) map.set(k, { project: r.project, members: '', mode: mode, items: [] });
            const g = map.get(k);
            if (!g.members && r.members) g.members = r.members;
            if (mode === 'equipo') g.mode = 'equipo';
            g.items.push(r);
        });
        return Array.from(map.values()).sort((a, b) =>
            String(a.project).localeCompare(String(b.project), 'es'));
    }

    /* ---------- emociones promedio de todos los equipos ---------- */
    function renderAvg(gs) {
        const box = $('avg');
        if (!box) return;
        if (!gs.length) { box.hidden = true; return; }

        const sets = gs.map(g => (g.items[0] || {}).emotions || []);
        const avg = [0, 1, 2, 3, 4].map(i => Math.round(
            sets.reduce((sum, e) => sum + (typeof e[i] === 'number' ? e[i] : 50), 0) / sets.length
        ));

        $('avg-curve').innerHTML = M.curve(avg);
        $('avg-sub').textContent = `promedio de ${gs.length} ${gs.length === 1 ? 'equipo' : 'equipos'} · escala 0–100`;
        $('avg-steps').innerHTML = STAGES.map((s, i) => {
            const e = emoOf(avg[i]);
            return `<span class="avg-step" style="--a:${s.color}">
                <b>${e.emoji}</b><i>${esc(s.name)}</i><u>${avg[i]}</u></span>`;
        }).join('');
        box.hidden = false;
    }

    function render() {
        const gs = groups();
        currentGroups = gs;
        const totalMembers = new Set();
        gs.forEach(g => {
            if (g.mode === 'individual') {
                g.items.forEach(i => { if (i.author) totalMembers.add(norm(i.author)); });
                return;
            }
            String(g.members || '').split(/,|\n/).forEach(m => {
                m = m.trim();
                if (m) totalMembers.add(norm(m));
            });
        });

        $('stats').innerHTML =
            `<div class="stat"><b>${gs.length}</b> registro${gs.length === 1 ? '' : 's'}</div>` +
            `<div class="stat"><b>${records.length}</b> mapa${records.length === 1 ? '' : 's'} enviado${records.length === 1 ? '' : 's'}</div>` +
            `<div class="stat"><b>${totalMembers.size}</b> participante${totalMembers.size === 1 ? '' : 's'}</div>`;

        renderAvg(gs);

        if (!gs.length) {
            $('teams').innerHTML = '<div class="box"><p class="empty">Aún no hay respuestas registradas. ' +
                'En cuanto los equipos guarden su mapa aparecerán aquí. 🌱</p></div>';
            return;
        }
        $('teams').innerHTML = gs.map(teamCard).join('');
        $('search').value = '';
    }

    /* Tarjeta del equipo: identidad + vista previa + botón de detalle */
    function teamCard(g, i) {
        const solo = g.mode === 'individual';
        const subtitle = solo
            ? 'Relleno individual · un solo participante'
            : (g.members || 'Sin miembros registrados');
        const find = (g.project + ' ' + (g.members || '') + ' ' +
            g.items.map(x => x.author || '').join(' ')).toLowerCase();
        return `<article class="team" data-find="${esc(find)}">
            <div class="t-head">
                <div class="t-main">
                    <div class="t-title">${esc(g.project)}</div>
                    <div class="t-members">${esc(subtitle)}</div>
                    <div class="t-meta">
                        <span class="badge">${solo ? '🙋 Individual' : '👥 En equipo'}</span>
                        <span class="badge">${g.items.length} respuesta${g.items.length === 1 ? '' : 's'}</span>
                        <span class="badge lime">Enviado: ${esc(dateOf(g.items[0]))}</span>
                    </div>
                </div>
                <button class="btn small" type="button" data-detail="${i}">🔍 Ver con mayor detalle</button>
            </div>
            ${previewOf(g)}
        </article>`;
    }

    /* Vista previa: la curva de emociones completa del recorrido */
    function previewOf(g) {
        const em = (g.items[0] || {}).emotions || [];
        const faces = STAGES.map((s, i) => {
            const lvl = typeof em[i] === 'number' ? em[i] : 50;
            const e = emoOf(lvl);
            return `<span class="face" style="--a:${s.color}" title="${esc(s.name)}: ${esc(e.label)} ${lvl}">
                ${e.emoji}</span>`;
        }).join('');
        return `<div class="t-preview">
            <div class="pv-label">Recorrido emocional del equipo</div>
            <div class="pv-curve">${M.curve(em)}</div>
            <div class="pv-faces">${faces}</div>
        </div>`;
    }

    function dateOf(r) {
        const d = r && r.created_at ? new Date(r.created_at) : null;
        return d && !isNaN(d) ? d.toLocaleString('es-CO') : '—';
    }

    /* ---------- vista detalle: el journey map desglosado ---------- */
    let detailIndex = null;

    function openDetail(i) {
        const g = currentGroups[i];
        if (!g) return;
        detailIndex = i;
        const solo = g.mode === 'individual';
        $('dt-project').textContent = g.project;
        $('dt-members').textContent = solo
            ? 'Relleno individual · un solo participante'
            : (g.members || 'Sin miembros registrados');
        $('dt-meta').textContent = (solo ? '🙋 Individual' : '👥 En equipo') +
            ' · ' + g.items.length + ' respuesta' + (g.items.length === 1 ? '' : 's') +
            ' · enviado el ' + dateOf(g.items[0]);

        const wide = window.innerWidth >= 1160;

        /* la vista se muestra ANTES de medir las casillas: si no, los textareas
           se calculan con altura 0 y quedarían colapsados */
        $('view-panel').hidden = true;
        $('view-detail').hidden = false;

        $('dt-resp').innerHTML = g.items.map((r, k) => `
            <div class="resp">
                <div class="resp-head">📝 Enviado por <b>${esc(r.author || 'todo el equipo')}</b>
                    <span>${esc(dateOf(r))}</span></div>
                <div class="board-wrap" ${wide ? '' : 'hidden'}><div class="board" data-m="${k}"></div></div>
                <div class="stages" data-c="${k}" ${wide ? 'hidden' : ''}></div>
            </div>`).join('');

        g.items.forEach((r, k) => {
            const target = $('dt-resp').querySelector(wide ? `[data-m="${k}"]` : `[data-c="${k}"]`);
            M.render(target, { cells: r.cells || {}, emotions: r.emotions || [] },
                { readOnly: true, force: wide ? 'table' : 'cards' });
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function closeDetail() {
        detailIndex = null;
        $('dt-resp').innerHTML = '';
        $('view-detail').hidden = true;
        $('view-panel').hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    $('btn-back').addEventListener('click', closeDetail);

    $('teams').addEventListener('click', e => {
        const b = e.target.closest('[data-detail]');
        if (b) openDetail(+b.dataset.detail);
    });

    /* ---------- búsqueda ---------- */
    $('search').addEventListener('input', () => {
        const q = norm($('search').value);
        document.querySelectorAll('.team').forEach(el => {
            el.hidden = q ? !(el.dataset.find || '').includes(q) : false;
        });
    });

    /* ---------- exportar CSV ---------- */
    $('btn-csv').addEventListener('click', () => {
        if (!records.length) { toast('No hay respuestas para exportar'); return; }

        const head = ['Proyecto o participante', 'Modalidad', 'Miembros', 'Llenado por', 'Fecha', 'Etapa',
            'Necesidades', 'Puntos de contacto', 'Pensamientos', 'Soluciones', 'Emoción', 'Nivel de ánimo'];
        const rows = [head];

        records.forEach(r => {
            const cells = r.cells || {};
            const mod = (r.mode || (r.members ? 'equipo' : 'individual')) === 'individual'
                ? 'Individual' : 'En equipo';
            STAGES.forEach((s, i) => {
                const lvl = (r.emotions || [])[i];
                const e = emoOf(typeof lvl === 'number' ? lvl : 50);
                rows.push([
                    r.project || '', mod, r.members || '', r.author || 'Todo el equipo', dateOf(r),
                    `${i + 1}. ${s.name}`,
                    (cells.needs || [])[i] || '',
                    (cells.touchpoints || [])[i] || '',
                    (cells.thoughts || [])[i] || '',
                    (cells.solutions || [])[i] || '',
                    `${e.emoji} ${e.label}`,
                    typeof lvl === 'number' ? lvl : ''
                ]);
            });
        });

        const csv = '\uFEFF' + rows.map(r =>
            r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vape-cycle-journey-map-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Archivo descargado ✅');
    });

    /* ---------- copia de seguridad (.json) ---------- */
    $('btn-backup').addEventListener('click', () => {
        if (!records.length) { toast('No hay respuestas que respaldar'); return; }

        const data = {
            proyecto: 'Vape Cycle · Journey Map',
            exportado: new Date().toISOString(),
            total: records.length,
            registros: records
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vape-cycle-respaldo-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Copia de seguridad descargada 💾');
    });

    /* ---------- al redimensionar, la vista detalle pasa de tabla a tarjetas ---------- */
    let rz = null;
    window.addEventListener('resize', () => {
        clearTimeout(rz);
        rz = setTimeout(() => {
            if (detailIndex !== null && !$('view-detail').hidden) openDetail(detailIndex);
        }, 200);
    });

    /* ---------- sesión (evita volver a poner la contraseña en esta pestaña) ---------- */
    if (sessionStorage.getItem('vc_panel') === '1') {
        unlocked = true;
        $('view-gate').hidden = true;
        $('view-panel').hidden = false;
        load();
        startAuto();
    }
})();
