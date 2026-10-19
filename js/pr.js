// ─────────────────────────────────────────────────────────
// PURCHASE REQUISITION (PR)
// ─────────────────────────────────────────────────────────
let pendingApprovalPR = null;
let pendingRejectPR   = null;
let prFilter = 'All';
let prSearch = '';

function onPRLocationChange() { updatePRAvailability(); }

function onPRItemChange() {
  // reads from the hidden input #pr-item (set by selectComboboxItem)
  const item = STATE.items.find(i => i.item_code + ' - ' + i.item_name === document.getElementById('pr-item').value);
  document.getElementById('pr-item-desc').value = item ? item.item_description : '';
  updatePRAvailability();
}

async function updatePRAvailability() {
  const itemDisplay = document.getElementById('pr-item').value;
  const location    = document.getElementById('pr-location').value;
  const panel       = document.getElementById('pr-availability');

  if (!itemDisplay || !location) { panel.classList.remove('show'); return; }

  const { data, error } = await supabaseClient
    .from('available_items_v')
    .select('purchased, consumed, received, issued')
    .eq('item_code', itemDisplay.split(' ')[0])
    .eq('location_id', location);

  const validItemCount = data[0].purchased - data[0].consumed;
  const issued = data[0].issued - data[0].received;

  const available = validItemCount - issued;

  document.getElementById('pr-avail-received').textContent = validItemCount;
  document.getElementById('pr-avail-issued').textContent   = issued;

  const avEl = document.getElementById('pr-avail-available');
  avEl.textContent = available;
  avEl.className = 'avail-stat-value ' + (available > 5 ? 'avail-ok' : available > 0 ? 'avail-warn' : 'avail-zero');

  panel.classList.add('show');
}

function calcBudget() {
  const q = parseFloat(document.getElementById('pr-qty').value)||0;
  const p = parseFloat(document.getElementById('pr-price').value)||0;
  document.getElementById('pr-budget').value = (q*p).toLocaleString('en-IN',{minimumFractionDigits:2});
}

async function submitPR() {
  // Read item from the hidden input (committed by selectComboboxItem)
  const itemVal = document.getElementById('pr-item').value;
  if (!v('pr-date')||!v('pr-location')||!itemVal||!v('pr-qty')||!v('pr-date-req'))
    return showToast('Fill required fields', 'error');
  const btn = document.getElementById('btn-add-pr');

  // Prepare data
  const locationId = v('pr-location');
  const items = STATE.items;
  const itemCode = comboCode(itemVal);
  const itemId = items.filter(items => items.item_code === itemCode)[0].item_id;

  const prDateRequired = v('pr-date');

  try {
    const result = await callRpc('create_purchase_request',
      {
        p_location_id: locationId,
        p_item_id: itemId,
        p_pr_qty: v('pr-qty'),
        p_price_qty: v('pr-price') ? v('pr-price') : null,
        p_purpose_of_pr: v('pr-purpose') ? v('pr-purpose') : null,
        p_date_of_requirement: prDateRequired,
        p_remarks: v('pr-remarks') ? v('pr-remarks') : null
      }
    );
    console.log(result);
    if (!result.responseData && !result.error) {
      setLoading(btn, false);
      showToast('PR Added', 'success');
    }
    else if (result.error) {
      setLoading(btn, false);
      showToast('Error: ' + result.error.message, 'error');
    }
  } catch(err) {
    setLoading(btn, false);
    showToast('Error: ' + err.message, 'error');
  }
  refreshData();
}

// ── PR workflow: approve / reject ──
function openApproveModal(prNumber) {
  pendingApprovalPR = prNumber;
  document.getElementById('approve-modal-desc').textContent = `Approve ${prNumber}?`;
  document.getElementById('approve-modal').classList.add('show');
}

async function doApprove() {
  closeModal('approve-modal');
  if (!pendingApprovalPR) return;
  try {
    const result = await callRpc('approve_purchase_request', { p_pr_number: pendingApprovalPR });
    console.log(result);
    if (!result.responseData && !result.error) {
      showToast('PR approved ✓', 'success');
      refreshData();
    }
    else if (result.error) {
      showToast('Error: ' + result.error.message, 'error');
    }
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
  pendingApprovalPR = null;
}

function openRejectModal(prNumber) {
  pendingRejectPR = prNumber;
  document.getElementById('reject-modal-desc').textContent = `Reject ${prNumber}?`;
  document.getElementById('reject-reason').value = '';
  document.getElementById('reject-modal').classList.add('show');
}

async function doReject() {
  const reason = document.getElementById('reject-reason').value.trim();
  if (!reason) { showToast('Please enter a reason', 'error'); return; }
  closeModal('reject-modal');
  if (!pendingRejectPR) return;

  try {
    const result = await callRpc('reject_purchase_request',
      {
        p_pr_number: pendingRejectPR,
        p_rejection_reason: reason
      }
    );
    console.log(result);
    if (!result.responseData && !result.error) {
      showToast('PR rejected', 'success');
      refreshData();
    }
    else if (result.error) {
      showToast('Error: ' + result.error.message, 'error');
    }
  } catch(err) {
    showToast('Error: ' + err.message, 'error');
  }
  pendingRejectPR = null;
}

// ── PR rendering ──
function statusBadge(s) {
  const map = { Pending:'status-pending', Approved:'status-approved', Rejected:'status-rejected', Fulfilled:'status-fulfilled' };
  return `<span class="badge ${map[s]||'badge-gray'}">${s||'Pending'}</span>`;
}

function setPRFilter(f, el) {
  prFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderPRs();
}

function filterPRTable(q) { prSearch = q.toLowerCase(); renderPRs(); }

function renderPRs() {
  const tbody = document.getElementById('pr-tbody');
  let prs = STATE.prs;
  document.getElementById('pr-count').textContent = prs.length;

  const nums = prs.map(p=>parseInt(p.pr_number.split('_').pop())||0);
  document.getElementById('pr-number-preview').textContent = 'PR_'+String((nums.length?Math.max(...nums)+1:1)).padStart(5,'0');

  if (prFilter !== 'All') prs = prs.filter(p => (p.status||'Pending') === prFilter);
  if (prSearch) prs = prs.filter(p => JSON.stringify(p).toLowerCase().includes(prSearch));

  const isAdmin = currentUser && currentUser.role === 'A';

  if (!prs.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty"><div class="empty-icon">📋</div><div class="empty-text">No PRs match this filter</div></div></td></tr>`;
    document.getElementById('pr-stats').innerHTML = ''; return;
  }

  tbody.innerHTML = prs.map(p => {
    const status = p.status || 'Pending';
    let actions = '';
    if (isAdmin && status === 'Pending') {
      actions = `
        <button class="btn btn-success btn-sm" onclick="openApproveModal('${esc(p.pr_number)}')">✓ Approve</button>
        <button class="btn btn-warn btn-sm" style="margin-left:.3rem;" onclick="openRejectModal('${esc(p.pr_number)}')">✗ Reject</button>`;
    }
    return `<tr>
      <td><span class="badge badge-amber">${p.pr_number}</span></td>
      <td>${p.pr_date}</td><td>${p.location_name}</td>
      <td style="max-width:130px; overflow:hidden; text-overflow:ellipsis;" title="${esc(p.item_name)}">${p.item_name}</td>
      <td>${p.pr_qty}</td>
      <td>₹${Number(p.budget||0).toLocaleString('en-IN')}</td>
      <td>${statusBadge(status)}</td>
      <td>${p.requested_by}</td>
      <td>${p.evaluated_by ? `<span class="badge badge-blue">${p.evaluated_by}</span>` : '—'}</td>
      <td>${p.linked_pl ? `<span class="badge badge-blue">${p.linked_pl}</span>` : '—'}</td>
      <td style="white-space:nowrap;">${actions}</td>
    </tr>`;
  }).join('');

  const total = STATE.prs.reduce((s,p)=>s+(Number(p.budget)||0),0);
  const byStatus = {};
  STATE.prs.forEach(p => { const s = p.status||'Pending'; byStatus[s] = (byStatus[s]||0)+1; });
  document.getElementById('pr-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total PRs</div><div class="stat-value">${STATE.prs.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Budget</div><div class="stat-value">₹${total.toLocaleString('en-IN')}</div></div>
    ${Object.entries(byStatus).map(([s,c])=>`<div class="stat-card"><div class="stat-label">${s}</div><div class="stat-value">${c}</div></div>`).join('')}`;

  const today = new Date().toLocaleDateString('en-CA');
  document.getElementById('pr-date-req').setAttribute('min', today);
}
