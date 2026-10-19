// ─────────────────────────────────────────────────────────
// UTILS, MODALS, TOAST, TABLE FILTER, RPC
// ─────────────────────────────────────────────────────────
let confirmCallback = null;
let toastTimer;

function v(id) { return document.getElementById(id).value.trim(); }
function clearFields(ids) { ids.forEach(id => { const el = document.getElementById(id); if(el) el.value=''; }); }
function esc(str) { return String(str).replace(/'/g,"\\'"); }

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.loading) {
      btn.dataset.originalHtml = btn.innerHTML;
      btn.dataset.loading = "true";
    }

    btn.innerHTML = '<div class="spinner"></div> Saving…';
    btn.disabled = true;
  } else {
    if (btn.dataset.loading === "true") {
      btn.innerHTML = btn.dataset.originalHtml || "";
      delete btn.dataset.originalHtml;
      delete btn.dataset.loading;
    }
    btn.disabled = false;
  }
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = (type==='success'?'✓  ':'✗  ') + msg;
  t.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 3500);
}

function filterTable(tableId, query) {
  const q = query.toLowerCase();
  document.getElementById(tableId).querySelectorAll('tbody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function openConfirm(title, desc, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-desc').textContent = desc;
  confirmCallback = cb;
  document.getElementById('confirm-modal').classList.add('show');
}
function confirmOk() { closeModal('confirm-modal'); if (confirmCallback) confirmCallback(); confirmCallback = null; }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

async function callRpc(procName, data) {
  const { responseData , error } = await supabaseClient.rpc(procName, data);
  console.log(responseData);
  return { responseData , error };
}