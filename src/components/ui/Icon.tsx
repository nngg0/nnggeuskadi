import type { SVGProps } from 'react'

/*
 * Iconografía lineal propia (trazo 1.75, esquinas redondeadas). Sin dependencias externas.
 */
const PATHS = {
  home: <><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10.5h13V9" /><path d="M10 19.5V14h4v5.5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  participa: <><path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10Z" /><path d="M12 11v4M10 13h4" /></>,
  document: <><path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z" /><path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h5" /></>,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  users: <><circle cx="9" cy="9" r="3.4" /><path d="M3 19.5c.9-3 3.1-4.5 6-4.5s5.1 1.5 6 4.5" /><path d="M15.5 5.8a3.4 3.4 0 0 1 0 6.4M17.5 15.2c1.7.6 2.9 2 3.5 4.3" /></>,
  ticket: <><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4Z" /><path d="M14 6v12" strokeDasharray="2 2.2" /></>,
  territory: <><path d="M4 6.5 9 4.5l6 2 5-2v13l-5 2-6-2-5 2Z" /><path d="M9 4.5v13M15 6.5v13" /></>,
  arrowRight: <><path d="M4.5 12h15M13.5 6l6 6-6 6" /></>,
  arrowLeft: <><path d="M19.5 12h-15M10.5 6l-6 6 6 6" /></>,
  chevronLeft: <path d="M14.5 6 8.5 12l6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  bookmark: <path d="M6.5 4.5h11v16L12 16.5l-5.5 4Z" />,
  external: <><path d="M14 4.5h5.5V10M19.5 4.5 11 13" /><path d="M17.5 14v4a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h4" /></>,
  logout: <><path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12h10" /></>,
  alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.2v.3" /></>,
  offline: <><path d="M3.5 3.5 20.5 20.5" /><path d="M8.6 8.6A11.6 11.6 0 0 0 4 11.2M2 8.3A15 15 0 0 1 6 5.9M10.5 5.1A15 15 0 0 1 22 8.3M14.7 10.3a11.6 11.6 0 0 1 5.3 2.9M8 14.7a5.6 5.6 0 0 1 6.7-.8M12 19h.01" /></>,
  spark: <><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.6 2.6M15.4 15.4 18 18M6 18l2.6-2.6M15.4 8.6 18 6" /></>,
  list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.75" cy="6.5" r=".9" /><circle cx="4.75" cy="12" r=".9" /><circle cx="4.75" cy="17.5" r=".9" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6" /></>,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" /></>,
  star: <path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.7Z" />,
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  filled?: boolean
  title?: string
}

export function Icon({ name, size = 20, filled = false, title, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={className}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  )
}
