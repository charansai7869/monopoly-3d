import { useState } from 'react';
import { BOARD, GROUP_COLOR, type GameState } from '@monopoly/shared';

// Live auction overlay. Shown whenever state.phase === 'auction'.
export function AuctionModal({ state, playerId, onBid, onPass }: {
  state: GameState; playerId: string;
  onBid: (amount: number) => void; onPass: () => void;
}) {
  const a = state.auction;
  const [amount, setAmount] = useState('');
  if (!a) return null;

  const def = BOARD[a.spaceIdx];
  const me = state.players.find((p) => p.id === playerId);
  const myTurn = a.turnId === playerId;
  const onTurn = state.players.find((p) => p.id === a.turnId);
  const highBidder = state.players.find((p) => p.id === a.highBidderId);
  const accent = def.group ? GROUP_COLOR[def.group] : '#2a6b46';
  const min = a.highBid + 1;
  const stillIn = a.active.includes(playerId);

  const submit = () => {
    const n = parseInt(amount, 10);
    if (Number.isFinite(n) && n >= min && me && n <= me.money) { onBid(n); setAmount(''); }
  };

  return (
    <div style={S.backdrop}>
      <div style={S.card}>
        <div style={{ ...S.head, background: accent }}>🔨 AUCTION</div>
        <div style={S.body}>
          <div style={S.prop}>{def.name}</div>
          <div style={S.list}>list price ${def.price}</div>

          <div style={S.bidRow}>
            <span>Top bid</span>
            <b>{a.highBid > 0 ? `$${a.highBid}` : '—'}</b>
          </div>
          <div style={S.bidder}>
            {highBidder ? `by ${highBidder.name}` : 'no bids yet'}
          </div>

          <div style={S.players}>
            {state.players.filter((p) => !p.bankrupt).map((p) => {
              const inGame = a.active.includes(p.id);
              return (
                <span key={p.id} style={{
                  ...S.chip, background: p.color,
                  opacity: inGame ? 1 : 0.25,
                  outline: p.id === a.turnId ? '2px solid #fff' : 'none',
                }} title={p.name} />
              );
            })}
          </div>

          {!stillIn ? (
            <div style={S.note}>You passed. Waiting for the auction to finish…</div>
          ) : myTurn ? (
            <div style={S.controls}>
              <input style={S.input} type="number" min={min} value={amount}
                placeholder={`≥ $${min}`} autoFocus
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()} />
              <button style={{ ...S.btn, ...S.bid }} onClick={submit}>Bid</button>
              <button style={{ ...S.btn, ...S.pass }} onClick={onPass}>Pass</button>
              <div style={S.cash}>your cash ${me?.money}</div>
            </div>
          ) : (
            <div style={S.note}>Waiting for <b>{onTurn?.name}</b> to bid…</div>
          )}
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)',
    display: 'grid', placeItems: 'center', zIndex: 25 },
  card: { width: 320, background: '#0a1f14', borderRadius: 16, overflow: 'hidden',
    border: '1px solid #235d3d', boxShadow: '0 24px 60px rgba(0,0,0,.55)', color: '#fff' },
  head: { padding: '12px 16px', fontWeight: 800, letterSpacing: 2, textAlign: 'center' },
  body: { padding: 18 },
  prop: { fontSize: 20, fontWeight: 700, textAlign: 'center' },
  list: { fontSize: 12, color: '#7fb89a', textAlign: 'center', marginBottom: 14 },
  bidRow: { display: 'flex', justifyContent: 'space-between', fontSize: 16 },
  bidder: { fontSize: 12, color: '#9fd3b6', marginBottom: 12 },
  players: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 },
  chip: { width: 18, height: 18, borderRadius: 5 },
  controls: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: { flex: '1 1 100px', padding: '10px 12px', borderRadius: 8, border: '1px solid #235d3d',
    background: '#06150d', color: '#fff', fontSize: 15, outline: 'none' },
  btn: { padding: '10px 16px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  bid: { background: '#22c55e', color: '#05140b' },
  pass: { background: '#3a3a44', color: '#fff' },
  cash: { width: '100%', textAlign: 'center', fontSize: 11, color: '#7fb89a' },
  note: { fontSize: 13, color: '#9fd3b6', textAlign: 'center' },
};
