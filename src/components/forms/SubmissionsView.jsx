import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { fmt, formatClaimDate } from '../../lib/format';
import { toCsv, downloadCsv } from '../../lib/csv';
import ConfirmModal from '../shared/ConfirmModal';
import EmptyState from '../shared/EmptyState';
import ReceiptModal from '../shared/ReceiptModal';

function itemsSummary(submission) {
  return (submission.form_submission_items || [])
    .map((si) => {
      const name = si.form_items?.name || '—';
      const optionName = si.form_item_options?.members?.name;
      const qty = si.quantity || 1;
      return optionName ? `${name} (${optionName}) x${qty}` : `${name} x${qty}`;
    })
    .join('; ');
}

export default function SubmissionsView({ form, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [formRow, setFormRow] = useState(form);
  const [deleting, setDeleting] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState(null);

  async function load() {
    const { data, error } = await supabase
      .from('form_submissions')
      .select(`
        *,
        cadastro:cadastro_id ( apelido, nome_completo, phone, social ),
        form_submission_items (
          quantity,
          form_items ( name ),
          form_item_options ( member_id, members ( name ) )
        )
      `)
      .eq('form_id', form.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('SubmissionsView: failed to load submissions', error); return; }
    setSubmissions(data || []);
    setLoaded(true);
  }

  useEffect(() => { load(); }, [form.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleStatus() {
    const newStatus = formRow.status === 'open' ? 'closed' : 'open';
    const { data, error } = await supabase.from('forms').update({ status: newStatus }).eq('id', formRow.id).select().single();
    if (error) { console.error(error); return; }
    setFormRow(data);
  }

  async function handleDelete() {
    const { error } = await supabase.from('forms').delete().eq('id', formRow.id);
    if (error) { alert('Não foi possível remover este formulário.'); console.error(error); return; }
    onBack();
  }

  function handleExport() {
    // toCsv reads dotted paths off each row; inject the computed _itens field first.
    const rows = submissions.map((s) => ({ ...s, _itens: itemsSummary(s) }));
    downloadCsv(`respostas-${formRow.slug}.csv`, toCsv(rows, [
      { key: 'cadastro.apelido', label: 'Apelido' },
      { key: 'cadastro.nome_completo', label: 'Nome completo' },
      { key: 'cadastro.phone', label: 'Telefone' },
      { key: 'cadastro.social', label: '@' },
      { key: '_itens', label: 'Itens' },
      { key: 'payment_method', label: 'Pagamento' },
      { key: 'amount_paid', label: 'Valor pago' },
      { key: 'receipt_drive_link', label: 'Link do comprovante' },
      { key: 'comments', label: 'Comentários' },
      { key: 'joined_group', label: 'Entrou no grupo' },
      { key: 'created_at', label: 'Enviado em' },
    ]));
  }

  return (
    <>
      <div className="registry-toolbar">
        <button className="btn btn-ghost" onClick={onBack}>← Voltar</button>
        <h3 style={{ margin: 0 }}>{formRow.title}</h3>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={handleExport} disabled={submissions.length === 0}>⬇ Exportar CSV</button>
        <button className="btn btn-sage" onClick={toggleStatus}>{formRow.status === 'open' ? 'Encerrar formulário' : 'Reabrir formulário'}</button>
        <button className="btn btn-danger" onClick={() => setDeleting(true)}>🗑 Remover formulário</button>
      </div>

      {!loaded ? null : submissions.length === 0 ? (
        <EmptyState title="Nenhuma resposta ainda">As respostas enviadas pelo link público aparecerão aqui.</EmptyState>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Joiner</th>
                <th>Itens</th>
                <th>Pagamento</th>
                <th>Comprovante</th>
                <th>Comentários</th>
                <th>Grupo</th>
                <th>Enviado em</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.cadastro?.apelido || '—'}</b>
                    <br /><span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{s.cadastro?.phone}{s.cadastro?.social ? ' — ' + s.cadastro.social : ''}</span>
                  </td>
                  <td style={{ maxWidth: 280 }}>{itemsSummary(s)}</td>
                  <td>{s.payment_method === 'pix' ? 'Pix' : 'Cartão'}<br />{fmt(s.amount_paid)}</td>
                  <td>
                    {s.receipt_file_url && <button className="btn btn-outline" onClick={() => setViewingReceiptUrl(s.receipt_file_url)}>📎 Ver comprovante</button>}
                    {s.receipt_drive_link && <><br /><a href={s.receipt_drive_link} target="_blank" rel="noopener noreferrer">🔗 Link Drive</a></>}
                    {!s.receipt_file_url && !s.receipt_drive_link && '—'}
                  </td>
                  <td style={{ maxWidth: 200 }}>{s.comments || '—'}</td>
                  <td>{s.joined_group ? '✓' : '—'}</td>
                  <td style={{ fontSize: 11.5 }}>{formatClaimDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingReceiptUrl && <ReceiptModal imageUrl={viewingReceiptUrl} title="Comprovante" onClose={() => setViewingReceiptUrl(null)} />}
      {deleting && (
        <ConfirmModal
          title="Remover formulário"
          message="Tem certeza que deseja remover este formulário? Todas as respostas associadas também serão removidas. Essa ação não pode ser desfeita."
          confirmLabel="Remover"
          onCancel={() => setDeleting(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
