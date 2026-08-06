import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
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
  { key: 'formularios', icon: '📝', label: 'Formulários' },
  { key: 'arquivo', icon: '📁', label: 'Arquivo' },
];

export default function Tabs({ activeTab, onChange }) {
  const { unlocked, paymentClaims, shippingRequests, items, itemOrders } = useApp();
  const [pendingSubmissionCount, setPendingSubmissionCount] = useState(0);

  // No "last viewed" mechanism exists anywhere in this app — every other badge here
  // (payments/frete/arquivo/items) is a pending-count, not a seen/unseen indicator, so
  // this follows that same established pattern instead of inventing a new one.
  // Re-fetched on every tab switch, same as re-opening the app — form_submissions
  // lives in Supabase, not AppContext, so it can't react to changes the way the
  // other badges automatically do.
  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    supabase.from('form_submissions').select('id', { count: 'exact', head: true }).eq('processing_status', 'pending')
      .then(({ count, error }) => {
        if (cancelled) return;
        if (error) { console.error('Tabs: failed to load pending form submission count', error); return; }
        setPendingSubmissionCount(count || 0);
      });
    return () => { cancelled = true; };
  }, [unlocked, activeTab]);

  function badgeFor(key) {
    if (!unlocked) return 0;
    if (key === 'payments') return pendingClaims(paymentClaims).length;
    if (key === 'frete') return pendingShippingRequests(shippingRequests).length;
    if (key === 'arquivo') return arquivoReminders(shippingRequests, items).length;
    if (key === 'items') return pendingItemOrders(itemOrders).length;
    if (key === 'formularios') return pendingSubmissionCount;
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
