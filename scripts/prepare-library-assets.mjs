import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/media/library')
await mkdir(output, { recursive: true })
const source = process.argv[2] || path.resolve(root, '../recursos/bibliotecaFondo.png')
await sharp(source).webp({ quality: 88 }).toFile(path.join(output, 'background.webp'))

// Natural Earth public-domain boundaries. Generated SVGs are served locally.
const response = await fetch('https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson')
if (!response.ok) throw new Error(`Natural Earth download failed: ${response.status}`)
const { features } = await response.json()
const regions = [
  { id: 'europe', continents: ['Europe'], bounds: [-25, 35, 45, 72], color: '#efb07e' },
  { id: 'asia', continents: ['Asia'], bounds: [25, -12, 180, 78], color: '#91a894' },
  { id: 'america', continents: ['North America', 'South America'], bounds: [-168, -57, -32, 83], color: '#8fc0dc' },
  { id: 'africa', continents: ['Africa'], bounds: [-19, -36, 53, 38], color: '#dc9a80' },
]
for (const region of regions) {
  const [west, south, east, north] = region.bounds
  const correction = Math.cos((north + south) / 2 * Math.PI / 180)
  const width = (east - west) * correction
  const height = north - south
  const scale = 328 / Math.max(width, height)
  const project = ([lon, lat]) => [
    (lon - west) * correction * scale + (360 - width * scale) / 2,
    (north - lat) * scale + (360 - height * scale) / 2,
  ]
  const paths = features.filter(feature => {
    // Show Russia with Asia rather than a truncated rectangle at Europe's edge.
    if (feature.properties.ADM0_A3 === 'RUS') return region.id === 'asia'
    return region.continents.includes(feature.properties.CONTINENT)
  })
    .flatMap(feature => feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates)
    .filter(polygon => polygon[0].some(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north))
    .map(polygon => polygon.map(ring => ring.map((point, index) => {
      // Clip overseas territories and the antimeridian to the regional frame.
      const [x, y] = project([Math.max(west, Math.min(east, point[0])), Math.max(south, Math.min(north, point[1]))])
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ') + 'Z').join(' '))
    .map(d => `<path d="${d}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360"><defs><filter id="paper" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".065" numOctaves="3" seed="12" result="noise"/><feDiffuseLighting in="noise" lighting-color="#fff" surfaceScale="1.4" diffuseConstant="1.2" result="light"><feDistantLight azimuth="35" elevation="55"/></feDiffuseLighting><feComposite in="light" in2="SourceGraphic" operator="in" result="texture"/><feBlend in="SourceGraphic" in2="texture" mode="multiply"/></filter></defs><g fill="${region.color}" stroke="${region.color}" stroke-opacity=".65" stroke-width=".6" fill-rule="evenodd" filter="url(#paper)">${paths}</g></svg>`
  await writeFile(path.join(output, `${region.id}.svg`), svg)
}
console.log('Library background and four continent maps prepared.')
