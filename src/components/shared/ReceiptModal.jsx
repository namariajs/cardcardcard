import { useEffect, useState } from 'react';
import { loadReceipt } from '../../lib/storage';
import Modal from './Modal';

// Two modes: pass `claim` to load a payment-claim receipt from blob storage (the
// original behavior), or pass `imageUrl` directly for anything that's already a plain
// URL (a form submission's receipt_file_url, a form item's photo_url) — same lightbox,
// no async load needed for that second case.
export default function ReceiptModal({ claim, imageUrl, title = 'Comprovante de pagamento', onClose }) {
  const [dataUrl, setDataUrl] = useState(claim ? undefined : imageUrl || null); // undefined = loading, null = not found
  const receiptKey = claim ? (claim.batchId || claim.id) : null;

  useEffect(() => {
    if (!claim) return;
    let cancelled = false;
    loadReceipt(receiptKey).then((url) => { if (!cancelled) setDataUrl(url); });
    return () => { cancelled = true; };
  }, [claim, receiptKey]);

  const isPdf = !!dataUrl && (dataUrl.startsWith('data:application/pdf') || dataUrl.toLowerCase().endsWith('.pdf'));

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <h3>{title}</h3>
      {dataUrl === undefined && <p className="hint">Carregando...</p>}
      {dataUrl === null && <p className="hint">Não foi possível carregar o comprovante anexado a este aviso.</p>}
      {dataUrl && isPdf && (
        <p className="hint">Comprovante em PDF — <a href={dataUrl} target="_blank" rel="noopener noreferrer">abrir em nova aba</a>.</p>
      )}
      {dataUrl && !isPdf && (
        <img src={dataUrl} alt="" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}
