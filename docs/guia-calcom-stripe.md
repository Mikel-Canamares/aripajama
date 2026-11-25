# Guía para preparar Cal.com y Stripe

Preparada el 5 de noviembre de 2026. La fase 1 ha sido validada personalmente por Mikel. Esta guía prepara las cuentas; la conexión con Aripajama se programará cuando lo indiques, siguiendo el [plan de fase 2](plan-fase-2.md).

## 1. Decide estos datos con Ariana

| Dato | Qué debes decidir |
| --- | --- |
| Cuenta de Cal.com | Email y usuario que conservará Ariana. |
| Calendario | Cuenta de Google/Microsoft y calendario donde deben aparecer las citas. |
| Zona horaria | `Europe/Madrid` si Ariana trabaja en horario peninsular español. Confirmarlo. |
| Primera sesión | Nombre, duración y descripción. El precio acordado es **40 EUR en total**. Los 40 minutos de la simulación no fijan la duración real. |
| Segundo tipo de evento | Nombre, propósito, duración, precio si corresponde y cómo se compartirá. **Todavía no está definido**: no asumir que es gratuito ni una segunda sesión. |
| Disponibilidad | Días, horas, antelación mínima, margen entre citas y vacaciones. |
| Videollamada | Google Meet, Cal Video u otra integración disponible en la cuenta. |
| Condiciones | Cancelación, cambio de fecha, ausencias y tratamiento de reembolsos. |
| Buzón interno | Email definitivo para el aviso con el formulario completo. Durante las pruebas seguirá siendo `mikel.canamares@gmail.com`. |
| Datos personales | Texto de privacidad y plazos de conservación de respuestas, reservas y correos. |

## 2. Crear Cal.com y conectar el calendario

1. Entra en [Cal.com](https://cal.com/) y crea una cuenta individual de Ariana. Verifica su email.
2. Empieza por el plan individual gratuito. Anuncia tipos de evento y calendarios ilimitados y conexión de pagos. Comprueba en la cuenta el acceso a webhooks y las credenciales necesarias antes de contratar nada. [Planes oficiales](https://cal.com/pricing).
3. En **Apps / Aplicaciones**, conecta el calendario que Ariana utiliza. Autoriza el acceso desde la cuenta correcta.
4. En **Settings → Calendars / Configuración → Calendarios**, revisa por separado:
   - **Check for conflicts**: calendarios cuyos eventos deben bloquear horarios. Incluye el calendario donde se guardarán las dos clases de cita y los demás que determinen la disponibilidad de Ariana.
   - **Add to calendar**: calendario de destino de las reservas. Usa el mismo para los dos tipos de evento; revisa que ninguno tenga una excepción que lo cambie.
5. En **Availability / Disponibilidad**, configura zona horaria, días y horas. Asigna ese horario a ambos eventos cuando los crees.

Los nombres del menú pueden variar según idioma y versión. Cal.com distingue expresamente los calendarios que consulta del calendario donde escribe. [Integraciones oficiales](https://cal.com/features/app-store).

**Comprobación sin pagar:** crea en el calendario un evento temporal marcado como ocupado dentro del horario disponible. Abre los dos enlaces de reserva cuando estén creados: ese intervalo debe quedar bloqueado en ambos. Retira después solo ese evento temporal. La prueba de conflicto entre dos reservas de Cal.com se hará también en la integración.

## 3. Crear los dos tipos de evento

En **Event types / Tipos de evento** —la interfaz también puede llamarlos enlaces— crea dos eventos individuales con Ariana como anfitriona.

Para el primero:

- Nombre sugerido: **Primera sesión · Aripajama**.
- Ruta sugerida: `primera-sesion`. Guarda su enlace final, por ejemplo `https://cal.com/tu-usuario/primera-sesion`.
- Introduce la duración acordada, el horario y los márgenes entre citas.
- Configura una única modalidad de videollamada automática en **Location / Ubicación**. Si eliges Google Meet, conecta primero Google Calendar. [Documentación de videollamada](https://cal.com/docs/atoms/conferencing-apps).
- Describe qué incluye la sesión y añade las condiciones acordadas. No copies una política de reembolso de ejemplo como si ya estuviese decidida.
- Mantén los datos de reserva mínimos: nombre, email y los campos imprescindibles. Las diez preguntas ya están en Aripajama.

Texto base para adaptar:

> Primera sesión con Ariana para revisar tu idea de viaje y el perfil que has completado. Duración: [MINUTOS]. Precio total: 40 €. La reserva requiere completar el pago. La videollamada y la confirmación se enviarán al finalizar la reserva. Cambios y cancelaciones: [CONDICIONES].

Crea el segundo evento con el nombre y condiciones que hayáis decidido, usando el mismo calendario y revisión de conflictos. Su finalidad es independiente: **el aviso con formulario y pago de 40 € se integrará inicialmente solo para la primera sesión**.

Mientras se prepara todo, no difundas los enlaces. Si Cal.com ofrece ocultarlos del perfil público, úsalo, recordando que ocultar un enlace no impide reservar a quien lo conoce.

## 4. Crear y verificar Stripe

1. Accede a [Stripe](https://dashboard.stripe.com/register). La cuenta debe corresponder al titular real que presta y cobra el servicio; el buzón de pruebas de Mikel no determina quién es ese titular.
2. Completa la activación que solicita el panel: país, actividad, datos del titular o entidad y datos públicos del negocio. Indica Aripajama y su web donde corresponda.
3. Completa la verificación que aparezca pendiente. Stripe muestra en el panel qué documentos necesita; entrégalos allí, no en el chat.
4. Añade la cuenta bancaria de abono y resuelve cualquier comprobación de titularidad solicitada.
5. Revisa nombre que verá el cliente, contacto de soporte y estado de habilitación de cobros y abonos.

Fuentes: [alta y activación](https://docs.stripe.com/get-started/account/set-up), [verificación del titular](https://support.stripe.com/questions/what-do-i-need-to-do-to-verify-my-stripe-account/), [cuenta bancaria](https://support.stripe.com/questions/verify-your-bank-account-ownership?locale=en-GB).

No necesitas crear una suscripción ni un enlace de pago independiente para este flujo. El checkout lo gestionará Cal.com con Stripe. Hay comisiones por procesamiento: consulta las [tarifas de Stripe](https://stripe.com/es/pricing) y cualquier comisión que muestre Cal.com al conectar; no equivale a cobrar sin costes.

## 5. Conectar Stripe al evento de 40 €

1. Desde Cal.com abre **Apps**, busca la [aplicación oficial de Stripe](https://cal.com/apps/stripe) y sigue **Install / Connect**.
2. Autoriza la cuenta de Stripe correcta. Comprueba qué cuenta y modo han quedado conectados.
3. Vuelve al evento de primera sesión y localiza **Payments / Pagos** o sus ajustes de Stripe.
4. Activa el pago obligatorio, introduce **40** como precio en euros —no 4000 en una casilla de euros— y selecciona **EUR**.
5. Revisa la vista pública: total 40 €, duración, zona horaria, condiciones y necesidad de pagar para completar la reserva. Sin descuentos ni suplementos que cambien el total acordado.
6. Anota si hay aprobación manual del anfitrión. Para el flujo automático preferimos confirmación sin aprobación manual adicional, pero comprobaremos cómo interactúa con el pago.

No cambies todavía la configuración de Cloudflare ni el botón de Aripajama. Conectar estas cuentas no implementa por sí solo el aviso con el formulario.

## 6. Pruebas sin confundirlas con cobros reales

**Aripajama seguirá usando un único dominio, Worker y base de datos.** Stripe distingue sus datos de prueba de los pagos reales; esa separación del proveedor no supone crear otra web.

Comprueba si la integración alojada de Cal.com permite conectar Stripe en modo de prueba o sandbox. Las fuentes revisadas no bastan para garantizar esa opción en tu cuenta. Si no aparece claramente, anótalo y consúltalo con soporte de Cal.com; no sustituyas esta prueba por un cargo a tu propia tarjeta.

En Stripe, ver datos de prueba en el panel no cambia por sí solo el modo de una integración externa. Cuando confirmemos que **Cal.com y Stripe están conectados en pruebas**, usaremos los datos de tarjeta oficiales para éxito, rechazo y autenticación. Stripe indica que las pruebas deben usar claves y métodos de prueba, sin tarjetas reales ni cobros ficticios en modo real. [Guía oficial de pruebas](https://docs.stripe.com/testing).

Ahora puedes revisar enlaces, horarios, precio mostrado, calendario conectado y condiciones. El recorrido completo con pago, referencia del formulario y aviso se probará después de programar el adaptador.

## 7. Qué dejar pendiente para la programación

- **Webhook**: comprueba que encuentras **Settings → Developer → Webhooks**, pero no crees todavía uno apuntando a una dirección inventada. Te daré la URL cuando exista. Cal.com permite firmar los avisos con un secreto. [Configuración oficial](https://cal.com/docs/developing/guides/automation/webhooks).
- **Claves API**: no hace falta que las copies ahora. Si necesitamos consultar Cal.com o Stripe, indicaremos permisos y nombres exactos. Se guardarán como secretos del Worker, nunca en el chat ni en el código.
- **Privacidad y conservación**: deja decidido qué información se comunica al cliente y cuánto se conservará. La parte técnica no sustituye esa decisión.
- **Reembolsos**: deja claro el procedimiento. No asumir que cancelar una reserva devuelve automáticamente el pago.

## 8. Ficha para enviarme cuando termines

Copia y completa este bloque. No incluyas contraseñas, claves, DNI, IBAN ni respuestas de clientes.

```text
Cal.com creado: sí / pendiente
Usuario de Cal.com:
Enlace de primera sesión:
Duración de primera sesión:
Precio mostrado: 40 EUR / incidencia
Pago obligatorio: sí / pendiente
Aprobación manual del anfitrión: sí / no
Segundo evento: nombre, finalidad, duración y precio
Enlace del segundo evento:
Calendario: Google / Microsoft / otro; nombre del calendario destino
Ambos eventos usan ese calendario y comprueban conflictos: sí / pendiente
Zona horaria de Ariana:
Videollamada elegida:
Horario, antelación y margen entre citas:
Condiciones de cancelación, cambios y reembolsos:
Stripe: cuenta creada / verificación pendiente / cobros y abonos habilitados
Stripe conectado a Cal.com: sí / pendiente
Modo de prueba de la conexión Cal.com–Stripe: confirmado / no disponible / por comprobar
Apartado Webhooks disponible: sí / no / por comprobar
Buzón definitivo de Ariana:
Privacidad y conservación: decidido / pendiente
Incidencias o pantallas que no coinciden con la guía:
```

Después puedes decir: **«Implementa la fase 2 siguiendo docs/plan-fase-2.md; estos son los datos de configuración»**. Hasta entonces, la web conserva el modo de prueba de fase 1 que ya has validado.
