# Deploying Monopoly 3D

> **Do this only after you're happy with local testing.** The game runs fine locally with `npm run dev`; this guide is for putting it on a permanent URL so you and your roommates can play anytime without your laptop running.

## What needs to be hosted

Two pieces:

| Piece | What it is | Hosting need |
|---|---|---|
| **Server** (`packages/server`) | Node + Socket.IO, holds game state | **Always-on** process (WebSockets). **Avoid free tiers that cold-start** (Render free, etc.) — that 30–50s wake-up is the exact lag we set out to avoid. |
| **Client** (`packages/client`) | Static Vite build (HTML/JS) | Any static host / CDN. |

The client connects to the server via `VITE_SERVER_URL` (falls back to `http://<host>:3001`). For production you set this to the deployed server's URL.

---

## Option A — Railway (simplest, recommended)

Railway keeps the process warm and handles WebSockets.

### 1. Server
1. Push this repo to GitHub.
2. On [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**.
3. Set the service **root** to the repo, and:
   - **Build command:** `npm install`
   - **Start command:** `npm -w @monopoly/server run start`
4. Railway sets `PORT` automatically — the server already reads `process.env.PORT`.
5. After deploy, note the public URL, e.g. `https://monopoly-server.up.railway.app`.

### 2. Client
1. Add an env var locally for the build:
   ```bash
   VITE_SERVER_URL=https://monopoly-server.up.railway.app npm run build -w @monopoly/client
   ```
2. Deploy the static folder `packages/client/dist` to **Netlify**, **Vercel**, **Cloudflare Pages**, or a second Railway static service.
   - Netlify/Vercel: drag-and-drop `dist`, or point them at the repo with build command
     `VITE_SERVER_URL=<server-url> npm run build -w @monopoly/client` and publish dir `packages/client/dist`.

### 3. CORS
The server currently allows all origins (`cors: { origin: '*' }` in `packages/server/src/index.ts`). For a personal game that's fine. To lock it down, set it to your client URL.

---

## Option B — Fly.io (one box, always-on)

Good if you want server + client on one always-on machine.

1. `flyctl launch` in the repo (creates `fly.toml`).
2. Add a `Dockerfile` that builds the client and runs the server, serving `dist` statically. (The server's HTTP handler can be extended to serve the static client folder.)
3. `flyctl deploy`. Fly keeps at least one machine warm if you disable auto-stop.

---

## Option C — Cheap VPS (most control)

On any $5 VPS (DigitalOcean / Hetzner / Lightsail):

```bash
git clone <repo> && cd monopoly
npm install
VITE_SERVER_URL=https://yourdomain.com npm run build -w @monopoly/client
# serve client dist with nginx/caddy; run the server with pm2:
npm i -g pm2
PORT=3001 pm2 start "npm -w @monopoly/server run start" --name monopoly
pm2 save && pm2 startup
```
Put nginx/Caddy in front: serve `packages/client/dist` as static, and reverse-proxy `/socket.io` to `localhost:3001` (so client + server share one origin — then you don't even need `VITE_SERVER_URL`).

---

## Production checklist
- [ ] Server on an **always-on** host (no cold start).
- [ ] Client built with the correct `VITE_SERVER_URL` (or same-origin reverse proxy).
- [ ] WebSocket upgrade works through the proxy (nginx: `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).
- [ ] (Optional) tighten CORS `origin` to the client URL.
- [ ] Test: open the deployed URL on two devices, create + join a room, play a full turn, drop one device's wifi and confirm it resyncs.

## Notes
- Rooms live **in server memory** — a server restart clears active games. For a casual game with friends that's acceptable; persisting to Redis is a future enhancement if you want games to survive restarts.
- Only one server instance is assumed. Multiple instances would need a shared store + Socket.IO adapter (Redis) so rooms are visible across instances.
