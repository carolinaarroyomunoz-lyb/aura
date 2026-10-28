# Aura

App personal de bienestar integral de Carolina: Mi día (organizador), Salud, Cuerpo y Finanzas. Uso 100 % personal.

## Cómo está armada (desde la versión 22)
- `index.html`: la estructura de la página y el orden en que se cargan los archivos.
- `estilos.css`: todos los estilos (claro y oscuro).
- `js/`: el código, un archivo por área. Todos comparten las mismas variables; el orden de carga está en `index.html` y `inicio.js` va al final.
  - `base.js` utilidades · `catalogos.js` ejercicios y alimentos · `datos.js` datos de Cuerpo, carga y guardado · `nube.js` Supabase y sesión
  - `organizador.js` ciclo, asistente básica y Organizador · `calendario-pasos.js` calendarios conectados y pasos del iPhone
  - `mi-dia.js` hábitos, avisos del banco, resumen del día, calendario del mes y vistas · `salud.js` · `cuerpo.js` · `finanzas.js`
  - `registro.js` registro rápido y texto libre · `foto-ia.js` foto de comida con IA · `inicio.js` eventos y arranque
- `manifest.json`, `icono.svg`, `apple-touch-icon.png`, `icono-192.png`, `icono-512.png`: para instalarla en el iPhone con el nombre y el ícono de Aura.
- `sw.js`: permite abrir la app sin conexión. Si se agrega un archivo a `js/`, sumarlo a `CODE` en `sw.js` y subir el número de `CACHE`.
- `supabase/functions/foto-comida`: código de la función de Supabase que lee las fotos de comida con Gemini (solo de referencia; vive en Supabase).

## Foto de comida con IA
- Usa Gemini gratis (Google AI Studio) por la función de Supabase `foto-comida`. Solo se manda la foto, nunca datos personales.
- La clave va **solo** como secreto de Supabase (`GEMINI_API_KEY`), nunca en este repositorio. Tope de 40 fotos por día.

## Datos
- Se guardan en Supabase, proyecto `aura` (ref `xgzoooasopaxoyvtyqya`, región São Paulo).
- Tabla `docs (user_id, id, data)` con los documentos `estado`, `salud`, `cuerpo`, `finanzas`, `logs-AAAA-MM` y `dosis-AAAA-MM`.
- Archivos (exámenes, recetas, fotos de progreso) en el bucket privado `archivos`, en una carpeta por persona.
- Reglas RLS: cada persona solo puede ver y cambiar lo suyo. La URL y la clave pública de Supabase que están en `index.html` son públicas por diseño.
- El repositorio es público, pero no contiene datos personales.

## Publicar un cambio
1. Reemplaza el archivo que cambió en GitHub (Add file → Upload files). Para un archivo de `js/`, entra a la carpeta `js` y súbelo ahí. Un cambio chico también se puede hacer directo: abre el archivo, toca el lápiz (Edit), pega y guarda (Commit changes).
2. GitHub Pages lo publica en uno o dos minutos.
3. En el iPhone, cierra Aura y vuelve a abrirla para ver la versión nueva.
Si cambian los íconos o el manifest, sube también el número de `CACHE` en `sw.js`.
