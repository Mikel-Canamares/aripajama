import { TRIP_QUESTIONS } from './questionnaire-content.ts'
export { TRIP_QUESTIONS, type TripQuestion } from './questionnaire-content.ts'

import { emptyTripDetails, tripDetailsErrors, validEmail, type TripDetails, type TripReceipt } from './trip-request'
export type TripAnswers = Record<string, string[]>
export const DRAFT_KEY = 'aripajama:create-trip:v2'
const LEGACY_DRAFT_KEY = 'aripajama:create-trip:v1'
export const CREATE_ROOT = '#crear-mi-viaje'
export const QUESTION_ROOT = `${CREATE_ROOT}/cuestionario/`
export const questionHash = (index: number) => `${QUESTION_ROOT}${index + 1}`
export const COMPLETE_HASH = `${QUESTION_ROOT}completado`
export const DETAILS_HASH = `${QUESTION_ROOT}detalles`
export const EMAIL_HASH = `${QUESTION_ROOT}email`
export type RequestIdentity = { id: string; token: string }
export type DraftExtra = { details: TripDetails; email: string; consent: boolean; request: RequestIdentity | null; receipt: TripReceipt | null }
export type Draft = DraftExtra & { version: 2; answers: TripAnswers; step: number }
const blankDraft = (): Draft => ({ version: 2, answers: {}, step: 0, details: emptyTripDetails(), email: '', consent: false, request: null, receipt: null })
// Retain the same fallback even when returning to the module with storage blocked.
let memoryDraft: Draft = blankDraft()

export function loadTripDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY) || sessionStorage.getItem(LEGACY_DRAFT_KEY)
    if (!raw) return memoryDraft
    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object' || ![1, 2].includes(draft.version) || !Number.isInteger(draft.step) || draft.step < 0 || draft.step > 10 || !draft.answers || typeof draft.answers !== 'object' || Array.isArray(draft.answers)) throw new Error('Invalid draft')
    const answers: TripAnswers = {}
    for (const [id, values] of Object.entries(draft.answers)) {
      const question = TRIP_QUESTIONS.find(item => item.id === id)
      if (!question || !Array.isArray(values) || values.some(value => typeof value !== 'string' || !question.options.some(option => option.id === value)) || new Set(values).size !== values.length || (question.mode === 'single' && values.length > 1)) throw new Error('Invalid answers')
      answers[id] = values
    }
    const extra = blankDraft()
    if (draft.version === 2) {
      if (draft.details && Object.entries(extra.details).every(([key, value]) => typeof draft.details[key] === typeof value)) extra.details = draft.details
      if (typeof draft.email === 'string' && draft.email.length <= 254) extra.email = draft.email
      extra.consent = draft.consent === true
      if (draft.request && /^[a-zA-Z0-9_-]{20,80}$/.test(draft.request.id) && /^[a-zA-Z0-9_-]{40,128}$/.test(draft.request.token)) extra.request = draft.request
      if (extra.request && draft.receipt?.saved === true && draft.receipt.requestId === extra.request.id && ['pending','sending','accepted','failed','unconfigured','review_required','simulated'].includes(draft.receipt.emailStatus)) extra.receipt = draft.receipt
    }
    memoryDraft = { ...extra, answers, step: draft.step }
  } catch (error) {
    // An unavailable store keeps the memory fallback; corrupt data starts clean.
    if (error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('Invalid'))) {
      memoryDraft = blankDraft()
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* Unavailable store. */ }
    }
  }
  return memoryDraft
}

export function saveTripDraft(answers: TripAnswers, step: number, extra?: DraftExtra) {
  memoryDraft = { ...memoryDraft, ...extra, version: 2, answers, step }
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(memoryDraft)); sessionStorage.removeItem(LEGACY_DRAFT_KEY) } catch { /* Continue in memory. */ }
}

export function resetTripDraft() {
  memoryDraft = blankDraft()
  try { sessionStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(LEGACY_DRAFT_KEY) } catch { /* Continue in memory. */ }
}

export function firstPending(answers: TripAnswers) {
  return TRIP_QUESTIONS.findIndex(question => !answers[question.id]?.length)
}

export function safeCreateHash(hash: string, answers: TripAnswers, extra?: DraftExtra): string {
  if (hash === CREATE_ROOT) return hash
  const pending = firstPending(answers)
  if ([DETAILS_HASH, EMAIL_HASH, COMPLETE_HASH].includes(hash)) {
    if (pending >= 0) return questionHash(pending)
    if (hash === DETAILS_HASH) return hash
    if (!extra || Object.keys(tripDetailsErrors(extra.details)).length) return DETAILS_HASH
    if (hash === COMPLETE_HASH && (!extra.receipt || !validEmail(extra.email) || !extra.consent)) return EMAIL_HASH
    return hash
  }
  const match = hash.match(/^#crear-mi-viaje\/cuestionario\/([1-9]|10)$/)
  if (!match) return CREATE_ROOT
  const index = Number(match[1]) - 1
  return pending >= 0 && index > pending ? questionHash(pending) : hash
}
