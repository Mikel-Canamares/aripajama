# Primera sesión · fase 1

Continuación: [guía para configurar Cal.com y Stripe](guia-calcom-stripe.md) y [plan de programación de fase 2](plan-fase-2.md). La recepción y el contenido de los correos de prueba han sido validados personalmente por el titular. La fase 2 queda pendiente de petición de implementación.

## Estado y límites

Implementación propia sobre Workers + D1 + Resend, sin dependencias nuevas. Por petición del titular, el dominio de producción es también el único entorno de pruebas personales. Completar el formulario solo prepara/envía el perfil del cliente. Ariana recibe un aviso independiente únicamente con **reserva confirmada y pago verificado de 4.000 céntimos EUR**, vinculados a la misma cita y a una solicitud mediante referencia opaca.

No hay webhook de Cal.com, calendario, checkout, panel, reservas reales ni consultas a Stripe. El formulario mantiene su contrato. Existe una confirmación de prueba mediante enlace firmado enviado al buzón autorizado: solo genera hechos simulados fijos, nunca acepta datos de pago del navegador ni modifica una reserva real.

`wrangler.jsonc` configura `PHASE1_TEST_MODE=true`, `BOOKING_ENABLED=false`, `BOOKING_NOTIFICATIONS_ENABLED=true` y un procesador cada cinco minutos. Los correos reales están restringidos exclusivamente a `mikel.canamares@gmail.com`. La reserva/pago y la fecha del ejemplo siguen siendo ficticios: este modo no valida Cal.com, Stripe, Google Calendar ni Google Meet.

## Contrato de Cal.com: evidencia y comprobaciones pendientes

Fuentes oficiales revisadas el 5 de noviembre de 2026:

- [Metadatos en embeds](https://cal.com/help/embedding/prefill-booking-form-embed): documenta `metadata[myKey]`, su persistencia en la reserva y devolución en `payload.metadata[myKey]`. No aparecen en la página de detalles de la reserva.
- [API v2 de reservas](https://cal.com/docs/api-reference/v2/bookings/create-a-booking): documenta el objeto `metadata` (máximo 50 claves; claves de 40 caracteres y valores de texto de 500). Se usa como referencia del modelo del proveedor; esta aplicación no crea reservas por API.
- [Webhooks y ejemplos](https://cal.com/docs/developing/guides/automation/webhooks): incluye eventos `BOOKING_CREATED`, `BOOKING_REQUESTED`, `BOOKING_CANCELLED`, `BOOKING_REJECTED`, `BOOKING_RESCHEDULED`, `BOOKING_PAYMENT_INITIATED` y `BOOKING_PAID`. Los payloads no son uniformes entre eventos.
- [Plan individual](https://cal.com/pricing): anuncia un usuario, enlaces/calendarios ilimitados y pagos con Stripe/PayPal. La disponibilidad efectiva de webhooks y lectura de reservas/pagos debe verificarse en la cuenta elegida; no se contratan planes ni se presupone acceso a APIs comerciales adicionales.
- [Idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys): conserva claves 24 horas; se adopta un margen propio de 23 horas.

### Relación propuesta

Cada solicitud nueva obtiene 32 bytes aleatorios mediante Web Crypto, codificados como 64 caracteres hexadecimales. Se guardan en `trip_requests.booking_reference` con índice único. La referencia no deriva del email, del ID público ni del token privado de recuperación, y no autoriza ningún endpoint de lectura.

El constructor local prepara:

```text
https://cal.com/<usuario>/<evento>?metadata%5Baripajama_reference%5D=<referencia>
```

La clave propia tiene 19 caracteres. El adaptador futuro recuperará `aripajama_reference` de los metadatos de la reserva. **La aplicación de la sintaxis del embed a un enlace directo es una hipótesis de integración que requiere prueba real**, no una validación realizada. En particular, el ejemplo de `BOOKING_PAID` contiene metadatos de pago: no debe suponerse que incluya siempre los metadatos personalizados de la reserva. Si faltan, habrá que recuperar la reserva por su identificador autenticado. Nunca se buscará el formulario por coincidencia de email.

| Dato propio | Evidencia del proveedor y uso previsto |
| --- | --- |
| `bookingUid` | `payload.uid` en los ejemplos de reserva y pago; `bookingId` numérico también está documentado. El adaptador debe verificar su correspondencia. |
| Estado de reserva | `status`, por ejemplo `ACCEPTED` o `PENDING`, más tipo de evento. Iniciar un pago no confirma el cobro. Cancelada/rechazada se normalizarán a `cancelled`. |
| Fecha y hora | `startTime`, `endTime`; almacenar instantes UTC y conservar zona IANA de `organizer.timeZone` y del participante. |
| Participante | `attendees[].name/email/timeZone`; identificar al cliente correcto sin incorporar invitados como destinatarios del aviso interno. |
| Videollamada | `metadata.videoCallUrl` en eventos de reserva o `location` si es una URL HTTPS real; valores como `integrations:...` no son enlaces. |
| Pago | El ejemplo de `BOOKING_PAID` incluye `paymentId`, `price`, `currency` y `metadata.externalId` con forma de PaymentIntent. Son pistas para el adaptador; `price` por sí solo no demuestra cobro. |
| Identidad de evento | El contrato local requiere una clave estable. Si la entrega real no incluye un ID estable, el adaptador derivará una huella de los hechos autenticados y del evento, sin introducir emails en claves ni logs. |

La fase 2 debe verificar firma HMAC SHA-256 sobre los **bytes originales** del body (`x-cal-signature-256`) antes de interpretar hechos. Después comprobará estado actual de reserva y pago, relación entre IDs, importe cobrado y moneda. Si Cal.com no proporciona evidencia suficiente, consultará Stripe con credenciales del titular correcto; no aceptará importe esperado, un redirect del navegador o un nombre de evento como prueba de pago. `confirmed` en el contrato interno significa que esta comprobación ya se ha realizado. No se ha implementado aún ese adaptador ni se dispone de una prueba real de esas garantías.

## Persistencia y contrato interno

Aplicar `0002_first_sessions.sql` y después `0003_session_test_mode.sql` tras la migración existente. No rellena referencias antiguas ni cambia emails existentes:

La migración es aditiva y compatible con el Worker anterior. Cuando se autorice el despliegue, deberá aplicarse antes de publicar este Worker, que escribe la nueva columna al crear solicitudes.

- `session_bookings`: una fila por UID; relación con solicitud, estados independientes de reserva y pago, identificador único de pago, importe entero, moneda, datos mínimos de cita y revisión para concurrencia.
- `session_events`: clave estable, huella, UID y resultado/código de incidencia. No guarda payloads completos, respuestas, nombres, emails ni credenciales. `received`/`applying` son estados transitorios del batch; el commit normal deja `processed`, `ignored` o `incident`.
- `session_notifications`: una fila por reserva con clave estable `paid-session/<uid>/v1`, contenido, huella semántica de cita/pago, bloqueo, contador de intentos y aceptación del proveedor.

`ingestSessionEvent(env, event, io)` recibe `SessionEvent`, exclusivamente en servidor. Sus variantes son `booking` y `payment`; ambas incluyen `eventKey`, `bookingUid`, `reference` y `occurredAt` en milisegundos. El pago lleva además su propio `bookingUid`, ID, importe en céntimos y moneda. La cita confirmada exige inicio/fin, ambas zonas horarias, email y nombre/videollamada nullable.

Un batch atómico comprueba que el snapshot no cambió, aplica hechos, registra el evento y crea el aviso elegible. Ante conflicto concurrente relee y reintenta hasta seis veces; si continúa ocupado devuelve error recuperable. Los duplicados exactos no repiten efectos. La columna `session_bookings.is_test` distingue hechos simulados; intentar mezclarlos con hechos reales para el mismo UID registra `EVENT_SOURCE_CONFLICT`. Reutilizar una clave con otro contenido bloquea la reserva para revisión. También bloquean las referencias contradictorias, el pago asignado a otra cita y los importes incompatibles. La unicidad SQL evita usar un pago para dos reservas.

Los hechos antiguos o pendientes no degradan confirmaciones; una cancelación conocida es conservadoramente terminal para ese UID. Los cambios de fecha del mismo UID se guardan. La fase 2 deberá comprobar si una reprogramación crea otro UID y normalizar su linaje antes de activar; esta fase no implementa un segundo aviso de reprogramación ni cancelación. Si cambian hechos semánticos después de cualquier intento de envío, el aviso pasa a revisión manual. Actualizaciones sin cambios semánticos no lo invalidan.

El mapeo del cuestionario usa `ANSWER_MAP` y los textos compartidos en `questionnaire-content.ts`. El algoritmo privado de perfiles no cambia y sus puntuaciones no se incluyen en el correo.

## Configuración y recuperación de avisos

| Variable | Valor seguro / comportamiento |
| --- | --- |
| `BOOKING_ENABLED` | Solo `true` exacto habilita el enlace en emails nuevos sin contenido ya preparado. Producción: `false`. |
| `CAL_BOOKING_URL` | Base HTTPS exacta `cal.com/<usuario>/<evento>`, sin credenciales, puerto no estándar, query ni fragmento. Sin destino válido no hay enlace. |
| `BOOKING_NOTIFICATIONS_ENABLED` | `true` en el entorno único de pruebas: envía y recupera los avisos mediante el Worker. |
| `ARIANA_EMAIL` | Temporalmente `mikel.canamares@gmail.com` para validación personal, también incluido en la lista de pruebas. No activa envíos por sí solo. En producción no existe fallback. |
| `EMAIL_MODE` | `resend` en producción, con el secreto ya instalado en Cloudflare. El desarrollo automatizado conserva `mock` local. |
| `EMAIL_TEST_RESTRICTED` / `EMAIL_TEST_RECIPIENTS` | Se aplican también al aviso interno y a su destinatario persistido. Solo `false` exacto desactiva la restricción. |

El Worker exporta `scheduled`, que llama a `processSessionNotifications`; el modo de prueba programa su ejecución cada cinco minutos. El procesador revisa hasta 25 avisos por tick, ordenados por actualización; un fallo de D1 en un aviso no detiene los demás. Localmente se invoca desde pruebas mediante un reloj y transporte inyectados. No se añade una ruta HTTP para dispararlo o declarar pagos.

Antes de enviar, se valida de nuevo la elegibilidad y se fija el payload HTML/texto completo y su clave. El bloqueo dura 45 segundos y la petición a Resend tiene timeout de 12 segundos. Cada reintento mantiene payload y destinatario aunque cambie la configuración. Un cambio de la lista de pruebas sigue bloqueando ese destinatario persistido si deja de estar autorizado.

Fallos de red/5xx, 429 y 409 `concurrent_idempotent_requests` se reintentan con espera desde un minuto, duplicada hasta una hora; se respeta `Retry-After` cuando exige más espera. Otros 4xx, conflictos de contenido, ocho intentos o fin de ventana pasan a `review_required`, sin clave nueva. Una configuración incompleta o un destinatario bloqueado no consumen intentos antes del primer envío.

Tras aceptación de Resend y fallo de D1, el siguiente tick recupera el mismo payload/clave al vencer el lease. `accepted` significa aceptación para entrega, no entrega ni lectura. `simulated` es terminal para evitar convertir una simulación en envío real al cambiar variables. `suppressed` detiene futuros intentos por cancelación conocida. No puede retirarse un email si la cancelación llega mientras Resend ya está aceptando la petición; el control cubre las cancelaciones conocidas antes de contactar con él.

La revisión manual se realiza investigando D1 y el proveedor. No hay endpoint ni panel para forzar reenvío. No se debe limpiar `first_attempt_at`, cambiar la clave o borrar la fila para evitar los límites de idempotencia. No se almacenan datos bancarios ni tarjetas. Los datos personales sí residen en la solicitud, la cita y el payload de correo; sus plazos de conservación deberán definirse antes de activar el flujo.

## Validación local

```sh
npm run test:server
npm run build
npm run worker:check
npm run test:emails
npm run test:e2e -- tests/trip-request.spec.ts tests/api-local.spec.ts --workers=2 --output=test-results/first-session-final
npm run sessions:simulate
npm run emails:generate
```

Las pruebas de servidor usan SQLite real con claves foráneas y todas las migraciones ordenadas. Comprueban migración con datos previos, importes, unicidad, atomicidad, pago/reserva en cualquier orden, duplicados, concurrencia, referencias incorrectas, cancelación, recuperación de envíos inciertos, estados/configuración y las 52 opciones del cuestionario. El transporte de pruebas intercepta Turnstile/Resend y rechaza cualquier otro destino; no envía correos reales.

Ejecutar la compilación antes de arrancar el Worker de pruebas: regenerar `dist` mientras Wrangler observa sus assets puede interrumpir el servidor local. Usar una carpeta de resultados independiente conserva las capturas de email y evita interferencias con otra ejecución de Playwright.

Validación inicial de la fase local (5 de noviembre de 2026): **115/115** pruebas de servidor, **56/56** pruebas visuales de email y **28/28** pruebas de formulario/API local en Chromium y WebKit. Compilación TypeScript/Vite y `worker:check` correctos. Las ejecuciones iniciales de navegador requirieron cerrar procesos de preview en Windows y repetir con los servidores locales ya preparados; la ejecución final de 28 casos terminó con código 0, sin compilar durante la prueba. También se generaron y revisaron las previews del perfil con reserva y del aviso interno. No se valida recepción real de correo.

El simulador recorre el formulario, el perfil y ambos eventos hasta un aviso aceptado por un **Resend simulado**, repite eventos y ejecuta dos ticks adicionales. Escribe el aviso ficticio en `.email-preview/simulated-paid-session.html` y `.txt`. Las previews habituales incluyen seis perfiles con/sin enlace ficticio y un aviso pagado en `/paid-session`, solo en localhost y fuera de `public`/`dist`.

Las pruebas de navegador cubren nueve anchos por plantilla, con y sin estilos de cabecera/media queries y con imágenes bloqueadas. Los enlaces de preview son ficticios y no deben abrirse para reservar. No sustituyen pruebas de recepción reales.

### Prueba completa en producción

1. Entrar en https://aripajama.com/#crear-mi-viaje. Si aparece una solicitud anterior, usar «Empezar de nuevo»; los correos ya preparados conservan su contenido.
2. Completar preguntas y detalles, indicar exclusivamente mikel.canamares@gmail.com y aceptar recibir el perfil. El formulario prepara el token oficial de prueba de Turnstile sin cargar un desafío externo. El servidor lo valida con Siteverify y solo acepta el buzón autorizado.
3. Recibir el email del perfil, marcado [PRUEBA], y pulsar «Probar primera sesión · sin cobro».
4. Leer la página de confirmación y pulsar «Simular reserva y pago · sin cobro». Abrir el enlace por sí solo no genera ningún aviso.
5. Recibir el aviso interno, también [PRUEBA], con fecha de ejemplo, zona Europe/Madrid, nombre no facilitado, ausencia de videollamada real y las respuestas completas del formulario. Repetir la confirmación no produce otro aviso.

El enlace usa una referencia opaca, una caducidad de siete días y una firma HMAC SHA-256 con SESSION_TEST_SIGNING_KEY almacenada solo como secreto del Worker. No reutiliza el token de recuperación y no permite leer respuestas. La confirmación exige POST del mismo origen, firma válida, un perfil aceptado por Resend y el email autorizado. El servidor genera los dos eventos sintéticos con IDs estables; no acepta importe, fecha, estado de pago ni destinatario como entrada pública.

PHASE1_TEST_MODE solo funciona en producción con EMAIL_MODE=resend, EMAIL_TEST_RESTRICTED=true, exactamente un destinatario permitido (el titular), ARIANA_EMAIL con ese mismo buzón, avisos habilitados y una clave de firma de 64 caracteres hexadecimales. Si una condición no se cumple, falla cerrado. Desactivar el modo invalida los enlaces y suprime avisos de prueba pendientes.

Se emplean las claves públicas de pruebas documentadas por [Cloudflare](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). El servidor sigue consultando Siteverify y solo acepta el token dummy en este modo restringido; la validación de hostname/acción con las claves reales se mantiene cuando el modo está desactivado. El secreto real de Turnstile fue rotado y actualizado en el Worker; no es necesario descargar ningún secreto para probar.

No hay otro Worker, base de datos, cuenta ni suscripción de pruebas. El comando independiente que pedía una clave local de Resend se ha retirado. Los scripts de simulación y las pruebas SQLite/Playwright permanecen como verificaciones automáticas, sin configurar otro entorno para el usuario.

## Condiciones de activación de fase 2

1. Configurar dos tipos de evento de Ariana contra el mismo calendario y comprobar conflictos entre ambos. Concretar duración, zona horaria, servicio de videollamada y condiciones de cancelación.
2. Configurar primera sesión a 40 EUR con pago obligatorio, conectar Stripe y completar verificación del titular/cuenta bancaria.
3. Implementar el webhook autenticado y la verificación de pago. Probar referencia intacta en enlace directo, eventos de pago y reprogramaciones, incluyendo consultas autenticadas cuando falten datos.
4. Verificar con pruebas controladas pago pendiente, confirmado, duplicados y cancelaciones, disponibilidad cruzada, confirmación del cliente, evento de calendario, videollamada y emails. Confirmaciones al cliente/calendario seguirán a cargo de Cal.com.
5. Concretar el buzón definitivo y contemplar el envío del formulario en el aviso de privacidad y la conservación del buzón/D1. Acordar el procedimiento de revisión manual.
6. Al finalizar las pruebas personales, desactivar PHASE1_TEST_MODE, comprobar Turnstile con sus claves reales, configurar el buzón definitivo y habilitar el enlace real de Cal.com. No reutilizar reservas de prueba como pagos reales, reenviar perfiles preparados ni incorporar enlaces retroactivos.

## Validación del entorno único de pruebas

5 de noviembre de 2026: **125/125** pruebas de servidor, **70/70** pruebas de emails y **30/30** pruebas de formulario/API en Chromium y WebKit. TypeScript/Vite y empaquetado del Worker correctos. La ejecución final del navegador se hizo en serie para evitar los timeouts de WebKit al competir con la batería de emails. Las migraciones 0002 y 0003 están aplicadas en D1 remoto; las solicitudes anteriores se conservan. La comprobación real de entrega se registra aparte: aceptación de Resend no demuestra lectura ni recepción en bandeja de entrada.

Comprobación real en aripajama.com: versión `0d665793-2aa2-4a11-ae7b-35cd9841301e`, solicitud de prueba `760b699b58c74f97a0e3a578d1056053`. Resend aceptó el perfil y el aviso interno para el buzón del titular. El aviso conserva un solo intento aceptado tras repetir la confirmación; abrir el enlace no generó reservas ni avisos. Se verificaron las diez preguntas y los detalles completos del correo persistido, la marca is_test y el rechazo de otros destinatarios. El frontend publicado coincide con la compilación validada. La recepción en la bandeja personal y la lectura deben comprobarse por el titular.
