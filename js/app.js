/* ============================================================
   에이브릴팜 공방관리 v3 — app.js
   ============================================================ */
'use strict';

/* ── 상태 ── */
let currentTab = 'stock';
let pageStack  = [];   // 뒤로가기 스택
let sheetOpen  = false;

/* ============================================================
   인트로 / 앱 시작
   ============================================================ */
async function startApp(){
  await DB.seedIfEmpty();
  document.getElementById('intro-screen').classList.add('fade-out');
  setTimeout(()=>{
    document.getElementById('intro-screen').style.display='none';
    document.getElementById('main-app').style.display='flex';
    switchTab('stock');
    checkHygieneBadge();
    checkAlerts();
  }, 500);
}

function goHome(){
  pageStack = [];
  updateBackBtn();
  switchTab(currentTab);
}

function goBack(){
  if(pageStack.length > 0){
    const prev = pageStack.pop();
    updateBackBtn();
    prev();
  }
}

function pushPage(renderFn){
  pageStack.push(()=> renderFn());
  updateBackBtn();
}

function updateBackBtn(){
  const btn = document.getElementById('back-btn');
  const tabsWrap = document.getElementById('tabs-wrap');
  if(pageStack.length > 0){
    btn.classList.remove('hidden');
    tabsWrap.style.display = 'none';
  } else {
    btn.classList.add('hidden');
    tabsWrap.style.display = '';
  }
}

/* ============================================================
   탭 전환
   ============================================================ */
function switchTab(tab){
  currentTab = tab;
  pageStack = [];
  updateBackBtn();
  document.querySelectorAll('.tab-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  const renders = {
    stock:       renderStock,
    manufacture: renderManufacture,
    mfcheck:     renderMfCheck,
    sales:       renderSales,
    hygiene:     renderHygiene,
    output:      renderOutput,
    barcode:     renderBarcode,
    settings:    renderSettings,
  };
  if(renders[tab]) renders[tab]();
}

function setContent(html){
  const el = document.getElementById('page-content');
  el.innerHTML = html;
  el.scrollTop = 0;
}

/* ============================================================
   바텀 시트
   ============================================================ */
function openSheet(title, bodyHtml, footerHtml=''){
  document.getElementById('sheet-title').textContent = title;
  document.getElementById('sheet-body').innerHTML = bodyHtml;
  const footer = document.getElementById('sheet-footer');
  if(footerHtml){ footer.innerHTML = footerHtml; footer.classList.remove('hide'); }
  else { footer.classList.add('hide'); }
  document.getElementById('overlay').classList.add('show');
  document.getElementById('sheet').classList.add('show');
  sheetOpen = true;
}
function closeSheet(){
  document.getElementById('overlay').classList.remove('show');
  document.getElementById('sheet').classList.remove('show');
  sheetOpen = false;
}

/* ============================================================
   알림 / 밀린점검
   ============================================================ */
async function checkHygieneBadge(){
  const all = await DB.getAll('hygiene');
  const now = new Date();
  // 이번 주 청소점검이 있는지
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const weekStr = startOfWeek.toISOString().slice(0,10);
  const hasThisWeek = all.some(h=> h.type==='청소점검' && h.date >= weekStr);
  const badge = document.getElementById('badge-hygiene');
  if(badge) badge.classList.toggle('hide', hasThisWeek);
}

async function checkAlerts(){
  const ings = await DB.getAll('ingredients');
  const lowItems = ings.filter(i=> i.stock <= i.minStock);
  if(lowItems.length > 0){
    // 재고 탭 배지는 표시하지 않고 탭 내 배너로만 처리
  }
}

/* ============================================================
   1. 원료 재고 탭
   ============================================================ */
async function renderStock(){
  const ings = await DB.getAll('ingredients');
  const raw = ings.filter(i=>i.type==='원료');
  const pkg = ings.filter(i=>i.type==='포장재');
  const lowRaw = raw.filter(i=>Number(i.stock)<=Number(i.minStock));
  const lowPkg = pkg.filter(i=>Number(i.stock)<=Number(i.minStock));

  let alertHtml = '';
  if(lowRaw.length+lowPkg.length > 0){
    const names = [...lowRaw,...lowPkg].map(i=>i.name).join(', ');
    alertHtml = `<div class="alert-banner warn"><i class="ti ti-alert-triangle"></i><div>
      <strong>재고 부족 ${lowRaw.length+lowPkg.length}건</strong><br>
      <span style="font-size:12px">${names}</span></div></div>`;
  }

  const makeList = (items, label) => {
    if(items.length===0) return `<div class="empty-state"><i class="ti ti-box"></i><p>${label} 항목이 없습니다</p></div>`;
    return items.map((it, idx)=>{
      const pct = it.minStock>0 ? Math.min(100,Math.round(Number(it.stock)/Number(it.minStock)*50)) : 50;
      const cls = Number(it.stock)<=0 ? 'empty' : Number(it.stock)<=Number(it.minStock) ? 'low' : '';
      const badge = Number(it.stock)<=0 ? '<span class="badge badge-red">품절</span>' :
                    Number(it.stock)<=Number(it.minStock) ? '<span class="badge badge-amber">부족</span>' :
                    '<span class="badge badge-green">충분</span>';
      return `<div class="list-item" onclick="editIngredient(${it.id})">
        <span class="item-no">${idx+1}</span>
        <div class="list-item-body">
          <div class="list-item-title">${it.name}</div>
          <div class="list-item-sub">${it.supplier||''} · 최소재고 ${it.minStock}${it.unit}</div>
          <div class="stock-bar mt8"><div class="stock-bar-fill ${cls}" style="width:${Math.max(5,pct)}%"></div></div>
        </div>
        <div class="list-item-right">
          <div class="fw700 fs14">${it.stock}<span class="fs12 fw600 color-text2">${it.unit}</span></div>
          ${badge}
        </div>
      </div>`;
    }).join('');
  };

  setContent(`
    ${alertHtml}
    <div class="section-hd full-width">
      <span class="section-title">원료 (${raw.length})</span>
      <button class="section-action" onclick="addIngredient('원료')"><i class="ti ti-plus"></i> 추가</button>
    </div>
    ${makeList(raw,'원료')}
    <div class="section-hd full-width mt16">
      <span class="section-title">포장재 (${pkg.length})</span>
      <button class="section-action" onclick="addIngredient('포장재')"><i class="ti ti-plus"></i> 추가</button>
    </div>
    ${makeList(pkg,'포장재')}
    <div style="height:16px"></div>
  `);
}

function addIngredient(type='원료'){
  openSheet(`${type} 추가`, ingFormHtml({type}),
    `<button class="btn btn-primary btn-block" onclick="saveIngredient(0)">저장</button>`);
}

async function editIngredient(id){
  const it = await DB.getOne('ingredients', id);
  if(!it) return;
  openSheet(`${it.type} 수정`, ingFormHtml(it),
    `<div class="flex gap8">
      <button class="btn btn-danger" style="flex:1" onclick="deleteIngredient(${id})"><i class="ti ti-trash"></i> 삭제</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveIngredient(${id})">저장</button>
    </div>`);
}

function ingFormHtml(it={}){
  return `
    <input type="hidden" id="ing-id" value="${it.id||0}">
    <div class="form-group">
      <label class="form-label">구분</label>
      <select class="form-input" id="ing-type">
        <option value="원료" ${(it.type||'원료')==='원료'?'selected':''}>원료</option>
        <option value="포장재" ${it.type==='포장재'?'selected':''}>포장재</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">재료명 *</label>
      <input class="form-input" id="ing-name" placeholder="예: 올리브오일" value="${it.name||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">현재 재고</label>
        <input class="form-input" id="ing-stock" type="number" step="0.1" value="${it.stock||0}">
      </div>
      <div class="form-group">
        <label class="form-label">단위</label>
        <select class="form-input" id="ing-unit">
          ${['g','kg','mL','L','개','매','병'].map(u=>`<option ${(it.unit||'g')===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">최소 재고</label>
        <input class="form-input" id="ing-min" type="number" step="0.1" value="${it.minStock||0}">
      </div>
      <div class="form-group">
        <label class="form-label">공급처</label>
        <input class="form-input" id="ing-supplier" value="${it.supplier||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">메모</label>
      <input class="form-input" id="ing-note" value="${it.note||''}">
    </div>`;
}

async function saveIngredient(id){
  const data = {
    type: document.getElementById('ing-type').value,
    name: document.getElementById('ing-name').value.trim(),
    stock: parseFloat(document.getElementById('ing-stock').value)||0,
    unit: document.getElementById('ing-unit').value,
    minStock: parseFloat(document.getElementById('ing-min').value)||0,
    supplier: document.getElementById('ing-supplier').value.trim(),
    note: document.getElementById('ing-note').value.trim(),
  };
  if(!data.name){ alert('재료명을 입력하세요.'); return; }
  if(id > 0){ data.id = id; await DB.put('ingredients', data); }
  else { await DB.add('ingredients', data); }
  closeSheet();
  renderStock();
}

async function deleteIngredient(id){
  if(!confirm('삭제하시겠습니까?')) return;
  await DB.remove('ingredients', id);
  closeSheet();
  renderStock();
}

/* ============================================================
   2. 제품 제조 탭
   ============================================================ */
async function renderManufacture(){
  const batches = await DB.getAll('batches');
  const items = batches.slice().reverse();

  const statusBadge = s => ({
    '판매중': '<span class="badge badge-green">판매중</span>',
    '재고있음': '<span class="badge badge-green">재고있음</span>',
    '품절': '<span class="badge badge-gray">품절</span>',
    '생산중': '<span class="badge badge-amber">생산중</span>',
  }[s] || `<span class="badge badge-gray">${s}</span>`);

  const listHtml = items.length===0
    ? `<div class="empty-state full-width"><i class="ti ti-flask"></i><p>제조 내역이 없습니다<br>오른쪽 상단의 + 버튼으로 추가하세요</p>
        <button class="empty-action" onclick="addBatch()"><i class="ti ti-plus"></i> 제조 추가</button></div>`
    : items.map((b, idx)=>`
        <div class="list-item" onclick="viewBatch(${b.id})">
          <span class="item-no">${items.length-idx}</span>
          <div class="list-item-body">
            <div class="list-item-title">${b.제품명}</div>
            <div class="list-item-sub">${b.제조번호} · ${b.date}</div>
          </div>
          <div class="list-item-right">
            ${statusBadge(b.상태)}
            <div class="fs12 color-text2 mt8">${b.실제수량||0}개 생산</div>
          </div>
        </div>`).join('');

  setContent(`
    <div class="section-hd full-width">
      <span class="section-title">제조 내역 (${batches.length})</span>
      <button class="section-action" onclick="addBatch()"><i class="ti ti-plus"></i> 추가</button>
    </div>
    ${listHtml}
    <div style="height:16px"></div>
  `);
}

async function viewBatch(id){
  const b = await DB.getOne('batches', id);
  if(!b) return;

  const prevRender = ()=> renderManufacture();
  pushPage(prevRender);

  const statusBadge = s => ({
    '판매중':'<span class="badge badge-green">판매중</span>',
    '재고있음':'<span class="badge badge-green">재고있음</span>',
    '품절':'<span class="badge badge-gray">품절</span>',
    '생산중':'<span class="badge badge-amber">생산중</span>',
  }[s]||`<span class="badge badge-gray">${s}</span>`);

  const recipeRows = (b.레시피||[]).map(r=>`
    <tr>
      <td>${r.no}</td>
      <td>${r.원료}</td>
      <td style="font-size:11px;color:#888">${r.INCI||''}</td>
      <td class="text-right">${r.이론량}g</td>
      <td class="text-right">${r.비율||''}%</td>
      <td class="text-right">${r.실사용량||r.이론량}g</td>
    </tr>`).join('');

  setContent(`
    <div class="card full-width fade-in">
      <div class="card-header">
        <div>
          <div class="card-title fs14">${b.제품명}</div>
          <div class="card-sub">${b.제조번호}</div>
        </div>
        ${statusBadge(b.상태)}
      </div>
      <table class="data-table" style="font-size:12px">
        <tr><td class="fw700">문서번호</td><td>${b.문서번호||''}</td><td class="fw700">제조일</td><td>${b.date||''}</td></tr>
        <tr><td class="fw700">제조방법</td><td>${b.제조방법||''}</td><td class="fw700">투입량</td><td>${b.투입량||''}g</td></tr>
        <tr><td class="fw700">이론수량</td><td>${b.이론수량||''}개</td><td class="fw700">실제수량</td><td>${b.실제수량||''}개</td></tr>
        <tr><td class="fw700">목표중량</td><td>${b.목표중량||''}</td><td class="fw700">실측중량</td><td>${b.실측중량||''}g</td></tr>
        <tr><td class="fw700">KCL 성적서</td><td colspan="3">${b.KCL||'없음'} ${b.KCL발행일?'('+b.KCL발행일+')':''}</td></tr>
        <tr><td class="fw700">내용량(%)</td><td>${b.내용량||''}</td><td class="fw700">유리알칼리</td><td>${b.유리알칼리||''}</td></tr>
        <tr><td class="fw700">바코드</td><td colspan="3">${b.바코드||''}</td></tr>
      </table>
    </div>

    ${b.레시피&&b.레시피.length>0?`
    <div class="card full-width fade-in">
      <div class="card-title mb12">원료 배합표</div>
      <div style="overflow-x:auto">
        <table class="data-table" style="font-size:12px;min-width:480px">
          <thead><tr><th>No</th><th>원료명</th><th>INCI</th><th>이론량</th><th>비율</th><th>실사용량</th></tr></thead>
          <tbody>${recipeRows}</tbody>
        </table>
      </div>
    </div>`:''}

    ${b.전성분?`
    <div class="card full-width fade-in">
      <div class="card-title mb8">전성분</div>
      <div style="font-size:12px;line-height:1.8;color:#555">${b.전성분}</div>
    </div>`:''}

    ${b.알레르기?`
    <div class="alert-banner warn full-width"><i class="ti ti-alert-circle"></i>
      <div><strong>알레르기 유발성분(향료 유래)</strong><br><span style="font-size:12px">${b.알레르기}</span></div>
    </div>`:''}

    <div class="flex gap8 full-width" style="margin-top:4px">
      <button class="btn btn-secondary" style="flex:1" onclick="editBatch(${b.id})"><i class="ti ti-edit"></i> 수정</button>
      <button class="btn btn-primary" style="flex:1" onclick="printBatchDocs(${b.id})"><i class="ti ti-printer"></i> 서류 출력</button>
    </div>
    <div style="height:16px"></div>
  `);
}

async function addBatch(){
  const batches = await DB.getAll('batches');
  const nextNum = batches.length + 1;
  const today = new Date().toISOString().slice(0,10);

  openSheet('제조 추가', batchFormHtml({
    date: today,
    제조방법: 'CP법',
    목표중량: '90g ±5g',
    상태: '생산중',
    이론수량: 11,
    투입량: 1190,
  }), `<button class="btn btn-primary btn-block" onclick="saveBatch(0)">저장</button>`);
}

async function editBatch(id){
  const b = await DB.getOne('batches', id);
  if(!b) return;
  openSheet('제조 수정', batchFormHtml(b),
    `<div class="flex gap8">
      <button class="btn btn-danger" style="flex:1" onclick="deleteBatch(${id})"><i class="ti ti-trash"></i> 삭제</button>
      <button class="btn btn-primary" style="flex:2" onclick="saveBatch(${id})">저장</button>
    </div>`);
}

function batchFormHtml(b={}){
  const statusOpts = ['생산중','재고있음','판매중','품절'];
  return `
    <div class="form-group">
      <label class="form-label">제품명 *</label>
      <input class="form-input" id="bat-name" placeholder="예: 에이브릴팜 당근비누" value="${b.제품명||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">제조번호</label>
        <input class="form-input" id="bat-batchno" placeholder="APBO10001-D1354" value="${b.제조번호||''}">
      </div>
      <div class="form-group">
        <label class="form-label">문서번호</label>
        <input class="form-input" id="bat-docno" placeholder="EF-MI-004" value="${b.문서번호||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">제조일 *</label>
        <input class="form-input" id="bat-date" type="date" value="${b.date||''}">
      </div>
      <div class="form-group">
        <label class="form-label">제조방법</label>
        <input class="form-input" id="bat-method" value="${b.제조방법||'CP법'}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">투입량(g)</label>
        <input class="form-input" id="bat-input" type="number" value="${b.투입량||''}">
      </div>
      <div class="form-group">
        <label class="form-label">이론수량(개)</label>
        <input class="form-input" id="bat-theory" type="number" value="${b.이론수량||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">실제수량(개)</label>
        <input class="form-input" id="bat-actual" type="number" value="${b.실제수량||''}">
      </div>
      <div class="form-group">
        <label class="form-label">상태</label>
        <select class="form-input" id="bat-status">
          ${statusOpts.map(s=>`<option ${(b.상태||'생산중')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">목표중량</label>
        <input class="form-input" id="bat-tgtw" value="${b.목표중량||'90g ±5g'}">
      </div>
      <div class="form-group">
        <label class="form-label">실측중량(g) <span style="color:var(--green)">✏️</span></label>
        <input class="form-input" id="bat-actw" type="number" placeholder="직접 입력" value="${b.실측중량||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">바코드</label>
        <input class="form-input" id="bat-barcode" value="${b.바코드||''}">
      </div>
      <div class="form-group">
        <label class="form-label">KCL 성적서번호</label>
        <input class="form-input" id="bat-kcl" value="${b.KCL||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">KCL 발행일</label>
        <input class="form-input" id="bat-kcldate" type="date" value="${b.KCL발행일||''}">
      </div>
      <div class="form-group">
        <label class="form-label">내용량(%)</label>
        <input class="form-input" id="bat-content" value="${b.내용량||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">유리알칼리</label>
      <input class="form-input" id="bat-alkali" value="${b.유리알칼리||'검출 안 됨'}">
    </div>
    <div class="form-group">
      <label class="form-label">전성분</label>
      <textarea class="form-input" id="bat-inci" rows="3">${b.전성분||''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">알레르기 유발성분(향료 유래)</label>
      <input class="form-input" id="bat-allergy" value="${b.알레르기||''}">
    </div>
  `;
}

async function saveBatch(id){
  const data = {
    제품명: document.getElementById('bat-name').value.trim(),
    제조번호: document.getElementById('bat-batchno').value.trim(),
    문서번호: document.getElementById('bat-docno').value.trim(),
    date: document.getElementById('bat-date').value,
    제조방법: document.getElementById('bat-method').value.trim(),
    투입량: parseFloat(document.getElementById('bat-input').value)||0,
    이론수량: parseInt(document.getElementById('bat-theory').value)||0,
    실제수량: parseInt(document.getElementById('bat-actual').value)||0,
    상태: document.getElementById('bat-status').value,
    목표중량: document.getElementById('bat-tgtw').value.trim(),
    실측중량: parseFloat(document.getElementById('bat-actw').value)||0,
    바코드: document.getElementById('bat-barcode').value.trim(),
    KCL: document.getElementById('bat-kcl').value.trim(),
    KCL발행일: document.getElementById('bat-kcldate').value,
    내용량: document.getElementById('bat-content').value.trim(),
    유리알칼리: document.getElementById('bat-alkali').value.trim(),
    전성분: document.getElementById('bat-inci').value.trim(),
    알레르기: document.getElementById('bat-allergy').value.trim(),
    레시피: id>0 ? (await DB.getOne('batches',id)).레시피||[] : [],
  };
  if(!data.제품명){ alert('제품명을 입력하세요.'); return; }
  if(id>0){ data.id=id; await DB.put('batches', data); }
  else { await DB.add('batches', data); }
  closeSheet();
  renderManufacture();
}

async function deleteBatch(id){
  if(!confirm('삭제하시겠습니까?')) return;
  await DB.remove('batches', id);
  closeSheet();
  pageStack = [];
  updateBackBtn();
  renderManufacture();
}

/* ============================================================
   3. 생산실적 탭
   ============================================================ */
async function renderSales(){
  const all = await DB.getAll('sales');
  const items = all.slice().reverse();

  const channels = ['스마트스토어','에이블리','쿠팡','오프라인','자체몰','기타'];

  const listHtml = items.length===0
    ? `<div class="empty-state full-width"><i class="ti ti-chart-bar"></i>
        <p>생산실적이 없습니다.<br>아래 버튼으로 추가하세요</p>
        <button class="empty-action" onclick="addSale()"><i class="ti ti-plus"></i> 실적 추가</button></div>`
    : items.map((s, idx)=>`
        <div class="list-item" onclick="editSale(${s.id})">
          <span class="item-no">${items.length-idx}</span>
          <div class="list-item-body">
            <div class="list-item-title">${s.product}</div>
            <div class="list-item-sub">${s.date} · ${s.channel||''} · ${s.qty}개</div>
          </div>
          <div class="list-item-right">
            <div class="fw700 fs14">${(s.price||(0)).toLocaleString()}원</div>
            <div class="fs12 color-text2">${s.qty}개</div>
          </div>
        </div>`).join('');

  setContent(`
    <div class="section-hd full-width">
      <span class="section-title">생산실적 (${all.length})</span>
      <button class="section-action" onclick="addSale()"><i class="ti ti-plus"></i> 추가</button>
    </div>
    ${listHtml}
    <div style="height:16px"></div>
  `);
}

function addSale(){
  const today = new Date().toISOString().slice(0,10);
  openSheet('생산실적 추가', saleFormHtml({date:today}),
    `<button class="btn btn-primary btn-block" onclick="saveSale(0)">저장</button>`);
}

async function editSale(id){
  const s = await DB.getOne('sales', id);
  if(!s) return;
  openSheet('생산실적 수정', saleFormHtml(s),
    `<div class="flex gap8">
      <button class="btn btn-danger" style="flex:1" onclick="deleteSale(${id})"><i class="ti ti-trash"></i></button>
      <button class="btn btn-primary" style="flex:3" onclick="saveSale(${id})">저장</button>
    </div>`);
}

function saleFormHtml(s={}){
  const channels = ['스마트스토어','에이블리','쿠팡','오프라인','자체몰','기타'];
  return `
    <div class="form-group">
      <label class="form-label">제품명 *</label>
      <input class="form-input" id="sale-product" placeholder="예: 에이브릴팜 당근비누" value="${s.product||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">날짜</label>
        <input class="form-input" id="sale-date" type="date" value="${s.date||''}">
      </div>
      <div class="form-group">
        <label class="form-label">수량(개)</label>
        <input class="form-input" id="sale-qty" type="number" value="${s.qty||1}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">단가(원)</label>
        <input class="form-input" id="sale-price" type="number" value="${s.price||0}">
      </div>
      <div class="form-group">
        <label class="form-label">판매채널 <span style="color:var(--green);font-size:11px">수정 가능</span></label>
        <input class="form-input" id="sale-channel" list="channel-list" value="${s.channel||''}">
        <datalist id="channel-list">
          ${['스마트스토어','에이블리','쿠팡','오프라인','자체몰','기타'].map(c=>`<option value="${c}">`).join('')}
        </datalist>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">배치/제조번호</label>
      <input class="form-input" id="sale-batchno" value="${s.batchNo||''}">
    </div>
    <div class="form-group">
      <label class="form-label">메모</label>
      <textarea class="form-input" id="sale-note" rows="2">${s.note||''}</textarea>
    </div>`;
}

async function saveSale(id){
  const data = {
    product: document.getElementById('sale-product').value.trim(),
    date: document.getElementById('sale-date').value,
    qty: parseInt(document.getElementById('sale-qty').value)||1,
    price: parseInt(document.getElementById('sale-price').value)||0,
    channel: document.getElementById('sale-channel').value.trim(),
    batchNo: document.getElementById('sale-batchno').value.trim(),
    note: document.getElementById('sale-note').value.trim(),
  };
  if(!data.product){ alert('제품명을 입력하세요.'); return; }
  if(id>0){ data.id=id; await DB.put('sales',data); }
  else { await DB.add('sales',data); }
  closeSheet();
  renderSales();
}

async function deleteSale(id){
  if(!confirm('삭제하시겠습니까?')) return;
  await DB.remove('sales',id);
  closeSheet();
  renderSales();
}

/* ============================================================
   4. 위생 점검 탭
   ============================================================ */
async function renderHygiene(){
  const all = await DB.getAll('hygiene');
  const now = new Date();
  const nowStr = now.toISOString().slice(0,10);

  // 밀린 점검 계산
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const weekStr = startOfWeek.toISOString().slice(0,10);

  const thisMonthStr = nowStr.slice(0,7);
  const hasWeeklyClean = all.some(h=> h.type==='청소점검' && h.date >= weekStr);
  const hasMonthlyPest = all.some(h=> h.type==='방충방서' && h.date.startsWith(thisMonthStr));

  let alertHtml = '';
  const missed = [];
  if(!hasWeeklyClean) missed.push('이번 주 청소점검 미작성');
  if(!hasMonthlyPest) missed.push('이번 달 방충방서 점검 미작성');
  if(missed.length > 0){
    alertHtml = `<div class="alert-banner warn full-width"><i class="ti ti-bell"></i>
      <div><strong>밀린 점검 ${missed.length}건</strong><br>
      <span style="font-size:12px">${missed.join(' / ')}</span></div>
    </div>`;
  }

  const recent = all.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);

  const typeIcon = t => ({
    '청소점검':'<i class="ti ti-spray" style="color:var(--green)"></i>',
    '방충방서':'<i class="ti ti-bug" style="color:var(--amber)"></i>',
    '설비점검':'<i class="ti ti-tool" style="color:var(--rose)"></i>',
  }[t]||'<i class="ti ti-check"></i>');

  const listHtml = recent.length===0
    ? `<div class="empty-state full-width"><i class="ti ti-clipboard-check"></i>
        <p>위생 점검 기록이 없습니다</p>
        <button class="empty-action" onclick="addHygiene()"><i class="ti ti-plus"></i> 점검 추가</button></div>`
    : recent.map((h, idx)=>`
        <div class="list-item" onclick="editHygiene(${h.id})">
          <div style="width:28px;text-align:center;font-size:18px">${typeIcon(h.type)}</div>
          <div class="list-item-body">
            <div class="list-item-title">${h.type}</div>
            <div class="list-item-sub">${h.date} · ${h.확인자||'변민정'}</div>
          </div>
          <div class="list-item-right">
            <span class="badge ${h.status==='완료'?'badge-green':'badge-amber'}">${h.status||'완료'}</span>
          </div>
        </div>`).join('');

  setContent(`
    ${alertHtml}
    <div class="section-hd full-width">
      <span class="section-title">점검 기록 (${all.length})</span>
      <button class="section-action" onclick="addHygiene()"><i class="ti ti-plus"></i> 추가</button>
    </div>
    ${all.length===0?'':listHtml}
    ${all.length===0?'':all.length>30?`<div class="text-center mt8"><span class="fs12 color-text2">최근 30건 표시</span></div>`:''}
    <div style="height:16px"></div>
  `);
}

function addHygiene(){
  const today = new Date().toISOString().slice(0,10);
  openSheet('위생 점검 추가', hygieneFormHtml({date:today,확인자:'변민정',status:'완료'}),
    `<button class="btn btn-primary btn-block" onclick="saveHygiene(0)">저장</button>`);
}

async function editHygiene(id){
  const h = await DB.getOne('hygiene', id);
  if(!h) return;
  openSheet('위생 점검 수정', hygieneFormHtml(h),
    `<div class="flex gap8">
      <button class="btn btn-danger" style="flex:1" onclick="deleteHygiene(${id})"><i class="ti ti-trash"></i></button>
      <button class="btn btn-primary" style="flex:3" onclick="saveHygiene(${id})">저장</button>
    </div>`);
}

function hygieneFormHtml(h={}){
  const types = ['청소점검','방충방서','설비점검','기타'];
  const cleanItems = ['원료보관','부자재','완제품','작업대','도구류','포장실'];
  const t = h.type||'청소점검';
  const items = h.items||{};

  const cleanHtml = cleanItems.map(k=>`
    <div class="form-row" style="align-items:center;gap:8px;margin-bottom:8px">
      <span style="flex:1;font-size:13px">${k}</span>
      <select class="form-input form-input-sm" id="clean-${k}" style="flex:1;max-width:120px">
        <option value="청결" ${(items[k]||'청결')==='청결'?'selected':''}>✓ 청결</option>
        <option value="불량" ${items[k]==='불량'?'selected':''}>✗ 불량</option>
      </select>
    </div>`).join('');

  const pestHtml = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">방충망 상태</label>
        <select class="form-input" id="pest-net">
          <option value="양호" ${(h.방충망||'양호')==='양호'?'selected':''}>양호</option>
          <option value="불량" ${h.방충망==='불량'?'selected':''}>불량</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">해충 발견</label>
        <select class="form-input" id="pest-bug">
          <option value="없음" ${(h.해충||'없음')==='없음'?'selected':''}>없음</option>
          <option value="있음" ${h.해충==='있음'?'selected':''}>있음</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">설치류</label>
      <select class="form-input" id="pest-rodent">
        <option value="없음" ${(h.설치류||'없음')==='없음'?'selected':''}>없음</option>
        <option value="있음" ${h.설치류==='있음'?'selected':''}>있음</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">조치 내용</label>
      <textarea class="form-input" id="pest-action" rows="2">${h.조치||''}</textarea>
    </div>`;

  return `
    <div class="form-group">
      <label class="form-label">점검 유형</label>
      <select class="form-input" id="hyg-type" onchange="refreshHygieneSubform()">
        ${types.map(t2=>`<option ${(h.type||'청소점검')===t2?'selected':''}>${t2}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">점검일</label>
        <input class="form-input" id="hyg-date" type="date" value="${h.date||''}">
      </div>
      <div class="form-group">
        <label class="form-label">확인자</label>
        <input class="form-input" id="hyg-checker" value="${h.확인자||'변민정'}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">결과</label>
      <select class="form-input" id="hyg-status">
        <option value="완료" ${(h.status||'완료')==='완료'?'selected':''}>완료</option>
        <option value="이슈있음" ${h.status==='이슈있음'?'selected':''}>이슈있음</option>
      </select>
    </div>
    <div id="hyg-subform">
      ${t==='청소점검'?cleanHtml:t==='방충방서'?pestHtml:''}
    </div>
    <div class="form-group">
      <label class="form-label">비고</label>
      <textarea class="form-input" id="hyg-note" rows="2">${h.비고||''}</textarea>
    </div>`;
}

function refreshHygieneSubform(){
  const t = document.getElementById('hyg-type').value;
  const sub = document.getElementById('hyg-subform');
  const cleanItems = ['원료보관','부자재','완제품','작업대','도구류','포장실'];
  if(t==='청소점검'){
    sub.innerHTML = cleanItems.map(k=>`
      <div class="form-row" style="align-items:center;gap:8px;margin-bottom:8px">
        <span style="flex:1;font-size:13px">${k}</span>
        <select class="form-input form-input-sm" id="clean-${k}" style="flex:1;max-width:120px">
          <option value="청결">✓ 청결</option><option value="불량">✗ 불량</option>
        </select>
      </div>`).join('');
  } else if(t==='방충방서'){
    sub.innerHTML = `
      <div class="form-row">
        <div class="form-group"><label class="form-label">방충망</label>
          <select class="form-input" id="pest-net"><option>양호</option><option>불량</option></select></div>
        <div class="form-group"><label class="form-label">해충</label>
          <select class="form-input" id="pest-bug"><option>없음</option><option>있음</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">설치류</label>
        <select class="form-input" id="pest-rodent"><option>없음</option><option>있음</option></select></div>
      <div class="form-group"><label class="form-label">조치</label>
        <textarea class="form-input" id="pest-action" rows="2"></textarea></div>`;
  } else { sub.innerHTML = ''; }
}

async function saveHygiene(id){
  const t = document.getElementById('hyg-type').value;
  const cleanItems = ['원료보관','부자재','완제품','작업대','도구류','포장실'];
  const data = {
    type: t,
    date: document.getElementById('hyg-date').value,
    확인자: document.getElementById('hyg-checker').value.trim(),
    status: document.getElementById('hyg-status').value,
    비고: document.getElementById('hyg-note').value.trim(),
  };
  if(t==='청소점검'){
    data.items = {};
    cleanItems.forEach(k=>{ const el=document.getElementById('clean-'+k); if(el) data.items[k]=el.value; });
  } else if(t==='방충방서'){
    data.방충망 = (document.getElementById('pest-net')||{}).value||'양호';
    data.해충   = (document.getElementById('pest-bug')||{}).value||'없음';
    data.설치류 = (document.getElementById('pest-rodent')||{}).value||'없음';
    data.조치   = (document.getElementById('pest-action')||{}).value||'';
  }
  if(!data.date){ alert('날짜를 입력하세요.'); return; }
  if(id>0){ data.id=id; await DB.put('hygiene',data); }
  else { await DB.add('hygiene',data); }
  closeSheet();
  checkHygieneBadge();
  renderHygiene();
}

async function deleteHygiene(id){
  if(!confirm('삭제하시겠습니까?')) return;
  await DB.remove('hygiene',id);
  closeSheet();
  renderHygiene();
}

/* ============================================================
   5. 문서 출력 탭
   ============================================================ */
async function renderOutput(){
  const batches = await DB.getAll('batches');
  const now = new Date();
  const curY = now.getFullYear(), curM = now.getMonth()+1;

  const batchOpts = batches.map(b=>`<option value="${b.id}">${b.제품명} (${b.제조번호||b.date})</option>`).join('');

  setContent(`
    <div class="card full-width">
      <div class="card-title mb12">📄 제품별 서류 출력</div>
      <div class="form-group">
        <label class="form-label">제품 선택</label>
        <select class="form-input" id="out-batch">
          <option value="">-- 제품을 선택하세요 --</option>
          ${batchOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">출력할 서류 (1개 이상 선택)</label>
        <div class="doc-grid">
          ${[
            ['mi','제조지시서'],['tr','시험성적서'],['ps','제품표준서'],
            ['mms','원료입고기록서'],['qcm','완제품출하검사'],['mh','위생점검기록']
          ].map(([v,l])=>`
            <div class="doc-check" onclick="toggleDocCheck(this)" data-val="${v}">
              <label><input type="checkbox" value="${v}" onclick="event.stopPropagation()"> ${l}</label>
            </div>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary btn-block" onclick="printSelectedDocs()">
        <i class="ti ti-printer"></i> PDF 출력
      </button>
    </div>

    <div class="card full-width mt12">
      <div class="card-title mb12">📅 월별 위생점검 기록 출력</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">연도</label>
          <select class="form-input" id="out-year">
            ${[curY-1,curY,curY+1].map(y=>`<option ${y===curY?'selected':''}>${y}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">월</label>
          <select class="form-input" id="out-month">
            ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===curM?'selected':''}>${i+1}월</option>`).join('')}
          </select>
        </div>
      </div>
      <button class="btn btn-secondary btn-block" onclick="printMonthlyHygiene()">
        <i class="ti ti-file-text"></i> 이달의 위생점검 출력
      </button>
    </div>

    <div class="card full-width mt12">
      <div class="card-title mb12">📁 파일 업로드 & 자동 등록</div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:12px">KCL 성적서 PDF를 업로드하면 제품에 자동 연결됩니다</p>
      <div style="border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;cursor:pointer" onclick="document.getElementById('file-upload').click()">
        <i class="ti ti-upload" style="font-size:28px;color:var(--text3);display:block;margin-bottom:8px"></i>
        <span style="font-size:13px;color:var(--text2)">파일을 여기에 드래그하거나 클릭하여 업로드</span>
        <input type="file" id="file-upload" style="display:none" accept=".pdf,.jpg,.png,.docx" multiple onchange="handleFileUpload(this)">
      </div>
      <div id="upload-result" style="margin-top:8px;font-size:13px;color:var(--green)"></div>
    </div>
    <div style="height:16px"></div>
  `);
}

function toggleDocCheck(el){
  el.classList.toggle('selected');
  const cb = el.querySelector('input[type=checkbox]');
  if(cb) cb.checked = !cb.checked;
}

async function printSelectedDocs(){
  const batchId = parseInt(document.getElementById('out-batch').value||'0');
  const checked = [...document.querySelectorAll('.doc-check.selected')].map(el=>el.dataset.val);

  if(!batchId){ alert('제품을 선택해 주세요.'); return; }
  if(checked.length === 0){ alert('출력할 서류를 1개 이상 선택해 주세요.'); return; }

  const b = await DB.getOne('batches', batchId);
  if(!b){ alert('제품 정보를 찾을 수 없습니다.'); return; }

  const win = window.open('','_blank');
  if(!win){ alert('팝업 차단을 해제해 주세요.'); return; }

  let sections = '';
  if(checked.includes('mi'))  sections += buildMI(b);
  if(checked.includes('tr'))  sections += buildTR(b);
  if(checked.includes('ps'))  sections += buildPS(b);
  if(checked.includes('mms')) sections += buildMMS(b);
  if(checked.includes('qcm')) sections += buildQCM(b);
  if(checked.includes('mh')){
    const hygs = await DB.getAll('hygiene');
    sections += buildMH(hygs, b);
  }

  win.document.write(wrapPrint(sections));
  win.document.close();
  setTimeout(()=>win.print(), 700);
}

async function printBatchDocs(id){
  const b = await DB.getOne('batches', id);
  if(!b) return;
  const win = window.open('','_blank');
  if(!win){ alert('팝업 차단을 해제해 주세요.'); return; }
  win.document.write(wrapPrint(buildMI(b)+buildTR(b)+buildPS(b)));
  win.document.close();
  setTimeout(()=>win.print(), 700);
}

async function printMonthlyHygiene(){
  const year  = parseInt(document.getElementById('out-year').value);
  const month = parseInt(document.getElementById('out-month').value);
  const ym = `${year}-${String(month).padStart(2,'0')}`;
  const all = await DB.getAll('hygiene');
  const recs = all.filter(h=>h.date&&h.date.startsWith(ym));
  const win = window.open('','_blank');
  if(!win){ alert('팝업 차단을 해제해 주세요.'); return; }
  win.document.write(wrapPrint(buildMH(recs, null, year, month)));
  win.document.close();
  setTimeout(()=>win.print(), 700);
}

function handleFileUpload(input){
  const files = [...input.files];
  const res = document.getElementById('upload-result');
  if(files.length===0) return;
  res.innerHTML = `<i class="ti ti-check" style="color:var(--green)"></i> ${files.length}개 파일 업로드됨: ${files.map(f=>f.name).join(', ')}<br><span style="color:var(--text3);font-size:11px">※ 실제 파일은 기기에만 저장됩니다. 서류 출력 시 첨부서류로 활용하세요.</span>`;
}

/* ── 문서 빌더 함수들 ── */
function wrapPrint(body){
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:10px;color:#111;padding:16px}
    h2{font-size:14px;font-weight:700;margin-bottom:3px}
    h3{font-size:12px;font-weight:700;margin:12px 0 6px}
    .doc-meta{font-size:9px;color:#666;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px}
    th,td{padding:4px 7px;border:0.5px solid #bbb;vertical-align:top;font-size:9.5px}
    th{background:#f5f5f0;font-weight:700}
    .doc-section{margin-bottom:20px;page-break-inside:avoid}
    .doc-separator{border:none;border-top:1.5px solid #333;margin:16px 0}
    .footer{margin-top:12px;font-size:8.5px;color:#888;border-top:0.5px solid #ccc;padding-top:6px}
    @media print{body{padding:8px}button{display:none}.doc-section{page-break-inside:avoid}}
  </style></head><body>
  ${body}
  <div class="footer">화장품제조업 등록번호 제6494호 · 책임판매업 등록번호 제18216호 · 에이브릴팜 · 경기도 시흥시 진말1로 18, 에스엠타워 303호 · 출력일: ${new Date().toLocaleDateString('ko-KR')}</div>
  </body></html>`;
}

function buildMI(b){
  const rows = (b.레시피||[]).map(r=>`<tr>
    <td>${r.no}</td><td>${r.원료}</td><td>${r.INCI||''}</td>
    <td>${r.이론량}g</td><td>${r.비율||''}%</td><td>${r.실사용량||r.이론량}g</td><td>□</td></tr>`).join('');
  return `<div class="doc-section">
    <h2>에이브릴팜 제조지시서</h2>
    <div class="doc-meta">문서번호: ${b.문서번호||'EF-MI'} · 제정일자: ${b.date||''} · 개정번호: Rev.01 · 작성/확인: 변민정</div>
    <table><tr><th>제품명</th><td>${b.제품명}</td><th>제조번호</th><td>${b.제조번호||''}</td></tr>
    <tr><th>제조일</th><td>${b.date||''}</td><th>사용기한</th><td>제조일로부터 2년</td></tr>
    <tr><th>제조방법</th><td>${b.제조방법||'CP법'}</td><th>투입량</th><td>${b.투입량||''}g</td></tr>
    <tr><th>이론수량</th><td>${b.이론수량||''}개</td><th>실제수량</th><td>${b.실제수량||''}개</td></tr>
    <tr><th>목표중량</th><td>${b.목표중량||''}</td><th>실측중량</th><td>${b.실측중량||''}g</td></tr></table>
    <h3>▶ 원료 배합표</h3>
    <table><thead><tr><th>No</th><th>원료명</th><th>INCI</th><th>이론량</th><th>비율</th><th>실사용량</th><th>확인</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${b.알레르기?`<p style="font-size:9px;color:#555">※ 알레르기 유발성분(향료 유래): ${b.알레르기}</p>`:''}
    <table style="margin-top:8px"><tr><th>이상여부</th><td>■ 이상 없음 □ 이상 있음</td></tr></table>
  </div><hr class="doc-separator">`;
}

function buildTR(b){
  const rawRows = (b.레시피||[]).map(r=>`<tr>
    <td>${r.no}</td><td>${r.원료}</td><td>${r.INCI||''}</td>
    <td>성상·이물</td><td>이상없음</td><td>■적합 □부적합</td><td>변민정</td></tr>`).join('');
  return `<div class="doc-section">
    <h2>에이브릴팜 시험성적서 — ${b.제품명}</h2>
    <div class="doc-meta">문서번호: EF-TR · 제정일자: ${b.date||''} · 개정번호: Rev.00 · ■관리본</div>
    <h3>▶ ① 원자재 시험성적서 (자사 육안검사)</h3>
    <table><thead><tr><th>No</th><th>원료명</th><th>제조처/로트번호</th><th>시험항목</th><th>시험성적</th><th>판정</th><th>시험자</th></tr></thead>
    <tbody>${rawRows}</tbody></table>
    <h3>▶ ② 완제품 시험성적서 — KCL 공식 품질검사</h3>
    <table>
      <tr><th>제품명</th><td>${b.제품명}</td><th>제조번호</th><td>${b.제조번호||''}</td></tr>
      <tr><th>KCL 성적서</th><td>${b.KCL||''}</td><th>발행일</th><td>${b.KCL발행일||''}</td></tr>
    </table>
    <table><thead><tr><th>시험항목</th><th>단위</th><th>기준</th><th>결과</th><th>판정</th></tr></thead>
    <tbody>
      <tr><td>내용량(건조)</td><td>%</td><td>97 이상</td><td>${b.내용량||''}</td><td>■ 적합</td></tr>
      <tr><td>유리알칼리</td><td>%</td><td>0.1 이하</td><td>${b.유리알칼리||'검출 안 됨'}</td><td>■ 적합</td></tr>
    </tbody></table>
    <h3>▶ ③ 자사 완제품 육안검사</h3>
    <table><thead><tr><th>검사항목</th><th>기준</th><th>결과</th><th>판정</th><th>시험자</th></tr></thead>
    <tbody>
      <tr><td>성상</td><td>고형, 표면 균일, 이물 없음</td><td>이상없음</td><td>■적합</td><td>변민정</td></tr>
      <tr><td>색상</td><td>기준색상</td><td>이상없음</td><td>■적합</td><td>변민정</td></tr>
      <tr><td>이물</td><td>불검출</td><td>■불검출</td><td>■적합</td><td>변민정</td></tr>
      <tr><td>중량(건조)</td><td>${b.목표중량||'90g ±5g'}</td><td>${b.실측중량||''}g</td><td>■적합</td><td>변민정</td></tr>
    </tbody></table>
    <table><tr><th>종합판정</th><td>■ 출하 승인 □ 출하 보류</td></tr>
    <tr><th>총괄책임자</th><td>변민정 (인)</td></tr></table>
  </div><hr class="doc-separator">`;
}

function buildPS(b){
  const rows = (b.레시피||[]).map(r=>`<tr>
    <td>${r.no}</td><td>${r.원료}</td><td>${r.INCI||''}</td>
    <td>${r.이론량}g</td><td>${r.비율||''}%</td></tr>`).join('');
  return `<div class="doc-section">
    <h2>에이브릴팜 제품표준서 — ${b.제품명}</h2>
    <div class="doc-meta">문서번호: EF-PS · 제정일자: ${b.date||''} · 개정번호: Rev.00 · ■관리본</div>
    <table>
      <tr><th>제품명</th><td>${b.제품명}</td><th>내용량</th><td>90g (건조기준)</td></tr>
      <tr><th>바코드</th><td>${b.바코드||''}</td><th>제조방법</th><td>${b.제조방법||'CP법'}</td></tr>
      <tr><th>사용기한</th><td>제조일로부터 2년</td><th>보관방법</th><td>직사광선 피해 서늘하고 건조한 곳</td></tr>
    </table>
    <h3>▶ 원료 배합표</h3>
    <table><thead><tr><th>No</th><th>원료명</th><th>INCI</th><th>이론량</th><th>비율</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <h3>▶ 전성분</h3>
    <p style="font-size:9.5px;line-height:1.7">${b.전성분||''}</p>
    ${b.알레르기?`<p style="font-size:9px;color:#555;margin-top:6px">※ 알레르기 유발성분: ${b.알레르기}</p>`:''}
    <h3>▶ 품질기준</h3>
    <table><thead><tr><th>검사항목</th><th>기준</th><th>시험방법</th><th>시험기관</th></tr></thead>
    <tbody>
      <tr><td>내용량(건조)</td><td>97% 이상</td><td>화장품 안전기준 등에 관한 규정</td><td>KCL (위탁)</td></tr>
      <tr><td>유리알칼리</td><td>0.1% 이하</td><td>화장품 안전기준 등에 관한 규정</td><td>KCL (위탁)</td></tr>
      <tr><td>성상/색상</td><td>고형, 이물 없음</td><td>육안검사</td><td>자사</td></tr>
      <tr><td>중량(건조)</td><td>${b.목표중량||'90g ±5g'}</td><td>저울 계량</td><td>자사</td></tr>
    </tbody></table>
    <table style="margin-top:8px"><tr><th>총괄책임자</th><td>변민정 (인)</td><th>작성일</th><td>${b.date||''}</td></tr></table>
  </div><hr class="doc-separator">`;
}

function buildMMS(b){
  const rows = (b.레시피||[]).map(r=>`<tr>
    <td></td><td>${r.원료}</td><td></td><td></td>
    <td>■양호□불량</td><td>■수취□미수취</td>
    <td>■이상없음□이상있음</td><td>■없음□있음</td><td>■이상없음□이상있음</td>
    <td>■적합□부적합</td><td>변민정</td></tr>`).join('');
  return `<div class="doc-section">
    <h2>에이브릴팜 원료입고기록서 (R-MMS-01)</h2>
    <div class="doc-meta">제정일자: 2026.05.27 · 개정번호: Rev.00 · 작성자: 변민정 · ■관리본</div>
    <table style="min-width:600px"><thead><tr>
      <th>입고일</th><th>원료명</th><th>제조처/로트</th><th>수량</th>
      <th>포장상태</th><th>CoA수취</th><th>성상</th><th>이물</th><th>색상</th><th>판정</th><th>확인자</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </div><hr class="doc-separator">`;
}

function buildQCM(b){
  return `<div class="doc-section">
    <h2>에이브릴팜 완제품 출하검사 기록 (R-QCM-01)</h2>
    <div class="doc-meta">제정일자: 2026.05.27 · 개정번호: Rev.00 · 작성자: 변민정 · ■관리본</div>
    <table><thead><tr>
      <th>검사일</th><th>제품명/제조번호</th><th>KCL성적서</th><th>성상</th><th>색상</th><th>이물</th><th>중량(g)</th><th>표시사항</th><th>종합판정</th><th>확인자</th>
    </tr></thead><tbody>
    <tr>
      <td>${new Date().toLocaleDateString('ko-KR')}</td>
      <td>${b.제품명} / ${b.제조번호||''}</td>
      <td>■확인 □미확인</td>
      <td>■이상없음 □이상있음</td>
      <td>■이상없음 □이상있음</td>
      <td>■없음 □있음</td>
      <td>${b.실측중량||''}g</td>
      <td>■확인 □미확인</td>
      <td>■적합 □부적합</td>
      <td>변민정</td>
    </tr>
    </tbody></table>
    <p style="font-size:8.5px;color:#666;margin-top:4px">※ KCL 성적서: ${b.KCL||''} (${b.KCL발행일||''})</p>
  </div><hr class="doc-separator">`;
}

function buildMH(hygs=[], b=null, year=null, month=null){
  const now = new Date();
  const y = year||now.getFullYear(), m = month||(now.getMonth()+1);
  const ym = `${y}-${String(m).padStart(2,'0')}`;
  const recs = hygs.filter(h=>!h.date||h.date.startsWith(ym));

  const cleanRows = recs.filter(h=>h.type==='청소점검').map(h=>{
    const it = h.items||{};
    return `<tr>
      <td>${h.date}</td>
      <td>${it['원료보관']||''}</td><td>${it['부자재']||''}</td><td>${it['완제품']||''}</td>
      <td>${it['작업대']||''}</td><td>${it['도구류']||''}</td><td>${it['포장실']||''}</td>
      <td>${h.확인자||'변민정'}</td></tr>`;
  }).join('');

  const pestRows = recs.filter(h=>h.type==='방충방서').map(h=>`<tr>
    <td>${h.date}</td><td>${h.방충망||'양호'}</td><td>${h.해충||'없음'}</td>
    <td>${h.설치류||'없음'}</td><td>${h.조치||''}</td><td>${h.확인자||'변민정'}</td></tr>`).join('');

  return `<div class="doc-section">
    <h2>에이브릴팜 위생관리 기록 (R-MH)</h2>
    <div class="doc-meta">출력 기간: ${y}년 ${m}월 · 문서번호: EF-HMS-001 · 출력일: ${now.toLocaleDateString('ko-KR')}</div>
    <h3>▶ R-MH-01 작업장 청소점검표</h3>
    ${cleanRows?`<table><thead><tr><th>날짜</th><th>원료보관</th><th>부자재</th><th>완제품</th><th>작업대</th><th>도구류</th><th>포장실</th><th>확인자</th></tr></thead>
    <tbody>${cleanRows}</tbody></table>`:'<p style="color:#888;font-size:9px">해당 월 청소점검 기록 없음</p>'}
    <h3>▶ R-MH-02 방충·방서 점검표</h3>
    ${pestRows?`<table><thead><tr><th>날짜</th><th>방충망</th><th>해충</th><th>설치류</th><th>조치</th><th>확인자</th></tr></thead>
    <tbody>${pestRows}</tbody></table>`:'<p style="color:#888;font-size:9px">해당 월 방충방서 기록 없음</p>'}
  </div>`;
}

/* ============================================================
   6. 바코드 탭
   ============================================================ */
async function renderBarcode(){
  const batches = await DB.getAll('batches');
  const batchOpts = batches.map(b=>`<option value="${b.id}" data-bc="${b.바코드||''}">${b.제품명}</option>`).join('');

  setContent(`
    <div class="card full-width">
      <div class="card-title mb12">🔢 바코드 생성</div>
      <div class="alert-banner info full-width mb12">
        <i class="ti ti-info-circle"></i>
        <div style="font-size:12px">
          <strong>바코드 부여 안내</strong><br>
          이 바코드는 <strong>개인(자체) 바코드</strong>로, 표준유통바코드(GS1)와 다릅니다.
          GS1 공식 바코드는 <strong>대한상공회의소 유통물류진흥원</strong>에서 별도 신청이 필요합니다.
          자체 바코드는 내부 관리·재고 추적 용도로 활용하세요.
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">제품 선택</label>
        <select class="form-input" id="bc-product" onchange="loadProductBarcode()">
          <option value="">-- 제품을 선택하세요 --</option>
          ${batchOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">바코드 번호 (직접 입력 가능)</label>
        <input class="form-input" id="bc-number" placeholder="숫자 12~13자리" oninput="generateBarcode()">
        <div class="form-hint">12자리 입력 시 체크디짓 자동 계산 · 13자리 입력 시 그대로 사용</div>
      </div>
      <div class="form-group">
        <label class="form-label">시리즈 코드 <span style="color:var(--green);font-size:11px">직접 입력 가능</span></label>
        <input class="form-input" id="bc-series" placeholder="예: -001, -A, -2024 (선택)" oninput="generateBarcode()">
        <div class="form-hint">바코드 하단에 표기될 시리즈 코드 (선택사항)</div>
      </div>
      <div id="bc-preview" class="barcode-wrap mt12" style="display:none">
        <svg id="bc-svg"></svg>
        <div class="barcode-number" id="bc-display"></div>
      </div>
      <div class="flex gap8 mt12">
        <button class="btn btn-secondary" style="flex:1" onclick="generateBarcode()"><i class="ti ti-refresh"></i> 미리보기</button>
        <button class="btn btn-primary" style="flex:1" onclick="printBarcode()"><i class="ti ti-printer"></i> 출력</button>
      </div>
    </div>

    <div class="card full-width mt12">
      <div class="card-title mb12">등록 바코드 목록</div>
      ${batches.filter(b=>b.바코드).map(b=>`
        <div class="list-item" onclick="document.getElementById('bc-product').value='${b.id}';loadProductBarcode()">
          <div class="list-item-body">
            <div class="list-item-title">${b.제품명}</div>
            <div class="list-item-sub">${b.바코드}</div>
          </div>
          <i class="ti ti-barcode" style="color:var(--text3);font-size:20px"></i>
        </div>`).join('')}
    </div>
    <div style="height:16px"></div>
  `);
}

function loadProductBarcode(){
  const sel = document.getElementById('bc-product');
  const opt = sel.options[sel.selectedIndex];
  const bc = opt?.dataset?.bc || '';
  document.getElementById('bc-number').value = bc;
  if(bc) generateBarcode();
}

function generateBarcode(){
  const raw = document.getElementById('bc-number').value.replace(/\D/g,'');
  const series = document.getElementById('bc-series').value.trim();
  if(raw.length < 12){ document.getElementById('bc-preview').style.display='none'; return; }

  let code = raw;
  if(raw.length===12){
    const check = DB.calcCheckDigit(raw);
    code = raw + check;
  }

  document.getElementById('bc-preview').style.display = 'block';
  try{
    JsBarcode('#bc-svg', code, {format:'EAN13',width:2,height:70,displayValue:true,margin:8,fontSize:14});
    document.getElementById('bc-display').textContent = code + (series?' '+series:'');
  } catch(e){
    document.getElementById('bc-preview').innerHTML = `<p style="color:var(--red)">유효하지 않은 바코드 번호입니다</p>`;
  }
}

function printBarcode(){
  const svg = document.querySelector('#bc-svg');
  if(!svg || !svg.innerHTML){ alert('바코드를 먼저 생성하세요.'); return; }
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:sans-serif;text-align:center;padding:20px}
    svg{max-width:300px} @media print{button{display:none}}</style></head><body>
    ${svg.outerHTML}
    <p style="font-size:12px;margin-top:8px">${document.getElementById('bc-display').textContent}</p>
    <p style="font-size:10px;color:#888">에이브릴팜 자체 바코드 · 내부 관리용</p>
    </body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),400);
}

/* ============================================================
   7. 설정·알림 탭
   ============================================================ */
async function renderSettings(){
  setContent(`
    <div class="card full-width">
      <div class="card-title mb4">🔔 알림 설정</div>
      <div class="setting-row">
        <div><div class="setting-label">위생점검 미작성 알림</div><div class="setting-desc">주 1회 청소점검 미작성 시 배지 표시</div></div>
        <label class="switch"><input type="checkbox" id="notif-hygiene" checked onchange="saveNotifSettings()"><span class="switch-slider"></span></label>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">재고 부족 알림</div><div class="setting-desc">최소 재고 이하 시 경고 배너 표시</div></div>
        <label class="switch"><input type="checkbox" id="notif-stock" checked onchange="saveNotifSettings()"><span class="switch-slider"></span></label>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">방충방서 월간 알림</div><div class="setting-desc">이달 방충방서 미작성 시 배지 표시</div></div>
        <label class="switch"><input type="checkbox" id="notif-pest" checked onchange="saveNotifSettings()"><span class="switch-slider"></span></label>
      </div>
    </div>

    <div class="card full-width">
      <div class="card-title mb12">💾 데이터 관리</div>
      <div class="setting-row">
        <div><div class="setting-label">데이터 백업</div><div class="setting-desc">모든 데이터를 JSON 파일로 다운로드</div></div>
        <button class="btn btn-secondary btn-sm" onclick="backupData()"><i class="ti ti-download"></i> 백업</button>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">데이터 복원</div><div class="setting-desc">백업 JSON 파일에서 복원</div></div>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('restore-file').click()">
          <i class="ti ti-upload"></i> 복원
        </button>
        <input type="file" id="restore-file" accept=".json" style="display:none" onchange="restoreData(this)">
      </div>
      <div class="setting-row">
        <div><div class="setting-label">데이터 초기화</div><div class="setting-desc" style="color:var(--red)">⚠️ 모든 데이터가 삭제됩니다</div></div>
        <button class="btn btn-danger btn-sm" onclick="resetData()"><i class="ti ti-trash"></i> 초기화</button>
      </div>
    </div>

    <div class="card full-width">
      <div class="card-title mb8">ℹ️ 앱 정보</div>
      <div class="setting-row">
        <div><div class="setting-label">에이브릴팜 공방관리</div><div class="setting-desc">v3.0 · EF-MMS-001 / EF-HMS-001 / EF-QCM-001</div></div>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">화장품제조업</div><div class="setting-desc">등록번호 제6494호 · 경기도 시흥시 진말1로 18, 에스엠타워 303호</div></div>
      </div>
      <div class="setting-row">
        <div><div class="setting-label">책임판매업</div><div class="setting-desc">등록번호 제18216호</div></div>
      </div>
    </div>
    <div style="height:16px"></div>
  `);
  loadNotifSettings();
}

function saveNotifSettings(){
  const s = {
    hygiene: document.getElementById('notif-hygiene').checked,
    stock: document.getElementById('notif-stock').checked,
    pest: document.getElementById('notif-pest').checked,
  };
  localStorage.setItem('notif', JSON.stringify(s));
}

function loadNotifSettings(){
  try{
    const s = JSON.parse(localStorage.getItem('notif')||'{}');
    if(s.hygiene!==undefined) document.getElementById('notif-hygiene').checked = s.hygiene;
    if(s.stock!==undefined)   document.getElementById('notif-stock').checked   = s.stock;
    if(s.pest!==undefined)    document.getElementById('notif-pest').checked    = s.pest;
  } catch(e){}
}

async function backupData(){
  const json = await DB.exportAll();
  const blob = new Blob([json], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `avril-farm-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function restoreData(input){
  const file = input.files[0];
  if(!file) return;
  if(!confirm('기존 데이터를 모두 삭제하고 복원하시겠습니까?')) return;
  const text = await file.text();
  try{
    await DB.importAll(text);
    alert('복원 완료! 앱을 새로고침합니다.');
    location.reload();
  } catch(e){
    alert('복원 실패: 올바른 백업 파일인지 확인하세요.\n'+e.message);
  }
}

async function resetData(){
  if(!confirm('⚠️ 정말 모든 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
  if(!confirm('한 번 더 확인합니다. 모든 데이터가 삭제됩니다. 계속하시겠습니까?')) return;
  await DB.clearAll();
  alert('초기화 완료! 앱을 새로고침합니다.');
  location.reload();
}

/* ============================================================
   제조 점검 탭 (mfcheck) — 이전 버전 복원
   ============================================================ */
async function renderMfCheck(){
  const batches = await DB.getAll('batches');

  const checks = [
    { id:'c1', label:'원료 계량 완료 (±1% 이내)', group:'작업 전 필수' },
    { id:'c2', label:'소다수 제조 완료 (장갑·고글·마스크 착용)', group:'작업 전 필수' },
    { id:'c3', label:'오일류 온도 확인 (27~30°C)', group:'작업 전 필수' },
    { id:'c4', label:'작업대·도구 에탄올 소독 완료', group:'작업 전 필수' },
    { id:'c5', label:'스틱블렌더 작동 이상 없음', group:'설비 확인' },
    { id:'c6', label:'전자저울 영점 확인', group:'설비 확인' },
    { id:'c7', label:'온도계 정상 작동', group:'설비 확인' },
    { id:'c8', label:'트레이스 상태 정상 (분리·변색 없음)', group:'공정 확인' },
    { id:'c9', label:'첨가물 투입 완료', group:'공정 확인' },
    { id:'c10', label:'몰드 투입 완료 · 보온 시작', group:'공정 확인' },
    { id:'c11', label:'외관 검사 완료 (성상·색상·이물)', group:'완제품 출하 전' },
    { id:'c12', label:'중량 확인 완료', group:'완제품 출하 전' },
    { id:'c13', label:'표시사항 확인 완료 (전성분·사용기한)', group:'완제품 출하 전' },
    { id:'c14', label:'출하기록 작성 완료', group:'완제품 출하 전' },
  ];

  const groups = [...new Set(checks.map(c=>c.group))];

  const groupHtml = groups.map(g=>{
    const items = checks.filter(c=>c.group===g);
    return `<div class="card full-width" style="margin-bottom:10px">
      <div class="card-title mb12" style="color:var(--mauve)">${g}</div>
      ${items.map(c=>`
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <input type="checkbox" id="${c.id}" style="width:17px;height:17px;accent-color:var(--teal);flex-shrink:0">
          <label for="${c.id}" style="font-size:13px;cursor:pointer;flex:1">${c.label}</label>
        </div>`).join('')}
    </div>`;
  }).join('');

  const batchOpts = batches.map(b=>`<option value="${b.id}">${b.제품명}</option>`).join('');

  setContent(`
    <div class="alert-banner info full-width">
      <i class="ti ti-clipboard-check"></i>
      <div>제조 전·중·후 필수 점검 항목입니다. 완료 시 체크하세요.</div>
    </div>
    <div class="card full-width">
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">관련 제품 (선택)</label>
        <select class="form-input" id="mfc-product">
          <option value="">-- 선택 --</option>
          ${batchOpts}
        </select>
      </div>
    </div>
    ${groupHtml}
    <div class="card full-width">
      <div class="form-group">
        <label class="form-label">이상 발생 내용</label>
        <textarea class="form-input" id="mfc-issue" rows="3" placeholder="이상 없음 또는 이상 내용 기재"></textarea>
      </div>
      <button class="btn btn-primary btn-block" onclick="saveMfCheck()">
        <i class="ti ti-device-floppy"></i> 점검 기록 저장
      </button>
    </div>
    <div style="height:16px"></div>
  `);
}

async function saveMfCheck(){
  const all = document.querySelectorAll('#page-content input[type=checkbox]');
  const checked = [...all].filter(cb=>cb.checked).map(cb=>cb.id);
  const total = all.length;
  const issue = document.getElementById('mfc-issue').value.trim();
  const productEl = document.getElementById('mfc-product');
  const productId = parseInt(productEl.value||'0');

  const data = {
    type: '제조점검',
    date: new Date().toISOString().slice(0,10),
    체크항목: checked,
    전체항목수: total,
    이상내용: issue||'이상 없음',
    productId,
    확인자: '변민정',
    status: issue && issue!=='이상 없음' ? '이슈있음' : '완료',
  };
  await DB.add('hygiene', data);
  alert(`제조 점검 기록이 저장되었습니다. (${checked.length}/${total} 항목 완료)`);
  renderMfCheck();
}
