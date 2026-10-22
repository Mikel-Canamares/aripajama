import { useEffect, useRef } from 'react'

const CARDS = [
  { title: 'Quién soy',           sub: 'Conóceme' },
  { title: 'Biblioteca de viajes', sub: 'Inspírate' },
  { title: 'Crear mi viaje',      sub: 'Empieza a crear tu próxima historia' },
]

export function JourneyScreen({ active, onReady, onBack }: {
  active: boolean
  onReady: () => void
  onBack: () => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (active) titleRef.current?.focus({ preventScroll: true })
  }, [active])

  useEffect(() => {
    // No media to load: signal readiness immediately.
    onReady()
  }, [onReady])

  return (
    <main className="journey screen">
      {/* Decorative waves — presentational only */}
      <svg className="journey__waves" viewBox="0 0 390 844" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="waveGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a46e" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#e8c98a" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="waveBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b0bec5" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#cfd8dc" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="waveChampagne" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8d5b8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f4ede3" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Top-left blue-grey ribbon */}
        <path
          d="M-40 120 C60 60, 160 180, 220 100 C280 20, 340 140, 430 80"
          fill="none" stroke="url(#waveBlue)" strokeWidth="90" strokeLinecap="round"
        />
        {/* Bottom-right champagne ribbon */}
        <path
          d="M-20 780 C80 700, 200 820, 310 740 C400 680, 430 780, 500 720"
          fill="none" stroke="url(#waveChampagne)" strokeWidth="110" strokeLinecap="round"
        />
        {/* Gold thread — top */}
        <path
          d="M-30 150 C100 80, 240 200, 380 110 C440 75, 480 130, 520 90"
          fill="none" stroke="url(#waveGold)" strokeWidth="1.5" strokeLinecap="round"
        />
        {/* Mid blue-grey sweep */}
        <path
          d="M-40 460 C80 380, 200 500, 310 420 C390 360, 440 460, 500 390"
          fill="none" stroke="url(#waveBlue)" strokeWidth="70" strokeLinecap="round"
        />
        {/* Gold thread — bottom */}
        <path
          d="M-20 700 C90 630, 210 750, 360 660 C430 620, 480 680, 520 640"
          fill="none" stroke="url(#waveGold)" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>

      <header className="journey__header">
        <h1 className="journey__title" ref={titleRef} tabIndex={-1}>
          <span className="journey__title-main">Tu viaje,</span>
          <span className="journey__title-sub">en tres formas</span>
        </h1>
        {/* Hidden subtitle kept for tests and screen readers */}
        <p className="journey__subtitle visually-hidden">Conóceme, inspírate y empieza a crear tu próxima historia.</p>
      </header>

      <ol className="journey__cards" role="list">
        {CARDS.map(({ title, sub }) => (
          <li key={title} className="journey__card">
            <div className="journey__card-text">
              <h2 className="journey__card-title">{title}</h2>
              <p className="journey__card-sub">{sub}</p>
            </div>
            <span className="journey__card-arrow" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M3 10h13M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </li>
        ))}
      </ol>

      <footer className="journey__controls">
        <button className="text-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Volver a la portada
        </button>
      </footer>
    </main>
  )
}
