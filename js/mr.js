// ─────────────────────────────────────────────────────────
// MATERIAL RECEIPT (MR)
// ─────────────────────────────────────────────────────────
function onMRItemChange() {
  const code = comboCode(document.getElementById('mr-item').value);
  console.log('mr code: ' + code);
  const item = STATE.items.find(i => i.item_code === code);
  document.getElementById('mr-item-desc').value = item ? item.item_description : '';
}

function onMRPLReferenceChange() {
  const linkedPlNumber = v('mr-linked-pl');
  if (linkedPlNumber.trim() === '') return;
  const pls = STATE.pls;
  const locations = STATE.locations;
  const items = STATE.items;
  const linkedPl = pls.find(p => p.pl_number === linkedPlNumber);
  if (!linkedPl) return;
  const location = locations.find(l => l.location_name === linkedPl.location_name);
  if (location) document.getElementById('mr-location').value = location.location_name;

  const item = items.find(i => i.item_name === linkedPl.item || (i.item_code + ' - ' + i.item_name) === linkedPl.item);
  const comboVal = item ? (item.item_code + ' - ' + item.item_name) : (linkedPl.item || '');
  document.getElementById('mr-item').value = comboVal;
  document.getElementById('mr-item-type').value = item.item_type;
  document.getElementById('mr-from').value = (linkedPl.source + ' - ' + linkedPl.order_issued_to )|| '';
  document.getElementById('mr-received-qty').value = linkedPl.quantity || '';
  onMRItemChange();
}

async function submitMR() {
  if (!v('mr-date')||!v('mr-linked-pl'))
    return showToast('Fill required fields', 'error');
  const btn = document.getElementById('btn-add-mr');
  setLoading(btn, true);

  const plReferenceFullText = v('mr-linked-pl');
  const poNumber = plReferenceFullText.split(' ')[0];
  const poId = STATE.pls.find(i => i.pl_number === poNumber).pl_id;

  try {
    const result = await callRpc('create_material_receipt_record',
      {
        p_receipt_date: v('mr-date'),
        p_ref_po_id: poId,
        p_reference: v('mr-bill-no') ? v('mr-bill-no') : null,
        p_remarks: v('mr-remarks') ? v('mr-remarks') : null
      }
    );
    if (!result.responseData && !result.error) {
      setLoading(btn, false);
      showToast('Material Receipt recorded', 'success');
      clearFields(['mr-received-qty','mr-bill-no','mr-remarks','mr-item-desc', 'mr-location', 'mr-item', 'mr-from']);
      document.getElementById('mr-linked-pl').value = '';
      refreshData();
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

function renderMRs() {
  const tbody = document.getElementById('mr-tbody');
  const mrs = STATE.mrs || [];
  document.getElementById('mr-count').textContent = mrs.length;
  const nums = mrs.map(m=>parseInt((m.mr_number||'').split('_').pop())||0);
  document.getElementById('mr-number-preview').textContent = 'MR_'+String((nums.length?Math.max(...nums)+1:1)).padStart(5,'0');
  if (!mrs.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty"><div class="empty-icon">📥</div><div class="empty-text">No material receipts yet</div></div></td></tr>`;
    document.getElementById('mr-stats').innerHTML = ''; return;
  }
  const condBadge = (c) => {
    const map = { Good:'badge-green', Damaged:'badge-red', 'Short Delivery':'badge-amber' };
    return `<span class="badge ${map[c]||'badge-gray'}">${c||'—'}</span>`;
  };
  tbody.innerHTML = mrs.map(m=>`<tr>
    <td><span class="badge badge-gray">${m.mr_number}</span></td>
    <td>${m.receipt_date||'—'}</td><td>${m.location_name}</td>
    <td style="max-width:130px; overflow:hidden; text-overflow:ellipsis;">${m.item}</td>
    <td>${m.quantity||'—'}</td>
    <td>${condBadge(m.condition)}</td>
    <td>${m.po_number ? `<span class="badge badge-green">${m.po_number}</span>` : '—'}</td>
    <td>${m.reference_number||'—'}</td>
  </tr>`).join('');
  const totalReceived = mrs.reduce((s,m)=>s+(Number(m.received_qty)||0),0);
  const totalAccepted = mrs.reduce((s,m)=>s+(Number(m.accepted_qty)||0),0);
  const totalRejected = mrs.reduce((s,m)=>s+(Number(m.rejected_qty)||0),0);
  document.getElementById('mr-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Receipts</div><div class="stat-value">${mrs.length}</div></div>
    <div class="stat-card"><div class="stat-label">Units Received</div><div class="stat-value">${totalReceived}</div></div>
    <div class="stat-card"><div class="stat-label">Units Accepted</div><div class="stat-value">${totalAccepted}</div></div>
    <div class="stat-card"><div class="stat-label">Units Rejected</div><div class="stat-value">${totalRejected}</div></div>`;
}
