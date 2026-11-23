import { useEffect, useRef, useState } from 'react'
import { saveTripDraft, type DraftExtra, type RequestIdentity, type TripAnswers } from '../data/questionnaire'
import { emptyTripDetails, isTripReceipt, type TripReceipt } from '../data/trip-request'

function identity(): RequestIdentity {
  const random = (size: number) => [...crypto.getRandomValues(new Uint8Array(size))].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return { id: random(16), token: random(32) }
}
async function api(requestId: string, url: string, options: RequestInit): Promise<TripReceipt> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || !isTripReceipt(data, requestId)) throw new Error(data.code || 'SERVICE_UNAVAILABLE')
    return data
  } finally { clearTimeout(timer) }
}
function message(code: string) {
  if (code === 'TOO_MANY_REQUESTS') return 'Se han realizado varios intentos. Espera un momento antes de volver a intentarlo.'
  if (code === 'REQUEST_CONFLICT') return 'Estos datos no coinciden con el intento anterior. Revisa el formulario antes de continuar.'
  return 'No hemos podido confirmar el registro de tu solicitud. Tus datos siguen en esta pestaña; puedes volver a intentarlo.'
}
export function useTripRequest({ draft, answers, step, active, onSaved }: {
  draft: DraftExtra; answers: TripAnswers; step: number; active: boolean; onSaved: () => void
}) {
  const [form, setForm] = useState<DraftExtra>({ details: draft.details, request: draft.request, receipt: draft.receipt })
  const latest = useRef(form)
  latest.current = form
  const savedCallback = useRef(onSaved)
  savedCallback.current = onSaved
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { saveTripDraft(answers, step, form) }, [answers, step, form])
  function edit(value: Partial<DraftExtra>) { setForm(current => ({ ...current, ...value, request: null, receipt: null })); setError('') }
  function apply(result: TripReceipt, request: RequestIdentity) {
    setForm(current => current.request?.id === request.id ? { ...current, receipt: result } : current)
  }
  async function checkStatus(request = latest.current.request) {
    if (!request) return null
    try {
      const result = await api(request.id, `/api/trip-requests/${request.id}`, { headers: { Authorization: `Bearer ${request.token}` } })
      apply(result, request)
      return result
    } catch { return null }
  }
  async function submit() {
    if (!active || locked.current) return
    locked.current = true; setBusy(true); setError('')
    const request = form.request || identity()
    const prepared = { ...form, request }
    latest.current = prepared
    setForm(prepared)
    saveTripDraft(answers, step, prepared)
    let result: TripReceipt | null = null
    try {
      if (form.request) result = await checkStatus(request)
      if (!result) {
        result = await api(request.id, '/api/trip-requests', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: request.id, retryToken: request.token, answers, details: form.details, website: '' }),
        })
        apply(result, request)
      }
    } catch (failure) {
      result = await checkStatus(request)
      if (!result) setError(message(failure instanceof Error ? failure.message : 'SERVICE_UNAVAILABLE'))
    } finally { locked.current = false; setBusy(false) }
    if (result && latest.current.request?.id === request.id) savedCallback.current()
  }
  return { form, edit, busy, locked, error, submit,
    reset: () => { setForm({ details: emptyTripDetails(), request: null, receipt: null }); setError('') } }
}
