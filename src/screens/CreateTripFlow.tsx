import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { COMPLETE_HASH, CREATE_ROOT, QUESTION_ROOT, TRIP_QUESTIONS, firstPending, loadTripDraft, questionHash, resetTripDraft, safeCreateHash, saveTripDraft } from '../data/questionnaire'
import { revealEntry } from '../hooks/useRevealSequence'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { CreateTripScreen } from './CreateTripScreen'
import { QuestionnaireScreen } from './QuestionnaireScreen'
import '../questionnaire.css'

export type CreatePosition = { scroll: number; focus?: string }

export function CreateTripFlow({ active, onReady, onBack }: { active: boolean; onReady: () => void; onBack: () => void }) {
  const [draft] = useState(loadTripDraft)
  const [answers, setAnswers] = useState(draft.answers)
  const [route, setRoute] = useState(() => {
    const hash = safeCreateHash(window.location.hash, draft.answers)
    if (hash !== window.location.hash) history.replaceState({ ...history.state }, '', hash)
    return { hash, entry: revealEntry(), position: undefined as CreatePosition | undefined }
  })
  const [pending, setPending] = useState<typeof route | null>(null)
  const [stage, setStage] = useState<'idle' | 'out' | 'in'>('idle')
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const isLanding = route.hash === CREATE_ROOT
  const completed = route.hash === COMPLETE_HASH
  const step = isLanding ? 0 : completed ? 10 : Number(route.hash.slice(QUESTION_ROOT.length)) - 1

  useEffect(() => { saveTripDraft(answers, step) }, [answers, step])

  function remember(sourceId?: string) {
    const focus = sourceId || (document.activeElement as HTMLElement | null)?.id
    history.replaceState({ ...history.state, createPosition: { scroll: window.scrollY, focus } }, '')
  }

  function navigate(hash: string, sourceId?: string, replace = false) {
    if (!active || stage !== 'idle' || hash === route.hash) return
    remember(sourceId)
    const state = { createFromHub: history.state?.createFromHub, createDepth: (history.state?.createDepth || 0) + (replace ? 0 : 1), createPrevious: route.hash }
    if (replace) history.replaceState(state, '', hash)
    else history.pushState(state, '', hash)
    setPending({ hash, entry: revealEntry(), position: hash === CREATE_ROOT ? { scroll: 0, focus: 'create-trip-discover' } : undefined })
    setStage('out')
  }

  function back() {
    if (!active || stage !== 'idle') return
    if (isLanding) { onBack(); return }
    const previous = completed ? questionHash(9) : step === 0 ? CREATE_ROOT : questionHash(step - 1)
    if (history.state?.createDepth > 0 && history.state?.createPrevious === previous) history.back()
    else navigate(previous, undefined, true)
  }

  useEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => { history.scrollRestoration = previous }
  }, [])

  useEffect(() => {
    if (!active || stage !== 'idle') return
    let frame = 0
    const save = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => remember()) }
    window.addEventListener('scroll', save, { passive: true })
    rootRef.current?.addEventListener('focusin', save)
    const root = rootRef.current
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', save); root?.removeEventListener('focusin', save) }
  }, [active, stage, route])

  useEffect(() => {
    const onPop = () => {
      if (!/^#crear-mi-viaje(?:\/|$)/.test(window.location.hash)) return
      const hash = safeCreateHash(window.location.hash, answers)
      if (hash !== window.location.hash) history.replaceState({ ...history.state, createPosition: undefined }, '', hash)
      const position = history.state?.createPosition as CreatePosition | undefined
      setPending({ hash, entry: revealEntry(), position: position || (hash === CREATE_ROOT && route.hash !== CREATE_ROOT ? { scroll: 0, focus: 'create-trip-discover' } : undefined) })
      setStage('out')
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop) }
  }, [answers, route.hash])

  useEffect(() => {
    if (stage === 'idle') return
    const timer = window.setTimeout(() => {
      if (stage === 'out' && pending) { setRoute(pending); setPending(null); setStage('in') }
      else setStage('idle')
    }, reducedMotion ? 0 : stage === 'out' ? 160 : 420)
    return () => window.clearTimeout(timer)
  }, [stage, pending, reducedMotion])

  useLayoutEffect(() => {
    if (stage === 'in') window.scrollTo(0, route.position?.scroll || 0)
  }, [stage, route])

  useEffect(() => {
    if (!active || isLanding || stage !== 'idle') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return <div ref={rootRef} className="create-flow" data-stage={stage} inert={stage !== 'idle'} aria-hidden={stage !== 'idle'}>
    {isLanding ? <CreateTripScreen active={active && stage === 'idle'} onReady={onReady} onBack={back} position={route.position} entry={route.entry} onDiscover={() => {
      const next = firstPending(answers)
      navigate(next < 0 ? COMPLETE_HASH : questionHash(next), 'create-trip-discover')
    }} /> : <QuestionnaireScreen key={route.entry} active={active && stage === 'idle'} onReady={onReady} step={step} completed={completed} answers={answers} entry={route.entry} position={route.position} onBack={back} onSelect={(id, selected) => setAnswers(current => ({ ...current, [id]: selected }))} onContinue={() => navigate(step === 9 ? COMPLETE_HASH : questionHash(step + 1), 'question-continue')} onReview={() => navigate(questionHash(0), 'question-review')} onLanding={() => navigate(CREATE_ROOT, 'question-landing')} onRestart={() => {
      if (!active || stage !== 'idle') return
      resetTripDraft()
      setAnswers({})
      navigate(questionHash(0), 'question-restart')
    }} total={TRIP_QUESTIONS.length} />}
  </div>
}
