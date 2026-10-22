import { Fragment, useEffect, useRef, useState } from 'react'

// Copy stays independent of the artwork. Arrays define the reference's line breaks.
const CONTENT = {
  title: 'Tu viaje,',
  subtitle: 'en tres formas',
  description: 'Conóceme, inspírate y empieza a crear tu próxima historia.',
  cards: [
    { id: 'about', title: ['Quién soy'], subtitle: ['Conóceme'] },
    { id: 'library', title: ['Biblioteca', 'de viajes'], subtitle: ['Inspírate'] },
    { id: 'create', title: ['Crear mi viaje'], subtitle: ['Empieza a crear', 'tu próxima historia'] },
  ],
}

function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => (
    <Fragment key={index}>{index > 0 && <>{' '}<br /></>}{line}</Fragment>
  ))
}

export function JourneyScreen({ active, onReady, onBack }: {
  active: boolean
  onReady: () => void
  onBack: () => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [artwork, setArtwork] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (active) titleRef.current?.focus({ preventScroll: true })
  }, [active])

  useEffect(() => {
    if (!active) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, onBack])

  useEffect(() => {
    // A stalled request must not trap the visitor on the intro.
    if (artwork !== 'loading') {
      onReady()
      return
    }
    const timeout = window.setTimeout(() => setArtwork('error'), 3000)
    return () => window.clearTimeout(timeout)
  }, [artwork, onReady])

  return (
    <main className="journey screen" data-artwork={artwork}>
      <div className="journey__media">
        <img
          className="journey__artwork"
          src="/media/hub-clean.webp"
          alt=""
          aria-hidden="true"
          width={942}
          height={1670}
          onLoad={async (event) => {
            const image = event.currentTarget
            try {
              await image.decode()
              await document.fonts.ready
              setArtwork('ready')
            } catch {
              setArtwork('error')
            }
          }}
          onError={() => setArtwork('error')}
        />
      </div>
      <div className="journey__canvas">
        <header className="journey__header">
          <h1 className="journey__title" ref={titleRef} tabIndex={-1}>
            <span className="journey__title-main">{CONTENT.title}</span>{' '}
            <span className="journey__title-sub">{CONTENT.subtitle}</span>
          </h1>
          <p className="journey__subtitle visually-hidden">{CONTENT.description}</p>
        </header>
        <ol className="journey__cards" role="list">
          {CONTENT.cards.map(({ id, title, subtitle }) => (
            <li key={id} className={`journey__card journey__card--${id}`}>
              <div className="journey__card-text">
                <h2 className="journey__card-title"><Lines lines={title} /></h2>
                <p className="journey__card-sub"><Lines lines={subtitle} /></p>
              </div>
              <span className="journey__card-arrow" aria-hidden="true">
                <svg className="journey__card-arrow-icon" viewBox="0 0 44 44" fill="none">
                  <circle cx="22" cy="22" r="21" stroke="currentColor" strokeWidth="1" />
                  <path d="M16 22h12M22 16l6 6-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <button className="journey__back text-button" onClick={onBack}>
        <span aria-hidden="true">←</span> Volver a la portada
      </button>
    </main>
  )
}
