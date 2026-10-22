# Aripajama · Travel Planner

Base de una experiencia visual **mobile first**, desarrollada con React, TypeScript y Vite. La portada reproduce el vídeo en cada visita y presenta progresivamente la marca, los textos y el acceso a la siguiente pantalla.

## Arrancar el proyecto

Requiere **Node.js 22.12 o posterior** (recomendado Node 24).

```sh
npm install
npm run dev
```

Abre la URL que muestra Vite, normalmente `http://localhost:5173`. El servidor escucha también en la red local para facilitar la revisión desde un móvil conectado a la misma Wi-Fi.

```sh
npm run build     # TypeScript y compilación de producción → dist/
npm run preview   # Previsualizar la compilación
```

El contenido de `dist/` se puede publicar en un alojamiento estático. La configuración actual utiliza la raíz del dominio.

## Experiencia de entrada

- Al principio solo se muestra el vídeo, sin sonido, sin controles, sin bucle y dentro de la página en iOS.
- La secuencia empieza **en el primer segundo del vídeo**, según el tiempo real de reproducción, no según el tiempo de carga de la página.
- Primero se dibuja **Aripajama**: una máscara SVG sigue los trazos de la imagen original, ya preparada con fondo transparente. No se usa una fuente de sustitución.
- Después aparecen **Travel Planner**, **El mundo,**, **a tu manera.**, **VIAJES DISEÑADOS CONTIGO** y, por último, **COMENCEMOS →**. La composición vertical sitúa la marca arriba a la derecha y el titular burdeos con su segunda línea en cursiva taupe a media altura, sobre el fondo blanco del globo y las cintas doradas.
- El botón se habilita al finalizar su fundido o al terminar el vídeo, lo que ocurra primero. Con el vídeo actual, de **7,5 s**, el final completa la composición y la deja operativa, conservando el último fotograma.
- «Comencemos» abre el hub con un fundido cruzado de **800 ms**; «Volver a la portada» regresa suavemente y vuelve a iniciar la introducción. Una recarga también la reinicia.
- Si se bloquea el autoplay, se ofrece reproducción manual o acceso a la portada fija. Si falla el archivo, se muestra la imagen final con la composición lista.
- Con **movimiento reducido** se muestra directamente la portada estática y no se solicita el vídeo.

### Tiempos aproximados para el vídeo actual (7,5 s)

| Elemento | Inicio desde el comienzo del vídeo |
| --- | --- |
| Escritura del logo | 1 s |
| Travel Planner | 4 s |
| El mundo, | 4,65 s |
| a tu manera. | 5,35 s |
| Viajes diseñados contigo | 6,25 s |
| Comencemos | 7,2 s; disponible al terminar el vídeo (7,5 s) |

La frecuencia de eventos del navegador puede desplazar ligeramente el inicio. El contenido sigue siendo texto HTML salvo el nombre de marca; las fuentes se sirven localmente, sin peticiones a Google Fonts.

## Fondo del hub

- `videohub.mp4` se sirve mediante su derivado `/media/hub.mp4`: reproducción automática, sin audio, en bucle y dentro de la página en iOS.
- Se recortan los últimos **0,5 s** del original y se mezclan **18 pares de fotogramas** del final y del comienzo, con un fundido suavizado y extremos completos. El ciclo preparado dura **8,75 s** (210 fotogramas) y mantiene la resolución de 720 × 1280 a 24 fps.
- La portada permanece visible mientras se prepara el vídeo o su imagen inicial. Durante el fundido conviven ambas pantallas; la saliente se retira al finalizar. Si la carga no responde en 3 s, se permite entrar con un fondo de color de respaldo.
- El vídeo cubre toda la pantalla mediante `object-fit: cover`, sin deformarse; en horizontal el encuadre se recorta por arriba y abajo. Un velo ligero en los extremos ayuda a leer los controles.
- Sobre el paisaje aparecen «Tu viaje, en tres formas», un separador y «Conóceme, inspírate y empieza a crear tu próxima historia.». Los textos «01 — Quién soy», «02 — Biblioteca de viajes» y «03 — Crear mi viaje» se distribuyen escalonados sobre las ventanas, con una entrada suave y una composición adaptada a horizontal y escritorio.
- Los tres textos numerados son contenido estático hasta disponer de sus páginas de destino. Se mantienen el regreso a la portada y el control de pausa/reproducción del fondo.
- Si el autoplay se bloquea, se puede reproducir manualmente. Si el vídeo falla, se conserva la imagen inicial. WebKit reanuda la reproducción tras el salto nativo del bucle, respetando las pausas del usuario.
- Con movimiento reducido se utiliza la imagen estática, no se descarga el vídeo y se omite el fundido.

## Estructura y personalización

```text
src/
  components/Brand.tsx         Logo original y guías SVG de escritura
  hooks/useReducedMotion.ts   Preferencia de movimiento del sistema
  screens/IntroScreen.tsx     Vídeo, sincronización, textos y recuperación
  screens/JourneyScreen.tsx   Fondo del hub, textos, respaldo y controles
  App.tsx                    Preparación y fundido entre las pantallas
  styles.css                 Diseño mobile first y animaciones
public/
  brand/aripajama.webp        Nombre de marca con transparencia
  media/portada.mp4           Vídeo preparado para la web
  media/portada-inicio.webp   Primer fotograma para la carga
  media/portada-final.webp    Último fotograma para el respaldo
  media/hub.mp4               Fondo del hub con unión suave del bucle
  media/hub-inicio.webp       Primer fotograma y respaldo del hub
scripts/prepare-assets.mjs    Generación reproducible de los recursos
tests/intro.spec.ts           Comprobaciones en Chromium y WebKit
tests/journey.spec.ts         Fundido, bucle, controles y alternativas del hub
tasks/todo.md                Plan y revisión del trabajo
```

- **Textos:** `src/screens/IntroScreen.tsx` y `src/screens/JourneyScreen.tsx`.
- **Colores, posición, tamaños y tiempos entre elementos:** `src/styles.css`. Los retardos de `.reveal-item` son relativos al inicio de la escritura.
- **Momento de inicio:** constante `REVEAL_AT` de `src/screens/IntroScreen.tsx`, en segundos de reproducción.
- **Velocidad del trazo:** `start` y `duration` de las guías de `src/components/Brand.tsx`.
- **Navegación del hub:** conectar los tres textos de `src/screens/JourneyScreen.tsx` con sus destinos cuando estén definidos; actualmente se presentan sin interacción.

En móvil el vídeo llena la pantalla y la composición se sitúa sobre el espacio claro. En horizontal y escritorio, el paisaje ocupa la zona izquierda, con un borde fundido, y la marca y los textos ocupan la derecha. Se contemplan zonas seguras, teclado y objetivos táctiles de al menos 44 px.

## Regenerar recursos

Los derivados ya están incluidos: **FFmpeg no es necesario para arrancar ni compilar**. Para regenerarlos se necesita `ffmpeg` en el PATH:

```sh
npm run assets:prepare
```

Este comando parte de `videoPortadaNuevo.mov`, `videohub.mp4` y `letrasAripajama.png` en la raíz y conserva los originales. Para la portada convierte HEVC a H.264 (CRF 18, `yuv420p`), sin audio ni metadatos del original y con `faststart`, y extrae el primer y último fotograma. Mantiene la resolución de 1080 × 1920. También elimina el fondo blanco del logotipo. Para regenerar solo el vídeo de portada y sus imágenes, sin modificar el logo ni el hub, usa `npm run assets:prepare -- --intro-only`.

Para el hub se utilizan FFmpeg y FFprobe: se recodifica en H.264, sin audio, con `faststart` y CRF 17. Tras eliminar los últimos 12 fotogramas, se mezclan los 18 últimos con los 18 primeros mediante una curva suave y redondeo al entero más próximo. El primer par conserva completamente el final y el último conserva completamente el fotograma 17 del comienzo; el ciclo arranca en el fotograma 18, continuando el movimiento. La imagen de respaldo se extrae del primer fotograma del derivado.

El recorte y las guías del logo están ajustados a la imagen actual. Si cambia el diseño del logotipo, hay que actualizar ambos; el resto de los textos y el descriptor son independientes.

## Verificación en navegador

```sh
npx playwright install chromium webkit
npm run test:e2e
```

Las pruebas verifican la reproducción real y el orden de aparición, la navegación y el reinicio, un error de decodificación, el bloqueo de autoplay, la preferencia de movimiento reducido, el foco del teclado y la ausencia de desbordamientos en 320 × 568, 390 × 844, 941 × 1672, 844 × 390 y 1440 × 900. En el hub comprueban además el fundido con el fondo preparado, dos ciclos completos reales, la duración del recurso recortado, la pausa y reanudación, y las alternativas ante error y bloqueo. También generan capturas en `test-results/`, incluidos el logo durante la escritura, la portada, el fundido y el hub. Chromium y WebKit se ejecutan con emulación de móvil; no sustituyen la revisión en un dispositivo físico.
