# Reservar la primera videollamada

Al completar las diez preguntas y los detalles del viaje, Aripajama guarda la solicitud y muestra el perfil viajero. «Reservar mi cita» abre el calendario bajo demanda. El visitante elige fecha y hora en su zona horaria y completa el formulario del evento. El resultado de una reserva aceptada aparece en la pantalla del perfil. La invitación de Cal.com contiene el enlace personal de Cal Video y permite gestionar la cita después de cerrar la pestaña.

## Preparar la cuenta personal de Cal.com

1. En la cuenta de pruebas, verifica el correo del organizador. Configura el idioma español, tu zona horaria y las franjas de disponibilidad. Comprueba los días activos, las excepciones y los límites de antelación.
2. En la configuración de calendarios y videoconferencia, conecta **Google Calendar** y autoriza tu cuenta personal en Google. Marca los calendarios que se consultarán para detectar conflictos y el calendario de destino donde se añadirán las citas. [Calendarios y videoconferencia](https://cal.com/help/my-account/calendars-and-conferencing)
3. Crea un tipo de evento individual. Escribe su nombre y descripción en castellano, elige la duración de la primera cita y asigna la disponibilidad anterior. Selecciona **Cal Video** como única ubicación del evento. Cal.com generará un enlace de sala para cada reserva. El viajero puede unirse como invitado desde el navegador. [Cal Video](https://site.cal.com/features/cal-video)
4. En el formulario de reserva, conserva el nombre y el correo del asistente como obligatorios y activa el campo nativo **número de teléfono del asistente** como obligatorio. Utiliza confirmación automática, evento individual no recurrente y la pantalla de éxito de Cal.com. Desactiva cualquier redirección de éxito que sustituya esa pantalla. En los ajustes del evento fija el idioma de la interfaz en **Español** y revisa también la página en un navegador configurado en otro idioma.
5. Habilita las notificaciones de confirmación para viajero y organizador. La invitación al viajero debe incluir Cal Video como ubicación. El aviso privado con las respuestas lo envía Aripajama mediante Resend al mismo buzón del organizador. Evita crear otro flujo que envíe una segunda confirmación. [Preferencias de notificación](https://cal.com/help/bookings/notification-preferences)
6. Copia el enlace público individual con el formato `https://cal.com/usuario/evento`. Guarda ese valor en `CAL_BOOKING_URL`. Para comprobar la disponibilidad manualmente, abre el enlace y compara una franja libre con una ocupada en el calendario conectado.
7. En los webhooks **de ese evento**, añade la URL HTTPS de tu Worker de pruebas seguida de `/api/cal/webhook`. Selecciona **Booking Created**, conserva la carga útil estándar y establece un secreto aleatorio exclusivo del entorno. Guarda el mismo valor en `CAL_WEBHOOK_SECRET` del Worker. Un ping del panel comprueba conectividad. La prueba de entrega con cuestionario requiere una reserva iniciada desde Aripajama o el evento firmado simulado de las pruebas. [Configuración y firma de webhooks](https://cal.com/help/webhooks)

## Variables del Worker

| Variable | Valor o función |
|---|---|
| `BOOKING_ENABLED` | `true` habilita el botón para un enlace válido. Inicialmente está desactivado. |
| `CAL_BOOKING_URL` | Enlace HTTPS individual de Cal.com, sin parámetros ni fragmento. |
| `BOOKING_NOTIFICATIONS_ENABLED` | `true` para recibir el webhook y procesar los avisos internos. También es una opción del procesador histórico de avisos. |
| `CAL_WEBHOOK_SECRET` | Secreto compartido únicamente entre el evento y el Worker. Usa un secreto de Cloudflare en el entorno alojado. |
| `ARIANA_EMAIL` | Dirección verificada del organizador de ese evento. Es el único destinatario del correo con las respuestas. |
| `ENVIRONMENT`, `EMAIL_MODE` | `development` con `disabled` o `mock` para pruebas locales. El envío real usa `production` con `resend`. |
| `EMAIL_FROM`, `REPLY_TO`, `RESEND_API_KEY` | Remitente verificado, respuesta y secreto ya usados por Resend. |
| `EMAIL_TEST_RESTRICTED`, `EMAIL_TEST_RECIPIENTS` | Durante pruebas de recepción real, limita los destinatarios al buzón de pruebas. Esta restricción cubre Resend. Cal.com controla sus propias invitaciones. |

No se necesita una API key de Cal.com ni credenciales de Google en Aripajama. El secreto se configura en el Worker, fuera del frontend. El ejemplo local está en `.dev.vars.example`. Conserva los valores propios y los secretos en `.dev.vars` o en la configuración del entorno correspondiente.

## Probar en local

1. Usa Node.js 22.13 o posterior con los requisitos de Vite del proyecto, y las dependencias del lockfile. En una copia nueva ejecuta `npm ci`. En `.dev.vars` define el enlace del evento personal, `BOOKING_ENABLED=true`, tu buzón y las opciones de aviso anteriores.
2. Ejecuta `npm run dev`. El script aplica las migraciones únicamente a D1 local, arranca el Worker en el puerto 8787 y muestra la dirección del frontend Vite. Este comando deshabilita el envío real de correos por Aripajama.
3. En «Crear mi viaje», responde las diez preguntas y continúa hasta «Ver mi perfil viajero». Abre «Reservar mi cita», elige un día y una franja y revisa los campos de contacto. Cierra el diálogo antes de confirmar para probar con la cuenta personal sin crear una cita. Comprueba que vuelves al perfil. Repite la prueba con una anchura móvil.
4. Para probar el flujo visual completo sin crear reservas, ejecuta `npm run test:frontend -- tests/cal-booking.spec.ts --workers=1`. El navegador usa un Embed simulado, incluido el evento de éxito. Para firmas, idempotencia y recuperación de entregas ejecuta `node --experimental-strip-types --test server/tests/cal-webhook.test.ts`. Usa D1 compatible en memoria y transporte simulado. Puedes ejecutar ambas pruebas sin cuenta de Cal.com.
5. Para inspeccionar un aviso en D1 local, ejecuta `npm run db:local`, inicia `npm run dev:api:mock` y `npm run dev:web` en terminales distintas. Configura `BOOKING_NOTIFICATIONS_ENABLED=true` y un secreto local antes de arrancar. Completa una solicitud de prueba y toma la referencia opaca del campo `booking.reference` en la respuesta de red al confirmar los detalles. Envía al Worker local un ejemplo firmado como el siguiente desde **PowerShell**.

```powershell
$eventUrl = Read-Host 'Enlace público del evento'
$hostEmail = Read-Host 'Correo del organizador de pruebas'
$ref = Read-Host 'Referencia de la solicitud local'
$pathParts = ([uri]$eventUrl).AbsolutePath.Trim('/').Split('/')
$payload = @{
  triggerEvent = 'BOOKING_CREATED'
  payload = @{
    uid = 'prueba-local-' + [guid]::NewGuid().ToString('N')
    type = $pathParts[1]
    status = 'ACCEPTED'
    organizer = @{ username = $pathParts[0]; email = $hostEmail; timeZone = 'Europe/Madrid' }
    attendees = @(@{ name = 'Persona de prueba'; email = 'ejemplo@example.test'; phoneNumber = '+34 600 000 000'; timeZone = 'Europe/Madrid' })
    startTime = '2030-12-01T10:00:00Z'
    endTime = '2030-12-01T10:30:00Z'
    metadata = @{ aripajama_reference = $ref }
  }
}
$body = [Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Depth 6 -Compress))
$secret = Read-Host 'Secreto exclusivo del webhook local' -AsSecureString
$hmac = [Security.Cryptography.HMACSHA256]::new()
$hmac.Key = [Text.Encoding]::UTF8.GetBytes(([Net.NetworkCredential]::new('', $secret)).Password)
$sig = [BitConverter]::ToString($hmac.ComputeHash($body)).Replace('-', '').ToLowerInvariant()
$hmac.Dispose()
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8787/api/cal/webhook' -ContentType 'application/json' -Headers @{'X-Cal-Signature-256'=$sig} -Body $body
```

6. Consulta la entrega con `node scripts/wrangler.mjs d1 execute aripajama-trip-requests --local --persist-to .wrangler/state --command "SELECT booking_uid,status,json_extract(payload_json,'$.text') AS aviso FROM cal_notification_emails ORDER BY rowid DESC LIMIT 1"`. Verifica el estado `simulated`, el horario, el teléfono y las diez respuestas. Si repites la misma petición firmada con el mismo UID debe seguir habiendo una sola entrega.
7. Un webhook alojado en Cal.com requiere una URL HTTPS accesible desde Internet. El simulador anterior funciona con localhost. Para comprobar los correos de Cal.com y abrir la sala real hará falta una prueba manual en un entorno accesible con un viajero y un organizador de pruebas.

## Pasar a la cuenta de Aripajama

Repite la configuración del evento en la cuenta definitiva. Conecta su Google Calendar, selecciona su propia disponibilidad, el calendario de destino y Cal Video. Configura el webhook para el Worker definitivo con un secreto nuevo. Aplica la migración 0005 en el entorno correspondiente antes de activar el Worker que procesa las reservas.

Actualiza el enlace, el buzón del organizador, el secreto y las opciones de notificación en ese entorno. Revisa la restricción de destinatarios de Resend, el remitente y las invitaciones nativas. Activa la integración y comprueba el recorrido con el nuevo evento. La configuración se lee al emitir o recuperar el recibo del cuestionario. El cambio de cuenta no requiere editar componentes ni reconstruir el frontend.

## Archivos de la integración

| Área | Creados | Modificados |
|---|---|---|
| Pantalla de reserva | `src/components/BookingCalendar.tsx`, `src/components/cal-embed.ts` | `src/screens/CreateTripFlow.tsx`, `src/screens/TripFinalScreens.tsx`, `src/trip-final.css` |
| Recibo y borrador | | `src/data/trip-request.ts`, `src/data/questionnaire.ts`, `src/hooks/useTripRequest.ts`, `server/booking-link.ts`, `server/delivery.ts` |
| Webhook y correo | `server/cal-webhook.ts`, `server/resend.ts`, `migrations/0005_cal_notification_emails.sql` | `server/index.ts`, `server/platform.ts`, `server/session-delivery.ts`, `server/session-email.ts` |
| Pruebas | `server/tests/cal-webhook.test.ts`, `tests/cal-booking.spec.ts` | |
| Configuración y guías | `docs/reservas-cal-video.md` | `.dev.vars.example`, `README.md`, `docs/first-session.md`, `docs/traveler-profiles.md` |

## Confirmación, privacidad y recuperación

- El Embed emite `bookingSuccessfulV2` también para algunas solicitudes pendientes. La interfaz exige una reserva identificada y aceptada para mostrar la confirmación. Al reservar en una pestaña externa, la confirmación se ve en Cal.com y llega por correo. El perfil de Aripajama no consulta cambios posteriores de fecha o cancelaciones. [Eventos del Embed](https://cal.com/help/embedding/embed-events)
- La aplicación entrega al Embed la referencia aleatoria y el contacto disponible mediante su configuración oficial. Cal.com puede serializar esa configuración en la URL interna del iframe. El enlace alternativo y la página de Aripajama omiten el contacto. El flujo actual recoge nombre, teléfono y correo al reservar. Los recibos históricos pueden precargar el correo guardado. [Precarga y metadatos](https://cal.com/help/embedding/prefill-booking-form-embed)
- La referencia del formulario aparece en `payload.metadata.aripajama_reference` del webhook. En la prueba manual, verifica también que llega al reservar por el enlace alternativo. Una visita directa al enlace público genérico carece de esa referencia. Cal.com puede confirmar esa cita, pero Aripajama carece de una solicitud con la que asociar el aviso.
- D1 guarda un registro de entrega por UID. El Worker utiliza la misma clave de idempotencia de Resend para los reintentos y retira la copia del contenido cuando Resend acepta el envío. El cron existente recupera envíos pendientes. Los intentos inciertos se limitan a ocho y a una ventana de 23 horas desde el primer intento. Los casos con estado `review_required` requieren revisar la entrega en Resend antes de decidir cualquier reenvío.
