import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { computeStats } from '../lib/calc';
import { fmt } from '../lib/format';
import CegModal from './CegModal';

export default function StatsBar({ onFilterByCeg }) {
  const { items, unlocked } = useApp();
  const [showCegModal, setShowCegModal] = useState(false);
  const s = computeStats(items);

  return (
    <div className="stats-wrap">
      <div className="stats">
        <div className="stat stat-clickable" onClick={() => setShowCegModal(true)}>
          <div className="stat-label">CEGs em Andamento</div>
          <div className="stat-value">{s.cegCount}</div>
        </div>
        <div className="stat"><div className="stat-label">Total de Itens</div><div className="stat-value">{s.total}</div></div>
        {unlocked && (
          <>
            <div className="stat"><div className="stat-label">Valor Pendente</div><div className="stat-value">{fmt(s.pendingValue)}</div></div>
            <div className="stat"><div className="stat-label">Confirmado</div><div className="stat-value">{fmt(s.confirmedValue)}</div></div>
            <div className="stat"><div className="stat-label">Atrasado</div><div className="stat-value" style={{ color: '#8A5A16' }}>{fmt(s.lateValue)}</div></div>
          </>
        )}
        <div className="stat"><div className="stat-label">Joiners</div><div className="stat-value">{s.joinerCount}</div></div>
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
