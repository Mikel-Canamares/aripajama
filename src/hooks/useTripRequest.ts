import { useCallback, useEffect, useRef, useState } from 'react'
import { saveTripDraft, type DraftExtra, type RequestIdentity, type TripAnswers } from '../data/questionnaire'
import { emptyTripDetails, type TripReceipt } from '../data/trip-request'

function identity(): RequestIdentity {
  const random = (size: number) => [...crypto.getRandomValues(new Uint8Array(size))].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return { id: random(16), token: random(32) }
}
async function api(url: string, options: RequestInit): Promise<TripReceipt> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.saved !== true) throw new Error(data.code || 'SERVICE_UNAVAILABLE')
    return data as TripReceipt
  } finally { clearTimeout(timer) }
}
function message(code: string) {
  if (code === 'TOO_MANY_REQUESTS') return 'Se han realizado varios intentos. Espera un momento antes de volver a intentarlo.'
  if (code.startsWith('VERIFICATION')) return 'No se ha podido completar la verificación. Vuelve a intentarlo; tus datos siguen en esta pestaña.'
  if (code === 'REQUEST_CONFLICT') return 'Estos datos no coinciden con el intento anterior. Revisa el formulario antes de continuar.'
  if (code === 'INVALID_EMAIL') return 'Revisa tu dirección de email.'
  return 'No hemos podido confirmar el registro de tu solicitud. Tus datos siguen en esta pestaña; puedes volver a intentarlo.'
}
export function useTripRequest({ draft, answers, step, active, completed, onSaved }: {
  draft: DraftExtra; answers: TripAnswers; step: number; active: boolean; completed: boolean; onSaved: () => void
}) {
  const [form, setForm] = useState<DraftExtra>({ details: draft.details, email: draft.email, consent: draft.consent, request: draft.request, receipt: draft.receipt })
  const latest = useRef(form)
  latest.current = form
  const savedCallback = useRef(onSaved)
  savedCallback.current = onSaved
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [generation, setGeneration] = useState(0)
  const [token, setToken] = useState('')
  const onToken = useCallback((value: string) => setToken(value), [])
  const refreshVerification = () => { setToken(''); setGeneration(current => current + 1) }
  useEffect(() => { saveTripDraft(answers, step, form) }, [answers, step, form])
  function edit(value: Partial<DraftExtra>) { setForm(current => ({ ...current, ...value, request: null, receipt: null })); setError('') }
  function apply(result: TripReceipt, request: RequestIdentity) {
    setForm(current => current.request?.id === request.id ? { ...current, receipt: result } : current)
  }
  async function checkStatus(request = latest.current.request) {
    if (!request) return null
    try {
      const result = await api(`/api/trip-requests/${request.id}`, { headers: { Authorization: `Bearer ${request.token}` } })
      apply(result, request)
      return result
    } catch { return null }
  }
  async function submit(retry = false) {
    if (!active || locked.current || !token) return
    locked.current = true; setBusy(true); setError('')
    const request = form.request || identity()
    const prepared = { ...form, request }
    latest.current = prepared
    setForm(prepared)
    saveTripDraft(answers, step, prepared)
    let result: TripReceipt | null = null
    try {
      result = await api(retry ? `/api/trip-requests/${request.id}/retry-email` : '/api/trip-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(retry ? { Authorization: `Bearer ${request.token}` } : {}) },
        body: JSON.stringify(retry ? { turnstileToken: token } : { requestId: request.id, retryToken: request.token, answers, details: form.details, email: form.email, consent: form.consent, turnstileToken: token, website: '' }),
      })
      apply(result, request)
    } catch (failure) {
      result = await checkStatus(request)
      if (!result) setError(message(failure instanceof Error ? failure.message : 'SERVICE_UNAVAILABLE'))
    } finally { locked.current = false; setBusy(false); refreshVerification() }
    if (result && latest.current.request?.id === request.id) savedCallback.current()
  }
  useEffect(() => {
    if (completed && active && form.request) void checkStatus()
  }, [completed, active, form.request?.id])
  useEffect(() => {
    if (!completed || !active || !form.receipt || !['pending','sending'].includes(form.receipt.emailStatus)) return
    let count = 0
    const timer = setInterval(() => { if (++count > 30) clearInterval(timer); else void checkStatus() }, 2000)
    return () => clearInterval(timer)
  }, [completed, active, form.receipt?.emailStatus, form.request?.id])
  useEffect(() => {
    if (!completed || !active || !form.receipt?.retryAfterSeconds) return
    const timer = setTimeout(() => { void checkStatus() }, form.receipt.retryAfterSeconds * 1000 + 100)
    return () => clearTimeout(timer)
  }, [completed, active, form.receipt?.retryAfterSeconds, form.request?.id])
  return { form, edit, busy, locked, error, generation, token, onToken, refreshVerification, submit,
    checkStatus: async () => { const result = await checkStatus(); if (!result) setError('No hemos podido comprobar el estado del correo. Tu solicitud anterior se conserva.'); return result },
    reset: () => { setForm({ details: emptyTripDetails(), email: '', consent: false, request: null, receipt: null }); setError('') } }
}
