/**
 * Catalogo condiviso tra API e app: categorie di luoghi, caratteristiche
 * di accessibilità/adattabilità e profili di viaggiatore.
 *
 * Il cuore del prodotto: ogni luogo è descritto da caratteristiche
 * CONCRETE e VERIFICABILI dalla community ("c'è il fasciatoio?",
 * "ci sono gradini all'ingresso?"), non da un generico "family friendly".
 */

export const PLACE_CATEGORIES = [
  'RESTAURANT',
  'CAFE',
  'ATTRACTION',
  'MUSEUM',
  'PARK',
  'PLAYGROUND',
  'BEACH',
  'NATURE',
  'ACCOMMODATION',
  'SHOPPING',
  'EVENT',
  'OTHER',
] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const AUDIENCES = ['KIDS', 'SENIORS', 'PETS', 'MOBILITY'] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface FeatureDef {
  code: string;
  audience: Audience;
  label: { it: string; en: string; es: string };
}

export const FEATURES = [
  // Bambini
  { code: 'HIGH_CHAIR', audience: 'KIDS', label: { it: 'Seggiolone', en: 'High chair', es: 'Trona' } },
  { code: 'CHANGING_TABLE', audience: 'KIDS', label: { it: 'Fasciatoio', en: 'Changing table', es: 'Cambiador' } },
  { code: 'KIDS_MENU', audience: 'KIDS', label: { it: 'Menù bambini', en: 'Kids menu', es: 'Menú infantil' } },
  { code: 'PLAY_AREA', audience: 'KIDS', label: { it: 'Area giochi', en: 'Play area', es: 'Zona de juegos' } },
  { code: 'STROLLER_FRIENDLY', audience: 'KIDS', label: { it: 'Accessibile con passeggino', en: 'Stroller friendly', es: 'Apto para carritos' } },
  { code: 'BREASTFEEDING_AREA', audience: 'KIDS', label: { it: 'Spazio allattamento', en: 'Nursing area', es: 'Zona de lactancia' } },
  { code: 'KIDS_FREE_ENTRY', audience: 'KIDS', label: { it: 'Ingresso gratuito bambini', en: 'Free entry for kids', es: 'Entrada gratis niños' } },

  // Anziani
  { code: 'SEATING_AVAILABLE', audience: 'SENIORS', label: { it: 'Panchine / posti a sedere', en: 'Seating available', es: 'Asientos disponibles' } },
  { code: 'SHORT_WALK', audience: 'SENIORS', label: { it: 'Poco cammino', en: 'Short walk', es: 'Poca caminata' } },
  { code: 'QUIET', audience: 'SENIORS', label: { it: 'Ambiente tranquillo', en: 'Quiet', es: 'Tranquilo' } },
  { code: 'SHADE', audience: 'SENIORS', label: { it: 'Zone d\'ombra', en: 'Shade', es: 'Sombra' } },
  { code: 'SENIOR_DISCOUNT', audience: 'SENIORS', label: { it: 'Sconto over 65', en: 'Senior discount', es: 'Descuento mayores' } },
  { code: 'NEAR_PARKING', audience: 'SENIORS', label: { it: 'Parcheggio vicino', en: 'Parking nearby', es: 'Aparcamiento cerca' } },

  // Mobilità ridotta (utile a anziani, passeggini, disabilità)
  { code: 'STEP_FREE_ENTRANCE', audience: 'MOBILITY', label: { it: 'Ingresso senza gradini', en: 'Step-free entrance', es: 'Entrada sin escalones' } },
  { code: 'ELEVATOR', audience: 'MOBILITY', label: { it: 'Ascensore', en: 'Elevator', es: 'Ascensor' } },
  { code: 'ACCESSIBLE_TOILET', audience: 'MOBILITY', label: { it: 'Bagno accessibile', en: 'Accessible toilet', es: 'Baño accesible' } },
  { code: 'WHEELCHAIR_ACCESSIBLE', audience: 'MOBILITY', label: { it: 'Accessibile in sedia a rotelle', en: 'Wheelchair accessible', es: 'Accesible en silla de ruedas' } },

  // Animali
  { code: 'DOGS_ALLOWED', audience: 'PETS', label: { it: 'Cani ammessi', en: 'Dogs allowed', es: 'Se admiten perros' } },
  { code: 'LARGE_DOGS_ALLOWED', audience: 'PETS', label: { it: 'Cani di taglia grande ammessi', en: 'Large dogs allowed', es: 'Perros grandes admitidos' } },
  { code: 'CATS_ALLOWED', audience: 'PETS', label: { it: 'Gatti ammessi', en: 'Cats allowed', es: 'Se admiten gatos' } },
  { code: 'WATER_BOWL', audience: 'PETS', label: { it: 'Ciotola d\'acqua', en: 'Water bowl', es: 'Cuenco de agua' } },
  { code: 'PET_OUTDOOR_AREA', audience: 'PETS', label: { it: 'Area esterna per animali', en: 'Outdoor pet area', es: 'Zona exterior mascotas' } },
] as const satisfies readonly FeatureDef[];

export type FeatureCode = (typeof FEATURES)[number]['code'];
export const FEATURE_CODES = FEATURES.map((f) => f.code) as [FeatureCode, ...FeatureCode[]];

/** Con chi viaggia l'utente: personalizza il feed e i filtri di default. */
export const TRAVELER_TYPES = [
  'FAMILY_WITH_KIDS',
  'SENIOR',
  'WITH_PETS',
  'REDUCED_MOBILITY',
  'SOLO',
  'COUPLE',
  'GROUP',
] as const;
export type TravelerType = (typeof TRAVELER_TYPES)[number];

/**
 * Fasce di budget per persona (in euro). Più utili del solo "€€€":
 * una famiglia di 4 ragiona su quanto spende a testa.
 */
export const PRICE_LEVELS = [
  { level: 0, label: 'Gratis', maxPerPerson: 0 },
  { level: 1, label: '€', maxPerPerson: 15 },
  { level: 2, label: '€€', maxPerPerson: 35 },
  { level: 3, label: '€€€', maxPerPerson: 70 },
  { level: 4, label: '€€€€', maxPerPerson: null },
] as const;

/** Soglia di conferme oltre la quale una caratteristica è "verificata dalla community". */
export const FEATURE_VERIFIED_THRESHOLD = 3;
