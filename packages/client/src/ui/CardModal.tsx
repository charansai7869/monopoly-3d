import type { CardDeck } from '@monopoly/shared';

// Shows the Chance / Community Chest card a player just drew.
export function CardModal({ deck, text, who, onClose }: {
  deck: CardDeck; text: string; who: string; onClose: () => void;
}) {
  const isChance = deck === 'chance';
  const accent = isChance ? '#f08a24' : '#2f7fd1';
  const title = isChance ? 'CHANCE' : 'COMMUNITY CHEST';
  const icon = isChance ? '❓' : '🎁';

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.card, borderColor: accent }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...S.ribbon, background: accent }}>{icon} {title}</div>
        <div style={S.who}>{who}</div>
        <div style={S.text}>{text}</div>
        <button style={{ ...S.ok, background: accent }} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  backdrop: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'grid', placeItems: 'center', zIndex: 20 },
  card: { width: 320, background: '#fbf8ee', borderRadius: 16, padding: 0, overflow: 'hidden',
    border: '3px solid', boxShadow: '0 24px 60px rgba(0,0,0,.5)', color: '#1a1a1a',
    transform: 'rotate(-1deg)' },
  ribbon: { color: '#fff', fontWeight: 800, letterSpacing: 1.5, fontSize: 15,
    padding: '12px 16px', textAlign: 'center' },
  who: { textAlign: 'center', fontSize: 12, color: '#888', marginTop: 14, textTransform: 'uppercase', letterSpacing: 1 },
  text: { padding: '10px 26px 22px', fontSize: 19, lineHeight: 1.4, textAlign: 'center', fontWeight: 600 },
  ok: { display: 'block', margin: '0 auto 20px', color: '#fff', border: 'none',
    borderRadius: 10, padding: '10px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
};
