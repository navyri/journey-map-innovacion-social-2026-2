<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=210&color=17110F&text=VAPE%20CYCLE&fontColor=C8F23B&fontSize=56&fontAlignY=32&desc=Journey%20map%20colaborativo%20de%20un%20sal%C3%B3n%20entero%20en%20una%20sola%20p%C3%A1gina%20responsive&descColor=FFF6EC&descAlignY=58"/>
</p>

<p align="center">
  <a href="https://navyri.github.io/journey-map-innovacion-social-2026-2/" title="Abrir el journey map en vivo">
    <img src="assets/vape-cycle.png" height="200" alt="Vape Cycle — abrir el journey map"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-100%25%20sin%20frameworks-17110F?style=flat-square&logo=html5&logoColor=F2705C"/>
  <img src="https://img.shields.io/badge/CSS3-responsive-17110F?style=flat-square&logo=css3&logoColor=4BB3E6"/>
  <img src="https://img.shields.io/badge/JavaScript-ES6%20vanilla-17110F?style=flat-square&logo=javascript&logoColor=C8F23B"/>
  <img src="https://img.shields.io/badge/Supabase-0%20USD-C8F23B?style=flat-square&logo=supabase&logoColor=17110F"/>
  <img src="https://img.shields.io/badge/despliegue-GitHub%20Pages-17110F?style=flat-square&logo=githubpages&logoColor=FFF6EC"/>
  <img src="https://img.shields.io/badge/asignatura-Innovaci%C3%B3n%20social-F2705C?style=flat-square"/>
</p>

**Vape Cycle** es el *journey map* colaborativo de la clase de **Innovación social (2026-2)** de la
Universidad EIA: cada equipo entra con el nombre de su proyecto (o de forma **individual**), llena las
5 etapas del mapa en el celular o el computador y envía **una sola vez**. El equipo Vape Cycle entra a
un **panel privado con contraseña** donde ve todas las respuestas organizadas por equipo —título con el
proyecto, subtítulo con los miembros— y las exporta a Excel. Corre en HTML + CSS + JS vanilla, se guarda
en **Supabase** (tier gratuito) y se publica gratis en **GitHub Pages**: **0 USD** en total.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

## Características

| Característica | Detalle |
|---|---|
| Login de equipos | Nombre del proyecto, miembros (texto libre) y quién llena el mapa |
| Individual o en equipo | Lista desplegable **“¿Quién llenará este journey map?”**: cambia el apartado visible |
| Mapa 5 × 5 | Descubrimiento · Consideración · Primer uso · Uso continuo · Recomendación × necesidades, puntos de contacto, pensamientos, soluciones y emociones |
| Curva de emociones | Deslizador 0–100 por etapa con emoji y etiqueta que se actualizan en vivo |
| 100 % responsive | ≥1160 px muestra la tabla del diseño original; en celular/tablet cada etapa se vuelve una tarjeta apilable (sin scroll horizontal) |
| Envío único | Si el registro ya guardó, se detecta y solo se muestra el mapa en modo lectura |
| Avisos con la estética | Modal propio (crema, borde negro, tipografía Baloo 2 y botón lima) en vez del `confirm()` del navegador |
| Panel privado | Contraseña `InnovacionSocial20262`, buscador, estadísticas, ficha por equipo y **cerrar sesión** |
| Exportar | Botón **Exportar a Excel (CSV)** con separador `;` y BOM (abre directo en Excel en español) |
| Seguridad básica | Row Level Security en Supabase: se puede leer y crear, **no** modificar ni borrar |

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

## Flujo de uso

**Salón (equipos):**

1. Abren el link → *Entrada de equipos*.
2. Eligen **👥 En equipo** (proyecto + miembros) o **🙋 Individual** (solo su nombre).
3. Llenan las 4 preguntas de cada etapa y mueven el deslizador de emociones.
4. *Guardar mi mapa* → modal de confirmación → ✅ listo.

**Equipo Vape Cycle (panel):**

1. Botón *Ir al panel privado* (o directo a `panel.html`).
2. Contraseña: `InnovacionSocial20262`.
3. Buscar, abrir la ficha de cada equipo y **Exportar a Excel (CSV)**.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

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
└── README.md
```

| Qué cambiar | Archivo |
|---|---|
| Credenciales de Supabase y contraseña del panel | `config.js` |
| Etapas, filas, textos de ejemplo y colores | `styles.css` (`:root`) y `app.js` (`STAGES`, `ROWS`, `BANDS`) |
| Nombre del curso / etiquetas | `index.html` y `panel.html` |

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

## Desarrollo local

```bash
# con Python
python -m http.server 8765        # http://localhost:8765

# o con Node
npx serve .
```

> Abriendo el archivo con doble clic también funciona, pero en **modo local** los datos se quedan en
> ese dispositivo. Para compartirlos con el salón hace falta Supabase + GitHub Pages (abajo).

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

## Base de datos con Supabase (gratis, sin tarjeta)

1. Entra a [supabase.com](https://supabase.com) → **Start your project** → cuenta con Google → plan **Free**.
2. **New project**: nombre `journey-map`, región *Americas* → **Create project** (espera ~1 min a que quede *Active*).
3. Menú izquierdo → **SQL Editor → New query**, pega esto y pulsa **Run** (`Ctrl+Enter`):

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

> No existen políticas de `update`/`delete`: nadie puede editar ni borrar lo enviado. Así se garantiza
> el **envío único**. Debe decir `Success. No rows returned`.

4. **Project Settings → API** → copia la *Project URL* y la *anon public key*:

```js
// config.js
window.VAPE_CONFIG = {
    SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOi...',
    ADMIN_PASSWORD: 'InnovacionSocial20262',
    TABLE: 'journey_maps'
};
```

Con esos dos valores la app sale del **modo local** y todos los celulares comparten la misma información.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

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

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

## Sobre VapeCycle (el proyecto de la clase)

**«Reutiliza tu vapo: plástico y filamento 3D en el campus»** — Innovación social, Universidad EIA,
Medellín, 2026.

| Punto | Detalle |
|---|---|
| El problema | Los vapeadores desechables son un residuo mixto (RAEE) con batería de litio: en EE. UU. se descartan ~500.000 al día y no existen puntos cercanos de disposición; las baterías aplastadas en la compactación causan incendios y terminan liberando materiales al ambiente |
| La propuesta | **VapeCycle**: sistema universitario de *recolección → separación → aprovechamiento* con contenedores señalizados dentro del campus |
| Qué se recicla | Solo el **plástico** se queda en el ciclo interno: se tritura y, si las pruebas lo permiten, se convierte en **filamento para impresión 3D** (prototipos, material educativo, piezas de proyectos) |
| Qué no se toca | Baterías de litio y componentes electrónicos: se guardan de forma segura y se entregan a **gestores autorizados** |
| Viabilidad | Los materiales recuperables se entregan a gestores que pagan por ellos → financia contenedores, trituradora y extrusión |
| Impacto esperado | **Ambiental** (menos residuos y plástico nuevo) · **Social** (conciencia y participación de la comunidad EIA) · **Económico** (ingresos por materiales y ahorro en filamento) |
| Marco teórico | Innovación social (Phills y Emerson, 2008), economía circular (Ellen MacArthur Foundation) y gestión de RAEE/baterías de litio (WEEE Forum, EPA) |

Este repositorio es la **herramienta de investigación** del proyecto: el journey map que llena el salón
para documentar la experiencia de cada etapa.

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=rect&height=6&color=17110F"/>
</p>

## Equipo

· Docente: **Daniela López Montoya**
· **María José Muñoz** · **Daniel Barth** · **Ricardo Vélez** · **Anniela Galvis** · **Mariana Esguerra**

Universidad EIA — Innovación social, Medellín, 2026.

<p align="center">
  <img src="https://img.shields.io/badge/Innovaci%C3%B3n%20social-2026--2-F2705C?style=flat-square"/>
  <img src="https://img.shields.io/badge/Universidad%20EIA-Medell%C3%ADn-17110F?style=flat-square"/>
  <img src="https://img.shields.io/badge/costo-0%20USD-C8F23B?style=flat-square"/>
</p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&height=120&section=footer&color=17110F" alt=""/>
</p>
