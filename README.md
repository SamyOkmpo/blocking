# 🔒 Bloqueo

PWA de auto-disciplina gamificada: programas **bloques de enfoque** con tareas, y mientras un bloque está activo la app entra en **modo candado** (pantalla completa, sin navegación) hasta que completes todas las tareas. Rachas, XP, niveles y logros hacen que cumplir se sienta como un juego.

> El bloqueo ocurre **dentro de la app** (compromiso visual y psicológico). Una PWA no puede bloquear otras apps del sistema.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (tema oscuro, acento violeta, tipografías Inter + Space Grotesk)
- **Supabase** (auth email/password + Postgres con RLS)
- **PWA**: manifest + service worker propio (instalable, offline básico)
- **Vercel** (deploy)

## Puesta en marcha (3 pasos)

### 1. Supabase

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. Abre **SQL Editor → New query** y ejecuta, en orden, el contenido de
   [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql),
   [`supabase/migrations/002_rachas_y_gemas.sql`](supabase/migrations/002_rachas_y_gemas.sql) y
   [`supabase/migrations/003_cofres_y_camino.sql`](supabase/migrations/003_cofres_y_camino.sql).
3. Para probar sin confirmación de correo: **Authentication → Sign In / Up → desactiva "Confirm email"**.
4. Copia de **Project Settings → API**: la **Project URL** y la **anon key**.

### 2. Deploy en Vercel

1. Importa el repo en [vercel.com](https://vercel.com) (o usa el proyecto ya creado).
2. En **Settings → Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key de Supabase |

3. Redeploy (Deployments → ⋯ → Redeploy). Listo.

> Si abres la app sin estas variables, verás un aviso de configuración en la pantalla de login en lugar de un error.

### 3. Instalar en el celular

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*.

## Desarrollo local

```bash
cp .env.example .env.local   # y rellena las 2 variables
npm install
npm run dev
```

## Cómo funciona

### Modelo de datos

Como los bloques se repiten (diario / días de la semana), el estado de cada día vive en su propia tabla en lugar de un `is_completed` sobre la tarea plantilla:

- `time_blocks` + `tasks`: la **plantilla** (qué, cuándo, con qué checklist).
- `block_sessions`: la **instancia de un bloque en una fecha** (`active` → `completed` | `failed`), con el XP ganado.
- `task_completions`: qué tareas se marcaron en esa sesión.
- `user_stats`: racha actual/máxima, XP total, nivel y contadores.
- `achievements`: logros desbloqueados.

Todas las tablas tienen **RLS**: cada usuario solo ve y modifica lo suyo.

### Gamificación

La filosofía: **el trabajo duro son los bloques; la racha es fácil de mantener y difícil de perder para siempre.** Fallar nunca es el fin del camino.

- **XP**: +10 por tarea, +25 por bloque, +15 si fue *perfecto* (≥20% del tiempo restante), todo multiplicado por el **multiplicador de racha** (×1.0 → ×2.0 a los 30 días).
- **Racha 🔥 amable**: crece al completar **todos** los bloques del día. Un día parcial (al menos 1 bloque) la **mantiene viva** sin crecer; solo un día entero sin completar nada la pone en riesgo — y ahí entran los escudos y el rescate.
- **Gemas 💎**: +5 por bloque, +10 si es perfecto, +15 por día completo, +25 por logro, +50 por subir de nivel, +10 por volver tras un tropiezo.
- **Cofre diario 🎁** (refuerzo variable): el primer bloque de cada día abre un cofre con recompensa aleatoria — gemas (10–150, con jackpot del 2%), XP extra o incluso un escudo.
- **Escudos 🛡️** (estilo *streak freeze*): todos empiezan con **1 gratis**; cuestan 150 💎, máximo 2. Cubren automáticamente los días vacíos.
- **Revivir racha ❤️‍🔥**: al perderla se abre una ventana de **48 h** con dos caminos: **gratis**, completando todos los bloques de hoy (la racha vuelve y crece), o al instante pagando 💎 (25 × días, entre 50 y 300).
- **Bono de regreso 🌱**: el primer bloque después de perder una racha da +20 XP y +10 💎 con el mensaje "volviste, eso es lo que cuenta".
- **15 niveles** temáticos, de *Aprendiz del Enfoque* a *Deidad del Enfoque* (`src/lib/levels.ts`).
- **35 logros** en 6 categorías, incluidos *Madrugador*, *Noctámbulo*, *Maratonista*, *Guardián de la llama*, *Fénix*, *Buscador de tesoros* e *Inquebrantable* (`src/lib/achievements.ts`).

### Candado

`LockScreen` cubre toda la UI (incluida la navegación) cuando la hora actual cae dentro de un bloque con tareas pendientes. Muestra countdown, anillo de progreso y el checklist; al completar todo, `RewardOverlay` celebra con confetti, sonido (WebAudio, sin assets), XP, nivel y logros. Si el bloque termina incompleto, la sesión se marca `failed` y la racha vuelve a 0.

### Notificaciones

Notificaciones **locales** (Web Notifications API + service worker), sin servidor de push: al activarlas en **Ajustes**, la app programa para los bloques de hoy un aviso 5 minutos antes de empezar y un recordatorio a 10 minutos del final. Funcionan mientras la app está abierta o en segundo plano reciente; con la app totalmente cerrada no hay avisos (eso requeriría infraestructura de web-push, que se dejó fuera a propósito para simplificar el deploy).

## Estructura

```
src/
  app/
    login/                 # auth email + password
    (app)/                 # rutas protegidas con header XP + nav
      page.tsx             # Hoy: bloques del día + próximo bloque
      calendario/          # vista semanal
      progreso/            # stats, heatmap mensual, tendencia, logros
      bloques/nuevo/       # crear bloque
      bloques/[id]/        # editar / eliminar bloque
      ajustes/             # notificaciones, sesión, instalación
  components/              # AppProvider, LockScreen, RewardOverlay, Heatmap…
  lib/                     # gamificación, niveles, logros, tiempo, sonido
supabase/migrations/       # esquema + RLS
public/sw.js               # service worker (offline + clic en notificaciones)
```
