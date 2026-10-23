import sharp from 'sharp'
import { mkdir, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Arguments: cover, route, itinerary, essence. Originals are copied byte for byte.
const inputs = process.argv.slice(2)
if (inputs.length !== 4) throw new Error('Uso: node scripts/prepare-trip-assets.mjs portada.png ruta.png itinerario.png esencia.png')
const directory = resolve('public/media/trips/tailandia')
await mkdir(`${directory}/originals`, { recursive: true })
for (const [index, name] of ['portada', 'ruta', 'itinerario', 'esencia'].entries()) {
  await copyFile(inputs[index], `${directory}/originals/${name}.png`)
}
async function extract(input, name, box, width) {
  const metadata = await sharp(input).metadata()
  const scaleX = metadata.width / 941
  const scaleY = metadata.height / 1672
  const [left, top, cropWidth, height] = box
  await sharp(input).extract({ left: Math.round(left * scaleX), top: Math.round(top * scaleY), width: Math.round(cropWidth * scaleX), height: Math.round(height * scaleY) })
    .resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toFile(`${directory}/${name}.webp`)
}
await extract(inputs[0], 'portada', [0, 750, 941, 900], 941)
await extract(inputs[1], 'ruta', [0, 300, 941, 1140], 800)
await extract(inputs[3], 'esencia', [0, 1020, 941, 650], 941)
for (const [index, top] of [221, 420, 622, 826, 1035, 1235, 1439].entries()) {
  await extract(inputs[2], `etapa-${index + 1}`, [44, top, 360, 182], 360)
}
console.log('Tailandia: cuatro originales conservados y diez recursos WebP preparados.')
