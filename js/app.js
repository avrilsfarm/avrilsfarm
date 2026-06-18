'use strict';

/* ════ 상태 ════ */
let currentTab  = 'hygiene';
let stockSubTab = '원료';
let selectedDate = null;
const today = new Date();
let calYear = today.getFullYear();
let calMonth = today.getMonth();

/* ════ 초기화 ════ */
async function init() {
  try { await DB.seedIfEmpty(); } catch(e) { console.warn(e); }
  setupTabs();
  await renderTab(currentTab);
  try { checkNotifications(); } catch(e) {}
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await renderTab(currentTab);
    });
  });
}

async function renderTab(tab) {
  const el = document.getElementById('page-content');
  if (!el) return;
  el.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text3)"><i class="ti ti-loader" style="font-size:28px;animation:spin 1s linear infinite"></i></div>';
  try {
    if      (tab === 'stock')       await renderStock(el);
    else if (tab === 'manufacture') await renderManufacture(el);
    else if (tab === 'mfcheck')     await renderMfCheck(el);
    else if (tab === 'hygiene')     await renderHygiene(el);
    else if (tab === 'production')  await renderProduction(el);
    else if (tab === 'output')      await renderOutput(el);
    else if (tab === 'notify')      renderNotifySettings(el);
    else if (tab === 'barcode')     await renderBarcode(el);
  } catch(e) {
    el.innerHTML = `<div style="padding:24px;color:var(--red-text)">오류: ${e.message}</div>`;
    console.error(e);
  }
  try { await updateBadges(); } catch(e) {}
}

async function updateBadges() {
  const ing = await DB.getAll('ingredients');
  const hyg = await DB.getAll('hygiene');
  const pending = ing.filter(i => i.판정 === '미기입').length;
  const hb = document.getElementById('badge-hygiene');
  const overdue = checkOverdue(hyg);
  const cnt = pending + (overdue ? 1 : 0);
  if (hb) { hb.textContent = cnt > 0 ? cnt : ''; hb.style.display = cnt > 0 ? 'inline' : 'none'; }
}

function checkOverdue(hyg) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const mondayStr = monday.toISOString().split('T')[0];
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const hasClean = hyg.some(h => h.type==='청소점검' && h.date >= mondayStr);
  const hasPest  = hyg.some(h => h.type==='방충방서' && h.date?.startsWith(thisMonthStr));
  return !hasClean || !hasPest;
}

/* ═══════════════════════════════════
   원료 재고 — 카테고리별 연속 번호
════════════════════════════════════*/
async function renderStock(el) {
  const all = await DB.getAll('ingredients');
  const ingList = all.filter(i => i.stockType !== '포장재');
  const pkgList = all.filter(i => i.stockType === '포장재');
  const list = stockSubTab === '원료' ? ingList : pkgList;
  const cats = [...new Set(list.map(i => i.category))];
  const ok = list.filter(i => i.판정 === '적합').length;
  const pending = list.filter(i => i.판정 === '미기입').length;

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">원료 재고</h2>
    </div>
    <div class="subtab-row">
      <button class="subtab ${stockSubTab==='원료'?'on':''}" onclick="switchStockTab('원료')">원료 <span class="subtab-cnt">${ingList.length}</span></button>
      <button class="subtab ${stockSubTab==='포장재'?'on':''}" onclick="switchStockTab('포장재')">포장재 <span class="subtab-cnt">${pkgList.length}</span></button>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">전체 ${list.length}종</div>
      <div class="sum-chip sum-green">적합 ${ok}종</div>
      ${pending > 0 ? `<div class="sum-chip sum-orange">미기입 ${pending}종</div>` : ''}
    </div>
    ${list.length === 0
      ? `<div class="empty-hint"><div class="empty-icon">📦</div>등록된 ${stockSubTab}이 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>`
      : cats.map(cat => {
          const catItems = list.filter(i => i.category === cat);
          return `
          <div class="group-header">${cat}</div>
          ${catItems.map((i, catIdx) => `
            <div class="list-item" onclick="openIngForm(${i.id})">
              <div class="item-no">${catIdx + 1}</div>
              <div class="item-left">
                <div class="item-title">${i.원료명}</div>
                <div class="item-sub">${i.제조처||''}${i.수량?' · '+i.수량:''}${i.입고일?' · '+i.입고일:''}</div>
              </div>
              <div class="item-right">
                <span class="badge ${badgeClass(i.판정)}">${i.판정}</span>
                <span class="badge ${i.CoA==='수취'?'badge-green':'badge-orange'}">CoA ${i.CoA}</span>
              </div>
            </div>`).join('')}
          `;
        }).join('')}
    <button class="fab" onclick="openIngForm(null,'${stockSubTab}')"><i class="ti ti-plus"></i> 원료 추가</button>`;
}

function switchStockTab(tab) { stockSubTab = tab; renderTab('stock'); }

/* ═══════════════════════════════════
   제품 제조 — 제품 마스터(표준서) 연동
════════════════════════════════════*/
async function renderManufacture(el) {
  const [list, products] = await Promise.all([DB.getAll('batches'), DB.getAll('products')]);
  const prodMap = Object.fromEntries(products.map(p=>[p.id, p]));

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">제품 제조</h2>
      <button class="header-btn" onclick="openProductMasterList()" style="background:var(--mauve);color:#fff;border-color:var(--mauve)">
        <i class="ti ti-book-2"></i> 제품표준서
      </button>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">배치 ${list.length}건</div>
      <div class="sum-chip sum-green">KCL 완료 ${list.filter(b=>{ const p=prodMap[b.productId]; return p&&p.KCL; }).length}건</div>
    </div>
    ${list.length===0 ? `<div class="empty-hint"><div class="empty-icon">🧪</div>등록된 배치가 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>` : ''}
    ${list.map((b, idx) => {
      const prod = prodMap[b.productId] || {};
      return `
      <div class="card-block">
        <div class="card-top" onclick="toggleCard(this)">
          <div class="card-num">${idx+1}</div>
          <div class="card-left">
            <div class="card-title">${b.제품명||''}</div>
            <div class="card-sub">${b.문서번호||''} · ${b.제조번호||''}</div>
            <div class="card-sub">${b.date||''} · ${prod.제조방법||b.제조방법||''}</div>
          </div>
          <div class="card-right">
            <span class="badge ${badgeClass(b.상태)}">${b.상태||''}</span>
            <button class="icon-btn" onclick="event.stopPropagation(); openBatchForm(${b.id})" title="수정">
              <i class="ti ti-edit"></i>
            </button>
          </div>
        </div>
        <div class="card-detail hide">
          ${drow('제조방법', prod.제조방법||b.제조방법||'-')}
          ${drow('투입량', b.투입량+'g')}
          ${drow('이론수량 (표준서 기준)', prod.이론수량?prod.이론수량+'ea':'-')}
          ${drow('실제수량 (이번 배치)', b.실제수량?b.실제수량+'ea':'-')}
          ${drow('목표 중량 (표준서)', prod.목표중량||'90g ±5g')}
          ${drow('실측 중량', b.실측중량?b.실측중량+'g':'-')}
          ${drow('색상 기준 (표준서)', prod.색상기준||'-')}
          ${drow('색상 결과 (이번 배치)', b.색상결과||'-')}
          ${drow('KCL 성적서 (표준서)', prod.KCL||'미등록')}
          ${drow('내용량', prod.KCL내용량?prod.KCL내용량+'% (기준 97% 이상)':'-')}
          ${drow('유리알칼리', prod.KCL유리알칼리?prod.KCL유리알칼리+' (기준 0.1% 이하)':'-')}
          ${drow('알레르기 유발성분 (표준서)', prod.알레르기||b.알레르기||'-')}
          ${drow('이상 여부', b.이상||'-')}
          ${prod.전성분 ? drow('전성분 (표준서)', prod.전성분) : ''}
          ${prod.레시피&&prod.레시피.length ? `
            <div style="margin-top:8px;font-size:11px;font-weight:700;color:var(--teal-dark);padding-bottom:4px">
              원료 배합표 — ${prod.문서번호||'표준서'} 기준 (1kg 몰드)
            </div>
            <div style="overflow-x:auto">
            <table class="recipe-table">
              <thead><tr><th>No</th><th>원료명</th><th>INCI명칭</th><th>이론량(g)</th><th>비율(%)</th></tr></thead>
              <tbody>
                ${prod.레시피.map((r,i)=>`<tr>
                  <td>${i+1}</td>
                  <td>${r.원료명||''}</td>
                  <td style="font-size:10px;color:var(--text3)">${r.INCI||''}</td>
                  <td>${r.이론량||''}</td>
                  <td>${r.비율||''}</td>
                </tr>`).join('')}
                <tr><td colspan="3"><b>합계</b></td><td>${prod.기준투입량||''}</td><td>100</td></tr>
              </tbody>
            </table></div>` : ''}
          ${b.비고 ? drow('비고', b.비고) : ''}
          <div style="padding:10px 0 4px;display:flex;gap:8px">
            <button class="btn-sm solid" style="flex:1" onclick="quickPrintBatch(${b.id})">
              <i class="ti ti-printer"></i> 이 배치 서류 출력
            </button>
          </div>
        </div>
      </div>`;
    }).join('')}
    <button class="fab" onclick="openBatchForm()"><i class="ti ti-plus"></i> 배치 추가</button>`;
}

/* 제품 제조 탭에서 바로 PDF 출력 */
async function quickPrintBatch(batchId) {
  const [allBatches, products, ing] = await Promise.all([
    DB.getAll('batches'), DB.getAll('products'), DB.getAll('ingredients')
  ]);
  const batch = allBatches.find(b => b.id === batchId);
  if(!batch) { alert('배치 정보를 찾을 수 없습니다.'); return; }

  // 제품 마스터 정보 병합 (표준서 → 배치에 오버레이)
  const prod = products.find(p => p.id === batch.productId) || {};
  const merged = {
    ...batch,
    레시피:     prod.레시피     || batch.레시피,
    전성분:     prod.전성분     || batch.전성분,
    목표중량:   prod.목표중량   || batch.목표중량 || '90g ±5g',
    이론수량:   prod.이론수량   || batch.이론수량,
    알레르기:   prod.알레르기   || batch.알레르기,
    제조방법:   prod.제조방법   || batch.제조방법,
    색상기준:   prod.색상기준,
    유통기한:   prod.유통기한,
    보관방법:   prod.보관방법,
    기준투입량: prod.기준투입량,
    PS문서번호: prod.문서번호,  // AF-PS
  };

  // 배치 카드에서는 제조지시서만 출력 (시험성적서·표준서는 문서출력 탭 사용)
  const sep = '<div class="page-break"></div>';
  const pages = [buildMI(merged, products)];
  open$(pages.join(sep));
}

/* ════ 제품 마스터(표준서) 관리 폼 ════ */
async function openProductMasterForm(id) {
  const products = await DB.getAll('products');
  const item = id ? products.find(p=>p.id===id) : null;
  _pmRecipe = item?.레시피 ? JSON.parse(JSON.stringify(item.레시피)) : [];

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${id?'제품표준서 수정':'제품표준서 신규 등록'}</div>
    <div style="background:var(--mauve-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:12px;font-size:11px;color:var(--mauve-dark)">
      여기에 입력한 정보가 제품표준서(AF-PS)에 영구 저장되며, 배치 기록에서 자동 참조됩니다.
    </div>

    <label>제품명<input id="pm1" value="${item?.제품명||''}"></label>
    <label>문서번호 (AF-PS-XXX)<input id="pm2" value="${item?.문서번호||'AF-PS-'}" placeholder="AF-PS-006"></label>
    <label>제조방법<select id="pm3">
      <option ${item?.제조방법==='CP법'?'selected':''}>CP법</option>
      <option ${item?.제조방법==='MP법'?'selected':''}>MP법</option>
    </select></label>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>기준 투입량 (g)<input type="number" id="pm4" value="${item?.기준투입량||''}"></label>
      <label>이론 수량 (ea)<input type="number" id="pm5" value="${item?.이론수량||''}"></label>
    </div>

    <label>목표 중량<input id="pm6" value="${item?.목표중량||'90g ±5g'}" placeholder="90g ±5g"></label>
    <label>용량 표기<input id="pm7" value="${item?.용량||'90g'}" placeholder="90g"></label>
    <label>색상 기준<input id="pm8" value="${item?.색상기준||''}" placeholder="예: 오렌지·아나토 계열"></label>
    <label>유통기한<input id="pm9" value="${item?.유통기한||'제조일로부터 2년'}"></label>
    <label>보관방법<input id="pm10" value="${item?.보관방법||'직사광선 차단, 서늘하고 건조한 곳 보관'}"></label>

    <label>알레르기 유발성분<textarea id="pm11" rows="2">${item?.알레르기||''}</textarea></label>
    <label>전성분<textarea id="pm12" rows="4">${item?.전성분||''}</textarea></label>

    <label>바코드<input id="pm13" value="${item?.바코드||''}"></label>
    <label>제조번호 형식<input id="pm14" value="${item?.제조번호형식||'APBO'}" placeholder="예: APBO"></label>

    <div style="font-size:12px;font-weight:700;color:var(--text);margin:14px 0 6px;border-top:1px solid var(--border);padding-top:12px">KCL 시험성적서 (법정 검사)</div>
    <div style="background:var(--mauve-light);border-radius:var(--r-sm);padding:8px 10px;margin-bottom:8px;font-size:11px;color:var(--mauve-dark)">
      화장비누 법정 검사 결과 — 제품 형식 전체에 적용되는 성적서입니다.
    </div>
    <label style="display:block;text-align:center;border:1px dashed var(--teal);border-radius:var(--r-sm);padding:10px;margin-bottom:10px;cursor:pointer;background:var(--teal-light);color:var(--teal-dark);font-size:12px">
      📎 시험성적서 PDF 업로드하면 아래 항목 자동 입력
      <input type="file" accept=".pdf" style="display:none" onchange="uploadKclToForm(event)">
    </label>
    <div id="pm-kcl-status" style="font-size:11px;min-height:16px;margin-bottom:6px"></div>
    <label>KCL 접수번호<input id="pm-kcl" value="${item?.KCL||''}" placeholder="예: SC24-04502K"></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>발행번호<input id="pm-kcl-issue" value="${item?.KCL발행번호||''}" placeholder="예: 240304502"></label>
      <label>접수일<input type="date" id="pm-kcl-rcvdate" value="${item?.KCL접수일||''}"></label>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>내용량 결과 (%)<input id="pm-kcl-contents" value="${item?.KCL내용량||''}" placeholder="예: 103"></label>
      <label>유리알칼리 결과<input id="pm-kcl-alkali" value="${item?.KCL유리알칼리||''}" placeholder="예: 검출 안 됨"></label>
    </div>
    <label>발행일<input type="date" id="pm-kcl-issuedate" value="${item?.KCL발행일||''}"></label>

    <label>비고<input id="pm15" value="${item?.비고||''}"></label>

    <div style="font-size:12px;font-weight:700;color:var(--text);margin:14px 0 6px;border-top:1px solid var(--border);padding-top:12px">
      원료 배합표 <span style="font-weight:400;font-size:11px;color:var(--text3)">(제조지시서·시험성적서 PDF에 자동 반영)</span>
    </div>
    <label style="display:block;text-align:center;border:1px dashed var(--teal);border-radius:var(--r-sm);padding:10px;margin-bottom:10px;cursor:pointer;background:var(--teal-light);color:var(--teal-dark);font-size:12px">
      📎 제조지시서·표준서 .docx 업로드하면 배합표 자동 등록
      <input type="file" accept=".docx" style="display:none" onchange="uploadRecipeToForm(event)">
    </label>
    <div id="pm-recipe-status" style="font-size:11px;min-height:16px;margin-bottom:6px"></div>
    <div id="pm-recipe-table" style="overflow-x:auto;margin-bottom:8px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:var(--gray-bg)">
          <th style="padding:5px 4px;border:1px solid var(--border);text-align:center;width:28px">No</th>
          <th style="padding:5px 4px;border:1px solid var(--border)">원료명</th>
          <th style="padding:5px 4px;border:1px solid var(--border)">이론량(g)</th>
          <th style="padding:5px 4px;border:1px solid var(--border)">비율(%)</th>
          <th style="padding:5px 4px;border:1px solid var(--border);width:28px"></th>
        </tr></thead>
        <tbody id="pm-recipe-body">
          ${(item?.레시피||[]).map((r,i)=>`<tr data-idx="${i}">
            <td style="padding:3px 4px;border:1px solid var(--border);text-align:center">${i+1}</td>
            <td style="padding:3px 4px;border:1px solid var(--border)"><input style="width:100%;border:none;background:transparent;font-size:11px" value="${r.원료명||''}" oninput="pmRecipeEdit(${i},'원료명',this.value)"></td>
            <td style="padding:3px 4px;border:1px solid var(--border)"><input type="number" style="width:60px;border:none;background:transparent;font-size:11px" value="${r.이론량||''}" oninput="pmRecipeEdit(${i},'이론량',this.value)"></td>
            <td style="padding:3px 4px;border:1px solid var(--border)"><input type="number" style="width:50px;border:none;background:transparent;font-size:11px" value="${r.비율||''}" oninput="pmRecipeEdit(${i},'비율',this.value)"></td>
            <td style="padding:3px 4px;border:1px solid var(--border);text-align:center"><button onclick="pmRecipeDel(${i})" style="background:none;border:none;color:var(--red-text);cursor:pointer;font-size:13px">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <button onclick="pmRecipeAdd()" style="width:100%;padding:7px;border:1px dashed var(--border);border-radius:var(--r-sm);background:transparent;color:var(--teal-dark);font-size:12px;cursor:pointer;margin-bottom:4px">
      + 원료 행 추가
    </button>

    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('products',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveProductMaster(${id||'null'})">저장</button>
    </div>
    </div>`);
}

/* ── 제품표준서 폼 내부 — KCL/레시피 파일업로드 ── */
async function extractDocxLines(file) {
  if(!window.JSZip) throw new Error('JSZip 미로드');
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xmlFile = zip.file('word/document.xml');
  if(!xmlFile) throw new Error('document.xml 없음 — 올바른 .docx 파일인지 확인해주세요');
  const xml = await xmlFile.async('string');
  const text = xml
    .replace(/<w:p[ >]/g, '\n')
    .replace(/<w:tab[^>]*>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&#xD;/g,'\n')
    .replace(/\n\s*\n/g,'\n').trim();
  return toLines(text);
}

async function extractPdfLines(file, statusEl) {
  if(typeof pdfjsLib === 'undefined') throw new Error('PDF.js가 로드되지 않았습니다. 페이지를 새로고침 해주세요.');
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buf}).promise;
  let text = '';
  for(let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items;
    let lastY = null;
    for(const item of items) {
      const y = Math.round(item.transform[5]);
      if(lastY !== null && Math.abs(lastY - y) > 3) text += '\n';
      text += item.str + ' ';
      lastY = y;
    }
    text += '\n';
  }
  text = text.replace(/\s+\n/g, '\n').trim();

  // 텍스트가 없으면 스캔본 → OCR
  if(text.length < 20) {
    if(typeof Tesseract === 'undefined') throw new Error('OCR 라이브러리가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
    if(statusEl) statusEl.innerHTML = '<span style="color:var(--teal)">⏳ 스캔본 감지 — OCR 인식 중 (30초 소요)...</span>';
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({scale: 2.5});
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({canvasContext: ctx, viewport}).promise;
    const dataUrl = canvas.toDataURL('image/png');
    const result = await Tesseract.recognize(dataUrl, 'kor', {logger: () => {}});
    text = result.data.text;
  }
  return toLines(text);
}

async function uploadKclToForm(e) {
  const file = e.target.files[0];
  const st = document.getElementById('pm-kcl-status');
  if(!file) return;
  if(st) st.innerHTML = '<span style="color:var(--teal)">⏳ PDF 분석 중...</span>';
  try {
    const lines = await extractPdfLines(file, st);
    const kcl = parseKclFromLines(lines);
    if(!Object.keys(kcl).length) {
      if(st) st.innerHTML = '<span style="color:var(--amber-text)">⚠️ KCL 정보를 찾지 못했습니다. 직접 입력해주세요.</span>';
      return;
    }
    const setVal = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = v; };
    setVal('pm-kcl', kcl.KCL);
    setVal('pm-kcl-issue', kcl.KCL발행번호);
    setVal('pm-kcl-rcvdate', kcl.KCL접수일);
    setVal('pm-kcl-issuedate', kcl.KCL발행일);
    setVal('pm-kcl-contents', kcl.KCL내용량);
    setVal('pm-kcl-alkali', kcl.KCL유리알칼리);
    if(st) st.innerHTML = `<span style="color:var(--teal-dark)">✅ ${Object.keys(kcl).length}개 항목 자동 입력됨 — 저장을 눌러주세요</span>`;
  } catch(err) {
    if(st) st.innerHTML = `<span style="color:var(--red-text)">❌ ${err.message}</span>`;
  }
}

async function uploadRecipeToForm(e) {
  const file = e.target.files[0];
  const st = document.getElementById('pm-recipe-status');
  if(!file) return;
  if(st) st.innerHTML = '<span style="color:var(--teal)">⏳ 분석 중...</span>';
  try {
    const lines = await extractDocxLines(file);
    const recipe = parseRecipeFromLines(lines);
    if(!recipe.length) {
      if(st) st.innerHTML = '<span style="color:var(--amber-text)">⚠️ 배합표를 찾지 못했습니다. 직접 입력해주세요.</span>';
      return;
    }
    _pmRecipe = recipe;
    _renderPmRecipeTable();
    if(st) st.innerHTML = `<span style="color:var(--teal-dark)">✅ 원료 ${recipe.length}종 자동 등록됨 — 저장을 눌러주세요</span>`;
  } catch(err) {
    if(st) st.innerHTML = `<span style="color:var(--red-text)">❌ ${err.message}</span>`;
  }
}

/* ── 제품 마스터 레시피 편집 헬퍼 ── */
let _pmRecipe = [];

function pmRecipeEdit(idx, field, val) {
  if(!_pmRecipe[idx]) return;
  _pmRecipe[idx][field] = field==='이론량'||field==='비율' ? +val : val;
}

function pmRecipeDel(idx) {
  _pmRecipe.splice(idx, 1);
  _renderPmRecipeTable();
}

function pmRecipeAdd() {
  _pmRecipe.push({원료명:'', INCI:'', 이론량:0, 비율:0});
  _renderPmRecipeTable();
}

function _renderPmRecipeTable() {
  const tbody = document.getElementById('pm-recipe-body');
  if(!tbody) return;
  tbody.innerHTML = _pmRecipe.map((r,i)=>`<tr data-idx="${i}">
    <td style="padding:3px 4px;border:1px solid var(--border);text-align:center">${i+1}</td>
    <td style="padding:3px 4px;border:1px solid var(--border)"><input style="width:100%;border:none;background:transparent;font-size:11px" value="${r.원료명||''}" oninput="pmRecipeEdit(${i},'원료명',this.value)"></td>
    <td style="padding:3px 4px;border:1px solid var(--border)"><input type="number" style="width:60px;border:none;background:transparent;font-size:11px" value="${r.이론량||''}" oninput="pmRecipeEdit(${i},'이론량',this.value)"></td>
    <td style="padding:3px 4px;border:1px solid var(--border)"><input type="number" style="width:50px;border:none;background:transparent;font-size:11px" value="${r.비율||''}" oninput="pmRecipeEdit(${i},'비율',this.value)"></td>
    <td style="padding:3px 4px;border:1px solid var(--border);text-align:center"><button onclick="pmRecipeDel(${i})" style="background:none;border:none;color:var(--red-text);cursor:pointer;font-size:13px">✕</button></td>
  </tr>`).join('');
}

function collectPmRecipe() {
  return _pmRecipe.filter(r=>r.원료명);
}

async function openProductMasterList() {
  const products = await DB.getAll('products');
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">제품표준서 (AF-PS) 관리</div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px">
      배합비·전성분·목표중량 등 제품의 영구 기준 정보를 여기에 저장합니다.
      배치 기록(AF-MI)은 이 정보를 자동 참조합니다.
    </div>
    ${products.map(p=>`
      <div class="list-item" onclick="openProductMasterForm(${p.id})">
        <div class="item-left">
          <div class="item-title">${p.제품명}</div>
          <div class="item-sub">${p.문서번호} · ${p.제조방법} · 기준 ${p.기준투입량}g → ${p.이론수량}ea</div>
        </div>
        <div class="item-right">
          <i class="ti ti-edit" style="color:var(--text3)"></i>
        </div>
      </div>`).join('')}
    ${products.length===0?`<div class="empty-hint">등록된 제품이 없습니다</div>`:''}
    <div style="padding:16px">
      <button class="btn-sm solid" style="width:100%" onclick="closeSheet();openProductMasterForm(null)">
        <i class="ti ti-plus"></i> 신규 제품표준서 등록
      </button>
    </div>
    </div>`);
}
window.openProductMasterList = openProductMasterList;

async function saveProductMaster(id) {
  const existing = id ? await DB.getOne('products', id) : null;
  const data = {
    제품명: v('pm1'), 문서번호: v('pm2'), 제조방법: v('pm3'),
    기준투입량: +v('pm4'), 이론수량: +v('pm5'),
    목표중량: v('pm6'), 용량: v('pm7'), 색상기준: v('pm8'),
    유통기한: v('pm9'), 보관방법: v('pm10'),
    알레르기: v('pm11'), 전성분: v('pm12'),
    바코드: v('pm13'), 제조번호형식: v('pm14'), 비고: v('pm15'),
    KCL: v('pm-kcl'),
    KCL발행번호: v('pm-kcl-issue'),
    KCL접수일: v('pm-kcl-rcvdate'),
    KCL발행일: v('pm-kcl-issuedate'),
    KCL내용량: v('pm-kcl-contents'),
    KCL유리알칼리: v('pm-kcl-alkali'),
    레시피: collectPmRecipe(),
    품질기준: {내용량:'97% 이상', 유리알칼리:'0.1% 이하'},
  };
  if(id) await DB.put('products', {...data, id});
  else   await DB.add('products', data);
  closeSheet(); await renderTab('manufacture');
}

/* ════ 제조 점검 ════ */
async function renderMfCheck(el) {
  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">제조 점검</h2></div>
    <div class="info-banner">
      <i class="ti ti-info-circle"></i>
      <span>CP법 제조 전 체크리스트 · AF-MMS-001 §3 기준</span>
    </div>
    <div class="group-header">CP법 작업 전 필수</div>
    ${['내화학성 장갑 착용','고글 착용','마스크 착용','작업대 에탄올 소독','전자저울 영점 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <div class="group-header mt16">온도·습도 관리</div>
    <div class="check-item" onclick="toggleCheck(this)">
      <div class="check-circle"></div>
      <span class="check-label">온도·습도 기록</span>
    </div>
    <div class="group-header mt16">완제품 출하 전</div>
    ${['외관·성상 육안검사','목표 중량 확인','표시사항(전성분·사용기한) 확인','KCL 성적서 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)">
        <div class="check-circle"></div>
        <span class="check-label">${item}</span>
      </div>`).join('')}
    <button class="save-btn mt20" onclick="saveChecklist()">점검 완료 저장</button>`;
}

/* ═══════════════════════════════════
   위생 점검 — 설비점검 항목 추가
════════════════════════════════════*/
async function renderHygiene(el) {
  const hyg = await DB.getAll('hygiene');
  const ym = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const monthRecs = hyg.filter(h => h.date && h.date.startsWith(ym));
  const datesIssue  = new Set(hyg.filter(h=>h.status==='문제임박'&&h.date&&h.date.startsWith(ym)).map(h=>h.date));
  const datesRecord = new Set(monthRecs.map(h=>h.date));
  const displayRecs = selectedDate && selectedDate.startsWith(ym)
    ? monthRecs.filter(r=>r.date===selectedDate)
    : monthRecs;

  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay()+6)%7));
  const mondayStr = monday.toISOString().split('T')[0];
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const hasClean = hyg.some(h => h.type==='청소점검' && h.date >= mondayStr);
  const hasPest  = hyg.some(h => h.type==='방충방서' && h.date?.startsWith(thisMonthStr));
  const overdueItems = [];
  if (!hasClean) overdueItems.push('이번 주 청소점검 미기록');
  if (!hasPest)  overdueItems.push('이번 달 방충방서 미기록');

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">위생 점검 기록</h2></div>

    ${overdueItems.length > 0 ? `
      <div class="overdue-banner">
        <i class="ti ti-alert-triangle" style="font-size:16px;flex-shrink:0"></i>
        <div>
          <div style="font-weight:700;margin-bottom:2px">밀린 점검이 있습니다</div>
          <div style="font-size:11px">${overdueItems.join(' · ')}</div>
        </div>
      </div>` : ''}

    <div class="hygiene-banner" onclick="openHygieneForm()">
      <i class="ti ti-plus-circle"></i>
      <div class="hb-text">
        <div class="hb-title">오늘 점검 기록 추가</div>
        <div class="hb-sub">청소·온도습도·방충·설비 기록</div>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--teal);margin-left:auto"></i>
    </div>

    <div class="cal-nav">
      <button class="cal-arrow" onclick="changeMonth(-1)"><i class="ti ti-chevron-left"></i></button>
      <span class="cal-title">${calYear}년 ${calMonth+1}월</span>
      <button class="cal-arrow" onclick="changeMonth(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="calendar">${buildCalendar(calYear, calMonth, datesRecord, datesIssue)}</div>

    <div class="records-section">
      <div class="records-month">
        <span>${selectedDate&&selectedDate.startsWith(ym)?selectedDate+' 기록':calYear+'년 '+(calMonth+1)+'월 전체'}</span>
        ${selectedDate&&selectedDate.startsWith(ym)?`
          <span style="display:flex;gap:6px">
            <button class="btn-sm" onclick="clearDateFilter()">전체보기</button>
            <button class="btn-sm solid" onclick="openHygieneForm('${selectedDate}')">+ 기록</button>
          </span>`:
          `<span class="badge ${monthRecs.length>0?'badge-green':'badge-gray'}">${monthRecs.length}건</span>`
        }
      </div>
      ${displayRecs.length > 0
        ? displayRecs.map(r => recordItem(r)).join('')
        : `<div class="empty-hint">
             <div class="empty-icon">${selectedDate&&selectedDate.startsWith(ym)?'📅':'📋'}</div>
             ${selectedDate&&selectedDate.startsWith(ym)?'이 날 기록이 없습니다':'이번 달 기록이 없습니다'}
             <br><small style="font-size:12px">위 + 버튼으로 기록하세요</small>
           </div>`}
    </div>
    <button class="fab" onclick="openHygieneForm()"><i class="ti ti-plus"></i> 점검 기록</button>`;
}

function buildCalendar(year, month, hasRecord, hasIssue) {
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month+1, 0).getDate();
  const dow = ['월','화','수','목','금','토','일'];
  let html = `<div class="cal-grid">`;
  dow.forEach(d => html += `<div class="cal-dow">${d}</div>`);
  const offset = (firstDay+6)%7;
  for (let i=0;i<offset;i++) html += `<div class="cal-day empty"></div>`;
  const todayStr = today.toISOString().split('T')[0];
  for (let d=1;d<=days;d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = ds === todayStr;
    const isSel = ds === selectedDate;
    html += `<div class="cal-day${isToday?' today':''}${isSel?' selected':''}" onclick="selectDate('${ds}')">
      <span class="cal-num">${d}</span>
      ${hasIssue.has(ds)?'<span class="cal-dot dot-red"></span>':hasRecord.has(ds)?'<span class="cal-dot dot-green"></span>':''}
    </div>`;
  }
  return html + '</div>';
}

function recordItem(r) {
  const lbl = {'청소점검':'청소 점검','온도·습도':'온도·습도','제조위생':'제조 위생','방충방서':'방충·방서','설비점검':'설비 점검'}[r.type]||r.type;
  const title = r.type==='온도·습도' ? `온도 ${r.온도}°C / 습도 ${r.습도}%` : lbl;
  const icon = {'청소점검':'ti-wash','온도·습도':'ti-temperature','제조위생':'ti-flask','방충방서':'ti-bug','설비점검':'ti-tool'}[r.type]||'ti-clipboard';
  return `<div class="record-row" onclick="openHygieneEditForm(${r.id})">
    <div style="width:30px;height:30px;background:var(--teal-light);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px">
      <i class="ti ${icon}" style="color:var(--teal);font-size:15px"></i>
    </div>
    <div class="record-left">
      <div class="record-title">${title}</div>
      <div class="record-sub">${r.date||''} · ${r.확인자||''} ${r.이슈?'· ⚠️ '+r.이슈:''}</div>
    </div>
    <div class="record-right">
      <div class="record-type-label">${lbl}</div>
      <span class="badge ${r.status==='완료'?'badge-green':r.status==='문제임박'?'badge-orange':'badge-gray'}">${r.status||''}</span>
    </div>
  </div>`;
}

/* ═══════════════════════════════════
   생산실적 — 배치내역 제외, 판매채널 수정
════════════════════════════════════*/
async function renderProduction(el) {
  const prods = await DB.getAll('production');

  const totalQty = prods.reduce((s,p)=>s+(+p.수량||0),0);
  const byChannel = {};
  prods.forEach(p => {
    const ch = p.채널||'기타';
    byChannel[ch] = (byChannel[ch]||0) + (+p.수량||0);
  });

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">생산실적</h2></div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">기록 ${prods.length}건</div>
      <div class="sum-chip sum-green">총 ${totalQty}개</div>
    </div>

    ${Object.keys(byChannel).length > 0 ? `
    <div class="section-label">판매 채널 요약</div>
    <div style="padding:0 16px 12px;display:flex;flex-wrap:wrap;gap:8px">
      ${Object.entries(byChannel).map(([ch,cnt])=>`
        <div style="background:var(--teal-light);border-radius:20px;padding:6px 14px;font-size:12px;color:var(--teal-dark)">
          ${ch} <strong>${cnt}개</strong>
        </div>`).join('')}
    </div>` : ''}

    <div class="section-label">생산실적 기록</div>
    ${prods.length===0?`<div class="empty-hint"><div class="empty-icon">📊</div>아직 생산실적이 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>`:''}
    ${prods.slice().reverse().map(p=>`
      <div class="list-item" onclick="openProductionForm(${p.id})">
        <div class="item-left">
          <div class="item-title">${p.제품명||''}</div>
          <div class="item-sub">${p.date||''} · ${p.수량||''}개 · ${p.유형||''} · ${p.채널||''}</div>
        </div>
        <div class="item-right">
          <span class="badge ${p.유형==='출하'?'badge-green':p.유형==='생산'?'badge-mauve':'badge-gray'}">${p.유형||''}</span>
          <button class="icon-btn" onclick="event.stopPropagation();openProductionForm(${p.id})"><i class="ti ti-edit"></i></button>
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openProductionForm()"><i class="ti ti-plus"></i> 실적 추가</button>`;
}

/* ═══════════════════════════════════
   문서 출력
════════════════════════════════════*/
async function renderOutput(el) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth()+1;
  const [hyg, batches, products] = await Promise.all([
    DB.getAll('hygiene'), DB.getAll('batches'), DB.getAll('products')
  ]);

  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">문서 출력</h2></div>

    <!-- ① 제품별 서류 출력 -->
    <div class="output-section-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div class="output-section-title" style="margin:0">📄 제품별 서류 출력</div>
        <div style="display:flex;gap:6px">
          <button class="btn-sm" onclick="setAllDocChk(true)">전체선택</button>
          <button class="btn-sm" onclick="setAllDocChk(false)">전체해제</button>
        </div>
      </div>
      <label class="output-field-label">배치 선택 <span style="font-weight:400;color:var(--text3)">(제조지시서·시험성적서·표준서에 필요)</span></label>
      <select id="out-product" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text);font-size:14px;margin-bottom:10px">
        <option value="">-- 배치 미선택 (기록서류만 출력) --</option>
        ${batches.map(b=>`<option value="${b.id}">[${b.date||'날짜없음'}] ${b.제품명||''} — ${b.제조번호||'제조번호없음'}</option>`).join('')}
      </select>
      <label class="output-field-label">출력할 서류 선택</label>
      <div class="doc-check-inline">
        ${[
          {key:'mi',  name:'제조지시서',    note:'배치 필요'},
          {key:'tr',  name:'시험성적서',    note:'배치 필요'},
          {key:'ps',  name:'제품표준서',    note:'배치 필요'},
          {key:'mms', name:'원료입고기록서', note:'배치 불필요'},
          {key:'qcm', name:'완제품출하검사', note:'배치 불필요'},
          {key:'mh',  name:'위생점검기록',  note:'배치 불필요'},
        ].map(d=>`
          <label class="doc-check-pill" title="${d.note}">
            <input type="checkbox" id="chk-${d.key}" checked>
            <span>${d.name}</span>
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="output-btn" style="flex:1" onclick="runGeneratePDF()">
          <i class="ti ti-printer"></i> 인쇄 / PDF 저장
        </button>
      </div>
      <div id="pdf-status" style="padding:6px 0;font-size:11px;color:var(--text3);min-height:20px"></div>
    </div>

    <!-- ② 월별 위생점검 출력 (범위 선택) -->
    <div class="output-section-card">
      <div class="output-section-title">🗒 월별 위생점검 기록 출력</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">출력할 월 범위를 선택하세요</div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <select id="out-year" style="padding:8px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text)">
          ${Array.from({length:3},(_,i)=>y-i).map(yr=>`<option ${yr===y?'selected':''}>${yr}</option>`).join('')}
        </select>
        <span style="color:var(--text3)">년</span>
        <select id="out-month-start" style="padding:8px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text)">
          ${Array.from({length:12},(_,i)=>i+1).map(mo=>`<option ${mo===m?'selected':''}>${mo}</option>`).join('')}
        </select>
        <span style="color:var(--text3)">월 ~</span>
        <select id="out-month-end" style="padding:8px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text)">
          ${Array.from({length:12},(_,i)=>i+1).map(mo=>`<option ${mo===m?'selected':''}>${mo}</option>`).join('')}
        </select>
        <span style="color:var(--text3)">월</span>
      </div>
      <button class="output-btn-sec" onclick="printSelectedMonth()">
        <i class="ti ti-printer"></i> 위생점검 출력
      </button>
    </div>

    <!-- ③ 4대 기준서 출력 (3대 기준서 + 제품표준서 통합) -->
    <div class="output-section-card">
      <div class="output-section-title">📋 4대 기준서 출력</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">화장품제조업 법적 필수 문서 · 클릭 시 새 창</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
        ${[
          {key:'mms001', name:'제조관리기준서', code:'AF-MMS-001'},
          {key:'hms001', name:'제조위생관리기준서', code:'AF-HMS-001'},
          {key:'qcm001', name:'품질관리기준서', code:'AF-QCM-001'},
        ].map(d=>`
          <button class="output-btn-sec" onclick="openStandardDoc('${d.key}')" style="text-align:left;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px">
            <span style="font-size:11px;font-weight:700;color:var(--text)">${d.name}</span>
            <span style="font-size:10px;color:var(--text3)">${d.code}</span>
          </button>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;border-top:1px solid var(--border);padding-top:10px">제품표준서 (AF-PS) · 제품 제조 탭에서 추가/관리</div>
      ${products.length === 0
        ? `<div style="font-size:12px;color:var(--text3);padding:8px">등록된 제품표준서가 없습니다<br>제품 제조 탭에서 먼저 등록해주세요</div>`
        : `<div style="display:flex;gap:8px;align-items:center">
            <select id="ps-select" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--card);color:var(--text);font-size:13px">
              <option value="">-- 표준서 선택 --</option>
              ${products.map(p=>`<option value="${p.id}">${p.제품명||'미등록'}${p.문서번호?' ('+p.문서번호+')':''}</option>`).join('')}
            </select>
            <button class="output-btn-sec" onclick="openSelectedStandardDoc()" style="white-space:nowrap;padding:10px 16px">
              <i class="ti ti-external-link"></i> 열기
            </button>
          </div>`
      }
    </div>

    <!-- ⑤ 파일 업로드 & 자동 등록 -->
    <div class="output-section-card">
      <div class="output-section-title">📁 파일 업로드 & 자동 등록</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">
        <b>지원 형식</b><br>
        · <b>.json</b> 백업 파일 → 데이터 전체 복원<br>
        · <b>.docx</b> 제품표준서(AF-PS) → 제품표준서 자동 등록/업데이트<br>
        · <b>.docx</b> 제조지시서(AF-MI) → 배치 자동 등록<br>
        · <b>.docx</b> 기록서(R-MMS) → 원료·설비 자동 등록<br>
        · <b>.docx</b> 기록서(R-MH) → 위생점검 자동 등록<br>
        · <b>.docx</b> 기록서(R-QCM) → 완제품출하 인식
      </div>
      <div class="dropzone" id="dropzone-area"
           ondragover="event.preventDefault();this.classList.add('drag-over')"
           ondragleave="this.classList.remove('drag-over')"
           ondrop="handleFileDrop(event)">
        <div class="dropzone-icon">📄</div>
        <div class="dropzone-text">파일을 드래그하거나 탭해서 선택</div>
        <div class="dropzone-sub">AF-PS, AF-MI .docx / .json 백업</div>
        <input type="file" id="file-upload" accept=".docx,.txt,.json,.pdf"
          style="position:absolute;inset:0;opacity:0;cursor:pointer"
          onchange="handleFileUpload(event)">
      </div>
      <div id="upload-result" style="padding:8px 0;font-size:12px;min-height:28px;color:var(--text3)">
        파일을 선택하면 자동으로 분석합니다
      </div>
    </div>

    <!-- ⑥ 클라우드 동기화 -->
    <div class="output-section-card">
      <div class="output-section-title">☁️ 웹·모바일 데이터 동기화</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.8;margin-bottom:10px;background:var(--gray-bg);border-radius:var(--r-sm);padding:10px 12px">
        <b>사용 방법</b><br>
        ① GitHub에 <b>avrilsfarm/avrilsfarm</b> 저장소가 있어야 해요 (지금 쓰시는 GitHub Pages 사이트 저장소).<br>
        ② <b>알림·설정 탭</b>에서 GitHub Personal Access Token을 입력 후 저장.<br>
        ③ 현재 기기에서 <b>클라우드에 저장</b> 클릭 → 데이터가 저장소의 sync-data.json 파일로 업로드됨.<br>
        ④ 다른 기기(모바일 등)에서 같은 앱 열고 <b>클라우드에서 불러오기</b> 클릭 → 데이터 받아옴.<br>
        <span style="color:var(--amber-text)">⚠️ 양쪽에서 동시에 입력하면 나중에 저장한 쪽이 덮어써요. 한쪽에서만 입력 후 동기화하는 걸 권장해요.</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="output-btn-sec" onclick="cloudSave()" style="background:var(--teal-light)!important;border-color:var(--teal)!important">
          <i class="ti ti-cloud-upload"></i> 클라우드에 저장
        </button>
        <button class="output-btn-sec" onclick="cloudLoad()">
          <i class="ti ti-cloud-download"></i> 클라우드에서 불러오기
        </button>
      </div>
      <div id="sync-status" style="padding:6px 0;font-size:11px;color:var(--text3);min-height:20px"></div>
    </div>

    <!-- ⑦ 과거 이력 조회 -->
    <div class="output-section-card">
      <div class="output-section-title">🗂 과거 이력 조회</div>
      <div id="history-section"></div>
    </div>`;

  renderHistory(document.getElementById('history-section'), hyg, batches);
}

/* ── 서류 전체선택/해제 ── */
function setAllDocChk(val) {
  ['mi','tr','ps','mms','qcm','mh'].forEach(k=>{
    const el = document.getElementById('chk-'+k);
    if(el) el.checked = val;
  });
}

/* ── 월별 위생점검 출력 (범위) ── */
async function printSelectedMonth() {
  const y = +document.getElementById('out-year')?.value;
  const ms = +document.getElementById('out-month-start')?.value;
  const me = +document.getElementById('out-month-end')?.value;
  if(!y) { alert('연도를 선택하세요'); return; }
  try {
    const hyg = await DB.getAll('hygiene');
    // 위생점검 데이터 날짜 패딩 정규화 (YYYY-M-D → YYYY-MM-DD)
    const hygNorm = hyg.map(h => {
      if (h.date && /^\d{4}-\d{1,2}-\d{1,2}$/.test(h.date)) {
        const [yy, mm, dd] = h.date.split('-');
        h = { ...h, date: `${yy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` };
      }
      return h;
    });
    const sep = '<div class="page-break"></div>';
    const pages = [];
    const start = Math.min(ms||1, me||ms||1), end = Math.max(ms||1, me||ms||1);
    for(let mo = start; mo <= end; mo++) {
      pages.push(buildMH(hygNorm, y, mo));
    }
    if(!pages.length) { alert('출력할 데이터가 없습니다'); return; }
    const w = open$(pages.join(sep));
    if(!w) {
      alert('팝업이 차단되었습니다.\n브라우저 주소창 오른쪽의 팝업 허용 버튼을 클릭한 후 다시 시도해주세요.');
    }
  } catch(e) {
    console.error('printSelectedMonth error:', e);
    alert('출력 중 오류가 발생했습니다: ' + e.message);
  }
}

/* ── 제품표준서 출력 (productId로) ── */
async function openStandardDocByProdId(prodId) {
  const [batches, ing, products] = await Promise.all([
    DB.getAll('batches'), DB.getAll('ingredients'), DB.getAll('products')
  ]);
  const prod = products.find(p=>p.id===prodId);
  if(!prod) { alert('제품 정보를 찾을 수 없습니다'); return; }
  const batch = batches.find(b=>b.productId===prodId) || {제품명: prod.제품명, productId: prodId, 문서번호: prod.문서번호?.replace('AF-PS','AF-MI')||''};
  open$(buildPS(batch, ing, products));
}

function openSelectedStandardDoc() {
  const sel = document.getElementById('ps-select');
  if(!sel || !sel.value) { alert('표준서를 선택해주세요.'); return; }
  openStandardDocByProdId(Number(sel.value));
}

/* ── 클라우드 동기화 (GitHub API) ── */
async function cloudSave() {
  const st = document.getElementById('sync-status');
  const token = localStorage.getItem('gh_token');
  if(!token) {
    if(st) st.innerHTML = '<span style="color:var(--amber-text)">⚠️ 설정 탭에서 GitHub Token을 먼저 입력해주세요</span>';
    return;
  }
  if(st) st.textContent = '⏳ 저장 중...';
  try {
    const data = await DB.exportAll();
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    // 기존 파일 SHA 조회
    let sha = '';
    const existing = await fetch('https://api.github.com/repos/avrilsfarm/avrilsfarm/contents/sync-data.json', {
      headers: {'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json'}
    });
    if(existing.ok) { const d = await existing.json(); sha = d.sha; }
    // 파일 업데이트
    const res = await fetch('https://api.github.com/repos/avrilsfarm/avrilsfarm/contents/sync-data.json', {
      method: 'PUT',
      headers: {'Authorization': `token ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        message: `데이터 동기화 ${new Date().toLocaleString('ko')}`,
        content,
        ...(sha ? {sha} : {})
      })
    });
    if(res.ok) {
      if(st) st.innerHTML = '<span style="color:var(--teal-dark)">✅ 클라우드 저장 완료 — 모바일에서 불러오기 하세요</span>';
    } else {
      const err = await res.json();
      if(st) st.innerHTML = `<span style="color:var(--red-text)">❌ 저장 실패: ${err.message}</span>`;
    }
  } catch(e) {
    if(st) st.innerHTML = `<span style="color:var(--red-text)">❌ 오류: ${e.message}</span>`;
  }
}

async function cloudLoad() {
  const st = document.getElementById('sync-status');
  if(st) st.textContent = '⏳ 불러오는 중...';
  try {
    // 공개 repo라면 raw로 직접 접근 가능
    const res = await fetch(`https://raw.githubusercontent.com/avrilsfarm/avrilsfarm/main/sync-data.json?t=${Date.now()}`);
    if(!res.ok) throw new Error('sync-data.json 없음 — 먼저 저장해주세요');
    const data = await res.json();
    if(!confirm('클라우드 데이터로 덮어쓸까요?\n현재 기기 데이터는 사라집니다.')) {
      if(st) st.textContent = '취소됐습니다';
      return;
    }
    await DB.importAll(data);
    if(st) st.innerHTML = '<span style="color:var(--teal-dark)">✅ 동기화 완료! 앱을 새로고침하세요.</span>';
    setTimeout(()=>location.reload(), 1500);
  } catch(e) {
    if(st) st.innerHTML = `<span style="color:var(--red-text)">❌ 불러오기 실패: ${e.message}</span>`;
  }
}

/* ── PDF 출력 실행 (제품 미선택 시 제품 무관 서류만) ── */
async function runGeneratePDF() {
  const statusEl = document.getElementById('pdf-status');
  if(statusEl) statusEl.textContent = '⏳ PDF 생성 중...';

  const productId = document.getElementById('out-product')?.value;
  const chk = key => document.getElementById('chk-'+key)?.checked;

  const [hyg, ing, allBatches, products] = await Promise.all([
    DB.getAll('hygiene'), DB.getAll('ingredients'), DB.getAll('batches'), DB.getAll('products')
  ]);

  const now = new Date();
  const y = document.getElementById('out-year')?.value || now.getFullYear();
  const m = document.getElementById('out-month-start')?.value || (now.getMonth()+1);

  const selectedBatch = productId ? allBatches.find(b => String(b.id)===String(productId)) : null;
  const sep = '<div class="page-break"></div>';
  const pages = [];

  // 제품 무관 서류 (제품 선택 없어도 출력)
  if(chk('mms')) pages.push(buildMMS(ing, hyg));
  if(chk('qcm')) pages.push(buildQCM(allBatches, products));
  if(chk('mh'))  pages.push(buildMH(hyg, +y, +m));

  // 제품 필요 서류
  if(selectedBatch) {
    if(chk('mi')) pages.push(buildMI(selectedBatch, products));
    if(chk('tr')) pages.push(buildTR(selectedBatch, ing, products));
    if(chk('ps')) pages.push(buildPS(selectedBatch, ing, products));
  } else if(chk('mi')||chk('tr')||chk('ps')) {
    if(statusEl) statusEl.innerHTML = '<span style="color:var(--amber-text)">⚠️ 제조지시서·시험성적서·제품표준서는 제품 선택이 필요합니다</span>';
    if(!pages.length) return;
  }

  if(!pages.length) {
    if(statusEl) statusEl.innerHTML = '<span style="color:var(--red-text)">출력할 서류를 하나 이상 선택하세요</span>';
    return;
  }

  if(statusEl) statusEl.textContent = '';
  open$(pages.join(sep));
}

/* ── 인쇄 전용 ── */
async function runPrintDoc() {
  await runGeneratePDF();
}

/* ── 4대 기준서 출력 ── */
async function openStandardDoc(key) {
  const [batches, ing, products] = await Promise.all([DB.getAll('batches'), DB.getAll('ingredients'), DB.getAll('products')]);
  const sep = '<div class="page-break"></div>';

  const pages = {
    'mms001':    () => buildStdMMS001(),
    'hms001':    () => buildStdHMS001(),
    'qcm001':    () => buildStdQCM001(),
    'ps-carrot': () => buildPS(batches.find(b=>b.제품명&&b.제품명.includes('당근'))||{제품명:'에이브릴팜 당근비누', productId: products.find(p=>p.제품명.includes('당근'))?.id}, ing, products),
    'ps-minari': () => buildPS(batches.find(b=>b.제품명&&b.제품명.includes('미나리'))||{제품명:'에이브릴팜 미나리비누', productId: products.find(p=>p.제품명.includes('미나리'))?.id}, ing, products),
  };

  if(pages[key]) open$(pages[key]());
}

/* 기준서 빌더 (간략 버전 - 클릭하면 pdf.js의 open$으로 열림) */
/* ════ 4대 기준서 PDF 빌더 — 업로드 문서 기준 ════ */

function stdHd(title, sub, docNo, revNo, date) {
  return `<div class="doc">
  <div class="doc-title">에이브릴팜</div>
  <div class="doc-sub">${title}</div>
  <div class="doc-meta">
    <span><b>문서번호</b> ${docNo}</span>
    <span><b>제정일자</b> ${date}</span>
    <span><b>개정번호</b> ${revNo}</span>
    <span><b>작성/확인</b> 변민정 (인)</span>
    <span><b>관리구분</b> ■ 관리본 □ 비관리본</span>
  </div>`;
}
function stdFt() {
  return `<div class="foot">에이브릴팜 · 경기도 시흥시 진말1로 18, 에스엠타워 303호 · TEL 0507-1346-8739 · 화장품제조업 등록번호 제6494호 · 책임판매업 등록번호 제18216호</div></div>`;
}

function buildStdMMS001() {
  return stdHd('제조관리기준서','Manufacturing Management Standard · AF-MMS-001','AF-MMS-001','Rev.01','2026.05.27') + `
  <div class="sec">■ 1. 목적 및 적용범위</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>원료 입고부터 완제품 출고까지 전 공정의 관리 기준을 정한다.</li>
    <li>에이브릴팜 작업장(시흥시 진말1로 18, 303호) 내 모든 제조 활동에 적용한다.</li>
    <li>대표자 1인(변민정)이 제조관리의 모든 책임을 진다.</li>
  </ul>
  <div class="sec">■ 2. 원자재 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>입고 시 품명·수량·포장 상태·이물 여부 확인 → 원료입고기록서(R-MMS-01) 작성</li>
    <li>제조처 CoA(성적서) 수취 후 원료입고기록서와 함께 보관</li>
    <li>부적합 원료: "부적합" 라벨 부착 후 격리, 반품 또는 폐기</li>
    <li>보관: 직사광선 차단, 서늘·건조한 장소. 가성소다(NaOH)는 밀폐 용기 별도 보관</li>
    <li>선입선출(FIFO) 원칙. 개봉 원료는 개봉일 표기 후 밀봉</li>
  </ul>
  <div class="sec">■ 3. 제조 공정 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>제조 전 제조지시서(AF-MI) 작성 → 원료 계량 → 공정 진행 → 수율 기록</li>
    <li>원료 계량: 전자저울로 이론량 ±1% 이내 확인</li>
    <li>CP법: 소다수·오일 온도(27-30°C) 확인, 트레이스 후 첨가물 투입</li>
    <li>CP법 작업 시 내화학성 장갑·고글·마스크 반드시 착용</li>
    <li>이상(분리·변색·이취) 발생 시 작업 중단 → 원인 파악 → 제조지시서 이상란 기록</li>
  </ul>
  <div class="sec">■ 4. 시설·기구 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>분기 1회 이상 설비 점검 → 설비관리기록서(R-MMS-02) 작성</li>
    <li>전자저울: 연 1회 이상 검교정. 사용 전 영점 확인</li>
    <li>이상 기기: 즉시 사용 중단, "사용불가" 표시 후 수리 또는 교체</li>
  </ul>
  <div class="sec">■ 5. 완제품 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>출하 전 외관·중량·표시사항(전성분·사용기한) 최종 확인</li>
    <li>원료, 반제품, 완제품은 구분된 공간에 보관</li>
    <li>출하기록(제품명·제조번호·수량·출하일) 작성 보관</li>
  </ul>
  <div class="sec">■ 6. 문서 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>모든 기록은 최종 기재일로부터 3년 이상 보관</li>
    <li>개정 시 개정이력에 일자·내용·작성자 기재</li>
  </ul>
  ` + stdFt();
}

function buildStdHMS001() {
  return stdHd('제조위생관리기준서','Manufacturing Hygiene Standard · AF-HMS-001','AF-HMS-001','Rev.00','2026.05.27') + `
  <div class="sec">■ 1. 목적 · 적용범위</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>작업장·설비·기구의 청결 및 작업원 위생 관리 기준을 정한다.</li>
    <li>에이브릴팜 작업장 내 모든 제조 활동에 적용. 대표자(변민정) 1인 책임</li>
  </ul>
  <div class="sec">■ 2. 작업원 건강관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>피부질환·상처·감염성 질환 시 제조 작업 참여 금지</li>
    <li>제조 전 건강 자가 점검. 이상 시 즉시 작업 중단</li>
  </ul>
  <div class="sec">■ 3. 작업원 위생</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>작업 전: 비누 세척 → 70% 에탄올 소독</li>
    <li>화장실·외부 접촉 후 재세척·소독</li>
    <li>작업 중 음식물 섭취·흡연 금지. 코·입·눈 만지지 않기</li>
  </ul>
  <div class="sec">■ 4. 복장 규정</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>기본: 앞치마, 머리망(위생모), 위생장갑 착용</li>
    <li>CP법(가성소다) 작업: 내화학성 장갑 + 고글 + 마스크 반드시 착용</li>
  </ul>
  <div class="sec">■ 5. 청소 방법 및 주기</div>
  <table><thead><tr><th>구분</th><th>내용</th><th>주기</th></tr></thead><tbody>
    <tr><td>작업대·도구·몰드</td><td>이물 확인 → 70% 에탄올 소독 → 세척·건조</td><td>작업 전·후</td></tr>
    <tr><td>바닥·선반·보관소</td><td>청소 및 환기</td><td>주 1회 이상</td></tr>
    <tr><td>방충·방서 점검</td><td>기록(R-MH-02)</td><td>월 1회 이상</td></tr>
    <tr><td>청소 완료 기록</td><td>작업장청소점검표(R-MH-01) 작성</td><td>매회</td></tr>
  </tbody></table>
  <div class="sec">■ 6. 시설 세척 평가</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>사용 직후 따뜻한 물로 세척 → 건조 → 에탄올 소독</li>
    <li>이전 제품의 색·향 잔재 없음 확인 후 다음 작업 진행</li>
    <li>세척제: 무향 주방세제 / 소독제: 70% 에탄올</li>
  </ul>
  <div class="sec">■ 7. 방충·방서 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>출입구 방충망 상시 점검. 틈새 밀폐 유지</li>
    <li>해충·설치류 발견 시 즉시 조치 → R-MH-02에 기록</li>
  </ul>
  <div class="sec">■ 8. 오염 방지</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>원료·반제품·완제품 구분 보관</li>
    <li>가성소다 등 위험 원료: 밀폐 용기, 별도 공간, 라벨 명시</li>
    <li>위해 물질(살충제 등) 작업장 내 반입 금지</li>
  </ul>
  ` + stdFt();
}

function buildStdQCM001() {
  return stdHd('품질관리기준서','Quality Control Manual · AF-QCM-001','AF-QCM-001','Rev.00','2026.05.27') + `
  <div class="sec">■ 1. 목적 · 적용범위</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>시험의뢰부터 결과 판정·부적합 처리까지 품질관리 기준을 정한다.</li>
    <li>대표자(변민정) 1인이 품질관리의 모든 책임을 진다.</li>
  </ul>
  <div class="sec">■ 2. 원자재 시험관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>입고 시 성상·색상·이물을 육안 확인 → 시험성적서(원자재) 작성</li>
    <li>제조처 CoA 수취 후 함께 보관</li>
    <li>부적합: "부적합" 라벨 → 격리 → 반품/폐기</li>
  </ul>
  <div class="sec">■ 3. 완제품 시험관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>화장비누 법정 검사항목: 내용량(건조) 97% 이상 / 유리알칼리 0.1% 이하</li>
    <li>법정 검사는 KCL(한국건설생활환경시험연구원, 식약처 지정 화장품 제3호)에 위탁</li>
    <li>KCL 성적서 없는 품목: 자사 육안검사(성상·색상·이물) 실시 → 자사성적서 작성</li>
  </ul>
  <div class="sec">■ 4. 검체 채취</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>원자재: 입고 시 소량 채취 → 육안 확인</li>
    <li>완제품: 동일 배치에서 3개 이상 임의 선택 → 외관·중량 확인</li>
    <li>채취 시 위생장갑 착용, 깨끗한 용기 사용</li>
  </ul>
  <div class="sec">■ 5. 시설·기구 점검</div>
  <table><thead><tr><th>설비</th><th>점검 내용</th><th>주기</th></tr></thead><tbody>
    <tr><td>전자저울</td><td>연 1회 검교정. 매 사용 전 영점 확인</td><td>사용 전 / 연 1회</td></tr>
    <tr><td>온도계</td><td>분기 1회 정상 작동 확인</td><td>분기 1회</td></tr>
    <tr><td>점검 결과</td><td>설비관리기록서(R-MMS-02) 기재</td><td>—</td></tr>
  </tbody></table>
  <div class="sec">■ 6. 보관 검체</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>각 배치 완제품 1~2개를 보관 검체로 유지 (사용기한까지)</li>
    <li>라벨: 제조번호·제조일·사용기한 표기</li>
  </ul>
  <div class="sec">■ 7. 부적합품 처리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>완제품 부적합: 출하 즉시 중단 → 시험성적서 비고란 기재 → 폐기</li>
    <li>모든 기록 최종 기재일로부터 3년 이상 보관</li>
  </ul>
  <div class="sec">■ 8. 위탁시험 관리</div>
  <ul style="font-size:9.5px;line-height:2;padding-left:16px;margin-bottom:12px">
    <li>계약: KCL과 자가품질검사 위탁 계약 체결·유지</li>
    <li>성적서 수령 후 시험성적서 파일에 원본 편철 보관</li>
  </ul>
  ` + stdFt();
}

/* ════ 워드 파일 생성 (JSZip 활용) ════ */
async function generateWordDoc() {
  const statusEl = document.getElementById('pdf-status');
  if(statusEl) statusEl.textContent = '⏳ 워드 파일 생성 중...';
  try {
    const selId = document.getElementById('out-product')?.value;
    const [batches, ing, products] = await Promise.all([
      DB.getAll('batches'), DB.getAll('ingredients'), DB.getAll('products')
    ]);
    const batch = selId ? batches.find(b=>String(b.id)===String(selId)) : batches[0];
    if(!batch) {
      if(statusEl) statusEl.innerHTML='<span style="color:var(--red-text)">배치를 먼저 선택해주세요</span>';
      return;
    }
    const prod = products.find(p=>p.id===batch.productId)||{};
    const recipe = prod.레시피?.length ? prod.레시피 : [];
    const blob = await createDocx(batch, prod, recipe);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `에이브릴팜_제조지시서_${(batch.제품명||'').replace(/\s/g,'_')}_${batch.date||''}.docx`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
    if(statusEl) statusEl.innerHTML='<span style="color:var(--teal-dark)">✅ 워드 파일 다운로드 완료</span>';
  } catch(e) {
    console.error(e);
    if(statusEl) statusEl.innerHTML=`<span style="color:var(--red-text)">❌ ${e.message}</span>`;
  }
}

async function createDocx(batch, prod, recipe) {
  if(!window.JSZip) throw new Error('JSZip 미로드');
  const zip = new JSZip();
  const iTheory = prod.이론수량||batch.이론수량||9;
  const mw = prod.목표중량||'90g ±5g';
  const barcode = prod.바코드||batch.바코드||'';
  const allergy = prod.알레르기||'';

  const esc = t => String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const rpr = (opts={}) => {
    const b = opts.bold?'<w:b/>':'';
    const sz = opts.sz||9;
    const clr = opts.color?`<w:color w:val="${opts.color}"/>`:'';
    return `<w:rPr>${b}<w:sz w:val="${sz*2}"/><w:szCs w:val="${sz*2}"/>${clr}<w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/></w:rPr>`;
  };
  const wp = (txt, opts={}) => `<w:p><w:pPr><w:spacing w:before="${opts.spb||60}" w:after="${opts.spa||60}"/>${opts.border?'<w:pBdr><w:left w:val="single" w:sz="12" w:space="4" w:color="3DB88A"/></w:pBdr>':''}</w:pPr><w:r>${rpr(opts)}<w:t xml:space="preserve">${esc(txt)}</w:t></w:r></w:p>`;
  const wsec = txt => wp('▶ '+txt, {bold:true, sz:10, border:true, spb:120, spa:60});
  const wc = (txt, opts={}) => {
    const shade = opts.header?'<w:shd w:val="clear" w:color="auto" w:fill="F2F2EE"/>':'';
    const align = opts.center?'<w:jc w:val="center"/>':'';
    const w = opts.w||1000;
    return `<w:tc><w:tcPr>${shade}<w:tcW w:w="${w}" w:type="dxa"/></w:tcPr><w:p><w:pPr>${align}<w:spacing w:before="40" w:after="40"/></w:pPr><w:r>${rpr({bold:opts.bold,sz:8})}<w:t xml:space="preserve">${esc(txt)}</w:t></w:r></w:p></w:tc>`;
  };
  const wr = (...cells) => `<w:tr>${cells.join('')}</w:tr>`;
  const wtbl = rows => `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="888888"/><w:left w:val="single" w:sz="4" w:color="888888"/><w:bottom w:val="single" w:sz="4" w:color="888888"/><w:right w:val="single" w:sz="4" w:color="888888"/><w:insideH w:val="single" w:sz="4" w:color="888888"/><w:insideV w:val="single" w:sz="4" w:color="888888"/></w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>${rows.join('')}</w:tbl>`;

  const body = [
    wp('에이브릴팜', {bold:true, sz:14, spb:0, spa:40}),
    wp(`제조지시서  ·  ${batch.문서번호||'AF-MI-00X'}  ·  Rev.01`, {sz:9}),
    wp(''),
    wsec('가. 기본 정보'),
    wtbl([
      wr(wc('제 품 명',{bold:true,header:true,w:1800}),wc(batch.제품명||'',{w:2700}),wc('제조번호',{bold:true,header:true,w:1500}),wc(batch.제조번호||'',{w:3000})),
      wr(wc('바코드',{bold:true,header:true,w:1800}),wc(barcode,{w:2700}),wc('제조연월일',{bold:true,header:true,w:1500}),wc(batch.date||'',{w:3000})),
      wr(wc('제조단위',{bold:true,header:true,w:1800}),wc(`${batch.투입량||''}g`,{w:2700}),wc('사용기한',{bold:true,header:true,w:1500}),wc('제조일로부터 2년',{w:3000})),
      wr(wc('이론수량',{bold:true,header:true,w:1800}),wc(`${iTheory}개`,{w:2700}),wc('제조지시자',{bold:true,header:true,w:1500}),wc('변민정 (인)',{w:3000})),
    ]),
    wp(''),
    wsec('마. 원료명·분량·시험번호·실사용량'),
    wtbl([
      wr(wc('No',{bold:true,header:true,w:400,center:true}),wc('원 료 명',{bold:true,header:true,w:2600}),wc('이론량(g)',{bold:true,header:true,w:1000,center:true}),wc('비율(%)',{bold:true,header:true,w:800,center:true}),wc('실사용량(g)',{bold:true,header:true,w:1000,center:true}),wc('확인',{bold:true,header:true,w:500,center:true})),
      ...(recipe.length?recipe:['(레시피 없음)']).map((r,i)=>typeof r==='string'
        ?wr(wc('—',{w:400,center:true}),wc(r,{w:6700}),wc('',{w:800}),wc('',{w:1000}),wc('',{w:500}))
        :wr(wc(String(i+1),{w:400,center:true}),wc(r.원료명||'',{w:2600}),wc(String(r.이론량||''),{w:1000,center:true}),wc(String(r.비율||''),{w:800,center:true}),wc(String(r.이론량||''),{w:1000,center:true}),wc('□',{w:500,center:true}))),
      wr(wc('합 계',{bold:true,header:true,w:3000}),wc(`${batch.투입량||''}g`,{bold:true,w:1000,center:true}),wc('',{w:800}),wc('',{w:1000}),wc('',{w:500})),
    ]),
    allergy?wp(`※ 향료 유래 알레르기 유발성분: ${allergy}`, {sz:8}):'',
    wp(''),
    wsec('바. 제조설비명'),
    wp('전자저울  |  스틱블렌더  |  실리콘몰드(1kg)  |  스테인리스 용기 2개  |  온도계  |  내화학성 장갑·고글·마스크'),
    wp(''),
    wsec('사. 공정별 작업내용'),
    wtbl([
      wr(wc('단',{bold:true,header:true,w:400,center:true}),wc('공정명',{bold:true,header:true,w:1200}),wc('작업 내용',{bold:true,header:true,w:5300}),wc('관리기준',{bold:true,header:true,w:1200}),wc('확인',{bold:true,header:true,w:500,center:true})),
      wr(wc('1',{w:400,center:true}),wc('칭량',{w:1200}),wc('원료를 기준량에 따라 전자저울로 계량 (±1% 이내)',{w:5300}),wc('±1% 이내',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('2',{w:400,center:true}),wc('소다수',{w:1200}),wc('정제수에 소듐하이드록사이드 천천히 용해 → 냉각 (내화학성 장갑·고글·마스크 필수)',{w:5300}),wc('25~35°C',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('3',{w:400,center:true}),wc('혼합',{w:1200}),wc('오일류 혼합 후 소다수와 혼합 / 스틱블렌더 1분씩 2~3회',{w:5300}),wc('27~30°C',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('4',{w:400,center:true}),wc('첨가물',{w:1200}),wc('트레이스 이후 첨가물 후첨 교반',{w:5300}),wc('트레이스 후',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('5',{w:400,center:true}),wc('향료',{w:1200}),wc('향료 혼합 후 몰드 투입',{w:5300}),wc('—',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('6',{w:400,center:true}),wc('보온·탈형',{w:1200}),wc('24시간 보온 후 탈형',{w:5300}),wc('24시간',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('7',{w:400,center:true}),wc('건조',{w:1200}),wc('통풍이 잘 되는 곳에서 건조',{w:5300}),wc('최소 2주',{w:1200}),wc('□',{w:500,center:true})),
      wr(wc('8',{w:400,center:true}),wc('커팅·포장',{w:1200}),wc(`1kg 몰드 기준 ${iTheory}개 커팅 → 외관검사 → 포장·출하`,{w:5300}),wc(mw,{w:1200}),wc('□',{w:500,center:true})),
    ]),
    wp(''),
    wsec('아. 수율'),
    wtbl([
      wr(wc('공정명',{bold:true,header:true,w:2200}),wc('투입량',{bold:true,header:true,w:2000,center:true}),wc('이론 생산량',{bold:true,header:true,w:2000,center:true}),wc('실제 생산량',{bold:true,header:true,w:2000,center:true}),wc('수 율',{bold:true,header:true,w:800,center:true})),
      wr(wc('칭량 (제조)',{w:2200}),wc(`${batch.투입량||''}g`,{w:2000,center:true}),wc(`${iTheory}ea`,{w:2000,center:true}),wc(`${batch.실제수량||''}ea`,{w:2000,center:true}),wc('',{w:800})),
    ]),
    wp(''),
    wsec('이상 발생 기록'),
    wtbl([
      wr(wc('이상 여부',{bold:true,header:true,w:2200}),wc(batch.이상==='이상없음'?'■ 이상 없음   □ 이상 있음':'□ 이상 없음   ■ 이상 있음',{w:6800})),
      wr(wc('이상 내용 및 조치',{bold:true,header:true,w:2200}),wc(' ',{w:6800})),
    ]),
    wp(''),
    wp('에이브릴팜 · 경기도 시흥시 진말1로 18, 에스엠타워 303호 · TEL 0507-1346-8739 · 화장품제조업 등록번호 제6494호', {sz:7}),
  ].filter(Boolean).join('\n');

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1417" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const settingsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>';
  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
  const fontTableXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="Malgun Gothic"><w:charset w:val="CC"/><w:family w:val="swiss"/></w:font><w:font w:name="Calibri"><w:charset w:val="00"/><w:family w:val="swiss"/></w:font></w:fonts>';
  const webSettingsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:webSettings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:optimizeForBrowser/><w:allowPNG/></w:webSettings>';

  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/></Types>');
  zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder('word').folder('_rels').file('document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings" Target="webSettings.xml"/></Relationships>');
  zip.folder('word').file('document.xml', docXml);
  zip.folder('word').file('settings.xml', settingsXml);
  zip.folder('word').file('styles.xml', stylesXml);
  zip.folder('word').file('fontTable.xml', fontTableXml);
  zip.folder('word').file('webSettings.xml', webSettingsXml);

  return await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}


/* 저장된 파일 자동 작성 실행 버튼 */
let _savedFileForParse = null;
function runParseSaved() {
  if(_savedFileForParse) processUploadedFile(_savedFileForParse);
}

/* 파일 업로드 처리 */
function handleFileDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) prepareFile(file);
}
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (file) prepareFile(file);
}

function prepareFile(file) {
  _savedFileForParse = file;
  const el = document.getElementById('upload-result');
  const btn = document.getElementById('btn-run-parse');
  if(el) el.innerHTML = `<span style="color:var(--teal-dark)">📎 <b>${file.name}</b> 선택됨 — 분석 실행 중...</span>`;
  // 자동 실행
  processUploadedFile(file);
}

async function processUploadedFile(file) {
  const el = document.getElementById('upload-result');
  if(!el) return;
  el.innerHTML = '<span style="color:var(--teal)">⏳ 파일 분석 중...</span>';
  // macOS는 한글 파일명을 분해형(NFD)으로 저장 → 비교 문자열(조합형 NFC)과 항상 불일치하던 버그 수정
  const name = file.name.toLowerCase().normalize('NFC');

  try {
    /* ── JSON 백업 복원 ── */
    if(name.endsWith('.json')) {
      const text = await file.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { el.innerHTML = `<span style="color:var(--red-text)">❌ JSON 파싱 오류: ${e.message}</span>`; return; }

      if(data._exportedAt || data.ingredients || data.batches || data.hygiene) {
        if(!confirm(`백업 파일을 복원할까요?\n(${file.name})\n현재 데이터가 덮어씌워집니다.`)) {
          el.innerHTML = '<span style="color:var(--text3)">취소됐습니다</span>';
          return;
        }
        await DB.importAll(data);
        el.innerHTML = '<span style="color:var(--teal-dark)">✅ 데이터 복원 완료! 앱을 새로고침하세요.</span>';
        setTimeout(()=>renderTab(currentTab), 1500);
        return;
      }
      if(data.제품명) {
        await DB.add('batches', data);
        el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${data.제품명}</b> 배치 등록 완료</span>`;
        return;
      }
      el.innerHTML = '<span style="color:var(--text3)">⚠️ 인식할 수 없는 JSON 형식입니다</span>';
      return;
    }

    /* ── DOCX 파싱 ── */
    if(name.endsWith('.docx')) {
      let text = '';
      if(window.JSZip) {
        try {
          const buf = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(buf);
          const xmlFile = zip.file('word/document.xml');
          if(xmlFile) {
            const xml = await xmlFile.async('string');
            // XML에서 텍스트 노드 추출 (단락·표 셀 구분 보존)
            text = xml
              .replace(/<w:tr[ >]/g, '\n')   // 표 행 → 새줄
              .replace(/<w:tc[ >]/g, '\t')   // 표 셀 → 탭 구분
              .replace(/<w:p[ >]/g, '\n')    // 단락 → 새줄
              .replace(/<w:br[^>]*>/g, '\n') // 줄바꿈
              .replace(/<w:tab[^>]*>/g, ' ') // 탭 → 공백
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
              .replace(/&nbsp;/g,' ').replace(/&#xD;/g,'\n')
              .replace(/[ \t]+/g,' ')         // 중복 공백 압축
              .replace(/\n\s*\n/g,'\n').trim();
          }
        } catch(zipErr) {
          console.warn('JSZip 파싱 오류:', zipErr);
          text = await file.text().catch(()=>'');
        }
      } else {
        text = await file.text().catch(()=>'');
      }
      if(!text.trim()) {
        el.innerHTML = '<span style="color:var(--amber-text)">⚠️ 파일에서 텍스트를 읽을 수 없습니다. JSON 백업 파일을 사용해주세요.</span>';
        return;
      }
      await parseDocumentText(name, text, file.name, el);
      return;
    }

    /* ── TXT ── */
    if(name.endsWith('.txt')) {
      const text = await file.text();
      await parseDocumentText(name, text, file.name, el);
      return;
    }

    /* ── PDF ── */
    if(name.endsWith('.pdf')) {
      el.innerHTML = `<span style="color:var(--amber-text)">📋 PDF는 자동 인식이 어려워요.<br><span style="font-size:11px">제품 제조 탭 → 제품표준서 수정에서 직접 입력하거나, .docx 파일로 업로드해주세요.</span></span>`;
      return;
    }

    el.innerHTML = `<span style="color:var(--text3)">📄 <b>${file.name}</b> — 지원 형식: .json .docx .pdf</span>`;

  } catch(e) {
    el.innerHTML = `<span style="color:var(--red-text)">❌ 오류: ${e.message}</span>`;
    console.error('파일 처리 오류:', e);
  }
}

/* ── 문서 파싱 공용 헬퍼 ── */

// 라벨 문자열에 글자 사이 공백이 끼어 있어도 매칭되는 정규식 생성 ("제 품 명" 같은 패턴 대응)
function fuzzyLabelRe(label) {
  const esc = label.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*');
  return new RegExp('^\\s*' + esc + '\\s*$');
}

// 텍스트를 줄 단위로 분리 (빈 줄 제거)
function toLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

// 특정 라벨 줄을 찾아 바로 다음(또는 n번째 다음) 비어있지 않은 줄을 값으로 반환
function valueAfterLabel(lines, label, offset = 1) {
  const re = fuzzyLabelRe(label);
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      const idx = i + offset;
      if (idx < lines.length) return lines[idx];
    }
  }
  return '';
}

// 라벨이 줄 안에 "포함"되는 경우까지 찾는 완화 버전 (정확매칭 실패시 폴백)
function valueAfterLabelLoose(lines, label, offset = 1) {
  const exact = valueAfterLabel(lines, label, offset);
  if (exact) return exact;
  const compact = label.replace(/\s/g, '');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].replace(/\s/g, '').includes(compact)) {
      const idx = i + offset;
      if (idx < lines.length) return lines[idx];
    }
  }
  return '';
}

// 원료 배합표(레시피) 테이블 추출
// 우리 표준서/제조지시서 템플릿은 항상 No, 원료명, INCI명칭, 이론량(g), 비율(%) 순서로 시작함
function parseRecipeFromLines(lines) {
  const hdrIdx = lines.findIndex(l => /원\s*료\s*명/.test(l));
  if (hdrIdx === -1) return [];

  // 첫 데이터 행(No=1)과 두번째 데이터 행(No=2) 위치를 찾아 컬럼 수 계산
  let dataStart = -1, secondStart = -1;
  for (let i = hdrIdx; i < lines.length; i++) {
    if (lines[i] === '1') { dataStart = i; break; }
  }
  if (dataStart === -1) return [];
  for (let i = dataStart + 1; i < lines.length; i++) {
    if (lines[i] === '2') { secondStart = i; break; }
  }
  const cols = secondStart > dataStart ? (secondStart - dataStart) : 5;
  if (cols < 4) return [];

  const recipe = [];
  let row = 1;
  let pos = dataStart;
  while (pos < lines.length) {
    const slice = lines.slice(pos, pos + cols);
    if (slice.length < 4) break;
    const noVal = slice[0];
    if (noVal !== String(row)) break; // 합계행 등 도달 시 중단
    const 원료명 = slice[1] || '';
    const INCI = /[a-zA-Z]/.test(slice[2] || '') ? slice[2] : '';
    const 이론량raw = (slice[3] || '').replace(/[^0-9.]/g, '');
    const 비율raw = (slice[4] || '').replace(/[^0-9.]/g, '');
    if (원료명 && 이론량raw) {
      recipe.push({
        원료명,
        INCI,
        이론량: parseFloat(이론량raw) || 0,
        비율: parseFloat(비율raw) || 0,
      });
    }
    row++;
    pos += cols;
  }
  return recipe;
}

// KCL 시험성적서(원본 문서)에서 법정검사 정보 추출
// SC 양식: S224-04502K / 시험·검사성적서
// CT 양식: CT84-090322K / 시험성적서
// OCR 출력은 한국어 글자 사이 공백이 생길 수 있어 fuzzy 매칭 적용
// KCL PDF에서 라벨 뒤 날짜 추출
// PDF.js는 텍스트 위치(y좌표)로 줄을 추정하기 때문에, 같은 표 셀의 라벨과 값이
// 살짝 다른 baseline에 있으면 서로 다른 "줄"로 쪼개져 버릴 수 있다.
// 그래서 줄 경계를 무시하고 전체 텍스트를 공백 제거 후 이어붙여 라벨 뒤 30자 이내에서 날짜를 찾는다.
function extractKclDate(lines, ...labels) {
  const flat = lines.join(' ').replace(/\s/g, '');
  const datePat = /(\d{4})[.년\-](\d{1,2})[.월\-](\d{1,2})/;
  for (const label of labels) {
    const compact = label.replace(/\s/g, '');
    const idx = flat.indexOf(compact);
    if (idx === -1) continue;
    const window = flat.slice(idx + compact.length, idx + compact.length + 30).replace(/^[:：]+/, '');
    const m = window.match(datePat);
    if (m) return `${m[1]}.${m[2].padStart(2,'0')}.${m[3].padStart(2,'0')}`;
  }
  return '';
}

function parseKclFromLines(lines) {
  const result = {};
  const joined = lines.join(' ');
  const joinedNoSp = joined.replace(/\s/g,'');

  // 접수번호: SC, CT 등 — 공백 제거 후 검색
  const kclNoMatch = joinedNoSp.match(/[A-Z]{1,3}\d{2,3}-\d{5,6}[A-Z]/i)
    || joined.match(/성적서\s*번호\s*[:\s]*([A-Z0-9\-]{6,15})/i);
  if (kclNoMatch) result.KCL = (kclNoMatch[1] || kclNoMatch[0]).toUpperCase().trim();

  // 발행번호: 9자리 숫자 (같은 줄에서 추출)
  const issueNoLine = lines.find(l => /발행\s*번호/.test(l));
  if (issueNoLine) {
    const m = issueNoLine.replace(/\s/g,'').match(/발행번호[:\s：]*(\d{8,10})/i);
    if (m) result.KCL발행번호 = m[1];
  }
  if (!result.KCL발행번호) {
    const m = joined.match(/발행\s*번호\s*[:\s：]*(\d{8,10})/i) || joined.match(/\b(\d{9})\b/);
    if (m) result.KCL발행번호 = m[1] || m[0];
  }

  // 날짜: 같은 줄 우선 추출 (valueAfterLabelLoose 대신 extractKclDate 사용)
  const rcvDate   = extractKclDate(lines, '접수연월일', '접수일');
  const issueDate = extractKclDate(lines, '발행일자', '발행일');
  const normDate = d => {
    if(!d) return '';
    const m = d.match(/(\d{4})[년.\-\/\s]+(\d{1,2})[월.\-\/\s]+(\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : d.replace(/[./]/g,'-');
  };
  if (rcvDate) result.KCL접수일 = normDate(rcvDate);
  if (issueDate) result.KCL발행일 = normDate(issueDate);

  // 내용량 — SC/CT 양식 공통: "이상" 뒤 숫자, 컬럼별 OCR 모두 대응
  const contentIdx = lines.findIndex(l => /내\s*용\s*량/.test(l) && !/참고용|단독/.test(l));
  {
    const nearText = contentIdx !== -1 ? lines.slice(contentIdx, contentIdx+10).join(' ') : '';
    // 줄 경계 무관 flatten 윈도우 — 라벨과 값이 다른 "줄"로 쪼개져도 탐색 가능
    const flatIdx = joinedNoSp.search(/내용량\(?건조\)?/);
    const flatWindow = flatIdx !== -1 ? joinedNoSp.slice(flatIdx, flatIdx + 60) : '';
    const flatVal = flatWindow.match(/이상(\d{2,3}\.?\d*)/)?.[1]
      || flatWindow.match(/(\d{2,3}\.?\d*)적합/)?.[1];
    // 컬럼별 OCR: "시험·검사결과" 헤더 바로 다음 줄
    const resultHdrIdx = lines.findIndex(l => /시험\s*[·.]\s*검사\s*결과|시험결과/.test(l));
    let columnResult = null;
    if (resultHdrIdx !== -1) {
      for (let ri = resultHdrIdx+1; ri < Math.min(resultHdrIdx+5, lines.length); ri++) {
        const cl = lines[ri].trim().replace(/\s/g,'');
        if (/^\d{2,3}$/.test(cl) && +cl > 50 && +cl < 300) { columnResult = cl; break; }
      }
    }
    // 같은 줄에서 "이상 [결과]" 추출 (SC/CT 공통)
    const sameLineVal = (() => {
      if (contentIdx === -1) return null;
      const ll = lines[contentIdx].replace(/\s/g,'');
      const m = ll.match(/이상(\d{2,3})/);
      return m ? m[1] : null;
    })();
    const val =
      flatVal
      || sameLineVal
      || nearText.match(/이\s*상\s*(\d{2,3}\.?\d*)/)?.[1]   // nearText row-by-row
      || joined.match(/\d{2,3}\s*이\s*상\s*(\d{2,3}\.?\d*)/)?.[1]  // 전체: "97이상109"
      || columnResult                                          // 컬럼별 OCR
      || nearText.match(/(\d{3}\.?\d*)\s*적\s*합/)?.[1]      // "109 적합"
      || nearText.match(/시험결과\D{0,8}(\d{2,3}\.?\d*)/i)?.[1]  // CT "시험결과"
      || (contentIdx !== -1 ? lines[contentIdx+3]?.trim().replace(/\s/g,'').match(/^\d{2,3}$/)?.[0] : null);
    if (val && +val > 50 && +val < 300) result.KCL내용량 = val;
  }

  // 유리알칼리 — 같은 줄 및 nearText 모두 검색
  const alkaliIdx = lines.findIndex(l => /유\s*리\s*알\s*칼\s*리/.test(l));
  {
    // 줄 경계 무관 flatten 윈도우 우선 탐색
    const flatAlkIdx = joinedNoSp.search(/유리알칼리/);
    if (flatAlkIdx !== -1) {
      const flatWindow = joinedNoSp.slice(flatAlkIdx, flatAlkIdx + 60);
      const flatVal = flatWindow.match(/(검출안됨|불검출)/)?.[1]
        || flatWindow.match(/이하(\d+\.?\d*)/)?.[1];
      if (flatVal) result.KCL유리알칼리 = flatVal === '검출안됨' ? '검출 안 됨' : flatVal;
    }
  }
  if (!result.KCL유리알칼리 && alkaliIdx !== -1) {
    // 같은 줄에서 먼저 확인 (SC 양식: "유리알칼리 % 0.1 이하 검출안됨 적합")
    const sameLine = lines[alkaliIdx].replace(/\s/g,'');
    const sameMatch = sameLine.match(/유리알칼리[^검]*(검출안됨|불검출)/)
      || sameLine.match(/이하(검출안됨|불검출)/);
    if (sameMatch) {
      result.KCL유리알칼리 = sameMatch[1];
    } else {
      const nearText = lines.slice(alkaliIdx, alkaliIdx+8).join(' ');
      const alkVal =
        nearText.match(/이\s*하\s*(?:\d+\.?\d*\s*)?(검\s*출\s*안\s*됨|불\s*검\s*출)/)?.[1]?.replace(/\s/g,'')
        || nearText.match(/(검\s*출\s*안\s*됨|불\s*검\s*출)/)?.[1]?.replace(/\s/g,'')
        || nearText.match(/이\s*하\s+(\d+\.?\d*)\s*(?:적합|합격|%)?/)?.[1];
      if (alkVal && !/여\s*백/.test(alkVal)) result.KCL유리알칼리 = alkVal.trim();
    }
  }
  return result;
}

async function parseDocumentText(name, text, fileName, el) {
  const [batches, products] = await Promise.all([DB.getAll('batches'), DB.getAll('products')]);
  const lines = toLines(text);
  const fullText = text;

  // 파일명 + 문서 내용 본문(제목) 둘 다 검사 — 파일명이 깨져도 본문 제목으로 인식 가능
  const looksLike = (kw) => name.includes(kw) || lines.slice(0, 8).some(l => l.includes(kw));
  const isStd     = looksLike('표준서') || name.includes('af-ps') || name.includes('-ps-');
  const isOrder   = looksLike('제조지시') || name.includes('af-mi') || name.includes('-mi-');
  const isTest    = looksLike('시험성적') || name.includes('af-tr') || name.includes('-tr-');
  const isHygiene = looksLike('위생') || name.includes('-mh') || name.includes('r-mh');
  const isMmsRecord = name.includes('r-mms') || (name.includes('제조관리기준서') && name.includes('기록'));
  const isQcmRecord = name.includes('r-qcm') || (name.includes('품질관리기준서') && name.includes('기록'));
  const isMhRecord  = (name.includes('r-mh') && !name.includes('r-mhs')) || (name.includes('제조위생관리기준서') && name.includes('기록'));

  // 공통 정보 추출
  const productMatch = fullText.match(/에이브릴팜\s*([가-힣a-zA-Z\s]{1,20}?(?:비누|솝|크림|로션|오일|밤|버터))/);
  const rawProdName  = productMatch ? productMatch[0].replace(/제\s*품\s*명\s*/,'').trim() : '';
  const productName  = rawProdName || fileName.replace(/^\d+[-_].*?[-_]/,'').replace(/\.[^.]+$/,'').replace(/[-_]/g,' ').trim();
  const docNoMatch   = fullText.match(/[AE]F-[A-Z]{2,3}-\d{3}/i);
  const docNo        = docNoMatch ? docNoMatch[0].toUpperCase().replace(/^EF-/,'AF-') : '';
  const barcodeMatch = fullText.match(/87[0-9]{11}/);
  const barcode      = barcodeMatch ? barcodeMatch[0] : '';
  const weightMatch  = fullText.match(/(\d+)\s*g\s*[±＋\-]\s*\d+\s*g/);
  const expiryMatch  = fullText.match(/제조일(?:로부터)?\s*(\d+)\s*년/);
  const allergyMatch = fullText.match(/알레르기[^:：]*[:：]\s*([가-힣a-zA-Z,\s]+?)(?:\.|$)/);
  const recipe = parseRecipeFromLines(lines);
  const kclInfo = parseKclFromLines(lines);

  /* ── 제품표준서 → products 스토어 ── */
  if(isStd) {
    const keyname = (productName||'').replace(/에이브릴팜\s*/,'').replace(/\s+/g,'').toLowerCase();
    const existingProd = products.find(p => {
      const pn = (p.제품명||'').replace(/에이브릴팜\s*/,'').replace(/\s+/g,'').toLowerCase();
      return keyname && (pn.includes(keyname) || keyname.includes(pn));
    });

    const recipeNote = recipe.length ? `· 원료 ${recipe.length}종 배합표 인식됨` : '';

    if(existingProd) {
      const updated = {
        ...existingProd,
        ...(docNo && {문서번호: docNo}),
        ...(barcode && {바코드: barcode}),
        ...(weightMatch && {목표중량: weightMatch[0]}),
        ...(expiryMatch && {유통기한: `제조일로부터 ${expiryMatch[1]}년`}),
        ...(allergyMatch && {알레르기: allergyMatch[1].trim()}),
        ...(recipe.length && {레시피: recipe}),
        ...kclInfo,
      };
      await DB.put('products', updated);
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${existingProd.제품명}</b> 제품표준서 업데이트 완료
        ${docNo?'<br>문서번호: '+docNo:''} ${barcode?'· 바코드: '+barcode:''} ${recipeNote}</span>`;
    } else {
      const nextPsDocNo = () => {
        const nums = products
          .map(p => p.문서번호 && p.문서번호.match(/^AF-PS-(\d+)$/))
          .filter(Boolean)
          .map(m => parseInt(m[1], 10));
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        return 'AF-PS-' + String(next).padStart(3, '0');
      };
      const newProd = {
        제품명: productName || fileName.replace(/\.[^.]+$/, ''),
        문서번호: docNo || nextPsDocNo(),
        바코드: barcode,
        목표중량: weightMatch ? weightMatch[0] : '90g ±5g',
        유통기한: expiryMatch ? `제조일로부터 ${expiryMatch[1]}년` : '제조일로부터 2년',
        알레르기: allergyMatch ? allergyMatch[1].trim() : '',
        제조방법: 'CP법',
        품질기준: {내용량:'97% 이상', 유리알칼리:'0.1% 이하'},
        레시피: recipe, 전성분: '',
        보관방법: '직사광선 차단, 서늘하고 건조한 곳 보관',
        ...kclInfo,
      };
      await DB.add('products', newProd);
      el.innerHTML = `<span style="color:var(--teal-dark)">
        ✅ <b>${newProd.제품명}</b> 제품표준서 신규 등록 완료! ${recipeNote}<br>
        <span style="font-size:11px">제품 제조 탭 → 제품표준서에서 추가로 확인·수정해주세요.</span>
      </span>`;
    }
    await renderTab('manufacture');
    return;
  }

  /* ── 제조지시서 / 시험성적서 → batches + products 연동 ── */
  if(isOrder || isTest) {
    const keyname = (productName||'').replace(/에이브릴팜\s*/,'').replace(/\s+/g,'').toLowerCase();
    const existingBatch = batches.find(b => {
      const bn = (b.제품명||'').replace(/에이브릴팜\s*/,'').replace(/\s+/g,'').toLowerCase();
      return keyname && (bn.includes(keyname) || keyname.includes(bn));
    });
    const existingProdByName = products.find(p => {
      const pn = (p.제품명||'').replace(/에이브릴팜\s*/,'').replace(/\s+/g,'').toLowerCase();
      return keyname && (pn.includes(keyname) || keyname.includes(pn));
    });

    // 시험성적서에 KCL 정보가 있으면 제품표준서로 저장 (배치 아님)
    if (isTest && Object.keys(kclInfo).length) {
      const relProd = existingProdByName || (existingBatch && products.find(p=>p.id===existingBatch.productId));
      if (relProd) {
        await DB.put('products', {...relProd, ...kclInfo});
      }
    }
    // 레시피 정보가 있으면 제품표준서에 반영
    if (recipe.length) {
      const relProd = existingProdByName || (existingBatch && products.find(p=>p.id===existingBatch.productId));
      if (relProd) {
        await DB.put('products', {...relProd, 레시피: recipe});
      }
    }

    if(existingBatch) {
      const updated = {...existingBatch};
      if(docNo && isOrder) updated.문서번호 = docNo;
      if(barcode) updated.바코드 = barcode;
      await DB.put('batches', updated);
      const kclNote = Object.keys(kclInfo).length ? ' · KCL 정보 표준서에 반영됨' : '';
      const recNote = recipe.length ? ` · 레시피 ${recipe.length}종 반영됨` : '';
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${existingBatch.제품명}</b> ${isTest?'시험성적서':'제조지시서'} 업데이트 완료${kclNote}${recNote}</span>`;
    } else if(productName || docNo) {
      const newB = {제품명: productName||fileName.replace(/\.[^.]+$/,''), 문서번호: docNo, 바코드: barcode, 상태:'제조중'};
      await DB.add('batches', newB);
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ <b>${newB.제품명}</b> 배치 신규 등록 완료</span>`;
    } else {
      el.innerHTML = `<span style="color:var(--amber-text)">⚠️ 제품명을 찾을 수 없습니다.<br><span style="font-size:11px">파일명 또는 문서 제목에 "제품표준서"·"제조지시서"가 포함되어야 합니다.</span></span>`;
    }
    await renderTab('manufacture');
    return;
  }

  /* ── 기록서 양식 (R-MMS / R-MH / R-QCM) ──
     날짜는 모두 YYMMDD 6자리(예: 260501)로 통일해서 기록하기로 함.
     혹시 예전 방식(M.DD, N월, YYYY.MM.DD 등)으로 적힌 문서가 섞여 있어도
     깨지지 않도록 보조 패턴은 남겨둔다. */
  if(isMmsRecord || isMhRecord || isQcmRecord) {
    // 문서 머리글의 "제정일자: 2026.05.27"은 실제 기록 데이터가 아니므로
    // 연도 추출용으로만 쓰고, 데이터 날짜 탐색 범위에서는 제외한다.
    const headerYearMatch = fullText.match(/20\d{2}/);
    const baseYear = headerYearMatch ? headerYearMatch[0] : String(new Date().getFullYear());
    const bodyText = fullText.replace(/제정일자\s*[:：]?\s*20\d{2}[.\-/년]\s*\d{1,2}[.\-/월]\s*\d{1,2}\.?/, '');

    // 공통 헬퍼: 텍스트에서 YYMMDD 6자리 날짜를 모두 추출 (1순위 표준 형식)
    const extractYmd6 = text => [...new Set(
      [...text.matchAll(/\b(\d{2})(\d{2})(\d{2})\b/g)]
        .map(m => ({yy:+m[1], mo:+m[2], d:+m[3]}))
        .filter(x => x.mo >= 1 && x.mo <= 12 && x.d >= 1 && x.d <= 31)
        .map(x => `20${String(x.yy).padStart(2,'0')}-${String(x.mo).padStart(2,'0')}-${String(x.d).padStart(2,'0')}`)
    )];

    if(isMmsRecord) {
      // R-MMS-01 원료입고기록서: 입고일이 "251229" 같은 6자리 YYMMDD
      const dates = extractYmd6(bodyText);

      if(dates.length > 0) {
        let cnt = 0;
        for(const d of dates.slice(0, 60)) {
          try {
            await DB.add('hygiene', {date: d, type:'제조점검', 확인자:'변민정', status:'완료',
              items:{원료입고:'확인', 설비점검:'완료'}});
            cnt++;
          } catch(e) {}
        }
        el.innerHTML = `<span style="color:var(--teal-dark)">✅ 제조관리기준서 기록서 인식 — ${cnt}건 날짜 기록 등록됨<br>
          <span style="font-size:11px">· 원료 상세 내역은 원료 재고 탭에서 직접 입력해주세요</span></span>`;
      } else {
        el.innerHTML = `<span style="color:var(--amber-text)">⚠️ 제조관리기준서 기록서 인식됨 — 날짜를 찾지 못했습니다. 위생점검 탭에서 직접 입력해주세요.</span>`;
      }
    } else if(isMhRecord) {
      // R-MH-01(청소점검)과 R-MH-02(방충방서) 구간을 나눠서 처리. 두 구간 모두
      // YYMMDD 6자리를 1순위로 찾고, 못 찾으면 예전 방식(M.DD / N월)을 보조로 시도.
      const splitIdx = bodyText.search(/R-MH-02|방충\s*[·.]?\s*방서/);
      const section1 = splitIdx === -1 ? bodyText : bodyText.slice(0, splitIdx);
      const section2 = splitIdx === -1 ? '' : bodyText.slice(splitIdx);

      let cleanDates = extractYmd6(section1);
      if (!cleanDates.length) {
        // 보조: "M.DD" — "2026.05.27"처럼 전체 날짜의 일부(연.월)인 경우는 제외
        const dayMatches = [...section1.matchAll(/(?<!\d{4}\.)\b(\d{1,2})\.(\d{1,2})\b/g)]
          .map(m => ({mo:+m[1], d:+m[2]}))
          .filter(x => x.mo >= 1 && x.mo <= 12 && x.d >= 1 && x.d <= 31);
        cleanDates = [...new Set(dayMatches.map(x => `${baseYear}-${String(x.mo).padStart(2,'0')}-${String(x.d).padStart(2,'0')}`))];
      }

      let pestDates = extractYmd6(section2);
      if (!pestDates.length) {
        // 보조: "N월" — 방충방서 월간 점검표 (일자 없음). 한글 문자는 JS \b로 인식되지 않으므로
        // 앞쪽만 숫자 경계로 확인하고 뒤쪽은 리터럴 '월'로 충분히 구분한다.
        const monthMatches = [...section2.matchAll(/(?<!\d)(\d{1,2})\s*월(?!\d)/g)]
          .map(m => +m[1]).filter(mo => mo >= 1 && mo <= 12);
        pestDates = [...new Set(monthMatches)].map(mo => `${baseYear}-${String(mo).padStart(2,'0')}-01`);
      }

      let cnt = 0;
      for(const d of cleanDates.slice(0, 60)) {
        try {
          await DB.add('hygiene', {date: d, type:'청소점검', 확인자:'변민정', status:'완료',
            items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}});
          cnt++;
        } catch(e) {}
      }
      let pestCnt = 0;
      for(const d of pestDates.slice(0, 12)) {
        try {
          await DB.add('hygiene', {date: d, type:'방충방서', 확인자:'변민정', status:'완료',
            방충망:'양호', 해충:'없음', 설치류:'없음'});
          pestCnt++;
        } catch(e) {}
      }

      if(cnt > 0 || pestCnt > 0) {
        el.innerHTML = `<span style="color:var(--teal-dark)">✅ 제조위생관리기준서 기록서 인식 — 청소점검 ${cnt}건, 방충방서 ${pestCnt}건 등록 완료<br>
          <span style="font-size:11px">위생 점검 탭에서 내역을 확인하세요.</span></span>`;
      } else {
        el.innerHTML = `<span style="color:var(--amber-text)">⚠️ 날짜를 찾지 못했습니다. 위생점검 탭에서 직접 입력해주세요.</span>`;
      }
    } else if(isQcmRecord) {
      // R-QCM-01/02는 검사일·등록일 칸이 비어있는 경우가 많음 — 실제 표 데이터에
      // 날짜가 있을 때만 등록하고, 없으면 가짜 배치를 만들지 않는다.
      const dates = extractYmd6(bodyText);

      if(dates.length > 0) {
        const prodMatch = fullText.match(/에이브릴팜\s*([가-힣]{2,10}(?:비누|솝|크림|로션))/);
        const pName = prodMatch ? prodMatch[0] : '';
        let cnt = 0;
        for(const d of dates.slice(0, 30)) {
          try {
            await DB.add('batches', {
              제품명: pName || '(QCM 기록)',
              date: d, 상태: '완료', 비고: '품질관리기준서 기록서 자동등록'
            });
            cnt++;
          } catch(e) {}
        }
        el.innerHTML = `<span style="color:var(--teal-dark)">✅ 품질관리기준서 기록서 인식${pName?' — '+pName:''} — ${cnt}건 출하 기록 등록<br>
          <span style="font-size:11px">제품 제조 탭에서 확인·수정해주세요.</span></span>`;
      } else {
        el.innerHTML = `<span style="color:var(--amber-text)">⚠️ 품질관리기준서 기록서 인식됨 — 표에 기재된 검사일·등록일이 없습니다.<br>
          <span style="font-size:11px">완제품 출하검사는 출력 탭의 완제품출하검사 양식에 직접 기재해주세요.</span></span>`;
      }
    }
    return;
  }

  /* ── 위생점검 ── */
  if(isHygiene) {
    const dateMatch = fullText.match(/20\d{2}[-./]\d{1,2}[-./]\d{1,2}/g);
    if(dateMatch) {
      const raw = dateMatch[0].replace(/[./]/g,'-');
      const parts = raw.split('-');
      const date = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
      await DB.add('hygiene',{date,type:'청소점검',확인자:'변민정',status:'완료',
        items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}});
      el.innerHTML = `<span style="color:var(--teal-dark)">✅ 위생점검 기록 등록 완료 (${date})</span>`;
    } else {
      el.innerHTML = `<span style="color:var(--amber-text)">⚠️ 날짜를 찾을 수 없습니다. 위생점검 탭에서 직접 입력해주세요.</span>`;
    }
    return;
  }

  el.innerHTML = `<span style="color:var(--text3)">
    📄 <b>${fileName}</b><br>
    <span style="font-size:11px">파일 유형을 자동 인식하지 못했습니다.<br>
    파일명 또는 문서 제목에 <b>제품표준서·제조지시서·시험성적서·위생점검</b> 중 하나가 포함되면 자동 분류됩니다.</span>
  </span>`;
}

/* 과거 이력 */
function renderHistory(el, hyg, batches) {
  const months = {};
  [...hyg,...batches].forEach(r=>{
    const d = r.date||(r.createdAt&&r.createdAt.slice(0,10));
    if(!d) return;
    const ym = d.slice(0,7);
    if(!months[ym]) months[ym]={hyg:[],batch:[]};
    if(r.type) months[ym].hyg.push(r); else months[ym].batch.push(r);
  });
  const sorted = Object.keys(months).sort().reverse();
  if(!sorted.length){el.innerHTML='<div class="empty-hint">기록된 이력이 없습니다</div>';return;}
  el.innerHTML = sorted.map(ym=>`
    <div class="history-month-row" onclick="toggleHistory(this)">
      <div class="history-month-title">${ym.replace('-','년 ')}월</div>
      <div class="history-month-cnt">
        <span class="badge badge-green">위생 ${months[ym].hyg.length}건</span>
        ${months[ym].batch.length?`<span class="badge badge-mauve ml4">배치 ${months[ym].batch.length}건</span>`:''}
      </div>
      <i class="ti ti-chevron-down" style="color:var(--text3);font-size:14px;margin-left:auto"></i>
    </div>
    <div class="history-detail hide">
      ${months[ym].hyg.map(r=>`
        <div class="history-item" onclick="openHygieneEditForm(${r.id})" style="cursor:pointer">
          <span class="history-date">${r.date||''}</span>
          <span class="history-type">${r.type||''}</span>
          <span class="badge ${r.status==='완료'?'badge-green':'badge-orange'}">${r.status||''}</span>
          <i class="ti ti-edit" style="color:var(--text3);margin-left:auto"></i>
        </div>`).join('')}
      ${months[ym].batch.map(b=>`
        <div class="history-item" onclick="openBatchForm(${b.id})" style="cursor:pointer">
          <span class="history-date">${b.date||''}</span>
          <span class="history-type">${b.제품명||''}</span>
          <span class="badge ${badgeClass(b.상태)}">${b.상태||''}</span>
          <i class="ti ti-edit" style="color:var(--text3);margin-left:auto"></i>
        </div>`).join('')}
      <button class="btn-sm" style="margin:8px 14px" onclick="printRangeMonth('${ym}')">이 달 PDF 출력</button>
    </div>`).join('');
}

function toggleHistory(row) {
  const d=row.nextElementSibling; d.classList.toggle('hide');
  const ic=row.querySelector('.ti-chevron-down');
  if(ic) ic.style.transform=d.classList.contains('hide')?'':'rotate(180deg)';
}

async function printRangeMonth(ym) {
  const [y,m]=ym.split('-').map(Number);
  const hyg = await DB.getAll('hygiene');
  open$(buildMH(hyg, y, m));
}

/* ════ 원료 폼 ════ */
async function openIngForm(id, defaultType) {
  const list = await DB.getAll('ingredients');
  const item = id ? list.find(i=>i.id===id) : {};
  const type = (item&&item.stockType) || defaultType || '원료';
  const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const cats = type==='포장재' ? pkgCats : ingCats;

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${id?'원료 수정':'원료 추가'}</div>
    <label>종류<select id="f0" onchange="updateIngCats(this.value)">
      <option ${type!=='포장재'?'selected':''}>원료</option>
      <option ${type==='포장재'?'selected':''}>포장재</option>
    </select></label>
    <label>원료명 / 제품명<input id="f1" value="${(item&&item.원료명)||''}"></label>
    <label>제조처 / 공급처<input id="f2" value="${(item&&item.제조처)||''}"></label>
    <label>수량 / 재고<input id="f3" value="${(item&&item.수량)||''}" placeholder="예: 500g, 100개"></label>
    <label>입고일<input type="date" id="f8" value="${(item&&item.입고일)||''}"></label>
    <label>카테고리<select id="f4">${cats.map(c=>`<option ${item&&item.category===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>CoA 수취<select id="f5">${['수취','미수취','미기입','해당없음'].map(c=>`<option ${item&&item.CoA===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>판정<select id="f6">${['적합','부적합','미기입'].map(c=>`<option ${item&&item.판정===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>비고<input id="f7" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('ingredients',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveIng(${id||'null'})">저장</button>
    </div>
    </div>`);
}

function updateIngCats(type) {
  const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const sel=document.getElementById('f4');
  if(sel) sel.innerHTML=(type==='포장재'?pkgCats:ingCats).map(c=>`<option>${c}</option>`).join('');
}

async function saveIng(id) {
  const type=v('f0');
  const data={원료명:v('f1'),제조처:v('f2'),수량:v('f3'),입고일:v('f8'),category:v('f4'),CoA:v('f5'),판정:v('f6'),비고:v('f7'),stockType:type};
  if(id) await DB.put('ingredients',{...data,id}); else await DB.add('ingredients',data);
  stockSubTab=type; closeSheet(); await renderTab('stock');
}

/* ════ 배치 폼 — 제품 마스터 선택 → 표준서 자동 참조 ════ */
async function openBatchForm(id) {
  const [list, products] = await Promise.all([DB.getAll('batches'), DB.getAll('products')]);
  const item = id ? list.find(b=>b.id===id) : {};

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">${id?'배치 수정':'새 배치 추가'}</div>

    <div style="background:var(--teal-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--teal-dark)">
      <i class="ti ti-info-circle"></i>
      <b>제품 마스터 선택</b>하면 배합비·전성분·목표중량이 표준서에서 자동으로 참조됩니다.
    </div>

    <label>제품 마스터 (제품표준서 AF-PS)
      <select id="b-prodid" onchange="onSelectProduct()">
        <option value="">-- 제품 선택 (표준서 자동 연동) --</option>
        ${products.map(p=>`<option value="${p.id}" ${item&&item.productId===p.id?'selected':''}>${p.제품명} (${p.문서번호})</option>`).join('')}
        <option value="new">+ 신규 제품 마스터 등록</option>
      </select>
    </label>

    <!-- 표준서에서 가져온 정보 (읽기 전용) -->
    <div id="prod-ref-box" style="display:${item&&item.productId?'block':'none'};background:var(--gray-bg);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:10px;font-size:11px;color:var(--text3)">
      <div style="font-weight:700;color:var(--teal-dark);margin-bottom:4px">📋 표준서 참조 정보 (AF-PS — 수정 불가)</div>
      <div id="prod-ref-content"></div>
    </div>

    <label>제품명 (표시용)<input id="b1" value="${(item&&item.제품명)||''}"></label>
    <label>문서번호 (AF-MI)<input id="b2" value="${(item&&item.문서번호)||''}"></label>
    <label>제조번호<input id="b3" value="${(item&&item.제조번호)||''}"></label>
    <label>제조일<input type="date" id="b4" value="${(item&&item.date)||''}"></label>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>투입량 (g)<input type="number" id="b6" value="${(item&&item.투입량)||''}"></label>
      <label>실제수량 (ea)<input type="number" id="b8" value="${(item&&item.실제수량)||''}"></label>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label>실측 중량 (g)<input type="number" id="b17" value="${(item&&item.실측중량)||''}" placeholder="예: 100"></label>
      <label>색상 결과<input id="b-color" value="${(item&&item.색상결과)||''}"></label>
    </div>

    <label>상태<select id="b9">${['제조중','숙성중','판매중','완료','부적합'].map(s=>`<option ${item&&item.상태===s?'selected':''}>${s}</option>`).join('')}</select></label>

    <label>이상여부<select id="b13"><option ${item&&item.이상==='이상없음'?'selected':''}>이상없음</option><option ${item&&item.이상==='이상있음'?'selected':''}>이상있음</option></select></label>
    <label>비고<input id="b14" value="${(item&&item.비고)||''}"></label>

    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('batches',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveBatch(${id||'null'})">저장</button>
    </div>
    </div>`);

  // 이미 제품 선택된 경우 참조 정보 표시
  if(item && item.productId) {
    const prod = products.find(p=>p.id===item.productId);
    if(prod) showProdRef(prod);
  }
}

function showProdRef(prod) {
  const box = document.getElementById('prod-ref-box');
  const content = document.getElementById('prod-ref-content');
  if(!box||!content) return;
  box.style.display = 'block';
  content.innerHTML = `
    <div>제조방법: <b>${prod.제조방법||'-'}</b></div>
    <div>기준 투입량: <b>${prod.기준투입량||'-'}g</b> · 이론수량: <b>${prod.이론수량||'-'}ea</b></div>
    <div>목표 중량: <b>${prod.목표중량||'-'}</b></div>
    <div>색상 기준: <b>${prod.색상기준||'-'}</b></div>
    <div>유통기한: <b>${prod.유통기한||'-'}</b></div>
    <div style="margin-top:4px">전성분: <span style="font-size:10px">${(prod.전성분||'-').slice(0,80)}${prod.전성분&&prod.전성분.length>80?'…':''}</span></div>
  `;
  // 제품명 자동 채우기 (빈 경우에만)
  const b1 = document.getElementById('b1');
  if(b1 && !b1.value) b1.value = prod.제품명;
}

async function onSelectProduct() {
  const sel = document.getElementById('b-prodid');
  const val = sel?.value;
  if(val === 'new') {
    closeSheet();
    openProductMasterForm(null);
    return;
  }
  if(!val) {
    const box = document.getElementById('prod-ref-box');
    if(box) box.style.display = 'none';
    return;
  }
  const products = await DB.getAll('products');
  const prod = products.find(p=>String(p.id)===String(val));
  if(prod) showProdRef(prod);
}

async function saveBatch(id) {
  const prodId = document.getElementById('b-prodid')?.value;
  const data = {
    productId: prodId && prodId !== 'new' ? +prodId : null,
    제품명: v('b1'), 문서번호: v('b2'), 제조번호: v('b3'), date: v('b4'),
    투입량: +v('b6'), 실제수량: +v('b8'),
    상태: v('b9'),
    실측중량: v('b17') ? +v('b17') : null,
    색상결과: v('b-color'),
    이상: v('b13'), 비고: v('b14')
  };
  if(id) await DB.put('batches',{...data,id});
  else    await DB.add('batches',data);
  closeSheet(); await renderTab('manufacture');
}

/* ═══════════════════════════════════
   위생 폼 — 설비점검 항목 추가
════════════════════════════════════*/
function openHygieneForm(preDate) {
  const ds = preDate||today.toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">위생 점검 기록</div>
    <label>점검일<input type="date" id="h1" value="${ds}"></label>
    <label>점검 유형
      <select id="h2" onchange="updateHygExtra()">
        <option>청소점검</option>
        <option>온도·습도</option>
        <option>제조위생</option>
        <option>방충방서</option>
        <option>설비점검</option>
      </select>
    </label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" placeholder="이상 없으면 비워두세요"></label>
    <label>확인자<input id="h6" value="변민정"></label>
    <div class="sheet-btns">
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg(null)">저장</button>
    </div>
    </div>`);
  updateHygExtra();
}

async function openHygieneEditForm(id) {
  const list = await DB.getAll('hygiene');
  const r = list.find(h=>h.id===id);
  if(!r) return;
  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-inner">
    <div class="sheet-title">위생 점검 수정</div>
    <label>점검일<input type="date" id="h1" value="${r.date||''}"></label>
    <label>점검 유형
      <select id="h2" onchange="updateHygExtra()">
        ${['청소점검','온도·습도','제조위생','방충방서','설비점검'].map(t=>`<option ${r.type===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" value="${r.이슈||''}"></label>
    <label>확인자<input id="h6" value="${r.확인자||'변민정'}"></label>
    <div class="sheet-btns">
      <button class="btn-del" onclick="delItem('hygiene',${id})">삭제</button>
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg(${id})">저장</button>
    </div>
    </div>`);
  setTimeout(()=>{
    updateHygExtra();
    if(r.type==='온도·습도'){
      const t=document.getElementById('h3'),h=document.getElementById('h4');
      if(t)t.value=r.온도||''; if(h)h.value=r.습도||'';
    } else if(r.type==='방충방서'){
      const s=document.getElementById('h-screen'),p=document.getElementById('h-pest'),ro=document.getElementById('h-rodent');
      if(s)s.value=r.방충망||'양호'; if(p)p.value=r.해충||'없음'; if(ro)ro.value=r.설치류||'없음';
    } else if(r.type==='청소점검'&&r.items){
      ['원료보관','부자재','완제품','작업대','도구류','포장실'].forEach(k=>{
        const el2=document.getElementById('h-'+k);
        if(el2)el2.value=r.items[k]||'청결';
      });
    } else if(r.type==='설비점검'&&r.items){
      ['전자저울','스틱블렌더','온도계','실리콘몰드','스테인리스용기','기타기구'].forEach(k=>{
        const el2=document.getElementById('h-equip-'+k);
        if(el2)el2.value=r.items[k]||'정상';
      });
    }
  },50);
}

function updateHygExtra() {
  const sel=document.getElementById('h2'), el=document.getElementById('h-extra');
  if(!sel||!el) return;
  if(sel.value==='온도·습도') {
    el.innerHTML=`<label>온도 (°C)<input type="number" id="h3" placeholder="예: 23"></label>
                  <label>습도 (%)<input type="number" id="h4" placeholder="예: 58"></label>`;
  } else if(sel.value==='방충방서') {
    el.innerHTML=`<label>방충망 상태<select id="h-screen"><option>양호</option><option>불량</option></select></label>
                  <label>해충 발견<select id="h-pest"><option>없음</option><option>있음</option></select></label>
                  <label>설치류<select id="h-rodent"><option>없음</option><option>있음</option></select></label>`;
  } else if(sel.value==='청소점검') {
    el.innerHTML=`
      <label>원료보관<select id="h-원료보관"><option>청결</option><option>불량</option></select></label>
      <label>부자재보관<select id="h-부자재"><option>청결</option><option>불량</option></select></label>
      <label>완제품보관<select id="h-완제품"><option>청결</option><option>불량</option></select></label>
      <label>작업대(칭량)<select id="h-작업대"><option>청결</option><option>불량</option></select></label>
      <label>도구류(조제)<select id="h-도구류"><option>청결</option><option>불량</option></select></label>
      <label>포장실<select id="h-포장실"><option>청결</option><option>불량</option></select></label>`;
  } else if(sel.value==='설비점검') {
    el.innerHTML=`
      <label>전자저울<select id="h-equip-전자저울"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>스틱블렌더<select id="h-equip-스틱블렌더"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>온도계<select id="h-equip-온도계"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>실리콘몰드<select id="h-equip-실리콘몰드"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>스테인리스용기<select id="h-equip-스테인리스용기"><option>정상</option><option>이상</option><option>수리필요</option></select></label>
      <label>기타기구<select id="h-equip-기타기구"><option>정상</option><option>이상</option><option>수리필요</option></select></label>`;
  } else {
    el.innerHTML='';
  }
}

async function saveHyg(id) {
  const type=v('h2');
  const data={date:v('h1'),type,확인자:v('h6'),이슈:v('h5'),status:'완료'};
  if(type==='온도·습도'){
    data.온도=+v('h3'); data.습도=+v('h4');
    if(data.온도>35||data.습도>80) data.status='문제임박';
  } else if(type==='방충방서'){
    data.방충망=v('h-screen')||'양호';
    data.해충=v('h-pest')||'없음';
    data.설치류=v('h-rodent')||'없음';
    if(data.해충==='있음'||data.설치류==='있음') data.status='문제임박';
  } else if(type==='청소점검'){
    data.items={
      원료보관:v('h-원료보관')||'청결',
      부자재:v('h-부자재')||'청결',
      완제품:v('h-완제품')||'청결',
      작업대:v('h-작업대')||'청결',
      도구류:v('h-도구류')||'청결',
      포장실:v('h-포장실')||'청결'
    };
  } else if(type==='설비점검'){
    data.items={
      전자저울:v('h-equip-전자저울')||'정상',
      스틱블렌더:v('h-equip-스틱블렌더')||'정상',
      온도계:v('h-equip-온도계')||'정상',
      실리콘몰드:v('h-equip-실리콘몰드')||'정상',
      스테인리스용기:v('h-equip-스테인리스용기')||'정상',
      기타기구:v('h-equip-기타기구')||'정상'
    };
    const hasIssue = Object.values(data.items).some(v=>v!=='정상');
    if(hasIssue) data.status='문제임박';
  }
  if(id) await DB.put('hygiene',{...data,id}); else await DB.add('hygiene',data);
  closeSheet(); await renderTab('hygiene');
}

/* ════ 생산실적 폼 — 판매채널 수정 가능 ════ */
async function openProductionForm(id) {
  const [list] = await Promise.all([DB.getAll('production')]);
  const item = id ? list.find(p=>p.id===id) : {};
  const ds = today.toISOString().split('T')[0];
  const batches = await DB.getAll('batches');
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">${id?'생산실적 수정':'생산실적 추가'}</div>
    <label>날짜<input type="date" id="p1" value="${(item&&item.date)||ds}"></label>
    <label>제품명
      <select id="p2" onchange="document.getElementById('p2-custom-wrap').style.display=this.value==='__custom'?'block':'none'">
        ${batches.map(b=>`<option ${item&&item.제품명===b.제품명?'selected':''}>${b.제품명}</option>`).join('')}
        <option value="__custom" ${item&&item.__customName?'selected':''}>직접입력</option>
      </select>
    </label>
    <div id="p2-custom-wrap" style="${item&&item.__customName?'':'display:none'}">
      <label>제품명 직접입력<input id="p2c" value="${(item&&item.__customName)||''}"></label>
    </div>
    <label>수량 (판매 단위 개수)<input type="number" id="p3" value="${(item&&item.수량)||''}" placeholder="예: 55"></label>
    <label>유형<select id="p4">
      ${['생산','출하','반품','폐기'].map(t=>`<option ${item&&item.유형===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>판매 채널
      <select id="p5" onchange="document.getElementById('p5-custom-wrap').style.display=this.value==='__custom'?'block':'none'">
        ${['아이디어스','스마트스토어','신세계 꿈상회','고향사랑기부제','직접판매','기타','직접입력'].map(c=>`
          <option value="${c==='직접입력'?'__custom':c}" ${item&&item.채널===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </label>
    <div id="p5-custom-wrap" style="display:none">
      <label>채널 직접입력<input id="p5c" placeholder="예: 팝업스토어"></label>
    </div>
    <label>비고<input id="p6" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('production',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveProd(${id||'null'})">저장</button>
    </div></div>`);
}

async function saveProd(id) {
  const selVal = v('p2');
  const prodName = selVal==='__custom' ? (v('p2c')||'기타') : selVal;
  const chVal = v('p5');
  const channel = chVal==='__custom' ? (v('p5c')||'기타') : chVal;
  const data = {
    date:v('p1'), 제품명:prodName, 수량:+v('p3'),
    유형:v('p4'), 채널:channel, 비고:v('p6'),
    __customName: selVal==='__custom' ? v('p2c') : undefined
  };
  if(id) await DB.put('production',{...data,id}); else await DB.add('production',data);
  closeSheet(); await renderTab('production');
}

/* ════ 바코드 탭 ════ */
async function renderBarcode(el) {
  renderBarcodeTab(el);
}

/* ════ 공통 유틸 ════ */
function v(id) { const el=document.getElementById(id); return el?el.value:''; }
function drow(l,val) { return `<div class="drow"><span class="drow-l">${l}</span><span class="drow-r">${val||'-'}</span></div>`; }
function badgeClass(val) {
  const g=['적합','판매중','완료','이상없음','수취'];
  const a=['미기입','미수취','숙성중','제조중'];
  const r=['부적합','이상있음','문제임박'];
  if(g.includes(val)) return 'badge-green';
  if(a.includes(val)) return 'badge-orange';
  if(r.includes(val)) return 'badge-red';
  return 'badge-gray';
}
function toggleCard(hd) { hd.nextElementSibling.classList.toggle('hide'); }
function toggleCheck(item) {
  const done=item.classList.toggle('checked');
  const c=item.querySelector('.check-circle');
  if(c) c.innerHTML=done?'<i class="ti ti-check"></i>':'';
}
async function saveChecklist() {
  await DB.add('hygiene',{date:today.toISOString().split('T')[0],type:'제조위생',확인자:'변민정',status:'완료'});
  alert('제조 점검 완료가 저장되었습니다.');
  await renderTab('mfcheck');
}
function changeMonth(d) {
  calMonth+=d;
  if(calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;}
  renderTab('hygiene');
}
function selectDate(ds) { selectedDate=selectedDate===ds?null:ds; renderTab('hygiene'); }
function clearDateFilter() { selectedDate=null; renderTab('hygiene'); }

function showSheet(html) {
  document.getElementById('sheet-body').innerHTML=html;
  document.getElementById('sheet').classList.remove('hide');
  document.getElementById('sheet-overlay').classList.remove('hide');
}
function closeSheet() {
  document.getElementById('sheet').classList.add('hide');
  document.getElementById('sheet-overlay').classList.add('hide');
}
async function delItem(store, id) {
  if(!confirm('삭제할까요?')) return;
  await DB.remove(store,id); closeSheet(); await renderTab(currentTab);
}

/* ════ window 노출 ════ */
window.switchStockTab=switchStockTab;
window.openIngForm=openIngForm; window.saveIng=saveIng; window.updateIngCats=updateIngCats;
window.openBatchForm=openBatchForm; window.saveBatch=saveBatch;
window.pmRecipeEdit=pmRecipeEdit; window.pmRecipeDel=pmRecipeDel; window.pmRecipeAdd=pmRecipeAdd;
window.uploadKclToForm=uploadKclToForm; window.uploadRecipeToForm=uploadRecipeToForm;
window.quickPrintBatch=quickPrintBatch;
window.openProductMasterForm=openProductMasterForm; window.saveProductMaster=saveProductMaster;
window.onSelectProduct=onSelectProduct; window.showProdRef=showProdRef;
window.openHygieneForm=openHygieneForm; window.openHygieneEditForm=openHygieneEditForm;
window.updateHygExtra=updateHygExtra; window.saveHyg=saveHyg;
window.closeSheet=closeSheet; window.delItem=delItem;
window.toggleCard=toggleCard; window.toggleCheck=toggleCheck; window.saveChecklist=saveChecklist;
window.changeMonth=changeMonth; window.selectDate=selectDate; window.clearDateFilter=clearDateFilter;
window.toggleHistory=toggleHistory; window.printRangeMonth=printRangeMonth;
window.printSelectedMonth=printSelectedMonth;
window.setAllDocChk=setAllDocChk; window.openStandardDocByProdId=openStandardDocByProdId; window.openSelectedStandardDoc=openSelectedStandardDoc;
window.cloudSave=cloudSave; window.cloudLoad=cloudLoad;
window.openProductionForm=openProductionForm; window.saveProd=saveProd;
window.handleFileDrop=handleFileDrop; window.handleFileUpload=handleFileUpload;
window.parseDocumentText=parseDocumentText; window.runParseSaved=runParseSaved;
window.runGeneratePDF=runGeneratePDF; window.runPrintDoc=runPrintDoc; window.generateWordDoc=generateWordDoc;
window.openStandardDoc=openStandardDoc;
window.buildStdMMS001=buildStdMMS001; window.buildStdHMS001=buildStdHMS001; window.buildStdQCM001=buildStdQCM001;
window.renderBarcode=renderBarcode;
