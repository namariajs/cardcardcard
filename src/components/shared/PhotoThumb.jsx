import { useItemPhoto } from '../../hooks/useItemPhoto';

export default function PhotoThumb({ item, size = 130 }) {
  const url = useItemPhoto(item);
  return (
    <div className="item-photo-wrap" style={{ flex: `0 0 ${size}px`, width: size }}>
      {url ? (
        <img src={url} alt="" />
      ) : item.photoPending ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: Math.round(size * 0.34) }}>📷</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--pink-deep)', textAlign: 'center', lineHeight: 1.2, padding: '0 4px' }}>Foto pendente</span>
        </div>
      ) : (
        <span>🖼️</span>
      )}
    </div>
  );
}
