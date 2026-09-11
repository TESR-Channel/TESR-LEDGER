/* ---------- list ---------- */
function showView(v) { if (state.view === 'login') return; state.view = v; $$('.view').forEach(x => x.classList.toggle('on', x.id === 'view-' + v)); $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); renderNav(); if (v === 'list') renderList(); window.scrollTo({ top: 0 }); }
function renderList() {
  const me = state.who ? state.who.nick : '';
  const s = state.summary || {};
  const mine = state.recent.filter(e => e.by === me);
  $('listSub').textContent = (s.period ? 'งวด ' + s.period + ' · ' : '') + 'รวม ' + money(s.total || 0) + ' บาท · ' + (s.count || 0) + ' รายการ';
  $('kpis').innerHTML = [['รอบัญชีตรวจ', String(s.pendingReview || 0)], ['ไม่มีใบเสร็จ (งวดนี้)', money(s.noReceipt || 0)], ['รวมงวดนี้', money(s.total || 0)], ['ตีกลับ', String(s.returned || 0)]].map(k => '<div><b>' + k[1] + '</b><small>' + k[0] + '</small></div>').join('');
  const f = state.listFilter;
  const list = state.recent.filter(e => f === 'mine' ? e.by === me : f === 'pending' ? e.status === 'รอตรวจ' : true);
  $('listBody').innerHTML = list.length ? list.map(e => '<div class="item"><div class="a"><span><span class="mono gold">' + esc(e.id) + '</span> · ' + esc(e.cat) + '</span><b>' + money(e.amount) + '</b></div><div class="m">' + thDateLong(e.date) + ' · ' + esc(e.by) + (e.vendor ? ' · ' + esc(e.vendor) : '') + (e.desc ? '<br>' + esc(e.desc) : '') + '</div><div class="m">' + statusTag(e) + (e.hasReceipt ? '' : '<span class="tag">ใบปะหน้า</span>') + (e.pay === 'บริษัท' ? '' : '<span class="tag">พนักงานจ่ายไปก่อน</span>') + (e.pdf ? ' <a href="' + esc(e.pdf) + '" target="_blank" rel="noopener">เปิด PDF</a>' : '') + (e.accNote ? '<br><span class="err-t">บัญชี: ' + esc(e.accNote) + '</span>' : '') + '</div></div>').join('') : '<p class="hint">ไม่มีรายการ</p>';
  $('btnSheet').hidden = !state.cfg.sheetUrl; if (state.cfg.sheetUrl) $('btnSheet').href = state.cfg.sheetUrl;
}
function statusTag(e) { const k = e.status === 'ตีกลับ' ? 'err' : e.status === 'บันทึกบัญชีแล้ว' || e.status === 'ตรวจแล้ว' ? 'ok' : 'warn'; return '<span class="tag ' + k + '">' + esc(e.status || 'รอตรวจ') + '</span>'; }

/* ---------- settings / boot ---------- */
function loadLocal() {
  state.apiUrl = lsGet(LS.apiUrl) || CONFIG.API_URL || ''; state.token = lsGet(LS.token) || CONFIG.APP_TOKEN || '';
  const a = lsGet(LS.autoAI); state.autoAI = a == null ? CONFIG.AUTO_AI : a === '1';
}
function openSettings() {
  $('setApi').value = state.apiUrl; $('setToken').value = state.token; $('setAutoAI').checked = state.autoAI;
  $('setAcct').innerHTML = state.auth ? '<div class="acct">' + (state.auth.picture ? '<img src="' + esc(state.auth.picture) + '" alt="" referrerpolicy="no-referrer">' : '') + '<div class="e">' + esc(state.auth.name || '') + '<small>' + esc(state.auth.email) + '</small></div></div>' : '';
  $('btnLogout').hidden = !loginRequired();
  $('setIntro').innerHTML = !state.apiUrl ? banner('info', 'เริ่ม', 'วาง <b>URL ของ Web app</b> จาก Apps Script (Deploy → Web app → URL ลงท้าย /exec) แล้วกดบันทึกการตั้งค่า') : '';
  $('verLine').textContent = 'TESR LEDGER v' + APP_VERSION + (state.cfg.companyName ? ' · ' + state.cfg.companyName : '') + (state.cfg.aiModel ? ' · AI: ' + state.cfg.aiModel : '');
  openOv('ovSettings');
}
async function saveSettings() {
  const url = $('setApi').value.trim(); const changed = url !== state.apiUrl;
  if (url && !/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url)) { toast('URL ต้องเป็นของ Apps Script (/exec)', 'err'); return; }
  state.apiUrl = url; state.token = $('setToken').value.trim(); state.autoAI = $('setAutoAI').checked;
  lsSet(LS.apiUrl, state.apiUrl); lsSet(LS.token, state.token); lsSet(LS.autoAI, state.autoAI ? '1' : '0');
  closeOv('ovSettings'); renderSetupBanner();
  if (changed) lsDel(LS.boot);
  if (state.apiUrl) await refresh();
}
async function testConnection() {
  const url = $('setApi').value.trim(); if (!url) { toast('ใส่ URL ก่อน', 'err'); return; }
  busy(true, 'กำลังทดสอบ…');
  try { const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=ping'); const j = JSON.parse(await res.text()); toast(j.ok ? 'เชื่อมต่อได้ · ' + j.app + ' v' + j.version : 'ตอบกลับผิดปกติ', j.ok ? 'ok' : 'err'); }
  catch (e) { toast('เชื่อมต่อไม่ได้ — ตรวจว่า Deploy เป็น Web app แบบ Anyone', 'err'); }
  finally { busy(false); }
}
function renderSetupBanner() { $('setupBanner').innerHTML = state.apiUrl ? '' : banner('warn', 'ตั้งค่า', 'ยังไม่ได้เชื่อมต่อระบบหลังบ้าน — ใส่ URL ของ Apps Script ในหน้าตั้งค่า (⚙ มุมขวาบน) ก่อนบันทึก'); }
async function refresh(silent) {
  if (!state.apiUrl) { setSync('err', 'ยังไม่ได้ตั้งค่า'); return false; }
  setSync('busy', 'กำลังซิงก์…');
  try {
    const res = await api('bootstrap', { period: todayISO().slice(0, 7) });
    state.cfg = res.settings || {}; state.recent = res.recent || []; state.summary = res.summary || null;
    lsSet(LS.boot, JSON.stringify({ cfg: state.cfg, recent: state.recent.slice(0, 100), summary: state.summary, at: Date.now() }));
    setSync('ok', 'ซิงก์แล้ว'); aiIdle(); if (state.view === 'list') renderList(); return true;
  } catch (e) { setSync('err', e.message); if (!silent) toast(e.message, 'err'); return false; }
}
function applyCache() { const c = JSON.parse(lsGet(LS.boot) || 'null'); if (!c) return false; state.cfg = c.cfg || {}; state.recent = c.recent || []; state.summary = c.summary || null; return true; }
function clearLocal() { Object.keys(localStorage).filter(k => k.startsWith('tl2.')).forEach(k => lsDel(k)); location.reload(); }

/* ---------- bind + init ---------- */
function bind() {
  $('btnFwd').onclick = forward; $('btnBack').onclick = backward;
  $$('.tabs button').forEach(b => b.onclick = () => showView(b.dataset.v));
  $('btnSettings').onclick = openSettings; $('btnSaveSettings').onclick = saveSettings; $('btnTest').onclick = testConnection; $('btnClearLocal').onclick = () => ask('ล้างข้อมูลในเครื่อง', 'จะลบ URL, รหัส, ชื่อที่จำไว้ และลายเซ็นที่วาดไว้ในเครื่องนี้', 'ล้าง').then(ok => { if (ok) clearLocal(); });
  $('btnReload').onclick = () => loadData(true);
  $('btnLogout').onclick = logout;
  $('hdrLogo').src = LOGO_DATA; $('gateLogo').src = LOGO_DATA; $('favicon').href = LOGO_DATA;
  $$('.ov').forEach(o => o.addEventListener('click', ev => { if (ev.target === o && o.id !== 'ovAsk') closeOv(o.id); }));
  ['oName', 'oDept'].forEach(id => $(id).oninput = () => { renderNav(); if (id === 'oName') renderSig(); });
  $('btnSigDraw').onclick = () => { $('sigPadWrap').classList.remove('hidden'); $('sigHave').classList.add('hidden'); setTimeout(padInit, 30); };
  $('btnSigUpload').onclick = () => $('sigFile').click();
  $('sigFile').onchange = async ev => { const f = ev.target.files && ev.target.files[0]; if (!f) return; const r = await resizeImage(f); lsSet(sigKey(), r.preview); renderSig(); toast('บันทึกลายเซ็นในเครื่องแล้ว', 'ok'); ev.target.value = ''; };
  $('btnSigClear').onclick = () => { lsDel(sigKey()); if (state.who) state.who.drawn = ''; padClear(); renderSig(); };
  $$('#step2 .choice').forEach(b => b.onclick = () => pickReceipt(b.dataset.r));
  $$('[data-cam]').forEach(b => b.onclick = () => { pickTarget = b.dataset.cam; $('fileCam').click(); });
  $$('[data-file]').forEach(b => b.onclick = () => { pickTarget = b.dataset.file; $('fileAny').accept = pickTarget === 'pay' ? 'image/*' : 'image/*,application/pdf'; $('fileAny').click(); });
  $('fileCam').onchange = ev => addFiles(pickTarget, ev.target.files); $('fileAny').onchange = ev => addFiles(pickTarget, ev.target.files);
  $$('#payChips .chip, #payChipsB .chip').forEach(b => b.onclick = () => setPay(b.dataset.p));
  $$('#ctChips .chip').forEach(b => b.onclick = () => setCoverType(b.dataset.t));
  $('btnAddItem').onclick = () => { state.items.push({ desc: '', amount: '' }); renderItems(); const inputs = $$('#items input[data-k=desc]'); inputs[inputs.length - 1].focus(); };
  $('amount').oninput = () => { $('amount').classList.remove('ai', 'bad'); state.pages = []; state.pdf = null; };
  ['date', 'vendor', 'desc', 'note', 'bdate', 'bvendor', 'ctDetail', 'bnote'].forEach(id => $(id).oninput = () => { $(id).classList.remove('ai', 'bad'); state.pages = []; state.pdf = null; });
  $('btnMakePdf').onclick = makePdfPreview;
  $('btnNext').onclick = () => resetEntry(true); $('btnChangeWho').onclick = () => resetEntry(false);
  $$('#listFilters .chip').forEach(b => b.onclick = () => { state.listFilter = b.dataset.f; $$('#listFilters .chip').forEach(x => x.classList.toggle('on', x === b)); renderList(); });
  $('btnRefresh').onclick = () => refresh();
  window.addEventListener('online', () => refresh(true));
}
async function init() {
  loadLocal(); bind();
  await loadData(false);
  const cached = applyCache(); aiIdle();
  if (loginRequired() && !loadAuth()) { showGate(); return; }           // หน้าแรก = เข้าสู่ระบบด้วย Google
  $('stepper').hidden = false; showView('wiz'); goStep(1);
  renderSetupBanner();
  if (!state.apiUrl) { setSync('err', 'ยังไม่ได้ตั้งค่า URL ระบบหลังบ้าน'); return; }
  if (cached) setSync('ok', 'ใช้ข้อมูลที่แคชไว้');
  await refresh(cached);
}
document.addEventListener('DOMContentLoaded', init);
