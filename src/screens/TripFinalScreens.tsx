import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { TRAVELER_PROFILES } from '../data/traveler-profiles'
import { TRAVEL_COMPANIES, tripDetailsErrors, type TripDetails, type TripReceipt } from '../data/trip-request'
import { useRevealSequence } from '../hooks/useRevealSequence'
import type { CreatePosition } from './CreateTripFlow'
import '../trip-final.css'

type FrameProps = { active: boolean; entry: string; position?: CreatePosition; onReady: () => void; onBack: () => void; title: string; eyebrow?: string; children: ReactNode; busy?: boolean }
function Frame({ active, entry, position, onReady, onBack, title, eyebrow, children, busy }: FrameProps) {
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => { if (active) window.scrollTo(0, position?.scroll || 0) }, [active, position])
  useRevealSequence(root, active, `trip-final:${entry}`)
  useEffect(() => {
    if (!active) return
    const restored = position?.focus ? document.getElementById(position.focus) : null
    ;(restored || heading.current)?.focus({ preventScroll: true })
  }, [active, position])
  useEffect(() => {
    let done = false
    const ready = () => { if (!done) { done = true; onReady() } }
    void document.fonts.ready.then(ready)
    const timer = setTimeout(ready, 3000)
    return () => { done = true; clearTimeout(timer) }
  }, [onReady])
  return <main className="questionnaire trip-final screen" aria-busy={busy || undefined}>
    <img className="questionnaire__art" src="/media/trip-details/header.webp" width="701" height="190" alt="" onError={event => { event.currentTarget.hidden = true }} />
    <img className="questionnaire__footer-art" src="/media/questionnaire/footer.webp" width="941" height="127" alt="" onError={event => { event.currentTarget.hidden = true }} />
    <div ref={root} className="questionnaire__content" data-reveal-scope="">
      <button id="trip-final-back" className="create-trip__back" onClick={onBack} disabled={busy}><span aria-hidden="true">←</span> Volver</button>
      <header className="trip-final__header" data-reveal-group="">{eyebrow && <p className="questionnaire__eyebrow">{eyebrow}</p>}<h1 id="trip-final-title" data-reveal="title" ref={heading} tabIndex={-1}>{title}</h1></header>
      {children}
    </div>
  </main>
}
const FIELDS = [
  { id: 'destination', title: 'Destino', hint: '¿Tienes un destino en mente?' },
  { id: 'days', title: 'Duración aproximada', hint: '¿Cuántos días?' },
  { id: 'season', title: 'Época del año', hint: '¿Cuándo te gustaría viajar?' },
  { id: 'company', title: 'Tipo de viaje', hint: 'Pareja, familia, amigos…' },
  { id: 'budget', title: 'Presupuesto del viaje (aprox.)', hint: 'Euros por persona' },
  { id: 'needs', title: 'Otras necesidades (opcional)', hint: 'Alimentación, movilidad, etc.' },
] as const
type Common = Omit<FrameProps, 'title' | 'children'>
export function TripDetailsScreen({ details, onChange, onContinue, error, ...props }: Common & { error: string; details: TripDetails; onChange: (value: TripDetails) => void; onContinue: () => void }) {
  const [errors, setErrors] = useState<ReturnType<typeof tripDetailsErrors>>({})
  const [expanded, setExpanded] = useState<string[]>([])
  const update = (key: keyof TripDetails, value: string | boolean) => { onChange({ ...details, [key]: value }); setErrors(current => ({ ...current, [key]: undefined, [key.replace('Unknown', '')]: undefined })) }
  const summary = (id: typeof FIELDS[number]['id']) => {
    if (id === 'company') return TRAVEL_COMPANIES.find(option => option.id === details.company)?.label
    if (id === 'needs') return details.needs ? 'Necesidades anotadas' : ''
    if (details[`${id}Unknown`]) return 'Aún por definir'
    return details[id] ? id === 'budget' ? `${details[id]} € por persona` : id === 'days' ? `${details[id]} días` : details[id] : ''
  }
  return <Frame {...props} title="Cuéntame los detalles prácticos.">
    <p data-reveal="intro" className="trip-final__intro">Esta información me ayudará a preparar nuestra primera videollamada.</p>
    <form noValidate onSubmit={event => {
      event.preventDefault()
      const invalid = tripDetailsErrors(details)
      setErrors(invalid)
      const first = Object.keys(invalid)[0]
      if (first) {
        setExpanded(current => [...new Set([...current, first])])
        requestAnimationFrame(() => document.getElementById(`trip-${first}`)?.focus())
      } else onContinue()
    }}>
      <fieldset className="trip-final__fields" disabled={props.busy}>
        <legend className="visually-hidden">Detalles del viaje</legend>
        {FIELDS.map((field, index) => <details key={field.id} className="trip-final__field" data-reveal={`field-${field.id}`} data-reveal-frame="" data-reveal-group="" open={expanded.includes(field.id)} onToggle={event => {
          const open = event.currentTarget.open
          setExpanded(current => open ? current.includes(field.id) ? current : [...current, field.id] : current.filter(id => id !== field.id))
        }}>
          <summary tabIndex={0} id={`trip-summary-${field.id}`}><img data-reveal={`icon-${field.id}`} src={`/media/trip-details/field-${index + 1}.webp`} width="116" height="116" alt="" onError={event => { event.currentTarget.style.visibility = 'hidden' }} /><span><span data-reveal={`title-${field.id}`} className="trip-final__field-title">{field.title}</span><span data-reveal={`hint-${field.id}`} className="trip-final__field-hint">{summary(field.id) || field.hint}</span></span><span aria-hidden="true">›</span></summary>
          <div className="trip-final__panel">
            <label data-reveal={`label-${field.id}`} htmlFor={`trip-${field.id}`} className="trip-final__label">{field.title}</label>
            {field.id === 'company' ? <select id="trip-company" value={details.company} onChange={event => update('company', event.target.value)} aria-invalid={!!errors.company} aria-describedby={errors.company ? 'trip-company-error' : undefined}><option value="">Selecciona una opción</option>{TRAVEL_COMPANIES.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select>
              : field.id === 'needs' ? <textarea id="trip-needs" rows={4} maxLength={1500} value={details.needs} onChange={event => update('needs', event.target.value)} />
              : <>
                <input id={`trip-${field.id}`} type={field.id === 'days' || field.id === 'budget' ? 'number' : 'text'} min={field.id === 'budget' ? '.01' : field.id === 'days' ? '1' : undefined} step={field.id === 'budget' ? '.01' : field.id === 'days' ? '1' : undefined} maxLength={250} disabled={details[`${field.id}Unknown`]} value={details[field.id]} onChange={event => update(field.id, event.target.value)} aria-invalid={!!errors[field.id]} aria-describedby={errors[field.id] ? `trip-${field.id}-error` : undefined} />
                <label className="trip-final__check"><input type="checkbox" checked={details[`${field.id}Unknown`]} onChange={event => update(`${field.id}Unknown`, event.target.checked)} />Aún por definir</label>
              </>}
            {errors[field.id] && <p id={`trip-${field.id}-error`} className="trip-final__error" role="alert">{errors[field.id]}</p>}
          </div>
        </details>)}
      </fieldset>
      {error && <p className="trip-final__error" role="alert">{error}</p>}
      <button disabled={props.busy} data-reveal="continue" id="trip-details-continue" type="submit" className="questionnaire__continue">{props.busy ? 'Preparando tu perfil…' : 'Ver mi perfil viajero'} <span aria-hidden="true">⟶</span></button>
    </form>
  </Frame>
}
export function TripProfileScreen({ receipt, onReview, onLanding, onRestart, ...props }: Common & {
  receipt: TripReceipt; onReview: () => void; onLanding: () => void; onRestart: () => void
}) {
  const profile = TRAVELER_PROFILES[receipt.profile]
  return <Frame {...props} title={profile.title} eyebrow="Tu perfil viajero">
    <section className="trip-final__profile" aria-labelledby="trip-final-title">
      <img data-reveal="profile-art" src={`/media/email/${receipt.profile}-art.jpg`} width="384" height="687" alt="" />
      <div data-reveal="profile-copy">
        <p className="trip-final__intro">{profile.description}</p>
        <button type="button" className="questionnaire__continue" disabled aria-describedby="booking-availability">Reservar mi cita</button>
        <p id="booking-availability">Reservas disponibles próximamente</p>
      </div>
    </section>
    <div className="questionnaire__complete-actions">
      <button data-reveal="review" id="question-review" className="questionnaire__secondary" onClick={onReview} disabled={props.busy}>Revisar respuestas</button>
      <button data-reveal="landing" id="question-landing" className="questionnaire__secondary" onClick={onLanding} disabled={props.busy}>Volver a Crear mi viaje</button>
      <button data-reveal="restart" id="question-restart" className="questionnaire__secondary" onClick={onRestart} disabled={props.busy}>Empezar de nuevo</button>
    </div>
  </Frame>
}
