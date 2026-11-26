# Arquitectura — cromodex

Decisiones técnicas acordadas. Los requisitos de producto están en [requirements.md](requirements.md).

## 1. Principios

1. **Anonimato por diseño.** El navegador **nunca** recibe el `user_id` de una publicación o negociación ajena. Todo acceso a datos ocurre en el servidor.
2. **Aceptar es atómico.** Cerrar un trato, descontar la copia, cancelar conflictos y registrar eventos ocurre en **una sola transacción**.
3. **Eventos persistidos** (outbox) para conectar notificaciones más adelante sin tocar la lógica.
4. **Escala mínima** (6 usuarios): monolito, sin colas ni microservicios.

## 2. Stack

| Capa | Elección |
|---|---|
| Framework | **Next.js (App Router) + TypeScript**, Server Components y Server Actions |
| UI | **Tailwind CSS + shadcn/ui**, mobile-first |
| Base de datos | **Supabase Postgres 17** (proyecto único `cromodex`, mismo para desarrollo y producción) |
| ORM / migraciones | **Drizzle ORM** + drizzle-kit |
| Auth | **Supabase Auth** — email + contraseña, vía `@supabase/ssr` |
| Deploy | **Docker** (Next.js `output: "standalone"`) en VPS propio con **Dokploy** |
| Entorno local | WSL2 Ubuntu 24.04, Node LTS (nvm), Docker Engine |

### Lo que NO se usa

- **El cliente de Supabase para datos desde el navegador** (PostgREST / supabase-js `.from()`): rompería el anonimato si una política fallara. Supabase en el cliente **solo para Auth**.
- **Bloques shadcn de Supabase** (`@supabase/supabase-client-nextjs` y similares): acceden a datos desde el cliente.
- **Supabase Storage / Realtime**: no hacen falta por ahora.

## 3. Supabase

- **Proyecto único** para desarrollo y producción.
- **Auth:** email + contraseña. Registro público **desactivado**, confirmación de email **desactivada** (autoconfirm). Los 6 usuarios los crea el admin a mano en *Authentication → Users*.
- **Esquema propio `app`**: todas las tablas de la aplicación viven ahí, **no expuesto** por la Data API. Además **RLS activado sin políticas** en todas las tablas como segunda barrera.
- `auth.users` lo gestiona Supabase; `app.profiles` lo extiende con el nombre visible.

### Variables de entorno (`.env.local`, nunca en git)

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del proyecto (sin `/rest/v1`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` — pública, para Auth en el cliente |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` — solo servidor (admin de usuarios) |
| `DATABASE_URL` | Transaction pooler, puerto **6543** — la usa la app |
| `DIRECT_URL` | Session pooler, puerto **5432** — la usa drizzle-kit para migraciones |

La conexión directa (IPv6) no se usa: WSL y el VPS no tienen IPv6 garantizado.

## 4. Modelo de datos (esquema `app`)

```
collections      (id uuid, slug, name)
cards            (id uuid, collection_id, code, sort_order)          -- 1..177, F1..F27
profiles         (id uuid = auth.users.id, display_name)

listings         (id uuid, collection_id, owner_id, card_code,
                  copies_total, copies_left,
                  status: active | withdrawn | exhausted,
                  created_at)

negotiations     (id uuid, listing_id, offerer_id,
                  alias,                                              -- "A", "B"… único por listing
                  status: open | accepted | rejected | cancelled | withdrawn,
                  turn: owner | offerer,
                  created_at, closed_at)

proposals        (id uuid, negotiation_id, by: owner | offerer, seq, created_at)
proposal_cards   (proposal_id, card_code)                             -- cartas que da el ofertante

trades           (id uuid, negotiation_id, listing_id,
                  owner_id, offerer_id,
                  owner_card, offerer_cards text[],
                  accepted_at)                                        -- registro público, inmutable

wanted           (user_id, collection_id, card_code)                  -- PK compuesta

events           (id uuid, type, payload jsonb, created_at, dispatched_at)   -- outbox
```

Notas:

- El autor siempre entrega **una copia de `listings.card_code`**; ese lado no se negocia. Las propuestas solo contienen lo que da el ofertante.
- La **propuesta vigente** es la de mayor `seq`.
- `card_code` se valida contra `cards` de la colección (que el código exista), pero **no** se valida que el usuario posea la carta.
- `trades` es independiente de `negotiations` para que el registro sea inmutable.
- Todos los IDs expuestos son **UUID aleatorios** (nunca secuenciales).
- `listings.card_code` y `wanted.card_code` tienen FK compuesta a `cards (collection_id, code)`. En `proposal_cards` la validación del código se hace en la capa de servidor.
- Un usuario solo puede tener **una publicación activa por carta** (índice único parcial): si tiene más copias, se suman a la existente.
- `app.profiles` se rellena con un **trigger sobre `auth.users`**: al crear un usuario en Supabase se crea su perfil con `display_name` = metadato `display_name` o, si no hay, la parte local del email.
- Los roles `anon` y `authenticated` no tienen `USAGE` sobre el esquema `app`.
- El seed de la colección es una migración más (`drizzle/0002_seed_rumbo_a_egghead.sql`).

## 5. Negociación — máquina de estados

```
            offer (ofertante)
  (nada) ───────────────────► OPEN (turn = owner)
                                │
     counter (quien tiene turno) ─► OPEN (turn = el otro) ─► …
                                │
     accept   (quien tiene turno) ─► ACCEPTED   → crea trade, revela nombres
     reject   (quien tiene turno) ─► REJECTED   → desaparece
     withdraw (cualquiera, si OPEN) ► WITHDRAWN → desaparece
     conflicto / listing retirado o agotado ─► CANCELLED → desaparece
```

- El autor no puede ofertar sobre su propia publicación.
- Rechazadas, retiradas y canceladas **no** aparecen en el registro.

## 6. Aceptar un trato (transacción)

```
BEGIN
  SELECT negotiation … FOR UPDATE      -- status = open y el turno es de quien acepta
  SELECT listing … FOR UPDATE          -- status = active y copies_left > 0
  INSERT trade (owner_id, offerer_id, owner_card, offerer_cards)
  UPDATE negotiation → accepted
  UPDATE listing copies_left - 1
     → si llega a 0: status = exhausted y cancelar sus negociaciones abiertas
  CANCELAR negociaciones OPEN del MISMO offerer cuya propuesta vigente
     contenga alguno de los códigos entregados en este trato
  INSERT events (trade.accepted, negotiation.cancelled × N)
COMMIT
```

- Dos aceptaciones simultáneas sobre la última copia: el `FOR UPDATE` serializa; la segunda ve `copies_left = 0` y falla limpiamente.
- La UI muestra antes el aviso: **"ESTA ACCIÓN NO SE PUEDE DESHACER. Al aceptar se revelará públicamente quiénes participan en el intercambio."**

## 7. Anonimato — cómo se aplica

- Toda lectura pasa por una **capa de consultas en servidor** que devuelve **DTOs** sin `owner_id` / `offerer_id`. En su lugar:
  - `isMine: boolean` (para ver lo propio),
  - `alias` de la negociación.
- Los nombres solo salen de `trades` (registro de aceptados).
- Lista de buscadas: solo agregados (`code`, `count`), nunca quién.
- **Test de anonimato**: recorre las respuestas del servidor y falla si aparece un `user_id` ajeno.

## 8. Eventos y notificaciones

- Cada mutación inserta en `app.events` **dentro de la misma transacción** (patrón outbox).
- Tipos previstos: `listing.created`, `listing.withdrawn`, `negotiation.offered`, `negotiation.countered`, `negotiation.rejected`, `negotiation.withdrawn`, `negotiation.cancelled`, `trade.accepted`.
- Fase posterior: un worker o cron lee `events WHERE dispatched_at IS NULL` y envía a Telegram (u otro canal). Añadir canales = añadir consumidores.

## 9. Tiempo real

- Inicio: refresco al volver a la pestaña y cada ~30 s.
- Si hace falta: Server-Sent Events leyendo de `app.events`.

## 10. Deploy

- `next.config` con `output: "standalone"`; **Dockerfile multi-stage** (deps → build → runner con `node server.js`).
- Variables `NEXT_PUBLIC_*` como **build args** en Dokploy (se incrustan en el build) además de env vars.
- **Migraciones** (drizzle-kit) como paso separado, no al arrancar el contenedor.
- Dokploy: repo privado vía GitHub App, build por Dockerfile, dominio con HTTPS (Traefik).
- `docker-compose.yml` para probar la imagen de producción en local.
- Cuando exista el dominio de producción, añadirlo en Supabase → *Authentication → URL Configuration → Redirect URLs*.

## 11. Herramientas de desarrollo (Claude Code)

- MCP **shadcn** y **next-devtools** (configuración de usuario, ejecutados en WSL).
- Plugin oficial **Supabase** (skills + MCP).
