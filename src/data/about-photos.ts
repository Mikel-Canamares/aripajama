export type AboutPhotoId =
  | 'portrait'
  | 'photography-mountain' | 'photography-desert' | 'photography-road'
  | 'photography-ocean' | 'photography-snow' | 'photography-river'
  | 'travel-hike' | 'travel-museum' | 'travel-aurora' | 'travel-selfie'
  | 'travel-colosseum' | 'travel-temple' | 'travel-summit' | 'travel-morocco'

type AboutPhoto = { src: string | null; alt: string; position?: string }

// Add each original separately. A null source renders a white, decorative frame.
// position accepts CSS object-position, for example '50% 30%'.
export const ABOUT_PHOTOS: Record<AboutPhotoId, AboutPhoto> = {
  portrait: { src: '/media/about/portrait.webp', alt: 'Ariana sentada en una gran mano de piedra, con montañas al fondo', position: '53% 50%' },
  'photography-mountain': { src: '/media/about/photography-mountain.webp', alt: 'Ariana ante una montaña de colores', position: '40% 50%' },
  'photography-desert': { src: '/media/about/photography-desert.webp', alt: 'Ariana sentada en las dunas del desierto al atardecer' },
  'photography-road': { src: '/media/about/photography-road.webp', alt: 'Ariana en una carretera rodeada de montañas verdes' },
  'photography-ocean': { src: '/media/about/photography-ocean.webp', alt: 'Ariana buceando junto a una tortuga marina' },
  'photography-snow': { src: '/media/about/photography-snow.webp', alt: 'Ariana con gorro rosa y los brazos abiertos ante un glaciar' },
  'photography-river': { src: '/media/about/photography-river.webp', alt: 'Ariana en kayak sobre agua turquesa, entre paredes de roca y vegetación' },
  'travel-hike': { src: '/media/about/travel-hike.webp', alt: 'Ariana escalando con casco naranja sobre un valle de montaña', position: '45% 55%' },
  'travel-museum': { src: '/media/about/travel-museum.webp', alt: 'Ariana contemplando fotografías en un museo' },
  'travel-aurora': { src: '/media/about/travel-aurora.webp', alt: 'Ariana bajo una aurora boreal' },
  'travel-selfie': { src: '/media/about/travel-selfie.webp', alt: 'Ariana sonriendo y mostrando las manos teñidas de verde' },
  'travel-colosseum': { src: '/media/about/travel-colosseum.webp', alt: 'Ariana delante del Coliseo de Roma' },
  'travel-temple': { src: '/media/about/travel-temple.webp', alt: 'Ariana caminando entre puertas rojas de un santuario japonés' },
  'travel-summit': { src: '/media/about/travel-summit.webp', alt: 'Ariana de espaldas a las montañas con el bastón levantado', position: '50% 35%' },
  'travel-morocco': { src: '/media/about/travel-morocco.webp', alt: 'Ariana sentada junto a textiles de colores y un gato blanco' },
}
