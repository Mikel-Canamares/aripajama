import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useReducedMotion } from './hooks/useReducedMotion'
import { IntroScreen } from './screens/IntroScreen'
import { JourneyScreen } from './screens/JourneyScreen'
import { LibraryScreen } from './screens/LibraryScreen'

export function App() {
  const [phase, setPhase] = useState<'intro' | 'preparing' | 'entering' | 'journey' | 'returning'>(() => window.location.hash.startsWith('#biblioteca') ? 'journey' : 'intro')
  const [hubReady, setHubReady] = useState(false)
  const [navigation, setNavigation] = useState<'hub' | 'preparing' | 'entering' | 'library' | 'returning'>(() => window.location.hash.startsWith('#biblioteca') ? 'library' : 'hub')
  const [libraryReady, setLibraryReady] = useState(false)
  const [exitScroll, setExitScroll] = useState(0)
  const [restoreLibraryFocus, setRestoreLibraryFocus] = useState(false)
  const reducedMotion = useReducedMotion()
  const handleHubReady = useCallback(() => setHubReady(true), [])
  const handleLibraryReady = useCallback(() => setLibraryReady(true), [])

  useEffect(() => {
    const handlePop = () => {
      if (window.location.hash.startsWith('#biblioteca')) {
        if (navigation === 'hub') {
          setPhase('journey')
          setLibraryReady(false)
          setNavigation('preparing')
        } else if (navigation === 'returning') setNavigation('library')
      } else if (navigation === 'library' || navigation === 'preparing' || navigation === 'entering') {
        setExitScroll(window.scrollY)
        setRestoreLibraryFocus(true)
        setNavigation(navigation === 'preparing' ? 'hub' : 'returning')
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [navigation])

  useEffect(() => {
    if (navigation !== 'preparing' || !libraryReady) return
    let nextFrame = 0
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => setNavigation(current => current === 'preparing' ? 'entering' : current))
    })
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame) }
  }, [navigation, libraryReady])

  useLayoutEffect(() => {
    if (navigation === 'returning') window.scrollTo(0, 0)
  }, [navigation])

  useEffect(() => {
    if (navigation !== 'entering' && navigation !== 'returning') return
    // Also settle when animationend is interrupted or the preference changes mid-flight.
    const timer = window.setTimeout(() => {
      setNavigation(navigation === 'entering' ? 'library' : 'hub')
    }, reducedMotion ? 0 : 1100)
    return () => window.clearTimeout(timer)
  }, [navigation, reducedMotion])

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
            hidden={navigation === 'library'}
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
              restoreLibraryFocus={restoreLibraryFocus}
              onReady={handleHubReady}
              onBack={() => {
                if (navigation === 'preparing') { history.replaceState(null, '', window.location.pathname + window.location.search); setNavigation('hub'); return }
                setRestoreLibraryFocus(false)
                setPhase('returning')
              }}
              onOpenLibrary={() => {
                if (navigation !== 'hub') return
                setLibraryReady(false)
                setRestoreLibraryFocus(false)
                history.pushState({ libraryDepth: 0 }, '', '#biblioteca')
                setNavigation('preparing')
              }}
            />
          </div>
          {navigation !== 'hub' && <div
            className="navigation__library"
            inert={navigation !== 'library'}
            aria-hidden={navigation !== 'library'}
            style={{ top: navigation === 'returning' ? -exitScroll : undefined }}
            onAnimationEnd={event => {
              if (event.target === event.currentTarget && event.animationName === 'library-arrive') {
                setNavigation(current => current === 'entering' ? 'library' : current)
              }
            }}
          >
            <LibraryScreen active={navigation === 'library'} onReady={handleLibraryReady} onBack={() => {
              if (navigation !== 'library') return
              history.replaceState(null, '', window.location.pathname + window.location.search)
              setExitScroll(window.scrollY)
              setRestoreLibraryFocus(true)
              setNavigation('returning')
            }} />
          </div>}
          </div>
        </div>
      )}
    </div>
  )
}
