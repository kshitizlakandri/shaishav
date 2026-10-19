// ─────────────────────────────────────────────────────────
// APP BOOTSTRAP
// Loads each page partial from /pages into #page-container,
// then wires up keyboard handlers and starts the auth check.
// ─────────────────────────────────────────────────────────
const PAGES = ['home', 'items', 'pr', 'pl', 'mr', 'indent'];

async function loadPages() {
  const container = document.getElementById('page-container');
  const htmls = await Promise.all(PAGES.map(async name => {
    const res = await fetch(`pages/${name}.html`);
    if (!res.ok) throw new Error(`Could not load pages/${name}.html (${res.status})`);
    return res.text();
  }));
  container.innerHTML = htmls.join('\n');
}

async function boot() {
  try {
    await loadPages();
  } catch (err) {
    console.error(err);
    document.querySelector('#loading-card-inner .loading-msg').textContent =
      'Failed to load app pages. Serve the folder over http (e.g. Live Server), not file://';
    return;
  }
  initComboboxKeyboard();
  checkUser();
}

window.addEventListener('load', boot);
