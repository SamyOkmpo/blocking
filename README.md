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
2. Abre **SQL Editor → New query** y ejecuta:
   - Base nueva: [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) y luego [`supabase/actualiza.sql`](supabase/actualiza.sql).
   - Base que ya tiene 001: solo [`supabase/actualiza.sql`](supabase/actualiza.sql) (combina las migraciones 002 y 003; es idempotente, puedes ejecutarlo las veces que quieras).
   - Base que ya ejecutó la migración 004 (tienda, ahora eliminada): ejecuta también [`supabase/migrations/005_quita_tienda.sql`](supabase/migrations/005_quita_tienda.sql) para quitar las columnas de gemas/cofres/impulso que ya no se usan.
   - Tienda de temas (monedas de racha): ejecuta también [`supabase/migrations/008_tienda_racha.sql`](supabase/migrations/008_tienda_racha.sql).
   - Marcos de racha y títulos: ejecuta también [`supabase/migrations/009_marcos_titulos.sql`](supabase/migrations/009_marcos_titulos.sql).
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

- **XP**: +10 por tarea, +25 por bloque, +15 si fue *perfecto* (≥20% del tiempo restante), +20 al volver tras un tropiezo, y un bono al completar el día (crece con la racha, hasta 10 días).
- **Racha 🔥 amable**: crece al completar **todos** los bloques del día. Un día parcial (al menos 1 bloque) la **mantiene viva** sin crecer; solo un día entero sin completar nada la pone en riesgo — y ahí entran los protectores y el rescate.
- **Protectores de racha 🛡️** (estilo *streak freeze*): se ganan solos, **1 por cada 7 días de racha**, tope de **1** — y tope de **2** una vez superados los 30 días de racha. Cubren automáticamente los días vacíos, sin gastar nada.
- **Revivir racha ❤️‍🔥**: al perderla se abre una ventana de **48 h** para revivirla **gratis** completando todos los bloques de hoy (la racha vuelve y crece con el día). Pasadas las 48 h, se puede **comprar de vuelta con monedas de racha** (precio = días perdidos + 5 🪙) hasta 30 días después de perderla — pasado ese plazo, se olvida para siempre.
- **Bono de regreso 🌱**: el primer bloque después de perder una racha da +20 XP con el mensaje "volviste, eso es lo que cuenta".
- **15 niveles** temáticos, de *Aprendiz del Enfoque* a *Deidad del Enfoque* (`src/lib/levels.ts`).
- **36 logros** en 6 categorías, incluidos *Madrugador*, *Noctámbulo*, *Maratonista*, *Guardián de la llama*, *Fénix*, *Inquebrantable* y *Coleccionista* (`src/lib/achievements.ts`).
- **Monedas de racha 🪙🔥**: 1 por cada día que la racha crece. Se tocan desde el ícono 🔥 del header y abren la **tienda** (`src/components/StreakShop.tsx`) — cosmético puro, cero efecto en XP/racha/logros:
  - **🎨 Temas** (`src/lib/themes.ts`): recolorean toda la app vía variables CSS. Se pueden **probar en vivo** antes de comprar.
  - **🖼️ Marcos** (`src/lib/frames.ts`): decoran con un glow la insignia de racha 🔥 del header.
  - **🏷️ Títulos** (`src/lib/titles.ts`): reemplazan el nombre de nivel mostrado en el header por uno cosmético.
  - **✨ Destacado**: un ítem sin desbloquear rota una vez al día — sin countdown ni presión, solo para darle una razón a visitar la tienda.
  - Rareza compartida (`src/lib/rarity.ts`) — común/poco común/raro/épico/legendario — define el color/glow de cada tarjeta; los legendarios llevan un shimmer animado.
- **Mapa de niveles** (`src/components/LevelsModal.tsx`): toca el número de nivel en el header para ver los 15 niveles obtenidos, el actual (con XP restante) y los bloqueados.

### Candado

`LockScreen` cubre toda la UI (incluida la navegación) cuando la hora actual cae dentro de un bloque con tareas pendientes. Muestra countdown, anillo de progreso y el checklist; al completar todo, `RewardOverlay` celebra con confetti, sonido (WebAudio, sin assets), XP, nivel y logros. Si el bloque termina incompleto, la sesión se marca `failed` y la racha vuelve a 0.

### Notificaciones

Dos capas, activadas juntas desde **Ajustes → Activar notificaciones**:

- **Locales** (Web Notifications API + service worker): programa para los bloques de hoy un aviso 5 minutos antes de empezar y un recordatorio a 10 minutos del final. Funcionan mientras la app está abierta o en segundo plano reciente.
- **Push** (Web Push + un disparador externo cada 5 min): si configuraste las variables VAPID (ver abajo), el dispositivo se suscribe y los mismos avisos llegan **aunque la app esté totalmente cerrada**. Sin esas variables, la app sigue funcionando solo con las notificaciones locales.

> **¿Por qué no usa el Cron de Vercel?** El plan **Hobby** de Vercel limita los Cron Jobs a como mucho una vez al día — no alcanza para avisos de "5 minutos antes". Por eso el disparo real vive en [`.github/workflows/notify-cron.yml`](.github/workflows/notify-cron.yml): un GitHub Action programado cada 5 minutos que simplemente llama `GET /api/cron/notify`. Es gratis en repos públicos y no depende del plan de Vercel. La ruta calcula qué avisos "ya tocaban" en una ventana de 15 minutos y usa una tabla de deduplicado (`sent_push_notifications`) para no repetirlos, así que tolera que el disparo no llegue exacto al minuto.

**Cómo conectarlas:**

1. Ejecuta en orden, en el SQL Editor de Supabase: [`006_push_subscriptions.sql`](supabase/migrations/006_push_subscriptions.sql) y [`007_dedupe_notificaciones.sql`](supabase/migrations/007_dedupe_notificaciones.sql).
2. Genera el par de claves VAPID: `npx web-push generate-vapid-keys`.
3. En **Vercel → Settings → Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | la "Public Key" generada |
   | `VAPID_PRIVATE_KEY` | la "Private Key" generada (secreta) |
   | `VAPID_SUBJECT` | `mailto:tu-correo@ejemplo.com` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → *service_role* en Supabase (secreta) |
   | `CRON_SECRET` | cualquier string aleatorio largo (ej. `openssl rand -hex 32`) |

4. Redeploy en Vercel.
5. En **GitHub → tu repo → Settings → Secrets and variables → Actions**:
   - Pestaña **Secrets**: agrega `CRON_SECRET` con el mismo valor que pusiste en Vercel.
   - (Opcional) Pestaña **Variables**: agrega `APP_URL` con la URL de tu deploy si es distinta de `https://blocking-iota.vercel.app` (el workflow ya trae esa por defecto).
6. El workflow arranca solo con el próximo push a `main`, o dispáralo a mano desde **Actions → Disparar notificaciones push → Run workflow** para probarlo enseguida.
7. Vuelve a **Ajustes** en la app y toca "Activar notificaciones" de nuevo en cada dispositivo (la suscripción push se crea al activarla, no es retroactiva).

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
  components/              # AppProvider, LockScreen, RewardOverlay, StreakShop, LevelsModal…
  lib/                     # gamificación, niveles, logros, temas, marcos, títulos, rareza, tiempo, sonido
supabase/migrations/       # esquema + RLS
public/sw.js               # service worker (offline + clic en notificaciones)
```
