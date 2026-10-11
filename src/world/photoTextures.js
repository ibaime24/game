// Photo-scanned PBR textures from Poly Haven (CC0), stored in public/textures.
// Loaded once before the world is built; texgen.js falls back to procedural maps for anything missing.
import * as THREE from 'three';

// texgen kind -> Poly Haven asset id
export const PHOTO_SOURCES = {
  grass: 'leafy_grass',
  dirt: 'forest_ground_04',
  rock: 'rock_wall_02',
  sand: 'coast_sand_01',
  snow: 'snow_02',
  cobble: 'cobblestone_floor_08',
  stonewall_grey: 'stone_wall_04',
  stonewall_white: 'stone_tile_wall',
  plaster: 'plastered_wall',
  timber: 'dark_wooden_planks',
  planks: 'old_wood_floor',
  crate: 'old_planks_02',
  roof: 'roof_slates_02',
  roofred: 'roof_tiles_14',
  bark: 'bark_brown_02',
  ayleid: 'sandstone_blocks_08',
  obrock: 'dark_rock_02',
  leather: 'fabric_leather_02',
};

export const photo = {};
let loading = null;

export function loadPhotoTextures(onProgress) {
  if (loading) return loading;
  const loader = new THREE.TextureLoader();
  const entries = Object.entries(PHOTO_SOURCES);
  let done = 0;
  const one = (url, srgb) => loader.loadAsync(url).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return t;
  });
  loading = Promise.all(entries.map(async ([kind, id]) => {
    try {
      const [map, normalMap] = await Promise.all([one(`/textures/${id}_diff.jpg`, true), one(`/textures/${id}_nor.jpg`, false)]);
      photo[kind] = { map, normalMap, source: id };
    } catch (e) {
      console.warn('Photo texture missing, using procedural fallback:', id, e?.message || e);
    }
    onProgress?.(++done / entries.length);
  }));
  return loading;
}
