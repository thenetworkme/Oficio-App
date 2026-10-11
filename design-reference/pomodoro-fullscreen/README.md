# Oficio — Pomodoro en pantalla completa (estilo Pegatina)

1. PegatinaFoco — enfoque: tiempo gigante, objetivo del día, pausa / +5 min / terminar
2. PegatinaFocoZen — modo zen: fondo negro, solo el tiempo
3. PegatinaPausaCorta — descanso corto (verde) con checklist de 3 cosas
4. PegatinaPausaLarga — descanso largo (azul) al completar 4 tomates

## Uso
- html/: servir desde un servidor local (p. ej. `npx serve html`). Incluye dc-runtime.js. Fuentes Space Grotesk / Space Mono desde Google Fonts.
- png/: capturas de referencia (1360x860).
- Los temporizadores cuentan hacia atrás cada segundo. Props editables: `start` y `total` (segundos).
- Enlaces a PegatinaTimer, PegatinaCierre y entre estas 4 pantallas; los que apuntan a pantallas fuera de este zip no resuelven.

## Tokens (Pegatina)
bg #FFF4D6 · tinta #111 · amarillo #FFD84D · rosa #FF8FB8 · verde #7BE0A4 · azul #7CC4FF · crema zen #FFF4D6 sobre #111
Bordes 3px, sombra dura 6px 6px 0, Space Grotesk + Space Mono.

## Reglas
- Ciclo: 4 tomates de enfoque → descanso largo; entre tomates, descanso corto.
- Tiempo grande con `font-variant-numeric: tabular-nums` para que los dígitos no bailen.
