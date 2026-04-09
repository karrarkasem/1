/**
 * auto-post.js — GitHub Actions script for automated social media posting
 * Checks Firestore `automated_queue` for pending posts whose scheduledAt has passed,
 * then publishes to Facebook and/or Telegram.
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// ── Firebase Admin init ────────────────────────────────
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey
  })
});

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN === 'true';

// ── Facebook ───────────────────────────────────────────
const FB_TOKEN   = process.env.FB_PAGE_ACCESS_TOKEN || '';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';

async function postToFacebook(item) {
  if (!FB_TOKEN || !FB_PAGE_ID) {
    console.warn('[Facebook] Missing FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID — skipping');
    return { ok: false, error: 'missing credentials' };
  }

  const url = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`;
  const body = new URLSearchParams();
  body.append('caption', item.postText || item.productName || '');
  body.append('access_token', FB_TOKEN);

  // If product has an image URL, attach it; otherwise use feed endpoint
  if (item.productImage) {
    body.append('url', item.productImage);
    const res = await fetch(url, { method: 'POST', body });
    const json = await res.json();
    if (json.id) return { ok: true, id: json.id };
    return { ok: false, error: JSON.stringify(json.error || json) };
  } else {
    // Text-only post via /feed
    const feedUrl = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`;
    const feedBody = new URLSearchParams();
    feedBody.append('message', item.postText || '');
    feedBody.append('link', item.productUrl || '');
    feedBody.append('access_token', FB_TOKEN);
    const res = await fetch(feedUrl, { method: 'POST', body: feedBody });
    const json = await res.json();
    if (json.id) return { ok: true, id: json.id };
    return { ok: false, error: JSON.stringify(json.error || json) };
  }
}

// ── Telegram ───────────────────────────────────────────
const TG_TOKEN   = process.env.TG_BOT_TOKEN || '';
const TG_CHANNEL = process.env.TG_CHANNEL_ID || '';

async function postToTelegram(item) {
  if (!TG_TOKEN || !TG_CHANNEL) {
    console.warn('[Telegram] Missing TG_BOT_TOKEN or TG_CHANNEL_ID — skipping');
    return { ok: false, error: 'missing credentials' };
  }

  const caption = item.postText || item.productName || '';
  const apiBase = `https://api.telegram.org/bot${TG_TOKEN}`;

  if (item.productImage) {
    // Send photo with caption
    const res = await fetch(`${apiBase}/sendPhoto`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHANNEL,
        photo:   item.productImage,
        caption: caption.slice(0, 1024), // Telegram caption limit
        parse_mode: 'HTML'
      })
    });
    const json = await res.json();
    return json.ok ? { ok: true, id: json.result?.message_id } : { ok: false, error: json.description };
  } else {
    // Text only
    const res = await fetch(`${apiBase}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    TG_CHANNEL,
        text:       caption.slice(0, 4096),
        parse_mode: 'HTML'
      })
    });
    const json = await res.json();
    return json.ok ? { ok: true, id: json.result?.message_id } : { ok: false, error: json.description };
  }
}

// ── Main ───────────────────────────────────────────────
async function main() {
  const now = admin.firestore.Timestamp.now();
  console.log(`[auto-post] Starting at ${new Date().toISOString()} | DRY_RUN=${DRY_RUN}`);

  // Fetch pending items whose scheduledAt <= now
  const snap = await db.collection('automated_queue')
    .where('status', '==', 'pending')
    .where('scheduledAt', '<=', now)
    .orderBy('scheduledAt', 'asc')
    .limit(20)
    .get();

  if (snap.empty) {
    console.log('[auto-post] No pending posts found.');
    return;
  }

  console.log(`[auto-post] Found ${snap.size} post(s) to process.`);

  for (const docSnap of snap.docs) {
    const item = { _id: docSnap.id, ...docSnap.data() };
    console.log(`\n[auto-post] Processing: ${item._id} — ${item.productName}`);

    if (DRY_RUN) {
      console.log('[DRY RUN] Would post:', JSON.stringify({
        platforms: item.platforms,
        text: (item.postText || '').slice(0, 80) + '...',
        image: item.productImage
      }, null, 2));
      continue;
    }

    // Mark as processing
    await docSnap.ref.update({ status: 'processing', processedAt: admin.firestore.Timestamp.now() });

    const results = {};
    const platforms = item.platforms || [];

    // Post to each platform
    for (const platform of platforms) {
      try {
        if (platform === 'facebook') {
          results.facebook = await postToFacebook(item);
          console.log(`  [Facebook] ${JSON.stringify(results.facebook)}`);
        } else if (platform === 'telegram') {
          results.telegram = await postToTelegram(item);
          console.log(`  [Telegram] ${JSON.stringify(results.telegram)}`);
        } else {
          // instagram/whatsapp require dedicated apps — mark as skipped
          results[platform] = { ok: false, error: 'platform_not_supported_via_api' };
          console.log(`  [${platform}] Not supported via API — skipped`);
        }
      } catch (err) {
        results[platform] = { ok: false, error: err.message };
        console.error(`  [${platform}] Error:`, err.message);
      }
    }

    // Determine overall status
    const postedPlatforms = Object.entries(results).filter(([, r]) => r.ok).map(([p]) => p);
    const failedPlatforms = Object.entries(results).filter(([, r]) => !r.ok).map(([p]) => p);
    const overallStatus = postedPlatforms.length > 0 ? 'posted' : 'failed';

    await docSnap.ref.update({
      status:           overallStatus,
      postedAt:         admin.firestore.Timestamp.now(),
      postResults:      results,
      postedPlatforms,
      failedPlatforms,
      attempts:         admin.firestore.FieldValue.increment(1)
    });

    console.log(`  → Status: ${overallStatus} | Posted: ${postedPlatforms.join(', ')} | Failed: ${failedPlatforms.join(', ')}`);

    // Small delay between posts
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n[auto-post] Done.');
}

main().catch(err => {
  console.error('[auto-post] Fatal error:', err);
  process.exit(1);
});
