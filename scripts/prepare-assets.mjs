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

const hubSource = path.join(root, 'videohub.mp4')
const hubVideo = path.join(media, 'hub.mp4')
const hubDuration = Number(execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=duration',
  '-of', 'default=noprint_wrappers=1:nokey=1', hubSource,
], { encoding: 'utf8' }).trim())
const frameRate = 24
const endFrame = Math.round((hubDuration - .5) * frameRate)
const overlapFrames = Math.round(.75 * frameRate)
const blendStart = endFrame - overlapFrames
const progress = `min(1,T*${frameRate}/${overlapFrames - 1})`
const easedProgress = `(${progress}*${progress}*(3-2*${progress}))`

// Drop the final half-second, then blend exactly 18 tail/opening frame pairs.
// Inclusive endpoints give 100% tail at frame 0 and 100% opening at frame 17.
// Smoothstep eases the blend at both ends; frame 17 then loops into source frame 18.
ffmpeg([
  '-i', hubSource,
  '-filter_complex',
  `[0:v:0]fps=${frameRate},split=3[main][tail][head];` +
  `[main]trim=start_frame=${overlapFrames}:end_frame=${blendStart},setpts=PTS-STARTPTS[body];` +
  `[tail]trim=start_frame=${blendStart}:end_frame=${endFrame},setpts=PTS-STARTPTS[end];` +
  `[head]trim=start_frame=0:end_frame=${overlapFrames},setpts=PTS-STARTPTS[start];` +
  `[end][start]blend=all_expr='round(A+(B-A)*${easedProgress})':shortest=1[join];` +
  `[body][join]concat=n=2:v=1:a=0,format=yuv420p[loop]`,
  '-map', '[loop]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
  '-movflags', '+faststart', hubVideo,
])
ffmpeg(['-i', hubVideo, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', path.join(media, 'hub-inicio.webp')])

console.log('Recursos preparados en public/brand y public/media. Los originales se conservan intactos.')
