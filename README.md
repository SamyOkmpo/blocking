# 🔒 Bloqueo

PWA de auto-disciplina gamificada: programas **bloques de enfoque** con tareas, y mientras un bloque está activo la app entra en **modo candado** (pantalla completa, sin navegación) hasta que completes todas las tareas. Rachas, XP, niveles y logros hacen que cumplir se sienta como un juego.

> El bloqueo ocurre **dentro de la app** (compromiso visual y psicológico). Una PWA no puede bloquear otras apps del sistema.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** (tema oscuro, acento violeta, tipografías Inter + Space Grotesk)
- **Supabase** (auth email/password + Postgres con RLS)
- **PWA**: manifest + service worker propio (instalable, offline básico, web-push)
- **Vercel** (deploy + cron de notificaciones push)

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor → New query**, pega el contenido completo de
   [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) y ejecútalo.
3. En **Authentication → Providers → Email** deja habilitado Email/Password.
   - Para probar sin confirmación de correo: **Authentication → Settings → desactiva "Confirm email"**.
4. Copia de **Project Settings → API**: la URL del proyecto, la `anon key` y la `service_role key`.

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (solo servidor, para el cron) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:tu-email@ejemplo.com` |
| `CRON_SECRET` | cualquier string largo y aleatorio |

### 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El service worker y las notificaciones push requieren HTTPS en producción (en localhost funcionan).

### 4. Deploy en Vercel

1. Importa el repo en [vercel.com](https://vercel.com).
2. Añade **todas** las variables de entorno anteriores en Project Settings → Environment Variables (incluida `CRON_SECRET` — Vercel la usa para autenticar el cron automáticamente).
3. Deploy. `vercel.json` ya define el cron `*/5 * * * *` que dispara `/api/cron/notifications`.

> ⚠️ **Plan Hobby de Vercel:** los crons solo pueden ejecutarse 1 vez al día, así que el push "5 minutos antes" necesita el plan Pro. Sin cron frecuente, las **notificaciones locales** (programadas mientras la app está abierta) siguen funcionando.

### 5. Instalar en el celular

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*. Las notificaciones push en iOS requieren iOS 16.4+ **y** que la app esté instalada.

## Cómo funciona

### Modelo de datos

Como los bloques se repiten (diario / días de la semana), el estado de cada día vive en su propia tabla en lugar de un `is_completed` sobre la tarea plantilla:

- `time_blocks` + `tasks`: la **plantilla** (qué, cuándo, con qué checklist).
- `block_sessions`: la **instancia de un bloque en una fecha** (`active` → `completed` | `failed`), con el XP ganado.
- `task_completions`: qué tareas se marcaron en esa sesión.
- `user_stats`: racha actual/máxima, XP total, nivel, contadores y zona horaria (para el cron).
- `achievements`: logros desbloqueados.
- `push_subscriptions` + `sent_notifications`: suscripciones web-push y registro anti-duplicados del cron.

Todas las tablas tienen **RLS**: cada usuario solo ve y modifica lo suyo.

### Gamificación

- **+10 XP** por tarea, **+25** por completar el bloque, **+15** si fue *perfecto* (terminaste con ≥20% del tiempo restante).
- **Racha**: avanza al completar **todos** los bloques del día; un bloque fallido la rompe. Bonus diario de +5 XP × días de racha (máx. ×10).
- **10 niveles** temáticos, de *Aprendiz del Enfoque* a *Maestro del Tiempo* (`src/lib/levels.ts`).
- **13 logros** (`src/lib/achievements.ts`).

### Candado

`LockScreen` cubre toda la UI (incluida la navegación) cuando la hora actual cae dentro de un bloque con tareas pendientes. Muestra countdown, anillo de progreso y el checklist; al completar todo, `RewardOverlay` celebra con confetti, sonido (WebAudio, sin assets), XP, nivel y logros. Si el bloque termina incompleto, la sesión se marca `failed` y la racha vuelve a 0.

### Notificaciones

- **Locales**: programadas en el cliente para los bloques de hoy (aviso 5 min antes y recordatorio a 10 min del final).
- **Push (servidor)**: el cron de Vercel consulta cada 5 min los bloques próximos según la **zona horaria de cada usuario** y envía web-push aunque la app esté cerrada.

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
    api/push/subscribe/    # guarda suscripciones web-push
    api/cron/notifications/# cron de push (Vercel)
  components/              # AppProvider, LockScreen, RewardOverlay, Heatmap…
  lib/                     # gamificación, niveles, logros, tiempo, sonido
supabase/migrations/       # esquema + RLS
public/sw.js               # service worker (offline + push)
```
