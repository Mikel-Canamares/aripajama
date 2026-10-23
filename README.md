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
- La tarjeta «Biblioteca de viajes» abre la biblioteca. Las otras dos siguen siendo contenido estático hasta disponer de sus destinos.

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
- **Navegación del hub:** la biblioteca está conectada desde `src/App.tsx`; los destinos «Quién soy» y «Crear mi viaje» siguen pendientes.

En la portada, el vídeo llena el móvil y la composición se sitúa sobre el espacio claro. En horizontal y escritorio, el paisaje de la portada ocupa la zona izquierda, con un borde fundido, y la marca y los textos ocupan la derecha. El hub conserva siempre su lienzo vertical centrado. Se contemplan zonas seguras, teclado y objetivos táctiles de al menos 44 px.

## Recursos y verificación

### Biblioteca de viajes

`src/screens/LibraryScreen.tsx` implementa la pantalla principal con textos HTML, fondo independiente, accesos por país/tipo, cuatro continentes y el pie editorial. El diseño tiene dos columnas desde 360 px, una en móviles estrechos y cuatro en escritorio desde 1100 px. La pantalla permite scroll vertical natural y contempla zonas seguras.

«Países», los cuatro continentes y «Ver los 39 viajes» abren listados dinámicos. Los contadores se calculan desde el catálogo local de 27 países y 39 viajes, incluidos los itinerarios multipaís sin duplicación de totales. Tailandia dispone de una ficha completa accesible desde cualquier listado; los demás viajes se habilitarán al añadir su contenido. «Tipo de viaje» sigue pendiente.

El mismo fondo limpio `/media/library/background.webp` permanece montado al cambiar entre las vistas internas. Los países usan una columna en móvil, dos desde 600 px y tres desde 1100 px. Los viajes se agrupan por continente y se distribuyen en columnas verticales con el mismo orden editorial del DOM. Las transiciones internas duran 160 ms de salida y 420 ms de entrada; respetan movimiento reducido y restauran foco y scroll de origen al regresar.

Las URLs `/#biblioteca`, `/#biblioteca/paises`, `/#biblioteca/viajes`, `/#biblioteca/viajes?pais=ES` y `/#biblioteca/viajes?continente=asia` permiten compartir filtros, recargar y navegar atrás/adelante sin reproducir la portada. País y continente se pueden combinar con semántica AND. Los filtros inválidos se explican y los filtros válidos sin resultados muestran un estado vacío. La navegación utiliza History API, sin dependencias de routing.

La navegación hub/biblioteca utiliza un fundido direccional de 650 ms con desplazamiento corto y escala sutil. El fondo y el contenido entran con movimiento independiente y pequeños desfases, sin animaciones perpetuas. Se prepara el fondo antes del cambio, con respaldo a los 3 s si no llega. Durante el cambio ambas pantallas son inertes y el foco se transfiere al terminar. El regreso conserva visualmente el scroll saliente antes de mostrar el hub desde arriba. Con movimiento reducido se omiten las animaciones y la espera de transición.

Los recursos están incluidos en `public/media/library/`. Para regenerarlos: `node scripts/prepare-library-assets.mjs [ruta-al-fondo.png]`. Por defecto se utiliza `../recursos/bibliotecaFondo.png`; el script necesita conexión para descargar las fronteras de Natural Earth (dominio público) y genera mapas SVG con una textura de papel aproximada. La aplicación no realiza solicitudes externas para estos recursos. El fondo se convierte a WebP mediante la dependencia existente `sharp`, sin modificar el original.

`tests/library.spec.ts` verifica navegación, foco, destinos pendientes, fallos gráficos y tamaños desde 280 px hasta 1440 px, con capturas en Chromium y WebKit.

### Catálogo e iconos ilustrados

Los datos tipados se encuentran en `src/data/library.ts`. El registro gráfico independiente está en `src/data/library-icons.ts`. `LibraryCatalog.tsx` presenta todas las combinaciones de filtros sin crear una pantalla por destino. El contenido ampliado se registra por identificador en `src/data/trip-details.ts`.

La colección incluida en `public/media/library/icons/` contiene 47 WebP transparentes de 384 × 384 px, con variantes arena, salvia, azul y rosa. El acabado de papel, las facetas y el color están horneados en cada recurso, no se generan en el navegador. Menorca y La Palma tienen siluetas propias; Austria/Alemania, Croacia/Italia y Malasia/Singapur disponen de composiciones multipaís. Singapur se amplía ópticamente para no convertirse en un punto. La colección se puede revisar en [docs/library-icons-preview.webp](docs/library-icons-preview.webp).

Para regenerar la colección: `npm run assets:library-icons`. Utiliza `sharp` ya instalado y cartografía Natural Earth 5.1.2 de dominio público, fijada a esa versión. La primera ejecución requiere conexión; las siguientes reutilizan la descarga en la carpeta temporal `opencode`. El generador no modifica el fondo ni los originales y la aplicación sirve todos los iconos localmente. Los recortes ilustrados privilegian la legibilidad del territorio principal (por ejemplo, Francia metropolitana y Estados Unidos contiguos); no representan mapas políticos exhaustivos.

Para añadir contenido:

1. Añadir el país a `COUNTRIES`, en orden alfabético, con código estable, continente y tono. Registrar su geometría y encuadre en `COUNTRY_ART`.
2. Añadir el viaje a `TRIPS`, con identificador estable, orden editorial, países asociados e icono. Omitir `days` y `subtitle` si no se conocen; no rellenarlos con supuestos.
3. Para una isla o composición nueva, ampliar `REGIONAL_ART` o `COMPOSITE_ART`. Ajustar la composición en el generador si necesita un encuadre óptico especial.
4. Ejecutar `npm run assets:library-icons`, revisar la lámina y las tarjetas reales, y validar con `npm run build` y `npm run test:e2e -- tests/catalog.spec.ts`.

Los contadores, filtros y listados se actualizan a partir de los datos. Las pruebas del catálogo comprueban integridad, relaciones, recursos transparentes, filtros multipaís, enlaces directos, historial, foco, scroll, errores gráficos y responsive.

Los recursos web ya están incluidos. `scripts/prepare-assets.mjs` es un generador histórico para la portada que necesita sus fuentes originales en la raíz y FFmpeg; no es necesario ejecutarlo para arrancar, compilar o editar el hub.

### Ficha editorial de Tailandia

`/#biblioteca/viajes/tailandia` abre directamente el viaje de 15 días: Inicio, Ruta, Etapas y Esencia. La ficha usa texto HTML, seis destinos y siete etapas (Bangkok aparece dos veces). El índice permanece accesible al hacer scroll, compensa su altura al saltar a un título y no añade entradas al historial. Al regresar a un listado se recuperan sus filtros, scroll y enlace de origen; una entrada directa regresa a todos los viajes.

`TripDetailScreen.tsx` y `src/trip-detail.css` implementan el diseño de una columna en móvil, la cabecera y ruta en dos columnas desde 900 px, tarjetas cronológicas con fotografía lateral desde 600 px y un ancho máximo de 1200 px. Las fotos de las etapas no se amplían más allá de sus 360 px originales. Los controles tienen un mínimo de 44 px y la lectura principal usa al menos 16 px.

El visor de las cuatro láminas originales usa un diálogo modal nativo, con controles anterior/siguiente, ampliación y ajuste, desplazamiento de la lámina ampliada, teclado y devolución explícita de foco al control de apertura (también tras interacción táctil en Safari). Escape cierra primero el visor. Los PNG originales solo se solicitan al abrir cada lámina; el catálogo no carga fotografías del viaje y la ficha usa WebP con carga diferida salvo la portada.

Los cuatro PNG se conservan sin modificar en `public/media/trips/tailandia/originals/`. Para reproducir los diez WebP y copiar las fuentes, ejecutar:

```sh
node scripts/prepare-trip-assets.mjs ruta/portada.png ruta/mapa.png ruta/itinerario.png ruta/esencia.png
```

Los recortes proceden exclusivamente de los PNG aportados. El mapa es una ilustración y mantiene sus etiquetas integradas; la lista de etapas proporciona el orden cronológico en texto. No se infieren transportes ni duraciones de trayecto. Los originales pesan unos 9,4 MB en conjunto y se cargan individualmente bajo demanda. Las fotos recortadas tienen resolución limitada; para futuros encuadres más grandes conviene incorporar originales separados.

Para habilitar otro viaje, añadir su detalle en `TRIP_DETAILS` usando el identificador existente del catálogo y preparar sus imágenes y láminas. La disponibilidad del enlace y la validación de su ruta se derivan de ese registro. No añadir enlaces a fichas incompletas ni inventar duraciones que no figuren en el contenido.

Las pruebas relevantes son `tests/catalog.spec.ts`, `tests/library.spec.ts` y `tests/trip-detail.spec.ts`: incluyen filtros, historial, recarga, restauración de foco y scroll, carga bajo demanda, errores gráficos, visor, texto al 200 % y encuadres de 280 a 1440 px en Chromium y WebKit. La revisión emulada debe complementarse con un móvil físico.

Ejecuta `npm run build` y `npm run test:e2e`. Las pruebas del hub comprueban los encuadres de 280 × 568 a 1440 × 900, incluida la referencia de 942 × 1670; además verifican carga y recuperación, movimiento reducido, foco, regreso con teclado y personalización del texto. Las capturas se guardan en `test-results/`. Los navegadores emulados no sustituyen la revisión en un móvil físico.
