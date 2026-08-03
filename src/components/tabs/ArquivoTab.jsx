import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { arquivoReminders } from '../../lib/calc';
import { formatDateOnly } from '../../lib/format';
import { REMINDER_DAYS } from '../../lib/constants';
import ShipmentModal from '../shipping/ShipmentModal';
import EmptyState from '../shared/EmptyState';

export default function ArquivoTab() {
  const { unlocked, items, shippingRequests, updateShippingRequest, setItems } = useApp();
  const [quickTrack, setQuickTrack] = useState('');
  const [quickTrackMsg, setQuickTrackMsg] = useState(null);
  const [viewingShipmentId, setViewingShipmentId] = useState(null);

  const reminders = useMemo(() => arquivoReminders(shippingRequests, items), [shippingRequests, items]);
  const shipped = useMemo(() => (
    shippingRequests
      .filter((r) => r.status === 'PROCESSADO' && r.pagFrete === 'PAGO' && r.rastreio)
      .sort((a, b) => new Date(b.rastreioAt || 0) - new Date(a.rastreioAt || 0))
  ), [shippingRequests]);

  if (!unlocked) {
    return <EmptyState title="Modo GOM necessário">Você não tem acesso a essa página.</EmptyState>;
  }

  function runQuickTrack() {
    const code = quickTrack.trim();
    if (!code) { setQuickTrackMsg({ kind: 'info', text: 'Cole um código de rastreio primeiro.' }); return; }
    window.open('https://rastreamento.correios.com.br/app/index.php?objetos=' + encodeURIComponent(code), '_blank');
    const match = shippingRequests.find((r) => r.rastreio && r.rastreio.toLowerCase() === code.toLowerCase());
    if (match) {
      const its = (match.itemIds || []).map((id) => items.find((i) => i.id === id)).filter(Boolean);
      setQuickTrackMsg({ kind: 'ok', text: `Abrindo nos Correios. Esse código é do envio de ${match.joiner} (${its.length} ${its.length === 1 ? 'item' : 'itens'}) — veja em Lembretes de entrega, abaixo.` });
    } else {
      setQuickTrackMsg({ kind: 'info', text: 'Abrindo nos Correios em outra aba...' });
    }
  }

  function markDelivered(req) {
    const ids = new Set(req.itemIds || []);
    setItems((prev) => prev.map((it) => (ids.has(it.id) ? { ...it, statusEnvio: 'ENTREGUE' } : it)));
  }

  function snooze(req) {
    updateShippingRequest(req.id, { reminderSnoozedUntil: new Date(Date.now() + 3 * 86400000).toISOString() });
  }

  function adjustShippedDate(req, dateStr) {
    if (!dateStr) return;
    updateShippingRequest(req.id, { rastreioAt: new Date(dateStr + 'T12:00:00').toISOString() });
  }

  return (
    <>
      <div className="settings-box">
        <h4>🔎 Verificar rastreio agora</h4>
        <p>Cole um código de rastreio e clique em verificar — abre direto a página oficial dos Correios em outra aba.</p>
        <div className="settings-row">
          <input type="text" placeholder="Ex: BR123456789BR" value={quickTrack} onChange={(e) => setQuickTrack(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runQuickTrack(); }} />
          <button className="btn btn-primary" onClick={runQuickTrack}>🔎 Verificar</button>
        </div>
        {quickTrackMsg && <div className={`track-msg ${quickTrackMsg.kind}`}>{quickTrackMsg.text}</div>}
      </div>

      <div className="gom-claims-box warn">
        <h3>🔔 Lembretes de entrega</h3>
        <p>{reminders.length === 0
          ? `Nenhum envio pendente há mais de ${REMINDER_DAYS} dias no momento. 🎉`
          : `Envios com rastreio há ${REMINDER_DAYS}+ dias que ainda não foram marcados como entregues.`}</p>
        {reminders.map(({ req, its, pending, days }) => (
          <div className="claim-row" key={req.id}>
            <div className="claim-info">
              <b>{req.joiner}</b> · {pending.length} de {its.length} {its.length === 1 ? 'item' : 'itens'} ainda não entregue(s) · 📮 {req.rastreio}<br />
              Enviado há <b>{days} dias</b> (desde {formatDateOnly(req.rastreioAt)})
            </div>
            <div className="reminder-actions">
              <input type="date" title="Ajustar data de envio" defaultValue={new Date(req.rastreioAt).toISOString().slice(0, 10)}
                onChange={(e) => adjustShippedDate(req, e.target.value)} />
              <button className="btn btn-outline" onClick={() => window.open('https://rastreamento.correios.com.br/app/index.php?objetos=' + encodeURIComponent(req.rastreio), '_blank')}>🔗 Correios</button>
              <button className="btn btn-sage" onClick={() => markDelivered(req)}>✓ Marcar entregue</button>
              <button className="btn btn-ghost" onClick={() => snooze(req)}>🔕 Lembrar em 3 dias</button>
            </div>
          </div>
        ))}
      </div>

      {shipped.length === 0 ? (
        <EmptyState title="Nenhum envio arquivado ainda">Assim que um envio pago tiver o rastreio adicionado, ele aparece aqui.</EmptyState>
      ) : (
        <div className="gom-claims-box">
          <h3>📁 Arquivo de envios</h3>
          <p>Envios já processados, pagos e com rastreio adicionado.</p>
          {shipped.map((r) => {
            const its = r.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);
            return (
              <div className="claim-row" key={r.id}>
                <div className="claim-info">
                  <b>{r.joiner}</b> · {its.length} {its.length === 1 ? 'item' : 'itens'} · 📮 {r.rastreio} · Adicionado em {formatDateOnly(r.rastreioAt)}
                </div>
                <button className="btn btn-outline" onClick={() => setViewingShipmentId(r.id)}>🖼 Ver detalhes</button>
              </div>
            );
          })}
        </div>
      )}

      {viewingShipmentId && <ShipmentModal requestId={viewingShipmentId} onClose={() => setViewingShipmentId(null)} />}
    </>
  );
}
