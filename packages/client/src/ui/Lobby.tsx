import { useState } from 'react';
import { PIECES, type PieceType } from '@monopoly/shared';
import { useStore } from '../store.js';

export function Lobby() {
  const { createRoom, joinRoom, error, connected } = useStore();
  const [name, setName] = useState(localStorage.getItem('monopoly:name') ?? '');
  const [code, setCode] = useState('');
  const [piece, setPiece] = useState<PieceType>((localStorage.getItem('monopoly:piece') as PieceType) || 'car');

  const remember = (n: string) => { setName(n); localStorage.setItem('monopoly:name', n); };
  const pick = (p: PieceType) => { setPiece(p); localStorage.setItem('monopoly:piece', p); };
  const canAct = name.trim().length > 0 && connected;

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h1 style={S.title}>MONOPOLY <span style={{ opacity: 0.5, fontWeight: 400 }}>3D</span></h1>
        <p style={S.sub}>Play with your roommates online.</p>

        <label style={S.label}>Your name</label>
        <input style={S.input} value={name} maxLength={14}
          onChange={(e) => remember(e.target.value)} placeholder="e.g. Charan" />

        <label style={S.label}>Your token</label>
        <div style={S.pieceGrid}>
          {PIECES.map((pc) => (
            <button key={pc.id} title={pc.label} onClick={() => pick(pc.id)}
              style={{ ...S.pieceBtn, ...(piece === pc.id ? S.pieceOn : {}) }}>
              <span style={{ fontSize: 22 }}>{pc.emoji}</span>
              <span style={S.pieceLabel}>{pc.label}</span>
            </button>
          ))}
        </div>

        <button style={{ ...S.btn, ...S.primary, opacity: canAct ? 1 : 0.5 }}
          disabled={!canAct} onClick={() => createRoom(name.trim(), piece)}>
          Create a new game
        </button>

        <div style={S.or}><span>or join with a code</span></div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...S.input, textTransform: 'uppercase', letterSpacing: 2 }}
            value={code} maxLength={6} placeholder="ABC123"
            onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button style={{ ...S.btn, ...S.ghost, opacity: canAct && code.length === 6 ? 1 : 0.5 }}
            disabled={!canAct || code.length !== 6}
            onClick={() => joinRoom(code, name.trim(), piece)}>Join</button>
        </div>

        {!connected && <p style={S.warn}>Connecting to server…</p>}
        {error && <p style={S.err}>{error}</p>}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { width: '100%', height: '100%', display: 'grid', placeItems: 'center',
    background: 'radial-gradient(circle at 50% 30%, #14532d, #0d2818 70%)' },
  card: { width: 380, maxWidth: '90vw', background: '#0a1f14', border: '1px solid #1f5135',
    borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.4)' },
  title: { color: '#fff', fontSize: 34, letterSpacing: 1, marginBottom: 4 },
  sub: { color: '#7fb89a', marginBottom: 22, fontSize: 14 },
  label: { color: '#9fd3b6', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { width: '100%', padding: '12px 14px', margin: '6px 0 16px', borderRadius: 10,
    border: '1px solid #235d3d', background: '#06150d', color: '#fff', fontSize: 16, outline: 'none' },
  pieceGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, margin: '6px 0 18px' },
  pieceBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px',
    borderRadius: 8, border: '1px solid #235d3d', background: '#06150d', color: '#9fd3b6', cursor: 'pointer' },
  pieceOn: { border: '2px solid #22c55e', background: '#13351f', color: '#fff' },
  pieceLabel: { fontSize: 8.5, textAlign: 'center', lineHeight: 1.1 },
  btn: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', fontSize: 15,
    fontWeight: 600, cursor: 'pointer' },
  primary: { background: '#22c55e', color: '#05140b' },
  ghost: { width: 'auto', padding: '12px 22px', background: '#1f5135', color: '#fff' },
  or: { textAlign: 'center', color: '#4f7e63', fontSize: 12, margin: '16px 0',
    display: 'flex', alignItems: 'center', gap: 10 },
  warn: { color: '#facc15', fontSize: 13, marginTop: 14, textAlign: 'center' },
  err: { color: '#f87171', fontSize: 13, marginTop: 14, textAlign: 'center' },
};
