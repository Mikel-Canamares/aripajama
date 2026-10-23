import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { CONTINENTS, type Trip } from '../data/library'
import type { TripDetail, TripImage } from '../data/trip-details'
import { useReducedMotion } from '../hooks/useReducedMotion'
import '../trip-detail.css'

function Photograph({ image, eager = false, className = '' }: { image: TripImage; eager?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <div className={`trip-photo trip-photo--missing ${className}`} role="img" aria-label={image.alt}><span>Imagen no disponible</span></div>
    : <img className={`trip-photo ${className}`} src={image.src} width={image.width} height={image.height} alt={image.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
}

function ThemeIcon({ name }: { name: TripDetail['themes'][number]['icon'] }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'culture' ? <><path d="M10 53h44M15 49V30h34v19M11 30l21-17 21 17H11ZM27 49V36h10v13M22 27l10-15 10 15M32 12V5M20 35v8M44 35v8" /></> : name === 'nature' ? <><path d="m7 41 15-23 11 16 8-13 16 20H7ZM18 25l4 6 4-6M37 27l4 5 4-5M8 49q6-5 12 0t12 0 12 0 12 0M12 56q5-4 10 0t10 0 10 0 10 0" /></> : <><path d="M31 49q7-17 4-32M35 17Q14 3 9 23q15-9 26-6ZM35 17Q46 2 57 15q-12-1-22 2ZM35 17Q48 17 54 32q-12-9-19-15ZM35 17Q23 17 19 31q8-9 16-14ZM12 52q10-8 20 0t20 0" /></>}
  </svg>
}

function OriginalViewer({ sheets, initialIndex, opener, onClose }: { sheets: TripDetail['sheets']; initialIndex: number; opener: HTMLElement; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(initialIndex)
  const [zoomed, setZoomed] = useState(false)
  const [failed, setFailed] = useState(false)
  const sheet = sheets[index]

  useLayoutEffect(() => {
    const dialog = dialogRef.current!
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      opener.focus({ preventScroll: true })
    }
  }, [opener])

  function changeSheet(next: number) {
    if (next < 0 || next >= sheets.length) return
    setIndex(next)
    setZoomed(false)
    setFailed(false)
    viewportRef.current?.scrollTo(0, 0)
  }

  return <dialog ref={dialogRef} className="trip-viewer" aria-labelledby="trip-viewer-title" onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={event => {
    if (event.key === 'Tab') {
      const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')]
      const first = targets[0]
      const last = targets[targets.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
    if (!zoomed && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      changeSheet(index + (event.key === 'ArrowLeft' ? -1 : 1))
    }
  }}>
    <header className="trip-viewer__header">
      <div aria-live="polite"><p className="trip-eyebrow">Láminas originales · {index + 1} / {sheets.length}</p><h2 id="trip-viewer-title">{sheet.title}</h2></div>
      <button autoFocus onClick={onClose} aria-label="Cerrar visor">Cerrar <span aria-hidden="true">×</span></button>
    </header>
    <div className="trip-viewer__tools" aria-label="Controles de la lámina">
      <button disabled={index === 0} onClick={() => changeSheet(index - 1)} aria-label="Lámina anterior">← <span>Anterior</span></button>
      <button aria-pressed={zoomed} onClick={() => { setZoomed(value => !value); viewportRef.current?.scrollTo(0, 0) }}>{zoomed ? 'Ajustar' : 'Ampliar'}</button>
      <button disabled={index === sheets.length - 1} onClick={() => changeSheet(index + 1)} aria-label="Lámina siguiente"><span>Siguiente</span> →</button>
    </div>
    <div ref={viewportRef} className="trip-viewer__viewport" data-zoomed={zoomed} tabIndex={0} role="region" aria-label={zoomed ? 'Lámina ampliada; desplázate para explorar' : 'Lámina completa'}>
      {failed ? <p role="status">No se ha podido cargar esta lámina. Puedes consultar el contenido en la ficha del viaje.</p> : <img key={sheet.src} src={sheet.src} alt={`Lámina original: ${sheet.title}`} width="941" height="1672" onError={() => setFailed(true)} />}
    </div>
  </dialog>
}

const sections = [{ id: 'inicio', label: 'Inicio' }, { id: 'ruta', label: 'Ruta' }, { id: 'etapas', label: 'Etapas' }, { id: 'esencia', label: 'Esencia' }] as const

export function TripDetailScreen({ trip, detail, titleRef }: { trip: Trip; detail: TripDetail; titleRef: RefObject<HTMLHeadingElement | null> }) {
  const [viewer, setViewer] = useState<{ index: number; opener: HTMLElement } | null>(null)
  const articleRef = useRef<HTMLElement>(null)
  const indexRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const destinations = new Set(detail.stages.map(stage => stage.destination)).size

  useEffect(() => {
    const index = indexRef.current!
    const observer = new ResizeObserver(() => articleRef.current?.style.setProperty('--trip-index-height', `${index.getBoundingClientRect().height + 20}px`))
    observer.observe(index)
    return () => observer.disconnect()
  }, [])

  function goTo(id: string) {
    const target = articleRef.current?.querySelector<HTMLElement>(`#trip-${id}`)
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
  }

  return <article className="trip-detail" ref={articleRef} aria-label={`Viaje a ${trip.title}`}>
    <nav className="trip-index" ref={indexRef} aria-label="Secciones del viaje">
      {sections.map(section => <button key={section.id} onClick={() => goTo(section.id)}>{section.label}</button>)}
    </nav>

    <header className="trip-hero">
      <div className="trip-hero__copy">
        <p className="trip-eyebrow">{CONTINENTS.find(continent => continent.id === trip.continent)?.name} · Un viaje para recordar</p>
        <h1 id="trip-inicio" ref={titleRef} tabIndex={-1}>{trip.title}</h1>
        <span className="trip-rule" aria-hidden="true" />
        <p className="trip-hero__introduction">{detail.introduction}</p>
        <ul className="trip-facts" aria-label="El viaje en cifras">{trip.days && <li><strong>{trip.days}</strong> días</li>}<li><strong>{destinations}</strong> destinos</li><li><strong>{detail.stages.length}</strong> etapas</li></ul>
        <button className="trip-originals" onClick={event => setViewer({ index: 0, opener: event.currentTarget })}>Ver las láminas originales <span aria-hidden="true">↗</span></button>
      </div>
      <Photograph image={detail.cover} eager className="trip-hero__image" />
    </header>

    <section className="trip-section" aria-labelledby="trip-ruta">
      <div className="trip-section__heading"><p className="trip-eyebrow">01 · El recorrido</p><h2 id="trip-ruta" tabIndex={-1}>La ruta</h2><p>{detail.routeIntroduction}</p></div>
      <div className="trip-route">
        <figure className="trip-route__map"><button className="trip-route__enlarge" onClick={event => setViewer({ index: 1, opener: event.currentTarget })} aria-label="Ampliar el mapa de la ruta"><Photograph image={detail.map} /><span>Ampliar mapa <span aria-hidden="true">↗</span></span></button><figcaption>{detail.routeCaption}</figcaption></figure>
        <div className="trip-route__summary"><p className="trip-eyebrow">Tu viaje, paso a paso</p><ol className="trip-route__stops">{detail.stages.map((stage, index) => <li key={index}><span className="trip-route__number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{stage.destination}</h3><p>{stage.days}</p></div></li>)}</ol><p className="trip-route__note">{detail.routeSummary}</p><p>{detail.routeClosing}</p></div>
      </div>
    </section>

    <section className="trip-section" aria-labelledby="trip-etapas">
      <div className="trip-section__heading"><p className="trip-eyebrow">02 · Grandes momentos</p><h2 id="trip-etapas" tabIndex={-1}>El viaje</h2><p>Grandes momentos, un mismo destino.</p></div>
      <ol className="trip-stages">{detail.stages.map((stage, index) => <li className="trip-stage" key={index}>
        <Photograph image={stage.image} />
        <div className="trip-stage__copy"><p className="trip-eyebrow">Etapa {String(index + 1).padStart(2, '0')}</p><h3>{stage.destination}</h3><p className="trip-stage__days">{stage.days}</p><p>{stage.description}</p></div>
      </li>)}</ol>
    </section>

    <section className="trip-section trip-essence" aria-labelledby="trip-esencia">
      <div className="trip-section__heading"><p className="trip-eyebrow">03 · La esencia</p><h2 id="trip-esencia" tabIndex={-1}>Lo que me llevo</h2><p>Más que un destino, una forma de viajar.</p></div>
      <div className="trip-themes">{detail.themes.map(theme => <div className="trip-theme" key={theme.title}><span className="trip-theme__icon"><ThemeIcon name={theme.icon} /></span><h3>{theme.title}</h3><span className="trip-rule" aria-hidden="true" /><p>{theme.description}</p></div>)}</div>
      <blockquote className="trip-reflection">{detail.reflection}</blockquote>
      <Photograph image={detail.closingImage} className="trip-closing" />
    </section>
    {viewer !== null && <OriginalViewer sheets={detail.sheets} initialIndex={viewer.index} opener={viewer.opener} onClose={() => setViewer(null)} />}
  </article>
}
