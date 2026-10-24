# Aura

App personal de bienestar integral de Carolina: Mi día (organizador), Salud, Cuerpo y Finanzas. Uso 100 % personal.

## Cómo está armada
- `index.html`: toda la app (HTML, estilos y código en un solo archivo). Viene del artefacto de Claude, versión 18, adaptado para GitHub Pages.
- `manifest.json`, `icono.svg`, `apple-touch-icon.png`, `icono-192.png`, `icono-512.png`: para instalarla en el iPhone con el nombre y el ícono de Aura.
- `sw.js`: permite abrir la app sin conexión.

## Datos
- Se guardan en Supabase, proyecto `aura` (ref `xgzoooasopaxoyvtyqya`, región São Paulo).
- Tabla `docs (user_id, id, data)` con los documentos `estado`, `salud`, `cuerpo`, `finanzas`, `logs-AAAA-MM` y `dosis-AAAA-MM`.
- Archivos (exámenes, recetas, fotos de progreso) en el bucket privado `archivos`, en una carpeta por persona.
- Reglas RLS: cada persona solo puede ver y cambiar lo suyo. La URL y la clave pública de Supabase que están en `index.html` son públicas por diseño.
- El repositorio es público, pero no contiene datos personales.

## Publicar un cambio
1. Reemplaza el archivo que cambió en GitHub (Add file → Upload files).
2. GitHub Pages lo publica en uno o dos minutos.
3. En el iPhone, cierra Aura y vuelve a abrirla para ver la versión nueva.
Si cambian los íconos o el manifest, sube también el número de `CACHE` en `sw.js`.
