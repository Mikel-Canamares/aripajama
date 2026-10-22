import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CONTINENTS, TRIPS, readLibraryView } from '../data/library'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { LibraryCatalog } from './LibraryCatalog'
import { LibraryIcon as Icon } from '../components/LibraryIcon'

export function LibraryScreen({ active, onReady, onBack }: { active: boolean; onReady: () => void; onBack: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [background, setBackground] = useState<'loading' | 'ready' | 'error'>('loading')
  const [route, setRoute] = useState(() => ({ hash: window.location.hash || '#biblioteca', restore: false }))
  const [pending, setPending] = useState<{ hash: string; restore: boolean } | null>(null)
  const [stage, setStage] = useState<'idle' | 'out' | 'in'>('idle')
  const reducedMotion = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const view = readLibraryView(route.hash)

  useEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => { history.scrollRestoration = previous }
  }, [])

  function navigate(hash: string, sourceId?: string, replace = false) {
    if (!active || stage !== 'idle' || hash === route.hash) return
    const focused = document.activeElement as HTMLElement | null
    // Safari touch activation does not necessarily focus the button that was pressed.
    history.replaceState({ ...history.state, libraryPosition: { scroll: window.scrollY, focus: sourceId || focused?.id } }, '')
    const state = { libraryDepth: replace ? 0 : (history.state?.libraryDepth || 0) + 1 }
    if (replace) history.replaceState(state, '', hash)
    else history.pushState(state, '', hash)
    setPending({ hash, restore: false })
    setStage('out')
  }

  function back() {
    if (!active || stage !== 'idle') return
    if (view.page === 'home') { onBack(); return }
    if (history.state?.libraryDepth > 0) history.back()
    else navigate(view.page === 'trips' && view.country ? '#biblioteca/paises' : '#biblioteca', undefined, true)
  }

  useEffect(() => {
    const handlePop = () => {
      if (!window.location.hash.startsWith('#biblioteca')) return
      setPending({ hash: window.location.hash, restore: true })
      setStage('out')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    if (stage === 'idle') return
    const timer = window.setTimeout(() => {
      if (stage === 'out' && pending) {
        setRoute(pending)
        setPending(null)
        setStage('in')
      } else setStage('idle')
    }, reducedMotion ? 0 : stage === 'out' ? 160 : 420)
    return () => window.clearTimeout(timer)
  }, [stage, pending, reducedMotion])

  useLayoutEffect(() => {
    if (stage !== 'in') return
    window.scrollTo(0, route.restore ? history.state?.libraryPosition?.scroll || 0 : 0)
  }, [route, stage])

  useEffect(() => {
    if (!active || stage !== 'idle') return
    const id = route.restore && history.state?.libraryPosition?.focus
    const restored = id && contentRef.current?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
    const target = restored || titleRef.current
    target?.focus({ preventScroll: true })
  }, [active, stage, route])

  useEffect(() => {
    if (background !== 'loading') { onReady(); return }
    const timer = window.setTimeout(() => setBackground('error'), 3000)
    return () => window.clearTimeout(timer)
  }, [background, onReady])

  useEffect(() => {
    if (!active || stage !== 'idle') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      back()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return <main className="library screen" data-background={background} data-view={view.page}>
    <img className="library__background" src="/media/library/background.webp" width="941" height="1672" alt="" onError={() => setBackground('error')} onLoad={async event => {
      const image = event.currentTarget
      try {
        await image.decode()
        await document.fonts.ready
        setBackground('ready')
      } catch { setBackground('error') }
    }} />
    <div className="library__content" ref={contentRef}>
    <div className="library__view" data-stage={stage} inert={stage !== 'idle'} aria-hidden={stage !== 'idle'}>
      <button className="library__back" onClick={back}><span aria-hidden="true">←</span> Volver</button>
      {view.page !== 'home' ? <LibraryCatalog view={view} titleRef={titleRef} onNavigate={navigate} /> : <>
      <header className="library__header">
        <h1 ref={titleRef} tabIndex={-1}>Biblioteca<br />de viajes</h1>
        <span className="library__rule" aria-hidden="true" />
        <p>Destinos recorridos.<br />Experiencias reales.</p>
      </header>
      <section className="library__browse" aria-label="Otras formas de explorar">
        <button id="library-countries" className="library__browse-card" onClick={() => navigate('#biblioteca/paises', 'library-countries')}><Icon name="globe" /><span>Países</span><Icon name="arrow" /></button>
        <button className="library__browse-card library__browse-card--type" disabled><Icon name="compass" /><span>Tipo de viaje</span><Icon name="arrow" /></button>
      </section>
      <div className="library__all"><button id="library-all" className="text-button" onClick={() => navigate('#biblioteca/viajes', 'library-all')}>Ver los {TRIPS.length} viajes <span aria-hidden="true">→</span></button></div>
      <section className="library__continents" aria-labelledby="library-continents">
        <h2 id="library-continents" className="library__section-title">Explora por continente</h2>
        <ul className="library__grid">
          {CONTINENTS.map(continent => <li key={continent.id}>
            <button id={`library-${continent.id}`} className={`library__continent library__continent--${continent.id}`} onClick={() => navigate(`#biblioteca/viajes?continente=${continent.id}`, `library-${continent.id}`)}>
              <img src={`/media/library/${continent.id}.svg`} alt="" width="360" height="360" />
              <span className="library__continent-copy"><span className="library__continent-name">{continent.name}</span><span className="library__continent-rule" /><span className="library__count">{TRIPS.filter(trip => trip.continent === continent.id).length} viajes</span></span>
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
        <p id="library-pending">Próximamente: explora por tipo de viaje y descubre los itinerarios detallados.</p>
      </div>
      </>}
    </div>
    </div>
  </main>
}
