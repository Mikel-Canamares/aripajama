import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

// Only decorations are extracted. Photographs are separate HTML/CSS slots.
const reference = resolve(process.argv[2] || '../RECURSOS/quienSoy2.png')
const output = resolve('public/media/about')
await mkdir(output, { recursive: true })
const metadata = await sharp(reference).metadata()
const scaleX = metadata.width / 941
const scaleY = metadata.height / 1672

const assets = [
  { name: 'header-art', box: [270, 0, 671, 205], polygon: '0,0 671,0 671,205 270,205 270,100 220,86 150,62 70,27' },
  { name: 'footer-ribbons', box: [0, 1554, 941, 118], polygon: '0,0 110,15 200,40 335,100 430,118 530,118 650,85 780,52 941,42 941,118 0,118' },
  { name: 'cotton', box: [309, 348, 83, 128], polygon: '0,0 60,0 66,28 61,36 54,43 48,52 41,65 40,128 0,128' },
  { name: 'note', box: [475, 371, 213, 110], polygon: '4,52 183,4 210,85 27,108' },
  { name: 'signature', box: [333, 670, 165, 77] },
  { name: 'mountains', box: [497, 671, 126, 47] },
  { name: 'camera-note', box: [604, 911, 160, 125], polygon: '0,0 160,0 160,125 50,125 50,70 0,50' },
]

for (const { name, box: [left, top, width, height], polygon } of assets) {
  let image = sharp(reference).extract({
    left: Math.round(left * scaleX), top: Math.round(top * scaleY),
    width: Math.round(width * scaleX), height: Math.round(height * scaleY),
  }).resize({ width, height }).ensureAlpha()
  if (polygon) {
    const mask = Buffer.from(`<svg width="${width}" height="${height}"><polygon points="${polygon}" fill="white"/></svg>`)
    image = image.composite([{ input: mask, blend: 'dest-in' }])
  }
  {
    // Remove the edge-connected backdrop. Keep enclosed illustration highlights
    // and feather the palest watercolor so crops blend into the page naturally.
    const data = await image.raw().toBuffer()
    const visited = new Uint8Array(width * height)
    const queue = []
    function visit(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return
      const pixel = y * width + x
      if (visited[pixel]) return
      visited[pixel] = 1
      const offset = pixel * 4
      const low = Math.min(data[offset], data[offset + 1], data[offset + 2])
      const high = Math.max(data[offset], data[offset + 1], data[offset + 2])
      const cotton = name === 'cotton'
      if (data[offset + 3] && (low <= (cotton ? 210 : 236) || high - low >= (cotton ? 60 : 35))) return
      data[offset + 3] = cotton ? 0 : Math.round(data[offset + 3] * Math.max(0, (250 - low) / 14))
      queue.push(pixel)
    }
    for (let x = 0; x < width; x++) { visit(x, 0); visit(x, height - 1) }
    for (let y = 0; y < height; y++) { visit(0, y); visit(width - 1, y) }
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const x = queue[cursor] % width
      const y = Math.floor(queue[cursor] / width)
      visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1)
    }
    for (let pixel = 0; pixel < width * height; pixel++) {
      const offset = pixel * 4
      if (!data[offset + 3]) data.fill(0, offset, offset + 3)
    }
    image = sharp(data, { raw: { width, height, channels: 4 } })
  }
  await image.webp({ lossless: true }).toFile(`${output}/${name}.webp`)
}

// Small watercolor washes stay independent of the editable section numbers.
for (const [name, color] of [['peach', '#efd3bd'], ['blue', '#bfd6da']]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <defs><filter id="paper" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="3" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation=".65"/>
    </filter><radialGradient id="paint"><stop stop-color="${color}" stop-opacity=".46"/>
      <stop offset=".72" stop-color="${color}" stop-opacity=".8"/><stop offset="1" stop-color="${color}" stop-opacity=".3"/>
    </radialGradient></defs>
    <g filter="url(#paper)"><path d="M48 4 61 8 74 9 80 20 88 28 88 41 92 52 85 63 81 76 68 82 58 91 44 87 32 89 22 81 12 77 9 65 3 54 8 41 8 28 18 20 25 10 38 9Z" fill="url(#paint)"/>
      <ellipse cx="47" cy="47" rx="34" ry="36" fill="${color}" opacity=".15"/></g>
  </svg>`
  await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(`${output}/number-${name}.webp`)
}

// Airy, irregular watercolor behind the independent photograph frames.
const wash = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="400" viewBox="0 0 960 400">
  <defs><filter id="wash" x="-10%" y="-20%" width="120%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="3" seed="3" result="grain"/>
    <feDisplacementMap in="SourceGraphic" in2="grain" scale="22" xChannelSelector="R" yChannelSelector="G"/>
    <feGaussianBlur stdDeviation="1.5"/>
  </filter><radialGradient id="color"><stop stop-color="#f3d1b3" stop-opacity=".35"/>
    <stop offset=".8" stop-color="#fae3ce" stop-opacity=".5"/><stop offset="1" stop-color="#fae3ce" stop-opacity=".05"/></radialGradient></defs>
  <g filter="url(#wash)"><path d="m19 185 29-39-3-34 45-11 19-36 66 3 43-27 79 12 57-25 69 22 71-10 50 20 80-13 48 22 63-8 42 25 58 2 20 33 48 10-4 38 27 32-22 35 1 41-45 14-28 31-58-1-37 25-63-13-56 23-65-12-61 11-64-18-65 14-52-21-70 9-31-26-58-4-16-32-40-17 7-35Z" fill="url(#color)"/>
    <ellipse cx="493" cy="201" rx="398" ry="136" fill="#f8e5d1" opacity=".23"/></g>
</svg>`
await sharp(Buffer.from(wash)).webp({ lossless: true }).toFile(`${output}/watercolor.webp`)
console.log('Quién soy: ilustración de cabecera, cintas y decoraciones preparadas; las fotos personales siguen siendo huecos independientes.')
