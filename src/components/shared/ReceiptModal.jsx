import { useEffect, useState } from 'react';
import { loadReceipt } from '../../lib/storage';
import Modal from './Modal';

export default function ReceiptModal({ claim, onClose }) {
  const [dataUrl, setDataUrl] = useState(undefined); // undefined = loading, null = not found
  const receiptKey = claim.batchId || claim.id;

  useEffect(() => {
    let cancelled = false;
    loadReceipt(receiptKey).then((url) => { if (!cancelled) setDataUrl(url); });
    return () => { cancelled = true; };
  }, [receiptKey]);

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <h3>Comprovante de pagamento</h3>
      {dataUrl === undefined && <p className="hint">Carregando...</p>}
      {dataUrl === null && <p className="hint">Não foi possível carregar o comprovante anexado a este aviso.</p>}
      {dataUrl && dataUrl.startsWith('data:application/pdf') && (
        <p className="hint">Comprovante em PDF — <a href={dataUrl} target="_blank" rel="noopener noreferrer">abrir em nova aba</a>.</p>
      )}
      {dataUrl && dataUrl.startsWith('data:image') && (
        <img src={dataUrl} alt="Comprovante" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}
