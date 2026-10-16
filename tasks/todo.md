# Portada Aripajama

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
