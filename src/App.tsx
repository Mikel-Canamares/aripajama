import { useCallback, useEffect, useState } from 'react'
import { useReducedMotion } from './hooks/useReducedMotion'
import { IntroScreen } from './screens/IntroScreen'
import { JourneyScreen } from './screens/JourneyScreen'

export function App() {
  const [phase, setPhase] = useState<'intro' | 'preparing' | 'entering' | 'journey' | 'returning'>('intro')
  const [hubReady, setHubReady] = useState(false)
  const reducedMotion = useReducedMotion()
  const handleHubReady = useCallback(() => setHubReady(true), [])

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
          <JourneyScreen
            active={phase === 'journey'}
            onReady={handleHubReady}
            onBack={() => setPhase('returning')}
          />
        </div>
      )}
    </div>
  )
}
