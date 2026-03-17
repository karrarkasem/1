// ════════════════════════════════════════
// CORE.JS — دوال مشتركة لجميع الصفحات
// ════════════════════════════════════════
const SESSION_12H = 12 * 60 * 60 * 1000;
let CU = null;

// ─── Firebase helpers ────────────────────
function db()  { return window._db; }
function fb()  { return window._fb; }

async function fbGet(colName) {
  if (!window._fbReady) return [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), colName));
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) { console.warn('fbGet', colName, e); return []; }
}

async function fbAdd(colName, data) {
  if (!window._fbReady) return null;
  try {
    const ref = await fb().addDoc(fb().collection(db(), colName), {
      ...data, createdAt: fb().serverTimestamp()
    });
    return ref.id;
  } catch(e) { return null; }
}

async function fbUpdate(colName, docId, data) {
  if (!window._fbReady) return;
  try {
    await fb().updateDoc(fb().doc(db(), colName, docId), {
      ...data, updatedAt: fb().serverTimestamp()
    });
  } catch(e) {}
}

async function fbGetSub(colName, docId, subCol) {
  if (!window._fbReady) return [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), colName, docId, subCol));
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) { return []; }
}

function tsToStr(ts) {
  if (!ts) return '—';
  if (typeof ts === 'string') return ts;
  if (ts && ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString('ar-IQ');
  if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString('ar-IQ');
  return String(ts);
}

// ─── Toast ───────────────────────────────
function toast(msg, ok = true) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const d = document.createElement('div');
  d.className = 'toast ' + (ok === false ? 'err' : ok === 'info' ? 'info' : 'ok');
  d.textContent = msg;
  wrap.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

// ─── Session ─────────────────────────────
function getSession() {
  try {
    const raw = localStorage.getItem('bjUser');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.loginTime || (Date.now() - parsed.loginTime) > SESSION_12H) {
      localStorage.removeItem('bjUser');
      return null;
    }
    return parsed;
  } catch { return null; }
}

function waitForFb() {
  if (window._fbReady) return Promise.resolve();
  return new Promise(res => document.addEventListener('fbReady', res, { once: true }));
}

// ─── Sidebar ─────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
}

// ─── Login UI ────────────────────────────
function showLoginBox() {
  const el = document.getElementById('loginOverlay');
  if (el) el.style.display = 'flex';
}
function hideLoginBox() {
  const el = document.getElementById('loginOverlay');
  if (el) el.style.display = 'none';
}

// ─── Firebase status dot ─────────────────
function setFbStatus(ok) {
  const dot = document.getElementById('fbDot');
  const txt = document.getElementById('fbStatusTxt');
  if (dot) dot.className = 'fb-dot ' + (ok ? 'ok' : 'err');
  if (txt) txt.textContent = ok ? 'متصل' : 'غير متصل';
}

// ─── Loader ──────────────────────────────
function hideLoader() {
  const ls = document.getElementById('loadScreen');
  if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.style.display = 'none', 400); }
}

// ─── Sidebar user info ───────────────────
const ROLES_AR = { admin:'🛡️ أدمن', sales_manager:'📊 مشرف', rep:'🤝 مندوب', market_owner:'🏪 صاحب ماركت', guest:'🌐 زائر' };

function updateSidebarUser() {
  const name = document.getElementById('sbName');
  const role = document.getElementById('sbRole');
  const online = document.getElementById('sbOnline');
  const loginBtn = document.getElementById('topLoginBtn');
  const walBar = document.getElementById('sbWalletBar');
  const walAmt = document.getElementById('sbWalletAmt');

  if (!CU) {
    if (name) name.textContent = 'زائر';
    if (role) role.textContent = 'غير مسجل';
    if (online) online.style.display = 'none';
    if (loginBtn) loginBtn.style.display = '';
    if (walBar) walBar.style.display = 'none';
  } else {
    if (name) name.textContent = CU.name || CU.username;
    if (role) role.textContent = ROLES_AR[CU.type] || CU.type;
    if (online) online.style.display = '';
    if (loginBtn) loginBtn.style.display = 'none';
    if (walBar) walBar.style.display = '';
    if (walAmt) walAmt.textContent = (parseFloat(CU.balance || 0)).toLocaleString() + ' د.ع';

    // Show admin link if admin
    const navAdmin = document.getElementById('navAdmin');
    if (navAdmin && (CU.type === 'admin' || CU.type === 'sales_manager')) {
      navAdmin.style.display = '';
    }
    const navReps = document.getElementById('navReps');
    if (navReps && (CU.type === 'admin' || CU.type === 'sales_manager')) {
      navReps.style.display = '';
    }
    const navPoints = document.getElementById('navPoints');
    if (navPoints && (CU.type === 'admin' || CU.type === 'sales_manager')) {
      navPoints.style.display = '';
    }
  }

  // Logout button
  const sbLL = document.getElementById('sbLoginLogout');
  if (sbLL) {
    sbLL.innerHTML = CU
      ? `<button class="btn btn-danger btn-sm btn-full" onclick="doLogout()">🚪 خروج</button>`
      : `<button class="btn btn-sky btn-sm btn-full" onclick="showLoginBox()">👤 دخول</button>`;
  }
}

function doLogout() {
  localStorage.removeItem('bjUser');
  CU = null;
  location.reload();
}

// ─── Keyboard shortcuts ──────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSidebar();
    hideLoginBox();
  }
});
