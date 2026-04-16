// OneZone HFD Polling - Manual Run Script (Node.js)
// Usage: node run_once.js [limit]
// Example: node run_once.js 10   → test: first 10 orders
//          node run_once.js      → full run: all orders

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LIMIT = parseInt(process.argv[2]) || 0;
const STATE_FILE   = path.join(__dirname, 'sent_state.json');
const OPT_OUT_FILE = path.join(__dirname, 'opt_out.json');
const MONDAY_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU1OTAyMjM2MiwiYWFpIjoxMSwidWlkIjo2Mzc3NjA5NywiaWFkIjoiMjAyNS0wOS0wN1QxNTowMToxNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjQ1MzIyMjcsInJnbiI6ImV1YzEifQ.d86GOnxc-RhtZND7Q7LIoIg3ShFUW0xImLCVjRlzXHQ';
const OWNER_PHONE  = '972559662064';

// Load state
let state = {};
if (fs.existsSync(STATE_FILE)) {
  try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch(e) {}
}
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');

// Load opt-out list
let optOut = new Set();
if (fs.existsSync(OPT_OUT_FILE)) {
  try { optOut = new Set(JSON.parse(fs.readFileSync(OPT_OUT_FILE, 'utf8'))); } catch(e) {}
}
const addOptOut = (phone) => {
  optOut.add(phone);
  fs.writeFileSync(OPT_OUT_FILE, JSON.stringify([...optOut], null, 2), 'utf8');
};

// Time check: 09:00-20:00 Israel (UTC+3)
const israelHour = (new Date().getUTCHours() + 3) % 24;
if (israelHour < 9 || israelHour >= 20) {
  console.log(`[SKIP] Outside hours. Israel time: ${israelHour}:00. Allowed: 09:00-20:00.`);
  process.exit(0);
}

// HTTP helper
const request = (url, options, body) => new Promise((resolve, reject) => {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.request(url, options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

// Monday.com fetch
const fetchMonday = async (cursor) => {
  const cursorPart = cursor ? `, cursor: "${cursor}"` : '';
  const query = `{ boards(ids: [2131896795]) { items_page(limit: 500${cursorPart}) { cursor items { id name column_values { id text } } } } }`;
  const body = JSON.stringify({ query });
  const data = await request('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Authorization': MONDAY_TOKEN, 'Content-Type': 'application/json', 'API-Version': '2023-10', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  return JSON.parse(data).data.boards[0].items_page;
};

// HFD fetch
const fetchHFD = (tracking) => new Promise((resolve, reject) => {
  const body = `client_id=8260&tracking_id=${tracking}&ref=ALL&lang=he`;
  const req = https.request('https://ws.hfd.co.il/Epost-Tracking/service.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve(data));
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

// XML tag extractor (strips CDATA wrappers)
const getTag = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
};

// Send via JONI
const sendJoni = (phone, message) => new Promise((resolve, reject) => {
  const body = JSON.stringify({ to: phone, text: message });
  const bytes = Buffer.from(body, 'utf8');
  const req = https.request('https://joni-e746b-default-rtdb.europe-west1.firebasedatabase.app//joni/send.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': bytes.length }
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve(data));
  });
  req.on('error', reject);
  req.write(bytes);
  req.end();
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Hebrew name transliteration lookup (common names in Israeli orders)
const nameHebrew = {
  'david': 'דוד', 'david': 'דוד', 'dana': 'דנה', 'daniel': 'דניאל', 'dina': 'דינה', 'dora': 'דורה',
  'moshe': 'משה', 'michael': 'מיכאל', 'michel': 'מיכאל', 'maria': 'מריה', 'maya': 'מאיה', 'mia': 'מיה',
  'yossi': 'יוסי', 'yosef': 'יוסף', 'yael': 'יעל', 'yuval': 'יובל',
  'avi': 'אבי', 'avraham': 'אברהם', 'amir': 'אמיר', 'amit': 'עמית', 'ayala': 'איילה',
  'noa': 'נועה', 'noam': 'נועם', 'nir': 'ניר',
  'ron': 'רון', 'roni': 'רוני', 'rachel': 'רחל', 'rivka': 'רבקה',
  'sara': 'שרה', 'sarah': 'שרה', 'sharon': 'שרון', 'shira': 'שירה', 'shai': 'שי',
  'tal': 'טל', 'tali': 'טלי', 'tamar': 'תמר',
  'gal': 'גל', 'gali': 'גלי', 'guy': 'גיא',
  'lior': 'ליאור', 'lihi': 'ליהי', 'liat': 'ליאת',
  'hana': 'חנה', 'hannah': 'חנה', 'haim': 'חיים',
  'itai': 'איתי', 'ilan': 'אילן', 'iris': 'אירית',
  'or': 'אור', 'ofir': 'עופר', 'omer': 'עומר',
  'pedro': 'פדרו', 'pablo': 'פבלו', 'carlos': 'קרלוס', 'jose': 'חוסה', 'juan': 'חואן',
  'elena': 'אלנה', 'anna': 'אנה', 'ana': 'אנה', 'natasha': 'נטשה', 'olga': 'אולגה',
  'john': 'ג׳ון', 'james': 'ג׳יימס', 'alex': 'אלכס', 'adam': 'אדם',
};

const toHebrewFirstName = (fullName) => {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  // Already Hebrew
  if (/[\u0590-\u05FF]/.test(first)) return first;
  // Lookup
  const lookup = nameHebrew[first.toLowerCase()];
  if (lookup) return lookup;
  // Unknown — return original
  return first;
};

// Stage messages
const stageMessages = {
  '10':    { h: 'בדרכה לארץ! ✈️',            d: 'זמני האספקה הם 7-21 ימי עסקים מרגע קבלת מספר המעקב, אנו נעדכן אותכם כאן בכל שלב ושלב.' },
  '21':    { h: 'בדרכה לארץ! ✈️',            d: 'זמני האספקה הם 7-21 ימי עסקים מרגע קבלת מספר המעקב, אנו נעדכן אותכם כאן בכל שלב ושלב.' },
  '103':   { h: 'בדרכה לארץ! ✈️',            d: 'זמני האספקה הם 7-21 ימי עסקים מרגע קבלת מספר המעקב, אנו נעדכן אותכם כאן בכל שלב ושלב.' },
  '18':    { h: 'הגיעה לישראל! 🛃',           d: 'החבילה שלך הגיעה לישראל ועוברת בדיקת מכס.\nבדרך כלל לוקח 2-5 ימי עסקים.' },
  '13':    { h: 'עברה מכס בהצלחה! ✅',        d: 'החבילה שלך עברה את המכס ובדרכה למרכז מיון.' },
  '521':   { h: 'במרכז מיון בישראל 📦',       d: 'החבילה שלך הגיעה למרכז המיון — בקרוב תישלח לאיזורך!' },
  '23':    { h: 'בדרך אליך 🚚',               d: 'החבילה שלך ארוזה ומוכנה למסירה.' },
  '48':    { h: 'בדרך אליך 🚚',               d: 'החבילה שלך בדרכה אליך.' },
  '27':    { h: 'יוצאת למסירה עכשיו! 🚚',    d: 'השליח בדרכו אליך היום — שמור על הטלפון פתוח!' },
  '29':    { h: 'מחכה לך בנקודת איסוף 📍',   d: null }, // built dynamically with pudo_details
  '429':   { h: 'מחכה לך בנקודת איסוף 📍',   d: null }, // built dynamically with pudo_details
  '19':    { h: 'עדכון פרטי משלוח 📝',        d: 'בוצע עדכון כתובת/פרטים להזמנה שלך.' },
  '99':    { h: 'נמסרה! 🎉',                  d: null }, // built dynamically with delivery address
  'STUCK': { h: 'עדכון על ההזמנה שלך ⏳',    d: 'ההזמנה שלך מתעכבת מעט יותר מהצפוי.\nאנחנו בודקים מה קורה ונחזור אליך בהקדם.\nמתנצלים על האיחור 🙏' }
};

const SKIP_CODES = new Set(['4','5','6']);
const TRANSIT_CODES = new Set(['10','21','103']);
const REALTIME_CODES = new Set(['18','13','521','23','27','29','429','48','99','19']);
const warNotice = 'בעקבות מבצע שאגת הארי צפויים עיכובים קלים במשלוחים, אנחנו עם יד על הדופק ובודקים מה עם המשלוח שלך בכל יום ויום.\nנא להיות סבלניים 🙏';

(async () => {
  console.log('\n[1/4] Fetching Monday.com orders...');
  const page1 = await fetchMonday(null);
  let allItems = page1.items;
  if (page1.cursor) {
    const page2 = await fetchMonday(page1.cursor);
    allItems = allItems.concat(page2.items);
  }
  console.log(`   Total items: ${allItems.length}`);

  // Parse & filter
  const now = Date.now();
  const START_DATE = new Date('2026-03-01').getTime();
  const MS_24 = 86400000;

  const parseDate = (s) => {
    if (!s) return null;
    if (s.includes('-') && s.split('-')[0].length === 4) return new Date(s);
    if (s.includes('/')) {
      const [d, m, y] = s.split('/');
      return new Date(`20${y.length===2?y:y.slice(2)}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    }
    return null;
  };

  const orders = [];
  for (const item of allItems) {
    const cols = {};
    (item.column_values||[]).forEach(c => { cols[c.id] = (c.text||'').trim(); });
    const d = parseDate(cols['date__1']);
    if (!d || isNaN(d)) continue;
    const ts = d.getTime();
    if (ts < START_DATE) continue;       // before March 1 — skip
    if (now - ts < MS_24) continue;      // less than 24h old — skip
    const tracking = (cols['text__1']||'').replace(/\s/g,'');
    if (!tracking) continue;
    const phone = (cols['phone__1']||'').replace(/[^0-9]/g,'');
    if (phone.length < 9) continue;
    if (/TEST/i.test(item.name)) continue;
    const orderDateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    orders.push({ name: item.name, tracking, phone, orderDate: orderDateStr });
    if (LIMIT > 0 && orders.length >= LIMIT) break;
  }

  console.log(`   Orders eligible: ${orders.length}${LIMIT ? ` (TEST: first ${LIMIT})` : ''}`);

  // Process
  console.log('\n[2/4] Processing orders...\n');
  let sent = 0, skipped = 0, errors = 0;

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    process.stdout.write(`   [${i+1}/${orders.length}] ${order.name} | ${order.tracking}`);

    let xml;
    try { xml = await fetchHFD(order.tracking); }
    catch(e) { console.log(' [HFD ERROR]'); errors++; continue; }

    const shipStages = getTag(xml, 'ship_stages');
    if (!shipStages) { console.log(' [NO STAGES]'); skipped++; continue; }

    const stageMatches = [...shipStages.matchAll(/<stage>([\s\S]*?)<\/stage>/gi)];
    if (!stageMatches.length) { console.log(' [NO STAGES]'); skipped++; continue; }

    const lastStage = stageMatches[stageMatches.length-1][1];
    let code = getTag(lastStage, 'code');
    const stageDate = getTag(lastStage, 'date');
    const stageTime = getTag(lastStage, 'time');
    const regDate = getTag(xml, 'reg_date');

    if (SKIP_CODES.has(code)) { console.log(` [SKIP code=${code}]`); skipped++; continue; }

    // Stuck detection
    if (TRANSIT_CODES.has(code) && regDate) {
      try {
        const [d,m,y] = regDate.trim().split('/');
        const regD = new Date(`20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
        const days = Math.floor((Date.now() - regD.getTime()) / 86400000);
        if (days > 25) {
          const stuckKey = order.tracking + '_stuck';
          if (state[stuckKey]) { console.log(` [STUCK SENT]`); skipped++; continue; }
          state[stuckKey] = true;
          code = 'STUCK';
        }
      } catch(e) {}
    }

    if (state[order.tracking] === code) { console.log(` [NO CHANGE code=${code}]`); skipped++; continue; }

    // Opt-out check
    if (optOut.has(order.phone)) { console.log(` [OPT-OUT]`); skipped++; continue; }

    // Owner alert for stuck packages
    if (code === 'STUCK') {
      const stuckKey = order.tracking + '_owner_alert';
      if (!state[stuckKey]) {
        let days = '25+';
        try {
          const [d,m,y] = regDate.trim().split('/');
          const regD = new Date(`20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
          days = Math.floor((Date.now() - regD.getTime()) / 86400000);
        } catch(e) {}
        const lastUpdate = (stageDate && stageTime) ? `${stageDate} ${stageTime}` : 'לא ידוע';
        const ownerMsg = `\u26a0\ufe0f *OneZone - \u05d7\u05d1\u05d9\u05dc\u05d4 \u05ea\u05e7\u05d5\u05e2\u05d4*\n\n\u05dc\u05e7\u05d5\u05d7: ${order.name}\n\u05d8\u05dc\u05e4\u05d5\u05df: ${order.phone}\n\u05de\u05e2\u05e7\u05d1: ${order.tracking}\n\u05ea\u05d0\u05e8\u05d9\u05da \u05d4\u05d6\u05de\u05e0\u05d4: ${order.orderDate}\n\u05d9\u05de\u05d9\u05dd \u05d1\u05d3\u05e8\u05da: ${days}\n\u05e2\u05d3\u05db\u05d5\u05df \u05d0\u05d7\u05e8\u05d5\u05df \u05de-HFD: ${lastUpdate}\n\n\u05d9\u05e9 \u05dc\u05d1\u05d3\u05d5\u05e7 \u05de\u05d4 \u05e7\u05d5\u05e8\u05d4 \u05e2\u05dd \u05d4\u05de\u05e9\u05dc\u05d5\u05d7.`;
        try { await sendJoni(OWNER_PHONE, ownerMsg); state[stuckKey] = true; saveState(); console.log(' [OWNER ALERT SENT]'); } catch(e) {}
      }
    }

    const info = stageMessages[code];
    if (!info) { console.log(` [UNKNOWN code=${code}]`); skipped++; continue; }

    const dateLine = (stageDate && REALTIME_CODES.has(code)) ? `\nעדכון אחרון: ${stageDate} ${stageTime}` : '';

    // Delivered: show delivery address
    let detail = info.d;
    if (code === '99') {
      const yaadAdd = getTag(xml, 'yaad_add').trim();
      detail = 'ההזמנה שלך נמסרה בהצלחה!\nמקווים שאתה מרוצה — תהנה מהמוצר! ⚽🏆\nנשמח לראות אותך שוב בחנות 😊';
      if (yaadAdd) detail += `\n\n📍 *נמסר לכתובת:* ${yaadAdd}`;
    }

    // Pickup point details for stages 29/429
    if ((code === '29' || code === '429')) {
      const pudoDetails = getTag(xml, 'pudo_details').replace(/<[^>]+>/g, '').trim();
      const pudoHours  = getTag(xml, 'pudo_hours').replace(/<[^>]+>/g, '').trim();
      if (pudoDetails) {
        detail = `החבילה שלך מחכה לאיסוף בנקודה הבאה:\n📍 *${pudoDetails}*`;
        if (pudoHours) detail += `\n🕐 שעות פעילות: ${pudoHours}`;
      } else {
        detail = 'החבילה שלך מחכה לאיסוף בנקודת החלוקה הקרובה אליך.';
      }
    }

    const hfdName = getTag(xml, 'yaad').trim();
    const firstName = toHebrewFirstName(hfdName || order.name);
    const greeting = firstName ? `שלום ${firstName}! 👋\n\n` : '';

    const war = (code !== '99') ? `\n\n${warNotice}` : '';
    const trackingLink = `\n\n🔍 *למעקב עצמאי בכל רגע:* https://www.hfd.co.il/איתור-חבילה/\n_(יש להקליד את מספר המעקב ידנית)_`;
    const message = `*עדכון משלוח | OneZone* 🏆\n\n${greeting}*סטטוס:* ${info.h}\n\n${detail}${dateLine}${war}\n\n*מס׳ מעקב:* ${order.tracking}${trackingLink}\n\n_להפסקת עדכונים שלח STOP_`;

    try {
      const resp = await sendJoni(order.phone, message);
      console.log(` [SENT code=${code}] ${resp}`);
      state[order.tracking] = code;
      saveState();
      sent++;
    } catch(e) {
      console.log(` [SEND ERROR: ${e.message}]`); errors++; continue;
    }

    if (i < orders.length - 1) {
      process.stdout.write('   Waiting 34s...\r');
      await sleep(105000);
    }
  }

  console.log(`\n[DONE] Sent: ${sent} | Skipped: ${skipped} | Errors: ${errors}`);
  console.log(`State: ${STATE_FILE}`);

  if (LIMIT > 0 && sent + skipped + errors >= LIMIT) {
    console.log('\n[TEST COMPLETE] Run without limit argument for full run.');
  }
})();
