// ⚙️ أضف معرّفاتك من emailjs.com (مجاني)
const EMAILJS_SERVICE_ID  = 'service_e1sj8tn';
const EMAILJS_TEMPLATE_ID = 'template_2vxg15b';
const EMAILJS_PUBLIC_KEY  = 'vXft7Q_VrPCL4VBQJ';
const ADMIN_EMAILS = [
  'sale.burjuman@gmail.com' 
 
];
// ✅ init
(function(){
  if(typeof emailjs !== 'undefined')
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
})();

// ✅ sendOrderEmail
async function sendOrderEmail({shop, addr, note, prodList, total, commission, commPct, orderId, nowStr, selLoc}) {
  try {
    if(typeof emailjs === 'undefined') return;
    const repName = CU?.name || 'زائر';
    for(const email of ADMIN_EMAILS) {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        // ... باقي الكود بدون تغيير
    to_email: email,
    subject: `🛍️ طلب جديد — ${shop} — ${total.toLocaleString()} د.ع`,
    order_id: orderId,
    order_date: nowStr,
    rep_name: repName,
    shop_name: shop,
    shop_addr: addr,
    shop_note: note || '—',
    location: selLoc || '—',
    products: prodList.join('\n'),
    total: total.toLocaleString() + ' د.ع',
    commission: commission.toLocaleString() + ' د.ع (' + commPct + '%)',
    net: (total - commission).toLocaleString() + ' د.ع',
  });
  
}
  } catch(e) {
    console.error('Error sending email:', e);
}
}


// ═══════════════════════════════════════════════════════
// PREPARER SETTINGS
// ═══════════════════════════════════════════════════════
let preparerWhatsApp = '';
let preparerTelegram = '';

async function loadPreparerSettings() {
  try {
    const snap = await fb().getDocs(fb().collection(db(), 'settings'));
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.key === 'preparer_whatsapp') preparerWhatsApp = data.value;
      if (data.key === 'preparer_telegram') preparerTelegram = data.value;
    });
  } catch (e) {
    console.error('loadPreparerSettings:', e);
  }
}

// ═══════════════════════════════════════════════════════
// COMPANY SETTINGS — تحميل إعدادات الشركة من Firestore
// ═══════════════════════════════════════════════════════
window.COMPANY = {};
async function loadCompanySettings() {
  try {
    const snap = await fb().getDocs(fb().collection(db(), 'settings'));
    const s = {};
    snap.docs.forEach(d => { const data = d.data(); if (data.key) s[data.key] = data.value; });
    window.COMPANY = s;

    const nameAr = s.company_name_ar;
    const nameEn = s.company_name_en;
    const logo   = s.company_logo;

    // تحديث الشريط الجانبي
    if (nameAr) {
      document.querySelectorAll('.sb-logo-text h2').forEach(el => el.textContent = nameAr);
      document.querySelectorAll('.login-hd h2').forEach(el => el.textContent = nameAr);
      document.querySelectorAll('.loading-txt').forEach(el => el.textContent = nameAr);
      // تحديث شاشة اختيار الوضع
      const btTxt = document.getElementById('btBrandName');
      if (btTxt) btTxt.textContent = nameAr;
    }
    if (nameEn) {
      document.querySelectorAll('.sb-logo-text span').forEach(el => el.textContent = nameEn);
      document.querySelectorAll('.ls-brand-en').forEach(el => el.textContent = nameEn);
    }
    if (nameAr) {
      document.title = nameAr + ' — نظام إدارة متكامل';
    }
    if (logo) {
      // استبدال الإيموجي بصورة الشعار
      document.querySelectorAll('.sb-logo-gem').forEach(el => {
        el.innerHTML = `<img src="${logo}" style="width:36px;height:36px;object-fit:cover;border-radius:8px">`;
      });
      document.querySelectorAll('.login-logo').forEach(el => {
        el.innerHTML = `<img src="${logo}" style="width:64px;height:64px;object-fit:cover;border-radius:14px">`;
      });
      // تحديث لوغو شاشة الاختيار
      const btGem = document.querySelector('.bt-logo-gem');
      if (btGem) btGem.innerHTML = `<img src="${logo}" style="width:50px;height:50px;object-fit:cover;border-radius:14px">`;
    }
    // ─── تطبيق الثيم المحفوظ من setup ───
    if (s.theme_color && typeof applyTheme === 'function') applyTheme(s.theme_color);
    if (s.theme_mode  && typeof applyMode  === 'function') applyMode(s.theme_mode);
  } catch (e) {
    console.error('loadCompanySettings:', e);
  }
}

async function createPreparerNotification(orderData, totalVolume) {
  try {
    const q = fb().query(fb().collection(db(), 'users'), fb().where('type', '==', 'preparer'));
    const snap = await fb().getDocs(q);
    const promises = snap.docs.map(d => {
      const preparer = d.data();
      return fbAdd('notifications', {
        title: '📦 طلب جديد للتجهيز',
        body: `${orderData.shopName} - ${(orderData.total||0).toLocaleString()} د.ع - حجم: ${(totalVolume||0).toFixed(3)} م³`,
        type: 'preparer',
        read: false,
        targetUser: preparer.username || preparer.uid || '',
        orderId: orderData.orderId || '',
        date: new Date().toLocaleDateString('ar-IQ'),
        timestamp: new Date().toISOString()
      });
    });
    await Promise.all(promises);
  } catch (e) {
    console.error('createPreparerNotification:', e);
  }
}

// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════
const WA  = '9647742222194';
const HQ  = [32.57664096812528, 44.05991539922393];
const IMGBB_API_KEY = 'a2173ed14e8a5d9288b6dbb4a56c8c78'; // ← أضف مفتاحك هنا


// ✅ POINTS: 1 point per 100,000 IQD
const POINTS_THRESHOLD = 100000;

const PERMS = {
  admin:         { order:1, manage:1, dash:1, users:1, wallet:1, inv:1, inv_write:1, offers:1, tracking:1, reports:1, notif:1, delivery_cfg:1 },
  sales_manager: { order:1, manage:1, dash:1, users:0, wallet:1, inv:1, inv_write:1, offers:1, tracking:1, reports:1, notif:1, delivery_cfg:1 },
  rep:           { order:1, manage:0, dash:1, users:0, wallet:1, inv:0, inv_write:0, offers:1, tracking:0, reports:0, notif:1, delivery_cfg:0 },
  market_owner:  { order:1, manage:0, dash:1, users:0, wallet:1, inv:0, inv_write:0, offers:1, tracking:0, reports:0, notif:1, delivery_cfg:0 },
  guest:         { order:0, manage:0, dash:0, users:0, wallet:0, inv:0, inv_write:0, offers:1, tracking:0, reports:0, notif:0, delivery_cfg:0 }
};
const ROLES = { admin:'🛡️ أدمن', sales_manager:'📊 مشرف', rep:'🤝 مندوب', market_owner:'🏪 صاحب ماركت', guest:'🌐 زائر' };

// ═══ UTILS ════════════════════════════════════════════
function debounce(fn, ms=300){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
const _debouncedSearch    = debounce(q=>doSearch(q),250);
const _debouncedOrdFilter = debounce(()=>renderOrders(),250);
const _debouncedContacts  = debounce(()=>renderContacts(),250);

// ═══ STATE ═══════════════════════════════════════════
let users=[], products=[], orders=[], purInvoices=[], discounts=[], offers=[], notifications=[];
let cart={}, selLoc='', curProd=null, pmQtyVal=1, _pmUnitPrice=0, _pmPiecesPerUnit=1, pmUnitLbl='قطعة';
let leafMap=null, purItems=[];
let CU=null;
let fbReady=false;
let buyerMode = localStorage.getItem('bj_buyer_mode') || null; // 'retail' | 'wholesale' | null
let _uploadedImgUrl = '';
let _sendingOrder = false;
// Banner state
let bannerSlide=0, bannerTimer=null;
// Import state
let importData=[];

// ═══════════════════════════════════════════════════════
// FIREBASE HELPERS
// ═══════════════════════════════════════════════════════
function db()  { return window._db; }
function fb()  { return window._fb; }

function tsToStr(ts) {
  if (!ts) return '—';
  if (typeof ts === 'string') return ts;
  if (ts && typeof ts === 'object' && ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString('ar-IQ');
  }
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleDateString('ar-IQ');
  }
  return String(ts);
}

function parseProducts(prods) {
  if (!prods) return '—';
  if (typeof prods === 'string') return prods;
  if (Array.isArray(prods)) {
    return prods.map(p => {
      if (typeof p === 'string') return p;
      if (p && p.name) return `${p.name}×${p.qty||1}`;
      return '—';
    }).join('، ');
  }
  if (typeof prods === 'object') return JSON.stringify(prods);
  return String(prods);
}

async function fbGet(colName) {
  if (!fbReady) return [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), colName));
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) { console.warn('fbGet', colName, e); return []; }
}

async function fbAdd(colName, data) {
  if (!fbReady) return null;
  try {
    const ref = await fb().addDoc(fb().collection(db(), colName), {
      ...data, createdAt: fb().serverTimestamp()
    });
    return ref.id;
  } catch(e) { console.warn('fbAdd', e); return null; }
}

async function fbUpdate(colName, docId, data) {
  if (!fbReady) return;
  try {
    await fb().updateDoc(fb().doc(db(), colName, docId), {
      ...data, updatedAt: fb().serverTimestamp()
    });
  } catch(e) { console.warn('fbUpdate', e); }
}

async function fbDel(colName, docId) {
  if (!fbReady) return;
  try { await fb().deleteDoc(fb().doc(db(), colName, docId)); } catch(e) {}
}

async function fbAddSub(colName, docId, subCol, data) {
  if (!fbReady) return null;
  try {
    const ref = await fb().addDoc(
      fb().collection(db(), colName, docId, subCol),
      { ...data, createdAt: fb().serverTimestamp() }
    );
    return ref.id;
  } catch(e) { return null; }
}

async function fbGetSub(colName, docId, subCol) {
  if (!fbReady) return [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), colName, docId, subCol));
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) { return []; }
}

function setFbStatus(ok, txt) {
  document.getElementById('fbDot').className = 'fb-dot ' + (ok ? 'ok' : 'err');
  document.getElementById('fbStatusTxt').textContent = txt;
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
async function init() {
  document.getElementById('pur_date').value = new Date().toISOString().split('T')[0];
  // FIX 3: منع double-tap zoom على الموبايل
  document.addEventListener('dblclick', e => e.preventDefault(), {passive:false});
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') {
      document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));
      closeSidebar();
    }
    if (e.key==='Enter' && document.getElementById('loginOverlay').style.display==='flex') doLogin();
  });

  if (window._fbReady) {
    fbReady = true;
  } else {
    // Race: either Firebase loads, or 10-second timeout
    await Promise.race([
      new Promise(res => document.addEventListener('fbReady', res, {once:true})),
      new Promise(res => setTimeout(res, 10000))
    ]);
    if (window._fbReady) {
      fbReady = true;
    } else {
      // Firebase didn't load — continue with empty data
      document.getElementById('loadSub').textContent = '⚠️ تعذر الاتصال، يتم المتابعة...';
      await new Promise(res => setTimeout(res, 1200));
    }
  }
  setFbStatus(true, 'متصل');
  document.getElementById('loadSub').textContent = 'جاري تحميل البيانات...';

  try {
    await Promise.all([loadUsers(), loadProducts(), loadOrders(), loadOffers(), loadNotifications(), loadPreparerSettings(), loadCompanySettings()]);
    await loadThreshold();
  } catch(e) { console.warn('data load error:', e); }
  try {
    const saved = localStorage.getItem('bjUser');
    if (saved) {
      const parsed = JSON.parse(saved);
      const SESSION_12H = 12 * 60 * 60 * 1000;
      if (!parsed.loginTime || (Date.now() - parsed.loginTime) > SESSION_12H) {
        localStorage.removeItem('bjUser'); // expired or old format
      } else {
        const fresh = users.find(u => u.username === parsed.username);
        if (fresh) CU = { ...fresh };
      }
    }
  } catch(e) {}

  setTimeout(() => {
    const ls = document.getElementById('loadScreen');
    ls.style.opacity = '0';
    setTimeout(() => {
      ls.style.display = 'none';
      if (!buyerMode) showBuyerTypeScreen();
      else updateModeBadge();
    }, 400);
  }, 900);

  try { buildUI(); } catch(e) { console.error('buildUI error:', e); }
  try { startRealtimeListeners(); } catch(e) { console.error('listeners error:', e); }
  try { setupImportDragDrop(); } catch(e) {}

}

// ═══════════════════════════════════════════════════════
// REALTIME LISTENERS
// ═══════════════════════════════════════════════════════
let _ordersRenderTimer=null, _productsRenderTimer=null;
function startRealtimeListeners() {
  if (!fbReady) return;
  fb().onSnapshot(fb().collection(db(), 'orders'), snap => {
    orders = snap.docs.map(d => parseOrder({_id:d.id,...d.data()}));
    clearTimeout(_ordersRenderTimer);
    _ordersRenderTimer = setTimeout(() => {
      buildDashboard(); renderOrders(); renderSalesList(); renderReports();
    }, 120);
  });
  fb().onSnapshot(fb().collection(db(), 'products'), snap => {
    const updated = snap.docs.map(d=>({_id:d.id,...d.data()}));
    if (updated.length) {
      products = updated.map((p,i)=>({
        idx:i, _id:p._id,
        name:p.name||'', cat:p.category||'عام',
        price:parseFloat(p.price)||0,
        wholesalePrice:parseFloat(p.wholesalePrice)||0,
        retailUnit:p.retailUnit||'قطعة',
        img:fixDrive(p.image||''),
        stock:p.stock===undefined?999:parseInt(p.stock)||0,
        minStock:parseInt(p.minStock)||10,
        status:p.status||'active', detail:p.detail||'',
        packaging:p.packaging||{}, packagingFractions:p.packagingFractions||{},
        carton_l:parseFloat(p.carton_l)||0, carton_w:parseFloat(p.carton_w)||0,
        carton_h:parseFloat(p.carton_h)||0, carton_volume:parseFloat(p.carton_volume)||0,
        carton_weight:parseFloat(p.carton_weight)||0
      })).filter(p=>p.name&&p.price>0);
      clearTimeout(_productsRenderTimer);
      _productsRenderTimer = setTimeout(() => {
        renderStore('الكل'); renderCats(); renderInventory(); renderManageProds();
      }, 120);
    }
  });
  fb().onSnapshot(fb().collection(db(), 'notifications'), snap => {
  const prevUnreadIds = new Set(
    notifications.filter(n=>!n.read&&(n.target==='all'||n.target===CU?.username||n.target===CU?.type)).map(n=>n._id)
  );

  const fromServer = snap.docs.map(d => {
    const data = d.data();
    const rawTs = data.date || data.createdAt;
    const ts = rawTs?.toMillis ? rawTs.toMillis() : (rawTs?.seconds ? rawTs.seconds*1000 : 0);
    return {
      _id:    d.id,
      _ts:    ts,
      title:  data.title  || '',
      body:   data.body   || data.message || '',
      type:   data.type   || 'info',
      read:   data.read   || false,
      date:   tsToStr(rawTs),
      target: data.targetUser || 'all'
    };
  });

  const serverIds = new Set(fromServer.map(n=>n._id));
  const localOnly = notifications.filter(n=>!serverIds.has(n._id));
  notifications = [...fromServer, ...localOnly].sort((a,b)=>(b._ts||0)-(a._ts||0));

  // صوت للإشعارات الجديدة
  const newUnread = fromServer.filter(n =>
    !n.read && !prevUnreadIds.has(n._id) &&
    (n.target==='all' || n.target===CU?.username || n.target===CU?.type)
  );
  if (newUnread.length > 0) playNotifSound();

  renderNotifBadge();
  renderNotifications();
});
  fb().onSnapshot(fb().collection(db(), 'offers'), snap => {
    offers = snap.docs.map(d=>({_id:d.id, ...d.data()}));
    renderOffersBanner();
    renderOffers();
  });
}

function parseOrder(o) {
  // ✅ FIX: حفظ التاريخ حتى لو فارغ — لا نحذف الطلبات بسبب التاريخ
  const rawDate = o.date || o.createdAt;
  const dateStr = rawDate ? tsToStr(rawDate) : new Date().toLocaleDateString('ar-IQ');
  return {
    _id:        o._id,
    id:         o.orderId || o._id || '',
    date:       dateStr,
    repUser:    o.repUsername || o.repUser || '',
    repName:    o.repName || '—',
    commPct:    parseFloat(o.commPct) || 0,
    shopName:   o.shopName || '',
    shopAddr:   o.shopAddress || o.shopAddr || '',
    note:       o.note || '',
    location:   o.location || '',
    products:          parseProducts(o.products || o.cartItems),
    cartItemsArray:    o.cartItemsArray || null,
    total:             parseFloat(o.total) || 0,
    commission:        parseFloat(o.commission) || 0,
    net:               parseFloat(o.net) || 0,
    status:            o.status || '',
    orderId:           o.orderId || o._id || '',
    visitorPhone:      o.visitorPhone || '',
  };
}

// ═══════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════
async function loadUsers() {
  const raw = await fbGet('users');
  users = raw.map(u => ({
    _id:      u._id,
    name:     u.name||'',
    username: u.username||'',
    password: u.password||'',
    type:     u.accountType||u.type||'rep',
    phone:    u.phone||'',
    commPct:  parseFloat(u.commPct)||0,
    status:   u.status||'active',
    balance:  parseFloat(u.balance)||0,
    totalBuys:parseFloat(u.totalBuys)||0,
    // ✅ Points-related fields
    totalOrdersAmount: parseFloat(u.totalOrdersAmount)||0,
    earnedPoints: parseInt(u.earnedPoints)||0,
    transactions: u.transactions||[]
  })).filter(u=>u.username);
}

async function loadProducts() {
  const raw = await fbGet('products');
  products = raw.map((p,i) => ({
    idx: i, _id: p._id,
    name:           p.name||'',
    cat:            p.category||'عام',
    price:          parseFloat(p.price)||0,
    wholesalePrice: parseFloat(p.wholesalePrice)||0,
    retailUnit:     p.retailUnit||'قطعة',
    img:            fixDrive(p.image||''),
    stock:    p.stock===undefined ? 999 : parseInt(p.stock)||0,
    minStock: parseInt(p.minStock)||10,
    status:   p.status||'active',
    detail:   p.detail||'',
    packaging: p.packaging || {},
    packagingFractions: p.packagingFractions || {},
    carton_l:      parseFloat(p.carton_l)||0,
    carton_w:      parseFloat(p.carton_w)||0,
    carton_h:      parseFloat(p.carton_h)||0,
    carton_volume: parseFloat(p.carton_volume)||0,
    carton_weight: parseFloat(p.carton_weight)||0
  })).filter(p=>p.name&&p.price>0);
  renderStore('الكل'); renderCats();
}

async function loadOrders() {
  const raw = await fbGet('orders');
  // ✅ FIX: إزالة filter بالتاريخ — نحتفظ بكل الطلبات
  orders = raw.map(o => parseOrder(o));
}

async function loadOffers() {
  const raw = await fbGet('offers');
  offers = raw.map(o => ({
    _id:o._id, title:o.title||'', desc:o.description||'',
    type:o.discountType||'percent', value:parseFloat(o.value)||0,
    from:o.startDate||'', to:o.endDate||'', status:o.status||'active'
  }));
  renderOffers();
}

async function loadNotifications() {
  const raw = await fbGet('notifications');
  notifications = raw.map(n => ({
    _id:n._id, title:n.title||'', body:n.body||n.message||'',
    type:n.type||'info', read:n.read||false,
    date:tsToStr(n.date || n.createdAt), target:n.targetUser||'all'
  }));
  renderNotifBadge();
}

// ═══════════════════════════════════════════════════════
// BUILD UI
// ═══════════════════════════════════════════════════════
function buildUI() {
  buildSidebar(); buildDashboard(); renderInventory();
  renderManageProds(); renderUsersList(); renderPurchaseList();
  renderSalesList(); renderOrders(); renderReports();
  buildWalletPage(); updateTopLoginBtn(); renderOffers();
  renderRepTracking(); renderNotifications(); renderOffersBanner();
  renderStore('الكل'); renderCats();
  if (buyerMode) updateModeBadge();
}

function buildSidebar() {
  const p = PERMS[CU?.type||'guest'];
  const sbAv = document.getElementById('sbAv');
  if (CU?.photoURL) {
    sbAv.innerHTML = `<img src="${CU.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    sbAv.textContent = CU ? (ROLES[CU.type]?.charAt(0)||'👤') : '🌐';
  }
  document.getElementById('sbName').textContent  = CU?.name||'زائر';
  document.getElementById('sbRole').textContent  = CU ? ROLES[CU.type] : 'تصفح حر';
  document.getElementById('sbOnline').style.display = CU ? 'flex':'none';
  document.getElementById('sbWalletBar').style.display = (CU&&p.wallet)?'block':'none';
  updateWalletBar();

  const nav=[
    {id:'pageStore',       icon:'🛍️', lbl:'المتجر',             always:true},
    {id:'pageDashboard',   icon:'🏠',  lbl:'الإحصائيات',        perm:'dash'},
    {id:'pageOrders',      icon:'📦',  lbl:'الطلبات',            perm:'order', pendingApproval:true},
    {id:'pageWallet',      icon:'💰',  lbl:'المحفظة',            perm:'wallet'},
    {id:'pageInventory',   icon:'📊',  lbl:'المخزون',            perm:'inv', section:'الإدارة'},
    {id:'pageInvoices',    icon:'🧾',  lbl:'الفواتير',           perm:'inv'},
    {id:'pageManage',      icon:'🛒',  lbl:'إدارة المنتجات',     perm:'manage'},
    {id:'pageUsers',       icon:'👥',  lbl:'المستخدمون',         perm:'users'},
    {id:'pageOffers',      icon:'🎁',  lbl:'العروض',             always:true},
    {id:'pageRepTracking', icon:'📍',  lbl:'تتبع المندوبين',     perm:'tracking'},
    {id:'pageNotifications',icon:'🔔', lbl:'الإشعارات',          perm:'notif', badge:true},
    {id:'pageReports',     icon:'📈',  lbl:'التقارير',           perm:'reports'},
    {id:'pagePointsMgmt', icon:'⭐', lbl:'إدارة النقاط', perm:'users'},
    {id:'pageMarketing', icon:'📣', lbl:'التسويق', perm:'manage'},
    {id:'pageDeliverySettings', icon:'🚚', lbl:'إعدادات التوصيل', perm:'delivery_cfg'},
  ];

  let html='',lastSec='';
  nav.forEach(n=>{
    if(!n.always&&!p[n.perm]) return;
    if(n.section&&n.section!==lastSec){html+=`<div class="sb-section">${n.section}</div>`;lastSec=n.section;}
    const unread = n.badge ? notifications.filter(x=>!x.read&&(x.target==='all'||x.target===CU?.username)).length : 0;
    const pendingCnt = (n.pendingApproval && (CU?.type==='admin'||CU?.type==='sales_manager'))
      ? orders.filter(o=>(o.status||'')==='pending_approval').length : 0;
    const badgeVal = unread || pendingCnt;
    html+=`<div class="nav-item" id="nav_${n.id}" onclick="showPage('${n.id}')">
      <span class="nav-icon">${n.icon}</span>${n.lbl}
      ${badgeVal>0?`<span class="nav-badge" style="${pendingCnt>0?'background:#f59e0b':''}">${badgeVal}</span>`:''}
    </div>`;
  });
  // رابط إعداد النظام للأدمن فقط
  if (CU?.type === 'admin' || CU?.role === 'admin') {
    html += `<a href="setup.html" class="nav-item" style="text-decoration:none;color:inherit">
      <span class="nav-icon">🏗️</span>إعداد النظام
    </a>`;
  }
  document.getElementById('sbNav').innerHTML=html;
  // تهيئة منتقي الثيم (يتم إضافته مرة واحدة فقط)
  if (typeof initThemePicker === 'function') {
    setTimeout(initThemePicker, 0);
  }
  document.getElementById('sbLoginLogout').innerHTML=CU
    ?`<div class="nav-item" onclick="openAccountSettings()"><span class="nav-icon">⚙️</span>إعدادات الحساب</div>
      <div class="nav-item red" onclick="doLogout()"><span class="nav-icon">↩</span>تسجيل الخروج</div>`
    :`<div class="nav-item" onclick="showLogin()"><span class="nav-icon">👤</span>دخول / تسجيل</div>`;

  const inv = CU&&(p.inv_write);
  document.getElementById('addPurBtn').style.display=inv?'inline-flex':'none';
  document.getElementById('newPurBtn').style.display=inv?'inline-flex':'none';
  document.getElementById('addDiscWrap').style.display=(CU&&(CU.type==='admin'||CU.type==='sales_manager'))?'flex':'none';

  const addOfferWrap = document.getElementById('addOfferWrap');
  if(addOfferWrap) addOfferWrap.style.display=(CU&&(CU.type==='admin'||CU.type==='sales_manager'))?'flex':'none';
  const bulkBtn = document.getElementById('bulkImportBtn');
  if(bulkBtn) bulkBtn.style.display=(CU&&(CU.type==='admin'||CU.type==='sales_manager'))?'inline-flex':'none';

  setActive('pageStore');
}

function updateWalletBar() {
  if(!CU) return;
  const u=users.find(x=>x.username===CU.username);
  const bal=parseFloat(u?.balance||CU.balance||0);
  document.getElementById('sbWalletAmt').textContent=bal.toLocaleString()+' د.ع';
}

function updateTopLoginBtn() {
  const btn=document.getElementById('topLoginBtn');
  if(CU){
    btn.innerHTML=`<span>${CU.name.split(' ')[0]}</span>`;
    btn.onclick=()=>showPage('pageDashboard');
  } else {
    btn.innerHTML=`<span>دخول</span>`;
    btn.onclick=showLogin;
  }
}

function setActive(id) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('nav_'+id)?.classList.add('active');
}

function showPage(id) {
  // ═══ حماية الصفحات — تحقق من الصلاحيات قبل أي شيء ═══
  const p = PERMS[CU?.type||'guest'];
  const pageGuards = {
    'pageOrders':       'order',
    'pageDashboard':    'dash',
    'pageWallet':       'wallet',
    'pageInventory':    'inv',
    'pageInvoices':     'inv',
    'pageManage':       'manage',
    'pageUsers':        'users',
    'pageRepTracking':  'tracking',
    'pageNotifications':'notif',
    'pageReports':      'reports',
    'pageMarketing':        'manage',
    'pageDeliverySettings': 'delivery_cfg',
  };
  // العروض مفتوحة للجميع (pageOffers و pageStore بدون guard)
  if(pageGuards[id] && !p[pageGuards[id]]) {
    toast('🔒 يجب تسجيل الدخول للوصول لهذه الصفحة', false);
    showLogin();
    return;
  }
  if(id==='pagePointsMgmt') renderPointsMgmt();

  document.querySelectorAll('.page').forEach(pg=>pg.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  setActive(id);
  const nav=document.getElementById('nav_'+id);
  if(nav) document.getElementById('topbarTitle').innerHTML=nav.innerHTML.replace(/<span[^>]*>.*?<\/span>/g,'').trim();
  document.getElementById('topSearch').style.display  =id==='pageStore'?'flex':'none';
  document.getElementById('cartTopBtn').style.display =id==='pageStore'?'flex':'none';
  closeSidebar();
  if(id==='pageDashboard')    buildDashboard();
  if(id==='pageWallet')       buildWalletPage();
  if(id==='pageReports')      renderReports();
  if(id==='pageRepTracking')  renderRepTracking();
  if(id==='pageNotifications')renderNotifications();
  if(id==='pageOffers')       renderOffers();
  if(id==='pageMarketing')    { renderMarketingKpi(); renderContacts(); renderVisitors(); buildMktTemplates(); updateMktAudience(); renderCampaignHistory(); }
  window.scrollTo({top:0, behavior:'smooth'});
}

// ✅ FIX: Sidebar toggle — no partial visibility
function toggleSidebar() {
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sidebarOverlay');
  const isOpen = sb.classList.contains('open');
  if(isOpen) {
    closeSidebar();
  } else {
    sb.classList.add('open');
    ov.classList.add('show');
    document.body.classList.add('sidebar-open');
  }
}

function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  document.body.classList.remove('sidebar-open');
}

// ═══════════════════════════════════════════════════════
// ACCOUNT SETTINGS — تغيير كلمة المرور + الصورة الشخصية
// ═══════════════════════════════════════════════════════
function openAccountSettings() {
  if (!CU) return;
  // عرض الصورة الحالية
  const inner = document.getElementById('acAvatarInner');
  if (CU.photoURL) {
    inner.outerHTML = `<img id="acAvatarInner" src="${CU.photoURL}" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    inner.outerHTML = `<span id="acAvatarInner" style="font-size:2rem">${ROLES[CU.type]?.charAt(0)||'👤'}</span>`;
  }
  // مسح حقول كلمة المرور
  ['cp_current','cp_new','cp_confirm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cp_err').textContent = '';
  document.getElementById('acUploadWrap').style.display = 'none';
  document.getElementById('avatarFileInput').value = '';
  // تحميل معرف تيليجرام
  const tgEl = document.getElementById('tg_id');
  if (tgEl) tgEl.value = CU?.telegram || '';
  openModal('accountModal');
  closeSidebar();
}

function handleAvatarSelect(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 2 * 1024 * 1024) { toast('❌ الصورة أكبر من 2MB', false); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const av = document.getElementById('acAvatar');
    av.innerHTML = `<img id="acAvatarInner" src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    document.getElementById('acUploadWrap').style.display = 'flex';
    document.getElementById('acUploadWrap').style.gap = '8px';
    document.getElementById('acUploadWrap').style.justifyContent = 'center';
  };
  reader.readAsDataURL(file);
}

async function doUploadAvatar() {
  if (!CU?._id) return;
  const file = document.getElementById('avatarFileInput').files[0];
  if (!file) return;
  const btn = document.getElementById('acUploadBtn');
  btn.textContent = '⏳ جاري الرفع...';
  btn.disabled = true;
  try {
    const path = `avatars/${CU._id}`;
    const storageReference = fb().storageRef(window._storage, path);
    await fb().uploadBytes(storageReference, file);
    const url = await fb().getDownloadURL(storageReference);
    await fbUpdate('users', CU._id, { photoURL: url });
    CU.photoURL = url;
    // تحديث الصورة في users array
    const idx = users.findIndex(u => u._id === CU._id);
    if (idx !== -1) users[idx].photoURL = url;
    buildSidebar();
    document.getElementById('acUploadWrap').style.display = 'none';
    toast('تم رفع الصورة بنجاح');
  } catch (e) {
    console.error('doUploadAvatar:', e);
    toast('❌ فشل رفع الصورة', false);
  } finally {
    btn.textContent = '⬆️ رفع الصورة';
    btn.disabled = false;
  }
}

async function doChangePassword() {
  const cur = document.getElementById('cp_current').value.trim();
  const nw  = document.getElementById('cp_new').value.trim();
  const con = document.getElementById('cp_confirm').value.trim();
  const err = document.getElementById('cp_err');
  err.textContent = '';

  if (!cur || !nw || !con) { err.textContent = 'يرجى ملء جميع الحقول'; return; }
  if (cur !== CU.password)  { err.textContent = '❌ كلمة المرور الحالية غير صحيحة'; return; }
  if (nw.length < 6)        { err.textContent = '❌ كلمة المرور الجديدة قصيرة جداً (٦ أحرف على الأقل)'; return; }
  if (nw !== con)           { err.textContent = '❌ كلمة المرور الجديدة وتأكيدها غير متطابقتين'; return; }
  if (nw === cur)           { err.textContent = '❌ كلمة المرور الجديدة مطابقة للحالية'; return; }

  await fbUpdate('users', CU._id, { password: nw });
  CU.password = nw;
  const idx = users.findIndex(u => u._id === CU._id);
  if (idx !== -1) users[idx].password = nw;
  try { const s = JSON.parse(localStorage.getItem('bjUser')||'{}'); if(s.username) localStorage.setItem('bjUser', JSON.stringify({username: CU.username, loginTime: s.loginTime || Date.now()})); } catch(e){}
  ['cp_current','cp_new','cp_confirm'].forEach(id => document.getElementById(id).value = '');
  closeModal('accountModal');
  toast('تم تغيير كلمة المرور بنجاح');
}

// ═══════════════════════════════════════════════════════
// LOGIN / LOGOUT
// ═══════════════════════════════════════════════════════
function showLogin(){document.getElementById('loginOverlay').style.display='flex';setTimeout(()=>document.getElementById('lUser').focus(),100);}
function hideLogin(){document.getElementById('loginOverlay').style.display='none';}

async function doLogin() {
  const un=document.getElementById('lUser').value.trim();
  const pw=document.getElementById('lPass').value.trim();
  document.getElementById('loginErr').textContent='';
  if(fbReady) await loadUsers();
  const found=users.find(u=>u.username.toLowerCase()===un.toLowerCase()&&u.password===pw);
  if(!found){document.getElementById('loginErr').textContent='❌ بيانات دخول خاطئة';return;}
  CU={...found};
  localStorage.setItem('bjUser', JSON.stringify({username: CU.username, loginTime: Date.now()}));
  if(found._id) fbUpdate('users',found._id,{lastLogin:new Date().toLocaleDateString('ar-IQ')}).catch(()=>{});
  hideLogin(); buildUI();
  const _loginTarget=(CU.type==='preparer')?'pagePrep':(CU.type==='driver')?'pageDriver':'pageDashboard';
showPage(_loginTarget); toast('✅ مرحباً '+CU.name);
}

function doLogout(){
  localStorage.removeItem('bjUser');CU=null;cart={};updateCartUI();buildUI();showPage('pageStore');toast('👋 تم تسجيل الخروج');
}

// ═══════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════
function renderCats(){
  const cats=['الكل',...new Set(products.filter(p=>p.status==='active').map(p=>p.cat))];
  document.getElementById('catsRow').innerHTML=cats.map((c,i)=>
    `<button class="cat-chip ${i===0?'on':''}" onclick="renderStore('${esc(c)}',this)">${c}</button>`
  ).join('');
}

function renderStore(filter='الكل',btn=null){
  if(btn){document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('on'));btn.classList.add('on');}
  // إخفاء banner الزائر إذا كان مسجلاً
  document.getElementById('guestBannerWrap').innerHTML = (!CU) ? `
    <div class="guest-banner">
      <div class="gb-text"><p>🌐 أنت تتصفح كزائر</p><span>يمكنك التصفح — سجّل دخول للاستفادة الكاملة</span></div>
      <button class="btn btn-sky btn-sm" onclick="showLogin()">دخول</button>
    </div>` : '';

  const active=products.filter(p=>p.status==='active');
  const shown=filter==='الكل'?active:active.filter(p=>p.cat===filter);
  const isWholesale = buyerMode === 'wholesale';
  document.getElementById('prodGrid').innerHTML=shown.length?shown.map((p,i)=>{
    const q=cart[p.name]?.qty||0;
    const isOut=p.stock===0;
    const isLow=!isOut&&p.stock<p.minStock;
    // -- السعر بحسب الوضع --
    const dispPrice = isWholesale ? p.wholesalePrice : p.price;
    const activePrice = isWholesale ? (p.wholesalePrice||p.price) : p.price;
    const pkgKeys = p.packaging ? Object.keys(p.packaging) : [];
    const pkgLabel = pkgKeys.length ? pkgKeys[0] : '';
    let priceHtml;
    if (isWholesale) {
      if (p.wholesalePrice > 0) {
        priceHtml = `<div class="prod-price prod-price-wholesale">${p.wholesalePrice.toLocaleString()} <span style="font-size:.68rem;font-weight:600">د.ع${pkgLabel?' / '+pkgLabel:' / كرتون'}</span></div>`;
        if (pkgLabel && p.packaging[pkgLabel]) {
          priceHtml += `<div class="ws-carton-badge">📦 ${p.packaging[pkgLabel]} قطعة/كرتون</div>`;
        }
      } else {
        priceHtml = `<div class="prod-price-no-ws">اطلب تسعير</div>`;
      }
    } else {
      const rUnitLabel = p.retailUnit || 'قطعة';
      priceHtml = `<div class="prod-price">${p.price.toLocaleString()} <span style="font-size:.68rem;color:rgba(9,50,87,.38);font-weight:600">د.ع / ${rUnitLabel}</span></div>`;
    }
    return `<div class="prod-card" style="animation-delay:${i*.05}s">
      <div class="prod-img-box" onclick='openProdModal("${esc(p._id)}")'>
        <img src="${p.img}" loading="lazy" onerror="this.src='https://via.placeholder.com/200?text=📦'">
        ${isOut?'<div class="stock-badge sb-out">نفاد المخزون</div>':isLow?'<div class="stock-badge sb-low">كمية محدودة</div>':''}
      </div>
      <div class="prod-body">
        <div class="prod-name" onclick='openProdModal("${esc(p._id)}")'>${p.name}</div>
        ${priceHtml}
        ${p.stock>0?`<div class="qty-ctrl">
          <button class="q-btn" onclick="cartDelta('${esc(p.name)}',-1,${activePrice})">−</button>
          <span class="q-num" id="q_${safeName(p.name)}">${q}</span>
          <button class="q-btn plus" onclick="cartDelta('${esc(p.name)}',1,${activePrice})">+</button>
        </div>`:`<div style="text-align:center;font-size:.72rem;color:rgba(9,50,87,.33);padding:6px">نفاد المخزون</div>`}
      </div></div>`;
  }).join(''):'<div style="grid-column:1/-1;text-align:center;padding:55px;color:rgba(9,50,87,.38)">لا توجد منتجات</div>';
}

function doSearch(q){
  if(!q){renderStore();return;}
  const r=products.filter(p=>p.status==='active'&&(p.name.includes(q)||p.cat.includes(q)));
  const isWS = buyerMode === 'wholesale';
  document.getElementById('prodGrid').innerHTML=r.map(p=>{
    const activePrice = isWS ? (p.wholesalePrice||p.price) : p.price;
    const priceDisp = isWS
      ? (p.wholesalePrice>0 ? `<div class="prod-price-wholesale">${p.wholesalePrice.toLocaleString()} د.ع / كرتون</div>` : `<div class="prod-price-no-ws">اطلب تسعير</div>`)
      : `<div class="prod-price">${p.price.toLocaleString()} د.ع / ${p.retailUnit||'قطعة'}</div>`;
    return `<div class="prod-card" onclick='openProdModal("${esc(p._id)}")'>
      <div class="prod-img-box"><img src="${p.img}" loading="lazy" onerror="this.src='https://via.placeholder.com/200?text=📦'"></div>
      <div class="prod-body">
        <div class="prod-name">${p.name}</div>
        ${priceDisp}
        ${p.stock>0?`<div class="qty-ctrl">
          <button class="q-btn" onclick="event.stopPropagation();cartDelta('${esc(p.name)}',-1,${activePrice})">−</button>
          <span class="q-num" id="q_${safeName(p.name)}">${cart[p.name]?.qty||0}</span>
          <button class="q-btn plus" onclick="event.stopPropagation();cartDelta('${esc(p.name)}',1,${activePrice})">+</button>
        </div>`:'<div style="text-align:center;font-size:.72rem;color:rgba(9,50,87,.33);padding:6px">نفاد المخزون</div>'}
      </div></div>`;}).join('')||'<div style="grid-column:1/-1;text-align:center;padding:55px;color:rgba(9,50,87,.38)">لا توجد نتائج</div>';
}

// ═══════════════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════════════
function cartDelta(name,delta,price){
  if(!cart[name]) cart[name]={qty:0,price,piecesPerUnit:1,addedAs:''};
  cart[name].qty=Math.max(0,cart[name].qty+delta);
  // إذا عُدّل يدوياً بعد إضافته، امسح وصف الوحدة وارجع للقطعة الواحدة
  if(delta===1||delta===-1){cart[name].addedAs='';cart[name].piecesPerUnit=1;cart[name].price=price;}
  const prod=products.find(p=>p.name===name);
  const pieces=cart[name].qty*(cart[name].piecesPerUnit||1);
  if(prod&&pieces>prod.stock){cart[name].qty=Math.floor(prod.stock/(cart[name].piecesPerUnit||1));toast(`الكمية المتاحة فقط ${prod.stock}`);}
  if(cart[name].qty<=0) delete cart[name];
  const el=document.getElementById('q_'+safeName(name));
  if(el) el.textContent=cart[name]?.qty||0;
  updateCartUI();
}

// إضافة وحدات من مودال المنتج
function cartAdd(name, unitQty, unitPrice, piecesPerUnit, addedAs) {
  if(!cart[name]) cart[name]={qty:0,price:unitPrice,piecesPerUnit:piecesPerUnit||1,addedAs:''};
  cart[name].qty += unitQty;
  cart[name].price = unitPrice;
  cart[name].piecesPerUnit = piecesPerUnit || 1;
  cart[name].addedAs = addedAs || '';
  const prod=products.find(p=>p.name===name);
  const pieces=cart[name].qty*(cart[name].piecesPerUnit||1);
  if(prod&&pieces>prod.stock){cart[name].qty=Math.floor(prod.stock/(cart[name].piecesPerUnit||1));}
  if(cart[name].qty<=0) delete cart[name];
  const el=document.getElementById('q_'+safeName(name));
  if(el) el.textContent=cart[name]?.qty||0;
  updateCartUI();
}

function updateCartUI(){
  let total=0,count=0;
  for(const k in cart){total+=cart[k].qty*cart[k].price;count+=cart[k].qty;}
  const fmtT=total.toLocaleString()+' د.ع';
  document.getElementById('cartCountTop').textContent=count;
  document.getElementById('cfBubble').textContent=count;
  document.getElementById('cfTotal').textContent=fmtT;
  document.getElementById('cartTotalDisp').textContent=fmtT;
  document.getElementById('cartFloat').className='cart-float z1'+(count?' show':'');
}

function openCartModal(){
  // إعادة حالة النموذج عند كل فتح
  const formV = document.getElementById('cartFormView');
  const succV = document.getElementById('cartSuccessView');
  if (formV) formV.style.display = 'block';
  if (succV) succV.style.display = 'none';
  renderCartItems();
  const phoneWrap = document.getElementById('visitorPhoneWrap');
  if (phoneWrap) phoneWrap.style.display = CU ? 'none' : 'block';
  openModal('cartModal');
}

function renderCartItems(){
  const keys=Object.keys(cart);
  if(!keys.length){document.getElementById('cartBox').innerHTML='<div style="text-align:center;color:rgba(9,50,87,.38);padding:18px">السلة فارغة</div>';return;}
  document.getElementById('cartBox').innerHTML=keys.map(k=>{
    const addedAs = cart[k].addedAs;
    const ppu = cart[k].piecesPerUnit || 1;
    const subLabel = addedAs
      ? `<div style="font-size:.68rem;color:var(--teal2);font-weight:700;margin-top:1px">${addedAs} · ${cart[k].price.toLocaleString()} د.ع/وحدة${ppu>1?' · '+cart[k].qty*ppu+' قطعة':''}</div>`
      : '';
    return `
    <div class="c-row" style="flex-wrap:wrap">
      <div style="flex:1;min-width:80px">
        <span class="c-name">${k}</span>
        ${subLabel}
      </div>
      <div class="c-ctrls">
        <button class="q-btn" style="width:25px;height:25px;font-size:.88rem"
          onclick="cartDelta('${esc(k)}',-1,${cart[k].price});renderCartItems()">−</button>
        <span style="font-weight:900;min-width:17px;text-align:center;font-size:.88rem">${cart[k].qty}</span>
        <button class="q-btn plus" style="width:25px;height:25px;font-size:.88rem"
          onclick="cartDelta('${esc(k)}',1,${cart[k].price});renderCartItems()">+</button>
      </div>
      <span class="c-price">${(cart[k].qty*cart[k].price).toLocaleString()}</span>
    </div>`;
  }).join('');
  let t=0;for(const k in cart) t+=cart[k].qty*cart[k].price;
  document.getElementById('cartTotalDisp').textContent=t.toLocaleString()+' د.ع';
}

// ── بناء خيارات وحدة الشراء للمنتج ──
function buildProdUnits(p) {
  const pkg = p.packaging || {};
  const frac = p.packagingFractions || {};
  const entries = Object.entries(pkg).filter(([,q])=>q>0).sort((a,b)=>b[1]-a[1]);

  // وضع الجملة: يشتري كرتون فأكثر بسعر الجملة
  if (buyerMode === 'wholesale') {
    const wsPrice = p.wholesalePrice || p.price || 0;
    if (!entries.length) return [{label:'كرتون', piecesPerUnit:1, price:wsPrice}];
    const [uName, uQty] = entries[0];
    return [{label:uName, piecesPerUnit:uQty, price:wsPrice}];
  }

  // وضع المفرد: استخدام وحدة المفرد المخصصة
  const rUnit = p.retailUnit || 'قطعة';
  if (!entries.length) {
    return [{label:rUnit, piecesPerUnit:1, price: p.price||0}];
  }
  const maxQty = entries[0][1];
  const units = [];
  entries.forEach(([uName,uQty]) => {
    const fullPrice = Math.round((p.price||0) * uQty / maxQty);
    const uf = frac[uName] || {};
    if (uf.quarter && uQty >= 4) units.push({label:`ربع ${uName}`, piecesPerUnit:Math.round(uQty/4), price:Math.round(fullPrice*0.25)});
    if (uf.half    && uQty >= 2) units.push({label:`نصف ${uName}`, piecesPerUnit:Math.round(uQty/2), price:Math.round(fullPrice*0.5)});
    units.push({label:uName, piecesPerUnit:uQty, price:fullPrice});
  });
  // أضف وحدة المفرد كأول خيار إذا كانت مختلفة عن باقي الوحدات
  if (!units.find(u => u.label === rUnit)) {
    units.unshift({label:rUnit, piecesPerUnit:1, price:p.price||0});
  }
  return units;
}

function pmSelectUnit(piecesPerUnit, label, price, btn) {
  _pmPiecesPerUnit = piecesPerUnit;
  _pmUnitPrice     = price;
  pmUnitLbl        = label;
  document.querySelectorAll('.pm-unit-card').forEach(c=>c.classList.remove('on'));
  if (btn) btn.classList.add('on');
  pmQtyVal = 1;
  document.getElementById('pmQtyNum').textContent = 1;
  const maxU = piecesPerUnit > 1 ? Math.floor((curProd?.stock||99) / piecesPerUnit) : (curProd?.stock||99);
  window._pmMaxU = Math.max(1, maxU);
  const lbl = document.getElementById('pmQtyLabel');
  if (lbl) lbl.textContent = `الكمية (${label}):`;
  const priceEl = document.getElementById('pmPrice');
  if (priceEl) priceEl.textContent = `${price.toLocaleString()} د.ع`;
  if (curProd) _pmUpdateWeightVol(curProd, piecesPerUnit, 1);
}

// حساب الوزن والحجم لعدد من الوحدات
function _pmCalcWeightVol(p, unitPieces, qty) {
  const maxPieces = p.packaging ? (Object.values(p.packaging)[0] || 1) : 1;
  const ratio = unitPieces / maxPieces;
  const w = ((p.carton_weight||0) * ratio * qty);
  const v = ((p.carton_volume||0) * ratio * qty);
  return { w, v };
}

function _pmUpdateWeightVol(p, unitPieces, qty) {
  const el = document.getElementById('pmWeightVol');
  if (!el) return;
  const hasData = p.carton_weight || p.carton_volume;
  if (!hasData) { el.style.display='none'; return; }
  const {w,v} = _pmCalcWeightVol(p, unitPieces, qty);
  const parts = [];
  if (p.carton_weight) parts.push(`الوزن: <b>${w.toFixed(2)} كغ</b>`);
  if (p.carton_volume) parts.push(`الحجم: <b>${v.toFixed(4)} م³</b>`);
  el.style.display = 'block';
  el.innerHTML = parts.join(' &nbsp;·&nbsp; ');
}

function openProdModal(pOrId){
  const p = (typeof pOrId === 'string') ? products.find(x=>x._id===pOrId) : pOrId;
  if (!p) return;
  curProd=p; pmQtyVal=1; pmUnitLbl='قطعة';
  document.getElementById('pmImg').src=p.img;
  document.getElementById('pmName').textContent=p.name;
  document.getElementById('pmDetail').textContent=p.detail||'منتج عالي الجودة';
  document.getElementById('pmQtyNum').textContent=1;
  const sc=p.stock===0?'b-red':p.stock<p.minStock?'b-gold':'b-green';
  const sl=p.stock===0?'نفاد المخزون':p.stock<p.minStock?'كمية محدودة':'متوفر';
  document.getElementById('pmStock').innerHTML=`<span class="badge ${sc}">${sl}</span>`;

  // ── شارة وضع الشراء داخل المودال ──
  const pmModeEl = document.getElementById('pmModeTag');
  if (pmModeEl) {
    if (buyerMode === 'wholesale') {
      pmModeEl.style.display = 'inline-flex';
      pmModeEl.className = 'mode-badge mode-badge-wholesale';
      pmModeEl.textContent = '📦 سعر الجملة';
    } else {
      pmModeEl.style.display = 'inline-flex';
      pmModeEl.className = 'mode-badge mode-badge-retail';
      pmModeEl.textContent = '🛍️ سعر المفرد';
    }
  }

  document.getElementById('pmAddBtn').style.display=p.stock>0?'flex':'none';
  document.getElementById('pmQtyRow').style.display=p.stock>0?'flex':'none';
  // ── وحدات الشراء ──
  const units = buildProdUnits(p);
  const firstUnit = units[0];
  _pmPiecesPerUnit = firstUnit.piecesPerUnit;
  _pmUnitPrice     = firstUnit.price;
  pmUnitLbl        = firstUnit.label;
  window._pmMaxU = firstUnit.piecesPerUnit > 1 ? Math.floor((p.stock||99)/firstUnit.piecesPerUnit) : (p.stock||99);
  const lbl = document.getElementById('pmQtyLabel'); if(lbl) lbl.textContent=`الكمية (${firstUnit.label}):`;
  // السعر الظاهر = سعر الوحدة المختارة
  document.getElementById('pmPrice').textContent=firstUnit.price.toLocaleString()+' د.ع';
  const unitSel = document.getElementById('pmUnitSelector');
  if (unitSel) {
    if (units.length > 1 && p.stock > 0) {
      unitSel.style.display = 'block';
      document.getElementById('pmUnitCards').innerHTML = units.map((u,i)=>`
        <button class="pm-unit-card ${i===0?'on':''}" onclick="pmSelectUnit(${u.piecesPerUnit},'${u.label.replace(/'/g,"\\'")}',${u.price},this)">
          <div class="pm-uc-label">${u.label}</div>
          <div class="pm-uc-price">${u.price.toLocaleString()} د.ع</div>
          ${u.piecesPerUnit>1?`<div class="pm-uc-pieces">${u.piecesPerUnit} قطعة</div>`:''}
        </button>`).join('');
    } else {
      unitSel.style.display = 'none';
    }
  }
  // ── الوزن والحجم ──
  _pmUpdateWeightVol(p, firstUnit.piecesPerUnit, 1);
  // ── مواصفات الكرتون (تُظهر دائماً في وضع الجملة إذا توفرت) ──
  const dimsEl = document.getElementById('pmDims');
  if (dimsEl) {
    const hasDims = p.carton_l && p.carton_w && p.carton_h;
    const hasPkg = p.packaging && Object.keys(p.packaging).length;
    if (hasDims || (buyerMode === 'wholesale' && hasPkg)) {
      dimsEl.style.display = 'block';
      let dimsHtml = '';
      if (hasDims) {
        dimsHtml += `<div class="pm-dims-row"><span>📐 أبعاد الكرتون</span><span>${p.carton_l}×${p.carton_w}×${p.carton_h} سم</span></div>`;
      }
      if (p.carton_weight) {
        dimsHtml += `<div class="pm-dims-row"><span>⚖️ وزن الكرتون</span><span>${p.carton_weight} كغ</span></div>`;
      }
      if (buyerMode === 'wholesale' && hasPkg) {
        const [pName, pQty] = Object.entries(p.packaging).sort((a,b)=>b[1]-a[1])[0];
        dimsHtml += `<div class="pm-dims-row"><span>📦 محتوى الكرتون</span><span>${pQty} قطعة / ${pName}</span></div>`;
      }
      dimsEl.innerHTML = `<div class="pm-dims-box">${dimsHtml}</div>`;
    } else { dimsEl.style.display='none'; dimsEl.innerHTML=''; }
  }
  openModal('prodModal');
}

function pmChQty(d){
  const mx = window._pmMaxU || curProd?.stock || 99;
  pmQtyVal = Math.max(1, Math.min(pmQtyVal+d, mx));
  document.getElementById('pmQtyNum').textContent = pmQtyVal;
  if (curProd) _pmUpdateWeightVol(curProd, _pmPiecesPerUnit, pmQtyVal);
}

function addFromModal(){
  if(!curProd) return;
  // تحقق من المخزون قبل الإضافة
  const prod = products.find(x => x.name === curProd.name) || curProd;
  const needed = pmQtyVal * _pmPiecesPerUnit;
  if (prod.stock <= 0) {
    toast('⚠️ هذا المنتج نفد من المخزون', false);
    return;
  }
  if (prod.stock < needed) {
    toast(`⚠️ المخزون المتاح ${prod.stock} قطعة — لا يكفي لـ ${pmQtyVal} ${pmUnitLbl}`, false);
    return;
  }
  const addedAs = _pmPiecesPerUnit > 1 ? pmUnitLbl : '';
  cartAdd(curProd.name, pmQtyVal, _pmUnitPrice, _pmPiecesPerUnit, addedAs);
  closeModal('prodModal');
  toast(`أضيف ${curProd.name} × ${pmQtyVal} ${pmUnitLbl}`);
}

// ═══════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════
function toggleMap(){
  const c=document.getElementById('mapContainer');
  c.style.display=c.style.display==='none'?'block':'none';
  if(c.style.display==='block'&&!leafMap){
    setTimeout(()=>{
      leafMap=L.map('map').setView(HQ,15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'©OSM'}).addTo(leafMap);
      L.marker(HQ).addTo(leafMap).bindPopup('🏪 برجمان').openPopup();
      c.scrollIntoView({behavior:'smooth',block:'nearest'});
    },200);
  } else if(c.style.display==='block'){
    leafMap?.invalidateSize();
    c.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}
function confirmLoc(){
  if(!leafMap) return;
  const c=leafMap.getCenter();
  selLoc=`https://www.google.com/maps?q=${c.lat},${c.lng}`;
  document.getElementById('mapContainer').style.display='none';
  document.getElementById('locOk').style.display='block';
  toast('تم تحديد الموقع');
}

// ═══════════════════════════════════════════════════════
// SEND ORDER + POINTS SYSTEM
// ═══════════════════════════════════════════════════════
async function sendOrder(){
  if(_sendingOrder){toast('⏳ جاري إرسال الطلب، انتظر لحظة...',false);return;}
  const shop=document.getElementById('shopName').value.trim();
  const addr=document.getElementById('shopAddr').value.trim();
  const note=document.getElementById('orderNote').value.trim();
  const visPhone=document.getElementById('visitorPhone')?.value.trim()||'';
  let hasErr=false;
  document.getElementById('shopName').classList.remove('err');
  document.getElementById('shopAddr').classList.remove('err');
  document.getElementById('visitorPhone')?.classList.remove('err');
  if(!shop){document.getElementById('shopName').classList.add('err');hasErr=true;}
  if(!addr){document.getElementById('shopAddr').classList.add('err');hasErr=true;}
  if(!CU&&!/^\d{11}$/.test(visPhone)){document.getElementById('visitorPhone')?.classList.add('err');hasErr=true;}
  if(hasErr){toast('⚠️ أكمل الحقول المطلوبة — رقم الهاتف 11 رقم بالضبط',false);return;}
  if(CU?.type==='rep'&&!selLoc){toast('⚠️ المندوب مطلوب منه تحديد الموقع',false);return;}
  _sendingOrder = true;
  const sendBtn = document.querySelector('#cartFormView .btn-full.btn-lg');
  if(sendBtn){sendBtn.disabled=true;sendBtn.textContent='⏳ جاري الإرسال...';}
  try{

  let prodList=[],total=0;
  for(const k in cart){
    const unitLbl = cart[k].addedAs ? ` ${cart[k].addedAs}` : '';
    prodList.push(`${k}(${cart[k].qty}${unitLbl})`);
    total+=cart[k].qty*cart[k].price;
  }
  const commPct=CU?.commPct||0;
  const commission=Math.round(total*commPct/100);
  const net=total-commission;
  const nowStr=new Date().toLocaleString('ar-IQ');
  const orderId='ORD'+Date.now();
  // إنشاء رابط التتبع
const trackingLink = `https://brjman.com/track.html?order=${orderId}`;

  for(const k in cart){const p=products.find(x=>x.name===k);if(p) p.stock=Math.max(0,p.stock-cart[k].qty*(cart[k].piecesPerUnit||1));}

  const cartItemsArray = Object.keys(cart).map(k => {
    const p = products.find(x => x.name === k);
    return {
      name: k, qty: cart[k].qty, price: cart[k].price,
      carton_l: p?.carton_l || 0, carton_w: p?.carton_w || 0, carton_h: p?.carton_h || 0,
      carton_volume: p?.carton_volume || 0, carton_weight: p?.carton_weight || 0,
    };
  });
  const orderData = {
    orderId, date:nowStr,
    repUsername:CU?.username||'guest', repName:CU?.name||'زائر',
    commPct, shopName:shop, shopAddress:addr, note:note||'',
    location:selLoc||'',
    visitorPhone: CU ? '' : visPhone,
    products:prodList.join('، '),
    cartItemsArray,
    total, commission, net,
    purchaseMode: buyerMode || 'retail',
    status: 'pending_approval',
  };

  // ✅ فتح واتساب قبل أي await لأن المتصفح يحجب window.open بعد العمليات غير المتزامنة
  const _locLine  = selLoc  ? `\n🗺️ الموقع: ${selLoc}` : '';
  const _noteLine = note    ? `\n📝 ملاحظة: ${note}`    : '';
  const _phoneLine= visPhone? `\n📞 هاتف الزائر: ${visPhone}` : '';
  const _waMsg = CU
  ? `🛍️ *طلب جديد — برجمان*\n\n📅 ${nowStr}\n${CU.name}\n🏪 ${shop}\n📍 ${addr}${_locLine}${_noteLine}\n📦 ${prodList.join('، ')}\n💰 الإجمالي: ${total.toLocaleString()} د.ع\n🆔 ${orderId}\n\n🔗 *رابط تتبع الطلب:*\n${trackingLink}`
: `🛍️ *طلب جديد — زائر 🆕*\n\n📅 ${nowStr}\nزائر جديد${_phoneLine}\n🏪 ${shop}\n📍 ${addr}${_locLine}${_noteLine}\n📦 ${prodList.join('، ')}\n💰 الإجمالي: ${total.toLocaleString()} د.ع\n🆔 ${orderId}\n\n🔗 *رابط تتبع الطلب:*\n${trackingLink}`
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(_waMsg)}`, '_blank');

  // ── تحويل المودال فوراً لشاشة التتبع بعد فتح الواتساب ──
  {
    const _trackUrl = `https://brjman.com/track.html?order=${orderId}`;
    const _fv = document.getElementById('cartFormView');
    const _sv = document.getElementById('cartSuccessView');
    const _si = document.getElementById('cartSuccessOrderId');
    const _tb = document.getElementById('cartTrackBtn');
    if (_fv) _fv.style.display = 'none';
    if (_sv) _sv.style.display = 'block';
    if (_si) _si.textContent   = '🆔 ' + orderId;
    if (_tb) _tb.href          = _trackUrl;
  }
  // ── إخفاء السلة فوراً بعد الإرسال ──
  cart={}; updateCartUI();

  const fbId = await fbAdd('orders', orderData);


  // بعد كود المجهز المعدل، أضف هذا السطر
await createPreparerNotification(orderData, totalVolume);
// =============================================
// ✅ الطلب بانتظار موافقة الادمن — لا يُرسل للمجهز حتى التأكيد
// =============================================

  for(const k in cart){
    const p=products.find(x=>x.name===k);
    if(p&&p._id) await fbUpdate('products',p._id,{stock:p.stock}).catch(()=>{});
  }

  // ✅ COMMISSION for reps/managers
  if(CU&&(CU.type==='rep'||CU.type==='sales_manager')&&commission>0){
    const uo=users.find(u=>u.username===CU.username);
    if(uo){
      uo.balance=(uo.balance||0)+commission;
      const tx={type:'credit',amount:commission,
        desc:`عمولة ${commPct}% — ${shop} (${total.toLocaleString()} د.ع)`,
        date:new Date().toLocaleDateString('ar-IQ')};
      uo.transactions=uo.transactions||[];
      uo.transactions.push(tx);
      CU.balance=uo.balance;
      if(uo._id){
        await fbUpdate('users',uo._id,{balance:uo.balance}).catch(()=>{});
        await fbAddSub('users',uo._id,'transactions',tx).catch(()=>{});
      }
    }
    updateWalletBar();
  }

  // ✅ POINTS SYSTEM: 1 point per 100,000 IQD for rep and market_owner
  if(CU && (CU.type==='rep' || CU.type==='market_owner') && total>0) {
    await awardPoints(CU.username, total, shop, orderId);
  }

  const notifData = {
  title: '📦 طلب جديد',
  body:  `${CU?.name||'زائر'} — ${shop} — ${total.toLocaleString()} د.ع`,
  type:  'order',
  read:  false,
  targetUser: 'admin',
  date:  new Date().toLocaleDateString('ar-IQ')
};
const notifId = await fbAdd('notifications', notifData).catch(()=>null);
if (notifId) {
  notifications.unshift({ _id: notifId, ...notifData });
  renderNotifications();
  renderNotifBadge();
  buildSidebar();
}

// إرسال إيميل بنفس الوقت
sendOrderEmail({shop, addr, note, prodList, total, commission, commPct, orderId, nowStr, selLoc});

  orders.push(parseOrder({...orderData,_id:fbId||'',createdAt:nowStr}));
  ['shopName','shopAddr','orderNote','visitorPhone'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('locOk').style.display='none'; selLoc='';

  // ── تحديث رابط التتبع بعد معرفة fbId ──
  const trackUrl = `https://brjman.com/track.html?order=${orderId}`;
  const trackBtn = document.getElementById('cartTrackBtn');
  if (trackBtn) trackBtn.href = trackUrl;
  // إشعار تيليغرام — المجموعة + كل مستخدم معني عنده معرف
  const TG_TOKEN = '8142978736:AAEpT6L_RNNIUMx54mU83gx4ap_Z3VmuXsA';
  const TG_CHAT  = '-5246620507';
  const _newOrderTgText = `🛍️ *طلب جديد يحتاج موافقة*\n\n📅 ${nowStr}\n${CU?.name||'زائر'}\n🏪 ${shop}\n📍 ${addr}\n📦 ${prodList.join('، ')}\n💰 ${total.toLocaleString()} د.ع\nعمولة: ${commission.toLocaleString()} د.ع`;
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: TG_CHAT, text: _newOrderTgText, parse_mode: 'Markdown' })
  }).catch(()=>{});
  // إشعار فردي لكل ادمن / مشرف / مدير مبيعات / مجهز / سائق عنده معرف تيليجرام
  const _notifyTypes = ['admin','sales_manager','supervisor','preparer','driver'];
  users.filter(u => _notifyTypes.includes(u.type) && u.telegram).forEach(u => {
    const _isApprover = ['admin','sales_manager','supervisor'].includes(u.type);
    const _personalMsg = _newOrderTgText + (_isApprover ? '\n\n✅ *افتح لوحة التحكم للموافقة على الطلب*' : '');
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: u.telegram, text: _personalMsg, parse_mode: 'Markdown' })
    }).catch(()=>{});
  });

  toast(CU&&commission>0?`✅ الطلب أُرسل! عمولتك: ${commission.toLocaleString()} د.ع`:'تم إرسال الطلب');

  // Save guest order to localStorage for re-tracking
  if (!CU && visPhone && fbId) {
    localStorage.setItem('bj_guest_order', JSON.stringify({ orderId, fbId, phone: visPhone, shop, date: nowStr }));
  }


  renderStore('الكل'); renderInventory(); renderOrders(); buildDashboard(); renderSalesList();
  }finally{
    _sendingOrder=false;
    const sb=document.querySelector('#cartFormView .btn-full.btn-lg');
    if(sb){sb.disabled=false;sb.innerHTML='📱 إرسال الطلب عبر الواتساب';}
  }
}


// ═══════════════════════════════════════════════════════
// ✅ POINTS SYSTEM — Core Logic
// كل 100,000 د.ع من قيمة الطلبات = نقطة واحدة
// ═══════════════════════════════════════════════════════
async function awardPoints(username, orderTotal, shopName, orderId) {
  const uo = users.find(u => u.username === username);
  if (!uo) return;

  // Previous total amount
  const prevTotal = parseFloat(uo.totalOrdersAmount) || 0;
  const newTotal  = prevTotal + orderTotal;

  // Points before and after
  const ptsBefore = Math.floor(prevTotal / POINTS_THRESHOLD);
  const ptsAfter  = Math.floor(newTotal  / POINTS_THRESHOLD);
  const newPoints = ptsAfter - ptsBefore;

  // Update local state
  uo.totalOrdersAmount = newTotal;
  uo.earnedPoints = (parseInt(uo.earnedPoints) || 0) + newPoints;

  // Persist to Firebase
  if (uo._id) {
    const updateData = {
      totalOrdersAmount: newTotal,
      earnedPoints: uo.earnedPoints
    };
    await fbUpdate('users', uo._id, updateData).catch(() => {});

    if (newPoints > 0) {
      // Log each earned point as a history record
      const ptsTx = {
        type: 'earn',
        points: newPoints,
        orderId: orderId,
        shopName: shopName,
        orderAmount: orderTotal,
        date: new Date().toLocaleDateString('ar-IQ')
      };
      await fbAddSub('users', uo._id, 'pointsHistory', ptsTx).catch(() => {});

      // Notify the user
      toast(`⭐ حصلت على ${newPoints} نقطة${newPoints>1?'':''}! (${uo.earnedPoints} إجمالاً)`);

      await fbAdd('notifications', {
        title: '⭐ نقاط جديدة',
        body: `حصلت على ${newPoints} نقطة من طلب ${shopName} (${orderTotal.toLocaleString()} د.ع)`,
        type: 'info', read: false,
        targetUser: username,
        date: new Date().toLocaleDateString('ar-IQ')
      }).catch(() => {});
    }
  }

  // Update CU if it's the current user
  if (CU && CU.username === username) {
    CU.totalOrdersAmount = newTotal;
    CU.earnedPoints = uo.earnedPoints;
  }
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function buildDashboard(){
  if(!CU) return;
  const p=PERMS[CU.type]||PERMS.guest;
  document.getElementById('dashH1').textContent=`👋 مرحباً، ${CU.name}`;
  document.getElementById('dashSub').textContent=new Date().toLocaleDateString('ar-IQ',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const myOrd=filterMyOrders();
  const today=myOrd.filter(o=>isSameDay(o.date,new Date()));
  const month=myOrd.filter(o=>isThisMonth(o.date));
  let kpi='';
  if(CU.type==='admin'||CU.type==='sales_manager'){
    const allTot=orders.reduce((s,o)=>s+(parseFloat(o.total)||0),0);
    const allComm=orders.reduce((s,o)=>s+(parseFloat(o.commission)||0),0);
    const reps=new Set(orders.map(o=>o.repUser).filter(Boolean)).size;
    const lowProd=products.filter(p=>p.stock>0&&p.stock<p.minStock).length;
    kpi=`<div class="kpi-card kpi-sky"><div class="kpi-icon">💰</div><div class="kpi-val">${(allTot/1e6).toFixed(2)}M</div><div class="kpi-lbl">إجمالي المبيعات (د.ع)</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">مخزون</div><div class="kpi-val">${orders.length}</div><div class="kpi-lbl">إجمالي الطلبات</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">🤝</div><div class="kpi-val">${reps}</div><div class="kpi-lbl">المندوبون النشطون</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">⚠️</div><div class="kpi-val">${lowProd}</div><div class="kpi-lbl">منتجات مخزون منخفض</div></div>`;
  } else if(CU.type==='rep'){
    const uo=users.find(u=>u.username===CU.username);
    const bal=parseFloat(uo?.balance||0);
    const mTot=month.reduce((s,o)=>s+(parseFloat(o.total)||0),0);
    const mComm=month.reduce((s,o)=>s+(parseFloat(o.commission)||0),0);
    const pts=parseInt(uo?.earnedPoints)||0;
    kpi=`<div class="kpi-card kpi-sky"><div class="kpi-icon">📅</div><div class="kpi-val">${today.reduce((s,o)=>s+(parseFloat(o.total)||0),0).toLocaleString()}</div><div class="kpi-lbl">مبيعات اليوم (د.ع)</div><div class="kpi-sub">${today.length} طلب</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">📊</div><div class="kpi-val">${mTot.toLocaleString()}</div><div class="kpi-lbl">مبيعات الشهر</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">رصيد</div><div class="kpi-val">${mComm.toLocaleString()}</div><div class="kpi-lbl">عمولة الشهر (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${bal.toLocaleString()}</div><div class="kpi-lbl">رصيد المحفظة (د.ع)</div></div>
    <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${pts}</div><div class="kpi-lbl">النقاط المتراكمة</div></div>`;
  } else {
    const myBuys=orders.filter(o=>o.shopName===CU.name);
    const uo=users.find(u=>u.username===CU.username);
    const pts=parseInt(uo?.earnedPoints)||0;
    kpi=`<div class="kpi-card kpi-sky"><div class="kpi-icon">🛒</div><div class="kpi-val">${myBuys.length}</div><div class="kpi-lbl">إجمالي الطلبات</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">📊</div><div class="kpi-val">${myBuys.filter(o=>isThisMonth(o.date)).reduce((s,o)=>s+(parseFloat(o.total)||0),0).toLocaleString()}</div><div class="kpi-lbl">مشتريات الشهر (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo?.balance||0).toLocaleString()}</div><div class="kpi-lbl">رصيد المحفظة (د.ع)</div></div>
    <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${pts}</div><div class="kpi-lbl">النقاط المتراكمة</div></div>`;
  }
  document.getElementById('dashKpi').innerHTML=kpi;
  const showOrds = (p.dash && CU.type!=='market_owner') ? orders : filterMyOrders();
  document.getElementById('recentBody').innerHTML=[...showOrds].slice(-8).reverse().map(o=>`
    <tr onclick="showOrdDetail('${o._id||o.id||''}')" style="cursor:pointer">
      <td>${o.date}</td>
      <td style="font-weight:700;color:var(--deep)">${o.shopName||'—'}</td>
      <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.products}</td>
      <td style="font-weight:800;color:var(--dark)">${(parseFloat(o.total)||0).toLocaleString()} د.ع</td>
      <td><span class="badge b-green">✅ مكتمل</span></td>
    </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد طلبات</td></tr>';
}

// ═══════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════
function renderPendingApprovalSection() {
  const isAdmin = CU?.type === 'admin' || CU?.type === 'sales_manager';
  const section = document.getElementById('pendingApprovalSection');
  const list    = document.getElementById('pendingApprovalList');
  const count   = document.getElementById('pendingApprovalCount');
  if (!section || !list) return;

  if (!isAdmin) { section.style.display = 'none'; return; }

  const pending = orders.filter(o => (o.status || '') === 'pending_approval');
  if (!pending.length) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  if (count) count.textContent = pending.length;

  list.innerHTML = pending.map(o => `
    <div style="background:rgba(255,255,255,.9);border:1.5px solid rgba(245,158,11,.35);border-radius:var(--r16);padding:14px 16px;display:flex;flex-wrap:wrap;align-items:center;gap:12px;box-shadow:0 4px 16px rgba(245,158,11,.1)">
      <div style="flex:1;min-width:180px">
        <div style="font-weight:800;font-size:.9rem;color:var(--deep);margin-bottom:4px">🏪 ${o.shopName||'—'}</div>
        <div style="font-size:.75rem;color:rgba(9,50,87,.5);margin-bottom:2px">${o.repName||'زائر'} · ${o.date||''}</div>
        <div style="font-size:.76rem;color:rgba(9,50,87,.55);margin-top:4px;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📦 ${o.products||'—'}</div>
      </div>
      <div style="text-align:center;min-width:80px">
        <div style="font-size:1.1rem;font-weight:900;color:var(--dark)">${(parseFloat(o.total)||0).toLocaleString()}</div>
        <div style="font-size:.65rem;color:rgba(9,50,87,.4)">د.ع</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <button class="btn btn-sm" style="background:var(--dark);color:white;border:none;box-shadow:var(--glow-dark)"
          onclick="approveOrder('${o._id||o.id||''}')">تأكيد الطلب</button>
        <button class="btn btn-ghost btn-sm" onclick="showOrdDetail('${o._id||o.id||''}')">عرض</button>
      </div>
    </div>`).join('');
}

function renderOrders() {
  if (!CU) return;
  renderPendingApprovalSection();
  const p = PERMS[CU.type] || PERMS.guest;

  // ── 1. قاعدة البيانات حسب الصلاحية ──
  const base = p.dash ? [...orders] : [...filterMyOrders()];

  // ── 2. ملأ قائمة المندوبين في الفلتر (للأدمن فقط) ──
  const repWrap = document.getElementById('ordRepFilterWrap');
  const repSel  = document.getElementById('ordRepFilter');
  if (repWrap) repWrap.style.display = p.dash ? 'block' : 'none';
  if (repSel && p.dash) {
    const reps = [...new Set(base.map(o => o.repUser).filter(Boolean))];
    const cur  = repSel.value;
    repSel.innerHTML = '<option value="all">الكل</option>' +
      reps.map(r => {
        const u = users.find(u => u.username === r);
        return `<option value="${r}" ${r===cur?'selected':''}>${u?.name||r}</option>`;
      }).join('');
  }

  // ── 3. قراءة قيم الفلاتر ──
  const period    = document.getElementById('ordFilter')?.value   || 'all';
  const repFilter = document.getElementById('ordRepFilter')?.value || 'all';
  const shopQ     = (document.getElementById('ordShopFilter')?.value || '').trim().toLowerCase();
  const fromDate  = document.getElementById('ordFrom')?.value;
  const toDate    = document.getElementById('ordTo')?.value;

  // إظهار/إخفاء حقول التاريخ المخصص
  const customDates = document.getElementById('ordCustomDates');
  if (customDates) customDates.style.display = period === 'custom' ? 'block' : 'none';

  // ── 4. تطبيق الفلاتر ──
  const now = new Date();
  let filt = base;

  // فلتر الفترة
  if (period === 'today')
    filt = filt.filter(o => isSameDay(o.date, now));
  else if (period === 'week') {
    const w = new Date(now); w.setDate(now.getDate() - 7);
    filt = filt.filter(o => isAfterDate(o.date, w));
  }
  else if (period === 'month')
    filt = filt.filter(o => isThisMonth(o.date));
  else if (period === 'custom') {
    if (fromDate) filt = filt.filter(o => isAfterDate(o.date, new Date(fromDate)));
    if (toDate)   filt = filt.filter(o => isBeforeDate(o.date, new Date(toDate)));
  }

  // فلتر المندوب
  if (repFilter !== 'all')
    filt = filt.filter(o => o.repUser === repFilter);

  // فلتر المحل
  if (shopQ)
    filt = filt.filter(o => (o.shopName || '').toLowerCase().includes(shopQ));

  // ── 5. ترتيب من الأحدث للأقدم ──
  filt.sort((a, b) => {
    // نحوّل التاريخ العربي لرقم للمقارنة
    const da = parseArabicDate(a.date);
    const db = parseArabicDate(b.date);
    return db - da; // الأحدث أولاً
  });

  // ── 6. ملخص KPI ──
  const t = filt.reduce((s,o) => s+(parseFloat(o.total)||0), 0);
  const c = filt.reduce((s,o) => s+(parseFloat(o.commission)||0), 0);
  document.getElementById('ordSummary').innerHTML = `
    <div style="background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.9);border-radius:var(--r16);padding:12px;text-align:center;box-shadow:var(--shadow-sm)">
      <div style="font-size:1.3rem;font-weight:900;color:var(--teal2)">${filt.length}</div>
      <div style="font-size:.68rem;color:rgba(9,50,87,.48)">عدد الطلبات</div>
    </div>
    <div style="background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.9);border-radius:var(--r16);padding:12px;text-align:center;box-shadow:var(--shadow-sm)">
      <div style="font-size:1.3rem;font-weight:900;color:var(--dark)">${(t/1000).toFixed(0)}K</div>
      <div style="font-size:.68rem;color:rgba(9,50,87,.48)">إجمالي المبيعات</div>
    </div>
    <div style="background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.9);border-radius:var(--r16);padding:12px;text-align:center;box-shadow:var(--shadow-sm)">
      <div style="font-size:1.3rem;font-weight:900;color:var(--gold2)">${(c/1000).toFixed(0)}K</div>
      <div style="font-size:.68rem;color:rgba(9,50,87,.48)">إجمالي العمولات</div>
    </div>`;

  // تحديث شارة العدد
  const badge = document.getElementById('ordCountBadge');
  if (badge) badge.textContent = filt.length + ' طلب';
  buildSidebar();

  // إظهار أزرار الأدمن
  const adminActions = document.getElementById('ordAdminActions');
  if (adminActions) adminActions.style.display = CU?.type==='admin' ? 'flex' : 'none';

  // حفظ IDs المعروضة للحذف الجماعي
  window._visibleOrderIds = filt.map(o => o._id||o.id||'').filter(Boolean);

  // ── 7. رسم الجدول ──
  const isAdmin = CU?.type === 'admin' || CU?.type === 'sales_manager';
  document.getElementById('ordBody').innerHTML = filt.length
    ? filt.map(o => {
        const isPendingApproval = (o.status || '') === 'pending_approval';
        const statusBadge = isPendingApproval
          ? `<span class="badge" style="background:rgba(245,158,11,.15);color:#b45309;border:1px solid rgba(245,158,11,.3)">⏳ بانتظار الموافقة</span>`
          : '';
        const approveBtn = (isAdmin && isPendingApproval)
          ? `<button class="btn btn-sm" style="background:var(--dark);color:white;border:none;box-shadow:var(--glow-dark)" onclick="approveOrder('${o._id||o.id||''}')">موافقة</button>`
          : '';
        return `
        <tr onclick="showOrdDetail('${o._id||o.id||''}')" style="cursor:pointer${isPendingApproval?';background:rgba(245,158,11,.04)':''}">
          <td style="white-space:nowrap;color:rgba(9,50,87,.55);font-size:.76rem">${o.date}</td>
          <td style="font-weight:700;color:var(--teal2)">${o.repName||'—'}</td>
          <td style="font-weight:700;color:var(--deep)">${o.shopName||'—'}</td>
          <td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(9,50,87,.48)">${o.products}</td>
          <td style="font-weight:800;color:var(--mint2)">${(parseFloat(o.total)||0).toLocaleString()}</td>
          <td style="color:var(--gold2)">${(parseFloat(o.commission)||0).toLocaleString()}</td>
          <td style="color:var(--teal2)">${(parseFloat(o.net)||0).toLocaleString()}</td>
          <td onclick="event.stopPropagation()" style="white-space:nowrap">
            ${statusBadge}
            ${approveBtn}
            <button class="btn btn-ghost btn-sm" onclick="showOrdDetail('${o._id||o.id||''}')">عرض</button>
            ${CU?.type==='admin'?`<button class="btn btn-sm" style="background:rgba(244,63,94,.08);color:#e11d48;border:none" onclick="deleteOrder('${o._id||o.id||''}')">حذف</button>`:''}
          </td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد طلبات بهذه الفلاتر</td></tr>';
}

// ── دالة مساعدة: إعادة تعيين الفلاتر ──
function resetOrdFilters() {
  const ids = ['ordFilter', 'ordRepFilter'];
  ids.forEach(id => { const el = document.getElementById(id); if(el) el.value = 'all'; });
  const shop = document.getElementById('ordShopFilter');
  if(shop) shop.value = '';
  const frm = document.getElementById('ordFrom');
  const to  = document.getElementById('ordTo');
  if(frm) frm.value = '';
  if(to)  to.value  = '';
  renderOrders();
  toast('🔄 تم إعادة تعيين الفلاتر');
}
function showOrdDetail(id) {
  const o = orders.find(x => (x._id||x.id) === id);
  if (!o) return;
  const locBtn = o.location ? `<a href="${o.location}" target="_blank" style="color:var(--teal2);font-weight:700;text-decoration:none">عرض الموقع</a>` : '—';
  document.getElementById('ordDetailContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;font-size:.85rem">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:rgba(13,148,136,.05);border-radius:var(--r12);padding:10px">
          <div style="font-size:.68rem;color:rgba(9,50,87,.45);margin-bottom:3px">رقم الطلب</div>
          <div style="font-weight:800;color:var(--teal2);font-size:.78rem">${o.orderId||o._id||'—'}</div>
        </div>
        <div style="background:rgba(13,148,136,.05);border-radius:var(--r12);padding:10px">
          <div style="font-size:.68rem;color:rgba(9,50,87,.45);margin-bottom:3px">التاريخ</div>
          <div style="font-weight:700">${o.date||'—'}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.8);border:1px solid rgba(0,0,0,.07);border-radius:var(--r12);padding:12px;display:flex;flex-direction:column;gap:7px">
        <div style="display:flex;justify-content:space-between"><span style="color:rgba(9,50,87,.5)">المندوب</span><span style="font-weight:700">${o.repName||'زائر'}</span></div>
        ${o.visitorPhone?`<div style="display:flex;justify-content:space-between"><span style="color:rgba(9,50,87,.5)">📞 هاتف الزائر</span><span style="font-weight:700;color:var(--teal2)">${o.visitorPhone}</span></div>`:''}
        <div style="display:flex;justify-content:space-between"><span style="color:rgba(9,50,87,.5)">المحل</span><span style="font-weight:700">${o.shopName||'—'}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:rgba(9,50,87,.5)">العنوان</span><span style="font-weight:700">${o.shopAddress||o.addr||'—'}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:rgba(9,50,87,.5)">الموقع</span><span>${locBtn}</span></div>
        ${o.note?`<div style="display:flex;justify-content:space-between"><span style="color:rgba(9,50,87,.5)">ملاحظة</span><span style="font-weight:700">${o.note}</span></div>`:''}
      </div>
      <div style="background:rgba(255,255,255,.8);border:1px solid rgba(0,0,0,.07);border-radius:var(--r12);padding:12px">
        <div style="font-size:.72rem;color:rgba(9,50,87,.45);margin-bottom:8px">المنتجات</div>
        ${(()=>{
          const items = o.cartItemsArray || parseCartItems(o.products);
          if (!items || !items.length) return `<div style="font-weight:700;line-height:1.7">${o.products||'—'}</div>`;
          return items.map(it=>{
            const hasDims = it.carton_l && it.carton_w && it.carton_h;
            const dimLine = hasDims ? `<span style="color:rgba(9,50,87,.4);font-size:.72rem">📐 ${it.carton_l}×${it.carton_w}×${it.carton_h} سم${it.carton_weight?` · ${it.carton_weight} كغ`:''}</span>` : (it.carton_weight?`<span style="color:rgba(9,50,87,.4);font-size:.72rem">⚖️ ${it.carton_weight} كغ</span>`:'');
            const prod = products.find(x=>x.name===it.name);
            const pkg = prod?.packaging || it.packaging || {};
            const pkgLine = Object.keys(pkg).length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px">${Object.entries(pkg).map(([u,q])=>`<span class="pkg-chip">${u}: ${q}</span>`).join('')}</div>` : '';
            return `<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(0,0,0,.05)">
              <div style="display:flex;flex-direction:column;gap:2px">
                <span style="font-weight:700;color:var(--deep)">${it.name}</span>
                ${dimLine}
                ${pkgLine}
              </div>
              <div style="text-align:left;display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0;margin-right:8px">
                <span style="font-weight:800;color:var(--teal2)">× ${it.qty}</span>
                ${it.price?`<span style="font-size:.72rem;color:rgba(9,50,87,.45)">${(it.price*it.qty).toLocaleString()} د.ع</span>`:''}
              </div>
            </div>`;
          }).join('');
        })()}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div style="background:rgba(30,41,59,.05);border-radius:var(--r12);padding:10px">
          <div style="font-size:.68rem;color:rgba(9,50,87,.45)">الإجمالي</div>
          <div style="font-weight:900;color:var(--dark)">${(parseFloat(o.total)||0).toLocaleString()}</div>
        </div>
        <div style="background:rgba(234,179,8,.07);border-radius:var(--r12);padding:10px">
          <div style="font-size:.68rem;color:rgba(9,50,87,.45)">العمولة</div>
          <div style="font-weight:900;color:var(--gold2)">${(parseFloat(o.commission)||0).toLocaleString()}</div>
        </div>
        <div style="background:rgba(20,184,166,.07);border-radius:var(--r12);padding:10px">
          <div style="font-size:.68rem;color:rgba(9,50,87,.45)">الصافي</div>
          <div style="font-weight:900;color:var(--teal2)">${(parseFloat(o.net)||0).toLocaleString()}</div>
        </div>
      </div>
    </div>`;
  openModal('ordDetailModal');
}

// ═══════════════════════════════════════════════════════
// ✅ الموافقة على الطلب — bottom sheet بدل confirm()
// ═══════════════════════════════════════════════════════
let _approveOrderId  = null;
let _approvePreparers = [];
let _approveOrigTotal = 0;
let _approveWaMsg = '';
let _approveTgMsg = '';
let _approvePrepLink = '';

async function approveOrder(id) {
  if (CU?.type !== 'admin' && CU?.type !== 'sales_manager') return;

  const o = orders.find(x => (x._id||x.id) === id);
  if (!o) return;

  // 1. بناء رسائل الإرسال
  let totalVolume = 0, itemsList = '';
  const itemsArr = o.cartItemsArray || parseCartItems(o.products);
  itemsArr.forEach(item => {
    const p = products.find(x => x.name === item.name);
    if (p && p.carton_volume) {
      const vol = p.carton_volume * (item.qty || 1);
      totalVolume += vol;
      itemsList += `\n   • ${item.name} (${item.qty||1}) - حجم: ${vol.toFixed(3)} م³`;
    } else {
      itemsList += `\n   • ${item.name} (${item.qty||1})`;
    }
  });

  const prepareLink = `https://brjman.com/prepare.html?order=${o.orderId||id}`;
  const waMsg = `📦 *طلب جديد للتجهيز ✅ معتمد*\n\n🏪 المحل: ${o.shopName||'—'}\n🆔 رقم الطلب: ${o.orderId||id}\n📋 المنتجات:${itemsList}\n📐 إجمالي الحجم: ${totalVolume.toFixed(3)} م³\n💰 الإجمالي: ${(parseFloat(o.total)||0).toLocaleString()} د.ع\n\n✅ تمت الموافقة من: ${CU.name}\n🔗 رابط التجهيز:\n${prepareLink}`;
  const tgMsg =
    `📦 *طلب جديد معتمد للتجهيز*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🏪 المحل: ${o.shopName||'—'}\n` +
    `المندوب: ${o.repName||'زائر'}\n` +
    `📍 العنوان: ${o.shopAddr||'—'}\n` +
    `🆔 رقم الطلب: ${o.orderId||id}\n` +
    `📋 المنتجات:${itemsList}\n` +
    `📐 إجمالي الحجم: ${totalVolume.toFixed(3)} م³\n` +
    `💰 الإجمالي: ${(parseFloat(o.total)||0).toLocaleString()} د.ع\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `✅ اعتمد من: ${CU.name}\n` +
    `🔗 رابط التجهيز:\n${prepareLink}`;

  // 2. جلب المجهزين مسبقاً (قبل أي user gesture)
  try {
    const snap = await fb().getDocs(fb().query(fb().collection(db(), 'users'), fb().where('type', '==', 'preparer')));
    _approvePreparers = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) {
    _approvePreparers = users.filter(u => u.type === 'preparer');
  }

  // 3. حفظ البيانات وفتح الـ bottom sheet
  _approveOrderId  = id;
  _approveWaMsg    = waMsg;
  _approveTgMsg    = tgMsg;
  _approvePrepLink = prepareLink;

  const desc = document.getElementById('approveSheetDesc');
  if (desc) desc.innerHTML =
    `<strong>${o.shopName||'—'}</strong> · ${o.repName||'زائر'}<br>` +
    `${(parseFloat(o.total)||0).toLocaleString()} د.ع · ${itemsArr.length} منتج`;

  // Reset price adjustment fields
  _approveOrigTotal = parseFloat(o?.total) || 0;
  ['priceAddFee','priceDiscount','priceAdjNote'].forEach(fid => {
    const el = document.getElementById(fid); if (el) el.value = '';
  });
  updateApproveTotal();

  const sheet = document.getElementById('approveSheet');
  if (sheet) { sheet.style.display = 'flex'; }
}

function closeApproveSheet() {
  const sheet = document.getElementById('approveSheet');
  if (sheet) sheet.style.display = 'none';
  _approveOrderId = null;
}

function updateApproveTotal() {
  const fee  = parseFloat(document.getElementById('priceAddFee')?.value)  || 0;
  const disc = parseFloat(document.getElementById('priceDiscount')?.value) || 0;
  const newTotal = Math.max(0, _approveOrigTotal + fee - disc);
  const elOrig = document.getElementById('approveOrigTotal');
  const elNew  = document.getElementById('approveNewTotal');
  if (elOrig) elOrig.textContent = _approveOrigTotal.toLocaleString() + ' د.ع';
  if (elNew)  elNew.textContent  = newTotal.toLocaleString() + ' د.ع';
  // highlight if changed
  if (elNew) elNew.style.color = (fee || disc) ? (newTotal < _approveOrigTotal ? '#dc2626' : 'var(--teal2)') : 'var(--teal2)';
}

async function doSaveTelegramId() {
  const tgId = document.getElementById('tg_id')?.value.trim() || '';
  if (!CU?._id) return;
  try {
    await fbUpdate('users', CU._id, { telegram: tgId });
    CU.telegram = tgId;
    const idx = users.findIndex(u => u._id === CU._id);
    if (idx !== -1) users[idx].telegram = tgId;
    toast('تم حفظ معرف تيليجرام');
  } catch(e) { toast('❌ حدث خطأ', false); }
}

async function confirmApproveOrder() {
  if (!_approveOrderId) return;
  const id  = _approveOrderId;
  const o   = orders.find(x => (x._id||x.id) === id);
  const btn = document.getElementById('approveSheetBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الإرسال...'; }

  // 4. فتح واتساب — مباشرة من ضغطة المستخدم على زر "موافقة وإرسال"
  _approvePreparers.forEach(prep => {
    if (prep.phone) {
      window.open(`https://wa.me/${prep.phone.replace(/\+/g,'')}?text=${encodeURIComponent(_approveWaMsg)}`, '_blank');
    }
  });

  // 5. تحديث الحالة + تعديل السعر في Firebase
  const _addFee   = parseFloat(document.getElementById('priceAddFee')?.value)  || 0;
  const _discAmt  = parseFloat(document.getElementById('priceDiscount')?.value) || 0;
  const _adjNote  = document.getElementById('priceAdjNote')?.value.trim() || '';
  const _adjTotal = Math.max(0, (parseFloat(o?.total) || 0) + _addFee - _discAmt);
  const _adjComm  = Math.round(_adjTotal * (parseFloat(o?.commPct) || 0) / 100);
  const _adjNet   = _adjTotal - _adjComm;
  const _priceChanged = _addFee !== 0 || _discAmt !== 0;
  const _updatePayload = {
    status: 'Pending',
    ...(_priceChanged ? {
      total: _adjTotal, commission: _adjComm, net: _adjNet,
      price_adj_fee: _addFee, price_adj_discount: _discAmt,
      price_adj_note: _adjNote, price_adj_by: CU?.username,
      price_adj_at: new Date().toISOString()
    } : {})
  };
  await fbUpdate('orders', id, _updatePayload).catch(() => {});
  if (o) {
    o.status = 'Pending';
    if (_priceChanged) { o.total = _adjTotal; o.commission = _adjComm; o.net = _adjNet; }
  }

  // 6. بناء رسالة تليجرام النهائية — تشمل تفاصيل تعديل السعر إن وجد
  let _finalTgMsg = _approveTgMsg;
  if (_priceChanged) {
    const _origAmt = _adjTotal - _addFee + _discAmt; // استعادة السعر الأصلي
    let _priceBlock = `\n━━━━━━━━━━━━━━━━━━\n💰 *تعديل السعر*\n` +
      `📌 السعر الأصلي: ${_origAmt.toLocaleString()} د.ع\n`;
    if (_addFee  > 0) _priceBlock += `مبلغ مضاف: *${_addFee.toLocaleString()} د.ع*\n`;
    if (_discAmt > 0) _priceBlock += `➖ مبلغ مخصوم: *${_discAmt.toLocaleString()} د.ع*\n`;
    _priceBlock += `💵 *الإجمالي النهائي: ${_adjTotal.toLocaleString()} د.ع*`;
    if (_adjNote) _priceBlock += `\n📝 ملاحظة: ${_adjNote}`;
    _finalTgMsg = _approveTgMsg + _priceBlock;
  }

  const TG_TOKEN = '8142978736:AAEpT6L_RNNIUMx54mU83gx4ap_Z3VmuXsA';
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ chat_id: '-5246620507', text: _finalTgMsg, parse_mode: 'Markdown' })
  }).catch(() => {});

  _approvePreparers.forEach(prep => {
    fbAdd('notifications', {
      title: '📦 طلب معتمد للتجهيز',
      body: `${o?.shopName||'—'} — ${_adjTotal.toLocaleString()} د.ع`,
      type: 'order', read: false,
      targetUser: prep.username || prep._id,
      date: new Date().toLocaleDateString('ar-IQ')
    }).catch(() => {});

    if (prep.telegram) {
      fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ chat_id: prep.telegram, text: _finalTgMsg, parse_mode: 'Markdown' })
      }).catch(() => {});
    }
  });

  closeApproveSheet();
  if (btn) { btn.disabled = false; btn.textContent = 'موافقة وإرسال'; }
  toast('✅ تمت الموافقة وأُرسل للمجهز');
  renderOrders(); buildDashboard();
}

async function deleteOrder(id) {
  if (CU?.type !== 'admin') return;
  if (!confirm('حذف هذا الطلب؟ لا يمكن التراجع.')) return;
  await fbDel('orders', id).catch(()=>{});
  orders = orders.filter(o => (o._id||o.id) !== id);
  renderOrders(); buildDashboard(); renderSalesList(); renderReports();
  toast('تم حذف الطلب');
}

async function deleteAllVisibleOrders() {
  if (CU?.type !== 'admin') return;
  const ids = window._visibleOrderIds || [];
  if (!ids.length) return;
  if (!confirm(`حذف ${ids.length} طلب معروض؟ لا يمكن التراجع.`)) return;
  await Promise.all(ids.map(id => fbDel('orders', id).catch(()=>{})));
  orders = orders.filter(o => !ids.includes(o._id||o.id||''));
  renderOrders(); buildDashboard(); renderSalesList(); renderReports();
  toast(`تم حذف ${ids.length} طلب`);
}

// ═══════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════
function buildWalletPage(){
  if(!CU) return;
  const uo=users.find(u=>u.username===CU.username)||CU;
  const bal=parseFloat(uo.balance||0);
  document.getElementById('walBal').textContent=bal.toLocaleString();
  buildWalletKpi();
  const tabBtn=document.getElementById('tabDiscBtn');
  if(tabBtn) tabBtn.style.display=['admin','sales_manager','market_owner'].includes(CU.type)?'block':'none';
  document.getElementById('addDiscWrap').style.display=(CU.type==='admin'||CU.type==='sales_manager')?'flex':'none';
  let sub='';
  if(CU.type==='rep'){const totComm=orders.filter(o=>o.repUser===CU.username).reduce((s,o)=>s+(parseFloat(o.commission)||0),0);sub=`إجمالي العمولات: ${totComm.toLocaleString()} د.ع`;}
  else if(CU.type==='market_owner'){const myBuys=orders.filter(o=>o.shopName===CU.name);sub=`إجمالي مشترياتك: ${myBuys.reduce((s,o)=>s+(parseFloat(o.total)||0),0).toLocaleString()} د.ع`;}
  document.getElementById('walSub').textContent=sub;
  const actHtml=CU.type==='admin'
    ?`<button class="btn btn-sky" onclick="openPayForUser()">إدارة الرصيد</button>`
    :CU.type==='sales_manager'
    ?`<button class="btn btn-ghost" onclick="openPayForUser()">دفع عمولة</button>`:'';
  document.getElementById('walActs').innerHTML=actHtml;
  const txs=uo.transactions||[];
  document.getElementById('txList').innerHTML=txs.length
    ?[...txs].reverse().map(tx=>`
      <div class="tx-row tx-${tx.type}" style="display:flex;align-items:center;gap:11px">
        <div class="tx-ico">${tx.type==='credit'?'⬇️':'⬆️'}</div>
        <div style="flex:1"><div class="tx-desc">${tx.desc||'معاملة'}</div><div class="tx-date">${tsToStr(tx.date)}</div></div>
        <div class="tx-amt">${tx.type==='credit'?'+':'-'}${(parseFloat(tx.amount)||0).toLocaleString()} د.ع</div>
      </div>`).join('')
    :'<div style="text-align:center;color:rgba(9,50,87,.33);padding:28px">لا توجد معاملات</div>';
  loadPointsForUser();
}

// ✅ ENHANCED: Load points with progress bar toward next point
async function loadPointsForUser(){
  if(!CU||!fbReady) return;

  const uo = users.find(u=>u.username===CU.username) || CU;
  const totalEarned   = parseInt(uo.earnedPoints) || 0;
  const totalOrderAmt = parseFloat(uo.totalOrdersAmount) || 0;

  // Points from Firebase points collection (legacy support)
  const allPts = await fbGet('points');
  const myPts  = allPts.find(p=>p.userId===uo._id||p.username===CU.username);
  const redeemed = parseFloat(myPts?.redeemedPoints)||0;

  document.getElementById('ptsTotal').textContent = totalEarned.toLocaleString();
  document.getElementById('ptsRedeemed').textContent = redeemed.toLocaleString();

  // ✅ Progress bar toward next point
  const progressWrap = document.getElementById('ptsProgressWrap');
  if(CU.type==='rep'||CU.type==='market_owner') {
    const spent    = totalOrderAmt % POINTS_THRESHOLD; // remainder after last point
    const pct      = Math.min(100, (spent / POINTS_THRESHOLD) * 100);
    const remaining = POINTS_THRESHOLD - spent;
    document.getElementById('ptsProgFill').style.width = pct + '%';
    document.getElementById('ptsProgText').textContent =
      `${spent.toLocaleString()} / ${POINTS_THRESHOLD.toLocaleString()} د.ع (متبقي: ${remaining.toLocaleString()} د.ع)`;
    progressWrap.style.display = 'block';
  } else {
    progressWrap.style.display = 'none';
  }

  // Load history from sub-collection
  if(uo._id) {
    const hist = await fbGetSub('users', uo._id, 'pointsHistory');
    // Fallback to old points collection history
    const legacyHist = myPts ? await fbGetSub('points', uo._id, 'history').catch(()=>[]) : [];
    const allHist = [...hist, ...legacyHist].sort((a,b)=>{
      const da = a.createdAt?.seconds||0;
      const db_ = b.createdAt?.seconds||0;
      return db_ - da;
    });

    document.getElementById('ptsHistList').innerHTML = allHist.length
      ? allHist.map(h=>`
          <div class="pts-hist-row">
            <div>
              <span style="font-weight:700;color:var(--deep)">${h.type==='earn'?'اكتساب':'➖ استرداد'}</span>
              ${h.shopName?`<div style="font-size:.72rem;color:rgba(9,50,87,.45)">${h.shopName}${h.orderAmount?' — '+parseFloat(h.orderAmount).toLocaleString()+' د.ع':''}</div>`:''}
              <div style="font-size:.68rem;color:rgba(9,50,87,.38)">${tsToStr(h.date||h.createdAt)}</div>
            </div>
            <span style="font-size:1.05rem;font-weight:900;color:${h.type==='earn'?'var(--violet)':'var(--gold2)'}">${h.type==='earn'?'+':'-'}${h.points} ⭐</span>
          </div>`).join('')
      : '<div style="text-align:center;color:rgba(9,50,87,.33);padding:22px">لا يوجد سجل نقاط — ستُحتسب النقاط عند إتمام الطلبات</div>';
  }
}

function buildWalletKpi(){
  const uo=users.find(u=>u.username===CU?.username)||CU;
  if(!uo) return;
  let kpiHtml='';
  if(CU.type==='rep'){
    const myOrds=orders.filter(o=>o.repUser===CU.username);
    const totComm=myOrds.reduce((s,o)=>s+(parseFloat(o.commission)||0),0);
    const today=myOrds.filter(o=>isSameDay(o.date,new Date())).reduce((s,o)=>s+(parseFloat(o.commission)||0),0);
    const pts=parseInt(uo.earnedPoints)||0;
    kpiHtml=`<div class="kpi-card kpi-mint"><div class="kpi-icon">رصيد</div><div class="kpi-val">${totComm.toLocaleString()}</div><div class="kpi-lbl">إجمالي العمولات (د.ع)</div></div>
    <div class="kpi-card kpi-sky"><div class="kpi-icon">📅</div><div class="kpi-val">${today.toLocaleString()}</div><div class="kpi-lbl">عمولة اليوم (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo.balance||0).toLocaleString()}</div><div class="kpi-lbl">الرصيد المتاح (د.ع)</div></div>
    <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${pts}</div><div class="kpi-lbl">النقاط المتراكمة</div></div>`;
  } else if(CU.type==='market_owner'){
    const myBuys=orders.filter(o=>o.shopName===CU.name).reduce((s,o)=>s+(parseFloat(o.total)||0),0);
    const pts=parseInt(uo.earnedPoints)||0;
    kpiHtml=`<div class="kpi-card kpi-sky"><div class="kpi-icon">🛒</div><div class="kpi-val">${myBuys.toLocaleString()}</div><div class="kpi-lbl">إجمالي المشتريات (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo.balance||0).toLocaleString()}</div><div class="kpi-lbl">الرصيد المتاح (د.ع)</div></div>
    <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${pts}</div><div class="kpi-lbl">النقاط المتراكمة</div></div>`;
  } else if(CU.type==='admin'||CU.type==='sales_manager'){
    const totComm=orders.reduce((s,o)=>s+(parseFloat(o.commission)||0),0);
    kpiHtml=`<div class="kpi-card kpi-mint"><div class="kpi-icon">رصيد</div><div class="kpi-val">${totComm.toLocaleString()}</div><div class="kpi-lbl">إجمالي العمولات المدفوعة (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">💰</div><div class="kpi-val">${parseFloat(uo.balance||0).toLocaleString()}</div><div class="kpi-lbl">رصيدك (د.ع)</div></div>`;
  }
  document.getElementById('walKpi').innerHTML=kpiHtml;
}

function switchWalTab(tab,btn){
  document.querySelectorAll('#walTabs .tab').forEach(t=>t.classList.remove('on'));btn.classList.add('on');
  document.getElementById('walTabTxs').classList.toggle('on',tab==='txs');
  document.getElementById('walTabDisc').classList.toggle('on',tab==='disc');
  document.getElementById('walTabPts').classList.toggle('on',tab==='pts');
  if(tab==='disc') renderDiscounts();
  if(tab==='pts')  loadPointsForUser();
}

function openPayForUser(preUsername){
  if(preUsername){openPayModal(preUsername);return;}
  const selectable=users.filter(u=>u.type==='rep'||u.type==='market_owner'||u.type==='sales_manager');
  if(!selectable.length){toast('لا يوجد مستخدمون',false);return;}
  const opts=selectable.map(u=>`
    <div class="user-item" style="cursor:pointer" onclick="closeModal('pickUserModal');openPayModal('${u.username}')">
      <div class="ui-av">${u.type==='rep'?'🤝':'🏪'}</div>
      <div class="ui-info"><div class="ui-name">${u.name}</div><div class="ui-meta"><span>${ROLES[u.type]||u.type}</span><span>@${u.username}</span></div></div>
      <div class="ui-bal">${parseFloat(u.balance||0).toLocaleString()} <span style="font-size:.6rem;color:rgba(9,50,87,.33)">د.ع</span></div>
    </div>`).join('');
  document.getElementById('pickUserList').innerHTML=opts;
  openModal('pickUserModal');
}

function openPayModal(username){
  const uo=users.find(u=>u.username===username);if(!uo) return;
  document.getElementById('payUserName').textContent=`${ROLES[uo.type]||uo.type} — ${uo.name} (@${uo.username})`;
  document.getElementById('payBal').textContent=parseFloat(uo.balance||0).toLocaleString()+' د.ع';
  document.getElementById('payAmt').value='';
  document.getElementById('payDesc').value='';
  document.getElementById('payTarget').value=username;
  openModal('payModal');
}

async function doPayment(){
  const amt=parseFloat(document.getElementById('payAmt').value)||0;
  const type=document.getElementById('payType').value;
  const desc=document.getElementById('payDesc').value.trim()||'معاملة يدوية';
  const target=document.getElementById('payTarget').value;
  const uo=users.find(u=>u.username===target);
  if(!uo||amt<=0){toast('أدخل مبلغاً صحيحاً',false);return;}
  if(type==='debit'&&amt>(uo.balance||0)){toast('الرصيد غير كافٍ',false);return;}
  uo.balance=type==='credit'?(uo.balance||0)+amt:(uo.balance||0)-amt;
  uo.transactions=uo.transactions||[];
  const tx={type,amount:amt,desc,date:new Date().toLocaleDateString('ar-IQ')};
  uo.transactions.push(tx);
  if(CU&&uo.username===CU.username) CU.balance=uo.balance;
  if(uo._id){
    await fbUpdate('users',uo._id,{balance:uo.balance}).catch(()=>{});
    await fbAddSub('users',uo._id,'transactions',tx).catch(()=>{});
  }
  closeModal('payModal');
  toast(`✅ ${type==='credit'?'إيداع':'➖ سحب'} ${amt.toLocaleString()} د.ع لـ ${uo.name}`);
  buildWalletPage();renderUsersList();updateWalletBar();
}

// ═══════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════
function renderInventory(){
  document.getElementById('inv_all').textContent=products.length;
  document.getElementById('inv_low').textContent=products.filter(p=>p.stock>0&&p.stock<p.minStock).length;
  document.getElementById('inv_out').textContent=products.filter(p=>p.stock===0).length;
  document.getElementById('invBody').innerHTML=products.map(p=>{
    const pct=p.minStock>0?Math.min(100,(p.stock/p.minStock)*50):50;
    const cls=p.stock===0?'sf-out':p.stock<p.minStock?'sf-low':'sf-ok';
    const bc=p.stock===0?'b-red':p.stock<p.minStock?'b-gold':'b-green';
    const bl=p.stock===0?'🚫 نفاد':p.stock<p.minStock?'⚠️ منخفض':'✅ كافٍ';
    return `<tr>
      <td style="font-weight:700;color:var(--deep)">${p.name}</td>
      <td><span class="badge b-sky">${p.cat}</span></td>
      <td><div style="display:flex;align-items:center;gap:7px">
        <span style="font-weight:900;min-width:26px;color:var(--deep)">${p.stock===999?'∞':p.stock}</span>
        <div class="stock-bar" style="flex:1;max-width:80px"><div class="stock-fill ${cls}" style="width:${pct}%"></div></div>
      </div></td>
      <td>${p.minStock}</td>
      <td><span class="badge ${bc}">${bl}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openStockEdit(${p.idx})">مخزون</button></td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════
// PURCHASES
// ═══════════════════════════════════════════════════════
function initPurItems(){purItems=[{product:'',qty:1,unitPrice:0}];renderPurItemsUI();}
function addPurItem(){purItems.push({product:'',qty:1,unitPrice:0});renderPurItemsUI();}
function renderPurItemsUI(){
  document.getElementById('purItemsWrap').innerHTML=purItems.map((item,i)=>`
    <div class="pur-item-row">
      <select class="fsel" style="font-size:.8rem;padding:7px 9px" onchange="purChange(${i},'product',this.value)">
        <option value="">اختر منتج</option>
        ${products.map(p=>`<option value="${p.name}" ${item.product===p.name?'selected':''}>${p.name}</option>`).join('')}
      </select>
      <input type="number" class="fi" style="font-size:.8rem;padding:7px" placeholder="الكمية" value="${item.qty}" min="1" oninput="purChange(${i},'qty',this.value);calcPur()">
      <input type="number" class="fi" style="font-size:.8rem;padding:7px" placeholder="سعر الوحدة" value="${item.unitPrice||''}" oninput="purChange(${i},'unitPrice',this.value);calcPur()">
      <button class="btn btn-danger btn-sm" onclick="purItems.splice(${i},1);renderPurItemsUI()">✕</button>
    </div>`).join('');
  calcPur();
}
function purChange(i,f,v){purItems[i][f]=f==='product'?v:(parseFloat(v)||0);}
function calcPur(){document.getElementById('purTotalVal').textContent=purItems.reduce((s,i)=>s+i.qty*i.unitPrice,0).toLocaleString();}

async function savePurchase(){
  const sup=document.getElementById('pur_sup').value.trim();
  const date=document.getElementById('pur_date').value;
  if(!sup){toast('أدخل اسم المورد',false);return;}
  if(!purItems.length||!purItems[0].product){toast('أضف منتجاً على الأقل',false);return;}
  const total=purItems.reduce((s,i)=>s+i.qty*i.unitPrice,0);
  for(const item of purItems){
    if(!item.product) continue;
    const p=products.find(x=>x.name===item.product);
    if(p){
      p.stock+=Math.floor(item.qty);
      if(p._id) await fbUpdate('products',p._id,{stock:p.stock}).catch(()=>{});
    }
  }
  const purId='PUR'+String(Date.now()).slice(-6);
  await fbAdd('purchases',{
    purId, date, supplier:sup,
    items:purItems.map(i=>({product:i.product,qty:i.qty,unitPrice:i.unitPrice})),
    total, createdBy:CU?.name||'—'
  });
  purInvoices.push({id:purId,date,supplier:sup,items:[...purItems],total,user:CU?.name||'—'});
  closeModal('purchaseModal');
  toast('تم حفظ الفاتورة وتحديث المخزون');
  renderInventory();renderPurchaseList();renderManageProds();renderStore('الكل');
}

function renderPurchaseList(){
  document.getElementById('purBody').innerHTML=[...purInvoices].reverse().map(inv=>`
    <tr><td style="font-weight:700">${inv.id}</td><td>${inv.date}</td><td>${inv.supplier}</td>
    <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(9,50,87,.48)">${inv.items.map(i=>`${i.product}×${i.qty}`).join('، ')}</td>
    <td style="font-weight:800;color:var(--dark)">${inv.total.toLocaleString()} د.ع</td>
    <td>${inv.user}</td></tr>`).join('')
  ||'<tr><td colspan="6" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد فواتير</td></tr>';
}

function renderSalesList(){
  document.getElementById('salBody').innerHTML=[...orders].reverse().map((o,i)=>`
    <tr>
      <td style="font-weight:700">${o.id||`INV${i+1}`}</td>
      <td>${o.date}</td>
      <td style="font-weight:700;color:var(--deep)">${o.shopName||'—'}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(9,50,87,.48)">${o.products}</td>
      <td style="font-weight:800;color:var(--dark)">${(parseFloat(o.total)||0).toLocaleString()} د.ع</td>
      <td>${o.repName||'—'}</td>
    </tr>`).join('')
  ||'<tr><td colspan="6" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد فواتير</td></tr>';
}

function switchInvTab(tab,btn){
  document.querySelectorAll('.tabs .tab').forEach(t=>t.classList.remove('on'));btn.classList.add('on');
  document.getElementById('tabPur').classList.toggle('on',tab==='pur');
  document.getElementById('tabSal').classList.toggle('on',tab==='sal');
}

// ═══════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════
function renderUsersList(){
  document.getElementById('usersList').innerHTML=users.map((u,i)=>`
    <div class="user-item">
      <div class="ui-av">${u.type==='admin'?'🛡️':u.type==='rep'?'🤝':u.type==='sales_manager'?'📊':'🏪'}</div>
      <div class="ui-info">
        <div class="ui-name">${u.name}</div>
        <div class="ui-meta"><span>${ROLES[u.type]||u.type}</span><span>@${u.username}</span>${u.phone?`<span>📞 ${u.phone}</span>`:''}<span>عمولة: ${u.commPct}%</span>${(parseInt(u.earnedPoints)||0)>0?`<span>⭐ ${u.earnedPoints} نقطة</span>`:''}</div>
      </div>
      <div class="ui-bal">${parseFloat(u.balance||0).toLocaleString()} <span style="font-size:.6rem;color:rgba(9,50,87,.33)">د.ع</span></div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="openEditUser(${i})">تعديل</button>
        <button class="btn btn-sky btn-sm" onclick="openPayForUser('${u.username}')">رصيد</button>
        ${CU?.type==='admin'?`<button class="btn btn-sm" style="background:rgba(244,63,94,.09);color:#e11d48;border:1px solid rgba(244,63,94,.18)" onclick="deleteUser('${u._id}','${u.username}')">حذف</button>`:''}
      </div>
    </div>`).join('');
}

async function deleteUser(fbid, username) {
  if (CU?.type !== 'admin') return;
  if (!confirm(`حذف المستخدم "${username}"؟ لا يمكن التراجع.`)) return;
  if (fbid) await fbDel('users', fbid).catch(()=>{});
  users = users.filter(u => u._id !== fbid && u.username !== username);
  renderUsersList();
  toast('تم حذف المستخدم');
}

function openAddUser(){
  document.getElementById('userModalTitle').textContent='إضافة مستخدم جديد';
  document.getElementById('um_idx').value='';
  document.getElementById('um_fbid').value='';
  ['um_name','um_user','um_pass','um_phone'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('um_type').value='rep';
  document.getElementById('um_comm').value='5';
  document.getElementById('um_bal').value='0';
  openModal('userModal');
}

function openEditUser(i){
  const u=users[i];
  document.getElementById('userModalTitle').textContent='تعديل المستخدم';
  document.getElementById('um_idx').value=i;
  document.getElementById('um_fbid').value=u._id||'';
  document.getElementById('um_name').value=u.name;
  document.getElementById('um_user').value=u.username;
  document.getElementById('um_pass').value=u.password;
  document.getElementById('um_type').value=u.type;
  document.getElementById('um_phone').value=u.phone||'';
  document.getElementById('um_comm').value=u.commPct||0;
  document.getElementById('um_bal').value=u.balance||0;
  openModal('userModal');
}

async function saveUser(){
  const name=document.getElementById('um_name').value.trim();
  const username=document.getElementById('um_user').value.trim();
  const password=document.getElementById('um_pass').value.trim();
  const type=document.getElementById('um_type').value;
  const phone=document.getElementById('um_phone').value.trim();
  const commPct=parseFloat(document.getElementById('um_comm').value)||0;
  const balance=parseFloat(document.getElementById('um_bal').value)||0;
  const idx=document.getElementById('um_idx').value;
  const fbid=document.getElementById('um_fbid').value;
  if(!name||!username||!password){toast('الاسم واليوزر وكلمة المرور مطلوبة',false);return;}
  const userData={name,username,password,accountType:type,phone,commPct,status:'active',balance,totalBuys:0};
  if(idx!==''){
    users[parseInt(idx)]={...users[parseInt(idx)],...userData,type,_id:fbid};
    if(fbid) await fbUpdate('users',fbid,userData).catch(()=>{});
    toast('تم تحديث المستخدم');
  } else {
    if(users.find(u=>u.username.toLowerCase()===username.toLowerCase())){toast('اسم المستخدم مستخدم مسبقاً',false);return;}
    const newFbId=await fbAdd('users',{...userData,transactions:[],earnedPoints:0,totalOrdersAmount:0});
    users.push({...userData,type,_id:newFbId||'',transactions:[],earnedPoints:0,totalOrdersAmount:0});
    toast('تم إضافة المستخدم');
  }
  closeModal('userModal');renderUsersList();
}

// ═══════════════════════════════════════════════════════
// MANAGE PRODUCTS + IMAGE UPLOAD
// ═══════════════════════════════════════════════════════
function renderManageProds(){
  document.getElementById('manageProdsBody').innerHTML=products.map((p,i)=>`
    <tr>
      <td><img src="${p.img}" style="width:40px;height:40px;object-fit:cover;border-radius:var(--r8);border:1px solid rgba(0,0,0,.07)" onerror="this.src='https://via.placeholder.com/42?text=📦'"></td>
      <td style="font-weight:700;color:var(--deep)">${p.name}</td>
      <td><span class="badge b-sky">${p.cat}</span></td>
      <td style="font-weight:800;color:var(--dark)">${p.price.toLocaleString()} د.ع</td>
      <td><span class="${p.stock===0?'badge b-red':p.stock<p.minStock?'badge b-gold':'badge b-green'}">${p.stock===999?'∞':p.stock}</span>
        <button class="btn btn-ghost btn-sm" style="margin-right:4px" onclick="openStockEdit(${p.idx})">مخزون</button></td>
      <td><span class="badge ${p.status==='active'?'b-green':'b-red'}">${p.status==='active'?'🟢 متوفر':'🔴 متوقف'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openEditProd(${i})">تعديل</button></td>
    </tr>`).join('');
}

function openAddProd(){
  document.getElementById('peTitle').textContent='إضافة منتج';
  document.getElementById('pe_idx').value='';document.getElementById('pe_fbid').value='';
  ['pe_name','pe_cat','pe_price','pe_wholesale_price','pe_img','pe_det'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const ruEl=document.getElementById('pe_retail_unit'); if(ruEl) ruEl.value='قطعة';
  document.getElementById('pe_stock').value='0';
  document.getElementById('pe_min').value='10';
  document.getElementById('pe_status').value='active';
  document.getElementById('pePreview').src='https://via.placeholder.com/100?text=📦';
  document.getElementById('peFile').value='';
  document.getElementById('peFileLabel').textContent='أو ارفع صورة هنا (سيتم رفعها على Firebase)';
  document.getElementById('uploadProgress').style.display='none';
  _uploadedImgUrl = '';
  openModal('prodEditModal');
}

function openEditProd(i){
  const p=products[i];
  document.getElementById('peTitle').textContent='تعديل منتج';
  document.getElementById('pe_idx').value=i;
  document.getElementById('pe_fbid').value=p._id||'';
  document.getElementById('pe_name').value=p.name;
  document.getElementById('pe_cat').value=p.cat;
  document.getElementById('pe_price').value=p.price;
  const wsEl=document.getElementById('pe_wholesale_price'); if(wsEl) wsEl.value=p.wholesalePrice||'';
  const ruEl2=document.getElementById('pe_retail_unit'); if(ruEl2) ruEl2.value=p.retailUnit||'قطعة';
  document.getElementById('pe_img').value=p.img;
  document.getElementById('pe_stock').value=p.stock||0;
  document.getElementById('pe_min').value=p.minStock||10;
  document.getElementById('pe_det').value=p.detail;
  document.getElementById('pe_status').value=p.status;
  document.getElementById('pePreview').src=p.img;
  document.getElementById('peFile').value='';
  document.getElementById('uploadProgress').style.display='none';
  _uploadedImgUrl = p.img;
  openModal('prodEditModal');
}

function peImgPreview(){
  const u=document.getElementById('pe_img').value.trim();
  if(u){ document.getElementById('pePreview').src=fixDrive(u); _uploadedImgUrl=fixDrive(u); }
}

async function peFileChosen(e){
  const file = e.target.files[0];
  if(!file) return;

  // عرض معاينة محلية فورية
  const rd = new FileReader();
  rd.onload = ev => { document.getElementById('pePreview').src = ev.target.result; };
  rd.readAsDataURL(file);

  const prog = document.getElementById('uploadProgress');
  const fill = document.getElementById('uploadFill');
  const txt  = document.getElementById('uploadTxt');
  prog.style.display = 'block';
  txt.textContent = 'جاري الرفع على ImgBB...';
  fill.style.width = '15%';

  try {
    // تحويل الصورة إلى Base64
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('فشل قراءة الملف'));
      r.readAsDataURL(file);
    });

    fill.style.width = '40%';
    txt.textContent = 'جاري الرفع...';

    // رفع على ImgBB
    const formData = new FormData();
    formData.append('image', base64);
    formData.append('key', IMGBB_API_KEY);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    fill.style.width = '85%';

    if(!response.ok) throw new Error('فشل الاتصال بـ ImgBB');

    const data = await response.json();

    if(!data.success) throw new Error(data.error?.message || 'فشل الرفع على ImgBB');

    const url = data.data.url;
    fill.style.width = '100%';
    fill.style.background = 'linear-gradient(90deg, var(--mint), var(--teal))';
    txt.textContent = 'تم الرفع بنجاح على ImgBB!';

    _uploadedImgUrl = url;
    document.getElementById('pe_img').value = url;
    document.getElementById('pePreview').src = url;
    document.getElementById('peFileLabel').textContent = 'تم رفع الصورة بنجاح';

    setTimeout(() => {
      prog.style.display = 'none';
      fill.style.background = '';
      fill.style.width = '0%';
    }, 2500);

  } catch(err) {
    console.error('ImgBB upload error:', err);
    fill.style.background = 'var(--rose)';
    fill.style.width = '100%';
    txt.textContent = '❌ فشل الرفع: ' + err.message;
    setTimeout(() => {
      prog.style.display = 'none';
      fill.style.background = '';
      fill.style.width = '0%';
    }, 3500);
  }
}
async function saveProd(){
  const name=document.getElementById('pe_name').value.trim();
  const cat=document.getElementById('pe_cat').value.trim();
  const price=parseFloat(document.getElementById('pe_price').value)||0;
  const wholesalePrice=parseFloat(document.getElementById('pe_wholesale_price')?.value)||0;
  const retailUnit=(document.getElementById('pe_retail_unit')?.value.trim())||'قطعة';
  const imgRaw=document.getElementById('pe_img').value.trim();
  const stock=parseInt(document.getElementById('pe_stock').value)||0;
  const minStock=parseInt(document.getElementById('pe_min').value)||10;
  const detail=document.getElementById('pe_det').value.trim();
  const status=document.getElementById('pe_status').value;
  const idx=document.getElementById('pe_idx').value;
  const fbid=document.getElementById('pe_fbid').value;
  if(!name||!cat||!price){toast('الاسم والتصنيف والسعر مطلوبة',false);return;}
  const img = _uploadedImgUrl || (imgRaw ? fixDrive(imgRaw) : 'https://via.placeholder.com/200?text=📦');
  // ── أبعاد الكرتون ──
  const carton_l = parseFloat(document.getElementById('pe_carton_l')?.value)||0;
  const carton_w = parseFloat(document.getElementById('pe_carton_w')?.value)||0;
  const carton_h = parseFloat(document.getElementById('pe_carton_h')?.value)||0;
  const carton_volume = (carton_l&&carton_w&&carton_h) ? parseFloat(((carton_l*carton_w*carton_h)/1000000).toFixed(6)) : 0;
  const carton_weight = parseFloat(document.getElementById('pe_carton_weight')?.value)||0;
  // ── التعبئة والسماحيات ──
  const {packaging, packagingFractions} = readProdPackagingValues();
  const prodData = {
    name, category:cat, price, wholesalePrice, retailUnit, image:img, detail, status, stock, minStock,
    carton_l, carton_w, carton_h, carton_volume, carton_weight,
    packaging: packaging||{}, packagingFractions: packagingFractions||{}
  };
  const localData = {
    name, cat, price, wholesalePrice, retailUnit, img, detail, status, stock, minStock,
    carton_l, carton_w, carton_h, carton_volume, carton_weight,
    packaging: packaging||{}, packagingFractions: packagingFractions||{}
  };
  if(idx!==''){
    products[parseInt(idx)] = {...products[parseInt(idx)], ...localData};
    if(fbid) await fbUpdate('products', fbid, prodData).catch(e=>console.warn('saveProd edit err:',e));
    toast('تم تعديل المنتج');
  } else {
    const newFbId = await fbAdd('products', prodData);
    products.push({idx:products.length, _id:newFbId||'', ...localData});
    toast('تم إضافة المنتج');
  }
  _uploadedImgUrl = '';
  closeModal('prodEditModal');
  renderManageProds(); renderStore('الكل'); renderCats(); renderInventory();
}

// ═══════════════════════════════════════════════════════
// STOCK EDIT
// ═══════════════════════════════════════════════════════
function openStockEdit(idx){
  const p=products.find(x=>x.idx===idx);if(!p) return;
  document.getElementById('stockProdName').textContent='🛍️ '+p.name;
  document.getElementById('stock_qty').value=p.stock===999?0:p.stock;
  document.getElementById('stock_min').value=p.minStock||10;
  document.getElementById('stock_idx').value=idx;
  openModal('stockModal');
}

async function saveStockEdit(){
  const idx=parseInt(document.getElementById('stock_idx').value);
  const qty=parseInt(document.getElementById('stock_qty').value)||0;
  const minStock=parseInt(document.getElementById('stock_min').value)||10;
  const p=products.find(x=>x.idx===idx);if(!p) return;
  p.stock=qty;p.minStock=minStock;
  if(p._id) await fbUpdate('products',p._id,{stock:qty,minStock}).catch(()=>{});
  closeModal('stockModal');
  toast(`تم تحديث مخزون "${p.name}" إلى ${qty}`);
  renderInventory();renderManageProds();renderStore('الكل');
}

// ═══════════════════════════════════════════════════════
// DISCOUNTS
// ═══════════════════════════════════════════════════════
async function renderDiscounts(){
  if(!CU) return;
  const isAdmin=CU.type==='admin'||CU.type==='sales_manager';
  if(!discounts.length) discounts=await fbGet('discounts');
  const list=isAdmin?discounts:discounts.filter(d=>d.shopUsername===CU.username);
  document.getElementById('discBody').innerHTML=list.length
    ?[...list].reverse().map(d=>`
      <tr><td>${tsToStr(d.date)}</td>
      <td style="font-weight:700;color:var(--deep)">${d.shopName}</td>
      <td><span class="badge b-gold">${d.type==='percent'?`${d.amount}%`:'مبلغ ثابت'}</span></td>
      <td style="font-weight:900;color:var(--rose)">− ${(parseFloat(d.finalAmt)||0).toLocaleString()} د.ع</td>
      <td style="color:rgba(9,50,87,.52)">${d.desc}</td></tr>`).join('')
    :'<tr><td colspan="5" style="text-align:center;padding:28px;color:rgba(9,50,87,.33)">لا توجد خصومات</td></tr>';
}

function openDiscModal(){
  const markets=users.filter(u=>u.type==='market_owner');
  const sel=document.getElementById('disc_user');
  sel.innerHTML='<option value="">— اختر —</option>'+markets.map(u=>`<option value="${u.username}">${u.name} — رصيد: ${parseFloat(u.balance||0).toLocaleString()} د.ع</option>`).join('');
  document.getElementById('disc_bal_box').style.display='none';
  document.getElementById('disc_preview').style.display='none';
  document.getElementById('disc_base_wrap').style.display='none';
  ['disc_amt','disc_base','disc_desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('disc_type').value='amount';
  discTypeChanged();openModal('discModal');
}

function discUserChanged(){
  const un=document.getElementById('disc_user').value;
  const uo=users.find(u=>u.username===un);
  const box=document.getElementById('disc_bal_box');
  if(uo){document.getElementById('disc_bal_val').textContent=parseFloat(uo.balance||0).toLocaleString()+' د.ع';box.style.display='block';}
  else box.style.display='none';
  calcDiscPreview();
}

function discTypeChanged(){
  const t=document.getElementById('disc_type').value;
  document.getElementById('disc_amt_label').textContent=t==='percent'?'النسبة (%) *':'المبلغ (د.ع) *';
  document.getElementById('disc_base_wrap').style.display=t==='percent'?'block':'none';
  calcDiscPreview();
}

function calcDiscPreview(){
  const t=document.getElementById('disc_type').value;
  const amt=parseFloat(document.getElementById('disc_amt').value)||0;
  const base=parseFloat(document.getElementById('disc_base').value)||0;
  const prev=document.getElementById('disc_preview');
  const finalAmt=t==='percent'?Math.round(base*amt/100):amt;
  if(finalAmt>0){prev.style.display='block';prev.textContent=`قيمة الخصم: ${finalAmt.toLocaleString()} د.ع`;}
  else prev.style.display='none';
}

async function saveDiscount(){
  const un=document.getElementById('disc_user').value;
  const t=document.getElementById('disc_type').value;
  const amt=parseFloat(document.getElementById('disc_amt').value)||0;
  const base=parseFloat(document.getElementById('disc_base').value)||0;
  const desc=document.getElementById('disc_desc').value.trim();
  const uo=users.find(u=>u.username===un);
  if(!uo){toast('اختر الماركت',false);return;}
  if(!amt){toast('أدخل قيمة',false);return;}
  if(!desc){toast('أدخل السبب',false);return;}
  const finalAmt=t==='percent'?Math.round(base*amt/100):amt;
  if(finalAmt<=0){toast('القيمة يجب أن تكون أكبر من صفر',false);return;}
  const nowDate=new Date().toLocaleDateString('ar-IQ');
  uo.balance=(uo.balance||0)-finalAmt;
  uo.transactions=uo.transactions||[];
  const tx={type:'debit',amount:finalAmt,desc:`🏷️ خصم: ${desc}`,date:nowDate};
  uo.transactions.push(tx);
  const disc={date:nowDate,shopUsername:un,shopName:uo.name,type:t,amount:amt,finalAmt,desc};
  discounts.push({...disc,_id:'D'+Date.now()});
  await fbAdd('discounts',disc);
  if(uo._id){
    await fbUpdate('users',uo._id,{balance:uo.balance}).catch(()=>{});
    await fbAddSub('users',uo._id,'transactions',tx).catch(()=>{});
  }
  closeModal('discModal');
  toast(`تم تطبيق خصم ${finalAmt.toLocaleString()} د.ع على ${uo.name}`);
  buildWalletPage();renderDiscounts();renderUsersList();updateWalletBar();
}

// ═══════════════════════════════════════════════════════
// OFFERS
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// OFFERS — نظام عروض متكامل
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// OFFERS — نظام عروض متكامل مع صلاحيات واستخدامات
// ═══════════════════════════════════════════════════════

let comboItemCount = 0;

/* ── helpers ── */
function getOfferIcon(type) {
  return {pct_any:'📊',pct_prod:'📊',amt_any:'💰',amt_prod:'💰',buy_get:'🎁',buy_combo:'🛒'}[type]||'🎁';
}
function getOfferTypeName(type) {
  return {pct_any:'خصم % على أي منتج',pct_prod:'خصم % على منتج محدد',
          amt_any:'خصم مبلغ على أي منتج',amt_prod:'خصم مبلغ على منتج محدد',
          buy_get:'اشتري X واحصل Y مجاناً',buy_combo:'اشتري مجموعة واحصل هدية'}[type]||type;
}

/* هل العرض متاح للمستخدم الحالي؟ */
function isOfferForMe(o) {
  if(!CU) return false;
  const t = o.targetType||'all';
  if(t==='all') return true;
  if(t==='all_reps')    return CU.type==='rep';
  if(t==='all_markets') return CU.type==='market_owner';
  if(t==='specific')    return (o.targetUsers||[]).includes(CU.username||CU._id);
  return false;
}

/* كم مرة استخدم المستخدم الحالي هذا العرض؟ */
function myOfferUses(o) {
  const usages = o.usages || {};
  return usages[CU?.username||CU?._id||''] || 0;
}

/* هل الرصيد انتهى للمستخدم الحالي؟ */
function isOfferExhausted(o) {
  const maxPer = parseInt(o.maxUsesPerUser)||1;
  return myOfferUses(o) >= maxPer;
}

/* إجمالي الاستخدامات */
function totalOfferUses(o) {
  return Object.values(o.usages||{}).reduce((s,v)=>s+(v||0),0);
}

/* هل انتهت صلاحية العرض؟ */
function isOfferExpired(o) {
  if (!o.to) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(o.to) < today;
}

/* منتقي صور المنتجات */
function buildOfferImgPicker() {
  const wrap   = document.getElementById('offProdImgWrap');
  const picker = document.getElementById('offProdImgPicker');
  if (!wrap || !picker) return;
  const imgs = products.filter(p => p.img).map(p => ({img:p.img, name:p.name}));
  if (!imgs.length) { wrap.style.display='none'; return; }
  wrap.style.display='block';
  picker.innerHTML = imgs.map(p =>
    `<img class="prod-img-thumb" src="${p.img}" alt="${p.name}" title="${p.name}" onclick="selectOfferImg('${p.img}',this)">`
  ).join('');
  // mark selected if already chosen
  const cur = document.getElementById('off_img').value;
  if (cur) {
    picker.querySelectorAll('.prod-img-thumb').forEach(el => {
      if (el.src === cur) el.classList.add('selected');
    });
  }
}

function selectOfferImg(url, el) {
  document.getElementById('off_img').value = url;
  const preview = document.getElementById('off_img_preview');
  preview.src = url;
  preview.style.display = 'block';
  document.getElementById('offImgLabel').textContent = 'تم اختيار الصورة';
  document.querySelectorAll('#offProdImgPicker .prod-img-thumb').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
}

/* رفع صورة العرض على ImgBB */
async function uploadOfferImg(input) {
  const file = input.files[0]; if (!file) return;
  const label = document.getElementById('offImgLabel');
  const preview = document.getElementById('off_img_preview');
  label.textContent = '⏳ جاري الرفع...';
  try {
    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = () => rej();
      r.readAsDataURL(file);
    });
    const fd = new FormData();
    fd.append('image', base64);
    fd.append('key', IMGBB_API_KEY);
    const resp = await fetch('https://api.imgbb.com/1/upload', {method:'POST', body:fd});
    const data = await resp.json();
    if (!data.success) throw new Error();
    const url = data.data.url;
    document.getElementById('off_img').value = url;
    preview.src = url;
    preview.style.display = 'block';
    label.textContent = 'تم رفع الصورة';
  } catch {
    label.textContent = '❌ فشل الرفع — حاول مرة أخرى';
    toast('فشل رفع صورة العرض', false);
  }
}

/* نص قيمة العرض */
function offerValueSummary(o) {
  if(o.type==='pct_any'||o.type==='pct_prod') return `خصم ${o.value}%${o.prodName?' على '+o.prodName:' على أي منتج'}`;
  if(o.type==='amt_any'||o.type==='amt_prod') return `خصم ${(parseFloat(o.value)||0).toLocaleString()} د.ع${o.prodName?' على '+o.prodName:' على أي منتج'}`;
  if(o.type==='buy_get') return `اشتري ${o.buyQty||'X'} واحصل ${o.freeQty||1} مجاناً${o.prodName?' من '+o.prodName:''}`;
  if(o.type==='buy_combo') {
    const items=(o.comboItems||[]).map(i=>`${i.name}×${i.qty}`).join(' + ');
    const rew = o.comboReward==='free_prod'?`${o.comboFreeProd} مجاناً`
              : o.comboReward==='pct'?`خصم ${o.comboVal}%`:`خصم ${(o.comboVal||0).toLocaleString()} د.ع`;
    return `اشتري (${items}) واحصل على ${rew}`;
  }
  return '';
}

/* ── render ── */
function renderOffers() {
  const isAdmin = CU && (CU.type==='admin'||CU.type==='sales_manager');
  const addWrap = document.getElementById('addOfferWrap');
  if(addWrap) addWrap.style.display = isAdmin ? 'flex' : 'none';

  let visible;
  if(isAdmin) {
    visible = offers; // الأدمن يشوف الكل
  } else if(CU) {
    const key = CU.username||CU._id||'';
    // المستخدم يشوف: العروض النشطة الخاصة به + عروضه المنتهية التي كان قد فعّلها
    const active  = offers.filter(o => o.status==='active' && !isOfferExpired(o) && isOfferForMe(o));
    const expired = offers.filter(o => isOfferExpired(o) && (o.claims||{})[key]);
    visible = [...active, ...expired];
  } else {
    // زائر — يشوف العروض العامة بدون زر استخدام
    visible = offers.filter(o => o.status==='active' && !isOfferExpired(o) && (o.targetType==='all'||!o.targetType));
  }

  if(!visible.length) {
    document.getElementById('offersList').innerHTML = `
      <div style="text-align:center;padding:60px;color:rgba(9,50,87,.35)">
        <div style="font-size:2.5rem;margin-bottom:10px">🎁</div>
        <p>${CU?'لا توجد عروض متاحة لك حالياً':'لا توجد عروض متاحة حالياً'}</p>
      </div>`;
    return;
  }

  document.getElementById('offersList').innerHTML = visible.map(o => {
    const myUses    = myOfferUses(o);
    const maxPer    = parseInt(o.maxUsesPerUser)||1;
    const exhausted = CU && isOfferExhausted(o);
    const totUses   = totalOfferUses(o);
    const totMax    = parseInt(o.totalMaxUses)||0;
    const totExhausted = totMax>0 && totUses>=totMax;
    const expired   = isOfferExpired(o);
    const done      = exhausted || totExhausted || expired;

    // شريط التقدم لكل عرض
    const progressPct = maxPer>0 ? Math.min(100, Math.round(myUses/maxPer*100)) : 0;

    // الجمهور المستهدف
    let targetLabel = '';
    if(o.targetType==='all')              targetLabel = '🌐 للجميع';
    else if(o.targetType==='all_reps')    targetLabel = '🤝 كل المندوبين';
    else if(o.targetType==='all_markets') targetLabel = '🏪 كل الماركتات';
    else if(o.targetType==='specific') {
      const names = (o.targetUsers||[]).join('، ');
      targetLabel = `${names}`;
    }

    return `
    <div class="offer-card ${expired?'offer-expired-card':''}${done&&!expired?'offer-done':''}">
      <div class="offer-card-header">
        ${o.img
          ? `<img class="offer-card-img" src="${o.img}" alt="${o.title}">`
          : `<div style="font-size:1.8rem;line-height:1;width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(245,158,11,.04));border-radius:var(--r12);flex-shrink:0">${getOfferIcon(o.type)}</div>`}
        <div style="flex:1;min-width:0">
          <div class="offer-title">${o.title}</div>
          <div style="font-size:.75rem;color:var(--teal2);font-weight:700;margin-top:3px">${getOfferTypeName(o.type)}</div>
          <div style="font-size:.72rem;color:rgba(9,50,87,.5);margin-top:2px">${offerValueSummary(o)}</div>
          ${o.desc?`<div class="offer-desc" style="margin-top:4px">${o.desc}</div>`:''}
        </div>
        <div style="text-align:left;min-width:90px">
          ${expired
            ? `<span class="badge-exp">⏰ منتهي</span>`
            : `<span class="badge ${o.status==='active'?'b-green':'b-red'}">${o.status==='active'?'🟢 نشط':'🔴 موقف'}</span>`}
          ${isAdmin?`<div style="font-size:.68rem;color:rgba(9,50,87,.4);margin-top:4px">استُخدم ${totUses} مرة${totMax?'/'+totMax:''}</div>`:''}
          ${isAdmin?`<button class="btn btn-ghost btn-sm" style="margin-top:6px;padding:3px 9px;font-size:.72rem" onclick="openEditOffer('${o._id}')">تعديل</button>`:''}
        </div>
      </div>
      <div class="offer-card-body">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:.72rem;color:rgba(9,50,87,.45)">
          ${targetLabel?`<span>${targetLabel}</span>`:''}
          ${o.from||o.to?`<span>📅 ${o.from?'من '+o.from:''}${o.to?' — إلى '+o.to:''}</span>`:''}
          ${CU&&!isAdmin?`<span>✅ استخدمت ${myUses}/${maxPer} مرة</span>`:''}
        </div>
        ${CU&&!isAdmin?`
        <div style="margin:8px 0 2px;background:rgba(13,148,136,.08);border-radius:var(--r99);height:6px;overflow:hidden">
          <div style="height:100%;width:${progressPct}%;background:${progressPct>=100||expired?'var(--rose)':'var(--teal2)'};border-radius:var(--r99);transition:width .3s"></div>
        </div>`:''}
        ${expired
          ? `<div class="offer-exp-msg">⏰ انتهت صلاحية هذا العرض — لا يمكن الاستفادة منه</div>`
          : CU ? (done
            ? `<div style="text-align:center;padding:10px;font-size:.82rem;color:rgba(9,50,87,.4);background:rgba(0,0,0,.03);border-radius:var(--r12);margin-top:8px">
                🚫 ${exhausted?'استنفدت رصيدك من هذا العرض':'العرض وصل حده الكلي'}</div>`
            : `<button class="offer-add-btn" onclick="useOffer('${o._id}')">
                ${getOfferIcon(o.type)} استخدام العرض</button>`)
            : `<button class="offer-add-btn" onclick="showLogin()" style="background:linear-gradient(135deg,var(--teal),var(--teal2))">
                سجّل دخول للاستفادة</button>`}
      </div>
    </div>`;
  }).join('');
}

/* ── استخدام العرض ── */
async function useOffer(offerId) {
  const o = offers.find(x=>x._id===offerId);
  if(!o || !CU) return;
  // التحقق من الصلاحية
  if(isOfferExpired(o)) { toast('🚫 انتهت صلاحية هذا العرض', false); return; }
  if(!isOfferForMe(o)) { toast('🚫 هذا العرض غير متاح لك', false); return; }
  if(isOfferExhausted(o)) { toast('🚫 استنفدت رصيدك من هذا العرض', false); return; }
  const totMax = parseInt(o.totalMaxUses)||0;
  if(totMax>0 && totalOfferUses(o)>=totMax) { toast('🚫 العرض وصل حده الكلي', false); return; }

  const key = CU.username || CU._id;

  // تطبيق العرض على السلة
  if(o.type==='pct_any'||o.type==='pct_prod') {
    const prod = o.prodName ? products.find(p=>p.name===o.prodName) : null;
    if(o.prodName && !prod) { toast('المنتج غير متوفر', false); return; }
    if(prod) {
      const disc = prod.price*(1-(parseFloat(o.value)||0)/100);
      cart[prod._id] = {...prod, qty:(cart[prod._id]?.qty||0)+1, offerPrice:Math.max(0,disc), offerLabel:o.title};
      toast(`✅ تمت إضافة "${prod.name}" بخصم ${o.value}% للسلة`);
    } else {
      // خصم على أي منتج — نحفظه كـ pendingOffer
      window._pendingOffer = {id:offerId, type:'pct', val:parseFloat(o.value)||0, label:o.title};
      toast(`✅ عرض ${o.value}% مفعّل — أضف منتجاً للسلة وسيُطبَّق الخصم`);
    }
  } else if(o.type==='amt_any'||o.type==='amt_prod') {
    const prod = o.prodName ? products.find(p=>p.name===o.prodName) : null;
    if(o.prodName && !prod) { toast('المنتج غير متوفر', false); return; }
    if(prod) {
      const disc = prod.price-(parseFloat(o.value)||0);
      cart[prod._id] = {...prod, qty:(cart[prod._id]?.qty||0)+1, offerPrice:Math.max(0,disc), offerLabel:o.title};
      toast(`✅ تمت إضافة "${prod.name}" بخصم ${(parseFloat(o.value)||0).toLocaleString()} د.ع للسلة`);
    } else {
      window._pendingOffer = {id:offerId, type:'amt', val:parseFloat(o.value)||0, label:o.title};
      toast(`✅ خصم ${(parseFloat(o.value)||0).toLocaleString()} د.ع مفعّل — أضف منتجاً للسلة`);
    }
  } else if(o.type==='buy_get') {
    const prod = products.find(p=>p.name===o.prodName)||products[0];
    if(!prod) { toast('المنتج غير متوفر', false); return; }
    const freeProd = o.freeProdName ? (products.find(p=>p.name===o.freeProdName)||prod) : prod;
    const bq = parseInt(o.buyQty)||10, fq = parseInt(o.freeQty)||1;
    cart[prod._id] = {...prod, qty:(cart[prod._id]?.qty||0)+bq, offerLabel:o.title};
    cart[freeProd._id] = {...freeProd, qty:(cart[freeProd._id]?.qty||0)+fq, offerPrice:0, offerLabel:'مجاناً — '+o.title};
    toast(`🎁 تمت إضافة ${bq} + ${fq} مجاناً من "${prod.name}" للسلة`);
  } else if(o.type==='buy_combo') {
    const items = o.comboItems||[];
    if(!items.length) { toast('العرض غير مكتمل', false); return; }
    let missing = [];
    items.forEach(item=>{
      const prod=products.find(p=>p.name===item.name);
      if(!prod) { missing.push(item.name); return; }
      cart[prod._id]={...prod,qty:(cart[prod._id]?.qty||0)+(parseInt(item.qty)||1),offerLabel:o.title};
    });
    if(missing.length) { toast(`تنبيه: المنتجات التالية غير متوفرة: ${missing.join('، ')}`, false); }
    // تطبيق المكافأة
    if(o.comboReward==='free_prod') {
      const fp=products.find(p=>p.name===o.comboFreeProd);
      if(fp) cart[fp._id]={...fp,qty:(cart[fp._id]?.qty||0)+(parseInt(o.comboFreeQty)||1),offerPrice:0,offerLabel:'مجاناً — '+o.title};
    }
    toast(`🛒 تمت إضافة منتجات عرض "${o.title}" للسلة`);
  }

  // سجّل الاستخدام في Firestore + سجّل الـ claim بالحساب
  const usages = {...(o.usages||{})};
  usages[key] = (usages[key]||0)+1;
  o.usages = usages;
  const claims = {...(o.claims||{})};
  if (!claims[key]) claims[key] = { at: new Date().toISOString(), expiresAt: o.to||'' };
  o.claims = claims;
  await fbUpdate('offers', o._id, {usages, claims}).catch(()=>{});

  updateCartUI();
  renderOffers();
  showPage('pageStore');
}

/* ── Modal helpers ── */
function offerTypeChanged() {
  const type = document.getElementById('off_type').value;
  const isDisc    = ['pct_any','pct_prod','amt_any','amt_prod'].includes(type);
  const isBuyGet  = type==='buy_get';
  const isCombo   = type==='buy_combo';
  const isProd    = ['pct_prod','amt_prod'].includes(type);
  const isAmt     = ['amt_any','amt_prod'].includes(type);

  document.getElementById('off_val_wrap').style.display    = isDisc   ? 'block' : 'none';
  document.getElementById('off_buyget_wrap').style.display = isBuyGet ? 'block' : 'none';
  document.getElementById('off_combo_wrap').style.display  = isCombo  ? 'block' : 'none';
  document.getElementById('off_prod_wrap').style.display   = isProd   ? 'block' : 'none';

  if(isAmt) document.getElementById('off_val_label').textContent='مبلغ الخصم (د.ع)';
  else       document.getElementById('off_val_label').textContent='نسبة الخصم %';

  // ملأ قوائم المنتجات
  const prods = products.filter(p=>p.status==='active');
  const opts  = prods.map(p=>`<option value="${esc(p.name)}">${p.name}</option>`).join('');
  const optsE = '<option value="">— اختر منتج —</option>'+opts;
  const optsA = '<option value="">— كل المنتجات —</option>'+opts;
  ['off_prod'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=isProd?optsE:optsA; });
  ['off_buyget_prod','off_free_prod','off_combo_free_prod'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=optsE.replace('— اختر منتج —', id==='off_free_prod'?'— نفس المنتج —':'— اختر منتج —'); });
}

function offerTargetChanged() {
  const type = document.getElementById('off_target_type').value;
  document.getElementById('off_specific_wrap').style.display = type==='specific' ? 'block' : 'none';
  if(type==='specific') {
    const targets = users.filter(u=>u.type==='rep'||u.type==='market_owner');
    if(!targets.length) {
      document.getElementById('off_target_users').innerHTML = '<div style="color:rgba(9,50,87,.4);font-size:.8rem;padding:8px">لا يوجد مستخدمون مسجلون بعد</div>';
      return;
    }
    document.getElementById('off_target_users').innerHTML = targets.map(u=>`
      <label style="display:flex;align-items:center;gap:8px;padding:7px 5px;cursor:pointer;font-size:.83rem;border-radius:8px;transition:background .15s" onmouseover="this.style.background='rgba(13,148,136,.06)'" onmouseout="this.style.background=''">
        <input type="checkbox" value="${esc(u.username||u._id)}" style="width:16px;height:16px;accent-color:var(--teal2);cursor:pointer">
        <span style="font-weight:700">${u.type==='rep'?'🤝':'🏪'} ${u.name}</span>
        <span style="font-size:.7rem;color:rgba(9,50,87,.38);margin-right:auto">${u.username||''}</span>
      </label>`).join('');
  }
}

function comboRewardChanged() {
  const r = document.getElementById('off_combo_reward').value;
  document.getElementById('off_combo_free_wrap').style.display = r==='free_prod' ? 'block' : 'none';
  document.getElementById('off_combo_disc_wrap').style.display = (r==='pct'||r==='amt') ? 'block' : 'none';
  if(r==='pct') document.getElementById('off_combo_val_label').textContent='نسبة الخصم %';
  if(r==='amt') document.getElementById('off_combo_val_label').textContent='مبلغ الخصم (د.ع)';
  // ملأ المنتجات المجانية
  const fp=document.getElementById('off_combo_free_prod');
  if(fp && r==='free_prod') {
    fp.innerHTML='<option value="">— اختر منتج —</option>'+products.filter(p=>p.status==='active').map(p=>`<option value="${esc(p.name)}">${p.name}</option>`).join('');
  }
}

function addComboItem() {
  comboItemCount++;
  const wrap = document.getElementById('off_combo_items');
  const div  = document.createElement('div');
  div.className = 'frow combo-item'; div.style.marginBottom = '6px';
  div.innerHTML = `
    <div class="fg" style="margin:0"><select class="fsel combo-prod">
      ${products.filter(p=>p.status==='active').map(p=>`<option value="${esc(p.name)}">${p.name}</option>`).join('')}
    </select></div>
    <div class="fg" style="margin:0;max-width:80px"><input type="number" class="fi combo-qty" value="1" min="1" placeholder="كمية"></div>
    <button class="btn btn-ghost btn-sm" onclick="this.closest('.combo-item').remove()" style="padding:8px 10px">حذف</button>`;
  wrap.appendChild(div);
}

function openAddOffer(){
  document.getElementById('offerModalTitle').textContent='إضافة عرض';
  document.getElementById('off_fbid').value='';
  document.getElementById('off_title').value='';
  document.getElementById('off_desc').value='';
  document.getElementById('off_val').value='0';
  document.getElementById('off_buy_qty').value='10';
  document.getElementById('off_free_qty').value='1';
  document.getElementById('off_max_uses').value='1';
  document.getElementById('off_total_uses').value='0';
  document.getElementById('off_combo_items').innerHTML='';
  document.getElementById('off_combo_val').value='0';
  document.getElementById('off_combo_free_qty').value='1';
  document.getElementById('off_from').value=new Date().toISOString().split('T')[0];
  document.getElementById('off_to').value='';
  document.getElementById('off_type').value='pct_any';
  document.getElementById('off_target_type').value='all';
  document.getElementById('off_status').value='active';
  document.getElementById('off_specific_wrap').style.display='none';
  document.getElementById('off_img').value='';
  document.getElementById('off_img_preview').src='';
  document.getElementById('off_img_preview').style.display='none';
  document.getElementById('offImgLabel').textContent='🖼️ اضغط لرفع صورة جديدة';
  comboItemCount=0;
  offerTypeChanged();
  buildOfferImgPicker();
  openModal('offerModal');
}

function openEditOffer(fbid){
  const o=offers.find(x=>x._id===fbid); if(!o) return;
  document.getElementById('offerModalTitle').textContent='تعديل العرض';
  document.getElementById('off_fbid').value=fbid;
  document.getElementById('off_title').value=o.title||'';
  document.getElementById('off_desc').value=o.desc||'';
  document.getElementById('off_type').value=o.type||'pct_any';
  document.getElementById('off_val').value=o.value||0;
  document.getElementById('off_from').value=o.from||'';
  document.getElementById('off_to').value=o.to||'';
  document.getElementById('off_status').value=o.status||'active';
  document.getElementById('off_buy_qty').value=o.buyQty||10;
  document.getElementById('off_free_qty').value=o.freeQty||1;
  document.getElementById('off_max_uses').value=o.maxUsesPerUser||1;
  document.getElementById('off_total_uses').value=o.totalMaxUses||0;
  document.getElementById('off_target_type').value=o.targetType||'all';
  document.getElementById('off_combo_val').value=o.comboVal||0;
  document.getElementById('off_combo_free_qty').value=o.comboFreeQty||1;
  const _imgPrev=document.getElementById('off_img_preview');
  if(o.img){document.getElementById('off_img').value=o.img;_imgPrev.src=o.img;_imgPrev.style.display='block';document.getElementById('offImgLabel').textContent='✅ صورة موجودة';}
  else{document.getElementById('off_img').value='';_imgPrev.src='';_imgPrev.style.display='none';document.getElementById('offImgLabel').textContent='🖼️ اضغط لرفع صورة جديدة';}
  offerTypeChanged();
  buildOfferImgPicker();
  offerTargetChanged();
  // restore specific users
  if(o.targetType==='specific') {
    setTimeout(()=>{
      (o.targetUsers||[]).forEach(un=>{
        const cb=document.querySelector(`#off_target_users input[value="${un}"]`);
        if(cb) cb.checked=true;
      });
    },100);
  }
  // restore prod selections
  setTimeout(()=>{
    const selMap={off_prod:'prodName',off_buyget_prod:'prodName',off_free_prod:'freeProdName',
                  off_prod_special:'prodName',off_combo_free_prod:'comboFreeProd'};
    Object.entries(selMap).forEach(([id,key])=>{ const el=document.getElementById(id); if(el&&o[key]) el.value=o[key]; });
  },60);
  // restore combo items
  if(o.type==='buy_combo' && o.comboItems) {
    document.getElementById('off_combo_items').innerHTML=''; comboItemCount=0;
    o.comboItems.forEach(item=>{
      addComboItem();
      const last = document.querySelector('#off_combo_items .combo-item:last-child');
      if(last) {
        const sel = last.querySelector('.combo-prod');
        const qty = last.querySelector('.combo-qty');
        if(sel) sel.value = item.name;
        if(qty) qty.value = item.qty;
      }
    });
    if(o.comboReward) { document.getElementById('off_combo_reward').value=o.comboReward; comboRewardChanged(); }
  }
  openModal('offerModal');
}

async function saveOffer(){
  const title  = document.getElementById('off_title').value.trim();
  const desc   = document.getElementById('off_desc').value.trim();
  const type   = document.getElementById('off_type').value;
  const status = document.getElementById('off_status').value;
  const from   = document.getElementById('off_from').value;
  const to     = document.getElementById('off_to').value;
  const fbid   = document.getElementById('off_fbid').value;
  const targetType  = document.getElementById('off_target_type').value;
  const maxUsesPerUser  = parseInt(document.getElementById('off_max_uses').value)||1;
  const totalMaxUses    = parseInt(document.getElementById('off_total_uses').value)||0;

  if(!title){ toast('أدخل عنوان العرض',false); return; }

  // الجمهور المستهدف
  let targetUsers=[];
  if(targetType==='specific') {
    document.querySelectorAll('#off_target_users input:checked').forEach(cb=>targetUsers.push(cb.value));
    if(!targetUsers.length){ toast('اختر شخصاً واحداً على الأقل',false); return; }
  }

  // بيانات العرض حسب النوع
  let extra={};
  if(['pct_any','pct_prod','amt_any','amt_prod'].includes(type)) {
    extra.value   = parseFloat(document.getElementById('off_val').value)||0;
    extra.prodName = document.getElementById('off_prod')?.value||'';
  } else if(type==='buy_get') {
    extra.buyQty      = parseInt(document.getElementById('off_buy_qty').value)||10;
    extra.freeQty     = parseInt(document.getElementById('off_free_qty').value)||1;
    extra.prodName    = document.getElementById('off_buyget_prod')?.value||'';
    extra.freeProdName= document.getElementById('off_free_prod')?.value||'';
    if(!extra.prodName){ toast('اختر المنتج',false); return; }
  } else if(type==='buy_combo') {
    const items = [];
    document.querySelectorAll('#off_combo_items .combo-item').forEach(row => {
      const n = row.querySelector('.combo-prod')?.value;
      const q = parseInt(row.querySelector('.combo-qty')?.value)||1;
      if(n) items.push({name:n, qty:q});
    });
    if(!items.length){ toast('أضف منتجاً للشرط',false); return; }
    extra.comboItems  = items;
    extra.comboReward = document.getElementById('off_combo_reward').value;
    extra.comboFreeProd= document.getElementById('off_combo_free_prod')?.value||'';
    extra.comboFreeQty = parseInt(document.getElementById('off_combo_free_qty')?.value)||1;
    extra.comboVal    = parseFloat(document.getElementById('off_combo_val')?.value)||0;
  }

  const img = document.getElementById('off_img').value;
  const offerData = {title,desc,type,status,from,to,targetType,targetUsers,maxUsesPerUser,totalMaxUses,img,...extra};

  if(fbid){
    await fbUpdate('offers',fbid,offerData).catch(()=>{});
    const idx=offers.findIndex(x=>x._id===fbid);
    if(idx>=0) offers[idx]={...offers[idx],...offerData};
    toast('تم تعديل العرض');
  } else {
    offerData.usages={};
    const newId=await fbAdd('offers',offerData);
    offers.push({_id:newId||'O'+Date.now(),...offerData});
    toast('تم إضافة العرض');
  }
  closeModal('offerModal'); renderOffers(); renderOffersBanner();
}


// ═══════════════════════════════════════════════════════
// REP TRACKING
// ═══════════════════════════════════════════════════════
async function renderRepTracking(){
  const reps=users.filter(u=>u.type==='rep'||u.type==='sales_manager');
  document.getElementById('repTrackList').innerHTML=reps.length?reps.map(rep=>{
    const myOrds=orders.filter(o=>o.repUser===rep.username);
    const todayOrds=myOrds.filter(o=>isSameDay(o.date,new Date()));
    const monthSales=myOrds.filter(o=>isThisMonth(o.date)).reduce((s,o)=>s+(parseFloat(o.total)||0),0);
    return `<div class="rep-track-card">
      <div class="rt-header">
        <div class="rt-av">🤝</div>
        <div style="flex:1"><div class="rt-name">${rep.name}</div><div class="rt-status">@${rep.username} · ${rep.phone||'—'}</div></div>
        <span class="badge b-green">🟢 نشط</span>
      </div>
      <div class="rt-stats">
        <div class="rt-stat"><div class="rt-stat-val">${todayOrds.length}</div><div class="rt-stat-lbl">طلبات اليوم</div></div>
        <div class="rt-stat"><div class="rt-stat-val">${(monthSales/1000).toFixed(0)}K</div><div class="rt-stat-lbl">مبيعات الشهر</div></div>
        <div class="rt-stat"><div class="rt-stat-val">${parseFloat(rep.balance||0).toLocaleString()}</div><div class="rt-stat-lbl">الرصيد (د.ع)</div></div>
      </div>
    </div>`;
  }).join(''):'<div style="text-align:center;padding:55px;color:rgba(9,50,87,.35)">لا يوجد مندوبون</div>';
}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════
/* ── صوت الإشعار ── */
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [[880, now, 0.22], [1100, now+0.13, 0.2], [1320, now+0.26, 0.16]].forEach(([freq, t, vol]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.start(t); o.stop(t + 0.3);
    });
  } catch(e) {}
}

function renderNotifBadge(){
  const unread=notifications.filter(n=>!n.read&&(n.target==='all'||n.target===CU?.username||n.target===CU?.type)).length;
  document.querySelectorAll('#sbNav .nav-badge').forEach(b=>b.textContent=unread);
}

function renderNotifications(){
  const now5 = Date.now() - 5*24*60*60*1000;
  const myNotifs = notifications
    .filter(n => (n.target==='all' || n.target===CU?.username || n.target===CU?.type) && (!n._ts || n._ts >= now5))
    .sort((a,b) => (b._ts||0) - (a._ts||0));

  const typeIco  = t => t==='order'?'📦':t==='warn'?'⚠️':'ℹ️';
  const typeClass= t => t==='order'?'order':t==='warn'?'warn':'info';
  const isAdmin  = CU?.type === 'admin';

  document.getElementById('notifList').innerHTML = myNotifs.length ? myNotifs.map(n=>`
    <div class="notif-item ${n.read?'read':'unread'}">
      <div class="notif-ico notif-ico-${typeClass(n.type)}" style="cursor:pointer" onclick="viewNotif('${n._id}')">
        ${typeIco(n.type)}
      </div>
      <div style="flex:1;min-width:0" onclick="markRead('${n._id}')">
        <div class="notif-title">${n.title}</div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-time">🕐 ${n.date}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
        ${!n.read?'<div style="width:8px;height:8px;border-radius:50%;background:var(--teal)"></div>':''}
        <button class="notif-view-btn" onclick="viewNotif('${n._id}')">عرض</button>
        ${isAdmin?`<button class="notif-view-btn" style="color:#e11d48;background:rgba(244,63,94,.08)" onclick="deleteNotif('${n._id}')">حذف</button>`:''}
      </div>
    </div>`).join('')
  : '<div style="text-align:center;padding:55px;color:rgba(9,50,87,.35)">لا توجد إشعارات</div>';
}

async function deleteNotif(id) {
  if (!confirm('حذف هذا الإشعار؟')) return;
  await fbDel('notifications', id).catch(()=>{});
  notifications = notifications.filter(n => n._id !== id);
  renderNotifications();
  renderNotifBadge();
}

function viewNotif(id) {
  const n = notifications.find(x=>x._id===id); if(!n) return;
  const t = n.type==='order'?'order':n.type==='warn'?'warn':'info';
  const ico = n.type==='order'?'📦':n.type==='warn'?'⚠️':'ℹ️';
  const el = document.getElementById('notifDetailIcon');
  el.textContent = ico;
  el.className = `notif-detail-icon notif-ico-${t}`;
  document.getElementById('notifDetailTitle').textContent = n.title;
  document.getElementById('notifDetailBody').textContent  = n.body || '—';
  document.getElementById('notifDetailTime').textContent  = '🕐 ' + n.date;
  openModal('notifDetailModal');
  if(!n.read) markRead(id);
}

async function markRead(id){
  const n=notifications.find(x=>x._id===id);
  if(n&&!n.read){
    n.read=true;
    if(id) await fbUpdate('notifications',id,{read:true}).catch(()=>{});
    renderNotifications();renderNotifBadge();
  }
}

async function markAllRead(){
  const updates = [];
  for(const n of notifications){
    if(!n.read&&(n.target==='all'||n.target===CU?.username||n.target===CU?.type)){
      n.read=true;
      if(n._id) updates.push(fbUpdate('notifications',n._id,{read:true}).catch(()=>{}));
    }
  }
  await Promise.all(updates);
  renderNotifications();renderNotifBadge();buildSidebar();
  toast('تم تحديد الكل كمقروء');
}

// ═══════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// REPORTS — مع فلتر وحماية صلاحيات
// ═══════════════════════════════════════════════════════
let repFilter = 'all';

function setRepFilter(f, btn) {
  repFilter = f;
  document.querySelectorAll('#pageReports .tabs .tab').forEach(t => t.classList.remove('on'));
  if(btn) btn.classList.add('on');
  document.getElementById('repCustomDates').style.display = f==='custom' ? 'block' : 'none';
  renderReports();
}

function getRepOrders() {
  // ✅ FIX: دعم كل أنواع المستخدمين
  if (!CU) return [];

  const isAdmin = CU.type === 'admin' || CU.type === 'sales_manager';
  let base;

  if (isAdmin) {
    base = orders; // الأدمن يشوف الكل
  } else if (CU.type === 'rep') {
    base = orders.filter(o => o.repUser === CU.username);
  } else if (CU.type === 'market_owner') {
    base = orders.filter(o =>
      o.shopName === CU.name ||
      o.shopName === CU.shopName ||
      o.repUser === CU.username
    );
  } else {
    base = [];
  }

  // فلتر الفترة
  const now = new Date();
  if (repFilter === 'today')
    return base.filter(o => isSameDay(o.date, now));
  if (repFilter === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return base.filter(o => isAfterDate(o.date, weekAgo));
  }
  if (repFilter === 'month')
    return base.filter(o => isThisMonth(o.date));
  if (repFilter === 'custom') {
    const from = document.getElementById('repFrom')?.value;
    const to   = document.getElementById('repTo')?.value;
    if (from) base = base.filter(o => isAfterDate(o.date, new Date(from)));
    if (to)   base = base.filter(o => isBeforeDate(o.date, new Date(to)));
    return base;
  }
  return base;
}

function isAfterDate(dateStr, d)  { const t=parseArabicDate(dateStr); return t>0 && t>=d.getTime(); }
function isBeforeDate(dateStr, d) { const t=parseArabicDate(dateStr); return t>0 && t<=d.getTime(); }

function renderReports() {
  // ✅ FIX: التحقق من تحميل البيانات أولاً
  if (!CU) {
    document.getElementById('repKpi').innerHTML = '<div style="text-align:center;padding:28px">🔒 يجب تسجيل الدخول لعرض التقارير</div>';
    return;
  }

  const isAdmin = CU.type === 'admin' || CU.type === 'sales_manager';
  const filtered = getRepOrders();

  // ✅ FIX: إظهار رسالة واضحة إذا لا توجد طلبات
  if (!filtered.length) {
    document.getElementById('repKpi').innerHTML = '<div style="text-align:center;padding:28px">📊 لا توجد طلبات في هذه الفترة</div>';
    const repsCard = document.getElementById('repRepsCard');
    if (repsCard) repsCard.style.display = 'none';
    document.getElementById('repProdsBody').innerHTML = '<tr><td colspan="3" style="text-align:center;padding:28px">لا توجد بيانات</td></tr>';
    return;
  }

  const tot  = filtered.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const comm = filtered.reduce((s, o) => s + (parseFloat(o.commission) || 0), 0);
  const avg  = filtered.length ? Math.round(tot / filtered.length) : 0;
  const outOfStock = products.filter(p => p.stock === 0).length;

  document.getElementById('repKpi').innerHTML = `
    <div class="kpi-card kpi-sky">
      <div class="kpi-icon">💰</div>
      <div class="kpi-val">${tot >= 1e6 ? (tot / 1e6).toFixed(2) + 'M' : tot.toLocaleString()}</div>
      <div class="kpi-lbl">إجمالي المبيعات (د.ع)</div>
    </div>
    <div class="kpi-card kpi-teal">
      <div class="kpi-icon">مخزون</div>
      <div class="kpi-val">${filtered.length}</div>
      <div class="kpi-lbl">عدد الطلبات</div>
    </div>
    <div class="kpi-card kpi-mint">
      <div class="kpi-icon">رصيد</div>
      <div class="kpi-val">${comm >= 1e6 ? (comm / 1e6).toFixed(2) + 'M' : comm.toLocaleString()}</div>
      <div class="kpi-lbl">إجمالي العمولات</div>
    </div>
    <div class="kpi-card kpi-gold">
      <div class="kpi-icon">📊</div>
      <div class="kpi-val">${avg.toLocaleString()}</div>
      <div class="kpi-lbl">متوسط قيمة الطلب</div>
    </div>
    ${isAdmin ? `
    <div class="kpi-card kpi-rose">
      <div class="kpi-icon">🚫</div>
      <div class="kpi-val">${outOfStock}</div>
      <div class="kpi-lbl">نفاد المخزون</div>
    </div>` : ''}`;

  // جدول المندوبين — للأدمن والمشرف فقط
  const repsCard = document.getElementById('repRepsCard');
  if (repsCard) repsCard.style.display = isAdmin ? 'block' : 'none';

  if (isAdmin) {
    const rMap = {};
    filtered.forEach(o => {
      if (!o.repUser) return;
      if (!rMap[o.repUser]) rMap[o.repUser] = { name: o.repName || o.repUser, ord: 0, tot: 0, comm: 0 };
      rMap[o.repUser].ord++;
      rMap[o.repUser].tot  += parseFloat(o.total)      || 0;
      rMap[o.repUser].comm += parseFloat(o.commission) || 0;
    });

    document.getElementById('repRepsBody').innerHTML = Object.values(rMap)
      .sort((a, b) => b.tot - a.tot)
      .map(r => `
        <tr>
          <td>${r.name}</td>
          <td>${r.ord}</td>
          <td>${r.tot.toLocaleString()} د.ع</td>
          <td>${r.comm.toLocaleString()} د.ع</td>
          <td>${(r.tot - r.comm).toLocaleString()} د.ع</td>
        </tr>`).join('') || '<tr><td colspan="5" style="text-align:center">لا توجد بيانات</td></tr>';
  }

  // أكثر المنتجات مبيعاً
  const prodMap = {};
  filtered.forEach(o => {
    const prods = o.products || '';
    const matches = prods.match(/([^،,\n]+)\((\d+)\)/g) || [];
    if (matches.length) {
      matches.forEach(m => {
        const mm = m.match(/(.+)\((\d+)\)/);
        if (!mm) return;
        const name = mm[1].trim();
        const qty  = parseInt(mm[2]) || 1;
        const prod = products.find(p => p.name === name);
        if (!prodMap[name]) prodMap[name] = { name, qty: 0, rev: 0 };
        prodMap[name].qty += qty;
        prodMap[name].rev += qty * (prod?.price || 0);
      });
    }
  });

  document.getElementById('repProdsBody').innerHTML = Object.values(prodMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10)
    .map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.qty}</td>
        <td>${p.rev.toLocaleString()} د.ع</td>
      </tr>`).join('') || '<tr><td colspan="3" style="text-align:center">لا توجد بيانات</td></tr>';
}
// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function openModal(id){
  document.getElementById(id).classList.add('open');
  if (id === 'packagingUnitsModal') renderPackagingUnitsList();
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('click',e=>{
  if(e.target.classList.contains('modal')) e.target.classList.remove('open');
});

function toast(msg,ok=true){
  const d=document.createElement('div');
  d.className='toast '+(ok===false?'err':ok==='info'?'info':'ok');
  d.textContent=msg;
  document.getElementById('toastWrap').appendChild(d);
  setTimeout(()=>d.remove(),3500);
}

function filterMyOrders(){
  if(!CU) return [];
  if(CU.type==='rep') return orders.filter(o=>o.repUser===CU.username || o.repUser===CU.username);
  if(CU.type==='market_owner') return orders.filter(o=>o.shopName===CU.name);
  if(CU.type==='admin'||CU.type==='sales_manager') return orders;
  return []; // guest أو أي نوع غير معروف — لا يرى أي طلب
}

function isSameDay(dateStr,targetDate){
  if(!dateStr||dateStr==='—') return false;
  try{
    const parts=dateStr.replace(/[٠١٢٣٤٥٦٧٨٩]/g,ch=>'٠١٢٣٤٥٦٧٨٩'.indexOf(ch)).split('/');
    if(parts.length===3){
      const od=new Date(parseInt(parts[2]),parseInt(parts[1])-1,parseInt(parts[0]));
      return od.getFullYear()===targetDate.getFullYear()&&od.getMonth()===targetDate.getMonth()&&od.getDate()===targetDate.getDate();
    }
    const od=new Date(dateStr);
    return od.getFullYear()===targetDate.getFullYear()&&od.getMonth()===targetDate.getMonth()&&od.getDate()===targetDate.getDate();
  } catch{return false;}
}
// ✅ تحويل تاريخ عربي/هجري/ميلادي إلى timestamp للمقارنة والترتيب
function parseArabicDate(dateStr) {
  if (!dateStr || dateStr === '—') return 0;
  try {
    // تحويل الأرقام العربية للغربية
    const normalized = dateStr.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d =>
      '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    const parts = normalized.split('/');
    if (parts.length === 3) {
      // صيغة dd/mm/yyyy
      return new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      ).getTime();
    }
    return new Date(normalized).getTime() || 0;
  } catch { return 0; }
}



function isThisMonth(dateStr){
  if(!dateStr||dateStr==='—') return false;
  try{
    const parts=dateStr.replace(/[٠١٢٣٤٥٦٧٨٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).split('/');
    if(parts.length===3){
      const n=new Date();
      return parseInt(parts[2])===n.getFullYear()&&parseInt(parts[1])-1===n.getMonth();
    }
    const d=new Date(dateStr),n=new Date();
    return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth();
  } catch{return false;}
}

function fixDrive(u){
  if(!u) return 'https://via.placeholder.com/200?text=📦';
  if(u.includes('drive.google.com')){const m=u.match(/[-\w]{25,}/);if(m) return `https://drive.google.com/uc?export=view&id=${m[0]}`;}
  return u;
}

function esc(s){return(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"');}
function escj(obj){
  try{return JSON.stringify(obj).replace(/'/g,"\\'").replace(/</g,'&lt;');}
  catch{return '{}';}
}
function safeName(s){return(s||'').replace(/[^\w\u0621-\u064A]/g,'_');}

// ═══════════════════════════════════════════════════════
// FEATURE 1: شريط العروض (Offers Banner)
// ═══════════════════════════════════════════════════════
function renderOffersBanner() {
  const wrap = document.getElementById('offersBannerWrap');
  if (!wrap) return;
  const activeOffers = offers.filter(o => o.status === 'active' && !isOfferExpired(o));
  if (!activeOffers.length) {
    // Default promotional slides when no offers
    const defaults = [
      { title:'مرحباً بك في برجمان 🏪', desc:'اكتشف أفضل المنتجات بأفضل الأسعار', val:'عروض', sub:'حصرية', color:0 },
      { title:'نظام النقاط ⭐', desc:'لكل 100,000 د.ع تحصل على نقطة مكافأة', val:'1 نقطة', sub:'لكل 100K', color:1 },
    ];
    renderBannerSlides(defaults.map((d,i) => ({...d, idx:i})));
    return;
  }
  const slides = activeOffers.map((o, i) => ({
    title: o.title,
    desc: o.desc || '',
    val: o.type==='percent' ? o.value+'%' : o.type==='free' ? 'مجاني' : (parseFloat(o.value)||0).toLocaleString()+' د.ع',
    sub: o.type==='percent' ? 'خصم' : o.type==='free' ? 'هدية' : 'توفير',
    color: i % 5,
    img: o.img || null,
    idx: i
  }));
  renderBannerSlides(slides);
}

function renderBannerSlides(slides) {
  const wrap = document.getElementById('offersBannerWrap');
  if (!slides.length) { wrap.innerHTML=''; return; }
  clearInterval(bannerTimer);
  bannerSlide = 0;
  wrap.innerHTML = `
    <div class="offers-banner">
      <div class="offers-banner-track" id="bannerTrack">
        ${slides.map((s,i) => `
          <div class="offer-slide offer-slide-${s.color}">
            ${s.img
              ? `<img class="offer-slide-img" src="${s.img}" alt="">`
              : `<div class="offer-slide-icon">${['🎁','⭐','🔥','💎','🚀'][s.color]}</div>`}
            <div class="offer-slide-text">
              <div class="offer-slide-title">${s.title}</div>
              <div class="offer-slide-desc">${s.desc}</div>
            </div>
            <div>
              <div class="offer-slide-val">${s.val}</div>
              <div class="offer-slide-sub">${s.sub}</div>
            </div>
          </div>`).join('')}
      </div>
      ${slides.length > 1 ? `
        <button class="offers-banner-btn prev" onclick="bannerNav(-1)">›</button>
        <button class="offers-banner-btn next" onclick="bannerNav(1)">‹</button>
      ` : ''}
    </div>
    ${slides.length > 1 ? `
      <div class="offers-dots" id="bannerDots">
        ${slides.map((_,i) => `<button class="offers-dot ${i===0?'on':''}" onclick="bannerGoTo(${i})"></button>`).join('')}
      </div>
    ` : ''}
  `;
  // Add touch/swipe support
  const track = document.getElementById('bannerTrack');
  if (track && slides.length > 1) {
    let startX = 0;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
    track.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) bannerNav(diff > 0 ? 1 : -1);
    }, {passive:true});
  }
  if (slides.length > 1) {
    bannerTimer = setInterval(() => bannerNav(1), 4000);
  }
}

function bannerNav(dir) {
  const track = document.getElementById('bannerTrack');
  if (!track) return;
  const total = track.children.length;
  bannerSlide = (bannerSlide + dir + total) % total;
  track.style.transform = `translateX(${bannerSlide * 100}%)`;
  document.querySelectorAll('.offers-dot').forEach((d,i) => d.classList.toggle('on', i===bannerSlide));
  clearInterval(bannerTimer);
  bannerTimer = setInterval(() => bannerNav(1), 4000);
}

function bannerGoTo(idx) {
  bannerSlide = idx - 1;
  bannerNav(1);
}

// ═══════════════════════════════════════════════════════
// FEATURE 2: Google Login
// ═══════════════════════════════════════════════════════
async function doGoogleLogin() {
  const errEl = document.getElementById('loginErr');
  errEl.textContent = '';
  const btn = document.querySelector('.btn-google');
  if (btn) { btn.disabled = true; btn.innerHTML = btn.innerHTML.replace('تسجيل الدخول بـ Google', '⏳ جاري التسجيل...'); }
  try {
    const result = await fb().signInWithPopup(window._auth, window._googleProvider);
    const gUser = result.user;
    await loadUsers();
    const found = users.find(u => u.email === gUser.email || u.username === gUser.email);
    if (found) {
      // مستخدم موجود — حمّل بياناته
      CU = { ...found, photoURL: gUser.photoURL || found.photoURL || '' };
      localStorage.setItem('bjUser', JSON.stringify({ username: CU.username, loginTime: Date.now(), googleUser: CU }));
      hideLogin();
      buildUI();
      showPage(CU.type === 'market_owner' ? 'pageStore' : 'pageDashboard');
      toast('✅ أهلاً ' + (CU.name||'').split(' ')[0] + '! 👋');
    } else {
      // مستخدم جديد — أعرض نافذة إكمال الملف
      window._pendingGoogleUser = gUser;
      hideLogin();
      document.getElementById('ps_name').value    = gUser.displayName || '';
      document.getElementById('ps_email').value   = gUser.email || '';
      document.getElementById('ps_shop').value    = '';
      document.getElementById('ps_phone').value   = '';
      document.getElementById('ps_address').value = '';
      document.getElementById('ps_err').textContent = '';
      // صورة جوجل
      if(gUser.photoURL) {
        document.getElementById('ps_avatar_img').src = gUser.photoURL;
        document.getElementById('ps_avatar_img').style.display = 'block';
        document.getElementById('ps_avatar_icon').style.display = 'none';
      }
      openModal('profileSetupModal');
    }
  } catch(err) {
    console.error('Google login error:', err);
    const msgs = {
      'auth/popup-closed-by-user':   '⚠️ تم إغلاق نافذة تسجيل الدخول',
      'auth/popup-blocked':          '⚠️ فعّل النوافذ المنبثقة في المتصفح',
      'auth/cancelled-popup-request':'⚠️ تم إلغاء الطلب، حاول مجدداً',
      'auth/network-request-failed': '❌ تحقق من اتصال الإنترنت',
    };
    errEl.textContent = msgs[err.code] || '❌ خطأ في تسجيل الدخول بـ Google';
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = btn.innerHTML.replace('⏳ جاري التسجيل...', 'تسجيل الدخول بـ Google'); }
  }
}

function previewProfilePhoto(input) {
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ps_avatar_img').src = e.target.result;
    document.getElementById('ps_avatar_img').style.display = 'block';
    document.getElementById('ps_avatar_icon').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function saveProfileSetup() {
  const name    = document.getElementById('ps_name').value.trim();
  const shop    = document.getElementById('ps_shop').value.trim();
  const phone   = document.getElementById('ps_phone').value.trim();
  const address = document.getElementById('ps_address').value.trim();
  const errEl   = document.getElementById('ps_err');

  if(!name)    { errEl.textContent = '⚠️ أدخل الاسم الكامل'; return; }
  if(!shop)    { errEl.textContent = '⚠️ أدخل اسم الماركت'; return; }
  if(!phone)   { errEl.textContent = '⚠️ أدخل رقم الهاتف'; return; }
  if(!address) { errEl.textContent = '⚠️ أدخل العنوان'; return; }

  errEl.textContent = '';
  const btn = document.querySelector('#profileSetupModal .btn-gold');
  if(btn) { btn.disabled=true; btn.textContent='⏳ جاري الحفظ...'; }

  try {
    const gUser = window._pendingGoogleUser;
    // رفع الصورة إذا اختار صورة جديدة
    let photoURL = gUser?.photoURL || '';
    const photoFile = document.getElementById('ps_photo').files[0];
    if(photoFile) {
      // حفظ base64 مؤقتاً (يمكن لاحقاً ربطها بـ Firebase Storage)
      photoURL = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(photoFile);
      });
    }

    const userData = {
      name,
      shopName: shop,
      phone,
      address,
      username: gUser.email,
      email: gUser.email,
      type: 'market_owner',
      accountType: 'market_owner',
      commPct: 0,
      balance: 0,
      status: 'active',
      totalBuys: 0,
      googleAuth: true,
      emailVerified: gUser.emailVerified || false,
      photoURL,
    };

    const newId = await fbAdd('users', userData);
    CU = { ...userData, _id: newId, transactions: [] };
    users.push({ ...CU });

    localStorage.setItem('bjUser', JSON.stringify({ username: CU.username, loginTime: Date.now(), googleUser: CU }));
    closeModal('profileSetupModal');
    buildUI();
    showPage('pageStore');
    toast('🎉 تم إنشاء حسابك! أهلاً ' + name.split(' ')[0] + ' 👋');
  } catch(err) {
    console.error(err);
    errEl.textContent = '❌ حدث خطأ، حاول مجدداً';
  } finally {
    if(btn) { btn.disabled=false; btn.textContent='✅ تفعيل الحساب'; }
  }
}

// ═══════════════════════════════════════════════════════
// FEATURE 4: Bulk Import (Excel / CSV)
// ═══════════════════════════════════════════════════════
function setupImportDragDrop() {
  const zone = document.getElementById('importDropZone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processImportFile(file);
  });
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (file) processImportFile(file);
}

function processImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  // Show loading state
  document.getElementById('importDropZone').innerHTML = `
    <div class="import-drop-icon">⏳</div>
    <h4>جاري قراءة الملف...</h4>
    <p>${file.name}</p>
  `;
  reader.onload = (e) => {
    try {
      let rows = [];
      if (ext === 'csv') {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (!lines.length) throw new Error('الملف فارغ');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
        rows = lines.slice(1).map(line => {
          // Handle quoted CSV values
          const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || line.split(',');
          const obj = {};
          headers.forEach((h,i) => { obj[h] = (vals[i]||'').trim().replace(/^"|"$/g,''); });
          return obj;
        });
      } else {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, {defval:''});
        // Normalize keys to lowercase
        rows = raw.map(r => {
          const norm = {};
          Object.keys(r).forEach(k => { norm[k.toLowerCase().trim()] = String(r[k]||'').trim(); });
          // Map Arabic column names too
          return {
            name:     norm['name']     || norm['الاسم']    || norm['اسم المنتج'] || '',
            category: norm['category'] || norm['التصنيف']  || norm['تصنيف']      || norm['cat'] || 'عام',
            price:    norm['price']    || norm['السعر']    || norm['سعر']         || 0,
            stock:    norm['stock']    || norm['المخزون']  || norm['كمية']        || 0,
            minstock: norm['minstock'] || norm['min_stock']|| norm['الحد الادنى']|| norm['الحد الأدنى'] || 10,
            image:    norm['image']    || norm['img']      || norm['صورة']        || norm['رابط الصورة'] || '',
            detail:   norm['detail']   || norm['description']|| norm['تفاصيل']  || norm['وصف'] || '',
            status:   norm['status']   || norm['الحالة']   || 'active'
          };
        });
      }
      // Filter valid rows only
      importData = rows.filter(r => {
        const name = String(r.name||'').trim();
        const price = parseFloat(r.price||r.Price||0);
        return name && price > 0;
      }).map(r => ({
        name:     String(r.name).trim(),
        category: String(r.category||'عام').trim(),
        price:    parseFloat(r.price) || 0,
        stock:    parseInt(r.stock) || 0,
        minStock: parseInt(r.minstock||r.minStock) || 10,
        image:    fixDrive(String(r.image||'').trim()),
        detail:   String(r.detail||'').trim(),
        status:   String(r.status||'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active'
      }));

      const skipped = rows.length - importData.length;
      showImportPreview(skipped);

    } catch(err) {
      toast('❌ خطأ في قراءة الملف: ' + err.message, false);
      resetImport();
    }
  };
  reader.onerror = () => { toast('❌ فشل في قراءة الملف', false); resetImport(); };
  if (ext === 'csv') reader.readAsText(file, 'UTF-8');
  else reader.readAsArrayBuffer(file);
}

function showImportPreview(skipped=0) {
  if (!importData.length) {
    toast('❌ لم يتم العثور على منتجات صالحة — تحقق من أعمدة الملف', false);
    resetImport();
    return;
  }
  document.getElementById('importPreviewWrap').style.display = 'block';
  document.getElementById('importCountBadge').textContent = importData.length + ' منتج';
  document.getElementById('importPreviewTitle').textContent =
    `معاينة — ${Math.min(5, importData.length)} من ${importData.length}${skipped ? ' (تم تخطي '+skipped+' سطر غير صالح)' : ''}`;
  const preview = importData.slice(0, 5);
  const headers = ['name','category','price','stock','status'];
  const headerAr = ['الاسم','التصنيف','السعر','المخزون','الحالة'];
  document.getElementById('importPreviewTable').innerHTML = `
    <thead><tr>${headerAr.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${preview.map(r=>`<tr>${headers.map(h=>`<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r[h]||'—'}</td>`).join('')}</tr>`).join('')}</tbody>
  `;
  // Reset drop zone
  document.getElementById('importDropZone').innerHTML = `
    <div class="import-drop-icon">✅</div>
    <h4>تم تحميل الملف</h4>
    <p>${importData.length} منتج جاهز للاستيراد</p>
    <input type="file" id="importFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleImportFile(event)">
  `;
}

function resetImport() {
  importData = [];
  document.getElementById('importPreviewWrap').style.display = 'none';
  const fileInput = document.getElementById('importFile');
  if (fileInput) fileInput.value = '';
  const progressWrap = document.getElementById('importProgressWrap');
  if (progressWrap) progressWrap.style.display = 'none';
  const progFill = document.getElementById('importProgFill');
  if (progFill) progFill.style.width = '0%';
  const actionBtns = document.getElementById('importActionBtns');
  if (actionBtns) actionBtns.style.display = 'flex';
  // Reset drop zone
  document.getElementById('importDropZone').innerHTML = `
    <div class="import-drop-icon">📂</div>
    <h4>اسحب ملف Excel أو CSV هنا</h4>
    <p>أو اضغط للاختيار — يدعم xlsx, xls, csv</p>
    <input type="file" id="importFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleImportFile(event)">
  `;
  document.getElementById('importDropZone').onclick = () => document.getElementById('importFile').click();
}

async function confirmBulkImport() {
  if (!importData.length) return;
  const progressWrap = document.getElementById('importProgressWrap');
  const actionBtns = document.getElementById('importActionBtns');
  progressWrap.style.display = 'block';
  actionBtns.style.display = 'none';

  let added = 0, updated = 0, failed = 0;
  for (let i = 0; i < importData.length; i++) {
    const row = importData[i];
    try {
      const prodData = {
        name: row.name, category: row.category, price: row.price,
        stock: row.stock, minStock: row.minStock, image: row.image,
        detail: row.detail, status: row.status
      };
      const existing = products.find(p => p.name.trim().toLowerCase() === row.name.toLowerCase());
      if (existing && existing._id) {
        await fbUpdate('products', existing._id, prodData);
        updated++;
      } else {
        await fbAdd('products', prodData);
        added++;
      }
    } catch(e) { failed++; }

    const pct = Math.round(((i+1) / importData.length) * 100);
    document.getElementById('importProgFill').style.width = pct + '%';
    document.getElementById('importProgressTxt').textContent = pct + '%';
    // Small delay to not overwhelm Firestore
    if (i % 10 === 9) await new Promise(r => setTimeout(r, 200));
  }

  const msg = `✅ استيراد مكتمل — تمت الإضافة: ${added} | تم التحديث: ${updated}${failed ? ' | فشل: '+failed : ''}`;
  toast(msg);
  closeModal('bulkImportModal');
  resetImport();
  await loadProducts();
  renderManageProds(); renderStore('الكل'); renderCats(); renderInventory();
}

function downloadTemplate() {
  if (typeof XLSX === 'undefined') { toast('جاري تحميل المكتبة...', 'info'); return; }
  const ws = XLSX.utils.aoa_to_sheet([
    ['name','category','price','stock','minStock','image','detail','status'],
    ['مثال: كولا 250ml','مشروبات','1500','100','10','https://...','وصف المنتج','active'],
    ['مثال: شيبس','وجبات خفيفة','500','200','20','','','active'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'burjuman_products_template.xlsx');
  toast('تم تحميل النموذج');
}

// ═══════════════════════════════════════════════════════
// POINTS MANAGEMENT — Admin Control
// ═══════════════════════════════════════════════════════
let currentThreshold = 100000;

async function loadThreshold() {
  try {
    const snap = await fbGet('settings');
    const s = snap.find(x => x._id === 'pointsThreshold' || x.key === 'pointsThreshold');
    if(s) {
      currentThreshold = parseInt(s.value) || 100000;
      document.getElementById('newThresholdVal').value = currentThreshold;
      document.getElementById('currentThresholdDisp').textContent = currentThreshold.toLocaleString() + ' د.ع';
    }
  } catch(e) {}
}

async function saveThreshold() {
  const val = parseInt(document.getElementById('newThresholdVal').value) || 0;
  if(val < 1000) { toast('القيمة يجب أن تكون 1,000 على الأقل', false); return; }
  currentThreshold = val;
  document.getElementById('currentThresholdDisp').textContent = val.toLocaleString() + ' د.ع';
  // حفظ في Firebase
  try {
    const snap = await fbGet('settings');
    const existing = snap.find(x => x.key === 'pointsThreshold');
    if(existing && existing._id) {
      await fbUpdate('settings', existing._id, {value: val, key:'pointsThreshold'});
    } else {
      await fbAdd('settings', {key:'pointsThreshold', value: val});
    }
    toast('تم حفظ العتبة الجديدة: ' + val.toLocaleString() + ' د.ع');
    renderPointsMgmt();
  } catch(e) { toast('❌ خطأ في الحفظ', false); }
}

function renderPointsMgmt() {
  if(!CU || (CU.type !== 'admin' && CU.type !== 'sales_manager')) return;

  const search = (document.getElementById('ptsMgmtSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('ptsMgmtFilter')?.value || 'all';

  let list = users.filter(u => u.type === 'rep' || u.type === 'market_owner');
  if(filter !== 'all') list = list.filter(u => u.type === filter);
  if(search) list = list.filter(u => u.name.toLowerCase().includes(search) || u.username.toLowerCase().includes(search));

  const totalPts = list.reduce((s,u) => s + (parseInt(u.earnedPoints)||0), 0);
  const totalAmt = list.reduce((s,u) => s + (parseFloat(u.totalOrdersAmount)||0), 0);

  document.getElementById('ptsMgmtKpi').innerHTML = `
    <div class="kpi-card kpi-violet"><div class="kpi-icon">⭐</div><div class="kpi-val">${totalPts}</div><div class="kpi-lbl">إجمالي النقاط الموزعة</div></div>
    <div class="kpi-card kpi-sky"><div class="kpi-icon">👥</div><div class="kpi-val">${list.length}</div><div class="kpi-lbl">المستخدمون المؤهلون</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">💰</div><div class="kpi-val">${(totalAmt/1e6).toFixed(1)}M</div><div class="kpi-lbl">إجمالي المشتريات (د.ع)</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">⚙️</div><div class="kpi-val">${currentThreshold.toLocaleString()}</div><div class="kpi-lbl">العتبة الحالية (د.ع)</div></div>`;

  if(!list.length) {
    document.getElementById('ptsMgmtList').innerHTML = '<div style="text-align:center;padding:45px;color:rgba(9,50,87,.35)">لا يوجد مستخدمون</div>';
    return;
  }

  document.getElementById('ptsMgmtList').innerHTML = list.map(u => {
    const pts = parseInt(u.earnedPoints) || 0;
    const totalAmt = parseFloat(u.totalOrdersAmount) || 0;
    const progress = currentThreshold > 0 ? Math.min(100, ((totalAmt % currentThreshold) / currentThreshold) * 100) : 0;
    const nextIn   = currentThreshold > 0 ? (currentThreshold - (totalAmt % currentThreshold)) : 0;
    return `
    <div class="pts-mgmt-card">
      <div class="pts-mgmt-av">${u.type==='rep'?'🤝':'🏪'}</div>
      <div class="pts-mgmt-info">
        <div class="pts-mgmt-name">${u.name}</div>
        <div class="pts-mgmt-meta">
          <span>@${u.username}</span>
          <span>${u.type==='rep'?'مندوب':'ماركت'}</span>
          <span>مشتريات: ${totalAmt.toLocaleString()} د.ع</span>
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
      <div class="pts-mgmt-pts">
        ${pts}
        <small>نقطة</small>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <button class="btn btn-sm" style="background:linear-gradient(135deg,var(--violet),var(--violet2));color:white;border:none;font-size:.72rem" onclick="openPtsMgmtModal('${u.username}')">تعديل</button>
        <button class="btn btn-danger btn-sm" style="font-size:.72rem" onclick="confirmResetPoints('${u.username}')">صفر</button>
      </div>
    </div>`;
  }).join('');
}


  
function openPtsMgmtModal(username) {
  const u = users.find(x => x.username === username);
  if(!u) return;
  document.getElementById('ptsMgmtTarget').value = username;
  document.getElementById('ptsMgmtUserName').textContent = u.name + ' — ' + (u.type==='rep'?'مندوب':'ماركت');
  document.getElementById('ptsMgmtCurrentPts').textContent = (parseInt(u.earnedPoints)||0) + ' نقطة';
  document.getElementById('ptsMgmtAmount').value = '';
  document.getElementById('ptsMgmtDesc').value = '';
  document.getElementById('ptsMgmtOp').value = 'add';
  openModal('ptsMgmtModal');
}

async function savePtsMgmt() {
  const username = document.getElementById('ptsMgmtTarget').value;
  const op       = document.getElementById('ptsMgmtOp').value;
  const amount   = parseInt(document.getElementById('ptsMgmtAmount').value) || 0;
  const desc     = document.getElementById('ptsMgmtDesc').value.trim() || 'تعديل يدوي من الأدمن';
  const u        = users.find(x => x.username === username);
  if(!u || amount < 1) { toast('أدخل قيمة صحيحة', false); return; }

  const before = parseInt(u.earnedPoints) || 0;
  let after;
  if(op === 'add')      after = before + amount;
  else if(op === 'sub') after = Math.max(0, before - amount);
  else                  after = amount; // set

  u.earnedPoints = after;
  if(CU && CU.username === username) CU.earnedPoints = after;

  if(u._id) {
    await fbUpdate('users', u._id, {earnedPoints: after}).catch(()=>{});
    const histEntry = {
      type: op === 'add' ? 'earn' : 'redeem',
      points: op === 'add' ? amount : (before - after),
      desc, date: new Date().toLocaleDateString('ar-IQ'),
      byAdmin: CU.name
    };
    await fbAddSub('users', u._id, 'pointsHistory', histEntry).catch(()=>{});
  }

  closeModal('ptsMgmtModal');
  toast(`تم تعديل نقاط ${u.name}: ${before} ← ${after}`);
  renderPointsMgmt();
  renderUsersList();
}

async function confirmResetPoints(username) {
  const u = users.find(x => x.username === username);
  if(!u) return;
  if(!confirm(`هل تريد تصفير نقاط "${u.name}"؟`)) return;
  const before = parseInt(u.earnedPoints) || 0;
  u.earnedPoints = 0;
  if(u._id) {
    await fbUpdate('users', u._id, {earnedPoints: 0}).catch(()=>{});
    await fbAddSub('users', u._id, 'pointsHistory', {
      type: 'reset', points: before, desc: 'تصفير من الأدمن',
      date: new Date().toLocaleDateString('ar-IQ'), byAdmin: CU.name
    }).catch(()=>{});
  }
  toast(`🗑️ تم تصفير نقاط ${u.name}`);
  renderPointsMgmt();
}
  
// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════
init().catch(err=>{
  console.error('Init error:',err);
  if (!fbReady) setFbStatus(false,'خطأ في الاتصال');
  setTimeout(()=>{
    const ls=document.getElementById('loadScreen');
    if(ls) { ls.style.opacity='0'; setTimeout(()=>ls.style.display='none',400); }
  },1000);
  try { buildUI(); } catch(e) {}
});
 
// ══════════════════════════════════════════════════════
// PATCH: Registration + Marketing System
// ══════════════════════════════════════════════════════

// ── Step 1: Add "Marketing" to sidebar nav ──
// في دالة buildSidebar()، أضف هذا السطر في مصفوفة nav:
// {id:'pageMarketing', icon:'📣', lbl:'التسويق', perm:'manage'},
// (تلقائياً سيُضاف من خلال override في الكود هنا)

const _origBuildUI = buildUI;
buildUI = function() {
  _origBuildUI();
  try { injectMarketingNav(); } catch(e) { console.warn('injectMarketingNav:', e); }
  try { renderMarketingKpi(); } catch(e) { console.warn('renderMarketingKpi:', e); }
  try { renderContacts(); } catch(e) { console.warn('renderContacts:', e); }
  try { renderCampaignHistory(); } catch(e) { console.warn('renderCampaignHistory:', e); }
  try { buildMktTemplates(); } catch(e) { console.warn('buildMktTemplates:', e); }
  try { updateMktAudience(); } catch(e) { console.warn('updateMktAudience:', e); }
};

function injectMarketingNav() {
  if (!CU) return;
  const p = PERMS[CU.type] || PERMS.guest;
  if (!p.manage) return;
  const sbNav = document.getElementById('sbNav');
  if (!sbNav || sbNav.querySelector('#nav_pageMarketing')) return;
  const div = document.createElement('div');
  div.className = 'nav-item';
  div.id = 'nav_pageMarketing';
  div.innerHTML = `<span class="nav-icon">📣</span>التسويق`;
  div.onclick = () => showPage('pageMarketing');
  sbNav.appendChild(div);
  // Also inject register link in login overlay
  injectRegisterLink();
}

function injectRegisterLink() {
  const guestLink = document.querySelector('.login-guest');
  if (!guestLink || guestLink.querySelector('.reg-link')) return;
  const span = document.createElement('div');
  span.innerHTML = `<div style="margin-top:8px;font-size:.82rem;color:rgba(9,50,87,.45)">ماعندك حساب؟ <a class="reg-link" onclick="openRegisterModal()" style="color:var(--teal2);font-weight:700;cursor:pointer">سجّل الآن</a></div>`;
  guestLink.parentNode.insertBefore(span, guestLink.nextSibling);
}



// ══════════════════════════════════════════════════════
// REGISTRATION SYSTEM
// ══════════════════════════════════════════════════════
let regData = {}, otpCode = '', otpTimer = null, otpSeconds = 120;

function openRegisterModal() {
  regData = {}; otpCode = '';
  regGoStep(1);
  ['reg_name','reg_phone','reg_email','reg_shop','reg_pass','reg_address'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('reg_err1').textContent = '';
  document.getElementById('reg_err2').textContent = '';
  document.getElementById('reg_err3') && (document.getElementById('reg_err3').textContent = '');
  hideLogin();
  openModal('registerModal');
}

function regGoStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById('regStep'+i)?.classList.toggle('active', i===n);
    const dot = document.getElementById('regDot'+i);
    if (dot) {
      dot.className = 'reg-step' + (i<n?' done':i===n?' active':'');
    }
  });
}

function regTypeChanged() {
  const t = document.getElementById('reg_type')?.value;
  const shopWrap = document.getElementById('reg_shop_wrap');
  if (shopWrap) shopWrap.style.display = t === 'market_owner' ? 'block' : 'none';
}
document.getElementById('reg_type')?.addEventListener('change', regTypeChanged);

async function regStep1Next() {
  const name  = document.getElementById('reg_name').value.trim();
  const phone = document.getElementById('reg_phone').value.trim().replace(/\s/g,'');
  const email = document.getElementById('reg_email').value.trim();
  const pass  = document.getElementById('reg_pass').value;
  const type  = document.getElementById('reg_type').value;
  const shop  = document.getElementById('reg_shop')?.value.trim() || '';
  const errEl = document.getElementById('reg_err1');

  if (!name)  { errEl.textContent = '⚠️ أدخل اسمك الكامل'; return; }
  if (!phone || phone.length < 7) { errEl.textContent = '⚠️ أدخل رقم هاتف صحيح'; return; }
  if (type === 'market_owner' && !shop) { errEl.textContent = '⚠️ أدخل اسم الماركت'; return; }
  if (!pass || pass.length < 6) { errEl.textContent = '⚠️ كلمة المرور 6 أحرف على الأقل'; return; }

  // Check duplicate phone
  await loadUsers();
  const countryCode = document.getElementById('reg_country_code').value;
  const fullPhone = countryCode + phone.replace(/^0/, '');
  if (users.find(u => u.phone && u.phone.replace(/\s/g,'') === fullPhone)) {
    errEl.textContent = '⚠️ هذا الرقم مسجّل مسبقاً، سجّل دخول بدلاً من ذلك';
    return;
  }
  if (email && users.find(u => u.email === email)) {
    errEl.textContent = '⚠️ هذا الإيميل مسجّل مسبقاً';
    return;
  }

  errEl.textContent = '';
  regData = { name, phone: fullPhone, email, pass, type, shop };

  // Generate OTP (6 digits)
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  document.getElementById('otpSentTo').textContent = `الرمز المرسل إلى: ${fullPhone}`;

  // Send OTP via WhatsApp
  sendOtpWhatsapp(fullPhone, otpCode, name);
  // Send backup via email if provided
  if (email) sendOtpEmail(email, otpCode, name);

  startOtpTimer();
  regGoStep(2);
  // Focus first OTP box
  setTimeout(() => document.querySelector('.otp-in')?.focus(), 300);
}

function sendOtpWhatsapp(phone, code, name) {
  const msg = `🔐 *برجمان — رمز التحقق*\n\nأهلاً ${name}،\nرمز التحقق الخاص بك:\n\n*${code}*\n\n⏰ صالح لمدة دقيقتين فقط\n\n_لا تشارك هذا الرمز مع أحد_`;
  // Open WA link (admin receives it and forwards, or use WA Business API)
  const waPhone = phone.replace('+', '');
  // Try direct send — on mobile this opens WhatsApp
  try {
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  } catch(e) {}
  // Also log to Firebase for admin
  fbAdd('otpLogs', { phone, code, name, sentAt: new Date().toISOString(), used: false }).catch(()=>{});
  console.log(`OTP for ${phone}: ${code}`); // dev only
}

function sendOtpEmail(email, code, name) {
  if (typeof emailjs === 'undefined') return;
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: email,
    subject: `🔐 برجمان — رمز التحقق: ${code}`,
    rep_name: name,
    shop_name: '',
    order_id: 'OTP',
    order_date: new Date().toLocaleString('ar-IQ'),
    products: `رمز التحقق الخاص بك: ${code}\n\nصالح لمدة دقيقتين فقط.`,
    total: '', commission: '', net: '',
    shop_addr: '', shop_note: '', location: '',
  }).catch(()=>{});
}

function startOtpTimer() {
  clearInterval(otpTimer);
  otpSeconds = 120;
  updateOtpDisplay();
  otpTimer = setInterval(() => {
    otpSeconds--;
    updateOtpDisplay();
    if (otpSeconds <= 0) {
      clearInterval(otpTimer);
      document.getElementById('otpCountdown').textContent = '00:00';
    }
  }, 1000);
}

function updateOtpDisplay() {
  const m = Math.floor(otpSeconds / 60);
  const s = otpSeconds % 60;
  const el = document.getElementById('otpCountdown');
  if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
}

function resendOtp() {
  if (otpSeconds > 90) { toast('انتظر قليلاً قبل إعادة الإرسال', false); return; }
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  sendOtpWhatsapp(regData.phone, otpCode, regData.name);
  if (regData.email) sendOtpEmail(regData.email, otpCode, regData.name);
  startOtpTimer();
  toast('تم إعادة إرسال الرمز');
}

function otpInput(el, idx) {
  const v = el.value.replace(/\D/g,'').slice(-1);
  el.value = v;
  el.classList.toggle('filled', !!v);
  if (v) {
    const next = document.querySelectorAll('.otp-in')[idx+1];
    if (next) next.focus();
    // Auto-verify if all filled
    const all = [...document.querySelectorAll('.otp-in')].map(i=>i.value);
    if (all.every(c=>c)) regStep2Verify();
  }
}

function otpKey(e, el, idx) {
  if (e.key === 'Backspace' && !el.value) {
    const prev = document.querySelectorAll('.otp-in')[idx-1];
    if (prev) { prev.value = ''; prev.classList.remove('filled'); prev.focus(); }
  }
}

function regStep2Verify() {
  const entered = [...document.querySelectorAll('.otp-in')].map(i=>i.value).join('');
  const errEl   = document.getElementById('reg_err2');
  if (entered.length < 6) { errEl.textContent = '⚠️ أدخل الرمز كاملاً (6 أرقام)'; return; }

  // Dev mode: accept "000000" as bypass
  if (entered === otpCode || entered === '000000') {
    clearInterval(otpTimer);
    errEl.textContent = '';
    regGoStep(3);
  } else if (otpSeconds <= 0) {
    errEl.textContent = '⏰ انتهت صلاحية الرمز — أعد الإرسال';
  } else {
    errEl.textContent = '❌ الرمز غير صحيح، حاول مجدداً';
    document.querySelectorAll('.otp-in').forEach(i => { i.value=''; i.classList.remove('filled'); });
    document.querySelector('.otp-in')?.focus();
  }
}

async function regFinish() {
  const address  = document.getElementById('reg_address').value.trim();
  const city     = document.getElementById('reg_city')?.value || '';
  const newsletter = document.getElementById('reg_newsletter')?.checked ?? true;
  const errEl    = document.getElementById('reg_err3');
  if (!address) { errEl.textContent = '⚠️ أدخل عنوانك'; return; }

  const btn = document.querySelector('#regStep3 .btn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ جاري الإنشاء...'; }
  errEl.textContent = '';

  try {
    const username = regData.phone.replace('+','').replace(/\s/g,'');
    const userData = {
      name:         regData.name,
      username:     username,
      password:     regData.pass,
      phone:        regData.phone,
      email:        regData.email || '',
      shopName:     regData.shop || regData.name,
      address,
      city,
      type:         regData.type,
      accountType:  regData.type,
      commPct:      0,
      balance:      0,
      status:       'active',
      totalBuys:    0,
      earnedPoints: 0,
      totalOrdersAmount: 0,
      newsletter:   newsletter,
      registeredAt: new Date().toLocaleDateString('ar-IQ'),
      registrationMethod: 'phone_otp',
      transactions: [],
    };

    const newId = await fbAdd('users', userData);
    CU = { ...userData, _id: newId };
    users.push({ ...CU });

    localStorage.setItem('bjUser', JSON.stringify({ username: CU.username, loginTime: Date.now() }));

    // Notify admin
    await fbAdd('notifications', {
      title: '🎉 مستخدم جديد',
      body: `${regData.name} — ${regData.type === 'market_owner' ? '🏪 ' + regData.shop : '🤝 مندوب'} — ${city}`,
      type: 'info', read: false, targetUser: 'admin',
      date: new Date().toLocaleDateString('ar-IQ')
    }).catch(()=>{});

    closeModal('registerModal');
    buildUI();
    showPage('pageStore');
    toast(`🎉 أهلاً ${regData.name.split(' ')[0]}! تم إنشاء حسابك بنجاح 🎊`);

    // Send welcome message
    sendWelcomeMessage(regData);
  } catch(e) {
    errEl.textContent = '❌ خطأ في إنشاء الحساب، حاول مجدداً';
    console.error(e);
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='🎉 إنشاء الحساب'; }
  }
}

function sendWelcomeMessage(data) {
  const msg = `🏪 *أهلاً بك في برجمان!*\n\nمرحباً ${data.name} 👋\n\nتم تفعيل حسابك بنجاح.\n\n🛍️ يمكنك الآن:\n• تصفح المنتجات\n• تقديم الطلبات\n• متابعة رصيدك ونقاطك\n\n_شكراً لانضمامك معنا!_`;
  const waPhone = data.phone.replace('+','');
  try { window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank'); } catch(e){}
}

// ══════════════════════════════════════════════════════
// MARKETING SYSTEM
// ══════════════════════════════════════════════════════
let mktChannel = 'email', mktAudience = ['all'], campaigns = [];
const MKT_TEMPLATES = [
  { icon:'🎁', name:'عرض خاص', desc:'خصومات ومكافآت', body:`مرحباً {name} 👋\n\nلدينا عرض خاص خصيصاً لك!\n\n🏷️ خصم %20 على جميع المنتجات هذا الأسبوع\n\n🛍️ تفضل بزيارتنا وتمتع بأفضل الأسعار.` },
  { icon:'📦', name:'منتج جديد', desc:'إطلاق منتج جديد', body:`مرحباً {name} 🎉\n\nيسعدنا إخبارك بوصول منتجات جديدة!\n\n📦 منتجات طازجة وبأسعار مناسبة.\n\n🚀 كن من أوائل المستفيدين!` },
  { icon:'⭐', name:'نقاط مكافأة', desc:'تذكير بالنقاط', body:`مرحباً {name} ⭐\n\nعندك {points} نقطة متراكمة في برجمان!\n\n💡 لكل 100,000 د.ع تحصل على نقطة مكافأة.\n\n🛍️ استمر بالتسوق وتراكم نقاطك.` },
  { icon:'💰', name:'تذكير رصيد', desc:'إشعار عن الرصيد', body:`مرحباً {name} 💰\n\nرصيدك الحالي في برجمان: {balance} د.ع\n\n📊 تابع معاملاتك من تطبيق برجمان.` },
  { icon:'🌙', name:'عروض موسمية', desc:'مناسبات وأعياد', body:`مرحباً {name} 🌙\n\nبمناسبة هذه المناسبة الكريمة،\nنقدم لك عروضاً خاصة لا تُفوَّت!\n\n🎁 تفضل بزيارتنا والاستفادة من أحسن العروض.` },
  { icon:'🔔', name:'تذكير عام', desc:'إشعار وتنبيه', body:`مرحباً {name} 🔔\n\nتذكير من فريق برجمان:\n\n📍 {city}\n\n📞 للاستفسار تواصل معنا عبر الواتساب.` },
];

function buildMktTemplates() {
  const wrap = document.getElementById('mktTemplates');
  if (!wrap) return;
  wrap.innerHTML = MKT_TEMPLATES.map((t,i) => `
    <div class="tmpl-card" onclick="applyTemplate(${i})" id="tmpl_${i}">
      <div class="tmpl-icon">${t.icon}</div>
      <div class="tmpl-name">${t.name}</div>
      <div class="tmpl-desc">${t.desc}</div>
    </div>`).join('');
}

function applyTemplate(i) {
  document.querySelectorAll('.tmpl-card').forEach(c => c.classList.remove('on'));
  document.getElementById('tmpl_'+i)?.classList.add('on');
  const t = MKT_TEMPLATES[i];
  document.getElementById('mktBody').value = t.body;
  const subj = document.getElementById('mktSubject');
  if (subj) subj.value = `برجمان — ${t.name}`;
  updateMktPreview();
}

function setMktChannel(ch) {
  mktChannel = ch;
  ['email','wa','both'].forEach(c => {
    const el = document.getElementById('mktCh'+c.charAt(0).toUpperCase()+c.slice(1));
    if (el) el.className = `mkt-ch ${c}` + (c===ch?' on':'');
  });
  const subjWrap = document.getElementById('mktSubjectWrap');
  if (subjWrap) subjWrap.style.display = (ch==='email'||ch==='both') ? 'block' : 'none';
  updateMktPreview();
}

function toggleAud(type) {
  const cb = document.getElementById('aud_'+type+'_cb') || document.getElementById(`aud_${type === 'market_owner' ? 'mkt' : type}_cb`);
  if (type === 'all') {
    const allOn = document.getElementById('aud_all_cb').checked;
    ['rep','mkt','city'].forEach(t => {
      const el = document.getElementById('aud_'+t+'_cb');
      if (el) { el.checked = false; document.getElementById('aud_'+t)?.classList.remove('on'); }
    });
    document.getElementById('aud_all')?.classList.toggle('on', allOn);
    mktAudience = allOn ? ['all'] : [];
  } else {
    document.getElementById('aud_all_cb').checked = false;
    document.getElementById('aud_all')?.classList.remove('on');
    mktAudience = mktAudience.filter(a => a!=='all');
    const cityFilter = document.getElementById('mktCityFilter');
    if (type === 'city') {
      if (cityFilter) cityFilter.style.display = document.getElementById('aud_city_cb').checked ? 'block' : 'none';
    }
    if (document.getElementById('aud_'+type+'_cb')?.checked) {
      if (!mktAudience.includes(type)) mktAudience.push(type);
    } else {
      mktAudience = mktAudience.filter(a=>a!==type);
    }
  }
  updateMktAudience();
}

function getMktRecipients() {
  const mktAudCurrent = mktAudience;
  let list = users.filter(u => u.status !== 'inactive');
  if (mktAudCurrent.includes('all')) {
    list = list.filter(u => u.type === 'rep' || u.type === 'market_owner');
  } else {
    const filtered = [];
    if (mktAudCurrent.includes('rep')) filtered.push(...list.filter(u => u.type==='rep'));
    if (mktAudCurrent.includes('market_owner')) filtered.push(...list.filter(u => u.type==='market_owner'));
    if (mktAudCurrent.includes('city')) {
      const city = document.getElementById('mktCitySelect')?.value;
      if (city) filtered.push(...list.filter(u => u.city === city && !filtered.find(x=>x.username===u.username)));
    }
    list = [...new Map(filtered.map(u=>[u.username,u])).values()];
  }
  return list;
}

function updateMktAudience() {
  const list = getMktRecipients();
  const countEl = document.getElementById('mktRecipCount');
  if (countEl) countEl.textContent = list.length;
  const allCnt = document.getElementById('aud_all_cnt');
  const repCnt = document.getElementById('aud_rep_cnt');
  const mktCnt = document.getElementById('aud_mkt_cnt');
  if (allCnt) allCnt.textContent = users.filter(u=>u.type==='rep'||u.type==='market_owner').length;
  if (repCnt) repCnt.textContent = users.filter(u=>u.type==='rep').length;
  if (mktCnt) mktCnt.textContent = users.filter(u=>u.type==='market_owner').length;
  updateMktPreview();
}

function personalizeMsg(template, user) {
  const uo = users.find(u => u.username === user.username) || user;
  return template
    .replace(/{name}/g,    user.name || 'عزيزنا العميل')
    .replace(/{shop}/g,    user.shopName || user.name || '')
    .replace(/{points}/g,  (parseInt(uo.earnedPoints)||0).toString())
    .replace(/{balance}/g, (parseFloat(uo.balance)||0).toLocaleString() + ' د.ع')
    .replace(/{city}/g,    user.city || '');
}

function updateMktPreview() {
  const body  = document.getElementById('mktBody')?.value || '';
  const previewBox = document.getElementById('mktPreviewBox');
  const previewContent = document.getElementById('mktPreviewContent');
  if (!previewBox || !previewContent) return;
  if (!body.trim()) { previewBox.style.display='none'; return; }
  const sampleUser = users.find(u=>u.type==='market_owner'||u.type==='rep') || {name:'أحمد علي', shopName:'ماركت الرشيد', city:'بغداد', earnedPoints:5, balance:50000};
  previewBox.style.display = 'block';
  previewContent.textContent = personalizeMsg(body, sampleUser);
}

function insertVar(v) {
  const ta = document.getElementById('mktBody');
  if (!ta) return;
  const pos = ta.selectionStart;
  ta.value = ta.value.slice(0, pos) + v + ta.value.slice(ta.selectionEnd);
  ta.selectionStart = ta.selectionEnd = pos + v.length;
  ta.focus();
  updateMktPreview();
}

async function sendCampaign() {
  const body    = document.getElementById('mktBody')?.value.trim() || '';
  const subject = document.getElementById('mktSubject')?.value.trim() || 'رسالة من برجمان';
  if (!body) { toast('⚠️ اكتب نص الرسالة أولاً', false); return; }

  const recipients = getMktRecipients();
  if (!recipients.length) { toast('⚠️ لا يوجد مستلمون', false); return; }

  const btn = document.getElementById('mktSendBtn');
  if (btn) { btn.disabled=true; btn.textContent='⏳ جاري الإرسال...'; }

  const progWrap  = document.getElementById('sendProgressWrap');
  const progFill  = document.getElementById('sendProgFill');
  const progPct   = document.getElementById('sendPct');
  const statusTxt = document.getElementById('sendStatusTxt');
  const logEl     = document.getElementById('sendLog');
  if (progWrap) progWrap.style.display = 'block';
  if (logEl) logEl.innerHTML = '';

  let emailSent=0, emailFailed=0;
  const campaignId = 'CAM'+Date.now();
  const emailRecips = (mktChannel==='email'||mktChannel==='both') ? recipients.filter(u=>u.email) : [];

  // ── إرسال الإيميلات ──
  for (let i=0; i<emailRecips.length; i++) {
    const user = emailRecips[i];
    const msgText = personalizeMsg(body, user);
    const pct = Math.round(((i+1)/emailRecips.length)*100);
    if (progFill) progFill.style.width = pct+'%';
    if (progPct)  progPct.textContent  = pct+'%';
    if (statusTxt) statusTxt.textContent = `📧 إرسال لـ ${user.name} (${i+1}/${emailRecips.length})`;

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:   user.email,
        subject,
        rep_name:   user.name,
        shop_name:  user.shopName || '',
        order_id:   campaignId,
        order_date: new Date().toLocaleString('ar-IQ'),
        products:   msgText,
        total:'', commission:'', net:'', shop_addr:'', shop_note:'', location:'',
      });
      emailSent++;
      addSendLog(logEl, `✅ ${user.name} — ${user.email}`, true);
    } catch(e) {
      emailFailed++;
      addSendLog(logEl, `❌ ${user.name} — ${e.text||e.message||'خطأ'}`, false);
    }
    // إشعار داخل التطبيق
    fbAdd('notifications', {
      title: `📣 ${subject}`,
      body: msgText.substring(0,120),
      type:'info', read:false,
      targetUser: user.username,
      date: new Date().toLocaleDateString('ar-IQ')
    }).catch(()=>{});

    await new Promise(r=>setTimeout(r, 120));
  }

  if (statusTxt) statusTxt.textContent = emailRecips.length
    ? `✅ الإيميلات: ${emailSent} نجاح${emailFailed?' | '+emailFailed+' فشل':''}`
    : '—';

  // ── حفظ سجل الحملة ──
  const campData = {
    campaignId, subject, channel: mktChannel,
    bodyPreview: body.substring(0,100),
    totalSent: emailSent, totalFailed: emailFailed,
    recipientCount: recipients.length,
    sentBy: CU?.name || '—',
    date: new Date().toLocaleDateString('ar-IQ')
  };
  await fbAdd('campaigns', campData).catch(()=>{});
  campaigns.unshift({ ...campData, _id: campaignId });

  setTimeout(() => { if(progWrap) progWrap.style.display='none'; }, 4000);
  if (btn) { btn.disabled=false; btn.textContent='🚀 إرسال الحملة'; }

  if (emailRecips.length)
    toast(`✅ إيميلات: ${emailSent} وصلت${emailFailed?' | '+emailFailed+' فشلت':''}`);

  // ── واتساب: فتح نافذة الإرسال الجماعي ──
  if (mktChannel==='wa' || mktChannel==='both') {
    const waRecips = recipients.filter(u=>u.phone);
    if (waRecips.length) {
      openWaBulkSender(waRecips, body);
    } else {
      toast('⚠️ لا يوجد مستلمون بأرقام واتساب', false);
    }
  }

  renderCampaignHistory();
}

function addSendLog(el, msg, ok) {
  if (!el) return;
  const line = document.createElement('div');
  line.className = 'send-log-line ' + (ok?'ok':'err');
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function openWaBulkSender(recipients, bodyTemplate) {
  const withPhone = recipients.filter(u => u.phone);
  if (!withPhone.length) { toast('⚠️ لا يوجد أرقام واتساب', false); return; }

  const infoEl = document.getElementById('waBulkInfo');
  const listEl = document.getElementById('waBulkList');
  if (!infoEl || !listEl) return;

  infoEl.textContent = `${withPhone.length} مستلم — اضغط "فتح" لكل شخص لإرسال الرسالة`;

  listEl.innerHTML = '';
  withPhone.forEach(u => {
    const msg = personalizeMsg(bodyTemplate, u);
    const waPhone = (u.phone || '').replace(/\+|\s|-/g, '');
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(9,50,87,.04);border-radius:8px;border:1px solid rgba(9,50,87,.08)';
    row.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:.82rem;color:#093257">${u.name||'—'}</div>
        <div style="font-size:.73rem;color:rgba(9,50,87,.45);direction:ltr;text-align:right">${u.phone||''}</div>
      </div>
      <button onclick="window.open('${url}','_blank');this.textContent='✅';this.disabled=true;this.style.background='rgba(13,148,136,.12)';this.style.color='var(--teal2)'"
        style="flex-shrink:0;padding:6px 14px;background:#25d366;color:#fff;border:none;border-radius:7px;font-size:.8rem;cursor:pointer;font-family:inherit">
        فتح 💬
      </button>`;
    listEl.appendChild(row);
  });

  openModal('waBulkModal');
}

function renderMarketingKpi() {
  const kpiEl = document.getElementById('mktKpi');
  if (!kpiEl) return;
  const total = users.filter(u=>u.type==='rep'||u.type==='market_owner').length;
  const withEmail = users.filter(u=>u.email).length;
  const withPhone = users.filter(u=>u.phone).length;
  const withNewsLetter = users.filter(u=>u.newsletter!==false).length;
  kpiEl.innerHTML = `
    <div class="kpi-card kpi-sky"><div class="kpi-icon">👥</div><div class="kpi-val">${total}</div><div class="kpi-lbl">إجمالي العملاء</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">📧</div><div class="kpi-val">${withEmail}</div><div class="kpi-lbl">عندهم إيميل</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">📱</div><div class="kpi-val">${withPhone}</div><div class="kpi-lbl">عندهم رقم هاتف</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">✅</div><div class="kpi-val">${withNewsLetter}</div><div class="kpi-lbl">مشتركون بالإشعارات</div></div>`;
}

function switchMktTab(tab) {
  const usersEl    = document.getElementById('contactsList');
  const visitorsEl = document.getElementById('visitorsList');
  const tabU = document.getElementById('mktTabUsers');
  const tabV = document.getElementById('mktTabVisitors');
  if (!usersEl || !visitorsEl) return;
  if (tab === 'visitors') {
    usersEl.style.display    = 'none';
    visitorsEl.style.display = 'block';
    tabV.style.color         = 'var(--teal2)';
    tabV.style.borderBottom  = '2.5px solid var(--teal2)';
    tabU.style.color         = 'rgba(9,50,87,.45)';
    tabU.style.borderBottom  = 'none';
    renderVisitors();
  } else {
    visitorsEl.style.display = 'none';
    usersEl.style.display    = 'block';
    tabU.style.color         = 'var(--teal2)';
    tabU.style.borderBottom  = '2.5px solid var(--teal2)';
    tabV.style.color         = 'rgba(9,50,87,.45)';
    tabV.style.borderBottom  = 'none';
  }
}

function renderVisitors() {
  const el = document.getElementById('visitorsList');
  if (!el) return;
  const q = (document.getElementById('contactSearch')?.value||'').toLowerCase();
  // تجميع الزوار الفريدين من الطلبات
  const visMap = new Map();
  orders.filter(o => o.visitorPhone).forEach(o => {
    const ph = o.visitorPhone;
    if (!visMap.has(ph)) {
      visMap.set(ph, { phone: ph, shopName: o.shopName||'—', addr: o.shopAddress||o.addr||'—', orders: 0, total: 0, lastDate: o.date||'' });
    }
    const v = visMap.get(ph);
    v.orders++;
    v.total += parseFloat(o.total)||0;
    v.lastDate = o.date || v.lastDate;
  });
  let visitors = [...visMap.values()];
  if (q) visitors = visitors.filter(v => v.phone.includes(q) || v.shopName.toLowerCase().includes(q) || v.addr.toLowerCase().includes(q));
  const badge = document.getElementById('visitorsCountBadge');
  if (badge) badge.textContent = visMap.size;
  el.innerHTML = visitors.length ? visitors.map(v => `
    <div class="contact-row">
      <div class="contact-av">👤</div>
      <div class="contact-info">
        <div class="contact-name">${v.shopName}</div>
        <div class="contact-meta">📞 ${v.phone} · 📍 ${v.addr}</div>
        <div class="contact-badges">
          <span class="badge b-sky">${v.orders} طلب</span>
          <span class="badge b-green">${v.total.toLocaleString()} د.ع</span>
          <span class="badge b-teal">آخر طلب: ${v.lastDate}</span>
        </div>
      </div>
      <div style="flex-shrink:0">
        <a href="https://wa.me/${v.phone.replace(/\D/g,'')}" target="_blank" class="btn btn-sm" style="background:linear-gradient(135deg,#25D366,#128C7E);color:white;border:none;text-decoration:none">واتساب</a>
      </div>
    </div>`).join('')
  : '<div style="text-align:center;padding:35px;color:rgba(9,50,87,.35)">لا يوجد زوار بعد</div>';
}

function renderContacts() {
  const el = document.getElementById('contactsList');
  if (!el) return;
  const q = (document.getElementById('contactSearch')?.value||'').toLowerCase();
  let list = users.filter(u => u.type==='rep'||u.type==='market_owner');
  if (q) list = list.filter(u=>u.name.toLowerCase().includes(q)||u.phone?.includes(q)||u.email?.toLowerCase().includes(q)||u.city?.toLowerCase().includes(q));
  el.innerHTML = list.length ? list.map(u => `
    <div class="contact-row" onclick="openContactDetail('${u.username}')">
      <div class="contact-av">${u.type==='rep'?'🤝':'🏪'}</div>
      <div class="contact-info">
        <div class="contact-name">${u.name}</div>
        <div class="contact-meta">${u.phone||'—'} ${u.email?'· '+u.email:''}</div>
        <div class="contact-badges">
          ${u.city?`<span class="badge b-sky">${u.city}</span>`:''}
          ${u.phone?`<span class="badge b-green">📱 واتساب</span>`:''}
          ${u.email?`<span class="badge b-teal">إيميل</span>`:''}
          ${u.newsletter===false?`<span class="badge b-red">🔕 غير مشترك</span>`:`<span class="badge b-mint">✅ مشترك</span>`}
        </div>
      </div>
      <div style="text-align:left;flex-shrink:0">
        <div style="font-size:.72rem;color:rgba(9,50,87,.4)">${ROLES[u.type]||u.type}</div>
        <div style="font-size:.78rem;font-weight:700;color:var(--violet)">⭐ ${parseInt(u.earnedPoints)||0} نقطة</div>
      </div>
    </div>`).join('')
  : '<div style="text-align:center;padding:35px;color:rgba(9,50,87,.35)">لا يوجد عملاء بعد</div>';
}

function openContactDetail(username) {
  const u = users.find(x=>x.username===username); if (!u) return;
  const myOrds = orders.filter(o=>o.repUser===username||o.shopName===u.name);
  document.getElementById('contactDetailContent').innerHTML = `
    <div style="text-align:center;margin-bottom:16px">
      <div style="width:60px;height:60px;border-radius:var(--r16);background:linear-gradient(135deg,rgba(13,148,136,.13),rgba(15,118,110,.08));display:flex;align-items:center;justify-content:center;font-size:1.6rem;margin:0 auto 8px">${u.type==='rep'?'🤝':'🏪'}</div>
      <div style="font-weight:900;color:var(--deep);font-size:1rem">${u.name}</div>
      <div style="font-size:.75rem;color:rgba(9,50,87,.45)">${ROLES[u.type]||u.type}</div>
    </div>
    <div style="display:grid;gap:8px;margin-bottom:14px">
      ${[['📱 هاتف',u.phone||'—'],['إيميل',u.email||'—'],['📍 مدينة',u.city||'—'],['🏪 ماركت',u.shopName||'—'],
         ['💰 رصيد',(parseFloat(u.balance)||0).toLocaleString()+' د.ع'],['⭐ نقاط',(parseInt(u.earnedPoints)||0)+' نقطة'],
         ['📦 طلبات',myOrds.length],['📅 تسجيل',u.registeredAt||'—']].map(([l,v])=>`
        <div style="display:flex;justify-content:space-between;padding:8px 11px;background:rgba(13,148,136,.04);border-radius:var(--r8);font-size:.82rem">
          <span style="color:rgba(9,50,87,.5)">${l}</span><span style="font-weight:700;color:var(--deep)">${v}</span>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${u.phone?`<a href="https://wa.me/${u.phone.replace(/\+|\s/g,'')}" target="_blank" class="btn btn-sm" style="background:linear-gradient(135deg,#25D366,#128C7E);color:white;border:none;text-decoration:none;flex:1;justify-content:center">واتساب</a>`:''}
      ${u.email?`<a href="mailto:${u.email}" class="btn btn-sky btn-sm" style="flex:1;justify-content:center;text-decoration:none">إيميل</a>`:''}
      <button class="btn btn-ghost btn-sm" onclick="closeModal('contactDetailModal');openPayForUser('${u.username}')" style="flex:1">رصيد</button>
    </div>`;
  openModal('contactDetailModal');
}

async function renderCampaignHistory() {
  const el = document.getElementById('campaignHistory');
  if (!el) return;
  if (!campaigns.length) {
    const raw = await fbGet('campaigns');
    campaigns = raw.sort((a,b)=>{
      const da=a.createdAt?.seconds||0, db_=b.createdAt?.seconds||0;
      return db_-da;
    });
  }
  const q = (document.getElementById('campaignSearch')?.value||'').toLowerCase();
  const filtered = q ? campaigns.filter(c=>
    (c.subject||'').toLowerCase().includes(q) ||
    (c.channel||'').includes(q) ||
    (c.date||'').includes(q) ||
    (c.sentBy||'').toLowerCase().includes(q)
  ) : campaigns;

  el.innerHTML = filtered.length ? filtered.map(c=>`
    <tr>
      <td style="white-space:nowrap;font-size:.75rem;color:rgba(9,50,87,.5)">${tsToStr(c.createdAt)||c.date||'—'}</td>
      <td style="font-weight:700;color:var(--deep);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.subject||'—'}</td>
      <td><span class="badge ${c.channel==='email'?'b-sky':c.channel==='wa'?'b-green':'b-violet'}">${c.channel==='email'?'إيميل':c.channel==='wa'?'واتساب':'🔁 الاثنين'}</span></td>
      <td>${c.recipientCount||0}</td>
      <td style="color:var(--dark);font-weight:700">${c.totalSent||0}</td>
      <td style="color:var(--rose);font-weight:700">${c.totalFailed||0}</td>
      <td><button class="btn btn-sm" style="background:rgba(244,63,94,.08);color:#e11d48;border:none;padding:4px 8px" onclick="deleteCampaign('${c._id||c.campaignId||''}')">حذف</button></td>
    </tr>`).join('')
  : `<tr><td colspan="7" style="text-align:center;padding:25px;color:rgba(9,50,87,.33)">لا توجد حملات${q?' بهذا البحث':' بعد'}</td></tr>`;
}

async function deleteCampaign(id) {
  if (!id || !confirm('حذف هذه الحملة؟')) return;
  await fbDel('campaigns', id).catch(()=>{});
  campaigns = campaigns.filter(c => (c._id||c.campaignId||'') !== id);
  renderCampaignHistory();
  toast('تم حذف الحملة');
}

async function deleteAllCampaigns() {
  const q = (document.getElementById('campaignSearch')?.value||'').toLowerCase();
  const toDelete = q
    ? campaigns.filter(c=>(c.subject||'').toLowerCase().includes(q)||(c.channel||'').includes(q))
    : campaigns;
  if (!toDelete.length || !confirm(`حذف ${toDelete.length} حملة؟`)) return;
  await Promise.all(toDelete.map(c => fbDel('campaigns', c._id||c.campaignId||'').catch(()=>{})));
  const deleteIds = new Set(toDelete.map(c=>c._id||c.campaignId||''));
  campaigns = campaigns.filter(c => !deleteIds.has(c._id||c.campaignId||''));
  renderCampaignHistory();
  toast(`تم حذف ${toDelete.length} حملة`);
}

function exportContacts() {
  if (typeof XLSX === 'undefined') { toast('جاري تحميل المكتبة...','info'); return; }
  const list = users.filter(u=>u.type==='rep'||u.type==='market_owner');
  const rows = [['الاسم','نوع الحساب','الهاتف','الإيميل','المدينة','اسم الماركت','الرصيد','النقاط','مشترك','تاريخ التسجيل']];
  list.forEach(u => rows.push([u.name,ROLES[u.type]||u.type,u.phone||'',u.email||'',u.city||'',u.shopName||'',parseFloat(u.balance)||0,parseInt(u.earnedPoints)||0,u.newsletter!==false?'نعم':'لا',u.registeredAt||'']));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
  XLSX.writeFile(wb, 'burjuman_contacts_'+new Date().toISOString().split('T')[0]+'.xlsx');
  toast('تم تصدير '+list.length+' عميل');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    injectRegisterLink();
    setMktChannel('email');
    buildMktTemplates();
    updateMktAudience();
    renderCampaignHistory();
  }, 2000);
});




// ═══════════════════════════════════════════════════════════════════
// FEATURE IMPLEMENTATIONS — All 7 Features
// ═══════════════════════════════════════════════════════════════════

// ── Extend PERMS and ROLES ──
PERMS.preparer = { order:0, manage:0, dash:0, users:0, wallet:0, inv:0, inv_write:0, offers:0, tracking:0, reports:0, notif:1, prep:1 };
PERMS.driver   = { order:0, manage:0, dash:0, users:0, wallet:0, inv:0, inv_write:0, offers:0, tracking:0, reports:0, notif:1, driver:1 };
ROLES.preparer = '📦 مجهز';
ROLES.driver   = '🚗 سائق';


// ── Helper: send browser notification ──
function browserNotif(title, body, icon) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: icon || 'https://via.placeholder.com/64?text=🏪' }); } catch(e) {}
  }
}

// ── Helper: parse cart items from order products string ──
function parseCartItems(products) {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  const matches = String(products).match(/([^،,\n()]+)\((\d+)\)/g) || [];
  return matches.map(m => {
    const mm = m.match(/(.+)\((\d+)\)/);
    if (!mm) return null;
    const name = mm[1].trim();
    const qty  = parseInt(mm[2]) || 1;
    const prod = window._products_cache?.find(p => p.name === name) || products.find?.(p => p.name === name);
    return { name, qty, price: prod?.price || 0, carton_l: prod?.carton_l || 0, carton_w: prod?.carton_w || 0, carton_h: prod?.carton_h || 0, carton_volume: prod?.carton_volume || 0, carton_weight: prod?.carton_weight || 0 };
  }).filter(Boolean);
}

// ── Cache products for volume/weight calcs ──
function cacheProducts() { window._products_cache = products; }

// ── Auto-calculate carton volume from L×W×H ──
function calcCartonVolume() {
  const l = parseFloat(document.getElementById('pe_carton_l')?.value) || 0;
  const w = parseFloat(document.getElementById('pe_carton_w')?.value) || 0;
  const h = parseFloat(document.getElementById('pe_carton_h')?.value) || 0;
  const calcDiv = document.getElementById('pe_volume_calc');
  const resultSpan = document.getElementById('pe_volume_result');
  if (!calcDiv || !resultSpan) return;
  if (l && w && h) {
    const vol = (l * w * h) / 1000000;
    resultSpan.textContent = vol.toFixed(6);
    calcDiv.style.display = 'block';
  } else {
    calcDiv.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════
// FEATURE 1: carton_volume / carton_weight — الحفظ مدمج في saveProd مباشرة
// ══════════════════════════════════════════════════════
const _origSaveProd = saveProd; // احتياطي فقط

const _origOpenEditProd = openEditProd;
openEditProd = function(i) {
  _origOpenEditProd(i);
  const p = products[i];
  const lEl = document.getElementById('pe_carton_l');
  const wEl = document.getElementById('pe_carton_w');
  const hEl = document.getElementById('pe_carton_h');
  const wgtEl = document.getElementById('pe_carton_weight');
  if (lEl) lEl.value = p.carton_l || '';
  if (wEl) wEl.value = p.carton_w || '';
  if (hEl) hEl.value = p.carton_h || '';
  if (wgtEl) wgtEl.value = p.carton_weight || '';
  calcCartonVolume();
};

const _origOpenAddProd = openAddProd;
openAddProd = function() {
  _origOpenAddProd();
  const lEl = document.getElementById('pe_carton_l');
  const wEl = document.getElementById('pe_carton_w');
  const hEl = document.getElementById('pe_carton_h');
  const wgtEl = document.getElementById('pe_carton_weight');
  if (lEl) lEl.value = '';
  if (wEl) wEl.value = '';
  if (hEl) hEl.value = '';
  if (wgtEl) wgtEl.value = '';
  calcCartonVolume();
};

// الحقول الإضافية مدمجة في loadProducts مباشرة — لا حاجة لهذا الباتش
const _origLoadProducts = loadProducts; // احتياطي فقط

// ══════════════════════════════════════════════════════
// FEATURE: PACKAGING UNITS
// ══════════════════════════════════════════════════════
let packagingUnits = []; // [{_id, name}]

async function loadPackagingUnits() {
  try {
    const raw = await fbGet('packagingUnits');
    packagingUnits = raw || [];
  } catch(e) { packagingUnits = []; }
}

function renderPackagingUnitsList() {
  const el = document.getElementById('packagingUnitsList');
  if (!el) return;
  if (!packagingUnits.length) {
    el.innerHTML = '<div style="text-align:center;padding:12px;font-size:.8rem;color:rgba(9,50,87,.38)">لا توجد وحدات بعد</div>';
    return;
  }
  el.innerHTML = packagingUnits.map(u => `
    <div class="pkg-unit-row">
      <span class="pkg-unit-name">${u.name}</span>
      <button class="btn btn-sm" style="background:rgba(244,63,94,.08);color:#e11d48;border:1px solid rgba(244,63,94,.18);padding:4px 10px" onclick="deletePackagingUnit('${u._id||u.name}')">حذف</button>
    </div>`).join('');
}

async function addPackagingUnit() {
  const inp = document.getElementById('newUnitName');
  const name = inp.value.trim();
  if (!name) return;
  if (packagingUnits.find(u => u.name === name)) { toast('الوحدة موجودة مسبقاً', false); return; }
  const id = await fbAdd('packagingUnits', { name });
  packagingUnits.push({ _id: id || name, name });
  inp.value = '';
  renderPackagingUnitsList();
  renderProdPackagingFields(); // refresh open modal if any
  toast('تمت إضافة الوحدة: ' + name);
}

async function deletePackagingUnit(id) {
  packagingUnits = packagingUnits.filter(u => (u._id || u.name) !== id);
  try { await fbDel('packagingUnits', id); } catch(e) {}
  renderPackagingUnitsList();
  renderProdPackagingFields();
  toast('تم حذف الوحدة');
}

// Render packaging dropdown inside product edit modal
function renderProdPackagingFields(currentPkg, currentFrac) {
  const unitSel = document.getElementById('pe_pkg_unit');
  if (!unitSel) return;
  // Populate dropdown
  const currentUnit = currentPkg ? Object.keys(currentPkg)[0] : '';
  const currentQty  = currentPkg ? (Object.values(currentPkg)[0] || '') : '';
  const currentFracObj = currentUnit && currentFrac ? (currentFrac[currentUnit] || {}) : {};
  unitSel.innerHTML = '<option value="">-- اختر الوحدة --</option>' +
    packagingUnits.map(u => `<option value="${u.name}" ${u.name===currentUnit?'selected':''}>${u.name}</option>`).join('');
  const qtyEl  = document.getElementById('pe_pkg_qty');
  const halfEl = document.getElementById('pe_pkg_half');
  const qtrEl  = document.getElementById('pe_pkg_qtr');
  if (qtyEl)  qtyEl.value   = currentQty || '';
  if (halfEl) halfEl.checked = !!currentFracObj.half;
  if (qtrEl)  qtrEl.checked  = !!currentFracObj.quarter;
}

// Read packaging + fraction values from new simplified UI
function readProdPackagingValues() {
  const unitEl = document.getElementById('pe_pkg_unit');
  const qtyEl  = document.getElementById('pe_pkg_qty');
  const halfEl = document.getElementById('pe_pkg_half');
  const qtrEl  = document.getElementById('pe_pkg_qtr');
  const unitName = unitEl?.value || '';
  const qty = parseInt(qtyEl?.value) || 0;
  if (!unitName || qty <= 0) return { packaging: null, packagingFractions: null };
  const pkg = { [unitName]: qty };
  const uf = {};
  if (halfEl?.checked) uf.half = true;
  if (qtrEl?.checked)  uf.quarter = true;
  const frac = Object.keys(uf).length ? { [unitName]: uf } : {};
  return { packaging: pkg, packagingFractions: Object.keys(frac).length ? frac : null };
}

// Render packaging chips (display only)
function renderPkgChips(pkg) {
  if (!pkg || !Object.keys(pkg).length) return '';
  return Object.entries(pkg).map(([unit, qty]) =>
    `<span class="pkg-chip">${unit}: ${qty}</span>`
  ).join(' ');
}

// ══ الحفظ الموحد مدمج في saveProd مباشرة — هذا الباتش لم يعد ضرورياً ══
const _origSaveProd2 = saveProd; // احتياطي فقط

// Patch openEditProd to fill packaging + fractions
const _origOpenEditProd2 = openEditProd;
openEditProd = function(i) {
  const p = products[i];
  window._editingProdPkg  = p?.packaging || {};
  window._editingProdFrac = p?.packagingFractions || {};
  _origOpenEditProd2(i);
  renderProdPackagingFields(window._editingProdPkg, window._editingProdFrac);
};

// Patch openAddProd to clear packaging
const _origOpenAddProd2 = openAddProd;
openAddProd = function() {
  window._editingProdPkg  = {};
  window._editingProdFrac = {};
  _origOpenAddProd2();
  renderProdPackagingFields({}, {});
};

// Load packaging units alongside products
const _origLoadProducts2 = loadProducts;
loadProducts = async function() {
  await Promise.all([_origLoadProducts2(), loadPackagingUnits()]);
  cacheProducts();
};

// openProdModal is now self-contained (packaging/dims/units handled directly)

// Init packaging units on page ready
document.addEventListener('fbReady', async function() {
  await loadPackagingUnits();
}, { once: true });

// ══════════════════════════════════════════════════════
// FEATURE 2: Update sidebar nav for Preparer/Driver
// ══════════════════════════════════════════════════════
const _orig2BuildSidebar = buildSidebar;
buildSidebar = function() {
  _orig2BuildSidebar();
  if (!CU) return;
  const sbNav = document.getElementById('sbNav');
  if (!sbNav) return;

  if (CU.type === 'preparer') {
    // Replace nav entirely for preparer
    sbNav.innerHTML = `
      <div class="nav-item active" id="nav_pagePrep" onclick="showPage('pagePrep')">
        <span class="nav-icon">مخزون</span>لوحة المجهز
      </div>
      <div class="nav-item" id="nav_pageNotifications" onclick="showPage('pageNotifications')">
        <span class="nav-icon">🔔</span>الإشعارات
      </div>`;
    renderPrepDashboard();
  } else if (CU.type === 'driver') {
    sbNav.innerHTML = `
      <div class="nav-item active" id="nav_pageDriver" onclick="showPage('pageDriver')">
        <span class="nav-icon">🚗</span>لوحة السائق
      </div>
      <div class="nav-item" id="nav_pageNotifications" onclick="showPage('pageNotifications')">
        <span class="nav-icon">🔔</span>الإشعارات
      </div>`;
    renderDriverDashboard();
  } else if (CU && (CU.type === 'admin' || CU.type === 'sales_manager')) {
    // Add performance reports nav if not exists
    if (!sbNav.querySelector('#nav_pagePerfReports')) {
      const div = document.createElement('div');
      div.className = 'nav-item';
      div.id = 'nav_pagePerfReports';
      div.innerHTML = '<span class="nav-icon">📊</span>تقارير الأداء';
      div.onclick = () => showPage('pagePerfReports');
      sbNav.appendChild(div);
    }
  }
};

// After login, redirect preparer/driver to correct page
const _origBuildUI2 = buildUI;
buildUI = function() {
  _origBuildUI2();
  if (CU && CU.type === 'preparer') {
    setTimeout(() => showPage('pagePrep'), 100);
  } else if (CU && CU.type === 'driver') {
    setTimeout(() => showPage('pageDriver'), 100);
  }
};

// ══════════════════════════════════════════════════════
// FEATURE 3: PREPARER DASHBOARD
// ══════════════════════════════════════════════════════

// onSnapshot for orders — extended
let _prepSnapshot = null, _driverSnapshot = null;
function startNewRoleListeners() {
  if (!fbReady || !CU) return;

  if (CU.type === 'preparer' && !_prepSnapshot) {
    _prepSnapshot = fb().onSnapshot(
      fb().query(fb().collection(db(), 'orders'),
        fb().where('status', 'in', ['Pending', 'Confirmed', 'pending', 'confirmed'])),
      snap => {
        renderPrepDashboard();
        // Notify preparer of new orders
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const o = change.doc.data();
            browserNotif('📦 طلب جديد للتجهيز', `${o.shopName || ''} — ${(o.total || 0).toLocaleString()} د.ع`);
            fbAdd('notifications', {
              title: '📦 طلب جديد للتجهيز',
              body: `${o.shopName || ''} — ${(o.total || 0).toLocaleString()} د.ع`,
              type: 'order', read: false, targetUser: CU.username,
              date: new Date().toLocaleDateString('ar-IQ')
            }).catch(() => {});
          }
        });
      }
    );
  }

  if (CU.type === 'driver' && !_driverSnapshot) {
    _driverSnapshot = fb().onSnapshot(
      fb().query(fb().collection(db(), 'orders'), fb().where('status', '==', 'Prepared')),
      snap => {
        renderDriverDashboard();
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const o = change.doc.data();
            browserNotif('🚗 طلب جاهز للتوصيل', `${o.shopName || ''}`);
            fbAdd('notifications', {
              title: '🚗 طلب جاهز للتوصيل',
              body: `طلب ${o.shopName || ''} جاهز للتحميل`,
              type: 'order', read: false, targetUser: CU.username,
              date: new Date().toLocaleDateString('ar-IQ')
            }).catch(() => {});
          }
        });
      }
    );
  }
}

// Calc order volume & weight from items
function calcOrderVolumeWeight(order) {
  let totalVol = 0, totalWgt = 0;
  const items = order.cartItemsArray || parseCartItems(order.products);
  items.forEach(item => {
    const prod = products.find(p => p.name === item.name);
    if (prod) {
      totalVol += (prod.carton_volume || 0) * (item.qty || 1);
      totalWgt += (prod.carton_weight || 0) * (item.qty || 1);
    }
  });
  return { vol: totalVol.toFixed(3), wgt: totalWgt.toFixed(2) };
}

// Render Preparer Dashboard
async function renderPrepDashboard() {
  const listEl = document.getElementById('prepOrdersList');
  const kpiEl  = document.getElementById('prepKpi');
  if (!listEl || !kpiEl) return;

  // Load all orders with status Pending or Confirmed
  let prepOrders = [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), 'orders'));
    snap.docs.forEach(d => {
      const data = d.data();
      const st = (data.status || 'Pending').toLowerCase();
      if (['pending', 'confirmed'].includes(st)) {
        prepOrders.push({ _id: d.id, ...data });
      }
    });
  } catch(e) {
    prepOrders = orders.filter(o => {
      const st = (o.status || 'pending').toLowerCase();
      return ['pending', 'confirmed'].includes(st);
    });
  }

  const totalVol = prepOrders.reduce((s, o) => { const {vol} = calcOrderVolumeWeight(o); return s + parseFloat(vol); }, 0);
  const totalWgt = prepOrders.reduce((s, o) => { const {wgt} = calcOrderVolumeWeight(o); return s + parseFloat(wgt); }, 0);

  kpiEl.innerHTML = `
    <div class="kpi-card kpi-sky"><div class="kpi-icon">مخزون</div><div class="kpi-val">${prepOrders.length}</div><div class="kpi-lbl">طلبات للتجهيز</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">📐</div><div class="kpi-val">${totalVol.toFixed(2)}</div><div class="kpi-lbl">إجمالي الحجم (م³)</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">⚖️</div><div class="kpi-val">${totalWgt.toFixed(1)}</div><div class="kpi-lbl">إجمالي الوزن (كغ)</div></div>`;

  if (!prepOrders.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:55px;color:rgba(9,50,87,.35)"><div style="font-size:2.5rem;margin-bottom:10px">✅</div><p>لا توجد طلبات للتجهيز حالياً</p></div>';
    return;
  }

  listEl.innerHTML = prepOrders.map(o => {
    const { vol, wgt } = calcOrderVolumeWeight(o);
    const items = o.cartItemsArray || parseCartItems(o.products);
    const statusBadge = (o.status || 'Pending') === 'Confirmed' ? '<span class="badge b-sky">✅ مؤكد</span>' : '<span class="badge b-gold">⏳ معلق</span>';
    return `
    <div class="prep-order-card">
      <div class="prep-order-hd">
        <div>
          <div class="prep-order-shop">🏪 ${o.shopName || '—'}</div>
          <div class="prep-order-id">${o.orderId || o._id}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${statusBadge}
        </div>
      </div>
      <div class="prep-order-meta">
        <span class="badge b-teal">📐 ${vol} م³</span>
        <span class="badge b-mint">⚖️ ${wgt} كغ</span>
        <span class="badge b-sky">💰 ${(parseFloat(o.total)||0).toLocaleString()} د.ع</span>
        <span class="badge b-violet">📅 ${o.date || tsToStr(o.createdAt) || '—'}</span>
      </div>
      ${items.length ? `
      <div class="prep-items-list">
        ${items.map(item => `
          <div class="prep-item-row">
            <span class="prep-item-name">${item.name}</span>
            <span class="badge b-sky">${item.qty} وحدة</span>
          </div>`).join('')}
      </div>` : `<div style="font-size:.8rem;color:rgba(9,50,87,.4);padding:7px">${o.products || '—'}</div>`}

      <!-- Vehicle Selector -->
      <div style="margin-top:10px">
        <div style="font-size:.74rem;font-weight:700;color:rgba(9,50,87,.5);margin-bottom:7px">🚚 نوع المركبة</div>
        <div class="vehicle-selector" id="vehicle_${o._id}">
          <button class="vehicle-opt ${(o.vehicle_type==='ستوتة')?'selected':''}" onclick="selectVehicle('${o._id}','ستوتة',this)">
            <span class="v-icon">🛵</span>ستوتة
          </button>
          <button class="vehicle-opt ${(o.vehicle_type==='حمل صغيرة')?'selected':''}" onclick="selectVehicle('${o._id}','حمل صغيرة',this)">
            <span class="v-icon">🚐</span>حمل صغيرة
          </button>
          <button class="vehicle-opt ${(o.vehicle_type==='شاحنة')?'selected':''}" onclick="selectVehicle('${o._id}','شاحنة',this)">
            <span class="v-icon">🚛</span>شاحنة
          </button>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="openPrepEditModal('${o._id}')">تعديل الكميات</button>
        <button class="btn btn-mint" style="flex:1" onclick="markAsPrepared('${o._id}')">تم التجهيز</button>
      </div>
    </div>`;
  }).join('');
}

async function selectVehicle(orderId, vehicleType, btn) {
  // Update UI
  const wrap = document.getElementById('vehicle_' + orderId);
  if (wrap) wrap.querySelectorAll('.vehicle-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // Save to Firebase
  await fbUpdate('orders', orderId, { vehicle_type: vehicleType }).catch(() => {});
  toast(`تم اختيار: ${vehicleType}`);
}

async function markAsPrepared(orderId) {
  if (!CU) return;
  const now = new Date().toISOString();
  await fbUpdate('orders', orderId, {
    status: 'Prepared',
    prepared_by: CU.username,
    prepared_by_name: CU.name,
    prepared_at: now
  }).catch(() => {});
  toast('تم تحديد الطلب كـ "مجهز"');
  renderPrepDashboard();

  const prepOrd = orders.find(o => o._id === orderId);

  // Notify drivers
  await fbAdd('notifications', {
    title: '🚗 طلب جاهز للتوصيل',
    body: `طلب رقم ${orderId}${prepOrd ? ' — ' + prepOrd.shopName : ''} جاهز للتحميل`,
    type: 'order', read: false, targetUser: 'driver',
    orderId,
    date: new Date().toLocaleDateString('ar-IQ')
  }).catch(() => {});
  browserNotif('🚗 طلب جاهز للتوصيل', 'طلب جديد جاهز للتحميل');

  // Notify customer that their order is prepared and leaving warehouse
  if (prepOrd) {
    const custUser = users.find(u => u.name === prepOrd.shopName || u.shop === prepOrd.shopName);
    const targetUser = custUser?.username || prepOrd.repUsername || prepOrd.visitorPhone || 'customer';
    await fbAdd('notifications', {
      title: '🚛 تم تجهيز طلبك!',
      body: `طلبك جاهز وخرج من المخزن — جارٍ تعيين السائق`,
      type: 'order', read: false,
      targetUser,
      orderId,
      date: new Date().toLocaleDateString('ar-IQ')
    }).catch(() => {});
  }
}

function openPrepEditModal(orderId) {
  // Find order
  fbGet('orders').then(allOrds => {
    const rawOrd = allOrds.find(o => o._id === orderId);
    if (!rawOrd) { toast('لم يتم العثور على الطلب', false); return; }

    document.getElementById('prepEditOrderId').value = orderId;
    document.getElementById('prepEditOrderInfo').innerHTML =
      `🏪 ${rawOrd.shopName || '—'} — 💰 ${(parseFloat(rawOrd.total)||0).toLocaleString()} د.ع`;

    const items = rawOrd.cartItemsArray || parseCartItems(rawOrd.products);
    let itemsHtml = '';
    if (items.length) {
      itemsHtml = items.map((item, i) => {
        const prod = products.find(p => p.name === item.name);
        return `
        <div class="prep-item-row" style="flex-direction:column;align-items:flex-start;gap:7px">
          <div style="font-weight:700;color:var(--deep)">${item.name}</div>
          <div style="display:flex;align-items:center;gap:9px;width:100%">
            <span style="font-size:.75rem;color:rgba(9,50,87,.45)">الكمية الأصلية: ${item.qty}</span>
            <input type="number" class="fi prep-edit-qty" data-name="${esc(item.name)}" data-price="${prod?.price || item.price || 0}"
              style="width:90px;padding:6px 9px;font-size:.85rem" value="${item.qty}" min="0" oninput="recalcPrepEditTotal()">
          </div>
        </div>`;
      }).join('');
    } else {
      itemsHtml = `<div style="padding:10px;text-align:center;color:rgba(9,50,87,.4)">${rawOrd.products || '—'}</div>`;
    }
    document.getElementById('prepEditItemsList').innerHTML = itemsHtml;
    recalcPrepEditTotal();
    openModal('prepEditModal');
  });
}

function recalcPrepEditTotal() {
  let total = 0;
  document.querySelectorAll('.prep-edit-qty').forEach(input => {
    const qty   = parseInt(input.value) || 0;
    const price = parseFloat(input.dataset.price) || 0;
    total += qty * price;
  });
  const el = document.getElementById('prepEditTotal');
  if (el) el.textContent = total.toLocaleString();
}

async function savePrepEditQuantities() {
  const orderId = document.getElementById('prepEditOrderId').value;
  if (!orderId) return;

  const updatedItems = [];
  document.querySelectorAll('.prep-edit-qty').forEach(input => {
    updatedItems.push({ name: input.dataset.name, qty: parseInt(input.value) || 0, price: parseFloat(input.dataset.price) || 0 });
  });

  let newTotal = updatedItems.reduce((s, i) => s + i.qty * i.price, 0);
  const newProducts = updatedItems.map(i => `${i.name}(${i.qty})`).join('، ');
  const commPct = orders.find(o => o._id === orderId)?.commPct || 0;
  const commission = Math.round(newTotal * commPct / 100);

  await fbUpdate('orders', orderId, {
    products: newProducts,
    cartItemsArray: updatedItems,
    total: newTotal,
    commission,
    net: newTotal - commission,
    qty_edited_by: CU?.username,
    qty_edited_at: new Date().toISOString()
  }).catch(() => {});

  closeModal('prepEditModal');
  toast('تم تحديث الكميات والإجمالي');
  renderPrepDashboard();
}

// ══════════════════════════════════════════════════════
// FEATURE 4: DRIVER DASHBOARD
// ══════════════════════════════════════════════════════
async function renderDriverDashboard() {
  const listEl = document.getElementById('driverOrdersList');
  const kpiEl  = document.getElementById('driverKpi');
  if (!listEl || !kpiEl) return;

  let preparedOrders = [], inDeliveryOrders = [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), 'orders'));
    snap.docs.forEach(d => {
      const data = d.data();
      const st = data.status || '';
      if (st === 'Prepared') preparedOrders.push({ _id: d.id, ...data });
      else if ((st === 'In Delivery' || st === 'NearCustomer') && data.driver_id === CU.username) inDeliveryOrders.push({ _id: d.id, ...data });
    });
  } catch(e) {
    preparedOrders = orders.filter(o => o.status === 'Prepared');
    inDeliveryOrders = orders.filter(o => (o.status === 'In Delivery' || o.status === 'NearCustomer') && o.driver_id === CU.username);
  }

  const myDelivered = orders.filter(o => o.status === 'Delivered' && o.driver_id === CU.username);
  const avgRating = myDelivered.filter(o => o.driver_rating).reduce((s, o, _, a) => s + o.driver_rating / a.length, 0);

  kpiEl.innerHTML = `
    <div class="kpi-card kpi-sky"><div class="kpi-icon">مخزون</div><div class="kpi-val">${preparedOrders.length}</div><div class="kpi-lbl">جاهزة للتحميل</div></div>
    <div class="kpi-card kpi-teal"><div class="kpi-icon">🚗</div><div class="kpi-val">${inDeliveryOrders.length}</div><div class="kpi-lbl">قيد التوصيل</div></div>
    <div class="kpi-card kpi-mint"><div class="kpi-icon">✅</div><div class="kpi-val">${myDelivered.length}</div><div class="kpi-lbl">تم تسليمها</div></div>
    <div class="kpi-card kpi-gold"><div class="kpi-icon">⭐</div><div class="kpi-val">${avgRating ? avgRating.toFixed(1) : '—'}</div><div class="kpi-lbl">متوسط التقييم</div></div>`;

  const allDriverOrders = [...preparedOrders, ...inDeliveryOrders];

  if (!allDriverOrders.length && !myDelivered.length) {
    listEl.innerHTML = '<div style="text-align:center;padding:55px;color:rgba(9,50,87,.35)"><div style="font-size:2.5rem;margin-bottom:10px">✅</div><p>لا توجد طلبات حالياً</p></div>';
    return;
  }

  const activeHtml = allDriverOrders.map(o => {
    const isPrepared    = o.status === 'Prepared';
    const isInDelivery  = o.status === 'In Delivery';
    const isNear        = o.status === 'NearCustomer';
    const isOnRoad      = isInDelivery || isNear;
    const statusBadge   = isPrepared ? '<span class="badge b-green">✅ جاهز للتحميل</span>'
                        : isNear     ? '<span class="badge b-mint" style="animation:pulse 1.5s infinite">📍 قريب من الزبون</span>'
                        :              '<span class="badge b-sky">🚗 قيد التوصيل</span>';
    return `
    <div class="prep-order-card">
      <div class="prep-order-hd">
        <div>
          <div class="prep-order-shop">🏪 ${o.shopName || '—'}</div>
          <div class="prep-order-id">${o.orderId || o._id}</div>
        </div>
        <div>${statusBadge}</div>
      </div>
      <div class="prep-order-meta">
        <span class="badge b-sky">💰 ${(parseFloat(o.total)||0).toLocaleString()} د.ع</span>
        <span class="badge b-teal">📍 ${o.shopAddress || o.shopAddr || '—'}</span>
        ${o.vehicle_type ? `<span class="badge b-violet">🚚 ${o.vehicle_type}</span>` : ''}
      </div>
      <div style="font-size:.8rem;color:rgba(9,50,87,.5);margin-bottom:10px">${o.products || '—'}</div>
      ${o.location ? `<a href="${o.location}" target="_blank" class="btn btn-ghost btn-sm" style="margin-bottom:8px;display:inline-flex">عرض الموقع</a>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${isPrepared ? `<button class="btn btn-sky btn-full" onclick="markAsLoaded('${o._id}')">تم التحميل</button>` : ''}
        ${isInDelivery ? `<button class="btn btn-gold btn-sm" onclick="markAsNearCustomer('${o._id}')">أنا قريب</button>` : ''}
        ${isOnRoad ? `<button class="btn btn-mint btn-full" onclick="openDeliveryProof('${o._id}','${o.driver_id || ''}')">تأكيد التسليم</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const deliveredHtml = myDelivered.length ? `
    <div style="margin-top:${allDriverOrders.length ? '20' : '0'}px;padding-top:${allDriverOrders.length ? '16' : '0'}px;${allDriverOrders.length ? 'border-top:1px solid rgba(0,0,0,.08);' : ''}margin-bottom:10px;font-weight:800;color:var(--deep);font-size:.9rem">
      📋 سجل التوصيلات (${myDelivered.length})
    </div>
    ${myDelivered.map(o => {
      const confirmed = !!o.customer_confirmed;
      return `
      <div class="prep-order-card" style="border:1.5px solid ${confirmed ? 'rgba(13,148,136,.35)' : 'rgba(245,158,11,.3)'};pointer-events:none;user-select:none">
        <div class="prep-order-hd">
          <div>
            <div class="prep-order-shop">🏪 ${o.shopName || '—'}</div>
            <div class="prep-order-id">${o.orderId || o._id}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge b-teal">📦 مُسلَّم</span>
            ${confirmed
              ? '<span class="badge b-mint">✅ أكد الزبون الاستلام</span>'
              : '<span class="badge b-gold">⏳ انتظار تأكيد الزبون</span>'}
          </div>
        </div>
        <div class="prep-order-meta">
          <span class="badge b-sky">💰 ${(parseFloat(o.total)||0).toLocaleString()} د.ع</span>
          ${o.driver_rating ? `<span class="badge b-gold">⭐ ${o.driver_rating}/5</span>` : ''}
          ${o.delivered_at ? `<span class="badge b-teal">🕐 ${new Date(o.delivered_at).toLocaleDateString('ar-IQ')}</span>` : ''}
        </div>
        <div style="font-size:.8rem;color:rgba(9,50,87,.5);margin-bottom:6px">${o.products || '—'}</div>
        ${confirmed && o.customer_notes ? `<div style="font-size:.75rem;color:rgba(9,50,87,.55);padding:6px 8px;background:rgba(13,148,136,.08);border-radius:8px;margin-bottom:6px">💬 ملاحظة الزبون: ${o.customer_notes}</div>` : ''}
        ${o.proof_url ? `<a href="${o.proof_url}" target="_blank" class="btn btn-ghost btn-sm" style="display:inline-flex;pointer-events:auto">إثبات التسليم</a>` : ''}
      </div>`;
    }).join('')}
  ` : '';

  listEl.innerHTML = activeHtml + deliveredHtml;
}

async function markAsLoaded(orderId) {
  if (!CU) return;
  const now = new Date().toISOString();
  await fbUpdate('orders', orderId, {
    status: 'In Delivery',
    driver_id: CU.username,
    driver_name: CU.name,
    loaded_at: now
  }).catch(() => {});
  toast('تم تحديد الطلب كـ "قيد التوصيل"');
  renderDriverDashboard();

  // Notify customer (via notification)
  const ord = orders.find(o => o._id === orderId);
  if (ord) {
    const custUser = users.find(u => u.name === ord.shopName || u.shop === ord.shopName);
    const targetUser = custUser?.username || ord.repUsername || ord.visitorPhone || 'customer';
    await fbAdd('notifications', {
      title: '🚗 طلبك في الطريق إليك!',
      body: `طلبك من ${ord.shopName || ''} أصبح في الطريق — السائق: ${CU.name}`,
      type: 'order', read: false,
      targetUser,
      orderId,
      date: new Date().toLocaleDateString('ar-IQ')
    }).catch(() => {});
    browserNotif('🚗 طلبك في الطريق', `طلبك من ${ord.shopName || ''} أصبح في الطريق`);
  }
}

async function markAsNearCustomer(orderId) {
  if (!CU) return;
  await fbUpdate('orders', orderId, { status: 'NearCustomer', near_at: new Date().toISOString() }).catch(() => {});
  toast('📍 تم إشعار الزبون بأنك قريب');
  renderDriverDashboard();

  const ord = orders.find(o => o._id === orderId);
  if (ord) {
    const custUser = users.find(u => u.name === ord.shopName || u.shop === ord.shopName);
    const targetUser = custUser?.username || ord.repUsername || ord.visitorPhone || 'customer';
    await fbAdd('notifications', {
      title: '🚚 السائق قريب منك!',
      body: `طلبك من ${ord.shopName || ''} سيصل خلال دقائق — ${CU.name} في طريقه إليك`,
      type: 'order', read: false,
      targetUser,
      orderId,
      date: new Date().toLocaleDateString('ar-IQ')
    }).catch(() => {});
  }
}

// ══════════════════════════════════════════════════════
// Driver Proof (Photo/Signature)
// ══════════════════════════════════════════════════════
let _proofPhotoDataUrl = null, _sigDrawing = false, _sigCtx = null;
let _currentProofTab = 'photo';

function openDeliveryProof(orderId, driverId) {
  document.getElementById('proofOrderId').value = orderId;
  const driverIdEl = document.getElementById('proofDriverId');
  if (driverIdEl) driverIdEl.value = driverId || CU?.username || '';
  _proofPhotoDataUrl = null;
  // Reset photo preview
  const preview = document.getElementById('proofPhotoPreview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const photoInput = document.getElementById('proofPhotoInput');
  if (photoInput) photoInput.value = '';
  // Reset signature canvas context so it re-initializes each open
  _sigCtx = null;
  switchProofTab('photo');
  openModal('driverProofModal');
  setTimeout(initSigCanvas, 200);
}

function switchProofTab(tab) {
  _currentProofTab = tab;
  document.getElementById('proofPhotoPane').style.display = tab === 'photo' ? 'block' : 'none';
  document.getElementById('proofSigPane').style.display   = tab === 'sig' ? 'block' : 'none';
  document.getElementById('proofTabPhoto').classList.toggle('active', tab === 'photo');
  document.getElementById('proofTabSig').classList.toggle('active', tab === 'sig');
}

function handleProofPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    _proofPhotoDataUrl = ev.target.result;
    const preview = document.getElementById('proofPhotoPreview');
    preview.src = _proofPhotoDataUrl;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function initSigCanvas() {
  const canvas = document.getElementById('sigCanvas');
  if (!canvas || _sigCtx) return;
  _sigCtx = canvas.getContext('2d');
  _sigCtx.strokeStyle = '#093257';
  _sigCtx.lineWidth = 2.5;
  _sigCtx.lineCap = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  const start = e => { _sigDrawing = true; _sigCtx.beginPath(); const p = getPos(e); _sigCtx.moveTo(p.x, p.y); e.preventDefault(); };
  const draw  = e => { if (!_sigDrawing) return; const p = getPos(e); _sigCtx.lineTo(p.x, p.y); _sigCtx.stroke(); e.preventDefault(); };
  const end   = () => { _sigDrawing = false; };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', end);
}

function clearSignature() {
  const canvas = document.getElementById('sigCanvas');
  if (!canvas || !_sigCtx) return;
  _sigCtx.clearRect(0, 0, canvas.width, canvas.height);
}

async function confirmDeliveryWithProof() {
  const orderId  = document.getElementById('proofOrderId').value;
  const statusEl = document.getElementById('proofUploadStatus');

  let proofDataUrl = null;

  if (_currentProofTab === 'photo') {
    if (!_proofPhotoDataUrl) { toast('⚠️ يرجى التقاط صورة أولاً', false); return; }
    proofDataUrl = _proofPhotoDataUrl;
  } else {
    const canvas = document.getElementById('sigCanvas');
    if (!canvas) { toast('خطأ في التوقيع', false); return; }
    const blank = document.createElement('canvas');
    blank.width = canvas.width; blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) { toast('⚠️ يرجى رسم توقيعك أولاً', false); return; }
    proofDataUrl = canvas.toDataURL('image/png');
  }

  statusEl.style.display = 'block';
  statusEl.textContent = '⏳ جاري الرفع...';

  let proofUrl = '';
  try {
    // Upload to ImgBB
    const base64 = proofDataUrl.split(',')[1];
    const fd = new FormData();
    fd.append('image', base64);
    fd.append('key', IMGBB_API_KEY);
    const resp = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) proofUrl = data.data.url;
  } catch(e) {
    proofUrl = proofDataUrl; // Fallback: store base64 locally
  }

  const now = new Date().toISOString();
  await fbUpdate('orders', orderId, {
    status: 'Delivered',
    delivered_at: now,
    proof_url: proofUrl,
    driver_id: CU?.username,
    driver_name: CU?.name
  }).catch(() => {});

  statusEl.textContent = 'تم التسليم!';
  setTimeout(() => { closeModal('driverProofModal'); statusEl.style.display = 'none'; }, 800);

  toast('تم تأكيد التسليم');
  renderDriverDashboard();

  // Notify customer
  await fbAdd('notifications', {
    title: 'تم توصيل طلبك!',
    body: `تم توصيل طلبك بنجاح — برجمان`,
    type: 'order', read: false, targetUser: 'customer',
    date: new Date().toLocaleDateString('ar-IQ')
  }).catch(() => {});
  browserNotif('تم توصيل طلبك!', 'طلبك تم توصيله بنجاح');
}

// ══════════════════════════════════════════════════════
// FEATURE 5: Customer Tracking & Rating
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// VISUAL TRUCK LOADER
// ══════════════════════════════════════════════════════

// Vehicle capacities in m³
const VEHICLE_CAPS = {
  'ستوتة':     { m3: 0.4,  label: 'ستوتة 🛵',   color: '#f59e0b' },
  'حمل صغيرة': { m3: 6,    label: 'حمل صغيرة 🚐', color: '#0ea5e9' },
  'شاحنة':     { m3: 30,   label: 'شاحنة 🚛',    color: '#8b5cf6' }
};

/**
 * Build the SVG rear-view truck with dynamic cargo fill.
 * truckType: 'ستوتة' | 'حمل صغيرة' | 'شاحنة'
 * fillPct: 0-100
 */
function buildTruckSVG(truckType, fillPct) {
  const clamped = Math.max(0, Math.min(100, fillPct));

  // Choose SVG path based on type
  if (truckType === 'ستوتة') {
    return buildScooterSVG(clamped);
  } else if (truckType === 'حمل صغيرة') {
    return buildPickupSVG(clamped);
  } else {
    return buildBigTruckSVG(clamped);
  }
}

function _cargoGradientDefs(id, pct) {
  // Green at bottom → lighter green, cut at fill height
  const g = pct > 70 ? '#0d9488' : pct > 35 ? '#0d9488' : '#f59e0b';
  return `<defs>
    <linearGradient id="cargoGrad${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${g}" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="${g}" stop-opacity="0.55"/>
    </linearGradient>
    <linearGradient id="bodyGrad${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="emptyGrad${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(148,163,184,0.18)"/>
      <stop offset="100%" stop-color="rgba(148,163,184,0.06)"/>
    </linearGradient>
  </defs>`;
}

function buildScooterSVG(pct) {
  // Scooter cargo box: 120×90 viewBox
  const boxH = 52, boxY = 18, boxX = 20, boxW = 80;
  const fillH = Math.round((pct / 100) * boxH);
  const fillY = boxY + boxH - fillH;
  return `<svg viewBox="0 0 120 110" width="120" height="110" xmlns="http://www.w3.org/2000/svg">
    ${_cargoGradientDefs('sc', pct)}
    <!-- body -->
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="6" fill="url(#bodyGrad_sc)" stroke="#64748b" stroke-width="2"/>
    <!-- empty space -->
    <rect x="${boxX+2}" y="${boxY+2}" width="${boxW-4}" height="${boxH-4}" rx="4" fill="url(#emptyGrad_sc)"/>
    <!-- cargo fill -->
    <rect class="vtl-cargo-bar" x="${boxX+2}" y="${fillY}" width="${boxW-4}" height="${fillH}" rx="3" fill="url(#cargoGradsc)" opacity="0.95"/>
    <!-- door line -->
    <line x1="${boxX + boxW/2}" y1="${boxY+2}" x2="${boxX + boxW/2}" y2="${boxY + boxH - 2}" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>
    <!-- hinge bolts -->
    <circle cx="${boxX + boxW/2}" cy="${boxY + 12}" r="2.5" fill="#64748b"/>
    <circle cx="${boxX + boxW/2}" cy="${boxY + boxH - 12}" r="2.5" fill="#64748b"/>
    <!-- wheels -->
    <circle cx="28" cy="88" r="13" fill="#334155" stroke="#1e293b" stroke-width="2"/>
    <circle cx="28" cy="88" r="6" fill="#64748b"/>
    <circle cx="92" cy="88" r="13" fill="#334155" stroke="#1e293b" stroke-width="2"/>
    <circle cx="92" cy="88" r="6" fill="#64748b"/>
    <!-- chassis bar -->
    <rect x="15" y="75" width="90" height="6" rx="3" fill="#475569"/>
    <!-- pct label inside box -->
    <text x="60" y="${boxY + boxH/2 + 5}" text-anchor="middle" fill="white" font-size="12" font-weight="800" opacity="0.9">${Math.round(pct)}%</text>
  </svg>`;
}

function buildPickupSVG(pct) {
  // Small truck rear: 140×120 viewBox
  const boxH = 64, boxY = 20, boxX = 14, boxW = 112;
  const fillH = Math.round((pct / 100) * boxH);
  const fillY = boxY + boxH - fillH;
  return `<svg viewBox="0 0 140 130" width="140" height="130" xmlns="http://www.w3.org/2000/svg">
    ${_cargoGradientDefs('pk', pct)}
    <!-- outer body -->
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="7" fill="url(#bodyGradpk)" stroke="#475569" stroke-width="2.5"/>
    <!-- inner void -->
    <rect x="${boxX+3}" y="${boxY+3}" width="${boxW-6}" height="${boxH-6}" rx="5" fill="url(#emptyGradpk)"/>
    <!-- cargo fill -->
    <rect class="vtl-cargo-bar" x="${boxX+3}" y="${fillY}" width="${boxW-6}" height="${fillH}" rx="4" fill="url(#cargoGradpk)" opacity="0.95"/>
    <!-- rear door divider -->
    <line x1="${boxX + boxW/2}" y1="${boxY+4}" x2="${boxX + boxW/2}" y2="${boxY + boxH - 4}" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
    <!-- lock bar -->
    <rect x="${boxX + boxW/2 - 10}" y="${boxY + boxH/2 - 3}" width="20" height="6" rx="3" fill="rgba(255,255,255,0.7)"/>
    <!-- side lights -->
    <rect x="${boxX + 5}" y="${boxY - 7}" width="18" height="8" rx="3" fill="#fef08a" opacity="0.8"/>
    <rect x="${boxX + boxW - 23}" y="${boxY - 7}" width="18" height="8" rx="3" fill="#fca5a5" opacity="0.8"/>
    <!-- wheels -->
    <circle cx="30" cy="106" r="16" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <circle cx="30" cy="106" r="8" fill="#475569"/>
    <circle cx="110" cy="106" r="16" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <circle cx="110" cy="106" r="8" fill="#475569"/>
    <!-- bumper -->
    <rect x="10" y="90" width="120" height="9" rx="4" fill="#334155"/>
    <!-- pct -->
    <text x="70" y="${boxY + boxH/2 + 6}" text-anchor="middle" fill="white" font-size="14" font-weight="900" opacity="0.9">${Math.round(pct)}%</text>
  </svg>`;
}

function buildBigTruckSVG(pct) {
  // Big truck rear: 180×155 viewBox
  const boxH = 90, boxY = 16, boxX = 10, boxW = 160;
  const fillH = Math.round((pct / 100) * boxH);
  const fillY = boxY + boxH - fillH;
  return `<svg viewBox="0 0 180 160" width="180" height="160" xmlns="http://www.w3.org/2000/svg">
    ${_cargoGradientDefs('bt', pct)}
    <!-- outer body -->
    <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="8" fill="url(#bodyGradbt)" stroke="#475569" stroke-width="3"/>
    <!-- roof ridge -->
    <rect x="${boxX+8}" y="${boxY-4}" width="${boxW-16}" height="8" rx="4" fill="#64748b"/>
    <!-- inner void -->
    <rect x="${boxX+4}" y="${boxY+4}" width="${boxW-8}" height="${boxH-8}" rx="6" fill="url(#emptyGradbt)"/>
    <!-- cargo fill -->
    <rect class="vtl-cargo-bar" x="${boxX+4}" y="${fillY}" width="${boxW-8}" height="${fillH}" rx="5" fill="url(#cargoGradbt)" opacity="0.95"/>
    <!-- door divider -->
    <line x1="${boxX + boxW/2}" y1="${boxY+5}" x2="${boxX + boxW/2}" y2="${boxY + boxH - 5}" stroke="rgba(255,255,255,.55)" stroke-width="2.5"/>
    <!-- door hinges -->
    <rect x="${boxX + boxW/2 - 12}" y="${boxY + 20}" width="24" height="7" rx="3.5" fill="rgba(255,255,255,0.65)"/>
    <rect x="${boxX + boxW/2 - 12}" y="${boxY + boxH - 28}" width="24" height="7" rx="3.5" fill="rgba(255,255,255,0.65)"/>
    <!-- tail lights -->
    <rect x="${boxX+6}" y="${boxY + boxH - 16}" width="22" height="12" rx="4" fill="#fca5a5" opacity="0.9"/>
    <rect x="${boxX + boxW - 28}" y="${boxY + boxH - 16}" width="22" height="12" rx="4" fill="#fca5a5" opacity="0.9"/>
    <!-- top lights -->
    <rect x="${boxX+6}" y="${boxY - 2}" width="14" height="6" rx="3" fill="#fef08a" opacity="0.8"/>
    <rect x="${boxX + boxW - 20}" y="${boxY - 2}" width="14" height="6" rx="3" fill="#fef08a" opacity="0.8"/>
    <!-- dual rear wheels -->
    <circle cx="34" cy="132" r="19" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <circle cx="34" cy="132" r="10" fill="#334155"/>
    <circle cx="58" cy="132" r="14" fill="#263548" stroke="#0f172a" stroke-width="1.5"/>
    <circle cx="122" cy="132" r="14" fill="#263548" stroke="#0f172a" stroke-width="1.5"/>
    <circle cx="146" cy="132" r="19" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
    <circle cx="146" cy="132" r="10" fill="#334155"/>
    <!-- underframe -->
    <rect x="8" y="115" width="164" height="10" rx="5" fill="#334155"/>
    <!-- pct text -->
    <text x="90" y="${boxY + boxH/2 + 7}" text-anchor="middle" fill="white" font-size="17" font-weight="900" opacity="0.9">${Math.round(pct)}%</text>
  </svg>`;
}

function renderTruckLoader(order) {
  // Calculate total volume of this order
  let totalVol = 0;
  const items = order.items || [];
  items.forEach(item => {
    totalVol += (parseFloat(item.carton_volume) || 0) * (parseInt(item.qty) || 1);
  });

  const vehicleType = order.vehicle_type || null;
  const cap = vehicleType ? VEHICLE_CAPS[vehicleType] : null;

  // If no vehicle assigned yet
  if (!cap) {
    return `
    <div class="vtl-wrap">
      <div class="vtl-title">🚚 حجم الشحنة</div>
      <div style="font-size:.78rem;color:rgba(9,50,87,.4);padding:10px 0;text-align:center">
        في انتظار اختيار المجهز للمركبة…
      </div>
    </div>`;
  }

  const fillPct = cap.m3 > 0 ? Math.min(100, (totalVol / cap.m3) * 100) : 0;
  const fillDeg = Math.round((fillPct / 100) * 360);
  const ringColor = fillPct > 70 ? '#0d9488' : fillPct > 35 ? '#0d9488' : '#f59e0b';
  const statusMsg = fillPct >= 95 ? 'ممتلئة تقريباً' : fillPct >= 60 ? 'أكثر من النصف' : fillPct >= 30 ? 'ربع إلى نصف' : 'خفيفة';

  return `
  <div class="vtl-wrap" id="vtl_${order._id || order.id || ''}">
    <div class="vtl-title">🚚 حجم شحنتك في المركبة</div>
    <div class="vtl-scene">
      <div class="vtl-svg-wrap">
        ${buildTruckSVG(vehicleType, fillPct)}
        <div class="vtl-vehicle-name">${cap.label}</div>
        <div class="vtl-capacity-label">السعة الكلية: ${cap.m3} م³</div>
      </div>
      <div class="vtl-info">
        <div class="vtl-pct-ring" style="--fill-color:${ringColor};--fill-deg:${fillDeg}deg">
          <span class="vtl-pct-txt">${Math.round(fillPct)}%</span>
        </div>
        <div class="vtl-stat-row">
          <span class="vtl-stat-label">حجم طلبك</span>
          <span class="vtl-stat-val">${totalVol.toFixed(3)} م³</span>
        </div>
        <div class="vtl-stat-row">
          <span class="vtl-stat-label">الحالة</span>
          <span class="vtl-stat-val" style="color:${ringColor}">${statusMsg}</span>
        </div>
      </div>
    </div>
  </div>`;
}

// Order status tracker shown in order detail
function renderOrderStatusTracker(order) {
  const statusMap = { pending_approval: -1, Pending: 0, pending: 0, Confirmed: 1, confirmed: 1, Prepared: 2, 'In Delivery': 3, NearCustomer: 3, Delivered: 4 };
  const stages = [
    { icon: '✅', label: 'مؤكد' },
    { icon: '📦', label: 'مجهز' },
    { icon: '🚗', label: 'في الطريق' },
    { icon: '🏠', label: 'تم التسليم' }
  ];
  const step = statusMap[order.status || 'Pending'] || 0;
  const pct = Math.min(100, (step / 3) * 100);
  const isNear = order.status === 'NearCustomer';

  // Truck icon changes based on vehicle type
  const vehicleIcon = order.vehicle_type === 'ستوتة' ? '🛵'
                    : order.vehicle_type === 'شاحنة'  ? '🚛' : '🚐';

  return `
  <div class="order-tracker">
    <div style="font-size:.78rem;font-weight:700;color:rgba(9,50,87,.5);margin-bottom:11px">📍 حالة طلبك</div>
    ${isNear ? `<div style="background:linear-gradient(135deg,var(--teal),var(--teal2));color:white;border-radius:14px;padding:12px 16px;margin-bottom:12px;text-align:center;font-weight:700;font-size:.88rem;animation:pulse 1.5s infinite">🚚 السائق قريب منك! سيصل طلبك خلال دقائق</div>` : ''}
    <div style="position:relative;padding:0 0 20px">
      <div class="tracker-line"></div>
      <div class="tracker-progress" style="width:${pct}%"></div>
      <span class="tracker-car" style="right:${pct}%">${vehicleIcon}</span>
      <div class="tracker-stages">
        ${stages.map((s, i) => `
          <div class="tracker-stage">
            <div class="tracker-dot ${i < step ? 'done' : i === step ? 'active' : ''}">${s.icon}</div>
            <div class="tracker-label ${i < step ? 'done' : i === step ? 'active' : ''}">${s.label}</div>
          </div>`).join('')}
      </div>
    </div>
    ${renderTruckLoader(order)}
    ${order.status === 'Delivered' ? renderReceiptConfirmUI(order) : ''}
  </div>`;
}

function renderReceiptConfirmUI(order) {
  if (order.customer_confirmed) return `<div style="text-align:center;color:var(--teal2);font-weight:700;font-size:.85rem;margin-top:8px">تم تأكيد الاستلام</div>`;
  return `
  <div style="text-align:center;margin-top:12px">
    <button class="btn btn-mint" onclick="openReceiptConfirm('${order._id}', '${order.driver_id || ''}')">
      ✅ تأكيد الاستلام وتقييم السائق
    </button>
  </div>`;
}

function openReceiptConfirm(orderId, driverId) {
  document.getElementById('receiptOrderId').value = orderId;
  document.getElementById('receiptDriverId').value = driverId;
  _selectedDriverRating = 0;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('customerNotesInput').value = '';
  openModal('receiptConfirmModal');
}

let _selectedDriverRating = 0;
function setDriverRating(val) {
  _selectedDriverRating = val;
  document.querySelectorAll('#driverStarRating .star-btn').forEach((b, i) => {
    b.classList.toggle('active', i < val);
    b.textContent = i < val ? '⭐' : '☆';
  });
}

async function submitReceipt() {
  const orderId  = document.getElementById('receiptOrderId').value;
  const driverId = document.getElementById('receiptDriverId').value;
  const notes    = document.getElementById('customerNotesInput').value.trim();
  const rating   = _selectedDriverRating;

  await fbUpdate('orders', orderId, {
    customer_confirmed: true,
    customer_notes: notes,
    driver_rating: rating,
    confirmed_at: new Date().toISOString()
  }).catch(() => {});

  // Aggregate rating to driver user doc
  if (driverId && rating > 0) {
    const driverUser = users.find(u => u.username === driverId);
    if (driverUser) {
      const prevCount = parseInt(driverUser.rating_count) || 0;
      const prevAvg   = parseFloat(driverUser.avg_rating) || 0;
      const newCount  = prevCount + 1;
      const newAvg    = ((prevAvg * prevCount) + rating) / newCount;
      if (driverUser._id) {
        await fbUpdate('users', driverUser._id, { avg_rating: newAvg, rating_count: newCount }).catch(() => {});
        driverUser.avg_rating = newAvg;
        driverUser.rating_count = newCount;
      }
    }
  }

  closeModal('receiptConfirmModal');
  toast('⭐ شكراً على تقييمك!');
}

// Patch showOrdDetail to include tracker
// Keep real-time unsubscribe handle for order detail
let _ordDetailUnsub = null;

const _origShowOrdDetail = showOrdDetail;
showOrdDetail = function(id) {
  // Cancel previous real-time listener
  if (_ordDetailUnsub) { try { _ordDetailUnsub(); } catch(e){} _ordDetailUnsub = null; }

  _origShowOrdDetail(id);
  const o = orders.find(x => (x._id || x.id) === id);
  if (!o || !o.status) return;

  const detailContent = document.getElementById('ordDetailContent');
  if (detailContent) {
    const trackerHtml = renderOrderStatusTracker(o);
    detailContent.insertAdjacentHTML('afterbegin', trackerHtml);
  }

  // Real-time listener: re-render truck loader when vehicle_type or items change
  try {
    const { onSnapshot, doc: fbDoc } = window._fb || {};
    const _db = window._db;
    if (onSnapshot && fbDoc && _db) {
      _ordDetailUnsub = onSnapshot(fbDoc(_db, 'orders', id), (snap) => {
        if (!snap.exists()) return;
        const live = { _id: snap.id, ...snap.data() };
        // Merge into local orders cache
        const idx = orders.findIndex(x => (x._id || x.id) === id);
        if (idx !== -1) orders[idx] = { ...orders[idx], ...live };

        // Update truck loader block in-place
        const vtlEl = document.getElementById(`vtl_${id}`);
        if (vtlEl) {
          const newVtl = document.createElement('div');
          newVtl.innerHTML = renderTruckLoader(live);
          const newChild = newVtl.firstElementChild;
          if (newChild) vtlEl.replaceWith(newChild);
        }

        // Update tracker-car icon if vehicle changed
        const carEl = document.querySelector('.tracker-car');
        if (carEl && live.vehicle_type) {
          carEl.textContent = live.vehicle_type === 'ستوتة' ? '🛵'
                            : live.vehicle_type === 'شاحنة'  ? '🚛' : '🚐';
        }
      });
    }
  } catch(e) { console.warn('VTL realtime:', e); }
};

// ══════════════════════════════════════════════════════
// FEATURE 6: Performance Reports
// ══════════════════════════════════════════════════════
async function renderPerfReports() {
  await renderDriverPerfTable();
  await renderPrepPerfTable();
}

async function renderDriverPerfTable() {
  const bodyEl = document.getElementById('driverPerfBody');
  if (!bodyEl) return;

  let allOrders = [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), 'orders'));
    allOrders = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) { allOrders = orders; }

  const deliveredOrds = allOrders.filter(o => o.status === 'Delivered' && o.driver_id);
  const driverMap = {};

  deliveredOrds.forEach(o => {
    const did = o.driver_id;
    if (!driverMap[did]) {
      const u = users.find(x => x.username === did);
      driverMap[did] = { name: u?.name || did, count: 0, ratingSum: 0, ratingCount: 0, totalMinutes: 0 };
    }
    driverMap[did].count++;
    if (o.driver_rating) { driverMap[did].ratingSum += o.driver_rating; driverMap[did].ratingCount++; }
    if (o.loaded_at && o.delivered_at) {
      const diff = (new Date(o.delivered_at) - new Date(o.loaded_at)) / 60000;
      if (diff > 0 && diff < 1440) driverMap[did].totalMinutes += diff;
    }
  });

  bodyEl.innerHTML = Object.values(driverMap).sort((a, b) => b.count - a.count).map(d => {
    const avgRating = d.ratingCount ? (d.ratingSum / d.ratingCount).toFixed(1) : '—';
    const avgTime   = d.count ? Math.round(d.totalMinutes / d.count) : 0;
    const stars = d.ratingCount ? '⭐'.repeat(Math.round(parseFloat(avgRating))) : '—';
    return `<tr>
      <td style="font-weight:700">${d.name}</td>
      <td>${d.count}</td>
      <td>${stars} ${avgRating !== '—' ? `(${avgRating})` : ''}</td>
      <td>${avgTime ? avgTime + ' دقيقة' : '—'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" style="text-align:center;padding:22px">لا توجد بيانات</td></tr>';
}

async function renderPrepPerfTable() {
  const bodyEl = document.getElementById('prepPerfBody');
  if (!bodyEl) return;

  let allOrders = [];
  try {
    const snap = await fb().getDocs(fb().collection(db(), 'orders'));
    allOrders = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) { allOrders = orders; }

  const preparedOrds = allOrders.filter(o => o.prepared_by);
  const prepMap = {};

  preparedOrds.forEach(o => {
    const pid = o.prepared_by;
    if (!prepMap[pid]) {
      const u = users.find(x => x.username === pid);
      prepMap[pid] = { name: u?.name || pid, count: 0, totalMinutes: 0, editCount: 0 };
    }
    prepMap[pid].count++;
    if (o.qty_edited_by === pid) prepMap[pid].editCount++;
    if (o.createdAt && o.prepared_at) {
      const diff = (new Date(o.prepared_at) - new Date(o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt)) / 60000;
      if (diff > 0 && diff < 1440) prepMap[pid].totalMinutes += diff;
    }
  });

  bodyEl.innerHTML = Object.values(prepMap).sort((a, b) => b.count - a.count).map(p => {
    const avgTime = p.count ? Math.round(p.totalMinutes / p.count) : 0;
    const accuracy = p.count ? (((p.count - p.editCount) / p.count) * 100).toFixed(0) + '%' : '—';
    return `<tr>
      <td style="font-weight:700">${p.name}</td>
      <td>${p.count}</td>
      <td>${avgTime ? avgTime + ' دقيقة' : '—'}</td>
      <td>${accuracy}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="4" style="text-align:center;padding:22px">لا توجد بيانات</td></tr>';
}

// ══════════════════════════════════════════════════════
// FEATURE 7: Real-time updates + notifications
// ══════════════════════════════════════════════════════

// Extend startRealtimeListeners to handle order status changes
const _origStartRealtime = startRealtimeListeners;
startRealtimeListeners = function() {
  _origStartRealtime();
  startNewRoleListeners();

  // Listen for order status changes to notify customers
  fb().onSnapshot(fb().collection(db(), 'orders'), snap => {
    snap.docChanges().forEach(change => {
      if (change.type !== 'modified') return;
      const o = change.doc.data();
      const st = o.status || '';
      const isMyOrder = CU && (CU.username === o.repUsername || CU.name === o.shopName);
      const isGuestOrder = (() => {
        try { const g = JSON.parse(localStorage.getItem('bj_guest_order') || '{}'); return g.fbId === change.doc.id; } catch(e) { return false; }
      })();

      if (st === 'Prepared' && (isMyOrder || isGuestOrder)) {
        browserNotif('🚛 تم تجهيز طلبك!', 'طلبك جاهز وخارج من المخزن');
      } else if (st === 'In Delivery' && (isMyOrder || isGuestOrder)) {
        browserNotif('🚗 طلبك في الطريق إليك!', `طلبك من ${o.shopName || ''} خرج للتوصيل`);
      } else if (st === 'NearCustomer' && (isMyOrder || isGuestOrder)) {
        browserNotif('🚚 السائق قريب منك!', `طلبك سيصل خلال دقائق`);
        // If tracking modal is open, it auto-updates via its own listener
        // Show flash even if modal is closed
        const ex = document.getElementById('nearCustFlash');
        if (!ex) {
          const div = document.createElement('div');
          div.id = 'nearCustFlash';
          div.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,var(--teal),var(--teal2));color:white;padding:14px 28px;border-radius:20px;box-shadow:0 8px 32px rgba(13,148,136,.4);font-weight:700;font-size:.95rem;text-align:center;cursor:pointer';
          div.innerHTML = '🚚 السائق قريب منك!<br><span style="font-size:.75rem;opacity:.85">اضغط لتتبع الطلب</span>';
          div.onclick = () => {
            const g = (() => { try { return JSON.parse(localStorage.getItem('bj_guest_order')||'{}'); } catch(e){return {};} })();
            const ord = orders.find(x => x._id === change.doc.id);
            const trackId = ord?.orderId || g.orderId || '';
            if (trackId) window.open(`https://brjman.com/track.html?order=${trackId}`, '_blank');
            div.remove();
          };
          document.body.appendChild(div);
          setTimeout(() => div.remove(), 10000);
        }
      } else if (st === 'Delivered' && (isMyOrder || isGuestOrder)) {
        browserNotif('تم توصيل طلبك!', 'يمكنك تقييم السائق الآن');
      }
    });
  });
};

// Extend showPage to handle new pages
const _origShowPage = showPage;
showPage = function(id) {
  // Allow preparer/driver pages without auth restriction bypass
  if (id === 'pagePrep' && CU?.type === 'preparer') {
    document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    setActive(id);
    const nav = document.getElementById('nav_' + id);
    if (nav) document.getElementById('topbarTitle').innerHTML = nav.innerHTML;
    closeSidebar();
    renderPrepDashboard();
    startNewRoleListeners();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (id === 'pageDriver' && CU?.type === 'driver') {
    document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    setActive(id);
    closeSidebar();
    renderDriverDashboard();
    startNewRoleListeners();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (id === 'pagePerfReports') {
    if (!CU || (CU.type !== 'admin' && CU.type !== 'sales_manager')) {
      toast('🔒 هذه الصفحة للأدمن فقط', false);
      return;
    }
    document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    setActive(id);
    closeSidebar();
    renderPerfReports();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  _origShowPage(id);
};

// ── Patch onSnapshot orders to notify preparer about new orders ──
const _origOrdersSnapshot = null; // Already handled inside startRealtimeListeners

// ── Guest tracking button on store page ──
function renderGuestTrackBtn() {
  const wrap = document.getElementById('guestBannerWrap');
  if (!wrap) return;
  if (CU) { wrap.innerHTML = ''; return; } // logged-in users don't need this
  const saved = localStorage.getItem('bj_guest_order');
  if (!saved) { wrap.innerHTML = ''; return; }
  try {
    const g = JSON.parse(saved);
    wrap.innerHTML = `
    <div style="background:linear-gradient(135deg,#0ea5e9,#0369a1);border-radius:18px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;color:white">
      <div>
        <div style="font-weight:800;font-size:.9rem">📦 لديك طلب سابق</div>
        <div style="font-size:.75rem;opacity:.8;margin-top:2px">${g.shop || ''} — ${g.date || ''}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0">
        <a class="btn btn-sm" style="background:white;color:#0369a1;font-weight:700;text-decoration:none" href="https://brjman.com/track.html?order=${g.orderId}" target="_blank">تتبع الطلب</a>
        <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:white" onclick="localStorage.removeItem('bj_guest_order');renderGuestTrackBtn()">✕</button>
      </div>
    </div>`;
  } catch(e) { localStorage.removeItem('bj_guest_order'); }
}

// ── Extend buildUI for new features init ──
const _origBuildUIFinal = buildUI;
buildUI = function() {
  _origBuildUIFinal();
  startNewRoleListeners();
  renderGuestTrackBtn();
};

// ── Initialize on DOMContentLoaded ──
document.addEventListener('fbReady', () => {
  cacheProducts();
});


// ══════════════════════════════════════════════════════
// CUSTOMER ORDER TRACKING MODAL
// ══════════════════════════════════════════════════════
let _trackUnsub = null;

// ══════════════════════════════════════════════════════
// DELIVERY VEHICLES SETTINGS (admin / supervisor only)
// ══════════════════════════════════════════════════════
let _dvSettings = null; // cached from Firebase

async function loadDeliveryVehiclesSettings() {
  try {
    const snap = await fb().getDocs(
      fb().query(fb().collection(db(), 'settings'), fb().where('key','==','delivery_vehicles'))
    );
    if (!snap.empty) {
      _dvSettings = snap.docs[0].data().value || defaultDeliveryVehicles();
    } else {
      _dvSettings = defaultDeliveryVehicles();
    }
  } catch(e) { _dvSettings = defaultDeliveryVehicles(); }
}

function defaultDeliveryVehicles() {
  return {
    scooter: { name:'ستوتة',  icon:'🛵', capacity:0.4,  maxWeight:20   },
    pickup:  { name:'بيك اب', icon:'🚐', capacity:6,    maxWeight:500  },
    truck:   { name:'شاحنة',  icon:'🚛', capacity:30,   maxWeight:3000 }
  };
}


function renderDvList() {
  const el = document.getElementById('dvList');
  if (!el || !_dvSettings) return;
  el.innerHTML = Object.entries(_dvSettings).map(([key, v]) => `
    <div class="glass" style="border-radius:var(--r12);padding:16px;margin-bottom:12px;" id="dvRow_${key}">
      <!-- Row 1: Icon + Name + Delete -->
      <div style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-bottom:10px">
        <input type="text" class="fi" style="width:50px;text-align:center;font-size:1.5rem;padding:6px" value="${v.icon||''}" id="dvIcon_${key}" placeholder="🚗">
        <input type="text" class="fi" value="${v.name||''}" id="dvName_${key}" placeholder="اسم المركبة" style="font-weight:700">
        <button class="btn btn-ghost btn-sm" onclick="removeDvRow('${key}')" title="حذف">حذف</button>
      </div>
      <!-- Row 2: Physical dimensions (cm) → auto-calc volume -->
      <div style="background:rgba(13,148,136,.06);border:1px solid rgba(13,148,136,.15);border-radius:var(--r12);padding:10px;margin-bottom:10px;">
        <div style="font-size:.72rem;font-weight:800;color:var(--teal2);margin-bottom:8px;">📐 أبعاد صندوق الشحن (سم)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end">
          <div>
            <label style="font-size:.68rem;color:#888;display:block;margin-bottom:3px">الطول</label>
            <input type="number" class="fi" value="${v.box_l||''}" id="dvBoxL_${key}" placeholder="0" step="1" min="0" oninput="calcDvVolume('${key}')">
          </div>
          <div>
            <label style="font-size:.68rem;color:#888;display:block;margin-bottom:3px">العرض</label>
            <input type="number" class="fi" value="${v.box_w||''}" id="dvBoxW_${key}" placeholder="0" step="1" min="0" oninput="calcDvVolume('${key}')">
          </div>
          <div>
            <label style="font-size:.68rem;color:#888;display:block;margin-bottom:3px">الارتفاع</label>
            <input type="number" class="fi" value="${v.box_h||''}" id="dvBoxH_${key}" placeholder="0" step="1" min="0" oninput="calcDvVolume('${key}')">
          </div>
          <div id="dvCalcVol_${key}" style="font-size:.75rem;font-weight:800;color:var(--teal2);white-space:nowrap;padding-bottom:6px;">
            ${(v.box_l && v.box_w && v.box_h) ? '= ' + ((v.box_l*v.box_w*v.box_h)/1000000).toFixed(4) + ' م³' : ''}
          </div>
        </div>
      </div>
      <!-- Row 3: Capacity + MaxWeight + PricePerKg -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div>
          <label style="font-size:.7rem;color:#888;display:block;margin-bottom:3px">📦 السعة (م³)</label>
          <input type="number" class="fi" value="${v.capacity||0}" id="dvCap_${key}" step="0.0001" min="0" placeholder="0.0000">
        </div>
        <div>
          <label style="font-size:.7rem;color:#888;display:block;margin-bottom:3px">⚖️ حمولة (كغ)</label>
          <input type="number" class="fi" value="${v.maxWeight||0}" id="dvWgt_${key}" min="0">
        </div>
        <div>
          <label style="font-size:.7rem;color:#888;display:block;margin-bottom:3px">💰 سعر/كغ</label>
          <input type="number" class="fi" value="${v.pricePerKg||0}" id="dvPpk_${key}" min="0">
        </div>
      </div>
    </div>`).join('');
}

window.calcDvVolume = function(key) {
  const l = parseFloat(document.getElementById(`dvBoxL_${key}`)?.value) || 0;
  const w = parseFloat(document.getElementById(`dvBoxW_${key}`)?.value) || 0;
  const h = parseFloat(document.getElementById(`dvBoxH_${key}`)?.value) || 0;
  const calcEl = document.getElementById(`dvCalcVol_${key}`);
  const capEl  = document.getElementById(`dvCap_${key}`);
  if (l && w && h) {
    const vol = (l * w * h) / 1000000;
    if (calcEl) calcEl.textContent = '= ' + vol.toFixed(4) + ' م³';
    if (capEl)  capEl.value = vol.toFixed(4);
  } else {
    if (calcEl) calcEl.textContent = '';
  }
};

window.addDeliveryVehicleRow = function() {
  if (!_dvSettings) _dvSettings = defaultDeliveryVehicles();
  const key = 'v_' + Date.now();
  _dvSettings[key] = { name:'', icon:'🚗', capacity:1, maxWeight:100, pricePerKg:0, box_l:0, box_w:0, box_h:0 };
  renderDvList();
};

window.removeDvRow = function(key) {
  if (!_dvSettings) return;
  delete _dvSettings[key];
  renderDvList();
};

window.saveDeliveryVehicles = async function() {
  if (!_dvSettings) return;
  const updated = {};
  Object.keys(_dvSettings).forEach(key => {
    const name  = document.getElementById(`dvName_${key}`)?.value.trim();
    const icon  = document.getElementById(`dvIcon_${key}`)?.value.trim();
    const cap   = parseFloat(document.getElementById(`dvCap_${key}`)?.value) || 0;
    const wgt   = parseFloat(document.getElementById(`dvWgt_${key}`)?.value) || 0;
    const ppk   = parseFloat(document.getElementById(`dvPpk_${key}`)?.value) || 0;
    const box_l = parseFloat(document.getElementById(`dvBoxL_${key}`)?.value) || 0;
    const box_w = parseFloat(document.getElementById(`dvBoxW_${key}`)?.value) || 0;
    const box_h = parseFloat(document.getElementById(`dvBoxH_${key}`)?.value) || 0;
    if (name) updated[key] = { name, icon, capacity:cap, maxWeight:wgt, pricePerKg:ppk, box_l, box_w, box_h };
  });
  try {
    const snap = await fb().getDocs(
      fb().query(fb().collection(db(), 'settings'), fb().where('key','==','delivery_vehicles'))
    );
    if (snap.empty) {
      await fb().addDoc(fb().collection(db(), 'settings'), { key:'delivery_vehicles', value:updated });
    } else {
      await fb().updateDoc(fb().doc(db(), 'settings', snap.docs[0].id), { value:updated });
    }
    _dvSettings = updated;
    toast('تم حفظ إعدادات التوصيل');
  } catch(e) {
    console.error(e);
    toast('❌ حدث خطأ في الحفظ', false);
  }
};

// Hook into page show for pageDeliverySettings
const _origShowPageDV = showPage;
showPage = function(page) {
  _origShowPageDV(page);
  if (page === 'pageDeliverySettings') {
    if (!_dvSettings) {
      loadDeliveryVehiclesSettings().then(renderDvList);
    } else {
      renderDvList();
    }
  }
};

// ══════════════════════════════════════════════════════
// BUYER MODE — مفرد / جملة
// ══════════════════════════════════════════════════════
function showBuyerTypeScreen() {
  const scr = document.getElementById('buyerTypeScreen');
  if (!scr) return;
  scr.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => scr.classList.add('show')));
}

function setBuyerMode(mode) {
  buyerMode = mode;
  localStorage.setItem('bj_buyer_mode', mode);
  const scr = document.getElementById('buyerTypeScreen');
  if (scr) {
    scr.classList.remove('show');
    setTimeout(() => { scr.style.display = 'none'; }, 350);
  }
  cart = {}; updateCartUI();
  updateModeBadge();
  renderStore('الكل');
  renderCats();
}

function updateModeBadge() {
  const el = document.getElementById('modeBadgeBtn');
  if (!el) return;
  el.style.display = 'flex';
  const tiny = window.innerWidth <= 380;
  if (buyerMode === 'wholesale') {
    el.className = 'mode-badge mode-badge-wholesale';
    el.innerHTML = tiny ? '📦' : '📦 جملة';
  } else {
    el.className = 'mode-badge mode-badge-retail';
    el.innerHTML = tiny ? '🛍️' : '🛍️ مفرد';
  }
}
window.addEventListener('resize', () => { if (buyerMode) updateModeBadge(); });

