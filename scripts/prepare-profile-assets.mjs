import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve(process.argv[2] || '../recursos/Perfiles/adjuntos')
const output = resolve('public/media/email')
await mkdir(output, { recursive: true })
const profiles = {
  explorador: ['7A5D1417-9ABE-4339-ABD0-ABC4E590A484.PNG', 480],
  cultural: ['CA30E3D3-EA37-4B88-970B-6756983DC769.PNG', 460],
  aventurero: ['E8259D3C-CA1D-41E2-8A81-A830C87BB7FD.PNG', 460],
  contemplativo: ['437EA3A1-D92E-417D-ADE8-2D6E18E3A05D.PNG', 465],
  espiritu_libre: ['D4671084-E2E8-4DB2-B556-19512FE07DD6.PNG', 465],
  gastronomico: ['3D24213E-F193-4400-83FF-C75E1458655B.PNG', 465],
}
for (const [id, [file, iconTop]] of Object.entries(profiles)) {
  const input = resolve(source, file)
  await sharp(input).extract({ left: 84, top: iconTop, width: 148, height: 144 }).resize(148, 148, { fit: 'contain', background: '#fffefa' }).png().toFile(`${output}/${id}-icon.png`)
  // Text ends before x=640 in every reference. The crop contains only illustration.
  await sharp(input).extract({ left: 640, top: 125, width: 384, height: 687 }).jpeg({ quality: 90, mozjpeg: true }).toFile(`${output}/${id}-art.jpg`)
}
const reference = resolve(source, profiles.aventurero[0])
await sharp(resolve('public/brand/aripajama.webp')).resize({ width: 480, withoutEnlargement: true }).png().toFile(`${output}/logo.png`)
const { copyFile } = await import('node:fs/promises')
await copyFile(resolve('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2'),`${output}/cormorant.woff2`)
await copyFile(resolve('node_modules/@fontsource/cormorant-garamond/LICENSE'),`${output}/OFL.txt`)
for (let index = 0; index < 4; index++) {
  await sharp(reference).extract({ left: [82, 330, 580, 838][index], top: 918, width: 108, height: 88 }).resize(108, 108, { fit: 'contain', background: '#fffefa' }).png().toFile(`${output}/step-${index + 1}.png`)
}
await sharp(reference).extract({ left: 57, top: 1220, width: 140, height: 150 }).png().toFile(`${output}/leaf.png`)
await sharp(reference).extract({ left: 0, top: 1492, width: 1024, height: 44 }).jpeg({ quality: 90 }).toFile(`${output}/footer.jpg`)
const details = resolve('../recursos/personalizados/crearmiviaje/2DB74716-83DB-4BDA-9292-94498EB0D67A.PNG')
await mkdir(resolve('public/media/trip-details'), { recursive: true })
for (const [index, top] of [500, 655, 810, 970, 1130, 1285].entries()) {
  await sharp(details).extract({ left: 96, top, width: 116, height: 116 }).webp({ quality: 90 }).toFile(`public/media/trip-details/field-${index + 1}.webp`)
}
await sharp(details).extract({ left: 240, top: 0, width: 701, height: 190 }).webp({ quality: 90 }).toFile('public/media/trip-details/header.webp')
console.log('Perfiles: ilustraciones y recursos de email preparados. Originales intactos; no se usan capturas completas.')
