// Board geometry. The board lies flat on the XZ plane (Y up), centered at the
// origin. Index 0 (GO) is the bottom-right corner; indices increase clockwise
// (bottom edge → left edge → top edge → right edge), matching a real board.

export const C = 2.4;                 // corner tile size
export const T = 1.5;                 // edge tile width (along the edge)
export const D = 2.4;                 // tile depth (toward the centre)
export const HALF = C + 4.5 * T;      // half board span so 9 edge tiles fit exactly
export const TILE_TOP = 0.2;          // y of the tile surface
const EDGE = HALF - C;                // half-length of the edge-tile span
const DEPTH_C = HALF - D / 2;         // distance of an edge tile's centre from origin

export interface TilePose {
  x: number;
  z: number;
  rotY: number;     // rotation about Y so the tile's local -Z faces the centre
  corner: boolean;
}

export function tilePose(i: number): TilePose {
  switch (i) {
    case 0:  return { x: HALF - C / 2, z: HALF - C / 2, rotY: 0, corner: true };           // GO (bottom-right)
    case 10: return { x: -(HALF - C / 2), z: HALF - C / 2, rotY: Math.PI / 2, corner: true }; // Jail (bottom-left)
    case 20: return { x: -(HALF - C / 2), z: -(HALF - C / 2), rotY: Math.PI, corner: true }; // Free Parking (top-left)
    case 30: return { x: HALF - C / 2, z: -(HALF - C / 2), rotY: -Math.PI / 2, corner: true }; // Go To Jail (top-right)
  }
  if (i >= 1 && i <= 9) {            // bottom edge, x decreasing
    return { x: EDGE - (i - 0.5) * T, z: DEPTH_C, rotY: 0, corner: false };
  }
  if (i >= 11 && i <= 19) {          // left edge, z decreasing
    const k = i - 10;
    return { x: -DEPTH_C, z: EDGE - (k - 0.5) * T, rotY: Math.PI / 2, corner: false };
  }
  if (i >= 21 && i <= 29) {          // top edge, x increasing
    const k = i - 20;
    return { x: -EDGE + (k - 0.5) * T, z: -DEPTH_C, rotY: Math.PI, corner: false };
  }
  const k = i - 30;                  // right edge 31..39, z increasing
  return { x: DEPTH_C, z: -EDGE + (k - 0.5) * T, rotY: -Math.PI / 2, corner: false };
}

export function tileCenter(i: number): [number, number] {
  const p = tilePose(i);
  return [p.x, p.z];
}

/** World (x,z) for a fractional ring index — used to animate tokens between tiles. */
export function ringPosition(frac: number): [number, number] {
  const n = 40;
  const f = ((frac % n) + n) % n;
  const a = Math.floor(f);
  const b = (a + 1) % n;
  const t = f - a;
  const [ax, az] = tileCenter(a);
  const [bx, bz] = tileCenter(b);
  return [ax + (bx - ax) * t, az + (bz - az) * t];
}

/** Small fan-out offset so multiple tokens on one tile don't fully overlap. */
export function tokenOffset(slot: number): [number, number] {
  const cols = 3;
  const dx = (slot % cols) - 1;
  const dz = Math.floor(slot / cols) - 1;
  return [dx * 0.45, dz * 0.45];
}
