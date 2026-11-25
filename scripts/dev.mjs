import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const children = new Set()
let stopping = false
function stop(code) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) {
    // Wrangler starts its own subprocesses; close the entire tree on Windows.
    if (process.platform === 'win32') {
      const kill = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
      kill.on('error', () => child.kill())
    } else child.kill('SIGTERM')
  }
}
function start(args, oneShot = false) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' })
  children.add(child)
  child.on('error', error => { console.error(error.message); children.delete(child); stop(1) })
  child.on('exit', code => {
    children.delete(child)
    if (!oneShot && !stopping) stop(code ?? 1)
  })
  return child
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0))

async function main() {
  const wrapper = resolve('scripts/wrangler.mjs')
  const state = '.wrangler/state'
  const migrated = start([wrapper, 'd1', 'migrations', 'apply', 'aripajama-trip-requests', '--local', '--persist-to', state], true)
  const [code] = await once(migrated, 'exit')
  if (stopping) return
  if (code !== 0) { stop(code || 1); return }
  start([wrapper, 'dev', '--assets', 'public', '--ip', '127.0.0.1', '--port', '8787', '--persist-to', state, '--var', 'ENVIRONMENT:development', '--var', 'EMAIL_MODE:disabled'])
  const deadline = Date.now() + 60000
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:8787/api/health', { signal: AbortSignal.timeout(1000) })
      if (response.ok && (await response.json()).ok === true) {
        if (!stopping) start([resolve('node_modules/vite/bin/vite.js'), '--host', '0.0.0.0', ...process.argv.slice(2)])
        return
      }
    } catch { /* Wait for the local Worker before opening the frontend. */ }
    await delay(200)
  }
  if (!stopping) { console.error('La API local no ha arrancado en el puerto 8787. Revisa el error de Wrangler mostrado arriba.'); stop(1) }
}
main().catch(error => { console.error(error.message); stop(1) })
