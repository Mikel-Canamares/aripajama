import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { COMPLETE_HASH, CREATE_ROOT, DETAILS_HASH, EMAIL_HASH, QUESTION_ROOT, TRIP_QUESTIONS, firstPending, loadTripDraft, questionHash, resetTripDraft, safeCreateHash } from '../data/questionnaire'
import { tripDetailsErrors } from '../data/trip-request'
import { useTripRequest } from '../hooks/useTripRequest'
import { revealEntry } from '../hooks/useRevealSequence'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { CreateTripScreen } from './CreateTripScreen'
import { QuestionnaireScreen } from './QuestionnaireScreen'
import { TripDetailsScreen, TripEmailScreen, TripReceiptScreen } from './TripFinalScreens'
import '../questionnaire.css'

export type CreatePosition = { scroll: number; focus?: string }

export function CreateTripFlow({ active, onReady, onBack }: { active: boolean; onReady: () => void; onBack: () => void }) {
  const [draft] = useState(loadTripDraft)
  const [answers, setAnswers] = useState(draft.answers)
  const [route, setRoute] = useState(() => {
    const hash = safeCreateHash(window.location.hash, draft.answers, draft)
    if (hash !== window.location.hash) history.replaceState({ ...history.state }, '', hash)
    return { hash, entry: revealEntry(), position: undefined as CreatePosition | undefined }
  })
  const [pending, setPending] = useState<typeof route | null>(null)
  const [stage, setStage] = useState<'idle' | 'out' | 'in'>('idle')
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const isLanding = route.hash === CREATE_ROOT
  const isDetails = route.hash === DETAILS_HASH
  const isEmail = route.hash === EMAIL_HASH
  const completed = route.hash === COMPLETE_HASH
  const step = isLanding ? 0 : completed || isDetails || isEmail ? 10 : Number(route.hash.slice(QUESTION_ROOT.length)) - 1
  const request = useTripRequest({ draft, answers, step, active: active && stage === 'idle', completed, onSaved: () => { if (isEmail) navigate(COMPLETE_HASH, 'trip-email-submit') } })
  const { form } = request

  function remember(sourceId?: string) {
    const focus = sourceId || (document.activeElement as HTMLElement | null)?.id
    history.replaceState({ ...history.state, createPosition: { scroll: window.scrollY, focus } }, '')
  }

  function navigate(hash: string, sourceId?: string, replace = false) {
    if (!active || stage !== 'idle' || request.locked.current || hash === route.hash) return
    remember(sourceId)
    const state = { createFromHub: history.state?.createFromHub, createDepth: (history.state?.createDepth || 0) + (replace ? 0 : 1), createPrevious: route.hash }
    if (replace) history.replaceState(state, '', hash)
    else history.pushState(state, '', hash)
    setPending({ hash, entry: revealEntry(), position: hash === CREATE_ROOT ? { scroll: 0, focus: 'create-trip-discover' } : undefined })
    setStage('out')
  }

  function back() {
    if (!active || stage !== 'idle' || request.locked.current) return
    if (isLanding) { onBack(); return }
    const previous = completed ? EMAIL_HASH : isEmail ? DETAILS_HASH : isDetails ? questionHash(9) : step === 0 ? CREATE_ROOT : questionHash(step - 1)
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
      const hash = safeCreateHash(window.location.hash, answers, form)
      if (hash !== window.location.hash) history.replaceState({ ...history.state, createPosition: undefined }, '', hash)
      const position = history.state?.createPosition as CreatePosition | undefined
      setPending({ hash, entry: revealEntry(), position: position || (hash === CREATE_ROOT && route.hash !== CREATE_ROOT ? { scroll: 0, focus: 'create-trip-discover' } : undefined) })
      setStage('out')
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onPop) }
  }, [answers, route.hash, form])

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

  function openDetails(source: string) {
    if (!form.details.company && answers.company?.length === 1 && ['couple','family','friends','solo'].includes(answers.company[0])) request.edit({ details: { ...form.details, company: answers.company[0] } })
    navigate(DETAILS_HASH, source)
  }
  const common = { active: active && stage === 'idle', onReady, onBack: back, position: route.position, entry: route.entry }
  const verification = { generation: request.generation, token: request.token, onToken: request.onToken, onRefreshVerification: request.refreshVerification }
  return <div ref={rootRef} className="create-flow" data-stage={stage} inert={stage !== 'idle'} aria-hidden={stage !== 'idle'}>
    {isLanding ? <CreateTripScreen {...common} onDiscover={() => {
      const next = firstPending(answers)
      if (next >= 0) navigate(questionHash(next), 'create-trip-discover')
      else if (Object.keys(tripDetailsErrors(form.details)).length) openDetails('create-trip-discover')
      else navigate(form.receipt ? COMPLETE_HASH : EMAIL_HASH, 'create-trip-discover')
    }} /> : isDetails ? <TripDetailsScreen key={route.entry} {...common} details={form.details} onChange={details => request.edit({ details })} onContinue={() => navigate(EMAIL_HASH, 'trip-details-continue')} />
      : isEmail ? <TripEmailScreen key={route.entry} {...common} {...verification} busy={request.busy} email={form.email} consent={form.consent} onEmail={email => request.edit({ email })} onConsent={consent => request.edit({ consent })} onSubmit={() => void request.submit()} error={request.error} />
      : completed && form.receipt ? <TripReceiptScreen key={route.entry} {...common} {...verification} busy={request.busy} receipt={form.receipt} email={form.email} error={request.error} onRetry={() => void request.submit(true)} onCheck={() => { void request.checkStatus() }} onReview={() => navigate(questionHash(0), 'question-review')} onLanding={() => navigate(CREATE_ROOT, 'question-landing')} onRestart={() => { if (request.locked.current) return; resetTripDraft(); setAnswers({}); request.reset(); navigate(questionHash(0), 'question-restart') }} />
      : <QuestionnaireScreen key={route.entry} {...common} step={step} completed={false} answers={answers} onSelect={(id, selected) => { setAnswers(current => ({ ...current, [id]: selected })); request.edit({}) }} onContinue={() => step === 9 ? openDetails('question-continue') : navigate(questionHash(step + 1), 'question-continue')} onReview={() => {}} onLanding={() => {}} onRestart={() => {}} total={TRIP_QUESTIONS.length} />}
  </div>
}
