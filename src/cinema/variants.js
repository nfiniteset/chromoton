// Every sim variation, in the order they should appear in the nav menu
// (VariantNav, in src/components/). Add an entry here as the last step of
// starting a new month (see src/cinema/README.md) — this is the only place
// a new variation needs to be registered for the nav to find it.
//
// `path` is the variation's location relative to the site root, and is what
// lets one shared menu work from every page: the main app sits at the root,
// cinema variations one folder deeper, and VariantNav resolves each link
// relative to whichever page it's currently rendered on (the build uses a
// relative base, so root-absolute hrefs aren't an option).
export const VARIANTS = [
  { id: 'main', label: 'Chromoton', path: '' },
  {
    id: '2026-08-forsythe',
    label: '2026-08 — Forsythe',
    path: 'cinema/2026-08-forsythe/',
  },
  { id: '2026-09', label: '2026-09', path: 'cinema/2026-09/' },
  { id: 'depth-map', label: 'Depth map', path: 'cinema/depth-map/' },
  { id: 'segments', label: 'Segments', path: 'cinema/segments/' },
  { id: 'hybrid', label: 'Hybrid', path: 'cinema/hybrid/' },
]
