/* ============================================================================
   TESR Ledger — Backend (Google Apps Script)   v2.4.0 · กันยายน 2026
   ----------------------------------------------------------------------------
   หน้าที่ (หลังบ้านของ index.html)
   · รับเอกสาร PDF ที่แอปรวมให้แล้ว (ใบปะหน้า + ใบเสร็จ + สลิป) → เก็บลง Google Drive
     ตามโฟลเดอร์ ปี / เดือน / หมวดค่าใช้จ่าย  ชื่อไฟล์ = วันที่_เลขรายการ_ผู้บันทึก_ผู้ขาย_ยอด.pdf
   · บันทึก 1 แถวต่อรายการใน "ชีตของเดือนนั้น" (ชื่อชีต = ปี-เดือน เช่น 2026-09 · สร้างให้อัตโนมัติ
     จากชีตแม่แบบเมื่อมีรายการแรกของเดือน) — เดือนละชีต ตรวจสอบง่าย ไม่ปนกัน · ลิงก์ PDF แสดงเป็นชื่อไฟล์
   · AI Vision (OpenAI) อ่านสลิปโอนเงินออกจากบริษัท → ประเภทเอกสาร ผู้โอน ผู้รับ ยอด วันที่ เวลา Transaction ID
     บันทึกช่วยจำ ธนาคารปลายทาง → เก็บในคอลัมน์ W–AF ของชีตเดือน และรวมเป็นทะเบียน "โอนเงินออก" (สูตร QUERY ข้ามทุกเดือน)
   · Dashboard รายเดือน ตามหมวด ตามผู้บันทึก รอตรวจ · แจ้งเตือนอีเมล
   · ตรวจการเข้าสู่ระบบด้วย Google: รับ ID token จากแอป → ตรวจกับ Google → อนุญาตเฉพาะอีเมลใน ALLOWED_EMAILS

   รายชื่อพนักงานและหมวดหมู่อยู่ในไฟล์ staff.csv / categories.csv บน GitHub (คู่กับ index.html)
   ไม่ต้องแก้ในชีต

   ติดตั้ง
   1) Google Sheet ใหม่ → ส่วนขยาย → Apps Script → วางไฟล์นี้ทับ Code.gs → บันทึก
   2) รัน setup() หนึ่งครั้ง (อนุญาตสิทธิ์) — รันซ้ำได้ ไม่ทับข้อมูล (ถ้ามีชีต "รายจ่าย" แบบเดิม จะย้ายแถวไปชีตรายเดือนให้)
   3) Deploy → New deployment → Web app → Execute as: Me · Access: Anyone → คัดลอก URL /exec ใส่ index.html (CONFIG.API_URL)

   Script Properties (Project Settings → Script properties)
   · APP_TOKEN        รหัสผ่านร่วมของทีม (ไม่ตั้ง = ไม่ตรวจ)
   · OPENAI_API_KEY   คีย์ OpenAI สำหรับอ่านสลิป (ไม่ตั้ง = ปิด AI)
   ชีต "ตั้งค่า": GOOGLE_CLIENT_ID (OAuth Client ID เดียวกับใน index.html) และ ALLOWED_EMAILS
============================================================================ */

const APP = { name: 'TESR Ledger', version: '2.4.0' };
const TZ = 'Asia/Bangkok';
// โฟลเดอร์หลักใน Google Drive ที่เก็บ PDF ทั้งหมด (โครงสร้างใต้โฟลเดอร์นี้ = ปี / เดือน / หมวดหมู่ / ไฟล์)
// ค่านี้คือโฟลเดอร์ "ทดสอบระบบ 2026" — ถ้าตั้งไว้ ค่านี้ชนะค่าในชีตตั้งค่าเสมอ · บัญชีที่ Deploy Apps Script ต้องมีสิทธิ์แก้ไขโฟลเดอร์นี้ · เว้นว่างถ้าจะใช้ค่าในชีตตั้งค่า/ให้ setup สร้างโฟลเดอร์ใหม่เอง
const ROOT_FOLDER_ID = '1DKx1bDgjIlgbhXJ328N1dX8n91ibY5YM';
const AUTO_FOLDER_NAME = 'TESR Ledger — หลักฐานรายจ่าย';
const SHEET = { SET: 'ตั้งค่า', DASH: 'Dashboard', REG: 'โอนเงินออก', TPL: 'แม่แบบ', LEGACY: 'รายจ่าย' };   // ชีตรายเดือนชื่อ ปี-เดือน เช่น 2026-09

// คอลัมน์ของชีตรายเดือน (A → AE) — ห้ามสลับ Dashboard/ทะเบียนอ้างอิงตามตัวอักษรคอลัมน์ (v2.4 ตัดคอลัมน์ "สถานะเบิกคืน" ออก)
const HEADERS = [
  'ID', 'บันทึกเมื่อ', 'วันที่จ่าย', 'งวด', 'ผู้บันทึก',                         // A-E
  'ชื่อ-นามสกุล', 'แผนก', 'ใบเสร็จ', 'หมวดหมู่', 'รายละเอียด',                 // F-J
  'ร้าน/ผู้รับเงิน', 'จำนวนเงิน (บาท)', 'จ่ายโดย', 'เอกสาร PDF',                  // K-N
  'จำนวนหน้า', 'สถานะบัญชี', 'หมายเหตุผู้บันทึก', 'หมายเหตุบัญชี', 'ผู้อนุมัติ',    // O-S
  'ประเภท/เหตุผล (ใบปะหน้า)', 'บัญชี Google ที่ล็อกอิน',                       // T-U
  'ประเภทเอกสาร (สลิป)', 'ชื่อผู้โอน', 'ชื่อผู้รับเงิน (สลิป)', 'จำนวนเงินตามสลิป', 'วันที่โอนเงิน',   // V-Z  ← ข้อมูลจากสลิป (AI Vision)
  'เวลาโอนเงิน', 'Transaction ID', 'บันทึกช่วยจำ (สลิป)', 'โอนเข้าธนาคาร', 'ลิงก์ PDF',           // AA-AE
];
const LEGACY_REIMB_HEADER = 'สถานะเบิกคืน';   // คอลัมน์ N ของเวอร์ชันก่อน — setup จะลบออกจากชีตเดิมให้
const COL = { ID: 0, TS: 1, DATE: 2, PERIOD: 3, BY: 4, FULLNAME: 5, DEPT: 6, RECEIPT: 7, CAT: 8, DESC: 9, VENDOR: 10, AMOUNT: 11, PAY: 12, PDF: 13, PAGES: 14, STATUS: 15, NOTE: 16, ACCNOTE: 17, APPROVER: 18, COVER: 19, LOGIN: 20,
  STYPE: 21, SPAYER: 22, SPAYEE: 23, SAMOUNT: 24, SDATE: 25, STIME: 26, SREF: 27, SMEMO: 28, SBANK: 29, URL: 30 };
const ROW_FORMATS = HEADERS.map((h, i) => i === COL.TS ? 'yyyy-mm-dd hh:mm' : i === COL.DATE ? 'yyyy-mm-dd' : i === COL.AMOUNT || i === COL.SAMOUNT ? '#,##0.00' : i === COL.PAGES ? '0' : '@');

const RECEIPT = { YES: 'มีใบเสร็จ', NO: 'ไม่มีใบเสร็จ (ใบปะหน้า)' };
const PAY = { COMPANY: 'บริษัท', PERSONAL: 'ส่วนตัว (ขอเบิกคืน)' };
const STATUS = { NEW: 'รอตรวจ', CHECKED: 'ตรวจแล้ว', DONE: 'บันทึกบัญชีแล้ว', RETURNED: 'ตีกลับ' };

const DEFAULT_SETTINGS = [
  ['COMPANY_NAME', 'บริษัท ไทยเอ็มเบดเด็ดซิสเต็มแอนด์โรโบติกส์ จำกัด', 'ชื่อบริษัท (แสดงในแอปและอีเมล)'],
  ['COMPANY_TAX_ID', '0125563024218', 'เลขผู้เสียภาษีบริษัท'],
  ['APPROVER_NAME', 'อานนท์ หม้อสุวรรณ', 'ชื่อผู้อนุมัติที่บันทึกในชีต (ลายเซ็นและชื่อบนใบปะหน้าใช้จาก staff.csv บทบาท approver)'],
  ['RECEIPT_FOLDER_ID', ROOT_FOLDER_ID, 'ID โฟลเดอร์ Google Drive หลัก — ถูกกำหนดจาก ROOT_FOLDER_ID ใน Code.gs (แก้ที่โค้ด ค่าในชีตนี้ใช้เมื่อโค้ดเว้นว่างเท่านั้น)'],
  ['RECEIPT_SHARE', 'private', 'private = เฉพาะคนที่ได้รับแชร์โฟลเดอร์ · link = ทุกคนที่มีลิงก์เปิดดูได้'],
  ['DRIVE_LAYOUT', 'month', 'โครงสร้างโฟลเดอร์: month = ปี/เดือน/หมวดหมู่ · day = ปี/เดือน/วัน/หมวดหมู่'],
  ['RECENT_LIMIT', 200, 'จำนวนรายการล่าสุดที่แอปโหลด'],
  ['NOTIFY_MODE', 'none', 'none = ไม่แจ้ง · each = อีเมลทุกรายการ · daily = สรุปรายวัน 18:00 (รัน installTriggers ก่อน)'],
  ['NOTIFY_EMAIL', '', 'อีเมลฝ่ายบัญชี (หลายคนคั่นด้วย ,)'],
  ['AI_OCR', 'on', 'on = ให้ AI (OpenAI) อ่านสลิปโอนเงิน · off = ปิด — ต้องมี OPENAI_API_KEY ใน Script Properties'],
  ['AI_MODEL', 'gpt-5-mini', 'โมเดล OpenAI ที่ใช้อ่านสลิป (ต้องรองรับรูปภาพ)'],
  ['GOOGLE_CLIENT_ID', '', 'OAuth Client ID (Web) ตัวเดียวกับใน index.html — ใส่แล้วทุกคำขอต้องล็อกอิน Google (ว่าง = ไม่ตรวจ)'],
  ['ALLOWED_EMAILS', 'ceo.anoney.potter@gmail.com, anoney.potter@gmail.com, tesrshop@gmail.com', 'บัญชี Google ที่ใช้ระบบได้ (คั่นด้วย ,)'],
];

// ============================================================ Web app entry
function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: 'รูปแบบข้อมูลไม่ถูกต้อง (JSON)' }); }
  return handle_(body);
}

function handle_(req) {
  try {
    const action = str_(req.action) || 'ping';
    if (action === 'ping') return json_({ ok: true, app: APP.name, version: APP.version, rootFolder: ROOT_FOLDER_ID, time: now_() });
    auth_(req.token);
    const login = verifyGoogle_(req.idToken);   // null = ไม่ได้เปิดใช้การล็อกอิน
    switch (action) {
      case 'bootstrap': return json_(bootstrap_(req, login));
      case 'recent':    return json_({ ok: true, recent: recentFromScan_(scan_(), num_(req.limit) || 200) });
      case 'summary':   return json_({ ok: true, summary: summaryFromScan_(scan_(), str_(req.period)) });
      case 'submit':    return json_(submit_(req, login));
      case 'read_slip': return json_({ ok: true, slip: readSlip_(req) });
      default: throw new Error('ไม่รู้จัก action: ' + action);
    }
  } catch (err) {
    const msg = String((err && err.message) || err);
    return json_({ ok: false, error: msg, code: /^LOGIN:/.test(msg) ? 'login' : '' });
  }
}

// ============================================================ Google login (ID token → ตรวจกับ Google → เช็กอีเมล)
function allowedEmails_(s) { return str_(s.ALLOWED_EMAILS).split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean); }
function verifyGoogle_(idToken) {
  const s = settings_();
  const clientId = str_(s.GOOGLE_CLIENT_ID);
  if (!clientId) return null;                                       // ยังไม่เปิดใช้การล็อกอิน (ใช้ APP_TOKEN อย่างเดียว)
  idToken = str_(idToken);
  if (!idToken) throw new Error('LOGIN: กรุณาเข้าสู่ระบบด้วย Google ก่อนใช้งาน');
  const cache = CacheService.getScriptCache();
  const key = 'tok:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken)).slice(0, 60);
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('LOGIN: การเข้าสู่ระบบหมดอายุหรือไม่ถูกต้อง — เข้าสู่ระบบใหม่');
  const info = safeJson_(res.getContentText());
  if (str_(info.aud) !== clientId) throw new Error('LOGIN: token ไม่ตรงกับแอปนี้ (GOOGLE_CLIENT_ID)');
  if (String(info.email_verified) !== 'true') throw new Error('LOGIN: บัญชีนี้ยังไม่ยืนยันอีเมล');
  const email = str_(info.email).toLowerCase();
  const allowed = allowedEmails_(s);
  if (allowed.length && allowed.indexOf(email) < 0) throw new Error('LOGIN: บัญชี ' + email + ' ไม่ได้รับอนุญาตให้ใช้ระบบนี้');
  const out = { email: email, name: str_(info.name), exp: num_(info.exp) };
  const ttl = Math.max(60, Math.min(1800, out.exp - Math.floor(Date.now() / 1000)));
  try { cache.put(key, JSON.stringify(out), ttl); } catch (e) { /* ข้ามแคช */ }
  return out;
}

function auth_(token) {
  const expected = props_().getProperty('APP_TOKEN');
  if (expected && str_(token) !== expected) throw new Error('รหัสเข้าใช้งาน (token) ไม่ถูกต้อง — ตรวจในหน้าตั้งค่าของแอป');
}

function bootstrap_(req, login) {
  const s = settings_();
  const scan = scan_();
  return {
    ok: true, app: APP, user: login || null,
    settings: {
      loginRequired: !!str_(s.GOOGLE_CLIENT_ID),
      companyName: str_(s.COMPANY_NAME), companyTaxId: str_(s.COMPANY_TAX_ID), approver: str_(s.APPROVER_NAME),
      ai: aiEnabled_(s), aiOn: str_(s.AI_OCR).toLowerCase() !== 'off', aiModel: str_(s.AI_MODEL) || 'gpt-5-mini',
      driveLayout: str_(s.DRIVE_LAYOUT).toLowerCase() === 'day' ? 'day' : 'month',
      sheetUrl: monthSheetUrl_(str_(req.period) || fmtDate_(new Date(), 'yyyy-MM')), tokenRequired: !!props_().getProperty('APP_TOKEN'),
      monthlySheets: true,
    },
    recent: recentFromScan_(scan, num_(s.RECENT_LIMIT) || 200),
    summary: summaryFromScan_(scan, str_(req.period) || fmtDate_(new Date(), 'yyyy-MM')),
  };
}

function aiEnabled_(s) { return str_(s.AI_OCR).toLowerCase() !== 'off' && !!props_().getProperty('OPENAI_API_KEY'); }

// ============================================================ Submit (PDF ที่รวมแล้ว + ข้อมูลรายการ)
function submit_(req, login) {
  const s = settings_();
  const by = str_(req.by);
  if (!by) throw new Error('ระบุชื่อผู้บันทึก');
  const dateStr = str_(req.date) || fmtDate_(new Date(), 'yyyy-MM-dd');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new Error('วันที่จ่ายไม่ถูกต้อง');
  const dateObj = parseDate_(dateStr);
  const amount = r2_(num_(req.amount));
  if (!(amount > 0)) throw new Error('ระบุยอดเงินให้ถูกต้อง');
  const category = str_(req.category);
  if (!category) throw new Error('เลือกหมวดหมู่');
  const folder = str_(req.folder) || category;
  const hasReceipt = req.hasReceipt === true || str_(req.hasReceipt) === 'true' || str_(req.hasReceipt) === 'Y';
  const pdf = req.pdf || {};
  if (!pdf.data) throw new Error('ไม่พบไฟล์ PDF — สร้างตัวอย่างเอกสารก่อนบันทึก');
  const pay = str_(req.pay) === PAY.PERSONAL ? PAY.PERSONAL : PAY.COMPANY;
  const vendor = str_(req.vendor);
  const desc = str_(req.desc);
  if (!hasReceipt && !desc) throw new Error('ระบุรายการค่าใช้จ่ายในใบปะหน้า');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let id, rowIndex, sheet;
  try {
    sheet = monthSheet_(dateStr.slice(0, 7), true);            // ชีตของเดือนที่จ่าย (สร้างใหม่ถ้ายังไม่มี)
    id = nextId_(dateStr.slice(0, 4));
    rowIndex = sheet.getLastRow() + 1;
    const row = new Array(HEADERS.length).fill('');
    row[COL.ID] = id;
    row[COL.TS] = new Date();
    row[COL.DATE] = dateObj;
    row[COL.PERIOD] = dateStr.slice(0, 7);
    row[COL.BY] = by;
    row[COL.FULLNAME] = str_(req.fullName);
    row[COL.DEPT] = str_(req.dept);
    row[COL.RECEIPT] = hasReceipt ? RECEIPT.YES : RECEIPT.NO;
    row[COL.CAT] = category;
    row[COL.DESC] = desc;
    row[COL.VENDOR] = vendor;
    row[COL.AMOUNT] = amount;
    row[COL.PAY] = pay;
    row[COL.PAGES] = num_(req.pages) || '';
    row[COL.STATUS] = STATUS.NEW;
    row[COL.NOTE] = str_(req.note);
    row[COL.APPROVER] = str_(req.approver) || str_(s.APPROVER_NAME);
    row[COL.COVER] = str_(req.coverType);
    row[COL.LOGIN] = login ? login.email : '';
    const slip = req.slip || {};                                   // ข้อมูลที่ AI Vision อ่านจากสลิป (ผู้ใช้ตรวจ/แก้แล้ว)
    row[COL.STYPE] = str_(slip.type); row[COL.SPAYER] = str_(slip.payer); row[COL.SPAYEE] = str_(slip.payee);
    row[COL.SAMOUNT] = num_(slip.amount) > 0 ? r2_(num_(slip.amount)) : '';
    row[COL.SDATE] = str_(slip.date); row[COL.STIME] = str_(slip.time); row[COL.SREF] = str_(slip.ref);
    row[COL.SMEMO] = str_(slip.memo); row[COL.SBANK] = str_(slip.bank);
    ensureColumns_(sheet);
    sheet.getRange(rowIndex, 1, 1, HEADERS.length).setNumberFormats([ROW_FORMATS]).setValues([row]);
  } finally { lock.releaseLock(); }

  // ---- PDF → Drive: ปี / เดือน / หมวดหมู่ / วันที่_ID_ผู้บันทึก_ผู้ขาย_ยอด.pdf
  const name = dateStr + '_' + id + '_' + slug_(by, 30) + (vendor ? '_' + slug_(vendor, 40) : '') + '_' + amount.toFixed(2) + '.pdf';
  const file = entryFolder_(s, folder, dateStr).createFile(Utilities.newBlob(Utilities.base64Decode(pdf.data), 'application/pdf', name));
  if (str_(s.RECEIPT_SHARE) === 'link') file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const link = { name: name, url: file.getUrl(), id: file.getId() };
  setLink_(sheet, rowIndex, COL.PDF, link);
  sheet.getRange(rowIndex, COL.URL + 1).setValue(link.url);

  const vals = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  const entry = rowToEntry_(vals, rowIndex, link, sheet.getName());
  try { notify_(entry, s); } catch (err) { /* ไม่กระทบการบันทึก */ }
  return { ok: true, entry: entry };
}

function nextId_(year) {
  const prefix = 'EXP-' + year + '-';
  let max = 0;
  monthSheets_().filter(sh => sh.getName().indexOf(year + '-') === 0).forEach(sh => {
    const last = sh.getLastRow();
    if (last >= 2) sh.getRange(2, 1, last - 1, 1).getValues().forEach(r => {
      const v = String(r[0]);
      if (v.indexOf(prefix) === 0) { const n = parseInt(v.slice(prefix.length), 10); if (n > max) max = n; }
    });
  });
  return prefix + String(max + 1).padStart(4, '0');
}

// ============================================================ ชีตรายเดือน (ชื่อ ปี-เดือน)
function isMonthName_(name) { return /^\d{4}-\d{2}$/.test(name); }
/** ชีตรายเดือนทั้งหมด เรียงจากเก่าไปใหม่ */
function monthSheets_() { return ss_().getSheets().filter(sh => isMonthName_(sh.getName())).sort((a, b) => a.getName() < b.getName() ? -1 : a.getName() > b.getName() ? 1 : 0); }
/** หาชีตของเดือน (ปี-เดือน) · create = true จะคัดลอกจากชีตแม่แบบแล้ววางถัดจาก Dashboard/ตั้งค่า (เดือนใหม่อยู่ซ้ายสุดของกลุ่มเดือน) */
function monthSheet_(period, create) {
  const ss = ss_();
  let sh = ss.getSheetByName(period);
  if (sh || !create) return sh;
  const tpl = ss.getSheetByName(SHEET.TPL) || buildTemplate_();
  sh = tpl.copyTo(ss).setName(period);
  sh.showSheet();
  orderSheets_();
  refreshDashboardMonths_();
  return sh;
}
/** จัดลำดับแท็บ: Dashboard · ตั้งค่า · ชีตเดือน (ใหม่ → เก่า) · ชีตที่ซ่อน (แม่แบบ/เดิม) อยู่ท้ายสุด */
function orderSheets_() {
  const ss = ss_();
  const put = (sh, pos) => { if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(pos); } };
  put(ss.getSheetByName(SHEET.DASH), 1);
  put(ss.getSheetByName(SHEET.REG), 2);
  put(ss.getSheetByName(SHEET.SET), 3);
  monthSheets_().reverse().forEach((sh, i) => put(sh, 4 + i));
}
function monthSheetUrl_(period) {
  const sh = monthSheet_(period, false);
  return ss_().getUrl() + (sh ? '#gid=' + sh.getSheetId() : '');
}
/** เติมคอลัมน์/หัวตารางที่ยังไม่มี (ชีตที่สร้างจากเวอร์ชันก่อนมี 22 คอลัมน์) */
function ensureColumns_(sheet) {
  const n = HEADERS.length;
  if (sheet.getMaxColumns() >= 14 && str_(sheet.getRange(1, 14).getValue()) === LEGACY_REIMB_HEADER) sheet.deleteColumn(14);   // v2.3 → v2.4: ลบ "สถานะเบิกคืน"
  if (sheet.getMaxColumns() < n) sheet.insertColumnsAfter(sheet.getMaxColumns(), n - sheet.getMaxColumns());
  const cur = sheet.getRange(1, 1, 1, n).getValues()[0];
  HEADERS.forEach((h, i) => { if (str_(cur[i]) !== h) sheet.getRange(1, i + 1).setValue(h); });
  styleHeader_(sheet, n);
  return sheet;
}
function readRows_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return { values: [], rich: [] };
  const legacyReimb = sheet.getMaxColumns() >= 14 && str_(sheet.getRange(1, 14).getValue()) === LEGACY_REIMB_HEADER;   // ชีตเวอร์ชันก่อน (ยังมีคอลัมน์ N)
  const nc = Math.min(HEADERS.length + (legacyReimb ? 1 : 0), sheet.getMaxColumns());
  const values = sheet.getRange(2, 1, last - 1, nc).getValues().map(r => { if (legacyReimb) r.splice(13, 1); while (r.length < HEADERS.length) r.push(''); return r; });
  const rich = sheet.getRange(2, COL.PDF + 1 + (legacyReimb ? 1 : 0), last - 1, 1).getRichTextValues();
  return { values: values, rich: rich };
}

// ============================================================ Drive
function receiptRoot_(s) {
  const fid = ROOT_FOLDER_ID || str_(s.RECEIPT_FOLDER_ID);          // โค้ดชนะชีต
  if (fid) {
    try { return DriveApp.getFolderById(fid); }
    catch (e) { if (fid === ROOT_FOLDER_ID) throw new Error('เปิดโฟลเดอร์หลัก (ROOT_FOLDER_ID) ไม่ได้ — แชร์โฟลเดอร์ให้บัญชีที่ Deploy Apps Script เป็นผู้แก้ไข'); /* ค่าในชีตใช้ไม่ได้ → สร้างใหม่ */ }
  }
  const folder = DriveApp.createFolder(AUTO_FOLDER_NAME);
  setSetting_('RECEIPT_FOLDER_ID', folder.getId());
  return folder;
}
/** ตอน setup: เขียน ROOT_FOLDER_ID ลงชีตตั้งค่าให้ตรงกับโค้ด และตรวจสิทธิ์เข้าโฟลเดอร์ (ถ้าเข้าไม่ได้จะ error ให้เห็นตอน setup เลย) */
function applyRootFolder_() {
  if (!ROOT_FOLDER_ID) return;
  const f = DriveApp.getFolderById(ROOT_FOLDER_ID);
  if (str_(settings_().RECEIPT_FOLDER_ID) !== ROOT_FOLDER_ID) setSetting_('RECEIPT_FOLDER_ID', ROOT_FOLDER_ID);
  SpreadsheetApp.getActive().toast('โฟลเดอร์หลักใน Drive: ' + f.getName(), APP.name, 6);
}
function entryFolder_(s, category, dateStr) {
  let f = childFolder_(receiptRoot_(s), dateStr.slice(0, 4));                          // ปี  เช่น 2026
  f = childFolder_(f, dateStr.slice(5, 7));                                             // เดือน เช่น 08
  if (str_(s.DRIVE_LAYOUT).toLowerCase() === 'day') f = childFolder_(f, dateStr.slice(8, 10)); // วัน (ถ้าเลือก day)
  return childFolder_(f, folderName_(category));                                        // หมวดหมู่
}
function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function folderName_(text) { return str_(text).replace(/[\\/:*?"<>|]/g, '-').slice(0, 80) || 'อื่นๆ'; }
function slug_(text, max) { return str_(text).replace(/[\\/:*?"<>|#%&{}$!'@+`=›,;]/g, ' ').replace(/\s+/g, '-').replace(/^-|-$/g, '').slice(0, max || 40) || 'x'; }

function setLink_(sheet, row, col, link) {
  const cell = sheet.getRange(row, col + 1);
  if (!link) { cell.setValue(''); return; }
  cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(link.name).setLinkUrl(0, link.name.length, link.url).build());
}
function linkFromRich_(rt) {
  if (!rt) return null;
  const runs = rt.getRuns ? rt.getRuns() : [];
  for (let i = 0; i < runs.length; i++) { const u = runs[i].getLinkUrl && runs[i].getLinkUrl(); if (u) return { name: str_(runs[i].getText()), url: u }; }
  const t = str_(rt.getText());
  return /^https?:\/\//.test(t) ? { name: 'PDF', url: t } : null;
}

// ============================================================ Reads
/** อ่านทุกแถวจากชีตรายเดือนทั้งหมด (เก่า → ใหม่) */
function scan_() {
  const out = [];
  monthSheets_().forEach(sheet => {
    const rows = readRows_(sheet), values = rows.values, rich = rows.rich;
    for (let i = 0; i < values.length; i++) if (str_(values[i][COL.ID])) out.push(rowToEntry_(values[i], i + 2, linkFromRich_(rich[i][0]), sheet.getName()));
  });
  return out;
}
/** รายการล่าสุดตามเวลาที่บันทึก (ข้ามเดือน) */
function recentFromScan_(entries, limit) { return entries.slice().sort((a, b) => a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0).slice(0, limit); }

function summaryFromScan_(entries, period) {
  period = period || fmtDate_(new Date(), 'yyyy-MM');
  const out = { period: period, total: 0, count: 0, noReceipt: 0, pendingReview: 0, returned: 0, byCat: {}, byUser: {} };
  entries.forEach(e => {
    if (e.period !== period) return;
    out.total = r2_(out.total + e.amount); out.count++;
    if (!e.hasReceipt) out.noReceipt = r2_(out.noReceipt + e.amount);
    if (e.status === STATUS.NEW) out.pendingReview++;
    if (e.status === STATUS.RETURNED) out.returned++;
    out.byCat[e.cat] = r2_((out.byCat[e.cat] || 0) + e.amount);
    out.byUser[e.by] = r2_((out.byUser[e.by] || 0) + e.amount);
  });
  return out;
}

function rowToEntry_(r, rowIndex, link, sheetName) {
  const d = v => (v instanceof Date) ? fmtDate_(v, 'yyyy-MM-dd') : str_(v);
  const t = v => (v instanceof Date) ? fmtDate_(v, 'yyyy-MM-dd HH:mm') : str_(v);
  return {
    sheet: sheetName || '', row: rowIndex, id: str_(r[COL.ID]), ts: t(r[COL.TS]), date: d(r[COL.DATE]), period: str_(r[COL.PERIOD]),
    by: str_(r[COL.BY]), fullName: str_(r[COL.FULLNAME]), dept: str_(r[COL.DEPT]),
    hasReceipt: str_(r[COL.RECEIPT]) === RECEIPT.YES, receipt: str_(r[COL.RECEIPT]), cat: str_(r[COL.CAT]), desc: str_(r[COL.DESC]),
    vendor: str_(r[COL.VENDOR]), amount: num_(r[COL.AMOUNT]), pay: str_(r[COL.PAY]),
    pdf: link ? link.url : '', pdfName: link ? link.name : '', pages: num_(r[COL.PAGES]),
    status: str_(r[COL.STATUS]), note: str_(r[COL.NOTE]), accNote: str_(r[COL.ACCNOTE]), approver: str_(r[COL.APPROVER]), coverType: str_(r[COL.COVER]), login: str_(r[COL.LOGIN]),
    slip: { type: str_(r[COL.STYPE]), payer: str_(r[COL.SPAYER]), payee: str_(r[COL.SPAYEE]), amount: num_(r[COL.SAMOUNT]), date: d(r[COL.SDATE]), time: str_(r[COL.STIME]), ref: str_(r[COL.SREF]), memo: str_(r[COL.SMEMO]), bank: str_(r[COL.SBANK]) },
  };
}

// ============================================================ Settings
function settings_() {
  const sheet = sheet_(SHEET.SET);
  const map = {};
  DEFAULT_SETTINGS.forEach(r => { map[r[0]] = r[1]; });
  const last = sheet.getLastRow();
  if (last >= 2) sheet.getRange(2, 1, last - 1, 2).getValues().forEach(r => { const k = str_(r[0]); if (k) map[k] = (r[1] instanceof Date) ? fmtDate_(r[1], 'yyyy-MM-dd') : r[1]; });
  return map;
}
function setSetting_(key, value) {
  const sheet = sheet_(SHEET.SET);
  const last = sheet.getLastRow();
  if (last >= 2) {
    const keys = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < keys.length; i++) if (str_(keys[i][0]) === key) { sheet.getRange(i + 2, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value, '']);
}

// ============================================================ AI OCR — สลิปโอนเงินเท่านั้น (OpenAI)
function readSlip_(req) {
  const s = settings_();
  if (str_(s.AI_OCR).toLowerCase() === 'off') throw new Error('AI OCR ปิดอยู่ — ตั้ง AI_OCR = on ในชีต "ตั้งค่า"');
  const key = props_().getProperty('OPENAI_API_KEY');
  if (!key) throw new Error('ยังไม่ได้ตั้ง OPENAI_API_KEY ใน Script Properties');
  const img = req.image || {};
  if (!img.data) throw new Error('ไม่พบรูปภาพ');
  const mime = str_(img.mime) || 'image/jpeg';
  if (mime.indexOf('image/') !== 0) throw new Error('AI อ่านได้เฉพาะไฟล์รูปภาพ');
  const prompt =
    'คุณคือผู้ช่วยฝ่ายบัญชีของ ' + str_(s.COMPANY_NAME) + ' หน้าที่เดียวคืออ่าน "สลิปโอนเงิน/หลักฐานการชำระเงิน" ' +
    '(สลิปธนาคาร พร้อมเพย์ e-Wallet หน้ายืนยันชำระเงินบัตรเครดิต ภาพหน้าจอแอปธนาคาร รายการเดินบัญชี) ตอบเป็น JSON object เท่านั้น ห้ามมี markdown\n' +
    'โครงสร้าง: {"is_slip":true/false (false ถ้าไม่ใช่หลักฐานการชำระเงิน เช่น ใบเสร็จ หน้าคำสั่งซื้อ รูปสินค้า),' +
    '"doc_type":"ประเภทเอกสาร เช่น สลิปโอนเงินธนาคาร / สลิปพร้อมเพย์ / ยอดตัดบัตรเครดิต / รายการเดินบัญชี / e-Wallet หรือ \\"\\"",' +
    '"payer":"ชื่อผู้โอน/ชื่อบัญชีต้นทางตามที่ปรากฏ หรือ \\"\\"",' +
    '"amount":ตัวเลขยอดที่โอน/ชำระ (0 ถ้าไม่พบ),"currency":"THB หรือรหัสสกุลเงินอื่น เช่น CNY USD","date":"YYYY-MM-DD หรือ \\"\\"","time":"HH:MM หรือ \\"\\"",' +
    '"payee":"ชื่อผู้รับเงิน/ร้าน/แพลตฟอร์มปลายทาง หรือ \\"\\"","payee_bank":"ธนาคาร/ช่องทางผู้รับ หรือ \\"\\"","payer_bank":"ธนาคาร/แอป/บัตรที่ใช้จ่าย หรือ \\"\\"",' +
    '"ref":"เลขอ้างอิง/Transaction ID หรือ \\"\\"","memo":"บันทึกช่วยจำ/ข้อความบนสลิป หรือ \\"\\"","fee":ค่าธรรมเนียม (0 ถ้าไม่มี),"confidence":ตัวเลข 0 ถึง 1}\n' +
    'กฎ: ปี พ.ศ. แปลงเป็น ค.ศ. (2569 → 2026) · ตัวเลขห้ามมีเครื่องหมายคั่นหลักพัน · ถ้ามีทั้งยอดเงินหยวนและยอดเงินบาทในภาพ ให้ amount เป็นยอดบาท currency THB · ค่าที่ไม่พบใช้ "" หรือ 0';
  const content = [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + img.data, detail: 'high' } }];
  const model = str_(s.AI_MODEL) || 'gpt-5-mini';
  const body = { model: model, messages: [{ role: 'user', content: content }], response_format: { type: 'json_object' } };
  if (/^(gpt-5|o\d)/i.test(model)) { body.max_completion_tokens = 2000; body.reasoning_effort = /^o\d/i.test(model) ? 'low' : 'minimal'; } else { body.max_completion_tokens = 1200; body.temperature = 0; }
  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + key }, payload: JSON.stringify(body) });
  const json = safeJson_(res.getContentText());
  if (res.getResponseCode() >= 300) throw new Error('OpenAI: ' + ((json.error && json.error.message) || res.getContentText().slice(0, 300)));
  const text = json.choices && json.choices[0] && json.choices[0].message ? json.choices[0].message.content : '';
  let t = str_(text).replace(/```json|```/g, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  let obj; try { obj = JSON.parse(t); } catch (e) { throw new Error('AI ตอบกลับไม่ใช่ JSON ที่อ่านได้ — ลองถ่ายรูปให้ชัดขึ้น'); }
  return {
    is_slip: obj.is_slip === true || String(obj.is_slip).toLowerCase() === 'true',
    doc_type: str_(obj.doc_type), payer: str_(obj.payer), memo: str_(obj.memo),
    amount: r2_(num_(obj.amount)), currency: str_(obj.currency).toUpperCase() || 'THB',
    date: /^\d{4}-\d{2}-\d{2}$/.test(str_(obj.date)) ? str_(obj.date) : '', time: str_(obj.time),
    payee: str_(obj.payee), payee_bank: str_(obj.payee_bank), payer_bank: str_(obj.payer_bank), ref: str_(obj.ref),
    fee: r2_(num_(obj.fee)), confidence: Math.max(0, Math.min(1, num_(obj.confidence))), model: model,
  };
}

// ============================================================ Notifications (อีเมล)
function notify_(entry, s) {
  if (str_(s.NOTIFY_MODE).toLowerCase() !== 'each' || !str_(s.NOTIFY_EMAIL)) return;
  const lines = [
    entry.id + ' · ' + entry.date + ' · บันทึกโดย ' + entry.by + (entry.fullName ? ' (' + entry.fullName + ')' : ''),
    entry.receipt + ' · ' + entry.cat,
    (entry.vendor ? entry.vendor + ' — ' : '') + entry.desc,
    'จำนวนเงิน ' + money_(entry.amount) + ' บาท · จ่ายโดย ' + entry.pay,
    'เอกสาร: ' + entry.pdfName + ' ' + entry.pdf,
  ];
  MailApp.sendEmail({ to: str_(s.NOTIFY_EMAIL), subject: '[TESR Ledger] ' + entry.id + ' · ' + entry.cat + ' · ' + money_(entry.amount) + ' บาท · ' + entry.by, body: lines.join('\n') + '\n\nเปิดชีต: ' + ss_().getUrl() });
}

function dailyDigest() {
  const s = settings_();
  if (str_(s.NOTIFY_MODE).toLowerCase() !== 'daily' || !str_(s.NOTIFY_EMAIL)) return;
  const today = fmtDate_(new Date(), 'yyyy-MM-dd');
  const all = scan_();
  const todays = all.filter(e => e.ts.indexOf(today) === 0);
  const pendingReview = all.filter(e => e.status === STATUS.NEW);
  const body = ['TESR Ledger — สรุปประจำวัน ' + today, 'บันทึกวันนี้ ' + todays.length + ' รายการ รวม ' + money_(todays.reduce((a, e) => a + e.amount, 0)) + ' บาท', '']
    .concat(todays.map(e => '• ' + e.id + ' ' + e.cat + ' ' + money_(e.amount) + ' (' + e.by + (e.hasReceipt ? '' : ', ไม่มีใบเสร็จ') + ')'))
    .concat(['', 'รอตรวจทั้งหมด ' + pendingReview.length + ' รายการ', '', 'เปิดชีต: ' + ss_().getUrl()]).join('\n');
  MailApp.sendEmail({ to: str_(s.NOTIFY_EMAIL), subject: '[TESR Ledger] สรุปรายจ่ายวันที่ ' + today, body: body });
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'dailyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyDigest').timeBased().atHour(18).everyDays(1).inTimezone(TZ).create();
  SpreadsheetApp.getActive().toast('ติดตั้งสรุปรายวัน 18:00 แล้ว', APP.name);
}

// ============================================================ Setup
/** รันครั้งเดียวหลังวางโค้ด — สร้าง/ซ่อมชีตตั้งค่า ชีตแม่แบบ Dashboard ชีตเดือนปัจจุบัน และโฟลเดอร์หลัก (รันซ้ำได้ ไม่ทับข้อมูล) */
function setup() {
  const ss = ss_();
  ss.setSpreadsheetTimeZone(TZ);
  buildSettings_();
  buildTemplate_();
  buildDashboard_();
  buildRegister_();
  monthSheets_().forEach(ensureColumns_);                     // ชีตเดือนจากเวอร์ชันก่อน → เพิ่มคอลัมน์ W–AF
  migrateLegacy_();
  monthSheet_(fmtDate_(new Date(), 'yyyy-MM'), true);
  applyRootFolder_();
  receiptRoot_(settings_());
  const first = ss.getSheets().find(sh => (sh.getName() === 'Sheet1' || sh.getName() === 'ชีต1') && sh.getLastRow() === 0);
  if (first) ss.deleteSheet(first);
  orderSheets_();
  refreshDashboardMonths_();
  ss.setActiveSheet(ss.getSheetByName(SHEET.DASH));
  SpreadsheetApp.getActive().toast('ติดตั้งเสร็จ — Deploy เป็น Web app ได้เลย', APP.name, 8);
}

/** ย้ายข้อมูลจากชีต "รายจ่าย" แบบเดิม (ก่อน v2.2) ไปยังชีตรายเดือน แล้วซ่อนชีตเดิมไว้ */
function migrateLegacy_() {
  const ss = ss_();
  const old = ss.getSheetByName(SHEET.LEGACY);
  if (!old) return;
  const last = old.getLastRow();
  if (last < 2) { ss.deleteSheet(old); return; }
  const rows = readRows_(old), values = rows.values, rich = rows.rich;
  let moved = 0;
  values.forEach((row, i) => {
    if (!str_(row[COL.ID])) return;
    const period = str_(row[COL.PERIOD]) || (row[COL.DATE] instanceof Date ? fmtDate_(row[COL.DATE], 'yyyy-MM') : str_(row[COL.DATE]).slice(0, 7));
    if (!isMonthName_(period)) return;
    const sh = ensureColumns_(monthSheet_(period, true));
    const r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, HEADERS.length).setNumberFormats([ROW_FORMATS]).setValues([row]);
    sh.getRange(r, COL.PDF + 1).setRichTextValue(rich[i][0]);
    moved++;
  });
  old.setName(SHEET.LEGACY + ' (ย้ายไปชีตรายเดือนแล้ว)');
  old.hideSheet();
  SpreadsheetApp.getActive().toast('ย้าย ' + moved + ' รายการจากชีต "' + SHEET.LEGACY + '" ไปชีตรายเดือนแล้ว', APP.name, 8);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TESR Ledger')
    .addItem('ติดตั้ง / ซ่อมโครงสร้างชีต (setup)', 'setup')
    .addItem('สร้างชีตเดือนปัจจุบัน', 'createCurrentMonthSheet')
    .addSeparator()
    .addItem('ติดตั้งสรุปรายวัน 18:00', 'installTriggers')
    .addItem('ส่งสรุปวันนี้ทันที', 'dailyDigest')
    .addToUi();
}
function createCurrentMonthSheet() { const p = fmtDate_(new Date(), 'yyyy-MM'); monthSheet_(p, true); SpreadsheetApp.getActive().toast('ชีต ' + p + ' พร้อมใช้งาน', APP.name); }

function ensureSheet_(name) { const ss = ss_(); return ss.getSheetByName(name) || ss.insertSheet(name); }

function buildSettings_() {
  const sh = ensureSheet_(SHEET.SET);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 3).setValues([['คีย์', 'ค่า', 'คำอธิบาย']]);
  const existing = {};
  if (sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(r => { existing[str_(r[0])] = true; });
  DEFAULT_SETTINGS.forEach(r => { if (!existing[r[0]]) sh.appendRow(r); });
  styleHeader_(sh, 3);
  sh.setColumnWidth(1, 190); sh.setColumnWidth(2, 320); sh.setColumnWidth(3, 560);
  sh.getRange('B2:B').setNumberFormat('@');
  sh.setTabColor('#C9A84C');
}

/** ชีตแม่แบบ (ซ่อนไว้) — หัวตาราง รูปแบบ dropdown สี และความกว้างคอลัมน์ ถูกคัดลอกไปทุกชีตรายเดือน */
function buildTemplate_() {
  const sh = ensureSheet_(SHEET.TPL);
  const n = HEADERS.length;
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
  const cur = sh.getRange(1, 1, 1, n).getValues()[0];
  HEADERS.forEach((h, i) => { if (str_(cur[i]) !== h) sh.getRange(1, i + 1).setValue(h); });
  styleHeader_(sh, n);
  sh.setFrozenRows(1); sh.setFrozenColumns(1); sh.setTabColor('#8B0000');
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  const formats = []; for (let i = 0; i < rows; i++) formats.push(ROW_FORMATS);
  sh.getRange(2, 1, rows, n).setNumberFormats(formats);
  [120, 130, 100, 70, 90, 170, 90, 150, 240, 300, 180, 120, 130, 360, 70, 120, 220, 220, 150, 220, 220, 170, 200, 200, 120, 110, 80, 200, 220, 150, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange('N2:N').setWrap(true);
  const dvList = list => SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
  sh.getRange('P2:P').setDataValidation(dvList([STATUS.NEW, STATUS.CHECKED, STATUS.DONE, STATUS.RETURNED]));
  sh.getRange('M2:M').setDataValidation(dvList([PAY.COMPANY, PAY.PERSONAL]));
  const cf = (col, text, bg) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setRanges([sh.getRange(col + '2:' + col)]).build();
  sh.setConditionalFormatRules([
    cf('P', STATUS.NEW, '#FFF1CC'), cf('P', STATUS.RETURNED, '#F8D0D0'), cf('P', STATUS.DONE, '#DCEFDC'),
    cf('H', RECEIPT.NO, '#F6E3E3'),
  ]);
  sh.hideSheet();
  return sh;
}

function buildDashboard_() {
  const sh = ensureSheet_(SHEET.DASH);
  sh.clear();
  const M = 'INDIRECT("\'"&$B$2&"\'!';                        // อ้างอิงชีตของเดือนที่เลือกใน B2
  sh.getRange('A1').setValue('TESR Ledger — Dashboard').setFontSize(16).setFontWeight('bold').setFontColor('#8B0000');
  sh.getRange('A2').setValue('เดือน (เลือกจากรายการ)');
  sh.getRange('B2').setFormula('=TEXT(TODAY(),"yyyy-mm")').setFontWeight('bold').setBackground('#FFF8E6');
  sh.getRange('C2').setValue('← พิมพ์ทับหรือเลือกเดือนอื่นได้ ตัวเลขด้านล่างเป็นของเดือนนั้น');
  const kpis = [
    ['รายจ่ายรวมในเดือน', '=IFERROR(SUM(' + M + 'L2:L")),0)'],
    ['จำนวนรายการ', '=IFERROR(COUNTA(' + M + 'A2:A")),0)'],
    ['ไม่มีใบเสร็จ (ใช้ใบปะหน้า)', '=IFERROR(SUMIF(' + M + 'H2:H"),"' + RECEIPT.NO + '",' + M + 'L2:L")),0)'],
    ['รายการรอตรวจ', '=IFERROR(COUNTIF(' + M + 'P2:P"),"' + STATUS.NEW + '"),0)'],
    ['จ่ายด้วยเงินส่วนตัว (พนักงานจ่ายไปก่อน)', '=IFERROR(SUMIF(' + M + 'M2:M"),"' + PAY.PERSONAL + '",' + M + 'L2:L")),0)'],
  ];
  kpis.forEach((k, i) => { sh.getRange(4 + i, 1).setValue(k[0]); sh.getRange(4 + i, 2).setFormula(k[1]); });
  sh.getRange('B4:B8').setNumberFormat('#,##0.00').setFontWeight('bold');
  sh.getRange('B5').setNumberFormat('0'); sh.getRange('B7').setNumberFormat('0');

  sh.getRange('D3').setValue('ตามหมวดหมู่ (เดือนที่เลือก)').setFontWeight('bold');
  sh.getRange('D4').setFormula('=IFERROR(QUERY(' + M + 'A2:U"),"select I, count(A), sum(L) where A is not null group by I order by sum(L) desc label count(A) \'\', sum(L) \'\'",0),"ยังไม่มีรายการในเดือนนี้")');
  sh.getRange('F4:F30').setNumberFormat('#,##0.00');
  sh.getRange('H3').setValue('ตามผู้บันทึก (เดือนที่เลือก)').setFontWeight('bold');
  sh.getRange('H4').setFormula('=IFERROR(QUERY(' + M + 'A2:U"),"select E, count(A), sum(L) where A is not null group by E order by sum(L) desc label count(A) \'\', sum(L) \'\'",0),"ยังไม่มีรายการในเดือนนี้")');
  sh.getRange('J4:J30').setNumberFormat('#,##0.00');

  sh.getRange('A11').setValue('รายการรอตรวจ (เดือนที่เลือก)').setFontWeight('bold');
  sh.getRange('A12:E12').setValues([['ID', 'วันที่จ่าย', 'ผู้บันทึก', 'รายละเอียด', 'จำนวนเงิน']]).setFontWeight('bold').setBackground('#000000').setFontColor('#C9A84C');
  sh.getRange('A13').setFormula('=IFERROR(QUERY(' + M + 'A2:U"),"select A,C,E,J,L where P=\'' + STATUS.NEW + '\' order by C",0),"ไม่มีรายการรอตรวจ")');
  sh.getRange('B13:B').setNumberFormat('yyyy-mm-dd');
  sh.getRange('E13:E').setNumberFormat('#,##0.00');
  [260, 140, 20, 260, 70, 120, 20, 140, 70, 120, 20, 110, 120, 70, 90, 120, 60].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.setTabColor('#C9A84C');
  refreshDashboardMonths_();
}

/** ตาราง "ทุกเดือน" (คอลัมน์ L–Q) + รายชื่อเดือนสำหรับ dropdown ใน B2 (คอลัมน์ Z ซ่อนไว้) — เรียกใหม่ทุกครั้งที่มีชีตเดือนใหม่ */
function refreshDashboardMonths_() {
  const sh = ss_().getSheetByName(SHEET.DASH);
  if (!sh) return;
  const months = monthSheets_().reverse();                    // ใหม่ → เก่า
  sh.getRange('L3:Q60').clearContent();
  sh.getRange('L3').setValue('ทุกเดือน').setFontWeight('bold');
  sh.getRange('L4:Q4').setValues([['เดือน', 'รายจ่ายรวม', 'รายการ', 'รอตรวจ', 'ไม่มีใบเสร็จ', 'ชีต']]).setFontWeight('bold').setBackground('#000000').setFontColor('#C9A84C');
  if (months.length) {
    const rows = months.map(m => { const R = "'" + m.getName() + "'!"; return [m.getName(), '=SUM(' + R + 'L2:L)', '=COUNTA(' + R + 'A2:A)', '=COUNTIF(' + R + 'P2:P,"' + STATUS.NEW + '")', '=SUMIF(' + R + 'H2:H,"' + RECEIPT.NO + '",' + R + 'L2:L)', '=HYPERLINK("#gid=' + m.getSheetId() + '","เปิด")']; });
    sh.getRange(5, 12, rows.length, 6).setValues(rows);
    sh.getRange(5, 13, rows.length, 1).setNumberFormat('#,##0.00'); sh.getRange(5, 16, rows.length, 1).setNumberFormat('#,##0.00');
    sh.getRange(5, 14, rows.length, 2).setNumberFormat('0');
  }
  // รายชื่อเดือนสำหรับ dropdown B2
  sh.getRange('Z2:Z100').clearContent();
  if (months.length) sh.getRange(2, 26, months.length, 1).setValues(months.map(m => [m.getName()]));
  sh.getRange('B2').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(sh.getRange('Z2:Z100'), true).setAllowInvalid(true).build());
  sh.hideColumns(26);
  refreshRegister_();
}

// ============================================================ ทะเบียน "โอนเงินออก" — รวมสลิปที่บริษัทโอนเงินออกจากทุกเดือน (สูตร QUERY อ่านอย่างเดียว)
const REG_HEADERS = ['ID', 'ผู้บันทึก', 'ประเภทเอกสาร', 'ชื่อผู้โอน', 'ชื่อผู้รับเงิน', 'จำนวนเงิน', 'วันที่โอนเงิน', 'เวลาโอนเงิน', 'Transaction ID', 'บันทึกช่วยจำ', 'โอนเข้าธนาคาร', 'link เอกสารรวมหลักฐาน', 'หมวดหมู่', 'สถานะบัญชี'];
function buildRegister_() {
  const sh = ensureSheet_(SHEET.REG);
  sh.getRange(1, 1, 1, REG_HEADERS.length).setValues([REG_HEADERS]);
  styleHeader_(sh, REG_HEADERS.length);
  sh.setFrozenRows(1); sh.setTabColor('#1F5FA8');
  [120, 80, 170, 200, 200, 120, 110, 80, 200, 220, 150, 260, 200, 120].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange('F2:F').setNumberFormat('#,##0.00');
  refreshRegister_();
  return sh;
}
/** สูตร: รวมแถวจากชีตเดือนทั้งหมด เฉพาะที่จ่ายโดย "บริษัท" (เงินออกจาก TESR) เรียงวันที่โอนใหม่ → เก่า — เรียกใหม่ทุกครั้งที่มีชีตเดือนใหม่ */
function refreshRegister_() {
  const sh = ss_().getSheetByName(SHEET.REG);
  if (!sh) return;
  const months = monthSheets_();
  const A2 = sh.getRange('A2');
  if (!months.length) { A2.setValue('ยังไม่มีชีตเดือน — รายการแรกที่บันทึกจะปรากฏที่นี่'); return; }
  const src = '{' + months.map(m => "'" + m.getName() + "'!A2:AE").join(';') + '}';
  // Col1=ID Col5=ผู้บันทึก Col9=หมวดหมู่ Col13=จ่ายโดย Col16=สถานะบัญชี Col22..Col30=ข้อมูลสลิป Col31=ลิงก์ PDF
  A2.setFormula('=IFERROR(QUERY(' + src + ',"select Col1,Col5,Col22,Col23,Col24,Col25,Col26,Col27,Col28,Col29,Col30,Col31,Col9,Col16 where Col1 is not null and Col13 = \'' + PAY.COMPANY + '\' order by Col26 desc, Col1 desc",0),"ยังไม่มีรายการที่บริษัทโอนเงินออก")');
}

function styleHeader_(sh, n) {
  sh.getRange(1, 1, 1, n).setBackground('#000000').setFontColor('#C9A84C').setFontWeight('bold').setWrap(true).setVerticalAlignment('middle');
  sh.setFrozenRows(1);
}

// ============================================================ Helpers
function props_() { return PropertiesService.getScriptProperties(); }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) { const s = ss_().getSheetByName(name); if (!s) throw new Error('ไม่พบชีต "' + name + '" — รัน setup() ใน Apps Script ก่อน'); return s; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function safeJson_(text) { try { return JSON.parse(text); } catch (e) { return {}; } }
function str_(v) { return v == null ? '' : String(v).trim(); }
function num_(v) { if (typeof v === 'number') return isFinite(v) ? v : 0; const n = parseFloat(str_(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
function r2_(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function money_(n) { return num_(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtDate_(d, pattern) { return Utilities.formatDate(d, TZ, pattern); }
function now_() { return fmtDate_(new Date(), 'yyyy-MM-dd HH:mm:ss'); }
function parseDate_(ymd) { const p = ymd.split('-').map(Number); const d = new Date(p[0], p[1] - 1, p[2], 12, 0, 0); if (isNaN(d.getTime())) throw new Error('วันที่ไม่ถูกต้อง'); return d; }
