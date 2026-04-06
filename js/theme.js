// ══════════════════════════════════════════════════
//  🎨 THEME SYSTEM — تطبيق فوري بدون وميض
// ══════════════════════════════════════════════════
(function () {
  const t = localStorage.getItem('app-theme');
  const m = localStorage.getItem('app-mode');
  if (t) document.documentElement.setAttribute('data-theme', t);
  if (m === 'dark') document.documentElement.setAttribute('data-mode', 'dark');
})();

// ── تعريف الثيمات ──
const THEMES = [
  { id: 'teal',   label: 'زمردي',    color: '#0d9488', color2: '#0f766e' },
  { id: 'sky',    label: 'سماوي',    color: '#0ea5e9', color2: '#0284c7' },
  { id: 'indigo', label: 'نيلي',     color: '#6366f1', color2: '#4f46e5' },
  { id: 'violet', label: 'بنفسجي',   color: '#8b5cf6', color2: '#7c3aed' },
  { id: 'rose',   label: 'وردي',     color: '#f43f5e', color2: '#e11d48' },
  { id: 'orange', label: 'برتقالي',  color: '#f97316', color2: '#ea580c' },
  { id: 'gold',   label: 'ذهبي',     color: '#f59e0b', color2: '#d97706' },
  { id: 'mint',   label: 'نعناعي',   color: '#10b981', color2: '#059669' },
];

// ── تطبيق اللون ──
function applyTheme(id) {
  const html = document.documentElement;
  if (!id || id === 'teal') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', id);
  localStorage.setItem('app-theme', id || 'teal');
  _updateSwatches(id || 'teal');
}

// ── تطبيق الوضع (فاتح/داكن) ──
function applyMode(mode) {
  const html = document.documentElement;
  if (mode === 'dark') html.setAttribute('data-mode', 'dark');
  else html.removeAttribute('data-mode');
  localStorage.setItem('app-mode', mode);
  _updateModeBtn(mode);
}

function toggleMode() {
  const cur = document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
  applyMode(cur === 'dark' ? 'light' : 'dark');
}

function _updateSwatches(activeId) {
  document.querySelectorAll('.th-swatch').forEach(s => {
    s.classList.toggle('th-active', s.dataset.tid === activeId);
  });
}

function _updateModeBtn(mode) {
  const btn = document.getElementById('thModeBtn');
  if (!btn) return;
  btn.innerHTML = mode === 'dark'
    ? '<span>☀️</span><span>وضع فاتح</span>'
    : '<span>🌙</span><span>وضع داكن</span>';
}

// ── إنشاء واجهة اختيار الثيم ──
function initThemePicker() {
  if (document.getElementById('thPickerRoot')) return;

  const savedTheme = localStorage.getItem('app-theme') || 'teal';
  const savedMode  = localStorage.getItem('app-mode')  || 'light';

  // ── CSS داخلي للواجهة ──
  const styleEl = document.createElement('style');
  styleEl.id = 'thPickerStyle';
  styleEl.textContent = `
    #thPickerRoot{padding:0 10px 10px;user-select:none;}
    #thPickerBtn{
      display:flex;align-items:center;gap:8px;
      padding:10px 12px;border-radius:12px;cursor:pointer;
      background:var(--teal3,rgba(13,148,136,.08));
      border:1px solid rgba(13,148,136,.18);
      color:var(--teal2);font-size:.82rem;font-weight:700;
      transition:background .2s;
    }
    #thPickerBtn:hover{background:var(--teal3,rgba(13,148,136,.14));filter:brightness(1.1);}
    #thPickerBtn .th-dot{
      width:10px;height:10px;border-radius:50%;
      background:var(--teal);margin-right:auto;flex-shrink:0;
      box-shadow:0 0 6px var(--teal);
    }
    #thPanel{
      display:none;margin-top:8px;
      padding:14px;border-radius:14px;
      background:var(--frost,#fff);
      border:1px solid var(--border2,rgba(0,0,0,.11));
      box-shadow:var(--shadow,0 4px 16px rgba(0,0,0,.08));
      animation:thPanelIn .18s ease;
    }
    #thPanel.open{display:block;}
    @keyframes thPanelIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .th-section-label{font-size:.72rem;font-weight:800;color:var(--mid);letter-spacing:.04em;margin-bottom:8px;}
    .th-swatches{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}
    .th-swatch{
      width:30px;height:30px;border-radius:50%;cursor:pointer;
      border:2.5px solid transparent;
      transition:transform .18s,box-shadow .18s;
      position:relative;
    }
    .th-swatch:hover{transform:scale(1.18);}
    .th-swatch.th-active{
      border-color:var(--deep,#0f172a) !important;
      box-shadow:0 0 0 3px var(--teal3,rgba(13,148,136,.2)),0 2px 8px rgba(0,0,0,.25) !important;
      transform:scale(1.12);
    }
    .th-swatch::after{
      content:'✓';position:absolute;inset:0;
      display:flex;align-items:center;justify-content:center;
      font-size:.7rem;color:white;font-weight:900;
      opacity:0;transition:opacity .15s;
    }
    .th-swatch.th-active::after{opacity:1;}
    #thModeBtn{
      width:100%;padding:9px 12px;
      border-radius:10px;cursor:pointer;
      border:1.5px solid var(--border2,rgba(0,0,0,.11));
      background:var(--ice3,#f1f5f9);
      color:var(--deep2,#1e293b);
      font-family:Cairo,sans-serif;font-size:.83rem;font-weight:700;
      display:flex;align-items:center;justify-content:center;gap:8px;
      transition:all .2s;
    }
    #thModeBtn:hover{background:var(--ice2,#f8fafc);filter:brightness(.97);}
    [data-mode="dark"] #thPanel{background:var(--frost,rgba(30,41,59,.97));border-color:rgba(255,255,255,.1);}
    [data-mode="dark"] #thPickerBtn{border-color:rgba(255,255,255,.12);}
    [data-mode="dark"] #thModeBtn{background:#0f172a;border-color:rgba(255,255,255,.1);color:#e2e8f0;}
  `;
  document.head.appendChild(styleEl);

  // ── HTML الواجهة ──
  const root = document.createElement('div');
  root.id = 'thPickerRoot';
  root.innerHTML = `
    <div id="thPickerBtn" onclick="window._toggleThPanel()">
      <span style="font-size:1rem">🎨</span>
      <span>تخصيص الثيم</span>
      <span class="th-dot"></span>
    </div>
    <div id="thPanel">
      <div class="th-section-label">🎨 لون الثيم</div>
      <div class="th-swatches">
        ${THEMES.map(t => `
          <div class="th-swatch ${savedTheme === t.id ? 'th-active' : ''}"
               data-tid="${t.id}"
               title="${t.label}"
               style="background:linear-gradient(135deg,${t.color},${t.color2});box-shadow:0 2px 8px ${t.color}55"
               onclick="applyTheme('${t.id}')">
          </div>`).join('')}
      </div>
      <div class="th-section-label">💡 الوضع</div>
      <button id="thModeBtn" onclick="toggleMode()">
        ${savedMode === 'dark' ? '<span>☀️</span><span>وضع فاتح</span>' : '<span>🌙</span><span>وضع داكن</span>'}
      </button>
    </div>
  `;

  // إدراج قبل منطقة تسجيل الدخول/الخروج
  const loginArea = document.getElementById('sbLoginLogout');
  const sidebar   = document.querySelector('.sidebar');
  if (loginArea) loginArea.insertAdjacentElement('beforebegin', root);
  else if (sidebar) sidebar.appendChild(root);
}

window._toggleThPanel = function () {
  const p = document.getElementById('thPanel');
  if (!p) return;
  p.classList.toggle('open');
};

// ── تصدير ──
window.applyTheme    = applyTheme;
window.applyMode     = applyMode;
window.toggleMode    = toggleMode;
window.initThemePicker = initThemePicker;
