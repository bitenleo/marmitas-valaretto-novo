const WHATSAPP_NUMBER = '5517981130555';
const SIZES = {
  mini: { label: 'Mini', price: 20, refogados: 1, massas: 1, carnes: 1 },
  medio: { label: 'Médio', price: 25, refogados: 1, massas: 1, carnes: 2 },
  grande: { label: 'Grande', price: 35, refogados: 1, massas: 2, carnes: 2 }
};
const PAYMENT_LABELS = {
  card: 'Cartão',
  cash: 'Dinheiro',
  pix: 'PIX'
};

const state = {
  menu: null,
  size: 'mini',
  rice: '',
  beans: true,
  farofa: true,
  skipRefogado: false,
  skipMassa: false,
  refogados: [],
  massas: [],
  carnes: [],
  items: [],
  nextItemId: 1,
  fulfillment: 'pickup',
  payment: ''
};

const $ = (id) => document.getElementById(id);

async function loadMenu() {
  try {
    const res = await fetch('/api/menu', { cache: 'no-store' });
    if (!res.ok) throw new Error('API indisponível');
    state.menu = await res.json();
  } catch {
    const res = await fetch('/menu.json', { cache: 'no-store' });
    state.menu = await res.json();
  }
  const riceOptions = normalizeRiceOptions(state.menu.arrozOptions);
  state.menu.arrozOptions = riceOptions;
  state.rice = riceOptions[0] || 'Arroz Branco';
  renderAll();
}

function renderAll() {
  $('menuDate').textContent = `Cardápio • ${state.menu.date || 'Hoje'}`;
  $('menuNotice').textContent = state.menu.notice || '';
  renderRice();
  renderOptions('refogados', state.menu.refogados || [], 'refogados');
  renderOptions('massas', state.menu.massas || [], 'massas');
  renderOptions('carnes', state.menu.carnes || [], 'carnes');
  renderSummary('summaryRefogados', state.menu.refogados || []);
  renderSummary('summaryMassas', state.menu.massas || []);
  renderSummary('summaryCarnes', state.menu.carnes || []);
  updateLimits();
  renderCart();
  renderPaymentOptions();
  updatePriceSummary();
}

function normalizeRiceOptions(raw) {
  const list = Array.isArray(raw) ? raw : [raw || ''];
  const normalized = list
    .flatMap(value => String(value).split(/[\n,;/|]+/))
    .map(value => value.trim())
    .filter(Boolean);
  return normalized.length ? [...new Set(normalized)] : ['Arroz Branco'];
}

function renderRice() {
  const host = $('riceOptions');
  host.innerHTML = '';
  const options = normalizeRiceOptions(state.menu.arrozOptions);
  state.menu.arrozOptions = options;
  if (!options.includes(state.rice)) state.rice = options[0];
  options.forEach((name) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = name.replace(/^Arroz\s+/i, '');
    btn.className = name === state.rice ? 'is-selected' : '';
    btn.addEventListener('click', () => {
      state.rice = name;
      renderRice();
      hideError();
    });
    host.appendChild(btn);
  });
}

function renderOptions(containerId, options, stateKey) {
  const host = $(containerId);
  host.innerHTML = '';

  const canSkip = stateKey === 'refogados' || stateKey === 'massas';
  const skipKey = stateKey === 'refogados' ? 'skipRefogado' : 'skipMassa';
  if (canSkip) {
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    const skipSelected = state[skipKey];
    skipBtn.className = `option-btn${skipSelected ? ' is-selected' : ''}`;
    const label = stateKey === 'refogados' ? 'Não quero refogado' : 'Não quero massa';
    skipBtn.innerHTML = `<span class="checkmark">✓</span><span>${label}</span>`;
    skipBtn.addEventListener('click', () => {
      state[skipKey] = !state[skipKey];
      if (state[skipKey]) state[stateKey] = [];
      hideError();
      hideBuilderStatus();
      renderOptions(containerId, options, stateKey);
    });
    host.appendChild(skipBtn);
  }

  if (!options.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-option';
    empty.textContent = 'Nenhuma opção cadastrada hoje.';
    host.appendChild(empty);
    return;
  }
  const limit = SIZES[state.size][stateKey];
  const effectiveLimit = Math.min(limit, options.length);
  state[stateKey] = state[stateKey].filter(v => options.includes(v)).slice(0, effectiveLimit);
  options.forEach((name) => {
    const selected = state[stateKey].includes(name);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `option-btn${selected ? ' is-selected' : ''}`;
    btn.innerHTML = `<span class="checkmark">✓</span><span>${escapeHtml(name)}</span>`;
    btn.addEventListener('click', () => toggleOption(stateKey, name, options));
    host.appendChild(btn);
  });
}

function toggleOption(key, value, options) {
  if (key === 'refogados') state.skipRefogado = false;
  if (key === 'massas') state.skipMassa = false;
  const wanted = SIZES[state.size][key];
  const limit = Math.min(wanted, options.length);
  const list = state[key];
  if (list.includes(value)) {
    state[key] = list.filter(v => v !== value);
  } else if (list.length < limit) {
    state[key] = [...list, value];
  } else if (limit === 1) {
    state[key] = [value];
  } else {
    return showError(`Para a marmita ${SIZES[state.size].label}, escolha até ${limit} ${labelFor(key, limit)}.`);
  }
  hideError();
  renderOptions(key, options, key);
}

function updateLimits() {
  const s = SIZES[state.size];
  $('refogadoLimit').textContent = `Escolha ${Math.min(s.refogados, state.menu.refogados?.length || s.refogados)} ou não queira`;
  $('massaLimit').textContent = `Escolha ${Math.min(s.massas, state.menu.massas?.length || s.massas)} ou não queira`;

  const carneLimit = Math.min(s.carnes, state.menu.carnes?.length || s.carnes);
  if (s.carnes > 1) {
    $('carneLimit').textContent = carneLimit > 1
      ? `Escolha 1 ou ${carneLimit} carnes • 1 opção = dobrada`
      : 'Escolha 1 carne • porção dobrada';
  } else {
    $('carneLimit').textContent = 'Escolha 1 carne';
  }
}

function renderSummary(id, items) {
  const host = $(id);
  host.innerHTML = items.length ? items.map(v => `<li>${escapeHtml(v)}</li>`).join('') : '<li>Sem opções cadastradas.</li>';
}

function chooseSize(size) {
  state.size = size;
  document.querySelectorAll('.size-card').forEach(btn => {
    const active = btn.dataset.size === size;
    btn.classList.toggle('is-selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  ['refogados', 'massas', 'carnes'].forEach(key => {
    const opts = state.menu?.[key] || [];
    state[key] = state[key].slice(0, Math.min(SIZES[size][key], opts.length));
    if (state.menu) renderOptions(key, opts, key);
  });
  if (state.menu) updateLimits();
  hideBuilderStatus();
  hideError();
}

function labelFor(key, count) {
  if (key === 'carnes') return count === 1 ? 'carne' : 'carnes';
  if (key === 'massas') return count === 1 ? 'massa' : 'massas';
  return count === 1 ? 'refogado' : 'refogados';
}

function validateDraft() {
  if (!state.menu) return 'O cardápio ainda está carregando.';
  const s = SIZES[state.size];
  const needs = [
    ['refogados', state.menu.refogados || []],
    ['massas', state.menu.massas || []],
    ['carnes', state.menu.carnes || []]
  ];
  for (const [key, options] of needs) {
    const required = Math.min(s[key], options.length);
    const skipped = key === 'refogados' ? state.skipRefogado : key === 'massas' ? state.skipMassa : false;

    if (key === 'carnes') {
      if (required > 0 && state.carnes.length < 1) {
        return `Escolha pelo menos 1 carne para a marmita ${s.label}.`;
      }
      if (state.carnes.length > required) {
        return `Escolha no máximo ${required} ${labelFor(key, required)} para a marmita ${s.label}.`;
      }
      continue;
    }

    if (!skipped && required > 0 && state[key].length !== required) {
      const extra = ' ou selecione “Não quero”.';
      return `Escolha ${required} ${labelFor(key, required)} para a marmita ${s.label}${extra}`;
    }
  }
  const qty = Math.max(0, Number($('quantity').value || 0));
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return 'Informe uma quantidade entre 1 e 20.';
  return '';
}

function addMarmita() {
  const error = validateDraft();
  if (error) return showError(error);

  const size = SIZES[state.size];
  const qty = Number($('quantity').value);
  state.items.push({
    id: state.nextItemId++,
    size: state.size,
    sizeLabel: size.label,
    unitPrice: size.price,
    qty,
    rice: state.rice,
    beans: state.beans,
    farofa: state.farofa,
    skipRefogado: state.skipRefogado,
    skipMassa: state.skipMassa,
    refogados: [...state.refogados],
    massas: [...state.massas],
    carnes: [...state.carnes]
  });

  hideError();
  showBuilderStatus(`${qty} ${qty === 1 ? 'marmita adicionada' : 'marmitas adicionadas'} ao pedido.`);
  resetDraftForNextItem();
  renderCart();
  updatePriceSummary();
}

function resetDraftForNextItem() {
  state.refogados = [];
  state.massas = [];
  state.carnes = [];
  state.skipRefogado = false;
  state.skipMassa = false;
  state.beans = true;
  state.farofa = true;
  $('feijao').checked = true;
  $('farofa').checked = true;
  $('quantity').value = '1';
  if (!state.menu) return;
  renderOptions('refogados', state.menu.refogados || [], 'refogados');
  renderOptions('massas', state.menu.massas || [], 'massas');
  renderOptions('carnes', state.menu.carnes || [], 'carnes');
}

function formatMeatChoice(item) {
  const selected = item.carnes.join(' + ') || '—';
  const doubled = SIZES[item.size]?.carnes > 1 && item.carnes.length === 1;
  return doubled ? `${selected} (dobrada)` : selected;
}

function renderCart() {
  const host = $('cartItems');
  host.innerHTML = '';
  const totalQty = state.items.reduce((sum, item) => sum + item.qty, 0);
  $('cartCount').textContent = `${totalQty} ${totalQty === 1 ? 'marmita' : 'marmitas'}`;
  $('cartEmpty').hidden = state.items.length > 0;
  $('clearCartBtn').hidden = state.items.length === 0;
  $('addMarmitaBtn').querySelector('strong').textContent = state.items.length ? 'Adicionar outra marmita' : 'Adicionar marmita ao pedido';

  state.items.forEach((item, index) => {
    const div = document.createElement('article');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item__top">
        <div>
          <span class="cart-item__number">Marmita ${index + 1}</span>
          <strong>${item.qty}x ${escapeHtml(item.sizeLabel)}</strong>
        </div>
        <div class="cart-item__price">${money(item.unitPrice * item.qty)}</div>
      </div>
      <div class="cart-item__details">
        <span>${escapeHtml(item.rice)} • Feijão: ${item.beans ? 'sim' : 'não'} • Farofa: ${item.farofa ? 'sim' : 'não'}</span>
        <span>Refogado: ${item.skipRefogado ? 'Não quero' : escapeHtml(item.refogados.join(' + ') || '—')}</span>
        <span>Massa: ${item.skipMassa ? 'Não quero' : escapeHtml(item.massas.join(' + ') || '—')}</span>
        <span>Carne: ${escapeHtml(formatMeatChoice(item))}</span>
      </div>
      <button class="remove-item-btn" type="button" data-remove-item="${item.id}">Remover</button>`;
    host.appendChild(div);
  });
}

function removeCartItem(id) {
  state.items = state.items.filter(item => item.id !== id);
  renderCart();
  updatePriceSummary();
  hideError();
}

function clearCart() {
  state.items = [];
  renderCart();
  updatePriceSummary();
  hideBuilderStatus();
  hideError();
}

function showBuilderStatus(message) {
  const box = $('builderStatus');
  box.textContent = message;
  box.hidden = false;
}

function hideBuilderStatus() {
  $('builderStatus').hidden = true;
}

function chooseFulfillment(mode) {
  state.fulfillment = mode;
  document.querySelectorAll('.fulfillment-card').forEach(btn => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('is-selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  $('deliveryFields').hidden = mode !== 'delivery';
  renderPaymentOptions();
  updatePriceSummary();
  hideError();
}

function renderPaymentOptions() {
  document.querySelectorAll('.payment-card').forEach(btn => {
    btn.hidden = false;
    const active = btn.dataset.payment === state.payment;
    btn.classList.toggle('is-selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  $('cashChangeWrap').hidden = state.payment !== 'cash';
  $('pixNotice').hidden = false;
  $('paymentHelper').textContent = state.fulfillment === 'delivery'
    ? 'Pagamento somente na entrega'
    : 'Pagamento somente no caixa';
  $('pixNotice').textContent = state.fulfillment === 'delivery'
    ? 'Pagamento somente no momento da entrega. Escolha entre cartão, dinheiro ou PIX. Não há pagamento antecipado pelo site.'
    : 'Pagamento somente no caixa no momento da retirada. Escolha entre cartão, dinheiro ou PIX. Não há pagamento antecipado pelo site.';
}

function choosePayment(payment) {
  state.payment = payment;
  renderPaymentOptions();
  hideError();
}

function getTotals() {
  const subtotal = state.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  return { subtotal, total: subtotal };
}

function updatePriceSummary() {
  if (!$('subtotalValue')) return;
  const { subtotal, total } = getTotals();
  $('subtotalValue').textContent = money(subtotal);
  $('deliveryValue').textContent = state.fulfillment === 'pickup'
    ? 'Grátis (retirada)'
    : 'Informada no WhatsApp';
  $('totalValue').textContent = state.fulfillment === 'pickup'
    ? money(total)
    : 'A confirmar';
}

function validateOrder() {
  if (!state.items.length) return 'Adicione pelo menos uma marmita ao pedido.';
  if (!$('customerName').value.trim()) return 'Informe seu nome antes de enviar o pedido.';
  if (!state.payment) return 'Escolha a forma de pagamento.';

  if (state.fulfillment === 'delivery') {
    if (!$('deliveryCep').value.trim()) return 'Informe o CEP para entrega.';
    if (!$('deliveryStreet').value.trim()) return 'Informe o endereço/rua para entrega.';
    if (!$('deliveryNumber').value.trim()) return 'Informe o número do endereço.';
  }

  if (state.payment === 'cash' && $('changeFor').value.trim()) {
    const change = parseBrazilianMoney($('changeFor').value);
    const { subtotal } = getTotals();
    if (!Number.isFinite(change) || change <= 0) return 'Informe um valor válido para o troco.';
    if (change < subtotal) return `O valor para troco deve ser pelo menos ${money(subtotal)}.`;
  }
  return '';
}

function buildMessage() {
  const { subtotal, total } = getTotals();
  const totalQty = state.items.reduce((sum, item) => sum + item.qty, 0);
  const line = '--------------------------------';

  const lines = [
    '*NOVO PEDIDO - MASSAS VALARETTO*',
    line,
    '',
    '*CLIENTE*',
    `Nome: ${$('customerName').value.trim()}`,
    `Cardápio: ${state.menu.date || 'Hoje'}`,
    `Total de marmitas: ${totalQty}`,
    ''
  ];

  state.items.forEach((item, index) => {
    lines.push(
      line,
      `*MARMITA ${index + 1} - ${item.qty}x ${item.sizeLabel.toUpperCase()}*`,
      '',
      `Valor unitário: ${money(item.unitPrice)}`,
      `Subtotal desta marmita: ${money(item.unitPrice * item.qty)}`,
      '',
      '*ACOMPANHAMENTOS*',
      `Arroz: ${item.rice}`,
      `Feijão: ${item.beans ? 'Sim' : 'Não'}`,
      `Farofa: ${item.farofa ? 'Sim' : 'Não'}`,
      '',
      '*ESCOLHAS*',
      `Refogado: ${item.skipRefogado ? 'Não quero' : (item.refogados.join(' + ') || 'Não informado')}`,
      `Massa: ${item.skipMassa ? 'Não quero' : (item.massas.join(' + ') || 'Não informado')}`,
      `Carne: ${formatMeatChoice(item).replace('—', 'Não informado')}`,
      ''
    );
  });

  lines.push(line);

  if (state.fulfillment === 'pickup') {
    lines.push(
      '*RECEBIMENTO*',
      'Retirada na loja',
      ''
    );
  } else {
    lines.push(
      '*ENTREGA*',
      `CEP: ${$('deliveryCep').value.trim()}`,
      `Endereço: ${$('deliveryStreet').value.trim()}`,
      `Número: ${$('deliveryNumber').value.trim()}`
    );
    if ($('deliveryComplement').value.trim()) {
      lines.push(`Complemento: ${$('deliveryComplement').value.trim()}`);
    }
    lines.push(
      'Taxa de entrega: a informar pelo WhatsApp',
      ''
    );
  }

  lines.push(
    line,
    '*PAGAMENTO*',
    `Forma: ${PAYMENT_LABELS[state.payment]}`
  );

  if (state.fulfillment === 'pickup') {
    lines.push('Pagamento no caixa no momento da retirada.');
  } else if (state.payment === 'cash') {
    lines.push('Pagamento em dinheiro no momento da entrega.');
  } else if (state.payment === 'card') {
    lines.push('Pagamento com cartão no momento da entrega.');
  } else {
    lines.push('Pagamento via PIX no momento da entrega.');
  }

  if (state.payment === 'cash' && $('changeFor').value.trim()) {
    lines.push(`Troco para: ${money(parseBrazilianMoney($('changeFor').value))}`);
  }

  lines.push(
    '',
    line,
    '*RESUMO DO PEDIDO*',
    `Subtotal das marmitas: ${money(subtotal)}`
  );

  if (state.fulfillment === 'delivery') {
    lines.push(
      'Taxa de entrega: a informar',
      '*TOTAL FINAL: A CONFIRMAR NO WHATSAPP*'
    );
  } else {
    lines.push(`*TOTAL: ${money(total)}*`);
  }

  return lines.join('\n');
}

function formatCepInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function normalizeDeliveryFields() {
  const cep = $('deliveryCep');
  if (cep) cep.addEventListener('input', () => { cep.value = formatCepInput(cep.value); });
}

normalizeDeliveryFields();

function sendWhatsApp() {
  const error = validateOrder();
  if (error) return showError(error);

  hideError();

  const message = buildMessage();
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;

  // Navegação direta é mais confiável em celulares e navegadores internos
  // do WhatsApp/Instagram do que abrir uma nova aba com window.open().
  try {
    window.location.href = url;
  } catch (err) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_self';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

function parseBrazilianMoney(value) {
  const raw = String(value || '').trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  if (!raw) return NaN;
  if (raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.'));
  return Number(raw);
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showError(message) {
  const box = $('formError');
  box.textContent = message;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() { $('formError').hidden = true; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c])); }

// Eventos
document.querySelectorAll('.size-card').forEach(btn => btn.addEventListener('click', () => chooseSize(btn.dataset.size)));
document.querySelectorAll('.fulfillment-card').forEach(btn => btn.addEventListener('click', () => chooseFulfillment(btn.dataset.mode)));
document.querySelectorAll('.payment-card').forEach(btn => btn.addEventListener('click', () => choosePayment(btn.dataset.payment)));
$('feijao').addEventListener('change', (e) => { state.beans = e.target.checked; hideBuilderStatus(); });
$('farofa').addEventListener('change', (e) => { state.farofa = e.target.checked; hideBuilderStatus(); });
$('quantity').addEventListener('input', hideBuilderStatus);
$('addMarmitaBtn').addEventListener('click', addMarmita);
$('clearCartBtn').addEventListener('click', clearCart);
$('cartItems').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-remove-item]');
  if (!btn) return;
  removeCartItem(Number(btn.dataset.removeItem));
});
$('whatsappBtn').addEventListener('click', sendWhatsApp);

chooseFulfillment('pickup');
renderPaymentOptions();
renderCart();
updatePriceSummary();
loadMenu();
