## Cantabria · Incorporar la lámina de ruta indicada · 09/11/2026

- [x] Revisar los recursos de Cantabria y el formato de ruta de los otros viajes.
- [x] Incorporar la lámina indicada, generar el mapa optimizado y conectar el visor compartido.
- [x] Actualizar las expectativas y documentación vigentes, verificar y completar Review.

### Review

- **Resumen de cambios:** `scripts/trip-asset-manifest.mjs` incorpora `BEDEDD88…`, la lámina indicada por el usuario, y define el recorte del mapa. Generados `public/media/trips/cantabria/ruta.webp`, el original `originals/ruta.png` y su registro en `src/data/trip-assets.ts`. `src/data/library-trip-details.ts` utiliza el formato compartido de mapa ampliable; Cantabria dispone de cuatro originales y abre «La ruta». Actualizadas las expectativas existentes y la documentación vigente.
- **Verificación:** `npm run build` correcto. Pruebas focalizadas de inventario/decodificación de los 39 viajes y navegación, visor y encuadres de Cantabria: 6/6 correctas en Chromium y WebKit, cuatro tamaños por navegador y texto al 200 %. Revisados visualmente el mapa generado y la captura móvil de Cantabria. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** la lámina incorporada por indicación expresa contiene nombres y textos de Asturias; se conserva tal como se ha entregado.
- **Siguientes pasos sugeridos:** revisar la ruta en el dispositivo habitual.

## Biblioteca · Ocultar subtítulos de duración en las tarjetas · 09/11/2026

- [x] Localizar cómo se generan los subtítulos de duración y revisar las pruebas existentes.
- [x] Mostrar únicamente los subtítulos descriptivos de las tarjetas.
- [x] Actualizar las expectativas existentes, verificar el catálogo y completar Review.

### Review

- **Resumen de cambios:** `src/screens/LibraryCatalog.tsx` muestra el subtítulo solo cuando hay un texto descriptivo, eliminando la duración que se añadía automáticamente como segunda línea. `tests/catalog.spec.ts` actualiza las expectativas de Perú, Cantabria, Menorca y Japón y comprueba que Galicia y Navarra conservan sus subtítulos.
- **Verificación:** pruebas de catálogo, filtros y encuadres responsive: 8/8 correctas en Chromium y WebKit, con cuatro tamaños de pantalla por navegador. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** las tarjetas que solo tenían duración pasan a mostrar una única línea de texto.
- **Siguientes pasos sugeridos:** revisar visualmente el catálogo en el dispositivo habitual.

## Biblioteca · Conectores entre las etapas del viaje · 09/11/2026

- [x] Revisar la causa del solapamiento y los estilos compartidos por todos los viajes.
- [x] Alinear los círculos y hacer que cada línea nazca en su base y termine 6 px antes del siguiente.
- [x] Verificar móvil, escritorio y destinos de varias líneas; completar Review.

### Review

- **Resumen de cambios:** `src/trip-detail.css` alinea los círculos al inicio de cada etapa, centra el conector en su eje y lo extiende desde su base hasta 6 px antes del siguiente círculo. El estilo compartido se aplica a todos los viajes y adapta la longitud a los textos de varias líneas.
- **Verificación:** prueba responsive existente de detalle: 2/2 correctas en Chromium y WebKit, seis encuadres por navegador y texto al 200 %. Comprobación temporal en navegador: 114 conectores de Galicia, Estados Unidos (Costa Este) y Perú en ambos motores a 280, 390 y 1440 px; inicio exacto, separación de 6 px, centrado y ausencia de conector final, incluidos cuatro casos con títulos de varias líneas. Capturas de Galicia revisadas en móvil y escritorio. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** los círculos quedan alineados al inicio del texto en lugar de centrados respecto al bloque completo de destino y días.
- **Siguientes pasos sugeridos:** comprobar el resultado en el dispositivo habitual.

## Hub · Más separación en los subtítulos de las tres tarjetas · 09/11/2026

- [x] Revisar el margen compartido de los subtítulos de las tarjetas.
- [x] Duplicar el margen superior manteniendo su adaptación al tamaño de pantalla.
- [x] Verificar encuadres y completar Review.

### Review

- **Resumen de cambios:** `src/styles.css` duplica el margen superior compartido de los subtítulos de las tres tarjetas, de `clamp(.35em, .6svh, .55em)` a `clamp(.7em, 1.2svh, 1.1em)`.
- **Verificación:** prueba responsive del hub: 2/2 correctas en Chromium y WebKit, siete tamaños por navegador, con textos dentro de las tarjetas. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** el espacio adicional aumenta la altura del bloque de texto; los encuadres comprobados pasan.
- **Siguientes pasos sugeridos:** revisar la separación en el dispositivo habitual.

## Hub · Más margen superior del subtítulo · 09/11/2026

- [x] Revisar el margen superior actual de «en tres formas».
- [x] Ampliar el margen superior de 0,05 a 0,25 em.
- [x] Comprobar los encuadres responsive y completar Review.

### Review

- **Resumen de cambios:** `src/styles.css` amplía el margen superior de «en tres formas» de 0,05 a 0,25 em, adaptando la separación al tamaño de la fuente.
- **Verificación:** prueba responsive del hub: 2/2 correctas en Chromium y WebKit, siete tamaños por navegador. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** la separación adicional aumenta la altura de la cabecera; los encuadres comprobados pasan.
- **Siguientes pasos sugeridos:** revisar visualmente la separación en el dispositivo habitual.

## Hub · Subtítulo ligeramente a la derecha · 09/11/2026

- [x] Revisar la posición del subtítulo y los ajustes responsive.
- [x] Desplazar «en tres formas» entre 8 y 18 px a la derecha según el ancho disponible.
- [x] Verificar encuadres y completar Review.

### Review

- **Resumen de cambios:** `src/styles.css` desplaza el subtítulo a la derecha mediante posición relativa y `left: clamp(8px, 2cqw, 18px)`, proporcional al ancho del lienzo.
- **Verificación:** prueba responsive del hub: 2/2 correctas en Chromium y WebKit, con siete tamaños por navegador. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** ajuste visual localizado; sin desbordamientos de página en los tamaños comprobados.
- **Siguientes pasos sugeridos:** valorar la nueva alineación en el dispositivo habitual.

## Hub · Sparkling Valentine y doble espacio · 09/11/2026

- [x] Localizar la fuente original y revisar los estilos del subtítulo.
- [x] Incorporar Sparkling Valentine y mostrar dos espacios entre las palabras de «en tres formas».
- [x] Verificar compilación y encuadres; completar Review.

### Review

- **Resumen de cambios:** fuente original de Cat.B en `public/fonts/sparkling-valentine.ttf`, declarada localmente con `@font-face` y aplicada al subtítulo en su peso regular. `JourneyScreen.tsx` contiene dos espacios entre palabras y `white-space: pre-wrap` los conserva visualmente. Retirada la dependencia de WindSong.
- **Verificación:** `npm run build` correcto. Prueba responsive existente del hub: 2/2 correctas en Chromium y WebKit, siete tamaños por navegador y sin desbordamientos de página. `git diff --check` sin errores de espacios.
- **Riesgos potenciales:** la distribución de la autora indica «FREE FOR PERSONAL USE»; el aviso y la procedencia se conservan en `public/fonts/sparkling-valentine-LICENSE.txt`.
- **Siguientes pasos sugeridos:** revisar el aspecto en el dispositivo habitual y disponer de la licencia correspondiente para uso comercial.

## Hub · WindSong Medium en «en tres formas» · 09/11/2026

- [x] Revisar los estilos del subtítulo y la carga de fuentes del proyecto.
- [x] Incorporar WindSong 500 localmente y aplicarla al subtítulo con su estilo normal.
- [x] Verificar compilación y encuadres del hub; completar Review.

### Review

- **Resumen de cambios:** WindSong de Google Fonts incorporada mediante `@fontsource/windsong`, con carga local de la variante latina 500 en `src/main.tsx`. `src/styles.css` aplica la fuente al texto «en tres formas», con peso 500 y estilo normal para usar su dibujo manuscrito original.
- **Verificación:** `npm run build` correcto. `npm run test:frontend -- tests/journey.spec.ts --grep "conserva la composición completa" --workers=2`: 2/2 correctas en Chromium y WebKit, con siete tamaños de pantalla por navegador y sin desbordamiento de página. `git diff --check`: sin errores de espacios.
- **Riesgos potenciales:** las métricas y el trazo del subtítulo cambian respecto a la fuente anterior; los encuadres responsive comprobados pasan.
- **Siguientes pasos sugeridos:** revisar el aspecto de la nueva caligrafía en el dispositivo habitual.

## Portada · Recuperar la altura original de los textos · 09/11/2026

- [x] Confirmar la posición original del titular y la separación actual del botón.
- [x] Restablecer el margen superior del titular a 22,5 svh, conservando los 6 svh antes del botón.
- [x] Verificar los encuadres y completar Review.

### Review

- **Resumen de cambios:** `src/styles.css` restablece el margen superior del titular a 22,5 svh, recuperando la altura original del bloque de textos. El margen antes de «Comencemos» sigue en 6 svh.
- **Verificación:** `npm run test:frontend -- tests/intro.spec.ts --grep "la portada cabe" --workers=2`: 2/2 correctas, seis tamaños por navegador en Chromium y WebKit, sin desbordamientos.
- **Riesgos potenciales:** la distribución vertical depende de la altura disponible de pantalla.
- **Siguientes pasos sugeridos:** revisar la composición en el dispositivo habitual.

## Portada · Más margen superior de «Comencemos» · 09/11/2026

- [x] Revisar el margen actual del botón.
- [x] Aumentar el margen superior de 4,5 a 6 svh.
- [x] Comprobar los encuadres y completar Review.

### Review

- **Resumen de cambios:** `src/styles.css` amplía el margen superior del botón de 4,5 a 6 svh, unos 11–13 px adicionales en las pantallas de referencia.
- **Verificación:** `npm run test:frontend -- tests/intro.spec.ts --grep "la portada cabe" --workers=2`: 2/2 correctas, seis encuadres por navegador en Chromium y WebKit.
- **Riesgos potenciales:** el espacio añadido varía proporcionalmente a la altura de pantalla.
- **Siguientes pasos sugeridos:** revisar la separación en el dispositivo habitual.

## Portada · Altura del texto y espacio del botón · 09/11/2026

- [x] Revisar la referencia con la línea roja y los márgenes actuales.
- [x] Subir el titular y su subtítulo unos 12 % del alto de pantalla en vertical y ampliar la separación del botón.
- [x] Verificar encuadres y compilación; completar Review.

### Review

#### Resumen de cambios

- `src/styles.css`: margen superior del titular en vertical de 22,5 a 10,5 svh, desplazando el bloque hacia la línea marcada (aproximadamente 91 px en una pantalla de 762 px de alto).
- Separación entre el subtítulo y el botón ampliada de 2,9 a 4,5 svh (unos 12 px adicionales a esa altura).
- `tests/intro.spec.ts`: añadido el encuadre de 632 × 762 px a la comprobación responsive existente.

#### Verificación realizada

- `npm run build`: correcto.
- `npm run test:frontend -- tests/intro.spec.ts --grep "la portada cabe" --workers=2`: **2/2 correctas**, con seis encuadres por navegador en Chromium y WebKit; sin desbordamientos y con todos los elementos dentro de la pantalla.
- Revisada la captura de 632 × 762 px y comprobada la nueva separación del botón.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- La posición se adapta proporcionalmente a la altura disponible; puede variar con las barras del navegador móvil.

#### Siguientes pasos sugeridos

- Comprobar la nueva altura en el dispositivo de la referencia.

## Portada · Secuencia fluida dentro de los 7 segundos · 09/11/2026

- [x] Revisar los tiempos y sustituir la pausa anterior por una cascada continua según la nueva indicación.
- [x] Acercar las entradas de los textos y el botón con fundidos suavemente solapados; completar todo antes del segundo 7.
- [x] Actualizar las pruebas de secuencia en móvil/escritorio y los tiempos del README.
- [x] Verificar compilación y pruebas de portada; completar Review.

### Review

#### Resumen de cambios

- Este ajuste sustituye la pausa de 0,7 s solicitada anteriormente por una cascada continua dentro de los primeros 7 segundos.
- `src/styles.css`: entradas separadas 0,5–0,55 s con fundidos de 1 s suavemente solapados, curva de aceleración progresiva y desplazamiento reducido de 10 a 6 px. «Comencemos» aparece el último, desde 5,6 s, y completa su entrada hacia 6,6 s.
- `src/screens/IntroScreen.tsx`: compensación del retraso del primer evento de reproducción mediante el tiempo real del vídeo; evita que WebKit desplace toda la secuencia fuera del plazo.
- `tests/intro.spec.ts`: verifica orden, solapamiento y finalización antes del segundo 7 en móvil y escritorio, registrando el tiempo del vídeo en el navegador al finalizar la animación del botón.
- `README.md`: tiempos y sincronización actualizados.

#### Verificación realizada

- `npm run build`: correcto tras el ajuste de sincronización.
- `npm run test:frontend -- tests/intro.spec.ts --workers=2`: **12/12 correctas** en Chromium y WebKit. Comprobados secuencia antes del segundo 7, permanencia al finalizar el vídeo, navegación, teclado, reinicio, encuadres, movimiento reducido y recuperación del vídeo.
- Las ejecuciones iniciales detectaron un inicio tardío de la secuencia en WebKit de escritorio; se corrigió compensando los retardos, sin ampliar el límite de 7 s de las pruebas.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- La fluidez final depende de la capacidad de renderizado del dispositivo; los tiempos de entrada y el solapamiento se mantienen coordinados en CSS.

#### Siguientes pasos sugeridos

- Valorar el nuevo ritmo visual en el dispositivo habitual.

## Portada · Pausa antes de «Comencemos» · 09/11/2026 · Plan aprobado

- [x] Revisar la secuencia actual y localizar la falta de retardo del subtítulo y el adelanto al finalizar el vídeo.
- [x] Dar a «Viajes diseñados contigo» su retardo propio y dejar 0,7 s desde el final de su fundido hasta el inicio del botón.
- [x] Mantener la secuencia sobre el último fotograma y actualizar las pruebas y los tiempos documentados.
- [x] Verificar compilación y pruebas de portada en Chromium y WebKit; completar Review.

### Review

#### Resumen de cambios

- `src/styles.css`: retardo explícito del subtítulo (5,25 s desde el inicio de la secuencia) y botón a los 7,2 s; quedan 0,7 s entre el final del fundido del texto y el inicio del botón.
- `src/screens/IntroScreen.tsx`: el final del vídeo conserva las animaciones pendientes sobre el último fotograma. El botón se habilita al terminar su fundido.
- `README.md`: tiempos actualizados; el botón aparece aproximadamente a los 8,2 s de reproducción y queda disponible a los 9,3 s.
- `tests/intro.spec.ts`: comprobaciones de la pausa en la línea temporal del navegador, texto visible con botón aún oculto, final anticipado del vídeo en escritorio y navegación posterior.

#### Verificación realizada

- `npm run build`: correcto.
- `npm run test:frontend -- tests/intro.spec.ts --workers=2`: **12/12 correctas** en Chromium y WebKit, con secuencia móvil/escritorio, encuadres, regreso, teclado, movimiento reducido, error de vídeo y reproducción manual.
- La primera ejecución detectó diferencias de entrega de eventos de animación en WebKit; la medición de la pausa utiliza ahora la línea temporal real de las animaciones, sin depender del instante de entrega del evento.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- Los tiempos absolutos pueden variar ligeramente con la carga del vídeo y los eventos de reproducción; la pausa relativa queda definida por las animaciones CSS.

#### Siguientes pasos sugeridos

- Revisar el ritmo de la pausa en el móvil habitual.

## Quién soy · Corrección a la referencia `quienSoy2.png` · 04/11/2026

- [x] Incorporar la ilustración superior derecha, las cintas de cabecera y pie y las decoraciones originales de la nueva referencia.
- [x] Sustituir el menú por «← Volver», recrear los medallones de acuarela y los separadores dorados.
- [x] Adaptar tipografía, colores, fondos y composición editorial vertical a la referencia, manteniendo los quince marcos blancos independientes.
- [x] Revisar capturas en móvil y escritorio, texto ampliado y navegación; actualizar las pruebas y la documentación y completar Review.

### Review

#### Resumen de cambios

- La referencia definitiva es `quienSoy2.png`. `AboutScreen.tsx` sustituye el menú por «← Volver» en la esquina superior izquierda, incorpora la ilustración viajera y las cintas originales, las montañas y la cámara con su leyenda manuscrita.
- `src/about.css` reproduce la composición vertical en todos los tamaños: títulos negros, texto serif, subrayados y trazos dorados, números negros en medallones de acuarela (melocotón y azul en el tercero), fondos suaves y frase final burdeos con corazón y cintas inferiores. Los collages se distribuyen debajo de los textos siguiendo las proporciones de la referencia.
- Los quince marcos permanecen blancos y conservan sus fuentes independientes en `src/data/about-photos.ts`, preparadas para fotografías de buena definición.
- `scripts/prepare-about-assets.mjs` prepara diez WebP: siete recortes de la referencia y tres recursos de acuarela generados desde SVG. Las máscaras excluyen contenido ajeno y eliminan o suavizan el fondo claro conectado al borde; los originales se conservan.
- Actualizadas las pruebas de la pantalla para comprobar «Volver» y la nueva composición, y la documentación de diseño y recursos en `README.md`.

#### Verificación realizada

- `npm run build`: correcto, TypeScript y compilación de producción.
- `npm run test:frontend -- tests/about.spec.ts --workers=2`: **16/16 correctas** en Chromium y WebKit después de los últimos ajustes de recursos.
- Revisadas capturas de 280 a 1440 px, incluida la proporción de referencia de 941 px, móvil, horizontal y texto al 200 %. Verificados los huecos blancos, la composición, el regreso, foco, historial, enlace directo, recarga, movimiento reducido y recursos fallidos.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- La ilustración y los pequeños adornos proceden de una referencia rasterizada de resolución limitada. La definición de las fotografías futuras será independiente de estas decoraciones.

#### Siguientes pasos sugeridos

- Incorporar las fotografías individuales de buena definición en el registro preparado y revisar sus encuadres en los marcos definitivos.

## Quién soy · 04/11/2026 · Plan aprobado

- [x] Preparar las decoraciones de la referencia, con fotografías independientes y huecos blancos.
- [x] Conectar la tarjeta del hub y `/#quien-soy`, con historial, recarga, regreso y restauración del foco.
- [x] Crear los cuatro apartados, los collages y el menú de regreso e índice; integrar fuentes y apariciones compartidas.
- [x] Revisar móvil, tablet, horizontal, escritorio, teclado, movimiento reducido y texto al 200 %; ejecutar compilación y pruebas pertinentes.
- [x] Documentar la incorporación de fotos y completar Review.

### Review

#### Resumen de cambios

- `src/App.tsx` y `src/screens/JourneyScreen.tsx`: tarjeta «Quién soy» operativa, ruta `/#quien-soy`, enlaces directos, recarga, historial y regreso con foco en su tarjeta; reutilización del fundido direccional existente.
- `src/screens/AboutScreen.tsx` y `src/about.css`: cuatro apartados con los textos de la referencia, fuentes locales, numeración azul, separadores, papeles, cinta, dibujos SVG y cierre editorial. Composición vertical en móvil, columnas contiguas desde 900 px y reajuste por tamaño de texto. Apariciones mediante el hook compartido.
- Menú de tres líneas persistente con regreso al hub e índice sin cambios de URL; teclado, Escape, cierre al salir con el foco o pulsar fuera, zonas seguras y área táctil de 44 px. El panel admite desplazamiento propio si la altura es reducida.
- `src/data/about-photos.ts`: registro independiente de quince fotos pendientes. Los marcos blancos conservan sus giros y superposiciones; cada futuro archivo admite texto alternativo y ajuste de encuadre. Las fotos de collage se cargarán bajo demanda y los errores conservan el hueco blanco.
- `scripts/prepare-about-assets.mjs` y tres WebP en `public/media/about/`: recortes decorativos de algodón, nota y firma procedentes de `quienSoy2.png`. La composición sigue `quienSoy.png`; los originales no se modifican.
- `tests/about.spec.ts`, ajustes al orden de teclado de las pruebas existentes y `playwright.frontend.config.ts`: verificación frontend reproducible sin API ni visor de correos. `README.md` documenta la pantalla, los recursos, los identificadores de las fotos y su incorporación.

#### Verificación realizada

- `npm run build`: correcto, incluida la compilación final tras los ajustes del menú.
- `npm run test:frontend -- tests/about.spec.ts tests/journey.spec.ts tests/create-trip.spec.ts tests/library.spec.ts tests/intro.spec.ts --workers=3`: **78/78 correctas** en Chromium y WebKit.
- Tras limitar la altura del panel: `npm run test:frontend -- tests/about.spec.ts --workers=2`: **16/16 correctas** en los dos motores.
- Revisadas capturas de móvil, tablet, horizontal y escritorio entre 280 y 1440 px, más texto al 200 %. Comprobados foco, índice, recarga, historial, movimiento reducido, fallos decorativos y los quince marcos sin fotografías.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- Las tres decoraciones recortadas están limitadas por la resolución de la maqueta, especialmente al ampliarlas en escritorio. Las futuras fotografías son archivos independientes y no heredan esa limitación.

#### Siguientes pasos sugeridos

- Incorporar las fotografías originales en `public/media/about/` y completar `src`, `alt` y, cuando sea necesario, `position` en `src/data/about-photos.ts`.
- Revisar los encuadres con las fotografías definitivas en móvil y escritorio.

## Carga completa de la biblioteca · 30/10/2026 · Plan aprobado

- [x] Inventariar y revisar las láminas de los 38 viajes pendientes; utilizar la versión detallada `9AAA1F7D` de Cracovia.
- [x] Incorporar textos, destinos, etapas y duraciones de los originales al formato editorial existente.
- [x] Generar recortes específicos y WebP optimizados; conservar las láminas originales para el visor.
- [x] Habilitar las 39 fichas desde el catálogo y actualizar los avisos de disponibilidad.
- [x] Verificar contenido, recursos, navegación, responsive y compilación; completar Review.

### Review

#### Resumen de cambios

- Los 39 viajes del catálogo tienen ficha editorial y enlace directo. Se han incorporado los 38 pendientes mediante `src/data/library-trip-details.ts`, con 244 tarjetas nuevas de itinerario, duraciones de las láminas, textos de ruta, temáticas y reflexión.
- `scripts/trip-asset-manifest.mjs` y `scripts/prepare-library-trips.mjs` definen fuentes inequívocas, recortes específicos y generación reproducible; `src/data/trip-assets.ts` contiene las dimensiones generadas. La biblioteca completa conserva 153 PNG y utiliza 366 WebP. Verificados por SHA-256 los 153 originales contra los archivos aportados.
- Ficha y visor adaptados a tres/cuatro originales, proporciones reales, itinerario ampliable cuando falta el mapa, subtítulos y cuatro temáticas de Ámsterdam. El plan de Linsoles es opcional y no incrementa las cinco etapas principales de Benasque.
- Biblioteca y catálogo actualizados para anunciar y enlazar todos los itinerarios. Duraciones derivadas del contenido; enlaces accesibles distinguen Costa Este y Costa Oeste.
- Documentación de regeneración y decisiones en `README.md` y `docs/library-trips.md`; nueva suite de los 39 viajes y configuración de pruebas de biblioteca independiente del backend.

#### Verificación realizada

- `npm run build`: correcto tras los últimos cambios y la regeneración final de imágenes.
- 74 casos correctos en Chromium y 74 en WebKit: inventario, recursos, filtros, las 39 fichas, imágenes de cada viaje, carga bajo demanda, visor, teclado, foco, regreso, historial y recarga. La primera ejecución conjunta agotó los 120 segundos de la herramienta después de completar Chromium; se completó WebKit en una ejecución independiente con tiempo suficiente, sin fallos.
- Tras afinar el recorte de cierre de Ámsterdam y las capturas completas (cargando las fotografías y situando la página arriba), repetición focalizada: **14/14 correctos** en ambos motores, con inventario/decodificación y responsive de seis fichas nuevas.
- Revisión visual de las 157 láminas de origen, los recortes por destino y capturas móviles/escritorio. Encuadres de 280 a 1440 px, horizontal y texto al 200 %, sin desbordamientos. Las dimensiones originales no uniformes se conservan en el visor.
- La configuración global no pudo arrancar su API por un Wrangler incompleto en `node_modules`. `npm run test:library -- --workers=4` permite reproducir las comprobaciones de este trabajo usando solo Vite y los navegadores existentes.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- Faltan las portadas correctas de Filipinas y Costa Este: se han usado sus propias imágenes de itinerario. El mapa recibido como Cantabria es de Asturias: se muestra su itinerario real ampliable. Las fichas utilizan las tres láminas pertinentes, sin atribuir recursos de otro viaje.
- Bilbao (7 días/etapas 1–6), Islandia (12/1–11), Malasia y Singapur (15/1–14) y Marruecos (10/1–9) contienen diferencias en origen. Se conserva la duración de portada con una nota descriptiva y no se inventan jornadas.
- Los originales suman aproximadamente 374 MiB, cargados individualmente bajo demanda; los WebP suman unos 25,8 MiB repartidos entre los 39 viajes. La resolución de las fotos de etapas está limitada por las láminas fuente.

#### Siguientes pasos sugeridos

- Revisar la biblioteca en un móvil físico y publicar la versión cuando corresponda.
- Aportar las dos portadas y el mapa correcto de Cantabria para sustituir las adaptaciones, y completar las jornadas no detalladas si se desea.

## Perfiles viajeros y registro de solicitudes · 26/10/2026

- [x] Conservar las diez preguntas, sus textos y opciones; conectar detalles, email y confirmación con la navegación existente.
- [x] Implementar el algoritmo privado v1.0.0, mapeo estable, normalización, elegibilidad, desempates y avisos del PDF.
- [x] Añadir Worker, migración D1, validación de servidor, Turnstile, límites, recibo privado e idempotencia de solicitud/correo.
- [x] Preparar Resend con secretos, contenido inmutable, bloqueo de concurrencia, estado real de aceptación y reintento seguro.
- [x] Preparar seis correos HTML/texto con recursos individuales, textos definitivos y visor exclusivo de desarrollo.
- [x] Verificar build, 49 pruebas de servidor, empaquetado Worker y D1 local. Cubrir 132 casos de navegador entre regresión y repeticiones en Chromium/WebKit.
- [x] Corregir los desbordamientos de email con recursos y sin ellos, y la carrera de simulación del reintento; revisar capturas y texto al 200 %.
- [x] Documentar recursos, contratos, guardado temporal, variables, estados y activación en `docs/traveler-profiles.md`.
- [ ] Configurar D1/Turnstile de producción y dominio verificado de Resend; autorizar publicación y primera prueba real.
- [ ] Comprobar recepción en Gmail, Outlook y Apple Mail reales. No se han enviado correos reales ni realizado operaciones Git.

## Ficha editorial de Tailandia · 23/10/2026

- [x] Registrar el contenido completo separado del catálogo: 15 días, seis destinos y siete etapas.
- [x] Conservar los cuatro PNG y preparar diez WebP con recortes reproducibles mediante sharp, sin nuevas dependencias.
- [x] Conectar la fila de Tailandia desde todos los listados y añadir enlace directo, historial y regreso con filtros, foco y scroll.
- [x] Crear la ficha reutilizable con índice fijo, texto HTML, mapa ampliable, etapas y cierre editorial responsive.
- [x] Añadir visor modal de originales bajo demanda, zoom, teclado, contención del foco y devolución explícita al control de apertura en Safari táctil.
- [x] Verificar compilación, pruebas y capturas de móvil, horizontal y escritorio; documentar la incorporación de nuevos viajes.

### Review

- **Problema y causa:** el catálogo solo disponía de resúmenes y sus filas eran informativas. Las láminas verticales contienen texto integrado que se reduce demasiado al adaptarlas directamente al ancho de un móvil.
- **Cambios:** contenido tipado en `src/data/trip-details.ts`; ruta de detalle en `src/data/library.ts`; enlace disponible por registro en `LibraryCatalog.tsx`; integración y regreso en `LibraryScreen.tsx`; nueva ficha y visor en `TripDetailScreen.tsx`; estilos localizados en `src/trip-detail.css`; preparación reproducible en `scripts/prepare-trip-assets.mjs`; recursos, documentación y pruebas.
- **Validación:** `npm run build` correcto. Primera ejecución de catálogo, biblioteca y detalle: 56 casos en Chromium/WebKit; se detectaron una expectativa antigua de texto y dos diferencias de foco entre navegadores. Tras corregirlas, la ejecución focalizada de ficha y aviso actualizado finalizó con **20/20 casos correctos**; el resto de casos de catálogo y biblioteca ya había pasado. Capturas revisadas a 280, 320, 390, 768, 844 horizontal y 1440 px; lectura al 200 %, controles ≥44 px, fallos gráficos, navegación, historial y carga bajo demanda comprobados. SHA-256 confirma que los cuatro PNG conservados son idénticos a los adjuntos.
- **Riesgos pendientes:** las fotos de etapas proceden de recortes de 360 px y se limita su tamaño; el mapa mantiene etiquetas integradas y se complementa con texto cronológico. Los PNG completos pesan aproximadamente 9,4 MB y solo se cargan al abrir cada lámina. Queda la comprobación en un teléfono físico. Los otros 38 viajes seguirán informativos hasta disponer de sus detalles. Sin operaciones Git ni publicación.

## JourneyScreen adaptativa y responsive conservando el estilo visual · 22/10/2026

- [x] Desacoplar las tarjetas del lienzo estático y estilizarlas en CSS con vidrio esmerilado cálido, borde dorado y botón circular SVG con flecha.
- [x] Eliminar las restricciones rígidas de `aspect-ratio: 942 / 1670` y permitir que `.journey` cubra el 100 % del alto de pantalla (`100svh`) sin barras de encuadre (letterboxing) en móviles altos.
- [x] Diseñar e implementar la adaptación para escritorio y pantallas panorámicas (`min-aspect-ratio: 1/1`): composición editorial dividida con el arte de sedas en la izquierda con fundido suave y la cabecera más las 3 tarjetas en la derecha.
- [x] Adaptar la experiencia en móviles horizontales (`max-height: 500px`) garantizando textos legibles y objetivos táctiles ≥ 44 px.
- [x] Añadir micro-interacciones hover en tarjetas y flechas con respeto a movimiento reducido.
- [x] Limpiar los trazos estáticos y botones de `hub-clean.webp` mediante inpainting para que el fondo de seda fluya de manera natural en todas las resoluciones.
- [x] Actualizar las pruebas E2E en Playwright y verificar que las 24 pruebas pasen limpiamente en Chromium y WebKit.

### Review

- **Problema y causa:** `JourneyScreen` estaba bloqueada en una proporción fija 942/1670 que producía franjas vacías (letterboxing) en móviles modernos, una franja estrecha de 500 px en pantallas de escritorio y un pilar ilegible de 220 px con textos a 5 px en horizontal.
- **Cambios realizados:**
  - `src/screens/JourneyScreen.tsx`: estructura HTML semántica enriquecida con icono circular SVG con flecha y contenedor `.journey__media` desacoplado del contenido.
  - `src/styles.css`: estilos CSS fluidos con `clamp()`, variables tipográficas retrocompatibles, vidrio esmerilado traslúcido (`backdrop-filter: blur(8px)`), marco dorado fino y micro-interacciones hover; composición dividida para escritorio/horizontal en diálogo con `IntroScreen`, y regla compacta para baja altura.
  - `public/media/hub-clean.webp`: inpainting de alta precisión para eliminar los recuadros estáticos del fondo conservando intactas las ondas de seda y los hilos dorados.
  - `tests/journey.spec.ts`: pruebas E2E actualizadas para validar la adaptabilidad responsive en 7 viewports (280×568, 320×568, 384×915, 390×844, 942×1670, 844×390, 1440×900).
- **Validación:**
  - `npm run build`: compilación de producción TypeScript + Vite limpia sin advertencias.
  - `npx playwright test`: **24 de 24 pruebas superadas** al 100 % en `mobile-chromium` y `mobile-webkit`.
  - Capturas visuales verificadas en todos los viewports: sin desbordamiento horizontal, sin solapamiento de textos y con encuadres armónicos.

## JourneyScreen fiel a la referencia con texto editable · 22/10/2026

- [x] Limpiar las letras mediante imagegen y guardar un WebP sin pérdidas, conservando el original.
- [x] Sustituir las ondas SVG por el fondo y las tarjetas originales; mantener el lienzo 942 × 1670 completo y centrado.
- [x] Centralizar los textos en CONTENT y exponer variables CSS de tipografía por grupo.
- [x] Preparar imagen y fuentes antes del fundido; contemplar fallo, espera máxima y recuperación posterior.
- [x] Conservar encabezados, foco y movimiento reducido; revelar el regreso con Tab y permitir Escape.
- [x] Validar encuadres, navegación, carga y personalización en Chromium y WebKit.

### Review

- **Problema y causa:** el hub anterior aproximaba la referencia con ondas SVG, tipografía y distribución diferentes; además mostraba un control de regreso ajeno al diseño.
- **Cambios:** fondo sin letras, textos HTML proporcionados al lienzo, tarjetas estáticas, regreso oculto en reposo y visible con foco. Se mantiene visible bajo el puntero después de revelarlo para evitar que Safari pierda el clic al quitar el foco en mousedown.
- **Archivos:** JourneyScreen, estilos, import de Cormorant 700, recurso hub-clean.webp, pruebas de hub y un ajuste de foco previo al regreso en la prueba de portada; README y docs/hub-artwork.md explican edición y procedencia.
- **Validación:** compilación de producción correcta. Los 12 casos del hub pasan en Chromium y WebKit; capturas de 280 × 568, 320 × 568, 384 × 915, 390 × 844, 942 × 1670, 844 × 390 y 1440 × 900. Revisada la composición a tamaño de referencia y el encuadre horizontal.
- **Limitaciones:** la ejecución ampliada detecta fallos en tres pruebas de vídeo de la portada en WebKit. Un diagnóstico independiente devuelve MEDIA_ERR_SRC_NOT_SUPPORTED (código 4) al cargar el MP4 existente; no se han cambiado el vídeo, la lógica de portada ni sus aserciones de reproducción.
- **Riesgos visuales:** limpieza generativa con posibles diferencias pequeñas y fuente original desconocida; Cormorant Garamond y Manrope son aproximaciones locales. Los textos largos requieren revisar su encaje. Las tarjetas esperan destinos.
- Sin dependencias nuevas ni operaciones Git.


# Portada Aripajama

## Limpieza completada: recursos del hub eliminados, hub como placeholder

- [x] Eliminar archivos de vídeo fuente de la raíz: `videoPortada.mp4`, `videoPortadaNuevo.mov`, `videohub.mp4`, `letrasAripajama.png`.
- [x] Eliminar `public/media/hub.mp4` y `public/media/hub-inicio.webp`.
- [x] Simplificar `JourneyScreen.tsx` a placeholder limpio sin código de vídeo.
- [x] Eliminar estilos CSS del hub relacionados con vídeo (`.journey__landscape`, `.journey__film`, `.journey__film--video`).
- [x] Recortar `prepare-assets.mjs` para procesar solo los recursos de la portada.
- [x] Simplificar `tests/journey.spec.ts` a tests de navegación y encuadres (sin tests de vídeo).
- [x] Verificar `npm run build`: correcto.

### Estado actual

- La portada (`IntroScreen`) funciona igual que antes.
- El hub (`JourneyScreen`) es un placeholder con los tres textos numerados y el botón «Volver a la portada», sin fondo de vídeo.
- Pendiente: diseño definitivo del hub.



## Plan aprobado: textos sobre el fondo del hub

- [x] Revisar el fondo actual y los componentes y estilos relevantes.
- [x] Añadir título, separador y subtítulo, más los tres textos numerados y escalonados de la referencia.
- [x] Adaptar la composición a móvil y escritorio e incorporar una entrada suave que respete movimiento reducido.
- [x] Mantener los tres textos sin interacción hasta disponer de sus destinos, sin crear pantallas base.
- [x] Verificar composición, navegación existente y compilación; completar Review.

### Review de los textos del hub

#### Resumen de cambios

- `src/screens/JourneyScreen.tsx`: cabecera visible con título y subtítulo, y lista de los tres textos numerados. El foco al entrar pasa al nuevo título. Los textos quedan sin interacción, pendientes de sus destinos.
- `src/styles.css`: tipografía editorial, separadores finos, distribución escalonada sobre las ventanas y ajuste para horizontal/escritorio. Aparición progresiva durante el fundido; movimiento reducido muestra directamente los textos.
- `tests/intro.spec.ts` y `tests/journey.spec.ts`: actualizado el título esperado y ampliada la comprobación de encuadres, visibilidad, orden escalonado y ausencia de controles en los textos pendientes.
- `README.md`: documentada la composición actual y la futura conexión de los destinos.

#### Verificación realizada

- `npm run build`: correcto.
- `npm run test:e2e`: **20 pruebas correctas** en Chromium y WebKit, con navegación, foco, reproducción, bucle, errores y movimiento reducido.
- Composición comprobada en 280 × 568, 320 × 568, 384 × 915, 390 × 844, 941 × 1672, 844 × 390 y 1440 × 900, sin desbordamientos. Revisadas capturas en móvil, horizontal y escritorio, y sobre el vídeo.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- Las posiciones se ajustan al paisaje actual; sustituir el fondo o su encuadre requiere revisar la correspondencia con las ventanas.

#### Siguientes pasos sugeridos

- Definir los contenidos y destinos de «Quién soy», «Biblioteca de viajes» y «Crear mi viaje», y conectar sus enlaces cuando estén listos.

## Ajuste aprobado: colores de los textos de portada

- [x] Aplicar `#B77B57` a «Travel Planner» y `#956035` a las dos líneas de «El mundo, a tu manera.».
- [x] Verificar compilación y revisar los cambios.

### Review del ajuste de colores

- **Resumen de cambios:** `src/styles.css` aplica `#B77B57` al descriptor y reutiliza `--color-copper` (`#956035`) en el titular completo.
- **Verificación:** `npm run build` correcto y `git diff --check` sin errores de espacios.
- **Riesgos potenciales:** cambio visual localizado, sin riesgos funcionales identificados.
- **Siguientes pasos sugeridos:** revisar los colores en la portada.

## Ajuste aprobado: hub sin logo y cierre del bucle

- [x] Retirar el logo y «Travel Planner» del hub.
- [x] Recortar los últimos 12 fotogramas (0,5 s) del original y regenerar la unión con extremos completos y alineación exacta por fotogramas.
- [x] Comparar los fotogramas de la unión y comprobar varios reinicios reales, navegación y pausa en Chromium y WebKit.
- [x] Verificar compilación y actualizar README y Review.

### Review del hub sin logo y el cierre del bucle

#### Resumen de cambios

- `src/screens/JourneyScreen.tsx` y `src/styles.css`: retirados el logo, «Travel Planner» y sus estilos específicos del hub.
- `scripts/prepare-assets.mjs`: recorte de los últimos 12 fotogramas del original, normalización a 24 fps y mezcla explícita de 18 pares de fotogramas mediante una curva suave. La unión anterior no alcanzaba el 100 % de la imagen inicial en el último fotograma disponible.
- El nuevo último fotograma de la mezcla corresponde completamente al fotograma 17 del original y el ciclo comienza en el 18. El redondeo de píxeles evita el sesgo oscuro de la mezcla por truncamiento. Codificación CRF 17 para reducir diferencias de compresión en los extremos.
- Regenerados `public/media/hub.mp4` y `hub-inicio.webp`: 210 fotogramas, 8,75 s, 720 × 1280, sin audio; vídeo de aproximadamente 2,44 MB.
- `tests/journey.spec.ts`: duración comprobada y dos reinicios completos reales por navegador. Las comprobaciones de reinicio de la portada en ambas pruebas se realizan durante el fundido de regreso, antes de que empiece su revelado al segundo 1.
- `README.md`: actualizados el aspecto del hub, el recorte, la duración y la preparación de la unión.

#### Verificación realizada

- `npm run assets:prepare` y `npm run build`: correctos.
- FFprobe confirma 210 fotogramas a 24 fps, duración de 8,75 s y ausencia de audio.
- Comparados los fotogramas del fundido y la secuencia último–primero con detalle de árboles y marcos de ventanas. Comprobada antes de codificar la coincidencia exacta del último fotograma con el fotograma 17 de referencia.
- La diferencia media de luminancia al reiniciar, medida en imágenes reducidas a 180 × 320, baja de 1,344 a 0,973 respecto al recurso anterior. Revisadas también capturas del hub sin logo y de la reproducción en navegador.
- `npm run test:e2e`: **20 pruebas correctas** en Chromium y WebKit; incluidos dos ciclos completos por motor, regreso, pausa, reanudación, errores, autoplay bloqueado y encuadres adaptables.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- La compresión H.264 y el reinicio del decodificador pueden afectar a la continuidad percibida en cada dispositivo; la unión se ha verificado por fotogramas y mediante reproducción real en los dos motores de prueba.

#### Siguientes pasos sugeridos

- Validar visualmente varios ciclos en el dispositivo donde se percibió el salto y añadir los textos de navegación sobre el paisaje.

## Plan aprobado: fondo del hub y transición natural

- [x] Revisar el principio y el final de `videohub.mp4` y preparar un bucle visualmente continuo, más una imagen de respaldo.
- [x] Conservar «Subir a bordo» y aplicar un fundido cruzado de unos 800 ms, esperando al vídeo o a su imagen inicial antes de la transición.
- [x] Incorporar el vídeo como fondo del hub, sin sonido, a pantalla completa y en bucle; preparar la composición para los futuros textos.
- [x] Verificar compilación, navegación, bucle, alternativas estáticas y tamaños de pantalla.
- [x] Documentar los cambios y completar la sección Review.

### Review del hub y la transición

#### Resumen de cambios

- `scripts/prepare-assets.mjs`: genera `public/media/hub.mp4` y `hub-inicio.webp` desde `videohub.mp4`. Unión mediante fundido de 0,75 s, ciclo de 9,25 s, H.264 sin audio y con faststart; tamaño aproximado de 1,95 MB. Revisados visualmente el original y los fotogramas del tramo de unión.
- `src/App.tsx`: prepara el hub conservando la portada visible y aplica un fundido cruzado de 800 ms. La retirada de la pantalla saliente sigue el final real de la transición CSS. El contenido inactivo queda fuera de la interacción y del árbol accesible; el foco se entrega al hub al terminar.
- `src/screens/JourneyScreen.tsx` y `src/styles.css`: vídeo de fondo a pantalla completa, imagen inicial de respaldo, encuadre sin deformación y velo ligero en los extremos. Logo y controles de regreso y pausa; área central preparada para la navegación definitiva.
- Reintento de reproducción al quedar visible y al completar el salto nativo del bucle: las pruebas detectaron que WebKit retornaba al principio dejándolo pausado. Se conserva por separado la intención de pausa del usuario para respetarla durante los saltos.
- Recuperación ante autoplay bloqueado o error del vídeo. Movimiento reducido utiliza solo la imagen estática y omite el fundido. Una carga sin respuesta permite entrar tras 3 s con un color de respaldo.
- `README.md` actualizado y `tests/journey.spec.ts` añadido; la prueba de retorno de `tests/intro.spec.ts` espera al final de la transición.

#### Verificación realizada

- `npm run assets:prepare`: correcto. FFprobe confirma vídeo de 720 × 1280, 24 fps, duración de 9,25 s y ausencia de pista de audio.
- `npm run build`: correcto.
- `npm run test:e2e`: **20 pruebas correctas** en Chromium y WebKit, incluidos fundido real, recurso preparado, reproducción de un ciclo completo, continuidad tras el reinicio, pausa/reanudación, pausa conservada durante un salto, regreso, error de decodificación, bloqueo de autoplay y movimiento reducido.
- Sin desbordamientos y con regreso accesible en 320 × 568, 390 × 844, 941 × 1672, 844 × 390 y 1440 × 900. Revisadas capturas de estos encuadres, del fondo en reproducción y del fundido.
- `git diff --check`: sin errores de espacios.

#### Riesgos potenciales

- El vídeo es vertical y de 720 px de ancho: el encuadre horizontal recorta la parte superior e inferior y amplía la imagen. Los futuros textos deben situarse teniendo en cuenta ambos encuadres.
- El autoplay sigue dependiendo de las preferencias y restricciones del dispositivo; el fondo estático y el control de reproducción permiten continuar.

#### Siguientes pasos sugeridos

- Incorporar los textos y enlaces definitivos del hub sobre el paisaje.
- Validar el ritmo del fundido y la continuidad del bucle en un móvil físico.

## Ajuste aprobado: jerarquía de textos y botón

- [x] Reducir «El mundo, a tu manera.» un 30 % en todos los tamaños de pantalla.
- [x] Aplicar al titular un terracota apagado, distinto del logotipo y legible sobre el fondo claro.
- [x] Compactar el botón y desplazarlo a la derecha en móvil, con un margen del 7 % y un área táctil de al menos 44 px de alto.
- [x] Verificar compilación, pruebas de navegador y capturas; completar la revisión visual.

### Review del ajuste visual

#### Resumen de cambios

- `src/styles.css`: ambas líneas del titular reducidas exactamente un 30 %, incluidos los límites de tamaño y las variantes de escritorio y horizontal.
- Titular en terracota apagado `#8c5e50`, diferenciado del marrón del logotipo sobre el fondo crema.
- Botón más compacto mediante menor espaciado, texto y flecha; altura táctil mínima de 44 px. En vertical, su borde derecho queda al 93 % del ancho de pantalla.
- Revisadas capturas en 320 × 568, 390 × 844, 941 × 1672, 844 × 390 y 1440 × 900, más la portada durante la reproducción: el botón queda sobre la zona clara en móvil.
- `npm run build`: correcto. `npm run test:e2e`: 12 pruebas correctas en Chromium y WebKit. Tras acotar el desplazamiento a pantallas estrictamente verticales, compilación y las 2 pruebas de tamaños repetidas con resultado correcto.

#### Riesgos potenciales

- La colocación del botón está ajustada al encuadre del vídeo actual; cambiar el recurso o su recorte requiere revisar su posición sobre el paisaje.

#### Siguientes pasos sugeridos

- Validar la nueva jerarquía visual en un móvil físico.

## Ajuste aprobado: entrada más rápida

- [x] Iniciar la escritura al primer segundo de reproducción y dejar el botón disponible hacia los 8–9 s, durante el vídeo.
- [x] Garantizar que al terminar el vídeo toda la composición esté visible y navegable.
- [x] Actualizar las comprobaciones de sincronización y los tiempos del README.
- [x] Ejecutar compilación y pruebas en Chromium y WebKit, y completar la revisión.

### Review del ajuste de entrada

#### Resumen de cambios

- La causa del retraso era empezar en el segundo 7,5 una secuencia que dura 7,3 s. Ahora comienza en el segundo 1 del vídeo y el botón queda operativo alrededor del segundo 8,3.
- Se conservan la escritura del logo y los fundidos escalonados. Se permite navegar mientras el vídeo continúa.
- El fin real del vídeo completa cualquier animación pendiente y habilita el botón, conservando el último fotograma del vídeo.
- README actualizado con los nuevos tiempos relativos a la reproducción.
- `npm run build`: correcto. `npm run test:e2e`: 12 pruebas correctas en Chromium y WebKit; comprobados inicio temprano, composición completa y navegación durante la reproducción, final anticipado, reinicio, accesibilidad y alternativas de reproducción.

#### Riesgos potenciales

- El tiempo desde la entrada depende de la carga del vídeo; los tiempos indicados se cuentan desde su reproducción. La frecuencia de eventos del navegador puede desplazar ligeramente el inicio.

#### Siguientes pasos sugeridos

- Revisar el ritmo visual en un móvil físico con los nuevos tiempos.

## Plan aprobado

- [x] Crear la base React + TypeScript + Vite, con enfoque mobile first.
- [x] Generar el logo transparente a partir de `letrasAripajama.png`, conservando el dibujo original, y preparar el vídeo y sus imágenes de respaldo.
- [x] Sincronizar la escritura del logo y los fundidos escalonados con el tramo final del vídeo; mantener el último fotograma.
- [x] Incorporar el botón «Subir a bordo» y una segunda pantalla base.
- [x] Verificar compilación, reproducción, accesibilidad y tamaños de pantalla; documentar uso y resultados.

## Criterios

- La introducción se reproduce en cada visita, sin bucle ni persistencia.
- Al principio solo se ve el vídeo. Logo, descriptor, titular, subtítulo y botón aparecen en ese orden.
- El logotipo utiliza la imagen original mediante una máscara de escritura, sin sustituir su tipografía.
- Respetar movimiento reducido y ofrecer recuperación ante reproducción bloqueada o vídeo no disponible.
- Mantener intactos los recursos originales de la raíz.

## Review

### Resumen de cambios

- Base React 19 + TypeScript + Vite, con pantallas y componentes separados, fuentes locales y estilos mobile first.
- Logotipo transparente generado desde la imagen proporcionada; escritura progresiva mediante guías y máscara SVG sobre el recurso original.
- Vídeo web sin audio y con faststart, más imágenes del primer y último fotograma.
- Inicio de la escritura a 2,5 s del final real del vídeo, seguido de descriptor, titular, subtítulo y botón mediante fundidos escalonados. El botón se habilita al concluir su animación.
- Portada a pantalla completa en móvil; composición de paisaje y textos en dos zonas con borde fundido en escritorio y horizontal.
- Segunda pantalla base con gestión del foco y retorno que reinicia la introducción.
- Recuperación ante bloqueo de autoplay o error del vídeo, y versión estática sin descarga del vídeo para movimiento reducido.
- README con instrucciones de inicio, estructura, edición de textos y tiempos, generación de recursos y pruebas.

### Verificación realizada

- `npm run assets:prepare`: recursos generados correctamente.
- `npm run build`: TypeScript y compilación de producción correctos.
- `npm run test:e2e`: **10 pruebas correctas**, en Chromium y WebKit con emulación móvil.
- Verificados reproducción real, orden de aparición, último fotograma, botón, foco, navegación, reinicio y recarga.
- Verificados error real de decodificación, bloqueo de autoplay y movimiento reducido.
- Sin desbordamientos y con botón visible en 320 × 568, 390 × 844, 941 × 1672, 844 × 390 y 1440 × 900.
- Revisión visual de capturas durante la escritura y de las portadas finales en móvil y escritorio.
- `npm audit`: sin vulnerabilidades detectadas.
- `git diff --check`: sin errores de espacios.

### Riesgos potenciales

- Las guías de escritura y el recorte están adaptados a este logotipo. Un cambio del dibujo requiere reajustarlos.
- El vídeo original es vertical; la versión horizontal usa otro encuadre para mantener una composición legible.
- Las comprobaciones móviles utilizan emulación; falta validar el resultado en dispositivos físicos y sus modos de ahorro de batería.

### Siguientes pasos sugeridos

- Revisar el ritmo de las animaciones en un móvil real y ajustar los retardos según la dirección creativa.
- Definir y desarrollar el contenido definitivo de la pantalla posterior a «Subir a bordo».
