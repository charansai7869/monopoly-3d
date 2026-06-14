// ============================================================================
// Authoritative game engine — a pure reducer.
//   applyAction(state, action, rand) -> { state, events }
// The server runs this as the single source of truth. The client runs the
// same code (via legalActions) to render only valid moves.
//
// Randomness is injected (rand) so GameState stays fully serializable; the
// server owns a seeded RNG per room. Decks are stored as ordered id-queues in
// state, so card draws are deterministic from state alone.
// ============================================================================

import {
  BOARD, GROUP_COLOR, GO_SALARY, JAIL_FINE, JAIL_IDX,
  RAILROADS, UTILITIES, groupSpaces, mortgageValue,
} from './board.js';
import { CARD_BY_ID, CHANCE, CHEST } from './cards.js';
import { rollDie, shuffle } from './rng.js';
import type {
  Action, ApplyResult, GameEvent, GameState, Player, PlayerColor, PieceType, SpaceState, TradeOffer,
} from './types.js';
import { PIECES, PLAYER_COLORS } from './types.js';

const STARTING_MONEY = 1500;
const MAX_PLAYERS = 8;
// Minimum players to start. Set to 1 so a single laptop can test solo.
export const MIN_PLAYERS = 1;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function createGame(roomId: string): GameState {
  return {
    roomId,
    phase: 'lobby',
    players: [],
    current: 0,
    dice: null,
    doubles: 0,
    board: BOARD.map<SpaceState>((s) => ({ idx: s.idx, ownerId: null, houses: 0, mortgaged: false })),
    decks: { chance: [], chest: [] },
    bank: { houses: 32, hotels: 12 },
    auction: null,
    trades: [],
    log: [],
    winner: null,
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const clone = (s: GameState): GameState =>
  typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s));

const cur = (s: GameState): Player => s.players[s.current];
const byId = (s: GameState, id: string) => s.players.find((p) => p.id === id);
const active = (s: GameState) => s.players.filter((p) => !p.bankrupt);

function log(s: GameState, text: string) {
  s.log.push({ t: Date.now(), text });
  if (s.log.length > 200) s.log.shift();
}

/** Net worth a player can raise: cash + mortgageable property + sellable houses. */
export function liquidatable(s: GameState, p: Player): number {
  let total = p.money;
  for (const sp of s.board) {
    if (sp.ownerId !== p.id) continue;
    const def = BOARD[sp.idx];
    if (sp.houses > 0) total += sp.houses * Math.floor((def.houseCost ?? 0) / 2);
    if (!sp.mortgaged) total += mortgageValue(def);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function applyAction(prev: GameState, a: Action, rand: () => number): ApplyResult {
  const s = clone(prev);
  const events: GameEvent[] = [];

  switch (a.type) {
    case 'JOIN': return join(s, a.playerId, a.name, a.piece, events);
    case 'START': return start(s, a.playerId, rand, events);
    case 'RESTART': return restart(s, a.playerId, events);
    case 'ROLL': return roll(s, a.playerId, rand, events);
    case 'BUY': return buy(s, a.playerId, events);
    case 'DECLINE': return decline(s, a.playerId, events);
    case 'BID': return bid(s, a.playerId, a.amount, events);
    case 'BID_PASS': return bidPass(s, a.playerId, events);
    case 'PROPOSE_TRADE': return proposeTrade(s, a.playerId, a.offer, events);
    case 'ACCEPT_TRADE': return acceptTrade(s, a.playerId, a.tradeId, events);
    case 'REJECT_TRADE': return rejectTrade(s, a.playerId, a.tradeId, events);
    case 'PAY_JAIL': return payJail(s, a.playerId, events);
    case 'USE_JAIL_CARD': return useJailCard(s, a.playerId, events);
    case 'ROLL_FOR_JAIL': return rollForJail(s, a.playerId, rand, events);
    case 'END_TURN': return endTurn(s, a.playerId, events);
    case 'BUILD': return build(s, a.playerId, a.spaceIdx, events);
    case 'SELL_HOUSE': return sellHouse(s, a.playerId, a.spaceIdx, events);
    case 'MORTGAGE': return mortgage(s, a.playerId, a.spaceIdx, events);
    case 'UNMORTGAGE': return unmortgage(s, a.playerId, a.spaceIdx, events);
    // Auction / trade / bankruptcy land in later milestones.
    default:
      return { state: prev, events: [{ type: 'info', text: `Unhandled action ${a.type}` }] };
  }
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------

function join(s: GameState, playerId: string, name: string, piece: PieceType | undefined, events: GameEvent[]): ApplyResult {
  const existing = byId(s, playerId);
  if (existing) {
    existing.connected = true;
    existing.name = name || existing.name;
    if (piece && s.phase === 'lobby') existing.piece = piece;
    return { state: s, events };
  }
  if (s.phase !== 'lobby') return fail(s, 'Game already started');
  if (s.players.length >= MAX_PLAYERS) return fail(s, 'Room full');

  const color: PlayerColor = PLAYER_COLORS[s.players.length];
  // Default piece = the one at this seat index, avoiding obvious dup if free.
  const taken = new Set(s.players.map((p) => p.piece));
  const fallback = PIECES.find((pc) => !taken.has(pc.id))?.id ?? PIECES[s.players.length % PIECES.length].id;
  s.players.push({
    id: playerId, name: name || `Player ${s.players.length + 1}`, color,
    piece: piece ?? fallback,
    money: STARTING_MONEY, pos: 0, inJail: false, jailTurns: 0,
    goojCards: 0, bankrupt: false, connected: true,
    isHost: s.players.length === 0,
  });
  log(s, `${name} joined`);
  return { state: s, events };
}

function restart(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  const p = byId(s, playerId);
  if (!p?.isHost) return fail(s, 'Only the host can restart');
  if (s.phase !== 'ended') return fail(s, 'Game is still in progress');
  // Reset to a fresh lobby, keeping the same players, names, colours, and pieces.
  for (const pl of s.players) {
    pl.money = STARTING_MONEY; pl.pos = 0; pl.inJail = false; pl.jailTurns = 0;
    pl.goojCards = 0; pl.bankrupt = false;
  }
  s.board = s.board.map((b) => ({ idx: b.idx, ownerId: null, houses: 0, mortgaged: false }));
  s.decks = { chance: [], chest: [] };
  s.bank = { houses: 32, hotels: 12 };
  s.auction = null; s.trades = []; s.winner = null;
  s.dice = null; s.doubles = 0; s.current = 0;
  s.phase = 'lobby';
  s.log = [];
  log(s, 'Rematch! Back to the lobby.');
  events.push({ type: 'info', text: 'Rematch — back to the lobby' });
  return { state: s, events };
}

function start(s: GameState, playerId: string, rand: () => number, events: GameEvent[]): ApplyResult {
  const p = byId(s, playerId);
  if (!p?.isHost) return fail(s, 'Only the host can start');
  if (s.phase !== 'lobby') return fail(s, 'Already started');
  if (s.players.length < MIN_PLAYERS) return fail(s, `Need at least ${MIN_PLAYERS} player(s)`);

  s.decks.chance = shuffle(CHANCE.map((c) => c.id), rand);
  s.decks.chest = shuffle(CHEST.map((c) => c.id), rand);
  s.phase = 'preRoll';
  s.current = 0;
  log(s, 'Game started');
  events.push({ type: 'info', text: 'Game started' });
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// Rolling & movement
// ---------------------------------------------------------------------------

function roll(s: GameState, playerId: string, rand: () => number, events: GameEvent[]): ApplyResult {
  if (s.phase !== 'preRoll') return fail(s, 'Not time to roll');
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  if (p.inJail) return fail(s, 'You are in jail — pay, use card, or roll for doubles');

  const d1 = rollDie(rand), d2 = rollDie(rand);
  s.dice = [d1, d2];
  const isDouble = d1 === d2;
  events.push({ type: 'rolled', playerId: p.id, dice: [d1, d2] });

  if (isDouble) {
    s.doubles += 1;
    if (s.doubles >= 3) {
      log(s, `${p.name} rolled 3 doubles → Jail`);
      sendToJail(s, p, events);
      s.phase = 'postRoll';
      return { state: s, events };
    }
  } else {
    s.doubles = 0;
  }

  movePlayer(s, p, d1 + d2, events);
  resolveLanding(s, p, d1 + d2, rand, events);
  return { state: s, events };
}

function movePlayer(s: GameState, p: Player, steps: number, events: GameEvent[]) {
  const from = p.pos;
  let to = (p.pos + steps) % 40;
  if (to < 0) to += 40;
  const passedGo = steps > 0 && to < from;
  if (passedGo) { p.money += GO_SALARY; log(s, `${p.name} passed GO (+$${GO_SALARY})`); }
  p.pos = to;
  events.push({ type: 'moved', playerId: p.id, from, to, passedGo });
}

function moveTo(s: GameState, p: Player, idx: number, collectGo: boolean, events: GameEvent[]) {
  const from = p.pos;
  const passedGo = collectGo && idx <= from && idx !== from;
  if (passedGo) p.money += GO_SALARY;
  p.pos = idx;
  events.push({ type: 'moved', playerId: p.id, from, to: idx, passedGo });
}

// ---------------------------------------------------------------------------
// Landing resolution
// ---------------------------------------------------------------------------

function resolveLanding(s: GameState, p: Player, diceTotal: number, rand: () => number, events: GameEvent[]) {
  const def = BOARD[p.pos];
  switch (def.kind) {
    case 'street':
    case 'railroad':
    case 'utility': {
      const sp = s.board[p.pos];
      if (sp.ownerId === null) {
        s.phase = 'awaitBuy'; // player decides BUY or DECLINE
      } else if (sp.ownerId !== p.id && !sp.mortgaged) {
        payRent(s, p, sp, diceTotal, events);
        afterResolve(s);
      } else {
        afterResolve(s);
      }
      break;
    }
    case 'tax': {
      charge(s, p, def.tax ?? 0, null, events);
      log(s, `${p.name} paid $${def.tax} tax`);
      afterResolve(s);
      break;
    }
    case 'gotojail':
      sendToJail(s, p, events);
      afterResolve(s);
      break;
    case 'chance':
      drawCard(s, p, 'chance', rand, events);
      afterResolve(s);
      break;
    case 'chest':
      drawCard(s, p, 'chest', rand, events);
      afterResolve(s);
      break;
    default: // go, jail (just visiting), freeparking
      afterResolve(s);
  }
}

/** After a landing is fully resolved, go to postRoll (or back to preRoll if doubles). */
function afterResolve(s: GameState) {
  if (s.phase === 'awaitBuy' || s.phase === 'auction' || s.phase === 'ended') return;
  s.phase = 'postRoll';
}

// ---------------------------------------------------------------------------
// Rent
// ---------------------------------------------------------------------------

function payRent(s: GameState, p: Player, sp: SpaceState, diceTotal: number, events: GameEvent[]) {
  const owner = byId(s, sp.ownerId!);
  if (!owner || owner.bankrupt) return;
  const def = BOARD[sp.idx];
  let rent = 0;

  if (def.kind === 'street') {
    const ladder = def.rent!;
    if (sp.houses > 0) rent = ladder[sp.houses];
    else {
      const ownsGroup = groupSpaces(def.group!).every((i) => s.board[i].ownerId === owner.id);
      rent = ownsGroup ? ladder[0] * 2 : ladder[0];
    }
  } else if (def.kind === 'railroad') {
    const owned = RAILROADS.filter((i) => s.board[i].ownerId === owner.id).length;
    rent = 25 * 2 ** (owned - 1); // 25,50,100,200
  } else if (def.kind === 'utility') {
    const owned = UTILITIES.filter((i) => s.board[i].ownerId === owner.id).length;
    rent = (owned === 2 ? 10 : 4) * diceTotal;
  }

  charge(s, p, rent, owner, events);
  events.push({ type: 'paidRent', fromId: p.id, toId: owner.id, amount: rent, spaceIdx: sp.idx });
  log(s, `${p.name} paid $${rent} rent to ${owner.name}`);
}

// ---------------------------------------------------------------------------
// Money & charging
// ---------------------------------------------------------------------------

/**
 * Raise cash for a player who owes more than they hold, by automatically
 * selling buildings (highest first) then mortgaging properties until they can
 * cover `target` or run out. (A manual "choose what to sell" flow is a future
 * nicety; auto-liquidation keeps every rupee accounted for and the game moving.)
 */
function autoRaise(s: GameState, p: Player, target: number) {
  let guard = 0;
  while (p.money < target && guard++ < 1000) {
    const withHouses = s.board
      .filter((b) => b.ownerId === p.id && b.houses > 0)
      .sort((a, b) => b.houses - a.houses);
    if (withHouses.length > 0) {
      const sp = withHouses[0];
      const def = BOARD[sp.idx];
      if (sp.houses === 5) { s.bank.hotels += 1; sp.houses = 4; }
      else { s.bank.houses += 1; sp.houses -= 1; }
      p.money += Math.floor((def.houseCost ?? 0) / 2);
      continue;
    }
    const m = s.board.find((b) => b.ownerId === p.id && !b.mortgaged && BOARD[b.idx].price != null);
    if (m) { m.mortgaged = true; p.money += mortgageValue(BOARD[m.idx]); continue; }
    break; // nothing left to sell or mortgage
  }
}

/** Charge `amount` from p, paying `to` (or the bank if null). Liquidates or bankrupts as needed. */
function charge(s: GameState, p: Player, amount: number, to: Player | null, events: GameEvent[]) {
  if (amount <= 0) return;
  if (p.money < amount && liquidatable(s, p) >= amount) {
    autoRaise(s, p, amount); // sell/mortgage to cover the debt
    log(s, `${p.name} liquidated assets to raise cash`);
  }
  if (p.money >= amount) {
    p.money -= amount;
    if (to) to.money += amount;
    return;
  }
  // Truly insolvent — hand whatever's left to the creditor and go bankrupt.
  if (to) to.money += p.money;
  p.money = 0;
  bankrupt(s, p, to, events);
}

function bankrupt(s: GameState, p: Player, creditor: Player | null, events: GameEvent[]) {
  p.bankrupt = true;
  // Transfer or release all property.
  for (const sp of s.board) {
    if (sp.ownerId !== p.id) continue;
    if (creditor) { sp.ownerId = creditor.id; }
    else { sp.ownerId = null; sp.houses = 0; sp.mortgaged = false; }
  }
  if (creditor) creditor.goojCards += p.goojCards;
  p.goojCards = 0;
  log(s, `${p.name} went bankrupt`);
  events.push({ type: 'bankrupt', playerId: p.id, toId: creditor?.id ?? null });
  checkWin(s, events);
}

function checkWin(s: GameState, events: GameEvent[]) {
  const alive = active(s);
  if (alive.length === 1 && s.players.length > 1) {
    s.phase = 'ended';
    s.winner = alive[0].id;
    events.push({ type: 'won', playerId: alive[0].id });
    log(s, `${alive[0].name} wins!`);
  }
}

// ---------------------------------------------------------------------------
// Jail
// ---------------------------------------------------------------------------

function sendToJail(s: GameState, p: Player, events: GameEvent[]) {
  p.pos = JAIL_IDX;
  p.inJail = true;
  p.jailTurns = 0;
  s.doubles = 0;
  events.push({ type: 'jailed', playerId: p.id });
}

function payJail(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId || !p.inJail || s.phase !== 'preRoll') return fail(s, 'Cannot pay jail now');
  charge(s, p, JAIL_FINE, null, events);
  p.inJail = false; p.jailTurns = 0;
  events.push({ type: 'freed', playerId: p.id });
  log(s, `${p.name} paid $${JAIL_FINE} to leave jail`);
  return { state: s, events };
}

function useJailCard(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId || !p.inJail || p.goojCards <= 0 || s.phase !== 'preRoll')
    return fail(s, 'No jail card to use');
  p.goojCards -= 1; p.inJail = false; p.jailTurns = 0;
  events.push({ type: 'freed', playerId: p.id });
  log(s, `${p.name} used a Get Out of Jail Free card`);
  return { state: s, events };
}

function rollForJail(s: GameState, playerId: string, rand: () => number, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId || !p.inJail || s.phase !== 'preRoll') return fail(s, 'Cannot roll for jail now');
  const d1 = rollDie(rand), d2 = rollDie(rand);
  s.dice = [d1, d2];
  events.push({ type: 'rolled', playerId: p.id, dice: [d1, d2] });
  if (d1 === d2) {
    p.inJail = false; p.jailTurns = 0;
    events.push({ type: 'freed', playerId: p.id });
    log(s, `${p.name} rolled doubles and left jail`);
    movePlayer(s, p, d1 + d2, events);
    resolveLanding(s, p, d1 + d2, rand, events);
  } else {
    p.jailTurns += 1;
    if (p.jailTurns >= 3) {
      charge(s, p, JAIL_FINE, null, events);
      p.inJail = false; p.jailTurns = 0;
      events.push({ type: 'freed', playerId: p.id });
      log(s, `${p.name} served 3 turns, paid $${JAIL_FINE}, and moved`);
      movePlayer(s, p, d1 + d2, events);
      resolveLanding(s, p, d1 + d2, rand, events);
    } else {
      log(s, `${p.name} failed to roll doubles (${p.jailTurns}/3)`);
      s.phase = 'postRoll';
    }
  }
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function drawCard(s: GameState, p: Player, deck: 'chance' | 'chest', rand: () => number, events: GameEvent[]) {
  const queue = s.decks[deck];
  const id = queue.shift();
  if (!id) return;
  const card = CARD_BY_ID[id];
  events.push({ type: 'card', playerId: p.id, deck, text: card.text });
  log(s, `${p.name} drew: ${card.text}`);

  const e = card.effect;
  let keepCard = false;
  switch (e.type) {
    case 'money':
      if (e.amount >= 0) p.money += e.amount;
      else charge(s, p, -e.amount, null, events);
      break;
    case 'payEachPlayer':
      for (const o of active(s)) if (o.id !== p.id) charge(s, p, e.amount, o, events);
      break;
    case 'collectEachPlayer':
      for (const o of active(s)) if (o.id !== p.id) charge(s, o, e.amount, p, events);
      break;
    case 'moveTo': moveTo(s, p, e.idx, !!e.collectGo, events); landAfterCard(s, p, rand, events); break;
    case 'moveBy': movePlayer(s, p, e.steps, events); landAfterCard(s, p, rand, events); break;
    case 'goToJail': sendToJail(s, p, events); break;
    case 'getOutOfJailFree': p.goojCards += 1; keepCard = true; break;
    case 'nearestRailroad': {
      moveToNearest(s, p, RAILROADS, events);
      const sp = s.board[p.pos];
      if (sp.ownerId && sp.ownerId !== p.id && !sp.mortgaged) {
        // Official rule: pay the owner TWICE the normal railroad rent.
        const owner = byId(s, sp.ownerId)!;
        const owned = RAILROADS.filter((i) => s.board[i].ownerId === owner.id).length;
        const rent = 2 * (25 * 2 ** (owned - 1));
        charge(s, p, rent, owner, events);
        events.push({ type: 'paidRent', fromId: p.id, toId: owner.id, amount: rent, spaceIdx: sp.idx });
        log(s, `${p.name} paid $${rent} (2×) railroad rent to ${owner.name}`);
      } else if (!sp.ownerId) {
        s.phase = 'awaitBuy';
      }
      break;
    }
    case 'nearestUtility': {
      moveToNearest(s, p, UTILITIES, events);
      const sp = s.board[p.pos];
      if (sp.ownerId && sp.ownerId !== p.id && !sp.mortgaged) {
        // Official rule: throw the dice and pay the owner 10× that throw.
        const owner = byId(s, sp.ownerId)!;
        const d1 = rollDie(rand), d2 = rollDie(rand);
        s.dice = [d1, d2];
        const rent = 10 * (d1 + d2);
        charge(s, p, rent, owner, events);
        events.push({ type: 'rolled', playerId: p.id, dice: [d1, d2] });
        events.push({ type: 'paidRent', fromId: p.id, toId: owner.id, amount: rent, spaceIdx: sp.idx });
        log(s, `${p.name} threw ${d1 + d2} and paid $${rent} (10×) utility rent to ${owner.name}`);
      } else if (!sp.ownerId) {
        s.phase = 'awaitBuy';
      }
      break;
    }
    case 'repairs': {
      let owed = 0;
      for (const sp of s.board) if (sp.ownerId === p.id) {
        if (sp.houses === 5) owed += e.perHotel; else owed += sp.houses * e.perHouse;
      }
      charge(s, p, owed, null, events);
      break;
    }
  }
  // GOOJF cards are held by the player; everything else returns to bottom of deck.
  if (!keepCard) queue.push(id);
}

function landAfterCard(s: GameState, p: Player, rand: () => number, events: GameEvent[]) {
  // After a card moves you, resolve the new tile (but don't re-enter postRoll
  // here — resolveLanding sets phase appropriately, may open awaitBuy).
  const total = s.dice ? s.dice[0] + s.dice[1] : 0;
  resolveLanding(s, p, total, rand, events);
}

function moveToNearest(s: GameState, p: Player, targets: number[], events: GameEvent[]) {
  let idx = targets.find((t) => t > p.pos);
  const passedGo = idx === undefined;
  if (idx === undefined) idx = targets[0];
  if (passedGo) p.money += GO_SALARY;
  const from = p.pos; p.pos = idx;
  events.push({ type: 'moved', playerId: p.id, from, to: idx, passedGo });
}

// ---------------------------------------------------------------------------
// Buy / decline
// ---------------------------------------------------------------------------

function buy(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  if (s.phase !== 'awaitBuy') return fail(s, 'Nothing to buy');
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  const def = BOARD[p.pos];
  const price = def.price ?? 0;
  if (p.money < price) return fail(s, 'Not enough money');
  p.money -= price;
  s.board[p.pos].ownerId = p.id;
  events.push({ type: 'bought', playerId: p.id, spaceIdx: p.pos });
  log(s, `${p.name} bought ${def.name} for $${price}`);
  s.phase = 'postRoll';
  return { state: s, events };
}

function decline(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  if (s.phase !== 'awaitBuy') return fail(s, 'Nothing to decline');
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  log(s, `${p.name} declined ${BOARD[p.pos].name} — going to auction`);
  return startAuction(s, p.pos, events);
}

// ---------------------------------------------------------------------------
// Auction (any solvent player may bid; highest bid wins, pays the bank)
// ---------------------------------------------------------------------------

function startAuction(s: GameState, spaceIdx: number, events: GameEvent[]): ApplyResult {
  const bidders = s.players.filter((pl) => !pl.bankrupt && pl.money >= 1).map((pl) => pl.id);
  if (bidders.length === 0) {
    log(s, `${BOARD[spaceIdx].name} went unsold (no one can bid)`);
    s.phase = 'postRoll';
    return { state: s, events };
  }
  s.auction = { spaceIdx, highBid: 0, highBidderId: null, active: bidders, turnId: bidders[0] };
  s.phase = 'auction';
  events.push({ type: 'auctionStarted', spaceIdx });
  log(s, `Auction started for ${BOARD[spaceIdx].name}`);
  return { state: s, events };
}

function bid(s: GameState, playerId: string, amount: number, events: GameEvent[]): ApplyResult {
  const a = s.auction;
  if (s.phase !== 'auction' || !a) return fail(s, 'No auction in progress');
  if (a.turnId !== playerId) return fail(s, 'Not your turn to bid');
  const p = byId(s, playerId)!;
  if (!Number.isFinite(amount) || amount <= a.highBid) return fail(s, 'Bid must beat the current bid');
  if (amount > p.money) return fail(s, 'You cannot afford that bid');
  a.highBid = amount;
  a.highBidderId = playerId;
  log(s, `${p.name} bid $${amount}`);
  // Advance to the next still-active bidder.
  const i = a.active.indexOf(a.turnId);
  a.turnId = a.active[(i + 1) % a.active.length];
  return { state: s, events };
}

function bidPass(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  const a = s.auction;
  if (s.phase !== 'auction' || !a) return fail(s, 'No auction in progress');
  if (a.turnId !== playerId) return fail(s, 'Not your turn to bid');
  const idx = a.active.indexOf(playerId);
  a.active.splice(idx, 1);
  log(s, `${byId(s, playerId)!.name} passed`);

  if (a.active.length === 0) {
    settleAuction(s, events); // nobody wanted it
  } else if (a.active.length === 1 && a.highBidderId === a.active[0]) {
    settleAuction(s, events); // only the high bidder remains
  } else {
    a.turnId = a.active[idx % a.active.length]; // next bidder after the one who passed
  }
  return { state: s, events };
}

function settleAuction(s: GameState, events: GameEvent[]) {
  const a = s.auction!;
  if (a.highBidderId && a.highBid > 0) {
    const winner = byId(s, a.highBidderId)!;
    winner.money -= a.highBid;
    s.board[a.spaceIdx].ownerId = winner.id;
    events.push({ type: 'auctionWon', playerId: winner.id, spaceIdx: a.spaceIdx, amount: a.highBid });
    log(s, `${winner.name} won ${BOARD[a.spaceIdx].name} for $${a.highBid}`);
  } else {
    events.push({ type: 'auctionWon', playerId: null, spaceIdx: a.spaceIdx, amount: 0 });
    log(s, `${BOARD[a.spaceIdx].name} went unsold`);
  }
  s.auction = null;
  s.phase = 'postRoll';
}

// ---------------------------------------------------------------------------
// Trading (properties + money + Get-Out-of-Jail-Free cards)
// ---------------------------------------------------------------------------

function hasHousesInGroup(s: GameState, idx: number): boolean {
  const def = BOARD[idx];
  if (def.kind !== 'street' || !def.group) return false;
  return groupSpaces(def.group).some((i) => s.board[i].houses > 0);
}

function proposeTrade(s: GameState, playerId: string, offer: Omit<TradeOffer, 'id'>, events: GameEvent[]): ApplyResult {
  if (s.players[s.current]?.id !== playerId) return fail(s, 'Propose trades on your own turn');
  if (offer.fromId !== playerId) return fail(s, 'Malformed offer');
  const from = byId(s, offer.fromId);
  const to = byId(s, offer.toId);
  if (!from || !to || from.bankrupt || to.bankrupt || from.id === to.id) return fail(s, 'Invalid trade partner');
  if (!offer.giveSpaces.every((i) => s.board[i].ownerId === from.id)) return fail(s, "You don't own all offered properties");
  if (!offer.getSpaces.every((i) => s.board[i].ownerId === to.id)) return fail(s, "Partner doesn't own those properties");
  if ([...offer.giveSpaces, ...offer.getSpaces].some((i) => hasHousesInGroup(s, i)))
    return fail(s, 'Sell all buildings in those colour sets before trading');
  if (offer.giveMoney < 0 || offer.getMoney < 0 || offer.giveGooj < 0 || offer.getGooj < 0) return fail(s, 'Bad amounts');
  if (from.money < offer.giveMoney) return fail(s, 'You lack that cash');
  if (from.goojCards < offer.giveGooj) return fail(s, 'You lack that many jail cards');
  if (offer.giveSpaces.length + offer.getSpaces.length + offer.giveMoney + offer.getMoney + offer.giveGooj + offer.getGooj === 0)
    return fail(s, 'Empty trade');

  const id = `t${s.trades.length}-${from.id}-${to.id}`;
  s.trades.push({ id, ...offer });
  log(s, `${from.name} proposed a trade to ${to.name}`);
  events.push({ type: 'info', text: `${from.name} proposed a trade to ${to.name}` });
  return { state: s, events };
}

function acceptTrade(s: GameState, playerId: string, tradeId: string, events: GameEvent[]): ApplyResult {
  const t = s.trades.find((x) => x.id === tradeId);
  if (!t) return fail(s, 'Trade no longer available');
  if (t.toId !== playerId) return fail(s, 'Only the recipient can accept');
  const from = byId(s, t.fromId);
  const to = byId(s, t.toId);
  if (!from || !to) return fail(s, 'Invalid trade');
  // Re-validate (state may have changed since the offer).
  if (!t.giveSpaces.every((i) => s.board[i].ownerId === from.id)) return fail(s, 'Offer is now invalid');
  if (!t.getSpaces.every((i) => s.board[i].ownerId === to.id)) return fail(s, 'Offer is now invalid');
  if (from.money < t.giveMoney || to.money < t.getMoney) return fail(s, 'Someone lacks the cash now');
  if (from.goojCards < t.giveGooj || to.goojCards < t.getGooj) return fail(s, 'Someone lacks the jail cards now');

  for (const i of t.giveSpaces) s.board[i].ownerId = to.id;
  for (const i of t.getSpaces) s.board[i].ownerId = from.id;
  from.money += t.getMoney - t.giveMoney;
  to.money += t.giveMoney - t.getMoney;
  from.goojCards += t.getGooj - t.giveGooj;
  to.goojCards += t.giveGooj - t.getGooj;

  s.trades = s.trades.filter((x) => x.id !== tradeId);
  events.push({ type: 'traded', fromId: from.id, toId: to.id });
  log(s, `${from.name} and ${to.name} completed a trade`);
  return { state: s, events };
}

function rejectTrade(s: GameState, playerId: string, tradeId: string, events: GameEvent[]): ApplyResult {
  const t = s.trades.find((x) => x.id === tradeId);
  if (!t) return fail(s, 'Trade not found');
  if (t.toId !== playerId && t.fromId !== playerId) return fail(s, 'Not your trade');
  s.trades = s.trades.filter((x) => x.id !== tradeId);
  log(s, `A trade was ${t.toId === playerId ? 'rejected' : 'withdrawn'}`);
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// End turn
// ---------------------------------------------------------------------------

function endTurn(s: GameState, playerId: string, events: GameEvent[]): ApplyResult {
  if (s.phase !== 'postRoll') return fail(s, 'Resolve your move first');
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');

  // Rolled doubles (and not jailed) → same player rolls again.
  if (s.doubles > 0 && s.doubles < 3 && !p.inJail) {
    s.phase = 'preRoll';
    s.dice = null;
    return { state: s, events };
  }

  s.doubles = 0;
  s.dice = null;
  // Advance to next non-bankrupt player.
  do {
    s.current = (s.current + 1) % s.players.length;
  } while (s.players[s.current].bankrupt);
  s.phase = 'preRoll';
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// Building & mortgaging (current player only, during their own turn)
// ---------------------------------------------------------------------------

function build(s: GameState, playerId: string, idx: number, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  const def = BOARD[idx];
  const sp = s.board[idx];
  if (def.kind !== 'street') return fail(s, 'You can only build on streets');
  if (sp.ownerId !== p.id) return fail(s, 'You do not own this');
  const group = groupSpaces(def.group!);
  if (!group.every((i) => s.board[i].ownerId === p.id)) return fail(s, 'Need the full colour set');
  if (group.some((i) => s.board[i].mortgaged)) return fail(s, 'Unmortgage the set first');
  if (sp.houses >= 5) return fail(s, 'Already a hotel');
  const minH = Math.min(...group.map((i) => s.board[i].houses));
  if (sp.houses !== minH) return fail(s, 'Build evenly across the set');
  const cost = def.houseCost!;
  if (p.money < cost) return fail(s, 'Not enough money');

  if (sp.houses === 4) {
    if (s.bank.hotels <= 0) return fail(s, 'No hotels left in the bank');
    s.bank.hotels -= 1;
    s.bank.houses += 4; // the 4 houses go back to the bank
    sp.houses = 5;
  } else {
    if (s.bank.houses <= 0) return fail(s, 'Housing shortage — no houses left in the bank');
    s.bank.houses -= 1;
    sp.houses += 1;
  }
  p.money -= cost;
  events.push({ type: 'built', playerId: p.id, spaceIdx: idx, houses: sp.houses });
  log(s, `${p.name} built on ${def.name} (now ${sp.houses === 5 ? 'a hotel' : sp.houses + ' house(s)'})`);
  return { state: s, events };
}

function sellHouse(s: GameState, playerId: string, idx: number, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  const def = BOARD[idx];
  const sp = s.board[idx];
  if (def.kind !== 'street' || sp.ownerId !== p.id) return fail(s, 'Nothing to sell here');
  if (sp.houses === 0) return fail(s, 'No buildings to sell');
  const group = groupSpaces(def.group!);
  const maxH = Math.max(...group.map((i) => s.board[i].houses));
  if (sp.houses !== maxH) return fail(s, 'Sell evenly across the set');
  const refund = Math.floor((def.houseCost ?? 0) / 2);

  if (sp.houses === 5) {
    if (s.bank.houses < 4) return fail(s, 'Bank lacks 4 houses to break the hotel');
    s.bank.houses -= 4;
    s.bank.hotels += 1;
    sp.houses = 4;
  } else {
    s.bank.houses += 1;
    sp.houses -= 1;
  }
  p.money += refund;
  events.push({ type: 'built', playerId: p.id, spaceIdx: idx, houses: sp.houses });
  log(s, `${p.name} sold a building on ${def.name} (+$${refund})`);
  return { state: s, events };
}

function mortgage(s: GameState, playerId: string, idx: number, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  const def = BOARD[idx];
  const sp = s.board[idx];
  if (def.price == null || sp.ownerId !== p.id) return fail(s, 'You cannot mortgage this');
  if (sp.mortgaged) return fail(s, 'Already mortgaged');
  if (def.group && groupSpaces(def.group).some((i) => s.board[i].houses > 0))
    return fail(s, 'Sell all buildings in this set first');
  sp.mortgaged = true;
  const value = mortgageValue(def);
  p.money += value;
  log(s, `${p.name} mortgaged ${def.name} (+$${value})`);
  return { state: s, events };
}

function unmortgage(s: GameState, playerId: string, idx: number, events: GameEvent[]): ApplyResult {
  const p = cur(s);
  if (p.id !== playerId) return fail(s, 'Not your turn');
  const def = BOARD[idx];
  const sp = s.board[idx];
  if (sp.ownerId !== p.id || !sp.mortgaged) return fail(s, 'Nothing to unmortgage');
  const cost = Math.ceil(mortgageValue(def) * 1.1); // principal + 10% interest
  if (p.money < cost) return fail(s, 'Not enough money');
  p.money -= cost;
  sp.mortgaged = false;
  log(s, `${p.name} unmortgaged ${def.name} (-$${cost})`);
  return { state: s, events };
}

// ---------------------------------------------------------------------------
function fail(s: GameState, message: string): ApplyResult {
  return { state: s, events: [{ type: 'info', text: message }] };
}

export { GROUP_COLOR };
