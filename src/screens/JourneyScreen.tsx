import { Fragment, useEffect, useRef, useState } from 'react'
import { useRevealSequence } from '../hooks/useRevealSequence'

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

export function JourneyScreen({ active, onReady, onBack, onOpenLibrary, onOpenCreate, restoreFocus }: {
  active: boolean
  onReady: () => void
  onBack: () => void
  onOpenLibrary: () => void
  onOpenCreate: () => void
  restoreFocus: 'library' | 'create' | null
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const libraryRef = useRef<HTMLButtonElement>(null)
  const createRef = useRef<HTMLButtonElement>(null)
  const [artwork, setArtwork] = useState<'loading' | 'ready' | 'error'>('loading')
  useRevealSequence(rootRef, active)

  useEffect(() => {
    if (active) {
      window.scrollTo(0, 0)
      const target = restoreFocus === 'create' ? createRef.current : restoreFocus === 'library' ? libraryRef.current : titleRef.current
      target?.focus({ preventScroll: true })
    }
  }, [active, restoreFocus])

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
    <main ref={rootRef} data-reveal-scope="" className="journey screen" data-artwork={artwork}>
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
        <header className="journey__header" data-reveal-group="">
          <h1 className="journey__title" ref={titleRef} tabIndex={-1}>
            <span data-reveal="" className="journey__title-main">{CONTENT.title}</span>{' '}
            <span data-reveal="" className="journey__title-sub">{CONTENT.subtitle}</span>
          </h1>
          <p className="journey__subtitle visually-hidden">{CONTENT.description}</p>
        </header>
        <ol className="journey__cards" role="list">
          {CONTENT.cards.map(({ id, title, subtitle }) => (
            <li data-reveal="" data-reveal-frame="" data-reveal-group="" key={id} className={`journey__card journey__card--${id}`}>
              {id === 'library' && <button
                ref={libraryRef}
                className="journey__card-link"
                aria-label="Biblioteca de viajes"
                onClick={onOpenLibrary}
              />}
              {id === 'create' && <button
                ref={createRef}
                className="journey__card-link"
                aria-label="Crear mi viaje"
                onClick={onOpenCreate}
              />}
              <div className="journey__card-text">
                <h2 data-reveal="" className="journey__card-title"><Lines lines={title} /></h2>
                <p data-reveal="" className="journey__card-sub"><Lines lines={subtitle} /></p>
              </div>
              <span data-reveal="" className="journey__card-arrow" aria-hidden="true">
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
