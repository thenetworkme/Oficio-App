# Oficio — Perfil + icono

## pantallas/
- `Settings.dc.html`: Ajustes con pestañas **Perfil** y **Apariencia**. Ábrelo con doble clic (usa `dc-runtime.js` de la misma carpeta). Ya trae el favicon enlazado.
- PNGs: perfil y apariencia (Mocha, Latte, Nord).
- Nota: los PNG se renderizaron con fuentes locales de reemplazo; el HTML carga Bricolage Grotesque e IBM Plex Mono desde Google Fonts.

## icono/
| Archivo | Uso |
|---|---|
| `icon.svg` | Favicon principal (vector) |
| `favicon.ico` | Fallback 16/32/48 |
| `apple-icon.png` | 180×180, iOS |
| `icon-192.png`, `icon-512.png` | PWA |
| `icon-maskable-512.png` | PWA maskable (Android) |
| `favicon-16/32/48.png` | Por si los necesitas sueltos |
| `logo-mark.svg` | Solo el símbolo, fondo transparente |
| `logo-horizontal-oscuro.svg` / `-claro.svg` | Símbolo + "Oficio" para fondo oscuro / claro. El texto usa Bricolage Grotesque 800; conviértelo a trazos en Figma/Inkscape si lo vas a usar fuera de la web. |
| `site.webmanifest` | Manifest PWA |

Colores: fondo `#111311`, ámbar `#F0A93B`, aro `#4A5048`.

## Next.js (App Router)
Copia a `app/`:
```
app/icon.svg
app/favicon.ico
app/apple-icon.png
```
Next los detecta solo y genera los `<link>`. Para PWA, pon `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` y `site.webmanifest` en `public/` y en el layout:
```ts
export const metadata = { manifest: '/site.webmanifest' }
```

## HTML plano
```html
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#111311">
```
