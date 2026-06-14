import { BOARD, GROUP_COLOR, mortgageValue, type ActionType, type GameState } from '@monopoly/shared';

const MANAGE_LABEL: Partial<Record<ActionType, string>> = {
  BUILD: '🏠 Build',
  SELL_HOUSE: '➖ Sell house',
  MORTGAGE: '🏦 Mortgage',
  UNMORTGAGE: '💵 Unmortgage',
};

// A property deed card. Shows everything about a tile: rent ladder, build cost,
// mortgage value, and current owner. If `manage` actions are provided, renders
// build/sell/mortgage buttons for the owner.
export function DeedView({ idx, state, onClose, manage = [], onAction }: {
  idx: number; state: GameState; onClose: () => void;
  manage?: ActionType[]; onAction?: (t: ActionType) => void;
}) {
  const def = BOARD[idx];
  const sp = state.board[idx];
  const owner = sp?.ownerId ? state.players.find((p) => p.id === sp.ownerId) : null;
  const headerColor = def.group ? GROUP_COLOR[def.group] : '#2a6b46';

  const rows: [string, string][] = [];
  if (def.kind === 'street' && def.rent) {
    rows.push(['Rent', `$${def.rent[0]}`]);
    rows.push(['Rent · full set', `$${def.rent[0] * 2}`]);
    rows.push(['With 1 house', `$${def.rent[1]}`]);
    rows.push(['With 2 houses', `$${def.rent[2]}`]);
    rows.push(['With 3 houses', `$${def.rent[3]}`]);
    rows.push(['With 4 houses', `$${def.rent[4]}`]);
    rows.push(['With HOTEL', `$${def.rent[5]}`]);
    rows.push(['House cost', `$${def.houseCost} ea`]);
  } else if (def.kind === 'railroad') {
    rows.push(['Rent (1 owned)', '$25']);
    rows.push(['2 owned', '$50']);
    rows.push(['3 owned', '$100']);
    rows.push(['4 owned', '$200']);
  } else if (def.kind === 'utility') {
    rows.push(['1 owned', '4 × dice']);
    rows.push(['2 owned', '10 × dice']);
  }

  const buyable = def.price != null;

  return (
    <div style={S.card} onClick={(e) => e.stopPropagation()}>
      <div style={{ ...S.header, background: headerColor, color: def.group === 'yellow' || def.group === 'lightblue' ? '#111' : '#fff' }}>
        <span style={S.name}>{def.name}</span>
        <button style={S.close} onClick={onClose}>✕</button>
      </div>

      <div style={S.body}>
        {buyable && <div style={S.price}>Price ${def.price}</div>}

        {rows.length > 0 ? (
          <table style={S.table}>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <td style={S.k}>{k}</td>
                  <td style={S.v}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={S.desc}>{describe(def.kind)}</p>
        )}

        {buyable && <div style={S.mort}>Mortgage value ${mortgageValue(def)}</div>}

        <div style={S.ownerRow}>
          {owner ? (
            <>
              <span style={{ ...S.dot, background: owner.color }} />
              Owned by <b style={{ marginLeft: 4 }}>{owner.name}</b>
              {sp.mortgaged && <span style={S.mortFlag}>MORTGAGED</span>}
              {sp.houses > 0 && <span style={S.houses}>{sp.houses === 5 ? '🏨 hotel' : `🏠 ×${sp.houses}`}</span>}
            </>
          ) : buyable ? (
            <span style={{ color: '#7fb89a' }}>Unowned</span>
          ) : null}
        </div>

        {manage.length > 0 && onAction && (
          <div style={S.manageRow}>
            {manage.map((a) => (
              <button key={a} style={S.manageBtn} onClick={() => onAction(a)}>
                {MANAGE_LABEL[a] ?? a}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function describe(kind: string): string {
  switch (kind) {
    case 'tax': return 'Pay the tax shown when you land here.';
    case 'chance': return 'Draw a Chance card.';
    case 'chest': return 'Draw a Community Chest card.';
    case 'go': return 'Collect $200 as you pass or land.';
    case 'jail': return 'Just visiting — unless you were sent here.';
    case 'freeparking': return 'Free resting spot. Nothing happens.';
    case 'gotojail': return 'Go directly to Jail. Do not pass GO.';
    default: return '';
  }
}

const S: Record<string, React.CSSProperties> = {
  card: { width: 260, background: '#f7f4e9', borderRadius: 12, overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,.45)', color: '#1a1a1a', border: '2px solid #06150d' },
  header: { padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: 800, fontSize: 15, letterSpacing: 0.4, textTransform: 'uppercase' },
  close: { background: 'rgba(0,0,0,.25)', color: '#fff', border: 'none', borderRadius: 6,
    width: 22, height: 22, cursor: 'pointer', fontSize: 12 },
  body: { padding: 14 },
  price: { fontWeight: 700, fontSize: 14, marginBottom: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  k: { padding: '3px 0', color: '#444' },
  v: { padding: '3px 0', textAlign: 'right', fontWeight: 600 },
  desc: { fontSize: 13, color: '#444', lineHeight: 1.5 },
  mort: { marginTop: 8, fontSize: 12, color: '#666' },
  ownerRow: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #ddd7c2',
    display: 'flex', alignItems: 'center', fontSize: 13, flexWrap: 'wrap', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 3, display: 'inline-block', marginRight: 4 },
  mortFlag: { background: '#c0271f', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, marginLeft: 6 },
  houses: { marginLeft: 6, fontSize: 12 },
  manageRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid #ddd7c2' },
  manageBtn: { flex: '1 1 auto', padding: '8px 10px', borderRadius: 8, border: 'none',
    background: '#1f5135', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
