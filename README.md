# Monopoly 3D — online multiplayer

Full-rules Monopoly you can play with friends in the browser. 3D board (free-orbit camera + auto-follow), authoritative server so the game never desyncs.

## Stack
- **shared** (`packages/shared`) — pure-TS rules engine, board data, cards, types. Imported by both client and server (one source of truth).
- **server** (`packages/server`) — Node + Socket.IO. Holds the authoritative `GameState` per room; validates every action and broadcasts full snapshots.
- **client** (`packages/client`) — Vite + React + React-Three-Fiber + Zustand.

## Run it

```bash
npm install
npm run dev        # starts server (:3001) + client (:5173) together
```

Open http://localhost:5173 → **Create a new game** → share the 6-letter room code.

### Test multiplayer on one machine
Open 2–3 more browser tabs (or incognito windows) → **Join with code** → take turns.

### Play with roommates (quick tunnel)
```bash
npx cloudflared tunnel --url http://localhost:5173
```
Share the tunnel URL + room code. (Permanent always-on hosting comes later — avoid free tiers that cold-start.)

## Verify the engine without a browser
```bash
npx tsx packages/shared/src/smoke.ts   # plays deterministic turns, asserts invariants
```

## Milestones
- [x] **M1** — Monorepo, shared rules core, Socket.IO rooms, lobby + functional turn loop.
- [x] **M2** — 3D board (40 Indian-city tiles), animated tokens, 3D dice, free-orbit + auto-follow camera (centered).
- [x] **M3** — Clickable tiles → deed cards (rent ladder/owner), auto-deed on buy, player panels with owned-property chips + net worth.
- [x] **M4** — Card-draw popup (Chance/Chest), event toasts, in-jail banner; engine fix: nearest-Railroad 2× & nearest-Utility 10× special rent.
- [x] **M5** — Houses/hotels (even-build + 32/12 bank limits), mortgage/unmortgage (10%), deed-card manage buttons, real 3D house+hotel models.
- [x] **M6** — Auctions: DECLINE → live bidding, highest bid wins, pays the bank.
- [x] **M7** — Trading: propose properties + cash + jail cards, accept/reject incoming offers.
- [x] **M8** — Auto-liquidation on debt → bankruptcy (to creditor/bank), win screen with standings, reconnect auto-rejoin, mobile-responsive layout.

**All 8 milestones complete.** Full official ruleset is implemented and verified by `smoke.ts` (build/mortgage, auction, trade, bankruptcy/win scenarios).

### Phase 2 (post-M8) — in progress
- [x] **Auto-dice toggle** — per-player; when on, dice roll automatically on your turn.
- [x] **Character/token selection** — pick a piece (car, hat, ship, dog, cat, boot, thimble, iron) at the lobby; rendered as distinct 3D models.
- [x] **"Board comes to life" 3D** — grass, trees, river, ferris-wheel exhibition, central city skyline, 3D jail cell.
- [x] **Rematch** — host can restart with the same players from the win screen.
- [x] **`deploy.md`** — Railway / Fly.io / VPS guide (not yet deployed).
- [ ] Deferred: manual liquidation picker, trade counter-offers, turn timer (documented in the plan).

See `deploy.md` to put it online once you're happy with local testing.
