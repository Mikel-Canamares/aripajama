import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ANSWER_MAP, calcularPerfil, mapCurrentAnswers, PROFILE_IDS, PROFILE_MAXIMA, PROFILE_QUESTIONS } from '../profiles.ts'
import { canonicalAnswers, currentAnswers } from './helpers.ts'

test('matriz completa: 52 opciones y seis máximos teóricos del PDF', () => {
  assert.equal(Object.values(PROFILE_QUESTIONS).reduce((sum,q) => sum + Object.keys(q.options).length,0),52)
  assert.equal(Object.values(ANSWER_MAP).reduce((sum,q) => sum + Object.keys(q.options).length,0),52)
  assert.deepEqual(PROFILE_MAXIMA,{ explorador:45,cultural:40.5,aventurero:35.5,contemplativo:48,espiritu_libre:20,gastronomico:38 })
  assert.deepEqual(mapCurrentAnswers(currentAnswers()),canonicalAnswers())
})
const samples = {
  explorador: {},
  cultural: { q1:['culturas'],q2:['ciudades'],q6:['cultura'],q8:['urbano'] },
  aventurero: { q1:['aventuras'],q2:['aventura'],q4:['activo'],q5:['naturaleza'],q8:['desafios'] },
  contemplativo: { q1:['relax'],q2:['playa'],q4:['tranquilo'],q6:['relax'],q8:['playa'] },
  espiritu_libre: { q4:['flexible'],q6:['fotografia'],q8:['menos_transitados'],q10:['sin_planes'] },
  gastronomico: { q1:['gastronomia'],q2:['gastronomia'],q6:['gastronomia'],q9:['esencial'] },
}
for (const id of PROFILE_IDS) test(`perfil alcanzable: ${id}`, () => {
  const result = calcularPerfil({ ...canonicalAnswers(),...samples[id] })
  assert.equal(result.principal,id)
  assert.equal(result.version,'1.0.0')
  for (const score of Object.values(result.puntuaciones)) assert.ok(score >= 0 && score <= 100)
})
test('promedia multiselección incluyendo opciones con cero, sin premiar marcar más', () => {
  const result = calcularPerfil({ ...canonicalAnswers(), q1:['culturas','gastronomia'], q5:['locales','encanto','practicos'] })
  assert.equal(result.aportaciones.q1.cultural,6)
  assert.equal(result.aportaciones.q1.gastronomico,6)
  assert.equal(result.aportaciones.q5.cultural,1/6)
})
test('naturaleza sola no habilita aventura y gastronomía aislada no sustituye naturaleza consistente', () => {
  const result = calcularPerfil({ ...canonicalAnswers(),q9:['esencial'] })
  assert.equal(result.principal,'explorador')
  assert.equal(result.elegibles.aventurero,false)
  assert.equal(result.elegibles.gastronomico,true)
})
test('compañía y transporte no alteran puntuaciones, ni convierten viajar solo en Espíritu Libre', () => {
  const original = calcularPerfil(canonicalAnswers())
  const changed = calcularPerfil({ ...canonicalAnswers(),q3:['solitario','amigos'],q7:['avion','a_pie'] })
  assert.deepEqual(changed.puntuaciones,original.puntuaciones)
  assert.equal(changed.elegibles.espiritu_libre,false)
})
test('otras prioridades excluye gastronomía y conserva avisos sin penalizar ritmos mixtos', () => {
  const result = calcularPerfil({ ...canonicalAnswers(),q1:['gastronomia'],q4:['activo','tranquilo','flexible'],q10:['organizado'] })
  assert.equal(result.elegibles.gastronomico,false)
  assert.deepEqual(result.avisos,['gastronomia_con_otras_prioridades','ritmo_variable','flexibilidad_con_planificacion'])
})
test('empate real utiliza la aportación normalizada de 01 sin redondear', () => {
  const result = calcularPerfil({ q1:['culturas'],q2:['playa','aventura'],q3:['pareja'],q4:['tranquilo','activo','relajado'],q5:['encanto','practicos'],q6:['gastronomia','grupo','fotografia'],q7:['coche','autocaravana'],q8:['naturales','menos_transitados','desafios'],q9:['otras_prioridades'],q10:['organizado'] })
  assert.ok(Math.abs(result.margen!) < 1e-9)
  assert.equal(result.principal,'cultural')
  assert.equal(result.secundario,'explorador')
  assert.equal(result.resultadoOrientativo,true)
})
test('un único elegible no inventa secundario ni margen; el orden de casillas no influye', () => {
  const result = calcularPerfil(canonicalAnswers())
  assert.equal(result.secundario,null)
  assert.equal(result.margen,null)
  assert.equal(result.resultadoOrientativo,false)
  const mixed = { ...canonicalAnswers(),q1:['culturas','naturaleza','aventuras'],q5:['locales','naturaleza'] }
  assert.deepEqual(calcularPerfil(mixed),calcularPerfil({ ...mixed,q1:[...mixed.q1].reverse(),q5:[...mixed.q5].reverse() }))
})
test('los umbrales de 35 puntos y dos preguntas son estrictos, y una sola señal sigue siendo orientativa', () => {
  const broad = { ...canonicalAnswers(),q1:Object.keys(PROFILE_QUESTIONS.q1.options),q2:Object.keys(PROFILE_QUESTIONS.q2.options),q4:['tranquilo','flexible'],q6:['grupo'],q8:Object.keys(PROFILE_QUESTIONS.q8.options),q10:['organizado_libertad'] }
  const boundary = calcularPerfil(broad)
  assert.equal(boundary.principal,'espiritu_libre')
  assert.equal(boundary.puntuaciones.espiritu_libre,35)
  assert.equal(boundary.preguntasPositivas.espiritu_libre,2)
  assert.equal(boundary.resultadoOrientativo,false)
  const isolated = calcularPerfil({ ...broad,q4:['equilibrado'],q10:['sin_planes'] })
  assert.equal(isolated.principal,'espiritu_libre')
  assert.equal(isolated.preguntasPositivas.espiritu_libre,1)
  assert.equal(isolated.resultadoOrientativo,true)
  const low = calcularPerfil({ ...canonicalAnswers(),q1:['gastronomia'],q2:['gastronomia'],q6:['grupo'],q8:['menos_transitados'] })
  assert.equal(low.secundario,null)
  assert.ok(low.puntuaciones.explorador < 35)
  assert.equal(low.resultadoOrientativo,true)
})
for (const [name, patch] of Object.entries({ vacía:{}, desconocida:{ ...canonicalAnswers(),q1:['inventada'] }, duplicada:{ ...canonicalAnswers(),q1:['naturaleza','naturaleza'] }, radio_multiple:{ ...canonicalAnswers(),q9:['esencial','local'] }, ausente:{ ...canonicalAnswers(),q2:[] }, extra:{ ...canonicalAnswers(),q11:['x'] } })) {
  test(`rechaza respuesta ${name}`, () => assert.throws(() => calcularPerfil(patch),{ code:'INVALID_ANSWERS' }))
}
test('rechaza claves heredadas y estructuras inesperadas del formulario existente', () => {
  assert.throws(() => mapCurrentAnswers({ ...currentAnswers(),motivation:['__proto__'] }),{ code:'INVALID_ANSWERS' })
  assert.throws(() => mapCurrentAnswers({ ...currentAnswers(),food:'other' }),{ code:'INVALID_ANSWERS' })
})
