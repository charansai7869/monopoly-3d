// Central manifest of model files (served from public/models/).
// Filenames below match the Kenney City Kit packs as copied in. Missing files
// fall back to primitives automatically — see public/models/README.md.

const BASE = '/models';

// Central skyline: the named City-Pack buildings (recognisable + detailed),
// plus the Kenney skyscrapers for tall variety. All auto-normalised on load.
export const COMMERCIAL_BUILDINGS = [
  `${BASE}/city/skyscraper.glb`,
  `${BASE}/city/apartment.glb`,
  `${BASE}/city/cp-building.glb`,
  `${BASE}/city/large-building.glb`,
  `${BASE}/city/large-building2.glb`,
  `${BASE}/city/townhouse.glb`,
  `${BASE}/city/hospital.glb`,
  `${BASE}/city/bar.glb`,
  `${BASE}/city/building-skyscraper-b.glb`,
  `${BASE}/city/building-skyscraper-d.glb`,
];

// House on a developed property = the nice "house with driveway".
export const HOUSE_MODEL = `${BASE}/suburban/house-driveway.glb`;
// Hotel = the literal Hotel Building model.
export const HOTEL_MODEL = `${BASE}/city/hotel-building.glb`;

// Trees (from the suburban pack).
export const TREE_MODELS = [`${BASE}/suburban/tree-large.glb`, `${BASE}/suburban/tree-small.glb`];

// Kenney City Kit (Roads) — a straight road tile.
export const ROAD_TILE = `${BASE}/roads/road-straight.glb`;

// Poly Pizza token models, keyed by piece id. Missing → primitive PieceMesh.
export const TOKEN_MODELS: Record<string, string | undefined> = {
  car: `${BASE}/tokens/car.glb`,
  ship: undefined,
  dog: undefined,
  hat: undefined,
  cat: undefined,
  boot: undefined,
  thimble: undefined,
  iron: undefined,
};

// Optional Poly Pizza dice model (primitive dice are the default).
export const DICE_MODEL = `${BASE}/dice/die.glb`;
