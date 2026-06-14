import { liquidatable, type GameState } from '@monopoly/shared';

// Shown when the game ends. Lists final standings by net worth.
export function WinScreen({ state, canRestart, onRestart }: {
  state: GameState; canRestart: boolean; onRestart: () => void;
}) {
  const winner = state.players.find((p) => p.id === state.winner);
  const standings = [...state.players]
    .map((p) => ({ p, worth: p.bankrupt ? 0 : liquidatable(state, p) }))
    .sort((a, b) => b.worth - a.worth);

  return (
    <div style={S.backdrop}>
      <div style={S.card}>
        <div style={S.trophy}>🏆</div>
        <div style={S.title}>{winner?.name} wins!</div>
        <div style={S.sub}>Final standings</div>
        <div style={S.list}>
          {standings.map(({ p, worth }, i) => (
            <div key={p.id} style={S.row}>
              <span style={S.rank}>{i + 1}</span>
              <span style={{ ...S.dot, background: p.color }} />
              <span style={{ flex: 1, opacity: p.bankrupt ? 0.5 : 1 }}>
                {p.name}{p.bankrupt ? ' (bankrupt)' : ''}
              </span>
              <span style={S.worth}>${worth}</span>
            </div>
          ))}
        </div>
        {canRestart ? (
          <button style={S.rematch} onClick={onRestart}>🔄 Rematch (same players)</button>
        ) : (
          <div style={S.hint}>Waiting for the host to start a rematch…</div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(3,12,7,.85)', display: 'grid', placeItems: 'center', zIndex: 40 },
  card: { width: 360, background: '#0a1f14', borderRadius: 18, border: '1px solid #2e7d4f',
    padding: 28, textAlign: 'center', color: '#fff', boxShadow: '0 30px 80px rgba(0,0,0,.6)' },
  trophy: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: 800, marginTop: 6 },
  sub: { fontSize: 12, color: '#7fb89a', textTransform: 'uppercase', letterSpacing: 1, margin: '18px 0 8px' },
  list: { display: 'flex', flexDirection: 'column', gap: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 10, background: '#06150d', borderRadius: 8, padding: '8px 12px' },
  rank: { width: 18, color: '#9fd3b6', fontWeight: 700 },
  dot: { width: 14, height: 14, borderRadius: 4 },
  worth: { fontWeight: 700, color: '#bfe9d2' },
  hint: { marginTop: 18, fontSize: 12, color: '#7fb89a' },
  rematch: { marginTop: 20, padding: '12px 24px', borderRadius: 10, border: 'none',
    background: '#22c55e', color: '#05140b', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
};
