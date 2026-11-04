# Biblioteca completa de viajes

Los 39 registros del catálogo tienen una ficha con Inicio, Ruta, Etapas y Esencia, texto HTML, imágenes optimizadas y visor de originales. La incorporación de 38 viajes añade 244 tarjetas de itinerario; con Tailandia son 251, incluyendo el plan opcional de Linsoles. Todos los enlaces se derivan de `TRIP_DETAILS` y funcionan desde países, continentes y el listado general.

## Contenido y reproducción

- `src/data/library-trip-details.ts`: transcripción editorial de las láminas de los 38 viajes incorporados. Conserva las visitas repetidas, las opciones condicionadas al tiempo y las actividades opcionales. Los contadores de destinos reproducen los totales editoriales de la lámina de ruta; Cantabria utiliza sus diez jornadas porque no se ha entregado su mapa correcto.
- `src/data/trip-details.ts`: contrato compartido, ficha original de Tailandia y registro completo. Las duraciones del contenido se aplican al catálogo sin duplicarlas.
- `scripts/trip-asset-manifest.mjs`: correspondencia entre identificadores del catálogo y carpetas, prefijos únicos de los archivos y recortes en un lienzo de referencia 300 × 534. Los recortes se escalan a las dimensiones reales de cada lámina, también las de proporciones distintas.
- `scripts/prepare-library-trips.mjs`: preparación reproducible con `sharp`, sin dependencias nuevas. Copia originales sin recomprimir, prepara WebP y genera `src/data/trip-assets.ts` con las dimensiones y el índice del original que debe abrir el mapa/itinerario.
- `public/media/trips/<id>/`: recursos de cada viaje. Los originales están en `originals/`; se descargan individualmente al abrir el visor. Los recursos de etapas se preparan hasta 440 px, sin ampliación, y se muestran hasta 360 px en las tarjetas.

```sh
npm run assets:library-trips -- "D:\ARIPAJAMA\RECURSOS\WEB\WEB\Biblioteca de viajes\Viajes"
npm run build
npm run test:library -- --workers=4
```

El script requiere la estructura de carpetas entregada, incluidos los nombres con codificación defectuosa como `Japo╠ün`. La web usa nombres y URLs normalizados (`Japón`, `japon`). No depende del orden de los archivos del sistema; un prefijo ambiguo o ausente detiene la preparación.

## Selección de fuentes e incidencias reales

Se revisaron los 157 PNG de origen. Se incorporaron 153: cuatro de Tailandia y 149 de los otros viajes. Se verificó por SHA-256 que cada original incorporado es idéntico a su fuente.

| Viaje | Incidencia de origen | Tratamiento |
| --- | --- | --- |
| Cracovia en Navidad | Hay dos versiones del itinerario. | Se utiliza la detallada `9AAA1F7D-4DA8-4301-B25C-DCE6844E7A13.PNG`, aprobada por el usuario; la breve `21FE163F…` permanece en la carpeta fuente. |
| Cantabria | `BEDEDD88…` es un mapa de Asturias (Cudillero, Oviedo, Ribadesella, etc.). | Se incorpora el itinerario real `F03995FC…` como recorrido ampliable. La ficha tiene tres originales y el botón abre «El viaje». |
| Filipinas | `BCBAB19D…` es «Lo que me llevo» de La Palma; falta la portada de Filipinas. | Se utilizan las tres láminas correctas. La imagen de cabecera procede de El Nido en su itinerario. El mapa abre el primer original («La ruta»), sin suponer que siempre está en el índice 1. |
| Estados Unidos · Costa Este | `F75610CC…` es «Lo que me llevo» de Escocia; falta la portada de Costa Este. | Se utilizan las tres láminas correctas. La imagen de cabecera procede de Nueva York en su itinerario. Los 12 días se obtienen del itinerario y el mapa. |

Los tres archivos de otros destinos y la versión breve de Cracovia se conservan en los recursos de origen; no se muestran como láminas del viaje equivocado.

### Duraciones y particularidades editoriales

| Viaje | Duración de portada | Etapas detalladas |
| --- | --- | --- |
| Bilbao y Costa Vasca | 7 días | Días 1–6 |
| Islandia | 12 días | Días 1–11 |
| Malasia y Singapur | 15 días | Días 1–14 |
| Marruecos | 10 días | Días 1–9 |

Estas fichas conservan la duración de portada y explican la diferencia en la sección Ruta. No se inventa una jornada adicional. Budapest conserva cuatro días según portada e itinerario; el mapa original menciona tres en su introducción. Se usa «Cuatro días, una misma ciudad» de la lámina del itinerario para el texto HTML.

El embalse de Linsoles aparece como «Si queda tiempo» en Benasque: se conserva como plan opcional y no aumenta las cinco etapas principales. Jaca y Valle de Tena comparten días 1–2; Kuala Lumpur y Batu Caves/Kuala Selangor también comparten días 1–2, tal como figura en los originales. Ámsterdam conserva sus cuatro temáticas en Esencia. Los subtítulos visibles y los nombres accesibles de los enlaces distinguen las dos costas de Estados Unidos.

## Comprobaciones

- Compilación TypeScript/Vite.
- Inventario independiente con las duraciones y número de tarjetas de los 39 viajes.
- Lectura y decodificación de todos los WebP, dimensiones declaradas y existencia/formato/dimensiones de los PNG.
- Para cada viaje, apertura desde su continente, carga de todas las imágenes de la ficha, ampliación del recorrido correcto, cierre con Escape y devolución del foco, regreso al listado, adelante y recarga directa.
- Pruebas del catálogo, filtros por país/continente, controles del visor, imágenes ausentes y navegación existente de Tailandia.
- Encuadres de 280 a 1440 px, horizontal y texto al 200 %. Las fichas nuevas con mayor variación se comprueban expresamente: Cracovia, Perú, Ámsterdam, Costa Este, Cantabria y La Palma.
- Revisión visual de las láminas, los recortes por viaje y capturas responsive. Se conservan en `test-results/` las capturas de la última ejecución.

La configuración `playwright.library.config.ts` reutiliza los dos navegadores del proyecto y arranca solo Vite. La configuración global también intenta arrancar Wrangler y el visor de correos, que no son necesarios para comprobar esta biblioteca.

## Siguientes ajustes de contenido

Para sustituir los tres recursos ausentes/incorrectos, añadir los originales correctos a sus carpetas, actualizar el manifiesto y regenerar. Para completar las jornadas no detalladas, editar los textos y aportar los recortes de sus etapas. Los recursos actuales tienen resolución limitada por las láminas entregadas; originales gráficos independientes permitirían aumentar la calidad de las fotografías de las etapas.
