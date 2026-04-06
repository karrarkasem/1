// ════════════════════════════════════════════════════════
// CONFIG.JS — ثوابت + مفاتيح API + صلاحيات الأدوار
// ════════════════════════════════════════════════════════

// ─── صورة بديلة للمنتجات (SVG محلي — بدون طلب شبكة) ───
const NO_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f1f5f9'/%3E%3Crect x='65' y='68' width='70' height='64' rx='8' fill='%23e2e8f0'/%3E%3Crect x='55' y='61' width='90' height='20' rx='5' fill='%23cbd5e1'/%3E%3Cline x1='100' y1='81' x2='100' y2='132' stroke='%23d1d5db' stroke-width='2'/%3E%3C/svg%3E";

// ─── EmailJS (تُحمَّل من Firestore عبر loadProtectedKeys) ──
let EMAILJS_SERVICE_ID  = '';
let EMAILJS_TEMPLATE_ID = '';
let EMAILJS_PUBLIC_KEY  = '';
let ADMIN_EMAILS = []; // تُحمَّل من Firestore عبر loadProtectedKeys

// ─── إعدادات عامة ─────────────────────────────────────
// WA يُحمَّل من Firestore (settings.whatsapp_number) — القيمة الاحتياطية أدناه
let WA = '9647742222194';
// رابط الموقع — يُحمَّل من Firestore (settings.site_url)
let SITE_URL = 'https://brjman.com';
const HQ  = [32.57664096812528, 44.05991539922393];       // إحداثيات المقر
let IMGBB_API_KEY = ''; // يُحمَّل من Firestore عبر loadProtectedKeys

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
