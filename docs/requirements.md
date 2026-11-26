# Requisitos — cromodex

Tablón de intercambio de cromos **anónimo** entre un grupo cerrado de usuarios. No es un gestor de colección: cada uno publica las cartas que quiere cambiar y se negocia a ciegas hasta que se acepta un trato.

## 1. Usuarios y acceso

- Grupo cerrado de **6 usuarios**, con login. No hay registro público.
- Toda la actividad (publicaciones, ofertas, cartas buscadas) es **anónima** para el resto de usuarios.
- La identidad solo se revela en los **intercambios aceptados**.
- El administrador (dueño de la base de datos) puede ver todo; el grupo confía en él. No se requiere anonimato a nivel técnico.

## 2. Colecciones

- Todo pertenece a una **colección**. Por ahora solo existe *One Piece — Rumbo a Egghead* (Panini): cromos `1`–`177` y `F1`–`F27`.
- El modelo debe permitir añadir colecciones en el futuro sin cambios estructurales.

## 3. Publicaciones (tablón)

- Un usuario publica un **código de carta** y un **número de copias** disponibles.
- Cada copia permite cerrar **un trato independiente**: una publicación con 3 copias admite hasta 3 intercambios aceptados.
- El tablón muestra todas las publicaciones activas de la colección, **sin autor visible**.
- Cuando todas las copias se han intercambiado, la publicación **desaparece** del tablón.
- El autor puede **retirar** su publicación en cualquier momento; las negociaciones abiertas sobre ella se cancelan.

## 4. Negociaciones

- Cualquier usuario (excepto el autor) puede abrir una **negociación** sobre una publicación ofreciendo uno o varios códigos de carta: *"te doy 45 y F12 por tu 88"*.
- El autor siempre da **una copia de la carta publicada**; ese lado no se modifica.
- La negociación avanza por **turnos**: cada turno es una propuesta con la lista de códigos que da el ofertante.
  - El autor puede **contraofertar** pidiendo otra combinación de códigos: *"vale, pero añade la 15"*.
  - El ofertante puede responder con otra propuesta.
  - Quien recibe la última propuesta puede **aceptarla**, **contraofertar** o **rechazar** la negociación entera.
- **Solo códigos**: no hay chat ni texto libre.
- **No se valida** que el ofertante tenga las cartas que ofrece.
- Puede haber **varias negociaciones abiertas** sobre la misma publicación.
- **Todas las negociaciones son visibles para todos** (para poder mejorar ofertas), pero son **irrastreables**:
  - Cada negociación tiene un **alias propio** (p. ej. *Oferta A*, *Oferta B*), único dentro de esa publicación.
  - No se puede saber si dos negociaciones distintas pertenecen a la misma persona.
- Mientras no se haya aceptado, cualquiera de las dos partes puede **retirarse** (cancelar la negociación).
- Las negociaciones **rechazadas o canceladas desaparecen**: no quedan en el registro.

## 5. Aceptar un trato

- Antes de aceptar se muestra un **aviso explícito**:
  > **ESTA ACCIÓN NO SE PUEDE DESHACER.** Al aceptar se revelará públicamente quiénes participan en el intercambio.
- Al aceptar:
  1. El intercambio queda **cerrado y es definitivo**.
  2. Se descuenta una copia de la publicación (y desaparece si llega a 0).
  3. **Cancelación de ofertas en conflicto:** se cancelan automáticamente las demás negociaciones abiertas en las que **el ofertante del trato aceptado** esté ofreciendo **alguno de los códigos** que acaba de entregar.
  4. Se registra el intercambio con los nombres de ambos participantes.

## 6. Registro de intercambios

- Público para todos los usuarios.
- Muestra solo los intercambios **aceptados**, **con nombres**: *"Pepe ⇄ Laura — 88 por 45 + 15"*, con fecha.
- Las negociaciones en curso no aparecen en el registro (se ven en el tablón, anónimas).

## 7. Cartas buscadas

- Cada usuario mantiene su lista de **códigos que busca**.
- Todos ven la **lista agregada** (p. ej. *"F7 — buscada por 2"*), sin saber quién la busca.

## 8. Notificaciones (fase posterior)

- Fuera del alcance inicial. Candidato: canal o bot de Telegram.
- Requisito de arquitectura: cada acción relevante (publicación, oferta, contraoferta, aceptación, cancelación) emite un **evento de dominio** persistido, de modo que añadir un canal de avisos sea conectar un consumidor sin tocar la lógica de negocio.

## 9. Fuera de alcance (por ahora)

- Gestión de colección personal (tengo / falta / repes).
- Fotos de cromos.
- Estadísticas.
- Chat o mensajes de texto.
- Validación de que los usuarios poseen las cartas que ofrecen.
