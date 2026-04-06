// ════════════════════════════════════════════════════════
// PREPARER.JS — لوحة تحكم المجهز
// يعتمد على المتغيرات العامة: orders, products, CU, fbReady
// والدوال: fbUpdate, fbAdd, toast, openModal, closeModal,
//          browserNotif, notifyCustomer, sendFCMPushToAdmins,
//          parseCartItems, tsToStr, esc
// ════════════════════════════════════════════════════════

// ─── مستمعات real-time للمجهز والسائق ────────────────
let _prepSnapshot = null, _driverSnapshot = null;

function startNewRoleListeners() {
  if (!fbReady || !CU) return;

  if (CU.type === 'preparer' && !_prepSnapshot) {
    _prepSnapshot = fb().onSnapshot(
      fb().query(fb().collection(db(), 'orders'),
        fb().where('status', 'in', ['Pending', 'Confirmed', 'pending', 'confirmed'])),
      snap => {
        renderPrepDashboard();
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

// ─── حساب الحجم والوزن لطلب معين ─────────────────────
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

// ─── عرض لوحة المجهز ──────────────────────────────────
async function renderPrepDashboard() {
  const listEl = document.getElementById('prepOrdersList');
  const kpiEl  = document.getElementById('prepKpi');
  if (!listEl || !kpiEl) return;

  const prepOrders = orders.filter(o => {
    const st = (o.status || 'pending').toLowerCase();
    return ['pending', 'confirmed'].includes(st);
  });

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
    const statusBadge = (o.status || 'Pending') === 'Confirmed'
      ? '<span class="badge b-sky">✅ مؤكد</span>'
      : '<span class="badge b-gold">⏳ معلق</span>';
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
      <div style="margin-top:10px">
        <div style="font-size:.74rem;font-weight:700;color:rgba(9,50,87,.5);margin-bottom:7px">🚚 نوع المركبة</div>
        <div class="vehicle-selector" id="vehicle_${o._id}">
          <button class="vehicle-opt ${o.vehicle_type==='ستوتة'?'selected':''}" onclick="selectVehicle('${o._id}','ستوتة',this)"><span class="v-icon">🛵</span>ستوتة</button>
          <button class="vehicle-opt ${o.vehicle_type==='حمل صغيرة'?'selected':''}" onclick="selectVehicle('${o._id}','حمل صغيرة',this)"><span class="v-icon">🚐</span>حمل صغيرة</button>
          <button class="vehicle-opt ${o.vehicle_type==='شاحنة'?'selected':''}" onclick="selectVehicle('${o._id}','شاحنة',this)"><span class="v-icon">🚛</span>شاحنة</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="openPrepEditModal('${o._id}')">تعديل الكميات</button>
        <button class="btn btn-mint" style="flex:1" onclick="markAsPrepared('${o._id}')">تم التجهيز</button>
      </div>
    </div>`;
  }).join('');
}

// ─── اختيار نوع المركبة ───────────────────────────────
async function selectVehicle(orderId, vehicleType, btn) {
  const wrap = document.getElementById('vehicle_' + orderId);
  if (wrap) wrap.querySelectorAll('.vehicle-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  await fbUpdate('orders', orderId, { vehicle_type: vehicleType }).catch(() => {});
  toast(`تم اختيار: ${vehicleType}`);
}

// ─── تحديد الطلب كـ "مجهز" ───────────────────────────
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

  await fbAdd('notifications', {
    title: '🚗 طلب جاهز للتوصيل',
    body: `طلب رقم ${orderId}${prepOrd ? ' — ' + prepOrd.shopName : ''} جاهز للتحميل`,
    type: 'order', read: false, targetUser: 'driver',
    orderId, date: new Date().toLocaleDateString('ar-IQ')
  }).catch(() => {});
  browserNotif('🚗 طلب جاهز للتوصيل', 'طلب جديد جاهز للتحميل');

  if (prepOrd) {
    await notifyCustomer(prepOrd, '📦 تم تجهيز طلبك!', 'طلبك جاهز وخرج من المخزن — جارٍ تعيين السائق').catch(()=>{});
  }
  sendFCMPushToAdmins('📦 طلب جاهز للتوصيل', `${prepOrd?.shopName||orderId} — جاهز للتحميل`).catch(()=>{});
}

// ─── تعديل كميات الطلب ───────────────────────────────
async function openPrepEditModal(orderId) {
  let rawOrd = orders.find(o => o._id === orderId);
  if (!rawOrd && window._fbReady) {
    try {
      const snap = await fb().getDoc(fb().doc(db(), 'orders', orderId));
      if (snap.exists()) rawOrd = { _id: snap.id, ...snap.data() };
    } catch(e) { console.warn('openPrepEditModal getDoc:', e); }
  }
  if (!rawOrd) { toast('لم يتم العثور على الطلب', false); return; }

  document.getElementById('prepEditOrderId').value = orderId;
  document.getElementById('prepEditOrderInfo').innerHTML =
    `🏪 ${rawOrd.shopName || '—'} — 💰 ${(parseFloat(rawOrd.total)||0).toLocaleString()} د.ع`;

  const items = rawOrd.cartItemsArray || parseCartItems(rawOrd.products);
  let itemsHtml = '';
  if (items.length) {
    itemsHtml = items.map((item) => {
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
}

function recalcPrepEditTotal() {
  let total = 0;
  document.querySelectorAll('.prep-edit-qty').forEach(input => {
    total += (parseInt(input.value) || 0) * (parseFloat(input.dataset.price) || 0);
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

  const newTotal = updatedItems.reduce((s, i) => s + i.qty * i.price, 0);
  const newProducts = updatedItems.map(i => `${i.name}(${i.qty})`).join('، ');
  const commPct = orders.find(o => o._id === orderId)?.commPct || 0;
  const commission = Math.round(newTotal * commPct / 100);

  await fbUpdate('orders', orderId, {
    products: newProducts, cartItemsArray: updatedItems,
    total: newTotal, commission, net: newTotal - commission,
    qty_edited_by: CU?.username, qty_edited_at: new Date().toISOString()
  }).catch(() => {});

  closeModal('prepEditModal');
  toast('تم تحديث الكميات والإجمالي');
  renderPrepDashboard();
}
