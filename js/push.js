// ════════════════════════════════════════════════════════
// PUSH.JS — إشعارات FCM + إيميل (EmailJS)
// يعتمد على: config.js (EMAILJS_*, ADMIN_EMAILS)
// المتغيرات المشتركة (CU, users, fbUpdate, fbAdd) معرّفة في app.js
// ════════════════════════════════════════════════════════

// ─── إرسال إيميل عند إنشاء طلب جديد ─────────────────
async function sendOrderEmail({shop, addr, note, prodList, total, commission, commPct, orderId, nowStr, selLoc}) {
  try {
    if(typeof emailjs === 'undefined') return;
    const repName = CU?.name || 'زائر';
    for(const email of ADMIN_EMAILS) {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:   email,
        subject:    `🛍️ طلب جديد — ${shop} — ${total.toLocaleString()} د.ع`,
        order_id:   orderId,
        order_date: nowStr,
        rep_name:   repName,
        shop_name:  shop,
        shop_addr:  addr,
        shop_note:  note || '—',
        location:   selLoc || '—',
        products:   prodList.join('\n'),
        total:      total.toLocaleString() + ' د.ع',
        commission: commission.toLocaleString() + ' د.ع (' + commPct + '%)',
        net:        (total - commission).toLocaleString() + ' د.ع',
      });
    }
  } catch(e) {
    console.error('sendOrderEmail:', e);
  }
}

// ─── تسجيل Service Worker + طلب إذن الإشعارات ────────
async function registerPush() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (!window._messaging) return;
  try {
    const sw = await navigator.serviceWorker.register('/sw.js');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const vapidKey = window.COMPANY?.vapid_key;
    if (!vapidKey) return;

    const token = await window._fb.getToken(window._messaging, {
      vapidKey,
      serviceWorkerRegistration: sw
    });
    if (token) {
      localStorage.setItem('_fcmToken', token);
      if (CU?._id) {
        await fbUpdate('users', CU._id, { fcmToken: token });
        const idx = users.findIndex(u => u._id === CU._id);
        if (idx !== -1) users[idx].fcmToken = token;
      }
    }

    window._fb.onMessage(window._messaging, payload => {
      const title = payload.notification?.title || 'برجمان';
      const body  = payload.notification?.body  || '';
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png', dir: 'rtl' });
      }
    });
  } catch(e) { console.warn('registerPush:', e); }
}

// ─── تسجيل صامت (بدون طلب إذن جديد) ─────────────────
async function initPushSilent() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!window._messaging || !window.COMPANY?.vapid_key) return;
  try {
    const sw = await navigator.serviceWorker.register('/sw.js');
    const token = await window._fb.getToken(window._messaging, {
      vapidKey: window.COMPANY.vapid_key,
      serviceWorkerRegistration: sw
    });
    if (token) {
      localStorage.setItem('_fcmToken', token);
      if (CU?._id) {
        await fbUpdate('users', CU._id, { fcmToken: token }).catch(()=>{});
      }
    }
  } catch(e) {}
}

// ─── إرسال Push لقائمة توكنات ─────────────────────────
async function _sendFCM(tokens, title, body, url = '/', tag = 'order') {
  const serverKey = window.COMPANY?.fcm_server_key;
  if (!serverKey || !tokens.length) return;
  for (const token of tokens) {
    fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'key=' + serverKey },
      body: JSON.stringify({
        to: token,
        priority: 'high',
        notification: { title, body, icon: '/icon.png', dir: 'rtl', sound: 'default' },
        data: { url, tag }
      })
    }).catch(()=>{});
  }
}

// ─── Push للأدمن والمشرفين ────────────────────────────
async function sendFCMPushToAdmins(title, body, url = '/') {
  const adminTypes = ['admin','sales_manager','supervisor'];
  const tokens = users
    .filter(u => adminTypes.includes(u.type) && u.fcmToken)
    .map(u => u.fcmToken);
  await _sendFCM(tokens, title, body, url, 'admin-order');
}

// ─── Push + إشعار داخلي للزبون ───────────────────────
async function notifyCustomer(order, title, body) {
  const trackUrl = `/track.html?order=${order.orderId || order._id || ''}`;

  // FCM — التوكن المحفوظ في الطلب
  const custToken = order.customerFcmToken;
  if (custToken) await _sendFCM([custToken], title, body, trackUrl, 'customer-order');

  // FCM — توكن المستخدم المسجل
  const custUser = users.find(u => u.username === order.repUsername);
  if (custUser?.fcmToken && custUser.fcmToken !== custToken) {
    await _sendFCM([custUser.fcmToken], title, body, trackUrl, 'customer-order');
  }

  // تيليغرام
  const TG = window.COMPANY?.telegram_token;
  if (TG && custUser?.telegram) {
    fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: custUser.telegram, text: `${title}\n${body}` })
    }).catch(()=>{});
  }

  // إشعار داخلي في النظام
  const targetUser = custUser?.username || order.repUsername || order.visitorPhone || 'customer';
  fbAdd('notifications', {
    title, body, type: 'order', read: false,
    targetUser, orderId: order._id || order.orderId,
    date: new Date().toLocaleDateString('ar-IQ')
  }).catch(()=>{});
}

// ─── إشعار للمجهزين عند ورود طلب جديد ───────────────
async function createPreparerNotification(orderData, totalVolume) {
  try {
    const q = fb().query(fb().collection(db(), 'users'), fb().where('type', '==', 'preparer'));
    const snap = await fb().getDocs(q);
    const promises = snap.docs.map(d => {
      const preparer = d.data();
      return fbAdd('notifications', {
        title: '📦 طلب جديد للتجهيز',
        body: `${orderData.shopName} - ${(orderData.total||0).toLocaleString()} د.ع - حجم: ${(totalVolume||0).toFixed(3)} م³`,
        type: 'preparer', read: false,
        targetUser: preparer.username || preparer.uid || '',
        orderId: orderData.orderId || '',
        date: new Date().toLocaleDateString('ar-IQ'),
        timestamp: new Date().toISOString()
      });
    });
    await Promise.all(promises);
  } catch(e) { console.error('createPreparerNotification:', e); }
}
