// ════════════════════════════════════════
// REPS.JS — صفحة المندوبين والمبيعات
// ════════════════════════════════════════
let _users = [], _orders = [], _purInvoices = [], _products = [];
let _repFilter = 'all', _repFrom = '', _repTo = '';

async function pageInit() {
  await waitForFb();
  setFbStatus(true);

  const session = getSession();
  if (!session) { hideLoader(); showLoginBox(); return; }

  try {
    [_users, _orders, _purInvoices, _products] = await Promise.all([
      fbGet('users'), fbGet('orders'), fbGet('purInvoices'), fbGet('products')
    ]);

    const fresh = _users.find(u => u.username === session.username);
    if (fresh) CU = { ...fresh };

    updateSidebarUser();

    if (!CU || (CU.type !== 'admin' && CU.type !== 'sales_manager')) {
      document.getElementById('pageContent').innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="font-size:3rem;margin-bottom:16px">🔒</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--deep)">هذه الصفحة للأدمن والمشرف فقط</div>
          <a href="wallet.html" class="btn btn-sky" style="margin-top:20px;display:inline-flex;text-decoration:none">اذهب للمحفظة</a>
        </div>`;
      hideLoader();
      return;
    }

    renderRepTracking();
    renderPurchaseList();
    renderSalesList();
    renderReports();
  } catch(e) {
    console.error(e);
    toast('❌ خطأ في تحميل البيانات', false);
  }

  hideLoader();
}

// ─── Login ────────────────────────────────
async function doLogin() {
  const un = document.getElementById('lUser').value.trim();
  const pw = document.getElementById('lPass').value.trim();
  document.getElementById('loginErr').textContent = '';
  if (!un || !pw) { document.getElementById('loginErr').textContent = '❌ أدخل بيانات الدخول'; return; }
  if (!_users.length) _users = await fbGet('users');
  const found = _users.find(u => u.username.toLowerCase() === un.toLowerCase() && u.password === pw);
  if (!found) { document.getElementById('loginErr').textContent = '❌ بيانات خاطئة'; return; }
  CU = { ...found };
  localStorage.setItem('bjUser', JSON.stringify({ username: CU.username, loginTime: Date.now() }));
  fbUpdate('users', found._id, { lastLogin: new Date().toLocaleDateString('ar-IQ') }).catch(() => {});
  if (!_orders.length) _orders = await fbGet('orders');
  if (!_purInvoices.length) _purInvoices = await fbGet('purInvoices');
  if (!_products.length) _products = await fbGet('products');
  hideLoginBox();
  updateSidebarUser();
  renderRepTracking();
  renderPurchaseList();
  renderSalesList();
  renderReports();
  toast('✅ مرحباً ' + CU.name);
}

// ─── Rep Tracking ─────────────────────────
function renderRepTracking() {
  const reps = _users.filter(u => u.type === 'rep' || u.type === 'sales_manager');
  const el = document.getElementById('repTrackList');
  if (!el) return;
  el.innerHTML = reps.length ? reps.map(rep => {
    const myOrds = _orders.filter(o => o.repUser === rep.username);
    const today = new Date();
    const todayOrds = myOrds.filter(o => {
      if (!o.date) return false;
      const d = new Date(o.date);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
    const monthSales = myOrds.filter(o => {
      if (!o.date) return false;
      const d = new Date(o.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    return `
    <div class="rep-track-card">
      <div class="rt-header">
        <div class="rt-av">🤝</div>
        <div style="flex:1">
          <div class="rt-name">${rep.name}</div>
          <div class="rt-status">@${rep.username} · ${rep.phone || '—'}</div>
        </div>
        <span class="badge b-green">🟢 نشط</span>
      </div>
      <div class="rt-stats">
        <div class="rt-stat"><div class="rt-stat-val">${todayOrds.length}</div><div class="rt-stat-lbl">طلبات اليوم</div></div>
        <div class="rt-stat"><div class="rt-stat-val">${(monthSales / 1000).toFixed(0)}K</div><div class="rt-stat-lbl">مبيعات الشهر</div></div>
        <div class="rt-stat"><div class="rt-stat-val">${parseFloat(rep.balance || 0).toLocaleString()}</div><div class="rt-stat-lbl">الرصيد (د.ع)</div></div>
      </div>
    </div>`;
  }).join('') : '<div style="text-align:center;padding:55px;color:rgba(9,50,87,.35)">لا يوجد مندوبون</div>';
}

// ─── Invoices ─────────────────────────────
function renderPurchaseList() {
  const el = document.getElementById('purBody');
  if (!el) return;
  el.innerHTML = [..._purInvoices].reverse().map(inv => `
    <tr>
      <td style="font-weight:700">${inv.id || '—'}</td>
      <td>${inv.date || '—'}</td>
      <td>${inv.supplier || '—'}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(9,50,87,.48)">
        ${(inv.items || []).map(i => `${i.product}×${i.qty}`).join('، ')}
      </td>
      <td style="font-weight:800;color:var(--dark)">${(inv.total || 0).toLocaleString()} د.ع</td>
      <td>${inv.user || '—'}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد فواتير</td></tr>';
}

function renderSalesList() {
  const el = document.getElementById('salBody');
  if (!el) return;
  el.innerHTML = [..._orders].reverse().map((o, i) => `
    <tr>
      <td style="font-weight:700">${o.id || `INV${i + 1}`}</td>
      <td>${o.date || '—'}</td>
      <td style="font-weight:700;color:var(--deep)">${o.shopName || '—'}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(9,50,87,.48)">${o.products || '—'}</td>
      <td style="font-weight:800;color:var(--dark)">${(parseFloat(o.total) || 0).toLocaleString()} د.ع</td>
      <td>${o.repName || '—'}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد فواتير</td></tr>';
}

function switchInvTab(tab, btn) {
  document.querySelectorAll('#invTabs .tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('tabPur').classList.toggle('on', tab === 'pur');
  document.getElementById('tabSal').classList.toggle('on', tab === 'sal');
}

// ─── Reports ──────────────────────────────
function getFilteredOrders() {
  let list = [..._orders];
  const today = new Date();
  if (_repFilter === 'today') {
    list = list.filter(o => {
      const d = new Date(o.date);
      return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
  } else if (_repFilter === 'week') {
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
    list = list.filter(o => new Date(o.date) >= weekAgo);
  } else if (_repFilter === 'month') {
    list = list.filter(o => {
      const d = new Date(o.date);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
  } else if (_repFilter === 'custom' && _repFrom && _repTo) {
    const from = new Date(_repFrom);
    const to = new Date(_repTo);
    to.setHours(23, 59, 59);
    list = list.filter(o => { const d = new Date(o.date); return d >= from && d <= to; });
  }
  return list;
}

function setRepFilter(f, btn) {
  _repFilter = f;
  document.querySelectorAll('#repFilterTabs .tab').forEach(t => t.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const customDates = document.getElementById('repCustomDates');
  if (customDates) customDates.style.display = f === 'custom' ? 'block' : 'none';
  renderReports();
}

function renderReports() {
  const filtered = getFilteredOrders();
  const tot  = filtered.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const comm = filtered.reduce((s, o) => s + (parseFloat(o.commission) || 0), 0);
  const avg  = filtered.length ? Math.round(tot / filtered.length) : 0;
  const outOfStock = _products.filter(p => p.stock === 0).length;

  const kpiEl = document.getElementById('repKpi');
  if (kpiEl) kpiEl.innerHTML = `
    <div class="kpi-card kpi-sky"><div class="kpi-icon">💰</div>
      <div class="kpi-val">${tot >= 1e6 ? (tot / 1e6).toFixed(2) + 'M' : tot.toLocaleString()}</div>
      <div class="kpi-lbl">إجمالي المبيعات (د.ع)</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">مخزون</div>
      <div class="kpi-val">${filtered.length}</div>
      <div class="kpi-lbl">عدد الطلبات</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">رصيد</div>
      <div class="kpi-val">${comm >= 1e6 ? (comm / 1e6).toFixed(2) + 'M' : comm.toLocaleString()}</div>
      <div class="kpi-lbl">إجمالي العمولات</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">📊</div>
      <div class="kpi-val">${avg.toLocaleString()}</div>
      <div class="kpi-lbl">متوسط الطلب</div></div>
    <div class="kpi-card kpi-rose"><div class="kpi-icon">🚫</div>
      <div class="kpi-val">${outOfStock}</div>
      <div class="kpi-lbl">نفاد المخزون</div></div>`;

  // Rep performance table
  const rMap = {};
  filtered.forEach(o => {
    if (!o.repUser) return;
    if (!rMap[o.repUser]) rMap[o.repUser] = { name: o.repName || o.repUser, ord: 0, tot: 0, comm: 0 };
    rMap[o.repUser].ord++;
    rMap[o.repUser].tot  += parseFloat(o.total)      || 0;
    rMap[o.repUser].comm += parseFloat(o.commission) || 0;
  });
  const repBodyEl = document.getElementById('repRepsBody');
  if (repBodyEl) repBodyEl.innerHTML = Object.values(rMap).sort((a, b) => b.tot - a.tot).map(r => `
    <tr>
      <td>${r.name}</td>
      <td>${r.ord}</td>
      <td>${r.tot.toLocaleString()} د.ع</td>
      <td>${r.comm.toLocaleString()} د.ع</td>
      <td>${(r.tot - r.comm).toLocaleString()} د.ع</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center">لا توجد بيانات</td></tr>';

  // Top products
  const prodMap = {};
  filtered.forEach(o => {
    const prods = o.products || '';
    const matches = prods.match(/([^،,\n]+)\((\d+)\)/g) || [];
    matches.forEach(m => {
      const mm = m.match(/(.+)\((\d+)\)/);
      if (!mm) return;
      const name = mm[1].trim();
      const qty  = parseInt(mm[2]) || 1;
      const prod = _products.find(p => p.name === name);
      if (!prodMap[name]) prodMap[name] = { name, qty: 0, rev: 0 };
      prodMap[name].qty += qty;
      prodMap[name].rev += qty * (prod?.price || 0);
    });
  });
  const prodsBodyEl = document.getElementById('repProdsBody');
  if (prodsBodyEl) prodsBodyEl.innerHTML = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 10).map(p => `
    <tr><td>${p.name}</td><td>${p.qty}</td><td>${p.rev.toLocaleString()} د.ع</td></tr>`).join('')
    || '<tr><td colspan="3" style="text-align:center">لا توجد بيانات</td></tr>';
}

// ─── Start ────────────────────────────────
waitForFb().then(pageInit);
