import { useId } from 'react'
import type { CSSProperties } from 'react'

// These are reveal guides, not replacement letterforms. The original logo is
// painted through this mask, preserving its silhouette and handwritten details.
const strokes = [
  { d: 'M430 458 741 105 Q763 82 746 123 L598 436', start: 0, duration: 0.72 },
  { d: 'M599 435 C617 320 495 299 414 337 C305 383 307 437 476 365 C566 327 662 280 767 260', start: 0.45, duration: 0.6 },
  { d: 'M724 357 766 266 Q781 237 751 283 L730 317 Q819 225 829 274', start: 0.92, duration: 0.32 },
  { d: 'M871 262 C844 307 805 380 857 344 L911 299', start: 1.16, duration: 0.25 },
  { d: 'M901 210 902 207', start: 1.34, duration: 0.08 },
  { d: 'M934 260 768 530 912 312 C967 244 1010 248 981 291 C952 333 890 369 898 347 C905 330 958 332 1007 319', start: 1.34, duration: 0.43 },
  { d: 'M1073 261 C1050 239 1026 265 1007 294 C948 378 1010 365 1063 283 C1037 324 1040 372 1080 344 L1159 267', start: 1.68, duration: 0.32 },
  { d: 'M1160 263 997 538', start: 1.92, duration: 0.25 },
  { d: 'M1186 209 1187 207', start: 2.13, duration: 0.08 },
  { d: 'M1245 261 C1221 239 1194 265 1176 305 C1129 395 1210 338 1245 284 C1217 324 1226 372 1288 329 L1334 264', start: 2.13, duration: 0.31 },
  { d: 'M1334 260 1292 345 C1343 302 1406 223 1380 278 L1358 328 C1392 293 1453 233 1425 290 C1384 368 1443 343 1486 293', start: 2.38, duration: 0.38 },
  { d: 'M1544 261 C1516 237 1489 270 1474 297 C1427 379 1501 352 1545 282 C1516 322 1513 365 1567 341 C1610 316 1660 274 1682 254', start: 2.68, duration: 0.42 },
]

export function Brand({ animated = false }: { animated?: boolean }) {
  const maskId = `writing-${useId().replaceAll(':', '')}`

  return (
    <div className="brand">
      {animated ? (
        <svg className="brand__logo" viewBox="320 80 1380 480" role="img" aria-label="Aripajama">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="320" y="80" width="1380" height="480">
              <g fill="none" stroke="white" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round">
                {strokes.map(({ d, start, duration }, index) => (
                  <path
                    className="brand__stroke"
                    key={index}
                    d={d}
                    pathLength="1"
                    style={{ '--start': `${start}s`, '--duration': `${duration}s` } as CSSProperties}
                  />
                ))}
              </g>
              {/* Complete tiny edges after the pen pass, without altering the artwork. */}
              <rect className="brand__finish" x="320" y="80" width="1380" height="480" fill="white" />
            </mask>
          </defs>
          <image href="/brand/aripajama.webp" x="320" y="80" width="1380" height="480" mask={`url(#${maskId})`} />
        </svg>
      ) : (
        <img className="brand__logo" src="/brand/aripajama.webp" width="1380" height="480" alt="Aripajama" />
      )}
      <p className="brand__descriptor reveal-item">Travel Planner</p>
    </div>
  )
}
