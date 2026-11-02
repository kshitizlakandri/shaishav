// ─────────────────────────────────────────────────────────
// APP BOOTSTRAP
// Page partials in /pages are fetched only for pages the user may view
// (home is always loaded). Called from checkUser() once permissions are known.
// ─────────────────────────────────────────────────────────
const PAGES = ['home', 'items', 'pr', 'pl', 'mr', 'indent'];

async function loadPages() {
  const container = document.getElementById('page-container');
  const allowed = PAGES.filter(name => name === 'home' || can(name + ':view'));
  const htmls = await Promise.all(allowed.map(async name => {
    const res = await fetch(`pages/${name}.html`);
    if (!res.ok) throw new Error(`Could not load pages/${name}.html (${res.status})`);
    return res.text();
  }));
  container.innerHTML = htmls.join('\n');
}

async function loadPagesAndInit() {
  try {
    await loadPages();
    initComboboxKeyboard();
    return true;
  } catch (err) {
    console.error(err);
    showDenied(null, 'Failed to load app pages. Serve the folder over http (e.g. Live Server), not file://');
    return false;
  }
}

window.addEventListener('load', checkUser);
