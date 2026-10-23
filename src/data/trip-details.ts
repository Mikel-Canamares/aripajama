export type TripImage = { src: string; width: number; height: number; alt: string }
export type TripDetail = {
  introduction: string
  routeIntroduction: string
  routeCaption: string
  routeSummary: string
  routeClosing: string
  cover: TripImage
  map: TripImage
  closingImage: TripImage
  stages: readonly { destination: string; days: string; description: string; image: TripImage }[]
  themes: readonly { title: string; description: string; icon: 'culture' | 'nature' | 'experience' }[]
  reflection: string
  sheets: readonly { title: string; src: string }[]
}

const base = '/media/trips/tailandia'
const photo = (name: string, alt: string, width: number, height: number): TripImage => ({ src: `${base}/${name}.webp`, alt, width, height })

export const TRIP_DETAILS: Readonly<Partial<Record<string, TripDetail>>> = {
  tailandia: {
    introduction: 'Templos, naturaleza y mares de ensueño en una ruta inolvidable.',
    routeIntroduction: 'Un viaje por el corazón de Tailandia, de sus templos a sus islas.',
    routeCaption: 'De los templos del norte a las islas del sur.',
    routeSummary: 'Templos, cultura, montañas y playas de ensueño.',
    routeClosing: 'La esencia de Tailandia en un mismo viaje.',
    cover: photo('portada', 'Templo y embarcaciones frente a los acantilados de Tailandia al atardecer', 941, 900),
    map: photo('ruta', 'Mapa ilustrado de Tailandia con Bangkok, Ayutthaya, Chiang Rai, Chiang Mai, Krabi y Koh Phangan', 800, 969),
    closingImage: photo('esencia', 'Barcas tradicionales y acantilados junto al mar al atardecer', 941, 650),
    stages: [
      { destination: 'Bangkok', days: 'Días 1–3', description: 'Templos, canales, vida local y la energía de una ciudad que nunca se detiene.', image: photo('etapa-1', 'Templos de Bangkok junto al río al atardecer', 360, 182) },
      { destination: 'Ayutthaya', days: 'Día 4', description: 'La antigua capital, templos milenarios y mercado flotante en un día lleno de historia.', image: photo('etapa-2', 'Buda y ruinas de los templos de Ayutthaya', 360, 182) },
      { destination: 'Chiang Rai', days: 'Días 5–6', description: 'Templo Blanco, Templo Azul y un entorno de montañas y cultura única.', image: photo('etapa-3', 'La arquitectura del Templo Blanco de Chiang Rai', 360, 182) },
      { destination: 'Chiang Mai', days: 'Días 7–9', description: 'Cultura Lanna, templos, mercados y naturaleza en las montañas del norte.', image: photo('etapa-4', 'Templo iluminado y faroles en Chiang Mai', 360, 182) },
      { destination: 'Krabi', days: 'Días 10–11', description: 'Playas de ensueño, acantilados kársticos y paisajes que quitan el aliento.', image: photo('etapa-5', 'Barca en las aguas turquesas de Krabi', 360, 182) },
      { destination: 'Koh Phangan', days: 'Días 12–14 · 3 noches', description: 'Playas de aguas cristalinas, naturaleza salvaje y un ritmo de vida más lento.', image: photo('etapa-6', 'Palmeras y playa de aguas cristalinas de Koh Phangan', 360, 182) },
      { destination: 'Bangkok', days: 'Día 15', description: 'Últimas horas en la capital y regreso, con la esencia de Tailandia todavía muy presente.', image: photo('etapa-7', 'El río y los templos de Bangkok al final del día', 360, 182) },
    ],
    themes: [
      { title: 'Cultura que inspira', description: 'Templos milenarios, ciudades históricas y una espiritualidad que sigue muy viva.', icon: 'culture' },
      { title: 'Naturaleza que emociona', description: 'Montañas del norte, acantilados kársticos y playas de aguas cristalinas.', icon: 'nature' },
      { title: 'Experiencias que enriquecen', description: 'Mercados, gastronomía local, encuentros inolvidables y un ritmo de vida más consciente.', icon: 'experience' },
    ],
    reflection: 'Tailandia enseña que la belleza está en el equilibrio entre la aventura, la calma y las personas que lo hacen posible.',
    sheets: ['Portada', 'La ruta', 'El viaje', 'Lo que me llevo'].map((title, index) => ({ title, src: `${base}/originals/${['portada', 'ruta', 'itinerario', 'esencia'][index]}.png` })),
  },
}
