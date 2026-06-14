// ============================================================================
// Shared types — the single contract between client and server.
// No runtime logic here, only shapes.
// ============================================================================

export type PlayerColor =
  | '#e6194b' // red
  | '#3cb44b' // green
  | '#ffe119' // yellow
  | '#4363d8' // blue
  | '#f58231' // orange
  | '#911eb4' // purple
  | '#42d4f4' // cyan
  | '#f032e6'; // magenta

export const PLAYER_COLORS: PlayerColor[] = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8',
  '#f58231', '#911eb4', '#42d4f4', '#f032e6',
];

// Selectable game tokens (classic Monopoly-style pieces).
export type PieceType = 'car' | 'hat' | 'ship' | 'dog' | 'cat' | 'boot' | 'thimble' | 'iron';

export const PIECES: { id: PieceType; label: string; emoji: string }[] = [
  { id: 'car', label: 'Race Car', emoji: '🏎️' },
  { id: 'hat', label: 'Top Hat', emoji: '🎩' },
  { id: 'ship', label: 'Battleship', emoji: '🚢' },
  { id: 'dog', label: 'Scottie Dog', emoji: '🐕' },
  { id: 'cat', label: 'Cat', emoji: '🐈' },
  { id: 'boot', label: 'Boot', emoji: '🥾' },
  { id: 'thimble', label: 'Thimble', emoji: '🧵' },
  { id: 'iron', label: 'Iron', emoji: '🔨' },
];

// ---------------------------------------------------------------------------
// Board space definitions (static — lives in board.ts)
// ---------------------------------------------------------------------------

export type ColorGroup =
  | 'brown' | 'lightblue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'darkblue';

export type SpaceKind =
  | 'go' | 'street' | 'railroad' | 'utility'
  | 'chance' | 'chest' | 'tax'
  | 'jail' | 'freeparking' | 'gotojail';

/** Static, immutable definition of a board space (index 0..39). */
export interface SpaceDef {
  idx: number;
  name: string;
  kind: SpaceKind;
  /** Purchase price (streets, railroads, utilities). */
  price?: number;
  /** Color group for streets. */
  group?: ColorGroup;
  /** Rent ladder for streets: [base, 1house, 2, 3, 4, hotel]. */
  rent?: [number, number, number, number, number, number];
  /** Cost to build one house/hotel on this street. */
  houseCost?: number;
  /** Mortgage value (defaults to price/2 if absent). */
  mortgage?: number;
  /** Tax amount for tax spaces. */
  tax?: number;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export type CardDeck = 'chance' | 'chest';

export type CardEffect =
  | { type: 'money'; amount: number } // +collect / -pay from bank
  | { type: 'payEachPlayer'; amount: number } // pay each other player
  | { type: 'collectEachPlayer'; amount: number } // collect from each other player
  | { type: 'moveTo'; idx: number; collectGo?: boolean }
  | { type: 'moveBy'; steps: number }
  | { type: 'goToJail' }
  | { type: 'getOutOfJailFree' }
  | { type: 'nearestRailroad' }
  | { type: 'nearestUtility' }
  | { type: 'repairs'; perHouse: number; perHotel: number };

export interface CardDef {
  id: string;
  deck: CardDeck;
  text: string;
  effect: CardEffect;
}

// ---------------------------------------------------------------------------
// Mutable game state
// ---------------------------------------------------------------------------

export type Phase =
  | 'lobby'        // waiting for players, not started
  | 'preRoll'      // current player must roll (or act in jail)
  | 'resolving'    // a tile action awaits (buy decision handled via awaitBuy)
  | 'awaitBuy'     // current player landed on unowned property: BUY or DECLINE
  | 'auction'      // a property is being auctioned
  | 'postRoll'     // player has resolved landing, may build/trade/mortgage then END_TURN
  | 'ended';       // game over, winner set

export interface Player {
  id: string;            // stable id (socket-independent, stored client-side)
  name: string;
  color: PlayerColor;
  piece: PieceType;      // chosen token model
  money: number;
  pos: number;           // 0..39
  inJail: boolean;
  jailTurns: number;     // failed roll attempts while in jail (0..3)
  goojCards: number;     // Get-Out-Of-Jail-Free cards held
  bankrupt: boolean;
  connected: boolean;
  isHost: boolean;       // created the room
}

/** Mutable per-space state (ownership / development). */
export interface SpaceState {
  idx: number;
  ownerId: string | null;
  houses: number;        // 0..4 houses, 5 = hotel
  mortgaged: boolean;
}

export interface AuctionState {
  spaceIdx: number;
  highBid: number;
  highBidderId: string | null;
  /** Player ids still in the auction (haven't passed). */
  active: string[];
  /** Whose turn to bid right now. */
  turnId: string;
}

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  giveSpaces: number[];
  getSpaces: number[];
  giveMoney: number;
  getMoney: number;
  giveGooj: number;
  getGooj: number;
}

export interface LogEntry {
  t: number;             // timestamp
  text: string;
}

export interface GameState {
  roomId: string;
  phase: Phase;
  players: Player[];
  current: number;             // index into players of the active player
  dice: [number, number] | null;
  doubles: number;             // consecutive doubles this turn (0..3)
  board: SpaceState[];         // length 40
  decks: { chance: string[]; chest: string[] }; // ordered card-id queues
  bank: { houses: number; hotels: number };     // remaining in supply
  auction: AuctionState | null;
  trades: TradeOffer[];
  log: LogEntry[];
  winner: string | null;
}

// ---------------------------------------------------------------------------
// Actions — everything a client can request. Validated server-side.
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'JOIN'; playerId: string; name: string; piece?: PieceType }
  | { type: 'START'; playerId: string }
  | { type: 'RESTART'; playerId: string }
  | { type: 'ROLL'; playerId: string }
  | { type: 'BUY'; playerId: string }
  | { type: 'DECLINE'; playerId: string }
  | { type: 'BID'; playerId: string; amount: number }
  | { type: 'BID_PASS'; playerId: string }
  | { type: 'BUILD'; playerId: string; spaceIdx: number }
  | { type: 'SELL_HOUSE'; playerId: string; spaceIdx: number }
  | { type: 'MORTGAGE'; playerId: string; spaceIdx: number }
  | { type: 'UNMORTGAGE'; playerId: string; spaceIdx: number }
  | { type: 'PROPOSE_TRADE'; playerId: string; offer: Omit<TradeOffer, 'id'> }
  | { type: 'ACCEPT_TRADE'; playerId: string; tradeId: string }
  | { type: 'REJECT_TRADE'; playerId: string; tradeId: string }
  | { type: 'PAY_JAIL'; playerId: string }
  | { type: 'USE_JAIL_CARD'; playerId: string }
  | { type: 'ROLL_FOR_JAIL'; playerId: string }
  | { type: 'END_TURN'; playerId: string }
  | { type: 'BANKRUPT'; playerId: string };

export type ActionType = Action['type'];

// ---------------------------------------------------------------------------
// Events — emitted by the engine alongside the new state, to drive
// client-side animation and toasts (NOT authoritative state).
// ---------------------------------------------------------------------------

export type GameEvent =
  | { type: 'rolled'; playerId: string; dice: [number, number] }
  | { type: 'moved'; playerId: string; from: number; to: number; passedGo: boolean }
  | { type: 'bought'; playerId: string; spaceIdx: number }
  | { type: 'paidRent'; fromId: string; toId: string; amount: number; spaceIdx: number }
  | { type: 'card'; playerId: string; deck: CardDeck; text: string }
  | { type: 'jailed'; playerId: string }
  | { type: 'freed'; playerId: string }
  | { type: 'auctionStarted'; spaceIdx: number }
  | { type: 'auctionWon'; playerId: string | null; spaceIdx: number; amount: number }
  | { type: 'built'; playerId: string; spaceIdx: number; houses: number }
  | { type: 'traded'; fromId: string; toId: string }
  | { type: 'bankrupt'; playerId: string; toId: string | null }
  | { type: 'won'; playerId: string }
  | { type: 'info'; text: string };

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

// ---------------------------------------------------------------------------
// Socket.IO message contract
// ---------------------------------------------------------------------------

export interface ServerToClient {
  state: (state: GameState) => void;
  events: (events: GameEvent[]) => void;
  error: (message: string) => void;
  joined: (info: { roomId: string; playerId: string }) => void;
}

export interface ClientToServer {
  createRoom: (
    p: { name: string; playerId: string; piece?: PieceType },
    ack: (res: { roomId: string } | { error: string }) => void,
  ) => void;
  joinRoom: (
    p: { roomId: string; name: string; playerId: string; piece?: PieceType },
    ack: (res: { ok: true } | { error: string }) => void,
  ) => void;
  action: (a: Action) => void;
}
