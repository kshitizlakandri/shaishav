// ─────────────────────────────────────────────────────────
// SUPABASE READ CALLS
// ─────────────────────────────────────────────────────────
async function getItems() {
  const { data, error } = await supabaseClient.from('items_v').select();
  if (data) return data;
  showToast('Error while fetching items: ' + error.message, 'error');
}

async function getItemCategories() {
  const { data, error } = await supabaseClient.from('item_categories_v').select();
  if (data) return data;
  showToast('Error while fetching Item Categories: ' + error.message, 'error');
}

async function getLocations() {
  const { data, error } = await supabaseClient.from('locations_v').select();
  if (data) return data;
  showToast('Error while fetching Locations: ' + error.message, 'error');
}

async function getPurchaseRequisitions() {
  const { data, error } = await supabaseClient.from('purchase_requisitions_v').select();
  if (data) return data;
  showToast('Error while fetching Purchase Requisitions: ' + error.message, 'error');
}

async function getPurchaseOrders() {
  const { data, error } = await supabaseClient.from('purchase_orders_v').select();
  if (data) return data;
  showToast('Error while fetching Purchase Ledgers: ' + error.message, 'error');
}

async function getIndents() {
  const { data, error } = await supabaseClient.from('indents_v').select().order('indent_number');
  if (data) return data;
  showToast('Error while fetching Indents: ' + error.message, 'error');
}

async function getMaterialReceipts() {
  const { data, error } = await supabaseClient.from('material_receipts_v').select();
  if (data) return data;
  showToast('Error while fetching Material Receipts: ' + error.message, 'error');
}

async function getAvailableItems() {
  const { data, error } = await supabaseClient.from('available_items_v').select();
  if (data) return data;
  showToast('Error while fetching Material Receipts: ' + error.message, 'error');
}

async function getInitData() {
  STATE.items = await getItems();
  STATE.catalogue = await getItemCategories();
  STATE.prs = await getPurchaseRequisitions();
  STATE.locations = await getLocations();
  STATE.pls = await getPurchaseOrders();
  STATE.mrs = await getMaterialReceipts();
  STATE.indents = await getIndents();
  STATE.availableItems = await getAvailableItems();
  console.log(STATE);
}
