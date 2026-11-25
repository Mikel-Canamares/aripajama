import { useEffect, useRef, useState } from 'react'
import { LibraryIcon } from './LibraryIcon'

const items = [
  { id: 'about', label: 'Quién soy', href: '#quien-soy' },
  { id: 'library', label: 'Biblioteca de viajes', href: '#biblioteca' },
  { id: 'create', label: 'Crear mi viaje', href: '#crear-mi-viaje' },
] as const

type Destination = typeof items[number]['id']

export function DesktopNavigation({ current, busy, onNavigate, onHub }: {
  current: Destination
  busy: boolean
  onNavigate: (destination: Destination) => void
  onHub: () => void
}) {
  return <header className="desktop-navigation" inert={busy}>
    <div className="desktop-navigation__inner">
      <button type="button" className="desktop-navigation__brand" onClick={onHub} aria-label="Aripajama, volver al hub" />
      <nav aria-label="Navegación principal">
        {items.map(item => <a key={item.id} href={item.href} aria-current={current === item.id ? 'page' : undefined}
          onClick={event => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            if (item.id === current && window.location.hash !== item.href) return
            event.preventDefault()
            onNavigate(item.id)
          }}>{item.label}</a>)}
      </nav>
    </div>
  </header>
}

export function MobileNavigation({ current, disabled, onNavigate }: {
  current: 'hub' | 'about' | 'library' | 'create'
  disabled: boolean
  onNavigate: (destination: 'about' | 'library' | 'create') => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        if (root.current?.contains(document.activeElement)) toggle.current?.focus({ preventScroll: true })
        close()
      }
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Consume Escape before the individual screens use it to navigate back.
      event.preventDefault()
      event.stopImmediatePropagation()
      close()
      toggle.current?.focus({ preventScroll: true })
    }
    const desktop = window.matchMedia('(min-width: 768px)')
    desktop.addEventListener('change', close)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape, true)
    window.addEventListener('popstate', close)
    window.addEventListener('hashchange', close)
    return () => {
      desktop.removeEventListener('change', close)
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape, true)
      window.removeEventListener('popstate', close)
      window.removeEventListener('hashchange', close)
    }
  }, [open])

  return <div ref={root} className="mobile-navigation" data-open={open} data-current={current} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={toggle} type="button" className="mobile-navigation__toggle" disabled={disabled}
      aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="mobile-navigation-links"
      onClick={event => {
        event.currentTarget.focus({ preventScroll: true })
        setOpen(value => !value)
      }}>
      <span /><span /><span />
    </button>
    <nav id="mobile-navigation-links" className="mobile-navigation__panel" aria-label="Navegación principal" hidden={!open}>
      <p className="mobile-navigation__caption">Tu próxima historia</p>
      {items.map(item => <a key={item.id} href={item.href} tabIndex={0} aria-current={current === item.id ? 'page' : undefined}
        onClick={event => {
          setOpen(false)
          toggle.current?.focus({ preventScroll: true })
          if (item.id === current && window.location.hash !== item.href) return
          event.preventDefault()
          onNavigate(item.id)
        }}>
        {item.label}<LibraryIcon name="arrow" />
      </a>)}
    </nav>
  </div>
}
