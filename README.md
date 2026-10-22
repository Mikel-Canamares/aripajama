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

## Diseño del hub

`JourneyScreen` es una pantalla de navegación plenamente **responsive y adaptativa** que conserva la elegancia visual y los códigos de diseño de la referencia original:
- En **móvil vertical**, el fondo llena el 100 % de la pantalla (`100svh`) sin barras vacías de encuadre (letterboxing) en teléfonos modernos altos ni compactos.
- En **escritorio y pantallas panorámicas** (`min-aspect-ratio: 1/1`), adopta una composición editorial dividida en perfecta sintonía con la portada: el arte de sedas e hilos dorados fluye por la izquierda con un fundido suave hacia el fondo marfil, y la cabecera con las 3 tarjetas de navegación se sitúa a la derecha con ancho noble de lectura (~540 px) y micro-interacciones al pasar el puntero.
- En **móvil horizontal** (alturas menores a 500 px), la composición se compacta con precisión para mantener textos legibles y objetivos táctiles ≥ 44 px sin scroll forzado.

Las tarjetas se renderizan como componentes HTML/CSS independientes sobre el fondo de seda:
- Acabado de vidrio esmerilado cálido traslúcido (`backdrop-filter: blur(8px)`).
- Fino marco dorado suave (`border: 1px solid #c5ab9988`).
- Botón circular SVG con flecha fina (`→`) que se desplaza sutilmente en hover (`translateX(3px)`).
- Elevación suave en reposo y respuesta táctil y de teclado accesible.

### Editar textos y tipografía

- Modifica `CONTENT` en `src/screens/JourneyScreen.tsx`. Los arrays de cada título y subtítulo representan sus líneas.
- Modifica las variables `--journey-heading-*`, `--journey-subheading-*`, `--journey-card-*` y `--journey-caption-*` dentro de `.journey` en `src/styles.css`.
- Cada grupo permite cambiar fuente, tamaño, peso, color e interletraje. Los tamaños en `cqw` son porcentajes del ancho del lienzo: `1cqw` equivale a 9,42 px en la referencia a tamaño completo.
- Las fuentes se sirven localmente. Si se cambia mucho el contenido o el tamaño, revisar que el texto siga dentro de las tarjetas y no alcance las flechas.
- Las tarjetas siguen siendo contenido estático hasta disponer de sus destinos.

### Navegación, carga y accesibilidad

La portada permanece visible mientras se decodifica la imagen y se preparan las fuentes; después se aplica el fundido existente de 800 ms al conjunto de fondo y textos. Un fallo o una espera de 3 s permite entrar con fondo claro, siluetas de tarjetas y texto HTML. Una imagen que termine de cargar posteriormente recupera el diseño.

El foco pasa al título al entrar. «Volver a la portada» aparece al recibir foco con Tab; también se puede volver con Escape. Con movimiento reducido no hay fundido ni solicitudes de vídeo.

El origen del recurso y el prompt de limpieza están documentados en [docs/hub-artwork.md](docs/hub-artwork.md).

## Estructura y personalización

```text
src/
  components/Brand.tsx         Logo original y guías SVG de escritura
  hooks/useReducedMotion.ts   Preferencia de movimiento del sistema
  screens/IntroScreen.tsx     Vídeo, sincronización, textos y recuperación
  screens/JourneyScreen.tsx   Lienzo del hub y textos HTML editables
  App.tsx                    Preparación y fundido entre las pantallas
  styles.css                 Diseño mobile first y animaciones
public/
  brand/aripajama.webp        Nombre de marca con transparencia
  media/portada.mp4           Vídeo preparado para la web
  media/portada-inicio.webp   Primer fotograma para la carga
  media/portada-final.webp    Último fotograma para el respaldo
  media/hub-clean.webp        Fondo y tarjetas del hub sin texto
scripts/prepare-assets.mjs    Generación reproducible de los recursos
tests/intro.spec.ts           Comprobaciones en Chromium y WebKit
tests/journey.spec.ts         Encuadres, fundido, carga, teclado y texto editable
tasks/todo.md                Plan y revisión del trabajo
```

- **Textos:** `src/screens/IntroScreen.tsx` y `src/screens/JourneyScreen.tsx`.
- **Colores, posición, tamaños y tiempos entre elementos:** `src/styles.css`. Los retardos de `.reveal-item` son relativos al inicio de la escritura.
- **Momento de inicio:** constante `REVEAL_AT` de `src/screens/IntroScreen.tsx`, en segundos de reproducción.
- **Velocidad del trazo:** `start` y `duration` de las guías de `src/components/Brand.tsx`.
- **Navegación del hub:** conectar los tres textos de `src/screens/JourneyScreen.tsx` con sus destinos cuando estén definidos; actualmente se presentan sin interacción.

En la portada, el vídeo llena el móvil y la composición se sitúa sobre el espacio claro. En horizontal y escritorio, el paisaje de la portada ocupa la zona izquierda, con un borde fundido, y la marca y los textos ocupan la derecha. El hub conserva siempre su lienzo vertical centrado. Se contemplan zonas seguras, teclado y objetivos táctiles de al menos 44 px.

## Recursos y verificación

Los recursos web ya están incluidos. `scripts/prepare-assets.mjs` es un generador histórico para la portada que necesita sus fuentes originales en la raíz y FFmpeg; no es necesario ejecutarlo para arrancar, compilar o editar el hub.

Ejecuta `npm run build` y `npm run test:e2e`. Las pruebas del hub comprueban los encuadres de 280 × 568 a 1440 × 900, incluida la referencia de 942 × 1670; además verifican carga y recuperación, movimiento reducido, foco, regreso con teclado y personalización del texto. Las capturas se guardan en `test-results/`. Los navegadores emulados no sustituyen la revisión en un móvil físico.
