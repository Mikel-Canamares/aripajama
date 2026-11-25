import sharp from 'sharp'
import { resolve } from 'node:path'

const source = resolve(process.argv[2] || '../RECURSOS/fotos quien soy')
const output = resolve('public/media/about')
const photos = [
  ['photography-mountain', '277396D2-351A-4D74-88C5-816467B91464.jpeg'],
  ['photography-desert', 'IMG_0361.jpeg'],
  ['photography-road', '84D3E642-F0CF-4E47-8CB1-025F31FD50C7.jpeg'],
  ['photography-ocean', 'copy_ADB76D85-4C85-4477-8BFE-CAA873777415.jpeg'],
  ['photography-snow', 'IMG_2528.jpeg'],
  ['photography-river', '2A4889C7-0305-4F02-923D-A99949C76A4E.jpeg'],
  ['travel-hike', 'IMG_8319.jpeg'],
  ['travel-museum', 'IMG_3255.jpeg'],
  ['travel-aurora', 'IMG_2586.jpeg'],
  ['travel-selfie', 'IMG_1668.jpeg'],
  ['travel-colosseum', 'IMG_5883.jpeg'],
  ['travel-temple', 'IMG_5684.jpeg'],
  ['travel-summit', 'IMG_9621.jpeg'],
  ['travel-morocco', 'IMG_0692.jpeg'],
]

for (const [id, filename] of photos) {
  const info = await sharp(resolve(source, filename)).rotate()
    .resize({ width: 720, height: 960, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 }).toFile(resolve(output, `${id}.webp`))
  console.log(`${id}: ${info.width} × ${info.height}, ${info.size} bytes`)
}
