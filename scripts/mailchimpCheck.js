// scripts/mailchimp-sanity.cjs
require('dotenv').config();
const dns = require('dns').promises;
const crypto = require('crypto');
const mailchimp = require('@mailchimp/mailchimp_marketing');

function maskKey(key) {
  if (!key) return '(missing)';
  const [id, dc] = key.split('-');
  return id ? `${id.slice(0, 4)}…${id.slice(-4)}-${dc || '??'}` : '(invalid)';
}
function apiKeyDc(key) {
  return (key || '').split('-')[1] || '';
}
function md5Lower(s) {
  return crypto.createHash('md5').update(String(s).trim().toLowerCase()).digest('hex');
}

async function main() {
  const {
    MAILCHIMP_API_KEY,
    MAILCHIMP_SERVER_PREFIX,
    MAILCHIMP_LIST_ID,
    MAILCHIMP_DOUBLE_OPT_IN,
    TEST_EMAIL, // optional: set to test upsert
  } = process.env;

  const server = MAILCHIMP_SERVER_PREFIX || apiKeyDc(MAILCHIMP_API_KEY);

  // 0) Print what we think we're using (masked)
  console.log('--- Mailchimp Sanity Check ---');
  console.log('[env] API key      :', maskKey(MAILCHIMP_API_KEY));
  console.log('[env] server prefix:', server || '(missing)');
  console.log('[env] list id      :', MAILCHIMP_LIST_ID || '(missing)');
  console.log('[env] test email   :', TEST_EMAIL ? TEST_EMAIL : '(not set)');

  // 1) Basic validation
  if (!MAILCHIMP_API_KEY) {
    console.error('❌ Missing MAILCHIMP_API_KEY in .env');
    process.exit(1);
  }
  if (!server) {
    console.error('❌ Could not determine server prefix. Set MAILCHIMP_SERVER_PREFIX or use an API key with -usXX suffix.');
    process.exit(1);
  }

  // 2) DNS sanity
  const host = `${server}.api.mailchimp.com`;
  try {
    const res = await dns.lookup(host);
    console.log(`✅ DNS OK for ${host} -> ${res.address}`);
  } catch (e) {
    console.error(`❌ DNS lookup failed for ${host}:`, e.message);
    process.exit(1);
  }

  // 3) Configure SDK
  mailchimp.setConfig({ apiKey: MAILCHIMP_API_KEY, server });

  // 4) Ping API
  try {
    const pong = await mailchimp.ping.get();
    console.log('✅ API ping OK:', pong);
  } catch (e) {
    console.error('❌ API ping error:', e?.response?.body || e.message);
    process.exit(1);
  }

  // 5) List all audiences
  let lists;
  try {
    const resp = await mailchimp.lists.getAllLists({ count: 1000 }); // up to 1000
    lists = resp.lists || [];
    console.log(`✅ Found ${lists.length} audience(s):`);
    for (const l of lists) {
      console.log(`   • ${l.id}  —  ${l.name}`);
    }
  } catch (e) {
    console.error('❌ Could not fetch audiences:', e?.response?.body || e.message);
    process.exit(1);
  }

  // 6) Verify configured list id
  if (!MAILCHIMP_LIST_ID) {
    console.warn('⚠️  MAILCHIMP_LIST_ID not set. Pick one from the list above and add it to .env');
  } else {
    const match = lists.find(l => l.id === MAILCHIMP_LIST_ID);
    if (!match) {
      console.error('❌ MAILCHIMP_LIST_ID does not match any list in this account/region.');
      console.error('   Make sure you are using the **List ID** (not the audience name).');
      process.exit(1);
    }
    console.log(`✅ Configured list id is valid: ${MAILCHIMP_LIST_ID} (${match.name})`);
  }

  // 7) Optional upsert test
  if (TEST_EMAIL && MAILCHIMP_LIST_ID) {
    const email = TEST_EMAIL.trim().toLowerCase();
    const hash = md5Lower(email);
    const status_if_new = (String(MAILCHIMP_DOUBLE_OPT_IN).toLowerCase() === 'true') ? 'pending' : 'subscribed';

    try {
      await mailchimp.lists.setListMember(MAILCHIMP_LIST_ID, hash, {
        email_address: email,
        status: 'subscribed',      // re-subscribe if archived
        status_if_new,             // pending if double opt-in
        // merge_fields: { FNAME: 'Tester' }, // optional
      });
      console.log(`✅ Upsert OK for ${email} into list ${MAILCHIMP_LIST_ID}`);
    } catch (e) {
      const body = e?.response?.body;
      console.error('❌ Upsert error:', {
        status: body?.status,
        title: body?.title,
        detail: body?.detail,
        instance: body?.instance,
      });
      process.exit(1);
    }
  }

  console.log('🎉 Sanity check completed.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
