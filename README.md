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

El frontend de `dist/` utiliza la raíz del dominio. Para registrar solicitudes y enviar perfiles se publica junto al Worker y D1, según [la guía de perfiles viajeros](docs/traveler-profiles.md). Un alojamiento exclusivamente estático permite ver la web, pero no procesar solicitudes.

## Experiencia de entrada

- Al principio solo se muestra el vídeo, sin sonido, sin controles, sin bucle y dentro de la página en iOS.
- La secuencia empieza **en el primer segundo del vídeo**, según el tiempo real de reproducción, no según el tiempo de carga de la página.
- Primero se dibuja **Aripajama**: una máscara SVG sigue los trazos de la imagen original, ya preparada con fondo transparente. No se usa una fuente de sustitución.
- Después aparecen **Travel Planner**, **El mundo,**, **a tu manera.**, **VIAJES DISEÑADOS CONTIGO** y, por último, **COMENCEMOS →**. La composición vertical sitúa la marca arriba a la derecha y el titular burdeos con su segunda línea en cursiva taupe a media altura, sobre el fondo blanco del globo y las cintas doradas.
- El botón se habilita al finalizar su fundido o al terminar el vídeo, lo que ocurra primero. Con el vídeo actual, de **7,5 s**, el final completa la composición y la deja operativa, conservando el último fotograma.
- «Comencemos» abre el hub con un fundido cruzado de **800 ms**; «Volver a la portada» regresa suavemente y vuelve a iniciar la introducción. Una recarga también la reinicia.
- Si el navegador bloquea la reproducción automática, aparece «Reproducir introducción». Si el vídeo falla al cargar o decodificar, se muestra el fotograma inicial y se habilita «Comencemos».
- El vídeo y la secuencia de la portada se reproducen también con **movimiento reducido**. Esta preferencia sí se aplica al fundido hacia y desde el hub y a las pantallas interiores.

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
- Las tres tarjetas abren sus respectivas pantallas: «Quién soy», «Biblioteca de viajes» y «Crear mi viaje».

### Navegación, carga y accesibilidad

La portada permanece visible mientras se decodifica la imagen y se preparan las fuentes; después se aplica el fundido existente de 800 ms al conjunto de fondo y textos. Un fallo o una espera de 3 s permite entrar con fondo claro, siluetas de tarjetas y texto HTML. Una imagen que termine de cargar posteriormente recupera el diseño.

El foco pasa al título al entrar. «Volver a la portada» aparece al recibir foco con Tab; también se puede volver con Escape. Con movimiento reducido, el cambio entre portada y hub se completa sin fundido.

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
  media/portada-inicio.webp   Primer fotograma para la carga y el respaldo
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
- **Navegación del hub:** los tres destinos están conectados desde `src/App.tsx`.

En la portada, el vídeo llena el móvil y la composición se sitúa sobre el espacio claro. En horizontal y escritorio, el paisaje de la portada ocupa la zona izquierda, con un borde fundido, y la marca y los textos ocupan la derecha. El hub conserva siempre su lienzo vertical centrado. Se contemplan zonas seguras, teclado y objetivos táctiles de al menos 44 px.

## Recursos y verificación

### Aparición progresiva en toda la web

El hub, «Quién soy», la biblioteca, países, listados, la ficha de viaje, el visor y «Crear mi viaje» comparten `src/hooks/useRevealSequence.ts` y `src/reveal.css`. Cada título, párrafo, ilustración, número, separador y acceso marcado aparece con opacidad y un desplazamiento vertical de 16 px durante 550 ms; el siguiente empieza 140 ms después. Las tarjetas funden su marco y sus contenidos aparecen por separado. No se insertan contenedores que alteren las cuadrículas o las columnas, y el desplazamiento usa `translate`, separado del `transform` de hover. La portada conserva su escritura y coreografía sincronizada con el vídeo.

`data-reveal` identifica los elementos; `data-reveal-group` conserva el orden de sus piezas dentro de una tarjeta o cabecera; `data-reveal-scope` delimita cada vista y el visor modal. Los grupos visibles se ordenan por filas y de izquierda a derecha según sus posiciones reales, también en los listados por columnas. `IntersectionObserver` inicia una cascada para cada tanda que llega a la zona visible, sin sumar los elementos que siguen fuera de pantalla. Si se abandona la zona antes de empezar, se cancela esa espera hasta volver a verla.

La preparación ocurre antes de pintar y la cascada se activa cuando la pantalla está operativa. Al volver a una entrada del historial se recuperan las piezas ya mostradas junto con el foco y el scroll existentes. Una navegación nueva crea otra secuencia; una recarga también la reproduce. Se añade únicamente una identidad `revealEntry` al estado interno del historial y se conserva el progreso en memoria, con un máximo de 100 vistas por pestaña. El hub conserva su progreso mientras permanece montado y vuelve a animarse al entrar desde la portada.

Los controles que reciben foco muestran su grupo inmediatamente, sin esperar a la cascada. El título enfocado empieza su aparición sin retardo. Los controles de regreso, cierre, índice persistente y herramientas del visor siguen disponibles. Con movimiento reducido se muestra todo directamente; activarlo durante una secuencia cancela las esperas y completa los elementos, incluidos los que están fuera de pantalla. El contenido es visible por defecto si falta `IntersectionObserver` o falla su inicialización. No hay dependencias nuevas ni animaciones perpetuas.

`tests/reveal.spec.ts` comprueba opacidad intermedia real, orden y separación de las apariciones, scroll, orden visual de columnas, foco, historial, repetición en visitas nuevas, cambios de movimiento reducido, fallo del observador y aislamiento del visor. También genera capturas de 280 a 1440 px y texto al 200 %. Para validar el conjunto:

```sh
npm run build
npm run test:e2e -- --workers=1
```

### Quién soy

`/#quien-soy` abre la presentación de Ariana desde el hub o mediante un enlace directo. La recarga conserva la pantalla sin reproducir la portada. Las transiciones, las apariciones progresivas y el movimiento reducido son los mismos del resto de pantallas. El regreso mediante «← Volver», Escape o historial recupera el foco en la tarjeta «Quién soy»; las visitas directas disponen de regreso local al hub.

`src/screens/AboutScreen.tsx` contiene los cuatro apartados y sus textos HTML editables; `src/about.css` sigue la referencia definitiva `../RECURSOS/quienSoy2.png`. Mantiene una composición editorial vertical también en escritorio: ilustración viajera arriba a la derecha, cintas en cabecera y pie, medallones de acuarela melocotón (azul en el tercer apartado), trazos dorados, titulares negros, texto serif y cierre burdeos en cursiva. Los collages se sitúan debajo de sus textos y el contenido tiene un máximo de 1040 px. Las composiciones gráficas se amplían proporcionalmente en pantallas pequeñas y el texto fluye sin alturas fijas, incluido al 200 %. El único control de esta pantalla es «← Volver», en la esquina superior izquierda.

#### Incorporar las fotografías

Los **15 huecos** son marcos CSS blancos, sin imágenes de sustitución ni solicitudes de fotografías. Su registro independiente está en `src/data/about-photos.ts`. Para completar cada uno:

1. Guardar la foto individual con buena definición en `public/media/about/`.
2. Rellenar `src` con su URL (por ejemplo, `/media/about/retrato.webp`) y `alt` con una descripción pertinente. Mantener `src: null` en los huecos pendientes.
3. Si hace falta ajustar el encuadre, añadir `position`, por ejemplo `'50% 30%'`. La foto se adapta a su marco mediante `object-fit: cover`, conservando la proporción original del archivo.

`portrait` identifica el retrato inicial; los seis identificadores `photography-*` corresponden al primer collage y los ocho `travel-*` al collage final. Cada imagen se carga por separado y las de los collages utilizan carga diferida. Un fallo conserva el marco blanco. Las posiciones, proporciones, giros y superposiciones permanecen en CSS, independientes de los archivos que se incorporen.

La ilustración superior con sus cintas, las cintas del pie, el algodón, la nota manuscrita, la firma, las montañas y la cámara con su leyenda son recortes de `../RECURSOS/quienSoy2.png`. Se conserva completa la ilustración viajera; las quince fotografías personales son los huecos blancos independientes. El generador enmascara las zonas de texto y fotos ajenas a cada decoración y elimina el fondo claro conectado al borde para integrar los recortes. Los medallones y las manchas de acuarela se generan a partir de SVG; sol y corazón son SVG en pantalla y la cinta adhesiva se reproduce en CSS. Las decoraciones recortadas tienen resolución limitada, independiente de la definición de las futuras fotos. Los originales no se modifican. Para regenerar los diez WebP: `node scripts/prepare-about-assets.mjs [ruta-a-quienSoy2.png]`.

`tests/about.spec.ts` comprueba navegación, enlaces directos, recarga, historial, teclado, foco, composición vertical, ilustración, medallones, cintas, transiciones, huecos blancos, fallos gráficos, movimiento reducido, texto al 200 % y encuadres de 280 a 1440 px. La configuración de frontend permite ejecutar estas pruebas y la regresión sin arrancar la API ni el visor de correos:

```sh
npm run build
npm run test:frontend -- tests/about.spec.ts tests/journey.spec.ts tests/create-trip.spec.ts tests/library.spec.ts tests/intro.spec.ts --workers=3
```

### Crear mi viaje

`/#crear-mi-viaje` abre la presentación del servicio directamente y permite recargar sin reproducir la portada. La tarjeta del hub utiliza las mismas transiciones que la biblioteca. «Volver», Escape y el historial permiten regresar al hub y recuperar el foco en «Crear mi viaje». Una visita directa dispone de regreso local al hub. El movimiento reducido omite las animaciones; un fallo o una espera de tres segundos del fondo permite entrar con fondo blanco y conserva el contenido HTML. Si el fondo llega después, se recupera automáticamente.

`src/screens/CreateTripScreen.tsx` contiene los textos y los cuatro pasos; `src/create-trip.css` define el diseño. Los pasos se presentan en filas por debajo de 900 px y en cuatro columnas desde ese ancho, con contenido de hasta 1200 px. Las dos tarjetas de acción conservan dos columnas desde 360 px y se apilan en tamaños inferiores. También se reorganizan con texto ampliado cuando el espacio disponible ya no permite mantener su lectura. El pie, las zonas seguras y los controles de 44 px se adaptan a móvil, horizontal y escritorio.

«Descubrir» abre el cuestionario de diez preguntas y retoma la primera pendiente. «Hablemos» continúa deshabilitado con su indicación de disponibilidad futura; no existe enlace de WhatsApp.

#### Perfiles y registro de solicitudes

El final conecta detalles prácticos y email con una API de **Cloudflare Workers + D1**. El servidor valida las respuestas y calcula los seis perfiles del PDF v1.0.0; guarda el resultado privado y prepara un email HTML/texto con Resend. La web distingue solicitud guardada, correo aceptado para entrega, fallo y configuración pendiente, y permite reintentar con idempotencia y verificación Turnstile. No expone puntuaciones al navegador.

La [guía de perfiles viajeros](docs/traveler-profiles.md) documenta archivos, recursos, estados, pruebas, variables y preparación de Cloudflare/Resend. Para pruebas locales se utilizan `npm run db:local`, `npm run dev:api` (envío desactivado) o `npm run dev:api:mock` (simulado). `npm run emails:preview` abre los seis correos únicamente en `127.0.0.1:4321`; no publica una nueva página. La activación de envíos reales y el despliegue están pendientes de configuración y autorización.

#### Cuestionario

El flujo se coordina en `src/screens/CreateTripFlow.tsx`; `QuestionnaireScreen.tsx` presenta una pregunta por pantalla. Los textos, el orden y las 52 opciones de las referencias están en `src/data/questionnaire.ts`. Las preguntas 1–8 permiten seleccionar varias opciones; las preguntas 9 y 10 utilizan radios. Todas exigen al menos una respuesta. Las tarjetas completas son etiquetas de controles nativos, con marca, borde y fondo de selección. No hay avance automático. Al terminar se abren los detalles prácticos, el email y la confirmación real del registro.

Las rutas `/#crear-mi-viaje/cuestionario/1` hasta `/10`, y `/completado`, permiten entrada directa y recarga sin portada. Si faltan respuestas anteriores, se abre la primera pendiente. «Volver» y Escape regresan a la pregunta anterior y, desde la primera, a la presentación con foco en «Descubrir». El historial conserva scroll, foco y apariciones ya vistas. Las transiciones internas bloquean la interacción durante 160 ms de salida y 420 ms de entrada; con movimiento reducido terminan inmediatamente. Los cambios de hash externos también se atienden, incluidos los navegadores que no emiten `popstate` para ellos.

El borrador versionado `aripajama:create-trip:v2` guarda respuestas, paso, detalles, email y estado privado de recuperación en `sessionStorage`, durante la sesión de la pestaña; recupera también los borradores v1. Se valida al recuperarlo: un borrador corrupto se descarta; si el almacenamiento está bloqueado, el flujo funciona en memoria. «Empezar de nuevo» limpia únicamente este borrador, sin borrar solicitudes ya registradas. El navegador puede restaurar sesiones de pestañas según su propia configuración. Las respuestas solo se envían al confirmar el email y el consentimiento, tras la verificación antispam.

`src/questionnaire.css` adapta las opciones circulares de la primera pregunta a una, dos o tres columnas. Las siguientes usan una columna hasta 960 px; las escenas laterales decorativas se ocultan por debajo de 600 px y con texto ampliado cuando falta espacio. La cascada compartida respeta scroll, teclado y movimiento reducido; las selecciones no la reinician. Los fallos de imágenes mantienen el formulario operativo con fondo claro.

Para regenerar los recursos locales con `sharp`, sin modificar los originales:

```sh
node scripts/prepare-questionnaire-assets.mjs
# Admite como argumento la carpeta de referencias.
```

El origen por defecto es `../recursos/personalizados/crearmiviaje/`. El script recorta únicamente iconos, escenas y decoraciones de los diez PNG del cuestionario en `public/media/questionnaire/`. Los textos, fondos de tarjetas y controles se reconstruyen con HTML y CSS. La imagen adicional de detalles prácticos se prepara por separado con `npm run assets:profiles`. La resolución de las referencias limita la nitidez al ampliar las ilustraciones.

`tests/questionnaire.spec.ts` cubre las diez preguntas, las 52 opciones, obligatoriedad, selección múltiple y única, cierre, revisión, reinicio, guardado, historial, foco, scroll, enlaces directos, recursos fallidos, animaciones y fallos de almacenamiento u observador. Incluye capturas desde 280 hasta 1440 px, horizontal y texto al 200 %. Ejecutar `npm run build` y `npm run test:e2e -- tests/questionnaire.spec.ts tests/create-trip.spec.ts tests/journey.spec.ts tests/library.spec.ts tests/reveal.spec.ts --workers=1`.

Los cinco WebP de `public/media/create-trip/` se sirven localmente y suman aproximadamente 60 kB. El fondo procede de `viajesPersonalizadosFondoLimpio.png`; los cuatro iconos son recortes de los discos ilustrados de `viajesPersonalizados.png`. Las maquetas completas no se utilizan como contenido de pantalla. Las tarjetas móviles se reproducen con colores y textura CSS; las de escritorio tienen fondo claro y borde fino. Los originales permanecen sin modificar. Para regenerar los recursos con `sharp`, ya incluido:

```sh
node scripts/prepare-create-trip-assets.mjs
# También admite las rutas del fondo limpio y la referencia móvil como argumentos.
```

Por defecto se leen los dos PNG de `../recursos/`. La aplicación no necesita esa carpeta una vez generados los recursos. Los iconos proceden de una referencia de resolución limitada y no deben ampliarse más allá de su tamaño original.

`tests/create-trip.spec.ts` comprueba acceso por teclado, entrada directa, recarga, historial, restauración de foco, transiciones, movimiento reducido, cancelación de carga, errores y recuperación del fondo, botones pendientes, texto al 200 % y capturas desde 280 hasta 1440 px. Ejecutar `npm run build` y `npm run test:e2e -- tests/create-trip.spec.ts tests/journey.spec.ts tests/library.spec.ts --workers=1`. Las capturas se guardan en `test-results/`; queda aconsejada la revisión en un móvil físico.

### Biblioteca de viajes

`src/screens/LibraryScreen.tsx` implementa la pantalla principal con textos HTML, fondo independiente, accesos por país/tipo, cuatro continentes y el pie editorial. El diseño tiene dos columnas desde 360 px, una en móviles estrechos y cuatro en escritorio desde 1100 px. La pantalla permite scroll vertical natural y contempla zonas seguras.

«Países», los cuatro continentes y «Ver los 39 viajes» abren listados dinámicos. Los contadores se calculan desde el catálogo local de 27 países y 39 viajes, incluidos los itinerarios multipaís sin duplicación de totales. Los 39 viajes disponen de ficha editorial accesible desde cualquier listado y mediante `/#biblioteca/viajes/<id>`. «Tipo de viaje» sigue pendiente.

El mismo fondo limpio `/media/library/background.webp` permanece montado al cambiar entre las vistas internas. Los países usan una columna en móvil, dos desde 600 px y tres desde 1100 px. Los viajes se agrupan por continente y se distribuyen en columnas verticales con el mismo orden editorial del DOM. Las transiciones internas duran 160 ms de salida y 420 ms de entrada; respetan movimiento reducido y restauran foco y scroll de origen al regresar.

Las URLs `/#biblioteca`, `/#biblioteca/paises`, `/#biblioteca/viajes`, `/#biblioteca/viajes?pais=ES` y `/#biblioteca/viajes?continente=asia` permiten compartir filtros, recargar y navegar atrás/adelante sin reproducir la portada. País y continente se pueden combinar con semántica AND. Los filtros inválidos se explican y los filtros válidos sin resultados muestran un estado vacío. La navegación utiliza History API, sin dependencias de routing.

La navegación hub/biblioteca utiliza un fundido direccional de 650 ms con desplazamiento corto y escala sutil. El fondo mantiene su transición y los elementos del contenido usan la cascada compartida descrita arriba. Se prepara el fondo antes del cambio, con respaldo a los 3 s si no llega. Durante el cambio ambas pantallas son inertes y el foco se transfiere al terminar. El regreso conserva visualmente el scroll saliente antes de mostrar el hub desde arriba. Con movimiento reducido se omiten las animaciones y la espera de transición.

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

### Fichas editoriales de los 39 viajes

`/#biblioteca/viajes/tailandia` abre directamente el viaje de 15 días: Inicio, Ruta, Etapas y Esencia. La ficha usa texto HTML, seis destinos y siete etapas (Bangkok aparece dos veces). El índice permanece accesible al hacer scroll, compensa su altura al saltar a un título y no añade entradas al historial. Al regresar a un listado se recuperan sus filtros, scroll y enlace de origen; una entrada directa regresa a todos los viajes.

`TripDetailScreen.tsx` y `src/trip-detail.css` implementan el diseño de una columna en móvil, la cabecera y ruta en dos columnas desde 900 px, tarjetas cronológicas con fotografía lateral desde 600 px y un ancho máximo de 1200 px. Las fotos de las etapas se presentan con un máximo de 360 px; las fuentes nuevas se preparan hasta 440 px sin ampliarlas. Los controles tienen un mínimo de 44 px y la lectura principal usa al menos 16 px. Los subtítulos distinguen rutas como Costa Este y Costa Oeste. Las cuatro temáticas de Ámsterdam usan una cuadrícula de dos columnas en escritorio.

El visor de las láminas originales usa un diálogo modal nativo, con controles anterior/siguiente, ampliación y ajuste, desplazamiento de la lámina ampliada, teclado y devolución explícita de foco al control de apertura (también tras interacción táctil en Safari). Escape cierra primero el visor. Respeta las dimensiones reales de cada original y admite tres o cuatro láminas. Los PNG originales solo se solicitan al abrir cada lámina; el catálogo no carga fotografías del viaje y la ficha usa WebP con carga diferida salvo la portada.

Los cuatro PNG se conservan sin modificar en `public/media/trips/tailandia/originals/`. Para reproducir los diez WebP y copiar las fuentes, ejecutar:

```sh
node scripts/prepare-trip-assets.mjs ruta/portada.png ruta/mapa.png ruta/itinerario.png ruta/esencia.png
```

Para regenerar los recursos de los otros 38 viajes desde las carpetas entregadas:

```sh
npm run assets:library-trips -- "D:\ARIPAJAMA\RECURSOS\WEB\WEB\Biblioteca de viajes\Viajes"
```

`scripts/trip-asset-manifest.mjs` identifica cada fuente por un prefijo de nombre único y define recortes específicos de portada, mapa, cierre y cada etapa. `scripts/prepare-library-trips.mjs` conserva los PNG byte por byte, genera WebP y escribe las dimensiones en `src/data/trip-assets.ts`. Este archivo es generado; los textos se editan en `src/data/library-trip-details.ts`. El detalle original de Tailandia permanece en `src/data/trip-details.ts`.

Los recortes proceden exclusivamente de los PNG aportados. Los mapas son ilustraciones y mantienen sus etiquetas integradas; la lista de etapas proporciona el orden cronológico en HTML. No se infieren transportes ni duraciones de trayecto. La biblioteca contiene 153 PNG originales (374 MiB, bajo demanda) y 366 WebP (25,8 MiB en conjunto, repartidos entre las 39 fichas). Las fotos recortadas tienen resolución limitada; para futuros encuadres más grandes conviene incorporar originales separados. La selección de fuentes, las diferencias editoriales y los casos especiales están documentados en [`docs/library-trips.md`](docs/library-trips.md).

Para habilitar otro viaje, añadir su detalle en `TRIP_DETAILS` usando el identificador existente del catálogo y preparar sus imágenes y láminas. La disponibilidad del enlace y la validación de su ruta se derivan de ese registro. No añadir enlaces a fichas incompletas ni inventar duraciones que no figuren en el contenido.

`npm run test:library -- --workers=4` ejecuta las 148 comprobaciones de biblioteca en Chromium y WebKit, sin necesitar la API de solicitudes ni el visor de correos. Incluye `tests/catalog.spec.ts`, `tests/library.spec.ts`, `tests/trip-detail.spec.ts` y `tests/library-trips.spec.ts`: inventario editorial, decodificación y dimensiones de todos los recursos, las 39 rutas, filtros, historial, recarga, restauración de foco y scroll, carga bajo demanda, errores gráficos, visor, texto al 200 % y encuadres de 280 a 1440 px. La revisión emulada debe complementarse con un móvil físico.

Ejecuta `npm run build` y `npm run test:e2e`. Las pruebas del hub comprueban los encuadres de 280 × 568 a 1440 × 900, incluida la referencia de 942 × 1670; además verifican carga y recuperación, movimiento reducido, foco, regreso con teclado y personalización del texto. Las capturas se guardan en `test-results/`. Los navegadores emulados no sustituyen la revisión en un móvil físico.
