import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '@monopoly/shared';

// Connect to the server on the same host, port 3001. Works for localhost and
// LAN (roommate hits <your-ip>:5173 for the client, which connects back to
// <your-ip>:3001). Override with VITE_SERVER_URL for tunnels/prod.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ?? `http://${window.location.hostname}:3001`;

export type GameSocket = Socket<ServerToClient, ClientToServer>;

export const socket: GameSocket = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500,
});

// Per-TAB player id (sessionStorage, not localStorage) so that opening a new
// tab on the same machine is a DIFFERENT player — essential for testing
// multiplayer solo. It survives a reload of the same tab, so reconnect still
// re-attaches to the same player. (Tip: open a NEW tab — Cmd/Ctrl+T — rather
// than "Duplicate tab", which copies sessionStorage and would collide.)
export function getPlayerId(): string {
  let id = sessionStorage.getItem('monopoly:pid');
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('monopoly:pid', id);
  }
  return id;
}
