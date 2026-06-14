// Headless engine smoke test: plays a few deterministic turns and asserts
// invariants. Run with: npx tsx packages/shared/src/smoke.ts
import { applyAction, BOARD, createGame, legalActions, mulberry32 } from './index.js';
import type { Action, GameState } from './index.js';

const rand = mulberry32(42);
let s: GameState = createGame('TEST42');

function dispatch(a: Action) {
  if (a.type !== 'JOIN') {
    const legal = legalActions(s, a.playerId);
    if (!legal.includes(a.type)) throw new Error(`Illegal ${a.type} in phase ${s.phase}`);
  }
  s = applyAction(s, a, rand).state;
}

// Setup
dispatch({ type: 'JOIN', playerId: 'A', name: 'Alice' });
dispatch({ type: 'JOIN', playerId: 'B', name: 'Bob' });
dispatch({ type: 'START', playerId: 'A' });
assert(s.phase === 'preRoll', 'starts in preRoll');
assert(s.players.length === 2, 'two players');
assert(s.players.every((p) => p.money === 1500), 'everyone starts at $1500');
assert(s.decks.chance.length === 16 && s.decks.chest.length === 16, 'decks shuffled to 16 each');

// Play 40 half-turns, always resolving landing then ending turn.
let guard = 0;
for (let i = 0; i < 40 && s.phase !== 'ended'; i++) {
  const p = s.players[s.current];
  const legal = legalActions(s, p.id);
  if (legal.includes('ROLL')) dispatch({ type: 'ROLL', playerId: p.id });
  else if (legal.includes('ROLL_FOR_JAIL')) dispatch({ type: 'ROLL_FOR_JAIL', playerId: p.id });

  // Resolve a buy decision (always buy if affordable).
  if (s.phase === 'awaitBuy') {
    const cp = s.players[s.current];
    const canBuy = legalActions(s, cp.id).includes('BUY');
    dispatch(canBuy ? { type: 'BUY', playerId: cp.id } : { type: 'DECLINE', playerId: cp.id });
  }
  if (s.phase === 'postRoll') {
    const cp = s.players[s.current];
    dispatch({ type: 'END_TURN', playerId: cp.id });
  }
  if (++guard > 1000) throw new Error('loop guard');
}

// Invariants
const totalCash = s.players.reduce((a, p) => a + p.money, 0);
assert(totalCash > 0, 'cash exists in the system');
assert(s.board.filter((b) => b.ownerId).length > 0, 'some property was bought');
assert(s.players.every((p) => p.pos >= 0 && p.pos < 40), 'all positions valid');

// --- M5: build / mortgage scenario on a forced monopoly --------------------
{
  let g = createGame('BUILD1');
  const r2 = mulberry32(7);
  const disp = (a: Action) => { g = applyAction(g, a, r2).state; };
  disp({ type: 'JOIN', playerId: 'A', name: 'A' });
  disp({ type: 'JOIN', playerId: 'B', name: 'B' });
  disp({ type: 'START', playerId: 'A' });
  // Hand player A the full brown set (idx 1 & 3) directly.
  g.board[1].ownerId = 'A';
  g.board[3].ownerId = 'A';
  const houseBefore = g.bank.houses;
  // Build evenly: 1 on each, then a 2nd on each.
  g = applyAction(g, { type: 'BUILD', playerId: 'A', spaceIdx: 1 }, r2).state;
  g = applyAction(g, { type: 'BUILD', playerId: 'A', spaceIdx: 3 }, r2).state;
  assert(g.board[1].houses === 1 && g.board[3].houses === 1, 'even build: 1 house each');
  // Trying a 2nd house on idx1 before idx3 catches up should still work (idx3==1 too).
  g = applyAction(g, { type: 'BUILD', playerId: 'A', spaceIdx: 1 }, r2).state;
  assert(g.board[1].houses === 2, 'second house built');
  assert(g.bank.houses === houseBefore - 3, 'bank houses decremented by 3');
  // Cannot mortgage while the group has houses.
  const beforeMoney = g.players[0].money;
  g = applyAction(g, { type: 'MORTGAGE', playerId: 'A', spaceIdx: 1 }, r2).state;
  assert(!g.board[1].mortgaged, 'cannot mortgage with houses in the group');
  assert(g.players[0].money === beforeMoney, 'no money gained on illegal mortgage');
  // Sell all houses then mortgage.
  g = applyAction(g, { type: 'SELL_HOUSE', playerId: 'A', spaceIdx: 1 }, r2).state; // 2->1
  g = applyAction(g, { type: 'SELL_HOUSE', playerId: 'A', spaceIdx: 1 }, r2).state; // 1->0
  g = applyAction(g, { type: 'SELL_HOUSE', playerId: 'A', spaceIdx: 3 }, r2).state; // 1->0
  assert(g.board[1].houses === 0 && g.board[3].houses === 0, 'all houses sold');
  assert(g.bank.houses === houseBefore, 'bank houses restored');
  g = applyAction(g, { type: 'MORTGAGE', playerId: 'A', spaceIdx: 3 }, r2).state;
  assert(g.board[3].mortgaged, 'mortgage works once houses are gone');
  console.log('✅ build/mortgage OK');
}

// --- M6: auction scenario --------------------------------------------------
{
  let g = createGame('AUC1');
  const r3 = mulberry32(11);
  const step = (a: Action) => { g = applyAction(g, a, r3).state; };
  step({ type: 'JOIN', playerId: 'A', name: 'A' });
  step({ type: 'JOIN', playerId: 'B', name: 'B' });
  step({ type: 'JOIN', playerId: 'C', name: 'C' });
  step({ type: 'START', playerId: 'A' });
  // Force A onto a buyable tile and decline → auction.
  g.players[0].pos = 1; // Guwahati ($60)
  g.phase = 'awaitBuy';
  step({ type: 'DECLINE', playerId: 'A' });
  assert((g.phase as string) === 'auction' && g.auction?.spaceIdx === 1, 'decline starts auction');
  assert(g.auction!.turnId === 'A', 'auction begins with first bidder');
  step({ type: 'BID', playerId: 'A', amount: 10 });
  step({ type: 'BID', playerId: 'B', amount: 20 });
  step({ type: 'BID_PASS', playerId: 'C' });
  step({ type: 'BID_PASS', playerId: 'A' }); // only B (high bidder) remains
  assert(g.auction === null, 'auction settled');
  assert(g.board[1].ownerId === 'B', 'high bidder won the property');
  assert(g.players[1].money === 1500 - 20, 'winner charged the bid');
  assert((g.phase as string) === 'postRoll', 'returns to postRoll after auction');
  console.log('✅ auction OK');
}

// --- M7: trade scenario ----------------------------------------------------
{
  let g = createGame('TRD1');
  const r4 = mulberry32(99);
  const step = (a: Action) => { g = applyAction(g, a, r4).state; };
  step({ type: 'JOIN', playerId: 'A', name: 'A' });
  step({ type: 'JOIN', playerId: 'B', name: 'B' });
  step({ type: 'START', playerId: 'A' });
  g.board[1].ownerId = 'A'; // A owns Guwahati
  g.board[6].ownerId = 'B'; // B owns Jaipur
  // A (current) proposes: give Guwahati + $50 for B's Jaipur.
  step({ type: 'PROPOSE_TRADE', playerId: 'A', offer: {
    fromId: 'A', toId: 'B', giveSpaces: [1], getSpaces: [6], giveMoney: 50, getMoney: 0, giveGooj: 0, getGooj: 0,
  } });
  assert(g.trades.length === 1, 'trade proposed');
  // B accepts.
  step({ type: 'ACCEPT_TRADE', playerId: 'B', tradeId: g.trades[0].id });
  assert(g.board[1].ownerId === 'B', 'A gave Guwahati to B');
  assert(g.board[6].ownerId === 'A', 'A received Jaipur');
  assert(g.players[0].money === 1500 - 50, 'A paid $50');
  assert(g.players[1].money === 1500 + 50, 'B received $50');
  assert(g.trades.length === 0, 'trade cleared after accept');
  console.log('✅ trade OK');
}

// --- M8: liquidation + bankruptcy + win ------------------------------------
{
  let g = createGame('BNK');
  const r5 = mulberry32(3);
  const step = (a: Action) => { g = applyAction(g, a, r5).state; };
  step({ type: 'JOIN', playerId: 'A', name: 'A' });
  step({ type: 'JOIN', playerId: 'B', name: 'B' });
  step({ type: 'START', playerId: 'A' });

  // Rig the board: B owns every property, with hotels on the priciest, so any
  // landing is lethal for poor A. A owns nothing and has little cash.
  for (const b of g.board) if (BOARD[b.idx].price != null) b.ownerId = 'B';
  for (const i of [31, 32, 34, 37, 39]) g.board[i].houses = 5;
  g.players[0].money = 50;

  // Play out auto-turns until the game ends by A's bankruptcy.
  // (phaseOf casts to string to stop TS narrowing across the mutating closure.)
  const phaseOf = (x: GameState): string => x.phase;
  let guard = 0;
  while (phaseOf(g) !== 'ended' && guard++ < 300) {
    const p = g.players[g.current];
    const lg = legalActions(g, p.id);
    if (lg.includes('ROLL')) step({ type: 'ROLL', playerId: p.id });
    else if (lg.includes('ROLL_FOR_JAIL')) step({ type: 'ROLL_FOR_JAIL', playerId: p.id });
    if (phaseOf(g) === 'awaitBuy') step({ type: 'DECLINE', playerId: g.players[g.current].id });
    let ag = 0;
    while (phaseOf(g) === 'auction' && ag++ < 12) step({ type: 'BID_PASS', playerId: g.auction!.turnId });
    if (phaseOf(g) === 'postRoll') step({ type: 'END_TURN', playerId: g.players[g.current].id });
  }
  assert(g.phase === 'ended', 'game ends via bankruptcy');
  assert(g.winner === 'B', 'B wins after A goes bankrupt');
  assert(g.players[0].bankrupt, 'A is marked bankrupt');
  console.log('✅ bankruptcy/win OK');
}

console.log('✅ smoke OK');
console.log('   turns played, positions:', s.players.map((p) => `${p.name}@${p.pos} $${p.money}`).join(', '));
console.log('   owned spaces:', s.board.filter((b) => b.ownerId).length);

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error('❌ FAILED:', msg); process.exit(1); }
}
