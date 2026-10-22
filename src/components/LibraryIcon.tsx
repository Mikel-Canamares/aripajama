export function LibraryIcon({ name }: { name: 'globe' | 'compass' | 'lock' | 'heart' | 'leaf' | 'arrow' }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'globe' && <><circle cx="32" cy="32" r="27" /><path d="m14 12 9 5-3 8-7 2-6-4m28-18-6 10 7 6 8-3 8 8 6 1M9 36l11-3 10 8-4 9-1 8m14-27-6 5 5 8 8 1 4 10m-3-44-7 9" /></>}
    {name === 'compass' && <><circle cx="32" cy="32" r="27" /><path d="m47 17-9 21-21 9 9-21Z" /><circle cx="32" cy="32" r="2" /></>}
    {name === 'arrow' && <><circle cx="32" cy="32" r="27" /><path d="M21 32h22M34 23l9 9-9 9" /></>}
    {name === 'lock' && <><rect x="15" y="28" width="34" height="29" rx="3" /><path d="M22 28V17a10 10 0 0 1 20 0v11" /><circle cx="32" cy="41" r="2.5" /><path d="M32 44v5" /></>}
    {name === 'heart' && <path d="M32 54 10 32C-5 14 18 2 32 20 46 2 69 14 54 32Z" />}
    {name === 'leaf' && <path d="M10 57 49 9M20 45C6 43 10 30 10 30c10 0 15 5 10 15Zm8-11c-12-3-10-15-10-15 10 1 13 6 10 15Zm8-11C26 20 30 9 30 9c8 2 11 7 6 14Zm5-6c0-11 10-14 10-14 4 8 0 13-10 14ZM24 40c1-10 17-12 17-12 0 10-6 14-17 12Zm10-12c2-9 17-10 17-10-1 8-7 12-17 10Z" />}
  </svg>
}
