'use strict';

/* ════ 상태 ════ */
let currentTab  = 'intro';
let stockSubTab = '원료';
let selectedDate = null;
const today = new Date();
let calYear = today.getFullYear(), calMonth = today.getMonth();

/* ════ 초기화 ════ */
async function init() {
  try { await DB.seedIfEmpty(); } catch(e) { console.warn(e); }
  setupTabs();
  showIntro();
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
  document.getElementById('topbar-logo').addEventListener('click', showIntro);
}

function showIntro() {
  document.getElementById('intro-screen').classList.remove('hide');
  document.getElementById('page-content').style.display = 'none';
}
function startApp() {
  document.getElementById('intro-screen').classList.add('hide');
  document.getElementById('page-content').style.display = '';
  if (currentTab === 'intro') {
    currentTab = 'hygiene';
    document.querySelectorAll('.tab-btn').forEach(b => {
      if (b.dataset.tab === 'hygiene') b.classList.add('active');
      else b.classList.remove('active');
    });
  }
  renderTab(currentTab);
  try { checkNotifications(); } catch(e) {}
}

async function renderTab(tab) {
  const el = document.getElementById('page-content');
  if (!el) return;
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3)"><i class="ti ti-loader" style="font-size:28px"></i></div>';
  try {
    if      (tab==='stock')       await renderStock(el);
    else if (tab==='manufacture') await renderManufacture(el);
    else if (tab==='mfcheck')     await renderMfCheck(el);
    else if (tab==='hygiene')     await renderHygiene(el);
    else if (tab==='production')  await renderProduction(el);
    else if (tab==='output')      await renderOutput(el);
    else if (tab==='notify')      renderNotifySettings(el);
    else if (tab==='barcode')     await renderBarcode(el);
  } catch(e) {
    el.innerHTML = `<div style="padding:24px;color:var(--red-text)">오류: ${e.message}</div>`;
    console.error(e);
  }
  try { await updateBadges(); } catch(e) {}
}

async function updateBadges() {
  const ing = await DB.getAll('ingredients');
  const pending = ing.filter(i=>i.판정==='미기입').length;
  const hb = document.getElementById('badge-hygiene');
  if (hb) { hb.textContent=pending>0?pending:''; hb.style.display=pending>0?'inline':'none'; }
}

/* ════ 재료·재고 ════ */
async function renderStock(el) {
  const all = await DB.getAll('ingredients');
  const ingList = all.filter(i=>i.stockType!=='포장재');
  const pkgList = all.filter(i=>i.stockType==='포장재');
  const list = stockSubTab==='원료'?ingList:pkgList;
  const cats = [...new Set(list.map(i=>i.category))];
  const ok = list.filter(i=>i.판정==='적합').length;
  const pending = list.filter(i=>i.판정==='미기입').length;

  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">재료·포장재 재고</h2></div>
    <div class="subtab-row">
      <button class="subtab ${stockSubTab==='원료'?'on':''}" onclick="switchStockTab('원료')">원료 <span class="subtab-cnt">${ingList.length}</span></button>
      <button class="subtab ${stockSubTab==='포장재'?'on':''}" onclick="switchStockTab('포장재')">포장재 <span class="subtab-cnt">${pkgList.length}</span></button>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">전체 ${list.length}종</div>
      <div class="sum-chip sum-green">적합 ${ok}종</div>
      ${pending>0?`<div class="sum-chip sum-orange">미기입 ${pending}종</div>`:''}
    </div>
    ${list.length===0?`<div class="empty-hint">등록된 ${stockSubTab}이 없습니다</div>`
    :cats.map(cat=>`
      <div class="group-header">${cat}</div>
      ${list.filter(i=>i.category===cat).map(i=>`
        <div class="list-item" onclick="openIngForm(${i.id})">
          <div class="item-left">
            <div class="item-title">${i.원료명}</div>
            <div class="item-sub">${i.제조처||''}${i.수량?' · '+i.수량:''}${i.입고일?' · '+i.입고일:''}</div>
          </div>
          <div class="item-right">
            <span class="badge ${badgeClass(i.판정)}">${i.판정}</span>
            <span class="badge ${i.CoA==='수취'?'badge-green':'badge-orange'}">CoA ${i.CoA}</span>
          </div>
        </div>`).join('')}
    `).join('')}
    <button class="fab" onclick="openIngForm(null,'${stockSubTab}')"><i class="ti ti-plus"></i></button>`;
}
function switchStockTab(t){stockSubTab=t;renderTab('stock');}

/* ════ 제품 제조 ════ */
async function renderManufacture(el) {
  const list = await DB.getAll('batches');
  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">제품 제조</h2></div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">배치 ${list.length}건</div>
      <div class="sum-chip sum-green">KCL 완료 ${list.filter(b=>b.KCL).length}건</div>
    </div>
    ${list.length===0?`<div class="empty-hint">등록된 배치가 없습니다<br><small>아래 + 버튼으로 추가하세요</small></div>`:''}
    ${list.map(b=>`
      <div class="card-block">
        <div class="card-top" onclick="toggleCard(this)">
          <div class="card-left">
            <div class="card-title">${b.제품명||''}</div>
            <div class="card-sub">${b.문서번호||''} · ${b.제조번호||''}</div>
            <div class="card-sub">${b.date||''} · ${b.제조방법||''}</div>
          </div>
          <div class="card-right">
            <span class="badge ${badgeClass(b.상태)}">${b.상태||''}</span>
            <button class="icon-btn mt8" onclick="event.stopPropagation();openBatchForm(${b.id})" title="수정/삭제">
              <i class="ti ti-edit"></i>
            </button>
          </div>
        </div>
        <div class="card-detail hide">
          ${drow('투입량',b.투입량+'g')}
          ${drow('이론/실제 수량',(b.이론수량||'-')+'ea / '+(b.실제수량||'-')+'ea')}
          ${drow('목표 중량',b.목표중량||'90g ±5g')}
          ${drow('실측 중량',b.실측중량?b.실측중량+'g':'-')}
          ${drow('바코드',b.바코드||'-')}
          ${b.바코드?`<div style="padding:8px 0;text-align:center"><svg id="bc-${b.id}"></svg></div>`:''}
          ${drow('KCL 성적서',b.KCL||'미등록')}
          ${drow('내용량',b.내용량?b.내용량+'% (기준 97% 이상)':'-')}
          ${drow('유리알칼리',b.유리알칼리?b.유리알칼리+' (기준 0.1% 이하)':'-')}
          ${drow('알레르기 유발성분',b.알레르기||'-')}
          ${drow('이상 여부',b.이상||'-')}
          ${b.레시피&&b.레시피.length?`
            <div style="font-size:11px;font-weight:700;color:var(--teal-dark);padding:8px 0 4px">원료 배합표</div>
            <div style="overflow-x:auto"><table class="recipe-table">
              <thead><tr><th>No</th><th>원료명</th><th>INCI명칭</th><th>이론량(g)</th><th>비율(%)</th></tr></thead>
              <tbody>
                ${b.레시피.map((r,i)=>`<tr><td>${i+1}</td><td>${r.원료명||''}</td><td style="font-size:10px;color:var(--text3)">${r.INCI||''}</td><td>${r.이론량||''}</td><td>${r.비율||''}</td></tr>`).join('')}
                <tr><td colspan="3">합계</td><td>${b.투입량||''}</td><td>100</td></tr>
              </tbody>
            </table></div>`:''}
          ${b.비고?drow('비고',b.비고):''}
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openBatchForm()"><i class="ti ti-plus"></i></button>`;

  // 바코드 렌더링
  setTimeout(()=>{
    list.filter(b=>b.바코드).forEach(b=>{
      const el2=document.getElementById('bc-'+b.id);
      if(el2&&window.JsBarcode){
        try{JsBarcode('#bc-'+b.id,b.바코드,{format:'CODE128',width:1.5,height:40,displayValue:true,fontSize:10});}catch(e){}
      }
    });
  },100);
}

/* ════ 제조 점검 ════ */
async function renderMfCheck(el){
  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">제조 점검</h2></div>
    <div class="info-banner"><i class="ti ti-info-circle"></i><span>CP법 제조 전 체크리스트 · EF-MMS-001</span></div>
    <div class="group-header">CP법 작업 전 필수</div>
    ${['내화학성 장갑 착용','고글 착용','마스크 착용','작업대 에탄올 소독','전자저울 영점 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)"><div class="check-circle"></div><span class="check-label">${item}</span></div>`).join('')}
    <div class="group-header mt16">온도·습도 관리</div>
    ${['온도·습도 기록','혼합 온도 27~30°C 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)"><div class="check-circle"></div><span class="check-label">${item}</span></div>`).join('')}
    <div class="group-header mt16">완제품 출하 전</div>
    ${['외관·성상 육안검사','목표 중량 확인','표시사항(전성분·사용기한) 확인','KCL 성적서 확인'].map(item=>`
      <div class="check-item" onclick="toggleCheck(this)"><div class="check-circle"></div><span class="check-label">${item}</span></div>`).join('')}
    <button class="save-btn mt20" onclick="saveChecklist()">점검 완료 저장</button>`;
}

/* ════ 위생 점검 ════ */
async function renderHygiene(el){
  const hyg = await DB.getAll('hygiene');
  const ym=`${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const monthRecs=hyg.filter(h=>h.date&&h.date.startsWith(ym));
  const datesIssue=new Set(hyg.filter(h=>h.status==='문제임박'&&h.date&&h.date.startsWith(ym)).map(h=>h.date));
  const datesRecord=new Set(monthRecs.map(h=>h.date));
  const displayRecs=selectedDate&&selectedDate.startsWith(ym)?monthRecs.filter(r=>r.date===selectedDate):monthRecs;

  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">위생 점검 기록</h2></div>
    <div class="warn-banner" onclick="openHygieneForm()" style="cursor:pointer">
      <i class="ti ti-plus-circle"></i>
      <div><div class="warn-title">점검 기록 추가</div><div class="warn-sub">탭해서 오늘 점검 내용을 기록하세요</div></div>
      <i class="ti ti-chevron-right ml-auto"></i>
    </div>
    <div class="cal-nav">
      <button class="cal-arrow" onclick="changeMonth(-1)"><i class="ti ti-chevron-left"></i></button>
      <span class="cal-title">${calYear}년 ${calMonth+1}월</span>
      <button class="cal-arrow" onclick="changeMonth(1)"><i class="ti ti-chevron-right"></i></button>
    </div>
    <div class="calendar">${buildCalendar(calYear,calMonth,datesRecord,datesIssue)}</div>
    <div class="records-section">
      <div class="records-month">
        <span>${selectedDate&&selectedDate.startsWith(ym)?selectedDate+' 기록':calYear+'년 '+(calMonth+1)+'월'}</span>
        ${selectedDate&&selectedDate.startsWith(ym)?`
          <span style="display:flex;gap:6px">
            <button class="btn-sm" onclick="clearDateFilter()">전체보기</button>
            <button class="btn-sm solid" onclick="openHygieneForm('${selectedDate}')">+ 기록추가</button>
          </span>`:''
        }
      </div>
      ${displayRecs.length>0?displayRecs.map(r=>recordItem(r)).join(''):`<div class="empty-hint">${selectedDate&&selectedDate.startsWith(ym)?'이 날 기록이 없습니다':'이번 달 기록이 없습니다'}</div>`}
    </div>
    <button class="fab" onclick="openHygieneForm()"><i class="ti ti-plus"></i></button>`;
}

function buildCalendar(year,month,hasRecord,hasIssue){
  const firstDay=new Date(year,month,1).getDay();
  const days=new Date(year,month+1,0).getDate();
  let html=`<div class="cal-grid">`;
  ['월','화','수','목','금','토','일'].forEach(d=>html+=`<div class="cal-dow">${d}</div>`);
  const offset=(firstDay+6)%7;
  for(let i=0;i<offset;i++)html+=`<div class="cal-day empty"></div>`;
  for(let d=1;d<=days;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===today.toISOString().split('T')[0];
    const isSel=ds===selectedDate;
    html+=`<div class="cal-day${isToday?' today':''}${isSel?' selected':''}" onclick="selectDate('${ds}')">
      <span class="cal-num">${d}</span>
      ${hasIssue.has(ds)?'<span class="cal-dot dot-red"></span>':hasRecord.has(ds)?'<span class="cal-dot dot-green"></span>':''}
    </div>`;
  }
  return html+'</div>';
}

function recordItem(r){
  const lbl={'청소점검':'청소 점검','온도·습도':'온도·습도','제조위생':'제조 위생','방충방서':'방충·방서'}[r.type]||r.type;
  const title=r.type==='온도·습도'?`온도 ${r.온도}°C / 습도 ${r.습도}%`:lbl;
  return `<div class="record-row" onclick="openHygieneEditForm(${r.id})">
    <div class="record-left">
      <div class="record-title">${title}</div>
      <div class="record-sub">${r.date||''} ${r.이슈?'· ⚠️ '+r.이슈:''}</div>
    </div>
    <div class="record-right">
      <div class="record-type-label">${lbl}</div>
      <span class="badge ${r.status==='완료'?'badge-green':r.status==='문제임박'?'badge-orange':'badge-gray'}">${r.status||''}</span>
    </div>
  </div>`;
}

function selectDate(ds){selectedDate=selectedDate===ds?null:ds;renderTab('hygiene');}
function clearDateFilter(){selectedDate=null;renderTab('hygiene');}

/* ════ 생산실적 ════ */
async function renderProduction(el){
  const [prods, batches] = await Promise.all([DB.getAll('production'),DB.getAll('batches')]);
  const totalQty = prods.reduce((s,p)=>s+(+p.수량||0),0);

  // 크로스체크: 생산실적 vs 배치 실제수량
  const batchMap = {};
  batches.forEach(b=>{batchMap[b.제품명]=(batchMap[b.제품명]||0)+(+b.실제수량||0);});
  const prodMap = {};
  prods.forEach(p=>{prodMap[p.제품명]=(prodMap[p.제품명]||0)+(+p.수량||0);});
  const allProds = [...new Set([...Object.keys(batchMap),...Object.keys(prodMap)])];

  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">생산실적</h2></div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">기록 ${prods.length}건</div>
      <div class="sum-chip sum-green">총 생산 ${totalQty}개</div>
    </div>

    <div class="section-label">크로스체크 — 생산실적 vs 배치 출하</div>
    <div style="overflow-x:auto;padding:0 16px 12px">
      <table class="recipe-table" style="min-width:320px">
        <thead><tr><th>제품명</th><th>배치 출하</th><th>생산실적</th><th>차이</th></tr></thead>
        <tbody>
          ${allProds.length===0?`<tr><td colspan="4" style="text-align:center;color:var(--text3)">데이터 없음</td></tr>`:
          allProds.map(name=>{
            const bc=batchMap[name]||0, pc=prodMap[name]||0, diff=pc-bc;
            return `<tr>
              <td>${name}</td>
              <td style="text-align:right">${bc}개</td>
              <td style="text-align:right">${pc}개</td>
              <td style="text-align:right;font-weight:700;color:${diff===0?'var(--teal-dark)':diff>0?'var(--amber)':'var(--red)'}">${diff>0?'+':''}${diff}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="section-label">생산실적 기록</div>
    ${prods.length===0?`<div class="empty-hint">아직 생산실적이 없습니다</div>`:''}
    ${prods.map(p=>`
      <div class="list-item" onclick="openProductionForm(${p.id})">
        <div class="item-left">
          <div class="item-title">${p.제품명||''}</div>
          <div class="item-sub">${p.date||''} · ${p.수량||''}개 · ${p.채널||''}</div>
        </div>
        <div class="item-right">
          <span class="badge ${p.유형==='출하'?'badge-green':p.유형==='생산'?'badge-mauve':'badge-gray'}">${p.유형||''}</span>
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openProductionForm()"><i class="ti ti-plus"></i></button>`;
}

/* ════ 문서 출력 ════ */
async function renderOutput(el){
  const now=new Date();
  const y=now.getFullYear(),m=now.getMonth()+1;
  const [hyg,batches]=await Promise.all([DB.getAll('hygiene'),DB.getAll('batches')]);
  const allDates=[...hyg.map(h=>h.date),...batches.map(b=>b.date)].filter(Boolean).sort();
  const earliest=allDates[0]||`${y}-01`;
  const ey=+earliest.slice(0,4),em=+earliest.slice(5,7);

  const periodDocs=[
    {key:'cover',icon:'ti-id-badge',      name:'정기감시 제출용 표지', sub:'업체·기간 자동 기재'},
    {key:'mh',  icon:'ti-clipboard-check',name:'위생점검기록서',       sub:'R-MH-01 청소 · R-MH-02 방충방서'},
    {key:'mms', icon:'ti-package',         name:'원료입고기록서',        sub:'R-MMS-01 · 전체 원료'},
    {key:'qcm', icon:'ti-check',           name:'완제품출하검사기록서', sub:'R-QCM-01/02 · 보관검체 포함'},
    {key:'std', icon:'ti-book-2',          name:'4대 기준서',           sub:'EF-MMS-001 · EF-HMS-001 · EF-QCM-001'},
  ];
  const batchDocs=[
    {key:'mi',icon:'ti-file-description',name:'제조지시서',  sub:'EF-MI · 원료배합표 포함'},
    {key:'tr',icon:'ti-microscope',      name:'시험성적서',   sub:'EF-TR · KCL + 자사 육안검사'},
    {key:'ps',icon:'ti-book',            name:'제품표준서',   sub:'EF-PS · 전성분 포함'},
  ];

  el.innerHTML=`
    <div class="page-header"><h2 class="page-title">문서 출력</h2></div>

    <div class="section-label">출력 기간 설정</div>
    <div class="output-range-card">
      <div class="range-row">
        <span class="range-label">시작</span>
        <div class="range-inputs">
          <input type="number" id="s-year" value="${ey}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="s-month" value="${em}" min="1" max="12" style="width:46px">월
        </div>
      </div>
      <div class="range-divider">~</div>
      <div class="range-row">
        <span class="range-label">종료</span>
        <div class="range-inputs">
          <input type="number" id="e-year" value="${y}" min="2024" max="${y+1}" style="width:68px">년
          <input type="number" id="e-month" value="${m}" min="1" max="12" style="width:46px">월
        </div>
      </div>
    </div>

    <div class="section-label mt16">📋 기간별 문서</div>
    <div style="display:flex;gap:6px;padding:0 16px 8px">
      <button class="btn-sm" onclick="toggleSection('period',true)">전체 선택</button>
      <button class="btn-sm" onclick="toggleSection('period',false)">전체 해제</button>
    </div>
    <div class="doc-select-list">
      ${periodDocs.map(d=>`
        <label class="doc-check-row">
          <input type="checkbox" id="chk-${d.key}" class="period-chk" ${d.key!=='std'?'checked':''}>
          <div class="doc-check-info">
            <div class="doc-check-name"><i class="ti ${d.icon}" style="color:var(--teal)"></i> ${d.name}</div>
            <div class="doc-check-sub">${d.sub}</div>
          </div>
        </label>`).join('')}
    </div>

    <div class="section-label mt16">📦 품목별 문서 종류</div>
    <div style="display:flex;gap:6px;padding:0 16px 8px">
      <button class="btn-sm" onclick="toggleSection('doctype',true)">전체 선택</button>
      <button class="btn-sm" onclick="toggleSection('doctype',false)">전체 해제</button>
    </div>
    <div class="doc-select-list">
      ${batchDocs.map(d=>`
        <label class="doc-check-row">
          <input type="checkbox" id="chk-${d.key}" class="doctype-chk" checked>
          <div class="doc-check-info">
            <div class="doc-check-name"><i class="ti ${d.icon}" style="color:var(--teal)"></i> ${d.name}</div>
            <div class="doc-check-sub">${d.sub}</div>
          </div>
        </label>`).join('')}
    </div>

    <div class="section-label mt16">출력할 제품 선택</div>
    <div style="display:flex;gap:6px;padding:0 16px 8px">
      <button class="btn-sm" onclick="toggleSection('batch',true)">전체 선택</button>
      <button class="btn-sm" onclick="toggleSection('batch',false)">전체 해제</button>
    </div>
    <div class="doc-select-list" style="margin-bottom:8px">
      ${batches.length===0?`<div class="empty-hint" style="padding:14px">등록된 제품이 없습니다</div>`
      :batches.map(b=>`
        <label class="doc-check-row">
          <input type="checkbox" class="batch-chk" data-id="${b.id}" checked>
          <div class="doc-check-info">
            <div class="doc-check-name">${b.제품명||''}</div>
            <div class="doc-check-sub">${b.문서번호||''} · ${b.date||''} · <span class="badge ${badgeClass(b.상태)}" style="font-size:10px">${b.상태||''}</span></div>
          </div>
        </label>`).join('')}
    </div>

    <button class="output-btn" onclick="generatePDF()">
      <i class="ti ti-printer"></i> 선택한 문서 PDF 생성
    </button>

    <div class="section-label mt20">📄 파일 업로드 자동 등록</div>
    <div style="padding:0 16px 8px;font-size:12px;color:var(--text3)">기존 양식 파일 업로드 시 내용을 파싱하여 자동 등록합니다 (docx · txt)</div>
    <div class="dropzone" onclick="document.getElementById('file-upload').click()"
         ondragover="event.preventDefault();this.style.borderColor='var(--teal-dark)'"
         ondragleave="this.style.borderColor=''"
         ondrop="handleFileDrop(event)" style="margin:0 16px">
      <div class="dropzone-icon">📄</div>
      <div class="dropzone-text">파일을 드래그하거나 탭해서 선택</div>
      <div class="dropzone-sub">제조지시서 · 제품표준서 · 위생점검 등</div>
    </div>
    <input type="file" id="file-upload" accept=".docx,.txt,.json" style="display:none" onchange="handleFileUpload(event)">
    <div id="upload-result" style="padding:8px 16px;font-size:12px"></div>

    <div class="section-label mt20">🗂 과거 이력 조회</div>
    <div id="history-section"></div>`;

  renderHistory(document.getElementById('history-section'),hyg,batches);
}

function toggleSection(cls, val) {
  const sel = cls==='period'?'.period-chk':cls==='doctype'?'.doctype-chk':'.batch-chk';
  document.querySelectorAll(sel).forEach(c=>c.checked=val);
}

/* 파일 업로드 파싱 */
function handleFileDrop(e){e.preventDefault();const f=e.dataTransfer.files[0];if(f)processUploadedFile(f);}
function handleFileUpload(e){const f=e.target.files[0];if(f)processUploadedFile(f);}

async function processUploadedFile(file) {
  const el = document.getElementById('upload-result');
  if(!el) return;
  el.innerHTML='<span style="color:var(--teal)">⏳ 파일 분석 중...</span>';
  const name = file.name.toLowerCase();

  try {
    // docx → JSZip으로 XML 추출
    if (name.endsWith('.docx') && window.JSZip) {
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const xmlFile = zip.file('word/document.xml');
      if (!xmlFile) throw new Error('document.xml 없음');
      const xml = await xmlFile.async('string');
      // XML 태그 제거해서 텍스트 추출
      const text = xml.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      await parseAndSaveDocument(name, text, file.name, el);
    } else if (name.endsWith('.txt')) {
      const text = await file.text();
      await parseAndSaveDocument(name, text, file.name, el);
    } else if (name.endsWith('.json')) {
      const text = await file.text();
      const data = JSON.parse(text);
      // 배치 데이터인지 확인
      if (data.제품명) {
        await DB.add('batches', data);
        el.innerHTML=`<span style="color:var(--teal-dark)">✅ <b>${data.제품명}</b> 배치 등록 완료</span>`;
      } else {
        el.innerHTML=`<span style="color:var(--text3)">JSON 형식이 맞지 않습니다. 배치 데이터(제품명 포함)만 지원합니다.</span>`;
      }
    } else {
      el.innerHTML=`<span style="color:var(--text3)">지원 형식: .docx · .txt · .json</span>`;
    }
  } catch(e) {
    el.innerHTML=`<span style="color:var(--red-text)">❌ 오류: ${e.message}</span>`;
  }
}

async function parseAndSaveDocument(name, text, fileName, el) {
  const batches = await DB.getAll('batches');

  // 제조지시서 / 제품표준서 감지
  if (name.includes('제조지시') || name.includes('ef-mi') || name.includes('제품표준') || name.includes('ef-ps') || name.includes('시험성적')) {
    // 제품명 추출 시도
    const productMatch = text.match(/에이브릴팜\s*([가-힣a-zA-Z\s]+비누)/);
    const productName = productMatch ? productMatch[0].trim() : '';
    const docnoMatch = text.match(/EF-[A-Z]{2}-\d{3}/);
    const docNo = docnoMatch ? docnoMatch[0] : '';
    const barcodeMatch = text.match(/87\d{10}/);
    const barcode = barcodeMatch ? barcodeMatch[0] : '';

    // 기존 배치 찾기
    const existing = batches.find(b => productName && b.제품명 && b.제품명.includes(productName.replace('에이브릴팜 ','').trim()));

    if (existing) {
      // 업데이트
      const updated = {...existing};
      if (docNo && name.includes('제조지시')) updated.문서번호 = docNo;
      if (docNo && name.includes('제품표준')) updated.비고 = docNo;
      if (barcode) updated.바코드 = barcode;
      await DB.put('batches', updated);
      el.innerHTML=`<span style="color:var(--teal-dark)">✅ <b>${existing.제품명}</b> 데이터 업데이트 완료 (${fileName})</span>`;
    } else {
      // 새 배치로 등록
      const newBatch = {제품명: productName||fileName.replace(/\.[^.]+$/,''), 문서번호:docNo, 바코드:barcode, 상태:'제조중'};
      await DB.add('batches', newBatch);
      el.innerHTML=`<span style="color:var(--teal-dark)">✅ <b>${newBatch.제품명}</b> 신규 배치 등록 완료 (${fileName})</span>`;
    }
    await renderTab('manufacture');
  } else if (name.includes('위생') || name.includes('mh')) {
    // 위생점검 데이터 파싱
    const dateMatch = text.match(/20\d{2}[.\-\/]\d{1,2}[.\-\/]\d{1,2}/g);
    if (dateMatch && dateMatch.length > 0) {
      const date = dateMatch[0].replace(/[.\-\/]/g,'-').replace(/(\d{4})-(\d{1})-/,'$1-0$2-').replace(/-(\d{1})$/,'-0$1');
      await DB.add('hygiene',{date,type:'청소점검',확인자:'변민정',status:'완료',items:{원료보관:'청결',부자재:'청결',완제품:'청결',작업대:'청결',도구류:'청결',포장실:'청결'}});
      el.innerHTML=`<span style="color:var(--teal-dark)">✅ 위생점검 기록 등록 완료 (${date})</span>`;
    } else {
      el.innerHTML=`<span style="color:var(--text3)">⚠️ 날짜를 찾을 수 없습니다. 위생점검 탭에서 직접 입력해주세요.</span>`;
    }
  } else if (name.includes('원료') || name.includes('mms')) {
    el.innerHTML=`<span style="color:var(--teal-dark)">✅ 원료입고 파일 감지. 재료·재고 탭에서 내용을 확인·수정해주세요.</span>`;
  } else {
    el.innerHTML=`<span style="color:var(--text3)">📄 <b>${fileName}</b> 업로드 완료. 파일 유형을 자동 감지하지 못했습니다. 해당 탭에서 직접 입력해주세요.</span>`;
  }
}

/* 과거 이력 */
function renderHistory(el, hyg, batches) {
  const months={};
  [...hyg,...batches].forEach(r=>{
    const d=r.date||(r.createdAt&&r.createdAt.slice(0,10));
    if(!d)return;
    const ym=d.slice(0,7);
    if(!months[ym])months[ym]={hyg:[],batch:[]};
    if(r.type)months[ym].hyg.push(r);else months[ym].batch.push(r);
  });
  const sorted=Object.keys(months).sort().reverse();
  if(!sorted.length){el.innerHTML='<div class="empty-hint">기록된 이력이 없습니다</div>';return;}
  el.innerHTML=sorted.map(ym=>`
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

function toggleHistory(row){
  const d=row.nextElementSibling;d.classList.toggle('hide');
  const ic=row.querySelector('.ti-chevron-down');
  if(ic)ic.style.transform=d.classList.contains('hide')?'':'rotate(180deg)';
}
async function printRangeMonth(ym){
  const[y,m]=ym.split('-').map(Number);
  const[hyg,ing,batches]=await Promise.all([DB.getAll('hygiene'),DB.getAll('ingredients'),DB.getAll('batches')]);
  const sep='<div class="page-break"></div>';
  openPrint(buildCover(y,m,y,m)+sep+buildMH(hyg,y,m)+sep+buildMMS(ing)+sep+buildQCM(batches));
}

/* ════ 원료 폼 ════ */
async function openIngForm(id,defaultType){
  const list=await DB.getAll('ingredients');
  const item=id?list.find(i=>i.id===id):{};
  const type=(item&&item.stockType)||defaultType||stockSubTab||'원료';
  const ingCats=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pkgCats=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const cats=type==='포장재'?pkgCats:ingCats;
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">${id?(type==='포장재'?'포장재 수정':'원료 수정'):(type==='포장재'?'포장재 추가':'원료 추가')}</div>
    <label>구분<select id="f0" onchange="updateIngCats(this.value)">
      <option ${type==='원료'?'selected':''}>원료</option>
      <option ${type==='포장재'?'selected':''}>포장재</option>
    </select></label>
    <label>원료명 / 포장재명<input id="f1" value="${(item&&item.원료명)||''}"></label>
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
    </div></div>`);
}
function updateIngCats(t){
  const ic=['베이스오일','버터·왁스','가성소다','정제수','첨가물·기능성','향료·색소','기타'];
  const pc=['단상자','선물박스','크라프트박스','라벨·스티커','수축필름','포장지','리본·끈','완충재','기타포장'];
  const s=document.getElementById('f4');
  if(s)s.innerHTML=(t==='포장재'?pc:ic).map(c=>`<option>${c}</option>`).join('');
}
async function saveIng(id){
  const type=v('f0');
  const data={원료명:v('f1'),제조처:v('f2'),수량:v('f3'),입고일:v('f8'),category:v('f4'),CoA:v('f5'),판정:v('f6'),비고:v('f7'),stockType:type};
  if(id)await DB.put('ingredients',{...data,id});else await DB.add('ingredients',data);
  stockSubTab=type;closeSheet();await renderTab('stock');
}

/* ════ 배치 폼 ════ */
async function openBatchForm(id){
  const list=await DB.getAll('batches');
  const item=id?list.find(b=>b.id===id):{};
  let nextMI='';
  if(!id){
    const nums=list.map(b=>b.문서번호).filter(Boolean).map(n=>parseInt(n.replace(/[^0-9]/g,'')||'0')).filter(n=>!isNaN(n));
    nextMI=`EF-MI-${String((nums.length?Math.max(...nums):5)+1).padStart(3,'0')}`;
  }
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">${id?'배치 수정 ('+(item&&item.제품명||'')+')':'새 배치 추가'}</div>
    <label>제품명<input id="b1" value="${(item&&item.제품명)||''}"></label>
    <label>문서번호 (EF-MI)<input id="b2" value="${(item&&item.문서번호)||nextMI}"></label>
    <label>제조번호<input id="b3" value="${(item&&item.제조번호)||''}"></label>
    <label>제조일<input type="date" id="b4" value="${(item&&item.date)||''}"></label>
    <label>제조방법<select id="b5">
      <option ${item&&item.제조방법==='CP법'?'selected':''}>CP법</option>
      <option ${item&&item.제조방법==='MP법'?'selected':''}>MP법</option>
    </select></label>
    <label>투입량 (g)<input type="number" id="b6" value="${(item&&item.투입량)||''}"></label>
    <label>이론수량 (ea)<input type="number" id="b7" value="${(item&&item.이론수량)||''}"></label>
    <label>실제수량 (ea)<input type="number" id="b8" value="${(item&&item.실제수량)||''}"></label>
    <label>상태<select id="b9">${['제조중','숙성중','판매중','완료','부적합'].map(s=>`<option ${item&&item.상태===s?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>바코드 번호<input id="b15" placeholder="예: 8739101009095" value="${(item&&item.바코드)||''}">
      <small style="color:var(--text3);font-size:11px">입력하면 제품 카드에 바코드가 생성됩니다</small>
    </label>
    <label>목표 중량<input id="b16" value="${(item&&item.목표중량)||'90g ±5g'}"></label>
    <label>실측 중량 (g)<input type="number" id="b17" placeholder="예: 100" value="${(item&&item.실측중량)||''}"></label>
    <label>색상 기준<input id="b18" value="${(item&&item.색상기준)||''}"></label>
    <label>색상 결과<input id="b19" value="${(item&&item.색상결과)||'이상없음'}"></label>
    <label>KCL 접수번호<input id="b10" value="${(item&&item.KCL)||''}"></label>
    <label>KCL 접수일<input type="date" id="b20" value="${(item&&item.KCL접수일)||''}"></label>
    <label>KCL 발행번호<input id="b21" value="${(item&&item.KCL발행번호)||''}"></label>
    <label>KCL 발행일<input type="date" id="b22" value="${(item&&item.KCL발행일)||''}"></label>
    <label>CT 성적서번호<input id="b23" value="${(item&&item.CT)||''}"></label>
    <label>CT 내용량 (g)<input id="b24" value="${(item&&item.CT내용량)||''}"></label>
    <label>CT 발행일<input type="date" id="b25" value="${(item&&item.CT발행일)||''}"></label>
    <label>내용량 결과 (%)<input id="b11" placeholder="예: 103" value="${(item&&item.내용량)||''}"></label>
    <label>유리알칼리 결과<input id="b12" placeholder="예: 검출 안 됨" value="${(item&&item.유리알칼리)||''}"></label>
    <label>알레르기 유발성분<input id="b30" value="${(item&&item.알레르기)||''}"></label>
    <label>전성분<textarea id="b26" rows="3">${(item&&item.전성분)||''}</textarea></label>
    <label>이상여부<select id="b13">
      <option ${item&&item.이상==='이상없음'?'selected':''}>이상없음</option>
      <option ${item&&item.이상==='이상있음'?'selected':''}>이상있음</option>
    </select></label>
    <label>비고<input id="b14" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('batches',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveBatch(${id||'null'})">저장</button>
    </div></div>`);
}
async function saveBatch(id){
  const data={
    제품명:v('b1'),문서번호:v('b2'),제조번호:v('b3'),date:v('b4'),
    제조방법:v('b5'),투입량:+v('b6'),이론수량:+v('b7'),실제수량:+v('b8'),
    상태:v('b9'),바코드:v('b15'),목표중량:v('b16'),
    실측중량:v('b17')?+v('b17'):null,
    색상기준:v('b18'),색상결과:v('b19'),
    KCL:v('b10'),KCL접수일:v('b20'),KCL발행번호:v('b21'),KCL발행일:v('b22'),
    CT:v('b23'),CT내용량:v('b24'),CT발행일:v('b25'),
    내용량:v('b11'),유리알칼리:v('b12'),
    알레르기:v('b30'),전성분:v('b26'),이상:v('b13'),비고:v('b14')
  };
  if(id){
    const existing=await DB.getOne('batches',id);
    if(existing&&existing.레시피)data.레시피=existing.레시피;
    await DB.put('batches',{...data,id});
  }else{await DB.add('batches',data);}
  closeSheet();await renderTab('manufacture');
}

/* ════ 위생 폼 ════ */
function openHygieneForm(preDate){
  const ds=preDate||today.toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">위생 점검 기록</div>
    <label>점검일<input type="date" id="h1" value="${ds}"></label>
    <label>점검 유형<select id="h2" onchange="updateHygExtra()">${['청소점검','온도·습도','제조위생','방충방서'].map(t=>`<option>${t}</option>`).join('')}</select></label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" placeholder="이상 없으면 비워두세요"></label>
    <label>확인자<input id="h6" value="변민정"></label>
    <div class="sheet-btns">
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg(null)">저장</button>
    </div></div>`);
  updateHygExtra();
}

async function openHygieneEditForm(id){
  const list=await DB.getAll('hygiene');
  const r=list.find(h=>h.id===id);
  if(!r)return;
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">위생 점검 수정</div>
    <label>점검일<input type="date" id="h1" value="${r.date||''}"></label>
    <label>점검 유형<select id="h2" onchange="updateHygExtra()">${['청소점검','온도·습도','제조위생','방충방서'].map(t=>`<option ${r.type===t?'selected':''}>${t}</option>`).join('')}</select></label>
    <div id="h-extra"></div>
    <label>이슈 내용<input id="h5" value="${r.이슈||''}"></label>
    <label>확인자<input id="h6" value="${r.확인자||'변민정'}"></label>
    <div class="sheet-btns">
      <button class="btn-del" onclick="delItem('hygiene',${id})">삭제</button>
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveHyg(${id})">저장</button>
    </div></div>`);
  setTimeout(()=>{
    updateHygExtra();
    if(r.type==='온도·습도'){const t=document.getElementById('h3'),h=document.getElementById('h4');if(t)t.value=r.온도||'';if(h)h.value=r.습도||'';}
    else if(r.type==='방충방서'){const s=document.getElementById('h-screen'),p=document.getElementById('h-pest'),ro=document.getElementById('h-rodent');if(s)s.value=r.방충망||'양호';if(p)p.value=r.해충||'없음';if(ro)ro.value=r.설치류||'없음';}
    else if(r.type==='청소점검'&&r.items){['원료보관','부자재','완제품','작업대','도구류','포장실'].forEach(k=>{const el=document.getElementById('h-'+k);if(el)el.value=r.items[k]||'청결';});}
  },50);
}

function updateHygExtra(){
  const sel=document.getElementById('h2'),el=document.getElementById('h-extra');
  if(!sel||!el)return;
  if(sel.value==='온도·습도'){
    el.innerHTML=`<label>온도 (°C)<input type="number" id="h3" placeholder="예: 23"></label><label>습도 (%)<input type="number" id="h4" placeholder="예: 58"></label>`;
  }else if(sel.value==='방충방서'){
    el.innerHTML=`<label>방충망<select id="h-screen"><option>양호</option><option>불량</option></select></label><label>해충<select id="h-pest"><option>없음</option><option>있음</option></select></label><label>설치류<select id="h-rodent"><option>없음</option><option>있음</option></select></label>`;
  }else if(sel.value==='청소점검'){
    el.innerHTML=['원료보관','부자재','완제품','작업대','도구류','포장실'].map(k=>`<label>${k}<select id="h-${k}"><option>청결</option><option>불량</option></select></label>`).join('');
  }else{el.innerHTML='';}
}

async function saveHyg(id){
  const type=v('h2');
  const data={date:v('h1'),type,확인자:v('h6'),이슈:v('h5'),status:'완료'};
  if(type==='온도·습도'){data.온도=+v('h3');data.습도=+v('h4');if(data.온도>35||data.습도>80)data.status='문제임박';}
  else if(type==='방충방서'){data.방충망=v('h-screen')||'양호';data.해충=v('h-pest')||'없음';data.설치류=v('h-rodent')||'없음';if(data.해충==='있음'||data.설치류==='있음')data.status='문제임박';}
  else if(type==='청소점검'){data.items={원료보관:v('h-원료보관')||'청결',부자재:v('h-부자재')||'청결',완제품:v('h-완제품')||'청결',작업대:v('h-작업대')||'청결',도구류:v('h-도구류')||'청결',포장실:v('h-포장실')||'청결'};}
  if(id)await DB.put('hygiene',{...data,id});else await DB.add('hygiene',data);
  closeSheet();await renderTab('hygiene');
}

/* ════ 생산실적 폼 ════ */
async function openProductionForm(id){
  const [list,batches]=await Promise.all([DB.getAll('production'),DB.getAll('batches')]);
  const item=id?list.find(p=>p.id===id):{};
  const ds=today.toISOString().split('T')[0];
  showSheet(`
    <div class="sheet-handle"></div><div class="sheet-inner">
    <div class="sheet-title">${id?'생산실적 수정':'생산실적 추가'}</div>
    <label>날짜<input type="date" id="p1" value="${(item&&item.date)||ds}"></label>
    <label>제품명
      <select id="p2">
        ${batches.map(b=>`<option ${item&&item.제품명===b.제품명?'selected':''}>${b.제품명}</option>`).join('')}
        <option ${item&&!batches.find(b=>b.제품명===item.제품명)?'selected':''}>직접입력</option>
      </select>
    </label>
    <label>수량 (개)<input type="number" id="p3" value="${(item&&item.수량)||''}"></label>
    <label>유형<select id="p4">
      ${['생산','출하','반품','폐기'].map(t=>`<option ${item&&item.유형===t?'selected':''}>${t}</option>`).join('')}
    </select></label>
    <label>판매 채널<select id="p5">
      ${['아이디어스','스마트스토어','신세계 꿈상회','고향사랑기부제','직접판매','기타'].map(c=>`<option ${item&&item.채널===c?'selected':''}>${c}</option>`).join('')}
    </select></label>
    <label>비고<input id="p6" value="${(item&&item.비고)||''}"></label>
    <div class="sheet-btns">
      ${id?`<button class="btn-del" onclick="delItem('production',${id})">삭제</button>`:''}
      <button onclick="closeSheet()">취소</button>
      <button class="btn-save" onclick="saveProd(${id||'null'})">저장</button>
    </div></div>`);
}
async function saveProd(id){
  const data={date:v('p1'),제품명:v('p2'),수량:+v('p3'),유형:v('p4'),채널:v('p5'),비고:v('p6')};
  if(id)await DB.put('production',{...data,id});else await DB.add('production',data);
  closeSheet();await renderTab('production');
}

/* ════ 공통 ════ */
function v(id){const el=document.getElementById(id);return el?el.value:'';}
function drow(l,val){return `<div class="drow"><span class="drow-l">${l}</span><span class="drow-r">${val||'-'}</span></div>`;}
function badgeClass(val){
  if(['적합','판매중','완료','이상없음','수취'].includes(val))return 'badge-green';
  if(['미기입','미수취','숙성중','제조중'].includes(val))return 'badge-orange';
  if(['부적합','이상있음','문제임박'].includes(val))return 'badge-red';
  return 'badge-gray';
}
function toggleCard(hd){hd.nextElementSibling.classList.toggle('hide');}
function toggleCheck(item){const done=item.classList.toggle('checked');const c=item.querySelector('.check-circle');if(c)c.innerHTML=done?'<i class="ti ti-check"></i>':'';}
async function saveChecklist(){await DB.add('hygiene',{date:today.toISOString().split('T')[0],type:'제조위생',확인자:'변민정',status:'완료'});alert('제조 점검 완료 저장!');await renderTab('mfcheck');}
function changeMonth(d){calMonth+=d;if(calMonth<0){calMonth=11;calYear--;}if(calMonth>11){calMonth=0;calYear++;}renderTab('hygiene');}
function showSheet(html){document.getElementById('sheet-body').innerHTML=html;document.getElementById('sheet').classList.remove('hide');document.getElementById('sheet-overlay').classList.remove('hide');}
function closeSheet(){document.getElementById('sheet').classList.add('hide');document.getElementById('sheet-overlay').classList.add('hide');}
async function delItem(store,id){if(!confirm('삭제할까요?'))return;await DB.remove(store,id);closeSheet();await renderTab(currentTab);}

/* window 노출 */
window.startApp=startApp;
window.switchStockTab=switchStockTab;
window.openIngForm=openIngForm;window.saveIng=saveIng;window.updateIngCats=updateIngCats;
window.openBatchForm=openBatchForm;window.saveBatch=saveBatch;
window.openHygieneForm=openHygieneForm;window.openHygieneEditForm=openHygieneEditForm;
window.updateHygExtra=updateHygExtra;window.saveHyg=saveHyg;
window.openProductionForm=openProductionForm;window.saveProd=saveProd;
window.closeSheet=closeSheet;window.delItem=delItem;
window.toggleCard=toggleCard;window.toggleCheck=toggleCheck;window.saveChecklist=saveChecklist;
window.changeMonth=changeMonth;window.selectDate=selectDate;window.clearDateFilter=clearDateFilter;
window.toggleHistory=toggleHistory;window.printRangeMonth=printRangeMonth;
window.toggleSection=toggleSection;
window.handleFileDrop=handleFileDrop;window.handleFileUpload=handleFileUpload;

document.addEventListener('DOMContentLoaded',init);

/* ════ 바코드 관리 ════ */
async function renderBarcode(el) {
  await DB.seedBarcodes();
  const list = await DB.getAll('barcodes');
  const active = list.filter(b => b.상태 !== '단종');
  const discontinued = list.filter(b => b.상태 === '단종');

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">바코드 · 제조번호 관리</h2>
    </div>
    <div class="summary-row">
      <div class="sum-chip sum-mauve">전체 ${list.length}개</div>
      <div class="sum-chip sum-green">활성 ${active.length}개</div>
      <div class="sum-chip sum-orange">단종 ${discontinued.length}개</div>
    </div>

    <!-- 바코드 생성기 -->
    <div class="bc-generator">
      <div class="bc-gen-title"><i class="ti ti-barcode"></i> 새 바코드 생성기</div>
      <div class="bc-gen-body">
        <div class="bc-gen-row">
          <div class="bc-gen-field">
            <div class="bc-gen-label">사업자번호</div>
            <input id="bc-prefix" value="8739" style="width:60px;text-align:center" readonly>
          </div>
          <div class="bc-gen-sep">/</div>
          <div class="bc-gen-field">
            <div class="bc-gen-label">소분류 <span style="color:var(--text3);font-size:10px">3자리</span></div>
            <input id="bc-sub" maxlength="3" placeholder="033" style="width:54px;text-align:center" oninput="updateBarcodePreview()">
          </div>
          <div class="bc-gen-sep">/</div>
          <div class="bc-gen-field">
            <div class="bc-gen-label">비번호 <span style="color:var(--text3);font-size:10px">3자리</span></div>
            <input id="bc-num" maxlength="3" style="width:54px;text-align:center" oninput="updateBarcodePreview()">
          </div>
          <div class="bc-gen-sep">/</div>
          <div class="bc-gen-field">
            <div class="bc-gen-label">개수 <span style="color:var(--text3);font-size:10px">2자리</span></div>
            <input id="bc-qty" maxlength="2" placeholder="09" style="width:44px;text-align:center" oninput="updateBarcodePreview()">
          </div>
        </div>
        <div class="bc-preview-area">
          <div id="bc-preview-code" style="font-size:18px;font-weight:700;color:var(--teal-dark);letter-spacing:2px;margin-bottom:4px">입력하면 자동 생성</div>
          <div id="bc-check-info" style="font-size:11px;color:var(--text3);margin-bottom:8px"></div>
          <svg id="bc-preview-svg" style="max-width:100%"></svg>
        </div>

        <!-- 제조번호 생성기 -->
        <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
          <div class="bc-gen-label" style="margin-bottom:8px">제조번호 생성 (AP·B·시리즈·월·비번호)</div>
          <div class="bc-gen-row" style="flex-wrap:wrap;gap:8px">
            <div class="bc-gen-field">
              <div class="bc-gen-label">시리즈 코드</div>
              <select id="mn-series" onchange="updateMfgNoPreview()" style="padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);font-family:inherit;font-size:13px">
                <option value="O">O — 오렌지</option>
                <option value="P">P — 퍼플</option>
                <option value="G">G — 그린</option>
                <option value="YG">YG — 옐로그린</option>
                <option value="SS">SS — 봄/여름</option>
                <option value="SF">SF — 여름/가을</option>
                <option value="FW">FW — 가을/겨울</option>
                <option value="GS">GS — 굿즈</option>
                <option value="BS">BS — 베이직/선인장</option>
                <option value="W">W — 화이트</option>
              </select>
            </div>
            <div class="bc-gen-field">
              <div class="bc-gen-label">기획 월 <span style="color:var(--text3);font-size:10px">2자리</span></div>
              <input id="mn-month" maxlength="2" placeholder="03" style="width:44px;text-align:center" oninput="updateMfgNoPreview()">
            </div>
          </div>
          <div id="mn-preview" style="margin-top:8px;font-size:16px;font-weight:700;color:var(--mauve);letter-spacing:1px">—</div>
        </div>

        <button class="btn-sm solid" style="margin-top:12px;width:100%;padding:11px" onclick="saveBarcodeFromGen()">
          <i class="ti ti-plus" style="margin-right:6px"></i>위 바코드로 제품 등록
        </button>
      </div>
    </div>

    <!-- 제품 목록 -->
    <div class="section-label mt16">전체 제품 바코드 목록</div>
    <div style="padding:0 16px 8px;display:flex;gap:6px">
      <button class="btn-sm ${bcFilter==='all'?'solid':''}" onclick="setBcFilter('all')">전체</button>
      <button class="btn-sm ${bcFilter==='active'?'solid':''}" onclick="setBcFilter('active')">활성</button>
      <button class="btn-sm ${bcFilter==='discontinued'?'solid':''}" onclick="setBcFilter('discontinued')">단종</button>
    </div>
    ${(bcFilter==='discontinued'?discontinued:bcFilter==='active'?active:list).map(b => `
      <div class="bc-item" onclick="openBarcodeDetail(${b.id})">
        <div class="bc-item-num">${String(b.번호||'').padStart(2,'0')}</div>
        <div class="bc-item-info">
          <div class="bc-item-name">${b.제품명||''}${b.상태==='단종'?' <span style="color:var(--text3);font-size:10px">[단종]</span>':''}</div>
          <div class="bc-item-code">${formatBarcode(b.바코드12||'')} <span style="color:var(--teal-dark);font-weight:700">${b.체크디지트??''}</span></div>
          ${b.제조번호?`<div class="bc-item-mfg">${b.제조번호}</div>`:''}
        </div>
        <div class="bc-item-actions">
          <button class="icon-btn" onclick="event.stopPropagation();showBarcodeOnly(${b.id})" title="바코드 크게 보기"><i class="ti ti-barcode"></i></button>
        </div>
      </div>`).join('')}
    <button class="fab" onclick="openBarcodeForm()"><i class="ti ti-plus"></i></button>`;

  // 비번호 자동채번
  const maxNum = Math.max(...list.map(b=>parseInt(b.비번호||'0')||0));
  const nextNum = String(maxNum+1).padStart(3,'0');
  const numEl = document.getElementById('bc-num');
  if(numEl) numEl.value = nextNum;
  updateBarcodePreview();
  updateMfgNoPreview();
}

let bcFilter = 'all';
function setBcFilter(f){bcFilter=f;renderTab('barcode');}

function formatBarcode(d12) {
  if(!d12||d12.length<12) return d12||'';
  return `${d12.slice(0,4)}/${d12.slice(4,7)}/${d12.slice(7,10)}/${d12.slice(10,12)}`;
}

function updateBarcodePreview() {
  const prefix = document.getElementById('bc-prefix')?.value||'8739';
  const sub  = (document.getElementById('bc-sub')?.value||'').padStart(3,'0');
  const num  = (document.getElementById('bc-num')?.value||'').padStart(3,'0');
  const qty  = (document.getElementById('bc-qty')?.value||'').padStart(2,'0');
  const d12  = prefix+sub+num+qty;
  if(d12.length!==12||!/^\d+$/.test(d12)){
    document.getElementById('bc-preview-code').textContent='입력을 완성해주세요';
    return;
  }
  const check = DB.calcCheckDigit(d12);
  const full  = d12+check;
  document.getElementById('bc-preview-code').textContent = formatBarcode(d12)+' '+check+' = '+full;
  document.getElementById('bc-check-info').textContent  = `체크디지트: ${check} (EAN-13 자동계산)`;
  if(window.JsBarcode){
    try{JsBarcode('#bc-preview-svg',full,{format:'EAN13',width:2,height:60,displayValue:true,fontSize:12});}catch(e){}
  }
}

function updateMfgNoPreview() {
  const series = document.getElementById('mn-series')?.value||'O';
  const month  = (document.getElementById('mn-month')?.value||'').padStart(2,'0');
  const num    = (document.getElementById('bc-num')?.value||'').padStart(3,'0');
  const mfgNo  = `APB${series}${month}${num}`;
  const el     = document.getElementById('mn-preview');
  if(el) el.textContent = mfgNo;
}

function showBarcodeOnly(id) {
  DB.getOne('barcodes', id).then(b => {
    if(!b) return;
    const full = b.바코드전체||'';
    const tbUrl = `https://www.terryburton.co.uk/barcodewriter/generator/#bcid=ean13&text=${full}&includetext&guardwhitespace`;
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-inner">
      <div class="sheet-title">${b.제품명||''}</div>
      <div style="text-align:center;padding:12px 0 8px">
        <svg id="bc-large"></svg>
      </div>
      <div class="bc-detail-box">
        <div class="bc-detail-row">
          <span class="bc-detail-label">바코드 번호</span>
          <span class="bc-detail-val" id="bc-copy-val">${formatBarcode(b.바코드12||'')} <strong style="color:var(--teal-dark)">${b.체크디지트??''}</strong></span>
          <button class="icon-btn" onclick="copyText('${full}')" title="복사"><i class="ti ti-copy"></i></button>
        </div>
        <div class="bc-detail-row">
          <span class="bc-detail-label">전체 13자리</span>
          <span class="bc-detail-val mono">${full}</span>
        </div>
        ${b.제조번호?`<div class="bc-detail-row">
          <span class="bc-detail-label">제조번호</span>
          <span class="bc-detail-val" style="color:var(--mauve-dark);font-weight:700">${b.제조번호}</span>
        </div>`:''}
        ${b.제조일?`<div class="bc-detail-row"><span class="bc-detail-label">제조일자</span><span class="bc-detail-val">${b.제조일}</span></div>`:''}
        ${b.유통기한?`<div class="bc-detail-row"><span class="bc-detail-label">유통기한</span><span class="bc-detail-val">${b.유통기한}</span></div>`:''}
      </div>

      <!-- Terry Burton + 다운로드 버튼 -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <a href="${tbUrl}" target="_blank" class="bc-action-btn bc-btn-terry">
          <i class="ti ti-external-link"></i>
          Terry Burton 사이트에서 SVG · EPS · PDF 생성
        </a>
        <button class="bc-action-btn bc-btn-svg" onclick="downloadBarcodeSVG('bc-large','${b.제품명||'barcode'}')">
          <i class="ti ti-download"></i>
          SVG 파일 다운로드
        </button>
        <button class="bc-action-btn bc-btn-png" onclick="downloadBarcodePNG('bc-large','${b.제품명||'barcode'}')">
          <i class="ti ti-photo-down"></i>
          PNG 파일 다운로드
        </button>
      </div>
      <div class="bc-terry-tip">
        <i class="ti ti-info-circle"></i>
        Terry Burton 사이트에서: Barcode=EAN-13 선택 → Contents에 <strong>${full}</strong> 입력 → 형식(SVG/EPS) 선택 후 다운로드
      </div>

      <div class="sheet-btns" style="margin-top:12px">
        <button onclick="closeSheet()">닫기</button>
        <button class="btn-save" onclick="printBarcodeLabel('${full}','${b.제품명||''}','${b.제조번호||''}')">🖨 라벨 인쇄</button>
      </div>
      </div>`);
    setTimeout(()=>{
      if(window.JsBarcode&&full){
        try{JsBarcode('#bc-large',full,{format:'EAN13',width:3,height:80,displayValue:true,fontSize:14});}catch(e){}
      }
    },100);
  });
}

/* 바코드 SVG 다운로드 */
function downloadBarcodeSVG(svgId, name) {
  const svg = document.getElementById(svgId);
  if(!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name.replace(/\s/g,'_')+'_barcode.svg';
  a.click(); URL.revokeObjectURL(url);
}

/* 바코드 PNG 다운로드 */
function downloadBarcodePNG(svgId, name) {
  const svg = document.getElementById(svgId);
  if(!svg) return;
  const data = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const img = new Image();
  const svgBlob = new Blob([data],{type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0);
    const a=document.createElement('a');
    a.href=canvas.toDataURL('image/png');
    a.download=name.replace(/\s/g,'_')+'_barcode.png';
    a.click(); URL.revokeObjectURL(url);
  };
  img.src = url;
}

/* 텍스트 복사 */
function copyText(text) {
  navigator.clipboard.writeText(text).then(()=>alert('복사됨: '+text)).catch(()=>{
    const el=document.createElement('input');el.value=text;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el);alert('복사됨: '+text);
  });
}

/* 바코드 라벨 인쇄 */
function printBarcodeLabel(barcode, name, mfgNo) {
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>바코드 라벨</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
  <style>
    body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;font-family:'Noto Sans KR',sans-serif;}
    .label{text-align:center;padding:12px 16px;border:1px solid #ccc;border-radius:6px;display:inline-block;}
    .lname{font-size:12px;font-weight:700;margin-bottom:6px;color:#111;}
    .lmfg{font-size:10px;color:#666;margin-top:4px;}
    @media print{@page{margin:4mm}button{display:none}}
  </style></head><body>
  <div class="label">
    <div class="lname">${name}</div>
    <svg id="bc-print"></svg>
    ${mfgNo?`<div class="lmfg">제조번호: ${mfgNo}</div>`:''}
  </div>
  <script>
    JsBarcode('#bc-print','${barcode}',{format:'EAN13',width:2.5,height:70,displayValue:true,fontSize:13});
    setTimeout(()=>window.print(),500);
  <\/script>
  </body></html>`);
  win.document.close();
}

function openBarcodeDetail(id) {
  DB.getOne('barcodes', id).then(b=>{
    if(!b) return;
    openBarcodeForm(id);
  });
}

function openBarcodeForm(id) {
  const p = id ? DB.getOne('barcodes',id) : Promise.resolve({});
  p.then(item => {
    if(!item) item = {};
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-inner">
      <div class="sheet-title">${id?'바코드 수정':'바코드 신규 등록'}</div>
      <label>제품명<input id="bf-name" value="${item.제품명||''}"></label>
      <label>소분류 (3자리)<input id="bf-sub" maxlength="3" value="${item.소분류||''}"></label>
      <label>비번호 (3자리)<input id="bf-num" maxlength="3" value="${item.비번호||''}"></label>
      <label>개수 (2자리)<input id="bf-qty" maxlength="2" value="${item.개수||''}"></label>
      <label>제조번호<input id="bf-mfg" value="${item.제조번호||''}"></label>
      <label>제조일자<input id="bf-date" value="${item.제조일||''}"></label>
      <label>유통기한<input id="bf-exp" value="${item.유통기한||''}"></label>
      <label>상태<select id="bf-status">
        <option ${item.상태==='활성'?'selected':''}>활성</option>
        <option ${item.상태==='단종'?'selected':''}>단종</option>
      </select></label>
      <label>비고<input id="bf-note" value="${item.비고||''}"></label>
      <div class="sheet-btns">
        ${id?`<button class="btn-del" onclick="delItem('barcodes',${id})">삭제</button>`:''}
        <button onclick="closeSheet()">취소</button>
        <button class="btn-save" onclick="saveBarcodeForm(${id||'null'})">저장</button>
      </div>
      </div>`);
  });
}

async function saveBarcodeForm(id) {
  const sub=v('bf-sub').padStart(3,'0'), num=v('bf-num').padStart(3,'0'), qty=v('bf-qty').padStart(2,'0');
  const d12=`8739${sub}${num}${qty}`;
  const check=DB.calcCheckDigit(d12);
  const data={
    제품명:v('bf-name'), 소분류:sub, 비번호:num, 개수:qty,
    제조번호:v('bf-mfg'), 제조일:v('bf-date'), 유통기한:v('bf-exp'),
    상태:v('bf-status'), 비고:v('bf-note'),
    바코드12:d12, 체크디지트:check, 바코드전체:d12+check
  };
  if(id) await DB.put('barcodes',{...data,id}); else { const list=await DB.getAll('barcodes'); data.번호=list.length+1; await DB.add('barcodes',data); }
  closeSheet(); await renderTab('barcode');
}

async function saveBarcodeFromGen() {
  const prefix=document.getElementById('bc-prefix')?.value||'8739';
  const sub=(document.getElementById('bc-sub')?.value||'').padStart(3,'0');
  const num=(document.getElementById('bc-num')?.value||'').padStart(3,'0');
  const qty=(document.getElementById('bc-qty')?.value||'').padStart(2,'0');
  const series=document.getElementById('mn-series')?.value||'O';
  const month=(document.getElementById('mn-month')?.value||'').padStart(2,'0');
  if(!sub||!num||!qty){alert('소분류·비번호·개수를 모두 입력해주세요');return;}
  const d12=prefix+sub+num+qty;
  if(!/^\d{12}$/.test(d12)){alert('12자리 숫자로 입력해주세요');return;}
  const check=DB.calcCheckDigit(d12);
  const mfgNo=`APB${series}${month}${num}`;
  const list=await DB.getAll('barcodes');
  const data={
    번호:list.length+1, 제품명:'신규 제품 '+num, 소분류:sub, 비번호:num, 개수:qty,
    제조번호:mfgNo, 제조일:'', 유통기한:'', 상태:'활성', 비고:'',
    바코드12:d12, 체크디지트:check, 바코드전체:d12+check
  };
  await DB.add('barcodes',data);
  alert(`바코드 ${d12}${check} 등록 완료!\n제품명을 수정해주세요.`);
  await renderTab('barcode');
}

window.setBcFilter=setBcFilter;
window.downloadBarcodeSVG=downloadBarcodeSVG;
window.downloadBarcodePNG=downloadBarcodePNG;
window.copyText=copyText;
window.printBarcodeLabel=printBarcodeLabel;
window.updateBarcodePreview=updateBarcodePreview;
window.updateMfgNoPreview=updateMfgNoPreview;
window.showBarcodeOnly=showBarcodeOnly;
window.openBarcodeDetail=openBarcodeDetail;
window.openBarcodeForm=openBarcodeForm;
window.saveBarcodeForm=saveBarcodeForm;
window.saveBarcodeFromGen=saveBarcodeFromGen;
