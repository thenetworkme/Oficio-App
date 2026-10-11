# Oficio — Retos (estilo Pegatina)

6 pantallas del feature "Creación de retos" (ej. 30 días para aprender guitarra).

1. PegatinaRetos — lista de retos (activos / completados / pausados)
2. PegatinaRetoCrear — crear reto (duración, meta diaria, días de gracia, recordatorio, "mi porqué")
3. PegatinaRetoDetalle — tablero de días + diario reciente
4. PegatinaRetoDia — diario del día (tiempo, notas, etiquetas, fotos, ánimo, dificultad)
5. PegatinaRetoGaleria — fotos, "Día 1 vs hoy" y diario con buscador
6. PegatinaRetoCierre — cierre: completado / sin terminar

## Uso
- html/: abre cada archivo desde un servidor local (p. ej. `npx serve html`); necesitan dc-runtime.js (incluido) y las fuentes Space Grotesk / Space Mono (Google Fonts).
- png/: capturas de referencia, incluidas las variantes (cierre sin terminar, galería comparar y diario).
- Los enlaces a PegatinaPanel, PegatinaTimer, etc. apuntan a pantallas que no están en este zip.

## Tokens (Pegatina)
bg #FFF4D6 · tinta #111 · amarillo #FFD84D · rosa #FF8FB8 · verde #7BE0A4 · azul #7CC4FF · naranja #FF9F5A · bloqueado #E9E4D4
Bordes 3px, radio 14, sombra dura 6px 6px 0, fuentes Space Grotesk + Space Mono.
Chispa (perro) en el cierre usa el generador buildSvg del pack de personajes.

## Reglas de datos usadas en el mock
- Monedas por día = round(min/25*10) + 5 si ánimo ≥ 4; XP = round(min*(0.8+ánimo*0.1)).
- Máximo 3 retos activos; días de gracia configurables (0–3).
- Las horas del reto suman a las 10.000 h de la habilidad vinculada.
