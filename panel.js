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

    const STAGES = [
        { name: 'Descubrimiento', icon: '💡', color: 'var(--pink)' },
        { name: 'Consideración', icon: '🔍', color: 'var(--orange)' },
        { name: 'Primer uso', icon: '🚩', color: 'var(--lime)' },
        { name: 'Uso continuo', icon: '🔁', color: 'var(--teal)' },
        { name: 'Recomendación', icon: '📣', color: 'var(--lav)' }
    ];
    const ROWS = [
        { key: 'needs', label: 'Necesidades', icon: '🎯' },
        { key: 'touchpoints', label: 'Puntos de contacto', icon: '📍' },
        { key: 'thoughts', label: 'Pensamientos', icon: '💭' },
        { key: 'solutions', label: 'Soluciones posibles', icon: '✅' }
    ];
    const BANDS = [
        { max: 16, emoji: '😫', label: 'Frustrado' },
        { max: 33, emoji: '😕', label: 'Confundido' },
        { max: 50, emoji: '😐', label: 'Neutral' },
        { max: 66, emoji: '🙂', label: 'Conforme' },
        { max: 83, emoji: '😃', label: 'Feliz' },
        { max: 100, emoji: '🤩', label: 'Encantado' }
    ];
    const emoOf = l => BANDS.find(b => l <= b.max) || BANDS[BANDS.length - 1];

    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

    let records = [];
    let unlocked = false;

    let toastTimer = null;
    function toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
    }

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
        } else {
            $('pw-err').hidden = false;
            $('pw').value = '';
            $('pw').focus();
        }
    }
    $('btn-unlock').addEventListener('click', tryUnlock);
    $('pw').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

    /* ---------- carga ---------- */
    async function load() {
        const box = $('teams');
        box.innerHTML = '<div class="box"><p class="empty">Cargando respuestas…</p></div>';
        try {
            records = await DB.list();
            $('panel-updated').textContent =
                (isRemote ? 'Supabase · sincronizado ' : 'Modo local (solo este dispositivo) · ') +
                new Date().toLocaleString('es-CO');
            render();
        } catch (e) {
            console.error(e);
            box.innerHTML = '<div class="box"><p class="empty">⚠️ No se pudo cargar la información. ' +
                'Revisa tu conexión y pulsa “Actualizar”.</p></div>';
            $('stats').innerHTML = '';
        }
    }
    $('btn-refresh').addEventListener('click', load);

    /* ---------- agrupar por equipo ---------- */
    function groups() {
        const map = new Map();
        records.forEach(r => {
            const k = norm(r.project) || '(sin proyecto)';
            if (!map.has(k)) map.set(k, { project: r.project, members: '', items: [] });
            const g = map.get(k);
            if (!g.members && r.members) g.members = r.members;
            g.items.push(r);
        });
        return Array.from(map.values()).sort((a, b) =>
            String(a.project).localeCompare(String(b.project), 'es'));
    }

    function render() {
        const gs = groups();
        const totalMembers = new Set();
        gs.forEach(g => {
            String(g.members || '').split(/,|\n/).forEach(m => {
                m = m.trim();
                if (m) totalMembers.add(norm(m));
            });
        });

        $('stats').innerHTML =
            `<div class="stat"><b>${gs.length}</b> equipo${gs.length === 1 ? '' : 's'}</div>` +
            `<div class="stat"><b>${records.length}</b> mapa${records.length === 1 ? '' : 's'} enviado${records.length === 1 ? '' : 's'}</div>` +
            `<div class="stat"><b>${totalMembers.size}</b> integrante${totalMembers.size === 1 ? '' : 's'}</div>`;

        if (!gs.length) {
            $('teams').innerHTML = '<div class="box"><p class="empty">Aún no hay respuestas registradas. ' +
                'En cuanto los equipos guarden su mapa aparecerán aquí. 🌱</p></div>';
            return;
        }
        $('teams').innerHTML = gs.map(teamCard).join('');
        $('search').value = '';
    }

    function teamCard(g) {
        const items = g.items.map(itemCard).join('');
        return `<details class="team" data-find="${esc(
            (g.project + ' ' + (g.members || '') + ' ' +
                g.items.map(i => i.author || '').join(' ')).toLowerCase())}">
            <summary>
                <div class="t-main">
                    <div class="t-title">${esc(g.project)}</div>
                    <div class="t-members">${esc(g.members || 'Sin miembros registrados')}</div>
                    <div class="t-meta">
                        <span class="badge">${g.items.length} respuesta${g.items.length === 1 ? '' : 's'}</span>
                        <span class="badge lime">Última: ${esc(dateOf(g.items[0]))}</span>
                    </div>
                </div>
                <span class="chev">Ver ▾</span>
            </summary>
            <div class="t-body">${items}</div>
        </details>`;
    }

    function dateOf(r) {
        const d = r.created_at ? new Date(r.created_at) : null;
        return d && !isNaN(d) ? d.toLocaleString('es-CO') : '—';
    }

    function itemCard(r) {
        const cells = r.cells || {};
        let h = `<div class="resp">
            <div class="resp-head">📝 Respuesta de <b>${esc(r.author || '—')}</b>
                <span>${esc(dateOf(r))}</span></div>`;

        STAGES.forEach((s, i) => {
            const lvl = (r.emotions || [])[i];
            const e = emoOf(typeof lvl === 'number' ? lvl : 50);
            h += `<div class="tstage" style="--a:${s.color}">
                <h4><span>${s.icon}</span> Etapa ${i + 1} · ${s.name}</h4>
                <div class="rows">`;
            ROWS.forEach(row => {
                const val = (cells[row.key] || [])[i] || '—';
                h += `<div class="r"><i>${row.icon} ${row.label}</i>${esc(val)}</div>`;
            });
            h += `<div class="r emo"><span class="big">${e.emoji}</span>
                    <span><i>🙂 Emoción</i>${e.label} · ${typeof lvl === 'number' ? lvl : '—'} / 100</span></div>
                </div></div>`;
        });

        return h + '</div>';
    }

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

        const head = ['Proyecto', 'Miembros', 'Llenado por', 'Fecha', 'Etapa',
            'Necesidades', 'Puntos de contacto', 'Pensamientos', 'Soluciones', 'Emoción', 'Nivel de ánimo'];
        const rows = [head];

        records.forEach(r => {
            const cells = r.cells || {};
            STAGES.forEach((s, i) => {
                const lvl = (r.emotions || [])[i];
                const e = emoOf(typeof lvl === 'number' ? lvl : 50);
                rows.push([
                    r.project || '', r.members || '', r.author || '', dateOf(r),
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

    /* ---------- sesión (evita volver a poner la contraseña en esta pestaña) ---------- */
    if (sessionStorage.getItem('vc_panel') === '1') {
        unlocked = true;
        $('view-gate').hidden = true;
        $('view-panel').hidden = false;
        load();
    }
})();
