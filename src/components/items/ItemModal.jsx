import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { resolveJoinerInput } from '../../lib/joiners';
import { genId } from '../../lib/format';
import { STATUS_CEG, STATUS_ENVIO, ITEM_CATEGORIES, PAG_OPTIONS } from '../../lib/constants';
import { resizeImageFile, loadPhoto } from '../../lib/storage';
import Modal from '../shared/Modal';

const BLANK = {
  joiner: '', itemName: '', ceg: '', loja: '',
  valorItem: 0, valorFreteInter: 0, valorTaxa: 0, valorFreteNacional: 0,
  pagItem: 'PENDENTE', pagFreteInter: 'PENDENTE', pagTaxa: 'PENDENTE', pagFreteNacional: 'PENDENTE',
  statusCeg: '-', statusEnvio: '-', rastreio: '-', notes: '', caixa: '-', hasPhoto: false,
  category: '-', grupo: '-', membro: '-', tipo: 'CEG_INTER',
};

export default function ItemModal({ itemId, onClose }) {
  const { items, registry, upsertItem, setItemPhoto, clearItemPhoto } = useApp();
  const existing = itemId ? items.find((i) => i.id === itemId) : null;

  const [form, setForm] = useState(() => (existing ? { ...existing } : { ...BLANK, id: genId() }));
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoDraft, setPhotoDraft] = useState({ dataUrl: null, remove: false });
  const [trackMsg, setTrackMsg] = useState(null);

  useEffect(() => {
    if (existing?.hasPhoto) loadPhoto(existing.id).then((u) => setPhotoUrl(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinerHint = useMemo(() => {
    const r = resolveJoinerInput(registry, form.joiner);
    if (!r.value) return null;
    if (r.match) return { text: `✓ Cadastrado: ${r.match.apelido}${r.match.nomeCompleto ? ' — ' + r.match.nomeCompleto : ''} (${r.match.social})`, color: '#2F5C40' };
    if (r.viaPhone) return { text: '⚠ Telefone não encontrado no Cadastro de Joiners', color: 'var(--pink-deep)' };
    return { text: '⚠ Este @ ainda não está no Cadastro de Joiners', color: 'var(--pink-deep)' };
  }, [form.joiner, registry]);

  const grupoOptions = useMemo(() => [...new Set(items.map((i) => i.grupo).filter((g) => g && g !== '-'))].sort(), [items]);
  const membroOptions = useMemo(() => [...new Set(items.map((i) => i.membro).filter((m) => m && m !== '-'))].sort(), [items]);
  const cegOptions = useMemo(() => [...new Set(items.map((i) => i.ceg).filter((c) => c && c.trim()))].sort(), [items]);
  const caixaOptions = useMemo(() => [...new Set(items.map((i) => i.caixa).filter((c) => c && c !== '-'))].sort(), [items]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleJoinerBlur() {
    const r = resolveJoinerInput(registry, form.joiner);
    if (r.viaPhone && r.match) set('joiner', r.match.social);
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setPhotoDraft({ dataUrl, remove: false });
      setPhotoUrl(dataUrl);
    } catch {
      alert('Não foi possível carregar essa imagem.');
    }
  }

  function handleRemovePhoto() {
    setPhotoDraft({ dataUrl: null, remove: true });
    setPhotoUrl(null);
  }

  function openCorreios() {
    const code = (form.rastreio || '').trim();
    if (!code || code === '-') { alert('Informe um código de rastreio primeiro.'); return; }
    window.open('https://rastreamento.correios.com.br/app/index.php?objetos=' + encodeURIComponent(code), '_blank');
  }

  function markDelivered() {
    set('statusEnvio', 'ENTREGUE');
    setTrackMsg({ text: 'Status de envio marcado como Entregue. Clique em salvar para confirmar.', kind: 'ok' });
  }

  async function handleSave() {
    const joinerResolved = resolveJoinerInput(registry, form.joiner);
    const newItem = {
      ...form,
      joiner: joinerResolved.value || '@sem-nome',
      itemName: (form.itemName || '').trim() || 'Item sem nome',
      grupo: (form.grupo || '').trim() || '-',
      membro: (form.membro || '').trim() || '-',
      ceg: (form.ceg || '').trim(),
      loja: (form.loja || '').trim(),
      valorItem: parseFloat(String(form.valorItem).replace(',', '.')) || 0,
      valorFreteInter: parseFloat(String(form.valorFreteInter).replace(',', '.')) || 0,
      valorTaxa: parseFloat(String(form.valorTaxa).replace(',', '.')) || 0,
      rastreio: (form.rastreio || '').trim() || '-',
      caixa: (form.caixa || '').trim() || '-',
      hasPhoto: existing ? !!existing.hasPhoto : false,
    };

    if (photoDraft.dataUrl) {
      await setItemPhoto(newItem.id, photoDraft.dataUrl);
      newItem.hasPhoto = true;
    } else if (photoDraft.remove) {
      await clearItemPhoto(newItem.id);
      newItem.hasPhoto = false;
    }

    upsertItem(newItem);
    onClose();
  }

  const showInterFields = form.tipo === 'CEG_INTER';
  const showCaixaHint = form.statusCeg === 'CAMINHO_BRASIL';

  return (
    <Modal onClose={onClose}>
      <h3>{itemId ? 'Editar item' : 'Adicionar item'}</h3>
      <p className="hint">ID: <span className="mono">{form.id}</span></p>
      <div className="form-grid">
        <div className="field full">
          <label>Foto do item</label>
          <div className="photo-upload-row">
            <div className="photo-preview">{photoUrl ? <img src={photoUrl} alt="" /> : <span>🖼️</span>}</div>
            <div className="photo-upload-actions">
              <input type="file" id="photoInput" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              <button type="button" className="btn btn-ghost" onClick={() => document.getElementById('photoInput').click()}>📷 Escolher foto</button>
              {(existing?.hasPhoto || photoUrl) && (
                <button type="button" className="btn btn-danger" onClick={handleRemovePhoto}>🗑 Remover foto</button>
              )}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Joiner (@ ou telefone)</label>
          <input list="joinerDatalist" autoComplete="off" placeholder="@usuario ou (11) 91234-5678"
            value={form.joiner} onChange={(e) => set('joiner', e.target.value)} onBlur={handleJoinerBlur} />
          <datalist id="joinerDatalist">
            {registry.map((r) => <option key={r.id} value={r.social}>{r.apelido}{r.phone ? ' — ' + r.phone : ''}</option>)}
          </datalist>
          {joinerHint && <div style={{ fontSize: 11, marginTop: 4, color: joinerHint.color }}>{joinerHint.text}</div>}
        </div>

        <div className="field">
          <label>Categoria do item</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(ITEM_CATEGORIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Item</label>
          <input placeholder="Ex: Photocard, Keyring, Álbum..." value={form.itemName} onChange={(e) => set('itemName', e.target.value)} />
        </div>

        <div className="field">
          <label>Grupo</label>
          <input list="grupoDatalist" autoComplete="off" placeholder="Ex: ZB1"
            value={form.grupo === '-' ? '' : form.grupo} onChange={(e) => set('grupo', e.target.value)} />
          <datalist id="grupoDatalist">{grupoOptions.map((g) => <option key={g} value={g} />)}</datalist>
        </div>

        <div className="field">
          <label>Membro</label>
          <input list="membroDatalist" autoComplete="off" placeholder="Ex: Han"
            value={form.membro === '-' ? '' : form.membro} onChange={(e) => set('membro', e.target.value)} />
          <datalist id="membroDatalist">{membroOptions.map((m) => <option key={m} value={m} />)}</datalist>
        </div>

        <div className="field">
          <label>CEG</label>
          <input list="cegDatalist" autoComplete="off" placeholder="CEG..." value={form.ceg} onChange={(e) => set('ceg', e.target.value)} />
          <datalist id="cegDatalist">{cegOptions.map((c) => <option key={c} value={c} />)}</datalist>
        </div>

        <div className="field">
          <label>Loja / POB</label>
          <input placeholder="Loja" value={form.loja} onChange={(e) => set('loja', e.target.value)} />
        </div>

        <div className="field full">
          <label>Tipo</label>
          <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
            <option value="CEG_INTER">CEG Inter</option>
            <option value="CEG_NACIONAL">CEG Nacional</option>
            <option value="VENDA">Venda</option>
          </select>
        </div>

        <div className="field">
          <label>Valor item (R$)</label>
          <input value={form.valorItem} onChange={(e) => set('valorItem', e.target.value)} />
        </div>
        <div className="field">
          <label>Pagamento item</label>
          <select value={form.pagItem} onChange={(e) => set('pagItem', e.target.value)}>
            {PAG_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>

        {showInterFields && (
          <>
            <div className="field">
              <label>Frete internacional (R$)</label>
              <input value={form.valorFreteInter} onChange={(e) => set('valorFreteInter', e.target.value)} />
            </div>
            <div className="field">
              <label>Pagamento frete inter.</label>
              <select value={form.pagFreteInter} onChange={(e) => set('pagFreteInter', e.target.value)}>
                {PAG_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Taxa (R$)</label>
              <input value={form.valorTaxa} onChange={(e) => set('valorTaxa', e.target.value)} />
            </div>
            <div className="field">
              <label>Pagamento taxa</label>
              <select value={form.pagTaxa} onChange={(e) => set('pagTaxa', e.target.value)}>
                {PAG_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="field">
          <label>Status CEG</label>
          <select value={form.statusCeg} onChange={(e) => set('statusCeg', e.target.value)}>
            {Object.entries(STATUS_CEG).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Status envio</label>
          <select value={form.statusEnvio} onChange={(e) => set('statusEnvio', e.target.value)}>
            {Object.entries(STATUS_ENVIO).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>

        <div className="field full">
          <label>Caixa (lote de envio)</label>
          <input list="caixaDatalist" autoComplete="off" placeholder="Ex: Caixa 3"
            value={form.caixa === '-' ? '' : form.caixa} onChange={(e) => set('caixa', e.target.value)} />
          <datalist id="caixaDatalist">{caixaOptions.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="caixa-hint">{showCaixaHint ? '💡 Este item está a caminho do Brasil — associe a uma caixa para acompanhar o lote.' : ''}</div>
        </div>

        <div className="field full">
          <label>Rastreio</label>
          <input placeholder="-" value={form.rastreio} onChange={(e) => set('rastreio', e.target.value)} />
          <div className="track-row">
            <button className="btn btn-outline" type="button" onClick={openCorreios}>🔗 Ver nos Correios</button>
            <button className="btn btn-sage" type="button" onClick={markDelivered}>✓ Marcar como entregue</button>
          </div>
          {trackMsg && <div className={`track-msg ${trackMsg.kind}`}>{trackMsg.text}</div>}
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>{itemId ? 'Salvar alterações' : 'Adicionar item'}</button>
      </div>
    </Modal>
  );
}
