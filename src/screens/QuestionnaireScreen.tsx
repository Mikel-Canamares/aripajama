import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TRIP_QUESTIONS, type TripAnswers } from '../data/questionnaire'
import { useRevealSequence } from '../hooks/useRevealSequence'
import type { CreatePosition } from './CreateTripFlow'

type Props = {
  active: boolean; onReady: () => void; step: number; total: number; completed: boolean
  answers: TripAnswers; entry: string; position?: CreatePosition
  onBack: () => void; onSelect: (id: string, selected: string[]) => void
  onContinue: () => void; onReview: () => void; onLanding: () => void; onRestart: () => void
}

export function QuestionnaireScreen({ active, onReady, step, total, completed, answers, entry, position, onBack, onSelect, onContinue, onReview, onLanding, onRestart }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const fieldRef = useRef<HTMLFieldSetElement>(null)
  const [error, setError] = useState(false)
  const [background, setBackground] = useState<'loading' | 'ready' | 'error'>('loading')
  const question = TRIP_QUESTIONS[Math.min(step, 9)]
  const selected = answers[question.id] || []
  const first = step === 0 && !completed
  const tones = step === 8 ? [2, 1, 3, 4, 2] : step === 5 ? [0, 1, 2, 3, 2, 4] : [0, 1, 2, 3, 4, 5]

  useLayoutEffect(() => {
    if (!active) return
    window.scrollTo(0, position?.scroll || 0)
  }, [active, position])
  useRevealSequence(rootRef, active, `questionnaire:${entry}`)
  useEffect(() => {
    if (!active) return
    const target = position?.focus ? document.getElementById(position.focus) : null
    ;(target || titleRef.current)?.focus({ preventScroll: true })
  }, [active, position])
  useEffect(() => {
    if (background !== 'loading') { onReady(); return }
    const timer = window.setTimeout(() => setBackground('error'), 3000)
    return () => window.clearTimeout(timer)
  }, [background, onReady])

  return <main className="questionnaire screen" data-question={completed ? 'complete' : step + 1} data-first={first} data-background={background}>
    <img key={step} className={`questionnaire__art ${first ? 'questionnaire__art--globe' : ''}`} src={`/media/questionnaire/${first ? 'globe' : `q${Math.min(step + 1, 10)}-header`}.webp`} width={first ? 411 : 701} height={first ? 600 : 185} alt="" onError={event => { event.currentTarget.hidden = true; setBackground('error') }} onLoad={async event => {
      try { await event.currentTarget.decode(); await document.fonts.ready; setBackground('ready') } catch { setBackground('error') }
    }} />
    <img className="questionnaire__footer-art" src="/media/questionnaire/footer.webp" width="941" height="127" alt="" onError={event => { event.currentTarget.hidden = true }} />
    <div ref={rootRef} className="questionnaire__content" data-reveal-scope="">
      <button id="question-back" className="create-trip__back" onClick={onBack}><span aria-hidden="true">←</span> Volver</button>
      {completed ? <section className="questionnaire__complete" data-reveal-group="">
        <p data-reveal="complete-kicker" className="questionnaire__eyebrow">Tu forma de viajar</p>
        <h1 data-reveal="complete-title" ref={titleRef} id="question-title" tabIndex={-1}>Has completado las 10 preguntas.</h1>
        <span data-reveal="complete-rule" className="create-trip__rule" aria-hidden="true" />
        <p data-reveal="complete-copy">Tus respuestas se conservan en esta pestaña. La siguiente fase estará disponible próximamente.</p>
        <div className="questionnaire__complete-actions">
          <button data-reveal="review" id="question-review" className="questionnaire__continue" onClick={onReview}>Revisar respuestas <span aria-hidden="true">→</span></button>
          <button data-reveal="landing" id="question-landing" className="questionnaire__secondary" onClick={onLanding}>Volver a Crear mi viaje</button>
          <button data-reveal="restart" id="question-restart" className="questionnaire__secondary" onClick={onRestart}>Empezar de nuevo</button>
        </div>
      </section> : <>
        {first && <header className="questionnaire__intro" data-reveal-group="">
          <h2 data-reveal="intro-title">Todo viaje<br />empieza<br />con una idea.</h2>
          <span data-reveal="intro-rule" className="create-trip__rule" aria-hidden="true" />
          <p data-reveal="intro-copy">Antes de diseñar tu viaje, quiero conocer un poco más sobre ti y cómo te gusta descubrir el mundo.</p>
        </header>}
        <div className="questionnaire__progress">
          <p data-reveal="counter" aria-hidden="true">{String(step + 1).padStart(2, '0')} / {total}</p>
          <progress data-reveal="progress" max={total} value={step + 1} aria-label={`Pregunta ${step + 1} de ${total}`} />
        </div>
        <form noValidate onSubmit={event => {
          event.preventDefault()
          if (!selected.length) { setError(true); fieldRef.current?.focus({ preventScroll: true }); return }
          onContinue()
        }}>
          <header className="questionnaire__heading" data-reveal-group="">
            <p data-reveal="eyebrow" className="questionnaire__eyebrow"><span aria-hidden="true" />Tu forma de viajar<span aria-hidden="true" /></p>
            <h1 data-reveal="question-title" ref={titleRef} id="question-title" tabIndex={-1}>{question.title}</h1>
            <p data-reveal="help" id="question-help">{question.mode === 'single' ? 'Puedes elegir una opción.' : step === 7 ? 'Puedes elegir una opción o varias.' : 'Puedes elegir una o varias opciones.'}</p>
          </header>
          <fieldset ref={fieldRef} id="question-options" className={`questionnaire__options ${first ? 'questionnaire__options--circles' : ''}`} tabIndex={-1} aria-labelledby="question-title" aria-describedby={`question-help${error ? ' question-error' : ''}`} aria-invalid={error || undefined}>
            <legend className="visually-hidden">{question.title}</legend>
            {question.options.map((option, index) => {
              const checked = selected.includes(option.id)
              const optionId = `answer-${question.id}-${option.id}`
              const tone = tones[index]
              return <label key={option.id} htmlFor={optionId} className={`questionnaire__option questionnaire__option--tone-${tone}`} data-selected={checked} data-reveal={`option-${option.id}`} data-reveal-frame="" data-reveal-group="">
                <input id={optionId} type={question.mode === 'single' ? 'radio' : 'checkbox'} name={question.id} checked={checked} aria-labelledby={`${optionId}-title`} aria-describedby={option.description ? `${optionId}-description` : undefined} onChange={() => {
                  onSelect(question.id, question.mode === 'single' ? [option.id] : checked ? selected.filter(id => id !== option.id) : [...selected, option.id])
                  setError(false)
                }} />
                <img data-reveal={`icon-${option.id}`} className="questionnaire__icon" src={`/media/questionnaire/q${step + 1}-${index + 1}-icon.webp`} alt="" width="116" height="116" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />
                <span className="questionnaire__copy">
                  <span data-reveal={`title-${option.id}`} id={`${optionId}-title`} className="questionnaire__option-title">{option.title}</span>
                  {option.description && <span data-reveal={`description-${option.id}`} id={`${optionId}-description`} className="questionnaire__description">{option.description}</span>}
                </span>
                {!first && <img data-reveal={`scene-${option.id}`} className="questionnaire__scene" src={`/media/questionnaire/q${step + 1}-${index + 1}-scene.webp`} width="208" height="165" alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden' }} />}
                <span data-reveal={`indicator-${option.id}`} className="questionnaire__indicator" aria-hidden="true">{checked ? '✓' : ''}</span>
              </label>
            })}
          </fieldset>
          <p className="questionnaire__error" id="question-error" role="alert">{error ? 'Selecciona al menos una opción para continuar' : ''}</p>
          <button data-reveal="continue" id="question-continue" className="questionnaire__continue" type="submit">Continuar <span aria-hidden="true">⟶</span></button>
        </form>
      </>}
    </div>
  </main>
}
