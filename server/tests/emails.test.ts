import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROFILE_IDS, PROFILE_TITLES } from '../profiles.ts'
import { EMAIL_PROFILES } from '../email-content.ts'
import { renderProfileEmail } from '../email-template.ts'

for (const id of PROFILE_IDS) test(`email ${id}: textos definitivos, imágenes HTTPS y alternativa de texto`, () => {
  const result = renderProfileEmail(id,'https://aripajama.example')
  assert.ok(result.html.includes(PROFILE_TITLES[id])); assert.ok(result.text.includes(EMAIL_PROFILES[id].description))
  assert.ok(result.html.includes('24–48h')); assert.ok(result.text.includes('carpeta de spam'))
  assert.ok(result.html.includes('<!--[if mso]>'))
  for (const match of result.html.matchAll(/<img[^>]+src="([^"]+)"/g)) assert.ok(match[1].startsWith('https://aripajama.example/media/email/'))
  assert.ok(!/<script|display:\s*grid|display:\s*flex|data:image|puntuaciones|resultadoOrientativo/i.test(result.html))
  assert.ok(Buffer.byteLength(result.html) < 100000)
  assert.ok(result.text.includes('¿Qué pasa ahora?'))
})
test('no admite HTTP, credenciales en URLs ni enlaces WhatsApp arbitrarios', () => {
  assert.throws(() => renderProfileEmail('aventurero','http://aripajama.example'))
  assert.throws(() => renderProfileEmail('aventurero','https://secret@aripajama.example'))
  assert.throws(() => renderProfileEmail('aventurero','https://aripajama.example','javascript:alert(1)'))
})
