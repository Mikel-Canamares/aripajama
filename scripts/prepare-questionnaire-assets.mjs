import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

// Crop artwork only: all labels and selection controls are rendered as HTML.
const source = resolve(process.argv[2] || '../recursos/personalizados/crearmiviaje')
const output = resolve('public/media/questionnaire')
await mkdir(output, { recursive: true })
const references = [
  ['1F7C1A02-AF38-445E-8D96-3C36BDC438DF.PNG', []],
  ['AC3C4925-C7B8-457D-9D2C-EF4E5800678B.PNG', [[479,165],[660,165],[840,165],[1018,165],[1199,165]]],
  ['EDE3DD15-3BA7-4175-995B-494921AE2566.PNG', [[483,168],[667,168],[851,168],[1033,168],[1217,168]]],
  ['1D912022-D80D-415E-976D-3FF868C7C41D.PNG', [[485,167],[669,167],[849,167],[1032,167],[1216,167]]],
  ['07B421DC-CC68-4372-B335-D900076EEBB7.PNG', [[502,167],[685,167],[864,167],[1047,167],[1230,167]]],
  ['F0FD5345-1DBC-4817-8255-7B291E2438F7.PNG', [[485,155],[655,152],[821,151],[985,153],[1151,153],[1317,149]]],
  ['0A604067-0694-4D08-A413-DE621B4454DD.PNG', [[474,155],[640,153],[802,151],[962,151],[1122,151],[1282,148]]],
  ['211FFAAD-7F35-4F1B-A8DB-36E2E4AE5708.PNG', [[501,169],[685,165],[862,167],[1043,172],[1230,193]]],
  ['57E2E794-A18B-4104-9D3E-F7251738D12D.PNG', [[528,166],[707,179],[900,158],[1072,177],[1265,183]]],
  ['AE7E80DE-5B40-4741-9525-BABF7E4CA391.PNG', [[491,181],[685,197],[896,178],[1084,173],[1271,166]]],
]
for (const [index, [file, rows]] of references.entries()) {
  const input = resolve(source, file)
  for (const [option, [top, height]] of rows.entries()) {
    await sharp(input).extract({ left: 96, top: top + Math.round((height - 116) / 2), width: 116, height: 116 }).webp({ quality: 88 }).toFile(`${output}/q${index + 1}-${option + 1}-icon.webp`)
    // The right-hand patch starts beyond every text column and ends before the indicator.
    await sharp(input).extract({ left: 600, top: top + 3, width: 208, height: height - 6 }).webp({ quality: 86 }).toFile(`${output}/q${index + 1}-${option + 1}-scene.webp`)
  }
  if (index > 0) {
    await sharp(input).extract({ left: 240, top: 0, width: 701, height: 185 }).webp({ quality: 86 }).toFile(`${output}/q${index + 1}-header.webp`)
  }
}
const first = resolve(source, references[0][0])
for (const [option, [left, top, width, height]] of [[157,945,132,105],[408,945,140,105],[672,945,132,105],[286,1180,132,100],[550,1180,132,100]].entries()) {
  await sharp(first).extract({ left, top, width, height }).webp({ quality: 90 }).toFile(`${output}/q1-${option + 1}-icon.webp`)
}
await sharp(first).extract({ left: 530, top: 0, width: 411, height: 600 }).webp({ quality: 88 }).toFile(`${output}/globe.webp`)
// This footer contains no button or text; fade its upper edge in CSS.
await sharp(resolve(source, references[3][0])).extract({ left: 0, top: 1545, width: 941, height: 127 }).webp({ quality: 86 }).toFile(`${output}/footer.webp`)
console.log('Cuestionario: ilustraciones preparadas sin modificar las referencias.')
