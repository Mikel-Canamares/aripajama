import { useEffect, useRef, useState } from 'react'
import { ABOUT_PHOTOS, type AboutPhotoId } from '../data/about-photos'
import { revealEntry, useRevealSequence } from '../hooks/useRevealSequence'
import '../about.css'

function Photo({ id }: { id: AboutPhotoId }) {
  const photo = ABOUT_PHOTOS[id]
  const [failed, setFailed] = useState(false)
  return <div data-reveal="" className={`about__photo about__photo--${id}`} data-photo-id={id} aria-hidden={!photo.src || failed ? true : undefined}>
    {photo.src && !failed && <img src={photo.src} alt={photo.alt} loading={id === 'portrait' ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: photo.position }} onError={() => setFailed(true)} />}
  </div>
}

function Sun() {
  return <svg data-reveal="" className="about__sun" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <circle cx="40" cy="40" r="15" />
    <path d="M40 7v10m0 46v10M7 40h10m46 0h10M17 17l7 7m32 32 7 7M17 63l7-7m32-32 7-7" />
  </svg>
}

function Heart() {
  return <svg data-reveal="" className="about__heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21 3.7 13C-2 7.5 6.4.5 12 6.9 17.6.5 26 7.5 20.3 13Z" /></svg>
}

export function AboutScreen({ active, onReady, onBack }: { active: boolean; onReady: () => void; onBack: () => void }) {
  const rootRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [entry] = useState(revealEntry)
  useRevealSequence(rootRef, active, `about:${entry}`)

  useEffect(() => { onReady() }, [onReady])

  useEffect(() => {
    if (!active) return
    window.scrollTo(0, 0)
    titleRef.current?.focus({ preventScroll: true })
  }, [active])

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

  return <main className="about screen" ref={rootRef} data-reveal-scope="" aria-label="Quién soy">
    <div className="about__content">
      <img data-reveal="" className="about__header-art" src="/media/about/header-art.webp" width="671" height="205" alt="" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
      <button className="about__back" onClick={onBack}><span aria-hidden="true">←</span> Volver</button>

      <section className="about__section about__section--ariana" aria-labelledby="about-ariana">
        <span data-reveal="" className="about__number" aria-hidden="true">01</span>
        <div className="about__copy" data-reveal-group="">
          <h1 data-reveal="" id="about-ariana" ref={titleRef} tabIndex={-1}>Hola,<br />soy Ariana.</h1>
          <span data-reveal="" className="about__rule" aria-hidden="true" />
          <p data-reveal="">Soy de las que todavía no han terminado un viaje y ya están pensando en el siguiente.</p>
          <p data-reveal="">Me apasiona la naturaleza, la montaña, el mar, las ciudades, la cultura, la gastronomía y esos rincones que se salen de las rutas habituales.</p>
          <p data-reveal="">He viajado sola y acompañada, de camping, de hostel, de apartamento o de hotel.</p>
          <p data-reveal="">No hay una única forma de viajar, solo la tuya.</p>
        </div>
        <div className="about__portrait" data-reveal-group="">
          <span data-reveal="" className="about__paper" aria-hidden="true" />
          <span data-reveal="" className="about__tape" aria-hidden="true" />
          <Photo id="portrait" />
          <img data-reveal="" className="about__cotton" src="/media/about/cotton.webp" width="83" height="128" alt="" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
          <Sun />
          <img data-reveal="" className="about__note" src="/media/about/note.webp" width="213" height="110" alt="Hay lugares donde todo encaja" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
        </div>
      </section>

      <section className="about__section about__section--origin" aria-labelledby="about-origin">
        <span data-reveal="" className="about__number" aria-hidden="true">02</span>
        <div className="about__copy" data-reveal-group="">
          <h2 data-reveal="" id="about-origin" tabIndex={-1}>¿Por qué Aripajama?</h2>
          <span data-reveal="" className="about__rule" aria-hidden="true" />
          <p data-reveal="">Es una palabra que inventó mi padre uniendo las primeras sílabas de nuestra familia.</p>
          <p data-reveal="">Él era un soñador, de los que no se detenían ante lo desconocido y ponían toda su energía en lo que querían. Me enseñó, sin saberlo, a atreverme, a superar mis miedos y a vivir con curiosidad.</p>
          <p data-reveal="">Hoy su letra forma parte de Aripajama y su manera de soñar sigue acompañándome en cada viaje.</p>
        </div>
        <div className="about__signature" data-reveal-group="">
          <img data-reveal="" src="/media/about/signature.webp" width="165" height="77" alt="Aripajama, con la letra de mi padre" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
          <img data-reveal="" className="about__mountains" src="/media/about/mountains.webp" width="126" height="47" alt="" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
        </div>
      </section>

      <section className="about__section about__section--photography" aria-labelledby="about-photography">
        <span data-reveal="" className="about__number" aria-hidden="true">03</span>
        <div className="about__copy" data-reveal-group="">
          <h2 data-reveal="" id="about-photography" tabIndex={-1}>La fotografía,<br />mi otra forma de viajar.</h2>
          <span data-reveal="" className="about__rule" aria-hidden="true" />
          <p data-reveal="">Desde hace años construyo mi pequeño diario visual. La fotografía me permite capturar momentos, contar historias y volver a sentir lo vivido.</p>
          <p data-reveal="">No solo fotografío lugares, también personas, detalles, luces, comidas, caminos, culturas y todo lo que hace que un viaje sea único.</p>
        </div>
        <div className="about__collage about__collage--photography" data-reveal-group="">
          <span data-reveal="" className="about__paper" aria-hidden="true" />
          <Photo id="photography-mountain" /><Photo id="photography-desert" /><Photo id="photography-road" />
          <Photo id="photography-snow" /><Photo id="photography-ocean" /><Photo id="photography-river" />
          <img data-reveal="" className="about__camera-note" src="/media/about/camera-note.webp" width="160" height="125" alt="Fotografiar para recordar cómo se siente" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
        </div>
      </section>

      <section className="about__section about__section--travel" aria-labelledby="about-travel">
        <span data-reveal="" className="about__number" aria-hidden="true">04</span>
        <div className="about__copy" data-reveal-group="">
          <h2 data-reveal="" id="about-travel" tabIndex={-1}>Viajar empieza<br />mucho antes de partir.</h2>
          <span data-reveal="" className="about__rule" aria-hidden="true" />
          <p data-reveal="">Me encanta imaginar, investigar y organizar cada viaje. Disfruto tanto preparándolo como viviéndolo y recordándolo después.</p>
          <p data-reveal="">Aripajama nace de esa pasión: de las ganas de compartir mi manera de descubrir el mundo y ayudarte a crear viajes únicos, a tu manera.</p>
        </div>
        <div className="about__collage about__collage--travel" data-reveal-group="">
          <span data-reveal="" className="about__paper" aria-hidden="true" />
          <Photo id="travel-hike" /><Photo id="travel-museum" /><Photo id="travel-aurora" /><Photo id="travel-colosseum" />
          <Photo id="travel-selfie" /><Photo id="travel-temple" /><Photo id="travel-summit" /><Photo id="travel-morocco" />
        </div>
      </section>

      <footer className="about__closing" data-reveal-group="">
        <p data-reveal="">Hoy viajo de la misma manera<br />que soñé.</p>
        <Heart />
      </footer>
      <img data-reveal="" className="about__footer-ribbons" src="/media/about/footer-ribbons.webp" width="941" height="118" alt="" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
    </div>
  </main>
}
