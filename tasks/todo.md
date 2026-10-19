# Portada Aripajama

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
