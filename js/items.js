// ─────────────────────────────────────────────────────────
// ITEM MASTER PAGE (items + categories)
// ─────────────────────────────────────────────────────────
let currentItemsSubtab = 'items';

function setItemsSubtab(tab) {
  currentItemsSubtab = tab;
  document.getElementById('items-subtab-items').classList.toggle('active', tab === 'items');
  document.getElementById('items-subtab-categories').classList.toggle('active', tab === 'categories');
  document.getElementById('items-table').style.display = tab === 'items' ? '' : 'none';
  document.getElementById('cat-table').style.display = tab === 'categories' ? '' : 'none';
  document.getElementById('items-list-title').textContent = tab === 'items' ? 'All Items' : 'All Categories';
  const searchEl = document.getElementById('items-list-search');
  searchEl.value = '';
  searchEl.placeholder = tab === 'items' ? 'Search items…' : 'Search categories…';
  // reset any prior filtering from the other table
  filterTable(tab === 'items' ? 'items-table' : 'cat-table', '');
}

function onCategoryChange() {
  // kept for compatibility — subcategory list is rebuilt on demand by catComboOptionsFor()
  updateItemCodePreview();
}

function updateItemCodePreview() {
  const cat = document.getElementById('item-category').value;
  const sub = document.getElementById('item-subcategory').value;
  const match = STATE.catalogue.find(c => c.category === cat && c.subcategory === sub);
  const prefix = match ? match.code : '??';
  const existing = STATE.items.filter(i => i.item_code.startsWith(prefix + '_'));
  const nums = existing.map(i => parseInt(i.item_code.split('_').pop()) || 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  document.getElementById('item-code-preview').textContent = prefix + '_' + String(next).padStart(4,'0');
}

// Ensures the category+subcategory pair typed/selected exists, creating it first
// via RPC if needed. Returns the resulting item_category_id, or null on failure.
async function ensureCategoryExists(category, subcategory) {
  const existing = STATE.catalogue.find(c => c.category === category && c.subcategory === subcategory);
  if (existing) return existing.item_category_id;

  const result = await callRpc('create_item_category', {
    p_category: category,
    p_subcategory: subcategory
  });
  if (result.error) {
    showToast('Error creating category: ' + result.error.message, 'error');
    return null;
  }
  // Refresh catalogue so the new pair (and its auto code) is available
  STATE.catalogue = await getItemCategories();
  const created = STATE.catalogue.find(c => c.category === category && c.subcategory === subcategory);
  return created ? created.item_category_id : null;
}

async function submitItem() {
  const name = v('item-name'), category = v('item-category'), subcategory = v('item-subcategory');
  if (!name || !category || !subcategory) return showToast('Fill required fields', 'error');
  const btn = document.getElementById('btn-add-item');
  const description = v('item-desc');
  const itemType = v('item-type');
  const itemRemarks = v('item-remarks');
  setLoading(btn, true);

  const categoryId = await ensureCategoryExists(category, subcategory);
  if (!categoryId) { setLoading(btn, false); return; }

  try {
    const result = await callRpc('create_item',
      {
        p_item_name: name,
        p_item_description: description,
        p_item_type: itemType,
        p_category_id: categoryId,
        p_remarks: itemRemarks
      }
    );
    console.log(result);
    if (!result.responseData) {
      setLoading(btn, false);
      showToast('Item Added', 'success');
    }
    if (result.error) {
      setLoading(btn, false);
      showToast('Error: ' + result.error.message, 'error');
    } else {
      setLoading(btn, false);
      showToast('Item Added', 'success');
    }
  } catch(err) {
    setLoading(btn, false);
    showToast('Error: ' + err.message, 'error');
  }
  refreshData();
}

async function renderCatalogue() {
  const tbody = document.getElementById('cat-tbody');
  const cat = STATE.catalogue;
  if (!cat.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="empty-icon">🗂</div><div class="empty-text">No categories yet</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = cat.map(c => `
    <tr>
      <td>${c.category}</td><td>${c.subcategory}</td>
      <td><span class="badge badge-purple">${c.code}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteCatalogue('${esc(c.category)}','${esc(c.subcategory)}')">Delete</button></td>
    </tr>`).join('');
}

async function renderItems() {
  const tbody = document.getElementById('items-tbody');
  const items = STATE.items;
  console.log(STATE.items);
  document.getElementById('items-count').textContent = currentItemsSubtab === 'items' ? items.length : STATE.catalogue.length;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-icon">📦</div><div class="empty-text">No items yet</div></div></td></tr>`;
  } else {
    tbody.innerHTML = items.map(i => `
      <tr>
        <td><span class="badge badge-blue">${i.item_code}</span></td>
        <td><strong>${i.item_name}</strong></td>
        <td>${i.category}</td>
        <td>${i.subcategory}</td>
        <td>${i.item_type}</td>
        <td style="color:var(--ink3); max-width:180px; overflow:hidden; text-overflow:ellipsis;">${i.item_description||'—'}</td>
      </tr>`).join('');
  }
  const cats = {};
  items.forEach(i => cats[i.category] = (cats[i.category]||0)+1);
  document.getElementById('items-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Total Items</div><div class="stat-value">${items.length}</div></div>
    <div class="stat-card"><div class="stat-label">Categories</div><div class="stat-value">${STATE.catalogue.length}</div></div>
    ${Object.entries(cats).map(([k,c])=>`<div class="stat-card"><div class="stat-label">${k}</div><div class="stat-value">${c}</div><div class="stat-sub">items</div></div>`).join('')}`;
}
