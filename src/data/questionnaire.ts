export type TripQuestion = {
  id: string
  title: string
  mode: 'multiple' | 'single'
  options: { id: string; title: string; description?: string }[]
}

export const TRIP_QUESTIONS: TripQuestion[] = [
  { id: 'motivation', title: '¿Qué te mueve a viajar?', mode: 'multiple', options: [
    { id: 'culture', title: 'Descubrir culturas' },
    { id: 'nature', title: 'Conectar con la naturaleza' },
    { id: 'adventure', title: 'Vivir aventuras' },
    { id: 'relax', title: 'Desconectar y relajarme' },
    { id: 'food', title: 'Disfrutar de la gastronomía' },
  ] },
  { id: 'destinations', title: '¿Qué tipo de destinos te atraen más?', mode: 'multiple', options: [
    { id: 'cities', title: 'Ciudades', description: 'Historia, cultura, arte y vida local.' },
    { id: 'nature', title: 'Naturaleza', description: 'Montañas, parques naturales y paisajes únicos.' },
    { id: 'beach', title: 'Playa y relax', description: 'Mar, descanso y entornos paradisíacos.' },
    { id: 'adventure', title: 'Aventura', description: 'Experiencias activas, rutas y nuevos desafíos.' },
    { id: 'food', title: 'Gastronomía', description: 'Descubrir destinos a través de su comida.' },
  ] },
  { id: 'company', title: '¿Cómo prefieres viajar?', mode: 'multiple', options: [
    { id: 'couple', title: 'En pareja', description: 'Compartir experiencias y crear recuerdos juntos.' },
    { id: 'friends', title: 'Con amigos', description: 'Vivir nuevas aventuras en buena compañía.' },
    { id: 'family', title: 'En familia', description: 'Descubrir el mundo a todas las edades.' },
    { id: 'solo', title: 'En solitario', description: 'A mi ritmo y con total libertad.' },
    { id: 'depends', title: 'Según el viaje', description: 'Depende del destino y la experiencia.' },
  ] },
  { id: 'pace', title: '¿Qué ritmo de viaje prefieres?', mode: 'multiple', options: [
    { id: 'calm', title: 'Tranquilo', description: 'Sin prisas, con tiempo para disfrutar cada lugar.' },
    { id: 'active', title: 'Activo', description: 'Aprovechar al máximo el tiempo y ver mucho.' },
    { id: 'balanced', title: 'Equilibrado', description: 'Combinar visitas, descanso y experiencias.' },
    { id: 'relaxed', title: 'Relajado', description: 'Disfrutar sin horarios fijos, con momentos de descanso.' },
    { id: 'flexible', title: 'Flexible', description: 'Me adapto según el destino y lo que surja.' },
  ] },
  { id: 'accommodation', title: '¿Qué tipo de alojamientos te gustan más?', mode: 'multiple', options: [
    { id: 'hotels', title: 'Hoteles con encanto', description: 'Comodidad, buena ubicación y un toque especial.' },
    { id: 'local', title: 'Alojamientos locales', description: 'Casas, apartamentos y estancias con personalidad.' },
    { id: 'unique', title: 'Alojamientos singulares', description: 'Riads, ryokans, casas rurales o experiencias únicas.' },
    { id: 'nature', title: 'Naturaleza y aventura', description: 'Cabañas, eco-lodges o campamentos.' },
    { id: 'practical', title: 'Opciones prácticas', description: 'Alojamientos sencillos y funcionales.' },
  ] },
  { id: 'activities', title: '¿Qué actividades disfrutas más en un viaje?', mode: 'multiple', options: [
    { id: 'culture', title: 'Visitas culturales', description: 'Conocer la historia, templos, museos y la vida local.' },
    { id: 'nature', title: 'Naturaleza', description: 'Senderismo, paisajes, parques naturales y vida al aire libre.' },
    { id: 'food', title: 'Gastronomía', description: 'Descubrir la cocina local y nuevas experiencias culinarias.' },
    { id: 'wellness', title: 'Relax y bienestar', description: 'Disfrutar de tiempo para mí, desconectar y recargar energía.' },
    { id: 'group', title: 'Actividades en grupo', description: 'Compartir experiencias y conocer gente.' },
    { id: 'photography', title: 'Fotografía', description: 'Capturar lugares, paisajes y momentos únicos.' },
  ] },
  { id: 'transport', title: '¿Qué medio de transporte prefieres en tus viajes?', mode: 'multiple', options: [
    { id: 'plane', title: 'Avión', description: 'Llegar lejos y aprovechar el tiempo al máximo.' },
    { id: 'train', title: 'Tren', description: 'Disfrutar del trayecto y del paisaje.' },
    { id: 'car', title: 'Coche', description: 'Tener libertad para explorar a mi ritmo.' },
    { id: 'camper', title: 'Autocaravana', description: 'Viajar con libertad y sentirme más cerca de la naturaleza.' },
    { id: 'boat', title: 'Barco', description: 'Descubrir destinos desde otra perspectiva.' },
    { id: 'walk', title: 'A pie', description: 'Explorar sin prisa y descubrir cada rincón.' },
  ] },
  { id: 'environment', title: '¿Qué ambiente te motiva más al viajar?', mode: 'multiple', options: [
    { id: 'urban', title: 'Ambiente urbano', description: 'Ciudades, cultura, vida local y ambiente animado.' },
    { id: 'nature', title: 'Entornos naturales', description: 'Montañas, bosques, paisajes impresionantes y tranquilidad.' },
    { id: 'warm', title: 'Clima cálido y playa', description: 'Mar, calas, islas y días más relajados.' },
    { id: 'quiet', title: 'Lugares menos transitados', description: 'Destinos auténticos, fuera de las rutas más turísticas.' },
    { id: 'challenge', title: 'Nuevos desafíos', description: 'Experiencias diferentes, aventura y salir de mi zona de confort.' },
  ] },
  { id: 'food', title: '¿Qué importancia tiene para ti la gastronomía en un viaje?', mode: 'single', options: [
    { id: 'essential', title: 'Es una parte esencial', description: 'Elijo destinos también por su gastronomía.' },
    { id: 'local', title: 'Me gusta descubrir la comida local', description: 'Suelo probar platos típicos y productos de la zona.' },
    { id: 'complement', title: 'Es un complemento', description: 'Disfruto de la gastronomía, pero no es un factor decisivo.' },
    { id: 'other', title: 'Prefiero otras prioridades', description: 'Me interesa más la naturaleza, la cultura, la aventura u otros aspectos del viaje.' },
    { id: 'cooking', title: 'Me encanta cocinar y vivir experiencias culinarias', description: 'Me atraen mercados, clases de cocina, catas o experiencias gastronómicas especiales.' },
  ] },
  { id: 'planning', title: '¿Cuánto te gusta llevar preparado antes de viajar?', mode: 'single', options: [
    { id: 'organized', title: 'Todo bien organizado', description: 'Me gusta tener cada día planificado, con reservas y horarios.' },
    { id: 'freedom', title: 'Organizado, pero con libertad', description: 'Quiero tener una ruta clara y dejar momentos para improvisar.' },
    { id: 'essential', title: 'Solo lo imprescindible', description: 'Prefiero reservar lo necesario y decidir el resto sobre la marcha.' },
    { id: 'spontaneous', title: 'Aventura sin demasiados planes', description: 'Me gusta dejarme llevar y descubrir sobre la marcha.' },
    { id: 'depends', title: 'Depende del destino', description: 'Hay viajes que requieren más planificación que otros.' },
  ] },
]

export type TripAnswers = Record<string, string[]>
export const DRAFT_KEY = 'aripajama:create-trip:v1'
export const CREATE_ROOT = '#crear-mi-viaje'
export const QUESTION_ROOT = `${CREATE_ROOT}/cuestionario/`
export const questionHash = (index: number) => `${QUESTION_ROOT}${index + 1}`
export const COMPLETE_HASH = `${QUESTION_ROOT}completado`
type Draft = { version: 1; answers: TripAnswers; step: number }
// Retain the same fallback even when returning to the module with storage blocked.
let memoryDraft: Draft = { version: 1, answers: {}, step: 0 }

export function loadTripDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return memoryDraft
    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object' || draft.version !== 1 || !Number.isInteger(draft.step) || draft.step < 0 || draft.step > 10 || !draft.answers || typeof draft.answers !== 'object' || Array.isArray(draft.answers)) throw new Error('Invalid draft')
    const answers: TripAnswers = {}
    for (const [id, values] of Object.entries(draft.answers)) {
      const question = TRIP_QUESTIONS.find(item => item.id === id)
      if (!question || !Array.isArray(values) || values.some(value => typeof value !== 'string' || !question.options.some(option => option.id === value)) || new Set(values).size !== values.length || (question.mode === 'single' && values.length > 1)) throw new Error('Invalid answers')
      answers[id] = values
    }
    memoryDraft = { version: 1, answers, step: draft.step }
  } catch (error) {
    // An unavailable store keeps the memory fallback; corrupt data starts clean.
    if (error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('Invalid'))) {
      memoryDraft = { version: 1, answers: {}, step: 0 }
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* Unavailable store. */ }
    }
  }
  return memoryDraft
}

export function saveTripDraft(answers: TripAnswers, step: number) {
  memoryDraft = { version: 1, answers, step }
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(memoryDraft)) } catch { /* Continue in memory. */ }
}

export function resetTripDraft() {
  memoryDraft = { version: 1, answers: {}, step: 0 }
  try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* Continue in memory. */ }
}

export function firstPending(answers: TripAnswers) {
  return TRIP_QUESTIONS.findIndex(question => !answers[question.id]?.length)
}

export function safeCreateHash(hash: string, answers: TripAnswers): string {
  if (hash === CREATE_ROOT) return hash
  const pending = firstPending(answers)
  if (hash === COMPLETE_HASH) return pending < 0 ? hash : questionHash(pending)
  const match = hash.match(/^#crear-mi-viaje\/cuestionario\/([1-9]|10)$/)
  if (!match) return CREATE_ROOT
  const index = Number(match[1]) - 1
  return pending >= 0 && index > pending ? questionHash(pending) : hash
}
