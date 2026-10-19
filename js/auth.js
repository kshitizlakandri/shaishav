// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────
async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    console.error('Error logging out:', error.message);
  } else {
    window.location.reload();
  }
}

async function getUserFromEmail(email) {
  const { data, error } = await supabaseClient.rpc('get_user_from_email', { p_email: email });
  return data;
}

async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) {
    console.log(user);
    const userData = await getUserFromEmail(user.email);
    console.log(userData);
    currentUser = userData;
    if (currentUser.user_id) {
      activateApp();
    } else {
      showDenied(user.email, 'If you believe this is an error: Please verify your credentials or contact system administrator.');
    }
  } else {
    supabaseClient.auth.signInWithOAuth({
      provider: "google"
      // ,options: {
      //   redirectTo: 'http://127.0.0.1:5500', // Must be an absolute URL
      // }
    });
  }
}

function showDenied(email, msg) {
  document.getElementById('loading-card-inner').innerHTML =
    '<div class="loading-logo"><img src="images/shaishav_logo.png" alt="Shaishav Logo"> Shaishav</div>' +
    '<div class="denied-icon">🔒</div>' +
    '<div class="denied-title">Access Denied</div>' +
    '<div class="denied-sub">' + msg + (email ? '<br><span class="denied-email">' + email + '</span>' : '') + '</div>' +
    '<br><button class="btn" style="background:var(--bg); color:var(--ink2);" onclick="handleLogout()">Logout</button>';
}

async function activateApp() {
  document.getElementById('user-name-display').textContent = currentUser.username;
  document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
  document.getElementById('greet-name').textContent = currentUser.username;
  if (currentUser.role === 'A') document.getElementById('admin-pill').style.display = '';
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('screen-loading').classList.remove('active');
  document.getElementById('screen-loading').classList.add('hidden');
  document.getElementById('screen-loading').parentNode.hidden = true;
  document.getElementById("screen-loading").style.display = "none";
  document.getElementById('screen-app').classList.add('active');
  setDefaultDates();
  await getInitData();
  renderAll();
  populateDropdowns();
  setIndentTxnType('issue');
}
