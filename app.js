/* ===== البطاقات: الرسم على Canvas + كتابة PDF يدويًا (بدون window.print) ===== */
var CARD = {
  W: 85.6, H: 54, COLS: 2, ROWS: 5,
  PAGE_W: 210, PAGE_H: 297, DPI: 220,
  FONT: "'CairoCanteen','Cairo','Tahoma','Segoe UI',Arial,sans-serif",
  NAVY: '#12284c', COPPER: '#b8733a', CYAN: '#1c9bb0', INK: '#1b2433', MUTE: '#6b7585', SOFT: '#f6f1e9'
};

var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // بدون أحرف ملتبسة (0/O, 1/I/L)
function genCode(taken) {
  var code, tries = 0;
  do {
    code = '';
    var arr = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    for (var i = 0; i < 6; i++) code += CODE_ALPHABET.charAt(arr[i] % CODE_ALPHABET.length);
    tries++;
  } while (taken && taken.has(code) && tries < 1000);
  return code;
}

function mmPx(mm) { return mm * CARD.DPI / 25.4; }

function fitText(ctx, text, maxW, startPx, minPx, weight) {
  var px = startPx;
  while (px > minPx) {
    ctx.font = weight + ' ' + px + 'px ' + CARD.FONT;
    if (ctx.measureText(text).width <= maxW) return px;
    px -= 1;
  }
  return minPx;
}

function wrapLines(ctx, text, maxW) {
  var words = String(text).split(/\s+/), lines = [], cur = '';
  for (var i = 0; i < words.length; i++) {
    var t = cur ? cur + ' ' + words[i] : words[i];
    if (ctx.measureText(t).width <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = words[i]; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawQR(ctx, text, x, y, size) {
  var qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  var n = qr.getModuleCount(), s = size / n;
  ctx.fillStyle = '#000';
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      var x0 = Math.round(x + c * s), x1 = Math.round(x + (c + 1) * s);
      var y0 = Math.round(y + r * s), y1 = Math.round(y + (r + 1) * s);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
}

/* يرسم بطاقة واحدة داخل المستطيل (x,y) بحجم 85.6×54 مم */
function drawCard(ctx, x, y, org, st) {
  var u = CARD.DPI / 25.4, W = CARD.W * u, H = CARD.H * u;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textBaseline = 'middle';

  // خلفية
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, W, H);

  // الشريط العلوي
  var hh = 11.5 * u;
  ctx.fillStyle = CARD.NAVY;
  ctx.fillRect(x, y, W, hh);
  ctx.fillStyle = CARD.COPPER;
  ctx.fillRect(x, y + hh, W, 0.9 * u);

  // اسم المؤسسة
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  var orgName = org || 'المؤسسة';
  var opx = fitText(ctx, orgName, W - 10 * u, 4.6 * u, 2.8 * u, '700');
  ctx.font = '700 ' + opx + 'px ' + CARD.FONT;
  ctx.fillText(orgName, x + W / 2, y + hh / 2 + 0.2 * u);

  // QR (يسار)
  var qs = 31 * u, qx = x + 5.2 * u, qy = y + hh + 0.9 * u + (H - hh - 0.9 * u - 5 * u - qs) / 2;
  ctx.strokeStyle = CARD.COPPER;
  ctx.lineWidth = 0.35 * u;
  roundRect(ctx, qx - 1.8 * u, qy - 1.8 * u, qs + 3.6 * u, qs + 3.6 * u, 1.6 * u);
  ctx.stroke();
  drawQR(ctx, st.code, qx, qy, qs);

  // النص (يمين)
  var rx = x + W - 5 * u;               // الحافة اليمنى للنص
  var lx = qx + qs + 4.2 * u;           // الحافة اليسرى للنص
  var tw = rx - lx;
  ctx.textAlign = 'right';

  var cy = y + hh + 0.9 * u + 5.4 * u;

  // الاسم: سطر أو سطران
  ctx.fillStyle = CARD.NAVY;
  var npx = fitText(ctx, st.name, tw, 5.6 * u, 4.0 * u, '800');
  ctx.font = '800 ' + npx + 'px ' + CARD.FONT;
  var lines = wrapLines(ctx, st.name, tw);
  if (lines.length > 1) {
    npx = 4.5 * u;
    ctx.font = '800 ' + npx + 'px ' + CARD.FONT;
    lines = wrapLines(ctx, st.name, tw);
    if (lines.length > 2) { // آخر حل: تصغير
      npx = fitText(ctx, st.name, tw * 2 - 2 * u, 4.2 * u, 2.9 * u, '800');
      ctx.font = '800 ' + npx + 'px ' + CARD.FONT;
      lines = wrapLines(ctx, st.name, tw).slice(0, 2);
    }
  }
  if (lines.length === 1) cy += 2.8 * u; // توسيط عمودي للأسماء ذات السطر الواحد
  ctx.fillStyle = CARD.MUTE;
  ctx.font = '600 ' + 2.7 * u + 'px ' + CARD.FONT;
  ctx.fillText('بطاقة تلميذ(ة)', rx, cy);
  ctx.fillStyle = CARD.NAVY;
  ctx.font = '800 ' + npx + 'px ' + CARD.FONT;
  var ny = cy + 6.8 * u;
  for (var i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], rx, ny + i * (npx * 1.22));
  }
  var after = ny + (lines.length - 1) * (npx * 1.22) + 5.6 * u;

  // القسم
  ctx.fillStyle = CARD.INK;
  ctx.font = '700 ' + 3.6 * u + 'px ' + CARD.FONT;
  ctx.fillText('القسم: ' + (st.cls || '—'), rx, after);

  // الرمز
  var by = after + 4.6 * u, bh = 7.2 * u;
  ctx.fillStyle = CARD.SOFT;
  roundRect(ctx, lx, by, tw, bh, 1.4 * u);
  ctx.fill();
  ctx.fillStyle = CARD.MUTE;
  ctx.font = '600 ' + 2.5 * u + 'px ' + CARD.FONT;
  ctx.textAlign = 'right';
  ctx.fillText('الرمز', rx - 1.8 * u, by + bh / 2 + 0.1 * u);
  ctx.fillStyle = CARD.NAVY;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '800 ' + 4.4 * u + 'px ' + CARD.FONT;
  if ('letterSpacing' in ctx) ctx.letterSpacing = (0.45 * u) + 'px';
  ctx.fillText(st.code, lx + 2 * u, by + bh / 2 + 0.2 * u);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.direction = 'rtl';

  // الشريط السفلي
  var fh = 5 * u;
  ctx.fillStyle = CARD.SOFT;
  ctx.fillRect(x, y + H - fh, W, fh);
  ctx.fillStyle = CARD.CYAN;
  ctx.fillRect(x, y + H - fh, W, 0.5 * u);
  ctx.fillStyle = CARD.MUTE;
  ctx.textAlign = 'center';
  ctx.font = '600 ' + 2.6 * u + 'px ' + CARD.FONT;
  ctx.fillText('المطعم المدرسي · تُعرض هذه البطاقة عند أخذ الوجبة', x + W / 2, y + H - fh / 2 + 0.3 * u);

  ctx.restore();
}

/* يرسم صفحة A4 كاملة (حتى 10 بطاقات) مع خطوط القص المتقطعة */
function drawCardsPage(canvas, org, students) {
  var u = CARD.DPI / 25.4;
  canvas.width = Math.round(CARD.PAGE_W * u);
  canvas.height = Math.round(CARD.PAGE_H * u);
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var gx = (CARD.PAGE_W - CARD.COLS * CARD.W) / 2 * u;
  var gy = (CARD.PAGE_H - CARD.ROWS * CARD.H) / 2 * u;
  for (var i = 0; i < students.length && i < CARD.COLS * CARD.ROWS; i++) {
    var col = i % CARD.COLS, row = Math.floor(i / CARD.COLS);
    drawCard(ctx, gx + col * CARD.W * u, gy + row * CARD.H * u, org, students[i]);
  }
  // خطوط القص
  ctx.save();
  ctx.strokeStyle = '#8a8f98';
  ctx.lineWidth = Math.max(1, 0.15 * u);
  ctx.setLineDash([1.6 * u, 1.2 * u]);
  var ext = 4 * u, i2;
  for (i2 = 0; i2 <= CARD.COLS; i2++) {
    var vx = Math.round(gx + i2 * CARD.W * u);
    ctx.beginPath(); ctx.moveTo(vx, gy - ext); ctx.lineTo(vx, gy + CARD.ROWS * CARD.H * u + ext); ctx.stroke();
  }
  for (i2 = 0; i2 <= CARD.ROWS; i2++) {
    var hy = Math.round(gy + i2 * CARD.H * u);
    ctx.beginPath(); ctx.moveTo(gx - ext, hy); ctx.lineTo(gx + CARD.COLS * CARD.W * u + ext, hy); ctx.stroke();
  }
  ctx.restore();
}

/* ===== كاتب PDF مصغّر: كل صفحة = صورة JPEG بحجم A4 ===== */
function canvasToJpegBytes(canvas, q) {
  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (!blob) return reject(new Error('toBlob فشل'));
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.onerror = reject;
      fr.readAsArrayBuffer(blob);
    }, 'image/jpeg', q || 0.95);
  });
}

function buildPdf(pages) { // pages: [{bytes, w, h}]
  var enc = new TextEncoder(), parts = [], offsets = [], pos = 0;
  function push(x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); pos += b.length; }
  function obj(n, s) { offsets[n] = pos; push(n + ' 0 obj\n'); push(s); push('\nendobj\n'); }
  var PW = 595.28, PH = 841.89, n = pages.length;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  var kids = [];
  for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');
  obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');
  for (var p = 0; p < n; p++) {
    var pg = 3 + p * 3, ct = pg + 1, im = pg + 2;
    obj(pg, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>');
    var content = 'q ' + PW + ' 0 0 ' + PH + ' 0 0 cm /Im0 Do Q';
    obj(ct, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
    offsets[im] = pos;
    push(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + pages[p].w + ' /Height ' + pages[p].h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pages[p].bytes.length + ' >>\nstream\n');
    push(pages[p].bytes);
    push('\nendstream\nendobj\n');
  }
  var xref = pos, total = 3 + n * 3;
  var x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (var k = 1; k < total; k++) x += ('0000000000' + offsets[k]).slice(-10) + ' 00000 n \n';
  push(x);
  push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  var out = new Uint8Array(pos), o = 0;
  for (var j = 0; j < parts.length; j++) { out.set(parts[j], o); o += parts[j].length; }
  return new Blob([out], { type: 'application/pdf' });
}

async function makeCardsPdf(org, students, onProgress) {
  await ensureFonts();
  var per = CARD.COLS * CARD.ROWS, pages = [];
  var canvas = document.createElement('canvas');
  for (var i = 0; i < students.length; i += per) {
    drawCardsPage(canvas, org, students.slice(i, i + per));
    var bytes = await canvasToJpegBytes(canvas, 0.88);
    pages.push({ bytes: bytes, w: canvas.width, h: canvas.height });
    if (onProgress) onProgress(Math.min(students.length, i + per), students.length);
    await new Promise(function (r) { setTimeout(r, 0); });
  }
  canvas.width = canvas.height = 1; // تحرير الذاكرة
  return buildPdf(pages);
}

function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load("700 20px 'CairoCanteen'", 'مطعم'),
    document.fonts.load("800 20px 'CairoCanteen'", 'مطعم ABC123'),
    document.fonts.load("600 20px 'CairoCanteen'", 'مطعم')
  ]).catch(function () {});
}

/* ====================================================================
   المطعم المدرسي — منطق التطبيق
   ==================================================================== */
var APP_VERSION = '1.0.0';
var $ = function (id) { return document.getElementById(id); };

/* ---------- أدوات عامة ---------- */
function el(tag, attrs, children) {
  var e = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'text') e.textContent = attrs[k];
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  (children || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function dateStr(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function timeStr(d) { d = d || new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
var AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
var AR_MONTHS = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
function longDate(s) {
  var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
  return AR_DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + AR_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}
function cmpAr(a, b) { return String(a).localeCompare(String(b), 'ar', { numeric: true }); }
function normName(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
function foldAr(s) { // للبحث: إزالة التشكيل وتوحيد الألف والياء والتاء المربوطة
  return String(s || '').toLowerCase().replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
}
function toast(msg, ms) {
  var t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 2600);
}
function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob), a = el('a', { href: url, download: name });
  document.body.appendChild(a); a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 60000);
}

/* ---------- نوافذ حوار ---------- */
function openModal(title, body, actions) {
  var back = el('div', { class: 'modal-back' });
  var box = el('div', { class: 'modal', role: 'dialog' });
  box.appendChild(el('h3', { text: title }));
  box.appendChild(body);
  var close = function () { back.remove(); };
  if (actions && actions.length) {
    var bar = el('div', { class: 'actions' });
    actions.forEach(function (a) {
      bar.appendChild(el('button', { class: 'btn ' + (a.cls || ''), text: a.label, onclick: function () { a.fn(close); } }));
    });
    box.appendChild(bar);
  }
  back.appendChild(box);
  back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
  $('modalRoot').appendChild(back);
  return close;
}
function confirmBox(msg, okLabel, danger) {
  return new Promise(function (res) {
    openModal('تأكيد', el('p', { text: msg }), [
      { label: okLabel || 'تأكيد', cls: danger ? 'danger-btn solid' : 'primary', fn: function (c) { c(); res(true); } },
      { label: 'إلغاء', fn: function (c) { c(); res(false); } }
    ]);
  });
}
function typedConfirm(msg, word) {
  return new Promise(function (res) {
    var inp = el('input', { class: 'input', placeholder: 'اكتب: ' + word, autocomplete: 'off' });
    openModal('تأكيد الحذف', el('div', null, [el('p', { text: msg }), inp]), [
      { label: 'حذف نهائيًا', cls: 'danger-btn solid', fn: function (c) {
        if (inp.value.trim() !== word) { toast('اكتب الكلمة «' + word + '» للتأكيد'); return; }
        c(); res(true); } },
      { label: 'إلغاء', fn: function (c) { c(); res(false); } }
    ]);
  });
}

/* ---------- قاعدة البيانات (IndexedDB) ---------- */
var DB = null;
function openDB() {
  return new Promise(function (resolve, reject) {
    var rq = indexedDB.open('mataam-db', 1);
    rq.onupgradeneeded = function () {
      var db = rq.result;
      var st = db.createObjectStore('students', { keyPath: 'id', autoIncrement: true });
      st.createIndex('code', 'code', { unique: true });
      var lg = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      lg.createIndex('k', 'k', { unique: true });
      lg.createIndex('date', 'date');
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    rq.onsuccess = function () { DB = rq.result; resolve(DB); };
    rq.onerror = function () { reject(rq.error); };
  });
}
function reqP(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
function txDone(tx) { return new Promise(function (res, rej) { tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error || new Error('abort')); }; }); }
function getAll(store) { return reqP(DB.transaction(store).objectStore(store).getAll()); }
function metaGet(key, def) { return reqP(DB.transaction('meta').objectStore('meta').get(key)).then(function (r) { return r ? r.value : def; }); }
function metaSet(key, value) { var tx = DB.transaction('meta', 'readwrite'); tx.objectStore('meta').put({ key: key, value: value }); return txDone(tx); }

/* ---------- الحالة ---------- */
var S = [];            // التلاميذ
var BYCODE = {};       // الرمز → تلميذ
var BYID = {};
var CFG = { org: '', sound: true, vibrate: true };
var TODAY_LOGS = [];

async function loadStudents() {
  S = await getAll('students');
  S.sort(function (a, b) { return cmpAr(a.cls, b.cls) || cmpAr(a.name, b.name); });
  BYCODE = {}; BYID = {};
  S.forEach(function (s) { BYCODE[s.code] = s; BYID[s.id] = s; });
}
async function loadToday() {
  var d = dateStr();
  TODAY_LOGS = await reqP(DB.transaction('logs').objectStore('logs').index('date').getAll(d));
  TODAY_LOGS.sort(function (a, b) { return b.ts - a.ts; });
}
async function loadCfg() {
  var c = await metaGet('settings', null);
  if (c) for (var k in c) CFG[k] = c[k];
  if (!(await metaGet('firstUse', 0))) await metaSet('firstUse', Date.now());
}
function saveCfg() { return metaSet('settings', CFG); }
function allCodes() { var s = new Set(); S.forEach(function (x) { s.add(x.code); }); return s; }

/* ---------- الصوت والاهتزاز ---------- */
var AC = null;
function beep(freq, dur, when, type, vol) {
  if (!AC) return;
  var o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  var t0 = AC.currentTime + (when || 0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.35, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function feedback(kind, force) {
  if (CFG.sound || force) {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      if (kind === 'ok') { beep(880, 0.12, 0); beep(1320, 0.16, 0.12); }
      else if (kind === 'dup') { beep(600, 0.14, 0, 'square', 0.2); beep(600, 0.14, 0.22, 'square', 0.2); }
      else { beep(180, 0.45, 0, 'sawtooth', 0.3); }
    } catch (e) {}
  }
  if (CFG.vibrate && navigator.vibrate) {
    try { navigator.vibrate(kind === 'ok' ? 80 : kind === 'dup' ? [90, 70, 90] : [300]); } catch (e) {}
  }
}
document.addEventListener('pointerdown', function () {
  try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {}
}, { once: true });

/* ---------- التسجيل ---------- */
function normCode(raw) { return String(raw || '').trim().toUpperCase(); }

async function recordMeal(st, manual) {
  var now = new Date(), d = dateStr(now);
  var rec = { k: d + '|' + st.id, date: d, time: timeStr(now), ts: now.getTime(), studentId: st.id,
              name: st.name, cls: st.cls, code: st.code, manual: !!manual };
  return new Promise(function (resolve, reject) {
    var tx = DB.transaction('logs', 'readwrite'), os = tx.objectStore('logs'), isDup = false;
    var rq = os.add(rec);
    rq.onsuccess = function () { rec.id = rq.result; };
    rq.onerror = function (e) {
      if (rq.error && rq.error.name === 'ConstraintError') { isDup = true; e.preventDefault(); e.stopPropagation(); }
    };
    tx.oncomplete = function () {
      if (!isDup) return resolve({ status: 'ok', rec: rec });
      reqP(DB.transaction('logs').objectStore('logs').index('k').get(rec.k)).then(function (old) { resolve({ status: 'dup', rec: old || rec }); }, reject);
    };
    tx.onabort = function () { reject(tx.error || rq.error); };
  });
}

function showResult(kind, main, sub, icon) {
  var r = $('result');
  r.className = 'result ' + kind;
  $('rMain').textContent = main; $('rSub').textContent = sub || '';
  $('rIcon').textContent = icon || '';
  var f = $('flash');
  f.style.background = kind === 'ok' ? '#1f9d55' : kind === 'dup' ? '#f0b400' : '#d64545';
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

async function handleScan(raw, source) {
  var code = normCode(raw);
  if (!code) return;
  var st = BYCODE[code];
  if (!st) { // احتمال أن يحتوي النص على الرمز
    var m = code.match(/[A-Z2-9]{6}/g);
    if (m) for (var i = 0; i < m.length; i++) if (BYCODE[m[i]]) { st = BYCODE[m[i]]; break; }
  }
  if (!st) {
    showResult('bad', 'بطاقة غير معروفة', 'الرمز: ' + code.slice(0, 24), '✕');
    feedback('bad'); return;
  }
  try {
    var res = await recordMeal(st, source === 'manual');
    if (res.status === 'ok') {
      showResult('ok', st.name, 'القسم ' + st.cls + ' — سُجّلت الوجبة ✓', '✓');
      feedback('ok');
    } else {
      showResult('dup', st.name, 'القسم ' + st.cls + ' — استلم وجبته اليوم عند ' + (res.rec.time || '').slice(0, 5), '!');
      feedback('dup');
    }
  } catch (e) {
    showResult('bad', 'تعذّر الحفظ', String(e && e.message || e), '✕'); feedback('bad');
  }
  await refreshScan();
}

/* ---------- شاشة المسح ---------- */
async function refreshScan() {
  await loadToday();
  var took = TODAY_LOGS.length;
  var tookIds = {}; TODAY_LOGS.forEach(function (l) { tookIds[l.studentId] = 1; });
  var left = S.filter(function (s) { return !tookIds[s.id]; }).length;
  $('stTook').textContent = took; $('stTotal').textContent = S.length; $('stLeft').textContent = left;
  $('todayLabel').textContent = longDate(dateStr());
  var box = $('recentList'); box.textContent = '';
  if (!TODAY_LOGS.length) box.appendChild(el('div', { class: 'empty', text: 'لا توجد تسجيلات اليوم بعد' }));
  TODAY_LOGS.slice(0, 15).forEach(function (l) {
    box.appendChild(el('div', { class: 'item' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 'nm', text: l.name }),
        el('div', { class: 'sb', text: l.cls + ' · ' + l.time.slice(0, 5) + (l.manual ? ' · يدوي' : '') })
      ]),
      el('button', { class: 'btn small danger-btn', text: 'إلغاء', onclick: async function () {
        if (await confirmBox('إلغاء تسجيل وجبة «' + l.name + '»؟', 'إلغاء التسجيل', true)) {
          var tx = DB.transaction('logs', 'readwrite'); tx.objectStore('logs').delete(l.id); await txDone(tx);
          toast('تم إلغاء التسجيل'); refreshScan(); renderManual();
        }
      } })
    ]));
  });
  renderManual();
}

function renderManual() {
  var q = foldAr(normName($('manualSearch').value)), box = $('manualResults');
  box.textContent = '';
  if (!q) return;
  var tookIds = {}; TODAY_LOGS.forEach(function (l) { tookIds[l.studentId] = l; });
  var res = S.filter(function (s) { return foldAr(s.name).indexOf(q) !== -1; }).slice(0, 12);
  if (!res.length) { box.appendChild(el('div', { class: 'empty', text: 'لا نتائج' })); return; }
  res.forEach(function (s) {
    var took = tookIds[s.id];
    box.appendChild(el('div', { class: 'item' }, [
      el('div', { class: 'grow' }, [el('div', { class: 'nm', text: s.name }), el('div', { class: 'sb', text: s.cls })]),
      took ? el('span', { class: 'chip', text: 'استلم ' + took.time.slice(0, 5) })
           : el('button', { class: 'btn small ok-btn', text: 'تسجيل', onclick: function () { handleScan(s.code, 'manual'); } })
    ]));
  });
}

/* ---------- قارئ USB (لوحة مفاتيح) ---------- */
var kbBuf = '', kbLast = 0;
document.addEventListener('keydown', function (e) {
  if (CUR_VIEW !== 'scan' || $('modalRoot').firstChild) return;
  var t = e.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  var now = Date.now();
  if (now - kbLast > 100) kbBuf = '';
  kbLast = now;
  if (e.key === 'Enter' || e.key === 'Tab') {
    if (kbBuf.length >= 3) { e.preventDefault(); var v = kbBuf; kbBuf = ''; handleScan(v, 'usb'); }
    else kbBuf = '';
  } else if (e.key.length === 1) {
    kbBuf += e.key;
  }
});

/* ---------- الكاميرا ---------- */
var cam = { stream: null, running: false, det: null, canvas: null, ctx: null, last: 0, lastCode: '', lastAt: 0, track: null, torch: false };

async function startCamera() {
  if (cam.running) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast('الكاميرا غير مدعومة في هذا المتصفح'); return;
  }
  try {
    cam.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    toast(e && e.name === 'NotAllowedError' ? 'تم رفض إذن الكاميرا. فعّله من إعدادات المتصفح.' : 'تعذّر تشغيل الكاميرا'); return;
  }
  var v = $('camVideo'); v.srcObject = cam.stream;
  try { await v.play(); } catch (e) {}
  $('camBox').hidden = false;
  $('btnCam').textContent = '⏹ إيقاف الكاميرا';
  cam.track = cam.stream.getVideoTracks()[0];
  try { var caps = cam.track.getCapabilities && cam.track.getCapabilities(); $('btnTorch').hidden = !(caps && caps.torch); } catch (e) {}
  if ('BarcodeDetector' in window) {
    try { cam.det = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { cam.det = null; }
  }
  $('camHint').textContent = cam.det ? 'وجّه البطاقة نحو الإطار.' : 'وجّه البطاقة نحو الإطار (وضع jsQR الاحتياطي).';
  cam.canvas = cam.canvas || document.createElement('canvas');
  cam.ctx = cam.canvas.getContext('2d', { willReadFrequently: true });
  cam.running = true; cam.mode = cam.det ? 'native' : 'jsqr';
  requestAnimationFrame(camLoop);
}
function stopCamera() {
  cam.running = false;
  if (cam.stream) cam.stream.getTracks().forEach(function (t) { t.stop(); });
  cam.stream = null; cam.torch = false;
  $('camVideo').srcObject = null; $('camBox').hidden = true; $('btnTorch').hidden = true;
  $('btnCam').textContent = '📷 تشغيل الكاميرا';
}
async function camLoop(ts) {
  if (!cam.running) return;
  var v = $('camVideo');
  if (ts - cam.last >= 120 && v.readyState >= 2 && v.videoWidth) {
    cam.last = ts;
    var text = null;
    try {
      if (cam.det) {
        var r = await cam.det.detect(v);
        if (r && r.length) text = r[0].rawValue;
      }
      if (!text) { // jsQR احتياطي (أو إذا لم يلتقط BarcodeDetector شيئًا)
        if (!cam.det || (cam.fb = (cam.fb || 0) + 1) % 4 === 0) {
          var sc = Math.min(1, 640 / v.videoWidth), w = Math.round(v.videoWidth * sc), h = Math.round(v.videoHeight * sc);
          cam.canvas.width = w; cam.canvas.height = h;
          cam.ctx.drawImage(v, 0, 0, w, h);
          var img = cam.ctx.getImageData(0, 0, w, h);
          var q = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (q) text = q.data;
        }
      }
    } catch (e) {}
    if (text) {
      var code = normCode(text), now = Date.now();
      if (!(code === cam.lastCode && now - cam.lastAt < 3000)) { cam.lastCode = code; cam.lastAt = now; handleScan(code, 'camera'); }
      else cam.lastAt = now;
    }
  }
  requestAnimationFrame(camLoop);
}
document.addEventListener('visibilitychange', function () { if (document.hidden && cam.running) stopCamera(); else if (!document.hidden) { refreshScan(); } });

/* ---------- التلاميذ ---------- */
function classList() { var s = {}; S.forEach(function (x) { s[x.cls] = 1; }); return Object.keys(s).sort(cmpAr); }

function renderStudents() {
  var q = foldAr(normName($('stuSearch').value)), c = $('stuClass').value;
  var cur = c, sel = $('stuClass');
  sel.textContent = ''; sel.appendChild(el('option', { value: '', text: 'كل الأقسام' }));
  classList().forEach(function (k) { sel.appendChild(el('option', { value: k, text: k })); });
  sel.value = cur;
  var res = S.filter(function (s) { return (!sel.value || s.cls === sel.value) && (!q || foldAr(s.name).indexOf(q) !== -1 || s.code.toLowerCase().indexOf(q) !== -1); });
  $('stuCount').textContent = res.length + ' من ' + S.length + ' تلميذ';
  var box = $('stuList'); box.textContent = '';
  if (!res.length) box.appendChild(el('div', { class: 'empty', text: S.length ? 'لا نتائج' : 'لا يوجد تلاميذ. أضف تلميذًا أو استورد قائمة من Excel.' }));
  var frag = document.createDocumentFragment();
  res.slice(0, 300).forEach(function (s) {
    frag.appendChild(el('div', { class: 'item' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 'nm', text: s.name }),
        el('div', { class: 'sb' }, [el('span', { class: 'chip', text: s.cls }), ' ', el('span', { class: 'code', text: s.code })])
      ]),
      el('button', { class: 'btn small', text: 'تعديل', onclick: function () { studentModal(s); } })
    ]));
  });
  box.appendChild(frag);
  if (res.length > 300) box.appendChild(el('div', { class: 'empty', text: 'يُعرض أول 300 نتيجة — استعمل البحث أو اختر قسمًا.' }));
}

function studentModal(st) {
  var isNew = !st;
  var name = el('input', { class: 'input', value: st ? st.name : '', placeholder: 'الاسم واللقب' });
  var cls = el('input', { class: 'input', value: st ? st.cls : '', placeholder: 'مثال: 1م4', list: 'clsOptions' });
  var dl = el('datalist', { id: 'clsOptions' }); classList().forEach(function (k) { dl.appendChild(el('option', { value: k })); });
  var code = el('input', { class: 'input', value: st ? st.code : genCode(allCodes()), dir: 'ltr', style: 'text-align:left;letter-spacing:2px', autocomplete: 'off' });
  var regen = el('button', { class: 'btn small', text: 'رمز جديد', onclick: function () { code.value = genCode(allCodes()); } });
  var body = el('div', null, [
    el('div', { class: 'field' }, [el('label', { class: 'lbl', text: 'الاسم' }), name]),
    el('div', { class: 'field' }, [el('label', { class: 'lbl', text: 'القسم' }), cls, dl]),
    el('div', { class: 'field' }, [el('label', { class: 'lbl', text: 'الرمز (6 أحرف) — تغييره يُبطل البطاقة المطبوعة' }), el('div', { class: 'row' }, [code, regen])])
  ]);
  var actions = [{ label: 'حفظ', cls: 'primary', fn: async function (close) {
    var n = normName(name.value), c = normName(cls.value), k = normCode(code.value);
    if (!n) { toast('أدخل الاسم'); return; }
    if (!k) { toast('الرمز فارغ'); return; }
    var dupe = BYCODE[k]; if (dupe && (!st || dupe.id !== st.id)) { toast('هذا الرمز مستعمل لتلميذ آخر'); return; }
    var rec = st ? Object.assign({}, st, { name: n, cls: c, code: k }) : { name: n, cls: c, code: k, created: Date.now() };
    var tx = DB.transaction('students', 'readwrite'); tx.objectStore('students').put(rec);
    try { await txDone(tx); } catch (e) { toast('تعذّر الحفظ'); return; }
    close(); await loadStudents(); renderStudents(); refreshScan(); toast(isNew ? 'تمت الإضافة' : 'تم الحفظ');
  } }];
  if (st) actions.push({ label: 'حذف', cls: 'danger-btn', fn: async function (close) {
    if (await confirmBox('حذف التلميذ «' + st.name + '»؟ تبقى سجلات وجباته السابقة في التقارير.', 'حذف', true)) {
      var tx = DB.transaction('students', 'readwrite'); tx.objectStore('students').delete(st.id); await txDone(tx);
      close(); await loadStudents(); renderStudents(); refreshScan(); toast('تم الحذف');
    }
  } });
  actions.push({ label: 'إغلاق', fn: function (c) { c(); } });
  openModal(isNew ? 'إضافة تلميذ' : 'تعديل التلميذ', body, actions);
  setTimeout(function () { name.focus(); }, 50);
}

/* استيراد: الاسم | القسم | الرمز (اختياري) — لصق من Excel (فاصل Tab) */
function parseImport(text) {
  var rows = [], lines = String(text).replace(/\r/g, '').split('\n');
  lines.forEach(function (ln) {
    if (!ln.trim()) return;
    var parts = ln.indexOf('\t') !== -1 ? ln.split('\t') : (ln.indexOf(';') !== -1 ? ln.split(';') : (ln.indexOf('|') !== -1 ? ln.split('|') : ln.split(',')));
    parts = parts.map(function (p) { return p.replace(/^"|"$/g, '').trim(); });
    rows.push({ name: normName(parts[0]), cls: normName(parts[1]), code: normCode(parts[2]) });
  });
  if (rows.length && /^(الاسم|اسم|الإسم|name)/i.test(rows[0].name) ) rows.shift(); // سطر عناوين
  return rows;
}
function importModal() {
  var ta = el('textarea', { class: 'input', placeholder: 'الصق هنا أعمدة من Excel:\nالاسم   القسم   الرمز (اختياري)\n\nمثال:\nمحمد بن علي\t1م4\nإيمان بوزيدي\t1م4' });
  var info = el('div', { class: 'muted', text: 'الصق الأعمدة ثم اضغط «استيراد».' });
  var upd = function () {
    var r = parseImport(ta.value).filter(function (x) { return x.name; }), seen = {}, uniq = 0, dup = 0;
    S.forEach(function (s) { seen[foldAr(s.name) + '|' + foldAr(s.cls)] = 1; });
    r.forEach(function (x) { var k = foldAr(x.name) + '|' + foldAr(x.cls); if (seen[k]) dup++; else { seen[k] = 1; uniq++; } });
    info.textContent = ta.value.trim() ? ('سيُضاف ' + uniq + ' تلميذ' + (dup ? ' — ويُتجاهل ' + dup + ' مكرر' : '')) : 'الصق الأعمدة ثم اضغط «استيراد».';
  };
  ta.addEventListener('input', upd);
  openModal('استيراد من Excel', el('div', null, [
    el('p', { class: 'muted', text: 'الأعمدة بالترتيب: الاسم | القسم | الرمز (اختياري). يُولَّد رمز عشوائي لمن لا رمز له. من يتكرر اسمه وقسمه يُتجاهل.' }), ta, info
  ]), [
    { label: 'استيراد', cls: 'primary', fn: async function (close) {
      var rows = parseImport(ta.value).filter(function (r) { return r.name; });
      if (!rows.length) { toast('لا توجد بيانات'); return; }
      var taken = allCodes(), have = {}, added = 0, skipped = 0, now = Date.now();
      S.forEach(function (s) { have[foldAr(s.name) + '|' + foldAr(s.cls)] = 1; });
      var tx = DB.transaction('students', 'readwrite'), os = tx.objectStore('students');
      rows.forEach(function (r) {
        var key = foldAr(r.name) + '|' + foldAr(r.cls);
        if (have[key]) { skipped++; return; }
        have[key] = 1;
        var code = r.code && !taken.has(r.code) ? r.code : genCode(taken);
        taken.add(code);
        os.add({ name: r.name, cls: r.cls, code: code, created: now }); added++;
      });
      try { await txDone(tx); } catch (e) { toast('فشل الاستيراد'); return; }
      close(); await loadStudents(); renderStudents(); refreshScan();
      toast('تمت إضافة ' + added + ' تلميذ' + (skipped ? ' — وتجاهل ' + skipped + ' مكرر' : ''), 4000);
    } },
    { label: 'إغلاق', fn: function (c) { c(); } }
  ]);
  setTimeout(function () { ta.focus(); }, 50);
}

/* ---------- البطاقات ---------- */
var pickSel = {}; var pdfUrl = null;
function cardScope() { var r = document.querySelector('input[name=cardScope]:checked'); return r ? r.value : 'all'; }
function cardStudents() {
  var sc = cardScope();
  if (sc === 'class') return S.filter(function (s) { return s.cls === $('cardClass').value; });
  if (sc === 'pick') return S.filter(function (s) { return pickSel[s.id]; });
  return S.slice();
}
function renderCards() {
  var sel = $('cardClass'), cur = sel.value; sel.textContent = '';
  classList().forEach(function (k) { sel.appendChild(el('option', { value: k, text: k })); });
  if (cur) sel.value = cur;
  var sc = cardScope(); sel.hidden = sc !== 'class'; $('cardPick').hidden = sc !== 'pick';
  if (sc === 'pick') {
    var q = foldAr(normName($('cardPickSearch').value)), box = $('cardPickList'); box.textContent = '';
    S.filter(function (s) { return !q || foldAr(s.name).indexOf(q) !== -1 || foldAr(s.cls).indexOf(q) !== -1; }).slice(0, 200).forEach(function (s) {
      var cb = el('input', { type: 'checkbox', onchange: function () { pickSel[s.id] = cb.checked; updCardCount(); } });
      cb.checked = !!pickSel[s.id];
      box.appendChild(el('label', { class: 'item', style: 'cursor:pointer' }, [cb, el('div', { class: 'grow' }, [el('div', { class: 'nm', text: s.name }), el('div', { class: 'sb', text: s.cls })])]));
    });
  }
  updCardCount();
}
async function updCardCount() {
  var list = cardStudents(), pages = Math.ceil(list.length / 10);
  $('cardCount').textContent = list.length + ' بطاقة — ' + pages + ' ورقة A4';
  $('btnMakePdf').disabled = !list.length;
  var cv = $('cardPreview');
  var sample = list[0] || { name: 'اسم التلميذ هنا', cls: '1م1', code: 'ABC234' };
  await ensureFonts();
  var u = CARD.DPI / 25.4;
  cv.width = Math.round(CARD.W * u); cv.height = Math.round(CARD.H * u);
  drawCard(cv.getContext('2d'), 0, 0, CFG.org, sample);
}
async function makePdf() {
  var list = cardStudents(); if (!list.length) return;
  var btn = $('btnMakePdf'); btn.disabled = true; $('pdfDone').hidden = true;
  try {
    $('pdfStatus').textContent = 'جارٍ إنشاء الملف…';
    var blob = await makeCardsPdf(CFG.org, list, function (n, t) { $('pdfStatus').textContent = 'جارٍ الرسم… ' + n + ' / ' + t; });
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(blob);
    var name = 'cartes-cantine-' + dateStr() + '.pdf';
    $('pdfSave').href = pdfUrl; $('pdfSave').download = name; $('pdfOpen').href = pdfUrl;
    $('pdfDone').hidden = false;
    $('pdfStatus').textContent = 'تم إنشاء الملف (' + list.length + ' بطاقة، ' + Math.round(blob.size / 1024) + ' ك.ب). إن لم يبدأ التنزيل اضغط «حفظ الملف».';
    downloadBlob(blob, name);
  } catch (e) {
    $('pdfStatus').textContent = 'تعذّر إنشاء الملف: ' + (e && e.message || e);
  }
  btn.disabled = false;
}

/* ---------- التقارير ---------- */
var REP = 'day';
function csvCell(v) {
  v = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function csvBlob(rows) { // BOM + sep=; ليفتح في Excel بالعربية على أي إعداد إقليمي
  var txt = '﻿sep=;\r\n' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
  return new Blob([txt], { type: 'text/csv;charset=utf-8' });
}
function groupByClass(arr) {
  var g = {}; arr.forEach(function (x) { (g[x.cls || '—'] = g[x.cls || '—'] || []).push(x); });
  return Object.keys(g).sort(cmpAr).map(function (k) { return [k, g[k]]; });
}
async function dayData(d) {
  var logs = await reqP(DB.transaction('logs').objectStore('logs').index('date').getAll(d));
  var took = {}; logs.forEach(function (l) { took[l.studentId] = l; });
  var left = S.filter(function (s) { return !took[s.id]; });
  logs.sort(function (a, b) { return cmpAr(a.cls, b.cls) || cmpAr(a.name, b.name); });
  return { logs: logs, left: left };
}
async function renderDayReport() {
  var d = $('repDate').value || dateStr(); var data = await dayData(d);
  $('rdTook').textContent = data.logs.length; $('rdLeft').textContent = data.left.length; $('rdTotal').textContent = S.length;
  var box = $('repDayList'); box.textContent = '';
  var classes = {}; data.logs.forEach(function (l) { classes[l.cls || '—'] = 1; }); data.left.forEach(function (s) { classes[s.cls || '—'] = 1; });
  if (!Object.keys(classes).length) { box.appendChild(el('div', { class: 'empty', text: 'لا بيانات لهذا اليوم' })); return; }
  Object.keys(classes).sort(cmpAr).forEach(function (k) {
    var t = data.logs.filter(function (l) { return (l.cls || '—') === k; });
    var n = data.left.filter(function (s) { return (s.cls || '—') === k; });
    var inner = el('div', { class: 'inner' });
    inner.appendChild(el('div', { class: 'sub-h', text: 'تناولوا (' + t.length + ')' }));
    if (!t.length) inner.appendChild(el('div', { class: 'sb muted', text: '—' }));
    t.forEach(function (l) { inner.appendChild(el('div', { class: 'item' }, [el('span', { class: 'dot ok' }), el('div', { class: 'grow nm', text: l.name }), el('span', { class: 'sb', text: l.time.slice(0, 5) })])); });
    inner.appendChild(el('div', { class: 'sub-h', text: 'لم يتناولوا (' + n.length + ')' }));
    if (!n.length) inner.appendChild(el('div', { class: 'sb muted', text: '—' }));
    n.forEach(function (s) { inner.appendChild(el('div', { class: 'item' }, [el('span', { class: 'dot bad' }), el('div', { class: 'grow nm', text: s.name })])); });
    var det = el('details', { class: 'grp' }, [
      el('summary', null, [k, el('span', { class: 'sp' }), el('span', { class: 'chip', text: t.length + ' / ' + (t.length + n.length) })]), inner]);
    box.appendChild(det);
  });
}
async function monthData(m) { // m = YYYY-MM
  var logs = await reqP(DB.transaction('logs').objectStore('logs').index('date').getAll(IDBKeyRange.bound(m + '-01', m + '-31')));
  var days = {}, per = {};
  logs.forEach(function (l) { days[l.date] = (days[l.date] || 0) + 1; var p = per[l.studentId] || (per[l.studentId] = { name: l.name, cls: l.cls, code: l.code, n: 0, d: {} }); p.n++; p.d[l.date] = 1; });
  // أحدث اسم/قسم من قائمة التلاميذ إن وُجد
  Object.keys(per).forEach(function (id) { var s = BYID[id]; if (s) { per[id].name = s.name; per[id].cls = s.cls; } });
  return { logs: logs, days: days, per: Object.keys(per).map(function (k) { return per[k]; }) };
}
async function renderMonthReport() {
  var m = $('repMonth').value || dateStr().slice(0, 7); var data = await monthData(m);
  var dk = Object.keys(data.days).sort(), total = data.logs.length;
  $('rmMeals').textContent = total; $('rmDays').textContent = dk.length; $('rmAvg').textContent = dk.length ? Math.round(total / dk.length) : 0;
  var box = $('repMonthBody'); box.textContent = '';
  if (!total) { box.appendChild(el('div', { class: 'empty', text: 'لا بيانات لهذا الشهر' })); return; }
  var t = el('table', { class: 'tbl' }, [el('tr', null, [el('th', { text: 'اليوم' }), el('th', { text: 'الوجبات' })])]);
  dk.forEach(function (d) { t.appendChild(el('tr', null, [el('td', { text: longDate(d) }), el('td', { text: data.days[d] })])); });
  box.appendChild(el('div', { class: 'card' }, [el('h3', { text: 'حسب اليوم' }), t]));
  var per = data.per.slice().sort(function (a, b) { return cmpAr(a.cls, b.cls) || cmpAr(a.name, b.name); });
  groupByClass(per).forEach(function (g) {
    var sum = g[1].reduce(function (a, x) { return a + x.n; }, 0);
    var inner = el('div', { class: 'inner' });
    g[1].forEach(function (x) { inner.appendChild(el('div', { class: 'item' }, [el('div', { class: 'grow nm', text: x.name }), el('span', { class: 'chip', text: x.n + ' وجبة' })])); });
    box.appendChild(el('details', { class: 'grp' }, [el('summary', null, [g[0], el('span', { class: 'sp' }), el('span', { class: 'chip', text: sum + ' وجبة' })]), inner]));
  });
}
async function csvDay() {
  var d = $('repDate').value || dateStr(), data = await dayData(d);
  var rows = [['التاريخ', 'الاسم', 'القسم', 'الرمز', 'الحالة', 'الوقت']];
  data.logs.forEach(function (l) { rows.push([d, l.name, l.cls, l.code, 'تناول', l.time]); });
  data.left.forEach(function (s) { rows.push([d, s.name, s.cls, s.code, 'لم يتناول', '']); });
  downloadBlob(csvBlob(rows), 'rapport-jour-' + d + '.csv');
}
async function csvMonth() {
  var m = $('repMonth').value || dateStr().slice(0, 7), data = await monthData(m);
  var dk = Object.keys(data.days).sort();
  var head = ['الاسم', 'القسم', 'الرمز'].concat(dk.map(function (d) { return d.slice(8); })).concat(['المجموع']);
  var rows = [head];
  data.per.sort(function (a, b) { return cmpAr(a.cls, b.cls) || cmpAr(a.name, b.name); }).forEach(function (p) {
    rows.push([p.name, p.cls, p.code].concat(dk.map(function (d) { return p.d[d] ? 1 : ''; })).concat([p.n]));
  });
  downloadBlob(csvBlob(rows), 'bilan-mois-' + m + '.csv');
}

/* ---------- الإعدادات والنسخ الاحتياطي ---------- */
async function backupInfo() {
  var lb = await metaGet('lastBackup', 0);
  $('backupInfo').textContent = lb ? 'آخر نسخة احتياطية: ' + longDate(dateStr(new Date(lb))) : 'لم تُحفظ أي نسخة احتياطية بعد.';
  $('verInfo').textContent = 'المطعم المدرسي · الإصدار ' + APP_VERSION;
}
async function doBackup() {
  var students = await getAll('students'), logs = await getAll('logs');
  var data = { app: 'mataam', version: 1, exported: new Date().toISOString(), settings: CFG, students: students, logs: logs };
  downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), 'mataam-backup-' + dateStr() + '.json');
  await metaSet('lastBackup', Date.now()); await metaSet('bannerSnooze', 0);
  backupInfo(); checkBanner(); toast('تم حفظ النسخة الاحتياطية (' + students.length + ' تلميذ، ' + logs.length + ' تسجيل)', 4000);
}
async function doRestore(file) {
  var data;
  try { data = JSON.parse(await file.text()); } catch (e) { toast('الملف غير صالح'); return; }
  if (!data || data.app !== 'mataam' || !Array.isArray(data.students) || !Array.isArray(data.logs)) { toast('هذا ليس ملف نسخة احتياطية لهذا التطبيق'); return; }
  if (!(await confirmBox('سيُستبدل كل ما في التطبيق بمحتوى الملف (' + data.students.length + ' تلميذ، ' + data.logs.length + ' تسجيل). متابعة؟', 'استرجاع', true))) return;
  var tx = DB.transaction(['students', 'logs'], 'readwrite');
  var st = tx.objectStore('students'), lg = tx.objectStore('logs');
  st.clear(); lg.clear();
  data.students.forEach(function (s) { st.put(s); });
  data.logs.forEach(function (l) { l.k = l.date + '|' + l.studentId; lg.put(l); });
  try { await txDone(tx); } catch (e) { toast('فشل الاسترجاع: ' + (e && e.message || e)); return; }
  if (data.settings) { Object.assign(CFG, data.settings); await saveCfg(); }
  await metaSet('lastBackup', Date.now());
  await reloadAll(); toast('تم الاسترجاع بنجاح');
}
async function checkBanner() {
  var b = $('banner');
  if (!S.length) { b.hidden = true; return; }
  var lb = await metaGet('lastBackup', 0), fu = await metaGet('firstUse', Date.now()), sn = await metaGet('bannerSnooze', 0);
  var ref = Math.max(lb, fu), due = Date.now() - ref >= 14 * 86400000 && Date.now() > sn;
  if (!due) { b.hidden = true; return; }
  b.textContent = '';
  b.appendChild(el('span', { text: lb ? 'مرّ أكثر من أسبوعين على آخر نسخة احتياطية.' : 'لم تحفظ نسخة احتياطية منذ أكثر من أسبوعين.' }));
  var wrap = el('span', { class: 'row', style: 'margin:0' }, [
    el('button', { class: 'btn small primary', text: 'حفظ الآن', onclick: doBackup }),
    el('button', { class: 'btn small', text: 'لاحقًا', onclick: async function () { await metaSet('bannerSnooze', Date.now() + 86400000); b.hidden = true; } })
  ]);
  b.appendChild(wrap); b.hidden = false;
}
async function clearStores(names) {
  var tx = DB.transaction(names, 'readwrite'); names.forEach(function (n) { tx.objectStore(n).clear(); }); await txDone(tx);
}

/* ---------- التنقل ---------- */
var CUR_VIEW = 'scan';
function show(view) {
  if (view !== 'scan' && cam.running) stopCamera();
  CUR_VIEW = view;
  document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== 'view-' + view; });
  document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
  window.scrollTo(0, 0);
  if (view === 'scan') refreshScan();
  else if (view === 'students') renderStudents();
  else if (view === 'cards') renderCards();
  else if (view === 'reports') { REP === 'day' ? renderDayReport() : renderMonthReport(); }
  else if (view === 'settings') { backupInfo(); }
}
async function reloadAll() {
  await loadStudents(); await loadToday();
  $('setOrg').value = CFG.org || ''; $('setSound').checked = !!CFG.sound; $('setVibrate').checked = !!CFG.vibrate;
  $('orgTitle').textContent = CFG.org || 'المطعم المدرسي';
  await refreshScan(); await checkBanner(); renderStudents();
}

function bind() {
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.dataset.view); });
  $('btnCam').addEventListener('click', function () { cam.running ? stopCamera() : startCamera(); });
  $('btnTorch').addEventListener('click', async function () {
    try { cam.torch = !cam.torch; await cam.track.applyConstraints({ advanced: [{ torch: cam.torch }] }); } catch (e) { toast('الإضاءة غير متاحة'); }
  });
  $('manualSearch').addEventListener('input', renderManual);
  $('btnAddStudent').addEventListener('click', function () { studentModal(null); });
  $('btnImport').addEventListener('click', importModal);
  $('stuSearch').addEventListener('input', renderStudents);
  $('stuClass').addEventListener('change', renderStudents);
  document.querySelectorAll('input[name=cardScope]').forEach(function (r) { r.addEventListener('change', renderCards); });
  $('cardClass').addEventListener('change', updCardCount);
  $('cardPickSearch').addEventListener('input', renderCards);
  $('cardPickAll').addEventListener('click', function () { S.forEach(function (s) { pickSel[s.id] = true; }); renderCards(); });
  $('cardPickNone').addEventListener('click', function () { pickSel = {}; renderCards(); });
  $('btnMakePdf').addEventListener('click', makePdf);
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      REP = b.dataset.rep;
      document.querySelectorAll('.seg-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
      $('rep-day').hidden = REP !== 'day'; $('rep-month').hidden = REP !== 'month';
      REP === 'day' ? renderDayReport() : renderMonthReport();
    });
  });
  $('repDate').value = dateStr(); $('repMonth').value = dateStr().slice(0, 7);
  $('repDate').addEventListener('change', renderDayReport); $('repMonth').addEventListener('change', renderMonthReport);
  $('btnCsvDay').addEventListener('click', csvDay); $('btnCsvMonth').addEventListener('click', csvMonth);
  $('btnSaveOrg').addEventListener('click', async function () { CFG.org = normName($('setOrg').value); await saveCfg(); $('orgTitle').textContent = CFG.org || 'المطعم المدرسي'; toast('تم الحفظ'); });
  $('setSound').addEventListener('change', function () { CFG.sound = this.checked; saveCfg(); });
  $('setVibrate').addEventListener('change', function () { CFG.vibrate = this.checked; saveCfg(); });
  $('btnTestSound').addEventListener('click', function () { feedback('ok', true); setTimeout(function () { feedback('dup', true); }, 600); });
  $('btnBackup').addEventListener('click', doBackup);
  $('btnRestore').addEventListener('click', function () { $('restoreFile').click(); });
  $('restoreFile').addEventListener('change', function () { if (this.files[0]) doRestore(this.files[0]); this.value = ''; });
  $('btnDelLogs').addEventListener('click', async function () {
    if (await typedConfirm('سيُحذف كل سجل الوجبات (التلاميذ يبقون). لا يمكن التراجع.', 'حذف')) { await clearStores(['logs']); await reloadAll(); toast('تم حذف السجلات'); }
  });
  $('btnDelAll').addEventListener('click', async function () {
    if (await typedConfirm('سيُحذف كل شيء: التلاميذ والسجلات والإعدادات. لا يمكن التراجع.', 'حذف')) {
      await clearStores(['students', 'logs', 'meta']); CFG = { org: '', sound: true, vibrate: true }; await loadCfg(); await reloadAll(); toast('تم حذف كل البيانات');
    }
  });
}

async function init() {
  bind();
  try {
    await openDB(); await loadCfg(); await reloadAll();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  } catch (e) {
    document.body.insertBefore(el('div', { class: 'banner', text: 'تعذّر فتح قاعدة البيانات. تأكد أن المتصفح لا يعمل في وضع التصفح الخاص.' }), document.body.firstChild);
    return;
  }
  setInterval(function () { if (CUR_VIEW === 'scan' && !$('modalRoot').firstChild && $('todayLabel').textContent !== longDate(dateStr())) refreshScan(); }, 60000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
}
init();
