export const TRAVEL_COMPANIES = [
  { id: 'couple', label: 'En pareja' }, { id: 'family', label: 'En familia' },
  { id: 'friends', label: 'Con amigos' }, { id: 'solo', label: 'En solitario' },
  { id: 'other', label: 'Otro tipo de viaje' }, { id: 'unknown', label: 'Aún por definir' },
]
export type TripDetails = {
  destination: string; destinationUnknown: boolean
  days: string; daysUnknown: boolean
  season: string; seasonUnknown: boolean
  company: string; budget: string; budgetUnknown: boolean; needs: string
}
export const emptyTripDetails = (): TripDetails => ({ destination: '', destinationUnknown: false, days: '', daysUnknown: false, season: '', seasonUnknown: false, company: '', budget: '', budgetUnknown: false, needs: '' })
export function tripDetailsErrors(input: TripDetails): Partial<Record<keyof TripDetails, string>> {
  const errors: Partial<Record<keyof TripDetails, string>> = {}
  if (!input.destinationUnknown && (!input.destination.trim() || input.destination.length > 250)) errors.destination = 'Indica un destino o selecciona «Aún por definir».'
  if (!input.daysUnknown && (!/^\d+$/.test(input.days) || Number(input.days) < 1 || Number(input.days) > 10000)) errors.days = 'Indica una duración válida en días o selecciona «Aún por definir».'
  if (!input.seasonUnknown && (!input.season.trim() || input.season.length > 250)) errors.season = 'Indica cuándo te gustaría viajar o selecciona «Aún por definir».'
  if (!TRAVEL_COMPANIES.some(option => option.id === input.company)) errors.company = 'Selecciona el tipo de viaje.'
  if (!input.budgetUnknown && (!/^\d+(?:[.,]\d{1,2})?$/.test(input.budget) || Number(input.budget.replace(',', '.')) <= 0 || Number(input.budget.replace(',', '.')) > 10000000)) errors.budget = 'Indica un presupuesto válido en euros por persona o selecciona «Aún por definir».'
  if (input.needs.length > 1500) errors.needs = 'Resume las otras necesidades en un máximo de 1500 caracteres.'
  return errors
}
export function normalizeTripDetails(input: unknown): TripDetails {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_DETAILS')
  const raw = input as Record<string, unknown>
  const expected = emptyTripDetails()
  if (Object.keys(raw).length !== Object.keys(expected).length || Object.keys(raw).some(key => !Object.hasOwn(expected, key))) throw new Error('INVALID_DETAILS')
  for (const [key, value] of Object.entries(expected)) if (typeof raw[key] !== typeof value) throw new Error('INVALID_DETAILS')
  const data = { ...raw } as TripDetails
  for (const key of ['destination', 'days', 'season', 'company', 'budget', 'needs'] as const) data[key] = data[key].trim()
  if (data.destinationUnknown) data.destination = ''
  if (data.daysUnknown) data.days = ''
  if (data.seasonUnknown) data.season = ''
  if (data.budgetUnknown) data.budget = ''
  else data.budget = data.budget.replace(',', '.')
  if (Object.keys(tripDetailsErrors(data)).length) throw new Error('INVALID_DETAILS')
  return data
}
export const validEmail = (value: string) => value.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value)
export type EmailStatus = 'pending' | 'sending' | 'accepted' | 'failed' | 'unconfigured' | 'review_required' | 'simulated'
export type TripReceipt = { requestId: string; saved: true; emailStatus: EmailStatus; canRetry: boolean; errorCode?: string; retryAfterSeconds?: number }
