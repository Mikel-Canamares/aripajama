# Perfiles viajeros y solicitudes

## Flujo y archivos

Se conservan las diez preguntas y sus 52 opciones. Después de la décima se abre `/#crear-mi-viaje/cuestionario/detalles`, después `/email` y, únicamente cuando hay constancia del registro, `/completado`. Los cinco primeros detalles requieren un valor o «Aún por definir»; las otras necesidades son opcionales. El presupuesto es un importe positivo en euros por persona. No se pide nombre.

El navegador guarda el borrador en `sessionStorage`, clave `aripajama:create-trip:v2`, y recupera los borradores v1 sin perder sus respuestas. Incluye detalles, email, consentimiento solicitado, identificador de solicitud y token privado de recuperación. El token nunca se añade a una URL. Si el almacenamiento no está disponible, se usa memoria durante la visita; una recarga no puede recuperarla. «Empezar de nuevo» borra únicamente el borrador, no una solicitud ya registrada en D1.

- `src/screens/CreateTripFlow.tsx`: conexión con la navegación, historial, foco y scroll existentes.
- `src/screens/TripFinalScreens.tsx`, `src/trip-final.css`: detalles, contacto y estados de confirmación.
- `src/hooks/useTripRequest.ts`, `src/components/Turnstile.tsx`: confirmación, recuperación, verificación y reintento.
- `src/data/trip-request.ts`: contrato público y validación de los detalles; no contiene puntuaciones.
- `server/profiles.ts`: algoritmo privado del PDF **v1.0.0** y mapeo explícito de los identificadores existentes.
- `server/index.ts`, `server/delivery.ts`, `server/platform.ts`: API, persistencia y envío.
- `migrations/0001_trip_requests.sql`: esquema de D1, incluido resultado completo privado y estado del correo.
- `server/email-content.ts`, `server/email-template.ts`: textos definitivos de las seis referencias y una plantilla común HTML/texto.

La clasificación valida las diez respuestas, promedia la selección múltiple incluyendo ceros, aplica pesos y normaliza con los máximos teóricos E=45, C=40,5, A=35,5, T=48, L=20 y G=38. Aplica elegibilidad, desempates sin redondeo, avisos y señal de resultado orientativo conforme al PDF. Compañía y transporte son neutros; los detalles prácticos no cambian el perfil. Los resultados internos, el perfil secundario, las puntuaciones, avisos y versión se guardan en D1 y no se devuelven al navegador. Vite tampoco sirve los fuentes privados en desarrollo.

## API y estados

| Operación | Contrato |
| --- | --- |
| `GET /api/trip-config` | Clave pública Turnstile; indica verificación simulada solamente en desarrollo local. |
| `POST /api/trip-requests` | Respuestas actuales, detalles, email, consentimiento `true`, identidad privada y token Turnstile. Valida, calcula y guarda antes de intentar el correo. |
| `GET /api/trip-requests/:id` | Requiere `Authorization: Bearer <token>`; devuelve únicamente el recibo. |
| `POST /api/trip-requests/:id/retry-email` | Misma autorización y nueva verificación Turnstile. Reintenta el correo de la solicitud original. |

El recibo contiene `requestId`, `saved`, `emailStatus`, `canRetry` y, si procede, código de error y segundos de espera. No incluye datos personales, contenido del correo ni identificador de Resend.

| Estado | Significado |
| --- | --- |
| `pending` / `sending` | Solicitud guardada, operación aún pendiente o en comprobación. |
| `accepted` | Resend aceptó el correo para su entrega. **No confirma entrega ni lectura.** |
| `failed` | Registro conservado; envío fallido o incierto, recuperable con la misma clave. |
| `unconfigured` | Registro conservado; envío desactivado o configuración incompleta. No se declara éxito. |
| `review_required` | Venció la ventana segura de reintento; requiere comprobación manual en Resend. |
| `simulated` | Prueba local, expresamente identificada, sin correo real. |

Una doble confirmación con el mismo identificador, token y contenido conserva una sola fila; otro contenido devuelve conflicto. Un bloqueo SQL atómico de 45 segundos excluye envíos simultáneos. El contenido completo se fija antes del primer intento y la clave `profile/<id>/v1` permanece estable, incluso si después cambia una plantilla o variable. Resend conserva sus claves 24 horas; esta aplicación deja de reintentar automáticamente o desde el botón tras **23 horas desde el primer intento**, con margen conservador. Ante aceptación seguida de fallo al guardar en D1, un nuevo intento dentro de esa ventana recupera la misma operación del proveedor. No se generan claves nuevas para sortear este límite.

No hay tarea automática de reenvío, webhooks de entrega ni panel administrativo. Para un estado incierto fuera de plazo, comprobar el identificador o la clave en Resend antes de decidir manualmente. Un usuario que modifica el formulario inicia una intención nueva; revisar sin modificar conserva la identidad anterior.

Las escrituras comprueban origen, JSON y tamaño máximo de 16 KiB, campos permitidos, validación estricta y consentimiento explícito para recibir este correo. Turnstile se verifica en servidor con hostname y acción `trip_request`; el modo simulado exige desarrollo y petición local. Hay límite de 20 operaciones por minuto mediante binding de Cloudflare y un máximo SQL de cinco registros nuevos por email y hora. No se imprimen respuestas ni errores privados del proveedor en logs. Las respuestas API usan `no-store`. No hay secretos `VITE_*`.

## Desarrollo local sin envíos reales

Se recomienda **Node 24** (validado con 24.22.1; las pruebas SQL usan `node:sqlite`). Wrangler es la única nueva dependencia de desarrollo; se emplea `fetch` nativo para Resend y Turnstile. `undici` se fija mediante override para evitar la versión transitoria vulnerable.

```sh
npm install
npm run build
npm run db:local
npm run dev:api       # terminal 1, localhost:8787, correo desactivado
npm run dev           # terminal 2, Vite; /api se redirige al Worker
```

Para probar todo el recorrido con aceptación simulada, sustituir `dev:api` por `dev:api:mock`. El recibo muestra `simulated`, nunca un éxito real. Las opciones de los scripts fuerzan desarrollo local; **ni siquiera con credenciales presentes se envía a Resend desde localhost**. La verificación simulada tampoco sirve en producción. `.dev.vars.example` enumera las claves; una copia `.dev.vars` está excluida de control de versiones. No pegar credenciales en fuentes, capturas ni documentos.

Wrangler observa `dist/`: terminar la compilación antes de arrancarlo. Para recompilar, detener ese proceso, ejecutar `npm run build` y volver a arrancarlo. No borrar ni regenerar `dist/` con el servidor de pruebas activo.

```sh
npm run test:server
npm run worker:check  # empaquetado --dry-run; no despliega
npm run test:e2e -- tests/api-local.spec.ts tests/emails.spec.ts tests/trip-request.spec.ts tests/questionnaire.spec.ts tests/create-trip.spec.ts tests/journey.spec.ts tests/library.spec.ts tests/reveal.spec.ts --workers=1
```

Las pruebas de servidor usan SQL real en SQLite en memoria, reloj y peticiones externas inyectadas; no tienen salida a Resend. Playwright arranca Vite, un Worker con D1 local separado en `.wrangler/test-state` y el visor de correos. Puede reutilizar esos tres servidores si ya están abiertos. Las pruebas de navegador simulan la API salvo las pruebas explícitas de integración Worker/D1 local, incluida la confirmación desde la interfaz. Los casos cubren los seis perfiles, normalización, elegibilidad y desempates, errores, concurrencia, idempotencia, recuperación, detalles y consentimiento, revisión, reinicio, historial, foco, recursos y animaciones. Las pruebas anteriores de la portada no forman parte de este comando focalizado.

### Validación de esta entrega · 26/10/2026

- `npm run build`: correcto, incluido TypeScript del servidor y del navegador.
- `npm run test:server`: **49/49**, con las 52 opciones, seis perfiles y escenarios de envío seguros.
- `npm run worker:check`: empaquetado correcto con los tres bindings; exclusivamente `--dry-run`.
- Migración D1 local y confirmación real de interfaz → Worker → D1: correctas, con recibo `simulated` y cero llamadas reales a Resend.
- Primera regresión de navegador: **123/126**. Se corrigieron el ancho del panel ilustrado del email y una carrera en el mock de reintento: la consulta de estado debe observar la última mutación, no anticipar el próximo resultado del proveedor. Una espera de animación del catálogo en WebKit no se reprodujo al inspeccionarla y pasó al repetirla.
- Regresión posterior de las áreas afectadas: **33/34**; incluyó seis casos nuevos entre ambos navegadores. Se detectó y corrigió también el cálculo del ancho intrínseco de las tablas cuando Chromium bloquea imágenes y fuentes.
- Última revisión de correos: **4/4** en Chromium y WebKit, seis perfiles a 280/390/1024 px, con recursos y con imágenes/fuentes bloqueadas. Los tres fallos de la primera regresión pasan en las repeticiones. En total, los **132 casos distintos** de la batería focalizada han pasado entre la ejecución inicial y sus repeticiones; no se afirma una nueva ejecución completa de 132 casos tras el último ajuste de plantilla.
- Repetición adicional del catálogo por columnas en WebKit: **3/3 consecutivas**, sin modificar el motor de animación existente.
- Capturas de las pantallas nuevas a 280, 390, 768, 941 y 1440 px, horizontal y texto al 200 %: sin desbordamientos, controles de al menos 44 px y textos HTML. Correos revisados visualmente en escritorio y móvil.
- Fuente privada `/server/profiles.ts` denegada por Vite y algoritmo ausente del bundle de producción. `npm audit --cache .cache/npm --omit=optional`: **0 vulnerabilidades**.

No se ha desplegado, realizado ninguna operación Git ni enviado un correo real. Sigue pendiente la comprobación en clientes de correo reales y dispositivos físicos.

## Correos, recursos y revisión visual

```sh
npm run assets:profiles
npm run emails:preview   # http://127.0.0.1:4321, únicamente loopback
npm run emails:generate  # genera HTML y texto sin arrancar servidor
```

El visor genera seis ejemplos con dominio ficticio en `.email-preview/`, fuera de `public/` y `dist/`. No existe una ruta pública de previsualización. Los HTML generados mantienen URLs HTTPS; únicamente al servirlos en el visor se sustituyen los enlaces de recursos por las rutas locales. Reiniciar el visor tras editar la plantilla.

`scripts/prepare-profile-assets.mjs` usa `sharp` ya instalado y conserva intactos los originales. Recorta exclusivamente ilustraciones, discos de iconos, hojas y la franja inferior de las seis referencias en `../recursos/Perfiles/adjuntos/`. Los logotipos proceden del recurso de marca existente. Los seis iconos de detalles y su cabecera proceden de `2DB74716-83DB-4BDA-9292-94498EB0D67A.PNG`, en la carpeta del cuestionario. Los textos, tarjetas, números y controles son HTML; ninguna captura completa se publica como email.

Las imágenes individuales son PNG/JPEG para clientes de correo, y WebP en las nuevas pantallas. Se copia Cormorant Garamond con su licencia OFL; los clientes sin fuentes web utilizan Georgia y Outlook clásico fuerza esa alternativa. La plantilla usa tablas de ancho controlado, estilos críticos en línea, tamaños y condiciones MSO; móvil adapta columnas y tipografía. Hay texto alternativo y una versión de texto plano. Las capturas de navegador verifican los seis correos a 1024, 390 y 280 px; hay pruebas adicionales bloqueando imágenes y fuentes. Estas comprobaciones **no sustituyen pruebas de recepción en Gmail, Outlook y Apple Mail reales**, pendientes de autorización para enviar.

Los textos definitivos de los seis perfiles y los próximos pasos ya están incorporados. No faltan ilustraciones para funcionar; su nitidez y el recorte lateral están limitados por las referencias rasterizadas. Para un acabado de imprenta o cambios sustanciales de composición convendrían los originales de las ilustraciones separadas. WhatsApp se menciona como en las referencias, pero solo se enlaza si se configura una URL real permitida; el botón «Hablemos» de la web permanece pendiente.

## Preparación de Cloudflare y Resend (no ejecutada)

1. En Cloudflare, crear un Worker con Static Assets y una base D1 llamada `aripajama-trip-requests`. Sustituir el UUID vacío de `wrangler.jsonc` por el `database_id` real. Mantener los bindings `DB`, `ASSETS` y `REQUEST_LIMITER`. Aplicar `migrations/0001_trip_requests.sql` en la base remota antes de publicar. El comando local no modifica esa base.
2. Crear un widget Turnstile con el hostname definitivo. Registrar su clave pública y guardar la clave secreta en los secretos del Worker. No usar claves de prueba en producción; mantener acción `trip_request`. La API y la SPA deben estar en el mismo origen.
3. En Resend, verificar el dominio de envío con los registros DNS que indique su panel y crear una API key con permiso de envío. Elegir emisor y buzón real de respuesta. No se ha creado ninguna cuenta, dominio ni clave desde este proyecto.
4. Configurar las variables de la tabla siguiente; mantener `EMAIL_MODE=disabled` hasta revisar la configuración y autorizar una prueba real. Publicar con el proceso de Cloudflare que se apruebe más adelante. Verificar que `https://<dominio>/media/email/...` carga públicamente sin autenticación, incluidos logo, imágenes y fuente, antes de activar correo.
5. Tras autorización expresa, activar `EMAIL_MODE=resend`, probar con una dirección controlada y revisar aceptación en D1/Resend y recepción en Gmail, Outlook y Apple Mail. No confundir aceptación con entrega. La promesa de propuesta en 24–48h sigue siendo una tarea humana; la aplicación no genera ni envía presupuestos.

Comandos de referencia para ejecutar **más adelante**, con acceso y publicación autorizados:

```sh
node scripts/wrangler.mjs d1 create aripajama-trip-requests
# Actualizar database_id en wrangler.jsonc antes del siguiente comando.
node scripts/wrangler.mjs d1 migrations apply aripajama-trip-requests --remote
node scripts/wrangler.mjs secret put RESEND_API_KEY
node scripts/wrangler.mjs secret put TURNSTILE_SECRET_KEY
# Las demás variables pueden configurarse en el panel del Worker.
```

| Variable / binding | Configuración de producción |
| --- | --- |
| `DB` | Binding D1 y esquema migrado. No es una cadena de conexión en el navegador. |
| `ASSETS` | Static Assets generado desde `dist/`, configurado en Wrangler. |
| `REQUEST_LIMITER` | Binding de límite de frecuencia; configuración incluida en Wrangler. |
| `ENVIRONMENT` | `production`. |
| `EMAIL_MODE` | `disabled` hasta autorización; `resend` para envío real. `mock` es exclusivamente local. |
| `RESEND_API_KEY` | **Secreto** de Resend; obligatorio para envío real. |
| `EMAIL_FROM` | Dirección verificada, p. ej. `Aripajama <perfil@dominio-verificado>`. |
| `REPLY_TO` | Buzón real que recibirá las respuestas. |
| `PUBLIC_SITE_URL` | Raíz HTTPS del dominio definitivo, sin ruta, consulta ni fragmento. |
| `TURNSTILE_MODE` | `live` en producción. |
| `TURNSTILE_SITE_KEY` | Clave pública del widget para ese hostname. |
| `TURNSTILE_SECRET_KEY` | **Secreto** de validación Turnstile. |
| `WHATSAPP_URL` | Opcional; URL HTTPS real de `wa.me` o `api.whatsapp.com`. No se inventa un número. |

Antes de abrir el registro al público queda por concretar el aviso de privacidad del responsable, el plazo de conservación y la gestión de acceso/borrado de solicitudes. La implementación actual guarda los datos en D1 hasta una actuación administrativa; no incluye borrado programado ni un panel. No se añaden suscripciones comerciales, pagos ni un generador de propuestas.
