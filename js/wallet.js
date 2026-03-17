// ════════════════════════════════════════
// WALLET.JS — صفحة المحفظة
// ════════════════════════════════════════
let _users = [], _orders = [], _currentThreshold = 100000;

async function pageInit() {
  await waitForFb();
  setFbStatus(true);

  // Check session
  const session = getSession();
  if (!session) {
    hideLoader();
    showLoginBox();
    return;
  }

  try {
    [_users, _orders] = await Promise.all([fbGet('users'), fbGet('orders')]);
    const settings = await fbGet('settings');
    const thr = settings.find(s => s.key === 'pointsThreshold');
    if (thr) _currentThreshold = parseInt(thr.value) || 100000;

    const fresh = _users.find(u => u.username === session.username);
    if (fresh) CU = { ...fresh };

    updateSidebarUser();
    renderWallet();
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
  if (!_users.length) { _users = await fbGet('users'); }
  const found = _users.find(u => u.username.toLowerCase() === un.toLowerCase() && u.password === pw);
  if (!found) { document.getElementById('loginErr').textContent = '❌ بيانات خاطئة'; return; }
  CU = { ...found };
  localStorage.setItem('bjUser', JSON.stringify({ username: CU.username, loginTime: Date.now() }));
  fbUpdate('users', found._id, { lastLogin: new Date().toLocaleDateString('ar-IQ') }).catch(() => {});
  if (!_orders.length) _orders = await fbGet('orders');
  hideLoginBox();
  updateSidebarUser();
  renderWallet();
  toast('✅ مرحباً ' + CU.name);
}

// ─── Wallet Render ────────────────────────
function renderWallet() {
  if (!CU) return;
  const uo = _users.find(u => u.username === CU.username) || CU;
  const bal = parseFloat(uo.balance || 0);

  document.getElementById('walBal').textContent = bal.toLocaleString();

  let sub = '';
  if (CU.type === 'rep') {
    const totComm = _orders.filter(o => o.repUser === CU.username).reduce((s, o) => s + (parseFloat(o.commission) || 0), 0);
    sub = `إجمالي العمولات: ${totComm.toLocaleString()} د.ع`;
  } else if (CU.type === 'market_owner') {
    const myBuys = _orders.filter(o => o.shopName === CU.name);
    sub = `إجمالي مشترياتك: ${myBuys.reduce((s, o) => s + (parseFloat(o.total) || 0), 0).toLocaleString()} د.ع`;
  }
  document.getElementById('walSub').textContent = sub;

  renderWalletKpi(uo);

  const txs = uo.transactions || [];
  document.getElementById('txList').innerHTML = txs.length
    ? [...txs].reverse().map(tx => `
      <div class="tx-row tx-${tx.type}" style="display:flex;align-items:center;gap:11px">
        <div class="tx-ico">${tx.type === 'credit' ? '⬇️' : '⬆️'}</div>
        <div style="flex:1">
          <div class="tx-desc">${tx.desc || 'معاملة'}</div>
          <div class="tx-date">${tsToStr(tx.date)}</div>
        </div>
        <div class="tx-amt">${tx.type === 'credit' ? '+' : '-'}${(parseFloat(tx.amount) || 0).toLocaleString()} د.ع</div>
      </div>`).join('')
    : '<div style="text-align:center;color:rgba(9,50,87,.33);padding:28px">لا توجد معاملات</div>';

  loadPoints(uo);
}

function renderWalletKpi(uo) {
  let html = '';
  if (CU.type === 'rep') {
    const myOrds = _orders.filter(o => o.repUser === CU.username);
    const totComm = myOrds.reduce((s, o) => s + (parseFloat(o.commission) || 0), 0);
    const pts = parseInt(uo.earnedPoints) || 0;
    html = `
      <div class="kpi-card kpi-sky"><div class="kpi-icon">رصيد</div><div class="kpi-val">${totComm.toLocaleString()}</div><div class="kpi-lbl">إجمالي العمولات (د.ع)</div></div>
      <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo.balance || 0).toLocaleString()}</div><div class="kpi-lbl">الرصيد المتاح (د.ع)</div></div>
      <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${pts}</div><div class="kpi-lbl">النقاط المتراكمة</div></div>`;
  } else if (CU.type === 'market_owner') {
    const myBuys = _orders.filter(o => o.shopName === CU.name).reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const pts = parseInt(uo.earnedPoints) || 0;
    html = `
      <div class="kpi-card kpi-sky"><div class="kpi-icon">🛒</div><div class="kpi-val">${myBuys.toLocaleString()}</div><div class="kpi-lbl">إجمالي المشتريات (د.ع)</div></div>
      <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo.balance || 0).toLocaleString()}</div><div class="kpi-lbl">الرصيد المتاح (د.ع)</div></div>
      <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${pts}</div><div class="kpi-lbl">النقاط المتراكمة</div></div>`;
  } else if (CU.type === 'admin' || CU.type === 'sales_manager') {
    const totComm = _orders.reduce((s, o) => s + (parseFloat(o.commission) || 0), 0);
    html = `
      <div class="kpi-card kpi-sky"><div class="kpi-icon">رصيد</div><div class="kpi-val">${totComm.toLocaleString()}</div><div class="kpi-lbl">إجمالي العمولات (د.ع)</div></div>
      <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo.balance || 0).toLocaleString()}</div><div class="kpi-lbl">رصيدك (د.ع)</div></div>`;
  }
  document.getElementById('walKpi').innerHTML = html;
}

async function loadPoints(uo) {
  const totalEarned = parseInt(uo.earnedPoints) || 0;
  const totalOrderAmt = parseFloat(uo.totalOrdersAmount) || 0;
  const allPts = await fbGet('points');
  const myPts = allPts.find(p => p.userId === uo._id || p.username === CU.username);
  const redeemed = parseFloat(myPts?.redeemedPoints) || 0;

  document.getElementById('ptsTotal').textContent = totalEarned.toLocaleString();
  document.getElementById('ptsRedeemed').textContent = redeemed.toLocaleString();

  const progressWrap = document.getElementById('ptsProgressWrap');
  if (CU.type === 'rep' || CU.type === 'market_owner') {
    const spent = totalOrderAmt % _currentThreshold;
    const pct = Math.min(100, (spent / _currentThreshold) * 100);
    const remaining = _currentThreshold - spent;
    document.getElementById('ptsProgFill').style.width = pct + '%';
    document.getElementById('ptsProgText').textContent =
      `${spent.toLocaleString()} / ${_currentThreshold.toLocaleString()} د.ع (متبقي: ${remaining.toLocaleString()} د.ع)`;
    if (progressWrap) progressWrap.style.display = 'block';
  } else {
    if (progressWrap) progressWrap.style.display = 'none';
  }

  if (uo._id) {
    const hist = await fbGetSub('users', uo._id, 'pointsHistory');
    document.getElementById('ptsHistList').innerHTML = hist.length
      ? [...hist].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .map(h => `
          <div class="pts-hist-row">
            <div>
              <span style="font-weight:700;color:var(--deep)">${h.type === 'earn' ? 'اكتساب' : '➖ استرداد'}</span>
              ${h.shopName ? `<div style="font-size:.72rem;color:rgba(9,50,87,.45)">${h.shopName}</div>` : ''}
              <div style="font-size:.68rem;color:rgba(9,50,87,.38)">${tsToStr(h.date || h.createdAt)}</div>
            </div>
            <span style="font-size:1.05rem;font-weight:900;color:${h.type === 'earn' ? 'var(--violet)' : 'var(--gold2)'}">${h.type === 'earn' ? '+' : '-'}${h.points} ⭐</span>
          </div>`).join('')
      : '<div style="text-align:center;color:rgba(9,50,87,.33);padding:22px">لا يوجد سجل نقاط — ستُحتسب عند إتمام الطلبات</div>';
  }
}

function switchWalTab(tab, btn) {
  document.querySelectorAll('#walTabs .tab').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('walTabTxs').classList.toggle('on', tab === 'txs');
  document.getElementById('walTabPts').classList.toggle('on', tab === 'pts');
  if (tab === 'pts' && CU) {
    const uo = _users.find(u => u.username === CU.username) || CU;
    loadPoints(uo);
  }
}

// ─── Start ────────────────────────────────
waitForFb().then(pageInit);
