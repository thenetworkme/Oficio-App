# Prompt para construir Oficio con Next.js

Copia todo lo que está debajo de la línea y pégalo en Claude Code (o tu IA de código), con esta carpeta abierta como referencia. Los diseños están en `html/` (abre `html/index.html`) y las capturas en `png/`.

---

## Rol y objetivo

Eres un desarrollador full stack senior. Vas a construir **Oficio**, una app web en español para registrar las horas de práctica de cada habilidad hasta llegar a las 10.000 horas de maestría. Incluye Pomodoro integrado, estadísticas, recordatorios, logros e hitos con celebración y temas de color (Catppuccin y otros).

Los diseños de referencia están en `html/*.dc.html` (se abren en el navegador) y en `png/`. **Reprodúcelos con fidelidad**: misma estructura, jerarquía, espaciados, textos y comportamiento. Los datos que se ven en los diseños son de ejemplo; en la app salen de la base de datos.

## Stack (verifica versiones vigentes antes de instalar)

- Next.js (App Router) + TypeScript estricto
- Tailwind CSS v4 + shadcn/ui (Radix) + `lucide-react` para iconos
- Gráficos: Recharts vía componentes de gráficos de shadcn. El mapa de constancia (14 semanas) se hace con un grid de divs.
- `next-themes` para temas, `zustand` (con `persist`) para la sesión del timer
- `react-hook-form` + `zod` para formularios, `date-fns` (locale `es`) para fechas
- Supabase (Postgres + Auth + RLS), esquema en `docs/data-model.sql`
- Fuentes con `next/font/google`: **Bricolage Grotesque** (texto) e **IBM Plex Mono** (números, horas, tiempos)
- PWA + Web Push con service worker (por ejemplo Serwist) para los recordatorios
- Pruebas: Vitest para la lógica (hitos, proyecciones, racha) y Playwright para los flujos principales

## Tokens de diseño y temas

- Los tokens están en `docs/design-tokens.json`: 8 temas (Oficio por defecto, Catppuccin Mocha, Macchiato, Frappé y Latte, Nord, Gruvbox, Rosé Pine). Cada tema define: `bg`, `card`, `line`, `text`, `muted`, `on` (texto sobre el acento), `track`, `sel` y una lista de acentos.
- Impleméntalos como variables CSS por tema (`[data-theme="mocha"] { --bg: …; --card: …; … }`) y expónlos a Tailwind con `@theme inline`. Ningún componente usa colores hex directos.
- Acento elegido por el usuario: `--accent`. Los colores de las otras habilidades (`--a2`, `--a3`) son los dos primeros acentos de la paleta del tema distintos del acento elegido. Las habilidades guardan un color propio; en el diseño las tres primeras usan acento, agua y lila.
- Tema y acento se guardan en `profiles` y se aplican antes de pintar (sin parpadeo). "Seguir el tema del sistema" usa Latte de día y Mocha de noche.
- Radios: tarjetas 16–20 px, botones 10–12 px, chips 999 px. Altura mínima de controles táctiles: 44 px.
- Etiquetas pequeñas en mayúsculas con `letter-spacing: 0.06em`, tamaño 12–13 px, color `muted`.
- Todo número de horas, tiempos y porcentajes usa IBM Plex Mono.

## Rutas y pantallas

| Ruta | Diseño de referencia | Resumen |
|---|---|---|
| `/` (Panel) | `Main.dc.html` | Saludo, resumen (hoy, semana, total), tarjetas por habilidad con progreso hacia 10.000 h y hitos, gráfico semanal, mapa de constancia, próximos recordatorios |
| `/temporizador` | `Timer.dc.html` | Pomodoro con modos Enfoque, Descanso corto y largo; anillo de progreso; iniciar, pausar, reiniciar y saltar; 4 puntos por ciclo; elegir habilidad e intención; sesiones de hoy |
| `/estadisticas` | `Stats.dc.html` | Camino a 10.000 h con proyección, horas por mes, reparto por habilidad, mejor franja del día, métricas |
| `/logros` | `Achievements.dc.html` | Línea de tiempo de hitos por habilidad y celebración con confeti |
| `/recordatorios` | `Reminders.dc.html` | Lista con interruptores, formulario para crear, aviso para activar notificaciones, protección de racha |
| `/habilidades/[id]` | `Skill.dc.html` | Detalle: progreso, hitos, sesiones recientes con calidad, horas por semana, metas |
| `/registrar` | `LogHours.dc.html` | Registro manual de una sesión con vista previa de lo que suma |
| `/habilidades/nueva` | `NewSkill.dc.html` | Onboarding en 3 pasos con proyección en vivo |
| `/ajustes` | `Settings.dc.html` | Selector de tema, color de acento y vista previa en vivo |
| `/login` | (sin diseño) | Correo y Google, con el mismo estilo visual |

Layout general: barra lateral de 248 px (Panel, Temporizador, Estadísticas, Logros, Recordatorios, Ajustes) con la tarjeta de racha abajo. En pantallas angostas la barra pasa arriba o se convierte en navegación inferior. La pantalla de onboarding no lleva barra lateral.

## Lógica que debes implementar (con pruebas)

1. **Hitos**: `[1, 10, 100, 500, 1000, 5000, 10000]` horas. Un hito se logra cuando `total_horas >= hito`. Se guarda en `achievements` (único por habilidad y hito) con la fecha en que se cruzó.
2. **Celebración**: al guardar una sesión (timer o manual), si `antes < hito <= después` para algún hito, muestra el diálogo de celebración (aro que se completa, horas, nombre, fecha, "Te tomó X"). Respeta `prefers-reduced-motion`: sin confeti ni animación.
3. **Proyección** (Estadísticas, Onboarding, Logros): `horas_semana = minutos_dia * dias_semana / 60`; `semanas = horas_restantes / horas_semana`. Si `semanas < 9` muestra semanas; si los meses (`semanas / 4.345`) son `< 24` muestra meses; si no, años con un decimal (sin decimales desde 10 años).
4. **Racha**: días consecutivos con al menos el mínimo diario configurado (por defecto 30 min), según la zona horaria del usuario. Protección de racha: recordatorio a las 8:00 pm si todavía no llegó al mínimo.
5. **Timer**: guarda `startedAt` y duración en el store (persistido) y calcula el tiempo restante con `Date.now()`, nunca restando 1 por tick; así sigue exacto con la pestaña en segundo plano y se recupera al recargar. Al terminar Enfoque, ofrece guardar la sesión con calidad (1 a 5) y nota. Cada 4 Pomodoros, descanso largo. Duraciones configurables (25 / 5 / 15 por defecto).
6. **Registro manual**: duración con pasos de 15 min (mínimo 15, máximo 12 h), atajos 15m, 30m, 45m, 1h, 1h 30m, 2h y 3h. La vista previa muestra el total nuevo de la habilidad y el progreso de la meta del día.
7. **Formato**: miles con punto y decimales con coma (`1.284`, `12,8 %`); fechas en español (`22 de abril de 2026`).
8. **Recordatorios**: crear, activar o desactivar y repetir por días de la semana. Entrega con Web Push (el usuario debe aceptar el permiso desde el botón "Activar notificaciones"). Tipos: práctica, protección de racha, revisión semanal.

## Datos

Usa `docs/data-model.sql` (tablas `profiles`, `skills`, `sessions`, `reminders`, `achievements`, con RLS por usuario). Las consultas de totales, semanas, meses y franja horaria se hacen en SQL o en funciones del servidor; no calcules agregados en el cliente con listas completas.

## Accesibilidad y calidad

- Elementos reales: `button`, `a`, `input` con `label`, `dialog` accesible para la celebración (foco atrapado, cierre con Escape).
- Interruptores con `role="switch"` y `aria-checked`; grupos de chips con `aria-pressed`; iconos sin texto con `aria-label`.
- Contraste mínimo 4.5:1 para texto en todos los temas (revisa Latte con acentos claros).
- Responsive desde 360 px de ancho.
- Textos de interfaz en español; deja listo para i18n si quieres agregar inglés.

## Orden de trabajo

1. Proyecto, Tailwind v4, shadcn/ui, fuentes, tokens y temas (pantalla de Ajustes primero, para validar el sistema de temas).
2. Supabase: esquema, RLS, autenticación, seeds de ejemplo.
3. Layout con barra lateral y Panel con datos reales.
4. Temporizador con store persistido y guardado de sesión.
5. Registro manual y detalle de habilidad.
6. Onboarding de habilidad nueva.
7. Estadísticas y Logros con celebración.
8. Recordatorios y Web Push (PWA).
9. Pruebas, accesibilidad, revisión visual contra `png/`.

Después de cada paso corre el proyecto, compara con la captura correspondiente en `png/` y corrige diferencias antes de seguir. Al terminar, dame un resumen corto con lo hecho, lo que falta y cualquier decisión que tomaste.
