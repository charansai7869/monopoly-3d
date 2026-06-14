// Derives which action types the given player may legally take right now.
// The client uses this to render exactly the right buttons; the server uses it
// as a first-pass guard before applyAction.

import { BOARD, groupSpaces, mortgageValue } from './board.js';
import { MIN_PLAYERS } from './engine.js';
import type { ActionType, GameState } from './types.js';

const MANAGE: ActionType[] = ['BUILD', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE'];

export function legalActions(s: GameState, playerId: string): ActionType[] {
  const out: ActionType[] = [];
  const p = s.players.find((x) => x.id === playerId);
  if (!p || p.bankrupt) return out;

  if (s.phase === 'lobby') {
    if (p.isHost && s.players.length >= MIN_PLAYERS) out.push('START');
    return out;
  }

  if (s.phase === 'ended') {
    if (p.isHost) out.push('RESTART');
    return out;
  }

  // Auction: any player may be the bidder; only the player on the clock acts.
  if (s.phase === 'auction') {
    if (s.auction?.turnId === playerId) out.push('BID', 'BID_PASS');
    return out;
  }

  // Trade responses are available to the recipient regardless of whose turn it is.
  if (s.trades.some((t) => t.toId === playerId)) out.push('ACCEPT_TRADE', 'REJECT_TRADE');
  else if (s.trades.some((t) => t.fromId === playerId)) out.push('REJECT_TRADE');

  const isCurrent = s.players[s.current]?.id === playerId;
  if (!isCurrent) return out; // otherwise only the active player acts

  switch (s.phase) {
    case 'preRoll':
      if (p.inJail) {
        out.push('ROLL_FOR_JAIL');
        if (p.money >= 50) out.push('PAY_JAIL');
        if (p.goojCards > 0) out.push('USE_JAIL_CARD');
      } else {
        out.push('ROLL');
      }
      break;
    case 'awaitBuy': {
      const def = BOARD[p.pos];
      if (p.money >= (def.price ?? 0)) out.push('BUY');
      out.push('DECLINE');
      break;
    }
    case 'postRoll':
      out.push('END_TURN');
      break;
  }

  // Property management (build/sell/mortgage) is allowed any time during your
  // own turn before/after rolling. These are gated per-space by propertyActions;
  // here we just permit the action TYPE so the server accepts it.
  if ((s.phase === 'preRoll' || s.phase === 'postRoll') &&
      s.board.some((b) => b.ownerId === playerId)) {
    out.push(...MANAGE);
  }
  // Propose a trade on your own turn (if there's anyone to trade with).
  if ((s.phase === 'preRoll' || s.phase === 'postRoll') && s.players.filter((p) => !p.bankrupt).length > 1) {
    out.push('PROPOSE_TRADE');
  }
  return out;
}

/**
 * Which management actions are legal on a SPECIFIC space for this player right
 * now. Drives the buttons inside the deed card. Mirrors the engine's checks.
 */
export function propertyActions(s: GameState, playerId: string, idx: number): ActionType[] {
  const out: ActionType[] = [];
  const p = s.players.find((x) => x.id === playerId);
  const sp = s.board[idx];
  const def = BOARD[idx];
  if (!p || p.bankrupt || s.players[s.current]?.id !== playerId) return out;
  if (s.phase !== 'preRoll' && s.phase !== 'postRoll') return out;
  if (sp.ownerId !== playerId || def.price == null) return out;

  if (sp.mortgaged) {
    if (p.money >= Math.ceil(mortgageValue(def) * 1.1)) out.push('UNMORTGAGE');
    return out;
  }

  if (def.kind === 'street' && def.group) {
    const group = groupSpaces(def.group);
    const fullSet = group.every((i) => s.board[i].ownerId === playerId);
    const noMort = group.every((i) => !s.board[i].mortgaged);
    const minH = Math.min(...group.map((i) => s.board[i].houses));
    const maxH = Math.max(...group.map((i) => s.board[i].houses));
    const canBuild = fullSet && noMort && sp.houses < 5 && sp.houses === minH &&
      p.money >= (def.houseCost ?? 0) &&
      (sp.houses === 4 ? s.bank.hotels > 0 : s.bank.houses > 0);
    if (canBuild) out.push('BUILD');
    if (sp.houses > 0 && sp.houses === maxH) out.push('SELL_HOUSE');
  }

  // Mortgage allowed only if no buildings remain in the group.
  const groupHasHouses = def.group
    ? groupSpaces(def.group).some((i) => s.board[i].houses > 0)
    : false;
  if (!groupHasHouses) out.push('MORTGAGE');

  return out;
}
