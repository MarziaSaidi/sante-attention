const panel = document.querySelector('#decisionPanel');
const panelContent = document.querySelector('#panelContent');
const scrim = document.querySelector('#scrim');
const toast = document.querySelector('#toast');
const toastMessage = document.querySelector('#toastMessage');
const toastUndo = document.querySelector('#toastUndo');
const navCount = document.querySelector('#navCount');
const summaryCount = document.querySelector('#summaryCount');
const autoCount = document.querySelector('#autoCount');
const sidebar = document.querySelector('.sidebar');
const menuButton = document.querySelector('#menuButton');

let quantity = 2;
let undoItem = null;
let toastTimer = null;

const modeloTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Smart reorder decision</p>
    <h2>Modelo Especial 12 Pack</h2>
    <p class="panel-lede">Santé noticed that current stock will probably not cover demand before the next delivery arrives.</p>
    <div class="evidence-grid" aria-label="Recommendation evidence">
      <div class="evidence-cell"><span>Remaining</span><strong>3 packs</strong></div>
      <div class="evidence-cell"><span>Sold in last 7 days</span><strong>12 packs</strong></div>
      <div class="evidence-cell"><span>Average weekly sales</span><strong>9 packs</strong></div>
      <div class="evidence-cell"><span>Next distributor delivery</span><strong>Friday</strong></div>
      <div class="evidence-cell"><span>Estimated stockout</span><strong>Saturday</strong></div>
      <div class="evidence-cell"><span>Order cutoff</span><strong>Thu, 2:00 PM</strong></div>
    </div>
    <div class="recommendation">
      <p class="recommendation-label">Santé recommendation</p>
      <h3>Add <span id="quantityText">${quantity}</span> cases to Thursday’s order.</h3>
      <p>This should cover expected sales through the following delivery while keeping roughly one week of buffer stock.</p>
      <div class="quantity-control" aria-label="Change case quantity">
        <button id="decreaseQuantity" type="button" aria-label="Decrease quantity">−</button>
        <output id="quantityOutput">${quantity} cases</output>
        <button id="increaseQuantity" type="button" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <button class="explanation-toggle" id="explanationToggle" type="button" aria-expanded="false">Why is Santé recommending this?</button>
    <div class="explanation" id="explanation">
      The recommendation uses current on-hand quantity, sales from the last seven days, the longer weekly sales average, case pack size, and Empire Merchants’ next scheduled delivery. It does not change the order until you approve it.
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
    <h2>Distributor cost changed</h2>
    <p class="panel-lede">The latest invoice for Tito’s Handmade Vodka 1L has a higher unit cost than the previous delivery.</p>
    <div class="price-comparison" aria-label="Cost comparison">
      <div class="price-block"><span>Previous cost</span><strong>$21.40</strong></div>
      <div class="price-block"><span>New cost</span><strong>$23.20</strong></div>
      <div class="price-block highlight"><span>Increase</span><strong>8.4%</strong></div>
    </div>
    <div class="margin-shift">
      <div><span>Previous margin</span><strong>33.1%</strong></div>
      <span class="margin-arrow">to</span>
      <div><span>Margin at $31.99</span><strong>27.5%</strong></div>
    </div>
    <div class="recommendation">
      <p class="recommendation-label">Santé recommendation</p>
      <h3>Change retail price to $34.99.</h3>
      <p>At $34.99, estimated gross margin returns to 33.7%, close to the 33.1% margin before the cost increase.</p>
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
  autoCount.textContent = Math.min(2, total);
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
