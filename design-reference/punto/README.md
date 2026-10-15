# Oficio · estilo Punto (25 pantallas)

Diseño completo de la app de las 10.000 horas en un solo lenguaje visual: matriz de puntos para el tiempo, regla de 100 marcas para el camino a 10.000 h y una sola señal roja sobre negro.

## Contenido

```
oficio-punto/
├── README.md
├── html/                  diseño interactivo
│   ├── index.html         menú con las 25 pantallas
│   ├── Punto*.dc.html     una pantalla por archivo
│   └── dc-runtime.js      motor que dibuja las pantallas (no lo borres)
└── png/                   captura de cada pantalla (1360 px de ancho)
```

## Cómo verlo

1. Abre `html/index.html`. Si el navegador muestra la página en blanco, sírvela desde una carpeta local: `cd html && python3 -m http.server 8000` y abre http://localhost:8000
2. Necesita internet para cargar las fuentes Geist y Geist Mono (Google Fonts). Sin conexión se ve con fuentes del sistema.
3. Los enlaces entre pantallas funcionan (nav superior, botones y tarjetas).

## Pantallas

| Grupo | Pantallas |
|---|---|
| Núcleo | Hoy · Temporizador · Datos · Avisos · Detalle de habilidad · Registro manual · Crear habilidad |
| Cuenta y recompensas | Ajustes · Logros · Tienda |
| Acceso | Iniciar sesión · Crear cuenta · Recuperar contraseña · Primeros pasos |
| Sesión | Cierre de sesión · Foco · Modo zen · Descanso corto · Descanso largo |
| Retos | Lista · Crear · Detalle · Diario del día · Galería y diario · Cierre |

## Qué es interactivo

- Temporizadores (Hoy → Práctica, Foco, Zen, descansos): cuentan hacia atrás; pausa, reinicio y salto; props `focusMin`, `shortMin`, `longMin`.
- Hoy y Habilidad: filtro del mapa de actividad por habilidad; elegir habilidad cambia el botón principal.
- Datos: periodo de 7 días, 30 días o 12 semanas.
- Avisos: activar, cambiar días, crear un aviso nuevo.
- Registro manual, Crear habilidad, Crear reto y Primeros pasos: la vista previa y la proyección se recalculan al cambiar los valores.
- Ajustes: pestañas Perfil, Apariencia (tema y color de señal con vista previa) y Cuenta.
- Logros: filtro por habilidad. Tienda: canjear recompensas descuenta XP.
- Diario del día: minutos, mini objetivos, nota, dificultad y fotos.

## Tokens

| Token | Valor |
|---|---|
| Fondo | #0A0A0B |
| Superficie / punto apagado | #17171A – #1B1B1E |
| Línea fina | #232326 |
| Texto | #F4F4F1 |
| Texto secundario | #8A8A90 |
| Señal | #FF4A1C |
| Fuentes | Geist (texto) · Geist Mono (etiquetas y datos) |
| Radios | 999 px en botones; 22 px en cajas |

## Notas

- Las capturas de `png/` usan una fuente de respaldo parecida a Inter; en el navegador, con internet, se ven con Geist.
- Los dígitos del tiempo, los mapas de actividad y los íconos están dibujados con puntos en código, sin imágenes.
- Los datos son de ejemplo (Kobox, 14 oct 2026).
