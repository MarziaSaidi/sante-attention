const panel = document.querySelector('#decisionPanel');
const panelContent = document.querySelector('#panelContent');
const scrim = document.querySelector('#scrim');
const toast = document.querySelector('#toast');
const toastMessage = document.querySelector('#toastMessage');
const toastUndo = document.querySelector('#toastUndo');
const navCount = document.querySelector('#navCount');
const summaryCount = document.querySelector('#summaryCount');
const sidebar = document.querySelector('.sidebar');
const menuButton = document.querySelector('#menuButton');

let quantity = 2;
let undoItem = null;
let toastTimer = null;

const modeloTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Smart reorder decision</p>
    <h2>Modelo Especial 12 Pack</h2>
    <div class="decision-story" aria-label="Stockout decision evidence">
      <div class="story-row primary"><span>On hand</span><strong>3 packs left</strong></div>
      <div class="story-row"><span>At the current sales rate</span><strong>Approximately 9 packs per week</strong></div>
      <div class="story-row"><span>Next distributor delivery</span><strong>Friday</strong></div>
      <div class="story-row expected"><span>Expected</span><strong>Stockout Saturday</strong></div>
      <div class="story-row"><span>Order cutoff</span><strong>Thursday at 2:00 PM</strong></div>
    </div>
    <div class="recommendation">
      <p class="recommendation-label">Santé recommends</p>
      <h3>Add <span id="quantityText">${quantity}</span> cases to Thursday’s order.</h3>
      <p>This should cover expected sales through the following delivery while keeping roughly one week of buffer stock.</p>
      <div class="quantity-control" aria-label="Change case quantity">
        <button id="decreaseQuantity" type="button" aria-label="Decrease quantity">−</button>
        <output id="quantityOutput" tabindex="-1">${quantity} cases</output>
        <button id="increaseQuantity" type="button" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <button class="explanation-toggle" id="explanationToggle" type="button" aria-expanded="false">Why ${quantity} cases?</button>
    <div class="explanation" id="explanation">
      3 packs on hand + <span id="calculationPacks">${quantity * 6}</span> packs in <span id="calculationCases">${quantity}</span> distributor cases − approximately 9 packs of expected sales = about <span id="calculationRemaining">${Math.max(0, 3 + (quantity * 6) - 9)}</span> packs remaining at the following delivery. Santé used recent sales, the longer weekly average, the distributor case pack, and delivery schedule. No order changes until you approve them.
    </div>
    <div class="action-preview" aria-label="Pending order change">
      <div class="action-preview-head"><span>Add to order</span><strong>Modelo Especial 12 Pack</strong></div>
      <dl>
        <div><dt>Quantity</dt><dd id="previewQuantity">${quantity} cases</dd></div>
        <div><dt>Distributor</dt><dd>Metro Beverage Distributors</dd></div>
        <div><dt>Order</dt><dd>Thursday order</dd></div>
        <div><dt>Estimated cost</dt><dd id="estimatedCost">$208.80</dd></div>
        <div><dt>Expected after delivery</dt><dd id="expectedInventory">15 packs</dd></div>
        <div><dt>Case pack</dt><dd>6 retail packs</dd></div>
      </dl>
    </div>
    <div class="panel-actions">
      <button class="button primary" id="approveModelo" type="button">Add ${quantity} cases</button>
      <button class="button secondary" id="changeQuantity" type="button">Change quantity</button>
      <button class="button quiet" id="notNow" type="button">Not now</button>
    </div>
  </div>`;

const titosTemplate = `
  <div class="panel-body">
    <p class="panel-eyebrow">Pricing decision</p>
    <h2>Tito’s Handmade Vodka 1L</h2>
    <div class="causal-flow" aria-label="Price recommendation reasoning">
      <div class="causal-step">
        <span class="causal-label">Cost changed</span>
        <div class="causal-value"><strong>$21.40 → $23.20</strong><small>8.4% increase</small></div>
      </div>
      <div class="causal-arrow" aria-hidden="true"></div>
      <div class="causal-step">
        <span class="causal-label">At current $31.99 price</span>
        <div class="causal-value"><strong>33.1% → 27.5%</strong><small>Gross margin</small></div>
      </div>
      <div class="causal-arrow" aria-hidden="true"></div>
      <div class="causal-step recommended">
        <span class="causal-label">Santé recommends</span>
        <div class="causal-value"><strong>$34.99</strong><small>Estimated margin 33.7%</small></div>
      </div>
    </div>
    <button class="explanation-toggle" id="explanationToggle" type="button" aria-expanded="false">How was this price calculated?</button>
    <div class="explanation" id="explanation">Santé used the new $23.20 unit cost and the previous gross margin as the target, then rounded to a familiar shelf price. Tax is excluded from this margin calculation.</div>
    <div class="panel-actions">
      <button class="button primary" id="approvePrice" type="button">Set price to $34.99</button>
      <button class="button secondary" id="keepPrice" type="button">Keep $31.99</button>
      <button class="button quiet" id="notNow" type="button">Not now</button>
    </div>
  </div>`;

function openPanel(type) {
  panelContent.innerHTML = type === 'modelo' ? modeloTemplate() : titosTemplate;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  scrim.hidden = false;
  document.body.style.overflow = 'hidden';
  bindPanelActions(type);
  setTimeout(() => document.querySelector('#closePanel').focus(), 30);
}

function closePanel() {
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  scrim.hidden = true;
  document.body.style.overflow = '';
}

function bindPanelActions(type) {
  const toggle = document.querySelector('#explanationToggle');
  const explanation = document.querySelector('#explanation');
  toggle.addEventListener('click', () => {
    const visible = explanation.classList.toggle('visible');
    toggle.setAttribute('aria-expanded', String(visible));
  });

  document.querySelector('#notNow').addEventListener('click', closePanel);

  if (type === 'modelo') {
    const updateQuantity = (value) => {
      quantity = Math.min(8, Math.max(1, value));
      document.querySelector('#quantityText').textContent = quantity;
      document.querySelector('#quantityOutput').textContent = `${quantity} ${quantity === 1 ? 'case' : 'cases'}`;
      document.querySelector('#approveModelo').textContent = `Add ${quantity} ${quantity === 1 ? 'case' : 'cases'}`;
      document.querySelector('#explanationToggle').textContent = `Why ${quantity} ${quantity === 1 ? 'case' : 'cases'}?`;
      document.querySelector('#previewQuantity').textContent = `${quantity} ${quantity === 1 ? 'case' : 'cases'}`;
      document.querySelector('#estimatedCost').textContent = `$${(quantity * 104.4).toFixed(2)}`;
      document.querySelector('#expectedInventory').textContent = `${3 + (quantity * 6)} packs`;
      document.querySelector('#calculationPacks').textContent = quantity * 6;
      document.querySelector('#calculationCases').textContent = quantity;
      document.querySelector('#calculationRemaining').textContent = Math.max(0, 3 + (quantity * 6) - 9);
    };
    document.querySelector('#decreaseQuantity').addEventListener('click', () => updateQuantity(quantity - 1));
    document.querySelector('#increaseQuantity').addEventListener('click', () => updateQuantity(quantity + 1));
    document.querySelector('#changeQuantity').addEventListener('click', () => document.querySelector('#quantityOutput').focus());
    document.querySelector('#approveModelo').addEventListener('click', () => resolveItem('modelo', `${quantity} ${quantity === 1 ? 'case was' : 'cases were'} added to Thursday’s order.`));
  } else {
    document.querySelector('#approvePrice').addEventListener('click', () => resolveItem('titos', 'Retail price was updated to $34.99.'));
    document.querySelector('#keepPrice').addEventListener('click', () => resolveItem('titos', 'Current price was kept at $31.99.'));
  }
}

function resolveItem(id, message) {
  const row = document.querySelector(`[data-item="${id}"]`);
  row.classList.add('resolved');
  undoItem = row;
  updateCounts();
  closePanel();
  showToast(message, true);
}

function updateCounts() {
  const total = document.querySelectorAll('.attention-row:not(.resolved)').length;
  navCount.textContent = total;
  summaryCount.textContent = total;
}

function showToast(message, canUndo = false) {
  clearTimeout(toastTimer);
  toastMessage.textContent = message;
  toastUndo.hidden = !canUndo;
  toast.classList.add('visible');
  toast.setAttribute('aria-hidden', 'false');
  toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  toast.classList.remove('visible');
  toast.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openPanel(button.dataset.open)));
document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => {
  const messages = {
    promotion: 'Promotion draft opened in Marketing.',
    discrepancy: 'Inventory count review opened.',
    match: 'Invoice matching review opened.'
  };
  showToast(messages[button.dataset.action]);
}));

document.querySelector('#closePanel').addEventListener('click', closePanel);
scrim.addEventListener('click', closePanel);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePanel(); });

toastUndo.addEventListener('click', () => {
  if (!undoItem) return;
  undoItem.classList.remove('resolved');
  undoItem = null;
  updateCounts();
  hideToast();
});

menuButton.addEventListener('click', () => {
  const open = sidebar.classList.toggle('mobile-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
