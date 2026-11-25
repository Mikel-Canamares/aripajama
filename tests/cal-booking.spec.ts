import { expect, test, type Page } from '@playwright/test'
import { openDetails, seedFinalDraft } from './trip-request-helpers'

const script = `
  const listeners = new Map()
  Cal.q.push = ([command, args]) => {
    if (command === 'on') listeners.set(args.action, args.callback)
    if (command === 'off') listeners.delete(args.action)
    if (command !== 'inline') return
    const frame = document.createElement('iframe')
    frame.title = 'Book a call'
    frame.src = 'https://app.cal.com/simulado'
    args.elementOrSelector.appendChild(frame)
    window.calTestConfig = args.config
  }
  window.addEventListener('message', e => {
    const action = e.data?.fullType?.split(':').pop()
    listeners.get(action)?.({ detail: { data: e.data.data } })
  })
`
const frameBody = `<html lang="es"><meta charset="utf-8"><body style="margin:0"><p>Horarios de prueba</p>
  <button id="ready">Ver disponibilidad</button><button id="none">Sin horarios disponibles</button>
  <button id="slot">Elegir hora</button><button id="done">Confirmar</button><button id="pending">Solicitar cita</button>
  <script>
  function send(type, data = {}) { parent.postMessage({ fullType: 'CAL::' + type, data }, '*') }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') send('__escapeKeyPressed') })
  ready.onclick = () => send('linkReady')
  none.onclick = () => send('bookerReady')
  slot.onclick = () => send('slotSelected')
  done.onclick = () => send('bookingSuccessfulV2', { uid: 'ejemplo', status: 'ACCEPTED', startTime:'2030-12-01T10:00:00Z' })
  pending.onclick = () => send('bookingSuccessfulV2', { uid: 'ejemplo', status: 'PENDING' })
  </script></body></html>`

async function setup(page: Page, options: { contact?: boolean; failScript?: boolean } = {}) {
  const state = { posts: 0, scripts: 0, frames: 0, failScript: options.failScript }
  await page.route('https://app.cal.com/**', async route => {
    if (route.request().url().endsWith('/embed/embed.js')) {
      state.scripts++
      if (state.failScript) return route.abort('failed')
      return route.fulfill({ contentType: 'application/javascript', body: script })
    }
    if (route.request().url().endsWith('/simulado')) {
      state.frames++
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: frameBody })
    }
    throw new Error('Destino inesperado')
  })
  await page.route('**/api/trip-requests', async route => {
    state.posts++
    const { requestId } = route.request().postDataJSON()
    await route.fulfill({ json: { requestId, saved: true, profile: 'cultural', booking: {
      path: 'prueba/primera-cita', reference: 'b'.repeat(64), ...(options.contact && { name: 'Viajera', email: 'viajera@example.test' }),
    } } })
  })
  await seedFinalDraft(page)
  await openDetails(page)
  await page.locator('#trip-details-continue').click()
  const button = page.getByRole('button', { name: 'Reservar mi cita' })
  await expect(button).toBeEnabled()
  expect(state.scripts).toBe(0)
  return { state, button, frame: page.frameLocator('iframe[title="Calendario de disponibilidad"]') }
}

test('abre bajo demanda, precarga solo contacto, cierra y confirma una sola vez', async ({ page }) => {
  const { state, button, frame } = await setup(page, { contact: true })
  await button.evaluate((el: HTMLButtonElement) => { el.click(); el.click() })
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveCount(1)
  await expect(dialog.getByRole('status')).toHaveText('Cargando el calendario…')
  await frame.getByText('Ver disponibilidad').click()
  await expect(dialog.getByRole('status')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { calTestConfig: object }).calTestConfig)).toEqual({
    layout:'month_view', theme:'light', 'metadata[aripajama_reference]':'b'.repeat(64),
    name:'Viajera', email:'viajera@example.test',
  })
  await frame.getByText('Sin horarios disponibles').click()
  await frame.getByText('Elegir hora').click()
  await page.evaluate(() => window.postMessage({ fullType:'CAL::bookingSuccessfulV2', data:{ status:'ACCEPTED', uid:'otro' } }, location.origin))
  await frame.getByText('Ver disponibilidad').evaluate(() => {
    parent.postMessage({ fullType:'CAL::dryRunBookingSuccessfulV2', data:{ status:'ACCEPTED' } }, '*')
    parent.postMessage({ fullType:'CAL::bookingSuccessfulV2', data:{ status:'ACCEPTED' } }, '*')
  })
  await expect(dialog).toBeVisible()
  await frame.getByText('Elegir hora').focus()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(button).toBeFocused()
  await expect(page).toHaveURL(/cuestionario\/completado$/)
  await button.click()
  await frame.getByText('Confirmar', {exact:true}).click()
  await expect(page.getByRole('status')).toContainText('Tu cita está confirmada.')
  await expect(page.getByRole('status')).toContainText('2030')
  await expect(page.getByRole('status')).toBeFocused()
  expect(state).toMatchObject({ posts:1, scripts:1, frames:2 })
})

test('recupera fallos de script y de calendario con enlace alternativo sin contacto', async ({ page }) => {
  const { state, button, frame } = await setup(page, { failScript: true })
  await button.click()
  const link = page.getByRole('link', { name:/Abrir en Cal.com/ })
  await expect(link).toHaveAttribute('href', 'https://cal.com/prueba/primera-cita?metadata%5Baripajama_reference%5D=' + 'b'.repeat(64))
  state.failScript = false
  await page.getByRole('button', { name:'Reintentar' }).click()
  await frame.getByText('Ver disponibilidad').click()
  expect(await page.evaluate(() => (window as unknown as { calTestConfig: object }).calTestConfig)).not.toHaveProperty('email')
  await frame.locator('body').evaluate(() => parent.postMessage({ fullType:'CAL::linkFailed', data:{} }, '*'))
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name:'Reintentar' }).click()
  await frame.getByText('Solicitar cita').click()
  await expect(page.getByRole('status')).toContainText('pendiente de confirmación')
  expect(state.posts).toBe(1)
})

test('recupera la configuración tras un fallo de red sin reenviar un perfil guardado', async ({ page }) => {
  let reads = 0
  const methods: string[] = []
  await page.route('**/api/trip-requests**', async route => {
    const request = route.request()
    methods.push(request.method())
    if (++reads === 1) return route.abort()
    const requestId = new URL(request.url()).pathname.split('/').pop()
    await route.fulfill({json:{ requestId, saved:true, profile:'cultural', booking:{ path:'prueba/cita', reference:'b'.repeat(64) } }})
  })
  await seedFinalDraft(page, { profile:'cultural' })
  await page.goto('/#crear-mi-viaje/cuestionario/completado')
  await expect(page.getByRole('heading', { name:'El Cultural' })).toBeVisible()
  await page.getByRole('button', { name:'Volver a consultar' }).click()
  await expect(page.getByRole('button', { name:'Reservar mi cita' })).toBeEnabled()
  expect(methods).toEqual(['GET','GET'])
})

test('gestiona foco y dimensiones en móvil, horizontal y escritorio', async ({ page }) => {
  const { button, frame } = await setup(page)
  await button.click()
  await frame.getByText('Ver disponibilidad').click()
  for (const [width,height] of [[280,568], [844,390], [1440,900]]) {
    await page.setViewportSize({ width,height })
    await page.addStyleTag({ content:'html {font-size:200%}' })
    const dialog = page.getByRole('dialog')
    const bounds = await dialog.boundingBox()
    expect(bounds!.width).toBeLessThanOrEqual(width)
    expect(bounds!.height).toBeLessThanOrEqual(height)
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await expect(dialog.getByRole('button', { name:'Cerrar' })).toBeInViewport()
  }
  await page.getByRole('button', { name:'Cerrar' }).click()
  await expect(button).toBeFocused()
})
