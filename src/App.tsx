import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useReducedMotion } from './hooks/useReducedMotion'
import { IntroScreen } from './screens/IntroScreen'
import { JourneyScreen } from './screens/JourneyScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { CreateTripFlow } from './screens/CreateTripFlow'

type Destination = 'library' | 'create'

function readDestination(): Destination | null {
  if (window.location.hash.startsWith('#biblioteca')) return 'library'
  if (/^#crear-mi-viaje(?:\/|$)/.test(window.location.hash)) return 'create'
  return null
}

export function App() {
  const [phase, setPhase] = useState<'intro' | 'preparing' | 'entering' | 'journey' | 'returning'>(() => readDestination() ? 'journey' : 'intro')
  const [hubReady, setHubReady] = useState(false)
  const [navigation, setNavigation] = useState<'hub' | 'preparing' | 'entering' | Destination | 'returning'>(() => readDestination() || 'hub')
  const [destination, setDestination] = useState<Destination>(() => readDestination() || 'library')
  const [destinationReady, setDestinationReady] = useState(false)
  const [exitScroll, setExitScroll] = useState(0)
  const [restoreFocus, setRestoreFocus] = useState<Destination | null>(null)
  const reducedMotion = useReducedMotion()
  const handleHubReady = useCallback(() => setHubReady(true), [])
  const handleDestinationReady = useCallback(() => setDestinationReady(true), [])

  useEffect(() => {
    const handlePop = () => {
      const next = readDestination()
      if (next) {
        if (navigation === 'hub' || next !== destination) {
          setPhase('journey')
          setDestination(next)
          setDestinationReady(false)
          setNavigation('preparing')
        } else if (navigation === 'returning') setNavigation(next)
      } else if (navigation === 'library' || navigation === 'create' || navigation === 'preparing' || navigation === 'entering') {
        setExitScroll(window.scrollY)
        setRestoreFocus(destination)
        setNavigation(navigation === 'preparing' ? 'hub' : 'returning')
      }
    }
    window.addEventListener('popstate', handlePop)
    window.addEventListener('hashchange', handlePop)
    return () => { window.removeEventListener('popstate', handlePop); window.removeEventListener('hashchange', handlePop) }
  }, [navigation, destination])

  useEffect(() => {
    if (navigation !== 'preparing' || !destinationReady) return
    let nextFrame = 0
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => setNavigation(current => current === 'preparing' ? 'entering' : current))
    })
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame) }
  }, [navigation, destinationReady])

  useLayoutEffect(() => {
    if (navigation === 'returning') window.scrollTo(0, 0)
  }, [navigation])

  useEffect(() => {
    if (navigation !== 'entering' && navigation !== 'returning') return
    // Also settle when animationend is interrupted or the preference changes mid-flight.
    const timer = window.setTimeout(() => {
      setNavigation(navigation === 'entering' ? destination : 'hub')
    }, reducedMotion ? 0 : 1100)
    return () => window.clearTimeout(timer)
  }, [navigation, reducedMotion, destination])

  useEffect(() => {
    if (phase !== 'preparing' || !hubReady) return
    // Paint the prepared screen at opacity zero before starting the crossfade.
    let nextFrame = 0
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => setPhase('entering'))
    })
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame) }
  }, [phase, hubReady])

  useEffect(() => {
    if (!reducedMotion || (phase !== 'entering' && phase !== 'returning')) return
    const timer = window.setTimeout(() => {
      setPhase(phase === 'entering' ? 'journey' : 'intro')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [phase, reducedMotion])

  const introActive = phase === 'intro' || phase === 'preparing'

  function openDestination(next: Destination) {
    if (navigation !== 'hub') return
    setDestination(next)
    setDestinationReady(false)
    setRestoreFocus(null)
    history.pushState(next === 'library' ? { libraryDepth: 0 } : { createFromHub: true }, '', next === 'library' ? '#biblioteca' : '#crear-mi-viaje')
    setNavigation('preparing')
  }

  function returnToHub() {
    if (navigation !== destination) return
    // A hub entry belongs to this app; direct visits have a safe local fallback.
    if (destination === 'create' && history.state?.createFromHub) {
      history.go(-((history.state?.createDepth || 0) + 1))
      return
    }
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setExitScroll(window.scrollY)
    setRestoreFocus(destination)
    setNavigation('returning')
  }

  return (
    <div className="experience" data-phase={phase}>
      {phase !== 'journey' && (
        <div className="experience__layer experience__intro" inert={!introActive} aria-hidden={!introActive}>
          <IntroScreen onEnter={() => {
            if (phase !== 'intro') return
            setHubReady(false)
            setPhase('preparing')
          }} />
        </div>
      )}
      {phase !== 'intro' && (
        <div
          className="experience__layer experience__journey"
          inert={phase !== 'journey'}
          aria-hidden={phase !== 'journey'}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || event.propertyName !== 'opacity') return
            setPhase((current) => current === 'entering' ? 'journey' : current === 'returning' ? 'intro' : current)
          }}
        >
          <div className="navigation" data-navigation={navigation}>
          <div
            className="navigation__hub"
            hidden={navigation === 'library' || navigation === 'create'}
            inert={navigation !== 'hub' && navigation !== 'preparing'}
            aria-hidden={navigation !== 'hub' && navigation !== 'preparing'}
            onAnimationEnd={event => {
              if (event.target === event.currentTarget && event.animationName === 'hub-arrive') {
                setNavigation(current => current === 'returning' ? 'hub' : current)
              }
            }}
          >
            <JourneyScreen
              active={phase === 'journey' && (navigation === 'hub' || navigation === 'preparing')}
              restoreFocus={restoreFocus}
              onReady={handleHubReady}
              onBack={() => {
                if (navigation === 'preparing') { history.replaceState(null, '', window.location.pathname + window.location.search); setNavigation('hub'); return }
                setRestoreFocus(null)
                setPhase('returning')
              }}
              onOpenLibrary={() => openDestination('library')}
              onOpenCreate={() => openDestination('create')}
            />
          </div>
          {navigation !== 'hub' && <div
            className={`navigation__destination navigation__${destination}`}
            inert={navigation !== destination}
            aria-hidden={navigation !== destination}
            style={{ top: navigation === 'returning' ? -exitScroll : undefined }}
            onAnimationEnd={event => {
              if (event.target === event.currentTarget && event.animationName === 'library-arrive') {
                setNavigation(current => current === 'entering' ? destination : current)
              }
            }}
          >
            {destination === 'library'
              ? <LibraryScreen active={navigation === 'library'} onReady={handleDestinationReady} onBack={returnToHub} />
              : <CreateTripFlow active={navigation === 'create'} onReady={handleDestinationReady} onBack={returnToHub} />}
          </div>}
          </div>
        </div>
      )}
    </div>
  )
}
