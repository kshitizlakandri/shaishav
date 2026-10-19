// ─────────────────────────────────────────────────────────
// INDENT (issue / receive)
// ─────────────────────────────────────────────────────────
let indentTxnType = 'issue';

function onIndentReceiveRefChange() {
  const indentReturnRef = v('indent-return-ref').split(":", 1)[0];
  console.log(indentReturnRef);
  console.log(STATE.indents);
  const indent = STATE.indents.find(i => i.indent_number === indentReturnRef);
  console.log(indent);
  const locationId = STATE.locations.find(l => l.location_name == indent.location_name).location_id;
  document.getElementById('indent-location').value = locationId;
  document.getElementById('indent-item').value = indent.item;
  document.getElementById('indent-item-desc').value = indent.item_description;
  document.getElementById('indent-received-from').value = indent.issued_to;
}

function onIndentLocationChange() {
  updateIndentAvailability();
}

function onIndentItemChange() {
  const code = comboCode(document.getElementById('indent-item').value);
  const item = STATE.items.find(i => i.item_code === code);
  document.getElementById('indent-item-desc').value = item ? item.item_description : '';
  updateIndentAvailability();
}

async function updateIndentAvailability() {
  const itemDisplay = document.getElementById('indent-item').value;
  const location    = document.getElementById('indent-location').value;
  const panel       = document.getElementById('indent-availability');

  if (indentTxnType !== 'issue') {
    panel.classList.remove('show');
    return;
  }

  if (!itemDisplay || !location) { panel.classList.remove('show'); return; }

  const { data, error } = await supabaseClient
    .from('available_items_v')
    .select('purchased, consumed, received, issued')
    .eq('item_code', itemDisplay.split(' ')[0])
    .eq('location_id', location);

  const validItemCount = data[0].purchased - data[0].consumed;
  const issued = data[0].issued - data[0].received - data[0].consumed;

  document.getElementById('indent-avail-received').textContent = validItemCount;
  document.getElementById('indent-avail-issued').textContent   = issued;
  const available = validItemCount - issued;

  const avEl = document.getElementById('indent-avail-available');
  avEl.textContent = available;
  avEl.className = 'avail-stat-value ' + (available > 5 ? 'avail-ok' : available > 0 ? 'avail-warn' : 'avail-zero');

  panel.classList.add('show');
}

function setIndentTxnType(type) {
  indentTxnType = type;
  document.getElementById('indent-txn-issue-btn').classList.toggle('active', type === 'issue');
  document.getElementById('indent-txn-receive-btn').classList.toggle('active', type === 'receive');
  document.querySelectorAll('.indent-issue-field').forEach(el => el.style.display = type === 'issue' ? '' : 'none');
  document.querySelectorAll('.indent-receive-field').forEach(el => el.style.display = type === 'receive' ? '' : 'none');
  document.getElementById('btn-add-indent').textContent = type === 'issue' ? '＋ Submit Issue' : '＋ Submit Return';
  if (type === 'issue') {
    document.getElementById('indent-req-qty').setAttribute('required','');
    document.getElementById('indent-location').disabled = false;
    document.getElementById('indent-item-search').disabled = false;
    document.getElementById('indent-received-from').disabled = false;
  } else {
    const panel = document.getElementById('indent-availability');
    panel.classList.remove('show');
    document.getElementById('indent-req-qty').removeAttribute('required');
    document.getElementById('indent-location').disabled = true;
    document.getElementById('indent-item-search').disabled = true;
    document.getElementById('indent-received-from').disabled = true;
    document.getElementById('indent-item').value = "";
    document.getElementById('indent-item-desc').value = "";
    document.getElementById('indent-location').value = "";
    document.getElementById('indent-availability').removeAttribute('show');
    populateDropdowns(); // refresh the "original indent" reference list
  }
}

function submitIndent() {
  if (indentTxnType === 'issue') return submitIndentIssue();
  return submitIndentReceive();
}

async function submitIndentIssue() {
  if (!v('indent-date')||!v('indent-location')||!v('indent-item')||!v('indent-req-qty')||!v('indent-iss-qty')||!v('indent-issued-to'))
    return showToast('Fill required fields', 'error');
  const btn = document.getElementById('btn-add-indent');
  setLoading(btn, true);
  const itemDisplayName = v('indent-item');
  const itemId = STATE.items.filter(i => (i.item_code + ' - ' + i.item_name) === itemDisplayName)[0].item_id;
  try {
    const result = await callRpc('create_indent_issue_record',
      {
        p_indent_date: v('indent-date'),
        p_location_id: parseInt(v('indent-location')),
        p_item_id: itemId,
        p_requested_qty: v('indent-req-qty'),
        p_issued_qty: v('indent-iss-qty'),
        p_issued_to: v('indent-issued-to'),
        p_used_at_as: v('indent-used-at'),
        p_purpose_of_use: v('indent-purpose'),
        p_remarks: v('indent-remarks')
      }
    );
    console.log(result);
    if (!result.responseData && !result.error) {
      setLoading(btn, false);
      showToast('Indent submitted', 'success');
      clearFields(['indent-requested-by','indent-req-qty','indent-iss-qty','indent-issued-to','indent-used-at','indent-purpose','indent-consumed-qty','indent-remarks','indent-item-desc']);
      clearComboboxItem('indent');
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

async function submitIndentReceive() {
  if (!v('indent-date')||!v('indent-location')||!v('indent-item')||!v('indent-recv-qty')||!v('indent-consumed-qty'))
    return showToast('Fill required fields', 'error');
  const btn = document.getElementById('btn-add-indent');
  setLoading(btn, true);
  const indentNumber = v('indent-return-ref').split(":", 1)[0];
  console.log(indentNumber);
  const indentId = STATE.indents.find(i => i.indent_number === indentNumber).indent_id;
  console.log(indentId);

  try {
    const result = await callRpc('create_indent_received_record',
      {
        p_indent_date: v('indent-date'),
        p_ref_indent_id: indentId,
        p_consumed_qty: v('indent-consumed-qty'),
        p_received_qty: v('indent-recv-qty'),
        p_return_condition: v('indent-return-condition') ? v('indent-return-condition') : null,
        p_return_reason: v('indent-return-reason'),
        p_remarks: v('indent-remarks') ? v('indent-remarks') : null
      }
    );
    console.log(result);
    if (!result.responseData && !result.error) {
      setLoading(btn, false);
      showToast('Return recorded', 'success');
      clearFields(['indent-received-from','indent-recv-qty','indent-return-condition','indent-return-reason','indent-remarks','indent-item-desc']);
      clearComboboxItem('indent');
      document.getElementById('indent-return-ref').value = '';
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

function renderIndents() {
  document.getElementById('indent-requested-by').value = currentUser.username;
  const tbody = document.getElementById('indent-tbody');
  const indents = STATE.indents;
  document.getElementById('indent-count').textContent = indents.length;
  const nums = indents.map(i=>parseInt(i.indent_number.split('_').pop())||0);
  document.getElementById('indent-number-preview').textContent = 'IN_'+String((nums.length?Math.max(...nums)+1:1)).padStart(5,'0');
  if (!indents.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty"><div class="empty-icon">📤</div><div class="empty-text">No indents yet</div></div></td></tr>`;
    document.getElementById('indent-stats').innerHTML = ''; return;
  }
  tbody.innerHTML = indents.map(i=>{
    const typeBadge = i.type === 'Received'
      ? `<span class="badge badge-green">📥 Received</span>`
      : `<span class="badge badge-red">📤 Issued</span>`;
    return `<tr>
    <td><span class="badge badge-gray">${i.indent_number}</span></td>
    <td>${typeBadge}</td>
    <td>${i.indent_date}</td>
    <td>${i.location_name}</td>
    <td>${i.requested_by||'—'}</td>
    <td>${i.issued_to||i.received_from}</td>
    <td style="max-width:130px; overflow:hidden; text-overflow:ellipsis;">${i.item}</td>
    <td>${i.requested_qty||'—'}</td>
    <td>${i.consumed_qty||'—'}</td>
    <td>${i.issued_qty||i.received_qty}</td>
    <td>${i.purpose_of_use||i.return_reason||'—'}</td>
  </tr>`;
  }).join('');
  const issued = indents.filter(i => (i.type||'Issued')==='Issued').reduce((s,i)=>s+(Number(i.issued_qty)||0),0);
  const received = indents.filter(i => i.type==='Received').reduce((s,i)=>s+(Number(i.received_qty)||0),0);
  document.getElementById('indent-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Indents</div><div class="stat-value">${indents.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Issued</div><div class="stat-value">${issued}</div><div class="stat-sub">units issued</div></div>
    <div class="stat-card"><div class="stat-label">Total Received</div><div class="stat-value">${received}</div><div class="stat-sub">units returned</div></div>`;
}
