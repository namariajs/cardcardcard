import { useApp } from '../context/AppContext';
import { GOM_ONLY_TABS } from '../lib/constants';
import { pendingClaims, pendingShippingRequests, arquivoReminders, pendingItemOrders } from '../lib/calc';

const TAB_DEFS = [
  { key: 'menu', icon: '🏠', label: 'Menu' },
  { key: 'mypanel', icon: '👤', label: 'Painel Joiner' },
  { key: 'available', icon: '🟢', label: 'Disponíveis' },
  { key: 'payments', icon: '💳', label: 'Pagamentos' },
  { key: 'frete', icon: '🚚', label: 'Frete Nacional' },
  { key: 'items', icon: '📦', label: 'Itens' },
  { key: 'inter', icon: '🌍', label: 'Inter' },
  { key: 'joiners', icon: '💌', label: 'Joiners' },
  { key: 'registry', icon: '🗂', label: 'Cadastro' },
  { key: 'arquivo', icon: '📁', label: 'Arquivo' },
];

export default function Tabs({ activeTab, onChange }) {
  const { unlocked, paymentClaims, shippingRequests, items, itemOrders } = useApp();

  function badgeFor(key) {
    if (!unlocked) return 0;
    if (key === 'payments') return pendingClaims(paymentClaims).length;
    if (key === 'frete') return pendingShippingRequests(shippingRequests).length;
    if (key === 'arquivo') return arquivoReminders(shippingRequests, items).length;
    if (key === 'items') return pendingItemOrders(itemOrders).length;
    return 0;
  }

  return (
    <div className="tabs-wrap">
      <div className="tabs">
        {TAB_DEFS.filter((t) => !GOM_ONLY_TABS.includes(t.key) || unlocked).map((t) => {
          const n = badgeFor(t.key);
          return (
            <button
              key={t.key}
              className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
              onClick={() => onChange(t.key)}
            >
              {t.icon} {t.label}
              {n > 0 && <span className="tab-badge">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
