const panel = document.querySelector('#decisionPanel');
const panelContent = document.querySelector('#panelContent');
const panelStep = document.querySelector('.panel-step');
const scrim = document.querySelector('#scrim');
const toast = document.querySelector('#toast');
const toastMessage = document.querySelector('#toastMessage');
const toastUndo = document.querySelector('#toastUndo');
const navCount = document.querySelector('#navCount');
const summaryCount = document.querySelector('#summaryCount');
const sidebar = document.querySelector('.sidebar');
const menuButton = document.querySelector('#menuButton');
const promotionActivity = document.querySelector('#promotionActivity');
panel.inert = true;

let quantity = 2;
let undoItem = null;
let toastTimer = null;

const rose = {
  product: 'Whispering Angel Rosé',
  cost: 19.79,
  regularPrice: 29.99,
  promoPrice: 26.99,
  inventory: 19,
  soldLast30: 2,
  soldPrevious30: 5,
  ageDays: 73,
  soldDuringPromotion: 8,
  channels: { pos: true, ecommerce: true, email: true, sms: false },
  published: false
};

const money = (value) => `$${value.toFixed(2)}`;
const margin = (price) => ((price - rose.cost) / price) * 100;
const inventoryValue = rose.inventory * rose.cost;
const promotionRevenue = rose.soldDuringPromotion * rose.promoPrice;
const promotionProfit = rose.soldDuringPromotion * (rose.promoPrice - rose.cost);

const modeloTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Smart reorder decision</p>
    <h2>Modelo Especial 12 Pack</h2>
    <div class="decision-story" aria-label="Stockout decision evidence">
      <div class="story-row primary"><span>On hand</span><strong>3 packs left</strong></div>
      <div class="story-row"><span>At the current sales rate</span><strong>Approximately 9 packs per week</strong></div>
      <div class="story-row expected"><span>Expected</span><strong>Stockout Saturday</strong></div>
      <div class="story-row"><span>Next available distributor delivery</span><strong>Monday</strong></div>
      <div class="story-row"><span>Order cutoff</span><strong>Thursday at 2:00 PM</strong></div>
    </div>
    <div class="recommendation">
      <p class="recommendation-label">Santé recommends</p>
      <h3>Add <span id="quantityText">${quantity}</span> cases before Thursday’s cutoff.</h3>
      <p>This should prevent a weekend stockout and cover expected demand through the following delivery while keeping roughly one week of buffer stock.</p>
      <div class="quantity-control" aria-label="Change case quantity">
        <button id="decreaseQuantity" type="button" aria-label="Decrease quantity">−</button>
        <output id="quantityOutput" tabindex="-1">${quantity} cases</output>
        <button id="increaseQuantity" type="button" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <button class="explanation-toggle" id="explanationToggle" type="button" aria-expanded="false">Why ${quantity} cases?</button>
    <div class="explanation" id="explanation">
      3 packs on hand + <span id="calculationPacks">${quantity * 6}</span> packs in <span id="calculationCases">${quantity}</span> distributor cases − approximately 9 packs of expected sales = about <span id="calculationRemaining">${Math.max(0, 3 + (quantity * 6) - 9)}</span> packs remaining at the following delivery. Santé used recent sales, the distributor case pack, Monday’s delivery schedule, and Thursday’s cutoff. No order changes until you approve them.
    </div>
    <div class="action-preview" aria-label="Pending order change">
      <div class="action-preview-head"><span>Add to order</span><strong>Modelo Especial 12 Pack</strong></div>
      <dl>
        <div><dt>Quantity</dt><dd id="previewQuantity">${quantity} cases</dd></div>
        <div><dt>Distributor</dt><dd>Metro Beverage Distributors</dd></div>
        <div><dt>Order</dt><dd>Monday delivery</dd></div>
        <div><dt>Estimated cost</dt><dd id="estimatedCost">$208.80</dd></div>
        <div><dt>Expected after delivery</dt><dd id="expectedInventory">15 packs</dd></div>
        <div><dt>Order cutoff</dt><dd>Thu, 2:00 PM</dd></div>
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
      <div class="causal-step"><span class="causal-label">Cost changed</span><div class="causal-value"><strong>$21.40 → $23.20</strong><small>8.4% increase</small></div></div>
      <div class="causal-arrow" aria-hidden="true"></div>
      <div class="causal-step"><span class="causal-label">At current $31.99 price</span><div class="causal-value"><strong>33.1% → 27.5%</strong><small>Gross margin</small></div></div>
      <div class="causal-arrow" aria-hidden="true"></div>
      <div class="causal-step recommended"><span class="causal-label">Santé recommends</span><div class="causal-value"><strong>$34.99</strong><small>Estimated margin 33.7%</small></div></div>
    </div>
    <button class="explanation-toggle" id="explanationToggle" type="button" aria-expanded="false">How was this price calculated?</button>
    <div class="explanation" id="explanation">Santé used the new $23.20 unit cost and the previous gross margin as the target, then rounded to a familiar shelf price. Tax is excluded from this margin calculation.</div>
    <div class="panel-actions">
      <button class="button primary" id="approvePrice" type="button">Set price to $34.99</button>
      <button class="button secondary" id="keepPrice" type="button">Keep $31.99</button>
      <button class="button quiet" id="notNow" type="button">Not now</button>
    </div>
  </div>`;

const opportunityTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Sell-through opportunity</p>
    <h2>${rose.product}</h2>
    <div class="system-list" aria-label="Systems involved"><span>Inventory</span><span>Marketing</span><span>POS</span><span>Ecommerce</span></div>
    <div class="evidence-summary" aria-label="Opportunity evidence">
      <div class="story-row primary"><span>Currently in stock</span><strong>${rose.inventory} bottles</strong></div>
      <div class="story-row"><span>Sold in the last 30 days</span><strong>${rose.soldLast30} bottles</strong></div>
      <div class="story-row"><span>Average inventory age</span><strong>${rose.ageDays} days</strong></div>
      <div class="story-row"><span>Inventory value tied up</span><strong>${money(inventoryValue)}</strong></div>
    </div>
    <p class="context-heading">Current performance</p>
    <div class="performance-list">
      <div class="performance-row"><span>30-day sales</span><strong>${rose.soldLast30} bottles</strong></div>
      <div class="performance-row"><span>Previous 30 days</span><strong>${rose.soldPrevious30} bottles</strong></div>
      <div class="performance-row"><span>Sales trend</span><strong>Down 60%</strong></div>
      <div class="performance-row"><span>Current retail price</span><strong>${money(rose.regularPrice)}</strong></div>
      <div class="performance-row"><span>Gross margin</span><strong>${margin(rose.regularPrice).toFixed(1)}%</strong></div>
    </div>
    <div class="recommendation">
      <p class="recommendation-label">Santé recommends</p>
      <h3>Run a short promotion before placing another order.</h3>
      <div class="recommendation-comparison">
        <span><strong>10% off</strong></span>
        <span>Friday through Sunday</span>
        <span><strong>${money(rose.regularPrice)} → ${money(rose.promoPrice)}</strong></span>
      </div>
      <p><strong>Estimated promotion margin:</strong> approximately ${Math.round(margin(rose.promoPrice))}%</p>
      <p><strong>Goal:</strong> Improve sell-through while maintaining a positive margin.</p>
    </div>
    <button class="explanation-toggle" id="explanationToggle" type="button" aria-expanded="false">Why this recommendation?</button>
    <div class="explanation" id="explanation">Sales slowed materially over the last 30 days. ${rose.inventory} bottles remain in stock. The product has been held for ${rose.ageDays} days. A 10% discount maintains approximately ${Math.round(margin(rose.promoPrice))}% gross margin.</div>
    <div class="alternative-option" id="alternativeOption"><strong>Lower-discount option: 5% off at $28.49</strong><span>Estimated margin 30.5%. This preserves more margin but provides a smaller customer incentive.</span></div>
    <div class="panel-actions sticky-mobile">
      <button class="button primary" id="preparePromotion" type="button">Prepare promotion</button>
      <button class="button secondary" id="showAlternative" type="button">Show another option</button>
      <button class="button quiet" id="leaveAlone" type="button">Leave it alone</button>
    </div>
  </div>`;

const promotionReviewTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Promotion review</p>
    <h2>${rose.product}</h2>
    <div class="system-list" aria-label="Systems involved"><span>Marketing</span><span>POS</span><span>Ecommerce</span><span>Inventory</span></div>
    <div class="promotion-banner">
      <strong>10% OFF</strong>
      <div class="price-change">${money(rose.regularPrice)} → ${money(rose.promoPrice)}</div>
      <div class="date-range"><span><strong>Friday Sep 30</strong></span><span>through</span><span><strong>Sunday Oct 2</strong></span></div>
    </div>
    <section class="channel-section" aria-labelledby="channelsTitle">
      <h3 class="subsection-title" id="channelsTitle">Where this will apply</h3>
      <div class="channel-list">
        ${channelOption('pos', 'In-store POS', 'Apply the promotional price at checkout.', rose.channels.pos)}
        ${channelOption('ecommerce', 'Online store', 'Show the promotional price on the store.', rose.channels.ecommerce)}
        ${channelOption('email', 'Email campaign', 'Send the approved announcement to eligible customers.', rose.channels.email)}
        ${channelOption('sms', 'SMS draft', 'Prepare a customer text for separate review. It will not be sent yet.', rose.channels.sms)}
      </div>
    </section>
    <section class="will-section" aria-labelledby="willTitle">
      <h3 class="subsection-title" id="willTitle">Santé will</h3>
      <div class="will-list" id="willList"></div>
    </section>
    <section class="email-section" id="emailSection" aria-labelledby="emailTitle">
      <h3 class="subsection-title" id="emailTitle">Email preview</h3>
      <div class="email-preview">
        <p class="email-subject" id="emailSubjectPreview">Weekend Wine Pick</p>
        <h3 id="emailHeadlinePreview">Whispering Angel Rosé</h3>
        <p id="emailBodyPreview">This weekend, enjoy one of our favorite rosés at a special price.</p>
        <div class="email-price">${money(rose.promoPrice)} <small>Regularly ${money(rose.regularPrice)}</small></div>
      </div>
      <div class="email-editor" id="emailEditor">
        <label for="emailSubjectInput">Subject</label><input id="emailSubjectInput" value="Weekend Wine Pick" />
        <label for="emailBodyInput">Message</label><textarea id="emailBodyInput">This weekend, enjoy one of our favorite rosés at a special price.</textarea>
      </div>
      <div class="compact-actions">
        <button class="button secondary" id="editMessage" type="button">Edit message</button>
        <button class="button quiet" id="useMessage" type="button">Use this message</button>
      </div>
    </section>
    <div class="panel-actions sticky-mobile">
      <button class="button primary" id="reviewPromotion" type="button">Review before publishing</button>
      <button class="button quiet" id="backToOpportunity" type="button">Back to opportunity</button>
    </div>
  </div>`;

const finalReviewTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Promotion ready</p>
    <h2>${rose.product}</h2>
    <div class="promotion-banner">
      <strong>10% off</strong>
      <div class="price-change">${money(rose.regularPrice)} → ${money(rose.promoPrice)}</div>
      <div class="date-range"><span><strong>Friday</strong></span><span>through</span><span><strong>Sunday</strong></span></div>
    </div>
    <div class="final-summary">
      <div class="final-summary-row"><span>Applies to</span><strong>${selectedChannelLabels().join(' · ')}</strong></div>
      <div class="final-summary-row"><span>Estimated promotion margin</span><strong>~${Math.round(margin(rose.promoPrice))}%</strong></div>
      <div class="final-summary-row"><span>Customer communication</span><strong>${rose.channels.email ? 'Approved email will be sent' : 'No email will be sent'}${rose.channels.sms ? ' · SMS draft will be prepared, not sent' : ''}</strong></div>
    </div>
    <p class="approval-note">Publishing schedules the price and approved communication across the selected systems. Nothing changes before you publish.</p>
    <div class="panel-actions sticky-mobile">
      <button class="button primary" id="publishPromotion" type="button">Publish promotion</button>
      <button class="button secondary" id="editPromotion" type="button">Edit</button>
      <button class="button quiet" id="cancelPromotion" type="button">Cancel</button>
    </div>
  </div>`;

const successTemplate = () => `
  <div class="panel-body">
    <div class="success-mark" aria-hidden="true">✓</div>
    <p class="panel-eyebrow">Promotion scheduled</p>
    <h2>${rose.product}</h2>
    <div class="promotion-banner">
      <strong>${money(rose.promoPrice)}</strong>
      <div class="date-range"><span><strong>Friday</strong></span><span>through</span><span><strong>Sunday</strong></span></div>
    </div>
    <p class="context-heading">Santé will</p>
    <div class="status-list">${scheduledStatusRows()}</div>
    <div class="panel-actions sticky-mobile">
      <button class="button primary" id="backToAttention" type="button">Back to Attention</button>
      <button class="button quiet" id="viewApprovalRecord" type="button">View approval record</button>
    </div>
  </div>`;

const auditTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Activity record</p>
    <h2>${rose.product} promotion</h2>
    <div class="system-list" aria-label="Systems involved"><span>Marketing</span><span>POS</span><span>Ecommerce</span><span>Inventory</span></div>
    <div class="audit-meta">
      <div class="story-row"><span>What was approved</span><strong>10% off · ${money(rose.promoPrice)} · Friday through Sunday</strong></div>
      <div class="story-row"><span>Approved by</span><strong>Marzia S.</strong></div>
      <div class="story-row"><span>Approved</span><strong>Today at 11:32 AM</strong></div>
      <div class="story-row"><span>Systems changing</span><strong>${selectedChannelLabels().join(', ')} · Inventory tracking</strong></div>
      <div class="story-row expected"><span>Current status</span><strong>Scheduled · Starts Friday</strong></div>
    </div>
    <div class="panel-actions">
      <button class="button primary" id="viewPromotionResult" type="button">View demo result</button>
      <button class="button quiet" id="auditBack" type="button">Back to Attention</button>
    </div>
  </div>`;

const resultTemplate = () => `
  <div class="panel-body">
    <p class="panel-eyebrow">Promotion result</p>
    <h2>${rose.product}</h2>
    <p class="panel-subtitle">Friday through Sunday</p>
    <div class="result-metrics" aria-label="Promotion results">
      <div class="result-metric"><span>Before promotion</span><strong>${rose.inventory} bottles</strong></div>
      <div class="result-metric"><span>Sold during promotion</span><strong>${rose.soldDuringPromotion} bottles</strong></div>
      <div class="result-metric"><span>Remaining</span><strong>${rose.inventory - rose.soldDuringPromotion} bottles</strong></div>
      <div class="result-metric"><span>Revenue</span><strong>${money(promotionRevenue)}</strong></div>
      <div class="result-metric"><span>Gross profit</span><strong>${money(promotionProfit)}</strong></div>
      <div class="result-metric"><span>Promotion margin</span><strong>${margin(rose.promoPrice).toFixed(1)}%</strong></div>
    </div>
    <div class="outcome-note">Sell-through improved during the promotion. Results reflect 8 bottles sold at the approved ${money(rose.promoPrice)} price.</div>
    <p class="context-heading">What would you like Santé to do next?</p>
    <div class="panel-actions sticky-mobile">
      <button class="button primary" id="returnRegularPrice" type="button">Return to $29.99</button>
      <button class="button secondary" id="keepMonitoring" type="button">Keep monitoring</button>
      <button class="button quiet" id="reviewInventory" type="button">Review inventory</button>
    </div>
  </div>`;

function channelOption(id, label, helper, checked) {
  return `<label class="channel-option"><input id="channel-${id}" data-channel="${id}" type="checkbox" ${checked ? 'checked' : ''} /><span><strong>${label}</strong><small>${helper}</small></span></label>`;
}

function selectedChannelLabels() {
  const labels = { pos: 'In-store POS', ecommerce: 'Online store', email: 'Email', sms: 'SMS draft' };
  return Object.entries(rose.channels).filter(([, selected]) => selected).map(([key]) => labels[key]);
}

function willRows() {
  const rows = [];
  if (rose.channels.pos) rows.push(['POS', `Apply ${money(rose.promoPrice)} promotional price during the campaign.`]);
  if (rose.channels.ecommerce) rows.push(['Ecommerce', `Display ${money(rose.promoPrice)} online and show the original ${money(rose.regularPrice)} price.`]);
  if (rose.channels.email) rows.push(['Email', 'Send the approved announcement to eligible customers.']);
  if (rose.channels.sms) rows.push(['SMS', 'Prepare a customer text for separate approval. Do not send it yet.']);
  rows.push(['Inventory', 'Track sell-through during the promotion.']);
  return rows.map(([system, action]) => `<div class="will-row"><strong>${system}</strong><span>${action}</span></div>`).join('');
}

function scheduledStatusRows() {
  const rows = [];
  if (rose.channels.pos) rows.push('Update POS pricing');
  if (rose.channels.ecommerce) rows.push('Update online pricing');
  if (rose.channels.email) rows.push('Send the approved email');
  if (rose.channels.sms) rows.push('Prepare an SMS draft for separate review');
  rows.push('Track sell-through');
  return rows.map((row) => `<div class="status-row">${row}</div>`).join('');
}

const templates = {
  modelo: modeloTemplate,
  titos: () => titosTemplate,
  rose: opportunityTemplate,
  promotion: promotionReviewTemplate,
  final: finalReviewTemplate,
  success: successTemplate,
  audit: auditTemplate,
  result: resultTemplate
};

const stepLabels = {
  modelo: 'Decision review', titos: 'Decision review', rose: 'Opportunity review', promotion: 'Promotion setup', final: 'Final approval', success: 'Scheduled', audit: 'Activity', result: 'Outcome'
};

function openPanel(type) {
  panelContent.innerHTML = templates[type]();
  panelStep.textContent = stepLabels[type];
  panel.classList.add('open');
  panel.inert = false;
  panel.setAttribute('aria-hidden', 'false');
  scrim.hidden = false;
  document.body.style.overflow = 'hidden';
  panel.scrollTop = 0;
  bindPanelActions(type);
  setTimeout(() => document.querySelector('#closePanel').focus(), 30);
}

function closePanel() {
  panel.classList.remove('open');
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
  scrim.hidden = true;
  document.body.style.overflow = '';
}

function bindExplanation() {
  const toggle = document.querySelector('#explanationToggle');
  const explanation = document.querySelector('#explanation');
  if (!toggle || !explanation) return;
  toggle.addEventListener('click', () => {
    const visible = explanation.classList.toggle('visible');
    toggle.setAttribute('aria-expanded', String(visible));
  });
}

function bindPanelActions(type) {
  bindExplanation();
  const notNow = document.querySelector('#notNow');
  if (notNow) notNow.addEventListener('click', closePanel);

  if (type === 'modelo') bindModelo();
  if (type === 'titos') bindTitos();
  if (type === 'rose') bindOpportunity();
  if (type === 'promotion') bindPromotionReview();
  if (type === 'final') bindFinalReview();
  if (type === 'success') bindSuccess();
  if (type === 'audit') bindAudit();
  if (type === 'result') bindResult();
}

function bindModelo() {
  const updateQuantity = (value) => {
    quantity = Math.min(8, Math.max(1, value));
    const label = `${quantity} ${quantity === 1 ? 'case' : 'cases'}`;
    document.querySelector('#quantityText').textContent = quantity;
    document.querySelector('#quantityOutput').textContent = label;
    document.querySelector('#approveModelo').textContent = `Add ${label}`;
    document.querySelector('#explanationToggle').textContent = `Why ${label}?`;
    document.querySelector('#previewQuantity').textContent = label;
    document.querySelector('#estimatedCost').textContent = `$${(quantity * 104.4).toFixed(2)}`;
    document.querySelector('#expectedInventory').textContent = `${3 + (quantity * 6)} packs`;
    document.querySelector('#calculationPacks').textContent = quantity * 6;
    document.querySelector('#calculationCases').textContent = quantity;
    document.querySelector('#calculationRemaining').textContent = Math.max(0, 3 + (quantity * 6) - 9);
  };
  document.querySelector('#decreaseQuantity').addEventListener('click', () => updateQuantity(quantity - 1));
  document.querySelector('#increaseQuantity').addEventListener('click', () => updateQuantity(quantity + 1));
  document.querySelector('#changeQuantity').addEventListener('click', () => document.querySelector('#quantityOutput').focus());
  document.querySelector('#approveModelo').addEventListener('click', () => resolveItem('modelo', `${quantity} ${quantity === 1 ? 'case was' : 'cases were'} added to Monday’s delivery.`));
}

function bindTitos() {
  document.querySelector('#approvePrice').addEventListener('click', () => resolveItem('titos', 'Retail price was updated to $34.99.'));
  document.querySelector('#keepPrice').addEventListener('click', () => resolveItem('titos', 'Current price was kept at $31.99.'));
}

function bindOpportunity() {
  document.querySelector('#preparePromotion').addEventListener('click', () => openPanel('promotion'));
  document.querySelector('#showAlternative').addEventListener('click', () => {
    const alternative = document.querySelector('#alternativeOption');
    const visible = alternative.classList.toggle('visible');
    document.querySelector('#showAlternative').textContent = visible ? 'Hide other option' : 'Show another option';
  });
  document.querySelector('#leaveAlone').addEventListener('click', () => {
    closePanel();
    showToast('No promotion was prepared. The opportunity remains in Attention.');
  });
}

function bindPromotionReview() {
  document.querySelectorAll('[data-channel]').forEach((input) => input.addEventListener('change', () => {
    rose.channels[input.dataset.channel] = input.checked;
    updatePromotionReview();
  }));
  document.querySelector('#editMessage').addEventListener('click', () => {
    document.querySelector('#emailEditor').classList.add('visible');
    document.querySelector('#emailSubjectInput').focus();
  });
  document.querySelector('#useMessage').addEventListener('click', () => {
    const subject = document.querySelector('#emailSubjectInput').value.trim() || 'Weekend Wine Pick';
    const body = document.querySelector('#emailBodyInput').value.trim() || 'This weekend, enjoy one of our favorite rosés at a special price.';
    document.querySelector('#emailSubjectPreview').textContent = subject;
    document.querySelector('#emailBodyPreview').textContent = body;
    document.querySelector('#emailEditor').classList.remove('visible');
    showToast('Email message saved for review.');
  });
  document.querySelector('#reviewPromotion').addEventListener('click', () => openPanel('final'));
  document.querySelector('#backToOpportunity').addEventListener('click', () => openPanel('rose'));
  updatePromotionReview();
}

function updatePromotionReview() {
  document.querySelector('#willList').innerHTML = willRows();
  document.querySelector('#emailSection').hidden = !rose.channels.email;
  const hasDestination = rose.channels.pos || rose.channels.ecommerce || rose.channels.email || rose.channels.sms;
  const reviewButton = document.querySelector('#reviewPromotion');
  reviewButton.disabled = !hasDestination;
  reviewButton.textContent = hasDestination ? 'Review before publishing' : 'Select where promotion applies';
}

function bindFinalReview() {
  document.querySelector('#publishPromotion').addEventListener('click', () => {
    rose.published = true;
    document.querySelector('[data-item="rose"]').classList.add('resolved');
    promotionActivity.hidden = false;
    updateCounts();
    openPanel('success');
  });
  document.querySelector('#editPromotion').addEventListener('click', () => openPanel('promotion'));
  document.querySelector('#cancelPromotion').addEventListener('click', () => openPanel('rose'));
}

function bindSuccess() {
  document.querySelector('#backToAttention').addEventListener('click', closePanel);
  document.querySelector('#viewApprovalRecord').addEventListener('click', () => openPanel('audit'));
}

function bindAudit() {
  document.querySelector('#viewPromotionResult').addEventListener('click', () => openPanel('result'));
  document.querySelector('#auditBack').addEventListener('click', closePanel);
}

function bindResult() {
  document.querySelector('#returnRegularPrice').addEventListener('click', () => showToast('Return to $29.99 prepared for review. No price has changed.'));
  document.querySelector('#keepMonitoring').addEventListener('click', () => showToast('Santé will keep monitoring sell-through.'));
  document.querySelector('#reviewInventory').addEventListener('click', () => showToast('Inventory review opened for 11 remaining bottles.'));
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
  const messages = { discrepancy: 'Inventory count review opened.', match: 'Invoice matching review opened.' };
  showToast(messages[button.dataset.action]);
}));

document.querySelector('#openPromotionActivity').addEventListener('click', () => openPanel('audit'));
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
