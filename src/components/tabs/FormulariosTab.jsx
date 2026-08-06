import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabaseClient';
import { formatDateOnly } from '../../lib/format';
import FormWizardModal from '../forms/FormWizardModal';
import SubmissionsView from '../forms/SubmissionsView';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';

export default function FormulariosTab() {
  const { unlocked } = useApp();
  const [forms, setForms] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [wizardFormId, setWizardFormId] = useState(undefined); // undefined = closed, null = creating, id = editing
  const [viewingId, setViewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [pendingCounts, setPendingCounts] = useState({}); // form_id -> count of processing_status='pending' submissions

  const load = useCallback(async () => {
    const [{ data, error }, { data: pendingRows, error: pendingError }] = await Promise.all([
      supabase.from('forms').select('*, form_submissions(count)').order('created_at', { ascending: false }),
      supabase.from('form_submissions').select('form_id').eq('processing_status', 'pending'),
    ]);
    if (error) { console.error('FormulariosTab: failed to load forms', error); return; }
    if (pendingError) console.error('FormulariosTab: failed to load pending submission counts', pendingError);
    setForms(data || []);
    const counts = {};
    (pendingRows || []).forEach((r) => { counts[r.form_id] = (counts[r.form_id] || 0) + 1; });
    setPendingCounts(counts);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    const { error } = await supabase.from('forms').delete().eq('id', id);
    if (error) { alert('Não foi possível remover este formulário.'); console.error(error); return; }
    setDeletingId(null);
    load();
  }

  function publicUrl(slug) {
    return `${window.location.origin}/f/${slug}`;
  }

  async function handleCopy(form) {
    try {
      await navigator.clipboard.writeText(publicUrl(form.slug));
      setCopiedId(form.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      alert(publicUrl(form.slug));
    }
  }

  if (!unlocked) {
    return <EmptyState title="Modo GOM necessário">Você não tem acesso a essa página.</EmptyState>;
  }

  if (viewingId) {
    const form = forms.find((f) => f.id === viewingId);
    return <SubmissionsView form={form} onBack={() => { setViewingId(null); load(); }} />;
  }

  return (
    <>
      <div className="registry-toolbar">
        <h3 style={{ margin: 0 }}>📝 Formulários</h3>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => setWizardFormId(null)}>+ Novo formulário</button>
      </div>

      {!loaded ? null : forms.length === 0 ? (
        <EmptyState title="Nenhum formulário criado">Clique em "Novo formulário" para começar sua primeira campanha de claim/compra.</EmptyState>
      ) : (
        <div className="grid">
          {forms.map((f) => {
            const count = f.form_submissions?.[0]?.count ?? 0;
            const isClosed = f.status === 'closed';
            const pastDeadline = f.deadline && new Date(f.deadline) < new Date();
            return (
              <div className="reg-card" key={f.id}>
                <div className="item-top">
                  <div className="reg-name">{f.title}</div>
                  <span className={`badge ${isClosed ? 'neutral' : pastDeadline ? 'atrasado' : 'pago'}`}>
                    {isClosed ? '🔒 Encerrado' : pastDeadline ? '⏰ Prazo encerrado' : '🟢 Aberto'}
                  </span>
                </div>
                <div className="reg-row"><b>Prazo:</b> {f.deadline ? formatDateOnly(f.deadline) : '—'}</div>
                <div className="reg-row"><b>Respostas:</b> {count}</div>
                <div className="reg-row mono" style={{ fontSize: 11.5, wordBreak: 'break-all' }}>{publicUrl(f.slug)}</div>
                <div className="card-actions">
                  <button className="btn btn-ghost" onClick={() => handleCopy(f)}>{copiedId === f.id ? '✓ Copiado' : '🔗 Copiar link'}</button>
                  <button className="btn btn-ghost" onClick={() => setViewingId(f.id)}>
                    📋 Respostas{pendingCounts[f.id] > 0 && <span className="tab-badge">{pendingCounts[f.id]}</span>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setWizardFormId(f.id)}>✎ Editar</button>
                  <button className="btn btn-danger" onClick={() => setDeletingId(f.id)}>🗑 Remover</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wizardFormId !== undefined && (
        <FormWizardModal formId={wizardFormId} onClose={() => setWizardFormId(undefined)} onSaved={load} />
      )}
      {deletingId && (
        <ConfirmModal
          title="Remover formulário"
          message="Tem certeza que deseja remover este formulário? Todas as respostas associadas também serão removidas. Essa ação não pode ser desfeita."
          confirmLabel="Remover"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => handleDelete(deletingId)}
        />
      )}
    </>
  );
}
