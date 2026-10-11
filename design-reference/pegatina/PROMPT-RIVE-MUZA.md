# Prompt: integrar la mascota Muza (Rive) en Oficio

Copia todo lo de abajo y pégalo en tu modelo de IA, con el repo de la app abierto.

---

## Rol y contexto
Eres un ingeniero frontend senior. Estoy construyendo **Oficio**, una app web para registrar horas de práctica hasta llegar a las 10.000 horas de maestría (Pomodoro, estadísticas, rachas, logros y una tienda de recompensas). Stack: **Next.js (App Router) + TypeScript + Tailwind**. Estilo visual "Pegatina": neo-brutalista, bordes de 3px `#111`, sombras duras `6px 6px 0 #111`, fondo `#FFF4D6`, tipografías Space Grotesk y Space Mono. Los diseños de referencia están en `html/` y `png/` de la carpeta del diseño.

Quiero reemplazar la mascota provisional (un tomate en SVG llamado Tomi) por **Muza**, un gato animado hecho en Rive.

## El asset
- Nombre: "Muza - Your Cat Companion", autor **hafizs**.
- URL: https://rive.app/marketplace/19989-37593-muza-your-cat-companion/
- Licencia: **CC BY 4.0**. Obliga a dar crédito al autor (ver "Atribución").
- Datos que sé del archivo: artboard `Artboard`, state machine `State Machine 1`. Los ojos siguen el cursor; se puede tocar o hacer clic en la cabeza y mantener el cursor sobre la barbilla para interactuar.
- NO sé qué inputs, triggers o propiedades expone la state machine. **No los inventes.** Descúbrelos primero (paso 1).
- Yo descargo el archivo desde el marketplace (botón Download) y lo dejo en `public/rive/muza.riv`. Si el archivo no existe, para y avísame; no lo sustituyas por otro.

## Entregable
Un componente reutilizable `<Mascot />` y su integración en las pantallas listadas abajo. Primero haz un plan breve y espera mi OK; después implementa.

### Paso 1 — Descubrir el archivo (obligatorio, antes de diseñar nada)
1. Instala `@rive-app/react-canvas` (la versión estable actual).
2. Crea una página temporal `/dev/mascot` que cargue `muza.riv` con `artboard: "Artboard"` y `stateMachines: "State Machine 1"`, y muestre en pantalla y en consola: nombres de artboards, state machines, y por cada input de `rive.stateMachineInputs("State Machine 1")` su `name` y `type` (Boolean, Number o Trigger). Si el runtime lo permite, lista también las propiedades del ViewModel.
3. Pruébalo con el ratón: ojos, clic en cabeza, mantener en barbilla.
4. Repórtame el resultado en una tabla. Con eso decidimos el paso 3. Borra la página de dev antes de terminar.

### Paso 2 — Componente `<Mascot />`
Ruta sugerida: `components/mascot/Mascot.tsx`. Requisitos:
- `"use client"`, cargado con `next/dynamic` y `ssr: false`, con un fallback estático (un PNG del gato) para el primer render y para cuando falle la carga.
- `useRive({ src: "/rive/muza.riv", artboard: "Artboard", stateMachines: "State Machine 1", autoplay: true, layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }) })`.
- Props: `size` (px), `mood?: "idle" | "celebrate" | "cheer" | "sleepy"`, `hat?`, `cape?`, `acc?`, `bg?`, `tint?`, `className?`, `onClick?`.
- Accesible: contenedor con `role="img"` y `aria-label` (por ejemplo "Muza, tu gato compañero"). Respeta `prefers-reduced-motion`: pausa la animación con `rive.pause()` y muestra el fotograma estático.
- Un solo archivo `.riv` en caché; no más de una instancia animada por pantalla (las demás, estáticas). Libera con `rive.cleanup()` al desmontar.
- Marco "pegatina" alrededor del canvas: borde 3px `#111`, radio 28px, fondo configurable con `bg`. El canvas debe tener fondo transparente.

### Paso 3 — Reacciones según lo que exponga el archivo
Mapea eventos de la app a reacciones del gato. Si la state machine tiene inputs útiles, úsalos con `useStateMachineInput`. Si NO tiene inputs que yo pueda disparar (probable, porque la interacción parece basada en el puntero), implementa estas alternativas, de menor a mayor esfuerzo, y dime cuál usaste:
1. **Envoltura de movimiento** (Framer Motion o CSS): rebote al completar un tomate, giro corto al comprar un ítem, escala al subir de nivel. El gato Rive sigue con su idle y su seguimiento de ojos.
2. **Burbuja de diálogo** sobre el gato (sticker rosa rotado, como en el diseño) con frases cortas por evento.
3. **Opcional, mejor resultado:** te explico cómo hacer un *remix* del archivo en el editor de Rive para agregar inputs `celebrate` (Trigger), `sleepy` (Boolean) y `hat`/`cape`/`acc` (Number, 0 = nada). Solo si el remix está permitido por la licencia; mantén el crédito al autor original.

Eventos de la app: tomate completado (celebrar), sesión guardada con enfoque 4 o 5 (celebrar), compra en tienda (celebrar), racha en riesgo después de las 8 pm (sleepy/triste), hito alcanzado (celebrar), pantalla de login (idle).

### Paso 4 — Ítems de la tienda (sombreros, capas, accesorios, fondos)
El archivo de Muza no trae ropa. Resuelve en este orden y justifica la decisión:
- **MVP:** superponer imágenes (SVG/PNG con fondo transparente) sobre el canvas, posicionadas en porcentajes respecto a la cabeza y el cuerpo, con z-index por capa: capa (detrás), cuerpo, accesorio de cuello, sombrero (delante). Los fondos son un color CSS detrás del canvas. Advertencia: si la cabeza se mueve en la animación, la superposición puede desfasarse; mide cuánto y dime si es aceptable.
- **Mejor:** agregar los ítems como capas dentro del archivo Rive (remix), anclados al hueso de la cabeza, controlados por inputs numéricos.
- Para variar el color del gato sin remix puedes usar un `filter: hue-rotate()` o similar, solo si se ve bien; si no, omite el selector de color en el onboarding.
- Catálogo (ids exactos, precio en monedas): sombreros `cap` 0, `chef` 120, `top` 150, `wiz` 250, `crown` 400 (Nv. 15); capas `red` 200, `star` 350, `master` 800 (5.000 h); accesorios `glass` 90, `mono` 100, `bow` 60, `scarf` 130; fondos `cream` 0, `mint` 80 (#BFF2D6), `sky` 80 (#BFE3FF), `lilac` 100 (#E3D5FF), `sunset` 120 (#FFC9A3). Dibuja o pídeme los assets de los ítems; no uses emojis para lo que se ve sobre el gato.

### Paso 5 — Dónde va en las pantallas
- **Hoy:** tarjeta de mascota en el hero, con enlace a la tienda y burbuja "¡Racha N!".
- **Tienda:** vista previa grande y sticky con el gato y lo que lleva puesto; se actualiza al comprar o equipar.
- **Cierre de sesión de práctica:** el gato celebrando junto a +horas, +monedas y +XP.
- **Onboarding (paso 1):** presentar a Muza y pedir su nombre; quita la elección de especie (tomate/búho/gato) porque ahora es solo Muza.
- **Login, Crear cuenta y Recuperar contraseña:** gato en el panel izquierdo con una burbuja de saludo distinta por pantalla.

### Paso 6 — Datos y persistencia
- Tablas (Postgres/Supabase): `pet` (user_id, name, level, xp), `inventory` (user_id, item_id, acquired_at), `equipped` (user_id, hat, cape, acc, bg) y `coin_ledger` (user_id, delta, reason, created_at). El saldo es la suma del ledger.
- Reglas de economía: monedas por sesión = `round(min/25*10) + (enfoque >= 4 ? 5 : 0)`; XP = `round(min*(0.8+enfoque*0.1))`; 100 monedas de bienvenida en el onboarding.
- La compra debe ser transaccional en el servidor: valida saldo, nivel o horas requeridas y que no esté ya comprado. No confíes en el cliente.

### Atribución (obligatoria por CC BY 4.0)
Agrega una sección "Créditos" en Ajustes (y en el footer si hay uno) con este texto: *"Mascota Muza – Your Cat Companion, por hafizs, licencia CC BY 4.0, https://rive.app/marketplace/19989-37593-muza-your-cat-companion/. Hecha con Rive."* Si modificamos el archivo, indica que fue modificado.

## Criterios de aceptación
- El gato carga sin errores en Chrome, Safari y móvil; si falla la carga se ve el PNG estático.
- Con `prefers-reduced-motion` no hay animación continua.
- Comprar y equipar ítems cambia lo que lleva el gato al instante y persiste al recargar.
- Lighthouse de performance no baja más de 5 puntos en las pantallas con mascota.
- La atribución es visible.
- Cero valores inventados: lo que no exista en el archivo Rive, lo reportas en lugar de suponerlo.

## Qué NO hacer
- No cambies el estilo visual de las pantallas ni los textos.
- No uses otra mascota si falta el archivo.
- No inventes nombres de inputs.
- No ocultes la atribución.
