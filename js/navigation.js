// ─────────────────────────────────────────────────────────
// NAVIGATION, DROPDOWNS, GLOBAL REFRESH / RENDER
// ─────────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
}
function goHome() { showPage('home'); }

function goToReportsPage() {
  window.location.href = "reports.html";
}

function openReportsPage(url) {
  console.log("reports url: " + url);
  window.open(url, "_top");
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['pr-date','pr-date-req','pl-date','pl-billing-date','indent-date','mr-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
}

async function populateDropdowns() {
  ['pr-location','pl-location','indent-location'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="" disabled selected hidden>Select…</option>';
    STATE.locations.forEach(l => sel.innerHTML += `<option value="${l.location_id}">${l.location_name}</option>`);
  });

  // Item comboboxes (PR / PL / Indent / MR) share the same option list
  buildItemComboOptions();

  const approvedPRs = STATE.prs.filter(p => p.status === 'Approved');
  const plPRSel = document.getElementById('pl-linked-pr');
  plPRSel.innerHTML = '<option value="">— None —</option>';
  approvedPRs.forEach(p => plPRSel.innerHTML += `<option value="${p.pr_number}">${p.pr_number} — ${p.item_name} @ ${p.location_name}</option>`);

  // MR references a recorded Purchase Order / ledger entry
  const mrPLSel = document.getElementById('mr-linked-pl');
  if (mrPLSel) {
    mrPLSel.innerHTML = '<option value="">— None —</option>';
    (STATE.pls || []).filter(p => p.mr_status != 'C').forEach(p => mrPLSel.innerHTML += `<option value="${p.pl_number}">${p.pl_number} — ${p.item} @ ${p.location_name}</option>`);
  }

  // Populate "original indent" reference dropdown for Indent → Received flow
  const retRefSel = document.getElementById('indent-return-ref');
  if (retRefSel) {
    retRefSel.innerHTML = '<option value="" disabled selected hidden>— None —</option>';
    const { data, error } = await supabaseClient
      .from('indent_balance_v')
      .select('*')
      .gt('remaining', '0');
    data.forEach(i => retRefSel.innerHTML += `<option value="${i.indent_display}">${i.indent_display}</option>`);
  }
}

async function refreshData() {
  await getInitData();
  console.log(STATE);
  await renderAll();
  populateDropdowns();
}

function renderAll() {
  renderHome(); renderCatalogue(); renderItems(); renderPRs(); renderPLs(); renderMRs(); renderIndents();
}

function renderHome() {
  const pending = STATE.prs.filter(p => p.status === 'Pending').length;
  document.getElementById('hs-items').textContent   = STATE.items.length;
  document.getElementById('hs-prs').textContent     = STATE.prs.length;
  document.getElementById('hs-pls').textContent     = STATE.pls.length;
  document.getElementById('hs-mrs').textContent     = (STATE.mrs||[]).length;
  document.getElementById('hs-indents').textContent = STATE.indents.length;
  document.getElementById('hs-cats').textContent    = STATE.catalogue.length;
  document.getElementById('hs-pending').textContent = pending;
  document.getElementById('hc-items').textContent   = STATE.items.length + ' items';
  document.getElementById('hc-prs').textContent     = STATE.prs.length + ' PRs';
  document.getElementById('hc-pls').textContent     = STATE.pls.length + ' entries';
  document.getElementById('hc-mrs').textContent     = (STATE.mrs||[]).length + ' MRs';
  document.getElementById('hc-indents').textContent = STATE.indents.length + ' indents';
}
