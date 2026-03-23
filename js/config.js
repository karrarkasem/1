// ════════════════════════════════════════════════════════
// CONFIG.JS — ثوابت + مفاتيح API + صلاحيات الأدوار
// ════════════════════════════════════════════════════════

// ─── صورة بديلة للمنتجات (SVG محلي — بدون طلب شبكة) ───
const NO_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f1f5f9'/%3E%3Crect x='65' y='68' width='70' height='64' rx='8' fill='%23e2e8f0'/%3E%3Crect x='55' y='61' width='90' height='20' rx='5' fill='%23cbd5e1'/%3E%3Cline x1='100' y1='81' x2='100' y2='132' stroke='%23d1d5db' stroke-width='2'/%3E%3C/svg%3E";

// ─── EmailJS ───────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_e1sj8tn';
const EMAILJS_TEMPLATE_ID = 'template_2vxg15b';
const EMAILJS_PUBLIC_KEY  = 'vXft7Q_VrPCL4VBQJ';
const ADMIN_EMAILS = [
  'sale.burjuman@gmail.com'
];
(function(){
  if(typeof emailjs !== 'undefined')
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
})();

// ─── إعدادات عامة ─────────────────────────────────────
const WA  = '9647742222194';                              // واتساب الشركة
const HQ  = [32.57664096812528, 44.05991539922393];       // إحداثيات المقر
const IMGBB_API_KEY = 'a2173ed14e8a5d9288b6dbb4a56c8c78'; // مفتاح رفع الصور

// ─── نظام النقاط ──────────────────────────────────────
const POINTS_THRESHOLD = 100000; // نقطة واحدة لكل 100,000 د.ع

// ─── صلاحيات الأدوار ──────────────────────────────────
const PERMS = {
  admin:         { order:1, manage:1, dash:1, users:1, wallet:1, inv:1, inv_write:1, offers:1, tracking:1, reports:1, notif:1, delivery_cfg:1 },
  sales_manager: { order:1, manage:1, dash:1, users:0, wallet:1, inv:1, inv_write:1, offers:1, tracking:1, reports:1, notif:1, delivery_cfg:1 },
  rep:           { order:1, manage:0, dash:1, users:0, wallet:1, inv:0, inv_write:0, offers:1, tracking:0, reports:0, notif:1, delivery_cfg:0 },
  market_owner:  { order:1, manage:0, dash:1, users:0, wallet:1, inv:0, inv_write:0, offers:1, tracking:0, reports:0, notif:1, delivery_cfg:0 },
  guest:         { order:0, manage:0, dash:0, users:0, wallet:0, inv:0, inv_write:0, offers:1, tracking:0, reports:0, notif:0, delivery_cfg:0 }
};

// ─── أسماء الأدوار بالعربي ────────────────────────────
const ROLES = {
  admin:         '🛡️ أدمن',
  sales_manager: '📊 مشرف',
  rep:           '🤝 مندوب',
  market_owner:  '🏪 صاحب ماركت',
  guest:         '🌐 زائر'
};
