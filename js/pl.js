// ─────────────────────────────────────────────────────────
// PURCHASE ORDER / LEDGER (PL)
// ─────────────────────────────────────────────────────────
function onPLPRReferenceChange() {
  const linkedPrNumber = v('pl-linked-pr');
  if (linkedPrNumber.trim() === '') {
    return;
  }
  const prs = STATE.prs;
  const locations = STATE.locations;
  const items = STATE.items;
  const linkedPr = prs.find(prs => prs.pr_number === linkedPrNumber);
  const location = locations.find(locations => locations.location_name === linkedPr.location_name);

  document.getElementById('pl-location').value = location.location_id;

  const item = items.find(i => i.item_code === linkedPr.item_code);
  const comboVal = item ? (item.item_code + ' - ' + item.item_name) : (linkedPr.item_code || '');
  document.getElementById('pl-item').value = comboVal;
  document.getElementById('pl-item-search').value = comboVal;
  if (comboVal) document.getElementById('pl-item-search').classList.add('has-value');

  document.getElementById('pl-qty').value = linkedPr.pr_qty;
  document.getElementById('pl-price').value = linkedPr.budget / linkedPr.pr_qty;
  calcTotal();
  onPLItemChange();
}

function onPLItemChange() {
  const code = comboCode(document.getElementById('pl-item').value);
  const item = STATE.items.find(i => i.item_code === code);
  document.getElementById('pl-item-desc').value = item ? item.item_description : '';
}

function calcTotal() {
  const q = parseFloat(document.getElementById('pl-qty').value)||0;
  const p = parseFloat(document.getElementById('pl-price').value)||0;
  document.getElementById('pl-total').value = (q*p).toLocaleString('en-IN',{minimumFractionDigits:2});
}

async function submitPL() {
  if (!v('pl-location')||!v('pl-item')||!v('pl-qty')||!v('pl-source')||!v('pl-condition')||!v('pl-from')||!v('pl-qty')||!v('pl-price')) return showToast('Fill required fields', 'error');
  const btn = document.getElementById('btn-add-pl');
  setLoading(btn, true);

  const locationId = v('pl-location');
  const items = STATE.items;
  const itemCode = comboCode(v('pl-item'));
  const itemId = items.filter(items => items.item_code === itemCode)[0].item_id;
  console.log(locationId, itemId);

  try {
    const result = await callRpc('create_purchase_order_record',
      {
        p_date_received: v('pl-date'),
        p_location_id: locationId,
        p_item_id: itemId,
        p_pr_number: v('pl-linked-pr') ? v('pl-linked-pr') : null,
        p_source: v('pl-source'),
        p_condition: v('pl-condition'),
        p_purchase_received_from: v('pl-from'),
        p_quantity: v('pl-qty'),
        p_price: v('pl-price'),
        p_billing_date: v('pl-billing-date'),
        p_ref_number: v('pl-bill-no') ? v('pl-bill-no') : null,
        p_remarks: v('pl-remarks') ? v('pl-remarks') : null
      }
    );
    console.log(result);
    if (!result.responseData && !result.error) {
      setLoading(btn, false);
      showToast('PO Added', 'success');
      refreshData();
      populateDropdowns();
    }
    else if (result.error) {
      setLoading(btn, false);
      showToast('Error: ' + result.error.message, 'error');
    }
  } catch(err) {
    setLoading(btn, false);
    showToast('Error: ' + err.message, 'error');
  }
}

function renderPLs() {
  const tbody = document.getElementById('pl-tbody');
  const pls = STATE.pls;
  document.getElementById('pl-count').textContent = pls.length;
  const nums = pls.map(p=>parseInt(p.pl_number.split('_').pop())||0);
  document.getElementById('pl-number-preview').textContent = 'PO_'+String((nums.length?Math.max(...nums)+1:1)).padStart(5,'0');
  if (!pls.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty"><div class="empty-icon">🧾</div><div class="empty-text">No ledger entries yet</div></div></td></tr>`;
    document.getElementById('pl-stats').innerHTML = ''; return;
  }
  tbody.innerHTML = pls.map(p=>`<tr>
    <td><span class="badge badge-green">${p.pl_number}</span></td>
    <td>${p.date_of_material_received||'—'}</td><td>${p.location_name}</td>
    <td style="max-width:130px; overflow:hidden; text-overflow:ellipsis;">${p.item}</td>
    <td>${p.source||'—'}</td><td>${p.quantity||'—'}</td>
    <td>₹${Number(p.total||0).toLocaleString('en-IN')}</td>
    <td>${p.reference_number||'—'}</td>
    <td>${p.pr_number ? `<span class="badge badge-amber">${p.pr_number}</span>` : '—'}</td>
  </tr>`).join('');
  const total = pls.reduce((s,p)=>s+(Number(p.total)||0),0);
  document.getElementById('pl-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Entries</div><div class="stat-value">${pls.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Value</div><div class="stat-value">₹${total.toLocaleString('en-IN')}</div><div class="stat-sub">received</div></div>`;
}
