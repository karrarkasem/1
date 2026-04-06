// ═══════════════════════════════════════════════════════
// ADS SYSTEM — إعلانات موجهة حسب نوع المشتري
// ═══════════════════════════════════════════════════════

function switchOffersTab(tab) {
  var offersContent = document.getElementById('offersTabContent');
  var adsContent    = document.getElementById('adsTabContent');
  var offersTab     = document.getElementById('offersTab');
  var adsTab        = document.getElementById('adsTab');
  if (!offersContent || !adsContent) return;
  if (tab === 'ads') {
    offersContent.style.display = 'none';
    adsContent.style.display    = '';
    if (offersTab) offersTab.classList.remove('on');
    if (adsTab)    adsTab.classList.add('on');
    renderAdsManage();
  } else {
    adsContent.style.display    = 'none';
    offersContent.style.display = '';
    if (adsTab)    adsTab.classList.remove('on');
    if (offersTab) offersTab.classList.add('on');
  }
}

let adsBannerSlide = 0, adsBannerRafId = null, adsBannerRafStart = 0;
const ADS_BANNER_DURATION = 5000;

function renderAds() {
  const wrap = document.getElementById('adsBannerWrap');
  if (!wrap) return;
  const active = ads.filter(function(a) {
    if (a.status !== 'active') return false;
    if (a.target === 'both') return true;
    if (!buyerMode) return true;
    return a.target === buyerMode;
  }).sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
  if (!active.length) { wrap.innerHTML = ''; return; }
  _renderAdSlides(active, wrap);
}

function _renderAdSlides(slides, wrap) {
  cancelAnimationFrame(adsBannerRafId);
  adsBannerSlide = 0;
  var icons = ['🎯','📣','🔥','💎','🚀'];
  var targetLabel = { retail:'🛍️ مفرد', wholesale:'📦 جملة', both:'' };
  var slidesHtml = slides.map(function(ad, i) {
    var imgHtml = ad.img
      ? '<img class="offer-slide-img" src="' + esc(ad.img) + '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="offer-slide-icon">' + icons[ad.color] + '</div>';
    var valHtml = '';
    if (ad.btnText) {
      valHtml = '<div class="offer-slide-val" style="font-size:.8rem;padding:6px 12px;background:rgba(255,255,255,.22);border-radius:20px;white-space:nowrap">' + esc(ad.btnText) + '</div>';
    } else if (ad.target !== 'both') {
      valHtml = '<div class="offer-slide-val" style="font-size:.75rem">' + (targetLabel[ad.target] || '') + '</div>';
    }
    var clickAttr = ad.link ? 'onclick="window.open(\'' + esc(ad.link) + '\',\'_blank\')"' : '';
    var subtitleHtml = ad.subtitle ? '<div class="offer-slide-desc">' + esc(ad.subtitle) + '</div>' : '';
    return '<div class="offer-slide offer-slide-' + ad.color + '" style="cursor:' + (ad.link ? 'pointer' : 'default') + '" ' + clickAttr + '>'
      + imgHtml
      + '<div class="offer-slide-text"><div class="offer-slide-title">' + esc(ad.title) + '</div>' + subtitleHtml + '</div>'
      + '<div style="flex-shrink:0;text-align:center">' + valHtml + '</div>'
      + '</div>';
  }).join('');

  var navBtns = slides.length > 1 ? '<button class="offers-banner-btn prev" onclick="adsNav(-1)">›</button><button class="offers-banner-btn next" onclick="adsNav(1)">‹</button>' : '';
  var dotsHtml = slides.length > 1 ? '<div class="offers-dots" id="adsDots">' + slides.map(function(_, i) { return '<button class="offers-dot ' + (i === 0 ? 'on' : '') + '" onclick="adsGoTo(' + i + ')"></button>'; }).join('') + '</div>' : '';

  wrap.innerHTML = '<div class="ads-banner"><div class="ads-banner-track" id="adsTrack">' + slidesHtml + '</div>' + navBtns + '<div class="offers-banner-progress"><div class="offers-banner-progress-fill" id="adsProgressFill"></div></div></div>' + dotsHtml;

  var track = document.getElementById('adsTrack');
  if (track && slides.length > 1) {
    var sx = 0;
    track.addEventListener('touchstart', function(e) { sx = e.touches[0].clientX; }, {passive:true});
    track.addEventListener('touchend', function(e) {
      var diff = sx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) adsNav(diff > 0 ? 1 : -1);
    }, {passive:true});
  }
  if (slides.length > 1) _startAdsBannerProgress();
}

function _startAdsBannerProgress() {
  cancelAnimationFrame(adsBannerRafId);
  adsBannerRafStart = performance.now();
  function tick(now) {
    var fill = document.getElementById('adsProgressFill');
    if (!fill) return;
    var pct = Math.min(100, (now - adsBannerRafStart) / ADS_BANNER_DURATION * 100);
    fill.style.width = pct + '%';
    if (pct < 100) { adsBannerRafId = requestAnimationFrame(tick); }
    else { adsNav(1); }
  }
  adsBannerRafId = requestAnimationFrame(tick);
}

function adsNav(dir) {
  var track = document.getElementById('adsTrack');
  if (!track) return;
  var total = track.children.length;
  adsBannerSlide = (adsBannerSlide + dir + total) % total;
  track.style.transform = 'translateX(' + (adsBannerSlide * -100) + '%)';
  document.querySelectorAll('#adsDots .offers-dot').forEach(function(d, i) { d.classList.toggle('on', i === adsBannerSlide); });
  _startAdsBannerProgress();
}

function adsGoTo(idx) {
  var track = document.getElementById('adsTrack');
  if (!track) return;
  var total = track.children.length;
  adsBannerSlide = ((idx % total) + total) % total;
  track.style.transform = 'translateX(' + (adsBannerSlide * -100) + '%)';
  document.querySelectorAll('#adsDots .offers-dot').forEach(function(d, i) { d.classList.toggle('on', i === adsBannerSlide); });
  _startAdsBannerProgress();
}

// ── إدارة الإعلانات (أدمن) ──────────────────────────

function renderAdsManage() {
  var list = document.getElementById('adsList');
  if (!list) return;

  // ── إخفاء/إظهار زر الإضافة حسب الصلاحية ──
  var addWrap = document.getElementById('adAddBtnWrap');
  if (addWrap) addWrap.style.display = _isAdAdmin() ? 'flex' : 'none';

  var active = ads.filter(function(a) { return a.status === 'active'; });
  var retail = ads.filter(function(a) { return a.target === 'retail' || a.target === 'both'; });
  var whole = ads.filter(function(a) { return a.target === 'wholesale' || a.target === 'both'; });
  var kpis = { adKpiAll: ads.length, adKpiActive: active.length, adKpiRetail: retail.length, adKpiWhole: whole.length };
  Object.keys(kpis).forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = kpis[id]; });

  if (!ads.length) { list.innerHTML = '<div style="text-align:center;color:rgba(9,50,87,.4);padding:32px">لا يوجد إعلانات بعد</div>'; return; }
  var targetLabel = { retail:'🛍️ مفرد فقط', wholesale:'📦 جملة فقط', both:'🌐 الجميع' };
  var icons = ['🎯','📣','🔥','💎','🚀'];
  list.innerHTML = ads.slice().sort(function(a,b){ return (a.order||0)-(b.order||0); }).map(function(ad) {
    var imgEl = ad.img
      ? '<img src="' + esc(ad.img) + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px" onerror="this.style.display=\'none\'">'
      : icons[ad.color];
    var statusStyle = ad.status === 'active' ? 'background:rgba(13,148,136,.1);color:var(--teal2)' : 'background:rgba(244,63,94,.08);color:#e11d48';
    var statusTxt = ad.status === 'active' ? '● نشط' : '● موقف';
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1.5px solid rgba(0,0,0,.08);border-radius:var(--r16);margin-bottom:9px;background:rgba(255,255,255,.7)">'
      + '<div class="offer-slide-' + ad.color + '" style="width:44px;height:44px;border-radius:var(--r8);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.4rem">' + imgEl + '</div>'
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-weight:800;color:var(--deep);font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(ad.title) + '</div>'
        + '<div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">'
          + '<span style="font-size:.7rem;padding:2px 8px;border-radius:99px;font-weight:700;' + statusStyle + '">' + statusTxt + '</span>'
          + '<span style="font-size:.7rem;padding:2px 8px;border-radius:99px;background:rgba(9,50,87,.07);color:var(--mid);font-weight:700">' + (targetLabel[ad.target] || ad.target) + '</span>'
        + '</div>'
      + '</div>'
      + (_isAdAdmin() ? '<div style="display:flex;gap:6px;flex-shrink:0">'
        + '<button class="btn btn-ghost btn-sm" onclick="editAd(\'' + ad._id + '\')">✏️</button>'
        + '<button class="btn btn-sm" style="background:rgba(244,63,94,.08);color:#e11d48;border:1px solid rgba(244,63,94,.18)" onclick="deleteAd(\'' + ad._id + '\')">🗑️</button>'
      + '</div>' : '')
      + '</div>';
  }).join('');
}

function _isAdAdmin() {
  return CU && (CU.type === 'admin' || CU.type === 'sales_manager');
}

function openAddAd() {
  if (!_isAdAdmin()) { toast('🚫 غير مصرح لك بإضافة إعلانات', false); return; }
  document.getElementById('adModalTitle').textContent = 'إضافة إعلان';
  ['ad_title','ad_subtitle','ad_img','ad_link','ad_btn'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('ad_target').value = 'both';
  document.getElementById('ad_color').value = '0';
  document.getElementById('ad_order').value = ads.length;
  document.getElementById('ad_status').value = 'active';
  document.getElementById('ad_fbid').value = '';
  openModal('adModal');
}

function editAd(id) {
  if (!_isAdAdmin()) { toast('🚫 غير مصرح لك بتعديل الإعلانات', false); return; }
  var ad = ads.find(function(a) { return a._id === id; });
  if (!ad) return;
  document.getElementById('adModalTitle').textContent = 'تعديل الإعلان';
  document.getElementById('ad_title').value = ad.title;
  document.getElementById('ad_subtitle').value = ad.subtitle;
  document.getElementById('ad_target').value = ad.target;
  document.getElementById('ad_color').value = ad.color;
  document.getElementById('ad_img').value = ad.img;
  document.getElementById('ad_link').value = ad.link;
  document.getElementById('ad_btn').value = ad.btnText;
  document.getElementById('ad_order').value = ad.order;
  document.getElementById('ad_status').value = ad.status;
  document.getElementById('ad_fbid').value = ad._id;
  openModal('adModal');
}

async function saveAd() {
  if (!_isAdAdmin()) { toast('🚫 غير مصرح لك', false); return; }
  var title = document.getElementById('ad_title').value.trim();
  if (!title) { toast('⚠️ العنوان مطلوب', false); return; }
  var data = {
    title:    title,
    subtitle: document.getElementById('ad_subtitle').value.trim(),
    target:   document.getElementById('ad_target').value,
    color:    parseInt(document.getElementById('ad_color').value) || 0,
    img:      document.getElementById('ad_img').value.trim(),
    link:     document.getElementById('ad_link').value.trim(),
    btnText:  document.getElementById('ad_btn').value.trim(),
    order:    parseInt(document.getElementById('ad_order').value) || 0,
    status:   document.getElementById('ad_status').value,
  };
  var fbid = document.getElementById('ad_fbid').value;
  try {
    if (fbid) {
      await fbUpdate('ads', fbid, data);
      var idx = ads.findIndex(function(a) { return a._id === fbid; });
      if (idx >= 0) ads[idx] = Object.assign({ _id: fbid }, data);
    } else {
      var newId = await fbAdd('ads', data);
      ads.push(Object.assign({ _id: newId }, data));
    }
    closeModal('adModal');
    renderAds();
    renderAdsManage();
    toast('✅ تم حفظ الإعلان');
  } catch(e) { toast('❌ خطأ في الحفظ', false); console.error(e); }
}

async function deleteAd(id) {
  if (!_isAdAdmin()) { toast('🚫 غير مصرح لك بالحذف', false); return; }
  if (!confirm('حذف الإعلان؟')) return;
  try {
    await fbDel('ads', id);
    ads = ads.filter(function(a) { return a._id !== id; });
    renderAds();
    renderAdsManage();
    toast('🗑️ تم الحذف');
  } catch(e) { toast('❌ خطأ في الحذف', false); }
}
