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
  const myDelivered = orders.filter(o => o.status === 'Delivered' && o.driver_id === CU.username);
  const avgRating   = myDelivered.filter(o => o.driver_rating)
    .reduce((s, o, _, a) => s + o.driver_rating / a.length, 0);

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
    const isPrepared   = o.status === 'Prepared';
    const isInDelivery = o.status === 'In Delivery';
    const isNear       = o.status === 'NearCustomer';
    const isOnRoad     = isInDelivery || isNear;
    const statusBadge  = isPrepared ? '<span class="badge b-green">✅ جاهز للتحميل</span>'
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
        ${isPrepared   ? `<button class="btn btn-sky btn-full" onclick="markAsLoaded('${o._id}')">تم التحميل</button>` : ''}
        ${isInDelivery ? `<button class="btn btn-gold btn-sm" onclick="markAsNearCustomer('${o._id}')">أنا قريب</button>` : ''}
        ${isOnRoad     ? `<button class="btn btn-mint btn-full" onclick="openDeliveryProof('${o._id}','${o.driver_id || ''}')">تأكيد التسليم</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const deliveredHtml = myDelivered.length ? `
    <div style="margin-top:${allDriverOrders.length?'20':'0'}px;padding-top:${allDriverOrders.length?'16':'0'}px;${allDriverOrders.length?'border-top:1px solid rgba(0,0,0,.08);':''}margin-bottom:10px;font-weight:800;color:var(--deep);font-size:.9rem">
      📋 سجل التوصيلات (${myDelivered.length})
    </div>
    ${myDelivered.map(o => {
      const confirmed = !!o.customer_confirmed;
      return `
      <div class="prep-order-card" style="border:1.5px solid ${confirmed?'rgba(13,148,136,.35)':'rgba(245,158,11,.3)'};pointer-events:none;user-select:none">
        <div class="prep-order-hd">
          <div>
            <div class="prep-order-shop">🏪 ${o.shopName || '—'}</div>
            <div class="prep-order-id">${o.orderId || o._id}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge b-teal">📦 مُسلَّم</span>
            ${confirmed ? '<span class="badge b-mint">✅ أكد الزبون الاستلام</span>' : '<span class="badge b-gold">⏳ انتظار تأكيد الزبون</span>'}
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
