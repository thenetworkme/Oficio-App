# Oficio — estilo Pomodoro

24 pantallas con la estructura de un temporizador Pomodoro clásico: color por modo (rojo foco, verde azulado descanso corto, azul descanso largo), tarjeta central y tareas.

## Cómo verlas
1. Abre `html/index.html` (menú de pantallas).
2. Si queda en blanco, sirve la carpeta: `cd html && python3 -m http.server` y abre http://localhost:8000
3. `png/` trae una captura de cada pantalla (con tipografía de reemplazo; el HTML carga Geist desde Google Fonts).

## Pantallas
| Pantalla | Archivo |
|---|---|
| Entrar | `PomoLogin.dc.html` |
| Crear cuenta | `PomoSignup.dc.html` |
| Recuperar acceso | `PomoRecuperar.dc.html` |
| Bienvenida (4 pasos) | `PomoOnboarding.dc.html` |
| Temporizador (Hoy) | `PomoTimer.dc.html` |
| Descanso corto | `PomoPausaCorta.dc.html` |
| Descanso largo | `PomoPausaLarga.dc.html` |
| Pantalla completa | `PomoFoco.dc.html` |
| Modo zen | `PomoFocoZen.dc.html` |
| Informe | `PomoInforme.dc.html` |
| Ajustes | `PomoAjustes.dc.html` |
| Avisos | `PomoAvisos.dc.html` |
| Habilidad | `PomoHabilidad.dc.html` |
| Registrar horas | `PomoRegistro.dc.html` |
| Nueva habilidad | `PomoCrear.dc.html` |
| Logros | `PomoLogros.dc.html` |
| Tienda | `PomoTienda.dc.html` |
| Sesión completada | `PomoCierre.dc.html` |
| Retos | `PomoRetos.dc.html` |
| Crear reto | `PomoRetoCrear.dc.html` |
| Detalle del reto | `PomoRetoDetalle.dc.html` |
| Día del reto | `PomoRetoDia.dc.html` |
| Galería del reto | `PomoRetoGaleria.dc.html` |
| Reto completado | `PomoRetoCierre.dc.html` |

## Tokens
- Colores: foco `#BA4949`, descanso corto `#38858A`, descanso largo `#397097`, texto en tarjetas `#555`, botón oscuro `#222`.
- Tipografía: Geist 400–800. Radios: 8 px tarjetas, 6 px botones y campos.
- Botón principal blanco con sombra de relieve de 6 px que se hunde al pulsar.
