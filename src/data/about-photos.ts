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
  portrait: { src: null, alt: '' },
  'photography-mountain': { src: null, alt: '' },
  'photography-desert': { src: null, alt: '' },
  'photography-road': { src: null, alt: '' },
  'photography-ocean': { src: null, alt: '' },
  'photography-snow': { src: null, alt: '' },
  'photography-river': { src: null, alt: '' },
  'travel-hike': { src: null, alt: '' },
  'travel-museum': { src: null, alt: '' },
  'travel-aurora': { src: null, alt: '' },
  'travel-selfie': { src: null, alt: '' },
  'travel-colosseum': { src: null, alt: '' },
  'travel-temple': { src: null, alt: '' },
  'travel-summit': { src: null, alt: '' },
  'travel-morocco': { src: null, alt: '' },
}
