# 3D model assets (CC0)

Drop downloaded `.glb` files here and the game auto-upgrades from primitive
shapes to real 3D models. Nothing here is committed binaries — you download the
free packs and copy the files in. Until a file exists, the game falls back to a
primitive so it never breaks.

## What to download (all Creative Commons CC0 — free, commercial OK)

| Pack | URL | Goes in |
|---|---|---|
| Kenney **City Kit (Commercial)** | https://kenney.nl/assets/city-kit-commercial | `public/models/city/` |
| Kenney **City Kit (Suburban)** | https://kenney.nl/assets/city-kit-suburban | `public/models/suburban/` |
| Kenney **City Kit (Roads)** | https://kenney.nl/assets/city-kit-roads | `public/models/roads/` |
| Poly Pizza **dice** | https://poly.pizza/search/dice | `public/models/dice/die.glb` |
| Poly Pizza **car / ship / dog…** | https://poly.pizza | `public/models/tokens/<piece>.glb` |

## Steps
1. On each Kenney page click **Download** (gets a `.zip`).
2. Unzip. Inside there's a `Models/GLB` (or `Models/GLB format`) folder of `.glb` files.
3. Copy those `.glb` files into the matching folder above.
4. The expected filenames are listed in `src/scene/assets.ts`. Kenney's real
   names may differ — either rename to match, **or** run:
   ```bash
   ls public/models/city public/models/suburban public/models/roads
   ```
   and paste the output so the manifest can be updated to the exact names.
5. For Poly Pizza: open a model → **Download → GLTF**, unzip, rename the `.glb`
   to the target name (e.g. `car.glb`) and drop it in `public/models/tokens/`.

## Folder layout
```
public/models/
├── city/        # Kenney commercial buildings (building-*.glb, skyscraper-*.glb)
├── suburban/    # Kenney suburban house.glb
├── roads/       # Kenney road-straight.glb
├── tokens/      # car.glb, ship.glb, dog.glb, ... (Poly Pizza)
└── dice/        # die.glb (Poly Pizza)
```

License: keep each pack's `License.txt`. All chosen packs are CC0 (no
attribution required, but crediting Kenney / the Poly Pizza authors is kind).
