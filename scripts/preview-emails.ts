import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { PROFILE_IDS } from '../server/profiles.ts'
import { renderProfileEmail } from '../server/email-template.ts'

// Development-only utility, outside public/ and dist/. It cannot send messages.
const output = resolve('.email-preview')
await mkdir(output, { recursive: true })
for (const id of PROFILE_IDS) {
  const email = renderProfileEmail(id, 'https://preview.example.test')
  await writeFile(`${output}/${id}.html`, email.html)
  await writeFile(`${output}/${id}.txt`, email.text)
}
if (process.argv.includes('--generate')) {
  console.log(`Seis emails ficticios (HTML + texto) en ${output}`)
} else {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url || '/', 'http://127.0.0.1:4321').pathname
    if (path === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8')
      response.end(`<html lang="es"><meta charset="utf-8"><title>Emails · desarrollo</title><h1>Previsualización local · sin envío</h1><ul>${PROFILE_IDS.map(id => `<li><a href="/${id}">${id}</a> · <a href="/${id}.txt">texto plano</a></li>`).join('')}</ul></html>`)
      return
    }
    const profile = path.slice(1).replace(/\.txt$/, '')
    try {
      if (PROFILE_IDS.includes(profile as typeof PROFILE_IDS[number])) {
        const plain = path.endsWith('.txt')
        response.setHeader('Content-Type', plain ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8')
        const file = await readFile(`${output}/${profile}.${plain ? 'txt' : 'html'}`, 'utf8')
        // Preview-only image routing; generated/sent email always has HTTPS URLs.
        response.end(file.replaceAll('https://preview.example.test/media/email/', '/media/email/'))
        return
      }
      if (/^\/media\/email\/[a-z0-9_-]+\.(png|jpg|woff2)$/.test(path)) {
        response.setHeader('Content-Type', extname(path) === '.png' ? 'image/png' : extname(path) === '.woff2' ? 'font/woff2' : 'image/jpeg')
        response.end(await readFile(resolve('public', path.slice(1))))
        return
      }
    } catch { /* Fall through to a plain 404, without filesystem details. */ }
    response.writeHead(404); response.end('Not found')
  })
  server.listen(4321, '127.0.0.1', () => console.log('Emails de desarrollo: http://127.0.0.1:4321 (sin envío)'))
}
