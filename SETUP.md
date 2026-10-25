# 🛠️ SETUP · Guía técnica del journey map

> Este archivo **no es el README**: el `README.md` contiene solo la teoría del proyecto.
> Aquí está todo lo técnico: cómo levantarlo en local, conectar Supabase y publicarlo.

---

## Qué hace la app

| Pantalla | Descripción |
|---|---|
| `index.html` | Login del equipo (individual o en equipo) → mapa editable → confirmación |
| `panel.html` | Panel privado con contraseña: ver, buscar y exportar las respuestas |

| Característica | Detalle |
|---|---|
| Login con modalidad | Nombre del proyecto **siempre**; si es *en equipo* se agregan los miembros (texto libre) y si es *individual* el nombre de quien llena |
| Individual o en equipo | Lista desplegable **“¿Quién llenará este journey map?”**: cambia el apartado visible |
| Mapa 5 × 5 | Descubrimiento · Consideración · Primer uso · Uso continuo · Recomendación × necesidades, puntos de contacto, pensamientos, soluciones y emociones |
| Curva de emociones | Deslizador 0–100 por etapa con emoji y etiqueta que se actualizan en vivo |
| 100 % responsive | ≥1160 px muestra la tabla del diseño original; en celular/tablet cada etapa se vuelve una tarjeta apilable (sin scroll horizontal) |
| Envío único | Si el registro ya guardó, se detecta y solo se muestra el mapa en modo lectura |
| Avisos con la estética | Modal propio (crema, borde negro, tipografía Baloo 2 y botón lima) en vez del `confirm()` del navegador |
| Panel privado | Contraseña `InnovacionSocial20262`, buscador, estadísticas, ficha por equipo y **cerrar sesión** |
| Exportar | Botón **Exportar a Excel (CSV)** con separador `;` y BOM (abre directo en Excel en español) |
| Seguridad básica | Row Level Security en Supabase: se puede leer y crear, **no** modificar ni borrar |

---

## Flujo de uso

**Salón (equipos):**

1. Abren el link → *Entrada de equipos*.
2. Eligen **👥 En equipo** (proyecto + miembros) o **🙋 Individual** (proyecto + su nombre).
3. Llenan las 4 preguntas de cada etapa y mueven el deslizador de emociones.
4. *Guardar mi mapa* → modal de confirmación → ✅ listo.

**Equipo Vape Cycle (panel):**

1. Botón *Ir al panel privado* (o directo a `panel.html`).
2. Contraseña: `InnovacionSocial20262`.
3. Buscar, abrir la ficha de cada equipo y **Exportar a Excel (CSV)**.
4. *Cerrar sesión* deja la pestaña limpia para la siguiente persona.

---

## Estructura

```text
journey-map-innovacion-social-2026-2/
├── index.html                          # login + mapa editable + confirmación
├── panel.html                          # panel privado (contraseña)
├── app.js                              # lógica del mapa, validación y guardado
├── panel.js                            # lógica del panel, buscador y exportación
├── styles.css                          # identidad visual y responsive
├── config.js                           # URL + anon key de Supabase y contraseña
├── assets/vape-cycle.png               # imagen del proyecto (README)
├── VapeCycle_JourneyMap_Plantilla.html # plantilla original de la profesora
├── README.md                           # solo teoría del proyecto
└── SETUP.md                            # este archivo
```

| Qué cambiar | Archivo |
|---|---|
| Credenciales de Supabase y contraseña del panel | `config.js` |
| Etapas, filas, textos de ejemplo y colores | `styles.css` (`:root`) y `app.js` (`STAGES`, `ROWS`, `BANDS`) |
| Nombre del curso / etiquetas | `index.html` y `panel.html` |

---

## Desarrollo local

```bash
# con Python
python -m http.server 8765        # http://localhost:8765

# o con Node
npx serve .
```

> Abriendo el archivo con doble clic también funciona, pero en **modo local** los datos se quedan en
> ese dispositivo. Para compartirlos con el salón hace falta Supabase + GitHub Pages (abajo).

---

## Base de datos con Supabase (gratis, sin tarjeta)

### 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) → **Start your project** → cuenta con Google → plan **Free**.
2. **New project**:
   - *Organization*: la que tengas (ej. `Innovación Social`).
   - *Project name*: `journey-map`
   - *Database password*: **Generate a password** → guárdala en un bloc de notas (no se usa en la app).
   - *Region*: **Americas** (si falla, prueba *West US (Oregon)*).
   - *Enable Data API*: ✅ marcado.
   - *Automatically expose new tables*: ✅ **marcado** (necesario para que la tabla sea visible desde la web).
   - *Enable automatic RLS*: ☐ **sin marcar** (activamos RLS con el SQL de abajo).
3. **Create project** → espera 1–2 minutos a que quede *Active*.

### 2. Crear la tabla

Menú izquierdo → **SQL Editor → New query**, pega esto y pulsa **Run** (`Ctrl+Enter`):

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

Debe decir `Success. No rows returned`.

> No existen políticas de `update`/`delete`: nadie puede editar ni borrar lo enviado. Así se garantiza
> el **envío único**.

*(Si la tabla ya existía sin la columna `mode`:)*

```sql
alter table public.journey_maps add column if not exists mode text not null default 'equipo';
```

### 3. Copiar las credenciales

**Project Settings → API**:

| Qué | Dónde va |
|---|---|
| *Project URL* (`https://xxxx.supabase.co`) | `SUPABASE_URL` |
| *anon public* key (`eyJhbGciOi…`) | `SUPABASE_ANON_KEY` |

```js
// config.js
window.VAPE_CONFIG = {
    SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOi...',
    ADMIN_PASSWORD: 'InnovacionSocial20262',
    TABLE: 'journey_maps'
};
```

> ⚠️ La **anon key** está pensada para ir en la página (como la contraseña del panel). La
> **service_role** y la **database password** **nunca** se comparten.

Con esos dos valores la app sale del **modo local** y todos los celulares comparten la misma información.

---

## Despliegue en GitHub Pages

1. Sube el repo:
   ```bash
   git add .
   git commit -m "Journey Map Vape Cycle"
   git branch -M main
   git remote add origin https://github.com/navyri/journey-map-innovacion-social-2026-2.git
   git push -u origin main
   ```
2. En el repo → **Settings → Pages** → *Source*: **Deploy from a branch** → rama `main`, carpeta `/ (root)` → **Save**.
3. En ~1 minuto queda vivo en
   `https://navyri.github.io/journey-map-innovacion-social-2026-2/`
   → ese es el link que se comparte con el salón (funciona igual en el celular).

---

## Pendientes

- `assets/vape-cycle.png` → imagen del collage del proyecto que se muestra en el `README.md`.
