/* ---------- cover sheet (A4 HTML → canvas) ---------- */
function coverHTML(m) {
  const who = m.who, ap = m.approver;
  const cb = (on, k, v) => '<div class="cb"><span class="box' + (on ? ' on' : '') + '"></span><span class="k">' + k + '</span><span class="v">' + esc(on ? v : '') + '</span></div>';
  const rows = [];
  rows.push('<tr class="cat"><td class="n"></td><td>' + esc(m.cat.name) + '</td><td class="amt">' + money(m.amount) + '</td></tr>');
  m.items.forEach((it, i) => rows.push('<tr><td class="n">' + (i + 1) + '</td><td>' + esc(it.desc) + '</td><td class="amt">' + (m.items.length > 1 ? money(it.amount) : '') + '</td></tr>'));
  for (let i = rows.length; i < 14; i++) rows.push('<tr><td class="n"></td><td></td><td class="amt"></td></tr>');
  const sig = src => src ? '<img src="' + src + '" alt="">' : '';
  const whoSig = who.drawn || who.sig;
  return '<div class="top"><div class="co"><img src="' + LOGO_DATA + '" alt=""><div><b>' + esc(state.cfg.companyName || 'บริษัท ไทยเอ็มเบดเด็ดซิสเต็มแอนด์โรโบติกส์ จำกัด') + '</b>Thai Embedded System and Robotics Co., Ltd.' + (state.cfg.companyTaxId ? ' · เลขผู้เสียภาษี ' + esc(state.cfg.companyTaxId) : '') + '</div></div><div>หมวดหมู่: ' + esc(m.cat.name) + '</div></div>' +
    '<div class="ttl">เอกสารประกอบการเบิกค่าใช้จ่าย<br>ในกรณีที่ค่าใช้จ่ายไม่สามารถจัดหาหลักฐานการชำระเงินได้</div>' +
    '<div class="fr"><span class="k">ชื่อผู้ขอเบิก</span><span class="v">' + esc(who.fullName || who.nick) + '</span><span class="k" style="min-width:auto;margin-left:30px">วันที่</span><span class="v short">' + thDate(m.date) + '</span></div>' +
    '<div class="fr"><span class="k">แผนก</span><span class="v" style="flex:0 0 330px">' + esc(who.dept || '') + '</span></div>' +
    '<div class="fr" style="margin-top:8px"><span class="k">รายละเอียดค่าใช้จ่าย</span></div>' +
    cb(m.coverType === 'ค่าพาหนะ', 'ค่าพาหนะ <span style="font-weight:400">ค่าแท็กซี่, ค่ารถเมล์, ค่ารถ จยย., ค่าทางด่วน อื่นๆ …… ระบุหมายเลขทะเบียน</span>', m.ctDetail) +
    cb(m.coverType === 'ค่าสินค้าและบริการ', 'ค่าสินค้าและบริการ <span style="font-weight:400">ระบุสาเหตุของการซื้อสินค้า/บริการที่ไม่มีใบเสร็จรับเงิน</span>', m.ctDetail) +
    cb(m.coverType === 'อื่นๆ', 'อื่นๆ <span style="font-weight:400">ระบุ</span>', m.ctDetail) +
    '<table><thead><tr><th style="width:64px">ลำดับ</th><th>รายละเอียด</th><th style="width:150px">จำนวนเงิน (บาท)</th></tr></thead><tbody>' + rows.join('') +
    '<tr class="tot"><td colspan="2"><span style="float:left">จำนวนเงิน (ตัวอักษร) : &nbsp; ' + esc(bahtText(m.amount)) + '</span><span style="float:right">รวมจำนวนเงิน</span></td><td class="amt">' + money(m.amount) + '</td></tr></tbody></table>' +
    '<table class="sigt"><tr><td>ลงชื่อ</td><td class="line">' + sig(whoSig) + '</td><td>ผู้ขอเบิก</td><td class="gap"></td><td>ลงชื่อ</td><td class="line">' + sig(ap.sig) + '</td><td>ผู้อนุมัติ</td></tr>' +
    '<tr><td>วันที่</td><td class="date">' + thDate(m.date) + '</td><td></td><td class="gap"></td><td>วันที่</td><td class="date">' + thDate(m.date) + '</td><td></td></tr>' +
    '<tr><td></td><td style="text-align:center;font-size:12px;color:#444">(' + esc(who.fullName || who.nick) + ')</td><td></td><td class="gap"></td><td></td><td style="text-align:center;font-size:12px;color:#444">(' + esc(ap.fullName || ap.nick) + ')</td><td></td></tr></table>' +
    '<div class="foot"><span>' + esc(ap.fullName || ap.nick) + ' — ผู้อนุมัติ · ' + (m.vendor ? 'ร้าน/แพลตฟอร์ม: ' + esc(m.vendor) + ' · ' : '') + 'จ่ายด้วย' + esc(m.pay) + '</span><span>หลักฐานแนบท้าย ' + (m.files.pay.length + m.files.fx.length + m.files.other.length) + ' ไฟล์ · TESR Ledger</span></div>';
}
async function renderCoverCanvas(m) {
  const el = $('coverRender'); el.innerHTML = coverHTML(m);
  try { await document.fonts.load('14px Sarabun'); await document.fonts.load('700 16px Sarabun'); await document.fonts.ready; } catch (e) { /* ใช้ฟอนต์สำรอง */ }
  await Promise.race([Promise.all($$('img', el).map(img => img.complete ? null : new Promise(res => { img.onload = img.onerror = res; }))), new Promise(res => setTimeout(res, 4000))]);
  const zone = $('renderZone'); zone.style.cssText = 'position:fixed;left:0;top:0;width:794px;z-index:5;';   // นำเข้าหน้าจอชั่วคราวให้ html2canvas วาดได้ครบ (ถูกบังด้วยหน้ากำลังทำงาน)
  busy(true, 'กำลังจัดหน้าใบปะหน้า…');
  try { return await html2canvas(el, { scale: CONFIG.PAGE_W / 794, backgroundColor: '#ffffff', useCORS: true, logging: false, width: 794, height: 1123, windowWidth: 794, scrollX: 0, scrollY: 0 }); }
  finally { zone.style.cssText = ''; busy(false); }
}

/* ---------- evidence pages (canvas) ---------- */
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('โหลดรูปไม่ได้')); i.src = src; }); }
async function evidencePages(m, startNo) {
  const W = CONFIG.PAGE_W, H = CONFIG.PAGE_H, M = 60; const pages = []; let pg = null, y = 0, no = startNo || 1;
  try { await document.fonts.load('700 26px Sarabun'); await document.fonts.load('20px Sarabun'); } catch (e) { /* ฟอนต์สำรอง */ }
  let logoImg = null; try { logoImg = await loadImg(LOGO_DATA); } catch (e) { /* ไม่มีโลโก้ */ }
  const font = (sz, bold) => (bold ? '700 ' : '400 ') + sz + 'px Sarabun, "IBM Plex Sans Thai", sans-serif';
  const newPage = first => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    if (logoImg) x.drawImage(logoImg, W - M - 78, M - 10, 78, 78);
    x.fillStyle = '#000'; x.font = font(30, true); x.fillText(m.hasReceipt ? 'หลักฐานค่าใช้จ่าย' : 'หลักฐานประกอบใบปะหน้า', M, M + 28);
    x.font = font(20, false); x.fillStyle = '#333';
    const line1 = 'วันที่ ' + thDate(m.date) + ' · ' + (m.who.fullName || m.who.nick) + (m.who.dept ? ' (' + m.who.dept + ')' : '') + ' · ' + money(m.amount) + ' บาท';
    const line2 = 'หมวดหมู่: ' + m.cat.name + (m.vendor ? ' · ' + m.vendor : '') + (m.desc ? ' · ' + m.desc : '');
    x.fillText(line1, M, M + 62); x.fillText(clip(x, line2, W - 2 * M), M, M + 90);
    x.strokeStyle = '#bbb'; x.lineWidth = 1; x.beginPath(); x.moveTo(M, M + 104); x.lineTo(W - M, M + 104); x.stroke();
    pages.push({ canvas: c, ctx: x, no: no++ }); pg = pages[pages.length - 1]; y = M + 124;
    return pg;
  };
  const clip = (x, text, max) => { if (x.measureText(text).width <= max) return text; let t = text; while (t.length && x.measureText(t + '…').width > max) t = t.slice(0, -1); return t + '…'; };
  const groups = [['receipt', 'ใบเสร็จ'], ['pay', 'หลักฐานการจ่าย (ยอดบาท)'], ['fx', 'หลักฐานตอนโอน (สกุลต่างประเทศ)'], ['other', 'หลักฐานอื่น']];
  let idx = 0;
  for (const [g, label] of groups) {
    const list = m.files[g].filter(f => f.kind === 'image');
    for (let i = 0; i < list.length; i++) {
      const f = list[i]; const img = await loadImg(f.preview);
      const cap = 26, capH = 34, maxW = W - 2 * M;
      const fit = availH => { let s = Math.min(maxW / img.width, (availH - capH) / img.height); if (s > 1.2) s = 1.2; return { w: img.width * s, h: img.height * s }; };
      if (!pg) newPage(true);
      let avail = H - M - y; let d = fit(avail);
      if (d.h < Math.min(img.height * 0.35, 380) && y > M + 130) { newPage(false); avail = H - M - y; d = fit(avail); }
      const x = pg.ctx;
      x.fillStyle = '#000'; x.font = font(cap, true); x.fillText(label + ' ' + (i + 1) + (list.length > 1 ? '/' + list.length : ''), M, y + cap - 4);
      x.font = font(18, false); x.fillStyle = '#666'; x.fillText(clip(x, f.name, 500), M + 300, y + cap - 4);
      y += capH;
      const dx = M + (maxW - d.w) / 2; x.drawImage(img, dx, y, d.w, d.h); x.strokeStyle = '#ddd'; x.strokeRect(dx, y, d.w, d.h);
      y += d.h + 30; idx++;
    }
  }
  pages.forEach(p => { const x = p.ctx; x.fillStyle = '#888'; x.font = font(16, false); x.textAlign = 'right'; x.fillText('หน้า ' + p.no + ' · TESR Ledger', W - M, H - 28); x.textAlign = 'left'; });
  return pages;
}

/* ---------- preview + PDF ---------- */
async function buildPreview() {
  const m = model(); state.model = m;
  $('summ').innerHTML = [['ผู้บันทึก', esc(m.who.nick) + (m.who.fullName ? ' — ' + esc(m.who.fullName) : '') + (m.who.dept ? ' (' + esc(m.who.dept) + ')' : '')], ['ประเภท', m.hasReceipt ? 'มีใบเสร็จ' : 'ไม่มีใบเสร็จ — ใบปะหน้า'], ['หมวดหมู่ / โฟลเดอร์', esc(m.cat.folder)], ['วันที่จ่าย', thDateLong(m.date)], ['จำนวนเงิน', '<b class="mono">' + money(m.amount) + ' บาท</b>'], ['จ่ายด้วย', esc(m.pay)], ['รายละเอียด', esc(m.desc || '—')], ['ผู้อนุมัติ', esc(m.approver.fullName || m.approver.nick)]].map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
  const warns = [];
  if (!m.hasReceipt && !(m.who.drawn || m.who.sig)) warns.push(banner('warn', 'ลายเซ็น', 'ยังไม่มีลายเซ็นผู้ขอเบิก — เอกสารจะเว้นช่องไว้เซ็นบนกระดาษ (กลับไปขั้นที่ 1 เพื่อวาด/อัปโหลดได้)'));
  if (m.files.fx.length) warns.push(banner('ok', 'ต่างประเทศ', 'แนบหลักฐานตอนโอนสกุลต่างประเทศ ' + m.files.fx.length + ' ไฟล์ พร้อมหลักฐานยอดบาท ' + m.files.pay.length + ' ไฟล์'));
  if (state.ai && state.ai.currency && state.ai.currency !== 'THB') warns.push(banner('warn', 'ยอดบาท', 'สลิปที่ AI อ่านเป็นสกุล ' + esc(state.ai.currency) + ' — ตรวจว่ามีหลักฐานที่เห็นยอดบาทแนบอยู่'));
  $('pvWarn').innerHTML = warns.join('');
  $('btnOpenPdf').hidden = true; $('btnMakePdf').hidden = false; state.pdf = null;
  const pv = $('pv'); pv.innerHTML = '<div class="cap"><span class="spin"></span>กำลังจัดหน้าเอกสาร…</div>';
  try {
    const pages = [];
    if (!m.hasReceipt) pages.push({ canvas: await renderCoverCanvas(m), label: 'ใบปะหน้า' });
    (await evidencePages(m, pages.length + 1)).forEach(p => pages.push({ canvas: p.canvas, label: 'หลักฐาน' }));
    state.pages = pages;
    const pdfs = [].concat(m.files.receipt, m.files.pay, m.files.fx, m.files.other).filter(f => f.kind === 'pdf');
    pv.innerHTML = pages.map((p, i) => '<div class="pg"><img class="pgimg" src="' + p.canvas.toDataURL('image/jpeg', 0.6) + '" alt=""></div><div class="cap">หน้า ' + (i + 1) + ' · ' + p.label + '</div>').join('') +
      pdfs.map(f => '<div class="pg pgpdf">📄 ไฟล์ PDF ที่แนบ: ' + esc(f.name) + '<br><small>จะต่อท้ายเป็นหน้าถัดไปในไฟล์ PDF</small></div>').join('');
    $('summ').insertAdjacentHTML('beforeend', '<dt>เอกสาร PDF</dt><dd>' + pages.length + ' หน้า' + (pdfs.length ? ' + PDF แนบ ' + pdfs.length + ' ไฟล์' : '') + '</dd>');
  } catch (e) { pv.innerHTML = '<div class="cap">จัดหน้าไม่สำเร็จ: ' + esc(e.message) + '</div>'; }
}
async function buildPdf() {
  if (state.pdf) return state.pdf;
  if (!state.pages.length) throw new Error('ยังไม่มีหน้าเอกสาร');
  const { PDFDocument } = PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle('TESR Ledger — ' + (state.model.who.nick) + ' ' + state.model.date); doc.setProducer('TESR Ledger'); doc.setCreator('TESR Ledger');
  for (const p of state.pages) {
    const jpg = await doc.embedJpg(p.canvas.toDataURL('image/jpeg', 0.85));
    const page = doc.addPage([595.28, 841.89]); page.drawImage(jpg, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  const pdfs = [].concat(state.model.files.receipt, state.model.files.pay, state.model.files.fx, state.model.files.other).filter(f => f.kind === 'pdf');
  for (const f of pdfs) {
    try { const src = await PDFDocument.load(Uint8Array.from(atob(f.data), c => c.charCodeAt(0)), { ignoreEncryption: true }); const pages = await doc.copyPages(src, src.getPageIndices()); pages.forEach(pg => doc.addPage(pg)); }
    catch (e) { toast('ต่อไฟล์ PDF "' + f.name + '" ไม่ได้ — ข้ามไฟล์นี้', 'err'); }
  }
  const b64 = await doc.saveAsBase64();
  state.pdf = { data: b64, pages: doc.getPageCount() };
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
  state.pdfUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  return state.pdf;
}
async function makePdfPreview() {
  busy(true, 'กำลังสร้างไฟล์ PDF…');
  try { await buildPdf(); const a = $('btnOpenPdf'); a.href = state.pdfUrl; a.hidden = false; $('btnMakePdf').hidden = true; toast('สร้าง PDF แล้ว ' + state.pdf.pages + ' หน้า — แตะ "เปิดไฟล์ PDF ตัวอย่าง"', 'ok'); }
  catch (e) { toast('สร้าง PDF ไม่สำเร็จ: ' + e.message, 'err'); }
  finally { busy(false); }
}
async function approve() {
  const m = state.model || model();
  const ok = await ask('ยืนยันการบันทึก', 'เอกสาร <b>' + esc(m.cat.name) + '</b> จำนวน <b>' + money(m.amount) + ' บาท</b> โดย <b>' + esc(m.who.nick) + '</b><br>จะถูกเก็บเป็น PDF ในโฟลเดอร์ Google Drive และบันทึกลงชีต (ผู้อนุมัติ: ' + esc(m.approver.fullName || m.approver.nick) + ')', 'บันทึกเลย');
  if (!ok) return;
  busy(true, 'กำลังรวมเอกสารและอัปโหลด…');
  try {
    await buildPdf();
    const res = await api('submit', {
      by: m.who.nick, fullName: m.who.fullName, dept: m.who.dept, date: m.date, amount: m.amount,
      category: m.cat.name, folder: m.cat.folder, hasReceipt: m.hasReceipt, desc: m.desc, vendor: m.vendor, pay: m.pay, note: m.note,
      coverType: m.hasReceipt ? '' : m.coverType + (m.ctDetail ? ': ' + m.ctDetail : ''), approver: m.approver.fullName || m.approver.nick,
      pages: state.pdf.pages, pdf: { data: state.pdf.data },
    }, { timeout: 180000 });
    const e = res.entry; state.recent.unshift(e); lsDel(LS.boot);
    $('doneId').textContent = e.id; $('doneSub').textContent = 'เก็บใน Drive · ' + e.cat + ' · สถานะ "รอตรวจ"';
    $('doneSumm').innerHTML = [['ไฟล์', '<span class="mono" style="font-size:12px">' + esc(e.pdfName) + '</span>'], ['โฟลเดอร์', esc(m.cat.folder) + ' / ' + m.date.slice(0, 4) + ' / ' + m.date.slice(0, 7)], ['จำนวนเงิน', money(e.amount) + ' บาท'], ['เบิกคืน', esc(e.reimb)]].map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
    $('donePdf').href = e.pdf || '#'; $('donePdf').hidden = !e.pdf;
    goStep('done'); toast('บันทึก ' + e.id + ' แล้ว', 'ok');
  } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message, 'err'); }
  finally { busy(false); }
}
function resetEntry(keepWho) {
  state.hasReceipt = null; state.cat = null; state.files = { receipt: [], pay: [], fx: [], other: [] }; state.ai = null; state.items = [{ desc: '', amount: '' }]; state.coverType = ''; state.pages = []; state.pdf = null; state.model = null;
  ['amount', 'date', 'vendor', 'desc', 'note', 'bdate', 'bvendor', 'ctDetail', 'bnote'].forEach(id => { $(id).value = ''; $(id).classList.remove('ai', 'bad'); });
  $$('#step2 .choice, #catList button').forEach(b => b.classList.remove('on'));
  $('aiBanner').innerHTML = ''; $('aiBannerB').innerHTML = ''; $('pv').innerHTML = '';
  goStep(keepWho ? 2 : 1);
}

