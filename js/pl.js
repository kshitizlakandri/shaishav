// ─────────────────────────────────────────────────────────
// PURCHASE ORDER / LEDGER (PL)
// ─────────────────────────────────────────────────────────

let plFilter = 'All';
let plSearch = '';
let pendingApprovalPL = null;
let pendingRejectPL = null;

function onPLPRReferenceChange() {
  const linkedPrNumber = v('pl-linked-pr');
  if (linkedPrNumber.trim() === '') {
    document.getElementById('pl-item-search').disabled = false;
    document.getElementById('pl-location').disabled = false;
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

  document.getElementById('pl-item-search').disabled = true;
  document.getElementById('pl-location').disabled = true;
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
        p_billing_date: null, //v('pl-billing-date'),
        p_ref_number: null, //v('pl-bill-no') ? v('pl-bill-no') : null,
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
  renderPLs();
}

function renderPLs() {
  const tbody = document.getElementById('pl-tbody');
  const all = STATE.pls;
  document.getElementById('pl-count').textContent = all.length;

  const nums = all.map(p => parseInt(p.pl_number.split('_').pop()) || 0);
  document.getElementById('pl-number-preview').textContent =
    'PL_' + String(nums.length ? Math.max(...nums) + 1 : 1).padStart(5, '0');

  // Stats are built from ALL rows, before filtering, so they don't vanish on an empty filter
  const total = all.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const byStatus = {};
  all.forEach(p => { const s = p.status || 'Pending'; byStatus[s] = (byStatus[s] || 0) + 1; });
  document.getElementById('pl-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Entries</div><div class="stat-value">${all.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Value</div><div class="stat-value">₹${total.toLocaleString('en-IN')}</div><div class="stat-sub">all entries</div></div>
    ${Object.entries(byStatus).map(([s, c]) => `<div class="stat-card"><div class="stat-label">${s}</div><div class="stat-value">${c}</div></div>`).join('')}`;

  // Filter, then search
  let pls = all;
  if (plFilter !== 'All') pls = pls.filter(p => (p.status || 'Pending') === plFilter);
  if (plSearch) pls = pls.filter(p => JSON.stringify(p).toLowerCase().includes(plSearch));

  if (!pls.length) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty"><div class="empty-icon">🧾</div><div class="empty-text">No purchase orders match this filter</div></div></td></tr>`;
    return;
  }

  const canApprove = currentUser && can('pl:approve');

  tbody.innerHTML = pls.map(p => {
    const status = p.status || 'Pending';
    let actions = '';
    if (canApprove && status === 'Pending') {
      actions = `
        <button class="btn btn-success btn-sm" onclick="openApprovePLModal('${esc(p.pl_number)}')">✓ Approve</button>
        <button class="btn btn-warn btn-sm" style="margin-left:.3rem;" onclick="openRejectPLModal('${esc(p.pl_number)}')">✗ Reject</button>`;
    }
    return `<tr>
      <td><span class="badge badge-green">${p.pl_number}</span></td>
      <td>${p.date_of_material_received || '—'}</td><td>${p.location_name}</td>
      <td style="max-width:130px; overflow:hidden; text-overflow:ellipsis;">${p.item}</td>
      <td>${p.source || '—'}</td><td>${p.quantity || '—'}</td>
      <td>₹${Number(p.total || 0).toLocaleString('en-IN')}</td>
      <td>${p.reference_number || '—'}</td>
      <td>${p.pr_number ? `<span class="badge badge-amber">${p.pr_number}</span>` : '—'}</td>
      <td>${statusBadge(status)}</td>
      <td>${p.evaluated_by ? `<span class="badge badge-blue">${p.evaluated_by}</span>` : '—'}</td>
      <td style="white-space:nowrap;">${actions}</td>
    </tr>`;
  }).join('');
}

function setPLFilter(f, el) {
  plFilter = f;
  // scoped to PL's tabs so it doesn't clear the PR page's active tab
  document.querySelectorAll('#pl-filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderPLs();
}

function filterPLTable(q) { plSearch = q.toLowerCase(); renderPLs(); }

function openApprovePLModal(plNumber) {
  pendingApprovalPL = plNumber;
  document.getElementById('pl-approve-modal-desc').textContent = `Approve ${plNumber}?`;
  document.getElementById('pl-approve-modal').classList.add('show');
}

async function doApprovePL() {
  closeModal('pl-approve-modal');
  if (!pendingApprovalPL) return;
  try {
    const result = await callRpc('approve_purchase_order', { p_pl_number: pendingApprovalPL });
    if (!result.responseData && !result.error) {
      showToast('Purchase Order approved ✓', 'success');
      refreshData();
    } else if (result.error) {
      showToast('Error: ' + result.error.message, 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
  pendingApprovalPL = null;
  renderPLs();
}

function openRejectPLModal(plNumber) {
  console.log('in openRejectPLModal');
  pendingRejectPL = plNumber;
  document.getElementById('pl-reject-modal-desc').textContent = `Reject ${plNumber}?`;
  document.getElementById('pl-reject-reason').value = '';
  document.getElementById('pl-reject-modal').classList.add('show');
}

async function doRejectPL() {
  const reason = document.getElementById('pl-reject-reason').value.trim();
  if (!reason) { showToast('Please enter a reason', 'error'); return; }
  closeModal('pl-reject-modal');
  if (!pendingRejectPL) return;
  try {
    const result = await callRpc('reject_purchase_order', {
      p_pl_number: pendingRejectPL
    , p_rejection_reason: reason
    });
    if (!result.responseData && !result.error) {
      showToast('Purchase Order rejected', 'success');
      refreshData();
    } else if (result.error) {
      showToast('Error: ' + result.error.message, 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
  pendingRejectPL = null;
  renderPLs();
}