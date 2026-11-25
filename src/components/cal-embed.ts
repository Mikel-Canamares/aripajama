// The official vanilla Embed replaces the bootstrap queue's push method on load.
type Instruction = [string, Record<string, unknown>]
type Cal = ((...args: Instruction) => void) & { q: Instruction[]; ns: Record<string, unknown> }
declare global { interface Window { Cal?: Cal } }

export const calOrigin = 'https://app.cal.com'
let loading: Promise<Cal> | undefined

export function loadCal(): Promise<Cal> {
  if (loading) return loading
  loading = new Promise<Cal>((resolve, reject) => {
    const cal: Cal = Object.assign((...args: Instruction) => { cal.q.push(args) }, { q: [] as Instruction[], ns: {} })
    window.Cal = cal
    const script = document.createElement('script')
    const fail = () => {
      clearTimeout(timeout)
      script.onload = script.onerror = null
      script.remove()
      loading = undefined
      reject(new Error('CAL_UNAVAILABLE'))
    }
    const timeout = window.setTimeout(fail, 15000)
    script.src = calOrigin + '/embed/embed.js'
    script.async = true
    script.referrerPolicy = 'no-referrer'
    script.onerror = fail
    script.onload = () => {
      clearTimeout(timeout)
      cal('init', { origin: calOrigin })
      resolve(cal)
    }
    document.head.appendChild(script)
  })
  return loading
}
