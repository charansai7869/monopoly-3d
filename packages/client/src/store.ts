import { create } from 'zustand';
import {
  legalActions,
  type Action, type ActionType, type GameEvent, type GameState, type PieceType,
} from '@monopoly/shared';
import { getPlayerId, socket } from './net/socket.js';

const savedPiece = (): PieceType => (localStorage.getItem('monopoly:piece') as PieceType) || 'car';

interface Store {
  connected: boolean;
  roomId: string | null;
  playerId: string;
  state: GameState | null;
  /** transient event stream for animations/toasts */
  lastEvents: GameEvent[];
  error: string | null;

  createRoom: (name: string, piece: PieceType) => void;
  joinRoom: (roomId: string, name: string, piece: PieceType) => void;
  send: (action: Action) => void;
  legal: () => ActionType[];
}

export const useStore = create<Store>((set, get) => {
  // Wire socket -> store once.
  socket.on('connect', () => {
    set({ connected: true });
    // If we were already in a room, re-join after a reconnect so the new
    // socket re-attaches to our player and we resync the full state.
    const { roomId, playerId } = get();
    if (roomId) {
      const name = localStorage.getItem('monopoly:name') ?? 'Player';
      socket.emit('joinRoom', { roomId, name, playerId, piece: savedPiece() }, () => {});
    }
  });
  socket.on('disconnect', () => set({ connected: false }));
  socket.on('state', (state) => set({ state }));
  socket.on('events', (events) => set({ lastEvents: events }));
  socket.on('joined', ({ roomId }) => set({ roomId }));
  socket.on('error', (message) => set({ error: message }));

  return {
    connected: socket.connected,
    roomId: null,
    playerId: getPlayerId(),
    state: null,
    lastEvents: [],
    error: null,

    createRoom: (name, piece) => {
      socket.emit('createRoom', { name, playerId: get().playerId, piece }, (res) => {
        if ('error' in res) set({ error: res.error });
        else set({ roomId: res.roomId, error: null });
      });
    },

    joinRoom: (roomId, name, piece) => {
      const id = roomId.trim().toUpperCase();
      socket.emit('joinRoom', { roomId: id, name, playerId: get().playerId, piece }, (res) => {
        if ('error' in res) set({ error: res.error });
        else set({ roomId: id, error: null });
      });
    },

    send: (action) => socket.emit('action', action),

    legal: () => {
      const { state, playerId } = get();
      return state ? legalActions(state, playerId) : [];
    },
  };
});
