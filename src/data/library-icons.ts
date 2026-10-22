// Bounds isolate the intended landmass; every illustration is optically fitted afterwards.
export const COUNTRY_ART: Record<string, { source: string; bounds?: [number, number, number, number] }> = {
  DE: { source: 'DEU' }, AT: { source: 'AUT' }, BE: { source: 'BEL' }, CO: { source: 'COL' },
  HR: { source: 'HRV' }, ES: { source: 'ESP', bounds: [-10, 35, 5, 44] },
  US: { source: 'USA', bounds: [-126, 24, -66, 50] }, PH: { source: 'PHL' },
  FR: { source: 'FRA', bounds: [-6, 41, 10, 52] }, GR: { source: 'GRC' }, HU: { source: 'HUN' },
  IS: { source: 'ISL' }, IT: { source: 'ITA' }, JP: { source: 'JPN', bounds: [128, 30, 146, 46] }, MY: { source: 'MYS' },
  MA: { source: 'MAR' }, MX: { source: 'MEX' }, NL: { source: 'NLD', bounds: [3, 50, 8, 54] },
  PE: { source: 'PER' }, PL: { source: 'POL' }, PT: { source: 'PRT', bounds: [-10, 36, -6, 43] },
  GB: { source: 'GBR', bounds: [-9, 49, 3, 61] }, SG: { source: 'SGP' }, CH: { source: 'CHE' },
  TH: { source: 'THA' }, TN: { source: 'TUN' }, VN: { source: 'VNM' },
}

export const REGIONAL_ART = {
  menorca: { source: 'ESP', bounds: [3.7, 39.75, 4.4, 40.15] as [number, number, number, number] },
  'la-palma': { source: 'ESP', bounds: [-18.1, 28.4, -17.65, 29] as [number, number, number, number] },
}

export const COMPOSITE_ART: Record<string, string[]> = {
  'austria-germany': ['DE', 'AT'],
  'croatia-italy': ['IT', 'HR'],
  'malaysia-singapore': ['MY', 'SG'],
}
