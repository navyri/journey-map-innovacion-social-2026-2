# 🗺️ Journey Map · Vape Cycle (Innovación social 2026-2)

Journey map colaborativo: cada equipo entra con los datos de su proyecto, llena las 5 etapas
del mapa y envía **una sola vez**. El equipo **Vape Cycle** entra a un panel privado para ver
todas las respuestas organizadas por equipo y exportarlas a Excel.

| Archivo | Qué hace |
|---|---|
| `index.html` | Login de equipo + mapa editable + confirmación (lo que abre el salón) |
| `panel.html` | Panel privado con la contraseña (ver / buscar / exportar) |
| `styles.css` | Diseño 100 % responsive (escritorio = tabla, celular = tarjetas por etapa) |
| `app.js` / `panel.js` | Lógica de cada página |
| `config.js` | URL y llave de Supabase + contraseña del panel |

---

## 1) Crear la base de datos (Supabase, gratis, 3 min)

1. Entra a <https://supabase.com> → **Start your project** → crea la cuenta con Google
   (plan **Free**, no pide tarjeta).
2. **New project**: nombre `journey-map`, contraseña cualquier cosa, región *East US (North Virginia)* → **Create project**.
3. Espera ~1 minuto a que esté *Active*. En el menú izquierdo abre **SQL Editor** → **New query** y pega esto:

```sql
create table if not exists public.journey_maps (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'equipo',   -- 'equipo' | 'individual'
  project text not null,
  members text,
  author text,
  cells jsonb not null default '{}'::jsonb,
  emotions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.journey_maps enable row level security;

create policy "cualquiera puede leer"  on public.journey_maps for select using (true);
create policy "cualquiera puede crear" on public.journey_maps for insert with check (true);
```

4. Pulsa **Run** (Ctrl+Enter). Debe decir `Success. No rows returned`.
   > Sin políticas de `update`/`delete`, nadie puede modificar o borrar lo enviado: se respeta el **envío único**.

5. Ahora copia las credenciales: **Project Settings → API**:
   - *Project URL* → pégala en `SUPABASE_URL`
   - *anon public* key → pégala en `SUPABASE_ANON_KEY`

6. Ábrelo en `config.js` y pega los dos valores:

```js
window.VAPE_CONFIG = {
    SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOi...',
    ADMIN_PASSWORD: 'InnovacionSocial20262',
    TABLE: 'journey_maps'
};
```

> Mientras esos campos estén vacíos, la app funciona en **modo local**: guarda solo en el
> dispositivo donde se abra. Sirve para probar el diseño, pero **no** para el salón.

---

## 2) Subir a GitHub (repositorio ya creado)

```bash
cd "C:\Users\maria\Downloads\journey-map-innovacion-social-2026-2"
git init
git add .
git commit -m "Journey Map Vape Cycle: login, mapa responsive y panel privado"
git branch -M main
git remote add origin https://github.com/navyri/journey-map-innovacion-social-2026-2.git
git push -u origin main
```

## 3) Publicarlo gratis (GitHub Pages)

1. En el repo → **Settings → Pages**.
2. *Source*: **Deploy from a branch** → rama `main`, carpeta `/ (root)` → **Save**.
3. En ~1 minuto queda vivo en:
   `https://navyri.github.io/journey-map-innovacion-social-2026-2/`
   → ese es el link que compartes con el salón (funciona igual en celular).

---

## 4) Cómo lo usa el salón

**Equipos y participantes:**
1. Abren el link → *Entrada de equipos*.
2. Eligen en **¿Quién llenará este journey map?**
   - **👥 En equipo** → aparecen *Nombre del proyecto* y *Miembros del equipo*.
   - **🙋 Individual** → solo se pide *Tu nombre*.
3. Llenan las 4 filas × 5 etapas y mueven el control deslizante de **emociones** de cada etapa.
4. *Guardar mi mapa* → aparece un aviso con la estética del proyecto para confirmar; si ese
   registro ya envió, el sistema lo detecta y solo muestra el mapa en modo lectura.

**Equipo Vape Cycle (panel):**
1. En la misma página, botón *Ir al panel privado* (o directo a `panel.html`).
2. Contraseña: `InnovacionSocial20262`.
3. Ver las respuestas con **título = nombre del proyecto** y **subtítulo = miembros**,
   buscador, y botón **Exportar a Excel (CSV)** (se abre en Excel/Sheets con un doble clic).

---

## Preguntas frecuentes

- **¿Pueden corregir después de enviar?** No: es envío único (lo pidió la profesora). Si necesitas
  habilitar correcciones, dime y agrego una política de `update`.
- **¿Y si no hay internet en el aula?** Se puede reintentar guardar; revisa la conexión.
- **¿La contraseña queda en el código?** Sí, es una barrera simple de acceso, no seguridad real.
  Cualquiera con el código fuente podría verla.
