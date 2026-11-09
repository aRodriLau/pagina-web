/**
 * Tema pensato per TUTTE le età: testo grande di default, alto contrasto,
 * aree di tocco ≥ 48px (linee guida WCAG 2.2 / Material per utenti anziani).
 */
export const colors = {
  bg: '#FFFBF5',
  surface: '#FFFFFF',
  text: '#1F2328',
  muted: '#59636E',
  border: '#E3DCCF',
  primary: '#0B6E4F', // verde "sentiero"
  primaryText: '#FFFFFF',
  accent: '#E07A2E', // arancio "tramonto"
  danger: '#B42318',
  kids: '#2563EB',
  seniors: '#7C3AED',
  pets: '#B45309',
  mobility: '#0F766E',
};

export const audienceColor = {
  KIDS: colors.kids,
  SENIORS: colors.seniors,
  PETS: colors.pets,
  MOBILITY: colors.mobility,
} as const;

export const font = { sm: 15, md: 17, lg: 20, xl: 26, xxl: 32 };
export const space = (n: number) => n * 4;
export const MIN_TOUCH = 48;
