import { useMemo, useState } from 'react';
import { BOARD, GROUP_COLOR, type GameState, type TradeOffer } from '@monopoly/shared';

function tradeable(state: GameState, ownerId: string): number[] {
  return state.board
    .filter((b) => b.ownerId === ownerId)
    .map((b) => b.idx)
    .filter((i) => {
      const def = BOARD[i];
      if (def.price == null) return false;
      if (def.kind === 'street' && def.group) {
        // Can't trade if any property in the colour group has buildings.
        return !state.board.some((s2) => def.group && BOARD[s2.idx].group === def.group && s2.houses > 0);
      }
      return true;
    });
}

function PropChip({ idx, on, toggle }: { idx: number; on: boolean; toggle: () => void }) {
  const def = BOARD[idx];
  const color = def.group ? GROUP_COLOR[def.group]
    : def.kind === 'railroad' ? '#2b2b2b' : '#8a8a8a';
  return (
    <button onClick={toggle} style={{
      display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
      padding: '6px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
      border: on ? '2px solid #22c55e' : '1px solid #2c2c34',
      background: on ? '#13351f' : '#11131a', color: '#fff',
    }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
      {def.name}
    </button>
  );
}

export function TradeModal({ state, playerId, onPropose, onClose }: {
  state: GameState; playerId: string;
  onPropose: (offer: Omit<TradeOffer, 'id'>) => void; onClose: () => void;
}) {
  const me = state.players.find((p) => p.id === playerId)!;
  const partners = state.players.filter((p) => !p.bankrupt && p.id !== playerId);
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? '');
  const partner = state.players.find((p) => p.id === partnerId);

  const [give, setGive] = useState<Set<number>>(new Set());
  const [get, setGet] = useState<Set<number>>(new Set());
  const [giveMoney, setGiveMoney] = useState(0);
  const [getMoney, setGetMoney] = useState(0);
  const [giveGooj, setGiveGooj] = useState(0);
  const [getGooj, setGetGooj] = useState(0);

  const myProps = useMemo(() => tradeable(state, playerId), [state, playerId]);
  const theirProps = useMemo(() => partnerId ? tradeable(state, partnerId) : [], [state, partnerId]);

  const toggle = (set: Set<number>, setter: (s: Set<number>) => void, i: number) => {
    const n = new Set(set);
    n.has(i) ? n.delete(i) : n.add(i);
    setter(n);
  };

  const propose = () => {
    if (!partner) return;
    onPropose({
      fromId: playerId, toId: partnerId,
      giveSpaces: [...give], getSpaces: [...get],
      giveMoney, getMoney, giveGooj, getGooj,
    });
    onClose();
  };

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.card} onClick={(e) => e.stopPropagation()}>
        <div style={S.head}>
          <span>🤝 Propose a Trade</span>
          <button style={S.x} onClick={onClose}>✕</button>
        </div>

        <div style={S.partnerRow}>
          <span>Trade with</span>
          <select style={S.select} value={partnerId} onChange={(e) => { setPartnerId(e.target.value); setGet(new Set()); }}>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={S.cols}>
          <div style={S.col}>
            <div style={S.colHead}>You give</div>
            {myProps.map((i) => <PropChip key={i} idx={i} on={give.has(i)} toggle={() => toggle(give, setGive, i)} />)}
            <label style={S.lbl}>Cash (max ${me.money})
              <input style={S.num} type="number" min={0} max={me.money} value={giveMoney}
                onChange={(e) => setGiveMoney(Math.max(0, Math.min(me.money, +e.target.value)))} /></label>
            {me.goojCards > 0 && <label style={S.lbl}>Jail cards (max {me.goojCards})
              <input style={S.num} type="number" min={0} max={me.goojCards} value={giveGooj}
                onChange={(e) => setGiveGooj(Math.max(0, Math.min(me.goojCards, +e.target.value)))} /></label>}
          </div>

          <div style={S.col}>
            <div style={S.colHead}>You get</div>
            {theirProps.map((i) => <PropChip key={i} idx={i} on={get.has(i)} toggle={() => toggle(get, setGet, i)} />)}
            <label style={S.lbl}>Cash (max ${partner?.money ?? 0})
              <input style={S.num} type="number" min={0} max={partner?.money ?? 0} value={getMoney}
                onChange={(e) => setGetMoney(Math.max(0, Math.min(partner?.money ?? 0, +e.target.value)))} /></label>
            {(partner?.goojCards ?? 0) > 0 && <label style={S.lbl}>Jail cards (max {partner?.goojCards})
              <input style={S.num} type="number" min={0} max={partner?.goojCards ?? 0} value={getGooj}
                onChange={(e) => setGetGooj(Math.max(0, Math.min(partner?.goojCards ?? 0, +e.target.value)))} /></label>}
          </div>
        </div>

        <button style={S.propose} onClick={propose} disabled={!partner}>Send offer to {partner?.name}</button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 30 },
  card: { width: 520, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', background: '#0a1f14',
    borderRadius: 16, border: '1px solid #235d3d', boxShadow: '0 24px 60px rgba(0,0,0,.55)', color: '#fff' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px',
    fontWeight: 700, fontSize: 16, borderBottom: '1px solid #1f5135' },
  x: { background: '#1f5135', color: '#fff', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer' },
  partnerRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', fontSize: 14 },
  select: { padding: '6px 10px', borderRadius: 8, background: '#06150d', color: '#fff', border: '1px solid #235d3d' },
  cols: { display: 'flex', gap: 12, padding: '0 18px' },
  col: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  colHead: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9fd3b6', marginBottom: 2 },
  lbl: { fontSize: 11, color: '#9fd3b6', display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 },
  num: { padding: '6px 8px', borderRadius: 6, background: '#06150d', color: '#fff', border: '1px solid #235d3d', fontSize: 14 },
  propose: { margin: 18, padding: '12px', borderRadius: 10, border: 'none', background: '#22c55e',
    color: '#05140b', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: 'calc(100% - 36px)' },
};
