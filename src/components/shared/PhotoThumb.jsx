import { useItemPhoto } from '../../hooks/useItemPhoto';

export default function PhotoThumb({ item, size = 130 }) {
  const url = useItemPhoto(item);
  return (
    <div className="item-photo-wrap" style={{ flex: `0 0 ${size}px`, width: size }}>
      {url ? <img src={url} alt="" /> : <span>🖼️</span>}
    </div>
  );
}
