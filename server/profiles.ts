export const PROFILE_IDS = ['explorador', 'cultural', 'aventurero', 'contemplativo', 'espiritu_libre', 'gastronomico'] as const
export type ProfileId = typeof PROFILE_IDS[number]
type Vector = readonly [number, number, number, number, number, number]
type Question = { weight: number; single?: boolean; options: Record<string, Vector> }
const zero: Vector = [0, 0, 0, 0, 0, 0]
export const ALGORITHM_VERSION = '1.0.0'
export const PROFILE_TITLES: Record<ProfileId, string> = {
  explorador: 'El Explorador', cultural: 'El Cultural', aventurero: 'El Aventurero',
  contemplativo: 'El Contemplativo', espiritu_libre: 'El Espíritu Libre', gastronomico: 'El Gastronómico',
}

// PDF v1.0.0, columns E / C / A / T / L / G. Server-only configuration.
export const PROFILE_QUESTIONS: Record<string, Question> = {
  q1: { weight: 3, options: { culturas: [1,4,0,0,0,0], naturaleza: [4,0,0,1,0,0], aventuras: [1,0,4,0,0,0], relax: [0,0,0,4,0,0], gastronomia: [0,0,0,0,0,4] } },
  q2: { weight: 2, options: { ciudades: [1,4,0,0,0,0], naturaleza: [4,0,0,1,0,0], playa: [0,0,0,4,0,0], aventura: [1,0,4,0,0,0], gastronomia: [0,0,0,0,0,4] } },
  q3: { weight: 0, options: { pareja: zero, amigos: zero, familia: zero, solitario: zero, segun_viaje: zero } },
  q4: { weight: 2, options: { tranquilo: [0,0,0,4,0,0], activo: [2,0,2,0,0,0], equilibrado: [2,0,0,1,0,0], relajado: [0,0,0,4,1,0], flexible: [1,0,0,0,4,0] } },
  q5: { weight: .5, options: { encanto: zero, locales: [2,1,0,0,0,0], singulares: [2,1,0,0,0,0], naturaleza: [2,0,1,0,0,0], practicos: zero } },
  q6: { weight: 3, options: { cultura: [1,4,0,0,0,0], naturaleza: [4,0,1,1,0,0], gastronomia: [0,0,0,0,0,4], relax: [0,0,0,4,0,0], grupo: zero, fotografia: [2,0,0,0,0,0] } },
  q7: { weight: 0, options: { avion: zero, tren: zero, coche: zero, autocaravana: zero, barco: zero, a_pie: zero } },
  q8: { weight: 2, options: { urbano: [1,4,0,0,0,0], naturales: [4,0,0,2,0,0], playa: [0,0,0,4,0,0], menos_transitados: [4,0,0,0,0,0], desafios: [1,0,4,0,0,0] } },
  q9: { weight: 1.5, single: true, options: { esencial: [0,0,0,0,0,4], local: [0,0,0,0,0,2], complemento: [0,0,0,0,0,.5], otras_prioridades: zero, cocinar: [0,0,0,0,0,4] } },
  q10: { weight: 3, single: true, options: { organizado: zero, organizado_libertad: [0,0,0,0,1,0], imprescindible: [0,0,0,0,4,0], sin_planes: [0,0,0,0,4,0], depende: [0,0,0,0,1,0] } },
}

export class InvalidAnswers extends Error {
  readonly code = 'INVALID_ANSWERS'
  constructor() { super('Las diez respuestas deben ser válidas y estar completas.') }
}
export type CanonicalAnswers = Record<string, string[]>
export function validateCanonicalAnswers(input: unknown): CanonicalAnswers {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InvalidAnswers()
  const data = input as Record<string, unknown>
  if (Object.keys(data).length !== 10 || Object.keys(data).some(id => !Object.hasOwn(PROFILE_QUESTIONS, id))) throw new InvalidAnswers()
  const result: CanonicalAnswers = {}
  for (const [id, question] of Object.entries(PROFILE_QUESTIONS)) {
    const values = data[id]
    if (!Array.isArray(values) || !values.length || (question.single && values.length !== 1) || new Set(values).size !== values.length || values.some(value => typeof value !== 'string' || !Object.hasOwn(question.options, value))) throw new InvalidAnswers()
    result[id] = Object.keys(question.options).filter(option => values.includes(option))
  }
  return result
}

export const PROFILE_MAXIMA = Object.fromEntries(PROFILE_IDS.map((id, column) => [id,
  Object.values(PROFILE_QUESTIONS).reduce((sum, question) => sum + question.weight * Math.max(...Object.values(question.options).map(vector => vector[column])), 0),
])) as Record<ProfileId, number>

export function calcularPerfil(input: unknown) {
  const respuestas = validateCanonicalAnswers(input)
  const has = (q: string, ...options: string[]) => options.some(option => respuestas[q].includes(option))
  const aportaciones = Object.fromEntries(Object.entries(PROFILE_QUESTIONS).map(([q, question]) => [q,
    Object.fromEntries(PROFILE_IDS.map((id, column) => [id, question.weight * respuestas[q].reduce((sum, option) => sum + question.options[option][column], 0) / respuestas[q].length])) as Record<ProfileId, number>,
  ]))
  const puntuaciones = Object.fromEntries(PROFILE_IDS.map(id => [id, 100 * Object.values(aportaciones).reduce((sum, values) => sum + values[id], 0) / PROFILE_MAXIMA[id]])) as Record<ProfileId, number>
  const preguntasPositivas = Object.fromEntries(PROFILE_IDS.map(id => [id, Object.values(aportaciones).filter(values => values[id] > 0).length])) as Record<ProfileId, number>
  const foodInterest = has('q1', 'gastronomia') || has('q2', 'gastronomia') || has('q6', 'gastronomia')
  const elegibles: Record<ProfileId, boolean> = {
    explorador: true,
    cultural: has('q1', 'culturas') || has('q2', 'ciudades') || has('q6', 'cultura') || has('q8', 'urbano'),
    aventurero: has('q1', 'aventuras') || has('q2', 'aventura') || has('q8', 'desafios'),
    contemplativo: has('q1', 'relax') || has('q2', 'playa') || has('q4', 'tranquilo', 'relajado') || has('q6', 'relax') || has('q8', 'playa'),
    espiritu_libre: has('q4', 'flexible') || has('q10', 'imprescindible', 'sin_planes'),
    gastronomico: !has('q9', 'otras_prioridades') && (foodInterest || has('q9', 'esencial', 'cocinar')),
  }
  const avisos: string[] = []
  if (foodInterest && has('q9', 'otras_prioridades')) avisos.push('gastronomia_con_otras_prioridades')
  if (has('q4', 'activo') && has('q4', 'tranquilo', 'relajado')) avisos.push('ritmo_variable')
  if (has('q4', 'flexible') && has('q10', 'organizado')) avisos.push('flexibilidad_con_planificacion')
  const compare = (a: number, b: number) => Math.abs(a - b) <= 1e-9 ? 0 : b - a
  const ranking = PROFILE_IDS.filter(id => elegibles[id]).sort((a, b) => {
    let difference = compare(puntuaciones[a], puntuaciones[b])
    if (difference) return difference
    for (const q of ['q1','q6','q10','q8','q2','q4','q9','q5']) {
      difference = compare(aportaciones[q][a] / PROFILE_MAXIMA[a], aportaciones[q][b] / PROFILE_MAXIMA[b])
      if (difference) return difference
    }
    return preguntasPositivas[b] - preguntasPositivas[a] || PROFILE_IDS.indexOf(a) - PROFILE_IDS.indexOf(b)
  })
  const principal = ranking[0]
  const secundario = ranking[1] || null
  const margen = secundario ? puntuaciones[principal] - puntuaciones[secundario] : null
  return { version: ALGORITHM_VERSION, principal, titulo: PROFILE_TITLES[principal], secundario, puntuaciones, elegibles, margen,
    resultadoOrientativo: puntuaciones[principal] < 35 || preguntasPositivas[principal] < 2 || (margen !== null && margen < 5),
    aportaciones, preguntasPositivas, respuestas, avisos }
}

// Explicit stable mapping: never infer option meaning from button order or labels.
export const ANSWER_MAP: Record<string, { id: string; options: Record<string, string> }> = {
  motivation: { id: 'q1', options: { culture:'culturas', nature:'naturaleza', adventure:'aventuras', relax:'relax', food:'gastronomia' } },
  destinations: { id:'q2', options: { cities:'ciudades', nature:'naturaleza', beach:'playa', adventure:'aventura', food:'gastronomia' } },
  company: { id:'q3', options: { couple:'pareja', friends:'amigos', family:'familia', solo:'solitario', depends:'segun_viaje' } },
  pace: { id:'q4', options: { calm:'tranquilo', active:'activo', balanced:'equilibrado', relaxed:'relajado', flexible:'flexible' } },
  accommodation: { id:'q5', options: { hotels:'encanto', local:'locales', unique:'singulares', nature:'naturaleza', practical:'practicos' } },
  activities: { id:'q6', options: { culture:'cultura', nature:'naturaleza', food:'gastronomia', wellness:'relax', group:'grupo', photography:'fotografia' } },
  transport: { id:'q7', options: { plane:'avion', train:'tren', car:'coche', camper:'autocaravana', boat:'barco', walk:'a_pie' } },
  environment: { id:'q8', options: { urban:'urbano', nature:'naturales', warm:'playa', quiet:'menos_transitados', challenge:'desafios' } },
  food: { id:'q9', options: { essential:'esencial', local:'local', complement:'complemento', other:'otras_prioridades', cooking:'cocinar' } },
  planning: { id:'q10', options: { organized:'organizado', freedom:'organizado_libertad', essential:'imprescindible', spontaneous:'sin_planes', depends:'depende' } },
}
export function mapCurrentAnswers(input: unknown): CanonicalAnswers {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 10) throw new InvalidAnswers()
  const result: CanonicalAnswers = {}
  for (const [id, values] of Object.entries(input)) {
    const mapping = Object.hasOwn(ANSWER_MAP, id) && ANSWER_MAP[id]
    if (!mapping || !Array.isArray(values) || values.some(value => typeof value !== 'string' || !Object.hasOwn(mapping.options, value))) throw new InvalidAnswers()
    result[mapping.id] = values.map(value => mapping.options[value])
  }
  return validateCanonicalAnswers(result)
}
