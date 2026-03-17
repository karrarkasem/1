// ════════════════════════════════════════
// POINTS.JS — صفحة إدارة النقاط (أدمن فقط)
// ════════════════════════════════════════
let _users = [], _currentThreshold = 100000;
let _ptsMgmtModal = null;

async function pageInit() {
  await waitForFb();
  setFbStatus(true);

  const session = getSession();
  if (!session) { hideLoader(); showLoginBox(); return; }

  try {
    _users = await fbGet('users');
    const settings = await fbGet('settings');
    const thr = settings.find(s => s.key === 'pointsThreshold');
    if (thr) _currentThreshold = parseInt(thr.value) || 100000;

    document.getElementById('newThresholdVal').value = _currentThreshold;
    document.getElementById('currentThresholdDisp').textContent = _currentThreshold.toLocaleString() + ' د.ع';

    const fresh = _users.find(u => u.username === session.username);
    if (fresh) CU = { ...fresh };

    if (CU && CU.type !== 'admin' && CU.type !== 'sales_manager') {
      document.getElementById('pageContent').innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="font-size:3rem;margin-bottom:16px">🔒</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--deep)">هذه الصفحة للأدمن فقط</div>
          <div style="font-size:.85rem;color:rgba(9,50,87,.45);margin-top:8px">ليس لديك صلاحية الوصول</div>
          <a href="wallet.html" class="btn btn-sky" style="margin-top:20px;display:inline-flex;text-decoration:none">
            💰 اذهب للمحفظة
          </a>
        </div>`;
      updateSidebarUser();
      hideLoader();
      return;
    }

    updateSidebarUser();
    renderPointsMgmt();
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
  hideLoginBox();
  updateSidebarUser();
  if (CU.type === 'admin' || CU.type === 'sales_manager') {
    renderPointsMgmt();
  } else {
    toast('🔒 هذه الصفحة للأدمن فقط', false);
  }
  toast('✅ مرحباً ' + CU.name);
}

// ─── Points Management ────────────────────
function renderPointsMgmt() {
  if (!CU) return;
  const search = (document.getElementById('ptsMgmtSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('ptsMgmtFilter')?.value || 'all';

  let list = _users.filter(u => u.type === 'rep' || u.type === 'market_owner');
  if (filter !== 'all') list = list.filter(u => u.type === filter);
  if (search) list = list.filter(u =>
    (u.name || '').toLowerCase().includes(search) ||
    (u.username || '').toLowerCase().includes(search)
  );

  const totalPts = list.reduce((s, u) => s + (parseInt(u.earnedPoints) || 0), 0);
  const totalAmt = list.reduce((s, u) => s + (parseFloat(u.totalOrdersAmount) || 0), 0);

  document.getElementById('ptsMgmtKpi').innerHTML = `
    <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${totalPts}</div><div class="kpi-lbl">إجمالي النقاط الموزعة</div></div>
    <div class="kpi-card kpi-sky"><div class="kpi-icon">👥</div><div class="kpi-val">${list.length}</div><div class="kpi-lbl">المستخدمون المؤهلون</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">💰</div><div class="kpi-val">${(totalAmt / 1e6).toFixed(1)}M</div><div class="kpi-lbl">إجمالي المشتريات (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">⚙️</div><div class="kpi-val">${_currentThreshold.toLocaleString()}</div><div class="kpi-lbl">العتبة الحالية (د.ع)</div></div>`;

  if (!list.length) {
    document.getElementById('ptsMgmtList').innerHTML =
      '<div style="text-align:center;padding:45px;color:rgba(9,50,87,.35)">لا يوجد مستخدمون</div>';
    return;
  }

  document.getElementById('ptsMgmtList').innerHTML = list.map(u => {
    const pts = parseInt(u.earnedPoints) || 0;
    const amt = parseFloat(u.totalOrdersAmount) || 0;
    const progress = _currentThreshold > 0 ? Math.min(100, ((amt % _currentThreshold) / _currentThreshold) * 100) : 0;
    const nextIn = _currentThreshold > 0 ? (_currentThreshold - (amt % _currentThreshold)) : 0;
    return `
    <div class="pts-mgmt-card">
      <div class="pts-mgmt-av">${u.type === 'rep' ? '🤝' : '🏪'}</div>
      <div class="pts-mgmt-info">
        <div class="pts-mgmt-name">${u.name}</div>
        <div class="pts-mgmt-meta">
          <span>@${u.username}</span>
          <span>${u.type === 'rep' ? 'مندوب' : 'ماركت'}</span>
          <span>مشتريات: ${amt.toLocaleString()} د.ع</span>
        </div>
        <div style="margin-top:7px">
          <div style="display:flex;justify-content:space-between;font-size:.66rem;color:rgba(9,50,87,.4);margin-bottom:3px">
            <span>التقدم للنقطة القادمة</span>
            <span>متبقي ${nextIn.toLocaleString()} د.ع</span>
          </div>
          <div style="height:5px;background:rgba(139,92,246,.1);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,var(--violet),var(--teal));border-radius:99px;transition:width .6s"></div>
          </div>
        </div>
      </div>
      <div class="pts-mgmt-pts">${pts}<small>نقطة</small></div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="btn btn-sm" style="background:linear-gradient(135deg,var(--violet),var(--violet2));color:white;border:none;font-size:.72rem"
          onclick="openAdjModal('${u.username}','${u.name}',${pts})">تعديل</button>
        <button class="btn btn-danger btn-sm" style="font-size:.72rem"
          onclick="confirmResetPoints('${u.username}','${u.name}')">صفر</button>
      </div>
    </div>`;
  }).join('');
}

async function saveThreshold() {
  const val = parseInt(document.getElementById('newThresholdVal').value) || 0;
  if (val < 1000) { toast('القيمة يجب أن تكون 1,000 على الأقل', false); return; }
  _currentThreshold = val;
  document.getElementById('currentThresholdDisp').textContent = val.toLocaleString() + ' د.ع';
  try {
    const snap = await fbGet('settings');
    const existing = snap.find(x => x.key === 'pointsThreshold');
    if (existing?._id) {
      await fbUpdate('settings', existing._id, { value: val, key: 'pointsThreshold' });
    } else {
      await fbAdd('settings', { key: 'pointsThreshold', value: val });
    }
    toast('تم حفظ العتبة: ' + val.toLocaleString() + ' د.ع');
    renderPointsMgmt();
  } catch(e) { toast('❌ خطأ في الحفظ', false); }
}

function openAdjModal(username, name, pts) {
  document.getElementById('adjUsername').value = username;
  document.getElementById('adjModalTitle').textContent = 'تعديل نقاط: ' + name;
  document.getElementById('adjCurrentPts').textContent = pts;
  document.getElementById('adjAmount').value = '';
  document.getElementById('adjNote').value = '';
  document.getElementById('adjModal').classList.add('open');
}

async function savePointsAdj() {
  const username = document.getElementById('adjUsername').value;
  const amount = parseInt(document.getElementById('adjAmount').value) || 0;
  const note = document.getElementById('adjNote').value.trim();
  const type = document.getElementById('adjType').value;
  if (!amount) { toast('أدخل عدد النقاط', false); return; }

  const u = _users.find(x => x.username === username);
  if (!u?._id) { toast('المستخدم غير موجود', false); return; }

  const current = parseInt(u.earnedPoints) || 0;
  const newPts = type === 'add' ? current + amount : Math.max(0, current - amount);

  await fbUpdate('users', u._id, { earnedPoints: newPts });
  u.earnedPoints = newPts;

  // Log history
  await fbAdd(`users/${u._id}/pointsHistory`, {
    type: type === 'add' ? 'earn' : 'redeem',
    points: amount,
    note: note || `تعديل يدوي بواسطة ${CU.name}`,
    date: new Date().toLocaleDateString('ar-IQ'),
    adminBy: CU.username
  });

  document.getElementById('adjModal').classList.remove('open');
  toast(`تم تعديل نقاط ${u.name}`);
  renderPointsMgmt();
}

async function confirmResetPoints(username, name) {
  if (!confirm(`هل تريد إعادة تصفير نقاط ${name}؟`)) return;
  const u = _users.find(x => x.username === username);
  if (!u?._id) return;
  await fbUpdate('users', u._id, { earnedPoints: 0 });
  u.earnedPoints = 0;
  toast(`تم تصفير نقاط ${name}`);
  renderPointsMgmt();
}

// ─── Start ────────────────────────────────
waitForFb().then(pageInit);
