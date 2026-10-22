import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { COUNTRIES, TRIPS, illustratedIcon } from '../src/data/library.ts'
import { COUNTRY_ART, REGIONAL_ART, COMPOSITE_ART } from '../src/data/library-icons.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/media/library/icons')
await mkdir(output, { recursive: true })
// Pinned Natural Earth 5.1.2, public domain; only used at asset preparation time.
const sourceUrl = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_10m_admin_0_countries.geojson'
const cacheDirectory = path.join(os.tmpdir(), 'opencode')
await mkdir(cacheDirectory, { recursive: true })
const cache = path.join(cacheDirectory, 'natural-earth-5.1.2-countries.json')
let source
try { source = await readFile(cache, 'utf8') } catch {
  const response = await fetch(sourceUrl)
  if (!response.ok) throw new Error(`Cartographic source failed: ${response.status}`)
  source = await response.text()
  await writeFile(cache, source)
}
const { features } = JSON.parse(source)
const palette = { sand: ['#f3d9ba', '#dca675'], sage: ['#c7cdb9', '#8e9b81'], blue: ['#bfdeea', '#7eafc8'], rose: ['#ecc7bd', '#cd9387'] }

function polygonsFor(art) {
  const feature = features.find(item => item.properties.ADM0_A3 === art.source)
  if (!feature) throw new Error(`Missing geometry: ${art.source}`)
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  const result = polygons.filter(polygon => !art.bounds || polygon[0].every(([x, y]) => x >= art.bounds[0] && x <= art.bounds[2] && y >= art.bounds[1] && y <= art.bounds[3]))
  if (!result.length) throw new Error(`Empty illustration: ${art.source} ${JSON.stringify(art.bounds)}`)
  return result
}

function fit(polygons, frame = [28, 28, 328, 328]) {
  const points = polygons.flatMap(polygon => polygon[0])
  const west = Math.min(...points.map(point => point[0]))
  const east = Math.max(...points.map(point => point[0]))
  const south = Math.min(...points.map(point => point[1]))
  const north = Math.max(...points.map(point => point[1]))
  const correction = Math.cos((north + south) * Math.PI / 360)
  const width = (east - west) * correction
  const height = north - south
  const [left, top, availableWidth, availableHeight] = frame
  const scale = Math.min(availableWidth / width, availableHeight / height)
  return polygons.map(polygon => polygon.map(ring => ring.map(([lon, lat], index) => {
    const x = left + (availableWidth - width * scale) / 2 + (lon - west) * correction * scale
    const y = top + (availableHeight - height * scale) / 2 + (north - lat) * scale
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ') + 'Z').join(' ')).join(' ')
}

function geometry(id) {
  if (COUNTRY_ART[id]) return fit(polygonsFor(COUNTRY_ART[id]))
  if (REGIONAL_ART[id]) return fit(polygonsFor(REGIONAL_ART[id]))
  const parts = COMPOSITE_ART[id]
  if (!parts) throw new Error(`Unregistered icon: ${id}`)
  if (id === 'malaysia-singapore') {
    // Singapore is intentionally enlarged, not plotted as an unreadable geographic dot.
    return fit(polygonsFor(COUNTRY_ART.MY), [20, 30, 330, 240]) + fit(polygonsFor(COUNTRY_ART.SG), [232, 258, 105, 90])
  }
  return fit(parts.flatMap(part => polygonsFor(COUNTRY_ART[part])))
}

function illustration(d, tone) {
  const [light, dark] = palette[tone]
  let seed = 27
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const facets = []
  for (let y = 0; y < 400; y += 27) {
    for (let x = 0; x < 400; x += 27) {
      const cx = x + 8 + random() * 16
      const cy = y + 8 + random() * 16
      facets.push(`<path d="M${x} ${y} ${x + 27} ${y} ${cx} ${cy}Z M${x} ${y + 27} ${x + 27} ${y + 27} ${cx} ${cy}Z" fill="${random() > .5 ? light : dark}" opacity="${(.1 + random() * .2).toFixed(2)}"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384"><defs><linearGradient id="wash" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient><clipPath id="shape"><path d="${d}" fill-rule="evenodd"/></clipPath><filter id="paper" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".075" numOctaves="3" seed="8" result="grain"/><feDiffuseLighting in="grain" surfaceScale="1.2" diffuseConstant="1.15" lighting-color="#fff" result="light"><feDistantLight azimuth="45" elevation="60"/></feDiffuseLighting><feComposite in="light" in2="SourceGraphic" operator="in" result="paper"/><feBlend in="SourceGraphic" in2="paper" mode="multiply"/></filter></defs><g clip-path="url(#shape)" filter="url(#paper)"><path d="${d}" fill="url(#wash)" fill-rule="evenodd"/>${facets.join('')}</g></svg>`
}

const requests = new Map()
for (const country of COUNTRIES) requests.set(`${country.code}-${country.tone}`, { icon: country.code, tone: country.tone })
for (const trip of TRIPS) requests.set(`${trip.icon}-${trip.tone}`, { icon: trip.icon, tone: trip.tone })
for (const [name, { icon, tone }] of requests) {
  await sharp(Buffer.from(illustration(geometry(icon), tone))).webp({ quality: 94, alphaQuality: 100 }).toFile(path.join(output, `${name}.webp`))
}

// Contact sheet makes optical consistency and small-country legibility easy to inspect.
const previewItems = [...COUNTRIES.map(country => ({ name: country.name, icon: country.code, tone: country.tone })),
  { name: 'Menorca', icon: 'menorca', tone: 'blue' }, { name: 'La Palma', icon: 'la-palma', tone: 'sand' },
  { name: 'Malasia y Singapur', icon: 'malaysia-singapore', tone: 'sage' }]
const layers = []
for (const [index, item] of previewItems.entries()) {
  const left = index % 5 * 200
  const top = Math.floor(index / 5) * 200
  const tile = await sharp(path.join(root, 'public', illustratedIcon(item.icon, item.tone))).resize(150, 150).toBuffer()
  layers.push({ input: tile, left: left + 25, top: top + 5 })
  const label = `<svg width="200" height="35"><text x="100" y="24" text-anchor="middle" fill="#594533" font-size="15" font-family="sans-serif">${item.name}</text></svg>`
  layers.push({ input: Buffer.from(label), left, top: top + 155 })
}
await sharp({ create: { width: 1000, height: Math.ceil(previewItems.length / 5) * 200, channels: 4, background: '#fffdf9' } }).composite(layers).webp({ quality: 92 }).toFile(path.join(root, 'docs/library-icons-preview.webp'))
console.log(`Generated ${requests.size} transparent illustrated icons and docs/library-icons-preview.webp`)
