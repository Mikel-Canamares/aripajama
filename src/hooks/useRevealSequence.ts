import { useId, useLayoutEffect, type RefObject } from 'react'
import { useReducedMotion } from './useReducedMotion'
import '../reveal.css'

const visits = new Map<string, Set<string>>()
const DURATION = 550
const INTERVAL = 140
let entrySerial = 0

// Store only an identity in history. Progress lives in memory, so reloads replay.
export function revealEntry(): string {
  if (typeof history.state?.revealEntry === 'string') return history.state.revealEntry
  // Local Wi-Fi previews may run over HTTP, where randomUUID is unavailable.
  const entry = `${Date.now().toString(36)}-${++entrySerial}`
  history.replaceState({ ...history.state, revealEntry: entry }, '')
  return entry
}

export function useRevealSequence(rootRef: RefObject<HTMLElement | null>, active: boolean, visitKey?: string) {
  const instanceKey = useId()
  const reducedMotion = useReducedMotion()
  const key = visitKey || instanceKey

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let seen = visits.get(key)
    if (!seen) {
      seen = new Set<string>()
      visits.set(key, seen)
      // Bound history retained by long-running tabs without persisting user data.
      if (visits.size > 100) visits.delete(visits.keys().next().value!)
    }
    const progress = seen
    const targets = [...root.querySelectorAll<HTMLElement>('[data-reveal]')]
      .filter(node => node.closest('[data-reveal-scope]') === root)
    const ids = new Map(targets.map((node, index) => [node, node.dataset.reveal || node.id || String(index)]))
    const starts = new Map<HTMLElement, number>()
    const finishes = new Map<HTMLElement, number>()
    const candidates = new Set<HTMLElement>()
    let frame = 0
    let observer: IntersectionObserver | undefined

    function cancel(node: HTMLElement) {
      window.clearTimeout(starts.get(node))
      window.clearTimeout(finishes.get(node))
      starts.delete(node)
      finishes.delete(node)
      candidates.delete(node)
    }

    function show(node: HTMLElement) {
      cancel(node)
      node.dataset.revealState = 'shown'
      progress.add(ids.get(node)!)
      observer?.unobserve(node)
    }

    function showAll() { targets.forEach(show) }

    function begin(node: HTMLElement) {
      if (!node.isConnected || node.dataset.revealState === 'shown' || node.dataset.revealState === 'running') return
      cancel(node)
      const box = node.getBoundingClientRect()
      if (box.bottom <= 0 || box.top >= window.innerHeight - 16) {
        node.dataset.revealState = 'pending'
        return
      }
      progress.add(ids.get(node)!)
      node.dataset.revealStarted = String(performance.now())
      node.dataset.revealState = 'running'
      observer?.unobserve(node)
      finishes.set(node, window.setTimeout(() => show(node), DURATION))
    }

    function flush() {
      frame = 0
      try {
        const visible = [...candidates].filter(node => node.isConnected && node.dataset.revealState === 'pending')
        candidates.clear()
        const groups = new Map<HTMLElement, HTMLElement[]>()
        for (const node of visible) {
          const group = node.closest<HTMLElement>('[data-reveal-group]') || node
          const items = groups.get(group) || []
          items.push(node)
          groups.set(group, items)
        }
        const orderedGroups = [...groups.keys()].map(node => ({ node, box: node.getBoundingClientRect() }))
          .sort((a, b) => a.box.top - b.box.top)
        const ordered: HTMLElement[] = []
        // Rows are based on visual positions, including CSS multicolumn layouts.
        while (orderedGroups.length) {
          const top = orderedGroups[0].box.top
          const row = orderedGroups.splice(0, orderedGroups.findIndex(item => item.box.top > top + 12) < 0
            ? orderedGroups.length : orderedGroups.findIndex(item => item.box.top > top + 12))
          row.sort((a, b) => a.box.left - b.box.left)
          for (const { node } of row) ordered.push(...groups.get(node)!.sort((a, b) => targets.indexOf(a) - targets.indexOf(b)))
        }
        ordered.forEach((node, index) => {
          node.dataset.revealState = 'queued'
          node.dataset.revealDelay = String(index * INTERVAL)
          starts.set(node, window.setTimeout(() => begin(node), index * INTERVAL))
        })
      } catch { showAll() }
    }

    function onFocus(event: FocusEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement) || target.closest('[data-reveal-scope]') !== root) return
      if (target.matches('h1, h2')) {
        // Focused headings begin their appearance now, without skipping the cascade.
        const heading = targets.find(node => node === target || target.contains(node))
        if (heading && (heading.dataset.revealState === 'pending' || heading.dataset.revealState === 'queued')) {
          cancel(heading)
          starts.set(heading, window.setTimeout(() => begin(heading), 0))
        }
        return
      }
      const control = target.closest('button, a, input, select, textarea, [tabindex]')
      if (!control) return
      const group = control.closest('[data-reveal-group]') || control
      for (const node of targets) {
        if (node.contains(control) || group.contains(node)) show(node)
      }
    }

    try {
      for (const node of targets) {
        node.dataset.revealState = progress.has(ids.get(node)!) ? 'shown' : 'pending'
      }
      if (reducedMotion || typeof IntersectionObserver === 'undefined') showAll()
      else if (active) {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            const node = entry.target as HTMLElement
            if (entry.isIntersecting && entry.intersectionRect.height > 0) candidates.add(node)
            else {
              candidates.delete(node)
              if (node.dataset.revealState === 'queued') {
                cancel(node)
                node.dataset.revealState = 'pending'
              }
            }
          }
          if (candidates.size && !frame) frame = requestAnimationFrame(flush)
        }, { threshold: 0, rootMargin: '0px 0px -16px 0px' })
        targets.filter(node => node.dataset.revealState === 'pending').forEach(node => observer!.observe(node))
        root.addEventListener('focusin', onFocus)
      }
    } catch { showAll() }

    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
      starts.forEach(timer => window.clearTimeout(timer))
      finishes.forEach(timer => window.clearTimeout(timer))
      root.removeEventListener('focusin', onFocus)
    }
  }, [rootRef, active, key, reducedMotion])
}
