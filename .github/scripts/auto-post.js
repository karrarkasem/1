/**
 * auto-post.js — برجمان Auto-Post Engine
 * Reads credentials from Firestore `settings/social_accounts`
 * Posts to: Facebook, Instagram, Telegram, WhatsApp, TikTok, Snapchat
 * Runs every 15 min via GitHub Actions cron
 */

const admin  = require('firebase-admin');
const fetch  = require('node-fetch');
const FormData = require('form-data');

// ── Firebase Admin ─────────────────────────────────
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey
  })
});
const db     = admin.firestore();
const DRY    = process.env.DRY_RUN === 'true';

// ── Load social credentials + company info ─────────
let CREDS = {};
let COMPANY = {};
async function loadCredentials() {
  const [credsSnap, compSnap] = await Promise.all([
    db.collection('settings').doc('social_accounts').get(),
    db.collection('settings').doc('company').get()
  ]);
  CREDS   = credsSnap.exists ? credsSnap.data() : {};
  COMPANY = compSnap.exists  ? compSnap.data()  : {};
  console.log('[creds] Loaded fields:', Object.keys(CREDS).filter(k => CREDS[k]).join(', ') || 'none');
}

// ── Build post text ────────────────────────────────
function buildPostText(product, productUrl) {
  const wa  = COMPANY.whatsapp_number || COMPANY.company_whatsapp || '';
  const cat = product.category || '';
  const L   = [];
  L.push(`🛍️ ${product.name}${cat ? ' — ' + cat : ''}`);
  if (product.carton_weight) L.push(`⚖️ وزن الكرتون: ${product.carton_weight} كغ`);
  if (product.carton_l && product.carton_w && product.carton_h) L.push(`📏 الأبعاد: ${product.carton_l}×${product.carton_w}×${product.carton_h} سم`);
  if (product.carton_volume) L.push(`📐 الحجم الكتلي: ${product.carton_volume} م³`);
  if (product.detail)        { L.push(''); L.push(`📝 ${product.detail}`); }
  L.push('');
  L.push('💬 للاستفسار عن الأسعار والتوفر تواصل معنا:');
  if (wa) { L.push('📞 واتساب: '); L.push(`wa.me/${wa}`); }
  L.push('');
  L.push('مشاهدة المنتج :');
  L.push(`🔗 ${productUrl}`);
  const tags = [];
  if (cat) tags.push(`#${cat.replace(/\s+/g, '')}`);
  tags.push('#شركةبرجمان', '#تسوق_الان', '#العراق');
  L.push(tags.join(' '));
  return L.join('\n');
}

// ════════════════════════════════════════════════════
// FACEBOOK — Graph API v19
// ════════════════════════════════════════════════════
async function postFacebook(item) {
  const token  = CREDS.fb_access_token;
  const pageId = CREDS.fb_page_id;
  if (!token || !pageId) return skip('Facebook', 'missing credentials');

  const caption = item.postText || item.productName || '';
  const ct = item.contentType || 'post';

  // ── Story ───────────────────────────────────────
  if (ct === 'story') {
    if (!item.productImage) return skip('Facebook', 'story requires an image');
    // Step 1: upload photo as story
    const p1 = new URLSearchParams({ url: item.productImage, access_token: token });
    const r1 = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photo_stories`, {
      method: 'POST', body: p1
    });
    const j1 = await r1.json();
    if (j1.id) return ok('Facebook', j1.id);
    return fail('Facebook', 'story: ' + (j1.error?.message || JSON.stringify(j1)));
  }

  // ── Post (default) ──────────────────────────────
  if (item.productImage) {
    const params = new URLSearchParams({ caption, url: item.productImage, access_token: token });
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      method: 'POST', body: params
    });
    const j = await res.json();
    if (j.id) return ok('Facebook', j.id);
    return fail('Facebook', j.error?.message || JSON.stringify(j));
  } else {
    const params = new URLSearchParams({ message: caption, link: item.productUrl || '', access_token: token });
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST', body: params
    });
    const j = await res.json();
    if (j.id) return ok('Facebook', j.id);
    return fail('Facebook', j.error?.message || JSON.stringify(j));
  }
}

// ════════════════════════════════════════════════════
// INSTAGRAM — Graph API (Content Publishing)
// ════════════════════════════════════════════════════
async function postInstagram(item) {
  const token  = CREDS.ig_access_token;
  const igId   = CREDS.ig_account_id;
  if (!token || !igId) return skip('Instagram', 'missing credentials');
  if (!item.productImage) return skip('Instagram', 'image required for IG');

  const ct = item.contentType || 'post';

  // Step 1: Create media container
  const containerData = {
    image_url:    item.productImage,
    caption:      (item.postText || '').slice(0, 2200),
    access_token: token
  };

  // Story uses different media_type
  if (ct === 'story') {
    containerData.media_type = 'STORIES';
  }

  const r1 = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
    method: 'POST', body: new URLSearchParams(containerData)
  });
  const j1 = await r1.json();
  if (!j1.id) return fail('Instagram', j1.error?.message || JSON.stringify(j1));

  await sleep(3000);

  // Step 2: Publish
  const r2 = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
    method: 'POST', body: new URLSearchParams({ creation_id: j1.id, access_token: token })
  });
  const j2 = await r2.json();
  if (j2.id) return ok('Instagram', j2.id);
  return fail('Instagram', j2.error?.message || JSON.stringify(j2));
}

// ════════════════════════════════════════════════════
// TELEGRAM — Bot API
// ════════════════════════════════════════════════════
async function postTelegram(item) {
  const token   = CREDS.tg_bot_token;
  const channel = CREDS.tg_channel_id;
  if (!token || !channel) return skip('Telegram', 'missing credentials');

  const base    = `https://api.telegram.org/bot${token}`;
  const caption = (item.postText || item.productName || '').slice(0, 1024);

  if (item.productImage) {
    const res = await fetch(`${base}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: channel, photo: item.productImage, caption })
    });
    const j = await res.json();
    return j.ok ? ok('Telegram', j.result?.message_id) : fail('Telegram', j.description);
  } else {
    const res = await fetch(`${base}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: channel, text: (item.postText || '').slice(0, 4096) })
    });
    const j = await res.json();
    return j.ok ? ok('Telegram', j.result?.message_id) : fail('Telegram', j.description);
  }
}

// ════════════════════════════════════════════════════
// WHATSAPP — Cloud API (message to specific number)
// ════════════════════════════════════════════════════
async function postWhatsApp(item) {
  const token   = CREDS.wa_access_token;
  const phoneId = CREDS.wa_phone_id;
  const toNum   = CREDS.wa_to_number;
  if (!token || !phoneId || !toNum) return skip('WhatsApp', 'missing credentials');

  const body = item.productImage
    ? {
        messaging_product: 'whatsapp',
        to:   toNum,
        type: 'image',
        image: {
          link:    item.productImage,
          caption: (item.postText || '').slice(0, 1024)
        }
      }
    : {
        messaging_product: 'whatsapp',
        to:   toNum,
        type: 'text',
        text: { body: (item.postText || '').slice(0, 4096) }
      };

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  const j = await res.json();
  if (j.messages?.[0]?.id) return ok('WhatsApp', j.messages[0].id);
  return fail('WhatsApp', j.error?.message || JSON.stringify(j));
}

// ════════════════════════════════════════════════════
// TIKTOK — Content Posting API (video only)
// ════════════════════════════════════════════════════
async function postTikTok(item) {
  const token  = CREDS.tt_access_token;
  const openId = CREDS.tt_open_id;
  if (!token || !openId) return skip('TikTok', 'missing credentials');
  // TikTok only supports video via API — images not supported yet
  return skip('TikTok', 'TikTok API supports video only; image posts not yet available via API');
}

// ════════════════════════════════════════════════════
// SNAPCHAT — No organic posting API available
// ════════════════════════════════════════════════════
async function postSnapchat(item) {
  return skip('Snapchat', 'No organic posting API — Snapchat only supports paid ads via API');
}

// ════════════════════════════════════════════════════
// PLATFORM ROUTER
// ════════════════════════════════════════════════════
const POSTER = {
  facebook:  postFacebook,
  instagram: postInstagram,
  telegram:  postTelegram,
  whatsapp:  postWhatsApp,
  tiktok:    postTikTok,
  snapchat:  postSnapchat
};

// ════════════════════════════════════════════════════
// REPEAT LOGIC — reschedule after posting
// ════════════════════════════════════════════════════
async function rescheduleIfNeeded(docRef, item) {
  const repeat = item.repeat;
  if (!repeat || repeat === 'none') return;

  const prev = item.scheduledAt.toDate();
  let next = new Date(prev);
  if (repeat === 'daily')   next.setDate(next.getDate() + 1);
  if (repeat === 'weekly')  next.setDate(next.getDate() + 7);
  if (repeat === 'monthly') next.setMonth(next.getMonth() + 1);

  const { _id, postResults, postedAt, postedPlatforms, failedPlatforms, processedAt, ...rest } = item;
  await db.collection('automated_queue').add({
    ...rest,
    scheduledAt: admin.firestore.Timestamp.fromDate(next),
    status:      'pending',
    createdAt:   admin.firestore.Timestamp.now(),
    attempts:    0,
    parentId:    docRef.id
  });
  console.log(`  → Rescheduled (${repeat}) for ${next.toISOString()}`);
}

// ════════════════════════════════════════════════════
// ROTATION — auto-cycle through category products
// ════════════════════════════════════════════════════
async function handleRotation(docSnap, item) {
  // 1. Load products in category
  const snap = await db.collection('products')
    .where('category', '==', item.category)
    .get();

  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.name && p.status !== 'hidden')
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

  if (!products.length) {
    await docSnap.ref.update({ status: 'failed', error: 'لا توجد منتجات في الفئة' });
    console.log('  [rotation] No products in category:', item.category);
    return;
  }

  // 2. Find next product after lastProductId
  let nextIdx = 0;
  if (item.lastProductId) {
    const lastIdx = products.findIndex(p => p.id === item.lastProductId);
    nextIdx = (lastIdx + 1) % products.length;
  }
  const product = products[nextIdx];
  console.log(`  [rotation] Category: ${item.category} | Product ${nextIdx+1}/${products.length}: ${product.name}`);

  // 3. Build post text
  const storeUrl  = 'https://brjman.com';
  const productUrl = `${storeUrl}/product.html?id=${product.id}`;

  const postItem = {
    ...item,
    productId:    product.id,
    productName:  product.name,
    productImage: product.image || '',
    productUrl:   productUrl,
    postText:     buildPostText(product, productUrl),
  };

  // 4. Post to platforms
  await docSnap.ref.update({ status: 'processing', processedAt: admin.firestore.Timestamp.now() });

  const results = {};
  for (const platform of (item.platforms || [])) {
    try {
      const poster = POSTER[platform];
      results[platform] = poster ? await poster(postItem) : skip(platform, 'unknown');
      console.log(`  [${platform}] ${JSON.stringify(results[platform])}`);
    } catch (err) {
      results[platform] = fail(platform, err.message);
    }
    await sleep(1000);
  }

  const posted = Object.values(results).filter(r => r.ok).map(r => r.platform);
  const failed = Object.values(results).filter(r => !r.ok && !r.skipped).map(r => r.platform);

  // 5. Schedule next run
  const nextMs   = (item.intervalHours || 24) * 3600 * 1000;
  const nextTime = new Date(Date.now() + nextMs);

  await docSnap.ref.update({
    status:          'pending',   // keep active for next cycle
    scheduledAt:     admin.firestore.Timestamp.fromDate(nextTime),
    lastProductId:   product.id,
    lastProductName: product.name,
    lastPostedAt:    admin.firestore.Timestamp.now(),
    lastResults:     results,
    postedPlatforms: posted,
    failedPlatforms: failed,
    attempts:        admin.firestore.FieldValue.increment(1),
  });
  console.log(`  → rotation done | ✅ ${posted.join(',')||'none'} | ❌ ${failed.join(',')||'none'} | next: ${nextTime.toISOString()}`);
}

// ════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════
async function main() {
  console.log(`\n🤖 برجمان Auto-Post — ${new Date().toISOString()} | DRY_RUN=${DRY}`);
  await loadCredentials();

  const now  = admin.firestore.Timestamp.now();
  const snap = await db.collection('automated_queue')
    .where('status', '==', 'pending')
    .where('scheduledAt', '<=', now)
    .orderBy('scheduledAt', 'asc')
    .limit(20)
    .get();

  if (snap.empty) { console.log('✅ No pending posts.'); return; }
  console.log(`📬 Found ${snap.size} post(s) to process.\n`);

  for (const docSnap of snap.docs) {
    const item = { _id: docSnap.id, ...docSnap.data() };
    console.log(`▶️  [${item._id}] ${item.productName} → platforms: ${(item.platforms||[]).join(', ')}`);

    // ── Rotation item ──────────────────────────────
    if (item.type === 'rotation') {
      if (DRY) { console.log('  [DRY] rotation:', item.category, 'interval:', item.intervalHours+'h'); continue; }
      await handleRotation(docSnap, item);
      continue;
    }

    // ── جلب بيانات المنتج من Firestore ────────────
    if (item.productId) {
      try {
        const prodSnap = await db.collection('products').doc(item.productId).get();
        if (prodSnap.exists) {
          const prod = prodSnap.data();
          if (prod.image) item.productImage = prod.image;
          // إعادة بناء النص دائماً من بيانات المنتج الحالية
          const prodUrl = item.productUrl || `https://brjman.com/product.html?id=${item.productId}`;
          item.postText = buildPostText(prod, prodUrl);
          console.log(`  [img+text] Fetched from products/${item.productId}`);
        }
      } catch (e) {
        console.warn('  [product] Could not fetch:', e.message);
      }
    }

    if (DRY) {
      console.log('  [DRY] Would post:', JSON.stringify({ platforms: item.platforms, image: item.productImage||'none', text: (item.postText||'').slice(0,60)+'...' }));
      continue;
    }

    // Lock item
    await docSnap.ref.update({ status: 'processing', processedAt: admin.firestore.Timestamp.now() });

    const results = {};
    for (const platform of (item.platforms || [])) {
      try {
        const poster = POSTER[platform];
        if (poster) {
          results[platform] = await poster(item);
        } else {
          results[platform] = skip(platform, 'unknown platform');
        }
        console.log(`  [${platform}] ${JSON.stringify(results[platform])}`);
      } catch (err) {
        results[platform] = fail(platform, err.message);
        console.error(`  [${platform}] Error:`, err.message);
      }
      await sleep(1000);
    }

    const posted = Object.values(results).filter(r => r.ok).map(r => r.platform);
    const failed = Object.values(results).filter(r => !r.ok && !r.skipped).map(r => r.platform);
    const status = posted.length > 0 ? 'posted' : 'failed';

    await docSnap.ref.update({
      status,
      postedAt:        admin.firestore.Timestamp.now(),
      postResults:     results,
      postedPlatforms: posted,
      failedPlatforms: failed,
      attempts:        admin.firestore.FieldValue.increment(1)
    });

    console.log(`  → ${status.toUpperCase()} | ✅ ${posted.join(',')||'none'} | ❌ ${failed.join(',')||'none'}`);

    // Repeat scheduling
    if (status === 'posted') {
      await rescheduleIfNeeded(docSnap.ref, item);
    }
  }
  console.log('\n✅ Done.');
}

// ── Result helpers ─────────────────────────────────
const ok   = (platform, id)  => ({ ok: true,  skipped: false, platform, id: String(id) });
const fail = (platform, err) => ({ ok: false, skipped: false, platform, error: String(err) });
const skip = (platform, why) => ({ ok: false, skipped: true,  platform, reason: why });
const sleep = ms => new Promise(r => setTimeout(r, ms));

main().catch(err => { console.error('💥 Fatal:', err); process.exit(1); });
