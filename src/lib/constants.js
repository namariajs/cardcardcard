export const STORAGE_KEYS = {
  items: 'gom-items',
  registry: 'gom-joiners-registry',
  paymentClaims: 'gom-payment-claims',
  shippingRequests: 'gom-shipping-requests',
  interBoxes: 'gom-inter-boxes',
  memberRosters: 'gom-member-rosters',
  itemOrders: 'gom-item-orders',
  itemCategories: 'gom-item-categories',
};

export const GOM_ONLY_TABS = ['registry', 'arquivo', 'joiners', 'inter', 'formularios'];

export const STATUS_CEG = {
  '-': '—',
  COLETANDO_CLAIMS: 'Coletando claims',
  ITENS_GARANTIDOS: 'Garantido',
  NA_WAREHOUSE: 'Na warehouse',
  CAMINHO_BRASIL: 'A caminho Brasil',
  TAXADA_RF: 'Taxada Receita Federal',
  MULTADA: 'Multada',
  CHEGOU_GOM: 'Chegou na GOM',
  SORTING: 'Sorting',
  ENVIO_NACIONAL: 'Envio nacional',
};

export const STATUS_ENVIO = {
  '-': '—',
  EM_SEPARACAO: 'Em separação',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
};

// Item categories used to be this fixed map. They're now GOM-editable and persisted in
// gom-item-categories (see AppContext), seeded from this list on first load so existing
// items' stored category codes (PHOTOCARD/MERCH/ALBUM) keep resolving to the same labels.
export const SEED_ITEM_CATEGORIES = [
  { id: 'PHOTOCARD', label: 'Photocard' },
  { id: 'MERCH', label: 'Merch' },
  { id: 'ALBUM', label: 'Álbum' },
];

export const TIPO_LABELS = {
  CEG_INTER: 'CEG Inter',
  CEG_NACIONAL: 'CEG Nacional',
  VENDA: 'Venda',
};

// 'ATRASADO' isn't manually selectable for pagItem/pagFreteInter/pagTaxa anymore — it's
// derived from prazo*/paidAt via effectivePagStatus() in calc.js instead.
export const PAG_OPTIONS = ['PENDENTE', 'PAGO'];

// Order used to decide whether an item has "reached" a CEG stage yet (Frete Nacional
// eligibility, etc). Index in this array = how far along the pipeline the item is.
export const CEG_STAGE_ORDER = [
  '-',
  'COLETANDO_CLAIMS',
  'ITENS_GARANTIDOS',
  'NA_WAREHOUSE',
  'CAMINHO_BRASIL',
  'TAXADA_RF',
  'MULTADA',
  'CHEGOU_GOM',
  'SORTING',
  'ENVIO_NACIONAL',
];

export function cegStageIndex(status) {
  const idx = CEG_STAGE_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

// Maps a payment "slot" on an item to its value/status/deadline/paid-at fields + a friendly label
export const PAYMENT_FIELDS = [
  { key: 'item', pagField: 'pagItem', valField: 'valorItem', label: 'Item', prazoField: 'prazoItem', paidAtField: 'pagItemPaidAt' },
  { key: 'freteInter', pagField: 'pagFreteInter', valField: 'valorFreteInter', label: 'Frete Internacional', prazoField: 'prazoFreteInter', paidAtField: 'pagFreteInterPaidAt' },
  { key: 'taxa', pagField: 'pagTaxa', valField: 'valorTaxa', label: 'Taxa', prazoField: 'prazoTaxa', paidAtField: 'pagTaxaPaidAt' },
];
export const PAYMENT_FIELDS_BY_KEY = Object.fromEntries(PAYMENT_FIELDS.map((f) => [f.key, f]));

export const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export const REMINDER_DAYS = 7;

// Shared by ItemModal (new/edit/duplicate item) and SetModal (bulk-create from a member
// list) — every field a fresh item needs before the user or a set fills anything in.
export const BLANK_ITEM = {
  joiner: '', itemName: '', ceg: '', loja: '',
  valorItem: 0, valorFreteInter: 0, valorTaxa: 0, valorFreteNacional: 0,
  pagItem: 'PENDENTE', pagFreteInter: 'PENDENTE', pagTaxa: 'PENDENTE', pagFreteNacional: 'PENDENTE',
  prazoItem: null, prazoFreteInter: null, prazoTaxa: null,
  pagItemPaidAt: null, pagFreteInterPaidAt: null, pagTaxaPaidAt: null,
  statusCeg: '-', statusEnvio: '-', rastreio: '-', notes: '', caixa: '-', hasPhoto: false,
  // Set true whenever an item is created with no photo attached, cleared the moment one
  // is — lets the GOM spot items still needing a real photo without opening each one.
  photoPending: false,
  category: '-', grupo: '-', membro: '-', tipo: 'CEG_INTER', unclaimed: false,
};

export const SEED_ITEMS = [
  { id: 'ITM-8F3K21', joiner: '@hanjirxse', itemName: 'Photocard', category: 'PHOTOCARD', grupo: 'ZB1', membro: 'Han', ceg: 'CEG MERCH SANRIO', loja: 'Flocked Keyring', valorItem: 75, valorFreteInter: 2.32, valorTaxa: 0, valorFreteNacional: 0, tipo: 'CEG_INTER', pagItem: 'PAGO', pagFreteInter: 'PENDENTE', pagTaxa: 'PENDENTE', pagFreteNacional: 'PENDENTE', statusCeg: 'CHEGOU_GOM', statusEnvio: '-', rastreio: '-', notes: '', caixa: '-', hasPhoto: false },
  { id: 'ITM-2QW9LP', joiner: '@nekkomimo', itemName: 'Keyring', category: 'MERCH', grupo: 'ZB1', membro: 'Jinret', ceg: 'CEG MERCH SANRIO', loja: 'Flocked Keyring', valorItem: 75, valorFreteInter: 2.32, valorTaxa: 0, valorFreteNacional: 0, tipo: 'CEG_INTER', pagItem: 'PAGO', pagFreteInter: 'PAGO', pagTaxa: 'PENDENTE', pagFreteNacional: 'ATRASADO', statusCeg: 'CAMINHO_BRASIL', statusEnvio: 'EM_SEPARACAO', rastreio: '-', notes: '', caixa: 'Caixa 1', hasPhoto: false },
  { id: 'ITM-VX771A', joiner: '@paris041430', itemName: 'Backpack', category: 'MERCH', grupo: 'ZB1', membro: 'Han Quokka', ceg: 'CEG 6TH FANMEETING', loja: 'Plush Backpack', valorItem: 265, valorFreteInter: 0, valorTaxa: 0, valorFreteNacional: 0, tipo: 'CEG_INTER', pagItem: 'PENDENTE', pagFreteInter: 'PENDENTE', pagTaxa: 'PENDENTE', pagFreteNacional: 'PENDENTE', statusCeg: '-', statusEnvio: '-', rastreio: '-', notes: '', caixa: '-', hasPhoto: false },
];
