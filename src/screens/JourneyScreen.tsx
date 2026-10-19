import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function JourneyScreen({ active, onReady, onBack }: {
  active: boolean
  onReady: () => void
  onBack: () => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pauseRequested = useRef(false)
  const reducedMotion = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const [hasFrame, setHasFrame] = useState(false)
  const [paused, setPaused] = useState(false)
  const showStatic = reducedMotion || failed

  useEffect(() => {
    if (active) titleRef.current?.focus({ preventScroll: true })
  }, [active])

  useEffect(() => {
    // A slow or unavailable network must not leave the entry button waiting forever.
    const timer = window.setTimeout(onReady, 3000)
    return () => window.clearTimeout(timer)
  }, [onReady])

  useEffect(() => {
    if (showStatic || pauseRequested.current) return
    // Safari can pause a video while its prepared screen is still invisible.
    // Retry once the transition has made the screen fully visible.
    let mounted = true
    videoRef.current?.play().catch((error: unknown) => {
      if (mounted && (!(error instanceof DOMException) || error.name !== 'AbortError')) setPaused(true)
    })
    return () => { mounted = false }
  }, [showStatic, active])

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      pauseRequested.current = false
      video.play().catch(() => setPaused(true))
    } else {
      pauseRequested.current = true
      video.pause()
    }
  }

  return (
    <main className="journey screen">
      <div className="journey__landscape" aria-hidden="true">
        <img
          className="journey__film"
          src="/media/hub-inicio.webp"
          width="720"
          height="1280"
          alt=""
          onLoad={onReady}
          onError={onReady}
        />
        {!showStatic && (
          <video
            ref={videoRef}
            className="journey__film journey__film--video"
            data-ready={hasFrame}
            src="/media/hub.mp4"
            poster="/media/hub-inicio.webp"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            onLoadedData={() => { setHasFrame(true); onReady() }}
            onPlaying={() => setPaused(false)}
            onPause={() => setPaused(true)}
            onSeeked={() => {
              // Some WebKit media backends pause when the native loop seeks to zero.
              // Restore playback intent, while preserving an explicit user pause.
              const video = videoRef.current
              if (active && !pauseRequested.current && video?.paused) {
                video.play().catch(() => setPaused(true))
              }
            }}
            onError={() => { setFailed(true); onReady() }}
          />
        )}
      </div>
      <header className="journey__header">
        <h1 className="journey__title" ref={titleRef} tabIndex={-1}>Tu viaje, en tres formas</h1>
        <p className="journey__subtitle">Conóceme, inspírate y empieza<br />a crear tu próxima historia.</p>
      </header>
      <ol className="journey__choices" role="list">
        <li className="journey__choice">
          <span className="journey__number" aria-hidden="true">01</span>
          <h2 className="journey__choice-title">Quién<br />soy</h2>
        </li>
        <li className="journey__choice">
          <span className="journey__number" aria-hidden="true">02</span>
          <h2 className="journey__choice-title">Biblioteca<br />de viajes</h2>
        </li>
        <li className="journey__choice">
          <span className="journey__number" aria-hidden="true">03</span>
          <h2 className="journey__choice-title">Crear<br />mi viaje</h2>
        </li>
      </ol>
      <footer className="journey__controls">
        <button className="text-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Volver a la portada
        </button>
        {!showStatic && (
          <button className="text-button" onClick={togglePlayback}>
            {paused ? 'Reproducir fondo' : 'Pausar fondo'}
          </button>
        )}
      </footer>
    </main>
  )
}
