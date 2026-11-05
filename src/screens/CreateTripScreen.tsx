import { useEffect, useRef, useState } from 'react'
import { LibraryIcon } from '../components/LibraryIcon'
import { useRevealSequence } from '../hooks/useRevealSequence'
import type { CreatePosition } from './CreateTripFlow'
import '../create-trip.css'

const STEPS = [
  { icon: 'compass', title: 'Te descubro', text: 'Respondes un pequeño cuestionario y me cuentas tu idea de viaje.' },
  { icon: 'video', title: 'Lo imaginamos juntos', text: 'Hablamos de tus gustos, resolvemos dudas y definimos tus preferencias.' },
  { icon: 'route', title: 'Diseño tu itinerario', text: 'Te propongo ruta, actividades, alojamientos y experiencias adaptadas a ti.' },
  { icon: 'document', title: 'Lo hacemos realidad', text: 'Recibes tu viaje final con enlaces y guía práctica para reservar.' },
]

function WhatsAppIcon() {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M27.5 15.4a11.5 11.5 0 0 1-16.9 10.1L4 27l1.6-6.3a11.5 11.5 0 1 1 21.9-5.3Z" />
    <path d="m11.3 9.5 2 4-1.5 1.4c1 2 2.5 3.5 4.6 4.3l1.4-1.7 3.9 1.8c.1 2-1.4 3.3-3.2 3-5.5-1-10-5.4-10.5-10.2-.2-1.7 1.3-2.8 3.3-2.6Z" />
  </svg>
}

export function CreateTripScreen({ active, onReady, onBack, onDiscover, position, entry }: {
  active: boolean
  onReady: () => void
  onBack: () => void
  onDiscover: () => void
  position?: CreatePosition
  entry: string
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  useRevealSequence(contentRef, active, `create:${entry}`)
  const [background, setBackground] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (background !== 'loading') { onReady(); return }
    const timer = window.setTimeout(() => setBackground('error'), 3000)
    return () => window.clearTimeout(timer)
  }, [background, onReady])

  useEffect(() => {
    if (!active) return
    window.scrollTo(0, position?.scroll || 0)
    const restored = position?.focus ? document.getElementById(position.focus) : null
    ;(restored || titleRef.current)?.focus({ preventScroll: true })
  }, [active, position])

  useEffect(() => {
    if (!active) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      onBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, onBack])

  return <main className="create-trip screen" data-background={background}>
    <img className="create-trip__background" src="/media/create-trip/background.webp" width="941" height="1672" alt="" onError={() => setBackground('error')} onLoad={async event => {
      const image = event.currentTarget
      try {
        await image.decode()
        await document.fonts.ready
        setBackground('ready')
      } catch { setBackground('error') }
    }} />
    <div className="create-trip__content" ref={contentRef} data-reveal-scope="">
      <button className="create-trip__back" onClick={onBack}><span aria-hidden="true">←</span> Volver</button>
      <header className="create-trip__header" data-reveal-group="">
        <h1 data-reveal="" ref={titleRef} tabIndex={-1}>No hay dos<br />formas iguales<br />de viajar.</h1>
        <span data-reveal="" className="create-trip__rule" aria-hidden="true" />
        <p data-reveal="">Te acompaño a diseñar un viaje a tu medida, para que solo tengas que disfrutar.</p>
      </header>
      <section className="create-trip__process" aria-labelledby="create-trip-process">
        <h2 data-reveal="" id="create-trip-process" className="create-trip__section-title">¿Cómo funciona?</h2>
        <ol className="create-trip__steps" role="list">
          {STEPS.map((step, index) => <li data-reveal-group="" className="create-trip__step" key={step.icon}>
            <img data-reveal="" src={`/media/create-trip/${step.icon}.webp`} alt="" width="120" height="120" />
            <span data-reveal="" className="create-trip__number" aria-hidden="true">0{index + 1}</span>
            <div className="create-trip__step-copy"><h3 data-reveal="">{step.title}</h3><p data-reveal="">{step.text}</p></div>
          </li>)}
        </ol>
      </section>
      <section className="create-trip__actions" aria-label="Empieza tu viaje">
        <article data-reveal="" data-reveal-frame="" data-reveal-group="" className="create-trip__card create-trip__card--discover">
          <h2 data-reveal="">Quiero empezar mi viaje</h2>
          <p data-reveal="">Responde a 10 preguntas, descubre tu perfil viajero y cuéntame qué tienes en mente.</p>
          <button data-reveal="" id="create-trip-discover" onClick={onDiscover}>Descubrir <span aria-hidden="true">⟶</span></button>
        </article>
        <article data-reveal="" data-reveal-frame="" data-reveal-group="" className="create-trip__card create-trip__card--contact">
          <h2 data-reveal="">Tengo dudas antes de empezar</h2>
          <p data-reveal="">A través de WhatsApp puedes preguntarme lo que necesites.</p>
          <button data-reveal="" disabled aria-describedby="create-trip-contact-pending">Hablemos <WhatsAppIcon /></button>
          <small data-reveal="" id="create-trip-contact-pending">WhatsApp próximamente</small>
        </article>
      </section>
      <footer className="create-trip__footer" aria-label="Nuestra forma de acompañarte">
        <p data-reveal-group=""><LibraryIcon name="lock" /><span data-reveal="">Tu información<br />siempre segura</span></p>
        <p data-reveal-group=""><LibraryIcon name="heart" /><span data-reveal="">Sin compromiso<br />para empezar</span></p>
        <p data-reveal-group=""><LibraryIcon name="leaf" /><span data-reveal="">Viajes con sentido<br />y a tu ritmo</span></p>
      </footer>
    </div>
  </main>
}
