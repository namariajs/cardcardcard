export const STORAGE_KEYS = {
  items: 'gom-items',
  registry: 'gom-joiners-registry',
  paymentClaims: 'gom-payment-claims',
  shippingRequests: 'gom-shipping-requests',
  interBoxes: 'gom-inter-boxes',
};

export const GOM_PIN = '1003';

export const GOM_ONLY_TABS = ['registry', 'arquivo', 'joiners', 'inter'];

export const STATUS_CEG = {
  '-': '—',
  COLETANDO_CLAIMS: 'Coletando claims',
  ITENS_GARANTIDOS: 'Itens garantidos',
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

export const ITEM_CATEGORIES = {
  '-': '—',
  PHOTOCARD: 'Photocard',
  MERCH: 'Merch',
  ALBUM: 'Álbum',
};

export const TIPO_LABELS = {
  CEG_INTER: 'CEG Inter',
  CEG_NACIONAL: 'CEG Nacional',
  VENDA: 'Venda',
};

export const PAG_OPTIONS = ['PENDENTE', 'PAGO', 'ATRASADO'];

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

// Maps a payment "slot" on an item to its value/status fields + a friendly label
export const PAYMENT_FIELDS = [
  { key: 'item', pagField: 'pagItem', valField: 'valorItem', label: 'Item' },
  { key: 'freteInter', pagField: 'pagFreteInter', valField: 'valorFreteInter', label: 'Frete Internacional' },
  { key: 'taxa', pagField: 'pagTaxa', valField: 'valorTaxa', label: 'Taxa' },
];

export const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export const REMINDER_DAYS = 7;

export const SEED_ITEMS = [
  { id: 'ITM-8F3K21', joiner: '@hanjirxse', itemName: 'Photocard', category: 'PHOTOCARD', grupo: 'ZB1', membro: 'Han', ceg: 'CEG MERCH SANRIO', loja: 'Flocked Keyring', valorItem: 75, valorFreteInter: 2.32, valorTaxa: 0, valorFreteNacional: 0, tipo: 'CEG_INTER', pagItem: 'PAGO', pagFreteInter: 'PENDENTE', pagTaxa: 'PENDENTE', pagFreteNacional: 'PENDENTE', statusCeg: 'CHEGOU_GOM', statusEnvio: '-', rastreio: '-', notes: '', caixa: '-', hasPhoto: false },
  { id: 'ITM-2QW9LP', joiner: '@nekkomimo', itemName: 'Keyring', category: 'MERCH', grupo: 'ZB1', membro: 'Jinret', ceg: 'CEG MERCH SANRIO', loja: 'Flocked Keyring', valorItem: 75, valorFreteInter: 2.32, valorTaxa: 0, valorFreteNacional: 0, tipo: 'CEG_INTER', pagItem: 'PAGO', pagFreteInter: 'PAGO', pagTaxa: 'PENDENTE', pagFreteNacional: 'ATRASADO', statusCeg: 'CAMINHO_BRASIL', statusEnvio: 'EM_SEPARACAO', rastreio: '-', notes: '', caixa: 'Caixa 1', hasPhoto: false },
  { id: 'ITM-VX771A', joiner: '@paris041430', itemName: 'Backpack', category: 'MERCH', grupo: 'ZB1', membro: 'Han Quokka', ceg: 'CEG 6TH FANMEETING', loja: 'Plush Backpack', valorItem: 265, valorFreteInter: 0, valorTaxa: 0, valorFreteNacional: 0, tipo: 'CEG_INTER', pagItem: 'PENDENTE', pagFreteInter: 'PENDENTE', pagTaxa: 'PENDENTE', pagFreteNacional: 'PENDENTE', statusCeg: '-', statusEnvio: '-', rastreio: '-', notes: '', caixa: '-', hasPhoto: false },
];
