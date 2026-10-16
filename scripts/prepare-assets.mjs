import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../', import.meta.url))
const media = path.join(root, 'public', 'media')
const brand = path.join(root, 'public', 'brand')
await Promise.all([mkdir(media, { recursive: true }), mkdir(brand, { recursive: true })])

// Remove the textured white paper without changing the original letter shapes.
// This crop excludes the separate descriptor; the SVG mask uses source coordinates.
const crop = { left: 320, top: 80, width: 1380, height: 480 }
const { data, info } = await sharp(path.join(root, 'letrasAripajama.png'))
  .resize({ width: 2000 })
  .extract(crop)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
const rgba = Buffer.alloc(info.width * info.height * 4)

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const source = (y * info.width + x) * info.channels
    const target = (y * info.width + x) * 4
    const luminance = data[source] * 0.2126 + data[source + 1] * 0.7152 + data[source + 2] * 0.0722
    const ink = Math.max(0, Math.min(1, ((248 - luminance) / 193 - 0.10) / 0.90))
    const isDescriptor = x + crop.left > 1110 && y + crop.top >= 405
    rgba[target] = 75
    rgba[target + 1] = 56
    rgba[target + 2] = 39
    rgba[target + 3] = isDescriptor ? 0 : Math.round(ink * 255)
  }
}

await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ lossless: true })
  .toFile(path.join(brand, 'aripajama.webp'))

const video = path.join(root, 'videoPortada.mp4')
const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })

// Preserve the video stream, remove unused audio, and move metadata to the front.
ffmpeg(['-i', video, '-map', '0:v:0', '-c:v', 'copy', '-an', '-movflags', '+faststart', path.join(media, 'portada.mp4')])
ffmpeg(['-i', video, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '85', path.join(media, 'portada-inicio.webp')])
ffmpeg(['-sseof', '-0.05', '-i', video, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', path.join(media, 'portada-final.webp')])

console.log('Recursos preparados en public/brand y public/media. Los originales se conservan intactos.')
