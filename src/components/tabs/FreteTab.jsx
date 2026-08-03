import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveJoinerInput } from '../../lib/joiners';
import { eligibleForShipping, shippingRequestFor, pendingShippingRequests } from '../../lib/calc';
import { formatClaimDate } from '../../lib/format';
import FreteItemCard from '../shipping/FreteItemCard';
import PackageBlock from '../shipping/PackageBlock';
import ShipmentModal from '../shipping/ShipmentModal';
import PackageItemsModal from '../shipping/PackageItemsModal';
import ShippingWizard from '../shipping/ShippingWizard';
import EmptyState from '../shared/EmptyState';

export default function FreteTab() {
  const { items, registry, unlocked, shippingRequests } = useApp();
  const [handle, setHandle] = useState('');
  const [inputDraft, setInputDraft] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [viewingShipmentId, setViewingShipmentId] = useState(null);
  const [viewingPackageId, setViewingPackageId] = useState(null);
  const [wizardIds, setWizardIds] = useState(null);

  function doLookup() {
    const raw = inputDraft.trim();
    if (!raw) return;
    const resolved = resolveJoinerInput(registry, raw);
    if (resolved.value) { setHandle(resolved.value); setSelected(new Set()); }
  }

  const pending = useMemo(() => pendingShippingRequests(shippingRequests), [shippingRequests]);
  const paidNoTracking = useMemo(() => shippingRequests.filter((r) => r.status === 'PROCESSADO' && r.pagFrete === 'PAGO' && !r.rastreio), [shippingRequests]);

  const mine = useMemo(() => (handle ? items.filter((it) => it.joiner.toLowerCase() === handle.toLowerCase() && eligibleForShipping(it)) : []), [items, handle]);

  const { packageGroups, standalone } = useMemo(() => {
    const groups = [];
    const seen = new Set();
    const alone = [];
    mine.forEach((it) => {
      const req = shippingRequestFor(shippingRequests, it.id);
      const isPackaged = req && req.status === 'PROCESSADO' && req.pagFrete === 'PAGO' && req.rastreio;
      if (isPackaged) {
        if (!seen.has(req.id)) {
          seen.add(req.id);
          groups.push({ req, items: mine.filter((m) => { const r2 = shippingRequestFor(shippingRequests, m.id); return r2 && r2.id === req.id; }) });
        }
      } else {
        alone.push(it);
      }
    });
    return { packageGroups: groups, standalone: alone };
  }, [mine, shippingRequests]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function requestShippingClicked() {
    if (selected.size === 0) { alert('Selecione ao menos um item para solicitar o envio.'); return; }
    setWizardIds(Array.from(selected));
  }

  return (
    <>
      {unlocked && (
        <>
          <div className="gom-claims-box">
            <h3>🚚 Solicitações de envio nacional</h3>
            <p>{pending.length === 0 ? 'Nenhuma solicitação de envio pendente no momento.' : 'Veja os itens combinados de cada solicitação e defina o valor do frete.'}</p>
            {pending.map((r) => {
              const its = r.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);
              return (
                <div className="claim-row" key={r.id}>
                  <div className="claim-info"><b>{r.joiner}</b> · {its.length} {its.length === 1 ? 'item' : 'itens'} · Solicitado em {formatClaimDate(r.submittedAt)}</div>
                  <button className="btn btn-outline" onClick={() => setViewingShipmentId(r.id)}>🖼 Ver itens e definir frete</button>
                </div>
              );
            })}
          </div>

          <div className="gom-claims-box">
            <h3>📮 Envios pagos — adicionar rastreio</h3>
            <p>{paidNoTracking.length === 0 ? 'Nenhum envio pago aguardando código de rastreio no momento.' : 'Adicione o código de rastreio para que o joiner possa acompanhar a entrega.'}</p>
            {paidNoTracking.map((r) => {
              const its = r.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);
              return (
                <div className="claim-row" key={r.id}>
                  <div className="claim-info"><b>{r.joiner}</b> · {its.length} {its.length === 1 ? 'item' : 'itens'} · Sem rastreio ainda</div>
                  <button className="btn btn-outline" onClick={() => setViewingShipmentId(r.id)}>📮 Adicionar rastreio</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="panel-intro">
        <h3>ℹ️ Informações sobre o envio nacional</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      </div>

      <div className="panel-intro">
        <h3>🚚 Solicitar envio nacional</h3>
        <p>Digite seu @ ou telefone para ver os itens já liberados para envio e escolher quais deseja mandar juntos.</p>
        <div className="panel-lookup-row">
          <input type="text" placeholder="@seuusuario ou telefone (ex: 11912345678)" value={inputDraft}
            onChange={(e) => setInputDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }} />
          <button className="btn btn-primary" onClick={doLookup}>🔎 Ver meus itens</button>
          {handle && <button className="btn btn-ghost" onClick={() => { setHandle(''); setInputDraft(''); setSelected(new Set()); }}>✕ Limpar</button>}
        </div>
      </div>

      {handle && mine.length === 0 && (
        <EmptyState title="Nenhum item liberado para envio ainda">Assim que seus itens chegarem na GOM, eles aparecem aqui para você solicitar o envio.</EmptyState>
      )}

      {handle && mine.length > 0 && (
        <>
          <div className="grid">
            {packageGroups.map((g) => (
              <PackageBlock key={g.req.id} req={g.req} itemCount={g.items.length} onClick={() => setViewingPackageId(g.req.id)} />
            ))}
            {standalone.map((it) => (
              <FreteItemCard key={it.id} item={it} checked={selected.has(it.id)} onToggle={() => toggleSelect(it.id)} />
            ))}
          </div>
          {standalone.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn btn-primary" onClick={requestShippingClicked}>📦 Solicitar envio dos selecionados</button>
            </div>
          )}
        </>
      )}

      {viewingShipmentId && <ShipmentModal requestId={viewingShipmentId} onClose={() => setViewingShipmentId(null)} />}
      {viewingPackageId && <PackageItemsModal requestId={viewingPackageId} onClose={() => setViewingPackageId(null)} />}
      {wizardIds && (
        <ShippingWizard
          itemIds={wizardIds}
          joiner={handle}
          onClose={() => setWizardIds(null)}
          onDone={() => setSelected(new Set())}
        />
      )}
    </>
  );
}
