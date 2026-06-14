import { useEffect, useRef, useState } from 'react';
import { BOARD, GROUP_COLOR, liquidatable, propertyActions, type ActionType, type CardDeck, type Player } from '@monopoly/shared';
import { useStore } from '../store.js';
import { GameScene } from '../scene/GameScene.js';
import { DeedView } from './DeedView.js';
import { CardModal } from './CardModal.js';
import { AuctionModal } from './AuctionModal.js';
import { TradeModal } from './TradeModal.js';
import { WinScreen } from './WinScreen.js';

const ACTION_LABEL: Partial<Record<ActionType, string>> = {
  START: '▶ Start game',
  ROLL: '🎲 Roll',
  BUY: '🏠 Buy',
  DECLINE: '✋ Decline',
  END_TURN: '⏭ End turn',
  PAY_JAIL: '💵 Pay $50 (jail)',
  USE_JAIL_CARD: '🃏 Use jail card',
  ROLL_FOR_JAIL: '🎲 Roll for doubles',
};

/** Small colored chips for the properties a player owns. */
function ownedChips(p: Player, board: { idx: number; ownerId: string | null }[]) {
  return board
    .filter((b) => b.ownerId === p.id)
    .map((b) => {
      const def = BOARD[b.idx];
      const color = def.group ? GROUP_COLOR[def.group]
        : def.kind === 'railroad' ? '#2b2b2b'
        : def.kind === 'utility' ? '#8a8a8a' : '#999';
      return { idx: b.idx, color };
    });
}

interface Toast { id: number; text: string }

export function RoomView() {
  const { state, playerId, roomId, send, legal, lastEvents } = useStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [card, setCard] = useState<{ deck: CardDeck; text: string; who: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showTrade, setShowTrade] = useState(false);
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760);
  const [autoRoll, setAutoRoll] = useState(() => localStorage.getItem('monopoly:autoRoll') === '1');
  const toastId = useRef(0);
  const autoFired = useRef(false);

  const toggleAutoRoll = () => {
    setAutoRoll((v) => { localStorage.setItem('monopoly:autoRoll', v ? '0' : '1'); return !v; });
  };

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Turn engine events into a card popup + transient toasts.
  useEffect(() => {
    if (!state || lastEvents.length === 0) return;
    const name = (id: string | null) => state.players.find((p) => p.id === id)?.name ?? '?';
    const add = (text: string) => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { id, text }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
    };
    for (const e of lastEvents) {
      if (e.type === 'card') setCard({ deck: e.deck, text: e.text, who: name(e.playerId) });
      else if (e.type === 'paidRent') add(`💸 ${name(e.fromId)} paid $${e.amount} to ${name(e.toId)}`);
      else if (e.type === 'jailed') add(`🔒 ${name(e.playerId)} was sent to Jail`);
      else if (e.type === 'bought') add(`🏠 ${name(e.playerId)} bought ${BOARD[e.spaceIdx].name}`);
      else if (e.type === 'won') add(`🏆 ${name(e.playerId)} wins!`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvents]);

  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  const current = state.players[state.current];
  const myTurn = current?.id === playerId;
  // Management + trade actions have their own UI, not the global bar.
  const HIDDEN: ActionType[] = ['BUILD', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE',
    'PROPOSE_TRADE', 'ACCEPT_TRADE', 'REJECT_TRADE'];
  const allLegal = legal();
  const actions = allLegal.filter((a) => !HIDDEN.includes(a));
  const canTrade = allLegal.includes('PROPOSE_TRADE');
  const incoming = state.trades.filter((t) => t.toId === playerId);

  // Auto-dice: if enabled, roll automatically on my turn (once per turn).
  const canRoll = allLegal.includes('ROLL');
  useEffect(() => {
    if (autoRoll && canRoll && !autoFired.current) {
      autoFired.current = true;
      const t = setTimeout(() => send({ type: 'ROLL', playerId }), 700);
      return () => clearTimeout(t);
    }
    if (!canRoll) autoFired.current = false; // reset for next turn
  }, [autoRoll, canRoll, playerId, send]);

  // Which deed to show: an explicit click wins; otherwise auto-show the tile
  // the active player just landed on when a buy decision is pending.
  const autoIdx = state.phase === 'awaitBuy' ? current?.pos ?? null : null;
  const deedIdx = selected ?? autoIdx;

  return (
    <div style={S.wrap}>
      <header style={S.header}>
        <div>
          <span style={S.room}>Room {roomId}</span>
          <button style={S.copy} onClick={() => navigator.clipboard?.writeText(roomId!)}>copy code</button>
        </div>
        <div style={S.phase}>
          {state.phase === 'lobby'
            ? 'Waiting for players…'
            : state.phase === 'ended'
              ? `🏆 ${state.players.find((p) => p.id === state.winner)?.name} wins!`
              : `${current?.name}'s turn`}
          {state.dice && <span style={S.dice}> 🎲 {state.dice[0]} + {state.dice[1]} = {state.dice[0] + state.dice[1]}</span>}
        </div>
      </header>

      <div style={{ ...S.body, ...(narrow ? { flexDirection: 'column' } : {}) }}>
        {/* Players */}
        <div style={{ ...S.players, ...(narrow ? S.playersNarrow : {}) }}>
          {state.players.map((p) => {
            const chips = ownedChips(p, state.board);
            return (
              <div key={p.id} style={{
                ...S.player,
                borderColor: p.id === current?.id ? p.color : 'transparent',
                opacity: p.bankrupt ? 0.4 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ ...S.swatch, background: p.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={S.pname}>
                      {p.name}{p.id === playerId ? ' (you)' : ''}{p.isHost ? ' 👑' : ''}
                      {!p.connected ? ' ⚪️' : ''}
                    </div>
                    <div style={S.pmeta}>
                      ${p.money} · {BOARD[p.pos].name}{p.inJail ? ' · 🔒 jail' : ''}
                    </div>
                  </div>
                </div>
                <div style={S.chipRow}>
                  {chips.map((c) => (
                    <span key={c.idx} title={BOARD[c.idx].name}
                      onClick={() => setSelected(c.idx)}
                      style={{ ...S.chip, background: c.color }} />
                  ))}
                  {chips.length > 0 && <span style={S.networth}>net ${liquidatable(state, p)}</span>}
                </div>
                {p.id === playerId && (
                  <label style={S.autoRoll}>
                    <input type="checkbox" checked={autoRoll} onChange={toggleAutoRoll} />
                    Auto-roll on my turn
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {/* Center: live 3D board */}
        <div style={S.center} onClick={() => setSelected(null)}>
          <GameScene state={state} onPickTile={(i) => setSelected(i)} />

          {state.phase === 'lobby' && (
            <div style={S.lobbyOverlay}>
              <strong style={{ fontSize: 17 }}>Waiting to start</strong>
              <p style={{ marginTop: 6, color: '#bfe9d2' }}>
                Share code <b>{roomId}</b>. Open a new tab (not “duplicate”) to add a player.
              </p>
            </div>
          )}

          {/* Deed card overlay */}
          {deedIdx != null && (
            <div style={S.deedWrap} onClick={(e) => e.stopPropagation()}>
              <DeedView idx={deedIdx} state={state} onClose={() => setSelected(null)}
                manage={myTurn ? propertyActions(state, playerId, deedIdx) : []}
                onAction={(t) => send({ type: t, playerId, spaceIdx: deedIdx } as never)} />
            </div>
          )}

          {/* Card draw popup */}
          {card && (
            <div onClick={(e) => e.stopPropagation()}>
              <CardModal {...card} onClose={() => setCard(null)} />
            </div>
          )}

          {/* Live auction */}
          {state.phase === 'auction' && (
            <div onClick={(e) => e.stopPropagation()}>
              <AuctionModal state={state} playerId={playerId}
                onBid={(amt) => send({ type: 'BID', playerId, amount: amt })}
                onPass={() => send({ type: 'BID_PASS', playerId })} />
            </div>
          )}

          {/* Trade proposer */}
          {showTrade && (
            <div onClick={(e) => e.stopPropagation()}>
              <TradeModal state={state} playerId={playerId} onClose={() => setShowTrade(false)}
                onPropose={(offer) => send({ type: 'PROPOSE_TRADE', playerId, offer })} />
            </div>
          )}

          {/* Incoming trade offers addressed to me */}
          {incoming.length > 0 && (
            <div style={S.incomingWrap} onClick={(e) => e.stopPropagation()}>
              {incoming.map((t) => {
                const from = state.players.find((p) => p.id === t.fromId);
                const summary = (spaces: number[], money: number, gooj: number) => {
                  const parts = [
                    ...spaces.map((i) => BOARD[i].name),
                    money > 0 ? `$${money}` : null,
                    gooj > 0 ? `${gooj} jail card(s)` : null,
                  ].filter(Boolean);
                  return parts.length ? parts.join(', ') : 'nothing';
                };
                return (
                  <div key={t.id} style={S.incoming}>
                    <div style={S.incomingHead}>🤝 Offer from {from?.name}</div>
                    <div style={S.incomingLine}><b>You get:</b> {summary(t.giveSpaces, t.giveMoney, t.giveGooj)}</div>
                    <div style={S.incomingLine}><b>You give:</b> {summary(t.getSpaces, t.getMoney, t.getGooj)}</div>
                    <div style={S.incomingBtns}>
                      <button style={{ ...S.action, ...S.actionPrimary, padding: '8px 14px' }}
                        onClick={() => send({ type: 'ACCEPT_TRADE', playerId, tradeId: t.id })}>Accept</button>
                      <button style={{ ...S.action, padding: '8px 14px' }}
                        onClick={() => send({ type: 'REJECT_TRADE', playerId, tradeId: t.id })}>Reject</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Toasts */}
          <div style={S.toastWrap}>
            {toasts.map((t) => <div key={t.id} style={S.toast}>{t.text}</div>)}
          </div>

          {/* Win screen */}
          {state.phase === 'ended' && (
            <WinScreen state={state} canRestart={allLegal.includes('RESTART')}
              onRestart={() => send({ type: 'RESTART', playerId })} />
          )}

          {/* In-jail banner for the local player */}
          {me?.inJail && myTurn && state.phase === 'preRoll' && (
            <div style={S.jailBanner}>
              🔒 You're in Jail — roll doubles, pay $50, or use a card to get out.
            </div>
          )}

          {me && (
            <div style={S.log}>
              {state.log.slice(-6).reverse().map((l, i) => (
                <div key={i} style={S.logline}>{l.text}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action bar — exactly the legal actions for me right now */}
      <footer style={S.footer}>
        {actions.length === 0 && (
          <span style={S.waiting}>
            {state.phase === 'lobby' ? 'Waiting for host to start…' : myTurn ? '—' : `Waiting for ${current?.name}…`}
          </span>
        )}
        {actions.map((a) => (
          <button key={a} style={{ ...S.action, ...(a === 'START' || a === 'ROLL' ? S.actionPrimary : {}) }}
            onClick={() => send({ type: a, playerId } as never)}>
            {ACTION_LABEL[a] ?? a}
          </button>
        ))}
        {canTrade && (
          <button style={S.action} onClick={() => setShowTrade(true)}>🤝 Trade</button>
        )}
      </footer>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 18px', background: '#06150d', borderBottom: '1px solid #1f5135' },
  room: { fontWeight: 700, letterSpacing: 1 },
  copy: { marginLeft: 10, fontSize: 11, background: '#1f5135', color: '#9fd3b6',
    border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' },
  phase: { fontSize: 15, fontWeight: 600 },
  dice: { color: '#facc15', marginLeft: 8 },
  body: { flex: 1, display: 'flex', minHeight: 0 },
  players: { width: 230, padding: 12, background: '#0a1f14', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 8 },
  playersNarrow: { width: '100%', flexDirection: 'row', overflowX: 'auto', overflowY: 'hidden',
    maxHeight: 130, flexShrink: 0 },
  player: { display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 10,
    background: '#06150d', border: '2px solid transparent', minWidth: 190 },
  swatch: { width: 22, height: 22, borderRadius: 6, flexShrink: 0 },
  pname: { fontSize: 14, fontWeight: 600 },
  pmeta: { fontSize: 11, color: '#7fb89a' },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' },
  chip: { width: 14, height: 14, borderRadius: 3, cursor: 'pointer', border: '1px solid rgba(0,0,0,.3)' },
  networth: { fontSize: 10, color: '#6fa88c', marginLeft: 'auto' },
  autoRoll: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9fd3b6', cursor: 'pointer', marginTop: 2 },
  center: { flex: 1, position: 'relative', minWidth: 0, background: '#0d2818' },
  lobbyOverlay: { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    textAlign: 'center', color: '#fff', background: 'rgba(6,21,13,.82)', padding: '14px 22px',
    borderRadius: 12, border: '1px solid #1f5135', fontSize: 14, pointerEvents: 'none' },
  deedWrap: { position: 'absolute', top: 16, right: 16 },
  toastWrap: { position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', pointerEvents: 'none', zIndex: 15 },
  toast: { background: 'rgba(6,21,13,.9)', color: '#e8f6ee', padding: '8px 16px', borderRadius: 999,
    fontSize: 13, fontWeight: 600, border: '1px solid #235d3d', whiteSpace: 'nowrap' },
  jailBanner: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(192,39,31,.92)', color: '#fff', padding: '10px 18px', borderRadius: 10,
    fontSize: 13, fontWeight: 600, pointerEvents: 'none' },
  incomingWrap: { position: 'absolute', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 16 },
  incoming: { width: 280, background: 'rgba(10,31,20,.96)', border: '1px solid #235d3d',
    borderRadius: 10, padding: 12, color: '#fff' },
  incomingHead: { fontWeight: 700, fontSize: 14, marginBottom: 6 },
  incomingLine: { fontSize: 12, color: '#cfeede', marginBottom: 3 },
  incomingBtns: { display: 'flex', gap: 8, marginTop: 8 },
  log: { position: 'absolute', left: 14, bottom: 14, width: 320, maxWidth: '40%',
    background: 'rgba(6,21,13,.78)', borderRadius: 10, padding: 10, fontSize: 12,
    color: '#9fd3b6', pointerEvents: 'none', backdropFilter: 'blur(2px)' },
  logline: { padding: '3px 0', borderBottom: '1px solid #11281b' },
  footer: { display: 'flex', gap: 10, padding: 14, background: '#06150d',
    borderTop: '1px solid #1f5135', justifyContent: 'center', flexWrap: 'wrap', minHeight: 64, alignItems: 'center' },
  waiting: { color: '#4f7e63', fontSize: 14 },
  action: { padding: '12px 22px', borderRadius: 10, border: '1px solid #235d3d',
    background: '#1f5135', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  actionPrimary: { background: '#22c55e', color: '#05140b', border: 'none' },
};
