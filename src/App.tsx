import { useState } from 'react'
import { IntroScreen } from './screens/IntroScreen'
import { JourneyScreen } from './screens/JourneyScreen'

export function App() {
  const [screen, setScreen] = useState<'intro' | 'journey'>('intro')

  return screen === 'intro'
    ? <IntroScreen onEnter={() => setScreen('journey')} />
    : <JourneyScreen onBack={() => setScreen('intro')} />
}
