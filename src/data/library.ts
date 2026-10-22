export const CONTINENTS = [
  { id: 'europe', name: 'Europa' },
  { id: 'asia', name: 'Asia' },
  { id: 'america', name: 'América' },
  { id: 'africa', name: 'África' },
] as const

export type ContinentId = typeof CONTINENTS[number]['id']
export type IconTone = 'sand' | 'sage' | 'blue' | 'rose'

export const COUNTRIES = [
  { code: 'DE', name: 'Alemania', continent: 'europe', tone: 'sand' },
  { code: 'AT', name: 'Austria', continent: 'europe', tone: 'rose' },
  { code: 'BE', name: 'Bélgica', continent: 'europe', tone: 'sage' },
  { code: 'CO', name: 'Colombia', continent: 'america', tone: 'sage' },
  { code: 'HR', name: 'Croacia', continent: 'europe', tone: 'blue' },
  { code: 'ES', name: 'España', continent: 'europe', tone: 'sand' },
  { code: 'US', name: 'Estados Unidos', continent: 'america', tone: 'blue' },
  { code: 'PH', name: 'Filipinas', continent: 'asia', tone: 'blue' },
  { code: 'FR', name: 'Francia', continent: 'europe', tone: 'sand' },
  { code: 'GR', name: 'Grecia', continent: 'europe', tone: 'blue' },
  { code: 'HU', name: 'Hungría', continent: 'europe', tone: 'rose' },
  { code: 'IS', name: 'Islandia', continent: 'europe', tone: 'sage' },
  { code: 'IT', name: 'Italia', continent: 'europe', tone: 'sage' },
  { code: 'JP', name: 'Japón', continent: 'asia', tone: 'rose' },
  { code: 'MY', name: 'Malasia', continent: 'asia', tone: 'blue' },
  { code: 'MA', name: 'Marruecos', continent: 'africa', tone: 'sand' },
  { code: 'MX', name: 'México', continent: 'america', tone: 'sand' },
  { code: 'NL', name: 'Países Bajos', continent: 'europe', tone: 'blue' },
  { code: 'PE', name: 'Perú', continent: 'america', tone: 'rose' },
  { code: 'PL', name: 'Polonia', continent: 'europe', tone: 'sage' },
  { code: 'PT', name: 'Portugal', continent: 'europe', tone: 'blue' },
  { code: 'GB', name: 'Reino Unido', continent: 'europe', tone: 'rose' },
  { code: 'SG', name: 'Singapur', continent: 'asia', tone: 'sage' },
  { code: 'CH', name: 'Suiza', continent: 'europe', tone: 'blue' },
  { code: 'TH', name: 'Tailandia', continent: 'asia', tone: 'sand' },
  { code: 'TN', name: 'Túnez', continent: 'africa', tone: 'sand' },
  { code: 'VN', name: 'Vietnam', continent: 'asia', tone: 'blue' },
] as const satisfies readonly { code: string; name: string; continent: ContinentId; tone: IconTone }[]

export type CountryCode = typeof COUNTRIES[number]['code']

export type Trip = {
  id: string
  order: number
  title: string
  subtitle?: string
  continent: ContinentId
  countries: readonly CountryCode[]
  days?: number
  icon: string
  tone: IconTone
}

export const TRIPS: readonly Trip[] = [
  { id: 'galicia', order: 1, title: 'Galicia', subtitle: 'Ribadeo y Costa da Morte', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'sage' },
  { id: 'asturias', order: 2, title: 'Asturias', subtitle: 'y Picos de Europa', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'sage' },
  { id: 'cantabria', order: 3, title: 'Cantabria', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'rose' },
  { id: 'navarra', order: 4, title: 'Navarra', subtitle: 'Selva de Irati', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'sand' },
  { id: 'pirineo-aragones', order: 5, title: 'Pirineo aragonés', subtitle: 'Benasque', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'rose' },
  { id: 'ordesa', order: 6, title: 'Ordesa', subtitle: 'y Monte Perdido', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'sage' },
  { id: 'bilbao', order: 7, title: 'Bilbao', subtitle: 'y Costa Vasca', continent: 'europe', countries: ['ES'], icon: 'ES', tone: 'rose' },
  { id: 'menorca', order: 8, title: 'Menorca', continent: 'europe', countries: ['ES'], icon: 'menorca', tone: 'blue' },
  { id: 'la-palma', order: 9, title: 'La Palma', continent: 'europe', countries: ['ES'], icon: 'la-palma', tone: 'sand' },
  { id: 'toulouse-carcasona', order: 10, title: 'Toulouse', subtitle: 'y Carcasona', continent: 'europe', countries: ['FR'], icon: 'FR', tone: 'blue' },
  { id: 'paris', order: 11, title: 'París', continent: 'europe', countries: ['FR'], icon: 'FR', tone: 'sand' },
  { id: 'londres', order: 12, title: 'Londres', continent: 'europe', countries: ['GB'], icon: 'GB', tone: 'rose' },
  { id: 'escocia', order: 13, title: 'Escocia', continent: 'europe', countries: ['GB'], icon: 'GB', tone: 'sage' },
  { id: 'berlin', order: 14, title: 'Berlín', continent: 'europe', countries: ['DE'], icon: 'DE', tone: 'sand' },
  { id: 'austria-tirol-baviera', order: 15, title: 'Austria, Tirol', subtitle: 'y Baviera', continent: 'europe', countries: ['AT', 'DE'], icon: 'austria-germany', tone: 'blue' },
  { id: 'amsterdam', order: 16, title: 'Ámsterdam', subtitle: 'y pueblos holandeses', continent: 'europe', countries: ['NL'], icon: 'NL', tone: 'sand' },
  { id: 'belgica', order: 17, title: 'Bruselas, Brujas,', subtitle: 'Gante y Amberes', continent: 'europe', countries: ['BE'], icon: 'BE', tone: 'rose' },
  { id: 'budapest', order: 18, title: 'Budapest', continent: 'europe', countries: ['HU'], icon: 'HU', tone: 'sage' },
  { id: 'cracovia-navidad', order: 19, title: 'Cracovia', subtitle: 'en Navidad', continent: 'europe', countries: ['PL'], icon: 'PL', tone: 'rose' },
  { id: 'atenas-santorini', order: 20, title: 'Atenas', subtitle: 'y Santorini', continent: 'europe', countries: ['GR'], icon: 'GR', tone: 'blue' },
  { id: 'croacia-venecia', order: 21, title: 'Croacia', subtitle: 'y Venecia', continent: 'europe', countries: ['HR', 'IT'], icon: 'croatia-italy', tone: 'blue' },
  { id: 'roma', order: 22, title: 'Roma', continent: 'europe', countries: ['IT'], icon: 'IT', tone: 'sand' },
  { id: 'milan-verona', order: 23, title: 'Milán', subtitle: 'y Verona', continent: 'europe', countries: ['IT'], icon: 'IT', tone: 'blue' },
  { id: 'toscana-cinque-terre', order: 24, title: 'Toscana', subtitle: 'y Cinque Terre', continent: 'europe', countries: ['IT'], icon: 'IT', tone: 'rose' },
  { id: 'oporto', order: 25, title: 'Oporto', subtitle: 'y Entre-os-Rios', continent: 'europe', countries: ['PT'], icon: 'PT', tone: 'sage' },
  { id: 'suiza-navidad', order: 26, title: 'Suiza en Navidad', subtitle: 'Ginebra y Zúrich', continent: 'europe', countries: ['CH'], icon: 'CH', tone: 'blue' },
  { id: 'islandia', order: 27, title: 'Islandia', continent: 'europe', countries: ['IS'], icon: 'IS', tone: 'sage' },
  { id: 'japon', order: 28, title: 'Japón', continent: 'asia', countries: ['JP'], days: 18, icon: 'JP', tone: 'rose' },
  { id: 'tailandia', order: 29, title: 'Tailandia', continent: 'asia', countries: ['TH'], days: 15, icon: 'TH', tone: 'sand' },
  { id: 'vietnam', order: 30, title: 'Vietnam', continent: 'asia', countries: ['VN'], days: 17, icon: 'VN', tone: 'blue' },
  { id: 'filipinas', order: 31, title: 'Filipinas', continent: 'asia', countries: ['PH'], days: 18, icon: 'PH', tone: 'rose' },
  { id: 'malasia-singapur', order: 32, title: 'Malasia y Singapur', continent: 'asia', countries: ['MY', 'SG'], days: 15, icon: 'malaysia-singapore', tone: 'sage' },
  { id: 'peru', order: 33, title: 'Perú', continent: 'america', countries: ['PE'], days: 18, icon: 'PE', tone: 'rose' },
  { id: 'colombia', order: 34, title: 'Colombia', continent: 'america', countries: ['CO'], days: 18, icon: 'CO', tone: 'sage' },
  { id: 'estados-unidos-este', order: 35, title: 'Estados Unidos', subtitle: 'Costa Este', continent: 'america', countries: ['US'], icon: 'US', tone: 'blue' },
  { id: 'estados-unidos-oeste', order: 36, title: 'Estados Unidos', subtitle: 'Costa Oeste', continent: 'america', countries: ['US'], icon: 'US', tone: 'rose' },
  { id: 'riviera-maya', order: 37, title: 'Riviera Maya', continent: 'america', countries: ['MX'], icon: 'MX', tone: 'sand' },
  { id: 'marruecos', order: 38, title: 'Marrakech, Sáhara,', subtitle: 'Fez y Rabat', continent: 'africa', countries: ['MA'], icon: 'MA', tone: 'sand' },
  { id: 'tunez', order: 39, title: 'Túnez', continent: 'africa', countries: ['TN'], days: 8, icon: 'TN', tone: 'blue' },
]

export type LibraryView = { page: 'home' } | { page: 'countries' } | { page: 'trips'; country?: CountryCode; continent?: ContinentId } | { page: 'invalid' }

export function readLibraryView(hash: string): LibraryView {
  if (hash === '#biblioteca' || !hash) return { page: 'home' }
  if (hash === '#biblioteca/paises') return { page: 'countries' }
  const [path, query = ''] = hash.split('?')
  if (path !== '#biblioteca/viajes') return { page: 'invalid' }
  const params = new URLSearchParams(query)
  const country = params.get('pais')
  const continent = params.get('continente')
  if ((params.has('pais') && !COUNTRIES.some(item => item.code === country)) ||
    (params.has('continente') && !CONTINENTS.some(item => item.id === continent)) ||
    params.getAll('pais').length > 1 || params.getAll('continente').length > 1 ||
    [...params.keys()].some(key => key !== 'pais' && key !== 'continente')) return { page: 'invalid' }
  return { page: 'trips', country: country as CountryCode || undefined, continent: continent as ContinentId || undefined }
}

export function selectTrips(view: LibraryView): readonly Trip[] {
  if (view.page !== 'trips') return TRIPS
  return TRIPS.filter(trip => (!view.country || trip.countries.includes(view.country)) && (!view.continent || trip.continent === view.continent)).sort((a, b) => a.order - b.order)
}

export function illustratedIcon(icon: string, tone: IconTone) {
  return `/media/library/icons/${icon}-${tone}.webp`
}
