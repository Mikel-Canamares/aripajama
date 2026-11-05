# Corrección móvil de los correos · 27/10/2026

## Problema y causas verificadas

Los seis perfiles comparten `server/email-template.ts`. Los textos de `server/email-content.ts` y todos los recursos de `public/media/email/` se conservan. Se mantiene el máximo de **720 px**, acordado para respetar la composición existente de escritorio.

El HTML anterior pasa las comprobaciones normales en navegador. Sin embargo, al retirar las media queries, sus columnas siguen compartiendo fila y comprimen los textos: a 280 px, la celda del título del perfil puede dejar solo 14 px útiles y la despedida 11 px. Al retirar todo el CSS del encabezado desaparece además el control global de las tablas; los cuatro pasos llegan a extender el correo hasta **518 px**. Los paddings y las anchuras reservadas para logo, icono y hoja agravan esa dependencia.

La batería con navegación real detectó también un conflicto de especificidad durante la corrección: la regla que recuperaba las celdas de tabla prevalecía sobre el apilado a 360 px. Con Georgia e imágenes bloqueadas, los perfiles Contemplativo y Gastronómico podían alcanzar 291 y 285 px en una pantalla de 280 px. Se corrigió la prioridad y se añadieron comprobaciones explícitas del apilado del perfil y del aviso.

Estas reproducciones identifican debilidades reales del HTML, pero no demuestran qué estilos descarta una instalación concreta de Gmail. La compatibilidad documentada por Google está en https://developers.google.com/workspace/gmail/design/css.

## Correcciones

- Tablas con `border-collapse` y `table-layout` inline; envolvente al 100 % y contenido limitado a 720 px.
- Filas híbridas con celdas inline que pueden saltar de línea sin CSS del encabezado. Sus límites incluyen el padding mediante `box-sizing:border-box`.
- Reglas de escritorio que restauran la geometría original de las tablas, también dentro de la condición MSO para Outlook clásico.
- Media queries complementarias: perfil e ilustración apilados hasta 600 px; pasos en dos columnas hasta 600 px y una hasta 360 px; icono/perfil y hoja/aviso apilados hasta 360 px.
- Logos e imágenes fluidos, con altura proporcional. Título de perfil a 29 px en el modo híbrido sin CSS, 32 px en escritorio y los tamaños móviles originales con media queries.
- Fuente web en un bloque independiente del CSS de estructura; Georgia continúa como alternativa. No se oculta, elimina ni trunca contenido visible.

La firma y la salida `{ subject, html, text }` no cambian. Se conservan asunto, texto plano, enlaces opcionales, versión de plantilla, contenidos, imágenes y colores.

## Archivos afectados

| Archivo | Cambio |
| --- | --- |
| `server/email-template.ts` | Corrección de estructura y estilos responsive. |
| `server/tests/emails.test.ts` | Contratos de contenido, tablas inline y enlaces WhatsApp. |
| `tests/emails.spec.ts` | Matriz de perfiles, anchos, escenarios y enlace opcional. |
| `tests/email-layout.ts` | Medición compartida de límites, textos, imágenes y solapamientos. |
| `playwright.emails.config.ts` | Pruebas aisladas con visor local en 4322; sin Worker ni D1. |
| `scripts/preview-emails.ts` | Puerto configurable por argumento CLI; 4321 sigue siendo el predeterminado. |
| `scripts/compare-emails.ts` | Capturas, métricas y comparativas con Playwright y sharp existentes. |
| `package.json` | Comandos `test:emails` y `emails:compare`; sin nuevas dependencias. |
| `docs/email-responsive.md` | Resultados, reproducción y limitaciones de esta entrega. |

## Validación y artefactos

Anchos: **280, 320, 360, 375, 390, 430, 600, 640 y 1024 px**. Motores: Chromium móvil y WebKit móvil. Escenarios: normal, sin media queries, sin CSS del encabezado y con imágenes/fuentes bloqueadas.

Se comprueban el ancho solicitado (sin confiar en `innerWidth`), los límites de elementos, los rectángulos de texto, las imágenes respecto a sus celdas, los solapamientos y el apilado. Se verifica la presencia de los seis títulos/descripciones y los cuatro pasos. Las pruebas de navegación incluyen ambas variantes de WhatsApp: **48 pruebas agrupadas, con 864 combinaciones de renderizado**.

| Comprobación | Resultado |
| --- | --- |
| Comparación del HTML anterior: normal | 108/108 renders correctos. |
| HTML anterior: sin media queries | 72/108 renders con problemas. |
| HTML anterior: sin CSS del encabezado | 72/108 renders con problemas. |
| HTML corregido: los cuatro escenarios | 432/432 renders correctos. |
| Fidelidad visual a 600, 640 y 1024 px | 36/36 comparaciones con iguales dimensiones y **cero píxeles distintos**. |
| Pruebas de navegación de la plantilla final | 48/48 correctas; 864 combinaciones verificadas. |
| Pruebas de servidor | 76/76 correctas. |
| Compilación | `npm run build` correcto. |
| Tipos de scripts, configuración y pruebas de correo | Comprobación TypeScript estricta correcta. |

En este entorno Windows se cerró explícitamente el visor creado por la batería después de que las 48 pruebas terminaran; Playwright finalizó con código 0. El visor preexistente del puerto 4321 no se detuvo.

Las capturas usan el HTML real del renderizador. Solo el servidor de preview sustituye las URLs de recursos por rutas locales; la comparación intercepta las URLs HTTPS y responde con los archivos locales, sin enviar tráfico al proveedor.

Artefactos locales, fuera de `public/` y `dist/`, en `.cache/email-responsive-audit/`:

- `before/*.html`: HTML anterior guardado antes de editar la plantilla.
- `after/*.html`: HTML corregido de los seis perfiles.
- `before/{chromium,webkit}/` y `after/{chromium,webkit}/`: 864 capturas entre ambas fases.
- `comparisons/`: 120 composiciones lado a lado; **antes a la izquierda, después a la derecha**. Incluyen 280, 390, 600, 640 y 1024 px, en modo normal y sin CSS del encabezado. Hay también cuatro mosaicos de revisión de los seis perfiles a 280 px.
- `comparison-metrics.json`: mediciones por perfil, ancho, motor, escenario y fase.
- `desktop-differences.json`: comparación de píxeles y dimensiones.
- Las capturas de navegación se guardan en `test-results/emails/`.

Comandos locales:

```sh
npm run test:emails
npm run test:server
npm run build
npm run emails:compare
```

`emails:compare` requiere la referencia anterior conservada en la caché. Para futuras correcciones, guardar antes de editar con `npm run emails:compare -- --capture-before`, en una ubicación de caché sin referencia anterior: el comando rechaza sobrescribirla. `--after-only` regenera la fase posterior conservando las métricas anteriores. La comparación devuelve error si encuentra problemas posteriores o diferencias de escritorio. Las referencias de caché no forman parte del despliegue.

## Recepción real y preparación para despliegue

La validación local permite preparar una nueva versión. No certifica la representación de los clientes de correo reales ni se ha realizado ningún despliegue o envío.

La revisión posterior, cuando se autorice un envío, debe cubrir los seis perfiles en Gmail Android, Gmail iOS, Apple Mail iPhone, Outlook móvil, Gmail de escritorio y Outlook de escritorio. Comprobar cabecera, logotipo, tarjeta y descripción completas, ilustración, cuatro pasos, aviso, despedida y franja inferior; no debe requerirse desplazamiento horizontal ni zoom para leer.

En Gmail móvil conviene registrar versión, tipo de cuenta y tamaño de pantalla, y revisar imágenes activadas/bloqueadas y tamaño de texto del dispositivo. El saneamiento de HTML/CSS, el proxy/caché de imágenes, el ajuste de texto, el modo oscuro y el motor Word de Outlook no quedan reproducidos por emular un teléfono en Playwright. La fuente web puede sustituirse por Georgia legítimamente. Tampoco se presenta la retirada de CSS del encabezado como una emulación completa de Gmail.

No se han modificado cuestionario, algoritmo, D1, endpoints, Turnstile, estados, lógica de Resend, claves ni variables. `EMAIL_TEST_RESTRICTED=true` y el destinatario autorizado permanecen intactos. No se han realizado operaciones Git.

La nueva plantilla afecta al HTML que se genere posteriormente. Los payloads ya persistidos y los correos ya recibidos conservan el HTML anterior; no se migran ni se reenvían.
