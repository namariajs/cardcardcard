import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { findRegistryConflict } from '../../lib/joiners';
import { genRegId, normHandle } from '../../lib/format';
import { uploadFormUpload } from '../../lib/storage';
import EmptyState from '../shared/EmptyState';
import IntroSection from './IntroSection';
import ItemsSection from './ItemsSection';
import PaymentSection from './PaymentSection';
import ConfirmationSection from './ConfirmationSection';

const BLANK_IDENTITY = { mode: 'existing', cadastroId: null, matchedCadastro: null, apelido: '', phone: '', social: '', agreedToTerms: false };
const BLANK_PAYMENT = { method: '', amountPaid: '', receiptFile: null, receiptDriveLink: '', comments: '' };

function buildSubmissionItems(formItems, selections) {
  const rows = [];
  formItems.forEach((item) => {
    const sel = selections[item.id];
    if (!sel) return;
    if (item.selection_type === 'random') {
      const qty = Number(sel.quantity) || 0;
      if (qty > 0) rows.push({ form_item_id: item.id, option_id: null, quantity: qty });
    } else if (item.selection_type === 'single_choice') {
      (sel.selectedOptionIds || []).forEach((optId) => rows.push({ form_item_id: item.id, option_id: optId, quantity: 1 }));
    } else if (item.selection_type === 'multi_choice_qty') {
      Object.entries(sel.qtyByOptionId || {}).forEach(([optId, qty]) => {
        const q = Number(qty) || 0;
        if (q > 0) rows.push({ form_item_id: item.id, option_id: optId, quantity: q });
      });
    }
  });
  return rows;
}

export default function PublicFormPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'unavailable' | 'ready'
  const [form, setForm] = useState(null);
  const [formItems, setFormItems] = useState([]);
  const [cadastroList, setCadastroList] = useState([]);
  const [step, setStep] = useState('intro'); // 'intro' | 'items' | 'payment' | 'confirmation' | 'success'
  const [identity, setIdentity] = useState(BLANK_IDENTITY);
  const [selections, setSelections] = useState({});
  const [payment, setPayment] = useState(BLANK_PAYMENT);
  const [joinedGroup, setJoinedGroup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: formData, error } = await supabase.from('forms').select('*').eq('slug', slug).maybeSingle();
      if (cancelled) return;
      if (error || !formData) { setStatus('unavailable'); return; }
      const pastDeadline = formData.deadline && new Date(formData.deadline) < new Date();
      if (formData.status === 'closed' || pastDeadline) { setStatus('unavailable'); setForm(formData); return; }

      const { data: itemRows } = await supabase
        .from('form_items')
        .select('*, form_item_options ( id, member_id, members ( name ) )')
        .eq('form_id', formData.id)
        .order('order_index');
      const { data: cadastroRows } = await supabase.from('cadastro').select('*');
      if (cancelled) return;
      setForm(formData);
      setFormItems(itemRows || []);
      setCadastroList(cadastroRows || []);
      setStatus('ready');
    })();
    return () => { cancelled = true; };
  }, [slug]);

  async function resolveCadastroId() {
    if (identity.mode === 'existing') return identity.cadastroId;
    const conflict = findRegistryConflict(cadastroList, { social: identity.social, phone: identity.phone, nomeCompleto: '' });
    if (conflict) return conflict.id;
    const id = genRegId();
    const { error } = await supabase.from('cadastro').insert({
      id, apelido: identity.apelido.trim(), nome_completo: '', phone: identity.phone.trim(), social: normHandle(identity.social.trim()),
    });
    if (error) throw error;
    return id;
  }

  async function handleFinalSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const cadastroId = await resolveCadastroId();

      let receiptFileUrl = null;
      if (payment.receiptFile) {
        receiptFileUrl = await uploadFormUpload(payment.receiptFile);
      }

      const { data: submission, error: subError } = await supabase.from('form_submissions').insert({
        form_id: form.id,
        cadastro_id: cadastroId,
        payment_method: payment.method,
        amount_paid: parseFloat(String(payment.amountPaid).replace(',', '.')) || 0,
        receipt_file_url: receiptFileUrl,
        receipt_drive_link: payment.receiptDriveLink.trim() || null,
        comments: payment.comments.trim(),
        agreed_to_terms: identity.agreedToTerms,
        joined_group: joinedGroup,
      }).select().single();
      if (subError) throw subError;

      const itemRows = buildSubmissionItems(formItems, selections).map((row) => ({ ...row, submission_id: submission.id }));
      if (itemRows.length) {
        const { error: itemsError } = await supabase.from('form_submission_items').insert(itemRows);
        if (itemsError) throw itemsError;
      }

      setStep('success');
    } catch (e) {
      console.error('PublicFormPage: submit failed', e);
      setSubmitError('Não foi possível enviar seu formulário. Tente novamente em alguns instantes.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <div className="public-form-page"><p className="hint">Carregando...</p></div>;
  }

  if (status === 'unavailable') {
    return (
      <div className="public-form-page">
        <EmptyState title="Formulário encerrado">
          {form?.title ? `"${form.title}" não está mais aceitando respostas.` : 'Este link não existe ou não está mais disponível.'}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="public-form-page">
      <div className="public-form-card">
        {step === 'intro' && (
          <IntroSection form={form} cadastroList={cadastroList} identity={identity} setIdentity={setIdentity} onNext={() => setStep('items')} />
        )}
        {step === 'items' && (
          <ItemsSection formItems={formItems} selections={selections} setSelections={setSelections} onNext={() => setStep('payment')} onBack={() => setStep('intro')} />
        )}
        {step === 'payment' && (
          <PaymentSection form={form} payment={payment} setPayment={setPayment} onNext={() => setStep('confirmation')} onBack={() => setStep('items')} />
        )}
        {step === 'confirmation' && (
          <ConfirmationSection form={form} joinedGroup={joinedGroup} setJoinedGroup={setJoinedGroup} onSubmit={handleFinalSubmit} onBack={() => setStep('payment')} submitting={submitting} />
        )}
        {step === 'success' && (
          <div className="form-section" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>🎉</div>
            <h3>Formulário enviado!</h3>
            {form.thank_you_text && <p className="hint">{form.thank_you_text}</p>}
          </div>
        )}
        {submitError && <p className="hint" style={{ color: 'var(--pink-deep)', textAlign: 'center' }}>{submitError}</p>}
      </div>
    </div>
  );
}
