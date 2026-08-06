import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { computeStats } from '../lib/calc';
import { fmt, formatLastUpdated } from '../lib/format';
import { storage, onStorageWrite } from '../lib/storage';
import CegModal from './CegModal';

export default function StatsBar({ onFilterByCeg, onGoToItems }) {
  const { items, unlocked } = useApp();
  const [showCegModal, setShowCegModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const s = computeStats(items);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      storage.getLastUpdatedAt().then((iso) => { if (!cancelled) setLastUpdated(iso); });
    }
    refresh();
    const unsubscribe = onStorageWrite(refresh);
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  return (
    <div className="stats-wrap">
      <div className="stats">
        <div className="stat stat-clickable" onClick={() => setShowCegModal(true)}>
          <div className="stat-label">CEGs em Andamento</div>
          <div className="stat-value">{s.cegCount}</div>
        </div>
        <div className="stat stat-clickable" onClick={() => onGoToItems?.()}>
          <div className="stat-label">Total de Itens</div>
          <div className="stat-value">{s.total}</div>
        </div>
        {unlocked && (
          <>
            <div className="stat"><div className="stat-label">Valor Pendente</div><div className="stat-value">{fmt(s.pendingValue)}</div></div>
            <div className="stat"><div className="stat-label">Confirmado</div><div className="stat-value">{fmt(s.confirmedValue)}</div></div>
            <div className="stat"><div className="stat-label">Atrasado</div><div className="stat-value" style={{ color: '#8A5A16' }}>{fmt(s.lateValue)}</div></div>
          </>
        )}
        <div className="stat" title="Quantidade de @ diferentes com itens reivindicados — não é o mesmo total do Cadastro, que só conta joiners formalmente cadastrados.">
          <div className="stat-label">Joiners c/ Itens</div>
          <div className="stat-value">{s.joinerCount}</div>
        </div>
        <div className="stat"><div className="stat-label">Última atualização</div><div className="stat-value" style={{ fontSize: 16 }}>{lastUpdated ? formatLastUpdated(lastUpdated) : '—'}</div></div>
      </div>
      {showCegModal && (
        <CegModal
          items={items}
          onClose={() => setShowCegModal(false)}
          onPickCeg={(ceg) => onFilterByCeg?.(ceg)}
        />
      )}
    </div>
  );
}
