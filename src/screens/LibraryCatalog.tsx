import { useState, type RefObject } from 'react'
import { CONTINENTS, COUNTRIES, illustratedIcon, selectTrips, type IconTone, type LibraryView } from '../data/library'
import { LibraryIcon } from '../components/LibraryIcon'

function ArtIcon({ icon, tone }: { icon: string; tone: IconTone }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <svg className="catalog__art catalog__art--fallback" viewBox="0 0 64 64" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="32" cy="32" r="23" /><ellipse cx="32" cy="32" rx="12" ry="23" /><path d="M9 32h46M13 20h38M13 44h38" /></svg>
    : <img className="catalog__art" src={illustratedIcon(icon, tone)} width="384" height="384" alt="" onError={() => setFailed(true)} />
}

export function LibraryCatalog({ view, titleRef, onNavigate }: {
  view: Exclude<LibraryView, { page: 'home' }>
  titleRef: RefObject<HTMLHeadingElement | null>
  onNavigate: (hash: string, sourceId?: string) => void
}) {
  const trips = selectTrips(view)
  const country = view.page === 'trips' ? COUNTRIES.find(item => item.code === view.country) : undefined
  const continent = view.page === 'trips' ? CONTINENTS.find(item => item.id === view.continent) : undefined
  const title = view.page === 'countries' ? 'Países' : view.page === 'invalid' ? 'Destino no encontrado' : country?.name || continent?.name || 'Biblioteca de viajes'
  const count = view.page === 'countries' ? `${COUNTRIES.length} países` : `${trips.length} ${trips.length === 1 ? 'viaje' : 'viajes'}`

  return <>
    <header className="catalog__header">
      <h1 ref={titleRef} tabIndex={-1}>{title}</h1>
      <span className="library__rule" aria-hidden="true" />
      {view.page !== 'invalid' && <p className="catalog__total">{count}</p>}
    </header>
    <nav className="catalog__navigation" aria-label="Explorar la biblioteca">
      <button onClick={() => onNavigate('#biblioteca')}><LibraryIcon name="globe" />Continentes <LibraryIcon name="arrow" /></button>
      {view.page !== 'countries' && <button onClick={() => onNavigate('#biblioteca/paises')}><LibraryIcon name="globe" />Países <LibraryIcon name="arrow" /></button>}
    </nav>
    {view.page === 'countries' ? <ul className="catalog__countries" aria-label="Países de la biblioteca">
      {COUNTRIES.map(item => <li key={item.code}>
        <button id={`country-${item.code}`} className="catalog__country" onClick={() => onNavigate(`#biblioteca/viajes?pais=${item.code}`, `country-${item.code}`)}>
          <span>{item.name}</span><ArtIcon icon={item.code} tone={item.tone} /><span className="catalog__arrow" aria-hidden="true">→</span>
        </button>
      </li>)}
    </ul> : view.page === 'invalid' ? <div className="catalog__empty" role="status"><p>Este enlace no corresponde a un país o filtro de la biblioteca.</p><button className="text-button" onClick={() => onNavigate('#biblioteca/viajes')}>Ver todos los viajes</button></div> : <>
      {(view.country || view.continent) && <div className="catalog__filters"><p>Filtrado por: <strong>{[country?.name, continent?.name].filter(Boolean).join(' · ')}</strong></p><button onClick={() => onNavigate('#biblioteca/viajes')}>Ver todos los viajes <span aria-hidden="true">×</span></button></div>}
      {!trips.length && <p className="catalog__empty" role="status">No hay viajes que coincidan con estos filtros.</p>}
      {CONTINENTS.map(group => {
        const items = trips.filter(trip => trip.continent === group.id)
        if (!items.length) return null
        return <section key={group.id} className={`catalog__group catalog__group--${group.id}`} aria-labelledby={`group-${group.id}`}>
          <header className="catalog__group-heading"><div><h2 id={`group-${group.id}`}>{group.name}</h2><p>{items.length} {items.length === 1 ? 'viaje' : 'viajes'}</p></div><img src={`/media/library/${group.id}.svg`} width="360" height="360" alt="" /></header>
          <ol className="catalog__trips" aria-label={`Viajes de ${group.name}`}>
            {items.map(trip => <li key={trip.id} className="catalog__trip" value={trip.order} data-trip={trip.id}>
              <span className="catalog__number" aria-hidden="true">{String(trip.order).padStart(2, '0')}</span>
              <div className="catalog__trip-copy"><h3>{trip.title}</h3>{(trip.subtitle || trip.days) && <p>{trip.subtitle || `${trip.days} días`}</p>}</div>
              <ArtIcon icon={trip.icon} tone={trip.tone} />
            </li>)}
          </ol>
        </section>
      })}
      <p className="library__notice catalog__detail-notice">Los itinerarios detallados estarán disponibles próximamente.</p>
    </>}
  </>
}
