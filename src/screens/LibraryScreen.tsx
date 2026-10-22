import { useEffect, useRef, useState } from 'react'

const CONTINENTS = [
  { id: 'europe', name: 'Europa', trips: 27 },
  { id: 'asia', name: 'Asia', trips: 5 },
  { id: 'america', name: 'América', trips: 5 },
  { id: 'africa', name: 'África', trips: 2 },
]

function Icon({ name }: { name: 'globe' | 'compass' | 'lock' | 'heart' | 'leaf' | 'arrow' }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'globe' && <><circle cx="32" cy="32" r="27" /><path d="m14 12 9 5-3 8-7 2-6-4m28-18-6 10 7 6 8-3 8 8 6 1M9 36l11-3 10 8-4 9-1 8m14-27-6 5 5 8 8 1 4 10m-3-44-7 9" /></>}
    {name === 'compass' && <><circle cx="32" cy="32" r="27" /><path d="m47 17-9 21-21 9 9-21Z" /><circle cx="32" cy="32" r="2" /></>}
    {name === 'arrow' && <><circle cx="32" cy="32" r="27" /><path d="M21 32h22M34 23l9 9-9 9" /></>}
    {name === 'lock' && <><rect x="15" y="28" width="34" height="29" rx="3" /><path d="M22 28V17a10 10 0 0 1 20 0v11" /><circle cx="32" cy="41" r="2.5" /><path d="M32 44v5" /></>}
    {name === 'heart' && <path d="M32 54 10 32C-5 14 18 2 32 20 46 2 69 14 54 32Z" />}
    {name === 'leaf' && <><path d="M10 57 49 9M20 45C6 43 10 30 10 30c10 0 15 5 10 15Zm8-11c-12-3-10-15-10-15 10 1 13 6 10 15Zm8-11C26 20 30 9 30 9c8 2 11 7 6 14Zm5-6c0-11 10-14 10-14 4 8 0 13-10 14ZM24 40c1-10 17-12 17-12 0 10-6 14-17 12Zm10-12c2-9 17-10 17-10-1 8-7 12-17 10Z" /></>}
  </svg>
}

export function LibraryScreen({ onBack }: { onBack: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [backgroundFailed, setBackgroundFailed] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  return <main className="library screen" data-background={backgroundFailed ? 'error' : 'ready'}>
    <img className="library__background" src="/media/library/background.webp" width="941" height="1672" alt="" onError={() => setBackgroundFailed(true)} />
    <div className="library__content">
      <button className="library__back" onClick={onBack}><span aria-hidden="true">←</span> Volver</button>
      <header className="library__header">
        <h1 ref={titleRef} tabIndex={-1}>Biblioteca<br />de viajes</h1>
        <span className="library__rule" aria-hidden="true" />
        <p>Destinos recorridos.<br />Experiencias reales.</p>
      </header>
      <section className="library__browse" aria-label="Otras formas de explorar" aria-describedby="library-pending">
        <button className="library__browse-card" disabled><Icon name="globe" /><span>Países</span><Icon name="arrow" /></button>
        <button className="library__browse-card library__browse-card--type" disabled><Icon name="compass" /><span>Tipo de viaje</span><Icon name="arrow" /></button>
      </section>
      <section className="library__continents" aria-labelledby="library-continents" aria-describedby="library-pending library-counts">
        <h2 id="library-continents" className="library__section-title">Explora por continente</h2>
        <ul className="library__grid">
          {CONTINENTS.map(continent => <li key={continent.id}>
            <button className={`library__continent library__continent--${continent.id}`} disabled>
              <img src={`/media/library/${continent.id}.svg`} alt="" width="360" height="360" />
              <span className="library__continent-copy"><span className="library__continent-name">{continent.name}</span><span className="library__continent-rule" /><span className="library__count">{continent.trips} viajes</span></span>
            </button>
          </li>)}
        </ul>
      </section>
      <footer className="library__footer" aria-label="Nuestra forma de viajar">
        <p><Icon name="lock" /><span>Itinerarios<br />reales</span></p>
        <p><Icon name="heart" /><span>Experiencias<br />de primera mano</span></p>
        <p><Icon name="leaf" /><span>Destinos con<br />sentido</span></p>
      </footer>
      <div className="library__notice">
        <p id="library-pending">Próximamente: explora los viajes por país, tipo de viaje y continente.</p>
        <p id="library-counts">Los recuentos son provisionales y están pendientes de conectar al catálogo.</p>
      </div>
    </div>
  </main>
}
