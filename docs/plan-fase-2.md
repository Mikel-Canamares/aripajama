# Plan de programación de fase 2

Estado: diseñado, pendiente de petición de implementación. Fecha: 5 de noviembre de 2026. Preparación de cuentas: [guía de Cal.com y Stripe](guia-calcom-stripe.md). Base ya implementada: [fase 1](first-session.md).

## Objetivo y alcance

Conectar **cuestionario → perfil → Cal.com → pago de 40 EUR → un aviso con cita y formulario completo**, utilizando el Worker, D1, dominio y Resend actuales. Cal.com gestionará disponibilidad, checkout, invitación y videollamada. No se construirán calendario, checkout ni panel, ni se contratarán servicios adicionales automáticamente.

El aviso propio se enviará solo con reserva confirmada, no cancelada, y pago cobrado de exactamente 4000 céntimos EUR vinculado a esa reserva. El segundo tipo de evento comparte disponibilidad, pero no dispara este aviso salvo ampliación de alcance acordada. Los emails propios son independientes de las confirmaciones y notificaciones nativas de Cal.com/Stripe: revisar estas últimas para evitar avisos redundantes al anfitrión sin perder la invitación del calendario.

## A. Comprobar el contrato con la cuenta real

Antes de fijar código o activar enlaces:

1. Recoger la ficha de la guía; confirmar los dos IDs de evento, propietario, calendario, duración, videollamada y condiciones.
2. Verificar acceso efectivo a webhooks, consulta autenticada de reservas y evidencia de pago con el plan elegido. Comprobar el modo de prueba de la conexión alojada Cal.com–Stripe. Si falta una capacidad, documentar el bloqueo y resolverlo antes de activar.
3. Capturar muestras controladas y redactadas de creación, pago pendiente/pagado, cancelación y reprogramación. Registrar versión del webhook y campos reales. No guardar payloads de clientes en fixtures.
4. Probar `metadata[aripajama_reference]` desde el enlace del perfil hasta la reserva. La documentación garantiza el transporte para embeds; el enlace directo y los eventos de pago requieren prueba real. Si falta metadata en el evento, consultar la reserva autenticada. Si el enlace directo no la conserva, usar el embed documentado en una página mínima del mismo sitio, conservando calendario y pago de Cal.com.
5. Confirmar cómo se relacionan UID/ID de reserva y PaymentIntent, si los cobros son accesibles desde la cuenta Stripe del titular y qué ocurre con el UID al reprogramar. Nunca enlazar por email como alternativa.

Salida: contrato real documentado, fixtures sin datos personales y decisión explícita sobre transporte de referencia, lectura del pago y modo de prueba. [Metadatos](https://cal.com/help/embedding/prefill-booking-form-embed), [webhooks](https://cal.com/docs/developing/guides/automation/webhooks).

## B. Recibir y verificar los eventos

Implementación prevista:

- Nuevo `server/cal-webhook.ts` y ruta propuesta `POST /api/webhooks/cal` en `server/index.ts`. **La ruta todavía no existe**.
- Verificar `x-cal-signature-256` con HMAC SHA-256 sobre los bytes originales antes de parsear. Limitar tamaño, validar estructura/versión y filtrar propietario e ID de la primera sesión. Esta ruta usa firma de servidor, no Turnstile ni la comprobación de Origin del formulario.
- Suscribirse a creación, solicitud, rechazo, cancelación, reprogramación, inicio de pago y pago completado. Incluir actualizaciones de ubicación si son necesarias para obtener la videollamada. Mantener payload estándar y secreto obligatorio en nuestra configuración.
- Añadir `server/cal-client.ts` para consultas autenticadas con timeout, respuestas validadas y reintentos acotados. No consultar URLs arbitrarias incluidas en payloads.
- Nuevo `server/cal-adapter.ts`: transformar datos verificados al contrato de `ingestSessionEvent`, con claves estables para duplicados y sin datos personales en identificadores/logs.
- Persistir recepción y trabajos de verificación pendientes antes de responder éxito. Reutilizar la infraestructura existente y, si hace falta, añadir una migración aditiva para la bandeja de entrada con IDs, huella, estado y reintentos; no editar migraciones aplicadas ni almacenar respuestas del formulario en ella.
- El procesador periódico recuperará consultas pendientes aunque no llegue otro webhook. Duplicados reciben respuesta correcta sin nuevos efectos. Firma inválida se rechaza; fallos transitorios antes de persistir devuelven error recuperable. Incidencias permanentes quedan identificadas para revisión, sin bucles infinitos.

Criterio: un evento no autenticado, ajeno o incompleto nunca puede declarar una cita pagada; reiniciar el Worker no pierde trabajo aceptado.

## C. Verificar cobro y relación con la reserva

Añadir `server/stripe-client.ts` si la evidencia autenticada de Cal.com no permite demostrar por sí sola el cobro. Consultar con permisos mínimos y en el contexto de la cuenta que realmente posee el pago; no presuponer acceso a los objetos de una plataforma Connect.

Para un PaymentIntent, verificar al menos estado `succeeded`, importe recibido 4000, moneda `eur`, cuenta/modo esperados y asociación demostrable con la reserva. Un importe previsto, `requires_capture`, `processing`, un redirect o el nombre `BOOKING_PAID` por sí solos no bastan. Distinguir importe bruto cobrado de saldo neto tras comisiones. Consultar estado actual de cancelación/reembolso cuando proceda antes de encolar o enviar. [Estados de pago de Stripe](https://docs.stripe.com/payments/payment-intents/verifying-status).

Si se necesita un webhook adicional de Stripe para recuperar cambios de estado/reembolsos que Cal.com no notifique, añadirlo con firma propia y la misma persistencia/idempotencia. Decidirlo con la evidencia de A; no crear dos rutas de negocio independientes.

Mantener y ampliar los controles de `server/sessions.ts`: importe/moneda, referencias desconocidas, pago único, eventos desordenados, cancelación y separación de prueba/real. Una reprogramación con UID nuevo debe conservar el vínculo con la cita/pago original y no producir un segundo aviso. No se implementarán reembolsos automáticos; documentar operación manual y estados que impiden avisar.

## D. Integrar emails y recuperar avisos

Reutilizar `server/booking-link.ts`, `server/delivery.ts`, `server/email-template.ts`, `server/session-email.ts` y `server/session-delivery.ts`.

- Incluir la referencia solo en nuevas solicitudes y nuevos payloads de perfil. Conservar contenido, destinatario y clave de correos ya preparados.
- Antes del aviso, completar fecha, zona IANA y videollamada a partir de la reserva actual. Definir espera/revisión si Cal.com todavía no ha generado el enlace; no enviar un aviso definitivo incompleto por una carrera entre eventos.
- Preservar la clave de Resend, bloqueo, ventana de reintento y registro de aceptación. Revalidar cambios/cancelaciones antes de enviar. Después de un intento incierto, un cambio de contenido obliga a revisión.
- Mantener un único aviso propio por reserva lógica pagada. Las actualizaciones posteriores al aviso se gestionarán mediante las confirmaciones de Cal.com y el procedimiento de revisión acordado, no duplicando el email inicial con todo el formulario.
- Incorporar al procedimiento manual las incidencias pendientes, las reservas sin referencia y las cancelaciones posteriores al envío. Un correo aceptado no se puede retirar.

## E. Probar en el mismo dominio

Se mantiene un solo Worker/D1 y los correos propios restringidos a Mikel durante la aceptación. El modo simulado actual exige esa configuración concreta; no se debe reutilizar su etiqueta `test: true` para saltarse la verificación de Cal.com/Stripe.

Diseñar la configuración para distinguir explícitamente tres procedencias: simulación local de fase 1, integración autenticada con datos de prueba del proveedor y pagos reales. Persistir esa distinción y filtrar cada modo. Los pagos sandbox nunca cumplen la regla de cobro real ni pueden convertirse en reales al cambiar una variable. Las pruebas del proveedor llevarán etiqueta visible en los emails.

Desactivar la ruta sintética de fase 1 durante la prueba de integración y comprobar Turnstile con las claves reales y su hostname/acción. Si reaparece el error original, diagnosticar código de error, configuración del widget, token y Siteverify antes de abrir el formulario al público.

Stripe prescribe probar sin tarjetas reales. Si Cal.com alojado no ofrece un modo compatible, resolver con el proveedor cómo validar la integración; no hacer un cargo ficticio y reembolso como sustituto. Tampoco presentar los fixtures locales como evidencia de una prueba completa del proveedor. [Pruebas de Stripe](https://docs.stripe.com/testing).

| Prueba | Resultado exigido |
| --- | --- |
| Formulario nuevo y perfil | Referencia nueva estable; enlace correcto; ningún aviso interno al rellenar. |
| Reserva y pago correcto | Un aviso, importe exacto, cita, zona, videollamada y respuestas completas. |
| Pago pendiente, rechazado o abandonado | Ningún aviso pagado; recuperación cuando corresponda. |
| Pago previo a reserva / eventos concurrentes | Mismo resultado final, sin duplicados. |
| Firma falsa, evento ajeno, referencia ausente o alterada | Rechazo o incidencia; sin búsqueda por email. |
| Importe/moneda incorrectos o pago reutilizado | Aviso bloqueado y causa identificada. |
| Repetición del webhook / reinicio | Una reserva lógica, un pago y un aviso. |
| Cancelación, reprogramación y reembolso | Estado actual respetado; sin segundo aviso inicial por UID nuevo. |
| APIs caídas, 429 y timeouts | Trabajo persistido y recuperación sin nuevos eventos. |
| Resend acepta y D1 falla | Misma clave/payload al recuperar; revisión si cambió la cita. |
| Calendario y segundo evento | Una reserva bloquea ambos enlaces; probar también en sentido inverso. |
| Cliente y anfitrión | Invitación y videollamada utilizables; recepción real del correo y zona correcta. |
| Cambio a modo real | Datos sandbox excluidos; enlaces de simulación invalidados; sin reenvíos históricos. |

Ejecutar `npm run test:server`, `npm run build`, `npm run worker:check`, las pruebas de emails afectadas y las de formulario/API/navegador. Añadir casos de webhook/adaptador y migración con datos previos. Las cifras de fase 1 (125 servidor, 70 emails, 30 navegador) son la referencia anterior, no resultados de esta fase futura.

## F. Activación y marcha atrás

Solo después de superar los criterios anteriores y concretar privacidad, conservación, buzón y operación manual:

1. Publicar primero el receptor con emisión de enlaces reales desactivada y aplicar únicamente migraciones aditivas necesarias. Configurar secretos en Cloudflare y el webhook en Cal.com; validar firma y recuperación.
2. Completar la aceptación restringida en el dominio actual. Las credenciales de prueba/real del proveedor estarán separadas aunque el Worker sea el mismo.
3. Para la apertura real: `PHASE1_TEST_MODE=false`, `BOOKING_ENABLED=true`, `CAL_BOOKING_URL` validada, `BOOKING_NOTIFICATIONS_ENABLED=true`, Turnstile real comprobado y credenciales/modo del proveedor reales. Mantener `EMAIL_MODE=resend`.
4. Establecer `ARIANA_EMAIL` definitivo y retirar `EMAIL_TEST_RESTRICTED` solo al abrir a clientes. Revisar los destinatarios de trabajos ya persistidos: no cambian retroactivamente al editar variables. Resolver o suprimir pendientes de prueba antes de abrir.
5. Verificar que los nuevos perfiles contienen el enlace real, que los anteriores conservan su contenido y que ninguna ruta pública permite simular pagos. Registrar versión y configuración activadas sin secretos.

Para detener nuevas reservas ante una incidencia: desactivar `BOOKING_ENABLED` **y pausar el evento en Cal.com**, porque los enlaces ya enviados seguirán existiendo. Mantener recepción/persistencia de webhooks; si el problema es el aviso, pausar `BOOKING_NOTIFICATIONS_ENABLED` conservando la cola. No borrar D1 ni cambiar claves de idempotencia para repetir envíos. Si la pausa supera la ventana de Resend, resolver mediante revisión manual.

## Archivos previstos y cierre

| Área | Archivos previstos |
| --- | --- |
| Recepción y proveedores | Nuevos `server/cal-webhook.ts`, `server/cal-client.ts`, `server/cal-adapter.ts`; `server/stripe-client.ts` si se requiere. |
| Contratos y procesamiento | `server/index.ts`, `server/platform.ts`, `server/sessions.ts`, `server/session-delivery.ts`. |
| Enlaces y emails | `server/booking-link.ts`, `server/delivery.ts`, `server/email-template.ts`, `server/session-email.ts`. |
| Salida del modo simulado | `server/test-mode.ts`, `server/session-test.ts`, `src/components/Turnstile.tsx`, configuración. |
| Persistencia | Nueva migración posterior a `0003`, solo si se necesita para recepción, modos o linaje de reservas. |
| Configuración y pruebas | `wrangler.jsonc`, `.dev.vars.example`, `server/tests/`, `tests/`, previews afectadas y documentación. |

Nombres propuestos para secretos nuevos: `CAL_WEBHOOK_SECRET`, `CAL_API_KEY` y, si procede, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`. Son propuestas, no variables implementadas. No añadir claves al repositorio. Reutilizar las APIs nativas del Worker; justificar cualquier dependencia nueva.

La entrega incluirá contrato confirmado, migraciones aplicadas, resultados reales de pruebas, configuración final sin secretos y procedimiento de incidencias. Los puntos pendientes principales son: segundo evento, modo de prueba del proveedor, conservación de metadata en el enlace directo, acceso al pago, reprogramación, Turnstile real y decisiones operativas de Ariana.
