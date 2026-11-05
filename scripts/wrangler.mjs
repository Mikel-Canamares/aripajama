import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Keep local tooling files inside the workspace; no global config/cache writes.
const logs = resolve('.wrangler/logs')
mkdirSync(logs, { recursive: true })
const child = spawn(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, WRANGLER_LOG_PATH: logs, XDG_CONFIG_HOME: resolve('.wrangler/config'), WRANGLER_SEND_METRICS: 'false' },
})
child.on('exit', code => { process.exitCode = code || 0 })
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal))
