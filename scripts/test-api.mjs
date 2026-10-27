import { spawn, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const wrapper = resolve('scripts/wrangler.mjs')
const state = '.wrangler/test-state'
const migrated = spawnSync(process.execPath, [wrapper,'d1','migrations','apply','aripajama-trip-requests','--local','--persist-to',state], { stdio:'inherit' })
if (migrated.status !== 0) process.exit(migrated.status || 1)
const child = spawn(process.execPath, [wrapper,'dev','--ip','127.0.0.1','--port','8787','--persist-to',state,'--var','ENVIRONMENT:development','--var','TURNSTILE_MODE:mock','--var','EMAIL_MODE:mock'], { stdio:'inherit' })
child.on('exit', code => { process.exitCode = code || 0 })
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal))
