import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

// Originals remain untouched. Only the illustrated discs are cropped from the mockup.
const background = resolve(process.argv[2] || '../recursos/viajesPersonalizadosFondoLimpio.png')
const reference = resolve(process.argv[3] || '../recursos/viajesPersonalizados.png')
const output = resolve('public/media/create-trip')
await mkdir(output, { recursive: true })
await sharp(background).webp({ quality: 88 }).toFile(`${output}/background.webp`)
const metadata = await sharp(reference).metadata()
const sx = metadata.width / 941
const sy = metadata.height / 1672
for (const [index, name] of ['compass', 'video', 'route', 'document'].entries()) {
  const { data, info } = await sharp(reference).extract({
    left: Math.round(128 * sx), top: Math.round((600 + index * 154) * sy),
    width: Math.round(120 * sx), height: Math.round(120 * sy),
  }).resize({ width: 120, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  // Remove only near-white paper connected to the crop's outer edge. Keep
  // enclosed highlights and the original irregular silhouette of each disc.
  const visited = new Uint8Array(info.width * info.height)
  const queue = []
  function visit(x, y) {
    if (x < 0 || y < 0 || x >= info.width || y >= info.height) return
    const pixel = y * info.width + x
    if (visited[pixel]) return
    visited[pixel] = 1
    const offset = pixel * 4
    if (Math.min(data[offset], data[offset + 1], data[offset + 2]) <= 240) return
    data[offset + 3] = 0
    queue.push(pixel)
  }
  for (let x = 0; x < info.width; x++) { visit(x, 0); visit(x, info.height - 1) }
  for (let y = 0; y < info.height; y++) { visit(0, y); visit(info.width - 1, y) }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const x = queue[cursor] % info.width
    const y = Math.floor(queue[cursor] / info.width)
    visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1)
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality: 92 }).toFile(`${output}/${name}.webp`)
}
console.log('Crear mi viaje: fondo y cuatro iconos preparados sin modificar los originales.')
