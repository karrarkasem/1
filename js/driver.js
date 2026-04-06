// ════════════════════════════════════════════════════════
// DRIVER.JS — لوحة تحكم السائق
// يعتمد على المتغيرات العامة: orders, CU
// والدوال: fbUpdate, fbAdd, toast, openModal, closeModal,
//          browserNotif, notifyCustomer, sendFCMPushToAdmins,
//          tsToStr, IMGBB_API_KEY
// ════════════════════════════════════════════════════════

// ─── عرض لوحة السائق ──────────────────────────────────
async function renderDriverDashboard() {
  const listEl = document.getElementById('driverOrdersList');
  const kpiEl  = document.getElementById('driverKpi');
  if (!listEl || !kpiEl) return;

  const preparedOrders   = orders.filter(o => o.status === 'Prepared');
  const inDeliveryOrders = orders.filter(o =>
    (o.status === 'In Delivery' || o.status === 'NearCustomer') && o.driver_id === CU.username
  );
  const myDelivered = orders.filter(o => o.status === 'Delivered' && o.driver_id === CU.username)
    .sort((a, b) => new Date(b.delivered_at || 0) - new Date(a.delivered_at || 0))
    .slice(0, 20);
  const ratedDeliveries = myDelivered.filter(o => o.driver_rating);
  const avgRating = ratedDeliveries.length
    ? ratedDeliveries.reduce((s, o) => s + o.driver_rating, 0) / ratedDeliveries.length
    : 0;

  // ─── KPI Cards ───
  kpiEl.innerHTML = `
    <div class="kpi-card kpi-mint">
      <div class="kpi-icon">📦</div>
      <div class="kpi-val">${preparedOrders.length}</div>
      <div class="kpi-lbl">جاهزة للتحميل</div>
    </div>
    <div class="kpi-card kpi-teal">
      <div class="kpi-icon">🚗</div>
      <div class="kpi-val">${inDeliveryOrders.length}</div>
      <div class="kpi-lbl">قيد التوصيل</div>
    </div>
    <div class="kpi-card kpi-sky">
      <div class="kpi-icon">✅</div>
      <div class="kpi-val">${myDelivered.length}</div>
      <div class="kpi-lbl">تم تسليمها</div>
    </div>
    <div class="kpi-card kpi-gold">
      <div class="kpi-icon">⭐</div>
      <div class="kpi-val">${avgRating ? avgRating.toFixed(1) : '—'}</div>
      <div class="kpi-lbl">متوسط التقييم</div>
    </div>`;

  if (!preparedOrders.length && !inDeliveryOrders.length && !myDelivered.length) {
    listEl.innerHTML = `
      <div style="text-align:center;padding:55px 20px;color:rgba(9,50,87,.35)">
        <div style="font-size:3rem;margin-bottom:12px">🚗</div>
        <div style="font-weight:700;font-size:.95rem">لا توجد طلبات حالياً</div>
        <div style="font-size:.8rem;margin-top:6px;opacity:.7">ستظهر الطلبات الجاهزة هنا</div>
      </div>`;
    return;
  }

  // ─── القسم 1: جاهزة للتحميل (مميزة بالإطار النابض) ───
  let readyHtml = '';
  if (preparedOrders.length) {
    readyHtml = `
      <div class="driver-section-hdr ready">
        📦 جاهزة للتحميل
        <span class="ds-count">${preparedOrders.length}</span>
      </div>
      ${preparedOrders.map(o => _drvCardPrepared(o)).join('')}`;
  }

  // ─── القسم 2: قيد التوصيل ───
  let onRoadHtml = '';
  if (inDeliveryOrders.length) {
    onRoadHtml = `
      <div class="driver-section-hdr onroad" style="margin-top:${preparedOrders.length ? '18px' : '0'}">
        🚗 قيد التوصيل
        <span class="ds-count">${inDeliveryOrders.length}</span>
      </div>
      ${inDeliveryOrders.map(o => _drvCardActive(o)).join('')}`;
  }

  // ─── القسم 3: سجل التوصيلات ───
  let deliveredHtml = '';
  if (myDelivered.length) {
    deliveredHtml = `
      <div class="driver-section-hdr done" style="margin-top:${(preparedOrders.length || inDeliveryOrders.length) ? '18px' : '0'}">
        📋 سجل التوصيلات
        <span class="ds-count">${myDelivered.length}</span>
      </div>
      ${myDelivered.map(o => _drvCardDone(o)).join('')}`;
  }

  listEl.innerHTML = readyHtml + onRoadHtml + deliveredHtml;
}

// ─── بطاقة: جاهز للتحميل ─────────────────────────────
function _drvCardPrepared(o) {
  const prepTime = o.prepared_at
    ? `<span class="badge b-mint">🕐 ${new Date(o.prepared_at).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}</span>`
    : '';
  const items = o.cartItemsArray || (o.products ? o.products.split('،').map(s => s.trim()).filter(Boolean) : []);
  const itemsHtml = items.length
    ? `<div class="drv-products" style="margin-bottom:8px">🛒 ${items.slice(0,5).map(i => typeof i === 'object' ? `${i.name} ×${i.qty}` : i).join(' — ')}${items.length > 5 ? ` (+${items.length-5})` : ''}</div>`
    : (o.products ? `<div class="drv-products">${esc(o.products)}</div>` : '');
  return `
  <div class="driver-prepared-card">
    <div class="drv-card-hd">
      <div>
        <div class="drv-shop">🏪 ${esc(o.shopName || '—')}</div>
        <div class="drv-id">${esc(o.orderId || o._id)}</div>
      </div>
      <span class="badge b-mint" style="animation:pulse 2s infinite;white-space:nowrap;font-weight:800">📦 جاهز للتحميل</span>
    </div>
    <div class="drv-meta">
      <span class="badge b-sky">💰 ${(parseFloat(o.total)||0).toLocaleString()} د.ع</span>
      ${o.vehicle_type ? `<span class="badge b-violet">🚚 ${esc(o.vehicle_type)}</span>` : ''}
      ${prepTime}
      ${o.total_volume ? `<span class="badge b-teal">📐 ${parseFloat(o.total_volume).toFixed(2)} م³</span>` : ''}
    </div>
    ${o.shopAddress || o.shopAddr ? `<div class="drv-products">📍 ${esc(o.shopAddress || o.shopAddr)}</div>` : ''}
    ${itemsHtml}
    <div class="drv-actions">
      ${o.location ? `<a href="${o.location}" target="_blank" class="btn btn-ghost btn-sm">🗺️ الموقع</a>` : ''}
      <button class="btn btn-mint" style="flex:2;font-weight:800" onclick="markAsLoaded('${o._id}')">🚗 تم التحميل — ابدأ التوصيل</button>
    </div>
  </div>`;
}

// ─── بطاقة: قيد التوصيل ──────────────────────────────
function _drvCardActive(o) {
  const isNear = o.status === 'NearCustomer';
  const statusBadge = isNear
    ? `<span class="badge b-gold" style="animation:pulse 1.5s infinite">📍 قريب من الزبون</span>`
    : `<span class="badge b-sky">🚗 في الطريق</span>`;
  const loadTime = o.loaded_at
    ? `<span class="badge b-teal">🕐 ${new Date(o.loaded_at).toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}</span>`
    : '';
  return `
  <div class="driver-active-card">
    <div class="drv-card-hd">
      <div>
        <div class="drv-shop">🏪 ${esc(o.shopName || '—')}</div>
        <div class="drv-id">${esc(o.orderId || o._id)}</div>
      </div>
      ${statusBadge}
    </div>
    <div class="drv-meta">
      <span class="badge b-sky">💰 ${(parseFloat(o.total)||0).toLocaleString()} د.ع</span>
      ${o.vehicle_type ? `<span class="badge b-violet">🚚 ${esc(o.vehicle_type)}</span>` : ''}
      ${loadTime}
    </div>
    ${o.shopAddress || o.shopAddr ? `<div class="drv-products">📍 ${esc(o.shopAddress || o.shopAddr)}</div>` : ''}
    ${o.products ? `<div class="drv-products">🛒 ${esc(o.products)}</div>` : ''}
    <div class="drv-actions">
      ${o.location ? `<a href="${o.location}" target="_blank" class="btn btn-ghost btn-sm">🗺️ الموقع</a>` : ''}
      ${!isNear ? `<button class="btn btn-gold btn-sm" onclick="markAsNearCustomer('${o._id}')">📍 أنا قريب</button>` : ''}
      <button class="btn btn-mint" style="flex:2" onclick="openDeliveryProof('${o._id}','${esc(o.driver_id || '')}')">✅ تأكيد التسليم</button>
    </div>
  </div>`;
}

// ─── بطاقة: مُسلَّم ───────────────────────────────────
function _drvCardDone(o) {
  const confirmed = !!o.customer_confirmed;
  const confirmBadge = confirmed
    ? `<span class="badge b-mint">✅ أكد الزبون الاستلام</span>`
    : `<span class="badge b-gold">⏳ انتظار تأكيد الزبون</span>`;
  return `
  <div class="driver-done-card">
    <div class="drv-card-hd">
      <div>
        <div class="drv-shop" style="font-size:.9rem;color:var(--mid)">🏪 ${esc(o.shopName || '—')}</div>
        <div class="drv-id">${esc(o.orderId || o._id)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
        <span class="badge b-teal">📦 مُسلَّم</span>
        ${confirmBadge}
      </div>
    </div>
    <div class="drv-meta">
      <span class="badge b-sky">💰 ${(parseFloat(o.total)||0).toLocaleString()} د.ع</span>
      ${o.delivered_at ? `<span class="badge b-teal">🕐 ${new Date(o.delivered_at).toLocaleDateString('ar-IQ')}</span>` : ''}
    </div>
    ${o.proof_url ? `<a href="${o.proof_url}" target="_blank" class="btn btn-ghost btn-sm" style="pointer-events:auto">📷 إثبات التسليم</a>` : ''}
  </div>`;
}

// ─── تحديد الطلب كـ "قيد التوصيل" ───────────────────
async function markAsLoaded(orderId) {
  if (!CU) return;
  const now = new Date().toISOString();
  await fbUpdate('orders', orderId, {
    status: 'In Delivery', driver_id: CU.username,
    driver_name: CU.name, loaded_at: now
  }).catch(() => {});
  toast('تم تحديد الطلب كـ "قيد التوصيل"');
  renderDriverDashboard();
  const ord = orders.find(o => o._id === orderId);
  if (ord) {
    await notifyCustomer(ord, '🚗 طلبك في الطريق إليك!', `طلبك أصبح في الطريق — السائق: ${CU.name}`).catch(()=>{});
  }
  sendFCMPushToAdmins('🚗 طلب قيد التوصيل', `${ord?.shopName||orderId} — السائق: ${CU.name}`).catch(()=>{});
}

// ─── إشعار "أنا قريب" ────────────────────────────────
async function markAsNearCustomer(orderId) {
  if (!CU) return;
  await fbUpdate('orders', orderId, { status: 'NearCustomer', near_at: new Date().toISOString() }).catch(() => {});
  toast('📍 تم إشعار الزبون بأنك قريب');
  renderDriverDashboard();
  const ord = orders.find(o => o._id === orderId);
  if (ord) {
    await notifyCustomer(ord, '🚚 السائق قريب منك!', `طلبك سيصل خلال دقائق — ${CU.name} في طريقه إليك`).catch(()=>{});
  }
}

// ─── إثبات التسليم (صورة / توقيع) ───────────────────
let _proofPhotoDataUrl = null, _sigDrawing = false, _sigCtx = null;
let _currentProofTab = 'photo';

function openDeliveryProof(orderId, driverId) {
  document.getElementById('proofOrderId').value = orderId;
  const driverIdEl = document.getElementById('proofDriverId');
  if (driverIdEl) driverIdEl.value = driverId || CU?.username || '';
  _proofPhotoDataUrl = null;
  const preview = document.getElementById('proofPhotoPreview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  const photoInput = document.getElementById('proofPhotoInput');
  if (photoInput) photoInput.value = '';
  _sigCtx = null;
  switchProofTab('photo');
  openModal('driverProofModal');
  setTimeout(initSigCanvas, 200);
}

function switchProofTab(tab) {
  _currentProofTab = tab;
  document.getElementById('proofPhotoPane').style.display = tab === 'photo' ? 'block' : 'none';
  document.getElementById('proofSigPane').style.display   = tab === 'sig'   ? 'block' : 'none';
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
  canvas.addEventListener('mouseup',   end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove',  draw,  { passive: false });
  canvas.addEventListener('touchend',   end);
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
    const base64 = proofDataUrl.split(',')[1];
    const fd = new FormData();
    fd.append('image', base64);
    fd.append('key', IMGBB_API_KEY);
    const resp = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) proofUrl = data.data.url;
  } catch(e) {
    proofUrl = proofDataUrl;
  }

  const now = new Date().toISOString();
  await fbUpdate('orders', orderId, {
    status: 'Delivered', delivered_at: now,
    proof_url: proofUrl, driver_id: CU?.username, driver_name: CU?.name
  }).catch(() => {});

  statusEl.textContent = 'تم التسليم!';
  setTimeout(() => { closeModal('driverProofModal'); statusEl.style.display = 'none'; }, 800);

  toast('تم تأكيد التسليم');
  renderDriverDashboard();

  const delivOrd = orders.find(o => o._id === orderId);
  if (delivOrd) {
    await notifyCustomer(delivOrd, '✅ تم توصيل طلبك!', 'طلبك وصل بنجاح — شكراً لاختيارك برجمان').catch(()=>{});
  }
  sendFCMPushToAdmins('✅ طلب مُسلَّم', `${delivOrd?.shopName||orderId} — تم التسليم`).catch(()=>{});
}
