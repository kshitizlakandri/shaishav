// ─────────────────────────────────────────────────────────
// CATEGORY / SUBCATEGORY CREATABLE COMBOBOXES (Item Master page)
// ─────────────────────────────────────────────────────────
let catComboHighlight = { category: -1, subcategory: -1 };

function openCatCombobox(kind) {
  const wrap = document.getElementById('cat-' + kind + '-combobox');
  if (kind === 'subcategory' && !v('item-category')) return; // must choose category first
  wrap.classList.add('open');
  renderCatComboDropdown(kind, document.getElementById('cat-' + kind + '-search').value);
}

function closeCatCombobox(kind) {
  const wrap = document.getElementById('cat-' + kind + '-combobox');
  if (wrap) wrap.classList.remove('open');
  catComboHighlight[kind] = -1;
}

function onCatComboSearch(kind) {
  const wrap = document.getElementById('cat-' + kind + '-combobox');
  wrap.classList.add('open');
  document.getElementById('item-' + kind).value = '';
  document.getElementById('cat-' + kind + '-search').classList.remove('has-value');
  if (kind === 'category') {
    // changing category invalidates the chosen subcategory
    document.getElementById('item-subcategory').value = '';
    document.getElementById('cat-subcategory-search').value = '';
    document.getElementById('cat-subcategory-search').classList.remove('has-value');
  }
  catComboHighlight[kind] = -1;
  renderCatComboDropdown(kind, document.getElementById('cat-' + kind + '-search').value);
}

function catComboOptionsFor(kind) {
  if (kind === 'category') {
    return [...new Set(STATE.catalogue.map(c => c.category))];
  }
  const cat = v('item-category');
  return [...new Set(STATE.catalogue.filter(c => c.category === cat).map(c => c.subcategory))];
}

function renderCatComboDropdown(kind, query) {
  const dropdown = document.getElementById('cat-' + kind + '-dropdown');
  if (kind === 'subcategory' && !v('item-category')) {
    dropdown.innerHTML = '<div class="combobox-empty">Select a category first</div>';
    return;
  }
  const q = (query || '').trim();
  const ql = q.toLowerCase();
  const options = catComboOptionsFor(kind);
  const filtered = ql ? options.filter(o => o.toLowerCase().includes(ql)) : options;

  let html = filtered.map(opt => {
    const label = ql ? opt.replace(new RegExp(`(${ql.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<mark>$1</mark>') : opt;
    return `<div class="combobox-option" data-value="${esc(opt)}" onmousedown="selectCatComboOption('${kind}','${esc(opt)}')">${label}</div>`;
  }).join('');

  // "Create new" option — only when the typed text doesn't already match an existing option exactly
  const exists = options.some(o => o.toLowerCase() === ql);
  if (q && !exists) {
    const label = kind === 'category' ? 'category' : 'subcategory';
    html += `<div class="combobox-option combobox-create" onmousedown="selectCatComboOption('${kind}','${esc(q)}', true)">➕ Create new ${label} “${esc(q)}”</div>`;
  }

  if (!html) {
    html = `<div class="combobox-empty">No ${kind === 'category' ? 'categories' : 'subcategories'} yet — type to create one</div>`;
  }
  dropdown.innerHTML = html;
}

function selectCatComboOption(kind, value, isNew) {
  document.getElementById('item-' + kind).value = value;
  document.getElementById('cat-' + kind + '-search').value = value;
  document.getElementById('cat-' + kind + '-search').classList.add('has-value');
  closeCatCombobox(kind);
  if (kind === 'category') {
    // reset subcategory whenever category changes
    document.getElementById('item-subcategory').value = '';
    document.getElementById('cat-subcategory-search').value = '';
    document.getElementById('cat-subcategory-search').classList.remove('has-value');
    document.getElementById('cat-subcategory-search').placeholder = 'Type to search or add subcategory…';
    updateItemCodePreview();
  } else {
    updateItemCodePreview();
  }
  if (isNew) {
    showToast(`“${value}” will be created as a new ${kind} when you save the item`, 'success');
  }
}

// ─────────────────────────────────────────────────────────
// SEARCHABLE ITEM COMBOBOX — shared across PR / PL / Indent item fields
// ─────────────────────────────────────────────────────────
let itemComboOptions = [];     // full list of "code - name" display strings, shared by all comboboxes
let comboHighlightIndex = {};  // per-prefix highlighted dropdown index

function buildItemComboOptions() {
  itemComboOptions = STATE.items.map(i => i.item_code + ' - ' + i.item_name);
}

function comboCode(val) {
  return val ? val.split(' - ')[0] : '';
}

function openComboboxDropdown(prefix) {
  const wrap = document.getElementById(prefix + '-item-combobox');
  wrap.classList.add('open');
  renderComboboxDropdown(prefix, document.getElementById(prefix + '-item-search').value);
}

function closeComboboxDropdown(prefix) {
  const wrap = document.getElementById(prefix + '-item-combobox');
  if (wrap) wrap.classList.remove('open');
  comboHighlightIndex[prefix] = -1;
}

function onComboboxSearch(prefix) {
  const wrap = document.getElementById(prefix + '-item-combobox');
  wrap.classList.add('open');
  // Clear the committed value when user edits text
  document.getElementById(prefix + '-item').value = '';
  document.getElementById(prefix + '-item-search').classList.remove('has-value');
  onComboboxCleared(prefix);
  comboHighlightIndex[prefix] = -1;
  renderComboboxDropdown(prefix, document.getElementById(prefix + '-item-search').value);
}

function onComboboxCleared(prefix) {
  if (prefix === 'pr') {
    document.getElementById('pr-item-desc').value = '';
    document.getElementById('pr-availability').classList.remove('show');
  } else if (prefix === 'pl') {
    document.getElementById('pl-item-desc').value = '';
  } else if (prefix === 'indent') {
    document.getElementById('indent-item-desc').value = '';
    document.getElementById('indent-availability').classList.remove('show');
  } else if (prefix === 'mr') {
    document.getElementById('mr-item-desc').value = '';
  }
}

function renderComboboxDropdown(prefix, query) {
  const dropdown = document.getElementById(prefix + '-item-dropdown');
  const q = query.trim().toLowerCase();
  let filtered;
  if (prefix === 'indent') {
    const availableItems = new Set(STATE.availableItems.filter(i => i.location_id == v('indent-location')).map(i => i.item_code + ' - ' + i.item_name));
    filtered = q
      ? itemComboOptions.filter(opt => opt.toLowerCase().includes(q)).filter(opt => availableItems.has(opt))
      : itemComboOptions.filter(opt => availableItems.has(opt));
  } else {
    filtered = q
      ? itemComboOptions.filter(opt => opt.toLowerCase().includes(q))
      : itemComboOptions;
  }

  if (!filtered.length) {
    dropdown.innerHTML = '<div class="combobox-empty">No items match</div>';
    return;
  }

  dropdown.innerHTML = filtered.map((opt, idx) => {
    const label = q ? opt.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<mark>$1</mark>') : opt;
    return `<div class="combobox-option" data-value="${esc(opt)}" data-idx="${idx}"
              onmousedown="selectComboboxItem('${prefix}','${esc(opt)}')">${label}</div>`;
  }).join('');
}

function selectComboboxItem(prefix, value) {
  document.getElementById(prefix + '-item').value = value;
  document.getElementById(prefix + '-item-search').value = value;
  document.getElementById(prefix + '-item-search').classList.add('has-value');
  closeComboboxDropdown(prefix);
  // Trigger the downstream logic (description + availability) for the relevant page
  if (prefix === 'pr') onPRItemChange();
  else if (prefix === 'pl') onPLItemChange();
  else if (prefix === 'indent') onIndentItemChange();
  else if (prefix === 'mr') onMRItemChange();
}

function clearComboboxItem(prefix) {
  document.getElementById(prefix + '-item').value = '';
  document.getElementById(prefix + '-item-search').value = '';
  document.getElementById(prefix + '-item-search').classList.remove('has-value');
  onComboboxCleared(prefix);
  closeComboboxDropdown(prefix);
}

function updateComboHighlight(options, hi) {
  options.forEach((o, i) => o.classList.toggle('highlighted', i === hi));
  if (options[hi]) options[hi].scrollIntoView({ block: 'nearest' });
}

// Keyboard navigation. Must be called AFTER the page partials are in the DOM.
function initComboboxKeyboard() {
  ['pr', 'pl', 'indent', 'mr'].forEach(prefix => {
    const searchInput = document.getElementById(prefix + '-item-search');
    if (!searchInput) return;
    searchInput.addEventListener('keydown', function(e) {
      const dropdown = document.getElementById(prefix + '-item-dropdown');
      const options  = dropdown.querySelectorAll('.combobox-option');
      if (!options.length) return;

      let hi = (comboHighlightIndex[prefix] !== undefined) ? comboHighlightIndex[prefix] : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        hi = Math.min(hi + 1, options.length - 1);
        comboHighlightIndex[prefix] = hi;
        updateComboHighlight(options, hi);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        hi = Math.max(hi - 1, 0);
        comboHighlightIndex[prefix] = hi;
        updateComboHighlight(options, hi);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hi >= 0 && options[hi]) {
          selectComboboxItem(prefix, options[hi].dataset.value);
        }
      } else if (e.key === 'Escape') {
        // Restore last committed value on escape
        const committed = document.getElementById(prefix + '-item').value;
        document.getElementById(prefix + '-item-search').value = committed;
        closeComboboxDropdown(prefix);
      }
    });
  });

  // Keyboard nav for category/subcategory creatable comboboxes
  ['category', 'subcategory'].forEach(kind => {
    const searchInput = document.getElementById('cat-' + kind + '-search');
    if (!searchInput) return;
    searchInput.addEventListener('keydown', function(e) {
      const dropdown = document.getElementById('cat-' + kind + '-dropdown');
      const options  = dropdown.querySelectorAll('.combobox-option');
      if (!options.length) return;
      let hi = catComboHighlight[kind] !== undefined ? catComboHighlight[kind] : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        hi = Math.min(hi + 1, options.length - 1);
        catComboHighlight[kind] = hi;
        updateComboHighlight(options, hi);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        hi = Math.max(hi - 1, 0);
        catComboHighlight[kind] = hi;
        updateComboHighlight(options, hi);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hi >= 0 && options[hi]) {
          options[hi].dispatchEvent(new Event('mousedown'));
        }
      } else if (e.key === 'Escape') {
        const committed = document.getElementById('item-' + kind).value;
        document.getElementById('cat-' + kind + '-search').value = committed;
        closeCatCombobox(kind);
      }
    });
  });
}

// Close dropdowns when clicking outside (document-level, safe to register immediately)
document.addEventListener('click', function(e) {
  ['category', 'subcategory'].forEach(kind => {
    const wrap = document.getElementById('cat-' + kind + '-combobox');
    if (wrap && !wrap.contains(e.target)) {
      const committed = document.getElementById('item-' + kind).value;
      const searchEl = document.getElementById('cat-' + kind + '-search');
      if (committed) { searchEl.value = committed; searchEl.classList.add('has-value'); }
      closeCatCombobox(kind);
    }
  });

  ['pr', 'pl', 'indent', 'mr'].forEach(prefix => {
    const wrap = document.getElementById(prefix + '-item-combobox');
    if (wrap && !wrap.contains(e.target)) {
      // If no item committed, revert text to committed value
      const committed = document.getElementById(prefix + '-item').value;
      const searchEl = document.getElementById(prefix + '-item-search');
      searchEl.value = committed;
      if (!committed) searchEl.classList.remove('has-value');
      closeComboboxDropdown(prefix);
    }
  });
});
