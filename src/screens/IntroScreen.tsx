import { useEffect, useRef, useState } from 'react'
import { Brand } from '../components/Brand'
import { useReducedMotion } from '../hooks/useReducedMotion'

// Time relative to the actual media clock, not time since page load.
const REVEAL_AT = 1

export function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [buttonReady, setButtonReady] = useState(false)
  const showStatic = reducedMotion || videoFailed
  const showImmediately = showStatic || videoEnded
  const showComposition = revealed || showImmediately

  const playVideo = () => {
    const video = videoRef.current
    if (!video) return
    setBlocked(false)
    video.play().catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') setBlocked(true)
    })
  }

  useEffect(() => {
    if (showImmediately) return
    const video = videoRef.current
    if (!video) return
    let active = true
    video.play().catch((error: unknown) => {
      if (active && (!(error instanceof DOMException) || error.name !== 'AbortError')) setBlocked(true)
    })
    return () => { active = false }
  }, [showImmediately])

  const syncReveal = () => {
    const video = videoRef.current
    if (video && video.currentTime >= REVEAL_AT) {
      setRevealed(true)
    }
  }

  return (
    <main
      className="intro screen"
      data-revealed={showComposition}
      data-immediate={showImmediately}
      aria-label="Bienvenido a Aripajama"
    >
      <div className="intro__media" aria-hidden="true">
        {showStatic ? (
          <img className="intro__film" src="/media/portada-final.webp" width="720" height="1280" alt="" />
        ) : (
          <video
            ref={videoRef}
            className="intro__film"
            src="/media/portada.mp4"
            poster="/media/portada-inicio.webp"
            autoPlay
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            onTimeUpdate={syncReveal}
            onPlaying={() => setBlocked(false)}
            onEnded={() => setVideoEnded(true)}
            onError={() => { setVideoFailed(true); setBlocked(false) }}
          />
        )}
      </div>

      <div className="intro__composition" inert={!showComposition} aria-hidden={!showComposition}>
        <Brand animated />
        <h1 className="intro__headline">
          <span className="intro__headline-first reveal-item">El mundo,</span>
          <span className="intro__headline-second reveal-item">a tu manera.</span>
        </h1>
        <p className="intro__tagline reveal-item">Viajes diseñados contigo.</p>
        <div
          className="intro__action reveal-item"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setButtonReady(true)
          }}
        >
          <button
            className="button button--board"
            onClick={onEnter}
            disabled={!(buttonReady || showImmediately)}
          >
            <span>Subir a bordo</span>
            <svg className="button__arrow" viewBox="0 0 32 16" fill="none" aria-hidden="true">
              <path d="M1 8h28M23 1l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {blocked && !showComposition && (
        <div className="intro__playback" role="group" aria-label="Reproducción de la introducción">
          <button className="button button--play" onClick={playVideo}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m7 4 9 6-9 6V4Z" /></svg>
            Reproducir introducción
          </button>
          <button className="text-button" onClick={() => setVideoFailed(true)}>Ir a la portada</button>
        </div>
      )}
    </main>
  )
}
