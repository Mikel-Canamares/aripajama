import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { bookingHref, validBooking, type BookingOptions } from '../data/trip-request'
import { calOrigin, loadCal } from './cal-embed'

type Outcome = { accepted: boolean; when: string }
type CalEvent = CustomEvent<{ data?: { uid?: string; status?: string; startTime?: string; paymentRequired?: boolean } }>

function CalendarDialog({ booking, opener, onClose, onBooked }: {
  booking: BookingOptions; opener: HTMLButtonElement; onClose: () => void; onBooked: (outcome: Outcome) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useLayoutEffect(() => {
    const element = dialog.current!
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [opener])

  useEffect(() => {
    const container = host.current!
    let active = true
    let unsubscribe = () => {}
    const failed = () => {
      if (!active) return
      active = false
      clearTimeout(timeout)
      setState('error')
      container.replaceChildren()
    }
    const timeout = window.setTimeout(failed, 22000)
    // Only the currently mounted Cal frame may feed postMessages to the SDK.
    const guard = (event: MessageEvent) => {
      if (typeof event.data?.fullType !== 'string' || !event.data.fullType.startsWith('CAL:')) return
      if (event.source !== container.querySelector('iframe')?.contentWindow ||
          ![calOrigin, 'https://cal.com'].includes(event.origin)) event.stopImmediatePropagation()
    }
    window.addEventListener('message', guard, true)
    window.addEventListener('offline', failed)
    void loadCal().then(cal => {
      if (!active) return
      const ready = () => { if (active) { clearTimeout(timeout); setState('ready') } }
      const booked = (event: CalEvent) => {
        const data = event.detail?.data
        if (!active || typeof data?.uid !== 'string' || !data.uid.trim() || data.paymentRequired) return
        const status = typeof data.status === 'string' ? data.status.toUpperCase() : undefined
        if (status !== 'ACCEPTED' && status !== 'PENDING') return
        active = false
        clearTimeout(timeout)
        const time = typeof data.startTime === 'string' ? Date.parse(data.startTime) : NaN
        const when = Number.isFinite(time) ? new Intl.DateTimeFormat('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        }).format(time) : ''
        onBooked({ accepted: status === 'ACCEPTED', when })
      }
      const listeners = [{ action: 'linkReady', callback: ready }, { action: 'linkFailed', callback: failed },
        { action: 'bookingSuccessfulV2', callback: booked },
        // Escape inside a cross-origin frame cannot bubble into the native dialog.
        // Cal forwards unhandled Escape on supporting booker versions.
        { action: '__escapeKeyPressed', callback: () => { if (active) onClose() } }]
      for (const listener of listeners) cal('on', listener)
      unsubscribe = () => { for (const listener of listeners) cal('off', listener) }
      cal('inline', { elementOrSelector: container, calLink: booking.path, config: {
        layout: 'month_view', theme: 'light', 'metadata[aripajama_reference]': booking.reference,
        ...(booking.email && { email: booking.email }), ...(booking.name && { name: booking.name }),
      } })
      const frame = container.querySelector('iframe')
      if (frame) {
        frame.title = 'Calendario de disponibilidad'
        frame.referrerPolicy = 'no-referrer'
      }
      cal('ui', { theme: 'light', cssVarsPerTheme: { light: { 'cal-brand': '#4a0f18' } } })
    }).catch(failed)
    return () => {
      active = false
      clearTimeout(timeout)
      window.removeEventListener('message', guard, true)
      window.removeEventListener('offline', failed)
      unsubscribe()
      container.replaceChildren()
    }
  }, [booking, attempt, onBooked, onClose])

  return <dialog ref={dialog} className="booking-dialog" aria-labelledby="booking-title"
    onCancel={event => { event.preventDefault(); onClose() }}
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() } }}>
    <header><h2 id="booking-title">Reserva tu videollamada</h2>
      <button type="button" autoFocus className="questionnaire__secondary" onClick={onClose}>Cerrar</button></header>
    <div className="booking-dialog__body">
      {state === 'loading' && <p role="status">Cargando el calendario…</p>}
      {state === 'error' && <div><p role="alert">No se ha podido cargar el calendario. Comprueba tu conexión o abre la reserva en Cal.com.</p>
        <button type="button" className="questionnaire__secondary" onClick={() => { setState('loading'); setAttempt(value => value + 1) }}>Reintentar</button>
        <a href={bookingHref(booking)} target="_blank" rel="noopener noreferrer">Abrir en Cal.com (nueva pestaña)</a></div>}
      <div ref={host} aria-busy={state === 'loading'} hidden={state === 'error'} />
    </div>
  </dialog>
}

export function BookingCalendar({ booking, lookup, retryLookup }: {
  booking?: BookingOptions; lookup: 'ready' | 'loading' | 'error'; retryLookup: () => void
}) {
  const [opener, setOpener] = useState<HTMLButtonElement | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const close = useCallback(() => setOpener(null), [])
  const result = useRef<HTMLDivElement>(null)
  useEffect(() => { if (outcome) result.current?.focus({ preventScroll: true }) }, [outcome])
  const available = validBooking(booking)
  if (outcome) return <div ref={result} tabIndex={-1} role="status">
    <strong>{outcome.accepted ? 'Tu cita está confirmada.' : 'Tu cita está pendiente de confirmación.'}</strong>
    {outcome.when && <p>{outcome.when}</p>}
    <p>{outcome.accepted ? 'Recibirás por correo los datos de la cita y el enlace a Cal Video.' : 'Cal.com te avisará por correo cuando se confirme.'}</p>
  </div>
  return <>
    <button type="button" className="questionnaire__continue" disabled={!available} aria-haspopup={available ? 'dialog' : undefined}
      aria-describedby={available ? undefined : 'booking-availability'} onClick={event => setOpener(event.currentTarget)}>Reservar mi cita</button>
    {!available && <p id="booking-availability" role="status">{lookup === 'loading' ? 'Consultando las reservas…' :
      lookup === 'error' ? 'No se ha podido consultar el calendario. Comprueba tu conexión.' : 'Reservas disponibles próximamente'}</p>}
    {!available && lookup === 'error' && <button type="button" className="questionnaire__secondary" onClick={retryLookup}>Volver a consultar</button>}
    {opener && available && <CalendarDialog booking={booking} opener={opener} onClose={close} onBooked={setOutcome} />}
  </>
}
