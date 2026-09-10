/* ---------- step 4: details ---------- */
function renderStep4() {
  const yes = state.hasReceipt === 'yes';
  $('s4a').classList.toggle('hidden', !yes); $('s4b').classList.toggle('hidden', yes);
  $('s4Title').firstChild.textContent = yes ? 'ใบเสร็จ + สลิป' : 'ใบปะหน้า + หลักฐาน';
  $('s4Sub').textContent = state.cat.name + ' · ' + (state.who.fullName || state.who.nick);
  if (yes) { if (!$('date').value) $('date').value = todayISO(); }
  else {
    if (!$('bdate').value) $('bdate').value = todayISO();
    if (!state.coverType) setCoverType(state.cat.coverType || 'ค่าสินค้าและบริการ');
    renderItems();
  }
  const pay = state.pay || (yes ? 'บริษัท' : 'ส่วนตัว (ขอเบิกคืน)');
  setPay(pay);
  renderThumbs('receipt'); renderThumbs('pay'); renderThumbs('fx'); renderThumbs('other');
  aiIdle();
}
function setPay(v) { state.pay = v; $$('#payChips .chip, #payChipsB .chip').forEach(b => b.classList.toggle('on', b.dataset.p === v)); if (state.who) lsSet(LS.pay + state.who.nick, v); }
function setCoverType(t) { state.coverType = t; $$('#ctChips .chip').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $('ctLbl').textContent = CT_LABEL[t] || 'ระบุ'; $('ctLbl').classList.toggle('req', t !== 'ค่าพาหนะ'); $('ctDetail').placeholder = CT_PH[t] || ''; }
function renderItems() {
  const box = $('items');
  box.innerHTML = state.items.map((it, i) => '<div class="it"><input class="field" data-i="' + i + '" data-k="desc" placeholder="รายละเอียด เช่น 7 inch Touch screen Display" value="' + esc(it.desc) + '"><input class="field" data-i="' + i + '" data-k="amount" inputmode="decimal" placeholder="บาท" value="' + esc(it.amount) + '"><button type="button" class="del" data-i="' + i + '" title="ลบ">✕</button></div>').join('');
  $$('#items input').forEach(inp => inp.oninput = () => { state.items[+inp.dataset.i][inp.dataset.k] = inp.value; itemsTotal(); });
  $$('#items .del').forEach(b => b.onclick = () => { if (state.items.length === 1) { state.items = [{ desc: '', amount: '' }]; } else state.items.splice(+b.dataset.i, 1); renderItems(); });
  itemsTotal();
}
function itemsSum() { return r2(state.items.reduce((a, it) => a + num(it.amount), 0)); }
function itemsTotal() { $('itemsTotal').textContent = '฿' + money(itemsSum()); }

/* attachments */
let pickTarget = 'pay';
async function resizeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('เปิดรูปไม่ได้')); i.src = url; });
    const s = Math.min(1, CONFIG.MAX_IMAGE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/jpeg', CONFIG.JPEG_QUALITY);
    return { kind: 'image', mime: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl, name: file.name || 'image.jpg', w: w, h: h };
  } finally { URL.revokeObjectURL(url); }
}
function readPdf(file) {
  return new Promise((res, rej) => {
    if (file.size > CONFIG.MAX_PDF_MB * 1048576) return rej(new Error('PDF ใหญ่เกิน ' + CONFIG.MAX_PDF_MB + ' MB'));
    const r = new FileReader(); r.onload = () => res({ kind: 'pdf', mime: 'application/pdf', data: String(r.result).split(',')[1], preview: '', name: file.name || 'file.pdf' }); r.onerror = () => rej(new Error('อ่านไฟล์ไม่ได้')); r.readAsDataURL(file);
  });
}
async function addFiles(group, fileList) {
  const files = Array.from(fileList || []); if (!files.length) return;
  const list = state.files[group];
  for (const f of files) {
    if (list.length >= CONFIG.MAX_FILES) { toast('แนบได้สูงสุด ' + CONFIG.MAX_FILES + ' ไฟล์ต่อกลุ่ม', 'err'); break; }
    try { const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''); list.push(isPdf ? await readPdf(f) : await resizeImage(f)); }
    catch (e) { toast(e.message, 'err'); }
  }
  $('fileCam').value = ''; $('fileAny').value = '';
  renderThumbs(group); state.pages = []; state.pdf = null;
  if (group === 'pay' && state.cfg.ai && state.autoAI && !(state.ai && state.ai.is_slip)) runAI();
}
function thumbBox(group) { const b = state.hasReceipt === 'yes' ? '' : '-b'; return $(group === 'pay' ? 'th-pay' + b : group === 'fx' ? 'th-fx' + b : 'th-' + group); }
function renderThumbs(group) {
  const box = thumbBox(group); if (!box) return;
  const list = state.files[group];
  box.innerHTML = list.map((f, i) => '<div class="thumb' + (group === 'pay' && state.ai && state.ai.is_slip && state.ai.index === i ? ' ai' : '') + '" title="' + esc(f.name) + '">' + (f.kind === 'pdf' ? '<span class="pdf">PDF</span>' : '<img src="' + f.preview + '" alt="">') + '<span class="no">' + (i + 1) + '</span><button type="button" class="x" data-g="' + group + '" data-i="' + i + '">✕</button></div>').join('');
  $$('.x', box).forEach(b => b.onclick = () => { const g = b.dataset.g, i = +b.dataset.i; state.files[g].splice(i, 1); if (g === 'pay' && state.ai && state.ai.index === i) state.ai = null; renderThumbs(g); state.pages = []; state.pdf = null; });
  ['th-pay', 'th-pay-b', 'th-fx', 'th-fx-b'].forEach(id => { const el = $(id); if (el && el !== box && ((group === 'pay' && id.startsWith('th-pay')) || (group === 'fx' && id.startsWith('th-fx')))) el.innerHTML = ''; });
}
function aiIdle() {
  const t = !state.cfg.ai ? (state.cfg.aiOn === false ? 'AI ปิดอยู่ — กรอกยอดเอง' : (state.apiUrl ? 'AI ยังไม่พร้อม (ไม่มี OPENAI_API_KEY) — กรอกยอดเอง' : '')) : 'แนบสลิปยอดบาทแล้ว AI จะอ่านยอด วันที่ ผู้รับเงินให้ตรวจ';
  $('aiStat').textContent = t; $('aiStatB').textContent = t;
}
function aiSay(html) { $('aiStat').innerHTML = html; $('aiStatB').innerHTML = html; }
async function runAI() {
  const imgs = state.files.pay.map((f, i) => ({ f: f, i: i })).filter(x => x.f.kind === 'image');
  if (state.aiRunning || !imgs.length || !state.cfg.ai) return;
  state.aiRunning = true;
  try {
    let last = null;
    for (let k = 0; k < Math.min(imgs.length, 3); k++) {
      aiSay('<span class="spin"></span>AI กำลังอ่านสลิป (รูปที่ ' + (imgs[k].i + 1) + ')…');
      const res = await api('read_slip', { image: { data: imgs[k].f.data, mime: imgs[k].f.mime } }, { timeout: 120000 });
      last = res.slip || {};
      if (last.is_slip) { last.index = imgs[k].i; applyAI(last); renderThumbs('pay'); return; }
    }
    state.ai = last; aiSay('รูปที่แนบไม่ใช่สลิปโอนเงิน — กรอกยอดและวันที่เอง');
  } catch (e) { aiSay('AI อ่านไม่สำเร็จ: ' + esc(e.message) + ' — กรอกเองได้เลย'); }
  finally { state.aiRunning = false; }
}
function applyAI(r) {
  state.ai = r; const filled = []; const yes = state.hasReceipt === 'yes';
  const foreign = r.currency && r.currency !== 'THB';
  const setIf = (id, v, label, force) => { const el = $(id); v = String(v || '').trim(); if (!v || (!force && el.value.trim())) return; el.value = v; el.classList.add('ai'); filled.push(label); };
  if (r.amount > 0 && !foreign) {
    if (yes) setIf('amount', r2(r.amount), 'ยอดเงิน');
    else if (state.items.length === 1 && !num(state.items[0].amount)) { state.items[0].amount = String(r2(r.amount)); renderItems(); $$('#items input[data-k=amount]')[0].classList.add('ai'); filled.push('ยอดเงิน'); }
  }
  setIf(yes ? 'date' : 'bdate', r.date, 'วันที่', true);
  if (r.payee) setIf(yes ? 'vendor' : 'bvendor', r.payee, 'ผู้รับเงิน');
  const refBits = []; if (r.ref) refBits.push('อ้างอิง ' + r.ref); if (r.payer_bank) refBits.push('จาก ' + r.payer_bank); if (r.payee_bank) refBits.push('เข้า ' + r.payee_bank); if (r.time) refBits.push('เวลา ' + r.time);
  if (refBits.length) setIf(yes ? 'note' : 'bnote', 'สลิป: ' + refBits.join(' · '), 'อ้างอิงสลิป');
  const conf = Math.round((num(r.confidence) || 0) * 100);
  const warn = foreign ? banner('warn', r.currency, 'รูปนี้เป็นสกุล <b>' + esc(r.currency) + '</b> ' + money(r.amount) + ' — ย้ายไปช่อง "หลักฐานตอนโอนเป็นสกุลต่างประเทศ" แล้วแนบรายการเดินบัญชี/บัตรที่เห็น<b>ยอดบาท</b>ในช่องนี้ และกรอกยอดบาทที่ถูกตัดจริง') : '';
  $('aiBanner').innerHTML = warn; $('aiBannerB').innerHTML = warn;
  aiSay('AI อ่านสลิปแล้ว (มั่นใจ ' + conf + '%)' + (filled.length ? ' · เติม: ' + esc(filled.join(', ')) : ' · ไม่พบข้อมูลที่เติมได้') + ' — <b>ตรวจตัวเลขกับสลิปก่อนไปต่อ</b>');
  if (filled.length) toast('AI เติม ' + filled.length + ' ช่องจากสลิป ตรวจทานด้วย', 'ok');
}

function validateStep4() {
  const yes = state.hasReceipt === 'yes'; const errs = [];
  const bad = (el, msg) => { if (el) el.classList.add('bad'); errs.push(msg); };
  $$('.field.bad').forEach(el => el.classList.remove('bad')); $$('.chips.bad').forEach(el => el.classList.remove('bad'));
  if (yes) {
    if (!state.files.receipt.length) errs.push('แนบใบเสร็จอย่างน้อย 1 ไฟล์');
    if (!state.files.pay.length) errs.push('แนบสลิป/หลักฐานการจ่ายที่เห็นยอดบาท');
    if (!(num($('amount').value) > 0)) bad($('amount'), 'กรอกจำนวนเงิน (บาท)');
    if (!$('date').value) bad($('date'), 'เลือกวันที่จ่าย');
  } else {
    if (!$('bdate').value) bad($('bdate'), 'เลือกวันที่จ่าย');
    if (!state.coverType) { $('ctChips').classList.add('bad'); errs.push('เลือกประเภทค่าใช้จ่าย'); }
    if (state.coverType !== 'ค่าพาหนะ' && !$('ctDetail').value.trim()) bad($('ctDetail'), CT_LABEL[state.coverType] || 'ระบุรายละเอียด');
    const items = state.items.filter(it => it.desc.trim() || num(it.amount) > 0);
    if (!items.length) errs.push('กรอกรายการค่าใช้จ่ายอย่างน้อย 1 รายการ');
    items.forEach((it, i) => { if (!it.desc.trim()) errs.push('รายการที่ ' + (i + 1) + ' ยังไม่มีรายละเอียด'); if (!(num(it.amount) > 0)) errs.push('รายการที่ ' + (i + 1) + ' ยังไม่มีจำนวนเงิน'); });
    if (!state.files.pay.length) errs.push('แนบสลิป/หลักฐานการจ่ายที่เห็นยอดบาท');
  }
  if (!state.pay) errs.push('เลือกว่าจ่ายด้วยเงินบริษัทหรือเงินส่วนตัว');
  if (errs.length) { toast(errs[0] + (errs.length > 1 ? ' (+' + (errs.length - 1) + ')' : ''), 'err'); return false; }
  return true;
}

/* ---------- model ---------- */
function model() {
  const yes = state.hasReceipt === 'yes'; const w = state.who;
  const items = yes ? [{ desc: $('desc').value.trim() || (state.cat ? state.cat.name : ''), amount: r2(num($('amount').value)) }] : state.items.filter(it => it.desc.trim() || num(it.amount) > 0).map(it => ({ desc: it.desc.trim(), amount: r2(num(it.amount)) }));
  const amount = yes ? r2(num($('amount').value)) : r2(items.reduce((a, it) => a + it.amount, 0));
  return {
    hasReceipt: yes, who: w, approver: state.approver, cat: state.cat,
    date: yes ? $('date').value : $('bdate').value, vendor: (yes ? $('vendor').value : $('bvendor').value).trim(),
    desc: yes ? $('desc').value.trim() : items.map(it => it.desc).join(' · '), items: items, amount: amount,
    coverType: yes ? '' : state.coverType, ctDetail: yes ? '' : $('ctDetail').value.trim(), pay: state.pay,
    note: (yes ? $('note').value : $('bnote').value).trim(),
    files: state.files,
  };
}

