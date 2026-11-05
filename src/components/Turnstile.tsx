import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: TurnstileApi } }
let scriptPromise: Promise<void> | undefined
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => { clearTimeout(timer); script.remove(); scriptPromise = undefined; reject(new Error()) }
    const timer = setTimeout(fail, 15000)
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => { if (window.turnstile) { clearTimeout(timer); resolve() } else fail() }
    script.onerror = fail
    document.head.append(script)
  })
  return scriptPromise
}
export function Turnstile({ generation, onToken }: { generation: number; onToken: (value: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  callback.current = onToken
  const [message, setMessage] = useState('Preparando la verificación…')
  useEffect(() => {
    let cancelled = false
    let widget: string | undefined
    callback.current('')
    setMessage('Preparando la verificación…')
    const abort = new AbortController()
    const timeout = setTimeout(() => { abort.abort(); if (!cancelled) setMessage('No se ha podido preparar la verificación. Vuelve a intentarlo.') }, 15000)
    void fetch('/api/trip-config', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error()
      const config = await response.json() as { localVerification: boolean; turnstileSiteKey: string | null }
      if (cancelled) return
      if (config.localVerification) { callback.current('local-test-token'); setMessage('Verificación preparada.'); return }
      if (!config.turnstileSiteKey) { setMessage('La verificación aún no está disponible. Tus datos siguen guardados en esta pestaña.'); return }
      await loadTurnstile()
      if (cancelled || !container.current || !window.turnstile) return
      setMessage('Completa la verificación para continuar.')
      widget = window.turnstile.render(container.current, { sitekey: config.turnstileSiteKey, action: 'trip_request', size: container.current.clientWidth < 300 ? 'compact' : 'flexible',
        callback: (token: string) => { callback.current(token); setMessage('Verificación completada.') },
        'expired-callback': () => { callback.current(''); setMessage('La verificación ha caducado. Vuelve a completarla.') },
        'error-callback': () => { callback.current(''); setMessage('No se ha podido completar la verificación. Vuelve a intentarlo.') },
      })
    }).catch(() => { if (!cancelled) setMessage('No se ha podido preparar la verificación. Vuelve a intentarlo.') }).finally(() => clearTimeout(timeout))
    return () => { cancelled = true; clearTimeout(timeout); abort.abort(); if (widget) window.turnstile?.remove(widget) }
  }, [generation])
  return <div className="trip-final__verification"><div ref={container} /><p role="status">{message}</p></div>
}
