import { useEffect, useRef } from 'react'
import { Brand } from '../components/Brand'

export function JourneyScreen({ onBack }: { onBack: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => { titleRef.current?.focus({ preventScroll: true }) }, [])

  return (
    <main className="journey screen">
      <header className="journey__header"><Brand /></header>
      <section className="journey__content" aria-labelledby="journey-title">
        <p className="eyebrow">El viaje continúa</p>
        <h1 ref={titleRef} id="journey-title" tabIndex={-1}>¿Dónde empieza tu próximo viaje?</h1>
        <p>Un lugar con el que sueñas. Una forma distinta de llegar.<br />Un viaje diseñado contigo.</p>
        <button className="text-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Volver a la portada
        </button>
      </section>
      <div className="journey__landscape" aria-hidden="true" />
      <footer className="journey__footer">Aripajama · Travel Planner</footer>
    </main>
  )
}
