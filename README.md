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
- La secuencia empieza **2,5 segundos antes del final**, según el tiempo real de reproducción, no según el tiempo de carga de la página.
- Primero se dibuja **Aripajama**: una máscara SVG sigue los trazos de la imagen original, ya preparada con fondo transparente. No se usa una fuente de sustitución.
- Después aparecen **Travel Planner**, **El mundo,**, **a tu manera.**, **Viajes diseñados contigo.** y, por último, **Subir a bordo →**.
- El vídeo permanece en su último fotograma mientras termina la secuencia. El botón se habilita al finalizar su fundido.
- «Subir a bordo» abre una segunda pantalla base; «Volver a la portada» vuelve a iniciar la introducción. Una recarga también la reinicia.
- Si se bloquea el autoplay, se ofrece reproducción manual o acceso a la portada fija. Si falla el archivo, se muestra la imagen final con la composición lista.
- Con **movimiento reducido** se muestra directamente la portada estática y no se solicita el vídeo.

### Tiempos aproximados para el vídeo actual (10 s)

| Elemento | Inicio desde la entrada |
| --- | --- |
| Escritura del logo | 7,5 s |
| Travel Planner | 10,5 s |
| El mundo, | 11,15 s |
| a tu manera. | 11,85 s |
| Viajes diseñados contigo. | 12,75 s |
| Subir a bordo | 13,7 s; disponible alrededor de 14,8 s |

La frecuencia de eventos del navegador puede desplazar ligeramente el inicio. El contenido sigue siendo texto HTML salvo el nombre de marca; las fuentes se sirven localmente, sin peticiones a Google Fonts.

## Estructura y personalización

```text
src/
  components/Brand.tsx         Logo original y guías SVG de escritura
  hooks/useReducedMotion.ts   Preferencia de movimiento del sistema
  screens/IntroScreen.tsx     Vídeo, sincronización, textos y recuperación
  screens/JourneyScreen.tsx   Segunda pantalla base
  App.tsx                    Navegación entre las dos pantallas
  styles.css                 Diseño mobile first y animaciones
public/
  brand/aripajama.webp        Nombre de marca con transparencia
  media/portada.mp4           Vídeo preparado para la web
  media/portada-inicio.webp   Primer fotograma para la carga
  media/portada-final.webp    Último fotograma para el respaldo
scripts/prepare-assets.mjs    Generación reproducible de los recursos
tests/intro.spec.ts           Comprobaciones en Chromium y WebKit
tasks/todo.md                Plan y revisión del trabajo
```

- **Textos:** `src/screens/IntroScreen.tsx` y `src/screens/JourneyScreen.tsx`.
- **Colores, posición, tamaños y tiempos entre elementos:** `src/styles.css`. Los retardos de `.reveal-item` son relativos al inicio de la escritura.
- **Momento de inicio:** constante `REVEAL_BEFORE_END` de `src/screens/IntroScreen.tsx`.
- **Velocidad del trazo:** `start` y `duration` de las guías de `src/components/Brand.tsx`.
- **Siguiente pantalla:** sustituir o ampliar `src/screens/JourneyScreen.tsx` con el contenido definitivo.

En móvil el vídeo llena la pantalla y la composición se sitúa sobre el espacio claro. En horizontal y escritorio, el paisaje ocupa la zona izquierda, con un borde fundido, y la marca y los textos ocupan la derecha. Se contemplan zonas seguras, teclado y objetivos táctiles de al menos 44 px.

## Regenerar recursos

Los derivados ya están incluidos: **FFmpeg no es necesario para arrancar ni compilar**. Para regenerarlos se necesita `ffmpeg` en el PATH:

```sh
npm run assets:prepare
```

Este comando parte de `videoPortada.mp4` y `letrasAripajama.png` en la raíz y conserva ambos originales. Prepara una copia del vídeo sin pista de audio, con los metadatos al principio (`faststart`), extrae el primer y último fotograma y elimina el fondo blanco del logotipo. El vídeo mantiene su resolución original de 720 × 1280 y su calidad, sin recodificarlo.

El recorte y las guías del logo están ajustados a la imagen actual. Si cambia el diseño del logotipo, hay que actualizar ambos; el resto de los textos y el descriptor son independientes.

## Verificación en navegador

```sh
npx playwright install chromium webkit
npm run test:e2e
```

Las pruebas verifican la reproducción real y el orden de aparición, la navegación y el reinicio, un error de decodificación, el bloqueo de autoplay, la preferencia de movimiento reducido, el foco del teclado y la ausencia de desbordamientos en 320 × 568, 390 × 844, 941 × 1672, 844 × 390 y 1440 × 900. También generan capturas en `test-results/`, incluidos el logo durante la escritura y la portada completa. Chromium y WebKit se ejecutan con emulación de móvil; no sustituyen la revisión en un dispositivo físico.
