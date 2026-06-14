import {
  applyAction, createGame, legalActions, mulberry32,
  type Action, type GameState,
} from '@monopoly/shared';

/** One Room owns a GameState plus the seeded RNG used for its dice/shuffles. */
export class Room {
  state: GameState;
  private rand: () => number;
  /** socket.id -> playerId, so a disconnect can flag the right player. */
  sockets = new Map<string, string>();

  constructor(public id: string, seed = (Math.random() * 2 ** 31) | 0) {
    this.state = createGame(id);
    this.rand = mulberry32(seed);
  }

  /** Validate against legalActions, then apply. Returns events for broadcast. */
  dispatch(action: Action) {
    // JOIN is always allowed during lobby; other actions are gated by legality.
    if (action.type !== 'JOIN') {
      const legal = legalActions(this.state, action.playerId);
      if (!legal.includes(action.type)) {
        return { events: [{ type: 'info' as const, text: `Illegal: ${action.type}` }], changed: false };
      }
    }
    const before = this.state;
    const { state, events } = applyAction(this.state, action, this.rand);
    this.state = state;
    return { events, changed: state !== before };
  }

  setConnected(playerId: string, connected: boolean) {
    const p = this.state.players.find((x) => x.id === playerId);
    if (p) p.connected = connected;
  }

  get empty() {
    return this.state.players.length === 0 || this.state.players.every((p) => !p.connected);
  }
}

const rooms = new Map<string, Room>();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(): string {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
  return c;
}

export function createRoom(): Room {
  let id = makeCode();
  while (rooms.has(id)) id = makeCode();
  const r = new Room(id);
  rooms.set(id, r);
  return r;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id.toUpperCase());
}

export function deleteRoom(id: string) {
  rooms.delete(id);
}
