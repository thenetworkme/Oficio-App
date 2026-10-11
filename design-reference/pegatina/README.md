# Oficio — propuesta Pegatina (15 pantallas)

## Qué trae
- `html/`: 15 pantallas interactivas. Abre `index.html` (o cualquier `Pegatina*.dc.html`) con doble clic. Necesitan `dc-runtime.js` (misma carpeta) y cargan las fuentes desde Google Fonts, así que requieren internet para verse con la tipografía correcta.
- `png/`: capturas de cada pantalla y de estados clave (errores, celebración, compra, tema Mocha). Se tomaron con fuentes locales de reemplazo, así que la tipografía varía un poco respecto al HTML.
- `docs/pegatina-tokens.json`: colores, fuentes, bordes, economía de monedas/XP y catálogo de la tienda.
- `PROMPT-RIVE-MUZA.md`: prompt para que tu IA integre el gato Muza (Rive) como mascota.

## Pantallas
| # | Archivo | Qué es |
|---|---|---|
| 01 | PegatinaPanel | Hoy: racha, mascota, semana, álbum de sellos |
| 02 | PegatinaTimer | Tomate (Pomodoro) |
| 03 | PegatinaStats | Números (semana / mes / año) |
| 04 | PegatinaLogros | Línea de tiempo de hitos + celebración |
| 05 | PegatinaTienda | Tienda de recompensas (sombreros, capas, accesorios, fondos) |
| 06 | PegatinaAvisos | Recordatorios |
| 07 | PegatinaHabilidad | Detalle de habilidad |
| 08 | PegatinaRegistro | Registro manual de horas |
| 09 | PegatinaCrear | Crear habilidad (4 pasos) |
| 10 | PegatinaAjustes | Perfil + Apariencia (8 temas que sí cambian los colores) |
| 11 | PegatinaLogin | Iniciar sesión (correo o Google) |
| 12 | PegatinaSignup | Crear cuenta (correo o Google) |
| 13 | PegatinaRecuperar | Recuperar contraseña (4 estados) |
| 14 | PegatinaOnboarding | Primeros pasos (4 pasos) |
| 15 | PegatinaCierre | Cierre de sesión de práctica |

## Notas
- Los `.dc.html` son prototipos de diseño, no código de producción. La referencia para construir en Next.js son el HTML/CSS visible, `docs/pegatina-tokens.json` y el prompt.
- La mascota de estas pantallas (Tomi, SVG) es provisional. La idea es reemplazarla por Muza (ver el prompt).
- Los botones de Google son maquetas: no hay autenticación real.
- Las miniaturas de los artículos de la tienda usan emojis; los dibujos reales solo existen sobre el personaje.
