/* ============================================================================
   TESR Ledger — Frontend v2.0.0
   ขั้นตอน: ใคร → มีใบเสร็จไหม → หมวดหมู่ → รายละเอียด (ใบเสร็จ/สลิป หรือ ใบปะหน้า) → ตรวจสอบ PDF → บันทึก
   ข้อมูลอ้างอิง: staff.csv (พนักงาน+ลายเซ็น) และ categories.csv (หมวดหมู่ = โฟลเดอร์ใน Drive) ในโฟลเดอร์เดียวกับไฟล์นี้
============================================================================ */
const APP_VERSION = '2.1.0';
const LS = { apiUrl: 'tl2.apiUrl', token: 'tl2.token', autoAI: 'tl2.autoAI', auth: 'tl2.auth', sigmap: 'tl2.sigmap', who: 'tl2.who', other: 'tl2.other', sig: 'tl2.sig.', pay: 'tl2.pay.', boot: 'tl2.boot', staff: 'tl2.csv.staff', cats: 'tl2.csv.cats' };
const DEFAULT_STAFF_CSV = 'ชื่อเล่น,ชื่อ-นามสกุล,แผนก,ไฟล์ลายเซ็น,บทบาท\nฝ้าย,อานนท์ หม้อสุวรรณ,ผู้บริหาร,signatures/anon.png,approver\nซัน,สุริยา ดีคง,Engineer,signatures/sun.png,staff\nโอ๊ต,เกียรติกานต์ แจ้งนาม,Engineer,signatures/oat.png,staff\nจู,,Admin / เลขา / บัญชี,signatures/ju.png,staff\nพีค,,Engineer,signatures/peak.png,staff\nฟาม,,Engineer,signatures/farm.png,staff\nเด็กฝึกงาน,,Intern,,intern';
const DEFAULT_CATS_CSV = 'หมวดหมู่,โฟลเดอร์ใน Drive,ประเภทในใบปะหน้า,ตัวอย่าง\nค่าสินค้า (ซื้อมาขายไป),ค่าสินค้า (ซื้อมาขายไป),ค่าสินค้าและบริการ,สินค้าที่ซื้อมาเพื่อขายต่อ\nค่าสินค้า (วัตถุดิบผลิตสินค้า),ค่าสินค้า (วัตถุดิบผลิตสินค้า),ค่าสินค้าและบริการ,ชิ้นส่วน วัสดุ ที่นำไปประกอบเป็นสินค้า\nค่าสินค้า (วิจัยพัฒนา-ทดสอบ),ค่าสินค้า (วิจัยพัฒนา-ทดสอบ),ค่าสินค้าและบริการ,อุปกรณ์ทดลอง ต้นแบบ\nค่าสินค้า (ใช้ในสำนักงาน),ค่าสินค้า (ใช้ในสำนักงาน),ค่าสินค้าและบริการ,ของใช้ในออฟฟิศ\nค่าวัสดุสำนักงาน เครื่องเขียน สิ่งพิมพ์,ค่าวัสดุสำนักงาน เครื่องเขียน สิ่งพิมพ์,ค่าสินค้าและบริการ,กระดาษ ปากกา หมึกพิมพ์\nค่าโปรแกรม-ค่าสมัครสมาชิก,ค่าโปรแกรม-ค่าสมัครสมาชิก,ค่าสินค้าและบริการ,ซอฟต์แวร์ SaaS โดเมน คลาวด์\nค่าขนส่งสินค้า,ค่าขนส่งสินค้า,ค่าสินค้าและบริการ,ค่าส่งของ ค่าชิปปิ้ง\nใบเสร็จธนาคาร (สินเชื่อ),ใบเสร็จธนาคาร (สินเชื่อ),อื่นๆ,ใบเสร็จผ่อนชำระ ดอกเบี้ย\nค่าธรรมเนียมต่างๆ,ค่าธรรมเนียมต่างๆ,อื่นๆ,ค่าธรรมเนียมโอน ราชการ แพลตฟอร์ม\nค่าใช้จ่ายธุรกิจขนส่ง TESR Logistics,ค่าใช้จ่ายธุรกิจขนส่ง TESR Logistics,ค่าสินค้าและบริการ,น้ำมัน ทางด่วน ซ่อมรถ\nค่าเช่า (โกดัง และอื่นๆ),ค่าเช่า (โกดัง และอื่นๆ),อื่นๆ,ค่าเช่าโกดัง สำนักงาน\nค่าไฟฟ้า-น้ำประปา-โทรศัพท์-อินเตอร์เน็ต,ค่าไฟฟ้า-น้ำประปา-โทรศัพท์-อินเตอร์เน็ต,อื่นๆ,บิลสาธารณูปโภค\nค่าจ้าง-ค่าบริการ-ค่าตอบแทน,ค่าจ้าง-ค่าบริการ-ค่าตอบแทน,ค่าสินค้าและบริการ,จ้างช่าง ฟรีแลนซ์ วิทยากร\nค่าเดินทาง-ที่พัก,ค่าเดินทาง-ที่พัก,ค่าพาหนะ,แท็กซี่ น้ำมัน ทางด่วน ที่พัก\nค่าเลี้ยงรับรองลูกค้า,ค่าเลี้ยงรับรองลูกค้า,อื่นๆ,อาหาร ของขวัญ รับรองลูกค้า\nสวัสดิการพนักงาน,สวัสดิการพนักงาน,อื่นๆ,อาหารทีม งานเลี้ยง\nอื่นๆ,อื่นๆ,อื่นๆ,รายการที่ไม่เข้าหมวดด้านบน';
const CT_LABEL = { 'ค่าพาหนะ': 'ระบุหมายเลขทะเบียน (ถ้ามี)', 'ค่าสินค้าและบริการ': 'สาเหตุที่ไม่มีใบเสร็จ', 'อื่นๆ': 'ระบุ' };
const CT_PH = { 'ค่าพาหนะ': 'เช่น 1กข 1234 กทม. หรือ Grab', 'ค่าสินค้าและบริการ': 'เช่น สินค้าใน Taobao / ร้านไม่ออกใบเสร็จ', 'อื่นๆ': 'เช่น ค่าธรรมเนียมโอน' };

const state = {
  apiUrl: '', token: '', autoAI: true, cfg: {}, recent: [], summary: null, auth: null,
  staff: [], cats: [], approver: null,
  step: 1, view: 'wiz',
  who: null,                 // { nick, fullName, dept, sig, custom }
  hasReceipt: null, cat: null,
  files: { receipt: [], pay: [], fx: [], other: [] },
  ai: null, aiRunning: false,
  items: [{ desc: '', amount: '' }],
  coverType: '', pay: '',
  pages: [], pdf: null, pdfUrl: '',
  listFilter: 'mine',
};

/* ---------- utils ---------- */
const $ = id => document.getElementById(id);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const money = n => num(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const thDate = iso => /^\d{4}-\d{2}-\d{2}/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + (+iso.slice(0, 4) + 543) : (iso || '');
const thDateLong = iso => { if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return iso || ''; const m = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']; return (+iso.slice(8, 10)) + ' ' + m[+iso.slice(5, 7) - 1] + ' ' + (+iso.slice(0, 4) + 543); };
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* เต็มหรือปิดอยู่ */ } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
function bahtText(value) {
  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'], units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const grp = g => { if (g === 0) return ''; const s = String(g), len = s.length; let o = ''; for (let i = 0; i < len; i++) { const d = +s[i], pos = len - 1 - i; if (!d) continue; if (pos === 0) o += (d === 1 && len > 1) ? 'เอ็ด' : digits[d]; else if (pos === 1) o += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : digits[d] + 'สิบ'; else o += digits[d] + units[pos]; } return o; };
  const n = r2(Math.abs(num(value))), baht = Math.floor(n), st = Math.round((n - baht) * 100);
  let t = ''; if (baht === 0) t = 'ศูนย์'; else { const gs = []; let b = baht; while (b > 0) { gs.unshift(b % 1000000); b = Math.floor(b / 1000000); } t = gs.map((g, i) => grp(g) + (i < gs.length - 1 ? 'ล้าน' : '')).join(''); }
  return t + 'บาท' + (st ? grp(st) + 'สตางค์' : 'ถ้วน');
}
let toastT;
function toast(msg, kind) { const el = $('toast'); el.textContent = msg; el.className = 'toast on ' + (kind || ''); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), kind === 'err' ? 5000 : 3000); }
function busy(on, text) { $('busy').classList.toggle('on', !!on); if (text) $('busyText').textContent = text; }
function openOv(id) { $(id).classList.add('on'); } function closeOv(id) { $(id).classList.remove('on'); }
function ask(title, html, yes) { return new Promise(res => { $('askTitle').textContent = title; $('askBody').innerHTML = html; $('askYes').textContent = yes || 'ตกลง'; const done = v => { closeOv('ovAsk'); $('askYes').onclick = null; $('askNo').onclick = null; res(v); }; $('askYes').onclick = () => done(true); $('askNo').onclick = () => done(false); openOv('ovAsk'); }); }
function setSync(kind, title) { const d = $('syncDot'); d.className = 'dot ' + (kind || ''); d.title = title || ''; }
function banner(kind, k, html) { return '<div class="banner ' + (kind || '') + '"><span class="k">' + esc(k) + '</span><div>' + html + '</div></div>'; }

async function api(action, payload, opts) {
  if (!state.apiUrl) throw new Error('ยังไม่ได้ตั้งค่า URL ระบบหลังบ้าน');
  if (loginRequired() && !(await ensureAuth())) throw new Error('กรุณาเข้าสู่ระบบด้วย Google ก่อน');
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 45000);
  let res;
  try { res = await fetch(state.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, token: state.token, idToken: state.auth ? state.auth.token : '' }, payload || {})), signal: ctrl.signal }); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'เซิร์ฟเวอร์ตอบช้าเกินไป' : 'เชื่อมต่อไม่ได้ — ตรวจอินเทอร์เน็ตหรือ URL'); }
  finally { clearTimeout(t); }
  const text = await res.text(); let json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON — ตรวจว่า Deploy เป็น Web app (Anyone) และใช้ URL /exec'); }
  if (!json.ok) { if (json.code === 'login') { clearAuth(); showGate(json.error); } throw new Error(json.error || 'ไม่ทราบสาเหตุ'); }
  return json;
}

/* ---------- Google login (Google Identity Services) ---------- */
function loginRequired() { return !!CONFIG.LOGIN_REQUIRED; }
function decodeJwt(t) { try { const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(Array.from(atob(p)).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''))); } catch (e) { return null; } }
function loadAuth() { const a = JSON.parse(lsGet(LS.auth) || 'null'); state.auth = a && a.exp * 1000 > Date.now() + 30000 ? a : null; return state.auth; }
function clearAuth() { state.auth = null; lsDel(LS.auth); }
let gisReady = false, gisWaiters = [];
function gisInit() {
  if (gisReady || !window.google || !google.accounts || !google.accounts.id || !CONFIG.GOOGLE_CLIENT_ID) return false;
  google.accounts.id.initialize({ client_id: CONFIG.GOOGLE_CLIENT_ID, callback: onCredential, auto_select: true, itp_support: true, use_fedcm_for_prompt: true });
  gisReady = true; return true;
}
function onCredential(resp) {
  const info = decodeJwt(resp && resp.credential);
  if (!info || !info.email) { $('gateMsg').innerHTML = banner('err', 'ล้มเหลว', 'อ่านข้อมูลบัญชีไม่ได้ ลองใหม่'); gisWaiters.splice(0).forEach(f => f(false)); return; }
  const email = String(info.email).toLowerCase();
  if (CONFIG.ALLOWED_EMAILS.length && !CONFIG.ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    $('gateMsg').innerHTML = banner('err', 'ไม่อนุญาต', 'บัญชี <b>' + esc(email) + '</b> ไม่ได้รับอนุญาตให้ใช้ระบบนี้ — เข้าสู่ระบบด้วยบัญชี Gmail ของบริษัท');
    try { google.accounts.id.disableAutoSelect(); } catch (e) { /* ignore */ }
    gisWaiters.splice(0).forEach(f => f(false)); return;
  }
  state.auth = { token: resp.credential, email: email, name: info.name || '', picture: info.picture || '', exp: info.exp };
  lsSet(LS.auth, JSON.stringify(state.auth));
  gisWaiters.splice(0).forEach(f => f(true));
  if (state.view === 'login') afterLogin();
}
/** มี token ที่ยังไม่หมดอายุ → true · หมดอายุ → ขอต่ออายุแบบเงียบ (One Tap) ไม่สำเร็จ → แสดงหน้าเข้าสู่ระบบ */
async function ensureAuth() {
  if (state.auth && state.auth.exp * 1000 > Date.now() + 30000) return true;
  if (!gisInit() && !gisReady) { showGate(); return false; }
  const ok = await new Promise(res => { gisWaiters.push(res); try { google.accounts.id.prompt(n => { if (n.isNotDisplayed && n.isNotDisplayed() || n.isSkippedMoment && n.isSkippedMoment()) { gisWaiters.splice(gisWaiters.indexOf(res), 1); res(false); } }); } catch (e) { res(false); } setTimeout(() => { const i = gisWaiters.indexOf(res); if (i >= 0) { gisWaiters.splice(i, 1); res(false); } }, 12000); });
  if (!ok) showGate('การเข้าสู่ระบบหมดอายุ — เข้าสู่ระบบอีกครั้ง');
  return ok;
}
function showGate(msg) {
  state.view = 'login'; $$('.view').forEach(x => x.classList.toggle('on', x.id === 'view-login')); $$('.tabs button').forEach(b => b.classList.remove('on'));
  $('stepper').hidden = true; renderNav();
  $('gateMsg').innerHTML = msg ? banner('warn', 'แจ้ง', esc(msg)) : '';
  if (!CONFIG.GOOGLE_CLIENT_ID) { $('gateMsg').innerHTML = banner('err', 'ตั้งค่า', 'ผู้ดูแลยังไม่ได้ใส่ <b>GOOGLE_CLIENT_ID</b> ใน index.html (CONFIG) — ดูวิธีสร้างใน README ข้อ 2.3'); return; }
  const tryRender = (n) => {
    if (gisInit()) { $('gsiBtn').innerHTML = ''; google.accounts.id.renderButton($('gsiBtn'), { theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', width: 280, locale: 'th' }); try { google.accounts.id.prompt(); } catch (e) { /* One Tap ไม่พร้อม */ } }
    else if (n < 60) setTimeout(() => tryRender(n + 1), 250);
    else $('gateMsg').innerHTML = banner('err', 'โหลดไม่ได้', 'โหลดสคริปต์ Google Sign-In ไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วรีเฟรช');
  };
  tryRender(0);
}
async function afterLogin() {
  $('stepper').hidden = false; state.view = 'wiz'; showView('wiz'); goStep(1); renderSetupBanner();
  if (state.apiUrl) await refresh();
}
function logout() { try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { /* ignore */ } clearAuth(); closeOv('ovSettings'); showGate('ออกจากระบบแล้ว'); }

/* ---------- CSV data (staff / categories) ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  text = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim())).map(r => r.map(v => String(v).trim()));
}
async function loadCSV(file, lsKey, fallback) {
  try {
    const res = await fetch(file + '?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    if (!text.trim()) throw new Error('empty');
    lsSet(lsKey, text); return text;
  } catch (e) { return lsGet(lsKey) || fallback; }
}
/** ลายเซ็น: ใช้ไฟล์ใน signatures/ ก่อน ถ้าไม่มีไฟล์ใช้ข้อมูล base64 จาก signatures.json (ค่าเป็นสตริงเดียว หรืออาร์เรย์ของท่อนสตริงที่นำมาต่อกัน) */
async function loadSigMap() {
  try {
    const res = await fetch('signatures.json?v=' + Date.now(), { cache: 'no-store' }); if (!res.ok) throw new Error(res.status);
    const map = await res.json();
    Object.keys(map).forEach(k => { if (Array.isArray(map[k])) map[k] = map[k].join(''); });
    lsSet(LS.sigmap, JSON.stringify(map)); return map;
  } catch (e) { return JSON.parse(lsGet(LS.sigmap) || '{}'); }
}
async function resolveSig(path, map) {
  if (!path) return '';
  if (/^data:/.test(path)) return path;
  try { const res = await fetch(path, { method: 'HEAD', cache: 'no-store' }); if (res.ok) return path; } catch (e) { /* ไม่มีไฟล์ */ }
  return map[path] || map[path.replace(/^\.?\//, '')] || '';
}
async function loadData(force) {
  const [st, ct, sigMap] = await Promise.all([loadCSV('staff.csv', LS.staff, DEFAULT_STAFF_CSV), loadCSV('categories.csv', LS.cats, DEFAULT_CATS_CSV), loadSigMap()]);
  state.staff = parseCSV(st).slice(1).map(r => ({ nick: r[0], fullName: r[1] || '', dept: r[2] || '', sig: r[3] || '', role: (r[4] || 'staff').toLowerCase() })).filter(p => p.nick);
  await Promise.all(state.staff.map(async p => { p.sig = await resolveSig(p.sig, sigMap); }));
  state.approver = state.staff.find(p => p.role === 'approver') || { nick: 'ฝ้าย', fullName: 'อานนท์ หม้อสุวรรณ', dept: 'ผู้บริหาร', sig: 'signatures/anon.png', role: 'approver' };
  state.cats = parseCSV(ct).slice(1).map(r => ({ name: r[0], folder: r[1] || r[0], coverType: r[2] || 'ค่าสินค้าและบริการ', hint: r[3] || '' })).filter(c => c.name);
  renderWho(); renderCats();
  const depts = [...new Set(state.staff.map(p => p.dept).filter(Boolean))]; $('deptList').innerHTML = depts.map(d => '<option value="' + esc(d) + '">').join('');
  if (force) toast('โหลดรายชื่อ ' + state.staff.length + ' คน · หมวดหมู่ ' + state.cats.length + ' รายการ', 'ok');
}

/* ---------- wizard navigation ---------- */
const STEP_TITLES = { 1: 'ใคร', 2: 'ใบเสร็จ', 3: 'หมวด', 4: 'รายละเอียด', 5: 'ตรวจ' };
function goStep(n) {
  state.step = n;
  $$('.step').forEach(s => s.classList.remove('on'));
  $(n === 'done' ? 'stepDone' : 'step' + n).classList.add('on');
  $$('#stepper div').forEach(d => { const s = +d.dataset.s; d.className = n === 'done' ? 'done' : s < n ? 'done' : s === n ? 'cur' : ''; });
  renderNav();
  window.scrollTo({ top: 0 });
  if (n === 4) renderStep4();
  if (n === 5) buildPreview();
}
function renderNav() {
  const back = $('btnBack'), fwd = $('btnFwd'); const n = state.step;
  document.querySelector('.navbar').hidden = state.view === 'login';
  back.hidden = (n === 1 || n === 'done' || state.view !== 'wiz'); fwd.hidden = (state.view !== 'wiz' || n === 'done');
  fwd.className = 'btn ' + (n === 5 ? 'btn-crimson' : 'btn-gold');
  fwd.textContent = n === 1 ? 'ถัดไป →' : n === 2 ? 'เลือกด้านบน' : n === 3 ? 'เลือกหมวดด้านบน' : n === 4 ? 'ตรวจสอบเอกสาร →' : 'ยืนยันและบันทึก ✓';
  fwd.disabled = (n === 1 && !whoReady()) || (n === 2 && !state.hasReceipt) || (n === 3 && !state.cat);
  back.textContent = n === 5 ? '← แก้ไข' : '← กลับ';
}
function whoReady() {
  if (!state.who) return false;
  if (state.who.custom) return !!($('oName').value.trim() && $('oDept').value.trim());
  return true;
}
async function forward() {
  const n = state.step;
  if (n === 1) { if (!commitWho()) return; goStep(2); }
  else if (n === 2) { if (state.hasReceipt) goStep(3); }
  else if (n === 3) { if (state.cat) goStep(4); }
  else if (n === 4) { if (validateStep4()) goStep(5); }
  else if (n === 5) approve();
}
function backward() { const n = state.step; if (n > 1 && n !== 'done') goStep(n - 1); }

/* ---------- step 1: who ---------- */
function renderWho() {
  const last = lsGet(LS.who);
  const people = state.staff.filter(p => p.role !== 'approver' || true);
  $('whoGrid').innerHTML = people.map(p => '<button type="button" data-n="' + esc(p.nick) + '" class="' + (p.role === 'intern' || p.role === 'other' ? 'other' : '') + '"><b>' + esc(p.nick) + '</b><small>' + esc([p.fullName, p.dept].filter(Boolean).join(' · ') || (p.role === 'intern' ? 'ระบุชื่อในขั้นถัดไป' : '')) + '</small></button>').join('') +
    '<button type="button" data-n="__other" class="other"><b>คนอื่นๆ</b><small>พิมพ์ชื่อและแผนกเอง</small></button>';
  $$('#whoGrid button').forEach(b => b.onclick = () => pickWho(b.dataset.n));
  if (last && (people.some(p => p.nick === last) || last === '__other')) pickWho(last, true);
}
function pickWho(nick, silent) {
  $$('#whoGrid button').forEach(b => b.classList.toggle('on', b.dataset.n === nick));
  const p = state.staff.find(x => x.nick === nick);
  const custom = nick === '__other' || (p && (p.role === 'intern' || p.role === 'other'));
  state.who = { nick: nick, fullName: p ? p.fullName : '', dept: p ? p.dept : '', sig: p ? p.sig : '', role: p ? p.role : 'other', custom: custom, drawn: '' };
  $('otherBox').classList.toggle('hidden', !custom);
  if (custom) {
    const saved = JSON.parse(lsGet(LS.other) || '{}');
    if (!silent || !$('oName').value) { $('oName').value = saved.name || ''; $('oDept').value = saved.dept || (p ? p.dept : ''); }
  }
  renderSig();
  renderNav();
  lsSet(LS.who, nick);
}
function sigKey() { const w = state.who; if (!w) return ''; return LS.sig + (w.custom ? ($('oName').value.trim() || w.nick) : w.nick); }
function renderSig() {
  const w = state.who; const box = $('sigBox'); if (!w) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const drawn = lsGet(sigKey()) || '';
  w.drawn = drawn;
  const src = drawn || w.sig;
  $('sigHave').classList.toggle('hidden', !src); $('sigPadWrap').classList.add('hidden');
  if (src) { $('sigHaveImg').src = src; $('sigHint').textContent = drawn ? '(เซ็นไว้ในเครื่องนี้)' : '(จากไฟล์ใน GitHub)'; }
  else $('sigHint').textContent = '— ยังไม่มี วาดหรืออัปโหลดได้ หรือเว้นไว้เซ็นบนกระดาษ';
}
function commitWho() {
  const w = state.who; if (!w) { toast('เลือกชื่อผู้บันทึกก่อน', 'err'); return false; }
  if (w.custom) {
    const name = $('oName').value.trim(), dept = $('oDept').value.trim();
    if (!name || !dept) { toast('กรอกชื่อ-นามสกุลและแผนก', 'err'); return false; }
    w.fullName = name; w.dept = dept; if (w.nick === '__other') w.nick = name.split(/\s+/).filter(x => !/^(นาย|นาง|นางสาว|น\.ส\.)$/.test(x))[0] || name;
    lsSet(LS.other, JSON.stringify({ name: name, dept: dept }));
  }
  w.drawn = lsGet(sigKey()) || '';
  $('hdrSub').textContent = 'บันทึกโดย ' + w.nick;
  state.pay = lsGet(LS.pay + w.nick) || '';
  return true;
}
/* signature pad */
const pad = { ctx: null, drawing: false, last: null, dirty: false };
function padInit() {
  const c = $('sigPad'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.clientWidth || 600, h = 170; c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1B2A7A';
  pad.ctx = ctx; pad.dirty = false; pad.w = w; pad.h = h;
  const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  c.onpointerdown = e => { e.preventDefault(); c.setPointerCapture(e.pointerId); pad.drawing = true; pad.last = pos(e); ctx.beginPath(); ctx.moveTo(pad.last.x, pad.last.y); ctx.lineTo(pad.last.x + .1, pad.last.y); ctx.stroke(); pad.dirty = true; };
  c.onpointermove = e => { if (!pad.drawing) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(pad.last.x, pad.last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); pad.last = p; };
  c.onpointerup = c.onpointercancel = e => { pad.drawing = false; if (pad.dirty) padSave(); };
}
function padSave() {
  const c = $('sigPad'); const ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { if (d[(y * c.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 <= x0) return;
  const pad2 = 10; const out = document.createElement('canvas'); out.width = x1 - x0 + pad2 * 2; out.height = y1 - y0 + pad2 * 2;
  out.getContext('2d').drawImage(c, x0 - pad2, y0 - pad2, out.width, out.height, 0, 0, out.width, out.height);
  const url = out.toDataURL('image/png'); lsSet(sigKey(), url); state.who.drawn = url;
}
function padClear() { const c = $('sigPad'); c.getContext('2d').clearRect(0, 0, c.width, c.height); pad.dirty = false; }

/* ---------- step 2 / 3 ---------- */
function pickReceipt(v) {
  state.hasReceipt = v; $$('#step2 .choice').forEach(b => b.classList.toggle('on', b.dataset.r === v));
  renderNav(); setTimeout(() => goStep(3), 120);
}
function renderCats() {
  $('catList').innerHTML = state.cats.map((c, i) => '<button type="button" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span><b>' + esc(c.name) + '</b>' + (c.hint ? '<small>' + esc(c.hint) + '</small>' : '') + '</span></button>').join('');
  $$('#catList button').forEach(b => b.onclick = () => { state.cat = state.cats[+b.dataset.i]; $$('#catList button').forEach(x => x.classList.toggle('on', x === b)); renderNav(); setTimeout(() => goStep(4), 120); });
}

