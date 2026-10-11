# Oficio · diseño de la app de 10.000 horas

App web para registrar cuántas horas le dedicas a cada habilidad hasta llegar a la maestría. Este paquete trae el diseño de 9 pantallas, capturas, el prompt para construirla con Next.js y documentos de apoyo.

## Contenido

```
oficio-diseno/
├── README.md              este archivo
├── PROMPT.md              prompt listo para pegar en Claude Code
├── html/                  diseño interactivo (abre html/index.html)
│   ├── index.html         menú con las 9 pantallas
│   ├── *.dc.html          una pantalla por archivo
│   └── dc-runtime.js      motor que dibuja las pantallas (no lo borres)
├── png/                   capturas de cada pantalla y sus estados
└── docs/
    ├── design-tokens.json colores de los 8 temas, fuentes, hitos
    ├── data-model.sql     esquema de Supabase con RLS
    └── roadmap.md         pantallas y mejoras que faltan
```

## Cómo verlo

1. Descomprime y abre `html/index.html` en el navegador (Chrome, Edge, Firefox o Safari).
2. Necesita internet para cargar las fuentes Bricolage Grotesque e IBM Plex Mono desde Google Fonts. Sin conexión se ve con fuentes del sistema.
3. Las pantallas se enlazan entre sí con el menú lateral.

## Qué es interactivo

| Pantalla | Qué puedes probar |
|---|---|
| Temporizador | Iniciar, pausar, reiniciar, saltar; modos de enfoque y descanso; elegir habilidad |
| Registro de horas | Cambiar habilidad, duración (− / + y atajos) y calidad; la vista previa se actualiza |
| Crear habilidad | Los 3 pasos; la proyección de años cambia con la meta y el ritmo |
| Logros | Pestañas por habilidad; "Ver celebración" abre el diálogo con confeti |
| Ajustes | Cambiar entre 8 temas (Catppuccin Mocha, Macchiato, Frappé y Latte, Oficio, Nord, Gruvbox, Rosé Pine) y el color de acento |
| Recordatorios | Interruptores y selector de días |

## Notas

- Todos los datos (horas, fechas, sesiones, racha) son de ejemplo, inventados para el diseño.
- Las capturas de `png/` se generaron con fuentes sustitutas (Inter y DejaVu Sans Mono) porque las fuentes finales no estaban disponibles donde las generé. Las proporciones son las mismas, pero la letra real es la de los archivos HTML con internet.
- El tema solo cambia los colores dentro de la pantalla de Ajustes. En la app real se aplica a todas las pantallas.
- Los archivos `.dc.html` son una referencia de diseño, no código de producción. Para construir la app usa `PROMPT.md`.
