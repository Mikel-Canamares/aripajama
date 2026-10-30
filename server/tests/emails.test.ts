import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROFILE_IDS, PROFILE_TITLES } from '../profiles.ts'
import { EMAIL_PROFILES, EMAIL_STEPS } from '../email-content.ts'
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
  assert.ok(result.html.includes(EMAIL_PROFILES[id].description))
  for (const step of EMAIL_STEPS) {
    assert.ok(result.html.includes(step.title))
    assert.ok(result.html.includes(step.text))
  }
  // Table geometry must survive a mail client stripping every head style.
  for (const table of result.html.matchAll(/<table\b([^>]*)>/g)) {
    assert.match(table[1], /role="presentation"/)
    assert.match(table[1], /style="[^"]*border-collapse:/)
    assert.match(table[1], /style="[^"]*table-layout:fixed/)
  }
  assert.match(result.html, /class="shell"[^>]*style="[^"]*width:100%;max-width:720px/)
  assert.match(result.html, /format\('woff2'\)\}<\/style>\s*<style>/)
  for (const text of result.html.matchAll(/<(?:h[1-3]|p)\b([^>]*)>/g)) {
    assert.doesNotMatch(text[1], /(?:max-)?height:|overflow:|text-overflow:|white-space:nowrap/)
  }
})

test('los enlaces opcionales WhatsApp conservan su URL y el texto plano', () => {
  const url = 'https://api.whatsapp.com/send?phone=34000000000&text=Hola%20Aripajama'
  const result = renderProfileEmail('contemplativo', 'https://aripajama.example', url)
  assert.equal([...result.html.matchAll(/href="https:\/\/api\.whatsapp\.com\/send\?phone=34000000000&amp;text=Hola%20Aripajama"/g)].length, 2)
  assert.ok(result.text.includes(url))
})
test('no admite HTTP, credenciales en URLs ni enlaces WhatsApp arbitrarios', () => {
  assert.throws(() => renderProfileEmail('aventurero','http://aripajama.example'))
  assert.throws(() => renderProfileEmail('aventurero','https://secret@aripajama.example'))
  assert.throws(() => renderProfileEmail('aventurero','https://aripajama.example','javascript:alert(1)'))
})
